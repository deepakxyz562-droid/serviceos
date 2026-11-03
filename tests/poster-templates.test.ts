import { describe, it, expect } from 'vitest';
import { validateDesign, createCommercialPosterDesign } from '../shared/marketing-design';
import {
  POSTER_TEMPLATES,
  POSTER_CATEGORIES,
  POSTER_OCCASION_WINDOWS,
  getActivePosterOccasions,
  orderTemplatesForGallery,
  matchIndustryScore,
  buildTemplateDesignDoc,
  templateToDesignInput,
  getTemplateById,
  type PosterAspect,
} from '../shared/poster-templates';

const ALL_ASPECTS: PosterAspect[] = ['1:1', '4:5', '9:16', '16:9'];
const business = {
  businessName: 'Sharma Jewellers',
  phone: '+91 98765 43210',
  website: 'https://sharmajewellers.in',
  tagline: 'Since 1995',
  category: 'Jewellery Store',
};

describe('poster template registry', () => {
  it('exposes every category from the meta list and covers all 9 categories', () => {
    const categoryIds = new Set(POSTER_TEMPLATES.map((t) => t.category));
    expect(categoryIds.size).toBe(POSTER_CATEGORIES.length);
    for (const cat of POSTER_CATEGORIES) {
      expect(categoryIds.has(cat.id)).toBe(true);
    }
  });

  it('has unique template ids and contains at least 60 curated templates', () => {
    const ids = POSTER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(POSTER_TEMPLATES.length).toBeGreaterThanOrEqual(60);
    // Verifies new creative and standard templates are present
    expect(ids).toContain('creative-neo-brutalist');
    expect(ids).toContain('creative-gold-atelier');
    expect(ids).toContain('creative-neon-midnight');
    expect(ids).toContain('standard-amc-contract');
    expect(ids).toContain('standard-price-guarantee');
    expect(ids).toContain('festival-eid-crescent');
    expect(ids).toContain('festival-christmas-carnival');
    expect(ids).toContain('festival-rakhi-bond');
  });

  it('gives every template a non-empty AI background prompt without text requests', () => {
    for (const t of POSTER_TEMPLATES) {
      expect(t.bgPrompt.length).toBeGreaterThan(20);
      expect(/NO TEXT/i.test(t.bgPrompt)).toBe(true);
    }
  });

  it('gives festival templates a valid occasion window id', () => {
    const windowIds = new Set(POSTER_OCCASION_WINDOWS.map((w) => w.id));
    for (const t of POSTER_TEMPLATES) {
      if (t.occasionId) {
        expect(windowIds.has(t.occasionId)).toBe(true);
        expect(t.category).toBe('festival');
      }
    }
  });

  it('composes every template into a valid design document at its own aspect', () => {
    for (const t of POSTER_TEMPLATES) {
      const doc = buildTemplateDesignDoc(t, business);
      expect(() => validateDesign(doc)).not.toThrow();
      expect(doc.layers.length).toBeGreaterThan(4);
      expect(doc.layers.some((l) => l.type === 'image' && l.src === t.photo)).toBe(true);
    }
  });

  it('composes every template at every supported aspect without validation errors', () => {
    for (const t of POSTER_TEMPLATES) {
      for (const aspect of ALL_ASPECTS) {
        const doc = buildTemplateDesignDoc(t, business, { ratio: aspect });
        expect(() => validateDesign(doc)).not.toThrow();
        const [w, h] =
          aspect === '1:1' ? [1080, 1080] : aspect === '4:5' ? [1080, 1350] : aspect === '9:16' ? [1080, 1920] : [1920, 1080];
        expect(doc.width).toBe(w);
        expect(doc.height).toBe(h);
      }
    }
  });

  it('personalises brand, phone and website into the composed document', () => {
    const doc = buildTemplateDesignDoc(POSTER_TEMPLATES[0], business);
    const brandLayer = doc.layers.find((l) => l.id === 'brand' || l.id === 'footer_brand');
    expect(brandLayer).toBeTruthy();
    const footer = doc.layers.find((l) => l.id === 'footer_brand');
    if (footer?.text) {
      expect(footer.text).toContain('Sharma Jewellers');
      expect(footer.text).toContain('+91 98765 43210');
      expect(footer.text).toContain('sharmajewellers.in');
    }
  });

  it('applies copy overrides for one-tap resize (text preserved across ratios)', () => {
    const t = POSTER_TEMPLATES[0];
    const overrides = { headline: 'CUSTOM HEADLINE', cta: 'CALL TODAY' };
    const square = buildTemplateDesignDoc(t, business, { ...overrides, ratio: '1:1' });
    const story = buildTemplateDesignDoc(t, business, { ...overrides, ratio: '9:16' });
    const headlineSquare = square.layers.find((l) => l.id === 'headline');
    const headlineStory = story.layers.find((l) => l.id === 'headline');
    expect(headlineSquare?.text).toBe('CUSTOM HEADLINE');
    expect(headlineStory?.text).toBe('CUSTOM HEADLINE');
  });

  it('keeps templateToDesignInput aligned with createCommercialPosterDesign contract', () => {
    const t = getTemplateById('diwali-glow')!;
    const input = templateToDesignInput(t, business);
    const doc = createCommercialPosterDesign(input);
    expect(() => validateDesign(doc)).not.toThrow();
    expect(input.layout).toBe(t.layout);
  });

  it('orders active occasion templates first in the gallery', () => {
    // Nov 3 → Diwali window (Sep–Nov) is active
    const ordered = orderTemplatesForGallery(POSTER_TEMPLATES, new Date(2026, 10, 3));
    const firstNonOccasionIndex = ordered.findIndex((t) => !t.occasionId || !['diwali'].includes(t.occasionId));
    const diwaliPositions = ordered
      .map((t, i) => (t.occasionId === 'diwali' ? i : -1))
      .filter((i) => i >= 0);
    expect(Math.min(...diwaliPositions)).toBeLessThan(firstNonOccasionIndex);
  });

  it('surfaces the right occasion windows per month', () => {
    expect(getActivePosterOccasions(new Date(2026, 10, 1)).map((o) => o.id)).toContain('diwali');
    expect(getActivePosterOccasions(new Date(2026, 0, 1)).map((o) => o.id)).toContain('new_year');
    expect(getActivePosterOccasions(new Date(2026, 0, 1)).map((o) => o.id)).toContain('republic_day');
    expect(getActivePosterOccasions(new Date(2026, 7, 15)).map((o) => o.id)).toContain('independence_day');
    expect(getActivePosterOccasions(new Date(2026, 5, 1)).map((o) => o.id)).toContain('monsoon');
  });

  it('ranks industry-matched templates higher for personalised picks', () => {
    expect(matchIndustryScore(getTemplateById('jewellery-gold-offer')!, 'Jewellery Store')).toBe(1);
    expect(matchIndustryScore(getTemplateById('jewellery-gold-offer')!, 'Salon & Spa')).toBe(0);
    expect(matchIndustryScore(getTemplateById('hiring-bold')!, 'Jewellery Store')).toBe(0.5);
  });

  it('returns undefined for unknown template ids', () => {
    expect(getTemplateById('does-not-exist')).toBeUndefined();
  });
});


describe('Studio poster collection', () => {
 it('adds 60 authored posters with unique composition geometry and editable text', () => {
  const templates = POSTER_TEMPLATES.filter(t => t.id.startsWith('studio-'));
  expect(templates).toHaveLength(60);
  expect(templates.filter(t => t.collection === 'creative')).toHaveLength(30);
  expect(templates.filter(t => t.collection === 'standard')).toHaveLength(30);
  const geometry = templates.map(t => JSON.stringify(buildTemplateDesignDoc(t, business).layers.map(l=>[l.id,l.x,l.y,l.width,l.height])));
  expect(new Set(geometry).size).toBe(60);
  for (const t of templates) {
   const doc = buildTemplateDesignDoc(t, business);
   expect(doc.layers.find(l=>l.id==='headline')?.type).toBe('text');
   expect(doc.layers.find(l=>l.id==='bg_photo')?.type).toBe('image');
   expect(t.headline+t.subtitle+t.badge).not.toMatch(/guarantee|\d+%|#1|zero wait/i);
  }
 });
 it('fits long business names without losing the stored content', () => {
  for(const t of POSTER_TEMPLATES){
   const name='The Northside Family Business and Community Services Collective';
   const doc=buildTemplateDesignDoc(t,{...business,businessName:name});
   const brand=doc.layers.find(l=>l.id==='brand')!;
   expect(brand.text).toBe(name);
   expect(brand.fontSize).toBeLessThanOrEqual(28);
  }
 });
});
