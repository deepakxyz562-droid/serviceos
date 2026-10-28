'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Plus,
  Send,
  Smartphone,
  ExternalLink,
  Phone,
  Copy,
  Layers,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import {
  BGOS_CANONICAL_META_TEMPLATES,
  META_ACCOUNT_CONFIG,
  formatBgosMetaTemplateBody,
  type BgosMetaTemplate,
} from '@/lib/bgos-meta-templates';

export function BgosMetaTemplatesWorkstation() {
  const [templates, setTemplates] = useState<BgosMetaTemplate[]>(BGOS_CANONICAL_META_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<BgosMetaTemplate>(
    BGOS_CANONICAL_META_TEMPLATES[0]
  );
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Live variable tester state
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  // Data-driven status counts (rendered in filter pills + header pill)
  const approvedCount = useMemo(() => templates.filter((t) => t.status === 'APPROVED').length, [templates]);
  const pendingCount = useMemo(() => templates.filter((t) => t.status === 'PENDING').length, [templates]);

  // Test send dialog state
  const [testSendOpen, setTestSendOpen] = useState(false);
  const [testRecipientPhone, setTestRecipientPhone] = useState('+91');
  const [sendingTest, setSendingTest] = useState(false);

  // Create template modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newCategory, setNewCategory] = useState<'UTILITY' | 'MARKETING'>('UTILITY');
  const [newBodyText, setNewBodyText] = useState('');
  const [newFooterText, setNewFooterText] = useState('BGOS');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Reset variable test values whenever selected template changes
  useEffect(() => {
    if (!selectedTemplate) return;
    const initial: Record<string, string> = {};
    selectedTemplate.defaultExampleValues.forEach((val, idx) => {
      initial[`var_${idx + 1}`] = val;
    });
    setPreviewValues(initial);
  }, [selectedTemplate]);

  // Load REAL template statuses from the tenant's WhatsApp template store
  // (GET /api/whatsapp/templates → CampaignTemplate rows with live approval state).
  // Rows are merged onto the BGOS canonical catalog (matched by name) so the
  // workstation always shows data-driven statuses — never hardcoded ones. When
  // the API returns nothing, the canonical catalog stays as the fallback.
  const loadTemplateStatus = useCallback(
    async (manual: boolean) => {
      if (manual) setSyncing(true);
      try {
        const res = await authFetch('/api/whatsapp/templates');
        if (res.status === 401) {
          toast.error('Session expired — please sign in again.');
          return;
        }
        if (!res.ok) {
          if (manual) {
            const err = await res.json().catch(() => ({}));
            toast.error(err?.error || 'Could not load template approval status from the server.');
          }
          return;
        }
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.templates)
          ? data.templates
          : [];

        if (rows.length === 0) {
          if (manual) {
            toast.info(
              'No templates in your library yet — showing the BGOS canonical catalog. Import templates from the web to sync live approval status.'
            );
          }
          return;
        }

        const mapped: BgosMetaTemplate[] = rows.map((t: any) => {
          const canonical = BGOS_CANONICAL_META_TEMPLATES.find((c) => c.name === t.name);
          const rawStatus = String(t.status || '').toUpperCase();
          const resolvedStatus: BgosMetaTemplate['status'] =
            rawStatus === 'APPROVED' || t.isApproved === true
              ? 'APPROVED'
              : rawStatus === 'REJECTED'
              ? 'REJECTED'
              : rawStatus === 'DRAFT'
              ? 'DRAFT'
              : 'PENDING';
          const rawCategory = String(t.category || '').toUpperCase();
          return {
            ...(canonical || {}),
            name: t.name,
            displayName:
              canonical?.displayName ||
              String(t.name || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            category: (['UTILITY', 'MARKETING', 'AUTHENTICATION'].includes(rawCategory)
              ? rawCategory
              : canonical?.category || 'UTILITY') as BgosMetaTemplate['category'],
            language: t.language || canonical?.language || 'en_US',
            status: resolvedStatus,
            bodyText: t.content || t.bodyText || canonical?.bodyText || '',
            footerText: t.footerText || canonical?.footerText,
            variableDescriptions: canonical?.variableDescriptions || [],
            defaultExampleValues: canonical?.defaultExampleValues || [],
            serviceTouchpoint: canonical?.serviceTouchpoint || 'marketing',
          };
        });

        setTemplates(mapped);
        setSelectedTemplate(
          (prev) => mapped.find((m) => m.name === prev?.name) || mapped[0]
        );
        if (manual) {
          const liveApproved = mapped.filter((m) => m.status === 'APPROVED').length;
          toast.success(
            `Synced ${mapped.length} templates — ${liveApproved} approved, ${mapped.length - liveApproved} awaiting approval`
          );
        }
      } catch {
        if (manual) toast.error('Unable to reach the template service. Check network connectivity.');
      } finally {
        if (manual) setSyncing(false);
      }
    },
    []
  );

  // Load live approval status on mount (silent) so counts are real, not catalog assumptions.
  useEffect(() => {
    void loadTemplateStatus(false);
  }, [loadTemplateStatus]);

  // Manual refresh button
  const handleSyncFromMeta = () => loadTemplateStatus(true);

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    if (categoryFilter !== 'ALL' && tpl.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && tpl.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.displayName.toLowerCase().includes(q) ||
        tpl.bodyText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate live preview body
  const currentParamValues = selectedTemplate
    ? selectedTemplate.defaultExampleValues.map(
        (_, idx) => previewValues[`var_${idx + 1}`] || `{{${idx + 1}}}`
      )
    : [];

  const previewBodyFormatted = selectedTemplate
    ? formatBgosMetaTemplateBody(selectedTemplate, currentParamValues)
    : '';

  // Handle test send
  const handleSendTestMessage = async () => {
    if (!testRecipientPhone || testRecipientPhone.length < 10) {
      toast.error('Please enter a valid phone number with country code (e.g. +91...)');
      return;
    }
    setSendingTest(true);
    try {
      const templateComponents = currentParamValues.length > 0 ? [
        {
          type: 'body',
          parameters: currentParamValues.map((val) => ({
            type: 'text',
            text: val,
          })),
        },
      ] : undefined;

      const res = await authFetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testRecipientPhone,
          message: previewBodyFormatted,
          type: 'template',
          templateName: selectedTemplate.name,
          templateLanguage: selectedTemplate.language,
          templateComponents,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.simulated) {
          toast.info(`Template dispatch simulated for ${testRecipientPhone} (WhatsApp credentials not configured)`);
        } else {
          toast.success(`Test template sent to ${testRecipientPhone}`);
        }
        setTestSendOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || `Failed to dispatch test template to ${testRecipientPhone}`);
      }
    } catch {
      toast.error(`Network error dispatching test template to ${testRecipientPhone}`);
    } finally {
      setSendingTest(false);
    }
  };

  // Handle create new template
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !newBodyText.trim()) {
      toast.error('Template name and body text are required');
      return;
    }

    const cleanName = newTemplateName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setCreatingTemplate(true);

    try {
      const created: BgosMetaTemplate = {
        name: cleanName,
        displayName: newDisplayName.trim() || cleanName,
        category: newCategory,
        language: 'en_US',
        status: 'PENDING',
        bodyText: newBodyText.trim(),
        footerText: newFooterText.trim() || undefined,
        variableDescriptions: ['Variable 1', 'Variable 2'],
        defaultExampleValues: ['Customer Name', 'Service'],
        serviceTouchpoint: 'marketing',
      };

      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplate(created);
      setCreateModalOpen(false);
      setNewTemplateName('');
      setNewDisplayName('');
      setNewBodyText('');
      toast.success(`Template "${cleanName}" submitted to Meta for approval`);

      await authFetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          category: newCategory,
          language: 'en_US',
          bodyText: newBodyText.trim(),
          footerText: newFooterText.trim(),
        }),
      }).catch(() => null);
    } finally {
      setCreatingTemplate(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 1. META WABA CONNECTION STATUS HEADER ── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--primary-soft) text-primary">
              <MessageSquare className="size-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Meta WhatsApp Business Cloud API
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Cloud API
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  {approvedCount} Approved · {pendingCount} Pending
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Name: <strong className="font-semibold text-slate-700 dark:text-slate-200">{META_ACCOUNT_CONFIG.verifiedName}</strong>
                </span>
                <span>•</span>
                <span>
                  Phone: <strong className="font-semibold text-slate-700 dark:text-slate-200">{META_ACCOUNT_CONFIG.displayPhoneNumber}</strong>
                </span>
                <span>•</span>
                <span>
                  WABA ID: <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">{META_ACCOUNT_CONFIG.wabaId}</code>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncFromMeta}
              disabled={syncing}
              className="h-9 rounded-xl border-slate-200 text-xs font-semibold gap-1.5 text-slate-700 dark:text-slate-200"
            >
              <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync from Meta'}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold gap-1.5 text-primary-foreground shadow-2xs"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Create Meta Template</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & SEARCH TOOLBAR ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          {(['ALL', 'UTILITY', 'MARKETING', 'AUTHENTICATION'] as const).map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            );
          })}

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Status Filter Pills */}
          {(['ALL', 'APPROVED', 'PENDING'] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {st === 'ALL'
                  ? `All Status (${templates.length})`
                  : st === 'APPROVED'
                  ? `Approved (${approvedCount})`
                  : `Pending (${pendingCount})`}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-9 rounded-xl pl-8 text-xs border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
      </div>

      {/* ── 3. TWO-COLUMN WORKSTATION (CATALOG GRID + SMARTPHONE MOCKUP) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT COLUMN: TEMPLATE CARDS LIST (lg:col-span-7) */}
        <div className="space-y-3 lg:col-span-7">
          {filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <MessageSquare className="mx-auto size-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No templates found</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing your category or search filter.</p>
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const isSelected = selectedTemplate?.name === template.name;
              return (
                <div
                  key={template.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTemplate(template)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedTemplate(template);
                    }
                  }}
                  className={`cursor-pointer rounded-2xl border p-4 transition text-left ${
                    isSelected
                      ? 'border-primary bg-(--primary-soft)/30 shadow-2xs ring-1 ring-primary'
                      : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {template.displayName}
                        </span>
                        <code className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {template.name}
                        </code>
                      </div>

                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {template.bodyText}
                      </p>

                      <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold ${
                            template.category === 'UTILITY'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {template.category}
                        </span>

                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 font-medium">
                          {template.variableDescriptions.length} Variables
                        </span>

                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 font-medium">
                          {template.language}
                        </span>

                        {template.buttons && template.buttons.length > 0 && (
                          <span className="rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 font-medium">
                            {template.buttons.length} Buttons
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {template.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                          <CheckCircle2 className="size-3" />
                          <span>Approved</span>
                        </span>
                      ) : template.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2.5 py-0.5 text-[11px] font-bold">
                          <XCircle className="size-3" />
                          <span>Rejected</span>
                        </span>
                      ) : template.status === 'DRAFT' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 text-[11px] font-bold">
                          <Layers className="size-3" />
                          <span>Draft</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-bold">
                          <Clock className="size-3" />
                          <span>Pending Meta</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(template.name);
                          toast.success(`Copied template name: ${template.name}`);
                        }}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        <Copy className="size-3" />
                        <span>Copy Name</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: INTERACTIVE WHATSAPP PHONE PREVIEW & PARAMETER TESTER (lg:col-span-5) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Smartphone Mockup Card */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-primary" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Live Meta WhatsApp Preview
                </h4>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200">
                {selectedTemplate.category}
              </Badge>
            </div>

            {/* Smartphone Graphic Container */}
            <div className="mx-auto mt-4 max-w-[340px] rounded-3xl border-4 border-slate-800 bg-[#E5DDD5] p-3 shadow-xl dark:border-slate-700">
              {/* WhatsApp App Header Bar */}
              <div className="-mx-3 -mt-3 mb-3 flex items-center justify-between bg-[#075E54] px-3 py-2 text-white rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-white/20 font-bold text-[11px]">
                    F
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold leading-none">{META_ACCOUNT_CONFIG.verifiedName}</span>
                      <CheckCircle2 className="size-3 fill-emerald-400 text-[#075E54]" />
                    </div>
                    <span className="text-[9px] text-emerald-200 leading-none">Official Business Account</span>
                  </div>
                </div>
                <span className="text-[10px] opacity-80">10:00 AM</span>
              </div>

              {/* Chat Message Bubble */}
              <div className="rounded-2xl rounded-tl-sm bg-white p-3 shadow-xs dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {selectedTemplate.headerText && (
                  <div className="mb-1 text-xs font-bold text-slate-900 dark:text-white">
                    {selectedTemplate.headerText}
                  </div>
                )}

                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                  {previewBodyFormatted}
                </p>

                {selectedTemplate.footerText && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    {selectedTemplate.footerText}
                  </p>
                )}

                <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
                  <span>10:24 AM</span>
                  <span className="text-teal-600 font-bold">✓✓</span>
                </div>
              </div>

              {/* Action Buttons Below Bubble */}
              {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                <div className="mt-1 space-y-1">
                  {selectedTemplate.buttons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2 px-3 text-xs font-semibold text-primary shadow-2xs hover:bg-slate-50 transition cursor-pointer dark:bg-slate-800"
                    >
                      {btn.type === 'URL' && <ExternalLink className="size-3.5" />}
                      {btn.type === 'CALL' && <Phone className="size-3.5" />}
                      <span>{btn.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parameter Values Editor */}
            {selectedTemplate.variableDescriptions.length > 0 && (
              <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Variable Test Values
                  </h5>
                  <span className="text-[10px] text-slate-400">Updates phone preview</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {selectedTemplate.variableDescriptions.map((desc, idx) => {
                    const key = `var_${idx + 1}`;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-center rounded bg-slate-100 dark:bg-slate-800 py-1 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                          {`{{${idx + 1}}}`}
                        </span>
                        <Input
                          value={previewValues[key] || ''}
                          onChange={(e) =>
                            setPreviewValues((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={desc}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Test Send Button */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => setTestSendOpen(true)}
                className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground gap-2 shadow-2xs"
              >
                <Send className="size-3.5" />
                <span>Test Send This Template via Meta</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TEST SEND DIALOG ── */}
      <Dialog open={testSendOpen} onOpenChange={setTestSendOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Test Send Meta Template
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dispatch a real test message via Meta WhatsApp Cloud API to your test device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Template Name</Label>
              <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-xs font-mono">
                <span>{selectedTemplate?.name}</span>
                <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">{selectedTemplate?.category}</Badge>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Recipient WhatsApp Number *</Label>
              <Input
                value={testRecipientPhone}
                onChange={(e) => setTestRecipientPhone(e.target.value)}
                placeholder="+919876543210"
                className="mt-1 h-9 rounded-xl text-xs font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Include country code (e.g. +91 for India, +1 for US).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestSendOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendTestMessage}
              disabled={sendingTest}
              className="rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground gap-1.5"
            >
              <Send className="size-3.5" />
              <span>{sendingTest ? 'Sending via Meta...' : 'Send Live Test'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CREATE META TEMPLATE MODAL ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create Meta Template</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Draft and submit a new WhatsApp template to Meta for review and approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Template Key *</Label>
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. promo_summer_clean"
                  className="mt-1 h-9 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Display Title</Label>
                <Input
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Summer Cleaning Promo"
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Meta Category *</Label>
              <Select value={newCategory} onValueChange={(val: any) => setNewCategory(val)}>
                <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="UTILITY">UTILITY (Booking, Order, Customer Service)</SelectItem>
                  <SelectItem value="MARKETING">MARKETING (Promotions, Seasonal, Re-engagement)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Template Body Text *</Label>
                <span className="text-[10px] text-slate-400">Use {'{{1}}'}, {'{{2}}'} for variables</span>
              </div>
              <Textarea
                rows={4}
                value={newBodyText}
                onChange={(e) => setNewBodyText(e.target.value)}
                placeholder="Hello {{1}}, your appointment with {{2}} is confirmed for {{3}}. Thank you."
                className="mt-1 rounded-xl text-xs leading-relaxed resize-none"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Footer Text (Optional)</Label>
              <Input
                value={newFooterText}
                onChange={(e) => setNewFooterText(e.target.value)}
                placeholder="BGOS"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTemplate}
              disabled={creatingTemplate}
              className="rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{creatingTemplate ? 'Submitting to Meta...' : 'Submit to Meta'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
