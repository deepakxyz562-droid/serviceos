import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/forms ────────────────────────────────────────────────────────
// List all forms for a tenant (query param: tenantId). Return forms with response counts.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [forms, total] = await Promise.all([
      db.form.findMany({
        where,
        include: {
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.form.count({ where }),
    ]);

    const formsWithCounts = forms.map((form) => ({
      id: form.id,
      name: form.name,
      description: form.description,
      type: form.type,
      status: form.status,
      slug: form.slug,
      // Include the JSON-encoded config so the Form Builder list view can
      // render action badges, fields preview, etc. without an extra round-trip.
      fieldsJson: form.fieldsJson,
      submissionActions: form.submissionActions,
      fieldMappingJson: form.fieldMappingJson,
      welcomeMessage: form.welcomeMessage,
      completionMessage: form.completionMessage,
      whatsappOwnerTemplate: form.whatsappOwnerTemplate,
      whatsappUserTemplate: form.whatsappUserTemplate,
      whatsappAiGenerated: form.whatsappAiGenerated,
      submissions: form.submissions,
      conversionRate: form.conversionRate,
      tenantId: form.tenantId,
      workspaceId: form.workspaceId,
      createdById: form.createdById,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      responseCount: form._count.responses,
    }));

    return NextResponse.json({
      forms: formsWithCounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List forms error:', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

// ─── POST /api/forms ───────────────────────────────────────────────────────
// Create a new form

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  const base = slugify(baseName) || 'form';
  let slug = base;
  let counter = 1;

  while (await db.form.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      type,
      fieldsJson,
      submissionActions,
      fieldMappingJson,
      welcomeMessage,
      completionMessage,
      whatsappOwnerTemplate,
      whatsappUserTemplate,
      whatsappAiGenerated,
      embedScriptEnabled,
      embedIframeEnabled,
      tenantId,
      workspaceId,
      createdById,
      slug: providedSlug,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Form name is required' }, { status: 400 });
    }

    // Auto-generate slug from name if not provided
    const slug = providedSlug || await generateUniqueSlug(name);

    // Check slug uniqueness
    if (providedSlug) {
      const existing = await db.form.findUnique({ where: { slug: providedSlug } });
      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
    }

    const form = await db.form.create({
      data: {
        name,
        description: description || null,
        type: type || 'lead_capture',
        status: 'active',
        fieldsJson: typeof fieldsJson === 'string' ? fieldsJson : JSON.stringify(fieldsJson || []),
        submissionActions: typeof submissionActions === 'string' ? submissionActions : JSON.stringify(submissionActions || []),
        fieldMappingJson: typeof fieldMappingJson === 'string' ? fieldMappingJson : JSON.stringify(fieldMappingJson || {}),
        welcomeMessage: welcomeMessage || '',
        completionMessage: completionMessage || '',
        whatsappOwnerTemplate: whatsappOwnerTemplate || '',
        whatsappUserTemplate: whatsappUserTemplate || '',
        whatsappAiGenerated: whatsappAiGenerated || false,
        embedScriptEnabled: embedScriptEnabled || false,
        embedIframeEnabled: embedIframeEnabled || false,
        slug,
        tenantId: tenantId || null,
        workspaceId: workspaceId || null,
        createdById: createdById || null,
      },
      include: {
        _count: { select: { responses: true } },
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error('Create form error:', error);
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}
