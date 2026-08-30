'use client';

/**
 * ValidationItem — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Tiny presentational row used inside the Complete-Job dialog to show whether
 * each proof requirement (before photo, after photo, signature, checklist)
 * has been satisfied. Renders a green checkmark when `ok` is true, an amber
 * X-circle otherwise.
 */

import { CheckCircle2, XCircle } from 'lucide-react';

export interface ValidationItemProps {
  ok: boolean;
  label: string;
}

export function ValidationItem({ ok, label }: ValidationItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="size-3.5 text-amber-600 shrink-0" />
      )}
      <span className={ok ? 'text-emerald-800' : 'text-amber-800'}>{label}</span>
    </div>
  );
}
