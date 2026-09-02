/**
 * useDispatchSummary — Single Canonical Dispatch View State Hook
 * ---------------------------------------------------------------
 * Derived from the raw jobs and employees lists to guarantee that:
 *   - Header counts
 *   - KPI strip pills
 *   - Queue counter badges
 *   - Roster indicators
 * always share the exact same numbers without drift.
 */

import { useMemo } from 'react';
import type { Employee, Job, AttentionItem, DispatchSummary } from '../types';
import { getGpsStatusInfo } from '../utils/gps-status';
import { isLateJob, isIdleTech } from '../utils/dispatch-helpers';

export interface UseDispatchSummaryResult {
  summary: DispatchSummary;
  activeJobsByEmployee: Map<string, Job[]>;
  pendingJobs: Job[];
  assignedJobs: Job[];
  inProgressJobs: Job[];
  getActiveJobCount: (empId: string) => number;
}

const ACTIVE_JOB_STATUSES = new Set([
  'assigned',
  'accepted',
  'travelling',
  'arrived',
  'working',
  'paused',
]);

export function useDispatchSummary(employees: Employee[], jobs: Job[]): UseDispatchSummaryResult {
  // 1. Group active jobs by employee
  const activeJobsByEmployee = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const j of jobs) {
      if (!j.assigneeId) continue;
      if (!ACTIVE_JOB_STATUSES.has(j.status)) continue;
      const list = map.get(j.assigneeId) ?? [];
      list.push(j);
      map.set(j.assigneeId, list);
    }
    return map;
  }, [jobs]);

  const getActiveJobCount = (empId: string): number => {
    return activeJobsByEmployee.get(empId)?.length ?? 0;
  };

  // 2. Filter job queues
  const pendingJobs = useMemo(
    () => jobs.filter((j) => j.status === 'pending' || !j.assigneeId),
    [jobs],
  );

  const assignedJobs = useMemo(
    () => jobs.filter((j) => ['assigned', 'accepted', 'travelling'].includes(j.status)),
    [jobs],
  );

  const inProgressJobs = useMemo(
    () => jobs.filter((j) => ['arrived', 'working'].includes(j.status)),
    [jobs],
  );

  // 3. Compute Attention Items
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    // Late jobs
    for (const j of jobs) {
      if (isLateJob(j)) {
        const lateMin = j.scheduledAt
          ? Math.round((Date.now() - new Date(j.scheduledAt).getTime()) / 60000)
          : 0;
        items.push({
          id: `late-${j.id}`,
          severity: 'red',
          icon: 'alert',
          title: `Job ${j.jobNumber || j.title.slice(0, 18)} ${lateMin}m late`,
          detail: j.customerName ? `Customer: ${j.customerName}` : 'No customer name',
          action: { label: 'Inspect', jobId: j.id },
        });
      }
    }

    // Stale or missing GPS on active technicians
    for (const e of employees) {
      if (e.status !== 'offline' && e.status !== 'leave') {
        const gpsInfo = getGpsStatusInfo(e);
        if (gpsInfo.level === 'stale') {
          items.push({
            id: `stale-${e.id}`,
            severity: 'amber',
            icon: 'gps',
            title: `${e.name} · GPS stale`,
            detail: `Last update: ${gpsInfo.lastSeenText}`,
            action: { label: 'Inspect', employeeId: e.id },
          });
        }
      }
    }

    // Unassigned jobs
    for (const j of pendingJobs) {
      items.push({
        id: `unassigned-${j.id}`,
        severity: 'yellow',
        icon: 'unassigned',
        title: `Job ${j.jobNumber || j.title.slice(0, 18)} unassigned`,
        detail: j.priority ? `${j.priority} priority` : 'Pending dispatch',
        action: { label: 'Assign', jobId: j.id },
      });
    }

    // Idle technicians (available + 0 active jobs)
    for (const e of employees) {
      if (isIdleTech(e, getActiveJobCount(e.id)) && e.status === 'available') {
        items.push({
          id: `idle-${e.id}`,
          severity: 'yellow',
          icon: 'idle',
          title: `${e.name} available & idle`,
          detail: e.team?.name ? `Team: ${e.team.name}` : 'No active jobs assigned',
          action: { label: 'Inspect', employeeId: e.id },
        });
      }
    }

    return items;
  }, [employees, jobs, pendingJobs, activeJobsByEmployee]);

  // 4. Derive Canonical DispatchSummary
  const summary = useMemo<DispatchSummary>(() => {
    const teamCount = employees.length;
    const availableCount = employees.filter((e) => e.status === 'available').length;

    const enRouteCount = employees.filter((e) => {
      if (!e.currentJobId) return false;
      const cj = jobs.find((j) => j.id === e.currentJobId);
      return cj?.status === 'travelling';
    }).length;

    const onJobCount = employees.filter((e) => {
      if (!e.currentJobId) return false;
      const cj = jobs.find((j) => j.id === e.currentJobId);
      return cj ? ['arrived', 'working'].includes(cj.status) : false;
    }).length;

    const unassignedCount = pendingJobs.length;

    const gpsIssueCount = employees.filter((e) => {
      if (e.status === 'offline' || e.status === 'leave') return false;
      const info = getGpsStatusInfo(e);
      return info.level === 'stale' || info.level === 'unavailable';
    }).length;

    return {
      teamCount,
      availableCount,
      enRouteCount,
      onJobCount,
      unassignedCount,
      gpsIssueCount,
      attentionCount: attentionItems.length,
      attentionItems,
    };
  }, [employees, jobs, pendingJobs, attentionItems]);

  return {
    summary,
    activeJobsByEmployee,
    pendingJobs,
    assignedJobs,
    inProgressJobs,
    getActiveJobCount,
  };
}
