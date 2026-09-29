import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Briefcase, Heart, Zap, Globe, Coffee } from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
} from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Careers at Fieseros — Build the Operating System for Service Businesses",
  description:
    "Join Fieseros and build the AI operating system that powers thousands of service businesses. Remote-first, mission-driven, fair compensation. See open roles in engineering, product, sales, and support.",
  keywords: [
    "fieseros careers",
    "fieseros jobs",
    "field service software jobs",
    "ai startup careers",
    "remote startup jobs",
  ],
  alternates: { canonical: "https://fieseros.com/careers" },
  openGraph: {
    title: "Careers at Fieseros — Build the Operating System for Service Businesses",
    description:
      "Join Fieseros and build the AI operating system that powers thousands of service businesses. Remote-first, mission-driven.",
    url: "https://fieseros.com/careers",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Careers", href: "/careers" },
];

const openRoles = [
  {
    team: "Engineering",
    title: "Senior Full-Stack Engineer (Next.js / TypeScript)",
    location: "Remote (Americas)",
    type: "Full-time",
    href: "mailto:careers@fieseros.com?subject=Senior Full-Stack Engineer",
  },
  {
    team: "Engineering",
    title: "AI / LLM Engineer (Agent & Voice Systems)",
    location: "Remote (Global)",
    type: "Full-time",
    href: "mailto:careers@fieseros.com?subject=AI/LLM Engineer",
  },
  {
    team: "Engineering",
    title: "Mobile PWA Engineer (Offline-First Field Apps)",
    location: "Remote (Americas)",
    type: "Full-time",
    href: "mailto:careers@fieseros.com?subject=Mobile PWA Engineer",
  },
  {
    team: "Product",
    title: "Product Manager — Field Service Workflows",
    location: "Remote (Americas)",
    type: "Full-time",
    href: "mailto:careers@fieseros.com?subject=Product Manager",
  },
  {
    team: "Sales",
    title: "Account Executive (SMB & Mid-Market)",
    location: "Remote (US)",
    type: "Full-time",
    href: "mailto:careers@fieseros.com?subject=Account Executive",
  },
  {
    team: "Customer Success",
    title: "Onboarding Specialist (Field Service)",
    location: "Remote (Americas)",
    type: "Full-time",
    href: "mailto:careers@fieseros.com?subject=Onboarding Specialist",
  },
];

const benefits = [
  {
    icon: Globe,
    title: "Remote-first, truly",
    description:
      "Work from anywhere in your region. We've been remote since day one — not a pandemic pivot. Async-by-default culture with deep-work respect.",
  },
  {
    icon: Heart,
    title: "Health & wellness",
    description:
      "Comprehensive medical, dental, and vision coverage. Mental health stipend. Annual wellness budget for whatever keeps you healthy.",
  },
  {
    icon: Briefcase,
    title: "Equity for everyone",
    description:
      "Every full-time employee gets equity. We win together when Fieseros wins — not just the founders and early investors.",
  },
  {
    icon: Zap,
    title: "Top-tier tools",
    description:
      "Latest MacBook, the dev tools you want, a real desk-and-chair budget. We invest in the tools that make you fast.",
  },
  {
    icon: Coffee,
    title: "Learning & growth",
    description:
      "$2,000 annual learning budget. Conference attendance. Internal AI-tooling access so you build with the best tech we have.",
  },
  {
    icon: MapPin,
    title: "Regular team retreats",
    description:
      "Quarterly team retreats in real places (not just Zoom happy hours). We invest in real human connection across the remote team.",
  },
];

export default function CareersPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/careers" showAiReceptionist={false}>
      <CornerstoneHero
        eyebrow="Careers"
        title="Build the operating system for service businesses"
        subtitle="Thousands of plumbers, HVAC techs, and tradespeople rely on Fieseros to run their business. Join us in building the AI tools that help them win — and sleep better at night."
      />

      {/* Open roles */}
      <section id="open-roles" className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Open roles
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We hire across engineering, product, sales, and customer success.
              Don't see your role? Email us — we're always meeting great people.
            </p>
          </div>
          <div className="space-y-3">
            {openRoles.map((role) => (
              <a
                key={role.title}
                href={role.href}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {role.team}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {role.type}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {role.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {role.location}
                  </span>
                  <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't see the right fit? Email{" "}
            <a href="mailto:careers@fieseros.com" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
              careers@fieseros.com
            </a>{" "}
            — we'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Why work here
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We invest in the people who invest in Fieseros. Real benefits,
              real equity, real flexibility — not ping-pong-table lip service.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {b.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {b.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CtaSection
        title="Ready to build with us?"
        subtitle="Send us your story. We read every application personally — no ATS black holes."
        primaryCta={{ label: "View Open Roles", href: "#open-roles" }}
        secondaryCta={{ label: "Email Careers", href: "mailto:careers@fieseros.com" }}
        bullets={["Remote-first", "Equity for everyone", "Mission-driven"]}
      />
    </CornerstoneLayout>
  );
}
