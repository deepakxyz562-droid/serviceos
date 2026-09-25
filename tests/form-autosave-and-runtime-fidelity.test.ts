import { describe, it, expect } from 'vitest';
import { getFormContentFingerprint, buildApiPayload } from '@/features/forms/utils/form-helpers';
import { getFieldWidthClass } from '@/features/forms/components/runtime/shared-field-renderer';
import { resolveFormLayout, layoutToRuntimeMode } from '@/lib/forms/resolve-form-layout';
import type { EditorFormData } from '@/features/forms/types';

describe('Form Autosave & Runtime Fidelity', () => {
  const baseFormData: EditorFormData = {
    id: 'form_123',
    name: 'Roof Replacement & Renovation Live Estimator (2 Column)',
    description: 'Instant cost calculation and booking',
    type: 'lead_capture',
    status: 'active',
    slug: 'roof-replacement-renovation-live-estimator-2-column-',
    fields: [
      {
        id: 'f1',
        type: 'short_answer',
        label: 'Full Name',
        required: true,
        width: 'half',
      },
      {
        id: 'f2',
        type: 'email',
        label: 'Email Address',
        required: true,
        width: 'half',
      },
    ],
    submissionActions: {
      primary: 'create_lead',
      additional: {
        sendEmail: true,
        sendWhatsAppOwner: false,
        sendWhatsAppUser: false,
        addToCampaign: false,
        notifySalesTeam: false,
        callWebhook: false,
      },
    },
    fieldMappings: [],
    welcomeMessage: 'Welcome',
    completionMessage: 'Thank you!',
    submissions: 10,
    conversionRate: 25.5,
    createdAt: '2026-09-25T00:00:00Z',
    theme: {
      primaryColor: '#059669',
      backgroundColor: '#f8fafc',
      layout: 'split_media',
    },
    isMultiStep: true,
    steps: [
      { id: 'step_1', title: 'Contact Info' },
      { id: 'step_2', title: 'Roof Specs' },
    ],
  };

  describe('getFormContentFingerprint (Jotform-style autosave stability)', () => {
    it('produces identical fingerprints when server metadata updates', () => {
      const fpInitial = getFormContentFingerprint(baseFormData);

      // Mutate only server metadata (e.g. onSave response updates id, slug, submissions, timestamps)
      const mutatedMetadata: EditorFormData = {
        ...baseFormData,
        id: 'form_updated_cuid_999',
        slug: 'roof-replacement-renovation-live-estimator-2-column',
        submissions: 25,
        conversionRate: 33.3,
        createdAt: '2026-09-26T00:00:00Z',
      };

      const fpAfterSave = getFormContentFingerprint(mutatedMetadata);
      expect(fpAfterSave).toBe(fpInitial);
    });

    it('detects actual authoring content changes', () => {
      const fpInitial = getFormContentFingerprint(baseFormData);

      // Mutate actual form question
      const mutatedContent: EditorFormData = {
        ...baseFormData,
        name: 'Updated Roofing Estimator',
      };

      const fpAfterEdit = getFormContentFingerprint(mutatedContent);
      expect(fpAfterEdit).not.toBe(fpInitial);
    });

    it('detects changes in fields and steps', () => {
      const fpInitial = getFormContentFingerprint(baseFormData);

      const mutatedFields: EditorFormData = {
        ...baseFormData,
        fields: [
          ...baseFormData.fields,
          { id: 'f3', type: 'phone', label: 'Phone Number', required: false },
        ],
      };

      expect(getFormContentFingerprint(mutatedFields)).not.toBe(fpInitial);
    });
  });

  describe('buildApiPayload slug sanitization', () => {
    it('sanitizes trailing and leading hyphens in the slug', () => {
      const payload = buildApiPayload(baseFormData);
      expect((payload as any).slug).toBe('roof-replacement-renovation-live-estimator-2-column');
      expect((payload as any).slug).not.toMatch(/-$/);
      expect((payload as any).slug).not.toMatch(/^-/);
    });

    it('derives clean slug from name if slug is not provided', () => {
      const dataWithoutSlug = {
        ...baseFormData,
        slug: undefined,
        name: 'Emergency Pipe Repair (24/7)!',
      };
      const payload = buildApiPayload(dataWithoutSlug);
      expect((payload as any).slug).toBe('emergency-pipe-repair-24-7');
    });
  });

  describe('Layout Resolution & Mode Mapping', () => {
    it('resolves split_media layout correctly', () => {
      expect(resolveFormLayout({ theme: { layout: 'split_media' } })).toBe('split_media');
      expect(resolveFormLayout({ settings: { formLayout: 'split_media' } })).toBe('split_media');
    });

    it('resolves card layout correctly', () => {
      expect(resolveFormLayout({ theme: { layout: 'card' } })).toBe('card');
      expect(resolveFormLayout({ settings: { formLayout: 'single_question' } })).toBe('card');
    });

    it('resolves classic layout correctly', () => {
      expect(resolveFormLayout({ theme: { layout: 'classic' } })).toBe('classic');
      expect(resolveFormLayout({ settings: { formLayout: 'all_on_one_page' } })).toBe('classic');
      expect(resolveFormLayout({})).toBe('classic');
    });

    it('maps layout to runtime modes', () => {
      expect(layoutToRuntimeMode('card')).toBe('card');
      expect(layoutToRuntimeMode('classic')).toBe('paper');
      expect(layoutToRuntimeMode('split_media')).toBe('paper');
    });
  });

  describe('Field Width Classes', () => {
    it('returns valid responsive classes for all width configurations', () => {
      expect(getFieldWidthClass('half')).toContain('48.5%');
      expect(getFieldWidthClass('third')).toContain('31.5%');
      expect(getFieldWidthClass('quarter')).toContain('23.5%');
      expect(getFieldWidthClass('full')).toBe('w-full');
      expect(getFieldWidthClass(undefined)).toBe('w-full');
    });
  });
});
