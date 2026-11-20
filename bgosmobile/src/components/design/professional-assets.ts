import { resolvePhotoUrl } from '../../lib/constants';

// Bundled so gallery artwork works offline and before the web deployment.
export const PROFESSIONAL_ASSETS:Record<string,number>={
  '/images/bgos/templates/plumbing.webp':require('../../../assets/poster-templates/plumbing.webp'),
  '/images/bgos/templates/dental.webp':require('../../../assets/poster-templates/dental.webp'),
  '/images/bgos/templates/restaurant.webp':require('../../../assets/poster-templates/restaurant.webp'),
  '/images/bgos/templates/fitness.webp':require('../../../assets/poster-templates/fitness.webp'),
  '/images/bgos/templates/salon.webp':require('../../../assets/poster-templates/salon.webp'),
  '/images/bgos/templates/property.webp':require('../../../assets/poster-templates/property.webp'),
  '/images/bgos/templates/coaching.webp':require('../../../assets/poster-templates/coaching.webp'),
  '/images/bgos/templates/automotive.webp':require('../../../assets/poster-templates/automotive.webp'),
  '/images/bgos/templates/fashion.webp':require('../../../assets/poster-templates/fashion.webp'),
  '/images/bgos/templates/physio.webp':require('../../../assets/poster-templates/physio.webp'),
  '/images/bgos/templates/cafe.webp':require('../../../assets/poster-templates/cafe.webp'),
  '/images/bgos/templates/diwali.webp':require('../../../assets/poster-templates/diwali.webp'),
};

/**
 * Resolves a template image reference into an Image source suitable for React Native `<Image source={...} />`.
 * Prefers the offline pre-bundled asset from PROFESSIONAL_ASSETS if matched, otherwise returns `{ uri: absoluteHttpsUrl }`.
 */
export function resolveTemplateSource(url?: string | null): any {
  if (!url) {
    return PROFESSIONAL_ASSETS['/images/bgos/templates/property.webp'];
  }
  if (PROFESSIONAL_ASSETS[url]) {
    return PROFESSIONAL_ASSETS[url];
  }
  const match = url.match(/\/images\/bgos\/templates\/[^?#]+/);
  if (match && PROFESSIONAL_ASSETS[match[0]]) {
    return PROFESSIONAL_ASSETS[match[0]];
  }
  const resolved = resolvePhotoUrl(url);
  if (resolved && resolved.trim()) {
    return { uri: resolved };
  }
  return PROFESSIONAL_ASSETS['/images/bgos/templates/property.webp'];
}
