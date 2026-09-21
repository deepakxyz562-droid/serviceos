'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Smartphone,
  Sliders,
  CheckCircle2,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Settings,
  Copy,
  Trash2,
  Calendar,
  Type,
  Hash,
  MapPin,
  Camera,
  Play,
  Pause,
  RotateCcw,
  QrCode,
  Laptop,
  Check,
  Zap,
  Radio,
  FileCheck,
  ShieldCheck,
  Send,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
    alignment: 'left' | 'right' | 'top' | 'bottom' | 'center';
  };
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'ai_prompt',
    stepNumber: 1,
    totalSteps: 6,
    title: 'AI Co-pilot & Natural Language Prompting',
    description: 'Type what you need in plain English or use voice. Our AI Co-pilot instantly structures fields, sections, validation, and calculations.',
    targetPane: 'ai_assistant',
    spotlightCoords: { top: '8%', left: '1.5%', width: '31%', height: '86%' },
    tooltipPosition: { top: '38%', left: '33.5%', alignment: 'left' },
  },
  {
    id: 'field_canvas',
    stepNumber: 2,
    totalSteps: 6,
    title: 'Visual Field Canvas & Section Groups',
    description: 'You can also click any field to edit its label, settings, behavior, or appearance.',
    targetPane: 'canvas',
    spotlightCoords: { top: '8%', left: '33.5%', width: '34.5%', height: '86%' },
    tooltipPosition: { top: '26%', left: '20%', alignment: 'right' },
  },
  {
    id: 'field_actions',
    stepNumber: 3,
    totalSteps: 6,
    title: 'Field Settings, Duplicate & Logic',
    description: 'Configure conditional show/hide rules, required conditions, custom placeholders, and element styling with one click.',
    targetPane: 'field_item',
    spotlightCoords: { top: '23%', left: '34%', width: '33.5%', height: '14%' },
    tooltipPosition: { top: '40%', left: '34%', alignment: 'top' },
  },
  {
    id: 'mobile_preview',
    stepNumber: 4,
    totalSteps: 6,
    title: 'Real-Time Interactive Mobile Simulator',
    description: 'Preview the form immediately on an interactive smartphone simulator with live touch feedback and QR code mobile testing.',
    targetPane: 'mobile_preview',
    spotlightCoords: { top: '8%', left: '69%', width: '29.5%', height: '86%' },
    tooltipPosition: { top: '32%', left: '42%', alignment: 'right' },
  },
  {
    id: 'live_calc',
    stepNumber: 5,
    totalSteps: 6,
    title: 'Live Formula & Calculation Engine',
    description: 'Formulas evaluate square footage, material tiers, and 20% deposits dynamically on every user interaction.',
    targetPane: 'calculation',
    spotlightCoords: { top: '64%', left: '71%', width: '25.5%', height: '24%' },
    tooltipPosition: { top: '48%', left: '40%', alignment: 'right' },
  },
  {
    id: 'agent_runtime',
    stepNumber: 6,
    totalSteps: 6,
    title: 'Conversational AI Voice & Chat Agent',
    description: 'Convert any form into a 24/7 AI intake agent that greets leads, answers questions, checks calendar availability, and captures bookings.',
    targetPane: 'agent_mode',
    spotlightCoords: { top: '2%', left: '1.5%', width: '97%', height: '94%' },
    tooltipPosition: { top: '22%', left: '32%', alignment: 'center' },
  },
];

export function InteractiveFormTour() {
  const [currentStepIdx, setCurrentStepIdx] = useState(1); // Default to Step 2 (matching screenshot step 11/16)
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [activeDevice, setActiveDevice] = useState<'mobile' | 'desktop' | 'qr'>('mobile');
  const [activeTab, setActiveTab] = useState<'assistant' | 'fields'>('assistant');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('f_date');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold">
            <Sparkles className="size-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Interactive Product Tour · AI Form Studio
              <Badge className="bg-teal-500 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                Live Interactive Demo
              </Badge>
            </h3>
            <p className="text-xs text-slate-400">
              Click through the guided spotlight walkthrough or interact with the live studio builder below
            </p>
          </div>
        </div>

        {/* Step Navigation Pill */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectStep(idx)}
                className={`size-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStepIdx === idx
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title={s.title}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlayingAuto(!isPlayingAuto)}
              className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {isPlayingAuto ? <Pause className="size-3 text-amber-400" /> : <Play className="size-3 text-teal-400" />}
              <span>{isPlayingAuto ? 'Pause' : 'Auto Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="size-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 cursor-pointer"
              title={soundEnabled ? 'Mute sound' : 'Enable voice sound'}
            >
              {soundEnabled ? <Volume2 className="size-3.5 text-teal-400" /> : <VolumeX className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN TOUR CONTAINER FRAME (Matching FastField / Storylane Architecture) ─── */}
      <div className="relative rounded-3xl border-2 border-slate-700/80 bg-slate-950 overflow-hidden shadow-2xl">
        {/* Top Browser Header Bar */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-rose-500/80" />
            <div className="size-3 rounded-full bg-amber-500/80" />
            <div className="size-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-bold text-slate-300 ml-2 font-mono truncate max-w-xs">
              Vehicle Inspection &amp; Roofing Estimator Form 07-22-2026
            </span>
            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10 hidden sm:inline-flex">
              Draft · unsaved changes
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-[11px] bg-slate-800 border-slate-700 text-slate-200">
              Save Draft
            </Button>
            <Button size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              Publish Form
            </Button>
          </div>
        </div>

        {/* ─── 3-PANE STUDIO INTERFACE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[620px] relative bg-slate-900/60">
          {/* ═══════════════════════════════════════════════════════════════════
              PANE 1: AI ASSISTANT / COPILOT (4 cols)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 border-r border-slate-800 bg-slate-950 flex flex-col justify-between p-4 space-y-4">
            {/* Top Toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('assistant')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'assistant'
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="size-3.5" /> AI Assistant
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fields')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'fields'
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Add Fields
                </button>
              </div>

              {/* Action Chip */}
              <div className="flex justify-start">
                <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-700 bg-slate-800/80 cursor-pointer">
                  Show form JSON
                </Badge>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 pt-1">
                {/* User Prompt Bubble */}
                <div className="p-3.5 rounded-2xl rounded-tr-xs bg-slate-800/90 text-slate-200 border border-slate-700/80 text-xs leading-relaxed space-y-1">
                  <p className="font-semibold text-teal-400 text-[10px] uppercase tracking-wider">User Request</p>
                  <p>
                    Build me a vehicle &amp; roof inspection form. Suggest fields like inspection date, VIN, damage photos, scope slider in sq ft, material choice, and deposit sign-off.
                  </p>
                </div>

                {/* AI Assistant Response Bubble */}
                <div className="p-3.5 rounded-2xl rounded-tl-xs bg-teal-950/40 text-slate-200 border border-teal-500/30 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px]">
                    <Sparkles className="size-3.5" /> Fieseros AI Engine
                  </div>
                  <p className="text-slate-300">
                    I created a structured 3-step inspection &amp; estimate form with required fields for vehicle details, live formula calculations, damage photo capture, and e-signature.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-mono">8 Fields</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">Live Formula</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-mono">Stripe Deposit</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom AI Input Bar */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="cursor-pointer hover:text-slate-200">💬 Feedback</span>
                <span className="cursor-pointer hover:text-slate-200">⟲ Undo</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value="Ask me to add fields, create sections, change logic..."
                  className="w-full h-10 pl-3 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 size-7 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center hover:bg-teal-400 cursor-pointer"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              PANE 2: FIELD CANVAS BUILDER (4.5 cols)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4.5 border-r border-slate-800 bg-slate-900/40 p-4 space-y-3 overflow-y-auto">
            {/* Section Header */}
            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold text-xs">⤢ Collapse All</span>
                <Badge className="bg-slate-800 text-teal-400 border-slate-700 text-xs font-bold">
                  📄 Page 1
                </Badge>
              </div>
              <span className="text-[11px] text-slate-400">🔍 Search fields...</span>
            </div>

            {/* Section Card */}
            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="text-slate-500">⋮⋮</span> Vehicle &amp; Inspection Details
                </span>
                <span className="text-slate-500 text-xs">⋮</span>
              </div>

              {/* Field 1: Inspection Date */}
              <div
                onClick={() => setSelectedFieldId('f_date')}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                  selectedFieldId === 'f_date'
                    ? 'border-teal-500 bg-teal-950/30 shadow-xs ring-1 ring-teal-500/40'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-500 text-xs">⋮⋮</span>
                  <div className="size-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                    <Calendar className="size-3.5 text-teal-400" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">
                      * Inspection Date
                    </p>
                    <p className="text-[10px] text-slate-400">Date/Time</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <button type="button" className="p-1 hover:text-white" title="Settings"><Settings className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-white" title="Duplicate"><Copy className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-rose-400" title="Delete"><Trash2 className="size-3.5" /></button>
                </div>
              </div>

              {/* Field 2: VIN / Vehicle ID */}
              <div
                onClick={() => setSelectedFieldId('f_vin')}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                  selectedFieldId === 'f_vin'
                    ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/40'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-500 text-xs">⋮⋮</span>
                  <div className="size-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                    <Type className="size-3.5 text-blue-400" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">* Vehicle ID / VIN</p>
                    <p className="text-[10px] text-slate-400">Text (17 chars)</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <button type="button" className="p-1 hover:text-white"><Settings className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-white"><Copy className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-rose-400"><Trash2 className="size-3.5" /></button>
                </div>
              </div>

              {/* Field 3: Scope / Sq Ft Slider */}
              <div
                onClick={() => setSelectedFieldId('f_scope')}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                  selectedFieldId === 'f_scope'
                    ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/40'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-500 text-xs">⋮⋮</span>
                  <div className="size-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                    <Hash className="size-3.5 text-amber-400" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">* Scope Area (Sq Ft)</p>
                    <p className="text-[10px] text-slate-400">Range Slider + Live Formula</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <button type="button" className="p-1 hover:text-white"><Settings className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-white"><Copy className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-rose-400"><Trash2 className="size-3.5" /></button>
                </div>
              </div>

              {/* Field 4: Inspection Location / GPS */}
              <div
                onClick={() => setSelectedFieldId('f_gps')}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                  selectedFieldId === 'f_gps'
                    ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/40'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-500 text-xs">⋮⋮</span>
                  <div className="size-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                    <MapPin className="size-3.5 text-emerald-400" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">* Inspection Location</p>
                    <p className="text-[10px] text-slate-400">GPS Auto-Geocode</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <button type="button" className="p-1 hover:text-white"><Settings className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-white"><Copy className="size-3.5" /></button>
                  <button type="button" className="p-1 hover:text-rose-400"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </div>

            {/* Bottom Studio Toolbar */}
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-around text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Settings className="size-3" /> Settings</span>
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Zap className="size-3 text-amber-400" /> Workflow</span>
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><FileCheck className="size-3 text-teal-400" /> Reports</span>
              <span className="flex items-center gap-1 hover:text-white cursor-pointer"><ShieldCheck className="size-3 text-blue-400" /> Actions</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              PANE 3: LIVE MOBILE & CALCULATION SIMULATOR (3.5 cols)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3.5 p-4 bg-slate-950 flex flex-col items-center justify-between space-y-3">
            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveDevice('mobile')}
                className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  activeDevice === 'mobile' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="size-3.5" /> Mobile
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('desktop')}
                className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  activeDevice === 'desktop' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="size-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('qr')}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  activeDevice === 'qr' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Scan QR Code"
              >
                <QrCode className="size-3.5" />
              </button>
            </div>

            {/* Smartphone Mockup */}
            <div className="w-full max-w-[280px] bg-slate-900 rounded-[32px] p-2.5 border-4 border-slate-800 shadow-2xl relative overflow-hidden">
              {/* Dynamic Island / Notch */}
              <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="size-2 rounded-full bg-slate-800 mr-2" />
                <div className="size-1.5 rounded-full bg-teal-500" />
              </div>

              {/* Mobile Screen Content */}
              <div className="bg-white dark:bg-slate-950 rounded-2xl p-3 space-y-2.5 text-[11px] text-slate-900 dark:text-slate-100 max-h-[420px] overflow-y-auto">
                <div className="pb-1 border-b border-slate-200 dark:border-slate-800">
                  <p className="font-extrabold text-[12px] text-foreground leading-tight">
                    Vehicle Inspection &amp; Estimate
                  </p>
                  <p className="text-[9px] text-muted-foreground">07-22-2026 02:14 PM</p>
                </div>

                {/* Scope Slider Field in Mobile Frame */}
                <div className="space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-muted-foreground">Scope Area</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
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
                    className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                {/* Material Pill in Mobile Frame */}
                <div className="space-y-1">
                  <span className="font-semibold text-[10px] text-muted-foreground">Material Tier</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'asphalt', name: 'Asphalt', price: '£3.40' },
                      { id: 'metal', name: 'Metal', price: '£5.80' },
                      { id: 'tile', name: 'Tile', price: '£8.20' },
                    ].map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat.id as any)}
                        className={`p-1 rounded-lg text-[9px] font-bold text-center border cursor-pointer ${
                          selectedMaterial === mat.id
                            ? 'border-teal-500 bg-teal-500/20 text-teal-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <p className="truncate">{mat.name}</p>
                        <p className="text-[8px] opacity-75">{mat.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Estimate Card in Phone */}
                <div className="p-2 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-1 shadow-sm">
                  <span className="text-[8px] uppercase tracking-wider text-teal-400 font-bold block">
                    ● Live Estimate
                  </span>
                  <p className="text-base font-black text-white leading-none">
                    £{calcTotal.toLocaleString()}
                  </p>
                  <p className="text-[8px] text-slate-400">
                    Deposit (20%): £{Math.round(calcTotal * 0.2).toLocaleString()}
                  </p>
                </div>

                <Button size="sm" className="w-full h-7 text-[10px] bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg">
                  Submit &amp; Secure Deposit →
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              ⓘ Visual live preview. Interactive with real-time calculations.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            INTERACTIVE SPOTLIGHT OVERLAY & GUIDED TOOLTIP (Storylane Style)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {/* Spotlight Highlight Box with Glowing Orange/Cyan Border */}
          <div
            className="absolute rounded-2xl border-2 border-amber-400/90 shadow-[0_0_30px_rgba(251,191,36,0.35)] transition-all duration-500 ease-out"
            style={{
              top: step.spotlightCoords.top,
              left: step.spotlightCoords.left,
              width: step.spotlightCoords.width,
              height: step.spotlightCoords.height,
            }}
          />

          {/* Interactive Floating Tooltip Bubble */}
          <div
            className="absolute z-40 pointer-events-auto transition-all duration-500 ease-out max-w-xs sm:max-w-sm"
            style={{
              top: step.tooltipPosition.top,
              left: step.tooltipPosition.left,
            }}
          >
            <div className="bg-sky-500 text-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-sky-400/80 space-y-3 animate-in fade-in zoom-in-95 duration-300">
              {/* Tooltip Header / Step Progress */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  Step {step.stepNumber} of {step.totalSteps}
                </span>
                <span className="text-[11px] font-medium text-sky-100">
                  {step.title}
                </span>
              </div>

              {/* Tooltip Description */}
              <p className="text-xs sm:text-sm font-semibold leading-snug text-white">
                {step.description}
              </p>

              {/* Tooltip Footer Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="size-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition"
                  title="Previous step"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <span className="text-xs font-bold text-white/90">
                  {step.stepNumber} / {step.totalSteps}
                </span>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="h-7 px-3.5 rounded-lg bg-white hover:bg-sky-50 text-slate-900 font-extrabold text-xs shadow-md cursor-pointer transition hover:scale-105"
                >
                  {step.stepNumber === step.totalSteps ? 'Restart' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
