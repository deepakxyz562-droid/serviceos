"use client";
import { useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { ChevronLeft, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TemplateDefinition {
  id: string;
  name: string;
  category: "Recommend" | "Simple" | "Classic" | "Professional" | "Color";
  isPro: boolean;
  accentColor: string;
  bgColor: string;
  headerStyle: "minimal" | "wave" | "geometric" | "slate-angle" | "mesh" | "classic-boxed";
  previewTitle: string;
}

export const TEMPLATES_CATALOG: TemplateDefinition[] = [
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    category: "Simple",
    isPro: false,
    accentColor: "#18181B",
    bgColor: "#FFFFFF",
    headerStyle: "minimal",
    previewTitle: "Clean & Simple",
  },
  {
    id: "soft-emerald-wave",
    name: "Emerald Wave",
    category: "Recommend",
    isPro: true,
    accentColor: "#10B981",
    bgColor: "#ECFDF5",
    headerStyle: "wave",
    previewTitle: "Modern Wave",
  },
  {
    id: "geometric-bold-green",
    name: "Geometric Green",
    category: "Professional",
    isPro: true,
    accentColor: "#059669",
    bgColor: "#10B981",
    headerStyle: "geometric",
    previewTitle: "Angular Dynamic",
  },
  {
    id: "slate-geometric",
    name: "Slate Professional",
    category: "Classic",
    isPro: true,
    accentColor: "#1E293B",
    bgColor: "#334155",
    headerStyle: "slate-angle",
    previewTitle: "Corporate Navy",
  },
  {
    id: "mesh-polygonal",
    name: "Polygonal Mesh",
    category: "Professional",
    isPro: true,
    accentColor: "#475569",
    bgColor: "#F8FAFC",
    headerStyle: "mesh",
    previewTitle: "Mesh Tech",
  },
  {
    id: "classic-corporate-blue",
    name: "Classic Blue",
    category: "Color",
    isPro: false,
    accentColor: "#2563EB",
    bgColor: "#EFF6FF",
    headerStyle: "classic-boxed",
    previewTitle: "Corporate Standard",
  },
];

interface TemplateSelectModalProps {
  currentTemplateId?: string;
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export function TemplateSelectModal({
  currentTemplateId = "classic-corporate-blue",
  onSelect,
  onClose,
}: TemplateSelectModalProps) {
  const openModal = useAppStore((s) => s.openModal);
  const [selectedId, setSelectedId] = useState(currentTemplateId);
  const [activeCategory, setActiveCategory] = useState<
    "Recommend" | "Simple" | "Classic" | "Professional" | "Color"
  >("Recommend");

  const categories: ("Recommend" | "Simple" | "Classic" | "Professional" | "Color")[] = [
    "Recommend",
    "Simple",
    "Classic",
    "Professional",
    "Color",
  ];

  const filtered =
    activeCategory === "Recommend"
      ? TEMPLATES_CATALOG
      : TEMPLATES_CATALOG.filter((t) => t.category === activeCategory);

  function handleSave() {
    onSelect(selectedId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-stone-900">Select a Template</h2>
            <p className="text-[10px] font-bold text-emerald-600">All 100+ Templates Free for 18 Months</p>
          </div>
          <Button
            onClick={handleSave}
            size="sm"
            className="rounded-full bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 shadow-sm"
          >
            Save
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-stone-100 px-4 py-2">
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap pb-1.5 text-sm font-semibold transition relative ${
                    isActive ? "text-stone-900" : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  {cat}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Cards Grid */}
        <div className="p-4 grid grid-cols-2 gap-3.5 overflow-y-auto">
          {filtered.map((tmpl) => {
            const isSelected = selectedId === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => setSelectedId(tmpl.id)}
                className={`relative flex flex-col cursor-pointer rounded-xl border-2 bg-white transition overflow-hidden shadow-sm ${
                  isSelected ? "border-blue-600 ring-2 ring-blue-500/20" : "border-stone-200 hover:border-stone-300"
                }`}
              >
                {/* 18M Free Badge */}
                {tmpl.isPro && (
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm">
                    <Crown className="h-2.5 w-2.5" />
                    18M FREE
                  </div>
                )}

                {/* Selected check */}
                {isSelected && (
                  <div className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}

                {/* Mini Invoice Preview Card */}
                <div className="h-44 w-full bg-stone-50 p-2.5 flex flex-col justify-between overflow-hidden relative">
                  {/* Decorative Header */}
                  {tmpl.headerStyle === "wave" && (
                    <div className="absolute top-0 left-0 right-0 h-10 bg-emerald-100 rounded-b-full opacity-60" />
                  )}
                  {tmpl.headerStyle === "geometric" && (
                    <div className="absolute top-0 left-0 w-28 h-20 bg-emerald-500 -rotate-12 -translate-x-8 -translate-y-8 opacity-90" />
                  )}
                  {tmpl.headerStyle === "slate-angle" && (
                    <div className="absolute top-0 right-0 w-32 h-20 bg-slate-800 rotate-12 translate-x-6 -translate-y-8 opacity-90" />
                  )}
                  {tmpl.headerStyle === "classic-boxed" && (
                    <div className="flex items-center justify-between border-b border-blue-200 pb-1.5 relative z-10">
                      <div className="flex items-center gap-1">
                        <div className="h-4 w-4 rounded bg-blue-600 flex items-center justify-center text-[7px] text-white font-bold">◈</div>
                        <span className="text-[8px] font-bold text-blue-900">COMPANY</span>
                      </div>
                      <span className="text-[9px] font-black tracking-tight text-blue-600">INVOICE</span>
                    </div>
                  )}

                  <div className="relative z-10 space-y-1">
                    {tmpl.headerStyle !== "classic-boxed" && (
                      <div className="text-[11px] font-black tracking-wider uppercase text-stone-800" style={{ color: tmpl.accentColor }}>
                        INVOICE
                      </div>
                    )}
                    <div className="flex justify-between text-[7px] text-stone-500">
                      <div>
                        <div className="font-semibold text-stone-700">Rajesh Kumar</div>
                        <div>MG Road, Bangalore</div>
                      </div>
                      <div className="text-right">
                        <div>INV-0001</div>
                        <div>Due on receipt</div>
                      </div>
                    </div>
                  </div>

                  {/* Dummy Line Items Table */}
                  <div className="relative z-10 my-1 rounded border border-stone-200/80 bg-white/90 text-[7px] shadow-2xs">
                    <div className="flex justify-between bg-stone-100/80 px-1 py-0.5 font-bold text-stone-600">
                      <span>Description</span>
                      <span>Amount</span>
                    </div>
                    <div className="flex justify-between px-1 py-0.5 text-stone-700 border-t border-stone-100">
                      <span>IT Consulting</span>
                      <span>₹75,000.00</span>
                    </div>
                    <div className="flex justify-between px-1 py-0.5 text-stone-700 border-t border-stone-100">
                      <span>Software License</span>
                      <span>₹2,000.00</span>
                    </div>
                  </div>

                  {/* Total & Signature */}
                  <div className="relative z-10 flex items-end justify-between border-t border-stone-200 pt-1">
                    <div>
                      <div className="font-serif italic text-[10px] text-stone-800">Rajesh Kumar</div>
                      <div className="text-[6px] text-stone-400">Signature</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[6px] uppercase text-stone-400">Balance Due</div>
                      <div className="text-[9px] font-black" style={{ color: tmpl.accentColor }}>
                        ₹1,11,116.30
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer caption */}
                <div className="border-t border-stone-100 bg-white px-2.5 py-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 truncate">{tmpl.name}</span>
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tmpl.accentColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
