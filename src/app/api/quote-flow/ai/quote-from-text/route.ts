import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAI, extractJson } from '@/lib/ai-client';
import { requireQuoteFlowUser } from '@/lib/quote-flow-session';

const inputSchema = z.object({
  text: z.string().min(3),
  defaultTaxRate: z.number().optional(),
});

const outputSchema = z.object({
  customerName: z.string().nullable().optional(),
  items: z.array(
    z.object({
      description: z.string(),
      qty: z.number().default(1),
      unitPrice: z.number().default(0),
    })
  ),
  discountValue: z.number().default(0),
  discountType: z.enum(['AMOUNT', 'PERCENT']).default('AMOUNT'),
  taxRate: z.number().default(0),
  notes: z.string().optional().nullable(),
  summary: z.string().default('Generated quote draft'),
});

const SYSTEM_PROMPT = `You are an expert AI assistant that converts natural-language job descriptions into structured quote data for trades, services, and small businesses.

Rules:
- Output ONLY valid JSON (no markdown fences, no explanatory text).
- Extract line items: description, qty (default 1 if unspecified), unitPrice.
- Recognize quantities like "2 ceiling fans" -> qty=2.
- Recognize prices like "$150" or "150 dollars" -> unitPrice=150.
- If the user explicitly mentions a discount ("10% discount" -> discountValue=10, discountType="PERCENT"; "take off $50" -> discountValue=50, discountType="AMOUNT").
- If the user explicitly mentions tax ("add 8% tax" -> taxRate=8; otherwise taxRate=0).
- If the user mentions a customer name ("for John Doe"), capture it in customerName. Otherwise set customerName=null.
- NEVER compute totals or arithmetic — only extract parameters. The server computes totals.
- summary: a 1-sentence plain-English summary of what was requested.

Output JSON shape:
{
  "customerName": string | null,
  "items": [{ "description": string, "qty": number, "unitPrice": number }],
  "discountValue": number,
  "discountType": "AMOUNT" | "PERCENT",
  "taxRate": number,
  "notes": string | null,
  "summary": string
}`;

export async function POST(req: Request) {
  try {
    await requireQuoteFlowUser(req);
    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const promptText =
      parsed.data.text +
      (parsed.data.defaultTaxRate
        ? `\n\n(Default tax rate for this business is ${parsed.data.defaultTaxRate}%. Use it only if the user didn't specify one.)`
        : '');

    // Powered by SuperAdmin AI gateway
    const aiRes = await callAI({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptText },
      ],
      preferredModel: 'gpt-4o-mini',
      temperature: 0.1,
      json: true,
    });

    let parsedQuote: any;
    try {
      parsedQuote = extractJson(aiRes.content);
    } catch {
      // Fallback naive cleanup
      const clean = aiRes.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      parsedQuote = JSON.parse(clean);
    }

    const validated = outputSchema.safeParse(parsedQuote);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'AI output format did not match expected structure',
          raw: aiRes.content,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      draft: validated.data,
      rawInput: parsed.data.text,
      provider: aiRes.provider,
      model: aiRes.model,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'AI generation failed' }, { status: 500 });
  }
}
