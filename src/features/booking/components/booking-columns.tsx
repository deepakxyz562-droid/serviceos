'use client';

/**
 * booking-columns — Phase 6E extraction from booking-view.tsx.
 *
 * Defines the DataTable columns for the Booking view's Table mode. Was inline
 * in BookingView as `bookingColumns`; moved here so the column renderers
 * (which use Avatar, Badge, DropdownMenu, formatScheduleDate etc.) live in a
 * dedicated file. The parent passes the action handlers via a factory
 * function so the columns stay pure.
 *
 * Extracted from src/components/views/booking-view.tsx (Phase 6E refactor).
 */

import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Calendar,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Column } from '@/components/ui/data-table';
import {
  STATUS_CONFIG,
  formatScheduleDate,
  formatScheduleTime,
  formatDuration,
  getTransitionOptions,
} from '@/features/booking/utils/booking-helpers';
import type { Booking } from '@/features/booking/types';

export interface BookingColumnHandlers {
  onView: (booking: Booking) => void;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
  onStatusChange: (booking: Booking, newStatus: string) => void;
  onCreateJobFromBooking: (bookingId: string) => void;
}

/**
 * Build the BookingView DataTable columns. Pure factory — the parent passes
 * the action handlers so the columns don't need a context/prop-drill layer.
 */
export function buildBookingColumns(handlers: BookingColumnHandlers): Column<Booking>[] {
  const { onView, onEdit, onDelete, onStatusChange, onCreateJobFromBooking } = handlers;

  return [
    {
      key: 'title',
      header: 'Title',
      render: (b) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 max-w-[200px] truncate block">
          {b.title}
        </span>
      ),
      className: 'max-w-[200px]',
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (b) =>
        b.customerName ? (
          <div className="flex items-center gap-1.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {b.customerName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {b.customerPhone || 'No phone'}
              </p>
            </div>
            {b.customerPhone && (
              <div
                className="flex items-center gap-0.5 ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={`tel:${b.customerPhone}`}
                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Call customer"
                >
                  <Phone className="size-3" />
                </a>
                <a
                  href={`https://wa.me/${b.customerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="WhatsApp customer"
                >
                  <MessageSquare className="size-3" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
      className: 'max-w-[180px]',
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      render: (b) =>
        b.scheduledAt ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] whitespace-nowrap">
            <Calendar className="size-3" /> {formatScheduleDate(b.scheduledAt)}{' '}
            · {formatScheduleTime(b.scheduledAt)}
          </span>
        ) : (
          '—'
        ),
      className: 'text-xs',
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (b) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatDuration(b.duration)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => {
        const statusCfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
        return (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider',
              statusCfg.bgClass,
              statusCfg.textClass
            )}
          >
            {statusCfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'employee',
      header: 'Employee',
      render: (b) =>
        b.employee?.name ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5 shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                {b.employee.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {b.employee.name}
            </span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200">
            Unassigned
          </span>
        ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (b) => (
        <Badge variant="secondary" className="text-[10px] capitalize font-medium">
          {b.source || 'manual'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (b) => {
        const transitions = getTransitionOptions(b.status);
        const isClosed = ['completed', 'cancelled', 'no_show'].includes(
          b.status
        );
        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {!isClosed && (
              <Button
                size="sm"
                className="h-7 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => onCreateJobFromBooking(b.id)}
              >
                Convert
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(b)}>
                  <Eye className="size-3.5 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(b)}>
                  <Pencil className="size-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                {transitions.map((t) => (
                  <DropdownMenuItem
                    key={t.to}
                    onClick={() => onStatusChange(b, t.to)}
                  >
                    <CheckCircle2 className="size-3.5 mr-2" /> Mark as {t.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(b)}
                >
                  <Trash2 className="size-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      className: 'text-right w-[140px]',
      headerClassName: 'text-right',
    },
  ];
}
