'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Base — platform-wide help articles and documentation, organized
// by category, with authoring and readership metrics.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BookOpen, FileText, CheckCircle2, Eye, Plus, Pencil, Rocket,
  CreditCard, Plug, Code, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

import { SectionHeader, DemoDataPill, formatDate, formatNumber } from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

type ArticleStatus = 'Published' | 'Draft';

interface ArticleRow {
  title: string;
  category: string;
  author: string;
  views: number;
  status: ArticleStatus;
  updated: string;
}

const ARTICLES: ArticleRow[] = [
  { title: 'Getting started with your first workspace', category: 'Getting Started', author: 'Priya N.', views: 4820, status: 'Published', updated: '2025-01-10T14:00:00Z' },
  { title: 'Inviting team members and assigning roles', category: 'Getting Started', author: 'Marcus T.', views: 3210, status: 'Published', updated: '2025-01-08T11:30:00Z' },
  { title: 'Updating your billing method and plan', category: 'Billing', author: 'Priya N.', views: 2890, status: 'Published', updated: '2025-01-09T09:15:00Z' },
  { title: 'Prorated upgrades and downgrades explained', category: 'Billing', author: 'Aisha R.', views: 1240, status: 'Published', updated: '2025-01-05T16:45:00Z' },
  { title: 'Connecting Slack, Gmail, and Zapier', category: 'Integrations', author: 'Marcus T.', views: 5410, status: 'Published', updated: '2025-01-11T13:20:00Z' },
  { title: 'Webhooks: signing and verifying payloads', category: 'API', author: 'Tom L.', views: 1870, status: 'Published', updated: '2025-01-07T10:00:00Z' },
  { title: 'Rate limits and pagination conventions', category: 'API', author: 'Tom L.', views: 980, status: 'Draft', updated: '2025-01-12T08:10:00Z' },
  { title: 'AI assistant returning empty responses', category: 'Troubleshooting', author: 'Priya N.', views: 612, status: 'Published', updated: '2025-01-12T10:24:00Z' },
];

interface CategoryRow {
  name: string;
  icon: LucideIcon;
  count: number;
  color: string;
}

const CATEGORIES: CategoryRow[] = [
  { name: 'Getting Started', icon: Rocket, count: 18, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { name: 'Billing', icon: CreditCard, count: 14, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { name: 'Integrations', icon: Plug, count: 27, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { name: 'API', icon: Code, count: 31, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { name: 'Troubleshooting', icon: Wrench, count: 22, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { name: 'Announcements', icon: FileText, count: 12, color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
];

interface StatItem { label: string; value: string; icon: LucideIcon; color: string; }

const STATS: StatItem[] = [
  { label: 'Total Articles', value: '124', icon: FileText, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { label: 'Published', value: '108', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { label: 'Views (30d)', value: '24.3K', icon: Eye, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
];

const STATUS_BADGE: Record<ArticleStatus, string> = {
  Published: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Draft: 'bg-muted text-muted-foreground border-border',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function KnowledgeBaseSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Knowledge Base"
        description="Platform-wide help articles and documentation."
        icon={BookOpen}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Opening article editor')}>
              <Plus className="size-4 mr-1.5" />New Article
            </Button>
            <DemoDataPill />
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map((s) => (
          <Card key={s.label} className="card-shadow">
            <CardContent className="p-4 sm:p-5 flex items-center gap-4">
              <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', s.color)}>
                <s.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Articles + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-6">
        {/* Articles (70%) */}
        <Card className="card-shadow lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Articles</CardTitle>
            <CardDescription>All published and draft help articles.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Author</TableHead>
                    <TableHead>Views</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ARTICLES.map((a) => (
                    <TableRow key={a.title}>
                      <TableCell className="font-medium max-w-[260px] truncate">{a.title}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.category}</TableCell>
                      <TableCell className="text-sm">{a.author}</TableCell>
                      <TableCell className="font-mono text-xs">{formatNumber(a.views)}</TableCell>
                      <TableCell><Badge variant="outline" className={STATUS_BADGE[a.status]}>{a.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.updated)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => toast.info(`Editing "${a.title.slice(0, 30)}..."`)}><Pencil className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toast.info(`Previewing "${a.title.slice(0, 30)}..."`)}><Eye className="size-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Categories (30%) */}
        <Card className="card-shadow lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
            <CardDescription>Browse articles by topic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                onClick={() => toast.info(`Filtering by ${c.name}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
              >
                <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', c.color)}>
                  <c.icon className="size-4" />
                </div>
                <span className="text-sm font-medium text-foreground flex-1 truncate">{c.name}</span>
                <Badge variant="secondary" className="font-mono">{c.count}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
