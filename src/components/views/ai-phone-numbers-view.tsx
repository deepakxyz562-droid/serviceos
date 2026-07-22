'use client';

import { useState, useEffect } from 'react';
import {
  Phone,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Bot,
  PhoneCall,
  AlertCircle,
  Link2,
  ShoppingCart,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  friendlyName: string | null;
  country: string;
  provider: string;
  status: string;
  vapiNumberId: string | null;
  assistantId: string | null;
  vapiAssistantId: string | null;
  agent?: { id: string; name: string; vapiAssistantId: string | null } | null;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  vapiAssistantId: string | null;
}

export function AiPhoneNumbersView() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acquireOpen, setAcquireOpen] = useState(false);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const [numRes, agentRes] = await Promise.all([
        fetch('/api/vapi/phone-numbers'),
        fetch('/api/vapi/agents'),
      ]);
      const numData = await numRes.json().catch(() => ({ numbers: [] }));
      const agentData = await agentRes.json().catch(() => ({ agents: [] }));
      setNumbers(numData.numbers || []);
      setAgents((agentData.agents || []).filter((a: Agent) => a.vapiAssistantId));
    } catch {
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (numberId: string, assistantId: string | null) => {
    try {
      const res = await fetch('/api/vapi/phone-numbers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: numberId, assistantId }),
      });
      if (!res.ok) throw new Error('Failed to assign');
      toast.success(assistantId ? 'Number assigned to agent' : 'Number unassigned');
      fetchData(true);
    } catch {
      toast.error('Failed to assign number');
    }
  };

  const handleDelete = async (number: PhoneNumber) => {
    if (!confirm(`Release ${number.phoneNumber}? This removes it from Vapi.`)) return;
    try {
      const res = await fetch(`/api/vapi/phone-numbers?id=${number.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to release');
      toast.success('Number released');
      fetchData(true);
    } catch {
      toast.error('Failed to release number');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={() => setActiveView('aiReceptionist')} className="hover:text-foreground transition-colors">
              AI Receptionist
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Phone Numbers</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Phone className="size-6 text-emerald-600" />
            Phone Numbers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buy numbers via Vapi or import existing ones, then route them to AI agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setAcquireOpen(true)}>
            <Plus className="size-3.5" />
            Get Number
          </Button>
        </div>
      </div>

      {/* ─── Numbers grid ───────────────────────────────────────────── */}
      {numbers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Phone className="size-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-medium">No phone numbers yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Buy a new number through Vapi (instant) or import an existing Twilio number.
              Then assign it to an AI agent to start receiving calls.
            </p>
            <Button size="sm" className="mt-5 bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setAcquireOpen(true)}>
              <Plus className="size-4" />
              Get a Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {numbers.map((number) => (
            <Card key={number.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                      <PhoneCall className="size-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-mono truncate">
                        {number.phoneNumber || '—'}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {number.friendlyName || `${number.country} number`}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(number)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Provider</span>
                  <Badge variant="outline" className="capitalize text-xs">{number.provider}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      number.agent
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {number.agent ? 'In use' : 'Available'}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Routed to Agent</Label>
                  <Select
                    value={number.assistantId || 'none'}
                    onValueChange={(v) => handleAssign(number.id, v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Unassigned —</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  Added {format(new Date(number.createdAt), 'MMM d, yyyy')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Acquire dialog ─────────────────────────────────────────── */}
      <AcquireDialog open={acquireOpen} onOpenChange={setAcquireOpen} onAcquired={() => {
        setAcquireOpen(false);
        fetchData(true);
      }} />
    </div>
  );
}

function AcquireDialog({
  open,
  onOpenChange,
  onAcquired,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAcquired: () => void;
}) {
  const [mode, setMode] = useState<'buy' | 'import'>('buy');
  const [areaCode, setAreaCode] = useState('');
  const [country, setCountry] = useState('US');
  const [importNumber, setImportNumber] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [acquiring, setAcquiring] = useState(false);

  const handleAcquire = async () => {
    try {
      setAcquiring(true);
      const body =
        mode === 'buy'
          ? { action: 'buy', areaCode: areaCode || undefined, country, friendlyName: friendlyName || undefined }
          : { action: 'import', number: importNumber, friendlyName: friendlyName || undefined };
      const res = await fetch('/api/vapi/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to acquire number');
      toast.success(mode === 'buy' ? 'Number purchased!' : 'Number imported!');
      setAreaCode('');
      setImportNumber('');
      setFriendlyName('');
      onAcquired();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAcquiring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-emerald-600" />
            Get a Phone Number
          </DialogTitle>
          <DialogDescription>Buy a new number via Vapi or import an existing one.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => setMode('buy')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'buy' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            <ShoppingCart className="size-3.5" />
            Buy New
          </button>
          <button
            onClick={() => setMode('import')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors',
              mode === 'import' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            <Download className="size-3.5" />
            Import
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'buy' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Area Code (optional)</Label>
                  <Input
                    id="area"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="415"
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  Vapi purchases numbers from Twilio. Cost: ~$1–2/month + usage.
                  You'll be billed directly by Vapi.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="import-num">Phone Number (E.164 format)</Label>
                <Input
                  id="import-num"
                  value={importNumber}
                  onChange={(e) => setImportNumber(e.target.value)}
                  placeholder="+14155551234"
                />
                <p className="text-xs text-muted-foreground">
                  Import an existing Twilio number into Vapi. Must be E.164 format.
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="friendly">Friendly Name (optional)</Label>
            <Input
              id="friendly"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="Main Line"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={acquiring}>
            Cancel
          </Button>
          <Button onClick={handleAcquire} disabled={acquiring || (mode === 'import' && !importNumber.trim())} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
            {acquiring ? <Loader2 className="size-4 animate-spin" /> : mode === 'buy' ? <ShoppingCart className="size-4" /> : <Download className="size-4" />}
            {mode === 'buy' ? 'Buy Number' : 'Import Number'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
