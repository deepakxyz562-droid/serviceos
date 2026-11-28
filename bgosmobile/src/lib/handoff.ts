import { ApiError, apiRequest, refreshSession } from './api';

/**
 * Fetches a short-lived (60s) single-use mobile handoff ticket from the server
 * so browser/OAuth/print redirects never pass long-lived Bearer JWTs in URL query params.
 */
export async function getMobileHandoffTicket(): Promise<string | null> {
  const fetchTicket = async () => {
    const res = await apiRequest<{ ticket?: string }>('/api/bgos/mobile-auth/handoff', {
      method: 'POST',
      retryTransient: 1,
    });
    return typeof res?.ticket === 'string' && res.ticket ? res.ticket : null;
  };

  try {
    return await fetchTicket();
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      try {
        await refreshSession();
        return await fetchTicket();
      } catch {
        return null;
      }
    }
    return null;
  }
}
