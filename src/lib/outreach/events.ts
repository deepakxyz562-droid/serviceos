import { z } from 'zod';
import { locked } from './db';
const schema = z.object({
  eventType: z.string().optional(), notificationType: z.string().optional(),
  mail: z.object({ messageId: z.string(), destination: z.array(z.string()), timestamp: z.string().optional(),
    tags: z.record(z.string(), z.array(z.string())).optional() }),
  bounce: z.object({ bounceType: z.string().optional() }).passthrough().optional(),
}).passthrough();
const rank: Record<string, number> = { sending: 0, unknown: 0, sent: 1, delivered: 2, failed: 3, bounced: 4, complained: 5, unsubscribed: 6 };
export async function applyOutreachSesEvent(raw: unknown) {
  const data = schema.parse(raw);
  const type = data.eventType || data.notificationType;
  const status = ({ Send: 'sent', Delivery: 'delivered', Bounce: 'bounced', Complaint: 'complained', Reject: 'failed', RenderingFailure: 'failed' } as Record<string, string>)[type || ''];
  if (!status) return { skipped: true };
  return locked(async tx => {
    const tag = data.mail.tags?.outreach_id?.[0];
    const row = tag ? await tx.outreachQueue.findUnique({ where: { id: tag } })
      : await tx.outreachQueue.findFirst({ where: { providerMessageId: data.mail.messageId } });
    if (!row || !row.communicationId || !data.mail.destination.some(e => e.trim().toLowerCase() === row.email)) return { skipped: true };
    if (row.providerMessageId && row.providerMessageId !== data.mail.messageId) return { skipped: true };
    const parsedDate = new Date(data.mail.timestamp || '');
    const sentAt = row.sentAt || (Number.isFinite(parsedDate.getTime()) && parsedDate <= new Date() ? parsedDate : row.attemptedAt || new Date());
    const next = (rank[status] ?? 0) > (rank[row.status] ?? 0) ? status : row.status;
    await tx.outreachQueue.update({ where: { id: row.id }, data: { status: next, sentAt, providerMessageId: data.mail.messageId,
      error: next === 'sent' || next === 'delivered' ? null : row.error } });
    const communication = await tx.emailCommunication.findUnique({ where: { id: row.communicationId } });
    if (!communication) return { skipped: true };
    const commNext = (rank[status] ?? 0) > (rank[communication.status] ?? 0) ? status : communication.status;
    await tx.emailCommunication.update({ where: { id: row.communicationId }, data: {
      sentAt, providerMessageId: data.mail.messageId, status: commNext,
      ...(type === 'Delivery' && !communication.deliveredAt ? { deliveredAt: new Date() } : {}),
      ...(type === 'Bounce' && !communication.bouncedAt ? { bouncedAt: new Date(), bouncedReason: data.bounce?.bounceType || 'SES bounce' } : {}),
      ...(type === 'Complaint' && !communication.complainedAt ? { complainedAt: new Date() } : {}),
    } });
    if (type === 'Complaint' || (type === 'Bounce' && data.bounce?.bounceType === 'Permanent')) {
      const existing = await tx.emailSuppression.findFirst({ where: { email: row.email, tenantId: null } });
      const suppression = { reason: type === 'Complaint' ? 'complaint' : 'hard_bounce', source: 'ses_webhook', provider: 'ses', resolvedAt: null };
      if (existing) await tx.emailSuppression.update({ where: { id: existing.id }, data: suppression });
      else await tx.emailSuppression.create({ data: { ...suppression, email: row.email } });
    }
    if (type === 'Complaint' || type === 'Reject' || type === 'RenderingFailure') {
      await tx.outreachAutomation.update({ where: { id: 'default' }, data: { enabled: false, pauseReason: `SES ${type} received. Review sending health before resuming.` } });
    }
    return { applied: true };
  });
}
