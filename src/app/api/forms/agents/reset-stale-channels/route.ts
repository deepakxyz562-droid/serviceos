import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/forms/agents/reset-stale-channels
 * ─────────────────────────────────────────────────────────────────────────
 * One-time cleanup endpoint (Phase 0 of the channel audit).
 *
 * Clears stale demo/placeholder values that may have been persisted in
 * `FormAgent.configJson` by older versions of the agent preset, e.g.:
 *   - channels.phone.phoneNumber   ("+1 (800) 555-LOAN" etc.)
 *   - channels.sms.phoneNumber     ("+1 (555) 345-6789" etc.)
 *   - channels.instagram.accountHandle ("@loan_advisor_ai" etc.)
 *
 * Also resets the `enabled` flag to `false` for paid/config-required
 * channels (phone, sms, crm) on every FormAgent row, since these should
 * only be ON after a real PhoneNumber / TenantAddonSubscription exists.
 *
 * Idempotent: safe to call multiple times. Only touches channel fields,
 * never the knowledge base, prompt, or other agent config.
 *
 * Auth: any authenticated tenant user. Scoped to the caller's tenant.
 */
export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = authUser.tenantId;

    const agents = await db.formAgent.findMany({
      where: { tenantId },
      select: { id: true, configJson: true },
    });

    let updated = 0;
    for (const agent of agents) {
      let cfg: any = {};
      try {
        cfg = agent.configJson ? JSON.parse(agent.configJson) : {};
      } catch {
        continue;
      }
      if (!cfg.channels || typeof cfg.channels !== 'object') continue;

      let changed = false;

      // Clear stale phone number + force disabled (paid addon)
      if (cfg.channels.phone) {
        if (cfg.channels.phone.phoneNumber) {
          cfg.channels.phone.phoneNumber = '';
          changed = true;
        }
        if (cfg.channels.phone.enabled !== false) {
          cfg.channels.phone.enabled = false;
          changed = true;
        }
      }

      // Clear stale SMS number + force disabled (requires provisioned number)
      if (cfg.channels.sms) {
        if (cfg.channels.sms.phoneNumber) {
          cfg.channels.sms.phoneNumber = '';
          changed = true;
        }
        if (cfg.channels.sms.enabled !== false) {
          cfg.channels.sms.enabled = false;
          changed = true;
        }
      }

      // Clear stale Instagram handle (no real connection yet)
      if (cfg.channels.instagram) {
        if (cfg.channels.instagram.accountHandle) {
          cfg.channels.instagram.accountHandle = '';
          changed = true;
        }
        if (cfg.channels.instagram.enabled !== false) {
          cfg.channels.instagram.enabled = false;
          changed = true;
        }
      }

      // WhatsApp reads from CommunicationProvider at runtime; clear any
      // stale phoneNumber field — the real value comes from the provider row.
      if (cfg.channels.whatsapp) {
        if (cfg.channels.whatsapp.phoneNumber) {
          cfg.channels.whatsapp.phoneNumber = '';
          changed = true;
        }
      }

      // CRM requires an explicit provider choice — default OFF
      if (cfg.channels.crm && cfg.channels.crm.enabled !== false) {
        cfg.channels.crm.enabled = false;
        changed = true;
      }

      if (changed) {
        await db.formAgent.update({
          where: { id: agent.id },
          data: { configJson: JSON.stringify(cfg) },
        });
        updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      inspected: agents.length,
      updated,
      message:
        updated > 0
          ? `Cleared stale channel demo data on ${updated} agent(s).`
          : 'No stale channel data found — all agents already clean.',
    });
  } catch (error) {
    console.error('[POST /api/forms/agents/reset-stale-channels] error:', error);
    return NextResponse.json(
      { error: 'Failed to reset stale channel data' },
      { status: 500 }
    );
  }
}
