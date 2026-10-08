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
  logoUrl: z.string().optional().nullable(),

  // Bank transfer details (Phase 3)
  paymentCountry: z.string().optional().nullable(),
  paymentInstructions: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankIfsc: z.string().optional().nullable(),
  bankSwift: z.string().optional().nullable(),
  bankIban: z.string().optional().nullable(),
  bankRoutingNumber: z.string().optional().nullable(),
  bankSortCode: z.string().optional().nullable(),
  bankBsb: z.string().optional().nullable(),
  bankTransitNumber: z.string().optional().nullable(),
  bankInstitutionNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  bankAddress: z.string().optional().nullable(),

  // UPI + digital wallets (Phase 3)
  upiId: z.string().optional().nullable(),
  upiPayeeName: z.string().optional().nullable(),
  paypalHandle: z.string().optional().nullable(),
  venmoHandle: z.string().optional().nullable(),
  zelleIdentifier: z.string().optional().nullable(),
  cashappCashtag: z.string().optional().nullable(),
  wiseIban: z.string().optional().nullable(),

  // Visibility toggles
  showBankOnInvoice: z.boolean().optional(),
  showUpiOnInvoice: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireQuoteFlowUser(req);
    const business = await getBusinessForUser(user.id);
    return NextResponse.json({ business: business || null });
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

/**
 * PATCH /api/quote-flow/business/onboarding
 * Update business settings (name, logo, address, tax, currency, etc.).
 * Used by the SettingsScreen — previously this endpoint only had GET + POST,
 * so every "Save" from Settings returned 405 Method Not Allowed.
 */
export async function PATCH(req: Request) {
  try {
    const user = await requireQuoteFlowUser(req);
    const body = await req.json();
    // Use partial validation — the user may only be updating some fields.
    const partialSchema = onboardingSchema.partial();
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const existing = await getBusinessForUser(user.id);
    if (!existing) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    const updated = await db.aiBusiness.update({
      where: { id: existing.id },
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
