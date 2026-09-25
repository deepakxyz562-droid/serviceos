/**
 * resolveFormLayout — The SINGLE source of truth for resolving a form's
 * presentation layout from its schema.
 *
 * Used by:
 *   - /form/[formId] (published live form)
 *   - /f/[slug] (legacy hosted form)
 *   - FormStudioBuilder (preview pane)
 *   - FormRuntimeRenderer (runtime mode)
 *   - Embed iframe
 *   - Template preview
 *   - Agent-connected form
 *
 * This eliminates the bug where different parts of the app interpreted
 * the layout enum differently (e.g. /form/[formId] dropped split_media).
 *
 * Canonical layout vocabulary:
 *   - 'classic'     = Jotform-style document form (all fields on one page)
 *   - 'card'        = single-question / card experience (one question per screen)
 *   - 'split_media' = 2-part split hero (media panel + form column)
 *
 * Legacy terms that are normalized:
 *   - 'paper'             → 'classic'
 *   - 'all_on_one_page'   → 'classic'
 *   - 'single_question'   → 'card'
 *   - 'focus'             → 'card' (focus mode was a Typeform-style variant)
 *   - 'conversational'    → 'classic' (agent mode is handled separately)
 */

export type FormLayout = 'classic' | 'card' | 'split_media';

/**
 * Resolve the canonical FormLayout from a form schema.
 *
 * Reads from:
 *   1. schema.theme.layout (preferred — the saved theme layout)
 *   2. schema.settings.formLayout (legacy fallback)
 *
 * Legacy values are normalized to the canonical 3-value enum.
 */
export function resolveFormLayout(schema: {
  theme?: { layout?: string; mediaPanel?: any } | null;
  settings?: { formLayout?: string } | null;
  fields?: Array<{ layoutColumn?: string }> | null;
  mediaPanel?: { enabled?: boolean; mediaUrl?: string; headline?: string } | null;
}): FormLayout {
  const raw =
    schema.theme?.layout ||
    (schema.settings as any)?.formLayout;

  const normalized = raw ? String(raw).toLowerCase() : '';

  if (normalized === 'card' || normalized === 'single_question' || normalized === 'focus') {
    return 'card';
  }

  if (normalized === 'split_media') {
    return 'split_media';
  }

  // Auto-detect split_media if schema has left/right columns
  const hasSplitColumns = Array.isArray(schema.fields) && schema.fields.some(
    (f) => f && (f.layoutColumn === 'left' || f.layoutColumn === 'right')
  );
  if (hasSplitColumns) {
    return 'split_media';
  }

  // Auto-detect split_media if mediaPanel is configured with active content
  const rawPanel = schema.mediaPanel || schema.theme?.mediaPanel;
  if (rawPanel && (rawPanel.enabled === true || rawPanel.mediaUrl || rawPanel.headline)) {
    return 'split_media';
  }

  switch (normalized) {
    case 'paper':
    case 'classic':
    case 'all_on_one_page':
    case 'multi_step': // Legacy templates use 'multi_step' for multi-page classic forms
    default:
      return 'classic';
  }
}

/**
 * Convert the canonical FormLayout to the runtime mode string
 * expected by FormRuntimeRenderer.
 *
 * FormRuntimeRenderer accepts: 'paper' | 'card' | 'agent'
 * We map: classic → paper, card → card, split_media → paper
 * (split_media is handled by the renderer's isSplitLayout detection,
 * not by the mode prop).
 */
export function layoutToRuntimeMode(layout: FormLayout): 'paper' | 'card' {
  return layout === 'card' ? 'card' : 'paper';
}
