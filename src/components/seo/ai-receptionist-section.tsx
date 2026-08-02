import Link from "next/link";
import {
  PhoneCall,
  CalendarCheck,
  UserCheck,
  PhoneForwarded,
  Voicemail,
  Languages,
  ArrowRight,
  Wallet,
  Sparkles,
} from "lucide-react";

/**
 * Shared AI Receptionist showcase section for all SEO cornerstone pages.
 *
 * Server-component safe (no framer-motion, no 'use client') so it can render
 * inside the server-rendered CornerstoneLayout. Drives traffic to the full
 * interactive AI Receptionist section on the homepage (/#ai-receptionist).
 *
 * Rendered automatically by <CornerstoneLayout> above the footer, so every
 * cornerstone marketing page (29 pages) surfaces the AI Receptionist feature.
 */
export function AiReceptionistSection() {
  const capabilities = [
    {
      icon: PhoneCall,
      title: "Answers every call, 24/7",
      description:
        "No more missed leads after hours. Your AI agent picks up on the first ring — weekends, holidays, and 3 AM emergencies included.",
    },
    {
      icon: CalendarCheck,
      title: "Books appointments live",
      description:
        "Checks your real-time calendar, quotes availability, and confirms bookings straight into your schedule — no callbacks needed.",
    },
    {
      icon: UserCheck,
      title: "Qualifies & captures leads",
      description:
        "Asks the right qualifying questions, captures name, address, and job details, then drops a clean lead into your CRM.",
    },
    {
      icon: PhoneForwarded,
      title: "Transfers urgent calls",
      description:
        "Recognises emergencies (no heat, burst pipe, gas leak) and warm-transfers to your on-call technician instantly.",
    },
    {
      icon: Voicemail,
      title: "Takes detailed messages",
      description:
        "When a transfer isn't needed, the agent records a structured message with transcript, summary, and callback number.",
    },
    {
      icon: Languages,
      title: "Speaks 30+ languages",
      description:
        "Greets callers in their preferred language and switches mid-call. Perfect for multilingual neighbourhoods.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      {/* Ambient glow + grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.12),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            New · AI Voice Agent
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Never miss another call.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
              Your AI receptionist answers 24/7.
            </span>
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            Every missed call is a lost customer. Your AI voice agent picks up on
            the first ring, books the job, qualifies the lead, and routes
            emergencies — then logs the whole call to your CRM. Powered by
            Vapi.ai.
          </p>
        </div>

        {/* Capabilities grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-5 hover:border-emerald-400/30 hover:bg-emerald-500/[0.06] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center mb-3">
                  <Icon className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="text-sm font-semibold text-white mb-1.5">
                  {cap.title}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* BYOK pricing note + CTA */}
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-base font-semibold text-white mb-1">
                Bring your own Vapi.ai key — pay only for what you use
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Numbers cost ~
                <span className="text-emerald-300 font-medium">$2/month</span>{" "}
                and calls ~
                <span className="text-emerald-300 font-medium">
                  $0.05–0.15/min
                </span>{" "}
                (includes speech-to-text, the LLM brain, and text-to-speech).
                Billed by Vapi — no separate Twilio account. Available on Growth
                &amp; Pro plans.
              </p>
            </div>
          </div>
          <Link
            href="/#ai-receptionist"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-7 h-12 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors"
          >
            See how it works
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
