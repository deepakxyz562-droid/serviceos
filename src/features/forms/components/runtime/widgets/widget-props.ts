/**
 * Shared runtime widget contract — every form widget MUST use this exact
 * props interface so the WidgetRuntimeDispatcher can swap widgets without
 * adapter shims.
 */

export interface WidgetProps {
  value: unknown;
  onChange: (value: unknown) => void;
  config: Record<string, unknown>;
  disabled?: boolean;
  allFormData?: Record<string, unknown>;
  field?: Record<string, unknown>;
}

export interface NormalizedOption {
  label: string;
  value: string;
}

/**
 * `config.options` may arrive as either a string[] (legacy/palette default)
 * or as Array<{label, value}> (richer). Normalize to one shape so widgets
 * never branch on input format.
 */
export function normalizeOptions(raw: unknown): NormalizedOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    if (typeof item === 'string') return { label: item, value: item };
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const value =
        typeof obj.value === 'string' || typeof obj.value === 'number'
          ? String(obj.value)
          : typeof obj.label === 'string'
            ? obj.label
            : String(idx);
      const label = typeof obj.label === 'string' ? obj.label : value;
      return { label, value };
    }
    return { label: String(item), value: String(item) };
  });
}

/** Coerce a possibly-unknown config value to a number, with a fallback. */
export function num(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce a possibly-unknown config value to a string. */
export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

/** Coerce a possibly-unknown config value to a boolean. */
export function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
