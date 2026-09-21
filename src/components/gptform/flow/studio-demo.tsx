'use client';

import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  Check,
  ArrowRight,
  GripVertical,
  Settings2,
  Eye,
  Layers,
  Code,
  Sparkle,
  Calendar,
  Camera,
  ShieldCheck,
  CreditCard,
  User,
  Phone,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { scenarios, ScenarioName } from './hero-demo';

const STUDIO_PRESETS = [
  { id: 'Dental', label: '🦷 Dental Clinic', prompt: scenarios.Dental.prompt },
  { id: 'Roofing', label: '🏗️ Roofing Inspection', prompt: scenarios.Roofing.prompt },
  { id: 'HVAC', label: '🔧 HVAC Diagnostic', prompt: scenarios.HVAC.prompt },
  { id: 'Cleaning', label: '🧹 Home Cleaning', prompt: scenarios.Cleaning.prompt },
];

const SECTION_ICONS: Record<string, typeof User> = {
  'Patient details': User,
  'Treatment & symptoms': FileText,
  'Urgency': ShieldCheck,
  'Preferred appointment': Calendar,
  'Insurance': Camera,
  'Consent': CreditCard,
  'Customer details': User,
  'Property address': FileText,
  'Roof issue': ShieldCheck,
  'Damage photos': Camera,
  'Estimate': CreditCard,
  'Inspection booking': Calendar,
  'Equipment': Settings2,
  'Symptoms': FileText,
  'Service area': FileText,
  'Technician visit': Calendar,
  'Property size': FileText,
  'Rooms': Layers,
  'Frequency': Calendar,
  'Add-ons': Settings2,
  'Cleaning date': Calendar,
};

export function StudioDemo() {
  const [activeScenario, setActiveScenario] = useState<ScenarioName>('Dental');
  const [prompt, setPrompt] = useState(scenarios.Dental.prompt);
  const [generated, setGenerated] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOption, setPreviewOption] = useState('Check-up');

  const handleSelectPreset = (name: ScenarioName, p: string) => {
    setActiveScenario(name);
    setPrompt(p);
    setGenerated(false);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 600);
  };

  const fields = scenarios[activeScenario].fields;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Studio Window Bar */}
      <div className="flex items-center justify-between border-b border-border bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-amber-500/80" />
            <div className="size-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-white/20 mx-1" />
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex size-5 items-center justify-center rounded bg-emerald-500 text-[11px] font-bold text-slate-950">G</span>
            <span>GPTForm Studio</span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-emerald-300 font-mono">v4.2 PRO</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden text-white/60 sm:inline flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" /> All changes synced to CRM
          </span>
          <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 text-xs cursor-pointer">
            Publish Live
          </Button>
        </div>
      </div>

      {/* 3-Pane SaaS Builder Interface */}
      <div className="grid lg:grid-cols-[1fr_1.25fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* PANE 1: AI Prompt Copilot */}
        <div className="p-5 bg-muted/30 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Wand2 className="size-3.5 text-purple-600 dark:text-purple-400" />
                AI Prompt Studio
              </span>
              <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 bg-purple-500/5">
                Copilot Active
              </Badge>
            </div>

            {/* Trade Presets */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STUDIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id as ScenarioName, preset.prompt)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-medium border transition-colors cursor-pointer',
                    activeScenario === preset.id
                      ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Prompt Editor */}
            <div className="relative rounded-xl border border-border bg-background p-3 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full resize-none bg-transparent text-xs leading-relaxed outline-none text-foreground"
                aria-label="Describe form requirements"
              />
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                <span>Natural Language Schema Gen</span>
                <span>{prompt.length} chars</span>
              </div>
            </div>

            <Button
              className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 cursor-pointer shadow-sm"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkle className={cn('size-3.5 mr-1.5', isGenerating && 'animate-spin')} />
              {isGenerating ? 'Building Schema...' : generated ? 'Re-Generate Structure' : 'Generate Form Structure'}
            </Button>
          </div>

          {/* Generation Checkmarks */}
          <div className="mt-4 pt-4 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
            {[
              'Schema validation & intent parsed',
              'Structured intake fields mapped (6 sections)',
              'Conditional booking logic connected',
              'Responsive multi-mode runtime generated',
            ].map((item, idx) => (
              <div key={item} className="flex items-center gap-2">
                <div className={cn(
                  'size-4 rounded-full flex items-center justify-center text-[10px]',
                  generated ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                )}>
                  <Check className="size-3" />
                </div>
                <span className={cn(generated && 'text-foreground font-medium')}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PANE 2: Form Schema & Field Inspector */}
        <div className="p-5 bg-card flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Form Structure &amp; Schema</p>
              <p className="text-xs text-muted-foreground">{fields.length} configured sections · Drag to reorder</p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              Auto-Synced
            </Badge>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {fields.map((field, idx) => {
              const IconComponent = SECTION_ICONS[field] || FileText;
              return (
                <div
                  key={field}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 bg-background hover:border-emerald-500/50 hover:shadow-xs',
                    generated
                      ? 'translate-y-0 opacity-100 border-border'
                      : 'translate-y-1 opacity-70 border-dashed border-border/80'
                  )}
                  style={{ transitionDelay: `${idx * 60}ms` }}
                >
                  <GripVertical className="size-4 text-muted-foreground/40 cursor-grab" />
                  <span className="grid size-6 place-items-center rounded-md bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{field}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <IconComponent className="size-3 text-muted-foreground" />
                      {idx === 0 ? 'Customer Input' : idx === 3 ? 'Live Calendar Slot' : idx === 4 ? 'OCR Attachment' : 'Validation Rule'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Required</span>
                    <button className="p-1 text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Field settings">
                      <Settings2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANE 3: Live Customer Mobile Preview */}
        <div className="p-5 bg-muted/20 flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="size-3.5 text-emerald-600" />
              Live Runtime Preview
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Mobile PWA</span>
          </div>

          {/* Phone Shell */}
          <div className="w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-border bg-card shadow-lg">
            {/* Phone Header */}
            <div className="bg-emerald-700 px-4 py-3.5 text-white">
              <p className="text-[10px] tracking-wider uppercase font-semibold text-emerald-200">
                {activeScenario === 'Dental' ? 'Harbour Dental Care' : activeScenario === 'Roofing' ? 'Summit Apex Roofing' : activeScenario === 'HVAC' ? 'AirFlow Diagnostics' : 'Sparkle & Clean'}
              </p>
              <p className="text-sm font-bold mt-0.5">{scenarios[activeScenario].title}</p>
            </div>

            {/* Phone Content */}
            <div className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-2">
                  Select service requirement:
                </label>
                <div className="space-y-1.5">
                  {(activeScenario === 'Dental'
                    ? ['Routine Check-up', 'Tooth Pain / Urgency', 'Cosmetic Consultation']
                    : activeScenario === 'Roofing'
                    ? ['Active Storm Leak', 'Full Shingle Replacement', 'Gutter Inspection']
                    : activeScenario === 'HVAC'
                    ? ['No Heating / Cold Air', 'Annual Maintenance', 'Thermostat Error']
                    : ['Regular House Clean', 'Deep Move-in Clean', 'Post-Construction']
                  ).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPreviewOption(opt)}
                      className={cn(
                        'w-full text-left rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                        previewOption === opt
                          ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted p-2.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Estimated time:</span> 2 mins
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 cursor-pointer" size="sm">
                Next: Choose Slot <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
