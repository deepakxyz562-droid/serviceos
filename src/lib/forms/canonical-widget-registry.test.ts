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
    expect(
      dups,
      `Duplicate widget IDs found: ${dups.map(([id, n]) => `${id}(${n})`).join(', ')}`,
    ).toEqual([]);
    expect(idCounts.size).toBe(FIELD_REGISTRY.length);
  });

  it('R3-b: every widget that sets a widgetType can be resolved by the dispatcher', () => {
    // For each widget whose createField() produces a `widgetType`, verify
    // the dispatcher's 3-layer resolution chain finds a component:
    //   1. explicit runtimeComponentId override
    //   2. direct WIDGET_RUNTIME_MAP[widgetType]
    //   3. FIELD_ALIASES[widgetType] → canonical map key
    //
    // EXCLUSIONS (legitimately resolved via the legacy switch statement in
    // widget-runtime-dispatcher.tsx, not the lazy map — these work fine at
    // runtime, they just haven't been migrated to lazy imports yet):
    //   - form_calculation, voice_recorder
    //   - most_frequent_answer (Phase R4b scope)
    const LEGACY_SWITCH_ONLY = new Set([
      'form_calculation',
      'voice_recorder',
      // R4 scope — removed from this set once R4a/R4b ship:
      // sms_otp_verification now resolves via lazy map (R4a)
      // sms_otp_confirmation resolves via alias → sms_otp_verification (R4a)
      'most_frequent_answer', // R4b scope
    ]);
    // Widgets rendered by the form-runtime-renderer's type-based path, not
    // the dispatcher. These set a primitive type (paragraph, rating) in
    // createField() and the renderer handles them directly.
    const TYPE_BASED_RENDER = new Set(['divider', 'scale_rating']);
    const unresolved: string[] = [];
    for (const widget of FIELD_REGISTRY) {
      if (widget.id.startsWith('payment_') || widget.category === 'payment') continue;
      if (LEGACY_SWITCH_ONLY.has(widget.id)) continue;
      if (TYPE_BASED_RENDER.has(widget.id)) continue;

      // Only check widgets that actually produce a widgetType — primitive
      // fields (short_answer, dropdown, radio, etc.) are rendered by the
      // form-runtime-renderer's type-based path and don't need the dispatcher.
      const field = widget.createField('test');
      const wt = (field as { widgetType?: string }).widgetType;
      if (!wt) continue;
      // The 'hidden' field sets widgetType:'hidden' but is layout-only.
      if (wt === 'hidden') continue;

      const resolved = resolveRuntimeKey(wt);
      if (!resolved) unresolved.push(`${widget.id} (widgetType='${wt}')`);
    }
    expect(
      unresolved,
      `Widgets with no resolvable runtime component: ${unresolved.join(', ')}`,
    ).toEqual([]);
  });

  it('R3-c: the 13 legacy IDs fixed in R1 now resolve to a real runtime component', () => {
    // Direct regression for the 15 widgets the external audit flagged as
    // "no runtime handler at all". After R1, 13 resolve through the
    // dispatcher's 3-layer chain. (sms_otp_confirmation + most_frequent_answer
    // are Phase R4 scope.)
    const legacyIds = [
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
      expect(
        resolved,
        `Legacy ID '${id}' must resolve to a runtime component`,
      ).toBeDefined();
    }
  });

  it('R3-d: FIELD_ALIASES do not point to nonexistent canonical IDs', () => {
    // Catches typos in the alias table (e.g. an alias pointing to an ID that
    // was deleted in Phase R2). Every alias value must exist in FIELD_REGISTRY.
    const registryIds = new Set(FIELD_REGISTRY.map((w) => w.id));
    const broken: string[] = [];
    for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
      if (!registryIds.has(canonical)) {
        broken.push(`${alias} → ${canonical} (canonical not in registry)`);
      }
    }
    expect(broken, `Broken aliases: ${broken.join('; ')}`).toEqual([]);
  });

  it('R3-e: widgets marked unavailable are hidden from the palette but remain in registry', () => {
    // Regression for Phase R4b: most_frequent_answer has no runtime component.
    // Instead of presenting a misleading functional widget, it's marked
    // `unavailable` so users can't add it to new forms. The definition stays
    // in FIELD_REGISTRY so saved forms using it still render (via <Input>
    // fallback).
    const unavailable = FIELD_REGISTRY.filter((w) => w.unavailable);
    // At least most_frequent_answer must be marked unavailable.
    expect(
      unavailable.some((w) => w.id === 'most_frequent_answer'),
      'most_frequent_answer must be marked unavailable (no runtime component)',
    ).toBe(true);

    // Every unavailable widget must still have a valid id + createField
    // (so saved forms can still resolve the definition).
    for (const w of unavailable) {
      expect(w.id).toBeTruthy();
      expect(typeof w.createField).toBe('function');
    }
  });
});

/**
 * Mirror of the dispatcher's resolveRuntimeComponent() — used by R3 tests to
 * verify that the same resolution chain the renderer uses actually finds a
 * component for every registered widget.
 *
 * Resolution order (first match wins):
 *   1. FieldDefinition.runtimeComponentId (explicit override)
 *   2. Direct WIDGET_RUNTIME_MAP[widgetType]
 *   3. FIELD_ALIASES[widgetType] → canonical map key (one level of recursion)
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
