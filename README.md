# Roam — travel expenses

Mobile travel expense tracker: Home / Add / More, offline capture, shared trips, private account sign-in, receipts, custom trip categories, detail pages, filters and CSV exports.

## Access

Sites / ChatGPT handles sign-in. The Site starts owner-private; trip invitations create in-app membership and do not grant permission to open the private Site. Other travelers also need Site access. Invitation links last seven days; only trip creators generate them.

Every trip member can read all expenses and receipt images in that trip, including records created before shared viewing was introduced. Only the original expense creator can edit the record or replace its receipt. Even the trip creator cannot edit someone else's expense. Server routes enforce membership and ownership; hiding an Edit button is only presentation. Nonmembers cannot fetch trip expenses or receipt images. Older expense records without an author display name show “Trip member” to other users; ownership still uses the stored account ID.

Custom categories belong to a trip and are visible to its members. Any member can add a category. Category names and icons are editable by any member. Renaming updates labels on existing expenses without changing their amounts or creator. Historic names are retained as aliases so older offline entries sync into the correct shared category. Category deletion and membership removal screens are not implemented.

## Navigation

Home shows the three highest-spending categories in the displayed currency and fits standard phone portrait sizes without scrolling. Tap View all for every expense. Tap a category to open its filtered list, View all for every expense, or Trip details for destination, dates, member count and separate currency totals. Expense lists have one always-visible search field for amount, category and description. Original-currency totals and matching counts remain visible. Category drill-down pre-fills the search; CSV exports match the search.

Tap an expense for amount, category, description, date, author, sync status and receipt. Your own entries have Edit expense. Edits start with the amount, retain the existing values, and allow category/date/receipt changes at review.

Add uses category icons. Add category creates another category for the selected trip. New entry is receipt → amount → description (Next or Skip) → save. Entry uses the same rounded, pale green cards, pill buttons, typography and background as Home.

## Data and offline behavior

IndexedDB keeps records and pending compressed receipt blobs under account-specific keys. Saving is reported only after the local transaction completes. Trips and categories sync before dependent expenses. Stable IDs make retries idempotent. Pending state remains until the receipt upload also succeeds. New categories can be created offline, including on a locally created trip.

Structured records sync to D1; receipt files upload to private R2 storage. Shared data refreshes on opening, reconnecting, focusing the app or manual Sync now. Uploads are not promised while the app is closed. Saved online receipt images are fetched on demand and are not automatically cached for offline viewing. Previously synced trip records can be reviewed offline.

Browser storage can be cleared or evicted; unsynced entries are not a backup. Sign-out is blocked while uploads remain pending and clears the offline shell cache. Local account data remains on the trusted device for offline use, isolated by account ID; it is not encrypted by this application. Existing downloaded copies cannot be revoked from an offline device. Same-expense edits across devices use last-write-wins; cross-tab merging is not implemented.

Currencies use integer minor units with the currency's standard precision. Original records keep their entered currency and amount. Home shows the full trip total converted into USD and the trip currency, with category rankings and the chart using the selected display currency. Frankfurter v2 supplies latest daily reference rates; this is an estimate rather than an intraday quote or a historical transaction rate. Both totals include all trip members' expenses.

## Source and hosting

GitHub contains the application source and a static public preview in `docs/`. The working app is hosted separately on Sites; preserve the Sites publication workflow. A public source repository does not make the database public. Never commit personal receipts, exports, databases, `.wrangler`, `work`, `.env` files or credentials. Runtime data is separate from Git.

GitHub Pages cannot run the current server routes. Hosting there would require a separate authentication/API/database/storage backend and changes to Sites-specific sign-in.

## Development and checks

Use Node >=22.13 and the supplied Sites build workflow. Generate schema migrations with `npm run db:generate`; commit generated SQL and metadata. Apply each new migration once to the local D1 database before previewing. Publication applies hosted migrations. Do not replay previously applied SQL.

Run `node tests/access.mjs` for shared reads, creator-only writes, receipt access, outsider isolation, custom categories, retries, money precision and category ranking. Run `node node_modules/typescript/bin/tsc --noEmit` for type checks. Use the built Worker preview for visual QA.

Test offline capture/reopen/reconnect on actual iPhone and Android devices before relying on the app during travel; desktop checks do not replace device checks.

## Reference-style overview and entry

Home uses a native CSS donut chart and spending-ranked category legend, with the selected currency kept explicit and Trip details above the chart. Amount entry has a large currency symbol/number and an always-visible currency selector. The final save screen exposes category, date, note and optional receipt as compact rows. The separate skippable description page and shared-trip access rules remain. Successful saves show the amount with Add another / Done actions. Bottom navigation remains Home / Add / More.

## Rates, deletion and restore

The signed-in `/api/rates` endpoint fetches daily USD-based reference rates from Frankfurter for the app's supported currencies. Only currency codes are sent; no expense amounts, receipts, trip names or identities are sent to the rate provider. Positive finite rates and their dates are validated. The browser stores the last successful rate snapshot for offline use, refreshes when opening/reconnecting/focusing if older than an hour, and offers Refresh rates. Source rate dates and refresh controls are available in Trip details → Exchange rate. Conversions never overwrite original expense amounts. If a rate is missing, the app reports it and shows original totals instead of pretending a partial total is complete.

Only the expense creator can delete or restore their entry. Delete is reversible: a `deleted` flag removes it from shared lists and all totals; restore controls have been removed. Tombstones remain for synchronization retry safety. The existing restore endpoint only remains compatible with actions already queued by older clients. Receipts are retained but unavailable while deleted. Deleted metadata is returned only to its creator. Local pending deletion/restoration syncs with stable IDs and survives retries. There is no permanent purge action.

Home totals, expense-list totals and search are always visible. More menu rows share one card style; Create a trip and Join a trip use matching buttons.

## Latest mobile refinements

Add / Edit categories offers 16 icons and shared category name editing. Default category positions stay stable when renamed. Home is compact with a maximum of three category rows and no exchange-rate wording. The current trip name opens its details directly. Trip details shows whole-trip converted USD and travel-currency totals; individual expense values stay in their original currency. The Add photo control is a real button with visible text; the saved screen no longer repeats the trip name. More uses the label Invite and has no restore menu. Home was checked at 390×844, 375×667 and 320×568 with no vertical overflow.

## Public preview and private application

The GitHub Pages preview in `docs/` contains invented sample values only. It has no database connection, accepts no expense entries, and does not store or upload visitor information. Open app leads to the separately hosted application, where Sites / ChatGPT supplies authentication. The public preview is not a substitute for a user's trip account.

| Location | Contents | Access |
| --- | --- | --- |
| GitHub repository / Pages | Source, schema migrations, static demo | Public |
| Cloudflare D1 through Sites | Trips, memberships, expenses, category names/icons, hashed invitation tokens | Authenticated server routes; trip members only |
| Cloudflare R2 through Sites | Receipt images | Authenticated receipt route; trip members only |
| Browser IndexedDB | Account-specific offline records and pending photos | Local device storage |

GitHub Pages cannot execute this app's API or provide its authentication. Keep the working app on Sites with D1/R2. Do not deploy the Worker directly to an unprotected origin: its identity headers are trusted only behind the Sites authentication gateway. Inviting a traveler to a trip does not change the Site's owner-private access policy; the owner must separately grant Site access before that traveler can open it.

Tests use an in-memory database and invented accounts. No production expense data is needed to build, preview, or test this repository. Deleted entries are marked deleted for reliable offline synchronization; deletion does not purge the stored record or its receipt file. Do not describe the current delete action as permanent erasure.
