// ─────────────────────────────────────────────────────────────────────────────
// Shared data-model types for the Superadmin console.
//
// Hoisted out of `superadmin-view.tsx` so the 7 extracted Tab components
// (dashboard-tab, tenants-tab, subscriptions-tab, modules-tab, users-tab,
// audit-logs-tab, credits-tab) can import the exact same types the parent
// `SuperAdminView` uses — without each tab having to redefine them and
// without circular imports back into `superadmin-view.tsx`.
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by `/api/superadmin/stats` (consumed via `useSaasStats`). */
export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  mrr: number;
  arr: number;
  avgChurnRate: number;
  activeSubscriptions: number;
  communication: { totalConversations: number; activeConversations: number };
  healthMetrics: { metric: string; value: number; dimensions: Record<string, unknown>; recordedAt: string }[];
  recentSecurityEvents: { id: string; eventType: string; severity: string; userId: string; tenantId: string; ip: string; createdAt: string }[];
  recentAuditLogs: { id: string; userId: string; tenantId: string | null; action: string; resourceType: string; resourceId: string; ip: string; createdAt: string }[];
  trends: { tenants: number; users: number; revenue: number; subscriptions: number };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  plan: string;
  planStatus: string;
  industry: string;
  country: string;
  currency: string;
  onboardingCompleted: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  mrr: number;
  arr: number;
  createdAt: string;
  userCount: number;
  subscriptionStatus: string | null;
}

export interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  startDate: string | null;
  endDate: string | null;
  pausedDate: string | null;
  pauseReason: string | null;
  seatCount: number;
  aiQuota: number;
  aiUsageCount: number;
  whatsappQuota: number;
  whatsappUsageCount: number;
  createdAt: string | null;
}

export interface FeatureFlagDef {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface MenuItemDef {
  id: string;
  key: string;
  label: string;
  icon?: string;
  section: string;
  enabled: boolean;
  sortOrder?: number;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  avatar?: string | null;
  authProvider?: string | null;
  lastLoginAt?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  tenantId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ip: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string | null;
}

export interface CreditInfo {
  tenantId: string;
  tenantName: string;
  plan: string;
  trialWhatsappCredits: number;
  trialWhatsappUsed: number;
  platformWhatsappEnabled: boolean;
  ownWhatsappConnected: boolean;
  ownEmailProviderConnected: boolean;
}

// Storage status shape returned by `/api/storage/status`. Lives here so the
// DashboardTab can receive it as a prop without redefining the inline type.
export interface StorageStatus {
  activeProvider: string;
  providers: {
    s3: { configured: boolean; bucket?: string; region?: string };
    supabase: { configured: boolean };
    local: { configured: boolean; path: string };
  };
  bucketSetup?: { ok: boolean; message: string };
}

// ─── Tab key union ──────────────────────────────────────────────────────────
//
// The set of all valid left-nav tabs in the SuperAdmin console. Hoisted here
// so child Tab components (notably DashboardTab, which calls
// `onNavigate('tenants')` etc. in its Quick Actions) can type their
// navigation callback against the same union the parent uses.

export type TabKey =
  // Overview
  | 'dashboard'
  // BUSINESS
  | 'tenants' | 'subscriptions' | 'users' | 'credits' | 'industry-templates' | 'directory-listings' | 'creem-billing'
  // PLATFORM
  | 'platform-settings' | 'plan-features' | 'plan-catalog' | 'theme-branding' | 'marketplace' | 'integrations' | 'ai-center' | 'menu-management'
  // COMMUNICATION
  | 'email-services' | 'sms-services' | 'whatsapp-providers' | 'push-notifications'
  // SECURITY
  | 'authentication' | 'security-center' | 'audit-logs' | 'abuse-detection'
  // OPERATIONS
  | 'analytics' | 'platform-reports' | 'background-jobs' | 'system-logs'
  // SUPPORT
  | 'support-center' | 'knowledge-base' | 'announcements'
  // SYSTEM
  | 'feature-flags' | 'localization' | 'storage' | 'infrastructure' | 'system-health' | 'backup';
