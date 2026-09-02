'use client';

/**
 * FleetRoster — Phase 6E extraction from dispatch-view.tsx.
 *
 * Replaces the inline `renderEmployeeRow()` closure plus the team-grouped
 * roster container that wrapped it. The parent passes the already-grouped
 * roster (a list of {team, employees} pairs), the collapsed-team set, and
 * the technician select handler. Pure presentational.
 *
 * Extracted from src/components/views/dispatch-view.tsx (Phase 6E refactor).
 */

import {
  MapPin, Star, Activity, CheckCircle2,
  ChevronDown, ChevronRight, UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getEmployeeStatusDot, getEmployeeStatusBg, timeAgo,
  hasGps, isStaleGps, isOfflineEmp,
} from '@/features/dispatch/utils/dispatch-helpers';
import type { Employee, Team } from '@/features/dispatch/types';

export interface RosterGroup {
  team: Team | null;
  employees: Employee[];
}

export interface FleetRosterProps {
  groups: RosterGroup[];
  collapsedTeams: Set<string>;
  onToggleTeam: (teamId: string) => void;
  onSelectTechnician: (techId: string | null) => void;
  selectedTechnicianId: string | null;
  /** Per-employee active job count lookup (for the "N jobs" / "free" badge). */
  getActiveJobCount: (empId: string) => number;
}

export function FleetRoster({
  groups,
  collapsedTeams,
  onToggleTeam,
  onSelectTechnician,
  selectedTechnicianId,
  getActiveJobCount,
}: FleetRosterProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="size-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">No technicians match these filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const teamId = group.team?.id ?? 'unassigned';
        const collapsed = collapsedTeams.has(teamId);
        return (
          <div key={teamId + gi}>
            <button
              type="button"
              onClick={() => onToggleTeam(teamId)}
              className="w-full flex items-center gap-1.5 px-1 py-1 hover:bg-muted/40 rounded transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="size-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3 text-muted-foreground" />
              )}
              {group.team ? (
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: group.team.color }}
                />
              ) : (
                <UserPlus className="size-3 text-muted-foreground" />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-1 text-left truncate">
                {group.team ? group.team.name : 'Unassigned'}
              </span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {group.employees.length}
              </Badge>
            </button>
            {!collapsed && (
              <div className="space-y-1.5 mt-1">
                {group.employees.map((e) => (
                  <EmployeeRow
                    key={e.id}
                    employee={e}
                    activeCount={getActiveJobCount(e.id)}
                    isSelected={selectedTechnicianId === e.id}
                    onSelect={onSelectTechnician}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── EmployeeRow ────────────────────────────────────────────────────────────

interface EmployeeRowProps {
  employee: Employee;
  activeCount: number;
  isSelected: boolean;
  onSelect: (techId: string | null) => void;
}

function EmployeeRow({
  employee: e,
  activeCount,
  isSelected,
  onSelect,
}: EmployeeRowProps) {
  const gps = hasGps(e);
  const stale = isStaleGps(e);
  const offline = isOfflineEmp(e);
  const teamColor = e.team?.color;

  return (
    <button
      type="button"
      onClick={() => onSelect(e.id)}
      className={cn(
        'w-full text-left rounded-lg border p-2.5 transition-all hover:shadow-sm',
        isSelected
          ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/20'
          : 'border-border bg-card hover:border-teal-200'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <Avatar className="size-9">
            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-medium">
              {e.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white',
              getEmployeeStatusDot(e.status)
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">{e.name}</span>
            {e.team && (
              <span
                className="inline-block size-2 rounded-full shrink-0"
                style={{ backgroundColor: teamColor }}
                title={e.team.name}
                aria-hidden
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <Badge
              variant="outline"
              className={cn('text-[9px] h-4 px-1', getEmployeeStatusBg(e.status))}
            >
              {e.status.replace('_', ' ')}
            </Badge>
            {activeCount > 0 ? (
              <span className="flex items-center gap-0.5 text-amber-600">
                <Activity className="size-2.5" /> {activeCount} job
                {activeCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="size-2.5" /> free
              </span>
            )}
          </div>
          {/* GPS health indicator — separated from employee status.
              P0-2: Employee status is shown above (Available/En Route/On Job).
              GPS status is shown here independently (Live/Stale/Unavailable).
              P0-3: Human-friendly labels instead of 'offline · 0.0' */}
          <div className="flex items-center gap-1 mt-1">
            {!gps ? (
              <span className="flex items-center gap-0.5 text-[9px] text-gray-400" title="No GPS signal received">
                <MapPin className="size-2.5" /> GPS unavailable
              </span>
            ) : offline ? (
              <span className="flex items-center gap-0.5 text-[9px] text-red-500" title={`Last seen ${timeAgo(e.lastSeenAt)}`}>
                <MapPin className="size-2.5" /> GPS unavailable · {timeAgo(e.lastSeenAt)}
              </span>
            ) : stale ? (
              <span className="flex items-center gap-0.5 text-[9px] text-amber-500" title={`Last location ${timeAgo(e.lastSeenAt)}`}>
                <MapPin className="size-2.5" /> GPS stale · {timeAgo(e.lastSeenAt)}
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[9px] text-emerald-600" title={`Live · ${timeAgo(e.lastSeenAt)}`}>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                GPS live · {timeAgo(e.lastSeenAt)}
              </span>
            )}
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              <Star className="size-2.5 text-amber-400 fill-amber-400" />
              {e.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
