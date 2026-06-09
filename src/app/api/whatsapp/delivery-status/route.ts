import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0';

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * GET /api/whatsapp/delivery-status
 * Check the delivery status of a WhatsApp message by querying the WhatsApp API.
 *
 * Query params:
 *  - messageId: The WhatsApp message ID (wamid) to check
 *  - credentialId: The credential to use for API access
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const credentialId = searchParams.get('credentialId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    if (!credentialId) {
      return NextResponse.json({ error: 'credentialId is required' }, { status: 400 });
    }

    // Load credentials
    const credential = await db.credential.findUnique({ where: { id: credentialId } });
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const credData = safeJsonParse(credential.encryptedData, {}) as Record<string, string>;
    const accessToken = credData.accessToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token not found in credential' }, { status: 400 });
    }

    // Query WhatsApp API for message status
    const url = `${WHATSAPP_API_BASE}/${messageId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorCode = data?.error?.code;
      const errorMsg = data?.error?.message || `API error: ${response.status}`;

      // If the message ID endpoint doesn't work, try alternative approach
      // Some test apps don't have permission to query message status
      if (errorCode === 190 || response.status === 401) {
        return NextResponse.json({
          status: 'unknown',
          messageId,
          note: 'Cannot check delivery status: access token lacks permission to query message status. Delivery status updates are sent via webhook instead.',
        });
      }

      return NextResponse.json({
        status: 'unknown',
        messageId,
        error: errorMsg,
        errorCode: String(errorCode || ''),
      });
    }

    // Extract delivery status from the response
    const messageStatus = data?.statuses?.[0]?.status || data?.status || 'unknown';
    const timestamp = data?.statuses?.[0]?.timestamp || data?.timestamp;

    // Map WhatsApp status to user-friendly status
    const statusMap: Record<string, { label: string; description: string; delivered: boolean }> = {
      accepted: { label: 'Accepted', description: 'Message accepted by WhatsApp servers but not yet delivered to the recipient. This is normal immediately after sending.', delivered: false },
      sent: { label: 'Sent', description: 'Message sent to the recipient\'s device.', delivered: true },
      delivered: { label: 'Delivered', description: 'Message delivered to the recipient\'s device.', delivered: true },
      read: { label: 'Read', description: 'Message read by the recipient.', delivered: true },
      failed: { label: 'Failed', description: 'Message delivery failed. This usually happens when the recipient hasn\'t messaged your business number within the last 24 hours (for text/interactive messages). Try using a template message instead.', delivered: false },
      deleted: { label: 'Deleted', description: 'Message was deleted.', delivered: false },
      unknown: { label: 'Unknown', description: 'Could not determine delivery status. If the message was recently sent, wait a moment and check again.', delivered: false },
    };

    const statusInfo = statusMap[messageStatus] || statusMap.unknown;

    return NextResponse.json({
      status: messageStatus,
      label: statusInfo.label,
      description: statusInfo.description,
      delivered: statusInfo.delivered,
      messageId,
      timestamp,
      rawData: data,
    });
  } catch (error) {
    console.error('Error checking WhatsApp delivery status:', error);
    return NextResponse.json({ error: 'Failed to check delivery status' }, { status: 500 });
  }
}
