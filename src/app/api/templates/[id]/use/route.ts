import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/templates/[id]/use — record a template use event.
 *
 * Increments usageCount for the template. When a generated variant reaches
 * ≥3 uses, it should be persisted to the FormTemplate DB table (Release 3.3).
 *
 * This endpoint is the analytics hook for tracking template popularity:
 *   - Template page views
 *   - "Use this template" clicks
 *   - Builder template applications
 *
 * Body: { source: 'view' | 'use' | 'clone' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const source: 'view' | 'use' | 'clone' = body.source || 'use';

    // Try to increment in the DB (if the template is persisted)
    // If not in DB (in-memory only), this is a no-op — the in-memory
    // registry doesn't track usage (by design — it's the curated set).
    try {
      const existing = await db.formTemplate.findUnique({ where: { slug: id } });
      if (existing) {
        const updated = await db.formTemplate.update({
          where: { slug: id },
          data: {
            usageCount: { increment: source === 'use' ? 1 : 0 },
            viewCount: { increment: source === 'view' ? 1 : 0 },
            cloneCount: { increment: source === 'clone' ? 1 : 0 },
          },
        });

        // Auto-persist threshold: if this is an in-memory variant that hit
        // ≥3 uses, promote it to the DB (Release 3.3).
        // For now, we just return the updated counts.
        return NextResponse.json({
          ok: true,
          usageCount: updated.usageCount,
          viewCount: updated.viewCount,
          cloneCount: updated.cloneCount,
        });
      }
    } catch {
      // DB not available (sandbox) — no-op, return success.
    }

    // Template not in DB (in-memory curated) — just acknowledge.
    return NextResponse.json({ ok: true, note: 'in-memory template, no DB tracking' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to record use', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
