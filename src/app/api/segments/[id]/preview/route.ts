import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  parseRulesJson,
  buildContactWhereFromRules,
} from '@/lib/segment-rules';

type Params = { params: Promise<{ id: string }> };

// GET /api/segments/[id]/preview — preview members of a segment based on rules
// Does NOT persist SegmentMember rows — just returns matching contacts.
// Query params: page, limit (max 100), matchLogic override, rulesJson override
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const segment = await db.segment.findFirst({
      where: { id, tenantId },
    });
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
    );
    const skip = (page - 1) * limit;

    // Allow override of rulesJson/matchLogic via query, else use stored values
    const rulesJson =
      searchParams.get('rulesJson') || segment.rulesJson;
    const matchLogicParam = searchParams.get('matchLogic');
    const matchLogic =
      matchLogicParam === 'or' || matchLogicParam === 'and'
        ? matchLogicParam
        : (segment.matchLogic as 'and' | 'or') || 'and';

    const { rules } = parseRulesJson(rulesJson);
    const where = buildContactWhereFromRules(rules, matchLogic, tenantId);

    const [data, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          contactTags: { include: { tag: true } },
          contactGroups: { include: { group: true } },
        },
      }),
      db.contact.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
      meta: {
        rulesApplied: rules.length,
        matchLogic,
      },
    });
  } catch (error) {
    console.error('Error previewing segment:', error);
    return NextResponse.json(
      { error: 'Failed to preview segment' },
      { status: 500 }
    );
  }
}
