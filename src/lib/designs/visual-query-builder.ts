/**
 * Visual Query Builder — translates business context (industry, purpose,
 * seasonal occasion) into concrete search queries + Pinterest board routing
 * for the live photo sources pipeline.
 */

import { PINTEREST_FESTIVAL_BOARDS, matchPinterestBoards } from './live-photo-sources';

export type VisualPurpose = 'profile' | 'promotion' | 'festival' | 'trust';

export interface VisualQueryContext {
  industryText: string;
  purpose?: VisualPurpose;
  occasionId?: string;
  businessName?: string;
  date?: Date;
}

const STOPWORDS = new Set([
  'and', 'the', 'of', 'for', 'in', 'at', 'a', 'an', 'services', 'service', 'shop',
  'store', 'centre', 'center', 'ltd', 'pvt', 'private', 'limited', 'company', 'co',
  'my', 'business', 'general', 'local', 'best', 'top', 'new', 'all', 'traders',
  'trader', 'enterprise', 'enterprises', 'point', 'house', 'home', 'world', 'mart',
]);

const CORE_WORD_MIN_LEN = 3;

/** Extracts meaningful industry keywords from free-form category text. */
export function extractCoreIndustryKeywords(text: string, max = 3): string[] {
  const cleaned = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&-]/g, ' ')
    .split(/[\s&]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= CORE_WORD_MIN_LEN && !STOPWORDS.has(w));
  // Preserve original order, dedupe, cap
  return [...new Set(cleaned)].slice(0, max);
}

export interface SeasonalOccasion {
  id: string;
  label: string;
}

/**
 * Deterministic Gregorian-window seasonal detection (Indian SMB calendar).
 * Only occasions inside their window are returned — max 2 concurrent.
 */
export function getSeasonalOccasions(date: Date = new Date()): SeasonalOccasion[] {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const inWindow = (m1: number, d1: number, m2: number, d2: number): boolean => {
    if (m1 === m2) return month === m1 && day >= d1 && day <= d2;
    if (m1 < m2) return (month === m1 && day >= d1) || (month === m2 && day <= d2) || (month > m1 && month < m2);
    // wraps new year (e.g. Dec -> Jan)
    return (month === m1 && day >= d1) || (month === m2 && day <= d2);
  };

  const windows: Array<{ id: string; label: string; window: [number, number, number, number] }> = [
    { id: 'new_year', label: 'New Year', window: [12, 15, 1, 10] },
    { id: 'republic_day', label: 'Republic Day', window: [1, 22, 1, 27] },
    { id: 'valentine', label: "Valentine's Day", window: [2, 7, 2, 15] },
    { id: 'holi', label: 'Holi', window: [3, 1, 3, 25] },
    { id: 'mothers_day', label: "Mother's Day", window: [5, 1, 5, 15] },
    { id: 'fathers_day', label: "Father's Day", window: [6, 1, 6, 21] },
    { id: 'independence_day', label: 'Independence Day', window: [8, 10, 8, 16] },
    { id: 'rakhi', label: 'Raksha Bandhan', window: [8, 1, 8, 12] },
    { id: 'navratri', label: 'Navratri', window: [9, 25, 10, 12] },
    { id: 'diwali', label: 'Diwali', window: [10, 10, 11, 14] },
    { id: 'christmas', label: 'Christmas', window: [12, 10, 12, 26] },
  ];

  return windows
    .filter((w) => inWindow(...w.window))
    .slice(0, 2)
    .map((w) => ({ id: w.id, label: w.label }));
}

export interface VisualQueryPlan {
  queries: string[];
  pinterestBoards: string[];
}

const PURPOSE_PHRASES: Record<VisualPurpose, string> = {
  profile: 'business profile',
  promotion: 'sale offer',
  festival: 'festival greeting',
  trust: 'customer review',
};

/**
 * Builds the concrete query plan: 4-6 diverse search queries covering
 * poster/flyer/social/banner intents, plus Pinterest board routing.
 */
export function buildVisualQueryPlan(ctx: VisualQueryContext): VisualQueryPlan {
  const cores = extractCoreIndustryKeywords(ctx.industryText);
  const core = cores.join(' ') || 'local business';
  const purpose = ctx.purpose || 'profile';
  const occasion = ctx.occasionId || '';

  const querySet = [
    `${core} professional photography`,
    `${core} modern workplace`,
    `${core} commercial photography`,
    `${core} services`,
    `${core} ${PURPOSE_PHRASES[purpose]}`,
    `${core} brand showcase`,
  ];
  if (occasion) {
    querySet.unshift(`${occasion.replace(/_/g, ' ')} ${core} celebration`);
    querySet.unshift(`${occasion.replace(/_/g, ' ')} festival greeting`);
  }

  const queries = [...new Set(querySet.filter(Boolean))].slice(0, occasion ? 7 : 6);

  // Pinterest routing: festival boards win, then vertical boards, then generic
  const pinterestBoards = matchPinterestBoards(
    occasion ? `${occasion.replace(/_/g, ' ')} ${ctx.industryText}` : ctx.industryText,
    occasion || undefined,
  );
  void PINTEREST_FESTIVAL_BOARDS; // imported for side-effect completeness of the map

  return { queries, pinterestBoards };
}
