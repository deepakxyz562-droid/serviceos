import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { getAuthUser } from '@/lib/auth';
import { checkWhatsAppCredits, deductWhatsAppCredit } from '@/lib/credit-management';

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────────────────────
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, message, type, credentialId, templateLanguage, templateName } = body;

    if (!to || !message) {
      return NextResponse.json({ error: 'to and message are required' }, { status: 400 });
    }

    // ── Credit check ──────────────────────────────────────────────────
    if (user.tenantId) {
      const creditCheck = await checkWhatsAppCredits(user.tenantId);

      if (!creditCheck.allowed) {
        return NextResponse.json(
          {
            error: creditCheck.reason || 'WhatsApp credits exhausted',
            creditExhausted: true,
            creditStatus: creditCheck,
          },
          { status: 403 },
        );
      }
    }

    // ── Send via the shared sendWhatsAppMessage utility ─────────────────
    // This resolves credentials from: CommunicationProvider (tenant → platform fallback) → Credential → env vars
    const result = await sendWhatsAppMessage({
      to,
      message,
      credentialId,
      type: type || 'text',
      templateName,
      templateLanguage,
      tenantId: user.tenantId || undefined,
    });

    if (result.success) {
      // ── Deduct credit on successful send ───────────────────────────
      if (user.tenantId) {
        await deductWhatsAppCredit(user.tenantId, 1).catch(err =>
          console.error('[WhatsAppSend] Credit deduction failed:', err)
        );
      }

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        simulated: result.simulated || false,
        credentialUsed: result.credentialUsed,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          credentialUsed: result.credentialUsed,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
  }
}
