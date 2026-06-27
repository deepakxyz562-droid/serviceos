'use client'

/**
 * TemplateStudioView
 * -------------------
 * Main Template Studio module — a single-page view with internal tab
 * navigation between 8 sub-areas:
 *
 *   1. Dashboard          — stats overview + quick actions + recently used
 *   2. Email Templates    — list + 3-panel editor dialog
 *   3. WhatsApp Templates — list + 2-panel builder dialog with phone preview
 *   4. Prebuilt Templates — gallery of built-in templates (one-click clone)
 *   5. Business Packs     — installable template packs grouped by category
 *   6. Variables          — full variable catalog reference (copyable)
 *   7. Brand Kit          — brand settings form + live footer preview
 *   8. Image Library      — upload / browse / delete images
 *
 * The view is fully client-side (uses fetch against /api/* routes).
 */

import * as React from 'react'
import {
  LayoutDashboard,
  Mail,
  MessageSquare,
  Sparkles,
  Package,
  Variable as VariableIcon,
  Palette,
  Image as ImageIcon,
  // Misc icons used across panels
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Star,
  Send,
  Save,
  Upload,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  Users,
  UserPlus,
  CalendarCheck,
  Wrench,
  Building2,
  HardHat,
  Megaphone,
  LifeBuoy,
  CreditCard,
  Droplets,
  Wind,
  ShoppingCart,
  Briefcase,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import { VariablePicker } from '@/components/templates/variable-picker'
import { RichTextEditor } from '@/components/templates/rich-text-editor'
import {
  WhatsAppPhonePreview,
  type WhatsAppTemplateType,
  type WhatsAppButton,
} from '@/components/templates/whatsapp-phone-preview'
import { EmailPreview, type EmailPreviewDevice } from '@/components/templates/email-preview'
import { VARIABLE_CATEGORIES, ALL_VARIABLES } from '@/lib/template-vars'

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

type TabKey =
  | 'dashboard'
  | 'email'
  | 'whatsapp'
  | 'prebuilt'
  | 'packs'
  | 'variables'
  | 'brand'
  | 'images'

interface EmailTemplate {
  id: string
  name: string
  slug: string
  category: string // transactional | marketing | system
  description?: string | null
  subject: string
  htmlBody: string
  textBody?: string | null
  isBuiltIn: boolean
  isDefault?: boolean
  tenantId?: string | null
  language?: string
  status?: string // draft | published
  isFavorite?: boolean
  tagsJson?: string
  lastUsedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

interface CampaignTemplate {
  id: string
  name: string
  description?: string | null
  category: string
  content: string
  mediaUrl?: string | null
  mediaType?: string | null
  ctaText?: string | null
  ctaUrl?: string | null
  isApproved?: boolean
  tenantId?: string | null
  language?: string
  templateType?: string // text | image | document | video
  headerText?: string | null
  headerMediaUrl?: string | null
  headerMediaType?: string | null
  footerText?: string | null
  buttonsJson?: string
  status?: string // draft | pending | approved | rejected | published
  isFavorite?: boolean
  tagsJson?: string
  lastUsedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

interface TemplatePack {
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

interface BrandKit {
  id?: string
  tenantId?: string
  logoUrl?: string | null
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  fontFamily?: string
  footerHtml?: string | null
  companyName?: string | null
  address?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  socialLinksJson?: string
}

interface ImageLibraryItem {
  id: string
  name: string
  url: string
  folder: string
  mediaType: string
  size: number
  width?: number | null
  height?: number | null
  createdAt?: string
}

/* ========================================================================== */
/* Fetch helper                                                               */
/* ========================================================================== */

const api = {
  get: async (url: string) => {
    const r = await fetch(url)
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Request failed')
    return j
  },
  post: async (url: string, body: unknown) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Request failed')
    return j
  },
  put: async (url: string, body: unknown) => {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Request failed')
    return j
  },
  del: async (url: string) => {
    const r = await fetch(url, { method: 'DELETE' })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Request failed')
    return j
  },
}

async function uploadFile(file: File): Promise<{
  url: string
  name: string
  mediaType: string
  size: number
}> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch('/api/upload', { method: 'POST', body: fd })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || 'Upload failed')
  return j as { url: string; name: string; mediaType: string; size: number }
}

/* ========================================================================== */
/* Icon maps                                                                  */
/* ========================================================================== */

/** Maps string icon names (from VARIABLE_CATEGORIES / pack data) to Lucide components. */
const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  UserPlus,
  CalendarCheck,
  Wrench,
  FileText,
  Building2,
  HardHat,
  Megaphone,
  LifeBuoy,
  Star,
  CreditCard,
  Droplets,
  Wind,
  Package,
  ShoppingCart,
  Briefcase,
  ClipboardCheck,
  Mail,
  MessageSquare,
  Palette,
  Variable: VariableIcon,
  Image: ImageIcon,
  LayoutDashboard,
}

function getIcon(name: string | undefined | null): LucideIcon {
  if (!name) return Package
  return ICON_MAP[name] ?? Package
}

/* ========================================================================== */
/* Small shared helpers                                                       */
/* ========================================================================== */

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'never'
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/** Parse a JSON string field safely into an array. */
function parseJsonArray<T = unknown>(json?: string | null): T[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function truncate(s: string, max: number): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

/* ========================================================================== */
/* Loading + Empty + Error states                                             */
/* ========================================================================== */

function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
      role="alert"
    >
      <AlertCircle className="size-8 text-rose-600" aria-hidden />
      <p className="text-sm font-medium text-foreground">Something went wrong</p>
      <p className="max-w-md text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 size-3.5" /> Try again
        </Button>
      )}
    </div>
  )
}

function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-md text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

/* ========================================================================== */
/* Badge helpers                                                              */
/* ========================================================================== */

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-700' },
    published: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700' },
    disabled: { label: 'Disabled', cls: 'bg-gray-100 text-gray-600' },
  }
  const info = map[status] || { label: status, cls: 'bg-muted text-muted-foreground' }
  return <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', info.cls)}>{info.label}</span>
}

function CategoryBadge({ category }: { category?: string | null }) {
  if (!category) return null
  const label = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')
  return (
    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
      {label}
    </span>
  )
}

function ChannelBadge({ channel }: { channel: 'email' | 'whatsapp' }) {
  if (channel === 'email') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <Mail className="size-3" /> Email
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <MessageSquare className="size-3" /> WhatsApp
    </span>
  )
}

/* ========================================================================== */
/* Main view                                                                  */
/* ========================================================================== */

export function TemplateStudioView() {
  const [activeTab, setActiveTab] = React.useState<TabKey>('dashboard')

  const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { key: 'prebuilt', label: 'Prebuilt', icon: Sparkles },
    { key: 'packs', label: 'Packs', icon: Package },
    { key: 'variables', label: 'Variables', icon: VariableIcon },
    { key: 'brand', label: 'Brand Kit', icon: Palette },
    { key: 'images', label: 'Images', icon: ImageIcon },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Template Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Design, manage, and reuse your email &amp; WhatsApp templates, brand kit, and image library.
            </p>
          </div>

          {/* Horizontal tab bar */}
          <div className="mt-3 overflow-x-auto">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
              <TabsList className="h-auto w-full justify-start gap-0.5 overflow-x-auto bg-transparent p-0 sm:w-auto">
                {tabs.map((t) => {
                  const Icon = t.icon
                  const active = activeTab === t.key
                  return (
                    <TabsTrigger
                      key={t.key}
                      value={t.key}
                      className={cn(
                        'h-9 gap-1.5 rounded-md border border-transparent px-3 text-sm font-medium',
                        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                        'hover:bg-muted'
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="whitespace-nowrap">{t.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Active panel content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <DashboardPanel onNavigate={setActiveTab} />
        )}
        {activeTab === 'email' && <EmailTemplatesPanel />}
        {activeTab === 'whatsapp' && <WhatsAppTemplatesPanel />}
        {activeTab === 'prebuilt' && <PrebuiltTemplatesPanel onNavigate={setActiveTab} />}
        {activeTab === 'packs' && <BusinessPacksPanel />}
        {activeTab === 'variables' && <VariablesPanel />}
        {activeTab === 'brand' && <BrandKitPanel />}
        {activeTab === 'images' && <ImageLibraryPanel />}
      </main>
    </div>
  )
}

/* ========================================================================== */
/* Tab 1: Dashboard                                                           */
/* ========================================================================== */

interface DashboardPanelProps {
  onNavigate: (tab: TabKey) => void
}

function DashboardPanel({ onNavigate }: DashboardPanelProps) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [emails, setEmails] = React.useState<EmailTemplate[]>([])
  const [whatsapps, setWhatsapps] = React.useState<CampaignTemplate[]>([])

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [emailRes, waRes] = await Promise.all([
        api.get('/api/email-templates'),
        api.get('/api/campaign-templates?limit=100'),
      ])
      setEmails(Array.isArray(emailRes) ? (emailRes as EmailTemplate[]) : [])
      setWhatsapps(
        Array.isArray(waRes?.data) ? (waRes.data as CampaignTemplate[]) : []
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const stats = React.useMemo(() => {
    const totalEmail = emails.length
    const totalWa = whatsapps.length
    const draftCount =
      emails.filter((e) => e.status === 'draft').length +
      whatsapps.filter((w) => w.status === 'draft').length
    const publishedCount =
      emails.filter((e) => e.status === 'published' || !e.status).length +
      whatsapps.filter((w) => w.status === 'published' || !w.status).length
    const favCount =
      emails.filter((e) => e.isFavorite).length +
      whatsapps.filter((w) => w.isFavorite).length
    return {
      total: totalEmail + totalWa,
      email: totalEmail,
      whatsapp: totalWa,
      draft: draftCount,
      published: publishedCount,
      favorites: favCount,
    }
  }, [emails, whatsapps])

  const recent = React.useMemo(() => {
    type Combined = {
      id: string
      name: string
      channel: 'email' | 'whatsapp'
      category: string
      lastUsedAt?: string | null
    }
    const emailMapped: Combined[] = emails.map((e) => ({
      id: e.id,
      name: e.name,
      channel: 'email',
      category: e.category,
      lastUsedAt: e.lastUsedAt || e.updatedAt || null,
    }))
    const waMapped: Combined[] = whatsapps.map((w) => ({
      id: w.id,
      name: w.name,
      channel: 'whatsapp',
      category: w.category,
      lastUsedAt: w.lastUsedAt || w.updatedAt || null,
    }))
    return [...emailMapped, ...waMapped]
      .sort((a, b) => {
        const ta = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
        const tb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
        return tb - ta
      })
      .slice(0, 6)
  }, [emails, whatsapps])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  const statCards: {
    label: string
    value: number
    icon: LucideIcon
    borderCls: string
    iconCls: string
  }[] = [
    { label: 'Total Templates', value: stats.total, icon: LayoutDashboard, borderCls: 'border-l-teal-600', iconCls: 'text-teal-600' },
    { label: 'Email', value: stats.email, icon: Mail, borderCls: 'border-l-emerald-600', iconCls: 'text-emerald-600' },
    { label: 'WhatsApp', value: stats.whatsapp, icon: MessageSquare, borderCls: 'border-l-amber-500', iconCls: 'text-amber-500' },
    { label: 'Draft', value: stats.draft, icon: FileText, borderCls: 'border-l-gray-500', iconCls: 'text-gray-600' },
    { label: 'Published', value: stats.published, icon: CheckCircle2, borderCls: 'border-l-emerald-500', iconCls: 'text-emerald-500' },
    { label: 'Favorites', value: stats.favorites, icon: Star, borderCls: 'border-l-rose-600', iconCls: 'text-rose-600' },
  ]

  const quickActions: { label: string; icon: LucideIcon; tab: TabKey }[] = [
    { label: 'Create Email Template', icon: Mail, tab: 'email' },
    { label: 'Create WhatsApp Template', icon: MessageSquare, tab: 'whatsapp' },
    { label: 'Install Business Pack', icon: Package, tab: 'packs' },
    { label: 'Browse Prebuilt Templates', icon: Sparkles, tab: 'prebuilt' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Stats grid */}
      <section aria-label="Template statistics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <Card
                key={s.label}
                className={cn('rounded-xl border-l-4 py-4', s.borderCls)}
              >
                <CardContent className="flex flex-col gap-1.5 px-4 py-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </span>
                    <Icon className={cn('size-4', s.iconCls)} aria-hidden />
                  </div>
                  <span className="text-2xl font-semibold text-foreground">
                    {s.value}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <Button
                key={a.label}
                variant="outline"
                className="h-auto justify-start gap-3 py-3 text-left"
                onClick={() => onNavigate(a.tab)}
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="size-4 text-primary" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-medium">{a.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Button>
            )
          })}
        </div>
      </section>

      {/* Recently used */}
      <section aria-label="Recently used templates">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Recently Used</h2>
        <Card>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No recently used templates"
                description="Templates you have used for sending or previewing will appear here."
              />
            ) : (
              <ul className="divide-y" role="list">
                {recent.map((r) => (
                  <li
                    key={`${r.channel}-${r.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-medium text-foreground">
                        {r.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={r.channel} />
                        <CategoryBadge category={r.category} />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      used {formatRelativeTime(r.lastUsedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

/* ========================================================================== */
/* Tab 2: Email Templates                                                     */
/* ========================================================================== */

const EMAIL_CATEGORIES = ['all', 'transactional', 'marketing', 'system'] as const
const EMAIL_STATUSES = ['all', 'draft', 'published'] as const

function EmailTemplatesPanel() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([])
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState<string>('all')
  const [status, setStatus] = React.useState<string>('all')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<EmailTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<EmailTemplate | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/email-templates')
      setTemplates(Array.isArray(res) ? (res as EmailTemplate[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load email templates')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (category !== 'all' && t.category !== category) return false
      if (status !== 'all' && (t.status || 'published') !== status) return false
      if (q) {
        const haystack = `${t.name} ${t.subject} ${t.description || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [templates, search, category, status])

  const handleNew = () => {
    setEditingTemplate(null)
    setEditorOpen(true)
  }

  const handleEdit = (t: EmailTemplate) => {
    setEditingTemplate(t)
    setEditorOpen(true)
  }

  const handleDuplicate = async (t: EmailTemplate) => {
    try {
      const body = {
        name: `${t.name} (Copy)`,
        slug: slugify(`${t.name}-copy-${Date.now()}`),
        category: t.category,
        description: t.description || undefined,
        subject: t.subject,
        htmlBody: t.htmlBody,
        textBody: t.textBody || undefined,
        status: 'draft',
        isFavorite: false,
        tagsJson: t.tagsJson || '[]',
      }
      await api.post('/api/email-templates', body)
      toast.success('Template duplicated')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate template')
    }
  }

  const handleToggleFavorite = async (t: EmailTemplate) => {
    try {
      await api.put(`/api/email-templates/${t.id}`, { isFavorite: !t.isFavorite })
      setTemplates((prev) =>
        prev.map((p) => (p.id === t.id ? { ...p, isFavorite: !p.isFavorite } : p))
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update favorite')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.del(`/api/email-templates/${deleteTarget.id}`)
      toast.success('Template deleted')
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete template')
    }
  }

  const handleSaved = async (saved: EmailTemplate) => {
    setEditorOpen(false)
    await load()
    setSelectedId(saved.id)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-8"
              aria-label="Search email templates"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="mr-1.5 size-3.5" /> New Email Template
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email templates found"
          description={search || category !== 'all' || status !== 'all'
            ? 'Try adjusting your filters.'
            : 'Create your first email template to get started.'}
          action={
            <Button size="sm" onClick={handleNew}>
              <Plus className="mr-1.5 size-3.5" /> New Email Template
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y" role="list">
            {filtered.map((t) => (
              <li
                key={t.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 hover:bg-muted/40',
                  selectedId === t.id && 'bg-muted/60'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(t)}
                  className="shrink-0 rounded-md p-1 hover:bg-muted"
                  aria-label={t.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={cn(
                      'size-4',
                      t.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                    )}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                    {t.isBuiltIn && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        Built-in
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <CategoryBadge category={t.category} />
                  <StatusBadge status={t.status || 'published'} />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleEdit(t)}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => void handleDuplicate(t)}
                  >
                    <Copy className="size-3.5" />
                    <span className="sr-only">Duplicate</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setDeleteTarget(t)}
                    disabled={t.isBuiltIn}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Editor dialog */}
      {editorOpen && (
        <EmailEditorDialog
          template={editingTemplate}
          onClose={() => setEditorOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* -------------------------- Email Editor Dialog -------------------------- */

interface EmailEditorDialogProps {
  template: EmailTemplate | null
  onClose: () => void
  onSaved: (saved: EmailTemplate) => void
}

function EmailEditorDialog({ template, onClose, onSaved }: EmailEditorDialogProps) {
  const isEdit = !!template
  const [name, setName] = React.useState(template?.name || '')
  const [slug, setSlug] = React.useState(template?.slug || '')
  const [category, setCategory] = React.useState(template?.category || 'transactional')
  const [subject, setSubject] = React.useState(template?.subject || '')
  const [description, setDescription] = React.useState(template?.description || '')
  const [htmlBody, setHtmlBody] = React.useState(template?.htmlBody || '')
  const [status, setStatus] = React.useState(template?.status || 'draft')
  const [language, setLanguage] = React.useState(template?.language || 'en')
  const [tags, setTags] = React.useState<string[]>(parseJsonArray<string>(template?.tagsJson))
  const [tagInput, setTagInput] = React.useState('')
  const [isFavorite, setIsFavorite] = React.useState(template?.isFavorite || false)
  const [previewDevice, setPreviewDevice] = React.useState<EmailPreviewDevice>('desktop')
  const [focusedField, setFocusedField] = React.useState<'subject' | 'body'>('body')
  const [saving, setSaving] = React.useState(false)
  const [sendingTest, setSendingTest] = React.useState(false)
  const [testEmailTo, setTestEmailTo] = React.useState('')
  const [autoSaveState, setAutoSaveState] = React.useState<'idle' | 'saving' | 'saved'>('idle')
  const [showTestDialog, setShowTestDialog] = React.useState(false)

  // Auto-save draft (debounced 3s) — only when status is draft and we are editing existing
  const autoSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (!isEdit) return
    if (status !== 'draft') return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaveState('saving')
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/api/email-templates/${template!.id}`, {
          name,
          slug,
          category,
          subject,
          description,
          htmlBody,
          status,
          language,
          isFavorite,
          tagsJson: JSON.stringify(tags),
        })
        setAutoSaveState('saved')
      } catch {
        setAutoSaveState('idle')
      }
    }, 3000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [name, slug, category, subject, description, htmlBody, status, language, isFavorite, tags, isEdit, template])

  const handleInsertVariable = (key: string) => {
    const token = `{{${key}}}`
    if (focusedField === 'subject') {
      setSubject((s) => `${s}${token}`)
    } else {
      // Append to body HTML as a styled merge-tag span
      setHtmlBody((h) => `${h}<span class="merge-tag">${token}</span> `)
    }
    toast.success(`Inserted {{${key}}}`)
  }

  const handleAddTag = () => {
    const v = tagInput.trim()
    if (!v) return
    if (tags.includes(v)) {
      setTagInput('')
      return
    }
    setTags([...tags, v])
    setTagInput('')
  }

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required')
    if (!subject.trim()) return toast.error('Subject is required')
    if (!htmlBody.trim()) return toast.error('Body is required')

    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        category,
        description: description.trim() || undefined,
        subject: subject.trim(),
        htmlBody,
        status,
        language,
        isFavorite,
        tagsJson: JSON.stringify(tags),
      }
      let saved: EmailTemplate
      if (isEdit) {
        const res = await api.put(`/api/email-templates/${template!.id}`, body)
        saved = res as EmailTemplate
      } else {
        const res = await api.post('/api/email-templates', body)
        saved = res as EmailTemplate
      }
      toast.success(isEdit ? 'Template updated' : 'Template created')
      onSaved(saved)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!template) return toast.error('Save the template first before sending a test')
    setSendingTest(true)
    try {
      const res = await api.post(`/api/email-templates/${template.id}/test-email`, {
        to: testEmailTo || undefined,
      })
      if (res?.error) {
        toast.error(res.error)
      } else if (res?.data?.simulated) {
        toast.info('Test email simulated (no live provider configured)')
      } else {
        toast.success(`Test email sent to ${res?.data?.to || testEmailTo}`)
      }
      setShowTestDialog(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex h-[90vh] max-w-6xl flex-col gap-0 p-0 sm:w-[95vw]"
        showCloseButton
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 text-primary" aria-hidden />
            {isEdit ? 'Edit Email Template' : 'New Email Template'}
            {autoSaveState === 'saving' && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
            {autoSaveState === 'saved' && (
              <span className="ml-2 text-xs font-normal text-emerald-600">Saved</span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Edit email template content, settings, and preview across devices.
          </DialogDescription>
        </DialogHeader>

        {/* 3-panel layout (stacked on mobile) */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Left panel: variables */}
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r p-3 lg:block">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Variables
            </h3>
            <VariablePicker onInsert={handleInsertVariable} compact />
          </aside>

          {/* Center panel: editor + preview */}
          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            {/* Settings */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-name" className="text-xs">Name</Label>
                <Input
                  id="email-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Welcome Email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-slug" className="text-xs">Slug</Label>
                <Input
                  id="email-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-category" className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="email-category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-language" className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="email-language">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <Label htmlFor="email-subject" className="text-xs">
                Subject
              </Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setFocusedField('subject')}
                placeholder="Welcome to {{company.name}}, {{customer.name}}!"
              />
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <Label htmlFor="email-description" className="text-xs">Description</Label>
              <Input
                id="email-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal note about this template"
              />
            </div>

            {/* Body editor */}
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="email-body" className="text-xs">
                HTML Body
              </Label>
              <div onFocus={() => setFocusedField('body')}>
                <RichTextEditor
                  value={htmlBody}
                  onChange={setHtmlBody}
                  placeholder="Write your email content here..."
                  ariaLabel="Email HTML body editor"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Preview</Label>
                <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
                  {(['desktop', 'tablet', 'mobile'] as EmailPreviewDevice[]).map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={previewDevice === d ? 'default' : 'ghost'}
                      className="h-7 px-2 text-xs capitalize"
                      onClick={() => setPreviewDevice(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
              <EmailPreview
                htmlContent={htmlBody}
                subject={subject}
                fromName="Your Company"
                device={previewDevice}
              />
            </div>
          </div>

          {/* Right panel: properties */}
          <aside className="w-full shrink-0 overflow-y-auto border-t p-4 lg:w-72 lg:border-l lg:border-t-0">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Properties
            </h3>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-status" className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="email-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="email-fav" className="text-xs">Favorite</Label>
                <Switch
                  id="email-fav"
                  checked={isFavorite}
                  onCheckedChange={setIsFavorite}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Tags</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Add tag..."
                    className="text-xs"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleAddTag}>
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="gap-1 text-xs"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((x) => x !== t))}
                          className="rounded-sm hover:bg-muted-foreground/20"
                          aria-label={`Remove ${t}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTestDialog(true)}
                disabled={!isEdit}
              >
                <Send className="mr-1.5 size-3.5" /> Send Test Email
              </Button>

              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                {isEdit ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </aside>
        </div>

        {/* Test email dialog */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
              <DialogDescription>
                Send a personalized test of this template to your inbox.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="test-to" className="text-xs">Recipient (defaults to your account email)</Label>
              <Input
                id="test-to"
                type="email"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSendTest()} disabled={sendingTest}>
                {sendingTest ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3.5" />
                )}
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

/* ========================================================================== */
/* Tab 3: WhatsApp Templates                                                  */
/* ========================================================================== */

const WA_TYPES = ['all', 'text', 'image', 'document', 'video'] as const
const WA_STATUSES = ['all', 'draft', 'pending', 'approved', 'rejected', 'published'] as const

function WhatsAppTemplatesPanel() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [templates, setTemplates] = React.useState<CampaignTemplate[]>([])
  const [search, setSearch] = React.useState('')
  const [type, setType] = React.useState<string>('all')
  const [status, setStatus] = React.useState<string>('all')
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<CampaignTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CampaignTemplate | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/campaign-templates?limit=100')
      setTemplates(Array.isArray(res?.data) ? (res.data as CampaignTemplate[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (type !== 'all' && (t.templateType || 'text') !== type) return false
      if (status !== 'all' && (t.status || 'published') !== status) return false
      if (q) {
        const haystack = `${t.name} ${t.content} ${t.description || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [templates, search, type, status])

  const handleNew = () => {
    setEditingTemplate(null)
    setEditorOpen(true)
  }

  const handleEdit = (t: CampaignTemplate) => {
    setEditingTemplate(t)
    setEditorOpen(true)
  }

  const handleDuplicate = async (t: CampaignTemplate) => {
    try {
      const body = {
        name: `${t.name} (Copy)`,
        description: t.description || undefined,
        category: t.category,
        content: t.content,
        templateType: t.templateType || 'text',
        headerText: t.headerText || undefined,
        headerMediaUrl: t.headerMediaUrl || undefined,
        footerText: t.footerText || undefined,
        buttonsJson: t.buttonsJson || '[]',
        status: 'draft',
        isFavorite: false,
      }
      await api.post('/api/campaign-templates', body)
      toast.success('Template duplicated')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate')
    }
  }

  const handleToggleFavorite = async (t: CampaignTemplate) => {
    try {
      await api.put(`/api/campaign-templates/${t.id}`, { isFavorite: !t.isFavorite })
      setTemplates((prev) =>
        prev.map((p) => (p.id === t.id ? { ...p, isFavorite: !p.isFavorite } : p))
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update favorite')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.del(`/api/campaign-templates/${deleteTarget.id}`)
      toast.success('Template deleted')
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-8"
              aria-label="Search WhatsApp templates"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {WA_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {WA_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="mr-1.5 size-3.5" /> New Template
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No WhatsApp templates found"
          description={search || type !== 'all' || status !== 'all'
            ? 'Try adjusting your filters.'
            : 'Create your first WhatsApp template to get started.'}
          action={
            <Button size="sm" onClick={handleNew}>
              <Plus className="mr-1.5 size-3.5" /> New Template
            </Button>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y" role="list">
            {filtered.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(t)}
                  className="shrink-0 rounded-md p-1 hover:bg-muted"
                  aria-label={t.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={cn(
                      'size-4',
                      t.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                    )}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{t.name}</span>
                  <p className="truncate text-xs text-muted-foreground">
                    {truncate(t.content || '', 100)}
                  </p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {t.templateType || 'text'}
                  </Badge>
                  <StatusBadge status={t.status || 'published'} />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleEdit(t)}>
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => void handleDuplicate(t)}>
                    <Copy className="size-3.5" />
                    <span className="sr-only">Duplicate</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setDeleteTarget(t)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Editor dialog */}
      {editorOpen && (
        <WhatsAppEditorDialog
          template={editingTemplate}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            setEditorOpen(false)
            await load()
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* -------------------------- WhatsApp Editor Dialog ----------------------- */

interface WhatsAppEditorDialogProps {
  template: CampaignTemplate | null
  onClose: () => void
  onSaved: () => void
}

const WA_CATEGORIES = ['general', 'promotional', 'reminder', 'seasonal', 'follow_up', 're_engagement']

function WhatsAppEditorDialog({ template, onClose, onSaved }: WhatsAppEditorDialogProps) {
  const isEdit = !!template
  const [name, setName] = React.useState(template?.name || '')
  const [category, setCategory] = React.useState(template?.category || 'general')
  const [language, setLanguage] = React.useState(template?.language || 'en')
  const [templateType, setTemplateType] = React.useState<WhatsAppTemplateType>(
    (template?.templateType as WhatsAppTemplateType) || 'text'
  )
  const [headerText, setHeaderText] = React.useState(template?.headerText || '')
  const [headerMediaUrl, setHeaderMediaUrl] = React.useState(template?.headerMediaUrl || '')
  const [body, setBody] = React.useState(template?.content || '')
  const [footer, setFooter] = React.useState(template?.footerText || '')
  const [status, setStatus] = React.useState(template?.status || 'draft')
  const [isFavorite, setIsFavorite] = React.useState(template?.isFavorite || false)
  const [buttons, setButtons] = React.useState<WhatsAppButton[]>(
    parseJsonArray<WhatsAppButton>(template?.buttonsJson)
  )
  const [device, setDevice] = React.useState<'android' | 'iphone'>('android')
  const [saving, setSaving] = React.useState(false)
  const [uploadingHeader, setUploadingHeader] = React.useState(false)
  const [varsOpen, setVarsOpen] = React.useState(true)
  const [aiLoading, setAiLoading] = React.useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = React.useState('')

  const bodyRef = React.useRef<HTMLTextAreaElement>(null)

  const handleInsertVariable = (key: string) => {
    const token = `{{${key}}}`
    const el = bodyRef.current
    if (!el) {
      setBody((b) => `${b}${token}`)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = body.slice(0, start) + token + body.slice(end)
    setBody(next)
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
    toast.success(`Inserted {{${key}}}`)
  }

  const handleHeaderUpload = async (file: File) => {
    setUploadingHeader(true)
    try {
      const res = await uploadFile(file)
      setHeaderMediaUrl(res.url)
      toast.success('Header media uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingHeader(false)
    }
  }

  const addButton = () => {
    if (buttons.length >= 3) {
      toast.error('Maximum 3 buttons allowed')
      return
    }
    setButtons([...buttons, { type: 'quick_reply', text: '', value: '' }])
  }

  const updateButton = (i: number, patch: Partial<WhatsAppButton>) => {
    setButtons(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }

  const removeButton = (i: number) => {
    setButtons(buttons.filter((_, idx) => idx !== i))
  }

  const handleAiAction = async (action: 'generate' | 'improve' | 'shorten') => {
    setAiLoading(action)
    try {
      const payload: Record<string, unknown> = {
        action,
        channel: 'whatsapp',
        content: action === 'generate' ? aiPrompt : body,
      }
      const res = await api.post('/api/ai/template-assist', payload)
      const out = res?.data?.content || res?.content
      if (out && typeof out === 'string') {
        setBody(out)
        toast.success(`AI ${action} complete`)
      } else {
        toast.error('AI returned no content')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI request failed')
    } finally {
      setAiLoading(null)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required')
    if (!body.trim()) return toast.error('Body content is required')

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        category,
        language,
        templateType,
        headerText: headerText.trim() || undefined,
        headerMediaUrl: headerMediaUrl || undefined,
        headerMediaType: headerMediaUrl ? (templateType === 'image' ? 'image/jpeg' : templateType === 'video' ? 'video/mp4' : 'application/pdf') : undefined,
        content: body,
        footerText: footer.trim() || undefined,
        buttons,
        status,
        isFavorite,
      }
      if (isEdit) {
        await api.put(`/api/campaign-templates/${template!.id}`, payload)
      } else {
        await api.post('/api/campaign-templates', payload)
      }
      toast.success(isEdit ? 'Template updated' : 'Template created')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex h-[90vh] max-w-6xl flex-col gap-0 p-0 sm:w-[95vw]"
        showCloseButton
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-primary" aria-hidden />
            {isEdit ? 'Edit WhatsApp Template' : 'New WhatsApp Template'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Build a WhatsApp template with header, body, buttons, and footer. Live phone preview on the right.
          </DialogDescription>
        </DialogHeader>

        {/* 2-panel layout */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Left: form */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Settings */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wa-name" className="text-xs">Name</Label>
                <Input id="wa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Booking Reminder" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wa-category" className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="wa-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WA_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wa-language" className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="wa-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wa-type" className="text-xs">Template Type</Label>
                <Select value={templateType} onValueChange={(v) => setTemplateType(v as WhatsAppTemplateType)}>
                  <SelectTrigger id="wa-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Header */}
            <div className="mt-4 rounded-md border p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header</h4>
              {templateType === 'text' ? (
                <Input
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Optional header text (max 60 chars)"
                  maxLength={60}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={headerMediaUrl}
                    onChange={(e) => setHeaderMediaUrl(e.target.value)}
                    placeholder="Media URL (or upload below)"
                    readOnly={!!headerMediaUrl}
                  />
                  {headerMediaUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHeaderMediaUrl('')}
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : (
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept={
                          templateType === 'image'
                            ? 'image/*'
                            : templateType === 'video'
                            ? 'video/mp4'
                            : 'application/pdf'
                        }
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleHeaderUpload(f)
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          {uploadingHeader ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Upload className="mr-1.5 size-3.5" />
                          )}
                          Upload
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Variables (collapsible) */}
            <Collapsible open={varsOpen} onOpenChange={setVarsOpen} className="mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <VariableIcon className="size-3.5" /> Insert Variables
                  </span>
                  {varsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <VariablePicker onInsert={handleInsertVariable} compact />
              </CollapsibleContent>
            </Collapsible>

            {/* Body */}
            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="wa-body" className="text-xs">Body</Label>
              <Textarea
                ref={bodyRef}
                id="wa-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {{customer.name}}, this is a reminder..."
                className="min-h-[140px] font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Use <code>{'{{customer.name}}'}</code> style variables. WhatsApp supports a maximum of 1024 characters.
              </p>
            </div>

            {/* Footer */}
            <div className="mt-3 flex flex-col gap-1.5">
              <Label htmlFor="wa-footer" className="text-xs">Footer (optional, max 60 chars)</Label>
              <Input
                id="wa-footer"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                maxLength={60}
                placeholder="{{company.name}}"
              />
            </div>

            {/* Buttons */}
            <div className="mt-4 rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Buttons ({buttons.length}/3)
                </h4>
                <Button type="button" size="sm" variant="outline" onClick={addButton} disabled={buttons.length >= 3}>
                  <Plus className="mr-1.5 size-3.5" /> Add Button
                </Button>
              </div>
              {buttons.length === 0 ? (
                <p className="text-xs text-muted-foreground">No buttons. Add up to 3 call-to-action buttons.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {buttons.map((b, i) => (
                    <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-[120px_1fr_1fr_auto]">
                      <Select value={b.type} onValueChange={(v) => updateButton(i, { type: v as WhatsAppButton['type'] })}>
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quick_reply">Quick Reply</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="copy_coupon">Copy Coupon</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={b.text}
                        onChange={(e) => updateButton(i, { text: e.target.value })}
                        placeholder="Button text"
                        className="text-sm"
                      />
                      <Input
                        value={b.value || ''}
                        onChange={(e) => updateButton(i, { value: e.target.value })}
                        placeholder={b.type === 'call' ? '+1 555-0100' : b.type === 'website' ? 'https://...' : 'COUPON123'}
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => removeButton(i)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI assistant */}
            <div className="mt-4 rounded-md border border-teal-200 bg-teal-50/40 p-3">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
                <Sparkles className="size-3.5" /> AI Assistant
              </h4>
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what you want (e.g. 'Reminder for tomorrow's plumbing appointment')"
                className="mb-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleAiAction('generate')}
                  disabled={!aiPrompt.trim() || aiLoading !== null}
                >
                  {aiLoading === 'generate' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Sparkles className="mr-1.5 size-3.5" />}
                  Generate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleAiAction('improve')}
                  disabled={!body.trim() || aiLoading !== null}
                >
                  {aiLoading === 'improve' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
                  Improve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleAiAction('shorten')}
                  disabled={!body.trim() || aiLoading !== null}
                >
                  {aiLoading === 'shorten' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
                  Shorten
                </Button>
              </div>
            </div>

            {/* Status + Favorite */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wa-status" className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="wa-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex w-full items-center justify-between rounded-md border px-3 py-2">
                  <Label htmlFor="wa-fav" className="text-xs">Favorite</Label>
                  <Switch id="wa-fav" checked={isFavorite} onCheckedChange={setIsFavorite} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
                {isEdit ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </div>

          {/* Right: phone preview */}
          <aside className="w-full shrink-0 overflow-y-auto border-t bg-muted/30 p-4 lg:w-80 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</h3>
              <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
                {(['android', 'iphone'] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={device === d ? 'default' : 'ghost'}
                    className="h-7 px-2 text-xs capitalize"
                    onClick={() => setDevice(d)}
                  >
                    {d === 'android' ? 'Android' : 'iPhone'}
                  </Button>
                ))}
              </div>
            </div>
            <WhatsAppPhonePreview
              templateType={templateType}
              headerText={headerText || undefined}
              headerMediaUrl={headerMediaUrl || undefined}
              content={body}
              footerText={footer || undefined}
              buttons={buttons.filter((b) => b.text.trim())}
              device={device}
            />
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ========================================================================== */
/* Tab 4: Prebuilt Templates                                                  */
/* ========================================================================== */

interface PrebuiltTemplatesPanelProps {
  onNavigate: (tab: TabKey) => void
}

function PrebuiltTemplatesPanel({ onNavigate }: PrebuiltTemplatesPanelProps) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [emails, setEmails] = React.useState<EmailTemplate[]>([])
  const [whatsapps, setWhatsapps] = React.useState<CampaignTemplate[]>([])
  const [search, setSearch] = React.useState('')
  const [channel, setChannel] = React.useState<'all' | 'email' | 'whatsapp'>('all')

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [emailRes, waRes] = await Promise.all([
        api.get('/api/email-templates'),
        api.get('/api/campaign-templates?limit=100'),
      ])
      setEmails(Array.isArray(emailRes) ? (emailRes as EmailTemplate[]) : [])
      setWhatsapps(Array.isArray(waRes?.data) ? (waRes.data as CampaignTemplate[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    type PrebuiltItem = {
      id: string
      name: string
      channel: 'email' | 'whatsapp'
      category: string
      snippet: string
      _raw: EmailTemplate | CampaignTemplate
    }
    const items: PrebuiltItem[] = []
    if (channel === 'all' || channel === 'email') {
      emails.forEach((e) => {
        if (q && !`${e.name} ${e.subject}`.toLowerCase().includes(q)) return
        items.push({
          id: e.id,
          name: e.name,
          channel: 'email',
          category: e.category,
          snippet: truncate(e.subject || '', 120),
          _raw: e,
        })
      })
    }
    if (channel === 'all' || channel === 'whatsapp') {
      whatsapps.forEach((w) => {
        if (q && !`${w.name} ${w.content}`.toLowerCase().includes(q)) return
        items.push({
          id: w.id,
          name: w.name,
          channel: 'whatsapp',
          category: w.category,
          snippet: truncate(w.content || '', 120),
          _raw: w,
        })
      })
    }
    return items
  }, [emails, whatsapps, search, channel])

  const handleUse = async (item: {
    channel: 'email' | 'whatsapp'
    _raw: EmailTemplate | CampaignTemplate
  }) => {
    try {
      if (item.channel === 'email') {
        const t = item._raw as EmailTemplate
        await api.post('/api/email-templates', {
          name: `${t.name} (Copy)`,
          slug: slugify(`${t.name}-copy-${Date.now()}`),
          category: t.category,
          description: t.description || undefined,
          subject: t.subject,
          htmlBody: t.htmlBody,
          textBody: t.textBody || undefined,
          status: 'draft',
          isFavorite: false,
          tagsJson: t.tagsJson || '[]',
        })
      } else {
        const t = item._raw as CampaignTemplate
        await api.post('/api/campaign-templates', {
          name: `${t.name} (Copy)`,
          description: t.description || undefined,
          category: t.category,
          content: t.content,
          templateType: t.templateType || 'text',
          headerText: t.headerText || undefined,
          headerMediaUrl: t.headerMediaUrl || undefined,
          footerText: t.footerText || undefined,
          buttonsJson: t.buttonsJson || '[]',
          status: 'draft',
          isFavorite: false,
        })
      }
      toast.success('Template copied to your account')
      onNavigate(item.channel === 'email' ? 'email' : 'whatsapp')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to copy template')
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prebuilt templates..."
            className="pl-8"
            aria-label="Search prebuilt templates"
          />
        </div>
        <Select value={channel} onValueChange={(v) => setChannel(v as 'all' | 'email' | 'whatsapp')}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No prebuilt templates match"
          description="Try a different search or channel filter."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={`${item.channel}-${item.id}`} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{item.name}</CardTitle>
                  <ChannelBadge channel={item.channel} />
                </div>
                <CardDescription className="flex items-center gap-2">
                  <CategoryBadge category={item.category} />
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">
                  {item.snippet}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleUse(item)}
                >
                  <Copy className="mr-1.5 size-3.5" /> Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ========================================================================== */
/* Tab 5: Business Packs                                                      */
/* ========================================================================== */

function BusinessPacksPanel() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [packs, setPacks] = React.useState<TemplatePack[]>([])
  const [installingSlug, setInstallingSlug] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/template-packs')
      setPacks(Array.isArray(res?.data) ? (res.data as TemplatePack[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load packs')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const handleInstall = async (slug: string) => {
    setInstallingSlug(slug)
    try {
      const res = await api.post('/api/template-packs/install', { slug })
      const created = res?.data
      toast.success(
        `Pack installed: ${created?.emailTemplatesCreated || 0} email + ${created?.whatsappTemplatesCreated || 0} WhatsApp templates`
      )
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to install pack')
    } finally {
      setInstallingSlug(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={load} />

  // Group: business (no industry) vs industry packs
  const businessPacks = packs.filter((p) => !p.industry)
  const industryPacks = packs.filter((p) => !!p.industry)

  const renderPackCard = (p: TemplatePack) => {
    const Icon = getIcon(p.icon)
    return (
      <Card key={p.slug} className="flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex size-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${p.color}1a` }}
              >
                <Icon className="size-5" style={{ color: p.color }} aria-hidden />
              </div>
              <CardTitle className="text-sm">{p.name}</CardTitle>
            </div>
            {p.isInstalled ? (
              <Badge className="bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="mr-1 size-3" /> Installed
              </Badge>
            ) : (
              <Badge variant="outline">{p.templateCount} templates</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <p className="flex-1 text-xs text-muted-foreground">{p.description}</p>
          <Button
            size="sm"
            variant={p.isInstalled ? 'outline' : 'default'}
            className="w-full"
            onClick={() => void handleInstall(p.slug)}
            disabled={p.isInstalled || installingSlug === p.slug}
          >
            {installingSlug === p.slug ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : p.isInstalled ? (
              <CheckCircle2 className="mr-1.5 size-3.5" />
            ) : (
              <Package className="mr-1.5 size-3.5" />
            )}
            {p.isInstalled ? 'Installed' : 'Install Pack'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Business Packs</h2>
        {businessPacks.length === 0 ? (
          <EmptyState icon={Package} title="No business packs available" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businessPacks.map(renderPackCard)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Industry Packs</h2>
        {industryPacks.length === 0 ? (
          <EmptyState icon={Briefcase} title="No industry packs available" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industryPacks.map(renderPackCard)}
          </div>
        )}
      </section>
    </div>
  )
}

/* ========================================================================== */
/* Tab 6: Variables                                                           */
/* ========================================================================== */

function VariablesPanel() {
  const [search, setSearch] = React.useState('')

  const filteredCats = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return VARIABLE_CATEGORIES
    return VARIABLE_CATEGORIES.map((c) => ({
      ...c,
      variables: c.variables.filter(
        (v) =>
          v.label.toLowerCase().includes(q) ||
          v.key.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (v.description || '').toLowerCase().includes(q)
      ),
    })).filter((c) => c.variables.length > 0)
  }, [search])

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`{{${key}}}`)
      toast.success(`Copied {{${key}}}`)
    } catch {
      toast.error('Clipboard not available')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search variables..."
          className="pl-8"
          aria-label="Search variables"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {ALL_VARIABLES.length} variables across {VARIABLE_CATEGORIES.length} categories.
        Click any variable key to copy it as <code className="font-mono">{'{{key}}'}</code>.
      </p>

      {filteredCats.length === 0 ? (
        <EmptyState icon={Search} title="No variables match" description="Try a different search." />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredCats.map((cat) => {
            const Icon = getIcon(cat.icon)
            return (
              <Card key={cat.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="size-4 text-primary" aria-hidden />
                    {cat.name}
                    <Badge variant="secondary" className="ml-1 h-5">
                      {cat.variables.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Key</th>
                          <th className="px-4 py-2 text-left font-medium">Label</th>
                          <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Example</th>
                          <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Description</th>
                          <th className="px-4 py-2 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {cat.variables.map((v) => (
                          <tr key={v.key} className="hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                {`{{${v.key}}}`}
                              </code>
                            </td>
                            <td className="px-4 py-2 font-medium">{v.label}</td>
                            <td className="hidden px-4 py-2 text-xs text-muted-foreground sm:table-cell">
                              {v.example}
                            </td>
                            <td className="hidden px-4 py-2 text-xs text-muted-foreground md:table-cell">
                              {v.description || '—'}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => void handleCopy(v.key)}
                              >
                                <Copy className="mr-1 size-3" />
                                Copy
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ========================================================================== */
/* Tab 7: Brand Kit                                                           */
/* ========================================================================== */

interface SocialLink {
  platform: string
  url: string
}

const FONT_OPTIONS = [
  'Inter, sans-serif',
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Georgia, serif',
  '"Times New Roman", serif',
  '"Courier New", monospace',
  'Tahoma, sans-serif',
  'Verdana, sans-serif',
]

function BrandKitPanel() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [kit, setKit] = React.useState<BrandKit | null>(null)
  const [socials, setSocials] = React.useState<SocialLink[]>([])
  const [uploadingLogo, setUploadingLogo] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/brand-kit')
      const data = (res?.data || {}) as BrandKit
      setKit(data)
      setSocials(parseJsonArray<SocialLink>(data.socialLinksJson))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brand kit')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const update = (patch: Partial<BrandKit>) => setKit((k) => (k ? { ...k, ...patch } : k))

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    try {
      const res = await uploadFile(file)
      update({ logoUrl: res.url })
      toast.success('Logo uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  const addSocial = () => setSocials([...socials, { platform: '', url: '' }])
  const updateSocial = (i: number, patch: Partial<SocialLink>) =>
    setSocials(socials.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const removeSocial = (i: number) => setSocials(socials.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!kit) return
    setSaving(true)
    try {
      await api.post('/api/brand-kit', {
        ...kit,
        socialLinksJson: JSON.stringify(socials),
      })
      toast.success('Brand kit saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save brand kit')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    )
  }
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!kit) return <EmptyState icon={Palette} title="No brand kit found" />

  // Live footer preview HTML
  const previewHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:${kit.fontFamily || 'Inter, sans-serif'};background:#f3f4f6;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:24px;border-top:4px solid ${kit.primaryColor || '#0f766e'};">
      <h2 style="color:${kit.primaryColor || '#0f766e'};margin:0 0 8px;">${kit.companyName || 'Your Company'}</h2>
      ${kit.logoUrl ? `<img src="${kit.logoUrl}" alt="Logo" style="max-height:48px;margin-bottom:12px;"/>` : ''}
      <p style="color:#374151;font-size:14px;margin:4px 0;">${kit.address || ''}</p>
      <p style="color:#374151;font-size:14px;margin:4px 0;">
        ${kit.website ? `<a href="${kit.website}" style="color:${kit.accentColor || '#f59e0b'};">${kit.website}</a>` : ''}
        ${kit.email ? ` &middot; <a href="mailto:${kit.email}" style="color:${kit.accentColor || '#f59e0b'};">${kit.email}</a>` : ''}
        ${kit.phone ? ` &middot; ${kit.phone}` : ''}
      </p>
      ${kit.footerHtml ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">${kit.footerHtml}</div>` : ''}
    </div>
  </body></html>`

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4 text-primary" /> Brand Kit
          </CardTitle>
          <CardDescription>
            These settings are applied to email templates and customer-facing pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Company name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-company" className="text-xs">Company Name</Label>
            <Input
              id="bk-company"
              value={kit.companyName || ''}
              onChange={(e) => update({ companyName: e.target.value })}
              placeholder="ServiceOS Pro"
            />
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-logo" className="text-xs">Logo URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bk-logo"
                value={kit.logoUrl || ''}
                onChange={(e) => update({ logoUrl: e.target.value })}
                placeholder="https://..."
                readOnly={!!kit.logoUrl}
              />
              {kit.logoUrl ? (
                <Button variant="outline" size="sm" onClick={() => update({ logoUrl: null })}>
                  <X className="size-3.5" />
                </Button>
              ) : (
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleLogoUpload(f)
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      {uploadingLogo ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
                      Upload
                    </span>
                  </Button>
                </label>
              )}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-primary" className="text-xs">Primary</Label>
              <div className="flex items-center gap-2">
                <input
                  id="bk-primary"
                  type="color"
                  value={kit.primaryColor || '#0f766e'}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  className="size-9 cursor-pointer rounded-md border"
                  aria-label="Primary color"
                />
                <Input
                  value={kit.primaryColor || ''}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-secondary" className="text-xs">Secondary</Label>
              <div className="flex items-center gap-2">
                <input
                  id="bk-secondary"
                  type="color"
                  value={kit.secondaryColor || '#1f2937'}
                  onChange={(e) => update({ secondaryColor: e.target.value })}
                  className="size-9 cursor-pointer rounded-md border"
                  aria-label="Secondary color"
                />
                <Input
                  value={kit.secondaryColor || ''}
                  onChange={(e) => update({ secondaryColor: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-accent" className="text-xs">Accent</Label>
              <div className="flex items-center gap-2">
                <input
                  id="bk-accent"
                  type="color"
                  value={kit.accentColor || '#f59e0b'}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="size-9 cursor-pointer rounded-md border"
                  aria-label="Accent color"
                />
                <Input
                  value={kit.accentColor || ''}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-font" className="text-xs">Font Family</Label>
            <Select value={kit.fontFamily || 'Inter, sans-serif'} onValueChange={(v) => update({ fontFamily: v })}>
              <SelectTrigger id="bk-font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Footer HTML */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-footer" className="text-xs">Footer HTML (optional)</Label>
            <Textarea
              id="bk-footer"
              value={kit.footerHtml || ''}
              onChange={(e) => update({ footerHtml: e.target.value })}
              placeholder="<p>Unsubscribe at any time.</p>"
              className="font-mono text-xs"
            />
          </div>

          <Separator />

          {/* Contact info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-address" className="text-xs">Address</Label>
              <Input id="bk-address" value={kit.address || ''} onChange={(e) => update({ address: e.target.value })} placeholder="123 Main St" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-website" className="text-xs">Website</Label>
              <Input id="bk-website" value={kit.website || ''} onChange={(e) => update({ website: e.target.value })} placeholder="https://..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-email" className="text-xs">Email</Label>
              <Input id="bk-email" type="email" value={kit.email || ''} onChange={(e) => update({ email: e.target.value })} placeholder="hello@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-phone" className="text-xs">Phone</Label>
              <Input id="bk-phone" value={kit.phone || ''} onChange={(e) => update({ phone: e.target.value })} placeholder="+1 555-0100" />
            </div>
          </div>

          <Separator />

          {/* Social links */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Social Links</Label>
              <Button type="button" size="sm" variant="outline" onClick={addSocial}>
                <Plus className="mr-1.5 size-3.5" /> Add
              </Button>
            </div>
            {socials.length === 0 ? (
              <p className="text-xs text-muted-foreground">No social links yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {socials.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                    <Input
                      value={s.platform}
                      onChange={(e) => updateSocial(i, { platform: e.target.value })}
                      placeholder="Platform (e.g. Twitter)"
                      className="text-sm"
                    />
                    <Input
                      value={s.url}
                      onChange={(e) => updateSocial(i, { url: e.target.value })}
                      placeholder="https://twitter.com/..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => removeSocial(i)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => void load()}>
              Reset
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
              Save Brand Kit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Email Footer Preview</CardTitle>
          <CardDescription>
            This is a live preview of how your brand kit renders in an email footer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <iframe
            title="Brand kit footer preview"
            srcDoc={previewHtml}
            sandbox="allow-same-origin"
            className="h-72 w-full rounded-md border-0 bg-white"
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* ========================================================================== */
/* Tab 8: Image Library                                                       */
/* ========================================================================== */

const IMAGE_FOLDERS = ['all', 'logos', 'promotions', 'service', 'seasonal', 'uploaded'] as const

function ImageLibraryPanel() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [images, setImages] = React.useState<ImageLibraryItem[]>([])
  const [folder, setFolder] = React.useState<string>('all')
  const [uploading, setUploading] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ImageLibraryItem | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadFolder, setUploadFolder] = React.useState<string>('uploaded')

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = folder === 'all' ? '/api/image-library' : `/api/image-library?folder=${folder}`
      const res = await api.get(url)
      setImages(Array.isArray(res?.data) ? (res.data as ImageLibraryItem[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load images')
    } finally {
      setLoading(false)
    }
  }, [folder])

  React.useEffect(() => {
    void load()
  }, [load])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file)
        await api.post('/api/image-library', {
          name: uploaded.name,
          url: uploaded.url,
          folder: uploadFolder,
          mediaType: uploaded.mediaType,
          size: uploaded.size,
        })
      }
      toast.success(`Uploaded ${files.length} image${files.length === 1 ? '' : 's'}`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('URL copied')
    } catch {
      toast.error('Clipboard not available')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.del(`/api/image-library/${deleteTarget.id}`)
      toast.success('Image deleted')
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {IMAGE_FOLDERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={folder === f ? 'default' : 'outline'}
              className="capitalize"
              onClick={() => setFolder(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={uploadFolder} onValueChange={setUploadFolder}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_FOLDERS.filter((f) => f !== 'all').map((f) => (
                <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
            Upload
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images in this folder"
          description="Upload your first image to use it in templates and emails."
          action={
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 size-3.5" /> Upload Image
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="aspect-square w-full bg-muted">
                {img.mediaType.startsWith('image/') ? (
                  <img
                    src={img.url}
                    alt={img.name}
                    className="size-full object-cover"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <FileText className="size-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium" title={img.name}>
                    {img.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {img.folder}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{formatBytes(img.size)}</p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1"
                    onClick={() => void handleCopyUrl(img.url)}
                  >
                    <Copy className="mr-1 size-3" /> Copy URL
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                    onClick={() => setDeleteTarget(img)}
                  >
                    <Trash2 className="size-3" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> from the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ========================================================================== */
/* Default export                                                             */
/* ========================================================================== */

export default TemplateStudioView
