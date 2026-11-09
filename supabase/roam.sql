-- Apply once to the selected Roam Supabase project. No expense data belongs here.
-- All writes go through an authenticated, validated RPC; tables are not public APIs.
begin;
create schema if not exists roam_private;
revoke all on schema roam_private from public,anon;
grant usage on schema roam_private to authenticated;
create table public.roam_trips (
 id text primary key check(id ~ '^[A-Za-z0-9_-]{8,80}$'),owner uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 100),destination text not null default '',currency text not null check(currency ~ '^[A-Z]{3}$'),
 start text not null,"end" text not null,created bigint not null
);
create table public.roam_members(trip text not null references public.roam_trips(id),"user" uuid not null references auth.users(id),primary key(trip,"user"));
create index roam_members_user on public.roam_members("user",trip);
create table public.roam_categories(
 id text primary key check(id ~ '^[A-Za-z0-9_-]{8,80}$'),trip text not null references public.roam_trips(id),name text not null check(length(name) between 1 and 32),
 icon text not null default 'other',aliases jsonb not null default '[]',key text not null unique,creator uuid not null references auth.users(id)
);
create index roam_categories_trip on public.roam_categories(trip);
create table public.roam_expenses(
 id text primary key check(id ~ '^[A-Za-z0-9_-]{8,80}$'),trip text not null references public.roam_trips(id),"user" uuid not null references auth.users(id),
 amount bigint not null check(amount>0 and amount<=999999999999),currency text not null check(currency ~ '^[A-Z]{3}$'),category text not null,
 description text not null default '',date text not null,receipt text,"authorName" text,deleted integer not null default 0 check(deleted in(0,1)),updated bigint not null
);
create index roam_expenses_trip_date on public.roam_expenses(trip,date desc,updated desc);
create table public.roam_invites(id text primary key,trip text not null references public.roam_trips(id),expires timestamptz not null);
create index roam_invites_expiry on public.roam_invites(expires);
alter table public.roam_trips enable row level security;
alter table public.roam_members enable row level security;
alter table public.roam_categories enable row level security;
alter table public.roam_expenses enable row level security;
alter table public.roam_invites enable row level security;
revoke all on public.roam_trips,public.roam_members,public.roam_categories,public.roam_expenses,public.roam_invites from anon,authenticated;

create function roam_private.member_of(t text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.roam_members where trip=t and "user"=auth.uid());
$$;
create function roam_private.receipt_allowed(path text,writing boolean) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.roam_expenses e where path=e."user"::text||'/'||e.id and e.deleted=0 and roam_private.member_of(e.trip) and (not writing or e."user"=auth.uid()));
$$;
revoke all on function roam_private.member_of(text),roam_private.receipt_allowed(text,boolean) from public,anon;
grant execute on function roam_private.member_of(text),roam_private.receipt_allowed(text,boolean) to authenticated;

create function public.roam_data(payload jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); action text:=payload->>'action'; tid text:=payload->>'trip'; eid text:=payload->>'id';
 username text; existing public.roam_expenses%rowtype; category_old public.roam_categories%rowtype;
 category_row public.roam_categories%rowtype; aliases jsonb:='[]'; previous text:=''; category_name text; icon_name text;
 token text; join_trip text; saved_id text; prior_owner uuid;
 ms bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 defaults text[]:=array['Food','Transport','Stay','Shopping','Activities','Other'];
 icons text[]:=array['food','transport','stay','shopping','activities','other','coffee','plane','car','fuel','health','groceries','gift','work','phone','drink'];
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select left(coalesce(nullif(raw_user_meta_data->>'name',''),email,'Traveler'),100) into username from auth.users where id=uid;
 if payload is null then
  return jsonb_build_object('user',jsonb_build_object('id',uid,'name',username),
   'trips',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('travelers',(select count(*) from public.roam_members m where m.trip=t.id)) order by t.created desc) from public.roam_trips t where roam_private.member_of(t.id)),'[]'::jsonb),
   'expenses',coalesce((select jsonb_agg(to_jsonb(e) order by e.date desc,e.updated desc) from public.roam_expenses e where roam_private.member_of(e.trip) and (e.deleted=0 or e."user"=uid)),'[]'::jsonb),
   'categories',coalesce((select jsonb_agg(to_jsonb(c)) from public.roam_categories c where roam_private.member_of(c.trip)),'[]'::jsonb));
 end if;
 if jsonb_typeof(payload)<>'object' then raise exception 'Invalid request';end if;
 if action='trip' then
  if eid is null or eid!~'^[A-Za-z0-9_-]{8,80}$' or coalesce(length(btrim(payload->>'name')),0) not between 1 and 100 or coalesce(length(payload->>'destination'),1000)>150 or coalesce(payload->>'currency','')!~'^[A-Z]{3}$' or coalesce(payload->>'start','')!~'^\d{4}-\d{2}-\d{2}$' or coalesce(payload->>'end','')!~'^\d{4}-\d{2}-\d{2}$' or (payload->>'end')::date<(payload->>'start')::date then raise exception 'Check the trip name, currency and dates';end if;
  select owner into prior_owner from public.roam_trips where id=eid;
  if found then if prior_owner<>uid then raise exception 'Trip ID already in use' using errcode='42501';end if;return '{"ok":true}';end if;
  insert into public.roam_trips values(eid,uid,btrim(payload->>'name'),payload->>'destination',payload->>'currency',payload->>'start',payload->>'end',ms);
  insert into public.roam_members values(eid,uid);return '{"ok":true}';
 elsif action='join' then
  token:=payload->>'token';if coalesce(length(token),0) not between 32 and 100 then raise exception 'Invalid invitation';end if;
  select trip into join_trip from public.roam_invites where id=encode(sha256(convert_to(token,'UTF8')),'hex') and expires>now();
  if not found then raise exception 'Invitation expired or invalid. Ask for a new link';end if;
  insert into public.roam_members values(join_trip,uid) on conflict do nothing;return jsonb_build_object('ok',true,'trip',join_trip);
 elsif action='invite' then
  if not exists(select 1 from public.roam_trips where id=tid and owner=uid) then raise exception 'Only the trip creator can invite travelers' using errcode='42501';end if;
  token:=gen_random_uuid()::text||gen_random_uuid()::text;
  insert into public.roam_invites values(encode(sha256(convert_to(token,'UTF8')),'hex'),tid,now()+interval '7 days');return jsonb_build_object('token',token);
 end if;
 if eid is null or eid!~'^[A-Za-z0-9_-]{8,80}$' then raise exception 'Invalid entry ID';end if;
 if action in('delete','restore','receipt','receipt_path') then
  select * into existing from public.roam_expenses where id=eid for update;
  if not found or not roam_private.member_of(existing.trip) then raise exception 'Expense not found' using errcode='42501';end if;
  if action='receipt_path' then
   if existing.deleted<>0 or existing.receipt is null then raise exception 'Receipt not found';end if;
   return jsonb_build_object('path',existing.receipt);
  end if;
  if existing."user"<>uid then raise exception 'Only the expense creator can change it' using errcode='42501';end if;
  if action='receipt' then
   if existing.deleted<>0 then raise exception 'Expense is deleted';end if;
   if not exists(select 1 from storage.objects where bucket_id='roam-receipts' and name=uid::text||'/'||eid) then raise exception 'Receipt upload has not finished';end if;
   update public.roam_expenses set receipt=uid::text||'/'||eid where id=eid;
  else update public.roam_expenses set deleted=case when action='delete' then 1 else 0 end,updated=ms where id=eid;end if;
  return '{"ok":true}';
 end if;
 if not roam_private.member_of(tid) then raise exception 'You do not belong to this trip' using errcode='42501';end if;
 -- ponytail: serialize writes within one trip so renames and offline expense sync agree;
 -- replace with category-level locks if a single trip needs high write throughput.
 perform id from public.roam_trips where id=tid for update;
 if action='category' then
  category_name:=btrim(payload->>'name');icon_name:=coalesce(payload->>'icon','other');
  if coalesce(length(category_name),0) not between 1 and 32 or category_name~'[[:cntrl:]]' or not(icon_name=any(icons)) then raise exception 'Choose a name of 1–32 characters and a valid icon';end if;
  select * into category_old from public.roam_categories where id=eid;
  if found and category_old.trip<>tid then raise exception 'Category belongs to another trip' using errcode='42501';end if;
  if category_old.id is null and (payload->>'previousName')=any(defaults) then
   select * into category_old from public.roam_categories c where c.trip=tid and (lower(c.name)=lower(payload->>'previousName') or exists(select 1 from jsonb_array_elements_text(c.aliases) a where lower(a)=lower(payload->>'previousName'))) limit 1;
  end if;
  if category_old.id is not null then aliases:=category_old.aliases;previous:=category_old.name;eid:=category_old.id;
  elsif (payload->>'previousName')=any(defaults) then previous:=payload->>'previousName';end if;
  if previous<>'' and not aliases ? previous then aliases:=aliases||jsonb_build_array(previous);end if;
  select * into category_row from public.roam_categories c where c.trip=tid and c.id<>eid and (lower(c.name)=lower(category_name) or exists(select 1 from jsonb_array_elements_text(c.aliases) a where lower(a)=lower(category_name))) limit 1;
  if found then
   if category_old.id is null and previous='' and lower(category_row.name)=lower(category_name) then return '{"ok":true}';end if;
   raise exception 'That category name is already in use';
  end if;
  if exists(select 1 from unnest(defaults) d where lower(d)=lower(category_name)) and not exists(select 1 from jsonb_array_elements_text(aliases) a where lower(a)=lower(category_name)) then raise exception 'That category already exists. Edit it instead';end if;
  insert into public.roam_categories values(eid,tid,category_name,icon_name,aliases,tid||':'||lower(category_name),coalesce(category_old.creator,uid))
   on conflict(id) do update set name=excluded.name,icon=excluded.icon,aliases=excluded.aliases,key=excluded.key;
  update public.roam_expenses set category=category_name where trip=tid and lower(category) in(select lower(a) from jsonb_array_elements_text(aliases) a);
  return '{"ok":true}';
 elsif action='expense' then
  if coalesce(payload->>'amount','')!~'^[0-9]+$' or (payload->>'amount')::numeric not between 1 and 999999999999 or coalesce(payload->>'currency','')!~'^[A-Z]{3}$' or coalesce(length(btrim(payload->>'category')),0) not between 1 and 32 or payload->>'description' is null or length(payload->>'description')>500 or coalesce(payload->>'date','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Check amount, currency, category and date';end if;
  perform (payload->>'date')::date;
  select c.name into category_name from public.roam_categories c where c.trip=tid and (lower(c.name)=lower(payload->>'category') or exists(select 1 from jsonb_array_elements_text(c.aliases) a where lower(a)=lower(payload->>'category'))) limit 1;
  if category_name is null then select d into category_name from unnest(defaults) d where lower(d)=lower(payload->>'category');end if;
  if category_name is null then raise exception 'Create this category in the trip first';end if;
  select * into existing from public.roam_expenses where id=eid for update;
  if found then
   if existing."user"<>uid then raise exception 'Only the expense creator can edit it' using errcode='42501';end if;
   if existing.trip<>tid then raise exception 'An expense cannot be moved to another trip';end if;
   if existing.deleted<>0 then if payload->>'deleting'='true' then return '{"ok":true,"deleted":true}';end if;raise exception 'This expense is deleted';end if;
  end if;
  insert into public.roam_expenses(id,trip,"user",amount,currency,category,description,date,updated,"authorName")
   values(eid,tid,uid,(payload->>'amount')::bigint,payload->>'currency',category_name,payload->>'description',payload->>'date',ms,username)
   on conflict(id) do update set amount=excluded.amount,currency=excluded.currency,category=excluded.category,description=excluded.description,date=excluded.date,updated=excluded.updated,"authorName"=excluded."authorName" where roam_expenses."user"=uid returning id into saved_id;
  if saved_id is null then raise exception 'Only the expense creator can edit it' using errcode='42501';end if;
  return '{"ok":true}';
 end if;
 raise exception 'Unknown action';
end;
$$;
revoke all on function public.roam_data(jsonb) from public,anon;
grant execute on function public.roam_data(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('roam-receipts','roam-receipts',false,8388608,array['image/jpeg','image/png']);
create policy roam_receipt_read on storage.objects for select to authenticated using(bucket_id='roam-receipts' and roam_private.receipt_allowed(name,false));
create policy roam_receipt_insert on storage.objects for insert to authenticated with check(bucket_id='roam-receipts' and roam_private.receipt_allowed(name,true));
create policy roam_receipt_update on storage.objects for update to authenticated using(bucket_id='roam-receipts' and roam_private.receipt_allowed(name,true)) with check(bucket_id='roam-receipts' and roam_private.receipt_allowed(name,true));
commit;
