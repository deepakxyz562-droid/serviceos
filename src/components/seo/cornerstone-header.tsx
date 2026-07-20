import Link from "next/link";
import { Wrench, ArrowRight, ChevronDown } from "lucide-react";

/**
 * Shared header for all SEO cornerstone pages.
 * Matches the ServiceOS brand identity (emerald accent, Wrench logo mark).
 * Server component — uses CSS-only hover dropdowns (group-hover) so no client JS.
 */
export function CornerstoneHeader({ activePath }: { activePath?: string }) {
  const navLinks = [
    { href: "/field-service-software", label: "Software" },
    { href: "/scheduling-and-dispatch", label: "Features" },
    { href: "/jobber-alternatives", label: "Compare" },
    { href: "/invoice-generator", label: "Free Tools" },
    { href: "/contact-us", label: "Contact" },
  ];

  const industryLinks = [
    { href: "/plumbing-software", label: "Plumbing" },
    { href: "/hvac-software", label: "HVAC" },
    { href: "/cleaning-business-software", label: "Cleaning" },
    { href: "/electrical-contractor-software", label: "Electrical" },
    { href: "/landscaping-software", label: "Landscaping" },
    { href: "/lawn-care-software", label: "Lawn Care" },
    { href: "/painting-software", label: "Painting" },
    { href: "/handyman-software", label: "Handyman" },
    { href: "/tree-care-software", label: "Tree Care" },
    { href: "/snow-removal-software", label: "Snow Removal" },
    { href: "/pest-control-software", label: "Pest Control" },
    { href: "/roofing-software", label: "Roofing" },
    { href: "/pool-service-software", label: "Pool Service" },
    { href: "/window-cleaning-software", label: "Window Cleaning" },
    { href: "/concrete-software", label: "Concrete" },
    { href: "/garage-door-software", label: "Garage Door" },
    { href: "/solar-software", label: "Solar" },
    { href: "/pet-services-software", label: "Pet Services" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 shadow-sm bg-emerald-600 shadow-emerald-500/20">
            <Wrench className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight text-foreground">
            ServiceOS
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {/* Industries dropdown (CSS-only hover) */}
          <div className="relative group">
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                industryLinks.some((i) => i.href === activePath)
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              Industries <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="absolute left-0 top-full pt-2 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 z-50">
              <div className="w-72 rounded-xl border border-border bg-background shadow-lg p-2 grid grid-cols-1 gap-0.5 max-h-[70vh] overflow-y-auto">
                {industryLinks.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      activePath === i.href
                        ? "text-emerald-700 bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {i.label}
                  </Link>
                ))}
                <Link href="/field-service-software" className="px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-accent rounded-md transition-colors mt-1 border-t border-border pt-2">
                  All field service software →
                </Link>
              </div>
            </div>
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activePath === link.href
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/#signup"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/#login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors sm:hidden"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
