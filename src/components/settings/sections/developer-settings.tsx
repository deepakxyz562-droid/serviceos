'use client';

import { useEffect, useState } from 'react';
import { Code } from 'lucide-react';
import { SectionPlaceholder, type PlaceholderInfoRow } from './_section-placeholder';

/**
 * Developer settings placeholder. Shows live counts of configured
 * webhooks + WordPress endpoints so developers can quickly verify their
 * integrations are still wired up while the full CRUD UI is in flight.
 */
export function DeveloperSettings() {
  const [infoRows, setInfoRows] = useState<PlaceholderInfoRow[]>([
    { label: 'API Keys', value: 'Loading…', status: 'muted' },
    { label: 'Event Webhooks', value: 'Loading…', status: 'muted' },
    { label: 'WordPress Endpoints', value: 'Loading…', status: 'muted' },
    { label: 'OAuth Apps', value: '0', status: 'muted' },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [whRes, wpRes] = await Promise.all([
          fetch('/api/event-webhooks'),
          fetch('/api/wordpress/config'),
        ]);
        const whData = whRes.ok ? await whRes.json() : { webhooks: [] };
        const wpData = wpRes.ok ? await wpRes.json() : { endpoints: [] };
        const webhookCount = (whData.webhooks ?? []).length;
        const wpCount = (wpData.endpoints ?? []).length;
        if (cancelled) return;
        setInfoRows([
          { label: 'API Keys', value: '0 issued', status: 'muted' },
          {
            label: 'Event Webhooks',
            value: `${webhookCount} configured`,
            status: webhookCount > 0 ? 'ok' : 'warn',
          },
          {
            label: 'WordPress Endpoints',
            value: `${wpCount} configured`,
            status: wpCount > 0 ? 'ok' : 'warn',
          },
          { label: 'OAuth Apps', value: '0', status: 'muted' },
        ]);
      } catch {
        // keep loading placeholders on error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionPlaceholder
      title="Developer Settings"
      description="API keys, webhooks, OAuth, marketplace apps, custom integrations, developer docs"
      icon={Code}
      accent="slate"
      configuredItems={[
        { label: 'API Keys', hint: 'Generate, rotate, and revoke API keys with scoped permissions' },
        { label: 'Webhooks', hint: 'Register endpoints to receive event payloads' },
        { label: 'OAuth Apps', hint: 'Register OAuth client apps for third-party access' },
        { label: 'Marketplace Apps', hint: 'Publish custom apps to the Fieseros marketplace' },
        { label: 'Custom Integrations', hint: 'Build private integrations with the SDK' },
        { label: 'Developer Docs', hint: 'OpenAPI spec, SDK downloads, sample apps' },
        { label: 'Rate Limits', hint: 'View per-key rate limits and current usage' },
        { label: 'Sandbox Mode', hint: 'Test integrations against sandbox data' },
      ]}
      infoRows={infoRows}
    />
  );
}
