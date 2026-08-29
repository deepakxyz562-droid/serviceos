import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';
import { sendEmail } from '@/lib/email-send';
import { notifyOwner } from '@/lib/owner-notifications';
import { logActivity } from '@/lib/activity-log';
import { requireCrmTenant } from '@/lib/require-crm-tenant';
import { withCrmTrace } from '@/lib/crm-perf-trace';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getLeads, RpcFunctionNotFoundError } from '@/lib/supabase-rpc';

// ── C-2B.4: RPC availability cache ─────────────────────────────────────
// When the get_leads RPC function hasn't been applied to the database
// yet, each request would waste ~130-200ms on a failed .rpc() call before
// falling through to the original Promise.all path. This cache remembers
// the "not found" state for 5 minutes, so only the FIRST request after
// server startup (or after the 5-minute window expires) pays the overhead.
// Once the SQL is applied, the first successful RPC call sets
// `rpcAvailable = 'available'` and all subsequent requests use the fast
// RPC path (4 calls → 1, ~340ms → ~140-200ms).
let rpcAvailability: 'unknown' | 'available' | 'not_found' = 'unknown';
let rpcAvailabilityCheckedAt = 0;
const RPC_AVAILABILITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function shouldTryLeadsRpc(): boolean {
  if (!shouldUseSupabaseDB()) return false;
  if (rpcAvailability === 'available') return true;
  if (rpcAvailability === 'not_found') {
    // Re-check periodically so the RPC is picked up after the SQL is applied.
    return Date.now() - rpcAvailabilityCheckedAt > RPC_AVAILABILITY_TTL_MS;
  }
  return true; // 'unknown' — first request, try it
}

// GET /api/leads - List leads with optional status filter
async function _GET(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // ─── Tenant scoping (mirrors /api/deals pattern) ──────────────────
    // The caller's tenantId is the source of truth — NEVER show all leads.
    // Super-admins may pass ?tenantId= to scope to a specific tenant.
    // Authenticated users without a tenant (including superadmins who haven't
    // selected a tenant) get an empty list — NEVER everyone's data.
    let rpcTenantId: string | null = null;
    const where: Record<string, unknown> = {};
    if (authUser.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId');
      if (queryTenantId) {
        where.tenantId = queryTenantId;
        rpcTenantId = queryTenantId;
      } else {
        // Super-admin without ?tenantId= → return empty (was: RPC shows all — DATA LEAK)
        return NextResponse.json({
          leads: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    } else if (authUser.tenantId) {
      where.tenantId = authUser.tenantId;
      rpcTenantId = authUser.tenantId;
    } else {
      // Authenticated user without a tenant — return empty rather than
      // accidentally leaking unscoped leads.
      return NextResponse.json({
        leads: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    if (status) {
      where.status = status;
    }
    if (source) {
      where.source = source;
    }
    if (priority) {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // ── C-2B.4: Try the get_leads RPC first (4 → 1 call) ──────────────
    // The SQL function (supabase-rpc-leads.sql) consolidates the lead list +
    // count + Customer/Job/Employee JOINs into a single PostgREST round-trip.
    // Expected: ~140-200ms (vs ~275-507ms with the 4-call fallback).
    //
    // rpcTenantId is null ONLY for super-admins viewing all tenants — the
    // RPC handles NULL p_tenant_id as "no tenant filter" (shows all).
    //
    // AVAILABILITY CACHE: the first failed attempt caches "not_found" for
    // 5 minutes (see shouldTryLeadsRpc above), so subsequent requests
    // skip the failed RPC call and go straight to the fallback path.
    if (shouldTryLeadsRpc()) {
      try {
        const result = await getLeads(
          rpcTenantId,
          status,
          source,
          priority,
          search,
          page,
          limit,
        );
        // Success — cache the availability so future requests skip the check.
        rpcAvailability = 'available';
        rpcAvailabilityCheckedAt = Date.now();
        return NextResponse.json(result);
      } catch (err) {
        if (err instanceof RpcFunctionNotFoundError) {
          // Cache "not_found" so the next 5 minutes of requests skip the
          // failed RPC call and go straight to the fallback path.
          rpcAvailability = 'not_found';
          rpcAvailabilityCheckedAt = Date.now();
          console.warn(
            '[leads] get_leads RPC not found — ' +
              'using 4-call Promise.all fallback. Apply supabase-rpc-leads.sql to enable the RPC path.',
          );
        } else {
          throw err;
        }
      }
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          job: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List leads error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      name,
      phone,
      email,
      source,
      status,
      priority,
      value,
      description,
      address,
      serviceType,
      serviceId,
      assignedToId,
      notesJson,
      tagsJson,
      lineItemsJson,
      imagesJson,
      assessmentImagesJson,
      customerId,
      followUpAt,
    } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // ─── Customer de-duplication ────────────────────────────────
    // For leads coming from external sources (website, wordpress, whatsapp,
    // google, facebook, instagram, referral, …) we never want to create a
    // duplicate Customer record. If the caller did NOT already pass a
    // customerId, look up an existing customer in the caller's workspace by
    // phone (normalized — digits only) OR email; link the lead to that
    // customer if found. Only when no match exists do we create a new
    // Customer. Manual leads are exempt — the agent has already chosen
    // whether to link an existing customer via the picker.
    let resolvedCustomerId: string | null = customerId || null;

    const normalizedSource = (source || 'manual').toLowerCase();
    const isExternalSource = normalizedSource !== 'manual';

    if (isExternalSource && !resolvedCustomerId) {
      // Resolve the caller's workspace so we don't accidentally link a lead
      // to a customer that belongs to another tenant.
      let workspaceId: string | null = authUser?.workspaceId || null;
      if (!workspaceId && authUser?.tenantId) {
        const ws = await db.workspace.findFirst({
          where: { tenantId: authUser.tenantId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        workspaceId = ws?.id ?? null;
      }

      if (workspaceId) {
        const phoneDigits = (phone || '').replace(/\D/g, '');
        const emailTrim = (email || '').trim().toLowerCase();

        // Build a phone-match OR email-match query. We compare on the last 10
        // digits of the phone number so different formatting (+1 234… vs
        // 234…) still matches.
        const orClauses: Record<string, unknown>[] = [];
        if (phoneDigits.length >= 10) {
          const tail = phoneDigits.slice(-10);
          orClauses.push({ phone: { contains: tail } });
        } else if (phoneDigits.length > 0) {
          orClauses.push({ phone: { contains: phoneDigits } });
        }
        if (emailTrim) {
          orClauses.push({ email: { equals: emailTrim } });
        }

        let existingCustomer: { id: string } | null = null;
        if (orClauses.length > 0) {
          existingCustomer = await db.customer.findFirst({
            where: { workspaceId, OR: orClauses },
            select: { id: true },
          });
        }

        if (existingCustomer) {
          // Link to the existing customer — no duplicate created.
          resolvedCustomerId = existingCustomer.id;
        } else {
          // No match — create a new Customer scoped to the workspace.
          try {
            const newCustomer = await db.customer.create({
              data: {
                name: name.trim(),
                phone: phone.trim(),
                email: email?.trim() || null,
                address: address?.trim() || null,
                workspaceId,
                preferredCurrency: 'USD',
              },
              select: { id: true },
            });
            resolvedCustomerId = newCustomer.id;
          } catch (custErr) {
            console.error('[LeadsCreate] Failed to auto-create customer for external lead:', custErr);
            // Non-fatal — the lead will still be created without a customer link.
          }
        }
      }
    }

    const lead = await db.lead.create({
      data: {
        title: title || null,
        name,
        phone,
        email: email || null,
        source: source || 'manual',
        status: status || 'new',
        priority: priority || 'medium',
        value: value || 0,
        description: description || null,
        address: address || null,
        serviceType: serviceType || null,
        serviceId: serviceId || null,
        assignedToId: assignedToId || null,
        tenantId: authUser?.tenantId || null,
        notesJson: notesJson || '[]',
        tagsJson: tagsJson || '[]',
        lineItemsJson: lineItemsJson || '[]',
        imagesJson: imagesJson || '[]',
        assessmentImagesJson: assessmentImagesJson || '[]',
        customerId: resolvedCustomerId,
        followUpAt: followUpAt ? new Date(followUpAt) : null,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    // ─── Auto-create a linked Deal (HubSpot model) — non-blocking background task ───
    // Every Lead gets a matching Deal in the Sales Pipeline. We fire this in the
    // background so the POST /api/leads HTTP response returns immediately (<100ms).
    void db.deal.create({
      data: {
        title: lead.title || lead.name,
        value: lead.value || 0,
        currency: 'USD',
        stage: 'new_lead',
        probability: 10,
        customerId: lead.customerId || null,
        customerName: lead.name,
        customerPhone: lead.phone,
        assigneeId: lead.assignedToId || null,
        leadId: lead.id,
        source: lead.source || 'manual',
        notesJson: '[]',
        tenantId: lead.tenantId || null,
      },
    }).catch((dealErr) => {
      console.error('[LeadsCreate] Failed to auto-create Deal for lead:', dealErr);
    });

    // ─── Background side-effects (don't block the response) ──────
    // EventBus audit-log, owner email, and owner WhatsApp all run detached
    // so the lead appears in the list instantly. Errors are logged only.
    const leadTenantId = lead.tenantId;
    const creatorEmail = authUser?.email;
    const creatorName = authUser?.name;

    Promise.resolve()
      .then(async () => {
        // Emit lead.created event via EventBus (audit log + webhooks)
        try {
          await EventBus.emit('lead.created', {
            leadId: lead.id,
            name: lead.name,
            phone: lead.phone,
            source: lead.source,
            status: lead.status,
            serviceType: lead.serviceType,
            tenantId: lead.tenantId,
            resourceType: 'lead',
            resourceId: lead.id,
            summary: `New lead: ${lead.name} (${lead.source})`,
          }, { tenantId: lead.tenantId || undefined });
        } catch (eventErr) {
          console.error('[LeadsCreate] Failed to emit lead.created event:', eventErr);
        }

        if (!leadTenantId) return;

        // ─── Send "New Lead" email notification to the tenant owner ──
        try {
          const tenant = await db.tenant.findUnique({
            where: { id: leadTenantId },
            select: { id: true, name: true, email: true },
          });

          let notifyEmail: string | null = tenant?.email || null;
          let notifyName: string = tenant?.name || 'Team';

          if (!notifyEmail) {
            const owner = await db.user.findFirst({
              where: { tenantId: leadTenantId, role: 'owner', isActive: true },
              select: { email: true, name: true },
            });
            if (owner) {
              notifyEmail = owner.email;
              notifyName = owner.name || notifyName;
            }
          }
          if (!notifyEmail && creatorEmail) {
            notifyEmail = creatorEmail;
            notifyName = creatorName || notifyName;
          }

          if (notifyEmail) {
            const leadValue = lead.value
              ? `$${Number(lead.value).toLocaleString()}`
              : 'Not specified';

            const subject = `🎯 New Lead: ${lead.name}`;
            const html = [
              `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">`,
              `<h2 style="color: #10b981; margin-bottom: 16px;">🎯 New Lead Received</h2>`,
              `<p style="font-size: 16px; color: #374151;">Hi ${notifyName},</p>`,
              `<p style="font-size: 16px; color: #374151;">A new lead has been created in your Fieseros workspace. Here are the details:</p>`,
              `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">`,
              `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; width: 35%; border: 1px solid #e5e7eb;">Name</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.name}</td></tr>`,
              `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Phone</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.phone}</td></tr>`,
              `${lead.email ? `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Email</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.email}</td></tr>` : ''}`,
              `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Source</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.source}</td></tr>`,
              `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Service</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.serviceType || 'Not specified'}</td></tr>`,
              `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Priority</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.priority}</td></tr>`,
              `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Estimated Value</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${leadValue}</td></tr>`,
              `${lead.description ? `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb; vertical-align: top;">Description</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.description}</td></tr>` : ''}`,
              `</table>`,
              `<p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Follow up promptly to maximize conversion!</p>`,
              `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`,
              `<p style="font-size: 12px; color: #9ca3af;">— Sent from Fieseros</p>`,
              `</div>`,
            ].join('\n');

            const text = `New Lead Received\n\nName: ${lead.name}\nPhone: ${lead.phone}\n${lead.email ? `Email: ${lead.email}\n` : ''}Source: ${lead.source}\nService: ${lead.serviceType || 'N/A'}\nPriority: ${lead.priority}\nEstimated Value: ${leadValue}\n${lead.description ? `\nDescription: ${lead.description}\n` : ''}\nFollow up promptly!\n\n— Sent from Fieseros`;

            const result = await sendEmail({
              to: notifyEmail,
              subject,
              html,
              text,
              usageType: 'transactional',
              tenantId: leadTenantId || undefined,
            });

            if (result.simulated) {
              console.log(`[LeadsCreate] Email SIMULATED to ${notifyEmail} (no real provider configured)`);
            } else if (!result.success) {
              console.error(`[LeadsCreate] Failed to send lead email to ${notifyEmail}:`, result.error);
            } else {
              console.log(`[LeadsCreate] Lead email sent to ${notifyEmail} via ${result.providerUsed}`);
            }
          }
        } catch (emailErr) {
          console.error('[LeadsCreate] Lead email notification failed:', emailErr);
        }

        // ─── Send WhatsApp notification to the tenant owner ──────────────
        try {
          const leadValueStr = lead.value
            ? `$${Number(lead.value).toLocaleString()}`
            : 'N/A';
          const waMessage = [
            '🎯 *New Lead Received*',
            '',
            `*Name:* ${lead.name}`,
            `*Phone:* ${lead.phone}`,
            lead.email ? `*Email:* ${lead.email}` : '',
            `*Source:* ${lead.source}`,
            `*Service:* ${lead.serviceType || 'N/A'}`,
            `*Priority:* ${lead.priority}`,
            `*Value:* ${leadValueStr}`,
            lead.description ? `*Notes:* ${lead.description.slice(0, 120)}` : '',
            '',
            'Follow up promptly to maximize conversion!',
          ].filter(Boolean).join('\n');

          await notifyOwner(leadTenantId, {
            eventType: 'lead.created',
            eventLabel: 'New Lead',
            whatsappMessage: waMessage,
            // Plain-ASCII SMS body (no emojis) for reliable SNS delivery to
            // Indian (+91) numbers. Emojis force UCS-2 encoding which TRAI
            // frequently filters without a registered sender ID.
            smsMessage: `New Lead: ${lead.name}, ${lead.phone}, source: ${lead.source}, priority: ${lead.priority}, value: ${leadValueStr}. Follow up promptly.`,
            leadId: lead.id,
          });
        } catch (waErr) {
          console.error('[LeadsCreate] Owner WhatsApp notification failed:', waErr);
        }
      })
      .catch((err) => console.error('[LeadsCreate] Background side-effects failed:', err));

    // ─── V1.5 Activity Log ──────────────────────────────────────────
    // Best-effort — never fails the lead creation.
    try {
      if (lead.tenantId) {
        await logActivity({
          tenantId: lead.tenantId,
          actorId: authUser?.id,
          actorName: authUser?.name || authUser?.email,
          actorType: 'user',
          action: 'create',
          entityType: 'lead',
          entityId: lead.id,
          entityName: lead.name || lead.title || null,
          description: `New lead created: ${lead.name} (source: ${lead.source})`,
          metadataJson: JSON.stringify({
            source: lead.source,
            serviceType: lead.serviceType,
            priority: lead.priority,
            value: lead.value,
            status: lead.status,
          }),
          severity: 'info',
        });
      }
    } catch (logErr) {
      console.error('[LeadsCreate] Failed to log activity:', logErr);
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/leads', _GET);
