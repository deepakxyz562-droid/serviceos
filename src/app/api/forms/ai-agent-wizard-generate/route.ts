import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  generateAgentAndFormFromWizard,
  WizardGenerationInput,
} from '@/lib/forms/generators/ai-agent-wizard-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = (await req.json()) as WizardGenerationInput & { save?: boolean };

    if (!body || !body.businessDescription?.trim()) {
      return NextResponse.json(
        { error: 'businessDescription is required' },
        { status: 400 }
      );
    }

    // 1. Generate unified agent, form, and workflow configurations
    const generated = generateAgentAndFormFromWizard(body);

    // 2. If client requests immediate persistence (save: true)
    if (body.save && user) {
      const candidateTenantId = user.tenantId || null;
      let validTenantId: string | null = null;
      if (candidateTenantId) {
        const tenant = await db.tenant.findUnique({
          where: { id: candidateTenantId },
          select: { id: true },
        }).catch(() => null);
        if (tenant) validTenantId = tenant.id;
      }

      // Create the Form in DB
      const formSlug = `${generated.form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
      const savedForm = await db.form.create({
        data: {
          tenantId: validTenantId,
          workspaceId: user?.workspaceId || null,
          createdById: user?.id || null,
          name: generated.form.name,
          slug: formSlug,
          description: generated.form.description,
          type: 'lead_capture',
          status: 'active',
          fieldsJson: JSON.stringify(generated.form.fields),
          schemaJson: JSON.stringify({
            fields: generated.form.fields,
            theme: generated.form.theme,
            settings: {
              submitButtonText: generated.form.submitButtonText,
              successTitle: 'Thank You!',
              successMessage: 'Your request has been received. Our team will contact you shortly.',
            },
          }),
        },
      });

      // Link saved form to the generated agent
      generated.agent.connectedForms = [
        {
          id: savedForm.id,
          name: savedForm.name,
          description: savedForm.description,
          submissionCount: 0,
        },
      ];

      // Create the Agent in DB
      const agentSlug = `${generated.agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
      const savedAgent = await db.formAgent.create({
        data: {
          tenantId: validTenantId,
          slug: agentSlug,
          name: generated.agent.name,
          roleTitle: generated.agent.roleTitle,
          avatarUrl: generated.agent.avatarUrl,
          brandColor: generated.agent.brandColor,
          voiceTone: generated.agent.voiceTone,
          welcomeGreeting: generated.agent.welcomeGreeting,
          greetingSubtitle: generated.agent.greetingSubtitle,
          configJson: generated.agent as any,
          status: 'active',
        },
      });

      generated.agent.id = savedAgent.id;
      generated.agent.slug = savedAgent.slug;

      return NextResponse.json({
        success: true,
        ...generated,
        savedFormId: savedForm.id,
        savedAgentId: savedAgent.id,
      });
    }

    return NextResponse.json({
      success: true,
      ...generated,
    });
  } catch (error: any) {
    console.error('Error in /api/forms/ai-agent-wizard-generate:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate agent and form' },
      { status: 500 }
    );
  }
}
