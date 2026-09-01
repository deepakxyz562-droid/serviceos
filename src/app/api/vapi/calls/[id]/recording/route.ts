import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';

/**
 * GET /api/vapi/calls/[id]/recording
 *
 * Streams the call recording audio to the browser.
 *
 * This proxy is needed because:
 * 1. Vapi's recording URLs require API key authentication
 * 2. The signed URLs stored in the DB may expire
 * 3. Cross-origin (CORS) issues prevent direct <audio src={url}> playback
 *
 * Flow:
 *   1. Authenticate user + verify call belongs to their tenant
 *   2. Check DB for stored recordingUrl (may be a signed URL)
 *   3. If DB URL exists + is HTTPS → fetch it and stream it back
 *   4. If DB URL missing/failed → call Vapi API for a fresh signed URL
 *   5. Stream the audio with proper Content-Type headers
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

    // 3. Try the DB-stored recording URL first (may still be valid)
    let recordingUrl: string | null = call.recordingUrl || call.stereoRecordingUrl || null;

    // 4. If no DB URL, try Vapi API for a fresh signed URL
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

          // Check for redirect (302/307) with Location header
          const location = vapiRes.headers.get('location');
          if (location) {
            recordingUrl = location;
            break;
          }

          // Check for 200 with a JSON body containing URL
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

    // 5. Fetch the recording and stream it back to the browser
    //    This fixes CORS issues — the browser never touches the cross-origin URL
    const audioRes = await fetch(recordingUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!audioRes.ok) {
      console.error(`[Recording Proxy] Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}`);
      return new Response('Recording unavailable', { status: 502 });
    }

    // 6. Stream the audio back with proper headers
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = audioRes.headers.get('content-length');

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600', // cache for 1 hour
      'Accept-Ranges': 'bytes',
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Copy range-related headers for seeking support
    const range = request.headers.get('range');
    if (range) {
      // Forward the range request to the upstream
      const rangedRes = await fetch(recordingUrl, {
        method: 'GET',
        headers: { Range: range },
        redirect: 'follow',
      });

      if (rangedRes.ok || rangedRes.status === 206) {
        const rangedHeaders = new Headers({
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
          'Accept-Ranges': 'bytes',
        });

        const contentRange = rangedRes.headers.get('content-range');
        if (contentRange) rangedHeaders.set('Content-Range', contentRange);
        const rangedLength = rangedRes.headers.get('content-length');
        if (rangedLength) rangedHeaders.set('Content-Length', rangedLength);

        return new Response(rangedRes.body, {
          status: rangedRes.status,
          headers: rangedHeaders,
        });
      }
    }

    return new Response(audioRes.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[Recording Proxy Error]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
