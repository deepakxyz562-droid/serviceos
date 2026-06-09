import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==========================================
// WHATSAPP WORKFLOW TEMPLATE DEFINITIONS
// ==========================================

interface TemplateNode {
  type: string;
  name: string;
  subtype: string;
  config: Record<string, unknown>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'employee' | 'customer' | 'full';
  icon: string;
  triggerEvent: string;
  nodes: TemplateNode[];
}

const WHATSAPP_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'emp-assign-notify',
    name: 'Employee Assignment Notification',
    description: 'Send WhatsApp message to employee when a job is assigned with Accept/Reject buttons',
    category: 'employee',
    icon: 'UserCheck',
    triggerEvent: 'job_status_changed',
    nodes: [
      { type: 'trigger', name: 'Job Assigned', subtype: 'job_status_changed', config: { status: 'assigned' } },
      { type: 'whatsapp', name: 'Send to Employee', subtype: 'send_message', config: { template: 'job_assignment', includeButtons: true } },
    ],
  },
  {
    id: 'cust-assign-notify',
    name: 'Customer Assignment Notification',
    description: 'Notify customer when a technician is assigned to their job',
    category: 'customer',
    icon: 'User',
    triggerEvent: 'job_status_changed',
    nodes: [
      { type: 'trigger', name: 'Job Assigned', subtype: 'job_status_changed', config: { status: 'assigned' } },
      { type: 'whatsapp', name: 'Send to Customer', subtype: 'send_message', config: { template: 'customer_assignment' } },
    ],
  },
  {
    id: 'cust-started-notify',
    name: 'Technician On The Way',
    description: 'Notify customer when the technician starts the job and is on the way',
    category: 'customer',
    icon: 'Truck',
    triggerEvent: 'job_status_changed',
    nodes: [
      { type: 'trigger', name: 'Job Started', subtype: 'job_status_changed', config: { status: 'in_progress' } },
      { type: 'whatsapp', name: 'Send to Customer', subtype: 'send_message', config: { template: 'customer_started' } },
    ],
  },
  {
    id: 'cust-completed-notify',
    name: 'Job Completion + Review Request',
    description: 'Notify customer when job is completed and ask for a review',
    category: 'customer',
    icon: 'Star',
    triggerEvent: 'job_status_changed',
    nodes: [
      { type: 'trigger', name: 'Job Completed', subtype: 'job_status_changed', config: { status: 'completed' } },
      { type: 'delay', name: 'Wait 2 Hours', subtype: 'delay', config: { duration: 7200000 } },
      { type: 'whatsapp', name: 'Review Request', subtype: 'send_message', config: { template: 'review_request' } },
    ],
  },
  {
    id: 'full-lifecycle',
    name: 'Full Job Lifecycle Notifications',
    description: 'Complete notification chain: Assignment → Start → Completion → Review request',
    category: 'full',
    icon: 'Workflow',
    triggerEvent: 'job_status_changed',
    nodes: [
      { type: 'trigger', name: 'Job Status Changed', subtype: 'job_status_changed', config: {} },
      { type: 'switch', name: 'Route by Status', subtype: 'switch', config: { field: 'status', cases: ['assigned', 'in_progress', 'completed'] } },
      { type: 'whatsapp', name: 'Employee Assignment', subtype: 'send_message', config: { template: 'job_assignment', recipientRole: 'employee' } },
      { type: 'whatsapp', name: 'Customer Assignment', subtype: 'send_message', config: { template: 'customer_assignment', recipientRole: 'customer' } },
      { type: 'whatsapp', name: 'Customer Started', subtype: 'send_message', config: { template: 'customer_started', recipientRole: 'customer' } },
      { type: 'whatsapp', name: 'Customer Completed', subtype: 'send_message', config: { template: 'customer_completed', recipientRole: 'customer' } },
      { type: 'delay', name: 'Wait 2 Hours', subtype: 'delay', config: { duration: 7200000 } },
      { type: 'whatsapp', name: 'Review Request', subtype: 'send_message', config: { template: 'review_request', recipientRole: 'customer' } },
    ],
  },
  {
    id: 'booking-confirm',
    name: 'Booking Confirmation',
    description: 'Send confirmation WhatsApp message when customer creates a booking',
    category: 'customer',
    icon: 'CalendarCheck',
    triggerEvent: 'job_created',
    nodes: [
      { type: 'trigger', name: 'Job Created', subtype: 'job_created', config: {} },
      { type: 'whatsapp', name: 'Booking Confirmation', subtype: 'send_message', config: { template: 'booking_confirmation', recipientRole: 'customer' } },
    ],
  },
];

// ==========================================
// HELPER: Convert template nodes to workflow nodes/edges
// ==========================================

function templateNodesToWorkflow(template: WorkflowTemplate) {
  const xOffset = 300;
  const yOffset = 150;

  const nodes = template.nodes.map((node, index) => {
    const nodeType = mapTemplateTypeToNodeType(node.type, node.subtype);
    return {
      id: `node_${index}`,
      type: 'customNode',
      name: node.name,
      position: { x: index * xOffset, y: node.type === 'switch' ? 0 : (index % 2 === 0 ? 0 : yOffset) },
      data: {
        nodeType,
        config: node.config,
        notes: '',
        disabled: false,
      },
    };
  });

  const edges: Array<{ id: string; source: string; target: string; sourcePort?: string; targetPort?: string; type?: string; animated?: boolean; label?: string }> = [];

  if (template.id === 'full-lifecycle') {
    // Full lifecycle has switch node with branches
    // Trigger -> Switch
    edges.push({
      id: 'edge_0',
      source: 'node_0',
      target: 'node_1',
      sourcePort: 'main',
      targetPort: 'main',
      type: 'smoothstep',
      animated: true,
    });

    // Switch -> Employee Assignment (assigned case)
    edges.push({
      id: 'edge_1',
      source: 'node_1',
      target: 'node_2',
      sourcePort: 'output0',
      targetPort: 'main',
      type: 'smoothstep',
      label: 'assigned',
    });

    // Switch -> Customer Assignment (assigned case, same branch)
    edges.push({
      id: 'edge_2',
      source: 'node_2',
      target: 'node_3',
      sourcePort: 'main',
      targetPort: 'main',
      type: 'smoothstep',
    });

    // Switch -> Customer Started (in_progress case)
    edges.push({
      id: 'edge_3',
      source: 'node_1',
      target: 'node_4',
      sourcePort: 'output1',
      targetPort: 'main',
      type: 'smoothstep',
      label: 'in_progress',
    });

    // Switch -> Customer Completed (completed case)
    edges.push({
      id: 'edge_4',
      source: 'node_1',
      target: 'node_5',
      sourcePort: 'output2',
      targetPort: 'main',
      type: 'smoothstep',
      label: 'completed',
    });

    // Customer Completed -> Delay
    edges.push({
      id: 'edge_5',
      source: 'node_5',
      target: 'node_6',
      sourcePort: 'main',
      targetPort: 'main',
      type: 'smoothstep',
    });

    // Delay -> Review Request
    edges.push({
      id: 'edge_6',
      source: 'node_6',
      target: 'node_7',
      sourcePort: 'main',
      targetPort: 'main',
      type: 'smoothstep',
      animated: true,
    });
  } else {
    // Linear flow: connect nodes sequentially
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge_${i}`,
        source: `node_${i}`,
        target: `node_${i + 1}`,
        sourcePort: 'main',
        targetPort: 'main',
        type: 'smoothstep',
        animated: i === 0,
      });
    }
  }

  return { nodes, edges };
}

function mapTemplateTypeToNodeType(type: string, subtype: string): string {
  switch (type) {
    case 'trigger':
      if (subtype === 'job_status_changed') return 'webhookTrigger';
      if (subtype === 'job_created') return 'webhookTrigger';
      return 'manualTrigger';
    case 'whatsapp':
      return 'whatsappNode';
    case 'switch':
      return 'switchNode';
    case 'delay':
      return 'waitNode';
    default:
      return 'manualTrigger';
  }
}

// ==========================================
// GET: List workflow templates
// ==========================================

export async function GET() {
  try {
    // Check which templates are already installed as workflows
    const existingWorkflows = await db.workflow.findMany({
      where: {
        name: { in: WHATSAPP_WORKFLOW_TEMPLATES.map((t) => t.name) },
      },
      select: { name: true, id: true, active: true },
    });

    const installedMap = new Map(existingWorkflows.map((w) => [w.name, { id: w.id, active: w.active }]));

    const templates = WHATSAPP_WORKFLOW_TEMPLATES.map((t) => {
      const installed = installedMap.get(t.name);
      const workflowData = templateNodesToWorkflow(t);
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        icon: t.icon,
        triggerEvent: t.triggerEvent,
        nodeCount: t.nodes.length,
        nodesJson: workflowData.nodes,
        edgesJson: workflowData.edges,
        installed: !!installed,
        installedWorkflowId: installed?.id || null,
        installedActive: installed?.active || false,
      };
    });

    return NextResponse.json({ templates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch workflow templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==========================================
// POST: Create workflow from template
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, workspaceId, credentialId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const template = WHATSAPP_WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if already installed
    const existing = await db.workflow.findFirst({
      where: { name: template.name },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Workflow already installed', workflow: { id: existing.id, name: existing.name } },
        { status: 409 },
      );
    }

    // Convert template to workflow nodes/edges
    const { nodes, edges } = templateNodesToWorkflow(template);

    // If credentialId provided, add it to WhatsApp node configs
    if (credentialId) {
      for (const node of nodes) {
        if (node.data.nodeType === 'whatsappNode') {
          node.data.config.credentialId = credentialId;
        }
      }
    }

    // Create the workflow in the database
    const workflow = await db.workflow.create({
      data: {
        name: template.name,
        description: template.description,
        nodesJson: JSON.stringify(nodes),
        edgesJson: JSON.stringify(edges),
        settingsJson: JSON.stringify({
          triggerEvent: template.triggerEvent,
          templateId: template.id,
          category: template.category,
        }),
        tags: JSON.stringify(['whatsapp', 'notification', template.category]),
        active: false,
        workspaceId: workspaceId || null,
        createdById: null,
      },
    });

    return NextResponse.json(
      {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: nodes,
        edges: edges,
        settings: { triggerEvent: template.triggerEvent, templateId: template.id, category: template.category },
        active: workflow.active,
        tags: ['whatsapp', 'notification', template.category],
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create workflow from template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
