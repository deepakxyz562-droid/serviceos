import { apiRequest } from './api';

/**
 * Fetches a short-lived (60s) single-use mobile handoff ticket from the server
 * so browser/OAuth/print redirects never pass long-lived Bearer JWTs in URL query params.
 */
export async function getMobileHandoffTicket(): Promise<string | null> {
  try {
    const res = await apiRequest<{ ticket?: string }>('/api/bgos/mobile-auth/handoff', {
      method: 'POST',
    });
    return typeof res?.ticket === 'string' && res.ticket ? res.ticket : null;
  } catch {
    return null;
  }
}
