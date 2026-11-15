import { describe, expect, it, vi } from 'vitest';
import { isDeliverableEmail, isSyntheticPlaceholderEmail } from '@/lib/emails/bgos/templates';

describe('BGOS Email Deliverability & Performance Guardrails', () => {
  it('correctly identifies synthetic phone placeholder emails and marks them undeliverable', () => {
    const synthetic = 'phone_9779068220@bgos.site';
    expect(isSyntheticPlaceholderEmail(synthetic)).toBe(true);
    expect(isDeliverableEmail(synthetic)).toBe(false);

    const syntheticFieseros = 'phone_9779068220@bgos.fieseros.com';
    expect(isSyntheticPlaceholderEmail(syntheticFieseros)).toBe(true);
    expect(isDeliverableEmail(syntheticFieseros)).toBe(false);

    // Real business emails must be deliverable
    const realGoogleEmail = 'deepak@fieseros.com';
    expect(isSyntheticPlaceholderEmail(realGoogleEmail)).toBe(false);
    expect(isDeliverableEmail(realGoogleEmail)).toBe(true);

    const gmail = 'owner8220@gmail.com';
    expect(isSyntheticPlaceholderEmail(gmail)).toBe(false);
    expect(isDeliverableEmail(gmail)).toBe(true);
  });

  it('resolves real connected Google email over synthetic phone email', () => {
    const meta = {
      googleEmail: 'verified-owner@gmail.com',
      locationTitle: 'ShieldHire SOS App',
    };
    const ownerUser = {
      name: 'Owner 8220',
      email: 'phone_9779068220@bgos.site',
    };
    const tenant = {
      email: null,
      brandProfile: { contactEmail: null },
    };

    const candidateEmails = [
      meta.googleEmail,
      tenant.brandProfile?.contactEmail,
      tenant.email,
      ownerUser?.email,
    ].filter((e): e is string => Boolean(e) && typeof e === 'string');

    const recipientEmail = candidateEmails.find((e) => isDeliverableEmail(e)) || null;

    expect(recipientEmail).toBe('verified-owner@gmail.com');
    expect(recipientEmail).not.toContain('phone_');
  });

  it('rejects sending when only synthetic phone email is present', () => {
    const meta: { googleEmail?: string } = {};
    const ownerUser = {
      name: 'Owner 8220',
      email: 'phone_9779068220@bgos.site',
    };
    const tenant = {
      email: null,
      brandProfile: { contactEmail: null },
    };

    const candidateEmails = [
      meta.googleEmail,
      tenant.brandProfile?.contactEmail,
      tenant.email,
      ownerUser?.email,
    ].filter((e): e is string => Boolean(e) && typeof e === 'string');

    const recipientEmail = candidateEmails.find((e) => isDeliverableEmail(e)) || null;

    expect(recipientEmail).toBeNull();
    // Deliverability guard would skip sending
    const canSend = Boolean(recipientEmail && isDeliverableEmail(recipientEmail));
    expect(canSend).toBe(false);
  });
});
