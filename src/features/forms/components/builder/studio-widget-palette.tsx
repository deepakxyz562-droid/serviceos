'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  CreditCard,
  Sparkles,
  SlidersHorizontal,
  FileText,
  PanelLeftClose,
  ChevronRight,
  Shield,
  Zap,
  Star,
  MapPin,
  Camera,
  PenTool,
  Bot,
  Lock,
  Phone,
  Mail,
  Calendar,
  Hash,
  CheckSquare,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FIELD_REGISTRY,
  BASIC_FIELDS,
  PHASE_1_WIDGETS,
  CONTENT_WIDGETS,
  searchFields,
} from '@/lib/forms/field-registry';
import type { FieldDefinition } from '@/lib/forms/field-settings-types';
import {
  PAYMENT_GATEWAYS_REGISTRY,
  PAYMENT_CATEGORIES,
  PaymentCategory,
  PaymentGatewayDef,
  searchPaymentGateways,
} from '@/lib/forms/payments/payment-gateways-registry';
import { resolveIcon } from '@/lib/forms/icon-resolver';

interface StudioWidgetPaletteProps {
  onAddRegistryField: (registryId: string) => void;
  onAddPaymentGateway: (gateway: PaymentGatewayDef) => void;
  onClose?: () => void;
  activeStepTitle?: string;
  className?: string;
  onAiPrompt?: (prompt: string) => Promise<void> | void;
  isAiProcessing?: boolean;
}

const WIDGET_CATEGORIES: Array<{ id: FieldDefinition['category'] | 'booking' | 'all'; label: string; icon: any }> = [
  { id: 'all', label: 'All Widgets', icon: Sparkles },
  { id: 'booking', label: 'Appointments', icon: Calendar },
  { id: 'media', label: 'Media & Files', icon: Camera },
  { id: 'signature', label: 'E-Signatures', icon: PenTool },
  { id: 'verification', label: 'Verification', icon: Shield },
  { id: 'calculation', label: 'Calculations', icon: Hash },
  { id: 'rating', label: 'Ratings & CSAT', icon: Star },
  { id: 'survey', label: 'Surveys', icon: FileText },
  { id: 'maps', label: 'Maps & Location', icon: MapPin },
  { id: 'analytics', label: 'Tracking & Analytics', icon: Zap },
];

export function StudioWidgetPalette({
  onAddRegistryField,
  onAddPaymentGateway,
  onClose,
  activeStepTitle,
  className = '',
  onAiPrompt,
  isAiProcessing = false,
}: StudioWidgetPaletteProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'payments' | 'widgets'>('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWidgetCategory, setSelectedWidgetCategory] = useState<FieldDefinition['category'] | 'booking' | 'all'>('all');
  const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<PaymentCategory>('all');

  // Filter Basic Fields
  const filteredBasic = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = BASIC_FIELDS.filter((def) => !def.unavailable);
    if (!q) return base;
    return base.filter(
      (def) =>
        def.name.toLowerCase().includes(q) ||
        def.description?.toLowerCase().includes(q) ||
        def.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filter Payments
  const filteredPayments = useMemo(() => {
    return searchPaymentGateways(searchQuery, selectedPaymentCategory);
  }, [searchQuery, selectedPaymentCategory]);

  // Filter Smart Widgets
  const filteredWidgets = useMemo(() => {
    // Exclude basic text/choice primitives from basicIds, but allow appointment and all phase 1-4 widgets in Widgets tab
    const basicIds = new Set(
      BASIC_FIELDS.filter((f) => f.id !== 'appointment').map((f) => f.id)
    );
    const cat = selectedWidgetCategory === 'all' ? undefined : (selectedWidgetCategory as any);
    const results = searchFields(searchQuery, cat);
    return results.filter((f) => (!basicIds.has(f.id) || f.id === 'appointment') && !f.unavailable);
  }, [searchQuery, selectedWidgetCategory]);

  // ─── Phase 1: Include new Elementor-style content widgets ──────────
  const CONTENT_BLOCK_IDS = useMemo(() => new Set([
    'static_image', 'map_embed', 'video_embed', 'heading', 'paragraph', 'divider',
    // New content widgets from Phase 1
    'image_widget', 'button_widget', 'spacer_widget', 'icon_widget',
    'alert_widget', 'badge_widget', 'list_widget', 'section_widget', 'columns_container',
  ]), []);

  const contentWidgets = useMemo(() => {
    // Merge BASIC_FIELDS content widgets with new CONTENT_WIDGETS
    const fromBasic = filteredBasic.filter((def) => CONTENT_BLOCK_IDS.has(def.id));
    const fromContent = CONTENT_WIDGETS.filter((def) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return def.name.toLowerCase().includes(q) || def.description?.toLowerCase().includes(q) || def.id.toLowerCase().includes(q);
    });
    return [...fromBasic, ...fromContent];
  }, [filteredBasic, CONTENT_BLOCK_IDS, searchQuery]);

  const formInputFields = useMemo(() => {
    return filteredBasic.filter((def) => !CONTENT_BLOCK_IDS.has(def.id));
  }, [filteredBasic, CONTENT_BLOCK_IDS]);

  return (
    <aside
      className={`w-80 lg:w-88 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 shrink-0 h-full overflow-hidden select-none z-20 shadow-sm ${className}`}
    >
      {/* Header — Reference Image 2 Minimal Style */}
      <div className="px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900">
        <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          ADD FIELDS
        </h3>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Hide Widget Palette"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 200+ widgets & fields..."
            className="pl-8 pr-7 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main 3 Tabs */}
      <div className="grid grid-cols-3 p-1.5 mx-3 mt-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold shrink-0 gap-0.5 border border-slate-200/60 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`py-1 rounded-md text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'basic'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Basic</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-transparent">
            {filteredBasic.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`py-1 rounded-md text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'payments'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Payments</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal bg-transparent">
            33
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('widgets')}
          className={`py-1 rounded-md text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'widgets'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Widgets</span>
          <Badge variant="secondary" className="text-[9px] py-0 px-1 font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            200+
          </Badge>
        </button>
      </div>

      {/* Tab 1: Basic Fields (Content & Media Blocks + Standard Form Inputs) */}
      {activeTab === 'basic' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Section A: Elementor-Style Content & Media Blocks */}
          {contentWidgets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>🎨 Content &amp; Media Blocks</span>
                </p>
                <Badge variant="secondary" className="text-[9px] py-0 px-1.5 font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Elementor Style
                </Badge>
              </div>

              <div className="space-y-0.5">
                {contentWidgets.map((def) => {
                  const Icon = resolveIcon(def.iconName || (def as any).icon);
                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => onAddRegistryField(def.id)}
                      className="group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 group-hover:text-emerald-900 dark:group-hover:text-emerald-100 truncate">
                          {def.name}
                        </span>
                      </div>
                      <Plus className="size-3.5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section B: Standard Form Inputs */}
          {formInputFields.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Standard Form Inputs
                </p>
                <span className="text-[10px] text-muted-foreground">{formInputFields.length} fields</span>
              </div>

              <div className="space-y-0.5">
                {formInputFields.map((def) => {
                  const Icon = resolveIcon(def.iconName || (def as any).icon);
                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => onAddRegistryField(def.id)}
                      className="group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200 shrink-0 transition-colors" />
                        <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 truncate">
                          {def.name}
                        </span>
                      </div>
                      <Plus className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Payments Gateways */}
      {activeTab === 'payments' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Payment Category Chips */}
          <div className="px-3 pt-2 pb-1.5 flex gap-1 overflow-x-auto shrink-0 border-b border-slate-100 dark:border-slate-800">
            {PAYMENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedPaymentCategory(cat.id)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                  selectedPaymentCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                33 Verified Gateways (0% Fee)
              </span>
              <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-300">
                Direct Payout
              </Badge>
            </div>

            <div className="space-y-0.5">
              {filteredPayments.map((gw) => (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => onAddPaymentGateway(gw)}
                  className="group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CreditCard className="size-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-colors" />
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 truncate">
                      {gw.name}
                    </span>
                    <span className="text-[9px] font-semibold uppercase px-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500">
                      {gw.region}
                    </span>
                  </div>
                  <Plus className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 200+ Smart Widgets */}
      {activeTab === 'widgets' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Widget Category Chips */}
          <div className="px-3 pt-2 pb-1.5 flex gap-1 overflow-x-auto shrink-0 border-b border-slate-100 dark:border-slate-800">
            {WIDGET_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedWidgetCategory(cat.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                    selectedWidgetCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="size-2.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Showing {filteredWidgets.length} Smart Widgets
              </span>
            </div>

            <div className="space-y-0.5">
              {filteredWidgets.map((def) => {
                const Icon = resolveIcon(def.iconName || (def as any).icon);
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => onAddRegistryField(def.id)}
                    className="group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="size-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 truncate">
                        {def.name}
                      </span>
                      {def.tier === 'advanced' && (
                        <span className="text-[8px] font-bold uppercase px-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          PRO
                        </span>
                      )}
                    </div>
                    <Plus className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
