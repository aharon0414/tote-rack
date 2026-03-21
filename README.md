# 🪵 Tote Rack Builder

A 2×4 lumber configurator for 27-gallon tote storage racks. Calculates cut lists, buy lists, and pricing. Works as a PWA — install it on your iPhone or computer like a native app.

---

## Project Structure

```
tote-rack/
├── public/
│   ├── index.html      ← PWA meta tags, service worker registration
│   ├── manifest.json   ← App name, colors, icons for home screen
│   └── sw.js           ← Service worker (offline support)
├── src/
│   ├── App.jsx         ← All app logic and UI (single file)
│   └── index.js        ← React entry point
├── package.json
└── README.md
```

---

## One-Time Setup: GitHub + Vercel

Do this once. After that, updates go live in under a minute.

### 1. Push to GitHub

```bash
# In the tote-rack folder:
git init
git add .
git commit -m "tote rack builder - initial"
```

Go to **github.com** → New Repository → name it `tote-rack` → create it, then run the two lines GitHub shows you:

```bash
git remote add origin https://github.com/YOURNAME/tote-rack.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to **vercel.com** → Add New Project
2. Click **Import** next to your `tote-rack` repo
3. Vercel auto-detects React — click **Deploy**
4. ~60 seconds later you have a permanent URL like `https://tote-rack.vercel.app`

From now on, every `git push` auto-deploys to that URL instantly.

---

## Install on iPhone (PWA)

1. Open your Vercel URL in **Safari** (must be Safari, not Chrome)
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

The app opens full-screen with no browser chrome and **works offline** — perfect for the lumber yard or job site.

---

## Install on Desktop (PWA)

In Chrome or Edge, visit your Vercel URL and look for the install icon (⊕) in the address bar. Click it → Install. It opens as a standalone window.

---

## Local Development

```bash
npm install
npm start
# Opens at http://localhost:3000
```

---

## Making Changes with Claude Code

```bash
# Open Claude Code in the project folder:
claude

# Describe what you want changed. Claude edits files directly.
# When done, push to deploy:

git add .
git commit -m "describe your change"
git push
```

Vercel picks up the push automatically. Your phone and computer update the next time the app is opened with an internet connection.

---

## Default Lumber Prices

| Board Length | Default Price |
|--------------|---------------|
| 2×4 × 8'     | $3.98         |
| 2×4 × 10'    | $7.28         |
| 2×4 × 12'    | $8.66         |
| 2×4 × 16'    | $11.58        |

All adjustable in-app on the Pricing tab.

---

## Tote Default Dimensions

Verified against Ana White tote rack configurator (27-gallon Sterilite tote):

| Dimension              | Value    |
|------------------------|----------|
| Length (lid on)        | 30.125"  |
| Width (lid on)         | 20.125"  |
| Height (lid on)        | 14.125"  |
| Lid rim thickness      | 1.875"   |
| Lip overhang (per side)| 1.375"   |

All adjustable in-app. All 2×4 lumber uses actual dimensions (1.5" × 3.5").

---

## Rack Geometry Notes

Formulas verified to match Ana White tote rack configurator output exactly:

- **Bay opening**: toteWidth + 2 × 0.25" = **20.625"** per bay
- **Runner length**: toteLength = **30.125"** (spans full rack depth)
- **Rack depth**: toteLength = **30.125"**
- **Bay height**: (toteHeight − lidThick) + runner + lipOverhang = **15.125"** per row
  - Body hanging below runner: 14.125 − 1.875 = 12.25"
  - Runner: 1.5"
  - Lid above runner: 1.375"
- **Total height**: rows × 15.125" + lidThick + lipOverhang + 0.75"
- **Total width**: cols × 20.625" + (cols+1) × 1.5" (posts)
- **Leg length**: totalHeight − 3"
- **Verified (3×3)**: 49.375" H × 67.875" W × 30.125" D ✓
- **Verified (5×5)**: 79.625" H × 112.125" W × 30.125" D ✓

---

## Persistence

Columns, rows, and build time are saved automatically to `localStorage` and restored on every app open. Lumber prices always load from hardcoded defaults and are never persisted. Use the **↺ RESET** button in the header to restore cols=3, rows=3, hours=3.
