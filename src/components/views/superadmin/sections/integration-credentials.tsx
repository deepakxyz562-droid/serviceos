'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Plus, KeyRound, CheckCircle2, XCircle, ExternalLink, Trash2, Edit3 } from 'lucide-react';
import { OAUTH_PROVIDERS } from '@/lib/channel-meta';

interface Credential {
  id: string;
  provider: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  additionalConfigJson: string;
  status: string;
  createdAt: string;
}

interface ProviderStatus {
  provider: string;
  displayName: string;
  configured: boolean;
  credentialId: string | null;
}

export function IntegrationCredentialsSection() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: '',
    clientSecret: '',
    additionalConfig: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/integration-credentials');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCredentials(data.credentials || []);
      setProviders(data.providers || []);
    } catch (err) {
      toast.error('Failed to load integration credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (provider: string) => {
    const existing = credentials.find((c) => c.provider === provider);
    setEditingProvider(provider);
    setForm({
      clientId: existing?.clientId || '',
      clientSecret: '', // always blank — user must re-enter to update
      additionalConfig: existing ? safeParse(existing.additionalConfigJson) : {},
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingProvider) return;
    if (!form.clientId.trim()) {
      toast.error('Client ID is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/integration-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: editingProvider,
          clientId: form.clientId,
          clientSecret: form.clientSecret || undefined,
          additionalConfig: form.additionalConfig,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      toast.success(`${OAUTH_PROVIDERS[editingProvider].displayName} credentials saved`);
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, provider: string) => {
    if (!confirm(`Remove ${OAUTH_PROVIDERS[provider]?.displayName || provider} credentials? Tenants will not be able to connect this channel until reconfigured.`)) return;
    try {
      await fetch(`/api/superadmin/integration-credentials/${id}`, { method: 'DELETE' });
      toast.success('Credentials removed');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <KeyRound className="size-6" />
          Integration Credentials
        </h2>
        <p className="text-muted-foreground mt-1">
          Platform-level OAuth app credentials for channel providers. Tenants click
          &ldquo;Connect with X&rdquo; and authorize — these credentials are used
          server-side and never exposed to tenants.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-amber-900 mb-2">How OAuth channels work</h3>
          <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
            <li>You register an OAuth app with the provider (Meta, Google, Slack, Microsoft).</li>
            <li>You enter the Client ID + Secret here (this page).</li>
            <li>Tenants see a &ldquo;Connect with WhatsApp&rdquo; button in their channel settings.</li>
            <li>Clicking it opens the provider&apos;s OAuth consent screen.</li>
            <li>After consent, the tenant&apos;s access token is stored in their CommunicationProvider record.</li>
          </ol>
          <p className="text-xs text-amber-700 mt-3">
            Until you configure a provider here, the corresponding &ldquo;Connect&rdquo; button
            shows &ldquo;Not yet available&rdquo; for tenants.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => {
          const cred = credentials.find((c) => c.provider === p.provider);
          const meta = OAUTH_PROVIDERS[p.provider];
          return (
            <Card key={p.provider}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {p.displayName}
                      {p.configured ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle2 className="size-3 mr-1" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="size-3 mr-1" /> Not configured
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Scopes: <code className="text-xs">{meta?.scopes}</code>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cred && (
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div><span className="font-medium">Client ID:</span> {cred.clientId}</div>
                    <div><span className="font-medium">Secret:</span> {cred.clientSecret}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p.provider)}>
                    <Edit3 className="size-3.5 mr-1" />
                    {cred ? 'Edit' : 'Configure'}
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={meta?.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5 mr-1" />
                      Docs
                    </a>
                  </Button>
                  {cred && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      onClick={() => handleDelete(cred.id, p.provider)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Configure {editingProvider ? OAUTH_PROVIDERS[editingProvider]?.displayName : ''}
            </DialogTitle>
            <DialogDescription>
              Enter the OAuth app credentials from the provider dashboard. The Client Secret
              is stored encrypted and never exposed to tenants.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Client ID (App ID)</Label>
              <Input
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                placeholder="e.g. 1234567890123456"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Client Secret{' '}
                <span className="text-xs text-muted-foreground">
                  (leave blank to keep existing)
                </span>
              </Label>
              <Input
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>
            {editingProvider === 'whatsapp' || editingProvider === 'messenger' || editingProvider === 'instagram' ? (
              <div className="space-y-2">
                <Label>App Secret (Meta — for webhook signature verification)</Label>
                <Input
                  type="password"
                  value={form.additionalConfig.appSecret || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      additionalConfig: { ...form.additionalConfig, appSecret: e.target.value },
                    })
                  }
                  placeholder="••••••••"
                />
              </div>
            ) : null}
            {editingProvider === 'slack' ? (
              <div className="space-y-2">
                <Label>Signing Secret (Slack — for request verification)</Label>
                <Input
                  type="password"
                  value={form.additionalConfig.signingSecret || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      additionalConfig: { ...form.additionalConfig, signingSecret: e.target.value },
                    })
                  }
                  placeholder="••••••••"
                />
              </div>
            ) : null}
            {editingProvider === 'teams' ? (
              <div className="space-y-2">
                <Label>Tenant ID (Azure AD)</Label>
                <Input
                  value={form.additionalConfig.tenantId || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      additionalConfig: { ...form.additionalConfig, tenantId: e.target.value },
                    })
                  }
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                />
              </div>
            ) : null}
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">OAuth Redirect URI:</strong>
              <code className="block mt-1 break-all">
                {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
                /api/oauth/{editingProvider}/callback
              </code>
              <p className="mt-2">
                Add this URL to the provider&apos;s OAuth app settings as an authorized redirect URI.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.clientId.trim()}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function safeParse(json: string): Record<string, string> {
  try {
    const obj = JSON.parse(json);
    // Strip masked values — user must re-enter to update
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && !v.startsWith('••••')) {
        clean[k] = v;
      }
    }
    return clean;
  } catch {
    return {};
  }
}
