import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Work Settings — tenant-scoped configuration for quotes, jobs, invoices,
 * statements, and chemical tracking. Mirrors the Jobber / ServiceTitan
 * "Work settings" page.
 *
 * Storage: lives under the `workSettings` key inside `Tenant.settingsJson`.
 * No new Prisma models are introduced — see `prisma/schema.prisma` →
 * `Tenant.settingsJson` (String @default("{}")).
 */

export interface WorkSettings {
  quotes: {
    reminderEnabled: boolean;
    reminderDays: number;
  };
  jobs: {
    defaultArrivalWindow: string;
    arrivalWindowStyle: 'after' | 'center';
    visitTitleTemplate: string;
  };
  invoices: {
    subject: string;
    useQuoteJobTitle: boolean;
    defaultResidentialTerm: string;
    defaultCommercialTerm: string;
    invoiceRemindersAssigneeId: string | null;
  };
  statements: {
    sortOrder: 'newest' | 'oldest';
    contractDisclaimer: string;
  };
  chemicalTracking: {
    enabled: boolean;
  };
}

export const DEFAULT_WORK_SETTINGS: WorkSettings = {
  quotes: {
    reminderEnabled: false,
    reminderDays: 3,
  },
  jobs: {
    defaultArrivalWindow: 'none',
    arrivalWindowStyle: 'after',
    visitTitleTemplate: '{{CLIENT_NAME}} - {{JOB_TITLE}}',
  },
  invoices: {
    subject: 'For Services Rendered',
    useQuoteJobTitle: false,
    defaultResidentialTerm: 'due_on_receipt',
    defaultCommercialTerm: 'net_30',
    invoiceRemindersAssigneeId: null,
  },
  statements: {
    sortOrder: 'newest',
    contractDisclaimer: '',
  },
  chemicalTracking: {
    enabled: false,
  },
};

/** Allowed values for the dropdowns — used to validate the PUT body. */
const ARRIVAL_WINDOWS = ['none', '15m', '30m', '1h', '2h', '3h', '4h'];
const ARRIVAL_WINDOW_STYLES = ['after', 'center'] as const;
const PAYMENT_TERMS = [
  'due_on_receipt',
  'net_7',
  'net_15',
  'net_30',
  'net_45',
  'net_60',
  'end_of_month',
  'end_of_next_month',
];
const SORT_ORDERS = ['newest', 'oldest'] as const;

function safeParse(str: string | null | undefined, fallback: unknown = {}): unknown {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/** Coerce + validate an incoming body into a fully-formed WorkSettings. */
function normalizeWorkSettings(input: unknown): WorkSettings {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const quotes = (src.quotes as Record<string, unknown> | undefined) || {};
  const jobs = (src.jobs as Record<string, unknown> | undefined) || {};
  const invoices = (src.invoices as Record<string, unknown> | undefined) || {};
  const statements = (src.statements as Record<string, unknown> | undefined) || {};
  const chem = (src.chemicalTracking as Record<string, unknown> | undefined) || {};

  const reminderDays = Number(quotes.reminderDays);
  const arrivalWindow =
    typeof jobs.defaultArrivalWindow === 'string' && ARRIVAL_WINDOWS.includes(jobs.defaultArrivalWindow)
      ? jobs.defaultArrivalWindow
      : DEFAULT_WORK_SETTINGS.jobs.defaultArrivalWindow;
  const arrivalWindowStyle =
    typeof jobs.arrivalWindowStyle === 'string' &&
    (ARRIVAL_WINDOW_STYLES as readonly string[]).includes(jobs.arrivalWindowStyle)
      ? (jobs.arrivalWindowStyle as 'after' | 'center')
      : DEFAULT_WORK_SETTINGS.jobs.arrivalWindowStyle;
  const residentialTerm =
    typeof invoices.defaultResidentialTerm === 'string' && PAYMENT_TERMS.includes(invoices.defaultResidentialTerm)
      ? invoices.defaultResidentialTerm
      : DEFAULT_WORK_SETTINGS.invoices.defaultResidentialTerm;
  const commercialTerm =
    typeof invoices.defaultCommercialTerm === 'string' && PAYMENT_TERMS.includes(invoices.defaultCommercialTerm)
      ? invoices.defaultCommercialTerm
      : DEFAULT_WORK_SETTINGS.invoices.defaultCommercialTerm;
  const sortOrder =
    typeof statements.sortOrder === 'string' && (SORT_ORDERS as readonly string[]).includes(statements.sortOrder)
      ? (statements.sortOrder as 'newest' | 'oldest')
      : DEFAULT_WORK_SETTINGS.statements.sortOrder;
  const assigneeId =
    invoices.invoiceRemindersAssigneeId === null ||
    (typeof invoices.invoiceRemindersAssigneeId === 'string' && invoices.invoiceRemindersAssigneeId.length > 0)
      ? (invoices.invoiceRemindersAssigneeId as string | null)
      : DEFAULT_WORK_SETTINGS.invoices.invoiceRemindersAssigneeId;

  return {
    quotes: {
      reminderEnabled: Boolean(quotes.reminderEnabled),
      reminderDays:
        Number.isFinite(reminderDays) && reminderDays > 0
          ? Math.floor(reminderDays)
          : DEFAULT_WORK_SETTINGS.quotes.reminderDays,
    },
    jobs: {
      defaultArrivalWindow: arrivalWindow,
      arrivalWindowStyle,
      visitTitleTemplate:
        typeof jobs.visitTitleTemplate === 'string' && jobs.visitTitleTemplate.trim().length > 0
          ? jobs.visitTitleTemplate
          : DEFAULT_WORK_SETTINGS.jobs.visitTitleTemplate,
    },
    invoices: {
      subject:
        typeof invoices.subject === 'string'
          ? invoices.subject
          : DEFAULT_WORK_SETTINGS.invoices.subject,
      useQuoteJobTitle: Boolean(invoices.useQuoteJobTitle),
      defaultResidentialTerm: residentialTerm,
      defaultCommercialTerm: commercialTerm,
      invoiceRemindersAssigneeId: assigneeId,
    },
    statements: {
      sortOrder,
      contractDisclaimer:
        typeof statements.contractDisclaimer === 'string' ? statements.contractDisclaimer : '',
    },
    chemicalTracking: {
      enabled: Boolean(chem.enabled),
    },
  };
}

/** Fetch employees for the tenant (used to populate the "Assigned To" dropdown). */
async function fetchTenantEmployees(
  tenantId: string,
): Promise<{ id: string; name: string; role: string }[]> {
  try {
    const tenantWorkspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
    if (workspaceIds.length === 0) return [];
    const employees = await db.employee.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    return employees;
  } catch {
    return [];
  }
}

// GET /api/settings/work — read work settings for the current tenant.
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const parsed = safeParse(tenant.settingsJson, {}) as Record<string, unknown>;
    const stored = (parsed.workSettings as Record<string, unknown> | undefined) || {};
    // Deep-merge defaults so any missing sub-keys are filled in.
    const settings: WorkSettings = {
      quotes: { ...DEFAULT_WORK_SETTINGS.quotes, ...((stored.quotes as Record<string, unknown>) || {}) },
      jobs: { ...DEFAULT_WORK_SETTINGS.jobs, ...((stored.jobs as Record<string, unknown>) || {}) },
      invoices: { ...DEFAULT_WORK_SETTINGS.invoices, ...((stored.invoices as Record<string, unknown>) || {}) },
      statements: { ...DEFAULT_WORK_SETTINGS.statements, ...((stored.statements as Record<string, unknown>) || {}) },
      chemicalTracking: {
        ...DEFAULT_WORK_SETTINGS.chemicalTracking,
        ...((stored.chemicalTracking as Record<string, unknown>) || {}),
      },
    };
    const employees = await fetchTenantEmployees(user.tenantId);
    return NextResponse.json({ settings, employees });
  } catch (error) {
    console.error('Work settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load work settings' }, { status: 500 });
  }
}

// PUT /api/settings/work — update work settings for the current tenant.
// Body: the full WorkSettings object (partial updates are tolerated via
// deep-merge with stored values).
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Only tenant owner / admin / manager can edit work settings.
    if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners, admins, and managers can update work settings' },
        { status: 403 },
      );
    }
    const body = await request.json();
    const incoming = normalizeWorkSettings(body);

    // Merge into the existing settingsJson so we don't clobber unrelated keys
    // (e.g. `invoiceAutomation`, `emailNotifications`, etc.).
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const current = safeParse(tenant?.settingsJson, {}) as Record<string, unknown>;
    const storedWork = (current.workSettings as Record<string, unknown>) || {};
    const merged: WorkSettings = {
      quotes: { ...DEFAULT_WORK_SETTINGS.quotes, ...(storedWork.quotes as object), ...incoming.quotes },
      jobs: { ...DEFAULT_WORK_SETTINGS.jobs, ...(storedWork.jobs as object), ...incoming.jobs },
      invoices: { ...DEFAULT_WORK_SETTINGS.invoices, ...(storedWork.invoices as object), ...incoming.invoices },
      statements: { ...DEFAULT_WORK_SETTINGS.statements, ...(storedWork.statements as object), ...incoming.statements },
      chemicalTracking: {
        ...DEFAULT_WORK_SETTINGS.chemicalTracking,
        ...(storedWork.chemicalTracking as object),
        ...incoming.chemicalTracking,
      },
    };
    const nextSettings = { ...current, workSettings: merged };
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(nextSettings) },
    });
    return NextResponse.json({ settings: merged });
  } catch (error) {
    console.error('Work settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to save work settings' }, { status: 500 });
  }
}
