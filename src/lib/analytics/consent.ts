/**
 * Analytics Consent Bridge
 * ========================
 *
 * Connects the cookie-consent banner (which writes the user's decision to
 * localStorage under `fieseros_consent`) with Google Consent Mode v2.
 *
 * WHY THIS EXISTS:
 *   The site shows a cookie banner on first visit. When the user accepts or
 *   rejects cookies, the banner persists the decision. But GA4 has already
 *   loaded by then (in "denied" consent mode — no cookies, modeled data only).
 *   These helpers push the user's decision to gtag so GA4 can start/stop
 *   writing cookies in real time, without a page reload.
 *
 * CONSENT MAPPING (Consent Mode v2):
 *   analytics_storage      <- prefs.analytics      (GA4 pageview/event cookies)
 *   ad_storage             <- prefs.advertising    (remarketing cookies)
 *   ad_user_data           <- prefs.advertising    (send user data to Google for ads)
 *   ad_personalization     <- prefs.advertising    (personalized ads)
 *   functionality_storage  <- prefs.functionality  (UI prefs like theme)
 *   performance_storage    <- prefs.performance    (Web Vitals / RUM cookies)
 *
 * SAFETY:
 *   All calls are no-ops when `window.gtag` is undefined (e.g. during SSR, or
 *   when NEXT_PUBLIC_GA_ID is not set and the analytics scripts didn't load).
 */

/** Shape of the consent record stored in localStorage by the banner. */
export type ConsentPreferences = {
  necessary: boolean;
  performance: boolean;
  functionality: boolean;
  analytics: boolean;
  advertising: boolean;
  timestamp: number;
};

/**
 * Push a Consent Mode v2 `update` to gtag based on the user's preferences.
 * Call this immediately after the banner records the user's choice.
 *
 * Client-only; safe to call from a "use client" component event handler.
 */
export function updateAnalyticsConsent(
  prefs: Pick<
    ConsentPreferences,
    "analytics" | "advertising" | "functionality" | "performance"
  >,
): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;

  w.gtag("consent", "update", {
    analytics_storage: prefs.analytics ? "granted" : "denied",
    ad_storage: prefs.advertising ? "granted" : "denied",
    ad_user_data: prefs.advertising ? "granted" : "denied",
    ad_personalization: prefs.advertising ? "granted" : "denied",
    functionality_storage: prefs.functionality ? "granted" : "denied",
    performance_storage: prefs.performance ? "granted" : "denied",
  });
}

/**
 * Send a GA4 event. No-op when gtag isn't loaded (e.g. dev, or consent denied
 * and the user hasn't accepted yet - though gtag itself is always loaded, it
 * just doesn't write cookies when consent is denied).
 *
 * @example trackEvent('signup_click', { cta: 'header' })
 */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  w.gtag("event", name, params ?? {});
}

/**
 * Send a virtual page_view (for client-side route changes if ever needed).
 * Next.js App Router doesn't require this for full page loads - GA4's
 * automatic config send_page_view handles initial loads. This is only for
 * SPA-style navigation where you want to count a virtual view.
 */
export function trackPageView(url: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "page_view", { page_path: url });
}
