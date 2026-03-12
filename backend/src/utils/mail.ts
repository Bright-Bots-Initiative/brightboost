/**
 * Mail utility — abstracts email delivery for password reset (and future use).
 *
 * Behavior:
 *   - If SMTP_HOST is configured: sends real email via nodemailer.
 *   - If SMTP_HOST is NOT configured:
 *       - development: logs full reset URL to console (safe for local dev).
 *       - production:  logs a warning (no token leaked) and skips delivery.
 *
 * Required env vars for real delivery:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, MAIL_FROM
 */

import nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

const isProduction = process.env.NODE_ENV === "production";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendViaSMTP(options: MailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: process.env.MAIL_FROM || "BrightBoost <noreply@brightboost.app>",
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
  if (process.env.SMTP_HOST) {
    const sent = await sendViaSMTP(options);
    if (sent) return;
    // Fall through to console fallback if SMTP failed
  }

  if (isProduction) {
    console.warn(
      `[MAIL] No email provider configured. Email to ${options.to} was not delivered.`,
    );
  } else {
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
    subject: "BrightBoost — Password Reset Request",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 22px; color: #1e40af; margin: 0;">BrightBoost</h1>
          <p style="font-size: 13px; color: #64748b; margin: 4px 0 0;">K-8 STEM Learning Platform</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6;">Hi,</p>
        <p style="font-size: 15px; line-height: 1.6;">
          We received a request to reset your BrightBoost password.
          Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 32px; background-color: #1e40af; color: #ffffff; font-weight: bold; font-size: 15px; text-decoration: none; border-radius: 8px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset,
          you can safely ignore this email — your password will not change.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          BrightBoost &mdash; Bright Bots Initiative<br />
          This is an automated message. Please do not reply.
        </p>
      </div>
    `.trim(),
  });
}
