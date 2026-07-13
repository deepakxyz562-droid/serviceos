'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Plus, Search, ChevronRight, ChevronDown, FileText,
  AlertCircle, Loader2, X, ClipboardPaste, UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContactImport {
  id: string;
  fileName: string;
  source: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  status: string;
  errorJson: string | null;
  mappingJson: string | null;
  autoGroupId: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ParsedRow {
  [key: string]: string;
}

interface ManualEntry {
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  country: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CSV_FIELDS = ['name', 'email', 'phone', 'company', 'city', 'country'] as const;
type CsvField = typeof CSV_FIELDS[number];

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  processing: { label: 'Processing', className: 'bg-teal-500/10 text-teal-700 border-teal-500/30' },
  completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  failed: { label: 'Failed', className: 'bg-rose-500/10 text-rose-700 border-rose-500/30' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  // simple split (no quoted-comma handling for v1)
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cells = line.split(',');
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
  return { headers, rows };
}

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

// ─── Component ──────────────────────────────────────────────────────────────

export function ContactImportsView() {
  const [imports, setImports] = useState<ContactImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');

  // CSV paste state
  const [csvText, setCsvText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [csvAutoGroupId, setCsvAutoGroupId] = useState<string>('none');
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  // Manual entry state
  const [manualRows, setManualRows] = useState<ManualEntry[]>([
    { name: '', email: '', phone: '', company: '', city: '', country: '' },
  ]);
  const [manualAutoGroupId, setManualAutoGroupId] = useState<string>('none');

  const PAGE_SIZE = 10;

  // ── Load imports ──
  const loadImports = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contact-imports?page=${p}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const result = await res.json();
        setImports(result.data || []);
        setTotal(result.pagination?.total ?? (result.data || []).length);
        setTotalPages(result.pagination?.totalPages ?? 1);
        setPage(p);
      } else {
        setError('Failed to load imports');
        toast.error('Failed to load imports');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading imports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadImports(1); }, [loadImports]);

  // Load groups for the auto-group selector
  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch('/api/groups?limit=100');
        if (res.ok) {
          const result = await res.json();
          setGroups((result.data || []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })));
        }
      } catch {
        // silent
      }
    }
    loadGroups();
  }, []);

  // Parse CSV on change
  useEffect(() => {
    if (!csvText.trim()) {
      setParsedHeaders([]);
      setParsedRows([]);
      setFieldMapping({});
      return;
    }
    const { headers, rows } = parseCsv(csvText);
    setParsedHeaders(headers);
    setParsedRows(rows);
    // auto-detect mapping
    const autoMap: Record<string, string> = {};
    headers.forEach(h => {
      const lower = h.toLowerCase();
      const match = CSV_FIELDS.find(f => lower === f || lower.includes(f));
      if (match) autoMap[h] = match;
    });
    setFieldMapping(autoMap);
  }, [csvText]);

  const filteredImports = imports.filter(im =>
    im.fileName.toLowerCase().includes(search.toLowerCase()) ||
    im.source.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setCsvText('');
    setParsedHeaders([]);
    setParsedRows([]);
    setFieldMapping({});
    setCsvAutoGroupId('none');
    setManualRows([{ name: '', email: '', phone: '', company: '', city: '', country: '' }]);
    setManualAutoGroupId('none');
    setShowCreateDialog(true);
  };

  const buildContactsFromCsv = () => {
    return parsedRows.map(row => {
      const obj: { name: string; email?: string; phone?: string; company?: string; city?: string; country?: string } = {
        name: '',
      };
      Object.entries(fieldMapping).forEach(([header, field]) => {
        if (!field || field === 'skip') return;
        const val = row[header] ?? '';
        if (field === 'name') obj.name = val;
        else if (field === 'email' && val) obj.email = val;
        else if (field === 'phone' && val) obj.phone = val;
        else if (field === 'company' && val) obj.company = val;
        else if (field === 'city' && val) obj.city = val;
        else if (field === 'country' && val) obj.country = val;
      });
      return obj;
    }).filter(c => c.name.trim());
  };

  const handleImportCsv = async () => {
    const contacts = buildContactsFromCsv();
    if (contacts.length === 0) {
      toast.error('No valid contacts to import. Check your CSV & field mapping.');
      return;
    }
    if (!fieldMappingHasName()) {
      toast.error('Please map at least one column to the "name" field.');
      return;
    }
    setImporting(true);
    try {
      const payload = {
        fileName: `CSV Import ${new Date().toLocaleString()}`,
        source: 'csv',
        totalRows: contacts.length,
        mappingJson: JSON.stringify(fieldMapping),
        autoGroupId: csvAutoGroupId === 'none' ? undefined : csvAutoGroupId,
        contacts,
      };
      const res = await fetch('/api/contact-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        const data: ContactImport = result.data ?? result;
        toast.success(`Imported ${data.importedCount ?? contacts.length} contact(s)`);
        setShowCreateDialog(false);
        await loadImports(1);
      } else {
        const errText = await res.text().catch(() => '');
        toast.error(`Import failed${errText ? `: ${errText}` : ''}`);
      }
    } catch {
      toast.error('Network error during import');
    } finally {
      setImporting(false);
    }
  };

  const handleImportManual = async () => {
    const valid = manualRows.filter(r => r.name.trim());
    if (valid.length === 0) {
      toast.error('Add at least one contact with a name');
      return;
    }
    setImporting(true);
    try {
      const contacts = valid.map(r => {
        const o: { name: string; email?: string; phone?: string; company?: string; city?: string; country?: string } = { name: r.name.trim() };
        if (r.email.trim()) o.email = r.email.trim();
        if (r.phone.trim()) o.phone = r.phone.trim();
        if (r.company.trim()) o.company = r.company.trim();
        if (r.city.trim()) o.city = r.city.trim();
        if (r.country.trim()) o.country = r.country.trim();
        return o;
      });
      const payload = {
        fileName: `Manual Entry ${new Date().toLocaleString()}`,
        source: 'manual',
        totalRows: contacts.length,
        autoGroupId: manualAutoGroupId === 'none' ? undefined : manualAutoGroupId,
        contacts,
      };
      const res = await fetch('/api/contact-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        const data: ContactImport = result.data ?? result;
        toast.success(`Imported ${data.importedCount ?? contacts.length} contact(s)`);
        setShowCreateDialog(false);
        await loadImports(1);
      } else {
        toast.error('Import failed');
      }
    } catch {
      toast.error('Network error during import');
    } finally {
      setImporting(false);
    }
  };

  const fieldMappingHasName = () => Object.values(fieldMapping).includes('name');

  const updateManualRow = (idx: number, field: keyof ManualEntry, value: string) => {
    setManualRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addManualRow = () => {
    if (manualRows.length >= 5) {
      toast.error('Maximum 5 manual entries at a time');
      return;
    }
    setManualRows(prev => [...prev, { name: '', email: '', phone: '', company: '', city: '', country: '' }]);
  };

  const removeManualRow = (idx: number) => {
    setManualRows(prev => prev.filter((_, i) => i !== idx));
  };

  const parseErrorJson = (json: string | null): { row?: number; message: string }[] => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') return [{ message: parsed }];
      return [];
    } catch {
      return [];
    }
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
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Upload className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load imports</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => loadImports(1)}>
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
            <Upload className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Contact Imports</h2>
            <p className="text-sm text-muted-foreground">Bulk import contacts via CSV or manual entry</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" /> New Import
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search imports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {filteredImports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Upload className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No imports yet</p>
          <p className="text-sm mt-1">Import contacts via CSV paste or manual entry</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
            <Plus className="size-4 mr-1.5" /> New Import
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>File</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Imported</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredImports.map(im => {
                    const isExpanded = expandedId === im.id;
                    const errors = parseErrorJson(im.errorJson);
                    const style = STATUS_STYLES[im.status] || STATUS_STYLES.pending;
                    return (
                      <>
                        <TableRow
                          key={im.id}
                          className={cn('cursor-pointer hover:bg-muted/50', isExpanded && 'bg-muted/30')}
                          onClick={() => setExpandedId(isExpanded ? null : im.id)}
                        >
                          <TableCell>
                            {errors.length > 0 || im.errorJson ? (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                              </button>
                            ) : (
                              <span className="size-4 inline-block" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="size-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{im.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{im.source}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px]', style.className)}>
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-700">{im.importedCount}</TableCell>
                          <TableCell className="text-right text-amber-700">{im.skippedCount}</TableCell>
                          <TableCell className="text-right text-rose-700">{im.errorCount}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(im.createdAt)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(im.completedAt)}</TableCell>
                        </TableRow>
                        {isExpanded && (errors.length > 0 || im.errorJson) && (
                          <TableRow key={`${im.id}-detail`} className="bg-rose-500/5">
                            <TableCell colSpan={9} className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                                  <AlertCircle className="size-4" />
                                  Error Details ({errors.length} item(s))
                                </div>
                                <ScrollArea className="max-h-48">
                                  <div className="space-y-1.5">
                                    {errors.length === 0 ? (
                                      <p className="text-xs text-muted-foreground font-mono">{im.errorJson}</p>
                                    ) : errors.map((err, i) => (
                                      <div key={i} className="text-xs flex items-start gap-2 font-mono bg-rose-500/5 rounded px-2 py-1.5">
                                        <span className="text-rose-600">#{err.row ?? i + 1}</span>
                                        <span className="text-rose-800">{err.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {total} total record(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => loadImports(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => loadImports(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Import Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>New Import</DialogTitle>
            <DialogDescription>
              Paste CSV content or enter contacts manually.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'csv' | 'manual')} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv"><ClipboardPaste className="size-3.5 mr-1.5" /> Paste CSV</TabsTrigger>
              <TabsTrigger value="manual"><UserPlus className="size-3.5 mr-1.5" /> Manual Entry</TabsTrigger>
            </TabsList>

            {/* CSV Tab */}
            <TabsContent value="csv" className="flex-1 overflow-y-auto space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="csv-text">CSV Content</Label>
                <Textarea
                  id="csv-text"
                  placeholder={'name,email,phone,company,city,country\nJohn Doe,john@example.com,+1234567890,Acme,New York,US'}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  First row should be headers. Split by comma. Quoted commas not supported in v1.
                </p>
              </div>

              {parsedRows.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Field Mapping</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {parsedHeaders.map(h => (
                        <div key={h} className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1">{h}</span>
                          <span className="text-muted-foreground">→</span>
                          <Select
                            value={fieldMapping[h] || 'skip'}
                            onValueChange={(v) => setFieldMapping(prev => ({ ...prev, [h]: v }))}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip</SelectItem>
                              {CSV_FIELDS.map(f => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Group (optional)</Label>
                    <Select value={csvAutoGroupId} onValueChange={setCsvAutoGroupId}>
                      <SelectTrigger><SelectValue placeholder="No group" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No group</SelectItem>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preview (first 5 rows)</Label>
                    <div className="rounded-md border overflow-hidden">
                      <div className="max-h-40 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {parsedHeaders.map(h => (
                                <TableHead key={h} className="text-xs">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedRows.slice(0, 5).map((r, i) => (
                              <TableRow key={i}>
                                {parsedHeaders.map(h => (
                                  <TableCell key={h} className="text-xs">{r[h]}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {parsedRows.length} row(s) parsed • {buildContactsFromCsv().length} valid contact(s) after mapping
                    </p>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Manual Tab */}
            <TabsContent value="manual" className="flex-1 overflow-y-auto space-y-3 mt-2">
              <div className="space-y-2">
                <Label>Target Group (optional)</Label>
                <Select value={manualAutoGroupId} onValueChange={setManualAutoGroupId}>
                  <SelectTrigger><SelectValue placeholder="No group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No group</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              {manualRows.map((row, idx) => (
                <div key={idx} className="space-y-2 rounded-md border p-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Contact #{idx + 1}</span>
                    {manualRows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-rose-600"
                        onClick={() => removeManualRow(idx)}
                        aria-label="Remove row"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Name *</Label>
                      <Input value={row.name} onChange={(e) => updateManualRow(idx, 'name', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Email</Label>
                      <Input type="email" value={row.email} onChange={(e) => updateManualRow(idx, 'email', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Phone</Label>
                      <Input value={row.phone} onChange={(e) => updateManualRow(idx, 'phone', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Company</Label>
                      <Input value={row.company} onChange={(e) => updateManualRow(idx, 'company', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">City</Label>
                      <Input value={row.city} onChange={(e) => updateManualRow(idx, 'city', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Country</Label>
                      <Input value={row.country} onChange={(e) => updateManualRow(idx, 'country', e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addManualRow} className="w-full">
                <Plus className="size-3.5 mr-1.5" /> Add Another Contact (max 5)
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={importing}>
              Cancel
            </Button>
            {activeTab === 'csv' ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleImportCsv}
                disabled={importing || parsedRows.length === 0}
              >
                {importing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Upload className="size-4 mr-1.5" />}
                Import {buildContactsFromCsv().length > 0 ? `(${buildContactsFromCsv().length})` : ''}
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleImportManual}
                disabled={importing}
              >
                {importing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Upload className="size-4 mr-1.5" />}
                Import {manualRows.filter(r => r.name.trim()).length > 0 ? `(${manualRows.filter(r => r.name.trim()).length})` : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
