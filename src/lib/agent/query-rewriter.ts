/**
 * Query Rewriter — Enterprise Agent Architecture Phase E
 * =================================================================
 *
 * Replaces the hardcoded expandSearchQuery() that was duplicated across
 * both chat routes. The old version had hardcoded "Oregon Washington"
 * and plumbing-specific keywords — useless for non-plumbing businesses
 * in other regions.
 *
 * The new version:
 *   1. Detects the query category (service_area, services, pricing,
 *      emergency, hours, general)
 *   2. Expands using the agent's ACTUAL business name and structured
 *      facts (service areas, services) instead of hardcoded literals
 *   3. Falls back to the original query if no expansion matches
 */

export interface RewriteContext {
  businessName?: string;
  serviceAreas?: string[];
  services?: string[];
  industry?: string;
}

/**
 * Rewrite a user query for better RAG retrieval.
 * Uses the business's actual name and structured facts.
 */
export function rewriteQuery(query: string, ctx: RewriteContext = {}): string {
  const low = (query || '').toLowerCase().trim();
  if (!low) return query;

  const name = ctx.businessName || '';

  // 1. Service area / location questions
  if (low.includes('location') || low.includes('area') || low.includes('serve') || low.includes('where') || low.includes('city') || low.includes('cities')) {
    const areas = ctx.serviceAreas?.length ? ctx.serviceAreas.join(' ') : 'service areas locations cities served region';
    return `${name} ${areas} service areas locations cities served region coverage`.trim();
  }

  // 2. Service / "what do you do" questions
  if (low.includes('service') || low.includes('what do you do') || low.includes('offer') || low.includes('help with') || low.includes('specialize')) {
    const services = ctx.services?.length ? ctx.services.join(' ') : 'services repair installation inspection maintenance';
    return `${name} ${services} services repair installation inspection maintenance`.trim();
  }

  // 3. Pricing / cost / rate questions
  if (low.includes('price') || low.includes('cost') || low.includes('rate') || low.includes('how much') || low.includes('fee') || low.includes('quote') || low.includes('estimate')) {
    return `${name} pricing rates cost estimates fees quote diagnostic free consultation`.trim();
  }

  // 4. Emergency / urgent questions
  if (low.includes('emergency') || low.includes('urgent') || low.includes('24/7') || low.includes('burst') || low.includes('flood') || low.includes('asap') || low.includes('right away')) {
    return `${name} emergency 24/7 dispatch urgent response availability after hours`.trim();
  }

  // 5. Hours / schedule questions
  if (low.includes('hour') || low.includes('open') || low.includes('when') || low.includes('time') || low.includes('schedule') || low.includes('available')) {
    return `${name} business hours schedule operating hours open days availability`.trim();
  }

  // 6. Contact questions
  if (low.includes('phone') || low.includes('call') || low.includes('email') || low.includes('contact') || low.includes('reach')) {
    return `${name} phone email contact number address reach call`.trim();
  }

  // No expansion matched — return original query
  return query;
}
