'use client';

import React, { Suspense } from 'react';
import { FormField } from '@/lib/forms/form-schema-types';
import { getRuntimeComponent } from './widget-runtime-registry';
import { getFieldById, FIELD_ALIASES } from '@/lib/forms/canonical-widget-registry';
import type { WidgetProps } from './widget-props';
import { ImageUploadWithNotes } from './image-upload-with-notes';
import { NearestLocationFinder } from './nearest-location-finder';
import { RoutePlannerMap } from './route-planner-map';
import { ServiceAreaChecker } from './service-area-checker';
import { FormCalculation } from './form-calculation';
import { SmsOtpVerification } from './sms-otp-verification';
import { SignaturePad } from './signature-pad';
import { VoiceRecorder } from './voice-recorder';
import { PaymentGatewayRuntime } from './payment-gateway-runtime';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Star, Shield, Lock, CreditCard, Sparkles, CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PAYMENT_GATEWAYS_REGISTRY } from '@/lib/forms/payments/payment-gateways-registry';

interface WidgetRuntimeDispatcherProps {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  allFormData?: Record<string, any>;
  disabled?: boolean;
  /** The form ID — propagated to payment widgets so they can call
   *  POST /api/forms/[id]/charge for real payments. */
  formId?: string;
}

/**
 * LazyWidgetRenderer — wrapper that renders a lazy component inside a Suspense
 * boundary. Declared OUTSIDE the dispatcher's render function so the
 * react-hooks/static-components ESLint rule is satisfied.
 */
function LazyWidgetRenderer({
  component: Component,
  value,
  onChange,
  config,
  disabled,
  readOnly,
  allFormData,
  field,
  formId,
}: {
  component: React.LazyExoticComponent<React.ComponentType<WidgetProps>>;
  value: unknown;
  onChange: (v: unknown) => void;
  config: Record<string, unknown>;
  disabled?: boolean;
  readOnly?: boolean;
  allFormData?: Record<string, unknown>;
  field: Record<string, unknown>;
  formId?: string;
}) {
  return (
    <Suspense fallback={<div className="h-10 bg-muted/40 animate-pulse rounded" />}>
      <Component
        value={value}
        onChange={onChange}
        config={config}
        disabled={disabled}
        readOnly={readOnly}
        allFormData={allFormData}
        field={formId ? { ...field, formId } : field}
      />
    </Suspense>
  );
}

/**
 * Resolve a widgetType string to a lazily-loaded runtime component.
 *
 * Resolution order (first match wins):
 *  1. FieldDefinition.runtimeComponentId — explicit override declared in the
 *     canonical registry (e.g. legacy id `color_picker` declares
 *     `runtimeComponentId: 'color_picker_widget'`).
 *  2. Direct map lookup — widgetType is itself a key in WIDGET_RUNTIME_MAP.
 *  3. FIELD_ALIASES — legacy/alternate IDs (e.g. `dropdown_widget` → `dropdown`,
 *     `*_v2` → canonical, `like_dislike_feedback` → `like_dislike`).
 *
 * Returns undefined when no component can be found — the dispatcher then falls
 * through to the legacy switch statement and finally the `<Input>` fallback.
 */
function resolveRuntimeComponent(
  widgetType: string,
): React.LazyExoticComponent<React.ComponentType<WidgetProps>> | undefined {
  // 1. Explicit runtimeComponentId override from the canonical FieldDefinition.
  const def = getFieldById(widgetType);
  if (def?.runtimeComponentId) {
    const override = getRuntimeComponent(def.runtimeComponentId);
    if (override) return override;
  }

  // 2. Direct lookup.
  const direct = getRuntimeComponent(widgetType);
  if (direct) return direct;

  // 3. Alias chain — legacy/alternate ID → canonical ID → map.
  const alias = FIELD_ALIASES[widgetType];
  if (alias && alias !== widgetType) {
    const aliased = getRuntimeComponent(alias);
    if (aliased) return aliased;
    // Recurse one level deep in case the alias itself maps via runtimeComponentId.
    const aliasDef = getFieldById(alias);
    if (aliasDef?.runtimeComponentId) {
      const override = getRuntimeComponent(aliasDef.runtimeComponentId);
      if (override) return override;
    }
  }

  return undefined;
}

export function WidgetRuntimeDispatcher({
  field,
  value,
  onChange,
  allFormData = {},
  disabled = false,
  formId,
}: WidgetRuntimeDispatcherProps) {
  const widgetType = field.widgetType || '';
  // Cast to Record<string, any> so property access returns `any` instead of `unknown`.
  // The widget config is freeform JSON defined per-widget — we trust the runtime
  // to pass the right shape based on widgetType.
  const config: Record<string, any> = field.widgetConfig || {};

  // ─── Universal readOnly setting ───────────────────────────────────────────
  // Honors both `field.readOnly` (top-level) and `config.readOnly` (from the
  // universal advanced settings inspector). Treats readOnly as a softer disable
  // for inline widgets that don't natively support the readOnly prop — the value
  // stays visible but the user cannot interact.
  const isReadOnly = Boolean(
    (field as any).readOnly || config.readOnly,
  );
  // For interactive widgets (buttons, signature pads, etc.) readOnly behaves
  // like disabled — the widget cannot be used to change the value.
  const interactiveDisabled = disabled || isReadOnly;

  // ─── Unified runtime resolution ────────────────────────────────────────────
  // Resolve the widgetType through THREE layers before falling back to the
  // legacy switch statement:
  //   1. FieldDefinition.runtimeComponentId (explicit override)
  //   2. Direct WIDGET_RUNTIME_MAP[widgetType]
  //   3. FIELD_ALIASES[widgetType] → canonical map key
  // This single resolution chain makes legacy IDs (`dropdown_widget`,
  // `*_v2`, `like_dislike_feedback`, `color_picker`, etc.) render their
  // proper runtime component instead of silently degrading to `<Input>`.
  const RuntimeComponent = resolveRuntimeComponent(widgetType);
  if (RuntimeComponent) {
    return (
      <LazyWidgetRenderer
        component={RuntimeComponent}
        value={value}
        onChange={onChange}
        config={config}
        disabled={disabled}
        readOnly={isReadOnly}
        allFormData={allFormData}
        field={field as unknown as Record<string, unknown>}
        formId={formId}
      />
    );
  }

  // Check if this field is a genuine payment gateway widget
  const isPaymentGateway =
    Boolean(config.gatewayId) ||
    widgetType.startsWith('payment_') ||
    PAYMENT_GATEWAYS_REGISTRY.some(
      (g) =>
        g.id === widgetType ||
        g.id === config.gatewayId ||
        g.fieldType === widgetType ||
        (field.type && field.type !== 'control_widget' && g.fieldType === field.type)
    );

  if (isPaymentGateway) {
    return (
      <PaymentGatewayRuntime
        gatewayId={config.gatewayId || widgetType.replace(/^payment_/, '')}
        fieldType={widgetType || field.type}
        config={config}
        value={value}
        onChange={onChange}
        allFormData={allFormData}
        disabled={interactiveDisabled}
        readOnly={isReadOnly}
        formId={formId}
      />
    );
  }

  switch (widgetType) {
    case 'image_upload_with_notes':
      return (
        <ImageUploadWithNotes
          value={value || []}
          onChange={onChange}
          maxFiles={config.maxFiles || 10}
          maxFileSizeMb={config.maxFileSizeMb || 10}
          disabled={interactiveDisabled}
        />
      );

    case 'nearest_location_finder':
      return (
        <NearestLocationFinder
          value={value}
          onChange={onChange}
          branches={config.branches}
          unit={config.distanceUnit || 'miles'}
          disabled={interactiveDisabled}
        />
      );

    case 'route_planner_map':
    case 'route_planner':
    case 'route_planner_v2':
      return (
        <RoutePlannerMap
          value={value}
          onChange={onChange}
          config={config}
          field={field}
          disabled={interactiveDisabled}
        />
      );

    case 'service_area_checker':
      return (
        <ServiceAreaChecker
          value={value}
          onChange={onChange}
          allowedZipCodes={config.allowedZipCodes}
          maxRadiusMiles={config.maxRadiusMiles}
          disabled={interactiveDisabled}
        />
      );

    case 'form_calculation':
    case 'calculation':
    case 'calculated':
      return (
        <FormCalculation
          formula={config.formula || ''}
          prefix={config.prefix || config.currencyPrefix || config.resultPrefix || '$'}
          suffix={config.suffix || config.resultSuffix || ''}
          decimals={config.decimals ?? config.decimalPlaces ?? 2}
          allFormData={allFormData}
          value={typeof value === 'number' ? value : 0}
          onChange={onChange}
          disabled={interactiveDisabled}
        />
      );

    case 'switch':
    case 'toggle':
    case 'label_with_toggle':
      const isSwitchChecked = typeof value === 'boolean' ? value : value === 'true' || value === 1 || Boolean(config.defaultChecked);
      return (
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
          <span className="text-xs font-semibold text-foreground">{field.label || (config.label as string) || 'Toggle Option'}</span>
          <Switch
            checked={isSwitchChecked}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={interactiveDisabled}
          />
        </div>
      );

    case 'sms_otp_verification':
      return (
        <SmsOtpVerification
          value={value}
          onChange={onChange}
          disabled={interactiveDisabled}
        />
      );

    case 'signature_pad':
    case 'smooth_signature':
    case 'e_signature':
    case 'signature':
      return (
        <SignaturePad
          value={value}
          onChange={onChange}
          penColor={config.penColor || '#0f172a'}
          disabled={interactiveDisabled}
        />
      );

    case 'voice_recorder':
    case 'audio_note':
      return (
        <VoiceRecorder
          value={value}
          onChange={onChange}
          disabled={interactiveDisabled}
        />
      );

    case 'star_rating':
    case 'star_rating_pro':
      const maxStars = config.maxStars || 5;
      const currentStar = Number(value || 0);
      return (
        <div className="flex items-center gap-1.5 py-1">
          {Array.from({ length: maxStars }).map((_, i) => {
            const starVal = i + 1;
            const filled = starVal <= currentStar;
            return (
              <button
                key={i}
                type="button"
                disabled={interactiveDisabled}
                onClick={() => onChange(starVal)}
                className="p-1 text-muted-foreground hover:text-amber-400 focus:outline-none transition-colors"
              >
                <Star
                  className={`size-7 transition-transform active:scale-95 ${
                    filled
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground/30 hover:text-amber-300'
                  }`}
                />
              </button>
            );
          })}
          {currentStar > 0 && (
            <span className="text-xs font-bold text-foreground ml-2">
              {currentStar} / {maxStars}
            </span>
          )}
        </div>
      );

    case 'slider':
    case 'slider_rating':
    case 'range_slider':
      const sliderVal = typeof value === 'number' ? value : typeof config.defaultValue === 'number' ? config.defaultValue : (config.min || 0);
      return (
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-xs font-semibold text-foreground">
            <span>{config.minLabel || config.min || 0}</span>
            <span className="text-emerald-600 font-bold">{sliderVal.toLocaleString()} {config.unit || ''}</span>
            <span>{config.maxLabel || config.max || 100}</span>
          </div>
          <Slider
            value={[sliderVal]}
            onValueChange={(vals) => onChange(vals[0])}
            min={config.min || 0}
            max={config.max || 100}
            step={config.step || 1}
            disabled={interactiveDisabled}
          />
        </div>
      );

    case 'configurable_list':
    case 'matrix_dynamo':
    case 'dynamic_repeater':
      const rows: any[] = Array.isArray(value) ? value : [{}];
      const rowColumns = config.columns || [
        { key: 'item', label: 'Item / Description' },
        { key: 'qty', label: 'Qty' },
        { key: 'notes', label: 'Notes' },
      ];

      return (
        <div className="space-y-2.5">
          <div className="border border-border/70 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/60 p-2 text-[11px] font-bold text-muted-foreground border-b border-border/70">
              {rowColumns.map((col: any, idx: number) => (
                <div key={idx} className="col-span-3 px-1">{col.label}</div>
              ))}
              <div className="col-span-3 text-right pr-2">Action</div>
            </div>
            <div className="divide-y divide-border/40">
              {rows.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-12 p-2 gap-2 items-center bg-card">
                  {rowColumns.map((col: any, cIdx: number) => (
                    <div key={cIdx} className="col-span-3 px-1">
                      <Input
                        value={row[col.key] || ''}
                        disabled={interactiveDisabled}
                        readOnly={isReadOnly}
                        placeholder={col.label}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[rIdx] = { ...updated[rIdx], [col.key]: e.target.value };
                          onChange(updated);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                  <div className="col-span-3 flex justify-end pr-1">
                    {!interactiveDisabled && rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange(rows.filter((_, i) => i !== rIdx))}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!interactiveDisabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange([...rows, {}])}
              className="text-xs gap-1.5 h-7"
            >
              <Plus className="size-3.5" /> Add Another Row
            </Button>
          )}
        </div>
      );

    case 'cloudflare_turnstile':
    case 'hcaptcha_enterprise':
    case 'google_recaptcha_v3':
      return (
        <div className="p-3 bg-muted/40 border border-border/70 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-foreground">Protected by Cloudflare Turnstile</p>
              <p className="text-[10px] text-muted-foreground">Automated spam & bot protection active</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
            ✓ Verified
          </span>
        </div>
      );

    case 'currency_amount_input':
      return (
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
            {config.currencySymbol || '$'}
          </span>
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            className="pl-7 text-xs font-mono font-bold"
            disabled={disabled}
            readOnly={isReadOnly}
          />
        </div>
      );

    default: {
      // Default fallback widget input
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'Enter value...'}
          className="text-xs"
          disabled={disabled}
          readOnly={isReadOnly}
        />
      );
    }
  }
}
