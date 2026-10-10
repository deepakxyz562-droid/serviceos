'use client';

import { ArrowLeft, CalendarDays, Loader2, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState } from '@/components/shared/error-state';
import type { Lead } from '@/features/leads/types';
import type { LeadFormPageProps } from '@/features/leads/components/lead-form-page';
import type { LeadDetailPageProps } from '@/features/leads/components/lead-detail-page';
import { KANBAN_STATUSES, STATUS_CONFIG, SOURCE_CONFIG, PRIORITY_CONFIG, mapToKanbanStatus, parseNotes, formatDateShort } from '@/features/leads/utils/lead-helpers';

const label = (stage: string) => stage === 'quote_sent' ? 'Proposal' : STATUS_CONFIG[stage]?.label || stage;

/** Presentation only: selection, validation and all writes remain in LeadsView. */
export function BgosLeadBoard({ leads, loading, error, onRetry, onAddLead, onLeadClick, formatCompact }: {
  leads: Lead[]; loading: boolean; error: string | null; onRetry: () => void; onAddLead: () => void; onLeadClick: (lead: Lead) => void; formatCompact: (value: number) => string;
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <div role="status" className="rounded-xl border bg-card p-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-5 animate-spin" />Loading leads…</div>;
  if (!leads.length) return <div className="rounded-xl border bg-card p-12 text-center"><Users className="mx-auto mb-4 size-8 text-primary" /><h3 className="font-semibold">Your next relationship starts here</h3><p className="my-3 text-sm text-muted-foreground">Add a lead or adjust your filters to see your pipeline.</p><Button onClick={onAddLead}><Plus className="mr-2 size-4" />Add lead</Button></div>;
  return <><p className="bgos-board-caption">Showing leads on the current page. Stage counts and values reflect these loaded records.</p><div className="bgos-lead-board">{KANBAN_STATUSES.map(stage => {
    const items = leads.filter(lead => mapToKanbanStatus(lead.status) === stage);
    return <section key={stage} className="bgos-lead-lane" aria-label={`${label(stage)} leads`}><header><span>{label(stage)}</span><span>{items.length}</span></header><p>{formatCompact(items.reduce((sum, lead) => sum + (lead.value || 0), 0))}</p>{items.map(lead => <button className="bgos-lead-card" key={lead.id} onClick={() => onLeadClick(lead)}><strong>{lead.name}</strong><small>{lead.title || lead.email || lead.phone}</small><div className="mt-4 flex items-center justify-between gap-2 text-xs"><span className="rounded bg-accent px-2 py-1 text-accent-foreground">{SOURCE_CONFIG[lead.source]?.label || lead.source}</span><span>{formatCompact(lead.value || 0)}</span></div><footer><span className="flex items-center gap-1"><CalendarDays size={12} />{lead.followUpAt ? formatDateShort(lead.followUpAt) : 'No follow-up set'}</span><span>{lead.assignedTo?.name?.split(' ')[0] || 'Unassigned'}</span></footer></button>)}{!items.length && <p className="rounded-lg border border-dashed p-5 text-center">No leads on this page</p>}</section>;
  })}</div></>;
}

export function BgosLeadForm({ editingLead, leadForm, setLeadForm, onSave, onCancel, saving, symbol }: LeadFormPageProps) {
  const set = (field: keyof typeof leadForm, value: string) => setLeadForm(previous => ({ ...previous, [field]: value }));
  return <div className="bgos-page"><header className="bgos-page-heading"><div><p className="bgos-eyebrow">Leads & CRM</p><h1>{editingLead ? 'Edit lead' : 'Add a lead'}</h1><p>Capture the context your team needs for the next conversation.</p></div><Button variant="outline" onClick={onCancel}><ArrowLeft className="mr-2 size-4" />Back to leads</Button></header><form className="bgos-panel max-w-4xl" onSubmit={event => { event.preventDefault(); onSave(); }}><div className="grid gap-5 sm:grid-cols-2">
    <Field title="Name"><Input value={leadForm.name} onChange={e => set('name', e.target.value)} required maxLength={200} autoComplete="name" /></Field>
    <Field title="Phone"><Input type="tel" value={leadForm.phone} onChange={e => set('phone', e.target.value)} required maxLength={40} autoComplete="tel" /></Field>
    <Field title="Email"><Input type="email" value={leadForm.email} onChange={e => set('email', e.target.value)} maxLength={254} autoComplete="email" /></Field>
    <Field title="Opportunity"><Input value={leadForm.title} onChange={e => set('title', e.target.value)} placeholder="What is this customer interested in?" maxLength={200} /></Field>
    <Field title="Source"><select className="h-10 rounded-lg border bg-card px-3 text-sm" value={leadForm.source} onChange={e => set('source', e.target.value)}>{Object.entries(SOURCE_CONFIG).map(([value, config]) => <option value={value} key={value}>{config.label}</option>)}</select></Field>
    <Field title="Priority"><select className="h-10 rounded-lg border bg-card px-3 text-sm" value={leadForm.priority} onChange={e => set('priority', e.target.value)}>{Object.entries(PRIORITY_CONFIG).map(([value, config]) => <option value={value} key={value}>{config.label}</option>)}</select></Field>
    <Field title={`Estimated value (${symbol})`}><Input type="number" min="0" step="0.01" value={leadForm.value} onChange={e => set('value', e.target.value)} /></Field>
    <Field title="Location"><Input value={leadForm.address} onChange={e => set('address', e.target.value)} maxLength={500} /></Field>
    <div className="sm:col-span-2"><Field title="Customer needs"><Textarea rows={4} value={leadForm.serviceDetails} onChange={e => set('serviceDetails', e.target.value)} /></Field></div>
    <div className="sm:col-span-2"><Field title="Internal note"><Textarea rows={3} value={leadForm.notes} onChange={e => set('notes', e.target.value)} placeholder="Add context for your team" /></Field></div>
  </div><div className="mt-7 flex justify-end gap-3"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{saving ? 'Saving…' : 'Save lead'}</Button></div></form></div>;
}
function Field({ title, children }: { title: string; children: React.ReactNode }) { return <label className="flex flex-col gap-2 text-sm font-medium">{title}{children}</label>; }

export function BgosLeadDetail({ lead, onBack, onEdit, onDelete, onStatusChange, onAddNote, newNote, setNewNote, statusLoadingId, formatCurrency }: LeadDetailPageProps) {
  if (!lead) return null;
  const notes = parseNotes(lead.notesJson);
  return <div className="bgos-page"><header className="bgos-page-heading"><div><p className="bgos-eyebrow">Leads & CRM / Relationship</p><h1>{lead.name}</h1><p>{lead.title || 'Lead details and activity'}</p></div><div className="flex gap-2"><Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 size-4" />Back</Button><Button onClick={() => onEdit(lead)}>Edit lead</Button></div></header><div className="bgos-dashboard-columns"><section className="bgos-panel"><h2>Customer details</h2><dl className="mt-6 grid gap-5 sm:grid-cols-2">{[['Email', lead.email], ['Phone', lead.phone], ['Source', SOURCE_CONFIG[lead.source]?.label || lead.source], ['Assigned to', lead.assignedTo?.name || 'Unassigned'], ['Estimated value', formatCurrency(lead.value || 0)], ['Next follow-up', lead.followUpAt ? formatDateShort(lead.followUpAt) : 'Not scheduled']].map(([name, value]) => <div key={name}><dt className="text-xs text-muted-foreground">{name}</dt><dd className="mt-1 break-words text-sm">{value || 'Not provided'}</dd></div>)}</dl>{lead.description && <div className="mt-7 border-t pt-5"><h3 className="text-sm font-medium">Customer needs</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{lead.description}</p></div>}<label className="mt-7 flex flex-col gap-2 text-sm font-medium">Pipeline stage<select className="h-10 rounded-lg border bg-card px-3" value={mapToKanbanStatus(lead.status)} disabled={statusLoadingId === lead.id} onChange={e => onStatusChange(lead.id, e.target.value)}>{KANBAN_STATUSES.map(stage => <option key={stage} value={stage}>{label(stage)}</option>)}</select></label><Button variant="ghost" className="mt-8 text-destructive" onClick={() => onDelete(lead)}>Delete lead</Button></section><section className="bgos-panel"><h2>Activity & notes</h2>{notes.length ? <ol className="my-5 space-y-4">{notes.map((note, i) => <li key={`${note.createdAt}-${i}`} className="border-l-2 border-primary/20 pl-4"><p className="whitespace-pre-wrap text-sm">{note.text}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateShort(note.createdAt)}{note.author ? ` · ${note.author}` : ''}</p></li>)}</ol> : <p className="my-6 text-sm text-muted-foreground">Capture context and next steps for your team.</p>}<form onSubmit={e => { e.preventDefault(); onAddNote(); }}><Label htmlFor="bgos-lead-note">Add a note</Label><Textarea id="bgos-lead-note" className="my-3" rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} required /><Button disabled={!newNote.trim()}>Save note</Button></form></section></div></div>;
}
