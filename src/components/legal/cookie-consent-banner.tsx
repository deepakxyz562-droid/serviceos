"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * CookieConsentBanner
 *
 * Shows a slide-up cookie consent banner to first-time visitors. Stores the
 * user's decision in localStorage under the key `serviceos_consent`. Once a
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
 */

const CONSENT_KEY = "serviceos_consent";

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
  // Show the banner only when no valid consent decision exists yet.
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
  const prefersReducedMotion = useReducedMotion();

  const visible = shouldShow && !dismissed;

  const handleAcceptAll = () => {
    writeConsent({ ...ACCEPT_ALL, timestamp: Date.now() });
    setDismissed(true);
  };

  const handleNecessaryOnly = () => {
    writeConsent({ ...NECESSARY_ONLY, timestamp: Date.now() });
    setDismissed(true);
  };

  const motionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { y: 100, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 100, opacity: 0 },
        transition: { type: "spring" as const, stiffness: 280, damping: 30 },
      };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="cookie-consent-banner"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-4 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-2xl w-full sm:w-auto"
          {...motionProps}
        >
          <Card className="gap-0 rounded-xl border border-border bg-white p-5 shadow-lg sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="hidden sm:flex sm:h-10 sm:w-10 sm:shrink-0 sm:items-center sm:justify-center sm:rounded-lg sm:bg-emerald-50">
                <Cookie className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  We value your privacy
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  ServiceOS uses cookies to operate our service, improve
                  performance, and provide analytics. By clicking{" "}
                  <span className="font-medium text-foreground">
                    &quot;Accept all&quot;
                  </span>
                  , you consent to our use of cookies. See our{" "}
                  <Link
                    href="/cookie-policy"
                    className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
                  >
                    Cookie Policy
                  </Link>
                  .
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
                    className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:px-0"
                  >
                    Cookie Policy
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default CookieConsentBanner;
