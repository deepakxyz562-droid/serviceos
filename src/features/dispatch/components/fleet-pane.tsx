'use client';

/**
 * FleetPane — Phase 6E extraction from dispatch-view.tsx.
 *
 * The left pane of the 3-pane dispatch workspace: filter bar (team / status /
 * GPS / search) + team-grouped technician roster + pending-jobs queue.
 *
 * Replaces the inline `<aside>` JSX (~130 lines) that lived in the parent
 * DispatchView. Pure presentational — the parent owns all filter state and
 * passes the already-grouped roster + pending jobs.
 *
 * Extracted from src/components/views/dispatch-view.tsx (Phase 6E refactor).
 */

import { Search, Briefcase, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FleetRoster,
  type RosterGroup,
} from '@/features/dispatch/components/fleet-roster';
import { JobQueueCard } from '@/features/dispatch/components/job-queue-card';
import type { Job, Team } from '@/features/dispatch/types';

export interface FleetPaneProps {
  teams: Team[];
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  gpsFilter: string;
  onGpsFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  rosterGroups: RosterGroup[];
  collapsedTeams: Set<string>;
  onToggleTeam: (teamId: string) => void;
  selectedTechnicianId: string | null;
  onSelectTechnician: (techId: string | null) => void;
  getActiveJobCount: (empId: string) => number;
  pendingJobs: Job[];
  onSelectJob: (job: Job) => void;
  onStartJob: (job: Job) => void;
  employeesLoading: boolean;
}

export function FleetPane({
  teams,
  teamFilter,
  onTeamFilterChange,
  statusFilter,
  onStatusFilterChange,
  gpsFilter,
  onGpsFilterChange,
  search,
  onSearchChange,
  rosterGroups,
  collapsedTeams,
  onToggleTeam,
  selectedTechnicianId,
  onSelectTechnician,
  getActiveJobCount,
  pendingJobs,
  onSelectJob,
  onStartJob,
  employeesLoading,
}: FleetPaneProps) {
  return (
    <aside className="hidden md:flex w-[320px] shrink-0 flex-col min-h-0 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
      {/* Filter bar */}
      <div className="p-2.5 border-b bg-muted/30 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Select value={teamFilter} onValueChange={onTeamFilterChange}>
            <SelectTrigger className="h-7 text-[11px] flex-1">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                    <span className="text-muted-foreground">({t._count?.members ?? 0})</span>
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-7 text-[11px] w-[100px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="traveling">Traveling</SelectItem>
              <SelectItem value="en_route">En Route</SelectItem>
              <SelectItem value="on_job">On Job</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="leave">On Leave</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={gpsFilter} onValueChange={onGpsFilterChange}>
            <SelectTrigger className="h-7 text-[11px] flex-1">
              <SelectValue placeholder="GPS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All GPS</SelectItem>
              <SelectItem value="live">Live only</SelectItem>
              <SelectItem value="stale">Stale</SelectItem>
              <SelectItem value="no-gps">No GPS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search technicians…"
            className="h-7 text-[11px] pl-6"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-3">
          {/* Team-grouped roster */}
          {employeesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <FleetRoster
              groups={rosterGroups}
              collapsedTeams={collapsedTeams}
              onToggleTeam={onToggleTeam}
              onSelectTechnician={onSelectTechnician}
              selectedTechnicianId={selectedTechnicianId}
              getActiveJobCount={getActiveJobCount}
            />
          )}

          {/* Unassigned jobs queue */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 px-1 py-1">
              <Briefcase className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
                Job Queue
              </span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {pendingJobs.length}
              </Badge>
            </div>
            <div className="space-y-1.5 mt-1">
              {pendingJobs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-3">
                  No pending jobs
                </p>
              ) : (
                pendingJobs.slice(0, 12).map((j) => (
                  <JobQueueCard
                    key={j.id}
                    job={j}
                    compact
                    onSelect={onSelectJob}
                    onStartJob={onStartJob}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
