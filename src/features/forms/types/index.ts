/**
 * Forms feature types — shared between form-builder-view.tsx and the extracted
 * forms feature components (FieldPalette, FieldEditorCard, FieldTypeConfig,
 * FieldConditionConfig, FieldCalculationConfig, FieldScoringConfig,
 * SubmissionFlowDiagram, QRCodePlaceholder, FormEditorDialog,
 * FormActionDialogs).
 *
 * Single source of truth for Form-Builder-related TypeScript types and the
 * field-type / form-type / action / CRM-field catalogs.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 *
 * USAGE:
 *   import type {
 *     FieldType, FormField, FormItem, FormResponse, FormType, FormStatus,
 *     PrimaryAction, CRMFieldMapping, SubmissionActions, ApiForm, EditorFormData,
 *   } from '@/features/forms/types';
 *   import {
 *     FIELD_TYPES, FORM_TYPES, PRIMARY_ACTIONS, CRM_FIELDS, VARIABLE_HINTS,
 *     PALETTE_CATEGORIES, PALETTE_ICON_MAP,
 *   } from '@/features/forms/types';
 */

import {
  AlignLeft, CalendarDays, Camera, CheckSquare, ChevronDown, CircleDot,
  Edit3, FileText, Gauge, Hash, LinkIcon, Mail, MapPin, Mic, Package,
  Paperclip, PenTool, Phone, QrCode, Scan, Sparkles, Star, Type, UserPlus,
  Users, Video, Workflow, Zap, Briefcase, EyeOff,
} from 'lucide-react';
import { FIELD_TYPES as ENGINE_FIELD_TYPES } from '@/lib/form-field-types';
import type {
  FieldCalculation, FieldCondition, FieldScoring, FieldConfig,
} from '@/lib/form-field-types';

// ─── Field type unions ──────────────────────────────────────────────────────

/** Legacy field types (preserved for backwards-compat with existing forms). */
export type LegacyFieldType =
  | 'text' | 'email' | 'phone' | 'number' | 'select' | 'checkbox'
  | 'date' | 'textarea' | 'radio' | 'file' | 'url' | 'rating' | 'scale'
  | 'hidden';

/** The 15 engine types from src/lib/form-field-types.ts. */
export type EngineFieldType = (typeof ENGINE_FIELD_TYPES)[number]['value'];

/** Union of legacy + engine types. */
export type FieldType = LegacyFieldType | EngineFieldType;

// ─── Core domain types ──────────────────────────────────────────────────────

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  // ─── New engine features (P5-forms) ──────────────────────────────────────
  description?: string;
  condition?: FieldCondition;
  calculation?: FieldCalculation;
  scoring?: FieldScoring;
  config?: FieldConfig;
}

export type FormType =
  | 'lead_capture' | 'booking' | 'feedback' | 'survey'
  | 'quote_request' | 'job_request' | 'custom';

export type FormStatus = 'active' | 'inactive' | 'archived';

export type PrimaryAction =
  | 'store_only' | 'create_lead' | 'create_customer' | 'create_booking'
  | 'create_job' | 'create_quote' | 'trigger_workflow' | 'custom_action';

export interface CRMFieldMapping {
  formFieldId: string;
  crmField: string;
}

export interface SubmissionActions {
  primary: PrimaryAction;
  additional: {
    sendWhatsAppOwner: boolean;
    sendWhatsAppUser: boolean;
    sendEmail: boolean;
    addToCampaign: boolean;
    notifySalesTeam: boolean;
    callWebhook: boolean;
  };
  whatsappOwnerTemplate: string;
  whatsappUserTemplate: string;
  aiGenerateUserMessage: boolean;
  webhookUrl: string;
}

export interface FormItem {
  id: string;
  name: string;
  description?: string;
  type: FormType;
  status: FormStatus;
  fields: FormField[];
  submissionActions: SubmissionActions;
  fieldMappings: CRMFieldMapping[];
  welcomeMessage: string;
  completionMessage: string;
  whatsappOwnerTemplate: string;
  whatsappUserTemplate: string;
  aiGenerateUserMessage: boolean;
  slug?: string;
  submissions: number;
  conversionRate: number;
  createdAt: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  respondentName?: string;
  respondentPhone?: string;
  data: Record<string, string>;
  submittedAt: string;
  source: string;
  leadId?: string;
  customerId?: string;
  jobId?: string;
  quoteId?: string;
  actionsResults: Record<string, string>;
}

/**
 * Editor form-state shape — used by the Create/Edit dialog and the parent
 * view's `formData` state.
 */
export interface EditorFormData {
  name: string;
  description: string;
  type: FormType;
  status: FormStatus;
  fields: FormField[];
  submissionActions: SubmissionActions;
  fieldMappings: CRMFieldMapping[];
  welcomeMessage: string;
  completionMessage: string;
}

/**
 * Raw shape returned by GET /api/forms before normalization to FormItem.
 * The DB stores fields/actions/mappings as JSON strings; the FormItem
 * interface uses parsed objects.
 */
export interface ApiForm {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  status: string;
  slug?: string | null;
  fieldsJson?: string;
  submissionActions?: string;
  fieldMappingJson?: string;
  welcomeMessage?: string;
  completionMessage?: string;
  whatsappOwnerTemplate?: string;
  whatsappUserTemplate?: string;
  whatsappAiGenerated?: boolean;
  submissions?: number;
  conversionRate?: number;
  createdAt?: string;
  responseCount?: number;
}

// ─── Catalogs (icons + labels) ──────────────────────────────────────────────

export const FIELD_TYPES: {
  value: FieldType;
  label: string;
  icon: React.ElementType;
  category: string;
}[] = [
  // ─── Legacy types (preserved) ──────────────────────────────────────────
  { value: 'text', label: 'Text', icon: Type, category: 'legacy' },
  { value: 'email', label: 'Email', icon: Mail, category: 'legacy' },
  { value: 'phone', label: 'Phone', icon: Phone, category: 'legacy' },
  { value: 'number', label: 'Number', icon: Hash, category: 'legacy' },
  { value: 'select', label: 'Select', icon: ChevronDown, category: 'legacy' },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, category: 'legacy' },
  { value: 'date', label: 'Date', icon: CalendarDays, category: 'legacy' },
  { value: 'textarea', label: 'Text Area', icon: AlignLeft, category: 'legacy' },
  { value: 'radio', label: 'Radio', icon: CircleDot, category: 'legacy' },
  { value: 'file', label: 'File Upload', icon: Paperclip, category: 'legacy' },
  { value: 'url', label: 'URL', icon: LinkIcon, category: 'legacy' },
  { value: 'rating', label: 'Rating', icon: Star, category: 'legacy' },
  { value: 'scale', label: 'Scale', icon: Gauge, category: 'legacy' },
  { value: 'hidden', label: 'Hidden', icon: EyeOff, category: 'legacy' },
  // ─── New engine types (P5-forms) — 'checkbox' already exists above so it's
  //     intentionally omitted here to avoid duplicate Select entries. ────────
  { value: 'short_answer', label: 'Short Answer', icon: Type, category: 'text' },
  { value: 'long_answer', label: 'Long Answer', icon: AlignLeft, category: 'text' },
  { value: 'dropdown', label: 'Dropdown', icon: ChevronDown, category: 'choice' },
  { value: 'numerical', label: 'Number (Engine)', icon: Hash, category: 'text' },
  { value: 'photo', label: 'Photo Upload', icon: Camera, category: 'media' },
  { value: 'video', label: 'Video Upload', icon: Video, category: 'media' },
  { value: 'gps', label: 'GPS Location', icon: MapPin, category: 'capture' },
  { value: 'signature', label: 'Signature', icon: PenTool, category: 'capture' },
  { value: 'barcode', label: 'Barcode Scan', icon: Scan, category: 'capture' },
  { value: 'qr_scan', label: 'QR Code Scan', icon: QrCode, category: 'capture' },
  { value: 'asset_selection', label: 'Asset Selection', icon: Package, category: 'reference' },
  { value: 'ai_image_analysis', label: 'AI Image Analysis', icon: Sparkles, category: 'ai' },
  { value: 'voice_note', label: 'Voice Note', icon: Mic, category: 'media' },
  { value: 'drawing_markup', label: 'Drawing Markup', icon: Edit3, category: 'capture' },
];

export const FORM_TYPES: { value: FormType; label: string; color: string }[] = [
  { value: 'lead_capture', label: 'Lead Capture', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'booking', label: 'Booking', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'feedback', label: 'Feedback', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'survey', label: 'Survey', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'quote_request', label: 'Quote Request', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'job_request', label: 'Job Request', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'custom', label: 'Custom', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const PRIMARY_ACTIONS: {
  value: PrimaryAction;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { value: 'store_only', label: 'Store Response Only', icon: FileText, description: 'Just save the form data' },
  { value: 'create_lead', label: 'Create Lead', icon: UserPlus, description: 'Auto-create a new lead in CRM' },
  { value: 'create_customer', label: 'Create Customer', icon: Users, description: 'Auto-create a customer record' },
  { value: 'create_booking', label: 'Create Booking', icon: CalendarDays, description: 'Create a service booking' },
  { value: 'create_job', label: 'Create Job', icon: Briefcase, description: 'Create a dispatchable job' },
  { value: 'create_quote', label: 'Create Quote', icon: FileText, description: 'Generate a quote from data' },
  { value: 'trigger_workflow', label: 'Trigger Workflow', icon: Workflow, description: 'Start an automation workflow' },
  { value: 'custom_action', label: 'Custom Action', icon: Zap, description: 'Run a custom integration' },
];

export const CRM_FIELDS = [
  { group: 'Lead', fields: ['Lead.Name', 'Lead.Phone', 'Lead.Email', 'Lead.Address', 'Lead.ServiceType', 'Lead.Description', 'Lead.Source'] },
  { group: 'Customer', fields: ['Customer.Name', 'Customer.Phone', 'Customer.Email', 'Customer.Address'] },
  { group: 'Job', fields: ['Job.Title', 'Job.Address', 'Job.ScheduledAt', 'Job.ServiceType'] },
  { group: 'Quote', fields: ['Quote.Title'] },
];

export const VARIABLE_HINTS = '{{name}}, {{phone}}, {{service}}, {{message}}, {{email}}, {{date}}';

// ─── Engine field palette metadata ──────────────────────────────────────────

export const PALETTE_CATEGORIES: { id: string; label: string; types: EngineFieldType[] }[] = [
  { id: 'text', label: 'Text & Numbers', types: ['short_answer', 'long_answer', 'numerical'] },
  { id: 'choice', label: 'Choice', types: ['dropdown', 'checkbox'] },
  { id: 'media', label: 'Media', types: ['photo', 'video', 'voice_note'] },
  { id: 'capture', label: 'Capture', types: ['gps', 'signature', 'barcode', 'qr_scan', 'drawing_markup'] },
  { id: 'reference', label: 'Reference', types: ['asset_selection'] },
  { id: 'ai', label: 'AI', types: ['ai_image_analysis'] },
];

export const PALETTE_ICON_MAP: Record<string, React.ElementType> = {
  short_answer: Type,
  long_answer: AlignLeft,
  numerical: Hash,
  dropdown: ChevronDown,
  checkbox: CheckSquare,
  photo: Camera,
  video: Video,
  voice_note: Mic,
  gps: MapPin,
  signature: PenTool,
  barcode: Scan,
  qr_scan: QrCode,
  drawing_markup: Edit3,
  asset_selection: Package,
  ai_image_analysis: Sparkles,
};
