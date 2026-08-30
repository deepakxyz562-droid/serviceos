/**
 * Forms feature helpers — pure functions shared between form-builder-view.tsx
 * and the extracted forms feature components.
 *
 * Includes:
 *   - isEngineFieldType(): check whether a type is one of the 15 engine types.
 *   - getDefaultActions(): pick sensible SubmissionActions defaults per FormType.
 *   - getDefaultMappings(): best-effort auto-map fields → CRM fields by label.
 *   - apiFormToFormItem(): normalize the raw /api/forms row to FormItem.
 *   - buildApiPayload(): convert editor state to the POST/PUT /api/forms body.
 *   - safeJsonParse(): re-export of @/lib/json-parsers safeParseJson for
 *     backwards-compat with the original inline helper name.
 *
 * Extracted from src/components/views/form-builder-view.tsx in Phase 6A2.
 *
 * USAGE:
 *   import {
 *     isEngineFieldType, getDefaultActions, getDefaultMappings,
 *     apiFormToFormItem, buildApiPayload, safeJsonParse,
 *   } from '@/features/forms/utils/form-helpers';
 */

import { FIELD_TYPES as ENGINE_FIELD_TYPES } from '@/lib/form-field-types';
import { safeParseJson } from '@/lib/json-parsers';
import type {
  ApiForm, CRMFieldMapping, EditorFormData, EngineFieldType, FormField,
  FormItem, FormStatus, FormType, PrimaryAction, SubmissionActions,
} from '@/features/forms/types';

// ─── Engine-type guard ──────────────────────────────────────────────────────

// Set of the 15 engine field types from src/lib/form-field-types.ts.
// Used to decide whether to delegate rendering to the new FieldRenderer.
const ENGINE_TYPE_SET: ReadonlySet<string> = new Set(
  ENGINE_FIELD_TYPES.map((t) => t.value),
);

export function isEngineFieldType(type: string): boolean {
  return ENGINE_TYPE_SET.has(type);
}

// ─── Default actions / mappings ─────────────────────────────────────────────

export function getDefaultActions(type: FormType): SubmissionActions {
  const actionMap: Record<FormType, PrimaryAction> = {
    lead_capture: 'create_lead',
    booking: 'create_booking',
    feedback: 'store_only',
    survey: 'store_only',
    quote_request: 'create_quote',
    job_request: 'create_job',
    custom: 'store_only',
  };
  return {
    primary: actionMap[type],
    additional: {
      sendWhatsAppOwner:
        type === 'lead_capture' || type === 'booking' || type === 'quote_request',
      sendWhatsAppUser: type === 'booking',
      sendEmail: false,
      addToCampaign: false,
      notifySalesTeam: type === 'lead_capture',
      callWebhook: false,
    },
    whatsappOwnerTemplate:
      'New submission received!\nName: {{name}}\nPhone: {{phone}}\nService: {{service}}',
    whatsappUserTemplate:
      'Hi {{name}}! Thanks for your submission. We\'ll get back to you soon!',
    aiGenerateUserMessage: false,
    webhookUrl: '',
  };
}

export function getDefaultMappings(
  fields: FormField[],
  type: FormType,
): CRMFieldMapping[] {
  const mappings: CRMFieldMapping[] = [];
  const prefix =
    type === 'booking' ? 'Customer' : type === 'quote_request' ? 'Lead' : 'Lead';

  fields.forEach((f) => {
    const lbl = f.label.toLowerCase();
    if (lbl.includes('name') || lbl.includes('full name')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Name` });
    } else if (lbl.includes('phone')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Phone` });
    } else if (lbl.includes('email')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Email` });
    } else if (lbl.includes('address')) {
      mappings.push({ formFieldId: f.id, crmField: `${prefix}.Address` });
    } else if (lbl.includes('service')) {
      mappings.push({ formFieldId: f.id, crmField: 'Lead.ServiceType' });
    } else if (lbl.includes('description') || lbl.includes('message')) {
      mappings.push({ formFieldId: f.id, crmField: 'Lead.Description' });
    }
  });
  return mappings;
}

// ─── Backwards-compat alias ─────────────────────────────────────────────────
//
// The original view defined its own safeJsonParse; we re-export the shared
// safeParseJson from @/lib/json-parsers under the original name so existing
// call sites continue to work.
export const safeJsonParse = safeParseJson;

// ─── API ↔ FormItem transformation helpers ──────────────────────────────────

export function apiFormToFormItem(api: ApiForm): FormItem {
  const fields = safeJsonParse<FormField[]>(api.fieldsJson, []);
  const rawActions = safeJsonParse<Partial<SubmissionActions>>(
    api.submissionActions,
    {},
  );
  const mappings = safeJsonParse<CRMFieldMapping[]>(api.fieldMappingJson, []);

  // The DB submissionActions may be either:
  //  - the modern shape: { primary, additional, ... } (saved by this view)
  //  - a legacy array of action strings: ['create_lead', 'send_whatsapp', ...]
  //    (saved by the API route)
  // We normalize both to the SubmissionActions interface.
  let submissionActions: SubmissionActions;
  if (Array.isArray(rawActions as unknown)) {
    const arr = (rawActions as unknown) as string[];
    submissionActions = {
      primary:
        (arr.find((a) =>
          [
            'create_lead', 'create_customer', 'create_booking',
            'create_job', 'create_quote', 'trigger_workflow',
          ].includes(a),
        ) as PrimaryAction) || 'store_only',
      additional: {
        sendWhatsAppOwner: arr.includes('send_whatsapp'),
        sendWhatsAppUser: arr.includes('send_whatsapp'),
        sendEmail: arr.includes('send_email'),
        addToCampaign: false,
        notifySalesTeam: false,
        callWebhook: arr.includes('call_webhook'),
      },
      whatsappOwnerTemplate: api.whatsappOwnerTemplate || '',
      whatsappUserTemplate: api.whatsappUserTemplate || '',
      aiGenerateUserMessage: api.whatsappAiGenerated || false,
      webhookUrl: '',
    };
  } else {
    submissionActions = {
      primary: rawActions.primary || 'store_only',
      additional: {
        sendWhatsAppOwner: rawActions.additional?.sendWhatsAppOwner ?? false,
        sendWhatsAppUser: rawActions.additional?.sendWhatsAppUser ?? false,
        sendEmail: rawActions.additional?.sendEmail ?? false,
        addToCampaign: rawActions.additional?.addToCampaign ?? false,
        notifySalesTeam: rawActions.additional?.notifySalesTeam ?? false,
        callWebhook: rawActions.additional?.callWebhook ?? false,
      },
      whatsappOwnerTemplate:
        api.whatsappOwnerTemplate || rawActions.whatsappOwnerTemplate || '',
      whatsappUserTemplate:
        api.whatsappUserTemplate || rawActions.whatsappUserTemplate || '',
      aiGenerateUserMessage:
        api.whatsappAiGenerated ?? rawActions.aiGenerateUserMessage ?? false,
      webhookUrl: rawActions.webhookUrl || '',
    };
  }

  return {
    id: api.id,
    name: api.name,
    description: api.description || undefined,
    type: api.type as FormType,
    status:
      (api.status === 'active' ||
      api.status === 'inactive' ||
      api.status === 'archived'
        ? api.status
        : 'inactive') as FormStatus,
    fields,
    submissionActions,
    fieldMappings: mappings,
    welcomeMessage: api.welcomeMessage || '',
    completionMessage: api.completionMessage || '',
    whatsappOwnerTemplate: api.whatsappOwnerTemplate || '',
    whatsappUserTemplate: api.whatsappUserTemplate || '',
    aiGenerateUserMessage: api.whatsappAiGenerated || false,
    slug: api.slug || undefined,
    submissions: api.submissions ?? api.responseCount ?? 0,
    conversionRate: api.conversionRate ?? 0,
    createdAt: api.createdAt
      ? new Date(api.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

// Build the payload for POST/PUT /api/forms from the editor state.
export function buildApiPayload(formData: EditorFormData) {
  // Convert the modern SubmissionActions shape into the array format the API
  // route expects (matches the action switch in /api/forms/[id]/submit).
  const actionArray: string[] = [];
  switch (formData.submissionActions.primary) {
    case 'create_lead': actionArray.push('create_lead'); break;
    case 'create_customer': actionArray.push('create_customer'); break;
    case 'create_booking': actionArray.push('create_booking'); break;
    case 'create_job': actionArray.push('create_job'); break;
    case 'create_quote': actionArray.push('create_quote'); break;
    case 'trigger_workflow': actionArray.push('trigger_workflow'); break;
    case 'store_only': actionArray.push('store_response'); break;
    case 'custom_action': actionArray.push('store_response'); break;
  }
  if (
    formData.submissionActions.additional.sendWhatsAppOwner ||
    formData.submissionActions.additional.sendWhatsAppUser
  ) {
    actionArray.push('send_whatsapp');
  }
  if (formData.submissionActions.additional.sendEmail) actionArray.push('send_email');
  if (formData.submissionActions.additional.callWebhook) actionArray.push('call_webhook');

  return {
    name: formData.name,
    description: formData.description || null,
    type: formData.type,
    status: formData.status,
    fieldsJson: JSON.stringify(formData.fields.filter((f) => f.label.trim())),
    submissionActions: JSON.stringify(actionArray),
    fieldMappingJson: JSON.stringify(
      formData.fieldMappings
        .filter((m) => m.crmField)
        .reduce((acc, m) => {
          // Convert "Lead.Name" → { "Name": "Lead.Name" } style mapping (label-based)
          const parts = m.crmField.split('.');
          const key = parts[parts.length - 1];
          acc[key] = m.crmField;
          return acc;
        }, {} as Record<string, string>),
    ),
    welcomeMessage: formData.welcomeMessage,
    completionMessage: formData.completionMessage,
    whatsappOwnerTemplate: formData.submissionActions.whatsappOwnerTemplate,
    whatsappUserTemplate: formData.submissionActions.whatsappUserTemplate,
    whatsappAiGenerated: formData.submissionActions.aiGenerateUserMessage,
  };
}

// ─── Small selectors (kept here for reuse) ──────────────────────────────────

/** Convenience: coerce an EngineFieldType to the union FieldType. */
export function asFieldType(type: EngineFieldType): FormField['type'] {
  return type as FormField['type'];
}
