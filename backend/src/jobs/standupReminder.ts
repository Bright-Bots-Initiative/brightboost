/**
 * Daily standup Slack reminder.
 *
 * TODO: The Bright Boost backend has no cron/scheduler in place today, so this
 * function is not wired to run automatically. Two options when we need it:
 *
 *   1) Use a Slack Workflow (easiest) — configure a scheduled workflow in the
 *      Slack UI to post this prompt at 9:30 AM CT weekdays. No code runs here.
 *
 *   2) Add a cron system (node-cron / Railway cron / GitHub Actions hitting an
 *      authenticated endpoint) and call `postStandupReminder()` below.
 *
 * For now this module exists so the function is importable once a scheduler lands.
 */
import { notifySlack } from "../utils/slack";

export function postStandupReminder(): Promise<void> {
  return notifySlack(
    "#standup",
    [
      "☀️ Good morning team! Drop your standup in this thread:",
      "",
      "🟢 What I did yesterday",
      "🔵 What I'm doing today",
      "🔴 Any blockers?",
    ].join("\n"),
  );
}
