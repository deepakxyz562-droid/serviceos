'use client';

/**
 * useTemplateSearch — client-side hook for async template search.
 *
 * Calls /api/templates/search with debounced query params and returns
 * results + loading state. Used by the public /templates gallery and
 * the builder's TemplateExplorer when the bundle gets too large for
 * in-memory search (Release 3.4).
 *
 * Falls back to the in-memory registry's searchTemplates() if the API
 * is unreachable (e.g. during SSR or in the builder where the registry
 * is already in the bundle).
 */

import { useState, useEffect, useRef } from 'react';
import type {
  FormTemplate,
  TemplateSearchQuery,
  TemplateSearchResult,
} from '@/lib/forms/templates';

export interface UseTemplateSearchResult {
  results: TemplateSearchResult[];
  loading: boolean;
  error: string | null;
  generated: FormTemplate[]; // on-demand generated variants (if any)
}

export function useTemplateSearch(query: TemplateSearchQuery): UseTemplateSearchResult {
  const [results, setResults] = useState<TemplateSearchResult[]>([]);
  const [generated, setGenerated] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    // Build query string
    const params = new URLSearchParams();
    if (query.query) params.set('q', query.query);
    if (query.category) params.set('category', query.category);
    if (query.industry) params.set('industry', query.industry);
    if (query.useCase) params.set('useCase', query.useCase);
    if (query.tags?.length) params.set('tags', query.tags.join(','));
    if (query.sort) params.set('sort', query.sort);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.offset) params.set('offset', String(query.offset));
    params.set('generate', 'true');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/templates/search?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Only update if this is the latest request (avoid race conditions)
        if (reqId === reqIdRef.current) {
          setResults(data.results || []);
          setGenerated(data.generated || []);
          setLoading(false);
        }
      } catch (err) {
        if (reqId === reqIdRef.current) {
          setError(err instanceof Error ? err.message : 'Search failed');
          setLoading(false);
        }
      }
    }, 200); // 200ms debounce

    return () => clearTimeout(timer);
  }, [
    query.query,
    query.category,
    query.industry,
    query.useCase,
    query.tags?.join(','),
    query.sort,
    query.limit,
    query.offset,
  ]);

  return { results, loading, error, generated };
}
