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
});
