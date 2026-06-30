'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Shield, Wrench, Megaphone, ArrowRight, ArrowLeft,
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Plus,
  Eye, ExternalLink, Key, Phone, Globe, Zap, ChevronRight,
  Clock, FileText, Send, Upload, Star, Sparkles, Settings2,
  Copy, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  PRE_BUILT_WHATSAPP_TEMPLATES,
  META_CATEGORY_INFO,
  getTemplatesByMetaCategory,
  previewTemplate,
  type WhatsAppPreBuiltTemplate,
} from '@/lib/whatsapp-prebuilt-templates';

// ─── Types ────────────────────────────────────────────────────────────────

interface SetupStatus {
  metaConnected: boolean;
  providerCount: number;
  defaultProvider: { id: string; name: string; provider: string; configJson?: string } | null;
  templatesImported: number;
  templatesApproved: number;
  totalTemplates: number;
  preBuiltCount: number;
  essentialCount: number;
  setupStep: number;
}

type WizardStep = 'banner' | 'connect' | 'number' | 'import' | 'customize' | 'submit' | 'waiting' | 'approved';

// ─── Step Config ──────────────────────────────────────────────────────────

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'connect', label: 'Connect Meta Business', icon: Globe },
  { key: 'number', label: 'Connect WhatsApp Number', icon: Phone },
  { key: 'import', label: 'Import ServiceOS Templates', icon: Upload },
  { key: 'customize', label: 'Customize Company Name', icon: Settings2 },
  { key: 'submit', label: 'Submit to Meta', icon: Send },
];

// ─── Component ────────────────────────────────────────────────────────────

export function WhatsAppSetupWizard() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<WizardStep>('banner');
  const [saving, setSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<Set<string>>(new Set());
  const [importAll, setImportAll] = useState(true);

  // Meta connection form
  const [metaForm, setMetaForm] = useState({
    name: '',
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    wabaId: '',
    webhookVerifyToken: '',
  });

  // ─── Fetch Setup Status ─────────────────────────────────────────────

  const fetchSetupStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/templates?setup=true');
      if (res.ok) {
        const data = await res.json();
        setSetupStatus(data.setupStatus);
        // If already set up, show approved state
        if (data.setupStatus.templatesApproved > 0 && data.setupStatus.metaConnected) {
          setCurrentStep('approved');
        }
      }
    } catch {
      toast.error('Failed to load setup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSetupStatus(); }, [fetchSetupStatus]);

  // ─── Step Navigation ────────────────────────────────────────────────

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);
  const isFirstStep = stepIndex <= 0;
  const isLastStep = stepIndex >= STEPS.length - 1;

  const goNext = () => {
    if (currentStep === 'banner') { setCurrentStep('connect'); return; }
    if (currentStep === 'approved') return;
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx].key);
    else setCurrentStep('waiting');
  };

  const goBack = () => {
    if (currentStep === 'connect') { setCurrentStep('banner'); return; }
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx].key);
  };

  // ─── Save Meta Provider ─────────────────────────────────────────────

  const saveMetaProvider = async () => {
    if (!metaForm.name.trim() || !metaForm.accessToken.trim() || !metaForm.phoneNumberId.trim()) {
      toast.error('Name, Access Token, and Phone Number ID are required');
      return;
    }
    setSaving(true);
    try {
      // Check if there's already a provider for this tenant or if super admin created one
      const res = await fetch('/api/communication-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metaForm.name.trim(),
          type: 'whatsapp',
          provider: 'meta_cloud_api',
          isDefault: true,
          sendingEnabled: true,
          config: {
            accessToken: metaForm.accessToken,
            phoneNumberId: metaForm.phoneNumberId,
            businessAccountId: metaForm.businessAccountId,
            wabaId: metaForm.wabaId,
            webhookVerifyToken: metaForm.webhookVerifyToken,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to save provider');
        return;
      }

      toast.success('Meta Business connected successfully!');
      await fetchSetupStatus();
      goNext();
    } catch {
      toast.error('Failed to connect Meta Business');
    } finally {
      setSaving(false);
    }
  };

  // ─── Import Templates ───────────────────────────────────────────────

  const importTemplates = async () => {
    setSaving(true);
    try {
      const keysToImport = importAll
        ? PRE_BUILT_WHATSAPP_TEMPLATES.map(t => t.key)
        : Array.from(selectedTemplateKeys);

      if (keysToImport.length === 0) {
        toast.error('Select at least one template to import');
        return;
      }

      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          templateKeys: keysToImport,
          companyName: companyName || 'Our Company',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to import templates');
        return;
      }

      const data = await res.json();
      toast.success(`Imported ${data.imported} templates! ${data.skipped > 0 ? `(${data.skipped} already existed)` : ''}`);
      await fetchSetupStatus();
      goNext();
    } catch {
      toast.error('Failed to import templates');
    } finally {
      setSaving(false);
    }
  };

  // ─── Submit All to Meta ─────────────────────────────────────────────

  const submitToMeta = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_all' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Failed to submit templates');
        return;
      }

      const data = await res.json();
      toast.success(`Submitted ${data.submitted} templates to Meta! ${data.failed > 0 ? `(${data.failed} failed)` : ''}`);
      setCurrentStep('waiting');
      await fetchSetupStatus();
    } catch {
      toast.error('Failed to submit templates');
    } finally {
      setSaving(false);
    }
  };

  // ─── Sync Status ────────────────────────────────────────────────────

  const syncStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_status' }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Synced ${data.synced} templates from Meta`);
        await fetchSetupStatus();
        // Check if all approved
        if (setupStatus && setupStatus.templatesApproved > 0) {
          setCurrentStep('approved');
        }
      }
    } catch {
      toast.error('Failed to sync status');
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle Template Selection ──────────────────────────────────────

  const toggleTemplate = (key: string) => {
    setSelectedTemplateKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectEssential = () => {
    setSelectedTemplateKeys(new Set(PRE_BUILT_WHATSAPP_TEMPLATES.filter(t => t.essential).map(t => t.key)));
    setImportAll(false);
  };

  const selectAll = () => {
    setSelectedTemplateKeys(new Set(PRE_BUILT_WHATSAPP_TEMPLATES.map(t => t.key)));
    setImportAll(false);
  };

  // ─── Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ─── BANNER (Initial State) ─────────────────────────────────────────

  if (currentStep === 'banner') {
    return (
      <div className="space-y-6">
        {/* Warning Banner */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-300 mb-1">⚠️ Action Required</h3>
                <p className="text-sm text-slate-300 mb-3">
                  Before sending WhatsApp messages, Meta requires your business templates to be approved.
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Estimated setup time: 5–10 minutes. You&apos;ll connect your Meta Business account,
                  import our pre-built templates, customize them, and submit for approval.
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={goNext} className="bg-emerald-600 hover:bg-emerald-700">
                    <Zap className="size-4 mr-1.5" /> Start Setup
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchSetupStatus} className="border-slate-700 text-slate-300">
                    <RefreshCw className="size-3.5 mr-1.5" /> Check Status
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick overview cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <MessageSquare className="size-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">{PRE_BUILT_WHATSAPP_TEMPLATES.length} Pre-Built Templates</p>
              <p className="text-xs text-slate-400">Ready to import and submit</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <Clock className="size-8 text-sky-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">5–30 min Approval</p>
              <p className="text-xs text-slate-400">Most templates approved quickly</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="size-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">{PRE_BUILT_WHATSAPP_TEMPLATES.filter(t => t.essential).length} Essential Templates</p>
              <p className="text-xs text-slate-400">Recommended for all businesses</p>
            </CardContent>
          </Card>
        </div>

        {/* Setup flow preview */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white">Setup Wizard Flow</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2 flex-wrap">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                      <span className="size-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-medium">{i + 1}</span>
                      <Icon className="size-3.5 text-slate-300" />
                      <span className="text-xs text-slate-300 whitespace-nowrap">{step.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <ArrowRight className="size-3.5 text-slate-600" />}
                  </div>
                );
              })}
              <ArrowRight className="size-3.5 text-slate-600" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Clock className="size-3.5 text-amber-400" />
                <span className="text-xs text-amber-300">Waiting for Approval</span>
              </div>
              <ArrowRight className="size-3.5 text-slate-600" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-300">Ready to Send ✅</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── APPROVED STATE ──────────────────────────────────────────────────

  if (currentStep === 'approved') {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-8 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-emerald-300 mb-1">WhatsApp Templates Approved! ✅</h3>
                <p className="text-sm text-slate-300 mb-2">
                  Your WhatsApp templates are approved and ready to use. You can now send template messages to your customers.
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{setupStatus?.templatesApproved} approved</span>
                  <span>•</span>
                  <span>{setupStatus?.totalTemplates} total templates</span>
                  <span>•</span>
                  <span>Meta Connected</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Approved', value: setupStatus?.templatesApproved || 0, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Pending', value: (setupStatus?.totalTemplates || 0) - (setupStatus?.templatesApproved || 0), icon: Clock, color: 'text-amber-400' },
            { label: 'Provider', value: setupStatus?.metaConnected ? 'Connected' : 'Not Set', icon: Globe, color: setupStatus?.metaConnected ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Ready', value: setupStatus?.templatesApproved ? 'Yes' : 'No', icon: Send, color: setupStatus?.templatesApproved ? 'text-emerald-400' : 'text-slate-400' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="bg-slate-900 border-slate-800 p-4">
                <div className="flex items-center gap-2">
                  <Icon className={cn('size-4', s.color)} />
                  <div>
                    <p className="text-xs text-slate-400">{s.label}</p>
                    <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── WAITING FOR APPROVAL ────────────────────────────────────────────

  if (currentStep === 'waiting') {
    return (
      <div className="space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6 text-center">
            <div className="size-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="size-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-amber-300 mb-2">Waiting for Meta Approval</h3>
            <p className="text-sm text-slate-300 mb-1">
              Your templates have been submitted to Meta for review.
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Approval typically takes 5–30 minutes. AUTHENTICATION templates are usually auto-approved.
              UTILITY templates take a few minutes. MARKETING templates may take longer.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button onClick={syncStatus} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RefreshCw className="size-4 mr-1.5" />}
                Check Approval Status
              </Button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-400">
              <span>Submitted: {setupStatus?.templatesImported || 0}</span>
              <span>Approved: {setupStatus?.templatesApproved || 0}</span>
              <span>Pending: {(setupStatus?.templatesImported || 0) - (setupStatus?.templatesApproved || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── WIZARD STEP LAYOUT ─────────────────────────────────────────────

  const StepIcon = STEPS[stepIndex]?.icon || Settings2;
  const stepLabel = STEPS[stepIndex]?.label || '';

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = i < stepIndex;
          const isCurrent = i === stepIndex;
          const isFuture = i > stepIndex;
          return (
            <div key={step.key} className="flex items-center gap-2">
              <button
                onClick={() => isCompleted && setCurrentStep(step.key)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors',
                  isCompleted && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 cursor-pointer hover:bg-emerald-500/20',
                  isCurrent && 'bg-emerald-600 border-emerald-600 text-white',
                  isFuture && 'bg-slate-800 border-slate-700 text-slate-500',
                )}
              >
                {isCompleted ? <CheckCircle2 className="size-3" /> : <span className="size-4 rounded-full bg-inherit flex items-center justify-center font-medium text-[10px]">{i + 1}</span>}
                <Icon className="size-3" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="size-3 text-slate-600" />}
            </div>
          );
        })}
      </div>

      <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="h-1.5" />

      {/* ─── Step 1: Connect Meta Business ──────────────────────────── */}
      {currentStep === 'connect' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="size-5 text-emerald-400" /> Connect Meta Business
            </CardTitle>
            <CardDescription className="text-slate-400">
              Link your Meta Business Suite account with your WhatsApp Business API credentials.
              You can find these in your Meta Business Settings → WhatsApp → API Setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20 text-xs text-sky-300">
              <strong>Don&apos;t have a Meta Business account?</strong> Create one at{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-sky-200">
                business.facebook.com <ExternalLink className="size-3 inline" />
              </a>
              . Then go to WhatsApp → Get Started to create your WhatsApp Business API account.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Provider Name *</Label>
                <Input value={metaForm.name} onChange={e => setMetaForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Meta Cloud API - My Business" className="bg-slate-800 border-slate-700 text-white text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Access Token *</Label>
                <Input value={metaForm.accessToken} onChange={e => setMetaForm(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="EAAxxxxxxxxxxxxx" type="password" className="bg-slate-800 border-slate-700 text-white text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Phone Number ID *</Label>
                <Input value={metaForm.phoneNumberId} onChange={e => setMetaForm(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                  placeholder="123456789012345" className="bg-slate-800 border-slate-700 text-white text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Business Account ID</Label>
                <Input value={metaForm.businessAccountId} onChange={e => setMetaForm(prev => ({ ...prev, businessAccountId: e.target.value }))}
                  placeholder="123456789012345" className="bg-slate-800 border-slate-700 text-white text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">WhatsApp Business Account ID (WABA)</Label>
                <Input value={metaForm.wabaId} onChange={e => setMetaForm(prev => ({ ...prev, wabaId: e.target.value }))}
                  placeholder="123456789012345" className="bg-slate-800 border-slate-700 text-white text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Webhook Verify Token</Label>
                <Input value={metaForm.webhookVerifyToken} onChange={e => setMetaForm(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                  placeholder="my_verify_token" className="bg-slate-800 border-slate-700 text-white text-sm font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 2: Connect WhatsApp Number ──────────────────────────── */}
      {currentStep === 'number' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="size-5 text-emerald-400" /> Connect WhatsApp Number
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your WhatsApp Business number is connected via the Meta Cloud API credentials you just entered.
              Verify the connection below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {setupStatus?.metaConnected ? (
              <>
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">WhatsApp Provider Connected!</p>
                    <p className="text-xs text-slate-400">Your Meta Cloud API credentials are active and ready.</p>
                  </div>
                </div>
                {setupStatus.defaultProvider && (
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Active Provider</p>
                    <p className="text-sm text-white">{setupStatus.defaultProvider.name}</p>
                    <p className="text-xs text-slate-500">{setupStatus.defaultProvider.provider}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                <AlertTriangle className="size-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-300">No WhatsApp Provider Connected</p>
                  <p className="text-xs text-slate-400">Go back to Step 1 to connect your Meta Business account first.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Step 3: Import Templates ─────────────────────────────────── */}
      {currentStep === 'import' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="size-5 text-emerald-400" /> Import ServiceOS Templates
            </CardTitle>
            <CardDescription className="text-slate-400">
              Choose which pre-built WhatsApp templates to import. These templates follow Meta&apos;s guidelines
              and are designed for high approval rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={selectEssential}
                className={cn('border-slate-700 text-slate-300', importAll && 'border-emerald-600 text-emerald-400')}>
                <Star className="size-3.5 mr-1.5" /> Essential ({PRE_BUILT_WHATSAPP_TEMPLATES.filter(t => t.essential).length})
              </Button>
              <Button size="sm" variant="outline" onClick={selectAll}
                className="border-slate-700 text-slate-300">
                <Plus className="size-3.5 mr-1.5" /> All ({PRE_BUILT_WHATSAPP_TEMPLATES.length})
              </Button>
              <Badge variant="outline" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                {importAll ? PRE_BUILT_WHATSAPP_TEMPLATES.length : selectedTemplateKeys.size} selected
              </Badge>
            </div>

            {/* Template list by Meta category */}
            {Object.entries(getTemplatesByMetaCategory()).map(([category, templates]) => {
              const info = META_CATEGORY_INFO[category];
              if (!info || templates.length === 0) return null;
              const CatIcon = info.icon === 'Wrench' ? Wrench : info.icon === 'Megaphone' ? Megaphone : Shield;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CatIcon className={cn('size-4', `text-${info.color}-400`)} />
                    <h4 className="text-sm font-medium text-white">{info.label} Templates</h4>
                    <Badge variant="outline" className={cn('text-[10px]', `bg-${info.color}-500/10 text-${info.color}-400 border-${info.color}-500/20`)}>
                      {templates.length} templates
                    </Badge>
                    <span className="text-[10px] text-slate-500">— {info.description}</span>
                  </div>
                  <div className="grid gap-2">
                    {templates.map(tmpl => {
                      const isSelected = importAll || selectedTemplateKeys.has(tmpl.key);
                      return (
                        <div
                          key={tmpl.key}
                          onClick={() => { setImportAll(false); toggleTemplate(tmpl.key); }}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            isSelected ? 'bg-slate-800 border-emerald-600/40' : 'bg-slate-900/50 border-slate-800 opacity-60'
                          )}
                        >
                          <div className="mt-0.5">
                            {isSelected ? (
                              <CheckCircle2 className="size-4 text-emerald-400" />
                            ) : (
                              <div className="size-4 rounded-full border border-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-white">{tmpl.name}</p>
                              {tmpl.essential && (
                                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                                  <Star className="size-2.5 mr-0.5" /> Essential
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px] bg-slate-800 text-slate-400 border-slate-700 capitalize">
                                {tmpl.businessCategory}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{tmpl.description}</p>
                            <p className="text-xs text-slate-500 mt-1 font-mono line-clamp-2">{previewTemplate(tmpl)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Step 4: Customize Company Name ───────────────────────────── */}
      {currentStep === 'customize' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings2 className="size-5 text-emerald-400" /> Customize Company Name
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your company name will appear in template footers and body text.
              This is how customers will recognize your messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Company / Business Name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g., Rajesh Home Services" className="bg-slate-800 border-slate-700 text-white text-sm max-w-md" />
              <p className="text-[10px] text-slate-500">This replaces &quot;Our Company&quot; in template footers and placeholders.</p>
            </div>

            {/* Preview */}
            {companyName.trim() && (
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">Preview</p>
                <div className="max-w-xs mx-auto">
                  {/* Phone mockup */}
                  <div className="bg-emerald-600 rounded-t-2xl px-4 py-2 flex items-center gap-2">
                    <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageSquare className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{companyName}</p>
                      <p className="text-white/60 text-[10px]">online</p>
                    </div>
                  </div>
                  <div className="bg-[#e5ddd5] dark:bg-slate-700 p-3 space-y-2 rounded-b-2xl min-h-24">
                    <div className="bg-white dark:bg-slate-600 rounded-lg p-2.5 max-w-[85%] shadow-sm">
                      <p className="text-xs text-slate-700 dark:text-slate-200">
                        Hi John! Your booking with {companyName} is confirmed.
                      </p>
                      <p className="text-[9px] text-slate-400 text-right mt-1">10:30 AM ✓✓</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Step 5: Submit to Meta ──────────────────────────────────── */}
      {currentStep === 'submit' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Send className="size-5 text-emerald-400" /> Submit to Meta for Approval
            </CardTitle>
            <CardDescription className="text-slate-400">
              Review your templates and submit them to Meta for approval.
              Once approved, you can start sending WhatsApp messages to your customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
              <h4 className="text-sm font-medium text-white">Submission Summary</h4>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-xs">
                <div><span className="text-slate-400">Templates:</span> <span className="text-white font-medium">{setupStatus?.totalTemplates || 0}</span></div>
                <div><span className="text-slate-400">Provider:</span> <span className="text-emerald-400 font-medium">{setupStatus?.metaConnected ? 'Connected' : 'Missing'}</span></div>
                <div><span className="text-slate-400">Company:</span> <span className="text-white font-medium">{companyName || 'Not set'}</span></div>
                <div><span className="text-slate-400">Est. Approval:</span> <span className="text-white font-medium">5–30 min</span></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20 text-xs text-sky-300">
              <strong>What happens next?</strong> Meta will review your templates. AUTHENTICATION templates are usually auto-approved.
              UTILITY templates take a few minutes. MARKETING templates may take up to 24 hours.
              You&apos;ll be able to check the status after submission.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Navigation Buttons ───────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={goBack} disabled={isFirstStep && currentStep !== 'connect'}
          className="bg-slate-800 border-slate-700 text-slate-300">
          <ArrowLeft className="size-4 mr-1.5" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {currentStep === 'connect' && (
            <Button onClick={saveMetaProvider} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />}
              Save & Continue
            </Button>
          )}
          {currentStep === 'number' && (
            <Button onClick={goNext} className="bg-emerald-600 hover:bg-emerald-700">
              Continue <ArrowRight className="size-4 ml-1.5" />
            </Button>
          )}
          {currentStep === 'import' && (
            <Button onClick={importTemplates} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Upload className="size-4 mr-1.5" />}
              Import Templates
            </Button>
          )}
          {currentStep === 'customize' && (
            <Button onClick={goNext} className="bg-emerald-600 hover:bg-emerald-700">
              Continue <ArrowRight className="size-4 ml-1.5" />
            </Button>
          )}
          {currentStep === 'submit' && (
            <Button onClick={submitToMeta} disabled={saving || !setupStatus?.metaConnected} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
              Submit All to Meta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
