import { db } from '@/lib/db';

export interface SegmentRule {
  field: string;
  operator?: string;
  value: unknown;
}

const SCALAR_FIELDS = [
  'country',
  'city',
  'source',
  'status',
  'company',
  'name',
  'email',
  'phone',
] as const;

type ScalarField = (typeof SCALAR_FIELDS)[number];

function isScalarField(field: string): field is ScalarField {
  return (SCALAR_FIELDS as readonly string[]).includes(field);
}

/**
 * Convert a single rule into a Prisma where-clause fragment (without tenant).
 */
function buildClause(rule: SegmentRule): Record<string, unknown> | null {
  const op = rule.operator || 'equals';
  const value = rule.value;
  const { field } = rule;

  // Membership-based rules (M2M relations on Contact)
  if (field === 'groupId') {
    if (value == null) return null;
    return { contactGroups: { some: { groupId: String(value) } } };
  }
  if (field === 'tagId') {
    if (value == null) return null;
    return { contactTags: { some: { tagId: String(value) } } };
  }

  // Scalar fields
  if (!isScalarField(field)) return null;

  const cond = applyOperator(op, value);
  if (cond === null) return null;
  return { [field]: cond };
}

function applyOperator(
  op: string,
  value: unknown
): Record<string, unknown> | string | null {
  switch (op) {
    case 'equals':
      return value == null ? null : String(value);
    case 'not_equals':
      return value == null ? null : { not: String(value) };
    case 'contains':
      return value == null ? null : { contains: String(value) };
    case 'startsWith':
      return value == null ? null : { startsWith: String(value) };
    case 'in':
      if (Array.isArray(value) && value.length > 0) {
        return { in: value.map((v) => String(v)) };
      }
      return null;
    default:
      return null;
  }
}

/**
 * Build a Prisma `where` clause for contacts matching the given segment rules.
 * Combines multiple rules with AND or OR (matchLogic). The tenantId is always
 * required as the first AND clause to enforce isolation.
 */
export function buildContactWhereFromRules(
  rules: SegmentRule[],
  matchLogic: 'and' | 'or' = 'and',
  tenantId: string
): Record<string, unknown> {
  const base: Record<string, unknown> = { tenantId };

  if (!rules || rules.length === 0) return base;

  const clauses: Record<string, unknown>[] = [];
  for (const rule of rules) {
    const clause = buildClause(rule);
    if (clause) clauses.push(clause);
  }

  if (clauses.length === 0) return base;

  if (matchLogic === 'or') {
    return { AND: [base, { OR: clauses }] };
  }
  return { AND: [base, ...clauses] };
}

/**
 * Safely parse a JSON string of rules. Accepts either an array of rules
 * or an object `{ rules: [...], matchLogic: 'and'|'or' }`.
 */
export function parseRulesJson(
  rulesJson: string | null | undefined
): { rules: SegmentRule[]; matchLogic: 'and' | 'or' } {
  if (!rulesJson) return { rules: [], matchLogic: 'and' };
  try {
    const parsed = JSON.parse(rulesJson);
    if (Array.isArray(parsed)) {
      return { rules: parsed as SegmentRule[], matchLogic: 'and' };
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as {
        rules?: SegmentRule[];
        matchLogic?: string;
        filters?: SegmentRule[];
      };
      const rules = obj.rules || obj.filters || [];
      const matchLogic =
        obj.matchLogic === 'or' ? 'or' : 'and';
      return { rules, matchLogic };
    }
  } catch {
    // ignore parse errors
  }
  return { rules: [], matchLogic: 'and' };
}

/** Count contacts matching the given rules (for smart groups / segments). */
export async function countContactsByRules(
  rules: SegmentRule[],
  matchLogic: 'and' | 'or',
  tenantId: string
): Promise<number> {
  const where = buildContactWhereFromRules(rules, matchLogic, tenantId);
  try {
    return await db.contact.count({ where });
  } catch {
    return 0;
  }
}
