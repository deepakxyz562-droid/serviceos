'use client';

/**
 * UnifiedFieldInspector — schema-driven settings & payment properties inspector.
 *
 * Resolves a FormField (basic OR widget OR payment) to a FieldDefinition
 * (from the unified registry, or synthesised for payment gateways) and
 * renders either the specialized JotForm PaymentPropertiesPanel (for payment gateways)
 * or the schema-driven WidgetSettingsRenderer (for standard fields and widgets).
 */
import { useMemo } from 'react';
import { WidgetSettingsRenderer } from './widget-settings-renderer';
import { PaymentPropertiesPanel } from './payment-properties-panel';
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
  /** Called when user clicks "Duplicate Field" in the General tab. */
  onDuplicate?: () => void;
  /** Called when user clicks "Close" in the sticky footer. */
  onClose?: () => void;
  /** Called when user clicks "Update" in the sticky footer. */
  onUpdate?: () => void;
}

export function resolveFieldDefinition(field: Record<string, any>): FieldDefinition {
  const widgetType = field.widgetType as string | undefined;
  const gatewayId = field.widgetConfig?.gatewayId as string | undefined;

  if (widgetType) {
    const def = getFieldById(widgetType);
    if (def) return def;

    if (widgetType.startsWith('payment_') || gatewayId) {
      const gwId = gatewayId || widgetType.replace(/^payment_/, '');
      const gw = PAYMENT_GATEWAYS_REGISTRY.find((g) => g.id === gwId || g.fieldType === widgetType);
      if (gw) {
        return synthesizePaymentDefinition(gw);
      }
    }
  }

  // Match by field.type in field registry (with aliases)
  if (field.type) {
    const defByType = getFieldById(field.type);
    if (defByType) return defByType;
  }

  // Match by gateway fieldType if present (excluding generic control_widget)
  if (field.type && field.type !== 'control_widget') {
    const gwByFieldType = PAYMENT_GATEWAYS_REGISTRY.find((g) => g.fieldType === field.type);
    if (gwByFieldType) {
      return synthesizePaymentDefinition(gwByFieldType);
    }
  }

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
        paymentType: 'sell_products',
        pricingMode: 'fixed',
        mode: 'test',
        testMode: true,
        authorizationOnly: false,
        chargeImmediately: true,
        sendReceiptEmail: true,
        askBillingInfo: true,
      },
      required: true,
    }),
    settingsSchema: [],
  };
}

export function UnifiedFieldInspector({
  field,
  allFields,
  onFieldChange,
  onConfigChange,
  onDuplicate,
  onClose,
  onUpdate,
}: UnifiedFieldInspectorProps) {
  const definition = useMemo(() => resolveFieldDefinition(field), [field]);

  const widgetConfig = (field.widgetConfig || {}) as Record<string, unknown>;
  const fieldRecord = field as Record<string, unknown>;
  const allFieldsClean = useMemo(
    () => allFields
      .filter((f) => f.id !== field.id)
      .map((f) => ({ id: f.id, label: f.label || f.type || 'Unnamed', type: f.type })),
    [allFields, field.id],
  );

  // 1. If this is a genuine payment widget, render the dedicated JotForm Payment Properties panel
  const isPaymentWidget =
    definition.category === 'payment' ||
    Boolean(field.widgetType?.startsWith('payment_')) ||
    Boolean(widgetConfig.gatewayId) ||
    PAYMENT_GATEWAYS_REGISTRY.some(
      (g) =>
        g.id === field.widgetType ||
        g.fieldType === field.widgetType ||
        (field.type && field.type !== 'control_widget' && g.fieldType === field.type)
    );

  if (isPaymentWidget) {
    return (
      <PaymentPropertiesPanel
        field={field}
        allFields={allFieldsClean}
        onFieldChange={onFieldChange}
        onConfigChange={onConfigChange}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );
  }

  // 2. Otherwise render schema-driven widget settings renderer
  return (
    <WidgetSettingsRenderer
      definition={definition}
      field={fieldRecord}
      widgetConfig={widgetConfig}
      onFieldChange={onFieldChange}
      onConfigChange={onConfigChange}
      allFields={allFieldsClean}
      onDuplicate={onDuplicate}
      onClose={onClose}
      onUpdate={onUpdate}
    />
  );
}
