import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { crawlSitemap, crawlSingleUrl } from '@/lib/ai-crawler';
import { ingestKnowledgeDocument } from '@/lib/ai-knowledge';
import { extractStructuredFactsWithAI, extractDeterministicFacts } from '@/lib/ai-structured-facts';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId || (user as any).workspaceId || 'default';

    const body = await req.json().catch(() => ({}));
    const { url, mode = 'sitemap', autoIngest = true, maxPages = 20, extractFacts = true } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    let crawledPages: Array<{ url: string; title: string; text: string; charCount: number }> = [];

    if (mode === 'single') {
      const page = await crawlSingleUrl(url.trim());
      if (page) crawledPages.push(page);
    } else {
      const result = await crawlSitemap(url.trim(), Math.min(Number(maxPages) || 20, 30));
      crawledPages = result.pages;
    }

    if (crawledPages.length === 0) {
      return NextResponse.json(
        {
          error: 'No readable content could be extracted from this URL. Please check that the URL is public and accessible.',
        },
        { status: 422 }
      );
    }

    const ingestedDocs: Array<{ id?: string; title: string; chunkCount?: number; url: string }> = [];

    if (autoIngest) {
      for (const page of crawledPages) {
        const ingestRes = await ingestKnowledgeDocument({
          tenantId,
          title: page.title || page.url,
          text: `Source URL: ${page.url}\n\nTitle: ${page.title}\n\n${page.text}`,
          sourceType: 'file',
          userId: user.id,
        });

        if (ingestRes.ok) {
          ingestedDocs.push({
            id: ingestRes.documentId,
            title: page.title,
            chunkCount: ingestRes.chunkCount,
            url: page.url,
            charCount: page.charCount,
            content: page.text.slice(0, 4000),
          });
        }
      }
    }

    // ── Dual-Brain Fact Extraction ──────────────────────────────────────────
    let structuredFacts: any = null;
    if (extractFacts && crawledPages.length > 0) {
      try {
        const deterministicPreview = extractDeterministicFacts(
          crawledPages.map((p) => p.text).join('\n\n'),
          crawledPages[0].title,
          url.trim()
        );
        structuredFacts = await extractStructuredFactsWithAI(crawledPages, deterministicPreview);

        // Ingest/update verified structured facts document
        const existingFactDoc = await db.aiKnowledgeDocument.findFirst({
          where: {
            tenantId,
            title: '[Verified Facts] Business Intelligence & Rates',
          },
        });

        if (existingFactDoc) {
          await db.aiKnowledgeDocument.update({
            where: { id: existingFactDoc.id },
            data: {
              content: JSON.stringify(structuredFacts, null, 2),
              charCount: JSON.stringify(structuredFacts).length,
              status: 'ready',
            },
          });
        } else {
          await db.aiKnowledgeDocument.create({
            data: {
              tenantId,
              title: '[Verified Facts] Business Intelligence & Rates',
              sourceType: 'manual',
              content: JSON.stringify(structuredFacts, null, 2),
              charCount: JSON.stringify(structuredFacts).length,
              chunkCount: 1,
              status: 'ready',
              createdBy: user.id,
            },
          });
        }
      } catch (factErr) {
        console.warn('[ai-crawler] Fact extraction warning:', factErr);
      }
    }

    return NextResponse.json({
      success: true,
      pagesDiscovered: crawledPages.length,
      pages: crawledPages.map((p) => ({ url: p.url, title: p.title, charCount: p.charCount })),
      ingestedCount: ingestedDocs.length,
      ingestedDocs,
      structuredFacts,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Crawl failed: ${msg}` }, { status: 500 });
  }
}
