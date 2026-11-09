<div align="center">

# 🌿 Roam — Travel Expense Tracker

### Little receipts. Lovely adventures. ✈️

A calm, mobile-first way to keep track of travel spending — from your first coffee to your last souvenir.

**Less time keeping receipts. More time making memories.**

[🌷 Explore the Preview](https://kawingtam.github.io/travel-ledger/) · [🔐 Open the App](https://roam-travel-ledger.kawingtam.chatgpt.site/)

</div>

> 🛠️ A full GitHub Pages app with separate Supabase accounts and storage is being prepared on the `github-pages-app` branch. The current public link remains the sample preview until the private backend and existing data transfer are verified. See [migration setup](supabase/SETUP.md).

---

## ✨ Meet Roam

Travel comes with enough things to remember. Your expenses can be the easy part. 🧳

Roam brings receipts, categories, currencies, and shared trips into one simple place. Add an expense in a few small steps, check how your trip is going, and keep exploring — even when the connection disappears.

> soft greens · clear totals · tiny steps · room to breathe 🌿

The public preview uses **invented sample data**. The working app requires sign-in and currently has restricted Site access.

---

## 🌸 Project Highlights

- 📱 **Made for mobile** — a minimal interface designed for phone browsers
- 🧾 **Receipts, together** — attach a photo to an expense
- 🪄 **One step at a time** — receipt, amount, optional description, then save
- 🧳 **Shared trips** — keep travel companions looking at the same expenses
- 🎨 **Your own categories** — choose names and icons, shared across the trip
- 🌍 **Two currency views** — see spending in USD and your trip currency
- 🌱 **Offline capture** — save on your device and sync when connected
- 🔎 **Easy review** — search by amount, category, or description
- 🔐 **Account-based access** — trip data stays behind server-side permission checks

---

## 🧭 A Little Tour

Just three places to go:

| Screen | A Little Help With… |
| --- | --- |
| 🏡 **Home** | Current trip, currency totals, a spending chart, and your top three categories |
| ➕ **Add** | Picking a category and recording an expense in simple steps |
| 🌿 **More** | Trips, invitations, category settings, and account sync |

Tap the current trip name for trip details. Tap a category to see its expenses. Open an entry to review its receipt and details.

**Your own expense?** You can edit or delete it. Everyone else on the trip can view it. 🤝

---

## 🧾 From Receipt to Ready

```text
Choose your trip & category 🧳
              ↓
Add a receipt photo 📸
              ↓
Enter the amount & currency 💰
              ↓
Add a description — or skip ✏️
              ↓
Review & save 🌷
              ↓
Sync when connected ☁️
```

No long form to work through. Just the next small step.

---

## 🎨 The Look & Feel

Roam is designed to feel like a quiet moment in a busy travel day.

- 🌿 Soft green accents and light backgrounds
- 🫧 Rounded cards and simple buttons
- 🔤 Clear typography and readable amounts
- 🧭 Consistent Home / Add / More navigation
- 🪶 Enough detail to be useful, without filling every corner

The goal: make the next action easy to find.

---

## 🔐 Your Adventures Aren’t Stored on GitHub

The code is public. Your travel records are kept separately.

| Where | What Lives There |
| --- | --- |
| 💻 **GitHub** | App source, database structure, and the sample preview |
| ☁️ **Cloudflare D1** | Trips, members, categories, and expenses |
| 🧾 **Cloudflare R2** | Receipt photos |
| 📱 **Your device** | Offline records and photos waiting to sync |

The working app uses **Sites / ChatGPT sign-in**. Trip members can view shared trip expenses and receipts; only the person who added an expense can edit or delete it. Category names and icons are shared with the whole trip.

**A small access note:** the working Site is currently owner-private. A traveler needs Site access as well as a trip invitation. A GitHub account or a visit to the preview does not grant access to anyone’s trips.

---

## 🌦️ When the Connection Wanders

An expense saves on your device first. When the app is open and connected, pending entries and receipts can sync to the online storage.

Shared data refreshes when opening, reconnecting, returning to the app, or choosing **Sync now**. Continuous live updates and uploads while the app is closed are not implemented.

> 🧳 Before clearing browser storage or changing devices, check that your entries show **Synced**. Unsynced records exist only on that device.

Currency conversions use daily reference rates. Your original amounts and currencies stay unchanged.

---

## 🛠️ Built With

| Technology | Its Little Job |
| --- | --- |
| **React + TypeScript** | App screens and interactions |
| **Vinext + Vite** | Application routing and builds |
| **CSS + Lucide icons** | Layout, soft colors, and familiar icons |
| **Cloudflare Workers via Sites** | Server routes and hosting |
| **Cloudflare D1 + R2** | Expense records and receipt storage |
| **IndexedDB + Service Worker** | Offline records and cached app files |
| **Sites / ChatGPT** | Sign-in |
| **Frankfurter** | Daily currency reference rates |
| **GitHub Pages** | Public sample preview |

---

## 🗂️ A Peek Inside

```text
travel-ledger/
├── app/                 # Screens, styles, sign-in helpers & API routes
├── db/                  # Database schema
├── drizzle/             # Database migrations
├── docs/                # Public preview with sample data
├── web/                 # Full GitHub Pages app (migration in progress)
├── supabase/            # Private backend schema & migration guide
├── public/              # App icons, manifest & offline worker
├── tests/               # Permissions, sync rules & data checks
├── DEVELOPMENT.md       # Setup, storage & implementation notes
└── README.md            # You are here 🌷
```

---

## 🚀 Try It Out

### 🌷 Just looking around?

Visit the [public preview](https://kawingtam.github.io/travel-ledger/) and switch between **Home**, **Add**, and **More**. It uses sample values and has no connection to the live database.

### 🧳 Ready to record a trip?

[Open the working app](https://roam-travel-ledger.kawingtam.chatgpt.site/) and sign in. You’ll need Site access before creating or joining a trip.

### 💻 Exploring the code?

```bash
git clone https://github.com/kawingtam/travel-ledger.git
cd travel-ledger
```

For the static preview:

```bash
python3 -m http.server 8000 --directory docs
```

Then open **http://localhost:8000**.

For the full application, database setup, and checks, see the [development guide](DEVELOPMENT.md). GitHub Pages hosts the preview; the working app’s server routes and authentication run separately on Sites.

---

## 🌱 Current Status

Roam is a personal project growing around a simple idea: **travel expense tracking should feel easy on a phone.**

Shared trip records, custom categories, receipt capture, offline saving, currency summaries, and creator-only editing are implemented. Real iPhone and Android offline travel testing is still needed before relying on it for a trip.

More implementation details and current limitations live in the [development guide](DEVELOPMENT.md).

---

<div align="center">

## 🌿 Roam

**Pack light. Spend thoughtfully. Keep exploring.**

Made with soft greens, small steps & a little bit of ✨

</div>
