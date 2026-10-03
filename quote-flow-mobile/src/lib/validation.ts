/**
 * Field Validation & Sanitization Helpers for QuoteFlow Mobile
 */

/** Sanitize phone: allows digits, spaces, hyphens, and leading + */
export function sanitizePhone(text: string): string {
  // Allow leading +, then digits, spaces, hyphens
  let clean = text.replace(/[^0-9+\s-]/g, "");
  // Keep + only if it's the first character
  if (clean.indexOf("+") > 0) {
    clean = clean[0] === "+" ? "+" + clean.slice(1).replace(/\+/g, "") : clean.replace(/\+/g, "");
  }
  return clean;
}

/** Check if phone is valid (7 to 15 digits) */
export function isValidPhone(text: string): boolean {
  if (!text || !text.trim()) return false;
  const digits = text.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/** Sanitize email: lowercase & trimmed */
export function sanitizeEmail(text: string): string {
  return text.trim().toLowerCase();
}

/** Validate standard email format */
export function isValidEmail(text: string): boolean {
  if (!text || !text.trim()) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(text.trim());
}

/** Sanitize decimal / currency input (allows only numbers and a single dot) */
export function sanitizeDecimal(text: string): string {
  const clean = text.replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return clean;
}

/** Sanitize integer digits only */
export function sanitizeInteger(text: string): string {
  return text.replace(/\D/g, "");
}

/** Sanitize GSTIN: alphanumeric uppercase, max 15 chars */
export function sanitizeGstin(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
}

/** Validate GSTIN format (15 alphanumeric characters) */
export function isValidGstin(text: string): boolean {
  if (!text) return true; // optional
  const clean = text.trim().toUpperCase();
  if (clean.length !== 15) return false;
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(clean);
}

/** Sanitize IFSC code: alphanumeric uppercase, max 11 chars */
export function sanitizeIfsc(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11);
}

/** Validate IFSC format (11 characters, 5th is usually 0) */
export function isValidIfsc(text: string): boolean {
  if (!text) return true; // optional
  const clean = text.trim().toUpperCase();
  if (clean.length !== 11) return false;
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(clean);
}

/** Sanitize UPI ID: trimmed, lowercase */
export function sanitizeUpi(text: string): string {
  return text.trim().toLowerCase();
}

/** Validate UPI ID format (e.g. user@bank) */
export function isValidUpi(text: string): boolean {
  if (!text) return true; // optional
  const clean = text.trim().toLowerCase();
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return upiRegex.test(clean);
}
