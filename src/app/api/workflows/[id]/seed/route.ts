import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Industry-specific seed templates
const industrySeeds: Record<string, { name: string; description: string; nodes: any[]; edges: any[] }> = {
  plumbing: {
    name: 'Plumbing Job Workflow',
    description: 'Auto-assign plumbing jobs and notify customers',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'New Job Request', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'plumbing-jobs' } } },
      { id: 'n2', type: 'whatsapp', name: 'Notify Plumber', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
      { id: 'n3', type: 'whatsapp', name: 'Confirm with Customer', position: { x: 700, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
  hvac: {
    name: 'HVAC Service Workflow',
    description: 'Manage HVAC service requests and scheduling',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'Service Request', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'hvac-requests' } } },
      { id: 'n2', type: 'whatsapp', name: 'Assign Technician', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
      { id: 'n3', type: 'whatsapp', name: 'Customer Confirmation', position: { x: 700, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
  electrical: {
    name: 'Electrical Service Workflow',
    description: 'Handle electrical service calls and dispatch',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'Service Call', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'electrical-calls' } } },
      { id: 'n2', type: 'whatsapp', name: 'Dispatch Electrician', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
    ],
  },
  cleaning: {
    name: 'Cleaning Job Workflow',
    description: 'Schedule and manage cleaning appointments',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'Booking Request', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'cleaning-bookings' } } },
      { id: 'n2', type: 'whatsapp', name: 'Notify Cleaner', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
      { id: 'n3', type: 'whatsapp', name: 'Confirm Booking', position: { x: 700, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
  landscaping: {
    name: 'Landscaping Job Workflow',
    description: 'Manage landscaping projects and crew assignments',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'Project Request', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'landscape-projects' } } },
      { id: 'n2', type: 'whatsapp', name: 'Assign Crew', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
    ],
  },
  painting: {
    name: 'Painting Job Workflow',
    description: 'Handle painting job requests and quotes',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'Quote Request', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'painting-quotes' } } },
      { id: 'n2', type: 'whatsapp', name: 'Send Quote', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
    ],
  },
  moving: {
    name: 'Moving Job Workflow',
    description: 'Coordinate moving jobs and crew scheduling',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'Moving Request', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'moving-requests' } } },
      { id: 'n2', type: 'whatsapp', name: 'Assign Movers', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
      { id: 'n3', type: 'whatsapp', name: 'Confirm with Client', position: { x: 700, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
  delivery: {
    name: 'Delivery Tracking Workflow',
    description: 'Track deliveries and notify recipients',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'New Delivery', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'new-deliveries' } } },
      { id: 'n2', type: 'whatsapp', name: 'Assign Driver', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
      { id: 'n3', type: 'whatsapp', name: 'Notify Recipient', position: { x: 700, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
  restaurant: {
    name: 'Restaurant Order Workflow',
    description: 'Process orders and notify kitchen and customers',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'New Order', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'restaurant-orders' } } },
      { id: 'n2', type: 'whatsapp', name: 'Kitchen Notification', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
      { id: 'n3', type: 'whatsapp', name: 'Order Confirmation', position: { x: 700, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
  retail: {
    name: 'Retail Order Workflow',
    description: 'Manage retail orders and inventory notifications',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'New Sale', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'retail-sales' } } },
      { id: 'n2', type: 'whatsapp', name: 'Order Notification', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
    ],
  },
  healthcare: {
    name: 'Healthcare Appointment Workflow',
    description: 'Manage patient appointments and reminders',
    nodes: [
      { id: 'n1', type: 'webhookTrigger', name: 'Appointment Request', position: { x: 100, y: 100 }, data: { nodeType: 'webhookTrigger', config: { path: 'healthcare-appointments' } } },
      { id: 'n2', type: 'whatsapp', name: 'Send Reminder', position: { x: 400, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
      { id: 'n3', type: 'whatsapp', name: 'Follow-up', position: { x: 700, y: 100 }, data: { nodeType: 'whatsapp', config: {} } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const body = await request.json();
    const { industry } = body;

    if (!industry) {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
    }

    const seed = industrySeeds[industry];
    if (!seed) {
      return NextResponse.json({ error: `No seed template for industry: ${industry}` }, { status: 400 });
    }

    // Update workspace industry
    const workspace = await db.workspace.findFirst({
      where: {
        OR: [
          { id: workspaceId },
          { slug: workspaceId },
        ],
      },
    });

    if (workspace) {
      await db.workspace.update({
        where: { id: workspace.id },
        data: { industry },
      });
    }

    // Create the seeded workflow
    const workflow = await db.workflow.create({
      data: {
        name: seed.name,
        description: seed.description,
        nodesJson: JSON.stringify(seed.nodes),
        edgesJson: JSON.stringify(seed.edges),
        workspaceId: workspace?.id || null,
        createdById: 'demo-user',
      },
    });

    // Create initial version
    await db.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        snapshotJson: JSON.stringify({
          nodes: seed.nodes,
          edges: seed.edges,
          settings: {},
        }),
        message: `Initial version - ${industry} industry seed`,
      },
    });

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
      },
      industry,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to seed workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed workflow' },
      { status: 500 }
    );
  }
}
