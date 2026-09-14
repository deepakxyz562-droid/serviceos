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

export interface CommissionSettings {
  commissionRate?: number; // e.g. 10 for 10%
  commissionType?: 'percent' | 'flat' | 'tiered';
  flatAmount?: number; // e.g. $25 per completed job
}

export interface CommissionRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  jobId?: string | null;
  jobNumber?: string | null;
  jobTitle?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  date: string;
  revenue: number;
  commissionType: 'percent' | 'flat' | 'tiered';
  commissionRate: number;
  commissionEarned: number;
  status: 'paid' | 'pending' | 'invoiced';
}

export interface EmployeeCommissionSummary {
  employeeId: string;
  employeeName: string;
  email?: string | null;
  role?: string | null;
  commissionRate: number;
  commissionType: 'percent' | 'flat' | 'tiered';
  flatAmount: number;
  totalJobsCompleted: number;
  totalRevenue: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  paidCommission: number;
}

// ─── GET /api/commissions ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterEmployeeId = searchParams.get('employeeId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const statusParam = searchParams.get('status'); // 'all', 'paid', 'pending'

    // Tenant / Workspace isolation
    const empWhere: Record<string, unknown> = {
      deletedAt: null,
    };
    if (authUser.workspaceId) {
      empWhere.workspaceId = authUser.workspaceId;
    }

    if (filterEmployeeId) {
      empWhere.id = filterEmployeeId;
    }

    const employees = await db.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        metadataJson: true,
        workspaceId: true,
      },
    });

    const empIds = employees.map((e) => e.id);
    if (empIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalCommissionEarned: 0,
          totalRevenue: 0,
          totalJobsCompleted: 0,
          averageCommissionPerJob: 0,
        },
        technicians: [],
        records: [],
      });
    }

    // Date range filter
    const dateFilter: Record<string, unknown> = {};
    if (startDateParam) {
      dateFilter.gte = new Date(startDateParam);
    }
    if (endDateParam) {
      dateFilter.lte = new Date(endDateParam);
    }

    // 1. Fetch Invoices linked to employees
    const invoiceWhere: Record<string, unknown> = {
      employeeId: { in: empIds },
      deletedAt: null,
    };
    if (Object.keys(dateFilter).length > 0) {
      invoiceWhere.createdAt = dateFilter;
    }
    if (statusParam && statusParam !== 'all') {
      invoiceWhere.status = statusParam;
    }

    const invoices = await db.invoice.findMany({
      where: invoiceWhere,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            quotedAmount: true,
            customerName: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch completed Jobs assigned to technicians (to capture any completed jobs without invoices)
    const jobWhere: Record<string, unknown> = {
      assigneeId: { in: empIds },
      status: 'completed',
      deletedAt: null,
    };
    if (Object.keys(dateFilter).length > 0) {
      jobWhere.completedAt = dateFilter;
    }

    const completedJobs = await db.job.findMany({
      where: jobWhere,
      select: {
        id: true,
        jobNumber: true,
        title: true,
        quotedAmount: true,
        assigneeId: true,
        customerName: true,
        customerId: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // Build mapping of employee settings
    const empSettingsMap = new Map<string, CommissionSettings>();
    employees.forEach((emp) => {
      const meta = safeParseJson<Record<string, unknown>>(emp.metadataJson, {});
      empSettingsMap.set(emp.id, {
        commissionRate: typeof meta.commissionRate === 'number' ? meta.commissionRate : 10, // Default 10%
        commissionType: (meta.commissionType as 'percent' | 'flat' | 'tiered') || 'percent',
        flatAmount: typeof meta.commissionFlat === 'number' ? meta.commissionFlat : 0,
      });
    });

    const empMap = new Map(employees.map((e) => [e.id, e]));
    const records: CommissionRecord[] = [];
    const invoicedJobIds = new Set<string>();

    // Process invoices
    for (const inv of invoices) {
      if (!inv.employeeId) continue;
      const emp = empMap.get(inv.employeeId);
      if (!emp) continue;
      const settings = empSettingsMap.get(inv.employeeId) || { commissionRate: 10, commissionType: 'percent', flatAmount: 0 };
      const rate = settings.commissionRate ?? 10;
      const flat = settings.flatAmount ?? 0;
      const revenue = Number(inv.total || inv.amount || 0);

      let earned = 0;
      if (settings.commissionType === 'flat') {
        earned = flat;
      } else {
        earned = (revenue * rate) / 100;
        if (flat > 0) earned += flat;
      }

      if (inv.jobId) {
        invoicedJobIds.add(inv.jobId);
      }

      records.push({
        id: inv.id,
        employeeId: emp.id,
        employeeName: emp.name,
        jobId: inv.jobId,
        jobNumber: inv.job?.jobNumber || (inv.jobId ? `Job #${inv.jobId.slice(-4)}` : null),
        jobTitle: inv.job?.title || 'Service Invoice',
        customerId: inv.customerId,
        customerName: inv.customer?.name || inv.job?.customerName || 'Customer',
        date: (inv.paidAt || inv.createdAt).toISOString(),
        revenue,
        commissionType: settings.commissionType || 'percent',
        commissionRate: rate,
        commissionEarned: Math.round(earned * 100) / 100,
        status: inv.status === 'paid' ? 'paid' : 'pending',
      });
    }

    // Process remaining completed jobs that didn't have a direct invoice entry
    for (const job of completedJobs) {
      if (!job.assigneeId || invoicedJobIds.has(job.id)) continue;
      const emp = empMap.get(job.assigneeId);
      if (!emp) continue;
      const settings = empSettingsMap.get(job.assigneeId) || { commissionRate: 10, commissionType: 'percent', flatAmount: 0 };
      const rate = settings.commissionRate ?? 10;
      const flat = settings.flatAmount ?? 0;
      const revenue = Number(job.quotedAmount || 0);

      let earned = 0;
      if (settings.commissionType === 'flat') {
        earned = flat;
      } else {
        earned = (revenue * rate) / 100;
        if (flat > 0) earned += flat;
      }

      records.push({
        id: `job-${job.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        jobId: job.id,
        jobNumber: job.jobNumber || `Job #${job.id.slice(-4)}`,
        jobTitle: job.title,
        customerId: job.customerId,
        customerName: job.customerName || 'Customer',
        date: (job.completedAt || job.createdAt).toISOString(),
        revenue,
        commissionType: settings.commissionType || 'percent',
        commissionRate: rate,
        commissionEarned: Math.round(earned * 100) / 100,
        status: 'pending',
      });
    }

    // Sort records descending by date
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Aggregate summaries per employee
    const techSummaries: EmployeeCommissionSummary[] = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.id);
      const settings = empSettingsMap.get(emp.id) || { commissionRate: 10, commissionType: 'percent', flatAmount: 0 };
      const totalRev = empRecords.reduce((sum, r) => sum + r.revenue, 0);
      const totalEarned = empRecords.reduce((sum, r) => sum + r.commissionEarned, 0);
      const paidEarned = empRecords.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.commissionEarned, 0);
      const pendingEarned = empRecords.filter((r) => r.status !== 'paid').reduce((sum, r) => sum + r.commissionEarned, 0);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        email: emp.email,
        role: emp.role,
        commissionRate: settings.commissionRate ?? 10,
        commissionType: settings.commissionType || 'percent',
        flatAmount: settings.flatAmount ?? 0,
        totalJobsCompleted: empRecords.length,
        totalRevenue: Math.round(totalRev * 100) / 100,
        totalCommissionEarned: Math.round(totalEarned * 100) / 100,
        paidCommission: Math.round(paidEarned * 100) / 100,
        pendingCommission: Math.round(pendingEarned * 100) / 100,
      };
    });

    const totalCommissionEarned = records.reduce((sum, r) => sum + r.commissionEarned, 0);
    const totalRevenue = records.reduce((sum, r) => sum + r.revenue, 0);
    const totalJobsCompleted = records.length;
    const averageCommissionPerJob = totalJobsCompleted > 0 ? totalCommissionEarned / totalJobsCompleted : 0;

    return NextResponse.json({
      summary: {
        totalCommissionEarned: Math.round(totalCommissionEarned * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalJobsCompleted,
        averageCommissionPerJob: Math.round(averageCommissionPerJob * 100) / 100,
      },
      technicians: techSummaries,
      records,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch commissions';
    console.error('[COMMISSIONS GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT /api/commissions — Update technician commission rate ────────────────
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ADMIN_ROLES = ['owner', 'admin', 'manager', 'super_admin'];
    if (!ADMIN_ROLES.includes(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { employeeId, commissionRate, commissionType, flatAmount } = body as {
      employeeId?: string;
      commissionRate?: number;
      commissionType?: 'percent' | 'flat' | 'tiered';
      flatAmount?: number;
    };

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, metadataJson: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const meta = safeParseJson<Record<string, unknown>>(employee.metadataJson, {});
    const updatedMeta = {
      ...meta,
      commissionRate: commissionRate !== undefined ? Number(commissionRate) : (meta.commissionRate ?? 10),
      commissionType: commissionType || meta.commissionType || 'percent',
      commissionFlat: flatAmount !== undefined ? Number(flatAmount) : (meta.commissionFlat ?? 0),
    };

    const updatedEmployee = await db.employee.update({
      where: { id: employeeId },
      data: {
        metadataJson: JSON.stringify(updatedMeta),
      },
    });

    return NextResponse.json({
      success: true,
      employeeId: updatedEmployee.id,
      settings: {
        commissionRate: updatedMeta.commissionRate,
        commissionType: updatedMeta.commissionType,
        flatAmount: updatedMeta.commissionFlat,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update commission settings';
    console.error('[COMMISSIONS PUT]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
