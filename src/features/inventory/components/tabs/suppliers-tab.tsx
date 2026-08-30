'use client';

/**
 * SuppliersTab — supplier directory table + "Add Supplier" button.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 *
 * Pure presentational component. The suppliers list + loading state are owned
 * by the parent. The "Add Supplier" button calls `onAddSupplier` to open the
 * SupplierFormDialog (owned by the parent).
 */

import { Plus, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Supplier } from '../../types';

export function SuppliersTab({
  suppliers,
  suppliersLoading,
  onAddSupplier,
}: {
  suppliers: Supplier[];
  suppliersLoading: boolean;
  onAddSupplier: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={onAddSupplier}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="size-4 mr-1.5" /> Add Supplier
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {suppliersLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-muted">
                <Truck className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold">No suppliers yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add a vendor to start creating purchase orders.
              </p>
              <Button
                onClick={onAddSupplier}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="size-4 mr-1.5" /> Add Supplier
              </Button>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-24rem)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Name</TableHead>
                    <TableHead className="w-36">Contact</TableHead>
                    <TableHead className="w-40">Phone</TableHead>
                    <TableHead className="w-32">Payment Terms</TableHead>
                    <TableHead className="w-20">Currency</TableHead>
                    <TableHead className="w-20">Items</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{s.name}</span>
                          {s.contactName && (
                            <span className="text-xs text-muted-foreground">{s.contactName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[10rem]">
                        {s.email || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.phone || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.paymentTerms || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.currency}</TableCell>
                      <TableCell className="text-sm tabular-nums">{s._count?.items ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={s.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'}
                        >
                          {s.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
