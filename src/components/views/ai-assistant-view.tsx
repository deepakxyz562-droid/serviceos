'use client';

import { useState } from 'react';
import {
  Sparkles, MessageSquare, Brain, Tag, BarChart3,
  AlertCircle, CheckCircle2, Clock, Zap, Send,
  TrendingUp, Users, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SuggestedReply {
  id: string;
  conversationId: string;
  customerName: string;
  message: string;
  suggestedReplies: string[];
  confidence: number;
  intent: string;
}

interface ConversationSummary {
  id: string;
  customerName: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
}

interface DetectedIntent {
  id: string;
  type: 'complaint' | 'booking_request' | 'payment_question' | 'quote_request' | 'follow_up_request';
  customerName: string;
  message: string;
  confidence: number;
  timestamp: string;
}

interface LeadScore {
  id: string;
  customerName: string;
  score: number;
  factors: { label: string; value: string; impact: 'high' | 'medium' | 'low' }[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_SUGGESTED_REPLIES: SuggestedReply[] = [
  { id: 'sr1', conversationId: 'c1', customerName: 'Alex Rivera', message: 'My delivery is late, where is it?', suggestedReplies: ['I apologize for the delay. Let me check the status of your delivery right away.', 'I\'m sorry about the delay. I can see your order is on its way and should arrive within 30 minutes.', 'I understand your frustration. Let me escalate this to our logistics team immediately.'], confidence: 92, intent: 'complaint' },
  { id: 'sr2', conversationId: 'c2', customerName: 'Maria Santos', message: 'I want to book a cleaning for next week', suggestedReplies: ['Great! I can help you book a cleaning. What date works best for you?', 'I\'d be happy to schedule that! We have availability on Monday, Wednesday, and Friday next week.'], confidence: 95, intent: 'booking_request' },
  { id: 'sr3', conversationId: 'c3', customerName: 'Robert Kim', message: 'How much do I owe on my last invoice?', suggestedReplies: ['Your last invoice #INV-0045 for $350 is currently pending. Would you like me to send you a payment link?', 'You have one outstanding invoice of $350. I can send a payment link via WhatsApp if you\'d like.'], confidence: 88, intent: 'payment_question' },
];

const MOCK_SUMMARIES: ConversationSummary[] = [
  { id: 's1', customerName: 'Alex Rivera', summary: 'Customer inquired about a delayed delivery for order #4521. They are frustrated and want a status update.', keyPoints: ['Order #4521 delayed', 'Customer is frustrated', 'Needs delivery status update'], sentiment: 'negative', intent: 'complaint' },
  { id: 's2', customerName: 'Maria Santos', summary: 'Repeat customer wants to book a cleaning service for next week. Previously satisfied with our services.', keyPoints: ['Repeat customer', 'Booking for next week', 'Previously satisfied'], sentiment: 'positive', intent: 'booking_request' },
  { id: 's3', customerName: 'Robert Kim', summary: 'Customer asking about outstanding invoice balance. May need payment assistance.', keyPoints: ['Outstanding invoice inquiry', 'May need payment plan', 'VIP customer'], sentiment: 'neutral', intent: 'payment_question' },
];

const MOCK_INTENTS: DetectedIntent[] = [
  { id: 'i1', type: 'complaint', customerName: 'Alex Rivera', message: 'This is unacceptable! My order is 2 days late!', confidence: 96, timestamp: '2 min ago' },
  { id: 'i2', type: 'booking_request', customerName: 'Maria Santos', message: 'Can I schedule a cleaning for next Tuesday?', confidence: 94, timestamp: '5 min ago' },
  { id: 'i3', type: 'payment_question', customerName: 'Robert Kim', message: 'What\'s my balance? I think I missed a payment.', confidence: 89, timestamp: '12 min ago' },
  { id: 'i4', type: 'quote_request', customerName: 'Lisa Park', message: 'How much would a deep cleaning cost for my apartment?', confidence: 91, timestamp: '25 min ago' },
  { id: 'i5', type: 'follow_up_request', customerName: 'James Wilson', message: 'Any update on my job request from yesterday?', confidence: 85, timestamp: '30 min ago' },
];

const MOCK_LEAD_SCORES: LeadScore[] = [
  { id: 'ls1', customerName: 'Robert Kim', score: 88, factors: [{ label: 'Revenue', value: '$6,200 total', impact: 'high' }, { label: 'Frequency', value: '15 jobs', impact: 'high' }, { label: 'Recency', value: '1 hr ago', impact: 'medium' }] },
  { id: 'ls2', customerName: 'Alex Rivera', score: 72, factors: [{ label: 'Revenue', value: '$4,500 total', impact: 'high' }, { label: 'Frequency', value: '8 jobs', impact: 'medium' }, { label: 'Recency', value: '2 hrs ago', impact: 'low' }] },
  { id: 'ls3', customerName: 'Maria Santos', score: 65, factors: [{ label: 'Revenue', value: '$2,800 total', impact: 'medium' }, { label: 'Frequency', value: '5 jobs', impact: 'medium' }, { label: 'Recency', value: '5 min ago', impact: 'high' }] },
];

const INTENT_COLORS: Record<string, string> = {
  complaint: 'bg-red-100 text-red-700 border-red-200',
  booking_request: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  payment_question: 'bg-amber-100 text-amber-700 border-amber-200',
  quote_request: 'bg-purple-100 text-purple-700 border-purple-200',
  follow_up_request: 'bg-blue-100 text-blue-700 border-blue-200',
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'text-emerald-600',
  neutral: 'text-amber-600',
  negative: 'text-red-600',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AiAssistantView() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedReply | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const handleApplyReply = (reply: string) => {
    toast.success('Reply applied to conversation');
    setShowDetailDialog(false);
  };

  const handleApplyTag = (tag: string) => {
    toast.success(`Tag "${tag}" applied`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Sparkles}
        title="AI Assistant"
        description="AI-powered conversation intelligence"
        badge={
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Sparkles className="size-3 mr-1" /> AI Active
          </Badge>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <StatCard label="Suggestions" value={MOCK_SUGGESTED_REPLIES.length} icon={MessageSquare} color="text-teal-600" />
        <StatCard label="Summaries" value={MOCK_SUMMARIES.length} icon={Brain} color="text-purple-600" />
        <StatCard label="Intents Detected" value={MOCK_INTENTS.length} icon={Zap} color="text-orange-600" />
        <StatCard label="Lead Scores" value={MOCK_LEAD_SCORES.length} icon={TrendingUp} color="text-emerald-600" />
        <StatCard label="Avg Confidence" value="91%" icon={BarChart3} color="text-green-600" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="suggestions" className="text-xs">Suggested Replies</TabsTrigger>
          <TabsTrigger value="summaries" className="text-xs">Summaries</TabsTrigger>
          <TabsTrigger value="intents" className="text-xs">Intent Detection</TabsTrigger>
          <TabsTrigger value="leads" className="text-xs">Lead Scoring</TabsTrigger>
          <TabsTrigger value="tags" className="text-xs">Auto Tags</TabsTrigger>
        </TabsList>

        {/* Suggested Replies */}
        <TabsContent value="suggestions">
          <div className="space-y-4">
            {MOCK_SUGGESTED_REPLIES.map(suggestion => (
              <Card key={suggestion.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="size-7"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{suggestion.customerName[0]}</AvatarFallback></Avatar>
                        <span className="font-medium text-sm">{suggestion.customerName}</span>
                        <Badge variant="outline" className={INTENT_COLORS[suggestion.intent] || ''}>{suggestion.intent.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className={cn('text-[10px] gap-1', suggestion.confidence >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : suggestion.confidence >= 80 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200')}>{suggestion.confidence}% confidence</Badge>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2 mb-3 text-sm text-muted-foreground">
                        &quot;{suggestion.message}&quot;
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Suggested Replies:</p>
                        {suggestion.suggestedReplies.map((reply, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg border hover:bg-emerald-50 cursor-pointer transition-colors" onClick={() => { setSelectedSuggestion(suggestion); setShowDetailDialog(true); }}>
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-sm">{reply}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Summaries */}
        <TabsContent value="summaries">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_SUMMARIES.map(summary => (
              <Card key={summary.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{summary.customerName[0]}</AvatarFallback></Avatar>
                      <span className="font-medium text-sm">{summary.customerName}</span>
                    </div>
                    <span className={cn('text-xs font-medium', SENTIMENT_COLORS[summary.sentiment])}>
                      {summary.sentiment}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{summary.summary}</p>
                  <div className="flex flex-wrap gap-1">
                    {summary.keyPoints.map((point, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px]">{point}</Badge>
                    ))}
                  </div>
                  <Badge variant="outline" className={INTENT_COLORS[summary.intent] || ''}>{summary.intent.replace('_', ' ')}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Intents */}
        <TabsContent value="intents">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {MOCK_INTENTS.map(intent => (
                  <div key={intent.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <Avatar className="size-8"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{intent.customerName[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{intent.customerName}</span>
                        <Badge variant="outline" className={INTENT_COLORS[intent.type] || ''}>{intent.type.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className={cn('text-[10px] gap-1', intent.confidence >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : intent.confidence >= 80 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200')}>{intent.confidence}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">&quot;{intent.message}&quot;</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{intent.timestamp}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Scoring */}
        <TabsContent value="leads">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_LEAD_SCORES.map(lead => (
              <Card key={lead.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8"><AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">{lead.customerName[0]}</AvatarFallback></Avatar>
                      <span className="font-medium">{lead.customerName}</span>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-2xl font-bold', lead.score >= 80 ? 'text-emerald-600' : lead.score >= 60 ? 'text-amber-600' : 'text-slate-500')}>{lead.score}</p>
                      <p className="text-[10px] text-muted-foreground">Lead Score</p>
                    </div>
                  </div>
                  <Progress value={lead.score} className="h-2" />
                  <div className="space-y-1">
                    {lead.factors.map((factor, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{factor.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{factor.value}</span>
                          <Badge variant="outline" className={factor.impact === 'high' ? 'bg-emerald-100 text-emerald-700 text-[8px]' : factor.impact === 'medium' ? 'bg-amber-100 text-amber-700 text-[8px]' : 'bg-slate-100 text-slate-600 text-[8px]'}>{factor.impact}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Auto Tags */}
        <TabsContent value="tags">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { tag: 'urgent', category: 'Priority', auto: true, count: 23 },
                  { tag: 'complaint', category: 'Sentiment', auto: true, count: 15 },
                  { tag: 'booking_request', category: 'Intent', auto: true, count: 42 },
                  { tag: 'payment_issue', category: 'Intent', auto: true, count: 18 },
                  { tag: 'vip', category: 'Value', auto: false, count: 67 },
                  { tag: 'repeat_customer', category: 'Behavior', auto: true, count: 89 },
                  { tag: 'at_risk', category: 'Risk', auto: true, count: 12 },
                  { tag: 'high_value', category: 'Value', auto: true, count: 34 },
                ].map(item => (
                  <div key={item.tag} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{item.tag}</Badge>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{item.count} contacts</span>
                      <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => handleApplyTag(item.tag)}>
                        {item.auto ? 'Auto-applied' : 'Apply'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI Suggested Reply</DialogTitle>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Customer message:</p>
                &quot;{selectedSuggestion.message}&quot;
              </div>
              <div className="space-y-2">
                {selectedSuggestion.suggestedReplies.map((reply, i) => (
                  <button key={i} className="w-full text-left p-3 rounded-lg border hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-sm" onClick={() => handleApplyReply(reply)}>
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
