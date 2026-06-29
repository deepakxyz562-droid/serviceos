import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_KB_ARTICLES } from '@/lib/kb-default-articles';

// GET /api/knowledge-base — List articles with filters (auto-seeds defaults on first fetch)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'sortOrder';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause scoped to tenant
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    if (category) where.category = category;
    if (isPublic !== null && isPublic !== undefined) {
      where.isPublic = isPublic === 'true';
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      // Default to showing only active articles
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    let [articles, total] = await Promise.all([
      db.knowledgeArticle.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.knowledgeArticle.count({ where }),
    ]);

    // Auto-seed default KB articles on first fetch if table is empty for this tenant
    if (total === 0) {
      console.log('[KnowledgeBase] No articles found, auto-seeding defaults...');
      for (const article of DEFAULT_KB_ARTICLES) {
        try {
          await db.knowledgeArticle.create({
            data: {
              title: article.title,
              content: article.content,
              category: article.category,
              tagsJson: article.tagsJson,
              isPublic: article.isPublic,
              isActive: true,
              sortOrder: article.sortOrder,
              authorId: user.id,
              tenantId: user.tenantId,
            },
          });
        } catch (err) {
          console.error('[KnowledgeBase] Failed to seed article:', article.title, err);
        }
      }
      // Re-fetch after seeding
      [articles, total] = await Promise.all([
        db.knowledgeArticle.findMany({
          where,
          orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.knowledgeArticle.count({ where }),
      ]);
      console.log(`[KnowledgeBase] ✅ Seeded ${total} default articles`);
    }

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching knowledge articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge articles' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-base — Create article
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      content,
      category,
      tagsJson,
      isPublic,
      isActive,
      sortOrder,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const article = await db.knowledgeArticle.create({
      data: {
        title,
        content,
        category: category || 'general',
        tagsJson: tagsJson ? (typeof tagsJson === 'string' ? tagsJson : JSON.stringify(tagsJson)) : '[]',
        isPublic: isPublic ?? false,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
        authorId: user.id,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to create knowledge article' },
      { status: 500 }
    );
  }
}
