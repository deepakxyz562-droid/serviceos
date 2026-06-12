import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/documents/[id] — Get document by ID
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

    const document = await db.document.findUnique({ where: { id } });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify tenant isolation
    if (document.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check access level for non-admin users
    if (user.role === 'employee' && document.accessLevel === 'admin') {
      if (document.uploadedById !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else if (user.role === 'customer' && document.accessLevel !== 'customer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] — Update document
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

    // Verify the document exists and belongs to the same tenant
    const existingDocument = await db.document.findUnique({ where: { id } });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (existingDocument.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl;
    if (body.fileType !== undefined) updateData.fileType = body.fileType;
    if (body.fileSize !== undefined) updateData.fileSize = body.fileSize;
    if (body.accessLevel !== undefined) updateData.accessLevel = body.accessLevel;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;
    if (body.jobId !== undefined) updateData.jobId = body.jobId || null;
    if (body.employeeId !== undefined) updateData.employeeId = body.employeeId || null;
    if (body.isShared !== undefined) updateData.isShared = body.isShared;
    if (body.sharedWithJson !== undefined) {
      updateData.sharedWithJson = typeof body.sharedWithJson === 'string' ? body.sharedWithJson : JSON.stringify(body.sharedWithJson);
    }
    if (body.tagsJson !== undefined) {
      updateData.tagsJson = typeof body.tagsJson === 'string' ? body.tagsJson : JSON.stringify(body.tagsJson);
    }

    const document = await db.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] — Delete document
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

    // Verify the document exists and belongs to the same tenant
    const existingDocument = await db.document.findUnique({ where: { id } });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (existingDocument.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.document.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
