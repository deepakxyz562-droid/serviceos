'use client';

/**
 * Widget Runtime Registry — lazy component map.
 *
 * Maps a widgetType string to a lazily-imported React component.
 * The WidgetRuntimeDispatcher looks up a component here by widgetType,
 * eliminating the giant switch statement. Adding a new widget = adding
 * one line to this map (no dispatcher code changes).
 *
 * The dynamic-import strings MUST be static for Next.js to bundle them.
 */
import { lazy } from 'react';
import type { WidgetProps } from './widget-props';

type LazyWidget = React.LazyExoticComponent<React.ComponentType<WidgetProps>>;

const w = (
  loader: () => Promise<{ default: React.ComponentType<WidgetProps> }>,
): LazyWidget => lazy(loader);

export const WIDGET_RUNTIME_MAP: Record<string, LazyWidget> = {
  // ─── Text & Numbers ─────────────────────────────────────────────────────────
  short_text: w(() => import('./text/short-text')),
  short_answer: w(() => import('./text/short-text')),
  text: w(() => import('./text/short-text')),
  long_text: w(() => import('./text/long-text')),
  long_answer: w(() => import('./text/long-text')),
  textarea: w(() => import('./text/long-text')),
  number: w(() => import('./text/number-input')),
  numerical: w(() => import('./text/number-input')),
  currency_amount_input: w(() => import('./text/currency-amount')),
  spinner: w(() => import('./text/spinner')),
  percentage: w(() => import('./text/percentage')),

  // ─── Choice ──────────────────────────────────────────────────────────────────
  dropdown: w(() => import('./choice/dropdown')),
  single_choice: w(() => import('./choice/single-choice')),
  radio: w(() => import('./choice/single-choice')),
  multiple_choice: w(() => import('./choice/multiple-choice')),
  checkbox: w(() => import('./choice/multiple-choice')),
  image_choice: w(() => import('./choice/image-choice')),
  autocomplete: w(() => import('./choice/autocomplete')),
  tags_input: w(() => import('./choice/tags-input')),
  mask_input: w(() => import('./choice/mask-input')),
  password: w(() => import('./choice/password')),
  rich_text: w(() => import('./choice/rich-text')),

  // ─── Content & Display (Elementor Style) ────────────────────────────────────
  static_image: w(() => import('./static-image-widget')),
  image_display: w(() => import('./static-image-widget')),
  image_widget: w(() => import('./content/content-widgets').then((m) => ({ default: m.ImageWidget as any }))),
  button_widget: w(() => import('./content/content-widgets').then((m) => ({ default: m.ButtonWidget as any }))),
  spacer_widget: w(() => import('./content/content-widgets').then((m) => ({ default: m.SpacerWidget as any }))),
  icon_widget: w(() => import('./content/content-widgets').then((m) => ({ default: m.IconWidget as any }))),
  alert_widget: w(() => import('./content/content-widgets').then((m) => ({ default: m.AlertWidget as any }))),
  badge_widget: w(() => import('./content/content-widgets').then((m) => ({ default: m.BadgeWidget as any }))),
  list_widget: w(() => import('./content/content-widgets').then((m) => ({ default: m.ListWidget as any }))),
  section_widget: w(() => import('./layout/section-widget').then((m) => ({ default: m.SectionWidget as any }))),
  map_embed: w(() => import('./map-embed-widget')),
  interactive_map: w(() => import('./map-embed-widget')),
  video_embed: w(() => import('./video-embed-widget')),
  video_player: w(() => import('./video-embed-widget')),
  divider: w(() => import('./divider-widget')),
  scale_rating: w(() => import('./survey/nps-slider')),

  // ─── DateTime ────────────────────────────────────────────────────────────────
  date_picker: w(() => import('./datetime/date-picker')),
  date: w(() => import('./datetime/date-picker')),
  time_picker: w(() => import('./datetime/time-picker')),
  time: w(() => import('./datetime/time-picker')),
  date_time: w(() => import('./datetime/date-time')),
  appointment: w(() => import('./datetime/appointment')),
  birth_date: w(() => import('./datetime/birth-date')),
  date_range: w(() => import('./datetime/date-range')),
  recurring_date: w(() => import('./datetime/recurring-date')),
  timezone_picker: w(() => import('./datetime/timezone-picker')),
  countdown_timer: w(() => import('./datetime/countdown-timer')),
  global_countdown_timer: w(() => import('./datetime/countdown-timer')),
  weekly_planner: w(() => import('./datetime/weekly-planner')),
  weekly_appointment_planner: w(() => import('./datetime/weekly-planner')),

  // ─── Contact ─────────────────────────────────────────────────────────────────
  email: w(() => import('./contact/email')),
  phone: w(() => import('./contact/phone')),
  full_name: w(() => import('./contact/full-name')),
  name: w(() => import('./contact/full-name')),
  address: w(() => import('./contact/address')),
  company: w(() => import('./contact/company')),

  // ─── Media ────────────────────────────────────────────────────────────────────
  image_upload: w(() => import('./media/image-upload')),
  image_upload_with_notes: w(() => import('./image-upload-with-notes')),
  take_photo: w(() => import('./media/take-photo')),
  take_photo_camera: w(() => import('./media/take-photo')),
  image_preview: w(() => import('./media/image-preview')),
  image_upload_preview: w(() => import('./media/image-preview')),
  draw_on_image: w(() => import('./media/draw-on-image')),
  photo_watermark: w(() => import('./media/photo-watermark')),
  image_scanner_ocr: w(() => import('./media/image-scanner-ocr')),
  video_upload: w(() => import('./media/video-upload')),
  audio_upload: w(() => import('./media/audio-upload')),
  drawing_board: w(() => import('./media/drawing-board')),
  speech_to_text: w(() => import('./media/speech-to-text')),

  // ─── Signature ────────────────────────────────────────────────────────────────
  smooth_signature: w(() => import('./signature/smooth-signature')),
  e_signature: w(() => import('./signature/smooth-signature')),
  signature: w(() => import('./signature/smooth-signature')),
  signature_pad: w(() => import('./signature/smooth-signature')),
  signature_pad_typed: w(() => import('./signature/signature-pad-typed')),
  adobe_sign: w(() => import('./signature/adobe-sign')),
  docusign: w(() => import('./signature/docusign')),
  hellosign: w(() => import('./signature/hellosign')),

  // ─── File ──────────────────────────────────────────────────────────────────────
  file_upload: w(() => import('./file/file-upload')),
  avatar_upload: w(() => import('./file/avatar-upload')),
  qrcode_scanner: w(() => import('./file/qrcode-scanner')),
  barcode_scanner: w(() => import('./file/barcode-scanner')),
  nfc_tag_reader: w(() => import('./file/nfc-tag-reader')),
  voice_recorder: w(() => import('./voice-recorder')),
  audio_note: w(() => import('./voice-recorder')),

  // ─── Calculations ────────────────────────────────────────────────────────────
  form_calculation: w(() => import('./form-calculation')),
  calculation: w(() => import('./form-calculation')),
  calculated: w(() => import('./form-calculation')),
  loan_emi: w(() => import('./calc/loan-emi')),
  loan_emi_calculator: w(() => import('./calc/loan-emi')),
  spreadsheet: w(() => import('./calc/spreadsheet')),
  spreadsheet_widget: w(() => import('./calc/spreadsheet')),
  spreadsheet_to_form: w(() => import('./calc/spreadsheet-to-form')),
  text_count: w(() => import('./calc/text-count')),
  text_count_calculator: w(() => import('./calc/text-count')),
  bmi_calculator: w(() => import('./calc/bmi-calculator')),
  age_calculator: w(() => import('./calc/age-calculator')),
  date_difference: w(() => import('./calc/date-difference')),
  percentage_calculator: w(() => import('./calc/percentage-calculator')),

  // ─── Survey ────────────────────────────────────────────────────────────────────
  star_rating: w(() => import('./survey/star-rating-comments')),
  rating: w(() => import('./survey/star-rating-comments')),
  like_dislike: w(() => import('./survey/like-dislike')),
  nps_slider: w(() => import('./survey/nps-slider')),
  smiley_scale: w(() => import('./survey/smiley-scale')),
  csat_rating: w(() => import('./survey/csat-rating')),
  likert_matrix: w(() => import('./survey/likert-matrix')),
  thumb_rating: w(() => import('./survey/thumb-rating')),

  // ─── Productivity ────────────────────────────────────────────────────────────
  configurable_list: w(() => import('./productivity/configurable-list-v2')),
  infinite_list: w(() => import('./productivity/infinite-list')),
  orderable_list: w(() => import('./productivity/orderable-list')),
  unique_id_generator: w(() => import('./productivity/unique-id-generator')),
  terms_and_conditions: w(() => import('./productivity/terms-and-conditions')),
  cloudflare_turnstile: w(() => import('./security/cloudflare-turnstile')),

  // ─── Payment Gateways ─────────────────────────────────────────────────────────
  payment_stripe_elements: w(() => import('./payment/stripe-elements')),
  payment_stripe_checkout: w(() => import('./payment/stripe-checkout')),
  payment_paypal: w(() => import('./payment/paypal')),
  payment_paypal_complete: w(() => import('./payment/paypal')),
  payment_paypal_pro: w(() => import('./payment/paypal-pro')),
  payment_square: w(() => import('./payment/square')),
  payment_square_payments: w(() => import('./payment/square')),
  payment_apple_pay: w(() => import('./payment/apple-pay')),
  payment_google_pay: w(() => import('./payment/google-pay')),
  payment_razorpay: w(() => import('./payment/razorpay')),
  payment_payu_india: w(() => import('./payment/payu-india')),
  payment_payu_latam: w(() => import('./payment/payu-latam')),
  payment_authorize_net: w(() => import('./payment/authorize-net')),
  payment_braintree: w(() => import('./payment/braintree')),
  payment_mollie: w(() => import('./payment/mollie')),
  payment_twocheckout: w(() => import('./payment/twocheckout')),
  payment_worldpay: w(() => import('./payment/worldpay')),
  payment_bluesnap: w(() => import('./payment/bluesnap')),
  // ─── Tier 3: Enterprise gateways ──────────────────────────────────────────
  payment_cybersource: w(() => import('./payment/cybersource')),
  payment_bluepay: w(() => import('./payment/bluepay')),
  payment_moneris: w(() => import('./payment/moneris')),
  payment_cardpointe: w(() => import('./payment/cardpointe')),
  payment_paysafe: w(() => import('./payment/paysafe')),
  payment_sensepass: w(() => import('./payment/sensepass')),
  payment_paymentwall: w(() => import('./payment/paymentwall')),
  payment_klarna: w(() => import('./payment/klarna')),
  payment_afterpay: w(() => import('./payment/afterpay')),
  payment_clearpay: w(() => import('./payment/afterpay')), // Clearpay shares Afterpay widget
  payment_gocardless: w(() => import('./payment/gocardless')),
  payment_affirm: w(() => import('./payment/affirm')),
  payment_coinbase_commerce: w(() => import('./payment/coinbase-commerce')),
  // ─── Tier 4: Gateway-dependent sub-methods (new standalone widgets) ──────
  payment_venmo: w(() => import('./payment/venmo')),
  payment_cash_app_pay: w(() => import('./payment/cash-app-pay')),
  payment_payfast: w(() => import('./payment/payfast')),
  payment_iyzico: w(() => import('./payment/iyzico')),
  // ─── Phase C: previously-missing payment widgets ──────────────────────────
  payment_echeck_net: w(() => import('./payment/echeck-net')),
  payment_chargify: w(() => import('./payment/chargify')),
  payment_stripe_ach: w(() => import('./payment/stripe-ach')),

  // ─── Products & Pricing ────────────────────────────────────────────────────────
  product_single: w(() => import('./product/single-product')),
  product_multiple: w(() => import('./product/multiple-products')),
  product_subscription: w(() => import('./product/subscription')),
  product_donation: w(() => import('./product/donation')),
  product_purchase_order: w(() => import('./product/purchase-order')),
  product_coupon_code: w(() => import('./product/coupon-code')),
  product_tax_calculator: w(() => import('./product/tax-calculator')),
  product_shipping_calculator: w(() => import('./product/shipping-calculator')),
  product_billing_address: w(() => import('./product/billing-address')),
  product_invoice_generator: w(() => import('./product/invoice-generator')),

  // ─── Phase 2 — Maps & Geolocation (20) ─────────────────────────────────────
  address_autocomplete_google: w(() => import('./maps/address-autocomplete-google')),
  address_autocomplete_osm: w(() => import('./maps/address-autocomplete-osm')),
  address_map_locator: w(() => import('./maps/address-map-locator')),
  driving_distance_calculator: w(() => import('./maps/driving-distance-calculator')),
  elevation_lookup: w(() => import('./maps/elevation-lookup')),
  geofence_checker: w(() => import('./maps/geofence-checker')),
  gps_location_coordinates: w(() => import('./maps/gps-location-coordinates')),
  ip_geolocation: w(() => import('./maps/ip-geolocation')),
  map_pin_drop: w(() => import('./maps/map-pin-drop')),
  map_polygon_drawer: w(() => import('./maps/map-polygon-drawer')),
  map_radius_drawer: w(() => import('./maps/map-radius-drawer')),
  nearest_location_finder: w(() => import('./maps/nearest-location-finder-v2')),
  reverse_geocode: w(() => import('./maps/reverse-geocode')),
  route_planner_map: w(() => import('./maps/route-planner-v2')),
  service_area_checker: w(() => import('./maps/service-area-checker-v2')),
  store_locator: w(() => import('./maps/store-locator')),
  street_view_address_search: w(() => import('./maps/street-view-address-search')),
  time_zone_from_location: w(() => import('./maps/time-zone-from-location')),
  delivery_zone_checker: w(() => import('./maps/delivery-zone-checker')),
  distance_matrix: w(() => import('./maps/distance-matrix')),

  // ─── Phase 2 — Inventory & Booking (15) ────────────────────────────────────
  inventory_dropdown: w(() => import('./inventory/inventory-dropdown-v2')),
  stock_quantity_tracker: w(() => import('./inventory/stock-quantity-tracker')),
  reservation_calendar: w(() => import('./inventory/reservation-calendar')),
  time_slot_booking: w(() => import('./inventory/time-slot-booking')),
  resource_scheduler: w(() => import('./inventory/resource-scheduler')),
  equipment_rental: w(() => import('./inventory/equipment-rental')),
  room_booking: w(() => import('./inventory/room-booking')),
  class_registration: w(() => import('./inventory/class-registration')),
  waitlist_signup: w(() => import('./inventory/waitlist-signup')),
  group_booking: w(() => import('./inventory/group-booking')),
  multi_day_booking: w(() => import('./inventory/multi-day-booking')),
  delivery_window_selector: w(() => import('./inventory/delivery-window-selector')),
  pickup_location_selector: w(() => import('./inventory/pickup-location-selector')),
  capacity_counter: w(() => import('./inventory/capacity-counter')),

  // ─── Phase 2 — Security & Verification (13) ─────────────────────────────────
  email_otp_verification: w(() => import('./security/email-otp-verification')),
  // sms_otp_verification is the canonical key; sms_otp_confirmation is an
  // alias (FIELD_ALIASES) that also resolves here. The wrapper adapts
  // WidgetProps → SmsOtpVerificationProps without duplicating the component.
  sms_otp_verification: w(() => import('./security/sms-otp-confirmation')),
  friendly_captcha: w(() => import('./security/friendly-captcha')),
  math_captcha: w(() => import('./security/math-captcha')),
  image_captcha_slider: w(() => import('./security/image-captcha-slider')),
  identity_verification_kyc: w(() => import('./security/identity-verification-kyc')),
  two_factor_auth: w(() => import('./security/two-factor-auth')),
  password_strength_meter: w(() => import('./security/password-strength-meter')),
  whatsapp_chat_button: w(() => import('./security/whatsapp-chat-button')),
  gdpr_consent_banner: w(() => import('./security/gdpr-consent-banner')),
  consent_log: w(() => import('./security/consent-log')),

  // ─── Phase 2 — Regional & Identity (15) ───────────────────────────────────
  australia_bsb_checker: w(() => import('./regional/australia-bsb-checker-v2')),
  italian_codice_fiscale: w(() => import('./regional/italian-codice-fiscale-v2')),
  france_region_map_picker: w(() => import('./regional/france-region-map-picker')),
  india_states_dropdown: w(() => import('./regional/india-states-dropdown')),
  us_state_picker: w(() => import('./regional/us-state-picker')),
  canada_provinces: w(() => import('./regional/canada-provinces')),
  uk_counties: w(() => import('./regional/uk-counties')),
  brazil_cep: w(() => import('./regional/brazil-cep')),
  germany_plz: w(() => import('./regional/germany-plz')),
  gst_validator: w(() => import('./regional/gst-validator')),
  abn_validator: w(() => import('./regional/abn-validator')),
  vat_validator: w(() => import('./regional/vat-validator')),
  iban_validator: w(() => import('./regional/iban-validator')),
  ssn_validator: w(() => import('./regional/ssn-validator')),
  ein_validator: w(() => import('./regional/ein-validator')),

  // ─── Phase 2 — Dynamic Repeaters (12) ─────────────────────────────────────
  nested_repeater: w(() => import('./repeaters/nested-repeater')),
  drag_drop_ranking: w(() => import('./repeaters/drag-drop-ranking')),
  sortable_list: w(() => import('./repeaters/sortable-list')),
  multi_column_matrix: w(() => import('./repeaters/multi-column-matrix')),
  pivot_table: w(() => import('./repeaters/pivot-table')),
  csv_import: w(() => import('./repeaters/csv-import')),
  dynamic_dropdowns: w(() => import('./repeaters/dynamic-dropdowns-v2')),
  remote_data_dropdown: w(() => import('./repeaters/remote-data-dropdown')),
  repeating_section: w(() => import('./repeaters/repeating-section')),
  key_value_repeater: w(() => import('./repeaters/key-value-repeater')),
  tag_cloud_input: w(() => import('./repeaters/tag-cloud-input')),
  matrix_dynamique: w(() => import('./repeaters/matrix-dynamique-v2')),

  // ─── Phase 2 — PDF & Embeds (15) ──────────────────────────────────────────
  pdf_embedder: w(() => import('./embed/pdf-embedder')),
  digital_magazine_maker: w(() => import('./embed/digital-magazine-maker')),
  youtube_video_embed: w(() => import('./embed/youtube-video-embed')),
  vimeo_embed: w(() => import('./embed/vimeo-embed')),
  comparison_slider: w(() => import('./embed/comparison-slider')),
  color_picker_widget: w(() => import('./embed/color-picker')),
  iframe_embed: w(() => import('./embed/iframe-embed')),
  html_snippet: w(() => import('./embed/html-snippet')),
  product_catalog_flipbook: w(() => import('./embed/product-catalog-flipbook')),
  brochure_embed: w(() => import('./embed/brochure-embed')),
  image_carousel: w(() => import('./embed/image-carousel')),
  audio_player_embed: w(() => import('./embed/audio-player-embed')),
  video_player_embed: w(() => import('./embed/video-player-embed')),
  qr_code_display: w(() => import('./embed/qr-code-display')),

  // ─── Phase 2 — Social & Integrations (15) ─────────────────────────────────
  twitter_embed: w(() => import('./social/twitter-embed')),
  instagram_embed: w(() => import('./social/instagram-embed')),
  facebook_page_plugin: w(() => import('./social/facebook-page-plugin')),
  linkedin_embed: w(() => import('./social/linkedin-embed')),
  youtube_subscribe_button: w(() => import('./social/youtube-subscribe-button')),
  discord_widget: w(() => import('./social/discord-widget')),
  telegram_join_button: w(() => import('./social/telegram-join-button')),
  tiktok_embed: w(() => import('./social/tiktok-embed')),
  reddit_embed: w(() => import('./social/reddit-embed')),
  pinterest_pin: w(() => import('./social/pinterest-pin')),
  github_repo_card: w(() => import('./social/github-repo-card')),
  stripe_payment_link_embed: w(() => import('./social/stripe-payment-link-embed')),
  typeform_embed: w(() => import('./social/typeform-embed')),
  loom_embed: w(() => import('./social/loom-embed')),

  // ─── Phase 3 — Survey Advanced (20) ───────────────────────────────────────
  survey_question_bank: w(() => import('./survey-advanced/survey-question-bank')),
  ab_test_split: w(() => import('./survey-advanced/ab-test-split')),
  sentiment_analysis_ai: w(() => import('./survey-advanced/sentiment-analysis-ai')),
  emotion_picker: w(() => import('./survey-advanced/emotion-picker')),
  feedback_360: w(() => import('./survey-advanced/360-feedback')),
  peer_review: w(() => import('./survey-advanced/peer-review')),
  mood_tracker: w(() => import('./survey-advanced/mood-tracker')),
  daily_check_in: w(() => import('./survey-advanced/daily-check-in')),
  wellness_pulse: w(() => import('./survey-advanced/wellness-pulse')),
  employee_engagement: w(() => import('./survey-advanced/employee-engagement')),
  satisfaction_emoji: w(() => import('./survey-advanced/satisfaction-emoji')),
  survey_slider: w(() => import('./survey-advanced/survey-slider')),
  star_rating_comments: w(() => import('./survey-advanced/star-rating-comments-v2')),
  thumbs_up_down: w(() => import('./survey-advanced/thumbs-up-down-v2')),
  matrix_question: w(() => import('./survey-advanced/matrix-question')),
  ranking_question: w(() => import('./survey-advanced/ranking-question')),
  open_ended_question: w(() => import('./survey-advanced/open-ended-question')),
  multi_select_question: w(() => import('./survey-advanced/multi-select-question')),
  net_promoter_score: w(() => import('./survey-advanced/net-promoter-score')),
  customer_effort_score: w(() => import('./survey-advanced/customer-effort-score')),

  // ─── Phase 3 — Healthcare / HIPAA (12) ────────────────────────────────────
  hipaa_consent: w(() => import('./healthcare/hipaa-consent')),
  medical_history: w(() => import('./healthcare/medical-history')),
  insurance_card_scanner: w(() => import('./healthcare/insurance-card-scanner')),
  prescription_upload: w(() => import('./healthcare/prescription-upload')),
  symptom_checker: w(() => import('./healthcare/symptom-checker')),
  vital_signs_input: w(() => import('./healthcare/vital-signs-input')),
  telehealth_consent: w(() => import('./healthcare/telehealth-consent')),
  hipaa_phi_field: w(() => import('./healthcare/hipaa-phi-field')),
  medical_release_form: w(() => import('./healthcare/medical-release-form')),
  patient_intake: w(() => import('./healthcare/patient-intake')),
  allergy_checklist: w(() => import('./healthcare/allergy-checklist')),

  // ─── Phase 3 — Real Estate (8) ───────────────────────────────────────────
  property_search: w(() => import('./real-estate/property-search')),
  mls_listing_display: w(() => import('./real-estate/mls-listing-display')),
  mortgage_calculator: w(() => import('./real-estate/mortgage-calculator')),
  closing_cost_estimator: w(() => import('./real-estate/closing-cost-estimator')),
  property_inspection_checklist: w(() => import('./real-estate/property-inspection-checklist')),
  tenant_application: w(() => import('./real-estate/tenant-application')),
  lease_agreement_sign: w(() => import('./real-estate/lease-agreement-sign')),
  move_in_checklist: w(() => import('./real-estate/move-in-checklist')),

  // ─── Phase 3 — Education (8) ──────────────────────────────────────────────
  course_registration: w(() => import('./education/course-registration')),
  student_info_card: w(() => import('./education/student-info-card')),
  assignment_submission: w(() => import('./education/assignment-submission')),
  quiz_builder: w(() => import('./education/quiz-builder')),
  grade_input: w(() => import('./education/grade-input')),
  attendance_tracker: w(() => import('./education/attendance-tracker')),
  parent_consent: w(() => import('./education/parent-consent')),
  scholarship_application: w(() => import('./education/scholarship-application')),

  // ─── Phase 3 — Legal (8) ──────────────────────────────────────────────────
  gdpr_consent: w(() => import('./legal/gdpr-consent-v2')),
  privacy_policy_accept: w(() => import('./legal/privacy-policy-accept-v2')),
  nda_sign: w(() => import('./legal/nda-sign')),
  waiver_release: w(() => import('./legal/waiver-release')),
  terms_of_service: w(() => import('./legal/terms-of-service')),
  cookie_consent_banner: w(() => import('./legal/cookie-consent-banner')),
  age_verification: w(() => import('./legal/age-verification-v2')),
  digital_witness: w(() => import('./legal/digital-witness-v2')),

  // ─── Phase 3 — E-commerce (10) ─────────────────────────────────────────────
  product_configurator: w(() => import('./ecommerce/product-configurator')),
  variant_selector: w(() => import('./ecommerce/variant-selector')),
  cart_summary: w(() => import('./ecommerce/cart-summary')),
  shipping_estimator: w(() => import('./ecommerce/shipping-estimator')),
  gift_card_input: w(() => import('./ecommerce/gift-card-input')),
  loyalty_points_display: w(() => import('./ecommerce/loyalty-points-display')),
  wishlist_add: w(() => import('./ecommerce/wishlist-add')),
  abandoned_cart_recovery: w(() => import('./ecommerce/abandoned-cart-recovery')),
  upsell_modal: w(() => import('./ecommerce/upsell-modal')),
  cross_sell: w(() => import('./ecommerce/cross-sell')),

  // ─── Phase 3 — Finance (8) ────────────────────────────────────────────────
  bank_account_validator: w(() => import('./finance/bank-account-validator')),
  routing_number_lookup: w(() => import('./finance/routing-number-lookup')),
  credit_card_scanner: w(() => import('./finance/credit-card-scanner')),
  crypto_wallet_input: w(() => import('./finance/crypto-wallet-input')),
  stock_ticker_display: w(() => import('./finance/stock-ticker-display')),
  expense_input: w(() => import('./finance/expense-input')),
  budget_calculator: w(() => import('./finance/budget-calculator')),
  tax_form_w9: w(() => import('./finance/tax-form-w9')),

  // ─── Phase 3 — Marketing (8) ────────────────────────────────────────────────
  utm_capture: w(() => import('./marketing/utm-capture')),
  lead_scoring_display: w(() => import('./marketing/lead-scoring-display')),
  referral_code_input: w(() => import('./marketing/referral-code-input')),
  campaign_source_tracker: w(() => import('./marketing/campaign-source-tracker')),
  social_share_buttons: w(() => import('./marketing/social-share-buttons-v2')),
  email_signup_segment: w(() => import('./marketing/email-signup-segment')),
  promo_code_unlock: w(() => import('./marketing/promo-code-unlock')),
  viral_waitlist: w(() => import('./marketing/viral-waitlist')),

  // ─── Phase 3 — Analytics (10) ───────────────────────────────────────────────
  google_analytics_4_widget: w(() => import('./analytics/google-analytics-4-widget')),
  facebook_pixel_widget: w(() => import('./analytics/facebook-pixel-widget')),
  mixpanel_event_widget: w(() => import('./analytics/mixpanel-event-widget')),
  hotjar_heatmap_widget: w(() => import('./analytics/hotjar-heatmap-widget')),
  form_abandonment_tracker: w(() => import('./analytics/form-abandonment-tracker')),
  conversion_goal_tracker: w(() => import('./analytics/conversion-goal-tracker')),
  time_on_field: w(() => import('./analytics/time-on-field')),
  scroll_depth_tracker: w(() => import('./analytics/scroll-depth-tracker')),
  submission_source_attribution: w(() => import('./analytics/submission-source-attribution')),
  ab_test_winner: w(() => import('./analytics/ab-test-winner')),

  // ─── Phase 3 — Industry Verticals (18) ─────────────────────────────────────
  construction_site_inspection: w(() => import('./industry/construction-site-inspection')),
  hvac_service_report: w(() => import('./industry/hvac-service-report')),
  plumbing_job_card: w(() => import('./industry/plumbing-job-card')),
  electrical_safety_check: w(() => import('./industry/electrical-safety-check')),
  automotive_inspection: w(() => import('./industry/automotive-inspection')),
  restaurant_health_audit: w(() => import('./industry/restaurant-health-audit')),
  retail_inventory_audit: w(() => import('./industry/retail-inventory-audit')),
  event_catering_order: w(() => import('./industry/event-catering-order')),
  field_service_report: w(() => import('./industry/field-service-report')),
  inspection_checklist_generic: w(() => import('./industry/inspection-checklist-generic')),
  delivery_confirmation: w(() => import('./industry/delivery-confirmation')),
  work_order_form: w(() => import('./industry/work-order-form')),
  maintenance_request: w(() => import('./industry/maintenance-request')),
  incident_report: w(() => import('./industry/incident-report')),
  safety_incident_report: w(() => import('./industry/safety-incident-report')),
  quality_control_checklist: w(() => import('./industry/quality-control-checklist')),
  equipment_inspection: w(() => import('./industry/equipment-inspection')),
  compliance_audit: w(() => import('./industry/compliance-audit')),

  // ─── Phase 4 — More Payment Gateways ───────────────────────────────────────
  // NOTE: payment_dwolla removed from palette — tuple is commented out in
  // phase-4-widgets.ts. Registration kept for backward compatibility with
  // saved forms that may still reference this widgetType.
  // payment_dwolla: w(() => import('./payment/dwolla')),
  payment_skrill: w(() => import('./payment/skrill')),
  payment_cielo: w(() => import('./payment/cielo')),
  payment_mercado_pago: w(() => import('./payment/mercado-pago')),
  payment_pagseguro: w(() => import('./payment/pagseguro')),
  payment_redsys: w(() => import('./payment/redsys')),
  payment_senangpay: w(() => import('./payment/senangpay')),
  payment_wepay: w(() => import('./payment/wepay')),
  payment_helcim: w(() => import('./payment/helcim')),
  payment_eway: w(() => import('./payment/eway')),
  payment_elavon: w(() => import('./payment/elavon')),
  // NOTE: payment_coinpayments removed in Tier 4 — fraud risk (generated
  // fake BTC addresses that could mislead users into sending crypto to
  // non-functional addresses). Crypto payments are covered by
  // payment_coinbase_commerce instead.

  // ─── Phase 4 — More Regional Validators (10) ──────────────────────────────
  mexico_rfc: w(() => import('./regional/mexico-rfc')),
  china_id_card: w(() => import('./regional/china-id-card')),
  japan_my_number: w(() => import('./regional/japan-my-number')),
  korea_resident_number: w(() => import('./regional/korea-resident-number')),
  singapore_nric: w(() => import('./regional/singapore-nric')),
  south_africa_id: w(() => import('./regional/south-africa-id')),
  australia_tfn: w(() => import('./regional/australia-tfn')),
  uk_nino: w(() => import('./regional/uk-nino')),
  germany_tax_id: w(() => import('./regional/germany-tax-id')),
  france_insee: w(() => import('./regional/france-insee')),

  // ─── Phase 4 — Integration Embeds (10) ───────────────────────────────────
  notion_embed: w(() => import('./integrations/notion-embed')),
  airtable_embed: w(() => import('./integrations/airtable-embed')),
  slack_invite_button: w(() => import('./integrations/slack-invite-button')),
  salesforce_lead_form: w(() => import('./integrations/salesforce-lead-form')),
  hubspot_form_embed: w(() => import('./integrations/hubspot-form-embed')),
  mailchimp_subscribe: w(() => import('./integrations/mailchimp-subscribe')),
  google_sheets_sync: w(() => import('./integrations/google-sheets-sync')),
  pipedrive_deal_creator: w(() => import('./integrations/pipedrive-deal-creator')),
  zoho_crm_lead: w(() => import('./integrations/zoho-crm-lead')),
  trello_card_creator: w(() => import('./integrations/trello-card-creator')),

  // ─── Phase 4 — AI-Powered Widgets (5) ─────────────────────────────────────
  ai_image_description: w(() => import('./ai/ai-image-description')),
  ai_form_filler: w(() => import('./ai/ai-form-filler')),
  ai_chatbot_embed: w(() => import('./ai/ai-chatbot-embed')),
  ai_voice_clone: w(() => import('./ai/ai-voice-clone')),
  ai_sentiment_analysis: w(() => import('./ai/ai-sentiment-analysis-v2')),

  // ─── Phase 4 — Utility Widgets (15) ───────────────────────────────────────
  progress_bar_widget: w(() => import('./utility/progress-bar-widget')),
  page_break_widget: w(() => import('./utility/page-break-widget')),
  form_collapse_widget: w(() => import('./utility/form-collapse-widget')),
  save_and_resume_widget: w(() => import('./utility/save-and-resume')),
  form_tabs_widget: w(() => import('./utility/form-tabs-widget')),
  language_selector: w(() => import('./utility/language-selector')),
  currency_selector: w(() => import('./utility/currency-selector')),
  timezone_selector_widget: w(() => import('./utility/timezone-selector')),
  font_size_adjuster: w(() => import('./utility/font-size-adjuster')),
  theme_switcher_widget: w(() => import('./utility/theme-switcher-widget')),
  print_form_button: w(() => import('./utility/print-form-button')),
  download_pdf_button: w(() => import('./utility/download-pdf-button')),
  share_form_button: w(() => import('./utility/share-form-button')),
  embed_form_button: w(() => import('./utility/embed-form-button')),
  qr_form_link: w(() => import('./utility/qr-form-link')),
};

/** Look up a runtime component by widgetType. Returns undefined if not registered. */
export function getRuntimeComponent(widgetType: string): LazyWidget | undefined {
  return WIDGET_RUNTIME_MAP[widgetType];
}

/** Check whether a widgetType has a registered runtime component. */
export function hasRuntimeComponent(widgetType: string): boolean {
  return widgetType in WIDGET_RUNTIME_MAP;
}
