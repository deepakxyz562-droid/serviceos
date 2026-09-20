import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';

export function AiMarketingFooter() {
  return (
    <footer className="border-t border-border/80 bg-slate-950 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top Brand & SEO Definition Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-2 max-w-md">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size={32} className="shadow-black/20" />
              <span className="text-lg font-bold text-white tracking-tight">
                Fieseros <span className="text-emerald-400">Service OS</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              An all-in-one software platform and local marketplace designed to help field service companies and trade businesses run their operations, build websites, and find customers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="size-3.5" /> 100% Direct Payouts (0% Commission)
            </span>
          </div>
        </div>

        {/* 5-Column Cornerstone Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-xs">
          {/* Col 1: Platform */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Platform</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/customer-crm" className="hover:text-emerald-400 transition">Customer CRM</Link></li>
              <li><Link href="/scheduling-and-dispatch" className="hover:text-emerald-400 transition">Scheduling &amp; Dispatch</Link></li>
              <li><Link href="/invoicing-and-payments" className="hover:text-emerald-400 transition">Quotes &amp; Invoicing</Link></li>
              <li><Link href="/technician-app" className="hover:text-emerald-400 transition">Technician App</Link></li>
              <li><Link href="/automations" className="hover:text-emerald-400 transition">Automations</Link></li>
            </ul>
          </div>

          {/* Col 2: AI & Forms */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">AI &amp; Forms</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/gptform" className="text-emerald-400 font-semibold hover:underline transition">GPTForm™ AI Platform</Link></li>
              <li><Link href="/#ai-receptionist" className="hover:text-emerald-400 transition">24/7 AI Voice Receptionist</Link></li>
              <li><Link href="/templates" className="hover:text-emerald-400 transition">20,000+ Form Templates</Link></li>
              <li><Link href="/templates/quote" className="hover:text-emerald-400 transition">Quote Calculators</Link></li>
            </ul>
          </div>

          {/* Col 3: Free Tools */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Free Tools</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/invoice-generator" className="hover:text-emerald-400 transition">Invoice Generator</Link></li>
              <li><Link href="/estimate-generator" className="hover:text-emerald-400 transition">Estimate Generator</Link></li>
              <li><Link href="/proposal-generator" className="hover:text-emerald-400 transition">Proposal Generator</Link></li>
              <li><Link href="/job-cost-calculator" className="hover:text-emerald-400 transition">Job Cost Calculator</Link></li>
              <li><Link href="/tools" className="text-emerald-400 hover:underline transition">All Free Tools →</Link></li>
            </ul>
          </div>

          {/* Col 4: Industries */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Industries</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/hvac-software" className="hover:text-emerald-400 transition">HVAC Software</Link></li>
              <li><Link href="/plumbing-software" className="hover:text-emerald-400 transition">Plumbing Software</Link></li>
              <li><Link href="/electrical-contractor-software" className="hover:text-emerald-400 transition">Electrical Software</Link></li>
              <li><Link href="/cleaning-business-software" className="hover:text-emerald-400 transition">Cleaning Business</Link></li>
              <li><Link href="/roofing-software" className="hover:text-emerald-400 transition">Roofing Software</Link></li>
            </ul>
          </div>

          {/* Col 5: Company */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Company</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/marketplace" className="hover:text-emerald-400 transition">Pro Marketplace</Link></li>
              <li><Link href="/#pricing" className="hover:text-emerald-400 transition">Pricing Plans</Link></li>
              <li><Link href="/blog" className="hover:text-emerald-400 transition">Contractor Blog</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-emerald-400 transition">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-emerald-400 transition">Privacy Policy</Link></li>
              <li><Link href="/contact-us" className="hover:text-emerald-400 transition">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Infrastructure */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Fieseros. All-in-one platform &amp; local marketplace for service businesses.</p>
          <span>Powered by Amazon SES &amp; OpenAI/Anthropic/Gemini</span>
        </div>
      </div>
    </footer>
  );
}
