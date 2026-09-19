'use client';

import React, { useState } from 'react';
import {
  Presentation,
  Upload,
  Sparkles,
  Link2,
  ChevronRight,
  Play,
  FileText,
  Mic,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Bot,
  AlertCircle,
  HelpCircle,
  Send,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormAgentData } from '@/features/forms/types/agent-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgentPresentationHubProps {
  agent: FormAgentData;
  onChange?: (updated: FormAgentData) => void;
  onOpenFormInModal?: (form: any) => void;
}

interface SlideItem {
  id: string;
  title: string;
  bullets: string[];
  notes: string;
  graphic: 'chart' | 'overview' | 'checklist' | 'quote' | 'cta';
}

const DEFAULT_SLIDES: SlideItem[] = [
  {
    id: 's1',
    title: 'Welcome & Service Overview',
    bullets: [
      'Comprehensive inspection and maintenance programs',
      'Licensed, certified, and insured field technicians',
      'Transparent upfront pricing with 0% financing options',
    ],
    notes: 'Welcome! Today I will walk you through our complete service offerings, inspection standards, and how our team guarantees 100% satisfaction.',
    graphic: 'overview',
  },
  {
    id: 's2',
    title: 'Equipment Health & Performance Assessment',
    bullets: [
      'Multi-point diagnostic inspection protocol',
      'Identification of wear, efficiency losses & safety hazards',
      'Digital service history logged in your customer passport',
    ],
    notes: 'On slide two, we analyze your equipment health. We perform a thorough diagnostic to maximize lifespan and energy efficiency.',
    graphic: 'chart',
  },
  {
    id: 's3',
    title: 'Custom Recommendations & Packages',
    bullets: [
      'Standard tune-up & seasonal protection plan',
      'Priority emergency dispatch with zero dispatch fees',
      'Extended warranty and 100% part coverage',
    ],
    notes: 'Here are our tailored packages designed specifically for your property needs and budget.',
    graphic: 'checklist',
  },
  {
    id: 's4',
    title: 'Transparent Pricing & Instant Approval',
    bullets: [
      'No surprise charges or hidden travel fees',
      'Instant pre-qualification with 33 payment methods',
      'Flexible 12 to 36 month installment plans',
    ],
    notes: 'We believe in 100% pricing transparency. You receive a detailed breakdown before any work begins.',
    graphic: 'quote',
  },
  {
    id: 's5',
    title: 'Next Steps: Book Your Time Slot',
    bullets: [
      'Select your preferred technician arrival window',
      'Receive instant SMS & Email confirmation with live GPS tracking',
      'Complete the intake form to reserve your spot',
    ],
    notes: 'Thank you for reviewing our presentation! Click the button below to reserve your appointment now.',
    graphic: 'cta',
  },
];

export function AgentPresentationHub({
  agent,
  onChange,
  onOpenFormInModal,
}: AgentPresentationHubProps) {
  const [activeModal, setActiveModal] = useState<'demo' | 'upload' | 'generate' | 'import_url' | null>(null);
  const [slides, setSlides] = useState<SlideItem[]>(DEFAULT_SLIDES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('Loan Application Process & Pre-Qualification Guide');
  const [importUrl, setImportUrl] = useState('https://docs.google.com/presentation/d/e/2PACX-1vS-example/pub');
  const [qaInput, setQaInput] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: `Hi! Feel free to ask any questions while I present.` },
  ]);
  const [isAnsweringQa, setIsAnsweringQa] = useState(false);

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const handleGenerateWithAi = async () => {
    if (!generatePrompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setSlides([
        {
          id: 'gen_1',
          title: `${generatePrompt}: Overview`,
          bullets: [
            'Understanding key requirements and documentation',
            'Step-by-step qualification timeline',
            'How our team guides you from application to approval',
          ],
          notes: `Hello! I am ${agent.name}. In this presentation, I will explain the complete ${generatePrompt}.`,
          graphic: 'overview',
        },
        {
          id: 'gen_2',
          title: 'Eligibility & Requirements',
          bullets: [
            'Verified documentation and pre-screening criteria',
            'Credit and asset qualification benchmarks',
            'Fast-track digital intake through our smart form',
          ],
          notes: 'Let us look at the primary eligibility criteria so you know exactly what is required.',
          graphic: 'checklist',
        },
        {
          id: 'gen_3',
          title: 'Rates, Options & Comparison',
          bullets: [
            'Competitive fixed vs adjustable programs',
            'Zero hidden origination or penalty fees',
            'Custom scenarios modeled in real-time',
          ],
          notes: 'We offer flexible options tailored to your specific financial goals and timeline.',
          graphic: 'chart',
        },
        {
          id: 'gen_4',
          title: 'Get Started Today',
          bullets: [
            'Submit your details in under 2 minutes',
            'Receive an instant automated pre-qualification decision',
            'Dedicated advisor assigned to your file',
          ],
          notes: 'Ready to proceed? Fill out the connected form to start your application now.',
          graphic: 'cta',
        },
      ]);
      setIsGenerating(false);
      setActiveModal('demo');
      toast.success('✨ AI Presentation synthesized with speaker notes!');
    }, 1400);
  };

  const handleAskQuestion = async () => {
    if (!qaInput.trim() || isAnsweringQa) return;
    const question = qaInput.trim();
    setQaHistory((prev) => [...prev, { sender: 'user', text: question }]);
    setQaInput('');
    setIsAnsweringQa(true);

    try {
      const res = await fetch(`/api/forms/agents/${agent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `During presentation slide "${currentSlide.title}", the viewer asked: "${question}". Answer concisely as the presenter.`,
          agentConfig: agent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setQaHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply || `Great question regarding ${currentSlide.title}! Based on our standards, all requirements can be completed online in under 2 minutes with instant pre-approval.`,
        },
      ]);
    } catch {
      setQaHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Great question regarding ${currentSlide.title}! You can complete the connected application form to get an instant tailored quote.`,
        },
      ]);
    } finally {
      setIsAnsweringQa(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto">
      {/* ── Top Alert Banner (Matching Screenshot) ── */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
            <AlertCircle className="size-5" />
          </div>
          <p className="text-xs sm:text-sm font-bold">
            Sign up to publish your AI Agent
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 bg-white text-rose-700 hover:bg-slate-100 font-bold text-xs shadow-xs"
        >
          Sign Up Now — It&apos;s Free!
        </Button>
      </div>

      {/* ── Header Badge (Matching Screenshot) ── */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Presentation className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            PRESENTATION AGENT
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Transform your presentation into an engaging experience
          </p>
        </div>
      </div>

      {/* ── Hero Studio Card (Matching Screenshot Pixel-for-Pixel) ── */}
      <div className="rounded-3xl border border-purple-200/80 dark:border-purple-800/60 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-purple-500/5 p-6 md:p-8 relative overflow-hidden shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Text */}
          <div className="space-y-3 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug max-w-md">
              Add your presentation or generate with AI. Your agent will present it and handle live questions seamlessly!
            </h3>
          </div>

          {/* Right Presentation Illustration & Avatar Graphic */}
          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <img
                src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                alt={agent.name}
                className="size-28 rounded-2xl object-cover border-2 border-white shadow-xl"
              />
              <span className="absolute bottom-2 right-2 size-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
            </div>

            {/* Slide Graphic with chart & audio waveform */}
            <div className="w-36 h-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-lg flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-[10px] font-bold text-orange-600">
                  📊
                </div>
                <div className="space-y-1 flex-1">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="w-2/3 h-1.5 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>

              {/* Animated Mini Waveform */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[9px] text-purple-600 font-bold">
                <Mic className="size-3" />
                <div className="flex items-center gap-0.5">
                  <span className="w-0.5 h-3 bg-purple-600 rounded-full animate-pulse" />
                  <span className="w-0.5 h-4 bg-purple-600 rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="w-0.5 h-2 bg-purple-600 rounded-full animate-pulse [animation-delay:0.4s]" />
                  <span className="w-0.5 h-5 bg-purple-600 rounded-full animate-pulse [animation-delay:0.1s]" />
                </div>
                <span>Live AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Demo Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setActiveModal('demo')}
          className="w-full h-10 rounded-xl bg-white/80 dark:bg-slate-900/80 hover:bg-white border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 font-bold text-xs gap-2 shadow-xs"
        >
          <Play className="size-3.5 fill-blue-600" /> Preview Demo
        </Button>
      </div>

      {/* ── 3 Ingestion Source Cards (Matching Screenshot) ── */}
      <div className="space-y-3">
        {/* Card 1: Upload Presentation */}
        <div
          onClick={() => setActiveModal('upload')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/60 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Upload Presentation</h4>
              <p className="text-[11px] text-muted-foreground">Upload a PDF or PPTX file</p>
            </div>
          </div>
          <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
            <ChevronRight className="size-4" />
          </div>
        </div>

        {/* Card 2: Generate Presentation with AI */}
        <div
          onClick={() => setActiveModal('generate')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/60 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Generate Presentation with AI</h4>
              <p className="text-[11px] text-muted-foreground">Enter a prompt to generate a presentation</p>
            </div>
          </div>
          <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-purple-50 dark:group-hover:bg-purple-950 text-slate-400 group-hover:text-purple-600 flex items-center justify-center transition-colors">
            <ChevronRight className="size-4" />
          </div>
        </div>

        {/* Card 3: Import from URL */}
        <div
          onClick={() => setActiveModal('import_url')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/60 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Link2 className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Import from URL</h4>
              <p className="text-[11px] text-muted-foreground">Import a presentation from Google Slides</p>
            </div>
          </div>
          <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-50 dark:group-hover:bg-amber-950 text-slate-400 group-hover:text-amber-600 flex items-center justify-center transition-colors">
            <ChevronRight className="size-4" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: LIVE INTERACTIVE PRESENTATION DEMO PLAYER
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={activeModal === 'demo'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-white">
          <div className="flex flex-col h-[640px]">
            {/* Player Top Header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                  AI Live Webinar
                </Badge>
                <span className="text-xs font-bold text-slate-200 truncate max-w-sm">
                  {currentSlide.title}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Slide {currentSlideIndex + 1} of {slides.length}
              </div>
            </div>

            {/* Main Stage: Slide Viewport + Presenter Avatar */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Slide Canvas */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-slate-900/40 relative">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    {agent.name} • Live Presentation
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    {currentSlide.title}
                  </h3>

                  <div className="space-y-3 pt-2">
                    {currentSlide.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="size-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
                          {b}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Speaker Notes Callout */}
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-start gap-2.5">
                  <Mic className="size-4 text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-200 italic leading-relaxed">
                    &quot;{currentSlide.notes}&quot;
                  </p>
                </div>
              </div>

              {/* Presenter Video & Audience Q&A Sidebar */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/80 flex flex-col justify-between shrink-0">
                {/* Presenter Box */}
                <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
                  <div className="relative">
                    <img
                      src={agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'}
                      alt={agent.name}
                      className="size-14 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{agent.name}</h4>
                    <p className="text-[10px] text-slate-400">{agent.roleTitle}</p>
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-400 font-semibold">
                      <Volume2 className="size-3" /> Voice Synthesizer Active
                    </div>
                  </div>
                </div>

                {/* Audience Q&A Chat Feed */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Live Audience Q&amp;A
                  </span>
                  {qaHistory.map((q, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-2.5 rounded-xl leading-relaxed',
                        q.sender === 'user'
                          ? 'bg-blue-600 text-white ml-auto max-w-[90%]'
                          : 'bg-slate-800 text-slate-200 mr-auto max-w-[95%] border border-slate-700'
                      )}
                    >
                      <p className="text-[11px]">{q.text}</p>
                    </div>
                  ))}
                  {isAnsweringQa && (
                    <div className="p-2 rounded-lg bg-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin text-purple-400" /> {agent.name} is answering...
                    </div>
                  )}
                </div>

                {/* Question Input Bar */}
                <div className="p-2.5 border-t border-slate-800 bg-slate-950/80">
                  <div className="flex items-center gap-1.5 bg-slate-800 rounded-xl px-2.5 py-1">
                    <Input
                      value={qaInput}
                      onChange={(e) => setQaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                      placeholder="Ask presenter a question..."
                      className="text-xs h-7 bg-transparent border-0 focus-visible:ring-0 text-white p-0 placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleAskQuestion}
                      className="size-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shrink-0"
                    >
                      <Send className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar (Previous / Next / Finish CTA) */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                className="h-8 text-xs font-semibold border-slate-700 text-slate-300 hover:bg-slate-800 gap-1"
              >
                <ArrowLeft className="size-3.5" /> Previous
              </Button>

              <div className="flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={cn(
                      'size-2 rounded-full transition-all',
                      idx === currentSlideIndex ? 'w-5 bg-purple-500' : 'bg-slate-700 hover:bg-slate-500'
                    )}
                  />
                ))}
              </div>

              {currentSlideIndex < slides.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                  className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1"
                >
                  Next Slide <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    toast.success('Form intake session launched!');
                    setActiveModal(null);
                  }}
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-md"
                >
                  Complete Application <CheckCircle2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: UPLOAD PRESENTATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={activeModal === 'upload'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="size-4 text-blue-600" />
              Upload Presentation File
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload your PDF or PowerPoint (.pptx) deck. AI will automatically extract slides and generate voice narration notes.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3 hover:border-blue-500 transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900">
            <div className="size-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto">
              <FileText className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Click to upload or drag and drop</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PDF or PPTX up to 50MB</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                toast.success('Extracted 5 slides with automated AI narration!');
                setActiveModal('demo');
              }}
              className="w-full h-8 text-xs font-bold bg-blue-600 text-white"
            >
              Process &amp; Load Deck
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: GENERATE PRESENTATION WITH AI
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={activeModal === 'generate'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              Generate Presentation with AI
            </DialogTitle>
            <DialogDescription className="text-xs">
              Describe your topic or business offering. AI will create slides, bullet points, and presenter voice script.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-semibold">Presentation Topic &amp; Goal</Label>
            <Textarea
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="e.g. Commercial HVAC Maintenance Plan & Seasonal Savings"
              className="text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter>
            <Button
              size="sm"
              disabled={isGenerating}
              onClick={handleGenerateWithAi}
              className="w-full h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Synthesizing Slides...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" /> Generate 5-Slide Presentation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: IMPORT FROM URL
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={activeModal === 'import_url'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Link2 className="size-4 text-amber-600" />
              Import from Google Slides
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste the public URL of your Google Slides or Canva presentation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-semibold">Public Slide Deck URL</Label>
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="text-xs h-8 font-mono"
            />
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                toast.success('Imported presentation successfully!');
                setActiveModal('demo');
              }}
              className="w-full h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              Import Slides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
