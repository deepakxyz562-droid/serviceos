/**
 * User Cascade Hard-Delete Helper
 * =================================
 *
 * Permanently deletes a User account AND every record that references it,
 * either directly (via FK to User.id) or indirectly (via Employee.userId →
 * Employee.id and its dependents).
 *
 * Why this exists:
 *   Prisma FK relations on User use `onDelete: SetNull` (for some) and the
 *   default `Restrict` (for others). On a direct PostgreSQL connection
 *   (Prisma), Restrict means the delete FAILS until you manually clean up
 *   the referencing rows. On the Supabase REST adapter (PostgREST), FK
 *   constraints may or may not be enforced at the DB level depending on
 *   whether the schema was applied with `prisma db push` (which DOES create
 *   FKs) or migrated manually (which may not).
 *
 *   This helper guarantees a hard delete in BOTH environments by explicitly
 *   cleaning up every known reference before deleting the User row.
 *
 * Strategy:
 *   1. Find all Employee rows linked via Employee.userId
 *   2. For each Employee, cascade through its dependents:
 *        - Set NULL on nullable FKs (Invoice.employeeId, Expense.employeeId, etc.)
 *        - DELETE on required FKs (EmployeeShift, JobTimeEntry, GPSLocation, ...)
 *   3. Delete the Employee row
 *   4. Clean up all direct User references (ApiKey, Notification, AuditLog, etc.)
 *   5. Clean up all indirect "string userId" references (JobPhoto.capturedBy,
 *      CustomerTimelineEntry.actorId, NotificationPreference.userId, etc.)
 *   6. Delete the User row
 *
 * Every step is wrapped in try/catch so a missing table or a row that
 * violates some unexpected constraint does NOT block the rest of the
 * cleanup. We log every step and return a detailed report.
 */

import { db } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export interface CascadeDeleteReport {
  userId: string;
  userEmail: string | null;
  success: boolean;
  error?: string;
  employeesDeleted: number;
  steps: { step: string; affected: number; skipped?: boolean; error?: string }[];
}

/**
 * Helper: safely run a deleteMany and return count.
 * Catches errors so a missing/broken table doesn't abort the whole cascade.
 */
async function safeDeleteMany(
  prisma: PrismaClient,
  modelName: keyof PrismaClient | string,
  where: Record<string, unknown>,
  report: CascadeDeleteReport['steps'],
  stepLabel: string
): Promise<number> {
  try {
    // @ts-expect-error — dynamic model access on Prisma client
    const result = await (prisma as any)[modelName]?.deleteMany({ where });
    const count = result?.count ?? 0;
    report.push({ step: stepLabel, affected: count });
    return count;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report.push({ step: stepLabel, affected: 0, skipped: true, error: msg });
    return 0;
  }
}

/**
 * Helper: safely run an updateMany that sets a column to NULL.
 */
async function safeSetNull(
  prisma: PrismaClient,
  modelName: keyof PrismaClient | string,
  where: Record<string, unknown>,
  setField: string,
  report: CascadeDeleteReport['steps'],
  stepLabel: string
): Promise<number> {
  try {
    // @ts-expect-error — dynamic model access
    const result = await (prisma as any)[modelName]?.updateMany({
      where,
      data: { [setField]: null },
    });
    const count = result?.count ?? 0;
    report.push({ step: stepLabel, affected: count });
    return count;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report.push({ step: stepLabel, affected: 0, skipped: true, error: msg });
    return 0;
  }
}

/**
 * Hard-delete a user and cascade through all dependents.
 *
 * @param userId  The User.id to delete
 * @returns A detailed report of what was deleted
 */
export async function hardDeleteUser(userId: string): Promise<CascadeDeleteReport> {
  const report: CascadeDeleteReport = {
    userId,
    userEmail: null,
    success: false,
    employeesDeleted: 0,
    steps: [],
  };

  // ── 0. Load the user (so we can report email + verify it exists) ──────────
  let user: any;
  try {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isSuperAdmin: true, tenantId: true },
    });
    if (!user) {
      report.error = `User not found: ${userId}`;
      report.steps.push({ step: 'Load user', affected: 0, skipped: true, error: 'Not found' });
      return report;
    }
    report.userEmail = user.email;
    report.steps.push({ step: 'Load user', affected: 1 });
  } catch (err) {
    report.error = `Failed to load user: ${err instanceof Error ? err.message : String(err)}`;
    report.steps.push({ step: 'Load user', affected: 0, skipped: true, error: report.error });
    return report;
  }

  // Guard: refuse to delete super admins (footgun prevention)
  if (user.isSuperAdmin) {
    report.error = 'Refusing to delete super admin account. Demote the user first.';
    report.steps.push({
      step: 'Super-admin guard',
      affected: 0,
      skipped: true,
      error: report.error,
    });
    return report;
  }

  // ── 1. Find linked Employees ──────────────────────────────────────────────
  let employees: any[] = [];
  try {
    employees = (await db.employee.findMany({
      where: { userId },
      select: { id: true, userId: true },
    })) as any[];
    report.steps.push({ step: 'Find linked Employees', affected: employees.length });
  } catch (err) {
    report.steps.push({
      step: 'Find linked Employees',
      affected: 0,
      skipped: true,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── 2. Cascade through each Employee's dependents ─────────────────────────
  for (const emp of employees) {
    const empId = emp.id;
    const empLabel = `Employee ${empId.substring(0, 8)}…`;

    // Required FK to Employee — DELETE
    await safeDeleteMany(db, 'employeeStatusLog', { employeeId: empId }, report.steps, `${empLabel}: delete EmployeeStatusLog`);
    await safeDeleteMany(db, 'employeeShift', { employeeId: empId }, report.steps, `${empLabel}: delete EmployeeShift`);
    await safeDeleteMany(db, 'jobTimeEntry', { employeeId: empId }, report.steps, `${empLabel}: delete JobTimeEntry`);
    await safeDeleteMany(db, 'gpsLocation', { employeeId: empId }, report.steps, `${empLabel}: delete GPSLocation`);
    await safeDeleteMany(db, 'routeHistory', { employeeId: empId }, report.steps, `${empLabel}: delete RouteHistory`);
    await safeDeleteMany(db, 'employeePerformance', { employeeId: empId }, report.steps, `${empLabel}: delete EmployeePerformance`);

    // Nullable FK to Employee — either DELETE or SET NULL depending on whether
    // the row is meaningful without the employee. We DELETE child rows that
    // are pure links/logs (NotificationLog, Invitation), and SET NULL on rows
    // that represent business history (Invoice, Expense, Review, Booking, Document).
    await safeSetNull(db, 'invoice', { employeeId: empId }, 'employeeId', report.steps, `${empLabel}: null Invoice.employeeId`);
    await safeSetNull(db, 'expense', { employeeId: empId }, 'employeeId', report.steps, `${empLabel}: null Expense.employeeId`);
    await safeSetNull(db, 'review', { employeeId: empId }, 'employeeId', report.steps, `${empLabel}: null Review.employeeId`);
    await safeSetNull(db, 'booking', { employeeId: empId }, 'employeeId', report.steps, `${empLabel}: null Booking.employeeId`);
    await safeSetNull(db, 'document', { employeeId: empId }, 'employeeId', report.steps, `${empLabel}: null Document.employeeId`);
    await safeSetNull(db, 'notificationLog', { employeeId: empId }, 'employeeId', report.steps, `${empLabel}: null NotificationLog.employeeId`);
    await safeSetNull(db, 'contactListEntry', { employeeId: empId }, 'employeeId', report.steps, `${empLabel}: null ContactListEntry.employeeId`);
    await safeSetNull(db, 'job', { assigneeId: empId }, 'assigneeId', report.steps, `${empLabel}: null Job.assigneeId`);

    // Invitation has onDelete: Cascade in schema — delete explicitly for Supabase-REST parity
    await safeDeleteMany(db, 'invitation', { employeeId: empId }, report.steps, `${empLabel}: delete Invitation`);
  }

  // ── 3. Delete the Employee rows themselves ─────────────────────────────────
  if (employees.length > 0) {
    const empDeleted = await safeDeleteMany(
      db,
      'employee',
      { userId },
      report.steps,
      'Delete Employees linked to user'
    );
    report.employeesDeleted = empDeleted;
  }

  // ── 4. Clean up DIRECT User FK relations ───────────────────────────────────
  // ApiKey.userId is required → DELETE
  await safeDeleteMany(db, 'apiKey', { userId }, report.steps, 'Delete ApiKey rows');

  // Notification.userId nullable → SET NULL
  await safeSetNull(db, 'notification', { userId }, 'userId', report.steps, 'Null Notification.userId');

  // AuditLog.userId nullable → SET NULL (preserve audit trail)
  await safeSetNull(db, 'auditLog', { userId }, 'userId', report.steps, 'Null AuditLog.userId');

  // Credential.userId has onDelete: SetNull — set explicitly for Supabase-REST parity
  await safeSetNull(db, 'credential', { userId }, 'userId', report.steps, 'Null Credential.userId');

  // Invitation.invitedById has onDelete: SetNull — set explicitly
  await safeSetNull(db, 'invitation', { invitedById: userId }, 'invitedById', report.steps, 'Null Invitation.invitedById');

  // Workflow.createdById has onDelete: SetNull — set explicitly
  await safeSetNull(db, 'workflow', { createdById: userId }, 'createdById', report.steps, 'Null Workflow.createdById');

  // EmployeeStatusLog.changedById nullable → SET NULL
  await safeSetNull(db, 'employeeStatusLog', { changedById: userId }, 'changedById', report.steps, 'Null EmployeeStatusLog.changedById');

  // ── 5. Clean up INDIRECT "string userId" references ─────────────────────────
  // These are columns that store a User.id but don't have a Prisma @relation,
  // so FK constraints are NOT enforced (no cascade). We must clean up manually.

  // Required string userId → DELETE
  await safeDeleteMany(db, 'notificationPreference', { userId }, report.steps, 'Delete NotificationPreference');
  await safeDeleteMany(db, 'pushSubscription', { userId }, report.steps, 'Delete PushSubscription');
  await safeDeleteMany(db, 'agentMonitor', { agentId: userId }, report.steps, 'Delete AgentMonitor');
  await safeDeleteMany(db, 'conversationAssignment', { agentId: userId }, report.steps, 'Delete ConversationAssignment');

  // Nullable string userId → SET NULL
  await safeSetNull(db, 'inboxMessage', { senderId: userId }, 'senderId', report.steps, 'Null InboxMessage.senderId');
  await safeSetNull(db, 'deal', { assigneeId: userId }, 'assigneeId', report.steps, 'Null Deal.assigneeId');
  await safeSetNull(db, 'securityEvent', { userId }, 'userId', report.steps, 'Null SecurityEvent.userId');
  await safeSetNull(db, 'auditLogEntry', { userId }, 'userId', report.steps, 'Null AuditLogEntry.userId');
  await safeSetNull(db, 'offlineMutation', { userId }, 'userId', report.steps, 'Null OfflineMutation.userId');
  await safeSetNull(db, 'customerTimelineEntry', { actorId: userId }, 'actorId', report.steps, 'Null CustomerTimelineEntry.actorId');
  await safeSetNull(db, 'jobPhoto', { capturedBy: userId }, 'capturedBy', report.steps, 'Null JobPhoto.capturedBy');
  await safeSetNull(db, 'branch', { managerId: userId }, 'managerId', report.steps, 'Null Branch.managerId');
  await safeSetNull(db, 'qualityInspection', { resolvedById: userId }, 'resolvedById', report.steps, 'Null QualityInspection.resolvedById');
  await safeSetNull(db, 'requestExtraction', { approvedById: userId }, 'approvedById', report.steps, 'Null RequestExtraction.approvedById');
  await safeSetNull(db, 'purchaseOrder', { approvedById: userId }, 'approvedById', report.steps, 'Null PurchaseOrder.approvedById');
  await safeSetNull(db, 'warrantyClaim', { resolvedById: userId }, 'resolvedById', report.steps, 'Null WarrantyClaim.resolvedById');
  await safeSetNull(db, 'expense', { approvedById: userId }, 'approvedById', report.steps, 'Null Expense.approvedById');
  await safeSetNull(db, 'supportTicket', { assigneeId: userId }, 'assigneeId', report.steps, 'Null SupportTicket.assigneeId');
  await safeSetNull(db, 'timelineEvent', { actorId: userId }, 'actorId', report.steps, 'Null TimelineEvent.actorId');
  await safeSetNull(db, 'unifiedMessage', { senderId: userId }, 'senderId', report.steps, 'Null UnifiedMessage.senderId');
  await safeSetNull(db, 'appNotification', { senderId: userId }, 'senderId', report.steps, 'Null AppNotification.senderId');
  await safeSetNull(db, 'activityLog', { actorId: userId }, 'actorId', report.steps, 'Null ActivityLog.actorId');

  // ── 6. Finally, delete the User ──────────────────────────────────────────────
  try {
    await db.user.delete({ where: { id: userId } });
    report.steps.push({ step: 'Delete User row', affected: 1 });
    report.success = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report.error = `Failed to delete user row after cascade: ${msg}`;
    report.steps.push({ step: 'Delete User row', affected: 0, skipped: true, error: msg });
    // Even if the user row couldn't be deleted (e.g., some unknown FK still
    // blocks it), we've already nuked everything we could — report the error
    // but don't throw, so the API route can return a meaningful response.
  }

  return report;
}
