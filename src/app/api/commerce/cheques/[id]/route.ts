import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { auditAmountLabel, logCommerceActivity, resolveCommerceActor } from '@/lib/commerce/audit';

/**
 * Allowed status transitions and their effect on the default deposit account's
 * currentBalance (for a cheque of amount A):
 *   INCOMING cheque: CLEARED applies +A, reversal applies −A.
 *   OUTGOING cheque: CLEARED applies −A, reversal applies +A.
 * BOUNCED / CANCELLED are balance-neutral by themselves; BOUNCED after CLEARED
 * reverses the earlier credit. Terminal CANCELLED can only be reopened.
 */
const TRANSITIONS: Record<string, { next: string[] }> = {
  PENDING: { next: ['CLEARED', 'BOUNCED', 'CANCELLED'] },
  CLEARED: { next: ['BOUNCED', 'PENDING'] }, // BOUNCED reverses; PENDING reverts the credit
  BOUNCED: { next: ['CLEARED', 'PENDING', 'CANCELLED'] },
  CANCELLED: { next: ['PENDING'] },
};

type Direction = 'INCOMING' | 'OUTGOING';

/** Resolve the business's default deposit account (isDefault first, then BANK, then CASH, then any active). */
async function resolveDefaultDepositAccount(businessId: string) {
  const accounts = await db.aiBankAccount.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  if (accounts.length === 0) return null;
  return (
    accounts.find((a) => a.isDefault && (a.type === 'BANK' || a.type === 'CASH')) ||
    accounts.find((a) => a.isDefault) ||
    accounts.find((a) => a.type === 'BANK') ||
    accounts.find((a) => a.type === 'CASH') ||
    accounts[0]
  );
}

/**
 * PATCH /api/commerce/cheques/[id]
 * Body: { status: 'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED', notes?: string }
 * Clearing/bouncing adjusts the linked default bank/cash account balance.
 * The status flip is guarded atomically (updateMany conditioned on the current
 * status) so double-transitions cannot double-apply balance effects.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const business = await ownerBusiness(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const nextStatus = typeof body.status === 'string' ? body.status.toUpperCase().trim() : '';
    if (!['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'].includes(nextStatus)) {
      return NextResponse.json({ error: 'Invalid cheque status.' }, { status: 400 });
    }

    const cheque = await db.aiCheque.findFirst({
      where: { id: String(id), businessId: business.id },
    });
    if (!cheque) {
      return NextResponse.json({ error: 'Cheque not found.' }, { status: 404 });
    }

    const currentStatus = cheque.status;
    if (currentStatus === nextStatus) {
      return NextResponse.json(
        { error: `Cheque is already ${nextStatus}.` },
        { status: 409 }
      );
    }
    const allowed = TRANSITIONS[currentStatus]?.next || [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Cannot move cheque from ${currentStatus} to ${nextStatus}.` },
        { status: 409 }
      );
    }

    const amount = Math.abs(Number(cheque.amount) || 0);
    const direction: Direction = cheque.direction === 'OUTGOING' ? 'OUTGOING' : 'INCOMING';

    // Balance delta for this transition (0 = neutral).
    let delta = 0;
    if (nextStatus === 'CLEARED') {
      delta = direction === 'INCOMING' ? amount : -amount;
    } else if (nextStatus === 'BOUNCED' && currentStatus === 'CLEARED') {
      delta = direction === 'INCOMING' ? -amount : amount; // reverse the earlier credit
    } else if (nextStatus === 'PENDING' && currentStatus === 'CLEARED') {
      delta = direction === 'INCOMING' ? -amount : amount; // revert the credit
    }

    const needsAccount = delta !== 0;
    const account = needsAccount ? await resolveDefaultDepositAccount(business.id) : null;
    if (needsAccount && !account) {
      return NextResponse.json(
        { error: 'Add a bank or cash account first — clearing needs an account to credit/debit.' },
        { status: 409 }
      );
    }

    const updated = await db.$transaction(async (tx) => {
      // Atomic guard: only flip when the row is still in the observed status.
      const flip = await tx.aiCheque.updateMany({
        where: { id: cheque.id, businessId: business.id, status: currentStatus },
        data: {
          status: nextStatus,
          ...(typeof body.notes === 'string' && body.notes.trim() ? { notes: body.notes.trim() } : {}),
        },
      });
      if (flip.count !== 1) {
        throw new Error('CHEQUE_STATE_CHANGED');
      }

      if (account && delta !== 0) {
        await tx.aiBankAccount.update({
          where: { id: account.id },
          data: { currentBalance: { increment: Math.round(delta * 100) / 100 } },
        });
      }

      return tx.aiCheque.findUnique({ where: { id: cheque.id } });
    });

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the status transition that just succeeded (logCommerceActivity
    // swallows). Includes the account adjustment when one was applied.
    const statusActor = await resolveCommerceActor(req);
    await logCommerceActivity({
      business,
      actorId: statusActor.actorId,
      actorName: statusActor.actorName,
      action: 'status_change',
      entityType: 'cheque',
      entityId: cheque.id,
      entityName: cheque.chequeNumber,
      description: `Cheque ${cheque.chequeNumber} (${cheque.direction}) ${currentStatus} → ${nextStatus}${account ? ` — ${account.name} adjusted by ${auditAmountLabel(business, delta)}` : ''}`,
      metadata: {
        chequeId: cheque.id,
        chequeNumber: cheque.chequeNumber,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        direction: cheque.direction,
        amount: cheque.amount,
        accountAdjusted: account ? { id: account.id, name: account.name, delta } : null,
      },
    });

    return NextResponse.json({
      success: true,
      cheque: updated,
      accountAdjusted: account ? { id: account.id, name: account.name, delta } : null,
    });
  } catch (error) {
    console.error('[commerce/cheques] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    if (message === 'CHEQUE_STATE_CHANGED') {
      return NextResponse.json(
        { error: 'Cheque status changed elsewhere. Refresh and try again.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Could not update cheque.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}

/**
 * DELETE /api/commerce/cheques/[id]
 * Only PENDING / CANCELLED cheques can be deleted (CLEARED/BOUNCED carry
 * ledger history and must stay for audit honesty).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const business = await ownerBusiness(req);
    const { id } = await ctx.params;

    // Pre-read for the audit trail (only PENDING/CANCELLED rows are deletable
    // — the deleteMany below still enforces that atomically).
    const existing = await db.aiCheque.findFirst({
      where: { id: String(id), businessId: business.id, status: { in: ['PENDING', 'CANCELLED'] } },
    });

    const deleted = await db.aiCheque.deleteMany({
      where: {
        id: String(id),
        businessId: business.id,
        status: { in: ['PENDING', 'CANCELLED'] },
      },
    });
    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Only pending or cancelled cheques can be deleted.' },
        { status: 409 }
      );
    }

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the deletion that already succeeded (logCommerceActivity swallows).
    const deleteActor = await resolveCommerceActor(req);
    await logCommerceActivity({
      business,
      actorId: deleteActor.actorId,
      actorName: deleteActor.actorName,
      action: 'delete',
      entityType: 'cheque',
      entityId: String(id),
      entityName: existing?.chequeNumber || String(id),
      description: `Cheque ${existing?.chequeNumber || String(id)}${existing ? ` (${existing.direction}, ${existing.partyName})` : ''} deleted`,
      metadata: {
        chequeId: String(id),
        chequeNumber: existing?.chequeNumber || null,
        direction: existing?.direction || null,
        partyName: existing?.partyName || null,
        amount: existing?.amount ?? null,
        status: existing?.status || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[commerce/cheques] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not delete cheque.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}
