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
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  ShieldCheck,
  Lock,
  Mail,
  Sliders,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Bell,
  HelpCircle,
  Eye,
  Volume2,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
}

export function AgentSettingsDialog({
  open,
  onOpenChange,
  agent,
  onChange,
}: AgentSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');
  const [customEmailModalOpen, setCustomEmailModalOpen] = useState(false);

  const settings = agent.settings || {
    agentPermission: 'public' as const,
    conversationHistoryAccess: true,
    userFeedbackEnabled: true,
    siteSearchAssist: true,
    allowScreenSharing: false,
    memoryEnabled: true,
    fileUploadEnabled: true,
    agentStatus: 'active' as const,
    language: 'English',
    autoDetectLanguage: true,
    timezone: 'America/New_York',
    businessHours: { enabled: true, start: '08:00', end: '18:00', days: [1,2,3,4,5], afterHoursBehavior: 'self_serve' as const },
    notifications: {
      sendConversationEmails: true,
      notificationEmails: 'admin@mybusiness.com',
      sendAutoresponderEmails: true,
      unansweredQuestionAlerts: true,
      unansweredAlertFrequency: 'each' as const,
    },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-background text-foreground border-border/80 shadow-2xl rounded-2xl">
        {/* ═══════════════════════════════════════════════════════════════════════
            TOP HEADER
           ═══════════════════════════════════════════════════════════════════════ */}
        <div className="p-4 px-6 border-b border-border/70 flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Settings className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">Settings</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Customize notifications and properties
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            2-TAB SWITCHER (GENERAL | NOTIFICATIONS)
           ═══════════════════════════════════════════════════════════════════════ */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border/70 bg-background px-6">
            <TabsList className="bg-transparent h-10 p-0 gap-8 justify-start flex">
              <TabsTrigger
                value="general"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs font-bold rounded-none h-10 px-1 transition-all"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-xs font-bold rounded-none h-10 px-1 transition-all"
              >
                Notifications
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* ═══════════════════════════════════════════════════════════════════
                1. GENERAL TAB (8 EXACT CONTROLS FROM SCREENSHOT 2)
               ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* 1. Agent Permission */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Agent Permission</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Select who can access and interact with your agent.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = settings.agentPermission === 'public' ? 'private' : 'public';
                      updateSettings((prev) => ({ ...prev, agentPermission: next }));
                      toast.info(`Permission set to ${next === 'public' ? 'Public' : 'Private'}`);
                    }}
                    className={cn(
                      'h-7 text-xs font-semibold gap-1.5 px-3 rounded-lg border',
                      settings.agentPermission === 'public'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Lock className="size-3" />
                    <span>{settings.agentPermission === 'public' ? 'Public Agent' : 'Workspace Only'}</span>
                  </Button>
                </div>

                {/* 2. Conversation History Access for Users */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Conversation History Access for Users</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Let users access their past chat conversations with agents.
                    </p>
                  </div>
                  <Switch
                    checked={settings.conversationHistoryAccess}
                    onCheckedChange={(c) => updateSettings((prev) => ({ ...prev, conversationHistoryAccess: c }))}
                  />
                </div>

                {/* 3. Enable User Feedback */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Enable User Feedback</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Let users rate the conversation once it ends to share their experience.
                    </p>
                  </div>
                  <Switch
                    checked={settings.userFeedbackEnabled}
                    onCheckedChange={(c) => updateSettings((prev) => ({ ...prev, userFeedbackEnabled: c }))}
                  />
                </div>

                {/* 4. Chatbot Site Search Assist */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Chatbot Site Search Assist</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Let the agent look at the website if it doesn&apos;t know the answer.
                    </p>
                  </div>
                  <Switch
                    checked={settings.siteSearchAssist}
                    onCheckedChange={(c) => updateSettings((prev) => ({ ...prev, siteSearchAssist: c }))}
                  />
                </div>

                {/* 5. Allow Screen Sharing For Visual Guidance */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Allow Screen Sharing For Visual Guidance</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Displays a screen sharing button below step-by-step instructions for visual help.
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowScreenSharing}
                    onCheckedChange={(c) => updateSettings((prev) => ({ ...prev, allowScreenSharing: c }))}
                  />
                </div>

                {/* 6. Memory */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Memory</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Allow your agent to remember users and previous interactions.
                    </p>
                  </div>
                  <Switch
                    checked={settings.memoryEnabled}
                    onCheckedChange={(c) => updateSettings((prev) => ({ ...prev, memoryEnabled: c }))}
                  />
                </div>

                {/* 7. File Upload */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">File Upload</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Allow users to upload files during the conversation.
                    </p>
                  </div>
                  <Switch
                    checked={settings.fileUploadEnabled}
                    onCheckedChange={(c) => updateSettings((prev) => ({ ...prev, fileUploadEnabled: c }))}
                  />
                </div>

                {/* 8. Agent Status */}
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Agent Status</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Control whether this agent is currently live or in maintenance.
                    </p>
                  </div>
                  <select
                    value={settings.agentStatus}
                    onChange={(e) => updateSettings((prev) => ({ ...prev, agentStatus: e.target.value as any }))}
                    className="text-xs h-7 px-2 border rounded-lg bg-background"
                  >
                    <option value="active">Active (Online)</option>
                    <option value="disabled">Disabled (Offline)</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                2. NOTIFICATIONS TAB (3 EXACT CONTROLS FROM SCREENSHOT 1)
               ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {/* 1. Send Conversation Notification Emails */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Send Conversation Notification Emails</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Each conversation is also sent via email.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCustomEmailModalOpen(true)}
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                      title="Configure notification recipients"
                    >
                      <Settings className="size-3.5" />
                    </Button>
                    <Switch
                      checked={settings.notifications.sendConversationEmails}
                      onCheckedChange={(c) =>
                        updateSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, sendConversationEmails: c },
                        }))
                      }
                    />
                  </div>
                </div>

                {/* 2. Send Conversation Autoresponder Emails */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="space-y-0.5 max-w-[420px]">
                    <p className="text-xs font-bold text-foreground">Send Conversation Autoresponder Emails</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Send an email to the person conducting the conversation.
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sendAutoresponderEmails}
                    onCheckedChange={(c) =>
                      updateSettings((prev) => ({
                        ...prev,
                        notifications: { ...prev.notifications, sendAutoresponderEmails: c },
                      }))
                    }
                  />
                </div>

                {/* 3. Get Emails When Your Agent Needs Answers */}
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 max-w-[420px]">
                      <p className="text-xs font-bold text-foreground">Get Emails When Your Agent Needs Answers</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Receive an email when your agent doesn&apos;t reply to a question.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.unansweredQuestionAlerts}
                      onCheckedChange={(c) =>
                        updateSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, unansweredQuestionAlerts: c },
                        }))
                      }
                    />
                  </div>

                  {settings.notifications.unansweredQuestionAlerts && (
                    <div className="pt-2">
                      <select
                        value={settings.notifications.unansweredAlertFrequency}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              unansweredAlertFrequency: e.target.value as any,
                            },
                          }))
                        }
                        className="w-full text-xs h-8 rounded-lg border border-border bg-background px-3 font-medium text-foreground"
                      >
                        <option value="each">For each question</option>
                        <option value="daily">Daily Digest</option>
                        <option value="weekly">Weekly Summary</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════════
            FOOTER
           ═══════════════════════════════════════════════════════════════════════ */}
        <DialogFooter className="p-3.5 px-6 border-t border-border/70 bg-muted/20 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="size-3 text-emerald-500" />
            All settings apply live to your active agent runtime.
          </p>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              toast.success('Agent settings saved successfully!');
            }}
            className="h-8 text-xs font-bold px-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Recipient Emails Modal */}
      <Dialog open={customEmailModalOpen} onOpenChange={setCustomEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold">Notification Email Recipients</DialogTitle>
            <DialogDescription className="text-[11px]">
              Specify emails to receive complete session transcripts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              value={settings.notifications.notificationEmails}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, notificationEmails: e.target.value },
                }))
              }
              placeholder="e.g. alerts@company.com, ceo@company.com"
              className="text-xs h-8"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setCustomEmailModalOpen(false)}
              className="h-7 text-xs bg-blue-600 text-white"
            >
              Save Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
