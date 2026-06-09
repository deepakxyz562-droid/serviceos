'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
  Search,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Activity,
  BarChart3,
  Timer,
  Zap,
  ArrowRight,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExecutionItem {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowActive: boolean;
  status: 'success' | 'error' | 'running' | 'waiting' | 'cancelled';
  mode: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  triggerType: string;
  executedBy: string;
}

interface NodeDataItem {
  id: string;
  nodeName: string;
  nodeId: string;
  inputJson: string;
  outputJson: string;
  errorJson: string | null;
  durationMs: number | null;
  status: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_EXECUTIONS: ExecutionItem[] = [
  { id: 'ex1', workflowId: 'wf1', workflowName: 'Lead Follow-up Automation', workflowActive: true, status: 'success', mode: 'automatic', startedAt: '2025-03-13T14:30:00Z', finishedAt: '2025-03-13T14:30:02Z', durationMs: 1200, triggerType: 'webhook', executedBy: 'System' },
  { id: 'ex2', workflowId: 'wf2', workflowName: 'Appointment Reminder', workflowActive: true, status: 'success', mode: 'automatic', startedAt: '2025-03-13T08:00:00Z', finishedAt: '2025-03-13T08:00:01Z', durationMs: 800, triggerType: 'schedule', executedBy: 'Cron' },
  { id: 'ex3', workflowId: 'wf3', workflowName: 'Payment Confirmation', workflowActive: true, status: 'error', mode: 'automatic', startedAt: '2025-03-13T07:45:00Z', finishedAt: '2025-03-13T07:45:00Z', durationMs: 300, triggerType: 'webhook', executedBy: 'Stripe' },
  { id: 'ex4', workflowId: 'wf5', workflowName: 'Job Status Notifications', workflowActive: true, status: 'running', mode: 'automatic', startedAt: '2025-03-13T12:30:00Z', finishedAt: null, durationMs: null, triggerType: 'event', executedBy: 'System' },
  { id: 'ex5', workflowId: 'wf1', workflowName: 'Lead Follow-up Automation', workflowActive: true, status: 'success', mode: 'automatic', startedAt: '2025-03-12T16:20:00Z', finishedAt: '2025-03-12T16:20:02Z', durationMs: 1500, triggerType: 'webhook', executedBy: 'System' },
  { id: 'ex6', workflowId: 'wf4', workflowName: 'New Customer Onboarding', workflowActive: false, status: 'cancelled', mode: 'manual', startedAt: '2025-03-12T10:00:00Z', finishedAt: '2025-03-12T10:01:00Z', durationMs: 60000, triggerType: 'manual', executedBy: 'Rajesh Kumar' },
  { id: 'ex7', workflowId: 'wf2', workflowName: 'Appointment Reminder', workflowActive: true, status: 'success', mode: 'automatic', startedAt: '2025-03-12T08:00:00Z', finishedAt: '2025-03-12T08:00:01Z', durationMs: 900, triggerType: 'schedule', executedBy: 'Cron' },
  { id: 'ex8', workflowId: 'wf7', workflowName: 'Escalation Handler', workflowActive: true, status: 'success', mode: 'manual', startedAt: '2025-03-11T15:00:00Z', finishedAt: '2025-03-11T15:00:03Z', durationMs: 2500, triggerType: 'manual', executedBy: 'Priya Patel' },
  { id: 'ex9', workflowId: 'wf5', workflowName: 'Job Status Notifications', workflowActive: true, status: 'success', mode: 'automatic', startedAt: '2025-03-11T11:30:00Z', finishedAt: '2025-03-11T11:30:01Z', durationMs: 1100, triggerType: 'event', executedBy: 'System' },
  { id: 'ex10', workflowId: 'wf3', workflowName: 'Payment Confirmation', workflowActive: true, status: 'success', mode: 'automatic', startedAt: '2025-03-11T09:15:00Z', finishedAt: '2025-03-11T09:15:02Z', durationMs: 1800, triggerType: 'webhook', executedBy: 'Stripe' },
  { id: 'ex11', workflowId: 'wf1', workflowName: 'Lead Follow-up Automation', workflowActive: true, status: 'error', mode: 'automatic', startedAt: '2025-03-10T14:30:00Z', finishedAt: '2025-03-10T14:30:01Z', durationMs: 500, triggerType: 'webhook', executedBy: 'System' },
  { id: 'ex12', workflowId: 'wf6', workflowName: 'Review Collection', workflowActive: false, status: 'waiting', mode: 'automatic', startedAt: '2025-03-10T09:00:00Z', finishedAt: null, durationMs: null, triggerType: 'schedule', executedBy: 'Cron' },
];

const MOCK_NODE_DATA: Record<string, NodeDataItem[]> = {
  'ex1': [
    { id: 'nd1', nodeName: 'Webhook Trigger', nodeId: 'n1', inputJson: '{"leadId":"L123","phone":"+1234567890"}', outputJson: '{"triggered":true}', errorJson: null, durationMs: 50, status: 'success' },
    { id: 'nd2', nodeName: 'Delay 30min', nodeId: 'n2', inputJson: '{"wait":1800000}', outputJson: '{"elapsed":true}', errorJson: null, durationMs: 600000, status: 'success' },
    { id: 'nd3', nodeName: 'Send WhatsApp', nodeId: 'n3', inputJson: '{"to":"+1234567890","message":"Hi!"}', outputJson: '{"messageId":"msg_abc","sent":true}', errorJson: null, durationMs: 350, status: 'success' },
    { id: 'nd4', nodeName: 'Update CRM', nodeId: 'n4', inputJson: '{"leadId":"L123","status":"contacted"}', outputJson: '{"updated":true}', errorJson: null, durationMs: 200, status: 'success' },
  ],
  'ex3': [
    { id: 'nd5', nodeName: 'Stripe Webhook', nodeId: 'n8', inputJson: '{"event":"payment.failed"}', outputJson: '{}', errorJson: null, durationMs: 30, status: 'success' },
    { id: 'nd6', nodeName: 'Update Invoice', nodeId: 'n9', inputJson: '{"invoiceId":"INV-001"}', outputJson: '{}', errorJson: 'Connection timeout: database unreachable after 5000ms', durationMs: 5000, status: 'error' },
  ],
};

// ─── Constants ──────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
  success: { color: 'text-green-600', bgColor: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2, label: 'Success' },
  error: { color: 'text-red-500', bgColor: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle, label: 'Failed' },
  running: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Loader2, label: 'Running' },
  waiting: { color: 'text-gray-400', bgColor: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: Clock, label: 'Waiting' },
  cancelled: { color: 'text-gray-500', bgColor: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: Ban, label: 'Cancelled' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null) {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDateShort(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExecutionsView() {
  const { setCurrentView, setCurrentWorkflowId } = useAppStore();
  const [executions] = useState<ExecutionItem[]>(MOCK_EXECUTIONS);
  const [loading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<ExecutionItem | null>(null);
  const [nodeData, setNodeData] = useState<NodeDataItem[]>([]);

  // Stats
  const stats = {
    total: executions.length,
    successRate: executions.length > 0 ? Math.round(executions.filter(e => e.status === 'success').length / executions.filter(e => ['success', 'error'].includes(e.status)).length * 100) : 0,
    running: executions.filter(e => e.status === 'running').length,
    avgDuration: executions.filter(e => e.durationMs !== null).length > 0
      ? Math.round(executions.filter(e => e.durationMs !== null).reduce((s, e) => s + (e.durationMs || 0), 0) / executions.filter(e => e.durationMs !== null).length)
      : 0,
  };

  const filtered = executions.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search && !e.workflowName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Load execution details when selected
  const openDetail = (exec: ExecutionItem) => {
    setSelectedExecution(exec);
    setNodeData(MOCK_NODE_DATA[exec.id] || []);
  };

  const openWorkflow = (workflowId: string) => {
    setCurrentWorkflowId(workflowId);
    setCurrentView('canvas');
  };

  const handleRetry = (exec: ExecutionItem) => {
    toast.success(`Retrying "${exec.workflowName}" execution...`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Activity className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Executions</h2>
            <p className="text-sm text-muted-foreground">Monitor workflow run history and status</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => toast.success('Execution log refreshed')}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Executions', value: stats.total, icon: Activity, color: 'text-foreground' },
          { label: 'Success Rate', value: `${stats.successRate}%`, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Running Now', value: stats.running, icon: Loader2, color: 'text-amber-600' },
          { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Timer, color: 'text-blue-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="success" className="text-xs">Success</TabsTrigger>
            <TabsTrigger value="error" className="text-xs">Failed</TabsTrigger>
            <TabsTrigger value="running" className="text-xs">Running</TabsTrigger>
            <TabsTrigger value="waiting" className="text-xs">Waiting</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by workflow name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      {/* Executions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead className="hidden sm:table-cell">Trigger</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="hidden md:table-cell">Started</TableHead>
                  <TableHead className="hidden lg:table-cell">Executed By</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((exec) => {
                  const config = statusConfig[exec.status] || statusConfig.waiting;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={exec.id} className="cursor-pointer" onClick={() => openDetail(exec)}>
                      <TableCell>
                        <Badge variant="outline" className={config.bgColor}>
                          <StatusIcon className={`size-3 mr-1 ${exec.status === 'running' ? 'animate-spin' : ''}`} />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{exec.workflowName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{exec.mode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px]">
                          <Zap className="size-3 mr-1" />{exec.triggerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {formatDuration(exec.durationMs)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {formatDateShort(exec.startedAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {exec.executedBy}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {exec.status === 'error' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleRetry(exec); }}>
                              <RefreshCw className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openWorkflow(exec.workflowId); }}>
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <Clock className="size-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No executions found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Execute a workflow to see results here'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Detail Dialog */}
      <Dialog open={!!selectedExecution} onOpenChange={(open) => !open && setSelectedExecution(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Execution Details
              {selectedExecution?.status === 'error' && (
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                  <AlertTriangle className="size-3 mr-1" />Failed
                </Badge>
              )}
              {selectedExecution?.status === 'running' && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <Loader2 className="size-3 mr-1 animate-spin" />Running
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedExecution?.workflowName} — {selectedExecution && formatDate(selectedExecution.startedAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedExecution && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusConfig[selectedExecution.status]?.bgColor || ''}>
                    {statusConfig[selectedExecution.status]?.label || selectedExecution.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mode</p>
                  <p className="text-sm capitalize">{selectedExecution.mode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-mono">{formatDuration(selectedExecution.durationMs)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trigger</p>
                  <div className="flex items-center gap-1">
                    <Zap className="size-3" />
                    <p className="text-sm capitalize">{selectedExecution.triggerType}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Node Timeline */}
              {nodeData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Node-by-Node Execution Log</h4>
                  <div className="space-y-1">
                    {nodeData.map((nd, i) => (
                      <div key={nd.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50">
                        <div className={cn(
                          'flex items-center justify-center size-6 rounded-full border shrink-0',
                          nd.status === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-600' :
                          nd.status === 'error' ? 'bg-red-50 border-red-300 text-red-600' :
                          'bg-muted border-border text-muted-foreground'
                        )}>
                          <span className="text-xs font-mono">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{nd.nodeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {nd.status === 'success' ? '✓ Completed' : nd.status === 'error' ? '✗ Failed' : nd.status}
                          </p>
                          {nd.errorJson && (
                            <p className="text-xs text-red-500 mt-1 truncate">{nd.errorJson}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono text-muted-foreground">
                            {nd.durationMs ? formatDuration(nd.durationMs) : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Data Flow Visualization */}
                  <div className="mt-3">
                    <h4 className="text-sm font-semibold mb-2">Data Flow</h4>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {nodeData.map((nd, i) => (
                        <div key={nd.id} className="flex items-center gap-2">
                          <div className={cn(
                            'p-2 rounded-lg border min-w-[100px] text-center',
                            nd.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                            nd.status === 'error' ? 'bg-red-50 border-red-200' :
                            'bg-muted border-border'
                          )}>
                            <p className="text-[10px] font-medium truncate">{nd.nodeName}</p>
                            <p className="text-[9px] text-muted-foreground">{nd.durationMs ? formatDuration(nd.durationMs) : '-'}</p>
                          </div>
                          {i < nodeData.length - 1 && (
                            <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {nodeData.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No node data available for this execution</p>
                </div>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => openWorkflow(selectedExecution.workflowId)}>
                  <ExternalLink className="size-4 mr-1.5" /> Open Workflow
                </Button>
                {selectedExecution.status === 'error' && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleRetry(selectedExecution)}>
                    <RefreshCw className="size-4 mr-1.5" /> Retry Execution
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
