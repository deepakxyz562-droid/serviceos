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

      return NextResponse.json({
        jobChecklist,
        checklist: jobChecklist,
        items,
        autoCreated: true,
      });
    }

    const parsedItems = (() => {
      try {
        const p = JSON.parse(jobChecklist.itemsJson || '[]');
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    })();

    return NextResponse.json({
      jobChecklist,
      checklist: jobChecklist,
      items: parsedItems,
      autoCreated: false,
    });
  } catch (error) {
    console.error('Error fetching job checklist:', error);
    return NextResponse.json({ error: 'Failed to fetch job checklist' }, { status: 500 });
  }
}

// ─── POST /api/jobs/[id]/checklist ─────────────────────────────────────────
// Create or upsert a JobChecklist for the job from a template (body: { templateId })
// or direct items (body: { items } or { itemsJson }).
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

    // Extract items from body.items, body.itemsJson, or body.sectionsJson
    let itemsFromBody: Array<Record<string, unknown>> | null = null;
    const itemsCandidate = body.items !== undefined ? body.items : body.itemsJson;
    if (itemsCandidate !== undefined) {
      if (Array.isArray(itemsCandidate)) {
        itemsFromBody = itemsCandidate;
      } else if (typeof itemsCandidate === 'string') {
        try {
          const p = JSON.parse(itemsCandidate);
          if (Array.isArray(p)) itemsFromBody = p;
        } catch {
          itemsFromBody = [];
        }
      }
    }

    const existing = await db.jobChecklist.findFirst({ where: { jobId: id } });
    if (existing) {
      // Upsert: update existing checklist items, status, and name
      const updateData: Record<string, unknown> = {};
      if (itemsFromBody !== null) {
        updateData.itemsJson = JSON.stringify(itemsFromBody);
      } else if (body.templateId) {
        const template = await db.checklist.findUnique({ where: { id: body.templateId } });
        if (template) {
          updateData.templateId = template.id;
          updateData.name = template.title || existing.name;
          updateData.itemsJson = JSON.stringify(flattenTemplateToItems(template.sectionsJson));
        }
      }

      if (typeof body.name === 'string' && body.name.trim()) {
        updateData.name = body.name.trim().slice(0, 200);
      }

      if (body.status === 'completed') {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
        updateData.completedBy = user.id;
        updateData.completedByName = user.name || null;
      } else if (typeof body.status === 'string') {
        updateData.status = body.status;
      }

      const updated = Object.keys(updateData).length > 0
        ? await db.jobChecklist.update({
            where: { id: existing.id },
            data: updateData,
          })
        : existing;

      if (body.status === 'completed') {
        const tenantId = await resolveTenantIdForJob(job.workspaceId, user.tenantId);
        if (tenantId && job.customerId) {
          try {
            await db.customerTimelineEntry.create({
              data: {
                tenantId,
                customerId: job.customerId,
                entryType: 'job',
                title: `Checklist completed: ${updated.name}`,
                description: `Checklist marked as completed for job #${id.slice(-6)}.`,
                sourceType: 'Job',
                sourceId: id,
                metadataJson: JSON.stringify({
                  jobChecklistId: updated.id,
                  checklistName: updated.name,
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
      }

      const parsedItems = (() => {
        try {
          const p = JSON.parse(updated.itemsJson || '[]');
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      })();

      return NextResponse.json({
        jobChecklist: updated,
        checklist: updated,
        items: parsedItems,
        created: false,
        updated: true,
      });
    }

    const tenantId = await resolveTenantIdForJob(job.workspaceId, user.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not resolved for job' }, { status: 400 });
    }

    let name = (body.name || 'Checklist').toString().slice(0, 200);
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
    } else if (itemsFromBody !== null) {
      items = itemsFromBody;
    }

    const isCompleted = body.status === 'completed';
    const status = isCompleted ? 'completed' : (body.status || 'in_progress');

    const jobChecklist = await db.jobChecklist.create({
      data: {
        tenantId,
        jobId: id,
        customerId: job.customerId || null,
        templateId,
        name,
        itemsJson: JSON.stringify(items),
        status,
        ...(isCompleted
          ? {
              completedAt: new Date(),
              completedBy: user.id,
              completedByName: user.name || null,
            }
          : {}),
      },
    });

    if (isCompleted && job.customerId) {
      try {
        await db.customerTimelineEntry.create({
          data: {
            tenantId,
            customerId: job.customerId,
            entryType: 'job',
            title: `Checklist completed: ${name}`,
            description: `Checklist marked as completed for job #${id.slice(-6)}.`,
            sourceType: 'Job',
            sourceId: id,
            metadataJson: JSON.stringify({
              jobChecklistId: jobChecklist.id,
              checklistName: name,
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

    return NextResponse.json(
      {
        jobChecklist,
        checklist: jobChecklist,
        items,
        created: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating job checklist:', error);
    return NextResponse.json({ error: 'Failed to create job checklist' }, { status: 500 });
  }
}

// ─── PATCH /api/jobs/[id]/checklist ────────────────────────────────────────
// Update itemsJson or mark the checklist completed.
// Body: { items: [...] } | { itemsJson: [...] } | { status: 'completed' | 'in_progress' | 'skipped' }
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

    const itemsCandidate = body.items !== undefined ? body.items : body.itemsJson;
    if (itemsCandidate !== undefined) {
      updateData.itemsJson =
        typeof itemsCandidate === 'string'
          ? itemsCandidate
          : JSON.stringify(itemsCandidate ?? []);
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

    const parsedItems = (() => {
      try {
        const p = JSON.parse(jobChecklist.itemsJson || '[]');
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    })();

    return NextResponse.json({
      jobChecklist,
      checklist: jobChecklist,
      items: parsedItems,
    });
  } catch (error) {
    console.error('Error updating job checklist:', error);
    return NextResponse.json({ error: 'Failed to update job checklist' }, { status: 500 });
  }
}
