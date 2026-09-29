import Link from "next/link";

/**
 * Server-rendered SEO nav links — visually hidden but crawlable.
 *
 * The interactive CornerstoneHeader is a client component ('use client')
 * because it uses useState for dropdown hover timing. This means ~100
 * mega-menu nav links are invisible in the initial server HTML that
 * Googlebot parses.
 *
 * This component renders all the same links in a screen-reader-only
 * <nav> so Googlebot's first HTML parse sees them without executing
 * JavaScript. Uses a simplified href+label list (no icon data needed
 * for crawlability) to avoid cross-boundary import issues with the
 * client header module.
 *
 * The `sr-only` class hides this visually but keeps it in the DOM and
 * the accessibility tree.
 */
export function HeaderSeoLinks() {
  return (
    <nav aria-label="All pages" className="sr-only">
      <h2>All Fieseros pages</h2>
      <ul>
        {NAV_LINKS.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Simplified link list — just href + label for crawlability.
// Mirrors the mega-menu structure in CornerstoneHeader but without
// icon/desc data (not needed for SEO link discovery).
const NAV_LINKS: { href: string; label: string }[] = [
  // Product
  { href: "/field-service-management", label: "Field Service Management" },
  { href: "/home-services-software", label: "Home Services Software" },
  { href: "/blue-collar-crm", label: "Blue Collar CRM" },
  { href: "/field-service-software", label: "Field Service Software" },
  { href: "/scheduling-and-dispatch", label: "Scheduling & Dispatch" },
  { href: "/invoicing-and-payments", label: "Invoicing & Payments" },
  { href: "/customer-crm", label: "Customer CRM" },
  { href: "/technician-app", label: "Technician App" },
  { href: "/automations", label: "Automations" },
  { href: "/pricing", label: "Pricing" },
  { href: "/features", label: "Features Hub" },

  // AI & Forms
  { href: "/ai-employee", label: "24/7 AI Voice Receptionist" },
  { href: "/ai-agent", label: "24/7 AI Employee & Agent" },
  { href: "/chatbot", label: "AI Chatbot Builder" },
  { href: "/gptform", label: "GPTForm AI Platform" },
  { href: "/templates", label: "20,000+ Form Templates" },
  { href: "/templates/quote", label: "Quote Calculators" },

  // Use Cases
  { href: "/use-cases", label: "All Use Cases" },
  { href: "/use-cases/lead-capture", label: "AI Lead Capture" },
  { href: "/use-cases/appointment-booking", label: "Appointment Booking" },
  { href: "/use-cases/quote-generation", label: "Quote Generation" },
  { href: "/use-cases/payment-collection", label: "Payment Collection" },
  { href: "/use-cases/review-collection", label: "Review Collection" },
  { href: "/use-cases/lead-nurturing", label: "Lead Nurturing" },
  { href: "/use-cases/customer-support", label: "AI Customer Support" },
  { href: "/use-cases/job-dispatch", label: "Job Dispatch" },

  // Platform & Integrations
  { href: "/platform", label: "All Platforms" },
  { href: "/platform/wordpress", label: "WordPress" },
  { href: "/platform/shopify", label: "Shopify" },
  { href: "/platform/wix", label: "Wix" },
  { href: "/platform/webflow", label: "Webflow" },
  { href: "/platform/squarespace", label: "Squarespace" },
  { href: "/platform/html", label: "Custom HTML" },
  { href: "/integrations", label: "All Integrations" },
  { href: "/integrations/google-calendar", label: "Google Calendar" },
  { href: "/integrations/stripe", label: "Stripe Payments" },
  { href: "/integrations/zapier", label: "Zapier" },
  { href: "/integrations/quickbooks", label: "QuickBooks" },

  // Industries
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
  { href: "/industries", label: "All Industries" },

  // Compare
  { href: "/jobber-alternatives", label: "Jobber Alternatives" },
  { href: "/housecall-pro-alternatives", label: "Housecall Pro Alternatives" },
  { href: "/servicetitan-alternatives", label: "ServiceTitan Alternatives" },
  { href: "/best-field-service-software", label: "Best Field Service Software" },
  { href: "/fieseros-vs-jotform", label: "Fieseros vs Jotform" },
  { href: "/fieseros-vs-typeform", label: "Fieseros vs Typeform" },
  { href: "/fieseros-vs-chatbase", label: "Fieseros vs Chatbase" },
  { href: "/fieseros-vs-tidio", label: "Fieseros vs Tidio" },
  { href: "/ai-chatbot-alternatives", label: "AI Chatbot Alternatives" },
  { href: "/conversational-forms-alternatives", label: "Conversational Forms Alternatives" },

  // Company & Resources
  { href: "/about", label: "About Fieseros" },
  { href: "/careers", label: "Careers" },
  { href: "/partners", label: "Partners" },
  { href: "/press", label: "Press & Media" },
  { href: "/resources", label: "Resources Hub" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/blog", label: "Contractor Blog" },
  { href: "/why-fieseros", label: "Why Fieseros" },
  { href: "/contact-us", label: "Contact Us" },
  { href: "/marketplace", label: "Marketplace" },

  // Services
  { href: "/services", label: "All Services" },
  { href: "/services/website-development", label: "Website Development" },
  { href: "/services/seo", label: "Local SEO" },
  { href: "/services/google-ads", label: "Google Ads" },
  { href: "/services/get-a-quote", label: "Get a Quote" },

  // Free Tools
  { href: "/invoice-generator", label: "Free Invoice Generator" },
  { href: "/estimate-generator", label: "Free Estimate Generator" },
  { href: "/proposal-generator", label: "Free Proposal Generator" },
  { href: "/contract-drafting-generator", label: "Free Contract Generator" },
  { href: "/job-cost-calculator", label: "Free Job Cost Calculator" },
  { href: "/material-cost-estimator", label: "Free Material Cost Estimator" },
  { href: "/home-maintenance-planner", label: "Home Maintenance Planner" },
  { href: "/tools", label: "All Free Tools" },
];
