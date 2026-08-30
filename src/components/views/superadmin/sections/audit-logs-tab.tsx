'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AuditLogsTab — platform audit log viewer with action + tenant filters.
//
// Extracted from `superadmin-view.tsx` so it's a stable module-level component
// — no more unmount/remount on parent re-render. All data + handlers arrive
// via props (the parent's `tenants` list drives the tenant-filter dropdown).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Search, RefreshCw, FileText } from 'lucide-react';

import { formatDateTime } from '@/components/views/superadmin/_shared';
import type { AuditLog, Tenant } from '@/components/views/superadmin/types';

export interface AuditLogsTabProps {
  /** Tenants list — used only to populate the tenant-filter dropdown. */
  tenants: Tenant[];
}

export function AuditLogsTab({ tenants }: AuditLogsTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (tenantFilter && tenantFilter !== 'all') params.set('tenantId', tenantFilter);
      const res = await fetch(`/api/superadmin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, tenantFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Filter by action (e.g. login, update, delete)..." value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        </div>
        <Select value={tenantFilter || 'all'} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Tenants" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="shrink-0">
          <RefreshCw className="size-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <DataTable
        columns={auditLogColumns}
        data={logs}
        rowKey={(log) => log.id}
        loading={loading}
        emptyMessage="No audit logs found"
        emptyIcon={FileText}
        className="max-h-[calc(100vh-320px)]"
      />
    </div>
  );
}

const auditLogColumns: Column<AuditLog>[] = [
  {
    key: 'action', header: 'Action', render: (log) => (
      <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
        {log.action}
      </Badge>
    ),
  },
  {
    key: 'resource', header: 'Resource', render: (log) => (
      <span className="text-foreground text-sm">
        {log.resourceType ? `${log.resourceType}${log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}` : '—'}
      </span>
    ),
  },
  { key: 'user', header: 'User', render: (log) => <span className="text-muted-foreground text-xs font-mono">{log.userId ? log.userId.slice(0, 8) + '…' : '—'}</span> },
  { key: 'tenant', header: 'Tenant', render: (log) => <span className="text-muted-foreground text-xs font-mono">{log.tenantId ? log.tenantId.slice(0, 8) + '…' : '—'}</span> },
  { key: 'ip', header: 'IP', render: (log) => <span className="text-muted-foreground text-xs font-mono">{log.ip || '—'}</span> },
  { key: 'when', header: 'When', render: (log) => <span className="text-muted-foreground text-xs">{formatDateTime(log.createdAt)}</span> },
];
