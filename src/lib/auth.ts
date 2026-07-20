import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'serviceos-saas-dev-secret-key');
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production. Set it in your .env file.');
}
const TOKEN_NAME = 'serviceos_session';
const TOKEN_EXPIRY = '7d';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  workspaceId: string | null;
  avatar: string | null;
  isSuperAdmin?: boolean;
  employeeId?: string | null;
  // Customer sessions include the customer's phone (set by exchange-magic-link
  // and verify-otp). Used by /api/ecommerce/orders to filter orders by phone
  // when the customer has no email or both email+phone are captured.
  phone?: string | null;
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
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: user.isSuperAdmin || false,
      employeeId: user.employeeId || null,
      // Include phone for customer sessions so /api/ecommerce/orders can
      // filter by phone without an extra DB lookup. For non-customer
      // sessions this is undefined and gets omitted from the JWT.
      ...(user.phone ? { phone: user.phone } : {}),
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

/**
 * Get the authenticated user from the current request.
 * Checks HTTP-only cookie first, then falls back to Authorization header (Bearer token).
 * This dual approach ensures auth works even if cookies are not forwarded
 * through the Caddy gateway proxy.
 *
 * NOTE: For customer portal sessions, the company-login flow sets the JWT
 * `id` to `cust_<customerId>` (with a `cust_` prefix). We strip that prefix
 * here so every downstream API can use `user.id` directly as the Customer.id
 * without needing to normalise it individually.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    // 1. Try HTTP-only cookie first (preferred)
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (token) {
      const user = verifyToken(token);
      if (user) return normalizeCustomerId(user);
    }

    // 2. Fallback: Check Authorization header (Bearer token)
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7);
      const user = verifyToken(bearerToken);
      if (user) return normalizeCustomerId(user);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Strip the `cust_` prefix from the user id for customer-role sessions.
 * Company-login sets `id: cust_<customerId>`; magic-link / OTP set the raw
 * `customerId`. Normalising here means every API can filter by `user.id`
 * without worrying about the prefix.
 */
function normalizeCustomerId(user: AuthUser): AuthUser {
  if (user.role === 'customer' && typeof user.id === 'string' && user.id.startsWith('cust_')) {
    return { ...user, id: user.id.slice(5) };
  }
  return user;
}

export function getTokenName(): string {
  return TOKEN_NAME;
}

/**
 * Get the application URL.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL / APP_URL env var (explicit, preferred for production)
 *   2. The origin of the incoming request (derived from Host / X-Forwarded-* headers)
 *   3. http://localhost:3000 (local dev fallback)
 *
 * Pass the NextRequest whenever you have one so the URL is correct even when
 * the env var is not configured (e.g. on Netlify if NEXT_PUBLIC_APP_URL is
 * missing). This makes invitation/activation links work out of the box.
 */
export function getAppUrl(request?: { headers: { get(name: string): string | null } }): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (request) {
    const headers = request.headers;
    const forwardedProto = headers.get('x-forwarded-proto');
    const forwardedHost = headers.get('x-forwarded-host');
    const host = forwardedHost || headers.get('host');
    if (host) {
      const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  }

  return 'https://serviceos.cc';
}

// In HTTPS-through-proxy setups, Node sees HTTP internally,
// so the secure flag would prevent cookies from being set.
// Caddy handles HTTPS termination, so cookies are still secure in transit.
export const COOKIE_OPTIONS = {
  name: TOKEN_NAME,
  httpOnly: true,
  secure: false, // Caddy handles HTTPS termination
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

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
