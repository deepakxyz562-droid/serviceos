'use client';

import { useEffect } from 'react';
import { BOS_LOGO_MARK_SRC } from '@/components/bos/brand';

const BOS_DEFAULT_TITLE = 'BOS — Business Operating System';
const BOS_THEME_COLOR = '#06392A';
const BOS_MANIFEST_HREF = '/bos/manifest.webmanifest';

function upsertLink(rel: string, attrs: Record<string, string>) {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][data-bos-brand="true"]`);
  if (!link) {
    link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    link.setAttribute('data-bos-brand', 'true');
    document.head.appendChild(link);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    link!.setAttribute(key, value);
  });
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

    upsertLink('icon', {
      href: BOS_LOGO_MARK_SRC,
      type: 'image/png',
      sizes: '128x128',
    });
    upsertLink('shortcut icon', {
      href: BOS_LOGO_MARK_SRC,
      type: 'image/png',
    });
    upsertLink('apple-touch-icon', {
      href: BOS_LOGO_MARK_SRC,
      sizes: '128x128',
    });
    upsertLink('manifest', {
      href: BOS_MANIFEST_HREF,
    });
    upsertMeta('theme-color', BOS_THEME_COLOR);
    upsertMeta('application-name', 'BOS');
    upsertMeta('apple-mobile-web-app-title', 'BOS');

    return () => {
      document.documentElement.classList.remove('bos-theme');
    };
  }, [active, sectionLabel]);
}
