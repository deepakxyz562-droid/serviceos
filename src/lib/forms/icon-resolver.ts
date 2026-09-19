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
 * Resolve a lucide icon by its name or FieldDefinition object.
 * Returns the fallback icon if not found.
 */
export function resolveIcon(nameOrDef: any): LucideIcon {
  if (!nameOrDef) return FALLBACK_ICON;

  if (typeof nameOrDef === 'object') {
    const rawName = nameOrDef.iconName || nameOrDef.icon || nameOrDef.icon_name;
    return resolveIcon(rawName);
  }

  if (typeof nameOrDef === 'string') {
    const trimmed = nameOrDef.trim();
    if (!trimmed) return FALLBACK_ICON;

    // Direct lookup
    if (ICON_MAP[trimmed]) return ICON_MAP[trimmed]!;

    // Case-insensitive lookup fallback
    const lowerKey = trimmed.toLowerCase();
    const foundKey = Object.keys(ICON_MAP).find((k) => k.toLowerCase() === lowerKey);
    if (foundKey && ICON_MAP[foundKey]) {
      return ICON_MAP[foundKey]!;
    }
  }

  return FALLBACK_ICON;
}

/**
 * Check whether a lucide icon name exists (used by registry validation).
 */
export function iconExists(name: string): boolean {
  if (!name) return false;
  return Boolean(ICON_MAP[name] || Object.keys(ICON_MAP).some((k) => k.toLowerCase() === name.toLowerCase()));
}
