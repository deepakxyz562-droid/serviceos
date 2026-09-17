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
  ['address_map_locator', 'Address Map Locator', 'maps', 'MapPin', 'Draggable pin for pinpoint location', '', 'pro', [
    { key: 'defaultLat', label: 'Default Latitude', type: 'number', group: 'field_specific', default: 37.7749, step: 0.0001 },
    { key: 'defaultLng', label: 'Default Longitude', type: 'number', group: 'field_specific', default: -122.4194, step: 0.0001 },
    { key: 'defaultZoom', label: 'Default Zoom Level', type: 'number', group: 'field_specific', default: 13, min: 1, max: 20 },
    { key: 'draggableMarker', label: 'Allow Draggable Pin', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Let user drag pin to exact location.' },
    { key: 'showSearch', label: 'Show Address Search Box', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Include search input above the map.' },
  ]],
  ['driving_distance_calculator', 'Driving Distance Calculator', 'maps', 'Milestone', 'Direct driving distance + duration', '', 'pro', [
    { key: 'originField', label: 'Origin Address Field', type: 'field_selector', group: 'field_specific', helpText: 'Field containing the start address.' },
    { key: 'destinationField', label: 'Destination Address Field', type: 'field_selector', group: 'field_specific', helpText: 'Field containing destination address.' },
    { key: 'ratePerUnit', label: 'Rate per Mile/KM ($)', type: 'number', group: 'field_specific', default: 0.65, step: 0.01 },
    { key: 'baseFee', label: 'Base Travel Fee ($)', type: 'number', group: 'field_specific', default: 0, step: 0.01 },
    { key: 'unit', label: 'Distance Unit', type: 'segmented', group: 'field_specific', default: 'miles', options: [
      { label: 'Miles', value: 'miles' }, { label: 'Kilometers', value: 'km' },
    ] },
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
  ['route_planner_map', 'Route Planner Map', 'maps', 'Map', 'Interactive driving route with waypoints and route summary', 'POPULAR', 'pro', [
    { key: 'mapProvider', label: 'Map Provider', type: 'segmented', group: 'field_specific', default: 'osm', options: [
      { label: 'OpenStreetMap (free)', value: 'osm' }, { label: 'Google Maps', value: 'google' },
    ], helpText: 'OpenStreetMap is free with no key; Google Maps needs your own billed API key.' },
    { key: 'defaultTravelMode', label: 'Default Travel Mode', type: 'segmented', group: 'field_specific', default: 'driving', options: [
      { label: '🚗 Driving', value: 'driving' }, { label: '🚶 Walking', value: 'walking' }, { label: '🚲 Bicycling', value: 'bicycling' },
    ], helpText: 'Choose how routes are calculated by default.' },
    { key: 'allowAdditionalStops', label: 'Allow Additional Stops', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Let respondents add extra stops between the start and end locations.' },
    { key: 'distanceUnits', label: 'Distance Units', type: 'segmented', group: 'field_specific', default: 'automatic', options: [
      { label: 'Automatic', value: 'automatic' }, { label: 'Miles', value: 'miles' }, { label: 'Kilometers', value: 'km' },
    ], helpText: 'Control how distance is shown in the summary.' },
    { key: 'startLocationLabel', label: 'Start Location Label', type: 'text', group: 'field_specific', default: 'Start location', placeholder: 'Start location' },
    { key: 'endLocationLabel', label: 'End Location Label', type: 'text', group: 'field_specific', default: 'End location', placeholder: 'End location' },
    { key: 'showRouteSummary', label: 'Show Route Summary', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Display distance and estimated travel time below the map for respondents.' },
    { key: 'noRouteMessage', label: 'No Route Message', type: 'text', group: 'field_specific', default: 'No route could be found for those locations.', placeholder: 'No route could be found for those locations.' },
    { key: 'addressPlaceholder', label: 'Address Placeholder', type: 'text', group: 'field_specific', default: 'Street address, city or ZIP', placeholder: 'Street address, city or ZIP' },
  ], 'maps'],
  ['service_area_checker', 'Service Area Checker', 'maps', 'ShieldCheck', 'Validate postal code against radius', 'NEW', 'pro', [
    { key: 'centerLat', label: 'HQ Latitude', type: 'number', group: 'field_specific', default: 37.7749, step: 0.0001 },
    { key: 'centerLng', label: 'HQ Longitude', type: 'number', group: 'field_specific', default: -122.4194, step: 0.0001 },
    { key: 'radiusMiles', label: 'Service Radius (Miles)', type: 'number', group: 'field_specific', default: 25, min: 1 },
    { key: 'blockSubmission', label: 'Block Out-of-Area Submissions', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Prevent submission if address is beyond service area.' },
    { key: 'outOfAreaMessage', label: 'Out of Area Error Message', type: 'text', group: 'field_specific', default: 'Sorry, we do not currently service your area.' },
  ], 'maps'],
  ['store_locator', 'Store Locator', 'maps', 'Store', 'Find nearest store via Haversine', 'POPULAR', 'pro', [
    { key: 'searchRadiusKm', label: 'Search Radius (KM)', type: 'number', group: 'field_specific', default: 50 },
  ]],
  ['street_view_address_search', 'Street View Address Search', 'maps', 'Eye', 'Google Places linked with 360° Street View', 'NEW', 'business', [
    { key: 'panoramaHeightPx', label: 'Panorama Height', type: 'dimension', group: 'field_specific', default: 300, unit: 'PX' },
    { key: 'defaultPitch', label: 'Default Pitch Angle', type: 'number', group: 'field_specific', default: 0, min: -90, max: 90 },
    { key: 'defaultHeading', label: 'Default Heading (Degrees)', type: 'number', group: 'field_specific', default: 0, min: 0, max: 360 },
  ], 'maps'],
  ['time_zone_from_location', 'Time Zone from Location', 'maps', 'Clock', 'Get timezone from lat/lng', 'NEW', 'pro', undefined, 'maps'],
  ['delivery_zone_checker', 'Delivery Zone Checker', 'maps', 'Truck', 'Validates postal code against zones', 'NEW', 'pro', [
    { key: 'zones', label: 'Zones (JSON: [{name, prefixes}])', type: 'json', group: 'field_specific' },
  ]],
  ['distance_matrix', 'Distance Matrix', 'maps', 'Grid', 'Multi-origin × destination distances', 'PRO', 'business'],

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
  ['resource_scheduler', 'Resource Scheduler', 'productivity', 'CalendarClock', 'Schedule resources over week', 'PRO', 'business'],
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
  ['multi_day_booking', 'Multi-Day Booking', 'productivity', 'CalendarDays', 'Multi-day event booking', '', 'business'],
  ['appointment_confirmation', 'Appointment Confirmation', 'productivity', 'CheckCircle', 'Appointment summary + confirm', '', 'pro', [
    { key: 'requireSignature', label: 'Require Signature on Confirmation', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['delivery_window_selector', 'Delivery Window Selector', 'productivity', 'Truck', 'Pick delivery window', '', 'pro', [
    { key: 'leadTimeHours', label: 'Min Lead Time (Hours)', type: 'number', group: 'field_specific', default: 24 },
  ]],
  ['pickup_location_selector', 'Pickup Location Selector', 'productivity', 'Store', 'Pick from pickup locations', '', 'free'],
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
  ['friendly_captcha', 'Friendly Captcha', 'security', 'ShieldCheck', 'Friendly-captcha-style widget', 'NEW', 'free'],
  ['math_captcha', 'Math Captcha', 'security', 'Calculator', 'Simple math captcha equation', '', 'free', [
    { key: 'difficulty', label: 'Difficulty', type: 'segmented', group: 'field_specific', default: 'easy', options: [
      { label: 'Easy (Addition/Subtraction)', value: 'easy' }, { label: 'Medium (Multiplication)', value: 'medium' },
    ] },
  ]],
  ['image_captcha_slider', 'Image Slider Captcha', 'security', 'MoveHorizontal', 'Drag-to-verify slider', 'NEW', 'free'],
  ['identity_verification_kyc', 'Identity Verification (KYC)', 'security', 'IdCard', 'Persona/Onfido KYC verification', 'PRO', 'business', undefined, 'kyc'],
  ['two_factor_auth', '2FA Code Input', 'security', 'KeyRound', '6-box 2FA code input', '', 'pro'],
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
  ['privacy_policy_accept', 'Privacy Policy Accept', 'security', 'FileText', 'Privacy policy modal acceptance', '', 'free', [
    { key: 'policyUrl', label: 'Policy URL', type: 'text', group: 'field_specific' },
  ]],
  ['age_verification', 'Age Verification', 'security', 'CalendarClock', 'Age confirmation (18+ / 21+)', '', 'free', [
    { key: 'minAge', label: 'Minimum Age Required', type: 'number', group: 'field_specific', default: 21, min: 13, max: 100 },
    { key: 'errorMessage', label: 'Underage Error Message', type: 'text', group: 'field_specific', default: 'You must be at least 21 years old to submit this form.' },
  ]],
  ['digital_witness', 'Digital Witness', 'security', 'Eye', 'Witness signature + timestamp', 'NEW', 'business'],
  ['consent_log', 'Consent Log', 'security', 'FileCheck', 'Logs consent with timestamp + IP', 'PRO', 'business'],

  // ─── Regional & Identity (15) ─────────────────────────────────────────────
  ['australia_bsb_checker', 'Australia BSB Checker', 'regional', 'Landmark', '6-digit BSB validation with APCA registry', 'NEW', 'pro', [
    { key: 'autoFormat', label: 'Auto-format with hyphen (XXX-XXX)', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'showBankName', label: 'Show Bank & Branch Name on Match', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['italian_codice_fiscale', 'Italian Codice Fiscale', 'regional', 'FileCheck2', '16-char tax code validation with checksum', 'NEW', 'pro', [
    { key: 'autoUppercase', label: 'Auto-convert to Uppercase', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'extractDemographics', label: 'Extract Birth Date and Gender', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['france_region_map_picker', 'France Region Map Picker', 'regional', 'Map', 'Clickable interactive French regions map', '', 'free', [
    { key: 'multiSelect', label: 'Allow Multiple Region Selections', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'theme', label: 'Map Theme', type: 'segmented', group: 'field_specific', default: 'emerald', options: [
      { label: 'Emerald', value: 'emerald' }, { label: 'Blue', value: 'blue' }, { label: 'Slate', value: 'slate' },
    ] },
  ]],
  ['india_states_dropdown', 'India States Dropdown', 'regional', 'Building', '28 states + 8 Union Territories', '', 'free', [
    { key: 'includeUnionTerritories', label: 'Include Union Territories (8 UTs)', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Include Delhi, J&K, Ladakh, Chandigarh, etc.' },
    { key: 'showCodes', label: 'Show 2-Letter State Codes (e.g. DL, MH)', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['us_state_picker', 'US State & Territory Picker', 'regional', 'Flag', '50 US states + territories', '', 'free', [
    { key: 'includeTerritories', label: 'Include US Territories (PR, GU, VI, AS, MP)', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Include Puerto Rico, Guam, USVI, etc.' },
    { key: 'displayFormat', label: 'Display Format', type: 'segmented', group: 'field_specific', default: 'name', options: [
      { label: 'Full State Name', value: 'name' }, { label: '2-Letter Code (CA, NY)', value: 'code' },
    ] },
  ]],
  ['canada_provinces', 'Canada Provinces', 'regional', 'Flag', '10 provinces + 3 territories', '', 'free', [
    { key: 'includeTerritories', label: 'Include Territories (YT, NT, NU)', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['uk_counties', 'UK Counties', 'regional', 'Flag', 'UK counties + countries', '', 'free'],
  ['brazil_cep', 'Brazil CEP Lookup', 'regional', 'MapPin', 'CEP lookup via ViaCEP', 'NEW', 'free'],
  ['germany_plz', 'Germany PLZ', 'regional', 'MapPin', 'German postal code lookup', '', 'free'],
  ['gst_validator', 'GST Validator (India)', 'regional', 'Receipt', '15-char GSTIN with checksum', 'NEW', 'pro'],
  ['abn_validator', 'ABN Validator (Australia)', 'regional', 'Building2', '11-digit ABN checksum', 'NEW', 'pro'],
  ['vat_validator', 'VAT Validator (EU)', 'regional', 'Receipt', 'EU VAT number VIES validation', '', 'pro'],
  ['iban_validator', 'IBAN Validator', 'regional', 'CreditCard', 'IBAN with country checksum', 'POPULAR', 'pro', [
    { key: 'formatWithSpaces', label: 'Format with 4-digit Spaces', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['ssn_validator', 'SSN Validator (US)', 'regional', 'IdCard', 'US SSN validation', '', 'pro', [
    { key: 'maskDisplay', label: 'Mask Display (***-**-1234)', type: 'toggle_with_description', group: 'field_specific', default: true },
  ]],
  ['ein_validator', 'EIN Validator (US)', 'regional', 'Building', 'US Employer ID Number (XX-XXXXXXX)', '', 'pro'],

  // ─── Dynamic Repeaters (12) ──────────────────────────────────────────────
  ['nested_repeater', 'Nested Repeater', 'productivity', 'ListTree', 'Repeater with sub-rows', 'NEW', 'business'],
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
  ['pivot_table', 'Pivot Table', 'productivity', 'Table', 'Pivot table input', 'PRO', 'business'],
  ['csv_import', 'CSV Import', 'productivity', 'FileSpreadsheet', 'Parse CSV client-side', 'NEW', 'pro'],
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
  ['key_value_repeater', 'Key-Value Repeater', 'productivity', 'Braces', 'Repeater of {key, value}', '', 'free'],
  ['tag_cloud_input', 'Tag Cloud Input', 'productivity', 'Tags', 'Tag cloud toggle', '', 'free'],
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
  ['pdf_embedder', 'PDF Embedder', 'embed', 'FileCode', 'In-form PDF document viewer', 'POPULAR', 'free', [
    { key: 'pdfUrl', label: 'PDF Document URL', type: 'text', group: 'field_specific', placeholder: 'https://example.com/document.pdf' },
    { key: 'heightPx', label: 'Viewer Height', type: 'dimension', group: 'field_specific', default: 500, unit: 'PX', min: 200, max: 1200 },
    { key: 'showToolbar', label: 'Show PDF Toolbar & Download Button', type: 'toggle_with_description', group: 'field_specific', default: true, description: 'Display zoom and save controls.' },
    { key: 'defaultZoom', label: 'Default Zoom', type: 'segmented', group: 'field_specific', default: 'fit', options: [
      { label: 'Fit to Page', value: 'fit' }, { label: '100% Actual Size', value: '100' }, { label: '150%', value: '150' },
    ] },
  ]],
  ['digital_magazine_maker', 'Digital Magazine Maker', 'embed', 'BookOpen', 'Interactive flipbook reader', 'NEW', 'business', [
    { key: 'flipbookUrl', label: 'Flipbook / PDF Document URL', type: 'text', group: 'field_specific', placeholder: 'https://...' },
    { key: 'soundEffects', label: 'Page Flip Sound Effects', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'heightPx', label: 'Viewer Height', type: 'dimension', group: 'field_specific', default: 450, unit: 'PX' },
  ]],
  ['youtube_video_embed', 'YouTube Embed', 'embed', 'Video', 'Embed YouTube instructions or demos', 'POPULAR', 'free', [
    { key: 'videoUrl', label: 'YouTube Video URL', type: 'text', group: 'field_specific', placeholder: 'https://www.youtube.com/watch?v=...' },
    { key: 'autoPlay', label: 'Autoplay Video', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'showControls', label: 'Show Player Controls', type: 'toggle_with_description', group: 'field_specific', default: true },
    { key: 'loop', label: 'Loop Video', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'aspectRatio', label: 'Aspect Ratio', type: 'segmented', group: 'field_specific', default: '16:9', options: [
      { label: '16:9', value: '16:9' }, { label: '4:3', value: '4:3' }, { label: '1:1', value: '1:1' },
    ] },
  ]],
  ['vimeo_embed', 'Vimeo Embed', 'embed', 'Video', 'Embed Vimeo video player', '', 'free', [
    { key: 'videoUrl', label: 'Vimeo Video URL', type: 'text', group: 'field_specific', placeholder: 'https://vimeo.com/...' },
    { key: 'autoPlay', label: 'Autoplay', type: 'toggle_with_description', group: 'field_specific', default: false },
    { key: 'loop', label: 'Loop', type: 'toggle_with_description', group: 'field_specific', default: false },
  ]],
  ['comparison_slider', 'Comparison Slider', 'embed', 'SlidersHorizontal', 'Before & After split image comparison', 'NEW', 'pro', [
    { key: 'beforeImageUrl', label: 'Before Image URL', type: 'text', group: 'field_specific', placeholder: 'https://...' },
    { key: 'afterImageUrl', label: 'After Image URL', type: 'text', group: 'field_specific', placeholder: 'https://...' },
    { key: 'beforeLabel', label: 'Before Label', type: 'text', group: 'field_specific', default: 'Before' },
    { key: 'afterLabel', label: 'After Label', type: 'text', group: 'field_specific', default: 'After' },
    { key: 'initialPosition', label: 'Initial Divider Position (%)', type: 'number', group: 'field_specific', default: 50, min: 0, max: 100 },
    { key: 'orientation', label: 'Slider Orientation', type: 'segmented', group: 'field_specific', default: 'horizontal', options: [
      { label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' },
    ] },
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
  ['social_share_buttons', 'Social Share Buttons', 'embed', 'Share2', 'Facebook, Twitter, LinkedIn, WhatsApp', 'POPULAR', 'free', [
    { key: 'shareUrl', label: 'URL to Share', type: 'text', group: 'field_specific', placeholder: 'https://...' },
    { key: 'shareText', label: 'Default Share Text', type: 'text', group: 'field_specific' },
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
  ['tiktok_embed', 'TikTok Embed', 'social', 'Music', 'TikTok video embed', 'NEW', 'free'],
  ['reddit_embed', 'Reddit Embed', 'social', 'MessageCircle', 'Reddit post embed', '', 'free'],
  ['pinterest_pin', 'Pinterest Pin', 'social', 'Image', 'Pinterest pin embed', '', 'free'],
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
