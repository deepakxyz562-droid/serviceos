'use client';

/**
 * WarehousesTab — Manage storage locations, main shop, branch units, and technician service vans.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Warehouse as WarehouseIcon,
  Truck,
  Store,
  MapPin,
  CheckCircle2,
  MoreHorizontal,
  RotateCcw,
  Pencil,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authFetch, apiUrl } from '@/lib/api';
import type { Warehouse } from '../../types';

export function WarehousesTab() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'main' | 'branch' | 'vehicle'>('branch');
  const [address, setAddress] = useState('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(apiUrl('/api/inventory/warehouses'));
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load storage locations');
      }
      const data = await res.json();
      setWarehouses(data.warehouses || []);
      setEmployees(data.employees || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load storage locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleOpenAdd = () => {
    setEditingWarehouse(null);
    setName('');
    setCode('');
    setType('branch');
    setAddress('');
    setEmployeeId('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setName(w.name);
    setCode(w.code || '');
    setType((w.type as 'main' | 'branch' | 'vehicle') || 'branch');
    setAddress(w.address || '');
    setEmployeeId(w.employeeId || '');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Location name is required');
      return;
    }
    setSubmitting(true);
    try {
      const url = editingWarehouse
        ? apiUrl(`/api/inventory/warehouses/${editingWarehouse.id}`)
        : apiUrl('/api/inventory/warehouses');
      const method = editingWarehouse ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          type,
          address: address.trim() || undefined,
          employeeId: type === 'vehicle' && employeeId ? employeeId : undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save location');
      }

      toast.success(editingWarehouse ? 'Location updated' : 'Storage location created');
      setDialogOpen(false);
      fetchWarehouses();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (w: Warehouse) => {
    if (w.isDefault) {
      toast.error('Cannot deactivate the default Main Shop');
      return;
    }
    try {
      const res = await authFetch(apiUrl(`/api/inventory/warehouses/${w.id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to deactivate location');
      }
      toast.success(`Location "${w.name}" deactivated`);
      fetchWarehouses();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to deactivate location');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold">Storage Units & Service Vans</h3>
          <p className="text-xs text-muted-foreground">
            Track stock in physical shops, warehouses, or assigned technician vans.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="size-4 mr-1.5" /> Add Location / Van
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchWarehouses}>
                <RotateCcw className="size-4 mr-1.5" /> Retry
              </Button>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <WarehouseIcon className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">No storage locations found</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add your Main Shop or Service Vans to start tracking multi-location stock.
              </p>
              <Button
                onClick={handleOpenAdd}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="size-4 mr-1.5" /> Add Location
              </Button>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-24rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Location Name</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="w-32">Code</TableHead>
                    <TableHead>Assigned Vehicle / Technician</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.map((w) => {
                    const isVan = w.type === 'vehicle' || !!w.employeeId;
                    const isMain = w.isDefault || w.type === 'main';

                    return (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-1.5 rounded-md ${
                                isVan
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              }`}
                            >
                              {isVan ? (
                                <Truck className="size-4" />
                              ) : isMain ? (
                                <Store className="size-4" />
                              ) : (
                                <WarehouseIcon className="size-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2">
                                {w.name}
                                {isMain && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    Primary Shop
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm capitalize text-muted-foreground">
                          {w.type || 'branch'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {w.code || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {w.employee ? (
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                              <ShieldCheck className="size-3.5 text-blue-600" />
                              {w.employee.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[12rem]">
                          {w.address ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 text-muted-foreground shrink-0" />
                              {w.address}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              w.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {w.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleOpenEdit(w)}>
                                <Pencil className="size-3.5 mr-2" /> Edit Location
                              </DropdownMenuItem>
                              {!w.isDefault && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(w)}
                                    className="text-red-600 focus:text-red-700"
                                  >
                                    <Trash2 className="size-3.5 mr-2" /> Deactivate
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Edit Location' : 'New Storage Location'}
            </DialogTitle>
            <DialogDescription>
              Add a shop warehouse or assign a service vehicle van to a technician.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="loc-name">Location / Van Name *</Label>
              <Input
                id="loc-name"
                placeholder="e.g. Main Shop, North Warehouse, Van #4"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="loc-type">Location Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as 'main' | 'branch' | 'vehicle')}
                >
                  <SelectTrigger id="loc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main HQ / Shop</SelectItem>
                    <SelectItem value="branch">Branch Warehouse</SelectItem>
                    <SelectItem value="vehicle">Service Van / Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="loc-code">Short Code (optional)</Label>
                <Input
                  id="loc-code"
                  placeholder="e.g. HQ-01, VAN-4"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            {type === 'vehicle' && (
              <div className="grid gap-2">
                <Label htmlFor="loc-emp">Assigned Field Technician</Label>
                <Select
                  value={employeeId || 'none'}
                  onValueChange={(v) => setEmployeeId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger id="loc-emp">
                    <SelectValue placeholder="Select technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Unassigned --</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="loc-address">Physical Address / Notes</Label>
              <Input
                id="loc-address"
                placeholder="e.g. 100 Industrial Parkway, Bay 4"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? 'Saving...' : editingWarehouse ? 'Update' : 'Create Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
