'use client';

import { useState } from 'react';
import {
  Shield, Search, Download, Eye, Clock, Users,
  FileText, CheckCircle2, XCircle, AlertTriangle,
  Settings, Filter, Globe, Database, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'error' | 'warning';
}

interface WebhookLog {
  id: string;
  url: string;
  method: string;
  status: number;
  duration: string;
  timestamp: string;
}

interface DeliveryLog {
  id: string;
  recipient: string;
  channel: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  messageId: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'al1', action: 'user.login', user: 'sarah@sparkclean.com', target: 'Auth System', timestamp: '2 min ago', ip: '192.168.1.45', status: 'success' },
  { id: 'al2', action: 'campaign.create', user: 'sarah@sparkclean.com', target: 'Spring Cleaning Promo', timestamp: '5 min ago', ip: '192.168.1.45', status: 'success' },
  { id: 'al3', action: 'lead.delete', user: 'mike@sparkclean.com', target: 'Lead #L123', timestamp: '15 min ago', ip: '192.168.1.67', status: 'warning' },
  { id: 'al4', action: 'user.login.failed', user: 'unknown@email.com', target: 'Auth System', timestamp: '20 min ago', ip: '10.0.0.99', status: 'error' },
  { id: 'al5', action: 'job.update', user: 'priya@sparkclean.com', target: 'Job #J456', timestamp: '30 min ago', ip: '192.168.1.89', status: 'success' },
  { id: 'al6', action: 'invoice.create', user: 'sarah@sparkclean.com', target: 'INV-0067', timestamp: '1 hr ago', ip: '192.168.1.45', status: 'success' },
  { id: 'al7', action: 'chatbot.update', user: 'david@sparkclean.com', target: 'Lead Capture Bot', timestamp: '2 hrs ago', ip: '192.168.1.23', status: 'success' },
  { id: 'al8', action: 'segment.delete', user: 'mike@sparkclean.com', target: 'Old Customers Segment', timestamp: '3 hrs ago', ip: '192.168.1.67', status: 'warning' },
];

const MOCK_WEBHOOK_LOGS: WebhookLog[] = [
  { id: 'wl1', url: 'https://api.example.com/webhooks/lead', method: 'POST', status: 200, duration: '120ms', timestamp: '2 min ago' },
  { id: 'wl2', url: 'https://api.example.com/webhooks/job', method: 'POST', status: 500, duration: '3400ms', timestamp: '5 min ago' },
  { id: 'wl3', url: 'https://api.example.com/webhooks/payment', method: 'POST', status: 200, duration: '89ms', timestamp: '10 min ago' },
  { id: 'wl4', url: 'https://api.example.com/webhooks/campaign', method: 'PUT', status: 200, duration: '156ms', timestamp: '30 min ago' },
];

const MOCK_DELIVERY_LOGS: DeliveryLog[] = [
  { id: 'dl1', recipient: '+1 555-0101', channel: 'WhatsApp', status: 'read', timestamp: '2 min ago', messageId: 'wamid_abc123' },
  { id: 'dl2', recipient: '+1 555-0102', channel: 'WhatsApp', status: 'delivered', timestamp: '5 min ago', messageId: 'wamid_def456' },
  { id: 'dl3', recipient: '+1 555-0103', channel: 'SMS', status: 'sent', timestamp: '10 min ago', messageId: 'sms_ghi789' },
  { id: 'dl4', recipient: '+1 555-0104', channel: 'WhatsApp', status: 'failed', timestamp: '15 min ago', messageId: 'wamid_jkl012' },
  { id: 'dl5', recipient: '+1 555-0105', channel: 'Email', status: 'delivered', timestamp: '20 min ago', messageId: 'eml_mno345' },
];

const ROLES = ['Admin', 'Manager', 'Agent', 'Viewer'];
const PERMISSIONS = [
  'View Dashboard', 'Manage Leads', 'Manage Jobs', 'Manage Customers',
  'Send WhatsApp', 'Create Campaigns', 'View Billing', 'Manage Users',
  'View Reports', 'API Access', 'Export Data', 'Manage Chatbots',
];

const ROLE_PERMISSIONS: Record<string, boolean[]> = {
  Admin: [true, true, true, true, true, true, true, true, true, true, true, true],
  Manager: [true, true, true, true, true, true, true, false, true, true, true, true],
  Agent: [true, true, true, true, true, false, false, false, false, false, false, false],
  Viewer: [true, false, false, true, false, false, false, false, true, false, true, false],
};

// ─── Component ──────────────────────────────────────────────────────────────

export function EnterpriseView() {
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [activeTab, setActiveTab] = useState('audit');

  const filteredAuditLogs = MOCK_AUDIT_LOGS.filter(log => {
    if (auditFilter !== 'all' && log.status !== auditFilter) return false;
    if (auditSearch && !log.action.toLowerCase().includes(auditSearch.toLowerCase()) && !log.user.toLowerCase().includes(auditSearch.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      success: 'bg-emerald-100 text-emerald-700',
      error: 'bg-red-100 text-red-700',
      warning: 'bg-amber-100 text-amber-700',
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      read: 'bg-purple-100 text-purple-700',
      failed: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const getHttpStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-600';
    if (status >= 400 && status < 500) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <Shield className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Enterprise</h2>
          <p className="text-sm text-muted-foreground">Security, compliance & admin tools</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="audit" className="text-xs">Audit Logs</TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs">Role Permissions</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs">Agent Monitoring</TabsTrigger>
          <TabsTrigger value="export" className="text-xs">Conversation Export</TabsTrigger>
          <TabsTrigger value="approval" className="text-xs">Campaign Approval</TabsTrigger>
          <TabsTrigger value="retention" className="text-xs">Data Retention</TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs">Webhook Logs</TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs">Delivery Logs</TabsTrigger>
        </TabsList>

        {/* Audit Logs */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder="Search audit logs..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={auditFilter} onValueChange={setAuditFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm"><Download className="size-3 mr-1" /> Export</Button>
              </div>
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{log.action}</TableCell>
                        <TableCell className="text-sm">{log.user}</TableCell>
                        <TableCell className="text-sm">{log.target}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{log.ip}</TableCell>
                        <TableCell><Badge variant="outline" className={`${getStatusBadge(log.status)} text-[10px]`}>{log.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Permissions */}
        <TabsContent value="permissions">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Permission</TableHead>
                      {ROLES.map(role => (
                        <TableHead key={role} className="text-center">{role}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSIONS.map((perm, idx) => (
                      <TableRow key={perm}>
                        <TableCell className="text-sm font-medium">{perm}</TableCell>
                        {ROLES.map(role => (
                          <TableCell key={role} className="text-center">
                            {ROLE_PERMISSIONS[role]?.[idx] ? (
                              <CheckCircle2 className="size-4 text-emerald-600 mx-auto" />
                            ) : (
                              <XCircle className="size-4 text-slate-300 mx-auto" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Monitoring */}
        <TabsContent value="monitoring">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Sarah Johnson', status: 'online', conversations: 8, avgResponse: '2 min', satisfaction: 96 },
              { name: 'Mike Chen', status: 'online', conversations: 5, avgResponse: '4 min', satisfaction: 92 },
              { name: 'Priya Patel', status: 'offline', conversations: 0, avgResponse: '--', satisfaction: 89 },
              { name: 'David Brown', status: 'online', conversations: 12, avgResponse: '3 min', satisfaction: 94 },
              { name: 'Emma Wilson', status: 'break', conversations: 3, avgResponse: '5 min', satisfaction: 91 },
            ].map(agent => (
              <Card key={agent.name}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-medium">{agent.name[0]}</div>
                    <div>
                      <p className="font-medium text-sm">{agent.name}</p>
                      <Badge variant="outline" className={agent.status === 'online' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : agent.status === 'break' ? 'bg-amber-100 text-amber-700 text-[10px]' : 'bg-slate-100 text-slate-600 text-[10px]'}>{agent.status}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-sm font-bold">{agent.conversations}</p><p className="text-[10px] text-muted-foreground">Chats</p></div>
                    <div><p className="text-sm font-bold">{agent.avgResponse}</p><p className="text-[10px] text-muted-foreground">Avg Resp</p></div>
                    <div><p className="text-sm font-bold text-emerald-600">{agent.satisfaction}%</p><p className="text-[10px] text-muted-foreground">CSAT</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Conversation Export */}
        <TabsContent value="export">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4 max-w-md">
                <h3 className="font-medium">Export Conversations</h3>
                <div className="space-y-2">
                  <Select><SelectTrigger><SelectValue placeholder="Date Range" /></SelectTrigger><SelectContent><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="30d">Last 30 days</SelectItem><SelectItem value="90d">Last 90 days</SelectItem><SelectItem value="custom">Custom range</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Select><SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger><SelectContent><SelectItem value="csv">CSV</SelectItem><SelectItem value="json">JSON</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent></Select>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 w-full"><Download className="size-4 mr-1.5" /> Export Conversations</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Approval */}
        <TabsContent value="approval">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { name: 'Spring Promo Campaign', requestedBy: 'Mike Chen', date: '2 hrs ago', status: 'pending' },
                  { name: 'Win-back Inactive', requestedBy: 'Sarah Johnson', date: '1 day ago', status: 'approved' },
                  { name: 'Summer Special', requestedBy: 'Priya Patel', date: '3 days ago', status: 'rejected' },
                ].map(item => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">By {item.requestedBy} • {item.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={item.status === 'approved' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : item.status === 'rejected' ? 'bg-red-100 text-red-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>{item.status}</Badge>
                      {item.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-600">Reject</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Retention */}
        <TabsContent value="retention">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4 max-w-md">
                <h3 className="font-medium">Data Retention Policies</h3>
                {[
                  { label: 'Conversation History', value: '365 days' },
                  { label: 'Audit Logs', value: '730 days' },
                  { label: 'Campaign Data', value: '365 days' },
                  { label: 'Customer Data', value: 'Indefinite' },
                  { label: 'Message Delivery Logs', value: '90 days' },
                  { label: 'Webhook Logs', value: '30 days' },
                ].map(policy => (
                  <div key={policy.label} className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="text-sm">{policy.label}</span>
                    <Badge variant="outline" className="text-[10px]">{policy.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Logs */}
        <TabsContent value="webhooks">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {MOCK_WEBHOOK_LOGS.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono max-w-[200px] truncate">{log.url}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{log.method}</Badge></TableCell>
                        <TableCell className={cn('text-sm font-bold', getHttpStatusColor(log.status))}>{log.status}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.duration}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Logs */}
        <TabsContent value="delivery">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Message ID</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {MOCK_DELIVERY_LOGS.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{log.recipient}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{log.channel}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={`${getStatusBadge(log.status)} text-[10px]`}>{log.status}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.messageId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
