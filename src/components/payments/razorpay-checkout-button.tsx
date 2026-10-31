'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RazorpayCheckoutButtonProps {
  amountInPaise: number;
  planName?: string;
  planCode?: string;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess?: (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onFailure?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  buttonText?: string;
  disabled?: boolean;
}

/**
 * Dynamically loads the Razorpay Standard Checkout script (checkout.js)
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutButton({
  amountInPaise,
  planName = 'Subscription Plan',
  planCode,
  currency = 'INR',
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  onSuccess,
  onFailure,
  className,
  variant = 'default',
  buttonText,
  disabled = false,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayPrice = `₹${(amountInPaise / 100).toLocaleString('en-IN')}`;
  const label = buttonText || `Pay with Razorpay (${displayPrice})`;

  async function handleCheckout() {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Ensure Razorpay checkout.js script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 2. Call backend endpoint to create order
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: `rcpt_${Date.now()}`,
          planCode,
          notes: {
            planName,
            planCode: planCode || '',
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData?.order_id) {
        throw new Error(orderData?.error || 'Could not create Razorpay order');
      }

      const keyId =
        orderData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        'rzp_test_TuLATkapPzzHZc';

      // 3. Configure Razorpay Standard Checkout modal options
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'FieserOS / BGOS',
        description: `${planName} Subscription (${displayPrice})`,
        image: 'https://fieseros.com/favicon.ico',
        order_id: orderData.order_id,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#009F50', // BGOS Brand Green
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            const msg = 'Payment cancelled by user.';
            setErrorMessage(msg);
            if (onFailure) onFailure(msg);
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 4. Verify payment signature on backend
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planCode,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData?.success) {
              throw new Error(verifyData?.error || 'Signature verification failed.');
            }

            setLoading(false);
            if (onSuccess) {
              onSuccess(response);
            }
          } catch (err: any) {
            setLoading(false);
            const msg = err?.message || 'Payment verification failed.';
            setErrorMessage(msg);
            if (onFailure) onFailure(msg);
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);

      razorpayInstance.on('payment.failed', (failedRes: any) => {
        setLoading(false);
        const description =
          failedRes?.error?.description ||
          failedRes?.error?.reason ||
          'Payment transaction failed.';
        setErrorMessage(description);
        if (onFailure) onFailure(description);
      });

      razorpayInstance.open();
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || 'Failed to initialize payment.';
      setErrorMessage(msg);
      if (onFailure) onFailure(msg);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={variant}
        className={className}
        disabled={disabled || loading}
        onClick={handleCheckout}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Initializing Razorpay…
          </>
        ) : (
          <>
            <CreditCard className="mr-2 size-4" />
            {label}
          </>
        )}
      </Button>
      {errorMessage && (
        <p className="text-xs text-destructive mt-1 font-medium">{errorMessage}</p>
      )}
    </div>
  );
}
