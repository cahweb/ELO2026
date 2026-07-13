import test from "node:test";
import assert from "node:assert/strict";
import {
  detectTimeZone,
  formatTimeRange,
  formatDayLabel,
  dayKey,
  groupEventsByDay,
  groupEventsIntoSessions,
  sessionHeading,
  zoneLabel,
} from "../js/schedule-core.js";

// Jul 18 keynote: 1:00-2:00 PM Eastern stored as UTC
const KEYNOTE = { title: "Keynote", start: "2026-07-18T17:00:00Z", end: "2026-07-18T18:00:00Z" };
// Jul 15 welcome: 12:30-12:45 PM Eastern
const WELCOME = { title: "Welcome", start: "2026-07-15T16:30:00Z", end: "2026-07-15T16:45:00Z" };

test("keynote renders as conference time in Eastern", () => {
  assert.equal(formatTimeRange(KEYNOTE.start, KEYNOTE.end, "America/New_York"), "1:00 PM – 2:00 PM");
});

test("keynote converts to London evening", () => {
  assert.equal(formatTimeRange(KEYNOTE.start, KEYNOTE.end, "Europe/London"), "6:00 PM – 7:00 PM");
});

test("keynote crosses the date line to Sunday in Sydney", () => {
  assert.equal(dayKey(KEYNOTE.start, "Australia/Sydney"), "2026-07-19");
  assert.equal(formatDayLabel(KEYNOTE.start, "Australia/Sydney"), "Sunday, July 19");
});

test("day labels stay Saturday in Eastern", () => {
  assert.equal(formatDayLabel(KEYNOTE.start, "America/New_York"), "Saturday, July 18");
});

test("grouping recomputes days per timezone", () => {
  const eastern = groupEventsByDay([KEYNOTE, WELCOME], "America/New_York");
  assert.deepEqual(eastern.map((g) => g.key), ["2026-07-15", "2026-07-18"]);
  assert.equal(eastern[0].events[0].title, "Welcome");

  const sydney = groupEventsByDay([KEYNOTE, WELCOME], "Australia/Sydney");
  assert.deepEqual(sydney.map((g) => g.key), ["2026-07-16", "2026-07-19"]);
});

test("detectTimeZone returns a non-empty IANA-looking string", () => {
  assert.match(detectTimeZone(), /^[A-Za-z]+/);
});

test("zoneLabel humanizes underscores", () => {
  assert.equal(zoneLabel("America/New_York"), "America / New York");
});

const SLOT = { start: "2026-07-15T18:15:00Z", end: "2026-07-15T19:15:00Z" };
const PAPER_A = { ...SLOT, title: "Zeta paper", track: "Algorithms & Imaginaries", type: "Individual Talk" };
const PAPER_B = { ...SLOT, title: "Alpha paper", track: "Algorithms & Imaginaries", type: "Individual Talk" };
const PARALLEL_WORKSHOP = { ...SLOT, title: "Workshop", track: "Hypertexts & Fictions", type: "Workshop" };
const LATER_PANEL = {
  title: "Panel", track: "Algorithms & Imaginaries", type: "Panel",
  start: "2026-07-15T19:30:00Z", end: "2026-07-15T20:30:00Z",
};

test("events sharing a slot, track, and type merge into one session", () => {
  const sessions = groupEventsIntoSessions([LATER_PANEL, PAPER_A, PARALLEL_WORKSHOP, PAPER_B]);
  assert.deepEqual(
    sessions.map((s) => [s.type, s.events.length]),
    [["Individual Talk", 2], ["Workshop", 1], ["Panel", 1]]
  );
  // papers within a session are alphabetized
  assert.deepEqual(sessions[0].events.map((e) => e.title), ["Alpha paper", "Zeta paper"]);
});

test("sessionHeading describes paper and performance sessions", () => {
  assert.deepEqual(sessionHeading("Individual Talk"), {
    heading: "Individual Paper Session",
    description: "3–4 papers, 10–12 minutes each",
  });
  assert.deepEqual(sessionHeading("Performance"), {
    heading: "Performance Session",
    description: "Performances of 10–15 minutes each",
  });
  assert.equal(sessionHeading("Plenary").heading, "Plenary");
  assert.equal(sessionHeading("").heading, "Session");
  assert.equal(sessionHeading("Birds of a Feather").heading, "Birds of a Feather");
});
