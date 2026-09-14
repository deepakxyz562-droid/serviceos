'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { qk } from '@/lib/query-keys';
import {
  Users, UserPlus, Shield, Clock, CheckCircle2, UserCheck, UserCog,
  Search, Phone, MapPin, Star, Briefcase, Loader2,
  Trash2, Pencil, MoreVertical,
  Mail, Send, KeyRound, Power, Globe, Copy, ExternalLink, AlertCircle,
  ArrowLeft, Calendar, Wrench, MapPinned, Wallet, Activity as ActivityIcon,
  TrendingUp, Building2, ChevronRight, FileStack,
  LayoutGrid, List, Filter, X, MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { authFetch } from '@/lib/client-auth';
import { getInitials } from '@/lib/format-utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useEmployeesList } from '@/hooks/use-crm-data';
import { SECONDARY_EMPLOYEE_TABS, type EmployeeDetailTab } from '@/lib/auth/permissions';
import { TimesheetView } from '@/components/views/timesheet-view';

// ─── Feature imports (Phase 3 extraction) ────────────────────────────────────
import type { Employee, InviteResult } from '@/features/employees/types';
import {
  apiUrl, getStatusColor, getStatusDot, ROLE_OPTIONS, STATUS_OPTIONS,
} from '@/features/employees/utils/employee-helpers';
import {
  getInvitationBadge, StarRating, EmptyState, ForbiddenNotice,
} from '@/features/employees/components/employee-shared';
import { EmployeeFormDialog } from '@/features/employees/components/employee-form-dialog';
import { InviteResultDialog } from '@/features/employees/components/invite-result-dialog';
import { OverviewTab } from '@/features/employees/components/tabs/overview-tab';
import { JobsTab } from '@/features/employees/components/tabs/jobs-tab';
import { CalendarTab } from '@/features/employees/components/tabs/calendar-tab';
import { TimeTrackingTab } from '@/features/employees/components/tabs/time-tracking-tab';
import { PerformanceTab } from '@/features/employees/components/tabs/performance-tab';
import { ReviewsTab } from '@/features/employees/components/tabs/reviews-tab';
import { DocumentsTab } from '@/features/employees/components/tabs/documents-tab';
import { EquipmentTab } from '@/features/employees/components/tabs/equipment-tab';
import { LocationTab } from '@/features/employees/components/tabs/location-tab';
import { PayrollTab } from '@/features/employees/components/tabs/payroll-tab';
import { ActivityTab } from '@/features/employees/components/tabs/activity-tab';

// ─── Compensation Badge Helper ───────────────────────────────────────────────

function getCompensationBadge(emp: Employee) {
  const empRecord = emp as unknown as { metadataJson?: string | Record<string, unknown>; hourlyRate?: number };
  let payType = 'hourly';
  let hourlyRate = empRecord.hourlyRate || 0;
  let commissionRate = 10;
  let flatAmount = 0;
  try {
    const meta = typeof empRecord.metadataJson === 'string'
      ? JSON.parse(empRecord.metadataJson || '{}')
      : (empRecord.metadataJson && typeof empRecord.metadataJson === 'object' ? empRecord.metadataJson : {});
    if (meta.payType) payType = meta.payType;
    if (meta.hourlyRate !== undefined) hourlyRate = meta.hourlyRate;
    if (meta.commissionRate !== undefined) commissionRate = meta.commissionRate;
    if (meta.flatAmount !== undefined) flatAmount = meta.flatAmount;
  } catch {}

  if (payType === 'commission') {
    return (
      <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
        {commissionRate}% Comm
      </Badge>
    );
  }
  if (payType === 'flat') {
    return (
      <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
        ${flatAmount} Flat
      </Badge>
    );
  }
  if (payType === 'subcontractor') {
    return (
      <Badge variant="outline" className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
        1099 Sub
      </Badge>
    );
  }
  if (Number(hourlyRate) > 0) {
    return (
      <Badge variant="outline" className="text-[10px] font-semibold bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800">
        ${hourlyRate}/hr
      </Badge>
    );
  }
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmployeesView() {
  const { currentWorkspaceId, auth, pendingCreate, setPendingCreate } = useAppStore();
  const queryClient = useQueryClient();

  // Pagination state (server-side). Default page size = 10.
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage, setEmployeesPerPage] = useState(10);

  const [search, setSearch] = useState('');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'working' | 'offline'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [listTab, setListTab] = useState<'list' | 'teams'>('list');
  const [tab, setTab] = useState<'employees' | 'timesheet'>('employees');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Invitation/portal management state
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('driver');
  const [formStatus, setFormStatus] = useState('available');
  const [formLocation, setFormLocation] = useState('');
  const [formWhatsappId, setFormWhatsappId] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formPayType, setFormPayType] = useState('hourly');
  const [formHourlyRate, setFormHourlyRate] = useState<number | string>(0);
  const [formCommissionRate, setFormCommissionRate] = useState<number | string>(10);
  const [formFlatAmount, setFormFlatAmount] = useState<number | string>(0);

  // ─── Data fetching (React Query) ───────────────────────────────────────
  // Replaces the manual `useEffect + authFetch('/api/employees')` pattern.
  // RQ keys the query by `{ search, status, page, limit }`, so rapid filter
  // changes no longer race — the latest filter wins and stale responses are
  // discarded. `placeholderData: keepPreviousData` (set in the hook) keeps
  // the previous page visible while the new one loads.
  //
  // NOTE: the backend `/api/employees` filters `status` literally, so the
  // grouped values 'working' (on_job/busy/en_route) and 'offline'
  // (on_leave/offline) only fully match when the backend is taught those
  // mappings. 'available' works directly. The unpaginated stats query below
  // is unaffected and continues to compute grouped counts client-side.
  const { data: employeesData, isLoading: loading, error: rqError } = useEmployeesList({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page: currentPage,
    limit: employeesPerPage,
  });
  const employees = employeesData?.employees ?? [];
  const totalEmployees = employeesData?.pagination?.total ?? 0;
  const totalPages = employeesData?.pagination?.totalPages ?? 1;
  const error = rqError ? (rqError instanceof Error ? rqError.message : 'Failed to load employees') : null;

  // Unpaginated snapshot (no `page` → backend returns the legacy bare-array
  // shape; hook normalizes to { employees, pagination: null }). Used for the
  // stats cards (per-status counts) and the "Teams" grouping, which need to
  // see every employee — not just the current page of 10.
  const { data: allEmployeesData } = useEmployeesList({ limit: 200 });
  const allEmployees = allEmployeesData?.employees ?? [];

  // `fetchEmployees` is called by the existing mutation success handlers
  // (handleAdd / handleEdit / handleDelete / handleSendInvite /
  // handleSuspendToggle) and by the error-retry button. We invalidate the
  // entire `employees` query namespace so both the paginated list query AND
  // the unpaginated stats query above refresh in the background.
  const fetchEmployees = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: qk.employees.all });
  }, [queryClient]);

  // Reset to page 1 whenever the search/status/role filters change so the user
  // doesn't land on a now-empty page after tightening the filter.
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, roleFilter]);

  // ─── Invitation / Portal Management Handlers ────────────────────────────

  const handleSendInvite = async (emp: Employee) => {
    if (!emp.email) {
      toast.error('Employee has no email address. Add an email first.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await authFetch(apiUrl(`/api/employees/${emp.id}/invite`), {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');
      setInviteResult({
        url: data.activationUrl,
        email: data.email,
        message: data.message,
        mode: 'invite',
      });
      toast.success('Invitation link generated!');
      fetchEmployees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResetPassword = async (emp: Employee) => {
    if (!emp.email) {
      toast.error('Employee has no email address.');
      return;
    }
    if (!emp.userId) {
      toast.error('Employee has no user account. Send an invitation first.');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await authFetch(apiUrl(`/api/employees/${emp.id}/reset-password`), {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setInviteResult({
        url: data.resetUrl,
        email: data.email,
        message: data.message,
        mode: 'reset',
      });
      toast.success('Password reset link generated!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSuspendToggle = async (emp: Employee) => {
    setActionLoading(true);
    try {
      const res = await authFetch(apiUrl(`/api/employees/${emp.id}/suspend`), {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      toast.success(data.message);
      fetchEmployees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  // ─── Computed ───────────────────────────────────────────────────────────

  // When a role filter is active, filter the displayed employees.
  const displayedEmployees = useMemo(() => {
    if (roleFilter === 'all') return employees;
    return employees.filter((e) => (e.role || '').toLowerCase() === roleFilter.toLowerCase());
  }, [employees, roleFilter]);

  // Stats are computed across ALL employees (not just the current page) so
  // the "Total Staff / Available / Working / Offline" cards + status filter
  // chips keep showing tenant-wide counts after pagination. `allEmployees`
  // is the unpaginated snapshot fetched above (capped at 200 by the backend,
  // matching the pre-migration behavior).
  const stats = useMemo(() => ({
    total: allEmployees.length,
    available: allEmployees.filter((e) => e.status === 'available').length,
    working: allEmployees.filter((e) => e.status === 'on_job' || e.status === 'busy' || e.status === 'en_route').length,
    offline: allEmployees.filter((e) => e.status === 'on_leave' || e.status === 'offline').length,
  }), [allEmployees]);

  // Teams: derive a simple grouping by role (no dedicated team model exists).
  const teams = useMemo(() => {
    const map = new Map<string, { role: string; count: number; available: number; members: Employee[] }>();
    for (const e of allEmployees) {
      const key = e.role || 'other';
      const entry = map.get(key) ?? { role: key, count: 0, available: 0, members: [] as Employee[] };
      entry.count += 1;
      if (e.status === 'available') entry.available += 1;
      entry.members.push(e);
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allEmployees]);

  // ─── Form helpers ───────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormRole('driver');
    setFormStatus('available');
    setFormLocation('');
    setFormWhatsappId('');
    setFormSkills('');
    setFormPayType('hourly');
    setFormHourlyRate(0);
    setFormCommissionRate(10);
    setFormFlatAmount(0);
  };

  const populateFormForEdit = (emp: Employee) => {
    setFormName(emp.name);
    setFormPhone(emp.phone);
    setFormEmail(emp.email || '');
    setFormRole(emp.role);
    setFormStatus(emp.status);
    setFormLocation(emp.location || '');
    setFormWhatsappId(emp.whatsappId || '');
    try {
      const skillsArr = JSON.parse(emp.skills || '[]');
      setFormSkills(Array.isArray(skillsArr) ? skillsArr.join(', ') : '');
    } catch {
      setFormSkills(emp.skills || '');
    }

    // Extract compensation metadata
    let meta: Record<string, unknown> = {};
    const empRecord = emp as unknown as { metadataJson?: string | Record<string, unknown>; hourlyRate?: number };
    try {
      if (typeof empRecord.metadataJson === 'string') {
        meta = JSON.parse(empRecord.metadataJson || '{}');
      } else if (empRecord.metadataJson && typeof empRecord.metadataJson === 'object') {
        meta = empRecord.metadataJson;
      }
    } catch {}

    setFormPayType((meta.payType as string) || (empRecord.hourlyRate && empRecord.hourlyRate > 0 ? 'hourly' : 'hourly'));
    setFormHourlyRate(typeof empRecord.hourlyRate === 'number' ? empRecord.hourlyRate : (meta.hourlyRate as number) || 0);
    setFormCommissionRate(typeof meta.commissionRate === 'number' ? meta.commissionRate : 10);
    setFormFlatAmount(typeof meta.commissionFlat === 'number' ? meta.commissionFlat : 0);
  };

  // ─── Consume cross-view "New Employee/User" signal ───────────────────────
  useEffect(() => {
    if (pendingCreate === 'employee' || pendingCreate === 'user') {
      resetForm();
      setShowAddDialog(true);
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setSaving(true);
    try {
      const skills = formSkills.trim()
        ? formSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const res = await authFetch(apiUrl('/api/employees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          role: formRole,
          status: formStatus,
          location: formLocation.trim() || undefined,
          whatsappId: formWhatsappId.trim() || undefined,
          skills,
          payType: formPayType,
          hourlyRate: Number(formHourlyRate || 0),
          commissionRate: Number(formCommissionRate || 10),
          flatAmount: Number(formFlatAmount || 0),
          workspaceId: currentWorkspaceId || auth?.user?.workspaceId || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Employee added successfully');
        setShowAddDialog(false);
        resetForm();
        fetchEmployees();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add employee');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingEmployee || !formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setSaving(true);
    try {
      const skills = formSkills.trim()
        ? formSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const res = await authFetch(apiUrl(`/api/employees?id=${editingEmployee.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          role: formRole,
          status: formStatus,
          location: formLocation.trim() || undefined,
          whatsappId: formWhatsappId.trim() || undefined,
          skills,
          payType: formPayType,
          hourlyRate: Number(formHourlyRate || 0),
          commissionRate: Number(formCommissionRate || 10),
          flatAmount: Number(formFlatAmount || 0),
        }),
      });

      if (res.ok) {
        toast.success('Employee updated successfully');
        setShowEditDialog(false);
        setEditingEmployee(null);
        resetForm();
        fetchEmployees();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update employee');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(apiUrl(`/api/employees?id=${id}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Employee deleted');
        setShowDeleteDialog(null);
        if (selectedEmployee?.id === id) {
          setSelectedEmployee(null);
        }
        fetchEmployees();
      } else {
        toast.error('Failed to delete employee');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    populateFormForEdit(emp);
    setShowEditDialog(true);
  };

  // ─── Render: Detail Mode ─────────────────────────────────────────────────

  // ─── Render: Detail Mode ─────────────────────────────────────────────────

  if (selectedEmployee) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full">
        <EmployeeDetail
          employee={selectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          onEdit={() => openEditDialog(selectedEmployee)}
          onDelete={() => setShowDeleteDialog(selectedEmployee.id)}
          onInvite={() => handleSendInvite(selectedEmployee)}
          onResetPassword={() => handleResetPassword(selectedEmployee)}
          onSuspendToggle={() => handleSuspendToggle(selectedEmployee)}
          actionLoading={actionLoading || inviteLoading}
        />

        {/* Edit Employee Dialog */}
        <EmployeeFormDialog
          mode="edit"
          open={showEditDialog}
          onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingEmployee(null); } }}
          saving={saving}
          formName={formName}
          setFormName={setFormName}
          formPhone={formPhone}
          setFormPhone={setFormPhone}
          formEmail={formEmail}
          setFormEmail={setFormEmail}
          formRole={formRole}
          setFormRole={setFormRole}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formLocation={formLocation}
          setFormLocation={setFormLocation}
          formWhatsappId={formWhatsappId}
          setFormWhatsappId={setFormWhatsappId}
          formSkills={formSkills}
          setFormSkills={setFormSkills}
          formPayType={formPayType}
          setFormPayType={setFormPayType}
          formHourlyRate={formHourlyRate}
          setFormHourlyRate={setFormHourlyRate}
          formCommissionRate={formCommissionRate}
          setFormCommissionRate={setFormCommissionRate}
          formFlatAmount={formFlatAmount}
          setFormFlatAmount={setFormFlatAmount}
          onSubmit={handleEdit}
          onCancel={() => { setShowEditDialog(false); setEditingEmployee(null); }}
        />

        {/* Delete Confirm Dialog */}
        <Dialog open={!!showDeleteDialog} onOpenChange={(open) => { if (!open) setShowDeleteDialog(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Employee</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this employee? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
                <Trash2 className="size-4 mr-1.5" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invitation Link Dialog */}
        <InviteResultDialog
          result={inviteResult}
          onOpenChange={(open) => { if (!open) setInviteResult(null); }}
          onCopy={copyToClipboard}
        />
      </div>
    );
  }

  // ─── Render: List Mode ───────────────────────────────────────────────────

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full">
      {/* Top-level Tabs: Employees | Timesheet */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex items-center justify-between flex-wrap gap-4 pb-1">
          <TabsList className="h-10 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <TabsTrigger value="employees" className="text-xs font-semibold px-4 h-8 data-[state=active]:bg-background data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs">
              <Users className="size-3.5 mr-1.5" /> Employees
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="text-xs font-semibold px-4 h-8 data-[state=active]:bg-background data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs">
              <Clock className="size-3.5 mr-1.5" /> Timesheets
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="employees" className="space-y-6 mt-4">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0 shadow-xs shadow-emerald-500/20 text-white">
                <Users className="size-6" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Employees & Staff</h1>
                  <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    {stats.total} total
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage workforce profiles, credentials, compensation models & live dispatch</p>
              </div>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs hover:shadow-sm transition-all h-10 px-4 self-start sm:self-auto"
              onClick={() => { resetForm(); setShowAddDialog(true); }}
            >
              <UserPlus className="size-4 mr-2" /> Add Employee
            </Button>
          </div>

          {/* Interactive Status KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700',
                statusFilter === 'all'
                  ? 'ring-2 ring-emerald-600 bg-emerald-50/25 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                  : 'bg-card'
              )}
              onClick={() => setStatusFilter('all')}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Staff</span>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-slate-100">{stats.total}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">All organization personnel</p>
                  </div>
                  <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Users className="size-5 text-slate-700 dark:text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800',
                statusFilter === 'available'
                  ? 'ring-2 ring-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800'
                  : 'bg-card'
              )}
              onClick={() => setStatusFilter('available')}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Available</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-emerald-700 dark:text-emerald-300">{stats.available}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Ready for direct dispatch</p>
                  </div>
                  <div className="size-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                    <UserCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800',
                statusFilter === 'working'
                  ? 'ring-2 ring-amber-500 bg-amber-50/30 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800'
                  : 'bg-card'
              )}
              onClick={() => setStatusFilter('working')}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">On Job / Working</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-amber-700 dark:text-amber-300">{stats.working}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Active field appointments</p>
                  </div>
                  <div className="size-10 rounded-xl bg-amber-100/80 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                    <Clock className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700',
                statusFilter === 'offline'
                  ? 'ring-2 ring-slate-500 bg-slate-100/60 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700'
                  : 'bg-card'
              )}
              onClick={() => setStatusFilter('offline')}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Offline / On Leave</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-700 dark:text-slate-300">{stats.offline}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Off-duty or scheduled leave</p>
                  </div>
                  <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Shield className="size-5 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search, Role Selector, View Switcher & Status Chips */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <CardContent className="p-4 space-y-3.5">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
                {/* Search Box */}
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees by name, role, phone, or skill..."
                    className="pl-9 pr-8 h-10 bg-background"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Role Filter & Layout Controls */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
                  {/* Role Select */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-9 w-[140px] sm:w-[160px] text-xs bg-background font-medium">
                      <Filter className="size-3.5 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sub-tab: Staff List vs Role Teams */}
                  <Tabs value={listTab} onValueChange={(v) => setListTab(v as 'list' | 'teams')}>
                    <TabsList className="h-9 bg-muted/80 p-0.5 rounded-lg">
                      <TabsTrigger value="list" className="text-xs font-semibold px-3 h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
                        <Users className="size-3.5 mr-1" /> Staff
                      </TabsTrigger>
                      <TabsTrigger value="teams" className="text-xs font-semibold px-3 h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-2xs">
                        <Building2 className="size-3.5 mr-1" /> Teams
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* View Switcher: Cards vs Table */}
                  <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-lg border border-border/60">
                    <button
                      type="button"
                      onClick={() => setViewLayout('grid')}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                        viewLayout === 'grid'
                          ? 'bg-background text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      title="Grid Cards View"
                    >
                      <LayoutGrid className="size-3.5" /> Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewLayout('table')}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                        viewLayout === 'table'
                          ? 'bg-background text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      title="Table View"
                    >
                      <List className="size-3.5" /> Table
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
                {[
                  { id: 'all', label: 'All Personnel', count: stats.total },
                  { id: 'available', label: 'Available', dot: 'bg-emerald-500', count: stats.available },
                  { id: 'working', label: 'On Job / Working', dot: 'bg-amber-500', count: stats.working },
                  { id: 'offline', label: 'Offline / On Leave', dot: 'bg-slate-400', count: stats.offline },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStatusFilter(chip.id as typeof statusFilter)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border',
                      statusFilter === chip.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-background text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    )}
                  >
                    {chip.dot && <span className={cn('size-2 rounded-full', chip.dot)} />}
                    <span>{chip.label}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                      statusFilter === chip.id ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}>
                      {chip.count}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content per list tab */}
          {listTab === 'teams' ? (
            <TeamsTab teams={teams} loading={loading} onSelect={(emp) => setSelectedEmployee(emp)} />
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5 rounded-2xl">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3.5">
                      <Skeleton className="size-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground bg-card rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8">
              <Users className="size-12 mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">Failed to load employees</p>
              <p className="text-sm mt-1">{error}</p>
              <Button className="mt-4" variant="outline" onClick={fetchEmployees}>
                <Loader2 className="size-4 mr-1.5" /> Retry
              </Button>
            </div>
          ) : displayedEmployees.length === 0 ? (
            <Card className="border-dashed rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
                <div className="size-14 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                  <Users className="size-7 text-muted-foreground/60" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  {search || statusFilter !== 'all' || roleFilter !== 'all'
                    ? 'No employees match your current filters'
                    : 'No employees added yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {search || statusFilter !== 'all' || roleFilter !== 'all'
                    ? 'Try adjusting your search query, status filter, or role filter to view results.'
                    : 'Add your first employee to start dispatching jobs, tracking timesheets, and managing payroll.'}
                </p>
                {!search && statusFilter === 'all' && roleFilter === 'all' && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4 font-semibold shadow-xs" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                    <UserPlus className="size-4 mr-1.5" /> Add Employee
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewLayout === 'grid' ? (
            /* ─── Grid Cards View ────────────────────────────────────────────── */
            <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedEmployees.map((emp) => {
                let skills: string[] = [];
                try {
                  const parsed = JSON.parse(emp.skills || '[]');
                  if (Array.isArray(parsed)) skills = parsed;
                } catch { /* ignore */ }

                return (
                  <Card
                    key={emp.id}
                    className="group relative p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <div className="space-y-3.5">
                      {/* Top row: Avatar + Name + Role + Badges + Dropdown */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="relative shrink-0 mt-0.5">
                            <Avatar className="size-12 border-2 border-emerald-100 dark:border-emerald-950 shadow-2xs">
                              {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                              <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={cn(
                                'absolute bottom-0 right-0 size-3 rounded-full border-2 border-background',
                                getStatusDot(emp.status)
                              )}
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {emp.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px] px-2 py-0 capitalize font-semibold bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                {emp.role}
                              </Badge>
                              <Badge variant="outline" className={cn(getStatusColor(emp.status), 'text-[10px] font-semibold')}>
                                {emp.status === 'busy' ? 'on job' : emp.status.replace('_', ' ')}
                              </Badge>
                              {getInvitationBadge(emp.invitationStatus)}
                              {getCompensationBadge(emp)}
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setSelectedEmployee(emp)}>
                              <ArrowLeft className="size-3.5 mr-2 rotate-180" /> Profile 360°
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(emp)}>
                              <Pencil className="size-3.5 mr-2" /> Edit Employee
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(!emp.invitationStatus || emp.invitationStatus === 'none') && (
                              <DropdownMenuItem onClick={() => handleSendInvite(emp)} disabled={inviteLoading || actionLoading}>
                                <Send className="size-3.5 mr-2" /> Send Invitation
                              </DropdownMenuItem>
                            )}
                            {emp.invitationStatus === 'pending' && (
                              <DropdownMenuItem onClick={() => handleSendInvite(emp)} disabled={inviteLoading || actionLoading}>
                                <Send className="size-3.5 mr-2" /> Resend Invitation
                              </DropdownMenuItem>
                            )}
                            {emp.invitationStatus === 'accepted' && (
                              <DropdownMenuItem onClick={() => handleResetPassword(emp)} disabled={inviteLoading || actionLoading || !emp.userId}>
                                <KeyRound className="size-3.5 mr-2" /> Reset Password
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 font-semibold" onClick={() => setShowDeleteDialog(emp.id)}>
                              <Trash2 className="size-3.5 mr-2" /> Delete Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Contact & Location */}
                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-400">
                          <span className="font-medium truncate">{emp.phone || 'No phone'}</span>
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`tel:${emp.phone}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-slate-200/80 dark:border-slate-700"
                                title="Call employee"
                              >
                                <Phone className="size-3 text-emerald-600" /> Call
                              </a>
                              <a
                                href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs"
                                title="WhatsApp employee"
                              >
                                <MessageSquare className="size-3" /> WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-slate-500 pt-0.5">
                          <div className="flex items-center gap-1 truncate text-xs">
                            <MapPin className="size-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{emp.location || 'Location unmapped'}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="size-3 text-amber-500 fill-amber-500" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">{emp.rating > 0 ? emp.rating.toFixed(1) : '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0 bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-medium">
                              {skill}
                            </Badge>
                          ))}
                          {skills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{skills.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Briefcase className="size-3.5 text-emerald-600" />
                        <span>{emp.completedJobs || 0} jobs done</span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-7.5 text-xs px-3 shadow-xs gap-1"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        Profile 360° <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalEmployees}
              pageSize={employeesPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setEmployeesPerPage(size); setCurrentPage(1); }}
              itemName="employees"
            />
            </>
          ) : (
            /* ─── Table View ───────────────────────────────────────────────── */
            <>
            <Card className="border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
              <div className="max-h-[650px] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Employee</TableHead>
                      <TableHead className="font-bold text-xs">Status</TableHead>
                      <TableHead className="font-bold text-xs">Role & Comp</TableHead>
                      <TableHead className="font-bold text-xs">Phone & Contact</TableHead>
                      <TableHead className="hidden md:table-cell font-bold text-xs">Location</TableHead>
                      <TableHead className="font-bold text-xs">Rating / Jobs</TableHead>
                      <TableHead className="text-right font-bold text-xs w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedEmployees.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <Avatar className="size-9 border border-emerald-100 dark:border-emerald-950">
                                {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                                <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                                  {getInitials(emp.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className={cn(
                                  'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-background',
                                  getStatusDot(emp.status)
                                )}
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate block">{emp.name}</span>
                              <span className="text-[11px] text-muted-foreground truncate block">{emp.email || 'No email'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={cn(getStatusColor(emp.status), 'text-[10px] font-semibold')}>
                              {emp.status === 'busy' ? 'on job' : emp.status.replace('_', ' ')}
                            </Badge>
                            {getInvitationBadge(emp.invitationStatus)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="space-y-1">
                            <Badge variant="secondary" className="text-[10px] capitalize font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {emp.role}
                            </Badge>
                            <div>{getCompensationBadge(emp)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{emp.phone || '—'}</span>
                            {emp.phone && (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:${emp.phone}`}
                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="Call"
                                >
                                  <Phone className="size-3.5" />
                                </a>
                                <a
                                  href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="size-3.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 truncate max-w-[160px] hidden md:table-cell">
                          {emp.location || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-amber-600 font-semibold">
                              <Star className="size-3 fill-amber-500" />
                              <span>{emp.rating > 0 ? emp.rating.toFixed(1) : '—'}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{emp.completedJobs || 0} completed</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7.5 px-3 font-semibold gap-1"
                            onClick={() => setSelectedEmployee(emp)}
                          >
                            Profile 360° <ChevronRight className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalEmployees}
              pageSize={employeesPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setEmployeesPerPage(size); setCurrentPage(1); }}
              itemName="employees"
            />
            </>
          )}

          {/* Add Employee Dialog */}
          <EmployeeFormDialog
            mode="add"
            open={showAddDialog}
            onOpenChange={(open) => { if (!open) setShowAddDialog(false); }}
            saving={saving}
            formName={formName}
            setFormName={setFormName}
            formPhone={formPhone}
            setFormPhone={setFormPhone}
            formEmail={formEmail}
            setFormEmail={setFormEmail}
            formRole={formRole}
            setFormRole={setFormRole}
            formStatus={formStatus}
            setFormStatus={setFormStatus}
            formLocation={formLocation}
            setFormLocation={setFormLocation}
            formWhatsappId={formWhatsappId}
            setFormWhatsappId={setFormWhatsappId}
            formSkills={formSkills}
            setFormSkills={setFormSkills}
            formPayType={formPayType}
            setFormPayType={setFormPayType}
            formHourlyRate={formHourlyRate}
            setFormHourlyRate={setFormHourlyRate}
            formCommissionRate={formCommissionRate}
            setFormCommissionRate={setFormCommissionRate}
            formFlatAmount={formFlatAmount}
            setFormFlatAmount={setFormFlatAmount}
            onSubmit={handleAdd}
          />

          {/* Edit Employee Dialog */}
          <EmployeeFormDialog
            mode="edit"
            open={showEditDialog}
            onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingEmployee(null); } }}
            saving={saving}
            formName={formName}
            setFormName={setFormName}
            formPhone={formPhone}
            setFormPhone={setFormPhone}
            formEmail={formEmail}
            setFormEmail={setFormEmail}
            formRole={formRole}
            setFormRole={setFormRole}
            formStatus={formStatus}
            setFormStatus={setFormStatus}
            formLocation={formLocation}
            setFormLocation={setFormLocation}
            formWhatsappId={formWhatsappId}
            setFormWhatsappId={setFormWhatsappId}
            formSkills={formSkills}
            setFormSkills={setFormSkills}
            formPayType={formPayType}
            setFormPayType={setFormPayType}
            formHourlyRate={formHourlyRate}
            setFormHourlyRate={setFormHourlyRate}
            formCommissionRate={formCommissionRate}
            setFormCommissionRate={setFormCommissionRate}
            formFlatAmount={formFlatAmount}
            setFormFlatAmount={setFormFlatAmount}
            onSubmit={handleEdit}
            onCancel={() => { setShowEditDialog(false); setEditingEmployee(null); }}
          />

          {/* Delete Confirm Dialog */}
          <Dialog open={!!showDeleteDialog} onOpenChange={(open) => { if (!open) setShowDeleteDialog(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Employee</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this employee? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}>
                  <Trash2 className="size-4 mr-1.5" /> Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Invitation Link Dialog */}
          <InviteResultDialog
            result={inviteResult}
            onOpenChange={(open) => { if (!open) setInviteResult(null); }}
            onCopy={copyToClipboard}
          />
        </TabsContent>

        <TabsContent value="timesheet" className="mt-6">
          <TimesheetView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Teams Tab (List mode sub-tab) ───────────────────────────────────────────

function TeamsTab({
  teams,
  loading,
  onSelect,
}: {
  teams: { role: string; count: number; available: number; members: Employee[] }[];
  loading: boolean;
  onSelect: (emp: Employee) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5 rounded-2xl">
            <CardContent className="p-0 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No teams configured yet"
        description="Add team members and they will be grouped by their assigned roles automatically."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Card key={team.role} className="hover:shadow-md transition-shadow rounded-2xl border-slate-200/90 dark:border-slate-800 overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold capitalize">{team.role}s</CardTitle>
                  <CardDescription className="text-xs">
                    {team.count} staff · {team.available} available
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                {team.available}/{team.count} online
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
              {team.members.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => onSelect(emp)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors text-left group cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-9 border border-emerald-100 dark:border-emerald-950">
                      {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                      <AvatarFallback className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {getInitials(emp.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-background',
                        getStatusDot(emp.status)
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {emp.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{emp.phone || 'No phone'}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Employee Detail (Detail mode) ───────────────────────────────────────────

function EmployeeDetail({
  employee,
  onBack,
  onEdit,
  onDelete,
  onInvite,
  onResetPassword,
  onSuspendToggle,
  actionLoading,
}: {
  employee: Employee;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInvite: () => void;
  onResetPassword: () => void;
  onSuspendToggle: () => void;
  actionLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  let skills: string[] = [];
  try {
    const parsed = JSON.parse(employee.skills || '[]');
    if (Array.isArray(parsed)) skills = parsed;
  } catch { /* ignore */ }

  const perms = usePermissions();
  const visibleSecondaryTabs = SECONDARY_EMPLOYEE_TABS.filter((t) =>
    perms.canAccessEmployeeTab(t as EmployeeDetailTab)
  );
  const isSecondaryActive = (SECONDARY_EMPLOYEE_TABS as string[]).includes(activeTab);
  const secondaryActiveLabel = (() => {
    if (!isSecondaryActive) return null;
    if (!visibleSecondaryTabs.includes(activeTab as EmployeeDetailTab)) return null;
    const map: Record<string, string> = {
      reviews: 'Reviews',
      documents: 'Documents',
      payroll: 'Payroll',
    };
    return map[activeTab] ?? null;
  })();

  const tabTriggerClass = 'data-[state=active]:bg-background data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground font-semibold rounded-xl px-3.5 py-2 text-xs gap-1.5 transition-all duration-200 whitespace-nowrap flex items-center';
  const moreTriggerClass = 'data-[state=active]:bg-background data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground font-semibold rounded-xl px-3.5 py-2 text-xs gap-1.5 transition-all duration-200 whitespace-nowrap flex items-center';

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Hero Header Card */}
      <div className="bg-card p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
        {/* Top bar: Back Button & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 h-9 font-semibold text-slate-700 dark:text-slate-200 gap-1.5 rounded-xl">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
            <div className="relative shrink-0">
              <Avatar className="size-14 sm:size-16 border-2 border-emerald-100 dark:border-emerald-950 shadow-xs">
                {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
                <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-lg">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background',
                  getStatusDot(employee.status)
                )}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">{employee.name}</h1>
                <Badge variant="outline" className={cn(getStatusColor(employee.status), 'text-[10px] font-semibold')}>
                  <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(employee.status))} />
                  {employee.status === 'busy' ? 'on job' : employee.status.replace('_', ' ')}
                </Badge>
                {getInvitationBadge(employee.invitationStatus)}
                {getCompensationBadge(employee)}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                <Badge variant="secondary" className="text-[10px] capitalize font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {employee.role}
                </Badge>
                {employee.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <StarRating rating={employee.rating} size="sm" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{employee.rating.toFixed(1)}</span>
                  </div>
                )}
                {employee.phone && (
                  <span className="font-medium text-slate-600 dark:text-slate-400">· {employee.phone}</span>
                )}
                {skills.length > 0 && (
                  <span className="text-slate-400">· {skills.slice(0, 2).join(', ')}{skills.length > 2 ? '…' : ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
            {employee.phone && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${employee.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                  title="Call Employee"
                >
                  <Phone className="size-3.5 text-emerald-600" /> Call
                </a>
                <a
                  href={`https://wa.me/${employee.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
                  title="WhatsApp Employee"
                >
                  <MessageSquare className="size-3.5" /> WhatsApp
                </a>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={onEdit} className="h-9 font-semibold rounded-xl gap-1.5">
              <Pencil className="size-3.5" /> Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl" disabled={actionLoading}>
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(!employee.invitationStatus || employee.invitationStatus === 'none') && (
                  <DropdownMenuItem onClick={onInvite} disabled={actionLoading}>
                    <Send className="size-3.5 mr-2" /> Send Invitation
                  </DropdownMenuItem>
                )}
                {employee.invitationStatus === 'pending' && (
                  <DropdownMenuItem onClick={onInvite} disabled={actionLoading}>
                    <Send className="size-3.5 mr-2" /> Resend Invitation
                  </DropdownMenuItem>
                )}
                {employee.invitationStatus === 'accepted' && (
                  <DropdownMenuItem onClick={onResetPassword} disabled={actionLoading || !employee.userId}>
                    <KeyRound className="size-3.5 mr-2" /> Reset Password
                  </DropdownMenuItem>
                )}
                {employee.invitationStatus === 'accepted' && (
                  <DropdownMenuItem onClick={onSuspendToggle} disabled={actionLoading} className="text-amber-600">
                    <Power className="size-3.5 mr-2" /> Suspend
                  </DropdownMenuItem>
                )}
                {employee.invitationStatus === 'suspended' && (
                  <DropdownMenuItem onClick={onSuspendToggle} disabled={actionLoading} className="text-emerald-600">
                    <Power className="size-3.5 mr-2" /> Reactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 font-semibold" onClick={onDelete}>
                  <Trash2 className="size-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-muted/70 p-1.5 rounded-2xl border border-border/60 overflow-x-auto scrollbar-none">
          <TabsList className="bg-transparent h-auto gap-1 p-0 justify-start w-max sm:w-full flex-wrap sm:flex-nowrap">
            <TabsTrigger value="overview" className={tabTriggerClass}>
              <ActivityIcon className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="jobs" className={tabTriggerClass}>
              <Briefcase className="size-3.5" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="calendar" className={tabTriggerClass}>
              <Calendar className="size-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="time" className={tabTriggerClass}>
              <Clock className="size-3.5" /> Time
            </TabsTrigger>
            <TabsTrigger value="performance" className={tabTriggerClass}>
              <TrendingUp className="size-3.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="equipment" className={tabTriggerClass}>
              <Wrench className="size-3.5" /> Equipment
            </TabsTrigger>
            <TabsTrigger value="location" className={tabTriggerClass}>
              <MapPinned className="size-3.5" /> Location
            </TabsTrigger>
            <TabsTrigger value="activity" className={tabTriggerClass}>
              <ActivityIcon className="size-3.5" /> Activity
            </TabsTrigger>

            {visibleSecondaryTabs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      moreTriggerClass,
                      isSecondaryActive && 'bg-background text-emerald-700 dark:text-emerald-300 shadow-xs'
                    )}
                    aria-label="More tabs"
                    aria-haspopup="menu"
                  >
                    <MoreVertical className="size-3.5" />
                    <span>More</span>
                    {secondaryActiveLabel && (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <span className="size-1 rounded-full bg-emerald-500 inline-block" aria-hidden />
                        <span className="hidden sm:inline">{secondaryActiveLabel}</span>
                        <ChevronRight className="size-3 rotate-90" />
                      </span>
                    )}
                    {!secondaryActiveLabel && <ChevronRight className="size-3 rotate-90" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {visibleSecondaryTabs.includes('reviews' as EmployeeDetailTab) && (
                    <DropdownMenuItem onClick={() => setActiveTab('reviews')}>
                      <Star className="size-3.5 mr-2" /> Reviews
                    </DropdownMenuItem>
                  )}
                  {visibleSecondaryTabs.includes('documents' as EmployeeDetailTab) && (
                    <DropdownMenuItem onClick={() => setActiveTab('documents')}>
                      <FileStack className="size-3.5 mr-2" /> Documents
                    </DropdownMenuItem>
                  )}
                  {visibleSecondaryTabs.includes('payroll' as EmployeeDetailTab) && (
                    <DropdownMenuItem onClick={() => setActiveTab('payroll')}>
                      <Wallet className="size-3.5 mr-2" /> Payroll
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab employee={employee} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-6">
          <JobsTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-6">
          <CalendarTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="time" className="mt-6">
          <TimeTrackingTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="performance" className="mt-6">
          <PerformanceTab employeeId={employee.id} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          {perms.canAccessEmployeeTab('reviews') ? (
            <ReviewsTab employeeId={employee.id} defaultRating={employee.rating} />
          ) : (
            <ForbiddenNotice tab="Reviews" />
          )}
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          {perms.canAccessEmployeeTab('documents') ? (
            <DocumentsTab employeeId={employee.id} employeeName={employee.name} />
          ) : (
            <ForbiddenNotice tab="Documents" />
          )}
        </TabsContent>
        <TabsContent value="equipment" className="mt-6">
          <EquipmentTab employeeId={employee.id} employeeName={employee.name} />
        </TabsContent>
        <TabsContent value="location" className="mt-6">
          <LocationTab employee={employee} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6">
          {perms.canAccessEmployeeTab('payroll') ? (
            <PayrollTab employeeName={employee.name} employeeId={employee.id} />
          ) : (
            <ForbiddenNotice tab="Payroll" />
          )}
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ActivityTab employee={employee} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EmployeesView;
