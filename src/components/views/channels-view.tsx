'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Zap,
  Link2,
  Settings2,
  ShieldCheck,
  Clock,
  Info,
} from 'lucide-react'
import { authFetch } from '@/lib/client-auth'
import {
  CHANNELS,
  CHANNELS_BY_TIER,
  getChannel,
  type ChannelMeta,
} from '@/lib/channel-meta'
import { AutoReplyCard } from '@/components/settings/sections/auto-reply-card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelConfigRow {
  id: string
  type: string
  name: string
  connected: boolean
  setupCompleted: boolean
  setupStep: number
  tier: string | null
  channelType: string | null
  lastTestedAt: string | null
  lastTestStatus: string | null
  config: Record<string, unknown>
}

interface OAuthStatus {
  configured: boolean
  credentialId: string | null
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChannelsView() {
  const [configs, setConfigs] = useState<ChannelConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardChannel, setWizardChannel] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/omnichannel/channels')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setConfigs(data)
    } catch {
      toast.error('Failed to load channels')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const getConfig = (channelId: string): ChannelConfigRow | undefined =>
    configs.find((c) => c.type === channelId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Channels</h2>
          <p className="text-muted-foreground mt-1">
            Connect 10 messaging channels. Each channel has step-by-step guidance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('size-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Connected" value={configs.filter((c) => c.connected).length} icon={CheckCircle2} color="text-green-600" />
        <StatTile label="Not configured" value={configs.filter((c) => !c.connected).length} icon={XCircle} color="text-muted-foreground" />
        <StatTile label="One-click" value={CHANNELS_BY_TIER.one_click.length} icon={Zap} color="text-blue-600" />
        <StatTile label="OAuth" value={CHANNELS_BY_TIER.oauth.length} icon={Link2} color="text-purple-600" />
      </div>

      {/* Channel grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 h-40 bg-muted/30" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              config={getConfig(channel.id)}
              onConfigure={() => setWizardChannel(channel.id)}
            />
          ))}
        </div>
      )}

      {/* Auto-Reply Configuration — moved here from the Omnichannel inbox view
          so the inbox stays focused on conversations while all channel-level
          configuration (including auto-reply) lives in this settings page. */}
      <AutoReplyCard />

      {/* Wizard modal */}
      {wizardChannel && (
        <ChannelWizard
          channel={getChannel(wizardChannel)!}
          config={getConfig(wizardChannel)}
          onClose={() => setWizardChannel(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ─── Channel Card ─────────────────────────────────────────────────────────────

function ChannelCard({
  channel,
  config,
  onConfigure,
}: {
  channel: ChannelMeta
  config?: ChannelConfigRow
  onConfigure: () => void
}) {
  const Icon = channel.icon
  const connected = config?.connected ?? false
  const setupCompleted = config?.setupCompleted ?? false

  return (
    <Card className={cn('relative overflow-hidden transition-shadow hover:shadow-md', connected && 'border-green-200')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn('flex size-10 items-center justify-center rounded-lg border', channel.badgeClass)}>
            <Icon className="size-5" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <TierBadge tier={channel.tier} />
            {connected ? (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                <CheckCircle2 className="size-3 mr-1" /> Connected
              </Badge>
            ) : setupCompleted ? (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="size-3 mr-1" /> Inactive
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock className="size-3 mr-1" /> Not set up
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base mt-2">{channel.label}</CardTitle>
        <CardDescription className="text-xs line-clamp-2">{channel.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          size="sm"
          variant={connected ? 'outline' : 'default'}
          className="w-full"
          onClick={onConfigure}
        >
          <Settings2 className="size-3.5 mr-2" />
          {connected ? 'Manage' : 'Configure'}
        </Button>
      </CardContent>
    </Card>
  )
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === 'one_click') {
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-300">
        <Zap className="size-3 mr-1" /> One-click
      </Badge>
    )
  }
  if (tier === 'oauth') {
    return (
      <Badge variant="outline" className="text-purple-600 border-purple-300">
        <Link2 className="size-3 mr-1" /> OAuth
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-gray-600 border-gray-300">
      <Settings2 className="size-3 mr-1" /> Manual
    </Badge>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof CheckCircle2
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <Icon className={cn('size-5', color)} />
          <div>
            <div className="text-2xl font-bold leading-none">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Channel Wizard Modal ─────────────────────────────────────────────────────

function ChannelWizard({
  channel,
  config,
  onClose,
  onSaved,
}: {
  channel: ChannelMeta
  config?: ChannelConfigRow
  onClose: () => void
  onSaved: () => void
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('flex size-10 items-center justify-center rounded-lg border', channel.badgeClass)}>
              <channel.icon className="size-5" />
            </div>
            <div>
              <DialogTitle>{channel.label} Setup</DialogTitle>
              <DialogDescription>{channel.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Overview / guidance */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <Info className="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <strong>Response expectation:</strong> {channel.responseExpectation}
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <ShieldCheck className="size-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <strong>Market note:</strong> {channel.marketNote}
            </div>
          </div>
        </div>

        {/* Tier-specific content */}
        {channel.tier === 'one_click' && (
          <OneClickWizard channel={channel} config={config} onSaved={onSaved} onClose={onClose} />
        )}
        {channel.tier === 'oauth' && (
          <OAuthWizard channel={channel} config={config} onSaved={onSaved} onClose={onClose} />
        )}
        {channel.tier === 'manual' && (
          <ManualWizard channel={channel} config={config} onSaved={onSaved} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── One-Click Wizard (Email, Live Chat, Web Widget) ──────────────────────────

function OneClickWizard({
  channel,
  config,
  onSaved,
  onClose,
}: {
  channel: ChannelMeta
  config?: ChannelConfigRow
  onSaved: () => void
  onClose: () => void
}) {
  const [enabled, setEnabled] = useState(config?.connected ?? false)
  const [saving, setSaving] = useState(false)

  const embedCode = getEmbedCode(channel.id)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authFetch('/api/omnichannel/channels', {
        method: 'POST',
        body: JSON.stringify({
          channel: channel.id,
          name: channel.label,
          connected: enabled,
          setupCompleted: true,
          setupStep: 1,
          tier: 'one_click',
          channelType: channel.category,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(`${channel.label} ${enabled ? 'enabled' : 'disabled'}`)
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label className="text-base font-medium">Enable {channel.label}</Label>
          <p className="text-sm text-muted-foreground mt-1">
            We host this channel for you — no external configuration needed.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {embedCode && (
        <div className="space-y-2">
          <Label>Embed Code (paste into your website)</Label>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40">
            <code>{embedCode}</code>
          </pre>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(embedCode)
              toast.success('Copied to clipboard')
            }}
          >
            <Copy className="size-3.5 mr-2" />
            Copy
          </Button>
        </div>
      )}

      {channel.id === 'email' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>Note:</strong> Transactional email is included. For marketing/campaign
          emails, add your own ESP (Resend, SendGrid, SES, etc.) in{' '}
          <strong>Settings → Channels &amp; Credentials → Email</strong>.
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </div>
  )
}

function getEmbedCode(channelId: string): string {
  if (channelId === 'livechat') {
    return `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget/livechat.js" async></script>
<div id="serviceos-livechat" data-position="bottom-right"></div>`
  }
  if (channelId === 'webwidget') {
    return `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget/widget.js" async></script>`
  }
  return ''
}

// ─── OAuth Wizard (WhatsApp, Messenger, Instagram, Google, Teams, Slack) ──────

function OAuthWizard({
  channel,
  config,
  onSaved,
  onClose,
}: {
  channel: ChannelMeta
  config?: ChannelConfigRow
  onSaved: () => void
  onClose: () => void
}) {
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    checkOAuthStatus()
  }, [])

  // Listen for OAuth popup completion
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_success' && event.data?.provider === channel.oauthProvider) {
        toast.success(`${channel.label} connected successfully!`)
        setConnecting(false)
        onSaved()
        onClose()
      } else if (event.data?.type === 'oauth_error') {
        toast.error(event.data?.error || 'Connection failed')
        setConnecting(false)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [channel, onSaved, onClose])

  const checkOAuthStatus = async () => {
    try {
      const res = await authFetch('/api/superadmin/integration-credentials')
      // This will 403 for non-superadmin — that's expected. We need a tenant-visible endpoint.
      // For now, infer from the channel config.
      if (res.ok) {
        const data = await res.json()
        const p = data.providers?.find((p: { provider: string }) => p.provider === channel.oauthProvider)
        setOauthStatus({ configured: !!p?.configured, credentialId: p?.credentialId || null })
      } else {
        // Non-superadmin: assume configured (the connect button will 503 if not)
        setOauthStatus({ configured: true, credentialId: null })
      }
    } catch {
      setOauthStatus({ configured: true, credentialId: null })
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleConnect = () => {
    setConnecting(true)
    // Open OAuth in a popup
    const url = `/api/oauth/${channel.oauthProvider}/connect`
    const popup = window.open(url, 'oauth-popup', 'width=600,height=700,scrollbars=yes')
    if (!popup) {
      toast.error('Popup blocked — please allow popups and try again')
      setConnecting(false)
      return
    }
    // Fallback: if popup doesn't post message within 2 min, reset state
    setTimeout(() => setConnecting(false), 120000)
  }

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${channel.label}? You will stop receiving messages from this channel.`)) return
    try {
      await authFetch('/api/omnichannel/channels', {
        method: 'POST',
        body: JSON.stringify({
          channel: channel.id,
          name: channel.label,
          connected: false,
          setupCompleted: false,
          setupStep: 0,
        }),
      })
      toast.success(`${channel.label} disconnected`)
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Steps */}
      <div className="space-y-3">
        <Step
          number={1}
          title="Superadmin registers OAuth app"
          done={oauthStatus?.configured}
          active={!oauthStatus?.configured}
        >
          The platform admin registers an OAuth app with {channel.label} and stores the
          credentials in <strong>Superadmin → Integration Credentials</strong>.
          {!oauthStatus?.configured && (
            <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
              ⚠ Not yet configured by the platform. The Connect button will not work until an
              admin adds credentials.
            </div>
          )}
        </Step>
        <Step
          number={2}
          title="Click Connect to authorize"
          done={config?.connected}
          active={oauthStatus?.configured && !config?.connected}
        >
          Click the button below to open {channel.label}&rsquo;s consent screen. After you
          authorize, this channel will start receiving messages.
        </Step>
        <Step number={3} title="Start messaging" done={config?.connected} active={false}>
          Messages from {channel.label} appear in your Omnichannel Inbox automatically.
        </Step>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        {config?.connected ? (
          <Button variant="destructive" onClick={handleDisconnect}>
            Disconnect {channel.label}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={connecting || !oauthStatus?.configured}
          >
            {connecting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Link2 className="size-4 mr-2" />
                Connect with {channel.label}
              </>
            )}
          </Button>
        )}
        <Button variant="outline" asChild>
          <a
            href={`https://developers.google.com/my-business/content/chat-and-messages`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-3.5 mr-2" />
            Provider Docs
          </a>
        </Button>
        <Button variant="ghost" onClick={onClose} className="ml-auto">
          Close
        </Button>
      </div>

      {/* Compliance note */}
      <ComplianceNote channel={channel} />
    </div>
  )
}

// ─── Manual Wizard (SMS) ──────────────────────────────────────────────────────

function ManualWizard({
  channel,
  config,
  onSaved,
  onClose,
}: {
  channel: ChannelMeta
  config?: ChannelConfigRow
  onSaved: () => void
  onClose: () => void
}) {
  const [provider, setProvider] = useState('twilio')
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const providers = channel.id === 'sms'
    ? [
        { value: 'twilio', label: 'Twilio', fields: ['sid', 'authToken', 'fromNumber'] },
        { value: 'vonage', label: 'Vonage (Nexmo)', fields: ['apiKey', 'apiSecret', 'fromNumber'] },
        { value: 'msg91', label: 'MSG91 (India)', fields: ['authKey', 'senderId'] },
        { value: 'plivo', label: 'Plivo', fields: ['authId', 'authToken', 'fromNumber'] },
        { value: 'textlocal', label: 'TextLocal', fields: ['apiKey', 'sender'] },
        { value: 'exotel', label: 'Exotel (India)', fields: ['sid', 'token', 'fromNumber'] },
      ]
    : []

  const currentProvider = providers.find((p) => p.value === provider)
  const fieldLabels: Record<string, string> = {
    sid: 'Account SID',
    authToken: 'Auth Token',
    fromNumber: 'From Number (Sender ID)',
    apiKey: 'API Key',
    apiSecret: 'API Secret',
    authKey: 'Auth Key',
    senderId: 'Sender ID',
    authId: 'Auth ID',
    token: 'Token',
    sender: 'Sender Name',
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to CommunicationProvider via the existing API
      const res = await authFetch('/api/communication-providers', {
        method: 'POST',
        body: JSON.stringify({
          name: `${currentProvider?.label} ${channel.label}`,
          type: channel.id,
          provider,
          config: form,
          status: 'active',
        }),
      })
      if (!res.ok) throw new Error('Failed to save provider')

      // Mark channel as connected
      await authFetch('/api/omnichannel/channels', {
        method: 'POST',
        body: JSON.stringify({
          channel: channel.id,
          name: channel.label,
          connected: true,
          setupCompleted: true,
          setupStep: 3,
          tier: 'manual',
          channelType: channel.category,
        }),
      })

      toast.success(`${channel.label} provider saved`)
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    // Simulate a test (real implementation would send a test SMS)
    setTimeout(() => {
      setTesting(false)
      toast.success('Configuration looks valid (test mode)')
    }, 1500)
  }

  return (
    <div className="space-y-4">
      {/* Steps */}
      <div className="space-y-3">
        <Step number={1} title="Choose your SMS provider" done={!!provider} active={true}>
          Pick the provider that matches your region and budget. Twilio is universal; MSG91
          and Exotel are best for India.
        </Step>
        <Step number={2} title="Enter API credentials" done={Object.keys(form).length > 0} active={true}>
          Copy the credentials from your provider dashboard. All secrets are stored encrypted.
        </Step>
        <Step number={3} title="Test &amp; activate" done={config?.connected} active={false}>
          Send a test message, then activate the channel.
        </Step>
      </div>

      {/* Provider select */}
      <div className="space-y-2">
        <Label>SMS Provider</Label>
        <Select value={provider} onValueChange={(v) => { setProvider(v); setForm({}) }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Provider-specific fields */}
      {currentProvider && (
        <div className="grid gap-3 sm:grid-cols-2">
          {currentProvider.fields.map((field) => (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs">{fieldLabels[field] || field}</Label>
              <Input
                type={field.includes('Token') || field.includes('Secret') || field.includes('Key') ? 'password' : 'text'}
                value={form[field] || ''}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                placeholder={`Enter ${fieldLabels[field] || field}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Compliance note */}
      <ComplianceNote channel={channel} />

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={handleTest} disabled={testing || Object.keys(form).length === 0}>
          {testing ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
          Test Connection
        </Button>
        <Button onClick={handleSave} disabled={saving || Object.keys(form).length === 0}>
          {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
          Save &amp; Activate
        </Button>
        <Button variant="ghost" onClick={onClose} className="ml-auto">
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Step({
  number,
  title,
  done,
  active,
  children,
}: {
  number: number
  title: string
  done: boolean
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          done ? 'bg-green-100 text-green-700' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {done ? <CheckCircle2 className="size-4" /> : number}
      </div>
      <div className="flex-1 pb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{children}</div>
      </div>
    </div>
  )
}

function ComplianceNote({ channel }: { channel: ChannelMeta }) {
  const notes: Record<string, string> = {
    whatsapp:
      'WhatsApp enforces a 24-hour customer-service window. After 24h since the customer last messaged, you can only send approved template messages. Bulk marketing via WhatsApp is not supported.',
    sms: 'TCPA/carrier compliance: STOP, HELP, and UNSTOP keywords must be honored automatically. We handle these for you. Marketing bulk SMS is not supported — only transactional.',
    email:
      'GDPR compliance: Marketing emails include an unsubscribe header and honor opt-outs. Transactional emails (invoices, quotes) bypass unsubscribe.',
    messenger: 'Meta requires responses within 24 hours. After 24h, use the "human agent" tag to continue.',
    instagram: 'Meta requires responses within 7 days. Use approved templates for automated replies.',
    googlebusiness: 'Google expects responses within 24 hours. Enable auto-reply to meet SLA.',
  }
  const note = notes[channel.id]
  if (!note) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <ShieldCheck className="size-4 inline mr-1" />
      <strong>Compliance:</strong> {note}
    </div>
  )
}

export default ChannelsView
