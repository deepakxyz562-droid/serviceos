'use client'

/**
 * TemplateStudioView (Pabbly-inspired redesign)
 * -----------------------------------------------
 * A single-page Template Studio with a left category sidebar + main content area.
 *
 * Sidebar categories:
 *   - Email Templates (expandable: All, Mine, Transactional, Marketing, System)
 *   - WhatsApp Templates (expandable: All, Mine, Marketing, Utility, Authentication)
 *   - Template Packs, Brand Kit, Images, Variables (standalone)
 *
 * Main content renders the gallery/editor for the active category.
 * Editor dialogs open as large overlays matching Pabbly's full-screen pattern.
 */

import * as React from 'react'
import {
  Mail,
  MessageSquare,
  Sparkles,
  Package,
  Variable as VariableIcon,
  Palette,
  Image as ImageIcon,
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
  ArrowLeft,
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
  Code2,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

import { VariablePicker } from '@/components/templates/variable-picker'
import { RichTextEditor } from '@/components/templates/rich-text-editor'
import {
  WhatsAppPhonePreview,
  type WhatsAppTemplateType,
  type WhatsAppButton,
} from '@/components/templates/whatsapp-phone-preview'
import { EmailPreview, type EmailPreviewDevice } from '@/components/templates/email-preview'
import { VARIABLE_CATEGORIES, ALL_VARIABLES } from '@/lib/template-vars'
import { ALL_PACKS, BUSINESS_PACKS, INDUSTRY_PACKS, type TemplatePackDef } from '@/lib/template-packs-data'

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

type SidebarKey =
  | 'email-all'
  | 'email-mine'
  | 'email-transactional'
  | 'email-marketing'
  | 'email-system'
  | 'wa-all'
  | 'wa-mine'
  | 'wa-marketing'
  | 'wa-utility'
  | 'wa-authentication'
  | 'packs'
  | 'brand'
  | 'images'
  | 'variables'

interface EmailTemplate {
  id: string
  name: string
  slug: string
  category: string
  description?: string | null
  subject: string
  htmlBody: string
  textBody?: string | null
  isBuiltIn: boolean
  isDefault?: boolean
  tenantId?: string | null
  language?: string
  status?: string
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
  templateType?: string
  headerText?: string | null
  headerMediaUrl?: string | null
  headerMediaType?: string | null
  footerText?: string | null
  buttonsJson?: string
  status?: string
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

async function uploadFile(file: File, options?: { bucket?: string; folder?: string }): Promise<{
  url: string
  name: string
  mediaType: string
  size: number
}> {
  const fd = new FormData()
  fd.append('file', file)
  if (options?.bucket) fd.append('bucket', options.bucket)
  if (options?.folder) fd.append('folder', options.folder)
  const r = await fetch('/api/upload', { method: 'POST', body: fd })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || 'Upload failed')
  return j as { url: string; name: string; mediaType: string; size: number }
}

/* ========================================================================== */
/* Icon maps                                                                  */
/* ========================================================================== */

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
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="alert">
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
        {description && <p className="max-w-md text-xs text-muted-foreground">{description}</p>}
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
    draft: { label: 'Draft', cls: 'bg-amber-100 text-amber-700' },
    published: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Pending', cls: 'bg-teal-100 text-teal-700' },
    approved: { label: 'Approved', cls: 'bg-teal-100 text-teal-700' },
    rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-700' },
    disabled: { label: 'Disabled', cls: 'bg-gray-100 text-gray-600' },
  }
  const info = map[status] || { label: status, cls: 'bg-muted text-muted-foreground' }
  return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', info.cls)}>{info.label}</span>
}

function EmailCategoryBadge({ category }: { category?: string | null }) {
  if (!category) return null
  const map: Record<string, string> = {
    transactional: 'bg-teal-100 text-teal-700',
    marketing: 'bg-amber-100 text-amber-700',
    system: 'bg-slate-100 text-slate-600',
  }
  const cls = map[category] || 'bg-muted text-muted-foreground'
  const label = category.charAt(0).toUpperCase() + category.slice(1)
  return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', cls)}>{label}</span>
}

function WaCategoryBadge({ category }: { category?: string | null }) {
  if (!category) return null
  const map: Record<string, string> = {
    marketing: 'bg-amber-100 text-amber-700',
    utility: 'bg-teal-100 text-teal-700',
    authentication: 'bg-rose-100 text-rose-700',
  }
  const cls = map[category] || 'bg-muted text-muted-foreground'
  const label = category.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
  return <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', cls)}>{label}</span>
}

function TypeBadge({ type }: { type?: string | null }) {
  if (!type) return null
  const map: Record<string, string> = {
    text: 'bg-slate-100 text-slate-600',
    image: 'bg-emerald-100 text-emerald-700',
    video: 'bg-rose-100 text-rose-700',
    document: 'bg-orange-100 text-orange-700',
  }
  const cls = map[type] || 'bg-muted text-muted-foreground'
  return <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase', cls)}>{type.toUpperCase()}</span>
}

/* ========================================================================== */
/* Sidebar definition                                                         */
/* ========================================================================== */

interface SidebarItem {
  key: SidebarKey
  label: string
  icon: LucideIcon
  count?: number
}

const EMAIL_SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'email-all', label: 'All Templates', icon: Mail },
  { key: 'email-mine', label: 'My Templates', icon: Star },
  { key: 'email-transactional', label: 'Transactional', icon: FileText },
  { key: 'email-marketing', label: 'Marketing', icon: Megaphone },
  { key: 'email-system', label: 'System', icon: Wrench },
]

const WA_SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'wa-all', label: 'All Templates', icon: MessageSquare },
  { key: 'wa-mine', label: 'My Templates', icon: Star },
  { key: 'wa-marketing', label: 'Marketing', icon: Megaphone },
  { key: 'wa-utility', label: 'Utility', icon: FileText },
  { key: 'wa-authentication', label: 'Authentication', icon: CheckCircle2 },
]

/* ========================================================================== */
/* Main view                                                                  */
/* ========================================================================== */

export function TemplateStudioView() {
  const [activeKey, setActiveKey] = React.useState<SidebarKey>('email-all')
  const [emailOpen, setEmailOpen] = React.useState(true)
  const [waOpen, setWaOpen] = React.useState(true)
  const [editorActive, setEditorActive] = React.useState(false)

  // Counts
  const [emailTemplates, setEmailTemplates] = React.useState<EmailTemplate[]>([])
  const [waTemplates, setWaTemplates] = React.useState<CampaignTemplate[]>([])
  const [countsLoaded, setCountsLoaded] = React.useState(false)

  const loadCounts = React.useCallback(async () => {
    try {
      const [emailRes, waRes] = await Promise.all([
        api.get('/api/email-templates'),
        api.get('/api/campaign-templates?limit=100'),
      ])
      setEmailTemplates(Array.isArray(emailRes) ? (emailRes as EmailTemplate[]) : [])
      setWaTemplates(Array.isArray(waRes?.data) ? (waRes.data as CampaignTemplate[]) : [])
    } catch {
      // silently fail — counts are not critical
    } finally {
      setCountsLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  // Derive counts
  const emailCounts = React.useMemo(() => {
    const mine = emailTemplates.filter((e) => !!e.tenantId).length
    const trans = emailTemplates.filter((e) => e.category === 'transactional').length
    const mkt = emailTemplates.filter((e) => e.category === 'marketing').length
    const sys = emailTemplates.filter((e) => e.category === 'system').length
    return { all: emailTemplates.length, mine, trans, mkt, sys }
  }, [emailTemplates])

  const waCounts = React.useMemo(() => {
    const mine = waTemplates.filter((w) => !!w.tenantId).length
    const mkt = waTemplates.filter((w) => w.category === 'marketing').length
    const util = waTemplates.filter((w) => w.category === 'utility').length
    const auth = waTemplates.filter((w) => w.category === 'authentication').length
    return { all: waTemplates.length, mine, mkt, util, auth }
  }, [waTemplates])

  const emailCountMap: Record<string, number> = {
    'email-all': emailCounts.all,
    'email-mine': emailCounts.mine,
    'email-transactional': emailCounts.trans,
    'email-marketing': emailCounts.mkt,
    'email-system': emailCounts.sys,
  }

  const waCountMap: Record<string, number> = {
    'wa-all': waCounts.all,
    'wa-mine': waCounts.mine,
    'wa-marketing': waCounts.mkt,
    'wa-utility': waCounts.util,
    'wa-authentication': waCounts.auth,
  }

  // Determine which main view to show
  const isEmailView = activeKey.startsWith('email-')
  const isWaView = activeKey.startsWith('wa-')

  const refreshAll = React.useCallback(async () => {
    await loadCounts()
  }, [loadCounts])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Template Studio</h1>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => void refreshAll()}>
          <RefreshCw className="mr-1.5 size-3.5" /> Refresh
        </Button>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — hidden when editor is full-page */}
        {!editorActive && (
          <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 lg:flex">
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-1 p-3" aria-label="Template categories">
              {/* Email section */}
              <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted"
                  >
                    <Mail className="size-3.5" aria-hidden />
                    <span className="flex-1 text-left">Email Templates</span>
                    {emailOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-1 flex flex-col gap-0.5 border-l border-border/50 pl-2">
                    {EMAIL_SIDEBAR_ITEMS.map((item) => {
                      const Icon = item.icon
                      const active = activeKey === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveKey(item.key)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                            active
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden />
                          <span className="flex-1 text-left">{item.label}</span>
                          <span className={cn(
                            'text-xs tabular-nums',
                            active ? 'text-primary' : 'text-muted-foreground/70'
                          )}>
                            {emailCountMap[item.key] ?? 0}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* WhatsApp section */}
              <Collapsible open={waOpen} onOpenChange={setWaOpen} className="mt-2">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted"
                  >
                    <MessageSquare className="size-3.5" aria-hidden />
                    <span className="flex-1 text-left">WhatsApp Templates</span>
                    {waOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-1 flex flex-col gap-0.5 border-l border-border/50 pl-2">
                    {WA_SIDEBAR_ITEMS.map((item) => {
                      const Icon = item.icon
                      const active = activeKey === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveKey(item.key)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                            active
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden />
                          <span className="flex-1 text-left">{item.label}</span>
                          <span className={cn(
                            'text-xs tabular-nums',
                            active ? 'text-primary' : 'text-muted-foreground/70'
                          )}>
                            {waCountMap[item.key] ?? 0}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator className="my-2" />

              {/* Standalone items */}
              {([
                { key: 'packs' as SidebarKey, label: 'Template Packs', icon: Package },
                { key: 'brand' as SidebarKey, label: 'Brand Kit', icon: Palette },
                { key: 'images' as SidebarKey, label: 'Images', icon: ImageIcon },
                { key: 'variables' as SidebarKey, label: 'Variables', icon: VariableIcon },
              ]).map((item) => {
                const Icon = item.icon
                const active = activeKey === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveKey(item.key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </ScrollArea>
        </aside>
        )}

        {/* Mobile bottom nav — hidden when editor is full-page */}
        {!editorActive && (
        <div className="flex border-t bg-background lg:hidden">
          <div className="flex flex-1 overflow-x-auto">
            {([
              { key: 'email-all' as SidebarKey, label: 'Email', icon: Mail },
              { key: 'wa-all' as SidebarKey, label: 'WhatsApp', icon: MessageSquare },
              { key: 'packs' as SidebarKey, label: 'Packs', icon: Package },
              { key: 'brand' as SidebarKey, label: 'Brand', icon: Palette },
              { key: 'images' as SidebarKey, label: 'Images', icon: ImageIcon },
              { key: 'variables' as SidebarKey, label: 'Variables', icon: VariableIcon },
            ]).map((item) => {
              const Icon = item.icon
              const active = activeKey === item.key || (isEmailView && item.key === 'email-all') || (isWaView && item.key === 'wa-all')
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveKey(item.key)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors min-w-0',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          {isEmailView && (
            <EmailTemplatesGallery
              filter={activeKey}
              templates={emailTemplates}
              onRefresh={refreshAll}
              onTemplatesChange={setEmailTemplates}
              onEditorActive={setEditorActive}
            />
          )}
          {isWaView && (
            <WhatsAppTemplatesGallery
              filter={activeKey}
              templates={waTemplates}
              onRefresh={refreshAll}
              onTemplatesChange={setWaTemplates}
              onEditorActive={setEditorActive}
            />
          )}
          {activeKey === 'packs' && <TemplatePacksView />}
          {activeKey === 'brand' && <BrandKitView />}
          {activeKey === 'images' && <ImageLibraryView />}
          {activeKey === 'variables' && <VariablesView />}
        </main>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Email Templates Gallery (Pabbly emails.pabbly.com pattern)                */
/* ========================================================================== */

interface EmailTemplatesGalleryProps {
  filter: SidebarKey
  templates: EmailTemplate[]
  onRefresh: () => void
  onTemplatesChange: (t: EmailTemplate[]) => void
  onEditorActive: (active: boolean) => void
}

function EmailTemplatesGallery({ filter, templates, onRefresh, onTemplatesChange, onEditorActive }: EmailTemplatesGalleryProps) {
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<EmailTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<EmailTemplate | null>(null)
  const [page, setPage] = React.useState(1)
  const perPage = 12

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/email-templates')
      onTemplatesChange(Array.isArray(res) ? (res as EmailTemplate[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load email templates')
    } finally {
      setLoading(false)
    }
  }, [onTemplatesChange])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      // Category filter based on sidebar
      if (filter === 'email-mine' && !t.tenantId) return false
      if (filter === 'email-transactional' && t.category !== 'transactional') return false
      if (filter === 'email-marketing' && t.category !== 'marketing') return false
      if (filter === 'email-system' && t.category !== 'system') return false
      if (q) {
        const haystack = `${t.name} ${t.subject} ${t.description || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [templates, search, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const handleNew = () => {
    setEditingTemplate(null)
    setEditorOpen(true)
    onEditorActive(true)
  }

  const handleEdit = (t: EmailTemplate) => {
    setEditingTemplate(t)
    setEditorOpen(true)
    onEditorActive(true)
  }

  const handleDuplicate = async (t: EmailTemplate) => {
    try {
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
      toast.success('Template duplicated')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate')
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
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const handleSaved = async () => {
    setEditorOpen(false)
    onEditorActive(false)
    await load()
  }

  const handleEditorClose = () => {
    setEditorOpen(false)
    onEditorActive(false)
  }

  // When editor is open, render full-page editor instead of gallery
  if (editorOpen) {
    return (
      <EmailEditorPage
        template={editingTemplate}
        onClose={handleEditorClose}
        onSaved={handleSaved}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Top bar: search + create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by template name..."
            className="pl-8"
            aria-label="Search email templates"
          />
        </div>
        <Button size="sm" onClick={handleNew}>
          <Plus className="mr-1.5 size-3.5" /> Create Template
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email templates found"
          description={search ? 'Try adjusting your search.' : 'Create your first email template to get started.'}
          action={
            <Button size="sm" onClick={handleNew}>
              <Plus className="mr-1.5 size-3.5" /> Create Template
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* Create from Scratch card */}
            <button
              type="button"
              onClick={handleNew}
              className="group flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
                <Plus className="size-6 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">Create from Scratch</span>
            </button>

            {/* Template cards */}
            {paged.map((t) => (
              <EmailTemplateCard
                key={t.id}
                template={t}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* Email template card (Pabbly gallery pattern) */
function EmailTemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: EmailTemplate
  onEdit: (t: EmailTemplate) => void
  onDuplicate: (t: EmailTemplate) => void
  onDelete: (t: EmailTemplate) => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const statusColor = template.status === 'draft' ? 'bg-amber-400' : 'bg-emerald-400'

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit(template)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(template) } }}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video bg-muted/50">
        {template.htmlBody ? (
          <div className="flex size-full items-center justify-center p-2">
            <div
              className="pointer-events-none w-full overflow-hidden text-[6px] leading-tight text-muted-foreground/60 line-clamp-6"
              dangerouslySetInnerHTML={{ __html: template.htmlBody.slice(0, 500) }}
            />
          </div>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1">
            <Mail className="size-8 text-muted-foreground/30" aria-hidden />
            <span className="text-xs text-muted-foreground/40">No preview</span>
          </div>
        )}
        {/* Status dot */}
        <div className="absolute right-2 top-2">
          <span className={cn('inline-block size-2.5 rounded-full', statusColor)} title={template.status || 'published'} />
        </div>
        {/* Hover overlay */}
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(template)}>
                  <Pencil className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => void onDuplicate(template)}>
                  <Copy className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50" onClick={() => onDelete(template)} disabled={template.isBuiltIn}>
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3">
        <span className="truncate text-sm font-medium text-foreground">{template.name}</span>
        <div className="flex items-center gap-1.5">
          <EmailCategoryBadge category={template.category} />
          <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            HTML
          </span>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Email Template Editor (Pabbly HTML Email Builder pattern)                   */
/*                                                                             */
/* Layout: Left (55%) = Live preview with device toggle                        */
/*         Right (45%) = Code editor with Import HTML / Upload Image           */
/* Top bar: Back, name, status, auto-save, Test, Save                         */
/* ========================================================================== */

interface EmailEditorPageProps {
  template: EmailTemplate | null
  onClose: () => void
  onSaved: (saved: EmailTemplate) => void
}

function EmailEditorPage({ template, onClose, onSaved }: EmailEditorPageProps) {
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
  const [showSettings, setShowSettings] = React.useState(false)
  const [showVars, setShowVars] = React.useState(false)
  const [uploadingImage, setUploadingImage] = React.useState(false)

  // Undo/redo history
  const [history, setHistory] = React.useState<string[]>([template?.htmlBody || ''])
  const [historyIndex, setHistoryIndex] = React.useState(0)
  const skipHistoryRef = React.useRef(false)

  const pushHistory = React.useCallback((val: string) => {
    if (skipHistoryRef.current) { skipHistoryRef.current = false; return }
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      if (next[next.length - 1] === val) return prev
      return [...next, val]
    })
    setHistoryIndex((prev) => prev + 1)
  }, [historyIndex])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const handleUndo = () => {
    if (!canUndo) return
    const newIndex = historyIndex - 1
    skipHistoryRef.current = true
    setHtmlBody(history[newIndex])
    setHistoryIndex(newIndex)
  }

  const handleRedo = () => {
    if (!canRedo) return
    const newIndex = historyIndex + 1
    skipHistoryRef.current = true
    setHtmlBody(history[newIndex])
    setHistoryIndex(newIndex)
  }

  // Auto-save draft (debounce 3s)
  const autoSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (!isEdit) return
    if (status !== 'draft') return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaveState('saving')
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/api/email-templates/${template!.id}`, {
          name, slug, category, subject, description, htmlBody, status, language,
          isFavorite, tagsJson: JSON.stringify(tags),
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

  const handleHtmlChange = (val: string) => {
    setHtmlBody(val)
    pushHistory(val)
  }

  const handleInsertVariable = (key: string) => {
    const token = `{{${key}}}`
    if (focusedField === 'subject') {
      setSubject((s) => `${s}${token}`)
    } else {
      const newBody = `${htmlBody}${token} `
      setHtmlBody(newBody)
      pushHistory(newBody)
    }
    toast.success(`Inserted {{${key}}}`)
  }

  const handleAddTag = () => {
    const v = tagInput.trim()
    if (!v || tags.includes(v)) { setTagInput(''); return }
    setTags([...tags, v])
    setTagInput('')
  }

  const handleImportHtml = () => {
    const html = window.prompt('Paste your HTML:', htmlBody)
    if (html !== null) {
      handleHtmlChange(html)
      toast.success('HTML imported')
    }
  }

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true)
    try {
      const res = await uploadFile(file, { bucket: 'template-assets', folder: 'email' })
      const imgTag = `<img src="${res.url}" alt="${res.name}" style="max-width:100%;height:auto;" />`
      const newBody = `${htmlBody}\n${imgTag}`
      setHtmlBody(newBody)
      pushHistory(newBody)
      toast.success('Image uploaded and inserted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingImage(false)
    }
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
      const saved = isEdit
        ? (await api.put(`/api/email-templates/${template!.id}`, body)) as EmailTemplate
        : (await api.post('/api/email-templates', body)) as EmailTemplate
      toast.success(isEdit ? 'Template updated' : 'Template created')
      onSaved(saved)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!template) return toast.error('Save the template first before sending a test')
    setSendingTest(true)
    try {
      const res = await api.post(`/api/email-templates/${template.id}/test-email`, { to: testEmailTo || undefined })
      if (res?.error) toast.error(res.error)
      else if (res?.data?.simulated) toast.info('Test email simulated (no live provider configured)')
      else toast.success(`Test email sent to ${res?.data?.to || testEmailTo}`)
      setShowTestDialog(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center gap-2 border-b bg-background px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 shrink-0">
          <ArrowLeft className="size-4" /> Back
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Template name */}
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template Name"
          className="max-w-[200px] border-0 shadow-none focus-visible:ring-0 text-sm font-medium"
        />

        {/* Status dropdown */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="sm" className="w-[110px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>

        {/* Auto-save indicator */}
        {autoSaveState === 'saving' && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Saving...
          </span>
        )}
        {autoSaveState === 'saved' && (
          <span className="text-xs text-emerald-600">Auto-saved</span>
        )}

        <div className="flex-1" />

        {/* Settings button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Wrench className="size-3.5" /> Settings
        </Button>

        {/* Test email */}
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowTestDialog(true)} disabled={!isEdit}>
          <Send className="size-3.5" /> Test
        </Button>

        {/* Save */}
        <Button size="sm" className="h-8 gap-1.5" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </div>

      {/* ─── Subject + Category Row ─── */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2 flex-1">
          <Label className="shrink-0 text-xs font-medium text-muted-foreground">Subject:</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setFocusedField('subject')}
            placeholder="Welcome to {{company.name}}, {{customer.name}}!"
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-xs font-medium text-muted-foreground">Category:</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transactional">Transactional</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Main Split: Left Preview + Right Code Editor ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Live Preview */}
        <div className="flex flex-1 flex-col border-r bg-muted/20 min-w-0">
          {/* Preview toolbar */}
          <div className="flex items-center gap-2 border-b bg-background px-3 py-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</span>
            <div className="flex-1" />

            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleUndo} disabled={!canUndo}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRedo} disabled={!canRedo}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border" />

            {/* Device toggles */}
            <div className="inline-flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
              {(['desktop', 'tablet', 'mobile'] as EmailPreviewDevice[]).map((d) => {
                const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone
                return (
                  <Tooltip key={d}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant={previewDevice === d ? 'default' : 'ghost'}
                        className="h-7 w-7 p-0"
                        onClick={() => setPreviewDevice(d)}
                      >
                        <Icon className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{d.charAt(0).toUpperCase() + d.slice(1)}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-auto p-4 flex justify-center bg-muted/30">
            <div className={cn(
              'w-full transition-all duration-200',
              previewDevice === 'mobile' ? 'max-w-[375px]' : previewDevice === 'tablet' ? 'max-w-[768px]' : 'max-w-[900px]'
            )}>
              <EmailPreview
                htmlContent={htmlBody}
                subject={subject}
                fromName="Your Company"
                device={previewDevice}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Code Editor */}
        <div className="flex w-full flex-col lg:w-[45%] min-w-0">
          {/* Code editor header */}
          <div className="flex items-center gap-2 border-b bg-background px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Code2 className="size-4 text-primary" />
              <span className="text-sm font-semibold">HTML Email Builder</span>
            </div>
            <div className="flex-1" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={handleImportHtml}
            >
              <FileText className="size-3" /> Import HTML
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadImage(f) }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                asChild
                disabled={uploadingImage}
              >
                <span>
                  {uploadingImage ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                  Upload Image
                </span>
              </Button>
            </label>
          </div>

          {/* Custom HTML Code label */}
          <div className="border-b bg-muted/40 px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom HTML Code</span>
          </div>

          {/* Code textarea */}
          <div className="flex-1 overflow-hidden">
            <textarea
              value={htmlBody}
              onChange={(e) => handleHtmlChange(e.target.value)}
              onFocus={() => setFocusedField('body')}
              className="size-full resize-none bg-background p-3 font-mono text-xs leading-relaxed text-foreground outline-none"
              placeholder={`<html>\n  <body>\n    <h1>Hello {{customer.name}},</h1>\n    <p>Welcome to our service!</p>\n  </body>\n</html>`}
              spellCheck={false}
            />
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setShowVars(!showVars)}
            >
              <VariableIcon className="size-3" />
              {showVars ? 'Hide Variables' : 'Insert Variables'}
            </Button>
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground">{htmlBody.length} chars</span>
          </div>

          {/* Variable picker (collapsible) */}
          {showVars && (
            <div className="max-h-56 overflow-y-auto border-t bg-background p-2">
              <VariablePicker onInsert={handleInsertVariable} compact />
            </div>
          )}
        </div>
      </div>

      {/* ─── Settings Panel (slide-in from right) ─── */}
      {showSettings && (
        <div className="absolute inset-y-0 right-0 z-50 w-72 border-l bg-background shadow-lg flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Template Settings</h3>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSettings(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this template..."
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Language */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger size="sm">
                    <SelectValue />
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

              {/* Favorite */}
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="text-xs">Favorite</Label>
                <Switch checked={isFavorite} onCheckedChange={setIsFavorite} />
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Tags</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
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
                      <Badge key={t} variant="secondary" className="gap-1 text-xs">
                        {t}
                        <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="rounded-sm hover:bg-muted-foreground/20" aria-label={`Remove ${t}`}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Template info */}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {template && (
                  <>
                    <span>ID: {template.id}</span>
                    <span>Slug: {template.slug}</span>
                    <span>Created: {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A'}</span>
                    <span>Updated: {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'N/A'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Test email dialog ─── */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>Send a personalized test of this template to your inbox.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="test-to" className="text-xs">Recipient (defaults to your account email)</Label>
            <Input id="test-to" type="email" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} placeholder="you@example.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>Cancel</Button>
            <Button onClick={() => void handleSendTest()} disabled={sendingTest}>
              {sendingTest ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Send className="mr-1.5 size-3.5" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ========================================================================== */
/* WhatsApp Templates Gallery (Pabbly chatflow pattern)                       */
/* ========================================================================== */

interface WhatsAppTemplatesGalleryProps {
  filter: SidebarKey
  templates: CampaignTemplate[]
  onRefresh: () => void
  onTemplatesChange: (t: CampaignTemplate[]) => void
  onEditorActive: (active: boolean) => void
}

function WhatsAppTemplatesGallery({ filter, templates, onRefresh, onTemplatesChange, onEditorActive }: WhatsAppTemplatesGalleryProps) {
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<CampaignTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CampaignTemplate | null>(null)
  const [page, setPage] = React.useState(1)
  const perPage = 9

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/campaign-templates?limit=100')
      onTemplatesChange(Array.isArray(res?.data) ? (res.data as CampaignTemplate[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [onTemplatesChange])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (filter === 'wa-mine' && !t.tenantId) return false
      if (filter === 'wa-marketing' && t.category !== 'marketing') return false
      if (filter === 'wa-utility' && t.category !== 'utility') return false
      if (filter === 'wa-authentication' && t.category !== 'authentication') return false
      if (q) {
        const haystack = `${t.name} ${t.content} ${t.description || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [templates, search, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const handleNew = () => {
    setEditingTemplate(null)
    setEditorOpen(true)
    onEditorActive(true)
  }

  const handleEdit = (t: CampaignTemplate) => {
    setEditingTemplate(t)
    setEditorOpen(true)
    onEditorActive(true)
  }

  const handleDuplicate = async (t: CampaignTemplate) => {
    try {
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
      toast.success('Template duplicated')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate')
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

  const handleEditorClose = () => {
    setEditorOpen(false)
    onEditorActive(false)
  }

  const handleEditorSaved = async () => {
    setEditorOpen(false)
    onEditorActive(false)
    await load()
  }

  // When editor is open, render full-page editor instead of gallery
  if (editorOpen) {
    return (
      <WhatsAppEditorPage
        template={editingTemplate}
        onClose={handleEditorClose}
        onSaved={handleEditorSaved}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search templates..."
            className="pl-8"
            aria-label="Search WhatsApp templates"
          />
        </div>
        <Button size="sm" onClick={handleNew}>
          <Plus className="mr-1.5 size-3.5" /> Add New Template
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No WhatsApp templates found"
          description={search ? 'Try adjusting your search.' : 'Create your first WhatsApp template to get started.'}
          action={
            <Button size="sm" onClick={handleNew}>
              <Plus className="mr-1.5 size-3.5" /> Add New Template
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {paged.map((t) => (
              <WhatsAppTemplateCard
                key={t.id}
                template={t}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button key={i} variant={page === i + 1 ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setPage(i + 1)}>
                  {i + 1}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* WhatsApp template card (Pabbly chatflow pattern) */
function WhatsAppTemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: CampaignTemplate
  onEdit: (t: CampaignTemplate) => void
  onDuplicate: (t: CampaignTemplate) => void
  onDelete: (t: CampaignTemplate) => void
}) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      className="group relative flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit(template)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(template) } }}
    >
      {/* Name */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{template.name}</span>
        <TypeBadge type={template.templateType || 'text'} />
      </div>

      {/* Body preview with merge tag highlighting */}
      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
        <WaBodyPreview text={template.content || ''} />
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <WaCategoryBadge category={template.category} />
        <StatusBadge status={template.status || 'published'} />
      </div>

      {/* Hover overlay */}
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(template)}>
                <Pencil className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => void onDuplicate(template)}>
                <Copy className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50" onClick={() => onDelete(template)}>
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

/** Highlight {{n}} merge tags in WhatsApp body text. */
function WaBodyPreview({ text }: { text: string }) {
  if (!text) return null
  const parts = text.split(/(\{\{[^}]+\}\})/g)
  return (
    <>
      {parts.map((part, i) => {
        const isVar = /^\{\{[^}]+\}\}$/.test(part)
        if (!isVar) return <span key={i}>{part}</span>
        return (
          <span key={i} className="rounded bg-teal-100 px-0.5 font-mono text-teal-700">
            {part}
          </span>
        )
      })}
    </>
  )
}

/* ========================================================================== */
/* WhatsApp Template Editor (Full-page view, Pabbly add-template pattern)      */
/* ========================================================================== */

interface WhatsAppEditorPageProps {
  template: CampaignTemplate | null
  onClose: () => void
  onSaved: () => void
}

const WA_CATEGORIES = ['general', 'promotional', 'reminder', 'seasonal', 'follow_up', 're_engagement', 'marketing', 'utility', 'authentication']

function WhatsAppEditorPage({ template, onClose, onSaved }: WhatsAppEditorPageProps) {
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
  const [interactiveAction, setInteractiveAction] = React.useState<'none' | 'cta' | 'quick_replies' | 'all'>(
    buttons.length > 0
      ? buttons.some((b) => b.type === 'quick_reply') ? 'quick_replies' : 'cta'
      : 'none'
  )
  const [device, setDevice] = React.useState<'android' | 'iphone'>('android')
  const [saving, setSaving] = React.useState(false)
  const [uploadingHeader, setUploadingHeader] = React.useState(false)
  const [varsOpen, setVarsOpen] = React.useState(false)
  const [aiLoading, setAiLoading] = React.useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = React.useState('')

  const bodyRef = React.useRef<HTMLTextAreaElement>(null)

  const handleInsertVariable = (key: string) => {
    const token = `{{${key}}}`
    const el = bodyRef.current
    if (!el) { setBody((b) => `${b}${token}`); return }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = body.slice(0, start) + token + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
    toast.success(`Inserted {{${key}}}`)
  }

  const handleHeaderUpload = async (file: File) => {
    setUploadingHeader(true)
    try {
      const res = await uploadFile(file, { bucket: 'template-assets', folder: 'whatsapp' })
      setHeaderMediaUrl(res.url)
      toast.success('Header media uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingHeader(false)
    }
  }

  const addQuickReply = () => {
    if (buttons.length >= 3) { toast.error('Maximum 3 buttons'); return }
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
        buttons: interactiveAction === 'none' ? [] : buttons,
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

  // Extract WhatsApp-style numbered parameters from body
  const waParams = React.useMemo(() => {
    const matches = body.match(/\{\{(\d+)\}\}/g) || []
    const nums = [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))]
    return nums.map((n) => ({ key: `{{${n}}}`, num: n }))
  }, [body])

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="mr-1">
          <ArrowLeft className="mr-1.5 size-3.5" /> Back
        </Button>
        <h2 className="text-base font-semibold">
          {isEdit ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}
        </h2>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-3.5" />}
          Submit
        </Button>
      </div>

      {/* 2-panel layout: left form (55%) + right phone preview (45%) */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left: form */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
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
              <Label className="text-xs">Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Booking Reminder" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
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
              <Label className="text-xs">Variable Type</Label>
              <Select defaultValue="number">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Template Type radios */}
          <div className="mt-4">
            <Label className="text-xs font-medium">Template Type</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['text', 'image', 'video', 'document', 'location'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => t !== 'location' && setTemplateType(t)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    (t === 'location' ? false : templateType === t)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                  disabled={t === 'location'}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Header section */}
          <div className="mt-4 rounded-md border p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header</h4>
            {templateType === 'text' ? (
              <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Optional header text (max 60 chars)" maxLength={60} />
            ) : (
              <div className="flex items-center gap-2">
                <Input value={headerMediaUrl} onChange={(e) => setHeaderMediaUrl(e.target.value)} placeholder="Media URL (or upload below)" readOnly={!!headerMediaUrl} />
                {headerMediaUrl ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setHeaderMediaUrl('')}>
                    <X className="size-3.5" />
                  </Button>
                ) : (
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept={templateType === 'image' ? 'image/*' : templateType === 'video' ? 'video/mp4' : 'application/pdf'}
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleHeaderUpload(f) }}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        {uploadingHeader ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
                        Upload
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="mt-4 flex flex-col gap-1.5">
            <Label className="text-xs">Body</Label>
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{1}}, thank you for your order..."
              className="min-h-[120px] font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Use <code className="rounded bg-muted px-1">{`{{1}}`}</code>, <code className="rounded bg-muted px-1">{`{{2}}`}</code> for numbered parameters. Max 1024 characters.
            </p>
          </div>

          {/* Parameters */}
          {waParams.length > 0 && (
            <div className="mt-3 rounded-md border p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parameters</h4>
              <div className="flex flex-col gap-2">
                {waParams.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <code className="rounded bg-teal-100 px-1.5 py-0.5 text-xs font-mono text-teal-700">{p.key}</code>
                    <Input placeholder={`Parameter ${p.num}`} className="flex-1 text-sm" />
                    <Input placeholder="Sample Value" className="flex-1 text-sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insert variables (collapsible) */}
          <Collapsible open={varsOpen} onOpenChange={setVarsOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <VariableIcon className="size-3.5" /> Insert Variables
                </span>
                {varsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <VariablePicker onInsert={handleInsertVariable} compact />
            </CollapsibleContent>
          </Collapsible>

          {/* Footer */}
          <div className="mt-4 flex flex-col gap-1.5">
            <Label className="text-xs">Footer (optional, max 60 chars)</Label>
            <Input value={footer} onChange={(e) => setFooter(e.target.value)} maxLength={60} placeholder="{{company.name}}" />
          </div>

          {/* Interactive Actions */}
          <div className="mt-4">
            <Label className="text-xs font-medium">Interactive Actions</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['none', 'cta', 'quick_replies', 'all'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setInteractiveAction(a)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    interactiveAction === a
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  {a === 'none' ? 'None' : a === 'cta' ? 'Call To Actions' : a === 'quick_replies' ? 'Quick Replies' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Replies section */}
          {(interactiveAction === 'quick_replies' || interactiveAction === 'all') && (
            <div className="mt-4 rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick Replies ({buttons.length}/3)
                </h4>
                <Button type="button" size="sm" variant="outline" onClick={addQuickReply} disabled={buttons.length >= 3}>
                  <Plus className="mr-1.5 size-3.5" /> Add Quick Reply
                </Button>
              </div>
              {buttons.length === 0 ? (
                <p className="text-xs text-muted-foreground">No quick replies added.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {buttons.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={b.text}
                        onChange={(e) => updateButton(i, { text: e.target.value })}
                        placeholder="Button text"
                        className="flex-1 text-sm"
                      />
                      <Button type="button" size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => removeButton(i)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CTA buttons section */}
          {(interactiveAction === 'cta' || interactiveAction === 'all') && interactiveAction !== 'quick_replies' && (
            <div className="mt-4 rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Call To Actions ({buttons.length}/3)
                </h4>
                <Button type="button" size="sm" variant="outline" onClick={addQuickReply} disabled={buttons.length >= 3}>
                  <Plus className="mr-1.5 size-3.5" /> Add Button
                </Button>
              </div>
              {buttons.length === 0 ? (
                <p className="text-xs text-muted-foreground">No call-to-action buttons added.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {buttons.map((b, i) => (
                    <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-[120px_1fr_1fr_auto]">
                      <Select value={b.type} onValueChange={(v) => updateButton(i, { type: v as WhatsAppButton['type'] })}>
                        <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quick_reply">Quick Reply</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="copy_coupon">Copy Coupon</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={b.text} onChange={(e) => updateButton(i, { text: e.target.value })} placeholder="Button text" className="text-sm" />
                      <Input value={b.value || ''} onChange={(e) => updateButton(i, { value: e.target.value })} placeholder={b.type === 'call' ? '+1 555-0100' : b.type === 'website' ? 'https://...' : 'COUPON123'} className="text-sm" />
                      <Button type="button" size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => removeButton(i)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status + Favorite */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label className="text-xs">Favorite</Label>
                <Switch checked={isFavorite} onCheckedChange={setIsFavorite} />
              </div>
            </div>
          </div>

          {/* AI Assistant */}
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50/40 p-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
              <Sparkles className="size-3.5" /> AI Assistant
            </h4>
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe what you want (e.g. 'Reminder for tomorrow's appointment')"
              className="mb-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void handleAiAction('generate')} disabled={!aiPrompt.trim() || aiLoading !== null}>
                {aiLoading === 'generate' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Sparkles className="mr-1.5 size-3.5" />}
                Generate
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void handleAiAction('improve')} disabled={!body.trim() || aiLoading !== null}>
                {aiLoading === 'improve' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
                Improve
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void handleAiAction('shorten')} disabled={!body.trim() || aiLoading !== null}>
                {aiLoading === 'shorten' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
                Shorten
              </Button>
            </div>
          </div>
        </div>

        {/* Right: phone preview */}
        <aside className="w-full shrink-0 overflow-y-auto border-t bg-muted/30 p-4 lg:w-[45%] lg:border-l lg:border-t-0">
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
          <div className="flex justify-center">
            <WhatsAppPhonePreview
              templateType={templateType}
              headerText={headerText || undefined}
              headerMediaUrl={headerMediaUrl || undefined}
              content={body}
              footerText={footer || undefined}
              buttons={buttons.filter((b) => b.text.trim())}
              device={device}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Template Packs View                                                        */
/* ========================================================================== */

function TemplatePacksView() {
  const [loading, setLoading] = React.useState(true)
  const [packs, setPacks] = React.useState<TemplatePack[]>([])
  const [search, setSearch] = React.useState('')
  const [installing, setInstalling] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/template-packs')
      const data = Array.isArray(res) ? res : (res?.data ?? [])
      setPacks(data as TemplatePack[])
    } catch {
      // fallback to local data
      setPacks(
        ALL_PACKS.map((p) => ({
          slug: p.slug,
          name: p.name,
          description: p.description,
          category: p.category,
          industry: p.industry || null,
          icon: p.icon,
          color: p.color,
          templateCount: p.templates.length,
          isInstalled: false,
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const handleInstall = async (slug: string) => {
    setInstalling(slug)
    try {
      await api.post('/api/template-packs/install', { slug })
      toast.success('Pack installed successfully')
      setPacks((prev) => prev.map((p) => (p.slug === slug ? { ...p, isInstalled: true } : p)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to install pack')
    } finally {
      setInstalling(null)
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return packs
    return packs.filter((p) => `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q))
  }, [packs, search])

  const businessPacks = filtered.filter((p) => p.category === 'business' && !p.industry)
  const industryPacks = filtered.filter((p) => !!p.industry)

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search template packs..."
            className="pl-8"
          />
        </div>
      </div>

      {/* Business Packs */}
      {businessPacks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Business Packs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businessPacks.map((pack) => (
              <PackCard key={pack.slug} pack={pack} installing={installing} onInstall={handleInstall} />
            ))}
          </div>
        </section>
      )}

      {/* Industry Packs */}
      {industryPacks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Industry Packs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industryPacks.map((pack) => (
              <PackCard key={pack.slug} pack={pack} installing={installing} onInstall={handleInstall} />
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <EmptyState icon={Package} title="No template packs found" description="Try adjusting your search." />
      )}
    </div>
  )
}

function PackCard({
  pack,
  installing,
  onInstall,
}: {
  pack: TemplatePack
  installing: string | null
  onInstall: (slug: string) => void
}) {
  const IconComponent = getIcon(pack.icon)
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: pack.color + '18', color: pack.color }}>
            {React.createElement(IconComponent, { className: 'size-5' })}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{pack.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{pack.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{pack.templateCount} templates</span>
          {pack.isInstalled ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <CheckCircle2 className="size-3" /> Installed
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => void onInstall(pack.slug)}
              disabled={installing === pack.slug}
            >
              {installing === pack.slug ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Plus className="mr-1.5 size-3.5" />}
              Install
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ========================================================================== */
/* Brand Kit View                                                             */
/* ========================================================================== */

function BrandKitView() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [brand, setBrand] = React.useState<BrandKit>({})
  const [logoUploading, setLogoUploading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/brand-kit')
      setBrand((res as BrandKit) || {})
    } catch {
      // use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/api/brand-kit', brand)
      toast.success('Brand kit saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true)
    try {
      const res = await uploadFile(file, { bucket: 'company-assets', folder: 'logo' })
      setBrand((b) => ({ ...b, logoUrl: res.url }))
      toast.success('Logo uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  const updateField = (field: keyof BrandKit, value: string | boolean | null) => {
    setBrand((b) => ({ ...b, [field]: value }))
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Brand Kit</h2>
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Company Name</Label>
                <Input value={brand.companyName || ''} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Your Company" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Website</Label>
                <Input value={brand.website || ''} onChange={(e) => updateField('website', e.target.value)} placeholder="https://example.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={brand.email || ''} onChange={(e) => updateField('email', e.target.value)} placeholder="hello@example.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={brand.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="+1 555-0100" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-xs">Address</Label>
                <Input value={brand.address || ''} onChange={(e) => updateField('address', e.target.value)} placeholder="123 Main St, Springfield, IL" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Logo &amp; Colors</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Logo</Label>
                <div className="flex items-center gap-3">
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt="Company logo" className="h-10 w-auto rounded" />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded bg-muted">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f) }}
                    />
                    <Button type="button" variant="outline" size="sm" asChild disabled={logoUploading}>
                      <span>
                        {logoUploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
                        Upload
                      </span>
                    </Button>
                  </label>
                  {brand.logoUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => updateField('logoUrl', null)}>
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map((field) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <Label className="text-xs capitalize">{field.replace('Color', '')}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brand[field] || '#0d9488'}
                        onChange={(e) => updateField(field, e.target.value)}
                        className="size-8 cursor-pointer rounded border"
                      />
                      <Input
                        value={brand[field] || ''}
                        onChange={(e) => updateField(field, e.target.value)}
                        placeholder="#0d9488"
                        className="flex-1 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Font Family</Label>
                <Select value={brand.fontFamily || 'system'} onValueChange={(v) => updateField('fontFamily', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System Default</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="opensans">Open Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Footer HTML</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={brand.footerHtml || ''}
                onChange={(e) => updateField('footerHtml', e.target.value)}
                placeholder="<p>© 2024 Your Company. All rights reserved.</p>"
                className="min-h-[100px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Email Footer Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white p-4">
                {brand.footerHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: brand.footerHtml }} />
                ) : (
                  <p className="text-sm text-gray-400">Footer preview will appear here</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Color Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded" style={{ backgroundColor: brand.primaryColor || '#0d9488' }} />
                  <span className="text-xs text-muted-foreground">Primary: {brand.primaryColor || '#0d9488'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded" style={{ backgroundColor: brand.secondaryColor || '#0891b2' }} />
                  <span className="text-xs text-muted-foreground">Secondary: {brand.secondaryColor || '#0891b2'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded" style={{ backgroundColor: brand.accentColor || '#d97706' }} />
                  <span className="text-xs text-muted-foreground">Accent: {brand.accentColor || '#d97706'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Image Library View                                                         */
/* ========================================================================== */

function ImageLibraryView() {
  const [loading, setLoading] = React.useState(true)
  const [images, setImages] = React.useState<ImageLibraryItem[]>([])
  const [search, setSearch] = React.useState('')
  const [activeFolder, setActiveFolder] = React.useState('all')
  const [uploading, setUploading] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ImageLibraryItem | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/image-library')
      const data = Array.isArray(res) ? res : (res?.data ?? [])
      setImages(data as ImageLibraryItem[])
    } catch {
      // use empty
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  const folders = React.useMemo(() => {
    const set = new Set(images.map((i) => i.folder).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [images])

  const filtered = React.useMemo(() => {
    let list = images
    if (activeFolder !== 'all') list = list.filter((i) => i.folder === activeFolder)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q))
    return list
  }, [images, activeFolder, search])

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const folder = activeFolder === 'all' ? 'general' : activeFolder
        const res = await uploadFile(file, { bucket: 'template-assets', folder })
        await api.post('/api/image-library', {
          name: res.name,
          url: res.url,
          folder,
          mediaType: res.mediaType,
          size: res.size,
        })
      }
      toast.success('Images uploaded')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
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
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search images..." className="pl-8" />
        </div>
        <label className="inline-flex">
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files) void handleUpload(e.target.files) }} />
          <Button size="sm" asChild disabled={uploading}>
            <span>
              {uploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Upload className="mr-1.5 size-3.5" />}
              Upload Image
            </span>
          </Button>
        </label>
      </div>

      {/* Folder tabs */}
      <div className="flex flex-wrap gap-1.5">
        {folders.map((f) => (
          <Button
            key={f}
            variant={activeFolder === f ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => setActiveFolder(f)}
          >
            {f === 'all' ? 'All' : f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images found"
          description="Upload images to use in your templates."
          action={
            <label className="inline-flex">
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files) void handleUpload(e.target.files) }} />
              <Button size="sm" asChild><span><Upload className="mr-1.5 size-3.5" /> Upload Image</span></Button>
            </label>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
              <div className="aspect-square bg-muted">
                <img src={img.url} alt={img.name} className="size-full object-cover" loading="lazy" />
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="truncate text-xs text-foreground">{img.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-rose-600 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setDeleteTarget(img)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
              <div className="px-2 pb-2 text-[10px] text-muted-foreground">{formatBytes(img.size)}</div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ========================================================================== */
/* Variables View                                                             */
/* ========================================================================== */

function VariablesView() {
  const [search, setSearch] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return VARIABLE_CATEGORIES
    return VARIABLE_CATEGORIES.map((cat) => ({
      ...cat,
      variables: cat.variables.filter(
        (v) =>
          v.label.toLowerCase().includes(q) ||
          v.key.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.variables.length > 0)
  }, [search])

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">Variables Reference</h2>
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className="pl-8"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use these variables in your email and WhatsApp templates as <code className="rounded bg-muted px-1 font-mono">{'{{variable_key}}'}</code>.
        They will be replaced with actual values when the template is sent.
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={VariableIcon} title="No variables found" description="Try a different search term." />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((cat) => {
            const CatIcon = getIcon(cat.icon)
            return (
              <Card key={cat.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CatIcon className="size-4 text-muted-foreground" />
                    {cat.name}
                    <Badge variant="secondary" className="ml-1 text-[10px]">{cat.variables.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="whitespace-nowrap px-4 py-2 font-medium text-muted-foreground">Variable</th>
                          <th className="whitespace-nowrap px-4 py-2 font-medium text-muted-foreground">Key</th>
                          <th className="whitespace-nowrap px-4 py-2 font-medium text-muted-foreground">Example</th>
                          <th className="whitespace-nowrap px-4 py-2 font-medium text-muted-foreground">Copy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.variables.map((v) => (
                          <tr key={v.key} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2 font-medium text-foreground">{v.label}</td>
                            <td className="px-4 py-2 font-mono text-teal-700">{`{{${v.key}}}`}</td>
                            <td className="px-4 py-2 text-muted-foreground">{v.example}</td>
                            <td className="px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => {
                                  navigator.clipboard.writeText(`{{${v.key}}}`)
                                  toast.success(`Copied {{${v.key}}}`)
                                }}
                              >
                                <Copy className="mr-1 size-3" /> Copy
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
/* Exports                                                                    */
/* ========================================================================== */

export default TemplateStudioView
