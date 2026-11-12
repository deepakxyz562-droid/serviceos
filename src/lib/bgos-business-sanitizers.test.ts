import { describe, expect, it } from 'vitest';
import {
  computeOpenNowStatus,
  filterSeededFaqs,
  filterSeededServiceAreas,
  isSeededDummyService,
  isSeededDummyText,
  normalizeHoursSchedule,
  normalizeRegionState,
  normalizeWhatsAppDigits,
  resolveBusinessCurrency,
  sanitizePublicImageUrl,
  shouldRenderBgosCardHost,
} from './bgos-business-sanitizers';

describe('shouldRenderBgosCardHost', () => {
  it('renders standalone BGOS page on bgos.fieseros.com regardless of marketplaceOptIn', () => {
    expect(
      shouldRenderBgosCardHost({
        host: 'bgos.fieseros.com',
        marketplaceOptIn: true,
      }),
    ).toEqual({ action: 'render_bgos' });

    expect(
      shouldRenderBgosCardHost({
        host: 'bgos.app',
        marketplaceOptIn: false,
      }),
    ).toEqual({ action: 'render_bgos' });
  });

  it('redirects to marketplace on fieseros.com when marketplaceOptIn is true', () => {
    expect(
      shouldRenderBgosCardHost({
        host: 'fieseros.com',
        marketplaceOptIn: true,
      }),
    ).toEqual({ action: 'redirect_marketplace' });
  });

  it('moves non-marketplace business off fieseros.com to bgos host', () => {
    expect(
      shouldRenderBgosCardHost({
        host: 'www.fieseros.com',
        marketplaceOptIn: false,
      }),
    ).toEqual({ action: 'redirect_bgos_host' });
  });

  it('honors explicit card preview query parameter', () => {
    expect(
      shouldRenderBgosCardHost({
        host: 'fieseros.com',
        marketplaceOptIn: true,
        forceView: 'card',
      }),
    ).toEqual({ action: 'render_bgos' });
  });
});

describe('normalizeRegionState', () => {
  it('strips spoofed US state TX from Indian addresses and countries', () => {
    expect(
      normalizeRegionState({
        state: 'TX',
        country: 'IN',
        address: '80, Murlichak, Jagdeopath, Patna, Bihar, 800014',
        city: 'Patna',
      }),
    ).toBeNull();

    expect(
      normalizeRegionState({
        state: 'Texas',
        country: null,
        address: 'Patna, Bihar 800014',
        city: 'Patna',
      }),
    ).toBeNull();
  });

  it('preserves real US states when country is US', () => {
    expect(
      normalizeRegionState({
        state: 'TX',
        country: 'US',
        address: '1420 Main St, Dallas, TX',
        city: 'Dallas',
      }),
    ).toBe('TX');
  });

  it('preserves genuine non-US state names like Bihar', () => {
    expect(
      normalizeRegionState({
        state: 'Bihar',
        country: 'IN',
        address: 'Patna, Bihar 800014',
        city: 'Patna',
      }),
    ).toBe('Bihar');
  });
});

describe('dummy content sanitizers', () => {
  it('detects legacy Dallas / Home Services boilerplate copy', () => {
    expect(
      isSeededDummyText(
        'Your trusted partner for expert home services and reliable repairs across Dallas, TX.',
      ),
    ).toBe(true);
    expect(
      isSeededDummyText('Kanvi Farmhouse offers private poolside stays in Hapur.'),
    ).toBe(false);
  });

  it('filters untouched seeded Emergency Service row while keeping real services', () => {
    expect(
      isSeededDummyService({
        slug: 'emergency-service',
        name: 'Emergency Service',
        description: '24/7 emergency response for urgent issues.',
      }),
    ).toBe(true);

    expect(
      isSeededDummyService({
        slug: 'emergency-service',
        name: 'Emergency Service',
        description:
          'When your critical systems fail, FieserOS provides rapid Emergency Service across Patna and the Downtown area.',
        basePrice: 150,
        duration: 90,
      }),
    ).toBe(true);

    expect(
      isSeededDummyService({
        slug: 'inspection-maintenance',
        name: 'Inspection & Maintenance',
        description:
          'Proactive Inspection & Maintenance is essential. Our team serves the North Side and surrounding suburbs.',
        basePrice: 89,
        duration: 60,
      }),
    ).toBe(true);

    expect(
      isSeededDummyService({
        slug: 'custom-consulting',
        name: 'Cloud Architecture Audit',
        description: 'Full infrastructure audit for startups.',
      }),
    ).toBe(false);
  });

  it('rejects non-web local device URIs via sanitizePublicImageUrl while keeping https/relative URLs', () => {
    expect(sanitizePublicImageUrl('file:///var/mobile/Containers/Data/logo.png')).toBeNull();
    expect(sanitizePublicImageUrl('content://media/external/images/1')).toBeNull();
    expect(sanitizePublicImageUrl('ph://ED7AC36B-A150-4C38-BB8C-B6D696F4F2ED')).toBeNull();
    expect(sanitizePublicImageUrl('blob:https://bgos.fieseros.com/123')).toBeNull();
    expect(sanitizePublicImageUrl('https://cdn.fieseros.com/logos/brand.png')).toBe(
      'https://cdn.fieseros.com/logos/brand.png',
    );
    expect(sanitizePublicImageUrl('/uploads/logo.png')).toBe('/uploads/logo.png');
  });

  it('filters pure placeholder Downtown..Suburbs areas while preserving real neighborhoods', () => {
    expect(
      filterSeededServiceAreas([
        'Downtown',
        'North Side',
        'South Side',
        'East Side',
        'West Side',
        'Suburbs',
      ]),
    ).toEqual([]);

    expect(filterSeededServiceAreas(['Kankarbagh', 'Boring Road', 'Patna'])).toEqual([
      'Kankarbagh',
      'Boring Road',
      'Patna',
    ]);
  });

  it('filters fake Texas/dispatch FAQs while preserving owner-written FAQs', () => {
    expect(
      filterSeededFaqs([
        {
          question: 'Do you offer emergency repair service?',
          answer: 'Contact us and we will dispatch a technician right away.',
        },
        {
          question: 'Do you support GST invoicing?',
          answer: 'Yes, we issue GST compliant invoices for every engagement.',
        },
      ]),
    ).toEqual([
      {
        question: 'Do you support GST invoicing?',
        answer: 'Yes, we issue GST compliant invoices for every engagement.',
      },
    ]);
  });
});

describe('currency, WhatsApp & hours helpers', () => {
  it('infers INR from Indian address or +91 phone when currency defaulted to USD', () => {
    expect(
      resolveBusinessCurrency({
        currency: 'USD',
        country: null,
        address: 'Rukanpura, Patna, Bihar, 800014',
        phone: '+918505945123',
      }),
    ).toBe('INR');
  });

  it('normalizes national 10-digit WhatsApp numbers using country code', () => {
    expect(normalizeWhatsAppDigits('8505945123', 'IN')).toBe('918505945123');
    expect(normalizeWhatsAppDigits('+91 85059 45123', 'IN')).toBe('918505945123');
  });

  it('parses schedule & evaluates open status cleanly', () => {
    const schedule = normalizeHoursSchedule(
      JSON.stringify({
        mon: { open: '09:00', close: '18:00' },
        sun: { closed: true },
      }),
    );
    expect(schedule).toHaveLength(2);
    expect(schedule[0]).toEqual({
      day: 'Monday',
      shortDay: 'Mon',
      open: true,
      openTime: '09:00',
      closeTime: '18:00',
    });
    expect(schedule[1]).toEqual({
      day: 'Sunday',
      shortDay: 'Sun',
      open: false,
      openTime: '09:00',
      closeTime: '18:00',
    });
    expect(computeOpenNowStatus(schedule, 'Asia/Kolkata')).not.toBeUndefined();
  });
});
