/**
 * Quality Validator — checks template quality beyond schema validity.
 *
 * These are softer checks that catch low-quality templates (e.g. all fields
 * required, no help text, generic labels like "Field 1"). They produce
 * warnings, not errors — a template can pass quality checks with warnings
 * but shouldn't be featured.
 *
 * Used by:
 *   - The seed script to assign a quality score
 *   - The community review queue (Release 5) to surface low-quality submissions
 *   - The "featured" flag gate (only high-quality templates should be featured)
 */
import type { FormTemplate } from '../types';
import type { ValidationIssue } from './schema-validator';

export interface QualityResult {
  score: number; // 0-100
  issues: ValidationIssue[];
}

/**
 * Score a template's quality. Higher is better.
 *
 * Score breakdown (100 total):
 *   20 — field labels are descriptive (not generic like "Field 1")
 *   20 — has help text or descriptions on key fields
 *   15 — sensible required-field ratio (not 100% required, not 0%)
 *   15 — has at least one dropdown/radio/checkbox (not all text inputs)
 *   10 — field count is reasonable (5-20 fields)
 *   10 — has SEO description
 *   10 — has FAQ entries
 */
export function scoreTemplateQuality(template: FormTemplate): QualityResult {
  const issues: ValidationIssue[] = [];
  let score = 0;

  const fields = template.schema.fields;

  // 20 — descriptive labels
  const genericLabels = fields.filter((f) =>
    /^(field|untitled|new field|item|entry)\s*\d*$/i.test(f.label || ''),
  );
  if (genericLabels.length === 0) {
    score += 20;
  } else {
    issues.push({
      level: 'warning',
      code: 'GENERIC_LABELS',
      message: `${genericLabels.length} field(s) have generic labels (e.g. "Field 1").`,
    });
    score += Math.max(0, 20 - genericLabels.length * 5);
  }

  // 20 — help text
  const fieldsWithHelp = fields.filter((f) => f.helpText || f.description);
  const helpRatio = fields.length > 0 ? fieldsWithHelp.length / fields.length : 0;
  if (helpRatio >= 0.3) {
    score += 20;
  } else {
    issues.push({
      level: 'warning',
      code: 'LOW_HELP_TEXT',
      message: `Only ${fieldsWithHelp.length}/${fields.length} fields have help text/description.`,
    });
    score += Math.round(helpRatio * 20);
  }

  // 15 — sensible required ratio
  const requiredCount = fields.filter((f) => f.required).length;
  const requiredRatio = fields.length > 0 ? requiredCount / fields.length : 0;
  if (requiredRatio > 0 && requiredRatio <= 0.8) {
    score += 15;
  } else if (requiredRatio === 0) {
    issues.push({
      level: 'warning',
      code: 'NO_REQUIRED_FIELDS',
      message: 'No fields are marked required — consider marking key fields.',
    });
    score += 5;
  } else {
    issues.push({
      level: 'warning',
      code: 'TOO_MANY_REQUIRED',
      message: `${requiredCount}/${fields.length} fields are required — may hurt completion.`,
    });
    score += 5;
  }

  // 15 — has choice fields
  const choiceFields = fields.filter((f) =>
    ['dropdown', 'radio', 'checkbox'].includes(f.type),
  );
  if (choiceFields.length >= 1) {
    score += 15;
  } else {
    issues.push({
      level: 'warning',
      code: 'NO_CHOICE_FIELDS',
      message: 'No dropdown/radio/checkbox fields — form is all text input.',
    });
  }

  // 10 — reasonable field count
  if (fields.length >= 5 && fields.length <= 20) {
    score += 10;
  } else if (fields.length < 5) {
    issues.push({
      level: 'warning',
      code: 'TOO_FEW_FIELDS',
      message: `Only ${fields.length} fields — most templates have 5-20.`,
    });
  } else {
    issues.push({
      level: 'warning',
      code: 'TOO_MANY_FIELDS',
      message: `${fields.length} fields — may overwhelm respondents.`,
    });
  }

  // 10 — SEO description
  if (template.description && template.description.length >= 50) {
    score += 10;
  } else {
    issues.push({
      level: 'warning',
      code: 'SHORT_DESCRIPTION',
      message: 'Description is short — add more detail for SEO.',
    });
  }

  // 10 — FAQ entries
  if (template.seo.faq && template.seo.faq.length >= 1) {
    score += 10;
  } else {
    issues.push({
      level: 'warning',
      code: 'NO_FAQ',
      message: 'No FAQ entries — add 1-2 for better SEO.',
    });
  }

  return { score, issues };
}

/** Returns true if the template meets the "featured" quality bar (score ≥ 70). */
export function isFeaturedQuality(template: FormTemplate): boolean {
  const { score } = scoreTemplateQuality(template);
  return score >= 70;
}
