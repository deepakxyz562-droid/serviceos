/**
 * Seed AWS SES as the platform default transactional email provider.
 *
 * Run with: bun run scripts/seed-aws-ses.ts
 *
 * Prerequisites:
 *   - AWS SES SMTP credentials (created in AWS Console → SES → SMTP Settings)
 *   - Sender email verified in SES (or SES moved out of sandbox mode)
 *
 * Current SES configuration (ap-south-1):
 *   IAM user: ses-smtp-user.20260630-122722
 *   SMTP user: (read from SMTP_USER env var)
 *   SMTP pass: BInFKprST5upb+sYW5/U4dPAW7n3BZirdZL2FXFWNdPE
 *   SMTP host: email-smtp.ap-south-1.amazonaws.com
 *   Port: 587 (STARTTLS)
 *   Verified senders: sales@serviceos.cc, support@serviceos.cc
 *
 * NOTE: If the SES SMTP credentials change, update the constants below
 * and re-run this script. It will upsert the provider record.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AWS SES as the platform default transactional provider...\n');

  // SES SMTP configuration — UPDATE THESE WHEN CREDENTIALS CHANGE
  const SES_HOST = 'email-smtp.ap-south-1.amazonaws.com';
  const SES_PORT = '587';
  const SES_USER = process.env.SMTP_USER || 'AKIA2PPO3JNBYFJO4G5O';
  const SES_PASS = process.env.SMTP_PASS || 'BInFKprST5upb+sYW5/U4dPAW7n3BZirdZL2FXFWNdPE';
  const SES_REGION = 'ap-south-1';

  // From / reply-to: verified email addresses in SES
  const FROM_EMAIL = 'sales@serviceos.cc';
  const FROM_NAME  = 'ServiceOS';

  // Find any tenant. The EmailProvider schema requires tenantId, so we
  // attach this SES provider to the first tenant we find.
  // Because isPlatform=true, the resolver will use it across all tenants
  // that don't have their own transactional provider configured.
  let tenant = await db.tenant.findFirst({
    where: { slug: 'serviceos-demo' },
    select: { id: true, name: true },
  });
  if (!tenant) {
    tenant = await db.tenant.findFirst({ select: { id: true, name: true } });
  }
  if (!tenant) {
    throw new Error('No tenant found. Run `bun run prisma/seed-users.ts` first.');
  }
  console.log(`  Attaching to tenant: ${tenant.name} (${tenant.id})`);

  const configJson = JSON.stringify({
    smtpHost: SES_HOST,
    smtpPort: SES_PORT,
    smtpSecure: 'false',   // STARTTLS on 587 — not implicit TLS
    smtpUser: SES_USER,
    smtpPass: SES_PASS,
    region: SES_REGION,
  });

  // First: clear any existing default-transactional flag on other providers
  // (only one provider should be the default at a time)
  await db.emailProvider.updateMany({
    where: { isDefaultTransactional: true },
    data:  { isDefaultTransactional: false },
  });

  // Upsert the SES provider — look for ANY existing SES platform provider
  const existing = await db.emailProvider.findFirst({
    where: { providerType: 'ses', isPlatform: true },
  });

  let provider;
  if (existing) {
    provider = await db.emailProvider.update({
      where: { id: existing.id },
      data: {
        name: 'AWS SES - ServiceOS',
        configJson,
        fromName:  FROM_NAME,
        fromEmail: FROM_EMAIL,
        replyTo:   FROM_EMAIL,
        status:    'active',
        isDefaultTransactional: true,
        isDefaultMarketing: true,
        usageType: 'both',
        isPlatform: true,
        tenantId: tenant.id,
      },
    });
    console.log(`✓ Updated existing SES provider (id=${provider.id})`);
  } else {
    provider = await db.emailProvider.create({
      data: {
        name: 'AWS SES - ServiceOS',
        providerType: 'ses',
        configJson,
        fromName:  FROM_NAME,
        fromEmail: FROM_EMAIL,
        replyTo:   FROM_EMAIL,
        usageType: 'both',
        isDefaultTransactional: true,
        isDefaultMarketing: true,
        isPlatform: true,
        status: 'active',
        tenantId: tenant.id,
      },
    });
    console.log(`✓ Created new SES provider (id=${provider.id})`);
  }

  console.log('\n✅ Done. Provider details:');
  console.log(`   name       : ${provider.name}`);
  console.log(`   fromEmail  : ${provider.fromEmail}`);
  console.log(`   smtpHost   : ${SES_HOST}`);
  console.log(`   region     : ${SES_REGION}`);
  console.log(`   isPlatform : ${provider.isPlatform}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
