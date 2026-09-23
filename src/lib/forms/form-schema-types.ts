/**
 * Form Schema Definition & Validation Types
 * ==========================================
 * Schema-driven, JSON-serializable definition for Fieseros AI Forms.
 * Compatible with Drag-and-Drop builder, AI generator, Chatbot, and Embeds.
 */

export type FormFieldType =
  | 'short_answer'
  | 'long_answer'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'numerical'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'address'
  | 'photo'
  | 'file'
  | 'signature'
  | 'rating'
  | 'heading'
  | 'paragraph'
  // ── Widget & payment extensions ──
  | 'control_widget'
  | 'currency'
  | 'calculated'
  | 'image_upload_with_notes'
  | 'route_planner'
  | 'nearest_location'
  | 'service_area'
  | 'payment_gateway'
  | 'sms_otp'
  | 'voice_recorder'
  | 'signature_pad'
  | 'form_calculation'
  | 'text_count'
  | 'line_button'
  | 'bsb_checker'
  | 'codice_fiscale'
  | 'turnstile'
  | 'france_region'
  | 'inventory_dropdown'
  | 'digital_magazine'
  | 'street_view'
  | 'most_frequent_answer';

export interface FieldOption {
  label: string;
  value: string;
  price?: number;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  name?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: FieldOption[];
  stepId?: string;
  width?: 'full' | 'half' | 'third' | 'quarter';
  layoutColumn?: 'left' | 'right';
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedExtensions?: string[];
  };
  // ─── Specialized Widget & Payment Extensions ─────────────────────────────
  widgetType?: string;
  widgetConfig?: Record<string, unknown>;
  customCss?: string;
  labelAlign?: 'top' | 'left' | 'right' | 'hidden';
  align?: 'left' | 'center' | 'right';
  widthPx?: number | string;
  heightPx?: number | string;
  borderRadius?: string;
  labelEnabled?: boolean;
  readOnly?: boolean;
  description?: string;
  // ─── P2: Elementor-style per-field styling ────────────────────────────────
  padding?: string;            // CSS padding, e.g. "12px 16px"
  fontSize?: string;           // CSS font-size, e.g. "15px" or "inherit"
  backgroundColor?: string;    // CSS color, e.g. "#f8fafc"
  borderStyle?: string;        // 'inherit' | 'none' | 'solid' | 'dashed' | 'dotted'
  borderColor?: string;        // CSS color
  textColor?: string;          // CSS color for input text
  inputHeight?: string;        // 'inherit' | 'compact' | 'medium' | 'large'
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
}

export interface ConditionalRule {
  id: string;
  sourceFieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  value?: string | number | boolean;
  action: 'show' | 'hide' | 'require' | 'skip_to_step';
  targetFieldId?: string;
  targetStepId?: string;
}

export interface FormMediaPanel {
  enabled: boolean;
  position?: 'left' | 'right' | 'top';
  splitRatio?: '50-50' | '40-60' | '60-40' | '35-65' | '30-70';
  mediaType: 'image' | 'video' | 'youtube' | 'vimeo' | 'map' | 'gradient' | 'testimonial';
  mediaUrl?: string;
  videoEmbedUrl?: string;
  videoAutoplay?: boolean;
  videoMuted?: boolean;
  videoLoop?: boolean;
  mapAddress?: string;
  mapEmbedUrl?: string;
  mapZoom?: number;
  mapServiceRadius?: string;
  gradientPreset?: 'cyber_emerald' | 'electric_indigo' | 'solar_amber' | 'rose_obsidian' | 'deep_space';
  aspectRatio?: 'cover' | '16-9' | '4-3' | '1-1' | 'auto';
  headline?: string;
  subtitle?: string;
  badgeText?: string;
  benefitsList?: string[];
  testimonial?: {
    quote: string;
    author: string;
    role?: string;
    avatarUrl?: string;
    rating?: number;
  };
  overlayColor?: string;
  overlayOpacity?: number; // 0 to 100
  mobileBehavior?: 'stack_top' | 'compact_banner' | 'hide';
  stepBehavior?: 'persistent' | 'per_step';
  // ─── Elementor Column Styling & Visibility ───
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  backgroundBlur?: 'none' | 'sm' | 'md' | 'lg' | string;
  customGradient?: string | null;
  padding?: 'compact' | 'normal' | 'spacious' | string;
  borderRadius?: string;
  showBadge?: boolean;
  showHeadline?: boolean;
  showSubtitle?: boolean;
  showMedia?: boolean;
  showBenefits?: boolean;
  showTestimonial?: boolean;
}

export interface FormTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string; // sm, md, lg, full, px values
  inputBorderRadius?: string; // 0px, 4px, 8px, 12px, 16px, 9999px
  inputHeight?: 'compact' | 'medium' | 'large' | string; // compact: 38px, medium: 44px, large: 50px
  inputBgColor?: string;
  inputBorderColor?: string;
  inputFocusColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  cardBackground?: string;
  fontFamily?: string;
  logoUrl?: string | null;
  showTopBorder?: boolean; // Accent top border/line
  layout?: 'classic' | 'card' | 'multi_step' | 'conversational' | 'split_media' | string;
  mediaPanel?: FormMediaPanel;
  // ─── 2026 Background & Backdrop Customization ───
  backgroundImageUrl?: string | null;
  backgroundOverlayOpacity?: number; // 0 to 100
  backgroundBlur?: 'none' | 'sm' | 'md' | 'lg' | string;
  backgroundGradient?: string | null;
  backgroundRepeat?: 'cover' | 'contain' | 'repeat' | 'fixed_cover';
}

export interface FormActionSettings {
  sendEmailNotification?: {
    enabled: boolean;
    toEmails: string[];
    subjectTemplate?: string;
  };
  sendCustomerAutoresponse?: {
    enabled: boolean;
    subject: string;
    messageBody: string;
  };
  createCrmLead?: {
    enabled: boolean;
    source?: string;
    pipelineStage?: string;
  };
  createCalendarBooking?: {
    enabled: boolean;
    serviceId?: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    secret?: string;
  };
}

export interface FormSchema {
  version: number;
  steps: FormStep[];
  fields: FormField[];
  rules: ConditionalRule[];
  theme: FormTheme;
  mediaPanel?: FormMediaPanel;
  settings: {
    submitButtonText: string;
    successTitle: string;
    successMessage: string;
    redirectUrl?: string;
    actions: FormActionSettings;
  };
}

export const DEFAULT_FORM_THEME: FormTheme = {
  primaryColor: '#059669', // Emerald
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  borderRadius: '16px',
  inputBorderRadius: '12px',
  inputHeight: 'medium',
  buttonColor: '#059669',
  buttonTextColor: '#ffffff',
  showTopBorder: false,
  layout: 'card',
};

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  version: 1,
  steps: [
    {
      id: 'step_1',
      title: 'General Information',
      description: 'Please provide your details below',
    },
  ],
  fields: [
    {
      id: 'field_name',
      type: 'short_answer',
      label: 'Full Name',
      placeholder: 'John Doe',
      required: true,
      stepId: 'step_1',
      width: 'half',
    },
    {
      id: 'field_email',
      type: 'email',
      label: 'Email Address',
      placeholder: 'john@example.com',
      required: true,
      stepId: 'step_1',
      width: 'half',
    },
    {
      id: 'field_phone',
      type: 'phone',
      label: 'Phone Number',
      placeholder: '+1 (555) 000-0000',
      required: true,
      stepId: 'step_1',
      width: 'full',
    },
    {
      id: 'field_message',
      type: 'long_answer',
      label: 'How can we help you?',
      placeholder: 'Describe your request...',
      required: false,
      stepId: 'step_1',
      width: 'full',
    },
  ],
  rules: [],
  theme: DEFAULT_FORM_THEME,
  settings: {
    submitButtonText: 'Submit Request',
    successTitle: 'Thank you!',
    successMessage: 'We have received your submission and will get back to you shortly.',
    actions: {
      sendEmailNotification: {
        enabled: true,
        toEmails: [],
      },
      createCrmLead: {
        enabled: true,
      },
    },
  },
};

/**
 * Normalizes and validates incoming JSON into a valid FormSchema.
 * Accepts an optional fallbackFields array so forms without schemaJson
 * reconstruct their real schema from fieldsJson rather than dummy defaults.
 */
export function normalizeFormSchema(raw: unknown, fallbackFields?: any[]): FormSchema {
  const fallbackList: FormField[] = Array.isArray(fallbackFields) && fallbackFields.length > 0
    ? fallbackFields.map((f, idx) => ({
        id: f.id || `f_${idx + 1}`,
        label: f.label || `Field ${idx + 1}`,
        type: f.type || 'short_answer',
        placeholder: f.placeholder,
        helpText: f.helpText || f.description,
        required: !!f.required,
        stepId: f.stepId || 'step_1',
        width: f.width || 'full',
        widgetType: f.widgetType,
        widgetConfig: f.widgetConfig,
        options: f.options,
        borderRadius: f.borderRadius,
        inputHeight: f.inputHeight,
      }))
    : [];

  if (!raw || typeof raw !== 'object') {
    if (fallbackList.length > 0) {
      return {
        ...DEFAULT_FORM_SCHEMA,
        fields: fallbackList,
      };
    }
    return DEFAULT_FORM_SCHEMA;
  }
  const s = raw as Partial<FormSchema> & { steps?: Array<FormStep & { fields?: FormField[] }> };
  
  const steps: FormStep[] = Array.isArray(s.steps) && s.steps.length > 0
    ? s.steps.map((st, idx) => ({
        id: st.id || `step_${idx + 1}`,
        title: st.title || `Step ${idx + 1}`,
        description: st.description,
      }))
    : DEFAULT_FORM_SCHEMA.steps;

  const validStepIds = new Set(steps.map((st) => st.id));
  const defaultStepId = steps[0]?.id || 'step_1';

  // Extract fields from steps if top-level fields not provided
  let resolvedFields: FormField[] = Array.isArray(s.fields) && s.fields.length > 0 ? s.fields : [];
  if (resolvedFields.length === 0 && Array.isArray(s.steps)) {
    for (const step of s.steps) {
      if (Array.isArray(step.fields)) {
        for (const field of step.fields) {
          resolvedFields.push({ ...field, stepId: field.stepId || step.id });
        }
      }
    }
  }
  if (resolvedFields.length === 0) {
    resolvedFields = fallbackList.length > 0 ? fallbackList : DEFAULT_FORM_SCHEMA.fields;
  }

  // Ensure every field has a valid stepId so it is never dropped or filtered out.
  // Also normalize options: basic choice fields saved with `options: string[]`
  // must be converted to `[{label, value}]` so the runtime renderer can iterate
  // them correctly (otherwise `opt.value` and `opt.label` are both undefined
  // and the dropdown renders empty on the public form).
  const sanitizedFields = resolvedFields.map((f, idx) => {
    const stepId = f.stepId && validStepIds.has(f.stepId) ? f.stepId : defaultStepId;
    // Normalize options: string[] → {label, value}[]
    let normalizedOptions = f.options;
    if (Array.isArray(f.options) && f.options.length > 0 && typeof f.options[0] === 'string') {
      normalizedOptions = (f.options as string[]).map((opt) => ({ label: opt, value: opt }));
    }
    return {
      ...f,
      id: f.id || `f_${idx + 1}`,
      label: f.label || `Question ${idx + 1}`,
      type: f.type || 'short_answer',
      stepId,
      options: normalizedOptions,
    };
  });

  const isMultiStep = (s as any).isMultiStep !== undefined
    ? Boolean((s as any).isMultiStep)
    : steps.length > 1;

  return {
    version: s.version || 1,
    isMultiStep,
    steps,
    fields: sanitizedFields,
    rules: Array.isArray(s.rules) ? s.rules : [],
    theme: { ...DEFAULT_FORM_THEME, ...(s.theme || {}) },
    settings: {
      submitButtonText: s.settings?.submitButtonText || 'Submit',
      successTitle: s.settings?.successTitle || 'Thank you!',
      successMessage: s.settings?.successMessage || 'We have received your submission.',
      redirectUrl: s.settings?.redirectUrl,
      actions: {
        sendEmailNotification: {
          enabled: s.settings?.actions?.sendEmailNotification?.enabled ?? true,
          toEmails: s.settings?.actions?.sendEmailNotification?.toEmails ?? [],
        },
        sendCustomerAutoresponse: {
          enabled: s.settings?.actions?.sendCustomerAutoresponse?.enabled ?? false,
          subject: s.settings?.actions?.sendCustomerAutoresponse?.subject ?? 'We received your request',
          messageBody: s.settings?.actions?.sendCustomerAutoresponse?.messageBody ?? 'Thank you for reaching out.',
        },
        createCrmLead: {
          enabled: s.settings?.actions?.createCrmLead?.enabled ?? true,
        },
        createCalendarBooking: {
          enabled: s.settings?.actions?.createCalendarBooking?.enabled ?? false,
        },
        webhook: {
          enabled: s.settings?.actions?.webhook?.enabled ?? false,
          url: s.settings?.actions?.webhook?.url ?? '',
        },
      },
    },
    mediaPanel: s.mediaPanel || s.theme?.mediaPanel,
  };
}
