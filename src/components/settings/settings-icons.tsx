/**
 * Icon registry for the Settings nav. Lucide icons are React components,
 * so they can't live in a `.ts` config file — this `.tsx` module maps the
 * string `icon` name from `SettingsSection` to a renderable component.
 *
 * Add new icons here when you add new sections to SETTINGS_SECTIONS.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Store,
  Users,
  Calendar,
  DollarSign,
  Heart,
  MessageSquare,
  Sparkles,
  Plug,
  Zap,
  Shield,
  Code,
  CreditCard,
  Settings,
} from 'lucide-react';

export const SETTINGS_ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Store,
  Users,
  Calendar,
  DollarSign,
  Heart,
  MessageSquare,
  Sparkles,
  Plug,
  Zap,
  Shield,
  Code,
  CreditCard,
  Settings,
};

export function getSettingsIcon(name: string): LucideIcon {
  return SETTINGS_ICON_MAP[name] ?? Settings;
}
