import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness, formatCurrency } from '@/lib/quote-flow-session';
import { callAI } from '@/lib/ai-client';
import { computeInvoiceTotals } from '@/lib/quote-flow-calc';

const reminderRequestSchema = z.object({
  docId: z.string(),
  docType: z.enum(['QUOTE', 'INVOICE']),
  tone: z.enum(['polite', 'standard', 'due_today', 'overdue', 'urgent']).default('polite'),
  customNote: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const parsed = reminderRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
    }

    const { docId, docType, tone, customNote } = parsed.data;

    let doc: any = null;
    let customer: any = null;
    let total = 0;
    let balanceDue = 0;
    let docNumber = '';
    let dueDateFormatted = 'Upon receipt';

    if (docType === 'QUOTE') {
      doc = await db.aiQuote.findFirst({
        where: { id: docId, businessId: business.id },
        include: { customer: true, items: true },
      });
      if (!doc) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      customer = doc.customer;
      docNumber = doc.number;
      const t = computeInvoiceTotals({
        items: doc.items.map((i: any) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        discountValue: doc.discountValue,
        discountType: doc.discountType,
        globalTaxRate: doc.taxRate,
      });
      total = t.total;
      balanceDue = total;
      if (doc.validUntil) {
        dueDateFormatted = new Date(doc.validUntil).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } else {
      doc = await db.aiInvoice.findFirst({
        where: { id: docId, businessId: business.id },
        include: { customer: true, items: true, payments: true },
      });
      if (!doc) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      customer = doc.customer;
      docNumber = doc.number;
      const t = computeInvoiceTotals({
        items: doc.items.map((i: any) => ({ qty: i.qty, unitPrice: i.unitPrice })),
        discountValue: doc.discountValue,
        discountType: doc.discountType,
        globalTaxRate: doc.taxRate,
      });
      total = t.total;
      const paid = doc.payments.reduce((s: number, p: any) => s + p.amount, 0);
      balanceDue = Math.max(0, total - paid);
      if (doc.dueDate) {
        dueDateFormatted = new Date(doc.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;
    const portalUrl = `${baseUrl}/doc/${doc.id}`;
    const formattedBalance = formatCurrency(balanceDue, business.currency, business.currencySymbol);
    const clientFirstName = customer.name.split(' ')[0] || customer.name;

    // AI or Intelligent Fallback Generation
    let whatsappText = '';
    let emailSubject = '';
    let emailBody = '';

    const systemPrompt = `You are an AI assistant helping a business send payment and quote follow-ups.
Write:
1. A concise WhatsApp reminder message (under 60 words, friendly emojis, clear portal link).
2. An Email subject line.
3. An Email body (2-3 short paragraphs, professional and clear).

Tone requested: ${tone} (${
      tone === 'polite'
        ? 'courteous check-in'
        : tone === 'due_today'
        ? 'due today friendly notification'
        : tone === 'overdue'
        ? 'firm but respectful past due notice'
        : 'clear professional update'
    }).
Always include the document number, amount, due/expiry date, and portal link.
Return ONLY valid JSON matching this schema:
{
  "whatsappText": "string",
  "emailSubject": "string",
  "emailBody": "string"
}`;

    const userPrompt = `Business: ${business.name}
Customer: ${customer.name}
Document: ${docType} #${docNumber}
Balance Due: ${formattedBalance}
Date: ${dueDateFormatted}
Portal Link: ${portalUrl}
Additional Note: ${customNote || 'None'}`;

    try {
      const aiRes = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        preferredModel: 'gpt-4o-mini',
        temperature: 0.2,
      });

      const parsedJson = JSON.parse(aiRes.content.replace(/```json|```/g, '').trim());
      whatsappText = parsedJson.whatsappText || '';
      emailSubject = parsedJson.emailSubject || '';
      emailBody = parsedJson.emailBody || '';
    } catch {
      // Heuristic fallback if AI is unavailable
      if (docType === 'QUOTE') {
        emailSubject = `Follow-up: Quote #${docNumber} from ${business.name}`;
        whatsappText = `Hi ${clientFirstName}! 👋 Just following up on Quote #${docNumber} for ${formattedBalance} from ${business.name}. Valid until ${dueDateFormatted}.\n\nYou can review, select your tier, and approve online here: ${portalUrl}\n\nLet us know if you have any questions!`;
        emailBody = `Dear ${customer.name},\n\nWe hope this email finds you well. We are following up regarding Quote #${docNumber} for ${formattedBalance}.\n\nYou can review the complete scope, customize options, and sign digitally at your convenience here:\n${portalUrl}\n\nIf you have any questions or need any adjustments, please let us know.\n\nBest regards,\n${business.ownerName || business.name}`;
      } else {
        if (tone === 'overdue') {
          emailSubject = `Overdue Notice: Invoice #${docNumber} from ${business.name}`;
          whatsappText = `Hi ${clientFirstName}, this is a friendly reminder that Invoice #${docNumber} (${formattedBalance}) was due on ${dueDateFormatted}.\n\nPlease review and settle payment via our secure portal here: ${portalUrl}\n\nThank you! - ${business.name}`;
          emailBody = `Dear ${customer.name},\n\nThis is a notification that Invoice #${docNumber} for ${formattedBalance} is currently past due (was due on ${dueDateFormatted}).\n\nPlease view your invoice and payment options here:\n${portalUrl}\n\nIf you have already processed payment, kindly disregard this notice.\n\nSincerely,\n${business.name}`;
        } else if (tone === 'due_today') {
          emailSubject = `Reminder: Invoice #${docNumber} is due today - ${business.name}`;
          whatsappText = `Hi ${clientFirstName}! Quick reminder that Invoice #${docNumber} for ${formattedBalance} is due today (${dueDateFormatted}).\n\nQuick pay link: ${portalUrl}\n\nThank you for your business! - ${business.name}`;
          emailBody = `Dear ${customer.name},\n\nThis is a friendly reminder that Invoice #${docNumber} for ${formattedBalance} is due today.\n\nYou can review and pay online here:\n${portalUrl}\n\nThank you for choosing ${business.name}.\n\nBest regards,\n${business.ownerName || business.name}`;
        } else {
          emailSubject = `Friendly Reminder: Invoice #${docNumber} from ${business.name}`;
          whatsappText = `Hi ${clientFirstName}! Hope you're doing well. Just a quick reminder about Invoice #${docNumber} for ${formattedBalance} from ${business.name}.\n\nView details & pay online: ${portalUrl}\n\nThank you!`;
          emailBody = `Dear ${customer.name},\n\nWe hope you are having a wonderful week. Here is a friendly reminder regarding Invoice #${docNumber} for the balance of ${formattedBalance}, due on ${dueDateFormatted}.\n\nYou can view and pay online here:\n${portalUrl}\n\nThank you,\n${business.name}`;
        }
      }
    }

    // Direct WhatsApp and Mailto URLs
    const rawPhone = (customer.phone || '').replace(/[^0-9+]/g, '');
    const cleanPhone = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone;
    const directWhatsAppUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    const directMailtoUrl = customer.email
      ? `mailto:${customer.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      : '';

    return NextResponse.json({
      success: true,
      whatsappText,
      emailSubject,
      emailBody,
      directWhatsAppUrl,
      directMailtoUrl,
      portalUrl,
      customerPhone: customer.phone,
      customerEmail: customer.email,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    // Find invoices that are overdue or due within 3 days
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const pendingInvoices = await db.aiInvoice.findMany({
      where: {
        businessId: business.id,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      include: { customer: true, items: true, payments: true },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    // Find pending quotes that were sent
    const pendingQuotes = await db.aiQuote.findMany({
      where: {
        businessId: business.id,
        status: 'SENT',
      },
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      pendingInvoices: pendingInvoices.map((inv) => {
        const total = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        const isOverdue = inv.dueDate ? new Date(inv.dueDate) < now : false;
        return {
          id: inv.id,
          number: inv.number,
          customerName: inv.customer.name,
          customerPhone: inv.customer.phone,
          customerEmail: inv.customer.email,
          balanceDue: Math.max(0, total - paid),
          dueDate: inv.dueDate,
          isOverdue,
          status: inv.status,
        };
      }),
      pendingQuotes: pendingQuotes.map((q) => ({
        id: q.id,
        number: q.number,
        customerName: q.customer.name,
        customerPhone: q.customer.phone,
        customerEmail: q.customer.email,
        total: q.items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
        validUntil: q.validUntil,
        status: q.status,
      })),
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
