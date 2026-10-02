import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  getBusinessForUser,
  requireQuoteFlowUser,
  seedSystemTemplates,
} from '@/lib/quote-flow-session';

const onboardingSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  currency: z.string().default('USD'),
  currencySymbol: z.string().default('$'),
  defaultTaxRate: z.number().min(0).max(100).default(0),
});

export async function GET(req: Request) {
  try {
    const user = await requireQuoteFlowUser(req);
    const business = await getBusinessForUser(user.id);
    return NextResponse.json({ business });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireQuoteFlowUser(req);
    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const existing = await getBusinessForUser(user.id);
    if (existing) {
      const updated = await db.aiBusiness.update({
        where: { id: existing.id },
        data: parsed.data,
      });
      return NextResponse.json({ business: updated });
    }
    const business = await db.aiBusiness.create({
      data: {
        ownerId: user.id,
        tenantId: user.tenantId,
        ...parsed.data,
      },
    });
    await seedSystemTemplates(business.id);
    return NextResponse.json({ business });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export { POST as PATCH };
