import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { crawlSitemap, crawlSingleUrl } from '@/lib/ai-crawler';
import { ingestKnowledgeDocument } from '@/lib/ai-knowledge';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No active workspace/tenant found' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { url, mode = 'sitemap', autoIngest = true, maxPages = 20 } = body;

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
      return NextResponse.json({
        error: 'No readable content could be extracted from this URL. Please check that the URL is public and accessible.',
      }, { status: 422 });
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
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      pagesDiscovered: crawledPages.length,
      pages: crawledPages.map((p) => ({ url: p.url, title: p.title, charCount: p.charCount })),
      ingestedCount: ingestedDocs.length,
      ingestedDocs,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Crawl failed: ${msg}` }, { status: 500 });
  }
}
