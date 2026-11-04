import { describe, it, expect } from 'vitest';
import { layersAtPoint, toolForLayer } from '../shared/design-selection';
import { composeProfessionalPoster } from '../shared/professional-posters';

describe('Design Selection & Hit Testing', () => {
  const doc = composeProfessionalPoster({
    layout: 'professional_plumbing',
    brand: 'Quick Plumbing',
    headline: '24/7 Emergency Plumber',
    subtitle: 'Drain Unblocking\nLeak Repair',
    phone: '+91 98765 43210',
    website: 'quickplumbing.in',
    cta: 'Call Now',
    ratio: '1:1',
  });

  it('promotes text layers above background photo on overlapping coordinates', () => {
    const headline = doc.layers.find((l) => l.id === 'headline')!;
    // Point inside headline box
    const hitX = headline.x + headline.width / 2;
    const hitY = headline.y + headline.height / 2;

    const hits = layersAtPoint(doc, hitX, hitY);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe('headline');
    expect(hits[0].type).toBe('text');
  });

  it('selects background photo when tapping an area with no text', () => {
    // In plumbing 1:1, right half has no text (x: 900, y: 500)
    const hits = layersAtPoint(doc, 900, 500);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe('bg_photo');
    expect(hits[0].type).toBe('image');
  });

  it('excludes decorative scrims and gradient fades from direct canvas taps', () => {
    // Scrim covers left side from x: 0 to 400
    // An area with scrim but no text: e.g. x: 50, y: 20
    const hits = layersAtPoint(doc, 50, 20);
    expect(hits.some((l) => l.id.startsWith('copy_fade_') || l.id === 'copy_scrim')).toBe(false);
  });

  it('allows selecting decorative shapes only when explicitly requested (for Layers sheet)', () => {
    const hits = layersAtPoint(doc, 50, 20, { includeShapes: true });
    expect(hits.some((l) => l.id === 'copy_scrim')).toBe(true);
  });

  it('maps layer types to correct editing tools', () => {
    const textLayer = doc.layers.find((l) => l.type === 'text')!;
    const imageLayer = doc.layers.find((l) => l.type === 'image')!;
    const shapeLayer = doc.layers.find((l) => l.type === 'shape')!;

    expect(toolForLayer(textLayer)).toBe('text');
    expect(toolForLayer(imageLayer)).toBe('photo');
    expect(toolForLayer(shapeLayer)).toBe('color');
  });
});
