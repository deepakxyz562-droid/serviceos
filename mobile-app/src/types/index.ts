/**
 * Fieseros Mobile App — Shared Types
 * Mirrors the backend Prisma models + PWA portal data shapes used by the app.
 */

export type UserRole = 'customer' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  tenant?: Tenant | null;
  image?: string | null;
  phone?: string | null;
  employeeId?: string | null;
  customerId?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  currency?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  logo?: string | null;
  plan?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  onboardingCompleted?: boolean | null;
}

// ── Company / Tenant resolution ──────────────────────────────────────
// Shape returned by GET /api/companies/resolve?slug= and GET /api/companies/search?q=

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  onboardingCompleted?: boolean | null;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// Shape returned by POST /api/auth/customer/discover
// One entry per company the customer is associated with.

export interface DiscoveredCompany {
  customerId: string;
  customerName: string;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceSlug: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  industry: string | null;
  logo: string | null;
  activated: boolean;
}

export interface DiscoverResult {
  found: boolean;
  identifier: string;
  identifierType: 'email' | 'phone';
  needsActivation: boolean;
  companies: DiscoveredCompany[];
}

// Multi-company conflict returned as 409 by /api/auth/customer/login
export interface MultiCompanyConflict {
  error: string;
  multiCompany: true;
  companies: Array<{
    customerId: string;
    customerName: string;
    tenantId: string | null;
    tenantName: string | null;
    tenantSlug: string | null;
    workspaceName: string | null;
    industry: string | null;
    logo: string | null;
  }>;
}

// ── Marketplace ──────────────────────────────────────────────────────

export interface Provider {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  country?: string | null;
  rating: number | null;
  reviewCount: number;
  serviceCategories: string[];
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  serviceRadiusKm?: number | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  verified?: boolean;
  featured?: boolean;
  services?: Service[];
  certifications?: Certification[];
  portfolio?: PortfolioItem[];
  reviews?: Review[];
  distanceKm?: number | null;
  tenantId?: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  durationMinutes: number | null;
  category?: string | null;
  imageUrl?: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  verified?: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  createdAt?: string | null;
}

export interface MarketplaceCity {
  id?: string;
  name: string;
  slug?: string;
  state?: string | null;
  country?: string | null;
  providerCount?: number;
}

export interface MarketplaceCategory {
  slug: string;
  name: string;
  icon?: string | null;
  count?: number;
}

// ── Bookings ─────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  totalPrice: number | null;
  notes?: string | null;
  address?: string | null;
  provider: Provider;
  service?: Service | null;
  job?: Job | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  createdAt?: string | null;
  lifecycleTimestamps?: Record<string, string | null> | null;
}

// ── Jobs (Employee) ──────────────────────────────────────────────────

export interface Job {
  id: string;
  status: string;
  lifecycleState?: string | null;
  title?: string;
  jobNumber?: string | number;
  verificationPin?: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  // Legacy/audit fields populated by the V1.5 lifecycle route. `actualStartTime`
  // is set on `start_work` (mirrors the PWA's JobDetailSheet `workingTs`
  // fallback). Used by the Time Elapsed card as a fallback when
  // lifecycleTimestamps.working is absent.
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  // ISO timestamp of when the Job row was created (Prisma `createdAt`).
  // Used by the LifecycleProgress pill row's `reached.assigned` fallback
  // (matches the PWA's LifecycleProgress `|| !!job.createdAt` check).
  createdAt?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  internalNotes?: string | null;
  quotedAmount?: number | null;
  estimatedDuration?: number | null;
  priority?: string | null;
  type?: string | null;
  metadataJson?: string | null;
  // Set by the employee lifecycle route after `accept` (status stays 'assigned'
  // but assignmentStatus becomes 'accepted'). Used by resolveLifecycleStage.
  assignmentStatus?: string | null;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  service?: Service | null;
  booking?: Booking | null;
  employee?: { id: string; name: string } | null;
  photos?: JobPhoto[];
  checklist?: ChecklistItem[];
  timeEntries?: TimeEntry[];
  expenses?: JobExpense[];
  visits?: ScheduledVisit[];
  signatures?: JobSignature[];
  lineItems?: JobLineItem[];
  lifecycleTimestamps?: Record<string, string | null> | null;
  // Backend `/api/jobs/[id]` returns counts (NOT arrays) for photos /
  // signatures / checklists via Prisma's `_count` relation aggregate. The
  // mobile app reads these to render the quick-action badges (e.g. "Photos 3")
  // without fetching the full child collections. Optional because some legacy
  // endpoints still return the arrays instead.
  _counts?: {
    photos?: number;
    signatures?: number;
    checklists?: number;
  };
  // Backwards-compat: some code still reads `customerPin`. Newer code should
  // prefer `verificationPin`. Both are kept optional/nullable.
  customerPin?: string | null;
  requiresPin?: boolean;
}

export interface JobPhoto {
  id: string;
  url: string;
  /**
   * Canonical photo taxonomy: 'before' | 'progress' | 'after' | 'issue' | 'other'.
   *
   * Named `photoType` to match the backend's Prisma `JobPhoto.photoType` column
   * and the JSON returned by `/api/jobs/[id]/photos`. The mobile app previously
   * declared this as `type`, which mismatched the API and caused every photo's
   * badge to render as 'undefined' (and the type-based colour mapping to fall
   * back to 'default').
   */
  photoType: string;
  caption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string | null;
  notes?: string | null;
}

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  type?: string | null;
  user?: { id: string; name: string } | null;
}

export interface JobExpense {
  id: string;
  description: string;
  amount: number;
  category?: string | null;
  receiptUrl?: string | null;
  status?: string | null;
  number?: string | null;
  expenseDate?: string | null;
  notes?: string | null;
  employeeName?: string | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface ScheduledVisit {
  id: string;
  scheduledAt: string;
  status: string;
  notes?: string | null;
  durationMinutes?: number | null;
}

export interface JobSignature {
  id: string;
  url: string;
  signerName?: string | null;
  type: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
}

export interface JobLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ── Job Completion Proof ─────────────────────────────────────────────

export interface JobCompletionProof {
  photos: JobPhoto[];
  customerSignature?: JobSignature | null;
  checklistProgress: number;
  notes?: string | null;
  customerName?: string | null;
}

// ── Invoices ─────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  number: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  dueDate: string | null;
  issuedAt?: string | null;
  paidAt: string | null;
  items: InvoiceItem[];
  booking?: Booking | null;
  notes?: string | null;
  receiptUrl?: string | null;
  paymentUrl?: string | null;
  provider?: { id: string; name: string } | null;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ── Quotes ───────────────────────────────────────────────────────────

export interface Quote {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  total: number;
  subtotal: number;
  tax: number;
  issueDate: string | null;
  expiryDate: string | null;
  items: InvoiceItem[];
  provider?: { id: string; name: string } | null;
  notes?: string | null;
}

// ── Inventory ────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  reorderLevel: number;
  unitPrice: number | null;
  location?: string | null;
  status: string;
  imageUrl?: string | null;
  supplier?: { id: string; name: string } | null;
}

export interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  reason?: string | null;
  createdAt: string;
  item: { id: string; name: string };
  user?: { id: string; name: string } | null;
}

// ── Shift ────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  startTime: string;
  endTime: string | null;
  status: string;
  totalHours: number | null;
  breakMinutes?: number;
  location?: string | null;
}

export interface ShiftWeek {
  shifts: Shift[];
  totalHours: number;
  totalShifts: number;
}

// ── Reviews ──────────────────────────────────────────────────────────

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName?: string | null;
  provider?: { id: string; name: string } | null;
  response?: string | null;
  respondedAt?: string | null;
}

// ── Conversations / Messages ─────────────────────────────────────────

export interface Conversation {
  id: string;
  channel: string;
  status: string;
  lastMessageAt: string;
  unreadCount: number;
  customer?: { id: string; name: string; phone?: string | null } | null;
  provider?: { id: string; name: string; phone?: string | null } | null;
  lastMessage?: Message | null;
}

export interface Message {
  id: string;
  body: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  createdAt: string;
  status?: string;
  attachments?: { url: string; type: string }[];
}

// ── Orders (E-commerce) ──────────────────────────────────────────────

export interface Order {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
  provider?: { id: string; name: string } | null;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  imageUrl?: string | null;
}

// ── Payments ─────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  brand?: string | null;
  last4?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  isDefault: boolean;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  invoice?: { id: string; number: string } | null;
}

// ── Notifications ────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string | null;
  data?: Record<string, unknown> | null;
}

// ── Emergency Dispatch ───────────────────────────────────────────────

export interface EmergencyRequest {
  id: string;
  status: string;
  serviceCategory: string;
  description: string;
  address: string;
  createdAt: string;
  acceptedBy?: { id: string; name: string } | null;
}

// ── Generic API ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string | null;
    hasMore?: boolean;
    total?: number;
    nextCursor?: string | null;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// ── Live Job Tracking (public portal) ────────────────────────────────

export interface LiveTrackingInfo {
  jobId: string;
  status: string;
  employeeName?: string | null;
  employeePhone?: string | null;
  etaMinutes?: number | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  scheduledAt: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  provider?: { id: string; name: string; phone?: string | null } | null;
}
