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
  let fields: FormField[] = [];
  let parsedSchema: any = null;
  if (api.schemaJson) {
    try {
      parsedSchema = typeof api.schemaJson === 'string' ? JSON.parse(api.schemaJson) : api.schemaJson;
    } catch {}
  }

  if (Array.isArray((api as any).fields)) {
    fields = (api as any).fields;
  } else if (parsedSchema && Array.isArray(parsedSchema.fields) && parsedSchema.fields.length > 0) {
    fields = parsedSchema.fields;
  } else if (api.fieldsJson) {
    const rawFields = safeJsonParse<any>(api.fieldsJson, []);
    fields = Array.isArray(rawFields) ? rawFields : [];
  }

  const rawActions = safeJsonParse<Partial<SubmissionActions>>(
    api.submissionActions,
    {},
  );

  let mappings: CRMFieldMapping[] = [];
  if (Array.isArray((api as any).fieldMappings)) {
    mappings = (api as any).fieldMappings;
  } else if (api.fieldMappingJson) {
    const rawMappings = safeJsonParse<any>(api.fieldMappingJson, []);
    if (Array.isArray(rawMappings)) {
      mappings = rawMappings.filter(Boolean);
    } else if (rawMappings && typeof rawMappings === 'object') {
      mappings = Object.entries(rawMappings).map(([formFieldId, crmField]) => ({
        formFieldId,
        crmField: String(crmField),
      }));
    }
  }

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
      primary: rawActions?.primary || 'store_only',
      additional: {
        sendWhatsAppOwner: rawActions?.additional?.sendWhatsAppOwner ?? false,
        sendWhatsAppUser: rawActions?.additional?.sendWhatsAppUser ?? false,
        sendEmail: rawActions?.additional?.sendEmail ?? false,
        addToCampaign: rawActions?.additional?.addToCampaign ?? false,
        notifySalesTeam: rawActions?.additional?.notifySalesTeam ?? false,
        callWebhook: rawActions?.additional?.callWebhook ?? false,
      },
      whatsappOwnerTemplate:
        api.whatsappOwnerTemplate || rawActions?.whatsappOwnerTemplate || '',
      whatsappUserTemplate:
        api.whatsappUserTemplate || rawActions?.whatsappUserTemplate || '',
      aiGenerateUserMessage:
        api.whatsappAiGenerated ?? rawActions?.aiGenerateUserMessage ?? false,
      webhookUrl: rawActions?.webhookUrl || '',
    };
  }

  return {
    id: api.id,
    name: api.name || '',
    description: api.description || undefined,
    type: (api.type as FormType) || 'lead_capture',
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
    completionMessage: api.completionMessage || parsedSchema?.settings?.successMessage || '',
    whatsappOwnerTemplate: api.whatsappOwnerTemplate || '',
    whatsappUserTemplate: api.whatsappUserTemplate || '',
    aiGenerateUserMessage: api.whatsappAiGenerated || false,
    slug: api.slug || undefined,
    submissions: api.submissions ?? api.responseCount ?? 0,
    conversionRate: api.conversionRate ?? 0,
    createdAt: api.createdAt
      ? new Date(api.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    theme: parsedSchema?.theme,
    mediaPanel: parsedSchema?.mediaPanel || parsedSchema?.theme?.mediaPanel,
    isMultiStep: parsedSchema?.isMultiStep,
    steps: parsedSchema?.steps,
    rules: parsedSchema?.rules || [],
    settings: parsedSchema?.settings,
    primaryColor: parsedSchema?.theme?.primaryColor,
    submitButtonText: parsedSchema?.settings?.submitButtonText,
    agentConfig: parsedSchema?.agentConfig,
  };
}

// Build the payload for POST/PUT /api/forms from the editor state.
export function buildApiPayload(formData: EditorFormData) {
  // Convert the modern SubmissionActions shape into the array format the API
  // route expects (matches the action switch in /api/forms/[id]/submit).
  const actionArray: string[] = [];
  const primary = formData.submissionActions?.primary || 'store_only';
  switch (primary) {
    case 'create_lead': actionArray.push('create_lead'); break;
    case 'create_customer': actionArray.push('create_customer'); break;
    case 'create_booking': actionArray.push('create_booking'); break;
    case 'create_job': actionArray.push('create_job'); break;
    case 'create_quote': actionArray.push('create_quote'); break;
    case 'trigger_workflow': actionArray.push('trigger_workflow'); break;
    case 'store_only': actionArray.push('store_response'); break;
    case 'custom_action': actionArray.push('store_response'); break;
  }
  const additional = formData.submissionActions?.additional || {};
  if (additional.sendWhatsAppOwner || additional.sendWhatsAppUser) {
    actionArray.push('send_whatsapp');
  }
  if (additional.sendEmail) actionArray.push('send_email');
  if (additional.callWebhook) actionArray.push('call_webhook');

  const safeFields = Array.isArray(formData.fields) ? formData.fields : [];
  const safeMappings = Array.isArray(formData.fieldMappings) ? formData.fieldMappings : [];
  const isMultiStep = formData.isMultiStep ?? false;

  const normalizedSteps = isMultiStep && formData.steps && formData.steps.length > 0
    ? formData.steps
    : [{ id: 'step_1', title: formData.name || 'Form Details' }];

  const validStepIds = new Set(normalizedSteps.map((s) => s.id));
  const defaultStepId = normalizedSteps[0]?.id || 'step_1';

  const preparedFields = safeFields.map((f, idx) => ({
    ...f,
    id: f.id || `f_${idx + 1}`,
    stepId: isMultiStep ? (f.stepId && validStepIds.has(f.stepId) ? f.stepId : defaultStepId) : defaultStepId,
    layoutColumn: f.layoutColumn,
    defaultValue: f.defaultValue,
  }));

  const rawMediaPanel = formData.mediaPanel || formData.theme?.mediaPanel;
  const isSplitMedia =
    formData.theme?.layout === 'split_media' ||
    formData.settings?.formLayout === 'split_media' ||
    Boolean(rawMediaPanel && rawMediaPanel.enabled !== false);

  const mediaPanel = isSplitMedia
    ? {
        enabled: true,
        position: rawMediaPanel?.position || 'left',
        splitRatio: rawMediaPanel?.splitRatio || '50-50',
        mediaType: rawMediaPanel?.mediaType || 'image',
        mediaUrl:
          rawMediaPanel?.mediaUrl ||
          rawMediaPanel?.backgroundImageUrl ||
          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
        headline: rawMediaPanel?.headline || formData.name || 'Fast & Reliable Professional Service',
        subtitle: rawMediaPanel?.subtitle || formData.description || 'Fill out the form below to receive upfront pricing.',
        badgeText: rawMediaPanel?.badgeText || '⭐ 5-Star Rated Service Pro',
        showBadge: rawMediaPanel?.showBadge ?? Boolean(rawMediaPanel?.badgeText),
        showHeadline: rawMediaPanel?.showHeadline ?? true,
        showSubtitle: rawMediaPanel?.showSubtitle ?? true,
        showMedia: rawMediaPanel?.showMedia ?? true,
        showBenefits: rawMediaPanel?.showBenefits ?? true,
        showTestimonial: rawMediaPanel?.showTestimonial ?? false,
        backgroundColor: rawMediaPanel?.backgroundColor || '#0f172a',
        backgroundImageUrl: rawMediaPanel?.backgroundImageUrl,
        overlayOpacity: rawMediaPanel?.overlayOpacity ?? 70,
        backgroundBlur: rawMediaPanel?.backgroundBlur,
        benefitsList: rawMediaPanel?.benefitsList || [
          'Guaranteed response within 15 minutes',
          'Licensed, insured & background-checked',
          '100% Price Match & Escrow Guarantee',
        ],
        testimonial: rawMediaPanel?.testimonial,
        mapAddress: rawMediaPanel?.mapAddress,
        mapZoom: rawMediaPanel?.mapZoom,
        mapServiceRadius: rawMediaPanel?.mapServiceRadius,
        videoEmbedUrl: rawMediaPanel?.videoEmbedUrl,
        videoAutoplay: rawMediaPanel?.videoAutoplay,
        videoLoop: rawMediaPanel?.videoLoop,
        videoMuted: rawMediaPanel?.videoMuted,
        mobileBehavior: rawMediaPanel?.mobileBehavior,
      }
    : rawMediaPanel;

  const isCard =
    formData.theme?.layout === 'card' ||
    formData.settings?.formLayout === 'single_question';

  const themeLayout: 'split_media' | 'card' | 'classic' = isSplitMedia
    ? 'split_media'
    : isCard
    ? 'card'
    : 'classic';

  const schemaObj = {
    version: 1,
    isMultiStep,
    steps: normalizedSteps,
    fields: preparedFields,
    theme: {
      primaryColor: formData.primaryColor || formData.theme?.primaryColor || '#059669',
      backgroundColor: formData.theme?.backgroundColor || '#ffffff',
      cardBackground: formData.theme?.cardBackground || '#ffffff',
      textColor: formData.theme?.textColor || '#0f172a',
      fontFamily: formData.theme?.fontFamily || 'Inter, sans-serif',
      borderRadius: typeof formData.borderRadius === 'number' ? `${formData.borderRadius}px` : formData.borderRadius || '16px',
      inputBorderRadius: formData.theme?.inputBorderRadius || '12px',
      inputHeight: formData.theme?.inputHeight || 'medium',
      buttonColor: formData.theme?.buttonColor || formData.primaryColor || '#059669',
      buttonTextColor: formData.theme?.buttonTextColor || '#ffffff',
      showTopBorder: formData.theme?.showTopBorder ?? false,
      layout: themeLayout,
      backgroundImageUrl: formData.theme?.backgroundImageUrl,
      backgroundOverlayOpacity: formData.theme?.backgroundOverlayOpacity,
      backgroundBlur: formData.theme?.backgroundBlur,
      mediaPanel,
    },
    mediaPanel,
    // Only persist agentConfig if the user has explicitly configured an agent.
    // We detect "explicitly configured" by checking that the agent ID is NOT
    // a placeholder (placeholders start with 'agent_form_' or 'agent_default').
    // This prevents the DEFAULT_FORM_AGENT from being auto-saved to every
    // form's schemaJson just because the user opened the AI Agent tab.
    ...(formData.agentConfig &&
      formData.agentConfig.id &&
      !formData.agentConfig.id.startsWith('agent_form_') &&
      !formData.agentConfig.id.startsWith('agent_default')
      ? { agentConfig: formData.agentConfig }
      : {}),
    rules: formData.rules || [],
    settings: {
      submitButtonText: formData.submitButtonText || 'Submit',
      successTitle: 'Thank you!',
      successMessage: formData.completionMessage || formData.successMessage || 'Your submission has been received.',
      actions: formData.submissionActions || {},
      ...(formData.settings || {}),
    },
  };

  return {
    name: formData.name,
    description: formData.description || null,
    type: formData.type,
    status: formData.status,
    fieldsJson: JSON.stringify(safeFields.filter((f) => f && f.label && f.label.trim())),
    schemaJson: JSON.stringify(schemaObj),
    submissionActions: JSON.stringify(actionArray),
    fieldMappingJson: JSON.stringify(safeMappings),
    welcomeMessage: formData.welcomeMessage || '',
    completionMessage: formData.completionMessage || '',
    whatsappOwnerTemplate: formData.submissionActions?.whatsappOwnerTemplate || '',
    whatsappUserTemplate: formData.submissionActions?.whatsappUserTemplate || '',
    whatsappAiGenerated: formData.submissionActions?.aiGenerateUserMessage || false,
  };
}

// ─── Small selectors (kept here for reuse) ──────────────────────────────────

/** Convenience: coerce an EngineFieldType to the union FieldType. */
export function asFieldType(type: EngineFieldType): FormField['type'] {
  return type as FormField['type'];
}
