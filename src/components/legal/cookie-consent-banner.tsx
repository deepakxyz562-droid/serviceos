"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateAnalyticsConsent } from "@/lib/analytics/consent";

/**
 * CookieConsentBanner
 *
 * Shows a slide-up cookie consent banner to first-time visitors. Stores the
 * user's decision in localStorage under the key `fieseros_consent`. Once a
 * decision is recorded, the banner stays hidden until that key is cleared.
 *
 * Hidden on `/cookie-policy` itself (the user is already reading it).
 *
 * Implementation note: we read the consent state with `useSyncExternalStore`
 * rather than a manual `useEffect` + `setState` pair so we don't trigger the
 * `react-hooks/set-state-in-effect` lint rule (calling setState synchronously
 * inside an effect is flagged because it can cause cascading renders). A local
 * `dismissed` state is used to hide the banner immediately after a click,
 * before the next render reads the freshly written localStorage value.
 *
 * PERF: previously used framer-motion for the slide-up animation. Since this
 * component renders in the root layout, framer-motion (~50KB+ gz) was shipped
 * on EVERY page of the site for a single non-essential animation. Replaced
 * with CSS transitions (transform + opacity) — same visual effect, zero JS.
 * The exit animation is handled by a 300ms timeout that keeps the element
 * mounted while transitioning out, replicating AnimatePresence behavior.
 */

const CONSENT_KEY = "fieseros_consent";
// Session flag — once the user scrolls past the banner, we hide it for the
// rest of the session so it doesn't keep popping back over content. Unlike
// CONSENT_KEY (which is a permanent decision), this is just a "defer" so the
// banner can reappear on a future visit and actually get a decision.
const DEFERRED_KEY = "fieseros_consent_deferred";

// Duration of the CSS exit transition (must match the `duration-300` class).
const EXIT_ANIMATION_MS = 300;

type ConsentPreferences = {
  necessary: boolean;
  performance: boolean;
  functionality: boolean;
  analytics: boolean;
  advertising: boolean;
  timestamp: number;
};

const ACCEPT_ALL: Omit<ConsentPreferences, "timestamp"> = {
  necessary: true,
  performance: true,
  functionality: true,
  analytics: true,
  advertising: true,
};

const NECESSARY_ONLY: Omit<ConsentPreferences, "timestamp"> = {
  necessary: true,
  performance: false,
  functionality: false,
  analytics: false,
  advertising: false,
};

function readConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentPreferences;
    // Basic shape guard — if the stored value doesn't look right, ignore it.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.necessary !== "boolean" ||
      typeof parsed.timestamp !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    // localStorage may be disabled (private mode, etc.) — fail silently.
  }
}

// ── useSyncExternalStore helpers ──────────────────────────────────────────
// We don't need a real subscription — the banner is one-shot. We listen to
// `storage` events purely so a consent decision made in another tab is
// respected in this one.
const subscribeConsent = (callback: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getClientSnapshot = (): boolean => {
  if (typeof window === "undefined") return false;
  // Hide on the cookie policy page itself — the user is already reading it.
  if (window.location.pathname === "/cookie-policy") return false;
  // Show the banner only when no valid consent decision exists yet AND the
  // user hasn't deferred it this session (scroll-to-dismiss sets the defer
  // flag so the banner doesn't keep overlapping content after the user
  // started exploring).
  if (window.sessionStorage.getItem(DEFERRED_KEY) === "1") return false;
  return readConsent() === null;
};

const getServerSnapshot = (): boolean => false;

export function CookieConsentBanner() {
  const shouldShow = useSyncExternalStore(
    subscribeConsent,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);
  // `leaving` keeps the element mounted during the CSS exit transition so
  // it animates out instead of vanishing instantly (replicates AnimatePresence).
  const [leaving, setLeaving] = useState(false);

  const visible = shouldShow && !dismissed;

  // Scroll-to-dismiss: once the user scrolls past 10px, treat it as a
  // "defer" — hide the banner for the rest of the session so it stops
  // overlapping content. We do NOT record a consent decision (the banner
  // will reappear on the next visit). The threshold is intentionally tiny
  // (10px instead of 140px) so the banner gets out of the way the moment
  // the user touches the scrollwheel/trackpad — this is critical on short
  // mobile viewports where the banner can overlap hero CTAs.
  useEffect(() => {
    if (!visible) return;
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      if (window.scrollY > 10) {
        fired = true;
        try {
          window.sessionStorage.setItem(DEFERRED_KEY, "1");
        } catch {
          // sessionStorage may be disabled — fail silently.
        }
        setDismissed(true);
        window.removeEventListener("scroll", onScroll, { passive: true } as EventListenerOptions);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { passive: true } as EventListenerOptions);
    };
  }, [visible]);

  // Trigger the exit transition when `visible` goes false. Keep the element
  // mounted for EXIT_ANIMATION_MS so the CSS transition can play, then unmount.
  useEffect(() => {
    if (visible) {
      setLeaving(false);
      return;
    }
    // If we were previously visible (element is mounted), start the exit.
    setLeaving(true);
    const timer = setTimeout(() => setLeaving(false), EXIT_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleAcceptAll = () => {
    writeConsent({ ...ACCEPT_ALL, timestamp: Date.now() });
    // Push the decision to Google Consent Mode v2 so GA4 starts writing
    // cookies immediately, without a page reload.
    updateAnalyticsConsent(ACCEPT_ALL);
    setDismissed(true);
  };

  const handleNecessaryOnly = () => {
    writeConsent({ ...NECESSARY_ONLY, timestamp: Date.now() });
    // Explicitly deny analytics/advertising storage so any modeled tracking
    // the user may have implicitly had is stopped.
    updateAnalyticsConsent(NECESSARY_ONLY);
    setDismissed(true);
  };

  // `mounted` = the element is in the DOM (either entering or leaving).
  // `entering` = the element should be in its final (visible) position.
  const mounted = visible || leaving;
  const entering = visible;

  if (!mounted) return null;

  return (
    <div
      key="cookie-consent-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      // pointer-events-none on the wrapper so the full-width fixed strip
      // never blocks clicks to content ABOVE/AROUND the visible card.
      // The inner Card re-enables pointer events on its own area.
      //
      // CSS transition replaces framer-motion: slide-up + fade.
      // `motion-reduce:` disables the transform for users who prefer reduced
      // motion (same accessibility behavior as useReducedMotion()).
      className={
        "pointer-events-none fixed bottom-0 left-0 right-0 z-[60] px-3 pb-3 transition-all duration-300 ease-out sm:bottom-4 sm:left-1/2 sm:right-auto sm:max-w-2xl w-full sm:w-auto sm:px-0 sm:pb-0 " +
        (entering
          ? "translate-y-0 opacity-100 sm:-translate-x-1/2"
          : "translate-y-full opacity-0 sm:-translate-x-1/2") +
        " motion-reduce:transition-none motion-reduce:translate-y-0"
      }
    >
      <Card className="pointer-events-auto gap-0 rounded-none border-border bg-white p-0 shadow-lg sm:rounded-xl sm:p-6">
        {/* ── Mobile: compact single-line bar (~52px tall) ──────────────
            On short viewports the full card (~260px) overlaps hero CTAs.
            The mobile bar keeps just the essentials: a one-line message
            + two buttons. The full card with icon/title/paragraph is
            shown on sm+ where there's room. */}
        <div className="flex items-center gap-2 px-3 py-2 sm:hidden">
          <Cookie className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            We use cookies.{" "}
            <Link href="/cookie-policy" className="font-medium text-emerald-700 underline underline-offset-2">
              Policy
            </Link>
          </p>
          <Button
            type="button"
            size="sm"
            className="h-7 shrink-0 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleAcceptAll}
          >
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0 px-2.5 text-xs border-border bg-background text-foreground hover:bg-accent"
            onClick={handleNecessaryOnly}
          >
            Necessary
          </Button>
        </div>

        {/* ── Desktop: full card with icon + title + paragraph ─────────── */}
        <div className="hidden sm:flex sm:flex-row sm:items-start sm:gap-4 sm:p-0">
          <div className="hidden sm:flex sm:h-10 sm:w-10 sm:shrink-0 sm:items-center sm:justify-center sm:rounded-lg sm:bg-emerald-50">
            <Cookie className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              We value your privacy
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Fieseros uses cookies to operate our service, improve
              performance, and provide analytics. By clicking{" "}
              <span className="font-medium text-foreground">
                &quot;Accept all&quot;
              </span>
              , you consent to our use of cookies. See our{" "}
              <Link
                href="/cookie-policy"
                className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                Cookie Policy
              </Link>
              .
            </p>

            <div className="mt-4 flex flex-row flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleAcceptAll}
              >
                Accept all
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border bg-background text-foreground hover:bg-accent"
                onClick={handleNecessaryOnly}
              >
                Necessary only
              </Button>
              <Link
                href="/cookie-policy"
                className="inline-flex h-9 items-center justify-center rounded-md px-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CookieConsentBanner;
