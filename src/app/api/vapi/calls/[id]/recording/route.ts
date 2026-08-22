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

    // 4. Request the mono recording signed URL from Vapi API
    // Vapi returns a 302 redirect. We fetch it with redirect: 'manual' to get the Location header.
    const vapiRes = await fetch(`https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      redirect: 'manual', // Do not automatically follow the redirect
    });

    const location = vapiRes.headers.get('location');
    if (!location) {
      // If Vapi returned a normal 200 response with a URL or didn't redirect:
      if (vapiRes.status === 200) {
        const finalUrl = vapiRes.url;
        if (finalUrl && finalUrl !== `https://api.vapi.ai/call/${call.vapiCallId}/mono-recording`) {
          return NextResponse.redirect(finalUrl, 307);
        }
      }
      console.error(`[Vapi Recording Proxy] failed to resolve redirect. Status: ${vapiRes.status}`);
      return new Response('Recording unavailable', { status: 500 });
    }

    // 5. Redirect the browser to the short-lived signed R2 URL
    return NextResponse.redirect(location, 307);
  } catch (error) {
    console.error('[Vapi Recording Proxy Error]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
