import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { requireQuoteFlowBusiness, formatCurrency } from '@/lib/quote-flow-session';

const inputSchema = z.object({
  quoteId: z.string().optional(),
  invoiceId: z.string().optional(),
  channel: z.enum(['whatsapp', 'email', 'text', 'share']).default('whatsapp'),
});

const SYSTEM_PROMPT = `You write short, warm, professional messages that accompany a quote or invoice sent to a client.

Rules:
- Output ONLY the final message text (no markdown, no quotes, no commentary).
- Tone: warm, courteous, and professional. Use the recipient's first name if available.
- Explicitly mention the document type (Quote or Invoice), the total amount, and clear next steps / call-to-action.
- WhatsApp / Text: keep concise (under 75 words), easy to read on mobile.
- Email: include subject line on the very first line prefixed with "Subject: ", followed by a clean 2-3 sentence email body.
- Never invent prices, numbers, or details that are not provided.
- Do not append any generic placeholders or brackets like "[Your Name]".`;

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let doc: any = null;
    let kind: 'quote' | 'invoice' = 'quote';

    if (parsed.data.quoteId) {
      doc = await db.aiQuote.findFirst({
        where: { id: parsed.data.quoteId, businessId: business.id },
        include: { customer: true, items: true },
      });
      kind = 'quote';
    } else if (parsed.data.invoiceId) {
      doc = await db.aiInvoice.findFirst({
        where: { id: parsed.data.invoiceId, businessId: business.id },
        include: { customer: true, items: true, payments: true },
      });
      kind = 'invoice';
    }

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const subtotal = doc.items.reduce((s: number, i: any) => s + (i.qty || 1) * (i.unitPrice || 0), 0);
    const discount =
      doc.discountType === 'PERCENT'
        ? (subtotal * (doc.discountValue || 0)) / 100
        : Math.min(doc.discountValue || 0, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const total = taxable + (taxable * (doc.taxRate || 0)) / 100;

    const formattedTotal = formatCurrency(total, business.currency, business.currencySymbol);

    const contextPrompt = `Business: ${business.name}
Business Owner: ${business.ownerName || 'The Team'}
Customer: ${doc.customer?.name || 'Valued Customer'}
Document: ${kind.toUpperCase()} #${doc.number}
Total Amount: ${formattedTotal}
Channel: ${parsed.data.channel}
Valid Until / Due Date: ${doc.validUntil || doc.dueDate ? new Date(doc.validUntil || doc.dueDate).toLocaleDateString() : 'Upon receipt'}

Write the message for ${parsed.data.channel} now.`;

    const aiRes = await callAI({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: contextPrompt },
      ],
      preferredModel: 'gpt-4o-mini',
      temperature: 0.3,
    });

    const message = aiRes.content.trim().replace(/^"|"$/g, '');
    return NextResponse.json({ message, channel: parsed.data.channel });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Failed to generate customer message' }, { status: 500 });
  }
}
