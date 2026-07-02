import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

// ──────────────────────────────────────────────
// Date helpers
// ──────────────────────────────────────────────
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

async function main() {
  console.log('🌱 Seeding ServiceOS database...\n');

  // ════════════════════════════════════════════════
  // 0. CLEAN ALL EXISTING DATA (reverse dependency order)
  // ════════════════════════════════════════════════
  console.log('🧹 Cleaning existing data...');
  await db.whatsAppMessageAction.deleteMany();
  await db.webhookTestRequest.deleteMany();
  await db.eventWebhookLog.deleteMany();
  await db.eventWebhook.deleteMany();
  await db.webhookSource.deleteMany();
  await db.contactListEntry.deleteMany();
  await db.contactList.deleteMany();
  await db.executionNodeData.deleteMany();
  await db.execution.deleteMany();
  await db.webhookRegistration.deleteMany();
  await db.workflowVersion.deleteMany();
  await db.workflow.deleteMany();
  await db.template.deleteMany();
  await db.credential.deleteMany();
  await db.variable.deleteMany();
  await db.apiKey.deleteMany();
  await db.auditLog.deleteMany();
  await db.folder.deleteMany();
  await db.customerPortalSession.deleteMany();
  await db.customerJourney.deleteMany();
  await db.conversation.deleteMany();
  await db.notificationLog.deleteMany();
  await db.employeeStatusLog.deleteMany();
  await db.analyticsSnapshot.deleteMany();
  await db.integrationConfig.deleteMany();
  await db.invoice.deleteMany();
  await db.lead.deleteMany();
  await db.job.deleteMany();
  await db.resource.deleteMany();
  await db.employee.deleteMany();
  await db.customer.deleteMany();
  await db.review.deleteMany();
  await db.notification.deleteMany();
  await db.quote.deleteMany();
  await db.subscription.deleteMany();
  await db.service.deleteMany();
  await db.user.deleteMany();
  await db.workspace.deleteMany();
  await db.tenant.deleteMany();
  console.log('  ✅ All existing data cleared\n');

  // ════════════════════════════════════════════════
  // 1. HASH ALL PASSWORDS
  // ════════════════════════════════════════════════
  console.log('🔑 Hashing passwords...');
  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
  const ownerPasswordHash = await bcrypt.hash('Owner@123', 12);
  const managerPasswordHash = await bcrypt.hash('Manager@123', 12);
  const dispatcherPasswordHash = await bcrypt.hash('Dispatch@123', 12);
  const employeePasswordHash = await bcrypt.hash('Employee@123', 12);
  console.log('  ✅ Passwords hashed\n');

  // ════════════════════════════════════════════════
  // 2. SUPERADMIN (Platform Level — no tenant)
  // ════════════════════════════════════════════════
  console.log('👑 Creating platform SuperAdmin...');
  const superAdmin = await db.user.create({
    data: {
      email: 'admin@serviceos.com',
      name: 'Platform Admin',
      role: 'admin',
      passwordHash: adminPasswordHash,
      phone: '+1-800-555-0000',
      tenantId: null, // Platform admin, not tied to any tenant
    },
  });
  console.log('  ✅ SuperAdmin: admin@serviceos.com / Admin@123\n');

  // ══════════════════════════════════════════════════════════════
  // 3. TENANT 1: AquaFlow Plumbing (Starter Plan — Plumbing)
  // ══════════════════════════════════════════════════════════════
  console.log('🔧 Creating Tenant 1: AquaFlow Plumbing...');

  // --- Tenant ---
  const tenant1 = await db.tenant.create({
    data: {
      name: 'AquaFlow Plumbing',
      slug: 'aquaflow-plumbing',
      industry: 'plumbing',
      email: 'rajesh@aquaflow.com',
      phone: '+1-555-0101',
      address: '42 Pipeline Ave, Houston, TX 77001',
      country: 'US',
      currency: 'USD',
      plan: 'starter',
      planStatus: 'active',
      planStartedAt: daysAgo(45),
      onboardingCompleted: true,
    },
  });

  // --- Owner User ---
  const user1Owner = await db.user.create({
    data: {
      email: 'rajesh@aquaflow.com',
      name: 'Rajesh Kumar',
      role: 'owner',
      passwordHash: ownerPasswordHash,
      phone: '+1-555-0101',
      tenantId: tenant1.id,
    },
  });

  // --- Workspace ---
  const ws1 = await db.workspace.create({
    data: {
      name: 'AquaFlow Plumbing',
      slug: 'aquaflow-plumbing',
      industry: 'plumbing',
      plan: 'starter',
      ownerId: user1Owner.id,
      tenantId: tenant1.id,
    },
  });

  // Link owner to workspace
  await db.user.update({ where: { id: user1Owner.id }, data: { workspaceId: ws1.id } });

  // --- Subscription ---
  await db.subscription.create({
    data: {
      tenantId: tenant1.id,
      plan: 'starter',
      status: 'active',
      amount: 29,
      currency: 'USD',
      billingCycle: 'monthly',
      startDate: daysAgo(45),
      maxUsers: 3,
      maxJobs: 100,
      maxWorkflows: 10,
    },
  });

  // --- Additional Users ---
  const user1Manager = await db.user.create({
    data: {
      email: 'priya@aquaflow.com',
      name: 'Priya Patel',
      role: 'manager',
      passwordHash: managerPasswordHash,
      phone: '+1-555-0103',
      tenantId: tenant1.id,
      workspaceId: ws1.id,
    },
  });

  const user1Dispatcher = await db.user.create({
    data: {
      email: 'amit@aquaflow.com',
      name: 'Amit Singh',
      role: 'admin', // dispatchers use admin role
      passwordHash: dispatcherPasswordHash,
      phone: '+1-555-0102',
      tenantId: tenant1.id,
      workspaceId: ws1.id,
    },
  });

  const user1Technician = await db.user.create({
    data: {
      email: 'suresh@aquaflow.com',
      name: 'Suresh Naik',
      role: 'technician',
      passwordHash: employeePasswordHash,
      phone: '+1-555-0104',
      tenantId: tenant1.id,
      workspaceId: ws1.id,
    },
  });

  // --- Employees (5: Owner, 2 technicians, 1 manager, 1 driver) ---
  const emp1_owner = await db.employee.create({
    data: {
      name: 'Rajesh Kumar', phone: '+1-555-0101', email: 'rajesh@aquaflow.com',
      role: 'owner', status: 'available',
      skills: '["plumbing","estimation","project_management"]',
      rating: 4.8, completedJobs: 32, workspaceId: ws1.id,
      userId: user1Owner.id,
    },
  });

  const emp1_tech1 = await db.employee.create({
    data: {
      name: 'Suresh Naik', phone: '+1-555-0104', email: 'suresh@aquaflow.com',
      role: 'technician', status: 'available',
      skills: '["plumbing","repair","pipe_fitting"]',
      rating: 4.5, completedJobs: 28, workspaceId: ws1.id,
      userId: user1Technician.id,
    },
  });

  const emp1_tech2 = await db.employee.create({
    data: {
      name: 'Deepak Rao', phone: '+1-555-0105',
      role: 'technician', status: 'busy',
      skills: '["plumbing","drain_cleaning","water_heater"]',
      rating: 4.6, completedJobs: 35, workspaceId: ws1.id,
    },
  });

  const emp1_manager = await db.employee.create({
    data: {
      name: 'Priya Patel', phone: '+1-555-0103', email: 'priya@aquaflow.com',
      role: 'manager', status: 'available',
      skills: '["scheduling","customer_service","inventory"]',
      rating: 4.9, completedJobs: 15, workspaceId: ws1.id,
      userId: user1Manager.id,
    },
  });

  const emp1_driver = await db.employee.create({
    data: {
      name: 'Ravi Shetty', phone: '+1-555-0106',
      role: 'driver', status: 'available',
      skills: '["driving","delivery","equipment_transport"]',
      rating: 4.3, completedJobs: 22, location: 'Houston, TX', workspaceId: ws1.id,
    },
  });

  // --- Customers (5) ---
  const cust1_1 = await db.customer.create({
    data: { name: 'James Wilson', phone: '+1-555-1001', email: 'james.wilson@email.com', address: '15 Oak Street, Houston, TX 77002', workspaceId: ws1.id },
  });
  const cust1_2 = await db.customer.create({
    data: { name: 'Maria Garcia', phone: '+1-555-1002', email: 'maria.g@email.com', address: '220 Elm Blvd, Houston, TX 77003', workspaceId: ws1.id },
  });
  const cust1_3 = await db.customer.create({
    data: { name: 'Tom Henderson', phone: '+1-555-1003', email: 'tom.h@email.com', address: '89 Pine Road, Houston, TX 77004', workspaceId: ws1.id },
  });
  const cust1_4 = await db.customer.create({
    data: { name: 'Linda Chen', phone: '+1-555-1004', email: 'linda.c@email.com', address: '331 Maple Drive, Houston, TX 77005', workspaceId: ws1.id },
  });
  const cust1_5 = await db.customer.create({
    data: { name: 'Robert Kim', phone: '+1-555-1005', email: 'robert.k@email.com', address: '77 Cedar Lane, Houston, TX 77006', workspaceId: ws1.id },
  });

  // --- Jobs in ALL lifecycle states ---

  // (a) PENDING — just created, no assignee yet (shows "Assign" button)
  const job1_pending = await db.job.create({
    data: {
      title: 'Leaking Kitchen Faucet',
      description: 'Customer reports persistent dripping from kitchen faucet. Needs assessment and repair or replacement.',
      status: 'pending',
      priority: 'medium',
      type: 'plumbing',
      address: '15 Oak Street, Houston, TX 77002',
      scheduledAt: daysFromNow(1),
      estimatedDuration: 90,
      customerId: cust1_1.id,
      customerName: 'James Wilson',
      customerPhone: '+1-555-1001',
      workspaceId: ws1.id,
      createdAt: daysAgo(0),
    },
  });

  // (b) ASSIGNED — assigned to employee, waiting to start (shows "Start" button)
  const job1_assigned = await db.job.create({
    data: {
      title: 'Clogged Bathroom Drain',
      description: 'Main bathroom drain is completely blocked. Customer has tried chemical drain cleaner without success.',
      status: 'assigned',
      priority: 'high',
      type: 'plumbing',
      address: '220 Elm Blvd, Houston, TX 77003',
      scheduledAt: daysFromNow(0),
      estimatedDuration: 120,
      customerId: cust1_2.id,
      customerName: 'Maria Garcia',
      customerPhone: '+1-555-1002',
      assigneeId: emp1_tech1.id,
      assigneeName: 'Suresh Naik',
      assigneePhone: '+1-555-0104',
      assignmentStatus: 'pending',
      workspaceId: ws1.id,
      createdAt: daysAgo(1),
    },
  });

  // (c) IN_PROGRESS — currently being worked on (shows "Complete" button)
  const job1_inprogress = await db.job.create({
    data: {
      title: 'Water Heater Installation',
      description: 'Install new tankless water heater to replace old 50-gallon tank unit. Includes removal of old unit.',
      status: 'in_progress',
      priority: 'high',
      type: 'plumbing',
      address: '331 Maple Drive, Houston, TX 77005',
      scheduledAt: daysAgo(0),
      estimatedDuration: 240,
      actualStartTime: hoursAgo(3),
      customerId: cust1_4.id,
      customerName: 'Linda Chen',
      customerPhone: '+1-555-1004',
      assigneeId: emp1_tech2.id,
      assigneeName: 'Deepak Rao',
      assigneePhone: '+1-555-0105',
      workspaceId: ws1.id,
      createdAt: daysAgo(2),
    },
  });

  // (d) COMPLETED — finished job
  const job1_completed = await db.job.create({
    data: {
      title: 'Bathroom Pipe Replacement',
      description: 'Replace corroded copper pipes in master bathroom with PEX tubing. Full bathroom had to be shut off.',
      status: 'completed',
      priority: 'high',
      type: 'plumbing',
      address: '220 Elm Blvd, Houston, TX 77003',
      scheduledAt: daysAgo(7),
      estimatedDuration: 300,
      actualStartTime: daysAgo(7),
      actualEndTime: daysAgo(6),
      customerId: cust1_2.id,
      customerName: 'Maria Garcia',
      customerPhone: '+1-555-1002',
      assigneeId: emp1_tech1.id,
      assigneeName: 'Suresh Naik',
      assigneePhone: '+1-555-0104',
      workspaceId: ws1.id,
      createdAt: daysAgo(10),
    },
  });

  // (e) CANCELLED — cancelled job
  const job1_cancelled = await db.job.create({
    data: {
      title: 'Sewer Line Camera Inspection',
      description: 'Customer requested sewer line camera inspection but cancelled after resolving the issue themselves.',
      status: 'cancelled',
      priority: 'low',
      type: 'plumbing',
      address: '89 Pine Road, Houston, TX 77004',
      scheduledAt: daysAgo(5),
      estimatedDuration: 120,
      customerId: cust1_3.id,
      customerName: 'Tom Henderson',
      customerPhone: '+1-555-1003',
      assigneeId: emp1_tech1.id,
      assigneeName: 'Suresh Naik',
      assigneePhone: '+1-555-0104',
      notes: 'Customer cancelled — resolved issue on their own',
      workspaceId: ws1.id,
      createdAt: daysAgo(8),
    },
  });

  // Bonus: another completed job for invoice data
  const job1_completed2 = await db.job.create({
    data: {
      title: 'Drain Cleaning Service',
      description: 'Clear blocked main drain line using professional hydro-jetting equipment.',
      status: 'completed',
      priority: 'medium',
      type: 'plumbing',
      address: '77 Cedar Lane, Houston, TX 77006',
      scheduledAt: daysAgo(14),
      estimatedDuration: 90,
      actualStartTime: daysAgo(14),
      actualEndTime: daysAgo(14),
      customerId: cust1_5.id,
      customerName: 'Robert Kim',
      customerPhone: '+1-555-1005',
      assigneeId: emp1_owner.id,
      assigneeName: 'Rajesh Kumar',
      assigneePhone: '+1-555-0101',
      workspaceId: ws1.id,
      createdAt: daysAgo(16),
    },
  });

  // --- Leads (6: new, contacted, qualified, proposal, won, lost) ---
  await db.lead.create({ data: { name: 'Susan Miller', phone: '+1-555-2001', email: 'susan.m@email.com', source: 'website', status: 'new', priority: 'high', value: 850, description: 'Leaking kitchen faucet — needs same-day visit', serviceType: 'plumbing', address: '45 Birch St, Houston, TX 77007', tenantId: tenant1.id, assignedToId: emp1_manager.id, followUpAt: daysFromNow(1), createdAt: daysAgo(1) } });
  await db.lead.create({ data: { name: 'Derek Thompson', phone: '+1-555-2002', email: 'derek.t@email.com', source: 'referral', status: 'contacted', priority: 'medium', value: 1200, description: 'Bathroom remodel plumbing — 2 full bathrooms', serviceType: 'plumbing', address: '112 Walnut Ave, Houston, TX 77008', tenantId: tenant1.id, assignedToId: emp1_tech1.id, followUpAt: daysFromNow(2), createdAt: daysAgo(3) } });
  await db.lead.create({ data: { name: 'Angela Wright', phone: '+1-555-2003', email: 'angela.w@email.com', source: 'google', status: 'qualified', priority: 'high', value: 2500, description: 'Full house re-piping — 1960s galvanized pipes', serviceType: 'plumbing', address: '88 Spruce Ct, Houston, TX 77009', tenantId: tenant1.id, assignedToId: emp1_owner.id, followUpAt: daysFromNow(3), createdAt: daysAgo(5) } });
  await db.lead.create({ data: { name: 'Carlos Rivera', phone: '+1-555-2004', email: 'carlos.r@email.com', source: 'whatsapp', status: 'proposal', priority: 'medium', value: 3500, description: 'Commercial kitchen plumbing for new restaurant', serviceType: 'plumbing', address: '201 Ash Blvd, Houston, TX 77010', tenantId: tenant1.id, assignedToId: emp1_manager.id, followUpAt: daysFromNow(1), createdAt: daysAgo(4) } });
  await db.lead.create({ data: { name: 'Emily Watson', phone: '+1-555-2005', email: 'emily.w@email.com', source: 'website', status: 'won', priority: 'high', value: 3200, description: 'Water heater installation — converted to job', serviceType: 'plumbing', address: '55 Redwood Dr, Houston, TX 77011', tenantId: tenant1.id, assignedToId: emp1_owner.id, convertedAt: daysAgo(10), createdAt: daysAgo(14) } });
  await db.lead.create({ data: { name: 'Frank Lopez', phone: '+1-555-2006', email: 'frank.l@email.com', source: 'facebook', status: 'lost', priority: 'low', value: 600, description: 'Faucet replacement — went with competitor', serviceType: 'plumbing', address: '90 Poplar St, Houston, TX 77012', tenantId: tenant1.id, assignedToId: emp1_tech1.id, createdAt: daysAgo(20) } });

  // --- Invoices (2: one paid, one pending) ---
  await db.invoice.create({
    data: {
      number: 'INV-AF-001', tenantId: tenant1.id, jobId: job1_completed.id, customerId: cust1_2.id, employeeId: emp1_tech1.id,
      amount: 850, tax: 68, discount: 0, total: 918, currency: 'USD',
      status: 'paid', dueDate: daysAgo(5), paidAt: daysAgo(3),
      itemsJson: JSON.stringify([{ description: 'Bathroom Pipe Replacement', quantity: 1, rate: 650 }, { description: 'Pipe fittings & PEX materials', quantity: 1, rate: 200 }]),
      notes: 'Thank you for your business!', createdAt: daysAgo(6),
    },
  });
  await db.invoice.create({
    data: {
      number: 'INV-AF-002', tenantId: tenant1.id, jobId: job1_completed2.id, customerId: cust1_5.id, employeeId: emp1_owner.id,
      amount: 350, tax: 28, discount: 25, total: 353, currency: 'USD',
      status: 'pending', dueDate: daysFromNow(14),
      itemsJson: JSON.stringify([{ description: 'Drain Cleaning Service', quantity: 1, rate: 250 }, { description: 'Hydro-jetting equipment', quantity: 1, rate: 100 }]),
      notes: 'Net 30 payment terms', createdAt: daysAgo(14),
    },
  });

  console.log('  ✅ Tenant 1: AquaFlow Plumbing — 4 users, 5 employees, 5 customers, 6 jobs, 6 leads, 2 invoices\n');

  // ══════════════════════════════════════════════════════════════
  // 4. TENANT 2: SparkClean Services (Growth Plan — Cleaning)
  // ══════════════════════════════════════════════════════════════
  console.log('🧹 Creating Tenant 2: SparkClean Services...');

  // --- Tenant ---
  const tenant2 = await db.tenant.create({
    data: {
      name: 'SparkClean Services',
      slug: 'sparkclean-services',
      industry: 'cleaning',
      email: 'sarah@sparkclean.com',
      phone: '+1-555-0201',
      address: '118 Shiny Lane, Austin, TX 78701',
      country: 'US',
      currency: 'USD',
      plan: 'growth',
      planStatus: 'active',
      planStartedAt: daysAgo(60),
      onboardingCompleted: true,
    },
  });

  // --- Owner User ---
  const user2Owner = await db.user.create({
    data: {
      email: 'sarah@sparkclean.com',
      name: 'Sarah Johnson',
      role: 'owner',
      passwordHash: ownerPasswordHash,
      phone: '+1-555-0201',
      tenantId: tenant2.id,
    },
  });

  // --- Workspace ---
  const ws2 = await db.workspace.create({
    data: {
      name: 'SparkClean Services',
      slug: 'sparkclean-services',
      industry: 'cleaning',
      plan: 'growth',
      ownerId: user2Owner.id,
      tenantId: tenant2.id,
    },
  });

  await db.user.update({ where: { id: user2Owner.id }, data: { workspaceId: ws2.id } });

  // --- Subscription ---
  await db.subscription.create({
    data: {
      tenantId: tenant2.id,
      plan: 'growth',
      status: 'active',
      amount: 79,
      currency: 'USD',
      billingCycle: 'monthly',
      startDate: daysAgo(60),
      maxUsers: 10,
      maxJobs: 500,
      maxWorkflows: 50,
    },
  });

  // --- Additional Users ---
  const user2Manager = await db.user.create({
    data: {
      email: 'emma@sparkclean.com',
      name: 'Emma Davis',
      role: 'manager',
      passwordHash: managerPasswordHash,
      phone: '+1-555-0205',
      tenantId: tenant2.id,
      workspaceId: ws2.id,
    },
  });

  const user2Technician = await db.user.create({
    data: {
      email: 'mike@sparkclean.com',
      name: 'Mike Chen',
      role: 'technician',
      passwordHash: employeePasswordHash,
      phone: '+1-555-0202',
      tenantId: tenant2.id,
      workspaceId: ws2.id,
    },
  });

  // --- Employees (5) ---
  const emp2_owner = await db.employee.create({
    data: { name: 'Sarah Johnson', phone: '+1-555-0201', email: 'sarah@sparkclean.com', role: 'owner', status: 'available', skills: '["management","quality_control"]', rating: 4.9, completedJobs: 45, workspaceId: ws2.id, userId: user2Owner.id },
  });
  const emp2_tech1 = await db.employee.create({
    data: { name: 'Mike Chen', phone: '+1-555-0202', email: 'mike@sparkclean.com', role: 'technician', status: 'busy', skills: '["deep_cleaning","carpet_steam","upholstery"]', rating: 4.7, completedJobs: 62, workspaceId: ws2.id, userId: user2Technician.id },
  });
  const emp2_tech2 = await db.employee.create({
    data: { name: 'Lisa Wong', phone: '+1-555-0203', role: 'technician', status: 'available', skills: '["residential","organizing","move_in_out"]', rating: 4.6, completedJobs: 38, workspaceId: ws2.id },
  });
  const emp2_tech3 = await db.employee.create({
    data: { name: 'David Brown', phone: '+1-555-0204', role: 'technician', status: 'available', skills: '["commercial","floor_care","window_cleaning"]', rating: 4.4, completedJobs: 55, workspaceId: ws2.id },
  });
  const emp2_manager = await db.employee.create({
    data: { name: 'Emma Davis', phone: '+1-555-0205', email: 'emma@sparkclean.com', role: 'manager', status: 'available', skills: '["scheduling","customer_relations","quality_assurance"]', rating: 4.8, completedJobs: 20, workspaceId: ws2.id, userId: user2Manager.id },
  });

  // --- Customers (6) ---
  const cust2_1 = await db.customer.create({ data: { name: 'Amanda Foster', phone: '+1-555-3001', email: 'amanda.f@email.com', address: '10 Crystal Ct, Austin, TX 78702', workspaceId: ws2.id } });
  const cust2_2 = await db.customer.create({ data: { name: 'Brian Mitchell', phone: '+1-555-3002', email: 'brian.m@email.com', address: '250 Lake View Dr, Austin, TX 78703', workspaceId: ws2.id } });
  const cust2_3 = await db.customer.create({ data: { name: 'Catherine Lee', phone: '+1-555-3003', email: 'cathy.lee@email.com', address: '78 Sunrise Blvd, Austin, TX 78704', workspaceId: ws2.id } });
  const cust2_4 = await db.customer.create({ data: { name: 'TechCorp Office', phone: '+1-555-3004', email: 'office@techcorp.com', address: '1200 Innovation Pkwy, Austin, TX 78705', workspaceId: ws2.id } });
  const cust2_5 = await db.customer.create({ data: { name: 'Eva Schwartz', phone: '+1-555-3005', email: 'eva.s@email.com', address: '33 Meadow Lane, Austin, TX 78706', workspaceId: ws2.id } });
  const cust2_6 = await db.customer.create({ data: { name: 'GreenLeaf Co-working', phone: '+1-555-3006', email: 'hello@greenleaf.space', address: '850 Eco Dr, Austin, TX 78707', workspaceId: ws2.id } });

  // --- Jobs in ALL lifecycle states ---

  // (a) PENDING — no assignee yet
  const job2_pending = await db.job.create({
    data: {
      title: 'Weekly Home Cleaning',
      description: 'Regular weekly cleaning for a 3BR home. Includes kitchen, bathrooms, living areas, and vacuuming.',
      status: 'pending', priority: 'medium', type: 'cleaning',
      address: '10 Crystal Ct, Austin, TX 78702',
      scheduledAt: daysFromNow(2), estimatedDuration: 180,
      customerId: cust2_1.id, customerName: 'Amanda Foster', customerPhone: '+1-555-3001',
      workspaceId: ws2.id, createdAt: daysAgo(1),
    },
  });

  // (b) ASSIGNED — assigned, waiting to start
  const job2_assigned = await db.job.create({
    data: {
      title: 'Carpet Steam Cleaning',
      description: 'Steam clean all carpets in a 3-story home. Includes stain pre-treatment and deodorizing.',
      status: 'assigned', priority: 'medium', type: 'cleaning',
      address: '250 Lake View Dr, Austin, TX 78703',
      scheduledAt: daysFromNow(1), estimatedDuration: 240,
      customerId: cust2_2.id, customerName: 'Brian Mitchell', customerPhone: '+1-555-3002',
      assigneeId: emp2_tech1.id, assigneeName: 'Mike Chen', assigneePhone: '+1-555-0202',
      assignmentStatus: 'pending',
      workspaceId: ws2.id, createdAt: daysAgo(2),
    },
  });

  // (c) IN_PROGRESS — currently being worked on
  const job2_inprogress = await db.job.create({
    data: {
      title: 'Deep Clean - 4BR Home',
      description: 'Full deep cleaning of 4BR house including inside appliances, baseboards, and window sills.',
      status: 'in_progress', priority: 'high', type: 'cleaning',
      address: '33 Meadow Lane, Austin, TX 78706',
      scheduledAt: daysAgo(0), estimatedDuration: 360,
      actualStartTime: hoursAgo(2),
      customerId: cust2_5.id, customerName: 'Eva Schwartz', customerPhone: '+1-555-3005',
      assigneeId: emp2_tech2.id, assigneeName: 'Lisa Wong', assigneePhone: '+1-555-0203',
      workspaceId: ws2.id, createdAt: daysAgo(3),
    },
  });

  // (d) COMPLETED
  const job2_completed = await db.job.create({
    data: {
      title: 'Move-In Deep Clean',
      description: 'Move-in deep clean for a new home purchase. Includes inside cabinets, appliances, and all surfaces.',
      status: 'completed', priority: 'high', type: 'cleaning',
      address: '78 Sunrise Blvd, Austin, TX 78704',
      scheduledAt: daysAgo(5), estimatedDuration: 300,
      actualStartTime: daysAgo(5), actualEndTime: daysAgo(5),
      customerId: cust2_3.id, customerName: 'Catherine Lee', customerPhone: '+1-555-3003',
      assigneeId: emp2_tech2.id, assigneeName: 'Lisa Wong', assigneePhone: '+1-555-0203',
      workspaceId: ws2.id, createdAt: daysAgo(8),
    },
  });

  // (e) CANCELLED
  const job2_cancelled = await db.job.create({
    data: {
      title: 'Office Nightly Cleaning',
      description: 'Recurring nightly office cleaning. Customer cancelled contract due to office relocation.',
      status: 'cancelled', priority: 'medium', type: 'cleaning',
      address: '1200 Innovation Pkwy, Austin, TX 78705',
      scheduledAt: daysAgo(3),
      customerId: cust2_4.id, customerName: 'TechCorp Office', customerPhone: '+1-555-3004',
      assigneeId: emp2_tech3.id, assigneeName: 'David Brown', assigneePhone: '+1-555-0204',
      notes: 'Client cancelled — relocating office out of state',
      workspaceId: ws2.id, createdAt: daysAgo(10),
    },
  });

  // Bonus: another completed job for invoice
  const job2_completed2 = await db.job.create({
    data: {
      title: 'Co-working Space Weekly Clean',
      description: 'Weekly cleaning for GreenLeaf Co-working space. Includes common areas, meeting rooms, and kitchen.',
      status: 'completed', priority: 'medium', type: 'cleaning',
      address: '850 Eco Dr, Austin, TX 78707',
      scheduledAt: daysAgo(10), estimatedDuration: 240,
      actualStartTime: daysAgo(10), actualEndTime: daysAgo(10),
      customerId: cust2_6.id, customerName: 'GreenLeaf Co-working', customerPhone: '+1-555-3006',
      assigneeId: emp2_tech3.id, assigneeName: 'David Brown', assigneePhone: '+1-555-0204',
      workspaceId: ws2.id, createdAt: daysAgo(14),
    },
  });

  // --- Leads (6: new, contacted, qualified, proposal, won, lost) ---
  await db.lead.create({ data: { name: 'Jennifer Adams', phone: '+1-555-4001', email: 'jen.adams@email.com', source: 'website', status: 'new', priority: 'high', value: 1200, description: 'Weekly home cleaning service', serviceType: 'cleaning', address: '45 River Rd, Austin, TX 78710', tenantId: tenant2.id, assignedToId: emp2_manager.id, followUpAt: daysFromNow(1), createdAt: daysAgo(0) } });
  await db.lead.create({ data: { name: 'Mark Phillips', phone: '+1-555-4003', email: 'mark.p@email.com', source: 'google', status: 'contacted', priority: 'medium', value: 800, description: 'Move-out cleaning — 3BR apartment', serviceType: 'cleaning', address: '12 Sunset Dr, Austin, TX 78712', tenantId: tenant2.id, assignedToId: emp2_tech2.id, followUpAt: daysFromNow(2), createdAt: daysAgo(2) } });
  await db.lead.create({ data: { name: 'Oliver Grant', phone: '+1-555-4005', email: 'oliver.g@email.com', source: 'website', status: 'qualified', priority: 'high', value: 2800, description: 'Post-construction cleanup — 3000 sq ft', serviceType: 'cleaning', address: '900 Builder Way, Austin, TX 78714', tenantId: tenant2.id, assignedToId: emp2_tech1.id, followUpAt: daysFromNow(3), createdAt: daysAgo(5) } });
  await db.lead.create({ data: { name: 'Samuel Wright', phone: '+1-555-4007', email: 'sam.w@email.com', source: 'referral', status: 'proposal', priority: 'high', value: 4200, description: 'Monthly commercial cleaning contract', serviceType: 'cleaning', address: '600 Commerce Blvd, Austin, TX 78716', tenantId: tenant2.id, assignedToId: emp2_owner.id, followUpAt: daysFromNow(1), createdAt: daysAgo(8) } });
  await db.lead.create({ data: { name: 'Uma Sharma', phone: '+1-555-4009', email: 'uma.s@email.com', source: 'manual', status: 'won', priority: 'high', value: 1800, description: 'Deep cleaning — 4BR house', serviceType: 'cleaning', address: '22 Garden Path, Austin, TX 78718', tenantId: tenant2.id, assignedToId: emp2_tech1.id, convertedAt: daysAgo(12), createdAt: daysAgo(18) } });
  await db.lead.create({ data: { name: 'Wendy Cooper', phone: '+1-555-4011', email: 'wendy.c@email.com', source: 'facebook', status: 'lost', priority: 'low', value: 500, description: 'Small studio cleaning — budget mismatch', serviceType: 'cleaning', address: '5 Downtown Lofts, Austin, TX 78720', tenantId: tenant2.id, assignedToId: emp2_manager.id, createdAt: daysAgo(25) } });

  // --- Invoices (2: one paid, one pending) ---
  await db.invoice.create({
    data: {
      number: 'INV-SC-001', tenantId: tenant2.id, jobId: job2_completed.id, customerId: cust2_3.id, employeeId: emp2_tech2.id,
      amount: 650, tax: 52, discount: 0, total: 702, currency: 'USD',
      status: 'paid', dueDate: daysAgo(2), paidAt: daysAgo(1),
      itemsJson: JSON.stringify([{ description: 'Move-in Deep Clean (4BR)', quantity: 1, rate: 650 }]),
      createdAt: daysAgo(5),
    },
  });
  await db.invoice.create({
    data: {
      number: 'INV-SC-002', tenantId: tenant2.id, jobId: job2_completed2.id, customerId: cust2_6.id, employeeId: emp2_tech3.id,
      amount: 1200, tax: 96, discount: 100, total: 1196, currency: 'USD',
      status: 'pending', dueDate: daysFromNow(16),
      itemsJson: JSON.stringify([{ description: 'Co-working Weekly Clean', quantity: 4, rate: 300 }]),
      notes: 'Monthly recurring — 10% loyalty discount applied', createdAt: daysAgo(10),
    },
  });

  console.log('  ✅ Tenant 2: SparkClean Services — 3 users, 5 employees, 6 customers, 6 jobs, 6 leads, 2 invoices\n');

  // ══════════════════════════════════════════════════════════════
  // 5. TENANT 3: QuickMove Packers (Pro Plan — Packers & Movers)
  // ══════════════════════════════════════════════════════════════
  console.log('📦 Creating Tenant 3: QuickMove Packers...');

  // --- Tenant ---
  const tenant3 = await db.tenant.create({
    data: {
      name: 'QuickMove Packers',
      slug: 'quickmove-packers',
      industry: 'packers-movers',
      email: 'arun@quickmove.com',
      phone: '+1-555-0301',
      address: '75 Cargo Way, Dallas, TX 75201',
      country: 'US',
      currency: 'USD',
      plan: 'pro',
      planStatus: 'active',
      planStartedAt: daysAgo(90),
      onboardingCompleted: true,
    },
  });

  // --- Owner User ---
  const user3Owner = await db.user.create({
    data: {
      email: 'arun@quickmove.com',
      name: 'Arun Sharma',
      role: 'owner',
      passwordHash: ownerPasswordHash,
      phone: '+1-555-0301',
      tenantId: tenant3.id,
    },
  });

  // --- Workspace ---
  const ws3 = await db.workspace.create({
    data: {
      name: 'QuickMove Packers',
      slug: 'quickmove-packers',
      industry: 'packers-movers',
      plan: 'pro',
      ownerId: user3Owner.id,
      tenantId: tenant3.id,
    },
  });

  await db.user.update({ where: { id: user3Owner.id }, data: { workspaceId: ws3.id } });

  // --- Subscription (showing plan upgrade history) ---
  await db.subscription.create({
    data: {
      tenantId: tenant3.id, plan: 'starter', status: 'cancelled', amount: 29, currency: 'USD',
      billingCycle: 'monthly', startDate: daysAgo(180), endDate: daysAgo(120),
      maxUsers: 3, maxJobs: 100, maxWorkflows: 10,
    },
  });
  await db.subscription.create({
    data: {
      tenantId: tenant3.id, plan: 'growth', status: 'cancelled', amount: 79, currency: 'USD',
      billingCycle: 'monthly', startDate: daysAgo(120), endDate: daysAgo(90),
      maxUsers: 10, maxJobs: 500, maxWorkflows: 50,
    },
  });
  await db.subscription.create({
    data: {
      tenantId: tenant3.id, plan: 'pro', status: 'active', amount: 199, currency: 'USD',
      billingCycle: 'yearly', startDate: daysAgo(90), endDate: daysFromNow(275),
      maxUsers: 50, maxJobs: 5000, maxWorkflows: 200,
    },
  });

  // --- Additional Users ---
  const user3Manager = await db.user.create({
    data: {
      email: 'sunita@quickmove.com',
      name: 'Sunita Joshi',
      role: 'manager',
      passwordHash: managerPasswordHash,
      phone: '+1-555-0303',
      tenantId: tenant3.id,
      workspaceId: ws3.id,
    },
  });

  const user3Technician = await db.user.create({
    data: {
      email: 'vikram@quickmove.com',
      name: 'Vikram Reddy',
      role: 'technician',
      passwordHash: employeePasswordHash,
      phone: '+1-555-0302',
      tenantId: tenant3.id,
      workspaceId: ws3.id,
    },
  });

  // --- Employees (6) ---
  const emp3_owner = await db.employee.create({
    data: { name: 'Arun Sharma', phone: '+1-555-0301', email: 'arun@quickmove.com', role: 'owner', status: 'available', skills: '["management","logistics","estimation"]', rating: 4.9, completedJobs: 78, workspaceId: ws3.id, userId: user3Owner.id },
  });
  const emp3_driver1 = await db.employee.create({
    data: { name: 'Vikram Reddy', phone: '+1-555-0302', email: 'vikram@quickmove.com', role: 'driver', status: 'busy', skills: '["driving","heavy_lifting","packing"]', rating: 4.7, completedJobs: 95, location: 'Dallas, TX', workspaceId: ws3.id, userId: user3Technician.id },
  });
  const emp3_manager = await db.employee.create({
    data: { name: 'Sunita Joshi', phone: '+1-555-0303', email: 'sunita@quickmove.com', role: 'manager', status: 'available', skills: '["coordination","customer_service","inventory"]', rating: 4.8, completedJobs: 40, workspaceId: ws3.id, userId: user3Manager.id },
  });
  const emp3_tech1 = await db.employee.create({
    data: { name: 'Alex Turner', phone: '+1-555-0304', role: 'technician', status: 'available', skills: '["packing","wrapping","loading"]', rating: 4.5, completedJobs: 72, workspaceId: ws3.id },
  });
  const emp3_driver2 = await db.employee.create({
    data: { name: 'Raj Malhotra', phone: '+1-555-0305', role: 'driver', status: 'available', skills: '["driving","long_distance","fragile_items"]', rating: 4.6, completedJobs: 68, location: 'Fort Worth, TX', workspaceId: ws3.id },
  });
  const emp3_staff1 = await db.employee.create({
    data: { name: 'Meera Kapoor', phone: '+1-555-0306', role: 'staff', status: 'available', skills: '["packing","unpacking","organizing"]', rating: 4.4, completedJobs: 35, workspaceId: ws3.id },
  });

  // --- Customers (8) ---
  const cust3_1 = await db.customer.create({ data: { name: 'Jason Taylor', phone: '+1-555-5001', email: 'jason.t@email.com', address: '100 Relocation Rd, Dallas, TX 75202', workspaceId: ws3.id } });
  const cust3_2 = await db.customer.create({ data: { name: 'Priya Nair', phone: '+1-555-5002', email: 'priya.n@email.com', address: '25 Moving Lane, Dallas, TX 75203', workspaceId: ws3.id } });
  const cust3_3 = await db.customer.create({ data: { name: 'TechStart LLC', phone: '+1-555-5003', email: 'ops@techstart.co', address: '500 Corporate Pkwy, Dallas, TX 75204', workspaceId: ws3.id } });
  const cust3_4 = await db.customer.create({ data: { name: 'Diana Reyes', phone: '+1-555-5004', email: 'diana.r@email.com', address: '88 Suburb Dr, Plano, TX 75024', workspaceId: ws3.id } });
  const cust3_5 = await db.customer.create({ data: { name: 'Kevin OBrien', phone: '+1-555-5005', email: 'kevin.ob@email.com', address: '310 Ranch Rd, Frisco, TX 75034', workspaceId: ws3.id } });
  const cust3_6 = await db.customer.create({ data: { name: 'Laura Bennett', phone: '+1-555-5006', email: 'laura.b@email.com', address: '42 Elm Crossing, Irving, TX 75062', workspaceId: ws3.id } });
  const cust3_7 = await db.customer.create({ data: { name: 'MegaCorp Industries', phone: '+1-555-5007', email: 'facilities@megacorp.com', address: '1 Enterprise Blvd, Dallas, TX 75205', workspaceId: ws3.id } });
  const cust3_8 = await db.customer.create({ data: { name: 'Nathan Cross', phone: '+1-555-5008', email: 'nathan.c@email.com', address: '67 Lakeshore Dr, Carrollton, TX 75006', workspaceId: ws3.id } });

  // --- Jobs in ALL lifecycle states including on_hold ---

  // (a) PENDING — no assignee yet
  const job3_pending = await db.job.create({
    data: {
      title: 'Studio Apartment Move',
      description: 'Local studio apartment move. Customer packing their own boxes, just need loading and transport.',
      status: 'pending', priority: 'low', type: 'moving',
      address: '25 Moving Lane, Dallas, TX 75203',
      pickup: '25 Moving Lane, Dallas, TX 75203',
      dropoff: '88 Midtown Lofts, Dallas, TX 75210',
      scheduledAt: daysFromNow(5), estimatedDuration: 180,
      customerId: cust3_2.id, customerName: 'Priya Nair', customerPhone: '+1-555-5002',
      workspaceId: ws3.id, createdAt: daysAgo(1),
    },
  });

  // (b) ASSIGNED — assigned, waiting to start
  const job3_assigned = await db.job.create({
    data: {
      title: 'Full House Move - Jason Taylor',
      description: '5BR house relocation across town. Full service: pack, load, transport, unload, unpack.',
      status: 'assigned', priority: 'high', type: 'moving',
      address: '100 Relocation Rd, Dallas, TX 75202',
      pickup: '100 Relocation Rd, Dallas, TX 75202',
      dropoff: '450 New Start Dr, Plano, TX 75025',
      scheduledAt: daysFromNow(3), estimatedDuration: 480,
      customerId: cust3_1.id, customerName: 'Jason Taylor', customerPhone: '+1-555-5001',
      assigneeId: emp3_driver1.id, assigneeName: 'Vikram Reddy', assigneePhone: '+1-555-0302',
      assignmentStatus: 'pending',
      workspaceId: ws3.id, createdAt: daysAgo(2),
    },
  });

  // (c) IN_PROGRESS
  const job3_inprogress = await db.job.create({
    data: {
      title: 'Office Relocation - TechStart',
      description: 'Move 50 workstations and IT equipment. After-hours operation to minimize business disruption.',
      status: 'in_progress', priority: 'urgent', type: 'moving',
      address: '500 Corporate Pkwy, Dallas, TX 75204',
      pickup: '500 Corporate Pkwy, Dallas, TX 75204',
      dropoff: '1200 Tech Park, Dallas, TX 75210',
      scheduledAt: daysAgo(0), estimatedDuration: 600,
      actualStartTime: hoursAgo(4),
      customerId: cust3_3.id, customerName: 'TechStart LLC', customerPhone: '+1-555-5003',
      assigneeId: emp3_driver1.id, assigneeName: 'Vikram Reddy', assigneePhone: '+1-555-0302',
      workspaceId: ws3.id, createdAt: daysAgo(3),
    },
  });

  // (d) ON_HOLD — unique to movers
  const job3_onhold = await db.job.create({
    data: {
      title: 'Piano Move - Diana Reyes',
      description: 'Transport grand piano with special handling. Requires padded wrap, dolly, and 3-person team.',
      status: 'on_hold', priority: 'high', type: 'moving',
      address: '88 Suburb Dr, Plano, TX 75024',
      scheduledAt: daysFromNow(7), estimatedDuration: 240,
      customerId: cust3_4.id, customerName: 'Diana Reyes', customerPhone: '+1-555-5004',
      assigneeId: emp3_driver2.id, assigneeName: 'Raj Malhotra', assigneePhone: '+1-555-0305',
      notes: 'Waiting for customer to confirm elevator reservation at destination building',
      workspaceId: ws3.id, createdAt: daysAgo(5),
    },
  });

  // (e) COMPLETED
  const job3_completed = await db.job.create({
    data: {
      title: 'Full Service Move - Nathan Cross',
      description: 'Pack, move, and unpack 3BR home. Completed successfully with no damages.',
      status: 'completed', priority: 'high', type: 'moving',
      address: '67 Lakeshore Dr, Carrollton, TX 75006',
      pickup: '67 Lakeshore Dr, Carrollton, TX 75006',
      dropoff: '45 New Horizons, Carrollton, TX 75007',
      scheduledAt: daysAgo(8), estimatedDuration: 420,
      actualStartTime: daysAgo(8), actualEndTime: daysAgo(7),
      customerId: cust3_8.id, customerName: 'Nathan Cross', customerPhone: '+1-555-5008',
      assigneeId: emp3_driver1.id, assigneeName: 'Vikram Reddy', assigneePhone: '+1-555-0302',
      workspaceId: ws3.id, createdAt: daysAgo(12),
    },
  });

  // (f) CANCELLED
  const job3_cancelled = await db.job.create({
    data: {
      title: 'Corporate Warehouse Move - MegaCorp',
      description: 'Relocate warehouse contents. Cancelled due to permit delays — oversized load permits denied.',
      status: 'cancelled', priority: 'urgent', type: 'moving',
      address: '1 Enterprise Blvd, Dallas, TX 75205',
      pickup: '1 Enterprise Blvd, Dallas, TX 75205',
      dropoff: '200 Industrial Park, Fort Worth, TX 76102',
      scheduledAt: daysAgo(3),
      customerId: cust3_7.id, customerName: 'MegaCorp Industries', customerPhone: '+1-555-5007',
      assigneeId: emp3_driver2.id, assigneeName: 'Raj Malhotra', assigneePhone: '+1-555-0305',
      notes: 'Permits denied for oversized load on highway. Client will reschedule.',
      workspaceId: ws3.id, createdAt: daysAgo(10),
    },
  });

  // Bonus: another completed job + on_hold for invoice coverage
  const job3_onhold2 = await db.job.create({
    data: {
      title: 'Long Distance Move - Kevin',
      description: 'Dallas to Fort Worth — 4BR house move. On hold pending customer closing date.',
      status: 'on_hold', priority: 'high', type: 'moving',
      address: '310 Ranch Rd, Frisco, TX 75034',
      pickup: '310 Ranch Rd, Frisco, TX 75034',
      dropoff: '88 Settlement Way, Fort Worth, TX 76102',
      scheduledAt: daysFromNow(14), estimatedDuration: 480,
      customerId: cust3_5.id, customerName: 'Kevin OBrien', customerPhone: '+1-555-5005',
      assigneeId: emp3_driver2.id, assigneeName: 'Raj Malhotra', assigneePhone: '+1-555-0305',
      notes: 'On hold — waiting for closing date confirmation',
      workspaceId: ws3.id, createdAt: daysAgo(4),
    },
  });

  const job3_completed2 = await db.job.create({
    data: {
      title: 'Packing Service - Laura Bennett',
      description: 'Packing only service for 2BR apartment. All materials provided.',
      status: 'completed', priority: 'medium', type: 'moving',
      address: '42 Elm Crossing, Irving, TX 75062',
      scheduledAt: daysAgo(12), estimatedDuration: 300,
      actualStartTime: daysAgo(12), actualEndTime: daysAgo(12),
      customerId: cust3_6.id, customerName: 'Laura Bennett', customerPhone: '+1-555-5006',
      assigneeId: emp3_tech1.id, assigneeName: 'Alex Turner', assigneePhone: '+1-555-0304',
      workspaceId: ws3.id, createdAt: daysAgo(15),
    },
  });

  // --- Leads (6: new, contacted, qualified, proposal, won, lost) ---
  await db.lead.create({ data: { name: 'Andrea Scott', phone: '+1-555-6001', email: 'andrea.s@email.com', source: 'website', status: 'new', priority: 'urgent', value: 4800, description: 'Full house move — 5BR to new city', serviceType: 'moving', address: 'Pickup: 300 Main St, Dallas → 50 New Home Dr, Plano, TX', tenantId: tenant3.id, assignedToId: emp3_manager.id, followUpAt: daysFromNow(0), createdAt: daysAgo(0) } });
  await db.lead.create({ data: { name: 'Diana Wells', phone: '+1-555-6004', email: 'diana.w@email.com', source: 'whatsapp', status: 'contacted', priority: 'high', value: 3500, description: 'Long distance move Dallas to Austin', serviceType: 'moving', address: 'Pickup: Dallas, TX → Austin, TX', tenantId: tenant3.id, assignedToId: emp3_manager.id, followUpAt: daysFromNow(1), createdAt: daysAgo(2) } });
  await db.lead.create({ data: { name: 'Fiona Blake', phone: '+1-555-6006', email: 'fiona.b@email.com', source: 'google', status: 'qualified', priority: 'high', value: 4200, description: '4BR house move with piano', serviceType: 'moving', address: 'Pickup: 15 Pianist Ln → 88 Melody Dr, Plano, TX', tenantId: tenant3.id, assignedToId: emp3_driver1.id, followUpAt: daysFromNow(2), createdAt: daysAgo(4) } });
  await db.lead.create({ data: { name: 'Hannah Singh', phone: '+1-555-6008', email: 'hannah.s@email.com', source: 'referral', status: 'proposal', priority: 'high', value: 3800, description: '3BR home + garage move', serviceType: 'moving', address: 'Pickup: 200 Family Way → 55 Suburban Ct, Frisco, TX', tenantId: tenant3.id, assignedToId: emp3_driver2.id, followUpAt: daysFromNow(2), createdAt: daysAgo(7) } });
  await db.lead.create({ data: { name: 'Kyle Simmons', phone: '+1-555-6011', email: 'kyle.s@email.com', source: 'whatsapp', status: 'won', priority: 'high', value: 3200, description: 'Full service 4BR move', serviceType: 'moving', address: 'Pickup: 60 Oak Hill → 33 New Horizons, Dallas, TX', tenantId: tenant3.id, assignedToId: emp3_driver1.id, convertedAt: daysAgo(14), createdAt: daysAgo(20) } });
  await db.lead.create({ data: { name: 'Natasha Volkov', phone: '+1-555-6014', email: 'natasha.v@email.com', source: 'facebook', status: 'lost', priority: 'medium', value: 2400, description: 'Went with budget mover', serviceType: 'moving', address: '120 Budget Ln, Dallas, TX 75208', tenantId: tenant3.id, assignedToId: emp3_manager.id, createdAt: daysAgo(35) } });

  // --- Invoices (2: one paid, one pending) ---
  await db.invoice.create({
    data: {
      number: 'INV-QM-001', tenantId: tenant3.id, jobId: job3_completed.id, customerId: cust3_8.id, employeeId: emp3_driver1.id,
      amount: 3200, tax: 256, discount: 200, total: 3256, currency: 'USD',
      status: 'paid', dueDate: daysAgo(5), paidAt: daysAgo(3),
      itemsJson: JSON.stringify([{ description: 'Full Service Move (3BR)', quantity: 1, rate: 2800 }, { description: 'Packing Materials', quantity: 1, rate: 400 }, { description: 'Insurance', quantity: 1, rate: 200 }]),
      notes: 'Returning customer discount applied', createdAt: daysAgo(7),
    },
  });
  await db.invoice.create({
    data: {
      number: 'INV-QM-002', tenantId: tenant3.id, jobId: job3_completed2.id, customerId: cust3_6.id, employeeId: emp3_tech1.id,
      amount: 1800, tax: 144, discount: 0, total: 1944, currency: 'USD',
      status: 'pending', dueDate: daysFromNow(16),
      itemsJson: JSON.stringify([{ description: 'Packing Service (2BR)', quantity: 1, rate: 1200 }, { description: 'Packing Materials & Boxes', quantity: 1, rate: 400 }, { description: 'Fragile Item Wrapping', quantity: 1, rate: 200 }]),
      notes: 'Net 30 payment terms', createdAt: daysAgo(12),
    },
  });

  console.log('  ✅ Tenant 3: QuickMove Packers — 3 users, 6 employees, 8 customers, 8 jobs, 6 leads, 2 invoices, 3 subscriptions\n');

  // ══════════════════════════════════════════════════════════════
  // 6. TEMPLATE WORKFLOWS (8 templates)
  // ══════════════════════════════════════════════════════════════
  console.log('📋 Creating template workflows...');

  const templates = [
    {
      name: 'Slack Notification on New Email',
      description: 'Automatically send a Slack notification when you receive a new email matching specific subject criteria.',
      category: 'Communication', icon: 'Mail', featured: true, usageCount: 2847, rating: 4.8,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'emailTrigger_1', type: 'emailTrigger', name: 'Email Trigger', position: { x: 100, y: 200 }, data: { nodeType: 'emailTrigger', config: { mailbox: 'inbox', filterUnread: true } } },
          { id: 'if_1', type: 'if', name: 'Check Subject', position: { x: 400, y: 200 }, data: { nodeType: 'if', config: { conditions: [{ field: '{{ $json.subject }}', operator: 'contains', value: 'urgent' }], combineOperation: 'all' } } },
          { id: 'slack_1', type: 'slack', name: 'Send Slack Alert', position: { x: 700, y: 120 }, data: { nodeType: 'slack', config: { channel: '#alerts', message: '🚨 Urgent email from {{ $json.from }}: {{ $json.subject }}', asUser: false } } },
        ],
        edges: [
          { id: 'edge_1', source: 'emailTrigger_1', target: 'if_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'if_1', target: 'slack_1', sourcePort: 'true', targetPort: 'main', animated: true },
        ],
      }),
    },
    {
      name: 'Daily Report Generator',
      description: 'Generate and email a daily report by fetching data from an API and sending a formatted email summary every morning.',
      category: 'Productivity', icon: 'FileText', featured: true, usageCount: 1923, rating: 4.6,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'scheduleTrigger_1', type: 'scheduleTrigger', name: 'Every Day at 8 AM', position: { x: 100, y: 200 }, data: { nodeType: 'scheduleTrigger', config: { rule: '0 8 * * *', timezone: 'America/New_York' } } },
          { id: 'httpRequest_1', type: 'httpRequest', name: 'Fetch Report Data', position: { x: 400, y: 200 }, data: { nodeType: 'httpRequest', config: { method: 'GET', url: 'https://api.example.com/reports/daily' } } },
          { id: 'set_1', type: 'set', name: 'Format Report', position: { x: 700, y: 200 }, data: { nodeType: 'set', config: { assignments: [{ key: 'subject', value: 'Daily Report - {{ $now.format("MMM DD, YYYY") }}' }] } } },
          { id: 'emailSend_1', type: 'emailSend', name: 'Send Report Email', position: { x: 1000, y: 200 }, data: { nodeType: 'emailSend', config: { to: 'team@company.com', subject: '{{ $json.subject }}', body: 'Daily Report for {{ $now.format("YYYY-MM-DD") }}' } } },
        ],
        edges: [
          { id: 'edge_1', source: 'scheduleTrigger_1', target: 'httpRequest_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'httpRequest_1', target: 'set_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_3', source: 'set_1', target: 'emailSend_1', sourcePort: 'main', targetPort: 'main', animated: true },
        ],
      }),
    },
    {
      name: 'Lead Scoring Pipeline',
      description: 'Automatically score incoming leads from a webhook, enrich data, and notify your sales team when high-value leads are detected.',
      category: 'Sales', icon: 'TrendingUp', featured: true, usageCount: 1456, rating: 4.7,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'webhookTrigger_1', type: 'webhookTrigger', name: 'New Lead Webhook', position: { x: 100, y: 200 }, data: { nodeType: 'webhookTrigger', config: { path: 'new-lead', method: 'POST' } } },
          { id: 'if_1', type: 'if', name: 'Score Threshold', position: { x: 400, y: 200 }, data: { nodeType: 'if', config: { conditions: [{ field: '{{ $json.score }}', operator: 'larger', value: '70' }], combineOperation: 'all' } } },
          { id: 'slack_1', type: 'slack', name: 'Notify Sales Team', position: { x: 700, y: 120 }, data: { nodeType: 'slack', config: { channel: '#sales-leads', message: '🎯 Hot Lead: {{ $json.name }} - Score: {{ $json.score }}' } } },
        ],
        edges: [
          { id: 'edge_1', source: 'webhookTrigger_1', target: 'if_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'if_1', target: 'slack_1', sourcePort: 'true', targetPort: 'main', animated: true },
        ],
      }),
    },
    {
      name: 'Database Sync',
      description: 'Keep two databases in sync by periodically pulling data from PostgreSQL and writing updates to MySQL.',
      category: 'Data', icon: 'Database', featured: false, usageCount: 987, rating: 4.4,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'scheduleTrigger_1', type: 'scheduleTrigger', name: 'Every 30 Minutes', position: { x: 100, y: 200 }, data: { nodeType: 'scheduleTrigger', config: { rule: '*/30 * * * *', timezone: 'UTC' } } },
          { id: 'postgres_1', type: 'postgres', name: 'Query PostgreSQL', position: { x: 400, y: 200 }, data: { nodeType: 'postgres', config: { operation: 'executeQuery', query: 'SELECT * FROM users WHERE updated_at > NOW() - INTERVAL \'30 minutes\'' } } },
          { id: 'if_1', type: 'if', name: 'Has Changes?', position: { x: 700, y: 200 }, data: { nodeType: 'if', config: { conditions: [{ field: '{{ $json.length }}', operator: 'larger', value: '0' }], combineOperation: 'all' } } },
          { id: 'mysql_1', type: 'mysql', name: 'Upsert MySQL', position: { x: 1000, y: 120 }, data: { nodeType: 'mysql', config: { operation: 'upsert', table: 'users', uniqueKey: 'id' } } },
        ],
        edges: [
          { id: 'edge_1', source: 'scheduleTrigger_1', target: 'postgres_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'postgres_1', target: 'if_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_3', source: 'if_1', target: 'mysql_1', sourcePort: 'true', targetPort: 'main', animated: true },
        ],
      }),
    },
    {
      name: 'AI Content Pipeline',
      description: 'Generate AI-powered content by triggering manually, processing through OpenAI, and storing results in Google Sheets.',
      category: 'AI', icon: 'Sparkles', featured: true, usageCount: 2134, rating: 4.9,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'manualTrigger_1', type: 'manualTrigger', name: 'Manual Trigger', position: { x: 100, y: 200 }, data: { nodeType: 'manualTrigger', config: {} } },
          { id: 'openai_1', type: 'openai', name: 'Generate Content', position: { x: 400, y: 200 }, data: { nodeType: 'openai', config: { model: 'gpt-4', prompt: 'Write a professional blog post about {{ $json.topic }}', maxTokens: 2000, temperature: 0.7 } } },
          { id: 'googleSheets_1', type: 'googleSheets', name: 'Save to Sheets', position: { x: 700, y: 200 }, data: { nodeType: 'googleSheets', config: { operation: 'append', sheetName: 'Content Log' } } },
        ],
        edges: [
          { id: 'edge_1', source: 'manualTrigger_1', target: 'openai_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'openai_1', target: 'googleSheets_1', sourcePort: 'main', targetPort: 'main', animated: true },
        ],
      }),
    },
    {
      name: 'Error Alert System',
      description: 'Receive error webhooks, filter by severity, and send alerts to Slack and Telegram for maximum visibility.',
      category: 'Monitoring', icon: 'AlertTriangle', featured: false, usageCount: 1678, rating: 4.5,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'webhookTrigger_1', type: 'webhookTrigger', name: 'Error Webhook', position: { x: 100, y: 200 }, data: { nodeType: 'webhookTrigger', config: { path: 'error-alerts', method: 'POST' } } },
          { id: 'if_1', type: 'if', name: 'Is Critical?', position: { x: 400, y: 200 }, data: { nodeType: 'if', config: { conditions: [{ field: '{{ $json.severity }}', operator: 'equals', value: 'critical' }], combineOperation: 'any' } } },
          { id: 'slack_1', type: 'slack', name: 'Slack Alert', position: { x: 700, y: 120 }, data: { nodeType: 'slack', config: { channel: '#incidents', message: '🚨 CRITICAL: {{ $json.message }}' } } },
          { id: 'telegram_1', type: 'telegram', name: 'Telegram Alert', position: { x: 700, y: 300 }, data: { nodeType: 'telegram', config: { chatId: '-1001234567890', message: '🚨 CRITICAL: {{ $json.message }}' } } },
        ],
        edges: [
          { id: 'edge_1', source: 'webhookTrigger_1', target: 'if_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'if_1', target: 'slack_1', sourcePort: 'true', targetPort: 'main', animated: true },
          { id: 'edge_3', source: 'if_1', target: 'telegram_1', sourcePort: 'true', targetPort: 'main', animated: true },
        ],
      }),
    },
    {
      name: 'Data Backup Automation',
      description: 'Automatically backup your PostgreSQL database to AWS S3 on a schedule, then send a confirmation email.',
      category: 'DevOps', icon: 'HardDrive', featured: false, usageCount: 1123, rating: 4.3,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'scheduleTrigger_1', type: 'scheduleTrigger', name: 'Daily at 2 AM', position: { x: 100, y: 200 }, data: { nodeType: 'scheduleTrigger', config: { rule: '0 2 * * *', timezone: 'UTC' } } },
          { id: 'postgres_1', type: 'postgres', name: 'Export Data', position: { x: 400, y: 200 }, data: { nodeType: 'postgres', config: { operation: 'executeQuery', query: 'COPY (SELECT * FROM important_table) TO STDOUT WITH CSV HEADER' } } },
          { id: 's3_1', type: 's3', name: 'Upload to S3', position: { x: 700, y: 200 }, data: { nodeType: 's3', config: { operation: 'upload', bucketName: 'my-backups-bucket' } } },
          { id: 'emailSend_1', type: 'emailSend', name: 'Backup Confirmation', position: { x: 1000, y: 200 }, data: { nodeType: 'emailSend', config: { to: 'ops@company.com', subject: '✅ Database Backup Complete' } } },
        ],
        edges: [
          { id: 'edge_1', source: 'scheduleTrigger_1', target: 'postgres_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'postgres_1', target: 's3_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_3', source: 's3_1', target: 'emailSend_1', sourcePort: 'main', targetPort: 'main', animated: true },
        ],
      }),
    },
    {
      name: 'Customer Onboarding',
      description: 'Automate the entire customer onboarding flow: capture signup, send welcome email, notify team, and trigger follow-up.',
      category: 'Customer Success', icon: 'UserPlus', featured: true, usageCount: 1891, rating: 4.6,
      workflowJson: JSON.stringify({
        nodes: [
          { id: 'webhookTrigger_1', type: 'webhookTrigger', name: 'New Signup', position: { x: 100, y: 200 }, data: { nodeType: 'webhookTrigger', config: { path: 'customer-signup', method: 'POST' } } },
          { id: 'set_1', type: 'set', name: 'Prepare Data', position: { x: 400, y: 200 }, data: { nodeType: 'set', config: { assignments: [{ key: 'welcomeName', value: '{{ $json.firstName || $json.email }}' }, { key: 'plan', value: '{{ $json.plan || "free" }}' }] } } },
          { id: 'emailSend_1', type: 'emailSend', name: 'Welcome Email', position: { x: 700, y: 120 }, data: { nodeType: 'emailSend', config: { to: '{{ $json.email }}', subject: 'Welcome aboard, {{ $json.welcomeName }}! 🎉' } } },
          { id: 'slack_1', type: 'slack', name: 'Team Notification', position: { x: 700, y: 300 }, data: { nodeType: 'slack', config: { channel: '#new-customers', message: '🆕 New signup: {{ $json.welcomeName }}' } } },
        ],
        edges: [
          { id: 'edge_1', source: 'webhookTrigger_1', target: 'set_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_2', source: 'set_1', target: 'emailSend_1', sourcePort: 'main', targetPort: 'main', animated: true },
          { id: 'edge_3', source: 'set_1', target: 'slack_1', sourcePort: 'main', targetPort: 'main', animated: true },
        ],
      }),
    },
  ];

  for (const template of templates) {
    await db.template.create({ data: template });
  }
  console.log(`  ✅ Created ${templates.length} templates\n`);

  // ══════════════════════════════════════════════════════════════
  // 7. SAMPLE WORKFLOW & EXECUTION for Tenant 1
  // ══════════════════════════════════════════════════════════════
  console.log('🔧 Creating sample workflow for AquaFlow Plumbing...');

  const sampleWorkflow1 = await db.workflow.create({
    data: {
      name: 'Lead Follow-up Reminder',
      description: 'Automatically sends WhatsApp follow-up reminders for new leads that have not been contacted within 24 hours.',
      nodesJson: JSON.stringify([
        { id: 'scheduleTrigger_1', type: 'scheduleTrigger', name: 'Every Morning 9 AM', position: { x: 100, y: 200 }, data: { nodeType: 'scheduleTrigger', config: { rule: '0 9 * * *', timezone: 'America/Chicago' } } },
        { id: 'httpRequest_1', type: 'httpRequest', name: 'Fetch Stale Leads', position: { x: 400, y: 200 }, data: { nodeType: 'httpRequest', config: { method: 'GET', url: '/api/leads?status=new&olderThan=24h' } } },
        { id: 'if_1', type: 'if', name: 'Has Stale Leads?', position: { x: 700, y: 200 }, data: { nodeType: 'if', config: { conditions: [{ field: '{{ $json.length }}', operator: 'larger', value: '0' }], combineOperation: 'all' } } },
        { id: 'slack_1', type: 'slack', name: 'Notify Team', position: { x: 1000, y: 120 }, data: { nodeType: 'slack', config: { channel: '#sales-leads', message: '⏰ {{ $json.length }} leads need follow-up!' } } },
      ]),
      edgesJson: JSON.stringify([
        { id: 'edge_1', source: 'scheduleTrigger_1', target: 'httpRequest_1', sourcePort: 'main', targetPort: 'main', animated: true },
        { id: 'edge_2', source: 'httpRequest_1', target: 'if_1', sourcePort: 'main', targetPort: 'main', animated: true },
        { id: 'edge_3', source: 'if_1', target: 'slack_1', sourcePort: 'true', targetPort: 'main', animated: true },
      ]),
      settingsJson: JSON.stringify({ timezone: 'America/Chicago' }),
      active: true,
      tags: JSON.stringify(['leads', 'follow-up', 'automation']),
      workspaceId: ws1.id,
      createdById: user1Owner.id,
    },
  });

  await db.workflowVersion.create({
    data: {
      workflowId: sampleWorkflow1.id,
      snapshotJson: JSON.stringify({ nodes: JSON.parse(sampleWorkflow1.nodesJson), edges: JSON.parse(sampleWorkflow1.edgesJson), settings: JSON.parse(sampleWorkflow1.settingsJson) }),
      message: 'Initial version',
      createdById: user1Owner.id,
    },
  });

  // Sample execution
  await db.execution.create({
    data: {
      workflowId: sampleWorkflow1.id, status: 'success', mode: 'trigger',
      startedAt: hoursAgo(3), finishedAt: hoursAgo(3), durationMs: 1450,
      dataJson: JSON.stringify({ trigger: 'schedule', staleLeads: 2 }),
      nodeData: {
        create: [
          { nodeName: 'Every Morning 9 AM', nodeId: 'scheduleTrigger_1', inputJson: '[]', outputJson: JSON.stringify([{ timestamp: hoursAgo(3).toISOString() }]), durationMs: 10, status: 'success' },
          { nodeName: 'Fetch Stale Leads', nodeId: 'httpRequest_1', inputJson: '[]', outputJson: JSON.stringify([{ length: 2 }]), durationMs: 340, status: 'success' },
          { nodeName: 'Has Stale Leads?', nodeId: 'if_1', inputJson: JSON.stringify([{ length: 2 }]), outputJson: JSON.stringify([{ branch: 'true' }]), durationMs: 25, status: 'success' },
          { nodeName: 'Notify Team', nodeId: 'slack_1', inputJson: JSON.stringify([{ channel: '#sales-leads' }]), outputJson: JSON.stringify([{ ok: true }]), durationMs: 980, status: 'success' },
        ],
      },
    },
  });

  console.log('  ✅ Created workflow and execution for AquaFlow Plumbing\n');

  // ══════════════════════════════════════════════════════════════
  // PLATFORM EMAIL & WHATSAPP PROVIDERS
  // ══════════════════════════════════════════════════════════════
  console.log('📧 Seeding platform communication providers...');

  // --- Platform Email Provider (AWS SES) ---
  const platformEmailProvider = await db.emailProvider.upsert({
    where: {
      id: (
        await db.emailProvider.findFirst({
          where: { name: 'AWS SES - ServiceOS (Platform)', isPlatform: true },
          select: { id: true },
        })
      )?.id ?? '___not_found___',
    },
    update: {
      providerType: 'ses',
      isPlatform: true,
      usageType: 'both',
      isDefaultTransactional: true,
      isDefaultMarketing: true,
      status: 'active',
      fromName: 'ServiceOS',
      fromEmail: 'sales@serviceos.cc',
      replyTo: 'sales@serviceos.cc',
      configJson: JSON.stringify({
        smtpHost: 'email-smtp.ap-south-1.amazonaws.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'AKIA2PPO3JBYFJO4G5O',
        smtpPass: 'BInFKprST5upb+sYW5/U4dPAW7n3BZirdZL2FXFWNdPE',
        region: 'ap-south-1',
      }),
      tenantId: tenant1.id,
    },
    create: {
      name: 'AWS SES - ServiceOS (Platform)',
      providerType: 'ses',
      isPlatform: true,
      usageType: 'both',
      isDefaultTransactional: true,
      isDefaultMarketing: true,
      status: 'active',
      fromName: 'ServiceOS',
      fromEmail: 'sales@serviceos.cc',
      replyTo: 'sales@serviceos.cc',
      configJson: JSON.stringify({
        smtpHost: 'email-smtp.ap-south-1.amazonaws.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: 'AKIA2PPO3JBYFJO4G5O',
        smtpPass: 'BInFKprST5upb+sYW5/U4dPAW7n3BZirdZL2FXFWNdPE',
        region: 'ap-south-1',
      }),
      tenantId: tenant1.id,
    },
  });
  console.log('  ✅ Platform email provider (AWS SES) created:', platformEmailProvider.id);

  // --- Platform WhatsApp CommunicationProvider ---
  const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? 'EAAeZCCSIuiJMBRzwDZAAoqOao91PHidrTWqJ2QHMbxnu3wQDtfv7GhOdwFMW8LSgZAAK0mX6eptmS94nZCr1PUJzNpoqaL8C6NcinZClBMDbdGVe05RzNYZAL6CjTPiESYxdv0evV671MAenaAO99cAb7JZBKUPl6aEzcnY8v4YPNvsFIdUze4K4ZBRc06Q1rZCFVg83ZAZBaFxUZADx1ZBEAiwfZCaMkfKXaTEZALZBZBaZAd68eOBrKVIawn7Yc43zjM3qhwk8FLykErhKyPZCCbeLfa2Afqy';
  const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '1117830511419208';
  const whatsappWabaId = process.env.WHATSAPP_WABA_ID ?? '2076211023292638';

  const platformWhatsAppProvider = await db.communicationProvider.upsert({
    where: {
      id: (
        await db.communicationProvider.findFirst({
          where: { type: 'whatsapp', isPlatform: true },
          select: { id: true },
        })
      )?.id ?? '___not_found___',
    },
    update: {
      name: 'WhatsApp Business (Platform)',
      provider: 'meta',
      isPlatform: true,
      isDefault: true,
      status: 'active',
      sendingEnabled: true,
      configJson: JSON.stringify({
        accessToken: whatsappAccessToken,
        phoneNumberId: whatsappPhoneNumberId,
        wabaId: whatsappWabaId,
      }),
      tenantId: tenant1.id,
    },
    create: {
      name: 'WhatsApp Business (Platform)',
      type: 'whatsapp',
      provider: 'meta',
      isPlatform: true,
      isDefault: true,
      status: 'active',
      sendingEnabled: true,
      configJson: JSON.stringify({
        accessToken: whatsappAccessToken,
        phoneNumberId: whatsappPhoneNumberId,
        wabaId: whatsappWabaId,
      }),
      tenantId: tenant1.id,
    },
  });
  console.log('  ✅ Platform WhatsApp provider created:', platformWhatsAppProvider.id);
  console.log('');

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log('════════════════════════════════════════════════════════');
  console.log('🎉 Seeding complete!');
  console.log('════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 DEMO ACCOUNTS:');
  console.log('─────────────────────────────────────────────────────');
  console.log('  👑 SuperAdmin:');
  console.log('     admin@serviceos.com  / Admin@123     (Platform Admin — sees all tenants)');
  console.log('');
  console.log('  🔧 Tenant 1 — AquaFlow Plumbing (Starter):');
  console.log('     rajesh@aquaflow.com  / Owner@123     (Owner)');
  console.log('     priya@aquaflow.com   / Manager@123   (Manager)');
  console.log('     amit@aquaflow.com    / Dispatch@123  (Dispatcher / Admin role)');
  console.log('     suresh@aquaflow.com  / Employee@123  (Technician)');
  console.log('');
  console.log('  🧹 Tenant 2 — SparkClean Services (Growth):');
  console.log('     sarah@sparkclean.com / Owner@123     (Owner)');
  console.log('     emma@sparkclean.com  / Manager@123   (Manager)');
  console.log('     mike@sparkclean.com  / Employee@123  (Technician)');
  console.log('');
  console.log('  📦 Tenant 3 — QuickMove Packers (Pro):');
  console.log('     arun@quickmove.com   / Owner@123     (Owner)');
  console.log('     sunita@quickmove.com / Manager@123   (Manager)');
  console.log('     vikram@quickmove.com / Employee@123  (Technician)');
  console.log('─────────────────────────────────────────────────────');
  console.log('');
  console.log('📊 DATA SUMMARY:');
  console.log('  Tenants: 3 | SuperAdmin: 1 | Total Users: 11 | Workspaces: 3');
  console.log('  Employees: 16 | Customers: 19 | Leads: 18');
  console.log('  Jobs: 20 (pending: 3, assigned: 3, in_progress: 3, on_hold: 2, completed: 7, cancelled: 2)');
  console.log('  Invoices: 6 (paid: 3, pending: 3) | Subscriptions: 5');
  console.log('  Templates: 8 | Workflows: 1 | Executions: 1');
  console.log('  Platform Email Provider: AWS SES | Platform WhatsApp Provider: Meta Cloud API');
  console.log('════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
