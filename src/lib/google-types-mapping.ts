/**
 * Maps Google Places `types[]` to our internal industry IDs (INDUSTRY_CATALOG).
 *
 * Reference: https://developers.google.com/maps/documentation/places/web-service/place-types
 * Catalog:   src/lib/industry-catalog.ts
 *
 * Strategy:
 *  - `primaryType` is preferred (most specific classification)
 *  - Falls back to scanning `types[]` for the first match in priority order
 *  - Returns an array of all matched industry IDs (a business may legitimately
 *    span multiple — e.g. a "plumber + gas fitter" combo)
 */

/** Map of Google Place type → our industry ID. Ordered by specificity. */
const TYPE_TO_INDUSTRY: Record<string, string> = {
  // Cleaning
  cleaning_service: 'cleaning',
  // Landscaping & tree
  landscaping_service: 'landscaping',
  lawn_care_service: 'landscaping',
  tree_service: 'landscaping',
  // HVAC
  hvac_contractor: 'hvac',
  // Electrical
  electrician: 'electrical',
  // Plumbing
  plumber: 'plumbing',
  gas_station: 'plumbing', // often dual-trade; downgrade preference below
  // Construction / general
  general_contractor: 'construction',
  home_improvement_store: 'construction',
  // Roofing
  roofing_contractor: 'roofing',
  // Painting
  painter: 'painting',
  // Flooring
  flooring_store: 'flooring',
  flooring_contractor: 'flooring',
  // Security
  locksmith: 'locksmith',
  security_system_installation: 'security',
  security_system_service: 'security',
  // Appliance repair
  appliance_repair_service: 'appliance-repair',
  // Pest control
  pest_control_service: 'pest-control',
  // Pool / spa
  swimming_pool_repair_service: 'pool-spa',
  swimming_pool_contractor: 'pool-spa',
  // Handyman
  handyman: 'handyman',
  general_contractor_handyman: 'handyman',
  // Junk removal
  junk_removal_service: 'junk-removal',
  // Automotive
  auto_repair_shop: 'automotive',
  car_repair: 'automotive',
  // Moving
  moving_company: 'moving',
  // Window cleaning
  window_cleaning_service: 'window-cleaning',
  // Solar
  solar_energy_contractor: 'solar',
  solar_energy_equipment_supplier: 'solar',
};

/** Lower-priority fallbacks used when no direct type match is found. */
const FALLBACK_INDUSTRY = 'others';

/**
 * Resolve a Google Place to one or more industry IDs.
 *
 * @param primaryType Google's `primaryType` (may be undefined or "uncategorized")
 * @param types       Google's `types[]` array
 * @returns array of industry IDs (deduplicated, in priority order). First item is primary.
 */
export function mapGoogleTypesToIndustries(
  primaryType?: string,
  types?: string[],
): string[] {
  const matched: string[] = [];
  const seen = new Set<string>();

  const tryAdd = (type?: string) => {
    if (!type) return;
    const industry = TYPE_TO_INDUSTRY[type];
    if (industry && !seen.has(industry)) {
      seen.add(industry);
      matched.push(industry);
    }
  };

  // 1. Try primaryType first
  tryAdd(primaryType);

  // 2. Then scan types[] in order
  if (types && types.length > 0) {
    for (const t of types) {
      tryAdd(t);
      if (matched.length >= 3) break; // cap at 3 industries per business
    }
  }

  // 3. Always have at least one
  if (matched.length === 0) {
    matched.push(FALLBACK_INDUSTRY);
  }

  return matched;
}

/**
 * Returns the primary industry ID (first match).
 * Used for the canonical `industry` field on Tenant (drives SEO URL).
 */
export function primaryIndustry(
  primaryType?: string,
  types?: string[],
): string {
  return mapGoogleTypesToIndustries(primaryType, types)[0];
}

/**
 * Returns ALL matched industry IDs as a JSON-safe array.
 * Used for `businessCategoriesJson` on Tenant.
 */
export function allIndustries(
  primaryType?: string,
  types?: string[],
): string[] {
  return mapGoogleTypesToIndustries(primaryType, types);
}
