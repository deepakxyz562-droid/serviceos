'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Platform Settings — global platform configuration: branding defaults, limits,
// feature policy, and default modules for new workspaces.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Settings, Save, Shield } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { SectionHeader, DemoDataPill } from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

interface QuotaItem {
  label: string;
  value: number;
  description: string;
}

const QUOTAS: QuotaItem[] = [
  { label: 'Max workspaces per user', value: 5, description: 'Workspaces a single user can create or own.' },
  { label: 'Max users per workspace', value: 50, description: 'Member cap per workspace on the default plan.' },
  { label: 'Max API calls / min', value: 1000, description: 'Per-workspace rate limit on the public API.' },
  { label: 'Max file upload size (MB)', value: 25, description: 'Single-file upload cap across all modules.' },
];

interface PolicyItem {
  label: string;
  description: string;
  enabled: boolean;
}

const POLICIES: PolicyItem[] = [
  { label: 'Allow workspaces to use own AI keys', description: 'Members can supply their own provider API keys for AI features.', enabled: true },
  { label: 'Allow workspaces to install marketplace packs', description: 'Owners can browse and install third-party packs from the marketplace.', enabled: true },
  { label: 'Allow custom domains on Growth plan+', description: 'Workspaces on Growth and above can map a custom domain to portals.', enabled: true },
  { label: 'Allow API access on Starter plan+', description: 'Starter, Growth, and Pro plans get programmatic API access.', enabled: false },
];

interface ModuleItem {
  name: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_MODULES: ModuleItem[] = [
  { name: 'CRM', description: 'Contacts, leads, deals', enabled: true },
  { name: 'Communication', description: 'Email, SMS, chat', enabled: true },
  { name: 'Marketing', description: 'Campaigns, automation', enabled: true },
  { name: 'Automation', description: 'Workflows, triggers', enabled: true },
  { name: 'Operations', description: 'Tasks, projects', enabled: false },
  { name: 'Finance', description: 'Invoices, expenses', enabled: false },
  { name: 'System', description: 'Settings, team, roles', enabled: true },
  { name: 'Portals', description: 'Client & vendor portals', enabled: false },
  { name: 'AI', description: 'Assistants, copilots', enabled: true },
];

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'] as const;
const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo'] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function PlatformSettingsSection() {
  const [platformName, setPlatformName] = useState('ServiceOS');
  const [supportEmail, setSupportEmail] = useState('support@ServiceOS.io');
  const [currency, setCurrency] = useState<string>('USD');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [quotas, setQuotas] = useState(QUOTAS);
  const [policies, setPolicies] = useState(POLICIES);
  const [modules, setModules] = useState(DEFAULT_MODULES);

  function saveGeneral() { toast.success('Settings saved'); }
  function saveQuotas() { toast.success('Limits & quotas updated'); }
  function savePolicies() { toast.success('Feature policy updated'); }
  function saveModules() { toast.success('Default modules updated'); }

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Platform Settings"
        description="Global platform configuration — branding, defaults, limits, policies."
        icon={Settings}
        actions={<DemoDataPill />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card A — General */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription>Core platform identity and locale defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input id="platform-name" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-email">Support Email</Label>
              <Input id="support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={saveGeneral}><Save className="size-4 mr-2" />Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Card B — Limits & Quotas */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Limits &amp; Quotas</CardTitle>
            <CardDescription>Per-workspace and per-user resource caps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotas.map((q, idx) => (
              <div key={q.label} className="space-y-1.5">
                <Label htmlFor={`quota-${idx}`} className="text-sm font-medium">{q.label}</Label>
                <Input
                  id={`quota-${idx}`}
                  type="number"
                  value={q.value}
                  onChange={(e) => {
                    const next = [...quotas];
                    next[idx] = { ...q, value: Number(e.target.value) };
                    setQuotas(next);
                  }}
                  className="max-w-[140px]"
                />
                <p className="text-[11px] text-muted-foreground">{q.description}</p>
              </div>
            ))}
            <Separator />
            <Button onClick={saveQuotas} variant="outline"><Save className="size-4 mr-2" />Save Limits</Button>
          </CardContent>
        </Card>

        {/* Card C — Feature Policy */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4 text-primary" />Feature Policy
            </CardTitle>
            <CardDescription>Caps and capabilities granted to workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {policies.map((p, idx) => (
              <div key={p.label} className="py-3">
                {idx > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(v) => {
                      const next = [...policies];
                      next[idx] = { ...p, enabled: v };
                      setPolicies(next);
                    }}
                  />
                </div>
              </div>
            ))}
            <Separator />
            <div className="pt-3"><Button onClick={savePolicies} variant="outline"><Save className="size-4 mr-2" />Save Policy</Button></div>
          </CardContent>
        </Card>

        {/* Card D — Default Modules */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Default Modules</CardTitle>
            <CardDescription>Modules enabled by default for new workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {modules.map((m, idx) => (
              <div key={m.name} className="py-2.5">
                {idx > 0 && <Separator className="mb-2.5" />}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{m.description}</p>
                  </div>
                  <Switch
                    checked={m.enabled}
                    onCheckedChange={(v) => {
                      const next = [...modules];
                      next[idx] = { ...m, enabled: v };
                      setModules(next);
                    }}
                  />
                </div>
              </div>
            ))}
            <Separator />
            <div className="pt-3"><Button onClick={saveModules} variant="outline"><Save className="size-4 mr-2" />Save Defaults</Button></div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
