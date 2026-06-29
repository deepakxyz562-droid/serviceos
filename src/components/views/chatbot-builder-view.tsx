'use client';

import { useState } from 'react';
import {
  Bot, Plus, Search, Play, Pause, Eye, Settings, Trash2,
  MessageSquare, GitBranch, Zap, Clock, User, Globe,
  ArrowRight, Copy, Sparkles, List, CheckCircle2, Send,
  BarChart3, TrendingUp, Timer, Pencil, MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatbotNode {
  id: string;
  type: 'message' | 'buttons' | 'list_menu' | 'condition' | 'ai_response' | 'api_call' | 'webhook' | 'delay' | 'human_handover';
  label: string;
  config: string;
  x: number;
  y: number;
  connections: string[];
}

interface Chatbot {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'draft';
  triggerKeyword: string;
  welcomeMessage: string;
  totalSessions: number;
  activeSessions: number;
  resolutionRate: number;
  avgResponseTime: number;
  nodes: ChatbotNode[];
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_TYPES = [
  { value: 'message', label: 'Message', icon: MessageSquare, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'buttons', label: 'Buttons', icon: List, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'list_menu', label: 'List Menu', icon: List, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'ai_response', label: 'AI Response', icon: Sparkles, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'api_call', label: 'API Call', icon: Globe, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { value: 'webhook', label: 'Webhook', icon: Zap, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'delay', label: 'Delay', icon: Clock, color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'human_handover', label: 'Human Handover', icon: User, color: 'bg-red-100 text-red-700 border-red-300' },
];

const FLOW_EXAMPLES = [
  { name: 'Lead Capture', nodes: ['message', 'buttons', 'condition', 'ai_response'] },
  { name: 'Appointment Booking', nodes: ['message', 'list_menu', 'api_call', 'message'] },
  { name: 'Quote Request', nodes: ['message', 'buttons', 'ai_response', 'human_handover'] },
  { name: 'Support FAQ', nodes: ['message', 'list_menu', 'condition', 'ai_response'] },
  { name: 'Job Status Tracking', nodes: ['message', 'buttons', 'api_call', 'message'] },
];

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_CHATBOTS: Chatbot[] = [
  {
    id: 'bot1', name: 'Lead Capture Bot', status: 'active', triggerKeyword: 'hi,hello,help',
    welcomeMessage: 'Hi! 👋 Welcome to ServiceOS. How can we help you today?',
    totalSessions: 1245, activeSessions: 23, resolutionRate: 78, avgResponseTime: 1.2,
    nodes: [
      { id: 'n1', type: 'message', label: 'Welcome', config: 'Hi! How can we help you today?', x: 50, y: 50, connections: ['n2'] },
      { id: 'n2', type: 'buttons', label: 'Main Menu', config: 'Book Service|Get Quote|Support', x: 250, y: 50, connections: ['n3', 'n4', 'n5'] },
      { id: 'n3', type: 'ai_response', label: 'Booking AI', config: 'Help user book a service', x: 450, y: 0, connections: ['n6'] },
      { id: 'n4', type: 'human_handover', label: 'Quote Agent', config: 'Transfer to sales', x: 450, y: 100, connections: [] },
      { id: 'n5', type: 'list_menu', label: 'Support Menu', config: 'FAQ|Track Job|Talk to Agent', x: 450, y: 200, connections: ['n7'] },
      { id: 'n6', type: 'api_call', label: 'Create Booking', config: 'POST /api/bookings', x: 650, y: 0, connections: ['n8'] },
      { id: 'n7', type: 'ai_response', label: 'FAQ AI', config: 'Answer common questions', x: 650, y: 200, connections: [] },
      { id: 'n8', type: 'message', label: 'Confirmation', config: 'Your booking is confirmed!', x: 850, y: 0, connections: [] },
    ],
    createdAt: '2025-01-15',
  },
  {
    id: 'bot2', name: 'Support Bot', status: 'active', triggerKeyword: 'support,help,issue',
    welcomeMessage: 'Welcome to support! 🛠️ What do you need help with?',
    totalSessions: 892, activeSessions: 15, resolutionRate: 85, avgResponseTime: 0.8,
    nodes: [
      { id: 'n10', type: 'message', label: 'Greeting', config: 'Welcome to support!', x: 50, y: 50, connections: ['n11'] },
      { id: 'n11', type: 'list_menu', label: 'Options', config: 'Track Job|FAQ|Talk to Agent', x: 250, y: 50, connections: ['n12'] },
      { id: 'n12', type: 'condition', label: 'Router', config: 'Route based on selection', x: 450, y: 50, connections: ['n13', 'n14'] },
      { id: 'n13', type: 'api_call', label: 'Get Status', config: 'GET /api/jobs/status', x: 650, y: 0, connections: ['n15'] },
      { id: 'n14', type: 'ai_response', label: 'FAQ Bot', config: 'Answer from knowledge base', x: 650, y: 100, connections: [] },
      { id: 'n15', type: 'message', label: 'Status Reply', config: 'Your job status is: {{status}}', x: 850, y: 0, connections: [] },
    ],
    createdAt: '2025-02-10',
  },
  {
    id: 'bot3', name: 'Appointment Bot', status: 'inactive', triggerKeyword: 'book,appointment,schedule',
    welcomeMessage: 'Book your appointment! 📅 What service do you need?',
    totalSessions: 340, activeSessions: 0, resolutionRate: 62, avgResponseTime: 2.1,
    nodes: [
      { id: 'n20', type: 'message', label: 'Welcome', config: 'Book your appointment!', x: 50, y: 50, connections: ['n21'] },
      { id: 'n21', type: 'buttons', label: 'Service Type', config: 'Cleaning|Plumbing|Packing', x: 250, y: 50, connections: ['n22'] },
      { id: 'n22', type: 'api_call', label: 'Check Slots', config: 'GET /api/slots', x: 450, y: 50, connections: ['n23'] },
      { id: 'n23', type: 'list_menu', label: 'Pick Time', config: 'Available time slots', x: 650, y: 50, connections: ['n24'] },
      { id: 'n24', type: 'message', label: 'Confirm', config: 'Appointment confirmed!', x: 850, y: 50, connections: [] },
    ],
    createdAt: '2025-03-01',
  },
  {
    id: 'bot4', name: 'Payment Bot', status: 'draft', triggerKeyword: 'pay,payment,invoice',
    welcomeMessage: '💳 Payment assistance at your service!',
    totalSessions: 0, activeSessions: 0, resolutionRate: 0, avgResponseTime: 0,
    nodes: [
      { id: 'n30', type: 'message', label: 'Welcome', config: 'Payment help', x: 50, y: 50, connections: ['n31'] },
      { id: 'n31', type: 'list_menu', label: 'Options', config: 'Pay Now|View Invoice|Payment Issue', x: 250, y: 50, connections: [] },
    ],
    createdAt: '2025-03-10',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function ChatbotBuilderView() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBot, setSelectedBot] = useState<Chatbot | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<{ sender: 'bot' | 'user'; text: string }[]>([]);
  const [previewInput, setPreviewInput] = useState('');
  const [selectedNode, setSelectedNode] = useState<ChatbotNode | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', template: '', triggerKeyword: '', welcomeMessage: '',
  });

  const filteredBots = chatbots.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    activeBots: chatbots.filter(b => b.status === 'active').length,
    conversationsToday: chatbots.reduce((s, b) => s + b.activeSessions, 0),
    avgResolutionRate: chatbots.filter(b => b.resolutionRate > 0).length > 0
      ? Math.round(chatbots.filter(b => b.resolutionRate > 0).reduce((s, b) => s + b.resolutionRate, 0) / chatbots.filter(b => b.resolutionRate > 0).length)
      : 0,
    avgResponseTime: chatbots.filter(b => b.avgResponseTime > 0).length > 0
      ? (chatbots.filter(b => b.avgResponseTime > 0).reduce((s, b) => s + b.avgResponseTime, 0) / chatbots.filter(b => b.avgResponseTime > 0).length).toFixed(1)
      : '0',
  };

  const handleToggle = (id: string) => {
    setChatbots(prev => prev.map(b =>
      b.id === id ? { ...b, status: b.status === 'active' ? 'inactive' as const : 'active' as const } : b
    ));
    toast.success('Bot status updated');
  };

  const handleCreate = () => {
    if (!createForm.name) { toast.error('Bot name is required'); return; }
    const templateFlow = FLOW_EXAMPLES.find(f => f.name === createForm.template);
    const nodes: ChatbotNode[] = (templateFlow?.nodes || ['message', 'buttons', 'ai_response']).map((type, i) => ({
      id: `n-new-${i}`, type: type as ChatbotNode['type'],
      label: NODE_TYPES.find(n => n.value === type)?.label || type,
      config: '', x: 50 + i * 200, y: 50, connections: i < ((templateFlow?.nodes.length || 3) - 1) ? [`n-new-${i + 1}`] : [],
    }));
    const newBot: Chatbot = {
      id: `bot-${Date.now()}`, name: createForm.name, status: 'draft',
      triggerKeyword: createForm.triggerKeyword || 'hi,hello',
      welcomeMessage: createForm.welcomeMessage || `Hi! Welcome to ${createForm.name}.`,
      totalSessions: 0, activeSessions: 0, resolutionRate: 0, avgResponseTime: 0,
      nodes,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setChatbots(prev => [newBot, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', template: '', triggerKeyword: '', welcomeMessage: '' });
    toast.success('Chatbot created');
  };

  const handleDelete = (id: string) => {
    setChatbots(prev => prev.filter(b => b.id !== id));
    if (selectedBot?.id === id) setSelectedBot(null);
    toast.success('Chatbot deleted');
  };

  const handlePreview = (bot: Chatbot) => {
    setSelectedBot(bot);
    const firstNode = bot.nodes[0];
    if (firstNode) {
      setPreviewMessages([{ sender: 'bot', text: firstNode.config || bot.welcomeMessage }]);
    } else {
      setPreviewMessages([{ sender: 'bot', text: bot.welcomeMessage }]);
    }
    setShowPreviewDialog(true);
  };

  const handlePreviewSend = () => {
    if (!previewInput.trim()) return;
    setPreviewMessages(prev => [...prev, { sender: 'user', text: previewInput }]);
    setTimeout(() => {
      setPreviewMessages(prev => [...prev, { sender: 'bot', text: 'Thanks for your message! This is a simulated response from the chatbot preview.' }]);
    }, 500);
    setPreviewInput('');
  };

  const getNodeStyle = (type: string) => {
    return NODE_TYPES.find(n => n.value === type) || NODE_TYPES[0];
  };

  const openDetail = (bot: Chatbot) => {
    setSelectedBot(bot);
    setShowDetailDialog(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Bot className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Chatbot Builder</h2>
            <p className="text-sm text-muted-foreground">Design and manage WhatsApp chatbots</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Chatbot
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Active Bots', value: stats.activeBots, icon: Bot, color: 'text-emerald-600' },
          { label: 'Conversations Today', value: stats.conversationsToday, icon: MessageSquare, color: 'text-blue-600' },
          { label: 'Resolution Rate', value: `${stats.avgResolutionRate}%`, icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Avg Response Time', value: `${stats.avgResponseTime}s`, icon: Timer, color: 'text-amber-600' },
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
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">Inactive</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search chatbots..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Chatbot Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredBots.map(bot => (
          <Card key={bot.id} className="hover:shadow-md transition-all">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">{bot.name}</h4>
                  <Badge variant="outline" className={cn(
                    'text-[10px] mt-1',
                    bot.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    bot.status === 'inactive' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                    'bg-amber-100 text-amber-700 border-amber-200'
                  )}>
                    {bot.status}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handlePreview(bot)}><Eye className="size-3.5" /></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="size-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetail(bot)}><Settings className="size-3.5 mr-2" /> Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(bot.id)}>
                        {bot.status === 'active' ? <Pause className="size-3.5 mr-2" /> : <Play className="size-3.5 mr-2" />}
                        {bot.status === 'active' ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => handleDelete(bot.id)}>
                        <Trash2 className="size-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Trigger keyword */}
              <div className="flex items-center gap-1 text-xs">
                <Zap className="size-3 text-amber-500" />
                <span className="text-muted-foreground">Trigger:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{bot.triggerKeyword}</code>
              </div>

              {/* Performance stats */}
              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                <div>
                  <p className="text-sm font-bold text-blue-600">{bot.totalSessions.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground">Sessions</p>
                </div>
                <div>
                  <p className={cn('text-sm font-bold', bot.resolutionRate >= 75 ? 'text-emerald-600' : bot.resolutionRate >= 50 ? 'text-amber-600' : 'text-red-600')}>
                    {bot.resolutionRate > 0 ? `${bot.resolutionRate}%` : '-'}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Resolution</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{bot.avgResponseTime > 0 ? `${bot.avgResponseTime}s` : '-'}</p>
                  <p className="text-[9px] text-muted-foreground">Avg Time</p>
                </div>
              </div>

              {/* Node badges */}
              <div className="flex flex-wrap gap-1 pt-2 border-t">
                {bot.nodes.slice(0, 5).map(node => {
                  const nodeType = getNodeStyle(node.type);
                  const Icon = nodeType.icon;
                  return (
                    <Badge key={node.id} variant="outline" className={`${nodeType.color} text-[9px] h-5`}>
                      <Icon className="size-2.5 mr-0.5" />{node.label}
                    </Badge>
                  );
                })}
                {bot.nodes.length > 5 && <Badge variant="secondary" className="text-[9px] h-5">+{bot.nodes.length - 5}</Badge>}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openDetail(bot)}>
                  <Settings className="size-3 mr-1" /> Builder
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleToggle(bot.id)}>
                  {bot.status === 'active' ? <Pause className="size-3" /> : <Play className="size-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredBots.length === 0 && (
        <div className="text-center py-12">
          <Bot className="size-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No chatbots found</h3>
          <p className="text-muted-foreground mb-4">{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first chatbot'}</p>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Chatbot
          </Button>
        </div>
      )}

      {/* Visual Builder (shown when bot selected from detail) */}
      {selectedBot && showDetailDialog && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedBot.name}
                <Badge variant="outline" className={cn(
                  'text-[10px]',
                  selectedBot.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  selectedBot.status === 'inactive' ? 'bg-slate-100 text-slate-600' :
                  'bg-amber-100 text-amber-700'
                )}>
                  {selectedBot.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><Zap className="size-3" />{selectedBot.triggerKeyword}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="size-3" />{selectedBot.totalSessions} sessions</span>
                  <span className="flex items-center gap-1"><TrendingUp className="size-3" />{selectedBot.resolutionRate}% resolution</span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Welcome Message */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Welcome Message</h4>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
                  {selectedBot.welcomeMessage}
                </div>
              </div>

              {/* Conversation Flow */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Conversation Flow</h4>
                <ScrollArea className="w-full">
                  <div className="flex items-start gap-4 pb-4 min-w-max">
                    {selectedBot.nodes.map((node, idx) => {
                      const nodeType = getNodeStyle(node.type);
                      const Icon = nodeType.icon;
                      return (
                        <div key={node.id} className="flex items-center gap-4">
                          <button
                            className={cn(
                              'flex flex-col items-center gap-1 p-3 rounded-lg border-2 min-w-[120px] transition-all hover:shadow-md',
                              selectedNode?.id === node.id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-border',
                              nodeType.color
                            )}
                            onClick={() => { setSelectedNode(node); setShowNodeConfig(true); }}
                          >
                            <Icon className="size-5" />
                            <span className="text-xs font-medium text-center">{node.label}</span>
                            <span className="text-[9px] opacity-60">{nodeType.label}</span>
                          </button>
                          {idx < selectedBot.nodes.length - 1 && (
                            <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    <button className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 min-w-[120px] hover:border-emerald-400 hover:bg-emerald-50 transition-colors" onClick={() => toast.info('Add node functionality coming soon')}>
                      <Plus className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Node</span>
                    </button>
                  </div>
                </ScrollArea>
              </div>

              {/* Node Config Panel */}
              {showNodeConfig && selectedNode && (
                <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Node: {selectedNode.label}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowNodeConfig(false)}><Trash2 className="size-3" /></Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Configuration</Label>
                    <Textarea value={selectedNode.config} onChange={e => {
                      setSelectedNode(prev => prev ? { ...prev, config: e.target.value } : null);
                      // Also update the bot's node
                      setChatbots(prev => prev.map(b => b.id === selectedBot.id ? {
                        ...b,
                        nodes: b.nodes.map(n => n.id === selectedNode.id ? { ...n, config: e.target.value } : n)
                      } : b));
                    }} rows={2} className="text-xs" placeholder="Configure this node..." />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Type: {getNodeStyle(selectedNode.type).label}</span>
                    <span>Connections: {selectedNode.connections.length}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Performance */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Performance</h4>
                <div className="grid grid-cols-4 gap-3">
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-blue-600">{selectedBot.totalSessions.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Total Sessions</p>
                  </Card>
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-emerald-600">{selectedBot.activeSessions}</p>
                    <p className="text-[9px] text-muted-foreground">Active</p>
                  </Card>
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-purple-600">{selectedBot.resolutionRate}%</p>
                    <p className="text-[9px] text-muted-foreground">Resolution</p>
                  </Card>
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-amber-600">{selectedBot.avgResponseTime}s</p>
                    <p className="text-[9px] text-muted-foreground">Avg Time</p>
                  </Card>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setShowDetailDialog(false); handlePreview(selectedBot); }}>
                  <Play className="size-4 mr-1.5" /> Test Bot
                </Button>
                <Button variant="outline" onClick={() => handleToggle(selectedBot.id)}>
                  {selectedBot.status === 'active' ? <><Pause className="size-4 mr-1.5" /> Deactivate</> : <><Play className="size-4 mr-1.5" /> Activate</>}
                </Button>
                <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { handleDelete(selectedBot.id); setShowDetailDialog(false); }}>
                  <Trash2 className="size-4 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Chatbot Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Chatbot</DialogTitle>
            <DialogDescription>Set up a new WhatsApp chatbot</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Chatbot Name *</Label>
              <Input placeholder="e.g., Lead Capture Bot" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Trigger Keywords</Label>
              <Input placeholder="e.g., hi,hello,help" value={createForm.triggerKeyword} onChange={e => setCreateForm({ ...createForm, triggerKeyword: e.target.value })} />
              <p className="text-[10px] text-muted-foreground">Comma-separated keywords that trigger the bot</p>
            </div>
            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <Textarea placeholder="e.g., Hi! How can we help you today?" value={createForm.welcomeMessage} onChange={e => setCreateForm({ ...createForm, welcomeMessage: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Start from Template</Label>
              <Select value={createForm.template} onValueChange={v => setCreateForm({ ...createForm, template: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                <SelectContent>
                  {FLOW_EXAMPLES.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <Label className="text-xs mb-2 block">Available Node Types</Label>
              <div className="grid grid-cols-3 gap-2">
                {NODE_TYPES.map(nt => {
                  const Icon = nt.icon;
                  return (
                    <div key={nt.value} className={cn('flex items-center gap-1.5 p-2 rounded-lg border text-[10px]', nt.color)}>
                      <Icon className="size-3.5" /><span>{nt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name}>Create Chatbot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="size-4 text-emerald-600" />
              Test: {selectedBot?.name}
            </DialogTitle>
            <DialogDescription>Simulate a chatbot conversation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ScrollArea className="h-64 rounded-lg border p-3 bg-slate-50">
              <div className="space-y-2">
                {previewMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.sender === 'bot' ? '' : 'justify-end')}>
                    <div className={cn(
                      'max-w-[80%] rounded-lg p-2 text-sm',
                      msg.sender === 'bot' ? 'bg-white border shadow-sm' : 'bg-emerald-600 text-white'
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input placeholder="Type a message..." value={previewInput} onChange={e => setPreviewInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePreviewSend()} />
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePreviewSend}><Send className="size-3.5" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
