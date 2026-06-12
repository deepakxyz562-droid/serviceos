import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// For seeding, use DIRECT_URL (standard pg connection) instead of the pooled HTTP URL
// This avoids issues with the Neon HTTP adapter during bulk operations
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';

const db = new PrismaClient({
  datasourceUrl: directUrl,
  log: ['error', 'warn'],
});

// ──────────────────────────────────────────────
// Date helpers
// ──────────────────────────────────────────────
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

async function main() {
  console.log('🌱 Seeding ServiceOS — 5 Users (1 SuperAdmin) + Full Dummy Data...\n');

  // ════════════════════════════════════════════════
  // 0. CLEAN ALL EXISTING DATA (reverse dependency order)
  // ════════════════════════════════════════════════
  console.log('🧹 Cleaning existing data...');
  await db.whatsAppMessageAction.deleteMany();
  await db.webhookTestRequest.deleteMany();
  await db.webhookEndpointLog.deleteMany();
  await db.webhookEndpoint.deleteMany();
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
  await db.inboxMessage.deleteMany();
  await db.chatLabel.deleteMany();
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
  await db.form.deleteMany();
  await db.formResponse.deleteMany();
  await db.workflowAutomation.deleteMany();
  await db.channelConfig.deleteMany();
  await db.user.deleteMany();
  await db.workspace.deleteMany();
  await db.tenant.deleteMany();
  console.log('  ✅ All existing data cleared\n');

  // ════════════════════════════════════════════════
  // 1. HASH ALL PASSWORDS
  // ════════════════════════════════════════════════
  console.log('🔑 Hashing passwords...');
  const superAdminHash = await bcrypt.hash('SuperAdmin@123', 12);
  const ownerHash = await bcrypt.hash('Owner@123', 12);
  const managerHash = await bcrypt.hash('Manager@123', 12);
  const techHash = await bcrypt.hash('Technician@123', 12);
  const dispatchHash = await bcrypt.hash('Dispatch@123', 12);
  console.log('  ✅ Passwords hashed\n');

  // ════════════════════════════════════════════════
  // 2. USER 1: SUPERADMIN (Platform Level — no tenant)
  // ════════════════════════════════════════════════
  console.log('👑 Creating SuperAdmin...');
  const superAdmin = await db.user.create({
    data: {
      email: 'admin@serviceos.com',
      name: 'Vikram Mehta',
      role: 'admin',
      passwordHash: superAdminHash,
      phone: '+1-800-555-0001',
      avatar: null,
      isActive: true,
      lastLoginAt: hoursAgo(2),
      tenantId: null,
      workspaceId: null,
    },
  });
  console.log('  ✅ SuperAdmin: admin@serviceos.com / SuperAdmin@123\n');

  // ══════════════════════════════════════════════════════════════
  // 3. TENANT: ServiceOS Demo Corp (Growth Plan — Multi-Service)
  // ══════════════════════════════════════════════════════════════
  console.log('🏢 Creating Tenant: ServiceOS Demo Corp...');
  const tenant = await db.tenant.create({
    data: {
      name: 'ServiceOS Demo Corp',
      slug: 'serviceos-demo',
      industry: 'home-services',
      email: 'rajesh@serviceos-demo.com',
      phone: '+1-555-0100',
      address: '100 Business Park, Suite 400, Houston, TX 77001',
      country: 'US',
      currency: 'USD',
      whatsappPhone: '+1-555-0100',
      plan: 'growth',
      planStatus: 'active',
      planStartedAt: daysAgo(60),
      onboardingCompleted: true,
      settingsJson: JSON.stringify({
        timezone: 'America/Chicago',
        workingHours: { start: '09:00', end: '18:00' },
        autoAssign: true,
        notifyOnNewLead: true,
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════
  // 4. USERS 2-5 (Tenant Users)
  // ══════════════════════════════════════════════════════════════

  // USER 2: Owner
  const owner = await db.user.create({
    data: {
      email: 'rajesh@serviceos-demo.com',
      name: 'Rajesh Kumar',
      role: 'owner',
      passwordHash: ownerHash,
      phone: '+1-555-0101',
      isActive: true,
      lastLoginAt: hoursAgo(1),
      tenantId: tenant.id,
    },
  });

  // USER 3: Manager
  const manager = await db.user.create({
    data: {
      email: 'priya@serviceos-demo.com',
      name: 'Priya Patel',
      role: 'manager',
      passwordHash: managerHash,
      phone: '+1-555-0102',
      isActive: true,
      lastLoginAt: hoursAgo(5),
      tenantId: tenant.id,
    },
  });

  // USER 4: Technician
  const technician = await db.user.create({
    data: {
      email: 'amit@serviceos-demo.com',
      name: 'Amit Singh',
      role: 'technician',
      passwordHash: techHash,
      phone: '+1-555-0103',
      isActive: true,
      lastLoginAt: daysAgo(1),
      tenantId: tenant.id,
    },
  });

  // USER 5: Dispatcher
  const dispatcher = await db.user.create({
    data: {
      email: 'suresh@serviceos-demo.com',
      name: 'Suresh Naik',
      role: 'admin',
      passwordHash: dispatchHash,
      phone: '+1-555-0104',
      isActive: true,
      lastLoginAt: hoursAgo(12),
      tenantId: tenant.id,
    },
  });

  console.log('  ✅ User 2 (Owner): rajesh@serviceos-demo.com / Owner@123');
  console.log('  ✅ User 3 (Manager): priya@serviceos-demo.com / Manager@123');
  console.log('  ✅ User 4 (Technician): amit@serviceos-demo.com / Technician@123');
  console.log('  ✅ User 5 (Dispatcher): suresh@serviceos-demo.com / Dispatch@123\n');

  // ════════════════════════════════════════════════
  // 5. WORKSPACE
  // ════════════════════════════════════════════════
  console.log('📂 Creating workspace...');
  const workspace = await db.workspace.create({
    data: {
      name: 'ServiceOS Demo Corp',
      slug: 'serviceos-demo',
      industry: 'home-services',
      plan: 'growth',
      ownerId: owner.id,
      tenantId: tenant.id,
      settingsJson: JSON.stringify({
        defaultJobDuration: 120,
        autoAssignNearest: true,
        notificationPreferences: { email: true, whatsapp: true, sms: false },
      }),
    },
  });

  // Link users to workspace
  await db.user.update({ where: { id: owner.id }, data: { workspaceId: workspace.id } });
  await db.user.update({ where: { id: manager.id }, data: { workspaceId: workspace.id } });
  await db.user.update({ where: { id: technician.id }, data: { workspaceId: workspace.id } });
  await db.user.update({ where: { id: dispatcher.id }, data: { workspaceId: workspace.id } });
  console.log('  ✅ Workspace created & users linked\n');

  // ════════════════════════════════════════════════
  // 6. SUBSCRIPTION
  // ════════════════════════════════════════════════
  console.log('💳 Creating subscription...');
  await db.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: 'growth',
      status: 'active',
      amount: 79,
      currency: 'USD',
      billingCycle: 'monthly',
      startDate: daysAgo(60),
      endDate: daysFromNow(305),
      maxUsers: 10,
      maxJobs: 500,
      maxWorkflows: 50,
      featuresJson: JSON.stringify({
        omnichannel: true, marketingHub: true, aiChatbot: true,
        customWorkflows: true, advancedAnalytics: true, apiAccess: true,
      }),
    },
  });
  console.log('  ✅ Subscription: Growth Plan ($79/mo)\n');

  // ════════════════════════════════════════════════
  // 7. SERVICES
  // ════════════════════════════════════════════════
  console.log('🔧 Creating services...');
  const services = [];
  const serviceData = [
    { name: 'Plumbing Repair', description: 'General plumbing repair and maintenance', category: 'plumbing', basePrice: 150, duration: 90, icon: 'wrench' },
    { name: 'Drain Cleaning', description: 'Professional drain cleaning with hydro-jetting', category: 'plumbing', basePrice: 200, duration: 120, icon: 'droplets' },
    { name: 'Water Heater Install', description: 'Tankless water heater installation', category: 'plumbing', basePrice: 800, duration: 240, icon: 'flame' },
    { name: 'Deep Home Cleaning', description: 'Full deep cleaning for homes', category: 'cleaning', basePrice: 250, duration: 240, icon: 'sparkles' },
    { name: 'Carpet Steam Clean', description: 'Professional carpet steam cleaning', category: 'cleaning', basePrice: 180, duration: 120, icon: 'wind' },
    { name: 'Office Cleaning', description: 'Commercial office space cleaning', category: 'cleaning', basePrice: 350, duration: 180, icon: 'building' },
    { name: 'AC Installation', description: 'Air conditioning unit installation', category: 'hvac', basePrice: 600, duration: 300, icon: 'thermometer' },
    { name: 'AC Repair', description: 'AC diagnostic and repair service', category: 'hvac', basePrice: 120, duration: 90, icon: 'snowflake' },
    { name: 'House Painting', description: 'Interior/exterior house painting', category: 'painting', basePrice: 1500, duration: 480, icon: 'paintbrush' },
    { name: 'Pest Control', description: 'Residential pest control treatment', category: 'pest-control', basePrice: 100, duration: 60, icon: 'bug' },
  ];
  for (const s of serviceData) {
    const service = await db.service.create({ data: { ...s, tenantId: tenant.id } });
    services.push(service);
  }
  console.log(`  ✅ ${services.length} services created\n`);

  // ════════════════════════════════════════════════
  // 8. EMPLOYEES
  // ════════════════════════════════════════════════
  console.log('👥 Creating employees...');
  const employees = [];

  const emp_owner = await db.employee.create({
    data: {
      name: 'Rajesh Kumar', phone: '+1-555-0101', email: 'rajesh@serviceos-demo.com',
      role: 'owner', status: 'available',
      skills: '["plumbing","estimation","project_management","sales"]',
      rating: 4.9, completedJobs: 120, location: 'Houston, TX',
      workspaceId: workspace.id, userId: owner.id,
    },
  });
  employees.push(emp_owner);

  const emp_manager = await db.employee.create({
    data: {
      name: 'Priya Patel', phone: '+1-555-0102', email: 'priya@serviceos-demo.com',
      role: 'manager', status: 'available',
      skills: '["scheduling","customer_service","quality_assurance","team_management"]',
      rating: 4.8, completedJobs: 45, location: 'Houston, TX',
      workspaceId: workspace.id, userId: manager.id,
    },
  });
  employees.push(emp_manager);

  const emp_tech1 = await db.employee.create({
    data: {
      name: 'Amit Singh', phone: '+1-555-0103', email: 'amit@serviceos-demo.com',
      role: 'technician', status: 'available',
      skills: '["plumbing","pipe_fitting","water_heater","drain_cleaning"]',
      rating: 4.6, completedJobs: 87, location: 'Sugar Land, TX',
      workspaceId: workspace.id, userId: technician.id,
    },
  });
  employees.push(emp_tech1);

  const emp_tech2 = await db.employee.create({
    data: {
      name: 'Deepak Rao', phone: '+1-555-0105',
      role: 'technician', status: 'busy',
      skills: '["hvac","ac_installation","ac_repair","refrigeration"]',
      rating: 4.7, completedJobs: 65, location: 'Katy, TX',
      workspaceId: workspace.id,
    },
  });
  employees.push(emp_tech2);

  const emp_tech3 = await db.employee.create({
    data: {
      name: 'Neha Sharma', phone: '+1-555-0106',
      role: 'technician', status: 'available',
      skills: '["cleaning","deep_cleaning","carpet_steam","upholstery"]',
      rating: 4.5, completedJobs: 92, location: 'The Woodlands, TX',
      workspaceId: workspace.id,
    },
  });
  employees.push(emp_tech3);

  const emp_driver = await db.employee.create({
    data: {
      name: 'Ravi Shetty', phone: '+1-555-0107',
      role: 'driver', status: 'available',
      skills: '["driving","delivery","equipment_transport"]',
      rating: 4.4, completedJobs: 55, location: 'Pearland, TX',
      workspaceId: workspace.id,
    },
  });
  employees.push(emp_driver);

  const emp_dispatcher = await db.employee.create({
    data: {
      name: 'Suresh Naik', phone: '+1-555-0104', email: 'suresh@serviceos-demo.com',
      role: 'dispatcher', status: 'available',
      skills: '["dispatch","routing","customer_coordination","scheduling"]',
      rating: 4.6, completedJobs: 30, location: 'Houston, TX',
      workspaceId: workspace.id, userId: dispatcher.id,
    },
  });
  employees.push(emp_dispatcher);

  console.log(`  ✅ ${employees.length} employees created\n`);

  // ════════════════════════════════════════════════
  // 9. CUSTOMERS
  // ════════════════════════════════════════════════
  console.log('🏠 Creating customers...');
  const customers = [];
  const customerData = [
    { name: 'James Wilson', phone: '+1-555-1001', email: 'james.wilson@email.com', address: '15 Oak Street, Houston, TX 77002' },
    { name: 'Maria Garcia', phone: '+1-555-1002', email: 'maria.g@email.com', address: '220 Elm Blvd, Houston, TX 77003' },
    { name: 'Tom Henderson', phone: '+1-555-1003', email: 'tom.h@email.com', address: '89 Pine Road, Houston, TX 77004' },
    { name: 'Linda Chen', phone: '+1-555-1004', email: 'linda.c@email.com', address: '331 Maple Drive, Houston, TX 77005' },
    { name: 'Robert Kim', phone: '+1-555-1005', email: 'robert.k@email.com', address: '77 Cedar Lane, Houston, TX 77006' },
    { name: 'Sarah Mitchell', phone: '+1-555-1006', email: 'sarah.m@email.com', address: '445 Birch St, Houston, TX 77007' },
    { name: 'TechCorp Office', phone: '+1-555-1007', email: 'office@techcorp.com', address: '1200 Innovation Pkwy, Houston, TX 77008' },
    { name: 'Amanda Foster', phone: '+1-555-1008', email: 'amanda.f@email.com', address: '67 River Rd, Sugar Land, TX 77478' },
    { name: 'Brian Mitchell', phone: '+1-555-1009', email: 'brian.m@email.com', address: '102 Lake View Dr, Katy, TX 77494' },
    { name: 'Catherine Lee', phone: '+1-555-1010', email: 'cathy.lee@email.com', address: '88 Sunrise Blvd, The Woodlands, TX 77380' },
  ];
  for (const c of customerData) {
    const customer = await db.customer.create({ data: { ...c, workspaceId: workspace.id } });
    customers.push(customer);
  }
  console.log(`  ✅ ${customers.length} customers created\n`);

  // ════════════════════════════════════════════════
  // 10. JOBS (all lifecycle states)
  // ════════════════════════════════════════════════
  console.log('📋 Creating jobs...');

  // PENDING — no assignee yet
  await db.job.create({
    data: {
      title: 'Leaking Kitchen Faucet', description: 'Customer reports persistent dripping from kitchen faucet. Needs assessment and repair.',
      status: 'pending', priority: 'medium', type: 'plumbing',
      address: '15 Oak Street, Houston, TX 77002',
      scheduledAt: daysFromNow(1), estimatedDuration: 90,
      customerId: customers[0].id, customerName: 'James Wilson', customerPhone: '+1-555-1001',
      serviceId: services[0].id,
      workspaceId: workspace.id, createdAt: daysAgo(0),
    },
  });

  // PENDING — another one
  await db.job.create({
    data: {
      title: 'Deep Clean - 4BR Home', description: 'Full deep cleaning of 4BR house including inside appliances and baseboards.',
      status: 'pending', priority: 'low', type: 'cleaning',
      address: '67 River Rd, Sugar Land, TX 77478',
      scheduledAt: daysFromNow(3), estimatedDuration: 360,
      customerId: customers[7].id, customerName: 'Amanda Foster', customerPhone: '+1-555-1008',
      serviceId: services[3].id,
      workspaceId: workspace.id, createdAt: daysAgo(1),
    },
  });

  // ASSIGNED — assigned, waiting to start
  await db.job.create({
    data: {
      title: 'Clogged Bathroom Drain', description: 'Main bathroom drain is completely blocked. Customer tried drain cleaner without success.',
      status: 'assigned', priority: 'high', type: 'plumbing',
      address: '220 Elm Blvd, Houston, TX 77003',
      scheduledAt: daysFromNow(0), estimatedDuration: 120,
      customerId: customers[1].id, customerName: 'Maria Garcia', customerPhone: '+1-555-1002',
      assigneeId: emp_tech1.id, assigneeName: 'Amit Singh', assigneePhone: '+1-555-0103',
      assignmentStatus: 'pending', serviceId: services[1].id,
      workspaceId: workspace.id, createdAt: daysAgo(1),
    },
  });

  // ASSIGNED — another
  await db.job.create({
    data: {
      title: 'AC Installation - New Unit', description: 'Install new 2-ton AC unit in the master bedroom.',
      status: 'assigned', priority: 'high', type: 'hvac',
      address: '102 Lake View Dr, Katy, TX 77494',
      scheduledAt: daysFromNow(1), estimatedDuration: 300,
      customerId: customers[8].id, customerName: 'Brian Mitchell', customerPhone: '+1-555-1009',
      assigneeId: emp_tech2.id, assigneeName: 'Deepak Rao', assigneePhone: '+1-555-0105',
      assignmentStatus: 'accepted', serviceId: services[6].id,
      workspaceId: workspace.id, createdAt: daysAgo(2),
    },
  });

  // IN_PROGRESS
  await db.job.create({
    data: {
      title: 'Water Heater Installation', description: 'Install new tankless water heater to replace old 50-gallon tank unit.',
      status: 'in_progress', priority: 'high', type: 'plumbing',
      address: '331 Maple Drive, Houston, TX 77005',
      scheduledAt: daysAgo(0), estimatedDuration: 240, actualStartTime: hoursAgo(3),
      customerId: customers[3].id, customerName: 'Linda Chen', customerPhone: '+1-555-1004',
      assigneeId: emp_tech1.id, assigneeName: 'Amit Singh', assigneePhone: '+1-555-0103',
      serviceId: services[2].id,
      workspaceId: workspace.id, createdAt: daysAgo(2),
    },
  });

  // IN_PROGRESS — carpet cleaning
  await db.job.create({
    data: {
      title: 'Carpet Steam Cleaning', description: 'Steam clean all carpets in 3-story home. Includes stain pre-treatment and deodorizing.',
      status: 'in_progress', priority: 'medium', type: 'cleaning',
      address: '88 Sunrise Blvd, The Woodlands, TX 77380',
      scheduledAt: daysAgo(0), estimatedDuration: 180, actualStartTime: hoursAgo(1),
      customerId: customers[9].id, customerName: 'Catherine Lee', customerPhone: '+1-555-1010',
      assigneeId: emp_tech3.id, assigneeName: 'Neha Sharma', assigneePhone: '+1-555-0106',
      serviceId: services[4].id,
      workspaceId: workspace.id, createdAt: daysAgo(3),
    },
  });

  // COMPLETED
  const job_completed = await db.job.create({
    data: {
      title: 'Bathroom Pipe Replacement', description: 'Replace corroded copper pipes in master bathroom with PEX tubing.',
      status: 'completed', priority: 'high', type: 'plumbing',
      address: '220 Elm Blvd, Houston, TX 77003',
      scheduledAt: daysAgo(7), estimatedDuration: 300,
      actualStartTime: daysAgo(7), actualEndTime: daysAgo(6),
      customerId: customers[1].id, customerName: 'Maria Garcia', customerPhone: '+1-555-1002',
      assigneeId: emp_tech1.id, assigneeName: 'Amit Singh', assigneePhone: '+1-555-0103',
      serviceId: services[0].id,
      workspaceId: workspace.id, createdAt: daysAgo(10),
    },
  });

  // COMPLETED
  const job_completed2 = await db.job.create({
    data: {
      title: 'Office Weekly Cleaning', description: 'Weekly cleaning for TechCorp office. Includes common areas, meeting rooms, and kitchen.',
      status: 'completed', priority: 'medium', type: 'cleaning',
      address: '1200 Innovation Pkwy, Houston, TX 77008',
      scheduledAt: daysAgo(5), estimatedDuration: 240,
      actualStartTime: daysAgo(5), actualEndTime: daysAgo(5),
      customerId: customers[6].id, customerName: 'TechCorp Office', customerPhone: '+1-555-1007',
      assigneeId: emp_tech3.id, assigneeName: 'Neha Sharma', assigneePhone: '+1-555-0106',
      serviceId: services[5].id,
      workspaceId: workspace.id, createdAt: daysAgo(8),
    },
  });

  // COMPLETED
  const job_completed3 = await db.job.create({
    data: {
      title: 'AC Repair - No Cooling', description: 'AC unit not cooling. Diagnosed as refrigerant leak and recharged.',
      status: 'completed', priority: 'medium', type: 'hvac',
      address: '77 Cedar Lane, Houston, TX 77006',
      scheduledAt: daysAgo(12), estimatedDuration: 120,
      actualStartTime: daysAgo(12), actualEndTime: daysAgo(12),
      customerId: customers[4].id, customerName: 'Robert Kim', customerPhone: '+1-555-1005',
      assigneeId: emp_tech2.id, assigneeName: 'Deepak Rao', assigneePhone: '+1-555-0105',
      serviceId: services[7].id,
      workspaceId: workspace.id, createdAt: daysAgo(14),
    },
  });

  // CANCELLED
  await db.job.create({
    data: {
      title: 'Sewer Line Camera Inspection', description: 'Customer requested sewer line camera inspection but cancelled after resolving issue.',
      status: 'cancelled', priority: 'low', type: 'plumbing',
      address: '89 Pine Road, Houston, TX 77004',
      scheduledAt: daysAgo(5), estimatedDuration: 120,
      customerId: customers[2].id, customerName: 'Tom Henderson', customerPhone: '+1-555-1003',
      assigneeId: emp_tech1.id, assigneeName: 'Amit Singh', assigneePhone: '+1-555-0103',
      notes: 'Customer cancelled — resolved issue on their own',
      workspaceId: workspace.id, createdAt: daysAgo(8),
    },
  });

  console.log('  ✅ 10 jobs created (2 pending, 2 assigned, 2 in_progress, 3 completed, 1 cancelled)\n');

  // ════════════════════════════════════════════════
  // 11. LEADS (all stages)
  // ════════════════════════════════════════════════
  console.log('🎯 Creating leads...');
  const leadData = [
    { name: 'Susan Miller', phone: '+1-555-2001', email: 'susan.m@email.com', source: 'website', status: 'new', priority: 'high', value: 850, description: 'Leaking kitchen faucet — needs same-day visit', serviceType: 'plumbing', address: '45 Birch St, Houston, TX 77007', assignedToId: emp_manager.id, followUpAt: daysFromNow(1) },
    { name: 'Derek Thompson', phone: '+1-555-2002', email: 'derek.t@email.com', source: 'referral', status: 'contacted', priority: 'medium', value: 1200, description: 'Bathroom remodel plumbing — 2 full bathrooms', serviceType: 'plumbing', address: '112 Walnut Ave, Houston, TX 77008', assignedToId: emp_tech1.id, followUpAt: daysFromNow(2) },
    { name: 'Angela Wright', phone: '+1-555-2003', email: 'angela.w@email.com', source: 'google', status: 'qualified', priority: 'high', value: 2500, description: 'Full house re-piping — 1960s galvanized pipes', serviceType: 'plumbing', address: '88 Spruce Ct, Houston, TX 77009', assignedToId: emp_owner.id, followUpAt: daysFromNow(3) },
    { name: 'Carlos Rivera', phone: '+1-555-2004', email: 'carlos.r@email.com', source: 'whatsapp', status: 'proposal', priority: 'medium', value: 3500, description: 'Commercial kitchen plumbing for new restaurant', serviceType: 'plumbing', address: '201 Ash Blvd, Houston, TX 77010', assignedToId: emp_manager.id, followUpAt: daysFromNow(1) },
    { name: 'Emily Watson', phone: '+1-555-2005', email: 'emily.w@email.com', source: 'website', status: 'won', priority: 'high', value: 3200, description: 'Water heater installation — converted to job', serviceType: 'plumbing', address: '55 Redwood Dr, Houston, TX 77011', assignedToId: emp_owner.id, convertedAt: daysAgo(10), customerId: customers[5].id },
    { name: 'Frank Lopez', phone: '+1-555-2006', email: 'frank.l@email.com', source: 'facebook', status: 'lost', priority: 'low', value: 600, description: 'Faucet replacement — went with competitor', serviceType: 'plumbing', address: '90 Poplar St, Houston, TX 77012', assignedToId: emp_tech1.id },
    { name: 'Grace Kim', phone: '+1-555-2007', email: 'grace.k@email.com', source: 'google', status: 'new', priority: 'high', value: 1800, description: 'Full house deep cleaning before moving in', serviceType: 'cleaning', address: '305 Oak Crossing, Sugar Land, TX 77479', assignedToId: emp_manager.id, followUpAt: daysFromNow(1) },
    { name: 'Henry Park', phone: '+1-555-2008', email: 'henry.p@email.com', source: 'instagram', status: 'contacted', priority: 'medium', value: 650, description: 'AC unit making strange noises — needs diagnostic', serviceType: 'hvac', address: '710 Lake Rd, Katy, TX 77450', assignedToId: emp_tech2.id, followUpAt: daysFromNow(2) },
    { name: 'Irene Davis', phone: '+1-555-2009', email: 'irene.d@email.com', source: 'website', status: 'qualified', priority: 'high', value: 4500, description: 'Interior painting — 2500 sq ft home, 4 rooms', serviceType: 'painting', address: '422 Meadow Ln, Pearland, TX 77584', assignedToId: emp_owner.id, followUpAt: daysFromNow(4) },
    { name: 'Jake Wilson', phone: '+1-555-2010', email: 'jake.w@email.com', source: 'whatsapp', status: 'proposal', priority: 'medium', value: 900, description: 'Pest control — termite inspection and treatment', serviceType: 'pest-control', address: '88 Pine Road, Houston, TX 77004', assignedToId: emp_dispatcher.id, followUpAt: daysFromNow(2) },
  ];
  for (const l of leadData) {
    await db.lead.create({
      data: {
        ...l,
        tenantId: tenant.id,
        createdAt: daysAgo(Math.floor(Math.random() * 20) + 1),
      },
    });
  }
  console.log(`  ✅ ${leadData.length} leads created (all stages)\n`);

  // ════════════════════════════════════════════════
  // 12. INVOICES
  // ════════════════════════════════════════════════
  console.log('📄 Creating invoices...');
  await db.invoice.create({
    data: {
      number: 'INV-SOS-001', tenantId: tenant.id, jobId: job_completed.id,
      customerId: customers[1].id, employeeId: emp_tech1.id,
      amount: 850, tax: 68, discount: 0, total: 918, currency: 'USD',
      status: 'paid', dueDate: daysAgo(5), paidAt: daysAgo(3),
      itemsJson: JSON.stringify([
        { description: 'Bathroom Pipe Replacement', quantity: 1, rate: 650 },
        { description: 'Pipe fittings & PEX materials', quantity: 1, rate: 200 },
      ]),
      notes: 'Thank you for your business!', createdAt: daysAgo(6),
    },
  });
  await db.invoice.create({
    data: {
      number: 'INV-SOS-002', tenantId: tenant.id, jobId: job_completed2.id,
      customerId: customers[6].id, employeeId: emp_tech3.id,
      amount: 1400, tax: 112, discount: 100, total: 1412, currency: 'USD',
      status: 'paid', dueDate: daysAgo(2), paidAt: daysAgo(1),
      itemsJson: JSON.stringify([
        { description: 'Office Weekly Clean (4 sessions)', quantity: 4, rate: 350 },
      ]),
      notes: 'Monthly recurring — loyalty discount applied', createdAt: daysAgo(5),
    },
  });
  await db.invoice.create({
    data: {
      number: 'INV-SOS-003', tenantId: tenant.id, jobId: job_completed3.id,
      customerId: customers[4].id, employeeId: emp_tech2.id,
      amount: 320, tax: 25.6, discount: 0, total: 345.6, currency: 'USD',
      status: 'pending', dueDate: daysFromNow(14),
      itemsJson: JSON.stringify([
        { description: 'AC Repair — Diagnostic & Refrigerant Recharge', quantity: 1, rate: 250 },
        { description: 'Refrigerant R-410A (2 lbs)', quantity: 2, rate: 35 },
      ]),
      notes: 'Net 30 payment terms', createdAt: daysAgo(12),
    },
  });
  await db.invoice.create({
    data: {
      number: 'INV-SOS-004', tenantId: tenant.id,
      customerId: customers[0].id, employeeId: emp_owner.id,
      amount: 2500, tax: 200, discount: 150, total: 2550, currency: 'USD',
      status: 'overdue', dueDate: daysAgo(7),
      itemsJson: JSON.stringify([
        { description: 'Full House Painting — Interior', quantity: 1, rate: 2500 },
      ]),
      notes: 'Payment overdue — follow-up sent', createdAt: daysAgo(30),
    },
  });
  console.log('  ✅ 4 invoices created (2 paid, 1 pending, 1 overdue)\n');

  // ════════════════════════════════════════════════
  // 13. REVIEWS
  // ════════════════════════════════════════════════
  console.log('⭐ Creating reviews...');
  const reviewData = [
    { rating: 5, comment: 'Excellent work! Amit fixed our bathroom pipes quickly and professionally. Highly recommend!', jobId: job_completed.id, customerId: customers[1].id, employeeId: emp_tech1.id },
    { rating: 4, comment: 'Good cleaning service. Office looks great. Would book again.', jobId: job_completed2.id, customerId: customers[6].id, employeeId: emp_tech3.id },
    { rating: 5, comment: 'Deepak was very knowledgeable. Fixed our AC in under 2 hours. Fair pricing too.', jobId: job_completed3.id, customerId: customers[4].id, employeeId: emp_tech2.id },
    { rating: 3, comment: 'Service was okay but arrived later than scheduled. Work quality was fine though.', customerId: customers[2].id, employeeId: emp_tech1.id },
    { rating: 5, comment: 'Rajesh provided a thorough estimate and explained everything clearly. Very professional!', customerId: customers[3].id, employeeId: emp_owner.id },
    { rating: 4, comment: 'Neha did a wonderful job with our carpet cleaning. Stains that were there for years are gone!', customerId: customers[9].id, employeeId: emp_tech3.id },
  ];
  for (const r of reviewData) {
    await db.review.create({ data: { ...r, tenantId: tenant.id } });
  }
  console.log(`  ✅ ${reviewData.length} reviews created\n`);

  // ════════════════════════════════════════════════
  // 14. QUOTES
  // ════════════════════════════════════════════════
  console.log('📝 Creating quotes...');
  await db.quote.create({
    data: {
      title: 'Full House Re-piping Estimate',
      description: 'Complete re-piping of 1960s home with galvanized pipes. Replace with PEX tubing throughout.',
      itemsJson: JSON.stringify([
        { serviceId: services[0].id, name: 'Plumbing Repair — Re-piping', price: 2500, qty: 1 },
        { serviceId: services[2].id, name: 'Water Heater Inspection', price: 100, qty: 1 },
      ]),
      subtotal: 2600, tax: 208, taxRate: 8, discount: 100, discountType: 'fixed',
      total: 2708, status: 'sent',
      tenantId: tenant.id, customerId: customers[2].id,
      validUntil: daysFromNow(30),
    },
  });
  await db.quote.create({
    data: {
      title: 'Office Cleaning Contract — Monthly',
      description: 'Monthly commercial cleaning for 5000 sq ft office space.',
      itemsJson: JSON.stringify([
        { serviceId: services[5].id, name: 'Office Cleaning', price: 350, qty: 12 },
      ]),
      subtotal: 4200, tax: 336, taxRate: 8, discount: 200, discountType: 'fixed',
      total: 4336, status: 'accepted',
      tenantId: tenant.id, customerId: customers[6].id,
      validUntil: daysFromNow(60),
    },
  });
  await db.quote.create({
    data: {
      title: 'Interior Painting — 4BR Home',
      description: 'Full interior painting with premium paint. Includes prep work, 2 coats, and cleanup.',
      itemsJson: JSON.stringify([
        { serviceId: services[8].id, name: 'House Painting — Interior', price: 1500, qty: 1 },
        { name: 'Accent Wall (2 rooms)', price: 300, qty: 1 },
      ]),
      subtotal: 1800, tax: 144, taxRate: 8, discount: 0, discountType: 'fixed',
      total: 1944, status: 'draft',
      tenantId: tenant.id, customerId: customers[7].id,
      validUntil: daysFromNow(14),
    },
  });
  console.log('  ✅ 3 quotes created (1 sent, 1 accepted, 1 draft)\n');

  // ════════════════════════════════════════════════
  // 15. NOTIFICATIONS
  // ════════════════════════════════════════════════
  console.log('🔔 Creating notifications...');
  const notifData = [
    { title: 'New Lead Assigned', message: 'Susan Miller has been assigned to you from website', type: 'info', userId: manager.id, tenantId: tenant.id },
    { title: 'Job Completed', message: 'Bathroom Pipe Replacement job has been completed by Amit Singh', type: 'success', userId: owner.id, tenantId: tenant.id },
    { title: 'Invoice Overdue', message: 'INV-SOS-004 is 7 days overdue. Follow-up required.', type: 'warning', userId: owner.id, tenantId: tenant.id },
    { title: 'New WhatsApp Message', message: 'You have a new message from +1-555-2004 (Carlos Rivera)', type: 'info', userId: manager.id, tenantId: tenant.id },
    { title: 'Lead Converted', message: 'Emily Watson lead has been converted to a customer!', type: 'success', userId: owner.id, tenantId: tenant.id },
    { title: 'Employee Check-in', message: 'Amit Singh has checked in at 15 Oak Street', type: 'info', userId: dispatcher.id, tenantId: tenant.id },
  ];
  for (const n of notifData) {
    await db.notification.create({ data: n });
  }
  console.log(`  ✅ ${notifData.length} notifications created\n`);

  // ════════════════════════════════════════════════
  // 16. CHANNEL CONFIGS
  // ════════════════════════════════════════════════
  console.log('📡 Creating channel configs...');
  const channelData = [
    { channel: 'whatsapp', name: 'WhatsApp Business', configJson: '{}', status: 'active', isDefault: true, autoCreateLead: true, autoReply: true, autoReplyMessage: 'Thank you for contacting us! We will get back to you shortly.', totalLeads: 45, totalMessages: 312, lastActivityAt: hoursAgo(1) },
    { channel: 'email', name: 'Email SMTP', configJson: '{}', status: 'active', autoCreateLead: true, autoReply: false, totalLeads: 18, totalMessages: 95, lastActivityAt: hoursAgo(5) },
    { channel: 'sms', name: 'SMS Twilio', configJson: '{}', status: 'active', autoCreateLead: true, autoReply: true, autoReplyMessage: 'Thanks for your text! We will respond during business hours.', totalLeads: 12, totalMessages: 67 },
    { channel: 'instagram', name: 'Instagram DM', configJson: '{}', status: 'disconnected', autoCreateLead: true, totalLeads: 0, totalMessages: 0 },
    { channel: 'facebook', name: 'Facebook Messenger', configJson: '{}', status: 'disconnected', autoCreateLead: true, totalLeads: 0, totalMessages: 0 },
    { channel: 'google_ads', name: 'Google Ads Lead Form', configJson: '{}', status: 'disconnected', autoCreateLead: true, totalLeads: 0, totalMessages: 0 },
  ];
  for (const ch of channelData) {
    await db.channelConfig.create({ data: { ...ch, tenantId: tenant.id, workspaceId: workspace.id } });
  }
  console.log(`  ✅ ${channelData.length} channel configs created\n`);

  // ════════════════════════════════════════════════
  // 17. CONVERSATIONS (for Inbox)
  // ════════════════════════════════════════════════
  console.log('💬 Creating conversations...');
  await db.conversation.create({
    data: {
      conversationId: 'wa_conv_001', customerPhone: '+1-555-2001', customerName: 'Susan Miller',
      channel: 'whatsapp', status: 'active', currentStage: 'intent_detected',
      intentDetected: 'plumbing_service', intentConfidence: 0.92,
      lastMessageAt: hoursAgo(1), lastMessageBody: 'I need a plumber urgently for a kitchen faucet leak',
      lastDirection: 'inbound',
      messagesJson: JSON.stringify([
        { sender: 'customer', content: 'Hi, I need help with a plumbing issue', time: hoursAgo(2) },
        { sender: 'agent', content: 'Hello! Welcome to ServiceOS Demo. How can I help you today?', time: hoursAgo(1.9) },
        { sender: 'customer', content: 'I need a plumber urgently for a kitchen faucet leak', time: hoursAgo(1) },
      ]),
      customerId: customers[0].id, tenantId: tenant.id, workspaceId: workspace.id,
    },
  });
  await db.conversation.create({
    data: {
      conversationId: 'wa_conv_002', customerPhone: '+1-555-2004', customerName: 'Carlos Rivera',
      channel: 'whatsapp', status: 'active', currentStage: 'booking',
      intentDetected: 'commercial_plumbing', intentConfidence: 0.88,
      lastMessageAt: hoursAgo(3), lastMessageBody: 'Can you send someone for a site visit this week?',
      lastDirection: 'inbound',
      messagesJson: JSON.stringify([
        { sender: 'customer', content: 'Hello, I am opening a new restaurant and need commercial plumbing', time: hoursAgo(5) },
        { sender: 'agent', content: 'That sounds exciting! We specialize in commercial plumbing. What is the address?', time: hoursAgo(4.5) },
        { sender: 'customer', content: '201 Ash Blvd, Houston. Can you send someone for a site visit this week?', time: hoursAgo(3) },
      ]),
      customerId: null, tenantId: tenant.id, workspaceId: workspace.id,
    },
  });
  await db.conversation.create({
    data: {
      conversationId: 'email_conv_001', customerPhone: '+1-555-1003', customerName: 'Tom Henderson',
      channel: 'email', status: 'completed', currentStage: 'completed',
      lastMessageAt: daysAgo(5), lastMessageBody: 'Thank you for the quick response. I will book again next time.',
      lastDirection: 'inbound',
      messagesJson: JSON.stringify([
        { sender: 'customer', content: 'Do you offer sewer line inspections?', time: daysAgo(7) },
        { sender: 'agent', content: 'Yes! We offer camera inspections for $200. Would you like to schedule one?', time: daysAgo(6) },
        { sender: 'customer', content: 'Thank you for the quick response. I will book again next time.', time: daysAgo(5) },
      ]),
      customerId: customers[2].id, tenantId: tenant.id, workspaceId: workspace.id,
    },
  });
  console.log('  ✅ 3 conversations created\n');

  // ════════════════════════════════════════════════
  // 18. WORKFLOW AUTOMATIONS
  // ════════════════════════════════════════════════
  console.log('⚡ Creating workflow automations...');
  await db.workflowAutomation.create({
    data: {
      name: 'New Lead WhatsApp Notification',
      description: 'Send WhatsApp notification to owner when a new lead is created',
      triggerType: 'lead.created',
      conditionsJson: JSON.stringify([{ field: 'priority', operator: 'equals', value: 'high' }]),
      actionsJson: JSON.stringify([
        { type: 'send_whatsapp', config: { recipient: '+1-555-0101', template: 'new_lead_alert' } },
      ]),
      active: true, executionCount: 23, lastExecutedAt: daysAgo(1), lastExecutionStatus: 'success',
      tagsJson: '["notifications", "whatsapp"]',
      tenantId: tenant.id, workspaceId: workspace.id, createdById: owner.id,
    },
  });
  await db.workflowAutomation.create({
    data: {
      name: 'Job Completion Review Request',
      description: 'Automatically send review request to customer after job completion',
      triggerType: 'job.completed',
      conditionsJson: '[]',
      actionsJson: JSON.stringify([
        { type: 'send_whatsapp', config: { template: 'review_request' } },
      ]),
      active: true, executionCount: 45, lastExecutedAt: daysAgo(2), lastExecutionStatus: 'success',
      tagsJson: '["reviews", "automation"]',
      tenantId: tenant.id, workspaceId: workspace.id, createdById: owner.id,
    },
  });
  await db.workflowAutomation.create({
    data: {
      name: 'Overdue Invoice Reminder',
      description: 'Send payment reminder for invoices overdue by 3+ days',
      triggerType: 'invoice.overdue',
      triggerConfigJson: JSON.stringify({ daysOverdue: 3 }),
      conditionsJson: '[]',
      actionsJson: JSON.stringify([
        { type: 'send_email', config: { template: 'payment_reminder' } },
        { type: 'send_whatsapp', config: { template: 'payment_reminder_wa' } },
      ]),
      active: true, executionCount: 8, lastExecutedAt: daysAgo(3), lastExecutionStatus: 'success',
      tagsJson: '["billing", "reminders"]',
      tenantId: tenant.id, workspaceId: workspace.id, createdById: owner.id,
    },
  });
  console.log('  ✅ 3 workflow automations created\n');

  // ════════════════════════════════════════════════
  // 19. FORMS
  // ════════════════════════════════════════════════
  console.log('📋 Creating forms...');
  await db.form.create({
    data: {
      name: 'Lead Capture Form', description: 'Website lead capture form for all services',
      type: 'lead_capture', status: 'active',
      fieldsJson: JSON.stringify([
        { id: 'f1', name: 'name', label: 'Full Name', type: 'text', required: true },
        { id: 'f2', name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { id: 'f3', name: 'email', label: 'Email Address', type: 'email', required: false },
        { id: 'f4', name: 'service', label: 'Service Needed', type: 'select', options: ['Plumbing', 'Cleaning', 'HVAC', 'Painting', 'Pest Control'], required: true },
        { id: 'f5', name: 'message', label: 'Describe Your Issue', type: 'textarea', required: false },
      ]),
      submissionActions: '["create_lead"]',
      welcomeMessage: 'Welcome! Tell us about your service needs.',
      completionMessage: 'Thank you! We will contact you shortly.',
      submissions: 67, conversionRate: 0.72,
      tenantId: tenant.id, workspaceId: workspace.id, createdById: owner.id,
    },
  });
  await db.form.create({
    data: {
      name: 'Booking Request Form', description: 'Quick booking request form',
      type: 'booking', status: 'active',
      fieldsJson: JSON.stringify([
        { id: 'f1', name: 'name', label: 'Full Name', type: 'text', required: true },
        { id: 'f2', name: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { id: 'f3', name: 'date', label: 'Preferred Date', type: 'date', required: true },
        { id: 'f4', name: 'time', label: 'Preferred Time', type: 'time', required: true },
        { id: 'f5', name: 'service', label: 'Service', type: 'select', options: ['Plumbing', 'Cleaning', 'HVAC'], required: true },
      ]),
      submissionActions: '["create_lead", "create_booking"]',
      welcomeMessage: 'Book a service appointment!',
      completionMessage: 'Your booking request has been received. We will confirm shortly!',
      submissions: 34, conversionRate: 0.85,
      tenantId: tenant.id, workspaceId: workspace.id, createdById: manager.id,
    },
  });
  console.log('  ✅ 2 forms created\n');

  // ════════════════════════════════════════════════
  // 20. RESOURCES
  // ════════════════════════════════════════════════
  console.log('🚗 Creating resources...');
  const resourceData = [
    { name: 'Service Van #1', phone: '', type: 'vehicle', status: 'available', skills: '["plumbing", "tool_storage"]', location: 'Houston, TX' },
    { name: 'Service Van #2', phone: '', type: 'vehicle', status: 'available', skills: '["hvac", "equipment"]', location: 'Katy, TX' },
    { name: 'Service Van #3', phone: '', type: 'vehicle', status: 'busy', skills: '["cleaning", "supplies"]', location: 'Sugar Land, TX' },
    { name: 'Ravi Shetty', phone: '+1-555-0107', type: 'driver', status: 'available', skills: '["driving", "delivery"]', rating: 4.4, completedJobs: 55, location: 'Houston, TX' },
    { name: 'Portable Generator', phone: '', type: 'equipment', status: 'available', skills: '["power", "emergency"]', location: 'Warehouse' },
  ];
  for (const r of resourceData) {
    await db.resource.create({ data: { ...r, workspaceId: workspace.id } });
  }
  console.log(`  ✅ ${resourceData.length} resources created\n`);

  // ════════════════════════════════════════════════
  // 21. AUDIT LOGS
  // ════════════════════════════════════════════════
  console.log('📜 Creating audit logs...');
  const auditData = [
    { userId: owner.id, action: 'user.login', resourceType: 'auth', metadataJson: JSON.stringify({ ip: '192.168.1.1', userAgent: 'Chrome/120' }) },
    { userId: manager.id, action: 'lead.created', resourceType: 'lead', metadataJson: JSON.stringify({ leadName: 'Susan Miller', source: 'website' }) },
    { userId: owner.id, action: 'job.assigned', resourceType: 'job', metadataJson: JSON.stringify({ jobTitle: 'Clogged Bathroom Drain', assignee: 'Amit Singh' }) },
    { userId: technician.id, action: 'job.started', resourceType: 'job', metadataJson: JSON.stringify({ jobTitle: 'Water Heater Installation' }) },
    { userId: owner.id, action: 'invoice.created', resourceType: 'invoice', metadataJson: JSON.stringify({ invoiceNumber: 'INV-SOS-001' }) },
    { userId: superAdmin.id, action: 'tenant.settings_updated', resourceType: 'tenant', metadataJson: JSON.stringify({ tenant: 'ServiceOS Demo Corp' }) },
  ];
  for (const a of auditData) {
    await db.auditLog.create({ data: { ...a, createdAt: daysAgo(Math.floor(Math.random() * 7)) } });
  }
  console.log(`  ✅ ${auditData.length} audit logs created\n`);

  // ════════════════════════════════════════════════
  // 22. CUSTOMER JOURNEYS
  // ════════════════════════════════════════════════
  console.log('🗺️ Creating customer journeys...');
  await db.customerJourney.create({
    data: {
      customerId: customers[1].id, jobId: job_completed.id,
      currentStage: 'completed', previousStage: 'in_progress',
      stageChangedAt: daysAgo(6), automationActive: false,
      completedStagesJson: JSON.stringify([
        { stage: 'lead', at: daysAgo(10) },
        { stage: 'booking', at: daysAgo(8) },
        { stage: 'assigned', at: daysAgo(7) },
        { stage: 'in_progress', at: daysAgo(7) },
        { stage: 'completed', at: daysAgo(6) },
      ]),
      tenantId: tenant.id,
    },
  });
  await db.customerJourney.create({
    data: {
      customerId: customers[3].id,
      currentStage: 'in_progress', previousStage: 'assigned',
      stageChangedAt: hoursAgo(3), automationActive: true,
      completedStagesJson: JSON.stringify([
        { stage: 'lead', at: daysAgo(2) },
        { stage: 'booking', at: daysAgo(1) },
        { stage: 'assigned', at: daysAgo(1) },
        { stage: 'in_progress', at: hoursAgo(3) },
      ]),
      nextActionAt: hoursAgo(0),
      nextActionType: 'whatsapp_message',
      nextActionData: JSON.stringify({ template: 'job_status_update', message: 'Your water heater installation is in progress!' }),
      tenantId: tenant.id,
    },
  });
  console.log('  ✅ 2 customer journeys created\n');

  // ════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════
  console.log('='.repeat(70));
  console.log('🎉 SEED COMPLETE — ServiceOS CRM Database');
  console.log('='.repeat(70));
  console.log('');
  console.log('👤 USERS (5):');
  console.log('  1. SuperAdmin: admin@serviceos.com / SuperAdmin@123 (Platform Admin)');
  console.log('  2. Owner:      rajesh@serviceos-demo.com / Owner@123');
  console.log('  3. Manager:    priya@serviceos-demo.com / Manager@123');
  console.log('  4. Technician: amit@serviceos-demo.com / Technician@123');
  console.log('  5. Dispatcher: suresh@serviceos-demo.com / Dispatch@123');
  console.log('');
  console.log('📊 DATA SUMMARY:');
  console.log(`  Tenants:        1 (ServiceOS Demo Corp)`);
  console.log(`  Workspaces:     1`);
  console.log(`  Subscriptions:  1 (Growth Plan)`);
  console.log(`  Services:       ${services.length}`);
  console.log(`  Employees:      ${employees.length}`);
  console.log(`  Customers:      ${customers.length}`);
  console.log(`  Jobs:           10 (all lifecycle states)`);
  console.log(`  Leads:          ${leadData.length} (all stages)`);
  console.log(`  Invoices:       4 (paid, pending, overdue)`);
  console.log(`  Reviews:        ${reviewData.length}`);
  console.log(`  Quotes:         3`);
  console.log(`  Notifications:  ${notifData.length}`);
  console.log(`  Channels:       ${channelData.length}`);
  console.log(`  Conversations:  3`);
  console.log(`  Automations:    3`);
  console.log(`  Forms:          2`);
  console.log(`  Resources:      ${resourceData.length}`);
  console.log(`  Audit Logs:     ${auditData.length}`);
  console.log(`  Journeys:       2`);
  console.log('='.repeat(70));
}

main()
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await db.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
