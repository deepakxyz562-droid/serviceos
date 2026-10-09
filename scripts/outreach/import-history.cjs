#!/usr/bin/env node
// Dry-run by default. Run with --apply only as part of deployment preparation.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
loadEnvConfig(process.cwd());
const input = process.argv.find(arg => arg.startsWith('--file='))?.slice(7) || path.join(process.cwd(), 'outreach_sent_history.json');
const apply = process.argv.includes('--apply');
async function main() {
  const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('History must be a JSON array.');
  const unique = new Map();
  for (const row of raw) {
    const email = String(row.email || '').trim().toLowerCase();
    const sentAt = new Date(row.sentAt);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || !Number.isFinite(sentAt.getTime())) throw new Error('History contains an invalid address or timestamp; nothing imported.');
    if (!unique.has(email)) unique.set(email, { ...row, email, sentAt });
  }
  console.log(`${raw.length} history entries; ${unique.size} unique previously contacted addresses.`);
  if (!apply) { console.log('Dry run: no database connection or changes. Use --apply after reviewing the file.'); return; }
  const db = new PrismaClient();
  try {
    let matched = 0;
    await db.$transaction(async tx => {
      await tx.outreachAutomation.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
      await tx.$queryRaw`SELECT id FROM "OutreachAutomation" WHERE id='default' FOR UPDATE`;
      const state = await tx.outreachAutomation.findUniqueOrThrow({ where: { id: 'default' } });
      if (state.enabled || (state.leaseUntil && state.leaseUntil > new Date())) throw new Error('Pause outreach and wait for its current send before importing.');
      for (const row of unique.values()) {
        const suppression = await tx.emailSuppression.findFirst({ where: { email: row.email, tenantId: null } });
        if (!suppression) await tx.emailSuppression.create({ data: { email: row.email, reason: 'manual', source: 'legacy_sent_history', metadataJson: JSON.stringify({ sentAt: row.sentAt }) } });
        else if (suppression.resolvedAt) await tx.emailSuppression.update({ where: { id: suppression.id }, data: { resolvedAt: null, source: 'legacy_sent_history' } });
        const tenant = await tx.tenant.findFirst({ where: { email: { equals: row.email, mode: 'insensitive' } }, select: { id: true, name: true } });
        if (!tenant) continue; // Suppression still protects unmatched addresses.
        matched++;
        const existing = await tx.emailCommunication.findFirst({ where: { category: 'outreach', recipientEmail: row.email, sentAt: { not: null } } });
        if (!existing) await tx.emailCommunication.create({ data: {
          id: 'legacy-outreach-' + createHash('sha256').update(row.email).digest('hex').slice(0, 32),
          tenantId: tenant.id, recipientEmail: row.email, recipientName: tenant.name,
          subject: String(row.subject || 'Previously sent outreach'),
          htmlBody: '', textBody: 'Imported sent history. The original message body was not recorded.',
          category: 'outreach', status: 'sent', sentAt: row.sentAt, sentByUserId: 'legacy-history-import',
        } });
      }
    }, { timeout: 120000 });
    console.log(`Imported safely: ${unique.size} addresses excluded; ${matched} matched marketplace companies. No emails sent.`);
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
