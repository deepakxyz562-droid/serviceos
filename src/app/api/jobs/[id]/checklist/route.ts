import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Flatten a Checklist template's sectionsJson (which has nested
 * sections → questions) into the flat items array used by JobChecklist:
 *   [{ id, label, type, required, hasPhoto, hasNotes, hasOptions, options,
 *      checked, checkedAt, checkedBy, checkedByName, notes, photoUrl, sectionTitle }]
 */
function flattenTemplateToItems(
  sectionsJson: string | null | undefined,
): Array<Record<string, unknown>> {
  let sections: any[] = [];
  try {
    sections = sectionsJson ? JSON.parse(sectionsJson) : [];
    if (!Array.isArray(sections)) sections = [];
  } catch {
    sections = [];
  }

  const items: Array<Record<string, unknown>> = [];
  for (const sec of sections) {
    const questions: any[] = Array.isArray(sec?.questions) ? sec.questions : [];
    for (const q of questions) {
      items.push({
        id: q.id,
        label: q.label || 'Untitled item',
        type: q.type || 'checkbox',
        required: !!q.required,
        hasPhoto: false,
        hasNotes: ['short_answer', 'long_answer'].includes(q.type),
        hasOptions: q.type === 'dropdown',
        options: Array.isArray(q.options) ? q.options : [],
        // Execution state (filled by employee)
        checked: false,
        checkedAt: null,
        checkedBy: null,
        checkedByName: null,
        notes: '',
        photoUrl: null,
        // Section context (kept for grouping in the UI)
        sectionTitle: sec?.title || '',
      });
    }
  }
  return items;
}

/**
 * Resolve the tenantId for a job. The Job model itself only stores workspaceId,
 * so we resolve via workspace.tenantId, falling back to the auth user's tenantId.
 */
async function resolveTenantIdForJob(
  workspaceId: string | null | undefined,
  userTenantId: string | null,
): Promise<string | null> {
  if (workspaceId) {
    const ws = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { tenantId: true },
    });
    if (ws?.tenantId) return ws.tenantId;
  }
  return userTenantId;
}

// ─── GET /api/jobs/[id]/checklist ──────────────────────────────────────────
// Returns the latest JobChecklist for the job. If none exists yet but the job
// has a linked service with a checklist template (or a linkedChecklistsJson
// entry), one is auto-created from the template.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        serviceId: true,
        workspaceId: true,
        linkedChecklistsJson: true,
      },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let jobChecklist = await db.jobChecklist.findFirst({
      where: { jobId: id },
      orderBy: { updatedAt: 'desc' },
    });

    // Auto-create from a template if none exists yet.
    if (!jobChecklist) {
      const tenantId = await resolveTenantIdForJob(job.workspaceId, user.tenantId);
      if (!tenantId) {
        return NextResponse.json({ jobChecklist: null, autoCreated: false });
      }

      // Pick a template:
      //   1) If the job's service has a linked checklist → use it
      //   2) Else if job.linkedChecklistsJson has IDs → use the first one
      let templateId: string | null = null;
      let template: any = null;

      if (job.serviceId) {
        const svc = await db.service.findUnique({
          where: { id: job.serviceId },
          select: { id: true, checklistId: true },
        });
        if (svc?.checklistId) templateId = svc.checklistId;
      }

      if (!templateId) {
        const linked: string[] = (() => {
          try {
            const p = JSON.parse(job.linkedChecklistsJson || '[]');
            return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
          } catch {
            return [];
          }
        })();
        if (linked.length > 0) templateId = linked[0];
      }

      if (templateId) {
        template = await db.checklist.findUnique({ where: { id: templateId } });
      }

      if (!template) {
        return NextResponse.json({ jobChecklist: null, autoCreated: false });
      }

      const items = flattenTemplateToItems(template.sectionsJson);
      jobChecklist = await db.jobChecklist.create({
        data: {
          tenantId,
          jobId: id,
          customerId: job.customerId || null,
          templateId: template.id,
          name: template.title || 'Checklist',
          itemsJson: JSON.stringify(items),
          status: 'in_progress',
        },
      });

      return NextResponse.json({ jobChecklist, autoCreated: true });
    }

    return NextResponse.json({ jobChecklist, autoCreated: false });
  } catch (error) {
    console.error('Error fetching job checklist:', error);
    return NextResponse.json({ error: 'Failed to fetch job checklist' }, { status: 500 });
  }
}

// ─── POST /api/jobs/[id]/checklist ─────────────────────────────────────────
// Create a JobChecklist for the job from a template (body: { templateId }) or
// from scratch (body: { name, itemsJson }). If one already exists, returns it.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    const job = await db.job.findUnique({
      where: { id },
      select: { id: true, customerId: true, workspaceId: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const existing = await db.jobChecklist.findFirst({ where: { jobId: id } });
    if (existing) {
      return NextResponse.json({ jobChecklist: existing, created: false });
    }

    const tenantId = await resolveTenantIdForJob(job.workspaceId, user.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not resolved for job' }, { status: 400 });
    }

    let name = 'Checklist';
    let templateId: string | null = null;
    let items: Array<Record<string, unknown>> = [];

    if (body.templateId) {
      const template = await db.checklist.findUnique({ where: { id: body.templateId } });
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      name = template.title || 'Checklist';
      templateId = template.id;
      items = flattenTemplateToItems(template.sectionsJson);
    } else {
      name = (body.name || 'Checklist').toString().slice(0, 200);
      if (Array.isArray(body.itemsJson)) {
        items = body.itemsJson;
      } else if (typeof body.itemsJson === 'string') {
        try {
          const p = JSON.parse(body.itemsJson);
          if (Array.isArray(p)) items = p;
        } catch {
          items = [];
        }
      }
    }

    const jobChecklist = await db.jobChecklist.create({
      data: {
        tenantId,
        jobId: id,
        customerId: job.customerId || null,
        templateId,
        name,
        itemsJson: JSON.stringify(items),
        status: 'in_progress',
      },
    });

    return NextResponse.json({ jobChecklist, created: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating job checklist:', error);
    return NextResponse.json({ error: 'Failed to create job checklist' }, { status: 500 });
  }
}

// ─── PATCH /api/jobs/[id]/checklist ────────────────────────────────────────
// Update itemsJson or mark the checklist completed.
// Body: { itemsJson: [...] } | { status: 'completed' | 'in_progress' | 'skipped' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    const job = await db.job.findUnique({
      where: { id },
      select: { id: true, customerId: true, workspaceId: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const existing = await db.jobChecklist.findFirst({ where: { jobId: id } });
    if (!existing) {
      return NextResponse.json({ error: 'JobChecklist not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.itemsJson !== undefined) {
      updateData.itemsJson =
        typeof body.itemsJson === 'string'
          ? body.itemsJson
          : JSON.stringify(body.itemsJson ?? []);
    }

    if (body.status === 'completed') {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
      updateData.completedBy = user.id;
      updateData.completedByName = user.name || null;

      const tenantId = await resolveTenantIdForJob(job.workspaceId, user.tenantId);
      if (tenantId && job.customerId) {
        try {
          await db.customerTimelineEntry.create({
            data: {
              tenantId,
              customerId: job.customerId,
              entryType: 'job',
              title: `Checklist completed: ${existing.name}`,
              description: `Checklist marked as completed for job #${id.slice(-6)}.`,
              sourceType: 'Job',
              sourceId: id,
              metadataJson: JSON.stringify({
                jobChecklistId: existing.id,
                checklistName: existing.name,
              }),
              actorId: user.id,
              actorName: user.name || null,
              actorType: 'user',
              eventDate: new Date(),
            },
          });
        } catch (e) {
          console.error('Error creating checklist-completion timeline entry:', e);
        }
      }
    } else if (typeof body.status === 'string') {
      updateData.status = body.status;
    }

    const jobChecklist = await db.jobChecklist.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({ jobChecklist });
  } catch (error) {
    console.error('Error updating job checklist:', error);
    return NextResponse.json({ error: 'Failed to update job checklist' }, { status: 500 });
  }
}
