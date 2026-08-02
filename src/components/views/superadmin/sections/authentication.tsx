'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Authentication — 2FA, SSO providers, password policy, active sessions.
// All data is demo/mock — see DemoDataPill in the header.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useSyncExternalStore } from 'react';
import {
  Lock,
  KeyRound,
  Smartphone,
  Fingerprint,
  Usb,
  ShieldCheck,
  Building2,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

import {
  SectionHeader,
  DemoDataPill,
  getStatusBadgeClasses,
  timeAgo,
} from '@/components/views/superadmin/_shared';

// ─── Demo data constants ─────────────────────────────────────────────────────

interface TwoFactorOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
}

const INITIAL_2FA_OPTIONS: TwoFactorOption[] = [
  {
    id: 'sms',
    label: 'SMS OTP',
    description: 'One-time codes delivered via SMS to the admin\u2019s verified phone number.',
    icon: Smartphone,
    enabled: true,
  },
  {
    id: 'totp',
    label: 'Authenticator app (TOTP)',
    description: 'Time-based codes from apps like 1Password, Authy, or Google Authenticator.',
    icon: KeyRound,
    enabled: true,
  },
  {
    id: 'webauthn',
    label: 'Hardware key (WebAuthn)',
    description: 'FIDO2 / WebAuthn security keys such as YubiKey or Titan.',
    icon: Usb,
    enabled: false,
  },
];

interface SsoProvider {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: 'connected' | 'disconnected';
}

const SSO_PROVIDERS: SsoProvider[] = [
  {
    id: 'saml',
    name: 'SAML 2.0',
    description: 'Enterprise SSO via Okta, OneLogin, Azure AD.',
    icon: ShieldCheck,
    status: 'connected',
  },
  {
    id: 'oidc',
    name: 'OIDC',
    description: 'OpenID Connect for modern identity providers.',
    icon: Fingerprint,
    status: 'connected',
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'OAuth 2.0 with Google Workspace directory sync.',
    icon: Building2,
    status: 'disconnected',
  },
];

interface PasswordPolicyLine {
  label: string;
  value: string;
  icon: LucideIcon;
}

const PASSWORD_POLICY: PasswordPolicyLine[] = [
  { label: 'Minimum length', value: '12 characters', icon: KeyRound },
  { label: 'Character classes', value: 'uppercase, lowercase, number, symbol', icon: ShieldCheck },
  { label: 'Password expiry', value: '90 days', icon: Fingerprint },
  { label: 'Password history', value: 'Prevent last 5 passwords', icon: Ban },
];

const POLICY_STRENGTH_SCORE = 86; // Strong

interface ActiveSession {
  user: string;
  device: string;
  ip: string;
  minsAgo: number;
}

const ACTIVE_SESSIONS: ActiveSession[] = [
  { user: 'alex@aquaflow.io', device: 'MacBook Pro · Chrome', ip: '73.14.22.9', minsAgo: 2 },
  { user: 'maria@bloom.beauty', device: 'iPhone 15 · Safari', ip: '98.34.201.17', minsAgo: 8 },
  { user: 'jordan@apexhvac.com', device: 'Windows · Edge', ip: '204.12.88.4', minsAgo: 14 },
  { user: 'sam@clearwell.co', device: 'Pixel 8 · Chrome', ip: '64.21.99.221', minsAgo: 27 },
  { user: 'priya@voltedge.io', device: 'iPad · Safari', ip: '185.234.12.7', minsAgo: 41 },
];

const TOTAL_ACTIVE_SESSIONS = 543;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoMinutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AuthenticationSection() {
  const [require2fa, setRequire2fa] = useState(true);
  const [options, setOptions] = useState<TwoFactorOption[]>(INITIAL_2FA_OPTIONS);
  const mounted = useIsClient();

  const toggleMaster = (next: boolean) => {
    setRequire2fa(next);
    toast.success(next ? '2FA required for all admins' : '2FA requirement disabled');
  };

  const toggleOption = (id: string, next: boolean) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, enabled: next } : o)));
    const opt = options.find((o) => o.id === id);
    toast.success(`${opt?.label ?? 'Method'} ${next ? 'enabled' : 'disabled'}`);
  };

  const handleConfigureSso = (name: string) => {
    toast.success(`Opening ${name} configuration wizard\u2026`);
  };

  const handleRevokeSession = (user: string) => {
    toast.success(`Session revoked for ${user}`);
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Authentication"
        description="Configure 2FA, SAML/OIDC SSO, password policies, and session management."
        icon={Lock}
        actions={<DemoDataPill />}
      />

      {/* ─── 2-col card grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A — Two-Factor Authentication */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                <CardDescription>Enforce a second factor for every admin login.</CardDescription>
              </div>
              <Switch checked={require2fa} onCheckedChange={toggleMaster} aria-label="Require 2FA" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Master policy: <span className="font-medium text-foreground">{require2fa ? 'Require 2FA for all admins' : '2FA optional'}</span>
            </div>
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <Switch
                        checked={opt.enabled}
                        onCheckedChange={(v) => toggleOption(opt.id, v)}
                        disabled={!require2fa}
                        aria-label={opt.label}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Card B — SSO Providers */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SSO Providers</CardTitle>
            <CardDescription>Single sign-on integrations for enterprise tenants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {SSO_PROVIDERS.map((p) => {
              const Icon = p.icon;
              const connected = p.status === 'connected';
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] capitalize', getStatusBadgeClasses(p.status))}
                      >
                        {connected ? 'Connected' : 'Not configured'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={connected ? 'outline' : 'default'}
                    onClick={() => handleConfigureSso(p.name)}
                  >
                    {connected ? 'Configure' : 'Set up'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Card C — Password Policy */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Password Policy</CardTitle>
            <CardDescription>Platform-wide rules for admin and user passwords.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <ul className="space-y-2">
              {PASSWORD_POLICY.map((line) => {
                const Icon = line.icon;
                return (
                  <li key={line.label} className="flex items-start gap-2.5">
                    <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="text-muted-foreground">{line.label}: </span>
                      <span className="font-medium text-foreground">{line.value}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="rounded-lg border border-border p-3 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Policy strength score</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
                  Strong
                </Badge>
              </div>
              <Progress value={POLICY_STRENGTH_SCORE} className="h-2" />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Score {POLICY_STRENGTH_SCORE}/100 — exceeds enterprise baseline.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card D — Active Sessions */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Active Sessions</CardTitle>
                <CardDescription>Currently signed-in admin sessions.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                {TOTAL_ACTIVE_SESSIONS} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Device</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ACTIVE_SESSIONS.map((s) => (
                    <TableRow key={s.user}>
                      <TableCell className="font-medium text-foreground truncate max-w-[140px]">
                        {s.user}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {s.device}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {s.ip}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {mounted ? timeAgo(isoMinutesAgo(s.minsAgo)) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => handleRevokeSession(s.user)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              {TOTAL_ACTIVE_SESSIONS} active sessions across all workspaces
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
