// Conference countdown for the landing page hero.
// Instants are UTC: welcome remarks start Jul 15 2026 12:30 PM Eastern,
// awards ceremony wraps by 6:00 PM Eastern Jul 18.
export const CONFERENCE_START_MS = Date.parse("2026-07-15T16:30:00Z");
export const CONFERENCE_END_MS = Date.parse("2026-07-18T22:00:00Z");

const DAY_MS = 86_400_000;

export function countdownText(nowMs) {
  if (nowMs >= CONFERENCE_END_MS) {
    return "That's a wrap! Explore the conference archive on STARS.";
  }
  if (nowMs >= CONFERENCE_START_MS) {
    return "Happening now — join us online!";
  }
  const days = Math.ceil((CONFERENCE_START_MS - nowMs) / DAY_MS);
  return days === 1
    ? "1 day until the conference goes live!"
    : `${days} days until the conference goes live!`;
}

if (typeof document !== "undefined") {
  const el = document.getElementById("countdown");
  if (el) {
    const update = () => { el.textContent = countdownText(Date.now()); };
    update();
    setInterval(update, 60_000);
  }
}
