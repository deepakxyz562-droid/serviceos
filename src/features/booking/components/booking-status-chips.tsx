'use client';

/**
 * BookingStatusChips — Phase 6E extraction from booking-view.tsx.
 *
 * The interactive status filter chip row at the top of the BookingView.
 * Was inline JSX (~30 lines) using the local STATUS_CONFIG map. Pure
 * presentational.
 *
 * Extracted from src/components/views/booking-view.tsx (Phase 6E refactor).
 */

import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  Zap,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { Pagination } from '@/features/booking/types';
import type { Booking } from '@/features/booking/types';

interface ChipConfig {
  key: string;
  label: string;
  count: number;
  color: string;
  activeColor: string;
  icon: LucideIcon;
}

export interface BookingStatusChipsProps {
  statusFilter: string;
  onFilterChange: (status: string) => void;
  pagination: Pagination;
  bookings: Booking[];
}

export function BookingStatusChips({
  statusFilter,
  onFilterChange,
  pagination,
  bookings,
}: BookingStatusChipsProps) {
  const chips: ChipConfig[] = [
    {
      key: 'all',
      label: 'All Bookings',
      count: pagination.total || bookings.length,
      color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      activeColor: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900',
      icon: CalendarCheck,
    },
    {
      key: 'pending',
      label: 'Pending',
      count: bookings.filter((b) => b.status === 'pending').length,
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900/50',
      activeColor: 'bg-yellow-600 text-white border-yellow-600',
      icon: Clock,
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      count: bookings.filter((b) => b.status === 'confirmed').length,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
      activeColor: 'bg-blue-600 text-white border-blue-600',
      icon: CheckCircle2,
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      count: bookings.filter((b) => b.status === 'in_progress').length,
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
      activeColor: 'bg-purple-600 text-white border-purple-600',
      icon: Zap,
    },
    {
      key: 'completed',
      label: 'Completed',
      count: bookings.filter((b) => b.status === 'completed').length,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
      activeColor: 'bg-emerald-600 text-white border-emerald-600',
      icon: CheckCircle2,
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: bookings.filter((b) => b.status === 'cancelled').length,
      color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
      activeColor: 'bg-red-600 text-white border-red-600',
      icon: XCircle,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const Icon = chip.icon;
        const isActive = statusFilter === chip.key;
        return (
          <button
            key={chip.key}
            onClick={() => onFilterChange(isActive ? 'all' : chip.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all min-h-[36px] shadow-2xs cursor-pointer',
              isActive ? chip.activeColor : chip.color
            )}
          >
            <Icon className="size-3.5" />
            <span>{chip.label}</span>
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-background/80 text-foreground">
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
