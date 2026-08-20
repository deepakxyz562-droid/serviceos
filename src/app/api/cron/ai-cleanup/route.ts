import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTelephonyProvider } from '@/lib/telephony-provider';
import { releaseStaleReservations } from '@/lib/usage-service';

/**
 * GET /api/cron/ai-cleanup
 * ─────────────────────────────────────────────────────────────────────────
 * Scheduled cron endpoint that:
 *   1. Releases stale AI call reservations (older than 30 minutes)
 *   2. Releases phone numbers past their 30-day grace period (resumable saga)
 *
 * Phase 9A Gate B: Resumable Release Saga
 *
 * The release is a multi-step process (like provisioning):
 *   release_pending → vapi_released → released
 *
 * Each step is resumable — if the cron is interrupted, the next run
 * picks up from the last completed step. No orphans.
 *
 * Release Saga:
 *   1. release_pending (30-day grace period active)
 *   2. After releaseAfter:
 *      a. Detach assistant from Vapi
 *      b. Delete Vapi phone-number resource
 *      c. → status = vapi_released
 *   3. vapi_released:
 *      a. Release Twilio number
 *      b. → status = released
 *   4. released: skip (done)
 *
 * Auth: x-cron-secret header (matches CRON_SECRET or INTERNAL_API_SECRET)
 */

export async function GET(request: NextRequest) {
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

    // ── 2. Phone number release saga ──
    let vapiDetachCount = 0;
    let vapiDeleteCount = 0;
    let twilioReleaseCount = 0;
    let failedReleases = 0;

    // Step A: Numbers in release_pending past their grace period → detach + delete Vapi
    const pendingRelease = await db.phoneNumber.findMany({
      where: {
        status: 'release_pending',
        releaseAfter: { lt: now },
      },
      select: { id: true, number: true, providerSid: true, vapiNumberId: true, tenantId: true },
    });

    const provider = await getTelephonyProvider();
    const { getVapiVoiceProvider } = await import('@/lib/vapi-voice-provider');
    const vapi = getVapiVoiceProvider();

    for (const phone of pendingRelease) {
      try {
        // 1. Detach assistant from Vapi
        if (phone.vapiNumberId) {
          try {
            await vapi.detachAssistantFromPhoneNumber(phone.vapiNumberId);
          } catch (err) {
            console.warn(`[cron] detach Vapi assistant for ${phone.number}:`, err instanceof Error ? err.message : err);
            // Continue — the assistant may already be detached
          }
        }

        // 2. Delete Vapi phone-number resource
        if (phone.vapiNumberId) {
          try {
            await vapi.deleteVapiPhoneNumber(phone.vapiNumberId);
            vapiDeleteCount++;
          } catch (err) {
            console.warn(`[cron] delete Vapi resource for ${phone.number}:`, err instanceof Error ? err.message : err);
            // Continue — the Vapi resource may already be deleted (404)
          }
        }

        // 3. Mark as vapi_released (intermediate saga state)
        await db.phoneNumber.update({
          where: { id: phone.id },
          data: {
            status: 'vapi_released',
            vapiReleasedAt: now,
          },
        });

        vapiDetachCount++;
        console.log(`[cron] ${phone.number}: Vapi released → vapi_released`);
      } catch (err) {
        failedReleases++;
        console.error(`[cron] FAILED Vapi release for ${phone.number}:`, err instanceof Error ? err.message : err);
        // Number stays in release_pending — cron will retry next run
      }
    }

    // Step B: Numbers in vapi_released → release Twilio → released
    const vapiReleased = await db.phoneNumber.findMany({
      where: { status: 'vapi_released' },
      select: { id: true, number: true, providerSid: true, vapiNumberId: true, tenantId: true },
    });

    for (const phone of vapiReleased) {
      try {
        // Release Twilio number
        if (provider && phone.providerSid) {
          await provider.releaseNumber(phone.providerSid);
        }

        // Mark as fully released
        await db.phoneNumber.update({
          where: { id: phone.id },
          data: {
            status: 'released',
            releasedAt: now,
          },
        });

        // Deactivate PhoneConnections
        await db.phoneConnection.updateMany({
          where: { phoneNumberId: phone.id },
          data: { status: 'INACTIVE' },
        });

        twilioReleaseCount++;
        console.log(`[cron] ${phone.number}: Twilio released → released (complete)`);
      } catch (err) {
        failedReleases++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron] FAILED Twilio release for ${phone.number}:`, msg);

        // If Twilio says 404 (already released), mark as released
        if (msg.includes('404') || msg.includes('not found')) {
          await db.phoneNumber.update({
            where: { id: phone.id },
            data: { status: 'released', releasedAt: now },
          }).catch(() => {});
          twilioReleaseCount++;
        }
        // Otherwise: number stays in vapi_released — cron will retry next run
      }
    }

    return NextResponse.json({
      ok: true,
      releasedReservations,
      phoneRelease: {
        vapiDetachCount,
        vapiDeleteCount,
        twilioReleaseCount,
        failedReleases,
      },
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
