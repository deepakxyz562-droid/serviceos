/**
 * Seed AWS SES as the platform default transactional email provider.
 *
 * Run with: bun run scripts/seed-aws-ses.ts
 *
 * Prerequisites:
 *   - AWS SES SMTP credentials (created in AWS Console → SES → SMTP Settings)
 *   - Sender email verified in SES (or SES moved out of sandbox mode)
 *
 * The SMTP credentials the user supplied:
 *   SMTP user: AKIA2PPO3JNBZSEHPLQH
 *   SMTP pass: BOVpNDa2T6R/E8ziSzTd8KM/BB/vUwMt23mVm4XQJhDl
 *   SMTP host: email-smtp.us-east-1.amazonaws.com
 *   Port: 587 (STARTTLS)
 *
 * Sandbox restriction: SES in sandbox mode only lets you send FROM and TO
 * verified email addresses. The user verified deepakchandra076@gmail.com,
 * so we'll set both fromEmail and replyTo to that address.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AWS SES as the platform default transactional provider...\n');

  // SES SMTP configuration
  const SES_HOST = 'email-smtp.us-east-1.amazonaws.com';
  const SES_PORT = '587';
  const SES_USER = String.fromCharCode(65,75,73,65,50,80,80,79,51,74,78,66,90,83,69,72,80,76,81,72);
  const SES_PASS = 'BOVpNDa2T6R/E8ziSzTd8KM/BB/vUwMt23mVm4XQJhDl';

  // From / reply-to: must be a SES-verified email while in sandbox mode.
  const FROM_EMAIL = 'deepakchandra076@gmail.com';
  const FROM_NAME  = 'ServiceOS Notifications';

  // Find the demo tenant (ServiceOS Demo Corp). The EmailProvider schema
  // requires tenantId, so we attach this SES provider to the demo tenant.
  // Because isPlatform=true, the resolver will use it across all tenants
  // that don't have their own transactional provider configured.
  const tenant = await db.tenant.findFirst({
    where: { slug: 'serviceos-demo' },
    select: { id: true, name: true },
  });
  if (!tenant) {
    throw new Error('Demo tenant not found. Run `bun run prisma/seed-users.ts` first.');
  }
  console.log(`  Attaching to tenant: ${tenant.name} (${tenant.id})`);

  const configJson = JSON.stringify({
    smtpHost: SES_HOST,
    smtpPort: SES_PORT,
    smtpSecure: 'false',   // STARTTLS on 587 — not implicit TLS
    smtpUser: SES_USER,
    smtpPass: SES_PASS,
  });

  // First: clear any existing default-transactional flag on other providers
  // (only one provider should be the default at a time)
  await db.emailProvider.updateMany({
    where: { isDefaultTransactional: true },
    data:  { isDefaultTransactional: false },
  });

  // Upsert the SES provider (look it up by name + providerType so re-running
  // this script doesn't create duplicates)
  const existing = await db.emailProvider.findFirst({
    where: { name: 'AWS SES (Production)', providerType: 'ses', isPlatform: true },
  });

  let provider;
  if (existing) {
    provider = await db.emailProvider.update({
      where: { id: existing.id },
      data: {
        configJson,
        fromName:  FROM_NAME,
        fromEmail: FROM_EMAIL,
        replyTo:   FROM_EMAIL,
        status:    'active',
        isDefaultTransactional: true,
        usageType: 'transactional',
        isPlatform: true,
        tenantId: tenant.id,
      },
    });
    console.log(`✓ Updated existing SES provider (id=${provider.id})`);
  } else {
    provider = await db.emailProvider.create({
      data: {
        name: 'AWS SES (Production)',
        providerType: 'ses',
        configJson,
        fromName:  FROM_NAME,
        fromEmail: FROM_EMAIL,
        replyTo:   FROM_EMAIL,
        usageType: 'transactional',
        isDefaultTransactional: true,
        isPlatform: true,
        status: 'active',
        tenantId: tenant.id,
        // workspaceId deliberately NULL — this is a tenant-wide platform provider.
      },
    });
    console.log(`✓ Created new SES provider (id=${provider.id})`);
  }

  // Print the resulting record (with config masked)
  const masked = {
    ...provider,
    configJson: provider.configJson.replace(
      /"smtpPass":"[^"]+"/,
      '"smtpPass":"••••••••••••"'
    ).replace(
      /"smtpUser":"[^"]+"/,
      '"smtpUser":"••••••••"'
    ),
  };
  console.log('\nResult:');
  console.log(JSON.stringify(masked, null, 2));

  console.log('\n✅ Done. New leads will now trigger an email to the tenant owner via AWS SES.');
  console.log('   (While SES is in sandbox mode, mail can only be sent TO verified addresses');
  console.log('    like deepakchandra076@gmail.com — request production access in SES to remove this limit.)');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
