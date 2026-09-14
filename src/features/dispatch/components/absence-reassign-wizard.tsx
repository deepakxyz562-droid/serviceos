'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

export interface AffectedJob {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  address: string | null;
  priority?: string | null;
}

export interface CandidateTech {
  id: string;
  name: string;
  role: string;
  isClockedIn?: boolean;
  status?: string;
  activeJobCount?: number;
}

export interface AbsenceReassignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absentEmployee: { id: string; name: string; affectedJobs?: AffectedJob[] } | null;
  onSuccess?: () => void;
}

export function AbsenceReassignWizard({
  open,
  onOpenChange,
  absentEmployee,
  onSuccess,
}: AbsenceReassignWizardProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<AffectedJob[]>([]);
  const [availableTechs, setAvailableTechs] = useState<CandidateTech[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Fetch available roster and absent employee's jobs
  const fetchRosterAndJobs = useCallback(async () => {
    if (!absentEmployee?.id) return;
    setLoading(true);
    try {
      // 1. Fetch live attendance / roster
      const attRes = await authFetch('/api/dispatch/attendance');
      if (attRes.ok) {
        const attData = await attRes.json();
        const activeList: CandidateTech[] = (attData.roster || [])
          .filter((t: any) => t.id !== absentEmployee.id && !t.isOnLeave)
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            role: t.role,
            isClockedIn: t.isClockedIn,
            status: t.status,
            activeJobCount: t.todayJobCount || 0,
          }));
        setAvailableTechs(activeList);
      }

      // 2. Resolve today's jobs for the absent employee
      if (absentEmployee.affectedJobs && absentEmployee.affectedJobs.length > 0) {
        setJobs(absentEmployee.affectedJobs);
      } else {
        const empRes = await authFetch(`/api/employees/${absentEmployee.id}/jobs`);
        if (empRes.ok) {
          const empData = await empRes.json();
          const todayStr = new Date().toISOString().slice(0, 10);
          const todays = (empData.jobs || empData || []).filter((j: any) => {
            if (!j.scheduledAt) return true;
            return new Date(j.scheduledAt).toISOString().slice(0, 10) === todayStr;
          });
          setJobs(todays);
        }
      }
    } catch (err) {
      console.error('[AbsenceWizard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [absentEmployee]);

  useEffect(() => {
    if (open && absentEmployee) {
      fetchRosterAndJobs();
    } else {
      setAssignments({});
      setJobs([]);
    }
  }, [open, absentEmployee, fetchRosterAndJobs]);

  const handleSelectTech = (jobId: string, techId: string) => {
    setAssignments((prev) => ({ ...prev, [jobId]: techId }));
  };

  const handleSmartAutoAssign = async () => {
    if (!absentEmployee?.id) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/dispatch/reassign-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          absentEmployeeId: absentEmployee.id,
          autoMatch: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-reassign failed');

      toast.success(data.message || 'Jobs successfully rebalanced!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to auto-reassign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyCustom = async () => {
    if (!absentEmployee?.id) return;
    const reassignList = Object.entries(assignments)
      .filter(([_, targetId]) => !!targetId)
      .map(([jobId, targetEmployeeId]) => ({
        jobId,
        targetEmployeeId,
        reason: 'Technician sick call-out rebalance',
      }));

    if (reassignList.length === 0) {
      toast.error('Please assign at least one job or use Smart Auto-Reassign.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/dispatch/reassign-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          absentEmployeeId: absentEmployee.id,
          reassignments: reassignList,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reassignment failed');

      toast.success(data.message || 'Jobs reassigned successfully!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reassignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Unscheduled';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Rebalance Jobs — {absentEmployee?.name || 'Absent Technician'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Technician is on sick leave / absent. Reassign today&apos;s affected jobs to active technicians.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin mb-2" />
            <p className="text-sm">Loading affected jobs and active roster...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No Scheduled Jobs Found</p>
            <p className="text-xs mt-1">
              {absentEmployee?.name} has no remaining scheduled jobs for today.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {jobs.length} Job{jobs.length === 1 ? '' : 's'} to Reassign
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSmartAutoAssign}
                disabled={submitting}
                className="text-xs gap-1.5 border-primary-300 text-primary-700 hover:bg-primary-50"
              >
                <Sparkles className="size-3.5 text-primary" />
                1-Click Smart Match
              </Button>
            </div>

            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">
                        {job.title}
                      </span>
                      {job.priority ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {job.priority}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTime(job.scheduledAt)}
                      </span>
                      {job.address ? (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="size-3" />
                          {job.address}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-full sm:w-[220px]">
                    <Select
                      value={assignments[job.id] || ''}
                      onValueChange={(val) => handleSelectTech(job.id, val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Assign replacement..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTechs.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`size-1.5 rounded-full ${
                                  t.isClockedIn ? 'bg-emerald-500' : 'bg-amber-400'
                                }`}
                              />
                              <span>{t.name}</span>
                              <span className="text-muted-foreground text-[10px]">
                                ({t.activeJobCount} active)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {jobs.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyCustom}
                disabled={submitting || Object.keys(assignments).length === 0}
                className="gap-1.5"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                Apply Reassignments
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
