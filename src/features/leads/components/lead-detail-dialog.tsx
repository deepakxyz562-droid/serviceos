'use client';

/**
 * LeadDetailDialog — Phase 4 extraction from leads-view.tsx.
 *
 * Replaces the inline `renderDetailDialog()` closure that used to live inside
 * the parent LeadsView component. This is the legacy modal lead-detail dialog
 * (max-w-lg). The full-page LeadDetailPage is now the primary entry point,
 * but this dialog is still rendered for backward-compat callers (e.g. from
 * outside the list view).
 *
 * The dialog renders:
 *   1. "View in Pipeline" link (jumps to the Sales Pipeline view)
 *   2. Title + Name + status badge + priority dot
 *   3. Pipeline progress stepper (7 stages, with current/completed styling)
 *   4. Lead info grid (Value / Source / Service / Address / Assigned / Linked
 *      Job / Created)
 *   5. Service details (description block)
 *   6. Work images grid (from imagesJson)
 *   7. Assessment photos grid (from assessmentImagesJson)
 *   8. Linked customer chip (with name lookup from local customers state)
 *   9. Product / Service line-items summary (name + qty × price + total + subtotal)
 *  10. Update Status buttons (one per other Kanban stage)
 *  11. Notes & Activity timeline + add-note input
 *  12. Action buttons (Convert to Job / Edit / Delete)
 *
 * Pure presentational — all state lives in the parent LeadsView.
 *
 * Extracted from src/components/views/leads-view.tsx (Phase 4 refactor).
 */

import {
  Target, Phone, Mail, TrendingUp, CheckCircle2, ArrowRight,
  DollarSign, BarChart3, Briefcase, MapPin, User, CalendarDays,
  FileText, ImageIcon, Camera, Link2, StickyNote, Send, Pencil,
  Trash2, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  getServiceTypeLabel,
  lineItemTotal,
  lineItemsSubtotal,
  parseLineItems,
} from '@/features/line-items';
import {
  KANBAN_STATUSES,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  SOURCE_CONFIG,
  formatDateMedium,
  mapToKanbanStatus,
  parseImages,
} from '@/features/leads/utils/lead-helpers';
import {
  renderStatusBadge,
} from '@/features/leads/components/lead-shared';
import type { Lead, CustomerOption } from '@/features/leads/types';

// ── Props contract ──────────────────────────────────────────────────────────
export interface LeadDetailDialogProps {
  /** True to show the dialog. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lead being viewed (null → dialog renders nothing). */
  lead: Lead | null;
  /** Local customers list — used to look up a linked customer's name. */
  customers: CustomerOption[];
  /** Per-lead spinner flag (set during onStatusChange). */
  statusLoadingId: string | null;
  /** Change the lead's pipeline status (PUT /api/leads/:id). */
  onStatusChange: (leadId: string, newStatus: string) => Promise<void> | void;
  /** Append a note to the lead (PUT /api/leads/:id with notesJson). */
  onAddNote: () => Promise<void> | void;
  /** Current "new note" input value. */
  newNote: string;
  setNewNote: (v: string) => void;
  /** Switch the global view (used by "View in Pipeline" button). */
  onNavigate: (view: 'salesPipeline') => void;
  /** Open the convert-to-job flow. */
  onConvert: (lead: Lead) => void;
  /** Open the edit form. */
  onEdit: (lead: Lead) => void;
  /** Open the delete confirmation dialog. */
  onDelete: (lead: Lead) => void;
  /** Compact currency formatter (e.g. $1.2k). */
  formatCompact: (n: number) => string;
  /** Currency symbol (e.g. "$"). */
  symbol: string;
}

/**
 * Legacy modal lead-detail dialog. Pure presentational — see props above.
 * Returns null if `lead` is null.
 */
export function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
  customers,
  statusLoadingId,
  onStatusChange,
  onAddNote,
  newNote,
  setNewNote,
  onNavigate,
  onConvert,
  onEdit,
  onDelete,
  formatCompact,
  symbol,
}: LeadDetailDialogProps) {
  if (!lead) return null;

  const leadNotes = (() => {
    try { return JSON.parse(lead.notesJson || '[]'); } catch { return []; }
  })();

  const kanbanStatus = mapToKanbanStatus(lead.status);
  const currentStageIdx = KANBAN_STATUSES.indexOf(kanbanStatus as (typeof KANBAN_STATUSES)[number]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-5 text-emerald-600" />
            Lead Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Top action row — jump to the dedicated Sales Pipeline view
              (sidebar → CRM → Pipeline) to move the linked Deal's stage.
              Placed near the top so it's reachable without scrolling past
              the rest of the detail body. */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onNavigate('salesPipeline');
              }}
              className="gap-2"
            >
              <TrendingUp className="size-4" />
              View in Pipeline
            </Button>
          </div>

          {/* Title + Name + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {lead.title && (
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">{lead.title}</p>
              )}
              <h3 className="font-bold text-lg">{lead.name}</h3>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="size-3.5" /> {lead.phone}
                </p>
                {lead.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3.5" /> {lead.email}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {renderStatusBadge(lead.status)}
              <span className="flex items-center gap-1">
                <span className={`size-2 rounded-full ${PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400'}`} />
                <span className="text-xs text-muted-foreground">{PRIORITY_CONFIG[lead.priority]?.label || lead.priority}</span>
              </span>
            </div>
          </div>

          <Separator />

          {/* Pipeline Progress */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="size-4 text-muted-foreground" /> Pipeline Progress
            </h4>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {KANBAN_STATUSES.filter((s) => s !== 'lost').map((status, idx) => {
                const config = STATUS_CONFIG[status];
                const isCompleted = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;

                return (
                  <div key={status} className="flex items-center gap-1">
                    <div
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap',
                        isCompleted && `${config.bgColor} ${config.color} ${config.borderColor} border`,
                        isCurrent && `${config.bgColor} ${config.color} ${config.borderColor} border ring-2 ring-offset-1`,
                        !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted && <CheckCircle2 className="size-3 inline mr-0.5" />}
                      {config.label}
                    </div>
                    {idx < KANBAN_STATUSES.filter((s) => s !== 'lost').length - 1 && (
                      <ArrowRight className="size-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Lead Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {lead.value > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="font-semibold text-emerald-700">{formatCompact(lead.value)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p>{SOURCE_CONFIG[lead.source]?.label || lead.source}</p>
              </div>
            </div>
            {lead.serviceType && (
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Service</p>
                  <p>{getServiceTypeLabel(lead.serviceType)}</p>
                </div>
              </div>
            )}
            {lead.address && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="truncate">{lead.address}</p>
                </div>
              </div>
            )}
            {lead.assignedTo && (
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p>{lead.assignedTo.name}</p>
                </div>
              </div>
            )}
            {lead.job && (
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Linked Job</p>
                  <p className="text-emerald-700 font-medium">{lead.job.title}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p>{formatDateMedium(lead.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Service details (Overview) */}
          {lead.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <FileText className="size-4 text-muted-foreground" /> Service details
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-lg bg-muted/40 p-3">
                  {lead.description}
                </p>
              </div>
            </>
          )}

          {/* Overview images */}
          {(() => {
            const imgs = parseImages(lead.imagesJson);
            if (imgs.length === 0) return null;
            return (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <ImageIcon className="size-4 text-muted-foreground" /> Work images ({imgs.length})
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {imgs.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border bg-muted">
                      <img src={url} alt={`Work ${i + 1}`} className="size-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Assessment images */}
          {(() => {
            const imgs = parseImages(lead.assessmentImagesJson);
            if (imgs.length === 0) return null;
            return (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Camera className="size-4 text-muted-foreground" /> Assessment photos ({imgs.length})
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {imgs.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border bg-muted">
                      <img src={url} alt={`Assessment ${i + 1}`} className="size-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Linked customer */}
          {lead.customerId && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Linked customer</p>
                  <p className="font-medium">
                    {lead.customer?.name || customers.find((c) => c.id === lead.customerId)?.name || 'Linked customer'}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Product / Service line items */}
          {(() => {
            const items = parseLineItems(lead.lineItemsJson);
            if (items.length === 0) return null;
            const sub = lineItemsSubtotal(items);
            return (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Briefcase className="size-4 text-muted-foreground" /> Product / Service
                </h4>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{it.name || 'Untitled item'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {it.quantity} × {symbol}{(parseFloat(it.unitPrice) || 0).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-700 whitespace-nowrap">
                        {symbol}{lineItemTotal(it).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <span className="text-sm font-medium text-emerald-800">Subtotal</span>
                    <span className="text-sm font-bold text-emerald-700">{symbol}{sub.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <Separator />

          {/* Status Actions */}
          {!['won', 'lost'].includes(kanbanStatus) && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                {KANBAN_STATUSES.filter((s) => s !== kanbanStatus).map((status) => {
                  const config = STATUS_CONFIG[status];
                  const isStatusLoading = statusLoadingId === lead.id;
                  return (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      className={cn('text-xs', config.color, config.borderColor)}
                      onClick={() => onStatusChange(lead.id, status)}
                      disabled={isStatusLoading}
                    >
                      {isStatusLoading && <Loader2 className="size-3 mr-1 animate-spin" />}
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Activity Timeline / Notes */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <StickyNote className="size-4 text-muted-foreground" /> Notes &amp; Activity
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {leadNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No notes yet</p>
              ) : (
                leadNotes.map((note: { text: string; createdAt: string }, idx: number) => (
                  <div key={idx} className="flex gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateMedium(note.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Note */}
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newNote.trim()) onAddNote();
                }}
              />
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={onAddNote}
                disabled={!newNote.trim()}
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {!['won', 'lost'].includes(lead.status) && (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  onOpenChange(false);
                  onConvert(lead);
                }}
              >
                <ArrowRight className="size-4 mr-1.5" /> Convert to Job
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                onEdit(lead);
              }}
            >
              <Pencil className="size-4 mr-1.5" /> Edit
            </Button>
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => {
                onOpenChange(false);
                onDelete(lead);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
