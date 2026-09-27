import { describe, it, expect } from 'vitest';
import { resolveFormLayout, layoutToRuntimeMode } from '@/lib/forms/resolve-form-layout';
import { normalizeFormSchema, DEFAULT_FORM_SCHEMA } from '@/lib/forms/form-schema-types';
import { buildApiPayload, apiFormToFormItem } from '@/features/forms/utils/form-helpers';
import type { EditorFormData } from '@/features/forms/types';

describe('AI Form Builder Comprehensive Feature & Fidelity Verification', () => {
  const mockSplitFormData: EditorFormData = {
    id: 'form_split_pro_1',
    name: 'Rapid Roots Emergency Plumbing Request',
    description: 'Instant dispatch and flat-rate quote estimation',
    type: 'lead_capture',
    status: 'active',
    slug: 'rapid-roots-emergency-plumbing-request',
    fields: [
      {
        id: 'f_service',
        type: 'select',
        label: 'Select Plumbing Service',
        required: true,
        options: ['Drain Unblocking', 'Water Heater Repair', 'Leak Detection'],
        layoutColumn: 'right',
        stepId: 'step_1',
      },
      {
        id: 'f_photos',
        type: 'photo',
        widgetType: 'image_upload_with_notes',
        label: 'Photos of Issue with Notes',
        required: false,
        layoutColumn: 'right',
        stepId: 'step_2',
      },
      {
        id: 'f_name',
        type: 'text',
        label: 'Full Name',
        required: true,
        layoutColumn: 'right',
        stepId: 'step_3',
      },
    ],
    isMultiStep: true,
    steps: [
      { id: 'step_1', title: 'Service Details' },
      { id: 'step_2', title: 'Location & Photos' },
      { id: 'step_3', title: 'Contact Information' },
    ],
    theme: {
      primaryColor: '#059669',
      layout: 'split_media',
      mediaPanel: {
        enabled: true,
        position: 'left',
        splitRatio: '50-50',
        headline: 'Guaranteed 15-Minute Response',
        badgeText: '⭐ Licensed & Insured Master Plumber',
        benefitsList: ['No overtime charges', 'Upfront flat-rate pricing', '100% Satisfaction'],
      },
    },
    settings: {
      formLayout: 'split_media' as any,
    },
    agentConfig: {
      id: 'agent_custom_plumbing_1',
      name: 'Plumbing Assistant',
      prompt: 'Help customers triage water leaks and schedule appointments.',
    },
  };

  it('1. Save Payload: preserves split_media layout, agentConfig, and steps without dropping data', () => {
    const payload = buildApiPayload(mockSplitFormData);

    expect(payload.name).toBe('Rapid Roots Emergency Plumbing Request');
    expect(payload.slug).toBe('rapid-roots-emergency-plumbing-request');

    const parsedSchema = JSON.parse(payload.schemaJson);
    expect(parsedSchema.isMultiStep).toBe(true);
    expect(parsedSchema.steps).toHaveLength(3);
    expect(parsedSchema.steps[0].title).toBe('Service Details');
    expect(parsedSchema.theme.layout).toBe('split_media');
    expect(parsedSchema.mediaPanel.enabled).toBe(true);
    expect(parsedSchema.mediaPanel.headline).toBe('Guaranteed 15-Minute Response');

    // agentConfig must be preserved (not stripped)
    expect(parsedSchema.agentConfig).toBeDefined();
    expect(parsedSchema.agentConfig.id).toBe('agent_custom_plumbing_1');
    expect(parsedSchema.agentConfig.name).toBe('Plumbing Assistant');
  });

  it('2. Layout Resolution: resolveFormLayout consistently detects split_media, card, and classic across live & editor', () => {
    // Split layout
    const splitLayout = resolveFormLayout({
      theme: { layout: 'split_media' },
      fields: [{ layoutColumn: 'right' }],
    });
    expect(splitLayout).toBe('split_media');
    expect(layoutToRuntimeMode(splitLayout)).toBe('paper');

    // Classic multi-step layout
    const classicLayout = resolveFormLayout({
      theme: { layout: 'classic' },
      fields: [{ layoutColumn: undefined }],
    });
    expect(classicLayout).toBe('classic');
    expect(layoutToRuntimeMode(classicLayout)).toBe('paper');

    // Card focus layout
    const cardLayout = resolveFormLayout({
      theme: { layout: 'card' },
      settings: { formLayout: 'single_question' },
    });
    expect(cardLayout).toBe('card');
    expect(layoutToRuntimeMode(cardLayout)).toBe('card');
  });

  it('3. Multi-Step Fidelity: normalizeFormSchema retains multi-step state and steps for classic forms', () => {
    const rawClassicMultiStep = {
      isMultiStep: true,
      steps: [
        { id: 'step_1', title: 'Patient Info' },
        { id: 'step_2', title: 'Medical History' },
      ],
      fields: [
        { id: 'f1', label: 'Name', type: 'text', stepId: 'step_1' },
        { id: 'f2', label: 'Allergies', type: 'textarea', stepId: 'step_2' },
      ],
      theme: { layout: 'classic' },
    };

    const normalized = normalizeFormSchema(rawClassicMultiStep);
    expect(normalized.isMultiStep).toBe(true);
    expect(normalized.steps).toHaveLength(2);
    expect(normalized.theme.layout).toBe('classic');
  });

  it('4. Slug Normalization: buildApiPayload correctly sanitizes special characters in slug and name', () => {
    const dataWithMessyName: EditorFormData = {
      ...mockSplitFormData,
      name: '  Emergency Plumbing & Rooter! (#1 in Austin)  ',
      slug: undefined,
    };

    const payload = buildApiPayload(dataWithMessyName);
    expect(payload.slug).toBe('emergency-plumbing-rooter-1-in-austin');
  });

  it('5. Multi-Step Preservation: does NOT wipe steps when isMultiStep is undefined in formData', () => {
    const multiStepData: EditorFormData = {
      name: 'Multi Step Intake',
      type: 'lead_capture',
      status: 'active',
      isMultiStep: undefined, // user did not explicitly toggle boolean
      steps: [
        { id: 'step_1', title: 'Step 1: Contact' },
        { id: 'step_2', title: 'Step 2: Service Details' },
      ],
      fields: [
        { id: 'f1', label: 'Name', type: 'short_answer', stepId: 'step_1' },
        { id: 'f2', label: 'Service Notes', type: 'long_answer', stepId: 'step_2' },
      ],
    };

    const payload = buildApiPayload(multiStepData);
    const parsedSchema = JSON.parse(payload.schemaJson);

    expect(parsedSchema.isMultiStep).toBe(true);
    expect(parsedSchema.steps).toHaveLength(2);
    expect(parsedSchema.steps[0].id).toBe('step_1');
    expect(parsedSchema.steps[1].id).toBe('step_2');
    expect(parsedSchema.fields[0].stepId).toBe('step_1');
    expect(parsedSchema.fields[1].stepId).toBe('step_2');
  });

  it('6. Agent Config: preserves agentConfig even when using default id "agent_default"', () => {
    const formWithDefaultAgent: EditorFormData = {
      name: 'Consultation Form',
      type: 'lead_capture',
      status: 'active',
      fields: [{ id: 'f1', label: 'Name', type: 'short_answer' }],
      agentConfig: {
        id: 'agent_default',
        name: 'AI Receptionist',
        voiceTone: 'friendly',
        welcomeGreeting: 'Hello! How can I assist you?',
      } as any,
    };

    const payload = buildApiPayload(formWithDefaultAgent);
    const parsedSchema = JSON.parse(payload.schemaJson);

    expect(parsedSchema.agentConfig).toBeDefined();
    expect(parsedSchema.agentConfig.id).toBe('agent_default');
    expect(parsedSchema.agentConfig.name).toBe('AI Receptionist');
    expect(parsedSchema.agentConfig.welcomeGreeting).toBe('Hello! How can I assist you?');
  });

  it('7. Widget Preservation: retains decorative and layout widgets without label in fieldsJson and schemaJson', () => {
    const formWithContentWidgets: EditorFormData = {
      name: 'Interactive Quote',
      type: 'quote_request',
      status: 'active',
      fields: [
        { id: 'h1', type: 'heading' as any, label: '', placeholder: 'Service Options' },
        { id: 'd1', type: 'divider' as any, label: '' },
        { id: 'f1', type: 'short_answer', label: 'Your Name' },
      ],
    };

    const payload = buildApiPayload(formWithContentWidgets);
    const parsedFieldsJson = JSON.parse(payload.fieldsJson);
    const parsedSchema = JSON.parse(payload.schemaJson);

    // fieldsJson contains the 3 authorable fields + 1 embedded schema metadata item
    expect(parsedFieldsJson).toHaveLength(4);
    expect(parsedSchema.fields).toHaveLength(3);
    expect(parsedFieldsJson[0].id).toBe('h1');
    expect(parsedFieldsJson[1].id).toBe('d1');

    // Embedded metadata is present
    const metaItem = parsedFieldsJson.find((f: any) => f.id === '__form_schema__');
    expect(metaItem).toBeDefined();
    expect(metaItem.widgetType).toBe('schema_metadata');
  });

  it('8. Dual-Channel Hydration: apiFormToFormItem unpacks full schema and filters metadata when schemaJson is null in DB', () => {
    // Simulating database row without schemaJson column (self-hosted Supabase)
    const mockDbRowWithoutSchemaJson: any = {
      id: '-TgcaQMDGeBXqTIKJcDcwn89u',
      name: 'E2E Verification Form',
      description: 'Production lead capture',
      type: 'lead_capture',
      status: 'active',
      schemaJson: null, // DB table lacks schemaJson column
      fieldsJson: JSON.stringify([
        { id: 'f1', label: 'Full Name', type: 'short_answer', stepId: 'step_1' },
        { id: 'f2', label: 'Phone', type: 'phone', stepId: 'step_2' },
        {
          id: '__form_schema__',
          widgetType: 'schema_metadata',
          hidden: true,
          schema: {
            isMultiStep: true,
            steps: [
              { id: 'step_1', title: 'Contact' },
              { id: 'step_2', title: 'Phone Verification' },
            ],
            fields: [
              { id: 'f1', label: 'Full Name', type: 'short_answer', stepId: 'step_1' },
              { id: 'f2', label: 'Phone', type: 'phone', stepId: 'step_2' },
            ],
            theme: {
              layout: 'split_media',
              primaryColor: '#059669',
              mediaPanel: {
                enabled: true,
                headline: 'Professional Service Inquiries',
              },
            },
          },
        },
      ]),
    };

    const formItem = apiFormToFormItem(mockDbRowWithoutSchemaJson);

    // Metadata is filtered out from user fields
    expect(formItem.fields).toHaveLength(2);
    expect(formItem.fields.some((f) => f.id === '__form_schema__')).toBe(false);

    // Schema properties are fully hydrated from embedded metadata
    expect(formItem.isMultiStep).toBe(true);
    expect(formItem.steps).toHaveLength(2);
    expect(formItem.steps?.[0].title).toBe('Contact');
    expect(formItem.steps?.[1].title).toBe('Phone Verification');
    expect(formItem.theme?.layout).toBe('split_media');
    expect(formItem.mediaPanel?.headline).toBe('Professional Service Inquiries');
  });

  it('9. Public Form Schema Extraction: normalizeFormSchema extracts embedded __form_schema__ when raw is null', () => {
    const rawFallbackFields = [
      { id: 'f1', label: 'Full Name', type: 'short_answer', stepId: 'step_1' },
      {
        id: '__form_schema__',
        widgetType: 'schema_metadata',
        hidden: true,
        schema: {
          isMultiStep: true,
          steps: [
            { id: 'step_1', title: 'Step 1' },
            { id: 'step_2', title: 'Step 2' },
          ],
          fields: [{ id: 'f1', label: 'Full Name', type: 'short_answer', stepId: 'step_1' }],
          theme: { layout: 'split_media' },
        },
      },
    ];

    const normalized = normalizeFormSchema(null, rawFallbackFields);

    expect(normalized.isMultiStep).toBe(true);
    expect(normalized.steps).toHaveLength(2);
    expect(normalized.theme.layout).toBe('split_media');
    expect(normalized.fields).toHaveLength(1);
    expect(normalized.fields[0].id).toBe('f1');
  });

  it('10. Legacy Form Step Inference: infers multi-step and split layout when only raw fields exist', () => {
    const rawFieldsWithoutMeta = [
      { id: 'f1', label: 'Full Name', type: 'text', stepId: 'step_1', layoutColumn: 'right' },
      { id: 'f2', label: 'Address', type: 'text', stepId: 'step_2', layoutColumn: 'right' },
      { id: 'f3', label: 'Service Notes', type: 'textarea', stepId: 'step_3', layoutColumn: 'right' },
    ];

    const normalized = normalizeFormSchema(null, rawFieldsWithoutMeta);

    expect(normalized.isMultiStep).toBe(true);
    expect(normalized.steps).toHaveLength(3);
    expect(normalized.theme.layout).toBe('split_media');
    expect(normalized.fields).toHaveLength(3);
  });
});
