import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  generateAgentAndFormFromWizard,
  WizardGenerationInput,
} from '@/lib/forms/generators/ai-agent-wizard-service';
import { crawlWebsiteForAgent } from '@/lib/forms/generators/website-crawler-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = (await req.json()) as WizardGenerationInput & {
      save?: boolean;
      action?: 'crawl' | 'generate';
      url?: string;
    };

    // 1. Direct Crawl action for live UI preview in wizard
    if (body.action === 'crawl' || (body.url && !body.businessDescription)) {
      const crawlUrl = (body.url || body.knowledgeUrl || '').trim();
      if (!crawlUrl) {
        return NextResponse.json({ error: 'URL is required for crawling' }, { status: 400 });
      }
      try {
        const crawled = await crawlWebsiteForAgent(crawlUrl);
        return NextResponse.json({ success: true, crawled });
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || 'Failed to crawl website' },
          { status: 500 }
        );
      }
    }

    // 2. Extract and crawl if website URL provided
    const targetUrl = (body.knowledgeUrl || body.url || '').trim();
    let crawledContext = body.crawledContext;

    if (!crawledContext && targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      try {
        crawledContext = await crawlWebsiteForAgent(targetUrl);
      } catch (crawlErr) {
        console.warn('[ai-agent-wizard-generate] Crawling failed for', targetUrl, crawlErr);
      }
    }

    // Determine effective business description
    let effectiveDescription = body.businessDescription?.trim() || '';
    // If the description is empty or looks like the default cleaning placeholder, but we have crawled context:
    if (
      (!effectiveDescription || effectiveDescription.toLowerCase().includes('home cleaning company serving london')) &&
      crawledContext
    ) {
      effectiveDescription = `${crawledContext.businessName} - ${crawledContext.description}. Services: ${crawledContext.services.join(', ')}`;
    }

    if (!effectiveDescription && !crawledContext) {
      return NextResponse.json(
        { error: 'businessDescription or a valid website URL is required' },
        { status: 400 }
      );
    }

    // Generate unified agent, form, and workflow configurations
    const generated = generateAgentAndFormFromWizard({
      ...body,
      businessDescription: effectiveDescription,
      businessName: (body.businessName || crawledContext?.businessName || '').trim() || undefined,
      knowledgeUrl: targetUrl || body.knowledgeUrl,
      crawledContext,
    });

    // 3. If client requests immediate persistence (save: true)
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
            mediaPanel: generated.form.mediaPanel || generated.form.theme?.mediaPanel,
            layout: generated.form.theme?.layout || 'split_media',
            settings: {
              submitButtonText: generated.form.submitButtonText,
              successTitle: 'Thank You!',
              successMessage: 'Your request has been received. Our team will contact you shortly.',
            },
            agentConfig: generated.agent,
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

      // Update Form schemaJson with final agentConfig (containing ID and connected forms)
      await db.form.update({
        where: { id: savedForm.id },
        data: {
          schemaJson: JSON.stringify({
            fields: generated.form.fields,
            theme: generated.form.theme,
            mediaPanel: generated.form.mediaPanel || generated.form.theme?.mediaPanel,
            layout: generated.form.theme?.layout || 'split_media',
            settings: {
              submitButtonText: generated.form.submitButtonText,
              successTitle: 'Thank You!',
              successMessage: 'Your request has been received. Our team will contact you shortly.',
            },
            agentConfig: generated.agent,
          }),
        },
      }).catch((err) => console.warn('[ai-agent-wizard-generate] Form agentConfig update notice:', err));

      // Also persist to KnowledgeSource & KnowledgeDocument if crawled
      if (crawledContext && validTenantId) {
        try {
          const kSource = await db.knowledgeSource.create({
            data: {
              tenantId: validTenantId,
              workspaceId: user?.workspaceId || null,
              name: `${crawledContext.businessName} Website`,
              type: 'website',
              sourceUrl: targetUrl,
              status: 'ready',
              lastSyncedAt: new Date(),
              metadataJson: JSON.stringify({
                industry: crawledContext.industry,
                phone: crawledContext.phone,
                services: crawledContext.services,
              }),
            },
          });
          await db.knowledgeDocument.create({
            data: {
              sourceId: kSource.id,
              tenantId: validTenantId,
              workspaceId: user?.workspaceId || null,
              title: `${crawledContext.businessName} Knowledge`,
              url: targetUrl,
              content: crawledContext.document.snippet,
              status: 'ready',
              chunksCount: 1,
            },
          });
        } catch (kErr) {
          console.warn('[ai-agent-wizard-generate] KnowledgeSource persistence note:', kErr);
        }
      }

      return NextResponse.json({
        success: true,
        ...generated,
        form: {
          ...generated.form,
          id: savedForm.id,
          slug: savedForm.slug,
        },
        agent: {
          ...generated.agent,
          id: savedAgent.id,
          slug: savedAgent.slug,
        },
        savedFormId: savedForm.id,
        savedFormSlug: savedForm.slug,
        savedAgentId: savedAgent.id,
        savedAgentSlug: savedAgent.slug,
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
