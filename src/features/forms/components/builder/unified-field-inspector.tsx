'use client';

/**
 * UnifiedFieldInspector — thin wrapper around WidgetSettingsRenderer.
 *
 * Resolves a FormField (basic OR widget OR payment) to a FieldDefinition
 * (from the unified registry, or synthesised for payment gateways) and
 * renders the schema-driven settings panel.
 *
 * This is the new "🎛️ Unified" tab in the Form Studio inspector. The legacy
 * "⚙️ Properties" + "🪄 Widget Settings" tabs remain for backward compatibility;
 * they can be removed once every widget's settingsSchema is complete.
 */
import { useMemo } from 'react';
import { WidgetSettingsRenderer } from './widget-settings-renderer';
import {
  FIELD_REGISTRY,
  getFieldById,
} from '@/lib/forms/field-registry';
import type { FieldDefinition } from '@/lib/forms/field-settings-types';
import { PAYMENT_GATEWAYS_REGISTRY } from '@/lib/forms/payments/payment-gateways-registry';

export interface UnifiedFieldInspectorProps {
  field: Record<string, any>;
  allFields: Array<{ id: string; label: string; type?: string; widgetType?: string }>;
  onFieldChange: (key: string, value: unknown) => void;
  onConfigChange: (key: string, value: unknown) => void;
}

export function resolveFieldDefinition(field: Record<string, any>): FieldDefinition {
  const widgetType = field.widgetType as string | undefined;
  const gatewayId = field.widgetConfig?.gatewayId as string | undefined;

  if (widgetType) {
    const def = getFieldById(widgetType);
    if (def) return def;

    if (widgetType.startsWith('payment_') || gatewayId) {
      const gwId = gatewayId || widgetType.replace(/^payment_/, '');
      const gw = PAYMENT_GATEWAYS_REGISTRY.find((g) => g.id === gwId);
      if (gw) {
        return synthesizePaymentDefinition(gw);
      }
    }
  }

  const defByType = FIELD_REGISTRY.find((d) => d.id === field.type);
  if (defByType) return defByType;

  return {
    id: 'fallback',
    name: String(field.label || field.type || 'Field'),
    category: 'basic',
    iconName: 'HelpCircle',
    description: 'No settings schema available for this field type.',
    tier: 'free',
    createField: () => ({ label: '' }),
    settingsSchema: [],
  };
}

function synthesizePaymentDefinition(gw: typeof PAYMENT_GATEWAYS_REGISTRY[number]): FieldDefinition {
  return {
    id: `payment_${gw.id}`,
    name: gw.name,
    category: 'payment',
    iconName: 'CreditCard',
    description: gw.description,
    badge: gw.badge as FieldDefinition['badge'],
    tier: 'business',
    backendHandler: 'payment',
    createField: () => ({
      label: `Payment via ${gw.name}`,
      type: 'short_answer',
      widgetType: `payment_${gw.id}`,
      widgetConfig: {
        gatewayId: gw.id,
        provider: gw.supportsZeroConfig ? 'managed' : 'byok',
        currency: gw.currencies[0] || 'USD',
        amount: 49.0,
        pricingMode: 'fixed',
        testMode: true,
      },
      required: true,
    }),
    settingsSchema: [
      {
        key: 'provider',
        label: 'Gateway Integration Mode',
        type: 'select',
        group: 'field_specific',
        default: gw.supportsZeroConfig ? 'managed' : 'byok',
        options: [
          ...(gw.supportsZeroConfig
            ? [{ label: '🚀 Platform Zero-Config (1-Click)', value: 'managed' }]
            : []),
          { label: '⚙️ Custom Merchant Credentials (BYOK)', value: 'byok' },
        ],
        helpText: 'Zero-config lets us process payments on your behalf. BYOK stores your own gateway keys.',
      },
      ...(gw.configFields || []).map((cf) => ({
        key: cf.key,
        label: cf.label,
        type: cf.type === 'password' ? ('text' as const) : (cf.type as 'text' | 'select' | 'boolean'),
        group: 'field_specific' as const,
        placeholder: cf.placeholder,
        helpText: cf.description,
        options: cf.options?.map((o) => ({ label: o.label, value: o.value })),
      })),
      {
        key: 'pricingMode',
        label: 'Charge Mode',
        type: 'select',
        group: 'field_specific',
        default: 'fixed',
        options: [
          { label: 'Fixed Amount / Deposit', value: 'fixed' },
          { label: 'Calculate Total from Form Fields', value: 'formula' },
          { label: 'Customer Entered Amount (Donation)', value: 'user_input' },
        ],
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'number',
        group: 'field_specific',
        default: 49.0,
        step: 0.01,
        condition: { dependsOn: 'pricingMode', equals: 'fixed' },
      },
      {
        key: 'currency',
        label: 'Currency',
        type: 'select',
        group: 'field_specific',
        default: gw.currencies[0] || 'USD',
        options: gw.currencies.map((c) => ({ label: c, value: c })),
      },
      {
        key: 'testMode',
        label: 'Sandbox test mode (no real charges)',
        type: 'boolean',
        group: 'field_specific',
        default: true,
      },
      {
        key: 'requireBillingAddress',
        label: 'Require billing address',
        type: 'boolean',
        group: 'field_specific',
        default: true,
      },
    ],
  };
}

export function UnifiedFieldInspector({
  field,
  allFields,
  onFieldChange,
  onConfigChange,
}: UnifiedFieldInspectorProps) {
  const definition = useMemo(() => resolveFieldDefinition(field), [field]);

  const widgetConfig = (field.widgetConfig || {}) as Record<string, unknown>;
  const fieldRecord = field as Record<string, unknown>;
  const allFieldsClean = useMemo(
    () => allFields
      .filter((f) => f.id !== field.id)
      .map((f) => ({ id: f.id, label: f.label || f.type || 'Unnamed' })),
    [allFields, field.id],
  );

  return (
    <WidgetSettingsRenderer
      definition={definition}
      field={fieldRecord}
      widgetConfig={widgetConfig}
      onFieldChange={onFieldChange}
      onConfigChange={onConfigChange}
      allFields={allFieldsClean}
    />
  );
}
