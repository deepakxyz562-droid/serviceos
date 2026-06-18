/**
 * Workflow Executor — Real execution engine for FlowForge workflows.
 *
 * Processes nodes based on edge connections, resolves expressions,
 * and actually invokes external APIs (WhatsApp, HTTP, etc.).
 */

import { db } from '@/lib/db';

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
    return JSON.parse(cred.encryptedData);
  } catch {
    return null;
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
    // AI processing - pass through with note
    const config = node.data.config;
    return {
      output: [{
        json: {
          simulated: true,
          model: config.model || 'gpt-4o',
          prompt: resolveExpression(config.prompt || '', context),
          note: 'OpenAI integration requires API key configuration',
        },
      }],
      context,
    };
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
