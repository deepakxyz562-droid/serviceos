import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * GET /api/employee/jobs/today-pack
 * ---------------------------------
 * Downloads an all-in-one offline pre-cache bundle for the field technician.
 * Includes today's assigned jobs, customer profiles, checklists, and van inventory.
 */
export async function GET(_request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve employee
    let employeeId = authUser.employeeId;
    if (!employeeId) {
      const emp = await db.employee.findFirst({
        where: { OR: [{ userId: authUser.id }, { email: authUser.email }] },
        select: { id: true, name: true, email: true, phone: true, workspaceId: true },
      });
      if (emp) {
        employeeId = emp.id;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, email: true, phone: true, workspaceId: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Time window for today (includes active jobs + anything scheduled today +/- 12 hours)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Fetch Today's Jobs for this Technician
    const jobs = await db.job.findMany({
      where: {
        assigneeId: employee.id,
        deletedAt: null,
        OR: [
          // All active in-flight jobs
          { status: { in: ['assigned', 'accepted', 'travelling', 'arrived', 'working', 'in_progress', 'paused'] } },
          // Any job scheduled for today
          {
            scheduledAt: {
              gte: new Date(startOfToday.getTime() - 12 * 60 * 60 * 1000),
              lte: new Date(endOfToday.getTime() + 12 * 60 * 60 * 1000),
            },
          },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // 2. Fetch Customer Details for these jobs
    const customerIds = Array.from(
      new Set(jobs.map((j) => j.customerId).filter((id): id is string => Boolean(id)))
    );

    const customers = customerIds.length > 0
      ? await db.customer.findMany({
          where: { id: { in: customerIds } },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            notes: true,
          },
        })
      : [];

    // 3. Fetch Linked Checklists
    const checklistIds: string[] = [];
    jobs.forEach((j) => {
      const ids = safeParseJson<string[]>(j.linkedChecklistsJson, []);
      if (Array.isArray(ids)) {
        ids.forEach((id) => {
          if (id && !checklistIds.includes(id)) checklistIds.push(id);
        });
      }
    });

    const checklists = checklistIds.length > 0
      ? await db.jobChecklist.findMany({
          where: { id: { in: checklistIds } },
        })
      : [];

    // 4. Fetch Technician Van Inventory
    const vanLocation = await db.inventoryLocation.findFirst({
      where: {
        type: 'van',
        deletedAt: null,
        OR: [
          { employeeId: employee.id },
          { name: { contains: employee.name } },
        ],
      },
      include: {
        itemLocations: {
          include: {
            item: true,
          },
        },
      },
    });

    const vanStock = vanLocation?.itemLocations.map((il) => ({
      itemId: il.itemId,
      name: il.item.name,
      sku: il.item.sku,
      unit: il.item.unit,
      quantityOnHand: il.quantityOnHand,
      minStockLevel: il.minStockLevel,
    })) || [];

    const pack = {
      packVersion: '1.0',
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
      },
      jobCount: jobs.length,
      jobs,
      customers,
      checklists,
      vanStock,
    };

    return NextResponse.json(pack);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate offline job pack';
    console.error('[OFFLINE JOB PACK GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
