// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ tx: {} as any, send: vi.fn(), copy: vi.fn(), provider: vi.fn(), tail: Promise.resolve() as Promise<unknown> }));
vi.mock('./db', () => ({ outreachDb: mocks.tx, locked: (work: (tx: any) => unknown) => {
  const result = mocks.tail.then(() => work(mocks.tx));
  mocks.tail = result.catch(() => {});
  return result;
} }));
vi.mock('./ses', () => ({ loadSesProvider: mocks.provider, outreachBaseUrl: () => 'https://example.com', sendSesOutreach: mocks.send }));
vi.mock('./copy', () => ({ generateOutreachCopy: mocks.copy }));
import { runOutreachTick, enqueueProspects } from './automation';
import { delaySeconds, DAY_MS, healthPause } from './policy';

let state: any, item: any, communication: any, count: number, optedOut: boolean, suppressed: boolean;
function matches(row: any, where: any) {
  if (!row) return false;
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'OR' || key === 'AND') return true;
    return value && typeof value === 'object' && value.in ? value.in.includes(row[key]) : row[key] === value;
  });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.tail = Promise.resolve(); count = 0; optedOut = false; suppressed = false; communication = null;
  state = { id: 'default', enabled: true, dailyLimit: 500, nextSendAt: new Date(0), leaseUntil: null, leaseToken: null,
    providerId: 'ses', configurationSet: 'outreach', postalAddress: '123 Sender Street', pitch: 'We help with scheduling.', startedBy: 'admin', industry: '' };
  item = { id: 'q1', tenantId: 't1', email: 'owner@example.com', companyName: 'Example', status: 'queued', createdBy: 'admin',
    subject: 'Hello', body: 'Hello Example team', unsubscribeToken: 'a'.repeat(64), communicationId: null, sentAt: null };
  mocks.tx.outreachAutomation = {
    findUniqueOrThrow: vi.fn(async () => ({ ...state })),
    update: vi.fn(async ({ data }: any) => Object.assign(state, data)),
    updateMany: vi.fn(async ({ where, data }: any) => { if (matches(state, where)) { Object.assign(state, data); return { count: 1 }; } return { count: 0 }; }),
  };
  mocks.tx.outreachQueue = {
    findFirst: vi.fn(async ({ where }: any) => matches(item, where) ? { ...item } : null),
    findUniqueOrThrow: vi.fn(async () => ({ ...item })), findUnique: vi.fn(async () => ({ ...item })),
    update: vi.fn(async ({ data }: any) => Object.assign(item, data)),
    updateMany: vi.fn(async ({ where, data }: any) => { if (matches(item, where)) { Object.assign(item, data); return { count: 1 }; } return { count: 0 }; }),
    count: vi.fn(async () => 1), create: vi.fn(), createMany: vi.fn(),
  };
  mocks.tx.tenant = { findUnique: vi.fn(async () => ({ id: 't1', name: 'Example', email: item.email, outreachDisabled: optedOut })) };
  mocks.tx.emailSuppression = { findFirst: vi.fn(async () => suppressed ? { id: 'suppression' } : null) };
  mocks.tx.emailCommunication = {
    count: vi.fn(async ({ where }: any) => where.OR ? count : 0), findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: any) => { communication = { id: 'c1', ...data }; return communication; }),
    updateMany: vi.fn(async ({ where, data }: any) => { if (matches(communication, where)) Object.assign(communication, data); return { count: 1 }; }),
  };
  mocks.provider.mockResolvedValue({}); mocks.send.mockResolvedValue('ses-id');
  mocks.copy.mockResolvedValue({ subject: 'Hi', body: 'Hello team', source: 'template' });
});

describe('paced outreach worker', () => {
  it('sends only once under overlapping workers and marks provider acceptance', async () => {
    const results = await Promise.all([runOutreachTick(), runOutreachTick(), runOutreachTick()]);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(results.filter(r => 'sent' in r)).toHaveLength(1);
    expect(item.status).toBe('sent'); expect(item.providerMessageId).toBe('ses-id');
    expect(communication.sentAt).toBeInstanceOf(Date);
    expect(state.nextSendAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('blocks at the rolling 24-hour quota even when sends are now delivered', async () => {
    count = 500; await runOutreachTick(); expect(mocks.send).not.toHaveBeenCalled();
    const where = mocks.tx.emailCommunication.count.mock.calls[0][0].where;
    expect(where.OR[0].sentAt.gt.getTime()).toBeGreaterThan(Date.now() - DAY_MS - 1000);
    expect(where.OR[0].status).toBeUndefined();
  });
  it('counts an in-flight reservation before dispatch and rechecks the cap', async () => {
    mocks.tx.emailCommunication.count.mockImplementation(async ({ where }: any) => where.OR ? ++count === 1 ? 499 : 500 : 0);
    await runOutreachTick(); expect(mocks.send).not.toHaveBeenCalled(); expect(item.status).toBe('queued');
  });
  it('excludes an unsubscribed company before dispatch', async () => {
    optedOut = true; await runOutreachTick(); expect(mocks.send).not.toHaveBeenCalled(); expect(item.status).toBe('excluded');
  });
  it('fails closed on a suppression database error', async () => {
    mocks.tx.emailSuppression.findFirst.mockRejectedValue(new Error('DB down'));
    await expect(runOutreachTick()).rejects.toThrow('DB down'); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('honors pause during AI preparation', async () => {
    item.subject = ''; item.body = '';
    mocks.copy.mockImplementation(async () => { state.enabled = false; return { subject: 'Hi', body: 'Hi team', source: 'ai' }; });
    await runOutreachTick(); expect(mocks.send).not.toHaveBeenCalled(); expect(item.status).toBe('queued');
  });
  it('never retries an ambiguous send and pauses the campaign', async () => {
    mocks.send.mockRejectedValue(new Error('Socket timed out'));
    await expect(runOutreachTick()).rejects.toThrow('requires review');
    expect(item.status).toBe('unknown'); expect(state.enabled).toBe(false);
    await runOutreachTick(); expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('recovers expired preparation but quarantines interrupted sending', async () => {
    item.status = 'sending'; item.communicationId = 'c1'; communication = { id: 'c1', status: 'sending' };
    state.leaseUntil = new Date(Date.now() - 1);
    await runOutreachTick(); expect(item.status).toBe('unknown'); expect(communication.status).toBe('unknown');
    expect(state.enabled).toBe(false); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('does not downgrade an early delivery webhook after SES responds', async () => {
    mocks.send.mockImplementation(async () => { item.status = 'delivered'; item.sentAt = new Date(); communication.status = 'delivered'; return 'ses-id'; });
    await runOutreachTick(); expect(item.status).toBe('delivered'); expect(communication.status).toBe('delivered');
  });
  it('does not queue the same email/company twice', async () => {
    const result = await enqueueProspects(['t1', 't1'], 'admin');
    expect(result).toHaveLength(1); expect(result[0].status).toBe('skipped'); expect(mocks.tx.outreachQueue.create).not.toHaveBeenCalled();
  });
});

describe('pacing and health', () => {
  it('fits 500 paced slots plus one-minute cron latency into 24 hours', () => {
    for (let phase = 0; phase < 3; phase++) {
      const gaps = Array.from({ length: 500 }, (_, index) => delaySeconds(index, phase));
      expect(Math.min(...gaps)).toBe(60); expect(Math.max(...gaps)).toBe(120);
      expect(gaps.reduce((sum, gap) => sum + gap + 60, 0)).toBeLessThan(24 * 3600);
    }
  });
  it('pauses on complaints and elevated bounces', () => {
    expect(healthPause(500, 0, 1)).toBeTruthy(); expect(healthPause(100, 2, 0)).toBeTruthy();
    expect(healthPause(100, 1, 0)).toBeNull();
  });
});
