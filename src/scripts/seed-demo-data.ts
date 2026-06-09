import { db } from '@/lib/db';

async function seedDemoData() {
  console.log('🌱 Seeding demo data for Operations view...\n');

  // ============================================================
  // 1. Seed Resources
  // ============================================================
  console.log('📦 Seeding resources...');
  const existingResources = await db.resource.count();

  const resourcesData = [
    { name: 'Ravi Kumar', phone: '+919876543210', type: 'driver', status: 'available', rating: 4.5, completedJobs: 23, location: 'Delhi', skills: '["driving", "navigation"]' },
    { name: 'Mohan Singh', phone: '+919876543211', type: 'driver', status: 'available', rating: 4.8, completedJobs: 45, location: 'Gurgaon', skills: '["driving", "long_route"]' },
    { name: 'Suresh Yadav', phone: '+919876543212', type: 'driver', status: 'available', rating: 4.2, completedJobs: 12, location: 'Noida', skills: '["driving"]' },
    { name: 'Deepak Sharma', phone: '+919876543213', type: 'driver', status: 'busy', rating: 4.6, completedJobs: 34, location: 'Delhi', skills: '["driving", "heavy_vehicle"]' },
    { name: 'Ashok Verma', phone: '+919876543214', type: 'driver', status: 'available', rating: 4.3, completedJobs: 18, location: 'Faridabad', skills: '["driving", "local"]' },
    { name: 'Priya Patel', phone: '+919876543215', type: 'beautician', status: 'available', rating: 4.9, completedJobs: 67, location: 'South Delhi', skills: '["hair", "makeup", "bridal"]' },
    { name: 'Dr. Kumar', phone: '+919876543216', type: 'doctor', status: 'available', rating: 4.7, completedJobs: 156, location: 'Central Delhi', skills: '["general", "consultation"]' },
    { name: 'Ajay Technician', phone: '+919876543217', type: 'technician', status: 'available', rating: 4.4, completedJobs: 28, location: 'East Delhi', skills: '["AC repair", "electrical"]' },
  ];

  const resources: Awaited<ReturnType<typeof db.resource.create>>[] = [];

  if (existingResources > 0) {
    console.log(`  Found ${existingResources} existing resources, checking for missing entries...`);
    const existingPhones = (await db.resource.findMany({ select: { phone: true } })).map(r => r.phone);
    for (const r of resourcesData) {
      if (!existingPhones.includes(r.phone)) {
        const resource = await db.resource.create({ data: r });
        resources.push(resource);
        console.log(`  Created missing resource: ${r.name} (${r.type})`);
      } else {
        const existing = await db.resource.findFirst({ where: { phone: r.phone } });
        if (existing) resources.push(existing);
      }
    }
  } else {
    for (const r of resourcesData) {
      const resource = await db.resource.create({ data: r });
      resources.push(resource);
      console.log(`  Created resource: ${r.name} (${r.type}, ${r.status})`);
    }
  }
  console.log(`  Total resources: ${resources.length}\n`);

  // ============================================================
  // 2. Seed Employees
  // ============================================================
  console.log('👥 Seeding employees...');
  const existingEmployees = await db.employee.count();

  const employeesData = resourcesData.map(r => ({
    name: r.name,
    phone: r.phone,
    role: r.type,
    status: r.status,
    rating: r.rating,
    completedJobs: r.completedJobs,
    location: r.location,
    skills: r.skills,
  }));

  const employees: Awaited<ReturnType<typeof db.employee.create>>[] = [];

  if (existingEmployees > 0) {
    console.log(`  Found ${existingEmployees} existing employees, checking for missing entries...`);
    const existingPhones = (await db.employee.findMany({ select: { phone: true } })).map(e => e.phone);
    for (const e of employeesData) {
      if (!existingPhones.includes(e.phone)) {
        const employee = await db.employee.create({ data: e });
        employees.push(employee);
        console.log(`  Created missing employee: ${e.name} (${e.role})`);
      } else {
        const existing = await db.employee.findFirst({ where: { phone: e.phone } });
        if (existing) employees.push(existing);
      }
    }
  } else {
    for (const e of employeesData) {
      const employee = await db.employee.create({ data: e });
      employees.push(employee);
      console.log(`  Created employee: ${e.name} (${e.role}, ${e.status})`);
    }
  }
  console.log(`  Total employees: ${employees.length}\n`);

  // ============================================================
  // 3. Seed Customers
  // ============================================================
  console.log('🏢 Seeding customers...');
  const existingCustomers = await db.customer.count();

  const customersData = [
    { name: 'Rahul Sharma', phone: '+919998887776', email: 'rahul@example.com' },
    { name: 'Anita Gupta', phone: '+919998887775', email: 'anita@example.com' },
    { name: 'Neha Verma', phone: '+919998887774', email: 'neha@example.com' },
    { name: 'Sunil Kumar', phone: '+919998887773', email: 'sunil@example.com' },
    { name: 'Vikram Singh', phone: '+919998887772', email: 'vikram@example.com' },
  ];

  const customers: Awaited<ReturnType<typeof db.customer.create>>[] = [];

  if (existingCustomers > 0) {
    console.log(`  Found ${existingCustomers} existing customers, checking for missing entries...`);
    const existingPhones = (await db.customer.findMany({ select: { phone: true } })).map(c => c.phone);
    for (const c of customersData) {
      if (!existingPhones.includes(c.phone)) {
        const customer = await db.customer.create({ data: c });
        customers.push(customer);
        console.log(`  Created missing customer: ${c.name}`);
      } else {
        const existing = await db.customer.findFirst({ where: { phone: c.phone } });
        if (existing) customers.push(existing);
      }
    }
  } else {
    for (const c of customersData) {
      const customer = await db.customer.create({ data: c });
      customers.push(customer);
      console.log(`  Created customer: ${c.name} (${c.phone})`);
    }
  }
  console.log(`  Total customers: ${customers.length}\n`);

  // ============================================================
  // 4. Seed Jobs
  // ============================================================
  console.log('📋 Seeding jobs...');
  const existingJobs = await db.job.count();

  const jobsData = [
    { title: 'Delhi to Gurgaon Transport', type: 'transport', status: 'pending', priority: 'high', customerName: 'Rahul Sharma', customerPhone: '+919998887776', pickup: 'Delhi', dropoff: 'Gurgaon', address: 'Connaught Place, Delhi', customerId: customers[0]?.id },
    { title: 'AC Repair - Kamla Nagar', type: 'service', status: 'pending', priority: 'medium', customerName: 'Anita Gupta', customerPhone: '+919998887775', address: 'Kamla Nagar, Delhi', customerId: customers[1]?.id },
    { title: 'Bridal Makeup - South Delhi', type: 'salon', status: 'assigned', priority: 'high', customerName: 'Neha Verma', customerPhone: '+919998887774', address: 'Hauz Khas, Delhi', assigneeName: 'Priya Patel', customerId: customers[2]?.id },
    { title: 'Medical Consultation', type: 'healthcare', status: 'in_progress', priority: 'urgent', customerName: 'Sunil Kumar', customerPhone: '+919998887773', address: 'Rajouri Garden, Delhi', assigneeName: 'Dr. Kumar', actualStartTime: new Date(), customerId: customers[3]?.id },
    { title: 'Noida to Delhi Delivery', type: 'delivery', status: 'completed', priority: 'low', customerName: 'Vikram Singh', customerPhone: '+919998887772', pickup: 'Noida', dropoff: 'Delhi', assigneeName: 'Mohan Singh', actualStartTime: new Date(Date.now() - 3600000), actualEndTime: new Date(), customerId: customers[4]?.id },
  ];

  if (existingJobs > 0) {
    console.log(`  Found ${existingJobs} existing jobs. Skipping job creation.`);
  } else {
    for (const j of jobsData) {
      await db.job.create({ data: j });
      console.log(`  Created job: ${j.title} (${j.status}, ${j.priority})`);
    }
  }
  console.log(`  Jobs seeded.\n`);

  // ============================================================
  // 5. Seed Contact Lists with Entries
  // ============================================================
  console.log('📇 Seeding contact lists...');
  const existingLists = await db.contactList.count();

  // "All Drivers" list
  let driversList = await db.contactList.findFirst({ where: { name: 'All Drivers' } });
  if (!driversList) {
    driversList = await db.contactList.create({
      data: {
        name: 'All Drivers',
        description: 'All driver resources for transport and delivery jobs',
        type: 'role_based',
        roleFilter: 'driver',
        icon: '🚗',
        color: 'emerald',
        isDefault: true,
      },
    });
    console.log(`  Created contact list: All Drivers`);
  }

  // Check if entries exist
  const driversListEntries = await db.contactListEntry.count({ where: { contactListId: driversList.id } });
  if (driversListEntries === 0) {
    const driverResources = resources.filter(r =>
      ['driver'].includes(r.type)
    );
    if (driverResources.length > 0) {
      await db.contactListEntry.createMany({
        data: driverResources.map(r => ({
          contactListId: driversList!.id,
          name: r.name,
          phone: r.phone,
          role: r.type,
          whatsappId: r.whatsappId,
        })),
      });
      console.log(`  Added ${driverResources.length} driver entries to "All Drivers" list`);
    }
  } else {
    console.log(`  "All Drivers" list already has ${driversListEntries} entries`);
  }

  // "All Staff" list
  let staffList = await db.contactList.findFirst({ where: { name: 'All Staff' } });
  if (!staffList) {
    staffList = await db.contactList.create({
      data: {
        name: 'All Staff',
        description: 'All resources regardless of type',
        type: 'all_employees',
        icon: '👥',
        color: 'violet',
        isDefault: true,
      },
    });
    console.log(`  Created contact list: All Staff`);
  }

  const staffListEntries = await db.contactListEntry.count({ where: { contactListId: staffList.id } });
  if (staffListEntries === 0) {
    if (resources.length > 0) {
      await db.contactListEntry.createMany({
        data: resources.map(r => ({
          contactListId: staffList!.id,
          name: r.name,
          phone: r.phone,
          role: r.type,
          whatsappId: r.whatsappId,
        })),
      });
      console.log(`  Added ${resources.length} resource entries to "All Staff" list`);
    }
  } else {
    console.log(`  "All Staff" list already has ${staffListEntries} entries`);
  }
  console.log('');

  // ============================================================
  // 6. Seed Universal Assignment Workflow (in Workflow table)
  // ============================================================
  console.log('🔄 Seeding Universal Assignment Workflow...');
  const existingWorkflow = await db.workflow.findFirst({ where: { name: 'Universal Assignment Workflow' } });

  const workflowNodes = [
    {
      id: 'webhook-trigger-1',
      type: 'webhookTrigger',
      position: { x: 100, y: 200 },
      data: {
        label: 'New Job Webhook',
        name: 'New Job Webhook',
        type: 'webhookTrigger',
        config: {
          httpMethod: 'POST',
          respond: 'immediately',
        },
      },
    },
    {
      id: 'set-node-1',
      type: 'setNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Extract Job Data',
        name: 'Extract Job Data',
        type: 'setNode',
        config: {
          mode: 'json',
          jsonValue: '{"jobId": "{{ $json.body.id || $json.body.jobId }}", "jobTitle": "{{ $json.body.title || $json.body.customer }}", "customerName": "{{ $json.body.customer || $json.body.customerName }}", "jobType": "{{ $json.body.type || \'delivery\' }}", "pickup": "{{ $json.body.pickup || \'\' }}", "dropoff": "{{ $json.body.drop || $json.body.dropoff || \'\' }}"}',
        },
      },
    },
    {
      id: 'supabase-node-1',
      type: 'supabaseNode',
      position: { x: 600, y: 200 },
      data: {
        label: 'Get Available Resources',
        name: 'Get Available Resources',
        type: 'supabaseNode',
        config: {
          operation: 'query',
          table: 'resources',
          query: '{"status": "available"}',
        },
      },
    },
    {
      id: 'whatsapp-node-1',
      type: 'whatsappNode',
      position: { x: 850, y: 200 },
      data: {
        label: 'Send Admin Alert',
        name: 'Send Admin Alert',
        type: 'whatsappNode',
        config: {
          operation: 'sendInteractive',
          interactiveType: 'button',
          headerText: '🚨 New Transport Job',
          bodyText: 'Job ID: {{ $json.jobId }}\n\nCustomer: {{ $json.customerName }}\nPickup: {{ $json.pickup }}\nDrop: {{ $json.dropoff }}\n\nTap below to assign a driver.',
          footerText: 'FlowForge Assignment',
          buttons: [
            { id: 'assign_btn', label: 'Assign Driver' },
            { id: 'view_btn', label: 'View Details' },
          ],
        },
      },
    },
    {
      id: 'whatsapp-callback-trigger-1',
      type: 'whatsappCallbackTrigger',
      position: { x: 100, y: 500 },
      data: {
        label: 'Assign Button Clicked',
        name: 'Assign Button Clicked',
        type: 'whatsappCallbackTrigger',
        config: {
          callbackType: 'button_reply',
          buttonIdPattern: 'assign_*',
        },
      },
    },
    {
      id: 'supabase-node-2',
      type: 'supabaseNode',
      position: { x: 350, y: 500 },
      data: {
        label: 'Get Employees for Assignment',
        name: 'Get Employees for Assignment',
        type: 'supabaseNode',
        config: {
          operation: 'query',
          table: 'resources',
          query: '{"status": "available"}',
        },
      },
    },
    {
      id: 'whatsapp-node-2',
      type: 'whatsappNode',
      position: { x: 600, y: 500 },
      data: {
        label: 'Send Employee List',
        name: 'Send Employee List',
        type: 'whatsappNode',
        config: {
          operation: 'sendInteractive',
          interactiveType: 'list',
          bodyText: 'Choose an employee to assign to this job:',
          listButtonText: 'View Employees',
          dynamicListMode: true,
          dynamicListConfig: {
            dataPath: '{{ $json.data }}',
            titleExpression: '{{ $json.data[i].name }}',
            descriptionExpression: '{{ $json.data[i].type }} ⭐ {{ $json.data[i].rating }}',
            idExpression: 'resource_{{ $json.data[i].id }}',
          },
        },
      },
    },
    {
      id: 'whatsapp-callback-trigger-2',
      type: 'whatsappCallbackTrigger',
      position: { x: 100, y: 800 },
      data: {
        label: 'Employee Selected',
        name: 'Employee Selected',
        type: 'whatsappCallbackTrigger',
        config: {
          callbackType: 'list_reply',
          listIdPattern: 'resource_*',
        },
      },
    },
    {
      id: 'supabase-node-3',
      type: 'supabaseNode',
      position: { x: 350, y: 800 },
      data: {
        label: 'Update Job Assignment',
        name: 'Update Job Assignment',
        type: 'supabaseNode',
        config: {
          operation: 'update',
          table: 'jobs',
          query: '{"status": "pending"}',
          updateData: '{"status": "assigned", "assigneeName": "Selected Resource"}',
        },
      },
    },
    {
      id: 'whatsapp-node-3',
      type: 'whatsappNode',
      position: { x: 600, y: 800 },
      data: {
        label: 'Notify Resource',
        name: 'Notify Resource',
        type: 'whatsappNode',
        config: {
          operation: 'sendInteractive',
          interactiveType: 'button',
          headerText: '📋 Job Assigned',
          bodyText: 'You have been assigned a new job. Please confirm.',
          buttons: [
            { id: 'accept_btn', label: '✅ Accept' },
            { id: 'reject_btn', label: '❌ Reject' },
          ],
        },
      },
    },
  ];

  const workflowEdges = [
    { id: 'edge-1', source: 'webhook-trigger-1', target: 'set-node-1', sourceHandle: 'main', targetHandle: 'main' },
    { id: 'edge-2', source: 'set-node-1', target: 'supabase-node-1', sourceHandle: 'main', targetHandle: 'main' },
    { id: 'edge-3', source: 'supabase-node-1', target: 'whatsapp-node-1', sourceHandle: 'main', targetHandle: 'main' },
    { id: 'edge-4', source: 'whatsapp-callback-trigger-1', target: 'supabase-node-2', sourceHandle: 'main', targetHandle: 'main' },
    { id: 'edge-5', source: 'supabase-node-2', target: 'whatsapp-node-2', sourceHandle: 'main', targetHandle: 'main' },
    { id: 'edge-6', source: 'whatsapp-callback-trigger-2', target: 'supabase-node-3', sourceHandle: 'main', targetHandle: 'main' },
    { id: 'edge-7', source: 'supabase-node-3', target: 'whatsapp-node-3', sourceHandle: 'main', targetHandle: 'main' },
  ];

  if (existingWorkflow) {
    await db.workflow.update({
      where: { id: existingWorkflow.id },
      data: {
        nodesJson: JSON.stringify(workflowNodes),
        edgesJson: JSON.stringify(workflowEdges),
        tags: '["universal", "assignment", "whatsapp"]',
      },
    });
    console.log(`  Updated existing workflow: Universal Assignment Workflow (id: ${existingWorkflow.id})`);
  } else {
    const workflow = await db.workflow.create({
      data: {
        name: 'Universal Assignment Workflow',
        description: 'Complete job assignment workflow with WhatsApp integration: webhook trigger → admin alert → employee selection → job update → resource notification',
        nodesJson: JSON.stringify(workflowNodes),
        edgesJson: JSON.stringify(workflowEdges),
        active: false,
        tags: '["universal", "assignment", "whatsapp"]',
      },
    });
    console.log(`  Created workflow: Universal Assignment Workflow (id: ${workflow.id})`);
    console.log(`  Active: false, Tags: universal, assignment, whatsapp`);
  }

  // ============================================================
  // 7. Seed Universal Assignment Workflow Template
  // ============================================================
  console.log('\n📝 Seeding Universal Assignment Workflow template...');
  const workflowJson = JSON.stringify({ nodes: workflowNodes, edges: workflowEdges });

  const template = await db.template.upsert({
    where: { id: 'universal-assignment-workflow' },
    update: {
      name: 'Universal Assignment Workflow',
      description: 'Complete job assignment workflow with WhatsApp integration. Receives job data via webhook, sends interactive admin alert, allows driver selection via list message, updates job status, and notifies the assigned resource.',
      workflowJson,
      category: 'operations',
      icon: '🚚',
      featured: true,
      rating: 4.8,
    },
    create: {
      id: 'universal-assignment-workflow',
      name: 'Universal Assignment Workflow',
      description: 'Complete job assignment workflow with WhatsApp integration. Receives job data via webhook, sends interactive admin alert, allows driver selection via list message, updates job status, and notifies the assigned resource.',
      workflowJson,
      category: 'operations',
      icon: '🚚',
      featured: true,
      rating: 4.8,
    },
  });

  console.log(`  Template created/updated: ${template.name} (id: ${template.id})`);

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Demo data seeding complete!');
  console.log('='.repeat(60));
  console.log(`  Resources:   ${resources.length}`);
  console.log(`  Employees:   ${employees.length}`);
  console.log(`  Customers:   ${customers.length}`);
  console.log(`  Jobs:        ${existingJobs > 0 ? existingJobs + ' (existing)' : jobsData.length}`);
  console.log(`  Contact Lists: 2 (All Drivers, All Staff)`);
  console.log(`  Workflow:    Universal Assignment Workflow (inactive)`);
  console.log(`  Template:    Universal Assignment Workflow (featured)`);
  console.log('='.repeat(60));
}

seedDemoData()
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await db.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
