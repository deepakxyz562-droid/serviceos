import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { cache } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, workspaces: true, leads: true, subscriptions: true, conversations: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get latest subscription
    let latestSubscription = null;
    try {
      const subs = await db.subscription.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (subs.length > 0) {
        latestSubscription = subs[0];
      }
    } catch {
      // Subscription query may fail
    }

    return NextResponse.json({
      tenant: {
        ...tenant,
        latestSubscription,
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Tenant GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Verify tenant exists
    const existing = await db.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle suspend/unsuspend
    if (body.status === 'suspended') {
      if (!body.reason?.trim()) {
        return NextResponse.json({ error: 'Reason is required for suspension' }, { status: 400 });
      }
      updateData.planStatus = 'suspended';
      updateData.suspendedAt = new Date().toISOString();
      updateData.suspensionReason = body.reason.trim();
    } else if (body.status === 'active') {
      updateData.planStatus = 'active';
      updateData.suspendedAt = null;
      updateData.suspensionReason = null;
    }

    // Handle name update
    if (body.name !== undefined && typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    // Handle plan update
    if (body.plan !== undefined && typeof body.plan === 'string') {
      updateData.plan = body.plan;
    }

    // Handle planStatus update (if not using status field)
    if (body.planStatus !== undefined && !body.status) {
      updateData.planStatus = body.planStatus;
      if (body.planStatus === 'suspended' && body.reason) {
        updateData.suspendedAt = new Date().toISOString();
        updateData.suspensionReason = body.reason;
      } else if (body.planStatus === 'active') {
        updateData.suspendedAt = null;
        updateData.suspensionReason = null;
      }
    }

    // Handle other updatable fields
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.onboardingCompleted !== undefined) updateData.onboardingCompleted = body.onboardingCompleted;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    // Invalidate relevant caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('[SuperAdmin Tenant PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

// ─── Hard-delete cascade helper ─────────────────────────────────────────────
//
// The Tenant model has 30+ direct relations; the full schema has 140 models
// (~101 with a `tenantId` column, ~10 with only `workspaceId`). We hard-delete
// by calling `db.<model>.deleteMany()` for every model — this works across ALL
// database backends (SQLite, PostgreSQL, Supabase REST adapter) without any
// raw SQL.
//
// Foreign-key constraints can block deletion (child rows referencing the rows
// we're trying to delete). We handle this with a MULTI-PASS strategy:
//   Pass 1: try every model. Tables with no blocking FKs succeed.
//   Pass 2+: retry only the models that failed. By now their dependents are
//            gone, so they succeed too.
//   After MAX_PASSES, any still-failing models are logged but we proceed to
//   delete the Tenant itself (which will throw if blocked — surfaced as 500).
//
// (The Supabase REST adapter silently returns {count:0} on FK errors instead
//  of throwing, so we also verify with a `count()` check after each delete.)
// ────────────────────────────────────────────────────────────────────────────

// 101 models that have a `tenantId` column (auto-extracted from schema).
const TENANT_SCOPED_MODELS = [
  'ActivityLog', 'AdCampaign', 'AdConversion', 'AgentMonitor', 'AnalyticsSnapshot',
  'Announcement', 'AppNotification', 'AssetServiceHistory', 'AuditLogEntry',
  'BillingEvent', 'Booking', 'BrandKit', 'Campaign', 'CampaignTemplate',
  'ChannelConfig', 'ChatLabel', 'Chatbot', 'ChatbotSession', 'CommunicationProvider',
  'Contact', 'ContactExport', 'ContactImport', 'Conversation', 'ConversationExport',
  'CustomerAsset', 'CustomerJourney', 'CustomerPortalSession', 'CustomerTimelineEntry',
  'DataRetentionPolicy', 'Deal', 'Document', 'EcommerceOrder', 'EcommerceProduct',
  'EcommerceSyncLog', 'EmailProvider', 'EmailTemplate', 'EmployeePerformance',
  'EmployeeShift', 'EventWebhook', 'Expense', 'FeatureFlag', 'Form', 'FormResponse',
  'GPSLocation', 'GoogleAdsLead', 'GoogleAdsLeadConfig', 'Group',
  'HubIntegrationConnection', 'ImageLibrary', 'InboxMessage', 'IntegrationConfig',
  'IntegrationConnection', 'Invitation', 'Invoice', 'JobChecklist', 'JobPhoto',
  'JobSignature', 'JobTimeEntry', 'JobVisit', 'JourneyExecution', 'JourneyWorkflow',
  'KnowledgeArticle', 'Lead', 'MarketplaceTemplate', 'MenuItemConfig', 'MetaLead',
  'MetaLeadConfig', 'Notification', 'NotificationLog', 'NotificationPreference',
  'OfflineMutation', 'OtpVerification', 'PaymentMethod', 'PublicChatSession',
  'PushSubscription', 'Quote', 'RecurringInvoice', 'RetargetingLog',
  'RetargetingRule', 'Review', 'RolePermission', 'RouteHistory', 'SecurityEvent',
  'Segment', 'Service', 'Subscription', 'SubscriptionPayment', 'SupportCategory',
  'SupportTicket', 'Tag', 'TimelineEvent', 'TriggerExecution', 'UnifiedMessage',
  'User', 'WAForm', 'WAFormResponse', 'WAWebview', 'WebhookEndpoint', 'Workflow',
  'WorkflowAutomation', 'Workspace',
];

// 10 models that have `workspaceId` but NOT `tenantId`.
const WORKSPACE_ONLY_MODELS = [
  'Checklist', 'ContactList', 'Credential', 'Customer', 'Employee',
  'Folder', 'Job', 'Resource', 'Variable', 'WebhookSource',
];

/** Convert PascalCase model name → Prisma client property (camelCase-first). */
function toModelKey(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

interface CascadeResult {
  tablesCleared: number;
  workspacesRemoved: number;
  failedTables: string[];
}

async function hardDeleteTenantCascade(tenantId: string): Promise<CascadeResult> {
  // 1. Collect workspace IDs for this tenant (for workspace-only-scoped tables)
  const workspaces = await db.workspace.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const wsIds = workspaces.map((w) => w.id);

  // 2. Multi-pass delete
  const MAX_PASSES = 6;
  const pendingTenant = new Set(TENANT_SCOPED_MODELS);
  const pendingWs = new Set(WORKSPACE_ONLY_MODELS);
  const permanentlyFailed: string[] = [];
  let tablesCleared = 0;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    if (pendingTenant.size === 0 && pendingWs.size === 0) break;
    let progressThisPass = false;

    // ── Tenant-scoped models: delete by tenantId ──
    for (const model of [...pendingTenant]) {
      const key = toModelKey(model);
      try {
        await (db as unknown as Record<string, { deleteMany: (args: { where: { tenantId: string } }) => Promise<{ count: number }> }>)[key].deleteMany({ where: { tenantId } });
        // Verify (handles Supabase adapter's silent-error behavior)
        const remaining = await (db as unknown as Record<string, { count: (args: { where: { tenantId: string } }) => Promise<number> }>)[key].count({ where: { tenantId } });
        if (remaining === 0) {
          pendingTenant.delete(model);
          tablesCleared++;
          progressThisPass = true;
        }
      } catch {
        // FK violation — will retry in next pass
      }
    }

    // ── Workspace-only-scoped models: delete by workspaceId IN (...)
    if (wsIds.length > 0) {
      for (const model of [...pendingWs]) {
        const key = toModelKey(model);
        try {
          await (db as unknown as Record<string, { deleteMany: (args: { where: { workspaceId: { in: string[] } } }) => Promise<{ count: number }> }>)[key].deleteMany({ where: { workspaceId: { in: wsIds } } });
          const remaining = await (db as unknown as Record<string, { count: (args: { where: { workspaceId: { in: string[] } } }) => Promise<number> }>)[key].count({ where: { workspaceId: { in: wsIds } } });
          if (remaining === 0) {
            pendingWs.delete(model);
            tablesCleared++;
            progressThisPass = true;
          }
        } catch {
          // FK violation — will retry in next pass
        }
      }
    }

    // If no progress was made this pass, remaining tables are blocked by
    // circular deps or missing permissions — stop retrying.
    if (!progressThisPass) break;
  }

  // Collect anything that couldn't be cleared
  for (const m of pendingTenant) permanentlyFailed.push(m);
  for (const m of pendingWs) permanentlyFailed.push(m);

  return {
    tablesCleared,
    workspacesRemoved: wsIds.length,
    failedTables: permanentlyFailed,
  };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    // Verify tenant exists
    const existing = await db.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // ─── HARD DELETE (permanent, irreversible) ─────────────────────────────
    // Deletes the tenant + ALL related data across 111 tables using Prisma's
    // standard model API (works on SQLite, PostgreSQL, and Supabase REST).
    // Multi-pass retry handles foreign-key constraint ordering automatically.
    const result = await hardDeleteTenantCascade(id);

    // Finally, delete the Tenant row itself.
    // (By now all FK references to it should be gone; if any remain due to
    // permanently-failed tables, this will throw and the whole operation
    // rolls back conceptually — the tenant stays but its data is mostly gone.)
    try {
      await db.tenant.delete({ where: { id } });
    } catch (delErr) {
      console.error('[SuperAdmin Tenant DELETE] Could not delete tenant row (FK blocked):', delErr);
      console.error('[SuperAdmin Tenant DELETE] Tables that could not be cleared:', result.failedTables);
      return NextResponse.json(
        {
          error: `Could not fully delete tenant — ${result.failedTables.length} table(s) still have referenced rows. See server logs.`,
          failedTables: result.failedTables,
          tablesCleared: result.tablesCleared,
        },
        { status: 500 },
      );
    }

    // Invalidate caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({
      success: true,
      message: `Tenant "${existing.name}" permanently deleted. ${result.tablesCleared} table(s) cleared, ${result.workspacesRemoved} workspace(s) removed.`,
      tablesCleared: result.tablesCleared,
      workspacesRemoved: result.workspacesRemoved,
      failedTables: result.failedTables.length > 0 ? result.failedTables : undefined,
    });
  } catch (error) {
    console.error('[SuperAdmin Tenant DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
  }
}
