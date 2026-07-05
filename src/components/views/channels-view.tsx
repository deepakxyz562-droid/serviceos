'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MessageSquare, Smartphone, Mail, KeyRound, RadioTower, Plus, Loader2,
  CheckCircle2, XCircle, AlertCircle, Trash2, Wifi, WifiOff, Shield,
  Globe, Database, Cloud, Send, Star, Eye, EyeOff, Link2, RefreshCw, FileText, Clock,
  Pencil,
} from 'lucide-react'
import { authFetch } from '@/lib/client-auth'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CredentialLite { id: string; name: string; type: string }
interface CommProvider {
  id: string; name: string; type: 'whatsapp' | 'sms'; provider: string; status: string
  isDefault: boolean; sentToday: number; sentThisMonth: number; totalSent: number
  totalDelivered: number; totalFailed: number; lastUsedAt: string | null; lastError: string | null
  credentialId: string | null; credential: CredentialLite | null
  config?: Record<string, string>
}
interface EmailProvider {
  id: string; name: string; providerType: string; fromName: string; fromEmail: string
  replyTo: string | null; usageType: string; isDefaultTransactional: boolean; isDefaultMarketing: boolean
  isPlatform: boolean; status: string; totalSent: number; totalDelivered: number
  totalFailed: number; lastUsedAt: string | null; config?: Record<string, string>
}
interface CredItem {
  id: string; name: string; type: string; data: Record<string, string>
  lastUsedAt: string | null; expiresAt: string | null; createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROV_LABELS: Record<string, string> = {
  meta_cloud_api: 'Meta Cloud API', '360dialog': '360Dialog', wati: 'WATI',
  interakt: 'Interakt', gupshup: 'Gupshup', twilio: 'Twilio', msg91: 'MSG91',
  plivo: 'Plivo', textlocal: 'Textlocal', exotel: 'Exotel', amazon_sns: 'Amazon SNS',
  smtp: 'SMTP', resend: 'Resend', sendgrid: 'SendGrid', ses: 'AWS SES',
  mailgun: 'Mailgun', postmark: 'Postmark', brevo: 'Brevo',
}
const WA_PROVIDERS = ['meta_cloud_api', '360dialog', 'wati', 'interakt', 'gupshup']
const SMS_PROVIDERS = ['twilio', 'msg91', 'plivo', 'textlocal', 'exotel', 'amazon_sns']
const WA_FIELDS = [
  { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text' as const, required: true },
  { key: 'businessAccountId', label: 'Business Account ID', type: 'text' as const, required: false },
  { key: 'accessToken', label: 'Access Token', type: 'password' as const, required: true },
  { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'text' as const, required: false },
]
const SMS_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'password'; required?: boolean; placeholder?: string }[]> = {
  twilio: [{ key: 'accountSid', label: 'Account SID', type: 'text', required: true }, { key: 'authToken', label: 'Auth Token', type: 'password', required: true }, { key: 'fromNumber', label: 'From Number', type: 'text', required: true }],
  msg91: [{ key: 'authKey', label: 'Auth Key', type: 'password', required: true }, { key: 'fromNumber', label: 'From Number', type: 'text', required: true }],
  plivo: [{ key: 'authId', label: 'Auth ID', type: 'text', required: true }, { key: 'authToken', label: 'Auth Token', type: 'password', required: true }, { key: 'fromNumber', label: 'From Number', type: 'text', required: true }],
  textlocal: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }, { key: 'fromNumber', label: 'Sender Name', type: 'text', required: true }],
  exotel: [{ key: 'accountSid', label: 'Account SID', type: 'text', required: true }, { key: 'authToken', label: 'Auth Token', type: 'password', required: true }, { key: 'fromNumber', label: 'From Number', type: 'text', required: true }],
  amazon_sns: [
    { key: 'accessKeyId', label: 'AWS Access Key ID', type: 'text', required: true, placeholder: 'AKIA...' },
    { key: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password', required: true, placeholder: '••••••••' },
    { key: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
    { key: 'senderId', label: 'Sender ID (optional, up to 11 chars)', type: 'text', placeholder: 'SRVOS' },
    { key: 'messageType', label: 'SMS Type', type: 'text', placeholder: 'Transactional' },
  ],
}

// Email provider config field schemas
type FieldDef = { key: string; label: string; type: 'text' | 'password' | 'switch'; required?: boolean; placeholder?: string }
const EMAIL_FIELDS: Record<string, FieldDef[]> = {
  smtp: [
    { key: 'smtpHost', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
    { key: 'smtpPort', label: 'SMTP Port', type: 'text', placeholder: '587' },
    { key: 'smtpSecure', label: 'Use TLS / Secure (port 465)', type: 'switch' },
    { key: 'smtpUser', label: 'SMTP Username', type: 'text', required: true, placeholder: 'apikey' },
    { key: 'smtpPass', label: 'SMTP Password', type: 'password', required: true, placeholder: '••••••••' },
  ],
  ses: [
    { key: 'smtpHost', label: 'SES SMTP Host', type: 'text', required: true, placeholder: 'email-smtp.us-east-1.amazonaws.com' },
    { key: 'smtpPort', label: 'SMTP Port', type: 'text', placeholder: '587' },
    { key: 'smtpUser', label: 'SMTP Username (IAM SMTP creds)', type: 'text', required: true, placeholder: 'AKIA...' },
    { key: 'smtpPass', label: 'SMTP Password', type: 'password', required: true, placeholder: '••••••••' },
  ],
  resend: [{ key: 'apiKey', label: 'Resend API Key', type: 'password', required: true, placeholder: 're_...' }],
  sendgrid: [{ key: 'apiKey', label: 'SendGrid API Key', type: 'password', required: true, placeholder: 'SG....' }],
  mailgun: [
    { key: 'apiKey', label: 'Mailgun API Key', type: 'password', required: true, placeholder: 'key-...' },
    { key: 'domain', label: 'Sending Domain', type: 'text', required: true, placeholder: 'mg.example.com' },
  ],
  postmark: [{ key: 'serverToken', label: 'Postmark Server Token', type: 'password', required: true, placeholder: '••••••••' }],
  brevo: [{ key: 'apiKey', label: 'Brevo API Key', type: 'password', required: true, placeholder: 'xkeysib-...' }],
}
const EMAIL_DEFAULTS: Record<string, Record<string, string | boolean>> = {
  smtp: { smtpHost: '', smtpPort: '587', smtpSecure: false, smtpUser: '', smtpPass: '' },
  ses: { smtpHost: 'email-smtp.us-east-1.amazonaws.com', smtpPort: '587', smtpUser: '', smtpPass: '' },
  resend: { apiKey: '' },
  sendgrid: { apiKey: '' },
  mailgun: { apiKey: '', domain: '' },
  postmark: { serverToken: '' },
  brevo: { apiKey: '' },
}
const SECRET_KEYS = new Set(['accessToken', 'authToken', 'authKey', 'apiKey', 'smtpPass', 'serverToken', 'secret', 'token', 'password', 'secretAccessKey', 'sessionToken'])

const CRED_TYPES: Record<string, { icon: typeof KeyRound; label: string; color: string; bg: string }> = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp API', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  apiKey: { icon: KeyRound, label: 'API Key', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  httpBearer: { icon: Shield, label: 'Bearer Token', color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  httpBasic: { icon: Shield, label: 'Basic Auth', color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
  oAuth2: { icon: Globe, label: 'OAuth 2.0', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  dbConnection: { icon: Database, label: 'Database', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  awsIam: { icon: Cloud, label: 'AWS IAM', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  googleServiceAccount: { icon: Globe, label: 'Google SA', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { cls: string; icon: typeof CheckCircle2 }> = {
    active: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    connected: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    paused: { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
    error: { cls: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  }
  const s = m[status] || { cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: WifiOff }
  return <Badge variant="outline" className={cn('gap-1 text-xs', s.cls)}><s.icon className="size-3" />{status}</Badge>
}

function relTime(d: string | null) {
  if (!d) return 'Never'
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  return m < 1 ? 'Just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`
}

function LoadingSkeleton() {
  return <div className="space-y-4">
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-4"><Skeleton className="h-10 w-full" /></Card>)}</div>
    <Card className="p-4"><Skeleton className="h-32 w-full" /></Card>
  </div>
}

/** Build config to send for a PUT: keep non-secret values, only include secret
 *  fields the user actually re-typed (non-empty, non-masked). */
function buildEditConfig(formConfig: Record<string, string>, existing: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(formConfig)) {
    if (SECRET_KEYS.has(k)) {
      // Only send secret if user typed a fresh value
      if (v && v.trim() && !v.includes('••')) out[k] = v
    } else {
      out[k] = v ?? existing[k] ?? ''
    }
  }
  return out
}

// ─── Shared Comm Provider Card ────────────────────────────────────────────────

function ProviderCard({ p, onEdit, onDelete }: { p: CommProvider; onEdit: (p: CommProvider) => void; onDelete: (id: string) => void }) {
  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{p.name}</span>
            <StatusBadge status={p.status} />
            {p.isDefault && <Badge className="bg-amber-100 text-amber-700 text-xs">Default</Badge>}
            <Badge variant="outline" className="text-xs">{PROV_LABELS[p.provider] || p.provider}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>Sent: {p.totalSent}</span><span>Delivered: {p.totalDelivered}</span>
            <span>Failed: {p.totalFailed}</span><span>Last: {relTime(p.lastUsedAt)}</span>
          </div>
          {p.credential && <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground"><Link2 className="size-3" />{p.credential.name}</div>}
          {p.lastError && <p className="text-xs text-red-500 mt-1 truncate">{p.lastError}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-emerald-600" onClick={() => onEdit(p)} title="Edit"><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-red-600" onClick={() => onDelete(p.id)} title="Delete"><Trash2 className="size-4" /></Button>
        </div>
      </div>
    </Card>
  )
}

// ─── WhatsApp Section ─────────────────────────────────────────────────────────

function WhatsAppSection() {
  const [providers, setProviders] = useState<CommProvider[]>([])
  const [waConfig, setWaConfig] = useState<{ isConfigured: boolean; mode: string; phoneNumberId: string; source: string; verifyTokenSet: boolean } | null>(null)
  const [setupStatus, setSetupStatus] = useState<{ totalTemplates: number; preBuiltCount: number; essentialCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<CommProvider | null>(null)
  const [form, setForm] = useState({ name: '', provider: 'meta_cloud_api', config: {} as Record<string, string>, isDefault: false })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, cr, sr] = await Promise.all([
        authFetch('/api/communication-providers?type=whatsapp'),
        authFetch('/api/whatsapp/config'),
        authFetch('/api/whatsapp/templates?setup=true'),
      ])
      if (pr.ok) { const d = await pr.json(); setProviders((Array.isArray(d) ? d : d.data || d.providers || []).filter((p: CommProvider) => p.type === 'whatsapp')) }
      if (cr.ok) setWaConfig(await cr.json())
      if (sr.ok) { const sd = await sr.json(); if (sd.setupStatus) setSetupStatus(sd.setupStatus) }
    } catch { toast.error('Failed to load WhatsApp data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ name: '', provider: 'meta_cloud_api', config: {}, isDefault: false }); setShowDialog(true) }
  const openEdit = (p: CommProvider) => {
    setEditing(p)
    setForm({ name: p.name, provider: p.provider, config: { ...(p.config || {}) }, isDefault: p.isDefault })
    setShowDialog(true)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await authFetch('/api/whatsapp/templates', { method: 'POST', body: JSON.stringify({ action: 'sync_status' }) })
      if (!r.ok) throw new Error((await r.json()).error || 'Sync failed')
      const result = await r.json()
      toast.success(`Synced ${result.synced || 0} templates, created ${result.created || 0} new`)
      load()
    } catch (e: any) { toast.error(e.message || 'Sync failed') } finally { setSyncing(false) }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Provider name is required'); return }
    if (!form.config.accessToken || form.config.accessToken.includes('••')) { toast.error('Access Token is required'); return }
    if (!form.config.phoneNumberId) { toast.error('Phone Number ID is required'); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), type: 'whatsapp', provider: form.provider, config: form.config, isDefault: form.isDefault, sendingEnabled: true }
      const r = editing
        ? await authFetch(`/api/communication-providers/${editing.id}`, { method: 'PUT', body: JSON.stringify({ ...payload, config: buildEditConfig(form.config, editing.config || {}) }) })
        : await authFetch('/api/communication-providers', { method: 'POST', body: JSON.stringify(payload) })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      toast.success(editing ? 'WhatsApp provider updated' : 'WhatsApp provider added')
      setShowDialog(false); load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this provider?')) return
    try { await authFetch(`/api/communication-providers/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() } catch { toast.error('Delete failed') }
  }

  if (loading) return <LoadingSkeleton />
  const active = providers.filter(p => p.status === 'active' || p.status === 'connected').length
  const def = providers.find(p => p.isDefault)
  const fields = WA_FIELDS

  return (
    <div className="space-y-4">
      {waConfig && (
        <Card className={cn('border', waConfig.isConfigured ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {waConfig.isConfigured ? <Wifi className="size-5 text-emerald-600" /> : <WifiOff className="size-5 text-amber-600" />}
              <div>
                <p className="font-medium text-sm">{waConfig.isConfigured ? 'WhatsApp Connected' : 'WhatsApp Not Connected'}</p>
                <p className="text-xs text-muted-foreground">Mode: <Badge variant="outline" className="text-[10px] ml-1">{waConfig.mode}</Badge>
                  {waConfig.phoneNumberId && <span className="ml-2">Phone: {waConfig.phoneNumberId}</span>}</p>
              </div>
            </div>
            <Badge variant="outline" className={cn('text-xs', waConfig.verifyTokenSet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
              {waConfig.verifyTokenSet ? 'Webhook Verified' : 'Webhook Unverified'}
            </Badge>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Providers" value={providers.length} icon={MessageSquare} color="text-emerald-600" />
        <StatCard label="Active" value={active} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Default" value={def?.name || 'None'} icon={Star} color="text-amber-600" />
        <StatCard label="Sent This Month" value={providers.reduce((s, p) => s + p.sentThisMonth, 0)} icon={Send} color="text-teal-600" />
      </div>
      {setupStatus && (
        <p className="text-xs text-muted-foreground">{setupStatus.totalTemplates} local templates, {setupStatus.preBuiltCount} pre-built available</p>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">WhatsApp Providers</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || !waConfig?.isConfigured}>
            {syncing ? <Loader2 className="size-4 mr-1 animate-spin" /> : <RefreshCw className="size-4 mr-1" />}Sync Templates
          </Button>
          <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />Add Provider</Button>
        </div>
      </div>
      {providers.length === 0
        ? <EmptyState icon={MessageSquare} title="No WhatsApp providers" description="Connect your WhatsApp Business API to start messaging." actionLabel="Add Provider" onAction={openAdd} />
        : <div className="grid gap-3">{providers.map(p => <ProviderCard key={p.id} p={p} onEdit={openEdit} onDelete={handleDelete} />)}</div>}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit WhatsApp Provider' : 'Add WhatsApp Provider'}</DialogTitle><DialogDescription>{editing ? 'Update provider configuration. Leave secret fields blank to keep current values.' : 'Connect a WhatsApp Business API provider.'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Provider Name <span className="text-rose-500">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My WhatsApp" /></div>
            <div className="space-y-1.5"><Label>Provider</Label><Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v, config: {} }))} disabled={!!editing}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WA_PROVIDERS.map(p => <SelectItem key={p} value={p}>{PROV_LABELS[p]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Configuration</p>
              {fields.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}{f.required && <span className="text-rose-500"> *</span>}</Label>
                  <Input type={f.type} value={form.config[f.key] || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, [f.key]: e.target.value } }))} placeholder={editing && f.type === 'password' ? '•••••••• (leave blank to keep)' : f.type === 'password' ? 'Enter access token' : ''} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} /><Label>Set as default</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-4 mr-1 animate-spin" />}{editing ? 'Save Changes' : 'Add Provider'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── SMS Section ──────────────────────────────────────────────────────────────

function SMSSection() {
  const [providers, setProviders] = useState<CommProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<CommProvider | null>(null)
  const [form, setForm] = useState({ name: '', provider: 'twilio', config: {} as Record<string, string>, isDefault: false })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await authFetch('/api/communication-providers?type=sms'); if (r.ok) { const d = await r.json(); setProviders((Array.isArray(d) ? d : d.data || d.providers || []).filter((p: CommProvider) => p.type === 'sms')) } }
    catch { toast.error('Failed to load SMS providers') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ name: '', provider: 'twilio', config: {}, isDefault: false }); setShowDialog(true) }
  const openEdit = (p: CommProvider) => {
    setEditing(p); setForm({ name: p.name, provider: p.provider, config: { ...(p.config || {}) }, isDefault: p.isDefault }); setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Provider name is required'); return }
    const fields = SMS_FIELDS[form.provider] || []
    for (const f of fields) {
      if (f.required && (!form.config[f.key] || form.config[f.key].includes('••'))) { toast.error(`${f.label} is required`); return }
    }
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), type: 'sms', provider: form.provider, config: form.config, isDefault: form.isDefault, sendingEnabled: true }
      const r = editing
        ? await authFetch(`/api/communication-providers/${editing.id}`, { method: 'PUT', body: JSON.stringify({ ...payload, config: buildEditConfig(form.config, editing.config || {}) }) })
        : await authFetch('/api/communication-providers', { method: 'POST', body: JSON.stringify(payload) })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      toast.success(editing ? 'SMS provider updated' : 'SMS provider added'); setShowDialog(false); load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this provider?')) return
    try { await authFetch(`/api/communication-providers/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() } catch { toast.error('Delete failed') }
  }

  if (loading) return <LoadingSkeleton />
  const fields = SMS_FIELDS[form.provider] || []

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Providers" value={providers.length} icon={Smartphone} color="text-teal-600" />
        <StatCard label="Active" value={providers.filter(p => p.status === 'active').length} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Sent This Month" value={providers.reduce((s, p) => s + p.sentThisMonth, 0)} icon={Send} color="text-teal-600" />
        <StatCard label="Failed (Total)" value={providers.reduce((s, p) => s + p.totalFailed, 0)} icon={XCircle} color="text-red-500" />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">SMS Providers</h3>
        <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />Add Provider</Button>
      </div>
      {providers.length === 0
        ? <EmptyState icon={Smartphone} title="No SMS providers" description="Add an SMS provider like Twilio or MSG91." actionLabel="Add Provider" onAction={openAdd} />
        : <div className="grid gap-3">{providers.map(p => <ProviderCard key={p.id} p={p} onEdit={openEdit} onDelete={handleDelete} />)}</div>}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit SMS Provider' : 'Add SMS Provider'}</DialogTitle><DialogDescription>{editing ? 'Update provider configuration. Leave secret fields blank to keep current values.' : 'Connect an SMS provider for text messaging.'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Provider Name <span className="text-rose-500">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My SMS" /></div>
            <div className="space-y-1.5"><Label>Provider</Label><Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v, config: {} }))} disabled={!!editing}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SMS_PROVIDERS.map(p => <SelectItem key={p} value={p}>{PROV_LABELS[p]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Configuration</p>
              {fields.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}{f.required && <span className="text-rose-500"> *</span>}</Label>
                  <Input type={f.type} value={form.config[f.key] || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, [f.key]: e.target.value } }))} placeholder={editing && f.type === 'password' ? '•••••••• (leave blank to keep)' : ''} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} /><Label>Set as default</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-4 mr-1 animate-spin" />}{editing ? 'Save Changes' : 'Add Provider'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Email Section ────────────────────────────────────────────────────────────

function EmailSection() {
  const [providers, setProviders] = useState<EmailProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<EmailProvider | null>(null)
  const [form, setForm] = useState({ name: '', providerType: 'ses', fromName: '', fromEmail: '', replyTo: '', usageType: 'both', isDefaultTransactional: false, isDefaultMarketing: false, config: {} as Record<string, string> })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await authFetch('/api/email-providers'); if (r.ok) { const d = await r.json(); setProviders(Array.isArray(d) ? d : (d.data || [])) } }
    catch { toast.error('Failed to load email providers') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', providerType: 'ses', fromName: '', fromEmail: '', replyTo: '', usageType: 'both', isDefaultTransactional: false, isDefaultMarketing: false, config: { ...(EMAIL_DEFAULTS['ses'] as Record<string, string>) } })
    setShowDialog(true)
  }
  const openEdit = (p: EmailProvider) => {
    setEditing(p)
    setForm({
      name: p.name, providerType: p.providerType, fromName: p.fromName, fromEmail: p.fromEmail,
      replyTo: p.replyTo || '', usageType: p.usageType, isDefaultTransactional: p.isDefaultTransactional,
      isDefaultMarketing: p.isDefaultMarketing, config: { ...(p.config || {}) },
    })
    setShowDialog(true)
  }

  const handleTypeChange = (newType: string) => {
    const defaults = EMAIL_DEFAULTS[newType] || {}
    setForm(f => ({ ...f, providerType: newType, config: { ...defaults } }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Provider name is required'); return }
    if (!form.fromName.trim()) { toast.error('From name is required'); return }
    if (!form.fromEmail.trim()) { toast.error('From email is required'); return }
    const fields = EMAIL_FIELDS[form.providerType] || []
    for (const f of fields) {
      if (f.type === 'switch') continue
      if (f.required) {
        const val = form.config[f.key]
        if (!val || val.includes('••')) { toast.error(`${f.label} is required`); return }
      }
    }
    setSaving(true)
    try {
      // Build configJson: for edit, skip secret fields the user didn't re-type
      const configToSend: Record<string, string | boolean> = {}
      for (const [k, v] of Object.entries(form.config)) {
        if (SECRET_KEYS.has(k)) {
          if (editing) { if (v && !v.includes('••')) configToSend[k] = v }
          else configToSend[k] = v
        } else {
          configToSend[k] = v
        }
      }
      // Include boolean switch values
      for (const f of fields) { if (f.type === 'switch') configToSend[f.key] = form.config[f.key] === 'true' || false as any }
      const payload = { name: form.name.trim(), providerType: form.providerType, configJson: configToSend, fromName: form.fromName.trim(), fromEmail: form.fromEmail.trim(), replyTo: form.replyTo.trim() || null, usageType: form.usageType, isDefaultTransactional: form.isDefaultTransactional, isDefaultMarketing: form.isDefaultMarketing }
      const r = editing
        ? await authFetch(`/api/email-providers/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await authFetch('/api/email-providers', { method: 'POST', body: JSON.stringify(payload) })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      toast.success(editing ? 'Email provider updated' : 'Email provider added'); setShowDialog(false); load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this email provider?')) return
    try { await authFetch(`/api/email-providers/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() } catch { toast.error('Delete failed') }
  }

  if (loading) return <LoadingSkeleton />
  const fields = EMAIL_FIELDS[form.providerType] || []

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Providers" value={providers.length} icon={Mail} color="text-teal-600" />
        <StatCard label="Active" value={providers.filter(p => p.status === 'active').length} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Default TX" value={providers.find(p => p.isDefaultTransactional)?.name || 'None'} icon={Send} color="text-teal-600" />
        <StatCard label="Default MK" value={providers.find(p => p.isDefaultMarketing)?.name || 'None'} icon={Star} color="text-amber-600" />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Email Providers</h3>
        <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />Add Provider</Button>
      </div>
      {providers.length === 0
        ? <EmptyState icon={Mail} title="No email providers" description="Add an email provider (SMTP, AWS SES, SendGrid, etc.) to send transactional and marketing emails." actionLabel="Add Provider" onAction={openAdd} />
        : <div className="grid gap-3 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>{providers.map(p => (
            <Card key={p.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{p.name}</span>
                    <StatusBadge status={p.status} />
                    {p.isDefaultTransactional && <Badge className="bg-teal-100 text-teal-700 text-xs">Default TX</Badge>}
                    {p.isDefaultMarketing && <Badge className="bg-amber-100 text-amber-700 text-xs">Default MK</Badge>}
                    {p.isPlatform && <Badge className="bg-slate-100 text-slate-600 text-xs">Platform</Badge>}
                    <Badge variant="outline" className="text-xs">{PROV_LABELS[p.providerType] || p.providerType}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{p.usageType}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.fromName} &lt;{p.fromEmail}&gt;</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>Sent: {p.totalSent}</span><span>Delivered: {p.totalDelivered}</span><span>Failed: {p.totalFailed}</span><span>Last: {relTime(p.lastUsedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-emerald-600" onClick={() => openEdit(p)} title="Edit"><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </Card>
          ))}</div>}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Email Provider' : 'Add Email Provider'}</DialogTitle><DialogDescription>{editing ? 'Update provider configuration. Leave secret fields blank to keep current values.' : 'Configure an email sending provider.'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Provider Name <span className="text-rose-500">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Production SES" /></div>
            <div className="space-y-1.5"><Label>Provider Type</Label><Select value={form.providerType} onValueChange={handleTypeChange} disabled={!!editing}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['smtp', 'resend', 'sendgrid', 'ses', 'mailgun', 'postmark', 'brevo'].map(t => <SelectItem key={t} value={t}>{PROV_LABELS[t] || t}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Configuration — {PROV_LABELS[form.providerType] || form.providerType}</p>
              {fields.map(f => (
                f.type === 'switch' ? (
                  <div key={f.key} className="flex items-center justify-between rounded-md border p-2.5">
                    <div><div className="text-xs font-medium">{f.label}</div></div>
                    <Switch checked={form.config[f.key] === 'true'} onCheckedChange={v => setForm(p => ({ ...p, config: { ...p.config, [f.key]: v ? 'true' : 'false' } }))} />
                  </div>
                ) : (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs">{f.label}{f.required && <span className="text-rose-500"> *</span>}</Label>
                    <Input type={f.type} value={form.config[f.key] || ''} onChange={e => setForm(p => ({ ...p, config: { ...p.config, [f.key]: e.target.value } }))} placeholder={editing && f.type === 'password' ? '•••••••• (leave blank to keep)' : (f.placeholder || '')} />
                  </div>
                )
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>From Name <span className="text-rose-500">*</span></Label><Input value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))} placeholder="AquaFlow" /></div>
              <div className="space-y-1.5"><Label>From Email <span className="text-rose-500">*</span></Label><Input type="email" value={form.fromEmail} onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))} placeholder="support@example.com" /></div>
            </div>
            <div className="space-y-1.5"><Label>Reply-To (optional)</Label><Input type="email" value={form.replyTo} onChange={e => setForm(f => ({ ...f, replyTo: e.target.value }))} placeholder="support@example.com" /></div>
            <div className="space-y-1.5"><Label>Usage</Label><Select value={form.usageType} onValueChange={v => setForm(f => ({ ...f, usageType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['transactional', 'marketing', 'both'].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center gap-2"><Switch checked={form.isDefaultTransactional} onCheckedChange={v => setForm(f => ({ ...f, isDefaultTransactional: v }))} /><Label>Default Transactional</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.isDefaultMarketing} onCheckedChange={v => setForm(f => ({ ...f, isDefaultMarketing: v }))} /><Label>Default Marketing</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-4 mr-1 animate-spin" />}{editing ? 'Save Changes' : 'Add Provider'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Credentials Section ──────────────────────────────────────────────────────

function CredentialsSection() {
  const [items, setItems] = useState<CredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<CredItem | null>(null)
  const [form, setForm] = useState({ name: '', type: 'apiKey', data: {} as Record<string, string> })
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await authFetch(typeFilter !== 'all' ? `/api/credentials?type=${typeFilter}` : '/api/credentials')
      if (r.ok) { const d = await r.json(); setItems(d.credentials || d.data || d || []) }
    } catch { toast.error('Failed to load credentials') } finally { setLoading(false) }
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ name: '', type: 'apiKey', data: {} }); setShowDialog(true) }
  const openEdit = (c: CredItem) => { setEditing(c); setForm({ name: c.name, type: c.type, data: { ...c.data } }); setShowDialog(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Credential name is required'); return }
    if (!editing && !form.data.key) { toast.error('Key is required'); return }
    setSaving(true)
    try {
      // For edit: only send key/secret if user typed new values
      const dataToSend: Record<string, string> = {}
      for (const [k, v] of Object.entries(form.data)) {
        if (v && !v.includes('••')) dataToSend[k] = v
      }
      if (editing) {
        const r = await authFetch(`/api/credentials/${editing.id}`, { method: 'PUT', body: JSON.stringify({ name: form.name.trim(), type: form.type, data: dataToSend }) })
        if (!r.ok) throw new Error((await r.json()).error || 'Failed')
        toast.success('Credential updated')
      } else {
        const r = await authFetch('/api/credentials', { method: 'POST', body: JSON.stringify({ name: form.name.trim(), type: form.type, serviceName: form.type, data: form.data }) })
        if (!r.ok) throw new Error((await r.json()).error || 'Failed')
        toast.success('Credential created')
      }
      setShowDialog(false); load()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential?')) return
    try { await authFetch(`/api/credentials/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() } catch { toast.error('Delete failed') }
  }

  const toggleVis = (id: string) => setVisible(p => { const n = new Set(p); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n })

  if (loading) return <LoadingSkeleton />
  const expiringSoon = items.filter(c => c.expiresAt && new Date(c.expiresAt).getTime() - Date.now() < 7 * 86400000).length
  const recentUse = items.filter(c => c.lastUsedAt && Date.now() - new Date(c.lastUsedAt).getTime() < 86400000).length

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total" value={items.length} icon={KeyRound} color="text-teal-600" />
        <StatCard label="Types" value={Object.keys(items.reduce<Record<string, number>>((a, c) => { a[c.type] = 1; return a }, {})).length} icon={Shield} color="text-amber-600" />
        <StatCard label="Used Today" value={recentUse} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Expiring Soon" value={expiringSoon} icon={AlertCircle} color="text-red-500" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={typeFilter === 'all' ? 'default' : 'outline'} onClick={() => setTypeFilter('all')}>All</Button>
        {Object.entries(CRED_TYPES).map(([k, v]) => <Button key={k} size="sm" variant={typeFilter === k ? 'default' : 'outline'} onClick={() => setTypeFilter(k)}><v.icon className="size-3.5 mr-1" />{v.label}</Button>)}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Credentials Vault</h3>
        <Button size="sm" onClick={openAdd}><Plus className="size-4 mr-1" />Add Credential</Button>
      </div>
      {items.length === 0
        ? <EmptyState icon={KeyRound} title="No credentials" description="Store API keys, tokens, and auth credentials securely." actionLabel="Add Credential" onAction={openAdd} />
        : <div className="grid gap-3 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>{items.map(c => {
            const cfg = CRED_TYPES[c.type] || CRED_TYPES.apiKey; const Icon = cfg.icon; const isVis = visible.has(c.id)
            return (
              <Card key={c.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs', cfg.bg)}><Icon className={cn('size-3.5', cfg.color)} />{cfg.label}</div>
                      <span className="font-medium text-sm">{c.name}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      {Object.entries(c.data).slice(0, 3).map(([k, v]) => <div key={k}><span className="font-medium">{k}:</span> <span className="font-mono">{isVis ? v : '••••••••'}</span></div>)}
                      {Object.keys(c.data).length > 3 && <span className="text-muted-foreground">+{Object.keys(c.data).length - 3} more</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>Created: {relTime(c.createdAt)}</span>{c.lastUsedAt && <span>Used: {relTime(c.lastUsedAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-emerald-600" onClick={() => openEdit(c)} title="Edit"><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => toggleVis(c.id)}>{isVis ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(c.id)} title="Delete"><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
              </Card>
            )
          })}</div>}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Credential' : 'Add Credential'}</DialogTitle><DialogDescription>{editing ? 'Update credential details. Leave secret fields blank to keep current values.' : 'Store an API key or auth credential securely.'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name <span className="text-rose-500">*</span></Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My API Key" /></div>
            <div className="space-y-1.5"><Label>Type</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, data: {} }))} disabled={!!editing}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CRED_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Key {editing && <span className="text-xs text-muted-foreground">(leave blank to keep)</span>}{!editing && <span className="text-rose-500"> *</span>}</Label><Input value={form.data.key || ''} onChange={e => setForm(f => ({ ...f, data: { ...f.data, key: e.target.value } }))} placeholder={editing ? '•••••••• (leave blank to keep)' : 'API Key / Token value'} /></div>
            <div className="space-y-1.5"><Label>Secret (optional)</Label><Input type="password" value={form.data.secret || ''} onChange={e => setForm(f => ({ ...f, data: { ...f.data, secret: e.target.value } }))} placeholder="••••••••" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="size-4 mr-1 animate-spin" />}{editing ? 'Save Changes' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChannelsView() {
  const [activeTab, setActiveTab] = useState('whatsapp')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><RadioTower className="size-6" />Channels & Credentials</h1>
        <p className="text-muted-foreground mt-1">Configure your communication channels — WhatsApp, SMS, Email — and manage API credentials.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2"><MessageSquare className="size-4" /><span className="hidden sm:inline">WhatsApp</span></TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2"><Smartphone className="size-4" /><span className="hidden sm:inline">SMS</span></TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2"><Mail className="size-4" /><span className="hidden sm:inline">Email</span></TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2"><KeyRound className="size-4" /><span className="hidden sm:inline">Credentials</span></TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp"><WhatsAppSection /></TabsContent>
        <TabsContent value="sms"><SMSSection /></TabsContent>
        <TabsContent value="email"><EmailSection /></TabsContent>
        <TabsContent value="credentials"><CredentialsSection /></TabsContent>
      </Tabs>
    </div>)
}
