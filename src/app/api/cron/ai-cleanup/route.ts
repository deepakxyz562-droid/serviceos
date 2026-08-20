import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTelephonyProvider } from '@/lib/telephony-provider';
import { releaseStaleReservations } from '@/lib/usage-service';

/**
 * GET /api/cron/ai-cleanup
 * ─────────────────────────────────────────────────────────────────────────
 * Scheduled cron endpoint that:
 *   1. Releases stale AI call reservations (older than 30 minutes)
 *   2. Releases phone numbers past their 30-day grace period
 *
 * Phase 8.6 Gate 3: This is part of financial + operational correctness.
 *
 * Run every 5-10 minutes via:
 *   - Vercel Cron
 *   - Supabase scheduled function
 *   - External cron service
 *
 * Auth: x-cron-secret header (matches CRON_SECRET or INTERNAL_API_SECRET)
 */

export async function GET(request: NextRequest) {
  // Authenticate
  const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const headerSecret = request.headers.get('x-cron-secret') || '';
    if (token !== cronSecret && headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    // ── 1. Release stale AI call reservations ──
    const releasedReservations = await releaseStaleReservations(30);

    // ── 2. Release phone numbers past their grace period ──
    const expiredNumbers = await db.phoneNumber.findMany({
      where: {
        status: 'release_pending',
        releaseAfter: { lt: now },
      },
      select: { id: true, number: true, providerSid: true, tenantId: true },
    });

    let releasedNumbers = 0;
    let failedReleases = 0;

    if (expiredNumbers.length > 0) {
      const provider = await getTelephonyProvider();

      for (const phone of expiredNumbers) {
        try {
          // Release the number on Twilio (if provider is configured)
          if (provider && phone.providerSid) {
            await provider.releaseNumber(phone.providerSid);
          }

          // Mark as released in the DB
          await db.phoneNumber.update({
            where: { id: phone.id },
            data: {
              status: 'released',
              releasedAt: now,
            },
          });

          // Deactivate any PhoneConnections for this number
          await db.phoneConnection.updateMany({
            where: { phoneNumberId: phone.id },
            data: { status: 'INACTIVE' },
          });

          releasedNumbers++;
          console.log(`[cron/ai-cleanup] released phone number ${phone.number} (tenant=${phone.tenantId})`);
        } catch (err) {
          failedReleases++;
          console.error(
            `[cron/ai-cleanup] failed to release ${phone.number}:`,
            err instanceof Error ? err.message : err,
          );

          // If Twilio says 404 (already released), mark as released anyway
          if (err && typeof err === 'object' && 'message' in err) {
            const msg = (err as { message: string }).message;
            if (msg.includes('404') || msg.includes('not found')) {
              await db.phoneNumber.update({
                where: { id: phone.id },
                data: { status: 'released', releasedAt: now },
              }).catch(() => {});
              releasedNumbers++;
              failedReleases--;
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      releasedReservations,
      releasedNumbers,
      failedNumberReleases: failedReleases,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('[cron/ai-cleanup] error:', err);
    return NextResponse.json(
      { error: 'Cleanup failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
