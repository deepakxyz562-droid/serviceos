'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  FileInput,
  Globe,
  FileCode,
  Wand2,
  Layers,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bot,
  CreditCard,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AiMarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTryDemoClick = (e: React.MouseEvent) => {
    const el = document.getElementById('demo') || document.getElementById('demo-url-input');
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = document.getElementById('demo-url-input') as HTMLInputElement | null;
      if (input) input.focus();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size={32} className="shadow-emerald-500/20" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Fieseros <span className="text-emerald-600 font-extrabold">AI</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-1">
                AI Employee &amp; Smart Forms
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium">
            {/* Products Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
                  Products <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2">
                <DropdownMenuItem asChild>
                  <Link href="/gptsite" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <Bot className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">GPTSite™ AI Employee</p>
                      <p className="text-[11px] text-muted-foreground">Answers FAQs &amp; books appointments 24/7</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gptform" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <FileInput className="size-4 text-teal-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">GPTForm™ Smart Forms &amp; 200+ Widgets</p>
                      <p className="text-[11px] text-muted-foreground">Paper, Card &amp; AI Chatbot runtime modes</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gptform#payments" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <CreditCard className="size-4 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">33 Payment Gateways (0% Fee)</p>
                      <p className="text-[11px] text-muted-foreground">UPI QR, BNPL 4x, Cards, Invoices</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gptsite#wordpress" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <FileCode className="size-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">WordPress Plugin &amp; JS Embed</p>
                      <p className="text-[11px] text-muted-foreground">1-line JS embed for any CMS</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Free Tools Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
                  Tools <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2">
                <DropdownMenuItem asChild>
                  <Link href="#tools" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <Wand2 className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">AI Form &amp; FAQ Generator</p>
                      <p className="text-[11px] text-muted-foreground">Generate complete forms from any URL</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="#converters" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <FileCode className="size-4 text-teal-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">PDF / DOCX to Markdown</p>
                      <p className="text-[11px] text-muted-foreground">Convert documents for AI knowledge</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="#calculator" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <Zap className="size-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs text-foreground">Chatbot ROI Calculator</p>
                      <p className="text-[11px] text-muted-foreground">Calculate lead capture increase</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Alternatives Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
                  Alternatives <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2">
                <DropdownMenuItem asChild>
                  <Link href="#compare-jotform" className="p-2 text-xs font-medium cursor-pointer">
                    vs. Jotform Alternative
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="#compare-sitegpt" className="p-2 text-xs font-medium cursor-pointer">
                    vs. SiteGPT Alternative
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="#compare-typeform" className="p-2 text-xs font-medium cursor-pointer">
                    vs. Typeform Alternative
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="#compare-googleforms" className="p-2 text-xs font-medium cursor-pointer">
                    vs. Google Forms Alternative
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/templates" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition font-medium">
              20,000+ Templates
            </Link>
            <Link href="/gptform" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition font-medium">
              GPTForm (AI Forms)
            </Link>
            <Link href="/gptsite" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition font-medium">
              GPTSite (AI Agent)
            </Link>
            <Link href="/gptform#pricing" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition font-medium">
              Pricing
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/?auth=signin" className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2">
            Sign In
          </Link>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm gap-1.5 cursor-pointer"
            onClick={handleTryDemoClick}
            asChild
          >
            <Link href="/gptsite#demo">
              <Sparkles className="size-3.5" /> Try Live Demo
            </Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t bg-background p-4 space-y-3">
          <Link
            href="/gptsite#demo"
            onClick={(e) => {
              setMobileMenuOpen(false);
              handleTryDemoClick(e);
            }}
            className="block text-sm font-medium text-foreground py-1"
          >
            ✨ Live AI Demo
          </Link>
          <Link
            href="/gptsite"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1"
          >
            GPTSite™ AI Employee
          </Link>
          <Link
            href="/gptform"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1"
          >
            GPTForm™ Smart Forms
          </Link>
          <Link
            href="/templates"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1"
          >
            20,000+ Form Templates
          </Link>
          <Link
            href="/gptform#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1"
          >
            Pricing ($7/mo CRM add-on)
          </Link>
          <div className="pt-2 border-t flex flex-col gap-2">
            <Link
              href="/?auth=signin"
              className="text-center text-xs font-semibold text-muted-foreground hover:text-foreground py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleTryDemoClick(e);
              }}
              asChild
            >
              <Link href="/gptsite#demo">Launch Your AI Employee</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
