/**
 * Reports feature types.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 * Shared across the main view and the 7 extracted tab components.
 *
 * These mirror the shapes returned by /api/analytics and
 * /api/reports/sales-outcomes. They are not auto-generated — they're
 * hand-curated to match the server response for the metrics the Reports
 * view consumes.
 */

// ============================================================
// API Response Types (mirror /api/analytics shapes)
// ============================================================

export interface OverviewResponse {
  metric: 'overview';
  totalJobs: number;
  completedJobs: number;
  activeLeads: number;
  totalRevenue: number;
  totalCustomers: number;
  totalEmployees: number;
  completionRate: number;
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    customerName: string | null;
    createdAt: string;
  }>;
}

export interface RevenueTrendsResponse {
  metric: 'revenue_trends';
  groupBy: string;
  totalRevenue?: number;
  data: Array<{ date: string; value: number }>;
}

export interface JobStatsResponse {
  metric: 'job_stats';
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  avgCompletionTimeMs: number;
  avgCompletionTimeHours: number;
  total: number;
}

export interface EmployeeProductivityResponse {
  metric: 'employee_productivity';
  employees: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    rating: number;
    totalCompletedJobs: number;
    completedInPeriod: number;
  }>;
}

export interface LeadConversionResponse {
  metric: 'lead_conversion';
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface WhatsAppAnalyticsResponse {
  metric: 'whatsapp_analytics';
  totalConversations: number;
  activeConversations: number;
  intentDistribution: Record<string, number>;
  avgResponseTimeMin: number;
  buttonResponseRate: number;
  conversations: Array<{
    id: string;
    currentStage: string;
    intentDetected: string | null;
    lastMessageAt: string | null;
    createdAt: string;
  }>;
}

export interface JourneyAnalyticsResponse {
  metric: 'journey_analytics';
  totalJourneys: number;
  completedJourneys: number;
  completionRate: number;
  stageDistribution: Record<string, number>;
  scheduledActionsPending: number;
  avgJourneyTimeHours: number;
}

// ============================================================
// Sales Outcomes (Phase 6 — Sales Pipeline report)
// ============================================================

export interface SalesOutcomeRow {
  id: string;
  title: string;
  stage: string;
  value: number;
  currency: string;
  customerName: string | null;
  customerPhone: string | null;
  leadId: string | null;
  convertedJobId: string | null;
  lossReason: string | null;
  createdAt: string | null;
  closedAt: string | null;
  type: 'won' | 'lost';
}

export interface SalesOutcomesResponse {
  outcomes: SalesOutcomeRow[];
  totals: {
    wonValue: number;
    lostValue: number;
    wonCount: number;
    lostCount: number;
    winRate: number;
  };
}

// Type filter for the Sales Pipeline tab.
export type SalesOutcomesType = 'all' | 'won' | 'lost';

// ============================================================
// Derived chart-data shapes (used by tab components)
// ============================================================

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface JobStatusDatum {
  status: string;
  key: string;
  count: number;
  fill: string;
}

export interface JobCompletionDatum {
  status: string;
  completed: number;
  in_progress: number;
  pending: number;
  cancelled: number;
}

export interface LeadFunnelStage {
  stage: string;
  count: number;
}

export interface FunnelConversion {
  from: string;
  to: string;
  rate: string;
}

export interface LeadSourceDatum {
  source: string;
  count: number;
  fill: string;
}

export interface RevenueBySourceDatum {
  source: string;
  revenue: number;
  fill: string;
}

export interface RevenueByServiceDatum {
  service: string;
  jobs: number;
}

export interface WorkloadDatum {
  name: string;
  fullName: string;
  jobs: number;
}

export interface IntentDatum {
  intent: string;
  count: number;
  fill: string;
}

export interface WhatsAppVolumeDatum {
  day: string;
  conversations: number;
}

export interface JourneyStageDatum {
  stage: string;
  count: number;
}
