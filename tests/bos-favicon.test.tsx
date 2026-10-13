import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, proxy } from '@/proxy';
import { useBosDocumentBrand } from '@/components/bos/document-brand';
import { BOS_FAVICON_SRC, BOS_TOUCH_ICON_SRC } from '@/lib/bos-icons';

function Brand({ section = 'Dashboard' }: { section?: string }) {
  useBosDocumentBrand({ sectionLabel: section });
  return null;
}

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
});

describe('BOS favicon isolation', () => {
  it('runs the proxy for the automatic Next favicon route', () => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: '/favicon.ico?hash' })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: '/_next/static/chunk.js' })).toBe(false);
  });
  it('replaces all competing platform icons and repairs icons added during navigation', async () => {
    document.head.innerHTML = `<link rel="icon" href="/favicon.ico"><link rel="icon" href="/favicon-16.png" sizes="16x16"><link rel="icon" href="/icon-512.png"><link rel="apple-touch-icon" href="/icon-180.png"><link rel="apple-touch-icon" href="/icon-152.png">`;
    const view = render(<Brand />);
    for (const link of document.head.querySelectorAll('link[rel="icon"]')) {
      expect(link.getAttribute('href')).toBe(BOS_FAVICON_SRC);
      expect(link.getAttribute('sizes')).toBe('128x128');
    }
    for (const link of document.head.querySelectorAll('link[rel="apple-touch-icon"]')) {
      expect(link.getAttribute('href')).toBe(BOS_TOUCH_ICON_SRC);
    }
    const streamedIcon = document.createElement('link');
    streamedIcon.rel = 'icon';
    streamedIcon.href = '/favicon.png';
    document.head.appendChild(streamedIcon);
    await waitFor(() => expect(streamedIcon.getAttribute('href')).toBe(BOS_FAVICON_SRC));
    view.rerender(<Brand section="Customers" />);
    expect(document.title).toBe('Customers · BOS — Business Operating System');
    view.unmount();
    streamedIcon.href = '/other-app.ico';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(streamedIcon.getAttribute('href')).toBe('/other-app.ico');
  });

  it.each(['/favicon.ico?next-generated-hash', '/favicon.png', '/favicon-16.png', '/icon-192.png', '/icon-180.png'])('routes %s to BOS artwork before hydration', async (path) => {
    const response = await proxy(new NextRequest(`https://bos.fieseros.com${path}`, { headers: { host: 'bos.fieseros.com' } }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`https://bos.fieseros.com${path.startsWith('/favicon.ico') ? BOS_FAVICON_SRC : BOS_TOUCH_ICON_SRC}`);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each(['fieseros.com', 'bgos.fieseros.com', 'quoteflow.fieseros.com'])('preserves %s favicon routing', async (host) => {
    const response = await proxy(new NextRequest(`https://${host}/favicon.ico`, { headers: { host } }));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('ships the same valid ICO with BOS PNG artwork in both apps', () => {
    const icon = readFileSync(`public${BOS_FAVICON_SRC}`);
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(icon.readUInt16LE(4)).toBe(1);
    expect(icon.subarray(icon.readUInt32LE(18))).toEqual(readFileSync('public/bos/logo-mark.png'));
    expect(readFileSync(`apps/bos/public${BOS_FAVICON_SRC}`)).toEqual(icon);
  });
});
