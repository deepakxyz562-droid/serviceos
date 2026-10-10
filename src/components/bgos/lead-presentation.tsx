'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Sparkles,
  Star,
  Tag,
  Trash2,
  User,
  Users,
  Calendar,
  Check,
  Copy,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/shared/error-state';
import { toast } from 'sonner';
import type { Lead } from '@/features/leads/types';
import type { LeadFormPageProps } from '@/features/leads/components/lead-form-page';
import type { LeadDetailPageProps } from '@/features/leads/components/lead-detail-page';
import {
  KANBAN_STATUSES,
  STATUS_CONFIG,
  SOURCE_CONFIG,
  PRIORITY_CONFIG,
  mapToKanbanStatus,
  parseNotes,
  formatDateShort,
} from '@/features/leads/utils/lead-helpers';
import { cn } from '@/lib/utils';

const stageLabel = (stage: string) =>
  stage === 'quote_sent' ? 'Proposal' : STATUS_CONFIG[stage]?.label || stage;

const STAGE_DOT_COLORS: Record<string, string> = {
  new: 'bg-primary',
  contacted: 'bg-violet-600',
  quote_sent: 'bg-amber-500',
  won: 'bg-emerald-500',
  lost: 'bg-rose-500',
};

const STAGE_BADGE_STYLES: Record<string, string> = {
  new: 'bg-primary/10 text-primary border-primary/20',
  contacted: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300',
  quote_sent: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  lost: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
};

function getInitials(name?: string | null): string {
  if (!name) return 'LD';
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Presentation Kanban board with Kinetic Growth Engine lane and card styling */
export function BgosLeadBoard({
  leads,
  loading,
  error,
  onRetry,
  onAddLead,
  onLeadClick,
  formatCompact,
}: {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddLead: () => void;
  onLeadClick: (lead: Lead) => void;
  formatCompact: (value: number) => string;
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) {
    return (
      <div role="status" className="rounded-2xl border bg-card p-14 text-center text-muted-foreground shadow-xs">
        <Loader2 className="mx-auto mb-3 size-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Synchronizing pipeline deals…</p>
      </div>
    );
  }
  if (!leads.length) {
    return (
      <div className="rounded-2xl border bg-card p-14 text-center shadow-xs">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-6" />
        </div>
        <h3 className="text-base font-bold tracking-tight">Your pipeline is ready for new opportunities</h3>
        <p className="mx-auto my-2.5 max-w-md text-sm text-muted-foreground">
          Capture new inquiries automatically through WhatsApp, web forms, and phone, or add a lead directly to track stage progression.
        </p>
        <Button onClick={onAddLead} className="mt-2 font-semibold">
          <Plus className="mr-2 size-4" />
          Add first lead
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Showing loaded pipeline leads across all stages.</span>
        <span className="font-semibold text-foreground">
          {leads.length} active record{leads.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start">
        {KANBAN_STATUSES.map((stage) => {
          const items = leads.filter((lead) => mapToKanbanStatus(lead.status) === stage);
          const stageTotal = items.reduce((sum, lead) => sum + (lead.value || 0), 0);
          const dotColor = STAGE_DOT_COLORS[stage] || 'bg-primary';

          return (
            <section
              key={stage}
              aria-label={`${stageLabel(stage)} leads`}
              className="flex flex-col gap-2.5 rounded-2xl border bg-muted/30 p-2.5 shadow-2xs min-h-[520px]"
            >
              {/* Lane Header */}
              <header className="flex items-center justify-between px-1.5 py-1">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full ring-2 ring-background', dotColor)} />
                  <span className="text-xs font-bold text-foreground">{stageLabel(stage)}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-bold text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {formatCompact(stageTotal)}
                </span>
              </header>

              {/* Cards Feed */}
              <div className="flex flex-col gap-2 flex-1">
                {items.map((lead) => {
                  const initials = getInitials(lead.name);
                  const isHighPriority = lead.priority === 'urgent' || lead.priority === 'high';

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onLeadClick(lead)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onLeadClick(lead);
                        }
                      }}
                      className="group text-left rounded-xl border bg-card p-3 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all cursor-pointer relative flex flex-col gap-2.5"
                    >
                      {/* Identity Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-7 rounded-lg bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {lead.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {lead.title || lead.email || lead.phone || 'New inquiry'}
                            </p>
                          </div>
                        </div>

                        {isHighPriority ? (
                          <span
                            title="High Priority"
                            className="shrink-0 size-2 rounded-full bg-rose-500 animate-pulse mt-1"
                          />
                        ) : (
                          <Star className="size-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                      </div>

                      {/* Value & Channel */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="font-bold text-xs text-foreground">
                          {lead.value > 0 ? formatCompact(lead.value) : '—'}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {SOURCE_CONFIG[lead.source]?.label || lead.source || 'Direct'}
                        </span>
                      </div>

                      {/* Footer: Date & Assignee */}
                      <footer className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <CalendarDays className="size-3 shrink-0" />
                          {lead.followUpAt ? formatDateShort(lead.followUpAt) : 'No follow-up'}
                        </span>
                        <span className="truncate max-w-[80px] font-medium text-foreground/80">
                          {lead.assignedTo?.name ? lead.assignedTo.name.split(' ')[0] : 'Unassigned'}
                        </span>
                      </footer>
                    </div>
                  );
                })}

                {!items.length && (
                  <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                    <span>No deals in this stage</span>
                  </div>
                )}
              </div>

              {/* Lane Quick Add */}
              <button
                type="button"
                onClick={onAddLead}
                className="w-full py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-card text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center justify-center gap-1 transition-all mt-auto"
              >
                <Plus className="size-3.5" />
                <span>Add deal</span>
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Form with clean 2-column layout and validated fields */
export function BgosLeadForm({
  editingLead,
  leadForm,
  setLeadForm,
  onSave,
  onCancel,
  saving,
  symbol,
}: LeadFormPageProps) {
  const set = (field: keyof typeof leadForm, value: string) =>
    setLeadForm((previous) => ({ ...previous, [field]: value }));

  return (
    <div className="bgos-page space-y-6 max-w-4xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leads &amp; CRM / Pipeline</p>
          <h1 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
            {editingLead ? `Edit lead: ${editingLead.name}` : 'Add a new lead'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Capture client contact context, deal value, and requirements for automated pipeline follow-up.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="mr-2 size-3.5" />
          Back to pipeline
        </Button>
      </header>

      <form
        className="rounded-2xl border bg-card p-6 shadow-xs space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field title="Full Name *">
            <Input
              value={leadForm.name}
              onChange={(e) => set('name', e.target.value)}
              required
              maxLength={200}
              placeholder="e.g. Sarah Johnson"
              autoComplete="name"
            />
          </Field>
          <Field title="Phone Number *">
            <Input
              type="tel"
              value={leadForm.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              maxLength={40}
              placeholder="e.g. +1 415 555 2671"
              autoComplete="tel"
            />
          </Field>
          <Field title="Email Address">
            <Input
              type="email"
              value={leadForm.email}
              onChange={(e) => set('email', e.target.value)}
              maxLength={254}
              placeholder="e.g. sarah.johnson@example.com"
              autoComplete="email"
            />
          </Field>
          <Field title="Service Interest / Opportunity">
            <Input
              value={leadForm.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Full Deep Cleaning or Office Routine"
              maxLength={200}
            />
          </Field>
          <Field title="Channel Source">
            <select
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={leadForm.source}
              onChange={(e) => set('source', e.target.value)}
            >
              {Object.entries(SOURCE_CONFIG).map(([value, config]) => (
                <option value={value} key={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Priority">
            <select
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={leadForm.priority}
              onChange={(e) => set('priority', e.target.value)}
            >
              {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                <option value={value} key={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </Field>
          <Field title={`Estimated Value (${symbol})`}>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={leadForm.value}
              onChange={(e) => set('value', e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field title="Property / Service Location">
            <Input
              value={leadForm.address}
              onChange={(e) => set('address', e.target.value)}
              maxLength={500}
              placeholder="e.g. 123 Main St, Suite 400"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field title="Customer Needs &amp; Requirements">
              <Textarea
                rows={3}
                value={leadForm.serviceDetails}
                onChange={(e) => set('serviceDetails', e.target.value)}
                placeholder="Specific instructions, pet-friendly products, preferred hours, property size…"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field title="Initial Internal Note">
              <Textarea
                rows={2}
                value={leadForm.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Context for your operations team…"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={saving} className="font-semibold">
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {saving ? 'Saving…' : editingLead ? 'Update lead' : 'Save lead'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
      {title}
      {children}
    </label>
  );
}

/**
 * Stitch Customer 360 / Lead Profile Dossier
 * Multi-column workstation layout featuring:
 *   - Hero Identity with Hot Lead/VIP pills & 1-tap call/WhatsApp/email actions
 *   - Deal progression stepper with live stage change buttons
 *   - Specification details grid & AI requirements summary
 *   - Interactive Internal Notes & Activity timeline
 */
export function BgosLeadDetail({
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
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!lead) return null;

  const notes = parseNotes(lead.notesJson);
  const currentStage = mapToKanbanStatus(lead.status);
  const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9+]/g, '') : '';
  const waPhone = cleanPhone.replace(/^\+/, '');
  const initials = getInitials(lead.name);

  const copyToClipboard = async (text: string, type: 'phone' | 'email') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
      toast.success(`Copied ${type} to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300">
      {/* ── Top Workspace Context Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 h-9">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to pipeline
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Lead Profile Dossier
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold text-[10px]">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mt-0.5">
              {lead.name}
            </h1>
          </div>
        </div>

        {/* Global Action Cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          {onConvert && (
            <Button
              size="sm"
              onClick={() => onConvert(lead)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <CheckCircle2 className="mr-1.5 size-4" />
              Convert to Job
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onEdit(lead)} className="font-semibold">
            Edit Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(lead)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* ── Multi-Column Split Canvas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Hero Identity, 1-tap Actions & Dossier Specification */}
        <div className="lg:col-span-7 space-y-5">
          {/* Hero Identity Card */}
          <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground truncate">{lead.name}</h2>
                    {lead.priority === 'urgent' || lead.priority === 'high' ? (
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                        Hot Lead
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        Standard
                      </Badge>
                    )}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                        STAGE_BADGE_STYLES[currentStage] || 'bg-muted text-muted-foreground'
                      )}
                    >
                      {stageLabel(currentStage)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {lead.title || 'Inquiry without title'} • Created {formatDateShort(lead.createdAt)}
                  </p>
                </div>
              </div>

              {lead.value > 0 && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Estimated Deal
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(lead.value)}
                  </span>
                </div>
              )}
            </div>

            {/* 1-Tap Action Suite */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t">
              {lead.phone ? (
                <a
                  href={`tel:${cleanPhone}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors"
                >
                  <Phone className="size-3.5" />
                  <span>Call Client</span>
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-muted text-muted-foreground text-xs opacity-50 cursor-not-allowed"
                >
                  <Phone className="size-3.5" />
                  <span>No Phone</span>
                </button>
              )}

              {lead.phone ? (
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs transition-colors"
                >
                  <MessageSquare className="size-3.5" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-muted text-muted-foreground text-xs opacity-50 cursor-not-allowed"
                >
                  <MessageSquare className="size-3.5" />
                  <span>No Chat</span>
                </button>
              )}

              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-semibold text-xs transition-colors"
                >
                  <Mail className="size-3.5" />
                  <span>Email</span>
                </a>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-muted text-muted-foreground text-xs opacity-50 cursor-not-allowed"
                >
                  <Mail className="size-3.5" />
                  <span>No Email</span>
                </button>
              )}
            </div>

            {/* Quick Contact Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span className="flex items-center gap-2 truncate text-foreground font-medium">
                  <Phone className="size-3.5 text-muted-foreground shrink-0" />
                  {lead.phone || 'No phone'}
                </span>
                {lead.phone && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(lead.phone!, 'phone')}
                    className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title="Copy phone"
                  >
                    {copiedPhone ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span className="flex items-center gap-2 truncate text-foreground font-medium">
                  <Mail className="size-3.5 text-muted-foreground shrink-0" />
                  {lead.email || 'No email'}
                </span>
                {lead.email && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(lead.email!, 'email')}
                    className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title="Copy email"
                  >
                    {copiedEmail ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lead Specification Grid */}
          <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Deal Parameters &amp; Assignment
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="p-3 rounded-xl bg-muted/30">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Source</span>
                <span className="font-bold text-foreground mt-0.5 block truncate">
                  {SOURCE_CONFIG[lead.source]?.label || lead.source || 'Website'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/30">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Priority</span>
                <span className="font-bold text-foreground mt-0.5 block truncate">
                  {PRIORITY_CONFIG[lead.priority]?.label || lead.priority || 'Medium'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/30">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Assigned To</span>
                <span className="font-bold text-foreground mt-0.5 block truncate">
                  {lead.assignedTo?.name || 'Unassigned'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/30">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Follow-up Target</span>
                <span className="font-bold text-foreground mt-0.5 block truncate">
                  {lead.followUpAt ? formatDateShort(lead.followUpAt) : 'Not scheduled'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 sm:col-span-2">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Location / Address</span>
                <span className="font-medium text-foreground mt-0.5 block truncate">
                  {lead.address || 'Location not specified'}
                </span>
              </div>
            </div>

            {/* Customer Needs & Notes */}
            {lead.description && (
              <div className="rounded-xl bg-gradient-to-br from-violet-500/5 via-primary/5 to-transparent p-4 border border-violet-500/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Customer Needs &amp; Service Details</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {lead.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Pipeline Progression & Activity Timeline */}
        <div className="lg:col-span-5 space-y-5">
          {/* Pipeline Stage Stepper */}
          <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pipeline Progression
              </h3>
              {statusLoadingId === lead.id && (
                <span className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                  <Loader2 className="size-3 animate-spin" /> Updating…
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {KANBAN_STATUSES.map((stage) => {
                const isSelected = currentStage === stage;
                const dotColor = STAGE_DOT_COLORS[stage] || 'bg-primary';

                return (
                  <button
                    key={stage}
                    type="button"
                    disabled={statusLoadingId === lead.id}
                    onClick={() => onStatusChange(lead.id, stage)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left border',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border/60 hover:bg-muted/50 text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('size-2 rounded-full', dotColor)} />
                      <span>{stageLabel(stage)}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity & Internal Notes */}
          <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Internal Notes &amp; Activity ({notes.length})
              </h3>
            </div>

            {/* Note Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddNote();
              }}
              className="space-y-2"
            >
              <Textarea
                id="bgos-lead-note"
                placeholder="Log a call outcome, client preference or next step…"
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="text-xs resize-none"
                required
              />
              <div className="flex justify-end">
                <Button size="sm" disabled={!newNote.trim()} className="font-semibold text-xs h-8">
                  <Send className="mr-1.5 size-3" />
                  Save note
                </Button>
              </div>
            </form>

            {/* Notes List */}
            {notes.length > 0 ? (
              <ol className="space-y-3 pt-2 border-t">
                {notes.map((note, i) => (
                  <li
                    key={`${note.createdAt}-${i}`}
                    className="rounded-xl bg-muted/30 p-3 border border-border/40 space-y-1"
                  >
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{note.text}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>{formatDateShort(note.createdAt)}</span>
                      {note.author && <span className="font-semibold text-foreground/80">{note.author}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 border-t border-dashed">
                No internal notes recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

