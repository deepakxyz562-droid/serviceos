/**
 * Commerce audit trail (Phase 2A — BOS backend honesty infrastructure)
 * -------------------------------------------------------------------
 * Thin wrapper around the central `logActivity` helper specialised for the
 * money/banking commerce routes. Every successful money/banking operation
 * (payments, invoices, bank accounts, cheques, money entries, expenses,
 * customers) writes a real ActivityLog row so the BOS settings screen can
 * show an honest "who did what" trail via GET /api/commerce/audit-logs.
 */

import { logActivity } from '@/lib/activity-log';
import { getQuoteFlowUser } from '@/lib/quote-flow-session';

export interface CommerceAuditParams {
  /** The business the operation belongs to (from ownerBusiness / requireQuoteFlowBusiness). */
  business: { id: string; tenantId: string | null; name?: string | null };
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort actor resolution for commerce routes: returns the authenticated
 * user's id/name when accessible, or empty values for a system actor.
 * Never throws — an audit resolution failure must not break the request.
 */
export async function resolveCommerceActor(req: Request): Promise<{
  actorId?: string | null;
  actorName?: string | null;
}> {
  try {
    const user = await getQuoteFlowUser(req);
    if (!user) return {};
    return { actorId: user.id, actorName: user.name || user.email || null };
  } catch {
    return {};
  }
}

/**
 * Human-readable amount for audit descriptions, e.g. "₹2,000" / "$150".
 * Falls back to the ₹ symbol when the business carries no currency symbol.
 */
export function auditAmountLabel(
  business: { currencySymbol?: string | null; currency?: string | null },
  amount: number,
): string {
  const symbol = (business.currencySymbol || (business.currency === 'INR' ? '₹' : '') || '₹') as string;
  const value = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${value.toLocaleString('en-IN')}`;
}

/**
 * Fire-and-forget commerce audit log. Awaitable but SAFE: every failure is
 * swallowed so a logging problem can NEVER fail the underlying money/banking
 * operation. `logActivity` itself already swallows its own DB errors and
 * silently skips when tenantId is missing (businesses without a tenant are
 * logged under their own business id so single-tenant stores stay auditable).
 */
export async function logCommerceActivity(params: CommerceAuditParams): Promise<void> {
  try {
    await logActivity({
      tenantId: params.business.tenantId || params.business.id,
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      actorType: params.actorId ? 'user' : 'system',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      description: params.description,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : undefined,
      severity: 'info',
    });
  } catch {
    // Audit logging must NEVER fail the money operation — swallow silently.
  }
}
