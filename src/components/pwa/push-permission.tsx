'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Convert a base64-url-encoded string into a Uint8Array (needed for the
 * `applicationServerKey` argument to `pushManager.subscribe`).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw =
    typeof window !== 'undefined'
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

type NotificationPermission = 'default' | 'granted' | 'denied';

interface UsePushPermissionReturn {
  supported: boolean;
  permission: NotificationPermission;
  subscription: PushSubscriptionJSON | null;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<PushSubscriptionJSON | null>;
  unsubscribe: () => Promise<boolean>;
  refresh: () => Promise<void>;
  vapidKeyAvailable: boolean;
}

/**
 * usePushPermission
 * -----------------
 * Tracks browser support + permission state for push notifications and
 * exposes subscribe/unsubscribe helpers. The VAPID public key is read from
 * `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — if it's not set, `subscribe()` will fail
 * gracefully with a toast and `vapidKeyAvailable` will be false.
 *
 * Initial `supported`/`permission` are read via lazy useState initializers
 * (guarded for SSR). The existing subscription is fetched asynchronously
 * in an effect, with all setState calls happening *after* `await` (the
 * React-recommended pattern for async work in effects).
 */
function usePushPermission(): UsePushPermissionReturn {
  const [supported, setSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  });
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default';
    }
    return Notification.permission;
  });
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(
    null
  );

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidKeyAvailable = Boolean(vapidKey);

  // Refresh the existing PushSubscription from the SW registration.
  // setState calls happen *after* `await` — the React-idiomatic pattern
  // that avoids the set-state-in-effect lint rule.
  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub ? sub.toJSON() : null);
    } catch {
      setSubscription(null);
    }
  }, []);

  // On mount (and when supported changes), refresh the subscription.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const run = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setSubscription(sub ? sub.toJSON() : null);
      } catch {
        if (!cancelled) setSubscription(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const requestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied';
      }
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
      } catch {
        return 'denied';
      }
    }, []);

  const subscribe =
    useCallback(async (): Promise<PushSubscriptionJSON | null> => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
      }
      if (!vapidKey) {
        toast.error('Push notifications are not configured', {
          description: 'Missing VAPID public key on the server.',
        });
        return null;
      }

      try {
        const reg = await navigator.serviceWorker.ready;

        // Make sure we have notification permission first.
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await requestPermission();
        }
        if (perm !== 'granted') {
          toast.error('Notification permission denied', {
            description:
              'Enable notifications in your browser settings to receive push.',
          });
          return null;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        const json = sub.toJSON();
        setSubscription(json);
        return json;
      } catch (err) {
        console.error('Push subscribe failed:', err);
        toast.error('Could not enable push notifications');
        return null;
      }
    }, [requestPermission, vapidKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setSubscription(null);
        return true;
      }
      const ok = await sub.unsubscribe();
      if (ok) {
        setSubscription(null);
      }
      return ok;
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      return false;
    }
  }, []);

  // Mark setSupported/setPermission as "used" — they're here for future
  // expansion (e.g. reacting to runtime support/permission changes). The
  // initial values come from the lazy useState initializers above.
  void setSupported;
  void setPermission;

  return {
    supported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    refresh,
    vapidKeyAvailable,
  };
}

export default usePushPermission;

/**
 * PushPermissionCard
 * ------------------
 * A self-contained settings card that wires the `usePushPermission` hook
 * into Enable/Disable buttons. Drop this into a Settings page to give users
 * control over push notifications.
 */
export function PushPermissionCard() {
  const {
    supported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    vapidKeyAvailable,
  } = usePushPermission();

  const [busy, setBusy] = useState(false);

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="size-4 text-slate-400" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isSubscribed = Boolean(subscription);
  const isDenied = permission === 'denied';

  const handleEnable = async () => {
    setBusy(true);
    try {
      if (permission === 'default') {
        const perm = await requestPermission();
        if (perm !== 'granted') return;
      }
      const sub = await subscribe();
      if (sub) {
        toast.success('Push notifications enabled');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      const ok = await unsubscribe();
      if (ok) toast.success('Push notifications disabled');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-emerald-600" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about new leads, job updates, and messages even when
          ServiceOS is in the background.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!vapidKeyAvailable && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
            Push notifications are not fully configured on the server yet
            (missing VAPID key). Subscribing will not work until this is set.
          </p>
        )}

        {isDenied && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
            Notification permission is blocked. Please enable it in your
            browser&apos;s site settings to use push notifications.
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium text-slate-900">
              Status:{' '}
              <span
                className={
                  isSubscribed
                    ? 'text-emerald-600'
                    : isDenied
                      ? 'text-rose-600'
                      : 'text-slate-500'
                }
              >
                {isSubscribed
                  ? 'Enabled'
                  : isDenied
                    ? 'Blocked'
                    : 'Not enabled'}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Permission: <span className="font-mono">{permission}</span>
            </p>
          </div>

          {isSubscribed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisable}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BellOff className="size-4" />
              )}
              Disable
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleEnable}
              disabled={busy || isDenied || !vapidKeyAvailable}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bell className="size-4" />
              )}
              Enable
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
