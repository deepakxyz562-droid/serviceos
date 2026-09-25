/**
 * Element Registry 2.0 — Content widget definitions for Elementor-style builder.
 *
 * These are CONTENT elements (not form input fields). They render visual
 * content on the form page: images, buttons, spacers, icons, alerts,
 * badges, and lists.
 *
 * Each element is registered in the FIELD_REGISTRY with a unique id so
 * it appears in the widget palette alongside form fields. They render
 * via WidgetRuntimeDispatcher (the same dispatcher used by form fields).
 *
 * Categories:
 *   - 'content' — visual content elements (image, button, spacer, icon, alert)
 *   - 'layout' — layout elements (heading, paragraph, divider, columns_container)
 *
 * These elements are treated as FormField entries with:
 *   - type: 'control_widget'
 *   - widgetType: 'image_widget' / 'button_widget' / etc.
 *   - widgetConfig: { ...content-specific props }
 *
 * This allows them to coexist with form fields in the same FormField[]
 * array, be dragged/dropped via SortableFieldWrapper, and be edited
 * via the Inspector (WidgetSettingsRenderer).
 */

import type { FieldDefinition } from './field-settings-types';

export const CONTENT_WIDGETS: FieldDefinition[] = [
  // ─── Image Widget ────────────────────────────────────────────────────
  {
    id: 'image_widget',
    name: 'Image',
    category: 'content',
    iconName: 'Image',
    description: 'Display an image on the form',
    badge: 'CONTENT',
    tier: 'free',
    createField: (label = 'Image') => ({
      label,
      type: 'control_widget',
      widgetType: 'image_widget',
      widgetConfig: {
        src: '',
        alt: '',
        width: '100%',
        height: 'auto',
        alignment: 'center',
        borderRadius: '0px',
        linkUrl: '',
        openInNewTab: true,
      },
      required: false,
    }),
    settingsSchema: [
      { key: 'src', label: 'Image URL', type: 'text', group: 'field_specific', placeholder: 'https://...', helpText: 'Paste an image URL or upload.' },
      { key: 'alt', label: 'Alt Text', type: 'text', group: 'field_specific', placeholder: 'Describe the image...' },
      { key: 'width', label: 'Width', type: 'text', group: 'field_specific', default: '100%', placeholder: 'e.g. 100%, 300px, auto' },
      { key: 'height', label: 'Height', type: 'text', group: 'field_specific', default: 'auto', placeholder: 'e.g. auto, 200px' },
      { key: 'alignment', label: 'Alignment', type: 'select', group: 'field_specific', default: 'center', options: [
        { label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' },
      ] },
      { key: 'borderRadius', label: 'Border Radius', type: 'text', group: 'field_specific', default: '0px', placeholder: 'e.g. 8px, 12px' },
      { key: 'linkUrl', label: 'Link URL (optional)', type: 'text', group: 'field_specific', placeholder: 'https://...' },
      { key: 'openInNewTab', label: 'Open link in new tab', type: 'toggle_with_description', group: 'field_specific', default: true },
    ],
  },

  // ─── Button Widget ──────────────────────────────────────────────────
  {
    id: 'button_widget',
    name: 'Button',
    category: 'content',
    iconName: 'MousePointerClick',
    description: 'Clickable button with link',
    badge: 'CONTENT',
    tier: 'free',
    createField: (label = 'Button') => ({
      label,
      type: 'control_widget',
      widgetType: 'button_widget',
      widgetConfig: {
        text: 'Click Here',
        linkUrl: '',
        openInNewTab: true,
        variant: 'primary',
        size: 'medium',
        alignment: 'center',
        fullWidth: false,
      },
      required: false,
    }),
    settingsSchema: [
      { key: 'text', label: 'Button Text', type: 'text', group: 'field_specific', default: 'Click Here' },
      { key: 'linkUrl', label: 'Link URL', type: 'text', group: 'field_specific', placeholder: 'https://...' },
      { key: 'openInNewTab', label: 'Open in new tab', type: 'toggle_with_description', group: 'field_specific', default: true },
      { key: 'variant', label: 'Style', type: 'select', group: 'field_specific', default: 'primary', options: [
        { label: 'Primary (filled)', value: 'primary' },
        { label: 'Outline', value: 'outline' },
        { label: 'Ghost', value: 'ghost' },
        { label: 'Link', value: 'link' },
      ] },
      { key: 'size', label: 'Size', type: 'select', group: 'field_specific', default: 'medium', options: [
        { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
      ] },
      { key: 'alignment', label: 'Alignment', type: 'select', group: 'field_specific', default: 'center', options: [
        { label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' },
      ] },
      { key: 'fullWidth', label: 'Full Width', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },

  // ─── Spacer Widget ──────────────────────────────────────────────────
  {
    id: 'spacer_widget',
    name: 'Spacer',
    category: 'content',
    iconName: 'MoveVertical',
    description: 'Add vertical spacing',
    badge: 'CONTENT',
    tier: 'free',
    createField: (label = 'Spacer') => ({
      label,
      type: 'control_widget',
      widgetType: 'spacer_widget',
      widgetConfig: {
        height: 32,
      },
      required: false,
    }),
    settingsSchema: [
      { key: 'height', label: 'Height (px)', type: 'number', group: 'field_specific', default: 32, min: 8, max: 200, helpText: 'Vertical space in pixels.' },
    ],
  },

  // ─── Icon Widget ────────────────────────────────────────────────────
  {
    id: 'icon_widget',
    name: 'Icon',
    category: 'content',
    iconName: 'Star',
    description: 'Display an icon',
    badge: 'CONTENT',
    tier: 'free',
    createField: (label = 'Icon') => ({
      label,
      type: 'control_widget',
      widgetType: 'icon_widget',
      widgetConfig: {
        iconName: 'CheckCircle',
        size: 24,
        color: '#059669',
        alignment: 'center',
      },
      required: false,
    }),
    settingsSchema: [
      { key: 'iconName', label: 'Select Icon', type: 'icon_picker', group: 'field_specific', default: 'CheckCircle', helpText: 'Select an icon from the visual library or type a Lucide icon name.' },
      { key: 'size', label: 'Size (px)', type: 'number', group: 'field_specific', default: 24, min: 12, max: 120 },
      { key: 'color', label: 'Color', type: 'color', group: 'field_specific', default: '#059669' },
      { key: 'alignment', label: 'Alignment', type: 'select', group: 'field_specific', default: 'center', options: [
        { label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' },
      ] },
    ],
  },

  // ─── Alert Widget ───────────────────────────────────────────────────
  {
    id: 'alert_widget',
    name: 'Alert / Notice',
    category: 'content',
    iconName: 'AlertCircle',
    description: 'Alert or notice banner',
    badge: 'CONTENT',
    tier: 'free',
    createField: (label = 'Alert') => ({
      label,
      type: 'control_widget',
      widgetType: 'alert_widget',
      widgetConfig: {
        text: 'Important: Please read before proceeding.',
        type: 'info',
        showIcon: true,
        dismissible: false,
      },
      required: false,
    }),
    settingsSchema: [
      { key: 'text', label: 'Alert Text', type: 'textarea', group: 'field_specific', default: 'Important: Please read before proceeding.' },
      { key: 'type', label: 'Alert Type', type: 'select', group: 'field_specific', default: 'info', options: [
        { label: 'Info (blue)', value: 'info' },
        { label: 'Success (green)', value: 'success' },
        { label: 'Warning (amber)', value: 'warning' },
        { label: 'Error (red)', value: 'error' },
      ] },
      { key: 'showIcon', label: 'Show Icon', type: 'toggle_with_description', group: 'field_specific', default: true },
      { key: 'dismissible', label: 'Dismissible', type: 'toggle_with_description', group: 'field_specific', default: false },
    ],
  },

  // ─── Badge Widget (for mediaPanel.badge migration) ──────────────────
  {
    id: 'badge_widget',
    name: 'Badge / Trust Pill',
    category: 'content',
    iconName: 'BadgeCheck',
    description: 'Trust badge or pill label',
    badge: 'CONTENT',
    tier: 'free',
    createField: (label = 'Badge') => ({
      label,
      type: 'control_widget',
      widgetType: 'badge_widget',
      widgetConfig: {
        text: '⭐ 5-Star Rated Service Pro',
        variant: 'solid',
        alignment: 'left',
      },
      required: false,
    }),
    settingsSchema: [
      { key: 'text', label: 'Badge Text', type: 'text', group: 'field_specific', default: '⭐ 5-Star Rated Service Pro' },
      { key: 'variant', label: 'Style', type: 'select', group: 'field_specific', default: 'solid', options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Outline', value: 'outline' },
        { label: 'Subtle', value: 'subtle' },
      ] },
      { key: 'alignment', label: 'Alignment', type: 'select', group: 'field_specific', default: 'left', options: [
        { label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' },
      ] },
    ],
  },

  // ─── List Widget (for mediaPanel.bullets migration) ─────────────────
  {
    id: 'list_widget',
    name: 'Bullet List',
    category: 'content',
    iconName: 'List',
    description: 'List of benefits or points',
    badge: 'CONTENT',
    tier: 'free',
    createField: (label = 'Benefits List') => ({
      label,
      type: 'control_widget',
      widgetType: 'list_widget',
      widgetConfig: {
        items: [
          'Guaranteed response within 15 minutes',
          'Licensed, insured & background-checked',
          '100% Price Match & Escrow Guarantee',
        ],
        style: 'checkmark',
        iconColor: '#10b981',
      },
      required: false,
    }),
    settingsSchema: [
      { key: 'items', label: 'List Items (one per line)', type: 'textarea', group: 'field_specific', default: 'Guaranteed response within 15 minutes\nLicensed, insured & background-checked\n100% Price Match & Escrow Guarantee', helpText: 'Enter one item per line.' },
      { key: 'style', label: 'Bullet Style', type: 'select', group: 'field_specific', default: 'checkmark', options: [
        { label: 'Checkmarks ✓', value: 'checkmark' },
        { label: 'Dots •', value: 'dot' },
        { label: 'Numbers 1.', value: 'number' },
        { label: 'Stars ★', value: 'star' },
        { label: 'None', value: 'none' },
      ] },
      { key: 'iconColor', label: 'Bullet Color', type: 'color', group: 'field_specific', default: '#10b981' },
    ],
  },
];

// Re-export for convenience
export { CONTENT_WIDGETS as default };
