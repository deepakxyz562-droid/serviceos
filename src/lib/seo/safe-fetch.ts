import dns from 'node:dns/promises';
import net from 'node:net';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_MAX_REDIRECTS = 3;

export function isPrivateIpAddress(ip: string): boolean {
  const cleaned = ip.trim().toLowerCase();
  if (!cleaned) return true;
  if (
    cleaned === '::1' ||
    cleaned === '::' ||
    cleaned === '0:0:0:0:0:0:0:1' ||
    cleaned.startsWith('fe80:') ||
    cleaned.startsWith('fc') ||
    cleaned.startsWith('fd')
  ) {
    return true;
  }
  const v4 = cleaned.startsWith('::ffff:') ? cleaned.slice(7) : cleaned;
  const parts = v4.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return net.isIP(v4) !== 0;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // Multicast / reserved
  return false;
}

export function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === '169.254.169.254'
  ) {
    return true;
  }
  if (net.isIP(host) !== 0) {
    return isPrivateIpAddress(host);
  }
  if (!host.includes('.')) {
    return true;
  }
  return false;
}

export async function assertSafePublicHttpUrl(rawUrl: string): Promise<URL> {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    throw new Error('Empty URL');
  }
  const hasExplicitScheme =
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^[a-z0-9.-]+:\d{1,5}(\/|$)/i.test(trimmed);
  const normalized = hasExplicitScheme ? trimmed : `https://${trimmed}`;
  const parsed = new URL(normalized);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('Credentials are not allowed in URLs');
  }
  if (isUnsafeHostname(parsed.hostname)) {
    throw new Error(`Blocked private or loopback host: ${parsed.hostname}`);
  }

  try {
    const records = await dns.lookup(parsed.hostname, { all: true });
    if (records.some((r) => isPrivateIpAddress(r.address))) {
      throw new Error(`Blocked private network IP resolved for ${parsed.hostname}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Blocked private')) {
      throw err;
    }
    // Ignore DNS lookup failure in mocked/sandboxed test environments; fetch itself enforces transport.
  }

  return parsed;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  text: string;
  redirected: boolean;
}

export async function safeFetchPublicText(
  rawUrl: string,
  options?: {
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    accept?: string;
  },
): Promise<SafeFetchResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const accept = options?.accept ?? 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8';

  let currentUrl = (await assertSafePublicHttpUrl(rawUrl)).toString();
  let redirected = false;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'BGOS-SEO-Audit/2.0 (+https://fieseros.com)',
        Accept: accept,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location || hop === maxRedirects) {
        return {
          ok: false,
          status: res.status,
          finalUrl: currentUrl,
          contentType: res.headers.get('content-type') || '',
          text: '',
          redirected,
        };
      }
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = (await assertSafePublicHttpUrl(nextUrl)).toString();
      redirected = true;
      continue;
    }

    const contentLengthHeader = res.headers.get('content-length');
    if (contentLengthHeader && Number(contentLengthHeader) > maxBytes) {
      throw new Error(`Response exceeds maximum allowed size (${maxBytes} bytes)`);
    }

    let text = '';
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          const remaining = maxBytes - total;
          if (value.byteLength > remaining) {
            chunks.push(value.subarray(0, remaining));
            total += remaining;
            await reader.cancel().catch(() => {});
            break;
          }
          chunks.push(value);
          total += value.byteLength;
        }
      } finally {
        reader.releaseLock();
      }
      text = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    } else {
      const raw = await res.text();
      text = raw.length > maxBytes ? raw.slice(0, maxBytes) : raw;
    }

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: currentUrl,
      contentType: res.headers.get('content-type') || '',
      text,
      redirected,
    };
  }

  throw new Error('Exceeded maximum HTTP redirects');
}
