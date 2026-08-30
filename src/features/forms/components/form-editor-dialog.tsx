'use client';

/**
 * FormEditorDialog — the 605-line Create / Edit Form dialog with 6 tabs
 * (details / fields / actions / mapping / whatsapp / embed).
 *
 * The parent view (form-builder-view.tsx) owns the editor state (`formData`,
 * `activeTab`, `editMode`, `saving`, and the AI Generate sub-dialog state).
 * This dialog is pure presentational — all mutations live in the parent and
 * are passed as callbacks.
 *
 * The AI Generate sub-dialog is rendered here because it is nested inside the
 * Create dialog and must coordinate focus-restore behaviour with the parent's
 * `onOpenChange` guard.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 */

import {
  AlertCircle, ArrowRight, Copy, FileInput, Globe, Loader2, Mail,
  MessageCircle, Plus, Sparkles, Target, Users, Workflow, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CRM_FIELDS, FIELD_TYPES, FORM_TYPES, PRIMARY_ACTIONS, VARIABLE_HINTS,
} from '@/features/forms/types';
import type {
  EditorFormData, EngineFieldType, FormField, FormStatus,
  FormType, PrimaryAction,
} from '@/features/forms/types';
import { getDefaultActions, getDefaultMappings } from '@/features/forms/utils/form-helpers';
import {
  FieldEditorCard, FieldPalette, QRCodePlaceholder, SubmissionFlowDiagram,
} from '@/features/forms/components/field-editor';

// ─── Helpers (local to this dialog) ─────────────────────────────────────────

function previewSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function buildFormLink(siteOrigin: string, slug: string): string {
  return `${siteOrigin}/f/${slug}`;
}

function buildEmbedScript(siteOrigin: string, formId: string): string {
  return `<script src="${siteOrigin}/embed.js" data-form-id="${formId}" data-tenant="default"></script>`;
}

function buildEmbedIframe(siteOrigin: string, slug: string): string {
  return `<iframe src="${buildFormLink(siteOrigin, slug)}" width="100%" height="600" frameborder="0" style="border-radius:8px;"></iframe>`;
}

function handleCopy(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} copied to clipboard`))
    .catch(() => toast.error('Failed to copy'));
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface FormEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  editMode: boolean;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  // Field operations
  onAddField: () => void;
  onRemoveField: (id: string) => void;
  onUpdateField: (
    id: string,
    key: keyof FormField,
    value:
      | string
      | boolean
      | string[]
      | FormField['condition']
      | FormField['calculation']
      | FormField['scoring']
      | FormField['config']
      | undefined,
  ) => void;
  onAddEngineField: (type: EngineFieldType) => void;
  onMoveField: (index: number, direction: 'up' | 'down') => void;
  // AI Generate sub-dialog
  aiDialogOpen: boolean;
  onAiDialogOpenChange: (open: boolean) => void;
  onOpenAiDialog: () => void;
  aiPrompt: string;
  onAiPromptChange: (prompt: string) => void;
  aiGeneratedFields: FormField[] | null;
  aiLoading: boolean;
  aiError: string | null;
  onAiGenerate: () => void;
  onAiInsert: () => void;
  // Embed helpers
  siteOrigin: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FormEditorDialog(props: FormEditorDialogProps) {
  const {
    open,
    onOpenChange,
    formData,
    onFormDataChange,
    editMode,
    activeTab,
    onActiveTabChange,
    saving,
    onSave,
    onCancel,
    onAddField,
    onRemoveField,
    onUpdateField,
    onAddEngineField,
    onMoveField,
    aiDialogOpen,
    onAiDialogOpenChange,
    onOpenAiDialog,
    aiPrompt,
    onAiPromptChange,
    aiGeneratedFields,
    aiLoading,
    aiError,
    onAiGenerate,
    onAiInsert,
    siteOrigin,
  } = props;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          // Guard: if the AI dialog is currently open, don't close the Create
          // dialog — the close event is likely a Radix nested-dialog
          // focus-restore side-effect, not a genuine user dismissal.
          if (!nextOpen && aiDialogOpen) return;
          if (!nextOpen) onCancel();
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editMode ? 'Edit Form' : 'Create Form'}</DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Update form settings and fields'
                : 'Build a form with submission actions that drive your business'}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={onActiveTabChange}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start h-9 bg-transparent p-0 gap-0">
                <TabsTrigger value="details" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Details</TabsTrigger>
                <TabsTrigger value="fields" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Fields</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Actions ⚡</TabsTrigger>
                <TabsTrigger value="mapping" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Field Mapping</TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">WhatsApp</TabsTrigger>
                <TabsTrigger value="embed" className="text-xs px-3 py-1.5 rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:shadow-none">Embed</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6">
              {/* ─── Details Tab ──────────────────────────────────────────── */}
              <TabsContent value="details" className="mt-4 space-y-4 pb-6">
                <div className="space-y-2">
                  <Label>Form Name *</Label>
                  <Input
                    placeholder="e.g., Lead Capture Form"
                    value={formData.name}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of this form"
                    value={formData.description}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Form Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => {
                        const t = v as FormType;
                        onFormDataChange((prev) => ({
                          ...prev,
                          type: t,
                          submissionActions: getDefaultActions(t),
                        }));
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) =>
                        onFormDataChange((prev) => ({ ...prev, status: v as FormStatus }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Welcome Message</Label>
                  <Textarea
                    placeholder="Message shown when form opens"
                    value={formData.welcomeMessage}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Completion Message</Label>
                  <Textarea
                    placeholder="Message shown after submission"
                    value={formData.completionMessage}
                    onChange={(e) => onFormDataChange((prev) => ({ ...prev, completionMessage: e.target.value }))}
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* ─── Fields Tab ──────────────────────────────────────────── */}
              <TabsContent value="fields" className="mt-4 space-y-3 pb-6">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Form Fields</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={onOpenAiDialog}
                    >
                      <Sparkles className="size-3 mr-1" /> AI Generate
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddField}>
                      <Plus className="size-3 mr-1" /> Add Blank Field
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add fields from the palette below, or click &ldquo;Add Blank Field&rdquo; for a legacy text field.
                  Use the grip handle to reorder, the gear icon to configure advanced logic.
                </p>

                {/* ─── Engine field palette ───────────────────────────────── */}
                <FieldPalette onAdd={onAddEngineField} />

                {formData.fields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <FileInput className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No fields yet. Pick a field type from the palette above.</p>
                  </div>
                )}

                {formData.fields.map((field, idx) => (
                  <FieldEditorCard
                    key={field.id}
                    field={field}
                    index={idx}
                    total={formData.fields.length}
                    allFields={formData.fields}
                    onMove={onMoveField}
                    onChange={(key, value) => onUpdateField(field.id, key, value)}
                    onRemove={() => onRemoveField(field.id)}
                  />
                ))}
              </TabsContent>

              {/* ─── Submission Actions Tab ───────────────────────────────── */}
              <TabsContent value="actions" className="mt-4 space-y-4 pb-6">
                {/* Key Feature Banner */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="size-4 text-emerald-600" />
                    <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Submission Actions</h4>
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    This is what makes Fieseros Forms different from Google Forms. When someone submits your form, automatically create leads, send WhatsApp messages, and trigger business processes.
                  </p>
                </div>

                {/* Flow Diagram */}
                <SubmissionFlowDiagram actions={formData.submissionActions} />

                <Separator />

                {/* Primary Action */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Primary Action</Label>
                  <p className="text-xs text-muted-foreground">What should happen when this form is submitted?</p>
                  <RadioGroup
                    value={formData.submissionActions.primary}
                    onValueChange={(v) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        submissionActions: {
                          ...prev.submissionActions,
                          primary: v as PrimaryAction,
                        },
                      }))
                    }
                    className="space-y-1.5"
                  >
                    {PRIMARY_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={action.value}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                            formData.submissionActions.primary === action.value
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                              : 'border-border hover:bg-muted/50',
                          )}
                        >
                          <RadioGroupItem value={action.value} id={`action-${action.value}`} />
                          <Icon
                            className={cn(
                              'size-4',
                              formData.submissionActions.primary === action.value
                                ? 'text-emerald-600'
                                : 'text-muted-foreground',
                            )}
                          />
                          <label htmlFor={`action-${action.value}`} className="flex-1 cursor-pointer">
                            <span className="text-sm font-medium">{action.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{action.description}</span>
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Additional Actions */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Additional Actions</Label>
                  <p className="text-xs text-muted-foreground">Chain additional actions after the primary action completes.</p>

                  <div className="space-y-2">
                    {/* Send WhatsApp to Owner */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="size-4 text-green-600" />
                          <Label className="text-sm cursor-pointer" htmlFor="wa-owner">Send WhatsApp to Owner</Label>
                        </div>
                        <Switch
                          id="wa-owner"
                          checked={formData.submissionActions.additional.sendWhatsAppOwner}
                          onCheckedChange={(v) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: {
                                ...prev.submissionActions,
                                additional: { ...prev.submissionActions.additional, sendWhatsAppOwner: v },
                              },
                            }))
                          }
                        />
                      </div>
                      {formData.submissionActions.additional.sendWhatsAppOwner && (
                        <Textarea
                          className="text-xs"
                          rows={3}
                          placeholder="Owner notification template..."
                          value={formData.submissionActions.whatsappOwnerTemplate}
                          onChange={(e) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: {
                                ...prev.submissionActions,
                                whatsappOwnerTemplate: e.target.value,
                              },
                            }))
                          }
                        />
                      )}
                      {formData.submissionActions.additional.sendWhatsAppOwner && (
                        <p className="text-[10px] text-muted-foreground">Variables: {VARIABLE_HINTS}</p>
                      )}
                    </div>

                    {/* Send WhatsApp to User */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="size-4 text-teal-600" />
                          <Label className="text-sm cursor-pointer" htmlFor="wa-user">Send WhatsApp to User</Label>
                        </div>
                        <Switch
                          id="wa-user"
                          checked={formData.submissionActions.additional.sendWhatsAppUser}
                          onCheckedChange={(v) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: {
                                ...prev.submissionActions,
                                additional: { ...prev.submissionActions.additional, sendWhatsAppUser: v },
                              },
                            }))
                          }
                        />
                      </div>
                      {formData.submissionActions.additional.sendWhatsAppUser && (
                        <>
                          <Textarea
                            className="text-xs"
                            rows={3}
                            placeholder="User confirmation template..."
                            value={formData.submissionActions.whatsappUserTemplate}
                            onChange={(e) =>
                              onFormDataChange((prev) => ({
                                ...prev,
                                submissionActions: {
                                  ...prev.submissionActions,
                                  whatsappUserTemplate: e.target.value,
                                },
                              }))
                            }
                          />
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-3.5 text-amber-500" />
                              <Label className="text-xs cursor-pointer" htmlFor="ai-generate">AI-Generate Confirmation</Label>
                            </div>
                            <Switch
                              id="ai-generate"
                              checked={formData.submissionActions.aiGenerateUserMessage}
                              onCheckedChange={(v) =>
                                onFormDataChange((prev) => ({
                                  ...prev,
                                  submissionActions: { ...prev.submissionActions, aiGenerateUserMessage: v },
                                }))
                              }
                            />
                          </div>
                          {formData.submissionActions.aiGenerateUserMessage && (
                            <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-1">
                              AI will personalize the confirmation message based on the form submission data. Your template above will be used as a fallback.
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">Variables: {VARIABLE_HINTS}</p>
                        </>
                      )}
                    </div>

                    {/* Send Email */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-blue-600" />
                        <Label className="text-sm cursor-pointer" htmlFor="send-email">Send Email Notification</Label>
                      </div>
                      <Switch
                        id="send-email"
                        checked={formData.submissionActions.additional.sendEmail}
                        onCheckedChange={(v) =>
                          onFormDataChange((prev) => ({
                            ...prev,
                            submissionActions: {
                              ...prev.submissionActions,
                              additional: { ...prev.submissionActions.additional, sendEmail: v },
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Add to Campaign */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Target className="size-4 text-orange-600" />
                        <Label className="text-sm cursor-pointer" htmlFor="add-campaign">Add to Campaign</Label>
                      </div>
                      <Switch
                        id="add-campaign"
                        checked={formData.submissionActions.additional.addToCampaign}
                        onCheckedChange={(v) =>
                          onFormDataChange((prev) => ({
                            ...prev,
                            submissionActions: {
                              ...prev.submissionActions,
                              additional: { ...prev.submissionActions.additional, addToCampaign: v },
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Notify Sales Team */}
                    <div className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-purple-600" />
                        <Label className="text-sm cursor-pointer" htmlFor="notify-sales">Notify Sales Team</Label>
                      </div>
                      <Switch
                        id="notify-sales"
                        checked={formData.submissionActions.additional.notifySalesTeam}
                        onCheckedChange={(v) =>
                          onFormDataChange((prev) => ({
                            ...prev,
                            submissionActions: {
                              ...prev.submissionActions,
                              additional: { ...prev.submissionActions.additional, notifySalesTeam: v },
                            },
                          }))
                        }
                      />
                    </div>

                    {/* Call Webhook */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="size-4 text-pink-600" />
                          <Label className="text-sm cursor-pointer" htmlFor="call-webhook">Call Webhook</Label>
                        </div>
                        <Switch
                          id="call-webhook"
                          checked={formData.submissionActions.additional.callWebhook}
                          onCheckedChange={(v) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: {
                                ...prev.submissionActions,
                                additional: { ...prev.submissionActions.additional, callWebhook: v },
                              },
                            }))
                          }
                        />
                      </div>
                      {formData.submissionActions.additional.callWebhook && (
                        <Input
                          className="text-xs"
                          placeholder="https://your-webhook-url.com/endpoint"
                          value={formData.submissionActions.webhookUrl}
                          onChange={(e) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: { ...prev.submissionActions, webhookUrl: e.target.value },
                            }))
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Field Mapping Tab ───────────────────────────────────── */}
              <TabsContent value="mapping" className="mt-4 space-y-3 pb-6">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Map your form fields to CRM fields so that data flows correctly into your leads, customers, and jobs when forms are submitted.
                  </p>
                </div>

                {formData.fields.filter((f) => f.label.trim()).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Workflow className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Add fields first, then map them to CRM fields.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.fields.filter((f) => f.label.trim()).map((field) => {
                      const currentMapping = formData.fieldMappings.find(
                        (m) => m.formFieldId === field.id,
                      );
                      return (
                        <div key={field.id} className="flex items-center gap-3 border rounded-lg p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{field.label}</span>
                              <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                                {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                              </Badge>
                              {field.required && (
                                <Badge variant="outline" className="text-[9px] h-4 bg-red-50 text-red-600 border-red-200">
                                  required
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                          <Select
                            value={currentMapping?.crmField || '__none__'}
                            onValueChange={(v) => {
                              if (v === '__none__') {
                                onFormDataChange((prev) => ({
                                  ...prev,
                                  fieldMappings: prev.fieldMappings.filter(
                                    (m) => m.formFieldId !== field.id,
                                  ),
                                }));
                              } else {
                                onFormDataChange((prev) => {
                                  const existing = prev.fieldMappings.findIndex(
                                    (m) => m.formFieldId === field.id,
                                  );
                                  const newMappings = [...prev.fieldMappings];
                                  if (existing >= 0) {
                                    newMappings[existing] = { ...newMappings[existing], crmField: v };
                                  } else {
                                    newMappings.push({ formFieldId: field.id, crmField: v });
                                  }
                                  return { ...prev, fieldMappings: newMappings };
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-44 shrink-0">
                              <SelectValue placeholder="Map to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— No Mapping —</SelectItem>
                              {CRM_FIELDS.map((group) => (
                                <SelectGroup key={group.group}>
                                  <SelectLabel className="text-[10px] font-semibold text-muted-foreground">
                                    {group.group}
                                  </SelectLabel>
                                  {group.fields.map((f) => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Auto-map button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const mappings = getDefaultMappings(formData.fields, formData.type);
                    onFormDataChange((prev) => ({ ...prev, fieldMappings: mappings }));
                    toast.success('Auto-mapped fields based on form type');
                  }}
                >
                  <Sparkles className="size-3 mr-1" /> Auto-Map Fields
                </Button>
              </TabsContent>

              {/* ─── WhatsApp Templates Tab ──────────────────────────────── */}
              <TabsContent value="whatsapp" className="mt-4 space-y-4 pb-6">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Customize WhatsApp templates for automated notifications. Use variables like {VARIABLE_HINTS} to personalize messages.
                  </p>
                </div>

                {/* Owner notification */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Owner Notification Template</Label>
                  <p className="text-xs text-muted-foreground">Sent to the business owner when a new submission is received</p>
                  <Textarea
                    rows={4}
                    placeholder="New submission received!&#10;Name: {{name}}&#10;Phone: {{phone}}&#10;Service: {{service}}"
                    value={formData.submissionActions.whatsappOwnerTemplate}
                    onChange={(e) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        submissionActions: { ...prev.submissionActions, whatsappOwnerTemplate: e.target.value },
                      }))
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">Available: {VARIABLE_HINTS}</p>
                </div>

                <Separator />

                {/* User confirmation */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">User Confirmation Template</Label>
                  <p className="text-xs text-muted-foreground">Sent to the person who submitted the form</p>
                  <Textarea
                    rows={4}
                    placeholder="Hi {{name}}! Thanks for reaching out about {{service}}.&#10;We'll get back to you shortly!"
                    value={formData.submissionActions.whatsappUserTemplate}
                    onChange={(e) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        submissionActions: { ...prev.submissionActions, whatsappUserTemplate: e.target.value },
                      }))
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">Available: {VARIABLE_HINTS}</p>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-amber-500" />
                    <div>
                      <Label className="text-sm cursor-pointer" htmlFor="ai-wa-toggle">AI-Generate User Confirmation</Label>
                      <p className="text-[10px] text-muted-foreground">Let AI create personalized confirmation messages based on submission data</p>
                    </div>
                  </div>
                  <Switch
                    id="ai-wa-toggle"
                    checked={formData.submissionActions.aiGenerateUserMessage}
                    onCheckedChange={(v) =>
                      onFormDataChange((prev) => ({
                        ...prev,
                        submissionActions: { ...prev.submissionActions, aiGenerateUserMessage: v },
                      }))
                    }
                  />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                  <div className="bg-[#ECE5DD] dark:bg-[#0B141A] rounded-lg p-3 max-w-xs">
                    <div className="bg-[#DCF8C6] dark:bg-[#005C4B] rounded-lg rounded-tl-none px-3 py-2 max-w-[90%]">
                      <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                        {formData.submissionActions.whatsappUserTemplate
                          ? formData.submissionActions.whatsappUserTemplate
                              .replace('{{name}}', 'John Doe')
                              .replace('{{phone}}', '+1 555-0123')
                              .replace('{{service}}', 'Deep Cleaning')
                              .replace('{{message}}', 'Need urgent cleaning')
                              .replace('{{email}}', 'john@email.com')
                              .replace('{{date}}', 'Mar 20, 2025')
                          : 'Your confirmation message will appear here...'}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[9px] text-gray-500">10:30 AM</span>
                        <span className="text-blue-500 text-[9px]">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Embed Tab ───────────────────────────────────────────── */}
              <TabsContent value="embed" className="mt-4 space-y-4 pb-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Embed your form on any website or share it via a direct link.
                  </p>
                </div>

                {/* Direct Link */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Direct Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      className="text-xs font-mono"
                      value={
                        formData.name
                          ? buildFormLink(siteOrigin, previewSlug(formData.name))
                          : 'Enter a form name first'
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() =>
                        handleCopy(
                          buildFormLink(siteOrigin, previewSlug(formData.name)),
                          'Direct link',
                        )
                      }
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Preview only — the actual link will use the unique slug generated when the form is saved. Open the share dialog from the form list to get the real link.
                  </p>
                </div>

                {/* Script Embed */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Script Embed</Label>
                  <p className="text-xs text-muted-foreground">Add this to your website&apos;s HTML body</p>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                    <code className="text-xs font-mono break-all">
                      {buildEmbedScript(siteOrigin, 'form-id')}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white"
                      onClick={() => handleCopy(buildEmbedScript(siteOrigin, 'form-id'), 'Script embed')}
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Iframe Embed */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Iframe Embed</Label>
                  <p className="text-xs text-muted-foreground">Embed as an iframe for simpler integration</p>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                    <code className="text-xs font-mono break-all">
                      {buildEmbedIframe(siteOrigin, previewSlug(formData.name || 'default'))}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white"
                      onClick={() =>
                        handleCopy(
                          buildEmbedIframe(siteOrigin, previewSlug(formData.name || 'default')),
                          'Iframe embed',
                        )
                      }
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">QR Code</Label>
                  <p className="text-xs text-muted-foreground">Scan to open the form on mobile</p>
                  <QRCodePlaceholder formId={formData.name || 'default'} />
                </div>
              </TabsContent>
            </ScrollArea>

            <DialogFooter className="px-6 py-3 border-t">
              <Button variant="outline" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={onSave}
                disabled={!formData.name.trim() || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {editMode ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  editMode ? 'Save Changes' : 'Create Form'
                )}
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ─── AI Generate Dialog (nested inside the Create Form dialog) ────
          - onInteractOutside / onPointerDownOutside preventDefault: stops
            outside-click events from propagating to the parent Create dialog's
            DismissableLayer (which would otherwise close the Create dialog).
          - The Create dialog's onOpenChange also guards against closing while
            this dialog is open (see aiDialogOpen guard on the Create Dialog).
      */}
      <Dialog open={aiDialogOpen} onOpenChange={onAiDialogOpenChange}>
        <DialogContent
          className="max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" /> AI Generate Fields
            </DialogTitle>
            <DialogDescription>
              Describe the fields you need and we&apos;ll draft them for you. Insert them into your form when ready.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              placeholder="e.g., Full name, email, phone, preferred date, service type, message"
              value={aiPrompt}
              onChange={(e) => onAiPromptChange(e.target.value)}
              rows={3}
              disabled={aiLoading}
            />

            {aiError && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            {aiGeneratedFields && aiGeneratedFields.length > 0 && (
              <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {aiGeneratedFields.map((f, i) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 p-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="shrink-0">{f.type}</Badge>
                      <span className="truncate font-medium">{f.label || `Field ${i + 1}`}</span>
                      {f.required && <span className="text-destructive">*</span>}
                    </div>
                    {f.options && f.options.length > 0 && (
                      <span className="text-muted-foreground shrink-0">{f.options.length} options</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onAiDialogOpenChange(false)} disabled={aiLoading}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={onAiGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
            >
              {aiLoading ? (
                <><Loader2 className="size-4 mr-1 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="size-4 mr-1" /> Generate</>
              )}
            </Button>
            <Button
              onClick={onAiInsert}
              disabled={aiLoading || !aiGeneratedFields || aiGeneratedFields.length === 0}
            >
              Insert{aiGeneratedFields && aiGeneratedFields.length > 0
                ? ` ${aiGeneratedFields.length} Field${aiGeneratedFields.length === 1 ? '' : 's'}`
                : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
