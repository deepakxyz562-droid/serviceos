import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { outreachDb } from './db';
import { enqueueProspects } from './automation';
import { buildVariables, renderTemplate, generateClaimToken, buildClaimUrl } from '@/lib/outreach';
import { normalizeEmail } from './policy';

const schema = z.object({ tenantId: z.string().min(1), recipientEmail: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(), subject: z.string().nullable().optional(),
  textBody: z.string().nullable().optional(), htmlBody: z.string().nullable().optional(),
  customVariables: z.record(z.string(), z.string()).optional() });
export async function queueLegacyOutreach(raw: unknown, userId: string) {
  const body = schema.parse(raw);
  const tenant = await outreachDb.tenant.findUniqueOrThrow({ where: { id: body.tenantId } });
  if (body.recipientEmail && normalizeEmail(body.recipientEmail) !== normalizeEmail(tenant.email || '')) throw new Error('Update the company contact before sending to a different address.');
  let subject = body.subject || '';
  let text = body.textBody || (body.htmlBody ? sanitizeHtml(body.htmlBody.replace(/<br\s*\/?\s*>|<\/p>/gi, '\n'), { allowedTags: [], allowedAttributes: {} }) : '');
  let claim: { token: string } | undefined;
  if (body.templateId) {
    const template = await outreachDb.emailTemplate.findUniqueOrThrow({ where: { id: body.templateId } });
    if (JSON.parse(template.tagsJson || '[]').includes('claim')) {
      if (tenant.claimed) throw new Error('This business is already claimed.');
      claim = await generateClaimToken(tenant.id);
    }
    subject = template.subject;
    text = template.textBody || sanitizeHtml(template.htmlBody.replace(/<br\s*\/?\s*>|<\/p>/gi, '\n'), { allowedTags: [], allowedAttributes: {} });
  }
  const vars = { ...await buildVariables({ tenant, ...(claim ? { claimLink: buildClaimUrl(claim.token), claimToken: claim.token } : {}) }), ...body.customVariables };
  subject = renderTemplate(subject, vars).trim();
  text = renderTemplate(text, vars).trim();
  if (!subject || /[\r\n]/.test(subject) || subject.length > 150 || !text || text.length > 4000) throw new Error('Provide a subject (up to 150 characters) and message (up to 4000 characters).');
  return (await enqueueProspects([tenant.id], userId, { subject, body: text }))[0];
}
