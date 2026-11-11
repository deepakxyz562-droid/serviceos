/**
 * Dynamic Address & Locality Extractor
 * Extracts genuine city / locality from formatted address strings without ever returning street numbers.
 */

export function extractCityOrLocality(address?: string | null, explicitCity?: string | null): string {
  if (explicitCity && explicitCity.trim()) {
    return explicitCity.trim();
  }

  if (!address || !address.trim()) {
    return 'your area';
  }

  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'your area';
  }

  // Filter out parts that are purely digits, apartment/house/plot numbers (e.g. "80", "#101", "Ste 400", "Unit 1")
  const nonStreetParts = parts.filter((part) => {
    if (/^\d+[\w\s/-]*$/i.test(part)) return false; // purely numbers like "80"
    if (/^(h\.?\s*no|plot|suite|ste|unit|flat|shop|building|bldg|floor|near|opp|behind|at)\b/i.test(part)) return false;
    if (/^\d{5,6}(-\d{4})?$/i.test(part)) return false; // postal code only
    return true;
  });

  if (nonStreetParts.length === 0) {
    return parts[parts.length - 1] || 'your area';
  }

  // Check for common cities or known metropolitan names
  for (const part of nonStreetParts) {
    // If the part contains a known city name or ends with a city indicator
    if (
      /\b(patna|delhi|mumbai|bangalore|bengaluru|kolkata|hyderabad|chennai|pune|ahmedabad|jaipur|lucknow|ranchi|noida|gurugram|chandigarh|winnipeg|columbia|syracuse|quebec|toronto|london)\b/i.test(
        part,
      )
    ) {
      // Clean up pincodes / state abbreviations attached like "Patna Bihar 800014"
      const match = part.match(/\b(patna|delhi|mumbai|bangalore|bengaluru|kolkata|hyderabad|chennai|pune|ahmedabad|jaipur|lucknow|ranchi|noida|gurugram|chandigarh|winnipeg|columbia|syracuse|quebec|toronto|london)\b/i);
      if (match) {
        return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
      }
      return part;
    }
  }

  // If there are multiple parts, typically the city is the 2nd or 3rd from the end before State/Country
  // e.g. ["2695 Main St", "Winnipeg", "MB R2M 3E1"] -> "Winnipeg"
  // e.g. ["80", "Murlichak", "Jagdeopath", "Patna", "Bihar 800014"] -> "Patna"
  if (nonStreetParts.length >= 2) {
    // Look from back towards front, skipping country/state/pincode
    for (let i = nonStreetParts.length - 1; i >= 0; i--) {
      const candidate = nonStreetParts[i];
      // Skip state+pincode like "Bihar 800014", "India", "MB R2M 3E1", "SC 29201"
      if (/^(india|usa|united states|canada|australia|uk)$/i.test(candidate)) continue;
      if (/\b\d{5,6}\b/.test(candidate) && /bihar|maharashtra|ontario|texas|california/i.test(candidate)) {
        // Strip out the state and pincode if city is in this candidate
        const cleaned = candidate.replace(/\b(bihar|maharashtra|delhi|texas|california|ny|sc|tx|mb|qc)\b/gi, '').replace(/\b\d+\b/g, '').trim();
        if (cleaned.length > 2) return cleaned;
        continue;
      }
      return candidate;
    }
  }

  return nonStreetParts[0];
}
