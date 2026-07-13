'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellRing,
  BellOff,
  UserPlus,
  CheckCircle2,
  CheckCircle,
  XCircle,
  ClipboardList,
  PlayCircle,
  Truck,
  FileText,
  BadgeDollarSign,
  Star,
  LogIn,
  Workflow,
  LifeBuoy,
  Settings,
  RefreshCw,
  Archive,
  Trash2,
  Search,
  Filter,
  Inbox,
  Clock,
  AlertTriangle,
  CheckCheck,
  Save,
  MoonStar,
  Mail,
  Smartphone,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useDemoPageSize } from '@/hooks/use-demo-page-size';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppNotification {
  id: string;
  tenantId: string;
  recipientId: string;
  type: string;
  category: string;
  title: string;
  message: string;
  metadataJson: string;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  readAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  pushSent: boolean;
  pushSentAt: string | null;
  priority: string;
  senderId: string | null;
  senderType: string;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
}

interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  typePrefsJson: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTz: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Notification type metadata ──────────────────────────────────────────────
// Matches src/lib/notifications.ts — kept in sync manually so the UI
// doesn't need to import server-side code.

const NOTIFICATION_TYPES = [
  { value: 'lead_assigned', label: 'Lead Assigned' },
  { value: 'lead_updated', label: 'Lead Updated' },
  { value: 'quote_approved', label: 'Quote Approved' },
  { value: 'quote_rejected', label: 'Quote Rejected' },
  { value: 'job_assigned', label: 'Job Assigned' },
  { value: 'job_started', label: 'Job Started' },
  { value: 'technician_on_route', label: 'Technician On Route' },
  { value: 'job_completed', label: 'Job Completed' },
  { value: 'invoice_created', label: 'Invoice Created' },
  { value: 'invoice_paid', label: 'Invoice Paid' },
  { value: 'customer_review', label: 'Customer Review' },
  { value: 'employee_login', label: 'Employee Login' },
  { value: 'workflow_executed', label: 'Workflow Executed' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'support_ticket_update', label: 'Support Ticket Update' },
] as const;

const NOTIFICATION_CATEGORIES = [
  { value: 'lead', label: 'Lead' },
  { value: 'job', label: 'Job' },
  { value: 'quote', label: 'Quote' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'customer', label: 'Customer' },
  { value: 'employee', label: 'Employee' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'support', label: 'Support' },
  { value: 'system', label: 'System' },
] as const;

// Map a notification type → lucide icon component + colors.
// Kept in sync with src/lib/notifications.ts::iconForType().
const TYPE_ICON_MAP: Record<
  string,
  { icon: LucideIcon; color: string; bg: string }
> = {
  lead_assigned: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  lead_updated: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  quote_approved: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  quote_rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  job_assigned: { icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
  job_started: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  technician_on_route: { icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50' },
  job_completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  invoice_created: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  invoice_paid: { icon: BadgeDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  customer_review: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
  employee_login: { icon: LogIn, color: 'text-teal-600', bg: 'bg-teal-50' },
  workflow_executed: { icon: Workflow, color: 'text-purple-600', bg: 'bg-purple-50' },
  reminder: { icon: Bell, color: 'text-slate-600', bg: 'bg-slate-100' },
  support_ticket_update: { icon: LifeBuoy, color: 'text-orange-600', bg: 'bg-orange-50' },
};

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.value, c.label])
);

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  normal: 'bg-slate-300',
  low: 'bg-slate-200',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getNotificationIcon(type: string): {
  icon: LucideIcon;
  color: string;
  bg: string;
} {
  return TYPE_ICON_MAP[type] || { icon: Bell, color: 'text-slate-600', bg: 'bg-slate-100' };
}

function getNotificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPES.find((t) => t.value === type)?.label || type;
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bg,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn('p-2.5 rounded-xl shrink-0', bg)}>
            <Icon className={cn('size-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notification Row ────────────────────────────────────────────────────────

interface NotificationRowProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationRow({ notification, onRead, onArchive, onDelete }: NotificationRowProps) {
  const { icon: Icon, color, bg } = getNotificationIcon(notification.type);
  const isUnread = !notification.isRead;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
    if (notification.actionUrl) {
      // Open the action URL in the same tab. We use location.assign so
      // the back button still works.
      try {
        window.location.assign(notification.actionUrl);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          'group relative flex items-start gap-3 p-3.5 rounded-lg border bg-white hover:bg-muted/30 transition-colors cursor-pointer text-left w-full',
          isUnread && 'border-l-4 border-l-emerald-500'
        )}
      >
        {/* Icon */}
        <div className={cn('p-2 rounded-lg shrink-0', bg)}>
          <Icon className={cn('size-4', color)} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={cn(
                'text-sm truncate',
                isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
              )}
            >
              {notification.title}
            </p>
            {/* Priority dot */}
            <span
              className={cn(
                'inline-block size-1.5 rounded-full shrink-0',
                PRIORITY_DOT[notification.priority] || PRIORITY_DOT.normal
              )}
              title={`Priority: ${notification.priority}`}
            />
            {/* Category badge */}
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 font-medium shrink-0"
            >
              {CATEGORY_LABELS[notification.category] || notification.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Clock className="size-3 text-muted-foreground/70" />
            <span className="text-[10px] text-muted-foreground">
              {timeAgo(notification.createdAt)}
            </span>
            {notification.type && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">
                  {getNotificationTypeLabel(notification.type)}
                </span>
              </>
            )}
            {isUnread && (
              <Badge className="ml-auto text-[9px] h-4 px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200">
                New
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Archive notification"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
          >
            <Archive className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            aria-label="Delete notification"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{notification.title}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                onDelete(notification.id);
                setConfirmDelete(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Skeleton Row ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-lg border">
      <Skeleton className="size-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// ─── Preferences Dialog ──────────────────────────────────────────────────────

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PreferencesDialog({ open, onOpenChange }: PreferencesDialogProps) {
  const queryClient = useQueryClient();
  const [inApp, setInApp] = useState(true);
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [sms, setSms] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [quietTz, setQuietTz] = useState('Asia/Calcutta');
  const [typePrefs, setTypePrefs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Fetch preferences.
  const { data: pref, isLoading } = useQuery<NotificationPreference>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/preferences?XTransformPort=3000');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json();
    },
    enabled: open,
  });

  // Sync form state when preferences load.
  useEffect(() => {
    if (!pref) return;
    setInApp(pref.inAppEnabled);
    setPush(pref.pushEnabled);
    setEmail(pref.emailEnabled);
    setSms(pref.smsEnabled);
    setWhatsapp(pref.whatsappEnabled);
    setQuietStart(pref.quietHoursStart || '');
    setQuietEnd(pref.quietHoursEnd || '');
    setQuietTz(pref.quietHoursTz || 'Asia/Calcutta');
    try {
      setTypePrefs(JSON.parse(pref.typePrefsJson || '{}'));
    } catch {
      setTypePrefs({});
    }
  }, [pref]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences?XTransformPort=3000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inAppEnabled: inApp,
          pushEnabled: push,
          emailEnabled: email,
          smsEnabled: sms,
          whatsappEnabled: whatsapp,
          quietHoursStart: quietStart || null,
          quietHoursEnd: quietEnd || null,
          quietHoursTz: quietTz,
          typePrefsJson: JSON.stringify(typePrefs),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save preferences');
      }
      toast.success('Notification preferences saved');
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save preferences';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5 text-emerald-600" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Choose how you receive notifications and which types trigger them.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Channel toggles */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BellRing className="size-4 text-emerald-600" />
                Delivery Channels
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ChannelToggle
                  icon={Bell}
                  label="In-App"
                  description="Bell + Notification Center"
                  color="text-emerald-600"
                  bg="bg-emerald-50"
                  checked={inApp}
                  onChange={setInApp}
                />
                <ChannelToggle
                  icon={BellRing}
                  label="Push"
                  description="Browser / mobile push"
                  color="text-violet-600"
                  bg="bg-violet-50"
                  checked={push}
                  onChange={setPush}
                />
                <ChannelToggle
                  icon={Mail}
                  label="Email"
                  description="Send to my inbox"
                  color="text-blue-600"
                  bg="bg-blue-50"
                  checked={email}
                  onChange={setEmail}
                />
                <ChannelToggle
                  icon={Smartphone}
                  label="SMS"
                  description="Text message"
                  color="text-amber-600"
                  bg="bg-amber-50"
                  checked={sms}
                  onChange={setSms}
                />
                <ChannelToggle
                  icon={MessageSquare}
                  label="WhatsApp"
                  description="WhatsApp message"
                  color="text-green-600"
                  bg="bg-green-50"
                  checked={whatsapp}
                  onChange={setWhatsapp}
                />
              </div>
            </div>

            {/* Quiet hours */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MoonStar className="size-4 text-emerald-600" />
                Quiet Hours
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Don&apos;t deliver non-urgent notifications during these hours. Urgent
                notifications always go through.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <Input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Timezone</Label>
                  <Input
                    type="text"
                    value={quietTz}
                    onChange={(e) => setQuietTz(e.target.value)}
                    className="mt-1"
                    placeholder="Asia/Calcutta"
                  />
                </div>
              </div>
            </div>

            {/* Per-type toggles */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Filter className="size-4 text-emerald-600" />
                Notification Types
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Toggle individual notification types. Disabling a type means it
                won&apos;t be delivered (but you&apos;ll still see it in the Notification
                Center).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {NOTIFICATION_TYPES.map((t) => {
                  const iconMeta = TYPE_ICON_MAP[t.value] || {
                    icon: Bell,
                    color: 'text-slate-600',
                    bg: 'bg-slate-100',
                  };
                  const Icon = iconMeta.icon;
                  const enabled = typePrefs[t.value] !== false;
                  return (
                    <div
                      key={t.value}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-lg border transition-colors',
                        enabled ? 'border-border bg-card' : 'border-border/50 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn('p-1.5 rounded-md shrink-0', iconMeta.bg)}>
                          <Icon className={cn('size-3.5', iconMeta.color)} />
                        </div>
                        <span className="text-xs font-medium truncate">{t.label}</span>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) =>
                          setTypePrefs((prev) => ({ ...prev, [t.value]: v }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="size-4" /> Save Preferences
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelToggle({
  icon: Icon,
  label,
  description,
  color,
  bg,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  bg: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        checked ? 'border-border bg-card' : 'border-border/50 opacity-60'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('p-2 rounded-lg shrink-0', bg)}>
          <Icon className={cn('size-4', color)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── NotificationsView ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

type FilterTab = 'all' | 'unread' | 'archived';

export function NotificationsView() {
  const queryClient = useQueryClient();

  // Demo-mode page size cap (5 for demo tenant, else 50)
  const demoPageSize = useDemoPageSize(50);

  // ─── Filter state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Debounce search input so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Query: notification list ──────────────────────────────────────────────
  const queryKey = useMemo(
    () => [
      'notifications',
      { tab, typeFilter, categoryFilter, search: searchDebounced, demoPageSize },
    ],
    [tab, typeFilter, categoryFilter, searchDebounced, demoPageSize]
  );

  const { data, isLoading, isFetching, refetch } = useQuery<NotificationsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('filter', tab);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchDebounced) params.set('search', searchDebounced);
      params.set('limit', String(demoPageSize));
      params.set('XTransformPort', '3000');
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch notifications');
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  // ─── Poll unread count every 30s ───────────────────────────────────────────
  // Lightweight endpoint, just for the badge + stat refresh.
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}?XTransformPort=3000`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: () => toast.error('Failed to mark as read'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all?XTransformPort=3000', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: (data: { updated: number }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success(`Marked ${data.updated} notification${data.updated === 1 ? '' : 's'} as read`);
    },
    onError: () => toast.error('Failed to mark all as read'),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/archive/${id}?XTransformPort=3000`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to archive');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('Notification archived');
    },
    onError: () => toast.error('Failed to archive notification'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}?XTransformPort=3000`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('Notification deleted');
    },
    onError: () => toast.error('Failed to delete notification'),
  });

  // ─── Derived stats ─────────────────────────────────────────────────────────
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const totalCount = data?.total ?? 0;
  const archivedCount = useMemo(() => {
    // We can't know the archived count from a single list response —
    // when the user is on the 'archived' tab, total IS the archived
    // count; otherwise we show '?'.
    return tab === 'archived' ? totalCount : 0;
  }, [tab, totalCount]);
  const todayCount = useMemo(
    () => notifications.filter((n) => isToday(n.createdAt)).length,
    [notifications]
  );

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Notifications refreshed');
  }, [refetch]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50">
            <Bell className="size-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Stay on top of leads, jobs, invoices and more
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setPrefsOpen(true)}
          >
            <Settings className="size-4" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total"
          value={totalCount}
          subtitle="in current view"
          icon={Inbox}
          color="text-slate-600"
          bg="bg-slate-100"
        />
        <StatCard
          title="Unread"
          value={unreadCount}
          subtitle={unreadCount > 0 ? 'needs your attention' : 'all caught up'}
          icon={BellRing}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          title="Archived"
          value={tab === 'archived' ? archivedCount : '—'}
          subtitle={tab === 'archived' ? 'showing archived' : 'switch to Archived tab'}
          icon={Archive}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <StatCard
          title="Today"
          value={todayCount}
          subtitle="arrived today"
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* ─── Filter bar ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  All
                  {tab === 'all' && totalCount > 0 && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                      {totalCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="gap-1.5">
                  Unread
                  {unreadCount > 0 && (
                    <Badge className="text-[9px] h-4 px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger size="sm" className="w-[140px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {NOTIFICATION_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search title or message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* ─── Notification list ────────────────────────────────────────── */}
          <div
            className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(203 213 225) transparent',
            }}
          >
            {isLoading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </>
            ) : notifications.length === 0 ? (
              <EmptyState tab={tab} hasFilters={typeFilter !== 'all' || categoryFilter !== 'all' || searchDebounced !== ''} />
            ) : (
              <>
                {notifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onRead={(id) => markReadMutation.mutate(id)}
                    onArchive={(id) => archiveMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
                {notifications.length >= 50 && (
                  <p className="text-center text-xs text-muted-foreground py-3">
                    Showing first 50. Refine your filters to see more.
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Preferences dialog ─────────────────────────────────────────────── */}
      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ tab, hasFilters }: { tab: FilterTab; hasFilters: boolean }) {
  const config = {
    all: {
      icon: Bell,
      title: 'No notifications yet',
      desc: 'When leads, jobs, invoices and other events happen, you\'ll see them here.',
    },
    unread: {
      icon: CheckCheck,
      title: 'All caught up!',
      desc: 'You have no unread notifications. Nice work.',
    },
    archived: {
      icon: Archive,
      title: 'Nothing archived',
      desc: 'Archived notifications will appear here when you archive them.',
    },
  }[tab];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="p-4 rounded-full bg-emerald-50 mb-4">
        <Icon className="size-8 text-emerald-600" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{config.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? 'Try clearing your filters to see more notifications.'
          : config.desc}
      </p>
    </div>
  );
}
