'use client';

import { useState } from 'react';
import {
  Bot, MessageSquare, Phone, Clock, Calendar, CheckCircle2,
  Zap, Sparkles, TrendingUp, Users, ArrowRight, ChevronRight,
  Settings, Globe, BarChart3, Star, Shield, Target,
  Lightbulb, Brain, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ─── Mock Data ──────────────────────────────────────────────────────

const dashboardStats = [
  { title: 'Conversations Today', value: '47', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', change: '+12%' },
  { title: 'Bookings Created', value: '18', icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50', change: '+8%' },
  { title: 'Avg Response Time', value: '1.2s', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', change: '-0.3s' },
  { title: 'Customer Satisfaction', value: '94%', icon: Star, color: 'text-violet-600', bg: 'bg-violet-50', change: '+2%' },
];

interface ChatMessage {
  id: string;
  sender: 'customer' | 'ai' | 'system';
  text: string;
  time: string;
  entities?: { label: string; value: string }[];
}

const chatMessages: ChatMessage[] = [
  { id: '1', sender: 'customer', text: 'Hi, I need window cleaning tomorrow morning', time: '10:32 AM' },
  { id: '2', sender: 'ai', text: 'Hello! I\'d be happy to help you schedule a window cleaning. Let me confirm the details:', time: '10:32 AM', entities: [
    { label: 'Service', value: 'Window Cleaning' },
    { label: 'Date', value: 'Tomorrow (Mar 5)' },
    { label: 'Time', value: 'Morning (9-12 PM)' },
  ]},
  { id: '3', sender: 'ai', text: 'I\'ve found available slots for Window Cleaning tomorrow morning:\n\n• 9:00 AM - 10:30 AM (Rajesh K.)\n• 10:00 AM - 11:30 AM (Sunil M.)\n• 11:00 AM - 12:30 PM (Amit P.)\n\nWhich slot works best for you?', time: '10:32 AM' },
  { id: '4', sender: 'customer', text: '9 AM slot please', time: '10:33 AM' },
  { id: '5', sender: 'ai', text: 'Perfect! I\'ve booked Window Cleaning for tomorrow at 9:00 AM with Rajesh K. 🎉\n\nBooking ID: SVC-2847\nAmount: ₹1,200\n\nYou\'ll receive a confirmation on WhatsApp shortly. Is there anything else I can help with?', time: '10:33 AM' },
  { id: '6', sender: 'system', text: '✅ Booking created automatically — SVC-2847 assigned to Rajesh K.', time: '10:33 AM' },
];

const conversationFlowSteps = [
  { id: '1', label: 'Greeting', description: 'Welcome message + intent detection', icon: MessageSquare, color: 'bg-emerald-500' },
  { id: '2', label: 'Entity Extraction', description: 'Service, Date, Time, Location', icon: Brain, color: 'bg-teal-500' },
  { id: '3', label: 'Availability Check', description: 'Find open slots & technicians', icon: Calendar, color: 'bg-amber-500' },
  { id: '4', label: 'Confirm Booking', description: 'Auto-create job & assign', icon: CheckCircle2, color: 'bg-violet-500' },
  { id: '5', label: 'Send Confirmation', description: 'WhatsApp + SMS + Email', icon: Phone, color: 'bg-pink-500' },
];

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  enabled: boolean;
  status: 'active' | 'beta' | 'coming_soon';
}

const initialAIFeatures: AIFeature[] = [
  { id: '1', title: 'AI Quote Generator', description: 'Automatically generate accurate quotes based on service type, property size, and historical pricing data.', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', enabled: true, status: 'active' },
  { id: '2', title: 'AI Dispatcher', description: 'Intelligently assign jobs to the best available technician based on skills, location, and workload.', icon: Zap, color: 'text-teal-600', bg: 'bg-teal-50', enabled: true, status: 'active' },
  { id: '3', title: 'AI Lead Scoring', description: 'Score and prioritize leads based on engagement, likelihood to convert, and estimated job value.', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', enabled: false, status: 'beta' },
  { id: '4', title: 'AI Business Insights', description: 'Get predictive analytics on revenue trends, seasonal demand, and resource optimization opportunities.', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', enabled: false, status: 'coming_soon' },
];

const recentConversations = [
  { id: '1', customer: 'Priya Sharma', query: 'Plumbing emergency - kitchen leak', status: 'Booked', time: '2 min ago' },
  { id: '2', customer: 'Rahul Verma', query: 'AC service for next week', status: 'Quoted', time: '8 min ago' },
  { id: '3', customer: 'Meena Patel', query: 'Deep cleaning 3BHK apartment', status: 'Booked', time: '15 min ago' },
  { id: '4', customer: 'Vikram Singh', query: 'Pest control for termites', status: 'In Progress', time: '22 min ago' },
  { id: '5', customer: 'Anita Desai', query: 'Electrical wiring inspection', status: 'Escalated', time: '30 min ago' },
];

// ════════════════════════════════════════════════════════════════════
// AI RECEPTIONIST VIEW
// ════════════════════════════════════════════════════════════════════

export function AIReceptionistView() {
  const [aiActive, setAiActive] = useState(true);
  const [aiFeatures, setAiFeatures] = useState<AIFeature[]>(initialAIFeatures);
  const [greetingMessage, setGreetingMessage] = useState('Hello! 👋 Welcome to ServicePro. How can I help you today?');
  const [businessHours, setBusinessHours] = useState('9:00 AM - 7:00 PM');
  const [servicesOffered, setServicesOffered] = useState('Plumbing, Window Cleaning, HVAC, Deep Cleaning, Pest Control, Electrical');
  const [autoBooking, setAutoBooking] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const toggleFeature = (featureId: string) => {
    setAiFeatures(prev =>
      prev.map(f => (f.id === featureId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string }> = {
      Booked: { class: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Booked' },
      Quoted: { class: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Quoted' },
      'In Progress': { class: 'bg-blue-50 text-blue-700 border-blue-200', label: 'In Progress' },
      Escalated: { class: 'bg-red-50 text-red-700 border-red-200', label: 'Escalated' },
    };
    const c = config[status] || { class: 'bg-gray-50 text-gray-600 border-gray-200', label: status };
    return <Badge variant="outline" className={cn('text-[10px]', c.class)}>{c.label}</Badge>;
  };

  const getFeatureStatusBadge = (status: AIFeature['status']) => {
    const config: Record<string, { class: string; label: string }> = {
      active: { class: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active' },
      beta: { class: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Beta' },
      coming_soon: { class: 'bg-gray-50 text-gray-500 border-gray-200', label: 'Coming Soon' },
    };
    const c = config[status];
    return <Badge variant="outline" className={cn('text-[10px]', c.class)}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Bot className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Receptionist</h2>
            <p className="text-sm text-muted-foreground">Your 24/7 automated customer handler</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            'text-xs',
            aiActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
          )}>
            {aiActive ? '● Active' : '● Inactive'}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active</span>
            <Switch checked={aiActive} onCheckedChange={setAiActive} />
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-1">{stat.change} vs yesterday</p>
                  </div>
                  <div className={cn('p-2.5 rounded-xl', stat.bg)}>
                    <Icon className={cn('size-5', stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="size-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageSquare className="size-3.5" /> Live Chat
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5">
            <Sparkles className="size-3.5" /> AI Features
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="size-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* ── Dashboard Tab ── */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation Flow Preview */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">AI Decision Tree</CardTitle>
                <CardDescription>How the AI handles inquiries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {conversationFlowSteps.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.id}>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn('size-8 rounded-full flex items-center justify-center text-white shrink-0', step.color)}>
                            <StepIcon className="size-4" />
                          </div>
                          {idx < conversationFlowSteps.length - 1 && (
                            <div className="w-0.5 h-6 bg-muted mt-1" />
                          )}
                        </div>
                        <div className="pt-1">
                          <p className="text-sm font-medium">{step.label}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent AI Conversations */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Recent Conversations</CardTitle>
                    <CardDescription>AI-handled customer inquiries</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                    View All <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <ScrollArea className="h-[320px]">
                  <div className="px-4 pb-4 space-y-2">
                    {recentConversations.map((conv) => (
                      <div key={conv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-emerald-50 shrink-0">
                            <MessageSquare className="size-3.5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{conv.customer}</p>
                            <p className="text-xs text-muted-foreground truncate">{conv.query}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                          {getStatusBadge(conv.status)}
                          <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s AI Performance</CardTitle>
              <CardDescription>Key metrics from your AI receptionist</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <p className="text-xs text-emerald-600 font-medium">Auto-Booked</p>
                  <p className="text-xl font-bold text-emerald-700">14</p>
                  <p className="text-[10px] text-emerald-500">No human intervention</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50">
                  <p className="text-xs text-amber-600 font-medium">Quotes Sent</p>
                  <p className="text-xl font-bold text-amber-700">9</p>
                  <p className="text-[10px] text-amber-500">AI-generated quotes</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <p className="text-xs text-red-600 font-medium">Escalated</p>
                  <p className="text-xl font-bold text-red-700">3</p>
                  <p className="text-[10px] text-red-500">Transferred to human</p>
                </div>
                <div className="p-3 rounded-lg bg-violet-50">
                  <p className="text-xs text-violet-600 font-medium">After Hours</p>
                  <p className="text-xl font-bold text-violet-700">7</p>
                  <p className="text-[10px] text-violet-500">Handled outside biz hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Live Chat Tab ── */}
        <TabsContent value="chat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Preview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <CardTitle className="text-base">Live Chat Simulation</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    AI Handling
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <ScrollArea className="h-[420px]">
                  <div className="p-4 space-y-4">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={cn(
                        'flex',
                        msg.sender === 'customer' ? 'justify-start' : msg.sender === 'ai' ? 'justify-start' : 'justify-center'
                      )}>
                        {msg.sender === 'system' ? (
                          <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                            {msg.text}
                          </div>
                        ) : (
                          <div className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-2.5',
                            msg.sender === 'customer'
                              ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
                              : 'bg-emerald-600 text-white rounded-bl-sm'
                          )}>
                            <div className="flex items-center gap-1.5 mb-1">
                              {msg.sender === 'ai' && <Bot className="size-3 opacity-80" />}
                              <span className="text-[10px] opacity-70">{msg.sender === 'customer' ? 'Customer' : 'AI Receptionist'} • {msg.time}</span>
                            </div>
                            <p className="text-sm whitespace-pre-line">{msg.text}</p>
                            {msg.entities && (
                              <div className="mt-2 space-y-1">
                                {msg.entities.map((entity) => (
                                  <div key={entity.label} className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/20 text-xs">
                                    <span className="font-medium opacity-80">{entity.label}:</span>
                                    <span className="font-bold">{entity.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Extracted Entities & Booking Details */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Extracted Entities</CardTitle>
                  <CardDescription>AI identified information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-emerald-600" />
                      <span className="text-xs font-medium">Service</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Window Cleaning</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-teal-600" />
                      <span className="text-xs font-medium">Date</span>
                    </div>
                    <Badge className="bg-teal-600 text-white text-[10px]">Tomorrow (Mar 5)</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50">
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-amber-600" />
                      <span className="text-xs font-medium">Time</span>
                    </div>
                    <Badge className="bg-amber-600 text-white text-[10px]">Morning (9 AM)</Badge>
                  </div>
                  <Separator />
                  <div className="p-2.5 rounded-lg bg-green-50">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="size-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Booking Created</span>
                    </div>
                    <p className="text-[10px] text-green-600">SVC-2847 • Rajesh K. • ₹1,200</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Confidence</CardTitle>
                  <CardDescription>Entity recognition accuracy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Service Detection</span>
                      <span className="text-xs font-bold text-emerald-600">98%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: '98%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Date Extraction</span>
                      <span className="text-xs font-bold text-teal-600">95%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: '95%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Time Parsing</span>
                      <span className="text-xs font-bold text-amber-600">91%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: '91%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Intent Classification</span>
                      <span className="text-xs font-bold text-violet-600">96%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: '96%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── AI Features Tab ── */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiFeatures.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <Card key={feature.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn('p-2.5 rounded-xl', feature.bg)}>
                        <FeatureIcon className={cn('size-5', feature.color)} />
                      </div>
                      <div className="flex items-center gap-2">
                        {getFeatureStatusBadge(feature.status)}
                        <Switch
                          checked={feature.enabled}
                          onCheckedChange={() => toggleFeature(feature.id)}
                          disabled={feature.status === 'coming_soon'}
                        />
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        feature.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                      )}>
                        {feature.enabled ? '● Enabled' : '● Disabled'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs h-7">
                        Configure <ChevronRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Feature Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Feature Usage This Week</CardTitle>
              <CardDescription>How each feature is performing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium">Quote Generator</span>
                  </div>
                  <p className="text-2xl font-bold">142</p>
                  <p className="text-xs text-muted-foreground">quotes generated</p>
                  <p className="text-[10px] text-emerald-600 mt-1">89% accepted by customers</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="size-4 text-teal-600" />
                    <span className="text-sm font-medium">Dispatcher</span>
                  </div>
                  <p className="text-2xl font-bold">98</p>
                  <p className="text-xs text-muted-foreground">jobs auto-dispatched</p>
                  <p className="text-[10px] text-teal-600 mt-1">Avg 2.3 min assignment time</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="size-4 text-amber-600" />
                    <span className="text-sm font-medium">Lead Scoring</span>
                  </div>
                  <p className="text-2xl font-bold">67</p>
                  <p className="text-xs text-muted-foreground">leads scored</p>
                  <p className="text-[10px] text-amber-600 mt-1">Top 20% convert at 4x rate</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="size-4 text-violet-600" />
                    <span className="text-sm font-medium">Business Insights</span>
                  </div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground">insights generated</p>
                  <p className="text-[10px] text-violet-600 mt-1">3 actionable recommendations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receptionist Settings</CardTitle>
                <CardDescription>Configure your AI receptionist behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Greeting Message</label>
                  <Textarea
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">This message is sent when a new conversation starts</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Hours</label>
                  <Input
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">AI handles after-hours inquiries automatically</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Services Offered</label>
                  <Textarea
                    value={servicesOffered}
                    onChange={(e) => setServicesOffered(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated list of services for AI to recognize</p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-Booking</p>
                    <p className="text-xs text-muted-foreground">Allow AI to create bookings without confirmation</p>
                  </div>
                  <Switch checked={autoBooking} onCheckedChange={setAutoBooking} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Escalation on Low Confidence</p>
                    <p className="text-xs text-muted-foreground">Transfer to human when confidence &lt; 70%</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Multi-Language Support</p>
                    <p className="text-xs text-muted-foreground">Auto-detect and respond in customer&apos;s language</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Supported Channels</CardTitle>
                  <CardDescription>Where your AI receptionist is active</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="size-4 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">Primary channel</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <Globe className="size-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Website Chat</p>
                        <p className="text-xs text-muted-foreground">Embedded widget</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white text-[10px]">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-violet-50">
                    <div className="flex items-center gap-3">
                      <Phone className="size-4 text-violet-600" />
                      <div>
                        <p className="text-sm font-medium">Phone (IVR)</p>
                        <p className="text-xs text-muted-foreground">Voice AI agent</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Setup Required</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-pink-50">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="size-4 text-pink-600" />
                      <div>
                        <p className="text-sm font-medium">Facebook Messenger</p>
                        <p className="text-xs text-muted-foreground">Social channel</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Setup Required</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Replies</CardTitle>
                  <CardDescription>Pre-configured AI responses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { trigger: 'pricing inquiry', response: 'Share service catalog + quote' },
                    { trigger: 'schedule request', response: 'Show available time slots' },
                    { trigger: 'complaint', response: 'Empathize + escalate to manager' },
                    { trigger: 'reschedule', response: 'Offer alternative slots' },
                  ].map((item) => (
                    <div key={item.trigger} className="p-2.5 rounded-lg border flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{item.trigger}</p>
                        <p className="text-[10px] text-muted-foreground">{item.response}</p>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                    + Add Quick Reply
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
