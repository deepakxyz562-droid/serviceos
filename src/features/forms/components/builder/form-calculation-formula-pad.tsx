'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Calculator,
  Plus,
  Search,
  Check,
  X,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  Delete,
  CornerDownLeft,
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  CheckSquare,
  CircleDot,
  FileText,
  DollarSign,
  MapPin,
  HelpCircle,
  Hash,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { resolveIcon } from '@/lib/forms/icon-resolver';
import { getFieldById } from '@/lib/forms/field-registry';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface FormCalculationFormulaPadProps {
  field: Record<string, any>;
  allFields: Array<{ id: string; label: string; type?: string; widgetType?: string }>;
  onFieldChange: (key: string, value: unknown) => void;
  onConfigChange: (key: string, value: unknown) => void;
  onSwitchToProperties?: () => void;
  onClose?: () => void;
  onSave?: () => void;
}

export function FormCalculationFormulaPad({
  field,
  allFields = [],
  onFieldChange,
  onConfigChange,
  onSwitchToProperties,
  onClose,
  onSave,
}: FormCalculationFormulaPadProps) {
  const widgetConfig = (field.widgetConfig || {}) as Record<string, any>;
  const rawFormula = String(widgetConfig.formula || field.formula || '');

  const [formula, setFormula] = useState(rawFormula);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse formula tokens for visual representation
  // Format: [field_id] or raw text/operators
  const availableFields = useMemo(() => {
    return allFields.filter((f) => f.id !== field.id);
  }, [allFields, field.id]);

  const filteredFields = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableFields;
    return availableFields.filter(
      (f) =>
        (f.label && f.label.toLowerCase().includes(q)) ||
        (f.type && f.type.toLowerCase().includes(q)) ||
        f.id.toLowerCase().includes(q)
    );
  }, [availableFields, searchQuery]);

  // Insert token or operator into formula
  const insertIntoFormula = (token: string) => {
    setFormula((prev) => {
      const next = prev ? `${prev} ${token}` : token;
      return next;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleAddFieldToken = (fieldItem: (typeof availableFields)[0]) => {
    insertIntoFormula(`[${fieldItem.id}]`);
    setIsAddOpen(false);
    setSearchQuery('');
  };

  const handleBackspace = () => {
    setFormula((prev) => {
      const trimmed = prev.trim();
      // If ends with a token e.g. [field_xxx], remove the entire token
      if (trimmed.endsWith(']')) {
        const lastBracketIndex = trimmed.lastIndexOf('[');
        if (lastBracketIndex !== -1) {
          return trimmed.slice(0, lastBracketIndex).trim();
        }
      }
      return trimmed.slice(0, -1).trim();
    });
  };

  const handleClearFormula = () => {
    setFormula('');
  };

  const handleSaveFormula = () => {
    onConfigChange('formula', formula.trim());
    onFieldChange('formula', formula.trim());
    onSave?.();
    toast.success('🧮 Calculation formula saved');
  };

  // Helper to get field meta for tokens
  const getFieldMeta = (fieldId: string) => {
    const found = allFields.find((f) => f.id === fieldId);
    if (!found) return { label: fieldId, iconName: 'HelpCircle' };
    const def = getFieldById(found.widgetType || found.type || '');
    return {
      label: found.label || fieldId,
      iconName: def?.iconName || (found.type === 'date' ? 'Calendar' : 'Hash'),
    };
  };

  // Render tokens visually inside the formula preview box
  const formulaTokens = useMemo(() => {
    if (!formula.trim()) return [];
    // Split by tokens [id] vs operators/numbers
    const parts = formula.split(/(\[[a-zA-Z0-9_.-]+\])/g).filter(Boolean);
    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const fieldId = part.slice(1, -1);
        const meta = getFieldMeta(fieldId);
        const Icon = resolveIcon(meta.iconName);
        return {
          type: 'field' as const,
          id: fieldId,
          label: meta.label,
          Icon,
          raw: part,
          key: `tok-${idx}-${fieldId}`,
        };
      }
      return {
        type: 'operator' as const,
        raw: part,
        key: `op-${idx}-${part}`,
      };
    });
  }, [formula, allFields]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-slate-900 text-slate-100 select-none">
      {/* ════ 1. HEADER (JotForm Blue Calculation Hero) ════ */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 shrink-0 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center p-2 shrink-0 shadow-md">
            <Calculator className="size-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white leading-tight">Form Calculation Widget</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Make simple or complex calculations and use them on your forms.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ════ 2. FORMULA CANVAS (Interactive tokenized display + typing) ════ */}
      <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
        {/* Formula Display Area with Token Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Calculation Formula
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearFormula}
                className="text-[10px] text-slate-400 hover:text-rose-400 font-medium cursor-pointer"
              >
                Clear
              </button>

              {/* ADD FIELD Dropdown Popover */}
              <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 gap-1 rounded-md shadow-sm cursor-pointer"
                  >
                    <Plus className="size-3.5" /> ADD FIELD
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 p-2 bg-slate-900 border border-slate-700 text-slate-100 shadow-2xl rounded-xl z-50 space-y-2"
                >
                  <div className="relative">
                    <Search className="size-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search fields..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {filteredFields.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4 italic">
                        No fields found.
                      </p>
                    ) : (
                      filteredFields.map((f, idx) => {
                        const meta = getFieldMeta(f.id);
                        const FieldIcon = resolveIcon(meta.iconName);

                        return (
                          <div
                            key={f.id}
                            onClick={() => handleAddFieldToken(f)}
                            className="flex items-center gap-2 p-1.5 px-2 rounded-lg hover:bg-slate-800 cursor-pointer text-xs transition-colors group"
                          >
                            <span className="size-4 rounded bg-slate-800 group-hover:bg-blue-600 text-[10px] font-bold flex items-center justify-center text-slate-300 group-hover:text-white shrink-0">
                              {idx + 1}
                            </span>
                            <FieldIcon className="size-3.5 text-blue-400 shrink-0" />
                            <span className="truncate flex-1 font-medium text-slate-200 group-hover:text-white">
                              {f.label || 'Question'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Rich Formula Display Frame */}
          <div className="min-h-[110px] max-h-[160px] overflow-y-auto p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center content-start gap-1.5 shadow-inner">
            {formulaTokens.length === 0 ? (
              <span className="text-xs text-slate-500 italic">
                Click [ADD FIELD] or use the calculator keypad below to build your formula...
              </span>
            ) : (
              formulaTokens.map((item) => {
                if (item.type === 'field') {
                  const Icon = item.Icon;
                  return (
                    <span
                      key={item.key}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/90 text-white font-semibold text-xs border border-blue-500 shadow-sm"
                    >
                      <Icon className="size-3 shrink-0" />
                      <span className="truncate max-w-[140px]">{item.label}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-blue-800/80 font-mono text-blue-200">
                        0-9
                      </span>
                    </span>
                  );
                }

                return (
                  <span
                    key={item.key}
                    className="inline-block px-1.5 py-0.5 text-sm font-mono font-bold text-amber-300"
                  >
                    {item.raw}
                  </span>
                );
              })
            )}
          </div>

          {/* Raw formula expression input for direct typing / power users */}
          <div className="pt-1">
            <Input
              ref={textareaRef}
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g. ([check_out] - [check_in]) * ([optional_services] + 50)"
              className="h-8 text-xs font-mono bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Supports date subtraction <code className="text-amber-300 font-mono">(checkout - checkin)</code> in days, checkbox totals, numbers, and brackets.
            </p>
          </div>
        </div>

        {/* ════ 3. INTERACTIVE CALCULATOR KEYPAD (JotForm Keypad Parity) ════ */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Calculator Keypad
          </label>

          <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
            {/* Row 1 */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackspace}
              className="h-9 text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded-lg"
              title="Backspace"
            >
              ←
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('(')}
              className="h-9 text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg"
            >
              (
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula(')')}
              className="h-9 text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg"
            >
              )
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('*')}
              className="h-9 text-xs font-bold bg-slate-800 hover:bg-blue-600 text-amber-300 hover:text-white rounded-lg"
            >
              ×
            </Button>

            {/* Row 2 */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('7')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              7
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('8')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              8
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('9')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              9
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('-')}
              className="h-9 text-xs font-bold bg-slate-800 hover:bg-blue-600 text-amber-300 hover:text-white rounded-lg"
            >
              −
            </Button>

            {/* Row 3 */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('4')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              4
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('5')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              5
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('6')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              6
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('+')}
              className="h-9 text-xs font-bold bg-slate-800 hover:bg-blue-600 text-amber-300 hover:text-white rounded-lg"
            >
              +
            </Button>

            {/* Row 4 */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('1')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              1
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('2')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              2
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('3')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              3
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('/')}
              className="h-9 text-xs font-bold bg-slate-800 hover:bg-blue-600 text-amber-300 hover:text-white rounded-lg"
            >
              ÷
            </Button>

            {/* Row 5 */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('0')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg col-span-2"
            >
              0
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('.')}
              className="h-9 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-lg"
            >
              .
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => insertIntoFormula('%')}
              className="h-9 text-xs font-bold bg-slate-800 hover:bg-blue-600 text-amber-300 hover:text-white rounded-lg"
            >
              %
            </Button>
          </div>
        </div>
      </div>

      {/* ════ 4. FOOTER ACTIONS (Save green button + Options gear link) ════ */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
        <Button
          type="button"
          onClick={handleSaveFormula}
          className="h-9 px-6 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md gap-1.5"
        >
          <Check className="size-4" /> SAVE
        </Button>

        {onSwitchToProperties && (
          <button
            type="button"
            onClick={onSwitchToProperties}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800"
          >
            <SlidersHorizontal className="size-3.5" /> Options
          </button>
        )}
      </div>
    </div>
  );
}
