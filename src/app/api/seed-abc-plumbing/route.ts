import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * POST /api/seed-abc-plumbing
 * Seeds a massive, realistic ABC Plumbing demo company.
 *
 * Data: 2,000 customers · 300 bookings · 500 invoices · 350+ jobs
 *       150+ leads · 8 employees · 6 WhatsApp campaigns · 55 reviews
 *       42 quotes · 25 conversations · 12 services
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force || false;

    const existing = await db.tenant.findFirst({ where: { slug: 'abc-plumbing-demo' } });

    if (existing && !force) {
      return NextResponse.json({
        message: 'ABC Plumbing demo already exists. Use { "force": true } to re-seed.',
        tenantId: existing.id,
      });
    }

    if (existing && force) {
      console.log('[ABC-Seed] Cleaning old demo data...');
      await cleanupDemoData(existing.id);
    }

    console.log('[ABC-Seed] 🏗️ Seeding ABC Plumbing demo...');

    // ─── Date helpers ─────────────────────────────────────
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);
    const randomPast = (oldest: number, newest: number) =>
      new Date(now.getTime() - (oldest + Math.random() * (newest - oldest)) * 86400000);

    // ─── 1. TENANT ────────────────────────────────────────
    const tenant = await db.tenant.create({
      data: {
        name: 'ABC Plumbing',
        slug: 'abc-plumbing-demo',
        industry: 'plumbing',
        email: 'owner@abcplumbing.com',
        phone: '+1-713-555-0100',
        address: '4500 Main Street, Suite 200, Houston, TX 77002',
        country: 'US',
        currency: 'USD',
        plan: 'pro',
        planStatus: 'active',
        planStartedAt: daysAgo(120),
        onboardingCompleted: true,
        whatsappPhone: '+1-713-555-0100',
      },
    });
    console.log('[ABC-Seed] ✅ Tenant');

    // ─── 2. WORKSPACE ─────────────────────────────────────
    const ws = await db.workspace.create({
      data: {
        name: 'ABC Plumbing',
        slug: 'abc-plumbing-demo',
        industry: 'plumbing',
        plan: 'pro',
        ownerId: '', // update later
        tenantId: tenant.id,
      },
    });

    // ─── 3. USERS ─────────────────────────────────────────
    const pwHash = await hashPassword('demo123');

    const ownerUser = await db.user.create({
      data: {
        name: 'Mike Thompson', email: 'owner@abcplumbing.com', passwordHash: pwHash,
        phone: '+1-713-555-0101', role: 'owner', authProvider: 'email',
        tenantId: tenant.id, workspaceId: ws.id,
      },
    });
    await db.workspace.update({ where: { id: ws.id }, data: { ownerId: ownerUser.id } });

    const managerUser = await db.user.create({
      data: {
        name: 'Sarah Mitchell', email: 'sarah@abcplumbing.com', passwordHash: pwHash,
        phone: '+1-713-555-0102', role: 'manager', authProvider: 'email',
        tenantId: tenant.id, workspaceId: ws.id,
      },
    });

    const adminUser = await db.user.create({
      data: {
        name: 'David Chen', email: 'david@abcplumbing.com', passwordHash: pwHash,
        phone: '+1-713-555-0103', role: 'admin', authProvider: 'email',
        tenantId: tenant.id, workspaceId: ws.id,
      },
    });
    console.log('[ABC-Seed] ✅ 3 users');

    // ─── 4. EMPLOYEES (8) ────────────────────────────────
    const employees = await Promise.all([
      db.employee.create({ data: { name: 'Mike Thompson', phone: '+1-713-555-0101', email: 'owner@abcplumbing.com', role: 'owner', status: 'available', skills: '["plumbing","estimation","project_management","commercial"]', rating: 4.9, completedJobs: 187, location: 'Houston, TX', workspaceId: ws.id, userId: ownerUser.id } }),
      db.employee.create({ data: { name: 'Carlos Rivera', phone: '+1-713-555-0201', role: 'technician', status: 'busy', skills: '["plumbing","drain_cleaning","hydro_jet","sewer"]', rating: 4.7, completedJobs: 234, location: 'Sugar Land, TX', workspaceId: ws.id } }),
      db.employee.create({ data: { name: 'James Wright', phone: '+1-713-555-0202', role: 'technician', status: 'available', skills: '["plumbing","water_heater","gas_line","installation"]', rating: 4.8, completedJobs: 198, location: 'Katy, TX', workspaceId: ws.id } }),
      db.employee.create({ data: { name: 'Raj Patel', phone: '+1-713-555-0203', role: 'technician', status: 'available', skills: '["plumbing","pipe_fitting","copper","pex","repiping"]', rating: 4.6, completedJobs: 156, location: 'The Woodlands, TX', workspaceId: ws.id } }),
      db.employee.create({ data: { name: 'Maria Santos', phone: '+1-713-555-0204', role: 'technician', status: 'on_leave', skills: '["plumbing","bathroom","kitchen","fixture_install"]', rating: 4.5, completedJobs: 143, location: 'Pearland, TX', workspaceId: ws.id } }),
      db.employee.create({ data: { name: 'Tom Baker', phone: '+1-713-555-0205', role: 'driver', status: 'available', skills: '["driving","delivery","equipment","warehouse"]', rating: 4.4, completedJobs: 312, location: 'Houston, TX', workspaceId: ws.id } }),
      db.employee.create({ data: { name: 'Sarah Mitchell', phone: '+1-713-555-0102', email: 'sarah@abcplumbing.com', role: 'manager', status: 'available', skills: '["scheduling","customer_service","dispatch","billing"]', rating: 4.9, completedJobs: 45, location: 'Houston, TX', workspaceId: ws.id, userId: managerUser.id } }),
      db.employee.create({ data: { name: 'Kevin Lee', phone: '+1-713-555-0206', role: 'technician', status: 'busy', skills: '["plumbing","emergency","leak_detection","slab_leak"]', rating: 4.7, completedJobs: 167, location: 'Cypress, TX', workspaceId: ws.id } }),
    ]);
    console.log('[ABC-Seed] ✅ 8 employees');

    // ─── 5. SERVICES (12) ─────────────────────────────────
    const services = await Promise.all([
      db.service.create({ data: { name: 'Drain Cleaning', description: 'Professional drain cleaning using hydro-jetting and snaking', category: 'drainage', basePrice: 149, duration: 90, icon: 'Droplets', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Water Heater Installation', description: 'Tank and tankless water heater installation', category: 'installation', basePrice: 899, duration: 240, icon: 'Flame', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Leak Detection & Repair', description: 'Advanced leak detection using thermal imaging', category: 'repair', basePrice: 199, duration: 120, icon: 'Search', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Sewer Line Repair', description: 'Trenchless and traditional sewer line repair', category: 'sewer', basePrice: 1200, duration: 480, icon: 'Wrench', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Toilet Repair', description: 'Toilet repair, replacement, and installation', category: 'repair', basePrice: 129, duration: 60, icon: 'Wrench', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Faucet Installation', description: 'Kitchen and bathroom faucet installation and repair', category: 'installation', basePrice: 175, duration: 90, icon: 'Droplets', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Pipe Repiping', description: 'Whole-house and partial repiping with copper or PEX', category: 'repiping', basePrice: 3500, duration: 960, icon: 'GitBranch', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Garbage Disposal', description: 'Garbage disposal installation and repair', category: 'installation', basePrice: 225, duration: 90, icon: 'Recycle', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Gas Line Service', description: 'Gas line installation, repair, and leak detection', category: 'gas', basePrice: 299, duration: 120, icon: 'Flame', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Bathroom Remodel Plumbing', description: 'Complete bathroom remodel plumbing rough-in', category: 'remodel', basePrice: 2500, duration: 960, icon: 'Bath', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Emergency Plumbing', description: '24/7 emergency plumbing for burst pipes, flooding, gas leaks', category: 'emergency', basePrice: 249, duration: 60, icon: 'AlertTriangle', isActive: true, tenantId: tenant.id } }),
      db.service.create({ data: { name: 'Water Filtration System', description: 'Whole-house and under-sink water filtration', category: 'installation', basePrice: 599, duration: 180, icon: 'Filter', isActive: true, tenantId: tenant.id } }),
    ]);
    console.log('[ABC-Seed] ✅ 12 services');

    // ─── 6. SUBSCRIPTION ─────────────────────────────────
    await db.subscription.create({
      data: {
        tenantId: tenant.id, plan: 'pro', status: 'active', amount: 149,
        currency: 'USD', billingCycle: 'monthly', startDate: daysAgo(120),
        maxUsers: 20, maxJobs: 9999, maxWorkflows: 999,
        featuresJson: JSON.stringify({ whatsappIntegration: true, customWorkflows: true, apiAccess: true, prioritySupport: true, smartDispatch: true, aiReceptionist: true }),
      },
    });

    // ─── 7. CUSTOMERS (2,000) ─────────────────────────────
    console.log('[ABC-Seed] 📋 Creating 2,000 customers...');
    const FIRST_NAMES = ['James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Kimberly','Paul','Emily','Andrew','Donna','Joshua','Michelle','Kenneth','Carol','Kevin','Amanda','Brian','Dorothy','George','Melissa','Timothy','Deborah','Ronald','Stephanie','Edward','Rebecca','Jason','Sharon','Jeffrey','Laura','Ryan','Cynthia','Jacob','Kathleen','Gary','Amy','Nicholas','Angela','Eric','Shirley','Jonathan','Anna','Stephen','Brenda','Larry','Pamela','Justin','Emma','Scott','Nicole','Brandon','Helen','Benjamin','Samantha','Samuel','Katherine','Gregory','Christine','Frank','Debra','Alexander','Rachel','Patrick','Carolyn','Raymond','Janet','Jack','Catherine','Dennis','Maria','Jerry','Heather'];
    const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Turner','Phillips','Evans','Collins','Stewart','Morris','Murphy','Cook','Rogers','Morgan','Peterson','Cooper','Reed','Bailey','Bell','Gomez','Kelly','Howard','Ward','Cox','Diaz','Richardson','Wood','Watson','Brooks','Bennett','Gray','James','Reyes','Cruz','Hughes','Price','Myers','Long','Foster','Sanders','Ross','Morales','Powell','Sullivan','Russell','Ortiz','Jenkins','Gutierrez','Perry'];
    const CITIES = ['Houston','Sugar Land','Katy','The Woodlands','Pearland','Cypress','Spring','League City','Friendswood','Missouri City','Richmond','Rosenberg','Conroe','Tomball','Humble','Kingwood','Clear Lake','Bellaire','West University','Memorial','Galveston','Pasadena','Baytown','Deer Park','La Porte','Seabrook','Webster','Alvin','Angleton','Lake Jackson'];
    const STREETS = ['Main St','Oak Dr','Elm Ave','Pine Rd','Maple Ln','Cedar Ct','Birch Blvd','Walnut Way','Spruce Pl','Ash Cir','Willow Tr','Poplar Dr','Magnolia St','Hickory Ln','Cypress Ave','Sycamore Rd','Laurel Blvd','Juniper Way','Redwood Pl','Dogwood Dr','Peach St','Cherry Ln','Apple Rd','Pear Ave','Plum Ct','Orange Blvd','Lemon Way','Lime Dr','Grape St','Olive Ln'];

    const BATCH = 200;
    for (let batch = 0; batch < 10; batch++) {
      const rows: { name: string; phone: string; email: string; address: string; preferredCurrency: string; portalEnabled: boolean; workspaceId: string; createdAt: Date }[] = [];
      for (let i = 0; i < BATCH; i++) {
        const idx = batch * BATCH + i;
        const fn = FIRST_NAMES[idx % FIRST_NAMES.length];
        const ln = LAST_NAMES[Math.floor(idx / FIRST_NAMES.length) % LAST_NAMES.length];
        const city = CITIES[idx % CITIES.length];
        const street = STREETS[idx % STREETS.length];
        const houseNum = 100 + (idx * 7) % 9900;
        const zip = 77000 + (idx * 3) % 200;
        rows.push({
          name: `${fn} ${ln}`,
          phone: `+1-713-${String(5550000 + idx).padStart(7, '0').slice(-7)}`,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}${idx > 100 ? idx : ''}@email.com`,
          address: `${houseNum} ${street}, ${city}, TX ${zip}`,
          preferredCurrency: 'USD',
          portalEnabled: Math.random() > 0.6,
          workspaceId: ws.id,
          createdAt: randomPast(365, 1),
        });
      }
      await db.customer.createMany({ data: rows });
    }

    const allCustomers = await db.customer.findMany({
      where: { workspaceId: ws.id },
      select: { id: true, name: true, phone: true, email: true, address: true },
    });
    console.log(`[ABC-Seed] ✅ ${allCustomers.length} customers`);

    // ─── 8. JOBS (355) ────────────────────────────────────
    console.log('[ABC-Seed] 🔧 Creating 355 jobs...');
    const JOB_STATUSES = ['pending','assigned','accepted','en_route','in_progress','completed','completed','completed','completed','cancelled'];
    const JOB_TITLES = [
      'Leaking Kitchen Faucet','Clogged Bathroom Drain','Water Heater Installation','Toilet Running','Pipe Burst in Wall',
      'Sewer Line Backup','Garbage Disposal Not Working','Low Water Pressure','Gas Leak Detection','Bathroom Remodel Rough-In',
      'Dishwasher Drain Line','Shower Valve Replacement','Outdoor Faucet Leak','Water Filtration Install','Tankless Water Heater Flush',
      'Slab Leak Detection','Main Shut-off Valve','Sump Pump Installation','Backflow Preventer Test','Water Softener Service',
      'Kitchen Sink Drain','Bathtub Drain Slow','Outdoor Sprinkler Line','Washing Machine Hose','Water Heater Element Replace',
    ];
    const PRIORITIES = ['low','medium','medium','medium','high','high','urgent'];
    const JOB_TYPES = ['plumbing','plumbing','plumbing','plumbing','installation','repair','emergency','drainage'];
    const JOB_COUNT = 355;

    for (let batch = 0; batch < Math.ceil(JOB_COUNT / BATCH); batch++) {
      const start = batch * BATCH;
      const end = Math.min(start + BATCH, JOB_COUNT);
      const rows: any[] = [];

      for (let i = start; i < end; i++) {
        const c = allCustomers[i % allCustomers.length];
        const emp = employees[i % employees.length];
        const status = JOB_STATUSES[i % JOB_STATUSES.length];
        const created = randomPast(90, 0);
        const scheduled = new Date(created.getTime() + (1 + Math.random() * 7) * 86400000);
        const amount = Math.round((80 + Math.random() * 2500) * 100) / 100;

        const row: any = {
          jobNumber: `JOB-${String(2024000 + i).padStart(7, '0')}`,
          title: JOB_TITLES[i % JOB_TITLES.length],
          description: `${JOB_TITLES[i % JOB_TITLES.length]} — Customer reported issue requiring professional plumbing service.`,
          status,
          priority: PRIORITIES[i % PRIORITIES.length],
          type: JOB_TYPES[i % JOB_TYPES.length],
          address: c.address || 'Houston, TX',
          scheduledAt: scheduled,
          estimatedDuration: 60 + (i % 8) * 30,
          quotedAmount: amount,
          customerId: c.id,
          customerName: c.name,
          customerPhone: c.phone,
          assigneeId: emp.id,
          assigneeName: emp.name,
          assigneePhone: emp.phone,
          workspaceId: ws.id,
          createdAt: created,
        };

        if (status === 'completed') {
          row.actualStartTime = scheduled;
          row.actualEndTime = new Date(scheduled.getTime() + (60 + Math.random() * 180) * 60000);
        }
        if (status === 'in_progress') {
          row.actualStartTime = hoursAgo(1 + Math.random() * 5);
        }
        if (status === 'cancelled') {
          row.notes = 'Customer cancelled — scheduling conflict';
        }

        rows.push(row);
      }
      await db.job.createMany({ data: rows });
    }

    const createdJobs = await db.job.findMany({
      where: { workspaceId: ws.id },
      select: { id: true, status: true, customerId: true, quotedAmount: true },
    });
    console.log(`[ABC-Seed] ✅ ${createdJobs.length} jobs`);

    // ─── 9. LEADS (155) ──────────────────────────────────
    console.log('[ABC-Seed] 🎯 Creating 155 leads...');
    const LEAD_SOURCES = ['website','whatsapp','google','referral','facebook','instagram','walk_in','phone','yelp','angies_list'];
    const LEAD_STATUSES = ['new','new','contacted','contacted','qualified','qualified','proposal','won','won','lost'];
    const LEAD_DESCS = [
      'Leaking pipe under kitchen sink — needs same-day repair',
      'Full bathroom remodel — needs plumbing rough-in and fixture installation',
      'Water heater not producing hot water — possible element failure',
      'Main drain line completely blocked — needs hydro-jetting',
      'Gas line installation for new kitchen stove',
      'Outdoor sprinkler system winterization and repair',
      'Whole-house repiping estimate — 1970s galvanized pipes',
      'Commercial kitchen grease trap installation',
      'Sewer line camera inspection before home purchase',
      'Emergency slab leak detection — water pooling on floor',
      'Tankless water heater installation — converting from tank',
      'Kitchen faucet replacement and new garbage disposal',
      'Sump pump installation for basement flooding',
      'Backflow preventer testing and certification',
      'Water softener and filtration system for well water',
    ];

    const LEAD_COUNT = 155;
    const leadRows: any[] = [];
    for (let i = 0; i < LEAD_COUNT; i++) {
      const fn = FIRST_NAMES[(i + 30) % FIRST_NAMES.length];
      const ln = LAST_NAMES[(i + 20) % LAST_NAMES.length];
      const city = CITIES[i % CITIES.length];
      leadRows.push({
        name: `${fn} ${ln}`,
        phone: `+1-713-${String(5560000 + i).padStart(7, '0').slice(-7)}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@email.com`,
        source: LEAD_SOURCES[i % LEAD_SOURCES.length],
        status: LEAD_STATUSES[i % LEAD_STATUSES.length],
        priority: PRIORITIES[i % PRIORITIES.length],
        value: Math.round((100 + Math.random() * 4900) * 100) / 100,
        description: LEAD_DESCS[i % LEAD_DESCS.length],
        serviceType: 'plumbing',
        address: `${200 + i * 3} ${STREETS[i % STREETS.length]}, ${city}, TX`,
        tenantId: tenant.id,
        assignedToId: employees[i % employees.length].id,
        followUpAt: i % 3 === 0 ? daysFromNow(1 + Math.random() * 5) : null,
        createdAt: randomPast(60, 0),
      });
    }
    await db.lead.createMany({ data: leadRows });
    console.log(`[ABC-Seed] ✅ ${LEAD_COUNT} leads`);

    // ─── 10. INVOICES (500) ───────────────────────────────
    console.log('[ABC-Seed] 💰 Creating 500 invoices...');
    const INV_STATUSES = ['draft','draft','sent','sent','sent','paid','paid','paid','paid','paid','cancelled'];
    const INV_TYPES = ['standard','standard','standard','job_completion','job_completion','deposit','milestone','recurring'];
    const completedJobIds = createdJobs.filter(j => j.status === 'completed').map(j => j.id);
    const INV_COUNT = 500;

    for (let batch = 0; batch < Math.ceil(INV_COUNT / BATCH); batch++) {
      const start = batch * BATCH;
      const end = Math.min(start + BATCH, INV_COUNT);
      const rows: any[] = [];

      for (let i = start; i < end; i++) {
        const c = allCustomers[i % allCustomers.length];
        const emp = employees[i % employees.length];
        const status = INV_STATUSES[i % INV_STATUSES.length];
        const amount = Math.round((75 + Math.random() * 3000) * 100) / 100;
        const tax = Math.round(amount * 0.0825 * 100) / 100;
        const discount = i % 5 === 0 ? Math.round(amount * 0.1 * 100) / 100 : 0;
        const total = Math.round((amount + tax - discount) * 100) / 100;
        const created = randomPast(90, 0);

        const row: any = {
          number: `INV-2024-${String(1000 + i).padStart(5, '0')}`,
          tenantId: tenant.id,
          jobId: completedJobIds[i % completedJobIds.length] || null,
          customerId: c.id,
          employeeId: emp.id,
          amount, tax, discount, total,
          currency: 'USD',
          exchangeRate: 1,
          baseCurrency: 'USD',
          baseAmount: amount,
          status,
          invoiceType: INV_TYPES[i % INV_TYPES.length],
          dueDate: new Date(created.getTime() + 30 * 86400000),
          itemsJson: JSON.stringify([{ description: JOB_TITLES[i % JOB_TITLES.length], quantity: 1, rate: amount }]),
          createdAt: created,
        };

        if (status === 'paid') {
          row.paidAt = new Date(created.getTime() + (1 + Math.random() * 20) * 86400000);
          row.sentAt = created;
        } else if (status === 'sent') {
          row.sentAt = created;
        }

        rows.push(row);
      }
      await db.invoice.createMany({ data: rows });
    }
    console.log(`[ABC-Seed] ✅ ${INV_COUNT} invoices`);

    // ─── 11. BOOKINGS (300) ───────────────────────────────
    console.log('[ABC-Seed] 📅 Creating 300 bookings...');
    const BK_STATUSES = ['pending','confirmed','confirmed','in_progress','completed','completed','completed','cancelled','no_show'];
    const BK_SOURCES = ['manual','whatsapp','website','form','api','whatsapp','website'];
    const BK_COUNT = 300;

    for (let batch = 0; batch < Math.ceil(BK_COUNT / BATCH); batch++) {
      const start = batch * BATCH;
      const end = Math.min(start + BATCH, BK_COUNT);
      const rows: any[] = [];

      for (let i = start; i < end; i++) {
        const c = allCustomers[i % allCustomers.length];
        const emp = employees[i % employees.length];
        const svc = services[i % services.length];
        const status = BK_STATUSES[i % BK_STATUSES.length];
        const scheduled = randomPast(30, -7);

        const row: any = {
          title: `${svc.name} — ${c.name}`,
          description: `Booking for ${svc.name}. ${svc.description}`,
          status,
          source: BK_SOURCES[i % BK_SOURCES.length],
          customerId: c.id,
          customerName: c.name,
          customerPhone: c.phone,
          customerEmail: c.email,
          employeeId: emp.id,
          serviceId: svc.id,
          address: c.address || 'Houston, TX',
          scheduledAt: scheduled,
          duration: svc.duration,
          tenantId: tenant.id,
          workspaceId: ws.id,
          createdAt: randomPast(45, 0),
        };

        if (status === 'confirmed') row.confirmedAt = row.createdAt;
        if (status === 'completed') row.completedAt = scheduled;
        if (status === 'cancelled') { row.cancelledAt = scheduled; row.cancellationReason = 'Customer rescheduled'; }

        rows.push(row);
      }
      await db.booking.createMany({ data: rows });
    }
    console.log(`[ABC-Seed] ✅ ${BK_COUNT} bookings`);

    // ─── 12. CAMPAIGNS (6) ────────────────────────────────
    console.log('[ABC-Seed] 📱 Creating campaigns...');
    const campaignDefs = [
      { name: 'Summer Maintenance Special', type: 'seasonal', status: 'completed', messageContent: '🏖️ Summer Special! 20% off drain cleaning. Reply BOOK to schedule.', totalRecipients: 1800, sentCount: 1795, deliveredCount: 1720, readCount: 1450, clickedCount: 320, repliedCount: 185, convertedCount: 67, failedCount: 5, revenueGenerated: 18450 },
      { name: 'Winterization Reminder', type: 'service_reminder', status: 'completed', messageContent: '🥶 Winter is coming! Protect your pipes. Schedule winterization for $99. Reply PROTECT.', totalRecipients: 2000, sentCount: 1998, deliveredCount: 1890, readCount: 1560, clickedCount: 210, repliedCount: 145, convertedCount: 89, failedCount: 2, revenueGenerated: 8811 },
      { name: 'Customer Appreciation Month', type: 'promotional', status: 'running', messageContent: '🎉 15% off your next service! Mention this message when booking.', totalRecipients: 2000, sentCount: 1200, deliveredCount: 1150, readCount: 890, clickedCount: 178, repliedCount: 92, convertedCount: 34, failedCount: 3, revenueGenerated: 7650 },
      { name: 'New Tankless Water Heater Promo', type: 'promotional', status: 'scheduled', messageContent: '💧 Upgrade to tankless! Save 30% on energy. $200 off installation. Reply TANKLESS.', totalRecipients: 1500 },
      { name: 'Re-engagement — Inactive Customers', type: 're_engagement', status: 'draft', messageContent: 'We miss you! 🚰 Book this month for a FREE drain inspection worth $149. Reply BACK.', totalRecipients: 450 },
      { name: 'Emergency Service Awareness', type: 'follow_up', status: 'completed', messageContent: '🚨 Plumbing emergency? We\'re here 24/7! Call +1-713-555-0100. Don\'t wait!', totalRecipients: 2000, sentCount: 1999, deliveredCount: 1910, readCount: 1680, clickedCount: 95, repliedCount: 23, convertedCount: 12, failedCount: 1, revenueGenerated: 4476 },
    ];

    const campaigns = await Promise.all(
      campaignDefs.map((c, i) =>
        db.campaign.create({
          data: {
            ...c,
            channel: 'whatsapp',
            audienceType: 'all',
            scheduledAt: daysAgo(60 - i * 10),
            tenantId: tenant.id,
            workspaceId: ws.id,
            createdAt: daysAgo(65 - i * 10),
          },
        })
      )
    );
    console.log('[ABC-Seed] ✅ 6 campaigns');

    // ─── 13. REVIEWS (55) ────────────────────────────────
    console.log('[ABC-Seed] ⭐ Creating reviews...');
    const REVIEW_COMMENTS = [
      'Excellent work! Fixed our leaking pipe in under an hour. Very professional.',
      'Great service. The technician was on time and very knowledgeable.',
      'ABC Plumbing is the best! Water heater installed quickly and cleanly.',
      'Very happy with the drain cleaning service. Will use again.',
      'Prompt response to our emergency call. Saved us from major water damage!',
      'Reasonable pricing and quality work. Highly recommend.',
      'The team was professional and cleaned up after themselves. 5 stars!',
      'Had a slab leak detected and repaired. Fair price, latest technology.',
      'Outstanding customer service from booking to completion. A+ experience.',
      'Our go-to plumber for all our rental properties. Reliable and affordable.',
      'Fixed our gas line same-day. Very thorough safety inspection.',
      'Impressed with the tankless water heater installation. Neat work.',
      'Hydro-jetting cleared our main drain perfectly. No more backups!',
      'Technician explained everything clearly. No surprises on the bill.',
      'Best plumbing company in Houston. Been using them for 3 years.',
    ];
    const RATINGS = [5,5,5,5,5,5,4,4,4,3];

    const reviewRows: any[] = [];
    for (let i = 0; i < 55; i++) {
      reviewRows.push({
        rating: RATINGS[i % RATINGS.length],
        comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
        jobId: completedJobIds[i % completedJobIds.length] || null,
        customerId: allCustomers[i % allCustomers.length].id,
        employeeId: employees[i % employees.length].id,
        tenantId: tenant.id,
        createdAt: randomPast(90, 1),
      });
    }
    await db.review.createMany({ data: reviewRows });
    console.log('[ABC-Seed] ✅ 55 reviews');

    // ─── 14. QUOTES (42) ─────────────────────────────────
    console.log('[ABC-Seed] 📝 Creating quotes...');
    const Q_STATUSES = ['draft','sent','sent','accepted','accepted','rejected','expired'];
    const quoteRows: any[] = [];
    for (let i = 0; i < 42; i++) {
      const c = allCustomers[i % allCustomers.length];
      const subtotal = Math.round((200 + Math.random() * 4500) * 100) / 100;
      const tax = Math.round(subtotal * 0.0825 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      quoteRows.push({
        title: JOB_TITLES[i % JOB_TITLES.length],
        itemsJson: JSON.stringify([
          { description: 'Labor', quantity: 1, rate: Math.round(subtotal * 0.6 * 100) / 100 },
          { description: 'Materials & Parts', quantity: 1, rate: Math.round(subtotal * 0.4 * 100) / 100 },
        ]),
        subtotal, tax, discount: 0, total,
        status: Q_STATUSES[i % Q_STATUSES.length],
        tenantId: tenant.id,
        customerId: c.id,
        createdAt: randomPast(60, 0),
      });
    }
    await db.quote.createMany({ data: quoteRows });
    console.log('[ABC-Seed] ✅ 42 quotes');

    // ─── 15. CONVERSATIONS (25) ──────────────────────────
    console.log('[ABC-Seed] 💬 Creating conversations...');
    const convRows: any[] = [];
    const stages = ['greeting','intent_detected','booking','assigned','in_progress','completed'];
    const intents = ['booking','inquiry','complaint','follow_up','quote_request'];
    for (let i = 0; i < 25; i++) {
      const c = allCustomers[i % allCustomers.length];
      convRows.push({
        conversationId: `wa_demo_${i}_${Date.now()}`,
        customerPhone: c.phone,
        customerName: c.name,
        channel: 'whatsapp',
        status: i < 5 ? 'active' : 'completed',
        currentStage: stages[i % stages.length],
        intentDetected: intents[i % intents.length],
        tenantId: tenant.id,
        workspaceId: ws.id,
        lastMessageAt: randomPast(7, 0),
        createdAt: randomPast(30, 0),
      });
    }
    await db.conversation.createMany({ data: convRows });
    console.log('[ABC-Seed] ✅ 25 conversations');

    // ─── 16. NOTIFICATIONS (30) ──────────────────────────
    const notifTypes = [
      { type: 'job_assigned', title: 'New Job Assigned', msg: 'You have been assigned a new job' },
      { type: 'job_completed', title: 'Job Completed', msg: 'A job has been marked as completed' },
      { type: 'invoice_paid', title: 'Payment Received', msg: 'An invoice has been paid' },
      { type: 'lead_created', title: 'New Lead', msg: 'A new lead has been captured' },
      { type: 'booking_confirmed', title: 'Booking Confirmed', msg: 'A booking has been confirmed' },
      { type: 'review_received', title: 'New Review', msg: 'A customer left a review' },
    ];
    const notifRows: any[] = [];
    for (let i = 0; i < 30; i++) {
      const n = notifTypes[i % notifTypes.length];
      notifRows.push({
        title: n.title, message: n.msg, type: n.type,
        userId: ownerUser.id, tenantId: tenant.id,
        read: i < 20,
        createdAt: randomPast(14, 0),
      });
    }
    await db.notification.createMany({ data: notifRows });
    console.log('[ABC-Seed] ✅ 30 notifications');

    // ─── 17. CAMPAIGN TEMPLATES (5) ──────────────────────
    await Promise.all([
      db.campaignTemplate.create({ data: { name: 'Booking Confirmation', category: 'reminder', content: 'Hi {{name}}! Your plumbing appointment is confirmed for {{date}} at {{time}}.', variablesJson: '["name","date","time"]', isApproved: true, status: 'published', tenantId: tenant.id, workspaceId: ws.id } }),
      db.campaignTemplate.create({ data: { name: 'Job Completion Follow-up', category: 'follow_up', content: 'Hi {{name}}, thanks for choosing ABC Plumbing! We\'d love your feedback: {{review_link}}', variablesJson: '["name","review_link"]', isApproved: true, status: 'published', tenantId: tenant.id, workspaceId: ws.id } }),
      db.campaignTemplate.create({ data: { name: 'Invoice Reminder', category: 'reminder', content: 'Hi {{name}}, invoice #{{invoice_number}} for ${{amount}} is due on {{due_date}}.', variablesJson: '["name","invoice_number","amount","due_date"]', isApproved: true, status: 'published', tenantId: tenant.id, workspaceId: ws.id } }),
      db.campaignTemplate.create({ data: { name: 'Seasonal Promo', category: 'promotional', content: '🏠 {{offer}}! Book before {{deadline}} and save. Reply INFO to learn more.', variablesJson: '["offer","deadline"]', isApproved: true, status: 'published', tenantId: tenant.id, workspaceId: ws.id } }),
      db.campaignTemplate.create({ data: { name: 'Emergency Service Alert', category: 'follow_up', content: '🚨 Plumbing emergency? We\'re here 24/7! Call {{phone}} or reply HELP.', variablesJson: '["phone"]', isApproved: true, status: 'published', tenantId: tenant.id, workspaceId: ws.id } }),
    ]);
    console.log('[ABC-Seed] ✅ 5 campaign templates');

    console.log('[ABC-Seed] 🎉 ABC Plumbing demo complete!');

    return NextResponse.json({
      success: true,
      message: 'ABC Plumbing demo company seeded successfully!',
      credentials: { email: 'owner@abcplumbing.com', password: 'demo123', business: 'ABC Plumbing' },
      data: {
        customers: allCustomers.length,
        jobs: createdJobs.length,
        leads: LEAD_COUNT,
        invoices: INV_COUNT,
        bookings: BK_COUNT,
        employees: employees.length,
        services: services.length,
        campaigns: campaigns.length,
        reviews: 55,
        quotes: 42,
        conversations: 25,
        notifications: 30,
      },
    });
  } catch (error: any) {
    console.error('[ABC-Seed] ❌ Seed failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed ABC Plumbing demo' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seed-abc-plumbing — check if demo data exists
 */
export async function GET() {
  try {
    const tenant = await db.tenant.findFirst({ where: { slug: 'abc-plumbing-demo' } });
    if (!tenant) return NextResponse.json({ exists: false });

    const [customers, jobs, leads, invoices, bookings, employees, services, campaigns, reviews] = await Promise.all([
      db.customer.count({ where: { workspace: { tenantId: tenant.id } } }),
      db.job.count({ where: { workspace: { tenantId: tenant.id } } }),
      db.lead.count({ where: { tenantId: tenant.id } }),
      db.invoice.count({ where: { tenantId: tenant.id } }),
      db.booking.count({ where: { tenantId: tenant.id } }),
      db.employee.count({ where: { workspace: { tenantId: tenant.id } } }),
      db.service.count({ where: { tenantId: tenant.id } }),
      db.campaign.count({ where: { tenantId: tenant.id } }),
      db.review.count({ where: { tenantId: tenant.id } }),
    ]);

    return NextResponse.json({ exists: true, tenantId: tenant.id, counts: { customers, jobs, leads, invoices, bookings, employees, services, campaigns, reviews } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get counts' }, { status: 500 });
  }
}

// ─── Cleanup helper ──────────────────────────────────────
async function cleanupDemoData(tenantId: string) {
  try {
    const ws = await db.workspace.findFirst({ where: { tenantId } });
    const wid = ws?.id;

    await db.notification.deleteMany({ where: { tenantId } });
    await db.review.deleteMany({ where: { tenantId } });
    await db.invoice.deleteMany({ where: { tenantId } });
    await db.quote.deleteMany({ where: { tenantId } });
    await db.campaignTemplate.deleteMany({ where: { tenantId } });
    await db.campaign.deleteMany({ where: { tenantId } });
    await db.lead.deleteMany({ where: { tenantId } });
    await db.service.deleteMany({ where: { tenantId } });
    await db.subscription.deleteMany({ where: { tenantId } });

    if (wid) {
      await db.booking.deleteMany({ where: { workspaceId: wid } });
      await db.job.deleteMany({ where: { workspaceId: wid } });
      await db.employee.deleteMany({ where: { workspaceId: wid } });
      await db.conversation.deleteMany({ where: { workspaceId: wid } });
      await db.customer.deleteMany({ where: { workspaceId: wid } });
    }

    await db.user.deleteMany({ where: { tenantId } });
    if (wid) await db.workspace.deleteMany({ where: { id: wid } });
    await db.tenant.deleteMany({ where: { id: tenantId } });

    console.log('[ABC-Seed] 🧹 Old data cleaned');
  } catch (err) {
    console.error('[ABC-Seed] Cleanup error (non-fatal):', err);
  }
}
