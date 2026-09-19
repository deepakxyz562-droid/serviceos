'use client';

/**
 * Fieseros Universal Studio - Elements Panel (Left Drawer)
 * Categorized, searchable Elementor elements palette covering all 7 widget families.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  SquareDashed,
  LayoutGrid,
  Columns,
  MoveVertical,
  Minus,
  FolderTabs,
  ListCollapse,
  Heading,
  Pilcrow,
  FileText,
  Image,
  Images,
  Video,
  Sparkles,
  MousePointerClick,
  Tag,
  ListChecks,
  FileSpreadsheet,
  Type,
  Mail,
  Phone,
  Binary,
  AlignLeft,
  ChevronDownSquare,
  CircleDot,
  CheckSquare,
  CalendarDays,
  Clock,
  UploadCloud,
  PenTool,
  Star,
  SlidersHorizontal,
  Calculator,
  MapPin,
  Bot,
  Zap,
  PhoneCall,
  BrainCircuit,
  CalendarCheck2,
  CreditCard,
  Layers,
  ShoppingBag,
  Receipt,
  ShieldCheck,
  Map,
  Award,
  MessageCircle,
  Table,
  Contact,
  Grid,
  TrendingUp,
  Code2,
  Webhook,
  Globe,
  Plus,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StudioWidgetType, StudioWidgetCategory } from '@/lib/studio/schema/node';
import { WIDGET_MANIFESTS, WidgetManifest } from '@/lib/studio/schema/widget';

const CATEGORY_METADATA: Record<StudioWidgetCategory, { label: string; icon: any; color: string }> = {
  layout: { label: 'Layout & Containers', icon: SquareDashed, color: 'text-indigo-600' },
  basic: { label: 'Basic Elements', icon: Heading, color: 'text-blue-600' },
  form: { label: 'Form Inputs & Fields', icon: FileSpreadsheet, color: 'text-emerald-600' },
  ai: { label: 'AI Blocks & Concierge', icon: Bot, color: 'text-purple-600' },
  business: { label: 'Business & Commerce', icon: CalendarCheck2, color: 'text-amber-600' },
  data: { label: 'Data & Records', icon: Table, color: 'text-cyan-600' },
  advanced: { label: 'Advanced & Embeds', icon: Code2, color: 'text-rose-600' },
  global: { label: 'Global Symbols', icon: Globe, color: 'text-teal-600' },
};

const ICON_MAP: Record<string, any> = {
  SquareDashed,
  LayoutGrid,
  Columns,
  MoveVertical,
  Minus,
  FolderTabs,
  ListCollapse,
  Heading,
  Pilcrow,
  FileText,
  Image,
  Images,
  Video,
  Sparkles,
  MousePointerClick,
  Tag,
  ListChecks,
  FileSpreadsheet,
  Type,
  Mail,
  Phone,
  Binary,
  AlignLeft,
  ChevronDownSquare,
  CircleDot,
  CheckSquare,
  CalendarDays,
  Clock,
  UploadCloud,
  PenTool,
  Star,
  SlidersHorizontal,
  Calculator,
  MapPin,
  Bot,
  Zap,
  PhoneCall,
  BrainCircuit,
  CalendarCheck2,
  CreditCard,
  Layers,
  ShoppingBag,
  Receipt,
  ShieldCheck,
  Map,
  Award,
  MessageCircle,
  Table,
  Contact,
  Grid,
  TrendingUp,
  Code2,
  Webhook,
  Globe,
};

interface ElementsPanelProps {
  onAddWidget: (widgetType: StudioWidgetType) => void;
  onClose?: () => void;
}

export function ElementsPanel({ onAddWidget, onClose }: ElementsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    layout: true,
    basic: true,
    form: true,
    ai: true,
    business: true,
    data: true,
    advanced: true,
  });

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const widgetsList = useMemo(() => Object.values(WIDGET_MANIFESTS), []);

  const filteredWidgets = useMemo(() => {
    if (!searchQuery.trim()) return widgetsList;
    const q = searchQuery.toLowerCase();
    return widgetsList.filter(
      (w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q) || w.category.includes(q)
    );
  }, [widgetsList, searchQuery]);

  const groupedWidgets = useMemo(() => {
    const map: Record<StudioWidgetCategory, WidgetManifest[]> = {
      layout: [],
      basic: [],
      form: [],
      ai: [],
      business: [],
      data: [],
      advanced: [],
      global: [],
    };
    filteredWidgets.forEach((w) => {
      if (map[w.category]) map[w.category].push(w);
    });
    return map;
  }, [filteredWidgets]);

  return (
    <aside className="w-80 border-r border-border/80 bg-background flex flex-col h-full shrink-0 select-none z-20">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-border/80 bg-muted/20 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <SquareDashed className="size-3.5 text-primary" /> Elements Palette
          </span>
          <Badge variant="outline" className="text-[10px] font-bold">
            {filteredWidgets.length} Widgets
          </Badge>
        </div>

        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search widgets (e.g. AI, form, button)..."
            className="h-8 pl-8 text-xs bg-background rounded-xl border-border/80"
          />
        </div>
      </div>

      {/* Widget Categories Accordion */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {(Object.keys(CATEGORY_METADATA) as StudioWidgetCategory[]).map((catKey) => {
          const items = groupedWidgets[catKey];
          if (!items || items.length === 0) return null;
          const meta = CATEGORY_METADATA[catKey];
          const isOpen = openCategories[catKey] ?? true;

          return (
            <div key={catKey} className="rounded-xl border border-border/60 overflow-hidden bg-card/50">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(catKey)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-foreground bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <meta.icon className={`size-3.5 ${meta.color}`} />
                  <span>{meta.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold">{items.length}</span>
                  {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                </div>
              </button>

              {/* Grid of Widgets */}
              {isOpen && (
                <div className="p-2 grid grid-cols-2 gap-1.5 bg-background">
                  {items.map((widget) => {
                    const IconComponent = ICON_MAP[widget.icon] || SquareDashed;
                    return (
                      <button
                        key={widget.type}
                        type="button"
                        onClick={() => onAddWidget(widget.type)}
                        className="group flex flex-col items-center justify-center p-2.5 rounded-xl border border-border/60 hover:border-primary/60 hover:bg-primary/5 transition-all text-center gap-1.5 cursor-pointer shadow-2xs"
                        title={widget.description}
                      >
                        <div className="size-8 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center text-foreground group-hover:text-primary transition-colors">
                          <IconComponent className="size-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-foreground group-hover:text-primary leading-tight line-clamp-1">
                          {widget.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
