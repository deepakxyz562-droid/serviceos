'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Announcements — compose and review platform-wide announcements delivered to
// all workspaces. Tracks send volume, open rate, and scheduled sends.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  Megaphone, Send, MailOpen, Clock, Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import { SectionHeader, DemoDataPill, formatDate } from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

type AnnouncementType = 'Info' | 'Warning' | 'Maintenance' | 'Feature';

interface RecentRow {
  subject: string;
  type: AnnouncementType;
  audience: string;
  sent: string;
  openRate: number;
  status: 'Sent' | 'Scheduled';
}

const RECENT: RecentRow[] = [
  { subject: 'Q1 product roundup: AI Center is live', type: 'Feature', audience: 'All Workspaces', sent: '2025-01-10T09:00:00Z', openRate: 72, status: 'Sent' },
  { subject: 'Scheduled maintenance: Jan 18, 02:00 UTC', type: 'Maintenance', audience: 'All Workspaces', sent: '2025-01-09T14:00:00Z', openRate: 64, status: 'Sent' },
  { subject: 'New Stripe webhook signing keys', type: 'Warning', audience: 'Growth plan+', sent: '2025-01-08T11:30:00Z', openRate: 58, status: 'Sent' },
  { subject: 'Marketplace now supports HVAC packs', type: 'Feature', audience: 'Industry: HVAC', sent: '2025-01-12T08:00:00Z', openRate: 81, status: 'Sent' },
  { subject: 'API rate limit increase rolling out', type: 'Info', audience: 'Starter plan+', sent: '2025-01-13T10:00:00Z', openRate: 0, status: 'Scheduled' },
];

interface StatItem { label: string; value: string; icon: LucideIcon; color: string; }

const STATS: StatItem[] = [
  { label: 'Total Sent', value: '84', icon: Send, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { label: 'Avg Open Rate', value: '67%', icon: MailOpen, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { label: 'Scheduled', value: '3', icon: Clock, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
];

const TYPE_BADGE: Record<AnnouncementType, string> = {
  Info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  Warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Maintenance: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  Feature: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AnnouncementsSection() {
  const [audience, setAudience] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<string>('Info');

  function sendNow() {
    if (!subject.trim()) { toast.error('Add a subject before sending'); return; }
    toast.success('Announcement sent to 247 workspaces');
    setSubject(''); setBody('');
  }
  function schedule() {
    if (!subject.trim()) { toast.error('Add a subject before scheduling'); return; }
    toast.success('Announcement scheduled');
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Announcements"
        description="Send platform-wide announcements to all workspaces."
        icon={Megaphone}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Opening announcement editor')}>
              <Plus className="size-4 mr-1.5" />New Announcement
            </Button>
            <DemoDataPill />
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map((s) => (
          <Card key={s.label} className="card-shadow">
            <CardContent className="p-4 sm:p-5 flex items-center gap-4">
              <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', s.color)}>
                <s.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compose */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Compose Announcement</CardTitle>
          <CardDescription>Reaches all workspaces matching the audience below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  <SelectItem value="plan">Specific Plan</SelectItem>
                  <SelectItem value="industry">Specific Industry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Info', 'Warning', 'Maintenance', 'Feature'] as AnnouncementType[]).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-subject">Subject</Label>
            <Input id="ann-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this announcement about?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-body">Body</Label>
            <Textarea id="ann-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the announcement copy. Markdown is supported." />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={sendNow}><Send className="size-4 mr-2" />Send Now</Button>
            <Button variant="outline" onClick={schedule}><Clock className="size-4 mr-2" />Schedule</Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent announcements */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Recent Announcements</CardTitle>
          <CardDescription>Sent and scheduled platform-wide announcements.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Audience</TableHead>
                  <TableHead>Sent</TableHead><TableHead className="w-[180px]">Open Rate</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT.map((r) => (
                  <TableRow key={r.subject}>
                    <TableCell className="font-medium max-w-[280px] truncate">{r.subject}</TableCell>
                    <TableCell><Badge variant="outline" className={TYPE_BADGE[r.type]}>{r.type}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.audience}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.sent)}</TableCell>
                    <TableCell>
                      {r.status === 'Scheduled' ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Progress value={r.openRate} className="h-1.5 w-24" />
                          <span className="text-xs font-mono text-muted-foreground w-9">{r.openRate}%</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.status === 'Sent'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
