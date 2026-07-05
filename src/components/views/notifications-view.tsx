'use client';

import { useState } from 'react';
import {
  Bell, MessageSquare, Mail, Smartphone, Search, Filter, Plus,
  CheckCircle2, Clock, Send, Eye, RefreshCw, ArrowUpRight,
  ArrowDownRight, AlertTriangle, Settings, Zap, Globe,
  Settings2, ArrowRight, RotateCcw, FileText, Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ─── Shared StatCard ──────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, bg, trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color: string; bg: string; trend?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.startsWith('+') ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-500" />
                )}
                <span className={cn('text-[10px] font-medium', trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600')}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl', bg)}><Icon className={cn('size-5', color)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── NotificationsView ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

type NotificationChannel = 'WhatsApp' | 'Email' | 'SMS' | 'Push';
type NotificationStatus = 'Pending' | 'Sent' | 'Delivered' | 'Failed';

interface NotificationEntry {
  id: string;
  recipient: string;
  channel: NotificationChannel;
  subject: string;
  status: NotificationStatus;
  timestamp: string;
  retries: number;
}

interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  usage: number;
  lastUsed: string;
}

interface DeliveryLogEntry {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  timestamp: string;
  details: string;
}

const channelConfig: Record<NotificationChannel, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  WhatsApp: { icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  Email: { icon: Mail, color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  SMS: { icon: Smartphone, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  Push: { icon: Bell, color: 'text-violet-500', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
};

const statusColors: Record<NotificationStatus, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Sent: 'bg-blue-100 text-blue-700 border-blue-200',
  Delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Failed: 'bg-red-100 text-red-700 border-red-200',
};

const mockNotifications: NotificationEntry[] = [
  { id: 'n1', recipient: 'Sarah Mitchell', channel: 'WhatsApp', subject: 'Appointment Confirmation - Plumbing', status: 'Delivered', timestamp: '2 min ago', retries: 0 },
  { id: 'n2', recipient: 'James Peterson', channel: 'Email', subject: 'Invoice #INV-2847', status: 'Sent', timestamp: '8 min ago', retries: 0 },
  { id: 'n3', recipient: 'Emily Chen', channel: 'WhatsApp', subject: 'Service Feedback Request', status: 'Delivered', timestamp: '15 min ago', retries: 0 },
  { id: 'n4', recipient: 'Robert Kim', channel: 'SMS', subject: 'Appointment Reminder - HVAC', status: 'Pending', timestamp: '22 min ago', retries: 0 },
  { id: 'n5', recipient: 'Lisa Wang', channel: 'Push', subject: 'Job Update: Technician en route', status: 'Delivered', timestamp: '30 min ago', retries: 0 },
  { id: 'n6', recipient: 'Mark Johnson', channel: 'WhatsApp', subject: 'Quote Follow-up', status: 'Failed', timestamp: '45 min ago', retries: 2 },
  { id: 'n7', recipient: 'Diana Lee', channel: 'Email', subject: 'Monthly Service Report', status: 'Delivered', timestamp: '1 hr ago', retries: 0 },
  { id: 'n8', recipient: 'Carlos Mendez', channel: 'SMS', subject: 'Payment Receipt #RCT-942', status: 'Sent', timestamp: '1.5 hrs ago', retries: 0 },
  { id: 'n9', recipient: 'Ana Rodriguez', channel: 'WhatsApp', subject: 'Schedule Change Notice', status: 'Failed', timestamp: '2 hrs ago', retries: 1 },
  { id: 'n10', recipient: 'Mike Torres', channel: 'Push', subject: 'New Job Assignment', status: 'Delivered', timestamp: '2.5 hrs ago', retries: 0 },
];

const mockTemplates: NotificationTemplate[] = [
  { id: 't1', name: 'Appointment Confirmation', channel: 'WhatsApp', usage: 1240, lastUsed: '2 min ago' },
  { id: 't2', name: 'Service Reminder', channel: 'SMS', usage: 890, lastUsed: '1 hr ago' },
  { id: 't3', name: 'Invoice Generated', channel: 'Email', usage: 2100, lastUsed: '15 min ago' },
  { id: 't4', name: 'Job Status Update', channel: 'Push', usage: 3450, lastUsed: '30 min ago' },
  { id: 't5', name: 'Feedback Request', channel: 'WhatsApp', usage: 678, lastUsed: '3 hrs ago' },
  { id: 't6', name: 'Payment Reminder', channel: 'SMS', usage: 1120, lastUsed: '45 min ago' },
];

const mockDeliveryLog: DeliveryLogEntry[] = [
  { id: 'dl1', notificationId: 'n1', channel: 'WhatsApp', status: 'Delivered', timestamp: '10:42:03 AM', details: 'Delivered to device' },
  { id: 'dl2', notificationId: 'n2', channel: 'Email', status: 'Sent', timestamp: '10:38:15 AM', details: 'Accepted by SMTP server' },
  { id: 'dl3', notificationId: 'n3', channel: 'WhatsApp', status: 'Delivered', timestamp: '10:30:42 AM', details: 'Read receipt confirmed' },
  { id: 'dl4', notificationId: 'n4', channel: 'SMS', status: 'Pending', timestamp: '10:22:18 AM', details: 'Queued for delivery' },
  { id: 'dl5', notificationId: 'n6', channel: 'WhatsApp', status: 'Failed', timestamp: '10:05:33 AM', details: 'Rate limit exceeded, retrying' },
  { id: 'dl6', notificationId: 'n7', channel: 'Email', status: 'Delivered', timestamp: '9:58:11 AM', details: 'Opened by recipient' },
  { id: 'dl7', notificationId: 'n9', channel: 'WhatsApp', status: 'Failed', timestamp: '9:45:27 AM', details: 'Invalid phone number' },
  { id: 'dl8', notificationId: 'n10', channel: 'Push', status: 'Delivered', timestamp: '9:30:00 AM', details: 'Push notification received' },
];

const fallbackChainSteps = [
  { channel: 'WhatsApp' as NotificationChannel, delay: '0 min', description: 'Primary channel - instant delivery' },
  { channel: 'Email' as NotificationChannel, delay: '5 min', description: 'Fallback if WhatsApp undelivered' },
  { channel: 'SMS' as NotificationChannel, delay: '15 min', description: 'Final fallback for critical messages' },
];

export function NotificationsView() {
  const [channelToggles, setChannelToggles] = useState<Record<NotificationChannel, boolean>>({
    WhatsApp: true,
    Email: true,
    SMS: true,
    Push: true,
  });
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<NotificationChannel | 'All'>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<NotificationStatus | 'All'>('All');
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const toggleChannel = (channel: NotificationChannel) => {
    setChannelToggles(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const handleRetry = (id: string) => {
    setRetryingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  };

  const filteredNotifications = mockNotifications.filter(n => {
    if (selectedChannelFilter !== 'All' && n.channel !== selectedChannelFilter) return false;
    if (selectedStatusFilter !== 'All' && n.status !== selectedStatusFilter) return false;
    return true;
  });

  const sentToday = mockNotifications.filter(n => n.status !== 'Pending').length;
  const deliveryRate = mockNotifications.length > 0
    ? ((mockNotifications.filter(n => n.status === 'Delivered').length / mockNotifications.length) * 100).toFixed(1)
    : '0';
  const failedCount = mockNotifications.filter(n => n.status === 'Failed').length;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Bell className="size-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold">Notification Orchestration</h1>
            <p className="text-sm text-muted-foreground">Multi-channel notification management and delivery</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Send className="size-4" />Send Notification
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Sent Today" value={sentToday.toString()} subtitle="of 10 total" icon={Send} color="text-emerald-600" bg="bg-emerald-50" trend="+12%" />
        <StatCard title="Delivery Rate" value={`${deliveryRate}%`} subtitle="Across all channels" icon={CheckCircle2} color="text-teal-600" bg="bg-teal-50" trend="+2.1%" />
        <StatCard title="Failed" value={failedCount.toString()} subtitle="Needs attention" icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Avg Delivery Time" value="1.8s" subtitle="WhatsApp channel" icon={Timer} color="text-green-600" bg="bg-green-50" trend="-0.3s" />
      </div>

      {/* Channel Toggles + Fallback Chain */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Channel Toggles */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Channel Configuration</CardTitle>
            <CardDescription className="text-xs">Enable or disable notification channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(channelToggles) as NotificationChannel[]).map(channel => {
                const config = channelConfig[channel];
                const ChannelIcon = config.icon;
                const isEnabled = channelToggles[channel];
                return (
                  <div key={channel} className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    isEnabled ? config.borderColor : 'border-slate-200 opacity-60'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        <ChannelIcon className={cn('size-4', config.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{channel}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {isEnabled ? 'Active' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleChannel(channel)}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Fallback Chain */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Fallback Chain</CardTitle>
                <CardDescription className="text-xs">Delivery escalation order</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Settings2 className="size-3" />Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fallbackChainSteps.map((step, idx) => {
                const config = channelConfig[step.channel];
                const StepIcon = config.icon;
                return (
                  <div key={idx}>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
                          <StepIcon className={cn('size-3.5', config.color)} />
                        </div>
                        {idx < fallbackChainSteps.length - 1 && (
                          <div className="w-px h-4 bg-muted-foreground/30 my-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{step.channel}</p>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                            {step.delay} delay
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
                      </div>
                    </div>
                    {idx < fallbackChainSteps.length - 1 && (
                      <div className="flex items-center gap-2 ml-[11px] mt-1 mb-1">
                        <ArrowRight className="size-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">Fallback triggers after 2 failed delivery attempts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Queue */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">Notification Queue</CardTitle>
              <CardDescription className="text-xs">{filteredNotifications.length} notifications</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Channel Filter */}
              <div className="flex items-center gap-1">
                {(['All', 'WhatsApp', 'Email', 'SMS', 'Push'] as const).map(ch => (
                  <Button
                    key={ch}
                    size="sm"
                    variant={selectedChannelFilter === ch ? 'default' : 'outline'}
                    className={cn(
                      'h-6 text-[10px] px-2',
                      selectedChannelFilter === ch && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    )}
                    onClick={() => setSelectedChannelFilter(ch)}
                  >
                    {ch}
                  </Button>
                ))}
              </div>
              {/* Status Filter */}
              <div className="flex items-center gap-1">
                {(['All', 'Pending', 'Sent', 'Delivered', 'Failed'] as const).map(st => (
                  <Button
                    key={st}
                    size="sm"
                    variant={selectedStatusFilter === st ? 'default' : 'outline'}
                    className={cn(
                      'h-6 text-[10px] px-2',
                      selectedStatusFilter === st && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    )}
                    onClick={() => setSelectedStatusFilter(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredNotifications.map(notification => {
              const ChannelIcon = channelConfig[notification.channel].icon;
              const isRetrying = retryingIds.has(notification.id);
              return (
                <div key={notification.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('p-1.5 rounded-lg shrink-0', channelConfig[notification.channel].bgColor)}>
                      <ChannelIcon className={cn('size-3.5', channelConfig[notification.channel].color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{notification.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{notification.recipient}</span>
                        <span className="text-[10px] text-muted-foreground">&middot;</span>
                        <span className="text-[10px] text-muted-foreground">{notification.timestamp}</span>
                        {notification.retries > 0 && (
                          <>
                            <span className="text-[10px] text-muted-foreground">&middot;</span>
                            <span className="text-[10px] text-amber-600">{notification.retries} retries</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn('text-[9px]', statusColors[notification.status])}>
                      {notification.status}
                    </Badge>
                    {notification.status === 'Failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] gap-1 px-2"
                        onClick={() => handleRetry(notification.id)}
                        disabled={isRetrying}
                      >
                        {isRetrying ? (
                          <><RefreshCw className="size-2.5 animate-spin" />Retrying</>
                        ) : (
                          <><RotateCcw className="size-2.5" />Retry</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredNotifications.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications match the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates + Delivery Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Templates */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Notification Templates</CardTitle>
                <CardDescription className="text-xs">{mockTemplates.length} templates available</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <FileText className="size-3" />Create
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {mockTemplates.map(template => {
                const config = channelConfig[template.channel];
                const TemplateIcon = config.icon;
                return (
                  <div key={template.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
                        <TemplateIcon className={cn('size-3.5', config.color)} />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{template.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{template.channel}</span>
                          <span className="text-[10px] text-muted-foreground">&middot;</span>
                          <span className="text-[10px] text-muted-foreground">{template.usage.toLocaleString()} uses</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Last: {template.lastUsed}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Log */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Delivery Log</CardTitle>
                <CardDescription className="text-xs">Real-time delivery events</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Globe className="size-3" />Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {mockDeliveryLog.map(log => {
                const config = channelConfig[log.channel];
                const LogIcon = config.icon;
                return (
                  <div key={log.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <LogIcon className={cn('size-3.5 shrink-0', config.color)} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium truncate">{log.details}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-muted-foreground">{log.timestamp}</span>
                          <span className="text-[9px] text-muted-foreground">&middot;</span>
                          <span className="text-[9px] text-muted-foreground">ID: {log.notificationId}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] shrink-0', statusColors[log.status])}>
                      {log.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
