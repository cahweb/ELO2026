import test from "node:test";
import assert from "node:assert/strict";
import { countdownText, CONFERENCE_START_MS, CONFERENCE_END_MS } from "../js/countdown.js";

const DAY = 86_400_000;

test("well before the conference: whole days remaining, ceiling", () => {
  assert.equal(countdownText(CONFERENCE_START_MS - 10 * DAY), "10 days until the conference goes live!");
});

test("a partial day still counts as a full day", () => {
  assert.equal(countdownText(CONFERENCE_START_MS - 1), "1 day until the conference goes live!");
});

test("during the conference", () => {
  assert.equal(countdownText(CONFERENCE_START_MS), "Happening now — join us online!");
  assert.equal(countdownText(CONFERENCE_END_MS - 1), "Happening now — join us online!");
});

test("after the conference", () => {
  assert.equal(countdownText(CONFERENCE_END_MS), "That's a wrap! Explore the conference archive on STARS.");
});
