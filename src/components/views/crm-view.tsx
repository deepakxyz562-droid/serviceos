'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Plus, Phone, Mail, MapPin, Star, Briefcase,
  MoreHorizontal, Pencil, Trash2, Eye, MessageCircle, Contact,
  RefreshCw, TrendingUp, UserCheck, Clock, ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  whatsappId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  skills: string;
  status: string;
  avatar?: string;
  whatsappId?: string;
  rating: number;
  completedJobs: number;
  currentJobId?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  customerName?: string;
  scheduledAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEmployeeStatusColor(status: string) {
  const map: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    busy: 'bg-amber-100 text-amber-700 border-amber-200',
    offline: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getEmployeeStatusDot(status: string) {
  const map: Record<string, string> = {
    available: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-gray-400',
  };
  return map[status] || 'bg-gray-400';
}

function getRoleBadgeColor(role: string) {
  const map: Record<string, string> = {
    driver: 'bg-sky-100 text-sky-700 border-sky-200',
    cleaner: 'bg-teal-100 text-teal-700 border-teal-200',
    beautician: 'bg-pink-100 text-pink-700 border-pink-200',
    doctor: 'bg-red-100 text-red-700 border-red-200',
    technician: 'bg-amber-100 text-amber-700 border-amber-200',
    packer: 'bg-violet-100 text-violet-700 border-violet-200',
    delivery: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return map[role] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function getJobStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-teal-100 text-teal-700 border-teal-200',
    in_progress: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CrmView() {
  const { setActiveView } = useAppStore();
  const [activeTab, setActiveTab] = useState('customers');

  // ─── Customers State ────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [customerSort, setCustomerSort] = useState<'name' | 'createdAt'>('name');
  const [customerSortDir, setCustomerSortDir] = useState<'asc' | 'desc'>('asc');

  // ─── Employees State ────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('all');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ name: '', phone: '', role: 'technician', location: '', skills: '' });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [employeeViewMode, setEmployeeViewMode] = useState<'cards' | 'table'>('cards');
  const [employeeJobs, setEmployeeJobs] = useState<Job[]>([]);
  const [employeeJobsLoading, setEmployeeJobsLoading] = useState(false);

  // ─── Fetch Customers ────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await authFetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      }
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  // ─── Fetch Employees ────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const res = await authFetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : data.employees || []);
      }
    } catch {
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchEmployees();
  }, [fetchCustomers, fetchEmployees]);

  // ─── Customer CRUD ──────────────────────────────────────────────────────
  const handleSaveCustomer = async () => {
    if (!customerForm.name || !customerForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const isEditing = !!editingCustomer;
      const url = isEditing ? `/api/customers?id=${editingCustomer.id}` : '/api/customers';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });
      if (res.ok) {
        toast.success(`Customer ${isEditing ? 'updated' : 'created'} successfully`);
        setShowAddCustomer(false);
        setEditingCustomer(null);
        setCustomerForm({ name: '', phone: '', email: '', address: '' });
        fetchCustomers();
      } else {
        toast.error(`Failed to ${isEditing ? 'update' : 'create'} customer`);
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await authFetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Customer deleted');
        fetchCustomers();
        setShowCustomerDetail(false);
      } else {
        toast.error('Failed to delete customer');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
    });
    setShowAddCustomer(true);
  };

  // ─── Employee CRUD ──────────────────────────────────────────────────────
  const handleSaveEmployee = async () => {
    if (!employeeForm.name || !employeeForm.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const isEditing = !!editingEmployee;
      const url = isEditing ? `/api/employees?id=${editingEmployee.id}` : '/api/employees';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employeeForm,
          skills: employeeForm.skills ? employeeForm.skills.split(',').map(s => s.trim()) : [],
        }),
      });
      if (res.ok) {
        toast.success(`Employee ${isEditing ? 'updated' : 'created'} successfully`);
        setShowAddEmployee(false);
        setEditingEmployee(null);
        setEmployeeForm({ name: '', phone: '', role: 'technician', location: '', skills: '' });
        fetchEmployees();
      } else {
        toast.error(`Failed to ${isEditing ? 'update' : 'create'} employee`);
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const res = await authFetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Employee deleted');
        fetchEmployees();
        setShowEmployeeDetail(false);
      } else {
        toast.error('Failed to delete employee');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const openEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    let skills = '';
    try { skills = JSON.parse(employee.skills || '[]').join(', '); } catch { skills = employee.skills; }
    setEmployeeForm({
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      location: employee.location || '',
      skills,
    });
    setShowAddEmployee(true);
  };

  const openEmployeeDetail = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetail(true);
    setEmployeeJobs([]);
    setEmployeeJobsLoading(true);
    try {
      const res = await authFetch(`/api/employees/${employee.id}/jobs`);
      if (res.ok) {
        const data = await res.json();
        const jobs = Array.isArray(data) ? data : data.jobs || [];
        setEmployeeJobs(jobs.map((j: Record<string, unknown>) => ({
          id: j.id as string,
          title: (j.title as string) || 'Untitled Job',
          status: (j.status as string) || 'pending',
          customerName: (j.customer as Record<string, unknown>)?.name as string || undefined,
          scheduledAt: (j.scheduledAt as string) || '',
        })));
      } else {
        setEmployeeJobs([]);
      }
    } catch {
      setEmployeeJobs([]);
    } finally {
      setEmployeeJobsLoading(false);
    }
  };

  // ─── Filtered / Sorted Lists ────────────────────────────────────────────

  const filteredCustomers = customers
    .filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))
    )
    .sort((a, b) => {
      const dir = customerSortDir === 'asc' ? 1 : -1;
      if (customerSort === 'name') return a.name.localeCompare(b.name) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(employeeSearch.toLowerCase()) || e.phone.includes(employeeSearch);
    const matchesRole = employeeRoleFilter === 'all' || e.role === employeeRoleFilter;
    const matchesStatus = employeeStatusFilter === 'all' || e.status === employeeStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // ─── Stats ──────────────────────────────────────────────────────────────

  const customerStats = {
    total: customers.length,
    withEmail: customers.filter(c => c.email).length,
    withWhatsApp: customers.filter(c => c.whatsappId).length,
    recent: customers.filter(c => {
      const created = new Date(c.createdAt);
      const now = new Date();
      return now.getTime() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  const employeeStats = {
    total: employees.length,
    available: employees.filter(e => e.status === 'available').length,
    busy: employees.filter(e => e.status === 'busy').length,
    avgRating: employees.length > 0 ? (employees.reduce((sum, e) => sum + e.rating, 0) / employees.length).toFixed(1) : '0',
  };

  // ─── Sort handler ───────────────────────────────────────────────────────
  const handleSort = (field: 'name' | 'createdAt') => {
    if (customerSort === field) {
      setCustomerSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCustomerSort(field);
      setCustomerSortDir('asc');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <Users className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">CRM</h2>
          <p className="text-sm text-muted-foreground">Manage customers, employees, and business relationships</p>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers" className="gap-1.5">
            <Contact className="size-3.5" /> Customers
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-1.5">
            <Briefcase className="size-3.5" /> Employees
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ CUSTOMERS TAB ═══════════════════════════════ */}
        <TabsContent value="customers" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Customers</p>
                  <p className="text-lg font-bold">{customerStats.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-sky-500" />
                <div>
                  <p className="text-xs text-muted-foreground">With Email</p>
                  <p className="text-lg font-bold text-sky-600">{customerStats.withEmail}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="text-lg font-bold text-emerald-600">{customerStats.withWhatsApp}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">New (7d)</p>
                  <p className="text-lg font-bold text-amber-600">{customerStats.recent}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search + Actions */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchCustomers()}>
              <RefreshCw className="size-3.5 mr-1" /> Refresh
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setEditingCustomer(null);
                setCustomerForm({ name: '', phone: '', email: '', address: '' });
                setShowAddCustomer(true);
              }}
            >
              <Plus className="size-4 mr-1" /> Add Customer
            </Button>
          </div>

          {/* Customer Table */}
          {customersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="size-12 mb-3 opacity-20" />
              <p>No customers found</p>
              <p className="text-xs">Add your first customer to get started</p>
            </div>
          ) : (
            <Card>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('name')}>
                          Name <ArrowUpDown className="size-3" />
                        </button>
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => handleSort('createdAt')}>
                          Added <ArrowUpDown className="size-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map(customer => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer"
                        onClick={() => { setSelectedCustomer(customer); setShowCustomerDetail(true); }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
                                {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{customer.name}</p>
                              {customer.whatsappId && (
                                <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-600 border-emerald-200 mt-0.5">
                                  WhatsApp
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3 text-muted-foreground" /> {customer.phone}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {customer.email ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="size-3" /> {customer.email}
                            </span>
                          ) : '--'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {customer.address ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 shrink-0" /> {customer.address}
                            </span>
                          ) : '--'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(customer.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setShowCustomerDetail(true); }}>
                                <Eye className="size-3.5 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditCustomer(customer)}>
                                <Pencil className="size-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDeleteCustomer(customer.id)}
                              >
                                <Trash2 className="size-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}

          {/* Add/Edit Customer Dialog */}
          <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
                <DialogDescription>
                  {editingCustomer ? 'Update customer information' : 'Add a new customer to your CRM'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input placeholder="Full name" value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input placeholder="+1 555 123 4567" value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input placeholder="email@example.com" type="email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea placeholder="Full address" value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCustomer} disabled={!customerForm.name || !customerForm.phone}>
                  {editingCustomer ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Customer Detail Dialog */}
          <Dialog open={showCustomerDetail} onOpenChange={setShowCustomerDetail}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
              </DialogHeader>
              {selectedCustomer && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-14 shrink-0">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-medium">
                        {selectedCustomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2.5 text-sm">
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground shrink-0" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground shrink-0" />
                        <span>{selectedCustomer.address}</span>
                      </div>
                    )}
                    {selectedCustomer.whatsappId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-4 text-emerald-500 shrink-0" />
                        <span>{selectedCustomer.whatsappId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground shrink-0" />
                      <span>Added {formatDate(selectedCustomer.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowCustomerDetail(false); openEditCustomer(selectedCustomer); }}>
                      <Pencil className="size-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setShowCustomerDetail(false); setActiveView('whatsapp'); }}>
                      <MessageCircle className="size-3.5 mr-1" /> Message
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════════ EMPLOYEES TAB ═══════════════════════════════ */}
        <TabsContent value="employees" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{employeeStats.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-lg font-bold text-emerald-600">{employeeStats.available}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Busy</p>
                  <p className="text-lg font-bold text-orange-600">{employeeStats.busy}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Star className="size-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                  <p className="text-lg font-bold text-yellow-600">{employeeStats.avgRating}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={employeeRoleFilter} onValueChange={setEmployeeRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="cleaner">Cleaner</SelectItem>
                <SelectItem value="beautician">Beautician</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="packer">Packer</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-md p-0.5">
              <Button
                size="sm"
                variant={employeeViewMode === 'cards' ? 'default' : 'ghost'}
                className="h-7 text-xs px-2"
                onClick={() => setEmployeeViewMode('cards')}
              >
                Cards
              </Button>
              <Button
                size="sm"
                variant={employeeViewMode === 'table' ? 'default' : 'ghost'}
                className="h-7 text-xs px-2"
                onClick={() => setEmployeeViewMode('table')}
              >
                Table
              </Button>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setEditingEmployee(null);
                setEmployeeForm({ name: '', phone: '', role: 'technician', location: '', skills: '' });
                setShowAddEmployee(true);
              }}
            >
              <Plus className="size-4 mr-1" /> Add Employee
            </Button>
          </div>

          {/* Employee Content */}
          {employeesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Briefcase className="size-12 mb-3 opacity-20" />
              <p>No employees found</p>
              <p className="text-xs">Add your first employee to get started</p>
            </div>
          ) : employeeViewMode === 'cards' ? (
            /* ─── Card View ──────────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map(employee => {
                let skills: string[] = [];
                try { skills = JSON.parse(employee.skills || '[]'); } catch { /* empty */ }

                return (
                  <Card
                    key={employee.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openEmployeeDetail(employee)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="size-10">
                            <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-medium">
                              {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${getEmployeeStatusDot(employee.status)}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm truncate">{employee.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] h-4 ${getRoleBadgeColor(employee.role)}`}>
                              {employee.role}
                            </Badge>
                            <Badge variant="outline" className={getEmployeeStatusColor(employee.status)}>
                              {employee.status}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); openEditEmployee(employee); }}>
                              <Pencil className="size-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={e => { e.stopPropagation(); handleDeleteEmployee(employee.id); }}>
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="size-3" /> {employee.phone}</span>
                        {employee.location && (
                          <span className="flex items-center gap-1"><MapPin className="size-3" /> {employee.location}</span>
                        )}
                      </div>

                      {/* Skills */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] h-4">{skill}</Badge>
                          ))}
                          {skills.length > 3 && (
                            <Badge variant="secondary" className="text-[9px] h-4">+{skills.length - 3}</Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="size-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{employee.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground">({employee.completedJobs} jobs)</span>
                        </div>
                        {employee.currentJobId && (
                          <Badge variant="outline" className="text-[9px] h-4 bg-teal-50 text-teal-600 border-teal-200">
                            <Briefcase className="size-2.5 mr-0.5" /> Active
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* ─── Table View ─────────────────────────────────────────────── */
            <Card>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Completed Jobs</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map(employee => {
                      let skills: string[] = [];
                      try { skills = JSON.parse(employee.skills || '[]'); } catch { /* empty */ }

                      return (
                        <TableRow
                          key={employee.id}
                          className="cursor-pointer"
                          onClick={() => openEmployeeDetail(employee)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Avatar className="size-7">
                                  <AvatarFallback className="bg-sky-100 text-sky-700 text-[10px] font-medium">
                                    {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white ${getEmployeeStatusDot(employee.status)}`} />
                              </div>
                              <span className="font-medium text-sm">{employee.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{employee.phone}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] h-4 ${getRoleBadgeColor(employee.role)}`}>
                              {employee.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getEmployeeStatusColor(employee.status)}>
                              <span className={`inline-block size-1.5 rounded-full mr-1 ${getEmployeeStatusDot(employee.status)}`} />
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-0.5">
                              {skills.slice(0, 2).map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] h-4">{skill}</Badge>
                              ))}
                              {skills.length > 2 && (
                                <Badge variant="secondary" className="text-[9px] h-4">+{skills.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-0.5 text-sm">
                              <Star className="size-3 text-yellow-500 fill-yellow-500" />
                              {employee.rating.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{employee.completedJobs}</TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEmployeeDetail(employee)}>
                                  <Eye className="size-3.5 mr-2" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditEmployee(employee)}>
                                  <Pencil className="size-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => handleDeleteEmployee(employee.id)}>
                                  <Trash2 className="size-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}

          {/* Add/Edit Employee Dialog */}
          <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
                <DialogDescription>
                  {editingEmployee ? 'Update employee information' : 'Add a new employee to your team'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input placeholder="Full name" value={employeeForm.name} onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input placeholder="+1 555 123 4567" value={employeeForm.phone} onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={employeeForm.role} onValueChange={v => setEmployeeForm({ ...employeeForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                      <SelectItem value="beautician">Beautician</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="packer">Packer</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="City or area" value={employeeForm.location} onChange={e => setEmployeeForm({ ...employeeForm, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Skills</Label>
                  <Input placeholder="Comma-separated skills" value={employeeForm.skills} onChange={e => setEmployeeForm({ ...employeeForm, skills: e.target.value })} />
                  <p className="text-xs text-muted-foreground">e.g., heavy vehicle, AC repair, first aid</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddEmployee(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveEmployee} disabled={!employeeForm.name || !employeeForm.phone}>
                  {editingEmployee ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Employee Detail Dialog */}
          <Dialog open={showEmployeeDetail} onOpenChange={setShowEmployeeDetail}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Employee Details</DialogTitle>
              </DialogHeader>
              {selectedEmployee && (() => {
                let skills: string[] = [];
                try { skills = JSON.parse(selectedEmployee.skills || '[]'); } catch { /* empty */ }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="size-14 shrink-0">
                          <AvatarFallback className="bg-sky-100 text-sky-700 text-lg font-medium">
                            {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-white ${getEmployeeStatusDot(selectedEmployee.status)}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{selectedEmployee.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getRoleBadgeColor(selectedEmployee.role)}>
                            {selectedEmployee.role}
                          </Badge>
                          <Badge variant="outline" className={getEmployeeStatusColor(selectedEmployee.status)}>
                            {selectedEmployee.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-muted-foreground shrink-0" />
                        <span>{selectedEmployee.phone}</span>
                      </div>
                      {selectedEmployee.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-muted-foreground shrink-0" />
                          <span>{selectedEmployee.location}</span>
                        </div>
                      )}
                      {selectedEmployee.whatsappId && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="size-4 text-emerald-500 shrink-0" />
                          <span>{selectedEmployee.whatsappId}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Star className="size-4 text-yellow-500 shrink-0 fill-yellow-500" />
                        <span>{selectedEmployee.rating.toFixed(1)} rating &bull; {selectedEmployee.completedJobs} completed jobs</span>
                      </div>
                    </div>
                    {skills.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1.5">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Assigned Jobs</h4>
                        {employeeJobs.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4">{employeeJobs.length}</Badge>
                        )}
                      </div>
                      {employeeJobsLoading ? (
                        <div className="space-y-2">
                          {[1, 2].map(i => (
                            <div key={i} className="animate-pulse h-12 bg-muted rounded-lg" />
                          ))}
                        </div>
                      ) : employeeJobs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No assigned jobs</p>
                      ) : (
                        <ScrollArea className="max-h-48">
                          <div className="space-y-2">
                            {employeeJobs.map(job => (
                              <div key={job.id} className="flex items-center justify-between p-2 rounded-lg border">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{job.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {job.customerName || 'No customer'} • {formatDate(job.scheduledAt)}
                                  </p>
                                </div>
                                <Badge variant="outline" className={`ml-2 shrink-0 ${getJobStatusColor(job.status)}`}>
                                  {job.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowEmployeeDetail(false); openEditEmployee(selectedEmployee); }}>
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setShowEmployeeDetail(false); setActiveView('jobs'); }}>
                        <Briefcase className="size-3.5 mr-1" /> View in Jobs
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
