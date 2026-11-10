# Roam hosting and data

- The active app is https://kawingtam.github.io/Roam/ and the public sample preview is at /Roam/preview/.
- `web/` is the static frontend; `app/ledger.tsx` and its shared components provide the mobile screens. Build with `npm run build:pages`.
- GitHub Actions publishes `pages-dist/` on pushes to `main`. Only static assets belong in the deployment.
- Supabase handles accounts, database operations, and private receipts. `web/public/config.js` contains browser-safe configuration only.
- The `.openai` manifest, Vinext server routes and legacy Sites build are retained for the previous owner-private backup. Do not publish to Sites or move hosting back there unless the user explicitly requests it.
- Never commit expense exports, receipt files, local databases, credentials, or `work/`. Public schema and fixture-based tests are safe to track.
- For backend changes, inspect the selected project and preserve trip membership and creator-only writes. See `supabase/SETUP.md`.
- Relevant checks: `node tests/access.mjs`, `node tests/supabase.mjs`, TypeScript, `npm run build:pages`, then `node tests/pages.mjs`. Run checks appropriate to the actual change.
