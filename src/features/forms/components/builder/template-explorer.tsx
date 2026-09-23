'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Check,
  Eye,
  Sparkles,
  Star,
  FileText,
  ChevronRight,
  X,
  Loader2,
  Layers,
  Building2,
  SlidersHorizontal,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FormThumbnailPreview } from '@/components/forms/form-thumbnail-preview';
import { FormPreviewCanvas } from '@/components/forms/form-preview-canvas';
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

const ALL = 'all';
const FEATURED = '__featured__';

const QUICK_SUGGESTIONS = [
  '🎬 2-Part Split Hero',
  'Elementor Split Form',
  'HVAC Quote',
  'Patient Intake',
  'Job Application',
  'Bakery Order',
  'Liability Waiver',
  'Vehicle Inspection',
  'CSAT Survey',
  'Event Registration',
];

export interface TemplateExplorerProps {
  onBackToBuild: () => void;
  onApplyTemplate: (
    template: FormTemplate,
    customTitle: string,
    mode: 'replace' | 'append',
  ) => void;
  currentFieldCount: number;
}

export function TemplateExplorer({
  onBackToBuild,
  onApplyTemplate,
  currentFieldCount,
}: TemplateExplorerProps) {
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'featured' | 'popular' | 'rating' | 'recent'>('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 18;

  // Search results state
  const [results, setResults] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Preview modal state (Jotform Parity)
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [modalActiveTab, setModalActiveTab] = useState<'overview' | 'fields' | 'integrations' | 'faq'>('overview');
  const [customFormTitle, setCustomFormTitle] = useState('');
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // Stable category & industry taxonomy counts
  const allTemplates = useMemo(() => getAllTemplates(), []);
  
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of allTemplates) {
      for (const c of t.categories) m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [allTemplates]);

  const industryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of allTemplates) {
      for (const i of t.industries) {
        if (i !== 'general') m.set(i, (m.get(i) || 0) + 1);
      }
    }
    return m;
  }, [allTemplates]);

  const featuredCount = useMemo(
    () => allTemplates.filter((t) => t.isFeatured).length,
    [allTemplates],
  );

  // Search & filter effect (debounced)
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      setIsLoading(true);

      const cat: TemplateCategoryId | undefined =
        selectedCategory === ALL || selectedCategory === FEATURED
          ? undefined
          : (selectedCategory as TemplateCategoryId);

      const ind: TemplateIndustryId | undefined =
        selectedIndustry === ALL ? undefined : (selectedIndustry as TemplateIndustryId);

      const q = searchQuery.trim() || undefined;

      searchTemplates({
        query: q,
        category: cat,
        industry: ind,
        sort: selectedCategory === FEATURED ? 'featured' : sort === 'featured' ? 'featured' : sort === 'rating' ? 'rating' : 'popular',
        publishedOnly: true,
        limit: 1000,
      })
        .then((hits) => {
          if (cancelled) return;
          let list = hits.map((h) => h.template);
          if (selectedCategory === FEATURED) {
            list = list.filter((t) => t.isFeatured);
          }
          if (sort === 'popular') {
            list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
          } else if (sort === 'rating') {
            list.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
          } else if (sort === 'recent') {
            list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
          }
          setResults(list);
          setCurrentPage(1);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, selectedIndustry, sort]);

  // Preview & apply actions
  const handleOpenPreview = (tpl: FormTemplate) => {
    setPreviewTemplate(tpl);
    setCustomFormTitle(tpl.name);
    setApplyMode(currentFieldCount > 0 ? 'replace' : 'replace');
  };

  const handleConfirmApply = () => {
    if (!previewTemplate) return;
    onApplyTemplate(
      previewTemplate,
      customFormTitle || previewTemplate.name,
      applyMode,
    );
    setPreviewTemplate(null);
  };

  const resetFilters = () => {
    setSelectedCategory(ALL);
    setSelectedIndustry(ALL);
    setSearchQuery('');
  };

  // Pagination
  const totalPages = Math.ceil(results.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }, [results, currentPage, pageSize]);

  const hasActiveFilters =
    selectedCategory !== ALL || selectedIndustry !== ALL || searchQuery.trim().length > 0;

  return (
    <div className="flex-1 flex h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ════ LEFT SIDEBAR — CATEGORIES & INDUSTRIES ════ */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5 text-emerald-600" />
              <span>Categories</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {allTemplates.length.toLocaleString()} Templates Available
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-emerald-600 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Quick Filter Buttons */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedCategory(ALL);
                  setSelectedIndustry(ALL);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === ALL && selectedIndustry === ALL
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="size-4" /> All Templates
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    selectedCategory === ALL && selectedIndustry === ALL
                      ? 'border-white/40 text-white'
                      : 'text-muted-foreground'
                  }`}
                >
                  {allTemplates.length}
                </Badge>
              </button>

              <button
                onClick={() => setSelectedCategory(FEATURED)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === FEATURED
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Star className="size-4 fill-current" /> ⭐ Featured
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    selectedCategory === FEATURED
                      ? 'border-white/40 text-white'
                      : 'text-amber-600 border-amber-300'
                  }`}
                >
                  {featuredCount}
                </Badge>
              </button>
            </div>

            {/* Form Types Section */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Form Types ({TEMPLATE_CATEGORIES.length})
              </h3>
              <div className="space-y-0.5">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = categoryCounts.get(cat.id) || 35;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(isSelected ? ALL : cat.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate pr-2">{cat.label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Industries Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Industry Verticals ({TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').length})
              </h3>
              <div className="space-y-0.5 max-h-60 overflow-y-auto pr-1">
                {TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').map((ind) => {
                  const isSelected = selectedIndustry === ind.id;
                  const count = industryCounts.get(ind.id) || 24;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => setSelectedIndustry(isSelected ? ALL : ind.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        isSelected
                          ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate pr-2">{ind.label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* ════ MAIN CONTENT AREA ════ */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Sticky Top Header Bar */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToBuild}
              className="h-9 gap-1.5 font-semibold text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Builder</span>
            </Button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div>
              <h1 className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="size-4 text-emerald-600" />
                <span>Form Template Library</span>
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Curated industry templates — pre-configured widgets, maps, and signatures.
              </p>
            </div>
          </div>

          {/* Industry Filter Dropdown & Search Input */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="h-9 w-40 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <Building2 className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder="All industries" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>All Industries</SelectItem>
                {TEMPLATE_INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.id} value={ind.id}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates (e.g. 'dental', 'hvac', 'waiver')..."
                className="pl-9 pr-8 h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 sm:px-6 pt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="size-3 text-emerald-600" /> Suggestions:
          </span>
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSearchQuery(s)}
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 text-[10px] font-medium transition"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Sort & Filter Controls Bar */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Showing:</span>
            <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {isLoading ? '…' : results.length.toLocaleString()} templates
            </Badge>

            {selectedCategory !== ALL && (
              <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-white dark:bg-slate-800">
                {selectedCategory === FEATURED ? '⭐ Featured' : getCategoryLabel(selectedCategory)}
                <button onClick={() => setSelectedCategory(ALL)}>
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {selectedIndustry !== ALL && (
              <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-white dark:bg-slate-800">
                {getIndustryLabel(selectedIndustry)}
                <button onClick={() => setSelectedIndustry(ALL)}>
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {searchQuery && (
              <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-white dark:bg-slate-800">
                &ldquo;{searchQuery}&rdquo;
                <button onClick={() => setSearchQuery('')}>
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-emerald-600 hover:underline font-semibold text-[11px] ml-1"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Sort Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
            {[
              { id: 'featured', label: '⭐ Featured' },
              { id: 'popular', label: '🔥 Popular' },
              { id: 'rating', label: '★ Rated' },
              { id: 'recent', label: '🕒 Newest' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                  sort === s.id
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── CARDS GRID (Jotform Parity with FormThumbnailPreview) ─── */}
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex-1">
          {isLoading ? (
            <div className="text-center py-24 space-y-3">
              <Loader2 className="size-8 mx-auto animate-spin text-emerald-600" />
              <p className="text-xs text-muted-foreground font-medium">Loading Form Templates Catalog…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 space-y-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8">
              <FileText className="size-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-sm font-bold text-foreground">No matching templates found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try searching for broader keywords like &ldquo;quote&rdquo;, &ldquo;intake&rdquo;, &ldquo;waiver&rdquo;, or reset your filters.
              </p>
              <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs font-semibold">
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginated.map((tpl) => {
                const primaryCat = tpl.categories[0] || 'general';
                const fieldCount = tpl.schema.fields?.length || 0;
                const widgetCount = tpl.schema.fields?.filter((f) => !!f.widgetType).length || 0;

                return (
                  <div
                    key={tpl.id}
                    className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Visual Form Thumbnail Preview */}
                    <div className="relative cursor-pointer overflow-hidden border-b border-slate-100 dark:border-slate-800/80">
                      <FormThumbnailPreview template={tpl} />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-white/95 dark:bg-slate-900/95 text-[10px] font-bold shadow-xs">
                            {getCategoryLabel(primaryCat)}
                          </Badge>
                          {tpl.industries[0] && tpl.industries[0] !== 'general' && (
                            <Badge variant="outline" className="bg-blue-50/90 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] border-blue-200">
                              {getIndustryLabel(tpl.industries[0])}
                            </Badge>
                          )}
                        </div>

                        {tpl.isFeatured && (
                          <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-xs">
                            <Star className="size-2.5 fill-current" /> Featured
                          </div>
                        )}
                      </div>

                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 p-4 z-20">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(tpl);
                          }}
                          className="bg-white/90 hover:bg-white text-slate-900 font-semibold text-xs shadow-md rounded-xl gap-1.5"
                        >
                          <Eye className="size-3.5 text-emerald-600" /> Preview
                        </Button>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(tpl);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 rounded-xl gap-1.5"
                        >
                          <Sparkles className="size-3.5" /> Use Template
                        </Button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            <span>{tpl.ratingAverage || 4.9}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">({tpl.ratingCount || 42})</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            ⚡ {tpl.usageCount || 450} uses
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-1">
                          {tpl.name}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {tpl.shortDescription}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <FileText className="size-3 text-emerald-600" /> {fieldCount} fields
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPreview(tpl)}
                            className="h-7 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 px-2"
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPreview(tpl)}
                            className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 gap-1"
                          >
                            <span>Use</span>
                            <ArrowRight className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-muted-foreground">
                Showing Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong> ({results.length.toLocaleString()} templates)
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="text-xs"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1 text-xs font-semibold px-2">
                  <span className="p-1 px-2.5 rounded bg-emerald-600 text-white">{currentPage}</span>
                  {currentPage < totalPages && (
                    <span className="text-muted-foreground px-1">... {totalPages}</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="text-xs"
                >
                  Next Page →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════ JOTFORM-STYLE RICH 1280PX PREVIEW & LOAD MODAL ════ */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent
            showCloseButton={false}
            style={{ paddingTop: 0 }}
            className="!max-w-[1280px] sm:!max-w-[1280px] lg:!max-w-[1320px] w-[96vw] max-h-[94vh] flex flex-col !p-0 rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                  {getCategoryLabel(previewTemplate.categories[0] || 'general')}
                </Badge>
                <DialogTitle className="text-base font-bold text-foreground truncate max-w-sm sm:max-w-md">
                  {previewTemplate.name}
                </DialogTitle>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  • {previewTemplate.schema.fields?.length || 0} questions
                </span>
              </div>

              {/* Device Preview Switcher & Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="size-3.5" /> <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === 'tablet'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Tablet Preview"
                  >
                    <Tablet className="size-3.5" /> <span className="hidden sm:inline">Tablet</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Mobile Preview"
                  >
                    <Smartphone className="size-3.5" /> <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                <Button
                  onClick={handleConfirmApply}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm gap-1.5 cursor-pointer"
                >
                  <Sparkles className="size-3.5" /> Use Template
                </Button>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                  title="Close preview"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: 2-Column Split (FormPreviewCanvas + Tabbed Suite) */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              {/* Left Column: Form Preview Canvas with Device Frame */}
              <FormPreviewCanvas template={previewTemplate} device={previewDevice} />

              {/* Right Column: Tabbed Suite & Setup */}
              <div className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between overflow-y-auto max-h-[84vh] p-5 space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-snug">
                      {previewTemplate.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {previewTemplate.shortDescription}
                    </p>
                  </div>

                  {/* Tab Switcher */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModalActiveTab('overview')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        modalActiveTab === 'overview'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalActiveTab('fields')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        modalActiveTab === 'fields'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fields ({previewTemplate.schema.fields?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalActiveTab('integrations')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        modalActiveTab === 'integrations'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Setup
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalActiveTab('faq')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        modalActiveTab === 'faq'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      FAQ
                    </button>
                  </div>

                  {/* Tab 1: Overview */}
                  {modalActiveTab === 'overview' && (
                    <div className="space-y-4 text-xs">
                      {/* Form Title Override */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Form Title in Builder</Label>
                        <Input
                          type="text"
                          value={customFormTitle}
                          onChange={(e) => setCustomFormTitle(e.target.value)}
                          placeholder={previewTemplate.name}
                          className="h-9 text-xs bg-slate-50 dark:bg-slate-800"
                        />
                      </div>

                      {/* Merge Mode */}
                      {currentFieldCount > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <Label className="text-xs font-bold text-foreground">Merge Mode</Label>
                          <RadioGroup
                            value={applyMode}
                            onChange={(val: any) => setApplyMode(val)}
                            className="space-y-2"
                          >
                            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                              <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                              <label htmlFor="mode-replace" className="text-xs cursor-pointer">
                                <p className="font-semibold text-foreground">Replace Current Form</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Overwrites existing canvas fields with this template.
                                </p>
                              </label>
                            </div>

                            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                              <RadioGroupItem value="append" id="mode-append" className="mt-0.5" />
                              <label htmlFor="mode-append" className="text-xs cursor-pointer">
                                <p className="font-semibold text-foreground">Append to Existing</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Keeps existing {currentFieldCount} fields and appends template questions.
                                </p>
                              </label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {/* Tags */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-bold text-foreground">Categories &amp; Industries</p>
                        <div className="flex flex-wrap gap-1.5">
                          {previewTemplate.categories.map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px] font-medium bg-slate-50 dark:bg-slate-800">
                              {getCategoryLabel(c)}
                            </Badge>
                          ))}
                          {previewTemplate.industries.filter((i) => i !== 'general').map((i) => (
                            <Badge key={i} variant="outline" className="text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200">
                              {getIndustryLabel(i)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Fields List */}
                  {modalActiveTab === 'fields' && (
                    <div className="space-y-2 text-xs max-h-[48vh] overflow-y-auto">
                      {(previewTemplate.schema.fields || []).map((f, idx) => (
                        <div
                          key={f.id || idx}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {f.label || `Field ${idx + 1}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              Type: {f.type} {f.widgetType ? `• Widget: ${f.widgetType}` : ''}
                            </p>
                          </div>
                          {f.required && (
                            <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-200">
                              Required
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 3: Setup */}
                  {modalActiveTab === 'integrations' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <p className="font-bold text-foreground">Included Features:</p>
                        <div className="space-y-1.5 text-muted-foreground">
                          <p>✓ Instant AI Copilot &amp; Logic generation</p>
                          <p>✓ 33 Payment Gateways (Stripe, PayPal, Square, etc.)</p>
                          <p>✓ Multi-step Stepper flow support</p>
                          <p>✓ Responsive mobile, tablet, and desktop layouts</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: FAQ */}
                  {modalActiveTab === 'faq' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <p className="font-bold text-foreground">Can I customize all questions?</p>
                        <p className="text-muted-foreground text-[11px]">
                          Yes! Once loaded into the builder, you can add, remove, edit, and re-order all questions, widgets, and themes.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <p className="font-bold text-foreground">Is this template mobile responsive?</p>
                        <p className="text-muted-foreground text-[11px]">
                          Yes, 100% optimized for mobile screens, tablets, and desktop browsers.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Apply CTA */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTemplate(null)}
                    className="text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleConfirmApply}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                  >
                    <Check className="size-4" /> Load Into Form Studio
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default TemplateExplorer;
