import type { DesignLayer, MarketingDesign } from './marketing-design';

/**
 * Front-to-back selectable objects, promoting text and foreground content above
 * the background photo and decorative overlays.
 *
 * For direct canvas taps (default), decorative shapes (scrims, gradient fades, marks)
 * are excluded so they never intercept taps intended for text or photos.
 * Shapes can still be selected via the Layers management sheet.
 */
export function layersAtPoint(
  doc: MarketingDesign,
  x: number,
  y: number,
  options?: { includeShapes?: boolean }
): DesignLayer[] {
  const includeShapes = options?.includeShapes ?? false;
  return doc.layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer: l }) => {
      if (l.hidden) return false;
      if (l.type === 'shape' && !includeShapes) return false;
      const angle = (-(l.rotation || 0) * Math.PI) / 180;
      const dx = x - l.x - l.width / 2;
      const dy = y - l.y - l.height / 2;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      return Math.abs(localX) <= l.width / 2 && Math.abs(localY) <= l.height / 2;
    })
    .sort((a, b) => {
      // 3: Text content (highest priority)
      // 2: Foreground images & logos
      // 1: Full-canvas background photo
      // 0: Decorative shapes
      const rank = (l: DesignLayer) =>
        l.type === 'text'
          ? 3
          : l.type === 'image' && l.id !== 'bg_photo'
            ? 2
            : l.id === 'bg_photo'
              ? 1
              : 0;
      return rank(b.layer) - rank(a.layer) || b.index - a.index;
    })
    .map(({ layer }) => layer);
}

export function toolForLayer(layer?: DesignLayer): 'text' | 'photo' | 'color' {
  return layer?.type === 'image' ? 'photo' : layer?.type === 'shape' ? 'color' : 'text';
}
