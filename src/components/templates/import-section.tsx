'use client'

/**
 * ImportSection
 * -------------
 * Consolidated "Import" hub for the Template Studio.  Surfaces four template
 * import sources in a single tabbed interface (Shopify/Linear style) so users
 * have one place to bring templates in from outside:
 *
 *   1. From Pack       — install curated business / industry packs
 *   2. From Marketplace — install pre-built workflow templates
 *   3. From File       — bulk upload a JSON file of templates
 *   4. WhatsApp Sync   — pull notification templates from Meta
 *
 * Visual language matches the rest of Template Studio:
 *   - Poppins font (via globals.css)
 *   - Emerald #10b981 accent
 *   - Transparent TabsList with emerald active text + accent bg
 *   - shadcn/ui Card / Button / Input / Skeleton
 *   - Sonner toasts
 */

import * as React from 'react'
import {
  Package,
  Store,
  Upload,
  MessageSquare,
  Search,
  Plus,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Star,
  Download,
  Eye,
  FileJson,
  AlertCircle,
  Sparkles,
  ArrowDownToLine,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ALL_PACKS, type TemplatePackDef } from '@/lib/template-packs-data'

/* -------------------------------------------------------------------------- */
/* Shared API helper (matches template-studio-view.tsx pattern)               */
/* -------------------------------------------------------------------------- */

const api = {
  get: async (url: string) => {
    const r = await fetch(url)
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Request failed')
    return j
  },
  post: async (url: string, body?: unknown) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Request failed')
    return j
  },
}

/* -------------------------------------------------------------------------- */
/* Icon map for packs                                                         */
/* -------------------------------------------------------------------------- */

import {
  Users, UserPlus, CalendarCheck, Wrench, FileText, Building2, HardHat,
  Megaphone, LifeBuoy, CreditCard, Droplets, Wind, ShoppingCart,
  Briefcase, ClipboardCheck, Mail, Palette, Image as ImageIcon,
  Variable as VariableIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Users, UserPlus, CalendarCheck, Wrench, FileText, Building2, HardHat,
  Megaphone, LifeBuoy, Star, CreditCard, Droplets, Wind, Package,
  ShoppingCart, Briefcase, ClipboardCheck, Mail, MessageSquare, Palette,
  Variable: VariableIcon, Image: ImageIcon,
}

function getIcon(name: string | undefined | null): LucideIcon {
  if (!name) return Package
  return ICON_MAP[name] ?? Package
}

/* -------------------------------------------------------------------------- */
/* Marketplace mock data (adapted from marketplace-view.tsx)                  */
/* -------------------------------------------------------------------------- */

interface MarketplaceTemplate {
  id: string
  name: string
  description: string
  category: string
  channel: 'email' | 'whatsapp'
  featured: boolean
  rating: number
  installs: number
  icon: string
  // Lightweight preview payload — converted to the canonical import shape
  // when the user clicks "Install".
  preview: {
    name: string
    subject?: string
    htmlBody?: string
    content?: string
    category?: string
    templateType?: 'text' | 'image' | 'document' | 'video'
    headerText?: string
    footerText?: string
    buttons?: { type: 'quick_reply' | 'call' | 'website' | 'copy_coupon'; text: string; value?: string }[]
  }
}

const MARKETPLACE_CATEGORIES = [
  'All',
  'Lead Follow-up',
  'Appointment Reminder',
  'Payment Reminder',
  'Review Collection',
  'Win-back Campaign',
]

const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'm1',
    name: 'Lead Follow-up Sequence',
    description: '3-step WhatsApp sequence that turns cold leads into booked appointments.',
    category: 'Lead Follow-up',
    channel: 'whatsapp',
    featured: true,
    rating: 4.8,
    installs: 1245,
    icon: '🤝',
    preview: {
      name: 'Lead Follow-up',
      content: 'Hi {{customer.name}}! Thanks for reaching out to {{company.name}}. Are you still interested in our services? Reply YES to continue.',
      templateType: 'text',
      footerText: '{{company.name}}',
      buttons: [{ type: 'quick_reply', text: 'Yes, I am' }, { type: 'quick_reply', text: 'Not anymore' }],
    },
  },
  {
    id: 'm2',
    name: 'Appointment Reminder',
    description: 'Friendly appointment reminder sent 24 hours before the scheduled time.',
    category: 'Appointment Reminder',
    channel: 'email',
    featured: true,
    rating: 4.9,
    installs: 2340,
    icon: '📅',
    preview: {
      name: 'Appointment Reminder',
      subject: 'Reminder: Your appointment with {{company.name}} is tomorrow',
      htmlBody: '<p>Hi {{customer.name}},</p><p>This is a friendly reminder for your appointment scheduled for {{booking.date}} at {{booking.time}}.</p><p>If you need to reschedule, please reply to this email or call us.</p><p>Best regards,<br/>{{company.name}}</p>',
    },
  },
  {
    id: 'm3',
    name: 'Payment Reminder',
    description: 'Gentle WhatsApp reminder for overdue invoices with a pay-now link.',
    category: 'Payment Reminder',
    channel: 'whatsapp',
    featured: false,
    rating: 4.6,
    installs: 890,
    icon: '💰',
    preview: {
      name: 'Payment Reminder',
      content: 'Hi {{customer.name}}, your invoice {{invoice.number}} for {{invoice.amount}} is now due. Tap below to pay securely online.',
      templateType: 'text',
      footerText: '{{company.name}}',
      buttons: [{ type: 'website', text: 'Pay Now', value: '{{invoice.url}}' }],
    },
  },
  {
    id: 'm4',
    name: 'Review Collection',
    description: 'Post-job email asking happy customers to leave a review on Google.',
    category: 'Review Collection',
    channel: 'email',
    featured: true,
    rating: 4.7,
    installs: 1567,
    icon: '⭐',
    preview: {
      name: 'Review Request',
      subject: 'How did we do, {{customer.name}}?',
      htmlBody: '<p>Hi {{customer.name}},</p><p>Thanks for choosing {{company.name}}! If you have a moment, we\'d love a quick review — it helps us serve more customers like you.</p><p><a href="{{review.url}}">Leave a review →</a></p><p>Best,<br/>{{company.name}}</p>',
    },
  },
  {
    id: 'm5',
    name: 'Win-back Campaign',
    description: 'Re-engage customers who haven\'t booked in 30+ days with a special offer.',
    category: 'Win-back Campaign',
    channel: 'whatsapp',
    featured: false,
    rating: 4.5,
    installs: 678,
    icon: '🔄',
    preview: {
      name: 'Win-back Offer',
      content: 'Hi {{customer.name}}! We miss you at {{company.name}}. Enjoy 10% off your next booking. Reply CLAIM to redeem.',
      templateType: 'text',
      footerText: 'Limited time offer',
      buttons: [{ type: 'quick_reply', text: 'Claim 10% off' }],
    },
  },
  {
    id: 'm6',
    name: 'Quote Follow-up',
    description: 'Follow up on quotes that haven\'t been accepted within 48 hours.',
    category: 'Lead Follow-up',
    channel: 'email',
    featured: false,
    rating: 4.4,
    installs: 456,
    icon: '📋',
    preview: {
      name: 'Quote Follow-up',
      subject: 'Any questions about your quote, {{customer.name}}?',
      htmlBody: '<p>Hi {{customer.name}},</p><p>I wanted to follow up on the quote we sent for your {{job.title}} project. Happy to answer any questions or adjust the scope — just reply to this email.</p><p>Best regards,<br/>{{company.name}}</p>',
    },
  },
  {
    id: 'm7',
    name: 'Job Status Updates',
    description: 'Keep customers informed with automated WhatsApp status updates.',
    category: 'Appointment Reminder',
    channel: 'whatsapp',
    featured: false,
    rating: 4.3,
    installs: 789,
    icon: '🔧',
    preview: {
      name: 'Technician En Route',
      content: 'Hi {{customer.name}}, your {{company.name}} technician {{employee.name}} is on the way and will arrive in approximately 15 minutes.',
      templateType: 'text',
      footerText: '{{company.name}}',
    },
  },
  {
    id: 'm8',
    name: 'Seasonal Promotion',
    description: 'Announce a seasonal promotion with a multi-step email campaign.',
    category: 'Win-back Campaign',
    channel: 'email',
    featured: true,
    rating: 4.6,
    installs: 1123,
    icon: '🎉',
    preview: {
      name: 'Seasonal Promo',
      subject: '🌿 Spring special — 15% off all services this month',
      htmlBody: '<p>Hi {{customer.name}},</p><p>Spring is here! For a limited time, enjoy <strong>15% off</strong> all services at {{company.name}}. Book before {{promo.endDate}} to take advantage.</p><p><a href="{{booking.url}}">Book now →</a></p>',
    },
  },
]

/* -------------------------------------------------------------------------- */
/* Common UI atoms                                                            */
/* -------------------------------------------------------------------------- */

function SourceCard({
  icon: Icon,
  title,
  description,
  badge,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  badge?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
              {badge}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 1. From Pack                                                               */
/* -------------------------------------------------------------------------- */

interface InstalledPackInfo {
  slug: string
  name: string
  description: string
  category: string
  industry?: string | null
  icon: string
  color: string
  templateCount: number
  isInstalled: boolean
}

function FromPackTab({ onImported }: { onImported?: () => void }) {
  const [loading, setLoading] = React.useState(true)
  const [packs, setPacks] = React.useState<InstalledPackInfo[]>([])
  const [search, setSearch] = React.useState('')
  const [installing, setInstalling] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/template-packs')
      const data = Array.isArray(res) ? res : (res?.data ?? [])
      setPacks(data as InstalledPackInfo[])
    } catch {
      // Fallback to local definitions so the section always renders
      setPacks(
        ALL_PACKS.map((p: TemplatePackDef) => ({
          slug: p.slug,
          name: p.name,
          description: p.description,
          category: p.category,
          industry: p.industry || null,
          icon: p.icon,
          color: p.color,
          templateCount: p.templates.length,
          isInstalled: false,
        })),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const handleInstall = async (slug: string) => {
    setInstalling(slug)
    try {
      const res = await api.post('/api/template-packs/install', { slug })
      const data = res?.data ?? res
      const emailCount = data?.emailTemplatesCreated ?? 0
      const waCount = data?.whatsappTemplatesCreated ?? 0
      toast.success(`Pack installed — ${emailCount} email + ${waCount} WhatsApp templates`)
      setPacks((prev) => prev.map((p) => (p.slug === slug ? { ...p, isInstalled: true } : p)))
      onImported?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to install pack')
    } finally {
      setInstalling(null)
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return packs
    return packs.filter((p) =>
      `${p.name} ${p.description} ${p.category} ${p.industry || ''}`.toLowerCase().includes(q),
    )
  }, [packs, search])

  const businessPacks = filtered.filter((p) => p.category === 'business' && !p.industry)
  const industryPacks = filtered.filter((p) => !!p.industry)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Curated Template Packs</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            One click installs a bundle of related email + WhatsApp templates.
          </p>
        </div>
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packs..."
            className="pl-8"
            aria-label="Search template packs"
          />
        </div>
      </div>

      {businessPacks.length > 0 && (
        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business Packs</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businessPacks.map((pack) => (
              <PackInstallCard key={pack.slug} pack={pack} installing={installing} onInstall={handleInstall} />
            ))}
          </div>
        </section>
      )}

      {industryPacks.length > 0 && (
        <section>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Industry Packs</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industryPacks.map((pack) => (
              <PackInstallCard key={pack.slug} pack={pack} installing={installing} onInstall={handleInstall} />
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Package className="size-10 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-foreground">No packs match your search</p>
          <p className="text-xs text-muted-foreground">Try a different keyword.</p>
        </div>
      )}
    </div>
  )
}

function PackInstallCard({
  pack,
  installing,
  onInstall,
}: {
  pack: InstalledPackInfo
  installing: string | null
  onInstall: (slug: string) => void
}) {
  const IconComponent = getIcon(pack.icon)
  return (
    <Card className="group flex flex-col gap-3 border-border/60 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: pack.color + '18', color: pack.color }}
          >
            {React.createElement(IconComponent, { className: 'size-5', 'aria-hidden': true })}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{pack.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{pack.description}</p>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{pack.templateCount} templates</span>
          {pack.isInstalled ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <CheckCircle2 className="size-3 text-emerald-600" /> Installed
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => void onInstall(pack.slug)}
              disabled={installing === pack.slug}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {installing === pack.slug ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="mr-1.5 size-3.5" />
              )}
              Install
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 2. From Marketplace                                                        */
/* -------------------------------------------------------------------------- */

function FromMarketplaceTab({ onImported }: { onImported?: () => void }) {
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState('All')
  const [installed, setInstalled] = React.useState<string[]>([])
  const [installing, setInstalling] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<MarketplaceTemplate | null>(null)

  const filtered = MARKETPLACE_TEMPLATES.filter((t) => {
    if (category !== 'All' && t.category !== category) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false
    }
    return true
  })

  const featured = MARKETPLACE_TEMPLATES.filter((t) => t.featured)

  const handleInstall = async (template: MarketplaceTemplate) => {
    setInstalling(template.id)
    try {
      // Convert marketplace preview payload → canonical import shape
      const payload = {
        templates: [
          {
            channel: template.channel,
            ...template.preview,
          },
        ],
      }
      const res = await api.post('/api/templates/import', payload)
      const data = res?.data ?? res
      const count = data?.imported ?? 0
      if (count === 0 && (data?.errors?.length ?? 0) > 0) {
        toast.error(data.errors[0]?.error || 'Template already exists')
      } else {
        toast.success(`${template.name} installed`)
        setInstalled((prev) => [...prev, template.id])
        onImported?.()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to install')
    } finally {
      setInstalling(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Workflow Template Marketplace</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pre-built workflow templates for the most common customer journeys. One click installs into your tenant.
        </p>
      </div>

      {/* Featured row */}
      <section>
        <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5 text-amber-500" /> Featured
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((t) => (
            <MarketplaceCard
              key={t.id}
              template={t}
              compact
              installed={installed.includes(t.id)}
              installing={installing === t.id}
              onPreview={() => setPreview(t)}
              onInstall={() => void handleInstall(t)}
            />
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-8"
            aria-label="Search marketplace templates"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MARKETPLACE_CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? 'default' : 'outline'}
              className={cn(
                'h-7 text-xs',
                category === c && 'bg-emerald-600 hover:bg-emerald-700',
              )}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <MarketplaceCard
            key={t.id}
            template={t}
            installed={installed.includes(t.id)}
            installing={installing === t.id}
            onPreview={() => setPreview(t)}
            onInstall={() => void handleInstall(t)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Store className="size-10 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-foreground">No templates match your filters</p>
          <p className="text-xs text-muted-foreground">Try clearing the search or picking another category.</p>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{preview?.icon}</span>
              {preview?.name}
            </DialogTitle>
            <DialogDescription>{preview?.description}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-0.5">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  {preview.rating}
                </span>
                <span className="text-muted-foreground">{preview.installs.toLocaleString()} installs</span>
                <Badge variant="secondary" className="text-[10px]">{preview.category}</Badge>
                <Badge variant="outline" className="text-[10px] capitalize">{preview.channel}</Badge>
              </div>
              <Separator />
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {preview.channel === 'email' ? 'Email subject' : 'Message body'}
                </h4>
                <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs">
                  {preview.channel === 'email' ? (
                    <>
                      <p className="font-medium text-foreground">{preview.preview.subject}</p>
                      <Separator className="my-2" />
                      <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                        {preview.preview.htmlBody?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                      </pre>
                    </>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                      {preview.preview.content}
                    </pre>
                  )}
                </div>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={installed.includes(preview.id) || installing === preview.id}
                onClick={() => { void handleInstall(preview); setPreview(null) }}
              >
                {installing === preview.id ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : installed.includes(preview.id) ? (
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                ) : (
                  <Download className="mr-1.5 size-3.5" />
                )}
                {installed.includes(preview.id) ? 'Already Installed' : 'Install Template'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MarketplaceCard({
  template,
  installed,
  installing,
  compact = false,
  onPreview,
  onInstall,
}: {
  template: MarketplaceTemplate
  installed: boolean
  installing: boolean
  compact?: boolean
  onPreview: () => void
  onInstall: () => void
}) {
  return (
    <Card
      className={cn(
        'group flex flex-col gap-3 border-border/60 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md',
        compact && 'cursor-pointer',
      )}
      onClick={compact ? onPreview : undefined}
    >
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{template.icon}</span>
            <div>
              <h4 className="text-sm font-semibold tracking-tight text-foreground">{template.name}</h4>
              <Badge variant="outline" className="mt-0.5 text-[9px] capitalize">{template.channel}</Badge>
            </div>
          </div>
          {template.featured && (
            <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Featured</Badge>
          )}
        </div>
        {!compact && <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-xs">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {template.rating}
            </span>
            <span className="text-xs text-muted-foreground">{template.installs.toLocaleString()}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onPreview}>
              <Eye className="mr-1 size-3" /> Preview
            </Button>
            <Button
              size="sm"
              className={cn('h-7 text-xs', installed ? 'bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700')}
              onClick={onInstall}
              disabled={installed || installing}
            >
              {installing ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : installed ? (
                <CheckCircle2 className="mr-1 size-3" />
              ) : (
                <Download className="mr-1 size-3" />
              )}
              {installed ? 'Installed' : 'Install'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 3. From File (JSON upload)                                                 */
/* -------------------------------------------------------------------------- */

interface ParsedTemplate {
  channel: string
  name: string
  subject?: string
  htmlBody?: string
  content?: string
  category?: string
  templateType?: string
  headerText?: string
  footerText?: string
  buttons?: unknown[]
  description?: string
  language?: string
  status?: string
  tags?: string[]
  textBody?: string
}

function FromFileTab({ onImported }: { onImported?: () => void }) {
  const [dragOver, setDragOver] = React.useState(false)
  const [parsing, setParsing] = React.useState(false)
  const [parsed, setParsed] = React.useState<ParsedTemplate[] | null>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [parseError, setParseError] = React.useState<string | null>(null)
  const [importing, setImporting] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<{
    imported: number
    email: number
    whatsapp: number
    skipped: number
    errors: { name?: string; error: string }[]
  } | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const reset = () => {
    setParsed(null)
    setFileName(null)
    setParseError(null)
    setLastResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    setParsing(true)
    setParseError(null)
    setParsed(null)
    setLastResult(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const list: unknown = Array.isArray(json) ? json : json?.templates
      if (!Array.isArray(list)) {
        throw new Error('JSON must be an array or an object with a "templates" array')
      }
      const cleaned = list.map((raw) => {
        if (!raw || typeof raw !== 'object') return {} as ParsedTemplate
        const t = raw as Record<string, unknown>
        return {
          channel: typeof t.channel === 'string' ? t.channel : '',
          name: typeof t.name === 'string' ? t.name : '',
          subject: typeof t.subject === 'string' ? t.subject : undefined,
          htmlBody: typeof t.htmlBody === 'string' ? t.htmlBody : undefined,
          content: typeof t.content === 'string' ? t.content : undefined,
          category: typeof t.category === 'string' ? t.category : undefined,
          templateType: typeof t.templateType === 'string' ? t.templateType : undefined,
          headerText: typeof t.headerText === 'string' ? t.headerText : undefined,
          footerText: typeof t.footerText === 'string' ? t.footerText : undefined,
          buttons: Array.isArray(t.buttons) ? t.buttons : undefined,
          description: typeof t.description === 'string' ? t.description : undefined,
          language: typeof t.language === 'string' ? t.language : undefined,
          status: typeof t.status === 'string' ? t.status : undefined,
          tags: Array.isArray(t.tags) ? t.tags : undefined,
          textBody: typeof t.textBody === 'string' ? t.textBody : undefined,
        } as ParsedTemplate
      })
      setParsed(cleaned)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON file')
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!parsed || parsed.length === 0) return
    setImporting(true)
    try {
      const res = await api.post('/api/templates/import', { templates: parsed })
      const data = res?.data ?? res
      setLastResult({
        imported: data?.imported ?? 0,
        email: data?.email ?? 0,
        whatsapp: data?.whatsapp ?? 0,
        skipped: data?.skipped ?? 0,
        errors: data?.errors ?? [],
      })
      const total = data?.imported ?? 0
      if (total > 0) {
        toast.success(`Imported ${total} template${total === 1 ? '' : 's'}`)
        onImported?.()
      } else if ((data?.skipped ?? 0) > 0) {
        toast.info('All templates already existed — nothing new to import')
      } else {
        toast.error('No templates imported — see errors below')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to import templates')
    } finally {
      setImporting(false)
    }
  }

  const validCount = React.useMemo(() => {
    if (!parsed) return 0
    return parsed.filter((t) => {
      if (!t.name) return false
      if (t.channel === 'email') return !!t.subject && !!t.htmlBody
      if (t.channel === 'whatsapp') return !!t.content
      return false
    }).length
  }, [parsed])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Import from a JSON file</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Upload a JSON file containing an array of templates (or an object with a <code className="rounded bg-muted px-1 font-mono">templates</code> array).
          Both email and WhatsApp templates can be imported in a single upload.
        </p>
      </div>

      {/* Drop zone */}
      {!parsed && (
        <label
          htmlFor="import-file-input"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void handleFile(f)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors',
            dragOver
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : 'border-muted-foreground/25 bg-muted/10 hover:border-emerald-400/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10',
          )}
        >
          <input
            id="import-file-input"
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
          {parsing ? (
            <>
              <Loader2 className="size-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-muted-foreground">Parsing file...</p>
            </>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Upload className="size-6" aria-hidden />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop your JSON file here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Accepts <code className="rounded bg-muted px-1 font-mono">.json</code> files.{' '}
                  <button
                    type="button"
                    className="text-emerald-600 hover:underline"
                    onClick={(e) => {
                      e.preventDefault()
                      const sample = {
                        templates: [
                          {
                            channel: 'email',
                            name: 'Sample Email',
                            subject: 'Hello {{customer.name}}',
                            htmlBody: '<p>Welcome to {{company.name}}!</p>',
                            category: 'transactional',
                            tags: ['welcome'],
                          },
                          {
                            channel: 'whatsapp',
                            name: 'Sample WhatsApp',
                            content: 'Hi {{customer.name}}, thanks for booking with {{company.name}}!',
                            category: 'general',
                            templateType: 'text',
                            footerText: '{{company.name}}',
                          },
                        ],
                      }
                      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'templates-sample.json'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    Download sample
                  </button>
                </p>
              </div>
            </>
          )}
        </label>
      )}

      {parseError && (
        <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Could not parse file</p>
            <p className="mt-0.5 text-xs">{parseError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>Try again</Button>
        </div>
      )}

      {/* Preview + Import */}
      {parsed && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {fileName} — {parsed.length} template{parsed.length === 1 ? '' : 's'} found
              </p>
              <p className="text-xs text-muted-foreground">
                {validCount} valid · {parsed.length - validCount} need attention
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={importing || validCount === 0}
                onClick={() => void handleImport()}
              >
                {importing ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <ArrowDownToLine className="mr-1.5 size-3.5" />
                )}
                Import {validCount > 0 ? `${validCount} ` : ''}template{validCount === 1 ? '' : 's'}
              </Button>
            </div>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40">
                <tr className="border-b">
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Name</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Channel</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Category</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Preview</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((t, i) => {
                  const valid =
                    !!t.name &&
                    ((t.channel === 'email' && !!t.subject && !!t.htmlBody) ||
                      (t.channel === 'whatsapp' && !!t.content))
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{t.name || <span className="text-rose-600">Missing</span>}</td>
                      <td className="px-3 py-2 capitalize">{t.channel || <span className="text-rose-600">Missing</span>}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.category || 'default'}</td>
                      <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">
                        {t.channel === 'email' ? t.subject || t.htmlBody : t.content}
                      </td>
                      <td className="px-3 py-2">
                        {valid ? (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <CheckCircle2 className="size-3 text-emerald-600" /> Ready
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] text-rose-600">
                            <AlertCircle className="size-3" /> Invalid
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import result */}
      {lastResult && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <p className="text-sm font-semibold text-foreground">Import complete</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Imported</p>
                <p className="text-lg font-bold text-emerald-600">{lastResult.imported}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-lg font-bold text-foreground">{lastResult.email}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-lg font-bold text-foreground">{lastResult.whatsapp}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Skipped (dupes)</p>
                <p className="text-lg font-bold text-foreground">{lastResult.skipped}</p>
              </div>
            </div>
            {lastResult.errors.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {lastResult.errors.length} item{lastResult.errors.length === 1 ? '' : 's'} had errors:
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-amber-700 dark:text-amber-400">
                  {lastResult.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e.name ? `${e.name}: ` : ''}{e.error}</li>
                  ))}
                  {lastResult.errors.length > 5 && <li>...and {lastResult.errors.length - 5} more</li>}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" className="self-start" onClick={reset}>
              Import another file
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 4. WhatsApp Auto-Import (from Meta)                                        */
/* -------------------------------------------------------------------------- */

function WhatsAppSyncTab({ onImported }: { onImported?: () => void }) {
  const [syncing, setSyncing] = React.useState(false)
  const [lastSync, setLastSync] = React.useState<{
    imported: number
    whatsapp: number
    errors: { name?: string; error: string }[]
  } | null>(null)
  const [checking, setChecking] = React.useState(true)
  const [setupStatus, setSetupStatus] = React.useState<{
    metaConnected?: boolean
    phoneNumber?: string | null
  }>({})

  React.useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch('/api/whatsapp/templates?setup=true')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setSetupStatus({
              metaConnected: data?.setupStatus?.metaConnected || false,
              phoneNumber: data?.setupStatus?.phoneNumber || null,
            })
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    void check()
    return () => { cancelled = true }
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/api/whatsapp/templates/auto-import', { scope: 'tenant' })
      const data = res?.data ?? res
      const count = data?.imported ?? data?.count ?? 0
      setLastSync({
        imported: count,
        whatsapp: count,
        errors: data?.errors ?? [],
      })
      if (count > 0) {
        toast.success(`Synced ${count} WhatsApp notification template${count === 1 ? '' : 's'} from Meta`)
        onImported?.()
      } else {
        toast.info('No new WhatsApp templates to sync — all notification templates are already imported')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to sync from Meta')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">WhatsApp notification templates</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pull the 5 built-in notification WhatsApp templates (welcome, booking confirmation, reminder, status, follow-up) into your tenant with one click.
          These will be ready to submit to Meta for approval.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Status card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <MessageSquare className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Meta Connection</p>
                {checking ? (
                  <p className="text-xs text-muted-foreground">Checking...</p>
                ) : setupStatus.metaConnected ? (
                  <p className="text-xs text-emerald-600">Connected · {setupStatus.phoneNumber || 'phone ready'}</p>
                ) : (
                  <p className="text-xs text-amber-600">Not connected</p>
                )}
              </div>
            </div>
            {!setupStatus.metaConnected && !checking && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                You can still sync the templates — they will be created locally with status <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/50">draft</code> and submitted to Meta later from the WhatsApp setup wizard.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action card */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <RefreshCw className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sync from Meta</p>
                <p className="text-xs text-muted-foreground">Auto-import notification templates</p>
              </div>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={syncing}
              onClick={() => void handleSync()}
            >
              {syncing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="mr-1.5 size-3.5" />
              )}
              {syncing ? 'Syncing...' : 'Sync from Meta'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Last sync result */}
      {lastSync && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <p className="text-sm font-semibold text-foreground">Sync complete</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Imported <strong className="text-foreground">{lastSync.imported}</strong> WhatsApp notification template{lastSync.imported === 1 ? '' : 's'}.
            </p>
            {lastSync.errors.length > 0 && (
              <ul className="list-inside list-disc text-xs text-amber-700 dark:text-amber-400">
                {lastSync.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e.name ? `${e.name}: ` : ''}{e.error}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Main ImportSection component                                               */
/* -------------------------------------------------------------------------- */

export interface ImportSectionProps {
  /** Called whenever an import/install succeeds — parent can refresh counts. */
  onImported?: () => void
}

export function ImportSection({ onImported }: ImportSectionProps) {
  const [tab, setTab] = React.useState('pack')

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <ArrowDownToLine className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Import Templates</h2>
            <p className="text-xs text-muted-foreground">
              Bring templates in from packs, the marketplace, a JSON file, or sync from WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="border-b border-border">
          <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto">
            <TabsTrigger
              value="pack"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
            >
              <Package className="size-3.5" /> From Pack
            </TabsTrigger>
            <TabsTrigger
              value="marketplace"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
            >
              <Store className="size-3.5" /> From Marketplace
            </TabsTrigger>
            <TabsTrigger
              value="file"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
            >
              <FileJson className="size-3.5" /> From File
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="data-[state=active]:bg-accent data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
            >
              <MessageSquare className="size-3.5" /> WhatsApp Sync
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pack" className="mt-5 focus-visible:outline-none">
          <FromPackTab onImported={onImported} />
        </TabsContent>
        <TabsContent value="marketplace" className="mt-5 focus-visible:outline-none">
          <FromMarketplaceTab onImported={onImported} />
        </TabsContent>
        <TabsContent value="file" className="mt-5 focus-visible:outline-none">
          <FromFileTab onImported={onImported} />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-5 focus-visible:outline-none">
          <WhatsAppSyncTab onImported={onImported} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ImportSection
