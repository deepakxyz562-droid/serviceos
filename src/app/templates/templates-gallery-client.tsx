'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Star, X, FileText, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { FormTemplate } from '@/lib/forms/templates';
import { getCategoryLabel, getIndustryLabel } from '@/lib/forms/templates';

/**
 * Client-side gallery — handles search + filter interactivity on top of the
 * server-rendered template list. The parent page passes ALL templates; this
 * component filters them client-side (fast for ~50 templates).
 *
 * When the catalog grows beyond ~500 templates (Release 3), this will switch
 * to server-side search via the /api/templates/search endpoint.
 */
export function TemplatesGalleryClient({ templates }: { templates: FormTemplate[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'popular' | 'recent' | 'featured'>('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  const filtered = useMemo(() => {
    let result = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.shortDescription.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)) ||
          t.industries.some((i) => i.includes(q) || getIndustryLabel(i).toLowerCase().includes(q)) ||
          t.categories.some((c) => c.includes(q) || getCategoryLabel(c).toLowerCase().includes(q)),
      );
    }
    const sorted = [...result];
    if (sort === 'featured') {
      sorted.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return (b.usageCount || 0) - (a.usageCount || 0);
      });
    } else if (sort === 'popular') {
      sorted.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      );
    }
    return sorted;
  }, [templates, searchQuery, sort]);

  // Reset page when search or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sort]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div>
      {/* Search + sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 20,000+ templates by keyword, industry, or use case..."
            className="pl-9 text-sm h-10"
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
          value={sort}
          onChange={(e) => setSort(e.target.value as 'popular' | 'recent' | 'featured')}
          className="text-sm border border-border rounded-md px-3 h-10 bg-background"
          aria-label="Sort templates"
        >
          <option value="featured">Featured first</option>
          <option value="popular">Most used</option>
          <option value="recent">Recently updated</option>
        </select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <p>
          Showing {paginated.length} of {filtered.length} templates (Page {currentPage} of {totalPages})
        </p>
        {filtered.length > pageSize && (
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-2.5 py-1 border rounded bg-background disabled:opacity-40 hover:bg-muted"
            >
              Previous
            </button>
            <span className="font-semibold text-foreground">{currentPage}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="px-2.5 py-1 border rounded bg-background disabled:opacity-40 hover:bg-muted"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="size-10 text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm font-medium text-foreground">No templates found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      {/* Bottom Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-border">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="px-3 py-1.5 border rounded-lg bg-background text-xs font-medium disabled:opacity-40 hover:bg-muted transition"
          >
            ← Previous Page
          </button>
          <span className="text-xs font-medium text-muted-foreground px-2">
            Page <strong className="text-foreground">{currentPage}</strong> of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="px-3 py-1.5 border rounded-lg bg-background text-xs font-medium disabled:opacity-40 hover:bg-muted transition"
          >
            Next Page →
          </button>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: FormTemplate }) {
  const fieldCount = template.schema.fields.length;
  const topCategories = template.categories.slice(0, 2);
  const topIndustries = template.industries.filter((i) => i !== 'general').slice(0, 2);
  const detailHref = `/templates/${template.categories[0] || 'general'}/${template.id}`;

  return (
    <div className="group relative rounded-xl border border-border bg-card hover:border-emerald-400 hover:shadow-md transition-all overflow-hidden flex flex-col">
      {template.isFeatured && (
        <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
          <Star className="size-2.5 fill-current" /> Featured
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-foreground pr-12 group-hover:text-emerald-600 transition-colors">
          {template.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">
          {template.shortDescription}
        </p>
        <div className="flex flex-wrap gap-1 mt-3">
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
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">{fieldCount} fields</span>
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
          >
            View details <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
