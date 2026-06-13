import { db } from '@/lib/db';
import { getAuthUser, hashPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/employees/[id] — Get a single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        userAccount: {
          select: { id: true, name: true, email: true, avatar: true, isActive: true },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Verify the employee belongs to the same workspace
    if (employee.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] — Update an employee (including password change)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners and managers can update employees
    if (user.role !== 'owner' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners and managers can update employees' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, email, role, skills, status, password, location, isActive } = body;

    // Verify the employee exists and belongs to the same workspace
    const existingEmployee = await db.employee.findUnique({
      where: { id },
      include: { userAccount: true },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (existingEmployee.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build update data for Employee record
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (role !== undefined) updateData.role = role;
    if (skills !== undefined) updateData.skills = typeof skills === 'string' ? skills : JSON.stringify(skills);
    if (status !== undefined) updateData.status = status;
    if (location !== undefined) updateData.location = location || null;

    // Handle password change for linked user account
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(password);

      if (existingEmployee.userId) {
        // Update existing user account password
        await db.user.update({
          where: { id: existingEmployee.userId },
          data: {
            passwordHash: hashedPassword,
            isActive: isActive !== undefined ? isActive : true,
          },
        });
      } else if (email || existingEmployee.email) {
        // No user account yet but email exists — create one
        const userEmail = email || existingEmployee.email;
        if (userEmail) {
          const existingUser = await db.user.findUnique({
            where: { email: userEmail },
          });

          if (existingUser) {
            // Link existing user
            await db.user.update({
              where: { id: existingUser.id },
              data: { passwordHash: hashedPassword },
            });
            updateData.userId = existingUser.id;
          } else {
            // Create new user account
            const newUser = await db.user.create({
              data: {
                email: userEmail,
                name: name || existingEmployee.name,
                passwordHash: hashedPassword,
                role: 'employee',
                tenantId: user.tenantId,
                workspaceId: user.workspaceId,
                isActive: true,
              },
            });
            updateData.userId = newUser.id;
          }
        }
      }
    }

    // Handle email change — update linked user account if exists
    if (email !== undefined && email !== existingEmployee.email && existingEmployee.userId) {
      const existingUserWithEmail = email ? await db.user.findUnique({
        where: { email },
      }) : null;

      if (existingUserWithEmail) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }

      if (email) {
        await db.user.update({
          where: { id: existingEmployee.userId },
          data: { email, name: name || existingEmployee.name },
        });
      }
    }

    // Handle isActive toggle for user account
    if (isActive !== undefined && existingEmployee.userId) {
      await db.user.update({
        where: { id: existingEmployee.userId },
        data: { isActive },
      });
    }

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
      include: {
        userAccount: {
          select: { id: true, name: true, email: true, avatar: true, isActive: true },
        },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] — Delete an employee (soft or hard)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners can delete employees
    if (user.role !== 'owner' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners and managers can delete employees' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Verify the employee exists and belongs to the same workspace
    const existingEmployee = await db.employee.findUnique({
      where: { id },
      include: { userAccount: true, assignedJobs: { where: { status: { in: ['assigned', 'in_progress'] } } } },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (existingEmployee.workspaceId !== user.workspaceId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if employee has active jobs
    if (existingEmployee.assignedJobs.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete employee with ${existingEmployee.assignedJobs.length} active job(s). Reassign or complete them first.` },
        { status: 400 }
      );
    }

    if (hardDelete) {
      // Hard delete: remove employee record and optionally the user account
      // First, unlink the user account
      if (existingEmployee.userId) {
        // Deactivate the user account instead of deleting to preserve audit trail
        await db.user.update({
          where: { id: existingEmployee.userId },
          data: { isActive: false },
        });
      }

      // Delete the employee record
      await db.employee.delete({
        where: { id },
      });

      return NextResponse.json({ success: true, message: 'Employee permanently deleted' });
    } else {
      // Soft delete: set status to 'inactive' and deactivate user account
      const employee = await db.employee.update({
        where: { id },
        data: { status: 'inactive' },
      });

      // Deactivate linked user account
      if (existingEmployee.userId) {
        await db.user.update({
          where: { id: existingEmployee.userId },
          data: { isActive: false },
        });
      }

      return NextResponse.json({ success: true, employee, message: 'Employee deactivated' });
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
