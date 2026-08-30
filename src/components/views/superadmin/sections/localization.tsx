'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Localization — supported languages, translation coverage, and missing-string
// queue. Used to plan localization work across the platform UI.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Globe, Languages, AlertCircle, Plus, Type,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DataTable, type Column } from '@/components/ui/data-table';
import { toast } from 'sonner';

import { SectionHeader, DemoDataPill, KpiCard } from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

type LangStatus = 'Active' | 'Beta' | 'Draft';

interface LangRow {
  name: string;
  code: string;
  native: string;
  coverage: number;
  status: LangStatus;
}

const LANGUAGES: LangRow[] = [
  { name: 'English', code: 'en', native: 'English', coverage: 100, status: 'Active' },
  { name: 'Spanish', code: 'es', native: 'Español', coverage: 92, status: 'Active' },
  { name: 'French', code: 'fr', native: 'Français', coverage: 88, status: 'Active' },
  { name: 'German', code: 'de', native: 'Deutsch', coverage: 84, status: 'Active' },
  { name: 'Portuguese', code: 'pt', native: 'Português', coverage: 78, status: 'Active' },
  { name: 'Hindi', code: 'hi', native: 'हिन्दी', coverage: 68, status: 'Beta' },
  { name: 'Arabic', code: 'ar', native: 'العربية', coverage: 52, status: 'Beta' },
  { name: 'Japanese', code: 'ja', native: '日本語', coverage: 34, status: 'Draft' },
];

interface MissingString {
  lang: string;
  code: string;
  text: string;
}

const MISSING: MissingString[] = [
  { lang: 'Spanish', code: 'es', text: 'workspace.settings.billing.cancel' },
  { lang: 'French', code: 'fr', text: 'ai.assistant.emptyState' },
  { lang: 'Hindi', code: 'hi', text: 'marketplace.pack.install.confirm' },
  { lang: 'Arabic', code: 'ar', text: 'announcements.compose.audience' },
  { lang: 'Japanese', code: 'ja', text: 'audit.log.filter.workspace' },
];

const STATUS_BADGE: Record<LangStatus, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Beta: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Draft: 'bg-muted text-muted-foreground border-border',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function LocalizationSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Localization"
        description="Manage supported languages and translation coverage."
        icon={Globe}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Opening new language dialog')}>
              <Plus className="size-4 mr-1.5" />Add Language
            </Button>
            <DemoDataPill />
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Supported Languages" value={8} icon={Globe} color="sky" />
        <KpiCard label="Translation Coverage" value="84%" icon={Languages} color="emerald" />
        <KpiCard label="Missing Strings" value={412} icon={AlertCircle} color="amber" />
      </div>

      {/* Supported languages table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Supported Languages</CardTitle>
          <CardDescription>Languages enabled across the platform UI.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={languageColumns}
            data={LANGUAGES}
            rowKey={(l) => l.code}
            emptyMessage="No languages configured"
            emptyIcon={Globe}
          />
        </CardContent>
      </Card>

      {/* Missing translations */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Missing Translations</CardTitle>
          <CardDescription>Recently flagged strings awaiting translation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {MISSING.map((m) => (
            <div key={m.code + m.text} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
              <Badge variant="secondary" className="font-mono uppercase">{m.code}</Badge>
              <span className="text-sm text-muted-foreground">{m.lang}</span>
              <code className="text-xs font-mono text-foreground/80 flex-1 truncate">{m.text}</code>
              <Button size="sm" variant="outline" onClick={() => toast.info(`Translating "${m.text}" to ${m.lang}`)}>
                <Type className="size-3.5 mr-1.5" />Translate
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

const languageColumns: Column<LangRow>[] = [
  { key: 'name', header: 'Language', render: (l) => <span className="font-medium">{l.name}</span> },
  { key: 'code', header: 'Code', render: (l) => <Badge variant="secondary" className="font-mono">{l.code}</Badge> },
  { key: 'native', header: 'Native Name', render: (l) => <span className="text-muted-foreground">{l.native}</span> },
  {
    key: 'coverage', header: 'Coverage', render: (l) => (
      <div className="flex items-center gap-2">
        <Progress value={l.coverage} className="h-1.5 w-24" />
        <span className="text-xs font-mono text-muted-foreground w-9">{l.coverage}%</span>
      </div>
    ), className: 'w-[200px]',
  },
  { key: 'status', header: 'Status', render: (l) => <Badge variant="outline" className={STATUS_BADGE[l.status]}>{l.status}</Badge> },
  {
    key: 'actions', header: 'Actions', render: (l) => (
      <div className="text-right">
        <Button size="sm" variant="ghost" onClick={() => toast.info(`Editing ${l.name} translations`)}>
          <Type className="size-4" />
        </Button>
      </div>
    ), className: 'text-right',
  },
];
