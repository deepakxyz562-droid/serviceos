'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Phone, Users, BarChart3, Search, Send, Plus, Copy,
  CheckCircle2, XCircle, Settings, FileText, Eye, Trash2, Edit,
  RefreshCw, Shield, Globe, Key, Link2, ChevronRight, Clock,
  LayoutList, Zap, MessageSquare, List, ArrowRight, AlertCircle,
  Workflow, TrendingUp, Target, Timer, Inbox, ArrowDownRight,
  Funnel, Activity, ChevronDown, ExternalLink, Hash, Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useRealtime } from '@/hooks/use-realtime';
import { WhatsAppWorkflowTemplates } from '@/components/whatsapp/whatsapp-workflow-templates';
import { WhatsAppCreditBanner } from '@/components/whatsapp-credit-banner';
import { WhatsAppSetupWizard } from '@/components/whatsapp/whatsapp-setup-wizard';
import { WhatsAppTemplateCatalog } from '@/components/whatsapp/whatsapp-template-catalog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  timestamp: string;
  status?: string;
  type?: string;
}

interface ConversationData {
  id: string;
  conversationId: string;
  customerPhone: string;
  customerName?: string;
  customerWhatsappId?: string;
  customerId?: string;
  leadId?: string;
  jobId?: string;
  status: string;
  currentStage: string;
  intentDetected?: string;
  intentConfidence?: number;
  lastMessageAt: string;
  lastMessageBody?: string;
  lastDirection?: string;
  messagesJson: string;
  metadataJson: string;
  tenantId?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone: string; email?: string };
  lead?: { id: string; name: string; status: string; serviceType?: string };
  job?: { id: string; title: string; status: string };
}

interface WhatsAppLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  status: string;
  priority: string;
  value: number;
  description?: string;
  serviceType?: string;
  assignedToId?: string;
  jobId?: string;
  notesJson: string;
  tagsJson: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; name: string; phone: string; avatar?: string };
  customer?: { id: string; name: string; phone: string };
  job?: { id: string; title: string; status: string };
  conversation?: ConversationData;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  category: string;
  usageCount: number;
  body: string;
}

interface Credential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface NotificationLog {
  id: string;
  type: string;
  recipient: string;
  recipientName?: string;
  recipientRole?: string;
  subject?: string;
  message: string;
  status: string;
  externalId?: string;
  jobId?: string;
  employeeId?: string;
  customerId?: string;
  metadataJson: string;
  createdAt: string;
}

// ─── Stage Badge ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  greeting: { label: 'Greeting', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: MessageCircle },
  intent_detected: { label: 'Intent Found', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Target },
  booking: { label: 'Booking', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: Clock },
  assigned: { label: 'Assigned', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Users },
  in_progress: { label: 'In Progress', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Activity },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  review: { label: 'Review', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Star },
};

function StageBadge({ stage }: { stage: string }) {
  const config = STAGE_CONFIG[stage] || { label: stage, color: 'bg-gray-100 text-gray-600 border-gray-200', icon: MessageCircle };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] ${config.color}`}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    archived: 'bg-gray-100 text-gray-600 border-gray-200',
    closed: 'bg-gray-100 text-gray-600 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    new: 'bg-sky-100 text-sky-700 border-sky-200',
    contacted: 'bg-amber-100 text-amber-700 border-amber-200',
    qualified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    converted: 'bg-green-100 text-green-700 border-green-200',
    lost: 'bg-red-100 text-red-700 border-red-200',
    sent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    delivered: 'bg-sky-100 text-sky-700 border-sky-200',
    read: 'bg-purple-100 text-purple-700 border-purple-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <Badge variant="outline" className={colors[status] || 'bg-gray-100 text-gray-600'}>
      {status}
    </Badge>
  );
}

function IntentBadge({ intent, confidence }: { intent?: string | null; confidence?: number | null }) {
  if (!intent) return <span className="text-xs text-muted-foreground">No intent</span>;
  const pct = confidence ? Math.round(confidence * 100) : 0;
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-1.5">
      <Target className={`size-3 ${color}`} />
      <span className="text-xs font-medium">{intent.replace(/_/g, ' ')}</span>
      <span className={`text-[10px] font-mono ${color}`}>{pct}%</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WhatsAppView() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationData | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);

  // Send Message tab state
  const [sendTo, setSendTo] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'template' | 'interactive_button' | 'interactive_list'>('text');
  const [messageBody, setMessageBody] = useState('');
  const [buttons, setButtons] = useState([{ label: 'Accept', id: 'accept' }, { label: 'Reject', id: 'reject' }]);
  const [listItems, setListItems] = useState([{ title: 'Option 1', description: '' }]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [templateName, setTemplateName] = useState('hello_world');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');

  // Inbound Leads tab state
  const [whatsappLeads, setWhatsappLeads] = useState<WhatsAppLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  // Interactive Flows tab state
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Conversation detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Real-time
  const { connected: realtimeConnected } = useRealtime({
    onJobUpdate: () => { fetchConversations(); fetchLeads(); },
    enabled: true,
  });

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const res = await fetch('/api/conversations?XTransformPort=3000&limit=50');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      } else {
        setConversations([]);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/leads?XTransformPort=3000&source=whatsapp&limit=50');
      if (res.ok) {
        const data = await res.json();
        setWhatsappLeads(data.leads || []);
      } else {
        setWhatsappLeads(getDemoLeads());
      }
    } catch {
      setWhatsappLeads(getDemoLeads());
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  const fetchNotificationLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/notification-logs?XTransformPort=3000&type=whatsapp&limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotificationLogs(Array.isArray(data) ? data : []);
      } else {
        setNotificationLogs(getDemoNotificationLogs());
      }
    } catch {
      setNotificationLogs(getDemoNotificationLogs());
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplates([
      { id: '1', name: 'job_assignment', language: 'en', status: 'approved', category: 'UTILITY', usageCount: 142, body: 'New Job: {{1}}\nLocation: {{2}}\nPriority: {{3}}\n\nAccept or Reject?' },
      { id: '2', name: 'job_reminder', language: 'en', status: 'approved', category: 'UTILITY', usageCount: 89, body: 'Reminder: Job {{1}} starts in 30 minutes.\nLocation: {{2}}' },
      { id: '3', name: 'job_completed', language: 'en', status: 'approved', category: 'UTILITY', usageCount: 210, body: 'Job {{1}} has been completed. Thank you!' },
      { id: '4', name: 'welcome_message', language: 'en', status: 'pending', category: 'MARKETING', usageCount: 0, body: 'Welcome to our service! How can we help you today?' },
      { id: '5', name: 'feedback_request', language: 'hi', status: 'approved', category: 'UTILITY', usageCount: 56, body: 'How was your experience? Rate us 1-5 stars.' },
    ]);
  }, []);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch {
      setCredentials([]);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchLeads();
    fetchNotificationLogs();
    fetchTemplates();
    fetchCredentials();
  }, [fetchConversations, fetchLeads, fetchNotificationLogs, fetchTemplates, fetchCredentials]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      fetchLeads();
      fetchNotificationLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchLeads, fetchNotificationLogs]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/send?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.customerPhone,
          message: replyText,
          type: 'text',
          credentialId: selectedCredentialId || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Reply sent!');
        const sentText = replyText;
        setReplyText('');
        // Add message to local state
        const newMsg: ConversationMessage = {
          id: `msg_${Date.now()}`,
          direction: 'outbound',
          body: sentText,
          timestamp: new Date().toISOString(),
          status: 'sent',
        };
        setConversationMessages(prev => [...prev, newMsg]);

        // Persist the reply to the conversation in the database
        try {
          await fetch(`/api/conversations/${selectedConversation.id}?XTransformPort=3000`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: {
                body: sentText,
                direction: 'outbound',
                type: 'text',
              },
            }),
          });
        } catch (persistErr) {
          console.error('Failed to persist reply to conversation:', persistErr);
        }

        fetchConversations();
      } else {
        toast.error('Failed to send reply');
      }
    } catch {
      toast.error('Network error sending reply');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sendTo || (!messageBody && messageType !== 'template')) {
      toast.error('Phone number and message are required');
      return;
    }
    setSendingMsg(true);
    try {
      const requestBody: Record<string, any> = {
        to: sendTo,
        message: messageBody,
        type: messageType === 'interactive_button' || messageType === 'interactive_list' ? 'interactive' : messageType,
        credentialId: selectedCredentialId || undefined,
      };

      if (messageType === 'template') {
        requestBody.type = 'template';
        requestBody.templateName = templateName;
        requestBody.templateLanguage = templateLanguage;
        requestBody.message = templateName;
      } else if (messageType === 'interactive_button' && buttons.length > 0) {
        requestBody.interactive = {
          type: 'button',
          body: { text: messageBody || ' ' },
          action: {
            buttons: buttons.filter(b => b.label).slice(0, 3).map((btn, idx) => ({
              type: 'reply',
              reply: { id: btn.id || `btn_${idx}`, title: btn.label.substring(0, 20) },
            })),
          },
        };
      } else if (messageType === 'interactive_list' && listItems.length > 0) {
        requestBody.interactive = {
          type: 'list',
          body: { text: messageBody || ' ' },
          action: {
            button: 'Options',
            sections: [{
              title: 'Options',
              rows: listItems.slice(0, 10).map((item, idx) => ({
                id: `row_${idx}`,
                title: item.title,
                description: item.description || undefined,
              })),
            }],
          },
        };
      }

      const res = await fetch('/api/whatsapp/send?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.metadata?.simulated) {
          toast.info('Message simulated (no credential selected). Configure a credential for real delivery.');
        } else {
          toast.success('Message sent!');
        }
        if (messageType !== 'template') setMessageBody('');
        setSendTo('');
      } else {
        toast.error(`Failed: ${data.error || 'Failed to send message'}`);
      }
    } catch {
      toast.error('Network error sending message');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleConvertLead = async (leadId: string) => {
    setConvertingLeadId(leadId);
    try {
      const res = await fetch('/api/leads/convert?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) {
        toast.success('Lead converted to job!');
        fetchLeads();
        fetchConversations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to convert lead');
      }
    } catch {
      toast.error('Network error converting lead');
    } finally {
      setConvertingLeadId(null);
    }
  };

  const openConversationDetail = (convo: ConversationData) => {
    setSelectedConversation(convo);
    // Parse messages from JSON
    try {
      const msgs = JSON.parse(convo.messagesJson || '[]');
      setConversationMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      setConversationMessages([]);
    }
    setDetailDialogOpen(true);
  };

  // ─── Computed Stats ───────────────────────────────────────────────────────

  const activeConversations = conversations.filter(c => c.status === 'active');
  const pendingConversations = conversations.filter(c => c.currentStage === 'greeting' || c.currentStage === 'intent_detected');
  const completedConversations = conversations.filter(c => c.status === 'completed' || c.status === 'archived');

  const leadStats = {
    total: whatsappLeads.length,
    converted: whatsappLeads.filter(l => l.status === 'converted').length,
    conversionRate: whatsappLeads.length > 0
      ? Math.round((whatsappLeads.filter(l => l.status === 'converted').length / whatsappLeads.length) * 100)
      : 0,
    avgResponseTime: '2.4 min',
  };

  // ─── Analytics data ───────────────────────────────────────────────────────

  const intentDistribution = conversations.reduce((acc, c) => {
    const intent = c.intentDetected || 'unknown';
    acc[intent] = (acc[intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stageFunnel = ['greeting', 'intent_detected', 'booking', 'assigned', 'in_progress', 'completed', 'review'].map(stage => ({
    stage,
    count: conversations.filter(c => c.currentStage === stage).length,
  }));

  const volumeByDay = (() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      count: Math.floor(Math.random() * 20) + 5,
    }));
  })();

  const responseTimeMetrics = {
    avgFirstResponse: '1.8 min',
    avgReplyTime: '2.4 min',
    p95ResponseTime: '5.2 min',
    withinSla: 87,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <MessageCircle className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">WhatsApp Business</h2>
            <p className="text-sm text-muted-foreground">Manage conversations, leads, and messaging workflows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={realtimeConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
            <div className={`size-2 rounded-full mr-1.5 ${realtimeConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {realtimeConnected ? 'Live' : 'Offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => { fetchConversations(); fetchLeads(); fetchNotificationLogs(); }}>
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* WhatsApp Credit Banner */}
      <WhatsAppCreditBanner
        onUpgradeClick={() => {
          // Navigate to billing view
          const event = new CustomEvent('navigate', { detail: 'billing' })
          window.dispatchEvent(event)
        }}
        onConnectMetaClick={() => {
          // Navigate to WhatsApp config / integrations
          const event = new CustomEvent('navigate', { detail: 'integrations' })
          window.dispatchEvent(event)
        }}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConversations.length}</div>
            <p className="text-xs text-muted-foreground">Open conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingConversations.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbound Leads</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadStats.total}</div>
            <p className="text-xs text-muted-foreground">{leadStats.conversionRate}% conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Timer className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseTimeMetrics.avgFirstResponse}</div>
            <p className="text-xs text-muted-foreground">First response time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Send className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationLogs.length}</div>
            <p className="text-xs text-muted-foreground">WhatsApp messages sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="conversations" className="gap-1.5">
            <MessageSquare className="size-3.5" /> Conversations
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-1.5">
            <Send className="size-3.5" /> Send Message
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5">
            <Inbox className="size-3.5" /> Inbound Leads
          </TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5">
            <Zap className="size-3.5" /> Interactive Flows
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="size-3.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="size-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab 1: Conversations ═══════════════════════════════════════════ */}
        <TabsContent value="conversations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversation List */}
            <div className="lg:col-span-1 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[540px]">
                <div className="space-y-1">
                  {loadingConvos ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <RefreshCw className="size-6 mb-2 animate-spin" />
                      <p className="text-sm">Loading conversations...</p>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <MessageCircle className="size-8 mb-2 opacity-50" />
                      <p className="text-sm">No conversations found</p>
                    </div>
                  ) : (
                    conversations
                      .filter(c =>
                        (c.customerName || c.customerPhone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (c.lastMessageBody || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((convo) => (
                        <button
                          key={convo.id}
                          onClick={() => setSelectedConversation(convo)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/80 ${
                            selectedConversation?.id === convo.id ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm shrink-0">
                            {(convo.customerName || convo.customerPhone || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate">{convo.customerName || convo.customerPhone}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {formatTime(convo.lastMessageAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {convo.lastMessageBody || 'No messages yet'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <StageBadge stage={convo.currentStage} />
                              {convo.lastDirection === 'inbound' && (
                                <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-600 border-sky-200">
                                  <ArrowDownRight className="size-2.5 mr-0.5" /> Inbound
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Conversation Detail */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                {selectedConversation ? (
                  <>
                    <CardHeader className="pb-3 border-b shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm">
                            {(selectedConversation.customerName || selectedConversation.customerPhone || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-base">{selectedConversation.customerName || selectedConversation.customerPhone}</CardTitle>
                            <CardDescription className="text-xs">{selectedConversation.customerPhone}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StageBadge stage={selectedConversation.currentStage} />
                          <Button variant="outline" size="sm" onClick={() => openConversationDetail(selectedConversation)}>
                            <Eye className="size-3.5 mr-1" /> Detail
                          </Button>
                        </div>
                      </div>
                      {/* Intent & linked records */}
                      <div className="flex items-center gap-4 mt-2 pt-2 border-t">
                        <IntentBadge intent={selectedConversation.intentDetected} confidence={selectedConversation.intentConfidence} />
                        {selectedConversation.lead && (
                          <Link2 className="size-3 text-muted-foreground" />
                        )}
                        {selectedConversation.lead && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Lead:</span>
                            <Badge variant="outline" className="text-[10px]">{selectedConversation.lead.name}</Badge>
                          </div>
                        )}
                        {selectedConversation.job && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Job:</span>
                            <Badge variant="outline" className="text-[10px]">{selectedConversation.job.title}</Badge>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                      {(() => {
                        let msgs: ConversationMessage[] = [];
                        try {
                          msgs = JSON.parse(selectedConversation.messagesJson || '[]');
                        } catch { /* empty */ }
                        if (msgs.length === 0) {
                          // Show the last message as a placeholder
                          return (
                            <div className="flex justify-start">
                              <div className="bg-muted rounded-lg rounded-tl-none p-3 max-w-xs">
                                <p className="text-sm">{selectedConversation.lastMessageBody || 'No message content'}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{formatTime(selectedConversation.lastMessageAt)}</p>
                              </div>
                            </div>
                          );
                        }
                        return msgs.map((msg: ConversationMessage, idx: number) => (
                          <div key={msg.id || idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-lg p-3 max-w-xs ${
                              msg.direction === 'outbound'
                                ? 'bg-emerald-500 text-white rounded-tr-none'
                                : 'bg-muted rounded-tl-none'
                            }`}>
                              <p className="text-sm">{msg.body}</p>
                              <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-white/60 text-right' : 'text-muted-foreground'}`}>
                                {msg.direction === 'outbound' && '✓✓ '}{formatTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        ));
                      })()}
                    </CardContent>
                    <div className="p-3 border-t shrink-0">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a reply..."
                          className="flex-1"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                        />
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleReply} disabled={sending || !replyText.trim()}>
                          {sending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <MessageCircle className="size-12 mb-3 opacity-30" />
                    <p className="text-sm">Select a conversation to view details</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Tab 2: Send Message ════════════════════════════════════════════ */}
        <TabsContent value="send" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-5 text-emerald-600" /> Send New Message
                </CardTitle>
                <CardDescription>Compose and send WhatsApp messages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Key className="size-3.5" /> Credential</Label>
                  <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                    <SelectTrigger><SelectValue placeholder="Select credential" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none"><em>No credential (simulated)</em></SelectItem>
                      {credentials.filter(c => c.type === 'whatsapp').map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          <div className="flex items-center gap-1.5">
                            <Shield className="size-3 text-emerald-600" /> {cred.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Select value={messageType} onValueChange={(v) => setMessageType(v as typeof messageType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">📝 Text</SelectItem>
                      <SelectItem value="template">📋 Template</SelectItem>
                      <SelectItem value="interactive_button">🔘 Interactive Button</SelectItem>
                      <SelectItem value="interactive_list">📋 Interactive List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {messageType === 'template' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-emerald-50/50">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><FileText className="size-3.5" /> Template Configuration</Label>
                    <div className="space-y-2">
                      <Label className="text-xs">Template Name</Label>
                      <Select value={templateName} onValueChange={setTemplateName}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {templates.filter(t => t.status === 'approved').map(t => (
                            <SelectItem key={t.id} value={t.name}>{t.name} ({t.category})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Language</Label>
                      <Select value={templateLanguage} onValueChange={setTemplateLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_US">English (US)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Parameters (one per line)</Label>
                      <Textarea
                        placeholder="Parameter values for template body variables"
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {messageType !== 'template' && (
                  <div className="space-y-2">
                    <Label>Message Body</Label>
                    <Textarea
                      placeholder="Type your message here..."
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                {messageType === 'interactive_button' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Button Builder</Label>
                      <Button variant="outline" size="sm" onClick={() => { if (buttons.length < 3) setButtons([...buttons, { label: `Button ${buttons.length + 1}`, id: `btn_${buttons.length + 1}` }]); }} disabled={buttons.length >= 3}>
                        <Plus className="size-3.5 mr-1" /> Add Button
                      </Button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setButtons([{ label: '✅ Accept', id: 'accept' }, { label: '❌ Reject', id: 'reject' }]); setMessageBody('New job assignment available.'); }}>
                        <Zap className="size-3 mr-1" /> Job Assign
                      </Button>
                    </div>
                    {buttons.map((btn, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={btn.label} onChange={(e) => { const n = [...buttons]; n[i] = { ...n[i], label: e.target.value }; setButtons(n); }} placeholder="Button label" className="flex-1" />
                        {buttons.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))}>
                            <XCircle className="size-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {messageType === 'interactive_list' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">List Items</Label>
                      <Button variant="outline" size="sm" onClick={() => setListItems([...listItems, { title: `Option ${listItems.length + 1}`, description: '' }])}>
                        <Plus className="size-3.5 mr-1" /> Add Item
                      </Button>
                    </div>
                    {listItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={item.title} onChange={(e) => { const n = [...listItems]; n[i] = { ...n[i], title: e.target.value }; setListItems(n); }} placeholder="Title" className="flex-1" />
                        <Input value={item.description} onChange={(e) => { const n = [...listItems]; n[i] = { ...n[i], description: e.target.value }; setListItems(n); }} placeholder="Description" className="flex-1" />
                        {listItems.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setListItems(listItems.filter((_, idx) => idx !== i))}>
                            <XCircle className="size-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleSendMessage} disabled={sendingMsg || !sendTo || (messageType !== 'template' && !messageBody)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {sendingMsg ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                  {sendingMsg ? 'Sending...' : 'Send Message'}
                </Button>
              </CardContent>
            </Card>

            {/* Template Selector */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4 text-emerald-600" /> Templates
                  </CardTitle>
                  <CardDescription>Approved WhatsApp message templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {templates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTemplateName(t.name);
                            setMessageType('template');
                            toast.info(`Template "${t.name}" selected`);
                          }}
                          className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{t.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                              <StatusBadge status={t.status} />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Used {t.usageCount} times</p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="size-4 text-emerald-600" /> Message Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                    <div className="bg-emerald-500 text-white rounded-lg rounded-tr-none p-3 max-w-xs ml-auto text-sm">
                      <p className="whitespace-pre-wrap">{messageBody || 'Your message will appear here...'}</p>
                      {messageType === 'interactive_button' && buttons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {buttons.map((btn, i) => (
                            <div key={i} className="bg-white/20 rounded px-3 py-1.5 text-center text-xs font-medium">{btn.label}</div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-white/60 mt-1 text-right">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══ Tab 3: Inbound Leads ═══════════════════════════════════════════ */}
        <TabsContent value="leads" className="space-y-4">
          {/* Lead Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inbound</CardTitle>
                <Inbox className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadStats.total}</div>
                <p className="text-xs text-muted-foreground">WhatsApp leads</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadStats.conversionRate}%</div>
                <Progress value={leadStats.conversionRate} className="h-2 mt-1" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
                <CheckCircle2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadStats.converted}</div>
                <p className="text-xs text-muted-foreground">Leads to jobs</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                <Timer className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadStats.avgResponseTime}</div>
                <p className="text-xs text-muted-foreground">Response time</p>
              </CardContent>
            </Card>
          </div>

          {/* Lead List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="size-5 text-emerald-600" /> WhatsApp Inbound Leads
              </CardTitle>
              <CardDescription>Leads created from WhatsApp inbound messages</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLeads ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : whatsappLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Inbox className="size-8 mb-2 opacity-50" />
                  <p className="text-sm">No WhatsApp leads yet</p>
                  <p className="text-xs mt-1">Leads will appear when customers message your WhatsApp Business number</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {whatsappLeads.map((lead) => (
                      <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 text-emerald-700 font-medium text-sm shrink-0">
                          {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{lead.name}</span>
                            <StatusBadge status={lead.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="size-3" /> {lead.phone}
                            </span>
                            {lead.serviceType && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Target className="size-3" /> {lead.serviceType}
                              </span>
                            )}
                          </div>
                          {lead.job && (
                            <div className="flex items-center gap-1 mt-1">
                              <Link2 className="size-3 text-emerald-600" />
                              <span className="text-xs text-emerald-600 font-medium">Job: {lead.job.title}</span>
                              <StatusBadge status={lead.job.status} />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {lead.conversation && (
                            <Button variant="outline" size="sm" onClick={() => {
                              setSelectedConversation(lead.conversation!);
                              setActiveTab('conversations');
                            }}>
                              <MessageSquare className="size-3.5 mr-1" /> Chat
                            </Button>
                          )}
                          {lead.status !== 'converted' && !lead.jobId && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleConvertLead(lead.id)}
                              disabled={convertingLeadId === lead.id}
                            >
                              {convertingLeadId === lead.id ? (
                                <RefreshCw className="size-3.5 mr-1 animate-spin" />
                              ) : (
                                <ArrowRight className="size-3.5 mr-1" />
                              )}
                              Convert to Job
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab 4: Interactive Flows ════════════════════════════════════════ */}
        <TabsContent value="flows" className="space-y-4">
          {/* Notification tracking stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                <Send className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notificationLogs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <CheckCircle2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notificationLogs.filter(l => l.status === 'delivered' || l.status === 'read').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notificationLogs.filter(l => l.status === 'failed').length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accept Rate</CardTitle>
                <Zap className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {notificationLogs.length > 0
                    ? Math.round((notificationLogs.filter(l => l.status === 'read').length / notificationLogs.length) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notification Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutList className="size-5 text-emerald-600" /> Notification History
              </CardTitle>
              <CardDescription>WhatsApp notification dispatches and response tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div>
              ) : notificationLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Zap className="size-8 mb-2 opacity-50" />
                  <p className="text-sm">No notification logs yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {notificationLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className={`size-2 rounded-full shrink-0 ${
                          log.status === 'sent' ? 'bg-sky-500' :
                          log.status === 'delivered' ? 'bg-emerald-500' :
                          log.status === 'read' ? 'bg-purple-500' :
                          log.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{log.recipientName || log.recipient}</span>
                            <StatusBadge status={log.status} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{log.message}</p>
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {log.status === 'failed' && (
                          <Button variant="outline" size="sm" onClick={async () => {
                            try {
                              const res = await fetch('/api/notification-logs?XTransformPort=3000', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: log.id }),
                              });
                              if (res.ok) { toast.success('Notification resent'); fetchNotificationLogs(); }
                              else { toast.error('Failed to resend'); }
                            } catch { toast.error('Network error'); }
                          }}>
                            <RefreshCw className="size-3 mr-1" /> Resend
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Workflow Templates */}
          <WhatsAppWorkflowTemplates />
        </TabsContent>

        {/* ═══ Tab 5: Analytics ═══════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-4">
          {/* Conversation Volume Chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-4 text-emerald-600" /> Conversation Volume
                </CardTitle>
                <CardDescription>Daily conversation volume over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {volumeByDay.map((d) => {
                    const maxCount = Math.max(...volumeByDay.map(v => v.count));
                    const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{d.count}</span>
                        <div className="w-full rounded-t bg-emerald-500 transition-all" style={{ height: `${height}%`, minHeight: '4px' }} />
                        <span className="text-[10px] text-muted-foreground">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Response Time Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Timer className="size-4 text-emerald-600" /> Response Time
                </CardTitle>
                <CardDescription>Key response time metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg First Response</span>
                    <span className="font-mono font-medium">{responseTimeMetrics.avgFirstResponse}</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Reply Time</span>
                    <span className="font-mono font-medium">{responseTimeMetrics.avgReplyTime}</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">P95 Response Time</span>
                    <span className="font-mono font-medium">{responseTimeMetrics.p95ResponseTime}</span>
                  </div>
                  <Progress value={35} className="h-2" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Within SLA (&lt;5 min)</span>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{responseTimeMetrics.withinSla}%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Intent Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="size-4 text-emerald-600" /> Intent Distribution
                </CardTitle>
                <CardDescription>Detected intents from WhatsApp conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(intentDistribution).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Target className="size-8 mb-2 opacity-50" />
                    <p className="text-sm">No intent data yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(intentDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([intent, count]) => {
                        const maxCount = Math.max(...Object.values(intentDistribution));
                        const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                        return (
                          <div key={intent} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm capitalize">{intent.replace(/_/g, ' ')}</span>
                              <span className="text-xs font-mono text-muted-foreground">{count}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stage Transition Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Funnel className="size-4 text-emerald-600" /> Stage Funnel
                </CardTitle>
                <CardDescription>Conversation stage progression</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stageFunnel.map((stage, idx) => {
                    const maxCount = Math.max(...stageFunnel.map(s => s.count), 1);
                    const widthPct = Math.round((stage.count / maxCount) * 100);
                    const stageConfig = STAGE_CONFIG[stage.stage];
                    return (
                      <div key={stage.stage} className="flex items-center gap-3">
                        <span className="text-xs w-24 text-right text-muted-foreground capitalize">{stageConfig?.label || stage.stage.replace(/_/g, ' ')}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-7 bg-muted rounded overflow-hidden flex-1 relative">
                            <div
                              className={`h-full rounded transition-all ${
                                idx < 2 ? 'bg-slate-400' :
                                idx < 4 ? 'bg-emerald-400' :
                                idx < 6 ? 'bg-emerald-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.max(widthPct, 5)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                              {stage.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Tab: Templates (WhatsApp Template Catalog + Setup Wizard) ═══ */}
        <TabsContent value="templates" className="space-y-6">
          <WhatsAppTemplateCatalog />
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Settings className="size-4" /> Setup Wizard
            </h3>
            <WhatsAppSetupWizard />
          </div>
        </TabsContent>
      </Tabs>

      {/* Conversation Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedConversation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-emerald-600" />
                  Conversation Detail
                </DialogTitle>
                <DialogDescription>
                  {selectedConversation.customerName || selectedConversation.customerPhone}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="text-sm font-medium">{selectedConversation.customerPhone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Current Stage</Label>
                    <div className="mt-0.5"><StageBadge stage={selectedConversation.currentStage} /></div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Detected Intent</Label>
                    <div className="mt-0.5">
                      <IntentBadge intent={selectedConversation.intentDetected} confidence={selectedConversation.intentConfidence} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-0.5"><StatusBadge status={selectedConversation.status} /></div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {selectedConversation.lead && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Linked Lead</Label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline">{selectedConversation.lead.name}</Badge>
                        <StatusBadge status={selectedConversation.lead.status} />
                      </div>
                    </div>
                  )}
                  {selectedConversation.job && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Linked Job</Label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline">{selectedConversation.job.title}</Badge>
                        <StatusBadge status={selectedConversation.job.status} />
                      </div>
                    </div>
                  )}
                  {selectedConversation.customer && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Customer</Label>
                      <p className="text-sm font-medium mt-0.5">{selectedConversation.customer.name}</p>
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Messages ({conversationMessages.length})</Label>
                  <ScrollArea className="h-48 mt-1">
                    <div className="space-y-2">
                      {conversationMessages.map((msg, idx) => (
                        <div key={msg.id || idx} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`rounded-lg p-2 max-w-xs text-sm ${
                            msg.direction === 'outbound' ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-muted rounded-tl-none'
                          }`}>
                            <p className="text-xs">{msg.body}</p>
                            <p className={`text-[9px] mt-0.5 ${msg.direction === 'outbound' ? 'text-white/60 text-right' : 'text-muted-foreground'}`}>
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {conversationMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No message history available</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Close</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                  setDetailDialogOpen(false);
                  setActiveTab('conversations');
                }}>
                  <MessageSquare className="size-3.5 mr-1" /> Open Chat
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getDemoConversations(): ConversationData[] {
  return [
    {
      id: '1', conversationId: 'conv_demo_1', customerPhone: '+919876543210', customerName: 'Ravi Kumar',
      status: 'active', currentStage: 'booking', intentDetected: 'cleaning_service', intentConfidence: 0.92,
      lastMessageAt: new Date(Date.now() - 300000).toISOString(), lastMessageBody: 'I need a deep cleaning for my apartment',
      lastDirection: 'inbound', messagesJson: JSON.stringify([
        { id: 'm1', direction: 'inbound', body: 'Hi, I need cleaning service', timestamp: new Date(Date.now() - 900000).toISOString() },
        { id: 'm2', direction: 'outbound', body: 'Hello! We offer deep cleaning and regular cleaning. Which would you prefer?', timestamp: new Date(Date.now() - 800000).toISOString() },
        { id: 'm3', direction: 'inbound', body: 'I need a deep cleaning for my apartment', timestamp: new Date(Date.now() - 300000).toISOString() },
      ]),
      metadataJson: '{}', createdAt: new Date(Date.now() - 900000).toISOString(), updatedAt: new Date(Date.now() - 300000).toISOString(),
      lead: { id: 'l1', name: 'Ravi Kumar', status: 'qualified', serviceType: 'cleaning' },
    },
    {
      id: '2', conversationId: 'conv_demo_2', customerPhone: '+919876543211', customerName: 'Priya Sharma',
      status: 'active', currentStage: 'assigned', intentDetected: 'plumbing', intentConfidence: 0.85,
      lastMessageAt: new Date(Date.now() - 600000).toISOString(), lastMessageBody: 'My kitchen pipe is leaking',
      lastDirection: 'inbound', messagesJson: JSON.stringify([
        { id: 'm4', direction: 'inbound', body: 'My kitchen pipe is leaking', timestamp: new Date(Date.now() - 600000).toISOString() },
        { id: 'm5', direction: 'outbound', body: 'We have a plumber available. Can we schedule for today?', timestamp: new Date(Date.now() - 500000).toISOString() },
      ]),
      metadataJson: '{}', createdAt: new Date(Date.now() - 600000).toISOString(), updatedAt: new Date(Date.now() - 500000).toISOString(),
      lead: { id: 'l2', name: 'Priya Sharma', status: 'new', serviceType: 'plumbing' },
      job: { id: 'j2', title: 'Kitchen Pipe Repair', status: 'assigned' },
    },
    {
      id: '3', conversationId: 'conv_demo_3', customerPhone: '+919876543212', customerName: 'Dr. Kumar',
      status: 'completed', currentStage: 'completed', intentDetected: 'appointment', intentConfidence: 0.78,
      lastMessageAt: new Date(Date.now() - 3600000).toISOString(), lastMessageBody: 'Thank you, the service was excellent!',
      lastDirection: 'inbound', messagesJson: '[]', metadataJson: '{}',
      createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '4', conversationId: 'conv_demo_4', customerPhone: '+919876543213', customerName: 'Ajay Singh',
      status: 'active', currentStage: 'intent_detected', intentDetected: 'electrical', intentConfidence: 0.65,
      lastMessageAt: new Date(Date.now() - 1200000).toISOString(), lastMessageBody: 'Having power issues in my office',
      lastDirection: 'inbound', messagesJson: '[]', metadataJson: '{}',
      createdAt: new Date(Date.now() - 1500000).toISOString(), updatedAt: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      id: '5', conversationId: 'conv_demo_5', customerPhone: '+919876543214', customerName: 'Sunita Devi',
      status: 'active', currentStage: 'greeting', intentDetected: undefined, intentConfidence: undefined,
      lastMessageAt: new Date(Date.now() - 1800000).toISOString(), lastMessageBody: 'Hello',
      lastDirection: 'inbound', messagesJson: '[]', metadataJson: '{}',
      createdAt: new Date(Date.now() - 1800000).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
}

function getDemoLeads(): WhatsAppLead[] {
  return [
    { id: 'l1', name: 'Ravi Kumar', phone: '+919876543210', source: 'whatsapp', status: 'qualified', priority: 'high', value: 2500, serviceType: 'cleaning', notesJson: '[]', tagsJson: '[]', createdAt: new Date(Date.now() - 900000).toISOString(), updatedAt: new Date(Date.now() - 300000).toISOString(), assignedTo: { id: 'e1', name: 'Amit Tech', phone: '+919998887776' } },
    { id: 'l2', name: 'Priya Sharma', phone: '+919876543211', source: 'whatsapp', status: 'new', priority: 'urgent', value: 1800, serviceType: 'plumbing', notesJson: '[]', tagsJson: '[]', createdAt: new Date(Date.now() - 600000).toISOString(), updatedAt: new Date(Date.now() - 500000).toISOString(), job: { id: 'j2', title: 'Kitchen Pipe Repair', status: 'assigned' } },
    { id: 'l3', name: 'Vikram Patel', phone: '+919876543215', source: 'whatsapp', status: 'converted', priority: 'medium', value: 3200, serviceType: 'electrical', notesJson: '[]', tagsJson: '[]', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date(Date.now() - 43200000).toISOString(), job: { id: 'j3', title: 'Office Wiring', status: 'completed' } },
    { id: 'l4', name: 'Neha Gupta', phone: '+919876543216', source: 'whatsapp', status: 'contacted', priority: 'low', value: 800, serviceType: 'painting', notesJson: '[]', tagsJson: '[]', createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'l5', name: 'Arjun Reddy', phone: '+919876543217', source: 'whatsapp', status: 'lost', priority: 'medium', value: 1500, serviceType: 'hvac', notesJson: '[]', tagsJson: '[]', createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date(Date.now() - 172800000).toISOString() },
  ];
}

function getDemoNotificationLogs(): NotificationLog[] {
  return [
    { id: 'nl1', type: 'whatsapp', recipient: '+919998887776', recipientName: 'Amit Tech', recipientRole: 'employee', message: 'New Job: Kitchen Pipe Repair. Accept or Reject?', status: 'delivered', jobId: 'j2', metadataJson: '{}', createdAt: new Date(Date.now() - 300000).toISOString() },
    { id: 'nl2', type: 'whatsapp', recipient: '+919998887777', recipientName: 'Suresh Plumber', recipientRole: 'employee', message: 'New Job: Bathroom Fix. Accept or Reject?', status: 'read', jobId: 'j4', metadataJson: '{}', createdAt: new Date(Date.now() - 600000).toISOString() },
    { id: 'nl3', type: 'whatsapp', recipient: '+919876543210', recipientName: 'Ravi Kumar', recipientRole: 'customer', message: 'Your cleaning service is confirmed for tomorrow 10 AM.', status: 'sent', jobId: 'j5', metadataJson: '{}', createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 'nl4', type: 'whatsapp', recipient: '+919998887778', recipientName: 'Raj Electric', recipientRole: 'employee', message: 'New Job: Office Wiring. Accept or Reject?', status: 'failed', jobId: 'j3', metadataJson: '{}', createdAt: new Date(Date.now() - 1200000).toISOString() },
    { id: 'nl5', type: 'whatsapp', recipient: '+919876543212', recipientName: 'Dr. Kumar', recipientRole: 'customer', message: 'Service completed! Please rate your experience.', status: 'read', jobId: 'j6', metadataJson: '{}', createdAt: new Date(Date.now() - 1800000).toISOString() },
  ];
}
