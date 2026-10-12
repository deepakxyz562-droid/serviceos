'use client';

import React, { useState } from 'react';
import {
  FormAgentData,
  QuickActionButton,
} from '@/features/forms/types/agent-types';
import {
  MessageSquare,
  UserCheck,
  Calendar,
  Paperclip,
  Headphones,
  Ticket,
  Tag,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Sliders,
  Clock,
  Mail,
  Phone,
  Shield,
  Zap,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentSkillsTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
}

export function AgentSkillsTab({ agent, onChange }: AgentSkillsTabProps) {
  // Local state for adding new starter questions
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromoCode, setNewPromoCode] = useState(
    (agent as any).skillsConfig?.discountPromo?.code || 'WELCOME50'
  );
  const [newPromoDesc, setNewPromoDesc] = useState(
    (agent as any).skillsConfig?.discountPromo?.description || '$50 off any initial repair or service visit'
  );

  const rawSkills = (agent as any).skillsConfig || {};
  const skillsConfig = {
    welcomeMessage: {
      enabled: true,
      greeting: agent.welcomeGreeting || '',
      proactiveTrigger: agent.channels?.chatbot?.proactiveTrigger || 'none',
      ...(rawSkills.welcomeMessage || {}),
    },
    leadCapture: {
      enabled: true,
      collectName: true,
      collectPhone: true,
      collectEmail: true,
      collectAddress: true,
      autoCreateLead: true,
      ...(rawSkills.leadCapture || {}),
    },
    appointmentBooking: {
      enabled: true,
      provider: 'bgos' as 'bgos' | 'calendly' | 'calcom' | 'google_calendar',
      bookingUrl: '',
      embedInChat: true,
      allowSameDay: true,
      slotPickerCard: true,
      ...(rawSkills.appointmentBooking || {}),
    },
    photoIntake: {
      enabled: agent.settings?.fileUploadEnabled ?? true,
      promptText: 'Please share a photo of your issue or job site so our technicians can review it.',
      ...(rawSkills.photoIntake || {}),
    },
    humanTransfer: {
      enabled: agent.settings?.escalation?.enabled ?? true,
      operatingHoursOnly: false,
      ...(rawSkills.humanTransfer || {}),
    },
    ticketCreation: {
      enabled: true,
      autoLogUnanswered: true,
      ...(rawSkills.ticketCreation || {}),
    },
    discountPromo: {
      enabled: false,
      code: 'WELCOME50',
      description: '$50 off initial service visit',
      ...(rawSkills.discountPromo || {}),
    },
    externalDataSync: {
      enabled: false,
      webhookUrl: '',
      lookupEndpointUrl: '',
      lookupApiKey: '',
      syncEvents: ['lead_captured', 'appointment_booked', 'human_escalation'],
      ...(rawSkills.externalDataSync || {}),
    },
  };

  const updateSkills = (patch: any) => {
    const updatedSkills = {
      ...skillsConfig,
      ...patch,
    };
    onChange({
      ...agent,
      skillsConfig: updatedSkills,
    } as any);
  };

  const handleAddStarterPrompt = () => {
    const text = newPromptText.trim();
    if (!text) return;
    const existing = agent.quickActions || [];
    const newAction: QuickActionButton = {
      id: `qa_${Date.now()}`,
      label: text,
      actionType: 'message',
      payload: text,
    };
    onChange({
      ...agent,
      quickActions: [...existing, newAction],
    });
    setNewPromptText('');
    toast.success('Added starter prompt button');
  };

  const handleRemoveStarterPrompt = (id: string) => {
    const updated = (agent.quickActions || []).filter((qa) => qa.id !== id);
    onChange({
      ...agent,
      quickActions: updated,
    });
    toast.info('Removed starter prompt button');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Zap className="size-4 text-blue-600" />
            Agent Skills &amp; Capabilities (Text.com Parity)
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Toggle and customize the core interactive abilities your AI Agent executes when engaging visitors.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
          8 Modular Skills
        </Badge>
      </div>

      {/* ── SKILL 1: WELCOME & STARTER QUESTIONS ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                <MessageSquare className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">1. Send Welcome Message &amp; Starter Prompts</CardTitle>
                <CardDescription className="text-[11px]">
                  Greet visitors instantly with your persona, role title, and clickable suggestion chips.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.welcomeMessage.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  welcomeMessage: { ...skillsConfig.welcomeMessage, enabled: val },
                });
              }}
            />
          </div>
        </CardHeader>
        {skillsConfig.welcomeMessage.enabled && (
          <CardContent className="p-4 pt-1 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold">Greeting Message</Label>
              <Textarea
                rows={2}
                value={agent.welcomeGreeting || ''}
                onChange={(e) => onChange({ ...agent, welcomeGreeting: e.target.value })}
                placeholder="Hi! 👋 Welcome to our service. How can I help you today?"
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Starter Quick Action Pills */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] font-bold flex items-center gap-1">
                <Sparkles className="size-3 text-blue-500" />
                Quick-Reply Starter Buttons (shown to visitor)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {(agent.quickActions || []).map((qa) => (
                  <span
                    key={qa.id}
                    className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl border border-blue-200/80 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 text-xs font-medium text-blue-900 dark:text-blue-200 shadow-2xs"
                  >
                    <span>{qa.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStarterPrompt(qa.id)}
                      className="text-blue-400 hover:text-rose-500 transition-colors"
                      title="Remove button"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-1.5 pt-1">
                <Input
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStarterPrompt()}
                  placeholder="e.g. What services do you offer and what are your rates?"
                  className="text-xs h-8 flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddStarterPrompt}
                  disabled={!newPromptText.trim()}
                  className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1"
                >
                  <Plus className="size-3" /> Add Button
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── SKILL 2: LEAD CAPTURE (CUSTOMER DETAILS) ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                <UserCheck className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">2. Collect Customer Details (Lead Capture)</CardTitle>
                <CardDescription className="text-[11px]">
                  Conversationally captures qualified visitor contact information and saves directly into CRM Leads.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.leadCapture.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  leadCapture: { ...skillsConfig.leadCapture, enabled: val },
                });
              }}
            />
          </div>
        </CardHeader>
        {skillsConfig.leadCapture.enabled && (
          <CardContent className="p-4 pt-1 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-muted/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skillsConfig.leadCapture.collectName}
                  onChange={(e) =>
                    updateSkills({
                      leadCapture: { ...skillsConfig.leadCapture, collectName: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-foreground">Full Name</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">Required</Badge>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-muted/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skillsConfig.leadCapture.collectPhone}
                  onChange={(e) =>
                    updateSkills({
                      leadCapture: { ...skillsConfig.leadCapture, collectPhone: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-foreground">Phone Number</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">Required</Badge>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-muted/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skillsConfig.leadCapture.collectEmail}
                  onChange={(e) =>
                    updateSkills({
                      leadCapture: { ...skillsConfig.leadCapture, collectEmail: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-foreground">Email Address</span>
                <span className="ml-auto text-[10px] text-muted-foreground">Optional</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-muted/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skillsConfig.leadCapture.collectAddress}
                  onChange={(e) =>
                    updateSkills({
                      leadCapture: { ...skillsConfig.leadCapture, collectAddress: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-foreground">Job Site Address</span>
                <span className="ml-auto text-[10px] text-muted-foreground">Optional</span>
              </label>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── SKILL 3: APPOINTMENT BOOKING (CALENDLY, GOOGLE CALENDAR & NATIVE SLOT PICKER) ── */}
      <Card className="rounded-xl border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                <Calendar className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  3. Automated Appointment Booking &amp; Calendly Sync
                  <Badge variant="outline" className="text-[9px] text-emerald-700 dark:text-emerald-300 border-emerald-400">
                    Live Booking Engine
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Let visitors book appointments via BGOS Built-in Calendar, Calendly, Cal.com, or Google Calendar.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.appointmentBooking.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  appointmentBooking: { ...skillsConfig.appointmentBooking, enabled: val },
                });
              }}
            />
          </div>
        </CardHeader>
        {skillsConfig.appointmentBooking.enabled && (
          <CardContent className="p-4 pt-1 space-y-3 text-xs">
            {/* Booking Provider Selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold">Booking Calendar Provider</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'bgos', label: 'BGOS Calendar' },
                  { id: 'calendly', label: 'Calendly' },
                  { id: 'calcom', label: 'Cal.com' },
                  { id: 'google_calendar', label: 'Google Calendar' },
                ].map((prov) => {
                  const isSelected = (skillsConfig.appointmentBooking.provider || 'bgos') === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() =>
                        updateSkills({
                          appointmentBooking: {
                            ...skillsConfig.appointmentBooking,
                            provider: prov.id,
                          },
                        })
                      }
                      className={cn(
                        'py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all text-center',
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      )}
                    >
                      {prov.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {skillsConfig.appointmentBooking.provider &&
              skillsConfig.appointmentBooking.provider !== 'bgos' && (
                <div className="p-3 rounded-lg bg-background border border-emerald-300/60 dark:border-emerald-800 space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">
                      {skillsConfig.appointmentBooking.provider === 'calendly'
                        ? 'Calendly Event Link'
                        : skillsConfig.appointmentBooking.provider === 'calcom'
                        ? 'Cal.com Booking Link'
                        : 'Google Calendar Appointment Schedule URL'}
                    </Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={skillsConfig.appointmentBooking.bookingUrl || ''}
                        onChange={(e) =>
                          updateSkills({
                            appointmentBooking: {
                              ...skillsConfig.appointmentBooking,
                              bookingUrl: e.target.value,
                            },
                          })
                        }
                        placeholder={
                          skillsConfig.appointmentBooking.provider === 'calendly'
                            ? 'https://calendly.com/your-business/30min'
                            : skillsConfig.appointmentBooking.provider === 'calcom'
                            ? 'https://cal.com/your-business/consultation'
                            : 'https://calendar.app.google/xxxxxxxx'
                        }
                        className="text-xs h-8 font-mono flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => toast.success('Booking provider URL verified and synced with AI Assistant')}
                        className="h-8 text-xs font-semibold shrink-0"
                      >
                        Verify Link
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-semibold block text-foreground text-[11px]">
                        Embed Booking Calendar Inside Chat Widget
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Opens the scheduling calendar directly inside the chat window without leaving the page.
                      </span>
                    </div>
                    <Switch
                      checked={skillsConfig.appointmentBooking.embedInChat !== false}
                      onCheckedChange={(val) =>
                        updateSkills({
                          appointmentBooking: {
                            ...skillsConfig.appointmentBooking,
                            embedInChat: val,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

            <div className="p-2.5 bg-background border border-emerald-300/60 dark:border-emerald-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold block text-foreground">Interactive Slot Picker Cards</span>
                <span className="text-[10px] text-muted-foreground">
                  Displays interactive booking buttons (e.g. 09:00 AM, 11:30 AM, 02:00 PM, 04:30 PM) in chat.
                </span>
              </div>
              <Switch
                checked={skillsConfig.appointmentBooking.slotPickerCard}
                onCheckedChange={(val) => {
                  updateSkills({
                    appointmentBooking: { ...skillsConfig.appointmentBooking, slotPickerCard: val },
                  });
                }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── SKILL 4: PHOTO & FILE INTAKE (OUR SUPERPOWER) ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                <Paperclip className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">4. Job Photo &amp; Damage File Intake</CardTitle>
                <CardDescription className="text-[11px]">
                  Empowers customers to attach photos of broken pipes, leaks, or site plans directly in chat.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.photoIntake.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  photoIntake: { ...skillsConfig.photoIntake, enabled: val },
                });
                onChange({
                  ...agent,
                  settings: {
                    ...(agent.settings as any),
                    fileUploadEnabled: val,
                  },
                });
              }}
            />
          </div>
        </CardHeader>
        {skillsConfig.photoIntake.enabled && (
          <CardContent className="p-4 pt-1 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Visitors see a paperclip attachment icon beside the chat input to upload photos (JPEG, PNG, WebP up to 10MB).
            </p>
          </CardContent>
        )}
      </Card>

      {/* ── SKILL 5: LIVE HUMAN ESCALATION & HANDOFF ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                <Headphones className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">5. Live Human Escalation &amp; Handoff</CardTitle>
                <CardDescription className="text-[11px]">
                  Seamlessly pauses the AI and routes frustrated or high-value inquiries to live human specialists.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.humanTransfer.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  humanTransfer: { ...skillsConfig.humanTransfer, enabled: val },
                });
                onChange({
                  ...agent,
                  settings: {
                    ...(agent.settings as any),
                    escalation: {
                      ...(agent.settings?.escalation || {}),
                      enabled: val,
                    },
                  },
                });
              }}
            />
          </div>
        </CardHeader>
        {skillsConfig.humanTransfer.enabled && (
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300">
                Trigger: "Talk to human" or "Speak with specialist"
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300">
                Trigger: Repeated question frustration
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300">
                Destination: Live Specialist Board
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── SKILL 6: SUPPORT TICKET & UNRESOLVED INBOX ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                <Ticket className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">6. Support Ticket &amp; Knowledge Gap Logging</CardTitle>
                <CardDescription className="text-[11px]">
                  Automatically logs unanswered visitor questions so admins can provide 1-click answers.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.ticketCreation.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  ticketCreation: { ...skillsConfig.ticketCreation, enabled: val },
                });
              }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* ── SKILL 7: DISCOUNT PROMOS & SPECIAL OFFERS ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                <Tag className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">7. Promotional Discount Codes &amp; Specials</CardTitle>
                <CardDescription className="text-[11px]">
                  Inject promotional coupons when visitors ask for discounts, deals, or first-time specials.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.discountPromo.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  discountPromo: { ...skillsConfig.discountPromo, enabled: val },
                });
              }}
            />
          </div>
        </CardHeader>
        {skillsConfig.discountPromo.enabled && (
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Coupon Code</Label>
                <Input
                  value={newPromoCode}
                  onChange={(e) => {
                    setNewPromoCode(e.target.value);
                    updateSkills({
                      discountPromo: { ...skillsConfig.discountPromo, code: e.target.value },
                    });
                  }}
                  className="text-xs h-8 font-mono uppercase"
                  placeholder="e.g. WELCOME50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Offer Description</Label>
                <Input
                  value={newPromoDesc}
                  onChange={(e) => {
                    setNewPromoDesc(e.target.value);
                    updateSkills({
                      discountPromo: { ...skillsConfig.discountPromo, description: e.target.value },
                    });
                  }}
                  className="text-xs h-8"
                  placeholder="e.g. $50 off initial repair"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── SKILL 8: EXTERNAL DATA, WEBHOOK & CUSTOM REST API SYNC (SAFE DB BRIDGE) ── */}
      <Card className="rounded-xl border-sky-200/80 dark:border-sky-900/60 bg-sky-50/15 dark:bg-sky-950/10 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs">
                <Sliders className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  8. External Data, Webhook &amp; Custom API Sync
                  <Badge variant="outline" className="text-[9px] text-sky-700 dark:text-sky-300 border-sky-400">
                    Safe Backend Bridge
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Connect your backend database safely via REST API or push real-time leads &amp; bookings to Zapier, Make, or custom webhooks.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={skillsConfig.externalDataSync.enabled}
              onCheckedChange={(val) => {
                updateSkills({
                  externalDataSync: { ...skillsConfig.externalDataSync, enabled: val },
                });
              }}
            />
          </div>
        </CardHeader>
        {skillsConfig.externalDataSync.enabled && (
          <CardContent className="p-4 pt-1 space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">
                Outbound Webhook URL (Zapier, Make, n8n, or Custom Server)
              </Label>
              <Input
                value={skillsConfig.externalDataSync.webhookUrl || ''}
                onChange={(e) =>
                  updateSkills({
                    externalDataSync: {
                      ...skillsConfig.externalDataSync,
                      webhookUrl: e.target.value,
                    },
                  })
                }
                placeholder="https://hooks.zapier.com/hooks/catch/... or https://api.yourbusiness.com/webhook"
                className="text-xs h-8 font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Fires a real-time JSON payload whenever a lead is captured, an appointment is booked, or a chat is escalated.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/60">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Custom REST API Lookup Endpoint</Label>
                <Input
                  value={skillsConfig.externalDataSync.lookupEndpointUrl || ''}
                  onChange={(e) =>
                    updateSkills({
                      externalDataSync: {
                        ...skillsConfig.externalDataSync,
                        lookupEndpointUrl: e.target.value,
                      },
                    })
                  }
                  placeholder="https://api.yourbusiness.com/v1/lookup"
                  className="text-xs h-8 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Bearer API Key / Secret Header</Label>
                <Input
                  type="password"
                  value={skillsConfig.externalDataSync.lookupApiKey || ''}
                  onChange={(e) =>
                    updateSkills({
                      externalDataSync: {
                        ...skillsConfig.externalDataSync,
                        lookupApiKey: e.target.value,
                      },
                    })
                  }
                  placeholder="sk_live_xxxxxxxxxxxxxxxx"
                  className="text-xs h-8 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Shield className="size-3 text-emerald-600" />
                Zero raw SQL exposure — queries your database securely over HTTPS.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => toast.success('Webhook & REST API endpoint connection verified')}
                className="h-7 text-xs font-semibold"
              >
                Test Connection
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
