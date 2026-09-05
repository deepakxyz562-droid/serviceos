/**
 * Seed 4 outreach email templates into the EmailTemplate table with
 * full Fieseros responsive layout, gradients, CTA buttons, and branded footer.
 *
 * Run: `bun run prisma/seed-outreach-templates.ts`
 */
import { db } from '../src/lib/db';
import { renderOutreachEmailLayout, OUTREACH_TEMPLATES_CATALOG } from '../src/lib/email-templates/outreach-templates';

async function main() {
  console.log('[seed-outreach-templates] Seeding 4 upgraded outreach templates...');

  for (const t of OUTREACH_TEMPLATES_CATALOG) {
    // Generate the full master email HTML
    const fullHtml = renderOutreachEmailLayout({
      categoryBadge: t.templateCategory === 'claim' ? 'CLAIM PROFILE' : 'MARKETPLACE',
      headline: t.subject,
      greeting: 'Hi {{businessName}},',
      bodyHtml: t.htmlBody,
    });

    const tagsJson = JSON.stringify([t.templateCategory, 'outreach', 'marketplace']);

    const existing = await db.emailTemplate.findFirst({
      where: { slug: t.slug },
    });

    if (existing) {
      await db.emailTemplate.update({
        where: { id: existing.id },
        data: {
          name: t.name,
          description: t.description,
          subject: t.subject,
          htmlBody: fullHtml,
          textBody: t.textBody,
          category: 'outreach',
          tagsJson,
          variablesJson: t.variablesJson,
          isBuiltIn: true,
        },
      });
    } else {
      await db.emailTemplate.create({
        data: {
          name: t.name,
          slug: t.slug,
          description: t.description,
          subject: t.subject,
          htmlBody: fullHtml,
          textBody: t.textBody,
          category: 'outreach',
          tagsJson,
          variablesJson: t.variablesJson,
          tenantId: null,
          isBuiltIn: true,
        },
      });
    }

    console.log(`✓ Seeded ${t.slug} (${t.name})`);
  }

  console.log('[seed-outreach-templates] All outreach templates seeded successfully.');
}

main()
  .catch((err) => {
    console.error('[seed-outreach-templates] Error seeding outreach templates:', err);
    process.exit(1);
  });
