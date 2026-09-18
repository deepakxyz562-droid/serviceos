/**
 * Seed FormTemplate table from the in-memory registry.
 *
 * Run after `bun run db:push` has applied the FormTemplate model.
 * Idempotent: upserts each template by slug — safe to re-run.
 *
 * Usage: `bun run prisma/seed-form-templates.ts`
 */
import { db } from '../src/lib/db';
import { getAllTemplates } from '../src/lib/forms/templates';

async function main() {
  const templates = getAllTemplates();
  console.log(`[seed-form-templates] Seeding ${templates.length} templates via db adapter...`);

  let created = 0;
  let updated = 0;

  for (const t of templates) {
    try {
      const existing = await (db as any).formTemplate.findUnique({
        where: { slug: t.id },
      });

      if (!existing) {
        await (db as any).formTemplate.create({
          data: {
            slug: t.id,
            name: t.name,
            shortDescription: t.shortDescription,
            description: t.description,
            schemaJson: t as unknown as object,
            categories: t.categories,
            industries: t.industries,
            useCases: t.useCases,
            audiences: t.audiences,
            tags: t.tags,
            source: t.source,
            status: t.status,
            isPublic: t.isPublic,
            isFeatured: t.isFeatured,
            usageCount: t.usageCount ?? 0,
            viewCount: t.viewCount ?? 0,
            cloneCount: t.cloneCount ?? 0,
            ratingAverage: t.ratingAverage ?? 0,
            ratingCount: t.ratingCount ?? 0,
            seoTitle: t.seo.seoTitle,
            seoDescription: t.seo.seoDescription,
            seoKeywords: t.seo.seoKeywords,
            authorId: t.authorId ?? null,
            publishedAt: t.status === 'published' ? new Date() : null,
          },
        });
        created++;
      } else {
        await (db as any).formTemplate.update({
          where: { slug: t.id },
          data: {
            name: t.name,
            shortDescription: t.shortDescription,
            description: t.description,
            schemaJson: t as unknown as object,
            categories: t.categories,
            industries: t.industries,
            useCases: t.useCases,
            audiences: t.audiences,
            tags: t.tags,
            source: t.source,
            status: t.status,
            isPublic: t.isPublic,
            isFeatured: t.isFeatured,
            seoTitle: t.seo.seoTitle,
            seoDescription: t.seo.seoDescription,
            seoKeywords: t.seo.seoKeywords,
          },
        });
        updated++;
      }
    } catch (err: any) {
      console.warn(`[seed-form-templates] Skipped ${t.id}: ${err.message}`);
    }
  }

  console.log(`[seed-form-templates] Done! Created ${created}, updated ${updated}.`);
}

main()
  .catch((e) => {
    console.error('[seed-form-templates] Error:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
