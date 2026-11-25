export type PublishablePlatformKey = 'googlebusiness' | 'facebook' | 'instagram' | 'linkedin';

export interface PlatformVisualMeta {
  key: string;
  shortLabel: string;
  fullLabel: string;
  icon: 'place' | 'facebook' | 'photo-camera' | 'work' | 'public' | 'bookmark';
  brandIcon: 'google' | 'facebook' | 'instagram' | 'linkedin' | 'pinterest' | 'web';
  color: string;
  bg: string;
  border: string;
}

export const PLATFORM_ORDER: readonly string[] = [
  'googlebusiness',
  'facebook',
  'instagram',
  'linkedin',
  'pinterest',
  'threads',
];

export const SELECTABLE_PUBLISH_PLATFORMS: readonly PublishablePlatformKey[] = [
  'googlebusiness',
  'facebook',
  'instagram',
  'linkedin',
];

const PLATFORM_META_MAP: Record<string, PlatformVisualMeta> = {
  googlebusiness: {
    key: 'googlebusiness',
    shortLabel: 'Google',
    fullLabel: 'Google Business Profile',
    icon: 'place',
    brandIcon: 'google',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  facebook: {
    key: 'facebook',
    shortLabel: 'Facebook',
    fullLabel: 'Facebook',
    icon: 'facebook',
    brandIcon: 'facebook',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  instagram: {
    key: 'instagram',
    shortLabel: 'Instagram',
    fullLabel: 'Instagram',
    icon: 'photo-camera',
    brandIcon: 'instagram',
    color: '#BE185D',
    bg: '#FDF2F8',
    border: '#FBCFE8',
  },
  linkedin: {
    key: 'linkedin',
    shortLabel: 'LinkedIn',
    fullLabel: 'LinkedIn',
    icon: 'work',
    brandIcon: 'linkedin',
    color: '#0369A1',
    bg: '#F0F9FF',
    border: '#BAE6FD',
  },
  pinterest: {
    key: 'pinterest',
    shortLabel: 'Pinterest',
    fullLabel: 'Pinterest',
    icon: 'bookmark',
    brandIcon: 'pinterest',
    color: '#B91C1C',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
};

export function getPlatformMeta(platform?: string | null): PlatformVisualMeta {
  const key = (platform || '').trim().toLowerCase();
  return (
    PLATFORM_META_MAP[key] || {
      key: key || 'social',
      shortLabel: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Social',
      fullLabel: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Social',
      icon: 'public',
      brandIcon: 'web',
      color: '#475569',
      bg: '#F8FAFC',
      border: '#E2E8F0',
    }
  );
}

/**
 * Deduplicate publishTargets by platform so multi-location GBP accounts never render
 * repetitive badges like "GOO GOO GOO FAC INS GOO".
 */
export function dedupePublishTargets<T extends { platform?: string; status?: string; permalink?: string }>(
  targets?: T[] | null,
): T[] {
  if (!Array.isArray(targets) || targets.length === 0) return [];
  const byPlatform = new Map<string, T>();
  for (const target of targets) {
    const key = (target?.platform || '').trim().toLowerCase();
    if (!key) continue;
    const existing = byPlatform.get(key);
    if (!existing) {
      byPlatform.set(key, target);
      continue;
    }
    // Prefer published / permalinked target when collapsing duplicate location targets
    if (
      (target.status === 'published' && existing.status !== 'published') ||
      (target.permalink && !existing.permalink)
    ) {
      byPlatform.set(key, target);
    }
  }

  return Array.from(byPlatform.entries())
    .sort(([a], [b]) => {
      const idxA = PLATFORM_ORDER.indexOf(a);
      const idxB = PLATFORM_ORDER.indexOf(b);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    })
    .map(([, val]) => val);
}

/**
 * Downsize unresized Google Photos CDN URLs (=s0) to crisp mobile thumbnails so iOS/Android
 * Image decoding stays fast and avoids stalled grey placeholders.
 */
export function optimizeThumbnailUrl(rawUrl?: string | null, size = 360): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  if (/^https:\/\/lh3\.googleusercontent\.com\/.+=s0$/i.test(trimmed)) {
    return trimmed.replace(/=s0$/i, `=w${size}-h${size}-c`);
  }
  return trimmed;
}

/** Remove standalone raw "CTA: CALL" / "CTA: LEARN_MORE" metadata lines from visible captions. */
export function stripRawCtaLines(text?: string | null): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter((line) => !/^\s*CTA:\s*[A-Z0-9_\s-]+\s*$/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
