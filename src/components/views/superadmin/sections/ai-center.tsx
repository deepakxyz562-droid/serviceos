'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AI Center — flagship superadmin section.
// Multi-provider AI governance: OpenAI / Claude / Gemini / GLM / DeepSeek /
// Mistral. Monitor token usage, costs, models, and prompt templates in one
// place. Stripe-style cards + Vercel-style chart aesthetics. All demo data.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Settings2,
  PowerOff,
  Cpu,
  Coins,
  DollarSign,
  Clock,
  Pencil,
  Trash2,
  Plug,
  Gauge,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

import {
  SectionHeader,
  DemoDataPill,
  KpiCard,
  formatCurrency,
  formatNumber,
  getStatusBadgeClasses,
} from '@/components/views/superadmin/_shared';
import type { KpiColor } from '@/components/views/superadmin/_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

type ProviderColor = 'emerald' | 'amber' | 'sky' | 'violet' | 'rose' | 'teal';

interface Provider {
  id: string;
  name: string;
  initial: string;
  color: ProviderColor;
  connected: boolean;
  modelsCount: number;
  monthlyCost: number;
  monthlyTokens: number;
  enabledModels: string[];
}

interface TopSpender {
  rank: number;
  name: string;
  cost: number;
  percent: number;
}

interface UsageKpi {
  label: string;
  value: string;
  trend: number;
  color: KpiColor;
  icon: LucideIcon;
  sub: string;
}

interface ModelRow {
  id: string;
  name: string;
  provider: string;
  context: string;
  inputCost: number; // $ per 1K tokens
  outputCost: number; // $ per 1K tokens
  active: boolean;
}

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  preview: string;
  uses: number;
  lastEdited: string; // human-readable relative string (static, avoids hydration issues)
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const AVATAR_COLOR_CLASSES: Record<ProviderColor, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
};

// Brand-ish hex colors for the per-bar cells in the cost chart. These are
// saturated brand tones that read well in both light and dark themes (grid /
// axis strokes use OKLCH theme tokens below; cells stay brand-saturated).
const BAR_COLORS: Record<ProviderColor, string> = {
  emerald: '#10b981',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  teal: '#14b8a6',
};

const PROVIDERS: Provider[] = [
  { id: 'openai', name: 'OpenAI', initial: 'O', color: 'emerald', connected: true, modelsCount: 8, monthlyCost: 1284, monthlyTokens: 12_400_000, enabledModels: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'] },
  { id: 'claude', name: 'Claude', initial: 'C', color: 'amber', connected: true, modelsCount: 5, monthlyCost: 642, monthlyTokens: 4_200_000, enabledModels: ['claude-3.5-sonnet', 'claude-3-opus'] },
  { id: 'gemini', name: 'Gemini', initial: 'G', color: 'sky', connected: true, modelsCount: 4, monthlyCost: 318, monthlyTokens: 8_100_000, enabledModels: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'glm', name: 'GLM', initial: 'GLM', color: 'violet', connected: true, modelsCount: 3, monthlyCost: 96, monthlyTokens: 5_600_000, enabledModels: ['glm-4-plus', 'glm-4-air'] },
  { id: 'deepseek', name: 'DeepSeek', initial: 'D', color: 'rose', connected: false, modelsCount: 0, monthlyCost: 0, monthlyTokens: 0, enabledModels: [] },
  { id: 'mistral', name: 'Mistral', initial: 'M', color: 'teal', connected: true, modelsCount: 4, monthlyCost: 124, monthlyTokens: 2_300_000, enabledModels: ['mistral-large', 'mixtral-8x7b'] },
];

const COST_BY_PROVIDER = PROVIDERS.map((p) => ({
  name: p.name,
  cost: p.monthlyCost,
  color: BAR_COLORS[p.color],
}));

const TOP_SPENDERS: TopSpender[] = [
  { rank: 1, name: 'AquaFlow Plumbing', cost: 412, percent: 12 },
  { rank: 2, name: 'Bloom Beauty', cost: 318, percent: 9 },
  { rank: 3, name: 'Apex HVAC', cost: 284, percent: 8 },
  { rank: 4, name: 'ClearWell Cleaning', cost: 156, percent: 4 },
  { rank: 5, name: 'VoltEdge Electric', cost: 124, percent: 3 },
];

const USAGE_KPIS: UsageKpi[] = [
  { label: 'Total Tokens', value: '32.6M', trend: 14, color: 'violet', icon: Coins, sub: 'Across all providers' },
  { label: 'Total Cost', value: '$2,464', trend: 8, color: 'emerald', icon: DollarSign, sub: 'This month' },
  { label: 'Avg Latency', value: '340ms', trend: -2, color: 'sky', icon: Clock, sub: 'p50 response time' },
];

const MODELS: ModelRow[] = [
  { id: 'm1', name: 'gpt-4o', provider: 'OpenAI', context: '128K', inputCost: 0.0025, outputCost: 0.01, active: true },
  { id: 'm2', name: 'gpt-4o-mini', provider: 'OpenAI', context: '128K', inputCost: 0.00015, outputCost: 0.0006, active: true },
  { id: 'm3', name: 'o1-preview', provider: 'OpenAI', context: '128K', inputCost: 0.015, outputCost: 0.06, active: true },
  { id: 'm4', name: 'claude-3.5-sonnet', provider: 'Claude', context: '200K', inputCost: 0.003, outputCost: 0.015, active: true },
  { id: 'm5', name: 'claude-3-opus', provider: 'Claude', context: '200K', inputCost: 0.015, outputCost: 0.075, active: false },
  { id: 'm6', name: 'gemini-1.5-pro', provider: 'Gemini', context: '2M', inputCost: 0.00125, outputCost: 0.005, active: true },
  { id: 'm7', name: 'gemini-1.5-flash', provider: 'Gemini', context: '1M', inputCost: 0.000075, outputCost: 0.0003, active: true },
  { id: 'm8', name: 'glm-4-plus', provider: 'GLM', context: '128K', inputCost: 0.0007, outputCost: 0.0007, active: true },
  { id: 'm9', name: 'glm-4-air', provider: 'GLM', context: '128K', inputCost: 0.0001, outputCost: 0.0001, active: true },
  { id: 'm10', name: 'mistral-large', provider: 'Mistral', context: '128K', inputCost: 0.002, outputCost: 0.006, active: true },
];

const PROMPT_TEMPLATES: PromptTemplate[] = [
  { id: 't1', name: 'Welcome Message', category: 'Customer Support', preview: 'Hi {{customer_name}}, welcome to {{business_name}}! We\'re thrilled to have you onboard. Here\'s what to expect from your first service visit...', uses: 1248, lastEdited: '2d ago' },
  { id: 't2', name: 'Follow-up Sequence', category: 'Sales', preview: 'Just checking in after your recent service on {{date}}. Did everything meet your expectations? We\'d love to schedule your next visit...', uses: 892, lastEdited: '5d ago' },
  { id: 't3', name: 'Review Request', category: 'Operations', preview: 'We hope you loved your experience with {{technician}}. Would you mind leaving a quick review? It helps us keep delivering great service.', uses: 654, lastEdited: '1d ago' },
  { id: 't4', name: 'Quote Generator', category: 'Sales', preview: 'Based on your requirements for {{service_type}}, here\'s a tailored estimate. Our team can break down line items and answer any questions...', uses: 423, lastEdited: '9d ago' },
  { id: 't5', name: 'Job Summary', category: 'Operations', preview: 'Service completed: {{service_summary}}. Technician notes: {{notes}}. Total time on site: {{duration}}. Parts used: {{parts}}.', uses: 234, lastEdited: '11h ago' },
  { id: 't6', name: 'Support Triage', category: 'Customer Support', preview: 'Classify this inquiry: {{message}}. Suggested routing: {{team}}. Estimated priority: {{priority}}. Confidence score: {{confidence}}.', uses: 567, lastEdited: '3d ago' },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <Card className="card-shadow card-hover flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'size-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0',
              AVATAR_COLOR_CLASSES[provider.color],
            )}
          >
            {provider.initial}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{provider.name}</CardTitle>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] mt-1',
                getStatusBadgeClasses(provider.connected ? 'connected' : 'disconnected'),
              )}
            >
              {provider.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-border">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Models</p>
            <p className="text-sm font-semibold text-foreground">{provider.modelsCount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cost/mo</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(provider.monthlyCost)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tokens</p>
            <p className="text-sm font-semibold text-foreground">{formatNumber(provider.monthlyTokens)}</p>
          </div>
        </div>

        {provider.enabledModels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {provider.enabledModels.map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px] font-mono">
                {m}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No models enabled</p>
        )}

        <div className="flex items-center gap-2 mt-auto pt-1">
          {provider.connected ? (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                <Settings2 className="size-3.5 mr-1" /> Configure
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                aria-label={`Disconnect ${provider.name}`}
              >
                <PowerOff className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" className="h-8 text-xs flex-1">
              <Plus className="size-3.5 mr-1" /> Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TopSpendersCard() {
  return (
    <Card className="card-shadow h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="size-4 text-primary" />
          Top Spenders
        </CardTitle>
        <CardDescription className="text-xs">
          Workspaces ranked by AI spend this month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {TOP_SPENDERS.map((s) => (
          <div key={s.rank} className="flex items-center gap-3">
            <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
              {s.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-sm font-bold text-foreground shrink-0">
                  {formatCurrency(s.cost)}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={s.percent} className="h-1.5" />
                <span className="text-[11px] text-muted-foreground shrink-0 w-9 text-right">
                  {s.percent}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function AICenterSection() {
  const [modelEnabled, setModelEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MODELS.map((m) => [m.id, m.active])),
  );
  const [promptQuery, setPromptQuery] = useState('');

  const filteredTemplates = PROMPT_TEMPLATES.filter((t) => {
    const q = promptQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  });

  return (
    <section className="space-y-6">
      <SectionHeader
        title="AI Center"
        description="Manage AI providers, monitor token usage & costs, configure models and prompt templates."
        icon={Sparkles}
        actions={
          <>
            <DemoDataPill />
            <Button variant="outline" size="sm">
              <Plus className="size-4 mr-1" /> Connect Provider
            </Button>
          </>
        }
      />

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="providers" className="flex-1">
            <Plug className="size-3.5" /> Providers
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex-1">
            <Coins className="size-3.5" /> Usage &amp; Costs
          </TabsTrigger>
          <TabsTrigger value="models" className="flex-1">
            <Cpu className="size-3.5" /> Models
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex-1">
            <Layers className="size-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Providers ─────────────────────────────────────────── */}
        <TabsContent value="providers" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROVIDERS.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </TabsContent>

        {/* ─── Tab 2: Usage & Costs ─────────────────────────────────────── */}
        <TabsContent value="usage" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left (60%): cost-by-provider bar chart */}
            <Card className="card-shadow lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cost by Provider</CardTitle>
                <CardDescription className="text-xs">
                  Spend this month, in USD
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={COST_BY_PROVIDER}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border)' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                        tickFormatter={(v: number) => `$${v}`}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--foreground)',
                          fontSize: '12px',
                          padding: '6px 10px',
                        }}
                        labelStyle={{ color: 'var(--muted-foreground)', fontSize: '11px' }}
                        formatter={(value: number) => [formatCurrency(value), 'Cost']}
                      />
                      <Bar dataKey="cost" radius={[6, 6, 0, 0]} maxBarSize={56}>
                        {COST_BY_PROVIDER.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Right (40%): top spenders */}
            <div className="lg:col-span-2">
              <TopSpendersCard />
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {USAGE_KPIS.map((k) => (
              <KpiCard
                key={k.label}
                label={k.label}
                value={k.value}
                icon={k.icon}
                trend={k.trend}
                color={k.color}
                sub={k.sub}
              />
            ))}
          </div>
        </TabsContent>

        {/* ─── Tab 3: Models ────────────────────────────────────────────── */}
        <TabsContent value="models" className="mt-4">
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Enabled Models</CardTitle>
              <CardDescription className="text-xs">
                Pricing per 1,000 tokens. Toggle models on or off per workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead className="text-right">Input $/1K</TableHead>
                      <TableHead className="text-right">Output $/1K</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODELS.map((m) => {
                      const enabled = modelEnabled[m.id];
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs font-medium text-foreground">
                            {m.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {m.provider}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {m.context}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            ${m.inputCost.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            ${m.outputCost.toFixed(4)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                getStatusBadgeClasses(enabled ? 'active' : 'inactive'),
                              )}
                            >
                              {enabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-3">
                              <Switch
                                checked={enabled}
                                onCheckedChange={(v) =>
                                  setModelEnabled((prev) => ({ ...prev, [m.id]: v }))
                                }
                                aria-label={`Toggle ${m.name}`}
                              />
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary"
                              >
                                Edit limits
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 4: Prompt Templates ──────────────────────────────────── */}
        <TabsContent value="prompts" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Prompt Templates</h3>
              <p className="text-xs text-muted-foreground">
                Reusable AI prompts shared across workflows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="size-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search templates..."
                  value={promptQuery}
                  onChange={(e) => setPromptQuery(e.target.value)}
                  className="pl-8 h-9 w-full sm:w-56"
                  aria-label="Search prompt templates"
                />
              </div>
              <Button size="sm" className="h-9 shrink-0">
                <Plus className="size-4 mr-1" /> New Template
              </Button>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="size-6 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No templates found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((t) => (
                <Card key={t.id} className="card-shadow card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{t.name}</CardTitle>
                        <Badge variant="secondary" className="text-[10px] mt-1.5">
                          {t.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          aria-label={`Edit ${t.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                          aria-label={`Delete ${t.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground italic line-clamp-2 leading-relaxed">
                      &ldquo;{t.preview}&rdquo;
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                      <span>Used {formatNumber(t.uses)} times</span>
                      <span>Last edited {t.lastEdited}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
