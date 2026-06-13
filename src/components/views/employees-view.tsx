'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Users, UserPlus, Shield, Clock, CheckCircle2, UserCheck,
  Search, Phone, MapPin, Star, Briefcase, Loader2,
  Trash2, Pencil, MoreVertical, UserX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  avatar: string | null;
  skills: string;
  location: string | null;
  rating: number;
  completedJobs: number;
  whatsappId: string | null;
  createdAt: string;
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    on_job: 'bg-amber-100 text-amber-700 border-amber-200',
    on_leave: 'bg-purple-100 text-purple-700 border-purple-200',
    offline: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getStatusDot(status: string): string {
  const map: Record<string, string> = {
    available: 'fill-emerald-500 text-emerald-500',
    on_job: 'fill-amber-500 text-amber-500',
    on_leave: 'fill-purple-500 text-purple-500',
    offline: 'fill-slate-400 text-slate-400',
  };
  return map[status] || 'fill-gray-400 text-gray-400';
}

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Driver' },
  { value: 'technician', label: 'Technician' },
  { value: 'manager', label: 'Manager' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'installer', label: 'Installer' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'support', label: 'Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'on_job', label: 'On Job' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'offline', label: 'Offline' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
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
      const res = await fetch('/api/employees');
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

  // ─── Computed ───────────────────────────────────────────────────────────

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const name = (e.name || '').toLowerCase();
      const role = (e.role || '').toLowerCase();
      const phone = (e.phone || '').toLowerCase();
      const skills = (e.skills || '').toLowerCase();
      return name.includes(q) || role.includes(q) || phone.includes(q) || skills.includes(q);
    });
  }, [employees, search]);

  const stats = useMemo(() => ({
    total: employees.length,
    available: employees.filter((e) => e.status === 'available').length,
    onJob: employees.filter((e) => e.status === 'on_job').length,
    onLeave: employees.filter((e) => e.status === 'on_leave').length,
  }), [employees]);

  // ─── Form helpers ───────────────────────────────────────────────────────

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormRole('driver');
    setFormStatus('available');
    setFormLocation('');
    setFormWhatsappId('');
    setFormSkills('');
  };

  const populateFormForEdit = (emp: Employee) => {
    setFormName(emp.name);
    setFormPhone(emp.phone);
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

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          role: formRole,
          status: formStatus,
          location: formLocation.trim() || undefined,
          whatsappId: formWhatsappId.trim() || undefined,
          skills,
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

      const res = await fetch(`/api/employees?id=${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
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
      const res = await fetch(`/api/employees?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Employee deleted');
        setShowDeleteDialog(null);
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

  // ─── Shared form content ───────────────────────────────────────────────

  const formContent = (
    <div className="space-y-4 py-2">
      {/* Name */}
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input placeholder="e.g., John Smith" value={formName} onChange={e => setFormName(e.target.value)} />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label>Phone Number *</Label>
        <Input placeholder="e.g., +919876543210" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
      </div>

      {/* Role & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={formRole} onValueChange={setFormRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formStatus} onValueChange={setFormStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label>Location</Label>
        <Input placeholder="e.g., Mumbai, Delhi" value={formLocation} onChange={e => setFormLocation(e.target.value)} />
      </div>

      {/* WhatsApp ID */}
      <div className="space-y-2">
        <Label>WhatsApp ID</Label>
        <Input placeholder="e.g., 919876543210" value={formWhatsappId} onChange={e => setFormWhatsappId(e.target.value)} />
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <Label>Skills (comma separated)</Label>
        <Input placeholder="e.g., Plumbing, Electrical, Carpentry" value={formSkills} onChange={e => setFormSkills(e.target.value)} />
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Employees</h2>
            <p className="text-sm text-muted-foreground">Manage your team and staff</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <UserPlus className="size-4 mr-1.5" /> Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onJob}</p>
                <p className="text-xs text-muted-foreground">On Job</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Shield className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onLeave}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name, role, or skill..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading ? (
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
              {search ? 'No employees match your search' : 'No employees yet'}
            </p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term' : 'Add your first employee to get started'}
            </p>
            {!search && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <UserPlus className="size-4 mr-1.5" /> Add Employee
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((emp) => {
            let skills: string[] = [];
            try {
              const parsed = JSON.parse(emp.skills || '[]');
              if (Array.isArray(parsed)) skills = parsed;
            } catch { /* ignore */ }

            return (
              <Card key={emp.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-12 shrink-0">
                        <AvatarFallback className={cn(
                          'text-sm font-semibold',
                          emp.status === 'available'
                            ? 'bg-emerald-100 text-emerald-700'
                            : emp.status === 'on_job'
                            ? 'bg-amber-100 text-amber-700'
                            : emp.status === 'on_leave'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        )}>
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{emp.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{emp.role}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(emp)}>
                          <Pencil className="size-3 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setShowDeleteDialog(emp.id)}
                        >
                          <Trash2 className="size-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(getStatusColor(emp.status), 'text-[10px]')}>
                      <span className={cn('size-1.5 rounded-full mr-1', getStatusDot(emp.status))} />
                      {emp.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="size-3 shrink-0" />
                      <span className="truncate">{emp.phone}</span>
                    </div>
                    {emp.location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{emp.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1.5">
                          {skill}
                        </Badge>
                      ))}
                      {skills.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          +{skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Star className="size-3 text-amber-500" />
                      <span>{emp.rating > 0 ? emp.rating.toFixed(1) : '-'} Rating</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3 text-emerald-500" />
                      <span>{emp.completedJobs} Jobs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) setShowAddDialog(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Add a new team member to your organization.</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={!formName.trim() || !formPhone.trim() || saving}>
              {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Adding...</> : <><UserPlus className="size-4 mr-1.5" /> Add Employee</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingEmployee(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information and settings.</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingEmployee(null); }}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!formName.trim() || !formPhone.trim() || saving}>
              {saving ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : <><Pencil className="size-4 mr-1.5" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
