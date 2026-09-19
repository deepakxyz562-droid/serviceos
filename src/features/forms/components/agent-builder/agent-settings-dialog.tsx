'use client';

import React, { useState } from 'react';
import {
  FormAgentData,
} from '@/features/forms/types/agent-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Cpu,
  Mic,
  Headphones,
  ShieldCheck,
  Zap,
  Globe,
  Lock,
  Volume2,
  Clock,
  Sparkles,
  Send,
  AlertTriangle,
  Play,
  Pause,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  Database,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
}

const LLM_MODELS = [
  { id: 'gpt-4o', name: 'OpenAI GPT-4o (Recommended)', provider: 'openai', desc: 'Fast multimodal reasoning, exceptional function-calling accuracy.' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', desc: 'Highest nuance, superior complex document reasoning & natural dialogue.' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', desc: 'Massive 2M context window, high speed for real-time document search.' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B (Private Cloud)', provider: 'meta', desc: 'Open-weights high-security inference with zero third-party data retention.' },
];

const VOICE_PREVIEWS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Professional Female - ElevenLabs)', gender: 'female', sampleUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Empathetic Female - ElevenLabs)', gender: 'female', sampleUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Warm Concierge - ElevenLabs)', gender: 'female', sampleUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Authoritative Male - ElevenLabs)', gender: 'male', sampleUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Josh (Friendly Executive - ElevenLabs)', gender: 'male', sampleUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3' },
];

export function AgentSettingsDialog({
  open,
  onOpenChange,
  agent,
  onChange,
}: AgentSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('llm');
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [newBlockedTopic, setNewBlockedTopic] = useState('');

  const settings = agent.settings || {
    language: 'English',
    autoDetectLanguage: true,
    status: 'active',
    timezone: 'America/New_York',
    businessHours: { enabled: true, start: '08:00', end: '18:00', days: [1,2,3,4,5], afterHoursBehavior: 'self_serve' as const },
    llm: { provider: 'openai' as const, model: 'gpt-4o' as const, temperature: 0.3, maxTokens: 1024, streamResponses: true, enableReasoningEffort: true },
    voice: { provider: 'elevenlabs' as const, voiceId: '21m00Tcm4TlvDq8ikWAM', voiceName: 'Rachel', speed: 1.0, pitch: 0, stability: 0.75, ambientSound: 'none' as const, interruptionSensitivity: 'balanced' as const },
    escalation: { enabled: true, triggers: ['user_request' as const, 'negative_sentiment' as const], confidenceThreshold: 75, destination: 'live_chat' as const, targetEmail: 'support@fieseros.com', fallbackMessage: 'Our senior specialists are currently assisting others.' },
    guardrails: { piiRedaction: true, strictKnowledgeOnly: false, blockedTopics: [], gdprConsentRequired: true, zeroDataRetention: false },
    crm: { autoCreateLead: true, provider: 'fieseros' as const, autoSubmitForms: true, csatRatingEnabled: true, webhookUrl: '' },
    widget: { position: 'bottom-right' as const, autoOpenDelaySeconds: 4, chimeSound: true, showPoweredBy: true },
  };

  const updateSettings = (updater: (prev: typeof settings) => typeof settings) => {
    const updated = updater(settings);
    onChange({
      ...agent,
      settings: updated,
    });
  };

  const toggleAudioPreview = (voiceId: string) => {
    if (isPlayingAudio === voiceId) {
      setIsPlayingAudio(null);
    } else {
      setIsPlayingAudio(voiceId);
      // Simulate speech audio playback for 2.5 seconds
      setTimeout(() => {
        setIsPlayingAudio(null);
      }, 2500);
    }
  };

  const addBlockedTopic = () => {
    if (!newBlockedTopic.trim()) return;
    const current = settings.guardrails.blockedTopics || [];
    if (!current.includes(newBlockedTopic.trim())) {
      updateSettings((prev) => ({
        ...prev,
        guardrails: {
          ...prev.guardrails,
          blockedTopics: [...current, newBlockedTopic.trim()],
        },
      }));
    }
    setNewBlockedTopic('');
  };

  const removeBlockedTopic = (topic: string) => {
    updateSettings((prev) => ({
      ...prev,
      guardrails: {
        ...prev.guardrails,
        blockedTopics: (prev.guardrails.blockedTopics || []).filter((t) => t !== topic),
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background text-foreground border-border/80 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shadow-xs">
              <Settings className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                AI Agent Settings
                <Badge variant="outline" className="text-[10px] font-medium bg-muted/60 text-muted-foreground">
                  {agent.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure reasoning models, voice synthesis, compliance guardrails, human escalation, and CRM actions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 7-Pillar Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border/70 px-4 bg-muted/30">
            <TabsList className="bg-transparent h-11 p-0 gap-1 overflow-x-auto justify-start flex">
              <TabsTrigger
                value="llm"
                className="data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-semibold px-3 py-2 rounded-lg gap-1.5"
              >
                <Cpu className="size-3.5 text-blue-600" /> AI Model
              </TabsTrigger>
              <TabsTrigger
                value="voice"
                className="data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-semibold px-3 py-2 rounded-lg gap-1.5"
              >
                <Mic className="size-3.5 text-amber-500" /> Voice & Speech
              </TabsTrigger>
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-semibold px-3 py-2 rounded-lg gap-1.5"
              >
                <Globe className="size-3.5 text-emerald-500" /> General & Language
              </TabsTrigger>
              <TabsTrigger
                value="escalation"
                className="data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-semibold px-3 py-2 rounded-lg gap-1.5"
              >
                <Headphones className="size-3.5 text-purple-500" /> Human Escalation
              </TabsTrigger>
              <TabsTrigger
                value="guardrails"
                className="data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-semibold px-3 py-2 rounded-lg gap-1.5"
              >
                <ShieldCheck className="size-3.5 text-rose-500" /> Guardrails & Safety
              </TabsTrigger>
              <TabsTrigger
                value="crm"
                className="data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-semibold px-3 py-2 rounded-lg gap-1.5"
              >
                <Database className="size-3.5 text-indigo-500" /> CRM & Webhooks
              </TabsTrigger>
              <TabsTrigger
                value="widget"
                className="data-[state=active]:bg-background data-[state=active]:shadow-xs text-xs font-semibold px-3 py-2 rounded-lg gap-1.5"
              >
                <Zap className="size-3.5 text-cyan-500" /> Widget Behavior
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ═══════════════════════════════════════════════════════════════════════
                1. AI MODEL & REASONING ENGINE
               ═══════════════════════════════════════════════════════════════════════ */}
            <TabsContent value="llm" className="m-0 space-y-5">
              <div>
                <Label className="text-xs font-bold text-foreground">Large Language Model (LLM)</Label>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Select the underlying cognitive model that drives reasoning, conversational flow, and data extraction.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {LLM_MODELS.map((m) => {
                    const isSelected = settings.llm.model === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() =>
                          updateSettings((prev) => ({
                            ...prev,
                            llm: { ...prev.llm, model: m.id as any, provider: m.provider as any },
                          }))
                        }
                        className={cn(
                          'p-3.5 rounded-xl border text-left cursor-pointer transition-all relative',
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-600 shadow-2xs'
                            : 'border-border/70 hover:border-border hover:bg-muted/40'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            {m.name}
                          </span>
                          {isSelected && <CheckCircle2 className="size-4 text-blue-600" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{m.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Temperature / Creativity Slider */}
              <div className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/70">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold">Creativity & Precision (Temperature: {settings.llm.temperature})</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Lower values ensure strictly factual responses; higher values yield conversational variety.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
                    {settings.llm.temperature < 0.4 ? 'Strict / Precise' : settings.llm.temperature < 0.7 ? 'Balanced' : 'Creative'}
                  </Badge>
                </div>
                <Slider
                  value={[settings.llm.temperature * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(vals) =>
                    updateSettings((prev) => ({
                      ...prev,
                      llm: { ...prev.llm, temperature: vals[0] / 100 },
                    }))
                  }
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0.0 (Strict Financial/Legal)</span>
                  <span>0.5 (Customer Support)</span>
                  <span>1.0 (Creative Sales)</span>
                </div>
              </div>

              {/* System Prompt Instructions */}
              <div className="space-y-2">
                <Label className="text-xs font-bold">Base System Instructions</Label>
                <p className="text-[11px] text-muted-foreground">
                  Core persona prompt, task rules, and behavior guidelines.
                </p>
                <Textarea
                  value={agent.knowledge?.systemPrompt || ''}
                  onChange={(e) =>
                    onChange({
                      ...agent,
                      knowledge: { ...agent.knowledge, systemPrompt: e.target.value },
                    })
                  }
                  rows={4}
                  className="text-xs leading-relaxed font-mono"
                  placeholder="Define how the AI agent should act, qualify leads, and assist users..."
                />
              </div>

              {/* Streaming & Reasoning Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-semibold">Real-time Stream Responses</p>
                    <p className="text-[10px] text-muted-foreground">Show typing response word-by-word with zero delay.</p>
                  </div>
                  <Switch
                    checked={settings.llm.streamResponses}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        llm: { ...prev.llm, streamResponses: c },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-semibold">Chain-of-Thought Reasoning</p>
                    <p className="text-[10px] text-muted-foreground">Validate eligibility against knowledge docs before answering.</p>
                  </div>
                  <Switch
                    checked={settings.llm.enableReasoningEffort}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        llm: { ...prev.llm, enableReasoningEffort: c },
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════════
                2. VOICE & SPEECH ENGINE
               ═══════════════════════════════════════════════════════════════════════ */}
            <TabsContent value="voice" className="m-0 space-y-5">
              <div>
                <Label className="text-xs font-bold">Voice Model & Persona</Label>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Select an ElevenLabs or OpenAI ultra-realistic neural voice for voice calls and speech responses.
                </p>
                <div className="space-y-2">
                  {VOICE_PREVIEWS.map((v) => {
                    const isSelected = settings.voice.voiceId === v.id;
                    const isPlaying = isPlayingAudio === v.id;
                    return (
                      <div
                        key={v.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-all',
                          isSelected
                            ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 ring-1 ring-amber-500'
                            : 'border-border/70 hover:bg-muted/40'
                        )}
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() =>
                            updateSettings((prev) => ({
                              ...prev,
                              voice: { ...prev.voice, voiceId: v.id, voiceName: v.name },
                            }))
                          }
                        >
                          <div className="size-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                            <Volume2 className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{v.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{v.gender} Voice • 48kHz HD Audio</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAudioPreview(v.id)}
                            className="h-7 px-2 text-[11px] gap-1 text-amber-700 dark:text-amber-300 border-amber-500/40"
                          >
                            {isPlaying ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
                            {isPlaying ? 'Playing...' : 'Audition'}
                          </Button>
                          {isSelected && <CheckCircle2 className="size-4 text-amber-600 ml-1" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Speech Mechanics Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/70">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Speech Speed: {settings.voice.speed}x</Label>
                  </div>
                  <Slider
                    value={[settings.voice.speed * 100]}
                    min={75}
                    max={150}
                    step={5}
                    onValueChange={(vals) =>
                      updateSettings((prev) => ({
                        ...prev,
                        voice: { ...prev.voice, speed: vals[0] / 100 },
                      }))
                    }
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>0.75x (Relaxed)</span>
                    <span>1.0x (Natural)</span>
                    <span>1.5x (Fast)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Voice Stability: {Math.round(settings.voice.stability * 100)}%</Label>
                  </div>
                  <Slider
                    value={[settings.voice.stability * 100]}
                    min={20}
                    max={100}
                    step={5}
                    onValueChange={(vals) =>
                      updateSettings((prev) => ({
                        ...prev,
                        voice: { ...prev.voice, stability: vals[0] / 100 },
                      }))
                    }
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>Expressive / Dynamic</span>
                    <span>Consistent / Studio</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════════
                3. GENERAL & LANGUAGE
               ═══════════════════════════════════════════════════════════════════════ */}
            <TabsContent value="general" className="m-0 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Primary Language</Label>
                  <Input
                    value={settings.language}
                    onChange={(e) =>
                      updateSettings((prev) => ({ ...prev, language: e.target.value }))
                    }
                    placeholder="e.g. English"
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Timezone</Label>
                  <Input
                    value={settings.timezone}
                    onChange={(e) =>
                      updateSettings((prev) => ({ ...prev, timezone: e.target.value }))
                    }
                    placeholder="e.g. America/New_York"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card">
                <div>
                  <p className="text-xs font-bold text-foreground">Auto-Detect Multilingual Input</p>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically respond in the user&apos;s language (supports Spanish, French, German, Japanese, and 30+ others).
                  </p>
                </div>
                <Switch
                  checked={settings.autoDetectLanguage}
                  onCheckedChange={(c) =>
                    updateSettings((prev) => ({ ...prev, autoDetectLanguage: c }))
                  }
                />
              </div>

              {/* Operating Hours */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5 text-blue-600" /> Operational Hours & Schedules
                    </p>
                    <p className="text-[11px] text-muted-foreground">Define business hours for live dispatch vs after-hours self serve.</p>
                  </div>
                  <Switch
                    checked={settings.businessHours.enabled}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        businessHours: { ...prev.businessHours, enabled: c },
                      }))
                    }
                  />
                </div>

                {settings.businessHours.enabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Start Time</Label>
                      <Input
                        type="time"
                        value={settings.businessHours.start}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            businessHours: { ...prev.businessHours, start: e.target.value },
                          }))
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">End Time</Label>
                      <Input
                        type="time"
                        value={settings.businessHours.end}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            businessHours: { ...prev.businessHours, end: e.target.value },
                          }))
                        }
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════════
                4. HUMAN ESCALATION & HANDOFF
               ═══════════════════════════════════════════════════════════════════════ */}
            <TabsContent value="escalation" className="m-0 space-y-5">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card">
                <div>
                  <p className="text-xs font-bold text-foreground">Enable Human Agent Handoff</p>
                  <p className="text-[11px] text-muted-foreground">
                    Seamlessly transfer the conversation to a human specialist when criteria are met.
                  </p>
                </div>
                <Switch
                  checked={settings.escalation.enabled}
                  onCheckedChange={(c) =>
                    updateSettings((prev) => ({
                      ...prev,
                      escalation: { ...prev.escalation, enabled: c },
                    }))
                  }
                />
              </div>

              {settings.escalation.enabled && (
                <>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/70">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Confidence Escalation Threshold ({settings.escalation.confidenceThreshold}%)
                      </Label>
                    </div>
                    <Slider
                      value={[settings.escalation.confidenceThreshold]}
                      min={50}
                      max={95}
                      step={5}
                      onValueChange={(vals) =>
                        updateSettings((prev) => ({
                          ...prev,
                          escalation: { ...prev.escalation, confidenceThreshold: vals[0] },
                        }))
                      }
                    />
                    <p className="text-[10px] text-muted-foreground">
                      If AI confidence score in knowledge base documents drops below this threshold, prompt human handoff.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Escalation Notification Email</Label>
                    <Input
                      value={settings.escalation.targetEmail || ''}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          escalation: { ...prev.escalation, targetEmail: e.target.value },
                        }))
                      }
                      placeholder="e.g. leads@mycompany.com"
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">After-Hours / Offline Fallback Message</Label>
                    <Textarea
                      value={settings.escalation.fallbackMessage}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          escalation: { ...prev.escalation, fallbackMessage: e.target.value },
                        }))
                      }
                      rows={2}
                      className="text-xs leading-relaxed"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════════
                5. GUARDRAILS & COMPLIANCE
               ═══════════════════════════════════════════════════════════════════════ */}
            <TabsContent value="guardrails" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">PII Redaction & Masking</p>
                    <p className="text-[10px] text-muted-foreground">Mask SSN, credit cards, bank accounts in transcripts.</p>
                  </div>
                  <Switch
                    checked={settings.guardrails.piiRedaction}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        guardrails: { ...prev.guardrails, piiRedaction: c },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">Strict Knowledge Only</p>
                    <p className="text-[10px] text-muted-foreground">Block all answers not found in uploaded docs.</p>
                  </div>
                  <Switch
                    checked={settings.guardrails.strictKnowledgeOnly}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        guardrails: { ...prev.guardrails, strictKnowledgeOnly: c },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">GDPR / HIPAA Consent</p>
                    <p className="text-[10px] text-muted-foreground">Ask for chat consent before recording inquiries.</p>
                  </div>
                  <Switch
                    checked={settings.guardrails.gdprConsentRequired}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        guardrails: { ...prev.guardrails, gdprConsentRequired: c },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">Zero-Retention Mode</p>
                    <p className="text-[10px] text-muted-foreground">Erase chat transcripts after session closure.</p>
                  </div>
                  <Switch
                    checked={settings.guardrails.zeroDataRetention}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        guardrails: { ...prev.guardrails, zeroDataRetention: c },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Blocked Topics */}
              <div className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/70">
                <Label className="text-xs font-bold">Blocked Topics & Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    value={newBlockedTopic}
                    onChange={(e) => setNewBlockedTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockedTopic())}
                    placeholder="e.g. competitor pricing, political debates..."
                    className="text-xs h-8 flex-1"
                  />
                  <Button type="button" size="sm" onClick={addBlockedTopic} className="h-8 text-xs gap-1">
                    <Plus className="size-3.5" /> Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(settings.guardrails.blockedTopics || []).map((topic) => (
                    <Badge
                      key={topic}
                      variant="secondary"
                      className="text-[11px] py-1 px-2.5 bg-background border flex items-center gap-1.5"
                    >
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => removeBlockedTopic(topic)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  {(settings.guardrails.blockedTopics || []).length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No blocked topics specified.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════════
                6. CRM & WEBHOOKS
               ═══════════════════════════════════════════════════════════════════════ */}
            <TabsContent value="crm" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">Auto-Create Lead in CRM</p>
                    <p className="text-[10px] text-muted-foreground">Sync verified contact info into Fieseros CRM / Salesforce.</p>
                  </div>
                  <Switch
                    checked={settings.crm.autoCreateLead}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        crm: { ...prev.crm, autoCreateLead: c },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">Post-Chat CSAT Rating</p>
                    <p className="text-[10px] text-muted-foreground">Prompt user with 5-star customer satisfaction survey.</p>
                  </div>
                  <Switch
                    checked={settings.crm.csatRatingEnabled}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        crm: { ...prev.crm, csatRatingEnabled: c },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Outgoing Webhook Endpoint (POST)</Label>
                <Input
                  value={settings.crm.webhookUrl || ''}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      crm: { ...prev.crm, webhookUrl: e.target.value },
                    }))
                  }
                  placeholder="https://api.yourdomain.com/webhooks/ai-leads"
                  className="text-xs h-8 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Dispatches real-time JSON payload containing conversation transcript, user contact info, and form responses.
                </p>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════════
                7. WIDGET BEHAVIOR & BRANDING
               ═══════════════════════════════════════════════════════════════════════ */}
            <TabsContent value="widget" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Launcher Position</Label>
                  <select
                    value={settings.widget.position}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        widget: { ...prev.widget, position: e.target.value as any },
                      }))
                    }
                    className="w-full text-xs h-8 rounded-lg border border-border bg-background px-2"
                  >
                    <option value="bottom-right">Bottom-Right Float (Standard)</option>
                    <option value="bottom-left">Bottom-Left Float</option>
                    <option value="custom">Custom Inline DOM Target</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Proactive Auto-Open Delay</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={settings.widget.autoOpenDelaySeconds}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          widget: { ...prev.widget, autoOpenDelaySeconds: parseInt(e.target.value) || 0 },
                        }))
                      }
                      className="text-xs h-8 w-24"
                    />
                    <span className="text-xs text-muted-foreground">seconds (0 = disable)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">Audio Chime Sound</p>
                    <p className="text-[10px] text-muted-foreground">Play gentle chime when agent sends message.</p>
                  </div>
                  <Switch
                    checked={settings.widget.chimeSound}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        widget: { ...prev.widget, chimeSound: c },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card">
                  <div>
                    <p className="text-xs font-bold">&quot;Powered by Fieseros&quot; Badge</p>
                    <p className="text-[10px] text-muted-foreground">Display verified AI badge in chat footer.</p>
                  </div>
                  <Switch
                    checked={settings.widget.showPoweredBy}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        widget: { ...prev.widget, showPoweredBy: c },
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-blue-600" />
            Changes take effect immediately across all active channels.
          </p>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              toast.success('Agent settings updated!');
            }}
            className="h-8 text-xs font-bold px-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Done & Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
