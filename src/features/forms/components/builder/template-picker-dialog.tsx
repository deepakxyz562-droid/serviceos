'use client';

/**
 * TemplatePickerDialog — dashboard-level template browser.
 *
 * Shown when the user clicks "Browse Templates" on the forms dashboard.
 * Lets the user pick a template BEFORE entering the Form Studio Builder
 * (vs. TemplateExplorer, which is inside the builder's TEMPLATES tab).
 *
 * On confirm, calls onPick(templateId) — the parent (form-builder-view)
 * stores the id and passes it to FormStudioBuilder as initialTemplateId,
 * which pre-populates formData.fields from the template's schema.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Sparkles, Star, X, Loader2, FileText } from 'lucide-react';
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<FormTemplate | null>(null);

  // Build category list with counts (only categories that have templates)
  const categoriesWithCounts = useMemo(() => {
    const all = getAllTemplates();
    const counts = new Map<string, number>();
    for (const t of all) {
      for (const c of t.categories) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return [
      { id: 'all' as const, label: 'All Templates', count: all.length },
      { id: 'featured' as const, label: '⭐ Featured', count: all.filter((t) => t.isFeatured).length },
      ...TEMPLATE_CATEGORIES.filter((c) => (counts.get(c.id) ?? 0) > 0).map((c) => ({
        id: c.id as TemplateCategoryId,
        label: c.label,
        count: counts.get(c.id) ?? 0,
      })),
    ];
  }, []);

  // Debounced search — the actual setState calls happen INSIDE the timeout
  // callback (not synchronously in the effect body) to satisfy the React
  // "no setState in effect" rule.
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      const searchResults = await searchTemplates({
        query: searchQuery || undefined,
        category: selectedCategory === 'all' || selectedCategory === 'featured' ? undefined : selectedCategory,
        industry: selectedIndustry === 'all' ? undefined : selectedIndustry,
        sort: searchQuery ? 'relevance' : selectedCategory === 'featured' ? 'featured' : 'popular',
        limit: 100,
      });
      let filtered = searchResults.map((r) => r.template);
      if (selectedCategory === 'featured') {
        filtered = filtered.filter((t) => t.isFeatured);
      }
      setResults(filtered);
      setLoading(false);
    }, 150);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [open, searchQuery, selectedCategory, selectedIndustry]);

  const handlePick = (template: FormTemplate) => {
    onPick(template);
    onOpenChange(false);
    // Reset filters for next open
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedIndustry('all');
    setAiResult(null);
    setAiError(null);
  };

  // ─── T4.2 — AI on-demand generation ────────────────────────────────────
  // When the curated catalog has no match, let the user generate a template
  // with AI. Calls POST /api/templates/generate, shows a preview, and lets
  // the user use it like any curated template.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="size-5 text-emerald-600" />
            Browse Form Templates
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick a template to start from. You can customize everything in the builder.
          </DialogDescription>
        </DialogHeader>

        {/* Search + filters */}
        <div className="px-6 py-3 border-b border-border space-y-3 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 51 templates by name, industry, or use case..."
                className="pl-9 text-xs h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value as TemplateIndustryId | 'all')}
              className="text-xs border border-border rounded-md px-2 h-9 bg-background"
              aria-label="Filter by industry"
            >
              <option value="all">All Industries</option>
              {TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general').map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 flex-wrap">
            {categoriesWithCounts.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {cat.label} <span className="opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Searching templates...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No matching templates found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Try a different search term, clear filters, or generate with AI.
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
                      className="text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleGenerateWithAI}
                      disabled={aiLoading}
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="size-3.5 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5 mr-1" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* AI error */}
                {aiError && (
                  <p className="mt-3 text-xs text-destructive">{aiError}</p>
                )}

                {/* AI-generated template preview */}
                {aiResult && (
                  <div className="mt-6 w-full max-w-md border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="size-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                        AI-Generated Template
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{aiResult.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{aiResult.shortDescription}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {aiResult.schema.fields.length} fields ·{' '}
                      {aiResult.categories.map(getCategoryLabel).join(', ')}
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 w-full text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handlePick(aiResult)}
                    >
                      Use this AI template
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPick={handlePick}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: FormTemplate;
  onPick: (t: FormTemplate) => void;
}) {
  const fieldCount = template.schema.fields.length;
  const topCategories = template.categories.slice(0, 2);
  const topIndustries = template.industries.filter((i) => i !== 'general').slice(0, 2);

  return (
    <button
      onClick={() => onPick(template)}
      className="text-left p-4 rounded-xl border border-border bg-card hover:border-emerald-400 hover:shadow-md transition-all group relative"
    >
      {template.isFeatured && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
          <Star className="size-2.5 fill-current" /> Featured
        </span>
      )}
      <h3 className="text-sm font-bold text-foreground pr-12 group-hover:text-emerald-600 transition-colors">
        {template.name}
      </h3>
      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
        {template.shortDescription}
      </p>
      <div className="flex flex-wrap gap-1 mt-2">
        {topCategories.map((c) => (
          <Badge key={c} variant="secondary" className="text-[9px] py-0 px-1.5 font-normal">
            {getCategoryLabel(c)}
          </Badge>
        ))}
        {topIndustries.map((i) => (
          <Badge key={i} variant="outline" className="text-[9px] py-0 px-1.5 font-normal text-blue-600 border-blue-300">
            {getIndustryLabel(i)}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">
          {fieldCount} fields
        </span>
        <span className="text-[10px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Use template →
        </span>
      </div>
    </button>
  );
}
