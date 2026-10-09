// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ provider: vi.fn(), sendMail: vi.fn(), close: vi.fn(), apiSend: vi.fn() }));
vi.mock('./db', () => ({ outreachDb: { emailProvider: { findUnique: mocks.provider } } }));
vi.mock('@/lib/email-send', () => ({ emailProviderToSmtpConfig: () => ({ host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false, user: 'user', pass: 'pass' }) }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: mocks.sendMail, close: mocks.close }) } }));
vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: class { send = mocks.apiSend; destroy() {} },
  SendEmailCommand: class { constructor(public input: unknown) {} },
}));
import { sendSesOutreach } from './ses';
const input = { providerId: 'ses', configurationSet: 'outreach', id: 'q1', to: 'recipient@example.com', subject: 'Question', body: 'Hello team', unsubscribeToken: 'a'.repeat(64), postalAddress: '123 Sender Street' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.provider.mockResolvedValue({ status: 'active', providerType: 'ses', fromEmail: 'sender@example.com', fromName: 'Sender', replyTo: 'reply@example.com', configJson: '{}' });
});
describe('SES dispatch', () => {
  it('stores the SES acceptance ID, not Nodemailer RFC Message-ID, and supplies unsubscribe headers', async () => {
    mocks.sendMail.mockResolvedValue({ messageId: '<local@example.com>', response: '250 Ok ses-real-id' });
    expect(await sendSesOutreach(input)).toBe('ses-real-id');
    const mail = mocks.sendMail.mock.calls[0][0];
    expect(mail.headers['X-SES-MESSAGE-TAGS']).toBe('outreach_id=q1');
    expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(mail.text).toContain('123 Sender Street'); expect(mail.text).toContain('/api/outreach/unsubscribe/');
    expect(mail.html).toBeUndefined(); expect(mocks.close).toHaveBeenCalled();
  });
  it('treats missing SMTP acceptance ID as uncertain instead of fabricating success', async () => {
    mocks.sendMail.mockResolvedValue({ messageId: '<local@example.com>', response: 'unexpected reply' });
    await expect(sendSesOutreach(input)).rejects.toThrow('reconcile');
  });
});
