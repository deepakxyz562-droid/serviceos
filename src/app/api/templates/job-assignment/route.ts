import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Return template descriptions (2-workflow architecture)
export async function GET() {
  return NextResponse.json({
    templates: [
      {
        id: 'new-job-notification',
        name: 'Step 1 - New Job Notification',
        description:
          'Receives new job data via webhook, formats the message, and sends an interactive WhatsApp BUTTON message to Admin with "Assign Job". When Admin clicks the button, it triggers Workflow 2 directly via workflow ID — no CTA URL, stays within WhatsApp.',
        nodes: ['Webhook Trigger', 'Set (Format Message)', 'WhatsApp (Interactive Button to Admin)'],
      },
      {
        id: 'assign-employee',
        name: 'Step 2 - Assign Employee',
        description:
          'Triggered when Admin clicks "Assign Job" in Workflow 1. Fetches available employees from the database, builds a list message with job context, and sends an interactive WhatsApp LIST message. On-select action runs updateJobAssignee to assign the job.',
        nodes: [
          'Webhook Trigger (from Workflow 1 callback)',
          'Database Query (Get Employees)',
          'Set (Build List Message with Job Context)',
          'WhatsApp (Interactive List to Admin)',
        ],
      },
    ],
  });
}

// POST: Create 2 connected workflows for the Two-Step Job Assignment system
//
// IMPORTANT: Workflow 2 is created FIRST so we can reference its ID in
// Workflow 1's onSelectAction.workflowId field.
//
// Flow:
//   WF1: Webhook → Set → WhatsApp BUTTON ("Assign Job") → [onSelectAction.workflowId → WF2]
//   WF2: Webhook → Database → Set → WhatsApp LIST (employees) → [onSelectAction: updateJobAssignee]
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const adminPhone = body.adminPhone || '';
    const credentialId = body.credentialId || '';

    // ─── Step 1: Create Workflow 2 FIRST (to get its ID) ──────────────────
    const wf2WebhookPath = crypto.randomUUID();

    const wf2NodeWebhook = `webhook_${Date.now()}_2`;
    const wf2NodeDb = `db_${Date.now()}_2`;
    const wf2NodeSet = `set_${Date.now()}_2`;
    const wf2NodeWhatsapp = `whatsapp_${Date.now()}_2`;

    const wf2 = await db.workflow.create({
      data: {
        name: 'Step 2 - Assign Employee',
        description:
          'Triggered by Workflow 1 button click. Fetches available employees and sends WhatsApp LIST to Admin for selection. On-select action updates the job assignee.',
        nodesJson: JSON.stringify([
          {
            id: wf2NodeWebhook,
            type: 'webhookTrigger',
            name: 'Assign Job Callback',
            position: { x: 100, y: 200 },
            data: {
              nodeType: 'webhookTrigger',
              config: {
                path: wf2WebhookPath,
                httpMethod: 'POST',
                respond: 'immediately',
                responseCode: 200,
                responseBody:
                  '{"success": true, "message": "Assign employee flow triggered"}',
              },
            },
          },
          {
            id: wf2NodeDb,
            type: 'databaseNode',
            name: 'Get Available Employees',
            position: { x: 400, y: 200 },
            data: {
              nodeType: 'databaseNode',
              config: {
                operation: 'query',
                table: 'employees',
                filters: '{"status": "available"}',
                data: '{}',
                orderBy: 'name asc',
                limit: 10,
              },
            },
          },
          {
            id: wf2NodeSet,
            type: 'setNode',
            name: 'Build List Message',
            position: { x: 700, y: 200 },
            data: {
              nodeType: 'setNode',
              config: {
                mode: 'json',
                jsonValue:
                  '{"jobId": "{{ $json.body.contextData.jobId }}", "jobIdFallback": "{{ $json.body.originalMessage.whatsappMessageId }}", "messageBody": "Select an employee to assign to Job #{{ $json.body.contextData.jobId }}", "contextJobId": "{{ $json.body.contextData.jobId }}"}',
              },
            },
          },
          {
            id: wf2NodeWhatsapp,
            type: 'whatsappNode',
            name: 'Employee List',
            position: { x: 1000, y: 200 },
            data: {
              nodeType: 'whatsappNode',
              config: {
                operation: 'sendInteractive',
                credentialId,
                phoneNumber: adminPhone,
                interactiveType: 'list',
                headerText: '👥 Select Employee',
                bodyText: '{{ $json.messageBody }}',
                footerText: 'Tap to assign',
                listButtonText: 'Select Employee',
                listSections: [],
                listDynamicSource: {
                  enabled: true,
                  url: '/api/employees?status=available',
                  method: 'GET',
                  arrayPath: '',
                  idField: 'id',
                  titleField: 'name',
                  descField: 'role',
                  sectionTitle: 'Available Employees',
                },
                onSelectAction: {
                  enabled: true,
                  actionType: 'updateJobAssignee',
                  webhookUrl: '',
                  method: 'POST',
                  contextData: {
                    jobId: '{{ $json.contextJobId }}',
                  },
                },
              },
            },
          },
        ]),
        edgesJson: JSON.stringify([
          {
            id: `edge_w2_db_${Date.now()}`,
            source: wf2NodeWebhook,
            target: wf2NodeDb,
            sourcePort: 'main',
            targetPort: 'main',
            animated: true,
          },
          {
            id: `edge_db_s2_${Date.now()}`,
            source: wf2NodeDb,
            target: wf2NodeSet,
            sourcePort: 'main',
            targetPort: 'main',
            animated: true,
          },
          {
            id: `edge_s2_wh2_${Date.now()}`,
            source: wf2NodeSet,
            target: wf2NodeWhatsapp,
            sourcePort: 'main',
            targetPort: 'main',
            animated: true,
          },
        ]),
        active: false,
      },
    });

    // ─── Step 2: Create Workflow 1 (references WF2's ID) ──────────────────
    const wf1WebhookPath = crypto.randomUUID();

    const wf1NodeWebhook = `webhook_${Date.now()}_1`;
    const wf1NodeSet = `set_${Date.now()}_1`;
    const wf1NodeWhatsapp = `whatsapp_${Date.now()}_1`;

    const wf1 = await db.workflow.create({
      data: {
        name: 'Step 1 - New Job Notification',
        description:
          'Webhook → Format → WhatsApp interactive BUTTON to Admin. When Admin clicks "Assign Job", it triggers Workflow 2 directly via workflow ID.',
        nodesJson: JSON.stringify([
          {
            id: wf1NodeWebhook,
            type: 'webhookTrigger',
            name: 'New Job Webhook',
            position: { x: 100, y: 200 },
            data: {
              nodeType: 'webhookTrigger',
              config: {
                path: wf1WebhookPath,
                httpMethod: 'POST',
                respond: 'immediately',
                responseCode: 200,
                responseBody:
                  '{"success": true, "message": "Job notification triggered"}',
              },
            },
          },
          {
            id: wf1NodeSet,
            type: 'setNode',
            name: 'Format Message',
            position: { x: 400, y: 200 },
            data: {
              nodeType: 'setNode',
              config: {
                mode: 'json',
                jsonValue:
                  '{"jobId": "{{ $json.body.id }}", "customerName": "{{ $json.body.customerName }}", "customerPhone": "{{ $json.body.customerPhone }}", "address": "{{ $json.body.address }}", "serviceType": "{{ $json.body.type }}", "messageBody": "🚨 New Job Received\\n\\nJob ID: {{ $json.body.id }}\\nCustomer: {{ $json.body.customerName }}\\nPhone: {{ $json.body.customerPhone }}\\nAddress: {{ $json.body.address }}\\nService: {{ $json.body.type }}\\n\\nTap below to assign."}',
              },
            },
          },
          {
            id: wf1NodeWhatsapp,
            type: 'whatsappNode',
            name: 'Notify Admin',
            position: { x: 700, y: 200 },
            data: {
              nodeType: 'whatsappNode',
              config: {
                operation: 'sendInteractive',
                credentialId,
                phoneNumber: adminPhone,
                interactiveType: 'button',
                headerText: '🚨 New Job',
                bodyText: '{{ $json.messageBody }}',
                footerText: 'FlowForge Job Assignment',
                buttons: [{ id: 'btn_assign', label: 'Assign Job' }],
                onSelectAction: {
                  enabled: true,
                  actionType: 'workflow',
                  webhookUrl: '',
                  method: 'POST',
                  workflowId: wf2.id,
                  contextData: {
                    jobId: '{{ $json.jobId }}',
                  },
                },
              },
            },
          },
        ]),
        edgesJson: JSON.stringify([
          {
            id: `edge_w1_s1_${Date.now()}`,
            source: wf1NodeWebhook,
            target: wf1NodeSet,
            sourcePort: 'main',
            targetPort: 'main',
            animated: true,
          },
          {
            id: `edge_s1_wh1_${Date.now()}`,
            source: wf1NodeSet,
            target: wf1NodeWhatsapp,
            sourcePort: 'main',
            targetPort: 'main',
            animated: true,
          },
        ]),
        active: false,
      },
    });

    // Return both workflows with their webhook paths
    return NextResponse.json({
      success: true,
      message: '2 Job Assignment workflows created successfully!',
      workflows: [
        {
          id: wf1.id,
          name: wf1.name,
          description: wf1.description,
          webhookPath: wf1WebhookPath,
        },
        {
          id: wf2.id,
          name: wf2.name,
          description: wf2.description,
          webhookPath: wf2WebhookPath,
        },
      ],
      webhookPaths: {
        newJobNotification: wf1WebhookPath,
        assignEmployee: wf2WebhookPath,
      },
      nextSteps: [
        '1. Set up WhatsApp credentials if not already done',
        '2. Activate each workflow by toggling the Active switch',
        '3. Configure the admin phone number in each WhatsApp node',
        `4. Test by sending a POST to /webhook/${wf1WebhookPath} with job data`,
        '5. When you click "Assign Job" on WhatsApp, it will trigger Step 2',
        '6. Select an employee from the list to assign the job',
      ],
    });
  } catch (error: any) {
    console.error('Failed to create job assignment workflows:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workflows' },
      { status: 500 }
    );
  }
}
