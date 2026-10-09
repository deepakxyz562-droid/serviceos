import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { locked, outreachDb } from '@/lib/outreach/db';
import { listProspects, enqueueProspects, quotaUsed } from '@/lib/outreach/automation';
import { loadSesProvider, outreachBaseUrl } from '@/lib/outreach/ses';

export const dynamic = 'force-dynamic';
const configSchema = z.object({
  action: z.enum(['save', 'start', 'pause']), providerId: z.string().min(1).max(200).optional(),
  configurationSet: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  postalAddress: z.string().trim().min(5).max(500).optional(),
  industry: z.string().trim().max(100).optional(), pitch: z.string().trim().min(10).max(1500).optional(),
  dailyLimit: z.number().int().min(1).max(500).optional(),
});
async function authorize(request: NextRequest) {
  const user = await getAuthUser();
  return user && await isSuperAdminRequest() ? user : null;
}
const queueSelect = { id: true, tenantId: true, email: true, companyName: true, industry: true, city: true,
  subject: true, body: true, copySource: true, status: true, error: true, sentAt: true, providerMessageId: true, createdAt: true } as const;

export async function GET(request: NextRequest) {
  if (!await authorize(request)) return NextResponse.json({ error: 'SuperAdmin access required.' }, { status: 403 });
  try {
    const stateRaw = await locked(tx => tx.outreachAutomation.findUnique({ where: { id: 'default' } }));
    const state = stateRaw || {
      enabled: false, dailyLimit: 500, providerId: null, configurationSet: null,
      postalAddress: '', industry: '', pitch: 'Fieseros helps service businesses manage scheduling, invoicing and missed calls.',
      nextSendAt: new Date(), lastRunAt: null, pauseReason: null,
    };
    const sp = request.nextUrl.searchParams;
    const search = (sp.get('search') || '').slice(0, 200);
    const industry = (sp.get('industry') || '').slice(0, 100);
    const page = Math.max(1, Math.min(10000, Number(sp.get('page')) || 1));
    const view = sp.get('view') || 'new';
    const [providers, used, queued, sentTotal] = await Promise.all([
      outreachDb.emailProvider.findMany({ where: { providerType: 'ses', status: 'active' }, select: { id: true, name: true, fromEmail: true } }),
      quotaUsed(outreachDb, new Date()),
      outreachDb.outreachQueue.count({ where: { status: { in: ['queued', 'preparing', 'sending'] } } }),
      outreachDb.emailCommunication.count({ where: { category: 'outreach', sentAt: { not: null } } }),
    ]);
    let listing: { items: unknown[]; total: number };
    if (view === 'new') listing = await listProspects(search, industry, Math.floor(page));
    else if (view === 'sent') {
      const where = { category: 'outreach', sentAt: { not: null }, ...(search ? { OR: [
        { recipientEmail: { contains: search, mode: 'insensitive' as const } }, { recipientName: { contains: search, mode: 'insensitive' as const } },
      ] } : {}) };
      const [rows, total] = await Promise.all([
        outreachDb.emailCommunication.findMany({ where, orderBy: { sentAt: 'desc' }, skip: (Math.floor(page) - 1) * 50, take: 50,
          select: { id: true, tenantId: true, recipientEmail: true, recipientName: true, subject: true, textBody: true, status: true, sentAt: true, providerMessageId: true } }),
        outreachDb.emailCommunication.count({ where }),
      ]);
      listing = { total, items: rows.map((r: any) => ({ ...r, email: r.recipientEmail, companyName: r.recipientName, body: r.textBody })) };
    } else {
      const where = { status: { in: view === 'excluded' ? ['excluded', 'unknown', 'failed', 'unsubscribed'] : ['queued', 'preparing', 'sending'] },
        ...(search ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { companyName: { contains: search, mode: 'insensitive' as const } }] } : {}) };
      const [items, total] = await Promise.all([
        outreachDb.outreachQueue.findMany({ where, select: queueSelect, orderBy: { createdAt: 'asc' }, take: 50, skip: (Math.floor(page) - 1) * 50 }),
        outreachDb.outreachQueue.count({ where }),
      ]);
      listing = { items, total };
    }
    const activeProviderId = state.providerId || providers[0]?.id || null;
    return NextResponse.json({ ...listing, page, providers, state: {
      enabled: state.enabled, dailyLimit: state.dailyLimit, providerId: activeProviderId, configurationSet: state.configurationSet,
      postalAddress: state.postalAddress, industry: state.industry, pitch: state.pitch, nextSendAt: state.nextSendAt,
      lastRunAt: state.lastRunAt, pauseReason: state.pauseReason,
    }, stats: { used, remaining: Math.max(0, state.dailyLimit - used), queued, sentTotal },
    feedbackConfigured: Boolean(process.env.OUTREACH_SES_SNS_TOPIC_ARN), schedulerConfigured: Boolean(process.env.CRON_SECRET) });
  } catch (error) {
    console.error('[outreach/automation] read failed', error);
    return NextResponse.json({ error: 'Outreach unavailable.' }, { status: 500 });
  }
}
export async function PUT(request: NextRequest) {
  const user = await authorize(request);
  if (!user) return NextResponse.json({ error: 'SuperAdmin access required.' }, { status: 403 });
  const parsed = configSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings.', details: parsed.error.flatten() }, { status: 400 });
  try {
    const { action, ...settings } = parsed.data;
    if (action !== 'pause') {
      const current = await outreachDb.outreachAutomation.findUnique({ where: { id: 'default' } });
      await loadSesProvider(settings.providerId || current?.providerId || null);
      outreachBaseUrl();
      if (action === 'start' && !process.env.CRON_SECRET && !process.env.OUTREACH_SES_SNS_TOPIC_ARN) {
        console.warn('[Outreach] CRON_SECRET or OUTREACH_SES_SNS_TOPIC_ARN not set; internal worker daemon will drive ticks.');
      }
    }
    await locked(async tx => {
      const current = (await tx.outreachAutomation.findUnique({ where: { id: 'default' } })) || {} as any;
      if (action !== 'pause' && current.leaseUntil && current.leaseUntil > new Date()) throw new Error('An email is being prepared or sent. Pause and wait for it to finish before changing settings.');
      await tx.outreachAutomation.update({ where: { id: 'default' }, data: action === 'pause'
        ? { enabled: false, pauseReason: 'Paused by you.' }
        : { ...settings, ...(action === 'start' ? { enabled: true, startedBy: user.id, pauseReason: null } : {}) } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update outreach.' }, { status: 400 });
  }
}
export async function POST(request: NextRequest) {
  const user = await authorize(request);
  if (!user) return NextResponse.json({ error: 'SuperAdmin access required.' }, { status: 403 });
  const schema = z.object({ tenantIds: z.array(z.string().min(1)).min(1).max(500), draft: z.object({
    subject: z.string().trim().min(1).max(150).regex(/^[^\r\n]+$/), body: z.string().trim().min(1).max(4000),
  }).optional() });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.draft && parsed.data.tenantIds.length !== 1)) return NextResponse.json({ error: 'Choose contacts; a custom draft must target one company.' }, { status: 400 });
  try {
    const results = await enqueueProspects(parsed.data.tenantIds, user.id, parsed.data.draft);
    return NextResponse.json({ results, queued: results.filter(r => r.status === 'queued').length });
  } catch { return NextResponse.json({ error: 'Could not queue contacts. No emails were sent.' }, { status: 503 }); }
}
