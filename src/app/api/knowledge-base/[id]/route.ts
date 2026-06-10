import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/knowledge-base/[id] — Get article by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const article = await db.knowledgeArticle.findUnique({ where: { id } });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Verify tenant isolation
    if (article.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Increment view count
    await db.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
      ...article,
      viewCount: article.viewCount + 1,
    });
  } catch (error) {
    console.error('Error fetching knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge article' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge-base/[id] — Update article
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify the article exists and belongs to the same tenant
    const existingArticle = await db.knowledgeArticle.findUnique({ where: { id } });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (existingArticle.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.tagsJson !== undefined) {
      updateData.tagsJson = typeof body.tagsJson === 'string' ? body.tagsJson : JSON.stringify(body.tagsJson);
    }
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.helpfulCount !== undefined) updateData.helpfulCount = body.helpfulCount;
    if (body.notHelpfulCount !== undefined) updateData.notHelpfulCount = body.notHelpfulCount;

    const article = await db.knowledgeArticle.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error updating knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to update knowledge article' },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge-base/[id] — Delete article
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the article exists and belongs to the same tenant
    const existingArticle = await db.knowledgeArticle.findUnique({ where: { id } });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (existingArticle.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.knowledgeArticle.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    console.error('Error deleting knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge article' },
      { status: 500 }
    );
  }
}
