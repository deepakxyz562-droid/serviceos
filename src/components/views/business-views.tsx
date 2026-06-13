'use client';

import { useState } from 'react';
import {
  Bot, Sparkles, Route, GitBranch, BarChart3, CreditCard, TrendingUp,
  Store, Shield, Plus, Play, Pause, Users, CheckCircle2, Clock, Send,
  MessageSquare, Target, ArrowRight, Zap, DollarSign, Download, Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// ─── Shared ────────────────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, bg }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={cn('p-2.5 rounded-xl', bg)}><Icon className={cn('size-5', color)} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ChatbotBuilderView ────────────────────────────────────────────
const mockBots = [
  { id: 'b1', name: 'Lead Capture Bot', status: 'active' as const, conversations: 87, resolution: 72.4, responseTime: '0.8s' },
  { id: 'b2', name: 'Customer Support Bot', status: 'active' as const, conversations: 134, resolution: 64.8, responseTime: '1.2s' },
  { id: 'b3', name: 'Appointment Scheduler', status: 'active' as const, conversations: 52, resolution: 89.1, responseTime: '0.5s' },
];

const botStatusColors: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700 border-emerald-200', paused: 'bg-amber-100 text-amber-700 border-amber-200', draft: 'bg-slate-100 text-slate-600 border-slate-200' };

export function ChatbotBuilderView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><Bot className="size-5 text-emerald-600" /></div>
          <div><h1 className="text-xl font-bold">Chatbot Builder</h1><p className="text-sm text-muted-foreground">Design and manage conversational AI chatbots for WhatsApp</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="size-4" />Create Bot</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Bots" value={mockBots.filter(b => b.status === 'active').length.toString()} icon={Bot} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Conversations Today" value={mockBots.reduce((s, b) => s + b.conversations, 0).toString()} icon={MessageSquare} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Resolution Rate" value={`${(mockBots.reduce((s, b) => s + b.resolution, 0) / mockBots.length).toFixed(1)}%`} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Avg Response" value="0.8s" icon={Clock} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {mockBots.map(bot => (
          <Card key={bot.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-50"><Bot className="size-5 text-emerald-600" /></div>
                <div>
                  <p className="font-semibold text-sm">{bot.name}</p>
                  <Badge variant="outline" className={cn('text-[10px] mt-1', botStatusColors[bot.status])}><Play className="size-2.5 mr-0.5" />{bot.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-muted-foreground">Today's Chats</p><p className="text-sm font-bold">{bot.conversations}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Resolution</p><p className="text-sm font-bold text-emerald-600">{bot.resolution}%</p></div>
                <div><p className="text-[10px] text-muted-foreground">Avg Response</p><p className="text-sm font-bold">{bot.responseTime}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Handoff Rate</p><p className="text-sm font-bold">{(100 - bot.resolution).toFixed(1)}%</p></div>
              </div>
              <Progress value={bot.resolution} className="h-1.5 mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── AIAssistantView ───────────────────────────────────────────────
const mockSuggestions = [
  { id: 's1', contact: 'Sarah Johnson', intent: 'Price Inquiry', reply: 'Hi Sarah! Thank you for your interest. I\'d be happy to provide a customized quote. Could you share more details?', confidence: 94 },
  { id: 's2', contact: 'Mike Chen', intent: 'Complaint', reply: 'I sincerely apologize for the inconvenience, Mike. Let me look into this right away and arrange an alternative time.', confidence: 97 },
  { id: 's3', contact: 'Emily Rodriguez', intent: 'Info Request', reply: 'Great question! We offer a full range of services. Would you like me to send you our brochure?', confidence: 89 },
  { id: 's4', contact: 'David Kim', intent: 'Reschedule', reply: 'Of course! We have availability next week. Which day works best for you?', confidence: 96 },
];

export function AIAssistantView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50"><Sparkles className="size-5 text-emerald-600" /></div>
        <div><h1 className="text-xl font-bold">AI Assistant</h1><p className="text-sm text-muted-foreground">AI-powered suggestions, summaries, and insights</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Suggestions" value={mockSuggestions.length.toString()} subtitle={`${(mockSuggestions.reduce((s, r) => s + r.confidence, 0) / mockSuggestions.length).toFixed(0)}% avg confidence`} icon={MessageSquare} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Conversations Summarized" value="12" subtitle="today" icon={Sparkles} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Intents Detected" value="5" subtitle="4 high confidence" icon={Target} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Hot Leads" value="1" subtitle="of 4 scored leads" icon={Zap} color="text-red-600" bg="bg-red-50" />
      </div>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Suggested Replies</h3>
        {mockSuggestions.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><span className="text-sm font-medium">{s.contact}</span><Badge variant="outline" className="text-[10px]">{s.intent}</Badge></div>
                <Badge variant="outline" className={cn('text-[10px]', s.confidence >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>{s.confidence}% confidence</Badge>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 mb-2">
                <div className="flex items-center gap-1 mb-1"><Sparkles className="size-3 text-emerald-600" /><span className="text-[10px] font-medium text-emerald-700">AI Suggested</span></div>
                <p className="text-xs text-emerald-900 leading-relaxed">{s.reply}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 h-7"><Send className="size-3" />Send</Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">Copy</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── AICampaignGeneratorView ───────────────────────────────────────
export function AICampaignGeneratorView() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const stats = [
    { label: 'Campaigns Generated', value: '2,847', change: '+12%' },
    { label: 'Avg Open Rate', value: '72.3%', change: '+5.2%' },
    { label: 'Avg Click Rate', value: '34.8%', change: '+8.1%' },
    { label: 'Messages Sent', value: '1.2M', change: '+22%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Sparkles className="h-6 w-6" /></div>
        <div><h2 className="text-2xl font-bold tracking-tight">AI Campaign Generator</h2><p className="text-muted-foreground">Create high-converting WhatsApp campaigns with AI</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <div className="flex items-baseline gap-2"><p className="text-2xl font-bold">{s.value}</p><Badge variant="secondary" className="text-emerald-600 bg-emerald-50 text-xs">{s.change}</Badge></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader><CardTitle className="text-lg">Campaign Configuration</CardTitle><CardDescription>Describe your campaign goals</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <textarea placeholder="e.g., Create a spring sale campaign offering 30% off for existing customers..." rows={4} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm resize-none" />
              <Button onClick={() => { setIsGenerating(true); setTimeout(() => { setGenerated(true); setIsGenerating(false); }, 2000); }} disabled={isGenerating} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {isGenerating ? <><Sparkles className="h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4" />Generate Campaign</>}
              </Button>
            </CardContent>
          </Card>
          {generated && (
            <Card className="mt-6">
              <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Spring Flash Sale - 30% Off</CardTitle><Badge className="bg-emerald-100 text-emerald-700">Generated</Badge></div></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">Target Audience</p><p className="text-sm font-medium">All active customers (last 90 days)</p></div>
                  <div><p className="text-xs text-muted-foreground">Estimated Reach</p><p className="text-sm font-medium">12,450 contacts</p></div>
                  <div><p className="text-xs text-muted-foreground">Est. Open Rate</p><p className="text-sm font-medium">68.5%</p></div>
                  <div><p className="text-xs text-muted-foreground">CTA Button</p><p className="text-sm font-medium">Shop Spring Sale</p></div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Send className="h-4 w-4" />Launch</Button>
                  <Button variant="outline" className="gap-2"><ArrowRight className="h-4 w-4" />Edit in Journey Builder</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader><CardTitle className="text-lg">WhatsApp Preview</CardTitle></CardHeader>
            <CardContent>
              <div className="mx-auto max-w-[280px]">
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2 rounded-t-lg bg-emerald-600 px-3 py-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20"><MessageSquare className="h-3.5 w-3.5 text-white" /></div><div><p className="text-xs font-semibold text-white">Your Business</p><p className="text-[10px] text-white/80">online</p></div></div>
                  <div className="space-y-2 rounded-b-lg bg-[#e5ddd5] p-3" style={{ minHeight: '150px' }}>
                    {generated ? (
                      <div className="rounded-lg bg-white p-2.5 text-xs shadow-sm">
                        <p className="mb-1 text-[10px] font-bold text-emerald-600">Exclusive 30% Off!</p>
                        <p className="text-[11px] leading-relaxed text-gray-800">Hi! Spring is here with our biggest savings! Use code SPRING30.</p>
                        <p className="mt-1 text-right text-[9px] text-gray-400">10:42 AM ✓✓</p>
                      </div>
                    ) : <div className="flex h-24 items-center justify-center"><p className="text-xs text-gray-500">Generate a campaign to see preview</p></div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── JourneyAutomationView ─────────────────────────────────────────
const mockJourneys = [
  { id: 'j1', name: 'Welcome Series', status: 'active' as const, enrolled: 3420, completed: 2856, rate: 83.5, trigger: 'Contact Created', steps: 3, avgDuration: '2.4 days' },
  { id: 'j2', name: 'Post-Service Follow-up', status: 'active' as const, enrolled: 1850, completed: 1480, rate: 80.0, trigger: 'Service Completed', steps: 4, avgDuration: '1.8 days' },
  { id: 'j3', name: 'Re-engagement', status: 'paused' as const, enrolled: 2100, completed: 1260, rate: 60.0, trigger: 'Inactivity (30 days)', steps: 5, avgDuration: '5.2 days' },
];

export function JourneyAutomationView() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Route className="h-6 w-6" /></div>
          <div><h2 className="text-2xl font-bold tracking-tight">Customer Journey Automation</h2><p className="text-muted-foreground">Design and automate customer journeys</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="h-4 w-4" />Create Journey</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Journeys" value="12" icon={Route} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Enrolled Contacts" value="7,370" icon={Users} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Completion Rate" value="78.5%" icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Avg Duration" value="3.1 days" icon={Clock} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      <div className="space-y-4">
        {mockJourneys.map(journey => (
          <Card key={journey.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className={cn('w-1 sm:w-1.5 shrink-0', journey.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500')} />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2"><h4 className="font-semibold">{journey.name}</h4><Badge variant="secondary" className={cn('text-xs', journey.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{journey.status}</Badge></div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{journey.trigger}</span>
                        <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" />{journey.steps} steps</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Avg {journey.avgDuration}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5">{journey.status === 'active' ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}</Button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div><p className="text-xs text-muted-foreground">Enrolled</p><p className="text-lg font-semibold">{journey.enrolled.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-lg font-semibold">{journey.completed.toLocaleString()}</p></div>
                    <div>
                      <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Completion Rate</p><p className="text-xs font-semibold text-emerald-600">{journey.rate}%</p></div>
                      <Progress value={journey.rate} className="mt-1.5 h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── OmnichannelView ───────────────────────────────────────────────
const initialChannels = [
  { id: 'whatsapp', name: 'WhatsApp Business', connected: true, messages: 45230, deliveryRate: 99.2, responseRate: 78.5, color: 'text-green-600', bgColor: 'bg-green-50' },
  { id: 'email', name: 'Email (SMTP)', connected: true, messages: 124500, deliveryRate: 96.8, responseRate: 34.2, color: 'text-red-500', bgColor: 'bg-red-50' },
  { id: 'sms', name: 'SMS (Twilio)', connected: true, messages: 23800, deliveryRate: 98.5, responseRate: 45.3, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { id: 'instagram', name: 'Instagram DM', connected: false, messages: 0, deliveryRate: 0, responseRate: 0, color: 'text-pink-500', bgColor: 'bg-pink-50' },
  { id: 'facebook', name: 'Facebook Messenger', connected: false, messages: 0, deliveryRate: 0, responseRate: 0, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'telegram', name: 'Telegram Bot', connected: false, messages: 0, deliveryRate: 0, responseRate: 0, color: 'text-sky-500', bgColor: 'bg-sky-50' },
];

export function OmnichannelView() {
  const [channels, setChannels] = useState(initialChannels);
  const toggleConnection = (id: string) => setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, connected: !ch.connected } : ch));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><GitBranch className="h-6 w-6" /></div>
        <div><h2 className="text-2xl font-bold tracking-tight">Omnichannel Communication</h2><p className="text-muted-foreground">Connect and manage all communication channels</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Connected Channels" value={`${channels.filter(c => c.connected).length}/${channels.length}`} icon={GitBranch} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Total Messages" value="193.5K" icon={MessageSquare} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Unified Inbox" value="142" subtitle="unread" icon={MessageSquare} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Avg Response" value="8.2 min" icon={Clock} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map(ch => (
          <Card key={ch.id} className={cn('transition-all', ch.connected ? 'ring-1 ring-emerald-200' : 'opacity-80')}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', ch.bgColor, ch.color)}><MessageSquare className="h-5 w-5" /></div>
                  <div><h4 className="font-semibold text-sm">{ch.name}</h4><Badge className={cn('text-[10px] mt-0.5', ch.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{ch.connected ? 'Connected' : 'Disconnected'}</Badge></div>
                </div>
                <Switch checked={ch.connected} onCheckedChange={() => toggleConnection(ch.id)} />
              </div>
              {ch.connected && <div className="mt-4 grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Messages</p><p className="text-sm font-semibold">{ch.messages.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Delivery</p><p className="text-sm font-semibold">{ch.deliveryRate}%</p></div>
              </div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── BillingView ───────────────────────────────────────────────────
const plans = [
  { name: 'Starter', price: 10, features: ['1,000 messages/mo', '1 WhatsApp number', 'Basic templates'], popular: false },
  { name: 'Growth', price: 25, features: ['10,000 messages/mo', '3 WhatsApp numbers', 'Journey automation'], popular: true },
  { name: 'Pro', price: 50, features: ['50,000 messages/mo', '10 WhatsApp numbers', 'AI campaign generator'], popular: false },
  { name: 'Enterprise', price: 0, features: ['Unlimited messages', 'Unlimited numbers', 'Dedicated manager'], popular: false },
];

export function BillingView() {
  const [isYearly, setIsYearly] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><CreditCard className="h-6 w-6" /></div>
        <div><h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2><p className="text-muted-foreground">Manage your plan, usage, and payment methods</p></div>
      </div>
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500 text-white"><Star className="h-7 w-7" /></div>
              <div><div className="flex items-center gap-2"><h3 className="text-xl font-bold">Growth Plan</h3><Badge className="bg-emerald-500 text-white">Current</Badge></div><p className="text-sm text-muted-foreground">Trial ends in <span className="font-semibold text-emerald-600">12 days</span></p></div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">Upgrade to Pro</Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-center gap-3">
        <span className={cn('text-sm', !isYearly && 'font-semibold')}>Monthly</span>
        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
        <span className={cn('text-sm', isYearly && 'font-semibold')}>Yearly</span>
        {isYearly && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Save 20%</Badge>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map(plan => (
          <Card key={plan.name} className={cn('relative overflow-hidden', plan.popular && 'border-emerald-500 ring-1 ring-emerald-500')}>
            {plan.popular && <div className="absolute top-0 right-0 bg-emerald-500 px-3 py-1 text-xs font-semibold text-white rounded-bl-lg">Popular</div>}
            <CardContent className="p-5">
              <h3 className="font-bold mb-1">{plan.name}</h3>
              <div className="mb-3">{plan.price === 0 ? <p className="text-3xl font-bold">Custom</p> : <div className="flex items-baseline gap-1"><span className="text-3xl font-bold">${isYearly ? Math.round(plan.price * 0.8) : plan.price}</span><span className="text-sm text-muted-foreground">/mo</span></div>}</div>
              <ul className="space-y-2 mb-5">{plan.features.map(f => <li key={f} className="flex items-start gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>{f}</span></li>)}</ul>
              <Button className={cn('w-full', plan.popular ? 'bg-emerald-600 hover:bg-emerald-700' : '')} variant={plan.popular ? 'default' : 'outline'}>{plan.price === 0 ? 'Contact Sales' : plan.popular ? 'Current Plan' : 'Select Plan'}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── SalesPipelineView ─────────────────────────────────────────────
const pipelineStages = [
  { name: 'New Lead', color: 'bg-blue-500', deals: [{ title: 'Enterprise SaaS Deal', value: 45000, customer: 'TechCorp Inc.', probability: 10 }] },
  { name: 'Contacted', color: 'bg-cyan-500', deals: [{ title: 'CRM Integration', value: 32000, customer: 'DataFlow Systems', probability: 25 }] },
  { name: 'Qualified', color: 'bg-amber-500', deals: [{ title: 'WhatsApp Business API', value: 18000, customer: 'RetailMax', probability: 40 }] },
  { name: 'Proposal', color: 'bg-violet-500', deals: [{ title: 'Omnichannel Setup', value: 65000, customer: 'GlobalTech', probability: 60 }] },
  { name: 'Negotiation', color: 'bg-orange-500', deals: [{ title: 'Annual Contract Renewal', value: 52000, customer: 'MegaCorp', probability: 75 }] },
  { name: 'Won', color: 'bg-emerald-500', deals: [{ title: 'Chatbot Implementation', value: 38000, customer: 'FinServe Bank', probability: 100 }] },
];

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

export function SalesPipelineView() {
  const totalValue = pipelineStages.reduce((s, st) => s + st.deals.reduce((ds, d) => ds + d.value, 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><TrendingUp className="h-6 w-6" /></div>
          <div><h2 className="text-2xl font-bold tracking-tight">Sales Pipeline</h2><p className="text-muted-foreground">Track and manage deals through every stage</p></div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="h-4 w-4" />Add Deal</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pipeline Value" value={fmt(totalValue)} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Total Deals" value={pipelineStages.reduce((s, st) => s + st.deals.length, 0).toString()} icon={Target} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Won Value" value="$38,000" icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Avg Deal Size" value={fmt(totalValue / pipelineStages.reduce((s, st) => s + st.deals.length, 0))} icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[900px]">
          {pipelineStages.map(stage => (
            <div key={stage.name} className="flex-1 min-w-[140px]">
              <div className="flex items-center gap-2 mb-3"><div className={cn('h-2.5 w-2.5 rounded-full', stage.color)} /><h4 className="text-sm font-semibold">{stage.name}</h4><Badge variant="secondary" className="text-[10px] h-5 px-1.5">{stage.deals.length}</Badge></div>
              {stage.deals.map((deal, i) => (
                <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow mb-2">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{deal.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{deal.customer}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-emerald-600">{fmt(deal.value)}</p>
                      <Badge variant="secondary" className={cn('text-[10px]', deal.probability >= 75 ? 'bg-emerald-100 text-emerald-700' : deal.probability >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')}>{deal.probability}%</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MarketplaceView ───────────────────────────────────────────────
const mockTemplates = [
  { id: 't1', name: 'Lead Nurture Sequence', category: 'lead-followup', installs: 4820, rating: 4.8, steps: 5, author: 'Z.ai Official', featured: true, tags: ['WhatsApp', 'Automation', 'Sales'] },
  { id: 't2', name: 'Appointment Reminder Pro', category: 'appointment', installs: 6340, rating: 4.9, steps: 3, author: 'Z.ai Official', featured: true, tags: ['WhatsApp', 'SMS', 'Healthcare'] },
  { id: 't3', name: 'Payment Collection Flow', category: 'payment', installs: 3150, rating: 4.6, steps: 4, author: 'FinanceHub', featured: false, tags: ['WhatsApp', 'Email', 'Finance'] },
  { id: 't4', name: 'Review Booster', category: 'review', installs: 5280, rating: 4.7, steps: 3, author: 'Z.ai Official', featured: true, tags: ['WhatsApp', 'Google', 'Reputation'] },
  { id: 't5', name: 'Win-back Champion', category: 'winback', installs: 2670, rating: 4.5, steps: 4, author: 'GrowthLab', featured: false, tags: ['WhatsApp', 'Email', 'Retention'] },
  { id: 't6', name: 'Quick Lead Response', category: 'lead-followup', installs: 3940, rating: 4.7, steps: 3, author: 'SalesForceX', featured: false, tags: ['WhatsApp', 'Instant', 'Qualification'] },
];

export function MarketplaceView() {
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setInstalled(prev => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Store className="h-6 w-6" /></div>
        <div><h2 className="text-2xl font-bold tracking-tight">Workflow Marketplace</h2><p className="text-muted-foreground">Discover and install pre-built automation templates</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Templates" value="48" icon={Store} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Total Installs" value="26.2K" icon={Download} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Avg Rating" value="4.7" icon={Star} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Categories" value="5" icon={BarChart3} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockTemplates.map(t => (
          <Card key={t.id} className={cn('hover:shadow-md transition-shadow', t.featured && 'border-emerald-200')}>
            {t.featured && <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-lg" />}
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{t.name}</h4>
                {t.featured && <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5"><Sparkles className="h-2.5 w-2.5 mr-0.5" />Featured</Badge>}
              </div>
              <p className="text-[10px] text-muted-foreground">by {t.author}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">{t.tags.map(tag => <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag}</Badge>)}</div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" />{t.rating}</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" />{t.installs.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{t.steps}</span>
                </div>
                <Button size="sm" variant={installed.has(t.id) ? 'secondary' : 'outline'} className={cn('gap-1.5 text-xs h-7', installed.has(t.id) && 'bg-emerald-100 text-emerald-700')} onClick={() => toggle(t.id)}>
                  {installed.has(t.id) ? <><CheckCircle2 className="h-3 w-3" />Installed</> : <><Download className="h-3 w-3" />Install</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── EnterpriseView ────────────────────────────────────────────────
const auditLogs = [
  { id: '1', user: 'admin@company.com', action: 'LOGIN', resource: 'Authentication', status: 'success', time: '14:32:01' },
  { id: '2', user: 'sarah@company.com', action: 'UPDATE', resource: 'Campaign #C-2847', status: 'success', time: '14:28:15' },
  { id: '3', user: 'mike@company.com', action: 'DELETE', resource: 'Template #T-192', status: 'failure', time: '14:15:42' },
  { id: '4', user: 'admin@company.com', action: 'CREATE', resource: 'User Account', status: 'success', time: '13:58:20' },
  { id: '5', user: 'jessica@company.com', action: 'EXPORT', resource: 'Contact List', status: 'success', time: '13:42:11' },
];

export function EnterpriseView() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Shield className="h-6 w-6" /></div>
        <div><h2 className="text-2xl font-bold tracking-tight">Enterprise Tools</h2><p className="text-muted-foreground">Security, compliance, and monitoring</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Users" value="27" subtitle="+3 today" icon={Users} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Audit Events" value="1,842" subtitle="Last 30d" icon={BarChart3} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Active Webhooks" value="8" subtitle="3 endpoints" icon={MessageSquare} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Data Retention" value="365 days" subtitle="Compliant" icon={Shield} color="text-emerald-700" bg="bg-emerald-50" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Audit Logs</CardTitle><CardDescription>Track all system activities and user actions</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn('text-[10px]', log.action === 'CREATE' ? 'border-emerald-300 text-emerald-700' : log.action === 'UPDATE' ? 'border-blue-300 text-blue-700' : log.action === 'DELETE' ? 'border-red-300 text-red-700' : 'border-purple-300 text-purple-700')}>{log.action}</Badge>
                  <div><p className="text-sm font-medium">{log.resource}</p><p className="text-xs text-muted-foreground">{log.user} &middot; {log.time}</p></div>
                </div>
                <Badge className={cn('text-[10px]', log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{log.status === 'success' ? <><CheckCircle2 className="h-3 w-3 mr-0.5" />Success</> : <>Failure</>}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
