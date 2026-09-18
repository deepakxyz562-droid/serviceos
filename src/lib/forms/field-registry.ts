/**
 * Unified Field Registry — single source of truth for every form element.
 *
 * Each entry produces:
 *   1. A palette entry (icon, name, description, badge)
 *   2. A FormField factory (createField)
 *   3. A schema-driven settings UI (settingsSchema) — NO per-widget if/else
 *   4. A runtime component (resolved lazily by the WidgetRuntimeDispatcher)
 *
 * Adding a new widget = adding one FieldDefinition entry + one runtime component.
 * The builder, inspector, palette, and runtime never need editing.
 */
import type { FieldDefinition } from './field-settings-types';
import { PHASE_1_WIDGETS } from './phase-1-widgets';
import { PHASE_2_WIDGETS } from './phase-2-widgets';
import { PHASE_3_WIDGETS } from './phase-3-widgets';
import { PHASE_4_WIDGETS } from './phase-4-widgets';

export { PHASE_1_WIDGETS, PHASE_2_WIDGETS, PHASE_3_WIDGETS, PHASE_4_WIDGETS };

// ─── Basic Text & Choice Fields ─────────────────────────────────────────────

export const BASIC_FIELDS: FieldDefinition[] = [
  {
    id: 'short_text',
    name: 'Short Text',
    category: 'basic',
    iconName: 'Type',
    description: 'Single line text input',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'Short Text') => ({
      label,
      type: 'short_answer',
      placeholder: 'Enter text...',
      required: false,
    }),
    settingsSchema: [
      { key: 'maxLength', label: 'Max characters', type: 'number', group: 'field_specific', default: 0, min: 0, helpText: '0 = unlimited' },
      { key: 'validation', label: 'Validation rule', type: 'select', group: 'field_specific', options: [
        { label: 'None', value: 'none' }, { label: 'Email', value: 'email' }, { label: 'URL', value: 'url' },
        { label: 'Alphanumeric', value: 'alphanumeric' }, { label: 'Letters only', value: 'alpha' },
      ] },
      { key: 'mask', label: 'Input mask (e.g. AAA-999)', type: 'text', group: 'field_specific' },
    ],
  },
  {
    id: 'long_text',
    name: 'Long Text',
    category: 'basic',
    iconName: 'AlignLeft',
    description: 'Multi-line paragraph text',
    tier: 'free',
    createField: (label = 'Long Text') => ({
      label, type: 'long_answer', placeholder: 'Enter detailed response...', required: false,
    }),
    settingsSchema: [
      { key: 'rows', label: 'Visible rows', type: 'number', group: 'field_specific', default: 4, min: 2, max: 20 },
      { key: 'maxLength', label: 'Max characters', type: 'number', group: 'field_specific', default: 0 },
      { key: 'showCounter', label: 'Show character counter', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },
  {
    id: 'number',
    name: 'Number',
    category: 'basic',
    iconName: 'Hash',
    description: 'Numeric values',
    tier: 'free',
    createField: (label = 'Number') => ({
      label, type: 'numerical', placeholder: '0', required: false,
    }),
    settingsSchema: [
      { key: 'min', label: 'Min value', type: 'number', group: 'field_specific' },
      { key: 'max', label: 'Max value', type: 'number', group: 'field_specific' },
      { key: 'step', label: 'Step', type: 'number', group: 'field_specific', default: 1, step: 0.01 },
      { key: 'decimals', label: 'Decimal places', type: 'number', group: 'field_specific', default: 0, min: 0, max: 6 },
      { key: 'thousandsSep', label: 'Thousands separator', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },
  {
    id: 'dropdown',
    name: 'Dropdown',
    category: 'choice',
    iconName: 'ChevronDown',
    description: 'Select one from list',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'Dropdown') => ({
      label, type: 'dropdown', options: ['Option 1', 'Option 2', 'Option 3'], required: false,
    }),
    settingsSchema: [
      { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
      { key: 'defaultValue', label: 'Default Value', type: 'select', group: 'field_specific', options: [], helpText: 'Choose an option to be selected by default.' },
      { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
      { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
      { key: 'multiSelect', label: 'Allow multi-select', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users select more than one option.' },
      { key: 'searchEnabled', label: 'Enable search', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Add a search box for long option lists.' },
      { key: 'randomize', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle options on each form load (great for surveys).' },
      { key: 'useCalculationValues', label: 'Calculation Values', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Add values to be used in calculations.' },
      { key: 'showEmptyText', label: 'Show Text in Empty Option', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Use text instead of the empty option. Treated as an empty answer.' },
    ],
  },
  {
    id: 'single_choice',
    name: 'Single Choice (Radio)',
    category: 'choice',
    iconName: 'CircleDot',
    description: 'Radio button options',
    tier: 'free',
    createField: (label = 'Single Choice') => ({
      label, type: 'radio', options: ['Choice A', 'Choice B', 'Choice C'], required: false,
    }),
    settingsSchema: [
      { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
      { key: 'defaultValue', label: 'Default Value', type: 'select', group: 'field_specific', options: [], helpText: 'Choose an option to be selected by default.' },
      { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
      { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
      { key: 'columns', label: 'Spread', type: 'segmented', group: 'field_specific', default: '1', options: [
        { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: 'Inline', value: 'inline' },
      ], helpText: 'How options are laid out visually.' },
      // ─── Surveying tab (JotForm 4th tab for choice fields) ──────────────────────
      { key: 'useCalculationValues', label: 'Calculation Values', type: 'toggle_with_description', group: 'survey', default: false, description: 'Assign calculation values to each option for use in formulas.' },
      { key: 'randomize', label: 'Randomize Option Order', type: 'toggle_with_description', group: 'survey', default: false, description: 'Shuffle options on each form load to reduce order bias.' },
      { key: 'allowNone', label: 'Allow "None of the above"', type: 'toggle_with_description', group: 'survey', default: false, description: 'Add a "None of the above" option that deselects all others.' },
    ],
  },
  {
    id: 'multiple_choice',
    name: 'Multiple Choice (Checkbox)',
    category: 'choice',
    iconName: 'CheckSquare',
    description: 'Multi-select checkboxes',
    tier: 'free',
    createField: (label = 'Multiple Choice') => ({
      label, type: 'checkbox', options: ['Item 1', 'Item 2', 'Item 3'], required: false,
    }),
    settingsSchema: [
      { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
      { key: 'defaultValue', label: 'Default Value', type: 'select', group: 'field_specific', options: [], helpText: 'Choose an option to be selected by default.' },
      { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
      { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
      { key: 'minSelect', label: 'Min selections', type: 'number', group: 'field_specific', default: 0, min: 0, helpText: 'Minimum number of options the user must select.' },
      { key: 'maxSelect', label: 'Max selections (0 = unlimited)', type: 'number', group: 'field_specific', default: 0 },
      { key: 'columns', label: 'Spread', type: 'segmented', group: 'field_specific', default: '1', options: [
        { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: 'Inline', value: 'inline' },
      ], helpText: 'How options are laid out visually.' },
      // ─── Surveying tab (JotForm 4th tab for choice fields) ──────────────────────
      { key: 'useCalculationValues', label: 'Calculation Values', type: 'toggle_with_description', group: 'survey', default: false, description: 'Assign calculation values to each option for use in formulas.' },
      { key: 'randomize', label: 'Randomize Option Order', type: 'toggle_with_description', group: 'survey', default: false, description: 'Shuffle options on each form load to reduce order bias.' },
      { key: 'allowNone', label: 'Allow "None of the above"', type: 'toggle_with_description', group: 'survey', default: false, description: 'Add a "None of the above" option that deselects all others.' },
    ],
  },
  {
    id: 'email',
    name: 'Email Address',
    category: 'contact',
    iconName: 'Mail',
    description: 'Validated email input',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'Email Address') => ({
      label, type: 'email', placeholder: 'name@example.com', required: false,
    }),
    settingsSchema: [
      { key: 'confirmation', label: 'Require confirmation (re-enter)', type: 'toggle_with_description', group: 'field_specific', default: false },
      { key: 'blockFreeDomains', label: 'Block free domains (gmail/yahoo)', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },
  {
    id: 'phone',
    name: 'Phone Number',
    category: 'contact',
    iconName: 'Phone',
    description: 'International phone input',
    tier: 'free',
    createField: (label = 'Phone Number') => ({
      label, type: 'phone', placeholder: '+1 (555) 000-0000', required: false,
    }),
    settingsSchema: [
      // ─── General Tab sublabels ──────────────────────────────────────────
      { key: 'sublabel', label: 'Sublabel', type: 'text', group: 'general', default: 'Please enter a valid phone number.', helpText: 'Helper text displayed directly below the phone input.' },
      // ─── Options Tab (JotForm) ─────────────────────────────────────────
      { key: 'countryCodeDropdown', label: 'Country Code', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Display country selector dropdown with flags.' },
      { key: 'inputMask', label: 'Input Mask', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Force users to follow a specific phone pattern.' },
      { key: 'maskPattern', label: 'Mask Pattern', type: 'text', group: 'field_specific', default: '(###) ###-####', condition: { dependsOn: 'inputMask', equals: 'true' }, helpText: 'Use # for numbers, e.g. (###) ###-####' },
      { key: 'defaultCountry', label: 'Default Country', type: 'select', group: 'field_specific', default: 'US', options: [
        { label: 'United States (+1)', value: 'US' },
        { label: 'United Kingdom (+44)', value: 'GB' },
        { label: 'Canada (+1)', value: 'CA' },
        { label: 'India (+91)', value: 'IN' },
        { label: 'Australia (+61)', value: 'AU' },
        { label: 'Germany (+49)', value: 'DE' },
        { label: 'France (+33)', value: 'FR' },
      ], helpText: 'Default country selected when the form loads.' },
      { key: 'validateMobile', label: 'Validate as mobile only', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Block landline or VOIP numbers when possible.' },
    ],
  },
  {
    id: 'date_picker',
    name: 'Date Picker',
    category: 'datetime',
    iconName: 'Calendar',
    description: 'Calendar date selection',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'Date') => ({
      label, type: 'date', required: false,
    }),
    settingsSchema: [
      { key: 'format', label: 'Display format', type: 'select', group: 'field_specific', default: 'yyyy-mm-dd', options: [
        { label: 'YYYY-MM-DD', value: 'yyyy-mm-dd' }, { label: 'MM/DD/YYYY', value: 'mm/dd/yyyy' },
        { label: 'DD/MM/YYYY', value: 'dd/mm/yyyy' }, { label: 'DD MMM YYYY', value: 'dd-mmm-yyyy' },
      ] },
      { key: 'minDate', label: 'Min date', type: 'date', group: 'field_specific' },
      { key: 'maxDate', label: 'Max date', type: 'date', group: 'field_specific' },
      { key: 'defaultValue', label: 'Default Value', type: 'date', group: 'field_specific', helpText: 'Pre-fill the date with a specific value.' },
      { key: 'disableWeekends', label: 'Disable weekends', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent Saturday and Sunday selection.' },
      { key: 'defaultToday', label: 'Default to today', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Pre-fill the date with today\'s date.' },
      { key: 'disableSpecificDates', label: 'Disable Specific Dates', type: 'textarea', group: 'field_specific', placeholder: '2025-12-25\n2026-01-01', helpText: 'One date per line (YYYY-MM-DD). These dates will be disabled in the picker.' },
      { key: 'timezone', label: 'Time zone', type: 'select', group: 'field_specific', default: 'local', options: [
        { label: 'User\'s local timezone', value: 'local' }, { label: 'UTC', value: 'utc' },
      ] },
    ],
  },
  {
    id: 'time_picker',
    name: 'Time Picker',
    category: 'datetime',
    iconName: 'Clock',
    description: 'Time-of-day selection',
    tier: 'free',
    createField: (label = 'Time') => ({ label, type: 'time', required: false }),
    settingsSchema: [
      { key: 'format', label: 'Format', type: 'select', group: 'field_specific', default: '24h', options: [
        { label: '24-hour', value: '24h' }, { label: '12-hour (AM/PM)', value: '12h' },
      ] },
      { key: 'step', label: 'Step (minutes)', type: 'number', group: 'field_specific', default: 15, min: 1, max: 60 },
      { key: 'min', label: 'Earliest time', type: 'text', group: 'field_specific', placeholder: '09:00' },
      { key: 'max', label: 'Latest time', type: 'text', group: 'field_specific', placeholder: '17:00' },
    ],
  },
  {
    id: 'star_rating',
    name: 'Star Rating',
    category: 'survey',
    iconName: 'Star',
    description: '5-star customer rating',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'Rating') => ({
      label, type: 'rating', widgetType: 'star_rating',
      widgetConfig: { maxStars: 5 }, required: false,
    }),
    settingsSchema: [
      { key: 'maxStars', label: 'Max stars', type: 'number', group: 'field_specific', default: 5, min: 3, max: 10 },
      { key: 'defaultValue', label: 'Default Value', type: 'number', group: 'field_specific', default: 0, min: 0, max: 5, helpText: 'Pre-select a number of stars (0 = no default).' },
      { key: 'requireCommentOnLowRating', label: 'Require comment on low rating', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Force users to leave a comment when rating below threshold.' },
      { key: 'threshold', label: 'Threshold', type: 'number', group: 'field_specific', default: 3, condition: { dependsOn: 'requireCommentOnLowRating', equals: 'true' } },
    ],
  },
  {
    id: 'scale_rating',
    name: 'Scale Rating (NPS)',
    category: 'survey',
    iconName: 'SlidersHorizontal',
    description: 'Opinion scale from 0 to 10',
    tier: 'free',
    createField: (label = 'Scale') => ({
      label, type: 'rating', widgetType: 'scale_rating',
      widgetConfig: { min: 0, max: 10, minLabel: 'Not likely', maxLabel: 'Very likely' }, required: false,
    }),
    settingsSchema: [
      { key: 'min', label: 'Min value', type: 'number', group: 'field_specific', default: 0 },
      { key: 'max', label: 'Max value', type: 'number', group: 'field_specific', default: 10 },
      { key: 'minLabel', label: 'Min label', type: 'text', group: 'field_specific', default: 'Not likely' },
      { key: 'maxLabel', label: 'Max label', type: 'text', group: 'field_specific', default: 'Very likely' },
    ],
  },
  {
    id: 'file_upload',
    name: 'File Upload',
    category: 'file',
    iconName: 'Paperclip',
    description: 'Customer photos and documents',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'File Upload') => ({
      label, type: 'file', required: false,
    }),
    settingsSchema: [
      { key: 'maxFiles', label: 'Max files', type: 'number', group: 'field_specific', default: 5, min: 1, max: 50 },
      { key: 'maxFileSizeMb', label: 'Max file size (MB)', type: 'number', group: 'field_specific', default: 10, min: 1, max: 100 },
      { key: 'allowedFileTypes', label: 'Allowed File Types', type: 'multi_checkbox', group: 'field_specific',
        default: ['PDF', 'JPG', 'PNG', 'DOCX'],
        options: [
          { label: 'PDF', value: 'PDF' }, { label: 'JPG', value: 'JPG' },
          { label: 'PNG', value: 'PNG' }, { label: 'DOCX', value: 'DOCX' },
          { label: 'XLSX', value: 'XLSX' }, { label: 'CSV', value: 'CSV' },
          { label: 'TXT', value: 'TXT' }, { label: 'ZIP', value: 'ZIP' },
        ],
        helpText: 'Choose which file types respondents can upload.',
      },
      { key: 'captureMode', label: 'Capture mode', type: 'segmented', group: 'field_specific', default: 'both', options: [
        { label: 'Both', value: 'both' }, { label: 'Camera', value: 'camera' }, { label: 'Upload', value: 'upload' },
      ] },
    ],
  },
  {
    id: 'heading',
    name: 'Section Heading',
    category: 'layout',
    iconName: 'Heading',
    description: 'Bold heading text to label sections',
    tier: 'free',
    createField: (label = 'Section Heading') => ({ label, type: 'heading' }),
    settingsSchema: [
      { key: 'level', label: 'Heading level', type: 'select', group: 'field_specific', default: 'h3', options: [
        { label: 'H1', value: 'h1' }, { label: 'H2', value: 'h2' }, { label: 'H3', value: 'h3' }, { label: 'H4', value: 'h4' },
      ] },
      { key: 'align', label: 'Alignment', type: 'select', group: 'field_specific', default: 'left', options: [
        { label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' },
      ] },
    ],
  },
  {
    id: 'paragraph',
    name: 'Paragraph Block',
    category: 'layout',
    iconName: 'FileText',
    description: 'Static text/description shown to user',
    tier: 'free',
    createField: (label = 'Paragraph') => ({ label: '', type: 'paragraph', widgetConfig: { text: 'Add your descriptive text here...' } }),
    settingsSchema: [
      { key: 'text', label: 'Paragraph text', type: 'textarea', group: 'field_specific' },
      { key: 'allowHTML', label: 'Allow HTML', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },
  {
    id: 'divider',
    name: 'Horizontal Divider',
    category: 'layout',
    iconName: 'Minus',
    description: 'Visual separator line',
    tier: 'free',
    createField: () => ({ label: '', type: 'paragraph', widgetType: 'divider' }),
    settingsSchema: [
      { key: 'style', label: 'Style', type: 'select', group: 'field_specific', default: 'solid', options: [
        { label: 'Solid', value: 'solid' }, { label: 'Dashed', value: 'dashed' }, { label: 'Dotted', value: 'dotted' },
      ] },
      { key: 'thickness', label: 'Thickness (px)', type: 'number', group: 'field_specific', default: 1, min: 1, max: 5 },
    ],
  },
  {
    id: 'hidden',
    name: 'Hidden Parameter',
    category: 'layout',
    iconName: 'EyeOff',
    description: 'UTM source, referrer, or lead tag',
    tier: 'free',
    createField: (label = 'Hidden Field') => ({ label, type: 'short_answer', widgetType: 'hidden', required: false }),
    settingsSchema: [
      { key: 'autoCapture', label: 'Auto-capture', type: 'select', group: 'field_specific', default: 'none', options: [
        { label: 'None', value: 'none' }, { label: 'UTM source', value: 'utm_source' }, { label: 'UTM medium', value: 'utm_medium' },
        { label: 'UTM campaign', value: 'utm_campaign' }, { label: 'Referrer URL', value: 'referrer' },
        { label: 'User IP', value: 'ip' }, { label: 'User Agent', value: 'user_agent' },
      ] },
      { key: 'staticValue', label: 'Static value (if no auto-capture)', type: 'text', group: 'field_specific' },
    ],
  },
  {
    id: 'signature',
    name: 'E-Signature',
    category: 'signature',
    iconName: 'PenTool',
    description: 'Sign on screen with finger/mouse',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'Signature') => ({
      label, type: 'signature', widgetType: 'e_signature',
      widgetConfig: { penColor: '#0f172a', backgroundColor: '#ffffff', clearable: true }, required: false,
    }),
    settingsSchema: [
      { key: 'penColor', label: 'Pen color', type: 'color', group: 'field_specific', default: '#0f172a' },
      { key: 'backgroundColor', label: 'Background color', type: 'color', group: 'field_specific', default: '#ffffff' },
      { key: 'width', label: 'Width (px)', type: 'number', group: 'field_specific', default: 400 },
      { key: 'height', label: 'Height (px)', type: 'number', group: 'field_specific', default: 150 },
      { key: 'clearable', label: 'Allow clear', type: 'toggle_with_description', group: 'field_specific', default: true },
      { key: 'legalText', label: 'Legal text shown under signature', type: 'textarea', group: 'field_specific', default: 'By signing above, I agree to the terms and conditions.' },
    ],
  },
  {
    id: 'address',
    name: 'Address',
    category: 'contact',
    iconName: 'MapPin',
    description: 'International address with country/state',
    tier: 'free',
    createField: (label = 'Address') => ({ label, type: 'address', required: false }),
    settingsSchema: [
      { key: 'countryDefault', label: 'Default country', type: 'text', group: 'field_specific', default: 'US' },
      { key: 'stateMode', label: 'State field type', type: 'select', group: 'field_specific', default: 'dropdown', options: [
        { label: 'Dropdown', value: 'dropdown' }, { label: 'Free text', value: 'text' },
      ] },
      { key: 'includeLatLon', label: 'Capture lat/long', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },
];

// ─── Specialized Widgets (existing — migrated to unified registry) ─────────

export const WIDGET_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    id: 'image_upload_with_notes',
    name: 'Image Upload with Notes',
    category: 'media',
    iconName: 'ImagePlus',
    description: 'Upload photos with caption/notes per file',
    badge: 'POPULAR',
    tier: 'pro',
    createField: (label = 'Photos with Notes') => ({
      label, type: 'short_answer', widgetType: 'image_upload_with_notes',
      widgetConfig: {
        maxFiles: 10, requireNotes: true, maxFileSizeMb: 10,
        noteFieldTitle: 'Note', notePlaceholder: 'Add a note',
        limitPhotos: true, minPhotos: 1, maxPhotos: 10,
        allowedImageTypes: ['JPG', 'PNG', 'HEIC', 'WebP'],
      },
      required: false,
    }),
    settingsSchema: [
      // ─── Note Section (JotForm exact match) ─────────────────────────────────
      {
        key: 'noteFieldTitle', label: 'Note Field Title', type: 'text', group: 'field_specific',
        default: 'Note', helpText: 'Text shown above the note input for each photo.',
      },
      {
        key: 'notePlaceholder', label: 'Note Placeholder', type: 'text', group: 'field_specific',
        default: 'Add a note', helpText: 'Placeholder text shown inside an empty note box.',
      },
      {
        key: 'requireNotes', label: 'Require Note for Each Photo', type: 'toggle_with_description',
        group: 'field_specific', default: true,
        description: 'Make the note field mandatory for every uploaded photo.',
      },
      // ─── Photo Limits Section (JotForm exact match) ──────────────────────────
      {
        key: 'limitPhotos', label: 'Limit Number of Photos', type: 'toggle_with_description',
        group: 'field_specific', default: true,
        description: 'Turn minimum and maximum photo-count validation on or off.',
      },
      {
        key: 'minPhotos', label: 'Minimum Photos', type: 'number', group: 'field_specific',
        default: 1, min: 1, max: 50,
        helpText: 'Minimum number of photos accepted when the photo limit is enabled.',
        condition: { dependsOn: 'limitPhotos', equals: 'true' },
      },
      {
        key: 'maxPhotos', label: 'Maximum Photos', type: 'number', group: 'field_specific',
        default: 10, min: 1, max: 50,
        helpText: 'Maximum number of photos accepted when the photo limit is enabled.',
        condition: { dependsOn: 'limitPhotos', equals: 'true' },
      },
      // ─── Allowed Image Types (JotForm multi-checkbox) ────────────────────────
      {
        key: 'allowedImageTypes', label: 'Allowed Image Types', type: 'multi_checkbox',
        group: 'field_specific',
        default: ['JPG', 'PNG', 'HEIC', 'WebP'],
        options: [
          { label: 'JPG', value: 'JPG' },
          { label: 'PNG', value: 'PNG' },
          { label: 'HEIC', value: 'HEIC' },
          { label: 'WebP', value: 'WebP' },
        ],
        helpText: 'Choose which image file types respondents can upload.',
      },
      // ─── File Size Limit (legacy — kept for completeness) ────────────────────
      {
        key: 'maxFileSizeMb', label: 'Max file size (MB)', type: 'number', group: 'field_specific',
        default: 10, min: 1, max: 50,
      },
    ],
  },
  {
    id: 'nearest_location_finder',
    name: 'Nearest Location Finder',
    category: 'maps',
    iconName: 'Navigation',
    description: 'Auto-detects closest branch or depot',
    badge: 'POPULAR',
    tier: 'pro',
    backendHandler: 'maps',
    runtimeComponentId: 'nearest_location_finder',
    createField: (label = 'Nearest Location') => ({
      label, type: 'short_answer', widgetType: 'nearest_location_finder',
      widgetConfig: { provider: 'managed', distanceUnit: 'miles', maxResults: 3, autoGps: true }, required: false,
    }),
    settingsSchema: [
      { key: 'provider', label: 'Map provider', type: 'segmented', group: 'field_specific', default: 'managed', options: [
        { label: '🚀 Managed', value: 'managed' }, { label: 'OSM (free)', value: 'osm' }, { label: 'BYOK', value: 'byok' },
      ] },
      { key: 'distanceUnit', label: 'Distance unit', type: 'segmented', group: 'field_specific', default: 'miles', options: [
        { label: 'Miles', value: 'miles' }, { label: 'Km', value: 'km' },
      ] },
      { key: 'maxResults', label: 'Max Locations Shown', type: 'number', group: 'field_specific', default: 3, min: 1, max: 10 },
      { key: 'autoGps', label: 'Auto-detect GPS', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Automatically locate user on form load.' },
      { key: 'branches', label: 'Locations (one per line: name, address or JSON array)', type: 'textarea', group: 'field_specific', placeholder: 'Downtown Service Hub, 100 Main St, New York, NY 10001\nWestside Depot, 450 10th Ave, New York, NY 10018', helpText: 'Enter each branch on a new line: Name, Address. Or paste a JSON array of [{name, address, lat, lng}].' },
    ],
  },
  {
    id: 'route_planner_map',
    name: 'Route Planner Map',
    category: 'maps',
    iconName: 'Map',
    description: 'Plan multi-stop routes before submission.',
    badge: 'POPULAR',
    tier: 'pro',
    backendHandler: 'maps',
    createField: (label = 'Route Planner') => ({
      label, type: 'short_answer', widgetType: 'route_planner_map',
      widgetConfig: {
        mapProvider: 'osm',
        defaultTravelMode: 'driving',
        allowAdditionalStops: true,
        distanceUnits: 'automatic',
        startLocationLabel: 'Start location',
        endLocationLabel: 'End location',
        showRouteSummary: true,
        noRouteMessage: 'No route could be found for those locations.',
        addressPlaceholder: 'Street address, city or ZIP',
        travelMode: 'driving',
        unit: 'miles',
        frameWidth: 768,
        frameHeight: 500,
        widthPx: 768,
        heightPx: 500,
      },
      required: false,
    }),
    settingsSchema: [
      {
        key: 'mapProvider',
        label: 'Map Provider',
        type: 'select',
        group: 'field_specific',
        default: 'osm',
        options: [
          { label: 'OpenStreetMap (no key)', value: 'osm' },
          { label: 'Google Maps', value: 'google' },
        ],
        helpText: 'Choose the routing provider. OpenStreetMap is free with no key; Google Maps needs your own billed API key.',
      },
      {
        key: 'googleApiKey',
        label: 'Google Maps API Key',
        type: 'text',
        group: 'field_specific',
        condition: { dependsOn: 'mapProvider', equals: 'google' },
        placeholder: 'AIzaSy...',
        helpText: 'Required when using Google Maps provider.',
      },
      {
        key: 'defaultTravelMode',
        label: 'Default Travel Mode',
        type: 'segmented',
        group: 'field_specific',
        default: 'driving',
        options: [
          { label: 'Driving', value: 'driving' },
          { label: 'Walking', value: 'walking' },
          { label: 'Bicycling', value: 'bicycling' },
          { label: 'Motorcycle', value: 'motorcycle' },
          { label: 'Transit', value: 'transit' },
        ],
        helpText: 'Choose how routes are calculated by default. OSM supports driving, walking, and bicycling; motorcycle and transit require Google Maps.',
      },
      {
        key: 'allowAdditionalStops',
        label: 'Allow Additional Stops',
        type: 'toggle_with_description',
        group: 'field_specific',
        default: true,
        description: 'Let respondents add extra stops between the start and end locations.',
      },
      {
        key: 'distanceUnits',
        label: 'Distance Units',
        type: 'segmented',
        group: 'field_specific',
        default: 'automatic',
        options: [
          { label: 'Automatic', value: 'automatic' },
          { label: 'Kilometers', value: 'km' },
          { label: 'Miles', value: 'miles' },
        ],
        helpText: 'Control how distance is shown in the summary: automatic, kilometers, or miles.',
      },
      {
        key: 'startLocationLabel',
        label: 'Start Location Label',
        type: 'text',
        group: 'field_specific',
        default: 'Start location',
        placeholder: 'Start location',
        helpText: 'Text shown for the field where respondents enter the starting location.',
      },
      {
        key: 'endLocationLabel',
        label: 'End Location Label',
        type: 'text',
        group: 'field_specific',
        default: 'End location',
        placeholder: 'End location',
        helpText: 'Text shown for the field where respondents enter the destination.',
      },
      {
        key: 'showRouteSummary',
        label: 'Show Route Summary',
        type: 'toggle_with_description',
        group: 'field_specific',
        default: true,
        description: 'Display distance and estimated travel time below the map for respondents.',
      },
      {
        key: 'noRouteMessage',
        label: 'No Route Message',
        type: 'text',
        group: 'field_specific',
        default: 'No route could be found for those locations.',
        placeholder: 'No route could be found for those locations.',
        helpText: 'Custom message shown when no route can be found for the entered locations.',
      },
      {
        key: 'addressPlaceholder',
        label: 'Address Placeholder',
        type: 'text',
        group: 'field_specific',
        default: 'Street address, city or ZIP',
        placeholder: 'Street address, city or ZIP',
        helpText: 'Placeholder shown in the start, stop, and end location fields.',
      },
    ],
  },
  {
    id: 'service_area_checker',
    name: 'Service Area Checker',
    category: 'maps',
    iconName: 'ShieldCheck',
    description: 'Validates postal code against service radius',
    badge: 'NEW',
    tier: 'pro',
    backendHandler: 'maps',
    createField: (label = 'Service Area Checker') => ({
      label, type: 'short_answer', widgetType: 'service_area_checker',
      widgetConfig: {
        serviceCenterAddress: '',
        addressPlaceholder: 'Street, city, postal code',
        serviceRadius: 30,
        distanceUnit: 'miles',
        outsideAreaMessage: 'We cannot serve this address. Please enter another address or contact us for help.',
        showDistanceToRespondent: true,
      }, required: false,
    }),
    settingsSchema: [
      {
        key: 'serviceCenterAddress',
        label: 'Service Center Address',
        type: 'text',
        group: 'field_specific',
        placeholder: 'e.g. 100 Main St, Chicago, IL',
        helpText: 'Main address used as the center of the service area.',
      },
      {
        key: 'addressPlaceholder',
        label: 'Address Placeholder',
        type: 'text',
        group: 'field_specific',
        default: 'Street, city, postal code',
        helpText: 'Placeholder shown in the respondent address field.',
      },
      {
        key: 'serviceRadius',
        label: 'Service Radius',
        type: 'range',
        group: 'field_specific',
        default: 30,
        min: 1,
        max: 1000,
        step: 1,
        helpText: 'Maximum distance allowed from the service center.',
      },
      {
        key: 'distanceUnit',
        label: 'Distance Unit',
        type: 'select',
        group: 'field_specific',
        default: 'miles',
        options: [
          { label: 'Miles', value: 'miles' },
          { label: 'Kilometers', value: 'kilometers' },
        ],
        helpText: 'Unit used for the radius threshold and displayed distance.',
      },
      {
        key: 'outsideAreaMessage',
        label: 'Outside Service Area Message',
        type: 'textarea',
        group: 'field_specific',
        default: 'We cannot serve this address. Please enter another address or contact us for help.',
        helpText: 'Message shown when the address cannot be accepted.',
      },
      {
        key: 'showDistanceToRespondent',
        label: 'Show Distance to Respondent',
        type: 'toggle_with_description',
        group: 'field_specific',
        default: true,
        description: 'Show the measured distance after the address is checked.',
      },
    ],
  },
  {
    id: 'form_calculation',
    name: 'Form Calculation',
    category: 'calculation',
    iconName: 'Calculator',
    description: 'Visual math formula builder with field tokens',
    badge: 'POPULAR',
    tier: 'pro',
    createField: (label = 'Calculation') => ({
      label, type: 'short_answer', widgetType: 'form_calculation',
      widgetConfig: { formula: '', decimalPlaces: 2, resultPrefix: '$', resultSuffix: '', hidden: false }, required: false,
    }),
    settingsSchema: [
      { key: 'formula', label: 'Formula', type: 'formula_editor', group: 'field_specific', helpText: 'Use {{field_id}} tokens for field values. e.g. {{qty}} * {{price}}' },
      { key: 'decimalPlaces', label: 'Decimal places', type: 'number', group: 'field_specific', default: 2, min: 0, max: 6 },
      { key: 'resultPrefix', label: 'Prefix (e.g. $)', type: 'text', group: 'field_specific', default: '$' },
      { key: 'resultSuffix', label: 'Suffix (e.g. USD)', type: 'text', group: 'field_specific' },
      { key: 'hidden', label: 'Hidden (calculated, not shown to user)', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },
  {
    id: 'currency_amount_input',
    name: 'Currency Amount Input',
    category: 'calculation',
    iconName: 'DollarSign',
    description: 'Masked financial input with currency symbol',
    badge: 'POPULAR',
    tier: 'pro',
    createField: (label = 'Amount') => ({
      label, type: 'numerical', widgetType: 'currency_amount_input',
      widgetConfig: { currencySymbol: '$', currencyCode: 'USD', decimals: 2 }, required: false,
    }),
    settingsSchema: [
      { key: 'currencySymbol', label: 'Currency symbol', type: 'text', group: 'field_specific', default: '$' },
      { key: 'currencyCode', label: 'ISO currency code', type: 'text', group: 'field_specific', default: 'USD' },
      { key: 'decimals', label: 'Decimal places', type: 'number', group: 'field_specific', default: 2, min: 0, max: 4 },
      { key: 'min', label: 'Min value', type: 'number', group: 'field_specific', default: 0 },
      { key: 'max', label: 'Max value', type: 'number', group: 'field_specific', default: 1000000 },
    ],
  },
  {
    id: 'sms_otp_verification',
    name: 'SMS OTP Confirmation',
    category: 'security',
    iconName: 'Smartphone',
    description: '6-digit SMS verification code',
    badge: 'POPULAR',
    tier: 'business',
    backendHandler: 'otp_sms',
    createField: (label = 'SMS Verification') => ({
      label, type: 'short_answer', widgetType: 'sms_otp_verification',
      widgetConfig: { provider: 'managed', codeLength: 6, expiryMinutes: 10 }, required: true,
    }),
    settingsSchema: [
      { key: 'provider', label: 'Provider', type: 'select', group: 'field_specific', default: 'managed', options: [
        { label: '🚀 Fieseros Managed (1-click)', value: 'managed' }, { label: 'Twilio (BYOK)', value: 'twilio' },
      ] },
      { key: 'codeLength', label: 'Code length', type: 'number', group: 'field_specific', default: 6, min: 4, max: 8 },
      { key: 'expiryMinutes', label: 'Expiry (minutes)', type: 'number', group: 'field_specific', default: 10, min: 1, max: 60 },
    ],
  },
  {
    id: 'cloudflare_turnstile',
    name: 'Cloudflare Turnstile',
    category: 'security',
    iconName: 'ShieldAlert',
    description: 'Invisible bot protection',
    badge: 'POPULAR',
    tier: 'free',
    createField: (label = 'Bot Protection') => ({
      label: '', type: 'short_answer', widgetType: 'cloudflare_turnstile',
      widgetConfig: { theme: 'auto', size: 'flexible' }, required: false,
    }),
    settingsSchema: [
      { key: 'theme', label: 'Theme', type: 'segmented', group: 'field_specific', default: 'auto', options: [
        { label: 'Auto', value: 'auto' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' },
      ] },
      { key: 'size', label: 'Size', type: 'segmented', group: 'field_specific', default: 'flexible', options: [
        { label: 'Flexible', value: 'flexible' }, { label: 'Compact', value: 'compact' }, { label: 'Normal', value: 'normal' },
      ] },
    ],
  },
  {
    id: 'voice_recorder',
    name: 'Voice Recorder',
    category: 'media',
    iconName: 'Mic',
    description: 'Records audio voice notes in browser',
    tier: 'pro',
    createField: (label = 'Voice Note') => ({
      label, type: 'short_answer', widgetType: 'voice_recorder',
      widgetConfig: { maxDurationSeconds: 180, format: 'audio/webm' }, required: false,
    }),
    settingsSchema: [
      { key: 'maxDurationSeconds', label: 'Max duration (seconds)', type: 'number', group: 'field_specific', default: 180, min: 5, max: 600 },
      { key: 'format', label: 'Audio format', type: 'segmented', group: 'field_specific', default: 'audio/webm', options: [
        { label: 'WebM (recommended)', value: 'audio/webm' }, { label: 'MP3', value: 'audio/mp3' },
      ] },
      { key: 'showPlayback', label: 'Show playback controls', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Show audio player after recording so respondents can review before submitting.' },
    ],
  },
  {
    id: 'configurable_list',
    name: 'Configurable List',
    category: 'productivity',
    iconName: 'ListOrdered',
    description: 'Dynamic repeater with custom columns',
    badge: 'POPULAR',
    tier: 'pro',
    createField: (label = 'Items List') => ({
      label, type: 'short_answer', widgetType: 'configurable_list',
      widgetConfig: {
        minRows: 1, maxRows: 20,
        columns: [
          { key: 'item', label: 'Item / Description' },
          { key: 'qty', label: 'Qty' },
          { key: 'price', label: 'Unit Price' },
        ],
      }, required: false,
    }),
    settingsSchema: [
      { key: 'minRows', label: 'Min rows', type: 'number', group: 'field_specific', default: 1, min: 0 },
      { key: 'maxRows', label: 'Max rows (0 = unlimited)', type: 'number', group: 'field_specific', default: 20 },
      { key: 'columns', label: 'Column configuration', type: 'json', group: 'field_specific', helpText: 'JSON array: [{key,label,type}]' },
    ],
  },

  // ─── Phase A1 — Migration stubs from legacy WIDGET_REGISTRY ─────────────────
  // The following entries are minimal FieldDefinitions for widgets that existed
  // in the old `widgets/widget-registry.ts` (now deleted) but were not yet
  // present in FIELD_REGISTRY. Each declares a `runtimeComponentId` so the
  // runtime dispatcher can resolve the lazy component by canonical key.
  // Saved forms using these widgetType IDs continue to render unchanged.
  // Future phases can expand `settingsSchema` per widget as needed.
  {
    id: 'address_map_locator',
    name: 'Address Map Locator',
    category: 'maps',
    iconName: 'MapPin',
    description: 'Interactive map with search, draggable marker, and zoom for pinpointing exact locations.',
    tier: 'pro',
    runtimeComponentId: 'address_map_locator',
    createField: (label = 'Address Map Locator') => ({
      label, type: 'short_answer', widgetType: 'address_map_locator',
      widgetConfig: {
        defaultLat: 40.7128,
        defaultLng: -74.006,
        defaultZoom: 13,
        draggableMarker: true,
        showSearch: true,
        showCoordinates: true,
        showGpsButton: true,
      }, required: false,
    }),
    settingsSchema: [
      { key: 'showSearch', label: 'Show Address Search', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Let respondents type an address to search instead of clicking the map.' },
      { key: 'draggableMarker', label: 'Draggable Marker', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Allow respondents to drag the pin for fine-tuning the location.' },
      { key: 'showCoordinates', label: 'Show Coordinate Inputs', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Show manual latitude/longitude input fields below the map.' },
      { key: 'showGpsButton', label: 'Show GPS Button', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Add a button to detect the respondent’s current location.' },
      { key: 'defaultLat', label: 'Default Latitude', type: 'number', group: 'field_specific', default: 40.7128, step: 0.000001, helpText: 'Initial map center latitude (e.g. 40.7128 for New York).' },
      { key: 'defaultLng', label: 'Default Longitude', type: 'number', group: 'field_specific', default: -74.006, step: 0.000001, helpText: 'Initial map center longitude (e.g. -74.006 for New York).' },
      { key: 'defaultZoom', label: 'Default Zoom Level', type: 'number', group: 'field_specific', default: 13, min: 1, max: 19, helpText: 'Initial zoom (1 = world, 13 = city, 19 = street).' },
    ],
  },
  {
    id: 'adobe_sign',
    name: 'Adobe Sign',
    category: 'signature',
    iconName: 'FileSignature',
    description: 'Legally binding enterprise e-signature workflow with complete audit trail.',
    badge: 'PRO',
    tier: 'business',
    runtimeComponentId: 'adobe_sign',
    createField: (label = 'Adobe Sign') => ({
      label, type: 'short_answer', widgetType: 'adobe_sign',
      widgetConfig: { requiresEnvelope: true }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'australia_bsb_checker',
    name: 'Australia BSB Number Checker',
    category: 'regional',
    iconName: 'Landmark',
    description: 'Formats 6-digit BSB (XXX-XXX) and validates against official APCA registry.',
    badge: 'NEW',
    tier: 'pro',
    runtimeComponentId: 'australia_bsb_checker',
    createField: (label = 'BSB Number') => ({
      label, type: 'short_answer', widgetType: 'australia_bsb_checker',
      widgetConfig: { autoFormat: true }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'color_picker',
    name: 'Color Picker',
    category: 'embed',
    iconName: 'Palette',
    description: 'Visual color swatch and palette selector returning HEX / RGB values.',
    tier: 'pro',
    // Runtime registry uses the suffixed key for this widget.
    runtimeComponentId: 'color_picker_widget',
    createField: (label = 'Color Picker') => ({
      label, type: 'short_answer', widgetType: 'color_picker',
      widgetConfig: { defaultColor: '#059669', format: 'hex' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'comparison_slider',
    name: 'Comparison Slider',
    category: 'embed',
    iconName: 'SlidersHorizontal',
    description: 'Before & After split image comparison slider with draggable dividing bar.',
    badge: 'NEW',
    tier: 'pro',
    runtimeComponentId: 'comparison_slider',
    createField: (label = 'Comparison Slider') => ({
      label, type: 'short_answer', widgetType: 'comparison_slider',
      widgetConfig: { beforeImageUrl: '', afterImageUrl: '', startPositionPct: 50 }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'digital_magazine_maker',
    name: 'Digital Magazine Maker',
    category: 'embed',
    iconName: 'BookOpen',
    description: 'Interactive flipbook viewer for product catalogs, brochures, and price guides.',
    badge: 'NEW',
    tier: 'business',
    runtimeComponentId: 'digital_magazine_maker',
    createField: (label = 'Digital Magazine') => ({
      label, type: 'short_answer', widgetType: 'digital_magazine_maker',
      widgetConfig: { flipbookUrl: '', autoPlay: false }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    category: 'signature',
    iconName: 'FileCheck',
    description: 'DocuSign envelope generation and sign-off integration.',
    badge: 'PRO',
    tier: 'business',
    runtimeComponentId: 'docusign',
    createField: (label = 'DocuSign') => ({
      label, type: 'short_answer', widgetType: 'docusign',
      widgetConfig: { templateId: '' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'draw_on_image',
    name: 'Draw on Image / Annotate',
    category: 'media',
    iconName: 'Edit3',
    description: 'Interactive canvas letting users draw/highlight damage or mark floorplans.',
    badge: 'NEW',
    tier: 'pro',
    runtimeComponentId: 'draw_on_image',
    createField: (label = 'Annotated Image') => ({
      label, type: 'short_answer', widgetType: 'draw_on_image',
      widgetConfig: {
        brushColors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'],
        defaultThickness: 3,
      }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'drawing_board',
    name: 'Drawing Board',
    category: 'media',
    iconName: 'PenTool',
    description: 'Blank whiteboard canvas for freehand sketches, diagrams, and formulas.',
    tier: 'pro',
    runtimeComponentId: 'drawing_board',
    createField: (label = 'Drawing Board') => ({
      label, type: 'short_answer', widgetType: 'drawing_board',
      widgetConfig: { canvasHeight: 300, backgroundColor: '#ffffff' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'driving_distance_calculator',
    name: 'Driving Distance Calculator',
    category: 'maps',
    iconName: 'Milestone',
    description: 'Calculates direct driving distance between origin and destination with dynamic rates.',
    tier: 'pro',
    backendHandler: 'maps',
    runtimeComponentId: 'driving_distance_calculator',
    createField: (label = 'Driving Distance') => ({
      label, type: 'short_answer', widgetType: 'driving_distance_calculator',
      widgetConfig: { provider: 'managed', ratePerMile: 2.5, unit: 'miles' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'france_region_map_picker',
    name: 'France Region Map Picker',
    category: 'regional',
    iconName: 'Map',
    description: 'Clickable interactive vector map of French regions and departments.',
    tier: 'pro',
    runtimeComponentId: 'france_region_map_picker',
    createField: (label = 'France Region') => ({
      label, type: 'short_answer', widgetType: 'france_region_map_picker',
      widgetConfig: { colorScheme: 'blue' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'google_analytics_4',
    name: 'Google Analytics 4 (GA4)',
    category: 'analytics',
    iconName: 'LineChart',
    description: 'Tracks form views, step abandonment, and conversion goals in GA4.',
    tier: 'free',
    // Runtime registry uses the suffixed key for this widget.
    runtimeComponentId: 'google_analytics_4_widget',
    createField: (label = 'GA4 Tracking') => ({
      label: '', type: 'short_answer', widgetType: 'google_analytics_4',
      widgetConfig: { measurementId: 'G-XXXXXXXXXX', eventName: 'form_submit', debug: false }, required: false,
    }),
    settingsSchema: [
      { key: 'measurementId', label: 'Google Analytics Measurement ID', type: 'text', group: 'field_specific', default: 'G-XXXXXXXXXX', placeholder: 'G-XXXXXXXXXX', helpText: 'Your GA4 data stream measurement ID.' },
      { key: 'eventName', label: 'Event Name on Submit', type: 'text', group: 'field_specific', default: 'form_submit', helpText: 'Custom event name sent to GA4 upon submission.' },
      { key: 'debug', label: 'Debug Mode', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Log GA4 event payloads to the browser console.' },
    ],
  },
  {
    id: 'image_scanner_ocr',
    name: 'Image Scanner (OCR)',
    category: 'media',
    iconName: 'ScanLine',
    description: 'Scans receipts, ID cards, or work orders, auto-populating form fields via AI OCR.',
    badge: 'AI',
    tier: 'business',
    backendHandler: 'ocr',
    runtimeComponentId: 'image_scanner_ocr',
    createField: (label = 'Image Scanner') => ({
      label, type: 'short_answer', widgetType: 'image_scanner_ocr',
      widgetConfig: { autoExtract: true, targetDocument: 'any' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'india_states_dropdown',
    name: 'India States Dropdown',
    category: 'regional',
    iconName: 'Building',
    description: 'Pre-populated 28 states and 8 union territories of India.',
    tier: 'free',
    runtimeComponentId: 'india_states_dropdown',
    createField: (label = 'India State') => ({
      label, type: 'short_answer', widgetType: 'india_states_dropdown',
      widgetConfig: { includeUnionTerritories: true }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'infinite_list',
    name: 'Infinite List',
    category: 'productivity',
    iconName: 'ListPlus',
    description: 'Multi-column repeating rows for dynamic list entries — add as many as you need.',
    tier: 'pro',
    runtimeComponentId: 'infinite_list',
    createField: (label = 'Infinite List') => ({
      label, type: 'short_answer', widgetType: 'infinite_list',
      widgetConfig: {
        columnNames: 'Item\nQuantity\nNotes',
        addButtonText: '+ Add Another',
        removeButtonText: 'Remove',
        showRowCount: true,
        placeholder: 'Enter value...',
      }, required: false,
    }),
    settingsSchema: [
      { key: 'columnNames', label: 'Column Names', type: 'textarea', group: 'field_specific', default: 'Item\nQuantity\nNotes', placeholder: 'Item\nQuantity\nNotes', helpText: 'One column name per line. Each line becomes a column in the repeating row.' },
      { key: 'addButtonText', label: 'Add Button Label', type: 'text', group: 'field_specific', default: '+ Add Another', placeholder: '+ Add Another' },
      { key: 'removeButtonText', label: 'Remove Button Label', type: 'text', group: 'field_specific', default: 'Remove', placeholder: 'Remove' },
      { key: 'showRowCount', label: 'Show Row Counter', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Display "X filled · Y total" below the list.' },
      { key: 'placeholder', label: 'Input Placeholder', type: 'text', group: 'field_specific', default: 'Enter value...', placeholder: 'Enter value...' },
    ],
  },
  {
    id: 'italian_codice_fiscale',
    name: 'Italian Codice Fiscale Validator',
    category: 'regional',
    iconName: 'FileCheck2',
    description: '16-character alphanumeric Italian tax code validation with check-character checksum.',
    badge: 'NEW',
    tier: 'pro',
    runtimeComponentId: 'italian_codice_fiscale',
    createField: (label = 'Codice Fiscale') => ({
      label, type: 'short_answer', widgetType: 'italian_codice_fiscale',
      widgetConfig: { uppercase: true }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'like_dislike_feedback',
    name: 'Like / Dislike Buttons',
    category: 'survey',
    iconName: 'ThumbsUp',
    description: 'Thumbs up / thumbs down binary sentiment voting with counter badges.',
    tier: 'free',
    // Runtime registry uses the shorter `like_dislike` key for this widget.
    runtimeComponentId: 'like_dislike',
    createField: (label = 'Like / Dislike') => ({
      label, type: 'short_answer', widgetType: 'like_dislike_feedback',
      widgetConfig: { showCounts: true, baseLikes: 0, baseDislikes: 0 }, required: false,
    }),
    settingsSchema: [
      { key: 'showCounts', label: 'Show Vote Counters', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Display count badges next to each button.' },
      { key: 'baseLikes', label: 'Initial Likes Count', type: 'number', group: 'field_specific', default: 0, description: 'Baseline positive votes shown.' },
      { key: 'baseDislikes', label: 'Initial Dislikes Count', type: 'number', group: 'field_specific', default: 0, description: 'Baseline negative votes shown.' },
    ],
  },
  {
    id: 'most_frequent_answer',
    name: 'Most Frequent Answer',
    category: 'analytics',
    iconName: 'TrendingUp',
    description: 'Live social proof displaying trending choices based on real-time form submissions.',
    badge: 'AI',
    tier: 'business',
    // Runtime component not yet implemented. Marked unavailable so users
    // cannot add it to new forms (it would render as a plain <Input>).
    // The definition stays in FIELD_REGISTRY so any saved forms using
    // this widgetType still render via the dispatcher's fallback.
    unavailable: 'Runtime component not yet implemented — coming soon.',
    runtimeComponentId: 'most_frequent_answer',
    createField: (label = 'Most Frequent Answer') => ({
      label: '', type: 'short_answer', widgetType: 'most_frequent_answer',
      widgetConfig: { linkedQuestionId: '', minResponsesThreshold: 5 }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'orderable_list',
    name: 'Orderable List',
    category: 'productivity',
    iconName: 'ArrowUpDown',
    description: 'Drag-and-drop ranking list to reorder preferences visually.',
    tier: 'pro',
    runtimeComponentId: 'orderable_list',
    createField: (label = 'Orderable List') => ({
      label, type: 'short_answer', widgetType: 'orderable_list',
      widgetConfig: { items: ['Quality', 'Speed of Service', 'Pricing', 'Communication'] }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'pdf_embedder',
    name: 'PDF Embedder',
    category: 'embed',
    iconName: 'FileCode',
    description: 'In-form PDF document viewer with zoom, full-screen, and pagination controls.',
    tier: 'pro',
    runtimeComponentId: 'pdf_embedder',
    createField: (label = 'PDF Embedder') => ({
      label: '', type: 'short_answer', widgetType: 'pdf_embedder',
      widgetConfig: { pdfUrl: '', heightPx: 500 }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'photo_watermark',
    name: 'Photo Watermark',
    category: 'media',
    iconName: 'Stamp',
    description: 'Auto-overlays timestamp, GPS coordinates, and business name onto uploaded photos.',
    badge: 'PRO',
    tier: 'business',
    runtimeComponentId: 'photo_watermark',
    createField: (label = 'Watermarked Photo') => ({
      label, type: 'short_answer', widgetType: 'photo_watermark',
      widgetConfig: { includeTimestamp: true, includeGps: true, watermarkPosition: 'bottom_right' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'speech_to_text',
    name: 'Speech to Text',
    category: 'media',
    iconName: 'MicVocal',
    description: 'Real-time speech transcription converting spoken words to filled text fields.',
    badge: 'AI',
    tier: 'pro',
    runtimeComponentId: 'speech_to_text',
    createField: (label = 'Speech to Text') => ({
      label, type: 'short_answer', widgetType: 'speech_to_text',
      widgetConfig: { continuous: false, language: 'en-US' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'spreadsheet_to_form',
    name: 'Spreadsheet to Form',
    category: 'calculation',
    iconName: 'FileSpreadsheet',
    description: 'Uploads Excel/CSV to auto-fill form answers matching a unique customer access code.',
    badge: 'PRO',
    tier: 'business',
    runtimeComponentId: 'spreadsheet_to_form',
    createField: (label = 'Spreadsheet Import') => ({
      label, type: 'short_answer', widgetType: 'spreadsheet_to_form',
      widgetConfig: { accessCodeField: 'code' }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'star_rating_with_comments',
    name: 'Star Rating with Comments',
    category: 'survey',
    iconName: 'Star',
    description: '5-star interactive rating coupled with immediate written review feedback.',
    tier: 'free',
    // Runtime registry uses the shorter `star_rating_comments` key for this widget.
    runtimeComponentId: 'star_rating_comments',
    createField: (label = 'Star Rating + Comments') => ({
      label, type: 'short_answer', widgetType: 'star_rating_with_comments',
      widgetConfig: { maxStars: 5, requireCommentOnLowRating: true, threshold: 3 }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'unique_id_generator',
    name: 'Unique ID Generator',
    category: 'productivity',
    iconName: 'Barcode',
    description: 'Generates sequential or prefix-coded submission IDs (INV-2026-0042).',
    tier: 'pro',
    runtimeComponentId: 'unique_id_generator',
    createField: (label = 'Unique ID') => ({
      label: '', type: 'short_answer', widgetType: 'unique_id_generator',
      widgetConfig: { prefix: 'REF-', startNumber: 1001, padding: 5 }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'us_state_picker',
    name: 'US State & Territory Picker',
    category: 'regional',
    iconName: 'Flag',
    description: '50 US states with two-letter postal abbreviations.',
    tier: 'free',
    runtimeComponentId: 'us_state_picker',
    createField: (label = 'US State') => ({
      label, type: 'short_answer', widgetType: 'us_state_picker',
      widgetConfig: { returnAbbreviation: true }, required: false,
    }),
    settingsSchema: [],
  },
  {
    id: 'youtube_video_embed',
    name: 'YouTube Video Embed',
    category: 'embed',
    iconName: 'Video',
    description: 'Embeds YouTube instructions or product demonstrations directly in the form.',
    tier: 'free',
    runtimeComponentId: 'youtube_video_embed',
    createField: (label = 'YouTube Video') => ({
      label: '', type: 'short_answer', widgetType: 'youtube_video_embed',
      widgetConfig: { videoUrl: '', autoPlay: false, controls: true }, required: false,
    }),
    settingsSchema: [],
  },
];

// ─── Registry Aggregation ───────────────────────────────────────────────────

/**
 * The complete unified registry: basic + specialized + Phase 1 + 2 + 3 + 4 widgets.
 */
export const FIELD_REGISTRY: FieldDefinition[] = [
  ...BASIC_FIELDS,
  ...WIDGET_FIELD_DEFINITIONS,
  ...PHASE_1_WIDGETS,
  ...PHASE_2_WIDGETS,
  ...PHASE_3_WIDGETS,
  ...PHASE_4_WIDGETS,
];

const FIELD_REGISTRY_MAP = new Map<string, FieldDefinition>(
  FIELD_REGISTRY.map((f) => [f.id, f]),
);

export const FIELD_ALIASES: Record<string, string> = {
  // Signature aliases
  e_signature: 'signature',
  signature_pad: 'signature',

  // Text & Numerical aliases
  short_answer: 'short_text',
  text: 'short_text',
  long_answer: 'long_text',
  textarea: 'long_text',
  numerical: 'number',
  currency_amount_input: 'number',

  // Choice aliases
  radio: 'single_choice',
  checkbox: 'multiple_choice',
  dynamic_dropdowns: 'dropdown',
  remote_data_dropdown: 'dropdown',
  inventory_dropdown: 'dropdown',

  // ─── Phase-1 *_widget aliases (legacy IDs → canonical runtime map keys) ──
  // These IDs exist as Phase-1 FieldDefinitions (so the builder shows their
  // rich settingsSchema), but the runtime WIDGET_RUNTIME_MAP only has the
  // non-suffixed canonical key. The dispatcher's resolveRuntimeComponent()
  // consults FIELD_ALIASES when the direct map lookup misses, so these
  // aliases make saved forms using `dropdown_widget` etc. render the real
  // `dropdown` component instead of degrading to <Input>.
  dropdown_widget: 'dropdown',
  single_choice_widget: 'single_choice',
  multiple_choice_widget: 'multiple_choice',
  date_picker_widget: 'date_picker',
  time_picker_widget: 'time_picker',
  email_widget: 'email',
  phone_widget: 'phone',
  address_widget: 'address',
  file_upload_widget: 'file_upload',

  // SMS OTP Confirmation → reuse the existing sms_otp_verification runtime
  // component (per backward-compat + DRY). The two IDs are aliases of the
  // same OTP-confirmation UX; we do NOT duplicate the component.
  sms_otp_confirmation: 'sms_otp_verification',

  // DateTime aliases
  date: 'date_picker',
  time: 'time_picker',

  // Media aliases

  // Contact aliases
  name: 'full_name',
  whatsapp_chat_button: 'phone',
  email_otp_verification: 'email',

  // Survey aliases
  rating: 'star_rating',
  matrix_dynamique: 'likert_matrix',

  // Calc & Productivity aliases
  configurable_list_v2: 'configurable_list',

  // ─── Legacy _v2 aliases (old _v2 IDs → canonical IDs) ──────────────────
  nearest_location_finder_v2: 'nearest_location_finder',
  route_planner_v2: 'route_planner_map',
  service_area_checker_v2: 'service_area_checker',
  inventory_dropdown_v2: 'inventory_dropdown',
  australia_bsb_checker_v2: 'australia_bsb_checker',
  italian_codice_fiscale_v2: 'italian_codice_fiscale',
  dynamic_dropdowns_v2: 'dynamic_dropdowns',
  matrix_dynamique_v2: 'matrix_dynamique',
  star_rating_comments_v2: 'star_rating_comments',
  thumbs_up_down_v2: 'thumbs_up_down',
  gdpr_consent_v2: 'gdpr_consent',
  privacy_policy_accept_v2: 'privacy_policy_accept',
  age_verification_v2: 'age_verification',
  digital_witness_v2: 'digital_witness',
  social_share_buttons_v2: 'social_share_buttons',
  ai_sentiment_analysis_v2: 'ai_sentiment_analysis',
  color_picker_widget: 'color_picker',
  google_analytics_4_widget: 'google_analytics_4',
  spreadsheet_widget: 'spreadsheet',
  text_count_calculator: 'text_count',
  loan_emi_calculator: 'loan_emi',
  like_dislike_feedback: 'like_dislike',
  star_rating_with_comments: 'star_rating_comments',
  weekly_appointment_planner: 'weekly_planner',
};

export function getFieldById(id: string): FieldDefinition | undefined {
  const direct = FIELD_REGISTRY_MAP.get(id);
  if (direct) return direct;
  const canonicalId = FIELD_ALIASES[id];
  if (canonicalId) return FIELD_REGISTRY_MAP.get(canonicalId);
  return undefined;
}

export function getFieldsByCategory(category: FieldDefinition['category']): FieldDefinition[] {
  return FIELD_REGISTRY.filter((f) => f.category === category);
}

export function searchFields(
  query: string,
  category?: FieldDefinition['category'],
): FieldDefinition[] {
  const q = query.toLowerCase().trim();
  return FIELD_REGISTRY.filter((f) => {
    const matchesCat = !category || f.category === category;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q)
    );
  });
}

export function createFieldFromRegistry(id: string, label?: string): Record<string, unknown> | null {
  const def = getFieldById(id);
  if (!def) return null;
  return def.createField(label);
}

export const FIELD_CATEGORY_META: Array<{
  id: FieldDefinition['category'];
  label: string;
  iconName: string;
}> = [
  { id: 'basic', label: 'Basic Elements', iconName: 'Type' },
  { id: 'choice', label: 'Choice Fields', iconName: 'CheckSquare' },
  { id: 'contact', label: 'Contact & Identity', iconName: 'Mail' },
  { id: 'datetime', label: 'Date & Time', iconName: 'Calendar' },
  { id: 'file', label: 'File Upload', iconName: 'Paperclip' },
  { id: 'media', label: 'Media & Inspection', iconName: 'Camera' },
  { id: 'signature', label: 'Signature', iconName: 'PenTool' },
  { id: 'survey', label: 'Survey & Rating', iconName: 'Star' },
  { id: 'calculation', label: 'Math & Calculations', iconName: 'Calculator' },
  { id: 'maps', label: 'Maps & Geolocation', iconName: 'MapPin' },
  { id: 'security', label: 'Security & Verification', iconName: 'ShieldCheck' },
  { id: 'productivity', label: 'Dynamic Lists', iconName: 'ListOrdered' },
  { id: 'layout', label: 'Layout & Display', iconName: 'LayoutTemplate' },
  { id: 'payment', label: 'Payment', iconName: 'CreditCard' },
  { id: 'regional', label: 'Regional & Identity', iconName: 'Globe' },
  { id: 'embed', label: 'Embeds & Media', iconName: 'Layers' },
  { id: 'social', label: 'Social & Integrations', iconName: 'Share2' },
  { id: 'analytics', label: 'Analytics & Tracking', iconName: 'BarChart' },
  { id: 'marketing', label: 'Marketing & Leads', iconName: 'Megaphone' },
  { id: 'finance', label: 'Finance & Taxes', iconName: 'Landmark' },
];
