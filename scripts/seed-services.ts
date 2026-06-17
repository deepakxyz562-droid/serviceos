/**
 * Seed demo services for customer-facing tenants so the "New Booking"
 * dialog has real options to pick from.
 *
 * Usage:  bun run scripts/seed-services.ts
 */
import { db } from '../src/lib/db';

interface ServiceSeed {
  name: string;
  description: string;
  category: string;
  basePrice: number;
  duration: number; // minutes
  icon: string;
}

const AQUAFIX_SERVICES: ServiceSeed[] = [
  { name: 'AC Maintenance', description: 'Comprehensive AC cleaning, gas refill, and performance check.', category: 'hvac', basePrice: 1499, duration: 90, icon: 'wind' },
  { name: 'AC Repair', description: 'Diagnosis and repair of AC cooling, electrical, or noise issues.', category: 'hvac', basePrice: 799, duration: 60, icon: 'wrench' },
  { name: 'Plumbing Repair', description: 'Leakage, faucet, tap, and pipe repair for kitchen & bathroom.', category: 'plumbing', basePrice: 499, duration: 60, icon: 'droplet' },
  { name: 'Water Heater Service', description: 'Geyser installation, descaling, and element replacement.', category: 'plumbing', basePrice: 699, duration: 75, icon: 'flame' },
  { name: 'Electrical Inspection', description: 'Full home electrical safety inspection and compliance report.', category: 'electrical', basePrice: 599, duration: 60, icon: 'zap' },
  { name: 'Deep Cleaning', description: 'Deep cleaning for 2BHK/3BHK including kitchen, bathrooms, and balconies.', category: 'cleaning', basePrice: 2499, duration: 240, icon: 'sparkles' },
  { name: 'Painting Touch-up', description: 'Wall touch-up painting for scratches, marks, and small patches.', category: 'painting', basePrice: 899, duration: 120, icon: 'paintbrush' },
  { name: 'Appliance Installation', description: 'Installation of washing machine, chimney, microwave, or dishwasher.', category: 'appliance', basePrice: 549, duration: 60, icon: 'package' },
];

const SPARKLECLEAN_SERVICES: ServiceSeed[] = [
  { name: 'Home Deep Cleaning', description: 'Full home deep cleaning with eco-friendly products.', category: 'cleaning', basePrice: 2999, duration: 300, icon: 'sparkles' },
  { name: 'Sofa & Carpet Cleaning', description: 'Shampooing and deep clean for sofas, couches, and carpets.', category: 'cleaning', basePrice: 1199, duration: 120, icon: 'sparkles' },
  { name: 'Move-in / Move-out Cleaning', description: 'End-of-tenancy deep clean for handover.', category: 'cleaning', basePrice: 3999, duration: 360, icon: 'sparkles' },
  { name: 'Office Cleaning', description: 'Daily or one-time office cleaning services.', category: 'cleaning', basePrice: 1999, duration: 180, icon: 'sparkles' },
];

const SERVICEOS_DEMO_SERVICES: ServiceSeed[] = [
  { name: 'General Consultation', description: 'Initial consultation with our service experts.', category: 'consultation', basePrice: 0, duration: 30, icon: 'message-circle' },
  { name: 'Premium Support Visit', description: 'On-site visit from a senior technician.', category: 'support', basePrice: 1299, duration: 90, icon: 'wrench' },
  { name: 'Annual Maintenance Contract', description: 'Year-round maintenance coverage for your equipment.', category: 'amc', basePrice: 9999, duration: 60, icon: 'shield' },
];

async function seedTenant(slug: string, services: ServiceSeed[]) {
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.log(`  ⚠️  Tenant "${slug}" not found, skipping.`);
    return;
  }

  const existing = await db.service.count({ where: { tenantId: tenant.id } });
  if (existing > 0) {
    console.log(`  ✓  Tenant "${slug}" already has ${existing} services, skipping.`);
    return;
  }

  for (const s of services) {
    await db.service.create({
      data: {
        name: s.name,
        description: s.description,
        category: s.category,
        basePrice: s.basePrice,
        duration: s.duration,
        icon: s.icon,
        isActive: true,
        tenantId: tenant.id,
      },
    });
  }
  console.log(`  ✓  Seeded ${services.length} services for "${slug}".`);
}

async function main() {
  console.log('Seeding demo services...');
  await seedTenant('aquafix-plumbing', AQUAFIX_SERVICES);
  await seedTenant('sparkleclean-services', SPARKLECLEAN_SERVICES);
  await seedTenant('serviceos-demo', SERVICEOS_DEMO_SERVICES);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
