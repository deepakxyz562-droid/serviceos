'use client';

/**
 * Fieseros Universal Studio - Inspector Panel (Right Drawer)
 * Contextual 3-Tab Elementor Inspector: Content | Style | Advanced
 */

import React from 'react';
import {
  Sliders,
  Palette,
  Zap,
  Trash2,
  Copy,
  Plus,
  Eye,
  EyeOff,
  Calculator,
  Sparkles,
  Bot,
  Calendar,
  CreditCard,
  Layers,
  Code2,
  Lock,
  Unlock,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudioNode } from '@/lib/studio/schema/node';

interface InspectorProps {
  selectedNode: StudioNode | null;
  onUpdateProps: (props: Record<string, any>) => void;
  onUpdateStyle: (style: Record<string, any>) => void;
  onUpdateAdvanced: (advanced: Record<string, any>) => void;
  onDeleteNode?: () => void;
  onDuplicateNode?: () => void;
  brandColor?: string;
}

export function StudioInspector({
  selectedNode,
  onUpdateProps,
  onUpdateStyle,
  onUpdateAdvanced,
  onDeleteNode,
  onDuplicateNode,
  brandColor = '#059669',
}: InspectorProps) {
  if (!selectedNode) {
    return (
      <aside className="w-80 lg:w-88 border-l border-border/80 bg-background flex flex-col h-full shrink-0 items-center justify-center p-6 text-center text-muted-foreground select-none">
        <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-3">
          <Sliders className="size-6" />
        </div>
        <p className="text-xs font-bold text-foreground">No Element Selected</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
          Click on any container, form input, AI agent, or button on the canvas to inspect and edit its properties.
        </p>
      </aside>
    );
  }

  const { props = {}, style = {}, advanced = {} } = selectedNode;

  return (
    <aside className="w-80 lg:w-88 border-l border-border/80 bg-background flex flex-col h-full shrink-0 select-none z-20">
      {/* Header Bar */}
      <div className="p-3 border-b border-border/80 bg-muted/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/10 text-primary border-primary/20">
            {selectedNode.widgetType.replace('_', ' ')}
          </Badge>
          <span className="text-xs font-bold truncate max-w-[130px]">{selectedNode.name}</span>
        </div>

        <div className="flex items-center gap-1">
          {onDuplicateNode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDuplicateNode}
              className="size-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="size-3.5" />
            </Button>
          )}
          {onDeleteNode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDeleteNode}
              className="size-7 p-0 text-muted-foreground hover:text-rose-600 cursor-pointer"
              title="Delete Element"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 3 Inspector Tabs: Content | Style | Advanced */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-3 h-9 p-1 bg-muted/40 rounded-none border-b border-border/60">
          <TabsTrigger value="content" className="text-[11px] font-semibold gap-1 data-[state=active]:bg-background">
            <Sliders className="size-3" /> Content
          </TabsTrigger>
          <TabsTrigger value="style" className="text-[11px] font-semibold gap-1 data-[state=active]:bg-background">
            <Palette className="size-3" /> Style
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-[11px] font-semibold gap-1 data-[state=active]:bg-background">
            <Zap className="size-3 text-amber-500" /> Advanced
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: CONTENT (Contextual by Node Type) ─── */}
        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          {/* Label / Title for Heading / Inputs */}
          {props.title !== undefined && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold">Headline Title</Label>
              <Input
                value={props.title}
                onChange={(e) => onUpdateProps({ title: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          )}

          {props.label !== undefined && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold">Field Label</Label>
              <Input
                value={props.label}
                onChange={(e) => onUpdateProps({ label: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          )}

          {props.placeholder !== undefined && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold">Placeholder Text</Label>
              <Input
                value={props.placeholder}
                onChange={(e) => onUpdateProps({ placeholder: e.target.value })}
                className="text-xs h-8"
              />
            </div>
          )}

          {props.text !== undefined && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold">Description Text</Label>
              <Textarea
                value={props.text}
                onChange={(e) => onUpdateProps({ text: e.target.value })}
                rows={3}
                className="text-xs"
              />
            </div>
          )}

          {/* AI Concierge Specific Content */}
          {selectedNode.widgetType === 'ai_chat_concierge' && (
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-xl space-y-2.5">
              <Label className="text-[11px] font-bold flex items-center gap-1.5 text-purple-900 dark:text-purple-200">
                <Sparkles className="size-3.5 text-purple-600" /> AI Persona & Greeting
              </Label>
              <Select
                value={props.persona || 'friendly'}
                onValueChange={(v) => onUpdateProps({ persona: v })}
              >
                <SelectTrigger className="text-xs h-8 bg-background">
                  <SelectValue placeholder="Select Persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly & Warm Dispatcher</SelectItem>
                  <SelectItem value="professional">Corporate & Professional</SelectItem>
                  <SelectItem value="technical">Technical Specialist</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold">Welcome Greeting</Label>
                <Textarea
                  value={props.greeting || ''}
                  onChange={(e) => onUpdateProps({ greeting: e.target.value })}
                  rows={2}
                  className="text-xs bg-background"
                />
              </div>
            </div>
          )}

          {/* Cognito Math / Calculation Formula */}
          {props.formula !== undefined && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                  <Calculator className="size-3.5 text-indigo-600" /> Math Calculation Formula
                </Label>
                <Badge className="text-[9px] bg-indigo-600 text-white">Cognito Engine</Badge>
              </div>
              <Input
                value={props.formula}
                onChange={(e) => onUpdateProps({ formula: e.target.value })}
                placeholder="= (sqft * 4.50) + 120"
                className="text-xs font-mono h-8 bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                Live variables: <code className="text-indigo-600 font-mono">sqft</code>, <code className="text-indigo-600 font-mono">rooms</code>, <code className="text-indigo-600 font-mono">hours</code>.
              </p>
            </div>
          )}

          {/* Required Field Switch */}
          {props.required !== undefined && (
            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl border border-border/60">
              <div>
                <p className="text-xs font-semibold">Required Field</p>
                <p className="text-[10px] text-muted-foreground">User cannot submit without completing</p>
              </div>
              <Switch
                checked={props.required}
                onCheckedChange={(c) => onUpdateProps({ required: c })}
              />
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 2: STYLE (Typography, Colors, Borders, Spacing) ─── */}
        <TabsContent value="style" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          {/* Column Grid Width */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Column Width (Grid Span)</Label>
            <div className="grid grid-cols-4 gap-1">
              {([12, 6, 4, 3] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => onUpdateStyle({ colSpan: cols })}
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

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold">Background Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.backgroundColor || '#ffffff'}
                onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
                className="size-8 rounded-lg cursor-pointer border p-0.5"
              />
              <Input
                value={style.backgroundColor || ''}
                onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
                placeholder="#ffffff"
                className="text-xs font-mono h-8 flex-1"
              />
            </div>
          </div>

          {/* Corner Rounding */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Corner Rounding</Label>
            <Select
              value={style.border?.radius || '16px'}
              onValueChange={(val) => onUpdateStyle({ border: { ...style.border, radius: val } })}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Corner Radius" />
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

        {/* ─── TAB 3: ADVANCED (Data Binding, Logic, Actions) ─── */}
        <TabsContent value="advanced" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
          {/* Dynamic Data Tag Binding */}
          <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-2">
            <Label className="text-[11px] font-bold flex items-center gap-1.5">
              <Type className="size-3.5 text-primary" /> Dynamic Data Binding
            </Label>
            <Input
              value={advanced.dataBinding?.tag || ''}
              onChange={(e) =>
                onUpdateAdvanced({
                  dataBinding: { ...advanced.dataBinding, tag: e.target.value, sourceType: 'dynamic_tag' },
                })
              }
              placeholder="{{customer.firstName}} or {{job.address}}"
              className="text-xs font-mono h-8 bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Embed live CRM customer tags or database fields.
            </p>
          </div>

          {/* Click Action Trigger */}
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
            <Label className="text-[11px] font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <Zap className="size-3.5 text-amber-500" /> Click / Action Trigger
            </Label>
            <Select
              value={advanced.onClickAction?.type || 'submit_form'}
              onValueChange={(val: any) =>
                onUpdateAdvanced({
                  onClickAction: { ...advanced.onClickAction, type: val },
                })
              }
            >
              <SelectTrigger className="text-xs h-8 bg-background">
                <SelectValue placeholder="Select Trigger Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submit_form">Submit Form / Entry</SelectItem>
                <SelectItem value="trigger_ai_agent">Trigger AI Concierge Chat</SelectItem>
                <SelectItem value="book_calendar">Open Booking Calendar</SelectItem>
                <SelectItem value="stripe_checkout">Initiate Stripe Checkout</SelectItem>
                <SelectItem value="phone_call">Direct Tap-to-Call</SelectItem>
                <SelectItem value="whatsapp_chat">Open WhatsApp Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-2 p-3 bg-muted/40 border border-border/60 rounded-xl">
            <Label className="text-[11px] font-bold">Responsive Visibility</Label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span>Hide on Mobile (&lt;768px)</span>
                <Switch
                  checked={style.hideOnMobile || false}
                  onCheckedChange={(c) => onUpdateStyle({ hideOnMobile: c })}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Hide on Desktop (&gt;1024px)</span>
                <Switch
                  checked={style.hideOnDesktop || false}
                  onCheckedChange={(c) => onUpdateStyle({ hideOnDesktop: c })}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
