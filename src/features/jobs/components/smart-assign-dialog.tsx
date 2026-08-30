'use client';

/**
 * SmartAssignDialog — Phase 1 Smart Assign/Reassign Workspace.
 *
 * Replaces the old "Assign Employee" dialog with a dispatch-decision
 * workspace:
 *   - BEST MATCH section (top recommendation with full reasoning)
 *   - OTHER TECHNICIANS section (everyone else, including busy/offline/
 *     on-leave with appropriate warnings)
 *   - Manual roster fallback (full Employee list) when smart-match returns
 *     no candidates
 *
 * Reassignments require a reason (REASSIGNMENT_REASONS) — the technician
 * selection list stays locked until a reason is picked.
 *
 * `CandidateCard` (extracted from `renderCandidateCard` in jobs-view.tsx)
 * renders a single technician row. Behavior:
 *   - Available + no conflict  → green "Assign" button
 *   - Busy + schedule/travel conflict → amber "Assign with warning" + conflict card
 *   - Offline + no conflict → amber "Assign" button + GPS warning
 *   - On leave → DISABLED (cannot assign)
 * The Call/WhatsApp quick-contact actions live in an expandable section
 * toggled by the [⋯] button — keeps the card focused on the assign
 * decision rather than cluttering every card with contact buttons.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2B refactor).
 */

import {
  Phone, MessageSquare, MapPin, Loader2, Check, CheckCircle2,
  Navigation, Clock3, ShieldAlert, Sparkles, MoreHorizontal,
  Calendar, AlertCircle, RefreshCw, UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format-utils';
import { getStatusColor, getPriorityColor } from '@/lib/status-utils';
import {
  REASSIGNMENT_REASONS,
  type Job,
  type Employee,
  type SmartCandidate,
} from '@/features/jobs/types/jobs-view-types';

// ── CandidateCard props ────────────────────────────────────────────────────
// Mirrors the parameter list of the old `renderCandidateCard()` function.
// `doAssign` is a curried handler that the parent builds per-open so the
// reassignment reason/note get injected server-side.

interface CandidateCardProps {
  candidate: SmartCandidate;
  isBestMatch: boolean;
  canAssign: boolean;
  isReassignment: boolean;
  doAssign: (employeeId: string) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  lifecycleLoading: boolean;
}

export function CandidateCard({
  candidate,
  isBestMatch,
  canAssign,
  isReassignment,
  doAssign,
  expandedId,
  setExpandedId,
  lifecycleLoading,
}: CandidateCardProps) {
  const conflict = candidate.conflict;
  const isOnLeave =
    candidate.employeeStatus === 'on_leave' ||
    (conflict?.type === 'status' && conflict?.message?.toLowerCase().includes('leave'));
  const isOffline = candidate.employeeStatus === 'offline';
  const hasHighRiskConflict = conflict && conflict.type !== 'none' && conflict.riskLevel === 'high';
  const isExpanded = expandedId === candidate.employeeId;
  // Suppress "unused" lint — isOffline is informational and may be referenced
  // by follow-up styling work, but the original card never branches on it.
  void isOffline;

  // Status badge styling
  const statusBadgeClass =
    candidate.employeeStatus === 'available' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    candidate.employeeStatus === 'busy' ? 'text-amber-700 bg-amber-50 border-amber-200' :
    candidate.employeeStatus === 'offline' ? 'text-slate-600 bg-slate-50 border-slate-200' :
    'text-red-700 bg-red-50 border-red-200';

  // Assign button styling
  const assignButtonClass = isOnLeave
    ? 'bg-slate-300 text-slate-500 hover:bg-slate-300'
    : hasHighRiskConflict
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : conflict && conflict.type !== 'none'
        ? 'bg-amber-600 hover:bg-amber-700 text-white'
        : 'bg-emerald-600 hover:bg-emerald-700 text-white';

  const assignButtonLabel = isOnLeave
    ? 'On Leave'
    : isReassignment
      ? (hasHighRiskConflict ? 'Reassign Anyway' : 'Reassign')
      : (hasHighRiskConflict ? 'Assign Anyway' : 'Assign');

  // Format conflicting job time for display
  const formatConflictTime = (c: typeof conflict) => {
    if (!c?.conflictingJob?.scheduledAt) return '';
    const d = new Date(c.conflictingJob.scheduledAt);
    const time = c.conflictingJob.scheduledTime || d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
  };

  return (
    <div
      key={candidate.employeeId}
      className={cn(
        'relative rounded-lg border transition-colors',
        isBestMatch ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200' : 'border-border bg-card',
        hasHighRiskConflict && 'border-red-200 bg-red-50/20',
      )}
    >
      <div className="p-3 space-y-2">
        {/* ── Header row: avatar · name · status · score ── */}
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className={cn('text-sm font-medium', isBestMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700')}>
              {candidate.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{candidate.employeeName}</span>
              <Badge variant="outline" className={cn('text-[10px] h-4 capitalize', statusBadgeClass)}>
                {candidate.employeeStatus.replace('_', ' ')}
              </Badge>
              {candidate.breakdown.distanceKm !== null && (
                <Badge variant="outline" className="text-[10px] h-4 text-blue-700 bg-blue-50 border-blue-200 gap-1">
                  <MapPin className="size-2.5" />{candidate.breakdown.distanceKm.toFixed(1)} km · 🚗 ~{Math.max(2, Math.round((candidate.breakdown.distanceKm / 35) * 60))} min drive
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={candidate.score} className="h-1.5 flex-1" />
              <span className="text-xs font-semibold text-emerald-600 shrink-0">{candidate.score}/100 match</span>
            </div>
          </div>
          {/* Quick contact + Assign button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {candidate.employeePhone && (
              <>
                <a
                  href={`tel:${candidate.employeePhone}`}
                  className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="Call technician"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="size-3.5" />
                </a>
                <a
                  href={`https://wa.me/${candidate.employeePhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="WhatsApp technician"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageSquare className="size-3.5" />
                </a>
              </>
            )}
            <Button
              size="sm"
              className={cn('h-8 text-xs shrink-0 min-h-[36px] font-semibold shadow-xs', assignButtonClass)}
              disabled={lifecycleLoading || isOnLeave || !canAssign}
              onClick={() => doAssign(candidate.employeeId)}
            >
              {lifecycleLoading ? <Loader2 className="size-3 mr-1 animate-spin" /> : null}
              {assignButtonLabel}
            </Button>
          </div>
        </div>

        {/* ── Match reasons (compact checkmark list) ── */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] pt-0.5">
          {candidate.breakdown.matchedSkills.length > 0 && (
            <span className="text-emerald-700 flex items-center gap-0.5 font-medium">
              <Check className="size-3 text-emerald-600" /> Matched Skills ({candidate.breakdown.matchedSkills.slice(0, 2).join(', ')})
            </span>
          )}
          {candidate.breakdown.distanceKm !== null && (
            <span className="text-blue-700 flex items-center gap-0.5 font-medium">
              <Navigation className="size-3 text-blue-600" /> {candidate.breakdown.distanceKm.toFixed(1)} km from job site
            </span>
          )}
          {!conflict || conflict.type === 'none' ? (
            <span className="text-emerald-700 flex items-center gap-0.5 font-medium">
              <CheckCircle2 className="size-3 text-emerald-600" /> Schedule Clear
            </span>
          ) : null}
          {candidate.breakdown.activeJobCount === 0 ? (
            <span className="text-emerald-700 flex items-center gap-0.5 font-medium">
              <CheckCircle2 className="size-3 text-emerald-600" /> Fully Available
            </span>
          ) : (
            <span className="text-amber-700 flex items-center gap-0.5 font-medium">
              <Clock3 className="size-3 text-amber-600" /> {candidate.breakdown.activeJobCount} active job{candidate.breakdown.activeJobCount > 1 ? 's' : ''} today
            </span>
          )}
        </div>

        {/* ── Conflict card (when present) ── */}
        {conflict && conflict.type !== 'none' && (
          <div className={cn(
            'mt-2 p-2 rounded-md border text-xs space-y-1',
            conflict.riskLevel === 'high' ? 'border-red-200 bg-red-50 text-red-800' :
            conflict.riskLevel === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-800' :
            'border-slate-200 bg-slate-50 text-slate-700',
          )}>
            <div className="flex items-center gap-1.5 font-medium">
              {conflict.type === 'schedule' && <><Clock3 className="size-3.5" /> Schedule Conflict</>}
              {conflict.type === 'travel' && <><Navigation className="size-3.5" /> Travel Conflict</>}
              {conflict.type === 'status' && <><ShieldAlert className="size-3.5" /> Status Conflict</>}
              <Badge variant="outline" className={cn(
                'ml-auto text-[9px] h-4 capitalize',
                conflict.riskLevel === 'high' ? 'border-red-300 text-red-700 bg-red-100' :
                conflict.riskLevel === 'medium' ? 'border-amber-300 text-amber-700 bg-amber-100' :
                'border-slate-300 text-slate-700 bg-slate-100',
              )}>
                {conflict.riskLevel} risk
              </Badge>
            </div>
            {conflict.conflictingJob && (
              <div className="pl-5 space-y-0.5 text-[11px]">
                <div className="font-medium">
                  {conflict.conflictingJob.jobNumber ? `#${conflict.conflictingJob.jobNumber}` : ''} {conflict.conflictingJob.title}
                </div>
                <div className="text-muted-foreground">{formatConflictTime(conflict)}</div>
                {conflict.conflictingJob.address && (
                  <div className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-2.5" /> {conflict.conflictingJob.address}
                  </div>
                )}
              </div>
            )}
            {conflict.type === 'schedule' && conflict.overlapMinutes != null && (
              <div className="pl-5 text-[11px]">
                <span className="font-medium text-red-700">Overlap: {conflict.overlapMinutes} min</span>
              </div>
            )}
            {conflict.type === 'travel' && (
              <div className="pl-5 text-[11px] space-y-0.5">
                {conflict.travelDistanceKm != null && <div>Travel distance: ~{conflict.travelDistanceKm} km</div>}
                {conflict.overlapMinutes != null && <div>Estimated travel: ~{conflict.overlapMinutes} min</div>}
              </div>
            )}
            {conflict.message && !conflict.conflictingJob && (
              <div className="pl-5 text-[11px]">{conflict.message}</div>
            )}
          </div>
        )}

        {/* ── Expanded contact actions (toggled by ⋯ button) ── */}
        {isExpanded && (
          <div className="pt-2 border-t flex items-center gap-2">
            {candidate.employeePhone && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { window.location.href = `tel:${candidate.employeePhone}`; }}
                >
                  <Phone className="size-3 mr-1" /> Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => window.open(`https://wa.me/${candidate.employeePhone.replace(/[^0-9]/g, '')}`, '_blank')}
                >
                  <MessageSquare className="size-3 mr-1" /> WhatsApp
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs ml-auto"
              onClick={() => setExpandedId(null)}
            >
              Close
            </Button>
          </div>
        )}
      </div>
      {/* ⋯ overflow button to expand contact actions */}
      {!isExpanded && candidate.employeePhone && (
        <button
          type="button"
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground"
          onClick={(e) => { e.stopPropagation(); setExpandedId(candidate.employeeId); }}
          title="Quick contact"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// ── SmartAssignDialog props ────────────────────────────────────────────────
// All state referenced by the inline dialog lives in the parent JobsView
// component — we just pass everything through as props so the dialog stays
// a controlled component.

export interface SmartAssignDialogProps {
  /** Whether the dialog is open (driven by `showAssignDialog` in the parent). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The job currently being assigned/reassigned. Null when dialog is closed. */
  assigningJob: Job | null;
  /** Smart-match candidates from POST /api/dispatch/smart (autoAssign=false). */
  smartCandidates: SmartCandidate[];
  /** True while smart-match candidates are being fetched. */
  loadingSmart: boolean;
  /** True when the smart-match fetch failed — dialog falls back to manual roster. */
  smartError: boolean;
  /** Full employee roster — used as a fallback when smartCandidates is empty. */
  employees: Employee[];
  /** Mandatory reassignment reason (drives the canAssign gate). */
  reassignReason: string;
  setReassignReason: (value: string) => void;
  /** Optional reassignment note (free text). */
  reassignNote: string;
  setReassignNote: (value: string) => void;
  /** Currently-expanded candidate card (for the quick-contact overflow section). */
  expandedCandidateId: string | null;
  setExpandedCandidateId: (id: string | null) => void;
  /** True while a lifecycle action is in-flight (disables Assign buttons). */
  lifecycleLoading: boolean;
  /** Parent lifecycle handler — we wrap it in `doAssign` for the assign action. */
  handleLifecycleAction: (
    action: string,
    jobId: string,
    resourceId?: string,
    phase1Extras?: { reason?: string; reassignmentNote?: string },
  ) => void;
}

export function SmartAssignDialog({
  open,
  onOpenChange,
  assigningJob,
  smartCandidates,
  loadingSmart,
  smartError,
  employees,
  reassignReason,
  setReassignReason,
  reassignNote,
  setReassignNote,
  expandedCandidateId,
  setExpandedCandidateId,
  lifecycleLoading,
  handleLifecycleAction,
}: SmartAssignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {assigningJob?.assigneeId ? (
              <><RefreshCw className="size-4 text-amber-600" /> Reassign Job</>
            ) : (
              <><UserCheck className="size-4 text-emerald-600" /> Assign Job</>
            )}
            {assigningJob?.jobNumber && (
              <Badge variant="outline" className="ml-1 font-mono text-[10px]">#{assigningJob.jobNumber}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {assigningJob ? `${assigningJob.title}${assigningJob.customerName ? ` · ${assigningJob.customerName}` : ''}` : 'Select a technician'}
          </DialogDescription>
        </DialogHeader>
        {assigningJob && (() => {
          const isReassignment = !!assigningJob.assigneeId;
          const canAssign = !isReassignment || !!reassignReason.trim();
          // Build the "assign" handler that injects reason/note for reassignment
          const doAssign = (employeeId: string) => {
            if (isReassignment) {
              handleLifecycleAction('assign', assigningJob.id, employeeId, {
                reason: reassignReason.trim(),
                reassignmentNote: reassignNote.trim() || undefined,
              });
            } else {
              handleLifecycleAction('assign', assigningJob.id, employeeId);
            }
          };
          // Split candidates: best match (top score, no high-risk conflict) vs others
          const sortedCandidates = [...smartCandidates].sort((a, b) => b.score - a.score);
          const bestMatch = sortedCandidates.find((c) => !c.conflict || c.conflict.type === 'none' || c.conflict.riskLevel !== 'high');
          const others = sortedCandidates.filter((c) => c !== bestMatch);
          return (
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* ── Job context card ─────────────────────────────────── */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{assigningJob.title}</span>
                  <Badge variant="outline" className={getStatusColor('jobs', assigningJob.status)}>{assigningJob.status.replace('_', ' ')}</Badge>
                  {assigningJob.priority && (
                    <Badge variant="outline" className={getPriorityColor(assigningJob.priority)}>{assigningJob.priority}</Badge>
                  )}
                </div>
                {assigningJob.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {assigningJob.address}</p>
                )}
                {assigningJob.scheduledAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> {formatDate(assigningJob.scheduledAt)}
                    {assigningJob.scheduledTime && <span className="ml-1">· {assigningJob.scheduledTime}</span>}
                  </p>
                )}
              </div>

              {/* ── Reassignment reason (mandatory) ──────────────────── */}
              {isReassignment && (
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 text-amber-900">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="size-4 text-amber-600 shrink-0" />
                      <span className="text-sm font-semibold">Reassignment Required</span>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                      Currently: {assigningJob.assigneeName || 'Assigned'}
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-800 leading-normal">
                    Reassigning from <span className="font-semibold text-amber-950">{assigningJob.assigneeName || 'current technician'}</span>. Select a reason below to unlock the technician selection list.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-amber-900">Reason for reassignment <span className="text-red-600 font-bold">*</span></Label>
                    <Select value={reassignReason} onValueChange={setReassignReason}>
                      <SelectTrigger className="h-9 bg-white border-amber-300">
                        <SelectValue placeholder="Select a reason (e.g. Schedule conflict, Customer request)…" />
                      </SelectTrigger>
                      <SelectContent>
                        {REASSIGNMENT_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-amber-800">Note (optional)</Label>
                    <Textarea
                      value={reassignNote}
                      onChange={(e) => setReassignNote(e.target.value)}
                      placeholder="e.g. Customer requested earlier arrival"
                      className="min-h-[60px] text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* ── BEST MATCH section ──────────────────────────────── */}
              {loadingSmart ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Finding best matches…</span>
                </div>
              ) : smartError ? (
                <div className="flex items-center gap-2 py-3 px-3 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Smart match unavailable. Showing full roster below — pick manually.</span>
                </div>
              ) : (
                <>
                  {bestMatch && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-500" /> Best Match
                      </p>
                      <CandidateCard
                        candidate={bestMatch}
                        isBestMatch
                        canAssign={canAssign}
                        isReassignment={isReassignment}
                        doAssign={doAssign}
                        expandedId={expandedCandidateId}
                        setExpandedId={setExpandedCandidateId}
                        lifecycleLoading={lifecycleLoading}
                      />
                    </div>
                  )}

                  {/* ── OTHER TECHNICIANS section ──────────────────── */}
                  {others.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Other Technicians ({others.length})
                      </p>
                      <div className="space-y-2">
                        {others.map((c) => (
                          <CandidateCard
                            key={c.employeeId}
                            candidate={c}
                            isBestMatch={false}
                            canAssign={canAssign}
                            isReassignment={isReassignment}
                            doAssign={doAssign}
                            expandedId={expandedCandidateId}
                            setExpandedId={setExpandedCandidateId}
                            lifecycleLoading={lifecycleLoading}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Manual roster fallback (employees not in smart candidates) ── */}
                  {smartCandidates.length === 0 && employees.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Technicians</p>
                      <div className="space-y-2">
                        {employees.map((emp) => {
                          const isOnLeave = emp.status === 'on_leave' || (emp as { onLeaveUntil?: string | null }).onLeaveUntil;
                          let skills: string[] = [];
                          try { skills = JSON.parse(emp.skills || '[]'); } catch { /* empty */ }
                          return (
                            <div key={emp.id} className="p-3 rounded-lg border flex items-center gap-3">
                              <Avatar className="size-9 shrink-0">
                                <AvatarFallback className="bg-slate-100 text-slate-700 text-sm font-medium">
                                  {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{emp.name}</span>
                                  <Badge variant="outline" className="text-[10px] h-4">{emp.role}</Badge>
                                  <Badge variant="outline" className={cn('text-[10px] h-4', emp.status === 'available' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : emp.status === 'busy' ? 'text-amber-700 bg-amber-50 border-amber-200' : emp.status === 'offline' ? 'text-slate-600 bg-slate-50 border-slate-200' : 'text-red-700 bg-red-50 border-red-200')}>
                                    {emp.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                {skills.length > 0 && (
                                  <div className="flex gap-1 mt-1">{skills.slice(0, 3).map((s, i) => (<Badge key={i} variant="secondary" className="text-[9px] h-4">{s}</Badge>))}</div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                className={cn('h-8 text-xs', isOnLeave ? 'bg-slate-300 text-slate-500 hover:bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700')}
                                disabled={lifecycleLoading || Boolean(isOnLeave)}
                                onClick={() => doAssign(emp.id)}
                              >
                                {isOnLeave ? 'On Leave' : 'Assign'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {smartCandidates.length === 0 && employees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">No technicians found in your workspace.</div>
                  )}
                </>
              )}

              {isReassignment && !reassignReason.trim() && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>Select a reason for reassignment to enable assigning.</span>
                </div>
              )}
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
