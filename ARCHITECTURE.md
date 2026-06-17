# Enterprise Auth & Portal Architecture — Design Document

> Refactor of authentication, tenant architecture, customer portal, employee portal, and onboarding flow.
> **Constraint:** All existing CRM, Booking, Dispatch, Billing, WhatsApp, Workflow, Marketing, Customer 360, Form Builder, Omnichannel, AI, and Reporting modules continue working exactly as they do today.

---

## 1. Complete UX Flow

### 1.1 Company-Scoped Entry (Single Domain + Company Slug)
```
yourdomain.com/abc-cleaning/login        → Admin/Owner login (Email + Password)
yourdomain.com/abc-cleaning/employee     → Employee login (Email/Username + Password)
yourdomain.com/abc-cleaning/customer     → Customer login (Email/Username + Password)
yourdomain.com/abc-cleaning/accept-invite?token=... → Set-password activation (employee OR customer)
yourdomain.com/                          → Marketing landing + "Find your company" search
```

### 1.2 Admin Journey
1. Visits `/{slug}/login` → enters Email + Password
2. JWT issued (7d) + http-only cookie set
3. Redirected into existing AppLayout (dashboard, CRM, booking, dispatch, billing, workflow, marketing, AI, reporting — ALL unchanged)
4. Can manage employees (invite/suspend/reset), customers (portal toggle/invite), roles & permissions

### 1.3 Employee Journey
1. Owner creates employee → system generates User (status `invited`) + Invitation token
2. Owner sends invitation (email link or copy link): `/{slug}/accept-invite?token=...`
3. Employee opens link → sets password → account activated (`status=active`)
4. Employee logs in at `/{slug}/employee` → Employee Portal (dashboard, jobs, bookings, calendar, tasks, notifications, documents, profile)

### 1.4 Customer Journey
1. Owner creates customer → **NO portal account by default** (most customers only need bookings/jobs/invoices/WhatsApp)
2. Owner toggles "Enable Customer Portal" on the customer profile → generates activation token + invitation link
3. Owner sends invitation: `/{slug}/accept-invite?token=...&role=customer`
4. Customer opens link → sets password → portal account activated
5. Customer logs in at `/{slug}/customer` → Customer Portal (dashboard, bookings, jobs, invoices, payments, documents, reviews, support tickets, profile, notifications)

### 1.5 Activation / Onboarding States
- `loading` — verifying token
- `invalid` — token not found
- `expired` — token past 7-day expiry
- `valid` — show set-password form (name, password, confirm)
- `success` — account activated, CTA to login at `/{slug}/{role}`
- `error` — network/server error with retry

---

## 2. Complete User Journey

| Actor | Touchpoint | Outcome |
|-------|-----------|---------|
| Prospect | Lands on `/` | Sees marketing site + "Find your company" |
| Prospect | Searches company slug/name | Redirected to `/{slug}/login` |
| Admin | Logs in at `/{slug}/login` | Enters admin dashboard |
| Admin | Creates employee | Employee record + User(invited) + invitation link generated |
| Admin | Sends invitation | Link delivered (email or copy) |
| Employee | Opens `/{slug}/accept-invite?token=…` | Sets password → activated |
| Employee | Logs in at `/{slug}/employee` | Enters employee portal |
| Admin | Creates customer | Customer record only (no portal account) |
| Admin | Enables customer portal | Activation token + invitation link generated |
| Admin | Sends invitation | Link delivered |
| Customer | Opens `/{slug}/accept-invite?token=…&role=customer` | Sets password → portal activated |
| Customer | Logs in at `/{slug}/customer` | Enters customer portal |
| Admin | Suspends employee | User.isActive=false → employee can't log in |
| Admin | Resets password | Generates reset link → user sets new password |
| Admin | Disables customer portal | passwordHash cleared → customer can't log in (record preserved) |

---

## 3. Screen Architecture

### 3.1 New Screens
- **CompanyLoginPage** — `/{slug}/login` — admin/owner email+password
- **CompanyEmployeePage** — `/{slug}/employee` — employee email+password
- **CompanyCustomerPage** — `/{slug}/customer` — customer email+password
- **AcceptInvitePage** — `/{slug}/accept-invite` — activation (set password)
- **CompanyNotFoundPage** — shown when slug doesn't resolve
- **CompanySelectPage** — at `/` when user searches for their company

### 3.2 Existing Screens (UNCHANGED)
- LandingPage, AppLayout + all *View components (dashboard, crm, booking, dispatch, billing, whatsapp, workflow, marketing, customer-360, form-builder, omnichannel, ai-*, analytics, etc.)
- EmployeePortalLayout + employee-portal-view
- CustomerPortalLayout + customer-portal-view

### 3.3 Redesigned Sub-Components
- `auth/company-auth-card.tsx` — shared enterprise auth card (logo, company name, role badge)
- `auth/accept-invite-form.tsx` — set-password form with strength meter
- `auth/company-finder.tsx` — search-by-slug on landing page
- `employees/employee-invite-dialog.tsx` — create employee + show invitation link
- `employees/employee-actions-menu.tsx` — suspend / reset / resend invite
- `customers/portal-access-panel.tsx` — enable/disable/send-invite/reset-password
- `customers/portal-invite-dialog.tsx` — show invitation link + copy

---

## 4. Route Structure

### 4.1 New Next.js App Router Routes
```
src/app/
  [companySlug]/
    login/
      page.tsx          → CompanyLoginPage (admin/owner)
    employee/
      page.tsx          → CompanyEmployeePage
    customer/
      page.tsx          → CompanyCustomerPage
    accept-invite/
      page.tsx          → AcceptInvitePage (token in ?token=)
  page.tsx              → LandingPage (existing) + company finder
```

### 4.2 Backward Compatibility
- `/` continues to render the existing single-page app (landing → auth → dashboard/portal via state). Existing `/api/auth/login`, `/api/auth/customer/login`, `/api/auth/me`, etc. all keep working.
- The new `/{slug}/*` routes are **additive** — they render the same portal layouts after auth but provide a cleaner, company-scoped entry URL.
- Existing magic-link activation via `/?activate=TOKEN` still works (handled in page.tsx).

### 4.3 Post-Login Routing
After successful auth at any `/{slug}/*` route, the app sets the same `serviceos_session` cookie + `serviceos_auth` localStorage used today, then swaps to:
- Admin/Owner → `AppLayout` (in-place render, no URL change)
- Employee → `EmployeePortalLayout`
- Customer → `CustomerPortalLayout`

This keeps the existing view-state router intact.

---

## 5. Database Schema Updates

### 5.1 `companies` — NEW (aliases Tenant for clean naming)
Rather than introduce a parallel `companies` table (which would duplicate Tenant data and risk drift), we **reuse `Tenant`** as the company record — it already has `id`, `name`, `slug`. We add three optional columns to formalize the company identity and add a `Company` view/alias conceptually.

> Decision: **Tenant == Company**. The slug is already `@unique`. No new table needed; this avoids breaking every existing `tenantId` foreign key.

### 5.2 `Customer` — add portal-access fields
```prisma
portalEnabled       Boolean   @default(false)   // owner toggled portal on
invitationStatus    String    @default("none")  // none | pending | accepted | disabled
// (passwordHash, activationToken, activationTokenExpiresAt, activatedAt,
//  lastLoginAt, invitationSentAt already exist from prior session)
```

### 5.3 `Employee` — add invitation-status field
```prisma
invitationStatus    String    @default("none")  // none | pending | accepted | suspended
// passwordHash lives on the linked User (Employee.userId → User.passwordHash)
```

### 5.4 `Invitation` — NEW model (fixes pre-existing bug)
The existing `/api/invitations/*` routes reference `db.invitation` but no `Invitation` model exists in `schema.prisma` — so employee invitations are currently broken. We add it:
```prisma
model Invitation {
  id            String    @id @default(cuid())
  token         String    @unique
  email         String
  name          String?
  role          String
  phone         String?
  status        String    @default("pending")  // pending | accepted | cancelled | expired
  message       String?
  invitedById   String?
  tenantId      String?
  workspaceId   String?
  employeeId    String?   @unique
  customerId    String?   @unique
  acceptedAt    DateTime?
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  // relations...
}
```

### 5.5 `RolePermission` — already exists; we seed defaults for the 7 roles.

### 5.6 `AuditLog` — already exists; we log auth events (login, logout, invite, activate, suspend, reset, portal-toggle).

---

## 6. API Endpoints

### 6.1 New endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/companies/resolve?slug=…` | Resolve company slug → {id, name, slug, logo} or 404 |
| GET | `/api/companies/search?q=…` | Search companies by name/slug (for company finder) |
| POST | `/api/auth/company-login` | Login scoped to a company slug (validates slug + email + password + role match) |
| POST | `/api/employees/[id]/invite` | Generate/regenerate employee invitation link |
| POST | `/api/employees/[id]/suspend` | Suspend employee (User.isActive=false) |
| POST | `/api/employees/[id]/reset-password` | Generate password-reset link for employee |
| POST | `/api/customers/[id]/portal/enable` | Enable customer portal (generate activation token) |
| POST | `/api/customers/[id]/portal/disable` | Disable customer portal (clear passwordHash, keep record) |
| POST | `/api/customers/[id]/portal/resend` | Resend customer invitation (regenerate token) |
| POST | `/api/auth/reset-password` | Public: set new password from reset token |
| POST | `/api/auth/request-reset` | Public: request password-reset link by email |

### 6.2 Existing endpoints (UNCHANGED)
`/api/auth/login`, `/api/auth/customer/login`, `/api/auth/customer/discover`, `/api/auth/customer/activate`, `/api/auth/me`, `/api/auth/logout`, `/api/invitations/accept` (fixed by adding the model), `/api/employees/*`, `/api/customers/*`, `/api/role-permissions`, all CRM/booking/dispatch/billing/whatsapp/workflow/marketing/AI/reporting APIs.

---

## 7. Permission Matrix

Role-Based Access Control. `RolePermission` model stores `actionsJson` per (role, resource, tenant). Defaults seeded:

| Resource | owner | admin | manager | dispatcher | sales | employee | customer |
|----------|:-----:|:-----:|:-------:|:----------:|:-----:|:--------:|:--------:|
| dashboard | CRUD | CRUD | CR | CR | CR | R | R |
| customers | CRUD | CRUD | CRU | R | CRU | — | R(self) |
| employees | CRUD | CRU | R | R | — | R(self) | — |
| jobs | CRUD | CRUD | CRU | CRUD | R | R(assigned) | R(own) |
| bookings | CRUD | CRUD | CRU | CRUD | CRU | R(assigned) | CR(own) |
| invoices | CRUD | CRUD | R | R | CR | — | R(own) |
| payments | CRUD | CRUD | — | — | — | — | R(own) |
| conversations | CRUD | CRUD | CRU | CRU | R | R(assigned) | R(own) |
| campaigns | CRUD | CRUD | CRU | — | CRUD | — | — |
| workflows | CRUD | CRUD | R | — | — | — | — |
| reports | CRUD | CR | R | R | R | — | — |
| settings | CRUD | CRU | R | — | — | — | — |
| audit_logs | R | R | — | — | — | — | — |
| role_permissions | CRUD | R | — | — | — | — | — |

(R = read, C = create, U = update, D = delete)

A new `lib/rbac.ts` helper: `can(user, action, resource)` checks `RolePermission.actionsJson`.

---

## 8. Component Structure

```
src/components/
  auth/
    company-auth-card.tsx        (shared enterprise auth card)
    company-login-form.tsx       (email+password, scoped to slug+role)
    accept-invite-form.tsx       (set-password, strength meter, role-aware)
    company-finder.tsx           (search-by-slug on landing)
    auth-page.tsx                (existing — kept for backward compat at /)
    activation-page.tsx          (existing — kept for ?activate= flow)
    accept-invitation.tsx        (existing — fixed)
  employees/
    employee-invite-dialog.tsx   (create + invite)
    employee-actions-menu.tsx    (suspend/reset/resend)
  customers/
    portal-access-panel.tsx      (enable/disable/send/reset)
    portal-invite-dialog.tsx     (show+copy link)
  portals/
    employee-portal-layout.tsx   (existing — enhanced)
    customer-portal-layout.tsx   (existing — enhanced)
  views/
    employees-view.tsx           (existing — extended with invite/portal columns)
    crm-view.tsx                 (existing — extended with portal-access actions)

src/app/
  [companySlug]/
    login/page.tsx
    employee/page.tsx
    customer/page.tsx
    accept-invite/page.tsx
  page.tsx                       (existing — extended with company finder)
```

---

## 9. State Management Updates

### 9.1 Existing `useAppStore` (Zustand) — extended
- Add `companySlug: string | null` (resolved from URL)
- Add `companyProfile: { id, name, slug, logo } | null`
- Add `setCompany(slug)` action

### 9.2 Auth state (existing) — unchanged shape
- `auth.isAuthenticated`, `auth.user`, `auth.tenant` — same
- Cookie `serviceos_session` + localStorage `serviceos_auth` — same (so existing AppLayout/portals work unchanged)

### 9.3 New selectors
- `useCompany()` — returns current company profile
- `useCan(action, resource)` — RBAC hook wrapping `lib/rbac.ts`

### 9.4 TanStack Query keys
- `['company', slug]` — company profile
- `['employee-invitations']` — list of pending employee invites
- `['customer-portal-status', customerId]`

---

## 10. Production-Ready Implementation Plan

### Phase 2 — DB Schema (idempotent, non-breaking)
- Add `portalEnabled`, `invitationStatus` to Customer
- Add `invitationStatus` to Employee
- Add `Invitation` model (fixes broken `/api/invitations/*`)
- Seed default `RolePermission` rows for 7 roles
- `bun run db:push` (SQLite local) + update `supabase-migration.sql`

### Phase 3 — Backend APIs
- `/api/companies/resolve` + `/api/companies/search`
- `/api/auth/company-login` (slug-scoped login)
- `/api/employees/[id]/{invite,suspend,reset-password}`
- `/api/customers/[id]/portal/{enable,disable,resend}`
- `/api/auth/{request-reset,reset-password}`
- Fix `/api/invitations/*` (now works with new model)
- `lib/rbac.ts` + seed script

### Phase 4 — Routes
- `src/app/[companySlug]/{login,employee,customer,accept-invite}/page.tsx`
- Each page: resolve slug → render enterprise auth card → on success set cookie+localStorage → swap to existing portal layout

### Phase 5 — Auth UX redesign
- `company-auth-card.tsx` — enterprise design (logo, company name, role badge, password show/hide, remember me, loading spinner, error banner)
- `accept-invite-form.tsx` — password strength meter, confirm match, success screen
- `company-finder.tsx` — autocomplete search on landing
- Mobile responsive (390px → 1440px)

### Phase 6 — Employee management UI
- Extend `employees-view.tsx`: invitation-status badge, "Invite" button, actions menu (Suspend/Reset/Resend)
- `employee-invite-dialog.tsx` — create + show link

### Phase 7 — Customer portal access management
- Extend `crm-view.tsx`: portal-access panel per customer
- `portal-access-panel.tsx` — enable/disable/send-invite/reset
- `portal-invite-dialog.tsx` — show+copy link

### Phase 8 — Portal UX enhancements
- Employee portal: add Tasks, Documents tabs (data models already exist)
- Customer portal: add Support Tickets, Documents tabs
- Empty states, loading skeletons, success toasts

### Phase 9 — Verification
- `bun run db:push`, lint auth+new files, dev server health
- Agent Browser: visit `/{slug}/login`, `/{slug}/employee`, `/{slug}/customer`, `/{slug}/accept-invite?token=…`
- Verify existing `/` flow + admin dashboard modules still work
- Mobile + desktop responsive check
- Sticky footer check

---

## Non-Goals / Explicitly Avoided
- ❌ Workspace switchers
- ❌ Tenant discovery screens
- ❌ Company code screens
- ❌ Multi-workspace architecture
- ❌ Mandatory subdomains
- ❌ Customer IDs / Employee IDs for login
- ❌ Breaking any existing module
