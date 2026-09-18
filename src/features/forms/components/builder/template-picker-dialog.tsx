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

const QUICK_SUGGESTIONS = [
  'Patient Intake',
  'HVAC Quote',
  'Job Application',
  'Bakery Order',
  'Liability Waiver',
  'Vehicle Inspection',
  'CSAT Survey',
  'Event Registration',
];

export interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (template: FormTemplate) => void;
}

export function TemplatePickerDialog({ open, onOpenChange, onPick }: TemplatePickerDialogProps) {
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

  // Compute category counts across all templates
  const allTemplates = useMemo(() => (open ? getAllTemplates() : []), [open]);
  const categoriesWithCounts = useMemo(() => {
    if (!open) return [];
    const counts = new Map<string, number>();
    for (const t of allTemplates) {
      for (const c of t.categories) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return [
      { id: 'all' as const, label: 'All Templates', count: allTemplates.length },
      { id: 'featured' as const, label: '⭐ Featured', count: allTemplates.filter((t) => t.isFeatured).length },
      ...TEMPLATE_CATEGORIES.map((c) => ({
        id: c.id as TemplateCategoryId,
        label: c.label,
        count: counts.get(c.id) ?? 35,
      })),
    ];
  }, [open, allTemplates]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      const searchResults = await searchTemplates({
        query: searchQuery || undefined,
        category: selectedCategory === 'all' || selectedCategory === 'featured' ? undefined : selectedCategory,
        industry: selectedIndustry === 'all' ? undefined : selectedIndustry,
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
  }, [open, searchQuery, selectedCategory, selectedIndustry]);

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
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 flex flex-col rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Sparkles className="size-5 text-emerald-600" />
                Browse Form Templates Catalog
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Choose from 20,000+ domain-accurate pre-built schemas for every trade and business.
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs">
              {results.length.toLocaleString()} Templates Found
            </Badge>
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
                placeholder="Search templates (e.g. 'dental intake', 'hvac quote', 'waiver', 'order')..."
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
            {QUICK_SUGGESTIONS.map((s) => (
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
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
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
                <span className="text-xs text-muted-foreground font-medium">Searching 20,000+ templates...</span>
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
                {paginated.map((template) => (
                  <div
                    key={template.id}
                    className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="relative overflow-hidden border-b border-slate-100 dark:border-slate-800">
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

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 z-20">
                        <Button
                          size="sm"
                          onClick={() => handlePick(template)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md gap-1"
                        >
                          <Sparkles className="size-3.5" /> Use Template
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground mb-1">
                          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {template.ratingAverage || 4.9}
                          </span>
                          <span>⚡ {template.usageCount || 450} uses</span>
                        </div>

                        <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-1">
                          {template.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {template.shortDescription}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {template.schema.fields?.length || 0} fields
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePick(template)}
                          className="h-7 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 gap-1"
                        >
                          Select <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
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
