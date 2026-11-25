-- Add-on after roam.sql. Review and apply as project owner, in one transaction.
-- Existing accounts keep access. New accounts wait for approval before using data.
begin;
create table public.roam_registration_requests (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique check(email=lower(btrim(email)) and length(email)<=254),
 name text not null check(length(name) between 1 and 100),
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null
);
-- Preserve existing email accounts explicitly; missing approval rows fail closed.
insert into public.roam_registration_requests(user_id,email,name,status,created_at)
select id,lower(btrim(email)),left(coalesce(nullif(btrim(raw_user_meta_data->>'name'),''),'Traveler'),100),'approved','1970-01-01'::timestamptz
from auth.users where email is not null;
create index roam_registration_created on public.roam_registration_requests(created_at);
create table public.roam_registration_settings (
 singleton boolean primary key default true check(singleton),
 automatic_approval boolean not null default false
);
insert into public.roam_registration_settings values(true,false);
create table public.roam_registration_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.roam_registration_requests enable row level security;
alter table public.roam_registration_settings enable row level security;
alter table public.roam_registration_admins enable row level security;
revoke all on public.roam_registration_requests,public.roam_registration_settings,public.roam_registration_admins from public,anon,authenticated;

create function roam_private.registration_mode() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('automaticApproval',coalesce((select automatic_approval from public.roam_registration_settings where singleton),false))
$$;
revoke all on function roam_private.registration_mode() from public;
grant usage on schema roam_private to anon;
grant execute on function roam_private.registration_mode() to anon,authenticated;
create function public.roam_registration_mode() returns jsonb
language sql stable security invoker set search_path='' as $$select roam_private.registration_mode()$$;
revoke all on function public.roam_registration_mode() from public;
grant execute on function public.roam_registration_mode() to anon,authenticated;

create function roam_private.review_registrations(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); a text:=payload->>'action'; target uuid;
begin
 if uid is null or not exists(select 1 from public.roam_registration_admins where user_id=uid) then
  raise exception 'Only a registration administrator can review requests' using errcode='42501';
 end if;
 if a='review' then
  if coalesce(payload->>'status','') not in('approved','rejected') then raise exception 'Choose approve or reject'; end if;
  target:=(payload->>'user_id')::uuid;
  if payload->>'status'='rejected' and exists(select 1 from public.roam_registration_admins where user_id=target) then raise exception 'Registration administrators cannot be rejected'; end if;
  update public.roam_registration_requests set status=payload->>'status',reviewed_at=now(),reviewed_by=uid where user_id=target;
  if not found then raise exception 'Request not found'; end if;
 elsif a='settings' then
  if jsonb_typeof(payload->'automatic_approval') is distinct from 'boolean' then raise exception 'Choose a valid approval mode'; end if;
  update public.roam_registration_settings set automatic_approval=(payload->>'automatic_approval')::boolean;
 elsif a is distinct from 'list' then raise exception 'Unknown review action'; end if;
 return jsonb_build_object(
  'automaticApproval',(select automatic_approval from public.roam_registration_settings where singleton),
  'requests',coalesce((select jsonb_agg(to_jsonb(q) order by (q.status='pending') desc,q.created_at desc) from (
   select user_id,email,name,status,created_at,reviewed_at from public.roam_registration_requests order by (status='pending') desc,created_at desc limit 200
  ) q),'[]'::jsonb));
end;
$$;
revoke all on function roam_private.review_registrations(jsonb) from public,anon;
grant execute on function roam_private.review_registrations(jsonb) to authenticated;
create function public.roam_review_registrations(payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$select roam_private.review_registrations(payload)$$;
revoke all on function public.roam_review_registrations(jsonb) from public,anon;
grant execute on function public.roam_review_registrations(jsonb) to authenticated;

-- Runs in Auth's transaction: account creation and pending registration are atomic.
create function roam_private.record_registration() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email is null then raise exception 'Roam requires an email account'; end if;
 -- Basic signup safety cap; use Auth CAPTCHA/rate limits for stronger bot defense.
 perform pg_advisory_xact_lock(70421931);
 if (select count(*) from public.roam_registration_requests where created_at>now()-interval '24 hours')>=100 then
  raise exception 'Registrations are busy. Please try again later.';
 end if;
 insert into public.roam_registration_requests(user_id,email,name,status)
 values(new.id,lower(btrim(new.email)),left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'),''),'Traveler'),100),
 case when coalesce((select automatic_approval from public.roam_registration_settings where singleton),false) then 'approved' else 'pending' end);
 return new;
end;
$$;
revoke all on function roam_private.record_registration() from public,anon,authenticated;
create trigger roam_record_registration after insert on auth.users
for each row execute function roam_private.record_registration();

create function roam_private.registration_approved() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.roam_registration_requests where user_id=auth.uid() and status='approved'
 )
$$;
revoke all on function roam_private.registration_approved() from public,anon;
grant execute on function roam_private.registration_approved() to authenticated;

create function roam_private.registration_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return jsonb_build_object('status',coalesce((select status from public.roam_registration_requests where user_id=auth.uid()),'pending'),'administrator',exists(select 1 from public.roam_registration_admins where user_id=auth.uid()));
end;
$$;
revoke all on function roam_private.registration_status() from public,anon;
grant execute on function roam_private.registration_status() to authenticated;
create function public.roam_registration_status() returns jsonb
language sql stable security invoker set search_path='' as $$select roam_private.registration_status()$$;
revoke all on function public.roam_registration_status() from public,anon;
grant execute on function public.roam_registration_status() to authenticated;

-- Keep the existing implementation and put every RPC action behind approval.
-- The inner function loses all client grants so callers cannot bypass the gate.
alter function roam_private.roam_data(jsonb) rename to roam_data_before_registration;
revoke all on function roam_private.roam_data_before_registration(jsonb) from public,anon,authenticated;
create function roam_private.roam_data(payload jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not roam_private.registration_approved() then
  raise exception 'Your registration is awaiting approval or has been declined' using errcode='42501';
 end if;
 return roam_private.roam_data_before_registration(payload);
end;
$$;
revoke all on function roam_private.roam_data(jsonb) from public,anon;
grant execute on function roam_private.roam_data(jsonb) to authenticated;
-- Refresh the public wrapper explicitly, retaining its invoker security.
create or replace function public.roam_data(payload jsonb default null) returns jsonb
language sql security invoker set search_path='' as $$select roam_private.roam_data(payload)$$;

-- Receipt policies call member_of, so approval applies to direct storage calls too.
create or replace function roam_private.member_of(t text) returns boolean
language sql stable security definer set search_path='' as $$
 select roam_private.registration_approved() and exists(
  select 1 from public.roam_members m join public.roam_trips r on r.id=m.trip
  where m.trip=t and m."user"=auth.uid() and r.deleted=0
 )
$$;
commit;
