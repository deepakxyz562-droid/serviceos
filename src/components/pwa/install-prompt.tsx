'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'serviceos_install_dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Separate dismissal for the iOS instructions banner so Android users (who
// never see it) and iOS users don't share the same dismissal state.
const IOS_DISMISS_KEY = 'serviceos_ios_install_dismissed';

function isDismissedRecently(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
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
 * Detect iOS Safari (iPhone/iPad/iPod). Used to decide whether to show the
 * manual "Share → Add to Home Screen" instructions, since iOS does NOT fire
 * `beforeinstallprompt` (only Android/Chrome desktop does).
 */
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const platform = (window.navigator as unknown as { platform?: string }).platform || '';
  // Modern iPad reports as Mac, so check for touch + Mac platform.
  const isIpad =
    /Mac/.test(platform) &&
    'ontouchend' in document &&
    (navigator.maxTouchPoints ?? 0) > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIpad;
}

/**
 * Install banner — shows when `beforeinstallprompt` fires AND the app is not
 * installed AND the user hasn't dismissed in the last 7 days.
 *
 * On iOS (which never fires `beforeinstallprompt`), a separate instructions
 * banner is shown explaining how to use Share → Add to Home Screen.
 *
 * Renders a small debounce (~1.5s) so the banner doesn't pop the instant the
 * page paints.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If already installed (standalone display), never show either banner.
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }

    let showTimer: number | undefined;
    let iosTimer: number | undefined;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      if (isDismissedRecently(DISMISS_KEY)) return;

      // Small delay so the banner doesn't fight the initial page paint.
      showTimer = window.setTimeout(() => setVisible(true), 1500);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setIosVisible(false);
      setDeferredPrompt(null);
      toast.success('ServiceOS installed', {
        description: 'You can now launch it from your home screen.',
      });
    };

    // iOS path: no beforeinstallprompt event, so after a short delay show the
    // manual instructions banner (unless already dismissed recently).
    if (isIOS() && !isDismissedRecently(IOS_DISMISS_KEY)) {
      iosTimer = window.setTimeout(() => setIosVisible(true), 2500);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (showTimer) window.clearTimeout(showTimer);
      if (iosTimer) window.clearTimeout(iosTimer);
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
        markDismissed(DISMISS_KEY);
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
    markDismissed(DISMISS_KEY);
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  const handleIosDismiss = useCallback(() => {
    markDismissed(IOS_DISMISS_KEY);
    setIosVisible(false);
  }, []);

  if (installed) return null;

  // Android / Chrome desktop install banner
  if (visible && deferredPrompt) {
    return (
      <div
        className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 bottom-[calc(4rem+1rem+env(safe-area-inset-bottom,0px))] lg:bottom-4"
        role="dialog"
        aria-label="Install ServiceOS"
        aria-live="polite"
      >
        <div className="relative flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xl shadow-slate-900/10">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
            <Image
              src="/icon-192.png"
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

  // iOS install instructions banner (Share → Add to Home Screen)
  if (iosVisible) {
    return (
      <div
        className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 bottom-[calc(4rem+1rem+env(safe-area-inset-bottom,0px))] lg:bottom-4"
        role="dialog"
        aria-label="Add ServiceOS to Home Screen"
        aria-live="polite"
      >
        <div className="relative flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xl shadow-slate-900/10">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
            <Image
              src="/icon-192.png"
              alt="ServiceOS"
              width={28}
              height={28}
              priority
              unoptimized
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Add ServiceOS to Home Screen
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              For the full app experience on iPhone/iPad:
            </p>

            <ol className="mt-2 space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                  1
                </span>
                <span>
                  Tap the{' '}
                  <Share className="inline-block size-3.5 align-text-bottom text-emerald-600" />{' '}
                  <span className="font-medium">Share</span> button in Safari&apos;s toolbar
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                  2
                </span>
                <span>
                  Scroll and tap{' '}
                  <PlusSquare className="inline-block size-3.5 align-text-bottom text-emerald-600" />{' '}
                  <span className="font-medium">Add to Home Screen</span>
                </span>
              </li>
            </ol>

            <div className="mt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleIosDismiss}
                className="text-slate-500 hover:text-slate-700"
              >
                Not now
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleIosDismiss}
            className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss install instructions"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
