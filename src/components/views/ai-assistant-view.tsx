'use client';

/**
 * AiAssistantView — Full-page AI Assistant & Intelligence Workspace.
 */

import { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Brain,
  Tag,
  BarChart3,
  CheckCircle2,
  Clock,
  Zap,
  Send,
  TrendingUp,
  BookOpen,
  Calendar,
  DollarSign,
  Briefcase,
  Users,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AiChatPanel } from '@/components/dashboard/ai-chat-panel';
import { KnowledgeBasePanel } from '@/components/dashboard/knowledge-base-panel';

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

const INTENT_COLORS: Record<string, string> = {
  complaint: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400',
  booking_request: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
  payment_question: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
  quote_request: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
  follow_up_request: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  neutral: 'text-amber-600 dark:text-amber-400',
  negative: 'text-red-600 dark:text-red-400',
};

export function AiAssistantView() {
  const [activeTab, setActiveTab] = useState('chat');
  const [chatInjectedPrompt, setChatInjectedPrompt] = useState<string | undefined>(undefined);
  const [suggestedReplies] = useState<SuggestedReply[]>([]);
  const [summaries] = useState<ConversationSummary[]>([]);
  const [intents] = useState<DetectedIntent[]>([]);
  const [leadScores] = useState<LeadScore[]>([]);

  const handleTriggerChatPrompt = (prompt: string) => {
    setChatInjectedPrompt(prompt);
    setActiveTab('chat');
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Sparkles className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">AI Copilot & Intelligence</h2>
              <Badge
                variant="secondary"
                className="text-[10px] font-medium h-4 px-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20"
              >
                Tenant-Isolated
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Conversational business insights, schedule queries, and automated intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs px-2.5 py-1">
            <ShieldCheck className="size-3.5 mr-1.5 text-emerald-600" />
            Read-Only Business Engine
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
        <TabsList className="flex-wrap h-auto bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="chat" className="text-xs px-3.5 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Copilot Chat
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs px-3.5 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <BookOpen className="size-3.5 text-blue-500" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="intents" className="text-xs px-3.5 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <Zap className="size-3.5 text-amber-500" />
            Intent Intelligence
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs px-3.5 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <MessageSquare className="size-3.5 text-purple-500" />
            Suggested Replies
          </TabsTrigger>
          <TabsTrigger value="summaries" className="text-xs px-3.5 py-1.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <Brain className="size-3.5 text-indigo-500" />
            Summaries
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Copilot Chat (Split View) ── */}
        <TabsContent value="chat" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Primary Interactive Chat Stream */}
            <div className="h-[calc(100vh-250px)] min-h-[560px]">
              <AiChatPanel initialPrompt={chatInjectedPrompt} />
            </div>

            {/* Quick Actions & Copilot Launchpad Sidebar */}
            <div className="space-y-4">
              <Card className="border-border/80 shadow-2xs">
                <CardContent className="p-4 space-y-3">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-500" />
                    Quick Launchpad
                  </span>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleTriggerChatPrompt('Give me a full overview of today’s business performance, jobs, and revenue.')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-medium text-foreground text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <TrendingUp className="size-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Today&apos;s Business Snapshot</span>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerChatPrompt('Which jobs are scheduled for today, and are any technicians running late?')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-xs font-medium text-foreground text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="size-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">Schedule & Dispatch Review</span>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerChatPrompt('List all overdue invoices with customer names, contact numbers, and total balance.')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/60 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-xs font-medium text-foreground text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DollarSign className="size-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">Overdue Invoice Tracker</span>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerChatPrompt('Show me recent leads that have not been contacted or converted yet.')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-xs font-medium text-foreground text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="size-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">Pending Leads Check</span>
                      </div>
                      <ArrowRight className="size-3 text-muted-foreground group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-2xs">
                <CardContent className="p-4 space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    Security & Data Privacy
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All queries run securely against your tenant database. The AI cannot modify records or expose confidential credentials.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Knowledge Base ── */}
        <TabsContent value="knowledge" className="mt-0">
          <KnowledgeBasePanel />
        </TabsContent>

        {/* ── Tab: Intent Intelligence ── */}
        <TabsContent value="intents" className="mt-0">
          {intents.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="size-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Zap className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Automated Intent Engine Active</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                AI continuously monitors customer inquiries to classify urgent complaints, booking requests, and quote inquiries.
              </p>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                {intents.map((intent) => (
                  <div key={intent.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/30 transition-colors">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                        {intent.customerName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{intent.customerName}</span>
                        <Badge variant="outline" className={INTENT_COLORS[intent.type] || ''}>
                          {intent.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{intent.confidence}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">&quot;{intent.message}&quot;</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{intent.timestamp}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Suggested Replies ── */}
        <TabsContent value="suggestions" className="mt-0">
          {suggestedReplies.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="size-12 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Smart Suggested Replies</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Suggested responses will appear here for inbound customer messages across WhatsApp, SMS, and portal tickets.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {suggestedReplies.map((suggestion) => (
                <Card key={suggestion.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                          {suggestion.customerName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm text-foreground">{suggestion.customerName}</span>
                      <Badge variant="outline" className={INTENT_COLORS[suggestion.intent] || ''}>
                        {suggestion.intent.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{suggestion.confidence}% confidence</Badge>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-xs text-muted-foreground">
                      &quot;{suggestion.message}&quot;
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-medium text-muted-foreground">Suggested Replies:</p>
                      {suggestion.suggestedReplies.map((reply, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-lg border border-border/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors"
                          onClick={() => {
                            toast.success('Reply copied to clipboard');
                            navigator.clipboard.writeText(reply);
                          }}
                        >
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground">{reply}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Summaries ── */}
        <TabsContent value="summaries" className="mt-0">
          {summaries.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="size-12 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <Brain className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Conversation Summaries</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Long customer threads will be automatically summarized here with sentiment and key takeaway action items.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {summaries.map((summary) => (
                <Card key={summary.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                            {summary.customerName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm text-foreground">{summary.customerName}</span>
                      </div>
                      <span className={cn('text-xs font-medium', SENTIMENT_COLORS[summary.sentiment])}>
                        {summary.sentiment}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{summary.summary}</p>
                    <div className="flex flex-wrap gap-1">
                      {summary.keyPoints.map((point, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px]">{point}</Badge>
                      ))}
                    </div>
                    <Badge variant="outline" className={INTENT_COLORS[summary.intent] || ''}>
                      {summary.intent.replace('_', ' ')}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
