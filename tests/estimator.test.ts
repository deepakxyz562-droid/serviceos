import { describe, it, expect } from 'vitest';
import { getTemplateSync } from '@/lib/forms/templates';
import { normalizeFormSchema } from '@/lib/forms/form-schema-types';
import { buildApiPayload, apiFormToFormItem } from '@/features/forms/utils/form-helpers';

function evaluateFormulaSafe(
  formula: string,
  values: Record<string, unknown>,
  fields?: Array<{ id: string; widgetConfig?: Record<string, unknown> }>,
): number | null {
  if (!formula) return null;

  const calcValuesMap = new Map<string, Record<string, number | string>>();
  if (fields) {
    for (const f of fields) {
      const wc = f.widgetConfig;
      if (wc && wc.useCalculationValues && wc.calculationValues && typeof wc.calculationValues === 'object') {
        calcValuesMap.set(f.id, wc.calculationValues as Record<string, number | string>);
      }
    }
  }

  let expr = formula.replace(/\[([a-zA-Z0-9_.-]+)\]|\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, id1: string, id2: string) => {
    const id = id1 || id2;
    const v = values[id];
    if (v === undefined || v === null || v === '') return '0';

    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return '1';
      if (s === 'false') return '0';
    }

    const calcValues = calcValuesMap.get(id);
    if (calcValues) {
      if (Array.isArray(v)) {
        const sum = v.reduce((acc: number, item: string) => {
          const cv = calcValues[item];
          const n = typeof cv === 'number' ? cv : Number(cv);
          return Number.isNaN(n) ? acc : acc + n;
        }, 0);
        return String(sum);
      }
      const cv = calcValues[String(v)];
      if (cv !== undefined) {
        const n = typeof cv === 'number' ? cv : Number(cv);
        if (!Number.isNaN(n)) return String(n);
      }
    }

    if (Array.isArray(v)) {
      const sum = v.reduce((acc: number, item: unknown) => {
        const itemStr = String(item).trim();
        const priceMatch = itemStr.match(/[\$£€]([0-9]+(?:\.[0-9]+)?)/);
        if (priceMatch && priceMatch[1]) {
          const num = parseFloat(priceMatch[1]);
          return isNaN(num) ? acc : acc + num;
        }
        const num = parseFloat(itemStr.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? acc : acc + num;
      }, 0);
      return String(sum);
    }

    const str = String(v).trim();
    const priceMatch = str.match(/[\$£€]([0-9]+(?:\.[0-9]+)?)/);
    if (priceMatch && priceMatch[1]) {
      const num = parseFloat(priceMatch[1]);
      if (!isNaN(num)) return String(num);
    }

    const n = typeof v === 'number' ? v : parseFloat(str.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(n) ? '0' : String(n);
  });

  if (expr.includes('NaN')) return null;
  if (!/^[0-9.\s+\-*/%()?:!=><&|Math.roundmaxinabslorceq]+$/.test(expr)) return null;
  if (/\/\s*0(?!\.\d)/.test(expr)) return null;
  try {
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    if (typeof result !== 'number' || !Number.isFinite(result)) return null;
    return Math.round(result * 10000) / 10000;
  } catch {
    return null;
  }
}

describe('Elementor 2-Column Live Estimator Parity & Calculations', () => {
  it('should find elementor-two-column-live-estimator in template registry', () => {
    const template = getTemplateSync('elementor-two-column-live-estimator');
    expect(template).toBeDefined();
    expect(template?.id).toBe('elementor-two-column-live-estimator');
  });

  it('should have 4 left column inputs and 3 right column calculation widgets', () => {
    const template = getTemplateSync('elementor-two-column-live-estimator')!;
    const fields = template.schema.fields;
    expect(fields.length).toBe(7);

    const leftFields = fields.filter((f) => f.layoutColumn === 'left');
    const rightFields = fields.filter((f) => f.layoutColumn === 'right');
    expect(leftFields.length).toBe(4);
    expect(rightFields.length).toBe(3);

    expect(leftFields.map((f) => f.id)).toEqual(['roof_sqft', 'material_grade', 'tear_off', 'addons']);
    expect(rightFields.map((f) => f.id)).toEqual(['subtotal_calculation', 'total_calculation', 'deposit_calculation']);
  });

  it('should have split_media layout and active mediaPanel', () => {
    const template = getTemplateSync('elementor-two-column-live-estimator')!;
    expect(template.schema.theme?.layout).toBe('split_media');
    expect(template.schema.theme?.mediaPanel?.enabled).toBe(true);
    expect(template.schema.theme?.mediaPanel?.position).toBe('left');
  });

  it('should evaluate initial default live calculations correctly', () => {
    const template = getTemplateSync('elementor-two-column-live-estimator')!;
    const fields = template.schema.fields;

    const initialValues: Record<string, any> = {
      roof_sqft: 2200,
      material_grade: '4.50',
      tear_off: true,
      addons: [],
    };

    const subtotalField = fields.find((f) => f.id === 'subtotal_calculation')!;
    const totalField = fields.find((f) => f.id === 'total_calculation')!;
    const depositField = fields.find((f) => f.id === 'deposit_calculation')!;

    const subtotal = evaluateFormulaSafe(subtotalField.widgetConfig?.formula as string, initialValues, fields);
    const total = evaluateFormulaSafe(totalField.widgetConfig?.formula as string, initialValues, fields);
    const deposit = evaluateFormulaSafe(depositField.widgetConfig?.formula as string, initialValues, fields);

    expect(subtotal).toBe(9900);
    expect(total).toBe(11100);
    expect(deposit).toBe(2220);
  });

  it('should dynamically update calculations when inputs change', () => {
    const template = getTemplateSync('elementor-two-column-live-estimator')!;
    const fields = template.schema.fields;

    const updatedValues: Record<string, any> = {
      roof_sqft: 3500,
      material_grade: '9.80',
      tear_off: false,
      addons: ['850', '600'],
    };

    const subtotalField = fields.find((f) => f.id === 'subtotal_calculation')!;
    const totalField = fields.find((f) => f.id === 'total_calculation')!;
    const depositField = fields.find((f) => f.id === 'deposit_calculation')!;

    const subtotal = evaluateFormulaSafe(subtotalField.widgetConfig?.formula as string, updatedValues, fields);
    const total = evaluateFormulaSafe(totalField.widgetConfig?.formula as string, updatedValues, fields);
    const deposit = evaluateFormulaSafe(depositField.widgetConfig?.formula as string, updatedValues, fields);

    expect(subtotal).toBe(34300);
    expect(total).toBe(35750);
    expect(deposit).toBe(7150);
  });

  it('should serialize to schemaJson and preserve split_media, mediaPanel, and layoutColumns', () => {
    const template = getTemplateSync('elementor-two-column-live-estimator')!;
    const editorFormData = {
      name: template.name,
      description: template.description || '',
      type: 'lead_capture' as const,
      status: 'active' as const,
      fields: template.schema.fields as any[],
      submissionActions: {
        primary: 'create_lead' as const,
        additional: {
          sendWhatsAppOwner: false,
          sendWhatsAppUser: false,
          sendEmail: true,
          addToCampaign: false,
          notifySalesTeam: false,
          callWebhook: false,
        },
        whatsappOwnerTemplate: '',
        whatsappUserTemplate: '',
        aiGenerateUserMessage: false,
        webhookUrl: '',
      },
      fieldMappings: [],
      welcomeMessage: '',
      completionMessage: 'Estimate Reserved!',
      isMultiStep: false,
      steps: [{ id: 'step-1', title: 'Roofing Specifications & Live Calculation' }],
      primaryColor: '#059669',
      theme: template.schema.theme,
      mediaPanel: template.schema.mediaPanel || template.schema.theme?.mediaPanel,
      rules: [],
      settings: template.schema.settings as any,
    };

    const payload = buildApiPayload(editorFormData);
    expect(payload.schemaJson).toBeDefined();

    const parsed = JSON.parse(payload.schemaJson!);
    expect(parsed.theme?.layout).toBe('split_media');
    expect(parsed.theme?.mediaPanel).toBeDefined();

    const leftFields = parsed.fields.filter((f: any) => f.layoutColumn === 'left');
    const rightFields = parsed.fields.filter((f: any) => f.layoutColumn === 'right');
    expect(leftFields.length).toBe(4);
    expect(rightFields.length).toBe(3);

    // Deserialization check
    const apiForm = {
      id: 'test-form-123',
      name: editorFormData.name,
      description: editorFormData.description,
      type: editorFormData.type,
      status: editorFormData.status,
      slug: 'roof-replacement-renovation-live-estimator',
      schemaJson: payload.schemaJson,
      fieldsJson: payload.fieldsJson,
      submissionActions: payload.submissionActions,
      fieldMappingJson: payload.fieldMappingJson,
      welcomeMessage: '',
      completionMessage: editorFormData.completionMessage,
      submissions: 0,
      conversionRate: 0,
      createdAt: new Date().toISOString(),
    };

    const hydrated = apiFormToFormItem(apiForm);
    expect(hydrated.fields.length).toBe(7);
    expect(hydrated.fields.filter((f) => f.layoutColumn === 'left').length).toBe(4);
    expect(hydrated.theme?.layout).toBe('split_media');
    expect(hydrated.mediaPanel).toBeDefined();

    // Normalization check for public runtime
    const normalized = normalizeFormSchema(parsed);
    expect(normalized.theme.layout).toBe('split_media');
    expect(normalized.mediaPanel?.headline).toBeDefined();
    expect(normalized.fields.filter((f) => f.layoutColumn === 'left').length).toBe(4);
  });
});
