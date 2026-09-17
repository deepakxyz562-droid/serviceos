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

import { useState } from 'react';
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

  const handleToggleConnection = () => {
    const nextConnected = !isConnected;
    onConfigChange('isConnected', nextConnected);
    if (nextConnected && !widgetConfig.provider) {
      onConfigChange('provider', gateway.supportsZeroConfig ? 'managed' : 'byok');
    }
  };

  const handleModeChange = (newMode: 'live' | 'test') => {
    onConfigChange('mode', newMode);
    onConfigChange('testMode', newMode === 'test');
  };

  const handleMethodToggle = (methodId: string, checked: boolean) => {
    const next = { ...enabledMethods, [methodId]: checked };
    onConfigChange('enabledPaymentMethods', next);
  };

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
          
          {/* ════ 2. GATEWAY CONNECTION CARD ════ */}
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

              {/* Status Pill */}
              {isConnected ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                  <CheckCircle2 className="size-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1">
                  <AlertTriangle className="size-3" /> Disconnected
                </Badge>
              )}
            </div>

            {/* Warning / Status Note */}
            {!isConnected ? (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Add a <span className="font-semibold">{gateway.name}</span> connection to start collecting payments on your form.
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed flex items-center justify-between">
                <span>Account active in <strong>{mode === 'live' ? 'Live Mode' : 'Test Sandbox'}</strong></span>
                <button
                  type="button"
                  onClick={handleToggleConnection}
                  className="text-[10px] text-red-500 hover:underline font-semibold"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Mode Selector + Connect Button */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Environment Mode</Label>
                <Select value={mode} onValueChange={(v) => handleModeChange(v as 'live' | 'test')}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test" className="text-xs">Test Mode (Sandbox)</SelectItem>
                    <SelectItem value="live" className="text-xs">Live Mode (Production)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col justify-end">
                <Button
                  type="button"
                  size="sm"
                  className={`h-8 text-xs font-semibold gap-1.5 transition-all ${
                    isConnected
                      ? 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                  onClick={handleToggleConnection}
                >
                  {isConnected ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" /> Attached
                    </>
                  ) : (
                    <>
                      <ExternalLink className="size-3" /> Connect {gateway.name.split(' ')[0]}
                    </>
                  )}
                </Button>
              </div>
            </div>
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
                      value={String(widgetConfig[map.key] || '')}
                      onValueChange={(val) => onConfigChange(map.key, val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Auto-detect from Form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-xs text-muted-foreground">Auto-detect from Form</SelectItem>
                        {allFields
                          .filter((f) => f.id !== field.id)
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
    </div>
  );
}
