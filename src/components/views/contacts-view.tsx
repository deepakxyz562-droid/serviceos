'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Contact, Upload, Download, Plus, Search, Filter, Edit, Trash2,
  MoreVertical, FileSpreadsheet, CheckCircle2, AlertCircle, X,
  Loader2, Mail, Phone, Building2, Tag, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImportStats {
  total: number;
  imported: number;
  duplicates: number;
  skipped: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formTags, setFormTags] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState<string>('csv');

  // ─── Fetch contacts ─────────────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
        // Extract unique tags
        const tagSet = new Set<string>();
        data.forEach((c: Contact) => {
          if (c.tags) {
            c.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(tagSet.add, tagSet);
          }
        });
        setAllTags(Array.from(tagSet).sort());
      }
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ─── Filtered contacts ──────────────────────────────────────────────────

  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !(c.email || '').toLowerCase().includes(q) && !(c.phone || '').toLowerCase().includes(q) && !(c.company || '').toLowerCase().includes(q)) {
      return false;
    }
    if (tagFilter !== 'all') {
      const contactTags = (c.tags || '').split(',').map(t => t.trim());
      if (!contactTags.includes(tagFilter)) return false;
    }
    return true;
  });

  // ─── Add/Edit contact ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        company: formCompany.trim() || null,
        tags: formTags.trim() || null,
      };

      const url = editingContact ? `/api/contacts?id=${editingContact.id}` : '/api/contacts';
      const method = editingContact ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingContact ? 'Contact updated' : 'Contact created');
        resetForm();
        fetchContacts();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save contact');
      }
    } catch {
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompany('');
    setFormTags('');
    setEditingContact(null);
    setAddDialogOpen(false);
    setEditDialogOpen(false);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormEmail(contact.email || '');
    setFormPhone(contact.phone || '');
    setFormCompany(contact.company || '');
    setFormTags(contact.tags || '');
    setEditDialogOpen(true);
  };

  // ─── Delete contact ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/contacts?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Contact deleted');
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchContacts();
      } else {
        toast.error('Failed to delete contact');
      }
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })));
      toast.success(`${ids.length} contacts deleted`);
      setSelectedIds(new Set());
      fetchContacts();
    } catch {
      toast.error('Failed to delete contacts');
    }
  };

  // ─── Import ─────────────────────────────────────────────────────────────

  const CONTACT_FIELDS = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'company', label: 'Company' },
    { key: 'tags', label: 'Tags' },
  ];

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportStats(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error('No data found in CSV file');
        return;
      }
      const headers = Object.keys(rows[0]);
      setImportHeaders(headers);
      setImportPreview(rows.slice(0, 10));
      // Auto-map fields
      const mapping: Record<string, string> = {};
      headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('name') || lower === 'full name' || lower === 'first name') mapping[h] = 'name';
        else if (lower.includes('email') || lower === 'e-mail') mapping[h] = 'email';
        else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) mapping[h] = 'phone';
        else if (lower.includes('company') || lower.includes('organization') || lower.includes('org')) mapping[h] = 'company';
        else if (lower.includes('tag') || lower.includes('label') || lower.includes('category')) mapping[h] = 'tags';
        else mapping[h] = '_skip';
      });
      setFieldMapping(mapping);
    } else {
      // For xlsx/xls, send to API for parsing
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/contacts/import?preview=true', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          setImportHeaders(data.headers || []);
          setImportPreview(data.preview || []);
          setFieldMapping(data.mapping || {});
        } else {
          toast.error('Failed to parse file. Please use CSV format.');
        }
      } catch {
        toast.error('Failed to parse file');
      }
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    try {
      // For CSV, map fields on client side and send JSON
      const ext = importFile?.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        const text = await importFile!.text();
        const allRows = parseCSV(text);
        const mappedContacts = allRows.map(row => {
          const contact: Record<string, string | null> = {};
          CONTACT_FIELDS.forEach(f => {
            const sourceHeader = Object.entries(fieldMapping).find(([, target]) => target === f.key)?.[0];
            contact[f.key] = sourceHeader ? (row[sourceHeader] || null) : null;
          });
          return contact;
        }).filter(c => c.name);

        const res = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: mappedContacts }),
        });
        if (res.ok) {
          const stats = await res.json();
          setImportStats(stats);
          toast.success(`Imported ${stats.imported} contacts`);
          fetchContacts();
        } else {
          toast.error('Import failed');
        }
      } else {
        const formData = new FormData();
        if (importFile) formData.append('file', importFile);
        formData.append('mapping', JSON.stringify(fieldMapping));
        const res = await fetch('/api/contacts/import', { method: 'POST', body: formData });
        if (res.ok) {
          const stats = await res.json();
          setImportStats(stats);
          toast.success(`Imported ${stats.imported} contacts`);
          fetchContacts();
        } else {
          toast.error('Import failed');
        }
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('format', exportFormat);
      if (selectedIds.size > 0) {
        params.set('ids', Array.from(selectedIds).join(','));
      }
      if (tagFilter !== 'all') {
        params.set('tag', tagFilter);
      }
      const res = await fetch(`/api/contacts/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contacts.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export complete');
        setExportDialogOpen(false);
      } else {
        toast.error('Export failed');
      }
    } catch {
      toast.error('Export failed');
    }
  };

  // ─── Selection ──────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  // ─── Format date ────────────────────────────────────────────────────────

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Contact className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Contacts</h2>
            <p className="text-sm text-muted-foreground">Manage your contacts with import & export</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}><Upload className="size-4 mr-1.5" /> Import</Button>
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}><Download className="size-4 mr-1.5" /> Export</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setAddDialogOpen(true); }}><Plus className="size-4 mr-1.5" /> Add Contact</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Contact className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Mail className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.filter(c => c.email).length}</p>
                <p className="text-xs text-muted-foreground">With Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Phone className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.filter(c => c.phone).length}</p>
                <p className="text-xs text-muted-foreground">With Phone</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Tag className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allTags.length}</p>
                <p className="text-xs text-muted-foreground">Tags</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Tags" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="size-3 mr-1" /> Delete ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Contact className="size-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">{searchQuery || tagFilter !== 'all' ? 'No matching contacts' : 'No contacts yet'}</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchQuery || tagFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Add contacts manually or import from a CSV/XLSX file to get started.'}
              </p>
              {!searchQuery && tagFilter === 'all' && (
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { resetForm(); setAddDialogOpen(true); }}><Plus className="size-4 mr-1.5" /> Add Contact</Button>
                  <Button variant="outline" onClick={() => setImportDialogOpen(true)}><Upload className="size-4 mr-1.5" /> Import</Button>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map(contact => (
                    <TableRow key={contact.id} className={cn(selectedIds.has(contact.id) && 'bg-emerald-50 dark:bg-emerald-900/10')}>
                      <TableCell><Checkbox checked={selectedIds.has(contact.id)} onCheckedChange={() => toggleSelect(contact.id)} /></TableCell>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.email || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.phone || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.company || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(contact.tags || '').split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(contact.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(contact)}><Edit className="size-3 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => { setDeleteTarget(contact); setDeleteDialogOpen(true); }}><Trash2 className="size-3 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ─── Add Contact Dialog ──────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Create a new contact manually</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Full name" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+1 555-0100" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input placeholder="Company name" value={formCompany} onChange={e => setFormCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input placeholder="Comma separated: VIP, Client, Lead" value={formTags} onChange={e => setFormTags(e.target.value)} />
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer text-[10px] h-5 hover:bg-emerald-50"
                      onClick={() => {
                        const current = formTags.split(',').map(t => t.trim()).filter(Boolean);
                        if (!current.includes(tag)) {
                          setFormTags(prev => prev ? `${prev}, ${tag}` : tag);
                        }
                      }}
                    >
                      + {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />} Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Contact Dialog ─────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="Full name" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+1 555-0100" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input placeholder="Company name" value={formCompany} onChange={e => setFormCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input placeholder="Comma separated: VIP, Client, Lead" value={formTags} onChange={e => setFormTags(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import Dialog ───────────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>Import contacts from CSV or XLSX files</DialogDescription>
          </DialogHeader>

          {!importStats ? (
            <div className="space-y-4 py-4">
              {/* File upload */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">{importFile ? importFile.name : 'Click to select a file'}</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx, .xls files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Preview and mapping */}
              {importPreview.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Field Mapping</h4>
                    <p className="text-xs text-muted-foreground mb-3">Map file columns to contact fields</p>
                    <div className="grid grid-cols-2 gap-2">
                      {importHeaders.map(header => (
                        <div key={header} className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1" title={header}>{header}</span>
                          <ChevronDown className="size-3 text-muted-foreground" />
                          <Select
                            value={fieldMapping[header] || '_skip'}
                            onValueChange={v => setFieldMapping(prev => ({ ...prev, [header]: v }))}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_skip">Skip</SelectItem>
                              {CONTACT_FIELDS.map(f => (
                                <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Preview ({importPreview.length} rows shown)</h4>
                    <ScrollArea className="max-h-48">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {importHeaders.map(h => <TableHead key={h} className="text-[10px]">{h}</TableHead>)}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.map((row, i) => (
                            <TableRow key={i}>
                              {importHeaders.map(h => (
                                <TableCell key={h} className="text-xs py-1">{row[h] || '-'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="size-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{importStats.imported}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{importStats.duplicates}</p>
                  <p className="text-xs text-muted-foreground">Duplicates</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{importStats.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Total rows: {importStats.total}</p>
            </div>
          )}

          <DialogFooter>
            {!importStats ? (
              <>
                <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportPreview([]); setImportHeaders([]); }}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleImport}
                  disabled={importing || importPreview.length === 0}
                >
                  {importing ? <><Loader2 className="size-4 mr-1 animate-spin" /> Importing...</> : <><Upload className="size-4 mr-1" /> Import</>}
                </Button>
              </>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setImportStats(null); setImportFile(null); setImportPreview([]); setImportHeaders([]); setImportDialogOpen(false); }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Export Dialog ───────────────────────────────────────────────── */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Contacts</DialogTitle>
            <DialogDescription>
              Export {selectedIds.size > 0 ? `${selectedIds.size} selected` : tagFilter !== 'all' ? `filtered` : 'all'} contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleExport}><Download className="size-4 mr-1" /> Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
