
# CLAUDE.md — Volleyball Tournament Manager ("Court Control")

Guidance for working on this project. Read this before editing.

## What this is

A volleyball **tournament management application** for a two-day event:

- **Day 1 — Group stage:** single round-robin within each group.
- **Day 2 — Double elimination:** all teams enter one seeded bracket (winners + losers brackets, grand final with reset); seeds come from the Day 1 standings.

It has an **admin dashboard** (set up the tournament, enter scores) and a separate **viewer/display screen** (read-only broadcast for a projector/TV).

## Deliverables (both in this folder)

| File                           | What it is                                                                                                                                                                                 | Status                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `volleyball-tournament.html` | **Primary deliverable.** Single self-contained file, no build step, no framework runtime. Opens directly in a browser (incl. `file://`), works offline, saves to `localStorage`. | Canonical — this is what the user runs. |
| `volleyball-tournament.jsx`  | A React + Tailwind implementation (Claude Artifact). Source of the shared**logic** and the **base stylesheet**.                                                                | Parallel version.                        |

The HTML file and the JSX file share the **same pure logic** (scheduler, standings, bracket engine) and the **same base CSS**. When you change a logic function or a core style, change it in **both** so they don't drift.

## Hard constraints (do not break these)

1. **No build step / no framework runtime in the HTML.** It must keep running by double-clicking the file offline. Do not introduce React/Vue/bundlers/imports into the HTML.
2. **SheetJS (xlsx) is optional and CDN-loaded.** It only enables native `.xlsx` template/import when online. Every use is guarded with `if (window.XLSX)` and falls back to CSV. Never make core features depend on it.
3. **Persistence is `localStorage`** under key `vbt_html_v1`. (The JSX version uses the Artifact `window.storage` API under key `vbt_data_v1`.) The viewer is **read-only** and must never write.
4. **The viewer is the same file opened as a second window** (`#display` hash) so it shares the same origin/`localStorage`. Cross-*file* `localStorage` on `file://` is unreliable — do not rely on it.
5. **Escape all team-derived text** with `esc()` before putting it in HTML.

## How to run / develop

- **Run:** open `volleyball-tournament.html` in a browser. Admin is the default view.
- **Open the viewer:** click **Viewer** in the admin top bar (opens `…#display` in a new window) — or append `#display` to the URL manually.
- **Edit:** the HTML is self-contained; edit it directly. Its single inline `<script>` has two clearly-commented sections:
  1. `===== Tournament logic =====` — pure functions (mirrored from the JSX).
  2. `===== UI layer =====` — state, rendering, events, admin + viewer.

## Architecture of the HTML file

```
<head>
  <style> base reset + app stylesheet (.vbt, cards, tables…) + viewer stylesheet (.dv-* / display-mode) </style>
  <script src=cdn xlsx>   ← optional, guarded
</head>
<body class="vbt">
  <div id="app"></div>
  <script>
    /* logic */   pure functions, no DOM
    /* UI */      state S, render(), delegated events, admin views, viewer (display mode)
  </script>
</body>
```

### Rendering model (vanilla, no framework)

- A single state object `S = { tab, config, teams, matches, bracket, bracketResults, ui }`.
- `render()` builds an **HTML string** and assigns `app.innerHTML`, then **delegated** listeners on `#app` (attached once in `init`) dispatch by data-attributes: `data-act`, `data-ui`, `data-cfg`, `data-draft`, `data-filter`, `data-dv`.
- **Critical focus pattern:** text inputs update `S` on the `input` event **without re-rendering** (to preserve caret/focus). Only structural actions (button clicks, tab switches, saving a score, changing a filter) call `render()`. If you add an input that re-renders on every keystroke, it will lose focus — don't.
- Icons are inline SVG via `ic(name, size, color)` backed by the `ICONS` map. Add new glyphs there.

### Admin tabs

`overview`, `setup`, `teams`, `matches`, `standings`, `day2` — rendered by `vOverview / vSetup / vTeams / vMatches / vStandings / vDay2`.

### Viewer / display mode

- Entered when `location.hash === "#display"`; `init()` branches to `initDisplay()` and adds `body.display-mode`.
- **Auto-switches by stage:** if `S.bracket` exists → Day 2 layout, else → Day 1 layout. No manual toggle.
- **Live sync:** re-renders on the `storage` event (fires in this window when the admin window writes) plus a 1s polling fallback. To avoid flicker/scroll-reset on the bracket, Day 2 only fully re-renders when a data **signature** (`dataSig()`) changes; otherwise just the clock ticks.

## Domain logic (the pure functions)

All framework-agnostic and unit-testable. Defined in the logic section.

### Scheduling — `buildSchedule(teams, courts, blockSize)` + `allocateCourts(...)`

- Round-robin per group via `roundRobinRounds` (circle method).
- **Court allocation minimizes team movement:**
  - Groups ≤ courts → each group gets its own **private block** of courts (spare courts shared out evenly); no group shares a court with another.
  - Groups > courts → the first *C* groups get a fixed **home court**; overflow groups **rotate within a block** of `blockSize` courts (0 = auto = half the courts).
- Greedy slot assignment guarantees: a team is never on two courts in the same slot; fixed groups never leave their home court; matches only use courts in their group's allowed set.
- A known, accepted trade-off: a group can only play as many simultaneous matches as it has pairs per round, so some courts may sit idle for small groups.

### Standings — `computeStats(...)` + `rankTeams(...)`

- Win = `winPoints` (default 2), Draw = `drawPoints` (default 1), Loss = 0. Draws are allowed (a timed game can end level).
- **Tiebreaker order is product-critical and must stay:**
  `games won → points → point difference → head-to-head → points-for → name`.
- **Head-to-head is computed only among teams that are otherwise fully tied** (equal W, Pts, PD), as a mini-table of just their matches. Do not apply H2H across non-tied teams.

### Double elimination — `buildBracket(seedIds)` + `resolveBracket(struct, results)`

- Seeds = Day 1 league order (`rankTeams`). Padded to the next power of two with **byes for the top seeds**.
- Winners bracket + losers bracket (alternating minor/major rounds; WB losers drop in with a reversal to delay rematches) + grand final + **bracket reset** (if the losers' champion wins the first final).
- `buildBracket` produces a **static structure** of match nodes with source pointers (`a`/`b` = `{kind:'seed'|'win'|'lose', …}`) plus a `stage` and `stageLabel` per match. Stages **interleave winners/losers brackets** so teams aren't scheduled back-to-back.
- `resolveBracket(struct, results)` is **pure**: it recomputes every slot's team from `bracketResults` on each call, auto-resolves byes, and returns `{ byId, champion }`. Re-running it is the only "advancement" mechanism — there is no mutable bracket state.
- Edge case handled: **2 teams** (no losers bracket → grand final pulls the WB-final loser).
- **When editing a bracket result, downstream (later-stage) results are cleared** (`editBracketResult`) so advancement can't go stale.

## Data model

```js
config  = { name, courts, matchMinutes, maxPoints, startTime, winPoints, drawPoints, blockSize }
team    = { id, name, group }
match   = { id, phase:'rr', group, round, slot, court, teamA, teamB, scoreA, scoreB, done }
bracket = { matches:[{ id, bracket:'W'|'L'|'GF', round, pos, stage, stageLabel, a, b }], P, N, d, lbRounds, seedIds }
bracketResults = { [matchId]: { a, b } }   // entered scores only; teams are derived
```

Backups: **Export/Import JSON** (Setup tab) captures the whole tournament; this is the reliable cross-machine path. Team upload accepts `.xlsx`/`.xls` (when SheetJS is available) or `.csv`/`.txt`, and skips a header row.

## Testing (no test runner — use Node smoke tests)

There is no framework, so validate with Node before shipping:

1. **Syntax:** extract the inline `<script>` and run `node --check` on it.
2. **Render smoke test:** stub a minimal DOM + `localStorage`, seed a fixture built with the *real* logic functions, then render every admin tab and the viewer (Day 1 and Day 2 fixtures) and assert no exception is thrown.
3. **Bracket integrity:** simulate full playthroughs of `buildBracket` + `resolveBracket` for many team counts (2, 3, 5, 7, 8, 11, 16, 21, 32…), auto-deciding each ready match, and assert a **single champion** always emerges with the expected match count (`2·P − 1`).

These caught real bugs before (single-court scheduling, the 2-team bracket stall, a dropped CSS opener). Re-run them after any change to logic or rendering.

## Gotchas / conventions

- Keep logic + base CSS **in sync between the `.html` and `.jsx`**.
- Don't add features that require the network for core flows; guard optional ones.
- Preserve the **input-without-re-render** pattern for controlled fields.
- Don't fully re-render the Day 2 viewer every tick (flicker + scroll reset); gate on `dataSig()`.
- Viewer must never call `persist()` / write state.
- **Referee, live in-progress score, and a real match timer are not in the data model yet.** The viewer infers "live" from the current slot/stage and shows `—` placeholders for referee. If these become real, add them to the `match` objects and the admin side first, then surface them in the viewer.

## Roadmap / known follow-ups

- Day 2 viewer is being upgraded to a full bracket layout (winners/losers columns with connectors, grand-final hero, side info panel). Those edits are staged but not yet assembled into the shipped `.html`.
- Possible future work discussed: upper/lower split into two brackets + trophies; referee assignment with conflict checks; fixed Day 2 clock-time scheduling.
