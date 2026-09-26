'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FormAgentData,
  FaqPair,
  TrainingDocument,
} from '@/features/forms/types/agent-types';
import {
  Globe,
  FileText,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Upload,
  ExternalLink,
  MessageSquareWarning,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface UnansweredQuestion {
  id: string;
  question: string;
  count: number;
  lastAskedAt: string;
  source: string;
}

interface AgentTrainTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
}

export function AgentTrainTab({ agent, onChange }: AgentTrainTabProps) {
  const [crawlUrlInput, setCrawlUrlInput] = useState('');
  const [crawlMode, setCrawlMode] = useState<'sitemap' | 'single'>('sitemap');
  const [crawling, setCrawling] = useState(false);
  const [crawledPagesCount, setCrawledPagesCount] = useState<number | null>(null);

  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [guardrailInput, setGuardrailInput] = useState('');

  // Real Document Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const toastId = toast.loading(`Uploading and indexing "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch('/api/ai/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.document) {
        toast.success(`"${file.name}" successfully indexed into Knowledge Base!`, { id: toastId });
        const newDoc: TrainingDocument = {
          id: data.document.id || `doc_${Date.now()}`,
          name: file.name,
          size: file.size,
          type: (file.name.split('.').pop()?.toLowerCase() as any) || 'pdf',
          status: 'indexed',
          snippet: `Uploaded ${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
          indexedAt: new Date().toISOString(),
        };

        onChange({
          ...agent,
          knowledge: {
            ...agent.knowledge,
            documents: [...(agent.knowledge.documents || []), newDoc],
          },
        });
      } else {
        toast.error(data.error || 'Failed to upload document', { id: toastId });
      }
    } catch {
      toast.error('Network error during file upload', { id: toastId });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Unanswered Questions Review Queue
  const [unansweredList, setUnansweredList] = useState<UnansweredQuestion[]>([]);
  const [loadingUnanswered, setLoadingUnanswered] = useState(false);
  const [selectedUnanswered, setSelectedUnanswered] = useState<UnansweredQuestion | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [resolving, setResolving] = useState(false);

  // Fetch unanswered questions on load
  const fetchUnanswered = async () => {
    setLoadingUnanswered(true);
    try {
      const res = await fetch('/api/ai/knowledge/unanswered');
      if (res.ok) {
        const data = await res.json();
        setUnansweredList(data.questions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingUnanswered(false);
    }
  };

  useEffect(() => {
    fetchUnanswered();
  }, []);

  const handleCrawlUrl = async () => {
    if (!crawlUrlInput.trim() || crawling) return;
    setCrawling(true);
    setCrawledPagesCount(null);

    try {
      const res = await fetch('/api/ai/knowledge/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: crawlUrlInput.trim(),
          mode: crawlMode,
          autoIngest: true,
          maxPages: crawlMode === 'sitemap' ? 20 : 1,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Successfully crawled & indexed ${data.ingestedCount || data.pagesDiscovered} pages!`);
        setCrawledPagesCount(data.ingestedCount || data.pagesDiscovered);

        const newDocs: TrainingDocument[] = (data.ingestedDocs || []).map((d: any) => ({
          id: d.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: d.title || d.url,
          size: 45000,
          type: 'url',
          status: 'indexed',
          snippet: `Crawled from ${d.url}`,
          indexedAt: new Date().toISOString(),
        }));

        onChange({
          ...agent,
          knowledge: {
            ...agent.knowledge,
            crawledUrls: [...(agent.knowledge.crawledUrls || []), crawlUrlInput.trim()],
            documents: [...(agent.knowledge.documents || []), ...newDocs],
          },
        });
        setCrawlUrlInput('');
      } else {
        toast.error(data.error || 'Failed to crawl website');
      }
    } catch {
      toast.error('Network error during web crawl');
    } finally {
      setCrawling(false);
    }
  };

  const handleAddFaq = () => {
    if (!faqQ.trim() || !faqA.trim()) {
      toast.error('Please enter both question and answer');
      return;
    }

    const newFaq: FaqPair = {
      id: `faq_${Date.now()}`,
      question: faqQ.trim(),
      answer: faqA.trim(),
    };

    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        faqPairs: [...(agent.knowledge.faqPairs || []), newFaq],
      },
    });

    setFaqQ('');
    setFaqA('');
    toast.success('FAQ added to knowledge base');
  };

  const removeFaq = (id: string) => {
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        faqPairs: agent.knowledge.faqPairs.filter((f) => f.id !== id),
      },
    });
  };

  const handleResolveUnanswered = async () => {
    if (!selectedUnanswered || !answerInput.trim() || resolving) return;
    setResolving(true);

    try {
      const res = await fetch('/api/ai/knowledge/unanswered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUnanswered.id,
          question: selectedUnanswered.question,
          answer: answerInput.trim(),
          action: 'resolve',
        }),
      });

      if (res.ok) {
        toast.success('Answer added to Knowledge Base & question resolved!');

        // Add to agent's FAQ list
        const newFaq: FaqPair = {
          id: `faq_${Date.now()}`,
          question: selectedUnanswered.question,
          answer: answerInput.trim(),
        };
        onChange({
          ...agent,
          knowledge: {
            ...agent.knowledge,
            faqPairs: [...(agent.knowledge.faqPairs || []), newFaq],
          },
        });

        setUnansweredList((prev) => prev.filter((q) => q.id !== selectedUnanswered.id));
        setSelectedUnanswered(null);
        setAnswerInput('');
      } else {
        toast.error('Failed to resolve question');
      }
    } catch {
      toast.error('Error submitting answer');
    } finally {
      setResolving(false);
    }
  };

  const handleAddGuardrail = () => {
    if (!guardrailInput.trim()) return;
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        guardrails: [...(agent.knowledge.guardrails || []), guardrailInput.trim()],
      },
    });
    setGuardrailInput('');
  };

  const removeGuardrail = (index: number) => {
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        guardrails: agent.knowledge.guardrails.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* ── 1. AUTOMATED SITEMAP & WEBPAGE CRAWLER ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <Globe className="size-3.5 text-blue-600" /> Automated Sitemap & URL Crawler (SiteGPT Parity)
            </CardTitle>
            <div className="flex items-center gap-1 text-[11px] bg-muted/60 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setCrawlMode('sitemap')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  crawlMode === 'sitemap' ? 'bg-white dark:bg-slate-800 shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
              >
                🗺️ Full Sitemap.xml
              </button>
              <button
                type="button"
                onClick={() => setCrawlMode('single')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  crawlMode === 'single' ? 'bg-white dark:bg-slate-800 shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
              >
                📄 Single URL
              </button>
            </div>
          </div>
          <CardDescription className="text-[11px]">
            {crawlMode === 'sitemap'
              ? 'Automatically discovers and indexes all subpages from your sitemap.xml into vector embeddings.'
              : 'Crawls and indexes a specific landing page, service page, or pricing sheet.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex gap-2">
            <Input
              value={crawlUrlInput}
              onChange={(e) => setCrawlUrlInput(e.target.value)}
              placeholder={crawlMode === 'sitemap' ? 'https://example.com/sitemap.xml' : 'https://example.com/pricing'}
              className="text-xs h-8"
              disabled={crawling}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCrawlUrl}
              disabled={crawling || !crawlUrlInput.trim()}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5"
            >
              {crawling ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3" />}
              <span>{crawling ? 'Crawling...' : 'Crawl & Index'}</span>
            </Button>
          </div>

          {crawledPagesCount !== null && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Indexed {crawledPagesCount} pages into Agent RAG Knowledge Base
              </span>
            </div>
          )}

          {/* List of Crawled Sources */}
          {agent.knowledge?.crawledUrls?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Indexed Sources</p>
              {agent.knowledge.crawledUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-[11px] text-foreground truncate max-w-[280px]">
                    {url}
                  </span>
                  <Badge variant="secondary" className="text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                    ✓ Active Vector Sync
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 2. UNANSWERED QUESTIONS REVIEW INBOX ── */}
      <Card className="rounded-xl border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <MessageSquareWarning className="size-3.5 text-amber-500" /> Unanswered Questions Review Queue
              {unansweredList.length > 0 && (
                <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 h-4">
                  {unansweredList.length} Pending
                </Badge>
              )}
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchUnanswered}
              disabled={loadingUnanswered}
              className="h-6 text-[10px] gap-1 text-muted-foreground"
            >
              <RefreshCw className={`size-2.5 ${loadingUnanswered ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          <CardDescription className="text-[11px]">
            Queries asked by visitors where AI confidence was low. Click to add a 1-click answer to your knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {unansweredList.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
              ✨ All customer queries are currently answered by your Knowledge Base!
            </div>
          ) : (
            <div className="space-y-2">
              {unansweredList.slice(0, 5).map((q) => (
                <div
                  key={q.id}
                  className="p-2.5 bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="space-y-0.5 max-w-[260px]">
                    <p className="text-xs font-bold text-foreground truncate">"{q.question}"</p>
                    <p className="text-[10px] text-muted-foreground">
                      Asked {q.count} time{q.count > 1 ? 's' : ''} • Source: {q.source}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setSelectedUnanswered(q);
                      setAnswerInput('');
                    }}
                    className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white gap-1 shrink-0"
                  >
                    <Plus className="size-3" /> Answer &amp; Train
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. DOCUMENTS & PDF / NOTION / ZENDESK UPLOADER ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="size-3.5 text-blue-600" /> Training Documents, PDFs &amp; Notion
          </CardTitle>
          <CardDescription className="text-[11px]">
            Upload brochures, medical policies, warranty terms, or Notion/Zendesk docs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {agent.knowledge?.documents?.map((doc) => (
            <div
              key={doc.id}
              className="p-2.5 bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-blue-600" />
                <div>
                  <p className="text-xs font-semibold text-foreground truncate max-w-[240px]">
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(doc.size / 1024).toFixed(0)} KB • Status: {doc.status}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] border-none">
                Active
              </Badge>
            </div>
          ))}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRealFileUpload}
            accept=".pdf,.doc,.docx,.txt,.csv,.md"
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadingDoc}
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-xs h-8 border-dashed border-border hover:border-blue-500 gap-1.5 cursor-pointer"
          >
            {uploadingDoc ? (
              <Loader2 className="size-3.5 text-blue-600 animate-spin" />
            ) : (
              <Upload className="size-3.5 text-blue-600" />
            )}
            <span>{uploadingDoc ? 'Indexing Document...' : 'Upload PDF, Doc, or Text File'}</span>
          </Button>
        </CardContent>
      </Card>

      {/* ── 4. FAQ BUILDER ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-blue-600" /> Q&amp;A FAQ Knowledge Pairs
          </CardTitle>
          <CardDescription className="text-[11px]">
            Deterministic answers for common customer questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="space-y-2 p-3 bg-muted/30 border border-border/60 rounded-xl">
            <Input
              value={faqQ}
              onChange={(e) => setFaqQ(e.target.value)}
              placeholder="Question: e.g. Do you accept emergency walk-ins?"
              className="text-xs h-8"
            />
            <Textarea
              value={faqA}
              onChange={(e) => setFaqA(e.target.value)}
              placeholder="Answer: e.g. Yes, our clinic welcomes walk-ins from 9 AM to 5 PM."
              rows={2}
              className="text-xs resize-none"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddFaq}
              className="w-full text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white gap-1"
            >
              <Plus className="size-3" /> Add FAQ Pair
            </Button>
          </div>

          <div className="space-y-2">
            {agent.knowledge?.faqPairs?.map((faq) => (
              <div
                key={faq.id}
                className="p-2.5 bg-muted/40 border border-border/60 rounded-lg space-y-1 relative group"
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs font-bold text-foreground pr-6">Q: {faq.question}</p>
                  <button
                    type="button"
                    onClick={() => removeFaq(faq.id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">A: {faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 5. SYSTEM PROMPT & STRICT GUARDRAILS ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="size-3.5 text-blue-600" /> System Instructions &amp; Guardrails
          </CardTitle>
          <CardDescription className="text-[11px]">
            Set strict boundaries and behavioral rules for this AI agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold">Master System Prompt</Label>
            <Textarea
              value={agent.knowledge?.systemPrompt}
              onChange={(e) =>
                onChange({
                  ...agent,
                  knowledge: { ...agent.knowledge, systemPrompt: e.target.value },
                })
              }
              rows={3}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-2 pt-1">
            <Label className="text-[11px] font-semibold">Guardrail Rules</Label>
            <div className="flex gap-2">
              <Input
                value={guardrailInput}
                onChange={(e) => setGuardrailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddGuardrail(); }}
                placeholder="e.g. Never prescribe medications or quote final surgery costs"
                className="text-xs h-8"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddGuardrail}
                className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                Add Rule
              </Button>
            </div>

            <div className="space-y-1.5 pt-1">
              {agent.knowledge?.guardrails?.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg flex items-center justify-between text-xs"
                >
                  <span className="text-red-900 dark:text-red-200">{rule}</span>
                  <button
                    type="button"
                    onClick={() => removeGuardrail(idx)}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answer & Train Dialog */}
      {selectedUnanswered && (
        <Dialog open={Boolean(selectedUnanswered)} onOpenChange={() => setSelectedUnanswered(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles className="size-4 text-amber-500" /> Answer Customer Question &amp; Train AI
              </DialogTitle>
              <DialogDescription className="text-xs">
                Provide the correct answer below. It will be indexed immediately so your AI agent can answer accurately in future chats.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visitor Question</p>
                <p className="text-xs font-semibold text-foreground">"{selectedUnanswered.question}"</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Your Official Answer</Label>
                <Textarea
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="e.g. Yes, we offer a 10-year structural warranty on all residential projects..."
                  rows={4}
                  className="text-xs"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedUnanswered(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleResolveUnanswered}
                disabled={!answerInput.trim() || resolving}
                className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
              >
                {resolving ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                <span>Add to Knowledge Base</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
