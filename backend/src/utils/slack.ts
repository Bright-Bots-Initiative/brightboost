/**
 * Lightweight Slack notification helper.
 * Silently no-ops when SLACK_WEBHOOK_URL is unset, so the app runs fine without it.
 */
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function notifySlack(
  channel: string,
  message: string,
  blocks?: unknown[],
): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, text: message, blocks }),
    });
  } catch (err) {
    console.error("Slack notification failed:", err);
  }
}
