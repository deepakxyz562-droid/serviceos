'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Plus, Search, Copy, Trash2, Eye, Send,
  CheckCircle2, Clock, Loader2, MessageSquare, Mail, Smartphone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemoPageSize } from '@/hooks/use-demo-page-size';

// ─── Types ──────────────────────────────────────────────────────────────────

type TemplateCategory = 'promotional' | 'reminder' | 'seasonal' | 'follow_up' | 're_engagement' | 'general';

interface CampaignTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  variablesJson: string;
  isApproved: boolean;
  externalId: string | null;
  usageCount: number;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'general', label: 'General' },
];

const CATEGORY_COLORS: Record<string, string> = {
  promotional: 'bg-amber-100 text-amber-700 border-amber-200',
  reminder: 'bg-sky-100 text-sky-700 border-sky-200',
  seasonal: 'bg-pink-100 text-pink-700 border-pink-200',
  follow_up: 'bg-violet-100 text-violet-700 border-violet-200',
  re_engagement: 'bg-orange-100 text-orange-700 border-orange-200',
  general: 'bg-slate-100 text-slate-600 border-slate-200',
};

const VARIABLE_PRESETS = [
  { label: 'Name', value: '{{name}}' },
  { label: 'Service', value: '{{service}}' },
  { label: 'Date', value: '{{date}}' },
  { label: 'Time', value: '{{time}}' },
  { label: 'Amount', value: '{{amount}}' },
  { label: 'Company', value: '{{company}}' },
  { label: 'Phone', value: '{{phone}}' },
  { label: 'Address', value: '{{address}}' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(v => v.replace(/\{\{|\}\}/g, '')))];
}

function detectChannels(content: string): { type: string; label: string; icon: React.ReactNode; color: string }[] {
  const channels: { type: string; label: string; icon: React.ReactNode; color: string }[] = [];

  // WhatsApp patterns: short messages, emoji, template-style
  if (content.length < 1000 || /\{\{[\w]+\}\}/.test(content) || /[📱💬✅🎉🔥⭐]/.test(content)) {
    channels.push({ type: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="size-3" />, color: 'bg-emerald-100 text-emerald-700' });
  }

  // Email patterns: longer content, HTML-like, subject-like structure
  if (content.length > 200 || /subject|dear|regards|sincerely/i.test(content)) {
    channels.push({ type: 'email', label: 'Email', icon: <Mail className="size-3" />, color: 'bg-sky-100 text-sky-700' });
  }

  // SMS patterns: very short, urgency words
  if (content.length <= 160 || /urgent|reminder|confirm|code/i.test(content)) {
    channels.push({ type: 'sms', label: 'SMS', icon: <Smartphone className="size-3" />, color: 'bg-purple-100 text-purple-700' });
  }

  return channels.length > 0 ? channels : [{ type: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="size-3" />, color: 'bg-emerald-100 text-emerald-700' }];
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MarketingTemplatesView() {
  // Demo-mode page size cap (5 for demo tenant, else 50)
  const demoPageSize = useDemoPageSize(50);

  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'promotional' as TemplateCategory,
    content: '',
    ctaText: '',
    ctaUrl: '',
    isApproved: false,
  });

  // ── Load templates from API ──
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('limit', String(demoPageSize));

      const res = await fetch(`/api/campaign-templates?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setTemplates(result.data || []);
      } else {
        setError('Failed to load templates');
        toast.error('Failed to load templates');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading templates');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, demoPageSize]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, search]);

  // ── Stats ──
  const stats = useMemo(() => {
    const approved = templates.filter(t => t.isApproved).length;
    const pending = templates.filter(t => !t.isApproved).length;
    const categories = new Set(templates.map(t => t.category)).size;
    return { total: templates.length, approved, pending, categories };
  }, [templates]);

  // ── Handlers ──
  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Template name is required'); return; }
    if (!createForm.content) { toast.error('Template content is required'); return; }

    setIsCreating(true);
    try {
      const variables = detectVariables(createForm.content);

      if (isEditing && selectedTemplate) {
        const res = await fetch(`/api/campaign-templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: createForm.name,
            description: createForm.description || null,
            category: createForm.category,
            content: createForm.content,
            ctaText: createForm.ctaText || null,
            ctaUrl: createForm.ctaUrl || null,
            variablesJson: JSON.stringify(variables),
            isApproved: createForm.isApproved,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? result.data : t));
          toast.success('Template updated');
        } else {
          toast.error('Failed to update template');
        }
      } else {
        const res = await fetch('/api/campaign-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: createForm.name,
            description: createForm.description || null,
            category: createForm.category,
            content: createForm.content,
            ctaText: createForm.ctaText || null,
            ctaUrl: createForm.ctaUrl || null,
            variablesJson: JSON.stringify(variables),
            isApproved: createForm.isApproved,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          setTemplates(prev => [result.data, ...prev]);
          toast.success('Template created');
        } else {
          toast.error('Failed to create template');
        }
      }

      setShowCreateDialog(false);
      resetForm();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/campaign-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        toast.success('Template deleted');
      } else {
        toast.error('Failed to delete template');
      }
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Content copied to clipboard');
    } catch {
      toast.error('Failed to copy content');
    }
  };

  const handleEdit = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setCreateForm({
      name: template.name,
      description: template.description || '',
      category: template.category as TemplateCategory,
      content: template.content,
      ctaText: template.ctaText || '',
      ctaUrl: template.ctaUrl || '',
      isApproved: template.isApproved,
    });
    setShowCreateDialog(true);
  };

  const handlePreview = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleToggleApproval = async (template: CampaignTemplate) => {
    try {
      const res = await fetch(`/api/campaign-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: !template.isApproved }),
      });
      if (res.ok) {
        setTemplates(prev =>
          prev.map(t => t.id === template.id ? { ...t, isApproved: !t.isApproved } : t)
        );
        toast.success(template.isApproved ? 'Template unapproved' : 'Template approved');
      }
    } catch {
      toast.error('Failed to update template');
    }
  };

  const resetForm = () => {
    setCreateForm({
      name: '',
      description: '',
      category: 'promotional',
      content: '',
      ctaText: '',
      ctaUrl: '',
      isApproved: false,
    });
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const detectedVars = useMemo(() => detectVariables(createForm.content), [createForm.content]);

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-52 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-center gap-2"><Skeleton className="size-4" /><div><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-8 mt-1" /></div></div></Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="space-y-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-16 w-full" /></div></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <FileText className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load templates</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadTemplates}>
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
            <FileText className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Message Templates</h2>
            <p className="text-sm text-muted-foreground">Campaign message templates & builder</p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { resetForm(); setShowCreateDialog(true); }}
        >
          <Plus className="size-4 mr-1.5" /> Create Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Templates', value: stats.total, icon: FileText, color: 'text-foreground' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Categories', value: stats.categories, icon: Send, color: 'text-sky-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={cn('size-4', stat.color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
          <TabsList>
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Template List */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No templates found</p>
          <p className="text-sm mt-1">Create your first message template to get started</p>
          <Button
            className="mt-4 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { resetForm(); setShowCreateDialog(true); }}
          >
            <Plus className="size-4 mr-1.5" /> Create Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => {
            const variables = detectVariables(template.content);
            const channels = detectChannels(template.content);

            return (
              <Card
                key={template.id}
                className="hover:shadow-md transition-all cursor-pointer"
                onClick={() => handlePreview(template)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{template.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px]', getCategoryColor(template.category))}>
                          {template.category.replace('_', '-')}
                        </Badge>
                        {template.isApproved ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="size-2.5 mr-0.5" /> Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                            <Clock className="size-2.5 mr-0.5" /> Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCopyContent(template.content)}
                        title="Copy content"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(template)}
                        title="Edit"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500"
                        onClick={() => handleDelete(template.id)}
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 max-h-24 overflow-hidden">
                    <p className="text-xs whitespace-pre-wrap line-clamp-3">{template.content}</p>
                  </div>

                  {/* CTA Preview */}
                  {template.ctaText && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 px-2.5 py-0">
                        {template.ctaText}
                      </Button>
                      {template.ctaUrl && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {template.ctaUrl}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer: channels + variables + usage */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1">
                      {channels.map(ch => (
                        <Badge key={ch.type} variant="secondary" className={cn('text-[10px] gap-0.5', ch.color)}>
                          {ch.icon} {ch.label}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {variables.length > 0 && (
                        <span>{variables.length} var{variables.length > 1 ? 's' : ''}</span>
                      )}
                      {template.usageCount > 0 && (
                        <span>Used {template.usageCount}×</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update your message template' : 'Design a reusable campaign message template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Welcome Offer, Appointment Reminder"
                value={createForm.name}
                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief description of this template"
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={createForm.category}
                onValueChange={v => setCreateForm({ ...createForm, category: v as TemplateCategory })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content with Variable Insertion */}
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea
                placeholder="Type your message... Use {{name}}, {{service}}, {{date}} as placeholders"
                value={createForm.content}
                onChange={e => setCreateForm({ ...createForm, content: e.target.value })}
                rows={5}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{createForm.content.length} characters</p>
                <div className="flex items-center gap-1">
                  {detectedVars.length > 0 && (
                    <span className="text-[10px] text-emerald-600">
                      {detectedVars.length} variable{detectedVars.length > 1 ? 's' : ''} detected
                    </span>
                  )}
                </div>
              </div>

              {/* Variable Insertion Buttons */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Insert variable:</p>
                <div className="flex flex-wrap gap-1">
                  {VARIABLE_PRESETS.map(v => (
                    <Button
                      key={v.value}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 py-0"
                      onClick={() => setCreateForm({
                        ...createForm,
                        content: createForm.content + v.value,
                      })}
                    >
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Detected Variables */}
              {detectedVars.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Detected Variables</p>
                  <div className="flex flex-wrap gap-1">
                    {detectedVars.map(v => (
                      <Badge key={v} variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* CTA Button */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input
                  placeholder="e.g., Book Now"
                  value={createForm.ctaText}
                  onChange={e => setCreateForm({ ...createForm, ctaText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input
                  placeholder="https://..."
                  value={createForm.ctaUrl}
                  onChange={e => setCreateForm({ ...createForm, ctaUrl: e.target.value })}
                />
              </div>
            </div>

            {/* Approval Toggle */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-7 text-xs',
                  createForm.isApproved && 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                )}
                onClick={() => setCreateForm({ ...createForm, isApproved: !createForm.isApproved })}
              >
                {createForm.isApproved ? <CheckCircle2 className="size-3 mr-1" /> : <Clock className="size-3 mr-1" />}
                {createForm.isApproved ? 'Approved' : 'Mark as Approved'}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                WhatsApp templates require approval before sending
              </span>
            </div>

            {/* Content Preview */}
            {createForm.content && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium mb-2">Preview</p>
                  <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 max-w-[280px] shadow-sm">
                      <p className="text-xs whitespace-pre-wrap">
                        {createForm.content}
                      </p>
                      {createForm.ctaText && (
                        <Button
                          size="sm"
                          className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                        >
                          {createForm.ctaText}
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-1.5">WhatsApp preview</p>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={!createForm.name || !createForm.content || isCreating}
            >
              {isCreating && <Loader2 className="size-4 animate-spin mr-1" />}
              {isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={cn('text-xs', getCategoryColor(selectedTemplate?.category || ''))}>
                  {selectedTemplate?.category?.replace('_', '-')}
                </Badge>
                {selectedTemplate?.isApproved ? (
                  <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="size-3 mr-0.5" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                    <Clock className="size-3 mr-0.5" /> Pending
                  </Badge>
                )}
                {selectedTemplate && detectChannels(selectedTemplate.content).map(ch => (
                  <Badge key={ch.type} variant="secondary" className={cn('text-xs gap-0.5', ch.color)}>
                    {ch.icon} {ch.label}
                  </Badge>
                ))}
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {/* Description */}
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              )}

              {/* Message Preview */}
              <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 max-w-[320px] shadow-sm">
                  <ScrollArea className="max-h-60">
                    <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
                  </ScrollArea>
                  {selectedTemplate.ctaText && (
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                      onClick={() => {
                        if (selectedTemplate.ctaUrl) {
                          window.open(selectedTemplate.ctaUrl, '_blank');
                        }
                      }}
                    >
                      {selectedTemplate.ctaText}
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-emerald-600 mt-1.5">Message preview</p>
              </div>

              {/* Variables */}
              {detectVariables(selectedTemplate.content).length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2">Template Variables</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detectVariables(selectedTemplate.content).map(v => (
                      <Badge key={v} variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>{' '}
                  <span className="font-medium">{selectedTemplate.category.replace('_', '-')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Usage:</span>{' '}
                  <span className="font-medium">{selectedTemplate.usageCount}×</span>
                </div>
                {selectedTemplate.externalId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">WhatsApp ID:</span>{' '}
                    <span className="font-medium font-mono text-xs">{selectedTemplate.externalId}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span className="font-medium text-xs">
                    {new Date(selectedTemplate.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>{' '}
                  <span className="font-medium text-xs">
                    {new Date(selectedTemplate.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleCopyContent(selectedTemplate.content)}
                >
                  <Copy className="size-3 mr-1" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleEdit(selectedTemplate)}
                >
                  <Eye className="size-3 mr-1" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 text-xs',
                    selectedTemplate.isApproved
                      ? 'hover:bg-amber-50 hover:text-amber-700'
                      : 'hover:bg-emerald-50 hover:text-emerald-700'
                  )}
                  onClick={() => handleToggleApproval(selectedTemplate)}
                >
                  {selectedTemplate.isApproved ? (
                    <><Clock className="size-3 mr-1" /> Unapprove</>
                  ) : (
                    <><CheckCircle2 className="size-3 mr-1" /> Approve</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 ml-auto"
                  onClick={() => {
                    handleDelete(selectedTemplate.id);
                    setShowPreviewDialog(false);
                  }}
                >
                  <Trash2 className="size-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
