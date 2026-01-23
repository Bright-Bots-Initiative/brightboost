import prisma from "./prisma";

/**
 * 🛡️ Sentinel: Fail-open audit logging.
 *
 * Records sensitive actions (login, signup, profile updates) to the database.
 * If logging fails, it catches the error to prevent blocking the main user flow.
 */
export async function logAudit(
  action: string,
  actorId: string | null,
  meta?: any,
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        meta: meta || {},
      },
    });
  } catch (error) {
    // Fail-open: Log error but don't stop execution
    console.error(`[AUDIT FAILURE] Action: ${action}`, error);
  }
}
