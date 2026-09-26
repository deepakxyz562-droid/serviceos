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
  Briefcase,
  Wrench,
  Home,
  CheckCircle2,
  MessageSquare,
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
                Smart Forms &amp; Service OS
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
              <DropdownMenuContent align="start" className="w-80 p-2 shadow-xl">
                <DropdownMenuItem asChild>
                  <Link href="/gptform" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                      <FileInput className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">GPTForm™ Smart Forms</p>
                      <p className="text-[11px] text-muted-foreground">AI form builder, live quote calculators &amp; 0% fee payments</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/chatbot" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">AI Chatbot Builder</p>
                      <p className="text-[11px] text-muted-foreground">Autonomous chat with live CRM dispatch, booking &amp; payments</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ai-agent" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                      <Bot className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">AI Employee &amp; Agent</p>
                      <p className="text-[11px] text-muted-foreground">Your website&apos;s 24/7 worker with 60s document training</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/conversational-forms" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                      <MessageSquare className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">Conversational Forms</p>
                      <p className="text-[11px] text-muted-foreground">1-question-at-a-time interactive forms with 3.8x completion</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/#ai-receptionist" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                      <Phone className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">24/7 AI Voice Receptionist</p>
                      <p className="text-[11px] text-muted-foreground">Answers phone calls, quotes prices &amp; books appointments</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/#crm-features" className="flex items-start gap-2.5 p-2 rounded-md cursor-pointer">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                      <Layers className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-foreground">Field Service OS</p>
                      <p className="text-[11px] text-muted-foreground">Dispatch, technician mobile app, invoicing &amp; CRM</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Templates Link */}
            <Link
              href="/templates"
              className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition font-medium"
            >
              Templates <span className="ml-1 text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded-full">20K+</span>
            </Link>

            {/* Solutions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
                  Solutions <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2 shadow-xl">
                <DropdownMenuItem asChild>
                  <Link href="/field-service-software" className="flex items-center gap-2.5 p-2 rounded-md cursor-pointer text-xs font-medium">
                    <Wrench className="size-4 text-emerald-600" />
                    <span>Contractors &amp; Field Service</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/cleaning-business-software" className="flex items-center gap-2.5 p-2 rounded-md cursor-pointer text-xs font-medium">
                    <Home className="size-4 text-teal-600" />
                    <span>Home &amp; Cleaning Services</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/plumbing-software" className="flex items-center gap-2.5 p-2 rounded-md cursor-pointer text-xs font-medium">
                    <Zap className="size-4 text-amber-600" />
                    <span>Plumbing &amp; HVAC Services</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/marketplace" className="flex items-center gap-2.5 p-2 rounded-md cursor-pointer text-xs font-medium">
                    <Briefcase className="size-4 text-purple-600" />
                    <span>Verified Pro Marketplace</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Pricing Link */}
            <Link
              href="/gptform#pricing"
              className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition font-medium"
            >
              Pricing
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 transition"
          >
            Sign In
          </Link>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm gap-1.5 px-4 h-9 rounded-lg cursor-pointer"
            asChild
          >
            <Link href="/register">
              Create Free Account <ArrowRight className="size-3.5" />
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
        <div className="sm:hidden border-t bg-background p-4 space-y-3 shadow-lg">
          <Link
            href="/gptform"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-foreground py-1"
          >
            ✨ GPTForm™ AI Smart Forms
          </Link>
          <Link
            href="/chatbot"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-foreground py-1"
          >
            🤖 AI Chatbot Builder
          </Link>
          <Link
            href="/ai-agent"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-foreground py-1"
          >
            🧠 AI Employee &amp; Agent
          </Link>
          <Link
            href="/conversational-forms"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold text-foreground py-1"
          >
            💬 Conversational Forms
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
            Pricing (Free Tier: 100 Free Forms/mo)
          </Link>
          <div className="pt-3 border-t flex flex-col gap-2">
            <Link
              href="/login"
              className="text-center text-xs font-semibold text-muted-foreground hover:text-foreground py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-semibold"
              onClick={() => setMobileMenuOpen(false)}
              asChild
            >
              <Link href="/register">Create Free Account</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
