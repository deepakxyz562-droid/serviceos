'use client';

/**
 * ReceptionistTab
 * ================
 *
 * Ongoing configuration of the AI Receptionist. Five sub-tabs:
 *   - General: name, greeting, after-hours greeting
 *   - Behavior: personality, response style, background noise, response delay
 *   - Business Hours: mode (tenant hours vs custom) + custom hours editor
 *   - Transfers: handoff enabled, transfer target, fallback mode
 *   - Knowledge: which KB entries to inject
 *
 * All edits go through PATCH /api/addons/receptionist (operational config).
 * Agent version config (prompt, voice, model) requires a new version —
 * Phase 9 shows these as read-only (edit requires "Save as new version").
 */

import { useState, useEffect } from 'react';
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <Bot className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No receptionist configured. Complete onboarding first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Receptionist Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure {receptionist.name}&apos;s behavior, hours, and handoff
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="size-3" />
          v{receptionist.currentVersionId ? 'Current' : 'Draft'}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general" className="gap-1.5">
            <Settings2 className="size-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-1.5">
            <Bot className="size-3.5" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-1.5">
            <Clock className="size-3.5" />
            Business Hours
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-1.5">
            <PhoneForwarded className="size-3.5" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5">
            <BookOpen className="size-3.5" />
            Knowledge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <GeneralSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="behavior" className="mt-4">
          <BehaviorSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="hours" className="mt-4">
          <BusinessHoursSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          <TransfersSubTab receptionist={receptionist} onChanged={onChanged} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4">
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
        toast.success('Saved');
        await onChanged();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
}

function SaveButton({ saving, onSave, disabled }: { saving: boolean; onSave: () => void; disabled?: boolean }) {
  return (
    <Button onClick={onSave} disabled={saving || disabled} className="gap-2">
      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      Save Changes
    </Button>
  );
}

// ─── General Sub-Tab ─────────────────────────────────────────────────────────

function GeneralSubTab({ receptionist, onChanged }: { receptionist: ReceptionistData; onChanged: () => Promise<void> }) {
  const [name, setName] = useState(receptionist.name);
  const [greeting, setGreeting] = useState(receptionist.greeting || '');
  const [afterHoursGreeting, setAfterHoursGreeting] = useState(receptionist.afterHoursGreeting || '');
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty = name !== receptionist.name || greeting !== (receptionist.greeting || '') || afterHoursGreeting !== (receptionist.afterHoursGreeting || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">General</CardTitle>
        <CardDescription>Basic identity and greetings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Receptionist Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            The name callers hear when the AI introduces itself.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="greeting">Greeting</Label>
          <Textarea
            id="greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Hi, thanks for calling! How can I help you today?"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            The opening message callers hear during business hours. Leave empty for the AI to generate one.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="after-hours">After-Hours Greeting</Label>
          <Textarea
            id="after-hours"
            value={afterHoursGreeting}
            onChange={(e) => setAfterHoursGreeting(e.target.value)}
            placeholder="Hi, we're currently closed. Leave a message or call back during business hours."
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            What callers hear outside business hours. If empty, the AI uses the standard greeting.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() => save({ name, greeting: greeting || null, afterHoursGreeting: afterHoursGreeting || null })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Behavior Sub-Tab ────────────────────────────────────────────────────────

function BehaviorSubTab({ receptionist, onChanged }: { receptionist: ReceptionistData; onChanged: () => Promise<void> }) {
  const [backgroundNoise, setBackgroundNoise] = useState(receptionist.backgroundNoiseEnabled);
  const [responseDelay, setResponseDelay] = useState(receptionist.responseDelaySeconds);
  const [knownCallerGreeting, setKnownCallerGreeting] = useState(receptionist.knownCallerGreetingTemplate || '');
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty =
    backgroundNoise !== receptionist.backgroundNoiseEnabled ||
    responseDelay !== receptionist.responseDelaySeconds ||
    knownCallerGreeting !== (receptionist.knownCallerGreetingTemplate || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Behavior</CardTitle>
        <CardDescription>How the AI sounds and responds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="noise">Background noise</Label>
            <p className="text-xs text-muted-foreground">
              Add subtle ambient noise to sound more natural
            </p>
          </div>
          <Switch id="noise" checked={backgroundNoise} onCheckedChange={setBackgroundNoise} />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="delay">Response delay (seconds)</Label>
          <Input
            id="delay"
            type="number"
            min={0}
            max={5}
            step={0.5}
            value={responseDelay}
            onChange={(e) => setResponseDelay(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Add a small delay before the AI responds (0–5 seconds) to feel more natural.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="known-greeting">Known caller greeting template</Label>
          <Textarea
            id="known-greeting"
            value={knownCallerGreeting}
            onChange={(e) => setKnownCallerGreeting(e.target.value)}
            placeholder="Hi {name}, thanks for calling again! How can I help you today?"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Special greeting for known callers (customers/leads). Use {'{name}'} for the caller&apos;s name.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() => save({
              backgroundNoiseEnabled: backgroundNoise,
              responseDelaySeconds: responseDelay,
              knownCallerGreetingTemplate: knownCallerGreeting || null,
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Business Hours Sub-Tab ──────────────────────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Day = typeof DAYS[number];

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
    h[day] = { open: '09:00', close: '17:00', closed: day === 'sunday' };
  }
  return h;
}

function BusinessHoursSubTab({ receptionist, onChanged }: { receptionist: ReceptionistData; onChanged: () => Promise<void> }) {
  const [mode, setMode] = useState(receptionist.businessHoursMode || 'use_tenant_hours');
  const [hours, setHours] = useState<CustomHours>(parseCustomHours(receptionist.businessHoursMode === 'custom' ? null : null));
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  useEffect(() => {
    if (receptionist.businessHoursMode === 'custom') {
      // Try to parse from knowledgeConfigJson or a dedicated field
      // For now, use default — the custom hours JSON is stored in customHoursJson
    }
  }, [receptionist]);

  const dirty = mode !== receptionist.businessHoursMode;

  const updateDay = (day: Day, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business Hours</CardTitle>
        <CardDescription>When your AI Receptionist is &quot;open&quot;</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Hours source</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="use_tenant_hours">Use company business hours</SelectItem>
              <SelectItem value="custom">Custom hours (override)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {mode === 'use_tenant_hours'
              ? 'The AI uses your company business hours from Settings → Company.'
              : 'Set custom hours that override your company hours for AI calls only.'}
          </p>
        </div>

        {mode === 'custom' && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium">Custom hours</p>
              {DAYS.map((day) => {
                const h = hours[day] || { open: '09:00', close: '17:00', closed: false };
                return (
                  <div key={day} className="flex items-center gap-3">
                    <div className="w-24">
                      <Label className="text-sm capitalize">{day}</Label>
                    </div>
                    <Switch
                      checked={!h.closed}
                      onCheckedChange={(checked) => updateDay(day, 'closed', !checked)}
                    />
                    {h.closed ? (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    ) : (
                      <>
                        <Input
                          type="time"
                          value={h.open}
                          onChange={(e) => updateDay(day, 'open', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={h.close}
                          onChange={(e) => updateDay(day, 'close', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <SaveButton
            saving={saving}
            disabled={!dirty && mode !== 'custom'}
            onSave={() => save({
              businessHoursMode: mode,
              customHoursJson: mode === 'custom' ? JSON.stringify(hours) : null,
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Transfers Sub-Tab ───────────────────────────────────────────────────────

function TransfersSubTab({ receptionist, onChanged }: { receptionist: ReceptionistData; onChanged: () => Promise<void> }) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Human Transfer</CardTitle>
        <CardDescription>What happens when the AI can&apos;t help</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable human transfer</Label>
            <p className="text-xs text-muted-foreground">
              Let the AI transfer calls to a human when it can&apos;t help
            </p>
          </div>
          <Switch checked={handoffEnabled} onCheckedChange={setHandoffEnabled} />
        </div>

        {handoffEnabled && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="transfer-target">Transfer to (E.164)</Label>
              <Input
                id="transfer-target"
                value={transferTarget}
                onChange={(e) => setTransferTarget(e.target.value)}
                placeholder="+14155551234"
              />
              <p className="text-xs text-muted-foreground">
                The number calls transfer to when the AI hands off.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fallback when human doesn&apos;t answer</Label>
              <Select value={fallbackMode} onValueChange={setFallbackMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VOICEMAIL">Voicemail</SelectItem>
                  <SelectItem value="HANGUP">Hang up</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                What happens if the human transfer target doesn&apos;t pick up.
              </p>
            </div>
          </>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Post-call SMS</Label>
            <p className="text-xs text-muted-foreground">
              Send the caller a summary SMS after the call ends
            </p>
          </div>
          <Switch checked={smsSendBack} onCheckedChange={setSmsSendBack} />
        </div>

        {smsSendBack && (
          <div className="space-y-2">
            <Label htmlFor="sms-template">SMS template</Label>
            <Textarea
              id="sms-template"
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              placeholder="Hi, thanks for calling! Here's a summary of our conversation: {summary}"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{summary}'} for the AI-generated call summary.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() => save({
              handoffEnabled,
              handoffTransferTarget: transferTarget || null,
              handoffFallbackMode: fallbackMode,
              smsSendBackEnabled: smsSendBack,
              smsSendBackTemplate: smsTemplate || null,
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Knowledge Sub-Tab ───────────────────────────────────────────────────────

function KnowledgeSubTab({ receptionist, onChanged }: { receptionist: ReceptionistData; onChanged: () => Promise<void> }) {
  const config = (() => {
    try {
      return JSON.parse(receptionist.knowledgeConfigJson || '{}') as {
        businessInfoScope?: string;
        faqEnabled?: boolean;
        faqIds?: string[];
        documentIds?: string[];
      };
    } catch {
      return {};
    }
  })();

  // Initialize from props (remounts when knowledgeConfigJson changes — see `key` prop in parent)
  const [businessInfoScope, setBusinessInfoScope] = useState(config.businessInfoScope || 'all');
  const [faqEnabled, setFaqEnabled] = useState(config.faqEnabled !== false);
  const { saving, save } = useReceptionistPatch(receptionist, onChanged);

  const dirty = businessInfoScope !== (config.businessInfoScope || 'all') || faqEnabled !== (config.faqEnabled !== false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Knowledge Base</CardTitle>
        <CardDescription>What the AI knows about your business</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Business information scope</Label>
          <Select value={businessInfoScope} onValueChange={setBusinessInfoScope}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All business info (recommended)</SelectItem>
              <SelectItem value="selected">Selected info only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls which business information (hours, services, pricing, address) the AI can reference during calls.
          </p>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>FAQ injection</Label>
            <p className="text-xs text-muted-foreground">
              Let the AI answer common questions from your FAQ
            </p>
          </div>
          <Switch checked={faqEnabled} onCheckedChange={setFaqEnabled} />
        </div>

        {businessInfoScope === 'selected' && (
          <>
            <Separator />
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-xs">
              <p className="font-medium text-amber-900 dark:text-amber-300">
                Selected scope requires choosing which business info to include.
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-1">
                For now, all business info is injected. Fine-grained selection
                is coming in a future update.
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <SaveButton
            saving={saving}
            disabled={!dirty}
            onSave={() => save({
              knowledgeConfigJson: JSON.stringify({
                businessInfoScope,
                faqEnabled,
                faqIds: config.faqIds || [],
                documentIds: config.documentIds || [],
              }),
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
