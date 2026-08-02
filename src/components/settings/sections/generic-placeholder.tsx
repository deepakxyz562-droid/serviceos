'use client';

/**
 * Generic "Coming Soon" placeholder for the new enterprise Settings
 * sections that don't yet have a full UI. Each section passes its own
 * title, icon, description, and bullet list of what will be configured.
 *
 * This is a thin wrapper around the existing `SectionPlaceholder`
 * component — kept as a separate file so `settings-view.tsx` can import
 * one component and just pass props, rather than creating a separate
 * file per placeholder section.
 */

import type { LucideIcon } from 'lucide-react';
import { SectionPlaceholder, type PlaceholderConfiguredItem } from './_section-placeholder';

interface GenericPlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' | 'slate';
  configuredItems: PlaceholderConfiguredItem[];
}

export function GenericPlaceholder({
  title,
  description,
  icon,
  accent = 'emerald',
  configuredItems,
}: GenericPlaceholderProps) {
  return (
    <SectionPlaceholder
      title={title}
      description={description}
      icon={icon}
      accent={accent}
      configuredItems={configuredItems}
    />
  );
}
