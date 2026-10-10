'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronRight, Building2, Sparkles, Command } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { BGOS_NAVIGATION } from '../../../shared/bgos-navigation';

export function BgosHeaderTools() {
  const { auth, setCurrentView, aiDrawerOpen, setAiDrawerOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const businessName = auth.tenant?.name || auth.workspace?.name || 'Your Business';
  const allItems = BGOS_NAVIGATION.flatMap((group) => group.items);
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
    <div className="bgos-header-tools flex items-center justify-between gap-3 w-full">
      {/* Business Workspace Selector */}
      <button
        className="bgos-workspace-button group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-1.5 text-left transition-all hover:border-primary/50 shadow-2xs"
        onClick={() => setCurrentView('creatorProfile')}
        aria-label="Open business profile"
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400">
          <Building2 size={15} />
        </div>
        <div className="min-w-0 pr-1">
          <strong className="block truncate text-xs font-semibold leading-tight text-foreground">
            {businessName}
          </strong>
          <small className="block text-[10px] font-medium text-muted-foreground leading-tight">
            BGOS Workspace
          </small>
        </div>
        <ChevronRight size={13} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>

      {/* Center Search / Feature Finder */}
      <div
        className="bgos-feature-finder relative hidden sm:flex items-center gap-2 flex-1 max-w-md rounded-xl border border-border bg-background px-3 py-1.5 text-muted-foreground transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <Search size={15} className="shrink-0 text-muted-foreground" />
        <input
          id="bgos-search-input"
          aria-label="Find a BGOS page or tool"
          placeholder="Search tools, leads, forms..."
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
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command size={10} />K
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
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
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

      {/* Right AI Copilot Quick Action */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
        className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-lg border-purple-200 bg-purple-50 px-2.5 text-xs font-semibold text-purple-700 shadow-2xs hover:bg-purple-100 hover:text-purple-800 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
        title="Open AI Copilot"
      >
        <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
        <span>AI Copilot</span>
      </Button>
    </div>
  );
}
