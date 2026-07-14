'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Support Center — tickets, live chats, and customer management across all
// workspaces on the platform.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LifeBuoy, Ticket, Clock, Smile, MessageCircle, Eye, UserPlus,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

import {
  SectionHeader, DemoDataPill, KpiCard, formatDate,
} from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

type Priority = 'High' | 'Medium' | 'Low';
type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

interface TicketRow {
  id: string;
  subject: string;
  workspace: string;
  priority: Priority;
  status: TicketStatus;
  assigned: string;
  updated: string;
}

const TICKETS: TicketRow[] = [
  { id: 'TKT-1042', subject: 'AI assistant returning empty responses', workspace: 'Acme HVAC', priority: 'High', status: 'Open', assigned: 'Unassigned', updated: '2025-01-12T10:24:00Z' },
  { id: 'TKT-1041', subject: 'Invoice PDF not generating for #INV-882', workspace: 'Bella Salon', priority: 'High', status: 'In Progress', assigned: 'Priya N.', updated: '2025-01-12T09:10:00Z' },
  { id: 'TKT-1040', subject: 'Slack integration keeps disconnecting', workspace: 'Northwind Plumbing', priority: 'Medium', status: 'Open', assigned: 'Marcus T.', updated: '2025-01-12T08:42:00Z' },
  { id: 'TKT-1039', subject: 'Custom domain SSL renewal failed', workspace: 'Skyline Roofing', priority: 'High', status: 'In Progress', assigned: 'Priya N.', updated: '2025-01-11T17:55:00Z' },
  { id: 'TKT-1038', subject: 'How do I export my CRM contacts?', workspace: 'GreenLeaf Dental', priority: 'Low', status: 'Resolved', assigned: 'Auto-Bot', updated: '2025-01-11T14:21:00Z' },
  { id: 'TKT-1037', subject: 'Bulk SMS delivery delayed by 20 min', workspace: 'Acme HVAC', priority: 'Medium', status: 'Open', assigned: 'Marcus T.', updated: '2025-01-11T11:08:00Z' },
  { id: 'TKT-1036', subject: 'Marketplace pack failed to install', workspace: 'Urban Pet Care', priority: 'Medium', status: 'Resolved', assigned: 'Priya N.', updated: '2025-01-10T16:40:00Z' },
];

interface ChatRow {
  initials: string;
  name: string;
  workspace: string;
  lastMessage: string;
  color: string;
}

const CHATS: ChatRow[] = [
  { initials: 'JD', name: 'Jane Doe', workspace: 'Acme HVAC', lastMessage: '...is the new technician available today?', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { initials: 'MK', name: 'Mike Klein', workspace: 'Bella Salon', lastMessage: 'Got it, I will resend the invoice now.', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { initials: 'AR', name: 'Aisha Rao', workspace: 'Northwind Plumbing', lastMessage: 'The portal link is broken for my client.', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { initials: 'TL', name: 'Tom Lee', workspace: 'Skyline Roofing', lastMessage: 'Thanks! That resolved the SSL issue.', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
];

interface CustomerRow {
  name: string;
  email: string;
  workspace: string;
  tickets: number;
  csat: number;
  lastContact: string;
}

const CUSTOMERS: CustomerRow[] = [
  { name: 'Jane Doe', email: 'jane@acme.example', workspace: 'Acme HVAC', tickets: 4, csat: 96, lastContact: '2025-01-12T10:24:00Z' },
  { name: 'Mike Klein', email: 'mike@bella.example', workspace: 'Bella Salon', tickets: 2, csat: 92, lastContact: '2025-01-12T09:10:00Z' },
  { name: 'Aisha Rao', email: 'aisha@northwind.example', workspace: 'Northwind Plumbing', tickets: 7, csat: 88, lastContact: '2025-01-12T08:42:00Z' },
  { name: 'Tom Lee', email: 'tom@skyline.example', workspace: 'Skyline Roofing', tickets: 1, csat: 100, lastContact: '2025-01-11T17:55:00Z' },
  { name: 'Sara Park', email: 'sara@greenleaf.example', workspace: 'GreenLeaf Dental', tickets: 3, csat: 94, lastContact: '2025-01-11T14:21:00Z' },
];

const PRIORITY_BADGE: Record<Priority, string> = {
  High: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Low: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
};
const STATUS_BADGE: Record<TicketStatus, string> = {
  Open: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  'In Progress': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SupportCenterSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Support Center"
        description="Tickets, chats, customer management across all workspaces."
        icon={LifeBuoy}
        actions={<DemoDataPill />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Open Tickets" value={47} icon={Ticket} trend={-8} color="emerald" />
        <KpiCard label="Avg Response" value="2.4h" icon={Clock} trend={-18} color="sky" sub="lower is better" />
        <KpiCard label="CSAT" value="94%" icon={Smile} trend={2} color="amber" />
        <KpiCard label="Active Chats" value={12} icon={MessageCircle} trend={3} color="violet" />
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="chats">Live Chats</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        {/* Tickets tab */}
        <TabsContent value="tickets">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Recent Tickets</CardTitle>
              <CardDescription>Support requests across all workspaces.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Subject</TableHead><TableHead>Workspace</TableHead>
                      <TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead>
                      <TableHead>Updated</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TICKETS.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.id}</TableCell>
                        <TableCell className="font-medium max-w-[240px] truncate">{t.subject}</TableCell>
                        <TableCell className="text-muted-foreground">{t.workspace}</TableCell>
                        <TableCell><Badge variant="outline" className={PRIORITY_BADGE[t.priority]}>{t.priority}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={STATUS_BADGE[t.status]}>{t.status}</Badge></TableCell>
                        <TableCell className="text-sm">{t.assigned}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(t.updated)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => toast.info(`Opening ${t.id}`)}><Eye className="size-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => toast.info(`Assigning ${t.id}`)}><UserPlus className="size-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live chats tab */}
        <TabsContent value="chats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHATS.map((c) => (
              <Card key={c.name} className="card-shadow card-hover">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn('size-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0', c.color)}>
                    {c.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{c.workspace}</p>
                    <p className="text-xs text-foreground/80 mt-2 truncate">{c.lastMessage}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => toast.info(`Joining chat with ${c.name}`)}>
                      <MessageCircle className="size-3.5 mr-1.5" />Join Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Customers tab */}
        <TabsContent value="customers">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Customer Contacts</CardTitle>
              <CardDescription>People who have opened tickets across workspaces.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Workspace</TableHead>
                      <TableHead>Tickets</TableHead><TableHead>CSAT</TableHead><TableHead>Last Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CUSTOMERS.map((c) => (
                      <TableRow key={c.email}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.email}</TableCell>
                        <TableCell className="text-muted-foreground">{c.workspace}</TableCell>
                        <TableCell className="font-mono text-xs">{c.tickets}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            <Smile className="size-3.5 text-amber-500" />{c.csat}%
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.lastContact)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
