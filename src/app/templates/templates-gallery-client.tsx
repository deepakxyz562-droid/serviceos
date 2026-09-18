'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Star,
  X,
  FileText,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  Eye,
  Layers,
  ChevronRight,
  Filter,
  Flame,
  Wrench,
  Zap,
  Shield,
  Building2,
  Calendar,
  CreditCard,
  ShoppingCart,
  MessageSquare,
  Users,
  Briefcase,
  HeartPulse,
  Scale,
  GraduationCap,
  Car,
  Utensils,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FormRuntimeRenderer } from '@/features/forms/components/runtime/form-runtime-renderer';
import { FormThumbnailPreview } from '@/components/forms/form-thumbnail-preview';
import type { FormTemplate } from '@/lib/forms/templates';
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
  getCategoryLabel,
  getIndustryLabel,
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

interface TemplatesGalleryClientProps {
  templates: FormTemplate[];
}

/**
 * Universal helper to clone and open a template in the form builder.
 * Stashes template ID and full schema into storage, and smoothly routes
 * authenticated users to the builder or unauthenticated users to signup.
 */
export function navigateToUseTemplate(template: FormTemplate) {
  try {
    sessionStorage.setItem('pendingTemplateId', template.id);
    localStorage.setItem('fieseros_pending_template_id', template.id);
    localStorage.setItem(
      'fieseros_pending_template',
      JSON.stringify({
        id: template.id,
        name: template.name,
        shortDescription: template.shortDescription,
        schema: template.schema,
      })
    );
  } catch {
    // Storage may be restricted in private mode
  }

  // Detect active authentication
  let isAuthenticated = false;
  try {
    const rawAuth = localStorage.getItem('fieseros_auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      if (parsed?.isAuthenticated && parsed?.token) {
        isAuthenticated = true;
      }
    }
  } catch {}

  if (isAuthenticated) {
    window.location.href = `/?view=formBuilder&templateId=${encodeURIComponent(template.id)}`;
  } else {
    window.location.href = `/?auth=signup&returnUrl=${encodeURIComponent('/?view=formBuilder&templateId=' + template.id)}&templateId=${encodeURIComponent(template.id)}`;
  }
}

export function TemplatesGalleryClient({ templates }: TemplatesGalleryClientProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [sort, setSort] = useState<'featured' | 'popular' | 'rating' | 'recent'>('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Quick Preview Modal State (Jotform Parity)
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Compute live category & industry counts
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) {
      for (const c of t.categories) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return counts;
  }, [templates]);

  const industryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) {
      for (const i of t.industries) {
        if (i !== 'general') {
          counts.set(i, (counts.get(i) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [templates]);

  // Filtered & Sorted Templates
  const filtered = useMemo(() => {
    let result = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.categories.includes(selectedCategory as any));
    }

    // Filter by industry
    if (selectedIndustry !== 'all') {
      result = result.filter((t) => t.industries.includes(selectedIndustry as any));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.shortDescription.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          t.industries.some((i) => i.toLowerCase().includes(q) || getIndustryLabel(i).toLowerCase().includes(q)) ||
          t.categories.some((c) => c.toLowerCase().includes(q) || getCategoryLabel(c).toLowerCase().includes(q))
      );
    }

    // Sorting
    const sorted = [...result];
    if (sort === 'featured') {
      sorted.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return (b.usageCount || 0) - (a.usageCount || 0);
      });
    } else if (sort === 'popular') {
      sorted.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    } else if (sort === 'rating') {
      sorted.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    }

    return sorted;
  }, [templates, selectedCategory, selectedIndustry, searchQuery, sort]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedIndustry, sort]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const hasActiveFilters = selectedCategory !== 'all' || selectedIndustry !== 'all' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedIndustry('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-8">
      {/* Top Search & Quick Suggestions Hero Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="relative max-w-3xl mx-auto">
          <Search className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 20,000+ templates (e.g. 'dental intake', 'hvac quote', 'job application', 'waiver')..."
            className="pl-12 pr-10 text-base h-12 rounded-xl border-slate-300 dark:border-slate-700 shadow-inner bg-slate-50/50 dark:bg-slate-950/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-1"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="size-3.5 text-emerald-600" /> Popular Searches:
          </span>
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setSearchQuery(suggestion)}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-colors text-xs font-medium"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout (Sticky Sidebar + Templates Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* DESKTOP LEFT SIDEBAR */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6 sticky top-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm max-h-[85vh] overflow-y-auto">
          {/* Header & Clear */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <SlidersHorizontal className="size-4 text-emerald-600" />
              <span>Filter Catalog</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-emerald-600 hover:underline font-semibold"
              >
                Reset All
              </button>
            )}
          </div>

          {/* All Templates Root Button */}
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedIndustry('all');
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === 'all' && selectedIndustry === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="size-4" /> All 20,000+ Templates
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                selectedCategory === 'all' && selectedIndustry === 'all'
                  ? 'border-white/30 text-white'
                  : 'text-muted-foreground'
              }`}
            >
              {templates.length}
            </Badge>
          </button>

          {/* Form Categories Accordion */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Form Types ({TEMPLATE_CATEGORIES.length})
            </h4>
            <div className="space-y-1">
              {TEMPLATE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = categoryCounts.get(cat.id) || 45;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
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

          {/* Industries Accordion */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Industries ({TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').length})
            </h4>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').map((ind) => {
                const isSelected = selectedIndustry === ind.id;
                const count = industryCounts.get(ind.id) || 30;
                return (
                  <button
                    key={ind.id}
                    onClick={() => setSelectedIndustry(isSelected ? 'all' : ind.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-semibold'
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
        </aside>

        {/* RIGHT MAIN TEMPLATES CONTENT */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls Bar: Mobile Filter Trigger, Sort Tabs & Result Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Button */}
              <div className="lg:hidden">
                <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs">
                      <Filter className="size-3.5 text-emerald-600" />
                      Filters {hasActiveFilters ? '(Active)' : ''}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filter 20,000+ Templates</SheetTitle>
                    </SheetHeader>
                    <div className="py-4 space-y-5 text-xs">
                      <div>
                        <h4 className="font-bold text-foreground mb-2">Category</h4>
                        <div className="space-y-1">
                          {TEMPLATE_CATEGORIES.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setSelectedCategory(c.id);
                                setMobileFilterOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded ${
                                selectedCategory === c.id ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <div>
                <p className="text-sm font-bold text-foreground">
                  {filtered.length.toLocaleString()} Templates Found
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedCategory !== 'all' ? getCategoryLabel(selectedCategory) : 'All Form Categories'}{' '}
                  {selectedIndustry !== 'all' ? `• ${getIndustryLabel(selectedIndustry)}` : ''}
                </p>
              </div>
            </div>

            {/* Sort Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
              {[
                { id: 'featured', label: '⭐ Featured' },
                { id: 'popular', label: '🔥 Most Popular' },
                { id: 'rating', label: '★ Top Rated' },
                { id: 'recent', label: '🕒 Newest' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSort(s.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    sort === s.id
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Active Filters:</span>
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                  {getCategoryLabel(selectedCategory)}
                  <button onClick={() => setSelectedCategory('all')}>
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {selectedIndustry !== 'all' && (
                <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-800 border-blue-200">
                  {getIndustryLabel(selectedIndustry)}
                  <button onClick={() => setSelectedIndustry('all')}>
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  &ldquo;{searchQuery}&rdquo;
                  <button onClick={() => setSearchQuery('')}>
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:underline ml-1">
                Clear all
              </button>
            </div>
          )}

          {/* TEMPLATE CARDS GRID */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl">
              <FileText className="size-12 text-muted-foreground mb-3 opacity-40" />
              <h3 className="text-base font-bold text-foreground">No matching templates found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Try searching for broader keywords like &ldquo;intake&rdquo;, &ldquo;hvac&rdquo;, &ldquo;waiver&rdquo;, or reset your filters.
              </p>
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 text-xs">
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginated.map((template) => (
                <ModernTemplateCard
                  key={template.id}
                  template={template}
                  onQuickPreview={() => setPreviewTemplate(template)}
                  onUseTemplate={() => navigateToUseTemplate(template)}
                />
              ))}
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-muted-foreground">
                Showing Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong> ({filtered.length.toLocaleString()} total templates)
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

      {/* JOTFORM-STYLE INTERACTIVE QUICK PREVIEW MODAL */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col p-0 rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl">
            {/* Modal Header (Top App Bar with Device Switcher & Quick CTA) */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    {getCategoryLabel(previewTemplate.categories[0] || 'general')}
                  </Badge>
                  {previewTemplate.industries[0] && previewTemplate.industries[0] !== 'general' && (
                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                      {getIndustryLabel(previewTemplate.industries[0])}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground font-medium">
                    • {previewTemplate.schema.fields?.length || 0} questions
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground truncate">
                  {previewTemplate.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                  {previewTemplate.shortDescription}
                </DialogDescription>
              </div>

              {/* Device Preview Switcher & Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      previewDevice === 'desktop'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Desktop Preview (Full Width)"
                  >
                    <Monitor className="size-3.5" /> <span className="hidden md:inline">Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      previewDevice === 'tablet'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Tablet Preview (iPad Frame)"
                  >
                    <Tablet className="size-3.5" /> <span className="hidden md:inline">Tablet</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      previewDevice === 'mobile'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Mobile Preview (Phone Frame)"
                  >
                    <Smartphone className="size-3.5" /> <span className="hidden md:inline">Mobile</span>
                  </button>
                </div>

                <Button
                  onClick={() => navigateToUseTemplate(previewTemplate)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm gap-1.5"
                >
                  <Sparkles className="size-3.5" /> Use Template
                </Button>
              </div>
            </div>

            {/* Modal Body: Interactive Form Canvas */}
            <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 flex items-start justify-center min-h-[400px]">
              {previewDevice === 'mobile' ? (
                /* High-fidelity Smartphone Device Shell */
                <div className="w-[360px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 transition-all">
                  {/* Speaker & Dynamic Notch */}
                  <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <div className="w-8 h-1 bg-slate-800 rounded-full" />
                  </div>
                  {/* Screen Content */}
                  <div className="bg-white dark:bg-slate-900 rounded-[24px] p-4 max-h-[68vh] overflow-y-auto shadow-inner">
                    <FormRuntimeRenderer
                      formName={previewTemplate.name}
                      schema={previewTemplate.schema}
                      previewMode={true}
                    />
                  </div>
                </div>
              ) : previewDevice === 'tablet' ? (
                /* Tablet Shell */
                <div className="w-full max-w-xl bg-slate-900 rounded-[28px] p-4 shadow-2xl border-4 border-slate-800 transition-all">
                  <div className="bg-white dark:bg-slate-900 rounded-[18px] p-6 max-h-[70vh] overflow-y-auto shadow-inner">
                    <FormRuntimeRenderer
                      formName={previewTemplate.name}
                      schema={previewTemplate.schema}
                      previewMode={true}
                    />
                  </div>
                </div>
              ) : (
                /* Desktop Paper Form Canvas */
                <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xl transition-all">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1">
                      <Sparkles className="size-3.5" /> Official Fieseros Form Template
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{previewTemplate.name}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{previewTemplate.shortDescription}</p>
                  </div>
                  <FormRuntimeRenderer
                    formName={previewTemplate.name}
                    schema={previewTemplate.schema}
                    previewMode={true}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <Lock className="size-3 text-emerald-600" /> 100% Free &amp; Customizable
                </span>
                <span className="hidden sm:inline text-muted-foreground">•</span>
                <span className="hidden sm:inline">⚡ 33 Payment Gateways &amp; OTP Verification Supported</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href={`/templates/${previewTemplate.categories[0] || 'general'}/${previewTemplate.id}`}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Full Details Page <ExternalLink className="size-3" />
                </Link>
                <Button
                  size="sm"
                  onClick={() => navigateToUseTemplate(previewTemplate)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs"
                >
                  Use Template →
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/**
 * Modern Jotform-Style Template Card Component
 */
function ModernTemplateCard({
  template,
  onQuickPreview,
  onUseTemplate,
}: {
  template: FormTemplate;
  onQuickPreview: () => void;
  onUseTemplate: () => void;
}) {
  const fieldCount = template.schema.fields?.length || 0;
  const primaryCat = template.categories[0] || 'general';
  const detailHref = `/templates/${primaryCat}/${template.id}`;

  return (
    <div className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Visual Form Thumbnail Preview Area (Jotform Parity) */}
      <div className="relative cursor-pointer overflow-hidden border-b border-slate-100 dark:border-slate-800/80">
        <FormThumbnailPreview template={template} />

        {/* Top Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="bg-white/95 dark:bg-slate-900/95 text-[10px] font-bold shadow-xs">
              {getCategoryLabel(primaryCat)}
            </Badge>
            {template.industries[0] && template.industries[0] !== 'general' && (
              <Badge variant="outline" className="bg-blue-50/90 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] border-blue-200">
                {getIndustryLabel(template.industries[0])}
              </Badge>
            )}
          </div>

          {template.isFeatured && (
            <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-xs">
              <Star className="size-2.5 fill-current" /> Featured
            </div>
          )}
        </div>

        {/* Hover Action Overlay (Jotform Style) */}
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 p-4 z-20">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onQuickPreview();
            }}
            className="bg-white/90 hover:bg-white text-slate-900 font-semibold text-xs shadow-md rounded-xl gap-1.5 scale-95 group-hover:scale-100 transition-transform"
          >
            <Eye className="size-3.5 text-emerald-600" /> Preview
          </Button>

          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onUseTemplate();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 rounded-xl gap-1.5 scale-95 group-hover:scale-100 transition-transform"
          >
            <Sparkles className="size-3.5" /> Use Template
          </Button>
        </div>
      </div>

      {/* Card Content & Meta Info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span>{template.ratingAverage || 4.9}</span>
              <span className="text-[10px] text-muted-foreground font-normal">({template.ratingCount || 48})</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              ⚡ {template.usageCount || 450} uses
            </span>
          </div>

          <Link href={detailHref}>
            <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-1">
              {template.name}
            </h3>
          </Link>

          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {template.shortDescription}
          </p>
        </div>

        {/* Action Row */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onQuickPreview}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          >
            <Eye className="size-3.5 text-emerald-600" /> Quick Preview
          </button>

          <button
            type="button"
            onClick={onUseTemplate}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 group-hover:translate-x-0.5 transition-all"
          >
            Use Template <ArrowRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
