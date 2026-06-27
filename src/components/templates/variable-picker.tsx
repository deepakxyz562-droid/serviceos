'use client'

/**
 * VariablePicker
 * --------------
 * Searchable, categorized variable picker for the Template Studio.
 *
 * Lists all merge-tag variables (Customer, Lead, Booking, Job, Invoice,
 * Company, Employee) grouped by category. Clicking a chip calls `onInsert`
 * with the full namespaced key (e.g. "customer.name").
 *
 * When the user types into the search box the groups flatten into a single
 * list so results are scannable at a glance.
 */

import * as React from 'react'
import {
  Search,
  Users,
  UserPlus,
  CalendarCheck,
  Wrench,
  FileText,
  Building2,
  HardHat,
  type LucideIcon,
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  VARIABLE_CATEGORIES,
  type VariableDef,
  type VariableCategory,
} from '@/lib/template-vars'

/** Map of icon name (from VARIABLE_CATEGORIES) -> Lucide component. */
const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  UserPlus,
  CalendarCheck,
  Wrench,
  FileText,
  Building2,
  HardHat,
}

/** Get a Lucide icon component by its string name. */
function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Users
}

export interface VariablePickerProps {
  /** Called with the full variable key (e.g. "customer.name") when a chip is clicked. */
  onInsert: (variableKey: string) => void
  /** Smaller variant tuned for narrow sidebars. */
  compact?: boolean
  /** Optional className for the wrapper. */
  className?: string
}

export function VariablePicker({
  onInsert,
  compact = false,
  className,
}: VariablePickerProps) {
  const [query, setQuery] = React.useState('')

  const trimmed = query.trim().toLowerCase()
  const isSearching = trimmed.length > 0

  // Build the list of categories (with filtered variables) to render.
  const visibleCategories = React.useMemo(() => {
    if (!isSearching) return VARIABLE_CATEGORIES
    return VARIABLE_CATEGORIES.map((cat) => ({
      ...cat,
      variables: cat.variables.filter(
        (v) =>
          v.label.toLowerCase().includes(trimmed) ||
          v.key.toLowerCase().includes(trimmed) ||
          cat.name.toLowerCase().includes(trimmed)
      ),
    })).filter((cat) => cat.variables.length > 0)
  }, [isSearching, trimmed])

  // Flat list of matching variables (used when searching).
  const flatMatches = React.useMemo<VariableDef[]>(() => {
    if (!isSearching) return []
    return VARIABLE_CATEGORIES.flatMap((cat) =>
      cat.variables
        .filter(
          (v) =>
            v.label.toLowerCase().includes(trimmed) ||
            v.key.toLowerCase().includes(trimmed) ||
            cat.name.toLowerCase().includes(trimmed)
        )
        .map((v) => ({ ...v, category: cat.name }))
    )
  }, [isSearching, trimmed])

  const hasAnyMatch =
    visibleCategories.length > 0 || flatMatches.length > 0

  const handlePick = (key: string) => {
    onInsert(key)
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-background',
        compact ? 'p-3' : 'p-4',
        className
      )}
      role="region"
      aria-label="Template variables"
    >
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search variables..."
          aria-label="Search template variables"
          className="pl-8"
        />
      </div>

      {/* List */}
      {hasAnyMatch ? (
        <ScrollArea
          className={cn(
            'w-full rounded-md pr-2',
            // max-h-96 enforced on the inner viewport via style below.
            !compact && 'max-h-96'
          )}
          style={{ maxHeight: compact ? 320 : 384 }}
        >
          <div className="flex flex-col gap-4 pr-1">
            {isSearching
              ? renderFlatList(flatMatches, handlePick, compact)
              : visibleCategories.map((cat) =>
                  renderCategory(cat, handlePick, compact)
                )}
          </div>
        </ScrollArea>
      ) : (
        <EmptyState query={query} />
      )}

      {/* Hint footer */}
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Click a chip to insert it as <code className="font-mono">{'{{key}}'}</code>.
        </p>
      )}
    </div>
  )
}

/** Render a single category section with header + variable chips. */
function renderCategory(
  cat: VariableCategory,
  onPick: (key: string) => void,
  compact: boolean
) {
  const Icon = getIcon(cat.icon)
  return (
    <section key={cat.name} className="flex flex-col gap-2">
      <header className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <span>{cat.name}</span>
        <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
          {cat.variables.length}
        </Badge>
      </header>
      <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
        {cat.variables.map((v) => (
          <VariableChip
            key={v.key}
            variable={v}
            onPick={onPick}
            compact={compact}
          />
        ))}
      </div>
    </section>
  )
}

/** Render a flat (uncategorized) list of chips — used while searching. */
function renderFlatList(
  vars: VariableDef[],
  onPick: (key: string) => void,
  compact: boolean
) {
  return (
    <section className="flex flex-col gap-2">
      <header className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Results ({vars.length})
      </header>
      <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
        {vars.map((v) => (
          <VariableChip
            key={v.key}
            variable={v}
            onPick={onPick}
            compact={compact}
            showCategory
          />
        ))}
      </div>
    </section>
  )
}

interface VariableChipProps {
  /**
   * The variable to render. `category` is optional because variables in
   * VARIABLE_CATEGORIES are stored as `Omit<VariableDef, 'category'>` and we
   * only need it when `showCategory` is true (flat search results).
   */
  variable: Omit<VariableDef, 'category'> & { category?: string }
  onPick: (key: string) => void
  compact?: boolean
  showCategory?: boolean
}

function VariableChip({
  variable,
  onPick,
  compact = false,
  showCategory = false,
}: VariableChipProps) {
  return (
    <button
      type="button"
      onClick={() => onPick(variable.key)}
      title={variable.description || `${variable.label} — ${variable.example}`}
      aria-label={`Insert variable ${variable.label}, key ${variable.key}`}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-md border border-transparent bg-muted px-2 py-1',
        'text-left text-xs transition-colors',
        'hover:border-border hover:bg-primary/10 hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        compact ? 'max-w-full' : 'max-w-full'
      )}
    >
      <span className="font-medium text-foreground truncate">
        {variable.label}
      </span>
      <code
        className={cn(
          'font-mono text-[10px] text-muted-foreground group-hover:text-primary/80',
          'rounded bg-background/80 px-1 py-0.5',
          // In compact mode hide the key on very narrow containers (<380px).
          compact ? 'hidden min-[380px]:inline-block' : ''
        )}
      >
        {`{{${variable.key}}}`}
      </code>
      {showCategory && (
        <Badge
          variant="outline"
          className="ml-0.5 h-4 border-border px-1 text-[10px] text-muted-foreground"
        >
          {variable.category}
        </Badge>
      )}
    </button>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      <Search className="size-6 text-muted-foreground/60" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">
        No variables found
      </p>
      {query && (
        <p className="text-xs text-muted-foreground/80">
          No matches for <span className="font-mono">&ldquo;{query}&rdquo;</span>.
        </p>
      )}
    </div>
  )
}

export default VariablePicker
