'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/use-pwa';
import { cn } from '@/lib/utils';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isOffline, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show install banner after a short delay
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  // Don't render if not applicable
  if (isInstalled || !isInstallable || dismissed || !showBanner) {
    // Show offline indicator instead
    if (isOffline) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center text-xs py-1 px-4">
          You are offline. Some features may be limited.
        </div>
      );
    }
    return null;
  }

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-[100] animate-slide-up',
      'md:left-auto md:right-4 md:bottom-4 md:max-w-sm',
      'pb-[env(safe-area-inset-bottom,0px)]'
    )}>
      <div className="bg-slate-900 dark:bg-slate-800 text-white p-4 shadow-2xl border border-slate-700/50 md:rounded-xl rounded-t-xl">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/20 shrink-0">
            <Smartphone className="size-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Install ServiceOS</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add to home screen for quick access and offline support
            </p>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              setShowBanner(false);
            }}
            className="text-slate-500 hover:text-white p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            onClick={installPWA}
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Download className="size-4" />
            Install App
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDismissed(true);
              setShowBanner(false);
            }}
            className="text-slate-400 hover:text-white"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * iOS-specific install instructions banner
 * iOS doesn't support beforeinstallprompt, so we need to show manual instructions
 */
export function IOSInstallBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(userAgent);
    const standalone = (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    setIsIOS(ios);
    setIsStandalone(standalone);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('serviceos_ios_banner_dismissed');
    if (seen) setDismissed(true);
  }, []);

  // Don't show on non-iOS or if already installed or dismissed
  if (!isIOS || isStandalone || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('serviceos_ios_banner_dismissed', 'true');
  };

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-[100] animate-slide-up',
      'pb-[env(safe-area-inset-bottom,0px)]'
    )}>
      <div className="bg-slate-900 text-white p-4 shadow-2xl border-t border-slate-700/50 rounded-t-xl">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/20 shrink-0">
            <Download className="size-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Install ServiceOS</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tap the share button then &quot;Add to Home Screen&quot; to install
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-white p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
