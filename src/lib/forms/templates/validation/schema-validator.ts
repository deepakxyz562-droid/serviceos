/**
 * Schema Validator — validates a FormTemplate's schema is well-formed.
 *
 * Runs structural checks on the FormSchema (fields, steps, rules, theme,
 * settings) to catch malformed templates before they're published or seeded.
 *
 * Used by:
 *   - The seed script (T1.3) to validate curated templates before upsert
 *   - The community submission flow (Release 5) to validate user uploads
 *   - The AI generator (Release 4) to validate AI-produced schemas
 */
import type { FormTemplate } from '../types';
import type { FormField, FormSchema } from '../../form-schema-types';

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  fieldId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Validate a FormTemplate's schema.
 *
 * @returns { valid: true } if no errors (warnings are OK).
 *          { valid: false, errors, warnings } if any errors found.
 */
export function validateTemplateSchema(template: FormTemplate): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Check top-level required fields
  if (!template.id || template.id.length < 3) {
    errors.push({ level: 'error', code: 'INVALID_ID', message: 'Template id must be at least 3 characters.' });
  }
  if (!/^[a-z0-9-]+$/.test(template.id)) {
    errors.push({
      level: 'error',
      code: 'INVALID_ID_FORMAT',
      message: 'Template id must be kebab-case (lowercase letters, numbers, hyphens only).',
    });
  }
  if (!template.name || template.name.length < 3) {
    errors.push({ level: 'error', code: 'INVALID_NAME', message: 'Template name must be at least 3 characters.' });
  }
  if (!template.shortDescription || template.shortDescription.length < 10) {
    warnings.push({
      level: 'warning',
      code: 'SHORT_DESCRIPTION_MISSING',
      message: 'Template shortDescription should be at least 10 characters for good SEO.',
    });
  }

  // Validate the FormSchema
  const schema = template.schema;
  validateFormSchema(schema, errors, warnings);

  // Validate classification
  if (template.categories.length === 0) {
    warnings.push({ level: 'warning', code: 'NO_CATEGORIES', message: 'Template has no categories — will be hard to discover.' });
  }
  if (template.industries.length === 0) {
    warnings.push({ level: 'warning', code: 'NO_INDUSTRIES', message: 'Template has no industries — will be hard to discover.' });
  }
  if (template.tags.length < 3) {
    warnings.push({ level: 'warning', code: 'FEW_TAGS', message: 'Template has fewer than 3 tags — consider adding more for search.' });
  }

  // Validate SEO metadata
  if (!template.seo.seoKeywords || template.seo.seoKeywords.length < 3) {
    warnings.push({ level: 'warning', code: 'FEW_SEO_KEYWORDS', message: 'Template has fewer than 3 SEO keywords.' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateFormSchema(
  schema: FormSchema,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  // Check schema version
  if (typeof schema.version !== 'number' || schema.version < 1) {
    errors.push({ level: 'error', code: 'INVALID_SCHEMA_VERSION', message: 'Schema version must be a positive number.' });
  }

  // Check fields array
  if (!Array.isArray(schema.fields)) {
    errors.push({ level: 'error', code: 'NO_FIELDS_ARRAY', message: 'Schema must have a fields array.' });
    return;
  }

  if (schema.fields.length === 0) {
    errors.push({ level: 'error', code: 'EMPTY_FIELDS', message: 'Schema must have at least 1 field.' });
    return;
  }

  if (schema.fields.length < 5) {
    warnings.push({
      level: 'warning',
      code: 'FEW_FIELDS',
      message: `Schema has only ${schema.fields.length} fields — most templates should have 5-15.`,
    });
  }

  // Check each field
  const fieldIds = new Set<string>();
  const fieldLabels = new Set<string>();
  for (const field of schema.fields) {
    validateField(field, fieldIds, fieldLabels, errors, warnings);
  }

  // Check steps reference
  if (schema.steps && schema.steps.length > 0) {
    const stepIds = new Set(schema.steps.map((s) => s.id));
    for (const field of schema.fields) {
      if (field.stepId && !stepIds.has(field.stepId)) {
        warnings.push({
          level: 'warning',
          code: 'FIELD_REFERENCES_MISSING_STEP',
          message: `Field '${field.id}' references stepId '${field.stepId}' which doesn't exist.`,
          fieldId: field.id,
        });
      }
    }
  }

  // Check rules reference valid fields
  if (schema.rules) {
    for (const rule of schema.rules) {
      if (!fieldIds.has(rule.sourceFieldId)) {
        errors.push({
          level: 'error',
          code: 'RULE_INVALID_SOURCE',
          message: `Rule '${rule.id}' references non-existent sourceFieldId '${rule.sourceFieldId}'.`,
        });
      }
      if (rule.targetFieldId && !fieldIds.has(rule.targetFieldId)) {
        errors.push({
          level: 'error',
          code: 'RULE_INVALID_TARGET',
          message: `Rule '${rule.id}' references non-existent targetFieldId '${rule.targetFieldId}'.`,
        });
      }
    }
  }

  // Check theme
  if (!schema.theme) {
    warnings.push({ level: 'warning', code: 'NO_THEME', message: 'Schema has no theme — will use defaults.' });
  } else {
    if (!schema.theme.primaryColor) {
      warnings.push({ level: 'warning', code: 'NO_PRIMARY_COLOR', message: 'Theme has no primaryColor.' });
    }
  }

  // Check settings
  if (!schema.settings) {
    warnings.push({ level: 'warning', code: 'NO_SETTINGS', message: 'Schema has no settings block.' });
  } else {
    if (!schema.settings.submitButtonText) {
      warnings.push({ level: 'warning', code: 'NO_SUBMIT_TEXT', message: 'Settings has no submitButtonText.' });
    }
    if (!schema.settings.successTitle) {
      warnings.push({ level: 'warning', code: 'NO_SUCCESS_TITLE', message: 'Settings has no successTitle.' });
    }
  }
}

function validateField(
  field: FormField,
  fieldIds: Set<string>,
  fieldLabels: Set<string>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  // Required: id, type, label
  if (!field.id) {
    errors.push({ level: 'error', code: 'FIELD_NO_ID', message: 'Field has no id.' });
  } else if (fieldIds.has(field.id)) {
    errors.push({
      level: 'error',
      code: 'DUPLICATE_FIELD_ID',
      message: `Duplicate field id '${field.id}'.`,
      fieldId: field.id,
    });
  } else {
    fieldIds.add(field.id);
  }

  if (!field.type) {
    errors.push({ level: 'error', code: 'FIELD_NO_TYPE', message: `Field '${field.id}' has no type.`, fieldId: field.id });
  }

  if (!field.label || field.label.length < 2) {
    warnings.push({
      level: 'warning',
      code: 'FIELD_SHORT_LABEL',
      message: `Field '${field.id}' has a label shorter than 2 characters.`,
      fieldId: field.id,
    });
  } else if (fieldLabels.has(field.label.toLowerCase())) {
    warnings.push({
      level: 'warning',
      code: 'DUPLICATE_FIELD_LABEL',
      message: `Duplicate field label '${field.label}' — may confuse users.`,
      fieldId: field.id,
    });
  } else {
    fieldLabels.add(field.label.toLowerCase());
  }

  // Options-based fields must have options
  if (['dropdown', 'radio', 'checkbox'].includes(field.type)) {
    if (!field.options || field.options.length === 0) {
      warnings.push({
        level: 'warning',
        code: 'OPTIONS_FIELD_EMPTY',
        message: `Field '${field.id}' (type ${field.type}) has no options.`,
        fieldId: field.id,
      });
    } else {
      // Check each option has label + value
      for (const opt of field.options) {
        if (!opt.label || !opt.value) {
          warnings.push({
            level: 'warning',
            code: 'OPTION_MISSING_LABEL_OR_VALUE',
            message: `Field '${field.id}' has an option missing label or value.`,
            fieldId: field.id,
          });
        }
      }
    }
  }

  // Numerical fields should have validation if min/max expected
  if (field.type === 'numerical' && field.validation) {
    if (field.validation.min !== undefined && field.validation.max !== undefined) {
      if (field.validation.min > field.validation.max) {
        errors.push({
          level: 'error',
          code: 'INVALID_VALIDATION_RANGE',
          message: `Field '${field.id}' has min > max.`,
          fieldId: field.id,
        });
      }
    }
  }
}
