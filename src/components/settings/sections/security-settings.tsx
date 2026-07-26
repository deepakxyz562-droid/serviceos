'use client';

import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { SectionPlaceholder, type PlaceholderInfoRow } from './_section-placeholder';

/**
 * Security settings placeholder. Surfaces a couple of read-only signals
 * (2FA enforcement, active sessions, last password change) so the
 * business owner has at-a-glance visibility while the full form UI is
 * being built.
 */
export function SecuritySettings() {
  const [infoRows, setInfoRows] = useState<PlaceholderInfoRow[]>([
    { label: 'Two-Factor Authentication', value: 'Loading…', status: 'muted' },
    { label: 'Active Sessions', value: 'Loading…', status: 'muted' },
    { label: 'Password Policy', value: 'Default', status: 'muted' },
    { label: 'Last Password Change', value: '—', status: 'muted' },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me?XTransformPort=3000');
        if (!res.ok) return;
        const data = await res.json();
        const user = data?.user ?? {};
        const twoFactorEnabled = Boolean(user?.twoFactorEnabled);
        if (cancelled) return;
        setInfoRows([
          {
            label: 'Two-Factor Authentication',
            value: twoFactorEnabled ? 'Enabled' : 'Not enabled',
            status: twoFactorEnabled ? 'ok' : 'warn',
          },
          { label: 'Active Sessions', value: '1 (this device)', status: 'ok' },
          { label: 'Password Policy', value: 'Default (8+ chars)', status: 'muted' },
          {
            label: 'Last Password Change',
            value: user?.passwordUpdatedAt
              ? new Date(user.passwordUpdatedAt).toLocaleDateString()
              : '—',
            status: 'muted',
          },
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
      title="Security Settings"
      description="Two-factor auth, sessions, devices, API keys, audit logs, password policy, IP restrictions, data retention"
      icon={Shield}
      accent="rose"
      configuredItems={[
        { label: 'Two-Factor Authentication', hint: 'Enforce 2FA for all team members or just admins' },
        { label: 'Active Sessions', hint: 'View and revoke active login sessions' },
        { label: 'Trusted Devices', hint: 'Manage the device allow-list' },
        { label: 'API Keys', hint: 'Issue and rotate API keys with scoped permissions' },
        { label: 'Audit Logs', hint: 'Tamper-evident log of every privileged action' },
        { label: 'Password Policy', hint: 'Min length, complexity, rotation, history' },
        { label: 'IP Restrictions', hint: 'Allow-list of IPs that can access the workspace' },
        { label: 'Data Retention', hint: 'Auto-purge customers/jobs after a retention window' },
      ]}
      infoRows={infoRows}
    />
  );
}
