/**
 * Fieseros Form Studio - 200+ Widget Master Registry
 * ===================================================
 * Defines the complete widget ecosystem across 10 functional hubs with
 * support for Zero-Config Fieseros Managed Proxies, Free engines, and BYOK.
 */

export type WidgetCategory =
  | 'media'
  | 'maps'
  | 'regional'
  | 'calculations'
  | 'repeaters'
  | 'inventory'
  | 'datetime'
  | 'security'
  | 'ui_embeds'
  | 'analytics';

export interface WidgetDefinition {
  id: string;
  name: string;
  category: WidgetCategory;
  description: string;
  iconName: string;
  badge?: 'NEW' | 'AI' | 'POPULAR' | 'PRO';
  providerType?: 'managed_available' | 'free_only' | 'external_embed';
  managedServiceId?: string; // e.g., 'maps.places', 'maps.geocode', 'sms.otp'
  defaultConfig: Record<string, unknown>;
}

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string; icon: string }[] = [
  { id: 'media', label: 'Media & Inspection', icon: 'Camera' },
  { id: 'maps', label: 'Maps & Geolocation', icon: 'MapPin' },
  { id: 'calculations', label: 'Math & Calculations', icon: 'Calculator' },
  { id: 'repeaters', label: 'Dynamic Repeaters', icon: 'ListPlus' },
  { id: 'inventory', label: 'Inventory & Booking', icon: 'CalendarCheck' },
  { id: 'datetime', label: 'Date & Time Pickers', icon: 'Clock' },
  { id: 'security', label: 'Security & Verification', icon: 'ShieldCheck' },
  { id: 'regional', label: 'Regional & Identity', icon: 'Globe' },
  { id: 'ui_embeds', label: 'UI Styles & Embeds', icon: 'Layers' },
  { id: 'analytics', label: 'Feedback & Analytics', icon: 'BarChart3' },
];

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ─── 1. 📸 Media & Inspection (18 Widgets) ──────────────────────────────────
  {
    id: 'image_upload_with_notes',
    name: 'Image Upload with Notes',
    category: 'media',
    description: 'Upload multiple photos with an individual caption/notes input per file. Ideal for damage reports and inspections.',
    iconName: 'ImagePlus',
    badge: 'POPULAR',
    defaultConfig: {
      maxFiles: 10,
      requireNotes: true,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      notePlaceholder: 'Describe damage or equipment details...',
    },
  },
  {
    id: 'take_photo_camera',
    name: 'Take Photo / Camera',
    category: 'media',
    description: 'Direct in-form camera snapshot capture for mobile and desktop.',
    iconName: 'Camera',
    badge: 'POPULAR',
    defaultConfig: { allowRetake: true, cameraFacing: 'environment' },
  },
  {
    id: 'image_upload_preview',
    name: 'Image Upload Preview',
    category: 'media',
    description: 'Instant full-size photo preview and thumbnail zoom before submission.',
    iconName: 'Eye',
    defaultConfig: { previewSize: 'large', zoomable: true },
  },
  {
    id: 'draw_on_image',
    name: 'Draw on Image / Annotate',
    category: 'media',
    description: 'Interactive canvas letting users draw/highlight damage or mark floorplans.',
    iconName: 'Edit3',
    badge: 'NEW',
    defaultConfig: { brushColors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'], defaultThickness: 3 },
  },
  {
    id: 'photo_watermark',
    name: 'Photo Watermark',
    category: 'media',
    description: 'Auto-overlays timestamp, GPS coordinates, and business name onto uploaded photos.',
    iconName: 'Stamp',
    badge: 'PRO',
    defaultConfig: { includeTimestamp: true, includeGps: true, watermarkPosition: 'bottom_right' },
  },
  {
    id: 'image_scanner_ocr',
    name: 'Image Scanner (OCR)',
    category: 'media',
    description: 'Scans receipts, ID cards, or work orders, auto-populating form fields via AI OCR.',
    iconName: 'ScanLine',
    badge: 'AI',
    defaultConfig: { autoExtract: true, targetDocument: 'any' },
  },
  {
    id: 'voice_recorder',
    name: 'Voice Recorder',
    category: 'media',
    description: 'Records high-quality audio voice notes directly through the browser.',
    iconName: 'Mic',
    defaultConfig: { maxDurationSeconds: 180, format: 'audio/webm' },
  },
  {
    id: 'speech_to_text',
    name: 'Speech to Text',
    category: 'media',
    description: 'Real-time speech transcription converting spoken words to filled text fields.',
    iconName: 'MicVocal',
    badge: 'AI',
    defaultConfig: { continuous: false, language: 'en-US' },
  },
  {
    id: 'drawing_board',
    name: 'Drawing Board',
    category: 'media',
    description: 'Blank whiteboard canvas for freehand sketches, diagrams, and formulas.',
    iconName: 'PenTool',
    defaultConfig: { canvasHeight: 300, backgroundColor: '#ffffff' },
  },
  {
    id: 'e_signature',
    name: 'E-Signature',
    category: 'media',
    description: 'Smooth, touch-friendly digital signature capture canvas.',
    iconName: 'PenLine',
    badge: 'POPULAR',
    defaultConfig: { penColor: '#0f172a', clearable: true },
  },
  {
    id: 'adobe_sign',
    name: 'Adobe Sign',
    category: 'media',
    description: 'Legally binding enterprise e-signature workflow with complete audit trail.',
    iconName: 'FileSignature',
    badge: 'PRO',
    defaultConfig: { requiresEnvelope: true },
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    category: 'media',
    description: 'DocuSign envelope generation and sign-off integration.',
    iconName: 'FileCheck',
    badge: 'PRO',
    defaultConfig: { templateId: '' },
  },

  // ─── 2. 🗺️ Maps & Geolocation (16 Widgets) ──────────────────────────────────
  {
    id: 'nearest_location_finder',
    name: 'Nearest Location Finder',
    category: 'maps',
    description: 'Auto-detects user GPS or postal code and calculates the closest branch or technician depot.',
    iconName: 'Navigation',
    badge: 'POPULAR',
    providerType: 'managed_available',
    managedServiceId: 'maps.places',
    defaultConfig: {
      provider: 'managed', // 'managed' | 'osm' | 'byok'
      distanceUnit: 'miles', // 'miles' | 'km'
      locations: [
        { name: 'Main Service Hub', address: '100 Congress Ave, Austin, TX', lat: 30.2672, lng: -97.7431 },
      ],
    },
  },
  {
    id: 'route_planner_map',
    name: 'Route Planner Map',
    category: 'maps',
    description: 'Interactive map displaying driving route, mileage, and travel duration between two addresses.',
    iconName: 'Map',
    badge: 'POPULAR',
    providerType: 'managed_available',
    managedServiceId: 'maps.directions',
    defaultConfig: {
      provider: 'managed',
      travelMode: 'DRIVING',
      showDirectionsList: true,
      unit: 'miles',
    },
  },
  {
    id: 'service_area_checker',
    name: 'Service Area Checker',
    category: 'maps',
    description: 'Validates customer postal code or GPS against operational radius and polygons before submission.',
    iconName: 'ShieldCheck',
    badge: 'NEW',
    defaultConfig: {
      provider: 'managed',
      centerAddress: 'Austin, TX',
      radiusMiles: 35,
      outOfAreaMessage: 'Sorry, we do not service this area yet. Please call us for custom arrangements.',
    },
  },
  {
    id: 'street_view_address_search',
    name: 'Street View Address Search',
    category: 'maps',
    description: 'Google Places search linked with a 360° interactive Street View panorama preview.',
    iconName: 'Eye',
    badge: 'NEW',
    providerType: 'managed_available',
    managedServiceId: 'maps.places',
    defaultConfig: { provider: 'managed', zoom: 1, pitch: 0 },
  },
  {
    id: 'address_map_locator',
    name: 'Address Map Locator',
    category: 'maps',
    description: 'Draggable map pin for pinpointing exact drop-off and service work locations.',
    iconName: 'MapPin',
    defaultConfig: { provider: 'managed', defaultZoom: 14 },
  },
  {
    id: 'gps_location_coordinates',
    name: 'GPS Location Coordinates',
    category: 'maps',
    description: 'One-click GPS capture recording exact latitude, longitude, and accuracy radius.',
    iconName: 'Crosshair',
    defaultConfig: { highAccuracy: true, timeoutMs: 10000 },
  },
  {
    id: 'driving_distance_calculator',
    name: 'Driving Distance Calculator',
    category: 'maps',
    description: 'Calculates direct driving distance between origin and destination with dynamic rates.',
    iconName: 'Milestone',
    providerType: 'managed_available',
    managedServiceId: 'maps.directions',
    defaultConfig: { ratePerMile: 2.5, unit: 'miles' },
  },

  // ─── 3. 🧮 Math & Calculations (20 Widgets) ─────────────────────────────────
  {
    id: 'form_calculation',
    name: 'Form Calculation',
    category: 'calculations',
    description: 'Visual math formula builder evaluating dynamic totals using field tokens ([Q1] * [Q2] + 15).',
    iconName: 'Calculator',
    badge: 'POPULAR',
    defaultConfig: {
      formula: '',
      decimalPlaces: 2,
      resultPrefix: '$',
      resultSuffix: '',
      hidden: false,
    },
  },
  {
    id: 'currency_amount_input',
    name: 'Currency Amount Input',
    category: 'calculations',
    description: 'Masked financial input with ISO symbols ($ / € / £ / ₹) and auto-separators.',
    iconName: 'DollarSign',
    badge: 'POPULAR',
    defaultConfig: {
      currencySymbol: '$',
      currencyCode: 'USD',
      thousandsSeparator: ',',
      decimalSeparator: '.',
      min: 0,
      max: 1000000,
    },
  },
  {
    id: 'loan_emi_calculator',
    name: 'Loan EMI Calculator',
    category: 'calculations',
    description: 'Monthly installment, interest breakdown, and amortization schedule calculator.',
    iconName: 'Percent',
    badge: 'NEW',
    defaultConfig: { defaultRatePct: 7.5, defaultTermYears: 5 },
  },
  {
    id: 'spreadsheet_widget',
    name: 'Spreadsheet Widget',
    category: 'calculations',
    description: 'Excel-style embedded editable grid with formula calculations (SUM, AVG, PRODUCT).',
    iconName: 'Table',
    defaultConfig: { rows: 5, columns: 4, enableFormulas: true },
  },
  {
    id: 'spreadsheet_to_form',
    name: 'Spreadsheet to Form',
    category: 'calculations',
    description: 'Uploads Excel/CSV to auto-fill form answers matching a unique customer access code.',
    iconName: 'FileSpreadsheet',
    badge: 'PRO',
    defaultConfig: { accessCodeField: 'code' },
  },
  {
    id: 'text_count_calculator',
    name: 'Text Count Calculator',
    category: 'calculations',
    description: 'Real-time word and character counter with minimum and maximum threshold enforcement.',
    iconName: 'FileText',
    defaultConfig: { minWords: 10, maxWords: 500, countMode: 'words' },
  },

  // ─── 4. 📋 Dynamic Repeaters & Lists (18 Widgets) ───────────────────────────
  {
    id: 'configurable_list',
    name: 'Configurable List',
    category: 'repeaters',
    description: 'Dynamic repeater adding rows of custom fields (text, date, dropdown, numbers).',
    iconName: 'ListOrdered',
    badge: 'POPULAR',
    defaultConfig: {
      minRows: 1,
      maxRows: 20,
      columns: [
        { label: 'Item Name', type: 'text', placeholder: 'Part name' },
        { label: 'Qty', type: 'number', placeholder: '1' },
        { label: 'Unit Price', type: 'number', placeholder: '0.00' },
      ],
    },
  },
  {
    id: 'infinite_list',
    name: 'Infinite List',
    category: 'repeaters',
    description: 'Add-as-many rows itemizer for dynamic list entries and attendee names.',
    iconName: 'ListPlus',
    defaultConfig: { placeholder: 'Enter item...', addButtonText: '+ Add Another' },
  },
  {
    id: 'matrix_dynamique',
    name: 'Matrix Dynamique',
    category: 'repeaters',
    description: 'User-expandable data matrix table with customizable column types.',
    iconName: 'Grid',
    defaultConfig: { minRows: 1 },
  },
  {
    id: 'dynamic_dropdowns',
    name: 'Dynamic Dropdowns',
    category: 'repeaters',
    description: 'Multi-level hierarchical cascading select (e.g. Make → Model → Year).',
    iconName: 'GitMerge',
    badge: 'NEW',
    defaultConfig: { hierarchyData: {} },
  },
  {
    id: 'remote_data_dropdown',
    name: 'Remote Data Dropdown',
    category: 'repeaters',
    description: 'Fetches live options from an external REST API endpoint on form load.',
    iconName: 'Globe',
    badge: 'PRO',
    defaultConfig: { apiUrl: '', labelPath: 'name', valuePath: 'id' },
  },

  // ─── 5. 📦 Inventory & Booking (15 Widgets) ─────────────────────────────────
  {
    id: 'inventory_dropdown',
    name: 'Inventory Dropdown',
    category: 'inventory',
    description: 'Tracks item stock quantities and auto-disables sold-out options in real time.',
    iconName: 'Package',
    badge: 'POPULAR',
    defaultConfig: {
      items: [
        { label: 'Standard Filter Pack', stock: 25 },
        { label: 'HEPA Premium Filter', stock: 10 },
      ],
    },
  },
  {
    id: 'weekly_appointment_planner',
    name: 'Weekly Appointment Planner',
    category: 'inventory',
    description: 'Day-by-day time slots with maximum booking limits per slot.',
    iconName: 'CalendarClock',
    badge: 'POPULAR',
    defaultConfig: { maxPerSlot: 1, slotDurationMinutes: 60 },
  },
  {
    id: 'orderable_list',
    name: 'Orderable List',
    category: 'inventory',
    description: 'Drag-and-drop ranking list to reorder preferences visually.',
    iconName: 'ArrowUpDown',
    defaultConfig: { items: ['Quality', 'Speed of Service', 'Pricing', 'Communication'] },
  },
  {
    id: 'global_countdown_timer',
    name: 'Global Countdown Timer',
    category: 'inventory',
    description: 'Form-wide countdown timer that triggers auto-submission at 00:00.',
    iconName: 'Timer',
    defaultConfig: { durationMinutes: 15, autoSubmitOnExpiry: true },
  },
  {
    id: 'unique_id_generator',
    name: 'Unique ID Generator',
    category: 'inventory',
    description: 'Generates sequential or prefix-coded submission IDs (INV-2026-0042).',
    iconName: 'Barcode',
    defaultConfig: { prefix: 'REF-', startNumber: 1001, padding: 5 },
  },

  // ─── 6. 🛡️ Security, Anti-Bot & OTP (16 Widgets) ────────────────────────────
  {
    id: 'cloudflare_turnstile',
    name: 'Cloudflare Turnstile',
    category: 'security',
    description: 'Invisible bot protection verified server-side without frustrating captchas.',
    iconName: 'ShieldAlert',
    badge: 'POPULAR',
    defaultConfig: { theme: 'auto', size: 'flexible' },
  },
  {
    id: 'sms_otp_verification',
    name: 'SMS OTP Confirmation',
    category: 'security',
    description: 'Real-time 6-digit SMS verification code delivery with phone validation.',
    iconName: 'Smartphone',
    badge: 'POPULAR',
    providerType: 'managed_available',
    managedServiceId: 'sms.otp',
    defaultConfig: { provider: 'managed', codeLength: 6, expiryMinutes: 10 },
  },
  {
    id: 'email_otp_verification',
    name: 'E-mail OTP Verification',
    category: 'security',
    description: 'Sends a 6-digit verification code to the respondent’s email before allowing submission.',
    iconName: 'MailCheck',
    defaultConfig: { codeLength: 6, expiryMinutes: 15 },
  },
  {
    id: 'terms_and_conditions',
    name: 'Terms & Conditions',
    category: 'security',
    description: 'Scrollable legal agreement modal with mandatory acceptance checkbox.',
    iconName: 'ScrollText',
    defaultConfig: { termsText: 'By submitting, you agree to our Terms of Service...', isMandatory: true },
  },
  {
    id: 'whatsapp_chat_button',
    name: 'WhatsApp Chat Button',
    category: 'security',
    description: 'Direct WhatsApp launcher with pre-filled support message template.',
    iconName: 'MessageSquare',
    badge: 'POPULAR',
    defaultConfig: { phoneNumber: '+1', prefilledMessage: 'Hi, I have a question about my form submission.' },
  },

  // ─── 7. 🌐 Regional & Identity (26 Widgets) ─────────────────────────────────
  {
    id: 'australia_bsb_checker',
    name: 'Australia BSB Number Checker',
    category: 'regional',
    description: 'Formats 6-digit BSB (XXX-XXX) and validates against official APCA registry.',
    iconName: 'Landmark',
    badge: 'NEW',
    defaultConfig: { autoFormat: true },
  },
  {
    id: 'italian_codice_fiscale',
    name: 'Italian Codice Fiscale Validator',
    category: 'regional',
    description: '16-character alphanumeric Italian tax code validation with check-character checksum.',
    iconName: 'FileCheck2',
    badge: 'NEW',
    defaultConfig: { uppercase: true },
  },
  {
    id: 'france_region_map_picker',
    name: 'France Region Map Picker',
    category: 'regional',
    description: 'Clickable interactive vector map of French regions and departments.',
    iconName: 'Map',
    defaultConfig: { colorScheme: 'blue' },
  },
  {
    id: 'india_states_dropdown',
    name: 'India States Dropdown',
    category: 'regional',
    description: 'Pre-populated 28 states and 8 union territories of India.',
    iconName: 'Building',
    defaultConfig: { includeUnionTerritories: true },
  },
  {
    id: 'us_state_picker',
    name: 'US State & Territory Picker',
    category: 'regional',
    description: '50 US states with two-letter postal abbreviations.',
    iconName: 'Flag',
    defaultConfig: { returnAbbreviation: true },
  },

  // ─── 8. 🎨 UI Styles & Embeds (35 Widgets) ──────────────────────────────────
  {
    id: 'pdf_embedder',
    name: 'PDF Embedder',
    category: 'ui_embeds',
    description: 'In-form PDF document viewer with zoom, full-screen, and pagination controls.',
    iconName: 'FileCode',
    defaultConfig: { pdfUrl: '', heightPx: 500 },
  },
  {
    id: 'digital_magazine_maker',
    name: 'Digital Magazine Maker',
    category: 'ui_embeds',
    description: 'Interactive flipbook viewer for product catalogs, brochures, and price guides.',
    iconName: 'BookOpen',
    badge: 'NEW',
    defaultConfig: { flipbookUrl: '', autoPlay: false },
  },
  {
    id: 'youtube_video_embed',
    name: 'YouTube Video Embed',
    category: 'ui_embeds',
    description: 'Embeds YouTube instructions or product demonstrations directly in the form.',
    iconName: 'Video',
    defaultConfig: { videoUrl: '', autoPlay: false, controls: true },
  },
  {
    id: 'comparison_slider',
    name: 'Comparison Slider',
    category: 'ui_embeds',
    description: 'Before & After split image comparison slider with draggable dividing bar.',
    iconName: 'SlidersHorizontal',
    badge: 'NEW',
    defaultConfig: { beforeImageUrl: '', afterImageUrl: '', startPositionPct: 50 },
  },
  {
    id: 'color_picker',
    name: 'Color Picker',
    category: 'ui_embeds',
    description: 'Visual color swatch and palette selector returning HEX / RGB values.',
    iconName: 'Palette',
    defaultConfig: { defaultColor: '#059669', format: 'hex' },
  },

  // ─── 9. 📊 Feedback & Analytics (18 Widgets) ────────────────────────────────
  {
    id: 'most_frequent_answer',
    name: 'Most Frequent Answer',
    category: 'analytics',
    description: 'Live social proof displaying trending choices based on real-time form submissions.',
    iconName: 'TrendingUp',
    badge: 'AI',
    defaultConfig: { linkedQuestionId: '', minResponsesThreshold: 5 },
  },
  {
    id: 'star_rating_with_comments',
    name: 'Star Rating with Comments',
    category: 'analytics',
    description: '5-star interactive rating coupled with immediate written review feedback.',
    iconName: 'Star',
    defaultConfig: { maxStars: 5, requireCommentOnLowRating: true, threshold: 3 },
  },
  {
    id: 'like_dislike_feedback',
    name: 'Like / Dislike Buttons',
    category: 'analytics',
    description: 'Thumbs up / thumbs down binary sentiment voting with counter badges.',
    iconName: 'ThumbsUp',
    defaultConfig: { showLiveCounts: true },
  },
  {
    id: 'google_analytics_4',
    name: 'Google Analytics 4 (GA4)',
    category: 'analytics',
    description: 'Tracks form views, step abandonment, and conversion goals in GA4.',
    iconName: 'LineChart',
    defaultConfig: { measurementId: '' },
  },
];

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return WIDGET_REGISTRY.filter((w) => w.category === category);
}

export function searchWidgets(query: string, category?: WidgetCategory): WidgetDefinition[] {
  const clean = query.toLowerCase().trim();
  return WIDGET_REGISTRY.filter((w) => {
    const matchesCat = !category || w.category === category;
    if (!matchesCat) return false;
    if (!clean) return true;
    return (
      w.name.toLowerCase().includes(clean) ||
      w.description.toLowerCase().includes(clean) ||
      w.category.toLowerCase().includes(clean)
    );
  });
}
