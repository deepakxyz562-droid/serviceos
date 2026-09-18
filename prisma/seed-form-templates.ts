/**
 * Seed FormTemplate table from the in-memory registry.
 *
 * Run after `bun run db:push` has applied the FormTemplate model.
 * Idempotent: upserts each template by slug — safe to re-run.
 *
 * Usage: `bun run prisma/seed-form-templates.ts`
 */
import { PrismaClient } from '@prisma/client';
import { getAllTemplates } from '../src/lib/forms/templates';

const prisma = new PrismaClient();

async function main() {
  const templates = getAllTemplates();
  console.log(`[seed-form-templates] Seeding ${templates.length} templates...`);

  let created = 0;
  let updated = 0;

  for (const t of templates) {
    const result = await prisma.formTemplate.upsert({
      where: { slug: t.id },
      create: {
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
      update: {
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
    if (result.createdAt?.getTime() === result.updatedAt?.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`[seed-form-templates] Done. Created ${created}, updated ${updated}.`);
}

main()
  .catch((e) => {
    console.error('[seed-form-templates] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
