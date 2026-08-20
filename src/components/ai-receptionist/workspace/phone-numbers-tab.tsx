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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

interface PhoneNumbersTabProps {
  connections: PhoneConnectionData[];
  onChanged: () => Promise<void>;
}

export function PhoneNumbersTab({ connections, onChanged }: PhoneNumbersTabProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [routingId, setRoutingId] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [testCallOpen, setTestCallOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleRelease = async () => {
    if (!releaseId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/addons/phones/${releaseId}/release`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Release scheduled — ${data.graceDays}-day grace period active`);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Phone Numbers</h3>
          <p className="text-sm text-muted-foreground">
            Manage numbers, routing, and fallback behavior
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => { await onChanged(); toast.success('Refreshed'); }}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-muted">
              <Phone className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No phone numbers yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                You need a phone number for your AI Receptionist to receive calls.
                Use the onboarding wizard to search and purchase one.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map((conn) => (
            <PhoneNumberCard
              key={conn.id}
              connection={conn}
              onRename={() => setRenamingId(conn.phoneNumberId)}
              onConfigureRouting={() => setRoutingId(conn.id)}
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
        onClose={() => setRenamingId(null)}
        onSaved={async () => { await onChanged(); setRenamingId(null); }}
      />

      {/* Routing dialog */}
      <RoutingDialog
        connectionId={routingId}
        onClose={() => setRoutingId(null)}
        onSaved={async () => { await onChanged(); setRoutingId(null); }}
      />

      {/* Release confirmation */}
      <Dialog open={!!releaseId} onOpenChange={(o) => !o && setReleaseId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Release phone number?
            </DialogTitle>
            <DialogDescription>
              The number stays active during a <strong>30-day grace period</strong>.
              Calls will route to your fallback. You can restore anytime within 30 days.
              After that, the number is permanently released.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
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
              Release Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test call dialog */}
      <TestCallDialog open={testCallOpen} onOpenChange={setTestCallOpen} />
    </div>
  );
}

function PhoneNumberCard({
  connection,
  onRename,
  onConfigureRouting,
  onRelease,
  onTest,
}: {
  connection: PhoneConnectionData;
  onRename: () => void;
  onConfigureRouting: () => void;
  onRelease: () => void;
  onTest: () => void;
  onChanged: () => Promise<void>;
}) {
  const phone = connection.phoneNumber;
  const isReleasePending = phone.status === 'release_pending';
  const isActive = phone.status === 'active';

  const routingLabel: Record<string, string> = {
    AI_RECEPTIONIST: 'AI Receptionist',
    HUMAN_FORWARD: 'Human Forward',
    VOICEMAIL: 'Voicemail',
  };

  const fallbackLabel = connection.fallbackRoutingMode
    ? routingLabel[connection.fallbackRoutingMode] || connection.fallbackRoutingMode
    : 'Voicemail';

  return (
    <Card className={cn(isReleasePending && 'border-amber-200 dark:border-amber-900')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn(
              'flex items-center justify-center size-10 rounded-lg shrink-0',
              isActive
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30',
            )}>
              <Phone className={cn(
                'size-5',
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
              )} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{phone.number}</p>
                <PhoneStatusBadge status={phone.status} />
              </div>
              {phone.displayName && (
                <p className="text-xs text-muted-foreground mt-0.5">{phone.displayName}</p>
              )}
              {connection.externalPhoneNumber && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Forwards from {connection.externalPhoneNumber.e164}
                  {connection.externalPhoneNumber.label && ` (${connection.externalPhoneNumber.label})`}
                </p>
              )}

              {/* Routing info */}
              <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
                  <span className="text-muted-foreground">Routing:</span>
                  <span className="font-medium">{routingLabel[connection.routingMode] || connection.routingMode}</span>
                </div>
                {connection.routingMode === 'AI_RECEPTIONIST' && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ArrowRight className="size-3" />
                    <span>fallback: {fallbackLabel}</span>
                  </div>
                )}
              </div>

              {isReleasePending && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <Clock className="size-3.5" />
                  <span>Release scheduled — restore within 30 days to keep this number</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isActive && connection.routingMode === 'AI_RECEPTIONIST' && (
              <Button size="sm" variant="outline" onClick={onTest} className="gap-1.5">
                <PhoneCall className="size-3.5" />
                <span className="hidden sm:inline">Test</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRename}>
                  <Settings2 className="size-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onConfigureRouting}>
                  <ArrowRight className="size-4 mr-2" />
                  Change Routing
                </DropdownMenuItem>
                {isReleasePending ? (
                  <DropdownMenuItem onClick={onRelease} className="text-emerald-600">
                    <RotateCcw className="size-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onRelease} className="text-red-600">
                    <PhoneOff className="size-4 mr-2" />
                    Release
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PhoneStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    pending: {
      label: 'Pending',
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    release_pending: {
      label: 'Release Scheduled',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    released: {
      label: 'Released',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    suspended: {
      label: 'Suspended',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  };
  const c = config[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return <Badge variant="secondary" className={c.className}>{c.label}</Badge>;
}

// ─── Rename Dialog ──────────────────────────────────────────────────────────

function RenameDialog({
  phoneId,
  onClose,
  onSaved,
}: {
  phoneId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

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
        toast.success('Phone number renamed');
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
          <DialogTitle>Rename phone number</DialogTitle>
          <DialogDescription>
            Give this number a friendly label (e.g. &quot;Main line&quot;, &quot;After hours&quot;).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="phone-name">Display name</Label>
          <Input
            id="phone-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main line"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()} className="gap-2">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Routing Dialog ─────────────────────────────────────────────────────────

function RoutingDialog({
  connectionId,
  onClose,
  onSaved,
}: {
  connectionId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [routingMode, setRoutingMode] = useState('AI_RECEPTIONIST');
  const [routingTarget, setRoutingTarget] = useState('');
  const [fallbackMode, setFallbackMode] = useState('VOICEMAIL');
  const [fallbackTarget, setFallbackTarget] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/addons/phones/connections/${connectionId}`, {
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
        toast.success('Routing updated');
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
    <Dialog open={!!connectionId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure routing</DialogTitle>
          <DialogDescription>
            Decide where incoming calls go. AI Receptionist handles calls with
            AI; Human Forward sends them to your team; Voicemail records a message.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Primary routing</Label>
            <Select value={routingMode} onValueChange={setRoutingMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AI_RECEPTIONIST">AI Receptionist</SelectItem>
                <SelectItem value="HUMAN_FORWARD">Human Forward</SelectItem>
                <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
              </SelectContent>
            </Select>
            {routingMode === 'HUMAN_FORWARD' && (
              <div className="space-y-1.5">
                <Label htmlFor="human-target" className="text-xs">Forward to (E.164)</Label>
                <Input
                  id="human-target"
                  value={routingTarget}
                  onChange={(e) => setRoutingTarget(e.target.value)}
                  placeholder="+14155551234"
                />
              </div>
            )}
          </div>

          {routingMode === 'AI_RECEPTIONIST' && (
            <div className="space-y-2">
              <Label>Fallback when AI is unavailable</Label>
              <p className="text-xs text-muted-foreground">
                When your AI minutes run out or the subscription is suspended,
                calls go to this fallback.
              </p>
              <Select value={fallbackMode} onValueChange={setFallbackMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
                  <SelectItem value="HUMAN_FORWARD">Human Forward</SelectItem>
                </SelectContent>
              </Select>
              {fallbackMode === 'HUMAN_FORWARD' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fallback-target" className="text-xs">Fallback number (E.164)</Label>
                  <Input
                    id="fallback-target"
                    value={fallbackTarget}
                    onChange={(e) => setFallbackTarget(e.target.value)}
                    placeholder="+14155551234"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || (routingMode === 'HUMAN_FORWARD' && !routingTarget.trim())}
            className="gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Save Routing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
