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
  | 'label_with_toggle'      // Field Label text input + enable/disable toggle
  | 'field_selector'         // dropdown listing all form fields (for Customer Email, Custom Data)
  | 'calculation_values_editor' // Calculation values matrix per option (JotForm pattern)
  | 'bulk_options_editor'   // bulk options paste / text editor
  | 'range'                  // slider / range input with numeric value display (JotForm pattern)
  | 'predefined_options'     // Jotform-style preset selector (Countries, States, Days, etc.)
  | 'field_id_display';      // read-only display of the field's internal ID

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
  /**
   * For payment credential fields: when true, the inspector renders this field
   * as a password input AND encrypts the value with AES-256-GCM before storing
   * it in widgetConfig. Public form-loading endpoints strip this field from the
   * JSON so it never reaches the browser.
   *
   * Use this for: secretKey (Stripe), clientSecret (PayPal), keySecret (Razorpay),
   * accessToken (Square), transactionKey (Authorize.Net), privateKey (Braintree),
   * webhookSecret (Stripe), webhookId (PayPal), apiPassword (Paysafe), apiKey
   * (Mollie/SensePass), sharedSecret (CyberSource), passphrase (Payfast),
   * authCode (CardPointe), apiToken (Moneris), password (BlueSnap), merchantKey
   * (PayU India), secretWord (Skrill), serviceKey (Worldpay UK), merchantSalt
   * (PayU India), apiSecret (iyzico).
   *
   * DO NOT use for: publishableKey (Stripe), clientId (PayPal), applicationId
   * (Square), merchantId (Braintree), keyId (Razorpay), apiLoginId (Authorize.Net),
   * clientKey (Authorize.Net), subdomain (Chargify), storeId (Moneris), accountId
   * (Paysafe) — these are PUBLIC and safe to expose to the browser.
   */
  secret?: boolean;
}

export const UNIVERSAL_GENERAL_SETTINGS: SettingField[] = [
  // ─── Field Label (toggle to enable/disable + inline text input) ──────────
  // The label_with_toggle type renders BOTH the Switch and the text Input.
  // The Switch toggles field.labelEnabled (boolean).
  // The Input reads/writes field.label (string).
  // No separate 'label' setting needed — it's built into the toggle.
  {
    key: 'labelEnabled',
    label: 'Field Label',
    type: 'label_with_toggle',
    group: 'general',
    default: true,
    helpText: 'Enable/disable the field label without deleting it.',
  },
  // ─── Sublabel / Helper Text ────────────────────────────────────────────────
  { key: 'helpText', label: 'Helper Text / Sub-label', type: 'text', group: 'general', placeholder: 'Help text shown below question...' },
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
  // ─── Column Width & Layout (1-Col, 2-Col, 3-Col, 4-Col) ────────────────────
  {
    key: 'width',
    label: 'Column Width',
    type: 'segmented',
    group: 'general',
    default: 'full',
    options: [
      { label: '100% (1 Col)', value: 'full' },
      { label: '50% (2 Col)', value: 'half' },
      { label: '33% (3 Col)', value: 'third' },
      { label: '25% (4 Col)', value: 'quarter' },
    ],
    helpText: 'Control how this field spans within a multi-column row.',
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
  { key: 'placeholder', label: 'Placeholder Hint', type: 'text', group: 'advanced', placeholder: 'Enter hint text...' },
  { key: 'defaultValue', label: 'Default Value', type: 'text', group: 'advanced', placeholder: 'Pre-filled default value...' },
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
  { key: 'fieldName', label: 'Field Name (Machine Key)', type: 'text', group: 'advanced', helpText: 'Internal identifier for API/webhook mapping.' },
  { key: 'fieldId', label: 'Field ID', type: 'field_id_display', group: 'advanced', helpText: 'Unique system identifier for this field (read-only).' },
  {
    key: 'condition',
    label: 'Conditional Logic (Show / Hide)',
    type: 'condition_builder',
    group: 'advanced',
    helpText: 'Show this field only when another field matches a value.',
  },
  {
    key: 'customCss',
    label: 'Custom CSS Code',
    type: 'textarea',
    group: 'advanced',
    default: '',
    placeholder: '/* Custom CSS for this field */\n.input-field {\n  box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n}',
    helpText: 'Custom CSS applied to this field wrapper.',
  },
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
  /**
   * Explicit key into the WidgetRuntimeRegistry's WIDGET_RUNTIME_MAP.
   *
   * When set, this is the canonical runtime component identifier used to
   * resolve the lazy React component that renders this field at runtime.
   * When omitted, the dispatcher falls back to the `widgetType` (or `type`)
   * produced by `createField`. New widgets should set this explicitly so the
   * FieldDefinition is fully self-describing — palette + factory + settings +
   * runtime component all live in one place.
   */
  runtimeComponentId?: string;
  /**
   * Mark this widget as temporarily unavailable in the Form Studio palette.
   *
   * When truthy (boolean true or a reason string), the widget is hidden from
   * all palette tabs — users cannot add it to new forms. The definition
   * stays in FIELD_REGISTRY so saved forms using the widgetType still render
   * (via the dispatcher's `<Input>` fallback if no runtime component exists).
   *
   * Use a string to document WHY it's unavailable (e.g. 'Runtime component
   * not yet implemented'). The string is shown in dev tooling but not in the
   * palette (the widget is simply hidden).
   */
  unavailable?: boolean | string;
}

export type RuntimeComponentMap = Record<string, React.LazyExoticComponent<React.ComponentType<unknown>>>;
export type IconResolver = (name: string) => LucideIcon;
