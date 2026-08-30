'use client';

/**
 * CustomerListView — the "no customer selected" branch of the Customer
 * 360° view.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Renders the hero header, search/sort/layout toolbar, and either:
 *   • a loading skeleton grid (8 placeholder cards),
 *   • an empty state ("No customers found"),
 *   • a cards-grid view, or
 *   • a table view.
 *
 * Pure presentational component. The parent owns:
 *   • `customersLoading`, `filteredCustomers` — from the customer list
 *     query + parent-side search/sort useMemo.
 *   • `searchQuery`, `setSearchQuery`, `sortBy`, `setSortBy`,
 *     `viewLayout`, `setViewLayout` — toolbar state.
 *   • `onSelectCustomer(id)` — callback to set the selected customer id.
 */

import {
  Users, Search, Phone, MessageSquare, MapPin,
  ChevronRight, LayoutGrid, List,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatDate,
  getInitials,
  parseTags,
  tagColors,
} from '../utils/customer-helpers';
import type { SortOption, ViewLayout } from '../types';

interface CustomerListViewProps {
  customersLoading: boolean;
  filteredCustomers: any[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  viewLayout: ViewLayout;
  setViewLayout: (v: ViewLayout) => void;
  onSelectCustomer: (id: string) => void;
}

export function CustomerListView({
  customersLoading,
  filteredCustomers,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewLayout,
  setViewLayout,
  onSelectCustomer,
}: CustomerListViewProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Hero Header with gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600/10 via-background to-teal-600/5 px-6 pt-8 pb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-600/15 shadow-sm">
              <Users className="size-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Customer 360&deg;</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Everything about a customer on a single screen</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="bg-card border-border text-muted-foreground">
              {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Search + Sort + View Layout Switcher */}
      <div className="px-6 pb-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, phone, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground h-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
            {(['name', 'recent', 'value'] as SortOption[]).map(option => (
              <Button
                key={option}
                size="sm"
                variant={sortBy === option ? 'default' : 'ghost'}
                className={cn(
                  'h-7 text-xs px-2.5 rounded-md transition-all duration-200 cursor-pointer',
                  sortBy === option
                    ? 'bg-accent text-accent-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setSortBy(option)}
              >
                {option === 'name' && 'Name'}
                {option === 'recent' && 'Recent'}
                {option === 'value' && 'Value'}
              </Button>
            ))}
          </div>

          {/* Layout Switcher Toggle: Cards vs Table */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                viewLayout === 'grid' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid Cards View"
            >
              <LayoutGrid className="size-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                viewLayout === 'table' ? 'bg-background text-emerald-700 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Table View"
            >
              <List className="size-3.5" /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Customer Content */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        {customersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="size-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Users className="size-10 text-muted-foreground/60" />
              </div>
              <div className="absolute -bottom-1 -right-1 size-8 rounded-lg bg-muted flex items-center justify-center">
                <Search className="size-4 text-muted-foreground/80" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No customers found</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Customers will appear here once they are added'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : viewLayout === 'grid' ? (
          /* ─── Cards Grid ───────────────────────────────────────────── */
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCustomers.map((c: any) => {
                const tags = parseTags((c as any).tags);
                const primaryTag = tags[0];

                return (
                  <Card
                    key={c.id}
                    className="group relative bg-card border-slate-200/90 dark:border-slate-800 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-500/40 p-4 space-y-3 flex flex-col justify-between"
                    onClick={() => onSelectCustomer(c.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-11 border-2 border-emerald-100 dark:border-emerald-950 shrink-0">
                          <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                            {getInitials(c.name || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                            {c.name}
                          </h4>
                          <div className="flex items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="truncate">{c.phone || 'No phone'}</span>
                            {c.phone && (
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:${c.phone}`}
                                  className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                                  title="Call customer"
                                >
                                  <Phone className="size-3.5" />
                                </a>
                                <a
                                  href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                                  title="WhatsApp customer"
                                >
                                  <MessageSquare className="size-3.5" />
                                </a>
                              </div>
                            )}
                          </div>
                          {c.email && (
                            <p className="text-xs text-slate-400 truncate">{c.email}</p>
                          )}
                        </div>
                      </div>

                      {c.address && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 pt-1">
                          <MapPin className="size-3.5 shrink-0 text-slate-400 mt-0.5" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">Since {formatDate(c.createdAt)}</span>
                      {primaryTag && (
                        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', tagColors[primaryTag] || 'bg-muted text-muted-foreground')}>
                          {primaryTag}
                        </Badge>
                      )}
                      <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          /* ─── Table View ───────────────────────────────────────────── */
          <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Phone</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Address</TableHead>
                    <TableHead className="font-bold">Created</TableHead>
                    <TableHead className="text-right font-bold w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((c: any) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                      onClick={() => onSelectCustomer(c.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 border border-emerald-100 dark:border-emerald-950 shrink-0">
                            <AvatarFallback className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                              {getInitials(c.name || '?')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <span>{c.phone || '—'}</span>
                          {c.phone && (
                            <div className="flex items-center gap-0.5 ml-auto" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`tel:${c.phone}`}
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Call"
                              >
                                <Phone className="size-3" />
                              </a>
                              <a
                                href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                title="WhatsApp"
                              >
                                <MessageSquare className="size-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 truncate max-w-[160px]">{c.email || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-500 truncate max-w-[180px]">{c.address || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(c.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 font-semibold"
                          onClick={() => onSelectCustomer(c.id)}
                        >
                          Profile 360°
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
}
