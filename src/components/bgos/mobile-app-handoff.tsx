'use client';

import React, { useEffect } from 'react';

interface MobileAppHandoffProps {
  appSchemeUrl: string;
  webFallbackUrl: string;
  actionTitle: string;
}

/**
 * Automatically attempts to open the native BGOS app via `bgos://open?...` on mobile browsers,
 * with a prominent 1-tap button and a non-blocking web fallback link.
 */
export function MobileAppHandoff({
  appSchemeUrl,
  webFallbackUrl,
  actionTitle,
}: MobileAppHandoffProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.location.href = appSchemeUrl;
      } catch {
        // User can tap the button or fallback link below
      }
    }, 60);

    return () => window.clearTimeout(timer);
  }, [appSchemeUrl]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          padding: '28px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08)',
        }}
      >
        <img
          src="/bgos/icon-192.png"
          width={56}
          height={56}
          alt="BGOS"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            margin: '0 auto 14px',
            display: 'block',
          }}
        />
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#009F50',
            marginBottom: '6px',
          }}
        >
          BGOS &middot; Business Growth OS
        </div>
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '20px',
            fontWeight: 800,
            color: '#0F172A',
          }}
        >
          {actionTitle}
        </h1>
        <p
          style={{
            margin: '0 0 22px',
            fontSize: '13.5px',
            lineHeight: 1.5,
            color: '#64748B',
          }}
        >
          Opening the BGOS mobile app on your device. If it does not switch automatically, tap the
          button below.
        </p>

        <a
          href={appSchemeUrl}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: '#009F50',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 700,
            padding: '13px 20px',
            borderRadius: '12px',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          Open in BGOS App
        </a>

        <a
          href={webFallbackUrl}
          style={{
            display: 'inline-block',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'underline',
            padding: '6px 8px',
          }}
        >
          Continue in Browser &rarr;
        </a>
      </div>
    </div>
  );
}
