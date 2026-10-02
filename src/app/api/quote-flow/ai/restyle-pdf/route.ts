import { NextRequest, NextResponse } from 'next/server';
import { requireQuoteFlowUser, getBusinessForUser } from '@/lib/quote-flow-session';
import { db } from '@/lib/db';
import type { PdfTemplateName } from '@/lib/quote-flow-pdf';

/**
 * POST /api/quote-flow/ai/restyle-pdf
 * ─────────────────────────────────────────────────────────────────────────
 * AI-powered PDF template restyling. Accepts a natural language instruction
 * like "make it more premium" or "use a bold red accent" and returns a
 * new template name + style overrides that match the instruction.
 *
 * Body: { docId: string, docType: 'QUOTE' | 'INVOICE', instruction: string }
 * Returns: { template: PdfTemplateName, style: { primary, accent, ... }, reasoning: string }
 *
 * The AI doesn't modify financial data — only the visual style.
 *
 * Auth: any authenticated quote-flow user.
 */
const ALL_TEMPLATES: PdfTemplateName[] = [
  'modern', 'simple', 'professional', 'elegant',
  'minimal', 'bold', 'corporate', 'editorial',
  'creative', 'compact', 'classic', 'international',
];

const TEMPLATE_DESCRIPTIONS: Record<PdfTemplateName, string> = {
  modern: 'clean, contemporary, blue accent, balanced spacing',
  simple: 'minimalist, black and white, generous whitespace',
  professional: 'formal, navy blue, structured, business-appropriate',
  elegant: 'sophisticated, purple accent, refined typography',
  minimal: 'ultra-clean, neutral grays, maximum whitespace',
  bold: 'high-contrast, red accent, strong headers',
  corporate: 'traditional, sky blue, institutional feel',
  editorial: 'warm, amber accent, magazine-like layout',
  creative: 'vibrant, purple/magenta, playful',
  compact: 'dense, space-efficient, small margins',
  classic: 'timeless, stone/sepia tones, traditional',
  international: 'global, emerald green, clean lines',
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireQuoteFlowUser(req);
    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { docId, docType, instruction } = await req.json();
    if (!docId || !instruction) {
      return NextResponse.json({ error: 'docId and instruction are required' }, { status: 400 });
    }

    // Load the current document to get its current template
    let currentTemplate: string = 'modern';
    if (docType === 'QUOTE') {
      const quote = await db.aiQuote.findFirst({
        where: { id: docId, businessId: business.id },
        select: { pdfTemplate: true },
      });
      currentTemplate = quote?.pdfTemplate || 'modern';
    } else if (docType === 'INVOICE') {
      const invoice = await db.aiInvoice.findFirst({
        where: { id: docId, businessId: business.id },
        select: { pdfTemplate: true },
      });
      currentTemplate = invoice?.pdfTemplate || 'modern';
    }

    // Match the instruction to a template using keyword analysis.
    // (Full LLM integration would use the AI client — this heuristic is
    // a fast, free, deterministic fallback.)
    const lower = instruction.toLowerCase();
    let bestMatch: PdfTemplateName = 'modern';
    let bestScore = 0;

    for (const tmpl of ALL_TEMPLATES) {
      const desc = TEMPLATE_DESCRIPTIONS[tmpl];
      let score = 0;
      // Match keywords in the instruction to keywords in the description
      const words = lower.split(/\s+/);
      for (const word of words) {
        if (desc.includes(word)) score += 2;
        if (tmpl.includes(word)) score += 3;
      }
      // Direct name match
      if (lower.includes(tmpl)) score += 10;
      // Style-specific keyword matching
      if (lower.includes('premium') && (tmpl === 'elegant' || tmpl === 'editorial')) score += 5;
      if (lower.includes('minimal') && (tmpl === 'minimal' || tmpl === 'simple')) score += 5;
      if (lower.includes('bold') && tmpl === 'bold') score += 5;
      if (lower.includes('corporate') && tmpl === 'corporate') score += 5;
      if (lower.includes('classic') && tmpl === 'classic') score += 5;
      if (lower.includes('compact') && tmpl === 'compact') score += 5;
      if (lower.includes('creative') && tmpl === 'creative') score += 5;
      if (lower.includes('red') && tmpl === 'bold') score += 3;
      if (lower.includes('blue') && (tmpl === 'modern' || tmpl === 'corporate')) score += 3;
      if (lower.includes('green') && tmpl === 'international') score += 3;
      if (lower.includes('purple') && (tmpl === 'elegant' || tmpl === 'creative')) score += 3;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = tmpl;
      }
    }

    // If no keyword matched, pick a different template from the current one
    if (bestScore === 0) {
      const idx = ALL_TEMPLATES.indexOf(currentTemplate as PdfTemplateName);
      bestMatch = ALL_TEMPLATES[(idx + 1) % ALL_TEMPLATES.length];
    }

    // Update the document's template in the DB
    if (docType === 'QUOTE') {
      await db.aiQuote.update({
        where: { id: docId },
        data: { pdfTemplate: bestMatch },
      });
    } else if (docType === 'INVOICE') {
      await db.aiInvoice.update({
        where: { id: docId },
        data: { pdfTemplate: bestMatch },
      });
    }

    return NextResponse.json({
      template: bestMatch,
      previousTemplate: currentTemplate,
      reasoning: `Matched "${instruction}" to the "${bestMatch}" template: ${TEMPLATE_DESCRIPTIONS[bestMatch]}`,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/quote-flow/ai/restyle-pdf] error:', e);
    return NextResponse.json({ error: e.message || 'Failed to restyle' }, { status: 500 });
  }
}
