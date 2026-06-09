import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

// Employee data matching current database records
const employees = [
  { name: 'Ramesh Kumar', phone: '+919876543210', email: 'ramesh@serviceos.com', workspaceId: 'cmpzp0zrg0002q772ni26e8tr' },
  { name: 'Vikram Reddy', phone: '+919876543214', email: 'vikram@serviceos.com', workspaceId: 'cmpzp0zrn0009q7724vrhr82n' },
  { name: 'Priya Singh', phone: '+919876543213', email: 'priya@serviceos.com', workspaceId: 'cmpzp0zrn0009q7724vrhr82n' },
  { name: 'Suresh Patel', phone: '+919876543211', email: 'suresh@serviceos.com', workspaceId: 'cmpzp0zrg0002q772ni26e8tr' },
  { name: 'Amit Sharma', phone: '+919876543212', email: 'amit@serviceos.com', workspaceId: 'cmpzp0zrg0002q772ni26e8tr' },
  { name: 'Carlos Mendez', phone: '+19175559801', email: 'carlos@serviceos.com', workspaceId: null }, // will be assigned
  { name: 'Maria Santos', phone: '+19175559802', email: 'maria@serviceos.com', workspaceId: null }, // will be assigned
  { name: 'John Baker', phone: '+19175559803', email: 'john@serviceos.com', workspaceId: null },    // will be assigned
];

// Fallback for employees without workspace
const DEFAULT_TENANT_ID = 'cmpzp0zrf0000q772k2awqonn';
const DEFAULT_WORKSPACE_ID = 'cmpzp0zrg0002q772ni26e8tr';

async function main() {
  console.log('🔐 Creating User accounts for employees...\n');

  // Hash the default password
  const passwordHash = await bcrypt.hash('Employee@123', 12);
  console.log('  ✅ Password hashed successfully\n');

  // Build workspace-to-tenant mapping from database
  const workspaces = await db.workspace.findMany({
    select: { id: true, tenantId: true, name: true },
  });
  const workspaceTenantMap = new Map<string, string | null>();
  for (const ws of workspaces) {
    workspaceTenantMap.set(ws.id, ws.tenantId);
    console.log(`  📋 Workspace: ${ws.name} (${ws.id}) → tenantId: ${ws.tenantId}`);
  }
  console.log('');

  // Process each employee
  for (const emp of employees) {
    // Find the employee in the database by name and phone
    const employee = await db.employee.findFirst({
      where: { name: emp.name, phone: emp.phone },
    });

    if (!employee) {
      console.log(`  ⚠️  Employee not found: ${emp.name} (${emp.phone}) — skipping`);
      continue;
    }

    // Determine workspace and tenant
    const workspaceId = emp.workspaceId ?? DEFAULT_WORKSPACE_ID;
    const tenantId = workspaceTenantMap.get(workspaceId) ?? DEFAULT_TENANT_ID;

    // Check if user already exists with this email
    const existingUser = await db.user.findUnique({
      where: { email: emp.email },
    });

    if (existingUser) {
      console.log(`  ⚠️  User already exists: ${emp.email} — linking to employee`);
      await db.employee.update({
        where: { id: employee.id },
        data: { userId: existingUser.id },
      });
      continue;
    }

    // Create the User account
    const user = await db.user.create({
      data: {
        email: emp.email,
        name: emp.name,
        role: 'employee',
        passwordHash,
        phone: emp.phone,
        authProvider: 'email',
        isActive: true,
        tenantId,
        workspaceId,
      },
    });

    // Update the Employee record to link to the User
    const updateData: { userId: string; workspaceId?: string } = { userId: user.id };

    // If employee had no workspace, also assign them to the default workspace
    if (!employee.workspaceId) {
      updateData.workspaceId = workspaceId;
    }

    await db.employee.update({
      where: { id: employee.id },
      data: updateData,
    });

    console.log(`  ✅ Created user: ${emp.email} (tenantId: ${tenantId}, workspaceId: ${workspaceId}) → linked to employee: ${emp.name}`);
  }

  console.log('\n🎉 Done! All employees should now have User accounts.\n');

  // Verification: print summary
  const allEmployees = await db.employee.findMany({
    include: { userAccount: true },
  });

  console.log('=== VERIFICATION ===');
  for (const emp of allEmployees) {
    const hasUser = emp.userId ? '✅' : '❌';
    const userEmail = emp.userAccount?.email ?? 'N/A';
    console.log(`  ${hasUser} ${emp.name} — userId: ${emp.userId ?? 'NULL'} — user email: ${userEmail}`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
