/**
 * Mail utility — abstracts email delivery for password reset (and future use).
 *
 * Behavior by environment:
 *   - If SMTP_HOST is configured: sends via nodemailer (must be installed).
 *   - If SMTP_HOST is NOT configured:
 *       - development: logs full reset URL to console (safe for local dev).
 *       - production:  logs a warning (no token leaked) and skips delivery.
 *
 * To enable real email delivery:
 *   1. npm install nodemailer && npm install -D @types/nodemailer
 *   2. Set env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

const isProduction = process.env.NODE_ENV === "production";

async function sendViaSMTP(options: MailOptions): Promise<boolean> {
  try {
    // Dynamic require so the app doesn't crash if nodemailer isn't installed.
    // Install with: npm install nodemailer @types/nodemailer
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer") as {
      createTransport: (config: Record<string, unknown>) => {
        sendMail: (opts: Record<string, string>) => Promise<void>;
      };
    };
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transport.sendMail({
      from: process.env.MAIL_FROM || "noreply@brightboost.app",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`[MAIL] Sent to ${options.to} via SMTP`);
    return true;
  } catch (err) {
    console.error("[MAIL] SMTP send failed:", err);
    return false;
  }
}

export async function sendMail(options: MailOptions): Promise<void> {
  // If SMTP is configured, attempt real delivery
  if (process.env.SMTP_HOST) {
    const sent = await sendViaSMTP(options);
    if (sent) return;
    // Fall through to console fallback if SMTP failed
  }

  if (isProduction) {
    // In production without SMTP, warn but do NOT log email content (may contain tokens)
    console.warn(
      `[MAIL] No email provider configured. Email to ${options.to} was not delivered.`,
    );
  } else {
    // In development, log the full email for debugging
    console.log(`\n[MAIL] ─── Dev Mode Email ───`);
    console.log(`  To:      ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  Body:\n${options.html}`);
    console.log(`[MAIL] ────────────────────\n`);
  }
}

/**
 * Send a password reset email (or dev-mode console log).
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: "BrightBoost — Reset Your Password",
    html: [
      `<p>Hi,</p>`,
      `<p>We received a request to reset your BrightBoost password.</p>`,
      `<p><a href="${resetUrl}">Click here to reset your password</a></p>`,
      `<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
      `<p>— The BrightBoost Team</p>`,
    ].join("\n"),
  });
}
