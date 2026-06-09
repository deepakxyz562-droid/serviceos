import { db } from '@/lib/db';

async function seedUniversalWorkflow() {
  console.log('🌱 Seeding Universal Assignment Workflow template...\n');

  const nodes = [
    {
      id: 'webhook-trigger-1',
      type: 'webhookTrigger',
      position: { x: 100, y: 200 },
      data: {
        label: 'New Job Webhook',
        name: 'New Job Webhook',
        type: 'webhookTrigger',
        config: {
          httpMethod: 'POST',
          respond: 'immediately',
        },
      },
    },
    {
      id: 'set-node-1',
      type: 'setNode',
      position: { x: 350, y: 200 },
      data: {
        label: 'Extract Job Data',
        name: 'Extract Job Data',
        type: 'setNode',
        config: {
          mode: 'json',
          jsonValue: '{"jobId": "{{ $json.body.id || $json.body.jobId }}", "jobTitle": "{{ $json.body.title || $json.body.customer }}", "customerName": "{{ $json.body.customer || $json.body.customerName }}", "jobType": "{{ $json.body.type || \'delivery\' }}", "pickup": "{{ $json.body.pickup || \'\' }}", "dropoff": "{{ $json.body.drop || $json.body.dropoff || \'\' }}"}',
        },
      },
    },
    {
      id: 'supabase-node-1',
      type: 'supabaseNode',
      position: { x: 600, y: 200 },
      data: {
        label: 'Get Available Resources',
        name: 'Get Available Resources',
        type: 'supabaseNode',
        config: {
          operation: 'query',
          table: 'resources',
          query: '{"status": "available"}',
        },
      },
    },
    {
      id: 'whatsapp-node-1',
      type: 'whatsappNode',
      position: { x: 850, y: 200 },
      data: {
        label: 'Send Admin Alert',
        name: 'Send Admin Alert',
        type: 'whatsappNode',
        config: {
          operation: 'sendInteractive',
          interactiveType: 'button',
          headerText: '🚨 New Transport Job',
          bodyText: 'Job ID: {{ $json.jobId }}\n\nCustomer: {{ $json.customerName }}\nPickup: {{ $json.pickup }}\nDrop: {{ $json.dropoff }}\n\nTap below to assign a driver.',
          footerText: 'FlowForge Assignment',
          buttons: [
            { id: 'assign_btn', label: 'Assign Driver' },
            { id: 'view_btn', label: 'View Details' },
          ],
        },
      },
    },
    {
      id: 'whatsapp-callback-trigger-1',
      type: 'whatsappCallbackTrigger',
      position: { x: 100, y: 500 },
      data: {
        label: 'Assign Button Clicked',
        name: 'Assign Button Clicked',
        type: 'whatsappCallbackTrigger',
        config: {
          callbackType: 'button_reply',
          buttonIdPattern: 'assign_*',
        },
      },
    },
    {
      id: 'supabase-node-2',
      type: 'supabaseNode',
      position: { x: 350, y: 500 },
      data: {
        label: 'Get Employees for Assignment',
        name: 'Get Employees for Assignment',
        type: 'supabaseNode',
        config: {
          operation: 'query',
          table: 'resources',
          query: '{"status": "available"}',
        },
      },
    },
    {
      id: 'whatsapp-node-2',
      type: 'whatsappNode',
      position: { x: 600, y: 500 },
      data: {
        label: 'Send Employee List',
        name: 'Send Employee List',
        type: 'whatsappNode',
        config: {
          operation: 'sendInteractive',
          interactiveType: 'list',
          bodyText: 'Choose an employee to assign to this job:',
          listButtonText: 'View Employees',
          dynamicListMode: true,
          dynamicListConfig: {
            dataPath: '{{ $json.data }}',
            titleExpression: '{{ $json.data[i].name }}',
            descriptionExpression: '{{ $json.data[i].type }} ⭐ {{ $json.data[i].rating }}',
            idExpression: 'resource_{{ $json.data[i].id }}',
          },
        },
      },
    },
    {
      id: 'whatsapp-callback-trigger-2',
      type: 'whatsappCallbackTrigger',
      position: { x: 100, y: 800 },
      data: {
        label: 'Employee Selected',
        name: 'Employee Selected',
        type: 'whatsappCallbackTrigger',
        config: {
          callbackType: 'list_reply',
          listIdPattern: 'resource_*',
        },
      },
    },
    {
      id: 'supabase-node-3',
      type: 'supabaseNode',
      position: { x: 350, y: 800 },
      data: {
        label: 'Update Job Assignment',
        name: 'Update Job Assignment',
        type: 'supabaseNode',
        config: {
          operation: 'update',
          table: 'jobs',
          query: '{"status": "pending"}',
          updateData: '{"status": "assigned", "assigneeName": "Selected Resource"}',
        },
      },
    },
    {
      id: 'whatsapp-node-3',
      type: 'whatsappNode',
      position: { x: 600, y: 800 },
      data: {
        label: 'Notify Resource',
        name: 'Notify Resource',
        type: 'whatsappNode',
        config: {
          operation: 'sendInteractive',
          interactiveType: 'button',
          headerText: '📋 Job Assigned',
          bodyText: 'You have been assigned a new job. Please confirm.',
          buttons: [
            { id: 'accept_btn', label: '✅ Accept' },
            { id: 'reject_btn', label: '❌ Reject' },
          ],
        },
      },
    },
  ];

  const edges = [
    {
      id: 'edge-1',
      source: 'webhook-trigger-1',
      target: 'set-node-1',
      sourceHandle: 'main',
      targetHandle: 'main',
    },
    {
      id: 'edge-2',
      source: 'set-node-1',
      target: 'supabase-node-1',
      sourceHandle: 'main',
      targetHandle: 'main',
    },
    {
      id: 'edge-3',
      source: 'supabase-node-1',
      target: 'whatsapp-node-1',
      sourceHandle: 'main',
      targetHandle: 'main',
    },
    {
      id: 'edge-4',
      source: 'whatsapp-callback-trigger-1',
      target: 'supabase-node-2',
      sourceHandle: 'main',
      targetHandle: 'main',
    },
    {
      id: 'edge-5',
      source: 'supabase-node-2',
      target: 'whatsapp-node-2',
      sourceHandle: 'main',
      targetHandle: 'main',
    },
    {
      id: 'edge-6',
      source: 'whatsapp-callback-trigger-2',
      target: 'supabase-node-3',
      sourceHandle: 'main',
      targetHandle: 'main',
    },
    {
      id: 'edge-7',
      source: 'supabase-node-3',
      target: 'whatsapp-node-3',
      sourceHandle: 'main',
      targetHandle: 'main',
    },
  ];

  const workflowJson = JSON.stringify({ nodes, edges });

  // Create/update the template using upsert
  const template = await db.template.upsert({
    where: { id: 'universal-assignment-workflow' },
    update: {
      name: 'Universal Assignment Workflow',
      description: 'Complete job assignment workflow with WhatsApp integration. Receives job data via webhook, sends interactive admin alert, allows driver selection via list message, updates job status, and notifies the assigned resource.',
      workflowJson,
      category: 'operations',
      icon: '🚚',
      featured: true,
      rating: 4.8,
    },
    create: {
      id: 'universal-assignment-workflow',
      name: 'Universal Assignment Workflow',
      description: 'Complete job assignment workflow with WhatsApp integration. Receives job data via webhook, sends interactive admin alert, allows driver selection via list message, updates job status, and notifies the assigned resource.',
      workflowJson,
      category: 'operations',
      icon: '🚚',
      featured: true,
      rating: 4.8,
    },
  });

  console.log(`✅ Template created/updated: ${template.name} (id: ${template.id})`);
  console.log(`   Category: ${template.category}`);
  console.log(`   Nodes: ${nodes.length}`);
  console.log(`   Edges: ${edges.length}`);
  console.log(`   Featured: ${template.featured}`);

  return { nodes, edges };
}

seedUniversalWorkflow()
  .then(async (result) => {
    console.log(`\n🎉 Universal Assignment Workflow template seeded successfully!`);
    console.log(`   ${result.nodes.length} nodes, ${result.edges.length} edges`);
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await db.$disconnect();
    process.exit(1);
  });
