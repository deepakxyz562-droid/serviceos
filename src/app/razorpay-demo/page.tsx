'use client';

import React, { useState } from 'react';
import { RazorpayCheckoutButton } from '@/components/payments/razorpay-checkout-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function RazorpayDemoPage() {
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
            <Zap className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Razorpay Standard Checkout</CardTitle>
          <CardDescription>
            Official Standard Web Checkout Integration for Indian Merchants & Users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>BGOS Starter Plan (1 Month)</span>
              <span className="text-lg font-bold text-emerald-700">₹499.00</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>UPI (Google Pay, PhonePe, Paytm, BHIM)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>All Debit & Credit Cards (RuPay, Visa, Mastercard)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span>Netbanking (50+ Indian Banks)</span>
              </li>
            </ul>
          </div>

          {paymentSuccess ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="size-5 text-emerald-600" />
                Payment Verified Successfully!
              </div>
              <div className="text-xs font-mono bg-white p-2.5 rounded border border-emerald-100 space-y-1">
                <div><strong>Payment ID:</strong> {paymentSuccess.razorpay_payment_id}</div>
                <div><strong>Order ID:</strong> {paymentSuccess.razorpay_order_id}</div>
              </div>
              <p className="text-xs text-emerald-700 pt-1">
                HMAC-SHA256 signature verified by server.
              </p>
            </div>
          ) : (
            <RazorpayCheckoutButton
              amountInPaise={49900}
              planName="BGOS Starter"
              planCode="starter"
              buttonText="Pay ₹499 with Razorpay"
              className="w-full bg-[#009F50] hover:bg-[#008A45] text-white py-6 text-base font-bold shadow-md"
              onSuccess={(data) => setPaymentSuccess(data)}
            />
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="size-4 text-slate-400" />
            <span>256-bit Encrypted · PCI-DSS Level 1 Compliant</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
