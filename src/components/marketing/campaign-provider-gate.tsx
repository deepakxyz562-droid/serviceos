'use client';

/**
 * CampaignProviderGate
 * ---------------------
 * Modal gate that blocks the Campaigns / Email Campaigns views until the
 * tenant has connected their OWN active providers for all 3 channels:
 * SMS, Email, and WhatsApp. Platform-shared providers (isPlatform=true)
 * are intentionally NOT counted — campaigns require the tenant's own
 * credentials for reliable delivery and compliance.
 *
 * Behaviour:
 *   - On mount, fetches /api/campaigns/provider-status.
 *   - If `allConfigured === true` → renders null (no modal).
 *   - If `sessionStorage.campaign_gate_dismissed === '1'` → renders null
 *     for the rest of the browser session (re-appears next session).
 *   - Otherwise renders a non-dismissible shadcn Dialog (overlay-click +
 *     Escape are prevented via onInteractOutside / onEscapeKeyDown).
 *   - "Configure Providers" → calls onConfigure() (parent navigates to
 *     Settings → Providers). Modal STAYS OPEN so it re-appears when the
 *     user navigates back to Campaigns and the view re-mounts.
 *   - "Skip for now" → sets the sessionStorage flag and closes the modal.
 *     This is the ONLY way to dismiss the modal.
 *   - Background is blurred (backdrop-blur-sm on the overlay).
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  MessageSquare,
  Mail,
  MessageCircle,
  Check,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';

interface ChannelStatus {
  configured: boolean
  providerName: string | null
}
interface ProviderStatusResponse {
  sms: ChannelStatus
  email: ChannelStatus
  whatsapp: ChannelStatus
  allConfigured: boolean
}

interface CampaignProviderGateProps {
  /** Called when the user clicks "Configure Providers" — parent navigates. */
  onConfigure: () => void
}

const SESSION_KEY = 'campaign_gate_dismissed'

export function CampaignProviderGate({ onConfigure }: CampaignProviderGateProps) {
  const [status, setStatus] = useState<ProviderStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)

  // Initial load: fetch provider status + check sessionStorage dismissal.
  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const wasDismissed =
          typeof window !== 'undefined' &&
          window.sessionStorage.getItem(SESSION_KEY) === '1'
        if (cancelled) return
        setDismissed(wasDismissed)

        const res = await authFetch('/api/campaigns/provider-status')
        if (!res.ok) {
          // 401 / network error → don't show the gate (let the view render).
          if (cancelled) return
          setStatus(null)
          return
        }
        const data = (await res.json()) as ProviderStatusResponse
        if (cancelled) return
        setStatus(data)
      } catch {
        // Network error — fail open (don't block the user).
        if (!cancelled) setStatus(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [])

  // Open the modal once we have status + not dismissed + NOT all configured.
  // Issues 2+3+4: The gate now only blocks when NO channels are configured
  // (anyConfigured === false). If the tenant has at least one channel
  // configured, they can create campaigns for that channel — the missing
  // channels simply don't appear in the channel selector (handled by the
  // parent CampaignsView). This makes each channel independently gated.
  useEffect(() => {
    if (isLoading) return
    if (dismissed) {
      setOpen(false)
      return
    }
    if (status) {
      const anyConfigured = status.sms.configured || status.email.configured || status.whatsapp.configured
      // Only block if NO channels are configured at all.
      if (!anyConfigured) {
        setOpen(true)
      } else {
        setOpen(false)
      }
    } else {
      setOpen(false)
    }
  }, [isLoading, dismissed, status])

  // While loading or dismissed or at least one channel configured → render nothing.
  if (isLoading || dismissed || !status) {
    return null
  }
  const anyConfigured = status.sms.configured || status.email.configured || status.whatsapp.configured
  if (anyConfigured) {
    return null
  }

  const channels = [
    {
      key: 'sms' as const,
      label: 'SMS',
      icon: MessageSquare,
      ...status.sms,
    },
    {
      key: 'email' as const,
      label: 'Email',
      icon: Mail,
      ...status.email,
    },
    {
      key: 'whatsapp' as const,
      label: 'WhatsApp',
      icon: MessageCircle,
      ...status.whatsapp,
    },
  ]

  const handleSkip = () => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // sessionStorage may be unavailable (private mode) — fail silently.
    }
    setDismissed(true)
    setOpen(false)
  }

  const handleConfigure = () => {
    // Navigate to settings — modal STAYS OPEN so it re-appears when the
    // user comes back to Campaigns and the view re-mounts.
    onConfigure()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { /* swallow all auto-close attempts */ if (next === false) return }}>
      <DialogContent
        className="sm:max-w-lg"
        overlayClassName="backdrop-blur-sm"
        // Block overlay-click + Escape dismissal — only the two buttons
        // inside the modal can close it.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-amber-500 shrink-0">
              <AlertTriangle className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Configure Your Communication Channels</DialogTitle>
              <DialogDescription className="mt-1">
                Required before using campaigns
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Before using campaigns, connect at least one of your own SMS, Email, or
          WhatsApp providers. Platform-shared providers are not available for
          campaign sending — you need your own credentials for reliable delivery
          and compliance. Each channel is independent: configure the ones you
          want to use.
        </p>

        {/* 3-column status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {channels.map((ch) => {
            const Icon = ch.icon
            const ok = ch.configured
            return (
              <Card
                key={ch.key}
                className={
                  'p-3 border ' +
                  (ok
                    ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
                    : 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20')
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={
                        'size-4 shrink-0 ' +
                        (ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                      }
                    />
                    <span className="text-sm font-medium truncate">{ch.label}</span>
                  </div>
                  {ok ? (
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <X className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </div>
                <p
                  className={
                    'text-[11px] mt-1.5 truncate ' +
                    (ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')
                  }
                  title={ok && ch.providerName ? ch.providerName : undefined}
                >
                  {ok ? (ch.providerName || 'Configured') : 'Not configured'}
                </p>
              </Card>
            )
          })}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="sm:mr-auto"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={handleConfigure}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Configure Providers
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CampaignProviderGate

// Re-export the loader icon for callers that want a consistent loading state.
export function CampaignProviderGateLoading() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
