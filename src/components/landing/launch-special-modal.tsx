'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COOKIE_KEY = 'launch-special-dismissed';
const COOKIE_EXPIRY_DAYS = 7;
const SHOW_DELAY_MS = 5000; // 5 seconds

/**
 * LaunchSpecialModal — attractive marketing popup for the $5/month plan.
 *
 * Shows on the homepage + marketplace page for UNAUTHENTICATED users only.
 * - Appears after 5 seconds (doesn't block initial content)
 * - Dismissible (X button + click outside)
 * - Cookie-based: once dismissed, doesn't show again for 7 days
 * - Mobile-responsive (full-width on mobile, centered on desktop)
 * - Clicking "Claim this offer" → redirects to signup
 */
export function LaunchSpecialModal() {
  const [visible, setVisible] = useState(false);
  // Whether the launch_special plan is still active in the catalog. The
  // superadmin can deactivate the promo from Plan Catalog — when off, the
  // popup must not render at all (no error, no fallback). Defaults to false
  // so the modal never flashes before the /api/plans/public check resolves.
  const [launchSpecialActive, setLaunchSpecialActive] = useState(false);

  // Check if user is authenticated (don't show to logged-in users)
  const isAuthenticated = useCallback(() => {
    if (typeof document === 'undefined') return true;
    // Check for the auth cookie — if present, user is logged in
    return document.cookie.includes('fieseros_session');
  }, []);

  // Check if the modal was recently dismissed
  const wasDismissed = useCallback(() => {
    if (typeof document === 'undefined') return true;
    return document.cookie.includes(COOKIE_KEY);
  }, []);

  // Set the dismissal cookie (7 days)
  const dismiss = useCallback(() => {
    setVisible(false);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + COOKIE_EXPIRY_DAYS);
    document.cookie = `${COOKIE_KEY}=1; path=/; expires=${expiry.toUTCString()}; SameSite=Lax`;
  }, []);

  // Fetch the public plan catalog once to determine whether the launch_special
  // promo is still active. The /api/plans/public endpoint filters by
  // isActive=true, so launch_special disappears from the response when the
  // superadmin deactivates it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/plans/public');
        if (!res.ok) return;
        const data = await res.json();
        const codes: string[] = Array.isArray(data?.plans)
          ? data.plans.map((p: { code?: string }) => p.code)
          : [];
        if (!cancelled) setLaunchSpecialActive(codes.includes('launch_special'));
      } catch {
        // On fetch failure, leave launchSpecialActive=false so the popup
        // doesn't render a stale promo. This is the safe default.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Show the modal after a delay (only for unauthenticated + not-dismissed
  // users + only when the launch_special promo is still active).
  useEffect(() => {
    if (!launchSpecialActive) return;
    if (isAuthenticated() || wasDismissed()) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [launchSpecialActive, isAuthenticated, wasDismissed]);

  const handleClaim = () => {
    // Redirect to the signup flow. The SPA's HomePageClient reads ?auth=register
    // to show the auth form directly. Must use 'register' (not 'signup').
    window.location.href = '/?auth=register';
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={dismiss} // Click outside to dismiss
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800"
            onClick={(e) => e.stopPropagation()} // Prevent click-inside from dismissing
          >
            {/* Decorative gradient header */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-center">
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/90 text-amber-950 mb-3">
                <Clock className="size-3.5" />
                <span className="text-xs font-bold uppercase tracking-wide">First 100 Only</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Get Fieseros for $5/month
              </h2>
              <p className="text-white/90 text-sm">
                Full CRM + scheduling + invoicing — was $29
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Price display */}
              <div className="flex items-baseline justify-center gap-2 py-2">
                <span className="text-5xl font-extrabold text-emerald-600">$5</span>
                <span className="text-muted-foreground font-medium">/month</span>
                <span className="text-lg text-muted-foreground line-through ml-3">$29</span>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
                  83% OFF
                </span>
              </div>

              {/* Feature list */}
              <div className="space-y-2.5">
                {[
                  'Full Starter plan — CRM, jobs, scheduling, invoicing',
                  '14-day free trial · No credit card required',
                  'Monthly billing · Cancel anytime',
                  'Price locked for 12 months',
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="size-3 text-emerald-600" />
                    </div>
                    <span className="text-sm text-foreground/90">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                onClick={handleClaim}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base h-12 shadow-lg shadow-emerald-200"
              >
                <Zap className="size-4 mr-2" />
                Claim This Offer
                <ArrowRight className="size-4 ml-2" />
              </Button>

              {/* Urgency footer */}
              <p className="text-center text-xs text-muted-foreground">
                ⚡ Only 100 spots at this price · Then $29/month
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
