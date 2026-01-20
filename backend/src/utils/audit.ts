import prisma from "./prisma";

/**
 * 🛡️ Sentinel: Audit Logging Utility
 *
 * Records sensitive actions to the database for security monitoring and compliance.
 * Logs include the actor (user), the action taken, and optional metadata.
 *
 * Design Choice:
 * - We use a "fail-open" strategy here (catch and log errors) to ensure that
 *   logging failures do not prevent legitimate user actions (like login) from completing.
 * - In highly regulated environments, a "fail-closed" strategy might be preferred.
 */
export async function logAudit(
  actorId: string | null,
  action: string,
  meta?: Record<string, any>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        meta: meta ? (meta as any) : undefined,
      },
    });
  } catch (error) {
    // Log the failure to the system console so it can be picked up by log aggregators
    console.error("🚨 AUDIT LOG FAILURE:", {
      action,
      actorId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
