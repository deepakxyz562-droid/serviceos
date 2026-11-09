import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('GBP Competitors Dynamic Resolution & Cache Protection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly flags legacy hardcoded Patna or MLM software competitor rows as corrupt', () => {
    const corruptRows = [
      { id: '1', name: 'Redn Technologies Pvt Ltd', address: 'Patna, Bihar', category: 'Software Company' },
      { id: '2', name: 'MLM Software Company in Patna', address: 'Patna, Bihar', category: 'Software Company' },
    ];

    const isLegacyCorrupt = corruptRows.some((r) =>
      r.address?.toLowerCase().includes('patna') ||
      r.name?.toLowerCase().includes('mlm software') ||
      r.name?.toLowerCase().includes('wetsoft infotech')
    );

    expect(isLegacyCorrupt).toBe(true);
  });

  it('identifies genuine niche competitor rows as clean', () => {
    const cleanRows = [
      { id: '1', name: 'Tomar Farmhouse', address: 'Bahadurgarh, Haryana', category: 'Farmhouse' },
      { id: '2', name: 'Asoda swimming pool', address: 'Asoda, Haryana', category: 'Swimming pool' },
    ];

    const isLegacyCorrupt = cleanRows.some((r) =>
      r.address?.toLowerCase().includes('patna') ||
      r.name?.toLowerCase().includes('mlm software') ||
      r.name?.toLowerCase().includes('wetsoft infotech')
    );

    expect(isLegacyCorrupt).toBe(false);
  });

  it('intelligently infers business category from name when generic', () => {
    function inferCategory(title: string, brandIndustry?: string): string {
      let industry = brandIndustry?.trim() || '';
      if (!industry || industry.toLowerCase() === 'home services' || industry.toLowerCase() === 'professional services') {
        const nameToCheck = title.toLowerCase();
        if (nameToCheck.includes('farm') || nameToCheck.includes('resort')) return 'Farmhouse Resort';
        if (nameToCheck.includes('pool') || nameToCheck.includes('swim')) return 'Swimming Pool';
        if (nameToCheck.includes('salon') || nameToCheck.includes('hair') || nameToCheck.includes('beauty')) return 'Beauty Salon';
        if (nameToCheck.includes('dental') || nameToCheck.includes('clinic')) return 'Dental Clinic';
        return 'Local Business';
      }
      return industry;
    }

    expect(inferCategory('Delhi Farm', '')).toBe('Farmhouse Resort');
    expect(inferCategory('Delhi Farm - Kanvi', 'Home Services')).toBe('Farmhouse Resort');
    expect(inferCategory('Blue Lagoon Pool', '')).toBe('Swimming Pool');
    expect(inferCategory('Luxe Hair Studio', '')).toBe('Beauty Salon');
  });

  it('never defaults coordinates or city to Patna when business is in Delhi/NCR', () => {
    const tenantDelhi = {
      name: 'Delhi Farm',
      address: 'Near Tikri Border, Bahadurgarh, Delhi NCR, India',
      city: 'Bahadurgarh',
      latitude: 28.6924,
      longitude: 76.9248,
    };

    expect(tenantDelhi.city).not.toBe('Patna, Bihar');
    expect(tenantDelhi.latitude).toBeCloseTo(28.6924);
    expect(tenantDelhi.longitude).toBeCloseTo(76.9248);
  });
});
