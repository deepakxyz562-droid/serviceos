'use client';

/**
 * FormStudioBuilder — Full-Screen Jotform-Style Form Studio.
 *
 * Provides a dedicated 3-pillar builder experience:
 * 1. BUILD — Interactive paper canvas + element palette + field properties inspector.
 * 2. SETTINGS — CRM auto-actions, notifications, thank-you screen, and field mappings.
 * 3. PUBLISH — Shareable URL, 1-line JS embed, iFrame, WhatsApp link, and QR code.
 * 4. PREVIEW — Interactive live form testing with Desktop, Tablet, and Mobile viewports.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Check, Copy, ExternalLink, Eye, FileInput, Globe,
  Hammer, Loader2, MessageCircle, Monitor, MoveDown, MoveUp,
  Plus, QrCode, Save, Settings, Share2,
  Smartphone, Sparkles, Star, Tablet, Trash2, Wand2,
  Zap, CheckCircle2, ChevronDown,
  Hash, Calendar, Mail, FileText, SlidersHorizontal,
  AlignLeft, CheckSquare, CircleDot, Paperclip, PenTool, LayoutTemplate,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CRM_FIELDS, FIELD_TYPES, FORM_TYPES, PRIMARY_ACTIONS,
} from '@/features/forms/types';
import type {
  EditorFormData, FieldType, FormField,
  FormStatus, FormType, PrimaryAction,
} from '@/features/forms/types';
import { QRCodePlaceholder } from './field-editor/qr-code-placeholder';

// ─── Element Palette Catalog ──────────────────────────────────────────────────

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: any;
  category: 'basic' | 'choice' | 'advanced' | 'logic';
  description: string;
  defaultOptions?: string[];
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Basic
  { type: 'text', label: 'Short Text', icon: AlignLeft, category: 'basic', description: 'Single line text input' },
  { type: 'textarea', label: 'Long Text', icon: FileText, category: 'basic', description: 'Multi-line paragraph text' },
  { type: 'email', label: 'Email Address', icon: Mail, category: 'basic', description: 'Validated email input' },
  { type: 'phone', label: 'Phone Number', icon: Phone, category: 'basic', description: 'International phone input' },
  { type: 'number', label: 'Number / Quantity', icon: Hash, category: 'basic', description: 'Numeric values' },
  { type: 'date', label: 'Date & Time', icon: Calendar, category: 'basic', description: 'Date and appointment picker' },
  // Choices
  { type: 'select', label: 'Dropdown Menu', icon: ChevronDown, category: 'choice', description: 'Select one from list', defaultOptions: ['Option 1', 'Option 2', 'Option 3'] },
  { type: 'radio', label: 'Single Choice (Radio)', icon: CircleDot, category: 'choice', description: 'Radio button options', defaultOptions: ['Choice A', 'Choice B', 'Choice C'] },
  { type: 'checkbox', label: 'Multiple Choice', icon: CheckSquare, category: 'choice', description: 'Multi-select checkboxes', defaultOptions: ['Item 1', 'Item 2', 'Item 3'] },
  // Advanced & Media
  { type: 'rating', label: 'Star Rating', icon: Star, category: 'advanced', description: '5-star customer rating' },
  { type: 'scale', label: 'NPS Scale (0-10)', icon: SlidersHorizontal, category: 'advanced', description: 'Opinion scale from 0 to 10' },
  { type: 'file', label: 'File Upload', icon: Paperclip, category: 'advanced', description: 'Customer photos and documents' },
  { type: 'signature', label: 'E-Signature', icon: PenTool, category: 'advanced', description: 'Sign on screen with finger/mouse' },
  // Logic & Calculations
  { type: 'currency', label: 'Price / Currency', icon: Zap, category: 'logic', description: 'Financial amount input' },
  { type: 'calculated', label: 'Calculated Field', icon: Hash, category: 'logic', description: 'Formula-calculated sum or total' },
  { type: 'hidden', label: 'Hidden Parameter', icon: EyeOff, category: 'logic', description: 'UTM source, referrer, or lead tag' },
];

export interface FormStudioBuilderProps {
  formData: EditorFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<EditorFormData>>;
  editMode: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
  onExit: () => void;
  siteOrigin: string;
}

export function FormStudioBuilder({
  formData,
  onFormDataChange,
  editMode,
  saving,
  onSave,
  onExit,
  siteOrigin,
}: FormStudioBuilderProps) {
  // Studio navigation
  const [studioTab, setStudioTab] = useState<'build' | 'settings' | 'publish'>('build');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(formData.fields[0]?.id || null);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  // AI Assistant dialog
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Live test preview answers
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  // Active field lookup
  const selectedField = useMemo(
    () => formData.fields.find((f) => f.id === selectedFieldId) || null,
    [formData.fields, selectedFieldId]
  );

  // Filtered palette items
  const filteredPalette = useMemo(() => {
    if (!paletteSearch.trim()) return PALETTE_ITEMS;
    const q = paletteSearch.toLowerCase();
    return PALETTE_ITEMS.filter(
      (p) => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [paletteSearch]);

  // Keyboard shortcut for Cmd/Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // ─── Field CRUD Operations ──────────────────────────────────────────────────

  const handleAddField = (type: FieldType, defaultOptions?: string[]) => {
    const newId = `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const palItem = PALETTE_ITEMS.find((p) => p.type === type);
    const newField: FormField = {
      id: newId,
      label: palItem?.label || 'New Question',
      type,
      required: false,
      placeholder: '',
      options: defaultOptions || (['select', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2', 'Option 3'] : undefined),
    };

    onFormDataChange((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    toast.success(`Added ${newField.label}`);
  };

  const handleUpdateField = (
    id: string,
    key: keyof FormField,
    value: any
  ) => {
    onFormDataChange((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)),
    }));
  };

  const handleDeleteField = (id: string) => {
    onFormDataChange((prev) => {
      const filtered = prev.fields.filter((f) => f.id !== id);
      return {
        ...prev,
        fields: filtered,
        fieldMappings: prev.fieldMappings.filter((m) => m.formFieldId !== id),
      };
    });
    if (selectedFieldId === id) {
      const remaining = formData.fields.filter((f) => f.id !== id);
      setSelectedFieldId(remaining[0]?.id || null);
    }
    toast.info('Field removed');
  };

  const handleDuplicateField = (field: FormField, index: number) => {
    const newId = `f-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: FormField = {
      ...field,
      id: newId,
      label: `${field.label} (Copy)`,
      options: field.options ? [...field.options] : undefined,
    };
    onFormDataChange((prev) => {
      const next = [...prev.fields];
      next.splice(index + 1, 0, duplicated);
      return { ...prev, fields: next };
    });
    setSelectedFieldId(newId);
    toast.success('Field duplicated');
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= formData.fields.length) return;
    onFormDataChange((prev) => {
      const next = [...prev.fields];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, fields: next };
    });
  };

  // ─── AI Generator Handlers ──────────────────────────────────────────────────

  const handleAiGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error('Please describe what form you need');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/form-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, formType: formData.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI form generation failed');

      if (Array.isArray(data.fields) && data.fields.length > 0) {
        onFormDataChange((prev) => ({
          ...prev,
          name: prev.name || data.title || 'AI Generated Form',
          fields: [...prev.fields, ...data.fields],
        }));
        setAiDialogOpen(false);
        setAiPrompt('');
        toast.success(`✨ Added ${data.fields.length} AI-generated fields!`);
      } else {
        toast.info('No fields could be generated from that prompt');
      }
    } catch (err: any) {
      toast.error(err.message || 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Publish Helpers ────────────────────────────────────────────────────────

  const formSlug = formData.name ? formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'form';
  const hostedUrl = `${siteOrigin || 'https://fieseros.com'}/f/${formSlug}`;
  const embedScript = `<script src="${siteOrigin || 'https://fieseros.com'}/embed.js" data-form-slug="${formSlug}" async></script>`;
  const embedIframe = `<iframe src="${hostedUrl}" width="100%" height="650" frameborder="0" style="border-radius:12px; border:none; width:100%;" allow="camera; microphone; geolocation"></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied!`))
      .catch(() => toast.error('Failed to copy'));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 md:-m-6 bg-slate-50 dark:bg-slate-950 overflow-hidden select-none">
      {/* ═════════════════════════════════════════════════════════════════════════
          TOP STUDIO APP BAR (JOTFORM SIGNATURE HEADER)
         ═════════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-border/80 bg-background/95 backdrop-blur px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Back + Editable Form Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">All Forms</span>
          </Button>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-md bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <FileInput className="size-4" />
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Untitled Form"
              className="font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 max-w-[200px] md:max-w-xs truncate"
            />
            <Badge variant="outline" className="text-[10px] hidden md:inline-flex bg-muted/40 font-normal">
              {FORM_TYPES.find((t) => t.value === formData.type)?.label || 'Lead Capture'}
            </Badge>
          </div>
        </div>

        {/* Center: Jotform 3-Pillar Mode Tabs (BUILD | SETTINGS | PUBLISH) */}
        <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/60">
          <button
            onClick={() => { setStudioTab('build'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'build' && !isPreviewMode
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Hammer className="size-3.5" />
            <span>BUILD</span>
          </button>

          <button
            onClick={() => { setStudioTab('settings'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'settings'
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="size-3.5" />
            <span>SETTINGS</span>
          </button>

          <button
            onClick={() => { setStudioTab('publish'); setIsPreviewMode(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-md transition-all',
              studioTab === 'publish'
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Share2 className="size-3.5" />
            <span>PUBLISH</span>
          </button>
        </div>

        {/* Right: Preview Switcher, AI Assistant, and Save Form */}
        <div className="flex items-center gap-2">
          {/* Preview Toggle */}
          <div className="flex items-center gap-1.5 border border-border/80 rounded-md px-2 py-1 bg-background">
            <Eye className={cn('size-3.5', isPreviewMode ? 'text-emerald-600' : 'text-muted-foreground')} />
            <span className="text-[11px] font-medium hidden sm:inline">Preview</span>
            <Switch
              checked={isPreviewMode}
              onCheckedChange={setIsPreviewMode}
              className="scale-75 origin-right"
            />
          </div>

          {/* AI Assistant Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiDialogOpen(true)}
            className="h-8 gap-1.5 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hidden md:flex"
          >
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>AI Assistant</span>
          </Button>

          {/* Save Button */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Form'}</span>
          </Button>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════════════════════
          MAIN STUDIO WORKSPACE
         ═════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ─── 1. BUILD TAB ─────────────────────────────────────────────────── */}
        {studioTab === 'build' && !isPreviewMode && (
          <div className="flex-1 flex overflow-hidden w-full">
            {/* ── LEFT DRAWER: ADD FORM ELEMENTS PALETTE ── */}
            <aside
              className={cn(
                'w-64 lg:w-72 border-r border-border/80 bg-background flex flex-col shrink-0 transition-all duration-200 z-20',
                !sidebarOpen && '-ml-64 lg:-ml-72'
              )}
            >
              {/* Palette Header */}
              <div className="p-3 border-b border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Plus className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Add Form Elements
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {PALETTE_ITEMS.length} Types
                  </Badge>
                </div>
                <Input
                  type="text"
                  placeholder="Search elements..."
                  value={paletteSearch}
                  onChange={(e) => setPaletteSearch(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>

              {/* Palette Items Scroll */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {/* Basic Elements */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                      Basic Inputs
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredPalette
                        .filter((p) => p.category === 'basic')
                        .map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.type}
                              onClick={() => handleAddField(item.type, item.defaultOptions)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                            >
                              <div className="size-7 rounded-md bg-muted flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-muted-foreground group-hover:text-emerald-600 transition-colors">
                                <Icon className="size-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                              </div>
                              <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Choices & Dropdowns */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                      Choices &amp; Menus
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredPalette
                        .filter((p) => p.category === 'choice')
                        .map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.type}
                              onClick={() => handleAddField(item.type, item.defaultOptions)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                            >
                              <div className="size-7 rounded-md bg-muted flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-muted-foreground group-hover:text-emerald-600 transition-colors">
                                <Icon className="size-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                              </div>
                              <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Advanced & Media */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                      Advanced &amp; Media
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredPalette
                        .filter((p) => p.category === 'advanced')
                        .map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.type}
                              onClick={() => handleAddField(item.type, item.defaultOptions)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                            >
                              <div className="size-7 rounded-md bg-muted flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-muted-foreground group-hover:text-emerald-600 transition-colors">
                                <Icon className="size-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                              </div>
                              <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Calculations & Logic */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                      Calculations &amp; Logic
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredPalette
                        .filter((p) => p.category === 'logic')
                        .map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.type}
                              onClick={() => handleAddField(item.type, item.defaultOptions)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-border/60 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group"
                            >
                              <div className="size-7 rounded-md bg-muted flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-muted-foreground group-hover:text-emerald-600 transition-colors">
                                <Icon className="size-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                  {item.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                              </div>
                              <Plus className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </aside>

            {/* ── CENTER: INTERACTIVE FORM PAPER CANVAS ── */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-100 dark:bg-slate-900/70">
              <div className="w-full max-w-2xl space-y-4 pb-20">
                {/* Canvas Paper Card */}
                <div className="bg-background rounded-xl border border-border/80 shadow-md overflow-hidden">
                  {/* Top Decorative Brand Stripe */}
                  <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                  {/* Form Header Area */}
                  <div className="p-6 md:p-8 border-b border-border/60 space-y-2">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Form Title (e.g. Schedule Service Appointment)"
                      className="text-2xl md:text-3xl font-bold w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1"
                    />
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => onFormDataChange((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Add a sub-heading or instructions for your respondents..."
                      rows={2}
                      className="text-xs md:text-sm text-muted-foreground w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 resize-none"
                    />
                  </div>

                  {/* Form Fields List */}
                  <div className="p-4 md:p-6 space-y-3">
                    {formData.fields.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-border/80 rounded-xl space-y-3">
                        <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
                          <Plus className="size-6" />
                        </div>
                        <h4 className="text-sm font-semibold">Your form has no fields yet</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Click elements on the left palette to add questions, or use the AI Assistant to generate a full form in seconds.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Button size="sm" onClick={() => handleAddField('text')} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="size-3.5 mr-1" /> Add First Field
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAiDialogOpen(true)} className="h-8 text-xs">
                            <Sparkles className="size-3.5 mr-1 text-emerald-600" /> AI Generator
                          </Button>
                        </div>
                      </div>
                    ) : (
                      formData.fields.map((field, index) => {
                        const isSelected = selectedFieldId === field.id;

                        return (
                          <div
                            key={field.id}
                            onClick={() => setSelectedFieldId(field.id)}
                            className={cn(
                              'group relative p-4 rounded-xl border transition-all cursor-pointer bg-card',
                              isSelected
                                ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                                : 'border-border/60 hover:border-emerald-500/40 hover:shadow-xs'
                            )}
                          >
                            {/* Hover & Active Field Toolbar */}
                            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border/40">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="text-[10px] font-mono text-muted-foreground/80">#{index + 1}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                  {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                                </Badge>
                                {field.required && (
                                  <Badge className="text-[9px] px-1 py-0 h-4 bg-red-100 dark:bg-red-950 text-red-600 border-none">
                                    Required *
                                  </Badge>
                                )}
                              </div>

                              {/* Action Tools */}
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={(e) => { e.stopPropagation(); handleMoveField(index, 'up'); }}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                                  title="Move Up"
                                >
                                  <MoveUp className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === formData.fields.length - 1}
                                  onClick={(e) => { e.stopPropagation(); handleMoveField(index, 'down'); }}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20"
                                  title="Move Down"
                                >
                                  <MoveDown className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDuplicateField(field, index); }}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  title="Duplicate"
                                >
                                  <Copy className="size-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-muted-foreground hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </div>

                            {/* Field Label & Sub-label (Editable in-place) */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => handleUpdateField(field.id, 'label', e.target.value)}
                                  placeholder="Type question or label here..."
                                  className="font-semibold text-xs md:text-sm w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1"
                                />
                                {field.required && <span className="text-red-500 text-sm font-bold">*</span>}
                              </div>

                              {/* Realistic Field Input Render */}
                              <div className="pt-1">
                                {['text', 'email', 'phone', 'number', 'currency'].includes(field.type) && (
                                  <Input
                                    disabled
                                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                                    className="h-9 text-xs bg-muted/20 border-dashed"
                                  />
                                )}

                                {field.type === 'textarea' && (
                                  <Textarea
                                    disabled
                                    placeholder={field.placeholder || 'Write response here...'}
                                    rows={3}
                                    className="text-xs bg-muted/20 border-dashed resize-none"
                                  />
                                )}

                                {field.type === 'select' && (
                                  <div className="h-9 px-3 rounded-md border border-dashed border-input bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{field.placeholder || 'Select an option...'}</span>
                                    <ChevronDown className="size-4" />
                                  </div>
                                )}

                                {field.type === 'radio' && (
                                  <div className="space-y-1.5 pt-1">
                                    {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="size-3.5 rounded-full border border-primary/60 flex items-center justify-center">
                                          {i === 0 && <div className="size-1.5 rounded-full bg-primary" />}
                                        </div>
                                        <span>{opt}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {field.type === 'checkbox' && (
                                  <div className="space-y-1.5 pt-1">
                                    {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <div className="size-3.5 rounded border border-primary/60 flex items-center justify-center">
                                          {i === 0 && <Check className="size-2.5 text-primary" />}
                                        </div>
                                        <span>{opt}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {field.type === 'rating' && (
                                  <div className="flex items-center gap-1.5 py-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star key={star} className="size-5 text-amber-400 fill-amber-400/30" />
                                    ))}
                                  </div>
                                )}

                                {field.type === 'scale' && (
                                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                      <div
                                        key={num}
                                        className="size-7 rounded-md border border-border/80 flex items-center justify-center text-[11px] font-medium text-muted-foreground"
                                      >
                                        {num}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {field.type === 'file' && (
                                  <div className="border-2 border-dashed border-border/80 rounded-lg p-3 text-center bg-muted/10 space-y-1">
                                    <Paperclip className="size-4 text-muted-foreground mx-auto" />
                                    <p className="text-[11px] text-muted-foreground">Drag and drop files here, or browse</p>
                                  </div>
                                )}

                                {field.type === 'signature' && (
                                  <div className="border border-border/80 rounded-lg p-3 bg-muted/10 h-20 flex flex-col justify-between">
                                    <span className="text-[10px] text-muted-foreground">Sign above with mouse or stylus</span>
                                    <div className="border-b border-muted-foreground/30" />
                                  </div>
                                )}

                                {field.type === 'hidden' && (
                                  <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                    <EyeOff className="size-3.5" />
                                    <span>Hidden Parameter (invisible to user; captures URL query or default value)</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Submit Button Preview */}
                  <div className="p-6 md:p-8 bg-muted/20 border-t border-border/60 flex items-center justify-between">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-6 shadow-sm">
                      Submit Request
                    </Button>
                    <span className="text-[10px] text-muted-foreground">🔒 Powered by Fieseros Secure Forms</span>
                  </div>
                </div>
              </div>
            </main>

            {/* ── RIGHT DRAWER: FIELD PROPERTIES INSPECTOR ── */}
            <aside
              className={cn(
                'w-72 lg:w-80 border-l border-border/80 bg-background flex flex-col shrink-0 transition-all duration-200 z-20',
                !propertiesOpen && '-mr-72 lg:-mr-80'
              )}
            >
              <div className="p-3 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="size-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Field Properties
                  </span>
                </div>
                {selectedField && (
                  <Badge variant="outline" className="text-[10px]">
                    {selectedField.type}
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                {selectedField ? (
                  <div className="space-y-4">
                    {/* General Field Settings */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Question Label</Label>
                        <Input
                          value={selectedField.label}
                          onChange={(e) => handleUpdateField(selectedField.id, 'label', e.target.value)}
                          placeholder="Field Label"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Field Type</Label>
                        <Select
                          value={selectedField.type}
                          onValueChange={(val) => handleUpdateField(selectedField.id, 'type', val as FieldType)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {FIELD_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Placeholder Text</Label>
                        <Input
                          value={selectedField.placeholder || ''}
                          onChange={(e) => handleUpdateField(selectedField.id, 'placeholder', e.target.value)}
                          placeholder="e.g., Jane Doe"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Sub-label / Helper Text</Label>
                        <Input
                          value={selectedField.description || ''}
                          onChange={(e) => handleUpdateField(selectedField.id, 'description', e.target.value)}
                          placeholder="Optional helper text below field"
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Required Switch */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <Label className="text-xs font-semibold">Required Question</Label>
                          <p className="text-[10px] text-muted-foreground">User cannot submit without answering</p>
                        </div>
                        <Switch
                          checked={selectedField.required}
                          onCheckedChange={(v) => handleUpdateField(selectedField.id, 'required', v)}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Choices / Options Editor (for select, radio, checkbox) */}
                    {['select', 'radio', 'checkbox'].includes(selectedField.type) && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Options / Choices</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-emerald-600 hover:text-emerald-700 p-1"
                            onClick={() => {
                              const curr = selectedField.options || [];
                              handleUpdateField(selectedField.id, 'options', [...curr, `Option ${curr.length + 1}`]);
                            }}
                          >
                            <Plus className="size-3 mr-1" /> Add Option
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          {(selectedField.options || []).map((opt, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const next = [...(selectedField.options || [])];
                                  next[i] = e.target.value;
                                  handleUpdateField(selectedField.id, 'options', next);
                                }}
                                className="h-7 text-xs flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                onClick={() => {
                                  const next = (selectedField.options || []).filter((_, idx) => idx !== i);
                                  handleUpdateField(selectedField.id, 'options', next);
                                }}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* CRM Lead Mapping */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Zap className="size-3.5 text-amber-500" />
                        <span>Map to CRM Field</span>
                      </Label>
                      <Select
                        value={formData.fieldMappings.find((m) => m.formFieldId === selectedField.id)?.crmField || 'none'}
                        onValueChange={(crmField) => {
                          onFormDataChange((prev) => {
                            const without = prev.fieldMappings.filter((m) => m.formFieldId !== selectedField.id);
                            if (crmField === 'none') return { ...prev, fieldMappings: without };
                            return { ...prev, fieldMappings: [...without, { formFieldId: selectedField.id, crmField }] };
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select CRM Field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs text-muted-foreground">-- No Mapping --</SelectItem>
                          {CRM_FIELDS.map((cf) => (
                            <SelectItem key={cf.value} value={cf.value} className="text-xs">
                              {cf.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        Automatically populates this CRM lead/customer column when submitted.
                      </p>
                    </div>

                    <Separator />

                    {/* Danger Zone: Delete Field */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteField(selectedField.id)}
                      className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 gap-1.5"
                    >
                      <Trash2 className="size-3.5" /> Delete Field
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-2 text-muted-foreground">
                    <SlidersHorizontal className="size-8 mx-auto opacity-30" />
                    <p className="text-xs">Click any field on the canvas to inspect and edit its properties.</p>
                  </div>
                )}
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* ─── 2. SETTINGS TAB ──────────────────────────────────────────────── */}
        {studioTab === 'settings' && (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-3xl space-y-6 pb-20">
              {/* General Form Settings Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="size-4 text-emerald-600" />
                    General Settings
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Basic form metadata, destination type, and publication status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Form Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => onFormDataChange((prev) => ({ ...prev, name: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Form Purpose / Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) => onFormDataChange((prev) => ({ ...prev, type: v as FormType }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORM_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => onFormDataChange((prev) => ({ ...prev, status: v as FormStatus }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">Active (Accepting Submissions)</SelectItem>
                          <SelectItem value="inactive" className="text-xs">Inactive (Paused)</SelectItem>
                          <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Custom URL Slug</Label>
                      <div className="flex items-center text-xs border rounded-md px-2 bg-muted/20 h-8">
                        <span className="text-muted-foreground mr-1">/f/</span>
                        <input
                          type="text"
                          value={formSlug}
                          readOnly
                          className="bg-transparent border-none text-xs flex-1 focus:outline-none text-foreground font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CRM Automations & Actions Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="size-4 text-amber-500" />
                    CRM Pipeline Automations
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose what happens in your CRM instantly when a customer completes this form.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Primary Submission Action</Label>
                    <RadioGroup
                      value={formData.submissionActions.primary}
                      onValueChange={(v) =>
                        onFormDataChange((prev) => ({
                          ...prev,
                          submissionActions: {
                            ...prev.submissionActions,
                            primary: v as PrimaryAction,
                          },
                        }))
                      }
                      className="grid grid-cols-1 md:grid-cols-2 gap-2"
                    >
                      {PRIMARY_ACTIONS.map((action) => (
                        <div
                          key={action.value}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                            formData.submissionActions.primary === action.value
                              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-border/60 hover:bg-muted/30'
                          )}
                          onClick={() =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: {
                                ...prev.submissionActions,
                                primary: action.value as PrimaryAction,
                              },
                            }))
                          }
                        >
                          <RadioGroupItem value={action.value} id={action.value} className="mt-0.5" />
                          <div className="space-y-0.5">
                            <label htmlFor={action.value} className="text-xs font-semibold cursor-pointer">
                              {action.label}
                            </label>
                            <p className="text-[10px] text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Secondary Alerts & Notifications */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">Secondary Alerts &amp; Triggers</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold">WhatsApp Alert to Owner</p>
                          <p className="text-[10px] text-muted-foreground">Send immediate ping on new lead</p>
                        </div>
                        <Switch
                          checked={formData.submissionActions.additional.sendWhatsAppOwner}
                          onCheckedChange={(v) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: {
                                ...prev.submissionActions,
                                additional: { ...prev.submissionActions.additional, sendWhatsAppOwner: v },
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold">Email Notification to Team</p>
                          <p className="text-[10px] text-muted-foreground">Send full submission via email</p>
                        </div>
                        <Switch
                          checked={formData.submissionActions.additional.sendEmail}
                          onCheckedChange={(v) =>
                            onFormDataChange((prev) => ({
                              ...prev,
                              submissionActions: {
                                ...prev.submissionActions,
                                additional: { ...prev.submissionActions.additional, sendEmail: v },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Thank You Page Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Thank You Screen / Completion
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure the message shown after a customer submits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Completion Headline &amp; Message</Label>
                    <Textarea
                      value={formData.completionMessage || ''}
                      onChange={(e) => onFormDataChange((prev) => ({ ...prev, completionMessage: e.target.value }))}
                      placeholder="Thank you! We have received your request and our dispatcher will contact you within 15 minutes."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {/* ─── 3. PUBLISH TAB ───────────────────────────────────────────────── */}
        {studioTab === 'publish' && (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-3xl space-y-6 pb-20">
              {/* Direct Share Link */}
              <Card className="border-emerald-500/30 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <Globe className="size-4 text-emerald-600" />
                    Share Direct Form Link
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Send this standalone URL directly to customers via SMS, Email, or Social Media.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input value={hostedUrl} readOnly className="h-9 font-mono text-xs bg-muted/30" />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(hostedUrl, 'Direct link')}
                      className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 shrink-0"
                    >
                      <Copy className="size-3.5 mr-1.5" /> Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(hostedUrl, '_blank')}
                      className="h-9 text-xs shrink-0"
                    >
                      <ExternalLink className="size-3.5 mr-1.5" /> Open
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Website Embed Options */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LayoutTemplate className="size-4 text-blue-600" />
                    Embed On Your Website
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Add this form seamlessly to WordPress, Shopify, Webflow, Squarespace, or custom sites.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 1-Line Embed */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">1-Line Universal Script (Recommended)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-emerald-600"
                        onClick={() => copyToClipboard(embedScript, 'Script tag')}
                      >
                        <Copy className="size-3 mr-1" /> Copy Script
                      </Button>
                    </div>
                    <pre className="p-3 bg-muted/40 rounded-lg text-[11px] font-mono overflow-x-auto text-foreground/90 border">
                      {embedScript}
                    </pre>
                  </div>

                  {/* iFrame Embed */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Responsive iFrame Code</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-emerald-600"
                        onClick={() => copyToClipboard(embedIframe, 'iFrame code')}
                      >
                        <Copy className="size-3 mr-1" /> Copy iFrame
                      </Button>
                    </div>
                    <pre className="p-3 bg-muted/40 rounded-lg text-[11px] font-mono overflow-x-auto text-foreground/90 border">
                      {embedIframe}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* QR Code & WhatsApp Direct */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QR Code */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <QrCode className="size-4 text-purple-600" />
                      Printable QR Code
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Put this QR code on service vans, flyers, business cards, and invoices.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center p-4 space-y-3">
                    <div className="p-3 bg-white rounded-xl shadow-inner border border-slate-200">
                      <QRCodePlaceholder formSlug={formSlug} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs w-full"
                      onClick={() => copyToClipboard(hostedUrl, 'QR Code URL')}
                    >
                      <Copy className="size-3 mr-1.5" /> Copy QR URL
                    </Button>
                  </CardContent>
                </Card>

                {/* WhatsApp Direct Share */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="size-4 text-green-600" />
                      WhatsApp Direct Share
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Send to customers directly with one click.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Click below to open WhatsApp with a pre-filled invitation message and link.
                    </p>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                      onClick={() => {
                        const msg = encodeURIComponent(`Hi! Please fill out our form here: ${hostedUrl}`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                      }}
                    >
                      <MessageCircle className="size-4 mr-2" /> Share via WhatsApp
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        )}

        {/* ─── 4. INTERACTIVE LIVE PREVIEW MODE ──────────────────────────────── */}
        {isPreviewMode && (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center bg-slate-900/90 backdrop-blur">
            {/* Viewport Switcher Toolbar */}
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700 mb-6 shadow-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
                className={cn('h-7 px-3 text-xs gap-1.5', previewDevice === 'desktop' ? 'bg-slate-700 text-white' : 'text-slate-400')}
              >
                <Monitor className="size-3.5" /> Desktop
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDevice('tablet')}
                className={cn('h-7 px-3 text-xs gap-1.5', previewDevice === 'tablet' ? 'bg-slate-700 text-white' : 'text-slate-400')}
              >
                <Tablet className="size-3.5" /> Tablet
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
                className={cn('h-7 px-3 text-xs gap-1.5', previewDevice === 'mobile' ? 'bg-slate-700 text-white' : 'text-slate-400')}
              >
                <Smartphone className="size-3.5" /> Mobile
              </Button>
            </div>

            {/* Interactive Form Frame */}
            <div
              className={cn(
                'bg-background rounded-2xl border border-border/80 shadow-2xl overflow-hidden transition-all duration-300 pb-12',
                previewDevice === 'desktop' && 'w-full max-w-2xl',
                previewDevice === 'tablet' && 'w-[640px]',
                previewDevice === 'mobile' && 'w-[375px]'
              )}
            >
              <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="p-6 md:p-8 border-b space-y-2">
                <h2 className="text-2xl font-bold">{formData.name || 'Untitled Form'}</h2>
                {formData.description && <p className="text-xs text-muted-foreground">{formData.description}</p>}
              </div>

              {previewSubmitted ? (
                <div className="p-12 text-center space-y-3">
                  <div className="size-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-lg font-bold">Submission Successful!</h3>
                  <p className="text-xs text-muted-foreground">
                    {formData.completionMessage || 'Thank you! Your submission has been received.'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPreviewSubmitted(false); setPreviewAnswers({}); }}
                    className="mt-4 text-xs"
                  >
                    Submit Another Response
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPreviewSubmitted(true);
                    toast.success('Test response submitted!');
                  }}
                  className="p-6 space-y-4"
                >
                  {formData.fields.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <span>{f.label}</span>
                        {f.required && <span className="text-red-500">*</span>}
                      </Label>
                      {f.description && <p className="text-[10px] text-muted-foreground">{f.description}</p>}

                      {['text', 'email', 'phone', 'number', 'currency'].includes(f.type) && (
                        <Input
                          required={f.required}
                          type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                          placeholder={f.placeholder}
                          value={previewAnswers[f.id] || ''}
                          onChange={(e) => setPreviewAnswers({ ...previewAnswers, [f.id]: e.target.value })}
                          className="h-9 text-xs"
                        />
                      )}

                      {f.type === 'textarea' && (
                        <Textarea
                          required={f.required}
                          placeholder={f.placeholder}
                          value={previewAnswers[f.id] || ''}
                          onChange={(e) => setPreviewAnswers({ ...previewAnswers, [f.id]: e.target.value })}
                          rows={3}
                          className="text-xs"
                        />
                      )}

                      {f.type === 'select' && (
                        <Select
                          value={previewAnswers[f.id] || ''}
                          onValueChange={(val) => setPreviewAnswers({ ...previewAnswers, [f.id]: val })}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder={f.placeholder || 'Choose option...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(f.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {f.type === 'radio' && (
                        <RadioGroup
                          value={previewAnswers[f.id] || ''}
                          onValueChange={(val) => setPreviewAnswers({ ...previewAnswers, [f.id]: val })}
                          className="space-y-1.5 pt-1"
                        >
                          {(f.options || []).map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                              <RadioGroupItem value={opt} id={`${f.id}-${opt}`} />
                              <label htmlFor={`${f.id}-${opt}`} className="text-xs cursor-pointer">{opt}</label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {f.type === 'rating' && (
                        <div className="flex items-center gap-2 py-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setPreviewAnswers({ ...previewAnswers, [f.id]: s })}
                              className="focus:outline-none"
                            >
                              <Star
                                className={cn(
                                  'size-6 transition-colors',
                                  (previewAnswers[f.id] || 0) >= s
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300'
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-4">
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold">
                      Submit Form
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </main>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          AI FORM GENERATOR MODAL (TRIGGERED FROM STUDIO TOP BAR)
         ═════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-600" />
              AI Form Generator
            </DialogTitle>
            <DialogDescription className="text-xs">
              Describe your business or service intake requirements, and AI will create all questions and input types automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">What kind of form do you want to build?</Label>
              <Textarea
                placeholder="e.g. Commercial HVAC Inspection form with customer contact, equipment serial number, filter sizes, photo upload, and e-signature..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="text-xs resize-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Plumbing Service Call',
                'HVAC Diagnostic Intake',
                'Electrical Quote Request',
                'Post-Service Customer Feedback',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setAiPrompt(sample)}
                  className="text-[10px] bg-muted/60 hover:bg-muted px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  + {sample}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
              <span>{aiLoading ? 'Generating...' : 'Generate Fields'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
