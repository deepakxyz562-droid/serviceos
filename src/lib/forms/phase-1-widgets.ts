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
  ]],
  ['single_choice_widget', 'Single Choice (Radio)', 'choice', 'CircleDot', 'Radio button options', '', 'free', [
    { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
    { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
    { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
    { key: 'columns', label: 'Columns', type: 'segmented', group: 'field_specific', default: '1', options: [
      { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: 'Inline', value: 'inline' },
    ] },
  ]],
  ['multiple_choice_widget', 'Multiple Choice (Checkbox)', 'choice', 'CheckSquare', 'Multi-select checkboxes', '', 'free', [
    { key: 'options', label: 'Options', type: 'options_editor', group: 'field_specific' },
    { key: 'allowOther', label: 'Allow "Other"', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Let users type a custom answer not in the list.' },
    { key: 'otherText', label: '"Other" placeholder text', type: 'text', group: 'field_specific', default: 'Other', condition: { dependsOn: 'allowOther', equals: 'true' } },
    { key: 'minSelect', label: 'Min selections', type: 'number', group: 'field_specific', default: 0, min: 0, helpText: 'Minimum number of options the user must select.' },
    { key: 'maxSelect', label: 'Max selections (0 = unlimited)', type: 'number', group: 'field_specific', default: 0, min: 0 },
    { key: 'columns', label: 'Columns', type: 'segmented', group: 'field_specific', default: '1', options: [
      { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: 'Inline', value: 'inline' },
    ] },
  ]],
  ['image_choice', 'Image Choice', 'choice', 'Image', 'Visual radio with images per option', 'NEW', 'pro', [
    { key: 'options', label: 'Image Options', type: 'options_editor', group: 'field_specific' },
    { key: 'multiSelect', label: 'Allow multi-select', type: 'boolean', group: 'field_specific', default: false },
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
    { key: 'allowDuplicates', label: 'Allow duplicates', type: 'boolean', group: 'field_specific', default: false },
  ]],
  ['mask_input', 'Masked Input', 'choice', 'AsteriskSquare', 'Phone/SSN/custom mask', '', 'pro', [
    { key: 'mask', label: 'Mask pattern (9=digit, A=letter, *=any)', type: 'text', group: 'field_specific', default: '(999) 999-9999' },
    { key: 'placeholder', label: 'Placeholder char', type: 'text', group: 'field_specific', default: '_' },
  ]],
  ['password', 'Password', 'choice', 'Lock', 'Password with strength meter', '', 'pro', [
    { key: 'showStrength', label: 'Show strength meter', type: 'boolean', group: 'field_specific', default: true },
    { key: 'minLen', label: 'Min length', type: 'number', group: 'field_specific', default: 8, min: 4, max: 128 },
    { key: 'requireSymbol', label: 'Require symbol', type: 'boolean', group: 'field_specific', default: true },
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
    { key: 'defaultToday', label: 'Default to today', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Pre-fill the date with today\'s date.' },
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
  ['date_time', 'Date & Time', 'datetime', 'CalendarClock', 'Combined date + time picker', '', 'free'],
  ['appointment', 'Appointment Booking', 'datetime', 'CalendarCheck', 'Time-slot booking with availability', 'POPULAR', 'pro', [
    { key: 'duration', label: 'Duration (minutes)', type: 'number', group: 'field_specific', default: 30, min: 5, max: 480 },
    { key: 'interval', label: 'Slot interval (minutes)', type: 'number', group: 'field_specific', default: 30, min: 5, max: 120 },
    { key: 'leadTime', label: 'Min lead time (hours)', type: 'number', group: 'field_specific', default: 24, min: 0 },
  ]],
  ['birth_date', 'Birth Date', 'datetime', 'Cake', 'Date picker with min/max age', '', 'free', [
    { key: 'minAge', label: 'Min age', type: 'number', group: 'field_specific', default: 0, min: 0 },
    { key: 'maxAge', label: 'Max age', type: 'number', group: 'field_specific', default: 120 },
  ]],
  ['date_range', 'Date Range', 'datetime', 'CalendarRange', 'Pick start and end date', '', 'pro', [
    { key: 'minNights', label: 'Min nights', type: 'number', group: 'field_specific', default: 1, min: 0 },
    { key: 'maxNights', label: 'Max nights', type: 'number', group: 'field_specific', default: 30 },
    { key: 'disablePast', label: 'Disable past dates', type: 'boolean', group: 'field_specific', default: true },
  ]],
  ['recurring_date', 'Recurring Date', 'datetime', 'RefreshCw', 'RRULE-based recurrence', 'NEW', 'business', [
    { key: 'freq', label: 'Frequency', type: 'select', group: 'field_specific', default: 'weekly', options: [
      { label: 'Daily', value: 'daily' }, { label: 'Weekly', value: 'weekly' }, { label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' },
    ] },
    { key: 'interval', label: 'Interval (every N)', type: 'number', group: 'field_specific', default: 1, min: 1 },
  ]],
  ['timezone_picker', 'Timezone Picker', 'datetime', 'Globe', 'Select timezone from list', '', 'free', [
    { key: 'defaultBrowser', label: 'Default to browser TZ', type: 'boolean', group: 'field_specific', default: true },
    { key: 'format', label: 'Display format', type: 'select', group: 'field_specific', default: 'full', options: [
      { label: 'Full (America/New_York)', value: 'full' }, { label: 'Abbreviated (EST)', value: 'abbrev' },
    ] },
  ]],
  ['countdown_timer', 'Countdown Timer', 'datetime', 'Timer', 'Form-wide timer that auto-submits at 0', 'NEW', 'pro', [
    { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number', group: 'field_specific', default: 15, min: 1, max: 180 },
    { key: 'autoSubmitOnExpiry', label: 'Auto-submit on expiry', type: 'boolean', group: 'field_specific', default: true },
    { key: 'warnAt', label: 'Warn at (minutes left)', type: 'number', group: 'field_specific', default: 1 },
  ]],
  ['weekly_planner', 'Weekly Appointment Planner', 'datetime', 'CalendarClock', 'Day-by-day time slots with limits', 'POPULAR', 'business', [
    { key: 'slotDurationMinutes', label: 'Slot duration (min)', type: 'number', group: 'field_specific', default: 60, min: 15, max: 240 },
    { key: 'maxPerSlot', label: 'Max per slot', type: 'number', group: 'field_specific', default: 1, min: 1, max: 20 },
  ]],

  // ─── Contact (5) ────────────────────────────────────────────────────────────
  ['email_widget', 'Email Address', 'contact', 'Mail', 'Validated email input', 'POPULAR', 'free', [
    { key: 'confirmation', label: 'Require confirmation', type: 'boolean', group: 'field_specific', default: false },
    { key: 'blockFreeDomains', label: 'Block free domains (gmail/yahoo)', type: 'boolean', group: 'field_specific', default: false },
  ]],
  ['phone_widget', 'Phone Number', 'contact', 'Phone', 'International phone input', '', 'free', [
    { key: 'defaultCountry', label: 'Default country', type: 'text', group: 'field_specific', default: 'US' },
    { key: 'validateMobile', label: 'Validate as mobile', type: 'boolean', group: 'field_specific', default: false },
    { key: 'format', label: 'Display format', type: 'select', group: 'field_specific', default: 'international', options: [
      { label: 'International', value: 'international' }, { label: 'National', value: 'national' }, { label: 'E.164', value: 'e164' },
    ] },
  ]],
  ['full_name', 'Full Name (First/Last)', 'contact', 'User', 'First + last name combined', '', 'free', [
    { key: 'middleName', label: 'Include middle name', type: 'boolean', group: 'field_specific', default: false },
    { key: 'prefix', label: 'Include prefix (Mr/Ms/Dr)', type: 'boolean', group: 'field_specific', default: false },
  ]],
  ['address_widget', 'Address', 'contact', 'MapPin', 'International address with country/state', '', 'free', [
    { key: 'countryDefault', label: 'Default country', type: 'text', group: 'field_specific', default: 'US' },
    { key: 'stateMode', label: 'State field type', type: 'select', group: 'field_specific', default: 'dropdown', options: [
      { label: 'Dropdown', value: 'dropdown' }, { label: 'Free text', value: 'text' },
    ] },
    { key: 'includeLatLon', label: 'Capture lat/long', type: 'boolean', group: 'field_specific', default: false },
  ]],
  ['company', 'Company Name', 'contact', 'Building', 'Company name with industry suggest', '', 'free', [
    { key: 'industrySuggest', label: 'Show industry suggestions', type: 'boolean', group: 'field_specific', default: true },
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
    { key: 'zoomable', label: 'Enable zoom', type: 'boolean', group: 'field_specific', default: true },
  ]],
  ['draw_on_image', 'Draw on Image', 'media', 'Edit3', 'Annotate a base image', 'NEW', 'business', [
    { key: 'baseImage', label: 'Base image URL', type: 'text', group: 'field_specific', placeholder: 'https://...' },
    { key: 'defaultThickness', label: 'Default brush thickness', type: 'number', group: 'field_specific', default: 3, min: 1, max: 20 },
  ]],
  ['photo_watermark', 'Photo Watermark', 'media', 'Stamp', 'Auto-overlay timestamp/GPS on photos', 'PRO', 'business', [
    { key: 'includeTimestamp', label: 'Include timestamp', type: 'boolean', group: 'field_specific', default: true },
    { key: 'includeGps', label: 'Include GPS coords', type: 'boolean', group: 'field_specific', default: true },
    { key: 'watermarkPosition', label: 'Position', type: 'select', group: 'field_specific', default: 'bottom_right', options: [
      { label: 'Top left', value: 'top_left' }, { label: 'Top right', value: 'top_right' },
      { label: 'Bottom left', value: 'bottom_left' }, { label: 'Bottom right', value: 'bottom_right' },
    ] },
  ]],
  ['image_scanner_ocr', 'Image Scanner (OCR)', 'media', 'ScanLine', 'Scan receipt/ID → auto-fill form', 'AI', 'business', [
    { key: 'autoExtract', label: 'Auto-extract data', type: 'boolean', group: 'field_specific', default: true },
    { key: 'targetDocument', label: 'Document type', type: 'select', group: 'field_specific', default: 'any', options: [
      { label: 'Any', value: 'any' }, { label: 'Receipt', value: 'receipt' }, { label: 'ID card', value: 'id' },
      { label: 'Invoice', value: 'invoice' }, { label: 'Custom', value: 'custom' },
    ] },
  ], 'ocr'],
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
  ['drawing_board', 'Drawing Board', 'media', 'PenTool', 'Blank whiteboard for sketches', '', 'pro', [
    { key: 'canvasHeight', label: 'Canvas height (px)', type: 'number', group: 'field_specific', default: 300, min: 100, max: 800 },
    { key: 'backgroundColor', label: 'Background color', type: 'color', group: 'field_specific', default: '#ffffff' },
  ]],
  ['speech_to_text', 'Speech to Text', 'media', 'MicVocal', 'Real-time speech transcription', 'AI', 'business', [
    { key: 'continuous', label: 'Continuous mode', type: 'boolean', group: 'field_specific', default: false },
    { key: 'language', label: 'Language', type: 'text', group: 'field_specific', default: 'en-US' },
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
  ['adobe_sign', 'Adobe Sign', 'signature', 'FileSignature', 'Enterprise e-signature workflow', 'PRO', 'business', [
    { key: 'embedUrl', label: 'Adobe Sign embed URL', type: 'text', group: 'field_specific' },
    { key: 'templateId', label: 'Template ID', type: 'text', group: 'field_specific' },
  ]],
  ['docusign', 'DocuSign', 'signature', 'FileCheck', 'DocuSign envelope integration', 'PRO', 'business', [
    { key: 'embedUrl', label: 'DocuSign embed URL', type: 'text', group: 'field_specific' },
    { key: 'templateId', label: 'Template ID', type: 'text', group: 'field_specific' },
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
  ['qrcode_scanner', 'QR Code Scanner', 'file', 'QrCode', 'Camera-based QR scan', '', 'pro'],
  ['barcode_scanner', 'Barcode Scanner', 'file', 'Scan', 'Camera-based barcode scan', '', 'pro', [
    { key: 'formats', label: 'Supported formats (comma-sep)', type: 'text', group: 'field_specific', default: 'code128, ean13, code39' },
  ]],
  ['nfc_tag_reader', 'NFC Tag Reader', 'file', 'Nfc', 'Web NFC tag reader', 'NEW', 'business'],

  // ─── Calculations (8) ──────────────────────────────────────────────────────────
  ['loan_emi', 'Loan EMI Calculator', 'calculation', 'Percent', 'Monthly installment + amortization', 'NEW', 'business', [
    { key: 'defaultRatePct', label: 'Default interest rate (%)', type: 'number', group: 'field_specific', default: 7.5, step: 0.1 },
    { key: 'defaultTermYears', label: 'Default term (years)', type: 'number', group: 'field_specific', default: 5, min: 1, max: 30 },
  ]],
  ['spreadsheet', 'Spreadsheet Widget', 'calculation', 'Table', 'Excel-style editable grid with formulas', '', 'business', [
    { key: 'rows', label: 'Default rows', type: 'number', group: 'field_specific', default: 5, min: 1, max: 50 },
    { key: 'columns', label: 'Default columns', type: 'number', group: 'field_specific', default: 4, min: 1, max: 20 },
    { key: 'enableFormulas', label: 'Enable formulas (SUM/AVG/PRODUCT)', type: 'boolean', group: 'field_specific', default: true },
  ]],
  ['spreadsheet_to_form', 'Spreadsheet to Form', 'calculation', 'FileSpreadsheet', 'Upload Excel/CSV → autofill by code', 'PRO', 'business', [
    { key: 'accessCodeField', label: 'Access code column', type: 'text', group: 'field_specific', default: 'code' },
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
  ['percentage_calculator', 'Percentage Calculator', 'calculation', 'Percent', 'X is what % of Y', '', 'free'],

  // ─── Survey (7) ────────────────────────────────────────────────────────────────
  ['star_rating_comments', 'Star Rating + Comments', 'survey', 'Star', '5-star with required comment on low', 'POPULAR', 'pro', [
    { key: 'maxStars', label: 'Max stars', type: 'number', group: 'field_specific', default: 5, min: 3, max: 10 },
    { key: 'requireCommentOnLowRating', label: 'Require comment below threshold', type: 'boolean', group: 'field_specific', default: true },
    { key: 'threshold', label: 'Threshold', type: 'number', group: 'field_specific', default: 3 },
  ]],
  ['like_dislike', 'Like / Dislike', 'survey', 'ThumbsUp', 'Binary thumbs up/down', '', 'free', [
    { key: 'showLiveCounts', label: 'Show live counts', type: 'boolean', group: 'field_specific', default: true },
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
  ['thumb_rating', 'Thumb Rating', 'survey', 'ThumbsUp', 'Single thumb up/down', '', 'free'],

  // ─── Productivity (5) ──────────────────────────────────────────────────────────
  ['configurable_list_v2', 'Configurable List (v2)', 'productivity', 'ListOrdered', 'Dynamic repeater with custom columns', 'POPULAR', 'pro', [
    { key: 'minRows', label: 'Min rows', type: 'number', group: 'field_specific', default: 1, min: 0 },
    { key: 'maxRows', label: 'Max rows (0 = unlimited)', type: 'number', group: 'field_specific', default: 20 },
    { key: 'columns', label: 'Columns (JSON)', type: 'json', group: 'field_specific' },
  ]],
  ['infinite_list', 'Infinite List', 'productivity', 'ListPlus', 'Add-as-many rows itemizer', '', 'free', [
    { key: 'placeholder', label: 'Placeholder', type: 'text', group: 'field_specific', default: 'Enter item...' },
    { key: 'addButtonText', label: 'Add button text', type: 'text', group: 'field_specific', default: '+ Add Another' },
  ]],
  ['orderable_list', 'Orderable List', 'productivity', 'ArrowUpDown', 'Drag-and-drop ranking', '', 'pro', [
    { key: 'items', label: 'Items (JSON array of strings)', type: 'json', group: 'field_specific' },
  ]],
  ['unique_id_generator', 'Unique ID Generator', 'productivity', 'Barcode', 'Sequential prefix-coded IDs', '', 'pro', [
    { key: 'prefix', label: 'Prefix', type: 'text', group: 'field_specific', default: 'REF-' },
    { key: 'startNumber', label: 'Start number', type: 'number', group: 'field_specific', default: 1001, min: 1 },
    { key: 'padding', label: 'Zero-pad length', type: 'number', group: 'field_specific', default: 5, min: 1, max: 10 },
  ]],
  ['terms_and_conditions', 'Terms & Conditions', 'productivity', 'ScrollText', 'Scrollable legal modal + accept checkbox', 'POPULAR', 'free', [
    { key: 'termsText', label: 'Terms text', type: 'textarea', group: 'field_specific' },
    { key: 'isMandatory', label: 'Mandatory acceptance', type: 'boolean', group: 'field_specific', default: true },
    { key: 'requireScroll', label: 'Require scroll to bottom', type: 'boolean', group: 'field_specific', default: true },
  ]],

  // ─── Payment Gateways (20) — UI scaffolding only ────────────────────────────
  ...([
    ['payment_stripe_elements', 'Stripe Elements', 'CreditCard', 'Inline card fields (Visa/MC/Amex)', 'POPULAR', 'pro'],
    ['payment_stripe_checkout', 'Stripe Checkout', 'CreditCard', 'Hosted Stripe payment page', 'POPULAR', 'pro'],
    ['payment_paypal', 'PayPal', 'Wallet', 'PayPal + Venmo + Pay in 4', 'POPULAR', 'pro'],
    ['payment_paypal_pro', 'PayPal Pro', 'CreditCard', 'Card fields hosted by PayPal Pro', 'PRO', 'business'],
    ['payment_square', 'Square', 'CreditCard', 'Square payment form with Cash App Pay', 'POPULAR', 'pro'],
    ['payment_apple_pay', 'Apple Pay', 'Wallet', 'Apple Pay button (Apple devices only)', 'NEW', 'pro'],
    ['payment_google_pay', 'Google Pay', 'Wallet', 'Google Pay button', 'NEW', 'pro'],
    ['payment_razorpay', 'Razorpay (India)', 'CreditCard', 'Razorpay checkout (UPI/cards)', 'POPULAR', 'pro'],
    ['payment_payu_india', 'PayU India', 'CreditCard', 'PayU India redirect checkout', '', 'pro'],
    ['payment_payu_latam', 'PayU Latam', 'CreditCard', 'PayU Latam redirect checkout', '', 'pro'],
    ['payment_authorize_net', 'Authorize.Net', 'CreditCard', 'Accept.js card form', '', 'pro'],
    ['payment_braintree', 'Braintree', 'CreditCard', 'Braintree hosted fields', '', 'pro'],
    ['payment_mollie', 'Mollie', 'CreditCard', 'Mollie redirect checkout', '', 'pro'],
    ['payment_twocheckout', '2Checkout', 'CreditCard', '2Checkout redirect', '', 'pro'],
    ['payment_worldpay', 'Worldpay', 'CreditCard', 'Worldpay redirect', '', 'pro'],
    ['payment_bluesnap', 'BlueSnap', 'CreditCard', 'BlueSnap redirect', '', 'pro'],
    ['payment_klarna', 'Klarna BNPL', 'Wallet', 'Buy now pay later', 'NEW', 'business'],
    ['payment_afterpay', 'Afterpay / Clearpay', 'Wallet', 'Pay in 4 installments', 'NEW', 'business'],
    ['payment_affirm', 'Affirm BNPL', 'Wallet', 'Pay over time', 'NEW', 'business'],
    ['payment_coinbase_commerce', 'Coinbase Commerce', 'Wallet', 'Crypto payments', 'NEW', 'business'],
  ] as WidgetSpec[]).map(([id, name, iconName, description, badge, tier]) => [
    id, name, 'payment' as const, iconName, description, badge, tier,
    [
      // ─── Payment Connection (JotForm exact match) ─────────────────────────────
      {
        key: 'gatewayId', label: 'Payment Connection', type: 'gateway_picker',
        group: 'field_specific' as const, default: id.replace(/^payment_/, ''),
        options: [
          { label: 'Stripe', value: 'stripe_elements' },
          { label: 'Stripe Checkout (Hosted)', value: 'stripe_checkout' },
          { label: 'PayPal', value: 'paypal' },
          { label: 'PayPal Pro', value: 'paypal_pro' },
          { label: 'Square', value: 'square' },
          { label: 'Apple Pay', value: 'apple_pay' },
          { label: 'Google Pay', value: 'google_pay' },
          { label: 'Razorpay (India)', value: 'razorpay' },
          { label: 'PayU India', value: 'payu_india' },
          { label: 'PayU Latam', value: 'payu_latam' },
          { label: 'Authorize.Net', value: 'authorize_net' },
          { label: 'Braintree', value: 'braintree' },
          { label: 'Mollie', value: 'mollie' },
          { label: '2Checkout', value: 'twocheckout' },
          { label: 'Worldpay', value: 'worldpay' },
          { label: 'BlueSnap', value: 'bluesnap' },
          { label: 'Klarna BNPL', value: 'klarna' },
          { label: 'Afterpay / Clearpay', value: 'afterpay' },
          { label: 'Affirm BNPL', value: 'affirm' },
          { label: 'Coinbase Commerce (Crypto)', value: 'coinbase_commerce' },
        ],
        helpText: `Connected to ${name}. Add a connection to start collecting payments.`,
      },
      // ─── Payment Type (JotForm exact match) ───────────────────────────────────
      {
        key: 'paymentType', label: 'Payment Type', type: 'select',
        group: 'field_specific' as const, default: 'products',
        options: [
          { label: 'Sell Products', value: 'products' },
          { label: 'Sell Subscriptions', value: 'subscriptions' },
          { label: 'Sell Single Product', value: 'single' },
          { label: 'User Defined Amount (Donation)', value: 'donation' },
        ],
      },
      // ─── Currency (JotForm searchable dropdown) ───────────────────────────────
      {
        key: 'currency', label: 'Currency', type: 'currency_search',
        group: 'field_specific' as const, default: 'USD',
        searchPlaceholder: 'Search currency...',
        options: [
          { label: 'USD - United States Dollars', value: 'USD' },
          { label: 'EUR - Euros', value: 'EUR' },
          { label: 'GBP - British Pounds', value: 'GBP' },
          { label: 'INR - Indian Rupees', value: 'INR' },
          { label: 'AUD - Australian Dollars', value: 'AUD' },
          { label: 'CAD - Canadian Dollars', value: 'CAD' },
          { label: 'JPY - Japanese Yen', value: 'JPY' },
          { label: 'BRL - Brazilian Reals', value: 'BRL' },
          { label: 'MXN - Mexican Pesos', value: 'MXN' },
          { label: 'CNY - Chinese Yuan', value: 'CNY' },
          { label: 'SGD - Singapore Dollars', value: 'SGD' },
          { label: 'AED - UAE Dirhams', value: 'AED' },
          { label: 'ZAR - South African Rand', value: 'ZAR' },
        ],
      },
      // ─── Payment Methods (JotForm multi-checkbox) ─────────────────────────────
      {
        key: 'paymentMethods', label: 'Payment Methods', type: 'multi_checkbox',
        group: 'field_specific' as const,
        default: ['card', 'paypal_checkout'],
        options: [
          { label: 'Debit & Credit Card', value: 'card' },
          { label: 'PayPal Checkout', value: 'paypal_checkout' },
          { label: 'Fastlane', value: 'fastlane' },
          { label: 'Apple Pay', value: 'apple_pay' },
          { label: 'Google Pay', value: 'google_pay' },
          { label: 'Charge Customer Later', value: 'charge_later' },
        ],
        helpText: 'Select which payment methods to offer. "Charge Customer Later" lets you manually charge the card in 3 days after the form is submitted.',
      },
      // ─── Billing Address (JotForm segmented: Required | Optional | Hidden) ──
      {
        key: 'billingAddress', label: 'Billing Address', type: 'segmented',
        group: 'field_specific' as const, default: 'required',
        options: [
          { label: 'Required', value: 'required' },
          { label: 'Optional', value: 'optional' },
          { label: 'Hidden', value: 'hidden' },
        ],
      },
      // ─── Pay Later Message ───────────────────────────────────────────────────
      {
        key: 'payLaterMessage', label: 'Pay Later Message', type: 'text',
        group: 'field_specific' as const,
        placeholder: 'Pay in 4 interest-free installments',
        helpText: 'Message shown to customer when Pay Later / BNPL is available.',
        condition: { dependsOn: 'paymentMethods', equals: 'charge_later' },
      },
      // ─── PayPal Smart Buttons (toggle) ──────────────────────────────────────
      {
        key: 'paypalSmartButtons', label: 'PayPal Smart Buttons', type: 'toggle_with_description',
        group: 'field_specific' as const, default: false,
        description: 'Show PayPal Smart Buttons (Pay in 4, Venmo, Pay Later) on the form.',
      },
      // ─── Integration Mode (BYOK vs Managed) ─────────────────────────────────
      {
        key: 'provider', label: 'Integration Mode', type: 'segmented',
        group: 'field_specific' as const, default: 'managed',
        options: [
          { label: '🚀 Managed (1-click)', value: 'managed' },
          { label: '⚙️ BYOK', value: 'byok' },
        ],
      },
      {
        key: 'publishableKey', label: 'Publishable Key', type: 'text',
        group: 'field_specific' as const, placeholder: 'pk_live_...',
        condition: { dependsOn: 'provider', equals: 'byok' },
      },
      {
        key: 'secretKey', label: 'Secret Key', type: 'text',
        group: 'field_specific' as const, placeholder: 'sk_live_...',
        condition: { dependsOn: 'provider', equals: 'byok' },
      },
      // ─── Charge Mode (legacy — kept for backward compat) ─────────────────────
      {
        key: 'pricingMode', label: 'Charge Mode', type: 'select',
        group: 'field_specific' as const, default: 'fixed',
        options: [
          { label: 'Fixed amount', value: 'fixed' },
          { label: 'Calculated from form fields', value: 'formula' },
          { label: 'User-entered (donation)', value: 'user_input' },
        ],
      },
      {
        key: 'amount', label: 'Amount', type: 'number',
        group: 'field_specific' as const, default: 49.0, step: 0.01,
        condition: { dependsOn: 'pricingMode', equals: 'fixed' },
      },
      // ─── Sandbox Test Mode (toggle with description) ─────────────────────────
      {
        key: 'testMode', label: 'Sandbox Test Mode', type: 'toggle_with_description',
        group: 'field_specific' as const, default: true,
        description: 'Test payments without charging real credit cards.',
      },
    ] satisfies SettingField[],
    'payment' as const,
  ] satisfies WidgetSpec),

  // ─── Products (10) ────────────────────────────────────────────────────────────
  ['product_single', 'Single Product', 'payment', 'Package', 'Single product card with qty selector', '', 'pro', [
    { key: 'name', label: 'Product name', type: 'text', group: 'field_specific' },
    { key: 'price', label: 'Price', type: 'number', group: 'field_specific', default: 49.0, step: 0.01 },
    { key: 'image', label: 'Image URL', type: 'text', group: 'field_specific' },
    { key: 'qtyEditable', label: 'Allow qty edit', type: 'boolean', group: 'field_specific', default: true },
  ]],
  ['product_multiple', 'Multiple Products', 'payment', 'Boxes', 'Grid of products with qty selectors', '', 'business', [
    { key: 'products', label: 'Products', type: 'product_editor', group: 'field_specific' },
    { key: 'showImages', label: 'Show product images', type: 'boolean', group: 'field_specific', default: true },
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
    { key: 'allowCustom', label: 'Allow custom amount', type: 'boolean', group: 'field_specific', default: true },
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
    { key: 'includedInPrice', label: 'Included in price', type: 'boolean', group: 'field_specific', default: false },
  ]],
  ['product_shipping_calculator', 'Shipping Calculator', 'payment', 'Truck', 'Compute shipping (flat/per-item/free-over)', '', 'pro', [
    { key: 'flatRate', label: 'Flat rate', type: 'number', group: 'field_specific', default: 9.99, step: 0.01 },
    { key: 'perItem', label: 'Per-item rate', type: 'number', group: 'field_specific', default: 0, step: 0.01 },
    { key: 'freeOverAmount', label: 'Free shipping over $', type: 'number', group: 'field_specific', default: 99 },
  ]],
  ['product_billing_address', 'Billing Address', 'payment', 'CreditCard', 'Address + "same as shipping" toggle', '', 'free', [
    { key: 'sameAsShipping', label: 'Show "same as shipping" toggle', type: 'boolean', group: 'field_specific', default: true },
  ]],
  ['product_invoice_generator', 'Invoice Generator', 'payment', 'FileText', 'Preview invoice with line items + total', 'NEW', 'business', [
    { key: 'prefix', label: 'Invoice prefix', type: 'text', group: 'field_specific', default: 'INV-' },
    { key: 'dueDays', label: 'Due in (days)', type: 'number', group: 'field_specific', default: 30, min: 0, max: 365 },
  ]],
];

export const PHASE_1_WIDGETS: FieldDefinition[] = WIDGET_SPECS.map(
  ([id, name, category, iconName, description, badge, tier, extraSettings, backendHandler]) => ({
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
      type: 'short_answer',
      widgetType: id,
      widgetConfig: (extraSettings || []).reduce<Record<string, unknown>>((acc, s) => {
        if (s.default !== undefined) acc[s.key] = s.default;
        return acc;
      }, {}),
      required: false,
    }),
    settingsSchema: extraSettings ?? [],
  }),
);
