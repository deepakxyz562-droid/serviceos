import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0';

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, type, credentialId, interactive, templateLanguage, templateName } = body;

    if (!to || !message) {
      return NextResponse.json({ error: 'to and message are required' }, { status: 400 });
    }

    // If a credential ID is provided, use real WhatsApp API
    if (credentialId) {
      const credential = await db.credential.findUnique({ where: { id: credentialId } });
      if (!credential) {
        return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
      }

      const credData = safeJsonParse(credential.encryptedData, {}) as Record<string, string>;
      const accessToken = credData.accessToken;
      const phoneNumberId = credData.phoneNumberId;

      if (!accessToken || !phoneNumberId) {
        return NextResponse.json(
          { error: 'WhatsApp credential is incomplete. Access Token and Phone Number ID are required.' },
          { status: 400 },
        );
      }

      // Build WhatsApp API payload
      let recipientPhone = to.replace(/\D/g, '');
      // Auto-correct: if phone number is 10 digits (common Indian format without country code),
      // prepend 91 (India country code). This handles cases like 8505945123 → 918505945123
      if (/^\d{10}$/.test(recipientPhone)) {
        recipientPhone = `91${recipientPhone}`;
      }
      let payload: any;

      if (type === 'interactive' && interactive) {
        payload = {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'interactive',
          interactive,
        };
      } else if (type === 'template') {
        payload = {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'template',
          template: {
            name: templateName || message,
            language: { code: templateLanguage || 'en_US' },
          },
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'text',
          text: { body: message, preview_url: false },
        };
      }

      // Call the WhatsApp Business Cloud API
      const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('WhatsApp API error:', responseData);
        const errorCode = responseData?.error?.code;
        let errorMessage = responseData?.error?.message || `WhatsApp API error: ${response.status}`;

        // Provide user-friendly guidance for common error codes
        if (errorCode === 131030) {
          errorMessage = `Recipient phone number "${recipientPhone}" not in allowed list. Add this number as a test contact in Meta Business Suite > WhatsApp > Phone Numbers, or use a template message instead.`;
        } else if (errorCode === 131000) {
          errorMessage = `Invalid phone number "${recipientPhone}". Include country code (e.g., 91XXXXXXXXXX for India) with no spaces or plus sign.`;
        } else if (errorCode === 132000) {
          errorMessage = `Template parameter mismatch. Check your template definition in Meta Business Suite.`;
        } else if (errorCode === 190 || response.status === 401) {
          const errorSubcode = responseData?.error?.error_subcode;
          const isExpired = String(errorSubcode) === '463' || (responseData?.error?.message || '').includes('expired');
          if (isExpired) {
            errorMessage = `Your WhatsApp access token has EXPIRED. Generate a new one: Meta Business Suite → System Users → Generate New Token (select whatsapp_business_messaging permission). Then update the credential in FlowForge.`;
          } else {
            errorMessage = `WhatsApp access token is invalid. Please generate a new token in Meta Business Suite and update it in FlowForge.`;
          }
        }

        return NextResponse.json(
          {
            error: errorMessage,
            errorCode: String(errorCode || ''),
            details: responseData,
          },
          { status: response.status },
        );
      }

      return NextResponse.json(responseData);
    }

    // Without a credential, return a simulated response
    const simulatedResponse = {
      messaging_product: 'whatsapp',
      contacts: [
        {
          input: to,
          wa_id: to.replace(/\D/g, ''),
        },
      ],
      messages: [
        {
          id: `wamid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          status: 'sent',
        },
      ],
      metadata: {
        type: type || 'text',
        timestamp: new Date().toISOString(),
        simulated: true,
        note: 'No credential provided. Configure a WhatsApp credential for real message delivery.',
      },
    };

    return NextResponse.json(simulatedResponse);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
  }
}
