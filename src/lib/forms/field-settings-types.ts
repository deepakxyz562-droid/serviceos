/**
 * Field Setting Schema — typed, schema-driven description of a field's
 * configuration UI. Replaces the per-widget if/else settings panels.
 *
 * The WidgetSettingsRenderer iterates a FieldDefinition.settingsSchema and
 * renders the correct control for each entry. Adding a new widget's settings
 * means adding entries to its settingsSchema array — NOT touching the builder.
 */
import type { LucideIcon } from 'lucide-react';

/** Setting field types → corresponding UI control. */
export type SettingFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'options_editor'
  | 'formula_editor'
  | 'product_editor'
  | 'icon_picker'
  | 'date'
  | 'key_value'
  | 'condition_builder'
  | 'json';

export type SettingGroup = 'general' | 'advanced' | 'field_specific';

export interface SettingField {
  key: string;
  label: string;
  type: SettingFieldType;
  group: SettingGroup;
  placeholder?: string;
  helpText?: string;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  condition?: { dependsOn: string; equals: string };
  required?: boolean;
}

export const UNIVERSAL_GENERAL_SETTINGS: SettingField[] = [
  { key: 'label', label: 'Field Label', type: 'text', group: 'general', placeholder: 'Enter label...' },
  { key: 'placeholder', label: 'Placeholder', type: 'text', group: 'general', placeholder: 'Enter hint...' },
  { key: 'helpText', label: 'Sub-label / Hover Text', type: 'text', group: 'general' },
  { key: 'defaultValue', label: 'Default Value', type: 'text', group: 'general' },
  { key: 'required', label: 'Required', type: 'boolean', group: 'general', default: false },
  { key: 'readOnly', label: 'Read-only', type: 'boolean', group: 'general', default: false },
  {
    key: 'width',
    label: 'Field Width',
    type: 'select',
    group: 'general',
    default: 'full',
    options: [
      { label: 'Full Width', value: 'full' },
      { label: 'Half', value: 'half' },
      { label: 'Third', value: 'third' },
      { label: 'Quarter', value: 'quarter' },
    ],
  },
  {
    key: 'labelAlign',
    label: 'Label Position',
    type: 'select',
    group: 'general',
    default: 'top',
    options: [
      { label: 'Top', value: 'top' },
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
      { label: 'Hidden', value: 'hidden' },
    ],
  },
];

export const UNIVERSAL_ADVANCED_SETTINGS: SettingField[] = [
  {
    key: 'condition',
    label: 'Show if (conditional logic)',
    type: 'condition_builder',
    group: 'advanced',
    helpText: 'Show this field only when another field matches a value.',
  },
  {
    key: 'calculation',
    label: 'Auto-calculate value',
    type: 'formula_editor',
    group: 'advanced',
    helpText: 'Use tokens like {{field_id}} to reference other field values.',
  },
  { key: 'customError', label: 'Custom error message', type: 'text', group: 'advanced' },
  { key: 'hideLabel', label: 'Hide label', type: 'boolean', group: 'advanced', default: false },
  { key: 'timeLimit', label: 'Time limit (seconds, 0 = none)', type: 'number', group: 'advanced', default: 0, min: 0 },
  { key: 'customCss', label: 'Custom CSS', type: 'textarea', group: 'advanced', placeholder: '.field-class { ... }' },
];

export interface FieldDefinition {
  id: string;
  name: string;
  category:
    | 'basic'
    | 'choice'
    | 'datetime'
    | 'media'
    | 'payment'
    | 'calculation'
    | 'layout'
    | 'security'
    | 'maps'
    | 'regional'
    | 'survey'
    | 'social'
    | 'embed'
    | 'signature'
    | 'file'
    | 'widget'
    | 'contact'
    | 'productivity'
    | 'finance'
    | 'analytics'
    | 'marketing';
  iconName: string;
  description: string;
  badge?: 'NEW' | 'AI' | 'POPULAR' | 'PRO';
  tier?: 'free' | 'pro' | 'business';
  createField: (label?: string) => Record<string, unknown>;
  settingsSchema: SettingField[];
  backendHandler?: 'ocr' | 'otp_sms' | 'otp_email' | 'payment' | 'maps' | 'barcode' | 'kyc' | 'none';
  aiHint?: { keywords: string[] };
}

export type RuntimeComponentMap = Record<string, React.LazyExoticComponent<React.ComponentType<unknown>>>;
export type IconResolver = (name: string) => LucideIcon;
