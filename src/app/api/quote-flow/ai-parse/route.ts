import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { callAI, extractJson } from '@/lib/ai-client';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { generateDefaultTiers, type ProposalTier } from '@/lib/quote-flow-calc';

const inputSchema = z.object({
  text: z.string().min(2),
  mode: z.enum(['voice', 'paste', 'prompt']).default('prompt'),
  defaultTaxRate: z.number().optional().default(18),
  defaultCurrency: z.string().optional().default('INR'),
});

const SYSTEM_PROMPT = `You are a world-class AI billing parser for QuoteFlow (2026 edition).
You turn raw spoken voice transcripts, pasted WhatsApp/chat messages, or free-form project notes into structured, professional quote or invoice data.

RULES:
1. Extract document type:
   - "INVOICE" if the user mentions "invoice", "bill", "payment due", "already completed", "remaining balance".
   - "QUOTE" if the user mentions "quote", "estimate", "proposal", "rates", "can you do this", "options". Default to "QUOTE" if ambiguous.
2. Customer details:
   - Extract customer name ("for Sarah Johnson", "Invoice Mike", "[10:14 AM] John:", "Customer: Acme Corp").
   - Extract email or phone number if present in text/chat.
3. Line items:
   - Extract clean, professional descriptions.
   - Extract qty (number) and unitPrice (number). Do not format with currency symbols.
   - Example: "5 internal pages 1,000" -> { description: "Internal Web Pages", qty: 5, unitPrice: 200 } or { description: "5 Internal Web Pages", qty: 1, unitPrice: 1000 }.
4. Discounts & Taxes:
   - "10% discount" -> discountValue: 10, discountType: "PERCENT"
   - "$50 off" -> discountValue: 50, discountType: "AMOUNT"
   - Explicit tax mentioned like "add 18% GST" -> taxRate: 18.
5. Currency:
   - Detect USD ($), EUR (€), GBP (£), INR (₹ or Rs), AED, CAD, AUD. Default to INR or business currency.
6. Multi-Tier Proposals:
   - If the user asks for "packages", "options", "good better best", or 3 tiers, flag isMultiTier: true.
7. Return ONLY clean, valid JSON matching this schema:
{
  "docType": "QUOTE" | "INVOICE",
  "customer": {
    "name": string | null,
    "email": string | null,
    "phone": string | null
  },
  "items": [
    {
      "description": string,
      "qty": number,
      "unitPrice": number,
      "taxRate": number
    }
  ],
  "discountValue": number,
  "discountType": "AMOUNT" | "PERCENT",
  "taxRate": number,
  "currency": string,
  "terms": string | null,
  "validityDays": number,
  "isMultiTier": boolean,
  "summary": string
}`;

/**
 * Robust heuristic parser as resilient fallback if LLM is unavailable or fails
 */
function heuristicFallbackParse(rawText: string, defaultTax = 18, defaultCurr = 'INR') {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Doc Type
  const isInvoice =
    lower.includes('invoice') ||
    lower.includes('bill ') ||
    lower.includes('bill:') ||
    lower.includes('payment due') ||
    lower.includes('remaining balance');
  const docType = isInvoice ? 'INVOICE' : 'QUOTE';

  // 2. Customer extraction
  let customerName: string | null = null;
  const namePatterns = [
    /(?:for|invoice|quote|bill to|client:?|customer:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\[\d{1,2}:\d{2}\s*(?:AM|PM)?\]\s*([^:]+):/i, // WhatsApp style
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:/m,
  ];
  for (const pat of namePatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!['Quote', 'Invoice', 'Bill', 'Estimate', 'Please', 'Hi', 'Hello'].includes(candidate)) {
        customerName = candidate;
        break;
      }
    }
  }

  // 3. Email and Phone
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  // 4. Currency
  let currency = defaultCurr;
  if (text.includes('$') || lower.includes('usd') || lower.includes('dollar')) currency = 'USD';
  else if (text.includes('€') || lower.includes('eur')) currency = 'EUR';
  else if (text.includes('£') || lower.includes('gbp')) currency = 'GBP';
  else if (text.includes('₹') || lower.includes('inr') || lower.includes('rs') || lower.includes('rupee')) currency = 'INR';

  // 5. Line items parsing
  const items: Array<{ description: string; qty: number; unitPrice: number; taxRate: number }> = [];

  // Match lines with item + price e.g., "Homepage 800", "Logo design $400", "5 pages $1000", "consulting 3 days 1200"
  const lines = text.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const priceMatch = line.match(/(?:[$€£₹Rs.]*\s*)(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+)(?:\s*(?:dollars|bucks|rs|inr|usd|eur|gbp))?/i);
    if (priceMatch) {
      const rawPriceStr = priceMatch[1].replace(/,/g, '');
      const price = parseFloat(rawPriceStr);
      if (!isNaN(price) && price > 0 && price < 10000000) {
        // Find qty if specified (e.g. "5 pages", "3 hours", "2 fans")
        const qtyMatch = line.match(/\b(\d+)\s*(?:x|hours?|days?|pages?|units?|items?|pcs?|fans?)\b/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

        // Clean description
        let desc = line
          .replace(priceMatch[0], '')
          .replace(/^(?:item\s*\d*:?|•|-|\*)\s*/i, '')
          .replace(/\b(?:for|dollars|bucks|rs|inr|usd|eur|gbp)\b/gi, '')
          .trim();

        if (desc.length > 2) {
          items.push({
            description: desc.charAt(0).toUpperCase() + desc.slice(1),
            qty: qty > 0 ? qty : 1,
            unitPrice: Math.round(price / (qty > 0 ? qty : 1)),
            taxRate: defaultTax,
          });
        }
      }
    }
  }

  // Fallback single item if no structured lines parsed
  if (items.length === 0) {
    const singleNumber = text.match(/(?:[$€£₹]\s*)(\d+)/);
    const amount = singleNumber ? parseFloat(singleNumber[1]) : 1500;
    items.push({
      description: text.slice(0, 45) || 'Professional Services',
      qty: 1,
      unitPrice: amount,
      taxRate: defaultTax,
    });
  }

  // 6. Discount
  let discountValue = 0;
  let discountType: 'AMOUNT' | 'PERCENT' = 'AMOUNT';
  const discPercent = text.match(/(\d+)%\s*(?:discount|off)/i);
  if (discPercent) {
    discountValue = parseInt(discPercent[1], 10);
    discountType = 'PERCENT';
  } else {
    const discAmount = text.match(/(?:take off|discount of|less)\s*[$€£₹]?\s*(\d+)/i);
    if (discAmount) {
      discountValue = parseInt(discAmount[1], 10);
      discountType = 'AMOUNT';
    }
  }

  // 7. Terms / Multi-tier
  const isMultiTier = lower.includes('tier') || lower.includes('good better best') || lower.includes('packages') || lower.includes('options');

  return {
    docType,
    customer: {
      name: customerName,
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
    },
    items,
    discountValue,
    discountType,
    taxRate: defaultTax,
    currency,
    terms: lower.includes('50% deposit') ? '50% Upfront Deposit, 50% upon completion' : 'Payment due in 15 days',
    validityDays: 30,
    isMultiTier,
    summary: `Created ${docType.toLowerCase()} draft for ${customerName || 'client'} with ${items.length} item(s)`,
  };
}

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

    const { text, mode, defaultTaxRate, defaultCurrency } = parsed.data;
    const businessCurrency = business.currency || defaultCurrency || 'INR';

    let draftData: any = null;

    // 1. Attempt AI Parsing
    try {
      const aiPrompt = `Input Mode: ${mode.toUpperCase()}
Business Name: ${business.name}
Business Currency: ${businessCurrency}
Default Tax: ${defaultTaxRate}%

Raw Input Text:
"""
${text}
"""`;

      const aiRes = await callAI({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: aiPrompt },
        ],
        preferredModel: 'gpt-4o-mini',
        temperature: 0.1,
        json: true,
      });

      draftData = extractJson(aiRes.content);
    } catch {
      // 2. Resilient fallback: Heuristic engine
      draftData = heuristicFallbackParse(text, defaultTaxRate, businessCurrency);
    }

    if (!draftData || !draftData.items || draftData.items.length === 0) {
      draftData = heuristicFallbackParse(text, defaultTaxRate, businessCurrency);
    }

    // 3. Customer Matching Memory: check if customer already exists in DB
    let matchedCustomer: any = null;
    if (draftData.customer?.name) {
      const candidates = await db.aiCustomer.findMany({
        where: {
          businessId: business.id,
          name: { contains: draftData.customer.name, mode: 'insensitive' },
        },
        take: 1,
      });

      if (candidates.length > 0) {
        matchedCustomer = candidates[0];
      }
    }

    // 4. Generate Multi-Tier options if requested
    let tiers: ProposalTier[] | null = null;
    if (draftData.isMultiTier) {
      tiers = generateDefaultTiers(draftData.items);
    }

    return NextResponse.json({
      success: true,
      draft: {
        docType: draftData.docType || 'QUOTE',
        customer: {
          name: matchedCustomer?.name || draftData.customer?.name || null,
          email: matchedCustomer?.email || draftData.customer?.email || null,
          phone: matchedCustomer?.phone || draftData.customer?.phone || null,
        },
        matchedCustomer,
        items: draftData.items || [],
        discountValue: draftData.discountValue || 0,
        discountType: draftData.discountType || 'AMOUNT',
        taxRate: typeof draftData.taxRate === 'number' ? draftData.taxRate : defaultTaxRate,
        currency: draftData.currency || businessCurrency,
        terms: draftData.terms || 'Due in 30 days',
        validityDays: draftData.validityDays || 30,
        summary: draftData.summary || `Parsed ${draftData.items?.length || 0} line items`,
        isMultiTier: !!draftData.isMultiTier,
        tiers,
      },
      rawInput: text,
      mode,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || 'Failed to parse document text' },
      { status: 500 }
    );
  }
}
