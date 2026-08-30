/**
 * Employee feature types.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 * Shared across the main view, the 11 detail tabs, and the 5 dialogs.
 */

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  status: string;
  avatar: string | null;
  skills: string;
  location: string | null;
  rating: number;
  completedJobs: number;
  whatsappId: string | null;
  userId?: string | null;
  invitationStatus?: string;
  createdAt: string;
  latitude?: number | null;
  longitude?: number | null;
  lastSeenAt?: string | null;
  lastLocationAt?: string | null;
  [key: string]: unknown;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly';

export interface PerformanceMetrics {
  jobsCompleted: number;
  jobsAssigned: number;
  hoursWorked: number;
  travelDistanceKm: number;
  travelMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  avgCompletionMinutes: number;
  customerRating: number;
  revenueGenerated: number;
  lateArrivals: number;
  attendanceDays: number;
}

export interface ChartBucket {
  date: string;
  label: string;
  jobsCompleted: number;
  revenue: number;
}

export interface RecentJob {
  id: string;
  jobNumber: string | null;
  title: string;
  status: string;
  customerName: string | null;
  customerRating: number | null;
  createdAt: string;
  completedAt: string | null;
  durationMinutes: number | null;
}

export interface PerformanceResponse {
  employee: { id: string; name: string; avatar: string | null; role: string };
  metrics: PerformanceMetrics;
  previousMetrics: PerformanceMetrics;
  period: PeriodType;
  startDate: string;
  endDate: string;
  chartBuckets: ChartBucket[];
  recentJobs: RecentJob[];
}

export interface EmployeeJob {
  id: string;
  jobNumber: string | null;
  title: string;
  status: string;
  customerName: string | null;
  customer?: { id: string; name: string; phone: string; email: string | null; address: string | null } | null;
  scheduledAt: string | null;
  createdAt: string;
  completedAt: string | null;
  // Geocoded customer-address coordinates (nullable on the Job model).
  // Used by LocationTab ETA computation (haversine distance from the
  // employee's current GPS to the job site). Populated async by
  // geocodeAddress() on job creation; may be null for un-geocoded jobs.
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  [key: string]: unknown;
}

export interface ShiftBreak {
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  reason?: string;
}

export interface SerializedShift {
  id: string;
  employeeId: string;
  shiftDate: string;
  clockIn: string;
  clockOut: string | null;
  breaks: ShiftBreak[];
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  status: string;
  notes: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
}

export interface ShiftsResponse {
  employee: { id: string; name: string; role: string; avatar: string | null };
  today: SerializedShift | null;
  todayTotals: {
    totalMinutes: number;
    workingMinutes: number;
    breakMinutes: number;
    breaks: ShiftBreak[];
  } | null;
  recent: SerializedShift[];
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  authorName?: string | null;
  jobId: string | null;
  customerId: string | null;
  employeeId: string | null;
  source: string;
  status: string;
  npsScore: number | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface EmployeeDocument {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  accessLevel: string;
  employeeId: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface DocumentsResponse {
  documents: EmployeeDocument[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ActivityLogEntry {
  id: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  actorId: string | null;
  actorName: string | null;
  actorType: string | null;
  action: string;
  description: string;
  severity: string;
  metadataJson: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityLogsResponse {
  logs: ActivityLogEntry[];
  total: number;
}

export interface RoutePathPoint {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracy?: number | null;
}

export interface RouteHistoryEntry {
  id: string;
  jobId: string | null;
  startedAt: string;
  endedAt: string | null;
  arrivedAt: string | null;
  status: string;
  distanceMeters: number;
  durationMinutes: number;
  etaMinutes: number | null;
  avgSpeedKmh: number;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  path: RoutePathPoint[];
}

export interface RouteResponse {
  employeeId: string;
  date: string;
  jobId: string | null;
  routes: RouteHistoryEntry[];
  gpsPoints: { id: string; latitude: number; longitude: number; capturedAt: string; isMoving: boolean }[];
  path: RoutePathPoint[];
  summary: {
    totalDistanceMeters: number;
    totalDistanceKm: number;
    totalDurationMinutes: number;
    routeCount: number;
    gpsPointCount: number;
  };
}

// ─── Calendar / Payroll supporting types ────────────────────────────────────

export interface BookingItem {
  id: string;
  title: string;
  status: string;
  source: string | null;
  customerName: string | null;
  customerPhone: string | null;
  address: string | null;
  scheduledAt: string | null;
  scheduledEndTime: string | null;
  duration: number | null;
  employee?: { id: string; name: string; phone: string; avatar: string | null } | null;
  [key: string]: unknown;
}

export interface BookingsResponse {
  bookings: BookingItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface PayrollEntry {
  employee: { id: string; name: string; role: string };
  totalMinutes: number;
  workingMinutes: number;
  breakMinutes: number;
  travelMinutes: number;
  byCategory: Record<string, number>;
  entriesCount: number;
  approvedCount: number;
  pendingCount: number;
}

export interface PayrollResponse {
  payroll: PayrollEntry[];
  periodLabel: string;
}

export interface PayrollError {
  error: string;
}

// Discriminated union of calendar items (jobs + shifts + bookings) for the
// unified date-grouped agenda view in CalendarTab.
export type CalendarItem =
  | { kind: 'job'; id: string; title: string; subtitle: string; scheduledAt: string | null; status: string }
  | { kind: 'shift'; id: string; title: string; subtitle: string; scheduledAt: string; status: string }
  | { kind: 'booking'; id: string; title: string; subtitle: string; scheduledAt: string | null; status: string };

// ─── Equipment types ─────────────────────────────────────────────────────────

export interface EquipmentInventoryItem {
  id: string;
  name: string;
  sku: string | null;
}

/** Minimal asset shape returned by /api/inventory/assets (and by the
 *  `assigned` array of /api/employees/[id]/equipment). */
export interface InventoryAsset {
  id: string;
  name: string;
  serialNumber: string | null;
  assetTag: string | null;
  description: string | null;
  status: string;
  condition: string;
  notes: string | null;
  assignedEmployeeId: string | null;
  assignedAt: string | null;
  assignmentStatus: string | null;
  inventoryItem: EquipmentInventoryItem | null;
  [key: string]: unknown;
}

/** Subset of InventoryAsset attached to each history row by the equipment endpoint. */
export interface InventoryAssetSummary {
  id: string;
  name: string;
  serialNumber: string | null;
  assetTag: string | null;
  inventoryItemId: string | null;
}

export interface InventoryAssetAssignment {
  id: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  returnedAt: string | null;
  assignmentStatus: string;
  notes: string | null;
  asset: InventoryAssetSummary | null;
  [key: string]: unknown;
}

export interface EquipmentResponse {
  employee: { id: string; name: string; role: string };
  assigned: InventoryAsset[];
  history: InventoryAssetAssignment[];
}

export interface AvailableAssetsResponse {
  assets: InventoryAsset[];
  total: number;
  page: number;
  limit: number;
}

// ─── Calendar bucketing + payroll period ────────────────────────────────────

export type CalendarBucket = 'Today' | 'Tomorrow' | 'This Week' | 'Upcoming' | 'Past' | 'Unscheduled';

export type PayrollPeriod = '7d' | '14d' | 'current_month' | 'last_month';

// ─── Invite result (used by InviteResultDialog) ─────────────────────────────

export interface InviteResult {
  url: string;
  email: string;
  message: string;
  mode: 'invite' | 'reset';
}
