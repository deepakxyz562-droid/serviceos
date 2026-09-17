/**
 * Canonical Widget Registry — THE single source of truth for every form element.
 *
 * This file is the public entry point for the entire widget ecosystem. It is a
 * thin, intentional facade over `FIELD_REGISTRY` in `field-registry.ts`:
 *
 *   - `FIELD_REGISTRY` already merges BASIC_FIELDS + WIDGET_FIELD_DEFINITIONS +
 *     PHASE_1_WIDGETS + PHASE_2_WIDGETS + PHASE_3_WIDGETS + PHASE_4_WIDGETS.
 *   - This module simply re-exports it under the canonical name plus all of
 *     the lookup helpers, aliases, and category metadata.
 *
 * Why this exists:
 *   Before Phase A1, the codebase had THREE competing widget registries:
 *     1. `widgets/widget-registry.ts`  (54 entries, used by the palette "Widgets" tab)
 *     2. `field-registry.ts`           (the unified FIELD_REGISTRY above)
 *     3. The phase-1..4 files          (consumed by FIELD_REGISTRY)
 *   That split caused bugs where the palette offered a widget that the runtime
 *   could not render, and vice-versa. The fix is to make `FIELD_REGISTRY` the
 *   only registry and to expose it through this canonical name so every callsite
 *   in the codebase (builder, palette, AI co-pilot, server routes, future
 *   server components) imports from ONE place.
 *
 * Migration notes for callers previously importing from `widgets/widget-registry`:
 *   WIDGET_REGISTRY            → CANONICAL_WIDGET_REGISTRY (or FIELD_REGISTRY)
 *   WIDGET_CATEGORIES           → FIELD_CATEGORY_META
 *   WidgetDefinition            → FieldDefinition
 *   WidgetCategory              → FieldDefinition['category']
 *   getWidgetById(id)           → getFieldById(id)         (alias-aware)
 *   getWidgetsByCategory(cat)   → getFieldsByCategory(cat)
 *   searchWidgets(query, cat)   → searchFields(query, cat)
 *   WidgetDefinition.defaultConfig is gone — use FieldDefinition.createField()
 *   which produces a FormField with widgetConfig pre-populated from settingsSchema
 *   defaults. To add a widget to a form, call `createFieldFromRegistry(id, label)`.
 */
import type { FieldDefinition } from './field-settings-types';
import {
  FIELD_REGISTRY,
  FIELD_ALIASES,
  FIELD_CATEGORY_META,
  getFieldById,
  getFieldsByCategory,
  searchFields,
  createFieldFromRegistry,
  BASIC_FIELDS,
  WIDGET_FIELD_DEFINITIONS,
  PHASE_1_WIDGETS,
  PHASE_2_WIDGETS,
  PHASE_3_WIDGETS,
  PHASE_4_WIDGETS,
} from './field-registry';

export type {
  FieldDefinition,
};

export {
  FIELD_REGISTRY,
  FIELD_ALIASES,
  FIELD_CATEGORY_META,
  getFieldById,
  getFieldsByCategory,
  searchFields,
  createFieldFromRegistry,
  BASIC_FIELDS,
  WIDGET_FIELD_DEFINITIONS,
  PHASE_1_WIDGETS,
  PHASE_2_WIDGETS,
  PHASE_3_WIDGETS,
  PHASE_4_WIDGETS,
};

/**
 * The canonical, merged, de-duplicated widget registry.
 *
 * Alias of `FIELD_REGISTRY`. Every widget the AI Form Studio can offer, edit,
 * or render is in this array. Use the `getFieldById` helper (alias-aware) for
 * lookups by widgetType, since some saved forms use legacy IDs that map to
 * canonical entries via `FIELD_ALIASES`.
 */
export const CANONICAL_WIDGET_REGISTRY: FieldDefinition[] = FIELD_REGISTRY;

/**
 * Convenience helper that returns the runtime component id declared by a
 * FieldDefinition. Falls back to the widget's `id` (which the runtime
 * registry uses as its key when `createField` does not override `widgetType`).
 */
export function getRuntimeComponentId(widgetId: string): string | undefined {
  const def = getFieldById(widgetId);
  if (!def) return undefined;
  return def.runtimeComponentId ?? def.id;
}
