import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';

const DIRECTIONS = ['INCOMING', 'OUTGOING'] as const;
const STATUSES = ['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'] as const;

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/commerce/cheques
 * List the business's cheque register with an optional `status` filter
 * (PENDING | CLEARED | BOUNCED | CANCELLED) plus per-status counts.
 */
export async function GET(req: NextRequest) {
  try {
    const business = await ownerBusiness(req);
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status')?.toUpperCase().trim();
    const directionParam = searchParams.get('direction')?.toUpperCase().trim();

    const all = await db.aiCheque.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });

    // Summary is always computed over the WHOLE register (never the filtered subset).
    const counts = { PENDING: 0, CLEARED: 0, BOUNCED: 0, CANCELLED: 0 };
    let incomingPending = 0;
    let outgoingPending = 0;
    for (const chq of all) {
      if (chq.status in counts) counts[chq.status as keyof typeof counts] += 1;
      if (chq.status === 'PENDING') {
        if (chq.direction === 'INCOMING') incomingPending += chq.amount;
        else outgoingPending += chq.amount;
      }
    }

    const cheques = all.filter((chq) => {
      if (statusParam && STATUSES.includes(statusParam as (typeof STATUSES)[number]) && chq.status !== statusParam) return false;
      if (directionParam && DIRECTIONS.includes(directionParam as (typeof DIRECTIONS)[number]) && chq.direction !== directionParam) return false;
      return true;
    });

    return NextResponse.json({
      cheques: cheques.map((chq) => ({
        id: chq.id,
        direction: chq.direction,
        partyName: chq.partyName,
        amount: chq.amount,
        chequeNumber: chq.chequeNumber,
        bankName: chq.bankName || '',
        issueDate: chq.issueDate,
        dueDate: chq.dueDate,
        status: chq.status,
        notes: chq.notes || '',
        createdAt: chq.createdAt,
      })),
      summary: {
        total: cheques.length,
        byStatus: counts,
        incomingPendingAmount: Math.round(incomingPending * 100) / 100,
        outgoingPendingAmount: Math.round(outgoingPending * 100) / 100,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[commerce/cheques] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not load cheques.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}

/**
 * POST /api/commerce/cheques
 * Record a new cheque (received or issued). Starts in PENDING; balance
 * effects only happen on CLEARED transitions via PATCH.
 */
export async function POST(req: NextRequest) {
  try {
    const business = await ownerBusiness(req);
    const body = await req.json().catch(() => null);

    if (!body || typeof body.partyName !== 'string' || !body.partyName.trim()) {
      return NextResponse.json({ error: 'Party name is required.' }, { status: 400 });
    }
    if (typeof body.chequeNumber !== 'string' || !body.chequeNumber.trim()) {
      return NextResponse.json({ error: 'Cheque number is required.' }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Enter a cheque amount greater than zero.' }, { status: 400 });
    }

    const direction = typeof body.direction === 'string' && DIRECTIONS.includes(body.direction.toUpperCase() as (typeof DIRECTIONS)[number])
      ? body.direction.toUpperCase()
      : 'INCOMING';
    const issueDate = parseDate(body.issueDate) || new Date();
    const dueDate = parseDate(body.dueDate);
    const bankName = typeof body.bankName === 'string' && body.bankName.trim() ? body.bankName.trim() : null;
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

    const cheque = await db.aiCheque.create({
      data: {
        businessId: business.id,
        direction,
        partyName: body.partyName.trim().slice(0, 160),
        amount: Math.round(amount * 100) / 100,
        chequeNumber: body.chequeNumber.trim().slice(0, 40),
        bankName,
        issueDate,
        dueDate,
        status: 'PENDING',
        notes,
      },
    });

    return NextResponse.json({ cheque }, { status: 201 });
  } catch (error) {
    console.error('[commerce/cheques] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not save cheque.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}
