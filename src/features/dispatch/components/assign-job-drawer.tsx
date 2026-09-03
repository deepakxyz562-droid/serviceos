'use client';

/**
 * AssignJobDrawer — Interactive Slide-over Assignment Drawer
 * -----------------------------------------------------------
 * Allows dispatchers to assign a job to the best-matched technician.
 * Displays ranked candidates with distance, skills match, and availability.
 */

import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Loader2,
  Navigation,
  Briefcase,
  Star,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { toast } from 'sonner';
import { formatTime, haversineKm, etaMinutes, hasGps } from '../utils/dispatch-helpers';
import { getGpsStatusInfo } from '../utils/gps-status';
import type { Job, Employee, CandidateScore } from '../types';

export interface AssignJobDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  employees: Employee[];
  activeJobsByEmployee: Map<string, Job[]>;
  onAssigned: () => void;
}

export function AssignJobDrawer({
  open,
  onOpenChange,
  job,
  employees,
  activeJobsByEmployee,
  onAssigned,
}: AssignJobDrawerProps) {
  const [candidates, setCandidates] = useState<CandidateScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Fetch smart match rankings when drawer opens for a job
  useEffect(() => {
    if (!open || !job) {
      setCandidates([]);
      return;
    }

    let active = true;
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl('/api/dispatch/smart'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: job.id, autoAssign: false }),
        });
        if (res.ok && active) {
          const data = await res.json();
          if (data.candidates && Array.isArray(data.candidates)) {
            setCandidates(data.candidates);
          }
        }
      } catch (err) {
        console.error('Failed to fetch smart candidates:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCandidates();
    return () => {
      active = false;
    };
  }, [open, job]);

  // Execute assignment
  const handleAssign = async (employeeId: string) => {
    if (!job) return;
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    setAssigningId(employeeId);
    try {
      const res = await fetch(apiUrl(`/api/jobs/${job.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          assigneeId: employee.id,
          assigneeName: employee.name,
          assigneePhone: employee.phone,
          status: 'assigned',
        }),
      });

      if (res.ok) {
        toast.success(`Assigned Job #${job.jobNumber || ''} to ${employee.name}`);
        onOpenChange(false);
        onAssigned();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to assign technician');
      }
    } catch {
      toast.error('Network error during assignment');
    } finally {
      setAssigningId(null);
    }
  };

  if (!job) return null;

  // Build candidate list with fallback if smart API candidates are empty
  const candidateList =
    candidates.length > 0
      ? candidates
      : employees.map((e) => {
          let dist: number | null = null;
          if (hasGps(e) && hasGps(job)) {
            dist = haversineKm(e.latitude!, e.longitude!, job.latitude!, job.longitude!);
          }
          const isAvail = e.status === 'available';
          return {
            employeeId: e.id,
            employeeName: e.name,
            employeePhone: e.phone,
            employeeRole: e.role,
            employeeStatus: e.status,
            score: isAvail ? 80 : 40,
            breakdown: {
              total: isAvail ? 80 : 40,
              skillScore: 30,
              proximityScore: dist ? Math.max(0, 30 - Math.round(dist)) : 10,
              workloadScore: (activeJobsByEmployee.get(e.id)?.length ?? 0) === 0 ? 15 : 5,
              ratingScore: 10,
              reasons: [isAvail ? 'Available now' : `Status: ${e.status}`],
              matchedSkills: [],
              distanceKm: dist,
              activeJobCount: activeJobsByEmployee.get(e.id)?.length ?? 0,
            },
            conflict: null,
          } as CandidateScore;
        });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-background">
        <SheetHeader className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="size-4 text-teal-600" />
                Assign Job
                {job.jobNumber && (
                  <span className="text-xs font-mono font-normal text-muted-foreground">
                    #{job.jobNumber}
                  </span>
                )}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Select the most suitable technician for this assignment
              </SheetDescription>
            </div>
          </div>

          {/* Job summary pill */}
          <div className="mt-3 p-2.5 rounded-lg border bg-card text-xs space-y-1">
            <div className="font-semibold text-foreground">{job.title}</div>
            {job.customerName && (
              <div className="text-muted-foreground">Customer: {job.customerName}</div>
            )}
            {job.address && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{job.address}</span>
              </div>
            )}
            {job.scheduledAt && (
              <div className="flex items-center gap-1 text-teal-700 dark:text-teal-300 font-medium">
                <Clock className="size-3 shrink-0" />
                <span>Today · {formatTime(job.scheduledAt)}</span>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Technician Candidate List */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Technician Match Rankings</span>
              {loading && (
                <span className="flex items-center gap-1 text-teal-600 text-[11px]">
                  <Loader2 className="size-3 animate-spin" /> Scoring candidates…
                </span>
              )}
            </div>

            {candidateList.map((cand, index) => {
              const emp = employees.find((e) => e.id === cand.employeeId);
              if (!emp) return null;

              const isBestMatch = index === 0 && cand.score >= 60;
              const isAssigning = assigningId === emp.id;
              const gpsInfo = getGpsStatusInfo(emp);
              const activeCount = activeJobsByEmployee.get(emp.id)?.length ?? 0;
              const distKm = cand.breakdown?.distanceKm;
              const eta = distKm ? etaMinutes(distKm) : null;

              return (
                <div
                  key={emp.id}
                  className={cn(
                    'p-3 rounded-xl border transition-all space-y-2.5',
                    isBestMatch
                      ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/30 dark:border-teal-700'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-9 rounded-lg">
                        <AvatarFallback className="bg-muted text-xs font-bold">
                          {(emp.name || 'Tech')
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase() || 'T'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs truncate">{emp.name || 'Technician'}</span>
                          {isBestMatch && (
                            <Badge className="bg-teal-600 text-white text-[9px] h-4 px-1.5 gap-0.5">
                              <Sparkles className="size-2.5" /> Best Match
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          <span className={cn('font-medium', gpsInfo.color)}>
                            {gpsInfo.label}
                          </span>
                          <span>·</span>
                          <span>{activeCount} active job{activeCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Proximity / Score Badge */}
                    <div className="text-right shrink-0">
                      {typeof distKm === 'number' ? (
                        <div className="text-xs font-semibold text-foreground">
                          {Math.round(distKm)}km away
                          {eta !== null && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              ~{eta}m travel
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-muted-foreground">
                          {cand.score}% match
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reasons & Skills badges */}
                  {cand.breakdown?.reasons && cand.breakdown.reasons.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      {cand.breakdown.reasons.slice(0, 3).map((r, ri) => (
                        <span
                          key={ri}
                          className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Assign Button */}
                  <Button
                    size="sm"
                    className={cn(
                      'w-full h-7 text-xs font-medium',
                      isBestMatch
                        ? 'bg-teal-600 hover:bg-teal-700 text-white'
                        : 'bg-primary/90 hover:bg-primary text-primary-foreground'
                    )}
                    onClick={() => handleAssign(emp.id)}
                    disabled={assigningId !== null}
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="size-3 animate-spin mr-1.5" /> Assigning…
                      </>
                    ) : (
                      <>
                        <UserCheck className="size-3 mr-1.5" /> Assign {(emp.name || 'Tech').split(' ')[0]}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
