import { ImageResponse } from 'next/og';

/**
 * Default OpenGraph image for the entire Fieseros site.
 *
 * Next.js App Router convention: placing `opengraph-image.tsx` in `src/app/`
 * automatically generates the OG image for every route that doesn't override
 * it with its own `opengraph-image.tsx` or an explicit `openGraph.images`
 * metadata field.
 *
 * This fixes the P0 bug where /public/og/og-default.png did not exist —
 * every social share (Facebook, Twitter, LinkedIn, Slack) was showing a
 * broken image. Now a branded 1200×630 PNG is generated on-the-fly via
 * next/og (ImageResponse / Satori).
 *
 * Design: dark emerald gradient, Fieseros wordmark + tagline + feature
 * keywords. Clean, professional, on-brand.
 */

export const alt = 'Fieseros — Field Service Software & CRM for Service Businesses';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Cache for 1 hour — the design is static so this is safe.
export const revalidate = 3600;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #0f172a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: Logo + brand name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              color: 'white',
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div style={{ fontSize: '44px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Fieseros
          </div>
        </div>

        {/* Middle: Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '68px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Field Service Software
          </div>
          <div style={{ fontSize: '32px', fontWeight: 400, color: '#6ee7b7', lineHeight: 1.3 }}>
            The Operating System for Service Businesses
          </div>
        </div>

        {/* Bottom: Feature keywords + URL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '24px', fontSize: '24px', color: '#94a3b8', fontWeight: 500 }}>
            <span>Scheduling</span>
            <span style={{ color: '#475569' }}>•</span>
            <span>Dispatch</span>
            <span style={{ color: '#475569' }}>•</span>
            <span>Invoicing</span>
            <span style={{ color: '#475569' }}>•</span>
            <span>CRM</span>
          </div>
          <div style={{ fontSize: '24px', color: '#6ee7b7', fontWeight: 600 }}>
            fieseros.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
