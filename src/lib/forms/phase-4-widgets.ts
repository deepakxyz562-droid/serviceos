/**
 * Phase 4 Widget Definitions — 52 more widgets.
 *
 * Categories:
 *   - payment (12 more gateways)
 *   - regional (10 more validators)
 *   - integrations (10 embed widgets)
 *   - ai (5 AI-powered widgets)
 *   - utility (15 misc/utility widgets)
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
  // ─── More Payment Gateways (12) ────────────────────────────────────────────
  ['payment_dwolla', 'Dwolla (ACH)', 'payment', 'Landmark', 'Dwolla ACH bank transfer', '', 'business', undefined, 'payment'],
  ['payment_skrill', 'Skrill', 'payment', 'Wallet', 'Skrill wallet', '', 'pro', undefined, 'payment'],
  ['payment_cielo', 'Cielo (Brazil)', 'payment', 'CreditCard', 'Brazilian gateway', '', 'pro', undefined, 'payment'],
  ['payment_mercado_pago', 'Mercado Pago', 'payment', 'Wallet', 'Latam payments', 'NEW', 'pro', undefined, 'payment'],
  ['payment_pagseguro', 'PagSeguro (Brazil)', 'payment', 'CreditCard', 'Brazilian payments', '', 'pro', undefined, 'payment'],
  ['payment_redsys', 'Redsys (Spain)', 'payment', 'CreditCard', 'Spanish gateway', '', 'pro', undefined, 'payment'],
  ['payment_senangpay', 'SenangPay (Malaysia)', 'payment', 'CreditCard', 'Malaysian gateway', '', 'pro', undefined, 'payment'],
  ['payment_wepay', 'WePay', 'payment', 'CreditCard', 'WePay payments', '', 'pro', undefined, 'payment'],
  ['payment_helcim', 'Helcim', 'payment', 'CreditCard', 'Helcim payments', '', 'pro', undefined, 'payment'],
  ['payment_eway', 'eWay (Australia)', 'payment', 'CreditCard', 'Australian gateway', '', 'pro', undefined, 'payment'],
  ['payment_elavon', 'Elavon', 'payment', 'CreditCard', 'Elavon payments', '', 'pro', undefined, 'payment'],
  ['payment_coinpayments', 'CoinPayments (Crypto)', 'payment', 'Bitcoin', 'Crypto payments', 'NEW', 'business', undefined, 'payment'],

  // ─── More Regional Validators (10) ──────────────────────────────────────────
  ['mexico_rfc', 'Mexico RFC', 'regional', 'IdCard', 'Mexican RFC tax ID', 'NEW', 'pro'],
  ['china_id_card', 'China ID Card', 'regional', 'IdCard', '18-digit with checksum', 'NEW', 'pro'],
  ['japan_my_number', 'Japan My Number', 'regional', 'IdCard', '12-digit Japanese ID', 'NEW', 'pro'],
  ['korea_resident_number', 'Korea Resident Number', 'regional', 'IdCard', '13-digit Korean ID', 'NEW', 'pro'],
  ['singapore_nric', 'Singapore NRIC/FIN', 'regional', 'IdCard', 'SG NRIC validation', 'NEW', 'pro'],
  ['south_africa_id', 'South Africa ID', 'regional', 'IdCard', '13-digit SA ID', 'NEW', 'pro'],
  ['australia_tfn', 'Australia TFN', 'regional', 'IdCard', 'Tax File Number (9-digit)', 'NEW', 'pro'],
  ['uk_nino', 'UK National Insurance', 'regional', 'IdCard', 'UK NINO format', 'NEW', 'pro'],
  ['germany_tax_id', 'Germany Tax ID', 'regional', 'IdCard', 'Steueridentifikationsnummer', 'NEW', 'pro'],
  ['france_insee', 'France INSEE', 'regional', 'IdCard', '15-digit social security', 'NEW', 'pro'],

  // ─── Integration Embeds (10) ───────────────────────────────────────────────
  ['notion_embed', 'Notion Embed', 'embed', 'FileText', 'Embed Notion page', 'NEW', 'free', [
    { key: 'pageUrl', label: 'Notion page URL', type: 'text', group: 'field_specific' },
  ]],
  ['airtable_embed', 'Airtable Embed', 'embed', 'Table', 'Embed Airtable view', 'NEW', 'free', [
    { key: 'shareUrl', label: 'Airtable share URL', type: 'text', group: 'field_specific' },
  ]],
  ['slack_invite_button', 'Slack Invite Button', 'social', 'MessageSquare', 'Slack invite button', 'NEW', 'free', [
    { key: 'inviteUrl', label: 'Slack invite URL', type: 'text', group: 'field_specific' },
  ]],
  ['salesforce_lead_form', 'Salesforce Lead Form', 'social', 'Cloud', 'Salesforce lead capture', 'PRO', 'business', [
    { key: 'orgId', label: 'Salesforce org ID', type: 'text', group: 'field_specific' },
  ]],
  ['hubspot_form_embed', 'HubSpot Form Embed', 'social', 'Cloud', 'HubSpot form embed', 'PRO', 'business', [
    { key: 'portalId', label: 'Portal ID', type: 'text', group: 'field_specific' },
    { key: 'formId', label: 'Form ID', type: 'text', group: 'field_specific' },
  ]],
  ['mailchimp_subscribe', 'Mailchimp Subscribe', 'social', 'Mail', 'Mailchimp subscribe', 'NEW', 'pro', [
    { key: 'listId', label: 'List ID', type: 'text', group: 'field_specific' },
  ]],
  ['google_sheets_sync', 'Google Sheets Sync', 'social', 'Table', 'Sync to Google Sheets', 'PRO', 'business', [
    { key: 'sheetUrl', label: 'Sheet URL', type: 'text', group: 'field_specific' },
  ]],
  ['pipedrive_deal_creator', 'Pipedrive Deal Creator', 'social', 'Handshake', 'Create Pipedrive deal', 'PRO', 'business'],
  ['zoho_crm_lead', 'Zoho CRM Lead', 'social', 'Cloud', 'Zoho CRM lead capture', 'PRO', 'business'],
  ['trello_card_creator', 'Trello Card Creator', 'social', 'Trello', 'Create Trello card', 'NEW', 'free', [
    { key: 'listId', label: 'Trello list ID', type: 'text', group: 'field_specific' },
  ]],

  // ─── AI-Powered Widgets (5) ────────────────────────────────────────────────
  ['ai_image_description', 'AI Image Description', 'media', 'Sparkles', 'AI describes uploaded image', 'AI', 'business'],
  ['ai_form_filler', 'AI Form Filler', 'productivity', 'Sparkles', 'AI auto-fills from document', 'AI', 'business'],
  ['ai_chatbot_embed', 'AI Chatbot Embed', 'embed', 'Bot', 'Embed inline AI chatbot', 'AI', 'business', [
    { key: 'botId', label: 'Bot ID', type: 'text', group: 'field_specific' },
  ]],
  ['ai_voice_clone', 'AI Voice Clone (TTS)', 'media', 'Mic', 'Voice clone TTS', 'AI', 'business', [
    { key: 'voiceId', label: 'Voice ID', type: 'text', group: 'field_specific' },
  ]],
  ['ai_sentiment_analysis_v2', 'AI Sentiment Analysis (v2)', 'survey', 'Sparkles', 'Improved sentiment + confidence', 'AI', 'business'],

  // ─── Utility Widgets (15) ───────────────────────────────────────────────────
  ['progress_bar_widget', 'Progress Bar', 'layout', 'BarChart3', 'Visual progress indicator', 'POPULAR', 'free', [
    { key: 'steps', label: 'Total steps', type: 'number', group: 'field_specific', default: 5 },
    { key: 'currentStep', label: 'Current step', type: 'number', group: 'field_specific', default: 1 },
  ]],
  ['page_break_widget', 'Page Break', 'layout', 'SeparatorHorizontal', 'Multi-step page break', 'POPULAR', 'free'],
  ['form_collapse_widget', 'Form Collapse', 'layout', 'ChevronDown', 'Collapsible section header', '', 'free', [
    { key: 'startCollapsed', label: 'Start collapsed', type: 'boolean', group: 'field_specific', default: false },
    { key: 'headerText', label: 'Header text', type: 'text', group: 'field_specific' },
  ]],
  ['save_and_resume_widget', 'Save & Resume', 'productivity', 'Save', 'Save form state + resume later', 'NEW', 'pro'],
  ['form_tabs_widget', 'Form Tabs', 'layout', 'PanelTop', 'Tabbed multi-section form', 'NEW', 'pro'],
  ['language_selector', 'Language Selector', 'layout', 'Languages', 'Form language picker', 'NEW', 'free', [
    { key: 'languages', label: 'Languages (comma-sep)', type: 'text', group: 'field_specific', default: 'en, es, fr, de, pt, hi, zh, ar, ja, ko' },
  ]],
  ['currency_selector', 'Currency Selector', 'layout', 'DollarSign', 'Form currency picker', '', 'free', [
    { key: 'currencies', label: 'Currencies (comma-sep)', type: 'text', group: 'field_specific', default: 'USD, EUR, GBP, INR, JPY, AUD, CAD, BRL, MXN, CNY' },
  ]],
  ['timezone_selector_widget', 'Timezone Selector', 'datetime', 'Globe', 'Timezone dropdown', '', 'free'],
  ['font_size_adjuster', 'Font Size Adjuster', 'layout', 'Type', 'Accessibility font size adjuster', 'NEW', 'free'],
  ['theme_switcher_widget', 'Theme Switcher', 'layout', 'Moon', 'Light/dark mode toggle', '', 'free'],
  ['print_form_button', 'Print Form Button', 'layout', 'Printer', 'Print form button', '', 'free'],
  ['download_pdf_button', 'Download PDF Button', 'layout', 'FileDown', 'Download form as PDF', 'NEW', 'pro'],
  ['share_form_button', 'Share Form Button', 'layout', 'Share2', 'Share form via native API', '', 'free'],
  ['embed_form_button', 'Embed Form Button', 'layout', 'Code', 'Show embed code', '', 'free'],
  ['qr_form_link', 'QR Form Link', 'layout', 'QrCode', 'Display QR linking to form', 'POPULAR', 'free'],
];

export const PHASE_4_WIDGETS: FieldDefinition[] = WIDGET_SPECS.map(
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
