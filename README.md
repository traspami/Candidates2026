# Candidates 2026 — Betting Pool

Live scoring dashboard. Standings and all 15 geek markers are detected
**automatically** by fetching real PGN from the Lichess broadcast API and
replaying every move. No manual input needed after the tournament starts.

**Your site:** `https://YOUR-USERNAME.github.io/candidates2026`

---

## Deploy to GitHub Pages (5 minutes)

### 1. Create the repo
- Go to github.com → **+** → **New repository**
- Name: `candidates2026` · Visibility: **Public** → **Create repository**

### 2. Upload files
Drag the entire `candidates2026/` folder contents (keeping `css/` and `js/` sub-folders)
onto the GitHub "uploading an existing file" page → **Commit changes**.

Or via Git:
```bash
cd candidates2026
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR-USERNAME/candidates2026.git
git push -u origin main
```

### 3. Enable Pages
**Settings → Pages → Source: main branch / (root) → Save**

Wait ~60 seconds. Your URL is live.

---

## How it works

### Data flow
```
Lichess Broadcast API
  └── /api/broadcast/{tourId}          → discover round IDs
  └── /api/broadcast/round/{id}/pgn   → raw PGN text
        │
        ▼
  js/pgn.js        parse PGN into game objects
        │
        ▼
  js/chess.js      replay every move on a virtual board
        │
        ▼
  js/analyser.js   detect geek rules deterministically
        │
        ▼
  js/scoring.js    calculate betting scores
        │
        ▼
  js/render.js     update DOM
  js/chart.js      update points race chart
```

### Auto-refresh
The page auto-refreshes every **5 minutes** while open.
Also triggered manually via the Refresh button.

### Persistence
All data stored in `localStorage`. Returns immediately from cache on reload.
Use **Reset history** (Points Race tab) to clear and re-fetch from scratch.

---

## Geek markers — how each is detected

| Marker | Detection method |
|---|---|
| Hot Hand | Longest win streak per player from Result headers |
| On Tilt | Longest loss streak per player |
| The Pacifist | Most draws (Giri excluded) |
| Philidor Sighting | PGN Opening or ECO header contains "Philidor" |
| First En Passant | Pawn captures diagonally onto empty square during move replay |
| Disrespect Move | `=N`, `=B`, or `=R` promotion notation |
| King's Excursion | King square crosses opponent's half before move 40 |
| Castling Holdout | Highest move number at which a player castles across all games |
| Second Queen | Queen count ≥ 2 after a pawn promotion during replay |
| Actual Checkmate | `#` symbol on final move of a decisive game |
| Blitz Game | Decisive game with fewer than 25 moves |
| The Marathon | Decisive game with more than 90 moves |
| Pawn Race | Both colours promote a pawn in the same game |
| The Blunder Draw | Draw result + "repetition" / "threefold" in PGN comments |
| Last Round Drama | Any decisive result in Round 14 |

---

## Customising picks

Edit `js/data.js` — the `JUANI` and `BRU` objects. Do this before Round 1.

## Finding Women's R1 ID

Once Women's Round 1 is broadcast on Lichess, update `WOMENS_R1_ID` in
`js/data.js` → `LICHESS` block. Or leave it null — the app will discover
rounds automatically via the tournament API endpoint.

---

## File structure

```
candidates2026/
├── index.html          Page structure
├── css/main.css        Styles (dark theme)
└── js/
    ├── data.js         Picks, geek definitions, Lichess IDs
    ├── pgn.js          PGN parser
    ├── chess.js        Virtual board / move replayer
    ├── analyser.js     Geek rule detection + standings
    ├── scoring.js      Point calculations
    ├── render.js       DOM updates
    ├── chart.js        Points race chart
    ├── lichess.js      Lichess broadcast API fetcher
    └── app.js          Controller, localStorage, auto-refresh
```
