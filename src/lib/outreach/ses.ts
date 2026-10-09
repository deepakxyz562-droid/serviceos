import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { outreachDb } from './db';
import { emailProviderToSmtpConfig } from '@/lib/email-send';
import { validEmail } from './policy';

export async function loadSesProvider(id: string | null) {
  if (!id) throw new Error('Choose an Amazon SES provider.');
  const provider = await outreachDb.emailProvider.findUnique({ where: { id } });
  if (!provider || provider.status !== 'active' || provider.providerType !== 'ses') throw new Error('An active Amazon SES provider is required.');
  if (!validEmail(provider.fromEmail) || !provider.fromName.trim()) throw new Error('Set the SES sender name and email address.');
  const config = JSON.parse(provider.configJson) as Record<string, string>;
  const smtp = emailProviderToSmtpConfig(provider);
  if (!smtp && !(config.region && config.accessKeyId && config.secretAccessKey)) throw new Error('SES needs SMTP credentials or region/accessKeyId/secretAccessKey in provider settings.');
  return { provider, config, smtp };
}
export function outreachBaseUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com');
  if (url.protocol !== 'https:') throw new Error('Outreach requires an HTTPS NEXT_PUBLIC_APP_URL for unsubscribe links.');
  return url.origin;
}
export async function sendSesOutreach(input: {
  providerId: string; configurationSet: string; id: string; to: string;
  subject: string; body: string; unsubscribeToken: string; postalAddress: string;
}) {
  const { provider, config, smtp } = await loadSesProvider(input.providerId);
  const unsubscribe = `${outreachBaseUrl()}/api/outreach/unsubscribe/${input.unsubscribeToken}`;
  const text = `${input.body.trim()}\n\nBest,\n${provider.fromName}\n${input.postalAddress}\n\nUnsubscribe: ${unsubscribe}`;
  const headers = {
    'List-Unsubscribe': `<${unsubscribe}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  if (config.accessKeyId && config.secretAccessKey && config.region) {
    const client = new SESv2Client({ region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      maxAttempts: 1, // Do not blindly retry an ambiguous send response.
    });
    try {
      const result = await client.send(new SendEmailCommand({
        FromEmailAddress: `"${provider.fromName.replace(/["\r\n]/g, '')}" <${provider.fromEmail}>`,
        Destination: { ToAddresses: [input.to] },
        ReplyToAddresses: [provider.replyTo || provider.fromEmail],
        ConfigurationSetName: input.configurationSet,
        EmailTags: [{ Name: 'outreach_id', Value: input.id }],
        Content: { Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: { Text: { Data: text, Charset: 'UTF-8' } },
          Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })),
        } },
      }), { abortSignal: AbortSignal.timeout(30000) });
      if (!result.MessageId) throw new Error('SES did not return a message ID; reconcile before retrying.');
      return result.MessageId;
    } finally { client.destroy(); }
  }
  if (!smtp || !/^email-smtp\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$/.test(smtp.host)) throw new Error('Use an Amazon SES SMTP endpoint.');
  const transport = nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.secure, requireTLS: !smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 30000,
  });
  try {
    const result = await transport.sendMail({
      from: { name: provider.fromName, address: provider.fromEmail },
      to: input.to, replyTo: provider.replyTo || provider.fromEmail,
      subject: input.subject, text,
      headers: { ...headers, 'X-SES-CONFIGURATION-SET': input.configurationSet, 'X-SES-MESSAGE-TAGS': `outreach_id=${input.id}` },
    });
    // Nodemailer's messageId is the RFC Message-ID, not SES's assigned ID.
    const match = /^250\s+Ok\s+(\S+)/i.exec(result.response || '');
    if (!match) throw new Error('SES acceptance ID unavailable; reconcile through SES events.');
    return match[1];
  } finally { transport.close(); }
}
