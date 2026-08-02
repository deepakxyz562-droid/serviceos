'use client';

/**
 * AI Auto-Reply Settings section.
 *
 * EXTENDS (does NOT replace) the existing AutoReplyCard in the Communication
 * section. That card handles the basic enable / scripted-vs-AI / cooldown /
 * test-reply flow. THIS section owns the AI-specific layer:
 *
 *   1. Offline Auto-Reply      — provider selection, quiet hours, fallback msg
 *   2. AI Message Generation   — system prompt, tone, length, business hours
 *   3. Call Reply Configuration — Vapi voice, script, human transfer
 *   4. Knowledge Base          — FAQ upload (text/JSON) + manual Q&A entries
 *
 * Persistence: single GET/PUT to /api/settings/ai-auto-reply. The API stores
 * the whole config under `Tenant.settingsJson.aiAutoReply` (no new Prisma
 * models). Other settings sub-keys are preserved by the API's
 * read-modify-write.
 *
 * Pattern followed: src/components/settings/sections/company-settings.tsx
 *   - load on mount, save via a sticky footer button
 *   - toast from sonner
 *   - authFetch from @/lib/api (auto-adds XTransformPort + Bearer token)
 *   - shadcn/ui components only
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Clock,
  Moon,
  MessageSquareText,
  PhoneCall,
  BookOpen,
  Save,
  Loader2,
  PlusCircle,
  Trash2,
  UploadCloud,
  FileText,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Types (mirrors the API contract) ───────────────────────────────────────

type AiTone = 'professional' | 'friendly' | 'casual' | 'formal';

interface AiAutoReplySettings {
  offline: {
    enabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
    fallbackMessage: string;
    provider: string;
  };
  messageGen: {
    systemPrompt: string;
    tone: AiTone;
    maxLength: number;
    includeBusinessHours: boolean;
  };
  callReply: {
    enabled: boolean;
    voice: string;
    script: string;
    transferToHuman: boolean;
  };
  knowledgeBase: {
    entries: Array<{ question: string; answer: string }>;
  };
}

const DEFAULTS: AiAutoReplySettings = {
  offline: {
    enabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone:
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        : 'UTC',
    fallbackMessage:
      "Thanks for reaching out! Our team is currently offline. We'll get back to you as soon as we're back. For emergencies, please call us directly.",
    provider: 'openrouter',
  },
  messageGen: {
    systemPrompt:
      'You are a helpful assistant for {business}. Answer customer questions accurately using the provided knowledge base. Keep replies concise and friendly. If you cannot answer, let the customer know a human will follow up shortly. Never make up pricing, availability, or appointments.',
    tone: 'friendly',
    maxLength: 500,
    includeBusinessHours: true,
  },
  callReply: {
    enabled: false,
    voice: '',
    script:
      'Hello, thanks for calling {business}. Our team is currently unavailable. How can I help you today?',
    transferToHuman: true,
  },
  knowledgeBase: {
    entries: [],
  },
};

const PROVIDERS = [
  {
    value: 'openrouter',
    label: 'OpenRouter',
    hint: 'Multi-model router — free tier available',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    hint: 'GPT-4o / GPT-4o-mini',
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    hint: 'Claude 3.5 Haiku / Sonnet',
  },
  {
    value: 'gemini',
    label: 'Gemini',
    hint: 'Google Gemini 1.5 Flash',
  },
] as const;

const TONES: { value: AiTone; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Polished, business-like tone' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, conversational' },
  { value: 'formal', label: 'Formal', description: 'Highly formal, polite' },
];

/**
 * Vapi voice options. Vapi exposes a fixed set of voices per provider
 * (ElevenLabs, PlayHT, OpenAI, Azure). We list the common ones here so the
 * dropdown is always populated even before a Vapi key is configured. The
 * stored value is the raw voice id string passed straight to Vapi.
 */
const VAPI_VOICES = [
  { value: 'eleven_labs-alex', label: 'Alex (ElevenLabs)' },
  { value: 'eleven_labs-rachel', label: 'Rachel (ElevenLabs)' },
  { value: 'eleven_labs-domi', label: 'Domi (ElevenLabs)' },
  { value: 'eleven_labs-bella', label: 'Bella (ElevenLabs)' },
  { value: 'eleven_labs-antoni', label: 'Antoni (ElevenLabs)' },
  { value: 'playht-jennifer', label: 'Jennifer (PlayHT)' },
  { value: 'playht-david', label: 'David (PlayHT)' },
  { value: 'openai-alloy', label: 'Alloy (OpenAI)' },
  { value: 'openai-nova', label: 'Nova (OpenAI)' },
  { value: 'openai-echo', label: 'Echo (OpenAI)' },
  { value: 'azure-en-US-JennyNeural', label: 'Jenny (Azure)' },
  { value: 'azure-en-US-GuyNeural', label: 'Guy (Azure)' },
];

// Common IANA timezones for the dropdown. The browser-detected tz is the
// default; this list is the curated picker so users can override.
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Halifax',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Dublin',
  'Europe/Warsaw',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

// ─── Component ──────────────────────────────────────────────────────────────

export function AiAutoReplySettings() {
  const [settings, setSettings] = useState<AiAutoReplySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Snapshot of the last server-loaded settings — used to compute "dirty". */
  const [serverSnapshot, setServerSnapshot] = useState<AiAutoReplySettings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/settings/ai-auto-reply');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to load AI auto-reply settings');
      }
      const data = (await res.json()) as AiAutoReplySettings;
      const merged: AiAutoReplySettings = {
        offline: { ...DEFAULTS.offline, ...data?.offline },
        messageGen: { ...DEFAULTS.messageGen, ...data?.messageGen },
        callReply: { ...DEFAULTS.callReply, ...data?.callReply },
        knowledgeBase: {
          ...DEFAULTS.knowledgeBase,
          ...data?.knowledgeBase,
          entries: Array.isArray(data?.knowledgeBase?.entries)
            ? data.knowledgeBase.entries
            : [],
        },
      };
      setSettings(merged);
      setServerSnapshot(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/settings/ai-auto-reply', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to save settings');
      }
      const data = (await res.json()) as { aiAutoReply?: AiAutoReplySettings };
      const next = data.aiAutoReply
        ? {
            offline: { ...DEFAULTS.offline, ...data.aiAutoReply.offline },
            messageGen: { ...DEFAULTS.messageGen, ...data.aiAutoReply.messageGen },
            callReply: { ...DEFAULTS.callReply, ...data.aiAutoReply.callReply },
            knowledgeBase: {
              ...DEFAULTS.knowledgeBase,
              ...data.aiAutoReply.knowledgeBase,
            },
          }
        : settings;
      setSettings(next);
      setServerSnapshot(next);
      toast.success('AI auto-reply settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Field updaters ──────────────────────────────────────────────────────
  // Each updater returns a fresh top-level object so React re-renders. We
  // could use a reducer, but with four nested groups this reads more clearly.

  const updateOffline = <K extends keyof AiAutoReplySettings['offline']>(
    key: K,
    value: AiAutoReplySettings['offline'][K],
  ) =>
    setSettings((s) => ({
      ...s,
      offline: { ...s.offline, [key]: value },
    }));

  const updateMessageGen = <K extends keyof AiAutoReplySettings['messageGen']>(
    key: K,
    value: AiAutoReplySettings['messageGen'][K],
  ) =>
    setSettings((s) => ({
      ...s,
      messageGen: { ...s.messageGen, [key]: value },
    }));

  const updateCallReply = <K extends keyof AiAutoReplySettings['callReply']>(
    key: K,
    value: AiAutoReplySettings['callReply'][K],
  ) =>
    setSettings((s) => ({
      ...s,
      callReply: { ...s.callReply, [key]: value },
    }));

  // ── Knowledge base ──────────────────────────────────────────────────────

  const addKbEntry = () =>
    setSettings((s) => ({
      ...s,
      knowledgeBase: {
        ...s.knowledgeBase,
        entries: [...s.knowledgeBase.entries, { question: '', answer: '' }],
      },
    }));

  const updateKbEntry = (
    idx: number,
    field: 'question' | 'answer',
    value: string,
  ) =>
    setSettings((s) => ({
      ...s,
      knowledgeBase: {
        ...s.knowledgeBase,
        entries: s.knowledgeBase.entries.map((e, i) =>
          i === idx ? { ...e, [field]: value } : e,
        ),
      },
    }));

  const removeKbEntry = (idx: number) =>
    setSettings((s) => ({
      ...s,
      knowledgeBase: {
        ...s.knowledgeBase,
        entries: s.knowledgeBase.entries.filter((_, i) => i !== idx),
      },
    }));

  /**
   * Parse an uploaded text/JSON file into Q&A entries and append them.
   * Accepted formats:
   *   - JSON array of { question, answer } objects
   *   - Plain text: "Q: ...\nA: ...\n\nQ: ...\nA: ..." (or "Question:"/"Answer:")
   */
  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      let newEntries: Array<{ question: string; answer: string }> = [];

      if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of arr) {
          if (item && typeof item === 'object') {
            const q = String(item.question ?? item.q ?? item.title ?? '').trim();
            const a = String(item.answer ?? item.a ?? item.content ?? '').trim();
            if (q || a) newEntries.push({ question: q, answer: a });
          }
        }
      } else {
        // Plain text — split on blank lines, then "Q:" / "A:" prefixes.
        const blocks = text.split(/\n\s*\n/);
        for (const block of blocks) {
          const qMatch = block.match(/^(?:Q|Question)\s*[:.\-]\s*(.+)$/im);
          const aMatch = block.match(/^(?:A|Answer)\s*[:.\-]\s*([\s\S]+)$/im);
          if (qMatch || aMatch) {
            newEntries.push({
              question: qMatch ? qMatch[1].trim() : '',
              answer: aMatch ? aMatch[1].trim() : block.trim(),
            });
          } else if (block.trim()) {
            // No Q/A prefix — treat the whole block as a question.
            newEntries.push({ question: block.trim(), answer: '' });
          }
        }
      }

      if (newEntries.length === 0) {
        toast.error('No Q&A pairs found in the uploaded file');
        return;
      }

      setSettings((s) => ({
        ...s,
        knowledgeBase: {
          ...s.knowledgeBase,
          entries: [...s.knowledgeBase.entries, ...newEntries].slice(0, 500),
        },
      }));
      toast.success(`Imported ${newEntries.length} knowledge base ${newEntries.length === 1 ? 'entry' : 'entries'}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? `Failed to parse file: ${e.message}` : 'Failed to parse file',
      );
    } finally {
      // Reset the input so the same file can be re-selected.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isDirty =
    !!serverSnapshot && JSON.stringify(serverSnapshot) !== JSON.stringify(settings);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading AI auto-reply settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive">
        <AlertCircle className="size-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-sm">Couldn&apos;t load AI auto-reply settings</p>
          <p className="text-xs mt-1 opacity-80">{error}</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchSettings}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. Offline Auto-Reply ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Moon className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                Offline Auto-Reply
                {settings.offline.enabled && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Trigger AI-generated replies when your team is offline or during quiet hours.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Enable AI auto-reply when team is offline</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, incoming messages outside business hours get an instant AI reply instead of waiting for a human.
              </p>
            </div>
            <Switch
              checked={settings.offline.enabled}
              onCheckedChange={(v) => updateOffline('enabled', v)}
            />
          </div>

          <Separator />

          {/* Quiet hours */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="size-3.5" /> Quiet Hours schedule
            </Label>
            <p className="text-xs text-muted-foreground">
              Outside these hours the team is considered offline (in addition to your business-hours setting).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start time</Label>
                <Input
                  type="time"
                  value={settings.offline.quietHoursStart}
                  onChange={(e) => updateOffline('quietHoursStart', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End time</Label>
                <Input
                  type="time"
                  value={settings.offline.quietHoursEnd}
                  onChange={(e) => updateOffline('quietHoursEnd', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Timezone</Label>
                <Select
                  value={settings.offline.timezone}
                  onValueChange={(v) => updateOffline('timezone', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Fallback message */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fallback message</Label>
            <Textarea
              value={settings.offline.fallbackMessage}
              onChange={(e) => updateOffline('fallbackMessage', e.target.value)}
              rows={3}
              placeholder={DEFAULTS.offline.fallbackMessage}
              className="text-sm resize-y min-h-[72px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Sent if AI generation fails or times out. Max 2000 characters.
            </p>
          </div>

          {/* AI provider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Provider</Label>
            <Select
              value={settings.offline.provider}
              onValueChange={(v) => updateOffline('provider', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col">
                      <span>{p.label}</span>
                      <span className="text-[10px] text-muted-foreground">{p.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1">
              <Sparkles className="size-3 mt-0.5 shrink-0 text-violet-500" />
              <span>
                Uses platform-managed API keys (OPENROUTER_API_KEY, OPENAI_API_KEY, etc.).
                Configure keys under <span className="font-medium">Settings → AI</span>.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. AI Message Generation ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <MessageSquareText className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">AI Message Generation</CardTitle>
              <CardDescription>
                Tune how the AI writes replies — system prompt, tone, length, and whether
                business hours are surfaced.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">System prompt</Label>
            <Textarea
              value={settings.messageGen.systemPrompt}
              onChange={(e) => updateMessageGen('systemPrompt', e.target.value)}
              rows={5}
              placeholder={DEFAULTS.messageGen.systemPrompt}
              className="text-sm resize-y min-h-[120px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Use <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{business}`}</code> as
              a placeholder — it&apos;s replaced with your company name at runtime.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tone */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tone</Label>
              <Select
                value={settings.messageGen.tone}
                onValueChange={(v: AiTone) => updateMessageGen('tone', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col">
                        <span>{t.label}</span>
                        <span className="text-[10px] text-muted-foreground">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max response length */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Max response length</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={50}
                  max={4000}
                  step={50}
                  value={settings.messageGen.maxLength}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    updateMessageGen(
                      'maxLength',
                      isNaN(n) ? 50 : Math.max(50, Math.min(4000, n)),
                    );
                  }}
                  className="h-9 w-24"
                />
                <span className="text-xs text-muted-foreground">characters</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Hard cap on the AI&apos;s reply length. Default 500 chars (~80 words).
              </p>
            </div>
          </div>

          {/* Include business hours */}
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Include business hours in response</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, the AI appends your business hours to its reply so customers know when to expect a follow-up.
              </p>
            </div>
            <Switch
              checked={settings.messageGen.includeBusinessHours}
              onCheckedChange={(v) => updateMessageGen('includeBusinessHours', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. Call Reply Configuration ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <PhoneCall className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                Call Reply Configuration
                {settings.callReply.enabled && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                AI-powered inbound call replies when no human agent is available.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Enable AI call reply</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, missed inbound calls are answered by an AI voice agent (Vapi.ai).
                Requires a configured Vapi API key under <span className="font-medium">Settings → AI</span>.
              </p>
            </div>
            <Switch
              checked={settings.callReply.enabled}
              onCheckedChange={(v) => updateCallReply('enabled', v)}
            />
          </div>

          <Separator />

          {/* Voice */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Voice</Label>
            <Select
              value={settings.callReply.voice}
              onValueChange={(v) => updateCallReply('voice', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                {VAPI_VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Common Vapi voices. Your Vapi account may expose additional voices —
              those appear in the Vapi dashboard.
            </p>
          </div>

          {/* Call reply script */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Call reply script</Label>
            <Textarea
              value={settings.callReply.script}
              onChange={(e) => updateCallReply('script', e.target.value)}
              rows={4}
              placeholder={DEFAULTS.callReply.script}
              className="text-sm resize-y min-h-[88px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Opening line the AI uses when answering a missed call.{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">{`{business}`}</code>{' '}
              is replaced with your company name.
            </p>
          </div>

          {/* Transfer to human */}
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Transfer to human on complex queries</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, the AI warm-transfers the caller to a human agent if the query
                involves pricing, scheduling, complaints, or anything outside the knowledge base.
              </p>
            </div>
            <Switch
              checked={settings.callReply.transferToHuman}
              onCheckedChange={(v) => updateCallReply('transferToHuman', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. Knowledge Base ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <BookOpen className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                Knowledge Base
                {settings.knowledgeBase.entries.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted text-muted-foreground"
                  >
                    {settings.knowledgeBase.entries.length}{' '}
                    {settings.knowledgeBase.entries.length === 1 ? 'entry' : 'entries'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                FAQ pairs and context documents the AI uses to answer customer questions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upload FAQ / context documents</Label>
            <div
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors cursor-pointer text-center"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <UploadCloud className="size-7 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground">
                  Text (.txt) or JSON (.json) — Q/A pairs in <code className="font-mono">Q:</code> / <code className="font-mono">A:</code> blocks
                  or <code className="font-mono">{`[{ question, answer }]`}</code> JSON
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,.md,text/plain,application/json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Manual entries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Manual knowledge entries</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={addKbEntry}
              >
                <PlusCircle className="size-3.5" />
                Add entry
              </Button>
            </div>

            {settings.knowledgeBase.entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border border-dashed text-center">
                <FileText className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No knowledge base entries yet. Add one above or upload a document.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {settings.knowledgeBase.entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="shrink-0 mt-1.5 text-[10px]">
                        {idx + 1}
                      </Badge>
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Question (e.g. What are your business hours?)"
                          value={entry.question}
                          onChange={(e) => updateKbEntry(idx, 'question', e.target.value)}
                          className="h-9 text-sm"
                        />
                        <Textarea
                          placeholder="Answer (e.g. We're open Mon–Fri, 9am–6pm. Emergency services available 24/7.)"
                          value={entry.answer}
                          onChange={(e) => updateKbEntry(idx, 'answer', e.target.value)}
                          rows={2}
                          className="text-sm resize-y min-h-[56px]"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeKbEntry(idx)}
                        aria-label="Remove entry"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Save footer ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-background/80 backdrop-blur-sm -mx-4 px-4 py-3 border-t sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:justify-end sm:static">
        <p className="text-xs text-muted-foreground hidden sm:block">
          {isDirty ? 'You have unsaved changes' : 'All changes saved'}
        </p>
        <Button
          className="gap-1.5 px-6 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Hint: relationship with AutoReplyCard in Communication section */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-muted text-xs text-muted-foreground">
        <Bot className="size-4 shrink-0 mt-0.5" />
        <p>
          This section configures the AI-specific layer. The basic auto-reply
          enable/scripted/cooldown controls live under{' '}
          <span className="font-medium">Settings → Communication → Auto-Reply</span> and
          remain fully functional — this section adds provider, tone, voice, and
          knowledge-base controls on top of that.
        </p>
      </div>
    </div>
  );
}
