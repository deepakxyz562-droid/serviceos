'use client';

/**
 * ScheduledVisitsSection
 * ----------------------
 * Jobber-style "Scheduled visits" section for the Job Detail page.
 *
 * Shows:
 *   - Summary header with "Edit All Visits" button and "+" add button
 *   - Status filter dropdown (All / Scheduled / In progress / Completed / Cancelled)
 *   - Table: Date and time | Title and instructions | Status | Assigned | Actions
 *
 * Wires to:
 *   GET    /api/jobs/[id]/visits
 *   POST   /api/jobs/[id]/visits            (via VisitDialog)
 *   PATCH  /api/jobs/[id]/visits/[visitId]  (via VisitDialog)
 *   DELETE /api/jobs/[id]/visits/[visitId]  (via VisitDialog)
 */

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  CalendarDays, Plus, Pencil, Trash2, Clock, Users, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { VisitDialog, EditAllVisitsDialog, type JobVisitRow } from './visit-dialogs';

interface EmployeeOption { id: string; name: string; }
interface ChecklistOption { id: string; name: string; }
interface JobLite {
  id: string;
  title?: string | null;
  customerName?: string | null;
  jobNumber?: string | null;
}

function statusBadge(status: string) {
  switch (status) {
    case 'scheduled':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In progress</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatVisitDate(date: string | Date, anytime: boolean, time: string | null): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (anytime || !time) return `${dateStr} · Anytime`;
  return `${dateStr} · ${time}`;
}

function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

export function ScheduledVisitsSection({
  job,
  employees,
  checklists,
}: {
  job: JobLite;
  employees: EmployeeOption[];
  checklists: ChecklistOption[];
}) {
  const [visits, setVisits] = useState<JobVisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingVisit, setEditingVisit] = useState<JobVisitRow | null>(null);
  const [editAllOpen, setEditAllOpen] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/jobs/${job.id}/visits?status=${statusFilter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load visits');
      setVisits(data.visits || []);
    } catch (err) {
      console.error('fetchVisits error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [job.id, statusFilter]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const openCreate = () => {
    setDialogMode('create');
    setEditingVisit(null);
    setDialogOpen(true);
  };

  const openEdit = (visit: JobVisitRow) => {
    setDialogMode('edit');
    setEditingVisit(visit);
    setDialogOpen(true);
  };

  const handleDelete = async (visit: JobVisitRow) => {
    if (!confirm(`Delete visit #${visit.jobVisitNumber}? This cannot be undone.`)) return;
    try {
      const res = await authFetch(`/api/jobs/${job.id}/visits/${visit.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete visit');
      }
      toast.success('Visit deleted');
      fetchVisits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete visit');
    }
  };

  const filtered = visits.filter((v) => {
    if (statusFilter === 'all') return true;
    return v.status === statusFilter;
  });

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="size-4 text-emerald-600" />
          <span>Scheduled visits</span>
          {visits.length > 0 && (
            <span className="text-xs text-muted-foreground">({visits.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {visits.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={() => setEditAllOpen(true)}
            >
              Edit All Visits
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            onClick={openCreate}
          >
            <Plus className="size-3.5 mr-1" /> Add Visit
          </Button>
        </div>
      </div>

      {/* Status filter */}
      {visits.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground">Status</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table / Empty state */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="size-4 animate-spin" /> Loading visits…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
          <CalendarDays className="size-4" />
          <span>
            {visits.length === 0
              ? 'No visits have been scheduled for this job.'
              : 'No visits match the current filter.'}
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Date and time</TableHead>
                <TableHead>Title and instructions</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[140px]">Assigned</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((visit) => {
                const assigneeNames: string[] = (() => {
                  try {
                    const v = JSON.parse(visit.assigneeNamesJson || '[]');
                    return Array.isArray(v) ? v : [];
                  } catch {
                    return [];
                  }
                })();
                return (
                  <TableRow key={visit.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {formatVisitDate(visit.scheduledDate, visit.anytime, visit.scheduledTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Visit #{visit.jobVisitNumber}
                            {visit.endDate ? ' · multi-day' : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {visit.title || '(untitled)'}
                        </p>
                        {visit.instructions && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {visit.instructions}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {statusBadge(visit.status)}
                        {isToday(visit.scheduledDate) && visit.status === 'scheduled' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Today
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {assigneeNames.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate">
                            {assigneeNames.join(', ')}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(visit)}
                          title="Edit visit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(visit)}
                          title="Delete visit"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Single-visit edit/create dialog */}
      <VisitDialog
        jobId={job.id}
        job={job}
        mode={dialogMode}
        visit={editingVisit}
        employees={employees}
        checklists={checklists}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchVisits}
      />

      {/* Bulk edit dialog */}
      <EditAllVisitsDialog
        jobId={job.id}
        visits={visits}
        open={editAllOpen}
        onOpenChange={setEditAllOpen}
        onSaved={fetchVisits}
      />
    </>
  );
}
