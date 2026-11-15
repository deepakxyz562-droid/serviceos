import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NIMO_CONFIG } from './config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.fieseros.com';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let cachedServiceClient: SupabaseClient | null = null;
let cachedAnonClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client with the service role key scoped to schema 'nimo'
 */
export function getNimoServiceClient(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient;

  cachedServiceClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: NIMO_CONFIG.schema as any,
    },
  });

  return cachedServiceClient;
}

/**
 * Returns a Supabase client scoped to schema 'nimo' for authenticated users
 */
export function getNimoUserClient(accessToken?: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: NIMO_CONFIG.schema as any,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  });
}
