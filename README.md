# ELO 2026 (un)supervised — Conference Website

Portal and schedule tool for the [ELO (un)supervised 2026](https://stars.library.ucf.edu/elo2026/) conference, fully online July 15–18, 2026, hosted by the University of Central Florida.

## What the site is

**`index.html`** — Landing page portal. Presents a live countdown to the conference start, a registration CTA, and cards linking to all major conference destinations: the full schedule, STARS track collections, the exhibition, and about/logistics pages. The CFP card is archived (submissions closed).

**`schedule.html`** — Time-zone schedule tool. Loads every event from `data/events.json` and renders them in the visitor's local time zone, with a dropdown to switch zones. Built on `js/schedule-core.js` (pure functions) and `js/schedule-page.js` (DOM rendering).

**`sketch.js`** — p5.js particle/lightning backdrop that runs behind both pages. Respects `prefers-reduced-motion: reduce` by rendering one static frame and stopping the animation loop.

## Data pipeline

Event data is fetched from the UCF STARS RSS feed and stored in `data/events.json`.

- **Script:** `scripts/fetch_schedule.py` — fetches the RSS feed, parses events, converts all times to UTC, and writes `data/events.json`.
- **GitHub Action:** `.github/workflows/` runs the fetch script on a 6-hour schedule to keep data current.
- **Time convention:** All times in `data/events.json` are stored as UTC ISO-8601 strings. The conference runs Eastern Time (America/New_York, UTC-4 in July). See `js/schedule-core.js` for the canonical zone handling.

## Running tests

### Python (data pipeline)

```bash
python -m unittest tests.test_fetch_schedule -v
```

### JavaScript (schedule logic + countdown)

Run from the repo root — do **not** pass a directory argument:

```bash
node --test
```

Expects 11 passing tests: 7 from `tests/schedule-core.test.js` and 4 from `tests/countdown.test.js`.

## Local development server

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` for the portal or `http://localhost:8000/schedule.html` for the schedule tool.

## Deployment

The site deploys to GitHub Pages from the `main` branch. Push changes and the static files are served at the repository's Pages URL.

## License

All rights reserved for ELO 2026 conference materials.
