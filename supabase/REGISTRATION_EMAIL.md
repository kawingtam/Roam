# Registration and account review

The separate browser page supports owner-only registration decisions, display-name editing and guarded deletion of empty accounts. It uses the same Roam email and password as the app. Server authorization does not trust user-editable metadata.

Apply `registration-review.sql` once after `roam.sql`, then `account-review.sql`. Existing deployments already have these account/approval functions. Deletion requires typing the target email and is blocked for administrators, approved accounts, and any trip, expense, category, membership or receipt data. Name edits and deletions are audited privately. Removing the registration row makes stale tokens fail every Roam data gate.

`npm run build:pages` builds the review page at `/Roam/registration-review.html` and a self-contained copy at `/Roam/preview/registration-review.html`. Its public client uses only browser-safe configuration.

## Email notifications

`registration-notification` authenticates a private database webhook and sends only to the fixed administrator inbox. Store `RESEND_API_KEY`, `REGISTRATION_FROM_EMAIL`, `REGISTRATION_REVIEW_URL`, and `REGISTRATION_WEBHOOK_SECRET_SHA256` in Supabase Edge Function Secrets. Keep the raw webhook secret in Vault as `roam_registration_webhook_secret`, along with `roam_project_url`. Never commit credentials.

After testing the live page, apply `registration-email-webhook.sql` to enable pending-signup notifications. Opening links cannot change account access: the owner must sign in and confirm the action. Monitor asynchronous webhook failures and retry the original event ID. Provider idempotency suppresses duplicate messages within its retention window.

The Resend test sender only delivers to the owner's Resend account email. Custom SMTP for traveler confirmation and password-reset email is a separate setup.
