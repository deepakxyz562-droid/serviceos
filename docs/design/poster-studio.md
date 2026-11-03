# BGOS poster studio collection

The shared registry now contains 122 templates: 60 new authored campaign briefs and 62 existing IDs restyled. The new entries include 30 Creative and 30 Standard posters, spanning 12 business categories. Fifteen composition families have four spatial editions each (60 distinct geometries), rather than colour-only duplicates. Both clients use `createCommercialPosterDesign`; persisted design documents are not rewritten.

- Catalog: `shared/poster-studio-catalog.ts`
- Geometry and typography: `shared/poster-composition.ts`
- Native shared preview: `bgosmobile/src/components/design/poster-preview.tsx`
- Images remain replaceable stock photographs, with 2160px source requests and smaller gallery renditions. These are illustrative stock assets, not photographs of the tenant's business. Existing prompt-based background regeneration uses each template's art-direction brief. No new AI photographs were generated for this release.
- Headline, subtitle, badge, CTA, business name, logo and background image remain separate editable layers. Brand and contact values come from the existing business context.
- Unverified discount/guarantee defaults were replaced in legacy selections. Existing saved posts are unchanged.
- Native gallery width is measured from layout, not assumed to be 170px. Native regular/bold fonts match the web/export assets.
- Automated coverage: every registry entry at square, portrait, story and landscape dimensions; unique IDs; 60 distinct new geometries; editable layers; long brand names; filters; and PNG export for all 15 composition families.

Visual review used a generated contact sheet of the new catalog. This is not a substitute for testing the actual Expo application on iOS and Android. External stock availability and the repository's unrelated TypeScript failures remain release considerations.
