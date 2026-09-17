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
  | 'json'
  // ─── Phase R2 — JotForm-style control types ────────────────────────────────
  | 'segmented'              // inline button group: [Left | Center | Right]
  | 'dimension'              // numeric input + unit suffix: [350] [PX]
  | 'multi_checkbox'         // multiple checkboxes (JPG/PNG/HEIC/WebP, Card/PayPal/Apple Pay)
  | 'toggle_with_description'// toggle + label + description (Required → "Prevent submission if empty")
  | 'duplicate_button'       // inline "Duplicate Field" button
  | 'gateway_picker'         // payment gateway selector with logo + name
  | 'currency_search'        // searchable currency dropdown
  | 'label_with_toggle';    // Field Label text input + enable/disable toggle

export type SettingGroup = 'general' | 'advanced' | 'field_specific' | 'survey';

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
  /** For 'dimension' type: the unit suffix shown next to the numeric input (e.g. 'PX'). */
  unit?: string;
  /** For 'toggle_with_description' type: the description text shown under the label. */
  description?: string;
  /** For 'duplicate_button' type: the action callback id (handled by parent). */
  action?: 'duplicate' | 'delete';
  /** For 'gateway_picker' / 'currency_search' type: placeholder for the search input. */
  searchPlaceholder?: string;
  /** For 'segmented' type: show a 'Set as form default' checkbox below the segmented control (JotForm pattern). */
  setAsFormDefault?: boolean;
}

export const UNIVERSAL_GENERAL_SETTINGS: SettingField[] = [
  // ─── Field Label (JotForm: plain text input, no toggle for most fields) ──────
  {
    key: 'labelEnabled',
    label: 'Field Label',
    type: 'label_with_toggle',
    group: 'general',
    default: true,
    helpText: 'Enable/disable the field label without deleting it.',
  },
  { key: 'label', label: 'Label Text', type: 'text', group: 'general', placeholder: 'Enter label...', condition: { dependsOn: 'labelEnabled', equals: 'true' } },
  // ─── Label Alignment (segmented + "Set as form default" checkbox — JotForm) ──
  {
    key: 'labelAlign',
    label: 'Label Alignment',
    type: 'segmented',
    group: 'general',
    default: 'top',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
      { label: 'Top', value: 'top' },
    ],
    helpText: 'Select how the label text is aligned horizontally.',
    setAsFormDefault: true,
  },
  // ─── Required (toggle with description — JotForm) ─────────────────────────────
  {
    key: 'required',
    label: 'Required',
    type: 'toggle_with_description',
    group: 'general',
    default: false,
    description: 'Prevent submission if this field is empty.',
  },
  // ─── Duplicate Field (inline button — JotForm) ────────────────────────────────
  {
    key: '_duplicate',
    label: 'Duplicate Field',
    type: 'duplicate_button',
    group: 'general',
    action: 'duplicate',
    helpText: 'Duplicate this field with all saved settings.',
  },
];

export const UNIVERSAL_ADVANCED_SETTINGS: SettingField[] = [
  { key: 'placeholder', label: 'Placeholder', type: 'text', group: 'advanced', placeholder: 'Enter hint...' },
  { key: 'helpText', label: 'Sub-label / Hover Text', type: 'text', group: 'advanced' },
  { key: 'defaultValue', label: 'Default Value', type: 'text', group: 'advanced' },
  // ─── Input Alignment + Dimensions (JotForm puts these in Advanced) ───────────
  {
    key: 'align',
    label: 'Input Alignment',
    type: 'segmented',
    group: 'advanced',
    default: 'left',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ],
    helpText: 'Select how the input is aligned horizontally.',
  },
  {
    key: 'widthPx',
    label: 'Width',
    type: 'dimension',
    group: 'advanced',
    default: 350,
    unit: 'PX',
    min: 50,
    max: 2000,
    helpText: 'Field width in pixels.',
  },
  {
    key: 'heightPx',
    label: 'Height',
    type: 'dimension',
    group: 'advanced',
    default: 100,
    unit: 'PX',
    min: 30,
    max: 2000,
    helpText: 'Field height in pixels.',
  },
  {
    key: 'readOnly',
    label: 'Read-only',
    type: 'toggle_with_description',
    group: 'advanced',
    default: false,
    description: 'Prevent respondent from editing value.',
  },
  {
    key: 'hidden',
    label: 'Hidden Field',
    type: 'toggle_with_description',
    group: 'advanced',
    default: false,
    description: 'Pass parameters via URL (UTMs, IDs).',
  },
  { key: 'fieldName', label: 'Field Name (machine)', type: 'text', group: 'advanced', helpText: 'Internal identifier for API/webhook mapping.' },
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
