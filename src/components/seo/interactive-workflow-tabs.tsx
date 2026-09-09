"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Calendar,
  Smartphone,
  CreditCard,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  PhoneCall,
  MapPin,
  Clock,
  ShieldCheck,
  Star,
} from "lucide-react";

export interface WorkflowStage {
  id: string;
  stageNumber: string;
  title: string;
  shortLabel: string;
  icon: any;
  headline: string;
  description: string;
  highlights: string[];
  mockupType: "quote" | "dispatch" | "field" | "payment" | "retention";
}

export function InteractiveWorkflowTabs({
  industryName,
  contractorNoun = "contractors",
}: {
  industryName: string;
  contractorNoun?: string;
}) {
  const [activeTab, setActiveTab] = useState<number>(0);

  const stages: WorkflowStage[] = [
    {
      id: "win",
      stageNumber: "01",
      title: "Win the Job",
      shortLabel: "Quote & Win",
      icon: FileText,
      headline: `Book faster quotes and win more ${industryName} jobs`,
      description:
        "Capture every inbound lead instantly with 24/7 AI call answering and online booking. Send branded, itemized estimates with tiered options that customers can approve and sign right on their phones.",
      highlights: [
        "24/7 AI Receptionist answers phone calls & captures job requirements",
        "Line-item estimates with pre-saved price book templates",
        "Instant e-signatures on mobile, tablet, or desktop",
        "Automated follow-up emails and SMS on unapproved quotes",
      ],
      mockupType: "quote",
    },
    {
      id: "schedule",
      stageNumber: "02",
      title: "Schedule & Dispatch",
      shortLabel: "Schedule",
      icon: Calendar,
      headline: "Eliminate scheduling chaos and route crews efficiently",
      description:
        "Drag and drop jobs onto a visual team calendar. Assign technicians based on availability, territory, and skill level, while keeping customers updated with automated arrival alerts.",
      highlights: [
        "Drag-and-drop calendar with day, week, and team views",
        "Technician assignment and status tracking",
        'Automated "On My Way" SMS alerts with live arrival ETAs',
        "One-click recurring visit generation for maintenance plans",
      ],
      mockupType: "dispatch",
    },
    {
      id: "field",
      stageNumber: "03",
      title: "Field Execution",
      shortLabel: "Field App",
      icon: Smartphone,
      headline: "Equip your field crew with an offline-ready mobile app",
      description:
        "Field technicians get full job scopes, equipment history, and customer notes on their phones. Standardize quality with digital inspection checklists and before/after photo capture.",
      highlights: [
        "Works offline or online as a lightweight mobile PWA",
        "Custom safety, diagnostic, and inspection checklists",
        "High-res before and after photo attachments with timestamps",
        "Customer signature capture upon job completion",
      ],
      mockupType: "field",
    },
    {
      id: "pay",
      stageNumber: "04",
      title: "Invoice & Get Paid",
      shortLabel: "Get Paid",
      icon: CreditCard,
      headline: "Turn completed work orders into paid invoices in 1 click",
      description:
        "Never spend evenings retyping paper work orders into accounting software. Convert jobs into invoices with one tap and collect payments on-site or via secure online payment links.",
      highlights: [
        "1-click invoice generation directly from completed jobs",
        "Accept Credit Cards, Debit Cards, Apple Pay, Google Pay, and UPI",
        "Automated friendly payment reminders for outstanding balances",
        "Direct export and sync to your bookkeeping workflows",
      ],
      mockupType: "payment",
    },
    {
      id: "retain",
      stageNumber: "05",
      title: "Retain & Grow",
      shortLabel: "Retain",
      icon: Users,
      headline: "Build predictable recurring revenue and 5-star reputation",
      description:
        "Keep complete asset and service history organized in a 360° CRM. Automatically request Google reviews after completed jobs and run recurring maintenance agreements.",
      highlights: [
        "Centralized customer records with full equipment/asset history",
        "Automated Google & platform review request messages",
        "Auto-renewing recurring maintenance contract management",
        "Broadcast campaigns to re-engage past customers for seasonal tune-ups",
      ],
      mockupType: "retention",
    },
  ];

  const current = stages[activeTab];

  return (
    <section className="border-t bg-gradient-to-b from-background via-muted/20 to-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            End-to-End Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            How Fieseros powers your {industryName} business
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            From the first customer phone call to 5-star reviews and recurring revenue — experience the streamlined 5-stage lifecycle.
          </p>
        </div>

        {/* 5-Stage Interactive Tabs Navigation */}
        <div className="flex justify-start sm:justify-center overflow-x-auto pb-4 mb-10 no-scrollbar gap-2 sm:gap-3">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span className={`text-[11px] font-bold opacity-80 ${isActive ? "text-emerald-100" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {stage.stageNumber}
                </span>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{stage.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Content Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 lg:p-10 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Description */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span>Stage {current.stageNumber} &bull; {current.title}</span>
              </div>

              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-snug">
                {current.headline}
              </h3>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-foreground">{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link
                  href="/#signup"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 group"
                >
                  <span>Experience this workflow in Fieseros</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Right Visual Preview Mockup */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-5 sm:p-6 shadow-inner">
                
                {/* Mockup Case 1: Quote */}
                {current.mockupType === "quote" && (
                  <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div>
                        <span className="text-xs font-bold text-foreground">Estimate #EST-1094</span>
                        <p className="text-[11px] text-muted-foreground">Standard &bull; Tiered Proposal</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        Approved &bull; E-Signed
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-medium">
                        <span>{industryName} Service &amp; Replacement</span>
                        <span>$680.00</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>High-Efficiency Component Upgrade (Add-on)</span>
                        <span>+$140.00</span>
                      </div>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center font-bold text-sm">
                      <span>Total Approved:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">$820.00</span>
                    </div>
                    <div className="rounded border border-dashed border-emerald-500/30 bg-emerald-50/40 p-2 text-center text-[11px] text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      Digitally signed by customer via SMS link
                    </div>
                  </div>
                )}

                {/* Mockup Case 2: Dispatch */}
                {current.mockupType === "dispatch" && (
                  <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-foreground">Live Team Schedule</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">Today</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-md border border-emerald-500/30 bg-emerald-50/50 p-2.5 dark:bg-emerald-950/20">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Alex R. &bull; Lead Technician</span>
                          <span className="text-emerald-600">9:30 AM &bull; En Route</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Residential Diagnostic Call &bull; Maple Street
                        </p>
                      </div>
                      <div className="rounded-md border bg-muted/40 p-2.5 opacity-90">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Marcus T. &bull; Specialist</span>
                          <span className="text-muted-foreground">11:00 AM &bull; Scheduled</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Equipment Maintenance &bull; Oak Ridge
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mockup Case 3: Field */}
                {current.mockupType === "field" && (
                  <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-foreground">Technician Mobile View</span>
                      <span className="text-[10px] rounded bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5">
                        Offline Ready
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Pre-Service Diagnostic Checklist (5/5 done)</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Before &amp; After Inspection Photos (3 attached)</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Customer Final Walkthrough &amp; Sign-off</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mockup Case 4: Payment */}
                {current.mockupType === "payment" && (
                  <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-foreground">1-Click Invoice #INV-5412</span>
                      <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        PAID INSTANTLY
                      </span>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5 flex justify-between items-center text-xs">
                      <span>Total Amount:</span>
                      <span className="text-base font-extrabold text-emerald-600">$540.00</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Settled via Credit Card Link &bull; Auto-receipt sent via Email &amp; SMS
                    </p>
                  </div>
                )}

                {/* Mockup Case 5: Retention */}
                {current.mockupType === "retention" && (
                  <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-foreground">Customer Retention Hub</span>
                      <div className="flex text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-medium">
                        <span>Equipment Asset Record:</span>
                        <span className="text-emerald-600">Model #X-820 (Logged)</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Review Request Status:</span>
                        <span className="text-emerald-600 font-semibold">5-Star Google Review</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Next Recurring Tune-Up:</span>
                        <span>Auto-scheduled for Spring</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
