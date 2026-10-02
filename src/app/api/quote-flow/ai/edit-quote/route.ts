import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAI, extractJson } from '@/lib/ai-client';
import { requireQuoteFlowUser } from '@/lib/quote-flow-session';

const inputSchema = z.object({
  currentQuote: z.object({
    items: z.array(
      z.object({
        description: z.string(),
        qty: z.number(),
        unitPrice: z.number(),
      })
    ),
    discountValue: z.number(),
    discountType: z.enum(['AMOUNT', 'PERCENT']),
    taxRate: z.number(),
    notes: z.string().optional().nullable(),
  }),
  instruction: z.string().min(2),
});

const outputSchema = z.object({
  items: z.array(
    z.object({
      description: z.string(),
      qty: z.number(),
      unitPrice: z.number(),
    })
  ),
  discountValue: z.number(),
  discountType: z.enum(['AMOUNT', 'PERCENT']),
  taxRate: z.number(),
  notes: z.string().optional().nullable(),
  diff: z.array(
    z.object({
      field: z.string(),
      before: z.string().nullable(),
      after: z.string().nullable(),
    })
  ),
  summary: z.string(),
});

const SYSTEM_PROMPT = `You are an assistant that applies natural-language edits to an existing quote.

Input: a current quote (JSON) and an instruction in natural language.
Output: the updated quote (same shape) plus a "diff" array describing each change.

Rules:
- Output ONLY valid JSON (no markdown fences, no explanatory prose).
- Apply the instruction faithfully. Don't change anything the user didn't ask for.
- Common instructions:
  - "make X $Y" -> set unitPrice of matching item to Y
  - "add X for $Y" -> push a new item { description: X, qty: 1, unitPrice: Y }
  - "remove X" -> filter out items matching description X
  - "give them a 10% discount" -> set discountValue=10, discountType="PERCENT"
  - "add 8% tax" -> set taxRate=8
- Never compute totals — only modify fields. The server will compute totals.
- "diff" entries: each change should produce one diff entry with:
  - field: a short label like "Labor price", "Added: Materials", or "Discount"
  - before: the previous value as a string (or null for new items)
  - after: the new value as a string (or null for removed items)
- "summary": 1-sentence plain-English summary of what changed.

Output schema:
{
  "items": [{ "description": string, "qty": number, "unitPrice": number }],
  "discountValue": number,
  "discountType": "AMOUNT" | "PERCENT",
  "taxRate": number,
  "notes": string | null,
  "diff": [{ "field": string, "before": string | null, "after": string | null }],
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

    let updatedData: any = null;

    try {
      const aiRes = await callAI({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Current quote:\n${JSON.stringify(parsed.data.currentQuote, null, 2)}\n\nInstruction:\n${parsed.data.instruction}`,
          },
        ],
        preferredModel: 'gpt-4o-mini',
        temperature: 0.1,
        json: true,
      });

      try {
        updatedData = extractJson(aiRes.content);
      } catch {
        const clean = aiRes.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
        updatedData = JSON.parse(clean);
      }
    } catch {
      // Deterministic fallback for common edits
      const instr = parsed.data.instruction.toLowerCase();
      const current = parsed.data.currentQuote;
      const items = [...current.items];
      let discountValue = current.discountValue;
      let discountType = current.discountType;
      let taxRate = current.taxRate;
      let notes = current.notes;
      const diff: any[] = [];

      // Check discount
      const discMatch = instr.match(/(\d+)%\s*(?:discount|off)/);
      if (discMatch) {
        const v = parseInt(discMatch[1], 10);
        diff.push({ field: 'Discount', before: `${discountValue}%`, after: `${v}%` });
        discountValue = v;
        discountType = 'PERCENT';
      }

      // Check tax
      const taxMatch = instr.match(/(\d+)%\s*(?:tax|gst|vat)/);
      if (taxMatch) {
        const t = parseInt(taxMatch[1], 10);
        diff.push({ field: 'Tax Rate', before: `${taxRate}%`, after: `${t}%` });
        taxRate = t;
      }

      // Check add item e.g. "add 3 maintenance hours for $150" or "add warranty $50"
      const addMatch = instr.match(/add\s+(?:item\s+)?([^$0-9]+)\s+(?:for\s+)?[$€£₹]?\s*(\d+)/i);
      if (addMatch) {
        const desc = addMatch[1].trim();
        const price = parseInt(addMatch[2], 10);
        items.push({ description: desc.charAt(0).toUpperCase() + desc.slice(1), qty: 1, unitPrice: price });
        diff.push({ field: `Added item`, before: null, after: `${desc} ($${price})` });
      }

      // Check remove item
      const removeMatch = instr.match(/(?:remove|delete)\s+(?:item\s+)?([a-z0-9\s]+)/i);
      if (removeMatch) {
        const term = removeMatch[1].trim();
        const initialLen = items.length;
        const filtered = items.filter((i) => !i.description.toLowerCase().includes(term));
        if (filtered.length < initialLen) {
          diff.push({ field: `Removed item`, before: term, after: null });
          items.length = 0;
          items.push(...filtered);
        }
      }

      // Deposit / terms
      if (instr.includes('deposit') || instr.includes('50%')) {
        notes = (notes ? notes + '\n' : '') + 'Terms: 50% upfront deposit required before project commencement.';
        diff.push({ field: 'Terms', before: null, after: '50% upfront deposit' });
      }

      updatedData = {
        items,
        discountValue,
        discountType,
        taxRate,
        notes,
        diff: diff.length > 0 ? diff : [{ field: 'Document', before: null, after: 'Updated with instruction' }],
        summary: `Applied: "${parsed.data.instruction}"`,
      };
    }

    const validated = outputSchema.safeParse(updatedData);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'AI output format mismatch', issues: validated.error.flatten() },
        { status: 502 }
      );
    }

    return NextResponse.json({
      updated: validated.data,
      diff: validated.data.diff,
      summary: validated.data.summary,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'AI conversational edit failed' }, { status: 500 });
  }
}
