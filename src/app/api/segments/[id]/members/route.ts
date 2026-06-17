import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/segments/[id]/members — Evaluate a segment and return matching contacts
//
// Evaluates the segment's rulesJson against the Contact table and returns:
//   - The list of matching contacts (paginated)
//   - The total count
//   - Updates the segment's memberCount + lastCalculated in the DB
//
// Supported filter fields (see also segments-view.tsx FILTER_FIELDS):
//   contact_tags      — contains (comma-separated tags)
//   contact_company   — equals / contains
//   contact_email     — contains (email substring or domain)
//   contact_name      — contains
//   contact_phone     — contains
//   contact_source    — equals ("imported" | "manual") — derived from createdAt vs tags
//   service_type      — equals / contains (mapped to tags)
//   city              — equals / contains (mapped to tags or company)
//   customer_tags     — contains (alias for contact_tags)
//   source            — equals (alias for contact_source)
//   lead_status       — equals / contains (mapped to tags)
//   revenue           — greater_than / less_than (not applicable to contacts → skipped)
//   last_booking      — more_than (not applicable to contacts → skipped)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const segment = await db.segment.findFirst({
      where: { id, tenantId: authUser.tenantId },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Parse the rules
    let rules: Array<{ field: string; operator: string; value: string }> = [];
    try {
      const parsed = JSON.parse(segment.rulesJson || '[]');
      if (Array.isArray(parsed)) rules = parsed;
    } catch {
      rules = [];
    }

    const matchLogic = (segment.matchLogic || 'and').toLowerCase();

    // Build the Prisma where clause
    const conditions: any[] = [];

    for (const rule of rules) {
      if (!rule.value) continue;
      const val = String(rule.value).trim();
      const op = rule.operator;

      let condition: any = null;

      switch (rule.field) {
        case 'contact_tags':
        case 'customer_tags':
          // tags is comma-separated — use contains for the value
          if (op === 'equals') {
            condition = { tags: val };
          } else if (op === 'not_equals') {
            condition = { NOT: { tags: val } };
          } else if (op === 'contains') {
            condition = { tags: { contains: val } };
          }
          break;

        case 'contact_company':
          if (op === 'equals') {
            condition = { company: val };
          } else if (op === 'not_equals') {
            condition = { NOT: { company: val } };
          } else if (op === 'contains') {
            condition = { company: { contains: val } };
          }
          break;

        case 'contact_email':
          if (op === 'equals') {
            condition = { email: val };
          } else if (op === 'contains') {
            condition = { email: { contains: val } };
          }
          break;

        case 'contact_name':
          if (op === 'equals') {
            condition = { name: val };
          } else if (op === 'contains') {
            condition = { name: { contains: val } };
          }
          break;

        case 'contact_phone':
          if (op === 'contains' || op === 'equals') {
            condition = { phone: { contains: val } };
          }
          break;

        case 'contact_source':
        case 'source':
          // "imported" → has tags (imported contacts usually have tags set)
          // "manual" → no tags
          if (val.toLowerCase() === 'imported') {
            condition = { NOT: [{ tags: null }, { tags: '' }] };
          } else if (val.toLowerCase() === 'manual') {
            condition = { OR: [{ tags: null }, { tags: '' }] };
          }
          break;

        case 'service_type':
        case 'lead_status':
          // Map to tags
          if (op === 'equals') {
            condition = { tags: val };
          } else if (op === 'contains') {
            condition = { tags: { contains: val } };
          }
          break;

        case 'city':
        case 'country':
          // Mapped to company as a fallback (contacts don't have city/country fields)
          if (op === 'equals') {
            condition = { company: val };
          } else if (op === 'contains') {
            condition = { company: { contains: val } };
          }
          break;

        default:
          // Unknown field — skip
          break;
      }

      if (condition) {
        conditions.push(condition);
      }
    }

    // Build the final where clause
    const where: any = { tenantId: authUser.tenantId };

    if (conditions.length > 0) {
      if (matchLogic === 'or') {
        where.OR = conditions;
      } else {
        where.AND = conditions;
      }
    }

    // Pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      db.contact.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          tags: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contact.count({ where }),
    ]);

    // Update the segment's memberCount + lastCalculated
    await db.segment.update({
      where: { id },
      data: {
        memberCount: total,
        lastCalculated: new Date(),
      },
    }).catch(() => {
      // Non-critical — don't fail the request if update fails
    });

    return NextResponse.json({
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      segmentId: id,
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error evaluating segment:', error);
    return NextResponse.json({ error: 'Failed to evaluate segment' }, { status: 500 });
  }
}
