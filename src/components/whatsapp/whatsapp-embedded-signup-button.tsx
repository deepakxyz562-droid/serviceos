'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppEmbeddedSignupButtonProps {
  /** Called after successful Embedded Signup + backend registration */
  onSuccess?: (phoneNumberId: string, wabaId: string) => void;
  /** CSS class override */
  className?: string;
  /** Button label */
  label?: string;
}

/**
 * WhatsApp Embedded Signup Button
 * =================================
 *
 * Launches Meta's hosted Embedded Signup flow for WhatsApp Business API.
 *
 * When clicked, loads the Facebook JS SDK, calls FB.login() with the
 * WhatsApp config_id, which opens a Meta-hosted popup where the business:
 *   1. Selects or creates their Meta Business Manager account
 *   2. Selects or creates their WhatsApp Business Account (WABA)
 *   3. Selects or adds a phone number
 *   4. Grants Fieseros permission to manage their WhatsApp assets
 *
 * After the popup closes, the auth code is sent to our backend
 * (/api/whatsapp/embedded-signup) which:
 *   1. Exchanges the code for a long-lived access token
 *   2. Subscribes the WABA to webhooks
 *   3. Registers the phone number
 *   4. Stores credentials in CommunicationProvider + Credential
 *
 * This is the flow Meta expects for Tech Provider App Review.
 *
 * Prerequisites:
 *   - WHATSAPP_APP_SECRET and META_APP_ID must be set in .env
 *   - An Embedded Signup configuration must be created in the Meta App Dashboard
 *   - The config_id must be set as NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID
 */
export function WhatsAppEmbeddedSignupButton({
  onSuccess,
  className,
  label = 'Connect WhatsApp',
}: WhatsAppEmbeddedSignupButtonProps) {
  const [loading, setLoading] = useState(false);

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

      const configId = process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID;
      if (!configId) {
        toast.error('Embedded Signup not configured. Contact support.');
        console.error('[whatsapp-embedded-signup] NEXT_PUBLIC_WHATSAPP_EMBEDDED_CONFIG_ID not set');
        return;
      }

      // Launch the Embedded Signup popup
      FB.login(
        async (response: any) => {
          if (response.authResponse?.code) {
            // Exchange the code on our backend
            try {
              const res = await fetch('/api/whatsapp/embedded-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  code: response.authResponse.code,
                  state: response.authResponse.state,
                }),
              });
              const data = await res.json();

              if (data.success) {
                toast.success('WhatsApp connected successfully!');
                onSuccess?.(data.phoneNumberId, data.wabaId);
              } else {
                toast.error(data.error || 'Failed to connect WhatsApp');
              }
            } catch (err) {
              toast.error('Failed to complete WhatsApp connection');
              console.error('[whatsapp-embedded-signup] Backend error:', err);
            }
          } else if (response.status === 'cancelled') {
            toast.info('WhatsApp connection cancelled');
          } else {
            toast.error('Failed to connect WhatsApp. Please try again.');
          }
          setLoading(false);
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {
              // Prefill if we know the business's industry
              // featureType: 'whatsapp_business_messaging',
            },
            sessionInfoVersion: 2,
          },
        }
      );
    } catch (err) {
      console.error('[whatsapp-embedded-signup] Error:', err);
      toast.error('Failed to start WhatsApp signup');
      setLoading(false);
    }
  }, [onSuccess]);

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

/**
 * Load the Facebook JavaScript SDK.
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

    // Inject the SDK script
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
