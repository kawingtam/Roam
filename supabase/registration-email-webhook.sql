-- Apply only AFTER the external review page and notification function are deployed
-- and the email sender has passed an actual delivery test. This file is NOT applied yet.
-- Required Vault secrets: roam_registration_webhook_secret, roam_project_url.
-- REGISTRATION_WEBHOOK_SECRET in the Edge Function must match the Vault value.
begin;
create extension if not exists pg_net with schema extensions;
do $$begin
 if not exists(select 1 from vault.secrets where name='roam_registration_webhook_secret')
 or not exists(select 1 from vault.secrets where name='roam_project_url') then
  raise exception 'Configure the notification webhook secrets before enabling email alerts';
 end if;
end$$;
create or replace function roam_private.notify_registration_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare secret text; project_url text;
begin
 if new.status<>'pending' then return new; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='roam_registration_webhook_secret';
 select decrypted_secret into project_url from vault.decrypted_secrets where name='roam_project_url';
 if secret is null or project_url is null then return new; end if;
 perform net.http_post(url:=project_url||'/functions/v1/registration-notification',
 headers:=jsonb_build_object('Content-Type','application/json','x-registration-secret',secret),
 body:=jsonb_build_object('type','INSERT','schema','public','table','roam_registration_requests','record',jsonb_build_object('user_id',new.user_id)),timeout_milliseconds:=10000);
 return new;
end$$;
revoke all on function roam_private.notify_registration_email() from public,anon,authenticated;
create trigger roam_registration_email after insert on public.roam_registration_requests
for each row execute function roam_private.notify_registration_email();
commit;
-- Network delivery is asynchronous; inspect net._http_response for failures.
-- Retry failed events through the same authenticated webhook using the original ID.
-- Provider idempotency keys suppress duplicate deliveries within its retention window.
