'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Instagram, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleSignup = useCallback(async () => {
    setLoading(true);
    try {
      // Load Facebook JS SDK if not already loaded
      if (typeof window === 'undefined' || !(window as any).FB) {
        await loadFBSDK();
      }

      const FB = (window as any).FB;
      if (!FB) {
        toast.error('Failed to load Facebook SDK. Please refresh and try again.');
        return;
      }

      // Launch the OAuth popup with the appropriate scopes
      const scopes =
        provider === 'instagram'
          ? 'instagram_manage_messages,instagram_manage_insights,pages_show_list'
          : 'pages_messaging,pages_manage_metadata,pages_show_list';

      FB.login(
        async (response: any) => {
          if (response.authResponse?.code) {
            // Exchange the code on our backend
            try {
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
                    : 'Facebook Page connected successfully!'
                );
                onSuccess?.();
              } else {
                toast.error(data.error || `Failed to connect ${provider}`);
              }
            } catch (err) {
              toast.error(`Failed to complete ${provider} connection`);
              console.error(`[meta-oauth/${provider}] Backend error:`, err);
            }
          } else if (response.status === 'cancelled') {
            toast.info(`${provider} connection cancelled`);
          } else {
            toast.error(`Failed to connect ${provider}. Please try again.`);
          }
          setLoading(false);
        },
        {
          scope: scopes,
          response_type: 'code',
          override_default_response_type: true,
        }
      );
    } catch (err) {
      console.error(`[meta-oauth/${provider}] Error:`, err);
      toast.error(`Failed to start ${provider} OAuth`);
      setLoading(false);
    }
  }, [provider, onSuccess]);

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

/**
 * Load the Facebook JavaScript SDK.
 * Same loader as the WhatsApp Embedded Signup button.
 */
function loadFBSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).FB) {
      resolve();
      return;
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      reject(new Error('NEXT_PUBLIC_META_APP_ID not set'));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      (window as any).FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });
      resolve();
    };

    script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.head.appendChild(script);
  });
}
