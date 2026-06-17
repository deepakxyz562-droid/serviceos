'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  Building2,
  ArrowRight,
  SearchX,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface CompanyFinderCompany {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  industry?: string | null;
}

export interface CompanyFinderProps {
  /** Called with the selected company's slug (e.g. "abc-cleaning"). */
  onSelect: (slug: string) => void;
  /** Optional placeholder text. */
  placeholder?: string;
  /** Optional class name for the wrapping container. */
  className?: string;
  /** Optional autofocus. */
  autoFocus?: boolean;
}

const API_SUFFIX = '?XTransformPort=3000';
const DEBOUNCE_MS = 280;

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export function CompanyFinder({
  onSelect,
  placeholder = 'Find your company by name or slug…',
  className,
  autoFocus,
}: CompanyFinderProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanyFinderCompany[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Debounced search ────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/companies/search${API_SUFFIX}&q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      );
      const data = await res.json().catch(() => ({ companies: [] }));
      setResults(Array.isArray(data.companies) ? data.companies : []);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[CompanyFinder] search error', err);
      setResults([]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      runSearch(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  // Close the dropdown on outside click
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const showDropdown =
    isFocused && query.trim().length >= 2 && (isLoading || hasSearched);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      role="group"
      aria-label="Find your company"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // If only one result, auto-select it
              if (results.length === 1) {
                onSelect(results[0].slug);
              }
            } else if (e.key === 'Escape') {
              setIsFocused(false);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-9 pr-10 h-11 text-sm"
          aria-label="Find your company"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Clear search"
          >
            <SearchX className="size-4" />
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {showDropdown ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
            className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-lg overflow-hidden"
            role="listbox"
          >
            {isLoading && results.length === 0 ? (
              <div className="px-3 py-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-6 text-center space-y-1.5">
                <SearchX className="size-5 mx-auto text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">
                  No companies match{' '}
                  <span className="font-medium text-foreground">
                    &ldquo;{query}&rdquo;
                  </span>
                  .
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  Try a different name, or ask your service provider for the
                  correct link.
                </p>
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto py-1">
                {results.map((c) => (
                  <li key={c.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFocused(false);
                        onSelect(c.slug);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-accent transition-colors group"
                    >
                      <Avatar className="size-8 ring-1 ring-border">
                        {c.logo ? (
                          <AvatarImage src={c.logo} alt={c.name} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="size-3" />
                          {c.industry || `/${c.slug}`}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground/60 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
