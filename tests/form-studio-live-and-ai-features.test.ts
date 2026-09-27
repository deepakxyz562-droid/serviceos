import { describe, it, expect } from 'vitest';
import { resolveFormLayout, layoutToRuntimeMode } from '@/lib/forms/resolve-form-layout';
import { normalizeFormSchema, DEFAULT_FORM_SCHEMA } from '@/lib/forms/form-schema-types';
import { buildApiPayload } from '@/features/forms/utils/form-helpers';
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
});
