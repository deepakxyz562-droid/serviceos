'use client';

/**
 * BookingCard — Phase 6E extraction from booking-view.tsx.
 *
 * The grid view's booking card. Was inline JSX inside BookingView's grid
 * branch (~140 lines). Pure presentational — action handlers passed as props.
 *
 * Extracted from src/components/views/booking-view.tsx (Phase 6E refactor).
 */

import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Phone,
  MessageSquare,
  User,
  Calendar,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  STATUS_CONFIG,
  formatScheduleDate,
  formatScheduleTime,
  getTransitionOptions,
} from '@/features/booking/utils/booking-helpers';
import type { Booking } from '@/features/booking/types';

export interface BookingCardHandlers {
  onView: (booking: Booking) => void;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
  onStatusChange: (booking: Booking, newStatus: string) => void;
  onCreateJobFromBooking: (bookingId: string) => void;
}

export interface BookingCardProps {
  booking: Booking;
  handlers: BookingCardHandlers;
}

export function BookingCard({ booking, handlers }: BookingCardProps) {
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const transitions = getTransitionOptions(booking.status);
  const isClosed = ['completed', 'cancelled', 'no_show'].includes(booking.status);

  return (
    <Card
      className="group relative p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
      onClick={() => handlers.onView(booking)}
    >
      <div className="space-y-3">
        {/* Header: Source Tag + Status Badge */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          <Badge variant="secondary" className="text-[10px] h-5 px-2 capitalize bg-slate-100 dark:bg-slate-800 font-medium">
            {booking.source || 'manual'}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider', statusCfg.bgClass, statusCfg.textClass)}>
            {statusCfg.label}
          </Badge>
        </div>

        {/* Title & Customer Name */}
        <div className="space-y-1">
          <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {booking.title}
          </h4>
          {booking.customerName && (
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="size-3.5 shrink-0 text-slate-400" />
                <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{booking.customerName}</span>
              </div>
              {booking.customerPhone && (
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                    title="Call customer"
                  >
                    <Phone className="size-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                    title="WhatsApp customer"
                  >
                    <MessageSquare className="size-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schedule Window & Address */}
        <div className="space-y-1.5 pt-1">
          {booking.scheduledAt && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300 w-fit">
              <Calendar className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{formatScheduleDate(booking.scheduledAt)} · {formatScheduleTime(booking.scheduledAt)}</span>
            </div>
          )}

          {booking.address && (
            <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              <MapPin className="size-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span className="truncate">{booking.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Assignee & Action Buttons Row */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        {booking.employee?.name ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {booking.employee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{booking.employee.name}</span>
          </div>
        ) : (
          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 font-medium">
            Unassigned
          </span>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {!isClosed && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 text-xs shadow-xs"
              onClick={() => handlers.onCreateJobFromBooking(booking.id)}
            >
              <ArrowRight className="size-3.5 mr-1" /> Convert to Job
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlers.onView(booking)}>
                <Eye className="size-3.5 mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlers.onEdit(booking)}>
                <Pencil className="size-3.5 mr-2" /> Edit Booking
              </DropdownMenuItem>
              {!isClosed && (
                <DropdownMenuItem onClick={() => handlers.onCreateJobFromBooking(booking.id)}>
                  <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                </DropdownMenuItem>
              )}
              {transitions.map((t) => (
                <DropdownMenuItem key={t.to} onClick={() => handlers.onStatusChange(booking, t.to)}>
                  <CheckCircle2 className="size-3.5 mr-2" /> Mark as {t.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(booking)}>
                <Trash2 className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
