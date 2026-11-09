import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { sendSmsMessage } from '@/lib/sms-send';
import { checkWhatsAppCredits } from '@/lib/credit-management';
import { logActivity } from '@/lib/activity-log';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  resolveTenantLocale,
  normalizePhoneWithCountry,
  computeLocalScheduledDate,
  getLocalDateParts,
  parseHourMinute,
} from '@/lib/locale-timezone';

interface RecipientInput {
  name?: string;
  phone: string;
}

function toIsoStringSafe(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString();
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    const normalized =
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)
        ? `${s.replace(' ', 'T')}Z`
        : s;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? s : d.toISOString();
  }
  return null;
}

async function resolveWorkspaceReviewContext(
  tenantId: string,
  bodyReviewLink?: unknown,
  bodyBusinessName?: unknown,
  overrideCountry?: string | null,
  overrideTimeZone?: string | null,
) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      country: true,
      settingsJson: true,
      googlePlaceId: true,
      googleBusinessProfileUrl: true,
    },
  });

  const locale = resolveTenantLocale({
    tenantCountry: tenant?.country,
    settingsJson: tenant?.settingsJson,
    overrideCountry,
    overrideTimeZone,
  });

  let reviewLink =
    typeof bodyReviewLink === 'string' && bodyReviewLink.startsWith('http')
      ? bodyReviewLink.trim()
      : '';
  if (!reviewLink && tenant?.googleBusinessProfileUrl) {
    reviewLink = tenant.googleBusinessProfileUrl;
  }
  if (!reviewLink && tenant?.googlePlaceId) {
    reviewLink = `https://search.google.com/local/writereview?placeid=${tenant.googlePlaceId}`;
  }
  if (!reviewLink) {
    try {
      const googleAccount = await prepareGoogleAccount(tenantId);
      const meta = (googleAccount?.metadata || {}) as Record<string, any>;
      if (meta.placeId) {
        reviewLink = `https://search.google.com/local/writereview?placeid=${meta.placeId}`;
      } else if (meta.mapsUri) {
        reviewLink = meta.mapsUri;
      }
    } catch {}
  }

  const businessName =
    typeof bodyBusinessName === 'string' && bodyBusinessName.trim()
      ? bodyBusinessName.trim()
      : tenant?.name || 'our team';

  // Fallback to Google Maps search query link if the business has a name so bulk invites don't hard-fail before Place ID sync
  if (!reviewLink && businessName && businessName !== 'our team') {
    reviewLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}`;
  }

  return { businessName, reviewLink, locale };
}

function buildReviewInviteMessage(options: {
  customerName?: string | null;
  businessName: string;
  reviewLink: string;
  includeDirectLink?: boolean;
  customTemplate?: string;
}): string {
  const { customerName, businessName, reviewLink, includeDirectLink = true, customTemplate } = options;
  const trimmedName = (customerName || '').trim();
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : '';

  if (customTemplate && customTemplate.trim()) {
    let text = customTemplate
      .replace(/\{firstName\}|\{FirstName\}/g, firstName || 'there')
      .replace(/\{name\}|\{Name\}/g, trimmedName || 'Valued Customer')
      .replace(/\{businessName\}/g, businessName)
      .replace(/\{reviewLink\}/g, reviewLink);
    if (includeDirectLink && !text.includes(reviewLink)) {
      text += `\n\n🔗 Review Link: ${reviewLink}`;
    }
    return text.trim();
  }

  const greeting = firstName ? `Dear ${firstName},` : 'Dear Valued Client,';
  const linkBlock = includeDirectLink ? `\n\n🔗 Review Link: ${reviewLink}` : '';
  return `${greeting}\n\nThank you for choosing ${businessName}. We truly appreciate your trust and hope you had an exceptional experience with our team.\n\nIf you have a brief moment, we would be deeply grateful if you could share your feedback on our official Google Business Profile:${linkBlock}\n\nWarm regards,\n${businessName}`;
}

async function isWhatsAppCloudReady(tenantId: string): Promise<boolean> {
  try {
    const credit = await checkWhatsAppCredits(tenantId);
    if (!credit.allowed) return false;
    const provider = await db.communicationProvider.findFirst({
      where: {
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
        tenantId,
      },
      select: { id: true },
    });
    return Boolean(provider);
  } catch {
    return false;
  }
}

async function isSmsGatewayReady(tenantId: string): Promise<boolean> {
  try {
    const provider = await db.communicationProvider.findFirst({
      where: {
        type: 'sms',
        status: 'active',
        sendingEnabled: true,
        OR: [{ tenantId }, { isPlatform: true }],
      },
      select: { id: true },
    });
    if (provider) return true;
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER,
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/reviews/request
 * Returns bulk review invite queue summary, upcoming batches, CRM contact candidates,
 * workspace country/timezone metadata, and real WhatsApp/SMS channel readiness.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const overrideCountry = searchParams.get('country');
    const overrideTimeZone = searchParams.get('timeZone');

    const tenantId = user.tenantId;
    const ctx = await resolveWorkspaceReviewContext(tenantId, undefined, undefined, overrideCountry, overrideTimeZone);

    const [hasWhatsAppProvider, smsAvailable, scheduledRows, recentBookings, crmCustomers] = await Promise.all([
      isWhatsAppCloudReady(tenantId),
      isSmsGatewayReady(tenantId),
      db.scheduledMessage
        .findMany({
          where: { tenantId, messageType: 'review_request' },
          orderBy: { dueAt: 'asc' },
          take: 150,
          select: {
            id: true,
            channel: true,
            recipientPhone: true,
            bodyText: true,
            dueAt: true,
            sentAt: true,
            status: true,
            lastError: true,
            metadataJson: true,
          },
        })
        .catch(() => []),
      db.booking
        .findMany({
          where: {
            tenantId,
            customerPhone: { not: null },
          },
          orderBy: [{ completedAt: 'desc' }, { scheduledAt: 'desc' }],
          take: 60,
          select: { id: true, customerName: true, customerPhone: true, status: true },
        })
        .catch(() => []),
      db.customer
        .findMany({
          where: {
            tenantId,
            phone: { not: '' },
          },
          orderBy: { createdAt: 'desc' },
          take: 60,
          select: { id: true, name: true, phone: true },
        })
        .catch(() => []),
    ]);

    const pendingPhones = new Set(
      scheduledRows
        .filter((r) => r.status === 'pending' && r.recipientPhone)
        .map((r) => r.recipientPhone as string),
    );

    const candidateMap = new Map<
      string,
      { name: string; phone: string; source: 'booking' | 'crm'; alreadyQueued: boolean }
    >();
    for (const b of recentBookings) {
      const norm = b.customerPhone ? normalizePhoneWithCountry(b.customerPhone, ctx.locale.callingCode) : null;
      if (norm && !candidateMap.has(norm)) {
        candidateMap.set(norm, {
          name: b.customerName?.trim() || 'Customer',
          phone: norm,
          source: 'booking',
          alreadyQueued: pendingPhones.has(norm),
        });
      }
    }
    for (const c of crmCustomers) {
      const norm = c.phone ? normalizePhoneWithCountry(c.phone, ctx.locale.callingCode) : null;
      if (norm && !candidateMap.has(norm)) {
        candidateMap.set(norm, {
          name: c.name?.trim() || 'Customer',
          phone: norm,
          source: 'crm',
          alreadyQueued: pendingPhones.has(norm),
        });
      }
    }

    const items = scheduledRows.map((row) => {
      let meta: Record<string, any> = {};
      try {
        meta = JSON.parse(row.metadataJson || '{}');
      } catch {}
      return {
        id: row.id,
        channel: row.channel,
        phone: row.recipientPhone || '',
        customerName: typeof meta.customerName === 'string' ? meta.customerName : '',
        source: typeof meta.source === 'string' ? meta.source : 'manual',
        batchDay: typeof meta.batchDay === 'number' ? meta.batchDay : undefined,
        timeZone: typeof meta.timeZone === 'string' ? meta.timeZone : ctx.locale.timeZone,
        country: typeof meta.country === 'string' ? meta.country : ctx.locale.country,
        message: row.bodyText || '',
        dueAt: toIsoStringSafe(row.dueAt) || new Date().toISOString(),
        sentAt: toIsoStringSafe(row.sentAt),
        status: row.status,
        lastError: row.lastError || null,
      };
    });

    const pendingCount = items.filter((i) => i.status === 'pending').length;
    const sentCount = items.filter((i) => i.status === 'sent').length;
    const failedCount = items.filter((i) => i.status === 'failed').length;
    const nextPending = items.find((i) => i.status === 'pending');

    return NextResponse.json({
      hasWhatsAppProvider,
      smsAvailable,
      businessName: ctx.businessName,
      reviewLink: ctx.reviewLink,
      locale: ctx.locale,
      queue: {
        pending: pendingCount,
        sent: sentCount,
        failed: failedCount,
        total: items.length,
        dailyLimit: 5,
        nextBatchAt: nextPending?.dueAt || null,
        items: items.slice(0, 100),
      },
      candidates: Array.from(candidateMap.values()).slice(0, 60),
    });
  } catch (error) {
    console.error('[api/reviews/request] GET error:', error);
    return NextResponse.json({ error: 'Failed to load review invite queue' }, { status: 500 });
  }
}

/**
 * POST /api/reviews/request
 * Send, bulk-schedule, or dispatch Google review invites in the tenant's country timezone.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    // Fast path: allow marking a 1-tap WhatsApp queue item as sent, or running due pending invites
    if (action === 'mark_sent' && typeof body.id === 'string') {
      const existing = await db.scheduledMessage.findFirst({
        where: { id: body.id.trim(), tenantId: user.tenantId, messageType: 'review_request' },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Scheduled invite not found' }, { status: 404 });
      }
      await db.scheduledMessage.update({
        where: { id: existing.id },
        data: { status: 'sent', sentAt: new Date(), lastError: null, updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, id: existing.id, status: 'sent' });
    }

    if (action === 'dispatch_now' || action === 'retry_failed') {
      const targetIds: string[] = Array.isArray(body.ids)
        ? body.ids.filter((id: unknown): id is string => typeof id === 'string')
        : typeof body.id === 'string'
          ? [body.id]
          : [];

      const rows = await db.scheduledMessage.findMany({
        where: {
          tenantId: user.tenantId,
          messageType: 'review_request',
          ...(targetIds.length > 0
            ? { id: { in: targetIds } }
            : action === 'retry_failed'
              ? { status: 'failed' }
              : { status: 'pending' }),
        },
        orderBy: { dueAt: 'asc' },
        take: 10,
      });

      if (!rows.length) {
        return NextResponse.json({ success: true, sentCount: 0, failedCount: 0, message: 'No matching invites to send right now.' });
      }

      let sentCount = 0;
      let failedCount = 0;
      let lastErrorMsg = '';
      for (const row of rows) {
        if (!row.recipientPhone) {
          failedCount++;
          continue;
        }
        try {
          const result =
            row.channel === 'sms'
              ? await sendSmsMessage({
                  to: row.recipientPhone,
                  message: row.bodyText || row.subject || '',
                  tenantId: user.tenantId,
                })
              : await sendWhatsAppMessage({
                  to: row.recipientPhone,
                  message: row.bodyText || row.subject || '',
                  type: 'text',
                  tenantId: user.tenantId,
                });
          if (result.success) {
            sentCount++;
            await db.scheduledMessage.update({
              where: { id: row.id },
              data: { status: 'sent', sentAt: new Date(), lastError: null, attempts: { increment: 1 }, updatedAt: new Date() },
            });
          } else {
            failedCount++;
            lastErrorMsg = result.error || 'Provider send failed';
            await db.scheduledMessage.update({
              where: { id: row.id },
              data: { status: 'failed', lastError: lastErrorMsg.slice(0, 500), attempts: { increment: 1 }, updatedAt: new Date() },
            });
          }
        } catch (err) {
          failedCount++;
          lastErrorMsg = err instanceof Error ? err.message : 'Send failed';
          await db.scheduledMessage.update({
            where: { id: row.id },
            data: { status: 'failed', lastError: lastErrorMsg.slice(0, 500), attempts: { increment: 1 }, updatedAt: new Date() },
          });
        }
      }

      return NextResponse.json({
        success: sentCount > 0,
        sentCount,
        failedCount,
        error: sentCount === 0 && lastErrorMsg ? lastErrorMsg : undefined,
        message:
          sentCount > 0
            ? `Sent ${sentCount} invite${sentCount === 1 ? '' : 's'}${failedCount > 0 ? ` (${failedCount} failed)` : ''}.`
            : lastErrorMsg || 'Could not send invites — connect WhatsApp Cloud API or SMS in Channels, or use 1-Tap Send WA.',
      });
    }

    const includeDirectLink = body.includeDirectLink !== false;
    const isScheduledMode = body.mode === 'drip' || body.mode === 'scheduled' || body.mode === 'bulk';
    const channel: 'whatsapp' | 'sms' = body.channel === 'sms' ? 'sms' : 'whatsapp';
    const dailyLimit = Math.min(25, Math.max(1, Number.parseInt(String(body.dailyLimit || 5), 10) || 5));
    const customTemplate = typeof body.messageTemplate === 'string' ? body.messageTemplate : undefined;
    const sourceLabel = typeof body.source === 'string' ? body.source : 'manual';
    const overrideCountry = typeof body.country === 'string' ? body.country.trim().toUpperCase() : undefined;
    const overrideTimeZone = typeof body.timeZone === 'string' ? body.timeZone.trim() : undefined;
    const preferredTime = typeof body.preferredTime === 'string' ? body.preferredTime : '10:00';
    const sendFirstBatchToday = body.startToday !== false;

    const { businessName, reviewLink, locale } = await resolveWorkspaceReviewContext(
      user.tenantId,
      body.reviewLink,
      body.businessName,
      overrideCountry,
      overrideTimeZone,
    );

    if (!reviewLink) {
      return NextResponse.json(
        {
          error:
            'No Google review link available yet. Connect your Google Business Profile or add your business name so BGOS can build your review link.',
          code: 'NO_REVIEW_LINK',
        },
        { status: 400 },
      );
    }

    // Build deduplicated recipient map from explicit payload OR recent bookings/customers
    const byPhone = new Map<string, string | null>();
    if (Array.isArray(body.recipients) && body.recipients.length > 0) {
      for (const rec of body.recipients as RecipientInput[]) {
        if (!rec || typeof rec.phone !== 'string') continue;
        const norm = normalizePhoneWithCountry(rec.phone, locale.callingCode);
        if (norm && !byPhone.has(norm)) {
          byPhone.set(norm, typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : null);
        }
      }
    } else {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const completedBookings = await db.booking.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'completed',
          customerPhone: { not: null },
          OR: [{ completedAt: { gte: since } }, { scheduledAt: { gte: since } }],
        },
        select: { id: true, customerName: true, customerPhone: true },
        orderBy: [{ completedAt: 'desc' }, { scheduledAt: 'desc' }],
        take: 200,
      });

      for (const b of completedBookings) {
        const norm = b.customerPhone ? normalizePhoneWithCountry(b.customerPhone, locale.callingCode) : null;
        if (norm && !byPhone.has(norm)) {
          byPhone.set(norm, b.customerName || null);
        }
      }

      if (byPhone.size === 0 && isScheduledMode) {
        const customers = await db.customer.findMany({
          where: { tenantId: user.tenantId, phone: { not: '' } },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: { name: true, phone: true },
        });
        for (const c of customers) {
          const norm = c.phone ? normalizePhoneWithCountry(c.phone, locale.callingCode) : null;
          if (norm && !byPhone.has(norm)) {
            byPhone.set(norm, c.name || null);
          }
        }
      }
    }

    if (byPhone.size === 0) {
      return NextResponse.json(
        {
          error:
            'No valid customer phone numbers found. Upload a CSV, paste customer numbers, or pick from CRM contacts.',
          code: 'NO_RECIPIENTS',
          sentCount: 0,
        },
        { status: 400 },
      );
    }

    if (isScheduledMode) {
      // Check already-pending recipients so accidental double-clicks don't duplicate invites
      const existingPending = await db.scheduledMessage.findMany({
        where: {
          tenantId: user.tenantId,
          messageType: 'review_request',
          status: 'pending',
        },
        select: { recipientPhone: true },
      });
      const existingSet = new Set(existingPending.map((r) => r.recipientPhone).filter(Boolean));

      const entries = Array.from(byPhone.entries());
      const newEntries = entries.filter(([phone]) => !existingSet.has(phone));
      const skippedDuplicates = entries.length - newEntries.length;

      if (newEntries.length === 0) {
        return NextResponse.json(
          {
            error: 'All selected phone numbers are already scheduled in your pending review queue.',
            code: 'ALREADY_QUEUED',
            skippedDuplicates,
          },
          { status: 400 },
        );
      }

      const now = new Date();
      const { hour: baseHour, minute: baseMinute } = parseHourMinute(preferredTime, 10, 0);
      const localNow = getLocalDateParts(now, locale.timeZone);
      // Only start Day 0 today if local time in the user's country is before 8:00 PM; otherwise start tomorrow morning!
      const canStartToday = sendFirstBatchToday && localNow.hour < 20;
      const daySlots: Record<number, { date: string; count: number }> = {};
      let firstBatchAt: string | null = null;
      const createdIds: string[] = [];

      for (let idx = 0; idx < newEntries.length; idx++) {
        const [phone, customerName] = newEntries[idx];
        const batchDay = Math.floor(idx / dailyLimit);
        const slotIndex = idx % dailyLimit;

        let dueAt: Date;
        if (batchDay === 0 && canStartToday) {
          // Respect preferred local hour if it's still ahead today; otherwise space softly 5m + 15m*slot apart
          const candidatePreferredToday = computeLocalScheduledDate({
            dayOffset: 0,
            hour: Math.min(18, baseHour + Math.floor(slotIndex / 2)),
            minute: (baseMinute + (slotIndex % 2) * 30) % 60,
            timeZone: locale.timeZone,
            now,
          });
          if (candidatePreferredToday.getTime() > now.getTime() + 2 * 60_000) {
            dueAt = candidatePreferredToday;
          } else {
            dueAt = new Date(now.getTime() + (5 + slotIndex * 15) * 60 * 1000);
          }
        } else {
          const offsetDays = canStartToday ? batchDay : batchDay + 1;
          const slotHour = Math.min(18, baseHour + Math.floor(slotIndex / 2));
          const slotMinute = (baseMinute + (slotIndex % 2) * 30) % 60;
          dueAt = computeLocalScheduledDate({
            dayOffset: offsetDays,
            hour: slotHour,
            minute: slotMinute,
            timeZone: locale.timeZone,
            now,
          });
        }

        if (!firstBatchAt) firstBatchAt = dueAt.toISOString();
        const dayKey = batchDay;
        if (!daySlots[dayKey]) {
          daySlots[dayKey] = { date: dueAt.toISOString(), count: 0 };
        }
        daySlots[dayKey].count += 1;

        const messageText = buildReviewInviteMessage({
          customerName,
          businessName,
          reviewLink,
          includeDirectLink,
          customTemplate,
        });

        const row = await db.scheduledMessage.create({
          data: {
            tenantId: user.tenantId,
            messageType: 'review_request',
            channel,
            recipientPhone: phone,
            subject: `Google Review Request · ${businessName}`,
            bodyText: messageText,
            dueAt,
            status: 'pending',
            metadataJson: JSON.stringify({
              customerName: customerName || '',
              source: sourceLabel,
              reviewLink,
              batchDay: batchDay + 1,
              timeZone: locale.timeZone,
              country: locale.country,
            }),
          },
        });
        createdIds.push(row.id);
      }

      const [hasWhatsAppProvider, smsReady] = await Promise.all([
        channel === 'whatsapp' ? isWhatsAppCloudReady(user.tenantId) : Promise.resolve(true),
        channel === 'sms' ? isSmsGatewayReady(user.tenantId) : Promise.resolve(true),
      ]);

      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorType: 'user',
        action: 'create',
        entityType: 'review_request',
        entityId: createdIds[0] || `bulk-review-${Date.now()}`,
        entityName: businessName,
        description: `Bulk scheduled ${newEntries.length} Google review message(s) at ${dailyLimit}/day (${locale.timeZone}) via ${channel}.`,
        severity: 'info',
      }).catch(() => {});

      const totalDays = Math.ceil(newEntries.length / dailyLimit);
      return NextResponse.json({
        success: true,
        mode: 'scheduled',
        channel,
        scheduledCount: newEntries.length,
        queuedCount: newEntries.length,
        skippedDuplicates,
        dailyLimit,
        totalDays,
        firstBatchAt,
        timeZone: locale.timeZone,
        country: locale.country,
        hasWhatsAppProvider,
        smsAvailable: smsReady,
        batches: Object.entries(daySlots).map(([dayIdx, info]) => ({
          day: Number(dayIdx) + 1,
          date: info.date,
          count: info.count,
        })),
        message:
          channel === 'whatsapp' && !hasWhatsAppProvider
            ? `Scheduled ${newEntries.length} invite${newEntries.length === 1 ? '' : 's'} at ${dailyLimit}/day (${locale.timeZone}). Tap "1-Tap Send WA" on pending items or connect WhatsApp Cloud API in Channels.`
            : channel === 'sms' && !smsReady
              ? `Scheduled ${newEntries.length} invite${newEntries.length === 1 ? '' : 's'} (${locale.timeZone}). Connect an SMS gateway in Settings → Providers for live carrier delivery.`
              : `Scheduled ${newEntries.length} review invite${newEntries.length === 1 ? '' : 's'} at ${dailyLimit}/day (${totalDays} day${totalDays === 1 ? '' : 's'}, ${locale.timeZone}).`,
      });
    }

    // Immediate dispatch path
    let sentCount = 0;
    const failures: Array<{ phone: string; error: string }> = [];

    for (const [phone, customerName] of byPhone) {
      const message = buildReviewInviteMessage({
        customerName,
        businessName,
        reviewLink,
        includeDirectLink,
        customTemplate,
      });

      try {
        const result =
          channel === 'sms'
            ? await sendSmsMessage({
                to: phone,
                message,
                tenantId: user.tenantId || undefined,
                countryCode: locale.country,
              })
            : await sendWhatsAppMessage({
                to: phone,
                message,
                type: 'text',
                tenantId: user.tenantId || undefined,
              });
        if (result.success) {
          sentCount++;
        } else {
          failures.push({ phone, error: result.error || 'Send failed' });
        }
      } catch (err: unknown) {
        failures.push({
          phone,
          error: err instanceof Error ? err.message : 'Send failed',
        });
      }
    }

    if (sentCount > 0) {
      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorType: 'user',
        action: 'create',
        entityType: 'review_request',
        entityId: `review-request-${Date.now()}`,
        entityName: businessName,
        description: `Sent ${sentCount} Google review request(s) via ${channel}.`,
        severity: 'info',
      }).catch(() => {});
    }

    if (sentCount === 0) {
      const firstError = failures[0]?.error || 'Messaging provider is not configured';
      return NextResponse.json(
        {
          error: `Could not send review requests: ${firstError}. Schedule in Bulk Invites (5/Day) or connect WhatsApp/SMS in Settings → Channels.`,
          code: 'SEND_FAILED',
          sentCount: 0,
          failures: failures.slice(0, 5),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'immediate',
      sentCount,
      failedCount: failures.length,
      recipients: byPhone.size,
      message: `Review requests sent to ${sentCount} customer${sentCount === 1 ? '' : 's'} via ${channel}${failures.length > 0 ? ` (${failures.length} failed).` : '.'}`,
      failures: failures.slice(0, 5),
    });
  } catch (error: unknown) {
    console.error('Error sending review requests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send review requests' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/reviews/request
 * Mark a 1-tap WhatsApp queue item as sent, retry a failed invite, or adjust schedule time.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Queue item id is required' }, { status: 400 });
    }

    const existing = await db.scheduledMessage.findFirst({
      where: { id, tenantId: user.tenantId, messageType: 'review_request' },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Scheduled invite not found' }, { status: 404 });
    }

    if (action === 'mark_sent') {
      await db.scheduledMessage.update({
        where: { id: existing.id },
        data: { status: 'sent', sentAt: new Date(), lastError: null, updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, id: existing.id, status: 'sent' });
    }

    if (action === 'retry') {
      await db.scheduledMessage.update({
        where: { id: existing.id },
        data: { status: 'pending', lastError: null, dueAt: new Date(), updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, id: existing.id, status: 'pending' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[api/reviews/request] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update scheduled invite' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/request?id=<scheduledMessageId> | ?clearPending=true
 * Cancel a single scheduled invite or clear pending bulk invites.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    const clearPending = searchParams.get('clearPending') === 'true';

    if (clearPending) {
      const result = await db.scheduledMessage.deleteMany({
        where: {
          tenantId: user.tenantId,
          messageType: 'review_request',
          status: 'pending',
        },
      });
      return NextResponse.json({ success: true, deletedCount: result.count });
    }

    if (!id) {
      return NextResponse.json({ error: 'Queue item id is required' }, { status: 400 });
    }

    const existing = await db.scheduledMessage.findFirst({
      where: { id, tenantId: user.tenantId, messageType: 'review_request' },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Scheduled invite not found' }, { status: 404 });
    }

    await db.scheduledMessage.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, id: existing.id });
  } catch (error) {
    console.error('[api/reviews/request] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove scheduled invite' }, { status: 500 });
  }
}
