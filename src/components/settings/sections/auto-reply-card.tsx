'use client';

/**
 * AutoReplyCard — self-contained configuration card for the
 * "Auto-Reply When Offline" feature.
 *
 * Extracted from omnichannel-view.tsx so it can be mounted in TWO places:
 *   1. The Omnichannel view header (variant="compact") — inline, with a
 *      bottom border separator.
 *   2. Settings → Communication page (variant="full") — bare Card, no
 *      wrapper, because the Settings shell already provides padding.
 *
 * Behaviour:
 *   - Trial users see a LOCKED card (dashed border + Lock icon + "Trial"
 *     badge). Clicking "Upgrade to unlock" opens the global UpgradeModal
 *     (same pattern as locked menu items) — consistent with the rest of
 *     the app. The actual API gate is `canUseAutoReply()` in
 *     `src/lib/auto-reply.ts` which returns `trial_locked` for trial users
 *     without a FeatureFlag override.
 *   - Paid users see the full config card: enable toggle, mode selector
 *     (scripted / AI), message editor, business-hours respect, offline
 *     threshold, cooldown, Test button, Save button.
 *
 * API contract:
 *   - GET  /api/auto-reply/config   → reads config
 *   - PATCH /api/auto-reply/config  → saves config (403 TRIAL_LOCKED for trial)
 *   - POST /api/auto-reply/test     → preview a sample reply
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock, Save, FlaskConical, Bot, FileText, AlertCircle,
  ChevronDown, ChevronRight, Send, Sparkles, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';
import { useAppStore } from '@/store/app-store';
import { openUpgradeModal } from '@/components/layout/upgrade-modal';

// ─── Auto-Reply config shape (mirrors /api/auto-reply/config contract) ──────

export type AutoReplyMode = 'scripted' | 'ai';

export interface AutoReplyConfig {
  enabled: boolean;
  mode: AutoReplyMode;
  scriptedMessage: string;
  aiSystemPrompt: string;
  respectBusinessHours: boolean;
  offlineThresholdMinutes: number;
  cooldownMinutes: number;
}

export const DEFAULT_AUTO_REPLY_CONFIG: AutoReplyConfig = {
  enabled: false,
  mode: 'scripted',
  scriptedMessage:
    'Hi! Thanks for reaching out to {businessName}. We\'re currently offline — our hours are {businessHours}. For emergencies, call {emergencyPhone}. We\'ll reply as soon as we\'re back online.',
  aiSystemPrompt: '',
  respectBusinessHours: true,
  offlineThresholdMinutes: 2,
  cooldownMinutes: 15,
};

const DEFAULT_AI_PROMPT_PLACEHOLDER =
  'You are a friendly customer-support assistant for {businessName}. Keep replies short, helpful, and professional. If the visitor asks something you cannot answer, let them know a human will follow up shortly. Never make up pricing, availability, or appointments.';

interface AutoReplyCardProps {
  /**
   * - 'compact' (default): renders with a `border-b` + horizontal padding
   *   wrapper, suitable for stacking inline inside the Omnichannel view
   *   header.
   * - 'full': renders as a bare Card with no wrapper, suitable for a
   *   Settings page where the parent already provides padding.
   */
  variant?: 'compact' | 'full';
}

export function AutoReplyCard({ variant = 'compact' }: AutoReplyCardProps) {
  const queryClient = useQueryClient();
  const auth = useAppStore((s) => s.auth);
  const isTrial = auth?.tenant?.planStatus === 'trial';

  const [isExpanded, setIsExpanded] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<{ reply: string; mode: string } | null>(null);

  const { data, isLoading, error, refetch } = useQuery<AutoReplyConfig>({
    queryKey: ['auto-reply-config'],
    queryFn: async () => {
      const res = await authFetch('/api/auto-reply/config');
      if (!res.ok) throw new Error('Failed to load auto-reply config');
      return res.json() as Promise<AutoReplyConfig>;
    },
    enabled: !isTrial,
  });

  // Sync server data → local form state. We use the "adjust state during
  // render" pattern recommended by React docs (instead of useEffect+setState
  // which triggers a cascading render). When the query returns a new object,
  // we update `lastSynced` + `form` synchronously — React discards the
  // intermediate render and only commits the final state.
  const [form, setForm] = useState<AutoReplyConfig>(DEFAULT_AUTO_REPLY_CONFIG);
  const [lastSynced, setLastSynced] = useState<AutoReplyConfig | null>(null);

  if (data && data !== lastSynced) {
    setLastSynced(data);
    setForm({
      ...DEFAULT_AUTO_REPLY_CONFIG,
      ...data,
      // Defensive: API may return `null`/`undefined` for optional fields.
      scriptedMessage: data.scriptedMessage ?? DEFAULT_AUTO_REPLY_CONFIG.scriptedMessage,
      aiSystemPrompt: data.aiSystemPrompt ?? '',
      mode: data.mode === 'ai' ? 'ai' : 'scripted',
    });
  }

  const saveMutation = useMutation({
    mutationFn: async (config: AutoReplyConfig) => {
      const res = await authFetch('/api/auto-reply/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body?.error || 'Failed to save auto-reply settings');
        (err as Error & { code?: string }).code = body?.code;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Auto-reply settings saved');
      queryClient.invalidateQueries({ queryKey: ['auto-reply-config'] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    },
  });

  const testMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await authFetch('/api/auto-reply/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Test failed');
      }
      return res.json() as Promise<{ reply: string; mode: string }>;
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Test failed');
    },
  });

  const updateField = <K extends keyof AutoReplyConfig>(key: K, value: AutoReplyConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const handleTest = () => {
    if (!testMessage.trim()) {
      toast.error('Enter a test message first');
      return;
    }
    setTestResult(null);
    testMutation.mutate(testMessage.trim());
  };

  const isDirty = data ? JSON.stringify(data) !== JSON.stringify(form) : false;

  // Wrapper class differs by variant — compact gets the inline border-b
  // treatment for the Omnichannel header; full is bare for Settings.
  const wrapperClass =
    variant === 'compact'
      ? 'flex-shrink-0 border-b bg-background px-4 sm:px-6 py-3'
      : '';
  const trialWrapperClass =
    variant === 'compact'
      ? 'flex-shrink-0 border-b bg-muted/30 px-4 sm:px-6 py-3'
      : '';

  // ── Trial-locked state ──
  // Trial users see a locked card. Clicking "Upgrade to unlock" opens the
  // global UpgradeModal (mounted in app-layout.tsx) — same pattern as the
  // 9 locked menu items. This is consistent with the LOCK (not hide)
  // decision: the feature is discoverable but gated.
  if (isTrial) {
    return (
      <div className={trialWrapperClass}>
        <Card className={cn('shadow-none border-dashed bg-muted/20 opacity-90')}>
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center size-9 rounded-full bg-muted">
                <Lock className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  Auto-Reply When Offline
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                    Trial
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Automatically reply to visitors when your team is offline. Upgrade to unlock.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => {
                openUpgradeModal({
                  menuKey: 'auto_reply',
                  label: 'Auto-Reply When Offline',
                  description:
                    'Automatically reply to visitors via SMS, WhatsApp, and live chat when your team is offline. Choose scripted templates or AI-generated responses.',
                  minPlan: 'starter',
                });
              }}
            >
              <Sparkles className="size-3.5 text-amber-500" />
              Upgrade to unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className={wrapperClass}>
        <Card className="shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className={wrapperClass}>
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Couldn't load auto-reply settings</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            <span className="text-xs">
              {error instanceof Error ? error.message : 'Unknown error'}. The auto-reply backend may still be starting up.
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Paid state — full config card ──
  return (
    <div className={wrapperClass}>
      <Card className="shadow-none">
        {/* Header row — always visible */}
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="flex items-center gap-2 text-left min-w-0 group"
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex items-center justify-center size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 shrink-0">
                {form.mode === 'ai' ? (
                  <Bot className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  Auto-Reply When Offline
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {form.enabled ? (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                      {' · '}
                      {form.mode === 'ai' ? 'AI-generated' : 'Scripted'}
                      {' · '}fires after {form.offlineThresholdMinutes}m offline
                      {' · '}cooldown {form.cooldownMinutes}m
                    </>
                  ) : (
                    'Disabled — visitors wait for a human reply when you\'re offline.'
                  )}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch
                        checked={form.enabled}
                        onCheckedChange={(v) => {
                          updateField('enabled', v);
                          // Auto-expand on enable so the user sees the options.
                          if (v && !isExpanded) setIsExpanded(true);
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {form.enabled ? 'Auto-reply is ON' : 'Auto-reply is OFF'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        {/* Expanded form */}
        {isExpanded && (
          <CardContent className="px-4 pb-4 pt-1 space-y-4">
            <Separator />

            {/* Mode selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reply mode</Label>
              <Select
                value={form.mode}
                onValueChange={(v: AutoReplyMode) => updateField('mode', v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scripted">
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 text-emerald-600" />
                      <div className="flex flex-col">
                        <span>Scripted (default)</span>
                        <span className="text-[10px] text-muted-foreground">Send a fixed message with variables.</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-2">
                      <Bot className="size-3.5 text-violet-600" />
                      <div className="flex flex-col">
                        <span>AI-Generated</span>
                        <span className="text-[10px] text-muted-foreground">LLM responds to the visitor's message.</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mode-specific input */}
            {form.mode === 'scripted' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Scripted message</Label>
                <Textarea
                  value={form.scriptedMessage}
                  onChange={(e) => updateField('scriptedMessage', e.target.value)}
                  rows={4}
                  placeholder={DEFAULT_AUTO_REPLY_CONFIG.scriptedMessage}
                  className="text-sm resize-y min-h-[88px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Variables: <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{businessName}`}</code>{' '}
                  <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{emergencyPhone}`}</code>{' '}
                  <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{businessHours}`}</code>
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">AI system prompt (optional)</Label>
                <Textarea
                  value={form.aiSystemPrompt}
                  onChange={(e) => updateField('aiSystemPrompt', e.target.value)}
                  rows={4}
                  placeholder={DEFAULT_AI_PROMPT_PLACEHOLDER}
                  className="text-sm resize-y min-h-[88px]"
                />
                <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                  <Sparkles className="size-3 mt-0.5 shrink-0 text-violet-500" />
                  <span>
                    AI mode uses your configured AI keys. Falls back to scripted if AI is unavailable.
                  </span>
                </p>
              </div>
            )}

            {/* Toggles and numeric inputs — responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Respect business hours */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium">Respect business hours</Label>
                  <Switch
                    checked={form.respectBusinessHours}
                    onCheckedChange={(v) => updateField('respectBusinessHours', v)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  When on, auto-reply only fires outside your business hours AND when you&apos;re offline.
                </p>
              </div>

              {/* Offline threshold */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Offline threshold</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={form.offlineThresholdMinutes}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      updateField('offlineThresholdMinutes', isNaN(n) ? 1 : Math.max(1, Math.min(60, n)));
                    }}
                    className="h-9 w-20 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">minutes</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  How long of inactivity before the tenant is considered offline.
                </p>
              </div>

              {/* Cooldown */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Cooldown</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={form.cooldownMinutes}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      updateField('cooldownMinutes', isNaN(n) ? 1 : Math.max(1, Math.min(1440, n)));
                    }}
                    className="h-9 w-20 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">minutes</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Minimum minutes between auto-replies to the same conversation.
                </p>
              </div>
            </div>

            {/* Footer — Test + Save */}
            <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setTestResult(null);
                  setTestMessage('');
                  setShowTestDialog(true);
                }}
                disabled={!form.enabled}
              >
                <FlaskConical className="size-3.5" />
                Test reply
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSave}
                disabled={saveMutation.isPending || !isDirty}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Test dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-emerald-600" />
              Test auto-reply
            </DialogTitle>
            <DialogDescription>
              Send a sample visitor message and see what the auto-reply would return. Uses your current saved config.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Visitor message</Label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                placeholder="e.g. Hi, do you offer emergency plumbing services on weekends?"
                className="text-sm resize-y"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleTest();
                  }
                }}
              />
            </div>

            {testResult && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Bot className="size-3 text-emerald-600" />
                  Reply <span className="text-muted-foreground font-normal">({testResult.mode})</span>
                </Label>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">
                  {testResult.reply || '(empty reply)'}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowTestDialog(false)}>Close</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleTest}
              disabled={testMutation.isPending || !testMessage.trim()}
            >
              {testMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
