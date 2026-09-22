'use client';

/**
 * UnifiedFieldInspector — schema-driven settings & payment properties inspector.
 *
 * Resolves a FormField (basic OR widget OR payment) to a FieldDefinition
 * (from the unified registry, or synthesised for payment gateways) and
 * renders either the specialized JotForm PaymentPropertiesPanel (for payment gateways)
 * or the schema-driven WidgetSettingsRenderer (for standard fields and widgets).
 */
import { useState, useMemo } from 'react';
import { WidgetSettingsRenderer } from './widget-settings-renderer';
import { PaymentPropertiesPanel } from './payment-properties-panel';
import { AppointmentPropertiesPanel } from './appointment-properties-panel';
import { FormCalculationFormulaPad } from './form-calculation-formula-pad';
import {
  FIELD_REGISTRY,
  getFieldById,
} from '@/lib/forms/field-registry';
import type { FieldDefinition } from '@/lib/forms/field-settings-types';
import { PAYMENT_GATEWAYS_REGISTRY } from '@/lib/forms/payments/payment-gateways-registry';

export interface UnifiedFieldInspectorProps {
  field: Record<string, any>;
  allFields: Array<{ id: string; label: string; type?: string; widgetType?: string }>;
  mode?: 'properties' | 'widget_settings';
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
  mode = 'widget_settings',
  onFieldChange,
  onConfigChange,
  onDuplicate,
  onClose,
  onUpdate,
}: UnifiedFieldInspectorProps) {
  const [activeMode, setActiveMode] = useState<'properties' | 'widget_settings'>(mode);

  // Sync mode if changed from parent
  useMemo(() => {
    setActiveMode(mode);
  }, [mode, field.id]);

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

  // 2. If this is an Appointment widget, render the dedicated JotForm Appointment Properties panel
  const isAppointmentWidget =
    field.widgetType === 'appointment' ||
    field.type === 'appointment' ||
    field.type === 'appointment_booking' ||
    definition.id === 'appointment';

  if (isAppointmentWidget) {
    return (
      <AppointmentPropertiesPanel
        field={field}
        allFields={allFieldsClean}
        onFieldChange={onFieldChange}
        onConfigChange={onConfigChange}
        onDuplicate={onDuplicate}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    );
  }

  // 3. If this is a Calculation widget and mode is 'widget_settings', render JotForm Formula Pad
  const isCalculationWidget =
    field.widgetType === 'calculation' ||
    field.widgetType === 'form_calculation' ||
    field.type === 'calculation' ||
    field.type === 'form_calculation' ||
    definition.id === 'calculation' ||
    definition.id === 'form_calculation';

  if (isCalculationWidget && activeMode === 'widget_settings') {
    return (
      <FormCalculationFormulaPad
        field={field}
        allFields={allFieldsClean}
        onFieldChange={onFieldChange}
        onConfigChange={onConfigChange}
        onSwitchToProperties={() => setActiveMode('properties')}
        onClose={onClose}
        onSave={onUpdate}
      />
    );
  }

  // 4. Otherwise render schema-driven widget settings renderer
  return (
    <div className="flex flex-col h-full">
      {isCalculationWidget && (
        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
            Form Calculation Field Properties
          </span>
          <button
            type="button"
            onClick={() => setActiveMode('widget_settings')}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer"
          >
            🪄 Formula Pad
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <WidgetSettingsRenderer
          definition={definition}
          field={fieldRecord}
          widgetConfig={widgetConfig}
          mode={activeMode}
          onFieldChange={onFieldChange}
          onConfigChange={onConfigChange}
          allFields={allFieldsClean}
          onDuplicate={onDuplicate}
          onClose={onClose}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}
