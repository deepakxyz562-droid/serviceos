/**
 * FormNode schema + mediaPanel migration adapter.
 *
 * This module introduces the FormNode concept (kind: field | content | layout)
 * and provides a migration adapter that converts mediaPanel content
 * (badge, headline, subtitle, bullets, url) into generic content widgets
 * (badge_widget, heading, paragraph, list_widget, image_widget).
 *
 * This allows the left column to be a generic widget container while
 * preserving template content that was previously stored in the
 * mediaPanel object.
 */

import type { FormField, FormMediaPanel } from './form-schema-types';

// ─── FormNode Types ───────────────────────────────────────────────────

export type FormNodeKind = 'field' | 'content' | 'layout';

export interface FormNode extends FormField {
  /** Distinguishes content/layout elements from form input fields */
  kind?: FormNodeKind;
  /** Nested children for container nodes (Section, Columns, etc.) */
  children?: FormNode[];
}

// ─── Content Widget Type Detection ───────────────────────────────────

/**
 * Determine the kind of a FormField based on its widgetType/type.
 * Content widgets (image, button, spacer, etc.) are 'content'.
 * Layout widgets (heading, paragraph, divider, columns_container) are 'layout'.
 * Everything else is 'field'.
 */
export function getNodeKind(field: FormField): FormNodeKind {
  const contentTypes = [
    'image_widget', 'button_widget', 'spacer_widget',
    'icon_widget', 'alert_widget', 'badge_widget', 'list_widget',
  ];
  const layoutTypes = ['heading', 'paragraph', 'divider', 'columns_container'];

  const wt = field.widgetType || '';
  const t = field.type || '';

  if (contentTypes.includes(wt) || contentTypes.includes(t)) return 'content';
  if (layoutTypes.includes(wt) || layoutTypes.includes(t)) return 'layout';
  return 'field';
}

// ─── mediaPanel → Content Widgets Migration ──────────────────────────

/**
 * Convert a mediaPanel object into an array of FormField entries
 * (content widgets) that can be added to leftColumnFields.
 *
 * This preserves template content (badge, headline, subtitle, bullets, url)
 * while allowing it to be edited as generic widgets in the builder.
 *
 * Each mediaPanel property becomes a content widget:
 *   - mediaPanel.badge     → badge_widget
 *   - mediaPanel.headline  → heading
 *   - mediaPanel.subtitle  → paragraph
 *   - mediaPanel.bullets   → list_widget
 *   - mediaPanel.url       → image_widget
 *   - mediaPanel.mediaUrl  → image_widget (fallback)
 *
 * The widgets are marked with kind: 'content' and placed in the left column
 * (layoutColumn: 'left') so they render in the generic widget container.
 *
 * Only non-empty properties are converted — empty/undefined values are skipped.
 */
export function mediaPanelToContentWidgets(
  mediaPanel: FormMediaPanel | undefined | null,
  formName?: string,
  formDescription?: string | null,
): FormNode[] {
  if (!mediaPanel) return [];

  const nodes: FormNode[] = [];
  let counter = 0;
  const makeId = (prefix: string) => `mp_${prefix}_${Date.now()}_${counter++}`;

  // 1. Badge → badge_widget
  const badgeText = mediaPanel.badgeText || (mediaPanel as any).badge;
  if (badgeText) {
    nodes.push({
      id: makeId('badge'),
      kind: 'content',
      type: 'control_widget',
      widgetType: 'badge_widget',
      label: 'Trust Badge',
      layoutColumn: 'left',
      width: 'full',
      stepId: 'step_1',
      widgetConfig: {
        text: badgeText,
        variant: 'solid',
        alignment: 'left',
      },
      required: false,
    });
  }

  // 2. Headline → heading
  const headline = mediaPanel.headline || formName;
  if (headline) {
    nodes.push({
      id: makeId('headline'),
      kind: 'content',
      type: 'heading',
      widgetType: 'heading',
      label: headline,
      layoutColumn: 'left',
      width: 'full',
      stepId: 'step_1',
      widgetConfig: {
        level: 'h2',
        align: 'left',
      },
      required: false,
    });
  }

  // 3. Subtitle → paragraph
  const subtitle = mediaPanel.subtitle || formDescription;
  if (subtitle) {
    nodes.push({
      id: makeId('subtitle'),
      kind: 'content',
      type: 'paragraph',
      label: subtitle,
      layoutColumn: 'left',
      width: 'full',
      stepId: 'step_1',
      widgetConfig: {
        text: subtitle,
        allowHTML: false,
      },
      required: false,
    });
  }

  // 4. Image URL → image_widget
  const imageUrl = mediaPanel.mediaUrl || (mediaPanel as any).url || mediaPanel.backgroundImageUrl;
  if (imageUrl) {
    nodes.push({
      id: makeId('image'),
      kind: 'content',
      type: 'control_widget',
      widgetType: 'image_widget',
      label: 'Hero Image',
      layoutColumn: 'left',
      width: 'full',
      stepId: 'step_1',
      widgetConfig: {
        src: imageUrl,
        alt: headline || 'Hero image',
        width: '100%',
        height: 'auto',
        alignment: 'center',
        borderRadius: '12px',
      },
      required: false,
    });
  }

  // 5. Bullets → list_widget
  const bullets = mediaPanel.benefitsList || (mediaPanel as any).bullets;
  if (bullets && Array.isArray(bullets) && bullets.length > 0) {
    nodes.push({
      id: makeId('list'),
      kind: 'content',
      type: 'control_widget',
      widgetType: 'list_widget',
      label: 'Benefits List',
      layoutColumn: 'left',
      width: 'full',
      stepId: 'step_1',
      widgetConfig: {
        items: bullets,
        style: 'checkmark',
        iconColor: '#10b981',
      },
      required: false,
    });
  }

  return nodes;
}

/**
 * Check if a mediaPanel has any content that can be migrated to content widgets.
 * Returns true if any of badge/headline/subtitle/bullets/url is non-empty.
 */
export function mediaPanelHasContent(
  mediaPanel: FormMediaPanel | undefined | null,
): boolean {
  if (!mediaPanel) return false;
  return Boolean(
    mediaPanel.badgeText ||
    (mediaPanel as any).badge ||
    mediaPanel.headline ||
    mediaPanel.subtitle ||
    mediaPanel.mediaUrl ||
    (mediaPanel as any).url ||
    mediaPanel.backgroundImageUrl ||
    mediaPanel.benefitsList ||
    (mediaPanel as any).bullets,
  );
}

/**
 * Migrate a form's fields: inject mediaPanel content as content widgets
 * into the left column if the mediaPanel has content and the layout is
 * split_media.
 *
 * This is called during normalizeFormSchema to ensure template content
 * is preserved when rendering in the generic widget container.
 *
 * IMPORTANT: This does NOT modify the original fields array. It returns
 * a NEW array with the content widgets prepended to the left-column fields.
 * The original mediaPanel is kept for backward compatibility (the runtime
 * renderer still uses it for background color, overlay, etc.).
 */
export function injectMediaPanelContent(
  fields: FormField[],
  mediaPanel: FormMediaPanel | undefined | null,
  formName?: string,
  formDescription?: string | null,
): FormField[] {
  if (!mediaPanelHasContent(mediaPanel)) return fields;

  // Check if content widgets have already been injected (idempotency)
  const hasExistingBadge = fields.some((f) => f.widgetType === 'badge_widget' && f.id.startsWith('mp_'));
  if (hasExistingBadge) return fields; // Already migrated — don't double-inject

  const contentNodes = mediaPanelToContentWidgets(mediaPanel, formName, formDescription);
  return [...contentNodes, ...fields];
}
