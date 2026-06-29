import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Helper: safely parse JSON with fallback
function safeJsonParse(jsonStr: string, fallback: unknown = []) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return fallback;
  }
}

// Weight configuration for scoring factors
const DEFAULT_WEIGHTS = {
  skills: 30,
  workload: 20,
  rating: 20,
  availability: 15,
  experience: 15,
};

interface ScoringCriteria {
  prioritizeSkills?: boolean;
  prioritizeProximity?: boolean;
  prioritizeRating?: boolean;
  maxDistance?: number;
}

interface ScoreBreakdown {
  skills: number;
  workload: number;
  rating: number;
  availability: number;
  experience: number;
  proximity: number;
}

interface Recommendation {
  employee: {
    id: string;
    name: string;
    phone: string;
    role: string;
    status: string;
    avatar: string | null;
    rating: number;
    completedJobs: number;
    skills: string[];
  };
  score: number;
  breakdown: ScoreBreakdown;
  reasoning: string[];
}

/**
 * GET /api/jobs/smart-assign
 * Returns scoring algorithm information
 */
export async function GET() {
  return NextResponse.json({
    algorithm: 'Smart Assignment Engine v1.0',
    description: 'AI-based employee assignment that scores candidates across multiple factors',
    factors: [
      {
        name: 'Skills Match',
        weight: '30%',
        description: 'Compares job type against employee skills array. Full match = 100, partial = 50, no match = 0.',
      },
      {
        name: 'Workload',
        weight: '20%',
        description: 'Considers current active jobs. 0 active = 100, 1 = 75, 2 = 50, 3 = 25, 4+ = 0.',
      },
      {
        name: 'Rating',
        weight: '20%',
        description: 'Employee rating (1-5) mapped to 0-100 scale. Higher rating = higher score.',
      },
      {
        name: 'Availability',
        weight: '15%',
        description: 'Current status: available=100, busy=40, offline=0.',
      },
      {
        name: 'Experience',
        weight: '15%',
        description: 'Completed jobs count mapped to score. 0 jobs=0, 10=50, 25+=100.',
      },
    ],
    proximityNote: 'Proximity is simulated with random distance scoring for demo purposes (not weighted by default).',
    weights: DEFAULT_WEIGHTS,
    usage: {
      method: 'POST',
      endpoint: '/api/jobs/smart-assign',
      body: {
        jobId: 'string (required)',
        autoAssign: 'boolean (optional, default false)',
        criteria: {
          prioritizeSkills: 'boolean (optional, doubles skills weight)',
          prioritizeProximity: 'boolean (optional, adds proximity to weighted factors)',
          prioritizeRating: 'boolean (optional, doubles rating weight)',
          maxDistance: 'number (optional, filters out employees beyond this km distance)',
        },
      },
    },
  });
}

/**
 * POST /api/jobs/smart-assign
 * Scores all available employees for a given job and returns ranked recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    // Fetch the job
    const job = await db.job.findUnique({
      where: { id: body.jobId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            avatar: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If job already has an assignee, return info
    if (job.assigneeId && job.status !== 'pending') {
      return NextResponse.json({
        job,
        message: 'Job already has an assignee',
        recommendations: [],
      });
    }

    // Fetch employees filtered by tenant's workspaces
    const authUser = await getAuthUser();
    const isSuperAdmin = authUser?.isSuperAdmin || (authUser?.role === 'admin' && !authUser?.tenantId);

    let employeeFilter: Record<string, unknown> = {};
    if (!isSuperAdmin && authUser?.tenantId) {
      const tenantWorkspaces = await db.workspace.findMany({
        where: { tenantId: authUser.tenantId },
        select: { id: true },
      });
      const workspaceIds = tenantWorkspaces.map((w: { id: string }) => w.id);
      if (workspaceIds.length > 0) {
        employeeFilter = { workspaceId: { in: workspaceIds } };
      }
    } else if (!isSuperAdmin && !authUser?.tenantId && authUser?.workspaceId) {
      employeeFilter = { workspaceId: authUser.workspaceId };
    }

    const employees = await db.employee.findMany({ where: employeeFilter });

    if (employees.length === 0) {
      return NextResponse.json({
        job,
        message: 'No employees available for assignment',
        recommendations: [],
      });
    }

    // Parse criteria with defaults
    const criteria: ScoringCriteria = body.criteria || {};
    const autoAssign = body.autoAssign === true;

    // Adjust weights based on criteria priorities
    const weights = { ...DEFAULT_WEIGHTS };
    if (criteria.prioritizeSkills) {
      weights.skills = 50;
      weights.workload = 15;
      weights.rating = 15;
      weights.availability = 10;
      weights.experience = 10;
    }
    if (criteria.prioritizeRating) {
      weights.rating = 40;
      weights.skills = 20;
      weights.workload = 15;
      weights.availability = 15;
      weights.experience = 10;
    }
    if (criteria.prioritizeSkills && criteria.prioritizeRating) {
      weights.skills = 40;
      weights.rating = 35;
      weights.workload = 10;
      weights.availability = 10;
      weights.experience = 5;
    }

    // Count active jobs for each employee
    const activeJobCounts = await db.job.groupBy({
      by: ['assigneeId'],
      where: {
        assigneeId: { in: employees.map((e) => e.id) },
        status: { in: ['assigned', 'in_progress'] },
      },
      _count: { id: true },
    });

    const activeJobMap = new Map<string, number>();
    for (const item of activeJobCounts) {
      if (item.assigneeId) {
        activeJobMap.set(item.assigneeId, item._count.id);
      }
    }

    // Score each employee
    const recommendations: Recommendation[] = employees
      .map((employee) => {
        const skills = safeJsonParse(employee.skills, []) as string[];
        const activeJobs = activeJobMap.get(employee.id) || 0;

        // 1. Skills Match (0-100)
        const jobType = job.type.toLowerCase();
        const matchedSkills = skills.filter((s: string) =>
          s.toLowerCase().includes(jobType) || jobType.includes(s.toLowerCase())
        );
        let skillsScore = 0;
        if (matchedSkills.length > 0 && skills.length > 0) {
          // Full or partial match
          skillsScore = matchedSkills.length >= 1 ? 100 : 50;
          // If any skill exactly matches job type, max score
          const exactMatch = skills.some(
            (s: string) => s.toLowerCase() === jobType
          );
          if (exactMatch) {
            skillsScore = 100;
          } else if (matchedSkills.length > 0) {
            skillsScore = Math.min(
              100,
              Math.round((matchedSkills.length / skills.length) * 100)
            );
          }
        } else {
          // No match - give baseline score for general skills
          skillsScore = skills.length > 0 ? 20 : 0;
        }

        // 2. Workload Score (0-100): fewer active jobs = higher score
        let workloadScore = 100;
        if (activeJobs === 1) workloadScore = 75;
        else if (activeJobs === 2) workloadScore = 50;
        else if (activeJobs === 3) workloadScore = 25;
        else if (activeJobs >= 4) workloadScore = 0;

        // 3. Rating Score (0-100): map 1-5 to 0-100
        const ratingScore = Math.round((employee.rating / 5) * 100);

        // 4. Availability Score (0-100)
        let availabilityScore = 0;
        if (employee.status === 'available') availabilityScore = 100;
        else if (employee.status === 'busy') availabilityScore = 40;
        else if (employee.status === 'offline') availabilityScore = 0;

        // 5. Experience Score (0-100): based on completed jobs
        let experienceScore = 0;
        if (employee.completedJobs >= 25) experienceScore = 100;
        else if (employee.completedJobs >= 15) experienceScore = 85;
        else if (employee.completedJobs >= 10) experienceScore = 70;
        else if (employee.completedJobs >= 5) experienceScore = 50;
        else if (employee.completedJobs >= 2) experienceScore = 30;
        else if (employee.completedJobs >= 1) experienceScore = 15;
        else experienceScore = 0;

        // 6. Proximity Score (simulated, 0-100)
        // In production, this would use geolocation APIs
        // For demo, we generate a deterministic but varied score using employee ID hash
        const hash = employee.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const proximityScore = (hash * 7) % 101; // 0-100 range

        // Calculate total weighted score
        let totalWeight = weights.skills + weights.workload + weights.rating + weights.availability + weights.experience;
        let weightedScore =
          (skillsScore * weights.skills +
            workloadScore * weights.workload +
            ratingScore * weights.rating +
            availabilityScore * weights.availability +
            experienceScore * weights.experience) /
          totalWeight;

        // If proximity is prioritized, blend it in
        if (criteria.prioritizeProximity) {
          weightedScore = weightedScore * 0.8 + proximityScore * 0.2;
        }

        // Filter by max distance if specified
        if (criteria.maxDistance && criteria.maxDistance > 0) {
          // Simulate distance: convert proximity score to approximate km
          // proximityScore 100 = 0.5km, 0 = 50km
          const approxDistanceKm = 50 - (proximityScore / 100) * 49.5;
          if (approxDistanceKm > criteria.maxDistance) {
            return null; // Filter out
          }
        }

        const finalScore = Math.round(weightedScore * 10) / 10;

        // Build reasoning
        const reasoning: string[] = [];
        if (skillsScore >= 80) {
          reasoning.push(`Strong skills match (${matchedSkills.join(', ')})`);
        } else if (skillsScore >= 50) {
          reasoning.push(`Partial skills match`);
        } else {
          reasoning.push(`Limited skills overlap with job type "${job.type}"`);
        }

        if (activeJobs === 0) {
          reasoning.push('No active jobs, fully available');
        } else if (activeJobs <= 2) {
          reasoning.push(`${activeJobs} active job${activeJobs > 1 ? 's' : ''}, manageable workload`);
        } else {
          reasoning.push(`${activeJobs} active jobs, heavy workload`);
        }

        if (employee.rating >= 4) {
          reasoning.push(`Highly rated (${employee.rating}/5)`);
        } else if (employee.rating >= 3) {
          reasoning.push(`Good rating (${employee.rating}/5)`);
        } else if (employee.rating > 0) {
          reasoning.push(`Below average rating (${employee.rating}/5)`);
        }

        if (employee.status === 'available') {
          reasoning.push('Currently available');
        } else if (employee.status === 'busy') {
          reasoning.push('Currently busy with other assignments');
        } else {
          reasoning.push('Currently offline');
        }

        if (employee.completedJobs >= 10) {
          reasoning.push(`Experienced (${employee.completedJobs} completed jobs)`);
        } else if (employee.completedJobs >= 3) {
          reasoning.push(`Moderate experience (${employee.completedJobs} completed jobs)`);
        } else {
          reasoning.push(`Limited experience (${employee.completedJobs} completed jobs)`);
        }

        return {
          employee: {
            id: employee.id,
            name: employee.name,
            phone: employee.phone,
            role: employee.role,
            status: employee.status,
            avatar: employee.avatar,
            rating: employee.rating,
            completedJobs: employee.completedJobs,
            skills,
          },
          score: finalScore,
          breakdown: {
            skills: skillsScore,
            workload: workloadScore,
            rating: ratingScore,
            availability: availabilityScore,
            experience: experienceScore,
            proximity: proximityScore,
          },
          reasoning,
        } satisfies Recommendation;
      })
      .filter((r): r is Recommendation => r !== null)
      .sort((a, b) => b.score - a.score);

    // Auto-assign if requested and there are recommendations
    let assignedEmployee: Recommendation['employee'] | null = null;
    if (autoAssign && recommendations.length > 0) {
      const topMatch = recommendations[0];

      // Only auto-assign if the top match is available or has a decent score
      if (topMatch.score > 0) {
        // Update the job with the top match
        await db.job.update({
          where: { id: job.id },
          data: {
            assigneeId: topMatch.employee.id,
            assigneeName: topMatch.employee.name,
            assigneePhone: topMatch.employee.phone,
            status: 'assigned',
            assignmentStatus: 'accepted',
          },
        });

        // Update employee status to busy
        await db.employee.update({
          where: { id: topMatch.employee.id },
          data: { status: 'busy' },
        });

        assignedEmployee = topMatch.employee;
      }
    }

    // Fetch updated job if auto-assigned
    const updatedJob = autoAssign && assignedEmployee
      ? await db.job.findUnique({
          where: { id: job.id },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                avatar: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        })
      : job;

    return NextResponse.json({
      job: updatedJob,
      recommendations,
      totalCandidates: employees.length,
      scoringWeights: weights,
      autoAssigned: autoAssign && !!assignedEmployee,
      assignedTo: assignedEmployee
        ? {
            id: assignedEmployee.id,
            name: assignedEmployee.name,
            score: recommendations[0]?.score,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process smart assignment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
