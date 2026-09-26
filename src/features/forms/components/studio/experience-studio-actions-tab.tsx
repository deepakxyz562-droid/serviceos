'use client';

import React from 'react';
import {
  Zap,
  Users,
  Calendar,
  CreditCard,
  MessageSquare,
  Mail,
  Webhook,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Sparkles,
  ShieldCheck,
  Smartphone,
  PhoneCall,
  Briefcase,
  FileCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { EditorFormData, PrimaryAction } from '@/features/forms/types';
import { PRIMARY_ACTIONS, CRM_FIELDS } from '@/features/forms/types';

interface ExperienceStudioActionsTabProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
}

export function ExperienceStudioActionsTab({
  formData,
  onFormDataChange,
}: ExperienceStudioActionsTabProps) {
  const actions = formData.submissionActions || {
    primary: 'create_lead' as PrimaryAction,
    additional: {
      sendWhatsAppOwner: false,
      sendWhatsAppUser: false,
      sendEmail: true,
      addToCampaign: false,
      notifySalesTeam: false,
      callWebhook: false,
    },
    whatsappOwnerTemplate: '',
    whatsappUserTemplate: '',
    aiGenerateUserMessage: false,
    webhookUrl: '',
  };

  const updateActions = (partial: Partial<typeof actions>) => {
    onFormDataChange((prev) => ({
      ...prev,
      submissionActions: {
        ...actions,
        ...partial,
      },
    }));
  };

  const updateAdditional = (key: keyof typeof actions.additional, val: boolean) => {
    updateActions({
      additional: {
        ...actions.additional,
        [key]: val,
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 md:p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600 text-white text-xs font-semibold px-2.5 py-0.5">
            FIESEROS OS ACTIONS ENGINE
          </Badge>
          <span className="text-xs text-muted-foreground">Automations &amp; Workflows</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">Operational Actions &amp; Automations</h2>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          Connect this experience directly to Fieseros CRM, Calendar booking, Payment gateways, instant WhatsApp/SMS dispatches, and external Webhooks. Every submission triggers these actions instantly.
        </p>
      </div>

      <Tabs defaultValue="crm" className="w-full space-y-5">
        <TabsList className="bg-muted/60 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="crm" className="gap-1.5 text-xs font-semibold py-2">
            <Users className="size-3.5 text-emerald-600" /> CRM Sync
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs font-semibold py-2">
            <Calendar className="size-3.5 text-blue-600" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 text-xs font-semibold py-2">
            <CreditCard className="size-3.5 text-indigo-600" /> Payments
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs font-semibold py-2">
            <MessageSquare className="size-3.5 text-amber-600" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5 text-xs font-semibold py-2 col-span-2 sm:col-span-1">
            <Webhook className="size-3.5 text-rose-600" /> Webhooks
          </TabsTrigger>
        </TabsList>

        {/* 1. CRM & Workflows */}
        <TabsContent value="crm" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="size-4 text-emerald-600" /> Primary Fieseros CRM Entity
              </CardTitle>
              <CardDescription className="text-xs">
                Select what record is generated automatically when a customer completes this form or chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Primary Action</Label>
                <Select
                  value={actions.primary}
                  onValueChange={(val: PrimaryAction) => updateActions({ primary: val })}
                >
                  <SelectTrigger className="w-full h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Select primary action" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_ACTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value} className="text-xs">
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field Mappings */}
              <div className="pt-3 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold">Field Mappings to CRM</Label>
                    <p className="text-[11px] text-muted-foreground">Map form answers directly to customer profile attributes.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const mappings = formData.fieldMappings || [];
                      onFormDataChange((prev) => ({
                        ...prev,
                        fieldMappings: [...mappings, { formFieldId: formData.fields[0]?.id || '', crmField: 'name' }],
                      }));
                      toast.success('Mapping row added');
                    }}
                    className="h-7 text-xs rounded-lg"
                  >
                    + Add Field Mapping
                  </Button>
                </div>

                <div className="space-y-2">
                  {(formData.fieldMappings || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                      No custom field mappings configured. Standard fields (Name, Phone, Email) auto-sync.
                    </div>
                  ) : (
                    formData.fieldMappings.map((mapping, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={mapping.formFieldId}
                          onValueChange={(val) => {
                            const updated = [...(formData.fieldMappings || [])];
                            updated[idx] = { ...updated[idx], formFieldId: val };
                            onFormDataChange((prev) => ({ ...prev, fieldMappings: updated }));
                          }}
                        >
                          <SelectTrigger className="flex-1 h-8 text-xs rounded-lg">
                            <SelectValue placeholder="Form field" />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.fields.map((f) => (
                              <SelectItem key={f.id} value={f.id} className="text-xs">
                                {f.label || f.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />

                        <Select
                          value={mapping.crmField}
                          onValueChange={(val) => {
                            const updated = [...(formData.fieldMappings || [])];
                            updated[idx] = { ...updated[idx], crmField: val };
                            onFormDataChange((prev) => ({ ...prev, fieldMappings: updated }));
                          }}
                        >
                          <SelectTrigger className="flex-1 h-8 text-xs rounded-lg">
                            <SelectValue placeholder="CRM field" />
                          </SelectTrigger>
                          <SelectContent>
                            {CRM_FIELDS.map((cf) => (
                              <SelectItem key={cf.value} value={cf.value} className="text-xs">
                                {cf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = (formData.fieldMappings || []).filter((_, i) => i !== idx);
                            onFormDataChange((prev) => ({ ...prev, fieldMappings: updated }));
                          }}
                          className="size-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg"
                        >
                          ×
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Calendar Booking */}
        <TabsContent value="calendar" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="size-4 text-blue-600" /> Dispatch &amp; Appointment Booking
              </CardTitle>
              <CardDescription className="text-xs">
                Automatically sync appointment time-slots with team calendars and technician availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold">Enable Fieseros Dispatch Calendar Sync</div>
                  <div className="text-[11px] text-muted-foreground">
                    Automatically hold slot upon customer selection and alert on-call technician.
                  </div>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-emerald-600" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Slot Duration</Label>
                  <Select defaultValue="45">
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Slot length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Buffer Between Jobs</Label>
                  <Select defaultValue="15">
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Buffer length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No buffer</SelectItem>
                      <SelectItem value="15">15 minutes travel</SelectItem>
                      <SelectItem value="30">30 minutes travel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="size-4 text-indigo-600" /> Connected Payment Gateways
              </CardTitle>
              <CardDescription className="text-xs">
                Collect deposits, quote upfront payments, or full checkout directly in the form or chatbot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <div>
                    <div className="text-xs font-bold">Stripe Payments &amp; Apple Pay</div>
                    <div className="text-[11px] text-muted-foreground">Credit Cards, Google Pay, Klarna</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  Ready
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                    P
                  </div>
                  <div>
                    <div className="text-xs font-bold">PayPal Smart Buttons</div>
                    <div className="text-[11px] text-muted-foreground">PayPal, Venmo, Pay in 4</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  Ready
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Instant Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="size-4 text-amber-600" /> Instant Alerts &amp; Confirmations
              </CardTitle>
              <CardDescription className="text-xs">
                Send automatic alerts via WhatsApp, SMS, and Email upon form or chat completion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <div className="text-xs font-semibold">Send WhatsApp Alert to Owner / Technician</div>
                  <div className="text-[11px] text-muted-foreground">Instant mobile notification when a high-value lead arrives.</div>
                </div>
                <Switch
                  checked={actions.additional?.sendWhatsAppOwner}
                  onCheckedChange={(val) => updateAdditional('sendWhatsAppOwner', val)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <div className="text-xs font-semibold">Send WhatsApp Confirmation to Customer</div>
                  <div className="text-[11px] text-muted-foreground">Sends personalized confirmation message with booking details.</div>
                </div>
                <Switch
                  checked={actions.additional?.sendWhatsAppUser}
                  onCheckedChange={(val) => updateAdditional('sendWhatsAppUser', val)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <div className="text-xs font-semibold">Send Email Confirmation Receipt</div>
                  <div className="text-[11px] text-muted-foreground">Sends HTML receipt and intake summary to the respondent.</div>
                </div>
                <Switch
                  checked={actions.additional?.sendEmail}
                  onCheckedChange={(val) => updateAdditional('sendEmail', val)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Webhooks */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Webhook className="size-4 text-rose-600" /> Outgoing Webhook Endpoint
              </CardTitle>
              <CardDescription className="text-xs">
                Forward all collected form answers and conversation logs to Zapier, Make, or custom server endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <div className="text-xs font-semibold">Enable Webhook Forwarding</div>
                  <div className="text-[11px] text-muted-foreground">HTTP POST JSON payload on each submission.</div>
                </div>
                <Switch
                  checked={actions.additional?.callWebhook}
                  onCheckedChange={(val) => updateAdditional('callWebhook', val)}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              {actions.additional?.callWebhook && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-semibold">Target Webhook URL</Label>
                  <Input
                    type="url"
                    value={actions.webhookUrl || ''}
                    onChange={(e) => updateActions({ webhookUrl: e.target.value })}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
