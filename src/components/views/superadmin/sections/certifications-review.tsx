'use client';

/**
 * CertificationsReview
 * --------------------
 * SuperAdmin UI for reviewing, inspecting, and verifying provider trade licenses,
 * accreditations, and certifications across all marketplace tenants.
 */

import * as React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Search,
  Trash2,
  Building2,
  Calendar,
  RefreshCw,
  FileText,
  XCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

interface CertificationItem {
  id: string;
  tenantId: string | null;
  tenantName: string;
  tenantSlug: string | null;
  tenantCity: string | null;
  tenantState: string | null;
  tenantPhone: string | null;
  tenantEmail: string | null;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  certificateNumber: string | null;
  documentUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedById: string | null;
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = 'all' | 'pending' | 'verified';

export function CertificationsReview() {
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>('all');
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<CertificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const loadCertifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await authFetch(
        `/api/superadmin/marketplace/certifications?${params.toString()}`,
      );
      if (!res.ok) {
        toast.error('Failed to load certifications');
        return;
      }
      const data = await res.json();
      setItems(data.certifications || []);
    } catch {
      toast.error('Network error loading certifications');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadCertifications();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadCertifications]);

  async function handleVerify(cert: CertificationItem, action: 'verify' | 'unverify') {
    setActionLoading(cert.id);
    try {
      const res = await authFetch(
        `/api/superadmin/marketplace/certifications/${cert.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update certification');
        return;
      }
      toast.success(data.message || 'Updated successfully');
      setItems((prev) =>
        prev.map((c) =>
          c.id === cert.id
            ? { ...c, isVerified: action === 'verify', verifiedAt: action === 'verify' ? new Date().toISOString() : null }
            : c,
        ),
      );
    } catch {
      toast.error('Network error updating certification');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(cert: CertificationItem) {
    if (!confirm(`Permanently delete "${cert.name}"?`)) return;
    setActionLoading(cert.id);
    try {
      const res = await authFetch(
        `/api/superadmin/marketplace/certifications/${cert.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete' }),
        },
      );
      if (!res.ok) {
        toast.error('Failed to delete');
        return;
      }
      toast.success('Certification deleted.');
      setItems((prev) => prev.filter((c) => c.id !== cert.id));
    } catch {
      toast.error('Network error deleting certification');
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  }

  const pendingCount = items.filter((c) => !c.isVerified).length;
  const verifiedCount = items.filter((c) => c.isVerified).length;

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Award className="size-5 text-emerald-600" />
            Provider Certifications & Licenses
          </h2>
          <p className="text-xs text-muted-foreground">
            Inspect uploaded documents, verify license numbers, and grant verified marketplace badges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadCertifications}
            disabled={loading}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Controls: Search & Tabs */}
      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as FilterStatus)}
              className="w-full md:w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs">
                  All ({items.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs gap-1">
                  <Clock className="size-3 text-amber-500" />
                  Pending Review ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="verified" className="text-xs gap-1">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  Verified ({verifiedCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search cert, issuer, business..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certifications Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-6 animate-spin text-emerald-600" />
            Loading certifications...
          </div>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Award className="mx-auto size-10 text-muted-foreground/50 mb-2" />
          <h3 className="font-medium text-foreground">No certifications found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {statusFilter === 'pending'
              ? 'No provider certifications are currently pending review.'
              : 'No matching trade licenses or certifications.'}
          </p>
        </Card>
      ) : (
        <Card className="border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Business / Provider</TableHead>
                <TableHead className="text-xs font-semibold">Certification Name</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Issuer & Number</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">Valid Dates</TableHead>
                <TableHead className="text-xs font-semibold">Document / Proof</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cert) => (
                <TableRow key={cert.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium text-xs text-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                      {cert.tenantName}
                    </div>
                    {(cert.tenantCity || cert.tenantState) && (
                      <div className="text-[11px] text-muted-foreground ml-5">
                        {[cert.tenantCity, cert.tenantState].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-xs text-foreground">{cert.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Added {formatDate(cert.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-xs text-foreground">{cert.issuer || '—'}</div>
                    {cert.certificateNumber && (
                      <div className="text-[11px] font-mono text-muted-foreground">
                        #{cert.certificateNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    <div>{formatDate(cert.issueDate)} - {formatDate(cert.expiryDate)}</div>
                  </TableCell>
                  <TableCell>
                    {cert.documentUrl ? (
                      <a
                        href={cert.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/50"
                      >
                        <FileText className="size-3" />
                        Inspect Document
                        <ExternalLink className="size-2.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No document attached</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {cert.isVerified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1 text-[11px]">
                        <CheckCircle2 className="size-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 gap-1 text-[11px] bg-amber-50/50 dark:bg-amber-950/20">
                        <Clock className="size-3" /> Pending Review
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!cert.isVerified ? (
                        <Button
                          size="sm"
                          onClick={() => handleVerify(cert, 'verify')}
                          disabled={actionLoading === cert.id}
                          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1 text-white"
                        >
                          {actionLoading === cert.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          Approve & Verify
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(cert, 'unverify')}
                          disabled={actionLoading === cert.id}
                          className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-50 border-amber-300 gap-1"
                        >
                          {actionLoading === cert.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <XCircle className="size-3" />
                          )}
                          Unverify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(cert)}
                        disabled={actionLoading === cert.id}
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        title="Delete certification"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
