import { NextRequest, NextResponse } from 'next/server';
import { TemplateService } from '@/lib/nimo/template.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category') || undefined;
    const search = searchParams.get('q') || undefined;
    const isTrending = searchParams.get('trending') === 'true';
    const isFeatured = searchParams.get('featured') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await TemplateService.getTemplates({
      categorySlug,
      search,
      isTrending,
      isFeatured,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.thumbnail_url) {
      return NextResponse.json(
        { success: false, error: 'Title and thumbnail_url are required' },
        { status: 400 }
      );
    }

    const template = await TemplateService.upsertTemplate(body);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upsert template' },
      { status: 500 }
    );
  }
}
