'use client';

import React, { useState } from 'react';
import {
  UniversalComponentNode,
} from '@/lib/forms/universal-component-types';
import { evaluateFormula, formatCalculationOutput } from '@/lib/forms/calculation-engine';
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Edit2,
  CheckCircle2,
  Calendar,
  CreditCard,
  Phone,
  MessageSquare,
  Bot,
  MapPin,
  Calculator,
  User,
  Star,
  FileText,
  DollarSign,
  Maximize2,
  Layers,
  ChevronRight,
  Send,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UniversalStudioCanvasProps {
  rootNode: UniversalComponentNode;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, updated: Partial<UniversalComponentNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onAddChildNode: (parentId: string, type: string) => void;
  viewport?: 'desktop' | 'tablet' | 'mobile';
  brandColor?: string;
}

export function UniversalStudioCanvas({
  rootNode,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onAddChildNode,
  viewport = 'desktop',
  brandColor = '#059669',
}: UniversalStudioCanvasProps) {
  // Live calculation test state
  const [formValues, setFormValues] = useState<Record<string, any>>({
    sqft: 1500,
    rooms: 3,
    hours: 4,
    hourlyRate: 85,
  });

  if (!rootNode) {
    return (
      <div className="w-full flex-1 flex items-center justify-center p-8 text-muted-foreground text-sm">
        No canvas root node defined.
      </div>
    );
  }

  const renderComponentNode = (node: UniversalComponentNode) => {
    if (!node || !node.id) return null;
    const isSelected = selectedNodeId === node.id;
    const { style = {}, props = {}, behavior = {} } = node;

    // Evaluate live formula if calculation field
    let calculatedVal = 0;
    if (node.type === 'calculation_field' && props.calculationFormula) {
      try {
        calculatedVal = evaluateFormula(props.calculationFormula, formValues, 0);
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
        className={`relative group/node transition-all rounded-2xl ${colSpanClasses} ${
          isSelected
            ? 'ring-2 ring-primary ring-offset-2 shadow-md'
            : 'hover:ring-1 hover:ring-primary/40'
        }`}
        style={{
          backgroundColor: style.backgroundColor || undefined,
          borderRadius: style.border?.radius || '16px',
          padding: style.padding || '12px',
        }}
      >
        {/* On-Hover Action Toolbar (Elementor Style) */}
        <div className="absolute -top-3.5 right-2 z-30 opacity-0 group-hover/node:opacity-100 transition-opacity flex items-center gap-0.5 bg-slate-900 text-white rounded-lg p-0.5 shadow-xl text-[10px]">
          <span className="px-1.5 py-0.5 font-mono text-[9px] text-slate-300 font-bold uppercase">
            {(node.type || 'element').replace(/_/g, ' ')}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateNode(node.id);
              toast.success('Duplicated element');
            }}
            className="p-1 hover:bg-white/20 rounded text-slate-200 hover:text-white"
            title="Duplicate"
          >
            <Copy className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
              toast.info('Deleted element');
            }}
            className="p-1 hover:bg-rose-600 rounded text-rose-300 hover:text-white"
            title="Delete"
          >
            <Trash2 className="size-3" />
          </button>
        </div>

        {/* ─── RENDER SPECIFIC COMPONENT TYPES ─── */}
        {node.type === 'container' || node.type === 'section' ? (
          <div className="space-y-3 min-h-[60px]">
            {node.children && node.children.length > 0 ? (
              <div className="grid grid-cols-12 gap-3">
                {node.children.map((child) => renderComponentNode(child))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center text-xs text-muted-foreground">
                Drop elements here or click + to add components
              </div>
            )}
          </div>
        ) : node.type === 'heading' ? (
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-snug">
            {props.label || 'Headline Text'}
          </h2>
        ) : node.type === 'paragraph' ? (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {props.placeholder || 'Paragraph description text...'}
          </p>
        ) : node.type === 'calculation_field' ? (
          <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                <Calculator className="size-3 text-indigo-600" />
                {props.label || 'Estimated Quote'}
              </span>
              <p className="text-[11px] text-muted-foreground font-mono">
                Formula: {props.calculationFormula || '= sqft * 4.5'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                {formatCalculationOutput(calculatedVal || 675, { currencySymbol: props.currencySymbol || '$' })}
              </span>
            </div>
          </div>
        ) : node.type === 'ai_chat_concierge' ? (
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/30 flex items-center justify-center text-primary">
                  <Bot className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">{props.label || '24/7 AI Service Concierge'}</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online &amp; Instant Answering
                  </p>
                </div>
              </div>
              <Badge className="bg-primary/20 text-white border-primary/30 text-[10px]">AI Agent</Badge>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl text-xs text-slate-200">
              "{props.greetingText || 'Hi! How can I assist you with your project today?'}"
            </div>
          </div>
        ) : node.type === 'button' ? (
          <Button
            type="button"
            className="w-full text-xs font-bold h-9 rounded-xl shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            {props.label || 'Submit Request'}
          </Button>
        ) : (
          /* Standard Form Input Field */
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center justify-between">
              <span>{props.label || 'Input Field'}</span>
              {props.required && <span className="text-rose-500 text-[11px]">*</span>}
            </label>
            <Input
              placeholder={props.placeholder || 'Enter value...'}
              className="text-xs h-9 rounded-xl bg-slate-50 dark:bg-slate-950/50"
              readOnly
            />
          </div>
        )}
      </div>
    );
  };

  const viewportWidthClass = {
    desktop: 'max-w-4xl',
    tablet: 'max-w-2xl',
    mobile: 'max-w-[400px]',
  }[viewport];

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start p-4 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950">
      <div className={`w-full ${viewportWidthClass} transition-all duration-300 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 min-h-[500px]`}>
        {renderComponentNode(rootNode)}
      </div>
    </div>
  );
}
