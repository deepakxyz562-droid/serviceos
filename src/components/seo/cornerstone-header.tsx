import Link from "next/link";
import { Bolt, ArrowRight } from "lucide-react";

/**
 * Shared header for all SEO cornerstone pages.
 * Matches the ServiceOS brand identity (emerald accent, Bolt logo mark).
 * Server component — no client JS.
 */
export function CornerstoneHeader({ activePath }: { activePath?: string }) {
  const navLinks = [
    { href: "/field-service-software", label: "Software" },
    { href: "/scheduling-and-dispatch", label: "Features" },
    { href: "/jobber-alternatives", label: "Compare" },
    { href: "/invoice-generator", label: "Free Tools" },
    { href: "/contact-us", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
            <Bolt className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight text-foreground">
            ServiceOS
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
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
