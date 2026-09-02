'use client';

/**
 * InspectorPanel — Phase 6E extraction from dispatch-view.tsx.
 *
 * Bundles the two inline render closures that lived inside DispatchView:
 *
 *   - <InspectorTechnician /> — replaces `renderInspectorTechnician()`.
 *     Shows technician avatar + status badge, GPS tracking card (live/stale/
 *     offline + ETA + Recenter button), current job card (or "no active job"),
 *     skills chips, and Call/WhatsApp/Follow-on-map action buttons.
 *
 *   - <InspectorJob /> — replaces `renderInspectorJob()`. Shows job header
 *     (priority + status + late badge), customer + schedule + address card,
 *     assignee card (or "Unassigned" with Smart-Match suggestions list).
 *
 * Both are pure presentational — all state and mutations live in the parent
 * DispatchView and are threaded through as props. Smart-Match candidates are
 * fetched by the parent (fetch-on-select) and passed in.
 *
 * Extracted from src/components/views/dispatch-view.tsx (Phase 6E refactor).
 */

import {
  MapPin, Clock, User, MessageCircle, Play,
  Loader2, ArrowRight, Sparkles, Star,
  Briefcase,
  Phone, Navigation, AlertTriangle, Gauge, Locate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  getPriorityColor, getStatusColor,
  getEmployeeStatusDot, getEmployeeStatusBg,
  formatTime, formatDate, timeAgo, parseSkills, getServiceTypeIcon,
  haversineKm, etaMinutes,
  hasGps, isStaleGps, isOfflineEmp, gpsTimestamp,
  ARRIVAL_M,
} from '@/features/dispatch/utils/dispatch-helpers';
import type {
  Employee, Job, CandidateScore,
} from '@/features/dispatch/types';

// ─── InspectorTechnician ────────────────────────────────────────────────────

export interface InspectorTechnicianProps {
  employee: Employee;
  /** The employee's currently-active jobs (first one is "current"). */
  activeJobs: Job[];
  /** Recenter map on this technician + their destination. */
  onRecenterOnTech: (techId: string) => void;
  /** Switch the inspector to show this job. */
  onViewJob: (job: Job) => void;
  /** Deselect this technician (re-render roster highlight). */
  onDeselect: () => void;
  /** Refresh map markers (used by Follow-on-map). */
  onRefreshMarkers: () => void;
}

export function InspectorTechnician({
  employee,
  activeJobs,
  onRecenterOnTech,
  onViewJob,
  onDeselect,
  onRefreshMarkers,
}: InspectorTechnicianProps) {
  const e = employee;
  const currentJob = activeJobs[0];
  const skills = parseSkills(e.skills);
  const gps = hasGps(e);

  // Contact: production data has proven phone can be null | undefined | ""
  // despite the `phone: string` type declaration. Guard every .replace()
  // call and disable the Call/WhatsApp buttons when no usable number exists.
  const rawPhone = e.phone;
  const hasPhone = typeof rawPhone === 'string' && rawPhone.trim().length > 0;
  const phoneDigits = hasPhone ? rawPhone.replace(/[^+\d]/g, '') : '';

  // ETA to current job
  let etaMin: number | null = null;
  let distKm: number | null = null;
  let arrived = false;
  if (currentJob && gps && hasGps(currentJob)) {
    distKm = haversineKm(e.latitude!, e.longitude!, currentJob.latitude!, currentJob.longitude!);
    etaMin = etaMinutes(distKm);
    arrived = distKm * 1000 < ARRIVAL_M;
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <Avatar className="size-12">
                <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-medium">
                  {e.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background ${getEmployeeStatusDot(e.status)}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{e.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="outline" className={`text-[9px] h-4 ${getEmployeeStatusBg(e.status)}`}>
                  {(e.status || 'offline').replace('_', ' ')}
                </Badge>
                {e.team && (
                  <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: e.team.color, color: e.team.color }}>
                    {e.team.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-0.5">
                  <Star className="size-2.5 text-amber-400 fill-amber-400" />{e.rating.toFixed(1)}
                </span>
                <span>·</span>
                <span>{e.completedJobs} done</span>
              </div>
            </div>
          </div>

          {/* GPS / tracking card */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">GPS Tracking</span>
              {gps ? (
                isOfflineEmp(e) ? (
                  <Badge variant="outline" className="text-[9px] h-4 bg-red-50 text-red-700 border-red-200">Offline</Badge>
                ) : isStaleGps(e) ? (
                  <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-700 border-amber-200">Stale</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200">Live</Badge>
                )
              ) : (
                <Badge variant="outline" className="text-[9px] h-4 bg-gray-50 text-gray-600 border-gray-200">No GPS</Badge>
              )}
            </div>
            {gps ? (
              <>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Last:</span>
                  <span className="font-medium">{timeAgo(gpsTimestamp(e))}</span>
                </div>
                {distKm !== null && (
                  <div className="flex items-center gap-1">
                    <Navigation className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Dist:</span>
                    <span className="font-medium">{distKm.toFixed(1)} km</span>
                  </div>
                )}
                {etaMin !== null && Number.isFinite(etaMin) && (
                  <div className="flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">ETA:</span>
                    <span className="font-medium">{arrived ? 'arrived' : `${etaMin} min`}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Gauge className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Coords:</span>
                  <span className="font-mono text-[9px]">{e.latitude!.toFixed(3)}, {e.longitude!.toFixed(3)}</span>
                </div>
              </div>
              {isOfflineEmp(e) ? (
                <p className="text-[10px] text-red-600 dark:text-red-400 italic">
                  Showing last known location. GPS is offline.
                </p>
              ) : isStaleGps(e) ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                  Trying to reconnect…
                </p>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[10px]"
                onClick={() => onRecenterOnTech(e.id)}
              >
                <Locate className="size-3 mr-1" />
                Recenter on {e.name.split(' ')[0]}
              </Button>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                This technician hasn&apos;t sent GPS coordinates yet. Location permission may be needed in the mobile app.
              </p>
            )}
          </div>

          {/* Current job */}
          {currentJob ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-1.5 dark:bg-amber-950/10">
              <div className="flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-amber-600" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Current Job</span>
                {arrived && (
                  <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto">
                    Arrived
                  </Badge>
                )}
              </div>
              <p className="font-medium text-sm">{currentJob.title}</p>
              {currentJob.customerName && (
                <p className="text-[11px] text-muted-foreground">{currentJob.customerName}</p>
              )}
              {currentJob.address && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3" /> {currentJob.address}
                </p>
              )}
              <Button
                size="sm" variant="outline" className="w-full h-7 text-[11px] mt-1"
                onClick={() => onViewJob(currentJob)}
              >
                View job details <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">No active job assigned</p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1">
                {skills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] h-4">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contact actions — when phone is absent we render a plain
              <button disabled> (valid HTML, natively non-clickable). We do
              NOT use asChild + disabled because <a disabled> is invalid HTML
              and does not prevent navigation. */}
          <div className="grid grid-cols-2 gap-2">
            {hasPhone ? (
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <a href={`tel:${phoneDigits}`}>
                  <Phone className="size-3.5 mr-1" /> Call
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled title="No phone number on file">
                <Phone className="size-3.5 mr-1" /> Call
              </Button>
            )}
            {hasPhone ? (
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <a href={`https://wa.me/${phoneDigits.replace(/^\+/, '')}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-3.5 mr-1" /> WhatsApp
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled title="No phone number on file">
                <MessageCircle className="size-3.5 mr-1" /> WhatsApp
              </Button>
            )}
          </div>

          <Button
            size="sm" variant="ghost" className="w-full h-8 text-xs"
            onClick={() => { onDeselect(); onRefreshMarkers(); }}
          >
            <Navigation className="size-3.5 mr-1" /> Follow on map
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── InspectorJob ───────────────────────────────────────────────────────────

export interface InspectorJobProps {
  job: Job;
  employees: Employee[];
  candidates: CandidateScore[];
  smartMatchLoading: boolean;
  assignLoading: boolean;
  onStartJob: (job: Job) => void;
  onAssign: (jobId: string, employeeId: string) => void;
}

export function InspectorJob({
  job,
  employees,
  candidates,
  smartMatchLoading,
  assignLoading,
  onStartJob,
  onAssign,
}: InspectorJobProps) {
  // Reuse isLateJob via import (kept inline to avoid an extra call).
  const late = (() => {
    if (!job.scheduledAt) return false;
    if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'in_progress') return false;
    return new Date(job.scheduledAt).getTime() < Date.now();
  })();

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getServiceTypeIcon(job.type)}</span>
              <h3 className="font-semibold text-sm flex-1 min-w-0">{job.title}</h3>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className={`text-[9px] h-4 ${getPriorityColor(job.priority)}`}>{job.priority}</Badge>
              <Badge variant="outline" className={`text-[9px] h-4 ${getStatusColor(job.status)}`}>{(job.status || 'pending').replace('_', ' ')}</Badge>
              {late && (
                <Badge variant="outline" className="text-[9px] h-4 bg-red-100 text-red-700 border-red-200 animate-pulse">
                  <AlertTriangle className="size-2.5 mr-0.5" /> late
                </Badge>
              )}
            </div>
          </div>

          {/* Customer + schedule */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-[11px]">
            {job.customerName && (
              <div className="flex items-center gap-1.5">
                <User className="size-3 text-muted-foreground" />
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{job.customerName}</span>
              </div>
            )}
            {job.customerPhone && (
              <div className="flex items-center gap-1.5">
                <Phone className="size-3 text-muted-foreground" />
                <span className="font-medium">{job.customerPhone}</span>
              </div>
            )}
            {job.address && (
              <div className="flex items-start gap-1.5">
                <MapPin className="size-3 text-muted-foreground mt-0.5" />
                <span>{job.address}</span>
              </div>
            )}
            {job.scheduledAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-muted-foreground" />
                <span>{formatDate(job.scheduledAt)} {formatTime(job.scheduledAt)}</span>
              </div>
            )}
          </div>

          {/* Assignee */}
          {job.assigneeName ? (
            <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 dark:bg-teal-950/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700 mb-1">Assigned to</p>
              <div className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-[10px]">
                    {job.assigneeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{job.assigneeName}</span>
              </div>
              {job.status === 'assigned' && (
                <Button
                  size="sm" className="w-full h-7 text-[11px] mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onStartJob(job)}
                >
                  <Play className="size-3 mr-1" /> Start job
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:bg-amber-950/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">Unassigned</p>
              <p className="text-[11px] text-muted-foreground">Suggested technicians below (Smart Match).</p>
            </div>
          )}

          {/* Smart Match suggestions */}
          {!job.assigneeId && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="size-3" /> Suggested technicians
              </p>
              {smartMatchLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : candidates.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-3">No matches found</p>
              ) : (
                <div className="space-y-1.5">
                  {candidates.slice(0, 5).map((c) => {
                    const emp = employees.find((x) => x.id === c.employeeId);
                    const offline = emp ? isOfflineEmp(emp) : false;
                    return (
                      <div
                        key={c.employeeId}
                        className="rounded-lg border bg-card p-2.5 flex items-center gap-2 hover:border-teal-300 transition-colors"
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-teal-100 text-teal-700 text-[10px]">
                            {c.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium truncate">{c.employeeName}</span>
                            {c.breakdown.distanceKm !== null && (
                              <span className="text-[9px] text-muted-foreground">{c.breakdown.distanceKm.toFixed(1)} km</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                            <Star className="size-2.5 text-amber-400 fill-amber-400" />
                            <span>{c.breakdown.total.toFixed(0)}% match</span>
                            {c.breakdown.activeJobCount > 0 && <span>· {c.breakdown.activeJobCount} active</span>}
                          </div>
                        </div>
                        {offline ? (
                          <Badge variant="outline" className="text-[9px] h-4 bg-gray-50 text-gray-500 border-gray-200">offline</Badge>
                        ) : (
                          <Button
                            size="sm" className="h-6 text-[10px] bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={assignLoading}
                            onClick={() => onAssign(job.id, c.employeeId)}
                          >
                            Assign
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── InspectorPanel (parent switcher) ──────────────────────────────────────

export interface InspectorPanelProps {
  mode: 'technician' | 'job' | null;
  selectedTechnician: Employee | null;
  selectedJob: Job | null;
  employees: Employee[];
  activeJobsByEmployee: Map<string, Job[]>;
  candidates: CandidateScore[];
  smartMatchLoading: boolean;
  assignLoading: boolean;
  onRecenterOnTech: (techId: string) => void;
  onViewJob: (job: Job) => void;
  onDeselectTechnician: () => void;
  onRefreshMarkers: () => void;
  onStartJob: (job: Job) => void;
  onAssign: (jobId: string, employeeId: string) => void;
}

/**
 * Convenience wrapper that switches between technician and job inspectors
 * based on `mode`. Either `selectedTechnician` (mode='technician') or
 * `selectedJob` (mode='job') must be non-null.
 */
export function InspectorPanel({
  mode,
  selectedTechnician,
  selectedJob,
  employees,
  activeJobsByEmployee,
  candidates,
  smartMatchLoading,
  assignLoading,
  onRecenterOnTech,
  onViewJob,
  onDeselectTechnician,
  onRefreshMarkers,
  onStartJob,
  onAssign,
}: InspectorPanelProps) {
  if (mode === 'technician' && selectedTechnician) {
    return (
      <InspectorTechnician
        employee={selectedTechnician}
        activeJobs={activeJobsByEmployee.get(selectedTechnician.id) ?? []}
        onRecenterOnTech={onRecenterOnTech}
        onViewJob={onViewJob}
        onDeselect={onDeselectTechnician}
        onRefreshMarkers={onRefreshMarkers}
      />
    );
  }
  if (mode === 'job' && selectedJob) {
    return (
      <InspectorJob
        job={selectedJob}
        employees={employees}
        candidates={candidates}
        smartMatchLoading={smartMatchLoading}
        assignLoading={assignLoading}
        onStartJob={onStartJob}
        onAssign={onAssign}
      />
    );
  }
  return null;
}
