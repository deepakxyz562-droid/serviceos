'use client';

/**
 * TemplateExplorer — Form Template Library browser.
 *
 * T1.5: rewritten to consume the new template registry
 *   (`@/lib/forms/templates`) instead of the legacy 6-template
 *   `FORM_TEMPLATES` array.
 *
 * Data flow:
 *   - Sidebar categories + counts → derived from `getAllTemplates()`
 *     (synchronous, stable across searches).
 *   - Industry dropdown → `TEMPLATE_INDUSTRIES` taxonomy.
 *   - Card grid → async `searchTemplates({ query, category, industry })`,
 *     debounced via React state + useEffect.
 *   - Preview modal → renders `template.schema` directly through
 *     `FormRuntimeRenderer` (no reconstruction needed — registry schemas are
 *     already valid FormSchema objects).
 *   - Apply → calls `onApplyTemplate(template, customTitle, mode)` with the
 *     full `FormTemplate` (parent extracts `template.schema.fields`).
 */

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { FormRuntimeRenderer } from '../runtime/form-runtime-renderer';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL = 'all';
/** Pseudo-category id that filters the grid to featured templates only. */
const FEATURED = '__featured__';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TemplateExplorerProps {
  onBackToBuild: () => void;
  /**
   * Called when the user confirms a template in the preview modal.
   * The parent (form-studio-builder.tsx) extracts `template.schema.fields`
   * and merges them into the canvas per the chosen `mode`.
   */
  onApplyTemplate: (
    template: FormTemplate,
    customTitle: string,
    mode: 'replace' | 'append',
  ) => void;
  currentFieldCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateExplorer({
  onBackToBuild,
  onApplyTemplate,
  currentFieldCount,
}: TemplateExplorerProps) {
  // ── Filter state ────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Async search results ───────────────────────────────────────────────
  const [results, setResults] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ── Modal preview state ────────────────────────────────────────────────
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [customFormTitle, setCustomFormTitle] = useState('');
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // ── Stable counts (synchronous, derived from the whole registry) ───────
  // These don't change as the user types — they reflect the registry's
  // total contents per category, used for the sidebar counts.
  const allTemplates = useMemo(() => getAllTemplates(), []);
  const featuredCount = useMemo(
    () => allTemplates.filter((t) => t.isFeatured).length,
    [allTemplates],
  );
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of allTemplates) {
      for (const c of t.categories) m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [allTemplates]);

  const visibleCategories = useMemo(
    () => TEMPLATE_CATEGORIES.filter((c) => (categoryCounts.get(c.id) || 0) > 0),
    [categoryCounts],
  );

  // ── Async search effect (debounced) ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    // Tiny debounce so each keystroke doesn't fire a fresh search.
    const handle = setTimeout(() => {
      setIsLoading(true);

      const cat: TemplateCategoryId | undefined =
        selectedCategory === ALL || selectedCategory === FEATURED
          ? undefined
          : (selectedCategory as TemplateCategoryId);

      const ind: TemplateIndustryId | undefined =
        selectedIndustry === ALL ? undefined : (selectedIndustry as TemplateIndustryId);

      const q = searchQuery.trim() || undefined;

      // When the user picks the Featured pseudo-category we sort by featured
      // so the starred templates surface first; otherwise relevance wins.
      const sort = selectedCategory === FEATURED ? 'featured' : 'relevance';

      searchTemplates({
        query: q,
        category: cat,
        industry: ind,
        sort,
        publishedOnly: true,
        limit: 200,
      })
        .then((hits) => {
          if (cancelled) return;
          let list = hits.map((h) => h.template);
          // FEATURED pseudo-category is not a real TemplateCategoryId, so the
          // registry ignores it — we filter client-side.
          if (selectedCategory === FEATURED) {
            list = list.filter((t) => t.isFeatured);
          }
          setResults(list);
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
      clearTimeout(handle);
    };
  }, [searchQuery, selectedCategory, selectedIndustry]);

  // ── Preview modal handlers ──────────────────────────────────────────────
  const handleOpenPreview = (tpl: FormTemplate) => {
    setPreviewTemplate(tpl);
    setCustomFormTitle(tpl.name);
    setApplyMode('replace');
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

  // ── Derived preview state ───────────────────────────────────────────────
  const previewSchema = useMemo(() => {
    if (!previewTemplate) return null;
    // Use the template's canonical schema directly — it's already a valid
    // FormSchema. Override the first step's title with the user's custom
    // name so the live preview reflects the chosen form title.
    const baseSteps = previewTemplate.schema.steps?.length
      ? previewTemplate.schema.steps
      : [{ id: 'step_1', title: previewTemplate.name }];
    const title = customFormTitle || previewTemplate.name;
    return {
      ...previewTemplate.schema,
      steps: baseSteps.map((s, i) => (i === 0 ? { ...s, title } : s)),
    };
  }, [previewTemplate, customFormTitle]);

  const previewFieldCount = previewTemplate?.schema.fields.length ?? 0;
  const previewWidgetCount =
    previewTemplate?.schema.fields.filter((f) => !!f.widgetType).length ?? 0;

  const hasActiveFilters =
    selectedCategory !== ALL || selectedIndustry !== ALL || searchQuery.trim().length > 0;

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ════ LEFT SIDEBAR — CATEGORY LIST ════ */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-background">
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3.5" />
            <span>Categories</span>
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1">
            {allTemplates.length} curated templates across {visibleCategories.length} categories.
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            <CategoryButton
              active={selectedCategory === ALL}
              onClick={() => setSelectedCategory(ALL)}
              label="All Templates"
              count={allTemplates.length}
            />
            <CategoryButton
              active={selectedCategory === FEATURED}
              onClick={() => setSelectedCategory(FEATURED)}
              label="⭐ Featured"
              count={featuredCount}
              featured
            />
            <div className="h-px bg-border my-1.5 mx-2" />
            {visibleCategories.map((cat) => (
              <CategoryButton
                key={cat.id}
                active={selectedCategory === cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                label={cat.label}
                count={categoryCounts.get(cat.id) || 0}
              />
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* ════ MAIN COLUMN ════ */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* ─── Sticky top header ─── */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToBuild}
              className="h-9 gap-2 font-semibold text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Build</span>
            </Button>

            <div className="h-5 w-[1px] bg-border hidden sm:block" />

            <div>
              <h1 className="text-base font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="size-4 text-emerald-600" />
                <span>Form Template Library</span>
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Curated industry templates — pre-configured widgets, maps, and signatures.
              </p>
            </div>
          </div>

          {/* Industry filter + Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="h-9 w-44 text-xs gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder="All industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All industries</SelectItem>
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
                placeholder="Search templates, widgets, industries..."
                className="pl-9 h-9 text-xs bg-background"
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

        {/* ─── Mobile category strip (visible only on small screens) ─── */}
        <div className="md:hidden px-6 pt-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-border/40">
          <CategoryChip
            active={selectedCategory === ALL}
            onClick={() => setSelectedCategory(ALL)}
            label="All"
            count={allTemplates.length}
          />
          <CategoryChip
            active={selectedCategory === FEATURED}
            onClick={() => setSelectedCategory(FEATURED)}
            label="⭐ Featured"
            count={featuredCount}
          />
          {visibleCategories.map((cat) => (
            <CategoryChip
              key={cat.id}
              active={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              label={cat.label}
              count={categoryCounts.get(cat.id) || 0}
            />
          ))}
        </div>

        {/* ─── Active-filter summary row ─── */}
        <div className="px-6 pt-3 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">Showing</span>
          <Badge variant="secondary" className="text-[10px] font-semibold">
            {isLoading ? '…' : results.length} template{results.length === 1 ? '' : 's'}
          </Badge>
          {selectedCategory !== ALL && (
            <Badge variant="outline" className="text-[10px] font-semibold gap-1 pl-2 pr-1">
              {selectedCategory === FEATURED ? 'Featured' : getCategoryLabel(selectedCategory)}
              <button
                onClick={() => setSelectedCategory(ALL)}
                className="hover:text-foreground"
                aria-label="Clear category filter"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {selectedIndustry !== ALL && (
            <Badge variant="outline" className="text-[10px] font-semibold gap-1 pl-2 pr-1">
              {getIndustryLabel(selectedIndustry)}
              <button
                onClick={() => setSelectedIndustry(ALL)}
                className="hover:text-foreground"
                aria-label="Clear industry filter"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {searchQuery.trim() && (
            <Badge variant="outline" className="text-[10px] font-semibold gap-1 pl-2 pr-1">
              &ldquo;{searchQuery}&rdquo;
              <button
                onClick={() => setSearchQuery('')}
                className="hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-emerald-600 hover:underline ml-1 font-semibold"
            >
              Reset all
            </button>
          )}
        </div>

        {/* ─── Cards grid ─── */}
        <div className="p-6 max-w-7xl mx-auto w-full">
          {isLoading ? (
            <div className="text-center py-20 space-y-3">
              <Loader2 className="size-6 mx-auto animate-spin text-emerald-600" />
              <p className="text-xs text-muted-foreground">Searching templates…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No matching templates found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try adjusting your search terms, category, or industry filter to discover more
                industry templates.
              </p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((tpl) => {
                const cats = tpl.categories.slice(0, 3);
                const inds = tpl.industries.slice(0, 3);
                const fieldCount = tpl.schema.fields.length;
                const widgetCount = tpl.schema.fields.filter((f) => !!f.widgetType).length;
                return (
                  <Card
                    key={tpl.id}
                    className={cn(
                      'group relative flex flex-col justify-between overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-emerald-500/50 bg-card',
                      tpl.isFeatured &&
                        'ring-1 ring-emerald-500/30 border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.03] to-transparent',
                    )}
                  >
                    {tpl.isFeatured && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0.5 gap-0.5">
                          <Star className="size-2.5 fill-white" />
                          Featured
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FileText className="size-5" />
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {cats.map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground bg-muted/40"
                            >
                              {getCategoryLabel(c)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <CardTitle className="text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors leading-snug pr-12">
                        {tpl.name}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 leading-relaxed text-muted-foreground">
                        {tpl.shortDescription}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {/* Industry pills */}
                      {inds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {inds.map((i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-medium border border-blue-200/50 dark:border-blue-900/50"
                            >
                              {getIndustryLabel(i)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats line */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <FileText className="size-3.5 text-emerald-600" />
                          {fieldCount} field{fieldCount === 1 ? '' : 's'}
                        </span>
                        {widgetCount > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Sparkles className="size-3 text-emerald-600" />
                            {widgetCount} widget{widgetCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPreview(tpl)}
                          className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted/80"
                        >
                          <Eye className="size-3.5" />
                          <span>Preview</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenPreview(tpl)}
                          className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <span>Select</span>
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════ TEMPLATE PREVIEW & CONFIRMATION MODAL ════ */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          {/* Modal Header */}
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="size-4" />
              <span>Template Preview & Load</span>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {previewTemplate?.shortDescription}
            </DialogDescription>
          </DialogHeader>

          {/* Modal Body: Split view of Settings & Live Form Preview */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Column: Form Name & Loading Mode */}
            <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-border bg-card/60 space-y-5 overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Form Title</Label>
                <Input
                  type="text"
                  value={customFormTitle}
                  onChange={(e) => setCustomFormTitle(e.target.value)}
                  placeholder="Enter form title..."
                  className="h-9 text-xs bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  You can change this anytime in the form builder.
                </p>
              </div>

              {currentFieldCount > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs font-semibold text-foreground">Loading Mode</Label>
                  <RadioGroup
                    value={applyMode}
                    onValueChange={(val) => setApplyMode(val as 'replace' | 'append')}
                    className="space-y-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:border-emerald-500/60 transition-colors">
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                      <div className="space-y-0.5">
                        <label
                          htmlFor="mode-replace"
                          className="font-semibold text-foreground cursor-pointer"
                        >
                          Replace existing form
                        </label>
                        <p className="text-[10px] text-muted-foreground">
                          Overwrites the current {currentFieldCount} field(s) on your canvas with
                          this template.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:border-emerald-500/60 transition-colors">
                      <RadioGroupItem value="append" id="mode-append" className="mt-0.5" />
                      <div className="space-y-0.5">
                        <label
                          htmlFor="mode-append"
                          className="font-semibold text-foreground cursor-pointer"
                        >
                          Append to existing form
                        </label>
                        <p className="text-[10px] text-muted-foreground">
                          Keeps existing {currentFieldCount} field(s) and appends this template&rsquo;s{' '}
                          {previewFieldCount} fields at the end.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Template Specs */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold text-foreground">Template Specs</Label>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs text-muted-foreground border border-border/60">
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0">Categories:</span>
                    <span className="font-semibold text-foreground text-right">
                      {previewTemplate?.categories.map((c) => getCategoryLabel(c)).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0">Industries:</span>
                    <span className="font-semibold text-foreground text-right">
                      {previewTemplate?.industries.map((i) => getIndustryLabel(i)).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Fields:</span>
                    <span className="font-semibold text-foreground">
                      {previewFieldCount} Questions
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Widgets Included:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {previewWidgetCount} Widgets
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Preview of Form */}
            <div className="lg:col-span-8 p-5 bg-slate-100/70 dark:bg-slate-900/60 overflow-y-auto max-h-[55vh] lg:max-h-[60vh]">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Eye className="size-3.5" />
                <span>Live Interactive Canvas Preview</span>
              </div>

              {previewSchema ? (
                <div className="bg-background rounded-xl p-5 border border-border shadow-xs">
                  <FormRuntimeRenderer
                    schema={previewSchema}
                    formName={customFormTitle || previewTemplate?.name || 'Template Preview'}
                    previewMode
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Modal Footer with Actions */}
          <DialogFooter className="p-4 border-t border-border bg-background flex flex-row items-center justify-between sm:justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewTemplate(null)}
              className="h-9 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleConfirmApply}
              className="h-9 px-5 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <Check className="size-4" />
              <span>Use This Template & Start Building</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sidebar/strip button helpers ────────────────────────────────────────────

function CategoryButton({
  active,
  onClick,
  label,
  count,
  featured,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  featured?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors text-left',
        active
          ? 'bg-emerald-600 text-white shadow-xs'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
      )}
    >
      <span className={cn('truncate', featured && 'flex items-center gap-1')}>{label}</span>
      <span
        className={cn(
          'text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0',
          active ? 'bg-white/20 text-white' : 'bg-background/80 text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
        active
          ? 'bg-emerald-600 text-white shadow-xs'
          : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
          active ? 'bg-white/20 text-white' : 'bg-background/80 text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default TemplateExplorer;
