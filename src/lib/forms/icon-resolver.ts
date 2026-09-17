/**
 * Icon Resolver — maps a string icon name to a lucide-react component.
 *
 * Used by the unified FieldDefinition.iconName so registries stay JSON-serializable
 * (registry data files reference icons by string name; the builder resolves them to
 * React components at render time via this helper).
 *
 * Falls back to a neutral icon when the requested name doesn't exist.
 */
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const FALLBACK_ICON: LucideIcon = LucideIcons.HelpCircle;

const ICON_MAP = LucideIcons as unknown as Record<string, LucideIcon | undefined>;

/**
 * Resolve a lucide icon by its PascalCase name (e.g. 'ImagePlus', 'Camera').
 * Returns the fallback icon if not found.
 */
export function resolveIcon(name: string | undefined | null): LucideIcon {
  if (!name) return FALLBACK_ICON;
  return ICON_MAP[name] ?? FALLBACK_ICON;
}

/**
 * Check whether a lucide icon name exists (used by registry validation).
 */
export function iconExists(name: string): boolean {
  return Boolean(ICON_MAP[name]);
}
