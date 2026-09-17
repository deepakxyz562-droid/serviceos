/**
 * Form Internationalization (i18n)
 * --------------------------------
 * Stores per-field translations in `field.translations`. Since the FormField
 * interface doesn't include this field yet, we extend it here. The main
 * agent may later merge `translations` into FormField directly.
 *
 * Pure logic — no DB, no React.
 */
import type { FormField } from '@/lib/forms/form-schema-types';

export interface FieldTranslation {
  label: string;
  placeholder?: string;
  helpText?: string;
}

export type FieldTranslations = Record<string, FieldTranslation>;

// Extended FormField type that includes optional translations
export type LocalizedFormField = FormField & { translations?: FieldTranslations };

export function translateField(
  field: LocalizedFormField,
  lang: string,
): FieldTranslation {
  const t = field.translations?.[lang];
  return {
    label: t?.label ?? field.label,
    placeholder: t?.placeholder ?? field.placeholder,
    helpText: t?.helpText ?? field.helpText,
  };
}

export function setFieldTranslation(
  field: LocalizedFormField,
  lang: string,
  translation: FieldTranslation,
): LocalizedFormField {
  const translations = { ...(field.translations ?? {}) };
  translations[lang] = { ...translations[lang], ...translation };
  return { ...field, translations };
}

export function getFieldTranslation(
  field: LocalizedFormField,
  lang: string,
): FieldTranslation | undefined {
  return field.translations?.[lang];
}

export function removeFieldTranslation(
  field: LocalizedFormField,
  lang: string,
): LocalizedFormField {
  if (!field.translations || !(lang in field.translations)) return field;
  const translations = { ...field.translations };
  delete translations[lang];
  return { ...field, translations };
}

export function getAvailableLanguages(field: LocalizedFormField): string[] {
  return Object.keys(field.translations ?? {});
}

export function translateFields(
  fields: LocalizedFormField[],
  lang: string,
): LocalizedFormField[] {
  return fields.map((f) => {
    const t = translateField(f, lang);
    return { ...f, label: t.label, placeholder: t.placeholder, helpText: t.helpText };
  });
}

export const SUPPORTED_LANGUAGES: Array<{ code: string; name: string; nativeName: string }> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export { translateField as default };
