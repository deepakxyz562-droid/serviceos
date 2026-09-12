'use client';

/**
 * DispatchSidebar — Tabbed Operational Command Sidebar
 * -----------------------------------------------------
 * Cleanly separates:
 *   Tab 1: "Needs Assignment" (Actionable dispatch queue)
 *   Tab 2: "Team Roster" (Technician status & GPS monitoring)
 */

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { JobQueueCard } from './job-queue-card';
import { TechnicianCard } from './technician-card';
import { haversineKm, hasGps } from '../utils/dispatch-helpers';
import { getGpsStatusInfo } from '../utils/gps-status';
import type { Employee, Job, Team } from '../types';

export interface DispatchSidebarProps {
  activeTab: 'queue' | 'roster';
  onTabChange: (tab: 'queue' | 'roster') => void;
  unassignedJobs: Job[];
  allJobs: Job[];
  employees: Employee[];
  teams: Team[];
  activeJobsByEmployee: Map<string, Job[]>;
  selectedTechnicianId?: string | null;
  onSelectTechnician: (techId: string) => void;
  onSelectJob: (job: Job) => void;
  onAssignJob: (job: Job) => void;
  onAssignToTech?: (techId: string) => void;
  onStartJob?: (job: Job) => void;
}

export function DispatchSidebar({
  activeTab,
  onTabChange,
  unassignedJobs,
  allJobs,
  employees,
  teams,
  activeJobsByEmployee,
  selectedTechnicianId,
  onSelectTechnician,
  onSelectJob,
  onAssignJob,
  onAssignToTech,
  onStartJob,
}: DispatchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gpsFilter, setGpsFilter] = useState('all');

  // Filtered Unassigned Jobs
  const filteredJobs = useMemo(() => {
    return unassignedJobs.filter((j) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        (j.customerName && j.customerName.toLowerCase().includes(q)) ||
        (j.address && j.address.toLowerCase().includes(q)) ||
        (j.jobNumber && j.jobNumber.toLowerCase().includes(q))
      );
    });
  }, [unassignedJobs, searchQuery]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (e.name || '').toLowerCase().includes(q);
        const matchesSkill = e.skills ? e.skills.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesSkill) return false;
      }

      // Team
      if (teamFilter !== 'all' && e.teamId !== teamFilter) {
        return false;
      }

      // Employee Status
      if (statusFilter !== 'all' && e.status !== statusFilter) {
        return false;
      }

      // GPS Freshness
      if (gpsFilter !== 'all') {
        const gps = getGpsStatusInfo(e);
        if (gpsFilter === 'live' && gps.level !== 'live') return false;
        if (gpsFilter === 'recent' && gps.level !== 'recent') return false;
        if (gpsFilter === 'stale' && (gps.level !== 'stale' && gps.level !== 'unavailable')) return false;
      }

      return true;
    });
  }, [employees, searchQuery, teamFilter, statusFilter, gpsFilter]);

  return (
    <aside className="w-full md:w-[360px] lg:w-[400px] xl:w-[420px] flex flex-col h-full bg-card border-r border-border shrink-0 min-h-0 overflow-hidden">
      {/* ── 1. Top Tab Switcher ────────────────────────────────────── */}
      <div className="p-3 border-b border-border bg-muted/20 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-muted rounded-xl gap-1">
          <button
            type="button"
            onClick={() => onTabChange('queue')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all min-w-0',
              activeTab === 'queue'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Briefcase className="size-3.5 text-teal-600 shrink-0" />
            <span className="truncate">Needs Assignment</span>
            {unassignedJobs.length > 0 && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0',
                  activeTab === 'queue'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                )}
              >
                {unassignedJobs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('roster')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all min-w-0',
              activeTab === 'roster'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="size-3.5 text-teal-600 shrink-0" />
            <span className="truncate">Team Roster</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0',
                activeTab === 'roster'
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200'
                  : 'bg-muted-foreground/20 text-muted-foreground'
              )}
            >
              {employees.length}
            </span>
          </button>
        </div>

        {/* ── 2. Unified Search & Filters ──────────────────────────── */}
        <div className="mt-2.5 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'queue' ? 'Search unassigned jobs…' : 'Search technicians…'
              }
              className="h-8 pl-8 pr-7 text-xs bg-background border-border"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {activeTab === 'roster' && (
            <div className="space-y-1.5">
              {/* Row 1: Team & Status filters */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Team dropdown */}
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="h-7 text-[11px] w-full bg-background border-border truncate">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status dropdown */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 text-[11px] w-full bg-background border-border truncate">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on_job">On Job</SelectItem>
                    <SelectItem value="en_route">En Route</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2: GPS Telemetry Filter */}
              <Select value={gpsFilter} onValueChange={setGpsFilter}>
                <SelectTrigger className="h-7 text-[11px] w-full bg-background border-border truncate">
                  <SelectValue placeholder="All GPS Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All GPS Status</SelectItem>
                  <SelectItem value="live">🟢 Live GPS (Tracking Now)</SelectItem>
                  <SelectItem value="recent">🟢 Recent (Last 15 mins)</SelectItem>
                  <SelectItem value="stale">🟠 Stale / Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Scrollable List Body ───────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0 w-full">
        <div className="p-3 pb-16 sm:pb-12 space-y-2.5">
          {activeTab === 'queue' ? (
            filteredJobs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-4">
                <div className="size-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center dark:bg-emerald-950/40 dark:border-emerald-800 mb-2.5">
                  <CheckCircle2 className="size-5" />
                </div>
                <h4 className="text-xs font-semibold text-foreground">
                  {searchQuery ? 'No Matching Jobs' : 'All Jobs Assigned'}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
                  {searchQuery
                    ? 'No pending unassigned jobs match your search query.'
                    : 'No pending unassigned jobs in queue.'}
                </p>
                {searchQuery && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-6 text-xs text-teal-600 mt-1"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              filteredJobs.map((job) => {
                // Find nearest available tech for preview
                let suggestedTech: Employee | null = null;
                let minDist: number | null = null;
                if (hasGps(job)) {
                  for (const e of employees) {
                    if (e.status === 'available' && hasGps(e)) {
                      const d = haversineKm(
                        e.latitude!,
                        e.longitude!,
                        job.latitude!,
                        job.longitude!
                      );
                      if (minDist === null || d < minDist) {
                        minDist = d;
                        suggestedTech = e;
                      }
                    }
                  }
                }
                if (!suggestedTech) {
                  suggestedTech = employees.find((e) => e.status === 'available') || null;
                }

                return (
                  <JobQueueCard
                    key={job.id}
                    job={job}
                    suggestedEmployee={suggestedTech}
                    suggestedDistanceKm={minDist}
                    onSelect={onSelectJob}
                    onAssign={onAssignJob}
                    onStartJob={onStartJob}
                  />
                );
              })
            )
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-4">
              <Users className="size-8 text-muted-foreground/50 mb-2" />
              <h4 className="text-xs font-semibold text-foreground">No Technicians Found</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[220px]">
                {searchQuery || teamFilter !== 'all' || statusFilter !== 'all' || gpsFilter !== 'all'
                  ? 'No technicians match your current search or active filters.'
                  : 'No technician accounts available in this workspace.'}
              </p>
              {(searchQuery || teamFilter !== 'all' || statusFilter !== 'all' || gpsFilter !== 'all') && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-6 text-xs text-teal-600 mt-1"
                  onClick={() => {
                    setSearchQuery('');
                    setTeamFilter('all');
                    setStatusFilter('all');
                    setGpsFilter('all');
                  }}
                >
                  Reset all filters
                </Button>
              )}
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <TechnicianCard
                key={emp.id}
                employee={emp}
                activeJobs={activeJobsByEmployee.get(emp.id) || []}
                isSelected={selectedTechnicianId === emp.id}
                onSelect={onSelectTechnician}
                onAssignJob={onAssignToTech}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
