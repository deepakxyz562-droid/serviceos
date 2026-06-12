import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateSlug } from '@/lib/auth';

/**
 * POST /api/seed-demo
 * Seeds the database with demo user accounts, tenants, workspaces,
 * employees, customers, and jobs for testing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force || false;

    // Check if data already exists
    const existingUsers = await db.user.count();

    if (!force && existingUsers > 0) {
      return NextResponse.json({
        message: 'Demo data already exists. Use { "force": true } to re-seed.',
        counts: {
          users: existingUsers,
        },
      });
    }

    // If force, delete all data in correct order (respecting foreign keys)
    if (force) {
      await db.executionNodeData.deleteMany({});
      await db.execution.deleteMany({});
      await db.workflowVersion.deleteMany({});
      await db.webhookRegistration.deleteMany({});
      await db.webhookTestRequest.deleteMany({});
      await db.whatsAppMessageAction.deleteMany({});
      await db.contactListEntry.deleteMany({});
      await db.contactList.deleteMany({});
      await db.webhookSource.deleteMany({});
      await db.review.deleteMany({});
      await db.notification.deleteMany({});
      await db.quote.deleteMany({});
      await db.service.deleteMany({});
      await db.invoice.deleteMany({});
      await db.lead.deleteMany({});
      await db.job.deleteMany({});
      await db.subscription.deleteMany({});
      await db.apiKey.deleteMany({});
      await db.auditLog.deleteMany({});
      await db.credential.deleteMany({});
      await db.variable.deleteMany({});
      await db.template.deleteMany({});
      await db.resource.deleteMany({});
      await db.employee.deleteMany({});
      await db.customer.deleteMany({});
      await db.workflow.deleteMany({});
      await db.folder.deleteMany({});
      await db.workspace.deleteMany({});
      await db.user.deleteMany({});
      await db.tenant.deleteMany({});
    }

    const passwordHash = await hashPassword('demo123');

    // ─── Demo Account 1: Plumbing Business ─────────────────────────────
    const tenant1 = await db.tenant.create({
      data: {
        name: 'AquaFix Plumbing',
        slug: 'aquafix-plumbing',
        industry: 'plumbing',
        phone: '+12125551234',
        email: 'demo@flowforge.io',
        plan: 'growth',
        planStatus: 'active',
        planStartedAt: new Date(),
        onboardingCompleted: true,
      },
    });

    const workspace1 = await db.workspace.create({
      data: {
        name: 'AquaFix Plumbing Workspace',
        slug: 'aquafix-plumbing-workspace',
        industry: 'plumbing',
        ownerId: '', // will update
        tenantId: tenant1.id,
      },
    });

    const user1 = await db.user.create({
      data: {
        name: 'Deepak Kumar',
        email: 'demo@flowforge.io',
        passwordHash,
        phone: '+12125551234',
        role: 'owner',
        authProvider: 'email',
        tenantId: tenant1.id,
        workspaceId: workspace1.id,
      },
    });

    await db.workspace.update({
      where: { id: workspace1.id },
      data: { ownerId: user1.id },
    });

    await db.subscription.create({
      data: {
        tenantId: tenant1.id,
        plan: 'growth',
        status: 'active',
        amount: 25,
        currency: 'USD',
        billingCycle: 'monthly',
        startDate: new Date(),
        maxUsers: 20,
        maxJobs: 500,
        maxWorkflows: 50,
        featuresJson: JSON.stringify({
          whatsappIntegration: true,
          customWorkflows: true,
          apiAccess: true,
          prioritySupport: false,
        }),
      },
    });

    // ─── Demo Account 2: Cleaning Service ──────────────────────────────
    const tenant2 = await db.tenant.create({
      data: {
        name: 'SparkleClean Services',
        slug: 'sparkleclean-services',
        industry: 'cleaning',
        phone: '+12125555678',
        email: 'cleaner@flowforge.io',
        plan: 'starter',
        planStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        onboardingCompleted: true,
      },
    });

    const workspace2 = await db.workspace.create({
      data: {
        name: 'SparkleClean Workspace',
        slug: 'sparkleclean-workspace',
        industry: 'cleaning',
        ownerId: '',
        tenantId: tenant2.id,
      },
    });

    const user2 = await db.user.create({
      data: {
        name: 'Priya Sharma',
        email: 'cleaner@flowforge.io',
        passwordHash,
        phone: '+12125555678',
        role: 'owner',
        authProvider: 'email',
        tenantId: tenant2.id,
        workspaceId: workspace2.id,
      },
    });

    await db.workspace.update({
      where: { id: workspace2.id },
      data: { ownerId: user2.id },
    });

    await db.subscription.create({
      data: {
        tenantId: tenant2.id,
        plan: 'starter',
        status: 'trial',
        amount: 0,
        currency: 'USD',
        billingCycle: 'monthly',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxUsers: 1,
        maxJobs: 100,
        maxWorkflows: 10,
        featuresJson: JSON.stringify({
          whatsappIntegration: false,
          customWorkflows: false,
          apiAccess: false,
          prioritySupport: false,
        }),
      },
    });

    // ─── Seed Employees for Workspace 1 ────────────────────────────────
    const employees = await Promise.all([
      db.employee.create({
        data: {
          name: 'Ramesh Kumar',
          phone: '+919876543210',
          role: 'plumber',
          status: 'available',
          skills: '["plumbing", "drainage", "installation"]',
          rating: 4.5,
          completedJobs: 42,
          location: 'Manhattan',
          workspaceId: workspace1.id,
        },
      }),
      db.employee.create({
        data: {
          name: 'Suresh Patel',
          phone: '+919876543211',
          role: 'plumber',
          status: 'available',
          skills: '["plumbing", "emergency", "water_heater"]',
          rating: 4.2,
          completedJobs: 35,
          location: 'Brooklyn',
          workspaceId: workspace1.id,
        },
      }),
      db.employee.create({
        data: {
          name: 'Amit Sharma',
          phone: '+919876543212',
          role: 'technician',
          status: 'available',
          skills: '["hvac", "installation", "repair"]',
          rating: 4.7,
          completedJobs: 58,
          location: 'Queens',
          workspaceId: workspace1.id,
        },
      }),
      db.employee.create({
        data: {
          name: 'Priya Singh',
          phone: '+919876543213',
          role: 'cleaner',
          status: 'available',
          skills: '["cleaning", "deep_clean"]',
          rating: 4.8,
          completedJobs: 67,
          location: 'Bronx',
          workspaceId: workspace2.id,
        },
      }),
      db.employee.create({
        data: {
          name: 'Vikram Reddy',
          phone: '+919876543214',
          role: 'cleaner',
          status: 'busy',
          skills: '["cleaning", "office", "sanitization"]',
          rating: 4.3,
          completedJobs: 29,
          location: 'Manhattan',
          workspaceId: workspace2.id,
        },
      }),
    ]);

    // ─── Seed Customers ────────────────────────────────────────────────
    const customers = await Promise.all([
      db.customer.create({
        data: {
          name: 'Rahul Verma',
          phone: '+919111111111',
          email: 'rahul@example.com',
          address: '123 Park Avenue, Manhattan',
          workspaceId: workspace1.id,
        },
      }),
      db.customer.create({
        data: {
          name: 'Anita Gupta',
          phone: '+919222222222',
          email: 'anita@example.com',
          address: '456 Broadway, Brooklyn',
          workspaceId: workspace1.id,
        },
      }),
      db.customer.create({
        data: {
          name: 'Sanjay Mehta',
          phone: '+919333333333',
          email: 'sanjay@example.com',
          address: '789 5th Ave, Manhattan',
          workspaceId: workspace1.id,
        },
      }),
      db.customer.create({
        data: {
          name: 'Linda Chen',
          phone: '+19175551234',
          email: 'linda@officemgmt.com',
          address: '100 Wall Street, NYC',
          workspaceId: workspace2.id,
        },
      }),
    ]);

    // ─── Seed Jobs ─────────────────────────────────────────────────────
    const jobs = await Promise.all([
      db.job.create({
        data: {
          title: 'Kitchen Pipe Repair',
          description: 'Leaking pipe under kitchen sink needs urgent repair',
          status: 'pending',
          priority: 'high',
          type: 'plumbing',
          address: '123 Park Avenue, Manhattan',
          customerName: 'Rahul Verma',
          customerPhone: '+919111111111',
          customerId: customers[0].id,
          assigneeId: employees[0].id,
          assigneeName: 'Ramesh Kumar',
          assigneePhone: '+919876543210',
          workspaceId: workspace1.id,
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      }),
      db.job.create({
        data: {
          title: 'Water Heater Installation',
          description: 'Install new tankless water heater in basement',
          status: 'in_progress',
          priority: 'medium',
          type: 'installation',
          address: '456 Broadway, Brooklyn',
          customerName: 'Anita Gupta',
          customerPhone: '+919222222222',
          customerId: customers[1].id,
          assigneeId: employees[1].id,
          assigneeName: 'Suresh Patel',
          assigneePhone: '+919876543211',
          workspaceId: workspace1.id,
          actualStartTime: new Date(),
        },
      }),
      db.job.create({
        data: {
          title: 'AC Repair',
          description: 'Split AC not cooling - needs gas refill',
          status: 'completed',
          priority: 'urgent',
          type: 'repair',
          address: '789 5th Ave, Manhattan',
          customerName: 'Sanjay Mehta',
          customerPhone: '+919333333333',
          customerId: customers[2].id,
          assigneeId: employees[2].id,
          assigneeName: 'Amit Sharma',
          assigneePhone: '+919876543212',
          workspaceId: workspace1.id,
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          actualStartTime: new Date(Date.now() - 23 * 60 * 60 * 1000),
          actualEndTime: new Date(Date.now() - 20 * 60 * 60 * 1000),
        },
      }),
      db.job.create({
        data: {
          title: 'Office Deep Cleaning',
          description: 'Full office deep clean including carpets and windows',
          status: 'pending',
          priority: 'medium',
          type: 'cleaning',
          address: '100 Wall Street, NYC',
          customerName: 'Linda Chen',
          customerPhone: '+19175551234',
          customerId: customers[3].id,
          assigneeId: employees[3].id,
          assigneeName: 'Priya Singh',
          assigneePhone: '+919876543213',
          workspaceId: workspace2.id,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    // ─── Seed Leads ────────────────────────────────────────────────────
    const leads = await Promise.all([
      db.lead.create({
        data: {
          name: 'Michael Brown',
          phone: '+19175559876',
          email: 'michael@email.com',
          source: 'website',
          status: 'new',
          priority: 'high',
          value: 500,
          description: 'Needs full bathroom renovation',
          address: '200 West 57th St, NYC',
          serviceType: 'plumbing',
          tenantId: tenant1.id,
        },
      }),
      db.lead.create({
        data: {
          name: 'Sarah Johnson',
          phone: '+19175554321',
          email: 'sarah@email.com',
          source: 'referral',
          status: 'contacted',
          priority: 'medium',
          value: 250,
          description: 'Regular weekly apartment cleaning',
          address: '350 Central Park West, NYC',
          serviceType: 'cleaning',
          tenantId: tenant2.id,
        },
      }),
      db.lead.create({
        data: {
          name: 'David Wilson',
          phone: '+19175556789',
          email: 'david@email.com',
          source: 'google',
          status: 'qualified',
          priority: 'medium',
          value: 800,
          description: 'Complete HVAC system inspection and maintenance',
          address: '88 Greenwich St, NYC',
          serviceType: 'hvac',
          tenantId: tenant1.id,
        },
      }),
    ]);

    // ─── Seed Invoices ─────────────────────────────────────────────────
    const invNumber = () => `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    await Promise.all([
      db.invoice.create({
        data: {
          number: invNumber(),
          tenantId: tenant1.id,
          jobId: jobs[2].id,
          customerId: customers[2].id,
          employeeId: employees[2].id,
          amount: 350,
          tax: 31.50,
          discount: 0,
          total: 381.50,
          currency: 'USD',
          status: 'paid',
          paidAt: new Date(),
          itemsJson: JSON.stringify([{ description: 'AC Repair - Gas Refill', quantity: 1, rate: 350 }]),
        },
      }),
      db.invoice.create({
        data: {
          number: invNumber(),
          tenantId: tenant1.id,
          jobId: jobs[0].id,
          customerId: customers[0].id,
          employeeId: employees[0].id,
          amount: 200,
          tax: 18,
          discount: 0,
          total: 218,
          currency: 'USD',
          status: 'draft',
          itemsJson: JSON.stringify([{ description: 'Kitchen Pipe Repair', quantity: 1, rate: 200 }]),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully!',
      accounts: [
        { email: 'demo@flowforge.io', password: 'demo123', business: 'AquaFix Plumbing', plan: 'growth' },
        { email: 'cleaner@flowforge.io', password: 'demo123', business: 'SparkleClean Services', plan: 'starter (trial)' },
      ],
      data: {
        users: 2,
        tenants: 2,
        workspaces: 2,
        employees: employees.length,
        customers: customers.length,
        jobs: jobs.length,
        leads: leads.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to seed demo data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed demo data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seed-demo
 * Returns current demo data counts
 */
export async function GET() {
  try {
    const users = await db.user.count();
    const tenants = await db.tenant.count();
    const employees = await db.employee.count();
    const customers = await db.customer.count();
    const jobs = await db.job.count();
    const leads = await db.lead.count();

    return NextResponse.json({
      counts: { users, tenants, employees, customers, jobs, leads },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get counts' },
      { status: 500 }
    );
  }
}
