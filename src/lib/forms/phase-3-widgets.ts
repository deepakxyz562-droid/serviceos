/**
 * Phase 3 Widget Definitions — 110 industry widgets.
 *
 * Uses the same compact data-driven tuple format as phase-2-widgets.ts.
 *
 * Categories:
 *   - survey-advanced (20)  - healthcare (12)  - real-estate (8)
 *   - education (8)         - legal (8)         - ecommerce (10)
 *   - finance (8)           - marketing (8)     - analytics (10)  - industry (18)
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
  // ─── Survey Advanced (20) ──────────────────────────────────────────────────
  ['survey_question_bank', 'Survey Question Bank', 'survey', 'Library', 'Pre-built survey questions', 'NEW', 'pro'],
  ['ab_test_split', 'A/B Test Split', 'survey', 'Split', 'Show variant A or B', 'PRO', 'business'],
  ['sentiment_analysis_ai', 'AI Sentiment Analysis', 'survey', 'Sparkles', 'AI sentiment of textarea', 'AI', 'business'],
  ['emotion_picker', 'Emotion Picker', 'survey', 'Smile', 'Emoji emotion picker', '', 'free'],
  ['feedback_360', '360° Feedback', 'survey', 'Users', 'Multi-peer feedback', 'PRO', 'business'],
  ['peer_review', 'Peer Review', 'survey', 'UserCheck', 'Single peer review', '', 'pro'],
  ['mood_tracker', 'Mood Tracker', 'survey', 'Heart', 'Daily mood with calendar', 'NEW', 'pro'],
  ['daily_check_in', 'Daily Check-In', 'survey', 'CalendarCheck', 'Wellness daily check-in', '', 'pro'],
  ['wellness_pulse', 'Wellness Pulse', 'survey', 'Activity', 'Wellness 1-10 over time', 'NEW', 'business'],
  ['employee_engagement', 'Employee Engagement', 'survey', 'Users', '5 dimensions × Likert', 'PRO', 'business'],
  ['satisfaction_emoji', 'Satisfaction Emoji', 'survey', 'Smile', '3-emoji satisfaction', '', 'free'],
  ['survey_slider', 'Survey Slider', 'survey', 'SlidersHorizontal', '0-100 slider with labels', '', 'free'],
  ['thumbs_up_down', 'Thumbs Up/Down (v2)', 'survey', 'ThumbsUp', 'Improved thumb rating', '', 'free'],
  ['matrix_question', 'Matrix Question', 'survey', 'Grid3x3', 'Single matrix × 5-point', '', 'pro'],
  ['ranking_question', 'Ranking Question', 'survey', 'ArrowUpDown', 'Rank items 1-N', '', 'pro'],
  ['open_ended_question', 'Open-Ended Question', 'survey', 'FileText', 'Textarea + word count', '', 'free'],
  ['multi_select_question', 'Multi-Select Question', 'survey', 'CheckSquare', 'Select all that apply', '', 'free'],
  ['net_promoter_score', 'NPS Survey', 'survey', 'Gauge', 'NPS + follow-up comment', 'POPULAR', 'pro'],
  ['customer_effort_score', 'Customer Effort Score', 'survey', 'Gauge', 'CES "how easy" 1-7', 'NEW', 'pro'],

  // ─── Healthcare / HIPAA (12) ───────────────────────────────────────────────
  ['hipaa_consent', 'HIPAA Consent', 'security', 'ShieldCheck', 'HIPAA consent checkbox', 'PRO', 'business'],
  ['medical_history', 'Medical History', 'security', 'ClipboardList', 'Conditions, meds, allergies', 'PRO', 'business'],
  ['insurance_card_scanner', 'Insurance Card Scanner', 'media', 'ScanLine', 'OCR insurance card', 'AI', 'business', undefined, 'ocr'],
  ['prescription_upload', 'Prescription Upload', 'file', 'FilePlus', 'Rx upload + pharmacy', 'PRO', 'business'],
  ['symptom_checker', 'Symptom Checker', 'survey', 'Stethoscope', 'Interactive symptom checker', 'AI', 'business'],
  ['vital_signs_input', 'Vital Signs Input', 'survey', 'HeartPulse', 'BP, HR, Temp, RR, O2', 'PRO', 'business'],
  ['appointment_with_provider', 'Appointment + Provider', 'datetime', 'Stethoscope', 'Provider + time picker', 'PRO', 'business'],
  ['telehealth_consent', 'Telehealth Consent', 'security', 'Video', 'Telehealth-specific consent', 'PRO', 'business'],
  ['hipaa_phi_field', 'HIPAA PHI Field (Encrypted)', 'security', 'Lock', 'Encrypted PHI input', 'PRO', 'business'],
  ['medical_release_form', 'Medical Release Form', 'security', 'FileText', 'Records release auth', 'PRO', 'business'],
  ['patient_intake', 'Patient Intake', 'security', 'ClipboardList', 'Demographics + insurance + history', 'PRO', 'business'],
  ['allergy_checklist', 'Allergy Checklist', 'security', 'AlertTriangle', 'Common allergies checklist', 'PRO', 'business'],

  // ─── Real Estate (8) ────────────────────────────────────────────────────────
  ['property_search', 'Property Search', 'maps', 'Search', 'Search properties by address', 'NEW', 'business'],
  ['mls_listing_display', 'MLS Listing Display', 'embed', 'Home', 'Display MLS listing', 'PRO', 'business'],
  ['mortgage_calculator', 'Mortgage Calculator', 'calculation', 'Calculator', 'Mortgage monthly payment', 'POPULAR', 'pro'],
  ['closing_cost_estimator', 'Closing Cost Estimator', 'calculation', 'Receipt', 'Closing costs breakdown', '', 'pro'],
  ['property_inspection_checklist', 'Property Inspection', 'productivity', 'ClipboardCheck', 'Inspection checklist', 'PRO', 'business'],
  ['tenant_application', 'Tenant Application', 'contact', 'FileUser', 'Tenant app with references', 'PRO', 'business'],
  ['lease_agreement_sign', 'Lease Agreement Sign', 'signature', 'FileSignature', 'Lease + signature', 'PRO', 'business'],
  ['move_in_checklist', 'Move-In Checklist', 'productivity', 'ClipboardList', 'Room-by-room condition', 'PRO', 'business'],

  // ─── Education (8) ──────────────────────────────────────────────────────────
  ['course_registration', 'Course Registration', 'productivity', 'GraduationCap', 'Course + section + credits', 'POPULAR', 'pro'],
  ['student_info_card', 'Student Info Card', 'contact', 'IdCard', 'Student info bundle', '', 'free'],
  ['assignment_submission', 'Assignment Submission', 'file', 'FileUp', 'File upload + comments', '', 'pro'],
  ['quiz_builder', 'Quiz Builder', 'productivity', 'HelpCircle', 'Question + options + answer', 'PRO', 'business'],
  ['grade_input', 'Grade Input', 'productivity', 'GraduationCap', 'Student list × grades', 'PRO', 'business'],
  ['attendance_tracker', 'Attendance Tracker', 'productivity', 'ClipboardCheck', 'Present/absent/late', '', 'pro'],
  ['parent_consent', 'Parent Consent', 'security', 'ShieldCheck', 'Parent name + signature', '', 'free'],
  ['scholarship_application', 'Scholarship Application', 'contact', 'Award', 'Essays + achievements', 'PRO', 'business'],

  // ─── Legal (8) ──────────────────────────────────────────────────────────────
  ['gdpr_consent', 'GDPR Consent (v2)', 'security', 'ScrollText', 'Granular GDPR consent', 'POPULAR', 'free'],
  ['privacy_policy_accept', 'Privacy Policy Accept (v2)', 'security', 'FileText', 'Versioned privacy policy', '', 'free'],
  ['nda_sign', 'NDA Sign', 'signature', 'FileSignature', 'NDA + party + signature', 'PRO', 'business'],
  ['waiver_release', 'Waiver / Release', 'signature', 'FileText', 'Liability waiver', 'PRO', 'business'],
  ['terms_of_service', 'Terms of Service', 'security', 'ScrollText', 'ToS acceptance', 'POPULAR', 'free'],
  ['cookie_consent_banner', 'Cookie Consent Banner', 'security', 'Cookie', 'Cookie categories', 'NEW', 'free'],
  ['age_verification', 'Age Verification (v2)', 'security', 'CalendarClock', 'DOB + ID upload', '', 'free'],
  ['digital_witness', 'Digital Witness (v2)', 'signature', 'Eye', 'Witness signature + statement', 'NEW', 'business'],

  // ─── E-commerce (10) ────────────────────────────────────────────────────────
  ['product_configurator', 'Product Configurator', 'payment', 'SlidersHorizontal', 'Step-by-step product config', 'NEW', 'business'],
  ['variant_selector', 'Variant Selector', 'payment', 'Grid2x2', 'Color × size matrix', '', 'pro'],
  ['cart_summary', 'Cart Summary', 'payment', 'ShoppingCart', 'Read-only cart display', '', 'free'],
  ['shipping_estimator', 'Shipping Estimator', 'payment', 'Truck', 'Zip → rate + free-over', '', 'pro'],
  ['gift_card_input', 'Gift Card Input', 'payment', 'Gift', 'Gift card + apply', 'NEW', 'pro'],
  ['loyalty_points_display', 'Loyalty Points Display', 'payment', 'Star', 'Points + redemption', '', 'pro'],
  ['wishlist_add', 'Wishlist Add', 'payment', 'Heart', 'Add to wishlist button', '', 'free'],
  ['abandoned_cart_recovery', 'Abandoned Cart Recovery', 'marketing', 'ShoppingCart', 'Email capture for recovery', 'NEW', 'pro'],
  ['upsell_modal', 'Upsell Modal', 'payment', 'TrendingUp', 'One-click upsell', 'NEW', 'business'],
  ['cross_sell', 'Cross-Sell', 'payment', 'Layers', 'Cross-sell suggestions', '', 'business'],

  // ─── Finance (8) ────────────────────────────────────────────────────────────
  ['bank_account_validator', 'Bank Account Validator', 'finance', 'Landmark', 'Account + routing validation', 'NEW', 'pro'],
  ['routing_number_lookup', 'Routing Number Lookup', 'finance', 'Search', 'ABA routing → bank name', 'NEW', 'pro'],
  ['credit_card_scanner', 'Credit Card Scanner', 'finance', 'CreditCard', 'Camera scan card', 'PRO', 'business'],
  ['crypto_wallet_input', 'Crypto Wallet Input', 'finance', 'Wallet', 'BTC/ETH address + checksum', 'NEW', 'pro'],
  ['stock_ticker_display', 'Stock Ticker Display', 'finance', 'TrendingUp', 'Read-only stock ticker', '', 'pro'],
  ['expense_input', 'Expense Input', 'finance', 'Receipt', 'Category + amount + date', '', 'pro'],
  ['budget_calculator', 'Budget Calculator', 'calculation', 'Calculator', 'Income - expenses', '', 'free'],
  ['tax_form_w9', 'Tax Form W-9', 'finance', 'FileText', 'W-9 with SSN/EIN', 'PRO', 'business'],

  // ─── Marketing (8) ───────────────────────────────────────────────────────────
  ['utm_capture', 'UTM Capture', 'marketing', 'Link', 'Auto-capture UTM from URL', 'NEW', 'free'],
  ['lead_scoring_display', 'Lead Scoring Display', 'marketing', 'Trophy', 'Read-only lead score', '', 'pro'],
  ['referral_code_input', 'Referral Code Input', 'marketing', 'Ticket', 'Referral + validate', '', 'pro'],
  ['campaign_source_tracker', 'Campaign Source Tracker', 'marketing', 'Megaphone', 'Hidden campaign tracker', '', 'free'],
  ['social_share_buttons', 'Social Share Buttons (v2)', 'marketing', 'Share2', 'Share + custom URL + title', 'POPULAR', 'free'],
  ['email_signup_segment', 'Email Signup + Segment', 'marketing', 'Mail', 'Newsletter/promo/both', 'NEW', 'free'],
  ['promo_code_unlock', 'Promo Code Unlock', 'marketing', 'TicketPercent', 'Promo + unlock offer', 'POPULAR', 'pro'],
  ['viral_waitlist', 'Viral Waitlist', 'marketing', 'Users', 'Waitlist + referral position', 'NEW', 'pro'],

  // ─── Analytics (10) ─────────────────────────────────────────────────────────
  ['google_analytics_4_widget', 'Google Analytics 4', 'analytics', 'BarChart3', 'GA4 event tracker', 'POPULAR', 'pro'],
  ['facebook_pixel_widget', 'Facebook Pixel', 'analytics', 'Activity', 'FB pixel tracker', '', 'pro'],
  ['mixpanel_event_widget', 'Mixpanel Event', 'analytics', 'Activity', 'Mixpanel tracker', '', 'pro'],
  ['hotjar_heatmap_widget', 'Hotjar Heatmap', 'analytics', 'MousePointerClick', 'Hotjar integration', '', 'business'],
  ['form_abandonment_tracker', 'Form Abandonment Tracker', 'analytics', 'Timer', 'Time + fields before abandon', 'NEW', 'pro'],
  ['conversion_goal_tracker', 'Conversion Goal Tracker', 'analytics', 'Target', 'Fire conversion on submit', '', 'pro'],
  ['time_on_field', 'Time on Field', 'analytics', 'Clock', 'Read-only per-field timings', '', 'pro'],
  ['scroll_depth_tracker', 'Scroll Depth Tracker', 'analytics', 'MoveVertical', 'How far user scrolled', '', 'pro'],
  ['submission_source_attribution', 'Submission Source Attribution', 'analytics', 'Link', 'Referrer + UTM hidden', 'NEW', 'free'],
  ['ab_test_winner', 'A/B Test Winner Display', 'analytics', 'Trophy', 'Read-only A/B winner', 'PRO', 'business'],

  // ─── Industry Verticals (18) ───────────────────────────────────────────────
  ['construction_site_inspection', 'Construction Site Inspection', 'productivity', 'HardHat', 'Categories × items × status', 'PRO', 'business'],
  ['hvac_service_report', 'HVAC Service Report', 'productivity', 'Fan', 'System + diagnosis + parts', 'PRO', 'business'],
  ['plumbing_job_card', 'Plumbing Job Card', 'productivity', 'Droplet', 'Issue + parts + time', 'PRO', 'business'],
  ['electrical_safety_check', 'Electrical Safety Check', 'productivity', 'Zap', 'Panels + outlets + breakers', 'PRO', 'business'],
  ['automotive_inspection', 'Automotive Inspection', 'productivity', 'Car', 'Exterior + interior + mechanical', 'PRO', 'business'],
  ['restaurant_health_audit', 'Restaurant Health Audit', 'productivity', 'UtensilsCrossed', 'Food + hygiene + equipment', 'PRO', 'business'],
  ['retail_inventory_audit', 'Retail Inventory Audit', 'productivity', 'Boxes', 'SKU + count + discrepancy', 'PRO', 'business'],
  ['event_catering_order', 'Event Catering Order', 'productivity', 'UtensilsCrossed', 'Menu + guests + dietary', 'PRO', 'business'],
  ['field_service_report', 'Field Service Report', 'productivity', 'ClipboardList', 'Job type + work done', 'PRO', 'business'],
  ['inspection_checklist_generic', 'Generic Inspection Checklist', 'productivity', 'ClipboardCheck', 'Template checklist', '', 'pro'],
  ['delivery_confirmation', 'Delivery Confirmation', 'productivity', 'Truck', 'Signature + photo + timestamp', 'POPULAR', 'pro'],
  ['work_order_form', 'Work Order Form', 'productivity', 'ClipboardList', 'Description + priority + assignee', '', 'pro'],
  ['maintenance_request', 'Maintenance Request', 'productivity', 'Wrench', 'Location + issue + urgency', '', 'pro'],
  ['incident_report', 'Incident Report', 'productivity', 'AlertTriangle', 'Date + location + witnesses', '', 'business'],
  ['safety_incident_report', 'Safety Incident Report', 'productivity', 'ShieldAlert', 'OSHA-style fields', 'PRO', 'business'],
  ['quality_control_checklist', 'Quality Control Checklist', 'productivity', 'CheckCircle', 'Item × pass/fail/notes', 'PRO', 'business'],
  ['equipment_inspection', 'Equipment Inspection', 'productivity', 'Wrench', 'Asset + condition + status', 'PRO', 'business'],
  ['compliance_audit', 'Compliance Audit', 'productivity', 'ShieldCheck', 'Regulation × status × notes', 'PRO', 'business'],
];

export const PHASE_3_WIDGETS: FieldDefinition[] = WIDGET_SPECS.map(
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
