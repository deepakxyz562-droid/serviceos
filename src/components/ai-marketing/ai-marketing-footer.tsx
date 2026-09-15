import Link from 'next/link';
import { Bot, ShieldCheck, Zap } from 'lucide-react';

export function AiMarketingFooter() {
  return (
    <footer className="border-t border-border/80 bg-slate-950 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top brand row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Bot className="size-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Fieseros <span className="text-emerald-400">AI Platform</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Turn your website into a 24/7 AI employee. Answer customer questions, offer live calendar booking slots, generate responsive forms, and automatically sync leads into Fieseros CRM.
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
              <li><Link href="#receptionist" className="hover:text-emerald-400 transition">AI Website Receptionist</Link></li>
              <li><Link href="#forms" className="hover:text-emerald-400 transition">Conversational Smart Forms</Link></li>
              <li><Link href="#builder" className="hover:text-emerald-400 transition">Visual 17-Field Form Builder</Link></li>
              <li><Link href="#knowledge" className="hover:text-emerald-400 transition">Website Knowledge Scraper</Link></li>
              <li><Link href="#wordpress" className="hover:text-emerald-400 transition">WordPress Connector Plugin</Link></li>
              <li><Link href="#embed" className="hover:text-emerald-400 transition">Universal 1-Line Embed</Link></li>
              <li><Link href="/pay/demo" className="hover:text-emerald-400 transition">Direct Pay Checkout</Link></li>
            </ul>
          </div>

          {/* Col 2: Free Markdown & Document Converters */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Document Converters</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="#converters" className="hover:text-emerald-400 transition">PDF to Markdown</Link></li>
              <li><Link href="#converters" className="hover:text-emerald-400 transition">DOCX to Markdown</Link></li>
              <li><Link href="#converters" className="hover:text-emerald-400 transition">HTML to Markdown</Link></li>
              <li><Link href="#converters" className="hover:text-emerald-400 transition">Notion to Markdown</Link></li>
              <li><Link href="#converters" className="hover:text-emerald-400 transition">Google Docs to Markdown</Link></li>
              <li><Link href="#converters" className="hover:text-emerald-400 transition">CSV to Markdown</Link></li>
              <li><Link href="#converters" className="hover:text-emerald-400 transition">Webpage to Markdown</Link></li>
            </ul>
          </div>

          {/* Col 3: AI Chat & Generation Tools */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">AI Tools &amp; Generators</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="#tools" className="hover:text-emerald-400 transition">AI Form Generator from URL</Link></li>
              <li><Link href="#tools" className="hover:text-emerald-400 transition">AI FAQ Generator</Link></li>
              <li><Link href="#tools" className="hover:text-emerald-400 transition">AI Service Reply Generator</Link></li>
              <li><Link href="#tools" className="hover:text-emerald-400 transition">AI Quote &amp; Estimate Estimator</Link></li>
              <li><Link href="#calculator" className="hover:text-emerald-400 transition">Chatbot ROI Calculator</Link></li>
              <li><Link href="#tools" className="hover:text-emerald-400 transition">Sitemap XML URL Extractor</Link></li>
              <li><Link href="#tools" className="hover:text-emerald-400 transition">In-Editor AI Copilot</Link></li>
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
          <p>© {new Date().getFullYear()} Fieseros AI. Built for high-growth service businesses.</p>
          <div className="flex items-center gap-4">
            <span>Powered by Amazon SES &amp; OpenAI/Anthropic/Gemini</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
