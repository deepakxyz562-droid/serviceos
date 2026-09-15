'use client';

/**
 * PhoneNumbersTab
 * ===============
 *
 * Manage phone numbers: list, rename, change routing, configure fallback,
 * release, restore during grace period, test.
 *
 * NEVER exposes provider IDs (Twilio SID, Vapi number ID) to the tenant.
 * The tenant sees a friendly display name + the E.164 number + status only.
 */

import { useState } from 'react';
import {
  Phone,
  Plus,
  MoreVertical,
  Settings2,
  PhoneOff,
  RotateCcw,
  PhoneCall,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Bot,
  UserCheck,
  Voicemail,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { PhoneConnectionData } from './use-ai-receptionist-data';
import { TestCallDialog } from './test-call-dialog';
import { BuyNumberDialog } from './buy-number-dialog';
import { cn } from '@/lib/utils';

interface PhoneNumbersTabProps {
  connections: PhoneConnectionData[];
  onChanged: () => Promise<void>;
}

export function PhoneNumbersTab({ connections, onChanged }: PhoneNumbersTabProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [currentRenameName, setCurrentRenameName] = useState('');
  const [routingConnection, setRoutingConnection] = useState<PhoneConnectionData | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [testCallOpen, setTestCallOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRelease = async () => {
    if (!releaseId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/addons/phones/${releaseId}/release`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Release scheduled — ${data.graceDays || 30}-day grace period active`);
        setReleaseId(null);
        await onChanged();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to release number');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onChanged();
      toast.success('Phone lines refreshed');
    } catch {
      toast.error('Failed to refresh phone numbers');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Phone Lines & Routing</h3>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              {connections.length} {connections.length === 1 ? 'Line Active' : 'Lines Active'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your dedicated business lines, live AI answering, and failover routing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setBuyDialogOpen(true)}
            className="h-9 gap-1.5 shadow-sm font-medium"
          >
            <Plus className="size-4" />
            Get New Number
          </Button>
        </div>
      </div>

      {connections.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary mb-4 shadow-inner">
              <Phone className="size-7" />
            </div>
            <h4 className="text-base font-semibold text-foreground">No Phone Lines Connected</h4>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
              Your AI Receptionist needs a dedicated phone number to start greeting callers, taking service requests, and scheduling appointments 24/7.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => setBuyDialogOpen(true)}
                className="gap-2 shadow-sm"
              >
                <Plus className="size-4" />
                Select a Phone Number
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {connections.map((conn, idx) => (
            <PhoneNumberCard
              key={conn.id}
              connection={conn}
              isPrimary={idx === 0}
              onRename={() => {
                setRenamingId(conn.phoneNumberId);
                setCurrentRenameName(conn.phoneNumber.displayName || '');
              }}
              onConfigureRouting={() => setRoutingConnection(conn)}
              onRelease={() => setReleaseId(conn.phoneNumberId)}
              onTest={() => setTestCallOpen(true)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <RenameDialog
        phoneId={renamingId}
        initialName={currentRenameName}
        onClose={() => setRenamingId(null)}
        onSaved={async () => { await onChanged(); setRenamingId(null); }}
      />

      {/* Routing dialog */}
      <RoutingDialog
        connection={routingConnection}
        onClose={() => setRoutingConnection(null)}
        onSaved={async () => { await onChanged(); setRoutingConnection(null); }}
      />

      {/* Release confirmation */}
      <Dialog open={!!releaseId} onOpenChange={(o) => !o && setReleaseId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Release Phone Line?
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              This phone line will enter a <strong className="text-foreground">30-day grace period</strong>.
              During this window, inbound calls will safely forward to your fallback destination, and you can restore it anytime with one click.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-muted/60 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">What happens next:</p>
            <p>• Inbound calls will not be dropped; they route to your fallback line.</p>
            <p>• After 30 days, the number is permanently released to the carrier pool.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReleaseId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRelease}
              disabled={busy}
              className="gap-2"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <PhoneOff className="size-4" />}
              Schedule Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test call dialog */}
      <TestCallDialog open={testCallOpen} onOpenChange={setTestCallOpen} />

      {/* Buy number dialog */}
      <BuyNumberDialog
        open={buyDialogOpen}
        onOpenChange={setBuyDialogOpen}
        onSuccess={async () => { await onChanged(); }}
      />
    </div>
  );
}

function PhoneNumberCard({
  connection,
  isPrimary,
  onRename,
  onConfigureRouting,
  onRelease,
  onTest,
}: {
  connection: PhoneConnectionData;
  isPrimary: boolean;
  onRename: () => void;
  onConfigureRouting: () => void;
  onRelease: () => void;
  onTest: () => void;
  onChanged: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const phone = connection.phoneNumber;
  const isReleasePending = phone.status === 'release_pending';
  const isActive = phone.status === 'active';

  const copyNumber = () => {
    navigator.clipboard.writeText(phone.number);
    setCopied(true);
    toast.success('Phone number copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md border-border/80',
      isReleasePending && 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
    )}>
      {isReleasePending && (
        <div className="bg-amber-500/10 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-amber-600 animate-pulse" />
            <span><strong>Release Grace Period Active:</strong> Number will release in 30 days unless restored.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRelease}
            className="h-6 text-[11px] border-amber-300 dark:border-amber-700 bg-amber-100/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 px-2"
          >
            <RotateCcw className="size-3 mr-1" /> Restore Line
          </Button>
        </div>
      )}

      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Main Info */}
          <div className="flex items-start gap-3.5">
            <div className={cn(
              'flex items-center justify-center size-11 rounded-xl shrink-0 shadow-inner',
              isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
            )}>
              <Phone className="size-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold tracking-tight text-foreground">{phone.number}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyNumber}
                  className="size-7 text-muted-foreground hover:text-foreground"
                  title="Copy phone number"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </Button>
                {isPrimary && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium">
                    Primary Line
                  </Badge>
                )}
                <PhoneStatusBadge status={phone.status} />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{phone.displayName || 'Main Business Line'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-600" /> HD Voice & SMS Enabled
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            {isActive && connection.routingMode === 'AI_RECEPTIONIST' && (
              <Button
                size="sm"
                variant="outline"
                onClick={onTest}
                className="h-8 text-xs font-medium gap-1.5"
              >
                <PhoneCall className="size-3.5 text-primary" />
                Test Live Call
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={onConfigureRouting}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Settings2 className="size-3.5" />
              Configure Routing
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onRename} className="text-xs">
                  <Settings2 className="size-3.5 mr-2" />
                  Rename Line
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onConfigureRouting} className="text-xs">
                  <ArrowRight className="size-3.5 mr-2" />
                  Routing Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isReleasePending ? (
                  <DropdownMenuItem onClick={onRelease} className="text-xs text-emerald-600 focus:text-emerald-600">
                    <RotateCcw className="size-3.5 mr-2" />
                    Restore Number
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onRelease} className="text-xs text-destructive focus:text-destructive">
                    <PhoneOff className="size-3.5 mr-2" />
                    Release Line
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Visual Call Flow Diagram */}
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
            Active Call Route Pipeline
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Step 1: Caller */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/50">
              <div className="flex items-center justify-center size-7 rounded-md bg-background border shadow-xs text-muted-foreground shrink-0">
                <Phone className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Inbound Call</p>
                <p className="text-[10px] text-muted-foreground truncate">To {phone.number}</p>
              </div>
            </div>

            {/* Step 2: Primary Routing */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-center size-7 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                {connection.routingMode === 'AI_RECEPTIONIST' ? (
                  <Bot className="size-3.5" />
                ) : connection.routingMode === 'HUMAN_FORWARD' ? (
                  <UserCheck className="size-3.5" />
                ) : (
                  <Voicemail className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 truncate">
                    {connection.routingMode === 'AI_RECEPTIONIST' && 'AI Receptionist'}
                    {connection.routingMode === 'HUMAN_FORWARD' && 'Forward Call'}
                    {connection.routingMode === 'VOICEMAIL' && 'Direct Voicemail'}
                  </p>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 truncate">
                  {connection.routingMode === 'AI_RECEPTIONIST' && 'Instant 24/7 Voice AI'}
                  {connection.routingMode === 'HUMAN_FORWARD' && (connection.routingTarget || 'Team phone')}
                  {connection.routingMode === 'VOICEMAIL' && 'Record audio message'}
                </p>
              </div>
            </div>

            {/* Step 3: Fallback Routing */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/50">
              <div className="flex items-center justify-center size-7 rounded-md bg-background border shadow-xs text-muted-foreground shrink-0">
                {connection.fallbackRoutingMode === 'HUMAN_FORWARD' ? (
                  <UserCheck className="size-3.5" />
                ) : (
                  <Voicemail className="size-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  Fallback: {connection.fallbackRoutingMode === 'HUMAN_FORWARD' ? 'Team Phone' : 'Voicemail'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {connection.fallbackRoutingMode === 'HUMAN_FORWARD'
                    ? connection.fallbackRoutingTarget || 'Configured number'
                    : 'If AI minutes exhausted'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PhoneStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: 'Live & Active',
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    },
    pending: {
      label: 'Configuring',
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300',
    },
    release_pending: {
      label: 'Grace Period',
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    },
    released: {
      label: 'Released',
      className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    },
    suspended: {
      label: 'Suspended',
      className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    },
  };
  const c = config[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return <Badge variant="outline" className={cn('text-[11px] font-medium', c.className)}>{c.label}</Badge>;
}

// ─── Rename Dialog ──────────────────────────────────────────────────────────

function RenameDialog({
  phoneId,
  initialName,
  onClose,
  onSaved,
}: {
  phoneId: string | null;
  initialName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);

  // Sync initial name when opened
  useState(() => {
    setName(initialName);
  });

  const handleSave = async () => {
    if (!phoneId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/addons/phones/${phoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });
      if (res.ok) {
        toast.success('Phone line label updated');
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to rename');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!phoneId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Phone Line</DialogTitle>
          <DialogDescription>
            Give this line an identifiable business label (e.g. &quot;Main Shop Line&quot;, &quot;24/7 Emergency Line&quot;).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="phone-name">Line Label</Label>
          <Input
            id="phone-name"
            defaultValue={initialName}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main Shop Line"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Save Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Routing Dialog ─────────────────────────────────────────────────────────

function RoutingDialog({
  connection,
  onClose,
  onSaved,
}: {
  connection: PhoneConnectionData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [routingMode, setRoutingMode] = useState(connection?.routingMode || 'AI_RECEPTIONIST');
  const [routingTarget, setRoutingTarget] = useState(connection?.routingTarget || '');
  const [fallbackMode, setFallbackMode] = useState(connection?.fallbackRoutingMode || 'VOICEMAIL');
  const [fallbackTarget, setFallbackTarget] = useState(connection?.fallbackRoutingTarget || '');
  const [loading, setLoading] = useState(false);

  // Sync state when connection prop updates
  useState(() => {
    if (connection) {
      setRoutingMode(connection.routingMode || 'AI_RECEPTIONIST');
      setRoutingTarget(connection.routingTarget || '');
      setFallbackMode(connection.fallbackRoutingMode || 'VOICEMAIL');
      setFallbackTarget(connection.fallbackRoutingTarget || '');
    }
  });

  const handleSave = async () => {
    if (!connection) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/addons/phones/connections/${connection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routingMode,
          routingTarget: routingMode === 'HUMAN_FORWARD' ? routingTarget : undefined,
          fallbackRoutingMode: fallbackMode,
          fallbackRoutingTarget: fallbackMode === 'HUMAN_FORWARD' ? fallbackTarget : undefined,
        }),
      });
      if (res.ok) {
        toast.success('Call routing settings updated');
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update routing');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!connection} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            Configure Call Routing
          </DialogTitle>
          <DialogDescription>
            Choose how incoming calls to <strong className="text-foreground">{connection?.phoneNumber.number}</strong> are answered and handled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Primary Route Selector */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primary Answering Mode
            </Label>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: AI Receptionist */}
              <div
                onClick={() => setRoutingMode('AI_RECEPTIONIST')}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                  routingMode === 'AI_RECEPTIONIST'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5',
                  routingMode === 'AI_RECEPTIONIST' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  <Bot className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">AI Receptionist (Recommended)</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      24/7 Smart Voice
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Answers immediately with your AI assistant, qualifies leads, schedules appointments, and answers FAQs.
                  </p>
                </div>
              </div>

              {/* Option 2: Human Forward */}
              <div
                onClick={() => setRoutingMode('HUMAN_FORWARD')}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                  routingMode === 'HUMAN_FORWARD'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5',
                  routingMode === 'HUMAN_FORWARD' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  <UserCheck className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Forward Directly to Staff Phone</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Transfers incoming calls directly to an external business or staff phone number.
                  </p>
                  {routingMode === 'HUMAN_FORWARD' && (
                    <div className="mt-3 space-y-1">
                      <Label htmlFor="routing-target" className="text-xs font-medium">Forward Phone Number</Label>
                      <Input
                        id="routing-target"
                        value={routingTarget}
                        onChange={(e) => setRoutingTarget(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Option 3: Direct Voicemail */}
              <div
                onClick={() => setRoutingMode('VOICEMAIL')}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                  routingMode === 'VOICEMAIL'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5',
                  routingMode === 'VOICEMAIL' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  <Voicemail className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Direct Voicemail</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Plays a voicemail greeting and records the caller message directly into your CRM.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fallback Section (only if AI Receptionist is primary) */}
          {routingMode === 'AI_RECEPTIONIST' && (
            <div className="space-y-2.5 pt-2 border-t">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fallback Destination
                </Label>
                <p className="text-xs text-muted-foreground">
                  Where to route calls if AI minutes run out or line concurrency is exceeded.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div
                  onClick={() => setFallbackMode('VOICEMAIL')}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer text-xs space-y-1 transition-all',
                    fallbackMode === 'VOICEMAIL'
                      ? 'border-primary bg-primary/5 font-semibold text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Voicemail className="size-3.5" />
                    <span>CRM Voicemail</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-normal">Records audio note</p>
                </div>

                <div
                  onClick={() => setFallbackMode('HUMAN_FORWARD')}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer text-xs space-y-1 transition-all',
                    fallbackMode === 'HUMAN_FORWARD'
                      ? 'border-primary bg-primary/5 font-semibold text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="size-3.5" />
                    <span>Staff Phone</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-normal">Forwards to mobile</p>
                </div>
              </div>

              {fallbackMode === 'HUMAN_FORWARD' && (
                <div className="space-y-1 mt-2">
                  <Label htmlFor="fallback-target" className="text-xs">Fallback Phone Number</Label>
                  <Input
                    id="fallback-target"
                    value={fallbackTarget}
                    onChange={(e) => setFallbackTarget(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || (routingMode === 'HUMAN_FORWARD' && !routingTarget.trim())}
            className="gap-2 font-medium"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Apply Routing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
