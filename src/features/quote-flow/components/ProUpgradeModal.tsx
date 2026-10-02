"use client";
import { useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { X, Check, Crown, ArrowRight, Sparkles, Clock, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProSlide {
  title: string;
  subtitle: string;
  renderVisual: () => React.ReactNode;
}

export function ProUpgradeModal() {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: ProSlide[] = [
    {
      title: "Massive Professional Templates",
      subtitle: "100+ beautifully crafted invoice & estimate layouts — all unlocked!",
      renderVisual: () => (
        <div className="flex flex-col items-start gap-2.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 text-left ring-1 ring-blue-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">✓</span>
            Massive Professional Template
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">✓</span>
            Highly Customization
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">✓</span>
            Easy Sharing and Export
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] text-white">✓</span>
            Business Analysis
          </div>
        </div>
      ),
    },
    {
      title: "Add Your Personal Logo",
      subtitle: "Brand your quotes and invoices with crisp vector logos",
      renderVisual: () => (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div className="flex gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">❖</div>
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">◈</div>
            <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">⬢</div>
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">✦</div>
          </div>
          <div className="w-full max-w-[200px] rounded-lg border border-stone-200 bg-white p-3 shadow-sm text-left">
            <div className="flex justify-between items-start border-b border-stone-100 pb-1 mb-1">
              <div>
                <div className="h-2 w-12 bg-blue-600 rounded"></div>
                <div className="text-[8px] font-bold text-stone-800 mt-1">YOUR COMPANY</div>
              </div>
              <div className="text-[7px] text-stone-400">INVOICE #001</div>
            </div>
            <div className="h-1.5 w-full bg-stone-100 rounded my-1"></div>
            <div className="h-1.5 w-3/4 bg-stone-100 rounded"></div>
          </div>
        </div>
      ),
    },
    {
      title: "Beautiful Invoice Backgrounds",
      subtitle: "Elevate your documents with subtle modern textures & gradients",
      renderVisual: () => (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div className="h-16 w-12 rounded-lg bg-gradient-to-b from-amber-100 to-amber-200 border border-amber-300 shadow-sm flex items-center justify-center text-[9px] font-bold text-amber-800">Warm</div>
          <div className="h-16 w-12 rounded-lg bg-gradient-to-b from-blue-100 to-indigo-200 border border-blue-300 shadow-sm flex items-center justify-center text-[9px] font-bold text-blue-800">Slate</div>
          <div className="h-16 w-12 rounded-lg bg-gradient-to-b from-emerald-100 to-teal-200 border border-emerald-300 shadow-sm flex items-center justify-center text-[9px] font-bold text-emerald-800">Mint</div>
          <div className="h-16 w-12 rounded-lg bg-gradient-to-b from-rose-100 to-orange-200 border border-rose-300 shadow-sm flex items-center justify-center text-[9px] font-bold text-rose-800">Coral</div>
        </div>
      ),
    },
    {
      title: "Customize Invoice Colors",
      subtitle: "Pick the exact colors matching your brand palette",
      renderVisual: () => (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            {["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1", "#84CC16", "#0F172A"].map((c) => (
              <div key={c} className="h-5 w-5 rounded-md shadow-sm" style={{ backgroundColor: c }} />
            ))}
          </div>
          <p className="text-[11px] font-medium text-stone-500">Instant real-time accent preview</p>
        </div>
      ),
    },
    {
      title: "Sign Your Way - Draw or Upload",
      subtitle: "Add legal digital signatures directly from your finger, stylus, or file",
      renderVisual: () => (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div className="rounded-xl border border-dashed border-blue-300 bg-white p-3 text-center shadow-sm w-full max-w-[220px]">
            <div className="font-serif italic text-lg text-blue-900 tracking-wide mb-1">Rajesh Kumar</div>
            <div className="border-t border-stone-300 pt-1 text-[9px] uppercase tracking-wider text-stone-400">Authorized Signature</div>
          </div>
        </div>
      ),
    },
    {
      title: "Smart Reports & Analytics",
      subtitle: "Track cashflow, client aging, unpaid receivables, and monthly sales",
      renderVisual: () => (
        <div className="flex items-end justify-center gap-2 h-20 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div className="w-5 bg-blue-300 rounded-t h-8"></div>
          <div className="w-5 bg-emerald-400 rounded-t h-12"></div>
          <div className="w-5 bg-blue-500 rounded-t h-16"></div>
          <div className="w-5 bg-emerald-500 rounded-t h-14"></div>
          <div className="w-5 bg-indigo-600 rounded-t h-20"></div>
          <div className="w-5 bg-blue-400 rounded-t h-10"></div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeModal}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900">
            <span>Special Offer:</span>
            <span className="rounded bg-gradient-to-r from-emerald-500 to-teal-600 px-2 py-0.5 text-xs font-black text-white shadow-sm">
              18M FREE
            </span>
          </div>
          <div className="w-8" />
        </div>

        {/* 18-Month Offer Active Banner */}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-500/20 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white mb-2">
            <PartyPopper className="h-5 w-5" />
          </div>
          <h2 className="text-base font-black">18 Months Free Access Active!</h2>
          <p className="mt-1 text-xs text-emerald-100">
            All premium templates, digital signatures, GST calculations, and unlimited documents are 100% unlocked for your account.
          </p>
        </div>

        {/* Carousel Visual */}
        <div className="mt-5 text-center">
          <div className="min-h-[120px]">{slides[currentSlide].renderVisual()}</div>
          <h3 className="mt-3 text-sm font-bold text-stone-900">{slides[currentSlide].title}</h3>
          <p className="mt-0.5 text-xs text-stone-500">{slides[currentSlide].subtitle}</p>

          {/* Dots */}
          <div className="mt-3 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  currentSlide === i ? "w-4 bg-emerald-600" : "w-1.5 bg-stone-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Feature Unlocked Table */}
        <div className="mt-5 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div className="mb-2 flex items-center justify-between border-b border-stone-200 pb-2 text-xs font-bold text-stone-700">
            <span>Feature</span>
            <span className="text-emerald-700 font-black">Your 18M Free Status</span>
          </div>
          <div className="space-y-2 text-xs text-stone-600">
            <div className="flex items-center justify-between py-0.5">
              <span>All 100+ Templates</span>
              <span className="font-bold text-emerald-600">✓ Unlocked (Free)</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span>Unlimited Invoices &amp; Estimates</span>
              <span className="font-bold text-emerald-600">✓ Unlocked (Free)</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span>Unlimited Items &amp; Line Items</span>
              <span className="font-bold text-emerald-600">✓ Unlocked (Free)</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span>Digital Signatures &amp; Stamps</span>
              <span className="font-bold text-emerald-600">✓ Unlocked (Free)</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span>Custom Logos &amp; Backgrounds</span>
              <span className="font-bold text-emerald-600">✓ Unlocked (Free)</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span>Export &amp; High-Res PDF</span>
              <span className="font-bold text-emerald-600">✓ Unlocked (Free)</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-5 space-y-2 text-center">
          <Button
            onClick={() => {
              closeModal();
            }}
            className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-500/20"
          >
            <span>Enjoy 18 Months of Free Access</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700">
            <Clock className="h-3 w-3" />
            <span>Valid for 18 Months · Zero Cost · Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
