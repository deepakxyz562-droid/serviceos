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
      { key: 'showCounter', label: 'Show character counter', type: 'boolean', group: 'field_specific', default: false },
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
      { key: 'thousandsSep', label: 'Thousands separator', type: 'boolean', group: 'field_specific', default: false },
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
      { key: 'allowOther', label: 'Allow "Other"', type: 'boolean', group: 'field_specific', default: false },
      { key: 'multiSelect', label: 'Allow multi-select', type: 'boolean', group: 'field_specific', default: false },
      { key: 'searchEnabled', label: 'Enable search', type: 'boolean', group: 'field_specific', default: false },
      { key: 'randomize', label: 'Randomize order', type: 'boolean', group: 'field_specific', default: false },
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
      { key: 'allowOther', label: 'Allow "Other"', type: 'boolean', group: 'field_specific', default: false },
      { key: 'columns', label: 'Columns', type: 'select', group: 'field_specific', default: '1', options: [
        { label: '1 (vertical)', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: 'Inline', value: 'inline' },
      ] },
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
      { key: 'allowOther', label: 'Allow "Other"', type: 'boolean', group: 'field_specific', default: false },
      { key: 'minSelect', label: 'Min selections', type: 'number', group: 'field_specific', default: 0, min: 0 },
      { key: 'maxSelect', label: 'Max selections (0 = unlimited)', type: 'number', group: 'field_specific', default: 0 },
      { key: 'columns', label: 'Columns', type: 'select', group: 'field_specific', default: '1', options: [
        { label: '1 (vertical)', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: 'Inline', value: 'inline' },
      ] },
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
      { key: 'confirmation', label: 'Require confirmation (re-enter)', type: 'boolean', group: 'field_specific', default: false },
      { key: 'blockFreeDomains', label: 'Block free domains (gmail/yahoo)', type: 'boolean', group: 'field_specific', default: false },
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
      { key: 'defaultCountry', label: 'Default country code', type: 'text', group: 'field_specific', default: 'US' },
      { key: 'validateMobile', label: 'Validate as mobile only', type: 'boolean', group: 'field_specific', default: false },
      { key: 'format', label: 'Display format', type: 'select', group: 'field_specific', default: 'international', options: [
        { label: 'International (+1...)', value: 'international' }, { label: 'National', value: 'national' }, { label: 'E.164', value: 'e164' },
      ] },
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
      { key: 'disableWeekends', label: 'Disable weekends', type: 'boolean', group: 'field_specific', default: false },
      { key: 'defaultToday', label: 'Default to today', type: 'boolean', group: 'field_specific', default: false },
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
      { key: 'requireCommentOnLowRating', label: 'Require comment on low rating', type: 'boolean', group: 'field_specific', default: false },
      { key: 'threshold', label: 'Threshold below which comment is required', type: 'number', group: 'field_specific', default: 3 },
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
      { key: 'allowedExtensions', label: 'Allowed extensions (comma-sep)', type: 'text', group: 'field_specific', placeholder: 'pdf, jpg, png' },
      { key: 'captureMode', label: 'Capture mode', type: 'select', group: 'field_specific', default: 'both', options: [
        { label: 'Camera + Upload', value: 'both' }, { label: 'Camera only', value: 'camera' }, { label: 'Upload only', value: 'upload' },
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
      { key: 'allowHTML', label: 'Allow HTML', type: 'boolean', group: 'field_specific', default: false },
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
      { key: 'clearable', label: 'Allow clear', type: 'boolean', group: 'field_specific', default: true },
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
      { key: 'includeLatLon', label: 'Capture lat/long', type: 'boolean', group: 'field_specific', default: false },
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
    createField: (label = 'Nearest Location') => ({
      label, type: 'short_answer', widgetType: 'nearest_location_finder',
      widgetConfig: { provider: 'managed', distanceUnit: 'miles' }, required: false,
    }),
    settingsSchema: [
      { key: 'provider', label: 'Map provider', type: 'segmented', group: 'field_specific', default: 'managed', options: [
        { label: '🚀 Managed', value: 'managed' }, { label: 'OSM (free)', value: 'osm' }, { label: 'BYOK', value: 'byok' },
      ] },
      { key: 'distanceUnit', label: 'Distance unit', type: 'segmented', group: 'field_specific', default: 'miles', options: [
        { label: 'Miles', value: 'miles' }, { label: 'Km', value: 'km' },
      ] },
      { key: 'branches', label: 'Locations (one per line: name,address)', type: 'textarea', group: 'field_specific' },
    ],
  },
  {
    id: 'route_planner_map',
    name: 'Route Planner Map',
    category: 'maps',
    iconName: 'Map',
    description: 'Interactive driving route with mileage',
    badge: 'POPULAR',
    tier: 'pro',
    backendHandler: 'maps',
    createField: (label = 'Route Planner') => ({
      label, type: 'short_answer', widgetType: 'route_planner_map',
      widgetConfig: { provider: 'managed', travelMode: 'DRIVING', unit: 'miles' }, required: false,
    }),
    settingsSchema: [
      { key: 'provider', label: 'Map provider', type: 'segmented', group: 'field_specific', default: 'managed', options: [
        { label: '🚀 Managed', value: 'managed' }, { label: 'BYOK', value: 'byok' },
      ] },
      { key: 'travelMode', label: 'Travel mode', type: 'segmented', group: 'field_specific', default: 'DRIVING', options: [
        { label: 'Drive', value: 'DRIVING' }, { label: 'Walk', value: 'WALKING' }, { label: 'Bike', value: 'BICYCLING' },
      ] },
      { key: 'unit', label: 'Distance unit', type: 'segmented', group: 'field_specific', default: 'miles', options: [
        { label: 'Miles', value: 'miles' }, { label: 'Km', value: 'km' },
      ] },
      { key: 'showDirectionsList', label: 'Show step-by-step directions', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Display turn-by-turn directions under the map.' },
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
    createField: (label = 'Service Area Check') => ({
      label, type: 'short_answer', widgetType: 'service_area_checker',
      widgetConfig: { provider: 'managed', radiusMiles: 35, outOfAreaMessage: 'Sorry, we do not service this area yet.' }, required: false,
    }),
    settingsSchema: [
      { key: 'radiusMiles', label: 'Service radius (miles)', type: 'number', group: 'field_specific', default: 35, min: 1 },
      { key: 'centerAddress', label: 'Center address', type: 'text', group: 'field_specific' },
      { key: 'outOfAreaMessage', label: 'Out-of-area message', type: 'textarea', group: 'field_specific' },
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
      { key: 'hidden', label: 'Hidden (calculated, not shown to user)', type: 'boolean', group: 'field_specific', default: false },
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
      { key: 'theme', label: 'Theme', type: 'select', group: 'field_specific', default: 'auto', options: [
        { label: 'Auto', value: 'auto' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' },
      ] },
      { key: 'size', label: 'Size', type: 'select', group: 'field_specific', default: 'flexible', options: [
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
      { key: 'format', label: 'Audio format', type: 'select', group: 'field_specific', default: 'audio/webm', options: [
        { label: 'WebM (recommended)', value: 'audio/webm' }, { label: 'MP3', value: 'audio/mp3' },
      ] },
      { key: 'showPlayback', label: 'Show playback controls', type: 'boolean', group: 'field_specific', default: true },
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

export function getFieldById(id: string): FieldDefinition | undefined {
  return FIELD_REGISTRY_MAP.get(id);
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
];
