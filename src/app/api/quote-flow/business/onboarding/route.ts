import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowUser, getBusinessForUser, getOrCreateBusinessForUser } from '@/lib/quote-flow-session';

const onboardingSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
  currency: z.string().default('USD'),
  currencySymbol: z.string().default('$'),
  defaultTaxRate: z.number().min(0).max(100).default(0),
});

export async function GET(req: Request) {
  try {
    const user = await requireQuoteFlowUser(req);
    const business = await getOrCreateBusinessForUser(user.id, user.tenantId, user.name ? `${user.name}'s Business` : 'My Business');
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
        data: {
          name: parsed.data.name,
          ownerName: parsed.data.ownerName,
          phone: parsed.data.phone,
          email: parsed.data.email,
          address: parsed.data.address,
          currency: parsed.data.currency,
          currencySymbol: parsed.data.currencySymbol,
          defaultTaxRate: parsed.data.defaultTaxRate,
        },
      });
      return NextResponse.json({ business: updated });
    }
    const business = await getOrCreateBusinessForUser(user.id, user.tenantId, parsed.data.name);
    const updated = await db.aiBusiness.update({
      where: { id: business.id },
      data: parsed.data,
    });
    return NextResponse.json({ business: updated });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
