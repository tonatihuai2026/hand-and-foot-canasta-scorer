# Hand and Foot Score Calculator

A free, static, no-signup score tracker and rules reference for Hand and Foot (a Canasta
variant). Built as plain HTML/CSS/vanilla JavaScript — no build step, no server, no
dependencies. Everything runs in the browser; nothing you type is sent anywhere.

## Pages
- `index.html` — interactive score tracker for 2, 3, or 4 teams. Tracks melds, red/black
  threes, canastas, and the going-out bonus per hand, with a running score history.
  State persists in `localStorage` so a page refresh mid-game doesn't lose your score.
- `rules.html` — how Hand and Foot is played, the default scoring table, and the most
  common house-rule variants you'll encounter at different tables.
- `score-sheet.html` — a printable (print-CSS) score sheet and quick-reference for players
  who prefer pen and paper.

## Running locally
No build step required. From this directory:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

## Deploying
Any static file host works — push the contents of this directory as-is. No environment
variables, no build command, no server-side code.
