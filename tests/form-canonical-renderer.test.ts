import { describe, it, expect } from 'vitest';
import {
  normalizeFormSchema,
  DEFAULT_FORM_SCHEMA,
  FormLayout,
  FormDocument,
} from '@/lib/forms/form-schema-types';

export function resolveCanonicalLayout(schema: { theme?: { layout?: string }; settings?: { formLayout?: string } }): FormLayout {
  const layout = schema?.theme?.layout || schema?.settings?.formLayout;
  return layout === 'card' || layout === 'single_question' ? 'card' : 'classic';
}

describe('Canonical Form Schema & Layout Normalization', () => {
  it('resolves card layout from card theme or single_question setting', () => {
    const cardSchema = {
      theme: { layout: 'card' },
      fields: [{ id: 'f1', label: 'Name', type: 'short_answer' as const }],
    };
    expect(resolveCanonicalLayout(cardSchema)).toBe('card');

    const singleQuestionSchema = {
      settings: { formLayout: 'single_question' },
      fields: [{ id: 'f1', label: 'Name', type: 'short_answer' as const }],
    };
    expect(resolveCanonicalLayout(singleQuestionSchema)).toBe('card');
  });

  it('resolves classic layout for paper, split_media, multi_step, and conversational', () => {
    expect(resolveCanonicalLayout({ theme: { layout: 'paper' } })).toBe('classic');
    expect(resolveCanonicalLayout({ theme: { layout: 'split_media' } })).toBe('classic');
    expect(resolveCanonicalLayout({ theme: { layout: 'conversational' } })).toBe('classic');
    expect(resolveCanonicalLayout({ theme: { layout: 'classic' } })).toBe('classic');
  });

  it('converts string array options to canonical label-value objects in normalizeFormSchema', () => {
    const rawWithOptions = {
      fields: [
        {
          id: 'f_dropdown',
          type: 'dropdown' as const,
          label: 'Service Choice',
          options: ['Option A', 'Option B', 'Option C'],
        },
      ],
    };

    const normalized = normalizeFormSchema(rawWithOptions);
    expect(normalized.fields[0].options).toEqual([
      { label: 'Option A', value: 'Option A' },
      { label: 'Option B', value: 'Option B' },
      { label: 'Option C', value: 'Option C' },
    ]);
  });
});
