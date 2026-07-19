'use client';

/**
 * TenantPushManager
 * ------------------
 * Web Push enrolment for tenant admins (owner / admin roles).
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
 * The employee portal solved this with `usePushAutoSubscribe` +
 * `PushEnableBanner` (see src/components/portals/employee-portal-layout.tsx).
 * This component is the tenant-admin equivalent: it mounts inside AppLayout
 * and provides the same two affordances:
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
 * We do NOT auto-prompt for permission (browsers block repeated prompts and
 * it's annoying). The banner is the single, polite opt-in surface.
 */

import { useEffect, useState, useCallback } from 'react';
import { Bell, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getVapidPublicKey,
  urlBase64ToUint8Array,
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

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled || existing) return; // already subscribed

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
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

    // Re-attempt when the page becomes visible again (covers re-login flows).
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
        // If push isn't configured, the banner would offer a broken promise.
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
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.info('Notifications blocked', {
          description:
            'You can enable them later from your browser settings.',
        });
        dismiss();
        return;
      }
      // Now subscribe. The auto-subscribe effect will also pick this up on
      // next mount, but we do it here so the admin is enrolled immediately.
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
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
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
        toast.error('Could not enable push notifications');
        return;
      }
      toast.success('Push notifications enabled', {
        description:
          "You'll get a device alert when a customer starts a live chat.",
      });
      dismiss();
    } catch {
      toast.error('Could not enable push notifications');
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
              Get live-chat alerts on this device
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enable push notifications so you receive a WhatsApp-style alert
              the moment a customer starts a chat or sends a message — even
              when this tab is closed.
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
// TenantPushManager — mounted once in AppLayout
// ---------------------------------------------------------------------------
export function TenantPushManager() {
  usePushAutoSubscribe();
  return <PushEnableBanner />;
}

export default TenantPushManager;
