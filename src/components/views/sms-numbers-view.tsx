'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Plus,
  Trash2,
  Pencil,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneForwarded,
  Loader2,
  RefreshCw,
  Smartphone,
  AlertCircle,
  Voicemail,
  Sparkles,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';
import { useFeatureAccess } from '@/hooks/use-tenant-plan';
import { useAppStore } from '@/store/app-store';

// ─── Tiny typed fetch wrapper ───────────────────────────────────────────────
//
// The shared `apiPost`/`apiPatch`/`apiDelete` helpers in `@/lib/api` automatically
// append `XTransformPort` and the Bearer token but do NOT throw on non-2xx
// responses — they just return whatever JSON body the server sent. For a billing
// surface like this one (buy / release / edit), we want failed HTTP responses
// to surface as errors so TanStack Query's `onError` fires and the user gets a
// toast with the server's error message. This wrapper does that check.

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(url, options);
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep parsed null
    }
  }
  if (!res.ok) {
    const errMsg =
      (parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : null) || `Request failed (HTTP ${res.status})`;
    throw new Error(errMsg);
  }
  return (parsed ?? ({} as T)) as T;
}

// ─── Types ──────────────────────────────────────────────────────────────────

// Voice mode — mirrors `VoiceMode` in src/lib/sms-phone-numbers.ts
type VoiceMode = 'forward' | 'voicemail' | 'ai_vapi';

interface SmsNumberUsage {
  sentThisMonth: number;
  receivedThisMonth: number;
}

interface SmsNumber {
  id: string;
  number: string;
  displayName: string | null;
  provider: string;
  providerSid: string | null;
  capabilities: string;
  countryCode: string | null;
  areaCode?: string | null;
  locality?: string | null;
  monthlyCost: number;
  costCurrency: string;
  status: 'pending' | 'active' | 'suspended' | 'released' | 'failed';
  paymentProvider: 'paypal' | 'creem' | null;
  subscriptionId: string | null;
  forwardToPhone: string | null;
  forwardToVoicemail: boolean;
  // Voice mode fields (Phase 2.4 — unified phone architecture)
  voiceMode?: VoiceMode;
  vapiAssistantId?: string | null;
  vapiNumberId?: string | null;
  smsWebhookUrl: string | null;
  voiceWebhookUrl: string | null;
  purchasedAt: string | null;
  releasedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  usage: SmsNumberUsage;
}

interface VapiAgent {
  id: string;
  name: string;
  vapiAssistantId: string | null;
  active?: boolean;
}

interface VapiAgentsResponse {
  agents: VapiAgent[];
  vapiConfigured?: boolean;
}

interface AvailableNumber {
  phoneNumber: string;
  locality: string;
  capabilities: string[];
  monthlyCost: number;
}

interface BuyCheckoutResponse {
  checkoutUrl: string;
  phoneNumberId: string;
  paymentProvider?: string;
  subscriptionId?: string;
  sessionId?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const COUNTRY_OPTIONS = [
  { code: 'US', label: 'United States 🇺🇸', dialCode: '+1' },
  { code: 'GB', label: 'United Kingdom 🇬🇧', dialCode: '+44' },
  { code: 'CA', label: 'Canada 🇨🇦', dialCode: '+1' },
  { code: 'AU', label: 'Australia 🇦🇺', dialCode: '+61' },
] as const;

function statusBadge(status: SmsNumber['status']) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
          <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Active
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          <Clock className="size-3 mr-1" />
          Pending
        </Badge>
      );
    case 'suspended':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          <AlertCircle className="size-3 mr-1" />
          Suspended
        </Badge>
      );
    case 'released':
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">
          Released
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
          <XCircle className="size-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatMonthlyCost(amount: number, _currency: string): string {
  // The backend stores cost in USD ($5.00) but the user-facing requirement is
  // to display with the £ symbol. We use the company currency hook indirectly
  // via the existing formatCurrency util — but to keep this view self-contained
  // and avoid an extra fetch, we render with £ directly (matching the spec:
  // "format as £5.00").
  return `£${amount.toFixed(2)}`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Voice mode badge ──────────────────────────────────────────────────────
//
// Renders the current voice mode for a number as a small badge. Used in the
// table's "Voice Mode" column.
function voiceModeBadge(n: SmsNumber, agentName?: string | null) {
  const mode: VoiceMode = n.voiceMode ?? 'forward';
  switch (mode) {
    case 'forward':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
          <PhoneForwarded className="size-3 mr-1" />
          Forward
        </Badge>
      );
    case 'voicemail':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
          <Voicemail className="size-3 mr-1" />
          Voicemail
        </Badge>
      );
    case 'ai_vapi':
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
          <Sparkles className="size-3 mr-1" />
          AI: {agentName || 'Assistant'}
        </Badge>
      );
    default:
      return <Badge variant="outline">{mode}</Badge>;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SmsNumbersView() {
  const queryClient = useQueryClient();
  const setActiveView = useAppStore((s) => s.setActiveView);

  // Plan-gating: AI Receptionist is required to use the AI Voice mode option
  const aiReceptionist = useFeatureAccess('ai_receptionist');

  // Buy dialog state
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyStep, setBuyStep] = useState<'config' | 'results' | 'payment'>('config');
  const [countryCode, setCountryCode] = useState<string>('US');
  const [areaCode, setAreaCode] = useState<string>('');
  const [searchResults, setSearchResults] = useState<AvailableNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'creem'>('paypal');

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editNumber, setEditNumber] = useState<SmsNumber | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editForwardEnabled, setEditForwardEnabled] = useState(false);
  const [editForwardPhone, setEditForwardPhone] = useState('');
  const [editVoicemail, setEditVoicemail] = useState(false);
  // Voice mode state (Phase 2.4)
  const [editVoiceMode, setEditVoiceMode] = useState<VoiceMode>('forward');
  const [editVapiAssistantId, setEditVapiAssistantId] = useState<string>('');

  // Release dialog state
  const [releaseTarget, setReleaseTarget] = useState<SmsNumber | null>(null);

  // Info banner dismissible state (one-time onboarding reminder).
  // Stored in localStorage so the banner stays dismissed across sessions.
  // Lazy init via `typeof window` guard avoids a setState-in-effect AND keeps
  // SSR output deterministic (banner hidden server-side; revealed client-side
  // only if the user hasn't dismissed it).
  const INFO_BANNER_KEY = 'serviceos:phone-numbers-info-dismissed';
  const [infoDismissed, setInfoDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true; // SSR: hidden by default
    try {
      return localStorage.getItem(INFO_BANNER_KEY) === '1';
    } catch {
      return false;
    }
  });
  const dismissInfoBanner = () => {
    setInfoDismissed(true);
    try {
      localStorage.setItem(INFO_BANNER_KEY, '1');
    } catch {
      // localStorage may be unavailable (private mode) — silently ignore.
    }
  };

  // ─── Queries ──────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ numbers: SmsNumber[] }>({
    queryKey: ['sms-numbers'],
    queryFn: () => apiCall<{ numbers: SmsNumber[] }>('/api/sms/numbers'),
    refetchInterval: 60_000,
  });

  const numbers = data?.numbers ?? [];

  // Fetch Vapi assistants ONLY when the edit dialog is open AND the user is on
  // (or could be on) the AI mode. This avoids an unnecessary fetch on every
  // page load for tenants who never use AI Voice.
  const { data: agentsData } = useQuery<VapiAgentsResponse>({
    queryKey: ['vapi-agents', 'phone-numbers-edit'],
    queryFn: () => apiCall<VapiAgentsResponse>('/api/vapi/agents'),
    enabled: editOpen,
    staleTime: 30_000,
  });

  const agents: VapiAgent[] = (agentsData?.agents || []).filter(
    (a) => !!a.vapiAssistantId,
  );
  const vapiConfigured = !!agentsData?.vapiConfigured || agents.length > 0;

  // ─── Mutations ────────────────────────────────────────────────────────

  const searchMutation = useMutation({
    mutationFn: async (vars: { countryCode: string; areaCode?: string }) =>
      apiCall<{ numbers: AvailableNumber[]; configured?: boolean }>(
        '/api/sms/numbers/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vars),
        },
      ),
    onSuccess: (data) => {
      setSearchResults(data.numbers || []);
      setBuyStep('results');
      if (!data.numbers || data.numbers.length === 0) {
        toast.info('No numbers found', {
          description: 'Try a different area code or country.',
        });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Search failed';
      toast.error('Search failed', { description: msg });
    },
  });

  const buyMutation = useMutation({
    mutationFn: async (vars: {
      phoneNumber: string;
      countryCode: string;
      paymentMethod: 'paypal' | 'creem';
    }) =>
      apiCall<BuyCheckoutResponse>('/api/sms/numbers/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => {
      toast.success('Redirecting to checkout…', {
        description: 'Complete payment to activate your number.',
      });
      // Brief delay so the toast is visible before navigation
      setTimeout(() => {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          toast.error('No checkout URL returned');
          setBuyOpen(false);
        }
      }, 700);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Buy failed';
      toast.error('Failed to start purchase', { description: msg });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      displayName?: string | null;
      forwardToPhone?: string | null;
      forwardToVoicemail?: boolean;
      voiceMode: VoiceMode;
      vapiAssistantId: string | null;
    }) =>
      apiCall<{ success: boolean; number?: SmsNumber }>(
        `/api/sms/numbers/${vars.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: vars.displayName,
            forwardToPhone: vars.forwardToPhone,
            forwardToVoicemail: vars.forwardToVoicemail,
            voiceMode: vars.voiceMode,
            vapiAssistantId: vars.voiceMode === 'ai_vapi' ? vars.vapiAssistantId : null,
          }),
        },
      ),
    onSuccess: () => {
      toast.success('Number updated');
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sms-numbers'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error('Failed to update number', { description: msg });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) =>
      apiCall<{ success: boolean }>(`/api/sms/numbers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Number released', {
        description: 'The Twilio number was returned and the subscription cancelled.',
      });
      setReleaseTarget(null);
      queryClient.invalidateQueries({ queryKey: ['sms-numbers'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Release failed';
      toast.error('Failed to release number', { description: msg });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────

  const openBuyDialog = () => {
    setBuyStep('config');
    setSearchResults([]);
    setSelectedNumber(null);
    setAreaCode('');
    setCountryCode('US');
    setPaymentMethod('paypal');
    setBuyOpen(true);
  };

  const handleSearch = () => {
    searchMutation.mutate({
      countryCode,
      areaCode: areaCode.trim() || undefined,
    });
  };

  const handlePickNumber = (n: AvailableNumber) => {
    setSelectedNumber(n);
    setBuyStep('payment');
  };

  const handleBuy = () => {
    if (!selectedNumber) return;
    buyMutation.mutate({
      phoneNumber: selectedNumber.phoneNumber,
      countryCode,
      paymentMethod,
    });
  };

  const openEditDialog = (n: SmsNumber) => {
    setEditNumber(n);
    setEditDisplayName(n.displayName || '');
    setEditForwardEnabled(!!n.forwardToPhone);
    setEditForwardPhone(n.forwardToPhone || '');
    setEditVoicemail(!!n.forwardToVoicemail);
    // Initialise voice-mode state from the row's current mode.
    setEditVoiceMode(n.voiceMode ?? 'forward');
    setEditVapiAssistantId(n.vapiAssistantId ?? '');
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editNumber) return;
    // Validate AI mode requires an assistant + plan + Vapi key
    if (editVoiceMode === 'ai_vapi') {
      if (!aiReceptionist.enabled) {
        toast.error('AI Receptionist is locked', {
          description: 'Upgrade to Growth or higher to enable AI Voice mode.',
        });
        return;
      }
      if (!vapiConfigured) {
        toast.error('Vapi API key not configured', {
          description: 'Add your Vapi API key in Settings → AI Voice first.',
        });
        return;
      }
      if (!editVapiAssistantId) {
        toast.error('Select an AI assistant', {
          description: 'Pick a Vapi assistant to route calls to.',
        });
        return;
      }
    }
    editMutation.mutate({
      id: editNumber.id,
      displayName: editDisplayName.trim() || null,
      forwardToPhone: editForwardEnabled ? (editForwardPhone.trim() || null) : null,
      forwardToVoicemail: editVoicemail,
      voiceMode: editVoiceMode,
      vapiAssistantId: editVoiceMode === 'ai_vapi' ? editVapiAssistantId : null,
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
            <Phone className="size-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Phone Numbers</h1>
            <p className="text-xs text-muted-foreground">
              Buy dedicated phone numbers for SMS texting, call forwarding, voicemail, and AI-answered voice calls.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9"
          >
            <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
            <span className="hidden sm:inline ml-1.5">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={openBuyDialog}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-4" />
            <span className="ml-1.5">Buy Number</span>
          </Button>
        </div>
      </div>

      {/* ─── Body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {/* ─── Dismissible info banner ────────────────────────────────── */}
        {!infoDismissed && (
          <Alert className="border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800 pr-10">
            <Info className="size-4 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-0.5">
              <AlertTitle className="text-emerald-800 dark:text-emerald-300">
                One number, every channel
              </AlertTitle>
              <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/90">
                Each phone number supports SMS texting, call forwarding, voicemail, and AI-answered voice (via Vapi). Pick a voice mode per number in its edit dialog.
              </AlertDescription>
            </div>
            <button
              type="button"
              onClick={dismissInfoBanner}
              aria-label="Dismiss info banner"
              className="absolute top-2 right-2 p-1 rounded-md text-emerald-700/70 hover:text-emerald-800 hover:bg-emerald-100/70 dark:text-emerald-400/70 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </Alert>
        )}
        {isLoading ? (
          <NumbersTableSkeleton />
        ) : isError ? (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-2">
                <AlertCircle className="size-10 text-red-400" />
                <p className="text-sm font-medium text-red-700">Failed to load phone numbers</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                  <RefreshCw className="size-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : numbers.length === 0 ? (
          // ─── Empty State ────────────────────────────────────────────
          <Card className="border-dashed border-2 bg-gradient-to-br from-emerald-50/40 to-background">
            <CardContent className="pt-10 pb-10 px-6">
              <div className="flex flex-col items-center text-center gap-4 max-w-md mx-auto">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40">
                  <Smartphone className="size-8 text-emerald-600" />
                </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold">Get your phone number</h3>
                    <p className="text-sm text-muted-foreground">
                      Buy your first phone number to send SMS, forward calls, and answer inbound calls with AI.
                      £5.00/month — cancel anytime.
                    </p>
                  </div>
                <Button
                  onClick={openBuyDialog}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="size-4 mr-1.5" />
                  Buy your first number
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // ─── Numbers Table ──────────────────────────────────────────
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Active Numbers</CardTitle>
                  <CardDescription className="text-xs">
                    {numbers.length} number{numbers.length === 1 ? '' : 's'} •{' '}
                    {numbers.filter((n) => n.status === 'active').length} active
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Number</TableHead>
                      <TableHead className="min-w-[140px]">Display Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Capabilities</TableHead>
                      <TableHead>Monthly Cost</TableHead>
                      <TableHead>Usage (mo)</TableHead>
                      <TableHead>Forwarding</TableHead>
                      <TableHead>Voice Mode</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {numbers.map((n) => (
                      <TableRow key={n.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 shrink-0">
                              <Phone className="size-3.5 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-medium truncate">{n.number}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {n.countryCode || '—'} • {n.provider}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {n.displayName ? (
                            <span className="text-sm font-medium">{n.displayName}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Untitled</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(n.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(n.capabilities || '').split(',').filter(Boolean).map((cap) => (
                              <Badge key={cap} variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatMonthlyCost(n.monthlyCost, n.costCurrency)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">/ month</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              {n.usage?.sentThisMonth ?? 0} sent
                            </span>
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-blue-700 dark:text-blue-400 font-medium">
                              {n.usage?.receivedThisMonth ?? 0} received
                            </span>
                          </div>
                          {n.lastUsedAt && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Last used {formatRelativeTime(n.lastUsedAt)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {n.forwardToPhone ? (
                            <div className="flex items-center gap-1.5">
                              <PhoneForwarded className="size-3.5 text-emerald-600" />
                              <span className="text-xs font-mono">{n.forwardToPhone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Direct</span>
                          )}
                          {n.forwardToVoicemail && (
                            <p className="text-[10px] text-amber-600 mt-0.5">Voicemail on</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {voiceModeBadge(
                            n,
                            // Resolve the assistant name from the agents list if available
                            agents.find((a) => a.vapiAssistantId === n.vapiAssistantId)?.name ||
                              null,
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(n)}
                              aria-label="Edit number"
                              title="Edit number"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setReleaseTarget(n)}
                              aria-label="Release number"
                              title="Release number"
                              disabled={n.status === 'released'}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Buy Number Dialog (multi-step wizard) ─────────────────────── */}
      <Dialog
        open={buyOpen}
        onOpenChange={(open) => {
          setBuyOpen(open);
          if (!open) {
            // Reset state after close animation
            setTimeout(() => {
              setBuyStep('config');
              setSearchResults([]);
              setSelectedNumber(null);
            }, 200);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="size-4 text-emerald-600" />
              {buyStep === 'config' && 'Buy a phone number'}
              {buyStep === 'results' && 'Available numbers'}
              {buyStep === 'payment' && 'Choose payment method'}
            </DialogTitle>
            <DialogDescription>
              {buyStep === 'config' && 'Select a country and optional area code to search Twilio inventory.'}
              {buyStep === 'results' && 'Pick a number to purchase. £5.00/month, cancel anytime.'}
              {buyStep === 'payment' && 'You will be redirected to complete payment securely.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Country + Area Code */}
          {buyStep === 'config' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label} ({c.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaCode">
                  Area code <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="areaCode"
                  placeholder="e.g. 415"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  inputMode="numeric"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to search nationwide. Area codes only apply to US and CA.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Search results */}
          {buyStep === 'results' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {searchMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-sm">Searching Twilio inventory…</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Search className="size-8 opacity-30" />
                  <p className="text-sm">No numbers found.</p>
                  <p className="text-xs">Try a different area code or country.</p>
                </div>
              ) : (
                searchResults.map((n, idx) => (
                  <button
                    key={n.phoneNumber + idx}
                    type="button"
                    onClick={() => handlePickNumber(n)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium truncate">{n.phoneNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.locality || 'No locality info'} •{' '}
                        {(n.capabilities || []).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">£5.00</span>
                      <span className="text-[10px] text-muted-foreground">/mo</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 3: Payment method */}
          {buyStep === 'payment' && selectedNumber && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <Phone className="size-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{selectedNumber.phoneNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedNumber.locality} • £5.00/month
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'paypal' | 'creem')}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label
                    htmlFor="paypal"
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                      paymentMethod === 'paypal'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30'
                        : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <RadioGroupItem value="paypal" id="paypal" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">PayPal</p>
                      <p className="text-[11px] text-muted-foreground">Recurring subscription</p>
                    </div>
                  </Label>
                  <Label
                    htmlFor="creem"
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                      paymentMethod === 'creem'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30'
                        : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <RadioGroupItem value="creem" id="creem" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Creem</p>
                      <p className="text-[11px] text-muted-foreground">Card / Apple Pay</p>
                    </div>
                  </Label>
                </RadioGroup>
                <p className="text-[11px] text-muted-foreground">
                  The number is activated after payment completes. You will be redirected to a
                  secure checkout page.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {buyStep === 'config' && (
              <>
                <Button variant="outline" onClick={() => setBuyOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSearch}
                  disabled={searchMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Search className="size-4 mr-1.5" />
                  )}
                  Search
                </Button>
              </>
            )}
            {buyStep === 'results' && (
              <>
                <Button variant="outline" onClick={() => setBuyStep('config')}>Back</Button>
                <Button
                  onClick={handleSearch}
                  disabled={searchMutation.isPending}
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <RefreshCw className={cn('size-4 mr-1.5', searchMutation.isPending && 'animate-spin')} />
                  Refresh
                </Button>
              </>
            )}
            {buyStep === 'payment' && (
              <>
                <Button variant="outline" onClick={() => setBuyStep('results')}>Back</Button>
                <Button
                  onClick={handleBuy}
                  disabled={buyMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {buyMutation.isPending ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4 mr-1.5" />
                  )}
                  Buy & checkout
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Number Dialog ────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-emerald-600" />
              Edit phone number
            </DialogTitle>
            <DialogDescription>
              {editNumber && (
                <span className="font-mono text-xs">{editNumber.number}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {editNumber && (
            <div className="space-y-4">
              {/* Display name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Sales line, Support, Main office"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                />
              </div>

              <div className="h-px bg-border" />

              {/* ─── Voice Mode (unified: Forward / Voicemail / AI Assistant) ── */}
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Voice mode</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Decide how inbound voice calls to this number are answered.
                  </p>
                </div>
                <RadioGroup
                  value={editVoiceMode}
                  onValueChange={(v) => setEditVoiceMode(v as VoiceMode)}
                  className="space-y-2"
                >
                  {/* Forward to phone */}
                  <Label
                    htmlFor="vm-forward"
                    className={cn(
                      'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                      editVoiceMode === 'forward'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30 dark:bg-emerald-950/20'
                        : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <RadioGroupItem value="forward" id="vm-forward" className="mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <PhoneForwarded className="size-3.5 text-emerald-600" />
                        Forward to phone
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Ring your office phone; optionally fall through to voicemail.
                      </p>
                    </div>
                  </Label>

                  {/* Voicemail only */}
                  <Label
                    htmlFor="vm-voicemail"
                    className={cn(
                      'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                      editVoiceMode === 'voicemail'
                        ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/30 dark:bg-amber-950/20'
                        : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <RadioGroupItem value="voicemail" id="vm-voicemail" className="mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Voicemail className="size-3.5 text-amber-600" />
                        Voicemail
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Play a greeting and record a message — no live answer.
                      </p>
                    </div>
                  </Label>

                  {/* AI Assistant */}
                  <Label
                    htmlFor="vm-ai"
                    className={cn(
                      'flex items-start gap-2.5 p-3 rounded-lg border transition-colors',
                      !aiReceptionist.enabled && !aiReceptionist.loading
                        ? 'border-slate-200 bg-slate-50/40 dark:bg-slate-900/20 cursor-not-allowed opacity-70'
                        : editVoiceMode === 'ai_vapi'
                          ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500/30 dark:bg-purple-950/20 cursor-pointer'
                          : 'border-border hover:bg-muted/40 cursor-pointer',
                    )}
                  >
                    <RadioGroupItem
                      value="ai_vapi"
                      id="vm-ai"
                      className="mt-0.5"
                      disabled={!aiReceptionist.enabled && !aiReceptionist.loading}
                    />
                    <div className="space-y-0.5 flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-purple-600" />
                        AI Assistant
                        {!aiReceptionist.enabled && !aiReceptionist.loading && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 ml-1 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                          >
                            Upgrade
                          </Badge>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Route calls to a Vapi AI assistant that answers, books, and captures leads 24/7.
                      </p>
                    </div>
                  </Label>
                </RadioGroup>

                {/* ─── Mode-specific configuration ────────────────────────── */}

                {editVoiceMode === 'forward' && (
                  <div className="space-y-3 pl-1 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="forward-toggle" className="text-sm font-medium cursor-pointer">
                          <span className="flex items-center gap-1.5">
                            <PhoneForwarded className="size-3.5 text-emerald-600" />
                            Forward calls
                          </span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Forward incoming voice calls to your office phone.
                        </p>
                      </div>
                      <Switch
                        id="forward-toggle"
                        checked={editForwardEnabled}
                        onCheckedChange={setEditForwardEnabled}
                      />
                    </div>
                    {editForwardEnabled && (
                      <div className="space-y-2 pl-1">
                        <Label htmlFor="forwardPhone" className="text-xs text-muted-foreground">
                          Forward to phone number
                        </Label>
                        <Input
                          id="forwardPhone"
                          placeholder="e.g. +14155551234"
                          value={editForwardPhone}
                          onChange={(e) => setEditForwardPhone(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Use E.164 format (country code + number, no spaces).
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="space-y-0.5">
                        <Label htmlFor="voicemail-toggle" className="text-sm font-medium cursor-pointer">
                          Send to voicemail when unanswered
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          When call forwarding is off (or the forward target is busy), let callers
                          leave a voicemail.
                        </p>
                      </div>
                      <Switch
                        id="voicemail-toggle"
                        checked={editVoicemail}
                        onCheckedChange={setEditVoicemail}
                      />
                    </div>
                  </div>
                )}

                {editVoiceMode === 'voicemail' && (
                  <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-200 dark:bg-amber-950/10 dark:border-amber-800">
                    <p className="text-xs text-amber-800 dark:text-amber-400 flex items-start gap-1.5">
                      <Voicemail className="size-3.5 shrink-0 mt-0.5" />
                      <span>
                        Callers will hear a default greeting and be prompted to leave a message.
                        Recordings appear in your call history. (Custom greetings coming soon.)
                      </span>
                    </p>
                  </div>
                )}

                {editVoiceMode === 'ai_vapi' && (
                  <div className="space-y-3 pl-1 pt-1">
                    {/* Plan-gate warning */}
                    {!aiReceptionist.enabled && !aiReceptionist.loading && (
                      <Alert className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800">
                        <AlertCircle className="size-4 text-amber-600" />
                        <AlertDescription className="text-xs text-amber-800 dark:text-amber-400">
                          AI Voice mode requires the <strong>Growth</strong> plan or higher.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setEditOpen(false);
                              setActiveView('billing');
                            }}
                            className="underline font-medium hover:text-amber-900 dark:hover:text-amber-300 inline-flex items-center gap-0.5"
                          >
                            Upgrade <ArrowRight className="size-3" />
                          </button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Vapi API key not configured */}
                    {aiReceptionist.enabled && !vapiConfigured && (
                      <Alert className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800">
                        <AlertCircle className="size-4 text-amber-600" />
                        <AlertDescription className="text-xs text-amber-800 dark:text-amber-400">
                          Add your Vapi API key in{' '}
                          <strong>Settings → AI Voice</strong> to use AI Assistant mode.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Assistant picker */}
                    {aiReceptionist.enabled && vapiConfigured && (
                      <div className="space-y-2">
                        <Label htmlFor="vapiAssistant" className="text-xs text-muted-foreground">
                          Vapi assistant
                        </Label>
                        <Select
                          value={editVapiAssistantId || 'none'}
                          onValueChange={(v) => setEditVapiAssistantId(v === 'none' ? '' : v)}
                        >
                          <SelectTrigger id="vapiAssistant">
                            <SelectValue placeholder="Select an assistant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Select an assistant —</SelectItem>
                            {agents.map((a) => (
                              <SelectItem key={a.id} value={a.vapiAssistantId || a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {agents.length === 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            No Vapi assistants yet. Create one in{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setEditOpen(false);
                                setActiveView('aiAgents');
                              }}
                              className="underline hover:text-foreground"
                            >
                              AI Receptionist → AI Agents
                            </button>
                            .
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                editMutation.isPending ||
                (editVoiceMode === 'forward' && editForwardEnabled && !editForwardPhone.trim()) ||
                (editVoiceMode === 'ai_vapi' &&
                  aiReceptionist.enabled &&
                  vapiConfigured &&
                  !editVapiAssistantId)
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editMutation.isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-1.5" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Release Number Confirmation ───────────────────────────────── */}
      <AlertDialog
        open={!!releaseTarget}
        onOpenChange={(open) => {
          if (!open) setReleaseTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4 text-red-600" />
              Release this phone number?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {releaseTarget && (
                <>
                  You are about to release <span className="font-mono font-medium">{releaseTarget.number}</span>.
                  The number will be returned to Twilio and the monthly subscription will be cancelled.
                  Customers who try to text this number afterwards will get no reply. This action
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => releaseTarget && releaseMutation.mutate(releaseTarget.id)}
              disabled={releaseMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {releaseMutation.isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="size-4 mr-1.5" />
              )}
              Release number
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function NumbersTableSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60 mt-1" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
