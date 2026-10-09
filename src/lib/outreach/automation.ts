import { randomBytes, randomInt, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { locked, outreachDb, type OutreachTx } from './db';
import { DAY_MS, LEASE_MS, delaySeconds, escapeHtml, healthPause, normalizeEmail, validEmail } from './policy';
import { generateOutreachCopy } from './copy';
import { loadSesProvider, outreachBaseUrl, sendSesOutreach } from './ses';

export interface ProspectRow { id: string; name: string; email: string; industry: string | null; city: string | null }
export function eligibleSql(search = '', industry = '') {
  return Prisma.sql`
    t."email" IS NOT NULL AND trim(t."email") <> '' AND t."outreachDisabled" = false
    AND (${search} = '' OR t."name" ILIKE ${`%${search}%`} OR t."email" ILIKE ${`%${search}%`})
    AND (${industry} = '' OR t."industry" ILIKE ${`%${industry}%`})
    AND NOT EXISTS (SELECT 1 FROM "OutreachQueue" q WHERE q."tenantId" = t.id OR q.email = lower(trim(t.email)))
    AND NOT EXISTS (SELECT 1 FROM "EmailCommunication" e WHERE e.category = 'outreach'
      AND (e."tenantId" = t.id OR lower(trim(e."recipientEmail")) = lower(trim(t.email)))
      AND (e."sentAt" IS NOT NULL OR e.status IN ('queued','sending','unknown','sent','delivered','bounced','complained')))
    AND NOT EXISTS (SELECT 1 FROM "EmailSuppression" s WHERE lower(trim(s.email)) = lower(trim(t.email)) AND s."resolvedAt" IS NULL)
  `;
}
export async function listProspects(search: string, industry: string, page: number) {
  const where = eligibleSql(search, industry);
  const [items, counts] = await Promise.all([
    outreachDb.$queryRaw<ProspectRow[]>(Prisma.sql`SELECT t.id,t.name,t.email,t.industry,t.city FROM "Tenant" t WHERE ${where} ORDER BY t.id LIMIT 50 OFFSET ${(page - 1) * 50}`),
    outreachDb.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT count(*) FROM "Tenant" t WHERE ${where}`),
  ]);
  return { items, total: Number(counts[0].count) };
}
export async function quotaUsed(tx: OutreachTx, now: Date) {
  // sentAt survives delivered/bounced/complained transitions. In-flight and
  // ambiguous attempts also reserve capacity, across ALL outreach entry points.
  return tx.emailCommunication.count({ where: { category: 'outreach', OR: [
    { sentAt: { gt: new Date(now.getTime() - DAY_MS) } },
    { status: { in: ['sending', 'unknown'] }, createdAt: { gt: new Date(now.getTime() - DAY_MS) } },
  ] } });
}
async function blockReason(tx: OutreachTx, tenantId: string, email: string, ownCommunicationId?: string | null) {
  const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { outreachDisabled: true, email: true } });
  if (!tenant || tenant.outreachDisabled) return 'Company opted out or no longer exists.';
  if (!validEmail(email)) return 'Invalid email address.';
  // Re-check stored contact immediately before send; changed addresses need review.
  if (normalizeEmail(tenant.email || '') !== email) return 'Company email changed; review this contact.';
  if (await tx.emailSuppression.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, resolvedAt: null } })) return 'Email is suppressed.';
  if (await tx.emailCommunication.findFirst({ where: {
    category: 'outreach', ...(ownCommunicationId ? { id: { not: ownCommunicationId } } : {}),
    AND: [ { OR: [{ tenantId }, { recipientEmail: { equals: email, mode: 'insensitive' } }] },
      { OR: [{ sentAt: { not: null } }, { status: { in: ['queued', 'sending', 'unknown', 'sent', 'delivered', 'bounced', 'complained'] } }] } ],
  } })) return 'Company or email already contacted or reserved.';
  return null;
}
export async function enqueueProspects(tenantIds: string[], userId: string, draft?: { subject: string; body: string }) {
  return locked(async tx => {
    const result: { tenantId: string; status: string; reason?: string }[] = [];
    for (const tenantId of [...new Set(tenantIds)]) {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, email: true, industry: true, city: true } });
      const email = normalizeEmail(tenant?.email || '');
      const reason = await blockReason(tx, tenantId, email);
      const existing = await tx.outreachQueue.findFirst({ where: { OR: [{ tenantId }, { email }] } });
      if (!tenant || reason || existing) { result.push({ tenantId, status: 'skipped', reason: reason || 'Already queued or contacted.' }); continue; }
      await tx.outreachQueue.create({ data: {
        tenantId, email, companyName: tenant.name, industry: tenant.industry, city: tenant.city,
        createdBy: userId, unsubscribeToken: randomBytes(32).toString('hex'),
        ...(draft ? { subject: draft.subject, body: draft.body, copySource: 'edited' } : {}),
      } });
      result.push({ tenantId, status: 'queued' });
    }
    return result;
  });
}

export async function runOutreachTick() {
  const now = new Date();
  const claim = await locked(async tx => {
    const state = await tx.outreachAutomation.findUniqueOrThrow({ where: { id: 'default' } });
    await tx.outreachAutomation.update({ where: { id: 'default' }, data: { lastRunAt: now } });
    if (state.leaseUntil && state.leaseUntil > now) return { skipped: 'Worker is active.' } as const;
    // A process could die after SMTP accepted the email. Never re-send it.
    const uncertain = await tx.outreachQueue.findFirst({ where: { status: 'sending' } });
    if (uncertain) {
      await tx.outreachQueue.update({ where: { id: uncertain.id }, data: { status: 'unknown', error: 'Worker interrupted during send. Reconcile SES events; no automatic retry.' } });
      if (uncertain.communicationId) await tx.emailCommunication.updateMany({ where: { id: uncertain.communicationId, status: 'sending' }, data: { status: 'unknown' } });
      await tx.outreachAutomation.update({ where: { id: 'default' }, data: { enabled: false, leaseToken: null, leaseUntil: null, pauseReason: 'A send has an uncertain outcome. Review SES events before resuming.' } });
      return { skipped: 'Uncertain send; paused.' } as const;
    }
    await tx.outreachQueue.updateMany({ where: { status: 'preparing' }, data: { status: 'queued' } });
    if (!state.enabled || state.nextSendAt > now) return { skipped: state.enabled ? 'Not due.' : 'Paused.' } as const;
    const used = await quotaUsed(tx, now);
    if (used >= state.dailyLimit) return { skipped: 'Rolling 24-hour limit reached.' } as const;
    const since = new Date(now.getTime() - DAY_MS);
    const [sent, bounced, complained] = await Promise.all([
      tx.emailCommunication.count({ where: { category: 'outreach', sentAt: { gt: since } } }),
      tx.emailCommunication.count({ where: { category: 'outreach', bouncedAt: { gt: since } } }),
      tx.emailCommunication.count({ where: { category: 'outreach', complainedAt: { gt: since } } }),
    ]);
    const health = healthPause(sent, bounced, complained);
    if (health) {
      await tx.outreachAutomation.update({ where: { id: 'default' }, data: { enabled: false, pauseReason: health } });
      return { skipped: health } as const;
    }
    let item = await tx.outreachQueue.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
    if (!item) {
      const candidates = await tx.$queryRaw<ProspectRow[]>(Prisma.sql`SELECT t.id,t.name,t.email,t.industry,t.city FROM "Tenant" t WHERE ${eligibleSql('', state.industry)} ORDER BY t.id LIMIT 20`);
      for (const t of candidates) {
        const email = normalizeEmail(t.email);
        await tx.outreachQueue.createMany({ data: [{ tenantId: t.id, email, companyName: t.name, industry: t.industry, city: t.city,
          createdBy: state.startedBy, unsubscribeToken: randomBytes(32).toString('hex'),
          status: validEmail(email) ? 'queued' : 'excluded', error: validEmail(email) ? null : 'Invalid email address.',
        }], skipDuplicates: true });
      }
      item = await tx.outreachQueue.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } });
    }
    if (!item) return { skipped: 'No eligible contacts.' } as const;
    const blocked = await blockReason(tx, item.tenantId, item.email);
    if (blocked) {
      await tx.outreachQueue.update({ where: { id: item.id }, data: { status: 'excluded', error: blocked } });
      return { skipped: blocked } as const;
    }
    const token = randomUUID();
    await tx.outreachAutomation.update({ where: { id: 'default' }, data: { leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS) } });
    await tx.outreachQueue.update({ where: { id: item.id }, data: { status: 'preparing' } });
    return { item, state, token } as const;
  });
  if ('skipped' in claim) return claim;
  const { item, state, token } = claim;
  let attempted = false;
  try {
    await loadSesProvider(state.providerId);
    outreachBaseUrl();
    if (!state.configurationSet || !state.postalAddress.trim()) throw new Error('Set SES configuration set and sender postal address.');
    const copy = item.subject && item.body ? { subject: item.subject, body: item.body, source: item.copySource || 'edited' }
      : await generateOutreachCopy({ companyName: item.companyName, industry: item.industry, city: item.city, pitch: state.pitch });
    const ready = await locked(async tx => {
      const current = await tx.outreachAutomation.findUniqueOrThrow({ where: { id: 'default' } });
      if (current.leaseToken !== token) return false;
      const blocked = await blockReason(tx, item.tenantId, item.email);
      const queue = await tx.outreachQueue.findUniqueOrThrow({ where: { id: item.id } });
      if (!current.enabled || blocked || queue.status !== 'preparing' || await quotaUsed(tx, new Date()) >= current.dailyLimit) {
        await tx.outreachQueue.updateMany({ where: { id: item.id, status: 'preparing' }, data: { status: blocked ? 'excluded' : 'queued', error: blocked } });
        await tx.outreachAutomation.update({ where: { id: 'default' }, data: { leaseToken: null, leaseUntil: null } });
        return false;
      }
      const communication = await tx.emailCommunication.create({ data: {
        tenantId: item.tenantId, recipientEmail: item.email, recipientName: item.companyName,
        subject: copy.subject, htmlBody: escapeHtml(copy.body), textBody: copy.body,
        category: 'outreach', status: 'sending', sentByUserId: item.createdBy,
      } });
      await tx.outreachQueue.update({ where: { id: item.id }, data: {
        subject: copy.subject, body: copy.body, copySource: copy.source, status: 'sending', attemptedAt: new Date(), communicationId: communication.id,
      } });
      return true;
    });
    if (!ready) return { skipped: 'Paused, excluded, or quota reached during preparation.' };
    attempted = true;
    const messageId = await sendSesOutreach({ providerId: state.providerId!, configurationSet: state.configurationSet!, id: item.id,
      to: item.email, subject: copy.subject, body: copy.body, unsubscribeToken: item.unsubscribeToken, postalAddress: state.postalAddress });
    await locked(async tx => {
      const row = await tx.outreachQueue.findUniqueOrThrow({ where: { id: item.id } });
      const sentAt = row.sentAt || new Date();
      // A delivery webhook can arrive before the SMTP/API response. Preserve it.
      await tx.outreachQueue.update({ where: { id: item.id }, data: { sentAt, providerMessageId: messageId,
        ...(row.status === 'sending' || row.status === 'unknown' ? { status: 'sent', error: null } : {}),
      } });
      await tx.emailCommunication.updateMany({ where: { id: row.communicationId!, status: { in: ['sending', 'unknown'] } }, data: { status: 'sent', sentAt, providerMessageId: messageId } });
      const sequence = await tx.outreachQueue.count({ where: { sentAt: { not: null } } });
      await tx.outreachAutomation.updateMany({ where: { id: 'default', leaseToken: token }, data: {
        leaseToken: null, leaseUntil: null, nextSendAt: new Date(Date.now() + delaySeconds(sequence, 0) * 1000),
      } });
    });
    return { sent: 1, id: item.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Outreach failed.';
    await locked(async tx => {
      const current = await tx.outreachAutomation.findUniqueOrThrow({ where: { id: 'default' } });
      if (current.leaseToken !== token) return;
      await tx.outreachQueue.updateMany({ where: { id: item.id, status: { in: ['preparing', 'sending'] } }, data: {
        status: attempted ? 'unknown' : 'queued', error: attempted ? 'Send outcome uncertain. Check SES events; do not resend automatically.' : message.slice(0, 300),
      } });
      const row = await tx.outreachQueue.findUnique({ where: { id: item.id } });
      if (row?.communicationId) await tx.emailCommunication.updateMany({ where: { id: row.communicationId, status: 'sending' }, data: { status: 'unknown' } });
      await tx.outreachAutomation.update({ where: { id: 'default' }, data: { enabled: false, leaseToken: null, leaseUntil: null,
        pauseReason: attempted ? 'SES send requires review. Check provider events before resuming.' : message.slice(0, 300) } });
    });
    throw new Error(attempted ? 'SES send outcome requires review; automation paused.' : message);
  }
}
