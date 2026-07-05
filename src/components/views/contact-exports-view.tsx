'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Download, Plus, Search, FileText, FileSpreadsheet, FileJson,
  Loader2, X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContactExport {
  id: string;
  format: string;
  filterJson: string | null;
  totalExported: number;
  createdAt: string;
}

interface ContactLite {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  source?: string | null;
  status?: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FORMATS = [
  { value: 'csv', label: 'CSV', icon: FileText },
  { value: 'xlsx', label: 'XLSX', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON', icon: FileJson },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function prettyPrintFilter(json: string | null): string {
  if (!json) return 'No filter';
  try {
    const parsed = JSON.parse(json);
    if (Object.keys(parsed).length === 0) return 'No filter';
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

function escapeCsv(value: string): string {
  if (value == null) return '';
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ContactExportsView() {
  const [exports, setExports] = useState<ContactExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [formFormat, setFormFormat] = useState('csv');
  const [formFilter, setFormFilter] = useState('{}');
  const [formTotal, setFormTotal] = useState('');

  const PAGE_SIZE = 10;

  // ── Load exports ──
  const loadExports = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contact-exports?page=${p}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const result = await res.json();
        setExports(result.data || []);
        setTotal(result.pagination?.total ?? (result.data || []).length);
        setTotalPages(result.pagination?.totalPages ?? 1);
        setPage(p);
      } else {
        setError('Failed to load exports');
        toast.error('Failed to load exports');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading exports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadExports(1); }, [loadExports]);

  const filteredExports = exports.filter(ex =>
    ex.format.toLowerCase().includes(search.toLowerCase()) ||
    (ex.filterJson ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setFormFormat('csv');
    setFormFilter('{}');
    setFormTotal('');
    setShowCreateDialog(true);
  };

  const parseFilterJson = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(formFilter || '{}');
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        toast.error('Filter JSON must be a JSON object');
        return null;
      }
      return parsed as Record<string, unknown>;
    } catch {
      toast.error('Invalid JSON in filter');
      return null;
    }
  };

  const buildQueryFromFilter = (filter: Record<string, unknown>): string => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    params.set('limit', '5000');
    return params.toString();
  };

  const generateCsv = (contacts: ContactLite[]): string => {
    const headers = ['name', 'email', 'phone', 'company', 'city', 'state', 'country', 'zip', 'source', 'status'];
    const rows = contacts.map(c => [
      c.name || '',
      c.email || '',
      c.phone || '',
      c.company || '',
      c.city || '',
      c.state || '',
      c.country || '',
      c.zip || '',
      c.source || '',
      c.status || '',
    ].map(escapeCsv).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const handleExport = async () => {
    const filter = parseFilterJson();
    if (!filter) return;
    const totalNum = formTotal.trim() ? parseInt(formTotal, 10) : 0;
    if (formTotal.trim() && (isNaN(totalNum) || totalNum < 0)) {
      toast.error('Total Exported must be a non-negative number');
      return;
    }

    setExporting(true);
    try {
      // 1. Fetch filtered contacts
      const query = buildQueryFromFilter(filter);
      const contactRes = await fetch(`/api/contacts?${query}`);
      let contacts: ContactLite[] = [];
      if (contactRes.ok) {
        const result = await contactRes.json();
        contacts = Array.isArray(result) ? result : (result.data || []);
      } else {
        toast.error('Failed to fetch contacts for export');
        return;
      }

      // 2. Generate & download file (CSV always; xlsx/json supported formats but
      // we only do CSV client-side generation in v1)
      const finalTotal = totalNum || contacts.length;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const filename = `contacts-export-${stamp}`;

      if (formFormat === 'json') {
        downloadBlob(JSON.stringify(contacts, null, 2), 'application/json', `${filename}.json`);
      } else if (formFormat === 'xlsx') {
        // For xlsx, we still produce a CSV download with .xls extension (Excel opens it)
        downloadCsv(generateCsv(contacts), `${filename}.xls`);
      } else {
        downloadCsv(generateCsv(contacts), `${filename}.csv`);
      }

      // 3. Record the export on the server
      const payload = {
        format: formFormat,
        filterJson: JSON.stringify(filter),
        totalExported: finalTotal,
      };
      const res = await fetch('/api/contact-exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        const data: ContactExport = result.data ?? result;
        setExports(prev => [data, ...prev]);
        toast.success(`Exported ${finalTotal} contact(s)`);
        setShowCreateDialog(false);
      } else {
        // File was downloaded already; just warn about the log not being saved
        toast.warning('File downloaded, but failed to log the export');
      }
    } catch {
      toast.error('Network error during export');
    } finally {
      setExporting(false);
    }
  };

  const downloadCsv = (content: string, filename: string) => {
    // Prepend BOM so Excel opens UTF-8 correctly
    downloadBlob(`\uFEFF${content}`, 'text/csv;charset=utf-8;', filename);
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-44 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Card className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Download className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load exports</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => loadExports(1)}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Download className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Contact Exports</h2>
            <p className="text-sm text-muted-foreground">Download &amp; log contact exports</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" /> New Export
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search exports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {filteredExports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Download className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No exports yet</p>
          <p className="text-sm mt-1">Create your first contact export</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
            <Plus className="size-4 mr-1.5" /> New Export
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[65vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Format</TableHead>
                    <TableHead>Filter</TableHead>
                    <TableHead className="text-right">Exported</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExports.map(ex => {
                    const fmt = FORMATS.find(f => f.value === ex.format);
                    const Icon = fmt?.icon || FileText;
                    return (
                      <TableRow key={ex.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-emerald-600" />
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {ex.format}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap max-h-12 overflow-hidden">
                            {prettyPrintFilter(ex.filterJson)}
                          </pre>
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-700">
                          {ex.totalExported}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(ex.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{total} total record(s)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadExports(page - 1)}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadExports(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Export Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Export</DialogTitle>
            <DialogDescription>
              Export current contacts matching a filter as a downloadable file.
              The export will be logged on the server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={formFormat} onValueChange={setFormFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map(f => {
                    const Icon = f.icon;
                    return (
                      <SelectItem key={f.value} value={f.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-3.5" />
                          {f.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                CSV &amp; XLSX produce a spreadsheet download; JSON produces a JSON array.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-filter">Filter (JSON)</Label>
              <Textarea
                id="ex-filter"
                placeholder='{"status":"active","country":"US"}'
                value={formFilter}
                onChange={(e) => setFormFilter(e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Supported keys: search, groupId, tagId, status, source, country, city.
                Use <code>{'{}'}</code> to export all.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-total">Total Exported (optional)</Label>
              <Input
                id="ex-total"
                type="number"
                min="0"
                placeholder="Auto-detect from fetched results"
                value={formTotal}
                onChange={(e) => setFormTotal(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Override the recorded count if you want to log a different number than what was fetched.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={exporting}>
              <X className="size-4 mr-1.5" /> Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Download className="size-4 mr-1.5" />}
              Export &amp; Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
