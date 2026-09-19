'use client';

/**
 * Fieseros Universal Studio - Main Elementor Visual Canvas
 * Interactive visual canvas with container/widget hover boundaries (Cyan/Pink),
 * action toolbars, live responsive viewports, and rich widget renderers.
 */

import React, { useState } from 'react';
import {
  SquareDashed,
  Plus,
  Trash2,
  Copy,
  Move,
  Bot,
  Calculator,
  CalendarCheck2,
  ShieldCheck,
  CreditCard,
  Phone,
  Sparkles,
  MapPin,
  CheckCircle2,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StudioNode } from '@/lib/studio/schema/node';
import { evaluateFormula, formatCalculationOutput } from '@/lib/forms/calculation-engine';

interface CanvasProps {
  rootNode: StudioNode;
  selectedNodeId: string | null;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onSelectNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onAddChildNode: (parentId: string) => void;
  brandColor?: string;
}

export function StudioCanvas({
  rootNode,
  selectedNodeId,
  viewport,
  onSelectNode,
  onDeleteNode,
  onDuplicateNode,
  onAddChildNode,
  brandColor = '#059669',
}: CanvasProps) {
  // Live calculation test state
  const [formValues] = useState<Record<string, any>>({
    sqft: 1500,
    rooms: 3,
    hours: 4,
    hourlyRate: 85,
  });

  const renderNode = (node: StudioNode): React.ReactNode => {
    if (!node || !node.id) return null;
    if (node.advanced?.isHidden) return null;

    const isSelected = selectedNodeId === node.id;
    const isContainer = node.nodeType === 'container';
    const { props = {}, style = {}, advanced = {} } = node;

    // Evaluate live formula if calculation field
    let calculatedVal = 0;
    if (node.widgetType === 'calculation_field' && props.formula) {
      try {
        calculatedVal = evaluateFormula(props.formula, formValues, 0);
      } catch {
        calculatedVal = 0;
      }
    }

    const colSpanClasses = {
      12: 'col-span-12',
      6: 'col-span-12 sm:col-span-6',
      4: 'col-span-12 sm:col-span-4',
      3: 'col-span-12 sm:col-span-3',
    }[(style.colSpan as 12 | 6 | 4 | 3) || 12] || 'col-span-12';

    return (
      <div
        key={node.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node.id);
        }}
        className={`relative group/element transition-all ${colSpanClasses} ${
          isSelected
            ? isContainer
              ? 'ring-2 ring-cyan-500 shadow-md ring-offset-2'
              : 'ring-2 ring-pink-500 shadow-md ring-offset-2'
            : isContainer
            ? 'hover:ring-1 hover:ring-cyan-500/50'
            : 'hover:ring-1 hover:ring-pink-500/50'
        }`}
        style={{
          backgroundColor: style.backgroundColor || undefined,
          borderRadius: style.border?.radius || (isContainer ? '20px' : '12px'),
          padding: style.padding || (isContainer ? '16px' : '8px'),
          display: style.display || (isContainer ? 'flex' : undefined),
          flexDirection: style.flexDirection || (isContainer ? 'column' : undefined),
          gap: style.gap || (isContainer ? '12px' : undefined),
        }}
      >
        {/* On-Hover Action Badge & Handles */}
        <div
          className={`absolute -top-3.5 right-2 z-30 opacity-0 group-hover/element:opacity-100 transition-opacity flex items-center gap-0.5 rounded-lg p-0.5 shadow-xl text-[10px] ${
            isContainer ? 'bg-cyan-900 text-cyan-200' : 'bg-pink-950 text-pink-200'
          }`}
        >
          <span className="px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
            {node.widgetType.replace('_', ' ')}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateNode(node.id);
            }}
            className="p-1 hover:bg-white/20 rounded text-slate-200 hover:text-white"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            className="p-1 hover:bg-rose-600 rounded text-rose-300 hover:text-white"
            title="Delete"
          >
            <Trash2 className="size-3" />
          </button>
        </div>

        {/* ─── RENDER SPECIFIC WIDGETS ─── */}
        {isContainer ? (
          <div className="w-full space-y-3 min-h-[40px]">
            {node.children && node.children.length > 0 ? (
              <div className="grid grid-cols-12 gap-3 w-full">
                {node.children.map(renderNode)}
              </div>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChildNode(node.id);
                }}
                className="border border-dashed border-cyan-500/40 rounded-xl p-4 text-center text-xs text-muted-foreground hover:bg-cyan-500/5 cursor-pointer"
              >
                + Drop elements here or click to add
              </div>
            )}
          </div>
        ) : node.widgetType === 'heading' ? (
          <h2
            className="font-extrabold tracking-tight text-foreground leading-snug"
            style={{
              fontSize: style.typography?.fontSize || '24px',
              fontWeight: style.typography?.fontWeight || 'bold',
              color: style.typography?.color || undefined,
              textAlign: (style.typography?.alignment as any) || 'left',
            }}
          >
            {props.title || 'Headline Text'}
          </h2>
        ) : node.widgetType === 'text' ? (
          <p
            className="text-muted-foreground leading-relaxed"
            style={{
              fontSize: style.typography?.fontSize || '14px',
              color: style.typography?.color || undefined,
            }}
          >
            {props.text || 'Paragraph text content...'}
          </p>
        ) : node.widgetType === 'button' ? (
          <Button
            type="button"
            className="w-full text-xs font-bold h-10 rounded-xl shadow-xs"
            style={{ backgroundColor: style.backgroundColor || brandColor }}
          >
            {props.label || 'Submit Request'}
          </Button>
        ) : node.widgetType === 'badge' ? (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 border-emerald-200 text-xs py-1 px-3 w-fit">
            {props.text || '⭐ 5-Star Pro'}
          </Badge>
        ) : node.widgetType === 'image' ? (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-border/60">
            <img
              src={props.url || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80'}
              alt={props.alt || 'Visual'}
              className="w-full h-48 object-cover"
            />
          </div>
        ) : node.widgetType === 'ai_chat_concierge' ? (
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/30 flex items-center justify-center text-primary">
                  <Bot className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">{props.title || '24/7 AI Service Concierge'}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online &amp; Answering
                  </p>
                </div>
              </div>
              <Badge className="bg-primary/20 text-white border-primary/30 text-[10px]">AI Agent</Badge>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl text-xs text-slate-200">
              "{props.greeting || 'Hi! How can I assist you with your project today?'}"
            </div>
          </div>
        ) : node.widgetType === 'calculation_field' ? (
          <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                <Calculator className="size-3 text-indigo-600" />
                {props.label || 'Estimated Quote'}
              </span>
              <p className="text-[11px] text-muted-foreground font-mono">
                Formula: {props.formula || '= sqft * 4.50'}
              </p>
            </div>
            <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatCalculationOutput(calculatedVal || 795, { currencySymbol: props.currencySymbol || '$' })}
            </span>
          </div>
        ) : node.widgetType === 'booking_calendar' ? (
          <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <CalendarCheck2 className="size-4 text-emerald-600" />
                {props.title || 'Live Technician Calendar'}
              </span>
              <Badge variant="outline" className="text-[10px]">Instant Booking</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['9:00 AM', '1:00 PM', '4:30 PM'].map((slot, i) => (
                <div key={i} className="py-2 text-center text-xs font-semibold rounded-xl bg-background border hover:border-emerald-500 cursor-pointer shadow-2xs">
                  {slot}
                </div>
              ))}
            </div>
          </div>
        ) : node.widgetType === 'service_passport' ? (
          <div className="p-3.5 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{props.title || 'Service Passport™'}</p>
                <p className="text-[11px] text-muted-foreground">Equipment Health &amp; Active Warranties</p>
              </div>
            </div>
            <Badge className="bg-teal-600 text-white text-[10px]">Verified Pro</Badge>
          </div>
        ) : (
          /* Standard Form Inputs */
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center justify-between">
              <span>{props.label || 'Input Field'}</span>
              {props.required && <span className="text-rose-500 text-[11px]">*</span>}
            </label>
            <Input
              placeholder={props.placeholder || 'Enter value...'}
              className="text-xs h-9 rounded-xl bg-background"
              readOnly
            />
          </div>
        )}
      </div>
    );
  };

  const viewportWidthClass = {
    desktop: 'max-w-5xl',
    tablet: 'max-w-2xl',
    mobile: 'max-w-[400px]',
  }[viewport];

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start p-4 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 select-none">
      <div className={`w-full ${viewportWidthClass} transition-all duration-300 min-h-[600px]`}>
        {renderNode(rootNode)}
      </div>
    </div>
  );
}
