'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Star,
  X,
  FileText,
  ArrowRight,
  ArrowLeft,
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
  MessageCircle,
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
  CalendarCheck,
  ClipboardCheck,
  FormInput,
  LayoutGrid,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { cn } from '@/lib/utils';

type Experience = 'Classic' | 'Card' | 'Conversational' | 'AI Agent';

const GOALS = [
  'Book appointments',
  'Collect enquiries',
  'Create quotes',
  'Take payments',
  'Run inspections',
  'Gather feedback',
];

const EXPERIENCES: Experience[] = ['Classic', 'Card', 'Conversational', 'AI Agent'];

const FEATURE_FILTERS = [
  'Calendar',
  'Conditional logic',
  'Photo upload',
  'Payment',
  'Signature',
  'Calculation',
];

const POPULAR_SEARCHES = [
  'Dental intake',
  'HVAC quote',
  'Roof inspection',
  'Cleaning calculator',
  'Consultation booking',
  'Job application',
  'Liability waiver',
  'Event registration',
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

  // Search & Facet Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(initialIndustry);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [sort, setSort] = useState<'featured' | 'popular' | 'rating' | 'recent'>('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Items State & Cache
  const [items, setItems] = useState<FormTemplate[]>(seedTemplates);
  const [totalCount, setTotalCount] = useState<number>(seedTotal);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = React.useRef<Map<string, { templates: FormTemplate[]; total: number }>>(new Map());

  // Interactive Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [previewExperience, setPreviewExperience] = useState<Experience>('Classic');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [modalActiveTab, setModalActiveTab] = useState<'overview' | 'fields' | 'integrations' | 'faq'>('overview');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Create a service booking flow that qualifies the customer, collects photos, and offers an appointment.');

  // Store initial search in cache
  useEffect(() => {
    cacheRef.current.set(`${initialCategory}|${initialIndustry}||featured|1`, {
      templates: seedTemplates,
      total: seedTotal,
    });
  }, [seedTemplates, seedTotal, initialCategory, initialIndustry]);

  // Fast dynamic fetch with debounce
  useEffect(() => {
    const isInitial =
      currentPage === 1 &&
      selectedCategory === initialCategory &&
      selectedIndustry === initialIndustry &&
      selectedGoal === 'all' &&
      selectedFeatures.length === 0 &&
      !searchQuery.trim() &&
      sort === 'featured';

    if (isInitial && seedTemplates.length > 0) {
      setItems(seedTemplates);
      setTotalCount(seedTotal);
      setIsLoading(false);
      return;
    }

    const effectiveQuery = [
      searchQuery.trim(),
      selectedGoal !== 'all' ? selectedGoal : '',
      ...selectedFeatures,
    ]
      .filter(Boolean)
      .join(' ');

    const cacheKey = `${selectedCategory}|${selectedIndustry}|${effectiveQuery}|${sort}|${currentPage}`;
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
        if (effectiveQuery) params.set('q', effectiveQuery);

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
  }, [
    currentPage,
    selectedCategory,
    selectedIndustry,
    selectedGoal,
    selectedFeatures,
    searchQuery,
    sort,
    initialTemplates,
    initialTotalCount,
    pageSize,
    initialCategory,
    initialIndustry,
    seedTemplates,
    seedTotal,
  ]);

  // Open Preview Modal with pushState so browser Back pops state properly
  const openPreview = useCallback(async (template: FormTemplate) => {
    if (!template) return;
    setPreviewTemplate(template);
    setPreviewExperience('Classic');
    setModalActiveTab('overview');

    if (typeof window !== 'undefined') {
      const primaryCat = template.categories?.[0] || 'general';
      try {
        // Push state so clicking browser Back closes the modal and stays on /templates
        window.history.pushState({ previewTemplateId: template.id }, '', `/templates/${primaryCat}/${template.id}`);
      } catch {}
    }

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

  // Close Preview Modal cleanly
  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
    if (typeof window !== 'undefined') {
      if (window.history.state?.previewTemplateId) {
        window.history.back();
      } else {
        const cleanUrl = selectedCategory !== 'all' ? `/templates?category=${selectedCategory}` : '/templates';
        try {
          window.history.replaceState(null, '', cleanUrl);
        } catch {}
      }
    }
  }, [selectedCategory]);

  // Handle browser popstate (Back & Forward buttons)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.previewTemplateId) {
        setPreviewTemplate(null);
      } else {
        const found = items.find((t) => t.id === e.state.previewTemplateId);
        if (found) {
          setPreviewTemplate(found);
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
  }, [items]);

  const categoryCounts = useMemo(() => new Map(Object.entries(categoryCountsProp || {})), [categoryCountsProp]);
  const industryCounts = useMemo(() => new Map(Object.entries(industryCountsProp || {})), [industryCountsProp]);

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

  // Keyboard navigation for preview modal
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

  const relatedTemplates = useMemo(() => {
    if (!previewTemplate) return [];
    const primaryCat = previewTemplate.categories?.[0] || 'general';
    const primaryInd = previewTemplate.industries?.[0] || 'general';
    return items
      .filter(
        (t) =>
          t.id !== previewTemplate.id &&
          ((t.categories || []).includes(primaryCat as any) ||
            (primaryInd && primaryInd !== 'general' && (t.industries || []).includes(primaryInd as any)))
      )
      .slice(0, 4);
  }, [previewTemplate, items]);

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
    setCurrentPage(1);
  };

  const chooseGoal = (goal: string) => {
    setSelectedGoal((prev) => (prev === goal ? 'all' : goal));
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedIndustry !== 'all' ||
    selectedGoal !== 'all' ||
    selectedFeatures.length > 0 ||
    searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedIndustry('all');
    setSelectedGoal('all');
    setSelectedFeatures([]);
    setSearchQuery('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-10">
      {/* ─── HERO HEADER WITH SEARCH & POPULAR TAGS ─── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-emerald-50/50 via-background to-background dark:from-emerald-950/20 dark:via-background dark:to-background pb-12 pt-10 sm:pb-16 sm:pt-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-4 shadow-xs">
            <Sparkles className="size-3.5" />
            GPTFORM TEMPLATE LIBRARY & CUSTOMER JOURNEYS
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Start with a customer journey <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              built for your business.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose a ready-to-customize workflow, then deliver it as a classic form, guided conversation, or AI-assisted experience with 0% transaction fees.
          </p>

          {/* Search Box */}
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-lg">
            <div className="flex items-center gap-3">
              <Search className="ml-3 size-5 shrink-0 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 min-w-0 flex-1 bg-transparent text-sm sm:text-base outline-none placeholder:text-muted-foreground text-foreground"
                placeholder="Search 20,000+ templates (e.g. dental intake, hvac quote, roof inspection)..."
                aria-label="Search form templates"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="size-8"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Popular Search Chips */}
          <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Popular:</span>
            {POPULAR_SEARCHES.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSearchQuery(item);
                  setCurrentPage(1);
                }}
                className="h-7 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHAT DO YOU WANT TO DO? GOAL STRIP ─── */}
      <section className="border-b border-border bg-slate-50/50 dark:bg-slate-950/30 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                What do you want to accomplish?
              </h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Button
                variant={selectedGoal === 'all' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs rounded-xl h-8 shrink-0 ${
                  selectedGoal === 'all'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-900'
                }`}
                onClick={() => chooseGoal('all')}
              >
                All Goals
              </Button>
              {GOALS.map((goal) => (
                <Button
                  key={goal}
                  variant={selectedGoal === goal ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs rounded-xl h-8 shrink-0 ${
                    selectedGoal === goal
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                  onClick={() => chooseGoal(goal)}
                >
                  {goal}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3 FEATURED WORKFLOW HERO CARDS ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: CalendarCheck,
              title: 'Book an appointment',
              copy: 'Guide a visitor from their first question to a confirmed time slot.',
              goal: 'Book appointments',
              accent: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-900/50',
            },
            {
              icon: MessageCircle,
              title: 'Qualify a service enquiry',
              copy: 'Capture the exact context your team needs before dispatching.',
              goal: 'Collect enquiries',
              accent: 'from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-900/50',
            },
            {
              icon: ClipboardCheck,
              title: 'Build a tailored quote',
              copy: 'Collect scope and calculate pricing in one focused customer journey.',
              goal: 'Create quotes',
              accent: 'from-purple-500/10 to-indigo-500/10 border-purple-200 dark:border-purple-900/50',
            },
          ].map((card) => {
            const Icon = card.icon;
            const isSelected = selectedGoal === card.goal;
            return (
              <button
                key={card.title}
                onClick={() => chooseGoal(card.goal)}
                className={`group flex min-h-32 items-start gap-4 rounded-2xl border bg-gradient-to-br ${card.accent} p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white dark:bg-slate-900 text-emerald-600 shadow-sm border border-slate-200/50 dark:border-slate-800">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-bold text-base text-foreground leading-tight">{card.title}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{card.copy}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                    Explore workflows <ArrowRight className="size-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN TWO-COLUMN GALLERY (SIDEBAR + GRID) ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* DESKTOP FACET SIDEBAR */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6 sticky top-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <SlidersHorizontal className="size-4 text-emerald-600" />
                <span>Filter Catalogue</span>
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

            {/* All Templates Button */}
            <button
              onClick={clearAllFilters}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                !hasActiveFilters
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
                  !hasActiveFilters ? 'border-white/30 text-white' : 'text-muted-foreground'
                }`}
              >
                {(totalCount || 20391).toLocaleString()}
              </Badge>
            </button>

            {/* Goals Filter Section */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Goal / Outcome
              </h3>
              <div className="space-y-1">
                {GOALS.map((goal) => {
                  const isSelected = selectedGoal === goal;
                  return (
                    <button
                      key={goal}
                      onClick={() => chooseGoal(goal)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate">{goal}</span>
                      {isSelected && <Check className="size-3 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Categories */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Form Categories ({TEMPLATE_CATEGORIES.length})
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = categoryCounts.get(cat.id) || 480;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(isSelected ? 'all' : cat.id);
                        setCurrentPage(1);
                      }}
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

            {/* Industry Verticals */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Industries ({TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').length})
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').map((ind) => {
                  const isSelected = selectedIndustry === ind.id;
                  const count = industryCounts.get(ind.id) || 350;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => {
                        setSelectedIndustry(isSelected ? 'all' : ind.id);
                        setCurrentPage(1);
                      }}
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

            {/* Feature Checklist */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Features & Logic
              </h3>
              <div className="space-y-2">
                {FEATURE_FILTERS.map((feat) => (
                  <label
                    key={feat}
                    className="flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-300 select-none"
                  >
                    <Checkbox
                      checked={selectedFeatures.includes(feat)}
                      onCheckedChange={() => toggleFeature(feat)}
                    />
                    <span>{feat}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: TEMPLATES GRID & CONTROLS */}
          <div className="lg:col-span-3 space-y-6">
            {/* Control Bar: Total Count, Mobile Filter Button, Sort Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                {/* Mobile Filter Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden text-xs rounded-xl gap-1.5"
                  onClick={() => setMobileFilterOpen(true)}
                >
                  <Filter className="size-3.5" /> Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-emerald-100 text-emerald-800">
                      Active
                    </Badge>
                  )}
                </Button>

                <div>
                  <p className="text-base font-extrabold text-foreground">
                    {totalCount.toLocaleString()} {totalCount === 1 ? 'Template' : 'Templates'} Found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCategory !== 'all' ? getCategoryLabel(selectedCategory) : 'All Form Types'}{' '}
                    {selectedIndustry !== 'all' ? `• ${getIndustryLabel(selectedIndustry)}` : ''}{' '}
                    {selectedGoal !== 'all' ? `• ${selectedGoal}` : ''}
                  </p>
                </div>
              </div>

              {/* Sort Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
                {[
                  { id: 'featured', label: '⭐ Featured' },
                  { id: 'popular', label: '🔥 Popular' },
                  { id: 'rating', label: '★ Top Rated' },
                  { id: 'recent', label: '🕒 Newest' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSort(s.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
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

            {/* Active Filter Badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Active Filters:</span>
                {selectedGoal !== 'all' && (
                  <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Goal: {selectedGoal}
                    <button onClick={() => setSelectedGoal('all')}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-800 border-emerald-200">
                    Category: {getCategoryLabel(selectedCategory)}
                    <button onClick={() => setSelectedCategory('all')}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {selectedIndustry !== 'all' && (
                  <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-800 border-blue-200">
                    Industry: {getIndustryLabel(selectedIndustry)}
                    <button onClick={() => setSelectedIndustry('all')}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {selectedFeatures.map((feat) => (
                  <Badge key={feat} variant="secondary" className="gap-1 bg-purple-50 text-purple-800 border-purple-200">
                    {feat}
                    <button onClick={() => toggleFeature(feat)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery('')}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-emerald-600 hover:underline font-semibold ml-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* TEMPLATE CARDS GRID */}
            {items.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 p-8">
                <FileText className="size-12 text-muted-foreground mb-3 opacity-40" />
                <h3 className="text-base font-bold text-foreground">No matching templates found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Try searching for broader terms like &ldquo;intake&rdquo;, &ldquo;hvac&rdquo;, &ldquo;waiver&rdquo;, or reset your active filters.
                </p>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 text-xs rounded-xl">
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity duration-200 ${
                  isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'
                }`}
              >
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
                  Showing Page <strong className="text-foreground">{currentPage}</strong> of{' '}
                  <strong className="text-foreground">{totalPages.toLocaleString()}</strong> ({totalCount.toLocaleString()} total templates)
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(p - 1, 1));
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="text-xs h-8 rounded-lg"
                  >
                    ← Prev
                  </Button>

                  {currentPage > 2 && (
                    <button
                      onClick={() => {
                        setCurrentPage(1);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
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
                        window.scrollTo({ top: 300, behavior: 'smooth' });
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
                        window.scrollTo({ top: 300, behavior: 'smooth' });
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
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="size-8 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      {totalPages}
                    </button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(p + 1, totalPages));
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="text-xs h-8 rounded-lg"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM "CAN'T FIND EXACT WORKFLOW? BUILD WITH AI" BAR ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-10 text-white shadow-2xl">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 mb-3">
                <Sparkles className="size-3.5" /> BUILD WITH AI COPILOT
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Can&apos;t find the exact workflow? <br />
                <span className="text-emerald-400">Describe it in plain English.</span>
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
                Tell GPTForm what your business needs to collect or calculate. AI prepares the questions, multi-step logic, pricing formulas, and payment settings instantly.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="h-24 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400 transition-colors"
                placeholder="Describe your ideal form workflow..."
                aria-label="Describe your custom form workflow"
              />
              <div className="flex justify-end">
                <Link
                  href={`/gptform?prompt=${encodeURIComponent(aiPrompt)}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Sparkles className="size-4" /> Build with AI Copilot
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MOBILE FILTER DRAWER (SHEET) ─── */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-6">
          <SheetHeader className="text-left pb-4 border-b border-border">
            <SheetTitle className="text-lg font-bold">Filter 20,000+ Templates</SheetTitle>
            <SheetDescription className="text-xs">
              Narrow catalog by goals, form categories, and vertical industries.
            </SheetDescription>
          </SheetHeader>

          <div className="py-5 space-y-6 text-xs">
            <div>
              <h4 className="font-bold text-foreground mb-2">Outcome / Goal</h4>
              <div className="flex flex-wrap gap-1.5">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGoal(selectedGoal === g ? 'all' : g)}
                    className={`px-3 py-1.5 rounded-lg font-medium border ${
                      selectedGoal === g
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-border bg-muted/40'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-2">Categories</h4>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                {TEMPLATE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(selectedCategory === c.id ? 'all' : c.id)}
                    className={`text-left p-2 rounded text-xs truncate ${
                      selectedCategory === c.id ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-muted'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-2">Features</h4>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_FILTERS.map((feat) => (
                  <label key={feat} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={selectedFeatures.includes(feat)}
                      onCheckedChange={() => toggleFeature(feat)}
                    />
                    <span>{feat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-background p-4 flex flex-row gap-2">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl"
              onClick={() => setMobileFilterOpen(false)}
            >
              Show {totalCount.toLocaleString()} Templates
            </Button>
            <Button variant="outline" className="text-xs h-10 rounded-xl" onClick={clearAllFilters}>
              Reset
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── FULL-WIDTH JOTFORM-GRADE 4-EXPERIENCE INTERACTIVE PREVIEW MODAL ─── */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && closePreview()}>
          <DialogContent
            showCloseButton={false}
            style={{ paddingTop: 0 }}
            className="!max-w-[1280px] sm:!max-w-[1280px] lg:!max-w-[1320px] w-[96vw] max-h-[94vh] flex flex-col !p-0 rounded-2xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{previewTemplate.name}</DialogTitle>
              <DialogDescription>{previewTemplate.shortDescription || 'Form template preview'}</DialogDescription>
            </DialogHeader>

            {/* Desktop Floating Lateral Navigation Arrows */}
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

            {/* Modal Header: Breadcrumb + Experience & Device Switchers + Actions */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 flex items-center gap-2">
                <nav className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground">Form Templates</span>
                  <ChevronRight className="size-3 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                    {getCategoryLabel(previewTemplate.categories?.[0] || 'general')}
                  </span>
                  <ChevronRight className="size-3 shrink-0" />
                  <span className="text-foreground font-bold truncate max-w-[180px] sm:max-w-[280px]">
                    {previewTemplate.name}
                  </span>
                </nav>
              </div>

              {/* Experience & Device Preview Switcher & Primary CTA */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
                {/* 4 Multi-Mode Experiences Switcher */}
                <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  {EXPERIENCES.map((exp) => (
                    <button
                      key={exp}
                      onClick={() => setPreviewExperience(exp)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        previewExperience === exp
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>

                {/* Device Frame Switcher */}
                <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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

            {/* Modal Body: Jotform 2-Column Split (Canvas on Left + Deep Tab Suite on Right) */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              {/* Left Column: Form Preview Canvas with Experience Mode Rendering */}
              <div className="flex-1 min-w-0 bg-slate-100/80 dark:bg-slate-950 p-4 sm:p-6 overflow-y-auto flex items-start justify-center">
                {previewExperience === 'Classic' ? (
                  <FormPreviewCanvas template={previewTemplate} device={previewDevice} />
                ) : previewExperience === 'Card' ? (
                  <div className={cn(
                    'w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md transition-all',
                    previewDevice === 'mobile' ? 'max-w-[340px]' : previewDevice === 'tablet' ? 'max-w-lg' : 'max-w-xl'
                  )}>
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          QUESTION 1 OF {previewTemplate.schema?.fields?.length || 6}
                        </span>
                        <span className="text-[10px] text-muted-foreground">15% completed</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full w-[15%]" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-lg text-foreground">
                          What specific assistance do you need today?
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Select the primary reason for your request.
                        </p>
                      </div>
                      <div className="space-y-2 pt-2">
                        {['New Consultation / Inquiry', 'Emergency Service Booking', 'Pricing & Quote Estimate', 'General Feedback'].map((opt, i) => (
                          <div
                            key={opt}
                            className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                              i === 0
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                                : 'border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                      <Button
                        disabled
                        className="w-full bg-emerald-600 text-white font-bold text-xs h-10 rounded-xl"
                      >
                        Continue →
                      </Button>
                    </div>
                  </div>
                ) : previewExperience === 'Conversational' ? (
                  <div className={cn(
                    'w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md transition-all',
                    previewDevice === 'mobile' ? 'max-w-[340px]' : previewDevice === 'tablet' ? 'max-w-lg' : 'max-w-xl'
                  )}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-border text-xs font-bold text-foreground">
                        <span className="size-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <MessageCircle className="size-4" />
                        </span>
                        <div>
                          <p className="font-bold text-foreground">Fieseros AI Concierge</p>
                          <p className="text-[10px] text-muted-foreground font-normal">Active & ready</p>
                        </div>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div className="max-w-[85%] rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800 p-3.5 text-foreground leading-relaxed">
                          Hello! 👋 I&apos;m here to guide you through {previewTemplate.name.toLowerCase()}. What type of service are you looking for?
                        </div>
                        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-xs bg-emerald-600 text-white p-3.5 font-medium">
                          I&apos;d like to get started with a quote and schedule an appointment.
                        </div>
                        <div className="max-w-[85%] rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800 p-3.5 text-foreground leading-relaxed">
                          Perfect! What date works best for you, and what is your preferred contact email?
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    'w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md transition-all',
                    previewDevice === 'mobile' ? 'max-w-[340px]' : previewDevice === 'tablet' ? 'max-w-lg' : 'max-w-xl'
                  )}>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-border">
                        <span className="size-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                          <Sparkles className="size-5" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-foreground">Autonomous Generative AI Agent</p>
                          <p className="text-[10px] text-muted-foreground">Natural language parser & field validator</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-muted-foreground leading-relaxed">
                        &ldquo;Customer speaks or writes in natural language: &lsquo;Need service for our home this Friday morning, call me at 555-0192.&rsquo;&rdquo;
                      </div>
                      <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 p-3.5 space-y-2.5">
                        <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          STRUCTURED INSTANTLY BY AI
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30">
                            <span className="text-muted-foreground block text-[9px]">Goal:</span>
                            <strong>Service Booking & Intake</strong>
                          </div>
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30">
                            <span className="text-muted-foreground block text-[9px]">Timing:</span>
                            <strong>Friday Morning</strong>
                          </div>
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30">
                            <span className="text-muted-foreground block text-[9px]">Status:</span>
                            <strong>Validated</strong>
                          </div>
                          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/30">
                            <span className="text-muted-foreground block text-[9px]">Contact:</span>
                            <strong>555-0192</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Tabbed Information Suite */}
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

                  {/* Navigation Tab Bar */}
                  <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
                    <button
                      onClick={() => setModalActiveTab('overview')}
                      className={`pb-2 border-b-2 transition-colors ${
                        modalActiveTab === 'overview'
                          ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setModalActiveTab('fields')}
                      className={`pb-2 border-b-2 transition-colors ${
                        modalActiveTab === 'fields'
                          ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fields ({previewTemplate.schema?.fields?.length || 0})
                    </button>
                    <button
                      onClick={() => setModalActiveTab('integrations')}
                      className={`pb-2 border-b-2 transition-colors ${
                        modalActiveTab === 'integrations'
                          ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Integrations
                    </button>
                    <button
                      onClick={() => setModalActiveTab('faq')}
                      className={`pb-2 border-b-2 transition-colors ${
                        modalActiveTab === 'faq'
                          ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      FAQ
                    </button>
                  </div>

                  {/* Tab 1: Overview Tab */}
                  {modalActiveTab === 'overview' && (
                    <div className="space-y-3.5 text-xs text-muted-foreground">
                      <div>
                        <h4 className="font-bold text-foreground mb-1">Key Features Included</h4>
                        <ul className="space-y-1.5 text-[11px]">
                          <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>0% Commission Payment Processing (Stripe, PayPal, Square)</span>
                          </li>
                          <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>Instant Live Calculation & Custom Mathematical Formulas</span>
                          </li>
                          <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>Multi-Step Card & Conversational Chatbot Form Runtimes</span>
                          </li>
                          <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>Digital E-Signatures & Document / Photo Uploads</span>
                          </li>
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-foreground mb-1.5">Taxonomy & Classifications</h4>
                        <div className="flex flex-wrap gap-1">
                          {(previewTemplate.categories || []).map((cat) => (
                            <Badge key={cat} variant="secondary" className="text-[10px]">
                              {getCategoryLabel(cat)}
                            </Badge>
                          ))}
                          {(previewTemplate.industries || []).map((ind) => (
                            <Badge key={ind} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                              {getIndustryLabel(ind)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Fields List Tab */}
                  {modalActiveTab === 'fields' && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {(previewTemplate.schema?.fields || []).map((field, idx) => (
                        <div
                          key={field.id || idx}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-foreground">
                              {field.label || `Field #${idx + 1}`}
                            </p>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              Type: {field.type}
                            </span>
                          </div>
                          {field.required && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200">
                              Required
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 3: Integrations Tab */}
                  {modalActiveTab === 'integrations' && (
                    <div className="space-y-2 text-xs">
                      <p className="text-muted-foreground text-[11px]">
                        Seamlessly sync submissions to 30+ CRM, email marketing, and payment tools:
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {['Stripe Payments', 'PayPal Checkout', 'Google Sheets Sync', 'Webhook / Zapier', 'Slack Alerts', 'Mailchimp'].map((item) => (
                          <div key={item} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1.5">
                            <Check className="size-3 text-emerald-600" /> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 4: FAQ Tab */}
                  {modalActiveTab === 'faq' && (
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="font-bold text-foreground mb-1">Is this template 100% customizable?</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Yes! You can add, edit, or remove fields, update colors and themes, configure conditional branching, and connect webhooks.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-foreground mb-1">Is it mobile friendly & secure?</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          All templates feature responsive viewport scaling, SSL 256-bit encryption, and GDPR compliance.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Related Templates Slider */}
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
 * Modern Template Card Component
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
  const primaryCat = template.categories?.[0] || 'general';
  const detailHref = `/templates/${primaryCat}/${template.id}`;
  const industries = template.industries || [];

  return (
    <div className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Visual Thumbnail Preview Area */}
      <div
        onClick={onQuickPreview}
        className="relative cursor-pointer overflow-hidden border-b border-slate-100 dark:border-slate-800/80"
      >
        <FormThumbnailPreview template={template} />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="bg-white/95 dark:bg-slate-900/95 text-[10px] font-bold shadow-xs">
              {getCategoryLabel(primaryCat)}
            </Badge>
            {industries[0] && industries[0] !== 'general' && (
              <Badge variant="outline" className="bg-blue-50/90 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] border-blue-200">
                {getIndustryLabel(industries[0])}
              </Badge>
            )}
          </div>

          {template.isFeatured && (
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

      {/* Card Content & Meta */}
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
