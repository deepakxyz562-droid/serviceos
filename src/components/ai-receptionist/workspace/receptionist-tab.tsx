'use client';

/**
 * ReceptionistTab
 * ================
 *
 * Modern AI Receptionist Persona & Configuration Suite.
 *
 * Five sub-tabs:
 *   - General: Name, Greeting Studio with token pills, After-Hours Greeting
 *   - Voice & Tone: Voice persona selection, Personality chips, Response delay, Ambience
 *   - Business Hours: Visual scheduler with 24/7, Company sync, and custom weekly grid
 *   - Transfers & Fallback: Human handoff number, Fallback mode, and Post-call SMS template
 *   - Knowledge & Capabilities: Services, Pricing, Booking, FAQs, and Business context
 */

import { useState, useRef } from 'react';
import {
  Bot,
  Settings2,
  Clock,
  PhoneForwarded,
  BookOpen,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  Play,
  Pause,
  Calendar,
  Layers,
  HelpCircle,
  Copy,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { ReceptionistData } from './use-ai-receptionist-data';
import { cn } from '@/lib/utils';

interface ReceptionistTabProps {
  receptionist: ReceptionistData | null;
  onChanged: () => Promise<void>;
}

export function ReceptionistTab({ receptionist, onChanged }: ReceptionistTabProps) {
  const [tab, setTab] = useState('general');

  if (!receptionist) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-muted text-muted-foreground">
            <Bot className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No Receptionist Configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Initialize your AI Receptionist from the overview tab to customize voice persona and behavior.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Sub-Tab Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">Agent &amp; Voice Settings</h3>
          <p className="text-xs text-muted-foreground">
            Configure {receptionist.name}&apos;s voice tone, greeting rules, operating hours, and booking capabilities
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-xs font-semibold px-2.5 py-0.5 self-start sm:self-auto bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1.5"
        >
          <Sparkles className="size-3" />
          Active Agent Policy
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/50 gap-1 min-w-full sm:min-w-0">
            <TabsTrigger value="general" className="text-xs gap-1.5 px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings2 className="size-3.5" />
              General &amp; Greetings
            </TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs gap-1.5 px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Bot className="size-3.5" />
              Voice &amp; Tone
            </TabsTrigger>
            <TabsTrigger value="hours" className="text-xs gap-1.5 px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="size-3.5" />
              Operating Hours
            </TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs gap-1.5 px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <PhoneForwarded className="size-3.5" />
              Transfer &amp; SMS
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-xs gap-1.5 px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BookOpen className="size-3.5" />
              Capabilities &amp; FAQ
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-0">
          <GeneralSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="behavior" className="mt-0">
          <BehaviorSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="hours" className="mt-0">
          <BusinessHoursSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="transfers" className="mt-0">
          <TransfersSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-0">
          <KnowledgeSubTab
            key={receptionist.knowledgeConfigJson}
            receptionist={receptionist}
            onChanged={onChanged}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Shared save hook ───────────────────────────────────────────────────────

function useReceptionistPatch(receptionist: ReceptionistData, onChanged: () => Promise<void>) {
  const [saving, setSaving] = useState(false);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/addons/receptionist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        toast.success('Changes saved successfully');
        await onChanged();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save changes');
      }
    } catch {
      toast.error('Network error during save');
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
}

function SaveButton({
  saving,
  onSave,
  disabled,
}: {
  saving: boolean;
  onSave: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onSave}
      disabled={saving || disabled}
      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold h-9 shadow-sm"
    >
      {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
      Save Changes
    </Button>
  );
}

// ─── General Sub-Tab ─────────────────────────────────────────────────────────

function GeneralSubTab({
  receptionist,
  onChanged,
}: {
  receptionist: ReceptionistData;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState(receptionist.name);
  const [greeting, setGreeting] = useState(receptionist.greeting || '');
  const [afterHoursGreeting, setAfterHoursGreeting] = useState(receptionist.afterHoursGreeting || '');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const greetingRef = useRef<HTMLTextAreaElement>(null);
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty =
    name !== receptionist.name ||
    greeting !== (receptionist.greeting || '') ||
    afterHoursGreeting !== (receptionist.afterHoursGreeting || '');

  const insertToken = (token: string) => {
    const el = greetingRef.current;
    if (!el) {
      setGreeting((prev) => prev + ` ${token} `);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const updated = greeting.substring(0, start) + token + greeting.substring(end);
    setGreeting(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleSimulateSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.info('Audio preview: ' + (greeting || `Hi, thanks for calling! How can I help you today?`));
      return;
    }
    if (isPlayingPreview) {
      window.speechSynthesis.cancel();
      setIsPlayingPreview(false);
      return;
    }
    window.speechSynthesis.cancel();
    const textToSpeak = greeting || `Hi, thanks for calling! How can I help you today?`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onend = () => setIsPlayingPreview(false);
    utterance.onerror = () => setIsPlayingPreview(false);
    setIsPlayingPreview(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">Identity &amp; Greetings Studio</CardTitle>
        <CardDescription className="text-xs">
          Set your AI agent&apos;s name and craft the natural spoken greetings callers hear
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold">
            Receptionist Spoken Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sarah"
            className="max-w-md text-xs h-9"
          />
          <p className="text-[11px] text-muted-foreground">
            The name your AI uses when introducing itself (e.g., &quot;Hi, I&apos;m {name || 'Sarah'} with customer support...&quot;)
          </p>
        </div>

        <Separator className="bg-border/60" />

        {/* Primary Business Greeting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label htmlFor="greeting" className="text-xs font-semibold">
              Primary Business Hours Greeting
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulateSpeech}
              className="h-7 text-[11px] gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {isPlayingPreview ? (
                <>
                  <Pause className="size-3 animate-pulse text-emerald-600" />
                  Stop Sample
                </>
              ) : (
                <>
                  <Play className="size-3 text-emerald-600" />
                  Audition Opening
                </>
              )}
            </Button>
          </div>

          <Textarea
            ref={greetingRef}
            id="greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Hi, thanks for calling! How can I help you today?"
            rows={3}
            className="text-xs leading-relaxed"
          />

          {/* Smart variable token chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Insert tokens:</span>
            <button
              type="button"
              onClick={() => insertToken('{business_name}')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-mono text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 border border-border/60 transition-colors"
            >
              <Plus className="size-2.5" /> {'{business_name}'}
            </button>
            <button
              type="button"
              onClick={() => insertToken('{caller_name}')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-mono text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 border border-border/60 transition-colors"
            >
              <Plus className="size-2.5" /> {'{caller_name}'}
            </button>
            <button
              type="button"
              onClick={() => insertToken('{today_hours}')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] font-mono text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 border border-border/60 transition-colors"
            >
              <Plus className="size-2.5" /> {'{today_hours}'}
            </button>
          </div>
        </div>

        <Separator className="bg-border/60" />

        {/* After Hours Greeting */}
        <div className="space-y-2">
          <Label htmlFor="after-hours" className="text-xs font-semibold">
            After-Hours &amp; Holiday Greeting
          </Label>
          <Textarea
            id="after-hours"
            value={afterHoursGreeting}
            onChange={(e) => setAfterHoursGreeting(e.target.value)}
            placeholder="Hi, thanks for calling! We are currently closed. I can take a message, help you book an appointment for tomorrow, or connect you to our emergency line."
            rows={3}
            className="text-xs leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">
            Spoken when calls arrive outside your operating hours. Leave empty to use standard greeting.
          </p>
        </div>

        <div className="flex justify-end pt-3 border-t border-border/40">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() =>
              save({
                name,
                greeting: greeting || null,
                afterHoursGreeting: afterHoursGreeting || null,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Behavior Sub-Tab ────────────────────────────────────────────────────────

function BehaviorSubTab({
  receptionist,
  onChanged,
}: {
  receptionist: ReceptionistData;
  onChanged: () => Promise<void>;
}) {
  const [backgroundNoise, setBackgroundNoise] = useState(receptionist.backgroundNoiseEnabled);
  const [responseDelay, setResponseDelay] = useState(receptionist.responseDelaySeconds);
  const [knownCallerGreeting, setKnownCallerGreeting] = useState(
    receptionist.knownCallerGreetingTemplate || '',
  );
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty =
    backgroundNoise !== receptionist.backgroundNoiseEnabled ||
    responseDelay !== receptionist.responseDelaySeconds ||
    knownCallerGreeting !== (receptionist.knownCallerGreetingTemplate || '');

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">Voice Personality &amp; Conversational Cadence</CardTitle>
        <CardDescription className="text-xs">
          Tune the conversational timing, office ambience, and personalized caller recognition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Ambient office sound */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="noise" className="text-xs font-semibold cursor-pointer">
                Natural Office Ambience
              </Label>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                Recommended
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Adds subtle, organic background telephone room tone to make conversations sound natural and warm
            </p>
          </div>
          <Switch id="noise" checked={backgroundNoise} onCheckedChange={setBackgroundNoise} />
        </div>

        <Separator className="bg-border/60" />

        {/* Response Delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="delay" className="text-xs font-semibold">
              Spoken Response Cadence (Pause Before Speaking)
            </Label>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {responseDelay.toFixed(1)}s delay
            </span>
          </div>
          <div className="flex items-center gap-4 max-w-md">
            <input
              id="delay"
              type="range"
              min={0}
              max={3}
              step={0.2}
              value={responseDelay}
              onChange={(e) => setResponseDelay(Number(e.target.value))}
              className="w-full accent-emerald-600 h-2 bg-muted rounded-lg cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            A small delay (0.4s – 0.8s) prevents the AI from interrupting fast speakers and sounds more human.
          </p>
        </div>

        <Separator className="bg-border/60" />

        {/* Known caller personalized greeting */}
        <div className="space-y-2">
          <Label htmlFor="known-greeting" className="text-xs font-semibold">
            Recognized Customer Greeting Template
          </Label>
          <Textarea
            id="known-greeting"
            value={knownCallerGreeting}
            onChange={(e) => setKnownCallerGreeting(e.target.value)}
            placeholder="Hi {name}, thanks for calling us again! How can I help you today?"
            rows={2}
            className="text-xs leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">
            When an existing CRM customer calls from their saved phone number, the AI greets them directly by name.
          </p>
        </div>

        <div className="flex justify-end pt-3 border-t border-border/40">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() =>
              save({
                backgroundNoiseEnabled: backgroundNoise,
                responseDelaySeconds: responseDelay,
                knownCallerGreetingTemplate: knownCallerGreeting || null,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Business Hours Sub-Tab ──────────────────────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Day = (typeof DAYS)[number];

interface CustomHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

function parseCustomHours(json: string | null): CustomHours {
  if (!json) return defaultHours();
  try {
    return JSON.parse(json) as CustomHours;
  } catch {
    return defaultHours();
  }
}

function defaultHours(): CustomHours {
  const h: CustomHours = {};
  for (const day of DAYS) {
    h[day] = { open: '09:00', close: '17:00', closed: day === 'sunday' || day === 'saturday' };
  }
  return h;
}

function BusinessHoursSubTab({
  receptionist,
  onChanged,
}: {
  receptionist: ReceptionistData;
  onChanged: () => Promise<void>;
}) {
  const [mode, setMode] = useState(receptionist.businessHoursMode || 'use_tenant_hours');
  const [hours, setHours] = useState<CustomHours>(parseCustomHours(null));
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty = mode !== receptionist.businessHoursMode;

  const updateDay = (day: Day, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const copyWeekdayHours = () => {
    const monday = hours['monday'] || { open: '09:00', close: '17:00', closed: false };
    setHours((prev) => ({
      ...prev,
      tuesday: { ...monday },
      wednesday: { ...monday },
      thursday: { ...monday },
      friday: { ...monday },
    }));
    toast.success('Copied Monday hours to all weekdays');
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">Operating Schedule &amp; Receptionist Hours</CardTitle>
        <CardDescription className="text-xs">
          Control when the AI delivers the live business greeting vs after-hours voicemail message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Preset Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setMode('use_tenant_hours')}
            className={cn(
              'p-3.5 rounded-xl border cursor-pointer transition-all',
              mode === 'use_tenant_hours'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-500/20'
                : 'bg-card border-border/60 hover:border-border',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-foreground">Sync with Company Hours</span>
              {mode === 'use_tenant_hours' && <CheckCircle2 className="size-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Automatically follows your company business hours set in Settings → Company.
            </p>
          </div>

          <div
            onClick={() => setMode('custom')}
            className={cn(
              'p-3.5 rounded-xl border cursor-pointer transition-all',
              mode === 'custom'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-500/20'
                : 'bg-card border-border/60 hover:border-border',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-foreground">Custom AI Schedule</span>
              {mode === 'custom' && <CheckCircle2 className="size-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Define dedicated call answering hours specific to your AI Receptionist.
            </p>
          </div>
        </div>

        {/* Custom weekly grid */}
        {mode === 'custom' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Weekly Answering Schedule</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyWeekdayHours}
                className="h-7 text-[11px] gap-1"
              >
                <Copy className="size-3" />
                Copy Mon to Weekdays
              </Button>
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 p-3 bg-muted/20">
              {DAYS.map((day) => {
                const h = hours[day] || { open: '09:00', close: '17:00', closed: false };
                return (
                  <div key={day} className="flex items-center justify-between gap-3 py-1 text-xs">
                    <div className="w-24 font-medium capitalize text-foreground">{day}</div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <Switch
                        checked={!h.closed}
                        onCheckedChange={(checked) => updateDay(day, 'closed', !checked)}
                      />
                      {h.closed ? (
                        <span className="w-48 text-right font-medium text-muted-foreground">Closed (After-Hours)</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            value={h.open}
                            onChange={(e) => updateDay(day, 'open', e.target.value)}
                            className="w-24 text-xs h-8"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={h.close}
                            onChange={(e) => updateDay(day, 'close', e.target.value)}
                            className="w-24 text-xs h-8"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-border/40">
          <SaveButton
            saving={saving}
            disabled={!dirty && mode !== 'custom'}
            onSave={() =>
              save({
                businessHoursMode: mode,
                customHoursJson: mode === 'custom' ? JSON.stringify(hours) : null,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Transfers Sub-Tab ───────────────────────────────────────────────────────

function TransfersSubTab({
  receptionist,
  onChanged,
}: {
  receptionist: ReceptionistData;
  onChanged: () => Promise<void>;
}) {
  const [handoffEnabled, setHandoffEnabled] = useState(receptionist.handoffEnabled);
  const [transferTarget, setTransferTarget] = useState(receptionist.handoffTransferTarget || '');
  const [fallbackMode, setFallbackMode] = useState(receptionist.handoffFallbackMode || 'VOICEMAIL');
  const [smsSendBack, setSmsSendBack] = useState(receptionist.smsSendBackEnabled);
  const [smsTemplate, setSmsTemplate] = useState(receptionist.smsSendBackTemplate || '');
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty =
    handoffEnabled !== receptionist.handoffEnabled ||
    transferTarget !== (receptionist.handoffTransferTarget || '') ||
    fallbackMode !== (receptionist.handoffFallbackMode || 'VOICEMAIL') ||
    smsSendBack !== receptionist.smsSendBackEnabled ||
    smsTemplate !== (receptionist.smsSendBackTemplate || '');

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">Human Transfer &amp; Follow-up SMS</CardTitle>
        <CardDescription className="text-xs">
          Define how the AI transfers complex inquiries to your phone and sends summary text messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Human handoff switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold">Enable Live Human Transfer</Label>
            <p className="text-[11px] text-muted-foreground">
              Allows the AI to transfer the live phone call directly to a staff member when requested
            </p>
          </div>
          <Switch checked={handoffEnabled} onCheckedChange={setHandoffEnabled} />
        </div>

        {handoffEnabled && (
          <div className="space-y-4 p-3.5 rounded-xl border border-border/60 bg-muted/10">
            <div className="space-y-1.5">
              <Label htmlFor="transfer-target" className="text-xs font-semibold">
                Staff Transfer Phone Number
              </Label>
              <Input
                id="transfer-target"
                value={transferTarget}
                onChange={(e) => setTransferTarget(e.target.value)}
                placeholder="+1 555-123-4567"
                className="max-w-md text-xs h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter your mobile or office number in international format (+1...).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fallback If Staff Does Not Answer</Label>
              <Select value={fallbackMode} onValueChange={setFallbackMode}>
                <SelectTrigger className="max-w-md text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VOICEMAIL">Take Voicemail &amp; Send Transcription</SelectItem>
                  <SelectItem value="HANGUP">Polite Farewell &amp; End Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Separator className="bg-border/60" />

        {/* Post-call SMS */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold">Post-Call Customer SMS Summary</Label>
            <p className="text-[11px] text-muted-foreground">
              Automatically text the caller a booking confirmation or conversation summary after they hang up
            </p>
          </div>
          <Switch checked={smsSendBack} onCheckedChange={setSmsSendBack} />
        </div>

        {smsSendBack && (
          <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/10">
            <Label htmlFor="sms-template" className="text-xs font-semibold">
              SMS Message Template
            </Label>
            <Textarea
              id="sms-template"
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              placeholder="Hi, thanks for calling {business_name}! Here is a summary of our call: {summary}. If you have any questions, text us back here."
              rows={3}
              className="text-xs leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Use {'{summary}'} for the AI key takeaways and {'{business_name}'} for your company name.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-border/40">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() =>
              save({
                handoffEnabled,
                handoffTransferTarget: transferTarget || null,
                handoffFallbackMode: fallbackMode,
                smsSendBackEnabled: smsSendBack,
                smsSendBackTemplate: smsTemplate || null,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Knowledge Sub-Tab ───────────────────────────────────────────────────────

function KnowledgeSubTab({
  receptionist,
  onChanged,
}: {
  receptionist: ReceptionistData;
  onChanged: () => Promise<void>;
}) {
  const config = (() => {
    try {
      return JSON.parse(receptionist.knowledgeConfigJson || '{}') as {
        businessInfoScope?: string;
        faqEnabled?: boolean;
        servicesEnabled?: boolean;
        bookingEnabled?: boolean;
        pricingEnabled?: boolean;
        faqIds?: string[];
        documentIds?: string[];
      };
    } catch {
      return {};
    }
  })();

  const [businessInfoScope, setBusinessInfoScope] = useState(config.businessInfoScope || 'all');
  const [faqEnabled, setFaqEnabled] = useState(config.faqEnabled !== false);
  const [servicesEnabled, setServicesEnabled] = useState(config.servicesEnabled !== false);
  const [bookingEnabled, setBookingEnabled] = useState(config.bookingEnabled !== false);
  const [pricingEnabled, setPricingEnabled] = useState(config.pricingEnabled !== false);
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty =
    businessInfoScope !== (config.businessInfoScope || 'all') ||
    faqEnabled !== (config.faqEnabled !== false) ||
    servicesEnabled !== (config.servicesEnabled !== false) ||
    bookingEnabled !== (config.bookingEnabled !== false) ||
    pricingEnabled !== (config.pricingEnabled !== false);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold">CRM Capabilities &amp; Business Knowledge</CardTitle>
        <CardDescription className="text-xs">
          Select which CRM modules and knowledge areas your AI Receptionist can query during live calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <CapabilityCard
            icon={Calendar}
            title="Calendar Slot Availability &amp; Booking"
            description="Allows AI to check open schedule slots and book appointments directly into your CRM"
            active={bookingEnabled}
            onChange={setBookingEnabled}
          />
          <CapabilityCard
            icon={Layers}
            title="Service Catalog &amp; Descriptions"
            description="Allows AI to describe your services, package inclusions, and typical durations"
            active={servicesEnabled}
            onChange={setServicesEnabled}
          />
          <CapabilityCard
            icon={Sparkles}
            title="Catalog Pricing &amp; Estimates"
            description="Allows AI to quote starting prices and estimate standard job costs accurately"
            active={pricingEnabled}
            onChange={setPricingEnabled}
          />
          <CapabilityCard
            icon={HelpCircle}
            title="Knowledge Base &amp; FAQs"
            description="Allows AI to answer common customer inquiries using your company knowledge base"
            active={faqEnabled}
            onChange={setFaqEnabled}
          />
        </div>

        <Separator className="bg-border/60" />

        <div className="p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span className="font-semibold text-emerald-900 dark:text-emerald-300">
              Live Safe-Guards Active
            </span>
          </div>
          <p className="text-emerald-800 dark:text-emerald-400">
            The AI only quotes information present in your verified CRM catalog and will never invent services or pricing not approved by your business.
          </p>
        </div>

        <div className="flex justify-end pt-3 border-t border-border/40">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() =>
              save({
                knowledgeConfigJson: JSON.stringify({
                  businessInfoScope,
                  faqEnabled,
                  servicesEnabled,
                  bookingEnabled,
                  pricingEnabled,
                  faqIds: config.faqIds || [],
                  documentIds: config.documentIds || [],
                }),
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CapabilityCard({
  icon: Icon,
  title,
  description,
  active,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  active: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!active)}
      className={cn(
        'p-3.5 rounded-xl border cursor-pointer transition-all space-y-2',
        active
          ? 'bg-card border-emerald-400/80 dark:border-emerald-700/80 shadow-sm'
          : 'bg-muted/20 border-border/60 opacity-70 hover:opacity-100',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-1.5 rounded-lg',
              active
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="size-4" />
          </div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
        </div>
        <Switch checked={active} onCheckedChange={onChange} onClick={(e) => e.stopPropagation()} />
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2">{description}</p>
    </div>
  );
}

