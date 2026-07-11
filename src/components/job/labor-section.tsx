'use client';

/**
 * LaborSection
 * ------------
 * Shows a list of JobTimeEntry rows for a job (the "Labor" section on the
 * Job Detail page), plus an "Add Time Entry" button for owners.
 *
 * Reads:   GET  /api/jobs/[id]/time-entries
 * Creates: POST /api/jobs/[id]/time-entries  (owners only)
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock, Plus, Loader2, Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

interface EmployeeOption { id: string; name: string; }

interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  workingMinutes: number;
  entryType: string;
  status: string;
  notes: string | null;
}

interface Totals {
  totalMinutes: number;
  totalWorkingMinutes: number;
  totalTravelMinutes: number;
  count: number;
}

function formatDuration(min: number): string {
  if (!min || min < 1) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function LaborSection({
  jobId,
  employees,
  canAdd = true,
  onAddTimeEntry,
  hideActiveEntry = false,
}: {
  jobId: string;
  employees: EmployeeOption[];
  canAdd?: boolean;
  onAddTimeEntry?: () => void;
  /**
   * When true, entries whose status is 'active' or 'paused' (i.e. the session
   * currently being shown by the live timer above) are hidden from this list
   * so the same session isn't displayed twice. The grand-total minutes in the
   * summary still reflect all entries (completed time only — the DB only
   * populates workingMinutes when an entry is finalized).
   */
  hideActiveEntry?: boolean;
}) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalMinutes: 0, totalWorkingMinutes: 0, totalTravelMinutes: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/jobs/${jobId}/time-entries`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load time entries');
      setEntries(data.entries || []);
      setTotals(data.totals || { totalMinutes: 0, totalWorkingMinutes: 0, totalTravelMinutes: 0, count: 0 });
    } catch (err) {
      console.error('fetchEntries error:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchEntries();
    // Re-fetch when the active-session visibility flips so the list stays in
    // sync with the live timer (e.g. when a session completes, its entry
    // transitions from 'active' → 'completed' and should now appear here).
  }, [fetchEntries, hideActiveEntry]);

  // Filter out the in-flight session when it's already shown by the live timer.
  const visibleEntries = hideActiveEntry
    ? entries.filter((e) => e.status !== 'active' && e.status !== 'paused')
    : entries;
  const hiddenCount = entries.length - visibleEntries.length;

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-xs text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" /> Loading…</span>
          ) : visibleEntries.length === 0 && hiddenCount === 0 ? (
            <span>Time tracked to this job will show here.</span>
          ) : (
            <span>
              {visibleEntries.length} {visibleEntries.length === 1 ? 'entry' : 'entries'}
              {hiddenCount > 0 && (
                <span className="text-emerald-600"> · {hiddenCount} {hiddenCount === 1 ? 'session' : 'sessions'} live above</span>
              )}
              {' · '}
              <span className="font-medium text-foreground">{formatDuration(totals.totalWorkingMinutes)}</span> work ·{' '}
              <span className="font-medium text-foreground">{formatDuration(totals.totalTravelMinutes)}</span> travel
            </span>
          )}
        </div>
        {canAdd && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            onClick={() => (onAddTimeEntry ? onAddTimeEntry() : setDialogOpen(true))}
          >
            <Plus className="size-3.5 mr-1" /> Add Time Entry
          </Button>
        )}
      </div>

      {!loading && visibleEntries.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {visibleEntries.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="size-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium shrink-0">
                {e.employeeName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{e.employeeName || 'Unknown'}</p>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {e.entryType}
                  </Badge>
                  {e.status === 'active' && (
                    <Badge variant="outline" className="text-[10px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Play className="size-2.5 mr-0.5" /> live
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(e.startedAt)}
                  {e.endedAt ? <> → {formatDateTime(e.endedAt)}</> : ' → in progress'}
                </p>
                {e.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{e.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{formatDuration(e.durationMinutes)}</p>
                <p className="text-[10px] text-muted-foreground">duration</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTimeEntryDialog
        jobId={jobId}
        employees={employees}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchEntries}
      />
    </>
  );
}

// ── AddTimeEntryDialog ─────────────────────────────────────────────────────

function AddTimeEntryDialog({
  jobId,
  employees,
  open,
  onOpenChange,
  onSaved,
}: {
  jobId: string;
  employees: EmployeeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [entryType, setEntryType] = useState('work');
  const [notes, setNotes] = useState('');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setEmployeeId(employees[0]?.id || '');
      setStartedAt('');
      setEndedAt('');
      setEntryType('work');
      setNotes('');
    }
  }, [open, employees]);

  const handleSave = async () => {
    if (!employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!startedAt || !endedAt) {
      toast.error('Start and end date/time are required');
      return;
    }
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    if (end <= start) {
      toast.error('End time must be after start time');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`/api/jobs/${jobId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
          entryType,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add time entry');
      toast.success('Time entry added');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add time entry');
    } finally {
      setSaving(false);
    }
  };

  // Helper to convert datetime-local to ISO string for input value
  const toDateTimeLocal = (d: Date): string => {
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>
            Manually log time worked on this job. Employees can also track time live from their mobile app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Entry type</Label>
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="break">Break</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              rows={2}
              placeholder="What was done during this time?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            Add Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
