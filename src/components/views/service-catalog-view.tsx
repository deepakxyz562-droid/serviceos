'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreHorizontal,
  DollarSign,
  Clock,
  Tag,
  Filter,
  X,
  ToggleLeft,
  ToggleRight,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { useDemoPageSize } from '@/hooks/use-demo-page-size';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  duration: number;
  icon: string | null;
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ServiceForm {
  name: string;
  description: string;
  category: string;
  costPrice: string;
  markup: string;
  basePrice: string;
  duration: string;
  icon: string;
  isActive: boolean;
  isBookable: boolean;
  isOnlineBookable: boolean;
}

const EMPTY_FORM: ServiceForm = {
  name: '',
  description: '',
  category: 'general',
  costPrice: '0',
  markup: '0',
  basePrice: '0',
  duration: '60',
  icon: '',
  isActive: true,
  isBookable: false,
  isOnlineBookable: false,
};

const DURATION_OPTIONS = [
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '45', label: '45m' },
  { value: '60', label: '1h' },
  { value: '90', label: '1h 30m' },
  { value: '120', label: '2h' },
  { value: '150', label: '2h 30m' },
  { value: '180', label: '3h' },
  { value: '210', label: '3h 30m' },
  { value: '240', label: '4h' },
  { value: '270', label: '4h 30m' },
  { value: '300', label: '5h' },
  { value: '330', label: '5h 30m' },
  { value: '360', label: '6h' },
  { value: '390', label: '6h 30m' },
  { value: '420', label: '7h' },
  { value: '450', label: '7h 30m' },
  { value: '480', label: '8h' },
  { value: '510', label: '8h 30m' },
  { value: '540', label: '9h' },
  { value: '570', label: '9h 30m' },
  { value: '600', label: '10h' },
  { value: '630', label: '10h 30m' },
  { value: '660', label: '11h' },
  { value: '690', label: '11h 30m' },
  { value: '720', label: '12h' },
];

const CATEGORIES = [
  'general',
  'cleaning',
  'plumbing',
  'electrical',
  'painting',
  'maintenance',
  'landscaping',
  'pest_control',
  'hvac',
  'other',
] as const;

// ─── Category Badge Colors ──────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cleaning: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  plumbing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  electrical: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  painting: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  landscaping: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  pest_control: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  hvac: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function formatCategoryLabel(cat: string): string {
  return cat
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ServiceCatalogView() {
  const { format, currency } = useCompanyCurrency();
  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  // Demo-mode page size cap (5 for demo tenant, else 100)
  const demoPageSize = useDemoPageSize(100);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch Services ──────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', String(demoPageSize));

      const qs = params.toString();
      const url = `/api/services${qs ? `?${qs}` : ''}`;
      const data = await apiGet<{ services: Service[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(url);

      setServices(data.services);

      // Compute stats from the full list
      const statsParams = new URLSearchParams();
      statsParams.set('limit', '100');
      const statsData = await apiGet<{ services: Service[] }>(`/api/services?${statsParams.toString()}`);
      const allServices = statsData.services;

      setActiveCount(allServices.filter((s) => s.isActive).length);
      setInactiveCount(allServices.filter((s) => !s.isActive).length);
      setTotalCount(allServices.length);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, demoPageSize]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // ─── Form Handlers ───────────────────────────────────────────────────────

  const resetForm = () => setForm(EMPTY_FORM);

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setForm({
      name: service.name,
      description: service.description || '',
      category: service.category,
      costPrice: String(service.costPrice || 0),
      markup: String(service.markup || 0),
      basePrice: String(service.basePrice),
      duration: String(service.duration),
      icon: service.icon || '',
      isActive: service.isActive,
      isBookable: service.isBookable || false,
      isOnlineBookable: service.isOnlineBookable || false,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    try {
      setSubmitting(true);
      await apiPost('/api/services', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        costPrice: parseFloat(form.costPrice) || 0,
        markup: parseFloat(form.markup) || 0,
        basePrice: parseFloat(form.basePrice) || 0,
        duration: parseInt(form.duration) || 60,
        icon: form.icon.trim() || null,
        isActive: form.isActive,
        isBookable: form.isBookable,
        isOnlineBookable: form.isOnlineBookable,
      });
      setAddDialogOpen(false);
      resetForm();
      await fetchServices();
    } catch (err) {
      console.error('Failed to create service:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedService || !form.name.trim()) return;
    try {
      setSubmitting(true);
      await apiPut(`/api/services/${selectedService.id}`, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        costPrice: parseFloat(form.costPrice) || 0,
        markup: parseFloat(form.markup) || 0,
        basePrice: parseFloat(form.basePrice) || 0,
        duration: parseInt(form.duration) || 60,
        icon: form.icon.trim() || null,
        isActive: form.isActive,
        isBookable: form.isBookable,
        isOnlineBookable: form.isOnlineBookable,
      });
      setEditDialogOpen(false);
      setSelectedService(null);
      resetForm();
      await fetchServices();
    } catch (err) {
      console.error('Failed to update service:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    try {
      await apiDelete(`/api/services/${selectedService.id}`);
      setDeleteDialogOpen(false);
      setSelectedService(null);
      await fetchServices();
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await apiPut(`/api/services/${service.id}`, {
        isActive: !service.isActive,
      });
      await fetchServices();
    } catch (err) {
      console.error('Failed to toggle service status:', err);
    }
  };

  // ─── Render: Service Form ────────────────────────────────────────────────

  const renderForm = () => (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          placeholder="Service name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe this service..."
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="basePrice">Unit Price ({currencySymbol})</Label>
          <Input
            id="basePrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="duration">Service Duration</Label>
          <Select value={form.duration} onValueChange={(val) => setForm({ ...form, duration: val })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cost + Markup → auto-calculated unit price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="costPrice">Cost ({currencySymbol})</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.costPrice}
            onChange={(e) => {
              const newCost = e.target.value;
              const cost = parseFloat(newCost) || 0;
              const markup = parseFloat(form.markup) || 0;
              const calculatedPrice = (cost + (cost * markup / 100)).toFixed(2);
              setForm({ ...form, costPrice: newCost, basePrice: calculatedPrice });
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="markup">Markup (%)</Label>
          <Input
            id="markup"
            type="number"
            step="1"
            min="0"
            placeholder="0"
            value={form.markup}
            onChange={(e) => {
              const newMarkup = e.target.value;
              const cost = parseFloat(form.costPrice) || 0;
              const markup = parseFloat(newMarkup) || 0;
              const calculatedPrice = (cost + (cost * markup / 100)).toFixed(2);
              setForm({ ...form, markup: newMarkup, basePrice: calculatedPrice });
            }}
          />
        </div>
      </div>
      {parseFloat(form.costPrice) > 0 && (
        <p className="text-xs text-muted-foreground">
          Unit price auto-calculated: {currencySymbol}{form.basePrice} = {currencySymbol}{form.costPrice} + {form.markup}% markup
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="icon">Icon (Optional)</Label>
        <Input
          id="icon"
          placeholder="e.g. wrench, brush, hammer"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
        />
      </div>

      {/* Online Booking section */}
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-emerald-600" />
          <span className="text-sm font-medium">Online Booking</span>
        </div>
        <p className="text-xs text-muted-foreground">
          These settings control marketplace visibility and online booking.
        </p>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Bookable</Label>
            <p className="text-xs text-muted-foreground">Allow customers to book this service</p>
          </div>
          <Switch
            checked={form.isBookable}
            onCheckedChange={(checked) => setForm({ ...form, isBookable: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Online booking enabled</Label>
            <p className="text-xs text-muted-foreground">Show on marketplace detail page for online booking</p>
          </div>
          <Switch
            checked={form.isOnlineBookable}
            onCheckedChange={(checked) => setForm({ ...form, isOnlineBookable: checked })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label>Active</Label>
          <p className="text-xs text-muted-foreground">
            Make this service visible to customers
          </p>
        </div>
        <Switch
          checked={form.isActive}
          onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
        />
      </div>
    </div>
  );

  // ─── Render: Loading Skeletons ───────────────────────────────────────────

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ─── Render: Empty State ─────────────────────────────────────────────────

  const renderEmpty = () => (
    <Card>
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <BookOpen className="size-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold">
            {searchQuery
              ? 'No services found'
              : 'No services yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {searchQuery
              ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
              : 'Define and organize your service offerings with pricing, duration, and descriptions. Categorize services for easy discovery by customers and employees.'}
          </p>
          {!searchQuery && (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openAddDialog}>
              <Plus className="size-4 mr-1.5" /> Add Service
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ─── Render: Service Card ────────────────────────────────────────────────

  const renderServiceCard = (service: Service) => {
    const badgeClass = '';

    return (
      <Card key={service.id} className={`relative transition-shadow hover:shadow-md ${!service.isActive ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold leading-tight truncate">
                {service.name}
              </CardTitle>
              {service.description && (
                <CardDescription className="mt-1 line-clamp-2 text-xs">
                  {service.description}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 shrink-0">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(service)}>
                  <Pencil className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openDeleteDialog(service)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-emerald-600" />
              <span className="font-medium text-foreground">{formatPrice(service.basePrice)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>{formatDuration(service.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t">
            <div className="flex items-center gap-2">
              {service.isActive ? (
                <ToggleRight className="size-4 text-emerald-600" />
              ) : (
                <ToggleLeft className="size-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {service.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <Switch
              checked={service.isActive}
              onCheckedChange={() => handleToggleActive(service)}
              aria-label={`Toggle ${service.name} active status`}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <BookOpen className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Service Catalog</h2>
            <p className="text-sm text-muted-foreground">Manage your services and pricing</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openAddDialog}>
          <Plus className="size-4 mr-1.5" /> Add Service
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <BookOpen className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Tag className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Filter className="size-4 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards Grid */}
      {loading ? (
        renderSkeletons()
      ) : services.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(renderServiceCard)}
        </div>
      )}

      {/* Add Service Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>
              Create a new service offering for your catalog.
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAdd}
              disabled={submitting || !form.name.trim()}
            >
              {submitting ? 'Creating...' : 'Create Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setSelectedService(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the details of this service.
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedService(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleEdit}
              disabled={submitting || !form.name.trim()}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setSelectedService(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedService?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
