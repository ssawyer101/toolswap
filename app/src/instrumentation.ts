// Runs once when the server starts: checks for due-date reminders every 30 minutes.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_REMINDERS) return;
  const { runReminders } = await import("./lib/reminders");
  const tick = () => runReminders().catch((e) => console.error("Reminder run failed", e));
  setTimeout(tick, 15_000);
  setInterval(tick, 30 * 60_000);
}
