'use client';

/**
 * lead-shared.tsx
 * ===============
 * Small presentational helpers shared between leads-view.tsx and the
 * extracted lead feature components. Kept in a `.tsx` file because the
 * helpers return JSX (Badge elements).
 *
 * USAGE:
 *   import { renderStatusBadge, renderSourceBadge } from '@/features/leads/components/lead-shared';
 */

import { Badge } from '@/components/ui/badge';
import {
  STATUS_CONFIG,
  SOURCE_CONFIG,
  getStatusConfig,
} from '@/features/leads/utils/lead-helpers';

/**
 * Render a status badge (coloured pill) for a lead status. Uses getStatusConfig
 * so legacy statuses (`new`, `quoted`, `proposal`) render with their canonical
 * Deal-stage label and palette.
 */
export function renderStatusBadge(status: string) {
  const config = getStatusConfig(status);
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-5 ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      {config.label}
    </Badge>
  );
}

/**
 * Render a source badge (coloured pill) for a lead source. Falls through to a
 * neutral outline badge for unknown sources so the UI never breaks.
 */
export function renderSourceBadge(source: string) {
  const config = SOURCE_CONFIG[source];
  if (!config) return <Badge variant="outline" className="text-xs">{source}</Badge>;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-5 ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      {config.label}
    </Badge>
  );
}
