/**
 * Phase 2 Widget Definitions — 105 productivity widgets.
 *
 * Uses the same compact data-driven tuple format as phase-1-widgets.ts.
 *
 * Categories:
 *   - maps (20)        - inventory (15)      - security (13)
 *   - regional (15)    - repeaters (12)      - embed (15)        - social (15)
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
  // ─── Maps & Geolocation (20) ────────────────────────────────────────────
  ['address_autocomplete_google', 'Address Autocomplete (Google)', 'maps', 'MapPin', 'Google Places address autocomplete', 'POPULAR', 'business', [
    { key: 'provider', label: 'Provider', type: 'segmented', group: 'field_specific', default: 'managed', options: [
      { label: '🚀 Fieseros Managed', value: 'managed' }, { label: 'BYOK (Your Key)', value: 'byok' },
    ] },
    { key: 'apiKey', label: 'Google API Key', type: 'text', group: 'field_specific', condition: { dependsOn: 'provider', equals: 'byok' } },
    { key: 'countryRestriction', label: 'Country Restriction (e.g. US, CA, GB)', type: 'text', group: 'field_specific' },
    { key: 'types', label: 'Places Type Filter', type: 'segmented', group: 'field_specific', default: 'address', options: [
      { label: 'Address Only', value: 'address' }, { label: 'Geocode / Cities', value: 'geocode' }, { label: 'Establishment / Business', value: 'establishment' },
    ] },
  ], 'maps'],
  ['address_autocomplete_osm', 'Address Autocomplete (OSM)', 'maps', 'MapPin', 'Free OpenStreetMap autocomplete', 'NEW', 'free', [
    { key: 'countrycodes', label: 'Country Codes (comma-sep)', type: 'text', group: 'field_specific', placeholder: 'us, ca, gb' },
    { key: 'placeholder', label: 'Search Placeholder', type: 'text', group: 'field_specific', default: 'Start typing an address...' },
  ]],
  ['elevation_lookup', 'Elevation Lookup', 'maps', 'Mountain', 'Get elevation for lat/lng', 'NEW', 'pro', [
    { key: 'unit', label: 'Elevation Unit', type: 'segmented', group: 'field_specific', default: 'feet', options: [
      { label: 'Feet (ft)', value: 'feet' }, { label: 'Meters (m)', value: 'meters' },
    ] },
  ]],
  ['geofence_checker', 'Geofence Checker', 'maps', 'ShieldCheck', 'Check if user is inside geofence', 'NEW', 'business', [
    { key: 'centerLat', label: 'Center Latitude', type: 'number', group: 'field_specific', step: 0.0001 },
    { key: 'centerLng', label: 'Center Longitude', type: 'number', group: 'field_specific', step: 0.0001 },
    { key: 'radiusMeters', label: 'Radius (Meters)', type: 'number', group: 'field_specific', default: 500, min: 10 },
    { key: 'strictMode', label: 'Block Submission Outside Fence', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Prevent submission if user is outside boundaries.' },
  ]],
  ['gps_location_coordinates', 'GPS Location Coordinates', 'maps', 'Crosshair', 'One-click GPS capture', 'POPULAR', 'free', [
    { key: 'autoCapture', label: 'Auto-capture on Form Load', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Request geolocation immediately when form opens.' },
    { key: 'highAccuracy', label: 'High Accuracy GPS Mode', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Enable GPS satellite triangulation on mobile devices.' },
  ]],
  ['ip_geolocation', 'IP Geolocation', 'maps', 'Globe', 'Get user location from IP', 'NEW', 'pro', [
    { key: 'showCity', label: 'Capture City', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'showCountry', label: 'Capture Country', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'showPostal', label: 'Capture Postal Code', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['map_pin_drop', 'Map Pin Drop', 'maps', 'MapPin', 'Click on map to drop pin', '', 'pro', [
    { key: 'defaultLat', label: 'Default Latitude', type: 'number', group: 'field_specific', default: 37.7749, step: 0.0001 },
    { key: 'defaultLng', label: 'Default Longitude', type: 'number', group: 'field_specific', default: -122.4194, step: 0.0001 },
    { key: 'defaultZoom', label: 'Zoom Level', type: 'number', group: 'field_specific', default: 12, min: 1, max: 20 },
  ]],
  ['map_polygon_drawer', 'Map Polygon Drawer', 'maps', 'Hexagon', 'Draw polygons on map', 'PRO', 'business', [
    { key: 'allowEdit', label: 'Allow respondent to edit polygon', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['map_radius_drawer', 'Map Radius Drawer', 'maps', 'Circle', 'Draw radius on map', 'PRO', 'business', [
    { key: 'maxRadiusKm', label: 'Max Radius (KM)', type: 'number', group: 'field_specific', default: 50, min: 1 },
  ]],
  ['reverse_geocode', 'Reverse Geocode', 'maps', 'MapPin', 'Lat/lng → address', 'NEW', 'pro', [
    { key: 'showFullAddress', label: 'Return Full Street Address', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['store_locator', 'Store Locator', 'maps', 'Store', 'Find nearest store via Haversine', 'POPULAR', 'pro', [
    { key: 'searchRadiusKm', label: 'Search Radius (KM)', type: 'number', group: 'field_specific', default: 50 },
  ]],
  ['street_view_address_search', 'Street View Address Search', 'maps', 'Eye', 'Google Places linked with 360° Street View', 'NEW', 'business', [
    { key: 'panoramaHeightPx', label: 'Panorama Height', type: 'dimension', group: 'field_specific', default: 300, unit: 'PX' },
    { key: 'defaultPitch', label: 'Default Pitch Angle', type: 'number', group: 'field_specific', default: 0, min: -90, max: 90 },
    { key: 'defaultHeading', label: 'Default Heading (Degrees)', type: 'number', group: 'field_specific', default: 0, min: 0, max: 360 },
  ], 'maps'],
  ['time_zone_from_location', 'Time Zone from Location', 'maps', 'Clock', 'Get timezone from lat/lng', 'NEW', 'pro', [
    { key: 'unit', label: 'Distance Unit (for radius queries)', type: 'select', group: 'field_specific', default: 'km', options: [
      { label: 'Kilometers', value: 'km' }, { label: 'Miles', value: 'miles' },
    ] },
  ], 'maps'],
  ['delivery_zone_checker', 'Delivery Zone Checker', 'maps', 'Truck', 'Validates postal code against zones', 'NEW', 'pro', [
    { key: 'zones', label: 'Zones (JSON: [{name, prefixes}])', type: 'json', group: 'field_specific' },
  ]],
  ['distance_matrix', 'Distance Matrix', 'maps', 'Grid', 'Multi-origin × destination distances', 'PRO', 'business', [
    { key: 'unit', label: 'Distance Unit', type: 'select', group: 'field_specific', default: 'km', options: [
      { label: 'Kilometers', value: 'km' }, { label: 'Miles', value: 'miles' },
    ] },
  ]],

  // ─── Inventory & Booking (15) ────────────────────────────────────────────
  ['inventory_dropdown', 'Inventory Dropdown', 'productivity', 'Package', 'Stock-aware dropdown with auto-disable', 'POPULAR', 'pro', [
    { key: 'items', label: 'Items Matrix (JSON: [{label, stock, price}])', type: 'json', group: 'field_specific', placeholder: '[{"label": "Item A", "stock": 10, "price": 19.99}]' },
    { key: 'lowStockThreshold', label: 'Low Stock Alert Threshold', type: 'number', group: 'field_specific', default: 3, min: 0 },
    { key: 'hideSoldOut', label: 'Hide Out of Stock Items', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Completely remove items with 0 stock instead of disabling.' },
  ]],
  ['stock_quantity_tracker', 'Stock Quantity Tracker', 'productivity', 'Boxes', 'Multi-product stock tracker', '', 'pro', [
    { key: 'allowBackorders', label: 'Allow Backorders', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['reservation_calendar', 'Reservation Calendar', 'productivity', 'Calendar', 'Calendar with reserved dates blocked', 'POPULAR', 'business', [
    { key: 'reservedDates', label: 'Reserved Dates (JSON array)', type: 'json', group: 'field_specific' },
    { key: 'minNights', label: 'Min Nights', type: 'number', group: 'field_specific', default: 1 },
    { key: 'maxNights', label: 'Max Nights', type: 'number', group: 'field_specific', default: 30 },
  ]],
  ['time_slot_booking', 'Time Slot Booking', 'productivity', 'Clock', 'Pick date → see slots → book', 'POPULAR', 'business', [
    { key: 'slotDuration', label: 'Slot Duration (Minutes)', type: 'number', group: 'field_specific', default: 30, min: 10, max: 240 },
    { key: 'maxPerSlot', label: 'Max Attendees per Slot', type: 'number', group: 'field_specific', default: 1, min: 1 },
  ]],
  ['resource_scheduler', 'Resource Scheduler', 'productivity', 'CalendarClock', 'Schedule resources over week', 'PRO', 'business', [
    { key: 'timezone', label: 'Timezone (IANA)', type: 'text', group: 'field_specific', placeholder: 'America/New_York' },
    { key: 'bufferMinutes', label: 'Buffer Between Bookings (min)', type: 'number', group: 'field_specific', default: 0, min: 0 },
  ]],
  ['equipment_rental', 'Equipment Rental', 'productivity', 'Wrench', 'Item, qty, dates, deposit', '', 'business', [
    { key: 'depositRequired', label: 'Security Deposit Required', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['room_booking', 'Room Booking', 'productivity', 'BedDouble', 'Hotel-style room booking', 'POPULAR', 'business', [
    { key: 'checkinTime', label: 'Check-in Time', type: 'text', group: 'field_specific', default: '15:00' },
    { key: 'checkoutTime', label: 'Check-out Time', type: 'text', group: 'field_specific', default: '11:00' },
  ]],
  ['class_registration', 'Class Registration', 'productivity', 'Users', 'Class/workshop with seat limits', '', 'pro', [
    { key: 'seats', label: 'Total Seats', type: 'number', group: 'field_specific', default: 20, min: 1 },
    { key: 'instructorName', label: 'Instructor Name', type: 'text', group: 'field_specific' },
  ]],
  ['waitlist_signup', 'Waitlist Signup', 'productivity', 'ListPlus', 'Waitlist when class is full', '', 'free', [
    { key: 'maxWaitlist', label: 'Max Waitlist Capacity', type: 'number', group: 'field_specific', default: 50 },
  ]],
  ['group_booking', 'Group Booking', 'productivity', 'Users', 'Group with multiple attendees', '', 'pro', [
    { key: 'minGroupSize', label: 'Min Group Size', type: 'number', group: 'field_specific', default: 2 },
    { key: 'maxGroupSize', label: 'Max Group Size', type: 'number', group: 'field_specific', default: 20 },
  ]],
  ['multi_day_booking', 'Multi-Day Booking', 'productivity', 'CalendarDays', 'Multi-day event booking', '', 'business', [
    { key: 'timezone', label: 'Timezone (IANA)', type: 'text', group: 'field_specific', placeholder: 'Europe/London' },
    { key: 'bufferMinutes', label: 'Buffer Between Days (min)', type: 'number', group: 'field_specific', default: 0, min: 0 },
  ]],
  ['appointment_confirmation', 'Appointment Confirmation', 'productivity', 'CheckCircle', 'Appointment summary + confirm', '', 'pro', [
    { key: 'requireSignature', label: 'Require Signature on Confirmation', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['delivery_window_selector', 'Delivery Window Selector', 'productivity', 'Truck', 'Pick delivery window', '', 'pro', [
    { key: 'leadTimeHours', label: 'Min Lead Time (Hours)', type: 'number', group: 'field_specific', default: 24 },
  ]],
  ['pickup_location_selector', 'Pickup Location Selector', 'productivity', 'Store', 'Pick from pickup locations', '', 'free', [
    { key: 'timezone', label: 'Timezone (IANA)', type: 'text', group: 'field_specific', placeholder: 'America/Los_Angeles' },
    { key: 'bufferMinutes', label: 'Pickup Prep Buffer (min)', type: 'number', group: 'field_specific', default: 30, min: 0 },
  ]],
  ['capacity_counter', 'Capacity Counter', 'productivity', 'Gauge', 'Shows remaining capacity', '', 'free', [
    { key: 'capacity', label: 'Total Capacity', type: 'number', group: 'field_specific', default: 50, min: 1 },
    { key: 'showRemaining', label: 'Display Remaining Spots', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],

  // ─── Security & Verification (13) ────────────────────────────────────────
  ['email_otp_verification', 'Email OTP Verification', 'security', 'MailCheck', '6-digit email OTP verification', 'POPULAR', 'pro', [
    { key: 'emailFieldId', label: 'Target Email Field', type: 'field_selector', group: 'field_specific', helpText: 'Select form email field to verify.' },
    { key: 'codeLength', label: 'Code Length (Digits)', type: 'segmented', group: 'field_specific', default: '6', options: [{ label: '4 Digits', value: '4' }, { label: '6 Digits', value: '6' }] },
    { key: 'expiryMinutes', label: 'Code Expiration (Minutes)', type: 'number', group: 'field_specific', default: 15, min: 1, max: 60 },
    { key: 'senderName', label: 'Sender Display Name', type: 'text', group: 'field_specific', default: 'Fieseros Security' },
  ], 'otp_email'],
  ['sms_otp_confirmation', 'SMS OTP Confirmation', 'security', 'MessageSquare', '6-digit SMS verification code', 'POPULAR', 'pro', [
    { key: 'phoneFieldId', label: 'Target Phone Field', type: 'field_selector', group: 'field_specific', helpText: 'Select form phone field to send SMS to.' },
    { key: 'codeLength', label: 'Code Length', type: 'segmented', group: 'field_specific', default: '6', options: [{ label: '4 Digits', value: '4' }, { label: '6 Digits', value: '6' }] },
    { key: 'expiryMinutes', label: 'Code Expiration (Minutes)', type: 'number', group: 'field_specific', default: 10, min: 1, max: 60 },
  ], 'otp_sms'],
  ['friendly_captcha', 'Friendly Captcha', 'security', 'ShieldCheck', 'Friendly-captcha-style widget', 'NEW', 'free', [
    { key: 'siteKey', label: 'FriendlyCaptcha Site Key', type: 'text', group: 'field_specific', placeholder: 'FC...' },
    { key: 'language', label: 'Language', type: 'select', group: 'field_specific', default: 'en', options: [{ label: 'English', value: 'en' }, { label: 'Spanish', value: 'es' }, { label: 'French', value: 'fr' }, { label: 'German', value: 'de' }] },
    { key: 'darkMode', label: 'Dark Mode', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Use dark theme for the captcha widget.' },
  ]],
  ['math_captcha', 'Math Captcha', 'security', 'Calculator', 'Simple math captcha equation', '', 'free', [
    { key: 'difficulty', label: 'Difficulty', type: 'segmented', group: 'field_specific', default: 'easy', options: [
      { label: 'Easy (Addition/Subtraction)', value: 'easy' }, { label: 'Medium (Multiplication)', value: 'medium' },
    ] },
  ]],
  ['image_captcha_slider', 'Image Slider Captcha', 'security', 'MoveHorizontal', 'Drag-to-verify slider', 'NEW', 'free', [
    { key: 'siteKey', label: 'Site Key', type: 'text', group: 'field_specific' },
    { key: 'theme', label: 'Widget Theme', type: 'select', group: 'field_specific', default: 'light', options: [
      { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'Auto', value: 'auto' },
    ] },
  ]],
  ['identity_verification_kyc', 'Identity Verification (KYC)', 'security', 'IdCard', 'Persona/Onfido KYC verification', 'PRO', 'business', [
    { key: 'siteKey', label: 'Site Key / Public API Key', type: 'text', group: 'field_specific' },
    { key: 'theme', label: 'Widget Theme', type: 'select', group: 'field_specific', default: 'light', options: [
      { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'Auto', value: 'auto' },
    ] },
  ], 'kyc'],
  ['two_factor_auth', '2FA Code Input', 'security', 'KeyRound', '6-box 2FA code input', '', 'pro', [
    { key: 'siteKey', label: 'Site Key (TOTP secret ref)', type: 'text', group: 'field_specific' },
    { key: 'theme', label: 'Widget Theme', type: 'select', group: 'field_specific', default: 'light', options: [
      { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'Auto', value: 'auto' },
    ] },
  ]],
  ['password_strength_meter', 'Password Strength Meter', 'security', 'Lock', 'Password with live strength indicator', 'POPULAR', 'free', [
    { key: 'minLen', label: 'Min Password Length', type: 'number', group: 'field_specific', default: 8, min: 6 },
    { key: 'requireSymbols', label: 'Require Special Characters', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['whatsapp_chat_button', 'WhatsApp Chat Button', 'social', 'MessageCircle', 'Direct WhatsApp launcher button', 'POPULAR', 'free', [
    { key: 'phoneNumber', label: 'Business WhatsApp Number (with country code)', type: 'text', group: 'field_specific', placeholder: '+1 555 123 4567' },
    { key: 'prefilledMessage', label: 'Pre-filled Greeting Message', type: 'textarea', group: 'field_specific', default: 'Hi! I have a question regarding my form submission.' },
    { key: 'buttonText', label: 'Button Label', type: 'text', group: 'field_specific', default: 'Chat on WhatsApp' },
  ]],
  ['gdpr_consent_banner', 'GDPR Consent Banner', 'security', 'ScrollText', 'GDPR consent checkbox with policy link', 'NEW', 'free', [
    { key: 'consentText', label: 'Consent Statement', type: 'textarea', group: 'field_specific', default: 'I agree to the processing of my personal data according to the privacy policy.' },
    { key: 'privacyUrl', label: 'Privacy Policy URL', type: 'text', group: 'field_specific' },
    { key: 'isMandatory', label: 'Mandatory Acceptance', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['consent_log', 'Consent Log', 'security', 'FileCheck', 'Logs consent with timestamp + IP', 'PRO', 'business', [
    { key: 'siteKey', label: 'Site Key (audit binding)', type: 'text', group: 'field_specific' },
    { key: 'theme', label: 'Widget Theme', type: 'select', group: 'field_specific', default: 'light', options: [
      { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }, { label: 'Auto', value: 'auto' },
    ] },
  ]],

  // ─── Regional & Identity (15) ─────────────────────────────────────────────
  ['canada_provinces', 'Canada Provinces', 'regional', 'Flag', '10 provinces + 3 territories', '', 'free', [
    { key: 'includeTerritories', label: 'Include Territories (YT, NT, NU)', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['uk_counties', 'UK Counties', 'regional', 'Flag', 'UK counties + countries', '', 'free', [
    { key: 'includeCountries', label: 'Include UK Countries (Eng/Sco/Wal/NI)', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Show the four UK constituent countries alongside county lists.' },
    { key: 'autoFormat', label: 'Auto-format Input', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Normalize casing and spacing as the user types.' },
  ]],
  ['brazil_cep', 'Brazil CEP Lookup', 'regional', 'MapPin', 'CEP lookup via ViaCEP', 'NEW', 'free', [
    { key: 'autoFormat', label: 'Auto-format CEP (#####-###)', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Insert the hyphen as the user types.' },
    { key: 'fillAddressFields', label: 'Auto-fill Address Fields', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Populate street, neighborhood, city, and state from the ViaCEP response.' },
  ]],
  ['germany_plz', 'Germany PLZ', 'regional', 'MapPin', 'German postal code lookup', '', 'free', [
    { key: 'autoFormat', label: 'Auto-format PLZ (5 digits)', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Enforce 5-digit numeric input as the user types.' },
    { key: 'fillCityField', label: 'Auto-fill City From PLZ', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['gst_validator', 'GST Validator (India)', 'regional', 'Receipt', '15-char GSTIN with checksum', 'NEW', 'pro', [
    { key: 'autoFormat', label: 'Auto-format GSTIN', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Uppercase and group the 15-char GSTIN as the user types.' },
    { key: 'showState', label: 'Show Derived State Code', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Display the state code parsed from GSTIN digits 1-2.' },
  ]],
  ['abn_validator', 'ABN Validator (Australia)', 'regional', 'Building2', '11-digit ABN checksum', 'NEW', 'pro', [
    { key: 'autoFormat', label: 'Auto-format ABN (XX XXX XXX XXX)', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Insert the conventional spacing as the user types.' },
    { key: 'showEntityName', label: 'Show ABN Lookup Entity Name', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['vat_validator', 'VAT Validator (EU)', 'regional', 'Receipt', 'EU VAT number VIES validation', '', 'pro', [
    { key: 'autoFormat', label: 'Auto-format VAT Number', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Strip spaces and dashes before VIES validation.' },
    { key: 'defaultCountry', label: 'Default Country Code (ISO-2)', type: 'text', group: 'field_specific', placeholder: 'DE' },
  ]],
  ['iban_validator', 'IBAN Validator', 'regional', 'CreditCard', 'IBAN with country checksum', 'POPULAR', 'pro', [
    { key: 'formatWithSpaces', label: 'Format with 4-digit Spaces', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['ssn_validator', 'SSN Validator (US)', 'regional', 'IdCard', 'US SSN validation', '', 'pro', [
    { key: 'maskDisplay', label: 'Mask Display (***-**-1234)', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['ein_validator', 'EIN Validator (US)', 'regional', 'Building', 'US Employer ID Number (XX-XXXXXXX)', '', 'pro', [
    { key: 'autoFormat', label: 'Auto-format EIN (XX-XXXXXXX)', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Insert the hyphen after the first two digits as the user types.' },
    { key: 'maskDisplay', label: 'Mask Display on Submit', type: 'toggle_with_description', group: 'field_specific', default: false, description: 'Partially mask the EIN in the submission payload.' },
  ]],

  // ─── Dynamic Repeaters (12) ──────────────────────────────────────────────
  ['nested_repeater', 'Nested Repeater', 'productivity', 'ListTree', 'Repeater with sub-rows', 'NEW', 'business', [
    { key: 'maxNestingDepth', label: 'Max Nesting Depth', type: 'number', group: 'field_specific', default: 3, min: 1, max: 6 },
    { key: 'allowAddRemove', label: 'Allow Add / Remove Sub-rows', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['drag_drop_ranking', 'Drag & Drop Ranking', 'productivity', 'ArrowUpDown', 'HTML5 drag-drop ranking', 'POPULAR', 'pro', [
    { key: 'items', label: 'Ranking Items', type: 'options_editor', group: 'field_specific' },
    { key: 'showNumbers', label: 'Show Numbered Badges (1, 2, 3...)', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['sortable_list', 'Sortable List', 'productivity', 'List', 'Sortable with up/down + drag', '', 'free', [
    { key: 'items', label: 'List Items', type: 'options_editor', group: 'field_specific' },
  ]],
  ['multi_column_matrix', 'Multi-Column Matrix', 'productivity', 'Grid3x3', 'Matrix with mixed col types', 'PRO', 'business', [
    { key: 'columnsJson', label: 'Columns (JSON: [{title, type}])', type: 'json', group: 'field_specific' },
    { key: 'minRows', label: 'Min Rows', type: 'number', group: 'field_specific', default: 1 },
    { key: 'maxRows', label: 'Max Rows', type: 'number', group: 'field_specific', default: 10 },
  ]],
  ['pivot_table', 'Pivot Table', 'productivity', 'Table', 'Pivot table input', 'PRO', 'business', [
    { key: 'rowField', label: 'Row Source Field', type: 'field_selector', group: 'field_specific', helpText: 'Form field whose values become the pivot rows.' },
    { key: 'colField', label: 'Column Source Field', type: 'field_selector', group: 'field_specific', helpText: 'Form field whose values become the pivot columns.' },
    { key: 'aggFunction', label: 'Aggregation', type: 'select', group: 'field_specific', default: 'sum', options: [
      { label: 'Sum', value: 'sum' }, { label: 'Count', value: 'count' }, { label: 'Average', value: 'avg' },
    ] },
  ]],
  ['csv_import', 'CSV Import', 'productivity', 'FileSpreadsheet', 'Parse CSV client-side', 'NEW', 'pro', [
    { key: 'hasHeaderRow', label: 'First Row is Header', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Treat the first CSV row as column headers.' },
    { key: 'delimiter', label: 'Delimiter', type: 'select', group: 'field_specific', default: 'comma', options: [
      { label: 'Comma', value: 'comma' }, { label: 'Semicolon', value: 'semicolon' }, { label: 'Tab', value: 'tab' },
    ] },
    { key: 'maxRows', label: 'Max Rows to Import', type: 'number', group: 'field_specific', default: 1000, min: 1 },
  ]],
  ['dynamic_dropdowns', 'Dynamic Dropdowns', 'productivity', 'GitMerge', 'Multi-level cascading dropdowns', 'NEW', 'pro', [
    { key: 'hierarchyData', label: 'Hierarchy Data (JSON or Indented Text)', type: 'json', group: 'field_specific', placeholder: '{"Make": {"Toyota": ["Camry", "Corolla"], "Ford": ["F-150", "Mustang"]}}' },
    { key: 'autoClearChild', label: 'Auto-clear Child on Parent Change', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Reset deeper dropdowns when a parent option changes.' },
  ]],
  ['remote_data_dropdown', 'Remote Data Dropdown', 'productivity', 'Globe', 'Fetch live options from REST API', 'PRO', 'business', [
    { key: 'apiUrl', label: 'REST API Endpoint URL', type: 'text', group: 'field_specific', placeholder: 'https://api.example.com/items' },
    { key: 'labelPath', label: 'Option Label Key (JSON Path)', type: 'text', group: 'field_specific', default: 'name' },
    { key: 'valuePath', label: 'Option Value Key (JSON Path)', type: 'text', group: 'field_specific', default: 'id' },
    { key: 'authHeader', label: 'Authorization Header (Optional)', type: 'text', group: 'field_specific', placeholder: 'Bearer YOUR_TOKEN' },
    { key: 'cacheMinutes', label: 'Cache TTL (Minutes)', type: 'number', group: 'field_specific', default: 5, min: 0 },
  ]],
  ['repeating_section', 'Repeating Section', 'productivity', 'Layers', 'Collapsible repeater of form fields', '', 'pro', [
    { key: 'minRepeats', label: 'Min Repeats', type: 'number', group: 'field_specific', default: 1, min: 0 },
    { key: 'maxRepeats', label: 'Max Repeats', type: 'number', group: 'field_specific', default: 10 },
  ]],
  ['key_value_repeater', 'Key-Value Repeater', 'productivity', 'Braces', 'Repeater of {key, value}', '', 'free', [
    { key: 'keyLabel', label: 'Key Column Label', type: 'text', group: 'field_specific', default: 'Key' },
    { key: 'valueLabel', label: 'Value Column Label', type: 'text', group: 'field_specific', default: 'Value' },
    { key: 'maxRows', label: 'Max Rows', type: 'number', group: 'field_specific', default: 20, min: 1 },
  ]],
  ['tag_cloud_input', 'Tag Cloud Input', 'productivity', 'Tags', 'Tag cloud toggle', '', 'free', [
    { key: 'maxTags', label: 'Max Tags', type: 'number', group: 'field_specific', default: 10, min: 1 },
    { key: 'allowCustom', label: 'Allow Custom Tags', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Let respondents type tags that are not in the preset list.' },
  ]],
  ['matrix_dynamique', 'Matrix Dynamique', 'productivity', 'Grid', 'User-expandable data matrix', 'POPULAR', 'pro', [
    { key: 'rowHeaders', label: 'Row Headers (comma-separated)', type: 'text', group: 'field_specific', default: 'Row 1, Row 2, Row 3' },
    { key: 'colHeaders', label: 'Column Headers (comma-separated)', type: 'text', group: 'field_specific', default: 'Col A, Col B, Col C' },
    { key: 'cellType', label: 'Cell Input Type', type: 'segmented', group: 'field_specific', default: 'text', options: [
      { label: 'Text Input', value: 'text' }, { label: 'Number Input', value: 'number' }, { label: 'Dropdown', value: 'dropdown' },
    ] },
    { key: 'minRows', label: 'Min Rows', type: 'number', group: 'field_specific', default: 1 },
    { key: 'maxRows', label: 'Max Rows', type: 'number', group: 'field_specific', default: 10 },
  ]],

  // ─── PDF & Embeds (15) ────────────────────────────────────────────────────
  ['vimeo_embed', 'Vimeo Embed', 'embed', 'Video', 'Embed Vimeo video player', '', 'free', [
    { key: 'videoUrl', label: 'Vimeo Video URL', type: 'text', group: 'field_specific', placeholder: 'https://vimeo.com/...' },
    { key: 'autoPlay', label: 'Autoplay', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'loop', label: 'Loop', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['color_picker_widget', 'Color Picker', 'embed', 'Palette', 'Visual color swatch and HEX picker', '', 'free', [
    { key: 'defaultColor', label: 'Default Color', type: 'color', group: 'field_specific', default: '#059669' },
    { key: 'colorFormat', label: 'Output Format', type: 'segmented', group: 'field_specific', default: 'hex', options: [
      { label: 'HEX (#059669)', value: 'hex' }, { label: 'RGB (rgb(5,150,105))', value: 'rgb' },
    ] },
    { key: 'allowCustom', label: 'Allow Custom Color Input', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['iframe_embed', 'iframe Embed', 'embed', 'Code', 'Generic responsive iframe embed', '', 'pro', [
    { key: 'url', label: 'Iframe Embed URL', type: 'text', group: 'field_specific', placeholder: 'https://...' },
    { key: 'heightPx', label: 'Height', type: 'dimension', group: 'field_specific', default: 400, unit: 'PX' },
  ]],
  ['html_snippet', 'HTML Snippet', 'embed', 'Code', 'Sanitized HTML snippet', 'PRO', 'business', [
    { key: 'html', label: 'HTML Source Code', type: 'textarea', group: 'field_specific' },
  ]],
  ['product_catalog_flipbook', 'Product Catalog Flipbook', 'embed', 'BookOpen', 'Catalog with page navigation', 'NEW', 'business', [
    { key: 'catalogPdfUrl', label: 'Catalog PDF URL', type: 'text', group: 'field_specific' },
  ]],
  ['brochure_embed', 'Brochure Embed', 'embed', 'FileText', 'PDF/flipbook brochure', '', 'pro', [
    { key: 'brochureUrl', label: 'Brochure Document URL', type: 'text', group: 'field_specific' },
  ]],
  ['image_carousel', 'Image Carousel', 'embed', 'Images', 'Swipeable image carousel with arrows', 'POPULAR', 'free', [
    { key: 'images', label: 'Images (JSON: ["url1", "url2"])', type: 'json', group: 'field_specific' },
    { key: 'autoSlide', label: 'Auto-slide Transition', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'intervalSeconds', label: 'Interval (Seconds)', type: 'number', group: 'field_specific', default: 4, min: 1 },
  ]],
  ['audio_player_embed', 'Audio Player Embed', 'embed', 'Music', 'Audio player with controls', '', 'free', [
    { key: 'audioUrl', label: 'Audio Stream URL (MP3/OGG)', type: 'text', group: 'field_specific' },
    { key: 'autoPlay', label: 'Autoplay Audio', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['video_player_embed', 'Video Player Embed', 'embed', 'Video', 'Video player with controls', '', 'free', [
    { key: 'videoUrl', label: 'Video File URL (MP4/WebM)', type: 'text', group: 'field_specific' },
    { key: 'posterUrl', label: 'Poster Thumbnail Image URL', type: 'text', group: 'field_specific' },
    { key: 'controls', label: 'Show Player Controls', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['qr_code_display', 'QR Code Display', 'embed', 'QrCode', 'Dynamic QR code generator', 'POPULAR', 'free', [
    { key: 'data', label: 'Data to Encode (Text / URL)', type: 'text', group: 'field_specific', placeholder: 'https://...' },
    { key: 'size', label: 'QR Size', type: 'dimension', group: 'field_specific', default: 200, unit: 'PX' },
  ]],

  // ─── Social & Integrations (15) ───────────────────────────────────────────
  ['twitter_embed', 'Twitter / X Embed', 'social', 'Twitter', 'Embed a tweet', '', 'free', [
    { key: 'tweetUrl', label: 'Tweet / Post URL', type: 'text', group: 'field_specific', placeholder: 'https://x.com/user/status/...' },
  ]],
  ['instagram_embed', 'Instagram Embed', 'social', 'Instagram', 'Embed Instagram post', '', 'free', [
    { key: 'postUrl', label: 'Instagram Post URL', type: 'text', group: 'field_specific' },
  ]],
  ['facebook_page_plugin', 'Facebook Page Plugin', 'social', 'Facebook', 'Embed Facebook page feed', '', 'free', [
    { key: 'pageUrl', label: 'Facebook Page URL', type: 'text', group: 'field_specific', placeholder: 'https://www.facebook.com/...' },
    { key: 'showTimeline', label: 'Show Timeline Feed', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['linkedin_embed', 'LinkedIn Embed', 'social', 'Linkedin', 'LinkedIn post embed', '', 'free', [
    { key: 'postUrl', label: 'LinkedIn Post URL', type: 'text', group: 'field_specific' },
  ]],
  ['youtube_subscribe_button', 'YouTube Subscribe Button', 'social', 'Youtube', 'YouTube channel subscribe widget', '', 'free', [
    { key: 'channelId', label: 'YouTube Channel ID', type: 'text', group: 'field_specific' },
  ]],
  ['discord_widget', 'Discord Widget', 'social', 'MessageSquare', 'Discord server invite & active member count', '', 'free', [
    { key: 'serverId', label: 'Discord Server ID', type: 'text', group: 'field_specific' },
    { key: 'heightPx', label: 'Widget Height', type: 'dimension', group: 'field_specific', default: 350, unit: 'PX' },
  ]],
  ['telegram_join_button', 'Telegram Join Button', 'social', 'Send', 'Telegram group / channel join button', '', 'free', [
    { key: 'username', label: 'Channel Username or t.me link', type: 'text', group: 'field_specific' },
    { key: 'buttonText', label: 'Button Text', type: 'text', group: 'field_specific', default: 'Join our Telegram Channel' },
  ]],
  ['tiktok_embed', 'TikTok Embed', 'social', 'Music', 'TikTok video embed', 'NEW', 'free', [
    { key: 'videoUrl', label: 'TikTok Video URL', type: 'text', group: 'field_specific', placeholder: 'https://www.tiktok.com/@user/video/...' },
    { key: 'captionText', label: 'Caption Above Embed', type: 'text', group: 'field_specific' },
  ]],
  ['reddit_embed', 'Reddit Embed', 'social', 'MessageCircle', 'Reddit post embed', '', 'free', [
    { key: 'postUrl', label: 'Reddit Post URL', type: 'text', group: 'field_specific', placeholder: 'https://www.reddit.com/r/...' },
    { key: 'showParentThread', label: 'Show Parent Comment Thread', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['pinterest_pin', 'Pinterest Pin', 'social', 'Image', 'Pinterest pin embed', '', 'free', [
    { key: 'pinUrl', label: 'Pinterest Pin URL', type: 'text', group: 'field_specific', placeholder: 'https://www.pinterest.com/pin/...' },
    { key: 'size', label: 'Pin Size', type: 'select', group: 'field_specific', default: 'medium', options: [
      { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
    ] },
  ]],
  ['github_repo_card', 'GitHub Repo Card', 'social', 'Github', 'Live repository card with stars and forks', 'NEW', 'free', [
    { key: 'owner', label: 'GitHub Owner / Organization', type: 'text', group: 'field_specific', placeholder: 'facebook' },
    { key: 'repo', label: 'Repository Name', type: 'text', group: 'field_specific', placeholder: 'react' },
  ]],
  ['stripe_payment_link_embed', 'Stripe Payment Link', 'social', 'CreditCard', 'Stripe hosted payment button', '', 'pro', [
    { key: 'paymentLinkUrl', label: 'Stripe Payment Link URL', type: 'text', group: 'field_specific', placeholder: 'https://buy.stripe.com/...' },
    { key: 'buttonText', label: 'Button Text', type: 'text', group: 'field_specific', default: 'Pay with Stripe' },
  ]],
  ['calendly_embed', 'Calendly Embed', 'social', 'Calendar', 'Calendly appointment scheduler', 'POPULAR', 'pro', [
    { key: 'username', label: 'Calendly URL or Username', type: 'text', group: 'field_specific', placeholder: 'your-company/meeting' },
  ]],
  ['typeform_embed', 'Typeform Embed', 'social', 'FileInput', 'Typeform conversational embed', '', 'pro', [
    { key: 'formId', label: 'Typeform Form ID', type: 'text', group: 'field_specific' },
    { key: 'heightPx', label: 'Height', type: 'dimension', group: 'field_specific', default: 500, unit: 'PX' },
  ]],
  ['loom_embed', 'Loom Embed', 'social', 'Video', 'Loom interactive video recorder and player', 'NEW', 'free', [
    { key: 'videoUrl', label: 'Loom Video URL / Share Link', type: 'text', group: 'field_specific', placeholder: 'https://www.loom.com/share/...' },
    { key: 'autoPlay', label: 'Autoplay Video', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
];

export const PHASE_2_WIDGETS: FieldDefinition[] = WIDGET_SPECS.map(
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
      type: 'control_widget',
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
