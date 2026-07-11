'use client';

/**
 * VisitDialog + EditAllVisitsDialog
 * ---------------------------------
 * Jobber-style scheduling dialogs for the Job Detail page.
 *
 *   <VisitDialog
 *      jobId={job.id}
 *      job={job}                      // Job row (for default title + customer)
 *      mode="create" | "edit"
 *      visit?: JobVisitRow            // required when mode="edit"
 *      employees={employees}          // Employee picker options
 *      checklists={checklists}        // Checklist picker options
 *      open={open}
 *      onOpenChange={setOpen}
 *      onSaved={() => refresh()}
 *   />
 *
 *   <EditAllVisitsDialog
 *      jobId={job.id}
 *      visits={visits}                // all visits for the job
 *      open={open}
 *      onOpenChange={setOpen}
 *      onSaved={() => refresh()}
 *   />
 *
 * Visits are persisted via /api/jobs/[id]/visits (POST create, PATCH update).
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays, Clock, Users, Repeat, AlertCircle, X, Plus, Trash2, Loader2, ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

// ── Types ──────────────────────────────────────────────────────────────────

export interface JobVisitRow {
  id: string;
  jobVisitNumber: number;
  jobId: string;
  title: string;
  instructions: string | null;
  scheduledDate: string | Date;
  endDate?: string | Date | null;
  scheduledTime: string | null;
  endTime: string | null;
  anytime: boolean;
  scheduleLater: boolean;
  repeats: string;
  repeatInterval: number;
  repeatWeekdays: string;
  repeatUntil: string | Date | null;
  assigneeIdsJson: string;
  assigneeNamesJson: string;
  emailTeam: boolean;
  teamReminder: string;
  checklistIdsJson: string;
  status: string;
  notes: string | null;
}

interface EmployeeOption {
  id: string;
  name: string;
}

interface ChecklistOption {
  id: string;
  name: string;
}

interface JobLite {
  id: string;
  title?: string | null;
  customerName?: string | null;
  jobNumber?: string | null;
}

interface VisitFormState {
  title: string;
  instructions: string;
  scheduledDate: string;          // yyyy-mm-dd
  endDate: string;                // yyyy-mm-dd or ''
  scheduledTime: string;          // HH:mm or ''
  endTime: string;                // HH:mm or ''
  anytime: boolean;
  scheduleLater: boolean;
  repeats: string;
  repeatInterval: number;
  repeatWeekdays: number[];
  repeatUntil: string;            // yyyy-mm-dd or ''
  assigneeIds: string[];
  emailTeam: boolean;
  teamReminder: string;
  checklistIds: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  // yyyy-mm-dd in local timezone
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateInput(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function parseJsonArray<T>(s: string | null | undefined): T[] {
  try {
    const v = JSON.parse(s || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function formatRepeatSummary(repeats: string, interval: number, until: string, weekdays: number[]): string {
  if (repeats === 'none') return 'Does not repeat';
  const wdNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let base = '';
  if (repeats === 'daily') base = interval === 1 ? 'Daily' : `Every ${interval} days`;
  else if (repeats === 'weekly') {
    if (weekdays.length > 0) {
      base = `Weekly on ${weekdays.sort().map((w) => wdNames[w]).join(', ')}`;
    } else {
      base = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    }
  } else if (repeats === 'monthly') base = interval === 1 ? 'Monthly' : `Every ${interval} months`;
  if (until) base += ` until ${until}`;
  return base;
}

// ── VisitDialog ────────────────────────────────────────────────────────────

export function VisitDialog({
  jobId,
  job,
  mode,
  visit,
  employees,
  checklists,
  open,
  onOpenChange,
  onSaved,
}: {
  jobId: string;
  job: JobLite;
  mode: 'create' | 'edit';
  visit?: JobVisitRow | null;
  employees: EmployeeOption[];
  checklists: ChecklistOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = mode === 'edit';
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VisitFormState>(getDefaultForm(job, visit));
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Reset form whenever the dialog opens or the target visit changes.
  useEffect(() => {
    if (open) {
      setForm(getDefaultForm(job, visit));
      setAssigneeSearch('');
    }
  }, [open, visit, job]);

  const toggleAssignee = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter((x) => x !== id)
        : [...f.assigneeIds, id],
    }));
  };

  const toggleWeekday = (wd: number) => {
    setForm((f) => ({
      ...f,
      repeatWeekdays: f.repeatWeekdays.includes(wd)
        ? f.repeatWeekdays.filter((x) => x !== wd)
        : [...f.repeatWeekdays, wd],
    }));
  };

  const toggleChecklist = (id: string) => {
    setForm((f) => ({
      ...f,
      checklistIds: f.checklistIds.includes(id)
        ? f.checklistIds.filter((x) => x !== id)
        : [...f.checklistIds, id],
    }));
  };

  const filteredEmployees = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, assigneeSearch]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Visit title is required');
      return;
    }
    if (!form.scheduleLater && !form.scheduledDate) {
      toast.error('Start date is required (or enable "Schedule later")');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        instructions: form.instructions.trim() || null,
        scheduledDate: form.scheduleLater ? null : fromDateInput(form.scheduledDate)?.toISOString(),
        endDate: form.endDate ? fromDateInput(form.endDate)?.toISOString() : null,
        scheduledTime: form.anytime ? null : form.scheduledTime || null,
        endTime: form.anytime ? null : form.endTime || null,
        anytime: form.anytime,
        scheduleLater: form.scheduleLater,
        repeats: isEdit ? 'none' : form.repeats,
        repeatInterval: isEdit ? 1 : Number(form.repeatInterval) || 1,
        repeatWeekdays: isEdit ? [] : form.repeatWeekdays,
        repeatUntil: (!isEdit && form.repeatUntil) ? fromDateInput(form.repeatUntil)?.toISOString() : null,
        assigneeIds: form.assigneeIds,
        emailTeam: form.emailTeam,
        teamReminder: form.teamReminder,
        checklistIds: form.checklistIds,
      };

      const url = isEdit
        ? `/api/jobs/${jobId}/visits/${visit?.id}`
        : `/api/jobs/${jobId}/visits`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save visit');
      }

      toast.success(isEdit ? 'Visit updated' : `Created ${data.created || 1} visit${(data.created || 1) === 1 ? '' : 's'}`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('Save visit error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save visit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!visit) return;
    if (!confirm('Delete this visit? This cannot be undone.')) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/jobs/${jobId}/visits/${visit.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete visit');
      }
      toast.success('Visit deleted');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete visit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Visit #${visit?.jobVisitNumber}` : 'New Visit'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the schedule, instructions, and team for this visit.'
              : 'Schedule a visit for this job. Set a repeat rule to generate multiple visits at once.'}
          </DialogDescription>
        </DialogHeader>

        {/* Title + Instructions */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="vd-title" className="text-xs text-muted-foreground">Visit title</Label>
            <Input
              id="vd-title"
              placeholder="e.g. On-site assessment, Leak repair"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="vd-instr" className="text-xs text-muted-foreground">Visit instructions</Label>
            <Textarea
              id="vd-instr"
              rows={2}
              placeholder="What should the team do at this visit?"
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            />
          </div>
        </div>

        <Separator />

        {/* Schedule */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarDays className="size-4 text-emerald-600" /> Schedule
          </div>

          {!isEdit && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
              This is a job with one visit — any changes here will create a new visit for this job.
              Use <span className="font-medium">Repeats</span> below to generate multiple visits at once.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input
                type="date"
                value={form.scheduledDate}
                disabled={form.scheduleLater}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End date</Label>
              <Input
                type="date"
                value={form.endDate}
                disabled={form.scheduleLater}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.scheduleLater}
                onCheckedChange={(v) => setForm((f) => ({ ...f, scheduleLater: v === true }))}
              />
              Schedule later
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.anytime}
                disabled={form.scheduleLater}
                onCheckedChange={(v) => setForm((f) => ({ ...f, anytime: v === true }))}
              />
              Anytime
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start time</Label>
              <Input
                type="time"
                value={form.scheduledTime}
                disabled={form.anytime || form.scheduleLater}
                onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End time</Label>
              <Input
                type="time"
                value={form.endTime}
                disabled={form.anytime || form.scheduleLater}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Repeats */}
          {!isEdit && (
            <div className="space-y-3 rounded-md border border-border/60 p-3 bg-muted/10">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Repeat className="size-4 text-emerald-600" /> Repeats
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={form.repeats}
                  onValueChange={(v) => setForm((f) => ({ ...f, repeats: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {form.repeats !== 'none' && (
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.repeatInterval}
                    onChange={(e) => setForm((f) => ({ ...f, repeatInterval: Number(e.target.value) || 1 }))}
                    placeholder="Interval"
                  />
                )}
              </div>

              {form.repeats === 'weekly' && (
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((wd) => (
                    <button
                      key={wd}
                      type="button"
                      onClick={() => toggleWeekday(wd)}
                      className={`h-8 w-8 rounded-full text-xs font-medium border transition-colors ${
                        form.repeatWeekdays.includes(wd)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted'
                      }`}
                      title={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][wd]}
                    >
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'][wd]}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground self-center ml-1">
                    Leave empty to repeat on the start-date weekday only
                  </span>
                </div>
              )}

              {form.repeats !== 'none' && (
                <div>
                  <Label className="text-xs text-muted-foreground">Repeat until (optional)</Label>
                  <Input
                    type="date"
                    value={form.repeatUntil}
                    onChange={(e) => setForm((f) => ({ ...f, repeatUntil: e.target.value }))}
                  />
                </div>
              )}

              {form.repeats !== 'none' && (
                <p className="text-xs text-muted-foreground">
                  → {formatRepeatSummary(form.repeats, form.repeatInterval, form.repeatUntil, form.repeatWeekdays)}
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Team */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="size-4 text-emerald-600" /> Team
          </div>

          <Input
            placeholder="Search team members to assign..."
            value={assigneeSearch}
            onChange={(e) => setAssigneeSearch(e.target.value)}
          />

          <div className="max-h-40 overflow-y-auto rounded-md border border-border/60">
            {filteredEmployees.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-muted-foreground">No team members found.</div>
            ) : (
              filteredEmployees.slice(0, 30).map((emp) => {
                const selected = form.assigneeIds.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleAssignee(emp.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                      selected ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className={`size-4 rounded border flex items-center justify-center ${
                      selected ? 'bg-emerald-600 border-emerald-600' : 'border-border'
                    }`}>
                      {selected && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <span className="flex-1 truncate">{emp.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {form.assigneeIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.assigneeIds.map((id) => {
                const emp = employees.find((e) => e.id === id);
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {emp?.name || id}
                    <button
                      type="button"
                      onClick={() => toggleAssignee(id)}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.emailTeam}
                onCheckedChange={(v) => setForm((f) => ({ ...f, emailTeam: v === true }))}
              />
              Email team when assigned
            </label>
            <div className="flex items-center gap-2 text-sm flex-1">
              <span className="text-muted-foreground whitespace-nowrap">Team reminder</span>
              <Select
                value={form.teamReminder}
                onValueChange={(v) => setForm((f) => ({ ...f, teamReminder: v }))}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reminder set</SelectItem>
                  <SelectItem value="1h">1 hour before</SelectItem>
                  <SelectItem value="24h">24 hours before</SelectItem>
                  <SelectItem value="2d">2 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {checklists.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ListChecks className="size-4 text-emerald-600" /> Checklists
              </div>
              <div className="space-y-1">
                {checklists.map((cl) => {
                  const selected = form.checklistIds.includes(cl.id);
                  return (
                    <button
                      key={cl.id}
                      type="button"
                      onClick={() => toggleChecklist(cl.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 rounded-md text-left text-sm hover:bg-accent transition-colors ${
                        selected ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className={`size-4 rounded border flex items-center justify-center ${
                        selected ? 'bg-emerald-600 border-emerald-600' : 'border-border'
                      }`}>
                        {selected && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <span className="flex-1 truncate">{cl.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto">
              <Trash2 className="size-4 mr-1" /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            {isEdit ? 'Save' : 'Create Visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── EditAllVisitsDialog ────────────────────────────────────────────────────

export function EditAllVisitsDialog({
  jobId,
  visits,
  open,
  onOpenChange,
  onSaved,
}: {
  jobId: string;
  visits: JobVisitRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [emailTeam, setEmailTeam] = useState(false);
  const [teamReminder, setTeamReminder] = useState('none');

  useEffect(() => {
    if (open && visits.length > 0) {
      setTitle(visits[0].title || '');
      setInstructions(visits[0].instructions || '');
      setEmailTeam(visits[0].emailTeam || false);
      setTeamReminder(visits[0].teamReminder || 'none');
    }
  }, [open, visits]);

  const scheduledCount = visits.filter((v) => v.status === 'scheduled' || v.status === 'in_progress').length;
  const firstDate = visits[0]?.scheduledDate;

  const handleApply = async () => {
    if (visits.length === 0) return;
    setSaving(true);
    try {
      // Apply shared fields to ALL visits by updating each one with applyToAll=true.
      // The PATCH endpoint handles the bulk update via the applyToAll flag.
      const firstVisit = visits[0];
      const res = await authFetch(`/api/jobs/${jobId}/visits/${firstVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          instructions: instructions.trim() || null,
          emailTeam,
          teamReminder,
          applyToAll: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update visits');
      toast.success(`Applied to ${visits.length} visit${visits.length === 1 ? '' : 's'}`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update visits');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit all visits</DialogTitle>
          <DialogDescription>
            Apply the same title, instructions, and team reminders to all visits on this job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 flex items-center gap-2">
            <CalendarDays className="size-4" />
            <span>
              Total visits <strong>{visits.length}</strong>
              {firstDate ? <> | First on <strong>{new Date(firstDate as string).toLocaleDateString()}</strong></> : null}
              {scheduledCount > 0 && <> | {scheduledCount} scheduled</>}
            </span>
          </div>

          <div>
            <Label htmlFor="ea-title" className="text-xs text-muted-foreground">Visit title</Label>
            <Input
              id="ea-title"
              placeholder="Visit title applied to all visits"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="ea-instr" className="text-xs text-muted-foreground">Visit instructions</Label>
            <Textarea
              id="ea-instr"
              rows={3}
              placeholder="Instructions applied to all visits"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={emailTeam}
                onCheckedChange={(v) => setEmailTeam(v === true)}
              />
              Email team about assignment
            </label>
            <div className="flex items-center gap-2 text-sm flex-1">
              <span className="text-muted-foreground whitespace-nowrap">Team reminder</span>
              <Select value={teamReminder} onValueChange={setTeamReminder}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reminder set</SelectItem>
                  <SelectItem value="1h">1 hour before</SelectItem>
                  <SelectItem value="24h">24 hours before</SelectItem>
                  <SelectItem value="2d">2 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            Update All Visits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Default form factory ───────────────────────────────────────────────────

function getDefaultForm(job: JobLite, visit?: JobVisitRow | null): VisitFormState {
  if (visit) {
    return {
      title: visit.title || '',
      instructions: visit.instructions || '',
      scheduledDate: toDateInput(visit.scheduledDate),
      endDate: toDateInput(visit.endDate),
      scheduledTime: visit.scheduledTime || '',
      endTime: visit.endTime || '',
      anytime: visit.anytime ?? true,
      scheduleLater: visit.scheduleLater ?? false,
      repeats: 'none',
      repeatInterval: 1,
      repeatWeekdays: [],
      repeatUntil: '',
      assigneeIds: parseJsonArray<string>(visit.assigneeIdsJson),
      emailTeam: visit.emailTeam ?? false,
      teamReminder: visit.teamReminder || 'none',
      checklistIds: parseJsonArray<string>(visit.checklistIdsJson),
    };
  }
  // New visit defaults: pre-fill title from customer + today's date.
  const today = new Date();
  return {
    title: job.customerName ? `${job.customerName} - Visit` : 'New Visit',
    instructions: '',
    scheduledDate: toDateInput(today),
    endDate: '',
    scheduledTime: '',
    endTime: '',
    anytime: true,
    scheduleLater: false,
    repeats: 'none',
    repeatInterval: 1,
    repeatWeekdays: [],
    repeatUntil: '',
    assigneeIds: [],
    emailTeam: false,
    teamReminder: 'none',
    checklistIds: [],
  };
}
