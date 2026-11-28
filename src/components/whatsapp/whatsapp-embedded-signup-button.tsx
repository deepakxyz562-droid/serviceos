'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authHeaders } from '@/lib/client-auth';
import {
  getLoadedFbSdk,
  invokeFbLogin,
  loadFBSDK,
  type FbLoginResponse,
} from '@/lib/meta/fb-sdk';

interface WhatsAppEmbeddedSignupButtonProps {
  /** Called after successful Embedded Signup + backend registration */
  onSuccess?: (phoneNumberId: string, wabaId: string, meta?: { displayPhoneNumber?: string; coexistenceMode?: boolean }) => void;
  onError?: (message: string) => void;
  /** CSS class override */
  className?: string;
  /** Button label */
  label?: string;
  /** Optional runtime overrides (useful when NEXT_PUBLIC_* isn't baked at build time) */
  configId?: string;
  metaAppId?: string;
  /** Mobile handoff ticket when launched from bgosmobile WebBrowser */
  handoffTicket?: string;
  /** 'coexistence' links existing WA Business app without losing chats; 'cloud_api' creates/binds API number */
  mode?: 'coexistence' | 'cloud_api';
}

const DEFAULT_TECH_PROVIDER_CONFIG_ID = '1726144922272991';

/**
 * WhatsApp Embedded Signup Button (Supports Cloud API & WA Business App Coexistence)
 */
export function WhatsAppEmbeddedSignupButton({
  onSuccess,
  onError,
  className,
  label = 'Connect WhatsApp',
  configId: configIdProp,
  metaAppId: metaAppIdProp,
  handoffTicket,
  mode = 'coexistence',
}: WhatsAppEmbeddedSignupButtonProps) {
  const [loading, setLoading] = useState(false);
  const resolvedIdsRef = useRef<{ appId: string; configId: string }>({
    appId:
      metaAppIdProp ||
      process.env.NEXT_PUBLIC_META_APP_ID ||
      process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
      '',
    configId:
      configIdProp ||
      process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID ||
      DEFAULT_TECH_PROVIDER_CONFIG_ID,
  });
  const sessionInfoRef = useRef<{
    wabaId?: string;
    phoneNumberId?: string;
    isCoexistence?: boolean;
  }>({});

  // Preload & initialize Facebook JS SDK on mount so FB.login runs synchronously inside
  // the user's tap gesture (prevents popup blockers in iOS Safari / ASWebAuthenticationSession).
  useEffect(() => {
    async function warmSdk() {
      let appId =
        metaAppIdProp ||
        process.env.NEXT_PUBLIC_META_APP_ID ||
        process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
        resolvedIdsRef.current.appId;
      let cfgId =
        configIdProp ||
        process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID ||
        resolvedIdsRef.current.configId;

      if (!appId || !cfgId) {
        const cfgRes = await fetch('/api/whatsapp/config', {
          headers: authHeaders(),
          credentials: 'include',
        }).catch(() => null);
        if (cfgRes?.ok) {
          const cfgJson = await cfgRes.json().catch(() => ({}));
          if (!appId && cfgJson.metaAppId) appId = cfgJson.metaAppId;
          if (!cfgId && cfgJson.embeddedConfigId) cfgId = cfgJson.embeddedConfigId;
        }
      }
      resolvedIdsRef.current = { appId, configId: cfgId };
      if (appId && typeof window !== 'undefined') {
        await loadFBSDK(appId).catch(() => {});
      }
    }
    void warmSdk();
  }, [metaAppIdProp, configIdProp]);

  useEffect(() => {
    const onWindowMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;
      try {
        const parsed =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (parsed?.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (
          parsed.event === 'FINISH' ||
          parsed.event === 'FINISH_ONLY_WABA' ||
          parsed.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
        ) {
          sessionInfoRef.current = {
            wabaId: parsed.data?.waba_id,
            phoneNumberId: parsed.data?.phone_number_id,
            isCoexistence:
              parsed.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' ||
              mode === 'coexistence',
          };
        }
      } catch {
        // Ignore unrelated postMessage frames
      }
    };

    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [mode]);

  const processSignupResponse = useCallback(
    async (response: FbLoginResponse) => {
      try {
        if (response.authResponse?.code) {
          const res = await fetch('/api/whatsapp/embedded-signup', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({
              code: response.authResponse.code,
              state: response.authResponse.state,
              wabaId: sessionInfoRef.current.wabaId,
              phoneNumberId: sessionInfoRef.current.phoneNumberId,
              isCoexistence:
                sessionInfoRef.current.isCoexistence ?? mode === 'coexistence',
              featureType:
                mode === 'coexistence' ? 'whatsapp_business_app_onboarding' : undefined,
              ticket: handoffTicket || undefined,
            }),
          });
          const data = await res.json();

          if (data.success) {
            toast.success('WhatsApp connected successfully!');
            onSuccess?.(data.phoneNumberId, data.wabaId, {
              displayPhoneNumber: data.displayPhoneNumber,
              coexistenceMode: Boolean(data.coexistenceMode),
            });
          } else {
            const msg = data.error || 'Failed to connect WhatsApp';
            toast.error(msg);
            onError?.(msg);
          }
        } else if (response.status === 'cancelled') {
          const msg = 'WhatsApp connection cancelled';
          toast.info(msg);
          onError?.(msg);
        } else {
          const msg = 'Failed to connect WhatsApp. Please try again.';
          toast.error(msg);
          onError?.(msg);
        }
      } catch (err) {
        const msg = 'Failed to complete WhatsApp connection';
        toast.error(msg);
        onError?.(msg);
        console.error('[whatsapp-embedded-signup] Backend error:', err);
      } finally {
        setLoading(false);
      }
    },
    [handoffTicket, mode, onError, onSuccess],
  );

  const launchSignupWithLoadedSdk = useCallback(
    (resolvedConfigId: string) => {
      const extras: Record<string, unknown> = {
        setup: {},
        version: 'v4',
        sessionInfoVersion: '3',
      };
      if (mode === 'coexistence') {
        extras.featureType = 'whatsapp_business_app_onboarding';
      }

      invokeFbLogin(
        {
          config_id: resolvedConfigId,
          response_type: 'code',
          override_default_response_type: true,
          extras,
        },
        function onMetaSignupResponse(res) {
          void processSignupResponse(res);
        },
      );
    },
    [mode, processSignupResponse],
  );

  // Keep click handler synchronous when FB SDK is already loaded so iOS Safari / ASWebAuthenticationSession
  // allows the Meta popup directly inside the tap gesture.
  const handleSignup = useCallback(() => {
    setLoading(true);
    sessionInfoRef.current = {};

    const currentConfigId =
      configIdProp ||
      resolvedIdsRef.current.configId ||
      process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID ||
      DEFAULT_TECH_PROVIDER_CONFIG_ID;

    if (getLoadedFbSdk()) {
      try {
        launchSignupWithLoadedSdk(currentConfigId);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start WhatsApp signup';
        toast.error(msg);
        onError?.(msg);
        setLoading(false);
        return;
      }
    }

    void (async () => {
      try {
        let resolvedAppId =
          metaAppIdProp ||
          resolvedIdsRef.current.appId ||
          process.env.NEXT_PUBLIC_META_APP_ID ||
          process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
          '';
        let resolvedConfigId = currentConfigId;

        if (!resolvedAppId || !resolvedConfigId) {
          const cfgRes = await fetch('/api/whatsapp/config', {
            headers: authHeaders(),
            credentials: 'include',
          }).catch(() => null);
          if (cfgRes?.ok) {
            const cfgJson = await cfgRes.json().catch(() => ({}));
            if (!resolvedAppId && cfgJson.metaAppId) resolvedAppId = cfgJson.metaAppId;
            if (!resolvedConfigId && cfgJson.embeddedConfigId) resolvedConfigId = cfgJson.embeddedConfigId;
          }
        }

        await loadFBSDK(resolvedAppId);
        if (!getLoadedFbSdk()) {
          const msg = 'Failed to load Facebook SDK. Please refresh and try again.';
          toast.error(msg);
          onError?.(msg);
          setLoading(false);
          return;
        }
        launchSignupWithLoadedSdk(resolvedConfigId);
      } catch (err) {
        console.error('[whatsapp-embedded-signup] Error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to start WhatsApp signup';
        toast.error(msg);
        onError?.(msg);
        setLoading(false);
      }
    })();
  }, [configIdProp, metaAppIdProp, launchSignupWithLoadedSdk, onError]);

  return (
    <Button
      onClick={handleSignup}
      disabled={loading}
      className={className}
      size="lg"
    >
      {loading ? (
        <><Loader2 className="size-4 mr-2 animate-spin" /> Connecting...</>
      ) : (
        <><MessageCircle className="size-4 mr-2 text-emerald-400" /> {label}</>
      )}
    </Button>
  );
}
