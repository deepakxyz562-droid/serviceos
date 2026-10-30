'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronRight, Command } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { BGOS_NAVIGATION, bgosNavigationView } from '../../../shared/bgos-navigation';
import { BgosProfileSwitcher } from './profile-switcher';

export function BgosHeaderTools() {
  const { currentView, setCurrentView } = useAppStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const allItems = BGOS_NAVIGATION.flatMap((group) =>
    group.items.map((item) => ({ view: item.view, label: item.label }))
  );
  const activeNavView = bgosNavigationView(currentView);
  const currentTitle =
    allItems.find((item) => item.view === activeNavView)?.label || 'Overview';

  const items = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        const input = document.getElementById('bgos-search-input');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="bgos-header-tools flex items-center gap-3 w-full">
      {/* Accessible Current BGOS Page Title */}
      <h1 className="sr-only">{currentTitle}</h1>

      {/* Business Profile Dropdown Switcher */}
      <BgosProfileSwitcher />

      {/* Left-aligned Wide Global Search / Feature Finder */}
      <div
        className="bgos-feature-finder relative flex items-center gap-2.5 flex-1 max-w-xl rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70 px-3.5 py-2 text-slate-500 transition-all focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-[#009F50]/60 focus-within:ring-2 focus-within:ring-[#009F50]/15"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          id="bgos-search-input"
          aria-label="Search customers, reviews, posts, or settings"
          placeholder="Search customers, reviews, posts, or settings..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter' && items[0]) {
              setCurrentView(items[0].view);
              setOpen(false);
            }
          }}
          className="w-full bg-transparent text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 shadow-2xs">
          <Command size={11} />K
        </kbd>

        {open && query.trim().length > 0 && (
          <div className="bgos-feature-results absolute top-full left-0 right-0 z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
            <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">Jump to tool</p>
            {items.length ? (
              items.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => {
                    setCurrentView(item.view);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-[#E8F8EF] hover:text-[#009F50]"
                >
                  <span>{item.label}</span>
                  <ChevronRight size={13} className="text-muted-foreground" />
                </button>
              ))
            ) : (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matching features found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

