import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';
import { HostedIntakeClient } from './hosted-intake-client';

export const dynamic = 'force-dynamic';

function parseConfigJson(raw: unknown): Partial<FormAgentData> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<FormAgentData>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

async function getAgent(identifier: string): Promise<FormAgentData | null> {
  try {
    const trimmed = identifier.replace(/^-+|-+$/g, '');
    const lower = identifier.toLowerCase();

    // 1. Direct formAgent lookup by id or slug
    let agent = await db.formAgent.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { slug: trimmed },
          { id: identifier },
          { id: trimmed },
        ],
      },
    });

    // 2. Business / Tenant lookup by business slug (e.g. /intake/singh-web-services)
    if (!agent) {
      const tenant = await db.tenant.findFirst({
        where: {
          OR: [
            { slug: identifier },
            { publicSlug: identifier },
            { slug: trimmed },
            { publicSlug: trimmed },
          ],
        },
        select: {
          id: true,
          name: true,
          logo: true,
          brandColor: true,
          industry: true,
        },
      });

      if (tenant) {
        agent = await db.formAgent.findFirst({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: 'asc' },
        });

        if (!agent) {
          return {
            ...DEFAULT_FORM_AGENT,
            id: `bot-${tenant.id}`,
            tenantId: tenant.id,
            name: `${tenant.name} AI Assistant`,
            roleTitle: '24/7 Customer Concierge & Booking Specialist',
            welcomeGreeting: `Hi! Welcome to ${tenant.name}. How can I assist you today?`,
            brandColor: tenant.brandColor || DEFAULT_FORM_AGENT.brandColor,
          };
        }
      }
    }

    // 3. Known global & preview aliases
    if (!agent) {
      if (
        lower === 'bgos-ai' ||
        lower === 'bgos' ||
        lower === 'preview' ||
        lower === 'demo' ||
        lower === 'default' ||
        lower === 'assistant'
      ) {
        return {
          ...DEFAULT_FORM_AGENT,
          name: 'BGOS AI Assistant',
          roleTitle: '24/7 Customer Concierge & Booking Specialist',
          welcomeGreeting: 'Hi! Welcome to BGOS. How can I assist you today?',
        };
      }
      return {
        ...DEFAULT_FORM_AGENT,
        name: 'AI Customer Assistant',
        roleTitle: '24/7 Customer Assistant',
        welcomeGreeting: 'Hi! How can I help you today?',
      };
    }

    const config = parseConfigJson(agent.configJson);
    const merged: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      ...config,
      id: agent.id,
      tenantId: agent.tenantId || undefined,
      slug: agent.slug || identifier,
      name: agent.name || config.name || DEFAULT_FORM_AGENT.name,
      roleTitle: agent.roleTitle || config.roleTitle || DEFAULT_FORM_AGENT.roleTitle,
      avatarUrl: config.avatarUrl || agent.avatarUrl || DEFAULT_FORM_AGENT.avatarUrl,
      brandColor: config.brandColor || agent.brandColor || DEFAULT_FORM_AGENT.brandColor,
    };
    return merged;
  } catch (err) {
    console.error('[intake-page] Failed to load agent:', err);
    return DEFAULT_FORM_AGENT;
  }
}

async function getConnectedForm(agent: FormAgentData) {
  try {
    const candidateId = agent.connectedForms?.[0]?.id;
    const form = await db.form.findFirst({
      where: {
        OR: [
          ...(candidateId ? [{ id: candidateId }] : []),
          ...(agent.tenantId ? [{ tenantId: agent.tenantId }] : []),
          { slug: agent.slug },
          { slug: `${agent.slug}-intake` },
        ],
        status: { not: 'archived' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        schemaJson: true,
      },
    });

    if (!form) return null;

    let parsedSchema = null;
    try {
      parsedSchema = form.schemaJson ? JSON.parse(form.schemaJson) : null;
    } catch {}

    return {
      id: form.id,
      name: form.name,
      slug: form.slug,
      schema: parsedSchema,
    };
  } catch (err) {
    console.error('[intake-page] Failed to query connected form:', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);

  if (!agent) {
    return { title: 'AI Customer Intake | Fieseros' };
  }

  return {
    title: `${agent.name} — 24/7 AI Customer Intake`,
    description: `Connect with our 24/7 AI assistant to get estimates, ask questions, or book service appointments.`,
    openGraph: {
      title: `${agent.name} — AI Customer Intake`,
      description: `Schedule appointments, request quotes, and connect with our team.`,
      images: agent.avatarUrl ? [{ url: agent.avatarUrl }] : undefined,
    },
  };
}

export default async function HostedIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === '1';

  const agent = await getAgent(slug);
  if (!agent) {
    notFound();
  }

  const connectedForm = await getConnectedForm(agent);

  return (
    <HostedIntakeClient
      agent={agent}
      isEmbed={isEmbed}
      connectedForm={connectedForm}
    />
  );
}
