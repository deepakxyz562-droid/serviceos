import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/documents — List documents with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const accessLevel = searchParams.get('accessLevel');
    const customerId = searchParams.get('customerId');
    const jobId = searchParams.get('jobId');
    const employeeId = searchParams.get('employeeId');
    const isShared = searchParams.get('isShared');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause scoped to tenant
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    // Apply access level filtering based on user role
    if (user.role === 'employee') {
      where.OR = [
        { accessLevel: 'employee' },
        { accessLevel: 'customer' },
        { uploadedById: user.id },
      ];
    } else if (user.role === 'customer') {
      where.accessLevel = 'customer';
    }

    if (type) where.type = type;
    if (category) where.category = category;
    if (accessLevel) where.accessLevel = accessLevel;
    if (customerId) where.customerId = customerId;
    if (jobId) where.jobId = jobId;
    if (employeeId) where.employeeId = employeeId;
    if (isShared !== null && isShared !== undefined) {
      where.isShared = isShared === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.document.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents — Create document record
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      category,
      fileUrl,
      fileType,
      fileSize,
      accessLevel,
      customerId,
      jobId,
      employeeId,
      isShared,
      sharedWithJson,
      tagsJson,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    const document = await db.document.create({
      data: {
        name,
        description: description || null,
        type: type || 'general',
        category: category || 'general',
        fileUrl,
        fileType: fileType || null,
        fileSize: fileSize || null,
        accessLevel: accessLevel || 'admin',
        customerId: customerId || null,
        jobId: jobId || null,
        employeeId: employeeId || null,
        uploadedById: user.id,
        isShared: isShared ?? false,
        sharedWithJson: sharedWithJson ? (typeof sharedWithJson === 'string' ? sharedWithJson : JSON.stringify(sharedWithJson)) : '[]',
        tagsJson: tagsJson ? (typeof tagsJson === 'string' ? tagsJson : JSON.stringify(tagsJson)) : '[]',
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
