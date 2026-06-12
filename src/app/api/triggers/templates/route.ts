import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Pre-built workflow templates
const WORKFLOW_TEMPLATES = [
  {
    id: 'new_lead_workflow',
    name: 'New Lead Created',
    description: 'When a new lead comes in, send WhatsApp, assign sales rep, and create follow-up task',
    triggerType: 'lead.created',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    actionsJson: JSON.stringify([
      { type: 'send_whatsapp', config: { recipient: 'customer', template: 'Thank you for your interest! We will get back to you shortly.' } },
      { type: 'assign_user', config: { assignTo: 'round_robin' } },
      { type: 'create_task', config: { title: 'Follow up with new lead', description: 'Contact the new lead within 1 hour', assignTo: 'lead_owner' } },
    ]),
    category: 'CRM',
  },
  {
    id: 'quote_not_accepted',
    name: 'Quote Not Accepted',
    description: '3 days after quote sent without acceptance, send reminder WhatsApp',
    triggerType: 'time.1d_after_quote',
    triggerConfigJson: JSON.stringify({ delayMinutes: 4320 }),
    conditionsJson: JSON.stringify([
      { field: 'status', operator: 'not_equals', value: 'accepted' },
    ]),
    actionsJson: JSON.stringify([
      { type: 'send_whatsapp', config: { recipient: 'customer', template: 'Hi! We noticed you haven\'t responded to our quote. Would you like to discuss any questions?' } },
    ]),
    category: 'Sales',
  },
  {
    id: 'job_completed',
    name: 'Job Completed',
    description: 'When a job is completed, send invoice, request Google review, and move to retention campaign',
    triggerType: 'job.completed',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    actionsJson: JSON.stringify([
      { type: 'create_task', config: { title: 'Send invoice for completed job', assignTo: 'lead_owner' } },
      { type: 'send_whatsapp', config: { recipient: 'customer', template: 'Thank you for choosing us! Would you like to leave a review? https://g.page/review' } },
      { type: 'add_tag', config: { tag: 'retention-campaign' } },
    ]),
    category: 'Operations',
  },
];

// GET /api/triggers/templates - Get workflow templates
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(WORKFLOW_TEMPLATES);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/triggers/templates - Create automation from template
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId } = body;

    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const automation = await db.workflowAutomation.create({
      data: {
        name: template.name,
        description: template.description,
        triggerType: template.triggerType,
        triggerConfigJson: template.triggerConfigJson,
        conditionsJson: template.conditionsJson,
        actionsJson: template.actionsJson,
        active: true,
        tagsJson: JSON.stringify(['template']),
        tenantId: user.tenantId || null,
        workspaceId: user.workspaceId || null,
        createdById: user.id || null,
      },
    });

    return NextResponse.json(automation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create from template' }, { status: 500 });
  }
}
