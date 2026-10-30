/**
 * Brand Safety Gate — BGOS 2.1
 * ----------------------------
 * Multi-layer safety validation to prevent:
 * 1. Cross-tenant brand contamination (e.g., publishing "Singh Fabrications" on "FieserOS")
 * 2. Forbidden phrases configured by the business owner
 * 3. Unauthorized competitor mentions
 * 4. Deceptive marketing claims (e.g., "100% guaranteed #1 ranking on Google")
 *
 * Implements Layered Defense:
 *   Layer 1: Contextual prompt negative constraints.
 *   Layer 2: Deterministic regex and token matching.
 *   Layer 3: Warning indicators for human approval review.
 */

export interface BrandSafetyContext {
  tenantId: string;
  activeBusinessName: string;
  activeLocationId?: string | null;
  forbiddenPhrases?: string[];
  competitors?: string[];
  knownOtherTenantNames?: string[];
}

export interface BrandSafetyViolation {
  type: 'cross_tenant_contamination' | 'forbidden_phrase' | 'competitor_mention' | 'deceptive_claim';
  severity: 'error' | 'warning';
  message: string;
  matchedText: string;
}

export interface BrandSafetyResult {
  passed: boolean;
  violations: BrandSafetyViolation[];
  warnings: BrandSafetyViolation[];
}

const DECEPTIVE_PATTERNS = [
  /\b(100%\s*guaranteed\s*(rank|ranking|leads|sales))\b/i,
  /\b(instant\s*(#1|number\s*one)\s*on\s*google)\b/i,
  /\b(official\s*google\s*guarantee)\b/i,
  /\b(ranking\s*drops?\s*if\s*you\s*cancel)\b/i,
];

export function validateBrandSafety(
  content: string,
  context: BrandSafetyContext
): BrandSafetyResult {
  const violations: BrandSafetyViolation[] = [];
  const warnings: BrandSafetyViolation[] = [];

  if (!content || typeof content !== 'string') {
    return { passed: true, violations, warnings };
  }

  const activeNameLower = (context.activeBusinessName || '').toLowerCase().trim();

  // 1. Cross-Tenant Contamination Check
  // Check if content mentions other known businesses in the system that are NOT the active business
  const otherNames = (context.knownOtherTenantNames || [
    'Singh Fabrications',
    'Singh Fabrication',
    'FieserOS',
    'Deepak Chandra',
    'Jodha Group',
    '13SB Cleaning',
    'Mr Handy Man',
    'Lifts for Life',
    'ASTER LANDSCAPING',
    'UL Roofing',
  ]).filter((name) => {
    const n = name.toLowerCase().trim();
    // Exclude if it's part of the active business name
    return n.length > 3 && !activeNameLower.includes(n) && !n.includes(activeNameLower);
  });

  for (const otherName of otherNames) {
    const escaped = otherName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(content)) {
      violations.push({
        type: 'cross_tenant_contamination',
        severity: 'error',
        message: `Content mentions unrelated business "${otherName}" instead of active business "${context.activeBusinessName}".`,
        matchedText: otherName,
      });
    }
  }

  // 2. Forbidden Phrases Check (Configured in Brand Brain)
  const forbidden = (context.forbiddenPhrases || []).map((p) => p.trim()).filter((p) => p.length > 0);
  for (const phrase of forbidden) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(content)) {
      violations.push({
        type: 'forbidden_phrase',
        severity: 'error',
        message: `Content contains forbidden phrase: "${phrase}".`,
        matchedText: phrase,
      });
    }
  }

  // 3. Competitor Mentions Check
  const competitors = (context.competitors || []).map((c) => c.trim()).filter((c) => c.length > 0);
  for (const comp of competitors) {
    const escaped = comp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(content)) {
      warnings.push({
        type: 'competitor_mention',
        severity: 'warning',
        message: `Content mentions competitor "${comp}". Please ensure this is intentional before publishing.`,
        matchedText: comp,
      });
    }
  }

  // 4. Deceptive Marketing / Unsubstantiated Ranking Claims Check
  for (const pattern of DECEPTIVE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      warnings.push({
        type: 'deceptive_claim',
        severity: 'warning',
        message: `Content contains unsubstantiated guarantee claim: "${match[0]}". Google policies require truthful advertising.`,
        matchedText: match[0],
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}
