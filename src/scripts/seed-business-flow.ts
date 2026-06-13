import { db } from '@/lib/db'

async function seedBusinessFlow() {
  console.log('🌱 Seeding comprehensive business flow data...')

  // ── Clean up existing data (in reverse dependency order) ──────────────
  console.log('Cleaning existing data...')
  await db.notification.deleteMany()
  await db.review.deleteMany()
  await db.quote.deleteMany()
  await db.invoice.deleteMany()
  await db.leadActivity.deleteMany()
  await db.lead.deleteMany()
  await db.job.deleteMany()
  await db.serviceCategory.deleteMany()
  await db.customer.deleteMany()
  await db.employeePresence.deleteMany()
  await db.timeEntry.deleteMany()
  await db.employee.deleteMany()
  await db.deal.deleteMany()
  await db.conversationMessage.deleteMany()
  await db.conversationAssignment.deleteMany()
  await db.conversationNote.deleteMany()
  await db.conversation.deleteMany()
  await db.campaign.deleteMany()
  await db.auditLog.deleteMany()
  await db.apiKey.deleteMany()
  await db.user.deleteMany()
  await db.subscription.deleteMany()
  await db.tenant.deleteMany()
  await db.workspace.deleteMany()

  // ── 1. Create Tenant ──────────────────────────────────────────────────
  console.log('Creating tenant: SparkClean Services...')
  const tenant = await db.tenant.create({
    data: {
      name: 'SparkClean Services',
      slug: 'sparkclean',
      plan: 'pro',
      industry: 'cleaning',
      country: 'India',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      status: 'active',
      primaryColor: '#10b981',
      billingEmail: 'billing@sparkclean.com',
    },
  })

  // ── 2. Create Workspace ──────────────────────────────────────────────
  console.log('Creating workspace...')
  const workspace = await db.workspace.create({
    data: {
      name: 'SparkClean Main',
      plan: 'pro',
      ownerId: 'temp',
      tenantId: tenant.id,
    },
  })

  // ── 3. Create Demo Users ──────────────────────────────────────────────
  console.log('Creating demo users...')
  const users = await Promise.all([
    db.user.create({
      data: {
        email: 'rahul@sparkclean.com',
        name: 'Rahul Admin',
        passwordHash: '$2b$10$dummyHashForDemoPurposesOnly1234567890abcdefghijklm', // demo123
        role: 'owner',
        status: 'active',
        phone: '+91-9800000001',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.user.create({
      data: {
        email: 'priya@sparkclean.com',
        name: 'Priya Manager',
        passwordHash: '$2b$10$dummyHashForDemoPurposesOnly1234567890abcdefghijklm',
        role: 'manager',
        status: 'active',
        phone: '+91-9800000002',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.user.create({
      data: {
        email: 'amit@sparkclean.com',
        name: 'Amit Dispatcher',
        passwordHash: '$2b$10$dummyHashForDemoPurposesOnly1234567890abcdefghijklm',
        role: 'dispatcher',
        status: 'active',
        phone: '+91-9800000003',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.user.create({
      data: {
        email: 'neha@sparkclean.com',
        name: 'Neha Sales',
        passwordHash: '$2b$10$dummyHashForDemoPurposesOnly1234567890abcdefghijklm',
        role: 'sales_agent',
        status: 'active',
        phone: '+91-9800000004',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
  ])

  // Update workspace owner
  await db.workspace.update({
    where: { id: workspace.id },
    data: { ownerId: users[0].id },
  })

  // ── 4. Create Subscription ───────────────────────────────────────────
  await db.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-12-31'),
    },
  })

  // ── 5. Create Employees ──────────────────────────────────────────────
  console.log('Creating employees...')
  const employees = await Promise.all([
    db.employee.create({
      data: {
        name: 'David Kumar',
        phone: '+91-9810000001',
        email: 'david@sparkclean.com',
        role: 'field_employee',
        skills: JSON.stringify(['window-cleaning', 'deep-cleaning']),
        status: 'available',
        rating: 4.7,
        completedJobs: 34,
        activeJobs: 1,
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.employee.create({
      data: {
        name: 'Rajesh Singh',
        phone: '+91-9810000002',
        email: 'rajesh@sparkclean.com',
        role: 'field_employee',
        skills: JSON.stringify(['plumbing', 'repair']),
        status: 'busy',
        rating: 4.5,
        completedJobs: 28,
        activeJobs: 2,
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.employee.create({
      data: {
        name: 'Sunil Patel',
        phone: '+91-9810000003',
        email: 'sunil@sparkclean.com',
        role: 'field_employee',
        skills: JSON.stringify(['hvac', 'installation']),
        status: 'available',
        rating: 4.8,
        completedJobs: 42,
        activeJobs: 0,
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.employee.create({
      data: {
        name: 'Meera Joshi',
        phone: '+91-9810000004',
        email: 'meera@sparkclean.com',
        role: 'field_employee',
        skills: JSON.stringify(['cleaning', 'sanitization']),
        status: 'on_leave',
        rating: 4.3,
        completedJobs: 19,
        activeJobs: 0,
        notes: 'On maternity leave until April 2026',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.employee.create({
      data: {
        name: 'Arun Sharma',
        phone: '+91-9810000005',
        email: 'arun@sparkclean.com',
        role: 'dispatcher',
        skills: JSON.stringify(['scheduling']),
        status: 'available',
        rating: 4.6,
        completedJobs: 0,
        activeJobs: 0,
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.employee.create({
      data: {
        name: 'Vikram Reddy',
        phone: '+91-9810000006',
        email: 'vikram@sparkclean.com',
        role: 'field_employee',
        skills: JSON.stringify(['electrical', 'repair']),
        status: 'available',
        rating: 4.9,
        completedJobs: 55,
        activeJobs: 1,
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
  ])

  // Create employee presence records
  await Promise.all([
    db.employeePresence.create({
      data: {
        employeeId: employees[0].id,
        status: 'available',
        locationLat: 28.6139,
        locationLng: 77.209,
        batteryLevel: 85,
      },
    }),
    db.employeePresence.create({
      data: {
        employeeId: employees[1].id,
        status: 'busy',
        currentJobId: 'on-job',
        locationLat: 28.4595,
        locationLng: 77.0266,
        batteryLevel: 62,
      },
    }),
    db.employeePresence.create({
      data: {
        employeeId: employees[2].id,
        status: 'available',
        locationLat: 28.5355,
        locationLng: 77.391,
        batteryLevel: 93,
      },
    }),
    db.employeePresence.create({
      data: {
        employeeId: employees[3].id,
        status: 'offline',
        batteryLevel: 15,
      },
    }),
    db.employeePresence.create({
      data: {
        employeeId: employees[4].id,
        status: 'available',
        locationLat: 28.6139,
        locationLng: 77.209,
        batteryLevel: 100,
      },
    }),
    db.employeePresence.create({
      data: {
        employeeId: employees[5].id,
        status: 'available',
        locationLat: 28.6127,
        locationLng: 77.2295,
        batteryLevel: 78,
      },
    }),
  ])

  // ── 6. Create Service Categories ─────────────────────────────────────
  console.log('Creating service categories...')
  const categories = await Promise.all([
    db.serviceCategory.create({
      data: {
        name: 'Window Cleaning',
        description: 'Professional interior and exterior window cleaning for homes and offices',
        icon: 'sparkles',
        color: '#3b82f6',
        basePrice: 1500,
        duration: 120,
        active: true,
        tenantId: tenant.id,
      },
    }),
    db.serviceCategory.create({
      data: {
        name: 'Deep Cleaning',
        description: 'Comprehensive deep cleaning service including kitchen, bathrooms, and living areas',
        icon: 'home',
        color: '#10b981',
        basePrice: 3500,
        duration: 240,
        active: true,
        tenantId: tenant.id,
      },
    }),
    db.serviceCategory.create({
      data: {
        name: 'Plumbing',
        description: 'Expert plumbing repairs, installations, and maintenance services',
        icon: 'wrench',
        color: '#f59e0b',
        basePrice: 800,
        duration: 90,
        active: true,
        tenantId: tenant.id,
      },
    }),
    db.serviceCategory.create({
      data: {
        name: 'HVAC',
        description: 'Heating, ventilation, and air conditioning services',
        icon: 'thermometer',
        color: '#ef4444',
        basePrice: 2000,
        duration: 180,
        active: true,
        tenantId: tenant.id,
      },
    }),
  ])

  // ── 7. Create Customers ──────────────────────────────────────────────
  console.log('Creating customers...')
  const customers = await Promise.all([
    db.customer.create({
      data: {
        name: 'John Smith',
        phone: '+91-9910000001',
        email: 'john.smith@email.com',
        address: '42 Golf Links, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        zipCode: '110003',
        country: 'India',
        source: 'website',
        lifecycleStage: 'active',
        totalSpent: 15000,
        totalJobs: 5,
        avgRating: 4.5,
        tags: JSON.stringify(['vip', 'repeat']),
        notes: 'Prefers morning appointments',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.customer.create({
      data: {
        name: 'Anita Desai',
        phone: '+91-9910000002',
        email: 'anita.desai@email.com',
        address: '15 Jubilee Hills, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        zipCode: '500033',
        country: 'India',
        source: 'whatsapp',
        lifecycleStage: 'active',
        totalSpent: 8500,
        totalJobs: 3,
        avgRating: 4.2,
        tags: JSON.stringify(['residential']),
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.customer.create({
      data: {
        name: 'Robert Chen',
        phone: '+91-9910000003',
        email: 'robert.chen@email.com',
        address: '88 Brigade Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
        source: 'google_ads',
        lifecycleStage: 'lead',
        totalSpent: 0,
        totalJobs: 0,
        avgRating: 0,
        tags: JSON.stringify(['new-lead', 'corporate']),
        notes: 'Interested in office cleaning contract',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.customer.create({
      data: {
        name: 'Priya Mehta',
        phone: '+91-9910000004',
        email: 'priya.mehta@email.com',
        address: '23 Pali Hill, Bandra, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400050',
        country: 'India',
        source: 'referral',
        lifecycleStage: 'active',
        totalSpent: 22000,
        totalJobs: 8,
        avgRating: 4.8,
        tags: JSON.stringify(['vip', 'repeat', 'referral-source']),
        notes: 'Referred by John Smith. Always gives good reviews.',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.customer.create({
      data: {
        name: 'Sam Wilson',
        phone: '+91-9910000005',
        email: 'sam.wilson@email.com',
        address: '67 Sector 45, Gurgaon',
        city: 'Gurgaon',
        state: 'Haryana',
        zipCode: '122001',
        country: 'India',
        source: 'facebook',
        lifecycleStage: 'churned',
        totalSpent: 3000,
        totalJobs: 1,
        avgRating: 3.0,
        tags: JSON.stringify(['churned', 'price-sensitive']),
        notes: 'Cancelled after first service - thought it was too expensive',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.customer.create({
      data: {
        name: 'Deepa Nair',
        phone: '+91-9910000006',
        email: 'deepa.nair@email.com',
        address: '12 MG Road, Kochi',
        city: 'Kochi',
        state: 'Kerala',
        zipCode: '682011',
        country: 'India',
        source: 'website',
        lifecycleStage: 'active',
        totalSpent: 12000,
        totalJobs: 4,
        avgRating: 4.6,
        tags: JSON.stringify(['repeat', 'residential']),
        notes: 'Quarterly deep cleaning schedule',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.customer.create({
      data: {
        name: 'Mike Johnson',
        phone: '+91-9910000007',
        email: 'mike.j@email.com',
        address: '5 Residency Road, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zipCode: '600002',
        country: 'India',
        source: 'manual',
        lifecycleStage: 'lead',
        totalSpent: 0,
        totalJobs: 0,
        avgRating: 0,
        tags: JSON.stringify(['new-lead']),
        notes: 'Walk-in inquiry for commercial cleaning',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.customer.create({
      data: {
        name: 'Fatima Khan',
        phone: '+91-9910000008',
        email: 'fatima.khan@email.com',
        address: '34 Park Street, Kolkata',
        city: 'Kolkata',
        state: 'West Bengal',
        zipCode: '700016',
        country: 'India',
        source: 'whatsapp',
        lifecycleStage: 'reactivated',
        totalSpent: 9500,
        totalJobs: 3,
        avgRating: 4.1,
        tags: JSON.stringify(['reactivated', 'residential']),
        notes: 'Reactivated after discount offer via WhatsApp campaign',
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
  ])

  // ── 8. Create Leads ──────────────────────────────────────────────────
  console.log('Creating leads...')
  const now = new Date()
  const day = 86400000

  const leads = await Promise.all([
    // 3 new leads
    db.lead.create({
      data: {
        name: 'Ravi Teja',
        phone: '+91-9900000001',
        email: 'ravi.teja@email.com',
        company: 'TechCorp Solutions',
        source: 'website',
        status: 'new',
        score: 72,
        value: 5000,
        service: 'Deep Cleaning',
        address: '101 Cyber Towers, Hyderabad',
        tags: JSON.stringify(['corporate', 'high-value']),
        notes: 'Submitted inquiry form for office cleaning',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 1 * day),
      },
    }),
    db.lead.create({
      data: {
        name: 'Sneha Gupta',
        phone: '+91-9900000002',
        email: 'sneha.g@email.com',
        source: 'google_ads',
        status: 'new',
        score: 55,
        value: 2500,
        service: 'Window Cleaning',
        address: '45 Sector 62, Noida',
        tags: JSON.stringify(['residential']),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 0.5 * day),
      },
    }),
    db.lead.create({
      data: {
        name: 'Arun Mehta',
        phone: '+91-9900000003',
        email: 'arun.m@email.com',
        company: 'StartupHub',
        source: 'facebook',
        status: 'new',
        score: 40,
        value: 3500,
        service: 'Deep Cleaning',
        address: '12 HSR Layout, Bangalore',
        tags: JSON.stringify(['startup', 'one-time']),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 0.2 * day),
      },
    }),
    // 2 contacted leads
    db.lead.create({
      data: {
        name: 'Pooja Sharma',
        phone: '+91-9900000004',
        email: 'pooja.s@email.com',
        source: 'whatsapp',
        status: 'contacted',
        score: 68,
        value: 8000,
        service: 'HVAC',
        address: '78 Whitefield, Bangalore',
        tags: JSON.stringify(['residential', 'hvac-service']),
        notes: 'Called and discussed requirements - needs AC servicing for 3 units',
        assignedToId: users[3].id,
        assignedToName: users[3].name,
        lastContactedAt: new Date(now.getTime() - 1 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 3 * day),
      },
    }),
    db.lead.create({
      data: {
        name: 'Kiran Rao',
        phone: '+91-9900000005',
        email: 'kiran.rao@email.com',
        company: 'Zenith Industries',
        source: 'referral',
        status: 'contacted',
        score: 75,
        value: 15000,
        service: 'Deep Cleaning',
        address: '200 Industrial Area, Pune',
        tags: JSON.stringify(['corporate', 'referral', 'contract']),
        notes: 'Referred by Priya Mehta. Needs monthly office cleaning.',
        assignedToId: users[3].id,
        assignedToName: users[3].name,
        lastContactedAt: new Date(now.getTime() - 2 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 4 * day),
      },
    }),
    // 1 qualified lead
    db.lead.create({
      data: {
        name: 'Divya Iyer',
        phone: '+91-9900000006',
        email: 'divya.i@email.com',
        source: 'website',
        status: 'qualified',
        score: 85,
        value: 6000,
        service: 'Plumbing',
        address: '56 Koramangala, Bangalore',
        tags: JSON.stringify(['residential', 'urgent']),
        notes: 'Has an urgent plumbing issue - bathroom leak. Ready to proceed.',
        assignedToId: users[3].id,
        assignedToName: users[3].name,
        lastContactedAt: new Date(now.getTime() - 0.5 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 5 * day),
      },
    }),
    // 2 quoted leads
    db.lead.create({
      data: {
        name: 'Suresh Babu',
        phone: '+91-9900000007',
        email: 'suresh.b@email.com',
        company: 'GreenTech Pvt Ltd',
        source: 'whatsapp',
        status: 'quoted',
        score: 78,
        value: 12000,
        service: 'Window Cleaning',
        address: '90 EGL Business Park, Bangalore',
        tags: JSON.stringify(['corporate', 'contract']),
        notes: 'Quoted for monthly window cleaning - 20+ windows',
        assignedToId: users[3].id,
        assignedToName: users[3].name,
        lastContactedAt: new Date(now.getTime() - 1 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 7 * day),
      },
    }),
    db.lead.create({
      data: {
        name: 'Lakshmi Narayan',
        phone: '+91-9900000008',
        email: 'lakshmi.n@email.com',
        source: 'website',
        status: 'quoted',
        score: 70,
        value: 4500,
        service: 'Deep Cleaning',
        address: '33 Indiranagar, Bangalore',
        tags: JSON.stringify(['residential']),
        notes: 'Quoted for 3BHK deep cleaning. Follow up next week.',
        assignedToId: users[3].id,
        assignedToName: users[3].name,
        lastContactedAt: new Date(now.getTime() - 2 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 6 * day),
      },
    }),
    // 1 won lead (with customer link)
    db.lead.create({
      data: {
        name: 'John Smith',
        phone: '+91-9910000001',
        email: 'john.smith@email.com',
        source: 'website',
        status: 'won',
        score: 95,
        value: 15000,
        service: 'Deep Cleaning',
        address: '42 Golf Links, New Delhi',
        tags: JSON.stringify(['vip', 'repeat']),
        notes: 'Long-term customer. Converted to job.',
        assignedToId: users[3].id,
        assignedToName: users[3].name,
        customerId: customers[0].id,
        lastContactedAt: new Date(now.getTime() - 0.5 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 10 * day),
      },
    }),
    // 1 lost lead
    db.lead.create({
      data: {
        name: 'Manoj Kumar',
        phone: '+91-9900000009',
        email: 'manoj.k@email.com',
        source: 'facebook',
        status: 'lost',
        score: 25,
        value: 2000,
        service: 'Window Cleaning',
        address: '22 Dwarka, New Delhi',
        tags: JSON.stringify(['lost', 'price-sensitive']),
        notes: 'Went with a cheaper competitor. May follow up in 3 months.',
        assignedToId: users[3].id,
        assignedToName: users[3].name,
        lastContactedAt: new Date(now.getTime() - 5 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 14 * day),
      },
    }),
  ])

  // Create lead activities
  console.log('Creating lead activities...')
  await Promise.all([
    // Activity for won lead
    db.leadActivity.create({
      data: {
        leadId: leads[8].id,
        type: 'status_change',
        description: 'Lead marked as Won - converted to customer',
        createdById: users[3].id,
        createdByName: users[3].name,
      },
    }),
    db.leadActivity.create({
      data: {
        leadId: leads[8].id,
        type: 'whatsapp',
        description: 'Sent quote details via WhatsApp',
        createdById: users[3].id,
        createdByName: users[3].name,
      },
    }),
    db.leadActivity.create({
      data: {
        leadId: leads[8].id,
        type: 'job_created',
        description: 'Job JOB-0001 created from this lead',
        metadataJson: JSON.stringify({ jobId: 'pending' }),
        createdById: users[3].id,
        createdByName: users[3].name,
      },
    }),
    // Activity for quoted lead
    db.leadActivity.create({
      data: {
        leadId: leads[6].id,
        type: 'email',
        description: 'Sent quotation for window cleaning service',
        createdById: users[3].id,
        createdByName: users[3].name,
      },
    }),
    // Activity for lost lead
    db.leadActivity.create({
      data: {
        leadId: leads[9].id,
        type: 'status_change',
        description: 'Lead marked as Lost - went with competitor',
        createdById: users[3].id,
        createdByName: users[3].name,
      },
    }),
    // Activity for contacted lead
    db.leadActivity.create({
      data: {
        leadId: leads[3].id,
        type: 'call',
        description: 'Initial call - discussed HVAC service requirements',
        createdById: users[3].id,
        createdByName: users[3].name,
      },
    }),
    db.leadActivity.create({
      data: {
        leadId: leads[4].id,
        type: 'whatsapp',
        description: 'Sent service brochure via WhatsApp',
        createdById: users[3].id,
        createdByName: users[3].name,
      },
    }),
  ])

  // ── 9. Create Jobs ───────────────────────────────────────────────────
  console.log('Creating jobs...')
  const jobs = await Promise.all([
    // 2 pending (unassigned)
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0001',
        title: 'Deep Cleaning - 3BHK Apartment',
        description: 'Full deep cleaning for 3BHK including kitchen, bathrooms, and balcony',
        service: 'Deep Cleaning',
        status: 'pending',
        priority: 'medium',
        type: 'service',
        address: '42 Golf Links, New Delhi',
        city: 'New Delhi',
        scheduledAt: new Date(now.getTime() + 2 * day),
        estimatedDuration: 240,
        customerId: customers[0].id,
        customerName: customers[0].name,
        customerPhone: customers[0].phone,
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 0.5 * day),
      },
    }),
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0002',
        title: 'Bathroom Plumbing Repair',
        description: 'Fix leaking bathroom faucet and replace shower head',
        service: 'Plumbing',
        status: 'pending',
        priority: 'high',
        type: 'repair',
        address: '56 Koramangala, Bangalore',
        city: 'Bangalore',
        scheduledAt: new Date(now.getTime() + 1 * day),
        estimatedDuration: 90,
        customerId: customers[3].id,
        customerName: customers[3].name,
        customerPhone: customers[3].phone,
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 0.3 * day),
      },
    }),
    // 1 assigned
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0003',
        title: 'Office Window Cleaning',
        description: 'Clean all exterior windows for 3-story office building',
        service: 'Window Cleaning',
        status: 'assigned',
        priority: 'medium',
        type: 'service',
        address: '90 EGL Business Park, Bangalore',
        city: 'Bangalore',
        scheduledAt: new Date(now.getTime() + 1 * day),
        estimatedDuration: 180,
        customerId: customers[2].id,
        customerName: customers[2].name,
        customerPhone: customers[2].phone,
        assigneeId: employees[0].id,
        assigneeName: employees[0].name,
        assigneePhone: employees[0].phone,
        assignmentStatus: 'pending',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 1 * day),
      },
    }),
    // 1 accepted
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0004',
        title: 'AC Installation - 2 Units',
        description: 'Install 2 split AC units in bedrooms with copper piping',
        service: 'HVAC',
        status: 'accepted',
        priority: 'high',
        type: 'installation',
        address: '23 Pali Hill, Bandra, Mumbai',
        city: 'Mumbai',
        scheduledAt: new Date(now.getTime() + 0.5 * day),
        estimatedDuration: 360,
        customerId: customers[3].id,
        customerName: customers[3].name,
        customerPhone: customers[3].phone,
        assigneeId: employees[2].id,
        assigneeName: employees[2].name,
        assigneePhone: employees[2].phone,
        assignmentStatus: 'accepted',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 2 * day),
      },
    }),
    // 2 in_progress
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0005',
        title: 'Full House Deep Cleaning',
        description: 'Complete deep cleaning for 4BHK villa - all rooms',
        service: 'Deep Cleaning',
        status: 'in_progress',
        priority: 'medium',
        type: 'service',
        address: '15 Jubilee Hills, Hyderabad',
        city: 'Hyderabad',
        scheduledAt: new Date(now.getTime() - 0.5 * day),
        startedAt: new Date(now.getTime() - 2 * 3600000),
        estimatedDuration: 300,
        customerId: customers[1].id,
        customerName: customers[1].name,
        customerPhone: customers[1].phone,
        assigneeId: employees[1].id,
        assigneeName: employees[1].name,
        assigneePhone: employees[1].phone,
        assignmentStatus: 'accepted',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 3 * day),
      },
    }),
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0006',
        title: 'Electrical Repair - Short Circuit',
        description: 'Fix short circuit in kitchen wiring and replace damaged switches',
        service: 'Electrical Repair',
        status: 'in_progress',
        priority: 'urgent',
        type: 'repair',
        address: '34 Park Street, Kolkata',
        city: 'Kolkata',
        scheduledAt: new Date(now.getTime() - 1 * day),
        startedAt: new Date(now.getTime() - 3 * 3600000),
        estimatedDuration: 120,
        customerId: customers[7].id,
        customerName: customers[7].name,
        customerPhone: customers[7].phone,
        assigneeId: employees[5].id,
        assigneeName: employees[5].name,
        assigneePhone: employees[5].phone,
        assignmentStatus: 'accepted',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 2 * day),
      },
    }),
    // 1 completed
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0007',
        title: 'Window Cleaning - Villa',
        description: 'All interior and exterior window cleaning for villa',
        service: 'Window Cleaning',
        status: 'completed',
        priority: 'low',
        type: 'service',
        address: '12 MG Road, Kochi',
        city: 'Kochi',
        scheduledAt: new Date(now.getTime() - 5 * day),
        startedAt: new Date(now.getTime() - 5 * day),
        completedAt: new Date(now.getTime() - 5 * day + 4 * 3600000),
        estimatedDuration: 180,
        actualDuration: 200,
        customerId: customers[5].id,
        customerName: customers[5].name,
        customerPhone: customers[5].phone,
        assigneeId: employees[0].id,
        assigneeName: employees[0].name,
        assigneePhone: employees[0].phone,
        assignmentStatus: 'accepted',
        rating: 5,
        reviewNotes: 'Excellent work! Windows are spotless.',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 7 * day),
      },
    }),
    // 1 cancelled
    db.job.create({
      data: {
        jobNumber: 'QT-JOB-0008',
        title: 'Office Cleaning - One Time',
        description: 'One-time deep cleaning for small office',
        service: 'Deep Cleaning',
        status: 'cancelled',
        priority: 'low',
        type: 'service',
        address: '67 Sector 45, Gurgaon',
        city: 'Gurgaon',
        scheduledAt: new Date(now.getTime() - 3 * day),
        estimatedDuration: 180,
        notes: 'Customer cancelled - said service was too expensive',
        customerId: customers[4].id,
        customerName: customers[4].name,
        customerPhone: customers[4].phone,
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 10 * day),
      },
    }),
  ])

  // ── 10. Create Quotes ────────────────────────────────────────────────
  console.log('Creating quotes...')
  const quotes = await Promise.all([
    // Draft quote
    db.quote.create({
      data: {
        quoteNumber: 'QT-0001',
        status: 'draft',
        leadId: leads[6].id,
        customerId: customers[2].id,
        customerName: 'Suresh Babu',
        customerPhone: '+91-9900000007',
        customerEmail: 'suresh.b@email.com',
        service: 'Window Cleaning',
        itemsJson: JSON.stringify([
          { description: 'Exterior Window Cleaning (20 windows)', quantity: 1, unitPrice: 5000, amount: 5000 },
          { description: 'Interior Window Cleaning (20 windows)', quantity: 1, unitPrice: 4000, amount: 4000 },
          { description: 'Window Sill Cleaning', quantity: 1, unitPrice: 1500, amount: 1500 },
        ]),
        subtotal: 10500,
        taxRate: 18,
        taxAmount: 1890,
        discountType: 'percentage',
        discountValue: 5,
        discountAmount: 525,
        total: 11865,
        validUntil: new Date(now.getTime() + 30 * day),
        notes: 'Monthly contract pricing - discount applied for commitment',
        sendVia: 'whatsapp',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdById: users[3].id,
        createdByName: users[3].name,
        createdAt: new Date(now.getTime() - 0.5 * day),
      },
    }),
    // Sent quote
    db.quote.create({
      data: {
        quoteNumber: 'QT-0002',
        status: 'sent',
        leadId: leads[7].id,
        customerId: null,
        customerName: 'Lakshmi Narayan',
        customerPhone: '+91-9900000008',
        customerEmail: 'lakshmi.n@email.com',
        service: 'Deep Cleaning',
        itemsJson: JSON.stringify([
          { description: '3BHK Deep Cleaning', quantity: 1, unitPrice: 3500, amount: 3500 },
          { description: 'Kitchen Deep Clean (Grease Removal)', quantity: 1, unitPrice: 1200, amount: 1200 },
          { description: 'Bathroom Sanitization (2 units)', quantity: 2, unitPrice: 500, amount: 1000 },
        ]),
        subtotal: 5700,
        taxRate: 18,
        taxAmount: 1026,
        total: 6726,
        validUntil: new Date(now.getTime() + 15 * day),
        sentAt: new Date(now.getTime() - 1 * day),
        notes: 'Includes all cleaning materials and equipment',
        sendVia: 'email',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdById: users[3].id,
        createdByName: users[3].name,
        createdAt: new Date(now.getTime() - 2 * day),
      },
    }),
    // Approved quote
    db.quote.create({
      data: {
        quoteNumber: 'QT-0003',
        status: 'approved',
        leadId: leads[8].id,
        customerId: customers[0].id,
        customerName: 'John Smith',
        customerPhone: '+91-9910000001',
        customerEmail: 'john.smith@email.com',
        service: 'Deep Cleaning',
        itemsJson: JSON.stringify([
          { description: 'Full Villa Deep Cleaning', quantity: 1, unitPrice: 8000, amount: 8000 },
          { description: 'Carpet Steam Cleaning (3 rooms)', quantity: 3, unitPrice: 1500, amount: 4500 },
          { description: 'Window Cleaning (12 windows)', quantity: 1, unitPrice: 3000, amount: 3000 },
        ]),
        subtotal: 15500,
        taxRate: 18,
        taxAmount: 2790,
        discountType: 'fixed',
        discountValue: 1000,
        discountAmount: 1000,
        total: 17290,
        validUntil: new Date(now.getTime() + 30 * day),
        sentAt: new Date(now.getTime() - 5 * day),
        approvedAt: new Date(now.getTime() - 2 * day),
        notes: 'VIP customer - special pricing applied',
        sendVia: 'whatsapp',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdById: users[3].id,
        createdByName: users[3].name,
        createdAt: new Date(now.getTime() - 7 * day),
      },
    }),
  ])

  // ── 11. Create Invoices ──────────────────────────────────────────────
  console.log('Creating invoices...')
  const invoices = await Promise.all([
    // Draft invoice
    db.invoice.create({
      data: {
        invoiceNumber: 'INV-0001',
        status: 'draft',
        customerId: customers[1].id,
        customerName: customers[1].name,
        customerEmail: customers[1].email,
        customerPhone: customers[1].phone,
        jobId: jobs[4].id,
        itemsJson: JSON.stringify([
          { description: 'Full House Deep Cleaning - 4BHK Villa', quantity: 1, unitPrice: 4500, amount: 4500 },
          { description: 'Kitchen Deep Clean (Grease Removal)', quantity: 1, unitPrice: 1200, amount: 1200 },
          { description: 'Bathroom Sanitization (3 units)', quantity: 3, unitPrice: 500, amount: 1500 },
        ]),
        subtotal: 7200,
        taxRate: 18,
        taxAmount: 1296,
        total: 8496,
        dueDate: new Date(now.getTime() + 15 * day),
        notes: 'Payment due within 15 days',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdById: users[1].id,
        createdAt: new Date(now.getTime() - 0.5 * day),
      },
    }),
    // Sent invoice
    db.invoice.create({
      data: {
        invoiceNumber: 'INV-0002',
        status: 'sent',
        customerId: customers[5].id,
        customerName: customers[5].name,
        customerEmail: customers[5].email,
        customerPhone: customers[5].phone,
        jobId: jobs[6].id,
        itemsJson: JSON.stringify([
          { description: 'Window Cleaning - Villa (12 windows)', quantity: 1, unitPrice: 3000, amount: 3000 },
        ]),
        subtotal: 3000,
        taxRate: 18,
        taxAmount: 540,
        total: 3540,
        sentAt: new Date(now.getTime() - 3 * day),
        dueDate: new Date(now.getTime() + 12 * day),
        notes: 'Thank you for your business!',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdById: users[1].id,
        createdAt: new Date(now.getTime() - 4 * day),
      },
    }),
    // Paid invoice
    db.invoice.create({
      data: {
        invoiceNumber: 'INV-0003',
        status: 'paid',
        customerId: customers[0].id,
        customerName: customers[0].name,
        customerEmail: customers[0].email,
        customerPhone: customers[0].phone,
        jobId: jobs[0].id,
        itemsJson: JSON.stringify([
          { description: 'Deep Cleaning - 3BHK Apartment', quantity: 1, unitPrice: 3500, amount: 3500 },
          { description: 'Carpet Steam Cleaning (2 rooms)', quantity: 2, unitPrice: 1500, amount: 3000 },
        ]),
        subtotal: 6500,
        taxRate: 18,
        taxAmount: 1170,
        total: 7670,
        amountPaid: 7670,
        paymentMethod: 'bank_transfer',
        paidAt: new Date(now.getTime() - 1 * day),
        sentAt: new Date(now.getTime() - 5 * day),
        dueDate: new Date(now.getTime() - 2 * day),
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdById: users[1].id,
        createdAt: new Date(now.getTime() - 7 * day),
      },
    }),
    // Overdue invoice
    db.invoice.create({
      data: {
        invoiceNumber: 'INV-0004',
        status: 'overdue',
        customerId: customers[4].id,
        customerName: customers[4].name,
        customerEmail: customers[4].email,
        customerPhone: customers[4].phone,
        jobId: jobs[7].id,
        itemsJson: JSON.stringify([
          { description: 'Office Deep Cleaning - One Time', quantity: 1, unitPrice: 3000, amount: 3000 },
        ]),
        subtotal: 3000,
        taxRate: 18,
        taxAmount: 540,
        total: 3540,
        sentAt: new Date(now.getTime() - 20 * day),
        dueDate: new Date(now.getTime() - 10 * day),
        notes: 'Customer was contacted about overdue payment',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdById: users[1].id,
        createdAt: new Date(now.getTime() - 22 * day),
      },
    }),
  ])

  // ── 12. Create Reviews ───────────────────────────────────────────────
  console.log('Creating reviews...')
  const reviews = await Promise.all([
    db.review.create({
      data: {
        rating: 5,
        review: 'Excellent window cleaning service! The team was punctual, professional, and thorough. All windows are sparkling clean.',
        feedback: 'Would definitely book again. Great value for money.',
        jobId: jobs[6].id,
        customerId: customers[5].id,
        customerName: customers[5].name,
        employeeId: employees[0].id,
        employeeName: employees[0].name,
        source: 'whatsapp',
        status: 'published',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 4 * day),
      },
    }),
    db.review.create({
      data: {
        rating: 4,
        review: 'Good deep cleaning service. Bathrooms and kitchen were spotless. Minor issue with balcony cleaning but overall satisfied.',
        feedback: 'Could improve attention to outdoor areas.',
        jobId: jobs[4].id,
        customerId: customers[1].id,
        customerName: customers[1].name,
        employeeId: employees[1].id,
        employeeName: employees[1].name,
        source: 'email',
        status: 'published',
        tenantId: tenant.id,
        workspaceId: workspace.id,
        createdAt: new Date(now.getTime() - 1 * day),
      },
    }),
  ])

  // ── 13. Create Notifications ─────────────────────────────────────────
  console.log('Creating notifications...')
  await Promise.all([
    db.notification.create({
      data: {
        type: 'job_assigned',
        channel: 'whatsapp',
        recipient: employees[0].phone,
        recipientName: employees[0].name,
        subject: 'New Job Assignment',
        body: 'You have been assigned a new job: Office Window Cleaning at EGL Business Park. Scheduled for tomorrow.',
        status: 'delivered',
        sentAt: new Date(now.getTime() - 1 * day),
        deliveredAt: new Date(now.getTime() - 1 * day),
        metadataJson: JSON.stringify({ jobId: jobs[2].id, jobNumber: jobs[2].jobNumber }),
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.notification.create({
      data: {
        type: 'invoice_overdue',
        channel: 'email',
        recipient: customers[4].email || '',
        recipientName: customers[4].name,
        subject: 'Invoice Overdue - SparkClean Services',
        body: 'Your invoice INV-0004 for ₹3,540 is overdue by 10 days. Please make the payment at your earliest convenience.',
        status: 'sent',
        sentAt: new Date(now.getTime() - 1 * day),
        metadataJson: JSON.stringify({ invoiceId: invoices[3].id, invoiceNumber: 'INV-0004' }),
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
    db.notification.create({
      data: {
        type: 'lead_follow_up',
        channel: 'in_app',
        recipient: users[3].email,
        recipientName: users[3].name,
        subject: 'Follow Up Required',
        body: 'Lead "Suresh Babu" has not responded to the quote sent 1 day ago. Consider a follow-up call.',
        status: 'read',
        sentAt: new Date(now.getTime() - 2 * day),
        deliveredAt: new Date(now.getTime() - 2 * day),
        readAt: new Date(now.getTime() - 1 * day),
        metadataJson: JSON.stringify({ leadId: leads[6].id, quoteId: quotes[0].id }),
        tenantId: tenant.id,
        workspaceId: workspace.id,
      },
    }),
  ])

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('')
  console.log('✅ Business flow seeding complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log(`  Tenant:      ${tenant.name} (${tenant.slug})`)
  console.log(`  Users:       ${users.length} (rahul, priya, amit, neha)`)
  console.log(`  Employees:   ${employees.length}`)
  console.log(`  Customers:   ${customers.length}`)
  console.log(`  Leads:       ${leads.length}`)
  console.log(`  Quotes:      ${quotes.length}`)
  console.log(`  Jobs:        ${jobs.length}`)
  console.log(`  Invoices:    ${invoices.length}`)
  console.log(`  Reviews:     ${reviews.length}`)
  console.log(`  Categories:  ${categories.length}`)
  console.log('')
  console.log('🔑 Login Credentials:')
  console.log('  rahul@sparkclean.com / demo123  (Owner)')
  console.log('  priya@sparkclean.com / demo123  (Manager)')
  console.log('  amit@sparkclean.com  / demo123  (Dispatcher)')
  console.log('  neha@sparkclean.com  / demo123  (Sales Agent)')
}

seedBusinessFlow()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
