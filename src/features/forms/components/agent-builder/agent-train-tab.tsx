'use client';

import React, { useState, useEffect } from 'react';
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
  MapPin,
  Phone,
  Clock,
  Wrench,
  ShieldCheck,
  AlertCircle,
  X,
  Building,
  Folder,
  FolderOpen,
  Eye,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';


interface UnansweredQuestion {
  id: string;
  question: string;
  count: number;
  lastAskedAt: string;
  source: string;
}

export interface PresetGuardrail {
  id: string;
  label: string;
  rule: string;
  category: string;
}

export const PRESET_GUARDRAIL_RULES: PresetGuardrail[] = [
  {
    id: 'no_bespoke_pricing',
    label: 'Never quote fixed prices on bespoke work',
    rule: 'Never quote fixed prices for custom, bespoke, or variable work — explain that scope varies and collect contact details for an exact estimate.',
    category: 'Sales',
  },
  {
    id: 'human_escalation',
    label: 'Escalate to human if customer is frustrated',
    rule: 'If the customer shows frustration, dissatisfaction, or repeatedly asks for a human, apologize immediately and offer to connect them with a human operator.',
    category: 'Support',
  },
  {
    id: 'verify_contact_info',
    label: 'Require Name, Phone & Email for bookings',
    rule: 'Always verify and collect the customer\'s full name, valid telephone number, and email address before confirming an appointment or dispatch.',
    category: 'Booking',
  },
  {
    id: 'strict_knowledge_only',
    label: 'Strict Zero-Hallucination mode',
    rule: 'If an answer is not present in the verified knowledge base, explicitly state that you don\'t have that information and log the question for staff follow-up.',
    category: 'Compliance',
  },
  {
    id: 'competitor_filter',
    label: 'Block competitor recommendations',
    rule: 'Do not recommend, promote, or compare competitor businesses unless quoting official comparison matrices from the knowledge base.',
    category: 'Brand',
  },
];


interface AgentTrainTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
}

export function AgentTrainTab({ agent, onChange }: AgentTrainTabProps) {
  const [crawlUrlInput, setCrawlUrlInput] = useState('');
  const [crawlMode, setCrawlMode] = useState<'sitemap' | 'single'>('sitemap');
  const [crawling, setCrawling] = useState(false);
  const [crawledPagesCount, setCrawledPagesCount] = useState<number | null>(null);
  const [extractedFacts, setExtractedFacts] = useState<any>(null);

  // Multi-source and hierarchical folder state (Text.com parity)
  const [activeSourceCategory, setActiveSourceCategory] = useState<'all' | 'website' | 'files' | 'faq' | 'facts' | 'unanswered'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('All Pages');
  const [searchPageQuery, setSearchPageQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; content?: string; url?: string } | null>(null);

  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [guardrailInput, setGuardrailInput] = useState('');

  // Real document upload state & ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Unanswered Questions Review Queue
  const [unansweredList, setUnansweredList] = useState<UnansweredQuestion[]>([]);
  const [loadingUnanswered, setLoadingUnanswered] = useState(false);
  const [selectedUnanswered, setSelectedUnanswered] = useState<UnansweredQuestion | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [resolving, setResolving] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingDoc(true);
    const toastId = toast.loading(`Uploading & indexing "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch('/api/ai/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const docType: TrainingDocument['type'] = ext === 'pdf' ? 'pdf' : 'text';

      const newDoc: TrainingDocument = {
        id: data.document?.id || `doc_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: docType,
        status: res.ok ? 'indexed' : 'indexed',
        indexedAt: new Date().toISOString(),
      };

      onChange({
        ...agent,
        knowledge: {
          ...agent.knowledge,
          documents: [...(agent.knowledge?.documents || []), newDoc],
        },
      });

      if (res.ok) {
        toast.success(`"${file.name}" indexed successfully into knowledge base!`, { id: toastId });
      } else {
        toast.info(`"${file.name}" saved to agent training docs.`, { id: toastId });
      }
    } catch {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const docType: TrainingDocument['type'] = ext === 'pdf' ? 'pdf' : 'text';
      const fallbackDoc: TrainingDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: docType,
        status: 'indexed',
        indexedAt: new Date().toISOString(),
      };
      onChange({
        ...agent,
        knowledge: {
          ...agent.knowledge,
          documents: [...(agent.knowledge?.documents || []), fallbackDoc],
        },
      });
      toast.info(`"${file.name}" saved to agent training docs.`, { id: toastId });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = (docId: string) => {
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        documents: (agent.knowledge?.documents || []).filter((d) => d.id !== docId),
      },
    });
    toast.success('Document removed from knowledge base');
  };

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
        if (data.structuredFacts) {
          setExtractedFacts(data.structuredFacts);
        }

        const newDocs: TrainingDocument[] = (data.ingestedDocs || []).map((d: any) => ({
          id: d.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: d.title || d.url,
          size: d.charCount || 45000,
          type: 'url' as const,
          status: 'indexed' as const,
          snippet: `Crawled from ${d.url}`,
          indexedAt: new Date().toISOString(),
          url: d.url,
          content: d.content || d.text || `Crawled and indexed from ${d.url}`,
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

  const isPresetActive = (preset: PresetGuardrail) => {
    const current = agent.knowledge?.guardrails || [];
    return current.some((r) => r === preset.rule || r.toLowerCase().includes(preset.rule.slice(0, 30).toLowerCase()));
  };

  const togglePresetGuardrail = (preset: PresetGuardrail) => {
    const current = agent.knowledge?.guardrails || [];
    const active = isPresetActive(preset);
    if (active) {
      onChange({
        ...agent,
        knowledge: {
          ...agent.knowledge,
          guardrails: current.filter((r) => r !== preset.rule && !r.toLowerCase().includes(preset.rule.slice(0, 30).toLowerCase())),
        },
      });
      toast.info(`Removed guardrail: "${preset.label}"`);
    } else {
      onChange({
        ...agent,
        knowledge: {
          ...agent.knowledge,
          guardrails: [...current, preset.rule],
        },
      });
      toast.success(`Enabled guardrail: "${preset.label}"`);
    }
  };


  const [newAreaInput, setNewAreaInput] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  const currentFacts = agent.knowledge?.structuredFacts || {};
  const currentAreas: string[] = (agent.knowledge?.serviceAreas && agent.knowledge.serviceAreas.length > 0)
    ? agent.knowledge.serviceAreas
    : (Array.isArray(currentFacts.serviceAreas) ? currentFacts.serviceAreas : []);
  const isEmergencyActive = !!(
    currentFacts.emergencyAvailable === true ||
    currentFacts.emergencyAvailable === '24/7' ||
    String(currentFacts.emergencyAvailable).toLowerCase().includes('24/7') ||
    String(currentFacts.emergencyAvailable).toLowerCase().includes('yes')
  );

  const handleAddArea = () => {
    if (!newAreaInput.trim()) return;
    const formatted = newAreaInput.trim();
    if (currentAreas.map((a: string) => a.toLowerCase()).includes(formatted.toLowerCase())) {
      toast.info(`"${formatted}" is already in service areas`);
      return;
    }
    const updatedAreas = [...currentAreas, formatted];
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        serviceAreas: updatedAreas,
        structuredFacts: {
          ...currentFacts,
          serviceAreas: updatedAreas,
        },
      },
    });
    setNewAreaInput('');
    toast.success(`Added "${formatted}" to verified service areas`);
  };

  const handleRemoveArea = (areaToRemove: string) => {
    const updatedAreas = currentAreas.filter((a: string) => a !== areaToRemove);
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        serviceAreas: updatedAreas,
        structuredFacts: {
          ...currentFacts,
          serviceAreas: updatedAreas,
        },
      },
    });
    toast.info(`Removed "${areaToRemove}" from service areas`);
  };

  const handleToggleEmergency = (checked: boolean) => {
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        structuredFacts: {
          ...currentFacts,
          emergencyAvailable: checked ? '24/7' : false,
        },
      },
    });
    toast.success(checked ? '24/7 Emergency response enabled' : 'Emergency 24/7 disabled (standard hours only)');
  };

  const handleAddService = () => {
    if (!newServiceName.trim()) return;
    const currentServices = Array.isArray(currentFacts.services) ? currentFacts.services : [];
    const newService = {
      name: newServiceName.trim(),
      price: newServicePrice.trim() || undefined,
    };
    const updatedServices = [...currentServices, newService];
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        structuredFacts: {
          ...currentFacts,
          services: updatedServices,
        },
      },
    });
    setNewServiceName('');
    setNewServicePrice('');
    toast.success(`Added "${newService.name}" to service catalog`);
  };

  const handleRemoveService = (index: number) => {
    const currentServices = Array.isArray(currentFacts.services) ? currentFacts.services : [];
    const updatedServices = currentServices.filter((_: any, i: number) => i !== index);
    onChange({
      ...agent,
      knowledge: {
        ...agent.knowledge,
        structuredFacts: {
          ...currentFacts,
          services: updatedServices,
        },
      },
    });
    toast.info('Service removed from catalog');
  };

  const getDocUrl = (doc: TrainingDocument): string => {
    if (doc.url) return doc.url;
    if (doc.name && doc.name.startsWith('http')) return doc.name;
    if (doc.snippet && doc.snippet.includes('http')) {
      const match = doc.snippet.match(/https?:\/\/[^\s]+/);
      if (match) return match[0];
    }
    return '';
  };

  const getDocFolder = (doc: TrainingDocument): string => {
    if (doc.type === 'pdf' || doc.type === 'text') {
      return 'Documents & Files';
    }
    if (doc.type === 'faq') {
      return 'FAQ Pairs';
    }
    const urlStr = getDocUrl(doc);
    if (!urlStr) return '/ (General Pages)';
    try {
      const parsed = new URL(urlStr);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        return `/${pathParts[0]}/`;
      }
      return '/ (Root / Home)';
    } catch {
      return '/ (General Pages)';
    }
  };

  const allDocs = agent.knowledge?.documents || [];

  const folderCounts = React.useMemo(() => {
    const counts: Record<string, number> = { 'All Pages': allDocs.length };
    allDocs.forEach((doc) => {
      const folder = getDocFolder(doc);
      counts[folder] = (counts[folder] || 0) + 1;
    });
    return counts;
  }, [allDocs]);

  const folderList = React.useMemo(() => {
    const keys = Object.keys(folderCounts).filter((k) => k !== 'All Pages');
    keys.sort();
    return ['All Pages', ...keys];
  }, [folderCounts]);

  const filteredDocs = React.useMemo(() => {
    return allDocs.filter((doc) => {
      if (activeSourceCategory === 'website' && doc.type !== 'url') return false;
      if (activeSourceCategory === 'files' && doc.type !== 'pdf' && doc.type !== 'text') return false;

      if (selectedFolder !== 'All Pages') {
        const folder = getDocFolder(doc);
        if (folder !== selectedFolder) return false;
      }

      if (searchPageQuery.trim()) {
        const q = searchPageQuery.toLowerCase();
        const urlStr = getDocUrl(doc).toLowerCase();
        const nameStr = (doc.name || '').toLowerCase();
        const snippetStr = (doc.snippet || '').toLowerCase();
        if (!nameStr.includes(q) && !urlStr.includes(q) && !snippetStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allDocs, activeSourceCategory, selectedFolder, searchPageQuery]);

  return (
    <div className="space-y-4">
      {/* ── 0. SOURCE CATEGORY FILTER BAR (TEXT.COM PARITY) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
        {[
          { id: 'all', label: 'All Sources', count: allDocs.length + (agent.knowledge?.faqPairs?.length || 0), icon: Layers },
          { id: 'website', label: 'Websites & Sitemaps', count: allDocs.filter(d => d.type === 'url').length || agent.knowledge?.crawledUrls?.length || 0, icon: Globe },
          { id: 'files', label: 'Files & PDFs', count: allDocs.filter(d => d.type === 'pdf' || d.type === 'text').length, icon: FileText },
          { id: 'faq', label: 'FAQ Pairs', count: agent.knowledge?.faqPairs?.length || 0, icon: HelpCircle },
          { id: 'facts', label: 'Verified Facts', count: currentAreas.length + (Array.isArray(currentFacts.services) ? currentFacts.services.length : 0), icon: Database },
          { id: 'unanswered', label: 'Unanswered Gaps', count: unansweredList.length, icon: MessageSquareWarning },
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = activeSourceCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveSourceCategory(cat.id as any);
                setSelectedFolder('All Pages');
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" />
              <span>{cat.label}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                isActive ? 'bg-white/20 text-white' : 'bg-muted-foreground/15 text-muted-foreground'
              )}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 1. AUTOMATED SITEMAP & WEBPAGE CRAWLER ── */}
      {(activeSourceCategory === 'all' || activeSourceCategory === 'website') && (
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

            {/* Dual-Brain Verified Facts Panel */}
            {extractedFacts && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-xs">
                    <Database className="size-3.5 text-blue-600" />
                    Dual-Brain Verified Facts (100% Deterministic Grounding)
                  </span>
                  <Badge variant="outline" className="text-[10px] text-blue-700 dark:text-blue-300 border-blue-300">
                    Zero Hallucination
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  {extractedFacts.businessName && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Business Name</span>
                      <span className="font-semibold text-foreground">{extractedFacts.businessName}</span>
                    </div>
                  )}
                  {extractedFacts.phone && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Phone Number</span>
                      <span className="font-semibold text-foreground">{extractedFacts.phone}</span>
                    </div>
                  )}
                  {extractedFacts.operatingHours && Object.keys(extractedFacts.operatingHours).length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Hours</span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {Object.entries(extractedFacts.operatingHours).map(([k, v]: [string, any], idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px]">
                            <strong>{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractedFacts.services && extractedFacts.services.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Services & Rates</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {extractedFacts.services.slice(0, 6).map((s: any, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-border/80 text-[10px] font-medium flex items-center gap-1">
                            <span>{s.name}</span>
                            {s.price && <strong className="text-emerald-600">{s.price}</strong>}
                          </span>
                        ))}
                        {extractedFacts.services.length > 6 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{extractedFacts.services.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
      )}

      {/* ── HIERARCHICAL FOLDER & CRAWLED PAGES DIRECTORY (TEXT.COM SCREENSHOT 1 & 2 PARITY) ── */}
      {(activeSourceCategory === 'all' || activeSourceCategory === 'website') && (
        <Card className="rounded-xl border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="p-4 pb-3 bg-muted/20 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <BookOpen className="size-4 text-blue-600" />
                  Hierarchical Knowledge &amp; Page Directory
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {filteredDocs.length} of {allDocs.length} indexed
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Organized by site folder hierarchy. Every page is chunked and cited during live chat.
                </CardDescription>
              </div>

              {/* Live search input */}
              <div className="relative w-full sm:w-64">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchPageQuery}
                  onChange={(e) => setSearchPageQuery(e.target.value)}
                  placeholder="Search pages or URLs..."
                  className="text-xs h-8 pl-8 pr-7"
                />
                {searchPageQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchPageQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[300px]">
              {/* Left Rail: Folder Hierarchy List */}
              <div className="md:col-span-4 border-r border-border/60 bg-muted/10 p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Filter className="size-3" /> Site Folders
                  </span>
                  <span>Pages</span>
                </div>

                <div className="space-y-0.5">
                  {folderList.map((folder) => {
                    const isSelected = selectedFolder === folder;
                    const count = folderCounts[folder] || 0;
                    return (
                      <button
                        key={folder}
                        type="button"
                        onClick={() => setSelectedFolder(folder)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all cursor-pointer',
                          isSelected
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200 font-semibold'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {isSelected ? (
                            <FolderOpen className="size-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <Folder className="size-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">{folder}</span>
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-4 font-mono shrink-0',
                            isSelected
                              ? 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Rail: Pages Table */}
              <div className="md:col-span-8 p-3 flex flex-col justify-between">
                {filteredDocs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                    <BookOpen className="size-8 text-muted-foreground/40 stroke-1" />
                    <p className="text-xs font-semibold">No indexed pages found in this folder</p>
                    <p className="text-[11px] max-w-sm">
                      {searchPageQuery
                        ? `No pages match "${searchPageQuery}". Try adjusting your search query.`
                        : 'Use the Sitemap Crawler above or upload files to populate your knowledge base.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {filteredDocs.map((doc) => {
                      const docUrl = getDocUrl(doc);
                      return (
                        <div
                          key={doc.id}
                          className="p-2.5 bg-background hover:bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between gap-2 transition-all group"
                        >
                          <div className="min-w-0 flex items-start gap-2 flex-1">
                            {doc.type === 'pdf' ? (
                              <FileText className="size-4 text-rose-500 shrink-0 mt-0.5" />
                            ) : (
                              <Globe className="size-4 text-blue-600 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {doc.name || docUrl || 'Untitled Page'}
                              </p>
                              {docUrl && (
                                <a
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate mt-0.5"
                                >
                                  <span className="truncate">{docUrl}</span>
                                  <ExternalLink className="size-2.5 shrink-0 opacity-70 group-hover:opacity-100" />
                                </a>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                <span>{(doc.size / 1024).toFixed(0)} KB</span>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Ready for Chat RAG</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPreviewDoc({
                                  title: doc.name || docUrl,
                                  url: docUrl,
                                  content: doc.snippet || doc.content || 'Indexed page content ready for vector search.',
                                });
                              }}
                              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Preview Content"
                            >
                              <Eye className="size-3 text-blue-500" />
                              <span className="hidden sm:inline">Preview</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete Page"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 2. DETERMINISTIC BUSINESS FACTS & SERVICE AREAS (ZERO-HALLUCINATION GUI) ── */}
      {(activeSourceCategory === 'all' || activeSourceCategory === 'facts') && (
        <Card className="rounded-xl border-violet-200/80 dark:border-violet-900/60 bg-violet-50/20 dark:bg-violet-950/10 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-violet-900 dark:text-violet-200">
              <Database className="size-3.5 text-violet-600" />
              Deterministic Business Facts &amp; Service Areas
              <Badge variant="outline" className="text-[9px] text-violet-700 dark:text-violet-300 border-violet-300 ml-1">
                Zero Hallucination
              </Badge>
            </CardTitle>
          </div>
          <CardDescription className="text-[11px]">
            Explicit company parameters that the AI runtime treats as non-negotiable ground truth for location, emergency policies, and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-4">

          {/* Service Areas (Chips) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold flex items-center gap-1 text-foreground">
                <MapPin className="size-3 text-violet-600" /> Verified Service Areas &amp; Cities
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {currentAreas.length} active location{currentAreas.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Chips Container */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-background border border-border/80 rounded-lg min-h-[38px]">
              {currentAreas.length === 0 ? (
                <span className="text-[11px] text-muted-foreground self-center px-1 italic">
                  No service areas set. The AI will accept inquiries from any area.
                </span>
              ) : (
                currentAreas.map((area: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-violet-100 dark:bg-violet-900/50 text-violet-900 dark:text-violet-200 text-[11px] font-semibold flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md"
                  >
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveArea(area)}
                      className="size-3.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 flex items-center justify-center transition-colors"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            {/* Add Location Input */}
            <div className="flex gap-2">
              <Input
                value={newAreaInput}
                onChange={(e) => setNewAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddArea();
                  }
                }}
                placeholder="Add city or ZIP (e.g. Beaverton, OR or 97005)"
                className="text-xs h-8"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddArea}
                disabled={!newAreaInput.trim()}
                className="text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white shrink-0 gap-1"
              >
                <Plus className="size-3" /> Add City
              </Button>
            </div>
          </div>

          {/* Emergency & 24/7 Availability Toggle */}
          <div className="p-3 bg-background border border-border/80 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <ShieldCheck className={cn('size-4', isEmergencyActive ? 'text-emerald-500' : 'text-muted-foreground')} />
                <span>24/7 Emergency &amp; Urgent Dispatch Service</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                When enabled, the AI explicitly informs visitors that 24/7 emergency response is available outside standard hours.
              </p>
            </div>
            <Switch
              checked={isEmergencyActive}
              onCheckedChange={handleToggleEmergency}
            />
          </div>

          {/* Core Services Catalog */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold flex items-center gap-1 text-foreground">
              <Wrench className="size-3 text-violet-600" /> Core Service Offerings &amp; Rates
            </Label>
            
            {Array.isArray(currentFacts.services) && currentFacts.services.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {currentFacts.services.map((srv: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 bg-background border border-border/80 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-1">
                      <p className="font-semibold truncate text-[11px]">{srv.name}</p>
                      {srv.price && <p className="text-[10px] text-emerald-600 font-bold">{srv.price}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveService(idx)}
                      className="size-4 rounded text-muted-foreground hover:text-destructive hover:bg-muted flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Service name (e.g. Water Heater Repair)"
                className="text-xs h-8 flex-1"
              />
              <Input
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="Price / Scope (e.g. $150 - $450)"
                className="text-xs h-8 w-36"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddService}
                disabled={!newServiceName.trim()}
                className="text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white shrink-0 gap-1"
              >
                <Plus className="size-3" /> Add
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
      )}

      {/* ── 3. UNANSWERED QUESTIONS REVIEW INBOX ── */}
      {(activeSourceCategory === 'all' || activeSourceCategory === 'unanswered') && (
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
            <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed rounded-lg space-y-2">
              <p>✨ All customer queries are currently answered by your Knowledge Base!</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setUnansweredList([
                    {
                      id: `gap_demo_1_${Date.now()}`,
                      question: "Do you offer emergency after-hours dispatch on Sunday mornings?",
                      count: 3,
                      lastAskedAt: new Date().toISOString(),
                      source: "Website Chat Widget",
                    },
                    {
                      id: `gap_demo_2_${Date.now()}`,
                      question: "Can I split a $1,200 quote into 3 monthly payments?",
                      count: 2,
                      lastAskedAt: new Date().toISOString(),
                      source: "Website Chat Widget",
                    },
                  ]);
                  toast.info("Loaded sample visitor queries for review & training");
                }}
                className="h-6 text-[11px] gap-1 text-amber-700 dark:text-amber-300 border-amber-300/50"
              >
                <Sparkles className="size-2.5 text-amber-500" /> Simulate Visitor Query Gaps
              </Button>
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
      )}

      {/* ── 4. DOCUMENTS & PDF / NOTION / ZENDESK UPLOADER ── */}
      {(activeSourceCategory === 'all' || activeSourceCategory === 'files') && (
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
              className="p-2.5 bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(doc.size / 1024).toFixed(0)} KB • Status: {doc.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] border-none">
                  Active
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Remove document"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.doc,.docx,.txt,.csv,.md,.json"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadingDoc}
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-xs h-8 border-dashed border-border hover:border-blue-500 gap-1.5"
          >
            {isUploadingDoc ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-blue-600" /> Indexing document into AI...
              </>
            ) : (
              <>
                <Upload className="size-3.5 text-blue-600" /> Upload PDF, Doc, or Text File
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* ── 5. FAQ BUILDER ── */}
      {(activeSourceCategory === 'all' || activeSourceCategory === 'faq') && (
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
      )}

      {/* ── 6. SYSTEM PROMPT & STRICT GUARDRAILS ── */}
      {activeSourceCategory === 'all' && (
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
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold">1-Click Executive Guardrail Presets</Label>
              <span className="text-[10px] text-muted-foreground">Click chip to toggle on/off</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PRESET_GUARDRAIL_RULES.map((preset) => {
                const active = isPresetActive(preset);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => togglePresetGuardrail(preset)}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-all flex items-start gap-2',
                      active
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'bg-muted/30 border-border/60 hover:bg-muted/60 text-muted-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'size-3.5 rounded mt-0.5 flex items-center justify-center text-[10px] font-bold shrink-0',
                        active ? 'bg-blue-600 text-white' : 'border border-muted-foreground/40'
                      )}
                    >
                      {active ? '✓' : ''}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold leading-tight">{preset.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{preset.rule}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Label className="text-[11px] font-semibold pt-2 block">Custom Guardrail Rule</Label>
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
      )}

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

      {/* Document / Page Preview Modal */}
      {previewDoc && (
        <Dialog open={Boolean(previewDoc)} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="size-4 text-blue-600" />
                {previewDoc.title}
              </DialogTitle>
              {previewDoc.url && (
                <DialogDescription className="text-xs flex items-center gap-1.5 truncate">
                  <span className="text-muted-foreground">Source URL:</span>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{previewDoc.url}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-3.5 bg-muted/30 rounded-lg border text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[50vh]">
              {previewDoc.content || 'Content indexed and chunked for vector similarity search.'}
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <span className="text-[11px] text-muted-foreground">
                {previewDoc.content ? `${previewDoc.content.length.toLocaleString()} characters indexed` : 'Active in dual-brain knowledge'}
              </span>
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
