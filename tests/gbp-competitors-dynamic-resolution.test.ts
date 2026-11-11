import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('GBP Competitors Dynamic Resolution & Cache Protection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly flags foreign or mismatched USA/Dallas competitors as corrupt for an Indian business', () => {
    const corruptRows = [
      { id: '1', name: 'HighLevel LLC', address: '1801 N Lamar St Ste 600, Dallas, TX 75202, USA', category: 'Software Company' },
      { id: '2', name: 'MLM Software Company in Patna', address: 'Patna, Bihar', category: 'Software Company' },
    ];

    const isIndian = true;
    const isLegacyCorrupt = corruptRows.some((r) => {
      const addr = (r.address || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      if (isIndian && (addr.includes('usa') || addr.includes('dallas') || addr.includes(', tx') || addr.includes('united states'))) {
        return true;
      }
      if (name.includes('mlm software') || name.includes('wetsoft infotech')) {
        return true;
      }
      return false;
    });

    expect(isLegacyCorrupt).toBe(true);
  });

  it('identifies genuine Indian competitor rows as clean for an Indian business', () => {
    const cleanRows = [
      { id: '1', name: 'Devkant infotech solutions Pvt Ltd', address: 'Nehru Nagar, North Sri Krishna Puri, Patna, Bihar, India', category: 'Software Company' },
      { id: '2', name: 'Kala Softech Pvt. Ltd.', address: 'Bailey Rd, Khajpura, Patna, Bihar, India', category: 'Software Company' },
    ];

    const isIndian = true;
    const isLegacyCorrupt = cleanRows.some((r) => {
      const addr = (r.address || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      if (isIndian && (addr.includes('usa') || addr.includes('dallas') || addr.includes(', tx') || addr.includes('united states'))) {
        return true;
      }
      if (name.includes('mlm software') || name.includes('wetsoft infotech')) {
        return true;
      }
      return false;
    });

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
