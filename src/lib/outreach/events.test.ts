// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ tx: {} as any }));
vi.mock('./db', () => ({ locked: (fn: (tx: any) => unknown) => fn(mocks.tx), outreachDb: mocks.tx }));
import { applyOutreachSesEvent } from './events';
import { GET, POST } from '@/app/api/outreach/unsubscribe/[token]/route';
import { NextRequest } from 'next/server';
let row: any, comm: any;
beforeEach(() => {
  vi.clearAllMocks();
  row = { id: 'q1', tenantId: 't1', email: 'owner@example.com', communicationId: 'c1', status: 'unknown', attemptedAt: new Date(), providerMessageId: null, sentAt: null };
  comm = { id: 'c1', status: 'unknown' };
  mocks.tx.outreachQueue = { findUnique: vi.fn(async () => ({ ...row })), findFirst: vi.fn(async () => ({ ...row })), update: vi.fn(async ({ data }: any) => Object.assign(row, data)) };
  mocks.tx.emailCommunication = { findUniqueOrThrow: vi.fn(async () => ({ ...comm })), update: vi.fn(async ({ data }: any) => Object.assign(comm, data)) };
  mocks.tx.emailSuppression = { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})), update: vi.fn() };
  mocks.tx.outreachAutomation = { update: vi.fn(async () => ({})) };
  mocks.tx.tenant = { updateMany: vi.fn(async () => ({ count: 1 })) };
});
function event(type: string) { return { eventType: type, mail: { messageId: 'ses-123', destination: ['owner@example.com'], tags: { outreach_id: ['q1'] }, timestamp: new Date().toISOString() } }; }
describe('SES outreach events', () => {
  it('reconciles unknown acceptance from a signed Send event', async () => {
    await applyOutreachSesEvent(event('Send'));
    expect(row.status).toBe('sent'); expect(row.providerMessageId).toBe('ses-123'); expect(comm.sentAt).toBeInstanceOf(Date);
  });
  it('preserves complaint status when delivery events arrive out of order', async () => {
    await applyOutreachSesEvent(event('Complaint')); await applyOutreachSesEvent(event('Delivery')); await applyOutreachSesEvent(event('Send'));
    expect(row.status).toBe('complained'); expect(comm.status).toBe('complained'); expect(mocks.tx.outreachAutomation.update).toHaveBeenCalled();
    expect(mocks.tx.emailSuppression.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reason: 'complaint', email: row.email }) }));
  });
  it('does not permanently suppress a transient bounce', async () => {
    await applyOutreachSesEvent({ ...event('Bounce'), bounce: { bounceType: 'Transient' } });
    expect(row.status).toBe('bounced'); expect(mocks.tx.emailSuppression.create).not.toHaveBeenCalled();
  });
  it('suppresses permanent bounces and ignores mismatched recipients', async () => {
    await applyOutreachSesEvent({ ...event('Bounce'), bounce: { bounceType: 'Permanent' } });
    expect(mocks.tx.emailSuppression.create).toHaveBeenCalledTimes(1);
    const wrong = event('Complaint'); wrong.mail.destination = ['someoneelse@example.com'];
    expect(await applyOutreachSesEvent(wrong)).toEqual({ skipped: true });
  });
});
describe('unsubscribe endpoint', () => {
  const params = { params: Promise.resolve({ token: 'a'.repeat(64) }) };
  it('does not unsubscribe on GET from a link scanner', async () => {
    const response = await GET(new NextRequest('https://example.com/api/outreach/unsubscribe/token'), params);
    expect(response.status).toBe(200); expect(await response.text()).toContain('method="post"');
    expect(mocks.tx.tenant.updateMany).not.toHaveBeenCalled();
  });
  it('one-click POST suppresses both email and company', async () => {
    const response = await POST(new NextRequest('https://example.com/api/outreach/unsubscribe/token', { method: 'POST', body: 'List-Unsubscribe=One-Click' }), params);
    expect(response.status).toBe(200); expect(row.status).toBe('unsubscribed');
    expect(mocks.tx.tenant.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ outreachDisabled: true }) }));
    expect(mocks.tx.emailSuppression.create).toHaveBeenCalled();
  });
});
