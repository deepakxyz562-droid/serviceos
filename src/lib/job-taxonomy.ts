/**
 * Canonical taxonomies shared across PWA + Mobile + backend.
 *
 * These constants are the SINGLE SOURCE OF TRUTH for photo types and expense
 * categories. Both clients and all API routes should import from here so the
 * three surfaces (PWA, React Native mobile, backend validation) never drift.
 *
 * Historical note: the PWA originally used {before, after, progress, issue, other}
 * while the mobile app used {before, during, after, evidence}. To unify without
 * losing data, we normalize legacy mobile values on the server:
 *   during   → progress
 *   evidence → issue
 * The canonical set is the PWA's (it is richer: 'issue' is distinct from
 * generic 'other', and 'progress' is clearer than 'during').
 *
 * Expense categories similarly diverged: PWA used 8 capitalized labels, mobile
 * used 5 lowercase labels with 'labor' (mobile-only) and 'other' (→ Misc).
 * The canonical set is the PWA's 8 PLUS 'Labor' (added to cover the mobile-only
 * case). Lowercase inputs are title-cased on the server.
 */

// ── Photo types ──────────────────────────────────────────────────────────────

export const CANONICAL_PHOTO_TYPES = [
  'before',
  'after',
  'progress',
  'issue',
  'other',
] as const;

export type CanonicalPhotoType = (typeof CANONICAL_PHOTO_TYPES)[number];

/**
 * Map used by the backend to normalize legacy / mobile photo type values
 * before validation + storage. Keys are case-insensitive (lowered first).
 */
const PHOTO_TYPE_ALIASES: Record<string, CanonicalPhotoType> = {
  // legacy mobile values
  during: 'progress',
  evidence: 'issue',
  // case variants (defensive — clients should send canonical already)
  before: 'before',
  after: 'after',
  progress: 'progress',
  issue: 'issue',
  other: 'other',
};

/**
 * Normalize an incoming photoType to the canonical value.
 * Returns null if the input is not recognized.
 *
 * Used by /api/jobs/[id]/photos POST to accept both PWA and mobile uploads
 * without rejecting either side.
 */
export function normalizePhotoType(input: unknown): CanonicalPhotoType | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const key = input.trim().toLowerCase();
  return PHOTO_TYPE_ALIASES[key] ?? null;
}

// ── Expense categories ───────────────────────────────────────────────────────

export const CANONICAL_EXPENSE_CATEGORIES = [
  'General',
  'Travel',
  'Materials',
  'Fuel',
  'Food',
  'Tools',
  'Equipment',
  'Labor',
  'Misc',
] as const;

export type CanonicalExpenseCategory = (typeof CANONICAL_EXPENSE_CATEGORIES)[number];

/**
 * Map used by the backend to normalize legacy / mobile expense category values.
 * Keys are lowercased for case-insensitive matching.
 */
const EXPENSE_CATEGORY_ALIASES: Record<string, CanonicalExpenseCategory> = {
  // lowercase mobile values → canonical
  general: 'General',
  travel: 'Travel',
  materials: 'Materials',
  fuel: 'Fuel',
  food: 'Food',
  tools: 'Tools',
  equipment: 'Equipment',
  labor: 'Labor',
  labour: 'Labor', // UK spelling tolerance
  misc: 'Misc',
  miscellaneous: 'Misc',
  other: 'Misc',
};

/**
 * Normalize an incoming expense category to the canonical value.
 * - If the input matches a canonical label (case-insensitive), return it.
 * - If the input matches an alias (e.g. 'other' → 'Misc'), return the alias target.
 * - Otherwise return 'General' (safe default — never rejects).
 *
 * Used by /api/expenses POST so both PWA (capitalized) and mobile (lowercase)
 * uploads land in a consistent canonical form.
 */
export function normalizeExpenseCategory(input: unknown): CanonicalExpenseCategory {
  if (typeof input !== 'string' || !input.trim()) return 'General';
  const key = input.trim().toLowerCase();
  return EXPENSE_CATEGORY_ALIASES[key] ?? 'General';
}

// ── Status badge color mapping (shared across PWA + Mobile) ──────────────────
//
// Both clients previously had their own (different) color mappings for job
// lifecycle statuses. This single map is the canonical visual language.
// Keys are job lifecycle statuses. Values are a semantic token that each
// client maps to its own color system:
//   - PWA: maps to Tailwind classes (bg-amber-100 text-amber-700 etc.)
//   - Mobile: maps to Badge variants (primary/warning/info/success/destructive/default)
//
// Tokens used: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet' | 'slate' | 'cyan'

export type StatusColorToken =
  | 'emerald'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'slate'
  | 'cyan';

export const JOB_STATUS_COLOR_MAP: Record<string, StatusColorToken> = {
  // pre-work
  assigned: 'slate',
  pending: 'slate',
  accepted: 'blue',
  // travelling
  travelling: 'cyan',
  en_route: 'cyan',
  // arrived
  arrived: 'blue',
  // active work
  working: 'emerald',
  in_progress: 'emerald',
  paused: 'amber',
  on_hold: 'amber',
  // done
  completed: 'emerald',
  done: 'emerald',
  cancelled: 'rose',
  canceled: 'rose',
  rejected: 'rose',
  // invoicing
  invoiced: 'violet',
  paid: 'emerald',
};

/**
 * Resolve a status string to a color token. Falls back to 'slate'.
 */
export function getStatusColorToken(status: string | undefined | null): StatusColorToken {
  if (!status) return 'slate';
  return JOB_STATUS_COLOR_MAP[status.toLowerCase()] ?? 'slate';
}
