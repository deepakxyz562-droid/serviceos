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
  /** Optional in-memory bearer token from mobile handoff exchange when cookies are restricted */
  authToken?: string;
  /** Prefer full-tab Meta dialog/oauth redirect instead of JS popup (recommended on mobile WebViews) */
  preferRedirectFlow?: boolean;
  /** Explicit redirect_uri for dialog/oauth redirect mode */
  redirectUri?: string;
  /** Notifies parent while signup submission/navigation is in progress so external controls can disable */
  onSubmittingChange?: (submitting: boolean) => void;
  /** Disable triggering signup externally (e.g. while waiting for activation) */
  disabled?: boolean;
  /** 'coexistence' links existing WA Business app without losing chats; 'cloud_api' creates/binds API number */
  mode?: 'coexistence' | 'cloud_api';
}

const DEFAULT_TECH_PROVIDER_CONFIG_ID = '1726144922272991';
export const WA_OAUTH_PENDING_STORAGE_KEY = 'bgos_wa_oauth_pending';
export const WA_HANDOFF_TOKEN_STORAGE_KEY = 'bgos_wa_handoff_token';

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
  authToken,
  preferRedirectFlow = false,
  redirectUri: redirectUriProp,
  onSubmittingChange,
  disabled: disabledProp = false,
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

  const buildRequestHeaders = useCallback(
    (extra?: Record<string, string>) =>
      authHeaders({
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...extra,
      }),
    [authToken],
  );

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
          headers: buildRequestHeaders(),
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
  }, [metaAppIdProp, configIdProp, buildRequestHeaders]);

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
            headers: buildRequestHeaders({ 'Content-Type': 'application/json' }),
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
        onSubmittingChange?.(false);
      }
    },
    [buildRequestHeaders, handoffTicket, mode, onError, onSubmittingChange, onSuccess],
  );

  const buildSignupExtras = useCallback(() => {
    const extras: Record<string, unknown> = {
      setup: {},
      version: 'v4',
      sessionInfoVersion: '3',
    };
    if (mode === 'coexistence') {
      extras.featureType = 'whatsapp_business_app_onboarding';
    }
    return extras;
  }, [mode]);

  const launchSignupWithLoadedSdk = useCallback(
    (resolvedConfigId: string) => {
      invokeFbLogin(
        {
          config_id: resolvedConfigId,
          response_type: 'code',
          override_default_response_type: true,
          extras: buildSignupExtras(),
        },
        function onMetaSignupResponse(res) {
          void processSignupResponse(res);
        },
      );
    },
    [buildSignupExtras, processSignupResponse],
  );

  const launchRedirectOAuthFlow = useCallback(
    (resolvedAppId: string, resolvedConfigId: string) => {
      if (typeof window === 'undefined') return;
      const targetRedirectUri =
        redirectUriProp || `${window.location.origin}/whatsapp-connect`;
      const oauthState =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

      try {
        sessionStorage.setItem(
          WA_OAUTH_PENDING_STORAGE_KEY,
          JSON.stringify({
            state: oauthState,
            mode,
            redirectUri: targetRedirectUri,
            ts: Date.now(),
          }),
        );
        if (authToken) {
          sessionStorage.setItem(WA_HANDOFF_TOKEN_STORAGE_KEY, authToken);
        }
      } catch {
        // Ignore storage errors; host-only session cookies still persist across redirect
      }

      const oauthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
      oauthUrl.searchParams.set('client_id', resolvedAppId);
      oauthUrl.searchParams.set('config_id', resolvedConfigId);
      oauthUrl.searchParams.set('redirect_uri', targetRedirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('override_default_response_type', 'true');
      oauthUrl.searchParams.set('state', oauthState);
      oauthUrl.searchParams.set('extras', JSON.stringify(buildSignupExtras()));

      window.location.assign(oauthUrl.toString());
    },
    [authToken, buildSignupExtras, mode, redirectUriProp],
  );

  // Keep click handler synchronous when FB SDK is already loaded so iOS Safari / ASWebAuthenticationSession
  // allows the Meta popup directly inside the tap gesture.
  const handleSignup = useCallback(() => {
    setLoading(true);
    onSubmittingChange?.(true);
    sessionInfoRef.current = {};

    const currentAppId =
      metaAppIdProp ||
      resolvedIdsRef.current.appId ||
      process.env.NEXT_PUBLIC_META_APP_ID ||
      process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
      '';
    const currentConfigId =
      configIdProp ||
      resolvedIdsRef.current.configId ||
      process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID ||
      DEFAULT_TECH_PROVIDER_CONFIG_ID;

    if (preferRedirectFlow && currentAppId && currentConfigId) {
      launchRedirectOAuthFlow(currentAppId, currentConfigId);
      return;
    }

    if (!preferRedirectFlow && getLoadedFbSdk()) {
      try {
        launchSignupWithLoadedSdk(currentConfigId);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start WhatsApp signup';
        toast.error(msg);
        onError?.(msg);
        setLoading(false);
        onSubmittingChange?.(false);
        return;
      }
    }

    void (async () => {
      try {
        let resolvedAppId = currentAppId;
        let resolvedConfigId = currentConfigId;

        if (!resolvedAppId || !resolvedConfigId) {
          const cfgRes = await fetch('/api/whatsapp/config', {
            headers: buildRequestHeaders(),
            credentials: 'include',
          }).catch(() => null);
          if (cfgRes?.ok) {
            const cfgJson = await cfgRes.json().catch(() => ({}));
            if (!resolvedAppId && cfgJson.metaAppId) resolvedAppId = cfgJson.metaAppId;
            if (!resolvedConfigId && cfgJson.embeddedConfigId) resolvedConfigId = cfgJson.embeddedConfigId;
          }
        }

        if (preferRedirectFlow) {
          if (!resolvedAppId) {
            const msg = 'Meta App ID is not configured yet. Please retry shortly.';
            toast.error(msg);
            onError?.(msg);
            setLoading(false);
            onSubmittingChange?.(false);
            return;
          }
          launchRedirectOAuthFlow(resolvedAppId, resolvedConfigId);
          return;
        }

        await loadFBSDK(resolvedAppId);
        if (!getLoadedFbSdk()) {
          const msg = 'Failed to load Facebook SDK. Please refresh and try again.';
          toast.error(msg);
          onError?.(msg);
          setLoading(false);
          onSubmittingChange?.(false);
          return;
        }
        launchSignupWithLoadedSdk(resolvedConfigId);
      } catch (err) {
        console.error('[whatsapp-embedded-signup] Error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to start WhatsApp signup';
        toast.error(msg);
        onError?.(msg);
        setLoading(false);
        onSubmittingChange?.(false);
      }
    })();
  }, [
    buildRequestHeaders,
    configIdProp,
    launchRedirectOAuthFlow,
    launchSignupWithLoadedSdk,
    metaAppIdProp,
    onError,
    onSubmittingChange,
    preferRedirectFlow,
  ]);

  return (
    <Button
      onClick={handleSignup}
      disabled={loading || disabledProp}
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
