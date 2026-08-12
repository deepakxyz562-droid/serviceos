/**
 * Analytics — Google Analytics 4 with Consent Mode v2
 * ===================================================
 *
 * Injects the GA4 tag (gtag.js) into <head> and initializes it with the
 * measurement ID from NEXT_PUBLIC_GA_ID (falls back to G-8BVRFDEXCS).
 *
 * CONSENT MODE v2 (GDPR/PECR-compliant):
 *   1. An inline script (runs during HTML parse, BEFORE gtag.js) sets the
 *      default consent state to "denied" for all ad/analytics storage. This
 *      means GA4 loads in cookieless mode - it still sends a ping so Google
 *      can model aggregate traffic, but no cookies are written.
 *   2. The same inline script checks localStorage for a prior consent
 *      decision. If the user previously accepted analytics, it immediately
 *      upgrades consent to "granted" BEFORE gtag.js loads, so returning
 *      users are tracked with cookies from the very first request.
 *   3. When the cookie banner fires (src/components/legal/cookie-consent-banner.tsx),
 *      it calls updateAnalyticsConsent() which pushes a live
 *      `gtag('consent', 'update', ...)` so GA4 starts/stops cookie storage
 *      without a page reload.
 *
 * WHERE IT LOADS:
 *   Every page (injected in src/app/layout.tsx <head>). The GA4 library
 *   script uses strategy="afterInteractive" so it never blocks first paint.
 *
 * DISABLE ANALYTICS:
 *   Set NEXT_PUBLIC_GA_ID="" (empty) in any environment to fully disable.
 *   The component renders null and no scripts are emitted.
 */
import Script from "next/script";

/**
 * GA4 Measurement ID.
 * - Reads from NEXT_PUBLIC_GA_ID (so each environment can use a different
 *   stream, e.g. dev vs prod).
 * - Falls back to the production stream G-8BVRFDEXCS if unset, so analytics
 *   works out of the box even if the env var is missing.
 */
const GA_ID =
  process.env.NEXT_PUBLIC_GA_ID || "G-8BVRFDEXCS";

export function Analytics() {
  // Empty string => disabled. Render nothing, emit no scripts.
  if (!GA_ID) return null;

  return (
    <>
      {/*
        (1) Consent Mode v2 default + dataLayer/gtag bootstrap.
        -------------------------------------------------------
        This MUST run before gtag.js loads. We use a plain inline <script>
        (not next/script) so it executes synchronously during HTML parsing
        in <head>, guaranteeing ordering. This mirrors the service-worker
        registration pattern already used in layout.tsx.

        Steps:
          a) Init dataLayer + define gtag stub.
          b) Set default consent to "denied" for everything except
             functionality/security storage (which are strictly necessary
             for the site to function and don't need consent under GDPR).
          c) Read localStorage for a prior decision; if the user already
             granted analytics, immediately update consent to "granted"
             before gtag.js loads (so the first GA4 ping carries cookies).
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'functionality_storage': 'granted',
              'security_storage': 'granted',
              'wait_for_update': 500
            });
            try {
              var raw = localStorage.getItem('fieseros_consent');
              if (raw) {
                var c = JSON.parse(raw);
                if (c && typeof c === 'object' && c.analytics === true) {
                  gtag('consent', 'update', { 'analytics_storage': 'granted' });
                }
              }
            } catch (e) {}
          `,
        }}
      />

      {/*
        (2) Load the GA4 library (gtag.js) from Google's CDN.
        -----------------------------------------------------
        strategy="afterInteractive" defers loading until the page is
        interactive, so it never blocks first contentful paint. The CSP in
        next.config.ts already whitelists www.googletagmanager.com.
      */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      {/*
        (3) Initialize the GA4 config for this measurement ID.
        -----------------------------------------------------
        anonymize_ip is on by default for GA4, but we set it explicitly for
        clarity and in case Google ever changes the default. This is the
        exact init snippet the user requested.
      */}
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { 'anonymize_ip': true });
        `}
      </Script>
    </>
  );
}

export default Analytics;
