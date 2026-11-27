import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

describe('Report Rank by Location, Media & AI Creative Studio UI Cleanups & Speed', () => {
  it('removes empty AI Growth Actions from Report and enables 5x5 Rank by Location default scan', () => {
    const perfPanel = readRel('bgosmobile/src/components/gbp/performance-panel.tsx');
    const geoMap = readRel('bgosmobile/src/components/gbp/geo-grid-map.tsx');
    const seoGrowth = readRel('bgosmobile/app/seo-growth.tsx');
    const growthReport = readRel('bgosmobile/app/growth-report.tsx');

    expect(perfPanel).toContain('Rank by Location');
    expect(perfPanel).toContain('runQuickGridScan');
    expect(perfPanel).toContain('gridSize: 5');
    expect(perfPanel).not.toContain('✨ AI Growth Actions');
    expect(geoMap).toContain('Scan 5×5 Rank Grid');
    expect(seoGrowth).toContain('useState<3 | 5>(5)');
    expect(growthReport).not.toContain('name="auto-awesome" size={18} color="#166534"');
  });

  it('removes ADDITIONAL overlay, Core Services & Use Design carousel from Media tab', () => {
    const timeline = readRel('bgosmobile/src/components/gbp/scheduled-photos-timeline.tsx');

    expect(timeline).not.toContain('<View style={styles.portraitOverlay}>');
    expect(timeline).not.toContain('Ready Creatives for You');
    expect(timeline).not.toContain('Use Design');
    expect(timeline).toContain('/^(ADDITIONAL|COVER|PROFILE|LOGO)$/i');
  });

  it('removes navbar magic icon & cardBadge overlay in AI Creative Studio and skips slow template refetch on tap', () => {
    const studio = readRel('bgosmobile/src/components/gbp/ai-studio-feed.tsx');
    const sheet = readRel('bgosmobile/src/components/gbp/media-metadata-sheet.tsx');
    const tabsLayout = readRel('bgosmobile/app/(tabs)/_layout.tsx');

    // Navbar & cards cleanup
    expect(studio).not.toContain('<View style={styles.cardBadge}>');
    expect(studio).toContain('<View style={styles.navTitleWrap}>\n          <Text style={styles.navTitleText}>AI Creative Studio</Text>');

    // Instant tap speed optimization
    expect(sheet).toContain('cachedBusinessMetaByName');
    expect(sheet).toContain('{!selectedTemplate && !editingItem && pendingAssets.length === 0 ? (');
    expect(sheet).toContain('Studio photo already carries creative & caption');

    // Bottom center Posts icon is clean post-add rather than sparkle
    expect(tabsLayout).toContain("['marketing', 'Posts', 'post-add']");
  });
});
