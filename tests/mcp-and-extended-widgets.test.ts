import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '@/lib/api-key-auth';
import { EXTENDED_CONTENT_WIDGETS } from '@/lib/forms/extended-content-widgets';
import { getFieldById, FIELD_REGISTRY } from '@/lib/forms/canonical-widget-registry';

describe('API Key Authentication & Security', () => {
  it('generates properly formatted API keys with fieseros_ prefix', () => {
    const key = generateApiKey();
    expect(key.startsWith('fieseros_')).toBe(true);
    expect(key.length).toBeGreaterThanOrEqual(48);
  });

  it('hashes API keys consistently with SHA-256', () => {
    const key = 'fieseros_test_key_12345';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});

describe('Extended Content Widgets (Elementor Set)', () => {
  it('registers all 9 extended content widgets in EXTENDED_CONTENT_WIDGETS', () => {
    const ids = EXTENDED_CONTENT_WIDGETS.map((w) => w.id);
    expect(ids).toContain('video_widget');
    expect(ids).toContain('image_box_widget');
    expect(ids).toContain('icon_box_widget');
    expect(ids).toContain('counter_widget');
    expect(ids).toContain('testimonial_widget');
    expect(ids).toContain('progress_bar_widget');
    expect(ids).toContain('social_icons_widget');
    expect(ids).toContain('html_widget');
    expect(ids).toContain('accordion_widget');
  });

  it('resolves all extended widgets through getFieldById without duplicates', () => {
    for (const widget of EXTENDED_CONTENT_WIDGETS) {
      const found = getFieldById(widget.id);
      expect(found, `Widget ${widget.id} must resolve in registry`).toBeDefined();
      expect(found?.name).toBe(widget.name);
      expect(found?.category).toBe('content');
    }
  });

  it('creates valid FormField instances with settings defaults', () => {
    const counter = getFieldById('counter_widget');
    expect(counter).toBeDefined();
    const counterField = counter?.createField('Stat Counter');
    expect(counterField?.type).toBe('control_widget');
    expect(counterField?.widgetType).toBe('counter_widget');
    expect((counterField?.widgetConfig as any)?.value).toBe(12500);

    const accordion = getFieldById('accordion_widget');
    expect(accordion).toBeDefined();
    const accField = accordion?.createField('FAQ');
    expect(accField?.widgetType).toBe('accordion_widget');
    expect((accField?.widgetConfig as any)?.items).toContain('Question 1|Answer 1');
  });
});
