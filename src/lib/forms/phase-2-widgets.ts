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
    { key: 'provider', label: 'Provider', type: 'select', group: 'field_specific', default: 'managed', options: [
      { label: '🚀 Fieseros Managed', value: 'managed' }, { label: 'BYOK', value: 'byok' },
    ] },
    { key: 'apiKey', label: 'Google API key', type: 'text', group: 'field_specific', condition: { dependsOn: 'provider', equals: 'byok' } },
    { key: 'countryRestriction', label: 'Country code (e.g. US)', type: 'text', group: 'field_specific' },
  ], 'maps'],
  ['address_autocomplete_osm', 'Address Autocomplete (OSM)', 'maps', 'MapPin', 'Free OpenStreetMap autocomplete', 'NEW', 'free', [
    { key: 'countrycodes', label: 'Country codes (comma-sep)', type: 'text', group: 'field_specific', placeholder: 'us, ca, gb' },
  ]],
  ['address_map_locator', 'Address Map Locator', 'maps', 'MapPin', 'Draggable pin for pinpoint location', '', 'pro'],
  ['driving_distance_calculator', 'Driving Distance Calculator', 'maps', 'Milestone', 'Direct driving distance + duration', '', 'pro'],
  ['elevation_lookup', 'Elevation Lookup', 'maps', 'Mountain', 'Get elevation for lat/lng', 'NEW', 'pro'],
  ['geofence_checker', 'Geofence Checker', 'maps', 'ShieldCheck', 'Check if user is inside geofence', 'NEW', 'business', [
    { key: 'centerLat', label: 'Center latitude', type: 'number', group: 'field_specific' },
    { key: 'centerLng', label: 'Center longitude', type: 'number', group: 'field_specific' },
    { key: 'radiusMeters', label: 'Radius (meters)', type: 'number', group: 'field_specific', default: 500 },
  ]],
  ['gps_location_coordinates', 'GPS Location Coordinates', 'maps', 'Crosshair', 'One-click GPS capture', 'POPULAR', 'free'],
  ['ip_geolocation', 'IP Geolocation', 'maps', 'Globe', 'Get user location from IP', 'NEW', 'pro'],
  ['map_pin_drop', 'Map Pin Drop', 'maps', 'MapPin', 'Click on map to drop pin', '', 'pro'],
  ['map_polygon_drawer', 'Map Polygon Drawer', 'maps', 'Hexagon', 'Draw polygons on map', 'PRO', 'business'],
  ['map_radius_drawer', 'Map Radius Drawer', 'maps', 'Circle', 'Draw radius on map', 'PRO', 'business'],
  ['nearest_location_finder_v2', 'Nearest Location Finder (v2)', 'maps', 'Navigation', 'Find closest branch via OSRM', 'POPULAR', 'pro', undefined, 'maps'],
  ['reverse_geocode', 'Reverse Geocode', 'maps', 'MapPin', 'Lat/lng → address', 'NEW', 'pro'],
  ['route_planner_v2', 'Route Planner (v2)', 'maps', 'Map', 'Driving route via OSRM', 'POPULAR', 'pro', undefined, 'maps'],
  ['service_area_checker_v2', 'Service Area Checker (v2)', 'maps', 'ShieldCheck', 'Validate postal code against radius', 'NEW', 'pro', undefined, 'maps'],
  ['store_locator', 'Store Locator', 'maps', 'Store', 'Find nearest store via Haversine', 'POPULAR', 'pro'],
  ['street_view_address_search', 'Street View Address Search', 'maps', 'Eye', 'Address + Street View embed', 'NEW', 'business', undefined, 'maps'],
  ['time_zone_from_location', 'Time Zone from Location', 'maps', 'Clock', 'Get timezone from lat/lng', 'NEW', 'pro', undefined, 'maps'],
  ['delivery_zone_checker', 'Delivery Zone Checker', 'maps', 'Truck', 'Validates postal code against zones', 'NEW', 'pro', [
    { key: 'zones', label: 'Zones (JSON: [{name, prefixes}])', type: 'json', group: 'field_specific' },
  ]],
  ['distance_matrix', 'Distance Matrix', 'maps', 'Grid', 'Multi-origin × destination distances', 'PRO', 'business'],

  // ─── Inventory & Booking (15) ────────────────────────────────────────────
  ['inventory_dropdown_v2', 'Inventory Dropdown (v2)', 'productivity', 'Package', 'Stock-aware dropdown', 'POPULAR', 'pro', [
    { key: 'items', label: 'Items (JSON: [{label, stock, price}])', type: 'json', group: 'field_specific' },
  ]],
  ['stock_quantity_tracker', 'Stock Quantity Tracker', 'productivity', 'Boxes', 'Multi-product stock tracker', '', 'pro'],
  ['reservation_calendar', 'Reservation Calendar', 'productivity', 'Calendar', 'Calendar with reserved dates blocked', 'POPULAR', 'business', [
    { key: 'reservedDates', label: 'Reserved dates (JSON)', type: 'json', group: 'field_specific' },
  ]],
  ['time_slot_booking', 'Time Slot Booking', 'productivity', 'Clock', 'Pick date → see slots → book', 'POPULAR', 'business'],
  ['resource_scheduler', 'Resource Scheduler', 'productivity', 'CalendarClock', 'Schedule resources over week', 'PRO', 'business'],
  ['equipment_rental', 'Equipment Rental', 'productivity', 'Wrench', 'Item, qty, dates, deposit', '', 'business'],
  ['room_booking', 'Room Booking', 'productivity', 'BedDouble', 'Hotel-style room booking', 'POPULAR', 'business'],
  ['class_registration', 'Class Registration', 'productivity', 'Users', 'Class/workshop with seat limits', '', 'pro', [
    { key: 'seats', label: 'Total seats', type: 'number', group: 'field_specific', default: 20 },
  ]],
  ['waitlist_signup', 'Waitlist Signup', 'productivity', 'ListPlus', 'Waitlist when class is full', '', 'free'],
  ['group_booking', 'Group Booking', 'productivity', 'Users', 'Group with multiple attendees', '', 'pro'],
  ['multi_day_booking', 'Multi-Day Booking', 'productivity', 'CalendarDays', 'Multi-day event booking', '', 'business'],
  ['appointment_confirmation', 'Appointment Confirmation', 'productivity', 'CheckCircle', 'Appointment summary + confirm', '', 'pro'],
  ['delivery_window_selector', 'Delivery Window Selector', 'productivity', 'Truck', 'Pick delivery window', '', 'pro'],
  ['pickup_location_selector', 'Pickup Location Selector', 'productivity', 'Store', 'Pick from pickup locations', '', 'free'],
  ['capacity_counter', 'Capacity Counter', 'productivity', 'Gauge', 'Shows remaining capacity', '', 'free', [
    { key: 'capacity', label: 'Total capacity', type: 'number', group: 'field_specific', default: 50 },
  ]],

  // ─── Security & Verification (13) ────────────────────────────────────────
  ['email_otp_verification', 'Email OTP Verification', 'security', 'MailCheck', '6-digit email OTP', 'NEW', 'pro', [
    { key: 'codeLength', label: 'Code length', type: 'number', group: 'field_specific', default: 6, min: 4, max: 8 },
    { key: 'expiryMinutes', label: 'Expiry (minutes)', type: 'number', group: 'field_specific', default: 15 },
  ], 'otp_email'],
  ['friendly_captcha', 'Friendly Captcha', 'security', 'ShieldCheck', 'Friendly-captcha-style widget', 'NEW', 'free'],
  ['math_captcha', 'Math Captcha', 'security', 'Calculator', 'Simple math captcha', '', 'free'],
  ['image_captcha_slider', 'Image Slider Captcha', 'security', 'MoveHorizontal', 'Drag-to-verify slider', 'NEW', 'free'],
  ['identity_verification_kyc', 'Identity Verification (KYC)', 'security', 'IdCard', 'Persona/Onfido KYC embed', 'PRO', 'business', undefined, 'kyc'],
  ['two_factor_auth', '2FA Code Input', 'security', 'KeyRound', '6-box 2FA code', '', 'pro'],
  ['password_strength_meter', 'Password Strength Meter', 'security', 'Lock', 'Password + strength meter', 'POPULAR', 'free', [
    { key: 'minLen', label: 'Min length', type: 'number', group: 'field_specific', default: 8 },
  ]],
  ['whatsapp_chat_button', 'WhatsApp Chat Button', 'security', 'MessageCircle', 'WhatsApp launcher', 'POPULAR', 'free', [
    { key: 'phoneNumber', label: 'Phone number', type: 'text', group: 'field_specific' },
    { key: 'prefilledMessage', label: 'Pre-filled message', type: 'textarea', group: 'field_specific' },
  ]],
  ['gdpr_consent_banner', 'GDPR Consent Banner', 'security', 'ScrollText', 'GDPR consent checkbox', 'NEW', 'free'],
  ['privacy_policy_accept', 'Privacy Policy Accept', 'security', 'FileText', 'Privacy policy modal', '', 'free', [
    { key: 'policyUrl', label: 'Policy URL', type: 'text', group: 'field_specific' },
  ]],
  ['age_verification', 'Age Verification', 'security', 'CalendarClock', 'Age confirmation (21+)', '', 'free', [
    { key: 'minAge', label: 'Min age', type: 'number', group: 'field_specific', default: 21 },
  ]],
  ['digital_witness', 'Digital Witness', 'security', 'Eye', 'Witness signature + timestamp', 'NEW', 'business'],
  ['consent_log', 'Consent Log', 'security', 'FileCheck', 'Logs consent with timestamp + IP', 'PRO', 'business'],

  // ─── Regional & Identity (15) ─────────────────────────────────────────────
  ['australia_bsb_checker_v2', 'Australia BSB Checker (v2)', 'regional', 'Landmark', '6-digit BSB validation', 'NEW', 'pro'],
  ['italian_codice_fiscale_v2', 'Italian Codice Fiscale (v2)', 'regional', 'FileCheck2', '16-char tax code checksum', 'NEW', 'pro'],
  ['france_region_map_picker', 'France Region Picker', 'regional', 'Map', 'Clickable French regions', '', 'free'],
  ['india_states_dropdown', 'India States Dropdown', 'regional', 'Building', '28 states + 8 UTs', '', 'free'],
  ['us_state_picker', 'US State Picker', 'regional', 'Flag', '50 states + abbreviations', '', 'free'],
  ['canada_provinces', 'Canada Provinces', 'regional', 'Flag', '10 provinces + 3 territories', '', 'free'],
  ['uk_counties', 'UK Counties', 'regional', 'Flag', 'UK counties + countries', '', 'free'],
  ['brazil_cep', 'Brazil CEP Lookup', 'regional', 'MapPin', 'CEP lookup via ViaCEP', 'NEW', 'free'],
  ['germany_plz', 'Germany PLZ', 'regional', 'MapPin', 'German postal code', '', 'free'],
  ['gst_validator', 'GST Validator (India)', 'regional', 'Receipt', '15-char GST with checksum', 'NEW', 'pro'],
  ['abn_validator', 'ABN Validator (Australia)', 'regional', 'Building2', '11-digit ABN checksum', 'NEW', 'pro'],
  ['vat_validator', 'VAT Validator (EU)', 'regional', 'Receipt', 'EU VAT number validation', '', 'pro'],
  ['iban_validator', 'IBAN Validator', 'regional', 'CreditCard', 'IBAN with country checksum', 'POPULAR', 'pro'],
  ['ssn_validator', 'SSN Validator (US)', 'regional', 'IdCard', 'US SSN with area/group/series', '', 'pro'],
  ['ein_validator', 'EIN Validator (US)', 'regional', 'Building', 'US Employer ID Number', '', 'pro'],

  // ─── Dynamic Repeaters (12) ──────────────────────────────────────────────
  ['nested_repeater', 'Nested Repeater', 'productivity', 'ListTree', 'Repeater with sub-rows', 'NEW', 'business'],
  ['drag_drop_ranking', 'Drag & Drop Ranking', 'productivity', 'ArrowUpDown', 'HTML5 drag-drop ranking', 'POPULAR', 'pro'],
  ['sortable_list', 'Sortable List', 'productivity', 'List', 'Sortable with up/down + drag', '', 'free'],
  ['multi_column_matrix', 'Multi-Column Matrix', 'productivity', 'Grid3x3', 'Matrix with mixed col types', 'PRO', 'business'],
  ['pivot_table', 'Pivot Table', 'productivity', 'Table', 'Pivot table input', 'PRO', 'business'],
  ['csv_import', 'CSV Import', 'productivity', 'FileSpreadsheet', 'Parse CSV client-side', 'NEW', 'pro'],
  ['dynamic_dropdowns_v2', 'Dynamic Dropdowns (v2)', 'productivity', 'GitMerge', 'Cascading dropdowns', 'NEW', 'pro', [
    { key: 'hierarchyData', label: 'Hierarchy (JSON)', type: 'json', group: 'field_specific' },
  ]],
  ['remote_data_dropdown', 'Remote Data Dropdown', 'productivity', 'Globe', 'Fetch options from API', 'PRO', 'business', [
    { key: 'apiUrl', label: 'API URL', type: 'text', group: 'field_specific' },
    { key: 'labelPath', label: 'Label path', type: 'text', group: 'field_specific', default: 'name' },
    { key: 'valuePath', label: 'Value path', type: 'text', group: 'field_specific', default: 'id' },
  ]],
  ['repeating_section', 'Repeating Section', 'productivity', 'Layers', 'Collapsible repeater', '', 'pro'],
  ['key_value_repeater', 'Key-Value Repeater', 'productivity', 'Braces', 'Repeater of {key, value}', '', 'free'],
  ['tag_cloud_input', 'Tag Cloud Input', 'productivity', 'Tags', 'Tag cloud toggle', '', 'free'],
  ['matrix_dynamique_v2', 'Matrix Dynamique (v2)', 'productivity', 'Grid', 'Expandable matrix', 'POPULAR', 'pro'],

  // ─── PDF & Embeds (15) ────────────────────────────────────────────────────
  ['pdf_embedder', 'PDF Embedder', 'embed', 'FileCode', 'In-form PDF viewer', 'POPULAR', 'free', [
    { key: 'pdfUrl', label: 'PDF URL', type: 'text', group: 'field_specific' },
    { key: 'heightPx', label: 'Height (px)', type: 'number', group: 'field_specific', default: 500 },
  ]],
  ['digital_magazine_maker', 'Digital Magazine Maker', 'embed', 'BookOpen', 'Flipbook viewer', 'NEW', 'business', [
    { key: 'flipbookUrl', label: 'Flipbook URL', type: 'text', group: 'field_specific' },
  ]],
  ['youtube_video_embed', 'YouTube Embed', 'embed', 'Video', 'Embed YouTube video', 'POPULAR', 'free', [
    { key: 'videoUrl', label: 'YouTube URL', type: 'text', group: 'field_specific' },
    { key: 'autoPlay', label: 'Autoplay', type: 'boolean', group: 'field_specific', default: false },
  ]],
  ['vimeo_embed', 'Vimeo Embed', 'embed', 'Video', 'Embed Vimeo video', '', 'free', [
    { key: 'videoUrl', label: 'Vimeo URL', type: 'text', group: 'field_specific' },
  ]],
  ['comparison_slider', 'Comparison Slider', 'embed', 'SlidersHorizontal', 'Before/after slider', 'NEW', 'pro', [
    { key: 'beforeImageUrl', label: 'Before image URL', type: 'text', group: 'field_specific' },
    { key: 'afterImageUrl', label: 'After image URL', type: 'text', group: 'field_specific' },
  ]],
  ['color_picker_widget', 'Color Picker', 'embed', 'Palette', 'Visual color swatch picker', '', 'free', [
    { key: 'defaultColor', label: 'Default color', type: 'color', group: 'field_specific', default: '#059669' },
  ]],
  ['iframe_embed', 'iframe Embed', 'embed', 'Code', 'Generic iframe embed', '', 'pro', [
    { key: 'url', label: 'iframe URL', type: 'text', group: 'field_specific' },
    { key: 'heightPx', label: 'Height (px)', type: 'number', group: 'field_specific', default: 400 },
  ]],
  ['html_snippet', 'HTML Snippet', 'embed', 'Code', 'Sanitized HTML embed', 'PRO', 'business', [
    { key: 'html', label: 'HTML source', type: 'textarea', group: 'field_specific' },
  ]],
  ['product_catalog_flipbook', 'Product Catalog Flipbook', 'embed', 'BookOpen', 'Catalog with page nav', 'NEW', 'business'],
  ['brochure_embed', 'Brochure Embed', 'embed', 'FileText', 'PDF/flipbook brochure', '', 'pro'],
  ['image_carousel', 'Image Carousel', 'embed', 'Images', 'Image carousel + arrows', 'POPULAR', 'free', [
    { key: 'images', label: 'Images (JSON: [url])', type: 'json', group: 'field_specific' },
  ]],
  ['audio_player_embed', 'Audio Player Embed', 'embed', 'Music', 'Audio player + playlist', '', 'free'],
  ['video_player_embed', 'Video Player Embed', 'embed', 'Video', 'Video player with controls', '', 'free'],
  ['social_share_buttons', 'Social Share Buttons', 'embed', 'Share2', 'Facebook/Twitter/LinkedIn/WhatsApp', 'POPULAR', 'free'],
  ['qr_code_display', 'QR Code Display', 'embed', 'QrCode', 'Generate QR client-side', 'POPULAR', 'free', [
    { key: 'data', label: 'Data to encode', type: 'text', group: 'field_specific' },
    { key: 'size', label: 'Size (px)', type: 'number', group: 'field_specific', default: 200 },
  ]],

  // ─── Social & Integrations (15) ───────────────────────────────────────────
  ['twitter_embed', 'Twitter Embed', 'social', 'Twitter', 'Embed a tweet', '', 'free', [
    { key: 'tweetUrl', label: 'Tweet URL', type: 'text', group: 'field_specific' },
  ]],
  ['instagram_embed', 'Instagram Embed', 'social', 'Instagram', 'Embed IG post', '', 'free'],
  ['facebook_page_plugin', 'Facebook Page Plugin', 'social', 'Facebook', 'Facebook page iframe', '', 'free', [
    { key: 'pageUrl', label: 'Page URL', type: 'text', group: 'field_specific' },
  ]],
  ['linkedin_embed', 'LinkedIn Embed', 'social', 'Linkedin', 'LinkedIn post embed', '', 'free'],
  ['youtube_subscribe_button', 'YouTube Subscribe Button', 'social', 'Youtube', 'YT subscribe button', '', 'free', [
    { key: 'channelId', label: 'Channel ID', type: 'text', group: 'field_specific' },
  ]],
  ['discord_widget', 'Discord Widget', 'social', 'MessageSquare', 'Discord server widget', '', 'free', [
    { key: 'serverId', label: 'Server ID', type: 'text', group: 'field_specific' },
  ]],
  ['telegram_join_button', 'Telegram Join Button', 'social', 'Send', 't.me join link', '', 'free', [
    { key: 'username', label: 'Channel username', type: 'text', group: 'field_specific' },
  ]],
  ['tiktok_embed', 'TikTok Embed', 'social', 'Music', 'TikTok video embed', 'NEW', 'free'],
  ['reddit_embed', 'Reddit Embed', 'social', 'MessageCircle', 'Reddit post embed', '', 'free'],
  ['pinterest_pin', 'Pinterest Pin', 'social', 'Image', 'Pinterest pin embed', '', 'free'],
  ['github_repo_card', 'GitHub Repo Card', 'social', 'Github', 'Live repo card from API', 'NEW', 'free', [
    { key: 'owner', label: 'Owner', type: 'text', group: 'field_specific' },
    { key: 'repo', label: 'Repo name', type: 'text', group: 'field_specific' },
  ]],
  ['stripe_payment_link_embed', 'Stripe Payment Link', 'social', 'CreditCard', 'Stripe payment link button', '', 'pro', [
    { key: 'paymentLinkUrl', label: 'Payment link URL', type: 'text', group: 'field_specific' },
  ]],
  ['calendly_embed', 'Calendly Embed', 'social', 'Calendar', 'Calendly scheduling widget', 'POPULAR', 'pro', [
    { key: 'username', label: 'Calendly username', type: 'text', group: 'field_specific' },
  ]],
  ['typeform_embed', 'Typeform Embed', 'social', 'FileInput', 'Typeform embed', '', 'pro', [
    { key: 'formId', label: 'Form ID', type: 'text', group: 'field_specific' },
  ]],
  ['loom_embed', 'Loom Embed', 'social', 'Video', 'Loom video embed', 'NEW', 'free', [
    { key: 'videoUrl', label: 'Loom video URL', type: 'text', group: 'field_specific' },
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
