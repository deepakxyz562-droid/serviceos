/**
 * API client for the QuoteFlow suite inside ServiceOS.
 * Automatically prefixes requests to /api/quote-flow/*
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  let resolvedPath = path;
  if (!resolvedPath.startsWith('/api/quote-flow/')) {
    if (resolvedPath.startsWith('/api/commerce/')) {
      // Direct commerce API route
    } else if (resolvedPath.startsWith('/api/')) {
      resolvedPath = resolvedPath.replace('/api/', '/api/quote-flow/');
    } else {
      resolvedPath = `/api/quote-flow${resolvedPath.startsWith('/') ? '' : '/'}${resolvedPath}`;
    }
  }

  const res = await fetch(resolvedPath, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    credentials: 'include',
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new ApiError(data?.error || data?.message || `Request failed: ${res.status}`, res.status);
  }
  return data as T;
}

export const apiPost = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const apiPatch = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });

export const apiDelete = <T = any>(path: string) =>
  api<T>(path, { method: 'DELETE' });
