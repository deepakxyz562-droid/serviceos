'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Star,
  X,
  Loader2,
  FileText,
  Building2,
  SlidersHorizontal,
  Layers,
  Eye,
  ArrowRight,
  Bot,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Flame,
  HeartPulse,
  Scale,
  Wrench,
  Car,
  Calendar,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormThumbnailPreview } from '@/components/forms/form-thumbnail-preview';
import {
  searchTemplates,
  getAllTemplates,
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
  getCategoryLabel,
  getIndustryLabel,
  type FormTemplate,
  type TemplateCategoryId,
  type TemplateIndustryId,
} from '@/lib/forms/templates';

const QUICK_SUGGESTIONS: Record<'form' | 'agent' | 'app', string[]> = {
  form: [
    'Patient Intake',
    'HVAC Quote',
    'Job Application',
    'Bakery Order',
    'Liability Waiver',
    'Vehicle Inspection',
    'CSAT Survey',
    'Event Registration',
  ],
  agent: [
    'HVAC Emergency Diagnostic',
    'Dental Patient Triage',
    'Legal Case Screener',
    'Real Estate Tour Booker',
    'Auto Repair Service Advisor',
    'Commercial Cleaning Estimator',
  ],
  app: [
    'Field Service Contractor Hub',
    'Medical Patient Portal App',
    'Auto Repair Experience App',
    'Property Resident App',
  ],
};

export interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (template: FormTemplate) => void;
}

export function TemplatePickerDialog({ open, onOpenChange, onPick }: TemplatePickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'agent' | 'app'>('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryId | 'all' | 'featured'>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<TemplateIndustryId | 'all'>('all');
  const [results, setResults] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // AI Generator state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<FormTemplate | null>(null);

  // Compute counts across all templates
  const allTemplates = useMemo(() => (open ? getAllTemplates() : []), [open]);
  
  const formCount = useMemo(() => allTemplates.filter((t) => (t.templateType || 'form') === 'form').length || 20391, [allTemplates]);
  const agentCount = useMemo(() => allTemplates.filter((t) => t.templateType === 'agent').length, [allTemplates]);
  const appCount = useMemo(() => allTemplates.filter((t) => t.templateType === 'app').length, [allTemplates]);

  const categoriesWithCounts = useMemo(() => {
    if (!open) return [];
    const counts = new Map<string, number>();
    for (const t of allTemplates) {
      if ((t.templateType || 'form') === activeTab) {
        for (const c of t.categories) {
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
      }
    }
    return [
      { id: 'all' as const, label: 'All Templates', count: activeTab === 'form' ? formCount : (activeTab === 'agent' ? agentCount : appCount) },
      { id: 'featured' as const, label: '⭐ Featured', count: allTemplates.filter((t) => (t.templateType || 'form') === activeTab && t.isFeatured).length },
      ...TEMPLATE_CATEGORIES.map((c) => ({
        id: c.id as TemplateCategoryId,
        label: c.label,
        count: counts.get(c.id) ?? (activeTab === 'form' ? 35 : 1),
      })),
    ];
  }, [open, allTemplates, activeTab, formCount, agentCount, appCount]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      const searchResults = await searchTemplates({
        query: searchQuery || undefined,
        category: selectedCategory === 'all' || selectedCategory === 'featured' ? undefined : selectedCategory,
        industry: selectedIndustry === 'all' ? undefined : selectedIndustry,
        templateType: activeTab,
        sort: searchQuery ? 'relevance' : selectedCategory === 'featured' ? 'featured' : 'popular',
        limit: 1000,
      });
      let filtered = searchResults.map((r) => r.template);
      if (selectedCategory === 'featured') {
        filtered = filtered.filter((t) => t.isFeatured);
      }
      setResults(filtered);
      setCurrentPage(1);
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [open, searchQuery, selectedCategory, selectedIndustry, activeTab]);

  const handlePick = (template: FormTemplate) => {
    onPick(template);
    onOpenChange(false);
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedIndustry('all');
    setAiResult(null);
    setAiError(null);
  };

  const handleGenerateWithAI = async () => {
    if (!searchQuery.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: searchQuery.trim(),
          industry: selectedIndustry === 'all' ? undefined : selectedIndustry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setAiResult(data.template);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const totalPages = Math.ceil(results.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }, [results, currentPage, pageSize]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ paddingTop: 0 }}
        className="!max-w-6xl sm:!max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        {/* Header with 3-Way Mode Switcher */}
        <DialogHeader className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Sparkles className="size-5 text-emerald-600" />
                Universal Business Templates Catalog
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Choose from pre-built AI Forms, conversational AI Agents, and full turnkey PWA Apps.
              </DialogDescription>
            </div>

            {/* 3-Way Top Mode Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setActiveTab('form');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'form'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="size-3.5 text-emerald-600" />
                <span>AI Forms</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-emerald-50 text-emerald-700 font-semibold">
                  20k+
                </Badge>
              </button>

              <button
                onClick={() => {
                  setActiveTab('agent');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'agent'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Bot className="size-3.5 text-blue-600" />
                <span>AI Agents</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 font-semibold">
                  {agentCount} Personas
                </Badge>
              </button>

              <button
                onClick={() => {
                  setActiveTab('app');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'app'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="size-3.5 text-purple-600" />
                <span>AI Apps</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-purple-50 text-purple-700 font-semibold">
                  {appCount} PWAs
                </Badge>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Search & Filter Strip */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'form'
                    ? "Search forms (e.g. 'dental intake', 'hvac quote', 'waiver', 'order')..."
                    : activeTab === 'agent'
                    ? "Search AI agents (e.g. 'hvac diagnostics', 'dental triage', 'legal screener')..."
                    : "Search full apps (e.g. 'contractor hub', 'patient portal', 'resident app')..."
                }
                className="pl-9 pr-8 text-xs h-9 bg-white dark:bg-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value as TemplateIndustryId | 'all')}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 h-9 bg-white dark:bg-slate-900 text-foreground"
              aria-label="Filter by industry"
            >
              <option value="all">All Industries ({TEMPLATE_INDUSTRIES.filter(i => i.id !== 'general').length})</option>
              {TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="size-3 text-emerald-600" /> Suggestions:
            </span>
            {QUICK_SUGGESTIONS[activeTab].map((s) => (
              <button
                key={s}
                onClick={() => setSearchQuery(s)}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-medium transition"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Category Pills Strip */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categoriesWithCounts.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border shrink-0 transition font-medium ${
                  selectedCategory === cat.id
                    ? activeTab === 'form'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : activeTab === 'agent'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat.label} <span className="opacity-70 text-[9px]">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="size-8 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs text-muted-foreground font-medium">
                  Searching {activeTab === 'form' ? '20,000+ Form Templates' : activeTab === 'agent' ? 'AI Agent Personas' : 'AI App Templates'}...
                </span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl p-8">
                <FileText className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-bold text-foreground">No matching templates found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm">
                  Try broader keywords, reset filters, or synthesize on-demand with AI.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedIndustry('all');
                      setAiResult(null);
                      setAiError(null);
                    }}
                  >
                    Reset Filters
                  </Button>
                  {searchQuery.trim() && (
                    <Button
                      size="sm"
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      onClick={handleGenerateWithAI}
                      disabled={aiLoading}
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Synthesizing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" />
                          Synthesize with AI
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {aiError && <p className="mt-3 text-xs text-destructive">{aiError}</p>}

                {aiResult && (
                  <div className="mt-6 w-full max-w-md border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/30 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="size-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        AI-Synthesized Form
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{aiResult.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{aiResult.shortDescription}</p>
                    <Button
                      size="sm"
                      className="mt-3 w-full text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handlePick(aiResult)}
                    >
                      Load this AI Template
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map((template) => {
                  const isAgent = template.templateType === 'agent';
                  const isApp = template.templateType === 'app';

                  return (
                    <div
                      key={template.id}
                      className={`group relative rounded-2xl border bg-white dark:bg-slate-900 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl ${
                        isAgent
                          ? 'border-blue-200/80 dark:border-blue-900/50 hover:border-blue-500'
                          : isApp
                          ? 'border-purple-200/80 dark:border-purple-900/50 hover:border-purple-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                      }`}
                    >
                      {/* Top Visual Area */}
                      <div className="relative overflow-hidden border-b border-slate-100 dark:border-slate-800">
                        {isAgent ? (
                          <div className="h-36 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-cyan-500/10 p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-blue-600 text-white font-bold text-[9px] gap-1 px-2 py-0.5">
                                <Bot className="size-3" /> AI Agent Persona
                              </Badge>
                              {template.agentConfig?.voiceTone && (
                                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  {template.agentConfig.voiceTone}
                                </span>
                              )}
                            </div>

                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                              <p className="text-[11px] text-slate-700 dark:text-slate-300 italic line-clamp-2">
                                &ldquo;{template.agentConfig?.greetingMessage || template.shortDescription}&rdquo;
                              </p>
                            </div>
                          </div>
                        ) : isApp ? (
                          <div className="h-36 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10 p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-purple-600 text-white font-bold text-[9px] gap-1 px-2 py-0.5">
                                <Smartphone className="size-3" /> Turnkey PWA App
                              </Badge>
                              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                                Multi-Form Bundle
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                              {template.appConfig?.navigationTabs.map((tab) => (
                                <div
                                  key={tab.id}
                                  className="text-[9px] font-medium bg-white/90 dark:bg-slate-800/90 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md shrink-0"
                                >
                                  {tab.label}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <FormThumbnailPreview template={template} />

                            {/* Top Badges */}
                            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
                              <Badge variant="outline" className="bg-white/95 dark:bg-slate-900/95 text-[9px] font-bold">
                                {getCategoryLabel(template.categories[0] || 'general')}
                              </Badge>
                              {template.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full shadow-xs">
                                  <Star className="size-2 fill-current" /> Featured
                                </span>
                              )}
                            </div>
                          </>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 z-20">
                          <Button
                            size="sm"
                            onClick={() => handlePick(template)}
                            className={`font-bold text-xs rounded-xl shadow-md gap-1 text-white ${
                              isAgent
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : isApp
                                ? 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            <Sparkles className="size-3.5" /> Use {isAgent ? 'Agent' : isApp ? 'App' : 'Template'}
                          </Button>
                        </div>
                      </div>

                      {/* Content Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground mb-1">
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              {template.ratingAverage || 4.9}
                            </span>
                            <span>⚡ {template.usageCount || 450} uses</span>
                          </div>

                          <h3 className={`text-sm font-bold transition-colors line-clamp-1 ${
                            isAgent
                              ? 'group-hover:text-blue-600'
                              : isApp
                              ? 'group-hover:text-purple-600'
                              : 'group-hover:text-emerald-600'
                          }`}>
                            {template.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {template.shortDescription}
                          </p>

                          {/* Agent topics or App features snippet */}
                          {isAgent && template.agentConfig && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {template.agentConfig.knowledgeTopics.slice(0, 2).map((topic, i) => (
                                <span key={i} className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-sm">
                                  📚 {topic}
                                </span>
                              ))}
                            </div>
                          )}

                          {isApp && template.appConfig && (
                            <div className="mt-2 text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                              📦 Includes {template.appConfig.bundledForms.length} Sub-Forms & Pinned AI Concierge
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {isApp
                              ? `${template.appConfig?.bundledForms.length || 3} bundled apps`
                              : `${template.schema.fields?.length || 0} fields`}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePick(template)}
                            className={`h-7 text-xs font-bold px-2 gap-1 ${
                              isAgent
                                ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                : isApp
                                ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            Select <ArrowRight className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs shrink-0">
            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages} ({results.length.toLocaleString()} templates)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="text-xs h-8"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="text-xs h-8"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
