'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AgentTrainTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
}

export function AgentTrainTab({ agent, onChange }: AgentTrainTabProps) {
  const [crawlUrlInput, setCrawlUrlInput] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [guardrailInput, setGuardrailInput] = useState('');

  const handleCrawlUrl = async () => {
    if (!crawlUrlInput.trim() || crawling) return;
    setCrawling(true);

    try {
      const res = await fetch(`/api/forms/agents/${agent.id}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          url: crawlUrlInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.item) {
        toast.success('Website indexed successfully!');
        onChange({
          ...agent,
          knowledge: {
            ...agent.knowledge,
            crawledUrls: [...(agent.knowledge.crawledUrls || []), crawlUrlInput.trim()],
            documents: [...(agent.knowledge.documents || []), data.item],
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
      {/* ── 1. WEBSITE CRAWLER ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5">
            <Globe className="size-3.5 text-blue-600" /> Webpage Knowledge Crawler
          </CardTitle>
          <CardDescription className="text-[11px]">
            AI crawls your website or booking page to index procedures, pricing, and FAQs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex gap-2">
            <Input
              value={crawlUrlInput}
              onChange={(e) => setCrawlUrlInput(e.target.value)}
              placeholder="https://example.com/services"
              className="text-xs h-8"
              disabled={crawling}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCrawlUrl}
              disabled={crawling || !crawlUrlInput.trim()}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1"
            >
              {crawling ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3" />}
              <span>Index URL</span>
            </Button>
          </div>

          {/* List of Crawled Sources */}
          {agent.knowledge?.crawledUrls?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {agent.knowledge.crawledUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-[11px] text-foreground truncate max-w-[280px]">
                    {url}
                  </span>
                  <Badge variant="secondary" className="text-[9px] text-emerald-600 bg-emerald-50">
                    ✓ Indexed
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 2. DOCUMENTS & PDF UPLOADER ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="size-3.5 text-blue-600" /> Training Documents & PDFs
          </CardTitle>
          <CardDescription className="text-[11px]">
            Upload brochures, medical policies, or warranty terms.
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
              <Badge className="bg-emerald-100 text-emerald-700 text-[9px] border-none">
                Active
              </Badge>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const mockDoc: TrainingDocument = {
                id: `doc_${Date.now()}`,
                name: 'New_Dental_Guidelines.pdf',
                size: 180000,
                type: 'pdf',
                status: 'indexed',
                indexedAt: new Date().toISOString(),
              };
              onChange({
                ...agent,
                knowledge: {
                  ...agent.knowledge,
                  documents: [...(agent.knowledge.documents || []), mockDoc],
                },
              });
              toast.success('Document uploaded and indexed!');
            }}
            className="w-full text-xs h-8 border-dashed border-border hover:border-blue-500 gap-1.5"
          >
            <Upload className="size-3.5 text-blue-600" /> Upload PDF or Doc
          </Button>
        </CardContent>
      </Card>

      {/* ── 3. FAQ BUILDER ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-blue-600" /> Q&A FAQ Knowledge Pairs
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

      {/* ── 4. SYSTEM PROMPT & STRICT GUARDRAILS ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="size-3.5 text-blue-600" /> System Instructions & Guardrails
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
    </div>
  );
}
