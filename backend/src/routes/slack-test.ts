/**
 * TEMPORARY VERIFICATION ENDPOINT — remove after Slack confirmed working.
 *
 * Two endpoints:
 *   POST /api/slack-test/ping     — short ping to #deployments
 *   POST /api/slack-test/welcome  — full welcome message to #general
 *
 * Both are intentionally unauthenticated for ease of curl-from-anywhere
 * verification. This file must be deleted (and its import removed from
 * server.ts) once the webhook is confirmed working.
 *
 * Note on Slack's `channel` field: modern incoming-webhook URLs are tied
 * to a single channel at creation time, and the JSON `channel` field is
 * ignored by Slack — so both endpoints below land in whichever channel
 * the webhook was provisioned for, regardless of the target we pass.
 * Verify in that channel first; if you need messages in a different
 * channel, create a second webhook for it.
 */
import { Router } from "express";
import { notifySlack } from "../utils/slack";

const router = Router();

router.post("/api/slack-test/ping", async (_req, res) => {
  try {
    await notifySlack(
      "#deployments",
      "✅ Slack webhook verification ping from Bright Boost backend",
    );
    res.json({ status: "sent", target: "#deployments" });
  } catch (err) {
    res.status(500).json({ status: "failed", error: String(err) });
  }
});

router.post("/api/slack-test/welcome", async (_req, res) => {
  const welcomeMessage = `🎉 *Welcome to Bright Bots, Summer 2026 cohort!*

Today's the day. Really excited to have all six of you on board.

Quick orientation for Week 1:

*Today (Monday)*
• 9:00 AM CT — All-hands kickoff Zoom (check your calendar)
• Morning: intros, program overview, pod assignments
• Afternoon: pod breakouts, dev environment setup, first commits

*Your pods*

🛠️ *Build Pod* (lead: Alice)
• Alice Lin — Technical Frontend/Backend
• Jack Goetzmann — Gamification & Game Experience
• Olivia Jiang — Interactive Game Developer

🎨 *Experience Pod* (lead: Catarina)
• Catarina Lucas Herrera — UI/UX & Gamification
• Viet Tran — UI/UX Design
• Ronak Sharma — UX/UI & Website Experience

*Key channels*
• \`#general\` — team-wide announcements (here)
• \`#build-pod\` / \`#experience-pod\` — your pod home base
• \`#standup\` — daily async check-ins
• \`#help\` — stuck? ask here before spinning your wheels
• \`#wins\` — celebrate shipped features and test results
• \`#prompt-log\` — share Claude Code prompts and learnings
• \`#deployments\` / \`#experiments\` — automated feeds

*Program norms*
• Ask early, ask often. Help is faster than struggle.
• Log significant Claude Code prompts in the \`prompts/\` directory.
• PRs over direct pushes — \`CONTRIBUTING.md\` has the workflow.
• Every change ships with data. A/B tests aren't optional.

This week:
• Mon: kickoff + dev environment
• Tue–Wed: app audit + first PRs
• Thu: Claude Code training
• Fri: weekly review + pre-work audits presented

Drop a 👋 in this channel when you're online today. Let's build something real this summer.

— Nathaniel`;

  try {
    await notifySlack("#general", welcomeMessage);
    res.json({ status: "sent", target: "#general" });
  } catch (err) {
    res.status(500).json({ status: "failed", error: String(err) });
  }
});

export default router;
