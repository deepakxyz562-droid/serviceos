/**
 * Setup script: configure REAL WhatsApp + AWS SES credentials in the DB,
 * and create a test customer user for end-to-end flow testing.
 *
 * Task ID: SETUP-REAL-CREDS
 * Run: bun run scripts/setup-real-creds-and-user.ts
 */
import { directPrisma } from '../src/lib/direct-prisma';
import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function main() {
  console.log('=== 1. Update DB WhatsApp credential with new access token ===');
  const waCred = await directPrisma.credential.findFirst({
    where: { OR: [{ type: 'whatsapp' }, { name: { contains: 'hatsapp' } }] },
  });
  if (waCred) {
    const existing = (() => { try { return JSON.parse(waCred.encryptedData || '{}'); } catch { return {}; } })();
    const updated = await directPrisma.credential.update({
      where: { id: waCred.id },
      data: {
        name: 'ServiceOS WhatsApp (Meta Cloud API)',
        type: 'whatsapp',
        encryptedData: JSON.stringify({
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
          ...(existing.verifyToken ? { verifyToken: existing.verifyToken } : {}),
        }),
      },
    });
    console.log(`  ✓ Updated WhatsApp credential ${updated.id} (name: ${updated.name})`);
  } else {
    console.log('  ! No WhatsApp credential found in DB; relying on env vars');
  }

  console.log('\n=== 2. Update platform EmailProvider to use AWS SES SMTP ===');
  const NEW_CONFIG = JSON.stringify({
    smtpHost: 'email-smtp.us-east-1.amazonaws.com',
    smtpPort: '587',
    smtpSecure: 'false',
    smtpUser: 'AKIA2PPO3JNBZSEHPLQH',
    smtpPass: 'BOVpNDa2T6R/E8ziSzTd8KM/BB/vUwMt23mVm4XQJhDl',
  });
  const platformProvider = await directPrisma.emailProvider.findFirst({
    where: { isPlatform: true },
  });
  if (platformProvider) {
    const updated = await directPrisma.emailProvider.update({
      where: { id: platformProvider.id },
      data: {
        name: 'Platform Email (AWS SES)',
        providerType: 'smtp',
        fromEmail: 'deepakchandra076@gmail.com',
        fromName: 'ServiceOS',
        configJson: NEW_CONFIG,
        status: 'active',
      },
    });
    console.log(`  ✓ Updated platform EmailProvider ${updated.id} → ${updated.name} (${updated.providerType}) from ${updated.fromEmail}`);
  } else {
    console.log('  ! No platform EmailProvider found');
  }

  console.log('\n=== 3. Update legacy AWS SES credential (if any) with new SMTP creds ===');
  const sesCred = await directPrisma.credential.findFirst({
    where: { OR: [{ name: { contains: 'SES' } }, { name: { contains: 'ses' } }, { type: 'smtp' }, { type: 'email' }] },
  });
  if (sesCred) {
    const updated = await directPrisma.credential.update({
      where: { id: sesCred.id },
      data: {
        name: 'AWS SES SMTP (Production)',
        type: 'smtp',
        encryptedData: JSON.stringify({
          smtpHost: 'email-smtp.us-east-1.amazonaws.com',
          smtpPort: '587',
          smtpSecure: 'false',
          smtpUser: 'AKIA2PPO3JNBZSEHPLQH',
          smtpPass: 'BOVpNDa2T6R/E8ziSzTd8KM/BB/vUwMt23mVm4XQJhDl',
          fromEmail: 'deepakchandra076@gmail.com',
          fromName: 'ServiceOS',
        }),
      },
    });
    console.log(`  ✓ Updated legacy credential ${updated.id} → ${updated.name}`);
  } else {
    console.log('  ! No legacy SES credential found (OK — provider path will be used)');
  }

  console.log('\n=== 4. Create / update test customer user ===');
  // Find the AquaFix Plumbing tenant + workspace
  const tenant = await directPrisma.tenant.findFirst({
    where: { slug: 'aquafix-plumbing' },
  });
  if (!tenant) {
    console.log('  ! aquafix-plumbing tenant not found');
    return;
  }
  const workspace = await directPrisma.workspace.findFirst({
    where: { tenantId: tenant.id },
  });
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`  Workspace: ${workspace?.id || 'none'}`);

  // Create or update a Customer record with the test phone + email
  const phone = '918505945123';
  const email = 'deepakchandrayt@gmail.com';
  let customer = await directPrisma.customer.findFirst({
    where: { OR: [{ phone }, { phone: phone.slice(2) }, { email }] },
  });
  if (customer) {
    customer = await directPrisma.customer.update({
      where: { id: customer.id },
      data: {
        name: 'Deepak Test Customer',
        email,
        phone,
        ...(workspace ? { workspaceId: workspace.id } : {}),
      },
    });
    console.log(`  ✓ Updated existing customer ${customer.id} (${customer.name})`);
  } else {
    customer = await directPrisma.customer.create({
      data: {
        name: 'Deepak Test Customer',
        email,
        phone,
        source: 'manual',
        ...(workspace ? { workspaceId: workspace.id } : {}),
      },
    });
    console.log(`  ✓ Created customer ${customer.id} (${customer.name})`);
  }

  // Create a portal user account for the customer (so they can log in via the customer portal)
  const portalEmail = email;
  let portalUser = await directPrisma.user.findFirst({
    where: { OR: [{ email: portalEmail }, { phone }] },
  });
  const passwordHash = await hashPassword('Deepak@123');
  if (portalUser) {
    portalUser = await directPrisma.user.update({
      where: { id: portalUser.id },
      data: {
        name: 'Deepak Test Customer',
        email: portalEmail,
        phone,
        role: 'customer',
        passwordHash,
        tenantId: tenant.id,
        ...(workspace ? { workspaceId: workspace.id } : {}),
        isActive: true,
      },
    });
    console.log(`  ✓ Updated portal user ${portalUser.id} (email: ${portalUser.email})`);
  } else {
    portalUser = await directPrisma.user.create({
      data: {
        name: 'Deepak Test Customer',
        email: portalEmail,
        phone,
        role: 'customer',
        passwordHash,
        tenantId: tenant.id,
        ...(workspace ? { workspaceId: workspace.id } : {}),
        isActive: true,
      },
    });
    console.log(`  ✓ Created portal user ${portalUser.id} (email: ${portalUser.email})`);
  }

  console.log('\n=== 5. Summary ===');
  console.log('WhatsApp:   token + phoneId updated in DB credential + .env');
  console.log('Email:      AWS SES SMTP configured (host=email-smtp.us-east-1.amazonaws.com:587, from=deepakchandra076@gmail.com)');
  console.log('Test user:  deepakchandrayt@gmail.com / Deepak@123 (role: customer, phone: +918505945123)');
  console.log('Admin user: demo@flowforge.io / demo123 (role: owner)');
  console.log('\n✅ Setup complete. Restart the dev server to pick up .env changes.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { process.exit(0); });
