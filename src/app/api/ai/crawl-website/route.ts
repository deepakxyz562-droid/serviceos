import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callOpenRouter } from '@/lib/ai-client';

/**
 * POST /api/ai/crawl-website
 *
 * Universal website crawler & extractor.
 * 1. Fetches homepage HTML.
 * 2. Cleans boilerplate (scripts, styles, nav).
 * 3. Uses LLM to extract structured business knowledge (services, pricing, FAQs, hours, areas).
 * 4. Persists into KnowledgeSource & KnowledgeDocument for the tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let url = (body.url as string || '').trim();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // ── 1. Fetch Website HTML ──────────────────────────────────────────────
    let html = '';
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FieserosBot/1.0; +https://fieseros.com)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(12000), // 12s timeout
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Website returned status HTTP ${res.status}` }, { status: 400 });
      }

      html = await res.text();
    } catch (err) {
      return NextResponse.json(
        { error: `Could not reach ${url}: ${err instanceof Error ? err.message : 'Network timeout'}` },
        { status: 400 }
      );
    }

    // ── 2. Clean HTML into readable text content ───────────────────────────
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Send first 15k characters to LLM

    // ── 3. LLM Extraction ──────────────────────────────────────────────────
    const prompt = `Analyze the following website text scraped from "${url}" and extract structured business information in valid JSON format.

Website content:
"""
${cleanText}
"""

Return ONLY a valid JSON object matching this exact TypeScript structure:
{
  "businessName": "Name of the business",
  "industry": "e.g. Plumbing, Dental, HVAC, Roofing, Salon, Consulting",
  "tagline": "Short slogan or value proposition",
  "services": [
    { "name": "Service Title", "description": "Brief summary", "priceEstimate": "Optional price hint if mentioned" }
  ],
  "serviceAreas": ["City/Region 1", "City/Region 2"],
  "businessHours": "e.g. Mon-Fri 8am-6pm, 24/7 Emergency",
  "contact": {
    "phone": "Phone number if found",
    "email": "Email address if found",
    "address": "Physical location if found"
  },
  "faqs": [
    { "question": "Common question", "answer": "Answer from text" }
  ],
  "emergencyServices": true or false
}`;

    const aiResult = await callOpenRouter({
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500,
    });

    let extractedData = {};
    try {
      extractedData = JSON.parse(aiResult.content || '{}');
    } catch {
      extractedData = { error: 'Failed to parse AI extraction' };
    }

    // ── 4. Persist in Knowledge Base (KnowledgeSource & Document) ──────────
    try {
      const source = await db.knowledgeSource.create({
        data: {
          tenantId: user.tenantId,
          name: (extractedData as { businessName?: string }).businessName || new URL(url).hostname,
          type: 'website',
          sourceUrl: url,
          status: 'ready',
          lastSyncedAt: new Date(),
          metadataJson: JSON.stringify(extractedData),
        },
      });

      await db.knowledgeDocument.create({
        data: {
          sourceId: source.id,
          tenantId: user.tenantId,
          title: `Scraped Content — ${new URL(url).hostname}`,
          content: cleanText.slice(0, 5000),
          url,
          status: 'ready',
          chunksCount: 1,
        },
      });
    } catch (dbErr) {
      console.warn('[crawl-website] Failed to persist in DB (non-fatal):', dbErr);
    }

    return NextResponse.json({
      success: true,
      url,
      knowledge: extractedData,
    });
  } catch (error) {
    console.error('[crawl-website] Error:', error);
    return NextResponse.json({ error: 'Failed to crawl website' }, { status: 500 });
  }
}
