# GitHub Pages + private Supabase backend

Status: the full app is live on GitHub Pages. The dedicated Supabase backend is configured and hosted login, shared reads, creator-only changes, private receipt storage, and anonymous/outsider denial have passed tests. The original owner's records and receipt were transferred to the verified destination account and reconciled privately; the app reports everything synced. The old owner-private site is retained as a backup. No personal records or photos are included in this repository.

## Hosting

- Full app: `https://kawingtam.github.io/travel-ledger/`.
- Source: this repository. Built HTML, JavaScript, CSS and icons only are deployed by GitHub Pages.
- Accounts, trip/expense records and receipt photos: the selected Supabase project, never GitHub.
- No ChatGPT login or `chatgpt.site` dependency in the new app's normal workflow.

## Backend setup

1. The dedicated Roam project is `jmgpwtlvkrmxdjoqpzcl`, in Kathy Creations. For a fresh installation, connect Supabase and select or create a dedicated project. Do not reuse SpaBooking's tables or change its authentication settings as a shortcut.
2. Apply `supabase/roam.sql` once as the project owner. It creates `roam_*` tables, private receipt storage and the `roam_data` RPC. It must complete as one transaction. There are no grants allowing anonymous data reads or direct client writes to tables.
3. Enable email/password authentication. Add `https://kawingtam.github.io/travel-ledger/` to allowed redirect URLs; set the Site URL to the same address. Keep email confirmation enabled. Configure email delivery before inviting travelers; the default mail service has restrictions.
4. Place only the project URL and browser-safe publishable/anon key in `web/public/config.js`. Never place a database password, access token, secret key or service_role key in this repository.
5. Create two disposable test accounts in a test environment and verify hosted auth, create/join trip, cross-account read, creator-only edit/delete, private receipt upload/read, signed URL expiry, and anonymous rejection. Local PostgreSQL tests do not prove the actual project's authentication and storage configuration.

## Existing expenses: preserve before cutover

ChatGPT account IDs and Supabase user IDs are different. Do not import records with a guessed ownership mapping, expose the old private API to anonymous visitors, or copy production records/photos into GitHub.

The previous app remains owner-private at `https://roam-travel-ledger.kawingtam.chatgpt.site/` until migration is verified. Export and transfer existing records privately after the new account is confirmed. Reconcile trip and expense counts, original currency totals and receipt availability. Shared trips require verified account mappings for their members. Keep unsynced browser entries on the old origin until they are uploaded; a new hostname cannot read that origin's IndexedDB.

## Build and publication

Pushes to `main` publish the full app automatically through GitHub Actions. The manual **Publish Roam app** action is also available. Both paths validate the browser configuration and run database permission/build/cache checks before deploying.

```sh
npm ci
node tests/access.mjs
node tests/supabase.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build:pages
node tests/pages.mjs
```

For local preview, `npm run dev:pages` serves `/travel-ledger/`. Without backend configuration, the page clearly says setup is pending and links to existing trips. It cannot save fake or anonymous expenses.

For a fresh installation, after backend setup, data reconciliation and phone testing pass:

1. Merge the migration branch to `main`.
2. Set repository Settings → Pages → Source to GitHub Actions.
3. Run **Publish Roam app** on `main`. Configuration validation prevents a blank backend or a secret/service key from being published.
4. Verify the actual GitHub Pages URL on iPhone and Android, including sign-in, sign-out, photo capture, offline reopen, pending sync and a shared trip.
5. Update preview/README links to point to the full app. Do not shut down the previous site before its records and pending entries are accounted for.

## Security and offline behavior

The browser uses Supabase's official client for sessions and token refresh. The database derives the acting user from `auth.uid()`, not a user ID in the request. A restricted RPC applies validation, trip membership and creator ownership. Direct table access is revoked and RLS is enabled. Receipt policies separately enforce membership/ownership in a private bucket; signed links last five minutes and should be treated as temporary access links.

The GitHub app uses its own IndexedDB database and cache names. The Service Worker caches the public shell only, within `/travel-ledger/`; it does not cache Supabase data, login requests, receipt URLs, or other apps hosted under `kawingtam.github.io`. Pending entries and receipt blobs remain per-account locally until upload succeeds. Account sign-out is blocked while entries remain pending.

Database tests run the actual SQL in embedded PostgreSQL with three invented users, restricted roles and a storage-policy test schema. They cover anonymous denial, shared trip reads, outsider isolation, direct-write rejection, creator-only changes, category rename aliases, retry safety, validation and private receipt access.

## Current personal-use settings

Email/password sign-in and email confirmation are enabled; anonymous sign-in is disabled. The server minimum password length is 8 characters. GitHub Pages is configured as the Site URL and permitted authentication redirect destination.

The owner chose personal use first. Supabase's built-in email sender is restricted to project-team addresses. Configure a custom SMTP provider before inviting travelers outside the team: [Supabase email delivery](https://supabase.com/docs/guides/auth/auth-smtp). Email confirmation has not been disabled to work around delivery restrictions.

The Free plan does not include [leaked-password screening](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no paid plan was enabled. Disposable test accounts and their isolated test trip were left in place at the owner's request. Their uploaded test image was removed during validation. They are not members of the owner's migrated trip.

Local checks do not replace testing offline capture and reconnect on actual iPhone and Android devices before a trip.
