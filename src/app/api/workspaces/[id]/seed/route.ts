import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const INDUSTRIES: Record<
  string,
  {
    label: string;
    jobTypes: string[];
    employeeRoles: string[];
    workflowTemplates: {
      name: string;
      description: string;
      nodesJson: string;
      edgesJson: string;
    }[];
  }
> = {
  plumbing: {
    label: 'Plumbing',
    jobTypes: ['repair', 'installation', 'inspection', 'emergency', 'maintenance'],
    employeeRoles: ['plumber', 'supervisor', 'apprentice'],
    workflowTemplates: [
      {
        name: 'Lead to Job (Plumbing)',
        description:
          'Convert incoming leads to plumbing jobs, assign to available plumbers via WhatsApp',
        nodesJson: JSON.stringify([
          {
            id: 'trigger_1',
            type: 'httpRequestTrigger',
            name: 'Web Form Lead',
            position: { x: 100, y: 100 },
            data: {
              nodeType: 'httpRequestTrigger',
              config: { httpMethod: 'POST', path: 'auto' },
            },
          },
          {
            id: 'node_2',
            type: 'setNode',
            name: 'Extract Lead Data',
            position: { x: 350, y: 100 },
            data: {
              nodeType: 'setNode',
              config: {
                mode: 'json',
                jsonValue:
                  '{"customerName":"{{ $json.body.name }}","customerPhone":"{{ $json.body.phone }}","serviceType":"{{ $json.body.service }}","address":"{{ $json.body.address }}"}',
              },
            },
          },
          {
            id: 'node_3',
            type: 'databaseNode',
            name: 'Create Job',
            position: { x: 600, y: 100 },
            data: {
              nodeType: 'databaseNode',
              config: {
                operation: 'insert',
                table: 'jobs',
                data: '{"title":"Plumbing - {{ $json.serviceType }}","type":"repair","status":"pending","customerName":"{{ $json.customerName }}","customerPhone":"{{ $json.customerPhone }}","address":"{{ $json.address }}"}',
              },
            },
          },
          {
            id: 'node_4',
            type: 'whatsappNode',
            name: 'Send Assignment',
            position: { x: 850, y: 100 },
            data: {
              nodeType: 'whatsappNode',
              config: {
                operation: 'sendInteractive',
                interactiveType: 'button',
                headerText: '🔧 New Plumbing Job',
                bodyText:
                  'Customer: {{ $json.customerName }}\nService: {{ $json.serviceType }}\nAddress: {{ $json.address }}\n\nAccept this job?',
                buttonText: 'Accept Job',
              },
            },
          },
        ]),
        edgesJson: JSON.stringify([
          { id: 'e1', source: 'trigger_1', target: 'node_2', sourcePort: 'main', targetPort: 'main' },
          { id: 'e2', source: 'node_2', target: 'node_3', sourcePort: 'main', targetPort: 'main' },
          { id: 'e3', source: 'node_3', target: 'node_4', sourcePort: 'main', targetPort: 'main' },
        ]),
      },
    ],
  },
  cleaning: {
    label: 'Cleaning',
    jobTypes: ['deep-clean', 'regular-clean', 'move-in', 'move-out', 'post-construction'],
    employeeRoles: ['cleaner', 'team-lead', 'supervisor'],
    workflowTemplates: [
      {
        name: 'Booking to Job (Cleaning)',
        description: 'Process cleaning bookings from website, create jobs, assign cleaners',
        nodesJson: JSON.stringify([
          {
            id: 'trigger_1',
            type: 'httpRequestTrigger',
            name: 'Booking Form',
            position: { x: 100, y: 100 },
            data: { nodeType: 'httpRequestTrigger', config: { httpMethod: 'POST' } },
          },
          {
            id: 'node_2',
            type: 'setNode',
            name: 'Parse Booking',
            position: { x: 350, y: 100 },
            data: { nodeType: 'setNode', config: { mode: 'json' } },
          },
          {
            id: 'node_3',
            type: 'databaseNode',
            name: 'Create Job',
            position: { x: 600, y: 100 },
            data: { nodeType: 'databaseNode', config: { operation: 'insert', table: 'jobs' } },
          },
          {
            id: 'node_4',
            type: 'whatsappNode',
            name: 'Notify Cleaner',
            position: { x: 850, y: 100 },
            data: {
              nodeType: 'whatsappNode',
              config: {
                operation: 'sendInteractive',
                interactiveType: 'button',
                headerText: '🧹 New Cleaning Job',
              },
            },
          },
        ]),
        edgesJson: JSON.stringify([
          { id: 'e1', source: 'trigger_1', target: 'node_2', sourcePort: 'main', targetPort: 'main' },
          { id: 'e2', source: 'node_2', target: 'node_3', sourcePort: 'main', targetPort: 'main' },
          { id: 'e3', source: 'node_3', target: 'node_4', sourcePort: 'main', targetPort: 'main' },
        ]),
      },
    ],
  },
  'packers-movers': {
    label: 'Packers & Movers',
    jobTypes: ['local-move', 'long-distance', 'packing', 'unpacking', 'storage'],
    employeeRoles: ['mover', 'driver', 'packer', 'supervisor'],
    workflowTemplates: [
      {
        name: 'Move Request',
        description: 'Process moving requests, assign team',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  salon: {
    label: 'Salon',
    jobTypes: ['haircut', 'coloring', 'facial', 'manicure', 'bridal-package'],
    employeeRoles: ['stylist', 'colorist', 'therapist', 'receptionist'],
    workflowTemplates: [
      {
        name: 'Appointment Flow',
        description: 'Manage salon appointments and reminders',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  'pest-control': {
    label: 'Pest Control',
    jobTypes: ['inspection', 'treatment', 'follow-up', 'emergency', 'preventive'],
    employeeRoles: ['technician', 'supervisor', 'sales-rep'],
    workflowTemplates: [
      {
        name: 'Service Request',
        description: 'Process pest control service requests',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  electricians: {
    label: 'Electricians',
    jobTypes: ['repair', 'installation', 'inspection', 'emergency', 'wiring'],
    employeeRoles: ['electrician', 'supervisor', 'apprentice'],
    workflowTemplates: [
      {
        name: 'Service Call',
        description: 'Handle electrician service calls',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  hvac: {
    label: 'HVAC',
    jobTypes: ['installation', 'repair', 'maintenance', 'inspection', 'emergency'],
    employeeRoles: ['technician', 'installer', 'supervisor'],
    workflowTemplates: [
      {
        name: 'HVAC Service',
        description: 'Process HVAC service requests',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  courier: {
    label: 'Courier Services',
    jobTypes: ['delivery', 'pickup', 'express', 'same-day', 'bulk'],
    employeeRoles: ['driver', 'dispatcher', 'warehouse'],
    workflowTemplates: [
      {
        name: 'Delivery Flow',
        description: 'End-to-end delivery management',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  laundry: {
    label: 'Laundry Services',
    jobTypes: ['wash-fold', 'dry-clean', 'ironing', 'pick-up', 'delivery'],
    employeeRoles: ['operator', 'driver', 'supervisor'],
    workflowTemplates: [
      {
        name: 'Order Flow',
        description: 'Laundry order management',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  'car-wash': {
    label: 'Car Wash',
    jobTypes: ['basic-wash', 'premium-wash', 'detailing', 'interior', 'full-service'],
    employeeRoles: ['washer', 'detailer', 'cashier'],
    workflowTemplates: [
      {
        name: 'Service Flow',
        description: 'Car wash service management',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
  'home-repair': {
    label: 'Home Repair',
    jobTypes: ['plumbing', 'electrical', 'carpentry', 'painting', 'general'],
    employeeRoles: ['handyman', 'specialist', 'supervisor'],
    workflowTemplates: [
      {
        name: 'Repair Request',
        description: 'Home repair service requests',
        nodesJson: '[]',
        edgesJson: '[]',
      },
    ],
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { industry } = await request.json();

    const industryData = INDUSTRIES[industry];
    if (!industryData) {
      return NextResponse.json({ error: 'Invalid industry' }, { status: 400 });
    }

    // Update workspace industry
    await db.workspace.update({
      where: { id },
      data: { industry },
    });

    // Create workflow templates for this industry
    const createdWorkflows: { id: string; nodesJson: string; edgesJson: string }[] = [];
    for (const tmpl of industryData.workflowTemplates) {
      const workflow = await db.workflow.create({
        data: {
          name: tmpl.name,
          description: tmpl.description,
          nodesJson: tmpl.nodesJson,
          edgesJson: tmpl.edgesJson,
          workspaceId: id,
          createdById: 'demo-user',
        },
      });
      createdWorkflows.push(workflow);
    }

    // Create a version snapshot for each workflow
    for (const wf of createdWorkflows) {
      await db.workflowVersion.create({
        data: {
          workflowId: wf.id,
          snapshotJson: JSON.stringify({
            nodes: JSON.parse(wf.nodesJson),
            edges: JSON.parse(wf.edgesJson),
          }),
          message: 'Initial version from industry template',
        },
      });
    }

    return NextResponse.json({
      success: true,
      industry: industryData.label,
      workflowsCreated: createdWorkflows.length,
      jobTypes: industryData.jobTypes,
      employeeRoles: industryData.employeeRoles,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to seed' },
      { status: 500 }
    );
  }
}

// Also export the INDUSTRIES list for the frontend to use
export { INDUSTRIES };
