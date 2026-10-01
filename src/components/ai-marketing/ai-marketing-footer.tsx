import Link from 'next/link';
import { ShieldCheck, Sparkles, Mail, MapPin } from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';

export function AiMarketingFooter() {
  const aiFormLinks = [
    { href: '/intakeai', label: 'IntakeAI™ Autonomous Agent' },
    { href: '/ai-employee', label: '24/7 AI Voice Receptionist' },
    { href: '/chatbot', label: 'AI Chatbot Builder' },
    { href: '/gptform', label: 'GPTForm™ AI Platform' },
    { href: '/ai-agent', label: '24/7 AI Employee & Agent' },
    { href: '/templates', label: '20,000+ Form Templates' },
    { href: '/templates/quote', label: 'Quote Calculators & Math' },
  ];

  const useCaseLinks = [
    { href: '/use-cases', label: 'All Use Cases Hub →' },
    { href: '/use-cases/lead-capture', label: 'AI Lead Capture' },
    { href: '/use-cases/appointment-booking', label: 'Appointment Booking' },
    { href: '/use-cases/quote-generation', label: 'Quote Generation' },
    { href: '/use-cases/payment-collection', label: 'Payment Collection' },
    { href: '/use-cases/review-collection', label: 'Review Collection' },
    { href: '/use-cases/lead-nurturing', label: 'Lead Nurturing' },
    { href: '/use-cases/customer-support', label: 'AI Customer Support' },
    { href: '/use-cases/job-dispatch', label: 'Job Dispatch' },
  ];

  const platformLinks = [
    { href: '/platform', label: 'CMS Platforms Hub →' },
    { href: '/platform/wordpress', label: 'WordPress Embed' },
    { href: '/platform/shopify', label: 'Shopify Booking' },
    { href: '/platform/wix', label: 'Wix AI Chat' },
    { href: '/platform/webflow', label: 'Webflow Embed' },
    { href: '/platform/squarespace', label: 'Squarespace Code' },
    { href: '/platform/html', label: 'Pure HTML Snippet' },
  ];

  const integrationLinks = [
    { href: '/integrations', label: 'App Sync Hub →' },
    { href: '/integrations/google-calendar', label: 'Google Calendar Sync' },
    { href: '/integrations/stripe', label: 'Stripe 0% Payments' },
    { href: '/integrations/zapier', label: 'Zapier Automations' },
    { href: '/integrations/quickbooks', label: 'QuickBooks Invoicing' },
  ];

  const comparisonLinks = [
    { href: '/fieseros-vs-typeform', label: 'Fieseros vs Typeform' },
    { href: '/fieseros-vs-chatbase', label: 'Fieseros vs Chatbase' },
    { href: '/fieseros-vs-tidio', label: 'Fieseros vs Tidio' },
    { href: '/fieseros-vs-jotform', label: 'Fieseros vs Jotform' },
    { href: '/fieseros-vs-elfchatbot', label: 'Fieseros vs ElfChatbot' },
    { href: '/ai-chatbot-alternatives', label: 'AI Chatbot Alternatives' },
    { href: '/conversational-forms-alternatives', label: 'Conversational Form Guide' },
    { href: '/jobber-alternatives', label: 'Jobber Alternatives' },
    { href: '/housecall-pro-alternatives', label: 'Housecall Pro Alternative' },
    { href: '/servicetitan-alternatives', label: 'ServiceTitan Alternative' },
  ];


  const companyLinks = [
    { href: '/about', label: 'About & Mission' },
    { href: '/careers', label: 'Careers & Hiring' },
    { href: '/partners', label: 'Partner Program' },
    { href: '/press', label: 'Press & Media Kit' },
    { href: '/resources', label: 'Contractor Resources' },
    { href: '/case-studies', label: 'Customer Case Studies' },
  ];

  const productSuiteLinks = [
    { href: '/field-service-software', label: 'Field Service OS' },
    { href: '/scheduling-and-dispatch', label: 'Scheduling & Dispatch' },
    { href: '/invoicing-and-payments', label: 'Invoicing & Payments' },
    { href: '/customer-crm', label: 'Customer CRM' },
    { href: '/technician-app', label: 'Technician Mobile App' },
    { href: '/invoice-generator', label: 'Free Invoice Generator' },
    { href: '/estimate-generator', label: 'Free Estimate Generator' },
    { href: '/marketplace', label: 'Verified Pro Marketplace' },
  ];

  return (
    <footer className="mt-auto border-t border-border/80 bg-slate-950 text-slate-300">
      {/* ── Top Brand & Value Proposition Strip ── */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <Link href="/" className="flex items-center gap-2.5 group">
                <BrandMark size={36} className="shadow-black/20 group-hover:scale-105 transition-transform" />
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Fieseros <span className="text-emerald-400">AI</span>
                </span>
              </Link>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Autonomous AI Voice Receptionists, Multi-channel AI Agents, and JotForm-grade Form Builders with live formula calculators, 33+ payment gateways, and 0% platform transaction fees.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="size-3.5" /> 100% Direct Payouts (0% Commission)
              </span>
              <a
                href="mailto:support@fieseros.com"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors shadow-2xs"
              >
                <Mail className="h-3.5 w-3.5 text-emerald-400" />
                <span>support@fieseros.com</span>
              </a>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 shadow-2xs">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                <span>Wilmington, DE, USA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI & Smart Forms Spotlight Strip ── */}
      <div className="border-b border-slate-800 bg-gradient-to-r from-emerald-950/40 via-purple-950/30 to-blue-950/40 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                <Sparkles className="size-3.5 text-emerald-400" /> AI Suite
              </span>
              <span className="text-xs font-bold text-white">
                Autonomous AI Voice, Multichannel Agents &amp; Formula Calculation Forms
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {aiFormLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-semibold hover:border-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6-Column Main Footer Links Grid ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 text-xs">
          {/* Column 1: AI & Smart Forms */}
          <div>
            <div className="flex items-center gap-1.5 mb-3.5">
              <h3 className="font-semibold text-white uppercase tracking-wider text-[11px]">
                AI &amp; Smart Forms
              </h3>
              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded-full uppercase">
                Core
              </span>
            </div>
            <ul className="space-y-2 text-slate-400">
              {aiFormLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-emerald-400 transition-colors font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Use Cases */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3.5">
              Use Cases
            </h3>
            <ul className="space-y-2 text-slate-400">
              {useCaseLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`transition-colors block ${
                      link.href === '/use-cases'
                        ? 'text-emerald-400 font-bold hover:underline'
                        : 'hover:text-emerald-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Platforms & Integrations */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-2.5">
              Platforms (CMS)
            </h3>
            <ul className="space-y-1.5 text-slate-400 mb-4">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`transition-colors block ${
                      link.href === '/platform'
                        ? 'text-emerald-400 font-bold hover:underline'
                        : 'hover:text-emerald-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-2.5">
              App Sync
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              {integrationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`transition-colors block ${
                      link.href === '/integrations'
                        ? 'text-emerald-400 font-bold hover:underline'
                        : 'hover:text-emerald-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Competitor Comparisons */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3.5">
              Compare
            </h3>
            <ul className="space-y-2 text-slate-400">
              {comparisonLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Company & Social Proof */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3.5">
              Company
            </h3>
            <ul className="space-y-2 text-slate-400">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 6: Field Service OS & Free Tools */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3.5">
              Field Service OS
            </h3>
            <ul className="space-y-2 text-slate-400">
              {productSuiteLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Sub-footer Compliance & Copyright ── */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Fieseros, Inc. All-in-one platform &amp; local marketplace for service businesses.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/privacy-policy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:text-slate-300 transition-colors">Cookie Policy</Link>
            <Link href="/data-deletion" className="hover:text-slate-300 transition-colors">Data Deletion</Link>
            <Link href="/marketplace" className="hover:text-slate-300 transition-colors">Pro Marketplace</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
