// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateKeyPairSync, createSign } from 'crypto';
import { snsCanonical, trustedSnsUrl, verifySns } from './sns';
const topic = 'arn:aws:sns:us-east-1:123456789012:outreach';
afterEach(() => vi.unstubAllGlobals());
describe('SNS authentication', () => {
  it('rejects off-domain certificate URLs and redirect tricks', () => {
    for (const url of ['https://evil.com/key.pem', 'https://sns.us-east-1.amazonaws.com.evil.com/key.pem', 'http://sns.us-east-1.amazonaws.com/key.pem', 'https://sns.us-east-1.amazonaws.com:8443/key.pem', 'https://sns.us-east-1.amazonaws.com/key.pem?redirect=x']) {
      expect(() => trustedSnsUrl(url, topic, true)).toThrow();
    }
  });
  it('validates a signed envelope and rejects payload tampering', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => publicKey.export({ type: 'spki', format: 'pem' }).toString() }));
    const message = { Type: 'Notification', Message: '{"hello":"world"}', MessageId: '123', Timestamp: '2026-10-09T00:00:00Z', TopicArn: topic,
      SignatureVersion: '2', SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-test.pem', Signature: '' };
    message.Signature = createSign('RSA-SHA256').update(snsCanonical(message)).sign(privateKey, 'base64');
    expect(await verifySns(message, topic)).toBe(true);
    expect(await verifySns({ ...message, Message: 'modified' }, topic)).toBe(false);
    expect(await verifySns(message, topic + '-wrong')).toBe(false);
    expect(await verifySns({ ...message, SignatureVersion: '3' }, topic)).toBe(false);
  });
});
