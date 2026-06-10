import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateSlug } from '@/lib/auth';

/**
 * POST /api/seed-demo
 * Seeds the database with comprehensive demo data including:
 * Users, Tenants, Workspaces, Employees, Customers, Jobs, Leads,
 * Services, Campaigns, Broadcasts, Segments, Chatbots, Retargeting Rules,
 * Notifications, Reviews, Quotes, Invoices, Conversations
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
        counts: { users: existingUsers },
      });
    }

    // If force, delete all data in correct order (respecting foreign keys)
    if (force) {
      console.log('[SeedDemo] Cleaning existing data...');
      await db.retargetingLog.deleteMany({});
      await db.segmentMember.deleteMany({});
      await db.chatbotSession.deleteMany({});
      await db.campaignMessage.deleteMany({});
      await db.conversationLabel.deleteMany({});
      await db.conversationAssignment.deleteMany({});
      await db.chatLabel.deleteMany({});
      await db.inboxMessage.deleteMany({});
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
      await db.retargetingRule.deleteMany({});
      await db.segment.deleteMany({});
      await db.chatbot.deleteMany({});
      await db.campaign.deleteMany({});
      await db.campaignTemplate.deleteMany({});
      await db.conversation.deleteMany({});
      await db.customerJourney.deleteMany({});
      await db.customerPortalSession.deleteMany({});
      await db.employeeStatusLog.deleteMany({});
      await db.notificationLog.deleteMany({});
      await db.employee.deleteMany({});
      await db.customer.deleteMany({});
      await db.workflow.deleteMany({});
      await db.folder.deleteMany({});
      await db.workspace.deleteMany({});
      await db.user.deleteMany({});
      await db.tenant.deleteMany({});
      console.log('[SeedDemo] Data cleaned.');
    }

    const passwordHash = await hashPassword('demo123');

    // ══════════════════════════════════════════════════════════════════
    // DEMO ACCOUNT 1: AquaFix Plumbing (Growth Plan)
    // ══════════════════════════════════════════════════════════════════
    const tenant1 = await db.tenant.create({
      data: {
        name: 'AquaFix Plumbing',
        slug: 'aquafix-plumbing',
        industry: 'plumbing',
        phone: '+12125551234',
        email: 'demo@flowforge.io',
        address: '456 Business Ave, New York, NY 10001',
        country: 'US',
        currency: 'USD',
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
        ownerId: '',
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

    // ══════════════════════════════════════════════════════════════════
    // DEMO ACCOUNT 2: SparkleClean Services (Starter/Trial)
    // ══════════════════════════════════════════════════════════════════
    const tenant2 = await db.tenant.create({
      data: {
        name: 'SparkleClean Services',
        slug: 'sparkleclean-services',
        industry: 'cleaning',
        phone: '+12125555678',
        email: 'cleaner@flowforge.io',
        address: '789 Clean Street, New York, NY 10002',
        country: 'US',
        currency: 'USD',
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
      },
    });

    // ══════════════════════════════════════════════════════════════════
    // EMPLOYEES
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating employees...');
    const employees = await Promise.all([
      // Workspace 1 - Plumbing
      db.employee.create({
        data: { name: 'Ramesh Kumar', phone: '+919876543210', email: 'ramesh@aquafix.com', role: 'plumber', status: 'available', skills: '["plumbing", "drainage", "installation"]', rating: 4.5, completedJobs: 42, location: 'Manhattan', workspaceId: workspace1.id, performanceScore: 88 },
      }),
      db.employee.create({
        data: { name: 'Suresh Patel', phone: '+919876543211', email: 'suresh@aquafix.com', role: 'plumber', status: 'available', skills: '["plumbing", "emergency", "water_heater"]', rating: 4.2, completedJobs: 35, location: 'Brooklyn', workspaceId: workspace1.id, performanceScore: 82 },
      }),
      db.employee.create({
        data: { name: 'Amit Sharma', phone: '+919876543212', email: 'amit@aquafix.com', role: 'technician', status: 'busy', skills: '["hvac", "installation", "repair"]', rating: 4.7, completedJobs: 58, location: 'Queens', workspaceId: workspace1.id, performanceScore: 92 },
      }),
      db.employee.create({
        data: { name: 'Raj Thakur', phone: '+919876543215', email: 'raj@aquafix.com', role: 'plumber', status: 'available', skills: '["plumbing", "gas_fitting", "bathroom"]', rating: 4.6, completedJobs: 51, location: 'Manhattan', workspaceId: workspace1.id, performanceScore: 90 },
      }),
      db.employee.create({
        data: { name: 'Nikhil Joshi', phone: '+919876543216', email: 'nikhil@aquafix.com', role: 'technician', status: 'on_leave', skills: '["electrical", "plumbing", "maintenance"]', rating: 4.0, completedJobs: 22, location: 'Bronx', workspaceId: workspace1.id, onLeaveUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
      // Workspace 2 - Cleaning
      db.employee.create({
        data: { name: 'Priya Singh', phone: '+919876543213', email: 'priya@sparkleclean.com', role: 'cleaner', status: 'available', skills: '["cleaning", "deep_clean", "carpet"]', rating: 4.8, completedJobs: 67, location: 'Bronx', workspaceId: workspace2.id, performanceScore: 95 },
      }),
      db.employee.create({
        data: { name: 'Vikram Reddy', phone: '+919876543214', email: 'vikram@sparkleclean.com', role: 'cleaner', status: 'busy', skills: '["cleaning", "office", "sanitization"]', rating: 4.3, completedJobs: 29, location: 'Manhattan', workspaceId: workspace2.id, performanceScore: 78 },
      }),
      db.employee.create({
        data: { name: 'Meera Nair', phone: '+919876543217', email: 'meera@sparkleclean.com', role: 'cleaner', status: 'available', skills: '["cleaning", "residential", "kitchen"]', rating: 4.9, completedJobs: 83, location: 'Brooklyn', workspaceId: workspace2.id, performanceScore: 97 },
      }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // CUSTOMERS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating customers...');
    const customers = await Promise.all([
      // Workspace 1 customers
      db.customer.create({ data: { name: 'Rahul Verma', phone: '+919111111111', email: 'rahul@example.com', address: '123 Park Avenue, Manhattan', whatsappId: '+919111111111', workspaceId: workspace1.id } }),
      db.customer.create({ data: { name: 'Anita Gupta', phone: '+919222222222', email: 'anita@example.com', address: '456 Broadway, Brooklyn', workspaceId: workspace1.id } }),
      db.customer.create({ data: { name: 'Sanjay Mehta', phone: '+919333333333', email: 'sanjay@example.com', address: '789 5th Ave, Manhattan', whatsappId: '+919333333333', workspaceId: workspace1.id } }),
      db.customer.create({ data: { name: 'Pooja Reddy', phone: '+919444444444', email: 'pooja@example.com', address: '321 Lexington Ave, Manhattan', workspaceId: workspace1.id } }),
      db.customer.create({ data: { name: 'Karan Malhotra', phone: '+919555555555', email: 'karan@example.com', address: '654 Madison Ave, NYC', whatsappId: '+919555555555', workspaceId: workspace1.id } }),
      db.customer.create({ data: { name: 'Sneha Kapoor', phone: '+919666666666', email: 'sneha@example.com', address: '987 Amsterdam Ave, Manhattan', workspaceId: workspace1.id } }),
      db.customer.create({ data: { name: 'Arjun Patel', phone: '+919777777777', email: 'arjun@example.com', address: '147 Houston St, NYC', workspaceId: workspace1.id } }),
      // Workspace 2 customers
      db.customer.create({ data: { name: 'Linda Chen', phone: '+19175551234', email: 'linda@officemgmt.com', address: '100 Wall Street, NYC', workspaceId: workspace2.id } }),
      db.customer.create({ data: { name: 'Robert Taylor', phone: '+19175553456', email: 'robert@homeowner.com', address: '250 West End Ave, NYC', workspaceId: workspace2.id } }),
      db.customer.create({ data: { name: 'Maria Garcia', phone: '+19175557890', email: 'maria@realty.com', address: '55 River Drive, Jersey City', whatsappId: '+19175557890', workspaceId: workspace2.id } }),
      db.customer.create({ data: { name: 'James Wilson', phone: '+19175552345', email: 'james@corp.com', address: '350 5th Avenue, NYC', workspaceId: workspace2.id } }),
      db.customer.create({ data: { name: 'Emily Davis', phone: '+19175556789', email: 'emily@apartments.com', address: '200 East 74th St, NYC', workspaceId: workspace2.id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // SERVICES
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating services...');
    await Promise.all([
      db.service.create({ data: { name: 'Pipe Repair', description: 'Fix leaking or broken pipes', category: 'plumbing', basePrice: 150, duration: 60, icon: '🔧', tenantId: tenant1.id, tagsJson: '["emergency", "popular"]' } }),
      db.service.create({ data: { name: 'Water Heater Installation', description: 'Install new tankless or tank water heater', category: 'plumbing', basePrice: 450, duration: 180, icon: '🔥', tenantId: tenant1.id, tagsJson: '["installation", "premium"]' } }),
      db.service.create({ data: { name: 'Drain Cleaning', description: 'Professional drain cleaning and unclogging', category: 'plumbing', basePrice: 120, duration: 45, icon: '🚿', tenantId: tenant1.id, tagsJson: '["popular", "quick"]' } }),
      db.service.create({ data: { name: 'Bathroom Renovation', description: 'Complete bathroom plumbing renovation', category: 'plumbing', basePrice: 1200, duration: 480, icon: '🛁', tenantId: tenant1.id, tagsJson: '["premium", "renovation"]' } }),
      db.service.create({ data: { name: 'AC Repair & Service', description: 'Split/Window AC repair, gas refill, maintenance', category: 'hvac', basePrice: 200, duration: 90, icon: '❄️', tenantId: tenant1.id, tagsJson: '["seasonal", "popular"]' } }),
      db.service.create({ data: { name: 'Emergency Plumbing', description: '24/7 emergency plumbing service', category: 'plumbing', basePrice: 250, duration: 60, icon: '🚨', tenantId: tenant1.id, tagsJson: '["emergency"]' } }),
      // Cleaning services
      db.service.create({ data: { name: 'Deep Home Cleaning', description: 'Thorough deep cleaning for homes', category: 'cleaning', basePrice: 180, duration: 240, icon: '🏠', tenantId: tenant2.id, tagsJson: '["popular"]' } }),
      db.service.create({ data: { name: 'Office Cleaning', description: 'Professional office space cleaning', category: 'cleaning', basePrice: 250, duration: 180, icon: '🏢', tenantId: tenant2.id, tagsJson: '["commercial"]' } }),
      db.service.create({ data: { name: 'Carpet Cleaning', description: 'Steam and deep carpet cleaning', category: 'cleaning', basePrice: 150, duration: 120, icon: '🧹', tenantId: tenant2.id, tagsJson: '["specialized"]' } }),
      db.service.create({ data: { name: 'Move-in/Move-out Cleaning', description: 'Complete cleaning for moving', category: 'cleaning', basePrice: 350, duration: 360, icon: '📦', tenantId: tenant2.id, tagsJson: '["premium"]' } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // JOBS (various statuses)
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating jobs...');
    const jobs = await Promise.all([
      // Workspace 1 - Various statuses
      db.job.create({
        data: { title: 'Kitchen Pipe Repair', description: 'Leaking pipe under kitchen sink needs urgent repair', status: 'pending', priority: 'high', type: 'service', address: '123 Park Avenue, Manhattan', customerName: 'Rahul Verma', customerPhone: '+919111111111', customerId: customers[0].id, assigneeId: employees[0].id, assigneeName: 'Ramesh Kumar', assigneePhone: '+919876543210', workspaceId: workspace1.id, scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), estimatedDuration: 60 },
      }),
      db.job.create({
        data: { title: 'Water Heater Installation', description: 'Install new tankless water heater in basement', status: 'in_progress', priority: 'medium', type: 'installation', address: '456 Broadway, Brooklyn', customerName: 'Anita Gupta', customerPhone: '+919222222222', customerId: customers[1].id, assigneeId: employees[1].id, assigneeName: 'Suresh Patel', assigneePhone: '+919876543211', workspaceId: workspace1.id, actualStartTime: new Date(Date.now() - 1 * 60 * 60 * 1000), estimatedDuration: 180 },
      }),
      db.job.create({
        data: { title: 'AC Gas Refill & Service', description: 'Split AC not cooling - needs gas refill', status: 'completed', priority: 'urgent', type: 'repair', address: '789 5th Ave, Manhattan', customerName: 'Sanjay Mehta', customerPhone: '+919333333333', customerId: customers[2].id, assigneeId: employees[2].id, assigneeName: 'Amit Sharma', assigneePhone: '+919876543212', workspaceId: workspace1.id, scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), actualStartTime: new Date(Date.now() - 23 * 60 * 60 * 1000), actualEndTime: new Date(Date.now() - 20 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 20 * 60 * 60 * 1000), completionNotes: 'AC gas refilled and filter cleaned. Working perfectly now.', paymentMethod: 'cod', paymentStatus: 'collected', amountCollected: 200, collectedAt: new Date(Date.now() - 20 * 60 * 60 * 1000), collectedById: employees[2].id },
      }),
      db.job.create({
        data: { title: 'Bathroom Faucet Replacement', description: 'Replace old faucet with new modern fixture', status: 'assigned', priority: 'medium', type: 'service', address: '321 Lexington Ave, Manhattan', customerName: 'Pooja Reddy', customerPhone: '+919444444444', customerId: customers[3].id, assigneeId: employees[3].id, assigneeName: 'Raj Thakur', assigneePhone: '+919876543215', workspaceId: workspace1.id, scheduledAt: new Date(Date.now() + 4 * 60 * 60 * 1000), estimatedDuration: 90 },
      }),
      db.job.create({
        data: { title: 'Drain Unclogging', description: 'Main drain line clogged - needs professional cleaning', status: 'pending', priority: 'high', type: 'service', address: '654 Madison Ave, NYC', customerName: 'Karan Malhotra', customerPhone: '+919555555555', customerId: customers[4].id, workspaceId: workspace1.id, scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000), estimatedDuration: 45 },
      }),
      db.job.create({
        data: { title: 'Emergency Burst Pipe', description: 'Burst pipe in basement - flooding!', status: 'in_progress', priority: 'urgent', type: 'emergency', address: '987 Amsterdam Ave, Manhattan', customerName: 'Sneha Kapoor', customerPhone: '+919666666666', customerId: customers[5].id, assigneeId: employees[0].id, assigneeName: 'Ramesh Kumar', assigneePhone: '+919876543210', workspaceId: workspace1.id, actualStartTime: new Date(Date.now() - 30 * 60 * 1000) },
      }),
      db.job.create({
        data: { title: 'Complete Bathroom Renovation', description: 'Full bathroom plumbing overhaul', status: 'completed', priority: 'medium', type: 'renovation', address: '147 Houston St, NYC', customerName: 'Arjun Patel', customerPhone: '+919777777777', customerId: customers[6].id, assigneeId: employees[3].id, assigneeName: 'Raj Thakur', assigneePhone: '+919876543215', workspaceId: workspace1.id, scheduledAt: new Date(Date.now() - 72 * 60 * 60 * 1000), actualStartTime: new Date(Date.now() - 72 * 60 * 60 * 1000), actualEndTime: new Date(Date.now() - 48 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), completionNotes: 'Bathroom fully renovated. Customer very satisfied.', paymentMethod: 'online', paymentStatus: 'collected', amountCollected: 1200, collectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), collectedById: employees[3].id },
      }),
      db.job.create({
        data: { title: 'Toilet Repair', description: 'Running toilet needs flapper replacement', status: 'cancelled', priority: 'low', type: 'service', address: '123 Park Avenue, Manhattan', customerName: 'Rahul Verma', customerPhone: '+919111111111', customerId: customers[0].id, workspaceId: workspace1.id, notes: 'Customer cancelled - fixed it themselves' },
      }),
      // Workspace 2 - Cleaning jobs
      db.job.create({
        data: { title: 'Office Deep Cleaning', description: 'Full office deep clean including carpets and windows', status: 'pending', priority: 'medium', type: 'service', address: '100 Wall Street, NYC', customerName: 'Linda Chen', customerPhone: '+19175551234', customerId: customers[7].id, assigneeId: employees[5].id, assigneeName: 'Priya Singh', assigneePhone: '+919876543213', workspaceId: workspace2.id, scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), estimatedDuration: 240 },
      }),
      db.job.create({
        data: { title: 'Apartment Move-out Cleaning', description: '3BR apartment move-out deep clean', status: 'in_progress', priority: 'high', type: 'service', address: '250 West End Ave, NYC', customerName: 'Robert Taylor', customerPhone: '+19175553456', customerId: customers[8].id, assigneeId: employees[6].id, assigneeName: 'Vikram Reddy', assigneePhone: '+919876543214', workspaceId: workspace2.id, actualStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000), estimatedDuration: 360 },
      }),
      db.job.create({
        data: { title: 'Weekly Home Cleaning', description: 'Regular weekly home cleaning service', status: 'completed', priority: 'low', type: 'service', address: '55 River Drive, Jersey City', customerName: 'Maria Garcia', customerPhone: '+19175557890', customerId: customers[9].id, assigneeId: employees[7].id, assigneeName: 'Meera Nair', assigneePhone: '+919876543217', workspaceId: workspace2.id, scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000), actualStartTime: new Date(Date.now() - 48 * 60 * 60 * 1000), actualEndTime: new Date(Date.now() - 45 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 45 * 60 * 60 * 1000), completionNotes: 'Weekly cleaning completed. All areas spotless.', paymentMethod: 'online', paymentStatus: 'collected', amountCollected: 180, collectedAt: new Date(Date.now() - 45 * 60 * 60 * 1000), collectedById: employees[7].id },
      }),
      db.job.create({
        data: { title: 'Corporate Office Carpet Cleaning', description: 'Steam cleaning for 5000 sqft office', status: 'assigned', priority: 'medium', type: 'service', address: '350 5th Avenue, NYC', customerName: 'James Wilson', customerPhone: '+19175552345', customerId: customers[10].id, assigneeId: employees[5].id, assigneeName: 'Priya Singh', assigneePhone: '+919876543213', workspaceId: workspace2.id, scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000), estimatedDuration: 300 },
      }),
      db.job.create({
        data: { title: 'Studio Apartment Cleaning', description: 'Move-in cleaning for studio apartment', status: 'pending', priority: 'low', type: 'service', address: '200 East 74th St, NYC', customerName: 'Emily Davis', customerPhone: '+19175556789', customerId: customers[11].id, workspaceId: workspace2.id, scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000), estimatedDuration: 180 },
      }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // LEADS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating leads...');
    const leads = await Promise.all([
      db.lead.create({ data: { name: 'Michael Brown', phone: '+19175559876', email: 'michael@email.com', source: 'website', status: 'new', priority: 'high', value: 500, description: 'Needs full bathroom renovation', address: '200 West 57th St, NYC', serviceType: 'plumbing', tenantId: tenant1.id, assignedToId: employees[0].id } }),
      db.lead.create({ data: { name: 'Sarah Johnson', phone: '+19175554321', email: 'sarah@email.com', source: 'referral', status: 'contacted', priority: 'medium', value: 250, description: 'Regular weekly apartment cleaning', address: '350 Central Park West, NYC', serviceType: 'cleaning', tenantId: tenant2.id } }),
      db.lead.create({ data: { name: 'David Wilson', phone: '+19175556789', email: 'david@email.com', source: 'google', status: 'qualified', priority: 'medium', value: 800, description: 'Complete HVAC system inspection and maintenance', address: '88 Greenwich St, NYC', serviceType: 'hvac', tenantId: tenant1.id, assignedToId: employees[2].id } }),
      db.lead.create({ data: { name: 'Nancy Parker', phone: '+19175551111', email: 'nancy@email.com', source: 'whatsapp', status: 'new', priority: 'high', value: 350, description: 'Emergency pipe burst in kitchen', address: '400 Park Ave, NYC', serviceType: 'plumbing', tenantId: tenant1.id } }),
      db.lead.create({ data: { name: 'Tom Richards', phone: '+19175552222', email: 'tom@realty.com', source: 'facebook', status: 'contacted', priority: 'low', value: 150, description: 'Office cleaning quote needed', address: '150 Broadway, NYC', serviceType: 'cleaning', tenantId: tenant2.id } }),
      db.lead.create({ data: { name: 'Lisa Chang', phone: '+19175553333', email: 'lisa@email.com', source: 'website', status: 'qualified', priority: 'medium', value: 2000, description: 'Complete house plumbing overhaul', address: '99 Wall St, NYC', serviceType: 'plumbing', tenantId: tenant1.id } }),
      db.lead.create({ data: { name: 'Alex Morgan', phone: '+19175554444', email: 'alex@email.com', source: 'google', status: 'won', priority: 'high', value: 450, description: 'AC maintenance contract', address: '777 3rd Ave, NYC', serviceType: 'hvac', tenantId: tenant1.id, convertedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }),
      db.lead.create({ data: { name: 'Rachel Green', phone: '+19175555555', email: 'rachel@email.com', source: 'referral', status: 'lost', priority: 'low', value: 180, description: 'One-time deep cleaning', address: '500 W 42nd St, NYC', serviceType: 'cleaning', tenantId: tenant2.id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // INVOICES
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating invoices...');
    const invNumber = () => `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await Promise.all([
      db.invoice.create({ data: { number: invNumber(), tenantId: tenant1.id, jobId: jobs[2].id, customerId: customers[2].id, employeeId: employees[2].id, amount: 200, tax: 18, discount: 0, total: 218, currency: 'USD', status: 'paid', paidAt: new Date(Date.now() - 20 * 60 * 60 * 1000), itemsJson: JSON.stringify([{ description: 'AC Repair - Gas Refill', quantity: 1, rate: 200 }]) } }),
      db.invoice.create({ data: { number: invNumber(), tenantId: tenant1.id, jobId: jobs[6].id, customerId: customers[6].id, employeeId: employees[3].id, amount: 1200, tax: 108, discount: 100, total: 1208, currency: 'USD', status: 'paid', paidAt: new Date(Date.now() - 48 * 60 * 60 * 1000), itemsJson: JSON.stringify([{ description: 'Complete Bathroom Renovation', quantity: 1, rate: 1200 }]) } }),
      db.invoice.create({ data: { number: invNumber(), tenantId: tenant1.id, jobId: jobs[0].id, customerId: customers[0].id, employeeId: employees[0].id, amount: 150, tax: 13.50, discount: 0, total: 163.50, currency: 'USD', status: 'draft', itemsJson: JSON.stringify([{ description: 'Kitchen Pipe Repair', quantity: 1, rate: 150 }]) } }),
      db.invoice.create({ data: { number: invNumber(), tenantId: tenant1.id, jobId: jobs[5].id, customerId: customers[5].id, employeeId: employees[0].id, amount: 250, tax: 22.50, discount: 0, total: 272.50, currency: 'USD', status: 'pending', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), itemsJson: JSON.stringify([{ description: 'Emergency Burst Pipe Repair', quantity: 1, rate: 250 }]) } }),
      db.invoice.create({ data: { number: invNumber(), tenantId: tenant2.id, jobId: jobs[10].id, customerId: customers[9].id, employeeId: employees[7].id, amount: 180, tax: 16.20, discount: 0, total: 196.20, currency: 'USD', status: 'paid', paidAt: new Date(Date.now() - 45 * 60 * 60 * 1000), itemsJson: JSON.stringify([{ description: 'Weekly Home Cleaning', quantity: 1, rate: 180 }]) } }),
      db.invoice.create({ data: { number: invNumber(), tenantId: tenant2.id, jobId: jobs[8].id, customerId: customers[7].id, employeeId: employees[5].id, amount: 250, tax: 22.50, discount: 25, total: 247.50, currency: 'USD', status: 'pending', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), itemsJson: JSON.stringify([{ description: 'Office Deep Cleaning', quantity: 1, rate: 250 }]) } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // CAMPAIGNS & BROADCASTS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating campaigns and broadcasts...');
    await Promise.all([
      // Campaigns (Workspace 1)
      db.campaign.create({ data: { name: 'Summer AC Service Promo', description: 'Get 20% off on AC repair and gas refill this summer', type: 'promotional', status: 'completed', audienceType: 'all', messageContent: '🔥 Summer Deal! Get 20% off on AC repair & gas refill. Book now and stay cool! Reply COOL to schedule.', totalRecipients: 12, sentCount: 12, deliveredCount: 11, readCount: 8, clickedCount: 5, repliedCount: 3, convertedCount: 2, revenueGenerated: 400, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id } }),
      db.campaign.create({ data: { name: 'Winter Plumbing Check-up', description: 'Remind customers about winter plumbing maintenance', type: 'service_reminder', status: 'running', audienceType: 'segment', messageContent: '❄️ Winter is coming! Get your plumbing checked before pipes freeze. Book a check-up for just $99. Reply CHECK to schedule.', totalRecipients: 8, sentCount: 5, deliveredCount: 5, readCount: 3, clickedCount: 1, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id } }),
      db.campaign.create({ data: { name: 'New Customer Welcome', description: 'Welcome message for new customers', type: 'follow_up', status: 'scheduled', audienceType: 'all', messageContent: '👋 Welcome to AquaFix Plumbing! We are here for all your plumbing needs. Save our number for emergencies!', scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), totalRecipients: 3, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id } }),
      db.campaign.create({ data: { name: 'Re-engagement: Inactive Customers', description: 'Reach out to customers who haven\'t booked in 90 days', type: 're_engagement', status: 'draft', audienceType: 'segment', messageContent: 'We miss you! 💙 Book any service this week and get 15% off. Reply BOOK to see available slots.', totalRecipients: 0, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id } }),

      // Campaigns (Workspace 2)
      db.campaign.create({ data: { name: 'Spring Cleaning Sale', description: 'Special spring cleaning packages', type: 'seasonal', status: 'completed', audienceType: 'all', messageContent: '🌸 Spring Cleaning Sale! Deep clean your home for just $149. Limited spots! Reply SPRING to book.', totalRecipients: 5, sentCount: 5, deliveredCount: 5, readCount: 4, clickedCount: 2, repliedCount: 1, convertedCount: 1, revenueGenerated: 149, tenantId: tenant2.id, workspaceId: workspace2.id, createdById: user2.id } }),

      // Broadcasts (type: 'broadcast')
      db.campaign.create({ data: { name: 'Holiday Hours Broadcast', description: 'Inform customers about holiday schedule', type: 'broadcast', status: 'completed', audienceType: 'all', messageContent: '🎄 Holiday Notice: We will be closed Dec 25-26. Emergency services available! Call +12125551234.', totalRecipients: 12, sentCount: 12, deliveredCount: 12, readCount: 10, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id } }),
      db.campaign.create({ data: { name: 'New Service Launch: Smart Home Plumbing', description: 'Announcing our new smart home plumbing services', type: 'broadcast', status: 'scheduled', audienceType: 'all', messageContent: '🚀 Exciting news! We now offer Smart Home Plumbing solutions. Automate leak detection & water control! Reply SMART for details.', scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000), totalRecipients: 12, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id } }),
      db.campaign.create({ data: { name: 'Weekly Cleaning Tips', description: 'Weekly tips broadcast for cleaning customers', type: 'broadcast', status: 'draft', audienceType: 'all', messageContent: '💡 Cleaning Tip of the Week: Mix vinegar and baking soda for a natural drain cleaner! Save this message for reference.', totalRecipients: 5, tenantId: tenant2.id, workspaceId: workspace2.id, createdById: user2.id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // CAMPAIGN TEMPLATES
    // ══════════════════════════════════════════════════════════════════
    await Promise.all([
      db.campaignTemplate.create({ data: { name: 'Service Reminder', description: 'Remind customers about upcoming or overdue service', category: 'reminder', content: 'Hi {{name}}, this is a reminder about your {{service}} appointment on {{date}}. Reply YES to confirm or RESCHEDULE to change.', variablesJson: '["name", "service", "date"]', isApproved: true, tenantId: tenant1.id, workspaceId: workspace1.id, usageCount: 15 } }),
      db.campaignTemplate.create({ data: { name: 'Promotional Offer', description: 'General promotional offer template', category: 'promotional', content: '🎉 Special Offer! Get {{discount}}% off on {{service}} this week only! Use code {{code}}. Reply BOOK to schedule.', variablesJson: '["discount", "service", "code"]', isApproved: true, tenantId: tenant1.id, workspaceId: workspace1.id, usageCount: 8 } }),
      db.campaignTemplate.create({ data: { name: 'Follow-up After Service', description: 'Follow up after a completed service', category: 'follow_up', content: 'Hi {{name}}, we hope you\'re satisfied with our {{service}}! Rate us ⭐⭐⭐⭐⭐ if you loved it. Need anything else? Just reply!', variablesJson: '["name", "service"]', isApproved: true, tenantId: tenant1.id, workspaceId: workspace1.id, usageCount: 22 } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // SEGMENTS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating segments...');
    await Promise.all([
      db.segment.create({ data: { name: 'High-Value Customers', description: 'Customers with lifetime value > $500', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'lifetimeValue', operator: 'greater_than', value: 500 }]), matchLogic: 'and', memberCount: 3, color: '#10b981', icon: '💎', tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.segment.create({ data: { name: 'Inactive 90 Days', description: 'Customers who haven\'t booked in 90+ days', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'lastBookingDays', operator: 'greater_than', value: 90 }]), matchLogic: 'and', memberCount: 2, color: '#f59e0b', icon: '⏰', tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.segment.create({ data: { name: 'New Customers (30 days)', description: 'Customers added in the last 30 days', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'createdAt', operator: 'within_last', value: 30, unit: 'days' }]), matchLogic: 'and', memberCount: 4, color: '#3b82f6', icon: '🆕', tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.segment.create({ data: { name: 'Emergency Service Users', description: 'Customers who have used emergency services', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'jobType', operator: 'equals', value: 'emergency' }]), matchLogic: 'and', memberCount: 1, color: '#ef4444', icon: '🚨', tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.segment.create({ data: { name: 'Regular Cleaners', description: 'Customers with recurring cleaning contracts', type: 'dynamic', rulesJson: JSON.stringify([{ field: 'bookingFrequency', operator: 'greater_than', value: 3 }]), matchLogic: 'and', memberCount: 2, color: '#8b5cf6', icon: '🔄', tenantId: tenant2.id, workspaceId: workspace2.id } }),
      db.segment.create({ data: { name: 'Corporate Clients', description: 'Business/corporate cleaning customers', type: 'static', rulesJson: '[]', matchLogic: 'and', memberCount: 2, color: '#06b6d4', icon: '🏢', tenantId: tenant2.id, workspaceId: workspace2.id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // CHATBOTS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating chatbots...');
    await Promise.all([
      db.chatbot.create({
        data: {
          name: 'AquaFix Booking Bot', description: 'Handles initial customer inquiries and booking for plumbing services', status: 'active', triggerType: 'new_conversation', triggerConfigJson: JSON.stringify({ keywords: ['book', 'service', 'plumbing', 'help'] }),
          nodesJson: JSON.stringify([
            { id: 'start', type: 'message', data: { text: 'Welcome to AquaFix Plumbing! 🛠️ How can I help you today?\n\n1. Book a Service\n2. Emergency Repair\n3. Check Job Status\n4. Talk to an Agent' } },
            { id: 'book', type: 'option', data: { text: 'What service do you need?\n\n1. Pipe Repair\n2. Water Heater\n3. Drain Cleaning\n4. AC Service' } },
            { id: 'emergency', type: 'message', data: { text: '🚨 Emergency detected! Connecting you with our on-call plumber immediately. Please describe your emergency.' } },
            { id: 'status', type: 'message', data: { text: 'Please share your job ID or phone number to check your job status.' } },
            { id: 'agent', type: 'handover', data: { text: 'Connecting you with a live agent. Please hold...' } },
          ]),
          edgesJson: JSON.stringify([
            { from: 'start', to: 'book', condition: '1' }, { from: 'start', to: 'emergency', condition: '2' }, { from: 'start', to: 'status', condition: '3' }, { from: 'start', to: 'agent', condition: '4' },
          ]),
          startNodeId: 'start', isDefault: true, totalSessions: 145, activeSessions: 3, completionRate: 72.5, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id,
        },
      }),
      db.chatbot.create({
        data: {
          name: 'After-Hours Bot', description: 'Handles customer queries outside business hours', status: 'active', triggerType: 'no_agent_response', triggerConfigJson: JSON.stringify({ delayMinutes: 5 }),
          nodesJson: JSON.stringify([
            { id: 'greeting', type: 'message', data: { text: 'Thanks for reaching out! 🌙 Our team is currently offline but we\'ll get back to you first thing in the morning.\n\nIn the meantime:\n1. Leave a message\n2. Emergency? Call +12125551234' } },
            { id: 'message', type: 'input', data: { text: 'Please type your message and we\'ll respond ASAP!' } },
          ]),
          edgesJson: JSON.stringify([{ from: 'greeting', to: 'message', condition: '1' }]),
          startNodeId: 'greeting', totalSessions: 89, activeSessions: 1, completionRate: 85.0, tenantId: tenant1.id, workspaceId: workspace1.id, createdById: user1.id,
        },
      }),
      db.chatbot.create({
        data: {
          name: 'SparkleClean Booking Bot', description: 'Handles cleaning service inquiries and scheduling', status: 'draft', triggerType: 'keyword', triggerConfigJson: JSON.stringify({ keywords: ['clean', 'booking', 'schedule'] }),
          nodesJson: JSON.stringify([
            { id: 'welcome', type: 'message', data: { text: 'Welcome to SparkleClean! ✨\n\n1. Book Cleaning\n2. Get Quote\n3. Reschedule' } },
          ]),
          edgesJson: '[]', startNodeId: 'welcome', totalSessions: 0, activeSessions: 0, completionRate: 0, tenantId: tenant2.id, workspaceId: workspace2.id, createdById: user2.id,
        },
      }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // RETARGETING RULES
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating retargeting rules...');
    await Promise.all([
      db.retargetingRule.create({ data: { name: 'Win-back Inactive Customers', description: 'Send offer to customers inactive for 30+ days', triggerType: 'no_booking_days', triggerConfigJson: JSON.stringify({ days: 30 }), actionType: 'special_offer', actionConfigJson: JSON.stringify({ message: 'We miss you! 💙 Get 20% off your next booking. Reply BOOK to schedule.', discount: 20 }), status: 'active', priority: 1, cooldownHours: 168, maxTriggers: 3, totalTriggers: 12, tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.retargetingRule.create({ data: { name: 'Unpaid Invoice Follow-up', description: 'Remind customers about unpaid invoices after 7 days', triggerType: 'unpaid_invoice', triggerConfigJson: JSON.stringify({ daysOverdue: 7 }), actionType: 'whatsapp_reminder', actionConfigJson: JSON.stringify({ message: 'Hi {{name}}, your invoice #{{invoiceNumber}} for ${{amount}} is overdue. Please pay at your earliest convenience. Pay online: {{paymentLink}}' }), status: 'active', priority: 2, cooldownHours: 72, maxTriggers: 4, totalTriggers: 8, tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.retargetingRule.create({ data: { name: 'Quote Not Accepted', description: 'Follow up on quotes not accepted within 3 days', triggerType: 'quote_not_accepted', triggerConfigJson: JSON.stringify({ days: 3 }), actionType: 'follow_up_sequence', actionConfigJson: JSON.stringify({ steps: [{ message: 'Hi {{name}}, still thinking about our quote? We can offer a 5% discount if you book today!', delayHours: 0 }] }), status: 'active', priority: 3, cooldownHours: 48, maxTriggers: 2, totalTriggers: 5, tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.retargetingRule.create({ data: { name: 'Click No Conversion', description: 'Follow up with customers who clicked but didn\'t convert', triggerType: 'clicked_no_conversion', triggerConfigJson: JSON.stringify({ hoursAfterClick: 24 }), actionType: 'special_offer', actionConfigJson: JSON.stringify({ message: 'Still interested? 🎯 Book within 24 hours and get free add-on service!', discount: 10 }), status: 'paused', priority: 4, cooldownHours: 336, maxTriggers: 2, totalTriggers: 3, tenantId: tenant1.id, workspaceId: workspace1.id } }),
      db.retargetingRule.create({ data: { name: 'Cleaning Service Reminder', description: 'Remind cleaning customers to rebook after 2 weeks', triggerType: 'no_booking_days', triggerConfigJson: JSON.stringify({ days: 14 }), actionType: 'whatsapp_reminder', actionConfigJson: JSON.stringify({ message: 'Time for your next cleaning? 🧹 Book your regular slot and keep your space sparkling!' }), status: 'active', priority: 1, cooldownHours: 168, maxTriggers: 4, totalTriggers: 15, tenantId: tenant2.id, workspaceId: workspace2.id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // REVIEWS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating reviews...');
    await Promise.all([
      db.review.create({ data: { rating: 5, comment: 'Excellent AC repair service! Amit was very professional and quick.', jobId: jobs[2].id, customerId: customers[2].id, employeeId: employees[2].id, tenantId: tenant1.id, source: 'internal', status: 'published', npsScore: 10 } }),
      db.review.create({ data: { rating: 4, comment: 'Good bathroom renovation work. Slight delay but quality was great.', jobId: jobs[6].id, customerId: customers[6].id, employeeId: employees[3].id, tenantId: tenant1.id, source: 'whatsapp', status: 'published', npsScore: 8 } }),
      db.review.create({ data: { rating: 5, comment: 'Amazing cleaning service! Will definitely book again.', jobId: jobs[10].id, customerId: customers[9].id, employeeId: employees[7].id, tenantId: tenant2.id, source: 'internal', status: 'published', npsScore: 9 } }),
      db.review.create({ data: { rating: 3, comment: 'Service was okay but the plumber arrived late.', tenantId: tenant1.id, source: 'google', status: 'published', npsScore: 5, employeeId: employees[1].id } }),
      db.review.create({ data: { rating: 5, comment: 'Best plumbing service in NYC! Fixed our emergency in 30 minutes.', tenantId: tenant1.id, source: 'whatsapp', status: 'published', npsScore: 10, employeeId: employees[0].id } }),
      db.review.create({ data: { rating: 2, comment: 'Cleaning could have been more thorough in the bathrooms.', tenantId: tenant2.id, source: 'internal', status: 'flagged', npsScore: 4, employeeId: employees[6].id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating notifications...');
    await Promise.all([
      db.notification.create({ data: { title: 'New Job Assigned', message: 'Kitchen Pipe Repair has been assigned to Ramesh Kumar', type: 'job', userId: user1.id, tenantId: tenant1.id, read: false } }),
      db.notification.create({ data: { title: 'Job Completed', message: 'AC Gas Refill & Service has been marked as completed', type: 'job', userId: user1.id, tenantId: tenant1.id, read: true } }),
      db.notification.create({ data: { title: 'New Lead', message: 'Michael Brown submitted a lead for bathroom renovation ($500)', type: 'lead', userId: user1.id, tenantId: tenant1.id, read: false } }),
      db.notification.create({ data: { title: 'Payment Received', message: 'Payment of $218 received for AC Repair - Gas Refill', type: 'payment', userId: user1.id, tenantId: tenant1.id, read: true } }),
      db.notification.create({ data: { title: 'Campaign Completed', message: 'Summer AC Service Promo campaign completed with 2 conversions', type: 'campaign', userId: user1.id, tenantId: tenant1.id, read: true } }),
      db.notification.create({ data: { title: 'New Review', message: 'Sanjay Mehta left a 5-star review for AC repair', type: 'review', userId: user1.id, tenantId: tenant1.id, read: false } }),
      db.notification.create({ data: { title: 'Emergency Alert', message: 'Emergency Burst Pipe job assigned - customer reporting flooding!', type: 'job', userId: user1.id, tenantId: tenant1.id, read: false } }),
      db.notification.create({ data: { title: 'Subscription Trial Ending', message: 'Your trial expires in 7 days. Upgrade to continue using all features.', type: 'billing', userId: user2.id, tenantId: tenant2.id, read: false } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // QUOTES
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating quotes...');
    await Promise.all([
      db.quote.create({ data: { title: 'Bathroom Renovation Quote', description: 'Complete bathroom plumbing renovation including fixtures', itemsJson: JSON.stringify([{ description: 'Faucet replacement', quantity: 2, rate: 85 }, { description: 'Shower head installation', quantity: 1, rate: 120 }, { description: 'Pipe rerouting', quantity: 1, rate: 350 }, { description: 'Labor (8 hours)', quantity: 8, rate: 80 }]), subtotal: 880, tax: 79.20, discount: 50, total: 909.20, status: 'sent', tenantId: tenant1.id, customerId: customers[6].id, customerName: 'Arjun Patel', customerEmail: 'arjun@example.com', customerPhone: '+919777777777', sentVia: 'whatsapp', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), validUntil: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), quoteNumber: 'QT-001', createdById: user1.id } }),
      db.quote.create({ data: { title: 'Office Cleaning Contract - Monthly', description: 'Monthly office cleaning contract for 12 months', itemsJson: JSON.stringify([{ description: 'Weekly office cleaning (4x/month)', quantity: 4, rate: 250 }, { description: 'Carpet deep clean (monthly)', quantity: 1, rate: 150 }]), subtotal: 1150, tax: 103.50, discount: 100, total: 1153.50, status: 'draft', tenantId: tenant2.id, customerId: customers[7].id, customerName: 'Linda Chen', customerEmail: 'linda@officemgmt.com', customerPhone: '+19175551234', validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), quoteNumber: 'QT-002', createdById: user2.id } }),
      db.quote.create({ data: { title: 'Emergency Plumbing Package', description: 'One-time emergency plumbing + follow-up check', itemsJson: JSON.stringify([{ description: 'Emergency call-out', quantity: 1, rate: 250 }, { description: 'Follow-up inspection (within 7 days)', quantity: 1, rate: 0 }]), subtotal: 250, tax: 22.50, discount: 0, total: 272.50, status: 'accepted', tenantId: tenant1.id, customerId: customers[5].id, customerName: 'Sneha Kapoor', customerEmail: 'sneha@example.com', customerPhone: '+919666666666', sentVia: 'whatsapp', sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), approvedAt: new Date(), quoteNumber: 'QT-003', createdById: user1.id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // CONVERSATIONS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating conversations...');
    await Promise.all([
      db.conversation.create({
        data: { conversationId: 'wa_conv_001', customerPhone: '+919111111111', customerName: 'Rahul Verma', customerId: customers[0].id, status: 'active', currentStage: 'booking', intentDetected: 'plumbing', intentConfidence: 0.92, lastMessageAt: new Date(), lastMessageBody: 'I need a plumber for my kitchen sink urgently', lastDirection: 'inbound', messagesJson: JSON.stringify([
          { from: 'customer', text: 'Hi, I have a leaking pipe', time: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
          { from: 'bot', text: 'Hello! 👋 I can help you with that. What type of plumbing issue?', time: new Date(Date.now() - 29 * 60 * 1000).toISOString() },
          { from: 'customer', text: 'Kitchen sink pipe is leaking badly', time: new Date(Date.now() - 28 * 60 * 1000).toISOString() },
          { from: 'bot', text: 'I understand - that sounds urgent! Let me check our available plumbers near Manhattan. Would you like to:\n1. Book emergency service ($250)\n2. Schedule for today ($150)', time: new Date(Date.now() - 27 * 60 * 1000).toISOString() },
          { from: 'customer', text: 'I need a plumber for my kitchen sink urgently', time: new Date().toISOString() },
        ]), tenantId: tenant1.id, workspaceId: workspace1.id },
      }),
      db.conversation.create({
        data: { conversationId: 'wa_conv_002', customerPhone: '+19175557890', customerName: 'Maria Garcia', customerId: customers[9].id, status: 'active', currentStage: 'in_progress', intentDetected: 'cleaning', intentConfidence: 0.88, lastMessageAt: new Date(Date.now() - 15 * 60 * 1000), lastMessageBody: 'Can you reschedule to Friday?', lastDirection: 'inbound', messagesJson: JSON.stringify([
          { from: 'customer', text: 'Hi, I want to reschedule my cleaning', time: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
          { from: 'bot', text: 'Of course, Maria! When would you like to reschedule?', time: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
          { from: 'customer', text: 'Can you reschedule to Friday?', time: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
        ]), tenantId: tenant2.id, workspaceId: workspace2.id },
      }),
      db.conversation.create({
        data: { conversationId: 'wa_conv_003', customerPhone: '+919333333333', customerName: 'Sanjay Mehta', customerId: customers[2].id, status: 'completed', currentStage: 'review', intentDetected: 'service_feedback', intentConfidence: 0.75, lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), lastMessageBody: 'Great service! 5 stars ⭐⭐⭐⭐⭐', lastDirection: 'inbound', messagesJson: JSON.stringify([
          { from: 'agent', text: 'Hi Sanjay! Your AC repair is complete. How was your experience?', time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
          { from: 'customer', text: 'Great service! 5 stars ⭐⭐⭐⭐⭐', time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        ]), tenantId: tenant1.id, workspaceId: workspace1.id },
      }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // RESOURCES
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating resources...');
    await Promise.all([
      db.resource.create({ data: { name: 'Delivery Van #1', phone: '+12125559001', type: 'vehicle', status: 'available', skills: '["delivery", "transport"]', location: 'Manhattan Depot', rating: 0, completedJobs: 120, workspaceId: workspace1.id } }),
      db.resource.create({ data: { name: 'Tool Kit - Advanced', phone: '', type: 'equipment', status: 'available', skills: '["plumbing", "hvac"]', location: 'Main Office', rating: 0, completedJobs: 0, workspaceId: workspace1.id } }),
      db.resource.create({ data: { name: 'Cleaning Cart Pro', phone: '', type: 'equipment', status: 'in_use', skills: '["cleaning"]', location: 'Wall Street Office', rating: 0, completedJobs: 0, workspaceId: workspace2.id } }),
    ]);

    // ══════════════════════════════════════════════════════════════════
    // ANALYTICS SNAPSHOTS
    // ══════════════════════════════════════════════════════════════════
    console.log('[SeedDemo] Creating analytics snapshots...');
    const analyticsData = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const baseJobs = 2 + Math.floor(Math.random() * 4);
      const baseRevenue = baseJobs * (150 + Math.floor(Math.random() * 200));
      analyticsData.push(
        { date: dateStr, metric: 'jobs_completed', value: baseJobs, tenantId: tenant1.id },
        { date: dateStr, metric: 'revenue', value: baseRevenue, tenantId: tenant1.id },
        { date: dateStr, metric: 'leads_created', value: Math.floor(Math.random() * 3) + 1, tenantId: tenant1.id },
        { date: dateStr, metric: 'avg_response_time', value: 5 + Math.random() * 20, tenantId: tenant1.id },
      );
    }
    await db.analyticsSnapshot.createMany({ data: analyticsData, skipDuplicates: true });

    // ══════════════════════════════════════════════════════════════════
    // FINAL COUNTS
    // ══════════════════════════════════════════════════════════════════
    const finalCounts = {
      users: await db.user.count(),
      tenants: await db.tenant.count(),
      workspaces: await db.workspace.count(),
      employees: await db.employee.count(),
      customers: await db.customer.count(),
      jobs: await db.job.count(),
      leads: await db.lead.count(),
      services: await db.service.count(),
      campaigns: await db.campaign.count({ where: { type: { not: 'broadcast' } } }),
      broadcasts: await db.campaign.count({ where: { type: 'broadcast' } }),
      segments: await db.segment.count(),
      chatbots: await db.chatbot.count(),
      retargetingRules: await db.retargetingRule.count(),
      reviews: await db.review.count(),
      notifications: await db.notification.count(),
      quotes: await db.quote.count(),
      invoices: await db.invoice.count(),
      conversations: await db.conversation.count(),
    };

    console.log('[SeedDemo] Demo data seeded successfully!');

    return NextResponse.json({
      success: true,
      message: '🎉 Comprehensive demo data seeded successfully!',
      accounts: [
        {
          email: 'demo@flowforge.io',
          password: 'demo123',
          business: 'AquaFix Plumbing',
          plan: 'growth',
          industry: 'plumbing',
          name: 'Deepak Kumar',
        },
        {
          email: 'cleaner@flowforge.io',
          password: 'demo123',
          business: 'SparkleClean Services',
          plan: 'starter (14-day trial)',
          industry: 'cleaning',
          name: 'Priya Sharma',
        },
      ],
      data: finalCounts,
    });
  } catch (error: any) {
    console.error('Failed to seed demo data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed demo data', stack: error.stack },
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
    const counts = {
      users: await db.user.count(),
      tenants: await db.tenant.count(),
      employees: await db.employee.count(),
      customers: await db.customer.count(),
      jobs: await db.job.count(),
      leads: await db.lead.count(),
      services: await db.service.count(),
      campaigns: await db.campaign.count({ where: { type: { not: 'broadcast' } } }),
      broadcasts: await db.campaign.count({ where: { type: 'broadcast' } }),
      segments: await db.segment.count(),
      chatbots: await db.chatbot.count(),
      retargetingRules: await db.retargetingRule.count(),
      reviews: await db.review.count(),
      quotes: await db.quote.count(),
      invoices: await db.invoice.count(),
      conversations: await db.conversation.count(),
    };

    return NextResponse.json({ counts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get counts' },
      { status: 500 }
    );
  }
}
