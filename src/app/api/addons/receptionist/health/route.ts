import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getReceptionistForTenant, getCurrentVersion, getActiveDeployment } from '@/lib/ai-receptionist-service';

/**
 * GET /api/addons/receptionist/health
 * ─────────────────────────────────────────────────────────────────────────
 * Returns a system health check for the AI Receptionist.
 *
 * Verifies the full call path is valid:
 *   Subscription → Phone Number → Twilio → Vapi → AI Deployment → Call Routing
 *
 * This uses the reconciliation infrastructure — it READS the DB state and
 * reports whether each component is healthy. It does NOT make external API
 * calls (that's the Superadmin reconcile job).
 *
 * ARCHITECTURAL INVARIANT (documented in Phase 9 contract):
 *   A phone number is "AI-active" only when ALL of these are valid:
 *     1. PhoneNumber.status = active
 *     2. PhoneConnection.status = ACTIVE, routingMode = AI_RECEPTIONIST
 *     3. PhoneNumber.vapiNumberId is set (Vapi binding exists)
 *     4. AiReceptionist.status = ACTIVE
 *     5. AiReceptionist.currentVersionId points to a PUBLISHED version
 *     6. That version has an AiProviderDeployment with status = ACTIVE
 *     7. AddonEntitlement.status = ACTIVE (subscription active)
 *
 *   Twilio number exists  ≠  AI active
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = user.tenantId;

    const checks: Array<{
      key: string;
      label: string;
      status: 'healthy' | 'warning' | 'error' | 'unknown';
      detail: string;
    }> = [];

    // ── 1. Subscription ──
    // Phase 9.8: Use a two-step lookup instead of a nested relation filter.
    // PostgREST (Supabase REST adapter) can't translate Prisma's nested
    // `where: { addonPlan: { addonProduct: { code: 'AI_RECEPTIONIST' } } }`
    // — it drops the nested filter and returns 0 rows.
    // Instead: find the AddonProduct by code, then query subscriptions by addonProductId.
    const addonProduct = await db.addonProduct.findUnique({
      where: { code: 'AI_RECEPTIONIST' },
      select: { id: true },
    });

    const subscription = addonProduct
      ? await db.tenantAddonSubscription.findFirst({
          where: {
            tenantId,
            addonProductId: addonProduct.id,
            status: { in: ['ACTIVE', 'PAST_DUE', 'SUSPENDED'] },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        })
      : null;

    if (!subscription) {
      checks.push({
        key: 'subscription',
        label: 'Subscription',
        status: 'error',
        detail: 'No AI Receptionist subscription found',
      });
    } else if (['ACTIVE', 'PAST_DUE'].includes(subscription.status)) {
      const rawEnd = subscription.currentPeriodEnd;
      const periodEndMs = rawEnd instanceof Date ? rawEnd.getTime() : typeof rawEnd === 'string' ? new Date(rawEnd).getTime() : null;
      const daysLeft = periodEndMs && !isNaN(periodEndMs)
        ? Math.ceil((periodEndMs - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      checks.push({
        key: 'subscription',
        label: 'Subscription',
        status: 'healthy',
        detail:
          subscription.status === 'ACTIVE'
            ? `Active${subscription.cancelAtPeriodEnd ? ' (cancels at period end)' : ''}${
                daysLeft !== null ? ` · ${daysLeft} days left` : ''
              }`
            : `Past due — ${daysLeft ?? 0} days left`,
      });
    } else {
      checks.push({
        key: 'subscription',
        label: 'Subscription',
        status: 'error',
        detail: `Subscription status: ${subscription.status}`,
      });
    }

    // ── 2. Receptionist ──
    const receptionist = await getReceptionistForTenant(tenantId);
    if (!receptionist) {
      checks.push({
        key: 'receptionist',
        label: 'AI Receptionist',
        status: 'error',
        detail: 'No receptionist configured',
      });
    } else if (receptionist.status === 'ACTIVE') {
      checks.push({
        key: 'receptionist',
        label: 'AI Receptionist',
        status: 'healthy',
        detail: `${receptionist.name} is active`,
      });
    } else if (receptionist.status === 'PAUSED') {
      checks.push({
        key: 'receptionist',
        label: 'AI Receptionist',
        status: 'warning',
        detail: `${receptionist.name} is paused`,
      });
    } else {
      checks.push({
        key: 'receptionist',
        label: 'AI Receptionist',
        status: 'warning',
        detail: `Status: ${receptionist.status}`,
      });
    }

    // ── 3. Active Deployment (Vapi assistant) ──
    let activeAssistantId: string | null = null;
    if (receptionist?.currentVersionId) {
      const currentVersion = await getCurrentVersion(tenantId, receptionist.id);
      if (currentVersion && currentVersion.status === 'PUBLISHED') {
        const deployment = await getActiveDeployment(tenantId, currentVersion.id);
        if (deployment && deployment.status === 'ACTIVE' && deployment.externalAssistantId) {
          activeAssistantId = deployment.externalAssistantId;
          checks.push({
            key: 'deployment',
            label: 'Vapi Deployment',
            status: 'healthy',
            detail: `Assistant deployed (v${currentVersion.versionNumber})`,
          });
        } else {
          checks.push({
            key: 'deployment',
            label: 'Vapi Deployment',
            status: 'error',
            detail: deployment
              ? `Deployment status: ${deployment.status}${deployment.lastError ? ` — ${deployment.lastError}` : ''}`
              : 'No active deployment for current version',
          });
        }
      } else {
        checks.push({
          key: 'deployment',
          label: 'Vapi Deployment',
          status: 'error',
          detail: currentVersion ? `Version status: ${currentVersion.status}` : 'No current version',
        });
      }
    } else {
      checks.push({
        key: 'deployment',
        label: 'Vapi Deployment',
        status: 'unknown',
        detail: 'No receptionist version published',
      });
    }

    // ── 4. Phone Number + Connection ──
    const phoneConnection = await db.phoneConnection.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        phoneNumber: {
          select: {
            id: true,
            number: true,
            displayName: true,
            status: true,
            providerSid: true,
            vapiNumberId: true,
            vapiAssistantId: true,
            monthlyCost: true,
            releaseScheduledAt: true,
            releaseAfter: true,
          },
        },
        externalPhoneNumber: {
          select: { e164: true, label: true, verificationStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let activeVapiNumberId: string | null = null;

    if (!phoneConnection) {
      checks.push({
        key: 'phone',
        label: 'Phone Number',
        status: 'error',
        detail: 'No active phone connection',
      });
      checks.push({
        key: 'routing',
        label: 'Call Routing',
        status: 'unknown',
        detail: 'No phone connection to route',
      });
      checks.push({
        key: 'vapi_binding',
        label: 'Vapi Binding',
        status: 'unknown',
        detail: 'No phone number bound',
      });
      checks.push({
        key: 'twilio',
        label: 'Twilio Connection',
        status: 'unknown',
        detail: 'No phone number',
      });
    } else {
      const phone = phoneConnection.phoneNumber;

      // Phone number status
      if (phone.status === 'active') {
        checks.push({
          key: 'phone',
          label: 'Phone Number',
          status: 'healthy',
          detail: `${phone.number}${phone.displayName ? ` (${phone.displayName})` : ''}`,
        });
      } else if (phone.status === 'release_pending') {
        checks.push({
          key: 'phone',
          label: 'Phone Number',
          status: 'warning',
          detail: `${phone.number} — release scheduled`,
        });
      } else {
        checks.push({
          key: 'phone',
          label: 'Phone Number',
          status: 'error',
          detail: `${phone.number} — status: ${phone.status}`,
        });
      }

      // Routing
      if (phoneConnection.routingMode === 'AI_RECEPTIONIST') {
        const fallbackDesc = phoneConnection.fallbackRoutingMode
          ? ` → fallback: ${phoneConnection.fallbackRoutingMode.toLowerCase().replace('_', ' ')}`
          : ' → fallback: voicemail';
        checks.push({
          key: 'routing',
          label: 'Call Routing',
          status: 'healthy',
          detail: `AI Receptionist${fallbackDesc}`,
        });
      } else {
        checks.push({
          key: 'routing',
          label: 'Call Routing',
          status: 'warning',
          detail: `Mode: ${phoneConnection.routingMode.replace('_', ' ').toLowerCase()} (AI not active)`,
        });
      }

      // Vapi binding
      if (phone.vapiNumberId) {
        activeVapiNumberId = phone.vapiNumberId;
        checks.push({
          key: 'vapi_binding',
          label: 'Vapi Binding',
          status: 'healthy',
          detail: 'Phone number imported to Vapi',
        });
      } else {
        checks.push({
          key: 'vapi_binding',
          label: 'Vapi Binding',
          status: 'error',
          detail: 'Phone number not bound to Vapi',
        });
      }

      // Twilio connection
      if (phone.providerSid) {
        checks.push({
          key: 'twilio',
          label: 'Twilio Connection',
          status: 'healthy',
          detail: 'Number provisioned on Twilio',
        });
      } else {
        checks.push({
          key: 'twilio',
          label: 'Twilio Connection',
          status: 'warning',
          detail: 'No Twilio SID (manually imported?)',
        });
      }
    }

    // ── 5. Entitlement (minutes) ──
    const entitlement = await db.addonEntitlement.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, includedSeconds: true, periodStart: true, periodEnd: true },
    });
    if (entitlement) {
      const ledgerAgg = await db.usageLedger.aggregate({
        where: {
          entitlementId: entitlement.id,
          periodStart: entitlement.periodStart,
          periodEnd: entitlement.periodEnd,
        },
        _sum: { quantitySeconds: true },
      });
      const usedSeconds = ledgerAgg._sum.quantitySeconds || 0;
      const remaining = Math.max(0, entitlement.includedSeconds - usedSeconds);
      const remainingMin = Math.floor(remaining / 60);
      checks.push({
        key: 'entitlement',
        label: 'AI Minutes',
        status: remaining > 0 ? 'healthy' : 'error',
        detail: remaining > 0 ? `${remainingMin} minutes remaining` : 'No minutes remaining',
      });
    } else {
      checks.push({
        key: 'entitlement',
        label: 'AI Minutes',
        status: 'error',
        detail: 'No active entitlement',
      });
    }

    // ── Overall AI-active status ──
    // A phone number is AI-active only when ALL of: subscription, receptionist,
    // deployment, phone (active), routing (AI), vapi_binding, entitlement are healthy.
    const requiredForAiActive = ['subscription', 'receptionist', 'deployment', 'phone', 'routing', 'vapi_binding', 'entitlement'];
    const requiredChecks = checks.filter((c) => requiredForAiActive.includes(c.key));
    const allHealthy = requiredChecks.every((c) => c.status === 'healthy');
    const hasErrors = requiredChecks.some((c) => c.status === 'error');

    const overall: 'active' | 'degraded' | 'inactive' = allHealthy
      ? 'active'
      : hasErrors
        ? 'inactive'
        : 'degraded';

    return NextResponse.json({
      overall,
      aiActive: allHealthy,
      checks,
      // Convenience for the Test Call feature: the Vapi assistant + number IDs
      // needed to initiate an outbound call (null if not ready).
      testCallReady: !!(activeAssistantId && activeVapiNumberId),
    });
  } catch (error) {
    console.error('[GET /api/addons/receptionist/health] error:', error);
    return NextResponse.json({ error: 'Failed to run health check' }, { status: 500 });
  }
}
