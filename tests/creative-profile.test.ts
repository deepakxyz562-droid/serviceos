import { describe, it, expect } from 'vitest';
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_PRESETS,
  INDUSTRY_STARTER_CATALOGS,
  resolveBlueprintCapabilities,
} from '../shared/blueprint';
import { buildDefaultCreatorProfile } from '../src/lib/creator-profile';
import { parseMediaUrl } from '../src/lib/media-embed';

describe('Creative Business Profile & Media Showcase', () => {
  it('defines creative business type with appropriate preset capabilities and starter catalog', () => {
    const meta = BUSINESS_TYPE_LABELS['creative'];
    expect(meta).toBeDefined();
    expect(meta.label).toBe('Creative / Artist / Portfolio');
    expect(meta.icon).toBe('🎬');

    const presetCaps = BUSINESS_TYPE_PRESETS['creative'];
    expect(presetCaps).toBeDefined();
    expect(presetCaps.portfolio).toBe(true);
    expect(presetCaps.calendarBooking).toBe(true);
    expect(presetCaps.invoicing).toBe(true);
    expect(presetCaps.quotes).toBe(true);
    expect(presetCaps.whatsapp).toBe(true);
    // Creative profile does not need physical retail counter POS or inventory tracking
    expect(presetCaps.posRegister).toBe(false);
    expect(presetCaps.inventory).toBe(false);
    expect(presetCaps.dining).toBe(false);

    const starterCatalog = INDUSTRY_STARTER_CATALOGS['creative'];
    expect(starterCatalog).toBeDefined();
    expect(starterCatalog.length).toBeGreaterThan(0);
    expect(starterCatalog.some((s) => s.name.includes('Headshot') || s.name.includes('Showreel'))).toBe(true);
  });

  it('resolves capabilities correctly for creative business profile', () => {
    const caps = resolveBlueprintCapabilities('creative', ['online', 'at_location', 'whatsapp']);
    expect(caps.portfolio).toBe(true);
    expect(caps.calendarBooking).toBe(true);
    expect(caps.posRegister).toBe(false);
  });

  it('buildDefaultCreatorProfile initializes portfolioMedia and creativeSpecs for creative industry', () => {
    const profile = buildDefaultCreatorProfile({
      id: 'tenant-1',
      name: 'Aryan Varma Studio',
      slug: 'aryanvarma',
      industry: 'creative',
      currency: 'INR',
    });

    expect(profile.portfolioMedia).toBeDefined();
    expect(profile.portfolioMedia!.length).toBe(3);

    const showreel = profile.portfolioMedia!.find((m) => m.type === 'youtube');
    expect(showreel).toBeDefined();
    expect(showreel?.featured).toBe(true);
    expect(showreel?.title).toContain('Showreel');

    const instaItem = profile.portfolioMedia!.find((m) => m.type === 'instagram');
    expect(instaItem).toBeDefined();
    expect(instaItem?.url).toContain('instagram.com');

    expect(profile.creativeSpecs).toBeDefined();
    expect(profile.creativeSpecs?.profession).toBe('creator');
    expect(profile.creativeSpecs?.languages).toContain('English');
    expect(profile.creativeSpecs?.languages).toContain('Hindi');
    expect(profile.creativeSpecs?.playingAgeRange).toBe('22 - 32');
  });

  it('correctly parses and sanitizes media embed URLs', () => {
    const ytResult = parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(ytResult.type).toBe('youtube');
    expect(ytResult.embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(ytResult.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');

    const instaResult = parseMediaUrl('https://www.instagram.com/reel/C-xyz123456/');
    expect(instaResult.type).toBe('instagram');
    expect(instaResult.embedUrl).toBe('https://www.instagram.com/p/C-xyz123456/embed/captioned/');

    const badResult = parseMediaUrl('javascript:alert(1)');
    expect(badResult.type).toBe('link');
    expect(badResult.embedUrl).toBeUndefined();
  });
});
