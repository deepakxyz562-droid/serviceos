'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AI Center — superadmin section for managing the multi-provider AI key chain.
//
// This is the REAL key-management UI (Task 6d). It replaced the prior demo-only
// screen (fake KPIs, fake cost charts, fake prompt templates) with a live CRUD
// surface over the `/api/superadmin/ai-keys` routes added in Task 6b.
//
// Fallback chain order (mirrors `PROVIDER_ORDER` in src/lib/ai-client.ts):
//   OpenRouter → OpenAI → Anthropic → Gemini
// Within a provider, keys are tried in ascending `priority` order. 429/401/403
// rotates to the next key; 5xx/network errors switch provider.
//
// TODO(server-side cache): `src/lib/ai-client.ts` caches the loaded key chain
// for 60s (`keyChainCache` in `loadAiKeyChain`). The CRUD routes in Task 6b do
// NOT call `invalidateAiKeyChainCache()` after a mutation, and we can't import
// that server-only helper from this client component. So outbound AI calls may
// use a stale key chain for up to 60 seconds after a key change here. Acceptable
// for the admin surface; revisit if it causes confusion.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Zap,
  Key as KeyIcon,
  Activity,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Loader2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

import {
  SectionHeader,
  getStatusBadgeClasses,
  timeAgo,
} from '@/components/views/superadmin/_shared';

// ─── Providers ───────────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    value: 'openrouter',
    label: 'OpenRouter',
    description: 'Multi-model gateway (free + paid models)',
    color: 'emerald',
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini',
    color: 'sky',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Haiku',
    color: 'amber',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    value: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini 1.5 Pro, Flash',
    color: 'violet',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
] as const;

type ProviderValue = (typeof PROVIDERS)[number]['value'];
type ProviderColor = (typeof PROVIDERS)[number]['color'];

const PROVIDER_COLOR_CLASSES: Record<ProviderColor, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
};

function providerMeta(value: string) {
  return PROVIDERS.find((p) => p.value === value);
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape returned by GET /api/superadmin/ai-keys (each key is masked). */
interface AiKey {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  priority: number;
  isActive: boolean;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
}

interface KeysResponse {
  keys: AiKey[];
}

interface TestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ─── Main section ────────────────────────────────────────────────────────────

export function AICenterSection() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addProviderPref, setAddProviderPref] = useState<ProviderValue | undefined>(undefined);
  const [editingKey, setEditingKey] = useState<AiKey | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery<KeysResponse>({
    queryKey: ['ai-keys'],
    queryFn: async () => {
      const res = await authFetch('/api/superadmin/ai-keys');
      if (!res.ok) throw new Error('Failed to load AI keys');
      return res.json() as Promise<KeysResponse>;
    },
  });

  const keys = data?.keys ?? [];

  // Group keys by provider (only the 4 known providers), sorted by priority.
  const keysByProvider = PROVIDERS.map((p) => ({
    ...p,
    keys: keys
      .filter((k) => k.provider === p.value)
      .sort((a, b) => a.priority - b.priority),
  }));

  // Aggregate stats for the banner.
  const totalKeys = keys.length;
  const activeKeys = keys.filter((k) => k.isActive).length;

  const openAdd = (provider?: ProviderValue) => {
    setAddProviderPref(provider);
    setAddOpen(true);
  };

  // ─── Mutations ────────────────────────────────────────────────────────────

  const invalidateAfterChange = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await authFetch(`/api/superadmin/ai-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to toggle key');
      }
      return res.json() as Promise<{ key: AiKey }>;
    },
    // Optimistic update: flip `isActive` in the cache before the server responds.
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['ai-keys'] });
      const previous = queryClient.getQueryData<KeysResponse>(['ai-keys']);
      if (previous) {
        queryClient.setQueryData<KeysResponse>(['ai-keys'], {
          ...previous,
          keys: previous.keys.map((k) => (k.id === id ? { ...k, isActive } : k)),
        });
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      // Roll back on failure.
      if (ctx?.previous) {
        queryClient.setQueryData(['ai-keys'], ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to toggle key');
    },
    onSettled: () => invalidateAfterChange(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/superadmin/ai-keys/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to delete key');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Key deleted');
      invalidateAfterChange();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete key'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; priority: number }[]) => {
      const res = await authFetch('/api/superadmin/ai-keys/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to reorder keys');
      }
      return res.json();
    },
    onMutate: async (items) => {
      // Optimistically apply the new priorities so the UI reorders instantly.
      await queryClient.cancelQueries({ queryKey: ['ai-keys'] });
      const previous = queryClient.getQueryData<KeysResponse>(['ai-keys']);
      if (previous) {
        const map = new Map(items.map((i) => [i.id, i.priority]));
        queryClient.setQueryData<KeysResponse>(['ai-keys'], {
          ...previous,
          keys: previous.keys.map((k) =>
            map.has(k.id) ? { ...k, priority: map.get(k.id)! } : k,
          ),
        });
      }
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['ai-keys'], ctx.previous);
      toast.error('Failed to reorder keys');
    },
    onSettled: () => invalidateAfterChange(),
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      <SectionHeader
        title="AI Center"
        description="Manage API keys for AI providers. The fallback chain walks keys in priority order: OpenRouter → OpenAI → Anthropic → Gemini."
        icon={Sparkles}
        actions={
          <Button size="sm" onClick={() => openAdd()} disabled={isLoading}>
            <Plus className="size-4" /> Add Key
          </Button>
        }
      />

      {/* Loading skeletons */}
      {isLoading && <AiCenterSkeleton />}

      {/* Error state */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Failed to load AI keys</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            <span>
              {error instanceof Error ? error.message : 'Unknown error'}.
              The backend may be unavailable or you may not have SuperAdmin access.
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {!isLoading && !error && (
        <div className="space-y-6">
          <FallbackChainBanner
            keys={keys}
            totalKeys={totalKeys}
            activeKeys={activeKeys}
            isFetching={isFetching}
            onAdd={() => openAdd()}
          />

          {keysByProvider.map((p) => (
            <ProviderCard
              key={p.value}
              provider={p}
              onAdd={() => openAdd(p.value)}
              onEdit={(key) => setEditingKey(key)}
              onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onReorder={(items) => reorderMutation.mutate(items)}
              togglePending={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Add Key dialog (provider pre-filled when opened from a ProviderCard) */}
      <AddKeyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        providerPref={addProviderPref}
        onCreated={() => {
          setAddOpen(false);
          setAddProviderPref(undefined);
          invalidateAfterChange();
        }}
      />

      {/* Edit Key dialog (label / priority / isActive only — key rotation is delete + re-create) */}
      <EditKeyDialog
        keyObj={editingKey}
        onOpenChange={(open) => {
          if (!open) setEditingKey(null);
        }}
        onSaved={() => {
          setEditingKey(null);
          invalidateAfterChange();
        }}
      />
    </section>
  );
}

// ─── Fallback chain banner ────────────────────────────────────────────────────

function FallbackChainBanner({
  keys,
  totalKeys,
  activeKeys,
  isFetching,
  onAdd,
}: {
  keys: AiKey[];
  totalKeys: number;
  activeKeys: number;
  isFetching: boolean;
  onAdd: () => void;
}) {
  // No keys at all → warning + CTA.
  if (totalKeys === 0) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>No AI keys configured</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <span>
            Add at least one key to enable AI features. The system will fall back
            to the <code className="font-mono text-xs">OPENROUTER_API_KEY</code> env
            var if set.
          </span>
          <Button size="sm" onClick={onAdd} className="shrink-0">
            <Plus className="size-4" /> Add Key
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              Fallback Chain
            </CardTitle>
            <CardDescription className="text-xs">
              Providers are tried in this order. Within a provider, keys rotate on
              429/401/403 and providers switch on 5xx/network errors.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px]">
              {activeKeys} / {totalKeys} active
            </Badge>
            {isFetching && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> syncing
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {PROVIDERS.map((p, idx) => {
            const providerKeys = keys.filter((k) => k.provider === p.value);
            const activeCount = providerKeys.filter((k) => k.isActive).length;
            const hasActive = activeCount > 0;
            return (
              <div key={p.value} className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
                          hasActive
                            ? PROVIDER_COLOR_CLASSES[p.color]
                            : 'bg-muted text-muted-foreground border-border',
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            hasActive ? 'bg-current' : 'bg-muted-foreground/40',
                          )}
                        />
                        {p.label}
                        <span className="text-[10px] opacity-70">
                          ({activeCount}/{providerKeys.length})
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {hasActive
                        ? `${activeCount} active key${activeCount > 1 ? 's' : ''} for ${p.label}`
                        : `No active keys for ${p.label}`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {idx < PROVIDERS.length - 1 && (
                  <span className="text-muted-foreground/60 text-xs" aria-hidden>
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: (typeof PROVIDERS)[number] & { keys: AiKey[] };
  onAdd: () => void;
  onEdit: (key: AiKey) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onReorder: (items: { id: string; priority: number }[]) => void;
  togglePending: boolean;
}

function ProviderCard({
  provider,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
  onReorder,
  togglePending,
}: ProviderCardProps) {
  const { keys } = provider;
  const meta = providerMeta(provider.value)!;
  const activeCount = keys.filter((k) => k.isActive).length;

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'size-10 rounded-lg flex items-center justify-center shrink-0 border',
                PROVIDER_COLOR_CLASSES[meta.color],
              )}
            >
              <KeyIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                {meta.label}
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    keys.length > 0
                      ? getStatusBadgeClasses(activeCount > 0 ? 'active' : 'inactive')
                      : 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {keys.length === 0
                    ? 'No keys'
                    : `${activeCount}/${keys.length} active`}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{meta.description}</span>
                <a
                  href={meta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                >
                  Get key <ExternalLink className="size-3" />
                </a>
              </CardDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onAdd} className="shrink-0">
            <Plus className="size-4" /> Add Key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {keys.length === 0 ? (
          <div className="px-6 pb-6 pt-2 text-center">
            <p className="text-xs text-muted-foreground italic">
              No keys configured for {meta.label}. The fallback chain will skip
              this provider.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="w-16 text-center">Priority</TableHead>
                  <TableHead className="w-20 text-center">Status</TableHead>
                  <TableHead className="w-32">Last Used</TableHead>
                  <TableHead className="w-40">Last Error</TableHead>
                  <TableHead className="w-24 text-right">Requests</TableHead>
                  <TableHead className="w-44 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k, idx) => (
                  <KeyRow
                    key={k.id}
                    keyObj={k}
                    isFirst={idx === 0}
                    isLast={idx === keys.length - 1}
                    onEdit={() => onEdit(k)}
                    onToggle={(isActive) => onToggle(k.id, isActive)}
                    onDelete={() => onDelete(k.id)}
                    onReorderUp={() => {
                      if (idx === 0) return;
                      const prev = keys[idx - 1];
                      onReorder([
                        { id: k.id, priority: prev.priority },
                        { id: prev.id, priority: k.priority },
                      ]);
                    }}
                    onReorderDown={() => {
                      if (idx === keys.length - 1) return;
                      const next = keys[idx + 1];
                      onReorder([
                        { id: k.id, priority: next.priority },
                        { id: next.id, priority: k.priority },
                      ]);
                    }}
                    togglePending={togglePending}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Key row (table row with all actions) ─────────────────────────────────────

interface KeyRowProps {
  keyObj: AiKey;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
  togglePending: boolean;
}

function KeyRow({
  keyObj,
  isFirst,
  isLast,
  onEdit,
  onToggle,
  onDelete,
  onReorderUp,
  onReorderDown,
  togglePending,
}: KeyRowProps) {
  return (
    <TableRow>
      {/* Drag handle / reorder arrows */}
      <TableCell className="align-middle">
        <div className="flex items-center gap-0.5">
          <GripVertical className="size-3.5 text-muted-foreground/50" aria-hidden />
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={isFirst}
              onClick={onReorderUp}
              aria-label="Move up"
            >
              <ArrowUp className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              disabled={isLast}
              onClick={onReorderDown}
              aria-label="Move down"
            >
              <ArrowDown className="size-3" />
            </Button>
          </div>
        </div>
      </TableCell>

      <TableCell className="font-medium text-sm text-foreground align-middle">
        {keyObj.label}
      </TableCell>

      <TableCell className="align-middle">
        <code className="font-mono text-xs text-muted-foreground">{keyObj.maskedKey}</code>
      </TableCell>

      <TableCell className="text-center align-middle">
        <span className="text-xs font-mono text-muted-foreground">{keyObj.priority}</span>
      </TableCell>

      <TableCell className="text-center align-middle">
        <ToggleActiveSwitch
          isActive={keyObj.isActive}
          pending={togglePending}
          onToggle={onToggle}
          label={keyObj.label}
        />
      </TableCell>

      <TableCell className="align-middle">
        <span className="text-xs text-muted-foreground">
          {timeAgo(keyObj.lastUsedAt)}
        </span>
      </TableCell>

      <TableCell className="align-middle">
        {keyObj.lastError ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 cursor-help">
                  <AlertCircle className="size-3 shrink-0" />
                  <span className="truncate max-w-32">{timeAgo(keyObj.lastErrorAt)}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm break-words">
                {keyObj.lastError}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-right align-middle">
        <span className="text-xs font-mono text-muted-foreground">
          {keyObj.requestCount.toLocaleString('en-US')}
        </span>
      </TableCell>

      <TableCell className="text-right align-middle">
        <div className="flex items-center justify-end gap-1">
          <TestKeyButton keyId={keyObj.id} label={keyObj.label} />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            aria-label={`Edit ${keyObj.label}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <DeleteKeyButton label={keyObj.label} onDelete={onDelete} />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Toggle Active switch (optimistic) ────────────────────────────────────────

function ToggleActiveSwitch({
  isActive,
  pending,
  onToggle,
  label,
}: {
  isActive: boolean;
  pending: boolean;
  onToggle: (isActive: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center">
      <Switch
        checked={isActive}
        disabled={pending}
        onCheckedChange={(checked) => onToggle(checked)}
        aria-label={`${isActive ? 'Disable' : 'Enable'} ${label}`}
      />
    </div>
  );
}

// ─── Test key button ──────────────────────────────────────────────────────────

function TestKeyButton({ keyId, label }: { keyId: string; label: string }) {
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/superadmin/ai-keys/${keyId}/test`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Test request failed');
      }
      return res.json() as Promise<TestResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult('success');
        toast.success(`"${label}" is valid`, {
          description: data.message || 'The upstream provider accepted the key.',
        });
      } else {
        setResult('error');
        toast.error(`"${label}" failed validation`, {
          description: data.error || 'The upstream provider rejected the key.',
        });
      }
      // Reset the icon after a short delay so the user can re-test if desired.
      setTimeout(() => setResult('idle'), 2500);
    },
    onError: (e) => {
      setResult('error');
      toast.error(e instanceof Error ? e.message : 'Test request failed');
      setTimeout(() => setResult('idle'), 2500);
    },
  });

  const icon = testMutation.isPending ? (
    <Loader2 className="size-3.5 animate-spin" />
  ) : result === 'success' ? (
    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
  ) : result === 'error' ? (
    <AlertCircle className="size-3.5 text-red-600 dark:text-red-400" />
  ) : (
    <Zap className="size-3.5" />
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-foreground"
      disabled={testMutation.isPending}
      onClick={() => testMutation.mutate()}
      aria-label={`Test ${label}`}
      title="Test key"
    >
      {icon}
    </Button>
  );
}

// ─── Delete key button (AlertDialog confirmation) ─────────────────────────────

function DeleteKeyButton({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
          aria-label={`Delete ${label}`}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this key?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete <strong>&ldquo;{label}&rdquo;</strong>.
            This cannot be undone — the key will be removed from the fallback chain
            immediately. To rotate the key value instead, delete and re-create it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            <Trash2 className="size-4" /> Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Add Key dialog ───────────────────────────────────────────────────────────

interface AddKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerPref?: ProviderValue;
  onCreated: () => void;
}

function AddKeyDialog({ open, onOpenChange, providerPref, onCreated }: AddKeyDialogProps) {
  const [provider, setProvider] = useState<ProviderValue>(providerPref ?? 'openrouter');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [priority, setPriority] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Sync the provider when the pref changes (e.g. opened from a specific card).
  // useEffect would cause a flash; instead we reset on open via the key prop below.
  // For simplicity, we re-seed the form whenever `open` flips to true.
  // The Dialog remounts this component when `open` toggles because of the conditional
  // render in shadcn's DialogContent — but to be safe, we use an effect-free pattern.

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/superadmin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          label: label.trim(),
          key: apiKey.trim(),
          priority: Number.isFinite(parseInt(priority, 10)) ? parseInt(priority, 10) : 0,
          isActive,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to create key');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Key added to the fallback chain');
      // Reset the form.
      setLabel('');
      setApiKey('');
      setPriority('0');
      setIsActive(true);
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create key'),
  });

  // When opened with a provider pref, seed the select.
  // (Re-seed on every open transition.)
  if (open && providerPref && providerPref !== provider) {
    setProvider(providerPref);
  }

  const canSubmit =
    label.trim().length > 0 &&
    apiKey.trim().length > 0 &&
    !createMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          // Reset on close.
          setLabel('');
          setApiKey('');
          setPriority('0');
          setIsActive(true);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            Add API Key
          </DialogTitle>
          <DialogDescription>
            Add a new key to the fallback chain. The plaintext is encrypted
            server-side and never stored or returned in plaintext.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider */}
          <div className="space-y-1.5">
            <Label htmlFor="add-provider">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as ProviderValue)}>
              <SelectTrigger id="add-provider" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label} — {p.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="add-label">Label</Label>
            <Input
              id="add-label"
              placeholder="e.g. OpenRouter Key 1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label htmlFor="add-key">API Key</Label>
            <Input
              id="add-key"
              type="password"
              placeholder="sk-or-v1-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-muted-foreground">
              Paste the raw key from {providerMeta(provider)?.label}. It will be
              encrypted at rest.
            </p>
          </div>

          {/* Priority + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-priority">Priority</Label>
              <Input
                id="add-priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min={0}
              />
              <p className="text-[11px] text-muted-foreground">
                Lower = tried first.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-active">Active</Label>
              <div className="flex items-center h-9 gap-2">
                <Switch
                  id="add-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <span className="text-sm text-muted-foreground">
                  {isActive ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Key dialog ──────────────────────────────────────────────────────────

interface EditKeyDialogProps {
  keyObj: AiKey | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function EditKeyDialog({ keyObj, onOpenChange, onSaved }: EditKeyDialogProps) {
  const open = keyObj !== null;
  const [label, setLabel] = useState('');
  const [priority, setPriority] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Seed the form when the key changes. Using a layout-style pattern via
  // useState + an effect-free `if (open && keyObj && label === '')` seed is
  // fragile; instead we use a `key` prop on the inner content so it remounts.
  // The simplest robust pattern: track which id we've seeded for.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (open && keyObj && keyObj.id !== seededId) {
    setLabel(keyObj.label);
    setPriority(String(keyObj.priority));
    setIsActive(keyObj.isActive);
    setSeededId(keyObj.id);
  }
  // Clear the seeded id when the dialog closes so a future open re-seeds.
  if (!open && seededId !== null) {
    setSeededId(null);
  }

  const meta = keyObj ? providerMeta(keyObj.provider) : undefined;

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!keyObj) throw new Error('No key selected');
      const res = await authFetch(`/api/superadmin/ai-keys/${keyObj.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          priority: Number.isFinite(parseInt(priority, 10)) ? parseInt(priority, 10) : 0,
          isActive,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to update key');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Key updated');
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update key'),
  });

  const canSubmit =
    keyObj !== null &&
    label.trim().length > 0 &&
    !updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" />
            Edit Key
          </DialogTitle>
          <DialogDescription>
            Update the label, priority, or active state.{' '}
            {meta && (
              <>
                Provider:{' '}
                <Badge
                  variant="outline"
                  className={cn('text-[10px]', PROVIDER_COLOR_CLASSES[meta.color])}
                >
                  {meta.label}
                </Badge>
              </>
            )}
            The key value itself cannot be edited — rotate by deleting and
            re-creating.
          </DialogDescription>
        </DialogHeader>

        {keyObj && (
          <div className="space-y-4 py-2">
            {/* Masked key (read-only display) */}
            <div className="space-y-1.5">
              <Label>Key</Label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                <code className="font-mono text-xs text-muted-foreground">
                  {keyObj.maskedKey}
                </code>
              </div>
              <p className="text-[11px] text-muted-foreground">
                To replace this key value, delete this row and add a new one.
              </p>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
              />
            </div>

            {/* Priority + Active */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-priority">Priority</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-active">Active</Label>
                <div className="flex items-center h-9 gap-2">
                  <Switch
                    id="edit-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <span className="text-sm text-muted-foreground">
                    {isActive ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] text-muted-foreground border-t border-border">
              <div>
                <span className="block">Last used</span>
                <span className="text-foreground/80">
                  {timeAgo(keyObj.lastUsedAt)}
                </span>
              </div>
              <div>
                <span className="block">Requests</span>
                <span className="text-foreground/80 font-mono">
                  {keyObj.requestCount.toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!canSubmit}
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function AiCenterSkeleton() {
  return (
    <div className="space-y-6">
      {/* Banner skeleton */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-80 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {PROVIDERS.map((p) => (
              <Skeleton key={p.value} className="h-8 w-32 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider cards skeleton */}
      {PROVIDERS.map((p) => (
        <Card key={p.value} className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 pb-6 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
