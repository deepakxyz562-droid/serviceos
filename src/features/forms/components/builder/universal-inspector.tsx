'use client';

import React from 'react';
import {
  UniversalComponentNode,
} from '@/lib/forms/universal-component-types';
import {
  Sliders,
  Palette,
  Zap,
  Sparkles,
  Trash2,
  Copy,
  Plus,
  ArrowRight,
  Eye,
  EyeOff,
  DollarSign,
  Calculator,
  Lock,
  Link,
  MessageSquare,
  Calendar,
  Phone,
  Layout,
  Type,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface UniversalInspectorProps {
  selectedNode: UniversalComponentNode | null;
  onUpdateNode: (updated: Partial<UniversalComponentNode>) => void;
  onDeleteNode?: () => void;
  onDuplicateNode?: () => void;
  brandColor?: string;
}

export function UniversalInspector({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  brandColor = '#059669',
}: UniversalInspectorProps) {
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3">
        <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/60">
          <Sliders className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-foreground">No Element Selected</p>
          <p className="text-[11px] text-muted-foreground">
            Click on any section, form input, AI agent, or action tile to inspect and customize its properties.
          </p>
        </div>
      </div>
    );
  }

  const { style = {}, props = {}, behavior = {} } = selectedNode;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-foreground font-sans select-none">
      {/* Element Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/10 text-primary border-primary/20">
            {selectedNode.type}
          </Badge>
          <span className="text-xs font-bold truncate max-w-[140px]">{selectedNode.name || 'Component'}</span>
        </div>

        <div className="flex items-center gap-1">
          {onDuplicateNode && (
            <button
              type="button"
              onClick={onDuplicateNode}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="size-3.5" />
            </button>
          )}
          {onDeleteNode && (
            <button
              type="button"
              onClick={onDeleteNode}
              className="p-1 rounded-md hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3 Inspector Tabs: Style | Content | Behavior */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-3 h-9 p-1 bg-muted/60 rounded-none border-b border-border/60">
          <TabsTrigger value="content" className="text-[11px] font-semibold gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Sliders className="size-3" /> Content
          </TabsTrigger>
          <TabsTrigger value="style" className="text-[11px] font-semibold gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Palette className="size-3" /> Style
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-[11px] font-semibold gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Zap className="size-3 text-amber-500" /> Actions
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: CONTENT & PROPS ─── */}
        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          {/* Label & Placeholder */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Label / Title</Label>
            <Input
              value={props.label || ''}
              onChange={(e) =>
                onUpdateNode({
                  props: { ...props, label: e.target.value },
                  name: e.target.value || selectedNode.name,
                })
              }
              placeholder="e.g. Property Square Footage"
              className="text-xs h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Placeholder / Subtext</Label>
            <Input
              value={props.placeholder || ''}
              onChange={(e) => onUpdateNode({ props: { ...props, placeholder: e.target.value } })}
              placeholder="e.g. Enter total square footage..."
              className="text-xs h-8"
            />
          </div>

          {/* Cognito Math / Calculation Formula if Calculation Field */}
          {(selectedNode.type === 'calculation_field' || selectedNode.type === 'number_input') && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                  <Calculator className="size-3.5 text-indigo-600" /> Math Calculation Formula
                </Label>
                <Badge className="text-[9px] bg-indigo-600 text-white">Cognito Logic</Badge>
              </div>
              <Input
                value={props.calculationFormula || ''}
                onChange={(e) => onUpdateNode({ props: { ...props, calculationFormula: e.target.value } })}
                placeholder="= (sqft * 4.50) + (rooms * 25)"
                className="text-xs font-mono h-8 bg-white dark:bg-slate-900"
              />
              <p className="text-[10px] text-muted-foreground">
                Reference variables e.g. <code className="text-indigo-600 font-mono">sqft</code>, <code className="text-indigo-600 font-mono">hours</code> or <code className="text-indigo-600 font-mono">{"{{field_id}}"}</code>.
              </p>
            </div>
          )}

          {/* AI Agent Configuration if AI Node */}
          {selectedNode.type === 'ai_chat_concierge' && (
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-2.5">
              <Label className="text-[11px] font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200">
                <Sparkles className="size-3.5 text-emerald-600" /> AI Persona &amp; Voice Tone
              </Label>
              <Select
                value={props.voiceTone || 'friendly'}
                onValueChange={(val: any) => onUpdateNode({ props: { ...props, voiceTone: val } })}
              >
                <SelectTrigger className="text-xs h-8 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Voice Tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly &amp; Warm</SelectItem>
                  <SelectItem value="professional">Corporate &amp; Professional</SelectItem>
                  <SelectItem value="medical">Empathetic &amp; Clinical</SelectItem>
                  <SelectItem value="sales">High-Conversion Sales Pro</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <Label className="text-[10px] font-semibold">Greeting Text</Label>
                <Textarea
                  value={props.greetingText || ''}
                  onChange={(e) => onUpdateNode({ props: { ...props, greetingText: e.target.value } })}
                  placeholder="Hi! How can I assist you with your project today?"
                  rows={2}
                  className="text-xs bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {/* Required Field Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border">
            <div>
              <p className="text-xs font-semibold">Required Field</p>
              <p className="text-[10px] text-muted-foreground">User cannot proceed without completing</p>
            </div>
            <Switch
              checked={props.required || false}
              onCheckedChange={(c) => onUpdateNode({ props: { ...props, required: c } })}
            />
          </div>
        </TabsContent>

        {/* ─── TAB 2: STYLE & APPEARANCE (Elementor Parity) ─── */}
        <TabsContent value="style" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          {/* Column Grid Span */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Grid Column Width</Label>
            <div className="grid grid-cols-4 gap-1">
              {([12, 6, 4, 3] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => onUpdateNode({ style: { ...style, colSpan: cols } })}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                    (style.colSpan || 12) === cols
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 hover:bg-muted border-border text-foreground'
                  }`}
                >
                  {cols === 12 ? '100%' : cols === 6 ? '50%' : cols === 4 ? '33%' : '25%'}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color & Photo */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold">Background Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.backgroundColor || '#ffffff'}
                onChange={(e) => onUpdateNode({ style: { ...style, backgroundColor: e.target.value } })}
                className="size-8 rounded-lg cursor-pointer border p-0.5"
              />
              <Input
                value={style.backgroundColor || ''}
                onChange={(e) => onUpdateNode({ style: { ...style, backgroundColor: e.target.value } })}
                placeholder="#ffffff"
                className="text-xs font-mono h-8 flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Backdrop Image URL</Label>
            <Input
              value={style.backgroundImageUrl || ''}
              onChange={(e) => onUpdateNode({ style: { ...style, backgroundImageUrl: e.target.value } })}
              placeholder="https://images.unsplash.com/..."
              className="text-xs h-8"
            />
          </div>

          {/* Border Radius */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Corner Rounding</Label>
            <Select
              value={style.border?.radius || '16px'}
              onValueChange={(val) => onUpdateNode({ style: { ...style, border: { ...style.border, radius: val } } })}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Border Radius" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">Square (0px)</SelectItem>
                <SelectItem value="8px">Soft (8px)</SelectItem>
                <SelectItem value="16px">Rounded (16px)</SelectItem>
                <SelectItem value="24px">Extra Rounded (24px)</SelectItem>
                <SelectItem value="9999px">Pill (Full)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* ─── TAB 3: ACTIONS & BEHAVIOR (Cognito Logic) ─── */}
        <TabsContent value="actions" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2.5">
            <Label className="text-[11px] font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <Zap className="size-3.5 text-amber-500" /> Click / Trigger Action
            </Label>
            <Select
              value={behavior.onClickAction?.type || 'submit_form'}
              onValueChange={(val: any) =>
                onUpdateNode({
                  behavior: {
                    ...behavior,
                    onClickAction: { ...behavior.onClickAction, type: val },
                  },
                })
              }
            >
              <SelectTrigger className="text-xs h-8 bg-white dark:bg-slate-900">
                <SelectValue placeholder="Select Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submit_form">Submit Form / Entry</SelectItem>
                <SelectItem value="open_sub_form">Open Sub-Form Drawer</SelectItem>
                <SelectItem value="trigger_ai_agent">Trigger AI Concierge Chat</SelectItem>
                <SelectItem value="book_calendar">Open Calendar Slot Picker</SelectItem>
                <SelectItem value="stripe_checkout">Initiate Stripe Checkout</SelectItem>
                <SelectItem value="open_whatsapp">Open WhatsApp Direct Message</SelectItem>
                <SelectItem value="call_phone">Direct Phone Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Logic Section */}
          <div className="space-y-2 p-3 bg-muted/40 border border-border/60 rounded-xl">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold">Conditional Visibility</Label>
              <Badge variant="outline" className="text-[9px]">IF / THEN</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Show or hide this component automatically based on the user's answers.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
