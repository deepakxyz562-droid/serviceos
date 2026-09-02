'use client';

/**
 * AutoAssignModal — Safe Smart Dispatch Review & Confirmation Dialog
 * -------------------------------------------------------------------
 * Previews proposed assignments and flags unmatched exception jobs
 * before committing changes to the database.
 */

import { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Users,
  Briefcase,
} from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiUrl } from '@/lib/api';
import { toast } from 'sonner';
import { formatTime, haversineKm, etaMinutes, hasGps } from '../utils/dispatch-helpers';
import type { Job, Employee } from '../types';

export interface ProposedAssignment {
  job: Job;
  matchedEmployee: Employee | null;
  matchScore: number;
  reasons: string[];
  distanceKm: number | null;
  status: 'recommended' | 'warning' | 'no_match';
}

export interface AutoAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedJobs: Job[];
  employees: Employee[];
  activeJobsByEmployee: Map<string, Job[]>;
  onAssignmentsCompleted: () => void;
}

export function AutoAssignModal({
  open,
  onOpenChange,
  unassignedJobs,
  employees,
  activeJobsByEmployee,
  onAssignmentsCompleted,
}: AutoAssignModalProps) {
  const [proposals, setProposals] = useState<ProposedAssignment[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Compute smart assignments preview whenever modal opens
  useEffect(() => {
    if (!open || unassignedJobs.length === 0) {
      setProposals([]);
      return;
    }

    let active = true;
    const generateProposals = async () => {
      setAnalyzing(true);
      const results: ProposedAssignment[] = [];
      const assignedTechIds = new Set<string>();

      for (const job of unassignedJobs) {
        // Filter candidates who are available and not yet claimed in this batch
        const candidates = employees
          .filter((e) => e.status === 'available' && !assignedTechIds.has(e.id))
          .map((e) => {
            let dist: number | null = null;
            if (hasGps(e) && hasGps(job)) {
              dist = haversineKm(e.latitude!, e.longitude!, job.latitude!, job.longitude!);
            }
            const activeCount = activeJobsByEmployee.get(e.id)?.length ?? 0;
            const score = 50 + (dist ? Math.max(0, 30 - dist) : 10) - activeCount * 5;
            return { employee: e, dist, score };
          })
          .sort((a, b) => b.score - a.score);

        const best = candidates[0];
        if (best && best.score >= 40) {
          assignedTechIds.add(best.employee.id);
          results.push({
            job,
            matchedEmployee: best.employee,
            matchScore: Math.round(best.score),
            reasons: [
              'Available now',
              best.dist ? `~${Math.round(best.dist)}km away` : 'Within area',
            ],
            distanceKm: best.dist,
            status: best.dist && best.dist > 35 ? 'warning' : 'recommended',
          });
        } else {
          results.push({
            job,
            matchedEmployee: null,
            matchScore: 0,
            reasons: ['No available technicians with capacity'],
            distanceKm: null,
            status: 'no_match',
          });
        }
      }

      if (active) {
        setProposals(results);
        setAnalyzing(false);
      }
    };

    generateProposals();
    return () => {
      active = false;
    };
  }, [open, unassignedJobs, employees, activeJobsByEmployee]);

  const recommendedCount = proposals.filter((p) => p.matchedEmployee !== null).length;
  const noMatchCount = proposals.length - recommendedCount;

  // Commit valid assignments
  const handleConfirm = async () => {
    const valid = proposals.filter((p) => p.matchedEmployee !== null);
    if (valid.length === 0) {
      toast.info('No assignments to apply');
      onOpenChange(false);
      return;
    }

    setCommitting(true);
    let successCount = 0;

    try {
      for (const item of valid) {
        const emp = item.matchedEmployee!;
        const res = await fetch(apiUrl(`/api/jobs/${item.job.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.job.id,
            assigneeId: emp.id,
            assigneeName: emp.name,
            assigneePhone: emp.phone,
            status: 'assigned',
          }),
        });
        if (res.ok) successCount++;
      }

      toast.success(`Successfully assigned ${successCount} job${successCount > 1 ? 's' : ''}`);
      onOpenChange(false);
      onAssignmentsCompleted();
    } catch {
      toast.error('Encountered an issue applying assignments');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-border bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="size-4 text-teal-600" />
            Auto-Assign Preview
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Review proposed technician assignments before applying. Unmatched jobs will remain in queue.
          </DialogDescription>

          {/* Metric Summary Strip */}
          <div className="flex items-center gap-3 pt-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              <span>{recommendedCount} Recommended</span>
            </div>
            {noMatchCount > 0 && (
              <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-3.5" />
                <span>{noMatchCount} Manual Review</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[380px] p-5">
          {analyzing ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-teal-600" />
              <span className="text-xs font-medium">Analyzing availability and distance…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map((item, idx) => (
                <div
                  key={item.job.id || idx}
                  className={`p-3 rounded-xl border text-xs space-y-2 ${
                    item.matchedEmployee
                      ? 'border-border bg-card'
                      : 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        {item.job.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {item.job.customerName || 'No customer'} · {item.job.address || 'No address'}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] h-4.5 px-1.5 shrink-0 ${
                        item.matchedEmployee
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {item.matchedEmployee ? 'Ready' : 'Needs Tech'}
                    </Badge>
                  </div>

                  {/* Proposed match pill */}
                  {item.matchedEmployee ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-teal-50/60 border border-teal-200/70 dark:bg-teal-950/30 dark:border-teal-800 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="size-3 text-teal-600 shrink-0" />
                        <span className="font-semibold text-teal-900 dark:text-teal-200">
                          {item.matchedEmployee.name}
                        </span>
                        {item.distanceKm && (
                          <span className="text-muted-foreground text-[10px]">
                            ({Math.round(item.distanceKm)}km away)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                        {item.matchScore}% match
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 shrink-0" />
                      <span>No available technician in service area</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border bg-muted/10 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={committing}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            onClick={handleConfirm}
            disabled={committing || recommendedCount === 0}
          >
            {committing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Assigning…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" /> Confirm {recommendedCount} Assignment{recommendedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
