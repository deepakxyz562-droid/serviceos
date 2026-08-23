import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getDecryptedApiKey } from '@/lib/ai-provider-config-service';

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

    // 2. Fetch call from DB to verify ownership and resolve vapiCallId
    const call = await db.aiCall.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: { vapiCallId: true },
    });

    if (!call || !call.vapiCallId) {
      return new Response('Recording not found', { status: 404 });
    }

    // 3. Resolve Vapi Private API Key
    const platformKey = await getDecryptedApiKey('VAPI');
    const apiKey = platformKey || process.env.VAPI_PRIVATE_API_KEY;

    if (!apiKey) {
      return new Response('Vapi API Key not configured', { status: 503 });
    }

    // 4. Fetch the signed R2 URL from Vapi (follows redirect automatically)
    const vapiRes = await fetch(`https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      // Let fetch follow the redirect to get the actual audio bytes from R2
      redirect: 'follow',
    });

    if (!vapiRes.ok || !vapiRes.body) {
      console.error(`[Vapi Recording Proxy] failed. Status: ${vapiRes.status}`);
      return new Response('Recording unavailable', { status: 502 });
    }

    // 5. Stream the audio bytes directly to the browser.
    //    This avoids cross-origin redirect issues with <audio> elements — the
    //    browser sees a same-origin response and can range-request, seek, and
    //    play without CORS problems.
    const contentType = vapiRes.headers.get('content-type') || 'audio/wav';
    const contentLength = vapiRes.headers.get('content-length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'Accept-Ranges': 'bytes',
    };
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new Response(vapiRes.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[Vapi Recording Proxy Error]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
