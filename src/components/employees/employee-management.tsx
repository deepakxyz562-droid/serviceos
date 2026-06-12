'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, UserPlus, Mail, Search, MoreHorizontal, RefreshCw,
  Phone, Pencil, Trash2, Copy, Send, XCircle, Clock,
  CheckCircle2, AlertCircle, Loader2, Shield, Wrench,
  Radio, ChevronDown, Star, Briefcase, UserCheck,
  UserX, UserMinus, ArrowRight, Link2, Lock, Eye, EyeOff,
  Key, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  skills: string;
  rating: number;
  completedJobs: number;
  location?: string;
  avatar?: string;
  updatedAt: string;
  userId?: string;
  userAccount?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isActive: boolean;
  };
}

interface Invitation {
  id: string;
  token: string;
  email: string;
  name?: string;
  role: string;
  phone?: string;
  status: string;
  message?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
  employee?: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
  inviteUrl?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  busy: 'bg-red-100 text-red-700 border-red-200',
  offline: 'bg-gray-100 text-gray-600 border-gray-200',
  leave: 'bg-amber-100 text-amber-700 border-amber-200',
  traveling: 'bg-sky-100 text-sky-700 border-sky-200',
  invited: 'bg-purple-100 text-purple-700 border-purple-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_DOTS: Record<string, string> = {
  available: 'bg-emerald-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
  leave: 'bg-amber-500',
  traveling: 'bg-sky-500',
  invited: 'bg-purple-500',
  inactive: 'bg-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  busy: 'Busy',
  offline: 'Offline',
  leave: 'On Leave',
  traveling: 'Traveling',
  invited: 'Invited',
  inactive: 'Inactive',
};

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: 'Owner', icon: <Shield className="size-3" />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  manager: { label: 'Manager', icon: <Briefcase className="size-3" />, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  technician: { label: 'Technician', icon: <Wrench className="size-3" />, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  dispatcher: { label: 'Dispatcher', icon: <Radio className="size-3" />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const INVITATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  expired: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const INVITATION_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="size-3" />,
  accepted: <CheckCircle2 className="size-3" />,
  expired: <AlertCircle className="size-3" />,
  cancelled: <XCircle className="size-3" />,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return 'Unknown';
  try {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Unknown';
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Animation variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function EmployeeManagement() {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<'team' | 'invite' | 'invitations'>('team');

  // ── Data state ──
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Filter state ──
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // ── Dialog state ──
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // ── Add/Edit form state ──
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'technician',
    password: '',
    confirmPassword: '',
    location: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Password change state ──
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ── Delete type ──
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');

  // ──────────────────────────────────────────────────────────────────────────
  //  Fetch functions
  // ──────────────────────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search) params.set('search', search);
      if (!showInactive) params.set('status', 'available,busy,offline,leave,traveling,invited');
      const res = await authFetch(`/api/employees?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch {
      setEmployees([]);
    }
  }, [roleFilter, search, showInactive]);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await authFetch('/api/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(Array.isArray(data) ? data : []);
      }
    } catch {
      setInvitations([]);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchEmployees(), fetchInvitations()]);
      setIsLoading(false);
    };
    init();
  }, [fetchEmployees, fetchInvitations]);

  // ── Refetch employees when filters change ──
  useEffect(() => {
    if (!isLoading) fetchEmployees();
  }, [roleFilter, search, fetchEmployees, isLoading, showInactive]);

  // ──────────────────────────────────────────────────────────────────────────
  //  Employee handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleAddEmployee = async () => {
    if (!employeeForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!employeeForm.phone.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (employeeForm.email && employeeForm.password && employeeForm.password !== employeeForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (employeeForm.password && employeeForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: employeeForm.name,
        phone: employeeForm.phone,
        email: employeeForm.email || undefined,
        role: employeeForm.role,
        location: employeeForm.location || undefined,
      };
      // Include password only if email is provided
      if (employeeForm.email && employeeForm.password) {
        payload.password = employeeForm.password;
      }

      const res = await authFetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const msg = employeeForm.email && employeeForm.password
          ? 'Employee added with login credentials'
          : 'Employee added successfully';
        toast.success(msg);
        setShowAddDialog(false);
        resetEmployeeForm();
        fetchEmployees();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add employee');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    if (employeeForm.password && employeeForm.password !== employeeForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (employeeForm.password && employeeForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: employeeForm.name,
        phone: employeeForm.phone,
        email: employeeForm.email || null,
        role: employeeForm.role,
        location: employeeForm.location || null,
      };
      // Include password change if provided
      if (employeeForm.password) {
        payload.password = employeeForm.password;
      }

      const res = await authFetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const msg = employeeForm.password
          ? 'Employee updated and password changed'
          : 'Employee updated successfully';
        toast.success(msg);
        setShowEditDialog(false);
        setSelectedEmployee(null);
        resetEmployeeForm();
        fetchEmployees();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update employee');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      const url = deleteType === 'hard'
        ? `/api/employees/${selectedEmployee.id}?hard=true`
        : `/api/employees/${selectedEmployee.id}`;
      const res = await authFetch(url, { method: 'DELETE' });
      if (res.ok) {
        const msg = deleteType === 'hard'
          ? 'Employee permanently deleted'
          : 'Employee deactivated';
        toast.success(msg);
        setShowDeleteDialog(false);
        setSelectedEmployee(null);
        setDeleteType('soft');
        fetchEmployees();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete employee');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!selectedEmployee) return;
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.newPassword }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setShowPasswordDialog(false);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
        setSelectedEmployee(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to change password');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateEmployee = async (employee: Employee) => {
    try {
      const res = await authFetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'available', isActive: true }),
      });
      if (res.ok) {
        toast.success('Employee reactivated');
        fetchEmployees();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to reactivate');
      }
    } catch {
      toast.error('Network error');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  //  Invitation handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleSendInvitation = async () => {
    if (!inviteForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!inviteForm.role) {
      toast.error('Role is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          name: inviteForm.name || undefined,
          role: inviteForm.role,
          phone: inviteForm.phone || undefined,
          message: inviteForm.message || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Invitation sent successfully');
        resetInviteForm();
        fetchInvitations();
        fetchEmployees();
        setActiveTab('invitations');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send invitation');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await authFetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Invitation cancelled');
        fetchInvitations();
        fetchEmployees();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to cancel invitation');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const res = await authFetch(`/api/invitations/${invitationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' }),
      });
      if (res.ok) {
        toast.success('Invitation resent successfully');
        fetchInvitations();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to resend invitation');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleCopyInviteLink = async (invitation: Invitation) => {
    const link = invitation.inviteUrl || `${window.location.origin}/?invite=${invitation.token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  //  Form helpers
  // ──────────────────────────────────────────────────────────────────────────

  const resetEmployeeForm = () => {
    setEmployeeForm({ name: '', phone: '', email: '', role: 'technician', password: '', confirmPassword: '', location: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'technician',
    phone: '',
    message: '',
  });

  const resetInviteForm = () => {
    setInviteForm({ email: '', name: '', role: 'technician', phone: '', message: '' });
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      phone: employee.phone,
      email: employee.email || '',
      role: employee.role,
      password: '',
      confirmPassword: '',
      location: employee.location || '',
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteType('soft');
    setShowDeleteDialog(true);
  };

  const openPasswordDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowPasswordDialog(true);
  };

  // ──────────────────────────────────────────────────────────────────────────
  //  Computed values
  // ──────────────────────────────────────────────────────────────────────────

  const stats = {
    total: employees.length,
    available: employees.filter(e => e.status === 'available').length,
    busy: employees.filter(e => e.status === 'busy').length,
    offline: employees.filter(e => e.status === 'offline' || e.status === 'inactive').length,
    onLeave: employees.filter(e => e.status === 'leave').length,
    invited: employees.filter(e => e.status === 'invited').length,
    withLogin: employees.filter(e => e.userAccount?.isActive).length,
    pendingInvitations: invitations.filter(i => i.status === 'pending').length,
  };

  const filteredEmployees = employees.filter(emp => {
    if (search) {
      const q = search.toLowerCase();
      const matchesName = emp.name.toLowerCase().includes(q);
      const matchesEmail = (emp.email || '').toLowerCase().includes(q);
      const matchesPhone = emp.phone.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesPhone) return false;
    }
    if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
    return true;
  });

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  // ──────────────────────────────────────────────────────────────────────────
  //  Loading skeleton
  // ──────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-40 mb-1" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <div>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-5 w-10" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <ViewHeader
        icon={Users}
        iconBg="bg-teal-600"
        title="Team Management"
        description="Manage your team members, roles, passwords, and invitations"
        action={
          <div className="flex gap-2">
            <Button
              className="bg-teal-600 hover:bg-teal-700 min-h-[44px]"
              onClick={() => {
                resetEmployeeForm();
                setShowAddDialog(true);
              }}
            >
              <UserPlus className="size-4 mr-1.5" /> Add Employee
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] border-teal-200 text-teal-700 hover:bg-teal-50"
              onClick={() => {
                resetInviteForm();
                setActiveTab('invite');
              }}
            >
              <Mail className="size-4 mr-1.5" /> Invite
            </Button>
          </div>
        }
      />

      {/* ─── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-8">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', icon: Users },
          { label: 'Available', value: stats.available, color: 'text-emerald-600', icon: UserCheck },
          { label: 'Busy', value: stats.busy, color: 'text-red-600', icon: UserX },
          { label: 'Offline', value: stats.offline, color: 'text-gray-500', icon: UserMinus },
          { label: 'On Leave', value: stats.onLeave, color: 'text-amber-600', icon: Clock },
          { label: 'Invited', value: stats.invited, color: 'text-purple-600', icon: Mail },
          { label: 'With Login', value: stats.withLogin, color: 'text-teal-600', icon: Lock },
          { label: 'Pending', value: stats.pendingInvitations, color: 'text-orange-600', icon: Send },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color.includes('foreground') ? 'text-muted-foreground' : stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'team' | 'invite' | 'invitations')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="team" className="text-xs sm:text-sm">
              <Users className="size-4 mr-1.5" />
              Team ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="invite" className="text-xs sm:text-sm">
              <Mail className="size-4 mr-1.5" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="invitations" className="text-xs sm:text-sm">
              <Send className="size-4 mr-1.5" />
              Invitations ({invitations.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-muted-foreground cursor-pointer">
                Show inactive
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => { fetchEmployees(); fetchInvitations(); }}>
              <RefreshCw className="size-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* ─── Team Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="team" className="mt-4 space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'all', label: 'All' },
                { value: 'owner', label: 'Owner' },
                { value: 'manager', label: 'Manager' },
                { value: 'technician', label: 'Technician' },
                { value: 'dispatcher', label: 'Dispatcher' },
              ].map((role) => (
                <Button
                  key={role.value}
                  size="sm"
                  variant={roleFilter === role.value ? 'default' : 'outline'}
                  className={`h-8 text-xs ${
                    roleFilter === role.value
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200'
                  }`}
                  onClick={() => setRoleFilter(role.value)}
                >
                  {role.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Employee Cards */}
          {filteredEmployees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members found"
              description={
                search || roleFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Add your first team member to get started'
              }
              actionLabel="Add Employee"
              onAction={() => {
                resetEmployeeForm();
                setShowAddDialog(true);
              }}
            />
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredEmployees.map((employee) => (
                <motion.div key={employee.id} variants={itemVariants}>
                  <Card className={`hover:shadow-md transition-all group ${employee.status === 'inactive' ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header: Avatar + Name + Status */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="size-11 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-bold">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white shadow-sm ${STATUS_DOTS[employee.status] || 'bg-gray-400'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm truncate">{employee.name}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                                  <Pencil className="size-3.5 mr-2" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openPasswordDialog(employee)}>
                                  <Key className="size-3.5 mr-2" /> Change Password
                                </DropdownMenuItem>
                                {employee.status === 'inactive' && (
                                  <DropdownMenuItem onClick={() => handleReactivateEmployee(employee)}>
                                    <UserCheck className="size-3.5 mr-2" /> Reactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => openDeleteDialog(employee)}
                                >
                                  <Trash2 className="size-3.5 mr-2" />
                                  {employee.status === 'inactive' ? 'Delete Permanently' : 'Deactivate'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{employee.email || 'No email'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`${ROLE_CONFIG[employee.role]?.color || 'bg-gray-100 text-gray-600 border-gray-200'} text-[10px] h-5`}>
                          {ROLE_CONFIG[employee.role]?.icon}
                          <span className="ml-1">{ROLE_CONFIG[employee.role]?.label || employee.role}</span>
                        </Badge>
                        <Badge variant="outline" className={`${STATUS_COLORS[employee.status] || STATUS_COLORS.offline} text-[10px] h-5`}>
                          <span className={`size-1.5 rounded-full mr-1 ${STATUS_DOTS[employee.status] || 'bg-gray-400'}`} />
                          {STATUS_LABELS[employee.status] || employee.status}
                        </Badge>
                        {employee.userAccount?.isActive && (
                          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] h-5">
                            <Lock className="size-2.5 mr-1" /> Login
                          </Badge>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3 shrink-0" />
                          <span>{employee.phone}</span>
                        </div>
                        {employee.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Briefcase className="size-3 shrink-0" />
                            <span className="truncate">{employee.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-3 pt-2 border-t text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{employee.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CheckCircle2 className="size-3" />
                          <span>{employee.completedJobs} jobs</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                          <Clock className="size-3" />
                          <span>{formatRelativeTime(employee.updatedAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* ─── Invite Tab ────────────────────────────────────────────────── */}
        <TabsContent value="invite" className="mt-4">
          <div className="max-w-lg mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-teal-600 shrink-0">
                    <Mail className="size-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Send Team Invitation</CardTitle>
                    <CardDescription>
                      Invite a new member to join your team via email
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <Input
                    id="invite-name"
                    placeholder="John Doe"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">
                          <span className="flex items-center gap-2">
                            <Wrench className="size-3" /> Technician
                          </span>
                        </SelectItem>
                        <SelectItem value="manager">
                          <span className="flex items-center gap-2">
                            <Briefcase className="size-3" /> Manager
                          </span>
                        </SelectItem>
                        <SelectItem value="dispatcher">
                          <span className="flex items-center gap-2">
                            <Radio className="size-3" /> Dispatcher
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-phone">Phone</Label>
                    <Input
                      id="invite-phone"
                      placeholder="+1 555 123 4567"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-message">Personal Message</Label>
                  <Textarea
                    id="invite-message"
                    placeholder="Add a welcome message for the invitee..."
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    rows={3}
                  />
                </div>
                <Separator />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      resetInviteForm();
                      setActiveTab('team');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                    onClick={handleSendInvitation}
                    disabled={isSubmitting || !inviteForm.email}
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="size-4 mr-2" />
                    )}
                    Send Invitation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Invitations Tab ───────────────────────────────────────────── */}
        <TabsContent value="invitations" className="mt-4 space-y-4">
          {invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No invitations yet"
              description="Send your first invitation to grow your team"
              actionLabel="Send Invitation"
              onAction={() => {
                resetInviteForm();
                setActiveTab('invite');
              }}
            />
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {invitations.map((inv) => (
                <motion.div key={inv.id} variants={itemVariants}>
                  <Card className="border-l-4" style={{ borderLeftColor: inv.status === 'pending' ? '#f59e0b' : inv.status === 'accepted' ? '#10b981' : inv.status === 'expired' ? '#ef4444' : '#94a3b8' }}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${INVITATION_STATUS_COLORS[inv.status]} text-[10px] h-5`}>
                            {INVITATION_STATUS_ICONS[inv.status]}
                            <span className="ml-1 capitalize">{inv.status}</span>
                          </Badge>
                          <Badge variant="outline" className={`${ROLE_CONFIG[inv.role]?.color || ''} text-[10px] h-5`}>
                            {ROLE_CONFIG[inv.role]?.label || inv.role}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{inv.name || inv.email}</p>
                        <p className="text-xs text-muted-foreground">{inv.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {inv.status === 'pending'
                          ? `Expires ${formatRelativeTime(inv.expiresAt)}`
                          : inv.status === 'accepted'
                          ? `Accepted ${formatDate(inv.acceptedAt)}`
                          : inv.status === 'expired'
                          ? `Expired ${formatDate(inv.expiresAt)}`
                          : `Cancelled`}
                      </div>
                      {inv.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => handleCopyInviteLink(inv)}
                          >
                            <Copy className="size-3 mr-1" /> Copy Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleResendInvitation(inv.id)}
                          >
                            <Send className="size-3 mr-1" /> Resend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                            onClick={() => handleCancelInvitation(inv.id)}
                          >
                            <XCircle className="size-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Add Employee Dialog ──────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-teal-600" />
              Add Employee
            </DialogTitle>
            <DialogDescription>
              Add a new team member. Provide email and password to give them login access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="add-name">Full Name *</Label>
              <Input
                id="add-name"
                placeholder="John Doe"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone *</Label>
                <Input
                  id="add-phone"
                  placeholder="+1 555 123 4567"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="john@company.com"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                />
              </div>
            </div>

            {/* Role & Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm({ ...employeeForm, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-location">Location</Label>
                <Input
                  id="add-location"
                  placeholder="New York, NY"
                  value={employeeForm.location}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, location: e.target.value })}
                />
              </div>
            </div>

            {/* Login Credentials Section */}
            {employeeForm.email && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-teal-600" />
                    <Label className="text-sm font-semibold">Login Credentials</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set a password so this employee can log in to their portal.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="add-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="add-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 characters"
                        value={employeeForm.password}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                        className="pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                  </div>
                  {employeeForm.password && (
                    <div className="space-y-2">
                      <Label htmlFor="add-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="add-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          value={employeeForm.confirmPassword}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, confirmPassword: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      {employeeForm.confirmPassword && employeeForm.password !== employeeForm.confirmPassword && (
                        <p className="text-xs text-red-500">Passwords do not match</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetEmployeeForm(); }}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleAddEmployee}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <UserPlus className="size-4 mr-2" />}
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Employee Dialog ─────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-teal-600" />
              Edit Employee
            </DialogTitle>
            <DialogDescription>
              Update employee details. Leave password blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm({ ...employeeForm, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={employeeForm.location}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, location: e.target.value })}
                />
              </div>
            </div>

            {/* Password Change Section */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="size-4 text-teal-600" />
                <Label className="text-sm font-semibold">Change Password</Label>
                {selectedEmployee?.userAccount?.isActive && (
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] h-5 ml-2">
                    <Lock className="size-2.5 mr-1" /> Has Login
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current password.
              </p>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters (leave blank to keep current)"
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>
              {employeeForm.password && (
                <div className="space-y-2">
                  <Label htmlFor="edit-confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="edit-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={employeeForm.confirmPassword}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, confirmPassword: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  {employeeForm.confirmPassword && employeeForm.password !== employeeForm.confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetEmployeeForm(); }}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleEditEmployee}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Change Password Dialog ──────────────────────────────────────── */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-teal-600" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="change-new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="change-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="change-confirm-password">Confirm Password</Label>
              <Input
                id="change-confirm-password"
                type="password"
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handlePasswordChange}
              disabled={isSubmitting || !passwordForm.newPassword}
            >
              {isSubmitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Key className="size-4 mr-2" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete/Deactivate Dialog ────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedEmployee?.status === 'inactive' ? 'Delete Employee Permanently' : 'Deactivate Employee'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEmployee?.status === 'inactive' ? (
                <>
                  This will <strong>permanently delete</strong> {selectedEmployee?.name}&apos;s record.
                  This action cannot be undone. Any linked user account will also be deactivated.
                </>
              ) : (
                <>
                  This will deactivate {selectedEmployee?.name}. They won&apos;t be able to log in or receive job assignments.
                  You can reactivate them later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedEmployee?.status !== 'inactive' && (
            <div className="flex items-center gap-3 py-2 px-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
              <div className="text-xs text-amber-700">
                <strong>Want to delete permanently?</strong> Deactivate first, then use &quot;Delete Permanently&quot; from the menu.
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={selectedEmployee?.status === 'inactive' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}
              onClick={handleDeleteEmployee}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : selectedEmployee?.status === 'inactive' ? (
                <Trash2 className="size-4 mr-2" />
              ) : (
                <UserMinus className="size-4 mr-2" />
              )}
              {selectedEmployee?.status === 'inactive' ? 'Delete Permanently' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
