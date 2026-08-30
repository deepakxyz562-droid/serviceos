'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import {
  Users, UserPlus, Shield, Clock, CheckCircle2, UserCheck, UserCog,
  Search, Phone, MapPin, Star, Briefcase, Loader2,
  Trash2, Pencil, MoreVertical,
  Mail, Send, KeyRound, Power, Globe, Copy, ExternalLink, AlertCircle,
  ArrowLeft, Calendar, Wrench, MapPinned, Wallet, Activity as ActivityIcon,
  TrendingUp, Building2, ChevronRight, FileStack,
  LayoutGrid, List,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authFetch } from '@/lib/client-auth';
import { getInitials } from '@/lib/format-utils';
import { usePermissions } from '@/hooks/use-permissions';
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmployeesView() {
  const { currentWorkspaceId, auth } = useAppStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'working' | 'offline'>('all');
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

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use authFetch so the Bearer token is sent. Plain fetch() relied on
      // the session cookie alone, which fails on cross-origin/cookieless
      // contexts (e.g. Vercel preview deploys, Safari ITP).
      const res = await authFetch(apiUrl('/api/employees'));
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load employees');
        toast.error('Failed to load employees');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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

  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (statusFilter === 'available') {
      result = result.filter((e) => e.status === 'available');
    } else if (statusFilter === 'working') {
      result = result.filter((e) => e.status === 'on_job' || e.status === 'busy' || e.status === 'en_route');
    } else if (statusFilter === 'offline') {
      result = result.filter((e) => e.status === 'on_leave' || e.status === 'offline');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => {
        const name = (e.name || '').toLowerCase();
        const role = (e.role || '').toLowerCase();
        const phone = (e.phone || '').toLowerCase();
        const skills = (e.skills || '').toLowerCase();
        return name.includes(q) || role.includes(q) || phone.includes(q) || skills.includes(q);
      });
    }

    return result;
  }, [employees, search, statusFilter]);

  const stats = useMemo(() => ({
    total: employees.length,
    available: employees.filter((e) => e.status === 'available').length,
    working: employees.filter((e) => e.status === 'on_job' || e.status === 'busy' || e.status === 'en_route').length,
    offline: employees.filter((e) => e.status === 'on_leave' || e.status === 'offline').length,
  }), [employees]);

  // Teams: derive a simple grouping by role (no dedicated team model exists).
  const teams = useMemo(() => {
    const map = new Map<string, { role: string; count: number; available: number; members: Employee[] }>();
    for (const e of employees) {
      const key = e.role || 'other';
      const entry = map.get(key) ?? { role: key, count: 0, available: 0, members: [] };
      entry.count += 1;
      if (e.status === 'available') entry.available += 1;
      entry.members.push(e);
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [employees]);

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
  };

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

  if (selectedEmployee) {
    return (
      <>
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
      </>
    );
  }

  // ─── Render: List Mode ───────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      {/* Top-level Tabs: Employees | Timesheet */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-11">
          <TabsTrigger value="employees" className="text-sm min-h-[44px]">
            <UserCog className="size-4 mr-1.5" /> Employees
          </TabsTrigger>
          <TabsTrigger value="timesheet" className="text-sm min-h-[44px]">
            <Clock className="size-4 mr-1.5" /> Timesheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shrink-0 shadow-sm">
            <Users className="size-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">Employees</h1>
              <Badge variant="secondary" className="text-xs h-6">{stats.total}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your team and staff</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <UserPlus className="size-4 mr-1.5" /> Add Employee
        </Button>
      </div>

      {/* Stats Cards with click-to-filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'all' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'available' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('available')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">🟢 Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'working' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('working')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.working}</p>
                <p className="text-xs text-muted-foreground">🚗 Working / On Job</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('cursor-pointer transition-all hover:border-emerald-500/50', statusFilter === 'offline' && 'ring-2 ring-emerald-500')}
          onClick={() => setStatusFilter('offline')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Shield className="size-4 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.offline}</p>
                <p className="text-xs text-muted-foreground">⚪ Offline / On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Status Chips + View Switcher */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, role, phone, or skill..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <Tabs value={listTab} onValueChange={(v) => setListTab(v as 'list' | 'teams')}>
                <TabsList className="h-9">
                  <TabsTrigger value="list" className="text-xs h-7">
                    <Users className="size-3.5 mr-1.5" /> Staff
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="text-xs h-7">
                    <Building2 className="size-3.5 mr-1.5" /> Teams
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* View Switcher Toggle: Cards vs Table */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    viewLayout === 'grid' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Grid Cards View"
                >
                  <LayoutGrid className="size-3.5" /> Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    viewLayout === 'table' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Table View"
                >
                  <List className="size-3.5" /> Table
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            {[
              { id: 'all', label: 'All Staff', count: stats.total },
              { id: 'available', label: '🟢 Available', count: stats.available },
              { id: 'working', label: '🚗 Working / En Route', count: stats.working },
              { id: 'offline', label: '⚪ Offline / On Leave', count: stats.offline },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id as typeof statusFilter)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border',
                  statusFilter === chip.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-background text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                )}
              >
                <span>{chip.label}</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  statusFilter === chip.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
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
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <Users className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">Failed to load employees</p>
          <p className="text-sm mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={fetchEmployees}>
            <Loader2 className="size-4 mr-1.5" /> Retry
          </Button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="size-14 mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {search || statusFilter !== 'all' ? 'No employees match your search filter' : 'No employees yet'}
            </p>
            <p className="text-sm mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your search query or status filter' : 'Add your first employee to get started'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <UserPlus className="size-4 mr-1.5" /> Add Employee
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewLayout === 'grid' ? (
        /* ─── Grid Cards View ────────────────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((emp) => {
            let skills: string[] = [];
            try {
              const parsed = JSON.parse(emp.skills || '[]');
              if (Array.isArray(parsed)) skills = parsed;
            } catch { /* ignore */ }

            return (
              <Card
                key={emp.id}
                className="group relative p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                onClick={() => setSelectedEmployee(emp)}
              >
                <div className="space-y-3">
                  {/* Header: Avatar + Live Dot + Name + Role + Dropdown */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="size-11 border-2 border-emerald-100 dark:border-emerald-950">
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
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                          {emp.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                            {emp.role}
                          </Badge>
                          {getInvitationBadge(emp.invitationStatus)}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0 text-slate-400 hover:text-slate-700"
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
                          <Pencil className="size-3.5 mr-2" /> Edit
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
                        <DropdownMenuItem className="text-red-600" onClick={() => setShowDeleteDialog(emp.id)}>
                          <Trash2 className="size-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Phone + One-tap Call & WhatsApp */}
                  <div className="flex items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="truncate">{emp.phone || 'No phone'}</span>
                    {emp.phone && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`tel:${emp.phone}`}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="Call employee"
                        >
                          <Phone className="size-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                          title="WhatsApp employee"
                        >
                          <Mail className="size-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Location & Rating */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{emp.location || 'Location unmapped'}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="size-3 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.rating > 0 ? emp.rating.toFixed(1) : '—'}</span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Bar: Completed Jobs + Profile 360° CTA */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Briefcase className="size-3.5 text-emerald-600" />
                    <span>{emp.completedJobs || 0} jobs done</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-7 text-xs px-2.5 shadow-xs"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    Profile 360°
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ─── Table View ───────────────────────────────────────────────── */
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold">Employee</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Phone</TableHead>
                  <TableHead className="font-bold">Role & Rating</TableHead>
                  <TableHead className="hidden md:table-cell font-bold">Location</TableHead>
                  <TableHead className="text-right font-bold w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="size-8 border border-emerald-100 dark:border-emerald-950">
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
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{emp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={cn(getStatusColor(emp.status), 'text-[10px]')}>
                        {emp.status === 'busy' ? 'on job' : emp.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <span>{emp.phone || '—'}</span>
                        {emp.phone && (
                          <div className="flex items-center gap-0.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`tel:${emp.phone}`}
                              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Call"
                            >
                              <Phone className="size-3" />
                            </a>
                            <a
                              href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="WhatsApp"
                            >
                              <Mail className="size-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-slate-700 font-medium">{emp.role}</span>
                        <span className="text-slate-400">·</span>
                        <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                          <Star className="size-3 fill-amber-500" /> {emp.rating > 0 ? emp.rating.toFixed(1) : '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 truncate max-w-[160px] hidden md:table-cell">
                      {emp.location || '—'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-semibold"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        Profile 360°
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
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
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
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
        title="No teams yet"
        description="Add employees and they'll be grouped by role automatically."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <Card key={team.role} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Users className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold capitalize">{team.role}</CardTitle>
                  <CardDescription className="text-xs">{team.count} member{team.count === 1 ? '' : 's'} · {team.available} available</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {team.members.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => onSelect(emp)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
                >
                  <Avatar className="size-8 shrink-0">
                    {emp.avatar && <AvatarImage src={emp.avatar} alt={emp.name} />}
                    <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(emp.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{emp.phone}</p>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
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

  // Refresh employee data when active tab changes — used to invalidate queries.
  // The actual data is fetched per-tab via useQuery with the employee.id.

  let skills: string[] = [];
  try {
    const parsed = JSON.parse(employee.skills || '[]');
    if (Array.isArray(parsed)) skills = parsed;
  } catch { /* ignore */ }

  // Per-tab role gating. The user's hard requirement: hiding a tab in React
  // is NOT sufficient — the underlying APIs (/api/reviews, /api/documents,
  // /api/time-tracking/payroll, /api/employees/[id]) MUST also enforce the
  // same allow-list server-side. Those gates are added in Phase 1.4.
  const perms = usePermissions();
  const visibleSecondaryTabs = SECONDARY_EMPLOYEE_TABS.filter((t) =>
    perms.canAccessEmployeeTab(t as EmployeeDetailTab)
  );
  // The active tab is one of: a primary tab, or one of the user's visible
  // secondary tabs. If the user lacks access to the active tab (e.g. they
  // switched accounts in another tab), fall back to Overview.
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
  // If the active tab is a secondary tab the user can't access (e.g. they
  // were granted Payroll then lost the role), reset to Overview. This is a
  // safety net — the dropdown won't show the option, but a stale URL hash
  // or devtools `setActiveTab('payroll')` could otherwise reveal content.
  // Note: we intentionally do NOT auto-strip during render (would loop);
  // the TabsContent gate below already prevents the content from rendering.

  const tabTriggerClass = 'data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200 whitespace-nowrap';
  const moreTriggerClass = 'data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200 whitespace-nowrap';

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Header with Back button and Quick Actions */}
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-4 bg-card p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 h-9 font-semibold text-slate-700 dark:text-slate-200">
            <ArrowLeft className="size-4 mr-1.5" /> Back
          </Button>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <div className="relative shrink-0">
            <Avatar className="size-14 sm:size-16 border-2 border-emerald-100 dark:border-emerald-950 shadow-xs">
              {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
              <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
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
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">{employee.name}</h1>
              <Badge variant="outline" className={cn(getStatusColor(employee.status), 'text-[10px] font-semibold')}>
                <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(employee.status))} />
                {employee.status === 'busy' ? 'on job' : employee.status.replace('_', ' ')}
              </Badge>
              {getInvitationBadge(employee.invitationStatus)}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
              <Badge variant="secondary" className="text-[10px] capitalize font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{employee.role}</Badge>
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

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          {employee.phone && (
            <div className="flex items-center gap-1 mr-1">
              <a
                href={`tel:${employee.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-slate-200/80 dark:border-slate-700"
                title="Call Employee"
              >
                <Phone className="size-3.5 text-emerald-600" /> Call
              </a>
              <a
                href={`https://wa.me/${employee.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
                title="WhatsApp Employee"
              >
                <Mail className="size-3.5" /> WhatsApp
              </a>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={onEdit} className="h-9 font-semibold">
            <Pencil className="size-3.5 mr-1.5" /> Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={actionLoading}>
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

      {/* 8-Tab Switcher + More ▾ dropdown (Reviews/Documents/Payroll)
       *
       * Per the approved spec: primary tabs are operational data visible to
       * every authenticated tenant member. Secondary tabs (Reviews/Documents/
       * Payroll) are gated by role via usePermissions() — the underlying APIs
       * enforce the same allow-list server-side.
       *
       * When a secondary tab is active, the More button shows a small dot
       * indicator (More • ▾) so the user doesn't lose context.
       */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border -mx-1 px-1 overflow-x-auto">
          <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto justify-start w-max sm:w-full sm:justify-start">
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
                      'inline-flex items-center justify-center gap-1.5 font-medium',
                      isSecondaryActive && 'bg-accent text-emerald-600'
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
