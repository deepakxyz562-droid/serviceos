'use client';

/**
 * RouteOptimizerDialog — Multi-stop daily route optimization for technicians.
 */

import { useState } from 'react';
import {
  Zap,
  Clock,
  Navigation,
  ArrowRight,
  TrendingDown,
  DollarSign,
  MapPin,
  CheckCircle,
  Calendar,
  AlertCircle,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authFetch } from '@/lib/client-auth';
import type { Employee } from '../types';
import type { OptimizationResult } from '@/lib/route-optimizer';

export function RouteOptimizerDialog({
  open,
  employees,
  initialEmployeeId,
  onClose,
  onOptimized,
}: {
  open: boolean;
  employees: Employee[];
  initialEmployeeId?: string | null;
  onClose: () => void;
  onOptimized?: () => void;
}) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || (employees[0]?.id ?? ''));
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = async () => {
    if (!selectedEmpId) {
      toast.error('Please select a technician');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await authFetch('/api/dispatch/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          applyImmediately: false,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Optimization calculation failed');
      }

      const data = await res.json();
      if (!data.optimizedStops || data.optimizedStops.length === 0) {
        toast.info(data.message || 'No scheduled jobs found for today');
        return;
      }

      setResult(data);
      toast.success(`Route optimized! Potential savings: ${data.timeSavedMinutes} mins (${data.distanceSavedKm} km)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to optimize route');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedEmpId || !result) return;
    setApplying(true);
    try {
      const res = await authFetch('/api/dispatch/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          applyImmediately: true,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to apply schedule');
      }

      toast.success('Optimized route applied to dispatch schedule!');
      onOptimized?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to apply route');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-amber-500 fill-amber-500" />
            Daily Route Optimization
          </DialogTitle>
          <DialogDescription>
            Re-sequence multi-stop technician schedules with 2-opt TSP optimization to minimize drive time and fuel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-end p-3.5 bg-muted/40 rounded-xl border">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <User className="size-3.5" /> Technician
              </label>
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleOptimize}
              disabled={loading || !selectedEmpId}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <Zap className="size-4 mr-1.5" />
              {loading ? 'Calculating...' : 'Calculate Optimal Route'}
            </Button>
          </div>

          {/* Results Summary Cards */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                  <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1">
                    <Clock className="size-3.5" /> Time Saved
                  </div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {result.timeSavedMinutes} <span className="text-xs font-normal">mins</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-[11px] font-medium text-blue-800 dark:text-blue-300 flex items-center justify-center gap-1">
                    <Navigation className="size-3.5" /> Distance Saved
                  </div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                    {result.distanceSavedKm} <span className="text-xs font-normal">km</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                  <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
                    <TrendingDown className="size-3.5" /> Efficiency Gain
                  </div>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                    +{result.percentageSaved}%
                  </div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
                  <div className="text-[11px] font-medium text-purple-800 dark:text-purple-300 flex items-center justify-center gap-1">
                    <DollarSign className="size-3.5" /> Fuel Savings
                  </div>
                  <div className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-0.5">
                    ${result.estimatedFuelSavingsUsd}
                  </div>
                </div>
              </div>

              {/* Stop Timeline Sequence */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Optimized Stop Sequence ({result.timeline.length} stops)</span>
                  <span className="text-emerald-600 font-medium">Total: {result.optimizedDistanceKm} km (~{result.optimizedDriveMinutes}m drive)</span>
                </div>

                <div className="space-y-2 border rounded-xl p-3 bg-card divide-y">
                  {result.timeline.map((stop, idx) => {
                    const arrivalFormatted = new Date(stop.estimatedArrival).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const departureFormatted = new Date(stop.estimatedDeparture).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={stop.stopId} className="flex items-start justify-between py-2.5 first:pt-1 last:pb-1">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center size-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                            {stop.sequence}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{stop.title}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="size-3" />
                              {result.optimizedStops[idx]?.address || 'Job Site'}
                            </div>
                            {stop.driveMinutesFromPrevious > 0 && (
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium flex items-center gap-1">
                                <Navigation className="size-3" />
                                {stop.driveMinutesFromPrevious}m drive ({stop.distanceKmFromPrevious} km from prev stop)
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="font-mono text-xs">
                            {arrivalFormatted} – {departureFormatted}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={applying}>
            Cancel
          </Button>
          {result && (
            <Button
              onClick={handleApply}
              disabled={applying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="size-4 mr-1.5" />
              {applying ? 'Applying Schedule...' : 'Apply Optimized Schedule'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
