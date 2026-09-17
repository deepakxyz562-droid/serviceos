import { describe, it, expect } from 'vitest';
import {
  FIELD_REGISTRY,
  FIELD_ALIASES,
  FIELD_CATEGORY_META,
  getFieldById,
  getFieldsByCategory,
  searchFields,
  createFieldFromRegistry,
  CANONICAL_WIDGET_REGISTRY,
} from './canonical-widget-registry';
import { WIDGET_RUNTIME_MAP } from '@/features/forms/components/runtime/widgets/widget-runtime-registry';

describe('Canonical Widget Registry & Form Architecture Tests', () => {
  it('has CANONICAL_WIDGET_REGISTRY matching FIELD_REGISTRY', () => {
    expect(CANONICAL_WIDGET_REGISTRY).toBe(FIELD_REGISTRY);
    expect(CANONICAL_WIDGET_REGISTRY.length).toBeGreaterThan(200);
  });

  it('ensures every widget in CANONICAL_WIDGET_REGISTRY has a valid name and category', () => {
    const validCategories = new Set(FIELD_CATEGORY_META.map((c) => c.id));
    for (const widget of FIELD_REGISTRY) {
      expect(widget.id).toBeTruthy();
      expect(widget.name).toBeTruthy();
      expect(validCategories.has(widget.category)).toBe(true);
      expect(typeof widget.createField).toBe('function');
    }
  });

  it('verifies nearest_location_finder is unified with a complete settings schema', () => {
    const def = getFieldById('nearest_location_finder');
    expect(def).toBeDefined();
    expect(def?.name).toBe('Nearest Location Finder');
    expect(def?.category).toBe('maps');
    
    // Check settings keys
    const settingKeys = def?.settingsSchema.map((s) => s.key) || [];
    expect(settingKeys).toContain('distanceUnit');
    expect(settingKeys).toContain('branches');
    expect(settingKeys).toContain('maxResults');
    expect(settingKeys).toContain('autoGps');

    // Check createField output
    const field = createFieldFromRegistry('nearest_location_finder');
    expect(field).toBeDefined();
    expect(field?.widgetType).toBe('nearest_location_finder');
    expect(field?.widgetConfig?.maxResults).toBe(3);
    expect(field?.widgetConfig?.autoGps).toBe(true);
  });

  it('resolves legacy _v2 aliases to their canonical definitions', () => {
    const legacyIds = [
      'nearest_location_finder_v2',
      'route_planner_v2',
      'service_area_checker_v2',
      'configurable_list_v2',
      'inventory_dropdown_v2',
      'dynamic_dropdowns_v2',
      'star_rating_comments_v2',
      'gdpr_consent_v2',
      'privacy_policy_accept_v2',
      'age_verification_v2',
    ];

    for (const legacyId of legacyIds) {
      const resolved = getFieldById(legacyId);
      expect(resolved, `Legacy ID '${legacyId}' must resolve to a canonical definition`).toBeDefined();
      expect(resolved?.id).not.toContain('_v2');
    }
  });

  it('ensures runtime component mapping exists for key widgets', () => {
    const keyWidgets = [
      'nearest_location_finder',
      'route_planner_map',
      'service_area_checker',
      'configurable_list',
      'inventory_dropdown',
      'dynamic_dropdowns',
      'star_rating_comments',
      'matrix_dynamique',
      'color_picker_widget',
      'google_analytics_4_widget',
    ];

    for (const widgetId of keyWidgets) {
      expect(WIDGET_RUNTIME_MAP[widgetId], `Runtime component for '${widgetId}' must be registered`).toBeDefined();
    }
  });

  it('creates fields with defaults cleanly through createFieldFromRegistry', () => {
    const field = createFieldFromRegistry('dropdown_widget', 'Test Dropdown');
    expect(field).toBeDefined();
    expect(field?.label).toBe('Test Dropdown');
    expect(field?.widgetType).toBe('dropdown_widget');
    expect(field?.required).toBe(false);
  });
});
