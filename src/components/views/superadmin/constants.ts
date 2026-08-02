// ─────────────────────────────────────────────────────────────────────────────
// Shared constants for the Superadmin console's product-module taxonomy.
//
// Hoisted out of `superadmin-view.tsx` so the extracted `ModulesTab`
// component can import `MODULE_SECTIONS` + `FEATURE_MODULE_MAP` without a
// circular import back into `superadmin-view.tsx`. The parent file no longer
// references these constants (it doesn't render the module grid itself), so
// moving them here is a pure relocation — no behaviour change.
//
// Both MODULE_SECTIONS and DEFAULT_MENU_ITEMS are derived from the single
// source of truth in `src/lib/menu-catalog.ts`. Previously these were a
// separate hardcoded list with a different 9-section taxonomy (CRM,
// Communication, Marketing, Automation, Operations, Finance, System, Portals,
// AI & More) that had drifted from the actual sidebar — causing the superadmin
// Modules tab to show a different set of items than the Menu Management tab
// and the live sidebar. Deriving from MENU_CATALOG guarantees all three
// surfaces stay in sync.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LayoutDashboard,
  UsersRound,
  Briefcase,
  Megaphone,
  MessageSquare,
  Cpu,
  Wallet,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MENU_CATALOG } from '@/lib/menu-catalog';

// Icon + color per section. The 8 sections here match MENU_CATALOG exactly.
export const SECTION_META: Record<string, { icon: LucideIcon; color: string }> = {
  'Overview': { icon: LayoutDashboard, color: 'slate' },
  'CRM': { icon: UsersRound, color: 'emerald' },
  'Operations': { icon: Briefcase, color: 'orange' },
  'Marketing': { icon: Megaphone, color: 'amber' },
  'Inbox & Automation': { icon: MessageSquare, color: 'sky' },
  'AI Receptionist': { icon: Cpu, color: 'indigo' },
  'Finance': { icon: Wallet, color: 'teal' },
  'Setup & Admin': { icon: Settings2, color: 'rose' },
};

// Build MODULE_SECTIONS from the unique sections in MENU_CATALOG, preserving
// the catalog's section order (which is already sorted by sortOrder ranges).
export const MODULE_SECTIONS: Array<{ key: string; label: string; icon: LucideIcon; color: string }> = (() => {
  const seen = new Set<string>();
  const result: Array<{ key: string; label: string; icon: LucideIcon; color: string }> = [];
  for (const item of MENU_CATALOG) {
    if (!seen.has(item.section)) {
      seen.add(item.section);
      const meta = SECTION_META[item.section] || { icon: Settings2, color: 'slate' };
      result.push({ key: item.section, label: item.section, icon: meta.icon, color: meta.color });
    }
  }
  return result;
})();

// Map each feature-flag key to the product module it belongs in.
// This drives the merged "Modules" tab — features + menu items grouped by module.
export const FEATURE_MODULE_MAP: Record<string, string> = {
  whatsapp_crm: 'Inbox & Automation',
  ai_assistant: 'AI Receptionist',
  campaigns: 'Marketing',
  workflows: 'Inbox & Automation',
  chatbot_builder: 'Inbox & Automation',
  form_builder: 'Inbox & Automation',
  omnichannel: 'Inbox & Automation',
  salesPipeline: 'CRM',
  journey_automation: 'Inbox & Automation',
  knowledge_base: 'Setup & Admin',
  marketplace: 'Setup & Admin',
  custom_domains: 'Setup & Admin',
  api_access: 'Setup & Admin',
  bulk_operations: 'Setup & Admin',
  advanced_analytics: 'Overview',
};
