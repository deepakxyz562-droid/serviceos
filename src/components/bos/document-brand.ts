'use client';

import { useEffect } from 'react';
import { BOS_FAVICON_SRC, BOS_TOUCH_ICON_SRC } from '@/lib/bos-icons';

const BOS_DEFAULT_TITLE = 'BOS — Business Operating System';
const BOS_THEME_COLOR = '#06392A';
const BOS_MANIFEST_HREF = '/bos/manifest.webmanifest';

function upsertLink(rel: string, attrs: Record<string, string>) {
  const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`));
  if (!links.length) {
    const link = document.createElement('link');
    link.rel = rel;
    link.setAttribute('data-bos-brand', 'true');
    document.head.appendChild(link);
    links.push(link);
  }
  // Keep React-owned nodes in place, but neutralize every conflicting icon.
  links.forEach((link) => {
    Object.entries(attrs).forEach(([key, value]) => {
      if (link.getAttribute(key) !== value) link.setAttribute(key, value);
    });
  });
}

function syncBosIcons() {
  upsertLink('icon', { href: BOS_FAVICON_SRC, type: 'image/x-icon', sizes: '128x128' });
  upsertLink('shortcut icon', { href: BOS_FAVICON_SRC, type: 'image/x-icon', sizes: '128x128' });
  upsertLink('apple-touch-icon', { href: BOS_TOUCH_ICON_SRC, type: 'image/png', sizes: '128x128' });
  upsertLink('manifest', { href: BOS_MANIFEST_HREF });
}

function upsertMeta(name: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function useBosDocumentBrand({
  active = true,
  sectionLabel,
}: {
  active?: boolean;
  sectionLabel?: string | null;
} = {}) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    document.documentElement.classList.add('bos-theme');
    document.title = sectionLabel
      ? `${sectionLabel} · ${BOS_DEFAULT_TITLE}`
      : BOS_DEFAULT_TITLE;

    syncBosIcons();
    // Next navigation/streamed metadata can insert platform icons after this effect.
    const observer = new MutationObserver(syncBosIcons);
    observer.observe(document.head, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['href', 'rel', 'type', 'sizes'],
    });
    upsertMeta('theme-color', BOS_THEME_COLOR);
    upsertMeta('application-name', 'BOS');
    upsertMeta('apple-mobile-web-app-title', 'BOS');

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('bos-theme');
    };
  }, [active, sectionLabel]);
}
