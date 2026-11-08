# Roam — travel expenses

Mobile travel expense tracker: Home / Add / More, offline capture, shared trips, private account sign-in, receipts, custom trip categories, detail pages, filters and CSV exports.

## Access

Sites / ChatGPT handles sign-in. The Site starts owner-private; trip invitations create in-app membership and do not grant permission to open the private Site. Other travelers also need Site access. Invitation links last seven days; only trip creators generate them.

Every trip member can read all expenses and receipt images in that trip, including records created before shared viewing was introduced. Only the original expense creator can edit the record or replace its receipt. Even the trip creator cannot edit someone else's expense. Server routes enforce membership and ownership; hiding an Edit button is only presentation. Nonmembers cannot fetch trip expenses or receipt images. Older expense records without an author display name show “Trip member” to other users; ownership still uses the stored account ID.

Custom categories belong to a trip and are visible to its members. Any member can add a category. Category renaming/deletion and membership removal screens are not implemented.

## Navigation

Home ranks categories by total spending in the displayed currency. Tap a category to open its filtered list, View all for every expense, or Trip details for destination, dates, member count and separate currency totals. Expense lists filter by category, currency, traveler, date range and description search. CSV exports match the filters.

Tap an expense for amount, category, description, date, author, sync status and receipt. Your own entries have Edit expense. Edits start with the amount, retain the existing values, and allow category/date/receipt changes at review.

Add uses category icons. Add category creates another category for the selected trip. New entry is receipt → amount → description (Next or Skip) → save. Entry uses the same rounded, pale green cards, pill buttons, typography and background as Home.

## Data and offline behavior

IndexedDB keeps records and pending compressed receipt blobs under account-specific keys. Saving is reported only after the local transaction completes. Trips and categories sync before dependent expenses. Stable IDs make retries idempotent. Pending state remains until the receipt upload also succeeds. New categories can be created offline, including on a locally created trip.

Structured records sync to D1; receipt files upload to private R2 storage. Shared data refreshes on opening, reconnecting, focusing the app or manual Sync now. Uploads are not promised while the app is closed. Saved online receipt images are fetched on demand and are not automatically cached for offline viewing. Previously synced trip records can be reviewed offline.

Browser storage can be cleared or evicted; unsynced entries are not a backup. Sign-out is blocked while uploads remain pending and clears the offline shell cache. Local account data remains on the trusted device for offline use, isolated by account ID; it is not encrypted by this application. Existing downloaded copies cannot be revoked from an offline device. Same-expense edits across devices use last-write-wins; cross-tab merging is not implemented.

Currencies use integer minor units with the currency's standard precision. Totals and category rankings stay separated by currency; no exchange-rate conversion. Dashboard totals include all trip members' expenses.

## Source and hosting

Checkout: `/Users/k/Desktop/Github/travel-ledger`. Moving the folder did not create a GitHub repository. Use a private GitHub repository for source; preserve the Sites publication remote. Never commit personal receipts, exports, databases, `.wrangler`, `work`, `.env` files or credentials. Runtime data is separate from Git.

GitHub Pages cannot run the current server routes. Hosting there would require a separate authentication/API/database/storage backend and changes to Sites-specific sign-in.

## Development and checks

Use Node >=22.13 and the supplied Sites build workflow. Generate schema migrations with `npm run db:generate`; commit generated SQL and metadata. Apply each new migration once to the local D1 database before previewing. Publication applies hosted migrations. Do not replay previously applied SQL.

Run `node tests/access.mjs` for shared reads, creator-only writes, receipt access, outsider isolation, custom categories, retries, money precision and category ranking. Run `node node_modules/typescript/bin/tsc --noEmit` for type checks. Use the built Worker preview for visual QA.

Test offline capture/reopen/reconnect on actual iPhone and Android devices before relying on the app during travel; desktop checks do not replace device checks.
