import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/debug/login?slug=xxx&email=xxx
 *
 * Diagnostic endpoint to check why login fails for a specific tenant+email.
 * Shows what records exist in the database for the given slug and email.
 * Only available in development mode.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const slug = request.nextUrl.searchParams.get('slug') || '';
  const email = request.nextUrl.searchParams.get('email') || '';

  const result: Record<string, unknown> = {};

  // 1. Check tenant
  try {
    const tenant = await db.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        workspaces: { select: { id: true, name: true, slug: true }, take: 5 },
      },
    });
    result.tenant = tenant
      ? { id: tenant.id, name: tenant.name, slug: tenant.slug, workspaces: tenant.workspaces }
      : null;
  } catch (e) {
    result.tenantError = (e as Error).message;
  }

  // 2. Check User by email
  if (email) {
    try {
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          tenantId: true,
          workspaceId: true,
          hasPasswordHash: true, // This will fail if column doesn't exist
        },
      });
      // Manually check passwordHash existence
      const userWithHash = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { passwordHash: true },
      });
      result.user = user
        ? { ...user, hasPassword: !!userWithHash?.passwordHash }
        : null;
    } catch (e) {
      // Simpler query if select fails
      try {
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        result.user = user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              isActive: user.isActive,
              tenantId: user.tenantId,
              workspaceId: user.workspaceId,
              hasPassword: !!user.passwordHash,
            }
          : null;
      } catch (e2) {
        result.userError = (e2 as Error).message;
      }
    }

    // 3. Check Employee by email
    try {
      const employee = await db.employee.findFirst({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          userId: true,
          workspaceId: true,
        },
      });
      result.employee = employee || null;
    } catch (e) {
      result.employeeError = (e as Error).message;
    }

    // 4. If Employee has userId, check the linked User
    if (result.employee && (result.employee as Record<string, unknown>).userId) {
      try {
        const linkedUser = await db.user.findUnique({
          where: { id: (result.employee as Record<string, unknown>).userId as string },
        });
        result.linkedUser = linkedUser
          ? {
              id: linkedUser.id,
              email: linkedUser.email,
              name: linkedUser.name,
              role: linkedUser.role,
              hasPassword: !!linkedUser.passwordHash,
              tenantId: linkedUser.tenantId,
            }
          : null;
      } catch (e) {
        result.linkedUserError = (e as Error).message;
      }
    }

    // 5. List all users in the same tenant (if tenant found)
    if (result.tenant) {
      try {
        const tenantUsers = await db.user.findMany({
          where: { tenantId: (result.tenant as Record<string, unknown>).id as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        });
        result.tenantUsers = tenantUsers;
      } catch (e) {
        result.tenantUsersError = (e as Error).message;
      }

      // 6. List all employees in the tenant
      try {
        const tenantEmployees = await db.employee.findMany({
          where: { workspaceId: { not: null } },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            userId: true,
          },
        });
        result.tenantEmployees = tenantEmployees;
      } catch (e) {
        result.tenantEmployeesError = (e as Error).message;
      }
    }
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
