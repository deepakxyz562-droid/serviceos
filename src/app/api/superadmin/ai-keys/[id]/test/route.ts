import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { decryptKey } from '@/lib/ai-key-crypto';

/**
 * POST /api/superadmin/ai-keys/[id]/test
 *
 * Validates a stored key by issuing a minimal request to the upstream
 * provider and recording the outcome on the AiProviderKey row.
 *
 * Per-provider test endpoints (all use a 10s AbortController timeout):
 *   - openrouter: GET https://openrouter.ai/api/v1/auth/key (Bearer)
 *   - openai:     GET https://api.openai.com/v1/models        (Bearer)
 *   - anthropic:  POST https://api.anthropic.com/v1/messages  (x-api-key, 1-token call)
 *   - gemini:     GET https://generativelanguage.googleapis.com/v1/models?key=<key>
 *
 * Response (always HTTP 200 so the client can surface the error message):
 *   success: { success: true, message: 'Key is valid' }
 *   failure: { success: false, error: '<detail>' }
 *
 * Side effects:
 *   - On success: sets `lastUsedAt = now`.
 *   - On failure: sets `lastErrorAt = now` and `lastError = <detail>`.
 *
 * NOTE: the HTTP layer is 200 even on failure — the success flag carries the
 * signal so the UI can render a friendly error string instead of a generic
 * "request failed" toast.
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

const TEST_TIMEOUT_MS = 10_000;

/** Brief error string suitable for storing in `lastError`. */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500) || 'Unknown error';
  }
  return String(error).slice(0, 500) || 'Unknown error';
}

/** Fetch with a hard timeout — resolves to the Response or throws AbortError. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = TEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Extract a useful error string from a non-OK upstream response. */
async function extractUpstreamError(res: Response): Promise<string> {
  let snippet = '';
  try {
    const text = await res.text();
    snippet = text ? ` — ${text.slice(0, 300)}` : '';
  } catch {
    /* ignore body read errors */
  }
  return `Upstream returned ${res.status} ${res.statusText}${snippet}`;
}

/**
 * Run the provider-specific validation call. Returns true on success, throws
 * with a meaningful Error on any failure (network, timeout, non-2xx, etc.).
 */
async function testProviderKey(provider: string, plaintextKey: string): Promise<void> {
  switch (provider) {
    case 'openrouter': {
      const res = await fetchWithTimeout('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: { Authorization: `Bearer ${plaintextKey}` },
      });
      if (!res.ok) throw new Error(await extractUpstreamError(res));
      return;
    }
    case 'openai': {
      const res = await fetchWithTimeout('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${plaintextKey}` },
      });
      if (!res.ok) throw new Error(await extractUpstreamError(res));
      return;
    }
    case 'anthropic': {
      const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': plaintextKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      // Anthropic returns 401 on bad keys, 400 on bad request, 429 on rate-limit.
      // Treat anything non-2xx as a failure — the body contains the reason.
      if (!res.ok) throw new Error(await extractUpstreamError(res));
      return;
    }
    case 'gemini': {
      const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(plaintextKey)}`;
      const res = await fetchWithTimeout(url, { method: 'GET' });
      if (!res.ok) throw new Error(await extractUpstreamError(res));
      return;
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const row = await db.aiProviderKey.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: 'AI provider key not found' }, { status: 404 });
    }

    // Decrypt the stored key. If decryption fails (rotated ENCRYPTION_KEY,
    // tampered ciphertext, etc.) record the error and report failure.
    let plaintextKey: string;
    try {
      plaintextKey = decryptKey(row.encryptedKey);
    } catch (decryptError) {
      const detail = `Decryption failed: ${describeError(decryptError)}`;
      await db.aiProviderKey.update({
        where: { id },
        data: { lastErrorAt: new Date(), lastError: detail },
      });
      return NextResponse.json({ success: false, error: detail });
    }

    try {
      await testProviderKey(row.provider, plaintextKey);
    } catch (testError) {
      const detail = describeError(testError);
      await db.aiProviderKey.update({
        where: { id },
        data: { lastErrorAt: new Date(), lastError: detail },
      });
      // HTTP 200 so the client can show the specific error message.
      return NextResponse.json({ success: false, error: detail });
    }

    await db.aiProviderKey.update({
      where: { id },
      data: { lastUsedAt: new Date(), lastError: null, lastErrorAt: null },
    });

    return NextResponse.json({ success: true, message: 'Key is valid' });
  } catch (error) {
    console.error('[SuperAdmin AI Keys test] Error:', error);
    return NextResponse.json({ error: 'Failed to test AI provider key' }, { status: 500 });
  }
}
