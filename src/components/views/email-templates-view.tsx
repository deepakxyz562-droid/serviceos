'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Plus, Loader2, RefreshCw, Pencil, Trash2, Copy,
  Search, AlertCircle, CheckCircle2, XCircle, Code2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type TemplateCategory = 'transactional' | 'marketing' | 'system';

interface TemplateVariable {
  key: string;
  label: string;
  required: boolean;
  example: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variablesJson: string;
  isBuiltIn: boolean;
  isDefault: boolean;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormState {
  name: string;
  slug: string;
  category: TemplateCategory;
  description: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: TemplateVariable[];
  isDefault: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  transactional: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  marketing: 'bg-amber-100 text-amber-700 border-amber-200',
  system: 'bg-slate-100 text-slate-700 border-slate-200',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseVariables(json: string): TemplateVariable[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((v) => v && typeof v === 'object' && typeof v.key === 'string') as TemplateVariable[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function extractVariables(text: string): string[] {
  if (!text) return [];
  const regex = /\{\{\s*(\w+)\s*\}\}/g;
  const set = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    set.add(match[1]);
  }
  return Array.from(set);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function emptyForm(): TemplateFormState {
  return {
    name: '',
    slug: '',
    category: 'transactional',
    description: '',
    subject: '',
    htmlBody: '',
    textBody: '',
    variables: [],
    isDefault: false,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmailTemplatesView() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | TemplateCategory>('all');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/email-templates');
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      setTemplates(list as EmailTemplate[]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load email templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (filter !== 'all' && t.category !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !t.name.toLowerCase().includes(q) &&
          !t.slug.toLowerCase().includes(q) &&
          !(t.description || '').toLowerCase().includes(q) &&
          !t.subject.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [templates, filter, search]);

  const counts = useMemo(() => ({
    all: templates.length,
    transactional: templates.filter((t) => t.category === 'transactional').length,
    marketing: templates.filter((t) => t.category === 'marketing').length,
    system: templates.filter((t) => t.category === 'system').length,
  }), [templates]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setSlugTouched(false);
    setFormOpen(true);
  };

  const openEdit = (template: EmailTemplate) => {
    setEditing(template);
    setForm({
      name: template.name,
      slug: template.slug,
      category: template.category as TemplateCategory,
      description: template.description || '',
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody || '',
      variables: parseVariables(template.variablesJson),
      isDefault: template.isDefault,
    });
    setSlugTouched(true);
    setFormOpen(true);
  };

  // Auto-generate slug from name unless user has manually edited the slug
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: slugify(slug) }));
  };

  const addVariable = () => {
    setForm((f) => ({
      ...f,
      variables: [...f.variables, { key: '', label: '', required: false, example: '' }],
    }));
  };

  const updateVariable = (index: number, patch: Partial<TemplateVariable>) => {
    setForm((f) => ({
      ...f,
      variables: f.variables.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  };

  const removeVariable = (index: number) => {
    setForm((f) => ({
      ...f,
      variables: f.variables.filter((_, i) => i !== index),
    }));
  };

  // Live preview: extract referenced vars from subject + htmlBody, find undeclared ones
  const referencedVars = useMemo(
    () => extractVariables(`${form.subject}\n${form.htmlBody}`),
    [form.subject, form.htmlBody]
  );
  const declaredKeys = useMemo(() => new Set(form.variables.map((v) => v.key)), [form.variables]);
  const undeclaredVars = useMemo(
    () => referencedVars.filter((v) => !declaredKeys.has(v)),
    [referencedVars, declaredKeys]
  );

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    if (!form.htmlBody.trim()) { toast.error('HTML body is required'); return; }

    // Clean variables (drop rows without key)
    const cleanVars = form.variables.filter((v) => v.key.trim());
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      category: form.category,
      description: form.description.trim() || null,
      subject: form.subject,
      htmlBody: form.htmlBody,
      textBody: form.textBody.trim() || null,
      variablesJson: JSON.stringify(cleanVars),
      isDefault: form.isDefault,
    };

    setIsSaving(true);
    try {
      const url = editing
        ? `/api/email-templates/${editing.id}`
        : '/api/email-templates';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${editing ? 'update' : 'create'} template`);
      }
      toast.success(editing ? 'Template updated' : 'Template created');
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    const vars = parseVariables(template.variablesJson);
    setIsSaving(true);
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          slug: slugify(`${template.slug}-copy`),
          category: template.category,
          description: template.description,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          variablesJson: JSON.stringify(vars),
          isDefault: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to duplicate template');
      }
      toast.success('Template duplicated');
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Duplicate failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/email-templates/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete template');
      }
      toast.success('Template deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <FileText className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Email Templates</h2>
            <p className="text-sm text-muted-foreground">
              Reusable transactional & marketing email templates with variable personalization
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCw className={cn('size-4 mr-1.5', isLoading && 'animate-spin')} /> Refresh
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4 mr-1.5" /> New Template
          </Button>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | TemplateCategory)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="transactional">Transactional ({counts.transactional})</TabsTrigger>
            <TabsTrigger value="marketing">Marketing ({counts.marketing})</TabsTrigger>
            <TabsTrigger value="system">System ({counts.system})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <FileText className="size-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {templates.length === 0 ? 'No email templates yet' : 'No templates match your filters'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {templates.length === 0
                ? 'Create your first reusable email template. Use {{variables}} for personalization.'
                : 'Try a different category or clear the search.'}
            </p>
            {templates.length === 0 && (
              <Button onClick={openNew}>
                <Plus className="size-4 mr-1.5" /> Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <Card>
          <div className="rounded-md border-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((template) => {
                  const vars = parseVariables(template.variablesJson);
                  const catColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.system;
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="font-medium">{template.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{template.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px] capitalize', catColor)}>
                          {template.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.isBuiltIn ? (
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                            Built-in
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                            Custom
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-xs truncate text-muted-foreground">
                          {template.subject.slice(0, 80)}{template.subject.length > 80 ? '…' : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vars.length > 0 ? (
                          <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                            {vars.length} var{vars.length === 1 ? '' : 's'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(template.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(template)} title="Edit">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDuplicate(template)} title="Duplicate" disabled={isSaving}>
                            <Copy className="size-3.5" />
                          </Button>
                          {template.isBuiltIn ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-40 cursor-not-allowed" disabled>
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Built-in templates cannot be deleted</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeleteTarget(template)}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Email Template'}</DialogTitle>
            <DialogDescription>
              Use {'{{variables}}'} for personalization. Variable names must be alphanumeric / underscore.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Template Name <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="e.g. Welcome Email"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (unique key)</Label>
                <Input
                  placeholder="welcome-email"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Auto-generated from name. Used in code: <code>GET /api/email-templates/by-slug/{form.slug || 'welcome-email'}</code>
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as TemplateCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default for category</Label>
                <div className="flex items-center justify-between rounded-md border p-3 h-10">
                  <span className="text-xs text-muted-foreground">Use as default template when none specified</span>
                  <input
                    type="checkbox"
                    className="size-4 accent-emerald-600"
                    checked={form.isDefault}
                    onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                placeholder="What is this template used for?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Subject <span className="text-rose-500">*</span> <span className="text-xs text-muted-foreground font-normal">(supports {'{{variables}}'})</span></Label>
              <Input
                placeholder="Welcome to ServiceOS, {{name}}!"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>HTML Body <span className="text-rose-500">*</span> <span className="text-xs text-muted-foreground font-normal">(supports {'{{variables}}'})</span></Label>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                placeholder={'<div style="font-family:Arial">\n  <h1>Hello {{name}}</h1>\n  <p>Welcome aboard!</p>\n</div>'}
                value={form.htmlBody}
                onChange={(e) => setForm((f) => ({ ...f, htmlBody: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Plain Text Body (optional fallback)</Label>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                placeholder="Hello {{name}}, welcome aboard!"
                value={form.textBody}
                onChange={(e) => setForm((f) => ({ ...f, textBody: e.target.value }))}
              />
            </div>

            {/* Variables editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Code2 className="size-3.5" /> Variables
                </Label>
                <Button size="sm" variant="outline" onClick={addVariable}>
                  <Plus className="size-3 mr-1" /> Add Variable
                </Button>
              </div>
              {form.variables.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No variables declared. Add rows below to document each {'{{variable}}'}.
                </div>
              ) : (
                <div className="space-y-2">
                  {form.variables.map((v, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center rounded-md border p-2">
                      <Input
                        className="col-span-3 font-mono text-xs h-8"
                        placeholder="key"
                        value={v.key}
                        onChange={(e) => updateVariable(i, { key: slugify(e.target.value).replace(/-/g, '_') })}
                      />
                      <Input
                        className="col-span-3 text-xs h-8"
                        placeholder="Label"
                        value={v.label}
                        onChange={(e) => updateVariable(i, { label: e.target.value })}
                      />
                      <Input
                        className="col-span-3 text-xs h-8"
                        placeholder="Example"
                        value={v.example}
                        onChange={(e) => updateVariable(i, { example: e.target.value })}
                      />
                      <label className="col-span-2 flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          className="size-3.5 accent-emerald-600"
                          checked={v.required}
                          onChange={(e) => updateVariable(i, { required: e.target.checked })}
                        />
                        Required
                      </label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="col-span-1 h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                        onClick={() => removeVariable(i)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live preview: referenced vs declared */}
            {referencedVars.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 text-teal-600" /> Variable usage (live)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {referencedVars.map((v) => {
                    const declared = declaredKeys.has(v);
                    return (
                      <Badge
                        key={v}
                        variant="outline"
                        className={cn(
                          'font-mono text-[10px]',
                          declared
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-rose-100 text-rose-700 border-rose-200'
                        )}
                      >
                        {declared ? <CheckCircle2 className="size-2.5 mr-1" /> : <XCircle className="size-2.5 mr-1" />}
                        {`{{${v}}}`}
                      </Badge>
                    );
                  })}
                </div>
                {undeclaredVars.length > 0 ? (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    {undeclaredVars.length} variable{undeclaredVars.length === 1 ? '' : 's'} used in body but not declared above: {undeclaredVars.map((v) => `{{${v}}}`).join(', ')}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    All referenced variables are declared. ✓
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()}
            >
              {isSaving ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</>
              ) : (
                <><FileText className="size-4 mr-1.5" /> {editing ? 'Update Template' : 'Create Template'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete email template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> (slug <code>{deleteTarget?.slug}</code>). Any workflows or campaigns using this template by slug will need to be reconfigured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
