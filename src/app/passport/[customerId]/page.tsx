'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Home,
  Wrench,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AssetHistory {
  serviceDate: string;
  serviceType: string | null;
  notes: string | null;
  performedByName: string | null;
}

interface Warranty {
  title: string;
  coverage: string;
  endDate: string | null;
}

interface Asset {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  installedAt: string | null;
  warrantyEnd: string | null;
  warrantyStatus: string;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  healthScore: 'healthy' | 'due_soon' | 'overdue' | 'critical';
  activeWarranties: Warranty[];
  recentHistory: AssetHistory[];
}

interface PassportData {
  customer: {
    name: string;
    address: string | null;
  };
  assets: Asset[];
  generatedAt: string;
}

export default function CustomerPassportPage() {
  const params = useParams();
  const customerId = params?.customerId as string;

  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;

    fetch(`/api/public/passport/${customerId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Passport data not found');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load passport');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [customerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center space-y-4 shadow-xl">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Service Passport Unavailable</h2>
          <p className="text-sm text-muted-foreground">
            We could not locate this service passport. Please contact your service provider.
          </p>
        </div>
      </div>
    );
  }

  const getHealthBadgeProps = (score: string) => {
    switch (score) {
      case 'healthy':
        return { label: '✓ Healthy', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'due_soon':
        return { label: '⏰ Due Soon', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'overdue':
        return { label: '⚠️ Overdue', classes: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'critical':
        return { label: '🔴 Needs Attention', classes: 'bg-red-50 text-red-700 border-red-200' };
      default:
        return { label: 'Unknown', classes: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl flex items-center justify-center font-bold text-xl text-white bg-emerald-600">
              F
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Fieseros</h1>
              <p className="text-sm text-muted-foreground">Service Passport</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Home className="size-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-foreground">{data.customer.name}</h2>
                {data.customer.address && (
                  <p className="text-sm text-muted-foreground">{data.customer.address}</p>
                )}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            Last updated: {formatDate(data.generatedAt)}
          </div>
        </div>

        <h3 className="text-lg font-extrabold text-foreground px-1">Your Equipment Health Summary</h3>

        {/* Assets List */}
        {data.assets.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
            <Wrench className="size-8 mx-auto text-muted-foreground/50" />
            <p className="text-base font-medium text-foreground">No equipment registered yet.</p>
            <p className="text-sm text-muted-foreground">
              Your service provider will add your equipment after their first visit.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.assets.map((asset) => {
              const badge = getHealthBadgeProps(asset.healthScore);
              
              return (
                <div key={asset.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 self-start">
                        <Wrench className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-foreground">{asset.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {[asset.brand, asset.model].filter(Boolean).join(' ') || 'Unknown model'}
                        </p>
                      </div>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border', badge.classes)}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span className="text-muted-foreground w-24">Last service:</span>
                      <span className="font-medium text-foreground">
                        {formatDate(asset.lastServiceDate) || 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-blue-600" />
                      <span className="text-muted-foreground w-24">Next service:</span>
                      <span className="font-medium text-foreground">
                        {formatDate(asset.nextServiceDate) || 'Schedule'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm sm:col-span-2">
                      <Shield className="size-4 text-purple-600" />
                      <span className="text-muted-foreground w-24">Warranty:</span>
                      <span className="font-medium text-foreground capitalize">
                        {asset.warrantyStatus}
                        {asset.warrantyEnd ? ` (until ${formatDate(asset.warrantyEnd)})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-border">
                    <a
                      href="tel:"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors"
                    >
                      Book Service
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
