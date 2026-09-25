import { NextRequest, NextResponse } from 'next/server';

/**
 * MCP (Model Context Protocol) Endpoint
 * GET /api/mcp — returns the list of available tools
 * POST /api/mcp — invokes a tool
 *
 * This allows Claude, ChatGPT, or any MCP-compatible AI assistant
 * to discover and use GPTForm capabilities.
 *
 * Available tools:
 *   - generate_form — create a form from a natural language prompt
 *   - list_forms — list user's forms
 *   - get_form — get form details by ID
 *   - create_form — create a form manually
 *   - update_form — update form name/description/fields
 *   - publish_form — publish a form
 *   - add_field — add a field to a form
 *   - delete_form — archive a form
 */

const TOOLS = [
  {
    name: 'generate_form',
    description: 'Generate a form using AI from a natural language prompt. Returns the form ID, title, URL, and fields.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Natural language description of the form to create' },
        industry: { type: 'string', description: 'Industry context (e.g. plumbing, HVAC, roofing)' },
        style: { type: 'string', enum: ['classic', 'card'], description: 'Form layout style' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'list_forms',
    description: 'List all forms for the authenticated user. Returns form IDs, titles, and statuses.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_form',
    description: 'Get details of a specific form by ID or slug. Returns fields, theme, and settings.',
    inputSchema: {
      type: 'object',
      properties: { formId: { type: 'string', description: 'Form ID or slug' } },
      required: ['formId'],
    },
  },
  {
    name: 'create_form',
    description: 'Create a form manually with specified fields. Returns the form ID and URL.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        fields: { type: 'array', description: 'Array of field definitions' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_form',
    description: 'Update a form. Can update name, description, fields, or theme.',
    inputSchema: {
      type: 'object',
      properties: {
        formId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        fields: { type: 'array' },
      },
      required: ['formId'],
    },
  },
  {
    name: 'publish_form',
    description: 'Publish a form (set status to active). Returns the public URL.',
    inputSchema: {
      type: 'object',
      properties: { formId: { type: 'string' } },
      required: ['formId'],
    },
  },
  {
    name: 'add_field',
    description: 'Add a field to an existing form.',
    inputSchema: {
      type: 'object',
      properties: {
        formId: { type: 'string' },
        label: { type: 'string' },
        type: { type: 'string' },
        widgetType: { type: 'string' },
        required: { type: 'boolean' },
      },
      required: ['formId', 'label', 'type'],
    },
  },
  {
    name: 'delete_form',
    description: 'Archive (soft delete) a form.',
    inputSchema: {
      type: 'object',
      properties: { formId: { type: 'string' } },
      required: ['formId'],
    },
  },
];

/** GET /api/mcp — list available tools */
export async function GET() {
  return NextResponse.json({
    server: 'fieseros-gptform',
    version: '1.0.0',
    tools: TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  });
}

/** POST /api/mcp — invoke a tool */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, arguments: args } = body;

    // Forward to the v1 API with the same x-api-key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'x-api-key header required' }, { status: 401 });
    }

    const toolEndpoints: Record<string, { method: string; path: string }> = {
      generate_form: { method: 'POST', path: '/api/v1/forms/generate' },
      list_forms: { method: 'GET', path: '/api/v1/forms' },
      get_form: { method: 'GET', path: `/api/v1/forms/${args?.formId}` },
      create_form: { method: 'POST', path: '/api/v1/forms' },
      update_form: { method: 'PUT', path: `/api/v1/forms/${args?.formId}` },
      publish_form: { method: 'POST', path: `/api/v1/forms/${args?.formId}/publish` },
      add_field: { method: 'POST', path: `/api/v1/forms/${args?.formId}/fields` },
      delete_form: { method: 'DELETE', path: `/api/v1/forms/${args?.formId}` },
    };

    const endpoint = toolEndpoints[tool];
    if (!endpoint) {
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }

    // Forward the request internally
    const baseUrl = new URL(request.url).origin;
    const res = await fetch(`${baseUrl}${endpoint.path}`, {
      method: endpoint.method,
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: endpoint.method !== 'GET' ? JSON.stringify(args) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Tool execution failed' }, { status: res.status });
    }

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error('[mcp] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
