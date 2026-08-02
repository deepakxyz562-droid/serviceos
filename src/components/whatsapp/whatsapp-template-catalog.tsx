'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Shield, Wrench, Megaphone, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw,
  Eye, Send, Upload, Star, Sparkles, Copy, ChevronDown,
  Clock, FileText, Search, Filter, Smartphone, Zap,
  ChevronRight, Info, ExternalLink, CircleDot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  PRE_BUILT_WHATSAPP_TEMPLATES,
  META_CATEGORY_INFO,
  getTemplatesByMetaCategory,
  previewTemplate,
  countVariables,
  type WhatsAppPreBuiltTemplate,
} from '@/lib/whatsapp-prebuilt-templates';

// ─── Types ────────────────────────────────────────────────────────────────

interface ImportedTemplate {
  id: string;
  name: string;
  status: string;
  isApproved: boolean;
  externalId: string | null;
  lastTestError: string | null;
  category: string;
  content: string;
  tagsJson: string;
}

interface TemplateWithState extends WhatsAppPreBuiltTemplate {
  imported?: boolean;
  importId?: string;
  importStatus?: string;
  isApproved?: boolean;
  metaExternalId?: string | null;
  lastError?: string | null;
}

// ─── Category Config ──────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  UTILITY: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', iconBg: 'bg-emerald-100 dark:bg-emerald-900/60' },
  MARKETING: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', iconBg: 'bg-amber-100 dark:bg-amber-900/60' },
  AUTHENTICATION: { bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', iconBg: 'bg-violet-100 dark:bg-violet-900/60' },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  UTILITY: Wrench,
  MARKETING: Megaphone,
  AUTHENTICATION: Shield,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: FileText },
  pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: XCircle },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', icon: Send },
  disabled: { label: 'Disabled', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: XCircle },
};

// ─── Component ────────────────────────────────────────────────────────────

export function WhatsAppTemplateCatalog() {
  const [templates, setTemplates] = useState<TemplateWithState[]>([]);
  const [importedTemplates, setImportedTemplates] = useState<ImportedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [metaConnected, setMetaConnected] = useState(false);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [essentialOnly, setEssentialOnly] = useState(false);

  // Preview dialog
  const [previewTemplate_item, setPreviewTemplate] = useState<TemplateWithState | null>(null);

  // Bulk action
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // ─── Fetch Data ─────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch setup status + pre-built templates
      const setupRes = await fetch('/api/whatsapp/templates?setup=true');
      if (setupRes.ok) {
        const setupData = await setupRes.json();
        setMetaConnected(setupData.setupStatus?.metaConnected || false);
      }

      // Fetch imported templates
      const listRes = await fetch('/api/whatsapp/templates?limit=100');
      if (listRes.ok) {
        const listData = await listRes.json();
        const imported = (listData.data || []) as ImportedTemplate[];
        setImportedTemplates(imported);
      }

      // Merge pre-built with import status
      const importedMap = new Map<string, ImportedTemplate>();
      for (const imp of importedTemplates.length > 0 ? importedTemplates : ((await fetch('/api/whatsapp/templates?limit=100').then(r => r.ok ? r.json() : { data: [] })).data || [])) {
        importedMap.set(imp.name, imp);
      }

      const merged: TemplateWithState[] = PRE_BUILT_WHATSAPP_TEMPLATES.map(t => {
        const imp = importedMap.get(t.name);
        return {
          ...t,
          imported: !!imp,
          importId: imp?.id,
          importStatus: imp?.status || 'draft',
          isApproved: imp?.isApproved || false,
          metaExternalId: imp?.externalId,
          lastError: imp?.lastTestError,
        };
      });

      setTemplates(merged);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [importedTemplates.length]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ─── Import Templates ───────────────────────────────────────────────

  const importTemplate = async (templateKey: string) => {
    setActionLoading(templateKey);
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', templateKeys: [templateKey] }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to import');
        return;
      }

      toast.success('Template imported successfully!');
      await fetchTemplates();
    } catch {
      toast.error('Failed to import template');
    } finally {
      setActionLoading(null);
    }
  };

  const importSelected = async () => {
    if (selectedKeys.size === 0) {
      toast.error('Select at least one template');
      return;
    }
    setActionLoading('bulk-import');
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', templateKeys: Array.from(selectedKeys) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to import');
        return;
      }

      const data = await res.json();
      toast.success(`Imported ${data.imported} templates!`);
      setSelectedKeys(new Set());
      await fetchTemplates();
    } catch {
      toast.error('Failed to import templates');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Submit to Meta ─────────────────────────────────────────────────

  const submitToMeta = async (templateId: string, templateName: string) => {
    if (!metaConnected) {
      toast.error('Connect Meta Business first to submit templates for approval');
      return;
    }
    setActionLoading(`submit-${templateId}`);
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', templateId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to submit');
        return;
      }

      const data = await res.json();
      toast.success(data.message || `${templateName} submitted to Meta!`);
      await fetchTemplates();
    } catch {
      toast.error('Failed to submit template');
    } finally {
      setActionLoading(null);
    }
  };

  const submitAllPending = async () => {
    if (!metaConnected) {
      toast.error('Connect Meta Business first');
      return;
    }
    setActionLoading('submit-all');
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_all' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to submit');
        return;
      }

      const data = await res.json();
      toast.success(`Submitted ${data.submitted} templates to Meta! ${data.failed > 0 ? `(${data.failed} failed)` : ''}`);
      await fetchTemplates();
    } catch {
      toast.error('Failed to submit templates');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Sync Status ────────────────────────────────────────────────────

  const syncStatus = async () => {
    setActionLoading('sync');
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_status' }),
      });

      if (!res.ok) {
        toast.error('Failed to sync status');
        return;
      }

      const data = await res.json();
      toast.success(`Synced ${data.synced} templates from Meta`);
      await fetchTemplates();
    } catch {
      toast.error('Failed to sync status');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Copy Template Text ─────────────────────────────────────────────

  const copyTemplateText = (template: WhatsAppPreBuiltTemplate) => {
    const text = previewTemplate(template);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Template text copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  // ─── Filtered Templates ─────────────────────────────────────────────

  const filteredTemplates = templates.filter(t => {
    if (categoryFilter !== 'all' && t.metaCategory !== categoryFilter) return false;
    if (essentialOnly && !t.essential) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'not_imported' && t.imported) return false;
      if (statusFilter === 'draft' && t.importStatus !== 'draft') return false;
      if (statusFilter === 'pending' && t.importStatus !== 'pending') return false;
      if (statusFilter === 'approved' && !t.isApproved) return false;
      if (statusFilter === 'rejected' && t.importStatus !== 'rejected') return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q)
        || t.description.toLowerCase().includes(q)
        || t.bodyText.toLowerCase().includes(q)
        || t.businessCategory.toLowerCase().includes(q);
    }
    return true;
  });

  const templatesByCategory = getTemplatesByMetaCategory();
  const stats = {
    total: templates.length,
    imported: templates.filter(t => t.imported).length,
    pending: templates.filter(t => t.imported && t.importStatus === 'pending').length,
    approved: templates.filter(t => t.isApproved).length,
    rejected: templates.filter(t => t.importStatus === 'rejected').length,
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedKeys(new Set(filteredTemplates.filter(t => !t.imported).map(t => t.key)));
  };

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
        <span className="ml-3 text-muted-foreground">Loading template catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 text-amber-500" />
            WhatsApp Template Catalog
          </h2>
          <p className="text-muted-foreground mt-1">
            Pre-built templates ready for Meta approval. Import, customize, and submit to start sending WhatsApp messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={syncStatus}
            disabled={!!actionLoading || !metaConnected}
          >
            {actionLoading === 'sync' ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <RefreshCw className="size-3.5 mr-1.5" />}
            Sync Status
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={submitAllPending}
            disabled={!!actionLoading || !metaConnected || stats.imported === 0}
          >
            {actionLoading === 'submit-all' ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Send className="size-3.5 mr-1.5" />}
            Submit All Pending
          </Button>
        </div>
      </div>

      {/* ─── Meta Connection Warning ───────────────────────────────────── */}
      {!metaConnected && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300">Meta Business Not Connected</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                You can import templates and preview them, but you need to connect your Meta Business account to submit templates for approval. Go to the Setup Wizard to connect.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Templates', value: stats.total, icon: FileText, color: 'text-slate-600 dark:text-slate-400' },
          { label: 'Imported', value: stats.imported, icon: Upload, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600 dark:text-red-400' },
        ].map(s => (
          <Card key={s.label} className="py-0">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className={cn('rounded-lg p-2 bg-muted/50', s.color)}>
                <s.icon className="size-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name, description, or content..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Category filter pills */}
              <div className="flex gap-1">
                <Button
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setCategoryFilter('all')}
                >
                  All ({templates.length})
                </Button>
                {Object.entries(templatesByCategory).map(([cat, tmplList]) => {
                  const catInfo = META_CATEGORY_INFO[cat];
                  const CatIcon = CATEGORY_ICONS[cat];
                  return (
                    <Button
                      key={cat}
                      variant={categoryFilter === cat ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 text-xs gap-1',
                        categoryFilter === cat && cat === 'UTILITY' && 'bg-emerald-600 hover:bg-emerald-700',
                        categoryFilter === cat && cat === 'MARKETING' && 'bg-amber-600 hover:bg-amber-700',
                        categoryFilter === cat && cat === 'AUTHENTICATION' && 'bg-violet-600 hover:bg-violet-700',
                      )}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      <CatIcon className="size-3" />
                      {catInfo?.label} ({tmplList.length})
                    </Button>
                  );
                })}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_imported">Not Imported</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={essentialOnly ? 'default' : 'outline'}
                size="sm"
                className={cn('h-8 text-xs gap-1', essentialOnly && 'bg-amber-600 hover:bg-amber-700')}
                onClick={() => setEssentialOnly(!essentialOnly)}
              >
                <Star className="size-3" />
                Essential Only
              </Button>
            </div>
          </div>
          {/* Bulk actions */}
          {selectedKeys.size > 0 && (
            <div className="mt-3 flex items-center gap-2 pt-3 border-t">
              <span className="text-sm text-muted-foreground">{selectedKeys.size} selected</span>
              <Button size="sm" onClick={importSelected} disabled={!!actionLoading}>
                {actionLoading === 'bulk-import' ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Upload className="size-3.5 mr-1" />}
                Import Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Category Sections ────────────────────────────────────────── */}
      <div className="space-y-6">
        {(['UTILITY', 'MARKETING', 'AUTHENTICATION'] as const).map(category => {
          const categoryTemplates = filteredTemplates.filter(t => t.metaCategory === category);
          if (categoryFilter !== 'all' && categoryFilter !== category) return null;
          if (categoryTemplates.length === 0) return null;

          const catInfo = META_CATEGORY_INFO[category];
          const styles = CATEGORY_STYLES[category];
          const CatIcon = CATEGORY_ICONS[category];

          return (
            <div key={category}>
              {/* Category Header */}
              <div className={cn('rounded-xl p-4 border', styles.bg, styles.border)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2.5', styles.iconBg)}>
                      <CatIcon className={cn('size-5', styles.text)} />
                    </div>
                    <div>
                      <h3 className={cn('font-bold text-lg', styles.text)}>{catInfo?.label} Templates</h3>
                      <p className="text-sm text-muted-foreground">{catInfo?.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={styles.text}>
                      {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const unimportedKeys = categoryTemplates.filter(t => !t.imported).map(t => t.key);
                        if (unimportedKeys.length > 0) {
                          setSelectedKeys(new Set([...selectedKeys, ...unimportedKeys]));
                          toast.info(`Selected ${unimportedKeys.length} unimported ${catInfo?.label} templates`);
                        } else {
                          toast.info('All templates in this category are already imported');
                        }
                      }}
                    >
                      Select Unimported
                    </Button>
                  </div>
                </div>
              </div>

              {/* Template Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {categoryTemplates.map(template => (
                  <TemplateCard
                    key={template.key}
                    template={template}
                    onImport={importTemplate}
                    onSubmit={submitToMeta}
                    onPreview={setPreviewTemplate}
                    onCopy={copyTemplateText}
                    onToggleSelect={toggleSelect}
                    isSelected={selectedKeys.has(template.key)}
                    isLoading={actionLoading === template.key || actionLoading === `submit-${template.importId}`}
                    metaConnected={metaConnected}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="size-12 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">No templates match your filters</p>
              <Button variant="outline" className="mt-3" onClick={() => { setCategoryFilter('all'); setSearchQuery(''); setStatusFilter('all'); setEssentialOnly(false); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Preview Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!previewTemplate_item} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          {previewTemplate_item && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Smartphone className="size-5" />
                  {previewTemplate_item.name}
                </DialogTitle>
                <DialogDescription>
                  {previewTemplate_item.description}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone Preview */}
                <div className="flex flex-col items-center">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Phone Preview</p>
                  <div className="w-[280px] bg-gray-900 rounded-[2rem] p-3 shadow-xl">
                    <div className="bg-emerald-600 rounded-t-xl px-4 py-2 flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <MessageSquare className="size-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">Business Account</p>
                        <p className="text-white/60 text-[10px]">online</p>
                      </div>
                    </div>
                    <div className="bg-[#e5ddd5] dark:bg-gray-800 p-3 min-h-[280px] max-h-[320px] overflow-y-auto space-y-2">
                      {/* Header */}
                      {previewTemplate_item.headerText && (
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-sm font-semibold text-gray-800 dark:text-gray-200 shadow-sm">
                          {previewTemplate_item.headerText}
                        </div>
                      )}
                      {/* Body */}
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-2.5 shadow-sm">
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {previewTemplate(previewTemplate_item)}
                        </p>
                      </div>
                      {/* Footer */}
                      {previewTemplate_item.footerText && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                          {previewTemplate_item.footerText}
                        </p>
                      )}
                      {/* Buttons */}
                      {previewTemplate_item.buttons && previewTemplate_item.buttons.length > 0 && (
                        <div className="space-y-1">
                          {previewTemplate_item.buttons.map((btn, idx) => (
                            <button
                              key={idx}
                              className="w-full bg-white dark:bg-gray-700 rounded-lg py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            >
                              {btn.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-b-xl p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white dark:bg-gray-700 rounded-full px-3 py-1.5 text-xs text-gray-400">
                          Type a message...
                        </div>
                        <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
                          <Send className="size-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Details */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn(CATEGORY_STYLES[previewTemplate_item.metaCategory].bg, CATEGORY_STYLES[previewTemplate_item.metaCategory].text)}>
                        {META_CATEGORY_INFO[previewTemplate_item.metaCategory]?.label}
                      </Badge>
                      {previewTemplate_item.essential && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          <Star className="size-3 mr-0.5" /> Essential
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Language</Label>
                    <p className="text-sm mt-0.5">{previewTemplate_item.language === 'en' ? 'English' : previewTemplate_item.language}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Variables ({countVariables(previewTemplate_item.bodyText)})</Label>
                    <div className="mt-1 space-y-1">
                      {previewTemplate_item.exampleValues.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs font-mono">{'{{'}{idx + 1}{'}}'}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Raw Template Text</Label>
                    <div className="mt-1 bg-muted rounded-lg p-3 text-sm font-mono whitespace-pre-wrap">
                      {previewTemplate_item.bodyText}
                    </div>
                  </div>

                  {previewTemplate_item.footerText && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Footer</Label>
                      <p className="text-sm mt-0.5">{previewTemplate_item.footerText}</p>
                    </div>
                  )}

                  {previewTemplate_item.buttons && previewTemplate_item.buttons.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Buttons</Label>
                      <div className="mt-1 space-y-1">
                        {previewTemplate_item.buttons.map((btn, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">{btn.type}</Badge>
                            <span>{btn.text}</span>
                            {btn.url && <span className="text-muted-foreground text-xs truncate max-w-[150px]">{btn.url}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Import Status & Actions */}
                  <div className="space-y-2">
                    {previewTemplate_item.imported ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          {(() => {
                            const sc = STATUS_CONFIG[previewTemplate_item.importStatus || 'draft'];
                            const ScIcon = sc?.icon || FileText;
                            return (
                              <Badge className={sc?.color || ''}>
                                <ScIcon className="size-3 mr-1" />
                                {sc?.label || previewTemplate_item.importStatus}
                              </Badge>
                            );
                          })()}
                        </div>
                        {previewTemplate_item.isApproved && (
                          <p className="text-sm text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="size-4" /> Approved and ready to use!
                          </p>
                        )}
                        {previewTemplate_item.importStatus === 'pending' && (
                          <p className="text-sm text-amber-600 flex items-center gap-1">
                            <Clock className="size-4" /> Waiting for Meta approval (typically 5-30 min)
                          </p>
                        )}
                        {previewTemplate_item.lastError && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <XCircle className="size-4" /> {previewTemplate_item.lastError}
                          </p>
                        )}
                        {!previewTemplate_item.isApproved && previewTemplate_item.importId && metaConnected && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                              if (previewTemplate_item.importId) {
                                submitToMeta(previewTemplate_item.importId, previewTemplate_item.name);
                                setPreviewTemplate(null);
                              }
                            }}
                            disabled={!!actionLoading}
                          >
                            <Send className="size-3.5 mr-1" /> Submit for Approval
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          importTemplate(previewTemplate_item.key);
                          setPreviewTemplate(null);
                        }}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === previewTemplate_item.key ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Upload className="size-3.5 mr-1" />}
                        Import Template
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Template Card Sub-Component ─────────────────────────────────────────

function TemplateCard({
  template,
  onImport,
  onSubmit,
  onPreview,
  onCopy,
  onToggleSelect,
  isSelected,
  isLoading,
  metaConnected,
}: {
  template: TemplateWithState;
  onImport: (key: string) => void;
  onSubmit: (id: string, name: string) => void;
  onPreview: (t: TemplateWithState) => void;
  onCopy: (t: WhatsAppPreBuiltTemplate) => void;
  onToggleSelect: (key: string) => void;
  isSelected: boolean;
  isLoading: boolean;
  metaConnected: boolean;
}) {
  const styles = CATEGORY_STYLES[template.metaCategory];
  const statusConfig = STATUS_CONFIG[template.importStatus || 'draft'];
  const StatusIcon = statusConfig?.icon || FileText;

  return (
    <Card className={cn(
      'group relative transition-all hover:shadow-md',
      isSelected && 'ring-2 ring-emerald-500 ring-offset-2',
      template.isApproved && 'border-emerald-200 dark:border-emerald-800',
    )}>
      {/* Selection checkbox */}
      {!template.imported && (
        <button
          onClick={() => onToggleSelect(template.key)}
          className={cn(
            'absolute top-3 left-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-emerald-600 border-emerald-600'
              : 'border-muted-foreground/30 hover:border-emerald-500'
          )}
        >
          {isSelected && <CheckCircle2 className="size-3.5 text-white" />}
        </button>
      )}

      <CardHeader className={cn('pb-3', !template.imported && 'pl-10')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 leading-tight">
              {template.name}
              {template.essential && (
                <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
          {template.imported && (
            <Badge className={cn('text-[10px] shrink-0', statusConfig?.color)}>
              <StatusIcon className="size-3 mr-0.5" />
              {statusConfig?.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Template body preview */}
        <div className="bg-muted/50 rounded-lg p-2.5 text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap font-mono leading-relaxed">
          {previewTemplate(template)}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px]', styles.text)}>
            {META_CATEGORY_INFO[template.metaCategory]?.label}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {countVariables(template.bodyText)} var{countVariables(template.bodyText) !== 1 ? 's' : ''}
          </Badge>
          {template.buttons && template.buttons.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {template.buttons.length} button{template.buttons.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => onPreview(template)}
          >
            <Eye className="size-3 mr-1" /> Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCopy(template)}
          >
            <Copy className="size-3" />
          </Button>

          {!template.imported ? (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 flex-1"
              onClick={() => onImport(template.key)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <Upload className="size-3 mr-1" />}
              Import
            </Button>
          ) : !template.isApproved && template.importId && metaConnected ? (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 flex-1"
              onClick={() => onSubmit(template.importId!, template.name)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
              Submit
            </Button>
          ) : template.isApproved ? (
            <Badge className="h-7 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2.5">
              <CheckCircle2 className="size-3 mr-0.5" /> Live
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
