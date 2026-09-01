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
 * If the proxy returns 200 OK for a Range request, the audio element
 * disables the play button (the "play disabled in milliseconds" bug).
 *
 * This proxy is needed because:
 * 1. Vapi's recording URLs require API key authentication
 * 2. The signed URLs stored in the DB may expire
 * 3. Cross-origin (CORS) issues prevent direct <audio src={url}> playback
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user session
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    // 2. Fetch call from DB to verify ownership + get recording URLs
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

    // 3. Resolve the recording URL (DB-stored or Vapi API)
    let recordingUrl: string | null = call.recordingUrl || call.stereoRecordingUrl || null;

    if (!recordingUrl) {
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

          const location = vapiRes.headers.get('location');
          if (location) {
            recordingUrl = location;
            break;
          }

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

    // 4. Forward the request to the upstream URL, INCLUDING the Range header.
    //    The browser's <audio> element ALWAYS sends Range requests. We must
    //    forward them on the FIRST fetch — NOT do a second fetch afterward
    //    (the old dual-fetch approach caused the "play button disabled" bug).
    const upstreamHeaders: Record<string, string> = {};

    // Forward the Range header from the browser to the upstream
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

    // 5. Build the response headers, forwarding all audio-relevant headers
    //    from the upstream response
    const responseHeaders = new Headers();

    // Content-Type — preserve from upstream, default to audio/mpeg
    const contentType = upstreamRes.headers.get('content-type') || 'audio/mpeg';
    responseHeaders.set('Content-Type', contentType);

    // Accept-Ranges — tell the browser we support Range requests
    responseHeaders.set('Accept-Ranges', 'bytes');

    // Content-Length — forward from upstream if present
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    // Content-Range — CRITICAL for 206 Partial Content responses.
    //    Without this, the audio element can't determine the total file
    //    size and disables playback.
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    // Cache control — allow browser to cache the recording for 1 hour
    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    // 6. Stream the response back to the browser.
    //    Use the SAME status code as the upstream (200 for full, 206 for partial).
    //    This is critical — if the browser sent Range and the upstream returned 206,
    //    we must return 206 too (not 200).
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Recording Proxy Error]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
