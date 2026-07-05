/**
 * Job Lifecycle Helpers — V1.5 Field-Service Upgrade
 * ----------------------------------------------
 * Defines the 8-stage job lifecycle (Assigned → Accepted → Travelling →
 * Arrived → Working → Paused → Completed → Invoice Generated), the valid
 * transitions between them, and helpers for reading the per-stage
 * timestamps stored on the Job record.
 *
 * Statuses on the Job model are stored as a lowercase string in `Job.status`.
 * The lifecycle timeline UI uses these helpers to render the visual progress.
 *
 * Timestamps are stored in `Job.metadataJson` as:
 *   { lifecycleTimestamps: { assigned, accepted, travelStarted, arrived,
 *     workStarted, paused, resumed, completed, invoiceGenerated } }
 * …with a few fall-backs to existing Job fields (actualStartTime, completedAt)
 * for backwards compatibility with older jobs.
 */

export type LifecycleStageKey =
  | 'assigned'
  | 'accepted'
  | 'travelling'
  | 'arrived'
  | 'working'
  | 'paused'
  | 'completed'
  | 'invoice_generated';

export interface LifecycleStage {
  key: LifecycleStageKey;
  /** Job.status value that corresponds to this stage. */
  status: string;
  label: string;
  /** Lucide icon name (resolved on the client). */
  icon: string;
  /** Tailwind colour token used for the dot/line when complete. */
  color: 'blue' | 'amber' | 'emerald' | 'gray';
  /** Short helper description shown in tooltips. */
  description: string;
}

export const JOB_LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  {
    key: 'assigned',
    status: 'assigned',
    label: 'Assigned',
    icon: 'UserCheck',
    color: 'blue',
    description: 'Job has been assigned to a technician.',
  },
  {
    key: 'accepted',
    status: 'accepted',
    label: 'Accepted',
    icon: 'Check',
    color: 'blue',
    description: 'Technician accepted the assignment.',
  },
  {
    key: 'travelling',
    status: 'travelling',
    label: 'Travelling',
    icon: 'Navigation',
    color: 'amber',
    description: 'Technician is on the way to the site.',
  },
  {
    key: 'arrived',
    status: 'arrived',
    label: 'Arrived',
    icon: 'MapPin',
    color: 'amber',
    description: 'Technician arrived at the site.',
  },
  {
    key: 'working',
    status: 'working',
    label: 'Working',
    icon: 'Wrench',
    color: 'emerald',
    description: 'Work is in progress on site.',
  },
  {
    key: 'paused',
    status: 'paused',
    label: 'Paused',
    icon: 'Pause',
    color: 'gray',
    description: 'Work is temporarily paused.',
  },
  {
    key: 'completed',
    status: 'completed',
    label: 'Completed',
    icon: 'CheckCircle',
    color: 'emerald',
    description: 'Job marked completed by the technician.',
  },
  {
    key: 'invoice_generated',
    status: 'invoice_generated',
    label: 'Invoice Generated',
    icon: 'FileText',
    color: 'emerald',
    description: 'Invoice has been generated for this job.',
  },
] as const;

/** Maps the legacy / non-lifecycle Job statuses onto a lifecycle stage. */
const STATUS_TO_STAGE: Record<string, LifecycleStageKey> = {
  assigned: 'assigned',
  accepted: 'accepted',
  travelling: 'travelling',
  traveling: 'travelling', // common alternate spelling
  en_route: 'travelling', // legacy dispatch status
  enroute: 'travelling',
  arrived: 'arrived',
  working: 'working',
  in_progress: 'working', // legacy status — treat as "working"
  paused: 'paused',
  on_hold: 'paused',
  completed: 'completed',
  cancelled: 'completed', // visual fallback — cancelled jobs render the timeline up to the last real stage
  invoice_generated: 'invoice_generated',
  invoiced: 'invoice_generated',
  pending: 'assigned', // pending jobs show "Assigned" as the upcoming stage
};

/**
 * Returns the current lifecycle stage for a given Job.status string.
 * Falls back to 'assigned' for unknown statuses (so the UI doesn't crash).
 */
export function getLifecycleStage(status: string): LifecycleStage {
  const key = STATUS_TO_STAGE[status] ?? 'assigned';
  return JOB_LIFECYCLE_STAGES.find((s) => s.key === key) ?? JOB_LIFECYCLE_STAGES[0];
}

/**
 * Returns the stage index (0–7) for a given status string.
 * Used to know which dots to colour "completed" vs "current" vs "pending".
 */
export function getLifecycleStageIndex(status: string): number {
  const key = STATUS_TO_STAGE[status] ?? 'assigned';
  const idx = JOB_LIFECYCLE_STAGES.findIndex((s) => s.key === key);
  return idx === -1 ? 0 : idx;
}

/**
 * Returns the next stage key after the given status, or null if there
 * is no next stage (i.e. we're at 'invoice_generated').
 */
export function getNextStage(currentStatus: string): LifecycleStageKey | null {
  const idx = getLifecycleStageIndex(currentStatus);
  if (idx < 0 || idx >= JOB_LIFECYCLE_STAGES.length - 1) return null;
  return JOB_LIFECYCLE_STAGES[idx + 1].key;
}

/**
 * Map of valid lifecycle transitions.
 * Key = current Job.status, value = list of action keys that may be applied.
 * (Used by both the API and the UI to validate/gate buttons.)
 *
 * NOTE: 'paused' is a sub-state of 'working' — the only allowed action from
 * 'paused' is 'resume' (which returns to 'working'). 'working' can go to
 * either 'paused' or 'complete'.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['assign'],
  assigned: ['accept', 'cancel'],
  accepted: ['start_travel', 'cancel'],
  travelling: ['arrive', 'cancel'],
  traveling: ['arrive', 'cancel'],
  en_route: ['arrive', 'cancel'],
  arrived: ['start_work', 'cancel'],
  working: ['pause', 'complete', 'cancel'],
  in_progress: ['pause', 'complete', 'cancel'],
  paused: ['resume', 'complete', 'cancel'],
  on_hold: ['resume', 'complete', 'cancel'],
  completed: ['generate_invoice'],
  invoice_generated: [],
  invoiced: [],
  cancelled: [],
};

/**
 * Returns true if a job with `from` status may be transitioned via `to`
 * (where `to` is an action key like 'complete', 'pause', 'resume', etc.).
 */
export function canTransition(from: string, action: string): boolean {
  // Allow the legacy 'start'/'complete' actions to map onto the new flow.
  const normalizedAction =
    action === 'start' ? 'start_work' : action === 'start_travel' ? 'start_travel' : action;
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(normalizedAction) || allowed.includes(action);
}

/**
 * Given a current Job.status and an action key, returns the new Job.status
 * that should be applied. Returns null if the transition is not valid.
 */
export function applyTransition(from: string, action: string): string | null {
  if (!canTransition(from, action)) return null;
  switch (action) {
    case 'assign':
      return 'assigned';
    case 'accept':
      return 'accepted';
    case 'start_travel':
    case 'start':
      return 'travelling';
    case 'arrive':
      return 'arrived';
    case 'start_work':
      return 'working';
    case 'pause':
      return 'paused';
    case 'resume':
      return 'working';
    case 'complete':
      return 'completed';
    case 'generate_invoice':
      return 'invoice_generated';
    default:
      return null;
  }
}

// ─── Timestamps ────────────────────────────────────────────────────────────

export interface LifecycleTimestamps {
  assigned: string | null;
  accepted: string | null;
  travelStarted: string | null;
  arrived: string | null;
  workStarted: string | null;
  paused: string | null;
  resumed: string | null;
  completed: string | null;
  invoiceGenerated: string | null;
}

const EMPTY_TIMESTAMPS: LifecycleTimestamps = {
  assigned: null,
  accepted: null,
  travelStarted: null,
  arrived: null,
  workStarted: null,
  paused: null,
  resumed: null,
  completed: null,
  invoiceGenerated: null,
};

/**
 * Pull the lifecycle timestamps out of a job. Accepts either a Prisma Job
 * row (with `metadataJson`, `actualStartTime`, `completedAt`) or a plain
 * object (e.g. from the API). Always returns the full shape — missing
 * values are `null`.
 */
export function getLifecycleTimestamps(job: {
  metadataJson?: string | null;
  actualStartTime?: Date | string | null;
  completedAt?: Date | string | null;
}): LifecycleTimestamps {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = job.metadataJson ? JSON.parse(job.metadataJson) : {};
  } catch {
    parsed = {};
  }
  const raw = (parsed.lifecycleTimestamps ?? {}) as Record<string, unknown>;

  // Backwards-compat: pull workStarted / completed from existing Job fields.
  const workStarted =
    (raw.workStarted as string | null) ??
    (job.actualStartTime ? new Date(job.actualStartTime).toISOString() : null);
  const completed =
    (raw.completed as string | null) ??
    (job.completedAt ? new Date(job.completedAt).toISOString() : null);

  return {
    assigned: (raw.assigned as string | null) ?? null,
    accepted: (raw.accepted as string | null) ?? null,
    travelStarted: (raw.travelStarted as string | null) ?? null,
    arrived: (raw.arrived as string | null) ?? null,
    workStarted,
    paused: (raw.paused as string | null) ?? null,
    resumed: (raw.resumed as string | null) ?? null,
    completed,
    invoiceGenerated: (raw.invoiceGenerated as string | null) ?? null,
  };
}

/**
 * Merge a new timestamp into a job's existing metadataJson. Returns the
 * updated JSON string ready to be written back to `Job.metadataJson`.
 *
 * Usage:
 *   const newMetadata = setLifecycleTimestamp(job.metadataJson, 'arrived', new Date());
 *   await db.job.update({ where: { id }, data: { metadataJson: newMetadata } });
 */
export function setLifecycleTimestamp(
  currentMetadataJson: string | null | undefined,
  field: keyof LifecycleTimestamps,
  value: Date | string | null,
): string {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = currentMetadataJson ? JSON.parse(currentMetadataJson) : {};
  } catch {
    parsed = {};
  }
  const ts = (parsed.lifecycleTimestamps ?? {}) as Record<string, unknown>;
  ts[field] = value ? new Date(value).toISOString() : null;
  parsed.lifecycleTimestamps = ts;
  return JSON.stringify(parsed);
}

/**
 * Pretty-print a timestamp for the timeline UI.
 * Returns '—' if null.
 */
export function formatLifecycleTimestamp(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Returns the duration in minutes between two lifecycle timestamps.
 * Useful for "Travel: 23 min" / "Work: 1h 45m" breakdowns.
 */
export function getStageDurationMinutes(
  timestamps: LifecycleTimestamps,
  from: keyof LifecycleTimestamps,
  to: keyof LifecycleTimestamps,
): number | null {
  const start = timestamps[from];
  const end = timestamps[to];
  if (!start || !end) return null;
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return ms > 0 ? Math.round(ms / 60000) : 0;
  } catch {
    return null;
  }
}

export { EMPTY_TIMESTAMPS };
