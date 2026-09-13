'use client';

/**
 * LeadDetailPage — Phase 4 extraction from leads-view.tsx.
 *
 * Replaces the inline `renderLeadDetailPage()` closure that used to live inside
 * the parent LeadsView component. The detail page is the Jobber-style full-page
 * view that opens when a lead card/row is clicked. It renders:
 *
 *   1. Sticky page header (Back + title + Convert / Edit / More menu)
 *   2. Two-column layout:
 *      Left column:
 *        - Contact card (lead name, address, phone, email + Request Source /
 *          Requested / Used for meta)
 *        - Overview card (service details + work images)
 *        - On-site assessment card (assessment photos)
 *        - Product / Service card (line items table with totals)
 *        - Pipeline progress card (stage stepper + Update Status buttons)
 *      Right column (sidebar):
 *        - Lead info card (Value / Source / Service / Priority / Assigned /
 *          Linked Job / Created rows)
 *        - Notes card (notes list + add-note input)
 *
 * The component is a pure presentational extraction: ALL state lives in the
 * parent LeadsView and is threaded through as props. Same JSX, same handler
 * wiring, same prop dependencies — moved to its own file so leads-view.tsx
 * shrinks by ~493 lines.
 *
 * Extracted from src/components/views/leads-view.tsx (Phase 4 refactor).
 */

import type { ReactNode } from 'react';
import {
  Target, ArrowRight, Pencil, MoreHorizontal, Phone, Mail, MapPin, User,
  Info, TrendingUp, FileText, ImageIcon, Camera, Briefcase, Truck,
  StickyNote, Send, Link2, CheckCircle2, Loader2, Trash2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormSectionCard } from '@/components/shared/form-section-card';
import { cn } from '@/lib/utils';
import {
  lineItemsSubtotal,
  lineItemTotal,
  parseLineItems,
  getServiceTypeLabel,
} from '@/features/line-items';
import {
  KANBAN_STATUSES,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  SOURCE_CONFIG,
  formatDateMedium,
  mapToKanbanStatus,
  parseImages,
  parseNotes,
} from '@/features/leads/utils/lead-helpers';
import {
  renderStatusBadge,
  renderSourceBadge,
} from '@/features/leads/components/lead-shared';
import type { Lead } from '@/features/leads/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original `renderLeadDetailPage()` reached
// into from the parent LeadsView. Each prop below corresponds 1:1 to a parent
// state slot or handler; the wiring at the call site just spreads them in.
export interface LeadDetailPageProps {
  /** The lead being viewed (null → render nothing). */
  lead: Lead | null;
  /** Back to list. */
  onBack: () => void;
  /** Open the convert-to-job flow (hands off to Jobs view). */
  onConvert: (lead: Lead) => void;
  /** Open the edit form. */
  onEdit: (lead: Lead) => void;
  /** Open the delete confirmation dialog. */
  onDelete: (lead: Lead) => void;
  /** Change the lead's pipeline status (PUT /api/leads/:id). */
  onStatusChange: (leadId: string, newStatus: string) => Promise<void> | void;
  /** Append a note to the lead (PUT /api/leads/:id with notesJson). */
  onAddNote: () => Promise<void> | void;
  /** Current "new note" input value. */
  newNote: string;
  setNewNote: (v: string) => void;
  /** Per-lead spinner flag (set during onStatusChange). */
  statusLoadingId: string | null;

  // ── Currency formatters (from useCompanyCurrency hook) ───────────────
  /** Compact currency formatter (e.g. $1.2k). */
  formatCompact: (n: number) => string;
  /** Full currency formatter (e.g. $1,234.50). */
  formatCurrency: (n: number) => string;
  /** Currency symbol (e.g. "$"). */
  symbol: string;
}

/**
 * Full-page lead detail view. Pure presentational — see props above.
 * Returns null if `lead` is null.
 */
export function LeadDetailPage({
  lead,
  onBack,
  onConvert,
  onEdit,
  onDelete,
  onStatusChange,
  onAddNote,
  newNote,
  setNewNote,
  statusLoadingId,
  formatCompact,
  formatCurrency,
  symbol,
}: LeadDetailPageProps) {
  if (!lead) return null;

  const lineItems = parseLineItems(lead.lineItemsJson);
  const overviewImages = parseImages(lead.imagesJson);
  const assessmentImages = parseImages(lead.assessmentImagesJson);
  const leadNotes = parseNotes(lead.notesJson);
  const kanbanStatus = mapToKanbanStatus(lead.status);
  const currentStageIdx = KANBAN_STATUSES.indexOf(kanbanStatus as (typeof KANBAN_STATUSES)[number]);
  const subtotal = lineItemsSubtotal(lineItems);
  const isClosed = lead.status === 'won' || lead.status === 'lost';

  const detailRows: { label: string; value: ReactNode }[] = [
    ...(lead.value > 0 ? [{ label: 'Value', value: <span className="font-semibold text-emerald-700">{formatCompact(lead.value)}</span> }] : []),
    { label: 'Source', value: <span>{SOURCE_CONFIG[lead.source]?.label || lead.source}</span> },
    { label: 'Service', value: <span>{getServiceTypeLabel(lead.serviceType)}</span> },
    {
      label: 'Priority',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', PRIORITY_CONFIG[lead.priority]?.dotColor || 'bg-gray-400')} />
          <span className="capitalize">{PRIORITY_CONFIG[lead.priority]?.label || lead.priority}</span>
        </span>
      ),
    },
    ...(lead.assignedTo ? [{ label: 'Assigned to', value: <span>{lead.assignedTo.name}</span> }] : []),
    ...(lead.job ? [{ label: 'Linked Job', value: <span className="text-emerald-700 font-medium">{lead.job.title}</span> }] : []),
    { label: 'Created', value: <span>{formatDateMedium(lead.createdAt)}</span> },
  ];

  return (
    <div className="w-full space-y-6">
      {/* ─── Sticky page header (Back + title + actions) ────────── */}
      <div className="form-page-header -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
            <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-emerald-600">
              <Target className="size-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lead</span>
                {renderStatusBadge(lead.status)}
                {isClosed && (
                  <span className="text-[10px] font-medium text-muted-foreground">{lead.status === 'won' ? '· Won' : '· Lost'}</span>
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
                  {lead.title || lead.name}
                </h2>
                <button
                  type="button"
                  title="Edit lead"
                  onClick={() => onEdit(lead)}
                  className="text-muted-foreground hover:text-emerald-600 transition-colors shrink-0"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {lead.name}
                {lead.phone && <span> · {lead.phone}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isClosed && (
              <button
                type="button"
                onClick={() => onConvert(lead)}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <ArrowRight className="size-4 mr-1.5" /> Convert to Job
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(lead)}
              className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted transition-colors"
            >
              <Pencil className="size-4 mr-1.5" /> Edit
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="More actions"
                  className="inline-flex items-center justify-center size-9 rounded-lg text-foreground border border-border bg-background hover:bg-muted transition-colors"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isClosed && (
                  <DropdownMenuItem onClick={() => onConvert(lead)}>
                    <ArrowRight className="size-3.5 mr-2" /> Convert to Job
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit(lead)}>
                  <Pencil className="size-3.5 mr-2" /> Edit lead
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if (lead.phone) window.location.href = `tel:${lead.phone}`; }} disabled={!lead.phone}>
                  <Phone className="size-3.5 mr-2" /> Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if (lead.email) window.location.href = `mailto:${lead.email}`; }} disabled={!lead.email}>
                  <Mail className="size-3.5 mr-2" /> Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(lead)}>
                  <Trash2 className="size-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ─── Two-column layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Left column: main lead details ── */}
        <div className="space-y-6 min-w-0">
          {/* Contact card */}
          <FormSectionCard icon={User} title="Contact">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left: contact info */}
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-base font-semibold text-foreground truncate">{lead.name}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0" title="More">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(lead)}>
                        <Pencil className="size-3.5 mr-2" /> Edit contact
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { if (lead.phone) window.location.href = `tel:${lead.phone}`; }} disabled={!lead.phone}>
                        <Phone className="size-3.5 mr-2" /> Call
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { if (lead.email) window.location.href = `mailto:${lead.email}`; }} disabled={!lead.email}>
                        <Mail className="size-3.5 mr-2" /> Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {lead.address && (
                  <div className="space-y-0.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Billing / Property Address</p>
                    <div className="flex items-start gap-2 text-sm text-foreground">
                      <MapPin className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="whitespace-pre-wrap">{lead.address}</span>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                    <Phone className="size-4" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                    <Mail className="size-4" /> {lead.email}
                  </a>
                )}
                {!lead.address && !lead.phone && !lead.email && (
                  <p className="text-sm text-muted-foreground italic">No contact details on file.</p>
                )}
              </div>
              {/* Right: meta info (Request Source / Requested / Used for) */}
              <div className="space-y-3 sm:border-l sm:border-border/40 sm:pl-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request Source</p>
                  <p className="text-sm font-medium text-foreground">{renderSourceBadge(lead.source)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Requested</p>
                  <p className="text-sm font-medium text-foreground">{formatDateMedium(lead.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Used for</p>
                  {lead.job ? (
                    <p className="text-sm text-emerald-700 font-medium hover:underline cursor-pointer">
                      Job #{lead.job.id.slice(-6)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
            </div>
          </FormSectionCard>

          {/* Overview card */}
          <FormSectionCard
            icon={FileText}
            title="Overview"
            description="Service details"
            action={
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="text-muted-foreground hover:text-emerald-600 transition-colors"
                title="Edit"
              >
                <Pencil className="size-4" />
              </button>
            }
          >
            <div className="space-y-4">
              {lead.description ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{lead.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No service details provided.</p>
              )}
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <span className="size-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  <span>Please provide as much information as you can.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="size-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  <span>Share images of the work to be done.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="size-1 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  <span>How did you hear about us?</span>
                </li>
              </ul>
              {overviewImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ImageIcon className="size-3.5" /> Work images ({overviewImages.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {overviewImages.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-md overflow-hidden border bg-muted"
                      >
                        <img src={url} alt={`Work ${i + 1}`} className="size-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FormSectionCard>

          {/* On-site assessment card */}
          <FormSectionCard icon={Truck} title="On-site assessment">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Truck className="size-8 text-muted-foreground/50 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">
                  Visit the property to assess the job before you do the work.
                </p>
              </div>
              {assessmentImages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Camera className="size-3.5" /> Assessment photos ({assessmentImages.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {assessmentImages.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-md overflow-hidden border bg-muted"
                      >
                        <img src={url} alt={`Assessment ${i + 1}`} className="size-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FormSectionCard>

          {/* Product / Service card */}
          <FormSectionCard
            icon={Briefcase}
            title="Product / Service"
            action={
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="text-muted-foreground hover:text-emerald-600 transition-colors"
                title="Edit"
              >
                <Pencil className="size-4" />
              </button>
            }
          >
            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No line items added to this lead.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                      <th className="px-2 py-2 font-medium">Description</th>
                      <th className="px-2 py-2 font-medium text-center">Quantity</th>
                      <th className="px-2 py-2 font-medium text-right">Unit price</th>
                      <th className="px-2 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((it, i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="px-2 py-2.5 font-medium text-foreground">{it.name || 'Custom item'}</td>
                        <td className="px-2 py-2.5 text-center text-muted-foreground">{it.quantity || 1}</td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground">{formatCurrency(parseFloat(it.unitPrice) || 0)}</td>
                        <td className="px-2 py-2.5 text-right font-semibold text-foreground">{formatCurrency(lineItemTotal(it))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border/60">
                      <td colSpan={3} className="px-2 py-2 text-right text-sm text-muted-foreground">Subtotal</td>
                      <td className="px-2 py-2 text-right text-sm text-muted-foreground">{formatCurrency(subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-2 py-1 text-right text-sm font-semibold text-foreground">Total</td>
                      <td className="px-2 py-1 text-right text-base font-bold text-foreground">{formatCurrency(subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </FormSectionCard>

          {/* Pipeline Progress card */}
          <FormSectionCard
            icon={TrendingUp}
            title="Pipeline progress"
            description="Track the lead through the pipeline stages."
          >
            <div className="space-y-4">
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
                          !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
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
              {!isClosed && (
                <div className="pt-3 border-t border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
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
            </div>
          </FormSectionCard>
        </div>

        {/* ── Right column: sidebar ── */}
        <div className="space-y-6 xl:sticky xl:top-4">
          {/* Lead info card */}
          <FormSectionCard icon={Info} title="Lead info">
            <dl className="space-y-0">
              {detailRows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0 pt-2 first:pt-0"
                >
                  <dt className="text-sm text-muted-foreground shrink-0">{row.label}</dt>
                  <dd className="text-sm font-medium text-foreground text-right min-w-0 break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </FormSectionCard>

          {/* Notes card */}
          <FormSectionCard
            icon={StickyNote}
            title="Notes"
            action={
              <button
                type="button"
                title="Add note"
                onClick={() => {
                  const el = document.getElementById('lead-detail-new-note-input');
                  if (el) (el as HTMLInputElement).focus();
                }}
                className="inline-flex items-center justify-center size-7 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
              >
                <span className="text-lg leading-none">+</span>
              </button>
            }
          >
            <div className="space-y-3">
              {leadNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-1">No notes yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {leadNotes.map((note, idx) => (
                    <div key={idx} className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">Fieseros</p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Link2 className="size-3" /> Linked note
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatDateMedium(note.createdAt)}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Input
                  id="lead-detail-new-note-input"
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 text-sm h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newNote.trim()) onAddNote();
                  }}
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3"
                  onClick={onAddNote}
                  disabled={!newNote.trim()}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </FormSectionCard>
        </div>
      </div>
    </div>
  );
}
