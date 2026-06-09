import { db } from '@/lib/db';

async function seedContactLists() {
  console.log('Seeding contact lists...');

  // Check if any contact lists already exist
  const existing = await db.contactList.count();
  if (existing > 0) {
    console.log(`Found ${existing} existing contact lists, skipping seed.`);
    return;
  }

  // Get distinct roles from employees
  const employees = await db.employee.findMany();
  const roles = [...new Set(employees.map((e) => e.role))];

  // Create role-based lists for each employee role
  for (const role of roles) {
    const roleEmployees = employees.filter((e) => e.role === role);
    const roleNames: Record<string, string> = { driver: 'Drivers', technician: 'Technicians', delivery: 'Delivery Agents' };
    const name = roleNames[role] || (role.charAt(0).toUpperCase() + role.slice(1) + 's');

    const list = await db.contactList.create({
      data: {
        name,
        description: `All employees with role: ${role}`,
        type: 'role_based',
        roleFilter: role,
        icon: role === 'driver' ? '🚗' : role === 'technician' ? '🔧' : '👤',
        color: role === 'driver' ? 'emerald' : role === 'technician' ? 'blue' : 'gray',
        isDefault: true,
      },
    });

    if (roleEmployees.length > 0) {
      await db.contactListEntry.createMany({
        data: roleEmployees.map((e) => ({
          contactListId: list.id,
          name: e.name,
          phone: e.phone,
          role: e.role,
          employeeId: e.id,
          whatsappId: e.whatsappId,
        })),
      });
    }

    console.log(`Created "${name}" list with ${roleEmployees.length} entries`);
  }

  // Create "All Employees" list
  const allEmpList = await db.contactList.create({
    data: {
      name: 'All Employees',
      description: 'All employees regardless of role',
      type: 'all_employees',
      icon: '👥',
      color: 'violet',
      isDefault: true,
    },
  });

  if (employees.length > 0) {
    await db.contactListEntry.createMany({
      data: employees.map((e) => ({
        contactListId: allEmpList.id,
        name: e.name,
        phone: e.phone,
        role: e.role,
        employeeId: e.id,
        whatsappId: e.whatsappId,
      })),
    });
  }

  console.log(`Created "All Employees" list with ${employees.length} entries`);

  // Create "Customers" list
  const customers = await db.customer.findMany();
  const custList = await db.contactList.create({
    data: {
      name: 'Customers',
      description: 'All customers',
      type: 'customers',
      icon: '🏢',
      color: 'orange',
      isDefault: true,
    },
  });

  if (customers.length > 0) {
    await db.contactListEntry.createMany({
      data: customers.map((c) => ({
        contactListId: custList.id,
        name: c.name,
        phone: c.phone,
        customerId: c.id,
        whatsappId: c.whatsappId,
      })),
    });
  }

  console.log(`Created "Customers" list with ${customers.length} entries`);
  console.log('Contact list seeding complete!');
}

seedContactLists()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
