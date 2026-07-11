'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getVapidPublicKey,
  getInlinedVapidPublicKey,
  urlBase64ToUint8Array,
} from '@/lib/push-client';

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
 * exposes subscribe/unsubscribe helpers.
 *
 * VAPID key resolution is HYBRID:
 *   - If `NEXT_PUBLIC_VAPID_PUBLIC_KEY` was inlined at build time, the
 *     `vapidKey` state initializes to it immediately (synchronous, no flash).
 *   - Otherwise we fetch it at runtime from
 *     `/api/notifications/push/vapid-public-key` (reads server env on each
 *     request) so adding the env var on Vercel/Netlify takes effect without
 *     a redeploy. See src/lib/push-client.ts for the caching layer.
 *
 * `subscribe()` also awaits the key on demand, so clicking Enable before the
 * runtime fetch resolves still works.
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

  // vapidKey state: initialized synchronously from the build-time-inlined
  // value (if any), then resolved at runtime via getVapidPublicKey() when the
  // build-time value is absent. `vapidKeyAvailable` drives the UI warning +
  // Enable-button disabled state.
  const [vapidKey, setVapidKey] = useState<string | null>(() =>
    getInlinedVapidPublicKey()
  );
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

  // Resolve the VAPID public key at runtime when the build-time value is
  // missing. This runs once on mount; getVapidPublicKey() caches the result
  // so the subscribe path and other callers share the same fetch.
  useEffect(() => {
    if (vapidKey) return; // already have it (build-time fast path)
    let cancelled = false;
    getVapidPublicKey().then((key) => {
      if (!cancelled && key) setVapidKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

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
      // Resolve the key on demand so clicking Enable before the runtime
      // fetch resolves still works (and so this callback doesn't need the
      // vapidKey state as a dependency that would force re-creation).
      const key = vapidKey || (await getVapidPublicKey());
      if (!key) {
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
          applicationServerKey: urlBase64ToUint8Array(key),
        });
        const json = sub.toJSON();
        setSubscription(json);

        // Persist the subscription server-side so the backend can actually
        // send pushes to this device. Without this step the subscription
        // lives only in the browser and is lost on uninstall/SW eviction.
        if (json.endpoint) {
          try {
            const subRes = await fetch('/api/notifications/push/subscribe?XTransformPort=3000', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                endpoint: json.endpoint,
                keys: json.keys,
                expirationTime: json.expirationTime ?? null,
              }),
            });
            if (!subRes.ok) {
              // The server rejected the subscription. fetch() only throws on
              // network errors — a 400/500 response resolves normally. Without
              // this check the user would believe they're subscribed when no
              // PushSubscription row was ever saved in the DB.
              let errorMsg = `Server returned ${subRes.status}`;
              try {
                const errBody = await subRes.json();
                if (errBody?.error) errorMsg = errBody.error;
              } catch { /* ignore JSON parse errors */ }
              console.error('[push] Subscribe POST rejected:', subRes.status, errorMsg);
              toast.error('Failed to save push subscription', {
                description: errorMsg,
              });
              // Clean up the dangling local subscription (no DB row = useless).
              try { await sub.unsubscribe(); } catch { /* ignore */ }
              setSubscription(null);
              return null;
            }
          } catch (err) {
            // Network error (offline, CORS, etc.)
            console.warn('[push] Failed to persist subscription server-side:', err);
            toast.error('Could not reach the server', {
              description: 'Check your connection and try enabling push again.',
            });
            try { await sub.unsubscribe(); } catch { /* ignore */ }
            setSubscription(null);
            return null;
          }
        }

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
      const endpoint = sub?.endpoint;
      if (!sub) {
        setSubscription(null);
        return true;
      }
      const ok = await sub.unsubscribe();
      if (ok) {
        setSubscription(null);
      }

      // Tell the server to deactivate this device's subscription row.
      if (endpoint) {
        try {
          await fetch('/api/notifications/push/subscribe?XTransformPort=3000', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint }),
          });
        } catch (err) {
          console.warn('[push] Failed to remove subscription server-side:', err);
        }
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
  const [testBusy, setTestBusy] = useState(false);

  // Detect iOS so we can show the background-only notification hint.
  // iOS Web Push only displays notifications when the PWA is in the
  // background or closed — foreground pushes are silently swallowed.
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  });

  const handleTest = async () => {
    setTestBusy(true);
    try {
      const res = await fetch('/api/notifications/push/test?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 503 with configError = VAPID keys missing OR malformed. Show the
        // specific reason so the operator knows whether to set the env var
        // or regenerate the keys.
        const configError = data?.configError;
        const baseDesc = data?.error || `Server returned ${res.status}`;
        toast.error('Test notification failed', {
          description: configError
            ? `${baseDesc} — ${configError}`
            : baseDesc,
        });
        return;
      }
      const result = data?.result || {};
      if (result.notConfigured) {
        // Shouldn't happen (route returns 503 in this case), but guard
        // anyway in case of a race.
        toast.error('Push not configured', {
          description: result.configError || 'VAPID keys are missing on the server.',
        });
        return;
      }

      // Per-device diagnostics from sendWebPushToUserWithDiagnostics().
      // Each entry: { endpointPreview, status, success, deactivated, error }.
      const devices: Array<{
        endpointPreview: string;
        status: number;
        success: boolean;
        deactivated: boolean;
        error?: string;
      }> = Array.isArray(result.devices) ? result.devices : [];

      if (result.sent > 0) {
        // At least one device received the push. If others failed, surface
        // the first failure's status+error so the user knows why.
        const failedDevice = devices.find((d) => !d.success);
        const failDetail = failedDevice
          ? ` 1 device failed (HTTP ${failedDevice.status}${
              failedDevice.error ? `: ${failedDevice.error.slice(0, 120)}` : ''
            }).`
          : '';
        toast.success('Test notification sent', {
          description: `Delivered to ${result.sent} device(s).${failDetail}${
            isIOS ? ' Close the app to see it.' : ''
          }`,
        });
      } else if (devices.length > 0) {
        // We had subscriptions but ALL failed. Show the first device's
        // error so the user can diagnose (e.g. APNs "Unregistered",
        // FCM "MismatchedSenderID", 410 = expired).
        const firstFail = devices[0];
        const errDetail = firstFail.error
          ? firstFail.error.slice(0, 160)
          : 'No error body returned by the push service.';
        toast.error('Push delivery failed', {
          description: `HTTP ${firstFail.status} from push service. ${errDetail}${
            firstFail.deactivated ? ' (subscription deactivated — re-enable push.)' : ''
          }`,
        });
      } else {
        toast.error('No active subscriptions found', {
          description: 'Your device subscription was not saved. Try disabling and re-enabling push.',
        });
      }
    } catch (err) {
      console.error('[push] Test failed:', err);
      toast.error('Could not send test notification');
    } finally {
      setTestBusy(false);
    }
  };

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

        {isSubscribed && isIOS && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900">
            <strong>iOS note:</strong> Notifications only appear when the app
            is in the background or closed. To test, send a test notification
            below, then close the app.
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
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testBusy || busy}
              >
                {testBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Test
              </Button>
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
            </div>
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
