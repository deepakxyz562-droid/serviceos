import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import type { BgosWorkspace } from '../../../../../shared/bgos-contracts';

const patch = z.object({
  mode: z.enum(['local', 'agency']).optional(),
  profileAssistant: z.boolean().optional(),
  offlineReply: z.boolean().optional(),
  gbpAutomations: z.object({
    replyToReviews: z.boolean().optional(),
    generatePosts: z.boolean().optional(),
    postingSchedule: z.boolean().optional(),
    mediaSchedule: z.boolean().optional(),
  }).optional(),
  bookingPageConfig: z.object({
    businessName: z.string().optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    headline: z.string().optional(),
    seoDescription: z.string().optional(),
    onlineBookingEnabled: z.boolean().optional(),
  }).optional(),
}).strict();
function parse(value: string | null) { try { return JSON.parse(value || '{}'); } catch { return {}; } }

export async function GET() {
  const user = await getAuthUser();
  if (!user?.tenantId || user.role === 'customer') return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        slug: true,
        phone: true,
        email: true,
        website: true,
        description: true,
        settingsJson: true,
        plan: true,
        planStatus: true,
        googlePlaceId: true,
      },
    });
    if (!tenant) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    const form = await db.form.findFirst({ where: { tenantId: user.tenantId, ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}), status: 'active', slug: { not: null } }, select: { slug: true }, orderBy: { createdAt: 'desc' } });
    const settings = parse(tenant.settingsJson), features = settings;
    const profile = settings.creatorProfile;
    const event = Array.isArray(features.schedulingEventTypes) ? features.schedulingEventTypes.find((item: { isActive?: boolean; slug?: string }) => item.isActive && item.slug) : null;
    const subscription = user.workspaceId ? await db.productSubscription.findUnique({ where: { workspaceId: user.workspaceId } }) : null;
    const bookingPageConfig = settings.bookingPageConfig || {};
    const data: BgosWorkspace = {
      name: tenant.name, mode: settings.bgos?.mode === 'agency' ? 'agency' : 'local',
      bookingPageConfig: {
        businessName: bookingPageConfig.businessName || tenant.name,
        phone: bookingPageConfig.phone || tenant.phone || '',
        whatsapp: bookingPageConfig.whatsapp || '',
        email: bookingPageConfig.email || tenant.email || '',
        website: bookingPageConfig.website || tenant.website || '',
        headline: bookingPageConfig.headline || '',
        seoDescription: bookingPageConfig.seoDescription || tenant.description || '',
        onlineBookingEnabled: bookingPageConfig.onlineBookingEnabled ?? true,
      },
      links: {
        profile: profile?.isEnabled && profile.handle
          ? `/p/${encodeURIComponent(profile.handle)}`
          : `/b/${encodeURIComponent(tenant.slug || tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`,
        booking: event
          ? `/book/${encodeURIComponent(tenant.slug || tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}/${encodeURIComponent(event.slug)}`
          : `/book/${encodeURIComponent(tenant.slug || tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`,
        form: form?.slug ? `/f/${encodeURIComponent(form.slug)}` : null,
        review: tenant.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(tenant.googlePlaceId)}` : null,
      },
      automations: {
        profileAssistant: profile?.aiAgentEnabled === true,
        offlineReply: settings.autoReplyOffline?.enabled === true,
        gbp: settings.gbpAutomations || {
          replyToReviews: false,
          generatePosts: false,
          postingSchedule: false,
          mediaSchedule: false,
        },
      },
      plan: { code: subscription?.billingSource === 'product' ? subscription.plan : tenant.plan, status: subscription?.billingSource === 'product' ? subscription.status : tenant.planStatus },
    };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Workspace unavailable. Please retry.' }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId || !['owner', 'admin', 'standalone_user'].includes(user.role)) return NextResponse.json({ error: 'Workspace owner access required' }, { status: user ? 403 : 401 });
  const input = patch.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Invalid workspace settings' }, { status: 400 });
  try {
    // Compare-and-swap preserves unrelated settings when another editor saves concurrently.
    const tenant = await db.tenant.findUnique({ where: { id: user.tenantId }, select: { settingsJson: true } });
    if (!tenant) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    const settings = parse(tenant.settingsJson);
    if (input.data.mode) settings.bgos = { ...settings.bgos, mode: input.data.mode };
    if (input.data.profileAssistant !== undefined) {
      if (!settings.creatorProfile) return NextResponse.json({ error: 'Create your digital profile first' }, { status: 409 });
      settings.creatorProfile.aiAgentEnabled = input.data.profileAssistant;
    }
    if (input.data.offlineReply !== undefined) settings.autoReplyOffline = { ...settings.autoReplyOffline, enabled: input.data.offlineReply };
    if (input.data.gbpAutomations) settings.gbpAutomations = { ...(settings.gbpAutomations || {}), ...input.data.gbpAutomations };
    if (input.data.bookingPageConfig) {
      settings.bookingPageConfig = { ...(settings.bookingPageConfig || {}), ...input.data.bookingPageConfig };
    }
    const updateData: Record<string, any> = { settingsJson: JSON.stringify(settings) };
    if (input.data.bookingPageConfig?.phone) updateData.phone = input.data.bookingPageConfig.phone;
    if (input.data.bookingPageConfig?.website) updateData.website = input.data.bookingPageConfig.website;
    if (input.data.bookingPageConfig?.seoDescription) updateData.description = input.data.bookingPageConfig.seoDescription;

    const updated = await db.tenant.updateMany({ where: { id: user.tenantId, settingsJson: tenant.settingsJson }, data: updateData });
    if (!updated.count) return NextResponse.json({ error: 'Settings changed in another session. Refresh and retry.' }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Could not save workspace settings' }, { status: 503 }); }
}
