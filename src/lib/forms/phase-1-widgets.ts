/**
 * Phase 1 Widget Definitions — 80+ foundation widgets registered with the
 * unified FieldRegistry. Each entry adds the widget to the Form Studio
 * palette AND wires its runtime component (via the lazy map).
 *
 * Categories:
 *   - Choice (9)          - DateTime (10)       - Contact (5)
 *   - Media (10)          - Signature (5)       - File (5)
 *   - Calculations (8)    - Survey (7)          - Productivity (5)
 *   - Payment (20)        - Products (10)
 */
import type { FieldDefinition, SettingField } from './field-settings-types';
import { buildCredentialSettings } from './payment-credentials';

type WidgetSpec = [
  id: string,
  name: string,
  category: FieldDefinition['category'],
  iconName: string,
  description: string,
  badge: FieldDefinition['badge'] | '',
  tier: FieldDefinition['tier'],
  extraSettings?: SettingField[],
  backendHandler?: FieldDefinition['backendHandler'],
];

const WIDGET_SPECS: WidgetSpec[] = [
  // ─── Choice (9) ────────────────────────────────────────────────────────────
  ['dropdown_widget', 'Dropdown', 'choice', 'ChevronDown', 'Select one from list', 'POPULAR', 'free', [
    { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
    { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
    { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
    { key: 'multiSelect', label: 'Allow multi-select', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users select more than one option.' },
    { key: 'searchEnabled', label: 'Enable search', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Add a search box for long option lists.' },
    { key: 'randomize', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle options on each form load (great for surveys).' },
    { key: 'useCalculationValues', label: 'Use Calculation Values', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Assign numerical values/scores to options for calculations.' },
    { key: 'calculationValues', label: 'Calculation Values', type: 'calculation_values_editor', group: 'field_specific', condition: { dependsOn: 'useCalculationValues', equals: 'true' } },
  ]],
  ['single_choice_widget', 'Single Choice (Radio)', 'choice', 'CircleDot', 'Radio button options', '', 'free', [
    { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
    { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
    { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
    { key: 'columns', label: 'Spread to Columns', type: 'segmented', group: 'field_specific', default: '1', options: [
      { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4', value: '4' }, { label: 'Inline', value: 'inline' },
    ] },
    { key: 'randomize', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle options on each form load.' },
    { key: 'useCalculationValues', label: 'Use Calculation Values', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Assign numerical values/scores to options for calculations.' },
    { key: 'calculationValues', label: 'Calculation Values', type: 'calculation_values_editor', group: 'field_specific', condition: { dependsOn: 'useCalculationValues', equals: 'true' } },
  ]],
  ['multiple_choice_widget', 'Multiple Choice (Checkbox)', 'choice', 'CheckSquare', 'Multi-select checkboxes', '', 'free', [
    { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
    { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
    { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
    { key: 'selectAllOption', label: 'Show "Select All" option', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Show a master checkbox to select/deselect all options.' },
    { key: 'minSelect', label: 'Min selections', type: 'number', group: 'field_specific', default: 0, min: 0, helpText: 'Minimum number of options the user must select.' },
    { key: 'maxSelect', label: 'Max selections (0 = unlimited)', type: 'number', group: 'field_specific', default: 0, min: 0 },
    { key: 'columns', label: 'Spread to Columns', type: 'segmented', group: 'field_specific', default: '1', options: [
      { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4', value: '4' }, { label: 'Inline', value: 'inline' },
    ] },
    { key: 'randomize', label: 'Randomize order', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Shuffle options on each form load.' },
    { key: 'useCalculationValues', label: 'Use Calculation Values', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Assign numerical values/scores to options for calculations.' },
    { key: 'calculationValues', label: 'Calculation Values', type: 'calculation_values_editor', group: 'field_specific', condition: { dependsOn: 'useCalculationValues', equals: 'true' } },
  ]],
  ['image_choice', 'Image Choice', 'choice', 'Image', 'Visual radio with images per option', 'NEW', 'pro', [
    { key: 'options', label: 'Image Options', type: 'options_editor', group: 'field_specific' },
    { key: 'multiSelect', label: 'Allow multi-select', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'imageWidth', label: 'Image Width', type: 'dimension', group: 'field_specific', default: 120, unit: 'PX' },
    { key: 'imageHeight', label: 'Image Height', type: 'dimension', group: 'field_specific', default: 120, unit: 'PX' },
  ]],
  ['autocomplete', 'Auto-Complete', 'choice', 'Search', 'Smart city/address auto-complete', 'NEW', 'pro', [
    { key: 'dataSource', label: 'Data source', type: 'select', group: 'field_specific', default: 'city', options: [
      { label: 'Cities', value: 'city' }, { label: 'Addresses', value: 'address' }, { label: 'Custom list', value: 'custom' },
    ] },
    { key: 'customOptions', label: 'Custom options (comma-sep)', type: 'text', group: 'field_specific', condition: { dependsOn: 'dataSource', equals: 'custom' } },
    { key: 'maxItems', label: 'Max items shown', type: 'number', group: 'field_specific', default: 5, min: 1, max: 20 },
  ]],
  ['tags_input', 'Tags Input', 'choice', 'Tag', 'Enter tags with autocomplete', '', 'pro', [
    { key: 'maxTags', label: 'Max tags', type: 'number', group: 'field_specific', default: 5, min: 1, max: 50 },
    { key: 'allowDuplicates', label: 'Allow duplicates', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['mask_input', 'Masked Input', 'choice', 'AsteriskSquare', 'Phone/SSN/custom mask', '', 'pro', [
    { key: 'mask', label: 'Mask pattern (9=digit, A=letter, *=any)', type: 'text', group: 'field_specific', default: '(999) 999-9999' },
    { key: 'placeholder', label: 'Placeholder char', type: 'text', group: 'field_specific', default: '_' },
  ]],
  ['password', 'Password', 'choice', 'Lock', 'Password with strength meter', '', 'pro', [
    { key: 'showStrength', label: 'Show strength meter', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'minLen', label: 'Min length', type: 'number', group: 'field_specific', default: 8, min: 4, max: 128 },
    { key: 'requireSymbol', label: 'Require symbol', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['rich_text', 'Rich Text Editor', 'choice', 'Bold', 'Bold/italic/link/list toolbar', 'PRO', 'business', [
    { key: 'toolbar', label: 'Toolbar (JSON)', type: 'json', group: 'field_specific' },
    { key: 'maxLength', label: 'Max characters', type: 'number', group: 'field_specific', default: 5000 },
  ]],

  // ─── DateTime (10) ──────────────────────────────────────────────────────────
  ['date_picker_widget', 'Date Picker', 'datetime', 'Calendar', 'Calendar date selection', 'POPULAR', 'free', [
    { key: 'format', label: 'Display format', type: 'segmented', group: 'field_specific', default: 'yyyy-mm-dd', options: [
      { label: 'YYYY-MM-DD', value: 'yyyy-mm-dd' }, { label: 'MM/DD/YYYY', value: 'mm/dd/yyyy' }, { label: 'DD/MM/YYYY', value: 'dd/mm/yyyy' },
    ] },
    { key: 'minDate', label: 'Min date', type: 'date', group: 'field_specific' },
    { key: 'maxDate', label: 'Max date', type: 'date', group: 'field_specific' },
    { key: 'disableWeekends', label: 'Disable weekends', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent Saturday and Sunday selection.' },
    { key: 'disablePastDates', label: 'Disable past dates', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Prevent selecting dates before today.' },
    { key: 'defaultToday', label: 'Default to today', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Pre-fill the date with today\'s date.' },
    { key: 'allowTime', label: 'Allow Time', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Enable time input alongside the date picker.' },
    { key: 'timezone', label: 'Time zone', type: 'select', group: 'field_specific', default: 'local', options: [
      { label: 'User\'s local timezone', value: 'local' }, { label: 'UTC', value: 'utc' },
    ] },
  ]],
  ['time_picker_widget', 'Time Picker', 'datetime', 'Clock', 'Time-of-day selection', '', 'free', [
    { key: 'format', label: 'Format', type: 'select', group: 'field_specific', default: '24h', options: [
      { label: '24-hour', value: '24h' }, { label: '12-hour (AM/PM)', value: '12h' },
    ] },
    { key: 'step', label: 'Step (minutes)', type: 'number', group: 'field_specific', default: 15, min: 1, max: 60 },
  ]],
  ['date_time', 'Date & Time', 'datetime', 'CalendarClock', 'Combined date + time picker', '', 'free', [
    { key: 'dateFormat', label: 'Date format', type: 'select', group: 'field_specific', default: 'yyyy-mm-dd', options: [
      { label: 'YYYY-MM-DD', value: 'yyyy-mm-dd' }, { label: 'MM/DD/YYYY', value: 'mm/dd/yyyy' }, { label: 'DD/MM/YYYY', value: 'dd/mm/yyyy' },
    ] },
    { key: 'timeFormat', label: 'Time format', type: 'select', group: 'field_specific', default: '24h', options: [
      { label: '24-hour', value: '24h' }, { label: '12-hour (AM/PM)', value: '12h' },
    ] },
    { key: 'defaultToCurrent', label: 'Default to current time', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Pre-fill with current date and time.' },
  ]],
  ['appointment', 'Appointment Booking', 'datetime', 'CalendarCheck', 'Time-slot booking with availability', 'POPULAR', 'pro', [
    { key: 'duration', label: 'Duration (minutes)', type: 'number', group: 'field_specific', default: 30, min: 5, max: 480 },
    { key: 'interval', label: 'Slot interval (minutes)', type: 'number', group: 'field_specific', default: 30, min: 5, max: 120 },
    { key: 'leadTime', label: 'Min lead time (hours)', type: 'number', group: 'field_specific', default: 24, min: 0 },
    { key: 'rollingDays', label: 'Booking window (days in advance)', type: 'number', group: 'field_specific', default: 30, min: 1, max: 365 },
    { key: 'maxPerSlot', label: 'Max attendees per slot', type: 'number', group: 'field_specific', default: 1, min: 1, max: 50 },
  ]],
  ['birth_date', 'Birth Date', 'datetime', 'Cake', 'Date picker with min/max age', '', 'free', [
    { key: 'minAge', label: 'Min age', type: 'number', group: 'field_specific', default: 0, min: 0 },
    { key: 'maxAge', label: 'Max age', type: 'number', group: 'field_specific', default: 120 },
  ]],
  ['date_range', 'Date Range', 'datetime', 'CalendarRange', 'Pick start and end date', '', 'pro', [
    { key: 'minNights', label: 'Min nights', type: 'number', group: 'field_specific', default: 1, min: 0 },
    { key: 'maxNights', label: 'Max nights', type: 'number', group: 'field_specific', default: 30 },
    { key: 'disablePast', label: 'Disable past dates', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['recurring_date', 'Recurring Date', 'datetime', 'RefreshCw', 'RRULE-based recurrence', 'NEW', 'business', [
    { key: 'freq', label: 'Frequency', type: 'select', group: 'field_specific', default: 'weekly', options: [
      { label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' },
    ] },
    { key: 'interval', label: 'Interval (every N)', type: 'number', group: 'field_specific', default: 1, min: 1 },
  ]],
  ['timezone_picker', 'Timezone Picker', 'datetime', 'Globe', 'Select timezone from list', '', 'free', [
    { key: 'defaultBrowser', label: 'Default to browser TZ', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'format', label: 'Display format', type: 'select', group: 'field_specific', default: 'full', options: [
      { label: 'Full (America/New_York)', value: 'full' }, { label: 'Abbreviated (EST)', value: 'abbrev' },
    ] },
  ]],
  ['countdown_timer', 'Countdown Timer', 'datetime', 'Timer', 'Form-wide timer that auto-submits at 0', 'NEW', 'pro', [
    { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number', group: 'field_specific', default: 15, min: 1, max: 180 },
    { key: 'autoSubmitOnExpiry', label: 'Auto-submit on expiry', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'warnAt', label: 'Warn at (minutes left)', type: 'number', group: 'field_specific', default: 1 },
  ]],
  ['weekly_planner', 'Weekly Appointment Planner', 'datetime', 'CalendarClock', 'Day-by-day time slots with limits', 'POPULAR', 'business', [
    { key: 'slotDurationMinutes', label: 'Slot duration (min)', type: 'number', group: 'field_specific', default: 60, min: 15, max: 240 },
    { key: 'maxPerSlot', label: 'Max per slot', type: 'number', group: 'field_specific', default: 1, min: 1, max: 20 },
  ]],

  // ─── Contact (5) ────────────────────────────────────────────────────────────
  ['email_widget', 'Email Address', 'contact', 'Mail', 'Validated email input', 'POPULAR', 'free', [
    { key: 'confirmation', label: 'Require confirmation', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'blockFreeDomains', label: 'Block free domains (gmail/yahoo)', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['phone_widget', 'Phone Number', 'contact', 'Phone', 'International phone input', '', 'free', [
    { key: 'defaultCountry', label: 'Default country', type: 'text', group: 'field_specific', default: 'US' },
    { key: 'validateMobile', label: 'Validate as mobile', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'format', label: 'Display format', type: 'select', group: 'field_specific', default: 'international', options: [
      { label: 'International', value: 'international' }, { label: 'National', value: 'national' }, { label: 'E.164', value: 'e164' },
    ] },
  ]],
  ['full_name', 'Full Name (First/Last)', 'contact', 'User', 'First + last name combined', '', 'free', [
    { key: 'middleName', label: 'Include middle name', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'prefix', label: 'Include prefix (Mr/Ms/Dr)', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['address_widget', 'Address', 'contact', 'MapPin', 'International address with country/state', '', 'free', [
    { key: 'countryDefault', label: 'Default country', type: 'text', group: 'field_specific', default: 'US' },
    { key: 'stateMode', label: 'State field type', type: 'select', group: 'field_specific', default: 'dropdown', options: [
      { label: 'Dropdown', value: 'dropdown' }, { label: 'Free text', value: 'text' },
    ] },
    { key: 'includeLatLon', label: 'Capture lat/long', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['company', 'Company Name', 'contact', 'Building', 'Company name with industry suggest', '', 'free', [
    { key: 'industrySuggest', label: 'Show industry suggestions', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],

  // ─── Media (10) ──────────────────────────────────────────────────────────────
  ['image_upload', 'Image Upload', 'media', 'ImagePlus', 'Multi-image upload with preview', 'POPULAR', 'free', [
    { key: 'maxFiles', label: 'Max files', type: 'number', group: 'field_specific', default: 5, min: 1, max: 50 },
    { key: 'maxFileSizeMb', label: 'Max file size (MB)', type: 'number', group: 'field_specific', default: 10, min: 1, max: 50 },
    { key: 'allowedImageTypes', label: 'Allowed Image Types', type: 'multi_checkbox', group: 'field_specific',
      default: ['JPG', 'PNG', 'HEIC', 'WebP'],
      options: [
        { label: 'JPG', value: 'JPG' }, { label: 'PNG', value: 'PNG' },
        { label: 'HEIC', value: 'HEIC' }, { label: 'WebP', value: 'WebP' },
      ],
      helpText: 'Choose which image file types respondents can upload.',
    },
    { key: 'autoResize', label: 'Auto-resize on upload', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Automatically resize large images on upload.' },
    { key: 'resizeWidth', label: 'Resize width (px)', type: 'dimension', group: 'field_specific', default: 1920, min: 100, max: 5000, unit: 'PX', condition: { dependsOn: 'autoResize', equals: 'true' } },
  ]],
  ['take_photo', 'Take Photo (Camera)', 'media', 'Camera', 'Direct camera capture', 'POPULAR', 'pro', [
    { key: 'cameraFacing', label: 'Camera', type: 'segmented', group: 'field_specific', default: 'environment', options: [
      { label: 'Rear', value: 'environment' }, { label: 'Front', value: 'user' },
    ] },
    { key: 'allowRetake', label: 'Allow retake', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Let user retake the photo before submitting.' },
    { key: 'resolution', label: 'Max resolution', type: 'select', group: 'field_specific', default: '1280', options: [
      { label: 'SD (640×480)', value: '640' }, { label: 'HD (1280×720)', value: '1280' }, { label: 'FHD (1920×1080)', value: '1920' },
    ] },
  ]],
  ['image_preview', 'Image Preview', 'media', 'Eye', 'Upload with large preview + zoom', '', 'pro', [
    { key: 'previewSize', label: 'Preview size', type: 'select', group: 'field_specific', default: 'large', options: [
      { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
    ] },
    { key: 'zoomable', label: 'Enable zoom', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['video_upload', 'Video Upload', 'media', 'Video', 'Video file upload', '', 'pro', [
    { key: 'maxFileSizeMb', label: 'Max file size (MB)', type: 'number', group: 'field_specific', default: 50, min: 1, max: 500 },
    { key: 'maxDuration', label: 'Max duration (seconds)', type: 'number', group: 'field_specific', default: 300, min: 5, max: 3600 },
    { key: 'allowedVideoTypes', label: 'Allowed Video Types', type: 'multi_checkbox', group: 'field_specific',
      default: ['MP4', 'WebM', 'MOV'],
      options: [
        { label: 'MP4', value: 'MP4' }, { label: 'WebM', value: 'WebM' },
        { label: 'MOV', value: 'MOV' }, { label: 'AVI', value: 'AVI' },
      ],
      helpText: 'Choose which video file types respondents can upload.',
    },
  ]],
  ['audio_upload', 'Audio Upload', 'media', 'Music', 'Audio file upload', '', 'pro', [
    { key: 'maxFileSizeMb', label: 'Max file size (MB)', type: 'number', group: 'field_specific', default: 25, min: 1, max: 100 },
    { key: 'allowedAudioTypes', label: 'Allowed Audio Types', type: 'multi_checkbox', group: 'field_specific',
      default: ['MP3', 'WAV', 'WebM'],
      options: [
        { label: 'MP3', value: 'MP3' }, { label: 'WAV', value: 'WAV' },
        { label: 'WebM', value: 'WebM' }, { label: 'OGG', value: 'OGG' }, { label: 'M4A', value: 'M4A' },
      ],
      helpText: 'Choose which audio file types respondents can upload.',
    },
  ]],

  // ─── Signature (5) ────────────────────────────────────────────────────────────
  ['smooth_signature', 'Smooth Signature', 'signature', 'PenLine', 'Smooth touch-friendly signature', 'POPULAR', 'pro', [
    { key: 'penColor', label: 'Pen color', type: 'color', group: 'field_specific', default: '#0f172a' },
    { key: 'backgroundColor', label: 'Background color', type: 'color', group: 'field_specific', default: '#ffffff' },
    { key: 'widthPx', label: 'Signature pad width', type: 'dimension', group: 'field_specific', default: 400, min: 100, max: 2000, unit: 'PX', helpText: 'Width of the signature canvas in pixels.' },
    { key: 'heightPx', label: 'Signature pad height', type: 'dimension', group: 'field_specific', default: 150, min: 50, max: 1000, unit: 'PX', helpText: 'Height of the signature canvas in pixels.' },
    { key: 'clearable', label: 'Allow clear', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Let user clear and re-sign before submitting.' },
    { key: 'legalText', label: 'Legal text', type: 'textarea', group: 'field_specific', placeholder: 'By signing above, I agree to the terms and conditions.' },
  ]],
  ['signature_pad_typed', 'Typed Signature', 'signature', 'Type', 'Type-to-signature with font choices', '', 'pro', [
    { key: 'font', label: 'Signature font', type: 'select', group: 'field_specific', default: 'cursive', options: [
      { label: 'Cursive', value: 'cursive' }, { label: 'Handwriting', value: 'handwriting' },
      { label: 'Serif', value: 'serif' }, { label: 'Sans-serif', value: 'sans-serif' },
    ] },
    { key: 'legalText', label: 'Legal text', type: 'textarea', group: 'field_specific' },
  ]],
  ['hellosign', 'HelloSign', 'signature', 'FilePlus', 'HelloSign signature integration', 'PRO', 'business', [
    { key: 'embedUrl', label: 'HelloSign embed URL', type: 'text', group: 'field_specific' },
    { key: 'templateId', label: 'Template ID', type: 'text', group: 'field_specific' },
  ]],

  // ─── File (5) ────────────────────────────────────────────────────────────────
  ['file_upload_widget', 'File Upload', 'file', 'Paperclip', 'Multi-file upload with extension filter', 'POPULAR', 'free', [
    { key: 'maxFiles', label: 'Max files', type: 'number', group: 'field_specific', default: 5, min: 1, max: 50 },
    { key: 'maxFileSizeMb', label: 'Max file size (MB)', type: 'number', group: 'field_specific', default: 10, min: 1, max: 100 },
    { key: 'allowedFileTypes', label: 'Allowed File Types', type: 'multi_checkbox', group: 'field_specific',
      default: ['PDF', 'JPG', 'PNG', 'DOCX', 'XLSX'],
      options: [
        { label: 'PDF', value: 'PDF' }, { label: 'JPG', value: 'JPG' },
        { label: 'PNG', value: 'PNG' }, { label: 'DOCX', value: 'DOCX' },
        { label: 'XLSX', value: 'XLSX' }, { label: 'CSV', value: 'CSV' },
        { label: 'TXT', value: 'TXT' }, { label: 'ZIP', value: 'ZIP' },
      ],
      helpText: 'Choose which file types respondents can upload.',
    },
  ]],
  ['avatar_upload', 'Avatar Upload', 'file', 'UserCircle', 'Circular avatar with crop', '', 'pro', [
    { key: 'shape', label: 'Shape', type: 'select', group: 'field_specific', default: 'circle', options: [
      { label: 'Circle', value: 'circle' }, { label: 'Square', value: 'square' },
    ] },
    { key: 'size', label: 'Output size (px)', type: 'number', group: 'field_specific', default: 200, min: 50, max: 1024 },
  ]],
  ['qrcode_scanner', 'QR Code Scanner', 'file', 'QrCode', 'Camera-based QR scan', '', 'pro', [
    { key: 'facingMode', label: 'Camera Facing Mode', type: 'select', group: 'field_specific', default: 'environment', options: [
      { label: 'Rear (environment)', value: 'environment' }, { label: 'Front (user)', value: 'user' },
    ] },
    { key: 'scanIntervalMs', label: 'Scan Interval (ms)', type: 'number', group: 'field_specific', default: 500, min: 100, max: 5000, step: 100 },
  ]],
  ['barcode_scanner', 'Barcode Scanner', 'file', 'Scan', 'Camera-based barcode scan', '', 'pro', [
    { key: 'formats', label: 'Supported formats (comma-sep)', type: 'text', group: 'field_specific', default: 'code128, ean13, code39' },
  ]],
  ['nfc_tag_reader', 'NFC Tag Reader', 'file', 'Nfc', 'Web NFC tag reader', 'NEW', 'business', [
    { key: 'readMode', label: 'Read Mode', type: 'select', group: 'field_specific', default: 'read-only', options: [
      { label: 'Read-only', value: 'read-only' }, { label: 'Read / Write', value: 'read-write' },
    ] },
  ]],

  // ─── Calculations (8) ──────────────────────────────────────────────────────────
  ['loan_emi', 'Loan EMI Calculator', 'calculation', 'Percent', 'Monthly installment + amortization', 'NEW', 'business', [
    { key: 'defaultRatePct', label: 'Default interest rate (%)', type: 'number', group: 'field_specific', default: 7.5, step: 0.1 },
    { key: 'defaultTermYears', label: 'Default term (years)', type: 'number', group: 'field_specific', default: 5, min: 1, max: 30 },
  ]],
  ['spreadsheet', 'Spreadsheet Widget', 'calculation', 'Table', 'Excel-style editable grid with formulas', '', 'business', [
    { key: 'rows', label: 'Default rows', type: 'number', group: 'field_specific', default: 5, min: 1, max: 50 },
    { key: 'columns', label: 'Default columns', type: 'number', group: 'field_specific', default: 4, min: 1, max: 20 },
    { key: 'enableFormulas', label: 'Enable formulas (SUM/AVG/PRODUCT)', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['text_count', 'Text Count Calculator', 'calculation', 'FileText', 'Word/character counter with thresholds', '', 'pro', [
    { key: 'minWords', label: 'Min words', type: 'number', group: 'field_specific', default: 10, min: 0 },
    { key: 'maxWords', label: 'Max words', type: 'number', group: 'field_specific', default: 500 },
    { key: 'countMode', label: 'Count mode', type: 'select', group: 'field_specific', default: 'words', options: [
      { label: 'Words', value: 'words' }, { label: 'Characters', value: 'chars' }, { label: 'Both', value: 'both' },
    ] },
  ]],
  ['bmi_calculator', 'BMI Calculator', 'calculation', 'HeartPulse', 'Height + weight → BMI', '', 'pro', [
    { key: 'unitSystem', label: 'Unit system', type: 'select', group: 'field_specific', default: 'metric', options: [
      { label: 'Metric (kg/cm)', value: 'metric' }, { label: 'Imperial (lb/in)', value: 'imperial' },
    ] },
  ]],
  ['age_calculator', 'Age Calculator', 'calculation', 'CalendarDays', 'Birthdate → current age', '', 'free', [
    { key: 'format', label: 'Output format', type: 'select', group: 'field_specific', default: 'years', options: [
      { label: 'Years', value: 'years' }, { label: 'Years + months', value: 'years_months' }, { label: 'Total days', value: 'days' },
    ] },
  ]],
  ['date_difference', 'Date Difference', 'calculation', 'CalendarMinus', 'Date1 − Date2 → days/months/years', '', 'pro', [
    { key: 'unit', label: 'Output unit', type: 'select', group: 'field_specific', default: 'days', options: [
      { label: 'Days', value: 'days' }, { label: 'Months', value: 'months' }, { label: 'Years', value: 'years' },
    ] },
  ]],
  ['percentage_calculator', 'Percentage Calculator', 'calculation', 'Percent', 'X is what % of Y', '', 'free', [
    { key: 'decimalPlaces', label: 'Decimal Places', type: 'number', group: 'field_specific', default: 2, min: 0, max: 6 },
    { key: 'showFormula', label: 'Show Calculation Formula', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Display the formula used (e.g. X/Y × 100) under the result.' },
  ]],

  // ─── Survey (7) ────────────────────────────────────────────────────────────────
  ['star_rating_comments', 'Star Rating + Comments', 'survey', 'Star', '5-star with required comment on low', 'POPULAR', 'pro', [
    { key: 'maxStars', label: 'Max stars', type: 'number', group: 'field_specific', default: 5, min: 3, max: 10 },
    { key: 'requireCommentOnLowRating', label: 'Require comment below threshold', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'threshold', label: 'Threshold', type: 'number', group: 'field_specific', default: 3 },
  ]],
  ['like_dislike', 'Like / Dislike', 'survey', 'ThumbsUp', 'Binary thumbs up/down', '', 'free', [
    { key: 'showLiveCounts', label: 'Show live counts', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['nps_slider', 'NPS Slider (0-10)', 'survey', 'Gauge', 'Net promoter score scale', 'POPULAR', 'pro', [
    { key: 'min', label: 'Min value', type: 'number', group: 'field_specific', default: 0 },
    { key: 'max', label: 'Max value', type: 'number', group: 'field_specific', default: 10 },
    { key: 'minLabel', label: 'Min label', type: 'text', group: 'field_specific', default: 'Not likely' },
    { key: 'maxLabel', label: 'Max label', type: 'text', group: 'field_specific', default: 'Very likely' },
  ]],
  ['smiley_scale', 'Smiley Scale', 'survey', 'Smile', '5-emoji satisfaction scale', '', 'free', [
    { key: 'count', label: 'Number of emojis', type: 'number', group: 'field_specific', default: 5, min: 3, max: 7 },
  ]],
  ['csat_rating', 'CSAT Rating', 'survey', 'SmilePlus', '1-5 customer satisfaction', '', 'free', [
    { key: 'maxRating', label: 'Max rating', type: 'number', group: 'field_specific', default: 5, min: 3, max: 10 },
  ]],
  ['likert_matrix', 'Likert Matrix', 'survey', 'Grid3x3', 'Multiple statements × 5-point agreement', 'PRO', 'business', [
    { key: 'statements', label: 'Statements (JSON array)', type: 'json', group: 'field_specific' },
    { key: 'points', label: 'Point scale', type: 'number', group: 'field_specific', default: 5, min: 3, max: 9 },
  ]],
  ['thumb_rating', 'Thumb Rating', 'survey', 'ThumbsUp', 'Single thumb up/down', '', 'free', [
    { key: 'size', label: 'Thumb Size', type: 'select', group: 'field_specific', default: 'medium', options: [
      { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
    ] },
    { key: 'showLabel', label: 'Show Rating Label', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Display the chosen value (Up/Down) next to the icon.' },
  ]],

  // ─── Productivity (5) ──────────────────────────────────────────────────────────
  ['terms_and_conditions', 'Terms & Conditions', 'productivity', 'ScrollText', 'Scrollable legal modal + accept checkbox', 'POPULAR', 'free', [
    { key: 'termsText', label: 'Terms text', type: 'textarea', group: 'field_specific' },
    { key: 'isMandatory', label: 'Mandatory acceptance', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'requireScroll', label: 'Require scroll to bottom', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],

  // ─── Payment Gateways — Per-Gateway Schemas (JotForm-exact) ──────────────────
  // Each gateway has its own unique settingsSchema matching JotForm's Payment Properties panel.

  // 1. Stripe Elements
  ['payment_stripe_elements', 'Stripe Elements', 'payment', 'CreditCard', 'Inline card fields (Visa/MC/Amex)', 'POPULAR', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'stripe_elements',
      options: [{ label: 'Stripe', value: 'stripe_elements' }, { label: 'Stripe Checkout (Hosted)', value: 'stripe_checkout' }],
      helpText: 'Connected to Stripe. Add a Stripe connection to start collecting payments.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products',
      options: [
        { label: 'Sell Products', value: 'products' },
        { label: 'Sell Subscriptions', value: 'subscriptions' },
        { label: 'Sell Single Product', value: 'single' },
        { label: 'User Defined Amount (Donation)', value: 'donation' },
      ] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD',
      searchPlaceholder: 'Search currency...',
      options: [
        { label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' },
        { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'INR - Indian Rupees', value: 'INR' },
        { label: 'AUD - Australian Dollars', value: 'AUD' }, { label: 'CAD - Canadian Dollars', value: 'CAD' },
        { label: 'JPY - Japanese Yen', value: 'JPY' }, { label: 'BRL - Brazilian Reals', value: 'BRL' },
        { label: 'MXN - Mexican Pesos', value: 'MXN' }, { label: 'CNY - Chinese Yuan', value: 'CNY' },
        { label: 'SGD - Singapore Dollars', value: 'SGD' }, { label: 'AED - UAE Dirhams', value: 'AED' },
        { label: 'ZAR - South African Rand', value: 'ZAR' },
      ] },
    { key: 'showCard', label: 'Debit or Credit Card', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Accept debit and credit cards (Visa, Mastercard, Amex).' },
    { key: 'stripeLink', label: 'Enable 1-Click Checkout with Link', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let customers pay with saved card details via Stripe Link.', condition: { dependsOn: 'showCard', equals: 'true' } },
    { key: 'showACH', label: 'ACH Bank Transfer', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept ACH bank transfers (US only).' },
    { key: 'showKlarna', label: 'Klarna', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Buy now, pay later with Klarna.' },
    { key: 'sendEmail3DS', label: 'Send Email to Customer', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Automatically send an email to a customer when 3D Secure authentication problems occur.' },
    { key: 'chargeImmediately', label: 'Charge Customer Immediately', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Charge the customer\'s card immediately upon form submission.' },
    { key: 'createCustomer', label: 'Create Stripe Customer Record', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Create a customer record in Stripe for future reference.' },
    { key: 'customerRecordMode', label: 'Customer Record Mode', type: 'select', group: 'field_specific', default: 'unique',
      options: [{ label: 'Each Unique Customer', value: 'unique' }, { label: 'Each Submission', value: 'all' }],
      condition: { dependsOn: 'createCustomer', equals: 'true' } },
    { key: 'askBillingInfo', label: 'Ask Billing Information to Customer', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Collect billing address from the customer.' },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real credit cards.' },
  ], 'payment'],

  // 2. Stripe Checkout (Hosted)
  ['payment_stripe_checkout', 'Stripe Checkout', 'payment', 'CreditCard', 'Hosted Stripe payment page', 'POPULAR', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'stripe_checkout',
      options: [{ label: 'Stripe', value: 'stripe_elements' }, { label: 'Stripe Checkout (Hosted)', value: 'stripe_checkout' }],
      helpText: 'Connected to Stripe Checkout. Add a connection to start collecting payments.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products',
      options: [
        { label: 'Sell Products', value: 'products' }, { label: 'Sell Subscriptions', value: 'subscriptions' },
        { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' },
      ] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD',
      searchPlaceholder: 'Search currency...',
      options: [
        { label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' },
        { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'INR - Indian Rupees', value: 'INR' },
        { label: 'AUD - Australian Dollars', value: 'AUD' }, { label: 'CAD - Canadian Dollars', value: 'CAD' },
        { label: 'JPY - Japanese Yen', value: 'JPY' }, { label: 'BRL - Brazilian Reals', value: 'BRL' },
      ] },
    { key: 'sendReceiptEmail', label: 'Send Receipt Email', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Send a payment receipt email to the customer.' },
    { key: 'chargeImmediately', label: 'Charge Customer Immediately', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Charge the customer\'s card immediately upon form submission.' },
    { key: 'customerEmailField', label: 'Customer Email Field', type: 'field_selector', group: 'field_specific', helpText: 'Select which form field contains the customer email.' },
    { key: 'customDataField', label: 'Custom Data Field', type: 'field_selector', group: 'field_specific', helpText: 'Select a form field to pass as custom data to Stripe.' },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real credit cards.' },
  ], 'payment'],

  // 3. Square
  ['payment_square', 'Square', 'payment', 'CreditCard', 'Square payment form with Cash App Pay', 'POPULAR', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'square',
      options: [{ label: 'Square', value: 'square' }, { label: 'Cash App Pay', value: 'cashapp' }],
      helpText: 'Connected to Square. Add a connection to start collecting payments.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products',
      options: [
        { label: 'Sell Products', value: 'products' }, { label: 'Sell Subscriptions', value: 'subscriptions' },
        { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' },
      ] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD',
      searchPlaceholder: 'Search currency...',
      options: [
        { label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' },
        { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'AUD - Australian Dollars', value: 'AUD' },
        { label: 'CAD - Canadian Dollars', value: 'CAD' }, { label: 'JPY - Japanese Yen', value: 'JPY' },
      ] },
    { key: 'businessLocation', label: 'Business Location', type: 'select', group: 'field_specific', helpText: 'Select your Square business location.' },
    { key: 'sendReceipt', label: 'Send Payment Receipt', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Send an email with a link to the Square receipt to the customer.' },
    { key: 'authOnly', label: 'Authorization Only', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Authorize the card now to charge it manually later. Expires after 6 days.' },
    { key: 'customerEmail', label: 'Customer Email', type: 'field_selector', group: 'field_specific', helpText: 'Select which form field contains the customer email.' },
    { key: 'orderFulfillmentType', label: 'Order Fulfillment Type', type: 'select', group: 'field_specific',
      options: [
        { label: 'Pickup', value: 'pickup' }, { label: 'Delivery', value: 'delivery' },
        { label: 'Shipping', value: 'shipping' }, { label: 'None', value: 'none' },
      ] },
    { key: 'showCard', label: 'Credit Card', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Accept credit/debit cards via Square.' },
    { key: 'showGooglePay', label: 'Google Pay', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept Google Pay via Square.' },
    { key: 'showApplePay', label: 'Apple Pay', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept Apple Pay via Square.' },
    { key: 'showCashApp', label: 'Cash App Pay', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept Cash App Pay via Square.' },
    { key: 'showACH', label: 'ACH Bank Transfer', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept ACH bank transfers via Square.' },
    { key: 'showAfterpay', label: 'Afterpay', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept Afterpay (BNPL) via Square.' },
    { key: 'ccLabelText', label: 'Credit Card Label Text', type: 'text', group: 'field_specific', default: 'Credit Card', helpText: 'Custom label text for the credit card section.' },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real credit cards.' },
  ], 'payment'],

  // 4. PayPal
  ['payment_paypal', 'PayPal', 'payment', 'Wallet', 'PayPal + Venmo + Pay in 4', 'POPULAR', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'paypal_complete',
      options: [{ label: 'PayPal', value: 'paypal_complete' }, { label: 'PayPal Pro', value: 'paypal_pro' }],
      helpText: 'Connected to PayPal. Add a PayPal connection to start collecting payments.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products',
      options: [
        { label: 'Sell Products', value: 'products' }, { label: 'Sell Subscriptions', value: 'subscriptions' },
        { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' },
      ] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD',
      searchPlaceholder: 'Search currency...',
      options: [
        { label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' },
        { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'INR - Indian Rupees', value: 'INR' },
        { label: 'AUD - Australian Dollars', value: 'AUD' }, { label: 'CAD - Canadian Dollars', value: 'CAD' },
        { label: 'JPY - Japanese Yen', value: 'JPY' }, { label: 'BRL - Brazilian Reals', value: 'BRL' },
        { label: 'MXN - Mexican Pesos', value: 'MXN' },
      ] },
    { key: 'paypalSmartButtons', label: 'PayPal Smart Buttons', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Show PayPal Smart Buttons (Pay in 4, Venmo, Pay Later) on the form.' },
    { key: 'showVenmo', label: 'Venmo', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept Venmo as a payment method.' },
    { key: 'showPayIn4', label: 'Pay in 4', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Allow customers to pay in 4 interest-free installments.' },
    { key: 'askBillingInfo', label: 'Ask Billing Information to Customer', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Collect billing address from the customer.' },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real credit cards.' },
  ], 'payment'],

  // 5. Razorpay (India)
  ['payment_razorpay', 'Razorpay (India)', 'payment', 'CreditCard', 'Razorpay checkout (UPI/cards)', 'POPULAR', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'razorpay',
      options: [{ label: 'Razorpay (India)', value: 'razorpay' }],
      helpText: 'Connected to Razorpay. Add a connection to start collecting payments.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products',
      options: [
        { label: 'Sell Products', value: 'products' }, { label: 'Sell Subscriptions', value: 'subscriptions' },
        { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' },
      ] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'INR',
      searchPlaceholder: 'Search currency...',
      options: [
        { label: 'INR - Indian Rupees', value: 'INR' }, { label: 'USD - United States Dollars', value: 'USD' },
        { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' },
      ] },
    { key: 'showUPI', label: 'UPI', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Accept UPI payments (Google Pay, PhonePe, Paytm).' },
    { key: 'showCards', label: 'Credit/Debit Card', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Accept credit and debit cards.' },
    { key: 'showNetBanking', label: 'Net Banking', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept net banking payments.' },
    { key: 'showWallets', label: 'Wallets', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Accept wallet payments (Paytm, Mobikwik, etc.).' },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real credit cards.' },
  ], 'payment'],

  // 6-10: Remaining gateways with simplified redirect-based schema
  ['payment_apple_pay', 'Apple Pay', 'payment', 'Wallet', 'Apple Pay button (Apple devices only)', 'NEW', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'apple_google_pay', options: [{ label: 'Apple Pay & Google Pay', value: 'apple_google_pay' }], helpText: 'Connected to Apple Pay / Google Pay.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_google_pay', 'Google Pay', 'payment', 'Wallet', 'Google Pay button', 'NEW', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'apple_google_pay', options: [{ label: 'Apple Pay & Google Pay', value: 'apple_google_pay' }], helpText: 'Connected to Apple Pay / Google Pay.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_authorize_net', 'Authorize.Net', 'payment', 'CreditCard', 'Accept.js card form', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'authorize_net', options: [{ label: 'Authorize.Net', value: 'authorize_net' }], helpText: 'Connected to Authorize.Net.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'CAD - Canadian Dollars', value: 'CAD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_mollie', 'Mollie', 'payment', 'CreditCard', 'Mollie redirect checkout', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'mollie', options: [{ label: 'Mollie', value: 'mollie' }], helpText: 'Connected to Mollie.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'EUR', searchPlaceholder: 'Search...', options: [{ label: 'EUR - Euros', value: 'EUR' }, { label: 'USD - United States Dollars', value: 'USD' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_coinbase_commerce', 'Coinbase Commerce', 'payment', 'Wallet', 'Crypto payments', 'NEW', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'coinbase_commerce', options: [{ label: 'Coinbase Commerce (Crypto)', value: 'coinbase_commerce' }], helpText: 'Connected to Coinbase Commerce.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],

  // 11-20: Remaining redirect-based gateways with simple schema
  ['payment_paypal_pro', 'PayPal Pro', 'payment', 'CreditCard', 'Card fields hosted by PayPal Pro', 'PRO', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'paypal_pro', options: [{ label: 'PayPal Pro', value: 'paypal_pro' }], helpText: 'Connected to PayPal Pro.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_payu_india', 'PayU India', 'payment', 'CreditCard', 'PayU India redirect checkout', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'payu_india', options: [{ label: 'PayU India', value: 'payu_india' }], helpText: 'Connected to PayU India.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'INR', searchPlaceholder: 'Search...', options: [{ label: 'INR - Indian Rupees', value: 'INR' }, { label: 'USD - United States Dollars', value: 'USD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_payu_latam', 'PayU Latam', 'payment', 'CreditCard', 'PayU Latam redirect checkout', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'payu_global', options: [{ label: 'PayU', value: 'payu_global' }], helpText: 'Connected to PayU Latam.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'BRL - Brazilian Reals', value: 'BRL' }, { label: 'MXN - Mexican Pesos', value: 'MXN' }, { label: 'COP - Colombian Pesos', value: 'COP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_braintree', 'Braintree', 'payment', 'CreditCard', 'Braintree hosted fields', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'braintree', options: [{ label: 'Braintree', value: 'braintree' }], helpText: 'Connected to Braintree.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_twocheckout', '2Checkout', 'payment', 'CreditCard', '2Checkout redirect', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'two_checkout', options: [{ label: '2Checkout', value: 'two_checkout' }], helpText: 'Connected to 2Checkout.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_worldpay', 'Worldpay', 'payment', 'CreditCard', 'Worldpay redirect', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'worldpay_uk', options: [{ label: 'Worldpay UK', value: 'worldpay_uk' }], helpText: 'Connected to Worldpay UK.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_bluesnap', 'BlueSnap', 'payment', 'CreditCard', 'BlueSnap redirect', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'bluesnap', options: [{ label: 'BlueSnap', value: 'bluesnap' }], helpText: 'Connected to BlueSnap.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_klarna', 'Klarna BNPL', 'payment', 'Wallet', 'Buy now pay later', 'NEW', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'klarna', options: [{ label: 'Klarna BNPL', value: 'klarna' }], helpText: 'Connected to Klarna.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_afterpay', 'Afterpay / Clearpay', 'payment', 'Wallet', 'Pay in 4 installments', 'NEW', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'afterpay', options: [{ label: 'Afterpay / Clearpay', value: 'afterpay' }], helpText: 'Connected to Afterpay.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'AUD - Australian Dollars', value: 'AUD' }, { label: 'CAD - Canadian Dollars', value: 'CAD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_affirm', 'Affirm BNPL', 'payment', 'Wallet', 'Pay over time', 'NEW', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'affirm', options: [{ label: 'Affirm BNPL', value: 'affirm' }], helpText: 'Connected to Affirm.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'CAD - Canadian Dollars', value: 'CAD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],

  // ─── Phase C: previously-missing widgets ────────────────────────────────────
  ['payment_echeck_net', 'eCheck.Net', 'payment', 'Landmark', 'Direct electronic check / ACH processing via Authorize.Net', '', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'echeck_net', options: [{ label: 'eCheck.Net', value: 'echeck_net' }], helpText: 'Connected to eCheck.Net (via Authorize.Net).' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real bank accounts.' },
  ], 'payment'],
  ['payment_chargify', 'Chargify (Maxio)', 'payment', 'RefreshCw', 'B2B SaaS recurring billing & subscription engine', 'NEW', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'chargify', options: [{ label: 'Chargify (Maxio)', value: 'chargify' }], helpText: 'Connected to Chargify.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'subscriptions', options: [{ label: 'Sell Subscriptions', value: 'subscriptions' }, { label: 'Sell Products', value: 'products' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test subscriptions without creating real Chargify subscriptions.' },
  ], 'payment'],
  ['payment_stripe_ach', 'Stripe Financial ACH', 'payment', 'Building2', 'Instant bank verification & low-fee direct debit via Stripe', 'NEW', 'pro', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'stripe_ach', options: [{ label: 'Stripe ACH', value: 'stripe_ach' }], helpText: 'Connected to Stripe (ACH).' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test ACH payments without real bank transfers.' },
  ], 'payment'],
  // ─── Tier 2: Clearpay (UK/EU BNPL — separate from Afterpay) ───────────────
  ['payment_clearpay', 'Clearpay', 'payment', 'Wallet', 'UK/EU BNPL — 4 interest-free installments', 'NEW', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'clearpay', options: [{ label: 'Clearpay', value: 'clearpay' }], helpText: 'Connected to Clearpay.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'GBP', searchPlaceholder: 'Search...', options: [{ label: 'GBP - British Pounds', value: 'GBP' }, { label: 'EUR - Euros', value: 'EUR' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  // ─── Tier 2: GoCardless (Direct Debit) ────────────────────────────────────
  ['payment_gocardless', 'GoCardless', 'payment', 'Building2', 'Direct debit bank transfers (SEPA, BACS, ACH, PAD, BECS)', 'NEW', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'gocardless', options: [{ label: 'GoCardless', value: 'gocardless' }], helpText: 'Connected to GoCardless.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'subscriptions', options: [{ label: 'Sell Subscriptions', value: 'subscriptions' }, { label: 'Sell Products', value: 'products' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'GBP', searchPlaceholder: 'Search...', options: [{ label: 'GBP - British Pounds', value: 'GBP' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'USD - United States Dollars', value: 'USD' }, { label: 'AUD - Australian Dollars', value: 'AUD' }, { label: 'CAD - Canadian Dollars', value: 'CAD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test direct debit mandates without real bank authorization.' },
  ], 'payment'],

  // ─── Tier 3: Enterprise gateways (7 new widgets) ────────────────────────
  ['payment_cybersource', 'CyberSource', 'payment', 'ShieldCheck', 'Visa-owned enterprise fraud management & card processing engine', '', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'cybersource', options: [{ label: 'CyberSource', value: 'cybersource' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_bluepay', 'BluePay', 'payment', 'CreditCard', 'Secure merchant processing for US & Canadian merchants', '', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'bluepay', options: [{ label: 'BluePay', value: 'bluepay' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'CAD - Canadian Dollars', value: 'CAD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_moneris', 'Moneris', 'payment', 'CreditCard', "Canada's leading payment processor for CAD / USD card payments", 'CANADA', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'moneris', options: [{ label: 'Moneris', value: 'moneris' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'CAD', searchPlaceholder: 'Search...', options: [{ label: 'CAD - Canadian Dollars', value: 'CAD' }, { label: 'USD - United States Dollars', value: 'USD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_cardpointe', 'CardPointe', 'payment', 'CreditCard', 'CardConnect PCI-certified point-to-point encryption gateway', '', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'cardpointe', options: [{ label: 'CardPointe', value: 'cardpointe' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_paysafe', 'Paysafe', 'payment', 'Wallet', 'Enterprise payments including Neteller, Skrill, and cards', '', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'paysafe', options: [{ label: 'Paysafe', value: 'paysafe' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_sensepass', 'SensePass', 'payment', 'QrCode', 'Omnichannel QR & digital wallet tap-to-pay aggregator', '', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'sensepass', options: [{ label: 'SensePass', value: 'sensepass' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_paymentwall', 'Paymentwall', 'payment', 'CreditCard', '150+ alternative payment options worldwide', '150+ APMs', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'paymentwall', options: [{ label: 'Paymentwall', value: 'paymentwall' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'BRL - Brazilian Reals', value: 'BRL' }, { label: 'INR - Indian Rupees', value: 'INR' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_eway', 'eWAY', 'payment', 'CreditCard', 'Payment gateway for Australia, New Zealand, UK, and Singapore merchants', 'AU/NZ', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'eway', options: [{ label: 'eWAY', value: 'eway' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'AUD', searchPlaceholder: 'Search...', options: [{ label: 'AUD - Australian Dollars', value: 'AUD' }, { label: 'NZD - New Zealand Dollars', value: 'NZD' }, { label: 'GBP - British Pounds', value: 'GBP' }, { label: 'SGD - Singapore Dollars', value: 'SGD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real cards.' },
  ], 'payment'],
  ['payment_skrill', 'Skrill', 'payment', 'Wallet', 'Global digital wallet and money transfer service supporting 40+ currencies', '40+ CURRENCIES', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'skrill', options: [{ label: 'Skrill', value: 'skrill' }] },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }, { label: 'EUR - Euros', value: 'EUR' }, { label: 'GBP - British Pounds', value: 'GBP' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real accounts.' },
  ], 'payment'],

  // ─── Tier 4: Gateway-dependent sub-methods (2 new standalone widgets) ──
  ['payment_venmo', 'Venmo', 'payment', 'Users', 'US social wallet payments via PayPal', 'POPULAR', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'venmo', options: [{ label: 'Venmo', value: 'venmo' }], helpText: 'Requires a connected PayPal account.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real accounts.' },
  ], 'payment'],
  ['payment_cash_app_pay', 'Cash App Pay', 'payment', 'Smartphone', 'Square Cash App QR & mobile deep-link payments', 'POPULAR', 'business', [
    { key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker', group: 'field_specific', default: 'cash_app_pay', options: [{ label: 'Cash App Pay', value: 'cash_app_pay' }], helpText: 'Requires a connected Square account.' },
    { key: 'paymentType', label: 'Payment Type', type: 'select', group: 'field_specific', default: 'products', options: [{ label: 'Sell Products', value: 'products' }, { label: 'Sell Single Product', value: 'single' }, { label: 'User Defined Amount (Donation)', value: 'donation' }] },
    { key: 'currency', label: 'Currency', type: 'currency_search', group: 'field_specific', default: 'USD', searchPlaceholder: 'Search...', options: [{ label: 'USD - United States Dollars', value: 'USD' }] },
    { key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Test payments without charging real accounts.' },
  ], 'payment'],


  // ─── Products (10) ────────────────────────────────────────────────────────────
  ['product_single', 'Single Product', 'payment', 'Package', 'Single product card with qty selector', '', 'pro', [
    { key: 'name', label: 'Product name', type: 'text', group: 'field_specific' },
    { key: 'price', label: 'Price', type: 'number', group: 'field_specific', default: 49.0, step: 0.01 },
    { key: 'image', label: 'Image URL', type: 'text', group: 'field_specific' },
    { key: 'qtyEditable', label: 'Allow qty edit', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['product_multiple', 'Multiple Products', 'payment', 'Boxes', 'Grid of products with qty selectors', '', 'business', [
    { key: 'products', label: 'Products', type: 'product_editor', group: 'field_specific' },
    { key: 'showImages', label: 'Show product images', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['product_subscription', 'Subscription Plan', 'payment', 'RefreshCw', 'Plan selector with monthly/yearly toggle', 'NEW', 'business', [
    { key: 'planName', label: 'Plan name', type: 'text', group: 'field_specific' },
    { key: 'monthlyPrice', label: 'Monthly price', type: 'number', group: 'field_specific', default: 19, step: 0.01 },
    { key: 'yearlyPrice', label: 'Yearly price', type: 'number', group: 'field_specific', default: 190, step: 0.01 },
    { key: 'trialDays', label: 'Trial days', type: 'number', group: 'field_specific', default: 14, min: 0, max: 90 },
  ]],
  ['product_donation', 'Donation', 'payment', 'HeartHandshake', 'Suggested amounts + custom input', '', 'free', [
    { key: 'minAmount', label: 'Min amount', type: 'number', group: 'field_specific', default: 1, min: 0 },
    { key: 'suggestedAmounts', label: 'Suggested amounts (JSON array)', type: 'json', group: 'field_specific' },
    { key: 'allowCustom', label: 'Allow custom amount', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['product_purchase_order', 'Purchase Order (Offline)', 'payment', 'Receipt', 'PO number + terms text', '', 'free', [
    { key: 'paymentTerms', label: 'Payment terms', type: 'text', group: 'field_specific', default: 'Net 30' },
    { key: 'dueDate', label: 'Due date', type: 'date', group: 'field_specific' },
  ]],
  ['product_coupon_code', 'Coupon Code', 'payment', 'TicketPercent', 'Coupon input with discount', '', 'pro', [
    { key: 'codes', label: 'Coupon codes (JSON)', type: 'json', group: 'field_specific' },
  ]],
  ['product_tax_calculator', 'Tax Calculator', 'payment', 'ReceiptText', 'Auto-compute tax from rate', '', 'pro', [
    { key: 'rate', label: 'Tax rate (%)', type: 'number', group: 'field_specific', default: 8.25, step: 0.01 },
    { key: 'includedInPrice', label: 'Included in price', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['product_shipping_calculator', 'Shipping Calculator', 'payment', 'Truck', 'Compute shipping (flat/per-item/free-over)', '', 'pro', [
    { key: 'flatRate', label: 'Flat rate', type: 'number', group: 'field_specific', default: 9.99, step: 0.01 },
    { key: 'perItem', label: 'Per-item rate', type: 'number', group: 'field_specific', default: 0, step: 0.01 },
    { key: 'freeOverAmount', label: 'Free shipping over $', type: 'number', group: 'field_specific', default: 99 },
  ]],
  ['product_billing_address', 'Billing Address', 'payment', 'CreditCard', 'Address + "same as shipping" toggle', '', 'free', [
    { key: 'sameAsShipping', label: 'Show "same as shipping" toggle', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['product_invoice_generator', 'Invoice Generator', 'payment', 'FileText', 'Preview invoice with line items + total', 'NEW', 'business', [
    { key: 'prefix', label: 'Invoice prefix', type: 'text', group: 'field_specific', default: 'INV-' },
    { key: 'dueDays', label: 'Due in (days)', type: 'number', group: 'field_specific', default: 30, min: 0, max: 365 },
  ]],
];

export const PHASE_1_WIDGETS: FieldDefinition[] = WIDGET_SPECS.map(
  ([id, name, category, iconName, description, badge, tier, extraSettings, backendHandler]) => {
    // For payment widgets, inject the gateway's configFields (publishableKey,
    // secretKey, applicationId, etc.) into the inspector so users can enter
    // their API credentials. Reads the default gatewayId from extraSettings.
    const isPayment = category === 'payment' && id.startsWith('payment_');
    let settingsSchema = extraSettings ?? [];
    let widgetConfig: Record<string, unknown> = (extraSettings || []).reduce<Record<string, unknown>>((acc, s) => {
      if (s.default !== undefined) acc[s.key] = s.default;
      return acc;
    }, {});
    if (isPayment) {
      const gatewayIdSetting = (extraSettings || []).find((s) => s.key === 'gatewayId');
      const defaultGatewayId = (gatewayIdSetting?.default as string) || id.replace(/^payment_/, '');
      const credSettings = buildCredentialSettings(defaultGatewayId);
      if (credSettings.length > 0) {
        settingsSchema = [...settingsSchema, ...credSettings];
      }
    }
    return {
      id,
      name,
      category,
      iconName,
      description,
      badge: (badge || undefined) as FieldDefinition['badge'],
      tier: tier as FieldDefinition['tier'],
      backendHandler: backendHandler as FieldDefinition['backendHandler'],
      createField: (label?: string) => ({
        label: label ?? name,
        type: 'control_widget',
        widgetType: id,
        widgetConfig,
        required: false,
      }),
      settingsSchema,
    };
  },
);
