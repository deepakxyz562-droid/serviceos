'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Instagram, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import {
  getLoadedFbSdk,
  invokeFbLogin,
  loadFBSDK,
  type FbLoginResponse,
} from '@/lib/meta/fb-sdk';

interface MetaOAuthButtonProps {
  /**
   * Which Meta product to connect.
   * - 'instagram': Instagram DM (scopes: instagram_manage_messages)
   * - 'messenger': Facebook Messenger (scopes: pages_messaging, pages_manage_metadata)
   */
  provider: 'instagram' | 'messenger';
  /** Called after successful OAuth + backend registration */
  onSuccess?: () => void;
  /** CSS class override */
  className?: string;
  /** Button label */
  label?: string;
}

/**
 * Meta OAuth Button (Instagram DM + Messenger)
 * =============================================
 *
 * Launches Meta's hosted OAuth flow for Instagram DM or Messenger. Uses the
 * Facebook JS SDK's FB.login() with the appropriate scopes for each product.
 *
 * After the popup closes, the auth code is sent to our backend
 * (/api/meta/oauth/exchange) which:
 *   1. Exchanges the code for a long-lived user access token
 *   2. For Instagram: fetches the IG business account + creates a
 *      SocialAccount(platform='instagram') row
 *   3. For Messenger: fetches the FB Page + creates a
 *      SocialAccount(platform='facebook') row
 *
 * This is the same pattern as the WhatsApp Embedded Signup, but for IG/Messenger
 * DM handling. Both use the same /api/meta/webhook receiver for inbound DMs.
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_META_APP_ID must be set in .env
 *   - The Meta App must have the Instagram + Messenger products added
 */
export function MetaOAuthButton({
  provider,
  onSuccess,
  className,
  label,
}: MetaOAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const defaultLabel = provider === 'instagram' ? 'Connect Instagram' : 'Connect Facebook Page';
  const Icon = provider === 'instagram' ? Instagram : MessageSquare;

  useEffect(() => {
    void loadFBSDK().catch(() => {});
  }, []);

  const processOAuthResponse = useCallback(
    async (response: FbLoginResponse) => {
      try {
        if (response.authResponse?.code) {
          const res = await fetch('/api/meta/oauth/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              code: response.authResponse.code,
              state: response.authResponse.state,
            }),
          });
          const data = await res.json();

          if (data.success) {
            toast.success(
              provider === 'instagram'
                ? 'Instagram connected successfully!'
                : 'Facebook Page connected successfully!',
            );
            onSuccess?.();
          } else {
            toast.error(data.error || `Failed to connect ${provider}`);
          }
        } else if (response.status === 'cancelled') {
          toast.info(`${provider} connection cancelled`);
        } else {
          toast.error(`Failed to connect ${provider}. Please try again.`);
        }
      } catch (err) {
        toast.error(`Failed to complete ${provider} connection`);
        console.error(`[meta-oauth/${provider}] Backend error:`, err);
      } finally {
        setLoading(false);
      }
    },
    [provider, onSuccess],
  );

  const launchOAuth = useCallback(() => {
    const scopes =
      provider === 'instagram'
        ? 'instagram_manage_messages,instagram_manage_insights,pages_show_list'
        : 'pages_messaging,pages_manage_metadata,pages_show_list';

    invokeFbLogin(
      {
        scope: scopes,
        response_type: 'code',
        override_default_response_type: true,
      },
      function onMetaOAuthResponse(res) {
        void processOAuthResponse(res);
      },
    );
  }, [provider, processOAuthResponse]);

  const handleSignup = useCallback(() => {
    setLoading(true);
    if (getLoadedFbSdk()) {
      try {
        launchOAuth();
        return;
      } catch (err) {
        console.error(`[meta-oauth/${provider}] Error:`, err);
        toast.error(`Failed to start ${provider} OAuth`);
        setLoading(false);
        return;
      }
    }

    void (async () => {
      try {
        await loadFBSDK();
        if (!getLoadedFbSdk()) {
          toast.error('Failed to load Facebook SDK. Please refresh and try again.');
          setLoading(false);
          return;
        }
        launchOAuth();
      } catch (err) {
        console.error(`[meta-oauth/${provider}] Error:`, err);
        toast.error(`Failed to start ${provider} OAuth`);
        setLoading(false);
      }
    })();
  }, [provider, launchOAuth]);

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
        <><Icon className="size-4 mr-2" /> {label || defaultLabel}</>
      )}
    </Button>
  );
}
