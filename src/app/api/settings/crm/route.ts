import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * CRM Settings — tenant-scoped configuration for the CRM experience.
 * Mirrors the Jobber "CRM Settings" page: lost reason codes, lead
 * sources (built-in + custom), and salesperson assignment rules.
 *
 * Storage: lives under the `crmSettings` key inside
 * `Tenant.settingsJson`. No new Prisma models are introduced for these
 * specific sub-settings — pipeline STAGES live in their own
 * `PipelineStage` table (see `/api/pipeline/stages`), but the smaller
 * CRM config (reasons, sources, assignment rules) is JSON-persisted
 * for simplicity.
 *
 * Supabase-safe: `tenant.findUnique` (by id) + `tenant.update` (by id)
 * only — no compound-unique upsert, no raw SQL.
 */

// ─── Lost Reason Codes ────────────────────────────────────────────────────

/** Default lost-reason codes seeded into every new tenant. */
const DEFAULT_LOST_REASONS: string[] = [
  'Price too high',
  'Went with competitor',
  'No response',
  'Project cancelled',
  'Not a fit',
];

const MAX_LOST_REASONS = 50;

// ─── Lead Sources ─────────────────────────────────────────────────────────

/** A lead source entry — `value` is the stable slug stored on Lead.source. */
export interface LeadSourceOption {
  value: string;
  label: string;
  /** true for built-in sources (read-only in the UI, can't be deleted). */
  isSystem?: boolean;
}

/**
 * Built-in lead sources. These match the 29 SOURCE_CONFIG entries in
 * `leads-view.tsx` so the CRM settings page can render them as a
 * read-only "system sources" group. Custom sources added by the tenant
 * appear alongside them.
 */
export const BUILTIN_LEAD_SOURCES: LeadSourceOption[] = [
  { value: 'website', label: 'Website', isSystem: true },
  { value: 'whatsapp', label: 'WhatsApp', isSystem: true },
  { value: 'wordpress', label: 'WordPress', isSystem: true },
  { value: 'google', label: 'Google', isSystem: true },
  { value: 'facebook', label: 'Facebook', isSystem: true },
  { value: 'instagram', label: 'Instagram', isSystem: true },
  { value: 'referral', label: 'Referral', isSystem: true },
  { value: 'manual', label: 'Manual', isSystem: true },
  { value: 'webform', label: 'Web Form', isSystem: true },
  { value: 'jotform', label: 'JotForm', isSystem: true },
  { value: 'typeform', label: 'Typeform', isSystem: true },
  { value: 'google-forms', label: 'Google Forms', isSystem: true },
  { value: 'form', label: 'Form', isSystem: true },
  { value: 'embed', label: 'Embed', isSystem: true },
  { value: 'hosted_link', label: 'Hosted Link', isSystem: true },
  { value: 'ai_receptionist', label: 'AI Receptionist', isSystem: true },
  { value: 'lead_discovery', label: 'Lead Discovery', isSystem: true },
  { value: 'public_booking', label: 'Public Booking', isSystem: true },
  { value: 'public_quote', label: 'Public Quote', isSystem: true },
  { value: 'public_request', label: 'Public Request', isSystem: true },
  { value: 'google_ads', label: 'Google Ads', isSystem: true },
  { value: 'meta_ads', label: 'Meta Ads', isSystem: true },
  { value: 'justdial', label: 'JustDial', isSystem: true },
  { value: 'marketplace', label: 'Marketplace', isSystem: true },
  { value: 'api', label: 'API', isSystem: true },
  { value: 'webhook', label: 'Webhook', isSystem: true },
  { value: 'email', label: 'Email', isSystem: true },
  { value: 'sms', label: 'SMS', isSystem: true },
  { value: 'phone', label: 'Phone', isSystem: true },
];

const MAX_CUSTOM_SOURCES = 50;

// ─── Salesperson Assignment Rules ─────────────────────────────────────────

export interface AssignmentRules {
  /** When true, new leads are auto-assigned to the default salesperson. */
  autoAssignNewLeads: boolean;
  /** User.id of the default salesperson (only used when autoAssignNewLeads=true
   *  AND roundRobinAssignment=false). */
  defaultSalespersonId: string | null;
  /** When true, leads are distributed round-robin across all salespeople
   *  instead of always going to `defaultSalespersonId`. */
  roundRobinAssignment: boolean;
}

// ─── Top-level CrmSettings shape ──────────────────────────────────────────

export interface CrmSettings {
  lostReasons: string[];
  /** Built-ins are always present (re-merged on read) — only the CUSTOM
   *  sources are persisted here to avoid duplicating BUILTIN_LEAD_SOURCES. */
  customLeadSources: LeadSourceOption[];
  assignmentRules: AssignmentRules;
}

export const DEFAULT_CRM_SETTINGS: CrmSettings = {
  lostReasons: [...DEFAULT_LOST_REASONS],
  customLeadSources: [],
  assignmentRules: {
    autoAssignNewLeads: false,
    defaultSalespersonId: null,
    roundRobinAssignment: false,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function safeParse(
  str: string | null | undefined,
  fallback: unknown = {},
): unknown {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/** Coerce an unknown `lostReasons` input into a clean string[]. */
function normalizeLostReasons(input: unknown): string[] {
  if (!Array.isArray(input)) return [...DEFAULT_LOST_REASONS];
  const out: string[] = [];
  for (const r of input) {
    if (typeof r !== 'string') continue;
    const trimmed = r.trim();
    if (!trimmed) continue;
    if (out.includes(trimmed)) continue; // de-dupe
    out.push(trimmed);
    if (out.length >= MAX_LOST_REASONS) break;
  }
  // If the caller sent an empty list, fall back to defaults so the UI
  // never renders an empty "Lost reasons" card.
  if (out.length === 0) return [...DEFAULT_LOST_REASONS];
  return out;
}

/** Coerce an unknown `customLeadSources` input into a clean LeadSourceOption[]. */
function normalizeCustomLeadSources(input: unknown): LeadSourceOption[] {
  if (!Array.isArray(input)) return [];
  const out: LeadSourceOption[] = [];
  const seenValues = new Set<string>(BUILTIN_LEAD_SOURCES.map((s) => s.value));
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const value = typeof r.value === 'string' ? r.value.trim().toLowerCase() : '';
    const label = typeof r.label === 'string' ? r.label.trim() : '';
    if (!value || !label) continue;
    if (seenValues.has(value)) continue; // skip dupes / built-ins
    seenValues.add(value);
    out.push({ value, label, isSystem: false });
    if (out.length >= MAX_CUSTOM_SOURCES) break;
  }
  return out;
}

/** Coerce an unknown `assignmentRules` input into a fully-formed AssignmentRules. */
function normalizeAssignmentRules(input: unknown): AssignmentRules {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const autoAssignNewLeads = Boolean(src.autoAssignNewLeads);
  const defaultSalespersonId =
    typeof src.defaultSalespersonId === 'string' && src.defaultSalespersonId.trim().length > 0
      ? src.defaultSalespersonId.trim()
      : null;
  const roundRobinAssignment = Boolean(src.roundRobinAssignment);
  return { autoAssignNewLeads, defaultSalespersonId, roundRobinAssignment };
}

/** Coerce + validate an incoming body into a fully-formed CrmSettings. */
function normalizeCrmSettings(input: unknown): CrmSettings {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    lostReasons: normalizeLostReasons(src.lostReasons),
    customLeadSources: normalizeCustomLeadSources(src.customLeadSources),
    assignmentRules: normalizeAssignmentRules(src.assignmentRules),
  };
}

// GET /api/settings/crm — read CRM settings for the current tenant.
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const parsed = safeParse(tenant.settingsJson, {}) as Record<string, unknown>;
    const stored = (parsed.crmSettings as Record<string, unknown> | undefined) || {};

    const settings: CrmSettings = {
      lostReasons: normalizeLostReasons(stored.lostReasons),
      customLeadSources: normalizeCustomLeadSources(stored.customLeadSources),
      assignmentRules: normalizeAssignmentRules(stored.assignmentRules),
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('CRM settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load CRM settings' },
      { status: 500 },
    );
  }
}

// PUT /api/settings/crm — update CRM settings for the current tenant.
// Body: the full CrmSettings object (partial updates tolerated via
// deep-merge with stored values).
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }
    if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners, admins, and managers can update CRM settings' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const incoming = normalizeCrmSettings(body);

    // ─── Deep-merge into existing settingsJson ───────────────────────────
    // Preserve unrelated keys (workSettings, timesheetSettings, etc.).
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const current = safeParse(tenant?.settingsJson, {}) as Record<string, unknown>;
    const storedCrm = (current.crmSettings as Record<string, unknown> | undefined) || {};

    const merged: CrmSettings = {
      lostReasons: incoming.lostReasons,
      customLeadSources: incoming.customLeadSources,
      assignmentRules: incoming.assignmentRules,
    };
    // Preserve any keys the caller didn't send (defensive — should rarely
    // happen since the UI sends the full object, but it keeps PUT
    // idempotent for partial clients).
    if (storedCrm.lostReasons && incoming.lostReasons.length === 0) {
      merged.lostReasons = normalizeLostReasons(storedCrm.lostReasons);
    }

    const nextSettings = { ...current, crmSettings: merged };
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(nextSettings) },
    });
    return NextResponse.json({ settings: merged });
  } catch (error) {
    console.error('CRM settings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to save CRM settings' },
      { status: 500 },
    );
  }
}
