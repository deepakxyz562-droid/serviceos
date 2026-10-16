'use client';

/**
 * QuickDispatchTray — Jobber & Housecall Pro Style Expandable Dispatch Dock
 * --------------------------------------------------------------------------
 * Floating bottom tray on the live dispatch map that allows dispatchers to view
 * unassigned jobs, inspect real-time proximity to nearest active technicians,
 * locate job pins on the map, and perform 1-click assignments.
 */

import { useState, useMemo } from 'react';
import {
  Briefcase,
  ChevronUp,
  ChevronDown,
  MapPin,
  Clock,
  User,
  Sparkles,
  Zap,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { haversineKm, etaMinutes, formatTime, getPriorityColor } from '../utils/dispatch-helpers';
import type { Job, Employee } from '../types';

export interface QuickDispatchTrayProps {
  unassignedJobs: Job[];
  employees: Employee[];
  activeJobsByEmployee: Map<string, Job[]>;
  onAssignJob: (job: Job) => void;
  onQuickAssign?: (job: Job, employee: Employee) => void;
  onLocateJob?: (job: Job) => void;
  onSelectJob?: (job: Job) => void;
}

export function QuickDispatchTray({
  unassignedJobs,
  employees,
  activeJobsByEmployee,
  onAssignJob,
  onQuickAssign,
  onLocateJob,
  onSelectJob,
}: QuickDispatchTrayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // For each unassigned job, calculate the nearest active technician
  const jobsWithNearestTech = useMemo(() => {
    // Filter active technicians with GPS
    const activeTechsWithGps = employees.filter(
      (e) =>
        typeof e.latitude === 'number' &&
        typeof e.longitude === 'number' &&
        e.status !== 'offline' &&
        e.status !== 'leave'
    );

    return unassignedJobs.map((job) => {
      let nearestTech: Employee | null = null;
      let minDistanceKm = Infinity;

      if (typeof job.latitude === 'number' && typeof job.longitude === 'number') {
        for (const tech of activeTechsWithGps) {
          const dist = haversineKm(
            tech.latitude as number,
            tech.longitude as number,
            job.latitude,
            job.longitude
          );
          if (dist < minDistanceKm) {
            minDistanceKm = dist;
            nearestTech = tech;
          }
        }
      }

      return {
        job,
        nearestTech,
        distanceKm: minDistanceKm !== Infinity ? minDistanceKm : null,
        etaMins: minDistanceKm !== Infinity ? etaMinutes(minDistanceKm) : null,
      };
    });
  }, [unassignedJobs, employees]);

  if (unassignedJobs.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto pointer-events-auto transition-all duration-300">
      {/* ── Collapsed Dock Trigger Bar ─────────────────────────── */}
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl hover:border-teal-500/50 hover:shadow-teal-500/10 transition-all text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0">
              {unassignedJobs.length}
            </span>
            <div className="min-w-0">
              <span className="font-semibold text-xs text-foreground group-hover:text-teal-600 transition-colors">
                Quick Dispatch Queue
              </span>
              <span className="hidden sm:inline text-[11px] text-muted-foreground ml-2">
                · {unassignedJobs.length} job{unassignedJobs.length !== 1 ? 's' : ''} awaiting assignment
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="secondary"
              className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 font-medium hidden sm:inline-flex items-center gap-1"
            >
              <Zap className="size-3 text-teal-600" /> Smart Proximity
            </Badge>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 group-hover:text-foreground">
              Expand <ChevronUp className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
            </span>
          </div>
        </button>
      ) : (
        /* ── Expanded Dispatch Tray ────────────────────────────── */
        <div className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="p-3 px-4 flex items-center justify-between border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-teal-600" />
              <h3 className="font-bold text-xs text-foreground">
                Quick Dispatch Tray ({unassignedJobs.length})
              </h3>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                · Proximity-ranked candidates
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <span>Collapse</span>
              <ChevronDown className="size-3.5" />
            </Button>
          </div>

          {/* Horizontal Scrolling Job Cards Track */}
          <div className="p-3 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
            {jobsWithNearestTech.map(({ job, nearestTech, distanceKm, etaMins }) => {
              const isUrgent = (job.priority || '').toLowerCase() === 'urgent';

              return (
                <div
                  key={job.id}
                  className={cn(
                    'w-[270px] shrink-0 p-3 bg-background rounded-xl border transition-all hover:shadow-md flex flex-col justify-between gap-2.5',
                    isUrgent
                      ? 'border-red-300 dark:border-red-900/60 bg-red-50/10'
                      : 'border-border hover:border-teal-300 dark:hover:border-teal-700'
                  )}
                >
                  {/* Top: Priority & Title */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <h4
                        className="font-bold text-xs text-foreground truncate flex-1 min-w-0"
                        title={job.title}
                      >
                        {job.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] px-1.5 h-4 font-semibold shrink-0', getPriorityColor(job.priority))}
                      >
                        {job.priority}
                      </Badge>
                    </div>

                    {job.customerName && (
                      <p className="text-[11px] text-muted-foreground truncate mb-0.5">
                        {job.customerName}
                      </p>
                    )}
                    {job.address && (
                      <p className="text-[10px] text-muted-foreground/80 truncate flex items-center gap-1">
                        <MapPin className="size-2.5 shrink-0 text-muted-foreground" />
                        {job.address}
                      </p>
                    )}
                  </div>

                  {/* Nearest Technician Snippet */}
                  {nearestTech ? (
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/40 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                          <Sparkles className="size-2.5 text-teal-600" /> Nearest Pro
                        </span>
                        {distanceKm != null && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {distanceKm.toFixed(1)} km · ~{etaMins}m
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between font-medium text-foreground">
                        <span className="truncate">{nearestTech.name}</span>
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.2 rounded-full font-semibold',
                            nearestTech.status === 'available'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          )}
                        >
                          {nearestTech.status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-muted/30 text-[10px] text-muted-foreground text-center">
                      No GPS telemetry available for active team
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                    {onLocateJob && typeof job.latitude === 'number' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLocateJob(job)}
                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        title="Locate on map"
                      >
                        <MapPin className="size-3 text-teal-600" />
                      </Button>
                    )}

                    {nearestTech && onQuickAssign ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onQuickAssign(job, nearestTech)}
                        className="flex-1 h-7 text-[11px] font-medium bg-teal-600 hover:bg-teal-700 text-white gap-1"
                      >
                        <UserCheck className="size-3" />
                        <span>Assign to {nearestTech.name.split(' ')[0]}</span>
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onAssignJob(job)}
                        className="flex-1 h-7 text-[11px] font-medium bg-teal-600 hover:bg-teal-700 text-white gap-1"
                      >
                        <UserCheck className="size-3" />
                        <span>Assign Job</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
