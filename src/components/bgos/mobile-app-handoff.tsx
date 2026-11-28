'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { MobilePlatform } from '@/lib/bgos/open-handoff';

interface MobileAppHandoffProps {
  platform?: MobilePlatform;
  appSchemeUrl: string;
  androidIntentUrl?: string;
  storeUrl?: string | null;
  storeLabel?: string | null;
  webFallbackUrl: string;
  actionTitle: string;
}

/**
 * Automatically opens the installed BGOS mobile app (`intent://` on Android,
 * `bgos://open?...` on iOS) and falls back cleanly to Google Play / App Store
 * if the page stays active after 1.5 seconds (app not installed).
 */
export function MobileAppHandoff({
  platform = 'mobile',
  appSchemeUrl,
  androidIntentUrl,
  storeUrl = null,
  storeLabel = null,
  webFallbackUrl,
  actionTitle,
}: MobileAppHandoffProps) {
  const [fallbackReady, setFallbackReady] = useState(false);
  const appOpenedRef = useRef(false);

  const primaryLaunchUrl =
    platform === 'android' && androidIntentUrl ? androidIntentUrl : appSchemeUrl;

  useEffect(() => {
    appOpenedRef.current = false;

    const markOpened = () => {
      if (document.visibilityState === 'hidden') {
        appOpenedRef.current = true;
      }
    };
    const markBackgrounded = () => {
      appOpenedRef.current = true;
    };

    document.addEventListener('visibilitychange', markOpened);
    window.addEventListener('pagehide', markBackgrounded);
    window.addEventListener('blur', markBackgrounded);

    const launchTimer = window.setTimeout(() => {
      try {
        window.location.href = primaryLaunchUrl;
      } catch {
        if (primaryLaunchUrl !== appSchemeUrl) {
          try {
            window.location.href = appSchemeUrl;
          } catch {
            // Fall through to fallback timer
          }
        }
      }
    }, 60);

    // If the app didn't launch or prompt within 1.8s, surface / open store fallback.
    const fallbackTimer = window.setTimeout(() => {
      if (appOpenedRef.current || document.visibilityState === 'hidden') return;
      setFallbackReady(true);
      if (storeUrl && document.hasFocus()) {
        try {
          window.location.href = storeUrl;
        } catch {
          // Keep visible store button available below
        }
      }
    }, 1800);

    return () => {
      window.clearTimeout(launchTimer);
      window.clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', markOpened);
      window.removeEventListener('pagehide', markBackgrounded);
      window.removeEventListener('blur', markBackgrounded);
    };
  }, [primaryLaunchUrl, appSchemeUrl, storeUrl]);

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
          {fallbackReady && storeUrl ? 'Get the BGOS Mobile App' : actionTitle}
        </h1>
        <p
          style={{
            margin: '0 0 22px',
            fontSize: '13.5px',
            lineHeight: 1.5,
            color: '#64748B',
          }}
        >
          {fallbackReady && storeUrl
            ? 'BGOS is not installed yet on this device. Install it from the store or tap below if you already have it.'
            : 'Opening the BGOS mobile app on your device. If it does not open automatically, tap below.'}
        </p>

        {storeUrl && storeLabel ? (
          <a
            href={storeUrl}
            style={{
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: fallbackReady ? '#009F50' : '#0F172A',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              padding: '13px 20px',
              borderRadius: '12px',
              textDecoration: 'none',
              marginBottom: '10px',
            }}
          >
            {storeLabel}
          </a>
        ) : null}

        <a
          href={primaryLaunchUrl}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: fallbackReady && storeUrl ? '#F1F5F9' : '#009F50',
            color: fallbackReady && storeUrl ? '#0F172A' : '#FFFFFF',
            fontSize: '14px',
            fontWeight: 700,
            padding: '12px 20px',
            borderRadius: '12px',
            textDecoration: 'none',
            border: fallbackReady && storeUrl ? '1px solid #CBD5E1' : 'none',
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
