import { db } from '../lib/db';

async function seedResources() {
  console.log('Checking for existing resources...');

  const existingCount = await db.resource.count();

  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing resources. Skipping seed.`);
    return;
  }

  console.log('Seeding resources...');

  const resources = [
    { name: 'Ravi', phone: '+91 98765 43201', type: 'driver', location: 'Delhi', skills: ['driving', 'navigation', 'heavy-vehicle'] },
    { name: 'Mohan', phone: '+91 98765 43202', type: 'driver', location: 'Gurgaon', skills: ['driving', 'local-routes', 'delivery'] },
    { name: 'Suresh', phone: '+91 98765 43203', type: 'driver', location: 'Noida', skills: ['driving', 'highway', 'long-distance'] },
    { name: 'Deepak', phone: '+91 98765 43204', type: 'driver', location: 'Faridabad', skills: ['driving', 'tempo', 'local-delivery'] },
    { name: 'Ashok', phone: '+91 98765 43205', type: 'driver', location: 'Ghaziabad', skills: ['driving', 'truck', 'interstate'] },
    { name: 'Priya', phone: '+91 98765 43206', type: 'beautician', location: 'Delhi', skills: ['bridal-makeup', 'hair-styling', 'facial'] },
    { name: 'Dr. Kumar', phone: '+91 98765 43207', type: 'doctor', location: 'Delhi', skills: ['general-medicine', 'home-visit', 'consultation'] },
    { name: 'Ajay', phone: '+91 98765 43208', type: 'technician', location: 'Gurgaon', skills: ['ac-repair', 'electrical', 'plumbing'] },
    { name: 'Sunita', phone: '+91 98765 43209', type: 'cleaner', location: 'Noida', skills: ['deep-cleaning', 'office-cleaning', 'sanitization'] },
    { name: 'Vikram', phone: '+91 98765 43210', type: 'packer', location: 'Delhi', skills: ['packing', 'unpacking', 'fragile-items', 'labeling'] },
  ];

  for (const r of resources) {
    await db.resource.create({
      data: {
        name: r.name,
        phone: r.phone,
        type: r.type,
        status: 'available',
        skills: JSON.stringify(r.skills),
        location: r.location,
        rating: 4.0 + Math.random() * 1.0,
        completedJobs: Math.floor(Math.random() * 50) + 5,
      },
    });
    console.log(`  Created resource: ${r.name} (${r.type}, ${r.location})`);
  }

  console.log(`\nSeeded ${resources.length} resources successfully!`);

  // Also seed a sample webhook source
  console.log('\nSeeding webhook source...');
  const existingSources = await db.webhookSource.count();

  if (existingSources > 0) {
    console.log(`Found ${existingSources} existing webhook sources. Skipping.`);
  } else {
    await db.webhookSource.create({
      data: {
        name: 'Supabase Jobs',
        type: 'supabase',
        configJson: JSON.stringify({
          url: 'https://your-project.supabase.co',
          table: 'jobs',
          realtime: true,
        }),
        status: 'active',
      },
    });
    console.log('  Created webhook source: Supabase Jobs');
  }
}

seedResources()
  .then(async () => {
    await db.$disconnect();
    console.log('\nDone!');
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await db.$disconnect();
    process.exit(1);
  });
