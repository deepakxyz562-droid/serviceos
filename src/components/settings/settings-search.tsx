'use client';

/**
 * SettingsSearch — command-palette-style search across all 14 Business
 * Owner settings sections.
 *
 * Behaviour:
 *   - Type → results filter in a dropdown below the input (max 8 shown).
 *   - Click a result (or press Enter on a highlighted result) → navigate
 *     to that section and clear the query.
 *   - Click outside / press Escape → close the dropdown.
 *   - Keyboard arrow navigation: Up/Down to move, Enter to select.
 *
 * Search is powered by `searchSettingsSections` from the config, which
 * matches against label, description, and the `keywords` array — so
 * searching "stripe" finds the Integrations section, "2fa" finds Security,
 * "invoice" finds Finance, etc.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSettingsIcon } from '@/components/settings/settings-icons';
import { searchSettingsSections, type SettingsSection } from '@/components/settings/settings-config';

interface SettingsSearchProps {
  /** Currently active section id (used to highlight the active result). */
  activeSectionId: string;
  /** Called when the user picks a result. */
  onSelect: (sectionId: string) => void;
}

export function SettingsSearch({ activeSectionId, onSelect }: SettingsSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<SettingsSection[]>(() => {
    if (!query.trim()) return [];
    return searchSettingsSections(query).slice(0, 8);
  }, [query]);

  // Clamp the highlight index if results shrink below it. Computed during
  // render so we avoid a setState-in-effect cascade.
  const safeHighlightedIndex = results.length === 0 ? 0 : Math.min(highlightedIndex, results.length - 1);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Global keyboard shortcut: "/" focuses the search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleSelect = (section: SettingsSection) => {
    onSelect(section.id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[safeHighlightedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search settings…  (press / to focus)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-16 h-10"
          aria-label="Search settings sections"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="settings-search-results"
        />
        {!query && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border bg-muted text-muted-foreground pointer-events-none">
            /
          </kbd>
        )}
      </div>

      {open && query.trim() && (
        <div
          id="settings-search-results"
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-lg border bg-popover shadow-md overflow-hidden"
        >
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No settings found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((section, idx) => {
                const Icon = getSettingsIcon(section.icon);
                const isActive = section.id === activeSectionId;
                const isHighlighted = idx === safeHighlightedIndex;
                return (
                  <li key={section.id} role="option" aria-selected={isHighlighted}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelect(section)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isHighlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      }`}
                    >
                      <span className={`flex items-center justify-center size-8 rounded-md shrink-0 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="size-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{section.label}</span>
                          {section.comingSoon && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                              Soon
                            </Badge>
                          )}
                          {isActive && (
                            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {section.description}
                        </p>
                      </div>
                      {isHighlighted && (
                        <CornerDownLeft className="size-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {results.length > 0 && (
            <div className="border-t bg-muted/30 px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ArrowUp className="size-2.5" />
                  <ArrowDown className="size-2.5" />
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="size-2.5" />
                  select
                </span>
                <span>esc to close</span>
              </div>
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
