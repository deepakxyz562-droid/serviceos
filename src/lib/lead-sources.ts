/**
 * Shared lead-source option list (ISSUE-3).
 *
 * The Leads form (`src/components/views/leads-view.tsx`) keeps a local
 * `SOURCE_CONFIG` record keyed by the source value (website, whatsapp,
 * google, facebook, etc.). The redesigned customer form (ISSUE-3) needs
 * the SAME set of source values for its "Lead source" dropdown — so we
 * extract a reusable option list here.
 *
 * This list intentionally mirrors the keys of `SOURCE_CONFIG` so the
 * customer `leadSource` field is interoperable with the existing Lead
 * badges/filters. New sources added to the Leads form should also be
 * added here.
 */
export interface LeadSourceOption {
  value: string;
  label: string;
}

export const LEAD_SOURCE_OPTIONS: LeadSourceOption[] = [
  // ─── Original 8 ────────────────────────────────────────────────────
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Referral' },
  { value: 'manual', label: 'Manual' },

  // ─── Web forms ─────────────────────────────────────────────────────
  { value: 'webform', label: 'Web Form' },
  { value: 'jotform', label: 'JotForm' },
  { value: 'typeform', label: 'Typeform' },
  { value: 'google-forms', label: 'Google Forms' },
  { value: 'form', label: 'Form' },
  { value: 'embed', label: 'Embed' },
  { value: 'hosted_link', label: 'Hosted Link' },

  // ─── AI / automation ───────────────────────────────────────────────
  { value: 'ai_receptionist', label: 'AI Receptionist' },
  { value: 'lead_discovery', label: 'Lead Discovery' },

  // ─── Public inbound pages ──────────────────────────────────────────
  { value: 'public_booking', label: 'Public Booking' },
  { value: 'public_quote', label: 'Public Quote' },
  { value: 'public_request', label: 'Public Request' },

  // ─── Paid acquisition ──────────────────────────────────────────────
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'meta_ads', label: 'Meta Ads' },

  // ─── Marketplaces & directories ────────────────────────────────────
  { value: 'justdial', label: 'JustDial' },
  { value: 'marketplace', label: 'Marketplace' },

  // ─── System / programmatic ─────────────────────────────────────────
  { value: 'api', label: 'API' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'phone', label: 'Phone' },
];

/** Convenience lookup: value → label. */
export const LEAD_SOURCE_LABELS: Record<string, string> =
  Object.fromEntries(LEAD_SOURCE_OPTIONS.map((o) => [o.value, o.label]));
