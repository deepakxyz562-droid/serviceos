# ServiceOS — Complete Implementation Plan

> **Mission**: Transform FlowForge into ServiceOS, a production-grade multi-tenant SaaS platform
> for service businesses (plumbing, cleaning, HVAC, movers, pest control, etc.) that rivals
> Jobber / ServiceTitan / Housecall Pro.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Prisma Schema Design](#2-prisma-schema-design)
3. [Component Hierarchy & File Structure](#3-component-hierarchy--file-structure)
4. [API Route Design](#4-api-route-design)
5. [Zustand Store Design](#5-zustand-store-design)
6. [Implementation Priority Order](#6-implementation-priority-order)
7. [Rebranding: FlowForge → ServiceOS](#7-rebranding-flowforge--serviceos)

---

## 1. Current State Analysis

### What Already Exists (Keep & Enhance)

| Module | Status | Component | Notes |
|--------|--------|-----------|-------|
| Landing Page | ✅ Good | `landing-page.tsx` | Rebrand to ServiceOS; add service industry illustrations |
| Auth (Email + Google) | ✅ Good | `auth-page.tsx`, `google-onboarding.tsx` | Add demo accounts per industry |
| Dashboard | ✅ Good | `saas-dashboard-view.tsx` | Enhance with today's schedule, conversion funnel |
| Lead Management | ✅ Good | `leads-view.tsx` | Kanban + table, pipeline, convert to job |
| Job Management | ✅ Good | `operations-view.tsx` | Has jobs, resources, webhook sources tabs |
| CRM (Customers + Employees) | ✅ Good | `crm-view.tsx` | Customers & employees CRUD |
| WhatsApp | ✅ Good | `whatsapp-view.tsx` | Conversations, composer, templates, settings |
| Workflow Builder | ✅ Good | `canvas-view.tsx`, `workflow-canvas.tsx` | React Flow visual builder |
| Billing | ✅ Good | `billing-view.tsx` | PayPal, plan cards, billing history |
| Executions | ✅ Basic | `executions-view.tsx` | Workflow execution logs |
| Credentials | ✅ Basic | `credentials-view.tsx` | API key management |
| Settings | ✅ Basic | `settings-view.tsx` | General settings |

### What's Missing (Must Build)

| Module | Priority | Description |
|--------|----------|-------------|
| **Smart Dispatch Center** | P0 | Drag-drop assignment, today's schedule, route optimization |
| **Invoices** | P0 | Generate invoices, taxes, discounts, line items, status flow |
| **Reports** | P1 | Revenue, leads, conversions, employee productivity, service performance |
| **Employee Portal** | P1 | Job notifications, accept/reject, GPS check-in/out |
| **Customer Portal** | P2 | View bookings, reschedule, pay invoices, leave reviews |
| **Admin Panel** | P2 | Manage tenants, subscriptions, platform analytics |
| **AI Features** | P2 | AI Receptionist, Quote Generator, Smart Dispatcher, Analytics |
| **WhatsApp Automation** | P1 | Pre-built automation templates for service businesses |

### Schema Gaps

- No `InvoiceItem` model (structured line items)
- No `EmployeeCheckIn` model (GPS tracking)
- No `Review` model (customer feedback)
- No `Service` model (service catalog per tenant)
- No `Notification` model (in-app notifications)
- No `Quote` model (AI-generated quotes)
- No `AutomationTemplate` model (pre-built workflow templates)
- `Invoice` uses `itemsJson` instead of structured items

---

## 2. Prisma Schema Design

### New Models to Add

```prisma
// ==========================================
// SERVICE CATALOG
// ==========================================

model Service {
  id            String   @id @default(cuid())
  name          String
  description   String?
  category      String   // plumbing, cleaning, hvac, moving, pest_control, electrical, salon, courier, laundry, car_wash, repair
  basePrice     Float    @default(0)
  durationMinutes Int    @default(60)
  isActive      Boolean  @default(true)
  icon          String?
  tenantId      String?
  workspaceId   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant        Tenant?    @relation(fields: [tenantId], references: [id])
  workspace     Workspace? @relation(fields: [workspaceId], references: [id])
  invoiceItems  InvoiceItem[]

  @@index([tenantId])
  @@index([category])
  @@index([isActive])
}

// ==========================================
// INVOICE LINE ITEMS (structured)
// ==========================================

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  serviceId   String?
  description String
  quantity    Float    @default(1)
  unitPrice   Float    @default(0)
  total       Float    @default(0)
  taxRate     Float    @default(0)
  discount    Float    @default(0)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  service     Service? @relation(fields: [serviceId], references: [id])

  @@index([invoiceId])
}

// ==========================================
// EMPLOYEE CHECK-IN/OUT (GPS Tracking)
// ==========================================

model EmployeeCheckIn {
  id          String   @id @default(cuid())
  employeeId  String
  jobId       String?
  type        String   // check_in, check_out, break_start, break_end
  latitude    Float?
  longitude   Float?
  address     String?
  notes       String?
  timestamp   DateTime @default(now())
  createdAt   DateTime @default(now())

  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  job         Job?     @relation(fields: [jobId], references: [id])

  @@index([employeeId])
  @@index([jobId])
  @@index([timestamp])
}

// ==========================================
// CUSTOMER REVIEWS
// ==========================================

model Review {
  id          String   @id @default(cuid())
  customerId  String
  employeeId  String?
  jobId       String?
  tenantId    String?
  rating      Int      // 1-5
  title       String?
  comment     String?
  status      String   @default("published") // published, hidden, flagged
  source      String   @default("manual") // manual, whatsapp, email, google
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  employee    Employee? @relation(fields: [employeeId], references: [id])
  job         Job?     @relation(fields: [jobId], references: [id])
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])

  @@index([customerId])
  @@index([employeeId])
  @@index([jobId])
  @@index([tenantId])
  @@index([rating])
}

// ==========================================
// IN-APP NOTIFICATIONS
// ==========================================

model Notification {
  id          String   @id @default(cuid())
  userId      String?
  tenantId    String?
  type        String   // lead, job, invoice, system, dispatch, review
  title       String
  message     String
  dataJson    String   @default("{}")
  read        Boolean  @default(false)
  actionUrl   String?
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])

  @@index([userId])
  @@index([tenantId])
  @@index([read])
  @@index([createdAt])
}

// ==========================================
// AI QUOTES
// ==========================================

model Quote {
  id            String   @id @default(cuid())
  leadId        String?  @unique
  tenantId      String?
  customerId    String?
  serviceType   String?
  description   String?
  estimatedCost Float    @default(0)
  breakdownJson String   @default("{}")  // structured cost breakdown
  status        String   @default("draft") // draft, sent, accepted, rejected, expired
  validUntil    DateTime?
  notes         String?
  createdByAI   Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  lead          Lead?    @relation(fields: [leadId], references: [id])
  tenant        Tenant?  @relation(fields: [tenantId], references: [id])
  customer      Customer? @relation(fields: [customerId], references: [id])

  @@index([tenantId])
  @@index([status])
  @@index([leadId])
}

// ==========================================
// AUTOMATION TEMPLATES (pre-built for service businesses)
// ==========================================

model AutomationTemplate {
  id            String   @id @default(cuid())
  name          String
  description   String?
  category      String   // lead, job, invoice, whatsapp, dispatch, review
  industry      String?  // null = all industries, or specific like "plumbing"
  triggerType   String   // lead_created, job_created, job_completed, invoice_overdue, etc.
  triggerConfigJson String @default("{}")
  actionsJson   String   @default("[]")  // array of action configs
  isActive      Boolean  @default(true)
  usageCount    Int      @default(0)
  rating        Float    @default(0)
  icon          String?
  featured      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([category])
  @@index([industry])
  @@index([featured])
}
```

### Existing Models to Modify

```prisma
// Add to Tenant model:
// + brandingJson    String   @default("{}")   // logo, colors, font
// + themeJson       String   @default("{}")   // UI theme overrides
// + servicesEnabledJson String @default("{}") // which service modules are active
// + stripeCustomerId String?
// + stripeSubscriptionId String?

// Add to Customer model:
// + company       String?
// + notes         String?
// + tagsJson      String   @default("[]")
// + totalSpent    Float    @default(0)
// + totalJobs     Int      @default(0)
// + lastJobAt     DateTime?
// + reviews       Review[]
// + quotes        Quote[]

// Add to Employee model:
// + email         String?
// + address       String?
// + userId        String?    // link to User account for employee portal
// + isActive      Boolean    @default(true)
// + hourlyRate    Float      @default(0)
// + checkIns      EmployeeCheckIn[]
// + reviews       Review[]

// Add to Job model:
// + serviceType   String?    // from Service catalog
// + estimatedDuration Int?   // in minutes
// + actualDuration   Int?    // in minutes
// + quotedPrice   Float?
// + finalPrice    Float?
// + checklistJson String   @default("[]") // task checklist
// + photosJson    String   @default("[]") // before/after photos
// + checkIns      EmployeeCheckIn[]
// + review        Review?

// Add to Invoice model:
// + invoiceItems  InvoiceItem[]  // structured line items
// + paymentMethod String?        // stripe, paypal, cash, bank_transfer
// + paymentRef    String?        // external payment reference
// + stripeInvoiceId String?
// + stripePaymentIntentId String?

// Add to Lead model:
// + quote         Quote?

// Add to User model:
// + notifications Notification[]
```

---

## 3. Component Hierarchy & File Structure

### Updated View Types

```typescript
// src/types/workflow.ts - Updated ViewType
export type ViewType =
  | 'dashboard'
  | 'leads'
  | 'jobs'           // was 'operations' - renamed for clarity
  | 'dispatch'       // NEW: Smart Dispatch Center
  | 'crm'
  | 'invoices'       // NEW: Invoice management
  | 'reports'        // NEW: Analytics & Reports
  | 'whatsapp'
  | 'automations'    // was 'workflows' - renamed
  | 'canvas'         // workflow editor
  | 'executions'
  | 'credentials'
  | 'integrations'
  | 'variables'
  | 'templates'
  | 'settings'
  | 'billing'
  | 'admin'          // NEW: Admin Panel
  | 'employee-portal' // NEW: Employee view
  | 'customer-portal' // NEW: Customer view
  | 'ai'             // NEW: AI Features hub
  | 'versionHistory';
```

### Complete File Structure

```
src/
├── app/
│   ├── page.tsx                          # Root - client-side routing
│   ├── layout.tsx                        # App layout
│   ├── globals.css                       # Global styles
│   └── api/
│       ├── auth/                         # ✅ existing
│       │   ├── me/route.ts
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── logout/route.ts
│       │   └── google/
│       │       ├── route.ts
│       │       ├── callback/route.ts
│       │       └── complete/route.ts
│       ├── leads/                        # ✅ existing
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── convert/route.ts
│       ├── jobs/                         # ✅ existing
│       │   ├── route.ts
│       │   ├── create/route.ts
│       │   ├── [id]/route.ts
│       │   ├── lifecycle/route.ts
│       │   ├── stats/route.ts
│       │   └── smart-assign/route.ts
│       ├── invoices/                     # 🆕 NEW
│       │   ├── route.ts                  # GET list, POST create
│       │   ├── [id]/route.ts             # GET one, PUT update, DELETE
│       │   ├── [id]/send/route.ts        # POST send invoice
│       │   ├── [id]/pay/route.ts         # POST mark as paid
│       │   └── stats/route.ts            # GET invoice stats
│       ├── dispatch/                     # 🆕 NEW
│       │   ├── route.ts                  # GET dispatch board data
│       │   ├── assign/route.ts           # POST assign employee to job
│       │   ├── unassign/route.ts         # POST unassign
│       │   └── schedule/route.ts         # GET today's schedule
│       ├── reports/                      # 🆕 NEW
│       │   ├── route.ts                  # GET overview
│       │   ├── revenue/route.ts          # GET revenue data
│       │   ├── leads/route.ts            # GET leads analytics
│       │   ├── employees/route.ts        # GET employee productivity
│       │   └── services/route.ts         # GET service performance
│       ├── employees/                    # ✅ existing - extend
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── [id]/checkins/route.ts    # 🆕 GPS check-in/out
│       ├── customers/                    # ✅ existing - extend
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── reviews/                      # 🆕 NEW
│       │   ├── route.ts                  # GET list, POST create
│       │   └── [id]/route.ts             # PUT update, DELETE
│       ├── notifications/                # 🆕 NEW
│       │   ├── route.ts                  # GET list
│       │   └── [id]/read/route.ts        # PUT mark as read
│       ├── services/                     # 🆕 NEW - service catalog
│       │   ├── route.ts                  # GET list, POST create
│       │   └── [id]/route.ts             # PUT update, DELETE
│       ├── quotes/                       # 🆕 NEW
│       │   ├── route.ts                  # GET list, POST generate
│       │   └── [id]/route.ts             # GET one, PUT update
│       ├── ai/                           # 🆕 NEW
│       │   ├── receptionist/route.ts     # POST AI chat
│       │   ├── quote-generator/route.ts  # POST generate quote
│       │   ├── smart-dispatch/route.ts   # POST optimize assignments
│       │   └── analytics/route.ts        # POST AI insights
│       ├── admin/                        # 🆕 NEW
│       │   ├── tenants/route.ts          # GET all tenants
│       │   ├── tenants/[id]/route.ts     # PUT update tenant
│       │   ├── stats/route.ts            # GET platform stats
│       │   └── subscriptions/route.ts    # GET all subscriptions
│       ├── workflows/                    # ✅ existing
│       ├── credentials/                  # ✅ existing
│       ├── whatsapp/                     # ✅ existing
│       ├── paypal/                       # ✅ existing
│       ├── subscriptions/               # ✅ existing
│       ├── workspaces/                   # ✅ existing
│       ├── saas-stats/                   # ✅ existing
│       ├── seed-demo/                    # ✅ existing
│       ├── resources/                    # ✅ existing
│       ├── contact-lists/               # ✅ existing
│       ├── templates/                   # ✅ existing
│       ├── variables/                   # ✅ existing
│       ├── webhook-sources/             # ✅ existing
│       ├── webhook-ingest/              # ✅ existing
│       └── webhook-test/                # ✅ existing
│
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx               # ✅ existing - update view switcher
│   │   ├── sidebar.tsx                  # ✅ existing - add new nav items
│   │   └── header.tsx                   # ✅ existing - add notifications
│   │
│   ├── views/
│   │   ├── saas-dashboard-view.tsx      # ✅ existing - enhance
│   │   ├── leads-view.tsx              # ✅ existing
│   │   ├── operations-view.tsx         # ✅ existing - rename to jobs view
│   │   ├── crm-view.tsx                # ✅ existing
│   │   ├── whatsapp-view.tsx           # ✅ existing
│   │   ├── workflows-view.tsx          # ✅ existing
│   │   ├── canvas-view.tsx             # ✅ existing
│   │   ├── executions-view.tsx         # ✅ existing
│   │   ├── credentials-view.tsx        # ✅ existing
│   │   ├── integrations-view.tsx       # ✅ existing
│   │   ├── variables-view.tsx          # ✅ existing
│   │   ├── templates-view.tsx          # ✅ existing
│   │   ├── settings-view.tsx           # ✅ existing
│   │   ├── version-history-view.tsx    # ✅ existing
│   │   ├── billing-view.tsx            # ✅ existing
│   │   │
│   │   │── 🆕 NEW VIEWS ─────────────────────────
│   │   ├── dispatch-view.tsx           # Smart Dispatch Center
│   │   ├── invoices-view.tsx           # Invoice management
│   │   ├── reports-view.tsx            # Analytics & Reports
│   │   ├── admin-view.tsx              # Admin Panel
│   │   ├── employee-portal-view.tsx    # Employee Portal
│   │   ├── customer-portal-view.tsx    # Customer Portal
│   │   └── ai-view.tsx                 # AI Features Hub
│   │
│   ├── dispatch/                        # 🆕 Smart Dispatch components
│   │   ├── dispatch-board.tsx           # Main board layout
│   │   ├── available-employees.tsx      # Employee availability cards
│   │   ├── job-assignment-card.tsx      # Draggable job card
│   │   ├── schedule-timeline.tsx        # Today's schedule timeline
│   │   ├── route-map.tsx               # Route visualization (placeholder)
│   │   └── dispatch-stats.tsx           # Quick stats bar
│   │
│   ├── invoices/                        # 🆕 Invoice components
│   │   ├── invoice-list.tsx             # Table/list of invoices
│   │   ├── invoice-detail.tsx           # Full invoice view
│   │   ├── invoice-form.tsx             # Create/edit invoice form
│   │   ├── invoice-items-editor.tsx     # Line items editor
│   │   ├── invoice-preview.tsx          # PDF-style preview
│   │   └── invoice-status-badge.tsx     # Status badge component
│   │
│   ├── reports/                         # 🆕 Reports components
│   │   ├── revenue-chart.tsx            # Revenue trend chart
│   │   ├── leads-funnel.tsx             # Lead conversion funnel
│   │   ├── employee-productivity.tsx    # Employee performance table
│   │   ├── service-performance.tsx      # Service type breakdown
│   │   ├── date-range-picker.tsx        # Date range filter
│   │   └── report-card.tsx              # Reusable stat card
│   │
│   ├── admin/                           # 🆕 Admin Panel components
│   │   ├── tenant-list.tsx              # All tenants table
│   │   ├── tenant-detail.tsx            # Single tenant view
│   │   ├── platform-stats.tsx           # Platform-wide analytics
│   │   └── subscription-manager.tsx     # Manage subscriptions
│   │
│   ├── employee-portal/                 # 🆕 Employee Portal components
│   │   ├── job-notifications.tsx        # New job alerts
│   │   ├── job-accept-reject.tsx        # Accept/reject flow
│   │   ├── check-in-out.tsx             # GPS check-in/out
│   │   ├── my-schedule.tsx              # Employee's schedule
│   │   └── job-checklist.tsx            # Task checklist
│   │
│   ├── customer-portal/                 # 🆕 Customer Portal components
│   │   ├── my-bookings.tsx              # Customer's bookings
│   │   ├── booking-detail.tsx           # Booking details
│   │   ├── reschedule-dialog.tsx        # Reschedule flow
│   │   ├── pay-invoice.tsx              # Payment flow
│   │   ├── leave-review.tsx             # Review form
│   │   └── booking-history.tsx          # Past bookings
│   │
│   ├── ai/                              # 🆕 AI Feature components
│   │   ├── ai-receptionist.tsx          # AI chat interface
│   │   ├── quote-generator.tsx          # Auto-quote generator
│   │   ├── smart-dispatch-suggest.tsx   # AI dispatch suggestions
│   │   └── ai-insights.tsx              # AI analytics insights
│   │
│   ├── shared/                          # 🆕 Shared/reusable components
│   │   ├── data-table.tsx               # Reusable data table
│   │   ├── stat-card.tsx                # Reusable stat card
│   │   ├── status-badge.tsx             # Universal status badges
│   │   ├── date-picker.tsx              # Date picker
│   │   ├── currency-input.tsx           # Currency formatted input
│   │   ├── phone-input.tsx              # Phone number input
│   │   ├── empty-state.tsx              # Empty state placeholder
│   │   └── loading-skeleton.tsx         # Skeleton loaders
│   │
│   ├── auth/                            # ✅ existing
│   ├── landing/                         # ✅ existing
│   ├── onboarding/                      # ✅ existing
│   ├── canvas/                          # ✅ existing
│   ├── whatsapp/                        # ✅ existing
│   └── ui/                              # ✅ existing (shadcn/ui)
│
├── store/
│   ├── app-store.ts                     # ✅ existing - extend
│   ├── workflow-store.ts                # ✅ existing
│   ├── execution-store.ts               # ✅ existing
│   ├── dispatch-store.ts                # 🆕 NEW
│   ├── invoice-store.ts                 # 🆕 NEW
│   ├── report-store.ts                  # 🆕 NEW
│   ├── notification-store.ts            # 🆕 NEW
│   └── admin-store.ts                   # 🆕 NEW
│
├── types/
│   ├── index.ts                         # ✅ existing
│   ├── workflow.ts                      # ✅ existing - add ViewType
│   ├── service-os.ts                    # 🆕 NEW - all ServiceOS types
│   └── api.ts                           # 🆕 NEW - API response types
│
├── lib/
│   ├── db.ts                            # ✅ existing
│   ├── utils.ts                         # ✅ existing
│   ├── auth.ts                          # ✅ existing
│   ├── paypal.ts                        # ✅ existing
│   ├── workflow-executor.ts             # ✅ existing
│   ├── node-registry.ts                # ✅ existing
│   ├── whatsapp-config.ts              # ✅ existing
│   ├── webhook-buffer.ts               # ✅ existing
│   ├── stripe.ts                        # 🆕 NEW - Stripe integration
│   ├── invoice-utils.ts                # 🆕 NEW - Invoice number generation, tax calc
│   ├── dispatch-engine.ts              # 🆕 NEW - Smart assignment algorithm
│   ├── ai-engine.ts                    # 🆕 NEW - AI integration helpers
│   └── report-aggregator.ts            # 🆕 NEW - Report data aggregation
│
├── hooks/
│   ├── use-mobile.ts                    # ✅ existing
│   ├── use-toast.ts                     # ✅ existing
│   ├── use-app-store.ts                # ✅ existing (re-export)
│   ├── use-debounce.ts                 # 🆕 NEW
│   └── use-polling.ts                  # 🆕 NEW - data polling hook
│
└── scripts/
    ├── seed-all.ts                      # ✅ existing - extend
    └── seed-service-os.ts              # 🆕 NEW - ServiceOS demo data
```

---

## 4. API Route Design

### Invoice API

```
GET    /api/invoices                    # List invoices (filter: status, customerId, jobId, dateRange)
POST   /api/invoices                    # Create invoice
GET    /api/invoices/stats              # Invoice statistics (draft/sent/paid/overdue counts, totals)
GET    /api/invoices/[id]               # Get single invoice with items
PUT    /api/invoices/[id]               # Update invoice (edit items, status)
DELETE /api/invoices/[id]               # Delete draft invoice
POST   /api/invoices/[id]/send          # Send invoice (change status to "sent", trigger WhatsApp/email)
POST   /api/invoices/[id]/pay           # Mark as paid (process payment or manual mark)
POST   /api/invoices/[id]/reminder      # Send payment reminder
```

### Dispatch API

```
GET    /api/dispatch                    # Get dispatch board data (available employees, unassigned jobs, today's schedule)
POST   /api/dispatch/assign             # Assign employee to job (employeeId, jobId)
POST   /api/dispatch/unassign           # Unassign employee from job
GET    /api/dispatch/schedule           # Get today's schedule (all assigned jobs with time slots)
POST   /api/dispatch/bulk-assign        # Bulk assign multiple jobs
```

### Reports API

```
GET    /api/reports/overview            # Dashboard overview stats
GET    /api/reports/revenue             # Revenue data (by month, week, service type)
GET    /api/reports/leads               # Leads analytics (by source, status, conversion rate)
GET    /api/reports/employees           # Employee productivity (jobs completed, rating, hours)
GET    /api/reports/services            # Service performance (by type, revenue, completion rate)
```

### Employee Portal API

```
GET    /api/employees/[id]/checkins     # Get check-in history
POST   /api/employees/[id]/checkins     # Create check-in/out (with lat/lng)
GET    /api/employees/[id]/jobs         # Get employee's assigned jobs
POST   /api/employees/[id]/accept-job   # Accept a job assignment
POST   /api/employees/[id]/reject-job   # Reject a job assignment
```

### Customer Portal API

```
GET    /api/customers/[id]/bookings     # Get customer's bookings
POST   /api/customers/[id]/reschedule   # Reschedule a booking
GET    /api/customers/[id]/invoices     # Get customer's invoices
POST   /api/customers/[id]/pay          # Pay an invoice
POST   /api/customers/[id]/reviews      # Leave a review
```

### Reviews API

```
GET    /api/reviews                     # List reviews (filter: rating, employeeId, serviceType)
POST   /api/reviews                     # Create review
PUT    /api/reviews/[id]                # Update review status (publish/hide/flag)
DELETE /api/reviews/[id]                # Delete review
```

### Notifications API

```
GET    /api/notifications               # List notifications (filter: read/unread, type)
PUT    /api/notifications/[id]/read     # Mark as read
POST   /api/notifications/read-all      # Mark all as read
```

### Service Catalog API

```
GET    /api/services                    # List services (filter: category, active)
POST   /api/services                    # Create service
PUT    /api/services/[id]               # Update service
DELETE /api/services/[id]               # Delete/deactivate service
```

### Quotes API

```
GET    /api/quotes                      # List quotes
POST   /api/quotes                      # Generate quote (manual or AI)
GET    /api/quotes/[id]                 # Get quote details
PUT    /api/quotes/[id]                 # Update quote (accept/reject)
POST   /api/quotes/[id]/convert         # Convert quote to job + invoice
```

### AI API

```
POST   /api/ai/receptionist             # AI receptionist chat endpoint
POST   /api/ai/quote-generator          # Generate quote from lead data
POST   /api/ai/smart-dispatch           # Get AI-suggested assignments
POST   /api/ai/analytics                # Get AI-powered insights
```

### Admin API

```
GET    /api/admin/tenants               # List all tenants (with stats)
PUT    /api/admin/tenants/[id]          # Update tenant (plan, status, features)
GET    /api/admin/stats                 # Platform-wide analytics
GET    /api/admin/subscriptions         # All subscriptions overview
```

---

## 5. Zustand Store Design

### Updated App Store (`store/app-store.ts`)

```typescript
interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Sidebar
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Current workflow being edited
  currentWorkflowId: string | null;
  setCurrentWorkflowId: (id: string | null) => void;

  // Search (global)
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Workspace
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;
  currentWorkspaceName: string;
  setCurrentWorkspaceName: (name: string) => void;

  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;

  // Auth
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  clearAuth: () => void;

  // 🆕 Role-based view mode
  viewMode: 'owner' | 'employee' | 'customer';
  setViewMode: (mode: 'owner' | 'employee' | 'customer') => void;

  // 🆕 Date range for reports
  reportDateRange: { from: Date; to: Date };
  setReportDateRange: (range: { from: Date; to: Date }) => void;
}
```

### New: Dispatch Store (`store/dispatch-store.ts`)

```typescript
interface DispatchState {
  // Board state
  availableEmployees: Employee[];
  unassignedJobs: Job[];
  todaySchedule: ScheduledJob[];

  // Drag-drop
  draggedJobId: string | null;
  setDraggedJobId: (id: string | null) => void;

  // Filters
  viewMode: 'board' | 'timeline' | 'map';
  setViewMode: (mode: 'board' | 'timeline' | 'map') => void;
  dateFilter: string; // 'today' | 'week' | 'custom'
  setDateFilter: (filter: string) => void;

  // Loading
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Actions
  fetchBoardData: () => Promise<void>;
  assignJob: (jobId: string, employeeId: string) => Promise<void>;
  unassignJob: (jobId: string) => Promise<void>;
  bulkAssign: (assignments: { jobId: string; employeeId: string }[]) => Promise<void>;
}
```

### New: Invoice Store (`store/invoice-store.ts`)

```typescript
interface InvoiceState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  stats: {
    totalDraft: number;
    totalSent: number;
    totalPaid: number;
    totalOverdue: number;
    totalRevenue: number;
    outstandingAmount: number;
  };

  // Filters
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateRange: { from: Date | null; to: Date | null };
  setDateRange: (range: { from: Date | null; to: Date | null }) => void;

  // Dialogs
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  showDetailDialog: boolean;
  setShowDetailDialog: (show: boolean) => void;

  // Actions
  fetchInvoices: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createInvoice: (data: CreateInvoiceData) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  sendInvoice: (id: string) => Promise<void>;
  markAsPaid: (id: string, paymentData?: PaymentData) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}
```

### New: Report Store (`store/report-store.ts`)

```typescript
interface ReportState {
  // Date range
  dateRange: { from: Date; to: Date };
  setDateRange: (range: { from: Date; to: Date }) => void;

  // Active report tab
  activeTab: 'overview' | 'revenue' | 'leads' | 'employees' | 'services';
  setActiveTab: (tab: string) => void;

  // Data
  revenueData: RevenueDataPoint[];
  leadAnalytics: LeadAnalytics;
  employeeProductivity: EmployeeProductivity[];
  servicePerformance: ServicePerformance[];
  overviewStats: OverviewStats;

  // Loading
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Actions
  fetchOverview: () => Promise<void>;
  fetchRevenue: () => Promise<void>;
  fetchLeadAnalytics: () => Promise<void>;
  fetchEmployeeProductivity: () => Promise<void>;
  fetchServicePerformance: () => Promise<void>;
  fetchAll: () => Promise<void>;
  exportReport: (format: 'csv' | 'pdf') => Promise<void>;
}
```

### New: Notification Store (`store/notification-store.ts`)

```typescript
interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => void;
}
```

### New: Admin Store (`store/admin-store.ts`)

```typescript
interface AdminState {
  tenants: TenantWithStats[];
  currentTenantId: string | null;
  platformStats: PlatformStats;
  subscriptions: SubscriptionSummary[];

  // Filters
  planFilter: string;
  statusFilter: string;
  searchQuery: string;

  // Loading
  loading: boolean;

  // Actions
  fetchTenants: () => Promise<void>;
  fetchPlatformStats: () => Promise<void>;
  fetchSubscriptions: () => Promise<void>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<void>;
  suspendTenant: (id: string) => Promise<void>;
  activateTenant: (id: string) => Promise<void>;
}
```

---

## 6. Implementation Priority Order

### Phase 1: Core Business Operations (Week 1-2) — MUST HAVE

**Goal**: Complete the core service business loop: Lead → Quote → Job → Invoice → Payment

| # | Task | Est. | Files |
|---|------|------|-------|
| 1.1 | **Rebrand FlowForge → ServiceOS** | 2h | All references in sidebar, landing, loading states, localStorage keys |
| 1.2 | **Update Prisma schema** — add all new models | 3h | `prisma/schema.prisma` |
| 1.3 | **Run `prisma db push`** — apply schema | 0.5h | Terminal |
| 1.4 | **Build Invoices module** | 16h | `invoices-view.tsx`, `invoice-*.tsx`, `/api/invoices/*`, `invoice-store.ts`, `invoice-utils.ts` |
| 1.5 | **Build Smart Dispatch Center** | 16h | `dispatch-view.tsx`, `dispatch-*.tsx`, `/api/dispatch/*`, `dispatch-store.ts`, `dispatch-engine.ts` |
| 1.6 | **Build Reports module** | 12h | `reports-view.tsx`, `report-*.tsx`, `/api/reports/*`, `report-store.ts`, `report-aggregator.ts` |
| 1.7 | **Update Sidebar** — add Dispatch, Invoices, Reports | 2h | `sidebar.tsx`, `app-layout.tsx` |
| 1.8 | **Update Dashboard** — add today's schedule widget, conversion funnel | 4h | `saas-dashboard-view.tsx` |
| 1.9 | **Update ViewType** — add new views | 1h | `types/workflow.ts` |
| 1.10 | **Service Catalog** — CRUD for tenant services | 8h | Service model API + settings integration |

### Phase 2: Portals & Communication (Week 3-4) — HIGH PRIORITY

**Goal**: Employee and Customer self-service portals, WhatsApp automation

| # | Task | Est. | Files |
|---|------|------|-------|
| 2.1 | **Employee Portal** — job notifications, accept/reject, GPS check-in | 16h | `employee-portal-view.tsx`, `employee-portal/*.tsx`, `/api/employees/[id]/*` |
| 2.2 | **Customer Portal** — bookings, reschedule, pay, review | 16h | `customer-portal-view.tsx`, `customer-portal/*.tsx`, `/api/customers/[id]/*` |
| 2.3 | **Reviews system** — customer reviews, ratings | 8h | `reviews/` API, Review model integration |
| 2.4 | **Notifications system** — in-app notification bell | 8h | `notification-store.ts`, `/api/notifications/*`, header integration |
| 2.5 | **WhatsApp Automation templates** — pre-built for service businesses | 12h | `AutomationTemplate` model, seed data, UI in WhatsApp view |
| 2.6 | **Role-based view switching** — owner/employee/customer modes | 4h | `app-store.ts` viewMode, `app-layout.tsx` |
| 2.7 | **Demo accounts per industry** — plumbing, cleaning, HVAC | 4h | `seed-service-os.ts`, `/api/seed-demo` |

### Phase 3: AI & Admin (Week 5-6) — MEDIUM PRIORITY

**Goal**: AI features and admin panel for platform management

| # | Task | Est. | Files |
|---|------|------|-------|
| 3.1 | **AI Receptionist** — chat interface for lead capture | 12h | `ai-receptionist.tsx`, `/api/ai/receptionist` |
| 3.2 | **AI Quote Generator** — auto-generate quotes from leads | 8h | `quote-generator.tsx`, `/api/ai/quote-generator`, Quote model |
| 3.3 | **Smart Dispatcher AI** — AI-suggested job assignments | 8h | `smart-dispatch-suggest.tsx`, `/api/ai/smart-dispatch` |
| 3.4 | **AI Analytics** — insights and recommendations | 8h | `ai-insights.tsx`, `/api/ai/analytics` |
| 3.5 | **Admin Panel** — tenant management, platform stats | 16h | `admin-view.tsx`, `admin/*.tsx`, `/api/admin/*`, `admin-store.ts` |
| 3.6 | **Stripe integration** — for Pro/Enterprise billing | 12h | `stripe.ts`, `/api/stripe/*`, billing-view enhancement |

### Phase 4: Polish & Production (Week 7-8) — LOW PRIORITY

**Goal**: Production-readiness, performance, UX polish

| # | Task | Est. | Files |
|---|------|------|-------|
| 4.1 | **Shared components** — DataTable, StatCard, StatusBadge | 8h | `shared/*.tsx` |
| 4.2 | **Landing page redesign** — ServiceOS branding, industry-specific hero | 8h | `landing-page.tsx` |
| 4.3 | **Industry onboarding** — industry-specific setup flows | 6h | `industry-onboarding.tsx` |
| 4.4 | **Mobile responsive** — all views work on mobile | 12h | All view components |
| 4.5 | **Performance optimization** — lazy loading, code splitting | 6h | Dynamic imports, React.lazy |
| 4.6 | **Error handling** — error boundaries, toast messages | 4h | Error boundary component |
| 4.7 | **E2E seed data** — comprehensive demo data per industry | 4h | `seed-service-os.ts` |
| 4.8 | **Accessibility** — keyboard nav, ARIA labels | 6h | All interactive components |

---

## 7. Rebranding: FlowForge → ServiceOS

### String Replacements

| Old | New | Files |
|-----|-----|-------|
| `FlowForge` | `ServiceOS` | sidebar, landing page, loading states, auth pages |
| `flowforge_user` | `serviceos_user` | localStorage keys in `page.tsx` |
| `flowforge_tenant` | `serviceos_tenant` | localStorage keys in `page.tsx` |
| `Loading FlowForge...` | `Loading ServiceOS...` | `page.tsx` |
| `/logo.svg` | New ServiceOS logo | `public/logo.svg` |

### Updated Sidebar Navigation

```
┌─────────────────────────────────────┐
│  ⚡ ServiceOS           [Growth]    │
│  ▼ Acme Plumbing                    │
├─────────────────────────────────────┤
│  📊 Dashboard                       │
│  🎯 Leads                           │
│  📋 Jobs                            │
│  🚀 Dispatch                        │  ← NEW
│  👥 CRM                             │
│  📄 Invoices                        │  ← NEW
│  📈 Reports                         │  ← NEW
│  💬 WhatsApp                        │
│  🔄 Automations                     │
│  ⚙️ Settings                        │
│  ─────────────                      │
│  🤖 AI Features                     │  ← NEW
│  💳 Billing                         │
│  🔑 Credentials                     │
│  🔌 Integrations                    │
│  🛡️ Admin                           │  ← NEW (role=owner only)
└─────────────────────────────────────┘
```

### Updated Landing Page Hero

- **Headline**: "Operations OS for Service Businesses"
- **Subheadline**: "From leads to invoices — manage your entire field service business in one place"
- **Industry icons**: Plumbing, Cleaning, HVAC, Moving, Pest Control, Electrical
- **Social proof**: "500+ service businesses trust ServiceOS"

---

## Key Design Decisions

### 1. Single-Page Architecture
All views are React components switched by `currentView` state. No Next.js routing needed — the entire app lives at `/`. This keeps the app feeling instant and native.

### 2. Multi-Tenancy via Workspace
Each tenant (business) has one or more workspaces. All data is scoped to the current workspace. The sidebar has a workspace switcher.

### 3. Role-Based View Modes
- **Owner/Admin**: Full dashboard with all modules
- **Employee**: Simplified portal showing their jobs, schedule, check-in
- **Customer**: Booking portal with history, invoices, reviews

### 4. Invoice Status Machine
```
Draft → Sent → Paid
  ↓       ↓
Cancelled  Overdue → Sent (reminder)
```

### 5. Lead → Job → Invoice Pipeline
```
Lead Created
  → Qualify → Quote (optional)
  → Convert to Job
  → Assign & Dispatch
  → Complete Job
  → Generate Invoice
  → Send Invoice
  → Payment Received
  → Request Review
```

### 6. Smart Dispatch Algorithm
1. Filter employees by: availability, skills match, proximity
2. Score each employee by: rating, completed jobs, current workload
3. Suggest top 3 matches for each unassigned job
4. Support drag-drop override for manual assignments

### 7. AI Integration Points
- **Receptionist**: Captures lead info from WhatsApp/web chat → creates lead
- **Quote Generator**: Analyzes lead data + service catalog → generates quote
- **Smart Dispatcher**: Considers skills, location, workload → suggests assignments
- **Analytics**: Identifies trends, predicts revenue, flags at-risk accounts

---

## Estimated Total Effort

| Phase | Hours | Weeks |
|-------|-------|-------|
| Phase 1: Core Operations | 64.5h | 1-2 |
| Phase 2: Portals & Comms | 68h | 3-4 |
| Phase 3: AI & Admin | 64h | 5-6 |
| Phase 4: Polish | 54h | 7-8 |
| **Total** | **250.5h** | **8 weeks** |

With 2 developers, this can be completed in ~4 weeks.
