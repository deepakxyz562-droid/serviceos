'use client';

import { useState, useEffect } from 'react';
import {
  KeyRound,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Save,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface KeyStatus {
  configured: boolean;
  masked: string | null;
}

export function AiVoiceSettingsTab() {
  const [status, setStatus] = useState<KeyStatus>({ configured: false, masked: null });
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vapi/api-key');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
    } catch {
      toast.error('Failed to load Vapi configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Vapi API key');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/vapi/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save key');
      toast.success('Vapi API key saved & validated');
      setApiKey('');
      setShowKey(false);
      fetchStatus();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove your Vapi API key? AI Receptionist features will stop working until you re-add a key.')) return;
    try {
      setRemoving(true);
      const res = await fetch('/api/vapi/api-key', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove key');
      toast.success('Vapi API key removed');
      fetchStatus();
    } catch {
      toast.error('Failed to remove key');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── BYOK explainer ─────────────────────────────────────────── */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/10">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <PhoneCall className="size-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                AI Receptionist — Bring Your Own Key (BYOK)
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Free for all users
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Connect your Vapi.ai account to power AI voice receptionists. You pay Vapi directly
                for call minutes (~$0.05–0.15/min). ServiceOS pays $0 in API costs.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid sm:grid-cols-3 gap-3">
            <a
              href="https://vapi.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="size-4 text-muted-foreground" />
              <div>
                <div className="font-medium">1. Create Vapi account</div>
                <div className="text-xs text-muted-foreground">Sign up at vapi.ai</div>
              </div>
            </a>
            <a
              href="https://dashboard.vapi.ai/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
            >
              <KeyRound className="size-4 text-muted-foreground" />
              <div>
                <div className="font-medium">2. Get your API key</div>
                <div className="text-xs text-muted-foreground">Dashboard → API Keys</div>
              </div>
            </a>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-background">
              <ShieldCheck className="size-4 text-emerald-600" />
              <div>
                <div className="font-medium">3. Paste below</div>
                <div className="text-xs text-muted-foreground">Encrypted at rest</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Current status ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="size-4" />
            API Key Status
          </CardTitle>
          <CardDescription>Your Vapi.ai API key is stored securely on your tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking status...
            </div>
          ) : status.configured ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium text-emerald-700 dark:text-emerald-400">Connected</div>
                  <div className="text-xs text-muted-foreground font-mono">{status.masked}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={removing}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {removing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Remove Key
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="size-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-medium text-amber-700 dark:text-amber-400">Not configured</div>
                <div className="text-xs text-muted-foreground">Add your Vapi API key below to enable AI Receptionist.</div>
              </div>
            </div>
          )}

          <Separator />

          {/* ─── Add/Update key ──────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="vapi-key">{status.configured ? 'Replace API Key' : 'Enter Vapi API Key'}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="vapi-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || !apiKey.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save & Validate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We validate the key against the Vapi API before saving. Your key is stored in your tenant settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Webhook setup instructions ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Point Vapi webhooks to your ServiceOS instance to receive call events and transcripts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Webhook URL</Label>
            <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/vapi/webhook` : '/api/vapi/webhook'}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Function-Call Server URL</Label>
            <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/vapi/function-call` : '/api/vapi/function-call'}
            </div>
            <p className="text-xs text-muted-foreground">
              Set this as the <code className="px-1 py-0.5 bg-muted rounded">serverUrl</code> on each Vapi assistant to
              enable function calling (create lead, book appointment, check availability, etc.).
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs">
            <AlertCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              <span className="font-medium text-blue-700 dark:text-blue-400">Setup tip:</span> In Vapi Dashboard →
              Webhooks, add the Webhook URL above. For function calling, the Server URL is auto-set on new assistants
              created through ServiceOS.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
