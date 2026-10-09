import { createVerify } from 'crypto';

export type SnsEnvelope = Record<string, string>;
export function snsHostForTopic(topic: string) {
  const match = /^arn:(aws|aws-cn|aws-us-gov):sns:([a-z0-9-]+):\d{12}:[A-Za-z0-9_-]+$/.exec(topic);
  if (!match) throw new Error('Invalid SNS topic ARN.');
  return `sns.${match[2]}.amazonaws.com${match[1] === 'aws-cn' ? '.cn' : ''}`;
}
export function snsCanonical(message: SnsEnvelope) {
  const keys = message.Type === 'Notification'
    ? ['Message', 'MessageId', ...(message.Subject !== undefined ? ['Subject'] : []), 'Timestamp', 'TopicArn', 'Type']
    : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
  return keys.map(key => {
    if (typeof message[key] !== 'string') throw new Error(`Missing SNS ${key}`);
    return `${key}\n${message[key]}\n`;
  }).join('');
}
export function trustedSnsUrl(raw: string, topic: string, certificate = false) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.hostname !== snsHostForTopic(topic) || url.port || url.username || url.password || url.hash) throw new Error('Untrusted SNS URL.');
  if (certificate && (!/^\/SimpleNotificationService-[A-Za-z0-9_-]+\.pem$/.test(url.pathname) || url.search)) throw new Error('Invalid SNS certificate URL.');
  return url;
}
const certificates = new Map<string, { pem: string; expires: number }>();
export async function verifySns(message: SnsEnvelope, allowedTopic = process.env.OUTREACH_SES_SNS_TOPIC_ARN) {
  if (!allowedTopic || message.TopicArn !== allowedTopic) return false;
  if (!['Notification', 'SubscriptionConfirmation', 'UnsubscribeConfirmation'].includes(message.Type)) return false;
  if (!['1', '2'].includes(message.SignatureVersion)) return false;
  try {
    const url = trustedSnsUrl(message.SigningCertURL, allowedTopic, true);
    let certificate = certificates.get(url.href);
    if (!certificate || certificate.expires < Date.now()) {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('SNS certificate could not be fetched.');
      const pem = await response.text();
      if (pem.length > 16000) return false;
      certificate = { pem, expires: Date.now() + 3600000 };
      if (certificates.size > 20) certificates.clear();
      certificates.set(url.href, certificate);
    }
    const verifier = createVerify(message.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1');
    verifier.update(snsCanonical(message));
    return verifier.verify(certificate.pem, message.Signature, 'base64');
  } catch { return false; }
}
