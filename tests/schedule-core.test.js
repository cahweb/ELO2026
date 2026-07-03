import test from "node:test";
import assert from "node:assert/strict";
import {
  detectTimeZone,
  formatTimeRange,
  formatDayLabel,
  dayKey,
  groupEventsByDay,
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
