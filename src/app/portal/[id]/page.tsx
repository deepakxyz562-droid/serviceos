'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  User,
  Phone,
  FileText,
  Loader2,
  AlertCircle,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface PublicJobData {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  address?: string;
  scheduledAt?: string;
  customerName?: string;
  assigneeName?: string;
  lineItemsJson?: string;
  quotedAmount?: number;
  verificationPin?: string;
}

export default function CustomerPortalJobPage() {
  const params = useParams();
  const id = params?.id as string;

  const [job, setJob] = useState<PublicJobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/jobs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Job details not found');
        return res.json();
      })
      .then((data) => {
        setJob(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load tracking details');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-3 text-emerald-600 font-medium">
          <Loader2 className="size-6 animate-spin" />
          <span>Loading appointment tracking...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center space-y-4 shadow-xl">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Tracking Details Unavailable</h2>
          <p className="text-sm text-muted-foreground">
            We could not locate this appointment. Please contact your service provider for support.
          </p>
        </div>
      </div>
    );
  }

  const lineItems = (() => {
    try {
      return job.lineItemsJson ? JSON.parse(job.lineItemsJson) : [];
    } catch {
      return [];
    }
  })();

  const status = job?.status || 'pending';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const statusText = status.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
              F
            </div>
            <div>
              <h1 className="font-bold text-foreground">Fieseros Customer Portal</h1>
              <p className="text-xs text-muted-foreground">Live Job Tracking & Appointment Status</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            isCompleted
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : isInProgress
              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
          }`}>
            {statusText}
          </span>
        </div>

        {/* Status Hero Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-mono text-muted-foreground">Job #{job.jobNumber || job.id.slice(0, 8)}</span>
            <h2 className="text-2xl font-extrabold text-foreground mt-1">{job.title}</h2>
            {job.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{job.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            {job.assigneeName && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <User className="size-5 text-emerald-600" />
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Assigned Technician</p>
                  <p className="text-sm font-semibold text-foreground">{job.assigneeName}</p>
                </div>
              </div>
            )}

            {job.scheduledAt && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <Calendar className="size-5 text-blue-600" />
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Scheduled Time</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(job.scheduledAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Services & Invoice Summary */}
        {lineItems.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="size-4 text-emerald-600" />
              Service Line Items
            </h3>
            <div className="divide-y divide-border">
              {lineItems.map((item: { name: string; description?: string; unitPrice?: number; amount?: number }, idx: number) => (
                <div key={idx} className="py-3 flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <p className="text-sm font-mono font-bold text-foreground">
                    ${item.amount || item.unitPrice || 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
