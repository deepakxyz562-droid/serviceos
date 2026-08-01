'use client';

/**
 * DensityToggle
 * =============
 * 3-mode toggle for Kanban card density (like Jira):
 *   - Comfortable (default): more padding, larger text, easier to scan
 *   - Compact: tighter padding, smaller text, more cards visible
 *   - Dense: minimal padding, very small text, max cards per screen
 *
 * Pipeline Redesign (Phase 3)
 * ---------------------------
 * Laptop users (13" screens) often can't see many cards in comfortable mode.
 * The density toggle lets them shrink cards to fit more on screen without
 * losing information.
 *
 * Persisted in the app store (Zustand) so it survives page refreshes.
 */

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

export type PipelineDensity = 'comfortable' | 'compact' | 'dense';

interface DensityToggleProps {
  className?: string;
}

const DENSITY_LABELS: Record<PipelineDensity, string> = {
  comfortable: 'Comfortable',
  compact: 'Compact',
  dense: 'Dense',
};

export function DensityToggle({ className }: DensityToggleProps) {
  const density = useAppStore((s) => s.pipelineDensity) ?? 'comfortable';
  const setDensity = useAppStore((s) => s.setPipelineDensity);

  return (
    <ToggleGroup
      type="single"
      value={density}
      onValueChange={(value) => {
        if (value && value !== density) {
          setDensity?.(value as PipelineDensity);
        }
      }}
      className={cn('h-8', className)}
      size="sm"
      aria-label="Card density"
    >
      {(Object.keys(DENSITY_LABELS) as PipelineDensity[]).map((mode) => (
        <ToggleGroupItem
          key={mode}
          value={mode}
          className="text-xs h-7 px-2"
          aria-label={`${DENSITY_LABELS[mode]} density`}
        >
          {DENSITY_LABELS[mode]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
