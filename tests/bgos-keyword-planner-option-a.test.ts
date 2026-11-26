import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf8');
}

describe('Option A: Keyword Planner merged into AI Search & SEO', () => {
  it('removes standalone Keyword Planner tiles from Mobile Home and Tools tabs', () => {
    const homeTabs = readRel('bgosmobile/app/(tabs)/index.tsx');
    const toolsTab = readRel('bgosmobile/app/(tabs)/tools.tsx');

    expect(homeTabs).not.toContain("route: '/keyword-planner'");
    expect(toolsTab).not.toContain("router.push('/keyword-planner')");
    expect(toolsTab).toContain('Target keywords, Website audit, Maps Geo-Grid & AI visibility');
  });

  it('embeds SeoKeywordsTab into AI Search & SEO (seo-growth) with Deep-Link tab=keywords support', () => {
    const seoGrowth = readRel('bgosmobile/app/seo-growth.tsx');
    const keywordsTab = readRel('bgosmobile/src/components/gbp/seo-keywords-tab.tsx');
    const redirectAlias = readRel('bgosmobile/app/keyword-planner.tsx');

    expect(seoGrowth).toContain("resolveSeoTabParam");
    expect(seoGrowth).toContain("id: 'keywords' as const, label: 'Keywords'");
    expect(seoGrowth).toContain('<SeoKeywordsTab');
    expect(seoGrowth).toContain("useResource<KeywordPlanResponse>('/api/gbp/keyword-plan'");

    // Merged tab exposes Real GBP Search Terms, Winnability, Target tracking, and Geo-Grid shortcut
    expect(keywordsTab).toContain('/api/gbp/keyword-plan/suggest');
    expect(keywordsTab).toContain('/api/gbp/keyword-plan/analyze');
    expect(keywordsTab).toContain('/api/gbp/services/optimize');
    expect(keywordsTab).toContain('onScanKeywordOnGrid');
    // Un-analyzed heuristic fallback score badge removed from Target list
    expect(keywordsTab).not.toContain('Score {kw.score}');

    // Legacy route redirects cleanly instead of crashing
    expect(redirectAlias).toContain("router.replace('/seo-growth?tab=keywords')");
  });

  it('renames web Keyword Planner heading and hides un-analyzed placeholder score pill', () => {
    const webGbp = readRel('src/components/bgos/social-marketing.tsx');

    expect(webGbp).toContain('Target Keywords &amp; Local Search Ranking');
    expect(webGbp).not.toContain('Keyword Planner &amp; Local Search Ranking');
    expect(webGbp).toContain('{kw.winnability.winnabilityTier} · {kw.winnability.winnabilityScore}');
  });
});
