import Link from 'next/link';
import { ShieldCheck, Zap } from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';

export function AiMarketingFooter() {
  return (
    <footer className="border-t border-border/80 bg-slate-950 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top brand row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-2 max-w-md">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark size={32} className="shadow-black/20" />
              <span className="text-lg font-bold text-white tracking-tight">
                Fieseros <span className="text-emerald-400">AI Platform</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              The AI Operating System for local service businesses. Generate smart quote calculation forms, offer live calendar booking slots, collect direct payments, and sync leads into Fieseros CRM.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="size-3.5" /> 100% Amazon SES &amp; Direct Bank/UPI
            </span>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-xs">
          {/* Col 1: Products */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Products</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/gptform" className="hover:text-emerald-400 transition">GPTForm™ Smart Forms</Link></li>
              <li><Link href="/templates" className="hover:text-emerald-400 transition">20,000+ Form Templates</Link></li>
              <li><Link href="/#ai-receptionist" className="hover:text-emerald-400 transition">24/7 AI Voice Receptionist</Link></li>
              <li><Link href="/features" className="hover:text-emerald-400 transition">Field Service OS</Link></li>
              <li><Link href="/scheduling-and-dispatch" className="hover:text-emerald-400 transition">Scheduling &amp; Dispatch</Link></li>
              <li><Link href="/gptform#payments" className="hover:text-emerald-400 transition">Direct Pay Gateways</Link></li>
            </ul>
          </div>

          {/* Col 2: Free Tools */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Free Tools</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/invoice-generator" className="text-emerald-400 hover:underline transition font-medium">Free Invoice Generator</Link></li>
              <li><Link href="/estimate-generator" className="hover:text-emerald-400 transition">Free Estimate Generator</Link></li>
              <li><Link href="/proposal-generator" className="hover:text-emerald-400 transition">Free Proposal Generator</Link></li>
              <li><Link href="/job-cost-calculator" className="hover:text-emerald-400 transition">Job Cost Calculator</Link></li>
              <li><Link href="/material-cost-estimator" className="hover:text-emerald-400 transition">Material Cost Estimator</Link></li>
              <li><Link href="/home-maintenance-planner" className="hover:text-emerald-400 transition">Home Maintenance Planner</Link></li>
              <li><Link href="/tools" className="text-emerald-400 font-semibold hover:underline transition">Browse All Free Tools →</Link></li>
            </ul>
          </div>

          {/* Col 3: Templates & Solutions */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Templates &amp; Solutions</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/templates/quote" className="hover:text-emerald-400 transition">Quote &amp; Estimate Forms</Link></li>
              <li><Link href="/templates/intake" className="hover:text-emerald-400 transition">Client Intake Templates</Link></li>
              <li><Link href="/templates/booking" className="hover:text-emerald-400 transition">Booking &amp; Dispatch Forms</Link></li>
              <li><Link href="/templates/industries/home_services" className="hover:text-emerald-400 transition">Home Services Templates</Link></li>
              <li><Link href="/templates/industries/fitness" className="hover:text-emerald-400 transition">Fitness &amp; Wellness Forms</Link></li>
              <li><Link href="/templates/industries/professional_services" className="hover:text-emerald-400 transition">Professional Services</Link></li>
              <li><Link href="/templates" className="text-emerald-400 font-semibold hover:underline transition">Browse All 20,000+ Templates →</Link></li>
            </ul>
          </div>

          {/* Col 4: Alternatives */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Compare Alternatives</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="#compare-jotform" className="hover:text-emerald-400 transition">Jotform Alternative</Link></li>
              <li><Link href="#compare-sitegpt" className="hover:text-emerald-400 transition">SiteGPT Alternative</Link></li>
              <li><Link href="#compare-typeform" className="hover:text-emerald-400 transition">Typeform Alternative</Link></li>
              <li><Link href="#compare-googleforms" className="hover:text-emerald-400 transition">Google Forms Alternative</Link></li>
              <li><Link href="#compare-fillout" className="hover:text-emerald-400 transition">Fillout Alternative</Link></li>
              <li><Link href="#compare-formstack" className="hover:text-emerald-400 transition">Formstack Alternative</Link></li>
              <li><Link href="#compare-wpforms" className="hover:text-emerald-400 transition">WPForms Alternative</Link></li>
            </ul>
          </div>

          {/* Col 5: Platform & Legal */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Fieseros Platform</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/features" className="hover:text-emerald-400 transition">Fieseros CRM Overview</Link></li>
              <li><Link href="/scheduling-and-dispatch" className="hover:text-emerald-400 transition">Scheduling &amp; Dispatch</Link></li>
              <li><Link href="/invoicing-and-payments" className="hover:text-emerald-400 transition">Invoicing &amp; Direct Pay</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-emerald-400 transition">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-emerald-400 transition">Privacy Policy</Link></li>
              <li><Link href="/contact-us" className="hover:text-emerald-400 transition">Contact &amp; Support</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Fieseros. Built for high-growth service businesses.</p>
          <div className="flex items-center gap-4">
            <span>Powered by Amazon SES &amp; OpenAI/Anthropic/Gemini</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
