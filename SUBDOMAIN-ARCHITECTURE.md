# ServiceOS Subdomain Multi-Tenant Architecture Plan

## Executive Summary

This document details the implementation plan for subdomain-based multi-tenancy
in ServiceOS, deployed on Netlify at `serviceosapp.netlify.app`. Each company
gets `company-slug.serviceosapp.netlify.app`, a super admin portal at
`admin.serviceosapp.netlify.app`, and an employee invitation system with
token-based set-password links.

**Key constraint**: The app is a single-page client with only the `/` page
route. All routing is client-side via Zustand state. API routes (`/api/...`)
are unrestricted. There is **no existing middleware.ts**.

---

## Table of Contents

1. [Subdomain Detection](#1-subdomain-detection)
2. [Tenant Resolution](#2-tenant-resolution)
3. [Subdomain-Aware Login Flow](#3-subdomain-aware-login-flow)
4. [Employee Invitation System](#4-employee-invitation-system)
5. [Database Schema Changes](#5-database-schema-changes)
6. [API Route Design](#6-api-route-design)
7. [Super Admin Portal](#7-super-admin-portal)
8. [Custom Domains (Future)](#8-custom-domains-future)
9. [Implementation Order](#9-implementation-order)

---

## 1. Subdomain Detection

### Strategy: API-Based Detection (NOT Middleware)

**Why not Next.js middleware?**

- Netlify's `@netlify/plugin-nextjs` has limited middleware support — it runs
  as an Edge Function but adds latency to every request.
- The app only has ONE page route (`/`). Middleware would run on every single
  page load, API call, and static asset request just to inject a header —
  wasteful and slow.
- The client already does a `fetch('/api/auth/me')` on mount to resolve the
  session. We extend this same call to also return tenant context from the
  subdomain.

**How it works:**

```
User visits: acme-plumbing.serviceosapp.netlify.app
  │
  ├─ Browser loads / (same HTML for all subdomains — Netlify wildcard)
  │
  ├─ Client JS reads window.location.hostname
  │   → "acme-plumbing.serviceosapp.netlify.app"
  │
  ├─ Client extracts subdomain: "acme-plumbing"
  │
  ├─ Client calls GET /api/tenant/resolve?subdomain=acme-plumbing
  │   → Returns { tenant: { id, name, slug, ... } } or { error: "not_found" }
  │
  └─ Client stores tenant context in Zustand + passes subdomain in
     auth API calls for validation
```

### New File: `src/lib/subdomain.ts`

```typescript
/**
 * ServiceOS Subdomain Detection & Resolution
 *
 * Subdomain patterns on Netlify:
 *   - serviceosapp.netlify.app         → Landing / main site (no subdomain)
 *   - admin.serviceosapp.netlify.app   → Super admin portal
 *   - *.serviceosapp.netlify.app       → Company portal (slug = subdomain)
 *
 * Custom domains (future):
 *   - crm.companydomain.com            → Resolved via CustomDomain table
 */

const ROOT_DOMAIN = 'serviceosapp.netlify.app';
const ADMIN_SUBDOMAIN = 'admin';

export interface SubdomainContext {
  /** The detected subdomain (e.g., "acme-plumbing") */
  subdomain: string | null;
  /** Whether this is the root domain (no subdomain) */
  isRootDomain: boolean;
  /** Whether this is the admin subdomain */
  isAdminSubdomain: boolean;
  /** Whether this is a company subdomain */
  isCompanySubdomain: boolean;
}

/**
 * Detect subdomain from the current hostname.
 * Works in browser only (uses window.location).
 */
export function detectSubdomain(): SubdomainContext {
  if (typeof window === 'undefined') {
    return { subdomain: null, isRootDomain: false, isAdminSubdomain: false, isCompanySubdomain: false };
  }

  const hostname = window.location.hostname;
  return parseSubdomain(hostname);
}

/**
 * Parse subdomain from a hostname string.
 * Also works server-side for API routes using request headers.
 */
export function parseSubdomain(hostname: string): SubdomainContext {
  // Handle localhost variants for development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // In dev, subdomain can be passed as a query param or header
    return { subdomain: null, isRootDomain: true, isAdminSubdomain: false, isCompanySubdomain: false };
  }

  // Check if hostname ends with our root domain
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`) && hostname !== ROOT_DOMAIN) {
    // This might be a custom domain — will be handled separately
    return { subdomain: null, isRootDomain: false, isAdminSubdomain: false, isCompanySubdomain: false, isCustomDomain: true };
  }

  // Exact root domain — no subdomain
  if (hostname === ROOT_DOMAIN) {
    return { subdomain: null, isRootDomain: true, isAdminSubdomain: false, isCompanySubdomain: false };
  }

  // Extract subdomain
  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');

  if (subdomain === ADMIN_SUBDOMAIN) {
    return { subdomain: ADMIN_SUBDOMAIN, isRootDomain: false, isAdminSubdomain: true, isCompanySubdomain: false };
  }

  // 'www' is treated as root domain
  if (subdomain === 'www') {
    return { subdomain: null, isRootDomain: true, isAdminSubdomain: false, isCompanySubdomain: false };
  }

  return { subdomain, isRootDomain: false, isAdminSubdomain: false, isCompanySubdomain: true };
}

/**
 * Extract subdomain from a server-side request (API route).
 * Uses the Host header or X-Forwarded-Host header.
 */
export function getSubdomainFromRequest(request: Request): SubdomainContext {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  const hostname = forwardedHost || hostHeader || '';

  if (!hostname) {
    return { subdomain: null, isRootDomain: true, isAdminSubdomain: false, isCompanySubdomain: false };
  }

  // Strip port number if present
  const hostnameWithoutPort = hostname.split(':')[0];
  return parseSubdomain(hostnameWithoutPort);
}

/**
 * Build a full URL for a given subdomain.
 * Useful for redirecting users after login.
 */
export function buildSubdomainUrl(subdomain: string, path: string = '/'): string {
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'https';
  return `${protocol}://${subdomain}.${ROOT_DOMAIN}${path}`;
}
```

### Development Workaround

In local development, subdomains like `acme.localhost:3000` are problematic.
Solution: Accept a `?subdomain=xxx` query parameter as fallback.

```typescript
// In detectSubdomain(), add:
const params = new URLSearchParams(window.location.search);
const querySubdomain = params.get('subdomain');
if (querySubdomain) {
  return { subdomain: querySubdomain, isRootDomain: false, isAdminSubdomain: querySubdomain === 'admin', isCompanySubdomain: querySubdomain !== 'admin' };
}
```

---

## 2. Tenant Resolution

### API Endpoint: `GET /api/tenant/resolve`

Resolves a subdomain (or custom domain) to a tenant record. This is the
**single source of truth** for mapping hostnames to tenants.

**File**: `src/app/api/tenant/resolve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSubdomainFromRequest } from '@/lib/subdomain';

export async function GET(request: NextRequest) {
  const ctx = getSubdomainFromRequest(request);

  // If on root domain or admin subdomain, no tenant to resolve
  if (ctx.isRootDomain || ctx.isAdminSubdomain) {
    return NextResponse.json({
      context: ctx,
      tenant: null,
    });
  }

  // If it's a company subdomain, look up by slug
  if (ctx.isCompanySubdomain && ctx.subdomain) {
    const tenant = await db.tenant.findUnique({
      where: { slug: ctx.subdomain },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        logo: true,
        plan: true,
        planStatus: true,
        suspendedAt: true,
        onboardingCompleted: true,
        country: true,
        currency: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { context: ctx, tenant: null, error: 'tenant_not_found' },
        { status: 404 }
      );
    }

    if (tenant.suspendedAt) {
      return NextResponse.json(
        { context: ctx, tenant: null, error: 'tenant_suspended' },
        { status: 403 }
      );
    }

    return NextResponse.json({ context: ctx, tenant });
  }

  // Custom domain handling (future)
  // Check CustomDomain table for a matching domain
  // const customDomain = await db.customDomain.findUnique({ where: { domain: hostname } });

  return NextResponse.json({ context: ctx, tenant: null });
}
```

### Client-Side Integration

Add tenant context to the Zustand app store:

**File changes**: `src/store/app-store.ts`

```typescript
// Add to interface:
interface TenantContext {
  subdomain: string | null;
  isRootDomain: boolean;
  isAdminSubdomain: boolean;
  isCompanySubdomain: boolean;
  resolvedTenant: any | null;  // The tenant from subdomain resolution
  resolutionError: string | null;
}

// Add to AppState:
tenantContext: TenantContext | null;
setTenantContext: (ctx: TenantContext | null) => void;
```

**File changes**: `src/app/page.tsx` — Add tenant resolution to the init flow:

```typescript
// In the checkSession/useEffect, after session check:
const subdomainCtx = detectSubdomain();
if (subdomainCtx.isCompanySubdomain && subdomainCtx.subdomain) {
  const resolveRes = await fetch(`/api/tenant/resolve?subdomain=${subdomainCtx.subdomain}`);
  if (resolveRes.ok) {
    const { tenant, error } = await resolveRes.json();
    if (error === 'tenant_not_found') {
      // Show "Company not found" page
    } else if (error === 'tenant_suspended') {
      // Show "Account suspended" page
    } else {
      setTenantContext({ ...subdomainCtx, resolvedTenant: tenant, resolutionError: null });
    }
  }
}
```

---

## 3. Subdomain-Aware Login Flow

### Current Flow (No Subdomain Awareness)

```
1. User visits serviceosapp.netlify.app → sees landing/auth page
2. Login → JWT cookie set → client shows app layout
3. All users see the same UI, tenant context comes from JWT
```

### New Flow (Subdomain-Aware)

```
SCENARIO A: User on root domain (serviceosapp.netlify.app)
  1. Visit root → Landing page → "Sign In" or "Create Account"
  2. Login → API returns user + tenant
  3. Client REDIRECTS to {tenant.slug}.serviceosapp.netlify.app
     (or stays on root if super admin)

SCENARIO B: User on company subdomain (acme.serviceosapp.netlify.app)
  1. Tenant resolved → company-branded login page
  2. Login → API validates user belongs to THIS tenant (or is super admin)
  3. If user belongs to different tenant → error "Wrong workspace"
     with link to their subdomain
  4. If valid → app loads within subdomain context

SCENARIO C: Employee with invitation token
  1. Clicks link in email → lands on {company}.serviceosapp.netlify.app/invite?token=xxx
  2. Since / only → client reads ?invite_token=xxx from URL
  3. Shows "Set Your Password" form
  4. On submit → POST /api/invitations/accept
  5. Creates User account, links to Employee + Tenant
  6. Auto-login → show employee portal

SCENARIO D: Super admin
  1. Visit admin.serviceosapp.netlify.app
  2. Login (must have isSuperAdmin=true)
  3. See platform admin dashboard
```

### Login API Changes

**File changes**: `src/app/api/auth/login/route.ts`

Add subdomain validation:

```typescript
// After successful password verification, BEFORE generating token:

const subdomainCtx = getSubdomainFromRequest(request);

if (subdomainCtx.isCompanySubdomain && subdomainCtx.subdomain) {
  // User is logging in on a company subdomain
  // Verify they belong to this tenant
  const expectedTenant = await db.tenant.findUnique({
    where: { slug: subdomainCtx.subdomain },
    select: { id: true },
  });

  if (expectedTenant && user.tenantId !== expectedTenant.id) {
    // Find user's actual tenant to give them the correct subdomain
    const userTenant = user.tenantId
      ? await db.tenant.findUnique({ where: { id: user.tenantId }, select: { slug: true } })
      : null;

    return NextResponse.json(
      {
        error: 'wrong_workspace',
        message: 'This account belongs to a different workspace.',
        correctSubdomain: userTenant?.slug || null,
      },
      { status: 403 }
    );
  }
}

// If on root domain and user has a tenant, suggest redirect
if (subdomainCtx.isRootDomain && user.tenantId && !user.isSuperAdmin) {
  const userTenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { slug: true },
  });

  // Include redirect URL in response so client can redirect
  // (Don't force-redirect server-side because the cookie domain matters)
  response_data.redirectTo = userTenant?.slug
    ? buildSubdomainUrl(userTenant.slug)
    : null;
}
```

### Cookie Domain Strategy

**CRITICAL**: Cookies set on `serviceosapp.netlify.app` are NOT sent to
`acme.serviceosapp.netlify.app` because browsers treat different subdomains
as different origins for same-site cookies.

**Solution**: Set the cookie domain to `.serviceosapp.netlify.app` (leading
dot = all subdomains). This means a cookie set on ANY subdomain is accessible
on ALL subdomains.

**File changes**: `src/lib/auth.ts`

```typescript
export function getCookieOptions(request?: NextRequest) {
  const secure = shouldUseSecureCookies(request);

  // Determine cookie domain for subdomain sharing
  let domain: string | undefined;
  if (secure) {
    // In production, share cookies across all subdomains
    domain = '.serviceosapp.netlify.app';
  }
  // In development (localhost), don't set domain — cookies are already
  // shared on localhost

  return {
    name: TOKEN_NAME,
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    domain,
  };
}
```

### Auth Page Changes for Subdomain Context

**File changes**: `src/components/auth/auth-page.tsx`

```typescript
// Add props for subdomain context:
interface AuthPageProps {
  onAuthSuccess: (user: any, tenant: any) => void;
  onBackToLanding?: () => void;
  initialTab?: string;
  tenantContext?: { name: string; slug: string; logo?: string } | null;
}

// In the component:
// - If tenantContext is provided, show company-branded login
//   "Sign in to {tenantContext.name}"
// - Hide "Create Account" tab (registration is on root domain only)
// - Show company logo if available
```

### Google OAuth Subdomain Handling

**File changes**: `src/app/api/auth/google/route.ts`

The `getRedirectUri` must use the current subdomain:

```typescript
function getRedirectUri(request: NextRequest, clientOrigin?: string): string {
  const callbackPath = '/api/auth/google/callback';

  // Priority 1: Client origin (preserves subdomain)
  if (clientOrigin) {
    try {
      const originUrl = new URL(clientOrigin);
      return `${originUrl.origin}${callbackPath}`;
    } catch {}
  }

  // Priority 2: Derive from request headers (preserves subdomain)
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  const hostname = forwardedHost || hostHeader;

  if (hostname && !hostname.startsWith('localhost')) {
    return `${forwardedProto}://${hostname}${callbackPath}`;
  }

  // Priority 3: Fallback to root domain (NOT subdomain-aware)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return `${normalizeBaseUrl(appUrl)}${callbackPath}`;
  }

  return `${forwardedProto}://${hostname || 'localhost:3000'}${callbackPath}`;
}
```

**Google Cloud Console Configuration:**

You need to add ALL possible redirect URIs:
- `https://serviceosapp.netlify.app/api/auth/google/callback`
- `https://*.serviceosapp.netlify.app/api/auth/google/callback`

Unfortunately, Google does NOT support wildcard redirect URIs. Options:
1. **Recommended**: Use a single redirect URI on the root domain, then
   redirect to the correct subdomain after OAuth completion.
2. Add individual URIs per tenant (not scalable).

**Option 1 Implementation**: Always redirect Google OAuth to root domain,
then redirect to subdomain after:

```typescript
// In google/callback/route.ts, after successful auth:
if (existingUser?.tenantId) {
  const tenant = await db.tenant.findUnique({
    where: { id: existingUser.tenantId },
    select: { slug: true },
  });
  if (tenant?.slug) {
    // Redirect to company subdomain
    const subdomainUrl = buildSubdomainUrl(tenant.slug, '/?google_login=success');
    return NextResponse.redirect(subdomainUrl);
  }
}
```

---

## 4. Employee Invitation System

### Overview

```
Owner invites employee →
  POST /api/invitations/create
  → Creates Invitation record with token
  → Sends email with link: {company}.serviceosapp.netlify.app/?invite_token=xxx
  → Employee clicks link
  → Client shows "Set Your Password" form
  → POST /api/invitations/accept
  → Creates User + links Employee.userId
  → Auto-login → Employee portal
```

### Invitation Model (added to Prisma schema)

```prisma
model Invitation {
  id            String    @id @default(cuid())
  token         String    @unique
  email         String
  name          String
  phone         String?
  role          String    @default("technician")
  tenantId      String
  workspaceId   String?
  employeeId    String?   // Pre-created employee record to link
  invitedById   String
  status        String    @default("pending")  // pending, accepted, expired, cancelled
  expiresAt     DateTime
  acceptedAt    DateTime?
  acceptedById  String?   // User ID of the employee who accepted
  metadataJson  String    @default("{}")       // Skills, department, etc.
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  tenant    Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  workspace Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  employee  Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  invitedBy User      @relation(fields: [invitedById], references: [id])

  @@index([token])
  @@index([email])
  @@index([tenantId])
  @@index([status])
  @@index([expiresAt])
}
```

### Invitation Flow — Step by Step

#### Step 1: Owner Creates Invitation

**API**: `POST /api/invitations`

**File**: `src/app/api/invitations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTenantAccess } from '@/lib/tenant-middleware';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { user, tenantId, enforceWorkspace } = await validateTenantAccess(request, {
      requireRoles: ['owner', 'admin', 'manager'],
    });

    const body = await request.json();
    const { email, name, phone, role, skills, workspaceId } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Check if email already has a user in this tenant
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true, tenantId: true },
    });
    if (existingUser?.tenantId === tenantId) {
      return NextResponse.json(
        { error: 'This email already has an account in your workspace' },
        { status: 409 }
      );
    }

    // Optionally pre-create the Employee record
    const employee = await db.employee.create({
      data: {
        name,
        phone: phone || '',
        email,
        role: role || 'technician',
        skills: skills ? JSON.stringify(skills) : '[]',
        status: 'offline', // Not yet active
        workspaceId: workspaceId || user.workspaceId,
      },
    });

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation (expires in 7 days)
    const invitation = await db.invitation.create({
      data: {
        token,
        email,
        name,
        phone: phone || null,
        role: role || 'technician',
        tenantId,
        workspaceId: workspaceId || user.workspaceId,
        employeeId: employee.id,
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadataJson: JSON.stringify({ skills: skills || [] }),
      },
    });

    // Get tenant slug for the invitation link
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true },
    });

    // Build invitation URL
    const inviteUrl = `https://${tenant?.slug}.serviceosapp.netlify.app/?invite_token=${token}`;

    // Send email (via notification orchestrator or direct email service)
    // await sendInvitationEmail({ to: email, name, tenantName: tenant?.name, inviteUrl, inviterName: user.name });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        inviteUrl, // For dev/testing — don't send in production
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Invitation create error:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}
```

#### Step 2: Employee Receives Email & Clicks Link

The email contains a link like:
```
https://acme-plumbing.serviceosapp.netlify.app/?invite_token=abc123...
```

Since there's only one page route (`/`), the client reads the `invite_token`
query parameter.

#### Step 3: Client Shows Set-Password Form

**File changes**: `src/app/page.tsx`

```typescript
// Add invitation state
const [inviteToken, setInviteToken] = useState<string | null>(null);
const [inviteData, setInviteData] = useState<any | null>(null);

// In the init useEffect:
const params = new URLSearchParams(window.location.search);
const token = params.get('invite_token');
if (token) {
  setInviteToken(token);
  // Verify token is valid
  const verifyRes = await fetch(`/api/invitations/verify?token=${token}`);
  if (verifyRes.ok) {
    const data = await verifyRes.json();
    setInviteData(data);
  } else {
    toast.error('This invitation link is invalid or has expired');
  }
  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}

// In the render:
if (inviteToken && inviteData) {
  return (
    <SetPasswordPage
      invitation={inviteData}
      onSubmit={async (password: string) => {
        const res = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken, password }),
        });
        if (res.ok) {
          const data = await res.json();
          handleAuthSuccess(data.user, data.tenant);
          useAppStore.getState().setCurrentView('employeePortal');
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to accept invitation');
        }
      }}
    />
  );
}
```

#### Step 4: Accept Invitation & Create Account

**API**: `POST /api/invitations/accept`

**File**: `src/app/api/invitations/accept/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, getCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 });
    }

    if (invitation.expiresAt < new Date()) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // Check if a user with this email already exists
    const existingUser = await db.user.findUnique({ where: { email: invitation.email } });

    let user;

    if (existingUser) {
      // User exists but is NOT in this tenant — add them to this tenant
      // (They might be an owner of a different tenant)
      // For safety, we create a SEPARATE user account linked to this tenant
      // OR we could reject and say "Sign in with your existing account first"

      // Option A: Reject — user must sign in and accept from their existing account
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in to accept the invitation.' },
        { status: 409 }
      );
    } else {
      // Create new user
      const passwordHash = await hashPassword(password);

      user = await db.user.create({
        data: {
          email: invitation.email,
          name: invitation.name,
          phone: invitation.phone,
          passwordHash,
          role: invitation.role,  // technician, driver, etc.
          authProvider: 'email',
          tenantId: invitation.tenantId,
          workspaceId: invitation.workspaceId,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
    }

    // Link the user to the pre-created employee record
    if (invitation.employeeId) {
      await db.employee.update({
        where: { id: invitation.employeeId },
        data: {
          userId: user.id,
          status: 'available', // Now active
        },
      });
    }

    // Mark invitation as accepted
    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    // Auto-login: generate JWT and set cookie
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: false,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
    };
    const jwt = generateToken(authUser);

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        workspaceId: user.workspaceId,
        avatar: user.avatar,
      },
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        slug: invitation.tenant.slug,
        industry: invitation.tenant.industry,
        plan: invitation.tenant.plan,
        planStatus: invitation.tenant.planStatus,
        onboardingCompleted: invitation.tenant.onboardingCompleted,
      },
    }, { status: 200 });

    response.cookies.set({
      ...getCookieOptions(request),
      value: jwt,
    });

    return response;
  } catch (error) {
    console.error('Invitation accept error:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
```

#### Step 5: Verify Invitation Token

**API**: `GET /api/invitations/verify?token=xxx`

**File**: `src/app/api/invitations/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      tenant: { select: { id: true, name: true, slug: true, logo: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json(
      { error: `Invitation has been ${invitation.status}`, status: invitation.status },
      { status: 400 }
    );
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
  }

  return NextResponse.json({
    invitation: {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      tenantName: invitation.tenant.name,
      tenantLogo: invitation.tenant.logo,
      inviterName: invitation.invitedBy?.name,
    },
  });
}
```

---

## 5. Database Schema Changes

### New Models

#### Invitation Model

```prisma
model Invitation {
  id            String    @id @default(cuid())
  token         String    @unique
  email         String
  name          String
  phone         String?
  role          String    @default("technician")
  tenantId      String
  workspaceId   String?
  employeeId    String?
  invitedById   String
  status        String    @default("pending")  // pending, accepted, expired, cancelled
  expiresAt     DateTime
  acceptedAt    DateTime?
  acceptedById  String?
  metadataJson  String    @default("{}")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  tenant    Tenant?    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  workspace Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  employee  Employee?  @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  invitedBy User       @relation("InvitedBy", fields: [invitedById], references: [id])

  @@index([token])
  @@index([email])
  @@index([tenantId])
  @@index([status])
  @@index([expiresAt])
}
```

#### CustomDomain Model (Future — define now, implement later)

```prisma
model CustomDomain {
  id            String   @id @default(cuid())
  domain        String   @unique  // e.g., "crm.companydomain.com"
  tenantId      String
  verifiedAt    DateTime?
  verificationToken String  // TXT record value for domain verification
  sslStatus     String   @default("pending")  // pending, provisioning, active, failed
  dnsConfigJson String   @default("{}")
  active        Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([domain])
  @@index([tenantId])
  @@index([active])
}
```

### Changes to Existing Models

#### Tenant Model — Add relations

```prisma
model Tenant {
  // ... existing fields ...

  // NEW: Invitation relation
  invitations Invitation[]

  // NEW: CustomDomain relation (future)
  customDomains CustomDomain[]
}
```

#### Workspace Model — Add Invitation relation

```prisma
model Workspace {
  // ... existing fields ...

  // NEW
  invitations Invitation[]
}
```

#### User Model — Add InvitedBy relation

```prisma
model User {
  // ... existing fields ...

  // NEW
  sentInvitations Invitation[] @relation("InvitedBy")
}
```

#### Employee Model — Add email uniqueness per workspace

Add a compound unique constraint to prevent duplicate employee emails within
a workspace:

```prisma
model Employee {
  // ... existing fields ...

  // Add: email should be unique per workspace to avoid conflicts
  // (Not a hard constraint — multiple employees might not have emails)
}
```

### Migration Commands

```bash
# Create the migration
npx prisma migrate dev --name add_invitations_custom_domains

# Generate Prisma client
npx prisma generate

# Apply to production
npx prisma migrate deploy
```

---

## 6. API Route Design

### New API Routes

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET | `/api/tenant/resolve` | Resolve subdomain to tenant | No |
| POST | `/api/invitations` | Create invitation | Owner/Admin/Manager |
| GET | `/api/invitations` | List invitations for tenant | Owner/Admin/Manager |
| GET | `/api/invitations/verify?token=xxx` | Verify invitation token | No |
| POST | `/api/invitations/accept` | Accept invitation + create account | No |
| DELETE | `/api/invitations/[id]` | Cancel/revoke invitation | Owner/Admin |
| POST | `/api/invitations/[id]/resend` | Resend invitation email | Owner/Admin |
| GET | `/api/employees` | List employees (enhanced with tenant filtering) | Yes |
| POST | `/api/employees` | Create employee (optionally with invite) | Yes |
| PUT | `/api/employees/[id]` | Update employee | Yes |
| DELETE | `/api/employees/[id]` | Delete employee + revoke invitation | Yes |

### Enhanced Existing Routes

#### `POST /api/auth/login` — Subdomain-aware

Changes:
- Reads `Host` header to detect subdomain
- Validates that the authenticated user belongs to the subdomain's tenant
- Returns `redirectTo` URL if user logged in on root but should be on subdomain
- Returns `wrong_workspace` error with correct subdomain if tenant mismatch

#### `GET /api/auth/me` — Include tenant context from subdomain

Changes:
- Reads `Host` header to detect subdomain
- If on company subdomain, returns `subdomainTenant` field
- Frontend uses this to verify the user is on the right subdomain

#### `GET /api/employees` — Tenant-scoped

Changes:
- Now requires auth via `validateTenantAccess`
- Filters by tenant automatically via `enforceWorkspace`
- Returns invitation status alongside employee data

### File Structure for New Routes

```
src/app/api/
  tenant/
    resolve/
      route.ts          # GET - Resolve subdomain to tenant
  invitations/
    route.ts            # GET (list), POST (create)
    verify/
      route.ts          # GET - Verify invitation token
    accept/
      route.ts          # POST - Accept invitation + create account
    [id]/
      route.ts          # DELETE - Cancel invitation
      resend/
        route.ts        # POST - Resend invitation email
```

---

## 7. Super Admin Portal

### Access Point

`admin.serviceosapp.netlify.app` — dedicated subdomain for platform admins.

### How It Works

When the client detects `isAdminSubdomain === true`:

1. Show a specialized login page (can use same auth system)
2. After login, verify `isSuperAdmin === true` in JWT
3. If not super admin, show error: "Access denied. This portal is for platform administrators only."
4. If super admin, load the `superAdmin` view

### Client-Side Changes

**File changes**: `src/app/page.tsx`

```typescript
// After subdomain detection:
if (subdomainCtx.isAdminSubdomain) {
  // Show admin-specific auth or admin layout
  if (auth.isAuthenticated && auth.user?.isSuperAdmin) {
    return <AppLayout onLogout={handleLogout} initialView="superAdmin" />;
  } else if (auth.isAuthenticated && !auth.user?.isSuperAdmin) {
    return <AdminAccessDenied />;
  } else {
    return <AuthPage onAuthSuccess={handleAuthSuccess} isAdminPortal />;
  }
}
```

### Super Admin Features (Existing + Enhanced)

The existing `super-admin-view.tsx` already provides:
- Platform stats (tenants, users, revenue)
- Tenant management (create, suspend, activate, delete)
- User management
- Billing overview
- Feature flags

Enhancements needed:
- **Tenant subdomain management**: View/edit tenant slugs
- **Invitation monitoring**: See all pending invitations across tenants
- **Custom domain requests**: Approve/reject custom domain setup
- **Impersonation**: Temporarily log in as a tenant owner for debugging
  - `POST /api/admin/impersonate` → returns a scoped JWT for a specific tenant
  - JWT includes `impersonatedBy: superAdminId` for audit trail

### Impersonation API (for debugging)

**File**: `src/app/api/admin/impersonate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { generateToken, getCookieOptions } from '@/lib/auth';
import { auditAction } from '@/lib/tenant-middleware';

export async function POST(request: NextRequest) {
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tenantId, userId } = await request.json();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });

  if (!user || user.tenantId !== tenantId) {
    return NextResponse.json({ error: 'User not found in tenant' }, { status: 404 });
  }

  // Generate impersonated token
  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: false, // NOT super admin in impersonated session
    tenantId: user.tenantId,
    workspaceId: user.workspaceId,
    avatar: user.avatar,
    impersonatedBy: (await db.user.findFirst({ where: { isSuperAdmin: true } }))?.id,
  };

  const token = generateToken(authUser as any);

  await auditAction(authUser.impersonatedBy!, 'admin.impersonate', 'user', user.id, {
    impersonatedEmail: user.email,
    tenantId,
  });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: user.tenant ? { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug } : null,
    impersonated: true,
  });

  response.cookies.set({ ...getCookieOptions(request), value: token });
  return response;
}
```

---

## 8. Custom Domains (Future)

### Architecture

```
Company wants: crm.companydomain.com
  │
  ├─ 1. Company adds domain in Settings
  │     POST /api/custom-domains
  │     → Creates CustomDomain record (status: pending)
  │     → Returns DNS instructions:
  │        CNAME: crm.companydomain.com → serviceosapp.netlify.app
  │        TXT:  _serviceos.crm.companydomain.com → verification_token
  │
  ├─ 2. Company configures DNS
  │
  ├─ 3. ServiceOS verifies DNS
  │     GET /api/custom-domains/[id]/verify
  │     → Checks CNAME points to our app
  │     → Checks TXT record matches verification token
  │     → Updates status: active
  │
  ├─ 4. Netlify handles the SSL + routing
  │     - Add domain to Netlify site via API
  │     - Netlify provisions SSL certificate automatically
  │     - All *.netlify.app routes + custom domains serve the same Next.js app
  │
  └─ 5. Subdomain resolution falls back to CustomDomain table
        In /api/tenant/resolve, if hostname is NOT *.serviceosapp.netlify.app,
        look up CustomDomain table:
        const customDomain = await db.customDomain.findUnique({
          where: { domain: hostname, active: true },
          include: { tenant: true },
        });
```

### Netlify Domain API Integration

```typescript
// Future: src/lib/netlify-domains.ts
// Uses Netlify API to add custom domains programmatically

async function addCustomDomain(domain: string): Promise<void> {
  const response = await fetch(
    `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/domains`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NETLIFY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain }),
    }
  );
  // Netlify will auto-provision SSL via Let's Encrypt
}
```

### Tenant Resolution for Custom Domains

**File changes**: `src/app/api/tenant/resolve/route.ts`

```typescript
// Add after subdomain check:
if (!ctx.isRootDomain && !ctx.isAdminSubdomain && !ctx.isCompanySubdomain) {
  // Check custom domains
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const hostnameWithoutPort = hostname.split(':')[0];

  const customDomain = await db.customDomain.findUnique({
    where: { domain: hostnameWithoutPort, active: true },
    include: { tenant: true },
  });

  if (customDomain?.tenant) {
    return NextResponse.json({
      context: { ...ctx, isCustomDomain: true },
      tenant: customDomain.tenant,
    });
  }
}
```

---

## 9. Implementation Order

### Phase 1: Foundation (Week 1)

1. **Create `src/lib/subdomain.ts`** — Subdomain detection utilities
2. **Create `src/app/api/tenant/resolve/route.ts`** — Tenant resolution API
3. **Update `src/store/app-store.ts`** — Add tenant context state
4. **Update `src/app/page.tsx`** — Add subdomain detection on mount
5. **Update `src/lib/auth.ts`** — Set cookie domain to `.serviceosapp.netlify.app`
6. **Test**: Verify subdomain detection works locally with `?subdomain=xxx`

### Phase 2: Subdomain-Aware Auth (Week 2)

7. **Update `src/app/api/auth/login/route.ts`** — Subdomain validation
8. **Update `src/app/api/auth/me/route.ts`** — Include subdomain context
9. **Update `src/components/auth/auth-page.tsx`** — Company-branded login
10. **Update Google OAuth flow** — Redirect to correct subdomain after auth
11. **Update `next.config.ts`** — No changes needed (rewrites still work)
12. **Test**: Login on subdomain, verify redirect, verify cookie sharing

### Phase 3: Employee Invitations (Week 3)

13. **Run Prisma migration** — Add Invitation + CustomDomain models
14. **Create `src/app/api/invitations/route.ts`** — Create/list invitations
15. **Create `src/app/api/invitations/verify/route.ts`** — Verify token
16. **Create `src/app/api/invitations/accept/route.ts`** — Accept + create account
17. **Create `src/app/api/invitations/[id]/route.ts`** — Cancel/resend
18. **Create `src/components/auth/set-password-page.tsx`** — Set password form
19. **Update `src/app/page.tsx`** — Handle `?invite_token=xxx`
20. **Update `src/components/views/employee-portal-view.tsx`** — Enhanced for invited employees
21. **Test**: Full invitation flow end-to-end

### Phase 4: Employee CRUD (Week 4)

22. **Update `src/app/api/employees/route.ts`** — Tenant-scoped with invitation support
23. **Create employee management UI** — Add/edit/delete with invite option
24. **Update `src/components/views/settings-view.tsx`** — Team management section
25. **Test**: Employee CRUD with invitation integration

### Phase 5: Super Admin (Week 5)

26. **Create admin subdomain detection** in page.tsx
27. **Create `src/components/auth/admin-auth-page.tsx`** — Admin login
28. **Create `src/app/api/admin/impersonate/route.ts`** — Impersonation
29. **Update `src/components/views/super-admin-view.tsx`** — Enhanced features
30. **Test**: Admin portal, impersonation, tenant management

### Phase 6: Netlify Configuration

31. **Enable wildcard subdomain** on Netlify (already supported on `*.netlify.app`)
32. **Update Google Cloud Console** — Add redirect URIs
33. **Update environment variables** — Add `NEXT_PUBLIC_ROOT_DOMAIN=serviceosapp.netlify.app`
34. **Deploy and test** on staging

---

## Appendix A: Netlify Wildcard Subdomain Setup

Netlify automatically supports `*.netlify.app` wildcard subdomains. No
additional DNS configuration is needed. Every subdomain of
`serviceosapp.netlify.app` will serve the same site.

To confirm:
1. Go to Netlify Dashboard → Site settings → Domain management
2. The `*.netlify.app` domain is automatically available
3. No additional configuration needed

## Appendix B: Cookie Security Considerations

| Setting | Value | Reason |
|---------|-------|--------|
| `domain` | `.serviceosapp.netlify.app` | Share cookie across subdomains |
| `httpOnly` | `true` | Prevent XSS access |
| `secure` | `true` (production) | HTTPS only |
| `sameSite` | `lax` | Allow cross-subdomain navigation |
| `path` | `/` | Available on all paths |

**Risk**: A cookie set on `acme.serviceosapp.netlify.app` is also sent to
`other-company.serviceosapp.netlify.app`. This is intentional — we need the
cookie to persist when redirecting between subdomains.

**Mitigation**: The JWT contains `tenantId`. Every API route validates that
the user's `tenantId` matches the requested resource's tenant. Even if a cookie
leaks to another subdomain, the API will reject cross-tenant access.

## Appendix C: Rate Limiting for Invitations

To prevent abuse:
- Max 50 pending invitations per tenant (configurable per plan)
- Max 5 invitations to the same email per day
- Invitation tokens are single-use and expire after 7 days
- Failed acceptance attempts (>5) invalidate the token

## Appendix D: Environment Variables

Add to `.env` and Netlify Dashboard:

```
NEXT_PUBLIC_ROOT_DOMAIN=serviceosapp.netlify.app
NEXT_PUBLIC_APP_URL=https://serviceosapp.netlify.app
```

These are used by `src/lib/subdomain.ts` for subdomain detection.
