# Roam — travel expenses

An initial personal pilot with accounts, trips, expiring invitation links, private expenses, receipt photos, local-first capture, filters and CSV export.

## Access model

Hosted sign-in is handled by Sites / ChatGPT, not a custom username/password service. The deployment starts owner-private. A trip invitation grants membership inside the application; it does not grant permission to visit the owner-private Site. Additional travelers must separately receive Site access before invitations work for them. No invitations are emailed automatically.

Trip members see trip details and traveler count. Expenses and receipt files are visible only to their author, including against direct API requests. Invitation links can be used by multiple app visitors for seven days. Only the creator can generate links. Role administration, invitation revocation and shared expense visibility are not implemented.

## Offline use

Open and sign in online first, let the page finish preparing, then add to the home screen. The service worker caches the app shell and loaded assets. IndexedDB keeps trips, expense records, compressed receipt blobs and pending upload state under the account ID. An entry is reported saved only after its local transaction completes. Sync runs on opening, reconnecting, focusing the app, or pressing Sync now. The application does not promise background uploads while closed.

Receipts are resized to at most 1800px and converted to JPEG, then uploaded to private R2 storage. A pending record remains pending until its receipt also uploads. Stable record IDs make retries idempotent. Existing expense edits across devices use last-write-wins. Avoid editing the same account in multiple tabs: cross-tab merge handling is deferred.

Browser storage can be cleared or evicted; local-only records are not a backup. Sync before signing out, clearing site data or changing devices. Device data remains stored for offline use and is isolated by account ID; use on a trusted personal device. Sign out clears offline shell caches and is blocked while uploads remain pending.

Currencies use their standard decimal precision, including zero-decimal JPY and KRW. Values are stored as integer minor units. Totals stay separated by original currency. No exchange-rate conversion.

## Development

Use Node >=22.13. Run the Sites installation and build helpers described by the supplied scripts. Generate schema migrations with `npm run db:generate`; run `node tests/access.mjs` for API isolation and retry checks and `npx tsc --noEmit` for type checks. Apply generated SQL to the local DB via Wrangler before previewing. Hosted migrations are applied during publication.

Before relying on the pilot during travel, test home-screen install, photo capture, airplane-mode save, full app close and reopen, reconnection, and a second authorized account on actual iPhone and Android devices. Automated checks and desktop browser checks do not replace these device checks.

## GitHub and hosting

The source checkout is `/Users/k/Desktop/Github/travel-ledger`. This move does not create or upload a GitHub repository. Use a private GitHub repository for source. The existing origin remote belongs to Sites publication; preserve it and add GitHub as a second remote if desired. Never commit receipts, live exports, local databases, `.wrangler`, `work`, `.env` files or credentials. Runtime data lives in private D1/R2 storage, separate from Git.

GitHub Pages serves static files and cannot run this application's current server routes. Keeping the code on GitHub and running the app on Sites is the smallest option. A future GitHub Pages deployment needs a separately hosted authentication/API/database/storage backend and a change from Sites-specific sign-in; publishing the current files to Pages will not provide a working secure app. A private repository does not automatically make its Pages website private.

## Minimal expense entry

Receipt (optional) → amount and currency → category → save with an optional note/date. Each screen keeps its values when going back. Only the final Save writes the expense to device storage. Cancel asks before discarding changed inputs.

## Examples to enter manually

Create a trip named **Japan test**, destination **Kyoto**, default currency **JPY**. Use your travel dates or today's date for both.

| Amount | Currency | Category | Note |
| --- | --- | --- | --- |
| 550 | JPY | Food | Coffee near the station |
| 1200 | JPY | Transport | Airport train |
| 9800 | JPY | Stay | One night hotel |
| 1500 | JPY | Activities | Museum tickets |
| 12.50 | USD | Food | Airport snack |

Expected totals: JPY 13,050 and USD 12.50, shown separately. Filter Food to see JPY 550 and USD 12.50. For an offline check, open the app online, enable airplane mode, add JPY 300 in Food with an optional photo, save, close and reopen, then reconnect and use Sync now. The JPY total becomes 13,350. No sample data is inserted into your account automatically.

## Navigation

Home has exactly two actions: Add expense and View trips. Add expense opens receipt capture directly when there is one trip, asks which trip when there are several, or offers Create/Join when there are none. A trip opens to Add expense / View expenses. Totals, exports, trip details, invitations and sync/account actions are revealed only when requested. New trips require a name; dates, destination and currency keep defaults behind optional details.
