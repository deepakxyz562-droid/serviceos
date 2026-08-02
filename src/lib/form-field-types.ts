/**
 * Fieseros — Dynamic Forms Engine: Field Type Registry
 * ----------------------------------------------------
 * Single source of truth for the 15 supported form field types plus the
 * conditional-display, calculation, and auto-scoring helpers that drive the
 * form-builder and field-renderer.
 *
 * Used by:
 *   - src/components/forms/field-renderer.tsx  (renders inputs by type)
 *   - src/components/views/form-builder-view.tsx  (palette + config UI)
 *
 * Field type taxonomy:
 *   - text      → short_answer, long_answer, numerical
 *   - choice    → dropdown, checkbox
 *   - media     → photo, video, voice_note
 *   - capture   → gps, signature, barcode, qr_scan, drawing_markup
 *   - reference → asset_selection
 *   - ai        → ai_image_analysis
 */

// ─── Field type catalog ───────────────────────────────────────────────────

export const FIELD_TYPES = [
  { value: 'short_answer', label: 'Short Answer', icon: 'Type', category: 'text' },
  { value: 'long_answer', label: 'Long Answer', icon: 'AlignLeft', category: 'text' },
  { value: 'dropdown', label: 'Dropdown', icon: 'ChevronDown', category: 'choice' },
  { value: 'checkbox', label: 'Checkbox', icon: 'CheckSquare', category: 'choice' },
  { value: 'numerical', label: 'Number', icon: 'Hash', category: 'text' },
  { value: 'photo', label: 'Photo Upload', icon: 'Camera', category: 'media' },
  { value: 'video', label: 'Video Upload', icon: 'Video', category: 'media' },
  { value: 'gps', label: 'GPS Location', icon: 'MapPin', category: 'capture' },
  { value: 'signature', label: 'Signature', icon: 'PenTool', category: 'capture' },
  { value: 'barcode', label: 'Barcode Scan', icon: 'Scan', category: 'capture' },
  { value: 'qr_scan', label: 'QR Code Scan', icon: 'QrCode', category: 'capture' },
  { value: 'asset_selection', label: 'Asset Selection', icon: 'Package', category: 'reference' },
  { value: 'ai_image_analysis', label: 'AI Image Analysis', icon: 'Sparkles', category: 'ai' },
  { value: 'voice_note', label: 'Voice Note', icon: 'Mic', category: 'media' },
  { value: 'drawing_markup', label: 'Drawing Markup', icon: 'Edit3', category: 'capture' },
] as const;

export type FieldTypeName = (typeof FIELD_TYPES)[number]['value'];

export const FIELD_CATEGORIES = ['text', 'choice', 'media', 'capture', 'reference', 'ai'] as const;
export type FieldCategory = (typeof FIELD_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<FieldCategory, string> = {
  text: 'Text & Numbers',
  choice: 'Choice',
  media: 'Media',
  capture: 'Capture',
  reference: 'Reference',
  ai: 'AI',
};

// ─── Conditional display ──────────────────────────────────────────────────

export interface FieldCondition {
  /** ID of the field whose value is checked. */
  fieldId: string;
  /** Comparison operator. */
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  /** The value to compare against (string or number). */
  value: string | number;
}

// ─── Calculation ──────────────────────────────────────────────────────────

export interface FieldCalculation {
  /**
   * Formula expression. Tokens of the form `{{fieldId}}` are replaced with
   * the current value of the referenced field. Only basic arithmetic
   * (`+ - * / ( )`) and numbers are evaluated — no Math.* / eval / new Function.
   * Example: "{{width}} * {{height}} * {{price_per_sqm}}"
   */
  formula: string;
  /** Field id where the computed result is stored (usually same field). */
  resultFieldId: string;
}

// ─── Scoring ──────────────────────────────────────────────────────────────

export interface FieldScoring {
  /** Maximum score for this field (e.g. 5). */
  maxScore: number;
  /** Weight relative to other fields (e.g. 0.3 = 30% of total). */
  weight: number;
  /** Minimum score to be considered a pass (optional). */
  passThreshold?: number;
}

// ─── Field config ─────────────────────────────────────────────────────────

export interface FieldConfig {
  /** For photo: allow multiple files. */
  multiple?: boolean;
  /** For photo/video: capture-mode preference. */
  captureMode?: 'camera' | 'upload' | 'both';
  /** For barcode: supported formats (qr, code128, ean13, etc.). */
  scanFormats?: string[];
  /** For ai_image_analysis: custom prompt sent to the VLM. */
  aiPrompt?: string;
  /** For drawing_markup: allow drawing on a base image (URL or data URL). */
  drawOnImage?: boolean;
  /** Base image URL for drawing_markup (when drawOnImage is true). */
  baseImage?: string;
  /** For dropdown/checkbox: list of selectable options. */
  options?: string[];
  /** For numerical/scoring: minimum value. */
  min?: number;
  /** For numerical/scoring: maximum value. */
  max?: number;
  /** For numerical: number of decimal places to round to. */
  step?: number;
  /** For numerical scoring rubric: mapping of option/value → score. */
  scoreMap?: Record<string, number>;
}

// ─── FormField ────────────────────────────────────────────────────────────

export interface FormField {
  id: string;
  type: FieldTypeName | string; // accept legacy string types from old forms
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Show this field only when the condition is met. */
  condition?: FieldCondition;
  /** Auto-calculate this field's value from a formula. */
  calculation?: FieldCalculation;
  /** Auto-score this field after submission. */
  scoring?: FieldScoring;
  /** Type-specific configuration. */
  config?: FieldConfig;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Get the FIELD_TYPES entry for a given type value (or null). */
export function getFieldType(value: string) {
  return FIELD_TYPES.find((t) => t.value === value) ?? null;
}

/** Get the label for a field type (falls back to the raw value). */
export function getFieldTypeLabel(value: string): string {
  return getFieldType(value)?.label ?? value;
}

/** Get the category for a field type (defaults to 'text'). */
export function getFieldTypeCategory(value: string): FieldCategory {
  const cat = getFieldType(value)?.category;
  return (cat && (FIELD_CATEGORIES as readonly string[]).includes(cat))
    ? (cat as FieldCategory)
    : 'text';
}

/** Group FIELD_TYPES entries by category (for palette rendering). */
export function getFieldTypesByCategory(): Record<FieldCategory, typeof FIELD_TYPES[number][]> {
  const result = {} as Record<FieldCategory, typeof FIELD_TYPES[number][]>;
  for (const cat of FIELD_CATEGORIES) {
    result[cat] = FIELD_TYPES.filter((t) => t.category === cat);
  }
  return result;
}

// ─── Condition evaluation ─────────────────────────────────────────────────

/**
 * Evaluate a FieldCondition against the current set of form values.
 * Returns true if the field should be visible.
 *
 * - Missing/undefined condition → always true
 * - Missing dependent value → false (cannot evaluate)
 * - Numeric operators (greater_than, less_than) parse both sides as numbers
 *   and return false on parse failure
 */
export function evaluateCondition(
  condition: FieldCondition | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  const fieldValue = values[condition.fieldId];
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return false;
  }
  const actual = String(fieldValue);
  const expected = String(condition.value);
  switch (condition.operator) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'contains':
      return actual.toLowerCase().includes(expected.toLowerCase());
    case 'greater_than': {
      const a = Number(actual);
      const b = Number(expected);
      return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
    }
    case 'less_than': {
      const a = Number(actual);
      const b = Number(expected);
      return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
    }
    default:
      return true;
  }
}

// ─── Calculation ──────────────────────────────────────────────────────────

/**
 * Evaluate a calculation formula by replacing `{{fieldId}}` tokens with
 * the numeric value of the corresponding field, then evaluating the
 * resulting arithmetic expression safely.
 *
 * Returns null when:
 *   - the formula is empty
 *   - any referenced field has a non-numeric or empty value
 *   - the resulting expression contains disallowed characters
 *   - division by zero occurs
 *   - evaluation throws
 *
 * SECURITY: only `0-9 . + - * / ( )` and whitespace are allowed after
 * token substitution. No `Math.*`, no `eval`, no `Function` constructor.
 */
export function evaluateCalculation(
  calculation: FieldCalculation | undefined,
  values: Record<string, unknown>,
): number | null {
  if (!calculation || !calculation.formula) return null;

  let expr = calculation.formula;
  // Replace each {{fieldId}} token with the numeric value (or NaN marker).
  expr = expr.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_match, id: string) => {
    const v = values[id];
    if (v === undefined || v === null || v === '') return 'NaN';
    const n = Number(v);
    return Number.isNaN(n) ? 'NaN' : String(n);
  });

  // If any token couldn't be resolved, abort.
  if (expr.includes('NaN')) return null;

  // Whitelist: only digits, decimal point, arithmetic operators, parens, whitespace.
  if (!/^[0-9.\s+\-*/()]+$/.test(expr)) return null;

  // Reject division by zero up front (cheap syntactic guard).
  if (/\/\s*0(?!\.\d)/.test(expr)) return null;

  try {
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    if (typeof result !== 'number' || !Number.isFinite(result)) return null;
    // Round to 4 decimal places to avoid float noise.
    return Math.round(result * 10000) / 10000;
  } catch {
    return null;
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────

/**
 * Compute the score for a single field based on its value, scoring config,
 * and optional scoreMap (for choice-type fields).
 *
 * Scoring rules (in priority order):
 *   1. If config.scoreMap exists and the value matches a key → use that score.
 *   2. If the value is numeric → clamp to [0, maxScore].
 *   3. If the value is non-empty and required → award full maxScore.
 *   4. Empty/missing value → 0.
 *
 * Returns null if no scoring config is defined.
 */
export function computeFieldScore(
  field: FormField,
  value: unknown,
): number | null {
  if (!field.scoring) return null;
  const { maxScore, scoreMap } = { scoreMap: field.config?.scoreMap, ...field.scoring };

  // Empty / missing
  if (value === undefined || value === null || value === '') return 0;

  // Choice field with an explicit scoreMap.
  if (scoreMap && typeof scoreMap === 'object') {
    const key = String(value);
    if (key in scoreMap) {
      const mapped = Number(scoreMap[key]);
      if (!Number.isNaN(mapped)) return clampScore(mapped, maxScore);
    }
  }

  // Numeric value → clamp to [0, maxScore].
  const num = Number(value);
  if (!Number.isNaN(num) && typeof value !== 'boolean') {
    return clampScore(num, maxScore);
  }

  // Truthy non-numeric (e.g. populated text, uploaded photo, captured gps).
  // Award full marks for a populated required field.
  if (field.required) return maxScore;
  return Math.round(maxScore * 0.5); // partial credit for optional completion
}

function clampScore(score: number, max: number): number {
  if (score < 0) return 0;
  if (score > max) return max;
  return score;
}

/**
 * Aggregate per-field scores into a weighted total (0-100).
 *
 * Each scored field contributes `score / maxScore * weight` to the running
 * total. The total is then normalized against the sum of weights so missing
 * fields don't penalize the result.
 *
 * Returns:
 *   - total: weighted percentage (0-100)
 *   - maxPossible: 100 (after normalization)
 *   - earned: raw weighted score
 *   - possible: sum of weights
 *   - passed: boolean (true if total ≥ average passThreshold)
 *   - perField: array of { fieldId, label, score, maxScore, weight, percent }
 */
export interface FieldScoreBreakdown {
  fieldId: string;
  label: string;
  score: number;
  maxScore: number;
  weight: number;
  percent: number;
}

export interface FormScoreResult {
  total: number;
  earned: number;
  possible: number;
  passed: boolean;
  perField: FieldScoreBreakdown[];
}

export function computeFormScore(
  fields: FormField[],
  values: Record<string, unknown>,
): FormScoreResult {
  const perField: FieldScoreBreakdown[] = [];
  let earned = 0;
  let possible = 0;

  for (const field of fields) {
    if (!field.scoring) continue;
    // Skip fields hidden by a condition (don't penalize what wasn't asked).
    if (!evaluateCondition(field.condition, values)) continue;
    const score = computeFieldScore(field, values[field.id]) ?? 0;
    const weight = field.scoring.weight > 0 ? field.scoring.weight : 1;
    const maxScore = field.scoring.maxScore > 0 ? field.scoring.maxScore : 1;
    const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
    perField.push({
      fieldId: field.id,
      label: field.label,
      score,
      maxScore,
      weight,
      percent: Math.round(percent),
    });
    earned += (score / maxScore) * weight;
    possible += weight;
  }

  const total = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  // Pass if total ≥ the highest passThreshold across all scored fields
  // (or 60% if no thresholds set — sensible default).
  const thresholds = fields
    .filter((f) => f.scoring?.passThreshold !== undefined)
    .map((f) => f.scoring!.passThreshold as number);
  const passThreshold = thresholds.length > 0 ? Math.min(...thresholds) : 60;

  return {
    total,
    earned: Math.round(earned * 100) / 100,
    possible: Math.round(possible * 100) / 100,
    passed: total >= passThreshold,
    perField,
  };
}

// ─── Field factory ────────────────────────────────────────────────────────

let _fieldIdCounter = 0;

/**
 * Generate a stable-ish unique id for a new field.
 * Uses a counter + timestamp so two fields created in the same millisecond
 * still get different ids.
 */
export function generateFieldId(): string {
  _fieldIdCounter += 1;
  return `f-${Date.now().toString(36)}-${_fieldIdCounter.toString(36)}`;
}

/**
 * Create a new FormField with sensible defaults for the given type.
 */
export function createField(type: FieldTypeName, label = ''): FormField {
  const base: FormField = {
    id: generateFieldId(),
    type,
    label,
    required: false,
  };
  switch (type) {
    case 'short_answer':
      return { ...base, placeholder: 'Enter text...' };
    case 'long_answer':
      return { ...base, placeholder: 'Enter detailed response...' };
    case 'dropdown':
      return { ...base, options: ['Option 1', 'Option 2', 'Option 3'] };
    case 'checkbox':
      return { ...base, options: ['Yes'] };
    case 'numerical':
      return { ...base, placeholder: '0', config: { step: 1 } };
    case 'photo':
      return { ...base, config: { multiple: false, captureMode: 'both' } };
    case 'video':
      return { ...base, config: { captureMode: 'both' } };
    case 'gps':
      return base;
    case 'signature':
      return base;
    case 'barcode':
      return { ...base, config: { scanFormats: ['code128', 'ean13', 'code39'] } };
    case 'qr_scan':
      return { ...base, config: { scanFormats: ['qr'] } };
    case 'asset_selection':
      return base;
    case 'ai_image_analysis':
      return {
        ...base,
        config: {
          aiPrompt:
            'Analyze this image and identify any visible issues, damage, or anomalies relevant to the field service context. List specific findings, severity, and a recommended next step.',
        },
      };
    case 'voice_note':
      return base;
    case 'drawing_markup':
      return { ...base, config: { drawOnImage: false } };
    default:
      return base;
  }
}
