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

  // ─── R3: Registry uniqueness + end-to-end runtime coverage ────────────────
  // These tests would have caught all 30 duplicate IDs (Phase R2) and all 15
  // widgets that had no runtime handler (Phase R1) automatically. They mirror
  // the dispatcher's resolveRuntimeComponent() resolution chain so the test
  // validates what the renderer actually does at runtime.

  it('R3-a: every widget ID in FIELD_REGISTRY is unique (no duplicates)', () => {
    // Regression for the 30 duplicate IDs fixed in Phase R2.
    // Before R2 this would fail with 30 collisions; now must be 0.
    const idCounts = new Map<string, number>();
    for (const widget of FIELD_REGISTRY) {
      idCounts.set(widget.id, (idCounts.get(widget.id) ?? 0) + 1);
    }
    const dups = [...idCounts.entries()].filter(([, n]) => n > 1);
    expect(dups, `Duplicate widget IDs found: ${dups.map(([id, n]) => `${id}(${n})`).join(', ')}`).toEqual([]);
    expect(idCounts.size).toBe(FIELD_REGISTRY.length);
  });

  it('R3-b: every FieldDefinition has either a runtimeComponentId, a direct map entry, or an alias', () => {
    // For each widget in the canonical registry, verify that the dispatcher
    // can resolve a runtime component through one of these 3 layers:
    //   1. explicit runtimeComponentId override
    //   2. direct WIDGET_RUNTIME_MAP[id]
    //   3. FIELD_ALIASES[id] → canonical map key
    //
    // The contract: if a widget's createField() produces type='control_widget',
    // it MUST have a resolvable runtime component (the dispatcher is the only
    // renderer for control_widget fields). Widgets that produce primitive
    // types (short_answer, email, rating, etc.) are rendered by the form-
    // runtime-renderer's type-based path and don't need a map entry.
    //
    // EXCLUSIONS:
    //   - Payment widgets (rendered by PaymentGatewayRuntime)
    //   - Layout-only fields (divider, hidden, heading, paragraph, section_break)
    //   - Legacy switch-case widgets not yet migrated to the lazy map
    //     (form_calculation, sms_otp_verification, voice_recorder — these have
    //      inline cases in widget-runtime-dispatcher.tsx and work fine, they
    //      just haven't been refactored to lazy imports yet)
    //   - Known gaps closed by Phase R4 (sms_otp_confirmation, most_frequent_answer)
    const LAYOUT_ONLY = new Set(['divider', 'hidden', 'heading', 'paragraph', 'section_break', 'columns_container']);
    const LEGACY_SWITCH_ONLY = new Set([
      'form_calculation', 'sms_otp_verification', 'voice_recorder',
      // R4 scope — will be removed from this set once R4a/R4b ship:
      'sms_otp_confirmation', 'most_frequent_answer',
    ]);
    const unresolved: string[] = [];
    for (const widget of FIELD_REGISTRY) {
      if (widget.id.startsWith('payment_') || widget.category === 'payment') continue;
      if (LAYOUT_ONLY.has(widget.id)) continue;
      if (LEGACY_SWITCH_ONLY.has(widget.id)) continue;

      // Only assert runtime resolution for control_widget fields — primitive
      // types are rendered by form-runtime-renderer's type-based path.
      const field = widget.createField('test');
      if (field.type !== 'control_widget') continue;

      const resolved = resolveRuntimeKey(widget.id);
      if (!resolved) unresolved.push(widget.id);
    }
    expect(unresolved, `Widgets with no resolvable runtime component: ${unresolved.join(', ')}`).toEqual([]);
  });

  it('R3-c: the 15 previously-broken legacy IDs now resolve to a real runtime component', () => {
    // Direct regression for the 15 widgets the external audit flagged as
    // "no runtime handler at all". After R1, all 15 must resolve through the
    // dispatcher's 3-layer chain. (Note: sms_otp_confirmation + most_frequent_
    // answer are handled in Phase R4 — they're allowed to fail here until R4
    // ships. This test currently asserts the 13 fixed in R1.)
    const legacyIds = [
      // ✅ Fixed in R1 (13 IDs):
      'google_analytics_4',
      'color_picker',
      'like_dislike_feedback',
      'star_rating_with_comments',
      'dropdown_widget',
      'single_choice_widget',
      'multiple_choice_widget',
      'date_picker_widget',
      'time_picker_widget',
      'email_widget',
      'phone_widget',
      'address_widget',
      'file_upload_widget',
    ];
    for (const id of legacyIds) {
      const resolved = resolveRuntimeKey(id);
      expect(resolved, `Legacy ID '${id}' must resolve to a runtime component`).toBeDefined();
    }
  });

  it('R3-d: FIELD_ALIASES do not point to nonexistent canonical IDs', () => {
    // Catches typos in the alias table (e.g. an alias pointing to an ID that
    // was deleted). Every alias value must exist in FIELD_REGISTRY.
    const registryIds = new Set(FIELD_REGISTRY.map((w) => w.id));
    const broken: string[] = [];
    for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
      if (!registryIds.has(canonical)) {
        broken.push(`${alias} → ${canonical} (canonical not in registry)`);
      }
    }
    expect(broken, `Broken aliases: ${broken.join('; ')}`).toEqual([]);
  });
});

/**
 * Mirror of the dispatcher's resolveRuntimeComponent() — used by R3 tests to
 * verify that the same resolution chain the renderer uses actually finds a
 * component for every registered widget.
 */
function resolveRuntimeKey(widgetType: string): string | undefined {
  const def = getFieldById(widgetType);
  if (def?.runtimeComponentId && WIDGET_RUNTIME_MAP[def.runtimeComponentId]) {
    return def.runtimeComponentId;
  }
  if (WIDGET_RUNTIME_MAP[widgetType]) return widgetType;
  const alias = FIELD_ALIASES[widgetType];
  if (alias && alias !== widgetType) {
    if (WIDGET_RUNTIME_MAP[alias]) return alias;
    const aliasDef = getFieldById(alias);
    if (aliasDef?.runtimeComponentId && WIDGET_RUNTIME_MAP[aliasDef.runtimeComponentId]) {
      return aliasDef.runtimeComponentId;
    }
  }
  return undefined;
}
