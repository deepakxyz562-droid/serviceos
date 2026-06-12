'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Package, Plus, Search, Clock, DollarSign, Users,
  MoreHorizontal, Eye, Trash2, Pencil, Zap, Star,
  Layers, Tag, GripVertical,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  duration: number;
  icon?: string;
  isActive: boolean;
  assignedTeamJson: string;
  addOnsJson: string;
  imageUrl?: string;
  tagsJson: string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  basePrice: string;
  duration: string;
  icon: string;
  isActive: boolean;
  addOns: string;
  tags: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Cleaning', 'Plumbing', 'Electrical', 'HVAC', 'Pest Control', 'Moving', 'Salon', 'General'];
const CATEGORIES_FOR_SELECT = CATEGORIES.filter((c) => c !== 'All');

const EMPTY_FORM = (): ServiceFormData => ({
  name: '', description: '', category: '', basePrice: '', duration: '60',
  icon: '', isActive: true, addOns: '', tags: '',
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
}

function parseJsonArray(jsonStr: string): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ServiceCatalogView() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState<ServiceFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'All') params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await authFetch(`/api/services?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      setServices(data.services || data || []);
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ─── Computed Stats ─────────────────────────────────────────────────────

  const stats = useCallback(() => {
    const total = services.length;
    const active = services.filter((s) => s.isActive).length;
    const categories = new Set(services.map((s) => s.category)).size;
    return { total, active, categories };
  }, [services]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingService(null);
    setForm(EMPTY_FORM());
    setShowCreateDialog(true);
  };

  const openEditDialog = (service: ServiceItem) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || '',
      category: service.category,
      basePrice: String(service.basePrice),
      duration: String(service.duration),
      icon: service.icon || '',
      isActive: service.isActive,
      addOns: parseJsonArray(service.addOnsJson).join(', '),
      tags: parseJsonArray(service.tagsJson).join(', '),
    });
    setShowCreateDialog(true);
  };

  const openDetailDialog = (service: ServiceItem) => {
    setSelectedService(service);
    setShowDetailDialog(true);
  };

  const handleSaveService = async () => {
    if (!form.name.trim()) { toast.error('Service name is required'); return; }
    if (!form.category) { toast.error('Category is required'); return; }
    if (!form.basePrice) { toast.error('Price is required'); return; }
    setSaving(true);
    try {
      const addOnsArray = form.addOns.split(',').map((s) => s.trim()).filter(Boolean);
      const tagsArray = form.tags.split(',').map((s) => s.trim()).filter(Boolean);

      const payload = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        basePrice: parseFloat(form.basePrice) || 0,
        duration: parseInt(form.duration) || 60,
        icon: form.icon || null,
        isActive: form.isActive,
        addOnsJson: JSON.stringify(addOnsArray),
        tagsJson: JSON.stringify(tagsArray),
      };

      let res: Response;
      if (editingService) {
        res = await authFetch(`/api/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch('/api/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('Failed to save service');
      toast.success(editingService ? 'Service updated' : 'Service created');
      setShowCreateDialog(false);
      setEditingService(null);
      fetchServices();
    } catch {
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: ServiceItem) => {
    try {
      const res = await authFetch(`/api/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(service.isActive ? 'Service deactivated' : 'Service activated');
      fetchServices();
    } catch {
      toast.error('Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const res = await authFetch(`/api/services/${serviceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Service deleted');
      if (selectedService?.id === serviceId) { setShowDetailDialog(false); setSelectedService(null); }
      fetchServices();
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const s = stats();

  // ─── Loading Skeleton ───────────────────────────────────────────────────

  if (loading && services.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <ViewHeader icon={Package} iconBg="bg-teal-600" title="Service Catalog" description="Manage services, pricing, and add-ons" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={Package}
        iconBg="bg-teal-600"
        title="Service Catalog"
        description="Manage services, pricing, teams, and add-ons"
        action={
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Add Service
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Services', value: s.total, icon: Package, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Active', value: s.active, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Categories', value: s.categories, icon: Layers, color: 'text-sky-600', bg: 'bg-sky-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-xl shrink-0`}><Icon className={`size-4 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Category Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-auto">
          <TabsList className="h-9 flex-wrap">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs px-2">{cat}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Service Cards */}
      {services.length === 0 && !loading ? (
        <EmptyState icon={Package} title="No services found" description="Try adjusting your filters or add a new service" actionLabel="Add Service" onAction={openCreateDialog} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => {
            const addOns = parseJsonArray(service.addOnsJson);
            const tags = parseJsonArray(service.tagsJson);
            return (
              <Card key={service.id} className={`hover:shadow-md transition-shadow cursor-pointer ${!service.isActive ? 'opacity-60' : ''}`} onClick={() => openDetailDialog(service)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{service.name}</h3>
                      <Badge variant="outline" className="text-[10px] h-5 mt-1">{service.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {!service.isActive && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-red-50 text-red-700">Inactive</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="size-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => openEditDialog(service)}><Pencil className="size-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(service)}>
                            {service.isActive ? <><Eye className="size-3.5 mr-2" /> Deactivate</> : <><Zap className="size-3.5 mr-2" /> Activate</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDeleteService(service.id)}><Trash2 className="size-3.5 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-teal-700">{formatPrice(service.basePrice)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {service.duration} min
                    </div>
                  </div>

                  {/* Add-ons */}
                  {addOns.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Package className="size-3" /> Add-ons</p>
                      <div className="flex flex-wrap gap-1">
                        {addOns.slice(0, 3).map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px] h-5">{a}</Badge>
                        ))}
                        {addOns.length > 3 && <Badge variant="outline" className="text-[10px] h-5">+{addOns.length - 3}</Badge>}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 4).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] h-5 bg-teal-50 text-teal-700">{t}</Badge>
                      ))}
                      {tags.length > 4 && <Badge variant="secondary" className="text-[10px] h-5">+{tags.length - 4}</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Service Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-teal-600" />
              {editingService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
            <DialogDescription>{editingService ? 'Update service details' : 'Add a new service to your catalog'}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 pr-3">
              <div className="space-y-2">
                <Label>Service Name *</Label>
                <Input placeholder="e.g., AC Installation" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CATEGORIES_FOR_SELECT.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Icon (emoji)</Label>
                  <Input placeholder="🔧" value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} className="text-center" maxLength={4} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price ($) *</Label>
                  <Input type="number" min={0} value={form.basePrice} onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" min={15} step={15} value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Service description..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Add-ons (comma-separated)</Label>
                <Input placeholder="e.g., Carpet Cleaning, Window Cleaning" value={form.addOns} onChange={(e) => setForm((p) => ({ ...p, addOns: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input placeholder="e.g., popular, premium, residential" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSaveService} disabled={saving}>{saving ? 'Saving...' : editingService ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {selectedService && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedService.icon && <span className="text-xl">{selectedService.icon}</span>}
                  <Package className="size-5 text-teal-600" />
                  {selectedService.name}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="outline" className="text-[10px]">{selectedService.category}</Badge>
                  {!selectedService.isActive && (
                    <Badge variant="secondary" className="text-[10px] ml-1 bg-red-50 text-red-700">Inactive</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-1">
                <div className="space-y-4 pr-3">
                  {selectedService.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{selectedService.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Price</Label>
                      <p className="text-lg font-bold text-teal-700 mt-1">{formatPrice(selectedService.basePrice)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <p className="text-sm font-medium mt-1 flex items-center gap-1"><Clock className="size-3.5" /> {selectedService.duration} minutes</p>
                    </div>
                  </div>

                  <Separator />

                  {parseJsonArray(selectedService.addOnsJson).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Add-ons</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseJsonArray(selectedService.addOnsJson).map((a) => (
                          <Badge key={a} variant="outline" className="text-[10px] h-5">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {parseJsonArray(selectedService.tagsJson).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseJsonArray(selectedService.tagsJson).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] h-5 bg-teal-50 text-teal-700">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <p>Created: {new Date(selectedService.createdAt).toLocaleDateString()}</p>
                    <p>Updated: {new Date(selectedService.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={() => { openEditDialog(selectedService); setShowDetailDialog(false); }}>
                  <Pencil className="size-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleToggleActive(selectedService)}>
                  {selectedService.isActive ? <><Eye className="size-3.5 mr-1" /> Deactivate</> : <><Zap className="size-3.5 mr-1" /> Activate</>}
                </Button>
                <Button variant="outline" size="sm" className="text-red-600" onClick={() => { handleDeleteService(selectedService.id); setShowDetailDialog(false); }}>
                  <Trash2 className="size-3.5 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
