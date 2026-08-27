/**
 * Seed 4 outreach email templates into the EmailTemplate table.
 *
 * Templates use category='outreach' so the existing Template Studio
 * filters them when the Outreach section queries for available templates.
 *
 * `tenantId` is null = global platform templates (visible to all).
 * `isBuiltIn=true` = cannot be deleted (only edited).
 *
 * Run: `bun run prisma/seed-outreach-templates.ts`
 * Idempotent: upserts by [slug, tenantId] (tenantId=null for these).
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface TemplateDef {
  name: string;
  slug: string;
  description: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variablesJson: string;
  /** 'claim' templates are gated: only available for UNCLAIMED tenants */
  templateCategory: 'claim' | 'outreach' | 'operational';
}

const TEMPLATES: TemplateDef[] = [
  // ── 1. Claim Your Business (UNCLAIMED only) ───────────────────────────
  {
    name: 'Claim Your Business',
    slug: 'outreach-claim-your-business',
    description: 'Sent to unclaimed businesses already listed on Fieseros. Includes a personalized claim link.',
    templateCategory: 'claim',
    subject: 'Your business is already listed on Fieseros — claim it now',
    htmlBody: `<p>Hi {{businessName}},</p>
<p>We noticed that <strong>{{businessName}}</strong> is already listed on the Fieseros marketplace.</p>
<p>You can claim your business profile, update your services and information, and start building your presence on Fieseros.</p>
<p><a href="{{claimLink}}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Claim Your Business</a></p>
<p>Or copy this link: {{claimLink}}</p>
<p>This claim link expires in 7 days.</p>
<p>— The Fieseros Team</p>`,
    textBody: `Hi {{businessName}},

We noticed that {{businessName}} is already listed on the Fieseros marketplace.

You can claim your business profile, update your services and information, and start building your presence on Fieseros.

Claim your business here: {{claimLink}}

This claim link expires in 7 days.

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'claimLink', label: 'Claim Link', required: true, example: 'https://fieseros.com/claim?token=...' },
    ]),
  },

  // ── 2. Complete Your Profile (CLAIMED, incomplete profile) ────────────
  {
    name: 'Complete Your Profile',
    slug: 'outreach-complete-your-profile',
    description: 'Sent to claimed businesses with incomplete profiles. Encourages them to add services, hours, photos.',
    templateCategory: 'outreach',
    subject: 'Complete your Fieseros profile to get more customers',
    htmlBody: `<p>Hi {{businessName}},</p>
<p>Great news — your business is listed on Fieseros! But your profile is still incomplete.</p>
<p>Businesses with complete profiles get <strong>3x more customer inquiries</strong> on Fieseros. Adding your services, business hours, and photos takes just a few minutes.</p>
<p><a href="{{marketplaceUrl}}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Complete Your Profile</a></p>
<p>— The Fieseros Team</p>`,
    textBody: `Hi {{businessName}},

Great news — your business is listed on Fieseros! But your profile is still incomplete.

Businesses with complete profiles get 3x more customer inquiries on Fieseros. Adding your services, business hours, and photos takes just a few minutes.

Complete your profile here: {{marketplaceUrl}}

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'marketplaceUrl', label: 'Marketplace URL', required: true, example: 'https://fieseros.com/abc-plumbing' },
    ]),
  },

  // ── 3. Marketplace Opportunity (CLAIMED, not opted into marketplace) ──
  {
    name: 'Marketplace Opportunity',
    slug: 'outreach-marketplace-opportunity',
    description: 'Sent to claimed businesses not yet opted into the marketplace. Highlights lead-generation benefits.',
    templateCategory: 'outreach',
    subject: 'Get more customers from the Fieseros marketplace',
    htmlBody: `<p>Hi {{businessName}},</p>
<p>You're already on Fieseros — but did you know you can also <strong>receive customer leads</strong> through our marketplace?</p>
<p>Fieseros customers in {{city}} are searching for {{industry}} services right now. Opt into the marketplace to start receiving booking requests directly.</p>
<p><a href="{{marketplaceUrl}}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Enable Marketplace Leads</a></p>
<p>— The Fieseros Team</p>`,
    textBody: `Hi {{businessName}},

You're already on Fieseros — but did you know you can also receive customer leads through our marketplace?

Fieseros customers in {{city}} are searching for {{industry}} services right now. Opt into the marketplace to start receiving booking requests directly.

Enable marketplace leads here: {{marketplaceUrl}}

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'city', label: 'City', required: false, example: 'Toronto' },
      { key: 'industry', label: 'Industry', required: false, example: 'plumbing' },
      { key: 'marketplaceUrl', label: 'Marketplace URL', required: true, example: 'https://fieseros.com/abc-plumbing' },
    ]),
  },

  // ── 4. Welcome to Fieseros (any new listing) ──────────────────────────
  {
    name: 'Welcome to Fieseros',
    slug: 'outreach-welcome',
    description: 'Welcome email for newly listed businesses. Introduces Fieseros and what they can do.',
    templateCategory: 'outreach',
    subject: 'Welcome to Fieseros, {{businessName}}!',
    htmlBody: `<p>Hi {{businessName}},</p>
<p>Welcome to Fieseros — the operating system for service businesses.</p>
<p>Your business is now listed on our marketplace. Here's what you can do:</p>
<ul>
<li>Claim your business profile to manage your information</li>
<li>Add your services, pricing, and business hours</li>
<li>Receive customer booking requests</li>
<li>Manage jobs, invoices, and customer relationships</li>
</ul>
<p><a href="{{marketplaceUrl}}" style="display:inline-block;background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Visit Your Listing</a></p>
<p>— The Fieseros Team</p>`,
    textBody: `Hi {{businessName}},

Welcome to Fieseros — the operating system for service businesses.

Your business is now listed on our marketplace. Here's what you can do:
- Claim your business profile to manage your information
- Add your services, pricing, and business hours
- Receive customer booking requests
- Manage jobs, invoices, and customer relationships

Visit your listing here: {{marketplaceUrl}}

— The Fieseros Team`,
    variablesJson: JSON.stringify([
      { key: 'businessName', label: 'Business Name', required: true, example: 'ABC Plumbing' },
      { key: 'marketplaceUrl', label: 'Marketplace URL', required: true, example: 'https://fieseros.com/abc-plumbing' },
    ]),
  },
];

async function main() {
  console.log('[seed-outreach-templates] Seeding 4 outreach templates...');

  for (const t of TEMPLATES) {
    // Store templateCategory inside tagsJson so the Outreach UI can filter
    // without a schema migration on EmailTemplate. The `category` column
    // stays 'outreach' for all 4; the sub-category ('claim' vs 'outreach')
    // lives in tagsJson for the send-dialog gate logic.
    const tagsJson = JSON.stringify([t.templateCategory, 'outreach']);

    await db.emailTemplate.upsert({
      where: { slug_tenantId: { slug: t.slug, tenantId: null } },
      update: {
        name: t.name,
        description: t.description,
        subject: t.subject,
        htmlBody: t.htmlBody,
        textBody: t.textBody,
        variablesJson: t.variablesJson,
        tagsJson,
        category: 'outreach',
        isBuiltIn: true,
      },
      create: {
        name: t.name,
        slug: t.slug,
        description: t.description,
        subject: t.subject,
        htmlBody: t.htmlBody,
        textBody: t.textBody,
        variablesJson: t.variablesJson,
        tagsJson,
        category: 'outreach',
        isBuiltIn: true,
        isDefault: false,
        tenantId: null, // global platform template
      },
    });
    console.log(`  ✓ ${t.slug}`);
  }

  console.log('[seed-outreach-templates] Done.');
}

main()
  .catch((err) => {
    console.error('[seed-outreach-templates] FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
