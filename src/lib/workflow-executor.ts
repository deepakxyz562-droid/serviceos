/**
 * Workflow Executor — Real execution engine for FlowForge workflows.
 *
 * Processes nodes based on edge connections, resolves expressions,
 * and actually invokes external APIs (WhatsApp, HTTP, etc.).
 */

import { db } from '@/lib/db';
import { decryptCredentialData } from '@/lib/credential-crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecNode {
  id: string;
  type: string;
  name: string;
  data: {
    nodeType: string;
    config: Record<string, any>;
    disabled?: boolean;
  };
}

interface ExecEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
}

export interface NodeOutput {
  json: Record<string, any>;
}

interface NodeResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'success' | 'error';
  input: NodeOutput[];
  output: NodeOutput[];
  durationMs: number;
  error?: string;
}

interface ExecutionResult {
  status: 'success' | 'error';
  nodeResults: NodeResult[];
  durationMs: number;
  error?: string;
}

interface CredentialData {
  id: string;
  name: string;
  type: string;
  encryptedData: string;
}

// ─── Expression Resolver ──────────────────────────────────────────────────────

/**
 * Resolve template expressions like {{ $json.body.new.title }} or {{ job.title }}
 * against a data context.
 */
export function resolveExpression(
  template: string,
  context: Record<string, any>,
): string {
  if (!template || typeof template !== 'string') return template ?? '';

  return template.replace(
    /\{\{\s*([\w.$[\]]+)\s*\}\}/g,
    (_match, path: string) => {
      const value = getNestedValue(context, path);
      return value !== undefined ? String(value) : '';
    },
  );
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.replace(/\[(\d+)]/g, '.$1').split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// ─── Credential Loader ────────────────────────────────────────────────────────

async function loadCredential(
  credentialId: string,
): Promise<Record<string, any> | null> {
  if (!credentialId) return null;
  try {
    const cred = await db.credential.findUnique({ where: { id: credentialId } });
    if (!cred) return null;
    // Try new encrypted format first, fall back to legacy JSON for old records
    if (cred.encryptedData?.startsWith('aes-256-gcm:')) {
      return decryptCredentialData(cred.encryptedData);
    }
    return JSON.parse(cred.encryptedData); // legacy unencrypted records
  } catch {
    return null;
  }
}

/**
 * Like `loadCredential`, but also returns the credential's `type` field.
 *
 * Used by AI handlers that need to detect the special `platform_ai`
 * credential type and route through the Z.AI SDK instead of a
 * user-supplied provider API key (the "Hybrid Mode" from the n8n-style
 * BYOK design).
 */
async function loadCredentialWithType(
  credentialId: string,
): Promise<{ type: string; name: string; data: Record<string, any> } | null> {
  if (!credentialId) return null;
  try {
    const cred = await db.credential.findUnique({ where: { id: credentialId } });
    if (!cred) return null;
    let data: Record<string, any>;
    if (cred.encryptedData?.startsWith('aes-256-gcm:')) {
      data = decryptCredentialData(cred.encryptedData);
    } else {
      data = JSON.parse(cred.encryptedData);
    }
    return { type: cred.type, name: cred.name, data };
  } catch {
    return null;
  }
}

/**
 * Call the platform's built-in AI (Z.AI SDK) — used when a node is configured
 * with a `platform_ai` credential. This is the "Hybrid Mode" from the
 * n8n-style BYOK design: users who don't have their own provider API key
 * can still run AI nodes using the platform's free-tier AI.
 *
 * Returns the assistant's text content plus a `platform: true` flag so the
 * workflow output makes it clear that platform AI was used (not a
 * user-supplied key).
 *
 * If the Z.AI SDK is not configured (no ZAI_API_KEY env var), returns a
 * graceful error object instead of throwing.
 */
async function callPlatformAI(params: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  operation?: string;
}): Promise<Record<string, any>> {
  const { prompt, systemPrompt, temperature = 0.7, maxTokens, operation } = params;
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    // Cast messages to any[] — the Z.AI SDK's ChatMessage type has strict
    // `role` literal types, but at runtime any 'system'/'user'/'assistant'
    // string works fine. This mirrors the pattern used in /api/ai/* routes.
    const messages: any[] = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt },
    ];
    const result: any = await zai.chat.completions.create({
      messages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    } as any);
    return {
      content: result?.choices?.[0]?.message?.content || '',
      model: 'platform-ai',
      usage: result?.usage,
      platform: true,
      operation: operation || 'chatCompletion',
    };
  } catch (err: any) {
    return {
      error: `Platform AI is not available: ${err?.message || 'Z.AI SDK not configured'}`,
      platform: true,
      hint: 'Set ZAI_API_KEY environment variable on the server, or supply your own AI provider API key in the node settings.',
    };
  }
}

/**
 * Shared helper: call an OpenAI-compatible `/v1/chat/completions` endpoint.
 *
 * Used by Mistral, Groq, Perplexity, and DeepSeek — all of which mirror the
 * OpenAI request/response shape but on different base URLs. Returns the
 * assistant's text content + usage info, or an `{ error }` object on
 * failure. Never throws.
 */
async function callOpenAICompatibleProvider(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  providerName: string;
  extraBody?: Record<string, any>;
  extraResponseFields?: (data: any) => Record<string, any>;
}): Promise<Record<string, any>> {
  const {
    baseUrl, apiKey, model, prompt, systemPrompt,
    temperature, maxTokens, providerName, extraBody, extraResponseFields,
  } = params;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        ...extraBody,
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        error: `${providerName} API error: ${data.error?.message || data.message || response.statusText}`,
        statusCode: response.status,
      };
    }

    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || model,
      usage: data.usage,
      ...(extraResponseFields ? extraResponseFields(data) : {}),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { error: `${providerName} request timed out after 60s` };
    }
    return { error: `${providerName} request failed: ${err?.message || 'unknown error'}` };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Topological Sort ─────────────────────────────────────────────────────────

/**
 * Sort nodes in execution order based on edges (dependency graph).
 */
function topologicalSort(
  nodes: ExecNode[],
  edges: ExecEdge[],
): ExecNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map<string, string[]>();

  for (const n of nodes) {
    adjacency.set(n.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: ExecNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);

    for (const neighbor of adjacency.get(id) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If cycle detected, return nodes in original order
  return sorted.length === nodes.length ? sorted : nodes;
}

// ─── WhatsApp Business Cloud API ──────────────────────────────────────────────

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0';

interface WhatsAppPayload {
  messaging_product: string;
  to: string;
  type: string;
  text?: { body: string; preview_url?: boolean };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  interactive?: any;
}

// ─── Dynamic List Data Fetcher ────────────────────────────────────────────────

interface DynamicListSource {
  enabled: boolean;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  arrayPath: string;   // JSON path to the array in response (e.g., "data.drivers" or "items")
  idField: string;     // Field name for row ID (e.g., "id")
  titleField: string;  // Field name for row title (e.g., "name")
  descField: string;   // Field name for row description (e.g., "status"), empty = no desc
  sectionTitle?: string; // Title for the dynamic section
}

interface OnSelectAction {
  enabled: boolean;
  actionType: 'webhook' | 'workflow' | 'updateJobAssignee';  // Type of action to perform
  webhookUrl: string;    // URL to call when user selects a list item
  method: string;        // HTTP method for the webhook call
  workflowId?: string;   // Optional: trigger another FlowForge workflow
  contextData?: Record<string, string>;  // Optional: resolved context data passed to triggered workflow (e.g., jobId)
}

interface DataEndpointConfig {
  enabled: boolean;
  path: string;
  sourceType: 'drivers' | 'employees' | 'resources' | 'custom';
  filters: {
    status?: string;
    role?: string;
  };
  fields: {
    idField: string;
    titleField: string;
    descField: string;
  };
  sectionTitle: string;
}

async function fetchDynamicListData(
  source: DynamicListSource,
  context: Record<string, any>,
): Promise<WhatsAppListSection[]> {
  if (!source.enabled || !source.url) return [];

  try {
    let url = resolveExpression(source.url, context);

    // Normalize URLs for server-side fetch:
    // - If URL starts with / (relative), prepend localhost
    // - If URL contains a preview domain (*.space-z.ai), replace with localhost:3000
    //   because server-side fetch can't resolve the preview domain
    if (url.startsWith('/')) {
      url = `http://localhost:3000${url}`;
    } else if (url.includes('.space-z.ai')) {
      try {
        const parsedUrl = new URL(url);
        url = `http://localhost:3000${parsedUrl.pathname}${parsedUrl.search}`;
      } catch {
        // If URL parsing fails, try replacing the origin directly
        url = url.replace(/https?:\/\/[^/]+\.space-z\.ai/, 'http://localhost:3000');
      }
    }

    const method = (source.method || 'GET').toUpperCase();

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(source.headers || {}),
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && source.body) {
      fetchOptions.body = resolveExpression(source.body, context);
    }

    console.log(`[WhatsApp Dynamic List] Fetching from: ${url}, Method: ${method}`);
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      console.warn(`[WhatsApp Dynamic List] API returned ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Navigate to the array using the path (e.g., "data.drivers")
    // If arrayPath is empty, the root response may be the array itself
    let arrayData: any;
    if (!source.arrayPath || source.arrayPath.trim() === '') {
      // Root response is the array
      arrayData = data;
    } else {
      arrayData = getNestedValue(data, source.arrayPath);
    }
    if (!Array.isArray(arrayData)) {
      console.warn(`[WhatsApp Dynamic List] Path "${source.arrayPath}" did not resolve to an array (got ${typeof arrayData})`);
      return [];
    }

    // Map the array to WhatsApp list rows
    const rows = arrayData
      .slice(0, 10) // WhatsApp max 10 rows
      .map((item: any, idx: number) => {
        const id = String(item[source.idField || 'id'] ?? `dynamic_${idx + 1}`);
        const title = String(item[source.titleField || 'name'] ?? `Item ${idx + 1}`);
        const desc = source.descField ? String(item[source.descField] || '') : '';

        return {
          id: id.substring(0, 200),
          title: title.substring(0, 24),
          ...(desc ? { description: desc.substring(0, 72) } : {}),
        };
      })
      .filter((row: any) => row.title); // Title is required

    if (rows.length === 0) return [];

    return [{
      title: (source.sectionTitle || 'Options').substring(0, 24),
      rows,
    }];
  } catch (error: any) {
    console.error(`[WhatsApp Dynamic List] Fetch error: ${error.message}`);
    return [];
  }
}

// ─── WhatsApp List Section type (shared) ─────────────────────────────────────

interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

interface WhatsAppListSection {
  title?: string;
  rows: WhatsAppListRow[];
}

async function sendWhatsAppMessage(
  accessToken: string,
  phoneNumberId: string,
  payload: WhatsAppPayload,
): Promise<{ success: boolean; data?: any; error?: string; errorCode?: string; errorSubcode?: number }> {
  try {
    const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorCode = data?.error?.code;
      const errorSubcode = data?.error?.error_subcode;
      const errorMsg = data?.error?.message || `WhatsApp API error: ${response.status}`;

      // Provide user-friendly guidance for common error codes
      let userFriendlyMsg = errorMsg;
      if (errorCode === 131030 || String(errorSubcode) === '261003') {
        userFriendlyMsg = `Recipient phone number not in allowed list. The number "${payload.to}" must be added as a test contact in your WhatsApp Business Manager. Go to Meta Business Suite > WhatsApp > Phone Numbers > Add Test Numbers, or use a template message instead (template messages can reach any number).`;
      } else if (errorCode === 131000 || String(errorSubcode) === '261001') {
        userFriendlyMsg = `Invalid phone number "${payload.to}". Ensure the number includes the country code (e.g., 91XXXXXXXXXX for India, 1XXXXXXXXXX for US) with no spaces, dashes, or plus sign.`;
      } else if (errorCode === 132000) {
        userFriendlyMsg = `Template parameter mismatch. The number of parameters in the template doesn't match what the WhatsApp template expects. Check your template definition in Meta Business Suite.`;
      } else if (errorCode === 100) {
        userFriendlyMsg = `Invalid parameter in WhatsApp API request. This usually means a field is too long, missing, or has an invalid value. Check the message body, buttons, and list items. Error detail: ${errorMsg}`;
      } else if (errorCode === 190 || response.status === 401) {
        const isExpired = String(errorSubcode) === '463' || (errorMsg && errorMsg.toLowerCase().includes('expired'));
        if (isExpired) {
          userFriendlyMsg = `Your WhatsApp access token has EXPIRED. Generate a new token: Meta Business Suite → System Users → Generate New Token (select whatsapp_business_messaging permission). Then update the credential in FlowForge Settings tab.`;
        } else {
          userFriendlyMsg = `WhatsApp access token is invalid or expired (error 190). Generate a new token: Meta Business Suite → System Users → Generate New Token (select whatsapp_business_messaging permission). Then update the credential in FlowForge Settings tab.`;
        }
      } else if (response.status === 401) {
        userFriendlyMsg = `Authentication failed. Your WhatsApp access token is invalid or expired. Please update it in the credential settings.`;
      } else if (response.status === 403) {
        userFriendlyMsg = `Permission denied. Your WhatsApp Business account may not have permission to send messages, or the phone number ID is incorrect.`;
      } else if (response.status === 429) {
        userFriendlyMsg = `Rate limit exceeded. Too many messages sent in a short time. Please wait and try again.`;
      }

      return {
        success: false,
        error: userFriendlyMsg,
        errorCode: String(errorCode),
        errorSubcode,
        data,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to call WhatsApp API',
    };
  }
}

async function buildWhatsAppPayload(
  to: string,
  config: Record<string, any>,
  context: Record<string, any>,
): Promise<WhatsAppPayload> {
  // Respect the user's operation choice — no auto-switching
  const operation = config.operation || 'sendInteractive';

  // Resolve expressions in all text fields
  const bodyText = resolveExpression(config.bodyText || '', context);
  const headerText = resolveExpression(config.headerText || '', context);
  const footerText = resolveExpression(config.footerText || '', context);
  // "to" is already cleaned and validated before calling this function
  const toResolved = to.replace(/\D/g, '');

  console.log(`[WhatsApp] Operation: ${operation}, To: ${toResolved}, BodyText length: ${bodyText.length}`);

  switch (operation) {
    case 'sendText': {
      if (!bodyText) {
        throw new Error('Message body text is required for Send Text operation');
      }
      return {
        messaging_product: 'whatsapp',
        to: toResolved,
        type: 'text',
        text: { body: bodyText, preview_url: false },
      };
    }

    case 'sendTemplate': {
      const templateName = config.templateName;
      if (!templateName) {
        throw new Error('Template name is required for Send Template operation. Please select a template or use Send Text / Send Interactive instead.');
      }
      const templateLanguage = config.templateLanguage || 'en_US';

      // Build template payload.
      // Template parameters can come from:
      //   1. config.templateParameters — array of {value: string} objects (preferred, new UI)
      //   2. config.bodyText — fallback for backward compatibility (split by newlines)
      //
      // CRITICAL: Only send components if the template actually supports parameters.
      // Templates like "hello_world" have 0 parameters — sending components will cause:
      //   "(#132000) Number of parameters does not match the expected number of params"
      const template: any = {
        name: templateName,
        language: { code: templateLanguage },
      };

      // Collect resolved template parameters
      const resolvedParams: string[] = [];

      // Priority 1: Use templateParameters array (new UI with individual param inputs)
      if (config.templateParameters && Array.isArray(config.templateParameters) && config.templateParameters.length > 0) {
        for (const param of config.templateParameters) {
          const resolved = resolveExpression(param.value || '', context);
          if (resolved) {
            resolvedParams.push(resolved);
          }
        }
      }
      // Priority 2: Fallback to bodyText split by newlines (backward compatibility)
      else if (bodyText.trim()) {
        const paramLines = bodyText.trim()
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);
        resolvedParams.push(...paramLines);
      }

      // Only add components if we have parameters to send
      if (resolvedParams.length > 0) {
        template.components = [{
          type: 'body',
          parameters: resolvedParams.map((param: string) => ({
            type: 'text',
            text: param,
          })),
        }];
      }

      console.log(`[WhatsApp] Template: ${templateName}, Language: ${templateLanguage}, Params: ${resolvedParams.length}, Components: ${template.components ? 'yes' : 'none'}`);

      return {
        messaging_product: 'whatsapp',
        to: toResolved,
        type: 'template',
        template,
      };
    }

    case 'sendInteractive': {
      const interactiveType = config.interactiveType || 'button';
      const buttons = config.buttons || [];

      if (interactiveType === 'button' && buttons.length > 0) {
        const validButtons = buttons
          .filter((btn: any) => btn.label && btn.label.trim().length > 0)
          .slice(0, 3);

        if (validButtons.length === 0) {
          throw new Error('Interactive button message requires at least 1 button with a label');
        }

        const action = {
          buttons: validButtons.map((btn: any, idx: number) => ({
            type: 'reply',
            reply: {
              id: btn.id || `btn_${idx}`,
              title: btn.label.substring(0, 20),
            },
          })),
        };

        // WhatsApp requires body text to be at least 1 character (max 1024)
        // If bodyText is empty after expression resolution, use a fallback
        const interactiveBody = bodyText.trim() || 'Please select an option';

        const interactive: any = {
          type: 'button',
          body: { text: interactiveBody },
          action,
        };

        if (headerText) {
          interactive.header = { type: 'text', text: headerText };
        }
        if (footerText) {
          interactive.footer = { text: footerText };
        }

        return {
          messaging_product: 'whatsapp',
          to: toResolved,
          type: 'interactive',
          interactive,
        };
      }

      // CTA URL button type (opens a URL when clicked)
      if (interactiveType === 'cta_url') {
        const ctaButtonText = resolveExpression(config.ctaButtonText || 'Click Here', context).substring(0, 20);
        const ctaUrl = resolveExpression(config.ctaUrl || '', context);

        if (!ctaUrl) {
          throw new Error('CTA URL is required for CTA URL button type');
        }

        const interactiveBody = bodyText.trim() || 'Please click the button below';

        const interactive: any = {
          type: 'cta_url',
          body: { text: interactiveBody },
          action: {
            name: 'cta_url',
            parameters: {
              display_text: ctaButtonText,
              url: ctaUrl,
            },
          },
        };

        if (headerText) {
          interactive.header = { type: 'text', text: headerText };
        }
        if (footerText) {
          interactive.footer = { text: footerText };
        }

        return {
          messaging_product: 'whatsapp',
          to: toResolved,
          type: 'interactive',
          interactive,
        };
      }

      // List type
      const listBody = bodyText.trim() || 'Please select an option';
      const buttonText = resolveExpression(config.listButtonText || 'Options', context).substring(0, 20);
      const sections = config.listSections || [];

      // Build sections from config data (static)
      const whatsappSections: any[] = [];

      if (sections.length > 0) {
        for (const section of sections) {
          const sectionTitle = resolveExpression(section.title || '', context);
          const rows: any[] = [];

          for (const row of (section.rows || [])) {
            const rowTitle = resolveExpression(row.title || '', context);
            const rowDescription = resolveExpression(row.description || '', context);

            if (rowTitle) {
              rows.push({
                id: (row.id || `row_${rows.length + 1}`).substring(0, 200),
                title: rowTitle.substring(0, 24),
                ...(rowDescription ? { description: rowDescription.substring(0, 72) } : {}),
              });
            }
          }

          if (rows.length > 0) {
            whatsappSections.push({
              ...(sectionTitle ? { title: sectionTitle.substring(0, 24) } : {}),
              rows,
            });
          }
        }
      }

      // Dynamic list data: fetch from API at runtime
      // This is async, so we need to handle it differently
      // We'll add a marker that the executor should fetch dynamic data
      let dynamicSource: DynamicListSource | undefined = config.listDynamicSource;
      let dynamicSections: WhatsAppListSection[] = [];

      // Auto-link data endpoint config to dynamic list source
      const dataEndpointConfig = config.dataEndpointConfig as DataEndpointConfig | undefined;
      if (dataEndpointConfig?.enabled && dataEndpointConfig?.path) {
        // Build the internal data endpoint URL — must use absolute URL for server-side fetch
        const dataEndpointUrl = `http://localhost:3000/api/whatsapp/data/${dataEndpointConfig.path}`;
        // If the dynamic source is not already configured with this URL, override it
        if (!dynamicSource?.enabled || !dynamicSource?.url?.includes(dataEndpointConfig.path)) {
          dynamicSource = {
            enabled: true,
            url: dataEndpointUrl,
            method: 'GET',
            arrayPath: 'data',
            idField: dataEndpointConfig.fields?.idField || 'id',
            titleField: dataEndpointConfig.fields?.titleField || 'full_name',
            descField: dataEndpointConfig.fields?.descField || 'status',
            sectionTitle: dataEndpointConfig.sectionTitle || 'Options',
          };
          console.log(`[WhatsApp] Auto-linked data endpoint: ${dataEndpointUrl}`);
        }
      }

      if (dynamicSource?.enabled && dynamicSource?.url) {
        dynamicSections = await fetchDynamicListData(dynamicSource, context);
        // Prepend dynamic sections (they appear first in the list)
        for (const dynSec of dynamicSections) {
          whatsappSections.unshift(dynSec);
        }
      }

      // Fallback: if no sections configured, create a default one with a single row
      if (whatsappSections.length === 0) {
        whatsappSections.push({
          title: 'Options',
          rows: [
            {
              id: 'row_1',
              title: 'Option 1',
              description: bodyText.substring(0, 72),
            },
          ],
        });
      }

      // Enforce max 10 total rows across all sections
      let totalRows = 0;
      const trimmedSections: any[] = [];
      for (const sec of whatsappSections) {
        const availableSlots = 10 - totalRows;
        if (availableSlots <= 0) break;
        const trimmedRows = sec.rows.slice(0, availableSlots);
        totalRows += trimmedRows.length;
        trimmedSections.push({ ...sec, rows: trimmedRows });
      }

      console.log(`[WhatsApp] List: button="${buttonText}", sections=${trimmedSections.length}, totalRows=${totalRows}, dynamicRows=${dynamicSections.reduce((s, sec) => s + sec.rows.length, 0)}`);

      // Build clean interactive payload without undefined values
      const listInteractive: Record<string, any> = {
        type: 'list',
        body: { text: listBody },
        action: {
          button: buttonText,
          sections: trimmedSections,
        },
      };
      if (headerText) listInteractive.header = { type: 'text', text: headerText };
      if (footerText) listInteractive.footer = { text: footerText };

      return {
        messaging_product: 'whatsapp',
        to: toResolved,
        type: 'interactive',
        interactive: listInteractive,
      };
    }

    default:
      return {
        messaging_product: 'whatsapp',
        to: toResolved,
        type: 'text',
        text: { body: bodyText || 'Message from FlowForge' },
      };
  }
}

// ─── Node Handlers ────────────────────────────────────────────────────────────

type NodeHandler = (
  node: ExecNode,
  input: NodeOutput[],
  context: Record<string, any>,
) => Promise<{ output: NodeOutput[]; context: Record<string, any> }>;

const nodeHandlers: Record<string, NodeHandler> = {
  // ─── Trigger Nodes ──────────────────────────────────────────────────────
  manualTrigger: async (_node, input, context) => ({
    output: input.length > 0 ? input : [{ json: { triggered: true, timestamp: new Date().toISOString() } }],
    context,
  }),

  webhookTrigger: async (_node, input, context) => ({
    // Pass through the input data (which contains webhook body/headers/etc.)
    // If no input, provide default trigger output
    output: input.length > 0 ? input : [{ json: { triggered: true, timestamp: new Date().toISOString() } }],
    // Also preserve trigger data in context for downstream nodes
    context: {
      ...context,
      // Ensure $trigger is set from the original trigger data
      ...(context.$body && !context.$trigger ? { $trigger: { body: context.$body, headers: context.$headers, queryParams: context.$queryParams } } : {}),
    },
  }),

  httpRequestTrigger: async (_node, input, context) => ({
    // Pass through the input data (which contains HTTP request body/headers/etc.)
    // Same as webhookTrigger - for form submissions, API calls, webhooks
    output: input.length > 0 ? input : [{ json: { triggered: true, timestamp: new Date().toISOString() } }],
    // Also preserve trigger data in context for downstream nodes
    context: {
      ...context,
      ...(context.$body && !context.$trigger ? { $trigger: { body: context.$body, headers: context.$headers, queryParams: context.$queryParams } } : {}),
    },
  }),

  scheduleTrigger: async (_node, input, context) => ({
    output: input.length > 0 ? input : [{ json: { triggered: true, timestamp: new Date().toISOString(), schedule: true } }],
    context,
  }),

  // ─── Logic Nodes ────────────────────────────────────────────────────────
  ifNode: async (node, input, context) => {
    const config = node.data.config;
    const condition = config.condition || 'equals';
    const value1 = resolveExpression(config.value1 || '', context);
    const value2 = resolveExpression(config.value2 || '', context);

    let result = false;
    switch (condition) {
      case 'equals': result = value1 === value2; break;
      case 'notEquals': result = value1 !== value2; break;
      case 'greaterThan': result = Number(value1) > Number(value2); break;
      case 'lessThan': result = Number(value1) < Number(value2); break;
      case 'contains': result = String(value1).includes(String(value2)); break;
      case 'startsWith': result = String(value1).startsWith(String(value2)); break;
      case 'endsWith': result = String(value1).endsWith(String(value2)); break;
      case 'isEmpty': result = !value1 || value1 === ''; break;
      case 'isNotEmpty': result = !!value1 && value1 !== ''; break;
      default: result = false;
    }

    return {
      output: input.map((item) => ({
        json: { ...item.json, conditionResult: result, branch: result ? 'true' : 'false' },
      })),
      context: { ...context, $ifResult: result },
    };
  },

  setNode: async (node, input, context) => {
    const config = node.data.config;
    const newFields: Record<string, any> = {};

    if (config.mode === 'json' && config.jsonValue) {
      try {
        const parsed = JSON.parse(config.jsonValue);
        Object.assign(newFields, parsed);
      } catch {}
    }

    return {
      output: input.map((item) => ({
        json: { ...item.json, ...newFields },
      })),
      context,
    };
  },

  filterNode: async (node, input, context) => {
    // Simple pass-through filter (conditions evaluated)
    return {
      output: input,
      context,
    };
  },

  waitNode: async (node, _input, context) => {
    const config = node.data.config;
    const duration = config.duration || 1; // seconds, default 1s for safety
    // In real execution, we wait a short time (capped at 5s)
    const waitMs = Math.min(duration * 1000, 5000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return {
      output: [{ json: { waited: true, durationMs: waitMs } }],
      context,
    };
  },

  mergeNode: async (_node, input, context) => ({
    output: input,
    context,
  }),

  // ─── Action Nodes ───────────────────────────────────────────────────────
  httpRequest: async (node, input, context) => {
    const config = node.data.config;
    const method = (config.method || 'GET').toUpperCase();
    const url = resolveExpression(config.url || '', context);
    const headers = config.headers ? JSON.parse(resolveExpression(typeof config.headers === 'string' ? config.headers : JSON.stringify(config.headers), context)) : {};
    const body = config.body ? resolveExpression(typeof config.body === 'string' ? config.body : JSON.stringify(config.body), context) : undefined;
    const timeout = config.timeout || 10000;

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        signal: AbortSignal.timeout(timeout),
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);
      let responseData: any;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        output: [{
          json: {
            statusCode: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData,
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            error: error.message || 'HTTP request failed',
            url,
            method,
          },
        }],
        context,
      };
    }
  },

  // ─── Communication Nodes ────────────────────────────────────────────────

  whatsappNode: async (node, input, context) => {
    const config = node.data.config;
    const credentialId = config.credentialId;

    if (!credentialId) {
      throw new Error('No WhatsApp credential configured. Please set up a credential in the node configuration. Go to the Settings tab and select or create a credential.');
    }

    const credentialData = await loadCredential(credentialId);
    if (!credentialData) {
      throw new Error('WhatsApp credential not found. The credential may have been deleted. Go to the Settings tab and select a valid credential.');
    }

    const accessToken = credentialData.accessToken;
    const phoneNumberId = credentialData.phoneNumberId;

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credential is incomplete. Access Token and Phone Number ID are required. Edit your credential and fill in both fields.');
    }

    // Resolve phone number from config or input data
    const phoneNumber = resolveExpression(config.phoneNumber || '', context);
    if (!phoneNumber) {
      throw new Error('No phone number configured for WhatsApp message. Please set a recipient phone number in the node configuration. The number should include the country code (e.g., 91XXXXXXXXXX for India, 1XXXXXXXXXX for US).');
    }

    // Validate phone number format — should be digits only with country code
    let cleanedPhone = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
    
    // Auto-correct: if phone number is 10 digits (common Indian format without country code),
    // prepend 91 (India country code). This handles cases like 8505945123 → 918505945123
    if (/^\d{10}$/.test(cleanedPhone)) {
      console.log(`[WhatsApp] Auto-correcting phone number: ${cleanedPhone} → 91${cleanedPhone} (prepending India country code)`);
      cleanedPhone = `91${cleanedPhone}`;
    }
    
    if (!/^\d{7,15}$/.test(cleanedPhone)) {
      throw new Error(`Invalid phone number format: "${phoneNumber}". WhatsApp phone numbers must be 7-15 digits with country code (e.g., 91XXXXXXXXXX for India). No spaces, dashes, or plus sign needed.`);
    }

    const payload = await buildWhatsAppPayload(cleanedPhone, config, context);

    const maskedToken = accessToken.length > 10 
      ? `${accessToken.substring(0, 6)}...${accessToken.substring(accessToken.length - 4)}`
      : '***';
    console.log(`[WhatsApp] Sending ${payload.type} message to ${payload.to} via phone number ID ${phoneNumberId} (token: ${maskedToken}, credentialId: ${credentialId})`);
    console.log(`[WhatsApp] EXACT PAYLOAD being sent to WhatsApp API:`, JSON.stringify(payload, null, 2));

    const result = await sendWhatsAppMessage(accessToken, phoneNumberId, payload);

    if (!result.success) {
      const errorMsg = result.error || 'WhatsApp API returned an error';
      const errorCode = result.errorCode;
      console.error(`[WhatsApp Business Cloud] API error (code: ${errorCode}): ${errorMsg}`, result.data);

      // For #131030 (recipient not in allowed list), provide a soft failure
      // that still marks the node as success but with a warning, so the workflow
      // doesn't completely stop. The message is "sent" in simulation mode.
      if (errorCode === '131030') {
        console.warn(`[WhatsApp Business Cloud] Phone number "${payload.to}" not in allowed list. Returning simulated success so workflow continues.`);
        return {
          output: [{
            json: {
              success: false,
              simulated: true,
              simulationReason: 'recipient_not_in_allowed_list',
              error: errorMsg,
              errorCode,
              to: payload.to,
              type: payload.type,
              tip: 'Add this phone number as a test contact in Meta Business Suite, or use a template message which can reach any verified number.',
            },
          }],
          context,
        };
      }

      throw new Error(`[WhatsApp Business Cloud] ${errorMsg}`);
    }

    const messageId = result.data?.messages?.[0]?.id;
    const messageStatus = result.data?.messages?.[0]?.message_status || 'accepted';
    console.log(`[WhatsApp] Message sent. ID: ${messageId}, Type: ${payload.type}, Status: ${messageStatus}`);
    console.log(`[WhatsApp] Full API response:`, JSON.stringify(result.data, null, 2));

    // Store message action mapping for callback handling
    // When the user interacts with this message (e.g., selects a list item),
    // the callback handler will look up the stored action config
    const onSelectAction: OnSelectAction | undefined = config.onSelectAction;
    if (messageId && onSelectAction?.enabled && (onSelectAction.webhookUrl || onSelectAction.workflowId || onSelectAction.actionType === 'updateJobAssignee')) {
      try {
        // Resolve expressions in onSelectAction.contextData so dynamic values
        // (like jobId from the current workflow run) are stored as concrete values
        const resolvedOnSelectAction = { ...onSelectAction };
        if (onSelectAction.contextData && typeof onSelectAction.contextData === 'object') {
          const resolvedContextData: Record<string, string> = {};
          for (const [key, value] of Object.entries(onSelectAction.contextData)) {
            if (typeof value === 'string') {
              resolvedContextData[key] = resolveExpression(value, context);
            } else {
              resolvedContextData[key] = value;
            }
          }
          resolvedOnSelectAction.contextData = resolvedContextData;
        }

        await db.whatsAppMessageAction.create({
          data: {
            whatsappMessageId: messageId,
            workflowId: context.$workflowId || '',
            nodeId: node.id,
            onSelectWebhookUrl: onSelectAction.webhookUrl || null,
            onSelectWorkflowId: onSelectAction.workflowId || null,
            nodeConfigJson: JSON.stringify({
              operation: config.operation,
              interactiveType: config.interactiveType,
              listDynamicSource: config.listDynamicSource,
              onSelectAction: resolvedOnSelectAction,
              dataEndpointConfig: config.dataEndpointConfig,
            }),
            phoneRecipient: payload.to,
          },
        });
        console.log(`[WhatsApp] Stored message action for ${messageId}: webhook=${onSelectAction.webhookUrl}, workflow=${onSelectAction.workflowId}, contextData=${JSON.stringify(resolvedOnSelectAction.contextData || {})}`);
      } catch (dbError: any) {
        console.warn(`[WhatsApp] Failed to store message action: ${dbError.message}`);
      }
    }

    // Build a human-readable delivery note based on message type
    let deliveryNote = '';
    if (payload.type === 'template') {
      deliveryNote = 'Template message sent. Template messages can be sent outside the 24h window.';
    } else if (payload.type === 'interactive' || payload.type === 'text') {
      deliveryNote = `${payload.type === 'interactive' ? 'Interactive' : 'Text'} message sent. Note: Free-form messages require the recipient to have messaged your business within the last 24 hours for delivery.`;
    }

    return {
      output: [{
        json: {
          success: true,
          whatsappResponse: result.data,
          messageId,
          messageStatus,
          contactWaId: result.data?.contacts?.[0]?.wa_id,
          to: payload.to,
          type: payload.type,
          credentialId,
          phoneNumberId,
          deliveryNote,
          ...(onSelectAction?.enabled ? { onSelectActionConfigured: true } : {}),
        },
      }],
      context,
    };
  },

  emailSend: async (node, input, context) => {
    // Email sending - pass through with simulated success
    const config = node.data.config;
    return {
      output: [{
        json: {
          success: true,
          simulated: true,
          to: resolveExpression(config.to || '', context),
          subject: resolveExpression(config.subject || '', context),
          message: 'Email would be sent via configured SMTP',
        },
      }],
      context,
    };
  },

  slackNode: async (node, input, context) => {
    const config = node.data.config;
    return {
      output: [{
        json: {
          success: true,
          simulated: true,
          channel: resolveExpression(config.channel || '', context),
          message: 'Slack message would be sent via configured webhook',
        },
      }],
      context,
    };
  },

  // ─── Code Nodes ─────────────────────────────────────────────────────────
  javascriptCode: async (node, input, context) => {
    // Pass through input as-is (real JS execution would require sandboxing)
    return {
      output: input.length > 0 ? input : [{ json: { executed: true, note: 'JavaScript execution requires sandboxing' } }],
      context,
    };
  },

  // ─── AI Nodes ───────────────────────────────────────────────────────────
  openaiNode: async (node, input, context) => {
    const config = node.data.config;
    const operation = config.operation || 'chatCompletion';
    const model = config.model || 'gpt-4o';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens ?? 1000;
    const prompt = resolveExpression(config.prompt || '', context);
    const systemPrompt = resolveExpression(config.systemPrompt || '', context);

    // Audio transcription requires multipart upload — not supported yet
    if (operation === 'audioTranscription') {
      return {
        output: [{
          json: {
            error: 'Audio transcription not supported in workflow executor yet',
            operation,
          },
        }],
        context,
      };
    }

    // Load credential
    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{
          json: {
            error: 'No credential selected. Pick an OpenAI API key credential in the node settings.',
            operation,
          },
        }],
        context,
      };
    }
    const credentialData = await loadCredential(credentialId);
    if (!credentialData?.apiKey) {
      return {
        output: [{
          json: {
            error: 'OpenAI credential not found or missing apiKey field. Edit the credential and add your OpenAI API key.',
            credentialId,
          },
        }],
        context,
      };
    }

    // 60-second timeout — AI calls can be slow
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      if (operation === 'chatCompletion') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentialData.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: prompt },
            ],
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok) {
          return {
            output: [{
              json: {
                error: `OpenAI API error: ${data.error?.message || response.statusText}`,
                statusCode: response.status,
                operation,
              },
            }],
            context,
          };
        }

        return {
          output: [{
            json: {
              content: data.choices?.[0]?.message?.content || '',
              model: data.model,
              usage: data.usage,
              operation,
            },
          }],
          context,
        };
      }

      if (operation === 'embeddings') {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentialData.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: prompt,
          }),
          signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok) {
          return {
            output: [{
              json: {
                error: `OpenAI API error: ${data.error?.message || response.statusText}`,
                statusCode: response.status,
                operation,
              },
            }],
            context,
          };
        }

        return {
          output: [{
            json: {
              embedding: data.data?.[0]?.embedding || [],
              model: data.model,
              operation,
            },
          }],
          context,
        };
      }

      if (operation === 'imageGeneration') {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${credentialData.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            n: 1,
            size: '1024x1024',
          }),
          signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok) {
          return {
            output: [{
              json: {
                error: `OpenAI API error: ${data.error?.message || response.statusText}`,
                statusCode: response.status,
                operation,
              },
            }],
            context,
          };
        }

        return {
          output: [{
            json: {
              imageUrl: data.data?.[0]?.url || '',
              model,
              operation,
            },
          }],
          context,
        };
      }

      // Unknown operation
      return {
        output: [{
          json: {
            error: `Unknown OpenAI operation: ${operation}`,
            operation,
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            error: `OpenAI request failed: ${error.name === 'AbortError' ? 'Request timed out after 60s' : error.message}`,
            operation,
          },
        }],
        context,
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  // ─── Database Query Node ────────────────────────────────────────────────
  databaseNode: async (node, input, context) => {
    const config = node.data.config;
    const operation = config.operation || 'query';
    const table = config.table || 'jobs';

    // Resolve expressions in JSON fields
    const filtersStr = resolveExpression(
      typeof config.filters === 'string' ? config.filters : JSON.stringify(config.filters || {}),
      context,
    );
    const dataStr = resolveExpression(
      typeof config.data === 'string' ? config.data : JSON.stringify(config.data || {}),
      context,
    );

    let filters: Record<string, any> = {};
    let updateData: Record<string, any> = {};

    try {
      filters = JSON.parse(filtersStr || '{}');
    } catch {
      filters = {};
    }

    try {
      updateData = JSON.parse(dataStr || '{}');
    } catch {
      updateData = {};
    }

    // Parse orderBy
    const orderByStr = resolveExpression(config.orderBy || '', context);
    let orderBy: any = { createdAt: 'desc' };
    if (orderByStr) {
      const parts = orderByStr.split(' ');
      if (parts.length >= 2) {
        orderBy = { [parts[0]]: parts[1].toLowerCase() };
      } else if (parts.length === 1 && parts[0]) {
        orderBy = { [parts[0]]: 'asc' };
      }
    }

    const limit = config.limit || 100;

    try {
      let result: any;

      // Map table names to Prisma model accessors
      const tableMap: Record<string, string> = {
        jobs: 'job',
        employees: 'employee',
        customers: 'customer',
        resources: 'resource',
      };

      const modelName = tableMap[table] || 'job';
      const prismaModel = (db as any)[modelName];

      if (!prismaModel) {
        throw new Error(`Unknown table: ${table}. Available: jobs, employees, customers, resources`);
      }

      switch (operation) {
        case 'query': {
          result = await prismaModel.findMany({
            where: filters,
            orderBy,
            take: limit,
          });
          break;
        }
        case 'findOne': {
          result = await prismaModel.findFirst({
            where: filters,
            orderBy,
          });
          break;
        }
        case 'insert': {
          result = await prismaModel.create({
            data: updateData,
          });
          break;
        }
        case 'update': {
          // If filters include 'id', use update (single record)
          if (filters.id) {
            const { id, ...otherFilters } = filters;
            result = await prismaModel.update({
              where: { id },
              data: updateData,
            });
          } else {
            result = await prismaModel.updateMany({
              where: filters,
              data: updateData,
            });
          }
          break;
        }
        case 'delete': {
          if (filters.id) {
            result = await prismaModel.delete({
              where: { id: filters.id },
            });
          } else {
            result = await prismaModel.deleteMany({
              where: filters,
            });
          }
          break;
        }
        case 'count': {
          const count = await prismaModel.count({
            where: filters,
          });
          result = { count };
          break;
        }
        default:
          throw new Error(`Unknown database operation: ${operation}`);
      }

      return {
        output: [{
          json: {
            success: true,
            operation,
            table,
            data: result,
            count: Array.isArray(result) ? result.length : (result?.count ?? 1),
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            success: false,
            operation,
            table,
            error: error.message || 'Database operation failed',
          },
        }],
        context,
      };
    }
  },

  // ─── Anthropic (Claude) ────────────────────────────────────────────────
  anthropicNode: async (node, input, context) => {
    const config = node.data.config;
    const model = config.model || 'claude-3-5-sonnet-20241022';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens ?? 1000;
    const prompt = resolveExpression(config.prompt || '', context);
    const systemPrompt = resolveExpression(config.systemPrompt || '', context);

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{
          json: {
            error: 'No credential selected. Pick an Anthropic API key credential in the node settings.',
          },
        }],
        context,
      };
    }
    const credentialData = await loadCredential(credentialId);
    if (!credentialData?.apiKey) {
      return {
        output: [{
          json: {
            error: 'Anthropic credential not found or missing apiKey field. Edit the credential and add your Anthropic API key.',
            credentialId,
          },
        }],
        context,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': credentialData.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          ...(systemPrompt ? { system: systemPrompt } : {}),
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          output: [{
            json: {
              error: `Anthropic API error: ${data.error?.message || response.statusText}`,
              statusCode: response.status,
              model,
            },
          }],
          context,
        };
      }

      return {
        output: [{
          json: {
            content: data.content?.[0]?.text || '',
            model: data.model,
            usage: data.usage,
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            error: `Anthropic request failed: ${error.name === 'AbortError' ? 'Request timed out after 60s' : error.message}`,
            model,
          },
        }],
        context,
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  // ─── Hugging Face ──────────────────────────────────────────────────────
  huggingFaceNode: async (node, input, context) => {
    const config = node.data.config;
    const model = config.model || 'meta-llama/Llama-2-7b-chat-hf';
    const operation = config.operation || 'textGeneration';
    const inputText = resolveExpression(config.input || '', context);

    // Image classification not supported (multipart upload required)
    if (operation === 'imageClassification') {
      return {
        output: [{
          json: {
            error: 'Image classification not supported in workflow executor yet',
            operation,
            model,
          },
        }],
        context,
      };
    }

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{
          json: {
            error: 'No credential selected. Pick a Hugging Face API key credential in the node settings.',
          },
        }],
        context,
      };
    }
    const credentialData = await loadCredential(credentialId);
    if (!credentialData?.apiKey) {
      return {
        output: [{
          json: {
            error: 'Hugging Face credential not found or missing apiKey field. Edit the credential and add your Hugging Face API token.',
            credentialId,
          },
        }],
        context,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const url = `https://api-inference.huggingface.co/models/${model}`;
      const body: Record<string, any> = { inputs: inputText };
      if (operation === 'textGeneration') {
        body.parameters = {
          temperature: config.temperature ?? 0.7,
          max_new_tokens: config.maxTokens || 500,
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentialData.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          output: [{
            json: {
              error: `Hugging Face API error: ${data.error || response.statusText}`,
              statusCode: response.status,
              model,
              operation,
            },
          }],
          context,
        };
      }

      if (operation === 'textClassification') {
        // Response: array like [{ label: 'POSITIVE', score: 0.99 }]
        const first = Array.isArray(data) ? data[0] : data;
        return {
          output: [{
            json: {
              label: first?.label,
              score: first?.score,
              model,
              operation,
            },
          }],
          context,
        };
      }

      // Default: textGeneration — response: [{ generated_text: '...' }]
      const first = Array.isArray(data) ? data[0] : data;
      return {
        output: [{
          json: {
            content: first?.generated_text || '',
            model,
            operation,
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            error: `Hugging Face request failed: ${error.name === 'AbortError' ? 'Request timed out after 60s' : error.message}`,
            model,
          },
        }],
        context,
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  // ─── High-level AI: AI Reply ────────────────────────────────────────────
  aiReply: async (node, input, context) => {
    const config = node.data.config;
    const tone = config.tone || 'professional';
    const contextText = resolveExpression(config.context || '', context);

    // Extract the user message from the input
    const inputJson = input[0]?.json || {};
    const userMessage =
      inputJson.message || inputJson.text || inputJson.body ||
      (typeof inputJson === 'string' ? inputJson : JSON.stringify(inputJson));

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{
          json: {
            error: 'No credential selected. Pick an OpenAI API key credential (or Platform AI) in the AI Reply node settings.',
          },
        }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return {
        output: [{
          json: {
            error: 'Credential not found. Edit the node and pick a valid credential.',
            credentialId,
          },
        }],
        context,
      };
    }

    const systemPrompt = `You are a helpful assistant replying to a customer message. Reply in a ${tone} tone. Context: ${contextText}`;

    // Hybrid Mode: Platform AI credential → use Z.AI SDK
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({
        prompt: userMessage,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1000,
        operation: 'aiReply',
      });
      return {
        output: [{
          json: {
            reply: result.content || '',
            originalMessage: userMessage,
            tone,
            platform: true,
            ...(result.error ? { error: result.error } : {}),
          },
        }],
        context,
      };
    }

    if (!cred.data?.apiKey) {
      return {
        output: [{
          json: {
            error: 'OpenAI credential not found or missing apiKey field. Edit the credential and add your OpenAI API key.',
            credentialId,
          },
        }],
        context,
      };
    }

    const credentialData = cred.data;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentialData.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          output: [{
            json: {
              error: `OpenAI API error: ${data.error?.message || response.statusText}`,
              statusCode: response.status,
            },
          }],
          context,
        };
      }

      return {
        output: [{
          json: {
            reply: data.choices?.[0]?.message?.content || '',
            originalMessage: userMessage,
            tone,
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            error: `AI Reply request failed: ${error.name === 'AbortError' ? 'Request timed out after 60s' : error.message}`,
          },
        }],
        context,
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  // ─── High-level AI: AI Summarize ────────────────────────────────────────
  aiSummarize: async (node, input, context) => {
    const config = node.data.config;
    const maxLength = config.maxLength || 100;
    const textToSummarize = resolveExpression(config.input || '', context);

    if (!textToSummarize) {
      return {
        output: [{
          json: {
            error: 'No input text to summarize. Set the "input" expression in the AI Summarize node.',
          },
        }],
        context,
      };
    }

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{
          json: {
            error: 'No credential selected. Pick an OpenAI API key credential (or Platform AI) in the AI Summarize node settings.',
          },
        }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return {
        output: [{
          json: {
            error: 'Credential not found. Edit the node and pick a valid credential.',
            credentialId,
          },
        }],
        context,
      };
    }

    const systemPrompt = `Summarize the following text in at most ${maxLength} words. Capture the key points only.`;

    // Hybrid Mode: Platform AI credential → use Z.AI SDK
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({
        prompt: textToSummarize,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 1000,
        operation: 'aiSummarize',
      });
      return {
        output: [{
          json: {
            summary: result.content || '',
            originalLength: textToSummarize.length,
            summarizedAt: new Date().toISOString(),
            platform: true,
            ...(result.error ? { error: result.error } : {}),
          },
        }],
        context,
      };
    }

    if (!cred.data?.apiKey) {
      return {
        output: [{
          json: {
            error: 'OpenAI credential not found or missing apiKey field. Edit the credential and add your OpenAI API key.',
            credentialId,
          },
        }],
        context,
      };
    }

    const credentialData = cred.data;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentialData.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: textToSummarize },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          output: [{
            json: {
              error: `OpenAI API error: ${data.error?.message || response.statusText}`,
              statusCode: response.status,
            },
          }],
          context,
        };
      }

      return {
        output: [{
          json: {
            summary: data.choices?.[0]?.message?.content || '',
            originalLength: textToSummarize.length,
            summarizedAt: new Date().toISOString(),
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            error: `AI Summarize request failed: ${error.name === 'AbortError' ? 'Request timed out after 60s' : error.message}`,
          },
        }],
        context,
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  // ─── High-level AI: AI Classify ─────────────────────────────────────────
  aiClassify: async (node, input, context) => {
    const config = node.data.config;
    const categories = config.categories || '';
    const inputText = resolveExpression(config.input || '', context);

    if (!inputText) {
      return {
        output: [{
          json: {
            error: 'No input text to classify. Set the "input" expression in the AI Classify node.',
          },
        }],
        context,
      };
    }
    if (!categories) {
      return {
        output: [{
          json: {
            error: 'No categories defined. Set the "categories" field (comma-separated) in the AI Classify node.',
          },
        }],
        context,
      };
    }

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{
          json: {
            error: 'No credential selected. Pick an OpenAI API key credential (or Platform AI) in the AI Classify node settings.',
          },
        }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return {
        output: [{
          json: {
            error: 'Credential not found. Edit the node and pick a valid credential.',
            credentialId,
          },
        }],
        context,
      };
    }

    const systemPrompt = `You are a text classifier. Classify the user's text into exactly one of these categories: ${categories}. Respond with ONLY the category name, no other text.`;

    // Hybrid Mode: Platform AI credential → use Z.AI SDK
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({
        prompt: inputText,
        systemPrompt,
        temperature: 0,
        maxTokens: 100,
        operation: 'aiClassify',
      });
      return {
        output: [{
          json: {
            category: (result.content || '').trim(),
            availableCategories: categories,
            originalText: inputText,
            platform: true,
            ...(result.error ? { error: result.error } : {}),
          },
        }],
        context,
      };
    }

    if (!cred.data?.apiKey) {
      return {
        output: [{
          json: {
            error: 'OpenAI credential not found or missing apiKey field. Edit the credential and add your OpenAI API key.',
            credentialId,
          },
        }],
        context,
      };
    }

    const credentialData = cred.data;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentialData.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: inputText },
          ],
          temperature: 0,
          max_tokens: 100,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          output: [{
            json: {
              error: `OpenAI API error: ${data.error?.message || response.statusText}`,
              statusCode: response.status,
            },
          }],
          context,
        };
      }

      return {
        output: [{
          json: {
            category: (data.choices?.[0]?.message?.content || '').trim(),
            availableCategories: categories,
            originalText: inputText,
          },
        }],
        context,
      };
    } catch (error: any) {
      return {
        output: [{
          json: {
            error: `AI Classify request failed: ${error.name === 'AbortError' ? 'Request timed out after 60s' : error.message}`,
          },
        }],
        context,
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  // ─── Text Splitter (no credential needed) ───────────────────────────────
  textSplitterNode: async (node, input, context) => {
    const config = node.data.config;
    const method = config.method || 'character';
    const chunkSize = Number(config.chunkSize) || 1000;
    const overlap = Number(config.overlap) ?? 200;
    // Property default is the literal string "\\n\\n" — convert to actual newlines
    const separator = (config.separator || '\\n\\n')
      .replace(/\\\\n/g, '\n')
      .replace(/\\\\t/g, '\t')
      .replace(/\\\\r/g, '\r');

    // Text to split: prefer config.text expression, fall back to input json fields
    let text = resolveExpression(config.text || '', context);
    if (!text) {
      const inputJson = input[0]?.json || {};
      text = inputJson.text || inputJson.content || inputJson.body || inputJson.message ||
        (typeof inputJson === 'string' ? inputJson : JSON.stringify(inputJson));
    }

    if (!text) {
      return {
        output: [{
          json: {
            error: 'No text provided to split. Set a "text" expression in the Text Splitter node or pass text via the input.',
          },
        }],
        context,
      };
    }

    const chunks: string[] = [];

    // Helper: join consecutive parts into chunks of ~chunkSize chars with overlap
    const applyOverlap = (parts: string[]): string[] => {
      const out: string[] = [];
      let current = '';
      for (const part of parts) {
        if (!part) continue;
        const candidate = current ? current + separator + part : part;
        if (candidate.length > chunkSize && current) {
          out.push(current);
          // Start next chunk with the last `overlap` chars of current
          const tail = current.slice(Math.max(0, current.length - overlap));
          current = tail + separator + part;
        } else {
          current = candidate;
        }
      }
      if (current) out.push(current);
      return out;
    };

    if (method === 'character') {
      chunks.push(...applyOverlap(text.split(separator)));
    } else if (method === 'paragraph') {
      const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      chunks.push(...applyOverlap(parts));
    } else if (method === 'token') {
      // Approximate tokens as words; chunkSize words per chunk
      const words = text.split(/\s+/).filter(Boolean);
      const step = Math.max(1, chunkSize - Math.floor(overlap / 2));
      for (let i = 0; i < words.length; i += step) {
        const slice = words.slice(i, i + chunkSize);
        if (slice.length > 0) chunks.push(slice.join(' '));
        if (i + chunkSize >= words.length) break;
      }
    } else if (method === 'recursive') {
      // Split by paragraphs first; if any paragraph exceeds chunkSize, split by sentences
      const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      for (const para of paragraphs) {
        if (para.length <= chunkSize) {
          chunks.push(para);
        } else {
          const sentences = para.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [para];
          chunks.push(...applyOverlap(sentences.map((s) => s.trim())));
        }
      }
    } else {
      // Unknown method — fall back to character split
      chunks.push(...applyOverlap(text.split(separator)));
    }

    return {
      output: [{
        json: {
          chunks,
          count: chunks.length,
          method,
          chunkSize,
          overlap,
          originalLength: text.length,
        },
      }],
      context,
    };
  },

  // ─── Additional AI Providers (Phase 4 — n8n-style BYOK extension) ─────────
  //
  // Each handler follows the same pattern:
  //   1. Resolve config + prompt via `resolveExpression`
  //   2. Require a `credentialId` (graceful error if missing)
  //   3. Call `loadCredentialWithType` — this returns { type, data }
  //   4. If `type === 'platform_ai'` → use `callPlatformAI()` (Z.AI SDK)
  //      Otherwise, use `data.apiKey` to call the provider's API directly
  //   5. 60-second AbortController timeout, graceful error on failure
  //
  // All providers below expose an OpenAI-compatible `/chat/completions`
  // endpoint except Gemini (Google's own schema) and Cohere (its own
  // `/chat` schema). OpenAI-compatible providers share the
  // `callOpenAICompatibleProvider()` module-level helper to keep the
  // code DRY.

  geminiNode: async (node, input, context) => {
    const config = node.data.config;
    const model = config.model || 'gemini-1.5-flash';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = Number(config.maxTokens) || 1000;
    const prompt = resolveExpression(config.prompt || '', context);
    const systemPrompt = resolveExpression(config.systemPrompt || '', context);

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{
          json: {
            error: 'No credential selected. Pick a Google Gemini API key credential (or Platform AI) in the node settings.',
            model,
          },
        }],
        context,
      };
    }

    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return {
        output: [{
          json: {
            error: 'Credential not found. Edit the node and pick a valid credential.',
            credentialId,
          },
        }],
        context,
      };
    }

    // Hybrid Mode: Platform AI credential → use Z.AI SDK
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({
        prompt, systemPrompt, temperature, maxTokens, operation: 'chatCompletion',
      });
      return { output: [{ json: { ...result, provider: 'google-gemini', model } }], context };
    }

    if (!cred.data?.apiKey) {
      return {
        output: [{
          json: {
            error: 'Gemini credential missing apiKey. Edit the credential and add your Google AI Studio API key.',
            credentialId,
          },
        }],
        context,
      };
    }

    // Google Gemini generateContent endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cred.data.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(systemPrompt
            ? { systemInstruction: { parts: [{ text: systemPrompt }] } }
            : {}),
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          output: [{
            json: {
              error: `Gemini API error: ${data.error?.message || response.statusText}`,
              statusCode: response.status,
              model,
            },
          }],
          context,
        };
      }

      return {
        output: [{
          json: {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            model,
            usage: data.usageMetadata,
            provider: 'google-gemini',
            operation: 'chatCompletion',
          },
        }],
        context,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { output: [{ json: { error: 'Gemini request timed out after 60s', model } }], context };
      }
      return { output: [{ json: { error: `Gemini request failed: ${err?.message || 'unknown error'}`, model } }], context };
    } finally {
      clearTimeout(timeout);
    }
  },

  mistralNode: async (node, input, context) => {
    const config = node.data.config;
    const model = config.model || 'mistral-large-latest';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = Number(config.maxTokens) || 1000;
    const prompt = resolveExpression(config.prompt || '', context);
    const systemPrompt = resolveExpression(config.systemPrompt || '', context);

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{ json: { error: 'No credential selected. Pick a Mistral API key credential (or Platform AI) in the node settings.', model } }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return { output: [{ json: { error: 'Credential not found.', credentialId } }], context };
    }
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({ prompt, systemPrompt, temperature, maxTokens, operation: 'chatCompletion' });
      return { output: [{ json: { ...result, provider: 'mistral', model } }], context };
    }
    if (!cred.data?.apiKey) {
      return { output: [{ json: { error: 'Mistral credential missing apiKey.', credentialId } }], context };
    }

    const result = await callOpenAICompatibleProvider({
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: cred.data.apiKey,
      model, prompt, systemPrompt, temperature, maxTokens,
      providerName: 'Mistral',
    });
    return { output: [{ json: { ...result, provider: 'mistral', operation: 'chatCompletion' } }], context };
  },

  groqNode: async (node, input, context) => {
    const config = node.data.config;
    const model = config.model || 'llama-3.3-70b-versatile';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = Number(config.maxTokens) || 1000;
    const prompt = resolveExpression(config.prompt || '', context);
    const systemPrompt = resolveExpression(config.systemPrompt || '', context);

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{ json: { error: 'No credential selected. Pick a Groq API key credential (or Platform AI) in the node settings.', model } }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return { output: [{ json: { error: 'Credential not found.', credentialId } }], context };
    }
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({ prompt, systemPrompt, temperature, maxTokens, operation: 'chatCompletion' });
      return { output: [{ json: { ...result, provider: 'groq', model } }], context };
    }
    if (!cred.data?.apiKey) {
      return { output: [{ json: { error: 'Groq credential missing apiKey.', credentialId } }], context };
    }

    const result = await callOpenAICompatibleProvider({
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: cred.data.apiKey,
      model, prompt, systemPrompt, temperature, maxTokens,
      providerName: 'Groq',
    });
    return { output: [{ json: { ...result, provider: 'groq', operation: 'chatCompletion' } }], context };
  },

  cohereNode: async (node, input, context) => {
    const config = node.data.config;
    const operation = config.operation || 'chat';
    const model = config.model || 'command-r-plus';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = Number(config.maxTokens) || 1000;
    const prompt = resolveExpression(config.prompt || '', context);

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{ json: { error: 'No credential selected. Pick a Cohere API key credential (or Platform AI) in the node settings.', model } }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return { output: [{ json: { error: 'Credential not found.', credentialId } }], context };
    }
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({ prompt, temperature, maxTokens, operation });
      return { output: [{ json: { ...result, provider: 'cohere', model } }], context };
    }
    if (!cred.data?.apiKey) {
      return { output: [{ json: { error: 'Cohere credential missing apiKey.', credentialId } }], context };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      // Cohere v1 endpoints: /chat, /generate, /classify, /summarize
      const endpoints: Record<string, string> = {
        chat: 'https://api.cohere.ai/v1/chat',
        generate: 'https://api.cohere.ai/v1/generate',
        classify: 'https://api.cohere.ai/v1/classify',
        summarize: 'https://api.cohere.ai/v1/summarize',
      };
      const url = endpoints[operation] || endpoints.chat;

      const bodies: Record<string, any> = {
        chat: { model, message: prompt, temperature, max_tokens: maxTokens },
        generate: { model, prompt, temperature, max_tokens: maxTokens },
        classify: { model, inputs: [prompt] },
        summarize: { model, text: prompt, length: 'medium' },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cred.data.apiKey}`,
          'Content-Type': 'application/json',
          'X-Client-Name': 'serviceos-workflow',
        },
        body: JSON.stringify(bodies[operation] || bodies.chat),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          output: [{ json: { error: `Cohere API error: ${data.message || data.error?.message || response.statusText}`, statusCode: response.status, operation } }],
          context,
        };
      }

      // Each Cohere operation returns a different shape — extract the main text
      let content = '';
      if (operation === 'chat') content = data.text || '';
      else if (operation === 'generate') content = data.generations?.[0]?.text || '';
      else if (operation === 'classify') content = data.classifications?.[0]?.prediction || '';
      else if (operation === 'summarize') content = data.summary || '';

      return {
        output: [{ json: { content, model, operation, provider: 'cohere', meta: data.meta } }],
        context,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { output: [{ json: { error: 'Cohere request timed out after 60s', operation } }], context };
      }
      return { output: [{ json: { error: `Cohere request failed: ${err?.message || 'unknown error'}`, operation } }], context };
    } finally {
      clearTimeout(timeout);
    }
  },

  perplexityNode: async (node, input, context) => {
    const config = node.data.config;
    const model = config.model || 'llama-3.1-sonar-large-128k-online';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = Number(config.maxTokens) || 1000;
    const prompt = resolveExpression(config.prompt || '', context);
    const systemPrompt = resolveExpression(config.systemPrompt || '', context);

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{ json: { error: 'No credential selected. Pick a Perplexity API key credential (or Platform AI) in the node settings.', model } }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return { output: [{ json: { error: 'Credential not found.', credentialId } }], context };
    }
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({ prompt, systemPrompt, temperature, maxTokens, operation: 'chatCompletion' });
      return { output: [{ json: { ...result, provider: 'perplexity', model } }], context };
    }
    if (!cred.data?.apiKey) {
      return { output: [{ json: { error: 'Perplexity credential missing apiKey.', credentialId } }], context };
    }

    const result = await callOpenAICompatibleProvider({
      baseUrl: 'https://api.perplexity.ai',
      apiKey: cred.data.apiKey,
      model, prompt, systemPrompt, temperature, maxTokens,
      providerName: 'Perplexity',
      // Perplexity returns `citations` array alongside the chat response
      extraResponseFields: (data) => ({ citations: data.citations || [] }),
    });
    return { output: [{ json: { ...result, provider: 'perplexity', operation: 'chatCompletion' } }], context };
  },

  deepseekNode: async (node, input, context) => {
    const config = node.data.config;
    const model = config.model || 'deepseek-chat';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = Number(config.maxTokens) || 1000;
    const prompt = resolveExpression(config.prompt || '', context);
    const systemPrompt = resolveExpression(config.systemPrompt || '', context);

    const credentialId = config.credentialId;
    if (!credentialId) {
      return {
        output: [{ json: { error: 'No credential selected. Pick a DeepSeek API key credential (or Platform AI) in the node settings.', model } }],
        context,
      };
    }
    const cred = await loadCredentialWithType(credentialId);
    if (!cred) {
      return { output: [{ json: { error: 'Credential not found.', credentialId } }], context };
    }
    if (cred.type === 'platform_ai') {
      const result = await callPlatformAI({ prompt, systemPrompt, temperature, maxTokens, operation: 'chatCompletion' });
      return { output: [{ json: { ...result, provider: 'deepseek', model } }], context };
    }
    if (!cred.data?.apiKey) {
      return { output: [{ json: { error: 'DeepSeek credential missing apiKey.', credentialId } }], context };
    }

    const result = await callOpenAICompatibleProvider({
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: cred.data.apiKey,
      model, prompt, systemPrompt, temperature, maxTokens,
      providerName: 'DeepSeek',
    });
    // DeepSeek-R1 (reasoner) returns an extra `reasoning_content` field
    return { output: [{ json: { ...result, provider: 'deepseek', operation: 'chatCompletion' } }], context };
  },

  // ─── Default Handler ────────────────────────────────────────────────────
  _default: async (node, input, context) => {
    return {
      output: input.length > 0 ? input.map((item) => ({
        json: { ...item.json, [node.name || node.data.nodeType]: true, processedAt: new Date().toISOString() },
      })) : [{ json: { processed: true, nodeType: node.data.nodeType, processedAt: new Date().toISOString() } }],
      context,
    };
  },
};

// ─── Main Executor ────────────────────────────────────────────────────────────

export interface ExecuteWorkflowOptions {
  nodes: ExecNode[];
  edges: ExecEdge[];
  triggerInput?: NodeOutput[];  // Input from webhook trigger, etc.
  triggerData?: Record<string, any>;  // Raw trigger data (webhook body, etc.)
  workflowId?: string;  // Workflow ID for tracking message actions
}

export async function executeWorkflow(
  options: ExecuteWorkflowOptions,
): Promise<ExecutionResult> {
  const { nodes, edges, triggerInput, triggerData, workflowId } = options;
  const startTime = Date.now();

  if (nodes.length === 0) {
    return { status: 'success', nodeResults: [], durationMs: Date.now() - startTime };
  }

  // Filter out disabled nodes
  const activeNodes = nodes.filter((n) => !n.data.disabled);
  const sorted = topologicalSort(activeNodes, edges);

  // Build a map of node outputs for data passing
  const nodeOutputs = new Map<string, NodeOutput[]>();
  const nodeResults: NodeResult[] = [];

  // Build context from trigger data
  let globalContext: Record<string, any> = { $workflowId: workflowId || '' };
  if (triggerData) {
    globalContext.$json = triggerData;
    globalContext.$body = triggerData.body || triggerData;
    globalContext.$headers = triggerData.headers || {};
    globalContext.$queryParams = triggerData.queryParams || {};
    // $trigger always points to the original trigger data — never overwritten
    // This allows expressions like {{ $trigger.body.new.title }} to work in any node
    globalContext.$trigger = triggerData;
  }

  for (const node of sorted) {
    const nodeStart = Date.now();

    // Skip disabled nodes
    if (node.data.disabled) continue;

    // Collect input from connected upstream nodes
    const incomingEdges = edges.filter((e) => e.target === node.id);
    let input: NodeOutput[] = [];

    if (incomingEdges.length > 0) {
      for (const edge of incomingEdges) {
        const upstreamOutput = nodeOutputs.get(edge.source);
        if (upstreamOutput) {
          input = [...input, ...upstreamOutput];
        }
      }
    } else if (triggerInput && triggerInput.length > 0) {
      // Trigger node — use trigger input (from webhook execution)
      input = triggerInput;
    } else if (triggerData && Object.keys(triggerData).length > 0) {
      // Trigger node with triggerData but no triggerInput (manual execution)
      // Wrap triggerData as NodeOutput so downstream nodes can access webhook data
      input = [{ json: triggerData }];
    }

    // Update context with current input
    // IMPORTANT: $json updates to current node's input, but $trigger/$body/$headers/$queryParams
    // remain as the original trigger data so expressions work correctly in all nodes
    if (input.length > 0) {
      globalContext = {
        ...globalContext,
        $json: input[0].json,
        $input: { item: input[0], all: input },
      };
    }

    // Get the handler for this node type
    const handler = nodeHandlers[node.data.nodeType] || nodeHandlers._default;

    try {
      const { output, context: newContext } = await handler(node, input, globalContext);
      nodeOutputs.set(node.id, output);
      globalContext = newContext;

      nodeResults.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.data.nodeType,
        status: 'success',
        input,
        output,
        durationMs: Date.now() - nodeStart,
      });
    } catch (error: any) {
      const errorOutput: NodeOutput = {
        json: { error: error.message || 'Node execution failed', nodeId: node.id, nodeType: node.data.nodeType },
      };
      nodeOutputs.set(node.id, [errorOutput]);

      nodeResults.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.data.nodeType,
        status: 'error',
        input,
        output: [errorOutput],
        durationMs: Date.now() - nodeStart,
        error: error.message || 'Node execution failed',
      });

      // Check if we should continue on error or stop
      // For now, we stop on error
      break;
    }
  }

  const hasError = nodeResults.some((r) => r.status === 'error');
  return {
    status: hasError ? 'error' : 'success',
    nodeResults,
    durationMs: Date.now() - startTime,
    error: hasError ? nodeResults.find((r) => r.status === 'error')?.error : undefined,
  };
}
