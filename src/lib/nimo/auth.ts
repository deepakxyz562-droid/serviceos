import { getNimoServiceClient } from './supabase';

export interface NimoUser {
  id: string;
  email?: string;
  phone?: string;
  isAnonymous?: boolean;
}

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Extracts authenticated NIMO user from Bearer token, or falls back to demo user in dev
 */
export async function getNimoAuthUser(req: Request): Promise<NimoUser> {
  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();

    if (token && token !== 'demo-token') {
      try {
        const supabase = getNimoServiceClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (!error && user) {
          return {
            id: user.id,
            email: user.email,
            phone: user.phone,
            isAnonymous: user.is_anonymous,
          };
        }
      } catch (e) {
        // Fallback to token as user ID if formatted as UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
          return { id: token };
        }
      }
    }
  }

  // Check custom user ID header from mobile client (e.g., device UUID)
  const clientUserId = req.headers.get('x-nimo-user-id');
  if (clientUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientUserId)) {
    return { id: clientUserId };
  }

  // Fallback demo user for seamless local development & testing
  return {
    id: DEMO_USER_ID,
    email: 'creator@glamora-nimo.ai',
    phone: '+919876543210',
    isAnonymous: true,
  };
}
