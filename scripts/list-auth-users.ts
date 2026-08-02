import { db } from '../src/lib/db';

async function main() {
  // Find users with passwordHash set (so login can work)
  const users = await db.user.findMany({
    where: { passwordHash: { not: null } },
    select: { id: true, email: true, name: true, role: true, tenantId: true, isActive: true },
    take: 10,
  });
  console.log(`\n=== USERS (with password) ===`);
  for (const u of users) {
    console.log(`  ${u.email}  role=${u.role}  tenantId=${u.tenantId}  isActive=${u.isActive}`);
  }

  // Find customers with portalEnabled + passwordHash + activatedAt
  const customers = await db.customer.findMany({
    where: { passwordHash: { not: null }, activatedAt: { not: null }, portalEnabled: true },
    select: { id: true, email: true, name: true, phone: true, workspaceId: true, workspace: { select: { tenantId: true, tenant: { select: { name: true, slug: true } } } } },
    take: 10,
  });
  console.log(`\n=== ACTIVATED CUSTOMERS (portal enabled) ===`);
  for (const c of customers) {
    console.log(`  ${c.email ?? c.phone}  name="${c.name}"  tenantSlug="${c.workspace?.tenant?.slug ?? 'null'}"  tenantName="${c.workspace?.tenant?.name ?? 'null'}"`);
  }

  // Find invitations
  const invitations = await db.invitation.findMany({
    where: { status: 'pending' },
    select: { id: true, token: true, email: true, role: true, status: true, expiresAt: true },
    take: 5,
  });
  console.log(`\n=== PENDING INVITATIONS ===`);
  for (const i of invitations) {
    console.log(`  token=${i.token.substring(0, 16)}...  email=${i.email}  role=${i.role}  expiresAt=${i.expiresAt.toISOString()}`);
  }

  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
