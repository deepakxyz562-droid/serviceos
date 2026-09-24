import { describe, it, expect } from 'vitest';
import { normalizeFormSchema, DEFAULT_FORM_SCHEMA } from '@/lib/forms/form-schema-types';

describe('Form Schema Alignment & Multi-step Normalization', () => {
  it('preserves isMultiStep: false for single page forms', () => {
    const rawSchema = {
      version: 1,
      isMultiStep: false,
      steps: [
        { id: 'step_1', title: 'Step 1' },
        { id: 'step_2', title: 'Step 2' },
      ],
      fields: [
        { id: 'f1', label: 'Field 1', type: 'short_answer' },
      ],
      theme: {
        layout: 'paper',
        primaryColor: '#059669',
      },
    };

    const normalized = normalizeFormSchema(rawSchema);
    expect(normalized.isMultiStep).toBe(false);
    expect(normalized.theme.layout).toBe('paper');
  });

  it('preserves isMultiStep: true and steps for multi-step forms', () => {
    const rawSchema = {
      version: 1,
      isMultiStep: true,
      steps: [
        { id: 'step_1', title: 'Step 1' },
        { id: 'step_2', title: 'Step 2' },
      ],
      fields: [
        { id: 'f1', label: 'Field 1', type: 'short_answer', stepId: 'step_1' },
        { id: 'f2', label: 'Field 2', type: 'short_answer', stepId: 'step_2' },
      ],
    };

    const normalized = normalizeFormSchema(rawSchema);
    expect(normalized.isMultiStep).toBe(true);
    expect(normalized.steps).toHaveLength(2);
  });

  it('preserves split_media and conversational theme layouts', () => {
    const splitSchema = {
      theme: {
        layout: 'split_media',
        primaryColor: '#2563eb',
        backgroundColor: '#0f172a',
      },
      mediaPanel: {
        enabled: true,
        mediaType: 'image',
        mediaUrl: 'https://example.com/hero.jpg',
      },
      fields: [{ id: 'f1', label: 'Name', type: 'short_answer' }],
    };

    const normalizedSplit = normalizeFormSchema(splitSchema);
    expect(normalizedSplit.theme.layout).toBe('split_media');
    expect(normalizedSplit.theme.primaryColor).toBe('#2563eb');
    expect(normalizedSplit.theme.backgroundColor).toBe('#0f172a');
    expect(normalizedSplit.mediaPanel?.enabled).toBe(true);

    const agentSchema = {
      theme: {
        layout: 'conversational',
      },
      fields: [{ id: 'f1', label: 'Name', type: 'short_answer' }],
    };

    const normalizedAgent = normalizeFormSchema(agentSchema);
    expect(normalizedAgent.theme.layout).toBe('conversational');
  });

  it('preserves field layoutColumn and mediaPanel attributes', () => {
    const splitSchema = {
      theme: { layout: 'split_media' },
      mediaPanel: {
        enabled: true,
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e',
        headline: 'Online Booking & Scheduling',
        subtitle: 'Fill out the form below',
        badgeText: '⭐ 5-Star Pro',
        benefitsList: ['Instant response', 'Licensed pro'],
      },
      fields: [
        { id: 'f1', label: 'Full Name', type: 'text', layoutColumn: 'right' },
        { id: 'f2', label: 'Left Widget', type: 'text', layoutColumn: 'left' },
      ],
    };

    const normalized = normalizeFormSchema(splitSchema);
    expect(normalized.theme.layout).toBe('split_media');
    expect(normalized.mediaPanel?.mediaUrl).toBe('https://images.unsplash.com/photo-1621905251189-08b45d6a269e');
    expect(normalized.mediaPanel?.headline).toBe('Online Booking & Scheduling');
    expect(normalized.mediaPanel?.badgeText).toBe('⭐ 5-Star Pro');
    expect(normalized.fields[0].layoutColumn).toBe('right');
    expect(normalized.fields[1].layoutColumn).toBe('left');
  });

  it('buildApiPayload persists split_media and hydrates mediaPanel accurately', async () => {
    const { buildApiPayload } = await import('@/features/forms/utils/form-helpers');
    const editorData = {
      name: 'Online Booking & Appointment Scheduling',
      description: 'Book online instantly',
      type: 'booking' as const,
      status: 'active' as const,
      fields: [
        { id: 'f_name', label: 'Full Name', type: 'text' as any, required: true },
        { id: 'f_phone', label: 'Phone Number', type: 'phone' as any, required: true },
      ],
      theme: { layout: 'split_media' as const },
      settings: { formLayout: 'split_media' as const },
    };

    const payload = buildApiPayload(editorData as any);
    const parsedSchema = JSON.parse(payload.schemaJson);

    expect(parsedSchema.theme.layout).toBe('split_media');
    expect(parsedSchema.mediaPanel).toBeDefined();
    expect(parsedSchema.mediaPanel.enabled).toBe(true);
    expect(parsedSchema.mediaPanel.mediaUrl).toBeDefined();
    expect(parsedSchema.mediaPanel.headline).toBe('Online Booking & Appointment Scheduling');

    const normalized = normalizeFormSchema(parsedSchema);
    expect(normalized.theme.layout).toBe('split_media');
    expect(normalized.mediaPanel?.enabled).toBe(true);
  });
});
