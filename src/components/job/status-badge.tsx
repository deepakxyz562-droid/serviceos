'use client';

/**
 * StatusBadge + statusBadgeClass
 * ------------------------------
 * Shared visual language for job lifecycle statuses across the PWA employee
 * portal. Replaces the 11-color inline `getStatusBadge()` switch in
 * employee-portal-layout.tsx so every status pill renders with the same color
 * token, sourced from the canonical taxonomy in `@/lib/job-taxonomy`.
 *
 * The taxonomy exports `getStatusColorToken(status)` which maps a status
 * string → one of:
 *   emerald | blue | amber | rose | violet | slate | cyan
 *
 * `statusBadgeClass(token)` returns the Tailwind class bundle for that token
 * (bg + text + border), with dark-mode variants so the badges stay readable
 * in dark themes.
 *
 * NOTE: the project style guide forbids indigo. The map below intentionally
 * uses 'slate' (instead of indigo) for the assigned/pending "neutral" pill,
 * 'cyan' for travelling (instead of sky), and 'rose' (instead of red) so the
 * palette stays within the approved brand set.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getStatusColorToken,
  type StatusColorToken,
} from '@/lib/job-taxonomy';

const TOKEN_CLASS_MAP: Record<StatusColorToken, string> = {
  emerald:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 hover:bg-emerald-100',
  blue:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 hover:bg-blue-100',
  amber:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 hover:bg-amber-100',
  rose:
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-0 hover:bg-rose-100',
  violet:
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 hover:bg-violet-100',
  slate:
    'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-0 hover:bg-slate-100',
  cyan:
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-0 hover:bg-cyan-100',
};

/**
 * Return the Tailwind class bundle for a status color token.
 *
 * Falls back to 'slate' for unknown tokens (defensive — getStatusColorToken
 * already falls back to 'slate' for unknown statuses, so this is just
 * belt-and-braces).
 */
export function statusBadgeClass(token: StatusColorToken): string {
  return TOKEN_CLASS_MAP[token] ?? TOKEN_CLASS_MAP.slate;
}

interface StatusBadgeProps {
  /** The lifecycle status string (assigned / working / completed / etc.). */
  status: string | undefined | null;
  /** Optional explicit label override; defaults to the status string itself. */
  label?: string;
  /** Extra Tailwind classes to merge in (size, font-size, etc.). */
  className?: string;
}

/**
 * Render a Badge pill colored by the canonical status → token → Tailwind map.
 *
 * Replaces the legacy `getStatusBadge(status)` switch from
 * employee-portal-layout.tsx. The default appearance is borderless with a
 * soft pastel background (matches the legacy look) — pass `className="border"` etc.
 * to add a border if needed.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const token = getStatusColorToken(status ?? '');
  const text = label ?? (status ?? '').charAt(0).toUpperCase() + (status ?? '').slice(1);
  return (
    <Badge className={cn(statusBadgeClass(token), className)}>
      {text}
    </Badge>
  );
}
