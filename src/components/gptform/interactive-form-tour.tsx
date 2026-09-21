'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Smartphone,
  CheckCircle2,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Settings,
  Copy,
  Trash2,
  Calendar,
  Type,
  Hash,
  MapPin,
  Play,
  Pause,
  QrCode,
  Laptop,
  Zap,
  FileCheck,
  ShieldCheck,
  Send,
  Sliders,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TourStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  targetPane: 'ai_assistant' | 'canvas' | 'field_item' | 'mobile_preview' | 'calculation' | 'agent_mode';
  spotlightCoords: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  tooltipPosition: {
    top: string;
    left: string;
  };
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'ai_prompt',
    stepNumber: 1,
    totalSteps: 6,
    title: 'AI Co-pilot & Natural Language Prompting',
    description: 'Type or speak what you need. Our AI Co-pilot instantly structures fields, sections, formulas, and validations.',
    targetPane: 'ai_assistant',
    spotlightCoords: { top: '6%', left: '1%', width: '32%', height: '88%' },
    tooltipPosition: { top: '28%', left: '34%' },
  },
  {
    id: 'field_canvas',
    stepNumber: 2,
    totalSteps: 6,
    title: 'Visual Field Canvas & Section Groups',
    description: 'Click any field to edit its label, placeholder, conditional logic, required state, or dynamic calculation rules.',
    targetPane: 'canvas',
    spotlightCoords: { top: '6%', left: '34%', width: '32%', height: '88%' },
    tooltipPosition: { top: '20%', left: '18%' },
  },
  {
    id: 'field_actions',
    stepNumber: 3,
    totalSteps: 6,
    title: 'Field Settings, Duplicate & Logic',
    description: 'Configure conditional show/hide rules, required conditions, and element styling with one click.',
    targetPane: 'field_item',
    spotlightCoords: { top: '22%', left: '34.5%', width: '31%', height: '16%' },
    tooltipPosition: { top: '42%', left: '34%' },
  },
  {
    id: 'mobile_preview',
    stepNumber: 4,
    totalSteps: 6,
    title: 'Real-Time Interactive Mobile Simulator',
    description: 'Preview the form immediately on an interactive smartphone simulator with live touch feedback and QR code testing.',
    targetPane: 'mobile_preview',
    spotlightCoords: { top: '6%', left: '67%', width: '32%', height: '88%' },
    tooltipPosition: { top: '25%', left: '42%' },
  },
  {
    id: 'live_calc',
    stepNumber: 5,
    totalSteps: 6,
    title: 'Live Formula & Calculation Engine',
    description: 'Formulas evaluate square footage, material tiers, and 20% deposits dynamically on every user interaction.',
    targetPane: 'calculation',
    spotlightCoords: { top: '55%', left: '68%', width: '30%', height: '28%' },
    tooltipPosition: { top: '45%', left: '40%' },
  },
  {
    id: 'agent_runtime',
    stepNumber: 6,
    totalSteps: 6,
    title: 'Publish & 0% Payment Collection',
    description: '1-click publish to live URL, QR code, or embed widget on any site with Stripe instant payout.',
    targetPane: 'agent_mode',
    spotlightCoords: { top: '2%', left: '1%', width: '98%', height: '94%' },
    tooltipPosition: { top: '20%', left: '35%' },
  },
];

export function InteractiveFormTour() {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(true);
  const [activeDevice, setActiveDevice] = useState<'mobile' | 'desktop' | 'qr'>('mobile');
  const [activeTab, setActiveTab] = useState<'assistant' | 'fields'>('assistant');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('f_scope');
  const [fieldSliderValue, setFieldSliderValue] = useState(2400);
  const [selectedMaterial, setSelectedMaterial] = useState<'asphalt' | 'metal' | 'tile'>('metal');

  const step = TOUR_STEPS[currentStepIdx] || TOUR_STEPS[0];

  const handleNext = () => {
    setCurrentStepIdx((prev) => (prev < TOUR_STEPS.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setCurrentStepIdx((prev) => (prev > 0 ? prev - 1 : TOUR_STEPS.length - 1));
  };

  const handleSelectStep = (idx: number) => {
    setCurrentStepIdx(idx);
    setShowSpotlight(true);
  };

  // Auto-play tour timer if active
  useEffect(() => {
    if (!isPlayingAuto) return;
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => (prev < TOUR_STEPS.length - 1 ? prev + 1 : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlayingAuto]);

  // Dynamic formula calculation
  const materialRate = selectedMaterial === 'asphalt' ? 3.4 : selectedMaterial === 'metal' ? 5.8 : 8.2;
  const calcTotal = Math.round(fieldSliderValue * materialRate + 240);

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Tour Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/90 text-white p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="size-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Interactive Product Tour · AI Form Studio
              <Badge className="bg-teal-500 text-slate-950 font-bold text-xs px-2.5 py-0.5">
                Live Studio Demo
              </Badge>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Explore the 3-pane AI studio: Prompt Co-pilot (Left), Visual Field Canvas (Center), Real-time Mobile Preview (Right).
            </p>
          </div>
        </div>

        {/* Step Navigation Pill */}
        <div className="flex items-center gap-2.5 self-stretch lg:self-auto justify-between lg:justify-end flex-wrap">
          <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`size-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStepIdx === idx && showSpotlight
                    ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
                title={s.title}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlayingAuto(!isPlayingAuto)}
              className="h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {isPlayingAuto ? <Pause className="size-3.5 text-amber-400" /> : <Play className="size-3.5 text-teal-400" />}
              <span>{isPlayingAuto ? 'Pause' : 'Auto Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSpotlight(!showSpotlight)}
              className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 cursor-pointer"
            >
              {showSpotlight ? 'Hide Tour Bubble' : 'Show Tour Bubble'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN TOUR CONTAINER FRAME ─── */}
      <div className="relative rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        {/* Top Window Chrome Header Bar */}
        <div className="bg-slate-900/95 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-3 rounded-full bg-rose-500/80" />
            <div className="size-3 rounded-full bg-amber-500/80" />
            <div className="size-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs sm:text-sm font-bold text-slate-200 ml-2 font-mono truncate max-w-sm">
              Vehicle Inspection &amp; Roofing Estimator Form 2026
            </span>
            <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-500/30 bg-teal-500/10 hidden md:inline-flex">
              ● Live Calculation Active
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
              Save Draft
            </Button>
            <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md">
              Publish Form
            </Button>
          </div>
        </div>

        {/* ─── 3-PANE STUDIO INTERFACE (Grid-12: 4 cols / 4 cols / 4 cols) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px] relative bg-slate-900/40 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* ═══════════════════════════════════════════════════════════════════
              PANE 1: AI ASSISTANT / COPILOT (4 cols)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 bg-slate-950/80 flex flex-col justify-between p-5 space-y-4">
            <div className="space-y-4">
              {/* Top Toggle */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('assistant')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'assistant'
                      ? 'bg-teal-500 text-slate-950 shadow-sm font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="size-4" /> AI Assistant
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fields')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'fields'
                      ? 'bg-teal-500 text-slate-950 shadow-sm font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Add Fields
                </button>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3.5">
                {/* User Prompt Bubble */}
                <div className="p-4 rounded-2xl rounded-tr-xs bg-slate-900 text-slate-200 border border-slate-800 text-xs leading-relaxed space-y-1.5 shadow-sm">
                  <p className="font-bold text-teal-400 text-[10px] uppercase tracking-wider">User Request</p>
                  <p className="text-slate-300">
                    "Build me a vehicle &amp; roof inspection estimate form with scope slider in sq ft, material choice, damage photo upload, and 20% deposit payment."
                  </p>
                </div>

                {/* AI Assistant Response Bubble */}
                <div className="p-4 rounded-2xl rounded-tl-xs bg-teal-950/40 text-slate-200 border border-teal-500/30 text-xs leading-relaxed space-y-2.5 shadow-sm">
                  <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                    <Sparkles className="size-4" /> Fieseros AI Form Engine
                  </div>
                  <p className="text-slate-300">
                    Structured a 3-step inspection &amp; estimate form with live area formula calculations, vehicle details, damage photo capture, and instant Stripe deposit checkout.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 text-[11px] font-mono font-semibold">8 Fields</span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-semibold">Live Formula</span>
                    <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 text-[11px] font-mono font-semibold">Stripe Deposit</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom AI Input Bar */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="cursor-pointer hover:text-teal-400">💬 Prompt Suggestions</span>
                <span className="cursor-pointer hover:text-teal-400 flex items-center gap-1"><RotateCcw className="size-3" /> Reset</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value="Add conditional logic: If scope > 3000 sq ft, apply 10% discount..."
                  className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 size-8 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center hover:bg-teal-400 cursor-pointer shadow-sm"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              PANE 2: FIELD CANVAS BUILDER (4 cols)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 bg-slate-900/30 p-5 space-y-3.5 overflow-y-auto">
            {/* Section Header */}
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-bold text-xs">Section 1: Details &amp; Scope</span>
              </div>
              <Badge className="bg-slate-800 text-teal-400 border-slate-700 text-xs font-bold">
                4 Active Fields
              </Badge>
            </div>

            {/* Field 1: Scope / Sq Ft Slider */}
            <div
              onClick={() => setSelectedFieldId('f_scope')}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
                selectedFieldId === 'f_scope'
                  ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/50 shadow-md'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-slate-500 text-xs">⋮⋮</span>
                <div className="size-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Hash className="size-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">* Scope Area (Sq Ft)</p>
                  <p className="text-[11px] text-teal-400 font-medium">Formula: SqFt × Rate + £240</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" className="p-1 hover:text-white" title="Settings"><Settings className="size-3.5" /></button>
                <button type="button" className="p-1 hover:text-white" title="Duplicate"><Copy className="size-3.5" /></button>
                <button type="button" className="p-1 hover:text-rose-400" title="Delete"><Trash2 className="size-3.5" /></button>
              </div>
            </div>

            {/* Field 2: Inspection Date */}
            <div
              onClick={() => setSelectedFieldId('f_date')}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
                selectedFieldId === 'f_date'
                  ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/50 shadow-md'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-slate-500 text-xs">⋮⋮</span>
                <div className="size-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Calendar className="size-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">* Inspection Date &amp; Time</p>
                  <p className="text-[11px] text-slate-400">Calendar Picker · Required</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" className="p-1 hover:text-white"><Settings className="size-3.5" /></button>
                <button type="button" className="p-1 hover:text-white"><Copy className="size-3.5" /></button>
              </div>
            </div>

            {/* Field 3: Material Tier Choice */}
            <div
              onClick={() => setSelectedFieldId('f_material')}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
                selectedFieldId === 'f_material'
                  ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/50 shadow-md'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-slate-500 text-xs">⋮⋮</span>
                <div className="size-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <Type className="size-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">* Architectural Material Tier</p>
                  <p className="text-[11px] text-slate-400">3 Interactive Choice Cards</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" className="p-1 hover:text-white"><Settings className="size-3.5" /></button>
                <button type="button" className="p-1 hover:text-white"><Copy className="size-3.5" /></button>
              </div>
            </div>

            {/* Field 4: Inspection Location / GPS */}
            <div
              onClick={() => setSelectedFieldId('f_gps')}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
                selectedFieldId === 'f_gps'
                  ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/50 shadow-md'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-slate-500 text-xs">⋮⋮</span>
                <div className="size-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <MapPin className="size-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">* Service Location / Address</p>
                  <p className="text-[11px] text-slate-400">Google Places Auto-complete</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" className="p-1 hover:text-white"><Settings className="size-3.5" /></button>
                <button type="button" className="p-1 hover:text-white"><Copy className="size-3.5" /></button>
              </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-around text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Settings className="size-3.5" /> Settings</span>
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Zap className="size-3.5 text-amber-400" /> Workflows</span>
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><FileCheck className="size-3.5 text-teal-400" /> Webhooks</span>
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><ShieldCheck className="size-3.5 text-blue-400" /> Permissions</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              PANE 3: LIVE MOBILE & CALCULATION SIMULATOR (4 cols)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 p-5 bg-slate-950/90 flex flex-col items-center justify-between space-y-4">
            {/* Device Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-full max-w-[290px] justify-between">
              <button
                type="button"
                onClick={() => setActiveDevice('mobile')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  activeDevice === 'mobile' ? 'bg-teal-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="size-3.5" /> Mobile
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('desktop')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  activeDevice === 'desktop' ? 'bg-teal-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="size-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('qr')}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer ${
                  activeDevice === 'qr' ? 'bg-teal-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
                title="Scan QR Code"
              >
                <QrCode className="size-3.5" />
              </button>
            </div>

            {/* Smartphone Mockup Frame */}
            <div className="w-full max-w-[300px] bg-slate-900 rounded-[36px] p-3 border-4 border-slate-800 shadow-2xl relative overflow-hidden">
              {/* Dynamic Island / Notch */}
              <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="size-2 rounded-full bg-slate-800 mr-2" />
                <div className="size-1.5 rounded-full bg-teal-500" />
              </div>

              {/* Mobile Screen Content */}
              <div className="bg-slate-950 rounded-2xl p-3.5 space-y-3 text-xs text-slate-100 max-h-[440px] overflow-y-auto border border-slate-800">
                <div className="pb-2 border-b border-slate-800">
                  <p className="font-extrabold text-sm text-white leading-tight">
                    Roofing Replacement Estimator
                  </p>
                  <p className="text-[10px] text-slate-400">48 King Road, London W1</p>
                </div>

                {/* Scope Slider Field in Mobile Frame */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-400">Area Scope</span>
                    <span className="font-bold text-teal-400 font-mono">
                      {fieldSliderValue.toLocaleString()} sq ft
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="5000"
                    step="100"
                    value={fieldSliderValue}
                    onChange={(e) => setFieldSliderValue(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                  <p className="text-[9px] text-slate-500">Drag to recalculate total instantly</p>
                </div>

                {/* Material Selection in Mobile Frame */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-[11px] text-slate-400">Material Tier</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'asphalt', name: 'Asphalt', price: '£3.40/ft' },
                      { id: 'metal', name: 'Metal', price: '£5.80/ft' },
                      { id: 'tile', name: 'Tile', price: '£8.20/ft' },
                    ].map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat.id as any)}
                        className={`p-2 rounded-xl text-center border cursor-pointer transition ${
                          selectedMaterial === mat.id
                            ? 'border-teal-500 bg-teal-500/20 text-teal-300 font-bold shadow-xs'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        <p className="truncate text-[10px] font-bold">{mat.name}</p>
                        <p className="text-[9px] opacity-80">{mat.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Estimate Card in Phone */}
                <div className="p-3 rounded-xl bg-slate-900 text-white border border-teal-500/30 space-y-1 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-teal-400 font-extrabold flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Total
                    </span>
                    <span className="text-[10px] text-slate-400">Deposit: 20%</span>
                  </div>
                  <p className="text-xl font-black text-white leading-tight font-mono">
                    £{calcTotal.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold">
                    Pay Now: £{Math.round(calcTotal * 0.2).toLocaleString()} deposit via Stripe
                  </p>
                </div>

                <Button size="sm" className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg cursor-pointer">
                  Accept &amp; Pay Deposit →
                </Button>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center font-medium">
              ⓘ Interactive live preview with real-time formula evaluation.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            INTERACTIVE SPOTLIGHT OVERLAY & GUIDED TOOLTIP (Storylane Style)
        ══════════════════════════════════════════════════════════════════════ */}
        {showSpotlight && (
          <div className="absolute inset-0 pointer-events-none z-30 hidden md:block">
            {/* Spotlight Highlight Box */}
            <div
              className="absolute rounded-2xl border-2 border-amber-400/90 shadow-[0_0_35px_rgba(251,191,36,0.35)] transition-all duration-500 ease-out"
              style={{
                top: step.spotlightCoords.top,
                left: step.spotlightCoords.left,
                width: step.spotlightCoords.width,
                height: step.spotlightCoords.height,
              }}
            />

            {/* Interactive Floating Tooltip Bubble */}
            <div
              className="absolute z-40 pointer-events-auto transition-all duration-500 ease-out max-w-sm"
              style={{
                top: step.tooltipPosition.top,
                left: step.tooltipPosition.left,
              }}
            >
              <div className="bg-sky-600 text-white rounded-2xl p-5 shadow-2xl border border-sky-400/80 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                {/* Tooltip Header / Step Progress */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                    Step {step.stepNumber} of {step.totalSteps}
                  </span>
                  <span className="text-xs font-semibold text-sky-100">
                    {step.title}
                  </span>
                </div>

                {/* Tooltip Description */}
                <p className="text-xs sm:text-sm font-semibold leading-relaxed text-white">
                  {step.description}
                </p>

                {/* Tooltip Footer Buttons */}
                <div className="flex items-center justify-between pt-2.5 border-t border-white/20">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="size-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
                    title="Previous step"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  <span className="text-xs font-bold text-white/90 font-mono">
                    {step.stepNumber} / {step.totalSteps}
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleNext}
                    className="h-8 px-4 rounded-xl bg-white hover:bg-sky-50 text-slate-950 font-black text-xs shadow-md cursor-pointer transition hover:scale-105"
                  >
                    {step.stepNumber === step.totalSteps ? 'Restart' : 'Next Step →'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
