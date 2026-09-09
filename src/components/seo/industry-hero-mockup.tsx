"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CreditCard,
  PhoneCall,
  CheckCircle2,
  MapPin,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export interface IndustryHeroMockupProps {
  industryName: string;
  sampleJobTitle?: string;
  sampleCustomerName?: string;
  sampleTechName?: string;
  sampleAsset?: string;
  sampleAmount?: string;
}

export function IndustryHeroMockup({
  industryName,
  sampleJobTitle = "Emergency Service & Diagnostics",
  sampleCustomerName = "David Miller",
  sampleTechName = "Alex R. (Field Lead)",
  sampleAsset = "Primary System #4092",
  sampleAmount = "$485.00",
}: IndustryHeroMockupProps) {
  const [activeMockupTab, setActiveMockupTab] = useState<"dispatch" | "quote" | "invoice">("dispatch");

  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-emerald-950/10 overflow-hidden backdrop-blur-sm">
      {/* Mockup Top Window Bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">Fieseros Hub &bull; {industryName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Mockup Navigation Tabs */}
      <div className="flex border-b border-border bg-muted/20 px-3 pt-2">
        <button
          type="button"
          onClick={() => setActiveMockupTab("dispatch")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeMockupTab === "dispatch"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Live Dispatch
        </button>
        <button
          type="button"
          onClick={() => setActiveMockupTab("quote")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeMockupTab === "quote"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Quote &amp; Estimate
        </button>
        <button
          type="button"
          onClick={() => setActiveMockupTab("invoice")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            activeMockupTab === "invoice"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          1-Click Payment
        </button>
      </div>

      {/* Tab 1: Dispatch Screen */}
      {activeMockupTab === "dispatch" && (
        <div className="p-4 space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-3.5 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                En Route &bull; ETA 14m
              </span>
              <span className="text-xs font-semibold text-foreground">Today, 10:30 AM</span>
            </div>
            <p className="text-sm font-bold text-foreground">{sampleJobTitle}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-600" />
                {sampleCustomerName} &bull; 742 Evergreen Terr
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Tech: {sampleTechName}</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{sampleAsset}</span>
            </div>
          </div>

          {/* Up Next Job Card */}
          <div className="rounded-xl border bg-muted/30 p-3 opacity-80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground">Up Next &bull; 1:00 PM</span>
              <span className="text-[10px] font-medium rounded bg-muted px-1.5 py-0.5">Assigned</span>
            </div>
            <p className="text-xs font-semibold text-foreground">Standard Preventive Maintenance &amp; Inspection</p>
            <p className="text-[11px] text-muted-foreground mt-1">Elena Vance &bull; 108 Pinecrest Blvd</p>
          </div>

          {/* AI Receptionist Live Alert Pill */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                <PhoneCall className="h-3 w-3" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-[11px]">24/7 AI Receptionist</p>
                <p className="text-[10px] text-muted-foreground">New lead qualified &amp; booked in CRM</p>
              </div>
            </div>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Just now</span>
          </div>
        </div>
      )}

      {/* Tab 2: Quote Screen */}
      {activeMockupTab === "quote" && (
        <div className="p-4 space-y-3">
          <div className="rounded-xl border bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground">Quote #Q-8492</span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                Ready for E-Sign
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Prepared for: {sampleCustomerName}</p>
            <div className="space-y-1.5 text-xs border-y border-border py-2">
              <div className="flex justify-between font-medium">
                <span>{sampleJobTitle}</span>
                <span>$350.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Standard Parts &amp; Diagnostic Check</span>
                <span>$135.00</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between font-bold text-sm text-foreground">
              <span>Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{sampleAmount}</span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-50/30 p-2.5 text-center text-xs dark:bg-emerald-950/20">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Client E-Signed on Mobile
            </span>
          </div>
        </div>
      )}

      {/* Tab 3: Invoice Screen */}
      {activeMockupTab === "invoice" && (
        <div className="p-4 space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground">Invoice #INV-2041</span>
              <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                PAID ONLINE
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{sampleCustomerName} &bull; Paid via Card</p>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
              <span className="text-xs font-medium text-foreground">Settled Amount:</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{sampleAmount}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Auto-synced to accounting &bull; Receipt emailed to customer
            </p>
          </div>
        </div>
      )}

      {/* Bottom Card Footer */}
      <div className="border-t border-border bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>All-in-one {industryName} platform</span>
        <Link href="/#signup" className="font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1">
          Try it free <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
