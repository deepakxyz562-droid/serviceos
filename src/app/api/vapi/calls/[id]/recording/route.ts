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

    const call = await db.aiCall.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: {
        vapiCallId: true,
        recordingUrl: true,
        stereoRecordingUrl: true,
      },
    });

    if (!call) {
      return new Response('Call not found', { status: 404 });
    }

    // ── Resolve the actual audio stream URL ──────────────────────────────
    // The DB-stored recordingUrl may be:
    //   a) A Vapi API URL (needs auth → redirect → signed URL)
    //   b) A direct signed cloud URL (fetchable directly)
    //   c) Null (resolve from Vapi API using vapiCallId)

    let recordingUrl: string | null = call.recordingUrl || call.stereoRecordingUrl || null;

    // If the stored URL is a Vapi API URL, we need to resolve it to a
    // signed cloud URL first (it requires Bearer auth and returns a redirect).
    const isVapiApiUrl = recordingUrl?.includes('api.vapi.ai');

    // If no stored URL, or if it's a Vapi API URL that needs resolution,
    // resolve via the Vapi API
    if (!recordingUrl || isVapiApiUrl) {
      if (!call.vapiCallId) {
        return new Response('No recording available for this call', { status: 404 });
      }

      const platformKey = await getDecryptedApiKey('VAPI');
      const apiKey = platformKey || process.env.VAPI_PRIVATE_API_KEY;

      if (!apiKey) {
        console.error('[Recording Proxy] Vapi API key not configured');
        return new Response('Recording service not configured', { status: 503 });
      }

      // Try Vapi API endpoints for the recording
      const endpoints = [
        `https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`,
        `https://api.vapi.ai/call/${call.vapiCallId}/recording`,
      ];

      for (const endpoint of endpoints) {
        try {
          const vapiRes = await fetch(endpoint, {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}` },
            redirect: 'manual',
          });

          // Vapi returns a 302 redirect to a signed cloud storage URL
          const location = vapiRes.headers.get('location');
          if (location) {
            recordingUrl = location;
            break;
          }

          // Some Vapi responses return 200 with JSON body containing URL
          if (vapiRes.status === 200) {
            const contentType = vapiRes.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await vapiRes.json();
              if (data?.url) {
                recordingUrl = data.url;
                break;
              }
              if (data?.recordingUrl) {
                recordingUrl = data.recordingUrl;
                break;
              }
            } else if (contentType.startsWith('audio/')) {
              // The API returned the audio directly — stream it through
              const responseHeaders = new Headers({
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'private, max-age=3600',
              });

              const contentRange = vapiRes.headers.get('content-range');
              if (contentRange) responseHeaders.set('Content-Range', contentRange);
              const contentLength = vapiRes.headers.get('content-length');
              if (contentLength) responseHeaders.set('Content-Length', contentLength);

              return new Response(vapiRes.body, {
                status: vapiRes.status,
                headers: responseHeaders,
              });
            }
          }
        } catch (err) {
          console.warn(`[Recording Proxy] Vapi endpoint ${endpoint} failed:`, err);
        }
      }
    }

    if (!recordingUrl) {
      return new Response('Recording not available', { status: 404 });
    }

    // ── Fetch the recording with Range header forwarded ─────────────────
    // The browser's <audio> element ALWAYS sends Range requests. We must
    // forward them on the FIRST fetch to get the correct 206 response.
    const upstreamHeaders: Record<string, string> = {};

    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(recordingUrl, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      console.error(
        `[Recording Proxy] Upstream fetch failed: ${upstreamRes.status} ${upstreamRes.statusText}`
      );
      return new Response('Recording unavailable', { status: 502 });
    }

    // ── Build response headers ──────────────────────────────────────────
    const responseHeaders = new Headers();

    const contentType = upstreamRes.headers.get('content-type') || 'audio/mpeg';
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

    // ── Stream the response ─────────────────────────────────────────────
    // Use the SAME status code as the upstream (200 for full, 206 for partial).
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Recording Proxy Error]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
