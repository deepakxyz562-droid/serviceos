import { db } from '@/lib/db'

async function seedAll() {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  console.log('Cleaning existing data...')
  await db.contactListEntry.deleteMany()
  await db.contactList.deleteMany()
  await db.webhookSource.deleteMany()
  await db.job.deleteMany()
  await db.customer.deleteMany()
  await db.employee.deleteMany()
  await db.resource.deleteMany()

  // 1. Seed 5 drivers
  console.log('Seeding employees (drivers)...')
  const drivers = await Promise.all([
    db.employee.create({
      data: { name: 'Ravi', phone: '+91-9876543210', role: 'driver', status: 'available', location: 'Delhi', skills: JSON.stringify(['delivery', 'long-haul']), rating: 4.5, completedJobs: 23 },
    }),
    db.employee.create({
      data: { name: 'Mohan', phone: '+91-9876543211', role: 'driver', status: 'available', location: 'Gurgaon', skills: JSON.stringify(['delivery', 'local']), rating: 4.2, completedJobs: 18 },
    }),
    db.employee.create({
      data: { name: 'Suresh', phone: '+91-9876543212', role: 'driver', status: 'busy', location: 'Noida', skills: JSON.stringify(['delivery', 'express']), rating: 4.8, completedJobs: 35 },
    }),
    db.employee.create({
      data: { name: 'Deepak', phone: '+91-9876543213', role: 'driver', status: 'available', location: 'Faridabad', skills: JSON.stringify(['delivery', 'heavy-load']), rating: 4.0, completedJobs: 12 },
    }),
    db.employee.create({
      data: { name: 'Ashok', phone: '+91-9876543214', role: 'driver', status: 'available', location: 'Ghaziabad', skills: JSON.stringify(['delivery', 'local', 'express']), rating: 4.6, completedJobs: 29 },
    }),
  ])

  // 2. Seed other resources
  console.log('Seeding other resources...')
  const otherResources = await Promise.all([
    db.resource.create({
      data: { name: 'Priya', phone: '+91-9876543215', type: 'beautician', status: 'available', location: 'Delhi', skills: JSON.stringify(['bridal', 'hair', 'makeup']), rating: 4.9, completedJobs: 45 },
    }),
    db.resource.create({
      data: { name: 'Dr. Kumar', phone: '+91-9876543216', type: 'doctor', status: 'available', location: 'Delhi', skills: JSON.stringify(['general', 'consultation']), rating: 4.7, completedJobs: 52 },
    }),
    db.resource.create({
      data: { name: 'Ajay', phone: '+91-9876543217', type: 'technician', status: 'busy', location: 'Gurgaon', skills: JSON.stringify(['ac-repair', 'appliance']), rating: 4.3, completedJobs: 31 },
    }),
    db.resource.create({
      data: { name: 'Sunita', phone: '+91-9876543218', type: 'cleaner', status: 'available', location: 'Noida', skills: JSON.stringify(['deep-clean', 'regular']), rating: 4.1, completedJobs: 20 },
    }),
    db.resource.create({
      data: { name: 'Vikram', phone: '+91-9876543219', type: 'packer', status: 'available', location: 'Delhi', skills: JSON.stringify(['packing', 'moving', 'fragile']), rating: 4.4, completedJobs: 27 },
    }),
  ])

  // 3. Seed 4 customers
  console.log('Seeding customers...')
  const customers = await Promise.all([
    db.customer.create({
      data: { name: 'John', phone: '+91-9999999001', email: 'john@example.com', address: '12 Connaught Place, Delhi' },
    }),
    db.customer.create({
      data: { name: 'Meera Industries', phone: '+91-9999999002', email: 'contact@meeraindustries.com', address: '45 Udyog Vihar, Gurgaon' },
    }),
    db.customer.create({
      data: { name: 'Rajesh Kumar', phone: '+91-9999999003', email: 'rajesh.kumar@example.com', address: '78 Sector 18, Noida' },
    }),
    db.customer.create({
      data: { name: 'Priya Sharma', phone: '+91-9999999004', email: 'priya.sharma@example.com', address: '23 MG Road, Delhi' },
    }),
  ])

  // 4. Seed 3 sample jobs
  console.log('Seeding jobs...')
  const jobs = await Promise.all([
    db.job.create({
      data: {
        title: 'Delivery #1001 - Delhi to Gurgaon',
        description: 'Package delivery from Delhi warehouse to Gurgaon office',
        status: 'pending',
        priority: 'high',
        type: 'delivery',
        pickup: 'Delhi Warehouse, Sector 4',
        dropoff: 'Gurgaon Office, Cyber City',
        address: 'Gurgaon Office, Cyber City',
        customerId: customers[1].id,
        customerName: customers[1].name,
        customerPhone: customers[1].phone,
      },
    }),
    db.job.create({
      data: {
        title: 'AC Repair',
        description: 'Split AC not cooling - needs gas refill and cleaning',
        status: 'in_progress',
        priority: 'medium',
        type: 'service',
        address: '78 Sector 18, Noida',
        customerId: customers[2].id,
        customerName: customers[2].name,
        customerPhone: customers[2].phone,
        assigneeId: drivers[2].id,
        assigneeName: drivers[2].name,
        assigneePhone: drivers[2].phone,
        resourceId: otherResources[2].id,
        actualStartTime: new Date(),
        assignmentStatus: 'accepted',
      },
    }),
    db.job.create({
      data: {
        title: 'TV Installation',
        description: '55-inch LED TV wall mounting with cable management',
        status: 'completed',
        priority: 'low',
        type: 'service',
        address: '23 MG Road, Delhi',
        customerId: customers[3].id,
        customerName: customers[3].name,
        customerPhone: customers[3].phone,
        assigneeId: drivers[0].id,
        assigneeName: drivers[0].name,
        assigneePhone: drivers[0].phone,
        resourceId: otherResources[2].id,
        actualStartTime: new Date(Date.now() - 86400000),
        actualEndTime: new Date(Date.now() - 43200000),
        assignmentStatus: 'accepted',
        notificationLogJson: JSON.stringify([
          { action: 'assigned', resourceId: otherResources[2].id, timestamp: new Date(Date.now() - 90000000).toISOString() },
          { action: 'accepted', timestamp: new Date(Date.now() - 87000000).toISOString() },
          { action: 'started', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { action: 'completed', timestamp: new Date(Date.now() - 43200000).toISOString() },
        ]),
      },
    }),
  ])

  // 5. Seed contact lists
  console.log('Seeding contact lists...')
  const contactLists = await Promise.all([
    db.contactList.create({
      data: {
        name: 'Drivers',
        description: 'All driver employees',
        type: 'role_based',
        roleFilter: 'driver',
        icon: 'truck',
        color: '#10B981',
        isDefault: true,
      },
    }),
    db.contactList.create({
      data: {
        name: 'All Employees',
        description: 'Complete list of all employees',
        type: 'all_employees',
        icon: 'users',
        color: '#6366F1',
        isDefault: true,
      },
    }),
    db.contactList.create({
      data: {
        name: 'Customers',
        description: 'All customer contacts',
        type: 'customers',
        icon: 'briefcase',
        color: '#F59E0B',
        isDefault: true,
      },
    }),
  ])

  // 6. Seed webhook source
  console.log('Seeding webhook sources...')
  await db.webhookSource.create({
    data: {
      name: 'Supabase Jobs',
      type: 'supabase',
      configJson: JSON.stringify({
        url: 'https://example.supabase.co',
        table: 'jobs',
        schema: 'public',
      }),
      status: 'active',
    },
  })

  console.log('✅ Seeding complete!')
  console.log(`  - ${drivers.length} drivers`)
  console.log(`  - ${otherResources.length} other resources`)
  console.log(`  - ${customers.length} customers`)
  console.log(`  - ${jobs.length} jobs`)
  console.log(`  - ${contactLists.length} contact lists`)
  console.log(`  - 1 webhook source`)
}

seedAll()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
