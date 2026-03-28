# Candidates 2026 — Betting Pool

Live scoring dashboard for the 2026 FIDE Candidates Tournament.
Standings and all 15 geek markers are detected **automatically** by fetching
real PGN from the Lichess broadcast API and replaying every move.
No manual input needed after the tournament starts.

**Live site:** `https://YOUR-USERNAME.github.io/candidates2026`

---

## The picks

### Open Section podium

| Place | Points | Juani | Bru |
|---|---|---|---|
| 1st | 25 pts exact / 5 consolation | Praggnanandhaa | Caruana |
| 2nd | 15 pts exact / 5 consolation | Caruana | Nakamura |
| 3rd | 10 pts exact / 5 consolation | Giri | Sindarov |

### Women's Section podium

| Place | Points | Juani | Bru |
|---|---|---|---|
| 1st | 10 pts exact / 2 consolation | Zhu Jiner | Zhu Jiner |
| 2nd | 6 pts exact / 2 consolation | Goryachkina | Tan Zhongyi |
| 3rd | 4 pts exact / 2 consolation | Assaubayeva | Goryachkina |

### Geek markers (2 pts each)

| # | Marker | Juani | Bru |
|---|---|---|---|
| 1 | Hot Hand | Caruana | Caruana |
| 2 | On Tilt | Esipenko | Esipenko |
| 3 | The Pacifist | Wei Yi | Wei Yi |
| 4 | Philidor Sighting | No | No |
| 5 | First En Passant | Round 3 | Round 5 |
| 6 | Disrespect Move | No | No |
| 7 | King's Excursion | Yes | Yes |
| 8 | Castling Holdout | Sindarov | Praggnanandhaa |
| 9 | Second Queen | Yes | No |
| 10 | Actual Checkmate | Yes | Yes |
| 11 | Blitz Game | No | No |
| 12 | The Marathon | Yes | No |
| 13 | Pawn Race | Yes | No |
| 14 | Closed Sicilian | No | No |
| 15 | Late Shake-up | Yes | No |

**Max possible score: 100 pts** (Open 50 + Women's 20 + Geek 30)

---

## Scoring rules

**Open podium — max 50 pts**
- 1st place: 25 pts exact, 5 pts consolation if player finishes 2nd or 3rd
- 2nd place: 15 pts exact, 5 pts consolation
- 3rd place: 10 pts exact, 5 pts consolation

**Women's podium — max 20 pts**
- 1st place: 10 pts exact, 2 pts consolation
- 2nd place: 6 pts exact, 2 pts consolation
- 3rd place: 4 pts exact, 2 pts consolation

**Geek markers — max 30 pts**
15 bets at 2 pts each. All detected automatically from PGN.

---

## How it works

```
Lichess Broadcast API (no auth needed)
  └── /api/broadcast/{tourId}           discover round IDs
  └── /api/broadcast/round/{id}/pgn     raw PGN for every game
        │
        ▼
  pgn.js       parse PGN into game objects
  chess.js     replay every move on a virtual board
  analyser.js  detect all 15 geek rules deterministically
  scoring.js   calculate points for both players
  render.js    update the DOM
  chart.js     update the points race chart
```

The page **auto-refreshes every 5 minutes** while open.
All data is cached in `localStorage` — instant load on return visits.

---

## Geek marker detection

| Marker | How detected |
|---|---|
| Hot Hand | Longest consecutive win streak from Result headers, per player |
| On Tilt | Longest consecutive loss streak |
| The Pacifist | Most draws (Giri excluded) |
| Philidor Sighting | PGN Opening/ECO header contains "Philidor" |
| First En Passant | Pawn captures diagonally onto an empty square during move replay |
| Disrespect Move | `=N`, `=B`, or `=R` promotion notation in move text |
| King's Excursion | King square crosses opponent's half before move 40 |
| Castling Holdout | Highest move number at which any player castles across all games |
| Second Queen | Queen count ≥ 2 on board after a pawn promotion |
| Actual Checkmate | `#` on the final move of a decisive game |
| Blitz Game | Decisive result in fewer than 25 moves |
| The Marathon | Decisive result in more than 90 moves |
| Pawn Race | Both colours promote a pawn within the same game |
| Closed Sicilian | PGN Opening/ECO header contains "Closed Sicilian", "A07", or "A08" |
| Late Shake-up | Leader after R11 ≠ leader after R12 (computed from results) |

---

## Deploy to GitHub Pages

### 1. Create the repo
- github.com → **+** → **New repository** → name: `candidates2026` → Public → **Create**

### 2. Upload files
Drag the contents of this folder (keeping `css/` and `js/` subfolders) onto
the GitHub upload page → **Commit changes**.

Or via Git:
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR-USERNAME/candidates2026.git
git push -u origin main
```

### 3. Enable Pages
**Settings → Pages → Source: main branch / (root) → Save**

Wait ~60 seconds. Done.

---

## Updating picks after the fact

Edit `js/data.js` — the `JUANI` and `BRU` objects at the top.
Commit the change on GitHub. The site updates in ~30 seconds.

---

## File structure

```
candidates2026/
├── index.html        Page layout and tab structure
├── css/main.css      Dark theme styles
└── js/
    ├── data.js       Both players' picks + geek definitions + Lichess IDs
    ├── pgn.js        PGN parser (no dependencies)
    ├── chess.js      Virtual board / move replayer
    ├── analyser.js   All 15 geek rule detectors + standings builder
    ├── scoring.js    Point calculations
    ├── render.js     DOM updates
    ├── chart.js      Points race chart (Chart.js)
    ├── lichess.js    Lichess broadcast API fetcher
    └── app.js        Controller, localStorage, auto-refresh
```
