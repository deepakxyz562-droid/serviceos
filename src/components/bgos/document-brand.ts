'use client';

import { useEffect } from 'react';

/** Apply workspace branding without changing other products' document metadata. */
export function useBgosDocumentBrand(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previousTitle = document.title;
    const hadTheme = document.documentElement.classList.contains('bgos-theme');
    document.documentElement.classList.add('bgos-theme');
    document.title = 'BGOS — Business Growth OS';
    const saved: { element: Element; attribute: string; value: string | null }[] = [];
    const created: Element[] = [];
    const set = (selector: string, tag: string, attrs: Record<string, string>, attribute: string, value: string) => {
      let elements = Array.from(document.head.querySelectorAll(selector));
      if (!elements.length) {
        const element = document.createElement(tag);
        Object.entries(attrs).forEach(([name, content]) => element.setAttribute(name, content));
        document.head.appendChild(element); created.push(element); elements = [element];
      }
      elements.forEach(element => { saved.push({ element, attribute, value: element.getAttribute(attribute) }); element.setAttribute(attribute, value); });
    };
    set('link[rel="icon"], link[rel="shortcut icon"]', 'link', { rel: 'icon' }, 'href', '/bgos/icon.svg');
    set('link[rel="apple-touch-icon"]', 'link', { rel: 'apple-touch-icon' }, 'href', '/bgos/apple-touch-icon.png');
    set('link[rel="manifest"]', 'link', { rel: 'manifest' }, 'href', '/bgos/manifest.webmanifest');
    set('meta[name="theme-color"]', 'meta', { name: 'theme-color' }, 'content', '#009F50');
    return () => {
      document.title = previousTitle;
      if (!hadTheme) document.documentElement.classList.remove('bgos-theme');
      saved.forEach(({ element, attribute, value }) => value === null ? element.removeAttribute(attribute) : element.setAttribute(attribute, value));
      created.forEach(element => element.remove());
    };
  }, [active]);
}
