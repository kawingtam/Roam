-- Owner-only account management, separate from the Roam app UI.
begin;
create table if not exists roam_private.account_review_audit (
 id bigint generated always as identity primary key,
 actor uuid not null, target uuid not null,
 action text not null check(action in ('rename','delete')),
 details jsonb not null, created_at timestamptz not null default now()
);
alter table roam_private.account_review_audit enable row level security;
revoke all on roam_private.account_review_audit from public,anon,authenticated;
create or replace function roam_private.manage_registration_accounts(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); action text:=payload->>'action'; target uuid;
 account public.roam_registration_requests%rowtype; next_name text; accounts jsonb;
begin
 if uid is null or not exists(select 1 from public.roam_registration_admins a join auth.users u on u.id=a.user_id where a.user_id=uid and lower(u.email)='kawingtam7@gmail.com' and u.email_confirmed_at is not null) then
  raise exception 'Only the registration owner can manage accounts' using errcode='42501';
 end if;
 if action in ('rename','delete') then
  target:=(payload->>'user_id')::uuid;
  -- Lock Auth first: new Roam foreign-key references cannot race account deletion.
  perform 1 from auth.users where id=target for update;
  if not found then raise exception 'Account not found'; end if;
  select * into account from public.roam_registration_requests where user_id=target for update;
  if not found then raise exception 'Account not found'; end if;
  if action='rename' then
   next_name:=btrim(payload->>'name');
   if next_name is null or length(next_name) not between 1 and 100 then raise exception 'Name must contain 1 to 100 characters'; end if;
   update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('name',next_name) where id=target;
   update public.roam_registration_requests set name=next_name where user_id=target;
   insert into roam_private.account_review_audit(actor,target,action,details) values(uid,target,'rename',jsonb_build_object('previous_name',account.name,'name',next_name));
  else
   if target=uid or exists(select 1 from public.roam_registration_admins where user_id=target) then raise exception 'Administrator accounts cannot be deleted'; end if;
   if coalesce(lower(btrim(payload->>'confirm_email')),'')<>account.email then raise exception 'Type the exact account email to confirm deletion'; end if;
   if exists(select 1 from public.roam_trips where owner=target)
    or exists(select 1 from public.roam_expenses where "user"=target)
    or exists(select 1 from public.roam_categories where creator=target)
    or exists(select 1 from public.roam_members where "user"=target)
    or exists(select 1 from storage.objects where owner=target or owner_id=target::text) then
    raise exception 'This account has Roam data. Keep the account and deny access instead';
   end if;
   insert into roam_private.account_review_audit(actor,target,action,details) values(uid,target,'delete',jsonb_build_object('email',account.email,'name',account.name,'previous_status',account.status));
   -- Existing NO ACTION foreign keys are an additional fail-closed data guard.
   -- The registration record cascades away, so every Roam RPC rejects stale JWTs.
   delete from auth.users where id=target;
  end if;
 elsif action is distinct from 'list' then raise exception 'Unknown account action';
 end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by (q.status='pending') desc,q.created_at desc),'[]'::jsonb) into accounts from (
  select r.user_id,r.email,r.name,r.status,u.created_at,(u.email_confirmed_at is not null) as email_confirmed,
   exists(select 1 from public.roam_registration_admins a where a.user_id=r.user_id) as administrator,
   (select count(*) from public.roam_trips t where t.owner=r.user_id) as trips,
   (select count(*) from public.roam_expenses e where e."user"=r.user_id) as expenses,
   (exists(select 1 from public.roam_trips t where t.owner=r.user_id)
    or exists(select 1 from public.roam_expenses e where e."user"=r.user_id)
    or exists(select 1 from public.roam_categories c where c.creator=r.user_id)
    or exists(select 1 from public.roam_members m where m."user"=r.user_id)
    or exists(select 1 from storage.objects o where o.owner=r.user_id or o.owner_id=r.user_id::text)) as has_data
  from public.roam_registration_requests r join auth.users u on u.id=r.user_id
  order by (r.status='pending') desc,r.created_at desc limit 200
 ) q;
 return jsonb_build_object('accounts',accounts,'total',(select count(*) from public.roam_registration_requests));
end$$;
revoke all on function roam_private.manage_registration_accounts(jsonb) from public,anon;
grant execute on function roam_private.manage_registration_accounts(jsonb) to authenticated;
create or replace function public.roam_manage_registration_accounts(payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$select roam_private.manage_registration_accounts(payload)$$;
revoke all on function public.roam_manage_registration_accounts(jsonb) from public,anon;
grant execute on function public.roam_manage_registration_accounts(jsonb) to authenticated;
commit;
