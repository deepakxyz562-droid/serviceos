'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'serviceos_install_dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Install banner — shows when `beforeinstallprompt` fires AND the app is not
 * installed AND the user hasn't dismissed in the last 7 days.
 *
 * Renders a small debounce (~1.5s) so the banner doesn't pop the instant the
 * page paints.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If already installed (standalone display), never show the banner.
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }

    let showTimer: number | undefined;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      if (isDismissedRecently()) return;

      // Small delay so the banner doesn't fight the initial page paint.
      showTimer = window.setTimeout(() => setVisible(true), 1500);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
      toast.success('ServiceOS installed', {
        description: 'You can now launch it from your home screen.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('Installing ServiceOS…');
      } else {
        // User dismissed the native prompt — honor it as a 7-day dismissal.
        markDismissed();
      }
    } catch (err) {
      console.error('Install prompt failed:', err);
      toast.error('Could not show install prompt');
    } finally {
      setDeferredPrompt(null);
      setVisible(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  if (installed || !visible || !deferredPrompt) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 pb-[env(safe-area-inset-bottom,0px)]"
      role="dialog"
      aria-label="Install ServiceOS"
      aria-live="polite"
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xl shadow-slate-900/10">
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
          <Image
            src="/icon.svg"
            alt="ServiceOS"
            width={28}
            height={28}
            priority
            unoptimized
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">
            Install ServiceOS
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Add to your device for quick access and offline work.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleInstall}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Download className="size-4" />
              Install
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-slate-500 hover:text-slate-700"
            >
              Not now
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss install banner"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
