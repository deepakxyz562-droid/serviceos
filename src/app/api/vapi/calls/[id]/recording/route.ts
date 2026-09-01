import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';

/**
 * GET /api/vapi/calls/[id]/recording
 *
 * Streams the call recording audio to the browser with full Range support.
 *
 * CRITICAL: The browser's <audio> element sends `Range: bytes=0-` on the
 * initial request. The proxy MUST forward this to the upstream and return
 * the upstream's status code (206 Partial Content) + Content-Range header.
 *
 * This proxy handles two recording URL types:
 * 1. Vapi API URLs (https://api.vapi.ai/...) — require Bearer auth + return
 *    a redirect to a signed cloud storage URL. The proxy follows the
 *    redirect with auth, then streams the signed URL's response.
 * 2. Direct signed URLs (https://storage.googleapis.com/...) — can be
 *    fetched directly without auth.
 *
 * In both cases, Range headers are forwarded to ensure the audio element
 * gets the correct 206 Partial Content response.
 */

async function getVapiApiKey(): Promise<string | null> {
  try {
    const platformKey = await getDecryptedApiKey('VAPI');
    if (platformKey) return platformKey;
  } catch (err) {
    console.warn('[Recording Proxy] getDecryptedApiKey failed, checking env:', err);
  }
  return process.env.VAPI_PRIVATE_API_KEY || null;
}

async function resolveFreshVapiRecordingUrl(vapiCallId: string, apiKey: string): Promise<string | null> {
  const endpoints = [
    `https://api.vapi.ai/call/${vapiCallId}/mono-recording`,
    `https://api.vapi.ai/call/${vapiCallId}/recording`,
  ];

  for (const endpoint of endpoints) {
    try {
      const vapiRes = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        redirect: 'manual',
      });

      // 302 redirect contains the active presigned R2/S3 URL
      const location = vapiRes.headers.get('location');
      if (location) {
        return location;
      }

      if (vapiRes.status === 200) {
        const contentType = vapiRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await vapiRes.json();
          if (data?.url) return data.url;
          if (data?.recordingUrl) return data.recordingUrl;
        }
      }
    } catch (err) {
      console.warn(`[Recording Proxy] Vapi endpoint ${endpoint} failed:`, err);
    }
  }

  // Fallback: fetch call object directly
  try {
    const callRes = await fetch(`https://api.vapi.ai/call/${vapiCallId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (callRes.ok) {
      const callData = await callRes.json();
      const possibleUrl = callData?.artifact?.recordingUrl || callData?.recordingUrl || callData?.stereoRecordingUrl;
      // If it contains presigned params, return it
      if (possibleUrl && (possibleUrl.includes('X-Amz-Signature') || possibleUrl.includes('Signature='))) {
        return possibleUrl;
      }
    }
  } catch (err) {
    console.warn('[Recording Proxy] Vapi call lookup failed:', err);
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    // Resilient lookup: match by id OR vapiCallId
    const call = await db.aiCall.findFirst({
      where: {
        tenantId: auth.tenantId,
        OR: [
          { id },
          { vapiCallId: id },
        ],
      },
      select: {
        id: true,
        vapiCallId: true,
        recordingUrl: true,
        stereoRecordingUrl: true,
      },
    });

    if (!call) {
      return new Response('Call not found', { status: 404 });
    }

    const apiKey = await getVapiApiKey();

    let targetUrl: string | null = null;

    // If we have a vapiCallId and API key, prefer resolving a fresh presigned URL directly
    if (call.vapiCallId && apiKey) {
      targetUrl = await resolveFreshVapiRecordingUrl(call.vapiCallId, apiKey);
    }

    // If not resolved from Vapi API, check stored DB URL
    if (!targetUrl) {
      const storedUrl = call.recordingUrl || call.stereoRecordingUrl;
      if (storedUrl && !storedUrl.includes('api.vapi.ai')) {
        targetUrl = storedUrl;
      }
    }

    if (!targetUrl) {
      return new Response('No recording available for this call', { status: 404 });
    }

    // Forward Range header from browser
    const upstreamHeaders: Record<string, string> = {};
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    let upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    // If upstream fetch failed (e.g. 400 Bad Request on expired URL) and we haven't tried Vapi API yet, retry with Vapi API
    if (!upstreamRes.ok && upstreamRes.status !== 206 && call.vapiCallId && apiKey) {
      console.warn(`[Recording Proxy] Direct fetch returned ${upstreamRes.status}, retrying via Vapi API`);
      const freshUrl = await resolveFreshVapiRecordingUrl(call.vapiCallId, apiKey);
      if (freshUrl && freshUrl !== targetUrl) {
        targetUrl = freshUrl;
        upstreamRes = await fetch(targetUrl, {
          method: 'GET',
          headers: upstreamHeaders,
          redirect: 'follow',
        });
      }
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      console.error(
        `[Recording Proxy] Upstream fetch failed: ${upstreamRes.status} ${upstreamRes.statusText}`
      );
      return new Response('Recording unavailable', { status: 502 });
    }

    // Build response headers with audio range streaming support
    const responseHeaders = new Headers();
    const contentType = upstreamRes.headers.get('content-type') || 'audio/wav';
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Accept-Ranges', 'bytes');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Recording Proxy Error]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
