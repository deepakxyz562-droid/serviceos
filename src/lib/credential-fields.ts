/**
 * credential-fields.ts
 *
 * Shared helpers for credential field rendering, used by both the
 * Credentials management view (credentials-view.tsx) and the inline
 * CredentialPicker (credential-picker.tsx).
 *
 * Extracted into a shared module so the two UIs always agree on which
 * fields each credential type exposes, how to label them, and which
 * ones should be treated as sensitive (masked) values.
 */

/**
 * Returns the ordered list of field names that should be collected for
 * a given credential type when creating or editing a credential.
 *
 * These names line up with the keys the backend (workflow-executor +
 * credential-crypto.testCredential) expects to find in `data`.
 *
 * For AI providers, all credentials store the API key under `apiKey`
 * (single field) so they're interchangeable in the credential picker
 * — any `apiKey`-typed credential can be used with any AI node.
 */
export function getCreateFields(type: string): string[] {
  switch (type) {
    case 'whatsapp':
      return ['phoneNumberId', 'businessAccountId', 'apiKey', 'webhookVerifyToken'];
    case 'apiKey':
      return ['apiKey'];
    case 'httpBasic':
      return ['username', 'password'];
    case 'httpBearer':
      return ['token'];
    case 'oAuth2':
      return ['clientId', 'clientSecret', 'refreshToken'];
    case 'dbConnection':
      return ['host', 'port', 'database', 'username', 'password', 'sslMode'];
    case 'sshKey':
      return ['host', 'port', 'username', 'privateKey'];
    case 'awsIam':
      return ['accessKeyId', 'secretAccessKey', 'region'];
    case 'googleServiceAccount':
      return ['clientEmail', 'privateKey', 'projectId'];
    // ─── AI providers (Phase 4) — all use a single `apiKey` field ────────
    case 'openai':
    case 'anthropic':
    case 'huggingface':
    case 'gemini':
    case 'mistral':
    case 'groq':
    case 'cohere':
    case 'perplexity':
    case 'deepseek':
      return ['apiKey'];
    // ─── Hybrid Mode: Platform AI uses no key (server-side Z.AI SDK) ─────
    case 'platform_ai':
      return [];
    default:
      return ['key'];
  }
}

/** Human-readable label for a credential field key. */
export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    phoneNumberId: 'Phone Number ID',
    businessAccountId: 'Business Account ID',
    apiKey: 'API Key',
    webhookVerifyToken: 'Webhook Verify Token',
    secretKey: 'Secret Key',
    publishableKey: 'Publishable Key',
    clientId: 'Client ID',
    clientSecret: 'Client Secret',
    refreshToken: 'Refresh Token',
    host: 'Host',
    port: 'Port',
    database: 'Database',
    username: 'Username',
    password: 'Password',
    sslMode: 'SSL Mode',
    accessKeyId: 'Access Key ID',
    secretAccessKey: 'Secret Access Key',
    region: 'Region',
    bucket: 'Bucket',
    token: 'Token',
    privateKey: 'Private Key',
    clientEmail: 'Client Email',
    projectId: 'Project ID',
    key: 'Key',
  };
  return labels[field] || field.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Whether a field should be treated as a sensitive secret (masked on
 * display, prefilled empty on edit, preserved server-side when blank).
 *
 * The check is intentionally broad — any field whose key contains one
 * of the well-known secret substrings is considered sensitive.
 */
export function isSensitiveField(field: string): boolean {
  const lower = field.toLowerCase();
  return (
    lower.includes('key') ||
    lower.includes('secret') ||
    lower.includes('password') ||
    lower.includes('token') ||
    lower.includes('private')
  );
}

/** Mask a value for safe display (used in card previews). */
export function maskValue(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

/** Sentinel that the backend writes when a sensitive value is masked. */
export const MASKED_SENTINEL = '••••••••';

/** True if a string looks like a masked value returned by the API. */
export function isMaskedValue(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('••••');
}
