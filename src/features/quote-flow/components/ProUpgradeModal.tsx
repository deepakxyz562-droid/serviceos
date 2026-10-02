"use client";
import { useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { X, MoreHorizontal, Check, Crown, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProSlide {
  title: string;
  subtitle: string;
  badge?: string;
  renderVisual: () => React.ReactNode;
}

export function ProUpgradeModal() {
  const closeModal = useAppStore((s) => s.closeModal);
  const business = useAppStore((s) => s.business);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly" | "lifetime">("yearly");
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: ProSlide[] = [
    {
      title: "Massive Professional Templates",
      subtitle: "Unlock 100+ beautifully crafted invoice & estimate layouts",
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
            <span>Upgrade to</span>
            <span className="rounded bg-gradient-to-r from-amber-400 to-amber-500 px-1.5 py-0.5 text-xs font-black text-white shadow-sm">
              PRO
            </span>
            <span>for Unlimited Access</span>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Carousel Visual */}
        <div className="mt-4 text-center">
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
                  currentSlide === i ? "w-4 bg-blue-600" : "w-1.5 bg-stone-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-5 space-y-2.5">
          {/* Yearly Card */}
          <div
            onClick={() => setSelectedPlan("yearly")}
            className={`relative cursor-pointer rounded-2xl border-2 p-3.5 transition ${
              selectedPlan === "yearly"
                ? "border-blue-600 bg-blue-50/30 shadow-sm"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
              BEST OFFER
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-stone-900">Yearly</div>
                <div className="text-xs text-stone-500">₹15.99 for first week, then yearly billing</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-blue-600">₹15.99</div>
                <div className="text-[10px] text-stone-400">First week</div>
              </div>
            </div>
          </div>

          {/* 1 Month Card */}
          <div
            onClick={() => setSelectedPlan("monthly")}
            className={`cursor-pointer rounded-2xl border-2 p-3.5 transition ${
              selectedPlan === "monthly"
                ? "border-blue-600 bg-blue-50/30 shadow-sm"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-stone-900">1 Month</div>
                <div className="text-xs text-stone-500">₹250.00 / month</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-stone-900">₹62.50</div>
                <div className="text-[10px] text-stone-400">/Week</div>
              </div>
            </div>
          </div>

          {/* Lifetime Card */}
          <div
            onClick={() => setSelectedPlan("lifetime")}
            className={`cursor-pointer rounded-2xl border-2 p-3.5 transition ${
              selectedPlan === "lifetime"
                ? "border-blue-600 bg-blue-50/30 shadow-sm"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-stone-900">Lifetime</div>
                <div className="text-xs text-stone-500">One-time purchase, forever access</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-stone-900">₹1,500.00</div>
                <div className="text-[10px] text-stone-400">One-Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-5 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
          <div className="mb-2 flex items-center justify-between border-b border-stone-200 pb-2 text-xs font-bold text-stone-700">
            <span>Features</span>
            <div className="flex gap-6">
              <span className="w-12 text-center text-stone-400 font-semibold">Free</span>
              <span className="w-12 text-center text-blue-600 font-black">PRO</span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex items-center justify-between py-1">
              <span>Basic Templates</span>
              <div className="flex gap-6">
                <span className="w-12 text-center text-emerald-600">✓</span>
                <span className="w-12 text-center text-emerald-600">✓</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>PRO Templates</span>
              <div className="flex gap-6">
                <span className="w-12 text-center text-stone-400">✕</span>
                <span className="w-12 text-center font-bold text-emerald-600">100+</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Invoice Creation</span>
              <div className="flex gap-6">
                <span className="w-12 text-center text-stone-500 text-[10px]">3 /Mo</span>
                <span className="w-12 text-center text-emerald-600 font-bold">Unlimited</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Invoice Item Limit</span>
              <div className="flex gap-6">
                <span className="w-12 text-center text-stone-500 text-[10px]">5 Items</span>
                <span className="w-12 text-center text-emerald-600 font-bold">Unlimited</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Share & PDF Download</span>
              <div className="flex gap-6">
                <span className="w-12 text-center text-stone-500 text-[10px]">3 /Mo</span>
                <span className="w-12 text-center text-emerald-600 font-bold">Unlimited</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Digital Signatures</span>
              <div className="flex gap-6">
                <span className="w-12 text-center text-stone-400">✕</span>
                <span className="w-12 text-center text-emerald-600 font-bold">✓</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Advanced Customization</span>
              <div className="flex gap-6">
                <span className="w-12 text-center text-stone-400">✕</span>
                <span className="w-12 text-center text-emerald-600 font-bold">✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-5 space-y-2 text-center">
          <Button
            onClick={() => {
              alert("Payment gateway initialized for QuoteFlow PRO!");
              closeModal();
            }}
            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white shadow-lg shadow-blue-500/20"
          >
            <span>
              {selectedPlan === "yearly"
                ? "Start for ₹15.99 (7 Days ₹15.99, then ₹1,000.00/year)"
                : selectedPlan === "monthly"
                ? "Subscribe for ₹250.00/Month"
                : "Get Lifetime Access for ₹1,500.00"}
            </span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-stone-500">
            <Clock className="h-3 w-3 text-stone-400" />
            <span>CANCEL ANYTIME</span>
          </div>

          <div className="text-[10px] text-stone-400">
            <a href="#" className="underline">Privacy Policy</a> · <a href="#" className="underline">User Agreement</a>
          </div>
        </div>
      </div>
    </div>
  );
}
