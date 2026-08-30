/**
 * Dispatch types — shared between dispatch-view.tsx and the extracted
 * dispatch feature components (InspectorPanel, AttentionPanel, FleetRoster,
 * JobQueueCard).
 *
 * Single source of truth for Dispatch-view-related TypeScript types.
 * Extracted from src/components/views/dispatch-view.tsx in Phase 6E.
 *
 * USAGE:
 *   import type {
 *     Team, Employee, Job, CandidateScore, AttentionItem,
 *   } from '@/features/dispatch/types';
 */

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string;
  leadId?: string | null;
  isActive: boolean;
  lead?: { id: string; name: string; phone: string; status: string } | null;
  _count?: { members: number };
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  skills: string;
  rating: number;
  completedJobs: number;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  avatar?: string;
  lastSeenAt?: string | null;
  /** Authoritative GPS telemetry timestamp from GPSLocation.capturedAt. */
  lastGpsAt?: string | null;
  /** Derived GPS freshness — 'live' | 'stale' | 'offline'. */
  gpsStatus?: 'live' | 'stale' | 'offline';
  currentJobId?: string | null;
  onLeaveUntil?: string | null;
  teamId?: string | null;
  team?: { id: string; name: string; color: string } | null;
  activeJobs?: {
    id: string;
    title: string;
    status: string;
    scheduledAt?: string;
    address?: string;
    priority?: string;
    latitude?: number | null;
    longitude?: number | null;
  }[];
}

export interface Job {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  address?: string;
  scheduledAt?: string;
  scheduledTime?: string;
  customerName?: string;
  customerPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  createdAt: string;
  updatedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  assignee?: { id: string; name: string; phone: string; role: string; status: string };
}

export interface CandidateScore {
  employeeId: string;
  employeeName: string;
  employeePhone: string;
  employeeRole: string;
  employeeStatus: string;
  score: number;
  breakdown: {
    total: number;
    skillScore: number;
    proximityScore: number;
    workloadScore: number;
    ratingScore: number;
    reasons: string[];
    matchedSkills: string[];
    distanceKm: number | null;
    activeJobCount: number;
  };
}

export interface AttentionItem {
  id: string;
  severity: 'red' | 'amber' | 'yellow';
  icon: 'alert' | 'gps' | 'unassigned' | 'idle';
  title: string;
  detail: string;
  action?: { label: string; jobId?: string; employeeId?: string };
}
