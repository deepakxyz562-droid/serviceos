import Link from "next/link";

/**
 * Shared footer for all SEO cornerstone pages.
 * Includes internal linking mesh between cornerstone pages for SEO.
 * Server component — no client JS.
 */
export function CornerstoneFooter() {
  const productLinks = [
    { href: "/field-service-software", label: "Field Service Software" },
    { href: "/scheduling-and-dispatch", label: "Scheduling & Dispatch" },
    { href: "/invoicing-and-payments", label: "Invoicing & Payments" },
    { href: "/customer-crm", label: "Customer CRM" },
    { href: "/technician-app", label: "Technician App" },
    { href: "/automations", label: "Automations" },
  ];

  const industryLinks = [
    { href: "/plumbing-software", label: "Plumbing Software" },
    { href: "/hvac-software", label: "HVAC Software" },
    { href: "/cleaning-business-software", label: "Cleaning Business Software" },
    { href: "/electrical-contractor-software", label: "Electrical Contractor Software" },
  ];

  const compareLinks = [
    { href: "/jobber-alternatives", label: "Jobber Alternatives" },
    { href: "/housecall-pro-alternatives", label: "Housecall Pro Alternatives" },
    { href: "/servicetitan-alternatives", label: "ServiceTitan Alternatives" },
    { href: "/best-field-service-software", label: "Best Field Service Software" },
    { href: "/serviceos-vs-jobber", label: "ServiceOS vs Jobber" },
  ];

  const resourceLinks = [
    { href: "/invoice-generator", label: "Free Invoice Generator" },
    { href: "/contact-us", label: "Contact Us" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-service", label: "Terms of Service" },
  ];

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Industries</h3>
            <ul className="space-y-2">
              {industryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compare */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Compare</h3>
            <ul className="space-y-2">
              {compareLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ServiceOS, Inc. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            The Operating System for Service Businesses.
          </p>
        </div>
      </div>
    </footer>
  );
}
