import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

/**
 * Script: link-employee-users.ts
 *
 * Finds all Employee records with userId: null and creates User accounts
 * for them, then links the Employee record to the new User by setting userId.
 *
 * Generated emails follow the pattern: firstname.lastname@abcplumbing.com
 * Default password: Employee@123 (hashed with bcryptjs, 12 salt rounds)
 */

const ABC_PLUMBING_TENANT_ID = 'cmr0ubfio0007q63oyr55yc7s';
const ABC_PLUMBING_WORKSPACE_ID = 'cmr0ubfiq0009q63obmfhhrkm';
const DEFAULT_PASSWORD = 'Employee@123';

function generateEmail(name: string): string {
  const parts = name.toLowerCase().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}@abcplumbing.com`;
  }
  return `${parts[0]}@abcplumbing.com`;
}

async function main() {
  console.log('🔗 Linking Employee records to User accounts...\n');

  // Find all employees with userId: null
  const unlinkedEmployees = await db.employee.findMany({
    where: { userId: null },
    include: { workspace: { select: { tenantId: true } } },
  });

  if (unlinkedEmployees.length === 0) {
    console.log('  ✅ All employees already have User accounts. Nothing to do.\n');
    return;
  }

  console.log(`  Found ${unlinkedEmployees.length} employee(s) without User accounts:\n`);

  // Hash the default password once
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  console.log('  ✅ Password hashed successfully\n');

  for (const emp of unlinkedEmployees) {
    const email = emp.email || generateEmail(emp.name);
    const tenantId = emp.workspace?.tenantId || ABC_PLUMBING_TENANT_ID;
    const workspaceId = emp.workspaceId || ABC_PLUMBING_WORKSPACE_ID;

    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`  ⚠️  User already exists with email ${email} — linking to employee "${emp.name}"`);
      await db.employee.update({
        where: { id: emp.id },
        data: { userId: existingUser.id },
      });
      console.log(`  ✅ Linked employee "${emp.name}" → existing user ${existingUser.id}\n`);
      continue;
    }

    // Create the User account
    const user = await db.user.create({
      data: {
        email,
        name: emp.name,
        role: 'employee',
        passwordHash,
        phone: emp.phone || null,
        authProvider: 'email',
        isActive: true,
        tenantId,
        workspaceId,
      },
    });

    // Link the Employee record to the new User
    const updateData: { userId: string; email?: string; workspaceId?: string } = {
      userId: user.id,
    };

    // Also set the email on the Employee record if it was null
    if (!emp.email) {
      updateData.email = email;
    }

    // Also assign workspace if missing
    if (!emp.workspaceId) {
      updateData.workspaceId = workspaceId;
    }

    await db.employee.update({
      where: { id: emp.id },
      data: updateData,
    });

    console.log(`  ✅ Created user: ${email} (role: employee, tenantId: ${tenantId}, workspaceId: ${workspaceId})`);
    console.log(`     → Linked to employee: "${emp.name}" (${emp.id})\n`);
  }

  // Verification
  console.log('=== VERIFICATION ===\n');
  const allEmployees = await db.employee.findMany({
    include: { userAccount: { select: { id: true, email: true, role: true } } },
  });

  for (const emp of allEmployees) {
    const hasUser = emp.userId ? '✅' : '❌';
    const userEmail = emp.userAccount?.email ?? 'N/A';
    const userRole = emp.userAccount?.role ?? 'N/A';
    console.log(`  ${hasUser} ${emp.name} (role: ${emp.role}) — userId: ${emp.userId ?? 'NULL'} — user: ${userEmail} (${userRole})`);
  }

  console.log('\n🎉 Done! All employees should now have User accounts.');
  console.log('   Default password for new accounts: Employee@123\n');
}

main()
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
