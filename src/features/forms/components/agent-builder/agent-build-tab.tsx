'use client';

import React, { useState } from 'react';
import {
  FormAgentData,
  QuickActionButton,
  ConnectedFormRef,
} from '@/features/forms/types/agent-types';
import {
  Sparkles,
  User,
  MessageSquare,
  Mic,
  FileText,
  History,
  LayoutTemplate,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  Palette,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface AgentBuildTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
  availableForms?: ConnectedFormRef[];
}

export function AgentBuildTab({
  agent,
  onChange,
  availableForms = [
    { id: 'form_1', name: 'Dental Appointment & Inquiry Form', description: 'Patient registration form' },
    { id: 'form_2', name: 'Emergency Dental Intake & Triage', description: 'Emergency walk-in priority form' },
    { id: 'form_3', name: 'Insurance & Payment Verification Form', description: 'PPO insurance capture' },
  ],
}: AgentBuildTabProps) {
  const [subTab, setSubTab] = useState<'layout' | 'welcome' | 'navigation' | 'greeting'>('welcome');

  const addQuickAction = () => {
    const newAction: QuickActionButton = {
      id: `qa_${Date.now()}`,
      label: 'New Quick Action',
      actionType: 'message',
      payload: 'I need information regarding this.',
    };
    onChange({
      ...agent,
      quickActions: [...(agent.quickActions || []), newAction],
    });
  };

  const removeQuickAction = (id: string) => {
    onChange({
      ...agent,
      quickActions: agent.quickActions.filter((qa) => qa.id !== id),
    });
  };

  const updateQuickAction = (id: string, updates: Partial<QuickActionButton>) => {
    onChange({
      ...agent,
      quickActions: agent.quickActions.map((qa) => (qa.id === id ? { ...qa, ...updates } : qa)),
    });
  };

  const toggleConnectedForm = (form: ConnectedFormRef) => {
    const exists = agent.connectedForms?.some((f) => f.id === form.id);
    const updated = exists
      ? agent.connectedForms.filter((f) => f.id !== form.id)
      : [...(agent.connectedForms || []), form];

    onChange({
      ...agent,
      connectedForms: updated,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── SUB-TABS: LAYOUT | WELCOME | NAVIGATION | GREETING ── */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="welcome" className="text-xs">
            WELCOME
          </TabsTrigger>
          <TabsTrigger value="navigation" className="text-xs">
            NAVIGATION
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            LAYOUT
          </TabsTrigger>
          <TabsTrigger value="greeting" className="text-xs">
            GREETING
          </TabsTrigger>
        </TabsList>

        {/* ─── 1. WELCOME TAB ─── */}
        <TabsContent value="welcome" className="space-y-4 pt-3">
          {/* Agent Persona & Avatar */}
          <Card className="rounded-xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <User className="size-3.5 text-blue-600" /> Agent Persona & Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Agent Name</Label>
                  <Input
                    value={agent.name}
                    onChange={(e) => onChange({ ...agent, name: e.target.value })}
                    placeholder="e.g. Clara"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Role / Specialty</Label>
                  <Input
                    value={agent.roleTitle}
                    onChange={(e) => onChange({ ...agent, roleTitle: e.target.value })}
                    placeholder="e.g. Dental Appointment Assistant"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Avatar Image URL</Label>
                <div className="flex gap-2 items-center">
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    className="size-8 rounded-full object-cover border shrink-0"
                  />
                  <Input
                    value={agent.avatarUrl}
                    onChange={(e) => onChange({ ...agent, avatarUrl: e.target.value })}
                    className="text-xs h-8 flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Brand Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={agent.brandColor}
                      onChange={(e) => onChange({ ...agent, brandColor: e.target.value })}
                      className="size-7 rounded border cursor-pointer"
                    />
                    <Input
                      value={agent.brandColor}
                      onChange={(e) => onChange({ ...agent, brandColor: e.target.value })}
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Voice Tone</Label>
                  <select
                    value={agent.voiceTone}
                    onChange={(e) => onChange({ ...agent, voiceTone: e.target.value as any })}
                    className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                  >
                    <option value="friendly">Friendly & Warm</option>
                    <option value="professional">Professional & Crisp</option>
                    <option value="medical">Medical / Clinical</option>
                    <option value="sales">High-Conversion Sales</option>
                    <option value="empathetic">Empathetic & Caring</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Welcome Message */}
          <Card className="rounded-xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-blue-600" /> Welcome Greeting
              </CardTitle>
              <CardDescription className="text-[11px]">
                The first message your AI agent sends to visitors.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <Textarea
                value={agent.welcomeGreeting}
                onChange={(e) => onChange({ ...agent, welcomeGreeting: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </CardContent>
          </Card>

          {/* Quick Action Chips */}
          <Card className="rounded-xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-blue-600" /> Quick Action Buttons
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Clickable option chips shown below the greeting.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addQuickAction}
                className="text-xs h-7 gap-1"
              >
                <Plus className="size-3" /> Add Option
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {agent.quickActions?.map((qa, index) => (
                <div
                  key={qa.id}
                  className="p-2.5 bg-muted/40 border border-border/70 rounded-lg flex items-center gap-2"
                >
                  <span className="text-[10px] font-mono text-muted-foreground w-4">
                    {index + 1}.
                  </span>
                  <Input
                    value={qa.label}
                    onChange={(e) => updateQuickAction(qa.id, { label: e.target.value })}
                    className="text-xs h-7 flex-1"
                    placeholder="Button Label"
                  />
                  <select
                    value={qa.actionType}
                    onChange={(e) => updateQuickAction(qa.id, { actionType: e.target.value as any })}
                    className="text-[11px] h-7 rounded border border-input bg-background px-1.5"
                  >
                    <option value="message">Send Text</option>
                    <option value="open_form">Open Form</option>
                    <option value="booking">Calendar</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuickAction(qa.id)}
                    className="size-7 p-0 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 2. NAVIGATION TAB ─── */}
        <TabsContent value="navigation" className="space-y-4 pt-3">
          <Card className="rounded-xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <Sliders className="size-3.5 text-blue-600" /> In-Agent Navigation Tabs
              </CardTitle>
              <CardDescription className="text-[11px]">
                Control which functional tabs are visible at the bottom of the agent interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 divide-y divide-border/60">
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-blue-600" />
                  <div>
                    <p className="text-xs font-semibold">Chat</p>
                    <p className="text-[10px] text-muted-foreground">Allow users to chat with your agent</p>
                  </div>
                </div>
                <Switch
                  checked={agent.navigation?.chatEnabled}
                  onCheckedChange={(c) =>
                    onChange({ ...agent, navigation: { ...agent.navigation, chatEnabled: c } })
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Mic className="size-4 text-purple-600" />
                  <div>
                    <p className="text-xs font-semibold">Voice</p>
                    <p className="text-[10px] text-muted-foreground">Allow users to talk with your agent live</p>
                  </div>
                </div>
                <Switch
                  checked={agent.navigation?.voiceEnabled}
                  onCheckedChange={(c) =>
                    onChange({ ...agent, navigation: { ...agent.navigation, voiceEnabled: c } })
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold">Connected Forms</p>
                    <p className="text-[10px] text-muted-foreground">
                      Allow users to view and fill connected AI forms in-chat
                    </p>
                  </div>
                </div>
                <Switch
                  checked={agent.navigation?.formsEnabled}
                  onCheckedChange={(c) =>
                    onChange({ ...agent, navigation: { ...agent.navigation, formsEnabled: c } })
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-amber-600" />
                  <div>
                    <p className="text-xs font-semibold">Chat History</p>
                    <p className="text-[10px] text-muted-foreground">
                      Allow users to view previous conversations
                    </p>
                  </div>
                </div>
                <Switch
                  checked={agent.navigation?.historyEnabled}
                  onCheckedChange={(c) =>
                    onChange({ ...agent, navigation: { ...agent.navigation, historyEnabled: c } })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Connected AI Forms Selector */}
          <Card className="rounded-xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <FileText className="size-3.5 text-blue-600" /> Attach AI Forms to Agent
              </CardTitle>
              <CardDescription className="text-[11px]">
                Select forms from your AI Forms workspace to make available in this chatbot.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {availableForms.map((form) => {
                const isSelected = agent.connectedForms?.some((f) => f.id === form.id);
                return (
                  <div
                    key={form.id}
                    onClick={() => toggleConnectedForm(form)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                        : 'border-border/70 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">{form.name}</p>
                        {form.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={isSelected ? 'default' : 'outline'}
                      className={`text-[10px] ${isSelected ? 'bg-blue-600' : ''}`}
                    >
                      {isSelected ? 'Connected ✓' : '+ Connect'}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 3. LAYOUT TAB ─── */}
        <TabsContent value="layout" className="space-y-4 pt-3">
          <Card className="rounded-xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <LayoutTemplate className="size-3.5 text-blue-600" /> Chatbot Display Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bottom-right', label: 'Floating Bubble (Bottom Right)', desc: 'Standard website widget' },
                  { id: 'bottom-left', label: 'Floating Bubble (Bottom Left)', desc: 'Left corner launcher' },
                  { id: 'drawer', label: 'Slide-in Drawer', desc: 'Full height slide-out' },
                  { id: 'fullscreen', label: 'Standalone Fullscreen', desc: 'Dedicated agent page' },
                ].map((layout) => {
                  const isSelected = agent.channels?.chatbot?.position === layout.id;
                  return (
                    <div
                      key={layout.id}
                      onClick={() =>
                        onChange({
                          ...agent,
                          channels: {
                            ...agent.channels,
                            chatbot: { ...agent.channels.chatbot, position: layout.id as any },
                          },
                        })
                      }
                      className={`p-2.5 rounded-xl border cursor-pointer text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-600'
                          : 'border-border/70 hover:border-blue-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{layout.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{layout.desc}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 4. GREETING TAB ─── */}
        <TabsContent value="greeting" className="space-y-4 pt-3">
          <Card className="rounded-xl border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold">Launcher Bubble Greeting</CardTitle>
              <CardDescription className="text-[11px]">
                Text bubble displayed above the floating launcher icon on your website.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <Input
                value={agent.channels?.chatbot?.greetingBubble}
                onChange={(e) =>
                  onChange({
                    ...agent,
                    channels: {
                      ...agent.channels,
                      chatbot: { ...agent.channels.chatbot, greetingBubble: e.target.value },
                    },
                  })
                }
                placeholder="👋 Need help booking? Chat with Clara!"
                className="text-xs"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
