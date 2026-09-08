import Link from "next/link";
import { Bolt, Twitter, Linkedin, Github, ShieldCheck, Mail, MapPin } from "lucide-react";

/**
 * Shared rich footer for all SEO cornerstone, marketplace, and public marketing pages.
 * Includes comprehensive internal linking mesh between cornerstone pages for SEO,
 * brand signals, and compliance links.
 * Server component — zero client JS.
 */
export function CornerstoneFooter() {
  const productLinks = [
    { href: "/field-service-software", label: "Field Service Software" },
    { href: "/scheduling-and-dispatch", label: "Scheduling & Dispatch" },
    { href: "/invoicing-and-payments", label: "Invoicing & Payments" },
    { href: "/customer-crm", label: "Customer CRM" },
    { href: "/technician-app", label: "Technician App" },
    { href: "/automations", label: "Automations" },
    { href: "/#ai-receptionist", label: "AI Receptionist" },
    { href: "/marketplace", label: "Provider Marketplace" },
  ];

  const servicesLinks = [
    { href: "/services/website-development", label: "Website Development" },
    { href: "/services/seo", label: "SEO & Local Search" },
    { href: "/services/google-ads", label: "Google Ads" },
    { href: "/services", label: "All Trade Services" },
  ];

  const industryLinks = [
    { href: "/plumbing-software", label: "Plumbing Software" },
    { href: "/hvac-software", label: "HVAC Software" },
    { href: "/cleaning-business-software", label: "Cleaning Business Software" },
    { href: "/electrical-contractor-software", label: "Electrical Contractor Software" },
    { href: "/landscaping-software", label: "Landscaping Software" },
    { href: "/lawn-care-software", label: "Lawn Care Software" },
    { href: "/painting-software", label: "Painting Software" },
    { href: "/handyman-software", label: "Handyman Software" },
    { href: "/tree-care-software", label: "Tree Care Software" },
    { href: "/snow-removal-software", label: "Snow Removal Software" },
    { href: "/pest-control-software", label: "Pest Control Software" },
    { href: "/roofing-software", label: "Roofing Software" },
    { href: "/pool-service-software", label: "Pool Service Software" },
    { href: "/window-cleaning-software", label: "Window Cleaning Software" },
    { href: "/concrete-software", label: "Concrete Software" },
    { href: "/garage-door-software", label: "Garage Door Software" },
    { href: "/solar-software", label: "Solar Software" },
    { href: "/pet-services-software", label: "Pet Services Software" },
  ];

  const compareLinks = [
    { href: "/jobber-alternatives", label: "Jobber Alternatives" },
    { href: "/housecall-pro-alternatives", label: "Housecall Pro Alternatives" },
    { href: "/servicetitan-alternatives", label: "ServiceTitan Alternatives" },
    { href: "/best-field-service-software", label: "Best Field Service Software" },
  ];

  const resourceLinks = [
    { href: "/invoice-generator", label: "Free Invoice Generator" },
    { href: "/docs/notifications-setup", label: "Notification Setup Guide" },
    { href: "/contact-us", label: "Contact Us" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-service", label: "Terms of Service" },
    { href: "/data-deletion", label: "Data Deletion Request" },
  ];

  const half = Math.ceil(industryLinks.length / 2);
  const industriesA = industryLinks.slice(0, half);
  const industriesB = industryLinks.slice(half);

  return (
    <footer className="mt-auto border-t border-border/80 bg-muted/40 text-foreground">
      {/* ── Top Brand & Value Proposition Strip ── */}
      <div className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <Link href="/" className="flex items-center gap-2.5 group">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm transition-transform group-hover:scale-105">
                  <Bolt className="h-5 w-5 text-white" />
                </span>
                <span className="text-xl font-extrabold tracking-tight text-foreground">
                  Fieseros
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The all-in-one operating system for field service and trade businesses. Dispatching, CRM, invoicing, payments, and 24/7 AI Receptionist built for growth.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <a
                href="mailto:support@fieseros.com"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 hover:border-emerald-500/50 hover:text-emerald-600 transition-colors shadow-2xs"
              >
                <Mail className="h-3.5 w-3.5 text-emerald-600" />
                <span>support@fieseros.com</span>
              </a>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2 shadow-2xs">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>Wilmington, DE, USA</span>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <a
                  href="https://twitter.com/fieseros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-border/70 bg-card hover:text-emerald-600 hover:border-emerald-500/50 transition-colors"
                  aria-label="Twitter / X"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com/company/fieseros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-border/70 bg-card hover:text-emerald-600 hover:border-emerald-500/50 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com/fieseros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-border/70 bg-card hover:text-emerald-600 hover:border-emerald-500/50 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Links Columns ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Product */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Product
            </h3>
            <ul className="space-y-2 text-xs">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Services
            </h3>
            <ul className="space-y-2 text-xs">
              {servicesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries (split into two columns) */}
          <div className="col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Industries Served
            </h3>
            <div className="grid grid-cols-2 gap-x-4">
              <ul className="space-y-2 text-xs">
                {industriesA.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2 text-xs">
                {industriesB.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Compare */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Compare
            </h3>
            <ul className="space-y-2 text-xs">
              {compareLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources & Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5">
              Resources &amp; Legal
            </h3>
            <ul className="space-y-2 text-xs">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom Sub-footer ── */}
        <div className="mt-12 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>&copy; {new Date().getFullYear()} Fieseros, Inc. All rights reserved.</span>
          </div>
          <p className="text-center sm:text-right">
            The Operating System for Trade &amp; Field Service Businesses.
          </p>
        </div>
      </div>
    </footer>
  );
}
