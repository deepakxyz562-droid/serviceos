'use client';

/**
 * BookingDetailPage
 * =================
 * Modern 2-column Jobber-style full-page Booking detail view.
 *
 * Provides a responsive layout consistent with JobDetailPage and LeadDetailPage:
 *   - Top Sticky Header: FormPageHeader with Back button, title, status badge,
 *     and quick action buttons (Create Job, Edit Booking, Status dropdown,
 *     Assign Technician, Auto-Dispatch, Delete).
 *   - Left Column:
 *       1. Client & Location Card (avatar, name, phone, email, map pin)
 *       2. Schedule & Timing Card (date, time window, duration chip)
 *       3. Products & Services Card (line items table with currency subtotal)
 *       4. Scope of Work / Instructions Card
 *       5. Timeline & Lifecycle History Card
 *   - Right Column (Sidebar):
 *       1. Assigned Technician & Dispatch Card (with 1-click reassignment & auto-assign)
 *       2. Booking Metadata & Source Card
 *       3. Internal Staff Notes Card
 */

import { useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Pencil,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  Zap,
  Tag,
  FileText,
  StickyNote,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';
import {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  formatScheduleDate,
  formatScheduleTime,
  formatDuration,
  getTransitionOptions,
} from '@/features/booking/utils/booking-helpers';
import { lineItemsSubtotal, type LineItem } from '@/features/line-items';
import type { Booking, EmployeeOption } from '@/features/booking/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface BookingDetailPageProps {
  /** The booking to display. */
  booking: Booking | null;
  /** Back to list handler. */
  onBack: () => void;
  /** Open edit mode in BookingFormPage. */
  onEdit: (booking: Booking) => void;
  /** Delete booking handler. */
  onDelete: (booking: Booking) => void;
  /** Change booking pipeline status. */
  onStatusChange: (booking: Booking, newStatus: string) => Promise<void> | void;
  /** Assign an employee to the booking. */
  onAssignEmployee: (bookingId: string, employeeId: string) => Promise<void> | void;
  /** Trigger AI auto-assignment. */
  onAutoAssign: (bookingId: string) => Promise<void> | void;
  /** Convert booking to a full Job. */
  onCreateJob: (bookingId: string) => Promise<void> | void;
  /** Available employees for dispatch. */
  employees: EmployeeOption[];
  /** Submitting/loading flag. */
  submitting?: boolean;
  /** Currency symbol (defaults to "$"). */
  symbol?: string;
}

export function BookingDetailPage({
  booking,
  onBack,
  onEdit,
  onDelete,
  onStatusChange,
  onAssignEmployee,
  onAutoAssign,
  onCreateJob,
  employees,
  submitting = false,
  symbol = '$',
}: BookingDetailPageProps) {
  const [internalNotes, setInternalNotes] = useState(booking?.notes || '');
  const [savingNote, setSavingNote] = useState(false);

  if (!booking) return null;

  // Resolve status configuration
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const transitionOptions = getTransitionOptions(booking.status);

  // Parse line items from metadataJson
  let lineItems: LineItem[] = [];
  try {
    const meta = JSON.parse(booking.metadataJson || '{}');
    if (Array.isArray(meta.lineItems)) {
      lineItems = meta.lineItems;
    }
  } catch {}

  const subtotal = lineItemsSubtotal(lineItems);
  const assignedEmployee = employees.find((e) => e.id === booking.employeeId) || booking.employee;

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: internalNotes }),
      });
      if (!res.ok) throw new Error('Failed to update notes');
      toast.success('Internal notes updated');
    } catch {
      toast.error('Could not save notes');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in-50 duration-200">
      {/* ─── Top Sticky Header ─── */}
      <FormPageHeader
        backLabel="Back to Bookings"
        onBack={onBack}
        title={booking.title}
        badge={
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'text-xs font-semibold px-2.5 py-0.5 border-0',
                statusCfg.bgClass,
                statusCfg.textClass,
              )}
            >
              {statusCfg.label}
            </Badge>
            <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
              BKG-{booking.id.slice(0, 8).toUpperCase()}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Convert to Job */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCreateJob(booking.id)}
              disabled={submitting}
              className="gap-1.5 h-9 text-xs font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Briefcase className="size-3.5 text-emerald-600" />
              <span>Convert to Job</span>
            </Button>

            {/* Edit Booking */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(booking)}
              disabled={submitting}
              className="gap-1.5 h-9 text-xs font-medium"
            >
              <Pencil className="size-3.5" />
              <span>Edit</span>
            </Button>

            {/* Status Transitions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" disabled={submitting}>
                  <span>Status: <strong>{statusCfg.label}</strong></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => onStatusChange(booking, opt.value)}
                    className={cn(
                      'text-xs flex items-center justify-between cursor-pointer',
                      booking.status === opt.value && 'font-semibold text-emerald-600',
                    )}
                  >
                    <span>{opt.label}</span>
                    {booking.status === opt.value && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9" disabled={submitting}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">Booking Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAutoAssign(booking.id)}
                  className="text-xs gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400"
                >
                  <Zap className="size-3.5" />
                  <span>Auto-Assign via AI</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(booking)}
                  className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Booking</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ─── 2-Column Jobber-Style Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* ─── Left Column (Main Information) ─── */}
        <div className="space-y-6">
          {/* Client & Location Card */}
          <FormSectionCard
            icon={<User className="size-4 text-emerald-600" />}
            title="Client & Service Location"
            description="Contact details and property location for this appointment"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-sm shadow-2xs border border-emerald-500/20">
                    {booking.customerName ? booking.customerName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {booking.customerName || 'No customer linked'}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Customer ID: {booking.customerId || 'Walk-in / Unlinked'}
                    </span>
                  </div>
                </div>

                {booking.source && (
                  <Badge variant="outline" className="text-[11px] capitalize bg-muted/40">
                    Source: {booking.source.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                {/* Phone */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/60">
                  <Phone className="size-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Phone</span>
                    {booking.customerPhone ? (
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="text-xs font-medium text-foreground hover:text-emerald-600 hover:underline truncate block"
                      >
                        {booking.customerPhone}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/60">
                  <Mail className="size-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Email</span>
                    {booking.customerEmail ? (
                      <a
                        href={`mailto:${booking.customerEmail}`}
                        className="text-xs font-medium text-foreground hover:text-emerald-600 hover:underline truncate block"
                      >
                        {booking.customerEmail}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/60">
                <MapPin className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Service Address</span>
                  {booking.address ? (
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-foreground font-medium">{booking.address}</span>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(booking.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1 shrink-0 font-medium"
                      >
                        <span>Open Maps</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No address specified</span>
                  )}
                </div>
              </div>
            </div>
          </FormSectionCard>

          {/* Schedule & Timing Card */}
          <FormSectionCard
            icon={<CalendarDays className="size-4 text-emerald-600" />}
            title="Schedule & Appointment Window"
            description="Appointment date, start time, and estimated duration"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 text-emerald-600" />
                  <span>Scheduled Date</span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatScheduleDate(booking.scheduledAt)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5 text-blue-600" />
                  <span>Start Time</span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatScheduleTime(booking.scheduledAt)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Tag className="size-3.5 text-purple-600" />
                  <span>Estimated Duration</span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatDuration(booking.duration || 60)}
                </p>
              </div>
            </div>
          </FormSectionCard>

          {/* Products & Services (Line Items) Card */}
          <FormSectionCard
            icon={<DollarSign className="size-4 text-emerald-600" />}
            title="Products & Services"
            description="Items, services, and estimated totals for this booking"
            headerAction={
              <span className="text-xs font-semibold text-foreground">
                Total: <strong className="text-emerald-600 font-bold">{symbol}{subtotal.toFixed(2)}</strong>
              </span>
            }
          >
            {lineItems.length === 0 ? (
              <div className="p-6 text-center rounded-lg border border-dashed border-border/80 bg-muted/10 space-y-1.5">
                <FileText className="size-6 text-muted-foreground/60 mx-auto" />
                <p className="text-xs font-medium text-foreground">No line items attached</p>
                <p className="text-[11px] text-muted-foreground">
                  Click Edit Booking to add services from the catalog or custom line items.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border/70">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5">Item / Service</th>
                        <th className="p-2.5 text-center w-16">Qty</th>
                        <th className="p-2.5 text-right w-24">Unit Price</th>
                        <th className="p-2.5 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-2.5 font-medium text-foreground">
                            <div>{item.name || 'Unnamed item'}</div>
                            {item.description && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center">{item.quantity || 1}</td>
                          <td className="p-2.5 text-right font-mono">
                            {symbol}{Number(item.unitPrice || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                            {symbol}{((item.quantity || 1) * Number(item.unitPrice || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end p-2 bg-muted/20 rounded-lg border border-border/60">
                  <div className="text-right space-y-0.5">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold mr-3">Subtotal:</span>
                    <span className="text-sm font-bold text-foreground font-mono">
                      {symbol}{subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </FormSectionCard>

          {/* Scope of Work / Instructions Card */}
          {booking.description && (
            <FormSectionCard
              icon={<FileText className="size-4 text-emerald-600" />}
              title="Scope of Work & Instructions"
              description="Customer requests or dispatch notes"
            >
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                {booking.description}
              </div>
            </FormSectionCard>
          )}

          {/* Activity & Lifecycle Timeline */}
          <FormSectionCard
            icon={<CheckCircle2 className="size-4 text-emerald-600" />}
            title="Booking Timeline & History"
            description="Audit history and milestone transitions"
          >
            <div className="space-y-3 pl-2 border-l-2 border-emerald-500/30 ml-2">
              <div className="relative pl-4 space-y-0.5">
                <span className="absolute -left-[17px] top-1 size-2 rounded-full bg-emerald-500 ring-4 ring-background" />
                <span className="text-xs font-semibold text-foreground block">Booking Created</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(booking.createdAt).toLocaleString()} via {booking.source || 'Manual'}
                </span>
              </div>

              {booking.confirmedAt && (
                <div className="relative pl-4 space-y-0.5">
                  <span className="absolute -left-[17px] top-1 size-2 rounded-full bg-blue-500 ring-4 ring-background" />
                  <span className="text-xs font-semibold text-foreground block">Appointment Confirmed</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(booking.confirmedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {booking.completedAt && (
                <div className="relative pl-4 space-y-0.5">
                  <span className="absolute -left-[17px] top-1 size-2 rounded-full bg-emerald-600 ring-4 ring-background" />
                  <span className="text-xs font-semibold text-foreground block">Booking Completed</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(booking.completedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {booking.cancelledAt && (
                <div className="relative pl-4 space-y-0.5">
                  <span className="absolute -left-[17px] top-1 size-2 rounded-full bg-red-500 ring-4 ring-background" />
                  <span className="text-xs font-semibold text-destructive block">Booking Cancelled</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(booking.cancelledAt).toLocaleString()}
                    {booking.cancellationReason && ` — "${booking.cancellationReason}"`}
                  </span>
                </div>
              )}
            </div>
          </FormSectionCard>
        </div>

        {/* ─── Right Column (Sidebar Intelligence & Dispatch) ─── */}
        <div className="space-y-6">
          {/* Assigned Technician & Dispatch */}
          <FormSectionCard
            icon={<Users className="size-4 text-emerald-600" />}
            title="Team Assignment"
            description="Field technician assigned to this booking"
          >
            <div className="space-y-3">
              {assignedEmployee ? (
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center text-xs shrink-0">
                      {assignedEmployee.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground block truncate">
                        {assignedEmployee.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {'role' in assignedEmployee ? assignedEmployee.role : 'Technician'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
                    Assigned
                  </Badge>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 text-center space-y-1">
                  <Users className="size-5 text-amber-600 dark:text-amber-400 mx-auto" />
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Unassigned Booking</p>
                  <p className="text-[11px] text-muted-foreground">
                    Dispatch an available technician or use AI Auto-Assign.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8">
                      <Users className="size-3 mr-1" />
                      <span>{assignedEmployee ? 'Reassign' : 'Assign'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuLabel className="text-xs">Select Technician</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {employees.map((emp) => (
                      <DropdownMenuItem
                        key={emp.id}
                        onClick={() => onAssignEmployee(booking.id, emp.id)}
                        className="text-xs cursor-pointer flex items-center justify-between"
                      >
                        <span>{emp.name}</span>
                        <span className="text-[10px] text-muted-foreground">{emp.role}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAutoAssign(booking.id)}
                  disabled={submitting}
                  className="w-full text-xs h-8 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  <Zap className="size-3 mr-1 text-emerald-500" />
                  <span>Auto-Assign</span>
                </Button>
              </div>
            </div>
          </FormSectionCard>

          {/* Booking Metadata & Source Card */}
          <FormSectionCard
            icon={<Tag className="size-4 text-emerald-600" />}
            title="Metadata & Source"
          >
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Booking ID</span>
                <span className="font-mono text-foreground font-medium">{booking.id.slice(0, 12)}...</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Intake Channel</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                  {booking.source || 'Manual'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Created Date</span>
                <span className="text-foreground">{new Date(booking.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="text-foreground">{new Date(booking.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </FormSectionCard>

          {/* Internal Staff Notes Card */}
          <FormSectionCard
            icon={<StickyNote className="size-4 text-emerald-600" />}
            title="Internal Staff Notes"
            description="Private notes visible only to team members"
          >
            <div className="space-y-2.5">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add private staff notes, access codes, or gate instructions..."
                rows={4}
                className="w-full rounded-lg border border-border/80 bg-background p-2.5 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                >
                  {savingNote ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                  <span>Save Notes</span>
                </Button>
              </div>
            </div>
          </FormSectionCard>
        </div>
      </div>
    </div>
  );
}
