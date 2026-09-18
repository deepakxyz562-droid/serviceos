'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  ChevronLeft,
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
  HelpCircle,
  Share2,
  Bot,
  Database,
  Globe,
  Workflow,
  Sparkle,
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
import { FormPreviewCanvas } from '@/components/forms/form-preview-canvas';
import type { FormTemplate } from '@/lib/forms/templates';
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
  getCategoryLabel,
  getIndustryLabel,
} from '@/lib/forms/templates';

import { navigateToUseTemplate } from '@/lib/forms/templates/use-template-action';

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
  initialTemplates?: FormTemplate[];
  templates?: FormTemplate[];
  initialTotalCount?: number;
  categoryCounts?: Record<string, number>;
  industryCounts?: Record<string, number>;
  initialCategory?: string;
  initialIndustry?: string;
}

export function TemplatesGalleryClient({
  initialTemplates,
  templates: legacyTemplates,
  initialTotalCount,
  categoryCounts: categoryCountsProp,
  industryCounts: industryCountsProp,
  initialCategory = 'all',
  initialIndustry = 'all',
}: TemplatesGalleryClientProps) {
  const seedTemplates = initialTemplates || legacyTemplates || [];
  const seedTotal = initialTotalCount ?? (legacyTemplates ? legacyTemplates.length : seedTemplates.length);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(initialIndustry);
  const [sort, setSort] = useState<'featured' | 'popular' | 'rating' | 'recent'>('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Items State & High-Speed Cache
  const [items, setItems] = useState<FormTemplate[]>(seedTemplates);
  const [totalCount, setTotalCount] = useState<number>(seedTotal);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = React.useRef<Map<string, { templates: FormTemplate[]; total: number }>>(new Map());

  // Quick Preview Modal State (Jotform Parity with Hybrid SEO URL routing)
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [modalActiveTab, setModalActiveTab] = useState<'overview' | 'fields' | 'integrations' | 'faq'>('overview');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Store initial search in cache
  useEffect(() => {
    cacheRef.current.set(`${initialCategory}|${initialIndustry}||featured|1`, {
      templates: seedTemplates,
      total: seedTotal,
    });
  }, [seedTemplates, seedTotal, initialCategory, initialIndustry]);

  // Debounced search query & fast dynamic fetch (<2ms server response)
  useEffect(() => {
    const isInitial =
      currentPage === 1 &&
      selectedCategory === initialCategory &&
      selectedIndustry === initialIndustry &&
      !searchQuery.trim() &&
      sort === 'featured';

    if (isInitial && seedTemplates.length > 0) {
      setItems(seedTemplates);
      setTotalCount(seedTotal);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${selectedCategory}|${selectedIndustry}|${searchQuery.trim()}|${sort}|${currentPage}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setItems(cached.templates);
      setTotalCount(cached.total);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(pageSize),
          sort,
        });
        if (selectedCategory !== 'all') params.set('category', selectedCategory);
        if (selectedIndustry !== 'all') params.set('industry', selectedIndustry);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/templates/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.templates || []);
          setTotalCount(data.total || 0);
          cacheRef.current.set(cacheKey, {
            templates: data.templates || [],
            total: data.total || 0,
          });
        }
      } catch (err) {
        console.error('Template search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [currentPage, selectedCategory, selectedIndustry, searchQuery, sort, initialTemplates, initialTotalCount, pageSize]);

  const openPreview = useCallback(async (template: FormTemplate) => {
    setPreviewTemplate(template);
    setModalActiveTab('overview');
    if (typeof window !== 'undefined') {
      const primaryCat = template.categories[0] || 'general';
      try {
        window.history.replaceState({ previewTemplateId: template.id }, '', `/templates/${primaryCat}/${template.id}`);
      } catch {
        // ignore
      }
    }

    // Ensure full schema is loaded
    if (!template.schema || !template.schema.fields || template.schema.fields.length === 0) {
      try {
        const res = await fetch(`/api/templates/${template.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.template) {
            setPreviewTemplate(data.template);
          }
        }
      } catch (e) {
        console.error('Failed to load full template details:', e);
      }
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
    if (typeof window !== 'undefined') {
      const cleanUrl = selectedCategory !== 'all' ? `/templates?category=${selectedCategory}` : '/templates';
      try {
        window.history.replaceState(null, '', cleanUrl);
      } catch {
        // ignore
      }
    }
  }, [selectedCategory]);

  // Handle browser back / forward navigation seamlessly
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.previewTemplateId) {
        setPreviewTemplate(null);
      } else {
        const found = items.find((t) => t.id === e.state.previewTemplateId);
        if (found) {
          openPreview(found);
        } else {
          fetch(`/api/templates/${e.state.previewTemplateId}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.template) setPreviewTemplate(d.template);
            })
            .catch(() => {});
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [items, openPreview]);

  // Compute live category & industry counts maps from props
  const categoryCounts = useMemo(() => new Map(Object.entries(categoryCountsProp || {})), [categoryCountsProp]);
  const industryCounts = useMemo(() => new Map(Object.entries(industryCountsProp || {})), [industryCountsProp]);

  // Modal navigation index and cycling handlers
  const currentPreviewIndex = useMemo(() => {
    if (!previewTemplate) return -1;
    return items.findIndex((t) => t.id === previewTemplate.id);
  }, [items, previewTemplate]);

  const handlePrevTemplate = useCallback(() => {
    if (items.length === 0) return;
    const prevIdx = currentPreviewIndex <= 0 ? items.length - 1 : currentPreviewIndex - 1;
    openPreview(items[prevIdx]);
  }, [items, currentPreviewIndex, openPreview]);

  const handleNextTemplate = useCallback(() => {
    if (items.length === 0) return;
    const nextIdx = currentPreviewIndex >= items.length - 1 ? 0 : currentPreviewIndex + 1;
    openPreview(items[nextIdx]);
  }, [items, currentPreviewIndex, openPreview]);

  // Keyboard navigation when preview modal is active
  useEffect(() => {
    if (!previewTemplate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevTemplate();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextTemplate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewTemplate, handlePrevTemplate, handleNextTemplate]);

  // Related templates in preview modal
  const relatedTemplates = useMemo(() => {
    if (!previewTemplate) return [];
    const primaryCat = previewTemplate.categories[0];
    const primaryInd = previewTemplate.industries[0];
    return items
      .filter(
        (t) =>
          t.id !== previewTemplate.id &&
          (t.categories.includes(primaryCat) || (primaryInd && primaryInd !== 'general' && t.industries.includes(primaryInd)))
      )
      .slice(0, 4);
  }, [previewTemplate, items]);

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Reset page on filter change
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleIndustryChange = (ind: string) => {
    setSelectedIndustry(ind);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedIndustry !== 'all' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedIndustry('all');
    setSearchQuery('');
    setCurrentPage(1);
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
              {(totalCount || 20391).toLocaleString()}
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
                  {totalCount.toLocaleString()} Templates Found
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
          {items.length === 0 && !isLoading ? (
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
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {items.map((template) => (
                <ModernTemplateCard
                  key={template.id}
                  template={template}
                  onQuickPreview={() => openPreview(template)}
                  onUseTemplate={() => navigateToUseTemplate(template)}
                />
              ))}
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-muted-foreground">
                Showing Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages.toLocaleString()}</strong> ({totalCount.toLocaleString()} total templates)
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(p - 1, 1));
                    window.scrollTo({ top: 250, behavior: 'smooth' });
                  }}
                  className="text-xs h-8"
                >
                  ← Prev
                </Button>

                {/* Page number buttons */}
                {currentPage > 2 && (
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      window.scrollTo({ top: 250, behavior: 'smooth' });
                    }}
                    className="size-8 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    1
                  </button>
                )}
                {currentPage > 3 && <span className="text-xs text-muted-foreground px-0.5">...</span>}

                {currentPage > 1 && (
                  <button
                    onClick={() => {
                      setCurrentPage(currentPage - 1);
                      window.scrollTo({ top: 250, behavior: 'smooth' });
                    }}
                    className="size-8 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {currentPage - 1}
                  </button>
                )}

                <span className="size-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {currentPage}
                </span>

                {currentPage < totalPages && (
                  <button
                    onClick={() => {
                      setCurrentPage(currentPage + 1);
                      window.scrollTo({ top: 250, behavior: 'smooth' });
                    }}
                    className="size-8 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {currentPage + 1}
                  </button>
                )}

                {currentPage < totalPages - 2 && <span className="text-xs text-muted-foreground px-0.5">...</span>}
                {currentPage < totalPages - 1 && (
                  <button
                    onClick={() => {
                      setCurrentPage(totalPages);
                      window.scrollTo({ top: 250, behavior: 'smooth' });
                    }}
                    className="size-8 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    {totalPages.toLocaleString()}
                  </button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(p + 1, totalPages));
                    window.scrollTo({ top: 250, behavior: 'smooth' });
                  }}
                  className="text-xs h-8"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JOTFORM-PARITY RICH INTERACTIVE 1200PX+ PREVIEW MODAL WITH SLIDER & TAB SUITE */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && closePreview()}>
          <DialogContent
            showCloseButton={false}
            style={{ paddingTop: 0 }}
            className="!max-w-[1280px] sm:!max-w-[1280px] lg:!max-w-[1320px] w-[96vw] max-h-[94vh] flex flex-col !p-0 rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 relative"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{previewTemplate.name}</DialogTitle>
              <DialogDescription>{previewTemplate.shortDescription || 'Form template preview'}</DialogDescription>
            </DialogHeader>

            {/* Jotform Floating Navigation Arrows (Desktop Fixed / Lateral) */}
            <button
              type="button"
              onClick={handlePrevTemplate}
              aria-label="Previous Template"
              title="Previous Template (Left Arrow)"
              className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 hover:scale-110 shadow-2xl border border-slate-200 dark:border-slate-700 items-center justify-center transition-all z-50 group cursor-pointer"
            >
              <ChevronLeft className="size-6 text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors" />
            </button>
            <button
              type="button"
              onClick={handleNextTemplate}
              aria-label="Next Template"
              title="Next Template (Right Arrow)"
              className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 hover:scale-110 shadow-2xl border border-slate-200 dark:border-slate-700 items-center justify-center transition-all z-50 group cursor-pointer"
            >
              <ChevronRight className="size-6 text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors" />
            </button>

            {/* Modal Header: Jotform App Bar (Breadcrumb + Device Switcher + Actions) */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 flex items-center gap-2">
                <nav className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  <Link href="/templates" className="hover:text-foreground font-medium">Form Templates</Link>
                  <ChevronRight className="size-3 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                    {getCategoryLabel(previewTemplate.categories[0] || 'general')}
                  </span>
                  <ChevronRight className="size-3 shrink-0" />
                  <span className="text-foreground font-bold truncate max-w-[180px] sm:max-w-[280px]">
                    {previewTemplate.name}
                  </span>
                </nav>
              </div>

              {/* Device Preview Switcher & Primary CTA */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                  onClick={() => navigateToUseTemplate(previewTemplate)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm gap-1.5"
                >
                  <Sparkles className="size-3.5" /> Use Template
                </Button>

                <button
                  type="button"
                  onClick={closePreview}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                  title="Close preview (Esc)"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Jotform 2-Column Split (Canvas + Deep Tab Suite) */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              {/* Left Column: Form Preview Canvas with Error Boundary and Device Frames */}
              <FormPreviewCanvas template={previewTemplate} device={previewDevice} />

              {/* Right Column: Jotform Tabbed Information Suite */}
              <div className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between overflow-y-auto max-h-[84vh] p-5 space-y-4">
                <div className="space-y-4">
                  {/* Top Meta Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        Curated Template
                      </span>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span>{previewTemplate.ratingAverage || 4.9}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({previewTemplate.ratingCount || 48} reviews)
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground leading-snug">
                      {previewTemplate.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {previewTemplate.shortDescription}
                    </p>
                  </div>

                  {/* Jotform Tab Buttons Bar */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModalActiveTab('overview')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
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
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
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
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        modalActiveTab === 'integrations'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Integrations
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalActiveTab('faq')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
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
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Clones &amp; Uses</p>
                          <p className="text-sm font-extrabold text-foreground mt-0.5">
                            {(previewTemplate.usageCount || 1240).toLocaleString()}+
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Created By</p>
                          <p className="text-sm font-extrabold text-emerald-600 mt-0.5 truncate">
                            Fieseros Official
                          </p>
                        </div>
                      </div>

                      {/* Categories & Industries */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-foreground">Categories &amp; Tags</p>
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

                      {/* Capabilities Checklist */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Smart Template Capabilities:
                        </p>
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                            <span>200+ Smart Widgets &amp; Conditional Logic</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                            <span>33 Payment Gateways (0% Platform Fee)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                            <span>Photo Upload with Drawing Annotations</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                            <span>Digital Signature &amp; Legal Audit Trail</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                            <span>Instant Voice &amp; Chatbot AI Employee Link</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Fields Breakdown */}
                  {modalActiveTab === 'fields' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">Questions ({previewTemplate.schema.fields?.length || 0})</span>
                        <span className="text-muted-foreground text-[11px]">Ready to customize</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                        {(previewTemplate.schema.fields || []).map((field, idx) => (
                          <div
                            key={field.id || idx}
                            className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {idx + 1}. {field.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize shrink-0 font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border">
                              {field.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Connected Integrations */}
                  {modalActiveTab === 'integrations' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Built-in 1-Click Connected Assets
                      </p>
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2.5">
                          <Bot className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-foreground">GPTSite AI Agent Sync</p>
                            <p className="text-[11px] text-muted-foreground">Voice &amp; chatbot assistants can fill or trigger this form automatically.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2.5">
                          <CreditCard className="size-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-foreground">33 Payment Gateways</p>
                            <p className="text-[11px] text-muted-foreground">Stripe, PayPal, Square, Razorpay, Authorize.net with 0% extra fees.</p>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2.5">
                          <Database className="size-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-foreground">Google Sheets &amp; Webhooks</p>
                            <p className="text-[11px] text-muted-foreground">Stream submissions directly to CRM, Airtable, Slack, or webhook endpoints.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: FAQ */}
                  {modalActiveTab === 'faq' && (
                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                        <p className="font-bold text-foreground mb-1">How do I customize this template?</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Clicking &ldquo;Use Template&rdquo; copies this template into your visual drag-and-drop form builder where you can add questions, change branding, and set up conditional logic.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                        <p className="font-bold text-foreground mb-1">Can I accept payments?</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Yes, connect Stripe, PayPal, or any of our 33 supported payment gateways with 0% platform commission.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                        <p className="font-bold text-foreground mb-1">Is it mobile friendly &amp; secure?</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          All templates feature 100% responsive viewport scaling, SSL 256-bit encryption, and GDPR compliance.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Related Templates Slider / Suggestions */}
                  {relatedTemplates.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        More Templates Like This
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {relatedTemplates.slice(0, 2).map((rel) => (
                          <button
                            key={rel.id}
                            type="button"
                            onClick={() => openPreview(rel)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/60 dark:bg-slate-800/70 dark:hover:bg-emerald-950/40 border border-slate-200/60 dark:border-slate-700 text-left transition-colors"
                          >
                            <p className="text-xs font-bold text-foreground truncate">{rel.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              ⭐ {rel.ratingAverage || 4.9} · {rel.usageCount || 300}+ uses
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Sidebar CTA Card */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <Button
                    onClick={() => navigateToUseTemplate(previewTemplate)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl shadow-md gap-2"
                  >
                    <Sparkles className="size-4" /> Use This Template
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Free forever · 0% commission · Instant copy
                  </p>
                </div>
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
      <div
        onClick={onQuickPreview}
        className="relative cursor-pointer overflow-hidden border-b border-slate-100 dark:border-slate-800/80"
      >
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
