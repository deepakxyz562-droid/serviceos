/**
 * C-2C payload hygiene: explicit field selection for Customer reads.
 *
 * The Customer model stores sensitive portal-auth fields (passwordHash,
 * activationToken, activationTokenExpiresAt) and PII (marketingConsentIp).
 * These must NEVER be returned to the browser — previously every
 * `db.customer.findMany` / `findUnique` without a `select` leaked them.
 *
 * This shared select includes every non-sensitive column so list/detail
 * endpoints stay feature-complete while keeping secrets server-side.
 * New secret columns added to the Customer model MUST be excluded here too.
 *
 * Usage:
 *   db.customer.findMany({ where, select: CUSTOMER_PUBLIC_SELECT, ... })
 *   db.customer.findUnique({ where, select: { ...CUSTOMER_PUBLIC_SELECT, jobs: {...} } })
 */
export const CUSTOMER_PUBLIC_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  whatsappId: true,
  preferredCurrency: true,
  workspaceId: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,

  // ── ISSUE-3: structured customer fields from the redesigned form ──
  title: true,
  firstName: true,
  lastName: true,
  companyName: true,
  leadSource: true,
  notificationSettingsJson: true,

  // ── Portal access (non-secret status only) ──
  activatedAt: true,
  lastLoginAt: true,
  invitationSentAt: true,
  portalEnabled: true,
  invitationStatus: true,

  // ── GDPR marketing consent (status + timestamps; source/IP excluded) ──
  marketingConsent: true,
  marketingConsentAt: true,
  unsubscribedAt: true,

  // ── ISSUE-3: nested repeating collections (loaded with relations) ──
  properties: {
    include: {
      contacts: true,
    },
  },
  additionalContacts: true,

  // EXCLUDED (secrets / PII — never return to browser):
  //   passwordHash, activationToken, activationTokenExpiresAt,
  //   marketingConsentSource, marketingConsentIp
} as const;

/**
 * Type of a Customer row projected through CUSTOMER_PUBLIC_SELECT.
 * Lets route handlers stay typed when switching from `include` to `select`.
 */
export type CustomerPublicRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  whatsappId: string | null;
  preferredCurrency: string;
  workspaceId: string | null;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // ── ISSUE-3: structured customer fields ──
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  leadSource: string | null;
  notificationSettingsJson: string;
  activatedAt: Date | null;
  lastLoginAt: Date | null;
  invitationSentAt: Date | null;
  portalEnabled: boolean;
  invitationStatus: string;
  marketingConsent: boolean | null;
  marketingConsentAt: Date | null;
  unsubscribedAt: Date | null;
  // ── ISSUE-3: nested relations ──
  properties: Array<{
    id: string;
    customerId: string;
    label: string | null;
    street1: string;
    street2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string | null;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
    contacts: Array<{
      id: string;
      propertyId: string;
      name: string;
      phone: string | null;
      email: string | null;
      role: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
  additionalContacts: Array<{
    id: string;
    customerId: string;
    name: string;
    phone: string | null;
    email: string | null;
    role: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};
