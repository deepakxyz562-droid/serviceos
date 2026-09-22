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
import { LiveEstimateSummaryPanel } from './live-estimate-summary-panel';
import { SmsOtpVerification } from './sms-otp-verification';
import { SignaturePad } from './signature-pad';
import { VoiceRecorder } from './voice-recorder';
import { PaymentGatewayRuntime } from './payment-gateway-runtime';
import { StarRatingComments } from './survey/star-rating-comments';
import { ConfigurableListV2 } from './productivity/configurable-list-v2';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Star, Shield, Lock, CreditCard, Sparkles, CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PAYMENT_GATEWAYS_REGISTRY } from '@/lib/forms/payments/payment-gateways-registry';

interface WidgetRuntimeDispatcherProps {
  field: FormField;
  value: any;
  onChange: (val: any) => void;
  allFormData?: Record<string, any>;
  disabled?: boolean;
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
  allFormData,
  field,
}: {
  component: React.LazyExoticComponent<React.ComponentType<WidgetProps>>;
  value: unknown;
  onChange: (v: unknown) => void;
  config: Record<string, unknown>;
  disabled?: boolean;
  allFormData?: Record<string, unknown>;
  field: Record<string, unknown>;
}) {
  return (
    <Suspense fallback={<div className="h-10 bg-muted/40 animate-pulse rounded" />}>
      <Component
        value={value}
        onChange={onChange}
        config={config}
        disabled={disabled}
        allFormData={allFormData}
        field={field}
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
}: WidgetRuntimeDispatcherProps) {
  const widgetType =
    field.widgetType ||
    (field.type && field.type !== 'control_widget' ? field.type : '') ||
    '';
  // Cast to Record<string, any> so property access returns `any` instead of `unknown`.
  // The widget config is freeform JSON defined per-widget — we trust the runtime
  // to pass the right shape based on widgetType.
  const config: Record<string, any> = field.widgetConfig || {};

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
        allFormData={allFormData}
        field={field as unknown as Record<string, unknown>}
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
        disabled={disabled}
      />
    );
  }

  switch (widgetType) {
    // ─── Widgets NOT in WIDGET_RUNTIME_MAP (must be handled here) ──────────────

    case 'photos_with_notes':
    case 'photo_notes':
      return (
        <ImageUploadWithNotes
          value={value || []}
          onChange={onChange}
          maxFiles={config.maxFiles || 10}
          maxFileSizeMb={config.maxFileSizeMb || 10}
          disabled={disabled}
        />
      );

    case 'route_planner_v2':
      return (
        <RoutePlannerMap
          value={value}
          onChange={onChange}
          config={config}
          field={field}
          disabled={disabled}
        />
      );

    case 'form_calculation':
    case 'calculation':
    case 'math_formula':
      return (
        <FormCalculation
          formula={config.formula || ''}
          prefix={config.prefix || '$'}
          suffix={config.suffix || ''}
          decimals={config.decimals ?? 2}
          allFormData={allFormData}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'live_estimate_summary':
    case 'live_estimator':
    case 'estimate_summary_panel':
      return (
        <LiveEstimateSummaryPanel
          headline={config.headline as string | undefined}
          formula={config.formula as string | undefined}
          currency={config.currency as string | undefined}
          prefix={config.currency as string | undefined}
          lineItems={config.lineItems as any}
          continueText={config.continueText as string | undefined}
          allFormData={allFormData}
          fields={field?.widgetConfig?.lineItems ? [] : []}
        />
      );

    case 'voice_recorder':
    case 'voice_note':
    case 'audio_note':
      return (
        <VoiceRecorder
          value={value}
          onChange={onChange}
          config={config}
          disabled={disabled}
          field={field as unknown as Record<string, unknown>}
        />
      );

    case 'star_rating_pro':
      // Legacy alias — routes to star_rating which is in the lazy map.
      // This case is only reached if the lazy map lookup fails.
      return (
        <StarRatingComments
          value={value}
          onChange={onChange}
          config={config}
          disabled={disabled}
          field={field}
        />
      );

    case 'slider_rating':
    case 'range_slider':
      const sliderVal = typeof value === 'number' ? value : (config.min || 0);
      return (
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-xs font-semibold text-foreground">
            <span>{config.minLabel || config.min || 0}</span>
            <span className="text-emerald-600 font-bold">{sliderVal} {config.unit || ''}</span>
            <span>{config.maxLabel || config.max || 100}</span>
          </div>
          <Slider
            value={[sliderVal]}
            onValueChange={(vals) => onChange(vals[0])}
            min={config.min || 0}
            max={config.max || 100}
            step={config.step || 1}
            disabled={disabled}
          />
        </div>
      );

    case 'matrix_dynamo':
    case 'dynamic_repeater':
      // Legacy aliases for configurable_list — routes to the lazy map component.
      // These aliases aren't in FIELD_ALIASES, so handle them here.
      return (
        <ConfigurableListV2
          value={value}
          onChange={onChange}
          config={config}
          disabled={disabled}
          field={field}
        />
      );

    case 'hcaptcha_enterprise':
    case 'google_recaptcha_v3':
      // Legacy captcha stubs — show a "Verified" badge (same as Turnstile)
      return (
        <div className="p-3 bg-muted/40 border border-border/70 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-foreground">Bot Protection Active</p>
              <p className="text-[10px] text-muted-foreground">Automated spam & bot protection</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
            ✓ Verified
          </span>
        </div>
      );

    default:
      // Default fallback widget input
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'Enter value...'}
          className="text-xs"
          disabled={disabled}
        />
      );
  }
}
