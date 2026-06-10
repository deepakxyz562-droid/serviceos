import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { getCookieDomain } from '@/lib/subdomain';

const JWT_SECRET = process.env.JWT_SECRET || 'serviceos-saas-secret-key-change-in-production';
const TOKEN_NAME = 'serviceos_session';
const TOKEN_EXPIRY = '7d';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperAdmin: boolean;
  tenantId: string | null;
  workspaceId: string | null;
  avatar: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || false,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function getAuthUser(request?: NextRequest): Promise<AuthUser | null> {
  // 1. Try Authorization: Bearer header (most reliable for proxied environments)
  //    Check request parameter first, then fall back to next/headers()
  let authHeader: string | null = null;
  if (request) {
    authHeader = request.headers.get('authorization');
  } else {
    try {
      const headersList = await headers();
      authHeader = headersList.get('authorization');
    } catch {
      // headers() not available in this context
    }
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) return user;
  }

  // 2. Fall back to session cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (token) {
      const user = verifyToken(token);
      if (user) return user;
    }
  } catch {
    // Cookie reading failed, continue
  }

  return null;
}

export function getTokenName(): string {
  return TOKEN_NAME;
}

/**
 * Normalize a base URL by removing trailing slashes.
 * This prevents double-slash issues like:
 *   "https://example.com/" + "/api/callback" → "https://example.com//api/callback"
 */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Determine if cookies should use the Secure flag.
 *
 * - In production (Netlify, Vercel, etc.): browsers access the site over HTTPS,
 *   so Secure=true ensures cookies are only sent over HTTPS.
 * - In development (sandbox with Caddy reverse proxy): the Node process
 *   sees HTTP internally, so Secure=false allows cookies to work through
 *   the proxy. Caddy still encrypts traffic in transit.
 *
 * We also support per-request detection via X-Forwarded-Proto header
 * for environments where NODE_ENV isn't set correctly.
 */
function shouldUseSecureCookies(request?: NextRequest): boolean {
  // Check per-request header first (set by Caddy, Netlify CDN, etc.)
  if (request) {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    if (forwardedProto === 'https') return true;
    if (forwardedProto === 'http') return false;
  }
  // Fall back to NODE_ENV
  return process.env.NODE_ENV === 'production';
}

/**
 * Get cookie options with the correct Secure flag and domain for the current request.
 * Use this in API route handlers where you have access to the request object.
 *
 * The domain attribute is set to ".serviceosapp.netlify.app" (with leading dot)
 * so that cookies are shared across all subdomains. This means a user who
 * logs in on the root domain will also be authenticated on their company
 * subdomain (e.g., abc-plumbing.serviceosapp.netlify.app).
 */
export function getCookieOptions(request?: NextRequest) {
  const domain = getCookieDomain();
  return {
    name: TOKEN_NAME,
    httpOnly: true,
    secure: shouldUseSecureCookies(request),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    ...(domain ? { domain } : {}),
  };
}

// Static cookie options for backward compatibility (uses NODE_ENV check)
// Prefer getCookieOptions(request) in API routes for per-request detection
const staticDomain = getCookieDomain();
export const COOKIE_OPTIONS = {
  name: TOKEN_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  ...(staticDomain ? { domain: staticDomain } : {}),
};

/**
 * Get the normalized app URL (without trailing slash).
 * This is the canonical way to read NEXT_PUBLIC_APP_URL.
 */
export function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return normalizeBaseUrl(appUrl);
}

/**
 * Generate a URL-safe slug from a business name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
