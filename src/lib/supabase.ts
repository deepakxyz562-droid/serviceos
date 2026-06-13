/**
 * Supabase Client Module
 *
 * This module provides a Supabase client that can be used alongside Prisma.
 * When Supabase credentials are properly configured in .env, this client
 * enables real-time subscriptions, auth, and storage features.
 *
 * To switch from Neon DB to Supabase PostgreSQL:
 * 1. Update DATABASE_URL in .env to point to Supabase (port 5432 or pooler 6543)
 * 2. Fill in SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
 * 3. Run `bun run db:push` to sync the schema
 *
 * All existing API routes using Prisma will continue to work unchanged.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _supabaseClient: SupabaseClient | null = null;
let _supabaseAdminClient: SupabaseClient | null = null;

/**
 * Get the Supabase client with anon key (safe for client-side use)
 * Returns null if Supabase is not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabaseClient;
}

/**
 * Get the Supabase admin client with service role key (server-side only)
 * Returns null if Supabase is not configured
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  if (!_supabaseAdminClient) {
    _supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdminClient;
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Check if Supabase admin is configured
 */
export function isSupabaseAdminConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}
