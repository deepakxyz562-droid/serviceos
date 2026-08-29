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
 * Optimized: Uses pure CSS transitions instead of framer-motion to eliminate
 * ~50KB+ gzip bundle overhead on every page load.
 */

const STORAGE_KEY = "fieseros_consent";

export type ConsentDecision = "granted" | "denied";

export function getConsentState(): ConsentDecision | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "granted" || value === "denied") {
      return value;
    }
  } catch {
    // localStorage read error
  }
  return null;
}

function subscribeConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function CookieConsentBanner() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentState,
    () => null
  );

  const [mounted, setMounted] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setMounted(true);
    setPathname(window.location.pathname);
  }, []);

  const isPolicyPage = pathname === "/cookie-policy";
  const visible = mounted && !consent && !isPolicyPage;

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "granted");
    } catch {}
    updateAnalyticsConsent("granted");
    window.dispatchEvent(new Event("storage"));
  };

  const handleNecessaryOnly = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "denied");
    } catch {}
    updateAnalyticsConsent("denied");
    window.dispatchEvent(new Event("storage"));
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[60] px-3 pb-3 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-2xl w-full sm:w-auto sm:px-0 sm:pb-0 transition-all duration-300 ease-out translate-y-0 opacity-100"
    >
      <Card className="pointer-events-auto gap-0 rounded-none border-border bg-white p-0 shadow-lg sm:rounded-xl sm:p-6">
        {/* Mobile compact bar */}
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

        {/* Desktop full card */}
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
