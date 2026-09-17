'use client';

/**
 * PaymentPropertiesPanel — 100% JotForm-Parity Payment Properties Inspector.
 *
 * Provides dedicated, authentic JotForm Payment Properties panel for all 33
 * payment gateways (Stripe, Square, Cash App Pay, Stripe Checkout, PayPal,
 * Authorize.Net, Razorpay, Purchase Order, etc.).
 *
 * Features:
 * - Gateway Connection Card with live status banner, Mode selector (Live/Test),
 *   and Connect/Disconnect actions.
 * - Standard 4 Payment Types (Sell Products, Sell Subscriptions, User Defined Amount, Collect Donations).
 * - Currency selector (with connection gating matching JotForm).
 * - Gateway-specific payment methods checklist (Cards, Apple Pay, Google Pay, Link, Klarna, ACH, etc.).
 * - Authorization Only & Instant Charge toggles.
 * - Customer record creation (Unique vs Each submission).
 * - Receipt emails and 3D Secure notification toggles.
 * - Form field mappings (Billing email, phone, custom metadata).
 * - Custom merchant credentials (BYOK / API keys).
 * - Sticky JotForm footer (Close & Update).
 */

import { useState, useEffect } from 'react';
import {
  X,
  Check,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  KeyRound,
  ExternalLink,
  Plus,
  Settings2,
  Unlink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PAYMENT_GATEWAYS_REGISTRY,
  ISO_CURRENCY_LABELS,
  type PaymentGatewayDef,
  type PaymentTypeOption,
} from '@/lib/forms/payments/payment-gateways-registry';

export interface PaymentPropertiesPanelProps {
  field: Record<string, any>;
  allFields: Array<{ id: string; label: string; type?: string }>;
  onFieldChange: (key: string, value: unknown) => void;
  onConfigChange: (key: string, value: unknown) => void;
  onClose?: () => void;
  onUpdate?: () => void;
}

function getOAuthProviderName(gateway: PaymentGatewayDef): string {
  if (['cash_app_pay', 'square_payments', 'afterpay', 'clearpay'].includes(gateway.id)) {
    return 'Square';
  }
  if (['stripe_elements', 'stripe_checkout'].includes(gateway.id)) {
    return 'Stripe';
  }
  if (['paypal_complete', 'venmo'].includes(gateway.id)) {
    return 'PayPal';
  }
  if (gateway.id === 'razorpay') return 'Razorpay';
  if (gateway.id === 'mollie') return 'Mollie';
  if (gateway.id.startsWith('payu')) return 'PayU';
  if (gateway.id === 'gocardless') return 'GoCardless';
  if (gateway.id === 'iyzico') return 'iyzico';
  return gateway.name;
}

/** OAuth redirect URLs for gateways that support OAuth flow. */
function getOAuthUrl(gateway: PaymentGatewayDef, returnUrl: string): string | null {
  const state = Math.random().toString(36).substring(2, 15);
  const encodedRedirect = encodeURIComponent(returnUrl);

  switch (gateway.id) {
    case 'stripe_elements':
    case 'stripe_checkout':
      // Stripe Connect OAuth
      return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID || 'ca_test'}&scope=read_write&redirect_uri=${encodedRedirect}&state=${state}`;

    case 'square_payments':
    case 'cash_app_pay':
      // Square OAuth
      return `https://connect.squareup.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_SQUARE_APP_ID || 'sandbox-sq0idb'}&scope=MERCHANT_PROFILE_READ+PAYMENTS_WRITE&redirect_uri=${encodedRedirect}&state=${state}`;

    case 'paypal_complete':
    case 'venmo':
      // PayPal OAuth
      const paypalBase = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';
      return `${paypalBase}/connect?flow=entry&client_id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test'}&scope=openid+email&redirect_uri=${encodedRedirect}&state=${state}`;

    case 'razorpay':
      // Razorpay — uses API key based auth (no OAuth), return null to show BYOK
      return null;

    case 'mollie':
      // Mollie OAuth
      return `https://www.mollie.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_MOLLIE_CLIENT_ID || 'app_test'}&scope=payments.read+payments.write&redirect_uri=${encodedRedirect}&state=${state}`;

    default:
      // Gateways without OAuth — use BYOK (API key) flow
      return null;
  }
}

/** Check if a gateway supports OAuth redirect flow (vs BYOK API keys). */
function supportsOAuth(gateway: PaymentGatewayDef): boolean {
  return ['stripe_elements', 'stripe_checkout', 'square_payments', 'cash_app_pay', 'paypal_complete', 'venmo', 'mollie'].includes(gateway.id);
}

export function PaymentPropertiesPanel({
  field,
  allFields,
  onFieldChange,
  onConfigChange,
  onClose,
  onUpdate,
}: PaymentPropertiesPanelProps) {
  const [showAdvancedCredentials, setShowAdvancedCredentials] = useState(false);

  // 1. Resolve Gateway Definition
  const widgetConfig = (field.widgetConfig || {}) as Record<string, any>;
  const widgetType = field.widgetType as string | undefined;
  const rawGatewayId = widgetConfig.gatewayId || (widgetType ? widgetType.replace(/^payment_/, '') : 'stripe_elements');
  
  const gateway: PaymentGatewayDef =
    PAYMENT_GATEWAYS_REGISTRY.find(
      (g) => g.id === rawGatewayId || g.fieldType === field.type || g.fieldType === widgetType
    ) || PAYMENT_GATEWAYS_REGISTRY[0];

  // 2. Extracted Configuration Values
  const isConnected = Boolean(widgetConfig.isConnected ?? (widgetConfig.provider === 'managed' || widgetConfig.publishableKey || widgetConfig.applicationId || widgetConfig.clientId));
  const mode = (widgetConfig.mode as 'live' | 'test') || (widgetConfig.testMode ? 'test' : 'live') || 'test';
  const connectionName = String(widgetConfig.connectionName || `My ${gateway.name} Connection #1`);
  const paymentType = (widgetConfig.paymentType as PaymentTypeOption) || (widgetConfig.pricingMode === 'fixed' ? 'sell_products' : widgetConfig.pricingMode === 'formula' ? 'user_defined_amount' : 'sell_products');
  const currency = String(widgetConfig.currency || gateway.currencies[0] || 'USD');
  const authorizationOnly = Boolean(widgetConfig.authorizationOnly ?? false);
  const chargeImmediately = Boolean(widgetConfig.chargeImmediately ?? !authorizationOnly);
  const sendReceiptEmail = Boolean(widgetConfig.sendReceiptEmail ?? true);
  const askBillingInfo = Boolean(widgetConfig.askBillingInfo ?? widgetConfig.requireBillingAddress ?? true);
  const askShippingInfo = Boolean(widgetConfig.askShippingInfo ?? false);
  const customerRecordType = String(widgetConfig.customerRecordType || 'unique');
  const businessLocation = String(widgetConfig.businessLocation || 'default_loc');
  const fulfillmentType = String(widgetConfig.fulfillmentType || 'physical');
  const customLabelText = String(widgetConfig.customLabelText || (gateway.id === 'cash_app_pay' ? 'Cash App Pay' : 'Credit Card'));

  // Connection Modal State (JotForm Flow)
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'live' | 'test'>(mode);
  const [modalConnName, setModalConnName] = useState<string>(connectionName);
  const [modalIsConnected, setModalIsConnected] = useState<boolean>(isConnected);
  const [isConnecting, setIsConnecting] = useState(false);

  // Enabled payment methods state (array or object)
  const enabledMethods: Record<string, boolean> = widgetConfig.enabledPaymentMethods || {
    card: true,
    link: true,
    googlepay: true,
    applepay: true,
    cashapp: true,
    afterpay: true,
    paypal: true,
    ach: false,
    klarna: false,
  };

  const openAddConnectionModal = (isEdit = false) => {
    setModalMode(mode);
    setModalConnName(isEdit ? connectionName : `My ${gateway.name} Connection #${(widgetConfig.savedConnections?.length || 0) + 1}`);
    setModalIsConnected(isEdit ? isConnected : false);
    setIsConnectionModalOpen(true);
  };

  const handleOAuthConnect = () => {
    const oauthUrl = getOAuthUrl(gateway, window.location.href);

    if (oauthUrl) {
      // Real OAuth flow — redirect to gateway's OAuth page
      // The gateway will redirect back to this URL with ?code=xxx&state=xxx
      // We handle the callback in the component (see useEffect below)
      setIsConnecting(true);
      // Save current modal state so we can restore it after redirect
      sessionStorage.setItem('payment_oauth_pending', JSON.stringify({
        gatewayId: gateway.id,
        connectionName: modalConnName,
        mode: modalMode,
        returnUrl: window.location.href,
      }));
      // Redirect to OAuth provider
      window.location.assign(oauthUrl);
    } else {
      // BYOK flow — no redirect, just mark as connected (user will enter API keys in BYOK section)
      setIsConnecting(true);
      setTimeout(() => {
        setIsConnecting(false);
        setModalIsConnected(true);
        onConfigChange('provider', 'byok');
      }, 300);
    }
  };

  const handleSaveConnectionModal = () => {
    onConfigChange('connectionName', modalConnName || `My ${gateway.name} Connection #1`);
    onConfigChange('mode', modalMode);
    onConfigChange('testMode', modalMode === 'test');
    onConfigChange('isConnected', modalIsConnected);
    if (modalIsConnected && !widgetConfig.provider) {
      onConfigChange('provider', gateway.supportsZeroConfig ? 'managed' : 'byok');
    }
    setIsConnectionModalOpen(false);
  };

  const handleDisconnect = () => {
    onConfigChange('isConnected', false);
  };

  const handleMethodToggle = (methodId: string, checked: boolean) => {
    const next = { ...enabledMethods, [methodId]: checked };
    onConfigChange('enabledPaymentMethods', next);
  };

  const oauthProviderName = getOAuthProviderName(gateway);
  const gatewaySupportsOAuth = supportsOAuth(gateway);

  // ─── OAuth Callback Handler ─────────────────────────────────────────────
  // When the gateway redirects back with ?code=xxx&state=xxx, we:
  // 1. Exchange the authorization code for an access token (server-side)
  // 2. Save the token to widgetConfig
  // 3. Mark the connection as connected
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    const authState = urlParams.get('state');

    if (authCode && authState) {
      // Check if this OAuth callback is for our gateway
      const pendingRaw = sessionStorage.getItem('payment_oauth_pending');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending.gatewayId === gateway.id) {
          // Clear the pending state
          sessionStorage.removeItem('payment_oauth_pending');

          // Clean the URL (remove code & state params)
          const cleanUrl = window.location.href.split('?')[0];
          window.history.replaceState({}, document.title, cleanUrl);

          // Exchange the auth code for an access token via our backend API
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setIsConnecting(true);
          fetch('/api/forms/payment/oauth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gateway: gateway.id,
              code: authCode,
              state: authState,
              redirectUri: pending.returnUrl,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.accessToken) {
                // Save the access token to widgetConfig
                onConfigChange('isConnected', true);
                onConfigChange('provider', 'oauth');
                onConfigChange('accessToken', data.accessToken);
                onConfigChange('connectionName', pending.connectionName || `My ${gateway.name} Connection #1`);
                onConfigChange('mode', pending.mode || 'test');
                onConfigChange('testMode', (pending.mode || 'test') === 'test');
                setModalIsConnected(true);
              } else {
                console.error('OAuth token exchange failed:', data.error);
              }
            })
            .catch((err) => {
              console.error('OAuth callback error:', err);
            })
            .finally(() => {
              setIsConnecting(false);
            });
        }
      }
    }
  }, [gateway.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      data-component-theme="dark"
      aria-label="Payment Properties"
      className="flex flex-col h-full bg-background text-foreground text-xs select-none"
    >
      {/* ════ 1. JOTFORM PAYMENT PROPERTIES HEADER ════ */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border/60 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="size-4" />
          </div>
          <h3 className="text-sm font-semibold truncate" title="Payment Properties">
            Payment Properties
          </h3>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close Button"
            className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* ════ SCROLLABLE CONTENT ════ */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-5">
          
          {/* ════ 2. JOTFORM PAYMENT CONNECTION SECTION ════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold text-foreground">Payment Connection</Label>
              {isConnected && (
                <button
                  type="button"
                  onClick={() => openAddConnectionModal(false)}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="size-3" /> Add Connection
                </button>
              )}
            </div>

            {/* Connection Selector / Active Card */}
            {isConnected ? (
              <div className="rounded-xl border border-emerald-500/30 bg-card p-3.5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="size-10 rounded-lg flex items-center justify-center p-1.5 shrink-0 shadow-inner"
                      style={{ backgroundColor: gateway.logoBg || '#1e293b' }}
                      dangerouslySetInnerHTML={{ __html: gateway.iconSvg }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-card-foreground leading-tight truncate">
                        {connectionName}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                        <span>{gateway.name}</span>
                        <span>•</span>
                        <span className="capitalize">{mode === 'live' ? 'Live Mode' : 'Test Mode'}</span>
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold shrink-0">
                    <CheckCircle2 className="size-3" /> Connected
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 px-2.5"
                    onClick={() => openAddConnectionModal(true)}
                  >
                    <Settings2 className="size-3" /> Edit Connection
                  </Button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-[10px] text-red-500 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Unlink className="size-3" /> Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="size-10 rounded-lg flex items-center justify-center p-1.5 shrink-0 shadow-inner"
                      style={{ backgroundColor: gateway.logoBg || '#1e293b' }}
                      dangerouslySetInnerHTML={{ __html: gateway.iconSvg }}
                    />
                    <div>
                      <h4 className="font-bold text-xs text-card-foreground leading-tight flex items-center gap-1.5">
                        {gateway.name}
                        {gateway.badge && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase h-4">
                            {gateway.badge}
                          </Badge>
                        )}
                      </h4>
                      {gateway.subtitle && (
                        <p className="text-[10px] text-muted-foreground font-medium">{gateway.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1">
                    <AlertTriangle className="size-3" /> Disconnected
                  </Badge>
                </div>

                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  Add a <span className="font-semibold">{gateway.name}</span> connection to start collecting payments on your form.
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="w-full h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  onClick={() => openAddConnectionModal(false)}
                >
                  <Plus className="size-3.5" /> Add {gateway.name} Connection
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* ════ 3. CORE PAYMENT CONFIGURATION ════ */}
          <div className="space-y-3.5">
            {/* Payment Type */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground">Payment Type</Label>
              <Select
                value={paymentType}
                onValueChange={(val) => {
                  onConfigChange('paymentType', val);
                  onConfigChange('pricingMode', val === 'sell_products' ? 'fixed' : val === 'user_defined_amount' ? 'formula' : 'fixed');
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell_products" className="text-xs">Sell Products</SelectItem>
                  <SelectItem value="sell_subscriptions" className="text-xs">Sell Subscriptions</SelectItem>
                  <SelectItem value="user_defined_amount" className="text-xs">User Defined Amount</SelectItem>
                  <SelectItem value="collect_donations" className="text-xs">Collect Donations</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {paymentType === 'sell_products' && 'Create product catalog items with pricing, images & inventory.'}
                {paymentType === 'sell_subscriptions' && 'Set up recurring billing cycles and subscription tiers.'}
                {paymentType === 'user_defined_amount' && 'Calculate total from calculated fields or custom entry.'}
                {paymentType === 'collect_donations' && 'Allow customers to donate custom or preset amounts.'}
              </p>
            </div>

            {/* Currency Selector (With JotForm-style connection lock) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-foreground">Currency</Label>
                {!isConnected && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Lock className="size-2.5" /> Connect to {gateway.name} first
                  </span>
                )}
              </div>
              <Select
                value={currency}
                disabled={!isConnected}
                onValueChange={(val) => onConfigChange('currency', val)}
              >
                <SelectTrigger className={`h-8 text-xs bg-background ${!isConnected ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder={!isConnected ? `Connect to ${gateway.name} first` : 'Select Currency'} />
                </SelectTrigger>
                <SelectContent>
                  {gateway.currencies.map((cur) => (
                    <SelectItem key={cur} value={cur} className="text-xs">
                      {ISO_CURRENCY_LABELS[cur] || cur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Location (Square / Cash App / Afterpay) */}
            {gateway.supportsBusinessLocation && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-foreground">Business Location</Label>
                <Select
                  value={businessLocation}
                  disabled={!isConnected}
                  onValueChange={(val) => onConfigChange('businessLocation', val)}
                >
                  <SelectTrigger className={`h-8 text-xs bg-background ${!isConnected ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Select Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default_loc" className="text-xs">Headquarters / Primary Store (Main)</SelectItem>
                    <SelectItem value="loc_online" className="text-xs">Online Store / Web Checkout</SelectItem>
                    <SelectItem value="loc_warehouse" className="text-xs">Main Warehouse Fulfillment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* ════ 4. GATEWAY-SPECIFIC PAYMENT METHODS (JotForm Checklist) ════ */}
          {gateway.supportedPaymentMethods && gateway.supportedPaymentMethods.length > 0 && (
            <div className="space-y-2.5">
              <Label className="text-[11px] font-semibold text-foreground">Payment Methods</Label>
              <div className="rounded-lg border border-border/70 divide-y divide-border/50 bg-card">
                {gateway.supportedPaymentMethods.map((method) => {
                  const isChecked = enabledMethods[method.id] ?? (method.defaultChecked ?? true);
                  return (
                    <div key={method.id} className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`method-${method.id}`}
                          className="text-xs font-medium cursor-pointer text-foreground flex items-center gap-1.5"
                        >
                          {method.label}
                          {method.badge && (
                            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-[8px] h-3.5 px-1 font-bold">
                              {method.badge}
                            </Badge>
                          )}
                        </Label>
                      </div>
                      <Switch
                        id={`method-${method.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleMethodToggle(method.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════ 5. ADDITIONAL GATEWAY SETTINGS (JotForm Parity) ════ */}
          <div className="space-y-3.5 pt-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Additional Gateway Settings
            </h4>

            {/* Send Email / Receipt to Customer */}
            {gateway.supportsReceiptEmail && (
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="send-receipt" className="text-xs font-semibold cursor-pointer">
                    Send Email to Customer
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {gateway.id === 'stripe_elements'
                      ? "We'll send an email automatically if 3D Secure authentication has any problems."
                      : 'Send an email containing a link to the payment receipt to your customers.'}
                  </p>
                </div>
                <Switch
                  id="send-receipt"
                  checked={sendReceiptEmail}
                  onCheckedChange={(val) => onConfigChange('sendReceiptEmail', val)}
                />
              </div>
            )}

            {/* Authorization Only / Charge Immediately */}
            {gateway.supportsAuthorizationOnly && (
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="auth-only" className="text-xs font-semibold cursor-pointer">
                    Authorization Only
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Select YES if you want to authorize card now and charge later manually. Authorization will expire in 6 days.
                  </p>
                </div>
                <Switch
                  id="auth-only"
                  checked={authorizationOnly}
                  onCheckedChange={(val) => {
                    onConfigChange('authorizationOnly', val);
                    onConfigChange('chargeImmediately', !val);
                  }}
                />
              </div>
            )}

            {/* Charge Customer Immediately (for gateways without auth toggle) */}
            {!gateway.supportsAuthorizationOnly && (
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="charge-imm" className="text-xs font-semibold cursor-pointer">
                    Charge Customer Immediately
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Execute the payment instantly when the customer submits the form.
                  </p>
                </div>
                <Switch
                  id="charge-imm"
                  checked={chargeImmediately}
                  onCheckedChange={(val) => onConfigChange('chargeImmediately', val)}
                />
              </div>
            )}

            {/* Create Customer Record (Stripe / Square) */}
            {gateway.supportsCustomerRecord && (
              <div className="space-y-2 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <Label className="text-xs font-semibold">Create {gateway.name} Customer Record</Label>
                <RadioGroup
                  value={customerRecordType}
                  onValueChange={(val) => onConfigChange('customerRecordType', val)}
                  className="space-y-1.5 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unique" id="cr-unique" />
                    <Label htmlFor="cr-unique" className="text-xs font-normal cursor-pointer">
                      For each unique customer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="submission" id="cr-sub" />
                    <Label htmlFor="cr-sub" className="text-xs font-normal cursor-pointer">
                      For each submission
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Ask Billing Information */}
            {gateway.supportsBillingInfo && (
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="billing-info" className="text-xs font-semibold cursor-pointer">
                    Ask Billing Information to Customer
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Require customer to enter cardholder address and postal code.
                  </p>
                </div>
                <Switch
                  id="billing-info"
                  checked={askBillingInfo}
                  onCheckedChange={(val) => {
                    onConfigChange('askBillingInfo', val);
                    onConfigChange('requireBillingAddress', val);
                  }}
                />
              </div>
            )}

            {/* Ask Shipping Information */}
            {gateway.supportsShippingInfo && (
              <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="shipping-info" className="text-xs font-semibold cursor-pointer">
                    Ask Shipping Information
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Collect physical shipping address during payment authorization.
                  </p>
                </div>
                <Switch
                  id="shipping-info"
                  checked={askShippingInfo}
                  onCheckedChange={(val) => onConfigChange('askShippingInfo', val)}
                />
              </div>
            )}

            {/* Order Fulfillment Type (Square / Cash App) */}
            {gateway.supportsOrderFulfillment && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-foreground">Order Fulfillment Type</Label>
                <Select
                  value={fulfillmentType}
                  onValueChange={(val) => onConfigChange('fulfillmentType', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical" className="text-xs">Physical Delivery (Goods)</SelectItem>
                    <SelectItem value="digital" className="text-xs">Digital Fulfillment (Email / Download)</SelectItem>
                    <SelectItem value="service" className="text-xs">Service (Appointment / Onsite)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Field Mappings (Customer Email / Phone) */}
            {gateway.fieldMappings && gateway.fieldMappings.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {gateway.fieldMappings.map((map) => (
                  <div key={map.key} className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">{map.label}</Label>
                    <Select
                      value={String(widgetConfig[map.key] || 'auto_detect')}
                      onValueChange={(val) => onConfigChange(map.key, val === 'auto_detect' ? '' : val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Auto-detect from Form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto_detect" className="text-xs text-muted-foreground">Auto-detect from Form</SelectItem>
                        {allFields
                          .filter((f) => f.id && f.id !== field.id)
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id} className="text-xs">
                              {f.label || f.type || 'Field'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {map.helpText && <p className="text-[10px] text-muted-foreground">{map.helpText}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Credit Card / Payment Method Label Text */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">
                {gateway.id === 'cash_app_pay' ? 'Payment Methods Label Text' : 'Credit Card Label Text'}
              </Label>
              <Input
                className="h-8 text-xs bg-background"
                value={customLabelText}
                placeholder={gateway.id === 'cash_app_pay' ? 'Cash App Pay' : 'Credit Card'}
                onChange={(e) => onConfigChange('customLabelText', e.target.value)}
              />
            </div>
          </div>

          <Separator className="my-2" />

          {/* ════ 6. ADVANCED MERCHANT KEYS (BYOK) ════ */}
          {gateway.configFields && gateway.configFields.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvancedCredentials((prev) => !prev)}
                className="w-full flex items-center justify-between p-2 rounded-lg border border-border/60 hover:bg-muted/40 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-emerald-600" />
                  Custom Merchant Credentials (BYOK)
                </span>
                {showAdvancedCredentials ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>

              {showAdvancedCredentials && (
                <div className="space-y-2.5 p-3 rounded-lg border border-border/80 bg-muted/20">
                  {gateway.configFields.map((cf) => (
                    <div key={cf.key} className="space-y-1">
                      <Label className="text-[11px] font-semibold">{cf.label}</Label>
                      <Input
                        type={cf.type === 'password' ? 'password' : 'text'}
                        className="h-8 text-xs bg-background font-mono"
                        placeholder={cf.placeholder}
                        value={String(widgetConfig[cf.key] || '')}
                        onChange={(e) => onConfigChange(cf.key, e.target.value)}
                      />
                      {cf.description && (
                        <p className="text-[10px] text-muted-foreground">{cf.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </ScrollArea>

      {/* ════ 7. STICKY JOTFORM FOOTER (Close + Update) ════ */}
      {(onClose || onUpdate) && (
        <div className="sticky bottom-0 px-4 py-3 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center gap-2 shrink-0">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs flex-1 gap-1.5"
              onClick={onClose}
            >
              <X className="size-3.5" /> Close
            </Button>
          )}
          {onUpdate && (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onUpdate}
            >
              <Check className="size-3.5" /> Update
            </Button>
          )}
        </div>
      )}

      {/* ════ 8. JOTFORM "ADD / EDIT GATEWAY CONNECTION" MODAL ════ */}
      <Dialog open={isConnectionModalOpen} onOpenChange={setIsConnectionModalOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-card">
          {/* Modal Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/20">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              {modalIsConnected ? `Edit ${gateway.name} Connection` : `Add ${gateway.name} Connection`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Connect with {gateway.name} to start collecting online payments
            </DialogDescription>
          </DialogHeader>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {/* Gateway Status Summary Card */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="size-10 rounded-lg flex items-center justify-center p-1.5 shrink-0 shadow-inner"
                  style={{ backgroundColor: gateway.logoBg || '#1e293b' }}
                  dangerouslySetInnerHTML={{ __html: gateway.iconSvg }}
                />
                <div>
                  <h4 className="font-bold text-sm text-foreground">{gateway.name}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {modalIsConnected ? 'Connected and ready to process' : 'Not connected'}
                  </p>
                </div>
              </div>

              {modalIsConnected ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1 font-semibold px-2.5 py-1">
                  <CheckCircle2 className="size-3.5" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs gap-1 px-2.5 py-1">
                  <AlertTriangle className="size-3.5" /> Not connected
                </Badge>
              )}
            </div>

            {/* Environment Mode Tabs */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Environment</Label>
              <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-lg border border-border/60 gap-1">
                <button
                  type="button"
                  onClick={() => setModalMode('test')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    modalMode === 'test'
                      ? 'bg-background text-foreground shadow-xs border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Test Mode
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('live')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    modalMode === 'live'
                      ? 'bg-background text-foreground shadow-xs border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Live Mode
                </button>
              </div>
            </div>

            {/* Connection Name with 0/40 Live Counter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="conn-name-input" className="text-xs font-semibold text-foreground">
                  Connection Name <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {modalConnName.length}/40
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter a name for your connection to reuse it in the future.
              </p>
              <Input
                id="conn-name-input"
                maxLength={40}
                value={modalConnName}
                onChange={(e) => setModalConnName(e.target.value)}
                placeholder={`My ${gateway.name} Connection #1`}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Connect with OAuth Provider Button */}
            <div className="pt-2">
              <Button
                type="button"
                className={`w-full h-10 text-xs font-bold gap-2 transition-all shadow-sm ${
                  modalIsConnected
                    ? 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                disabled={isConnecting}
                onClick={handleOAuthConnect}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> {gatewaySupportsOAuth ? `Connecting to ${oauthProviderName}...` : 'Setting up...'}
                  </>
                ) : modalIsConnected ? (
                  <>
                    <Check className="size-4 text-emerald-500" /> {gatewaySupportsOAuth ? `Reconnect with ${oauthProviderName}` : 'Reconfigure Keys'}
                  </>
                ) : (
                  <>
                    {gatewaySupportsOAuth ? (
                      <><ExternalLink className="size-4" /> Connect with {oauthProviderName}</>
                    ) : (
                      <><KeyRound className="size-4" /> Enter API Keys</>
                    )}
                  </>
                )}
              </Button>
            </div>

            {/* BYOK fields shown directly in modal for non-OAuth gateways */}
            {!gatewaySupportsOAuth && gateway.configFields && gateway.configFields.length > 0 && !modalIsConnected && (
              <div className="space-y-2.5 p-3 rounded-lg border border-border/60 bg-muted/20">
                <p className="text-[11px] font-semibold text-muted-foreground">Enter your {gateway.name} API credentials:</p>
                {gateway.configFields.map((cf) => (
                  <div key={cf.key} className="space-y-1">
                    <Label className="text-[11px] font-semibold">{cf.label}</Label>
                    <Input
                      type={cf.type === 'password' ? 'password' : 'text'}
                      className="h-8 text-xs bg-background font-mono"
                      placeholder={cf.placeholder}
                      value={String(widgetConfig[cf.key] || '')}
                      onChange={(e) => onConfigChange(cf.key, e.target.value)}
                    />
                    {cf.description && <p className="text-[10px] text-muted-foreground">{cf.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-4"
              onClick={() => setIsConnectionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={!modalConnName.trim()}
              onClick={handleSaveConnectionModal}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
