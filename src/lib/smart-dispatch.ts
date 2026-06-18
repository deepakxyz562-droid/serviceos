/**
 * ServiceOS Smart Dispatch Engine
 *
 * Intelligent job assignment based on:
 * - Skill-based matching (employee skills vs job requirements)
 * - Location-based assignment (proximity to job site)
 * - Availability filtering (only available employees)
 * - Workload balancing (distribute jobs evenly)
 *
 * Optional AI suggestion: "Best employee for this job"
 *
 * Usage:
 *   const result = await SmartDispatch.findBestMatch(jobId);
 *   // Returns: { employeeId, score, reasons }
 *
 * Scoring Algorithm:
 *   - Skill match: 0-40 points (how many required skills match)
 *   - Proximity:   0-30 points (distance from job site)
 *   - Workload:    0-15 points (fewer active jobs = higher score)
 *   - Rating:      0-15 points (employee rating * 3)
 *   Total:         0-100 points
 */

import { db } from '@/lib/db'
import { EventBus } from '@/lib/event-bus'

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Options for dispatch operations */
export interface DispatchOptions {
  /** Filter by workspace ID */
  workspaceId?: string
  /** Filter by tenant ID */
  tenantId?: string
  /** Required skills for the job (overrides job.type-based detection) */
  requiredSkills?: string[]
  /** Maximum distance in km from job site (filters out distant employees) */
  maxDistanceKm?: number
  /** Minimum score threshold (0-100) - employees below this are excluded */
  minScore?: number
  /** Prioritize certain scoring factors */
  prioritizeSkills?: boolean
  /** Prioritize proximity over other factors */
  prioritizeProximity?: boolean
  /** Whether to skip employees currently on leave */
  excludeOnLeave?: boolean
  /** Maximum active jobs an employee can have to be considered */
  maxActiveJobs?: number
}

/** Detailed scoring breakdown for a single employee */
export interface DispatchScore {
  /** Total composite score (0-100) */
  total: number
  /** Skill match score (0-40) */
  skillScore: number
  /** Proximity score (0-30) */
  proximityScore: number
  /** Workload score (0-15) */
  workloadScore: number
  /** Rating score (0-15) */
  ratingScore: number
  /** Human-readable reasons for the score */
  reasons: string[]
  /** Skills that matched the job requirements */
  matchedSkills: string[]
  /** Distance in km (null if no location data) */
  distanceKm: number | null
  /** Number of active jobs the employee currently has */
  activeJobCount: number
}

/** Result of finding the best match for a job */
export interface DispatchResult {
  /** Whether a suitable employee was found */
  found: boolean
  /** The best matching employee ID */
  employeeId: string | null
  /** The best matching employee name */
  employeeName: string | null
  /** Total composite score */
  score: number
  /** Detailed scoring breakdown */
  breakdown: DispatchScore
  /** All scored candidates (sorted by score descending) */
  candidates: CandidateScore[]
  /** Job details that were used for matching */
  job: {
    id: string
    title: string
    type: string
    status: string
    address: string | null
  }
}

/** A scored candidate in the dispatch results */
export interface CandidateScore {
  employeeId: string
  employeeName: string
  employeePhone: string
  employeeRole: string
  employeeStatus: string
  score: number
  breakdown: DispatchScore
}

/** Result of auto-assigning a job */
export interface AutoAssignResult {
  /** Whether the assignment was successful */
  success: boolean
  /** The assigned employee ID */
  employeeId: string | null
  /** The assigned employee name */
  employeeName: string | null
  /** The assignment score */
  score: number
  /** Reason for failure if unsuccessful */
  error?: string
  /** The job ID that was assigned */
  jobId: string
  /** Detailed scoring breakdown */
  breakdown?: DispatchScore
}

/** Employee type for internal use */
interface EmployeeRecord {
  id: string
  name: string
  phone: string
  email: string | null
  role: string
  skills: string
  status: string
  avatar: string | null
  rating: number
  completedJobs: number
  location: string | null
  latitude: number | null
  longitude: number | null
  workspaceId: string | null
  lastSeenAt: Date | null
  currentJobId: string | null
  onLeaveUntil: Date | null
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Maximum possible score for each factor */
const MAX_SKILL_SCORE = 40
const MAX_PROXIMITY_SCORE = 30
const MAX_WORKLOAD_SCORE = 15
const MAX_RATING_SCORE = 15

/** Earth's radius in km for Haversine formula */
const EARTH_RADIUS_KM = 6371

/** Default maximum active jobs to consider an employee available */
const DEFAULT_MAX_ACTIVE_JOBS = 4

// ─── Helper: Safe JSON Parse ───────────────────────────────────────────────────

function safeJsonParse(jsonStr: string, fallback: unknown = []): unknown {
  try {
    let parsed: unknown = JSON.parse(jsonStr)
    // Handle double-encoded JSON strings (e.g. when a string was JSON.stringify'd
    // twice). Keep parsing until the result is no longer a string that looks
    // like JSON.
    let depth = 0
    while (typeof parsed === 'string' && depth < 3) {
      try {
        const next = JSON.parse(parsed)
        parsed = next
        depth++
      } catch {
        break
      }
    }
    return parsed
  } catch {
    return fallback
  }
}

// ─── Haversine Distance Calculation ────────────────────────────────────────────

/**
 * Calculate the distance between two geographic coordinates using
 * the Haversine formula.
 *
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lng1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lng2 - Longitude of point 2 (degrees)
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// ─── Skill Matching ────────────────────────────────────────────────────────────

/**
 * Determine required skills from a job.
 * Uses the job's type, title, and any explicit required skills.
 */
function extractRequiredSkills(job: { type: string; title: string; description?: string | null }, explicitSkills?: string[]): string[] {
  const skills = new Set<string>()

  // Add explicit skills if provided
  if (explicitSkills && explicitSkills.length > 0) {
    for (const skill of explicitSkills) {
      skills.add(skill.toLowerCase().trim())
    }
  }

  // Derive skills from job type
  const jobType = job.type.toLowerCase().trim()
  if (jobType && jobType !== 'service' && jobType !== 'general') {
    skills.add(jobType)
  }

  // Derive skills from job title keywords
  const titleWords = job.title.toLowerCase().split(/[\s\-_,]+/).filter(w => w.length > 2)
  for (const word of titleWords) {
    // Only add meaningful words (not common words)
    const commonWords = new Set(['the', 'and', 'for', 'job', 'new', 'work', 'task', 'service'])
    if (!commonWords.has(word)) {
      skills.add(word)
    }
  }

  // Check description for service keywords
  if (job.description) {
    const descWords = job.description.toLowerCase().split(/[\s\-_,;.]+/).filter(w => w.length > 3)
    const serviceKeywords = new Set([
      'plumbing', 'electrical', 'cleaning', 'hvac', 'painting', 'carpentry',
      'landscaping', 'pest', 'roofing', 'masonry', 'welding', 'appliance',
      'moving', 'delivery', 'installation', 'repair', 'maintenance',
    ])
    for (const word of descWords) {
      if (serviceKeywords.has(word)) {
        skills.add(word)
      }
    }
  }

  return Array.from(skills)
}

/**
 * Calculate skill match score.
 * Compares employee skills against required skills.
 *
 * Scoring:
 *   - Exact match for each required skill: proportional points
 *   - Partial/related match: half points
 *   - No match: 0
 *   - Max: MAX_SKILL_SCORE (40)
 */
function calculateSkillScore(
  employeeSkills: string[],
  requiredSkills: string[],
  matchedOut: string[]
): { score: number; matched: string[] } {
  if (requiredSkills.length === 0) {
    // No specific requirements - baseline score for having skills at all
    const baseline = employeeSkills.length > 0 ? 20 : 5
    return { score: baseline, matched: [] }
  }

  if (employeeSkills.length === 0) {
    return { score: 0, matched: [] }
  }

  const matched: string[] = []
  let matchPoints = 0

  for (const required of requiredSkills) {
    const reqLower = required.toLowerCase()

    // Check for exact match
    const exactMatch = employeeSkills.some(
      empSkill => empSkill.toLowerCase() === reqLower
    )

    if (exactMatch) {
      matchPoints += 2 // Full match
      matched.push(required)
      continue
    }

    // Check for partial/contains match
    const partialMatch = employeeSkills.some(
      empSkill =>
        empSkill.toLowerCase().includes(reqLower) ||
        reqLower.includes(empSkill.toLowerCase())
    )

    if (partialMatch) {
      matchPoints += 1 // Partial match
      matched.push(required)
      continue
    }

    // Check for related/semantic matches
    const relatedMap: Record<string, string[]> = {
      plumbing: ['pipe', 'drain', 'water', 'fixture', 'sewer'],
      electrical: ['wiring', 'circuit', 'outlet', 'lighting', 'panel'],
      cleaning: ['janitorial', 'sanitize', 'deep clean', 'move out'],
      hvac: ['heating', 'cooling', 'air conditioning', 'ventilation', 'furnace'],
      painting: ['interior', 'exterior', 'wall', 'trim', 'primer'],
      landscaping: ['lawn', 'garden', 'irrigation', 'tree', 'yard'],
      roofing: ['shingle', 'gutter', 'flashing', 'leak'],
      carpentry: ['wood', 'cabinet', 'deck', 'framing', 'trim'],
      appliance: ['refrigerator', 'dishwasher', 'washer', 'dryer', 'oven'],
      moving: ['relocation', 'packing', 'furniture', 'transport'],
      delivery: ['shipping', 'logistics', 'courier', 'freight'],
      installation: ['setup', 'mount', 'assembly', 'configure'],
      repair: ['fix', 'maintenance', 'troubleshoot', 'restore'],
      pest: ['exterminator', 'insect', 'rodent', 'termite'],
    }

    const relatedSkills = relatedMap[reqLower] || []
    const hasRelated = employeeSkills.some(empSkill => {
      const empLower = empSkill.toLowerCase()
      return relatedSkills.some(related => empLower.includes(related) || related.includes(empLower))
    })

    if (hasRelated) {
      matchPoints += 0.5 // Related match
      matched.push(required)
    }
  }

  // Score: (matched points / max possible points) * MAX_SKILL_SCORE
  const maxPoints = requiredSkills.length * 2
  const score = Math.min(MAX_SKILL_SCORE, Math.round((matchPoints / maxPoints) * MAX_SKILL_SCORE))

  matchedOut.push(...matched)
  return { score, matched }
}

// ─── Proximity Score ───────────────────────────────────────────────────────────

/**
 * Calculate proximity score based on distance.
 *
 * Scoring (0-30):
 *   - < 1 km:  30 points
 *   - < 5 km:  25 points
 *   - < 10 km: 20 points
 *   - < 20 km: 15 points
 *   - < 30 km: 10 points
 *   - < 50 km: 5 points
 *   - >= 50 km: 0 points
 */
function calculateProximityScore(distanceKm: number | null): number {
  if (distanceKm === null) {
    // No location data - give neutral score
    return 15
  }

  if (distanceKm < 1) return 30
  if (distanceKm < 5) return 25
  if (distanceKm < 10) return 20
  if (distanceKm < 20) return 15
  if (distanceKm < 30) return 10
  if (distanceKm < 50) return 5
  return 0
}

// ─── Workload Score ────────────────────────────────────────────────────────────

/**
 * Calculate workload score.
 * Fewer active jobs = higher score.
 *
 * Scoring (0-15):
 *   - 0 active jobs: 15 points
 *   - 1 active job:  12 points
 *   - 2 active jobs: 9 points
 *   - 3 active jobs: 6 points
 *   - 4 active jobs: 3 points
 *   - 5+ active jobs: 0 points
 */
function calculateWorkloadScore(activeJobCount: number): number {
  if (activeJobCount === 0) return 15
  if (activeJobCount === 1) return 12
  if (activeJobCount === 2) return 9
  if (activeJobCount === 3) return 6
  if (activeJobCount === 4) return 3
  return 0
}

// ─── Rating Score ──────────────────────────────────────────────────────────────

/**
 * Calculate rating score based on employee rating (0-5).
 *
 * Scoring: rating * 3 (max 15)
 *   - 5.0 rating → 15 points
 *   - 4.0 rating → 12 points
 *   - 3.0 rating → 9 points
 *   - 0.0 rating → 0 points
 */
function calculateRatingScore(rating: number): number {
  return Math.min(MAX_RATING_SCORE, Math.round(rating * 3))
}

// ─── Find Available Employees ──────────────────────────────────────────────────

/**
 * Get available employees, optionally filtered by workspace and skills.
 *
 * @param workspaceId - Optional workspace filter
 * @param skills - Optional skills filter (employees must have at least one)
 * @returns Array of available employee records
 */
export async function findAvailableEmployees(
  workspaceId?: string,
  skills?: string[]
): Promise<EmployeeRecord[]> {
  const where: Record<string, any> = {
    status: { in: ['available', 'busy'] },
  }

  if (workspaceId) {
    where.workspaceId = workspaceId
  }

  const employees = await db.employee.findMany({ where }) as EmployeeRecord[]

  // Filter out employees on leave
  const now = new Date()
  const availableEmployees = employees.filter(emp => {
    if (emp.onLeaveUntil && emp.onLeaveUntil > now) {
      return false
    }
    return true
  })

  // Filter by skills if specified
  if (skills && skills.length > 0) {
    return availableEmployees.filter(emp => {
      const empSkills = safeJsonParse(emp.skills, []) as string[]
      const empSkillsLower = empSkills.map(s => s.toLowerCase())
      return skills.some(reqSkill =>
        empSkillsLower.some(empSkill =>
          empSkill.includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(empSkill)
        )
      )
    })
  }

  return availableEmployees
}

// ─── Score Employee ────────────────────────────────────────────────────────────

/**
 * Score an employee against a job.
 *
 * This evaluates how well an employee matches a job based on:
 * - Skill match (0-40 points)
 * - Proximity (0-30 points)
 * - Workload (0-15 points)
 * - Rating (0-15 points)
 *
 * @param employee - The employee record to score
 * @param job - The job to score against
 * @param options - Optional dispatch options
 * @returns Detailed scoring breakdown
 */
export async function scoreEmployee(
  employee: EmployeeRecord,
  job: {
    id: string
    title: string
    type: string
    description?: string | null
    address?: string | null
    latitude?: number | null
    longitude?: number | null
  },
  options?: DispatchOptions
): Promise<DispatchScore> {
  const reasons: string[] = []
  const matchedSkills: string[] = []

  // ── 1. Skill Score (0-40) ──
  const requiredSkills = extractRequiredSkills(job, options?.requiredSkills)
  const employeeSkills = safeJsonParse(employee.skills, []) as string[]
  const { score: rawSkillScore, matched } = calculateSkillScore(
    employeeSkills,
    requiredSkills,
    matchedSkills
  )

  let skillScore = rawSkillScore
  if (options?.prioritizeSkills) {
    // Boost skill score by 20% (capped at max)
    skillScore = Math.min(MAX_SKILL_SCORE, Math.round(skillScore * 1.2))
  }

  if (matched.length > 0 && matched.length === requiredSkills.length) {
    reasons.push(`Perfect skill match: ${matched.join(', ')}`)
  } else if (matched.length > 0) {
    reasons.push(`Partial skill match: ${matched.join(', ')} (${matched.length}/${requiredSkills.length} required)`)
  } else if (requiredSkills.length > 0) {
    reasons.push(`No matching skills for required: ${requiredSkills.join(', ')}`)
  } else {
    reasons.push('No specific skill requirements for this job')
  }

  // ── 2. Proximity Score (0-30) ──
  let distanceKm: number | null = null

  // Use job coordinates if available, otherwise try geocoding from address
  // For now, we use employee lat/lng and check for job coordinates
  // Job model doesn't have lat/lng directly, but we can use checkInLat/checkInLng
  // or derive from the customer address
  const jobLat = (job as Record<string, unknown>).latitude as number | null | undefined
  const jobLng = (job as Record<string, unknown>).longitude as number | null | undefined

  if (
    employee.latitude != null &&
    employee.longitude != null &&
    jobLat != null &&
    jobLng != null
  ) {
    distanceKm = calculateDistance(
      employee.latitude,
      employee.longitude,
      jobLat,
      jobLng
    )
  } else if (employee.latitude != null && employee.longitude != null && job.address) {
    // No job coordinates but employee has location
    // We can't calculate exact distance without geocoding the address
    // Give a neutral proximity score
    distanceKm = null
  }

  let proximityScore = calculateProximityScore(distanceKm)

  if (options?.prioritizeProximity) {
    // Boost proximity score by 20% (capped at max)
    proximityScore = Math.min(MAX_PROXIMITY_SCORE, Math.round(proximityScore * 1.2))
  }

  if (distanceKm !== null) {
    if (distanceKm < 5) {
      reasons.push(`Very close to job site (${distanceKm.toFixed(1)} km away)`)
    } else if (distanceKm < 15) {
      reasons.push(`Reasonably close to job site (${distanceKm.toFixed(1)} km away)`)
    } else if (distanceKm < 30) {
      reasons.push(`Moderate distance to job site (${distanceKm.toFixed(1)} km away)`)
    } else {
      reasons.push(`Far from job site (${distanceKm.toFixed(1)} km away)`)
    }
  } else {
    reasons.push('Location data not available for proximity calculation')
  }

  // ── 3. Workload Score (0-15) ──
  const activeJobs = await db.job.count({
    where: {
      assigneeId: employee.id,
      status: { in: ['assigned', 'in_progress', 'en_route'] },
    },
  })

  const workloadScore = calculateWorkloadScore(activeJobs)

  if (activeJobs === 0) {
    reasons.push('No active jobs — fully available')
  } else if (activeJobs <= 2) {
    reasons.push(`${activeJobs} active job${activeJobs > 1 ? 's' : ''} — manageable workload`)
  } else {
    reasons.push(`${activeJobs} active jobs — heavy workload`)
  }

  // ── 4. Rating Score (0-15) ──
  const ratingScore = calculateRatingScore(employee.rating)

  if (employee.rating >= 4.5) {
    reasons.push(`Excellent rating (${employee.rating.toFixed(1)}/5)`)
  } else if (employee.rating >= 4) {
    reasons.push(`Good rating (${employee.rating.toFixed(1)}/5)`)
  } else if (employee.rating >= 3) {
    reasons.push(`Average rating (${employee.rating.toFixed(1)}/5)`)
  } else if (employee.rating > 0) {
    reasons.push(`Below average rating (${employee.rating.toFixed(1)}/5)`)
  } else {
    reasons.push('No rating history yet')
  }

  // ── Calculate Total Score ──
  const total = skillScore + proximityScore + workloadScore + ratingScore

  return {
    total: Math.min(100, total),
    skillScore,
    proximityScore,
    workloadScore,
    ratingScore,
    reasons,
    matchedSkills: matched,
    distanceKm,
    activeJobCount: activeJobs,
  }
}

// ─── Find Best Match ───────────────────────────────────────────────────────────

/**
 * Find the best employee for a job using the Smart Dispatch Engine.
 *
 * This is the primary function for intelligent job assignment.
 * It scores all available employees against a job and returns
 * the best match along with all candidates.
 *
 * @param jobId - The ID of the job to find a match for
 * @param options - Optional dispatch configuration
 * @returns Dispatch result with best match and all candidates
 */
export async function findBestMatch(
  jobId: string,
  options?: DispatchOptions
): Promise<DispatchResult> {
  // ── 1. Fetch the job ──
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: {
      workspace: { select: { tenantId: true } },
    },
  })

  if (!job) {
    return {
      found: false,
      employeeId: null,
      employeeName: null,
      score: 0,
      breakdown: emptyScore(),
      candidates: [],
      job: { id: jobId, title: 'Unknown', type: 'unknown', status: 'unknown', address: null },
    }
  }

  // If job already has an assignee and isn't in a reassignable state
  if (job.assigneeId && !['pending', 'rejected', 'cancelled'].includes(job.status)) {
    const existingEmployee = await db.employee.findUnique({
      where: { id: job.assigneeId },
      select: { id: true, name: true },
    })

    return {
      found: true,
      employeeId: job.assigneeId,
      employeeName: existingEmployee?.name || job.assigneeName || null,
      score: 100,
      breakdown: {
        ...emptyScore(),
        total: 100,
        reasons: ['Job already has an assignee'],
      },
      candidates: [],
      job: {
        id: job.id,
        title: job.title,
        type: job.type,
        status: job.status,
        address: job.address,
      },
    }
  }

  // ── 2. Resolve tenant/workspace context ──
  const workspaceId = options?.workspaceId || job.workspaceId || undefined
  const tenantId = options?.tenantId || job.workspace?.tenantId || undefined

  // ── 3. Find available employees ──
  const requiredSkills = options?.requiredSkills || extractRequiredSkills(job)
  const employees = await findAvailableEmployees(workspaceId, undefined)

  if (employees.length === 0) {
    return {
      found: false,
      employeeId: null,
      employeeName: null,
      score: 0,
      breakdown: {
        ...emptyScore(),
        reasons: ['No available employees found'],
      },
      candidates: [],
      job: {
        id: job.id,
        title: job.title,
        type: job.type,
        status: job.status,
        address: job.address,
      },
    }
  }

  // ── 4. Filter by tenant if specified ──
  let filteredEmployees = employees
  if (tenantId) {
    // Get workspace IDs for this tenant
    const tenantWorkspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    })
    const tenantWorkspaceIds = new Set(tenantWorkspaces.map(w => w.id))
    filteredEmployees = employees.filter(
      emp => !emp.workspaceId || tenantWorkspaceIds.has(emp.workspaceId)
    )
  }

  // ── 5. Score each employee ──
  const maxActiveJobs = options?.maxActiveJobs ?? DEFAULT_MAX_ACTIVE_JOBS
  const minScore = options?.minScore ?? 0
  const maxDistanceKm = options?.maxDistanceKm

  const candidatePromises = filteredEmployees.map(
    async (employee): Promise<CandidateScore | null> => {
      const score = await scoreEmployee(employee, job, {
        ...options,
        requiredSkills,
      })

      // Filter by max active jobs
      if (score.activeJobCount > maxActiveJobs) {
        return null
      }

      // Filter by max distance
      if (maxDistanceKm && score.distanceKm !== null && score.distanceKm > maxDistanceKm) {
        return null
      }

      // Filter by minimum score
      if (score.total < minScore) {
        return null
      }

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        employeePhone: employee.phone,
        employeeRole: employee.role,
        employeeStatus: employee.status,
        score: score.total,
        breakdown: score,
      }
    }
  )

  const candidateResults = await Promise.all(candidatePromises)
  const candidates = candidateResults
    .filter((c): c is CandidateScore => c !== null)
    .sort((a, b) => b.score - a.score)

  // ── 6. Return result ──
  const bestMatch = candidates.length > 0 ? candidates[0] : null

  return {
    found: bestMatch !== null,
    employeeId: bestMatch?.employeeId ?? null,
    employeeName: bestMatch?.employeeName ?? null,
    score: bestMatch?.score ?? 0,
    breakdown: bestMatch?.breakdown ?? {
      ...emptyScore(),
      reasons: ['No suitable candidates found'],
    },
    candidates,
    job: {
      id: job.id,
      title: job.title,
      type: job.type,
      status: job.status,
      address: job.address,
    },
  }
}

// ─── Auto Assign ───────────────────────────────────────────────────────────────

/**
 * Automatically assign the best matching employee to a job.
 *
 * This function:
 * 1. Finds the best match using findBestMatch
 * 2. Updates the job with the assigned employee
 * 3. Updates the employee status
 * 4. Fires events via EventBus (job.assigned, employee.status_changed)
 * 5. Returns the assignment result
 *
 * @param jobId - The ID of the job to auto-assign
 * @returns Auto-assignment result
 */
export async function autoAssign(jobId: string): Promise<AutoAssignResult> {
  try {
    // ── 1. Find the best match ──
    const match = await findBestMatch(jobId)

    if (!match.found || !match.employeeId) {
      return {
        success: false,
        employeeId: null,
        employeeName: null,
        score: 0,
        error: match.breakdown.reasons.join('; ') || 'No suitable employee found',
        jobId,
      }
    }

    // ── 2. Update the job ──
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: {
        assigneeId: match.employeeId,
        assigneeName: match.employeeName,
        assigneePhone: match.candidates[0]?.employeePhone || null,
        status: 'assigned',
        assignmentStatus: 'accepted',
      },
    })

    // ── 3. Update employee status ──
    await db.employee.update({
      where: { id: match.employeeId },
      data: {
        status: 'busy',
        currentJobId: jobId,
      },
    })

    // ── 4. Log status change ──
    await db.employeeStatusLog.create({
      data: {
        employeeId: match.employeeId,
        fromStatus: 'available',
        toStatus: 'busy',
        reason: `Auto-assigned to job ${updatedJob.jobNumber || jobId}`,
        metadataJson: JSON.stringify({
          jobId,
          jobTitle: match.job.title,
          autoAssigned: true,
          dispatchScore: match.score,
        }),
      },
    })

    // ── 5. Fire events ──
    const tenantId = (updatedJob as Record<string, unknown>).tenantId as string | undefined
    const workspaceId = updatedJob.workspaceId || undefined

    // Emit job.assigned event
    await EventBus.emit(
      'job.assigned',
      {
        jobId: updatedJob.id,
        jobTitle: updatedJob.title,
        jobNumber: updatedJob.jobNumber,
        employeeId: match.employeeId,
        employeeName: match.employeeName,
        autoAssigned: true,
        dispatchScore: match.score,
        resourceType: 'job',
        resourceId: updatedJob.id,
      },
      { tenantId, workspaceId }
    )

    // Emit employee.status_changed event
    await EventBus.emit(
      'employee.status_changed',
      {
        employeeId: match.employeeId,
        employeeName: match.employeeName,
        fromStatus: 'available',
        toStatus: 'busy',
        reason: `Auto-assigned to job ${updatedJob.jobNumber || jobId}`,
        jobId: updatedJob.id,
        resourceType: 'employee',
        resourceId: match.employeeId,
      },
      { tenantId, workspaceId }
    )

    return {
      success: true,
      employeeId: match.employeeId,
      employeeName: match.employeeName,
      score: match.score,
      jobId,
      breakdown: match.breakdown,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during auto-assignment'
    console.error('[SmartDispatch] Auto-assign failed:', message)

    return {
      success: false,
      employeeId: null,
      employeeName: null,
      score: 0,
      error: message,
      jobId,
    }
  }
}

// ─── Utility: Empty Score ──────────────────────────────────────────────────────

function emptyScore(): DispatchScore {
  return {
    total: 0,
    skillScore: 0,
    proximityScore: 0,
    workloadScore: 0,
    ratingScore: 0,
    reasons: [],
    matchedSkills: [],
    distanceKm: null,
    activeJobCount: 0,
  }
}

// ─── Exported Score Constants ──────────────────────────────────────────────────

export const SCORING_WEIGHTS = {
  skill: { max: MAX_SKILL_SCORE, label: 'Skill Match', description: 'How many required skills the employee has' },
  proximity: { max: MAX_PROXIMITY_SCORE, label: 'Proximity', description: 'Distance from job site' },
  workload: { max: MAX_WORKLOAD_SCORE, label: 'Workload', description: 'Fewer active jobs = higher score' },
  rating: { max: MAX_RATING_SCORE, label: 'Rating', description: 'Employee rating (0-5) × 3' },
} as const

/**
 * Get algorithm info for display purposes.
 * Useful for API routes that describe the dispatch algorithm.
 */
export function getAlgorithmInfo() {
  return {
    name: 'Smart Dispatch Engine v2.0',
    description: 'Intelligent employee assignment with multi-factor scoring',
    factors: Object.entries(SCORING_WEIGHTS).map(([key, val]) => ({
      key,
      ...val,
    })),
    totalMaxScore: 100,
  }
}
