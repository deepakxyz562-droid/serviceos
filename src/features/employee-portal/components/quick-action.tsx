'use client';

/**
 * QuickAction — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Presentational tile used in the 5-column Quick Actions row on the portal
 * dashboard (Clock In / Break / Resume / Clock Out / My Route / Camera /
 * Reports / Alerts). The parent owns the click handler and loading state;
 * this component renders the icon, label, and accent color.
 */

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Accent = 'emerald' | 'amber' | 'red' | 'purple' | 'cyan' | 'slate';

const ACCENT_CLASSES: Record<Accent, string> = {
  emerald: 'text-emerald-600 hover:bg-emerald-50',
  amber: 'text-amber-600 hover:bg-amber-50',
  red: 'text-red-600 hover:bg-red-50',
  purple: 'text-purple-600 hover:bg-purple-50',
  cyan: 'text-cyan-600 hover:bg-cyan-50',
  slate: 'text-slate-600 hover:bg-slate-100',
};

export interface QuickActionProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  accent: Accent;
}

export function QuickAction({
  icon,
  label,
  onClick,
  disabled,
  loading,
  accent,
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-h-[60px] ${ACCENT_CLASSES[accent]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      <span className="text-[10px] sm:text-xs font-medium leading-tight text-center">{label}</span>
    </button>
  );
}
