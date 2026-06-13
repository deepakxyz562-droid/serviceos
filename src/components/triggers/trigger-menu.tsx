'use client';

import { useState, useMemo } from 'react';
import { PREBUILT_TRIGGERS, TRIGGER_CATEGORIES, TRIGGER_EVENTS } from '@/lib/trigger-catalog';
import type { PrebuiltTrigger } from '@/lib/trigger-catalog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, ChevronRight, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TriggerMenuProps {
  /** Called when a trigger is selected */
  onSelect: (trigger: PrebuiltTrigger | { value: string; label: string; category: string }) => void;
  /** Currently selected trigger type (for highlighting) */
  selectedTriggerType?: string;
  /** Variant of the menu */
  variant?: 'sidebar' | 'dialog' | 'pills';
  /** Whether to show search */
  showSearch?: boolean;
  /** Whether to show counts */
  showCounts?: boolean;
  /** Additional className */
  className?: string;
  /** Whether to show prebuilt triggers (with actions) or just raw trigger events */
  mode?: 'prebuilt' | 'events';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive the category ID from a category label like "CRM Events" -> "CRM" */
function getCategoryId(categoryLabel: string): string {
  const match = TRIGGER_CATEGORIES.find((c) => c.label === categoryLabel);
  return match ? match.id : categoryLabel;
}

/** Get the category color class from a category label */
function getCategoryColor(categoryLabel: string): string {
  const cat = TRIGGER_CATEGORIES.find((c) => c.label === categoryLabel);
  return cat ? cat.color : 'text-muted-foreground';
}

/** Get the category icon from a category label */
function getCategoryIcon(categoryLabel: string): React.ElementType {
  const cat = TRIGGER_CATEGORIES.find((c) => c.label === categoryLabel);
  return cat ? cat.icon : Zap;
}

// ─── Pills Variant ────────────────────────────────────────────────────────────

function TriggerMenuPills({
  onSelect,
  selectedTriggerType,
  showCounts = true,
  mode = 'prebuilt',
  className,
}: TriggerMenuProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const items = mode === 'prebuilt' ? PREBUILT_TRIGGERS : TRIGGER_EVENTS;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      const cat = 'category' in item ? (item as { category: string }).category : '';
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [items]);

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-none', className)}>
      {TRIGGER_CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        const count = cat.id === 'all'
          ? categoryCounts['all']
          : categoryCounts[cat.label] || 0;
        const Icon = cat.icon;

        return (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
              'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
              isActive
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:border-emerald-500/20 hover:text-foreground'
            )}
          >
            <Icon className="h-3 w-3" />
            <span>{cat.label}</span>
            {showCounts && (
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sidebar Variant ──────────────────────────────────────────────────────────

function TriggerMenuSidebar({
  onSelect,
  selectedTriggerType,
  showSearch = true,
  showCounts = true,
  mode = 'prebuilt',
  className,
}: TriggerMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Start with all categories expanded
    return new Set(TRIGGER_CATEGORIES.filter((c) => c.id !== 'all').map((c) => c.id));
  });

  const items = mode === 'prebuilt' ? PREBUILT_TRIGGERS : TRIGGER_EVENTS;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      if ('name' in item) {
        const t = item as PrebuiltTrigger;
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.eventLabel.toLowerCase().includes(q)
        );
      }
      const e = item as { value: string; label: string; category: string };
      return (
        e.label.toLowerCase().includes(q) ||
        e.value.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, (PrebuiltTrigger | { value: string; label: string; category: string })[]>();
    for (const item of filteredItems) {
      const cat = 'category' in item ? (item as { category: string }).category : 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [filteredItems]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {showSearch && (
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search triggers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-1">
          {Array.from(grouped.entries()).map(([categoryLabel, categoryItems]) => {
            const catId = getCategoryId(categoryLabel);
            const catColor = getCategoryColor(categoryLabel);
            const CatIcon = getCategoryIcon(categoryLabel);
            const isExpanded = expandedCategories.has(catId);

            return (
              <div key={categoryLabel}>
                <button
                  onClick={() => toggleCategory(catId)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <CatIcon className={cn('h-3.5 w-3.5 shrink-0', catColor)} />
                  <span className="truncate">{categoryLabel}</span>
                  {showCounts && (
                    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                      {categoryItems.length}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-2 space-y-px pb-1">
                    {categoryItems.map((item) => {
                      const isPrebuilt = 'name' in item;
                      const triggerType = isPrebuilt
                        ? (item as PrebuiltTrigger).triggerType
                        : (item as { value: string }).value;
                      const isSelected = selectedTriggerType === triggerType;
                      const ItemIcon = isPrebuilt
                        ? (item as PrebuiltTrigger).icon
                        : getCategoryIcon((item as { category: string }).category);
                      const itemName = isPrebuilt
                        ? (item as PrebuiltTrigger).name
                        : (item as { label: string }).label;
                      const itemDesc = isPrebuilt
                        ? (item as PrebuiltTrigger).description
                        : undefined;

                      return (
                        <button
                          key={isPrebuilt ? (item as PrebuiltTrigger).id : (item as { value: string }).value}
                          onClick={() => onSelect(item)}
                          className={cn(
                            'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                            isSelected
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                              : 'hover:bg-muted/50 text-foreground'
                          )}
                        >
                          <ItemIcon
                            className={cn(
                              'mt-0.5 h-3.5 w-3.5 shrink-0',
                              isSelected ? 'text-emerald-600 dark:text-emerald-400' : catColor
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium leading-tight">
                              {itemName}
                            </div>
                            {itemDesc && (
                              <div className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
                                {itemDesc}
                              </div>
                            )}
                          </div>
                          {isPrebuilt && (item as PrebuiltTrigger).popular && (
                            <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px] font-semibold bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                              Popular
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-xs">No triggers found</p>
              <p className="text-[10px]">Try a different search term</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Dialog Variant ───────────────────────────────────────────────────────────

function TriggerMenuDialog({
  onSelect,
  selectedTriggerType,
  showSearch = true,
  showCounts = true,
  mode = 'prebuilt',
  className,
}: TriggerMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const items = mode === 'prebuilt' ? PREBUILT_TRIGGERS : TRIGGER_EVENTS;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      if ('name' in item) {
        const t = item as PrebuiltTrigger;
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.eventLabel.toLowerCase().includes(q)
        );
      }
      const e = item as { value: string; label: string; category: string };
      return (
        e.label.toLowerCase().includes(q) ||
        e.value.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, (PrebuiltTrigger | { value: string; label: string; category: string })[]>();
    for (const item of filteredItems) {
      const cat = 'category' in item ? (item as { category: string }).category : 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [filteredItems]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {showSearch && (
        <div className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search triggers by name, description, or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-1 pr-1">
          {Array.from(grouped.entries()).map(([categoryLabel, categoryItems]) => {
            const catId = getCategoryId(categoryLabel);
            const catColor = getCategoryColor(categoryLabel);
            const CatIcon = getCategoryIcon(categoryLabel);
            const isExpanded = expandedCategories.has(catId);

            return (
              <div key={categoryLabel} className="rounded-lg border border-border/50 overflow-hidden">
                <button
                  onClick={() => toggleCategory(catId)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    isExpanded ? 'bg-muted/40' : 'hover:bg-muted/30'
                  )}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <CatIcon className={cn('h-4 w-4 shrink-0', catColor)} />
                  <span>{categoryLabel}</span>
                  {showCounts && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {categoryItems.length}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border/30 px-2 py-1.5 space-y-1">
                    {categoryItems.map((item) => {
                      const isPrebuilt = 'name' in item;
                      const triggerType = isPrebuilt
                        ? (item as PrebuiltTrigger).triggerType
                        : (item as { value: string }).value;
                      const isSelected = selectedTriggerType === triggerType;
                      const ItemIcon = isPrebuilt
                        ? (item as PrebuiltTrigger).icon
                        : getCategoryIcon((item as { category: string }).category);
                      const itemName = isPrebuilt
                        ? (item as PrebuiltTrigger).name
                        : (item as { label: string }).label;
                      const itemDesc = isPrebuilt
                        ? (item as PrebuiltTrigger).description
                        : undefined;
                      const defaultActions = isPrebuilt
                        ? (item as PrebuiltTrigger).defaultActions
                        : undefined;

                      return (
                        <button
                          key={isPrebuilt ? (item as PrebuiltTrigger).id : (item as { value: string }).value}
                          onClick={() => onSelect(item)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-all duration-150',
                            isSelected
                              ? 'bg-emerald-500/10 ring-1 ring-emerald-500/25 shadow-sm'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          {/* Radio-style indicator */}
                          <div className="mt-0.5 shrink-0">
                            <div
                              className={cn(
                                'h-4 w-4 rounded-full border-2 transition-colors',
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-muted-foreground/30'
                              )}
                            >
                              {isSelected && (
                                <div className="flex h-full items-center justify-center">
                                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <ItemIcon
                                className={cn(
                                  'h-4 w-4 shrink-0',
                                  isSelected ? 'text-emerald-600 dark:text-emerald-400' : catColor
                                )}
                              />
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  isSelected && 'text-emerald-700 dark:text-emerald-400'
                                )}
                              >
                                {itemName}
                              </span>
                              {isPrebuilt && (item as PrebuiltTrigger).popular && (
                                <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px] font-semibold bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                                  Popular
                                </Badge>
                              )}
                            </div>
                            {itemDesc && (
                              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                {itemDesc}
                              </p>
                            )}
                            {defaultActions && defaultActions.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {defaultActions.map((action, idx) => {
                                  const ActionIcon = action.icon;
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                    >
                                      <ActionIcon className="h-2.5 w-2.5" />
                                      {action.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No triggers found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function TriggerMenu(props: TriggerMenuProps) {
  const { variant = 'sidebar' } = props;

  switch (variant) {
    case 'pills':
      return <TriggerMenuPills {...props} />;
    case 'dialog':
      return <TriggerMenuDialog {...props} />;
    case 'sidebar':
    default:
      return <TriggerMenuSidebar {...props} />;
  }
}

export type { TriggerMenuProps };
