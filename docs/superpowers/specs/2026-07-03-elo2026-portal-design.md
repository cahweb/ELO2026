# ELO 2026 Portal + Timezone Schedule — Design

**Date:** 2026-07-03
**Status:** Approved by Anastasia Salter (conference organizer)

## Purpose

Rebuild the ELO 2026 GitHub Pages site (currently a single-screen CFP-era landing
page) as a portal into the STARS conference repository
(https://stars.library.ucf.edu/elo2026/), and add a "view in any timezone"
schedule page driven by the STARS combined schedule.

The conference is fully online, July 15–18, 2026, hosted by UCF. Registration is
open (free for ELO members). The CFP phase is over; the site's job now is to route
attendees to the schedule, tracks, and registration.

## Decisions made with the user

1. **Schedule times are Eastern (America/New_York).** The RSS feed stamps
   `pubDate` as PDT (e.g., `Sat, 18 Jul 2026 13:00:00 PDT`) but this is a bepress
   server artifact — the wall-clock times entered in Digital Commons are UCF
   Eastern time. The keynote is really 1:00 PM EDT. All parsing treats STARS
   wall-clock times as America/New_York.
2. **Keep the neon p5.js visual identity** (dark background, pink/cyan glow,
   particle animation, existing logo) and extend it into a scrollable portal
   layout.
3. **Scope: the full schedule, not just the RSS feed.** The RSS feed
   (`combined_schedule/all/recent-events.rss`) contains only the 7 plenary-level
   events. Instead, scrape all ~112 sessions from
   `https://stars.library.ucf.edu/elo2026/combined_schedule/`, but do NOT
   duplicate session content — show title/time/presenters/track/type only and
   link each session to its STARS page. The 7 RSS plenaries get highlighted
   ("featured") styling.
4. **Separate `schedule.html` page** for the timezone tool, linked prominently
   from the portal landing page.

## Key constraint

STARS/Digital Commons sends **no CORS headers** (verified with an `Origin`
request), so browsers on GitHub Pages cannot fetch the RSS feed or schedule HTML
directly. Data must be fetched at build time.

## Architecture

Approach chosen: **build-time data pipeline** (over a client-side CORS proxy,
which is fragile third-party runtime dependency, and over hand-maintained JSON,
which drifts). Hand-maintained JSON is the implicit degraded mode: the committed
`events.json` keeps serving if STARS or the Action fails.

### Component 1: Scraper + GitHub Action

- `scripts/fetch_schedule.py` — fetches
  `https://stars.library.ucf.edu/elo2026/combined_schedule/`, parses the
  hCalendar microformat rows (verified present: `tr.vevent` containing
  `abbr.dtstart`/`abbr.dtend` with timestamps like `2026-07-15T123000`,
  `p.summary a` (title + STARS URL), `p.presenters`, `p.location` (track),
  `p.document_type` (Keynote/Plenary/etc.)).
- Also fetches the RSS feed to mark which events are "featured" (match by STARS
  URL).
- Dedupes sessions by STARS URL (the combined view repeats some rows).
- Converts wall-clock Eastern times to UTC ISO 8601 instants; output
  `data/events.json`:
  `{ generated: <iso>, events: [{ title, url, presenters, track, type, start, end, featured }] }`.
- Handles the page's charset correctly (observed mojibake risk with naive
  decoding).
- **Validation before commit:** parsed event count must exceed 50 and every
  event must have a title, URL, and valid start time; otherwise exit non-zero so
  the workflow fails visibly instead of committing garbage.
- `.github/workflows/fetch-schedule.yml` — runs every 6 hours + manual
  `workflow_dispatch`; commits `data/events.json` only when changed.

### Component 2: Portal landing page (`index.html` rebuild)

- Keeps p5.js particle backdrop (`sketch.js`) behind a scrollable page instead
  of a locked single screen.
- Hero: ELO 2026 logo, "July 15–18, 2026 · Fully Online · Hosted by UCF",
  registration call-to-action (free for ELO members), link to schedule page.
- Portal cards (neon-styled, linking to STARS):
  - Full Schedule → local `schedule.html` (primary card)
  - Tracks: Algorithms & Imaginaries, Hypertexts & Fictions, Narratives & Worlds
  - Exhibition
  - Registration
  - CFP (archive), Organizers & Committees, Logistics & Policies
- CFP-era messaging ("Submit Now — Portal Open Through February 28th") removed.
- Existing `cfp.html` remains as-is, reachable from the portal.

### Component 3: Timezone schedule page (`schedule.html`)

- Loads `data/events.json` (same-origin fetch; no CORS issue).
- Timezone selector: defaults to visitor's timezone via
  `Intl.DateTimeFormat().resolvedOptions().timeZone`; dropdown offers a curated
  world list plus an explicit "Conference time (US Eastern)" option.
- Vanilla JS conversion via `Intl.DateTimeFormat` with the `timeZone` option —
  no date libraries.
- Sessions grouped by day **computed in the selected timezone** (a Saturday
  8:30 PM Eastern event is Sunday in Melbourne; day headers must move).
- Each session row: converted time range, linked title (STARS page, new tab),
  presenters, track, session-type badge. Featured (RSS) plenaries visually
  highlighted. No abstracts — STARS is the source of truth.
- "Times last synced <date>" stamp from `events.json` `generated` field, plus a
  fallback link to the STARS combined schedule.

### Accessibility

Site must conform to UCF Policy 2-006 (WCAG 2.1 AA). Apply the
`ucf-accessible-html` skill during implementation: semantic heading structure,
labeled native `<select>` for the timezone dropdown, AA contrast on the neon
palette, keyboard operability, `prefers-reduced-motion` disables/reduces the
particle animation, visible focus styles.

## Error handling

- STARS outage / markup change → Action fails loudly; site keeps serving last
  good `events.json`.
- `events.json` fetch failure in browser → schedule page shows message with
  direct link to STARS schedule.
- Unknown/invalid timezone selection → falls back to Eastern.

## Testing

- Scraper: unit-test parsing against a saved fixture of the real
  `combined_schedule` HTML (count, field extraction, dedupe, Eastern→UTC
  conversion including the 12:30 PM welcome → 16:30Z check).
- Frontend conversion: unit-testable pure functions for grouping/formatting;
  manual spot-check that the July 18 keynote renders 1:00 PM in
  America/New_York, 10:00 AM in America/Los_Angeles, 6:00 PM in Europe/London,
  3:00 AM July 19 in Australia/Melbourne.
- Accessibility pass per ucf-accessible-html checklist.
