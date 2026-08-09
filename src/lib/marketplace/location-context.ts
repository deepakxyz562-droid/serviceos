/**
 * location-context.ts — Structured location-context data for anti-template-
 * spinning content variation.
 * ---------------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES:
 *   The industry about-paragraph generator (industry-content.ts) produces
 *   genuinely industry-specific content, but WITHIN an industry the only
 *   variation input is `city` + `country`. So across 200 plumbers in 200
 *   different cities, you get 200 city-name-swapped paragraphs:
 *
 *     "Finding a reliable plumber in Dallas can be difficult..."
 *     "Finding a reliable plumber in Houston can be difficult..."
 *     "Finding a reliable plumber in Austin can be difficult..."
 *
 *   That IS the template-spinning pattern Google's Helpful Content Update
 *   penalizes — just at industry granularity instead of per-business.
 *
 * THE FIX (minimal, bounded):
 *   Feed structured location-context inputs (climate zone, dominant
 *   property foundation type, state/provincial licensing body) into the
 *   paragraph so the variation is by *location-context*, not just
 *   city-name-swap. A Texas plumber paragraph mentions slab foundations +
 *   Texas State Board of Plumbing Examiners; an Ontario plumber paragraph
 *   mentions frost-footing foundations + TSSA. Same industry, genuinely
 *   different content per region.
 *
 * SCOPE (deliberately bounded):
 *   - US states + Canadian provinces + Australian states + UK nations.
 *     These cover the vast majority of English-language marketplace
 *     listings. Other countries return null context (the paragraph
 *     gracefully omits the variation sentence — no broken output).
 *   - Climate zones use the IECC 4-zone simplification (hot/cold/mixed/
 *     marine) rather than the full 8-zone IECC — enough variation for
 *     SEO, simple enough to maintain.
 *   - Licensing bodies cover the major skilled trades (plumbing,
 *     electrical, HVAC, general contractor) for US states + CA provinces.
 *     Other industries return null (the variation sentence is omitted).
 *
 * NOT A FULL CONTENT COMPOSER:
 *   This is the "minimal viable" option (ii) from the architecture review.
 *   A full Business+Category+Location content-composer service is deferred
 *   — the current in-process generator + this context layer handles the
 *   anti-spinning goal without a platform refactor.
 */

export interface LocationContext {
  /** Human-readable climate description for weaving into prose. */
  climate: string
  /** Dominant residential foundation type in this region. */
  foundationType: string
  /** State/provincial licensing body name for the trade, or null. */
  licensingBody: string | null
  /** Region label for prose (e.g. "Texas", "Ontario", "New South Wales"). */
  regionLabel: string
}

// ── US state → context mapping ──────────────────────────────────────────────
// Climate zones use a simplified IECC mapping:
//   hot    : IECC zones 1-2 (TX south, FL, AZ south, HI)
//   hot-humid: Gulf/Atlantic south (TX east, LA, MS, AL, GA, FL, SC coast)
//   cold   : IECC zones 5-7 (upper Midwest, Northeast, Mountain West)
//   mixed  : IECC zones 3-4 (Mid-Atlantic, TN, KY, MO, Pacific NW inland)
//   marine : IECC zone 3C / 4C (coastal CA, OR, WA)
// Foundation types:
//   slab           : slab-on-grade (Sun Belt, Southwest)
//   basement        : full basement (cold-winter states)
//   crawl-space    : vented crawl space (humid subtropical, mixed)
//   mixed           : combination ( transitional zones)

interface RegionContext {
  climate: string
  foundationType: string
  regionLabel: string
}

// US state code → region context (covers all 50 states + DC)
const US_STATE_CONTEXT: Record<string, RegionContext> = {
  // ── Sun Belt / South (hot, slab) ────────────────────────────────────────
  AL: { climate: 'hot and humid', foundationType: 'slab or crawl-space foundations', regionLabel: 'Alabama' },
  AZ: { climate: 'hot and dry', foundationType: 'slab foundations', regionLabel: 'Arizona' },
  AR: { climate: 'hot and humid', foundationType: 'slab or crawl-space foundations', regionLabel: 'Arkansas' },
  FL: { climate: 'hot and humid', foundationType: 'slab foundations', regionLabel: 'Florida' },
  GA: { climate: 'hot and humid', foundationType: 'slab or crawl-space foundations', regionLabel: 'Georgia' },
  HI: { climate: 'tropical', foundationType: 'slab foundations', regionLabel: 'Hawaii' },
  LA: { climate: 'hot and humid', foundationType: 'slab foundations', regionLabel: 'Louisiana' },
  MS: { climate: 'hot and humid', foundationType: 'slab or crawl-space foundations', regionLabel: 'Mississippi' },
  NM: { climate: 'hot and dry', foundationType: 'slab foundations', regionLabel: 'New Mexico' },
  NV: { climate: 'hot and dry', foundationType: 'slab foundations', regionLabel: ' Nevada' },
  NC: { climate: 'hot and humid', foundationType: 'crawl-space or slab foundations', regionLabel: 'North Carolina' },
  OK: { climate: 'hot', foundationType: 'slab or crawl-space foundations', regionLabel: 'Oklahoma' },
  SC: { climate: 'hot and humid', foundationType: 'slab or crawl-space foundations', regionLabel: 'South Carolina' },
  TN: { climate: 'humid subtropical', foundationType: 'crawl-space or basement foundations', regionLabel: 'Tennessee' },
  TX: { climate: 'hot', foundationType: 'slab foundations', regionLabel: 'Texas' },
  UT: { climate: 'cold and dry', foundationType: 'basement foundations', regionLabel: 'Utah' },
  VA: { climate: 'humid subtropical', foundationType: 'crawl-space or basement foundations', regionLabel: 'Virginia' },
  // ── Mid-Atlantic / Midwest (mixed, basement) ─────────────────────────────
  DC: { climate: 'humid subtropical', foundationType: 'basement or crawl-space foundations', regionLabel: 'Washington, D.C.' },
  DE: { climate: 'humid subtropical', foundationType: 'basement or crawl-space foundations', regionLabel: 'Delaware' },
  IL: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Illinois' },
  IN: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Indiana' },
  KS: { climate: 'mixed', foundationType: 'basement or slab foundations', regionLabel: 'Kansas' },
  KY: { climate: 'humid subtropical', foundationType: 'crawl-space or basement foundations', regionLabel: 'Kentucky' },
  MD: { climate: 'humid subtropical', foundationType: 'basement foundations', regionLabel: 'Maryland' },
  MO: { climate: 'mixed', foundationType: 'basement foundations', regionLabel: 'Missouri' },
  NJ: { climate: 'humid subtropical', foundationType: 'basement foundations', regionLabel: 'New Jersey' },
  NY: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'New York' },
  OH: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Ohio' },
  PA: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Pennsylvania' },
  WV: { climate: 'humid subtropical', foundationType: 'basement foundations', regionLabel: 'West Virginia' },
  // ── Northeast / New England (cold, basement) ────────────────────────────
  CT: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Connecticut' },
  ME: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Maine' },
  MA: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Massachusetts' },
  NH: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'New Hampshire' },
  RI: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Rhode Island' },
  VT: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Vermont' },
  // ── Upper Midwest / Plains (cold, basement) ─────────────────────────────
  IA: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Iowa' },
  MI: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Michigan' },
  MN: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Minnesota' },
  MT: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Montana' },
  NE: { climate: 'mixed', foundationType: 'basement foundations', regionLabel: 'Nebraska' },
  ND: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'North Dakota' },
  SD: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'South Dakota' },
  WI: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Wisconsin' },
  WY: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Wyoming' },
  // ── Mountain West (cold/dry, mixed) ─────────────────────────────────────
  CO: { climate: 'cold and dry', foundationType: 'basement foundations', regionLabel: 'Colorado' },
  ID: { climate: 'cold and dry', foundationType: 'basement foundations', regionLabel: 'Idaho' },
  // ── Pacific (marine, mixed) ──────────────────────────────────────────────
  CA: { climate: 'Mediterranean along the coast, hot and dry inland', foundationType: 'slab or crawl-space foundations', regionLabel: 'California' },
  OR: { climate: 'marine along the coast, dry inland', foundationType: 'crawl-space or basement foundations', regionLabel: 'Oregon' },
  WA: { climate: 'marine', foundationType: 'crawl-space or basement foundations', regionLabel: 'Washington' },
  AK: { climate: 'very cold', foundationType: 'crawl-space or pilings', regionLabel: 'Alaska' },
}

// ── Canadian province → context mapping ─────────────────────────────────────
const CA_PROVINCE_CONTEXT: Record<string, RegionContext> = {
  AB: { climate: 'cold and dry', foundationType: 'basement foundations', regionLabel: 'Alberta' },
  BC: { climate: 'marine on the coast, cold inland', foundationType: 'basement or crawl-space foundations', regionLabel: 'British Columbia' },
  MB: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Manitoba' },
  NB: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'New Brunswick' },
  NL: { climate: 'cold and marine', foundationType: 'basement or crawl-space foundations', regionLabel: 'Newfoundland and Labrador' },
  NS: { climate: 'cold and marine', foundationType: 'basement or crawl-space foundations', regionLabel: 'Nova Scotia' },
  ON: { climate: 'cold', foundationType: 'basement foundations', regionLabel: 'Ontario' },
  PE: { climate: 'cold and marine', foundationType: 'basement foundations', regionLabel: 'Prince Edward Island' },
  QC: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Quebec' },
  SK: { climate: 'very cold', foundationType: 'basement foundations', regionLabel: 'Saskatchewan' },
  YT: { climate: 'subarctic', foundationType: 'crawl-space or pilings', regionLabel: 'Yukon' },
  NT: { climate: 'subarctic', foundationType: 'crawl-space or pilings', regionLabel: 'Northwest Territories' },
  NU: { climate: 'arctic', foundationType: 'pilings or slab on permafrost', regionLabel: 'Nunavut' },
}

// ── Australian state → context mapping ──────────────────────────────────────
const AU_STATE_CONTEXT: Record<string, RegionContext> = {
  NSW: { climate: 'temperate', foundationType: 'slab or pier-and-beam foundations', regionLabel: 'New South Wales' },
  VIC: { climate: 'temperate', foundationType: 'slab or pier-and-beam foundations', regionLabel: 'Victoria' },
  QLD: { climate: 'tropical in the north, subtropical in the south', foundationType: 'slab or elevated foundations', regionLabel: 'Queensland' },
  WA: { climate: 'Mediterranean in the south, hot and dry inland', foundationType: 'slab foundations', regionLabel: 'Western Australia' },
  SA: { climate: 'Mediterranean', foundationType: 'slab or pier-and-beam foundations', regionLabel: 'South Australia' },
  TAS: { climate: 'cool and marine', foundationType: 'pier-and-beam or slab foundations', regionLabel: 'Tasmania' },
  ACT: { climate: 'temperate', foundationType: 'slab or pier-and-beam foundations', regionLabel: 'Australian Capital Territory' },
  NT: { climate: 'tropical in the north, arid in the south', foundationType: 'elevated or slab foundations', regionLabel: 'Northern Territory' },
}

// ── UK nation → context mapping ─────────────────────────────────────────────
const UK_NATION_CONTEXT: Record<string, RegionContext> = {
  ENG: { climate: 'temperate and marine', foundationType: 'shallow strip or trench-fill foundations', regionLabel: 'England' },
  SCT: { climate: 'cool and marine', foundationType: 'shallow strip or trench-fill foundations', regionLabel: 'Scotland' },
  WLS: { climate: 'cool and marine', foundationType: 'shallow strip or trench-fill foundations', regionLabel: 'Wales' },
  NIR: { climate: 'cool and marine', foundationType: 'shallow strip or raft foundations', regionLabel: 'Northern Ireland' },
}

// ── Trade → licensing body (US states + CA provinces) ──────────────────────
// Only the major skilled trades are mapped. Industries not in this map
// (e.g. cleaning, landscaping, pet services) return null licensingBody,
// and the variation sentence omits the licensing clause gracefully.

// US state → { trade: licensingBody }
const US_STATE_LICENSING: Record<string, Record<string, string>> = {
  AL: { plumbing: 'Alabama Plumbers & Gas Fitters Examination Board', electrical: 'Alabama Electrical Contractors Board', hvac: 'Alabama Board of Heating & Air Conditioning Contractors' },
  AZ: { plumbing: 'Arizona Registrar of Contractors', electrical: 'Arizona Registrar of Contractors', hvac: 'Arizona Registrar of Contractors' },
  CA: { plumbing: 'California Contractors State License Board', electrical: 'California Contractors State License Board', hvac: 'California Contractors State License Board' },
  CO: { plumbing: 'Colorado State Plumbing Board', electrical: 'Colorado State Electrical Board', hvac: 'Colorado State Electrical Board' },
  CT: { plumbing: 'Connecticut Department of Consumer Protection', electrical: 'Connecticut Department of Consumer Protection', hvac: 'Connecticut Department of Consumer Protection' },
  FL: { plumbing: 'Florida Department of Business & Professional Regulation', electrical: 'Florida Department of Business & Professional Regulation', hvac: 'Florida Department of Business & Professional Regulation' },
  GA: { plumbing: 'Georgia Construction Industry Licensing Board', electrical: 'Georgia Construction Industry Licensing Board', hvac: 'Georgia Construction Industry Licensing Board' },
  IL: { plumbing: 'Illinois Department of Public Health', electrical: 'Illinois Department of Financial & Professional Regulation', hvac: 'Illinois Department of Financial & Professional Regulation' },
  MA: { plumbing: 'Massachusetts Board of State Examiners of Plumbers & Gas Fitters', electrical: 'Massachusetts Board of State Examiners of Electricians', hvac: 'Massachusetts Division of Professional Licensure' },
  MD: { plumbing: 'Maryland State Board of Plumbing', electrical: 'Maryland State Board of Master Electricians', hvac: 'Maryland Home Improvement Commission' },
  MI: { plumbing: 'Michigan Department of Licensing & Regulatory Affairs', electrical: 'Michigan Department of Licensing & Regulatory Affairs', hvac: 'Michigan Department of Licensing & Regulatory Affairs' },
  MN: { plumbing: 'Minnesota Department of Labor & Industry', electrical: 'Minnesota Department of Labor & Industry', hvac: 'Minnesota Department of Labor & Industry' },
  MO: { plumbing: 'Missouri Division of Professional Registration', electrical: 'Missouri Division of Professional Registration', hvac: 'Missouri Division of Professional Registration' },
  NC: { plumbing: 'North Carolina State Board of Examiners of Plumbing, Heating & Fire Sprinkler Contractors', electrical: 'North Carolina State Board of Examiners of Electrical Contractors', hvac: 'North Carolina State Board of Examiners of Plumbing, Heating & Fire Sprinkler Contractors' },
  NJ: { plumbing: 'New Jersey State Board of Examiners of Master Plumbers', electrical: 'New Jersey Board of Examiners of Electrical Contractors', hvac: 'New Jersey State Board of Examiners of Master Plumbers' },
  NY: { plumbing: 'New York State Department of Labor', electrical: 'New York State Department of Labor', hvac: 'New York State Department of Labor' },
  OH: { plumbing: 'Ohio Construction Industry Licensing Board', electrical: 'Ohio Construction Industry Licensing Board', hvac: 'Ohio Construction Industry Licensing Board' },
  OK: { plumbing: 'Oklahoma Construction Industries Board', electrical: 'Oklahoma Construction Industries Board', hvac: 'Oklahoma Construction Industries Board' },
  OR: { plumbing: 'Oregon Building Codes Division', electrical: 'Oregon Building Codes Division', hvac: 'Oregon Building Codes Division' },
  PA: { plumbing: 'Pennsylvania Department of Labor & Industry', electrical: 'Pennsylvania Department of Labor & Industry', hvac: 'Pennsylvania Department of Labor & Industry' },
  SC: { plumbing: 'South Carolina Department of Labor, Licensing & Regulation', electrical: 'South Carolina Department of Labor, Licensing & Regulation', hvac: 'South Carolina Department of Labor, Licensing & Regulation' },
  TN: { plumbing: 'Tennessee Department of Commerce & Insurance', electrical: 'Tennessee Department of Commerce & Insurance', hvac: 'Tennessee Department of Commerce & Insurance' },
  TX: { plumbing: 'Texas State Board of Plumbing Examiners', electrical: 'Texas Department of Licensing & Regulation', hvac: 'Texas Department of Licensing & Regulation' },
  UT: { plumbing: 'Utah Division of Occupational & Professional Licensing', electrical: 'Utah Division of Occupational & Professional Licensing', hvac: 'Utah Division of Occupational & Professional Licensing' },
  VA: { plumbing: 'Virginia Board for Contractors', electrical: 'Virginia Board for Contractors', hvac: 'Virginia Board for Contractors' },
  WA: { plumbing: 'Washington State Department of Labor & Industries', electrical: 'Washington State Department of Labor & Industries', hvac: 'Washington State Department of Labor & Industries' },
  WI: { plumbing: 'Wisconsin Department of Safety & Professional Services', electrical: 'Wisconsin Department of Safety & Professional Services', hvac: 'Wisconsin Department of Safety & Professional Services' },
}

// Canadian province → { trade: licensingBody }
const CA_PROVINCE_LICENSING: Record<string, Record<string, string>> = {
  AB: { plumbing: 'Alberta Apprenticeship & Industry Training', electrical: 'Alberta Apprenticeship & Industry Training', hvac: 'Alberta Apprenticeship & Industry Training' },
  BC: { plumbing: 'BC Technical Safety BC', electrical: 'Technical Safety BC', hvac: 'Technical Safety BC' },
  MB: { plumbing: 'Manitoba Apprenticeship Branch', electrical: 'Manitoba Apprenticeship Branch', hvac: 'Manitoba Apprenticeship Branch' },
  NB: { plumbing: 'New Brunswick Department of Post-Secondary Education, Training & Labour', electrical: 'New Brunswick Department of Post-Secondary Education, Training & Labour', hvac: 'New Brunswick Department of Post-Secondary Education, Training & Labour' },
  NS: { plumbing: 'Nova Scotia Apprenticeship Agency', electrical: 'Nova Scotia Apprenticeship Agency', hvac: 'Nova Scotia Apprenticeship Agency' },
  ON: { plumbing: 'Ontario College of Trades / Skilled Trades Ontario', electrical: 'Ontario College of Trades / Electrical Safety Authority (ESA)', hvac: 'Ontario College of Trades / Technical Standards & Safety Authority (TSSA)' },
  QC: { plumbing: 'Corporation des maîtres mécaniciens en tuyauterie du Québec (CMMTQ)', electrical: 'Corporation des maîtres électriciens du Québec (CMEQ)', hvac: 'Corporation des maîtres mécaniciens en tuyauterie du Québec (CMMTQ)' },
  SK: { plumbing: 'Saskatchewan Apprenticeship & Trade Certification Commission', electrical: 'Saskatchewan Apprenticeship & Trade Certification Commission', hvac: 'Saskatchewan Apprenticeship & Trade Certification Commission' },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize a state/province code to uppercase + trim. Returns '' for
 * null/undefined so lookups fail gracefully (returning null context).
 */
function normalizeRegionCode(code: string | null | undefined): string {
  if (!code) return ''
  return code.trim().toUpperCase()
}

/**
 * Normalize a country code to uppercase + trim.
 */
function normalizeCountryCode(code: string | null | undefined): string {
  if (!code) return ''
  return code.trim().toUpperCase()
}

/**
 * Look up the region-context (climate + foundation + label) for a given
 * country + state/province code. Returns null for unknown regions —
 * callers should gracefully omit the variation sentence in that case.
 */
function lookupRegionContext(
  country: string,
  state: string,
): RegionContext | null {
  if (!country || !state) return null
  switch (country) {
    case 'US':
      return US_STATE_CONTEXT[state] ?? null
    case 'CA':
      return CA_PROVINCE_CONTEXT[state] ?? null
    case 'AU':
      return AU_STATE_CONTEXT[state] ?? null
    case 'GB':
    case 'UK':
      return UK_NATION_CONTEXT[state] ?? null
    default:
      return null
  }
}

/**
 * Look up the trade-specific licensing body for a given country + state +
 * industry. Returns null when no mapping exists — callers should omit
 * the licensing clause in that case.
 *
 * `industry` should be the canonical industry ID (e.g. 'plumbing',
 * 'electrical', 'hvac'). Industries without a licensing mapping (cleaning,
 * landscaping, etc.) return null.
 */
function lookupLicensingBody(
  country: string,
  state: string,
  industry: string | null | undefined,
): string | null {
  if (!country || !state || !industry) return null
  const trade = industry.toLowerCase().trim()
  switch (country) {
    case 'US':
      return US_STATE_LICENSING[state]?.[trade] ?? null
    case 'CA':
      return CA_PROVINCE_LICENSING[state]?.[trade] ?? null
    default:
      return null
  }
}

/**
 * Resolve the full LocationContext for a business. Returns null when the
 * country + state combination isn't in our mapping — callers should
 * gracefully omit the variation sentence in that case (the base
 * industry+city paragraph still renders fine).
 *
 * `industry` is the canonical industry ID from the Tenant model.
 */
export function getLocationContext(
  country: string | null | undefined,
  state: string | null | undefined,
  industry: string | null | undefined,
): LocationContext | null {
  const countryNorm = normalizeCountryCode(country)
  const stateNorm = normalizeRegionCode(state)
  const region = lookupRegionContext(countryNorm, stateNorm)
  if (!region) return null
  return {
    climate: region.climate,
    foundationType: region.foundationType,
    regionLabel: region.regionLabel,
    licensingBody: lookupLicensingBody(countryNorm, stateNorm, industry),
  }
}

/**
 * Build a single variation sentence for the about-paragraph, grounded in
 * the location context. Returns '' when no context is available (so the
 * caller can unconditionally append the result without conditionals).
 *
 * The sentence is written to read naturally after the industry+city
 * opening paragraph. It mentions ONE of:
 *   - climate + foundation type (always, when context exists)
 *   - state licensing body (when mapped for this trade)
 *
 * Example output (Texas plumber):
 *   "In Texas, the hot climate and prevalence of slab foundations mean
 *   plumbing work often involves slab leaks and foundation-shifted pipes;
 *   the Texas State Board of Plumbing Examiners licenses plumbers at the
 *   journeyman and master levels."
 *
 * Example output (Ontario HVAC, no licensing clause for brevity):
 *   "Ontario's cold climate and basement foundations mean HVAC work
 *   often involves furnace sizing for winter loads and basement ductwork
 *   runs."
 *
 * Example output (unknown region):
 *   "" (empty string — caller omits the sentence)
 */
export function getLocationContextSentence(
  ctx: LocationContext | null,
  industry: string | null | undefined,
): string {
  if (!ctx) return ''
  const industryLabel = industry
    ? industry.toLowerCase().trim()
    : 'this trade'
  // Pick a trade-appropriate "work often involves" clause based on the
  // industry + foundation type. Kept short + generic enough to read
  // naturally across trades.
  let workClause = ''
  switch (industryLabel) {
    case 'plumbing':
      workClause = `plumbing work often involves ${ctx.foundationType.includes('slab') ? 'slab leaks and under-slab pipe repair' : ctx.foundationType.includes('basement') ? 'basement pipe runs and water heater venting' : 'crawl-space pipe access and drainage'}`
      break
    case 'hvac':
      workClause = `HVAC work often involves ${ctx.climate.includes('cold') ? 'furnace sizing for winter heating loads' : ctx.climate.includes('hot') ? 'central AC sizing and refrigerant charge for summer cooling' : 'year-round heat pump sizing and ductwork'}`
      break
    case 'electrical':
      workClause = `electrical work often involves ${ctx.climate.includes('cold') ? 'service-panel upgrades for winter heating loads' : ctx.climate.includes('hot') ? 'AC circuit additions and attic wiring heat protection' : 'service-panel upgrades and circuit additions'}`
      break
    case 'roofing':
      workClause = `roofing work must account for ${ctx.climate.includes('humid') ? 'high humidity and storm-driven rain' : ctx.climate.includes('cold') ? 'snow load and ice-dam prevention' : ctx.climate.includes('hot') ? 'UV exposure and thermal cycling' : 'local weather patterns'}`
      break
    case 'cleaning':
    case 'window-cleaning':
      workClause = `window and exterior cleaning must account for ${ctx.climate.includes('humid') ? 'mold and mildew growth common in humid climates' : ctx.climate.includes('hot') && ctx.climate.includes('dry') ? 'hard-water staining and dust accumulation' : 'seasonal pollen and weather staining'}`
      break
    default:
      workClause = `${industryLabel} work must account for the local climate and ${ctx.foundationType}`
  }
  let sentence = `In ${ctx.regionLabel}, the ${ctx.climate} climate and prevalence of ${ctx.foundationType} mean ${workClause}.`
  if (ctx.licensingBody) {
    sentence += ` The ${ctx.licensingBody} regulates ${industryLabel} work in the region.`
  }
  return sentence
}
