'use client';

/**
 * TenantPushManager
 * ------------------
 * Web Push enrolment + diagnostics for tenant admins (owner / admin roles).
 *
 * WHY THIS EXISTS
 * ---------------
 * The backend fan-out for live-chat push notifications (see
 * src/app/api/public/chat/session/route.ts + .../[sessionId]/messages/route.ts)
 * calls `sendWebPushToUser()` — which delivers a REAL system notification to
 * the admin's device, even when the browser/app is closed. That is the
 * WhatsApp-style alert the user asked for.
 *
 * BUT `sendWebPushToUser()` can only deliver to devices that have a
 * `PushSubscription` row in the database. Without this component, tenant
 * admins have NO automatic enrolment — they would have to manually open the
 * Notifications view and click "Enable" in the PushPermissionCard. Most never
 * do, so even with the backend code correct, no push would ever arrive.
 *
 * This component provides THREE affordances:
 *
 *   1. usePushAutoSubscribe() — on mount, if the admin already granted
 *      notification permission on a prior visit AND has no existing
 *      PushSubscription, silently call `pushManager.subscribe()` + POST to
 *      /api/notifications/push/subscribe. This makes push "just work" for
 *      returning admins without any extra UI interaction.
 *
 *   2. <PushEnableBanner/> — a one-tap opt-in banner shown ONLY when push is
 *      supported + VAPID is configured + permission is 'default' (never
 *      asked) + the admin hasn't permanently dismissed it. Clicking "Enable"
 *      calls Notification.requestPermission() and subscribes on grant.
 *
 *   3. <PushDiagnosticsCard/> — a persistent status card (rendered inside
 *      the Notifications view via a portal-less inline render) that shows
 *      the FULL push pipeline status:
 *        - Browser support (SW / PushManager / Notification API)
 *        - VAPID key fetched?
 *        - Permission granted?
 *        - Subscription saved to server?
 *        - "Send test push" button → exercises the entire pipeline end-to-end
 *      This card is the debugging surface for "I installed the PWA on iOS
 *      but push isn't working" — every step is visible.
 *
 * iOS PWA NOTES
 * -------------
 * iOS 16.4+ is required for Web Push. The PWA MUST be added to the Home
 * Screen and opened from there — push does NOT work in a regular Safari
 * tab. Permission must be granted FROM INSIDE the installed PWA. The
 * diagnostics card surfaces all of this so the user can see exactly which
 * step is failing.
 */

import { useEffect, useState, useCallback } from 'react';
import { Bell, X, Loader2, Send, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getVapidPublicKey,
  getApplicationServerKey,
} from '@/lib/push-client';

const PUSH_BANNER_DISMISS_KEY = 'serviceos_tenant_push_banner_dismissed_v1';

// ---------------------------------------------------------------------------
// usePushAutoSubscribe — silently (re)subscribe to Web Push on mount
// ---------------------------------------------------------------------------
function usePushAutoSubscribe() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    // Only auto-subscribe if the admin already granted permission on a prior
    // visit. If permission is 'default' we let the banner handle the opt-in;
    // if 'denied' there's nothing we can do.
    if (Notification.permission !== 'granted') return;

    let cancelled = false;

    const attemptSubscribe = async () => {
      try {
        if (Notification.permission !== 'granted') return;
        const vapidKey = await getVapidPublicKey();
        if (cancelled || !vapidKey) return;

        // iOS sometimes needs a moment for the SW to be ready after PWA launch.
        // Use a 15s timeout race so we don't hang forever if the SW is stuck.
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('SW ready timeout (15s)')), 15000),
          ),
        ]);
        if (cancelled) return;

        const existing = await reg.pushManager.getSubscription();
        if (cancelled || existing) return; // already subscribed

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: getApplicationServerKey(vapidKey),
        });
        if (cancelled) {
          await sub.unsubscribe();
          return;
        }
        const json = sub.toJSON();
        if (!json.endpoint) return;

        const subRes = await fetch(
          '/api/notifications/push/subscribe?XTransformPort=3000',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: json.endpoint,
              keys: json.keys,
              expirationTime: json.expirationTime ?? null,
            }),
          },
        );
        if (!subRes.ok) {
          let errCode: string | undefined;
          try {
            const errBody = await subRes.json();
            errCode = errBody?.code;
          } catch {
            /* ignore */
          }
          console.warn(
            '[tenant-push] Auto-subscribe POST rejected:',
            subRes.status,
            errCode,
          );
          if (errCode === 'AUTH_REQUIRED') {
            toast.error('Session expired', {
              description:
                'Please log in again to re-enable push notifications.',
            });
          }
          try {
            await sub.unsubscribe();
          } catch {
            /* ignore */
          }
          return;
        }
        console.info('[tenant-push] Auto-subscribed successfully');
      } catch (err) {
        console.warn('[tenant-push] Auto-subscribe failed:', err);
      }
    };

    attemptSubscribe();

    // Re-attempt when the page becomes visible again (covers re-login flows
    // and iOS PWA re-launch from background).
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        attemptSubscribe();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}

// ---------------------------------------------------------------------------
// PushEnableBanner — one-tap opt-in
// ---------------------------------------------------------------------------
function PushEnableBanner() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!('Notification' in window)) return;
    // Only show when permission has never been asked for.
    if (Notification.permission !== 'default') return;
    if (window.localStorage.getItem(PUSH_BANNER_DISMISS_KEY) === '1') return;

    let cancelled = false;
    const run = async () => {
      try {
        const vapidKey = await getVapidPublicKey();
        if (cancelled) return;
        // Only show the banner when the server actually has VAPID configured.
        if (vapidKey) setShow(true);
      } catch {
        /* non-fatal */
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      // iOS REQUIRES requestPermission() to be called from a user gesture.
      // This click handler qualifies. The resulting native dialog is the
      // ONLY way to grant permission on iOS — there is no programmatic path.
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.info('Notifications blocked', {
          description:
            'You can enable them later from your browser/Safari settings.',
        });
        dismiss();
        return;
      }
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        toast.error('Push not configured on the server.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: getApplicationServerKey(vapidKey),
        });
      }
      const json = sub.toJSON();
      if (!json.endpoint) {
        toast.error('Could not enable push notifications');
        return;
      }
      const subRes = await fetch(
        '/api/notifications/push/subscribe?XTransformPort=3000',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            expirationTime: json.expirationTime ?? null,
          }),
        },
      );
      if (!subRes.ok) {
        const errBody = await subRes.json().catch(() => ({}));
        toast.error('Could not enable push notifications', {
          description: errBody?.error || `Server returned ${subRes.status}`,
        });
        return;
      }
      toast.success('Push notifications enabled', {
        description:
          "You'll get a device alert when a customer starts a live chat or creates a booking.",
      });
      dismiss();
    } catch (err) {
      console.error('[tenant-push] enable failed:', err);
      toast.error('Could not enable push notifications', {
        description:
          err instanceof Error ? err.message.slice(0, 120) : undefined,
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      window.localStorage.setItem(PUSH_BANNER_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm animate-fade-in">
      <div className="rounded-lg border border-emerald-200 bg-white dark:border-emerald-900/50 dark:bg-slate-900 shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Bell className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Get live-chat &amp; booking alerts on this device
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enable push notifications so you receive a WhatsApp-style alert
              the moment a customer starts a chat or creates a booking — even
              when this app is closed.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={enable}
                disabled={busy}
                className="h-8 gap-1.5"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Bell className="size-3.5" />
                )}
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                disabled={busy}
                className="h-8"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PushDiagnosticsCard — persistent status + Test Push button
// ---------------------------------------------------------------------------
// Detect iOS Safari (including PWA mode) for platform-specific guidance.
function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iOS 13+ iPad reports as Macintosh, so also check for touch + Mac platform.
  const isIPadOnIOS13 =
    /Macintosh/.test(ua) && 'ontouchend' in document && navigator.maxTouchPoints > 1;
  return isIOSDevice || isIPadOnIOS13;
}

function detectStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS uses window.navigator.standalone; Chrome/Edge use display-mode: standalone.
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  return isIOSStandalone || isStandaloneMedia;
}

interface DiagnosticsState {
  supportedSW: boolean;
  supportedPush: boolean;
  supportedNotification: boolean;
  permission: NotificationPermission | 'unsupported';
  vapidKey: string | null;
  hasLocalSubscription: boolean;
  serverSubscriptionCount: number;
  isIOS: boolean;
  isStandalone: boolean;
  loading: boolean;
}

async function gatherDiagnostics(): Promise<DiagnosticsState> {
  if (typeof window === 'undefined') {
    return {
      supportedSW: false, supportedPush: false, supportedNotification: false,
      permission: 'unsupported', vapidKey: null, hasLocalSubscription: false,
      serverSubscriptionCount: 0, isIOS: false, isStandalone: false, loading: false,
    };
  }
  const supportedSW = 'serviceWorker' in navigator;
  const supportedPush = 'PushManager' in window;
  const supportedNotification = 'Notification' in window;
  const permission = supportedNotification ? Notification.permission : 'unsupported';
  const isIOS = detectIOS();
  const isStandalone = detectStandalonePWA();

  let vapidKey: string | null = null;
  let hasLocalSubscription = false;

  if (supportedPush) {
    try {
      vapidKey = await getVapidPublicKey();
    } catch {
      vapidKey = null;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      hasLocalSubscription = !!sub;
    } catch {
      hasLocalSubscription = false;
    }
  }

  let serverSubscriptionCount = 0;
  try {
    const res = await fetch('/api/notifications/push/subscribe?XTransformPort=3000');
    if (res.ok) {
      const data = await res.json();
      serverSubscriptionCount = data.activeSubscriptions || 0;
    }
  } catch {
    /* non-fatal */
  }

  return {
    supportedSW, supportedPush, supportedNotification,
    permission, vapidKey, hasLocalSubscription,
    serverSubscriptionCount, isIOS, isStandalone,
    loading: false,
  };
}

export function PushDiagnosticsCard() {
  const [state, setState] = useState<DiagnosticsState>({
    supportedSW: false, supportedPush: false, supportedNotification: false,
    permission: 'unsupported', vapidKey: null, hasLocalSubscription: false,
    serverSubscriptionCount: 0, isIOS: false, isStandalone: false, loading: true,
  });
  const [testing, setTesting] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const next = await gatherDiagnostics();
    setState(next);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendTestPush = useCallback(async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/notifications/push/test?XTransformPort=3000', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          toast.error('Push not configured on server', {
            description: data.configError || data.error || 'Missing VAPID keys',
          });
        } else {
          toast.error('Test push failed', {
            description: data.error || `HTTP ${res.status}`,
          });
        }
        return;
      }
      const result = data.result || {};
      if (result.sent > 0) {
        toast.success(`Test push sent to ${result.sent} device${result.sent > 1 ? 's' : ''}`, {
          description: 'Check your device notification tray. It may take 5–10s on iOS.',
        });
      } else if (result.failed > 0 && result.sent === 0) {
        toast.error('Push attempted but delivery failed', {
          description: `${result.failed} device(s) rejected. Check server logs.`,
        });
      } else if (result.notConfigured) {
        toast.error('Push not configured on server', {
          description: result.configError || 'Missing VAPID keys',
        });
      } else {
        toast.info('No push subscriptions found', {
          description: 'This device has no active push subscription. Tap "Re-enable push" below.',
        });
      }
      // Refresh to show updated server subscription count.
      refresh();
    } catch (err) {
      toast.error('Test push failed', {
        description: err instanceof Error ? err.message.slice(0, 120) : undefined,
      });
    } finally {
      setTesting(false);
    }
  }, [refresh]);

  const reenablePush = useCallback(async () => {
    setSubscribing(true);
    try {
      // Step 1: request permission if not granted.
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          toast.info('Notifications not allowed', {
            description:
              'You can enable them from your browser/Safari settings → Notifications → this site.',
          });
          refresh();
          return;
        }
      }
      // Step 2: fetch VAPID key.
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) {
        toast.error('Push not configured on server (no VAPID key)');
        return;
      }
      // Step 3: subscribe via the service worker.
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: getApplicationServerKey(vapidKey),
        });
      }
      const json = sub.toJSON();
      if (!json.endpoint) {
        toast.error('Subscription produced no endpoint');
        return;
      }
      // Step 4: register with server.
      const subRes = await fetch(
        '/api/notifications/push/subscribe?XTransformPort=3000',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            expirationTime: json.expirationTime ?? null,
          }),
        },
      );
      if (!subRes.ok) {
        const errBody = await subRes.json().catch(() => ({}));
        toast.error('Failed to save subscription', {
          description: errBody?.error || `HTTP ${subRes.status}`,
        });
        return;
      }
      toast.success('Push re-enabled on this device');
      refresh();
    } catch (err) {
      console.error('[tenant-push] re-enable failed:', err);
      toast.error('Could not re-enable push', {
        description: err instanceof Error ? err.message.slice(0, 120) : undefined,
      });
    } finally {
      setSubscribing(false);
    }
  }, [refresh]);

  // Build the status rows.
  const rows: Array<{ label: string; ok: boolean | 'warn'; detail?: string }> = [];
  rows.push({
    label: 'Service Worker',
    ok: state.supportedSW,
    detail: state.supportedSW ? 'Registered' : 'Not supported in this browser',
  });
  rows.push({
    label: 'Push API',
    ok: state.supportedPush,
    detail: state.supportedPush ? 'Available' : 'Not supported',
  });
  rows.push({
    label: 'Notification API',
    ok: state.supportedNotification,
    detail: state.supportedNotification ? 'Available' : 'Not supported',
  });
  rows.push({
    label: 'VAPID key (server)',
    ok: state.vapidKey ? true : 'warn',
    detail: state.vapidKey ? 'Configured' : 'Missing — set VAPID env vars on server',
  });
  rows.push({
    label: 'Permission',
    ok: state.permission === 'granted',
    detail:
      state.permission === 'granted'
        ? 'Granted'
        : state.permission === 'denied'
          ? 'Blocked — must be reset in browser settings'
          : state.permission === 'default'
            ? 'Not yet asked'
            : 'Unsupported',
  });
  rows.push({
    label: 'Subscription on this device',
    ok: state.hasLocalSubscription,
    detail: state.hasLocalSubscription ? 'Active' : 'None — tap "Re-enable push"',
  });
  rows.push({
    label: 'Subscriptions on server',
    ok: state.serverSubscriptionCount > 0,
    detail: `${state.serverSubscriptionCount} active`,
  });

  // Determine the overall health.
  const allGood =
    state.supportedSW &&
    state.supportedPush &&
    state.supportedNotification &&
    state.vapidKey &&
    state.permission === 'granted' &&
    state.hasLocalSubscription &&
    state.serverSubscriptionCount > 0;

  // iOS-specific guidance.
  const showIOSGuidance =
    state.isIOS &&
    (!state.isStandalone || state.permission !== 'granted' || !state.hasLocalSubscription);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Push Notifications</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={state.loading}
          className="h-7 gap-1"
        >
          <RefreshCw className={`size-3.5 ${state.loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-2 p-4">
        {/* Status rows */}
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="flex items-center gap-1.5 font-medium">
                {row.ok === true ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                ) : row.ok === 'warn' ? (
                  <AlertTriangle className="size-3.5 text-amber-500" />
                ) : (
                  <XCircle className="size-3.5 text-red-500" />
                )}
                <span className={row.ok === true ? 'text-emerald-700 dark:text-emerald-400' : row.ok === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}>
                  {row.detail}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* iOS guidance */}
        {showIOSGuidance && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <Smartphone className="size-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  iOS setup required
                </p>
                {!state.isStandalone && (
                  <p className="text-amber-800 dark:text-amber-300">
                    Tap the Share button in Safari → <strong>Add to Home Screen</strong>,
                    then open ServiceOS from the Home Screen icon. Push only works
                    inside the installed PWA, not in a Safari tab.
                  </p>
                )}
                {state.isStandalone && state.permission !== 'granted' && (
                  <p className="text-amber-800 dark:text-amber-300">
                    You&apos;re in the installed PWA — now tap <strong>Re-enable push</strong>{' '}
                    below to grant permission. iOS shows a native dialog you must accept.
                  </p>
                )}
                {state.isStandalone && state.permission === 'granted' && !state.hasLocalSubscription && (
                  <p className="text-amber-800 dark:text-amber-300">
                    Permission is granted but no subscription exists on this device.
                    Tap <strong>Re-enable push</strong> below to create one.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={sendTestPush}
            disabled={testing || !allGood}
            className="h-8 gap-1.5"
          >
            {testing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Send test push
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={reenablePush}
            disabled={subscribing}
            className="h-8 gap-1.5"
          >
            {subscribing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Re-enable push
          </Button>
        </div>

        {allGood && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            ✓ Push is fully configured. You should receive alerts for live chats, bookings, jobs, and invoices.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TenantPushManager — mounted once in AppLayout
// ---------------------------------------------------------------------------
export function TenantPushManager() {
  usePushAutoSubscribe();
  return <PushEnableBanner />;
}

export default TenantPushManager;
