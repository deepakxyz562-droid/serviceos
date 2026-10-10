'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Users,
  CalendarCheck,
  Wallet,
  Headphones,
  FileText,
  Smartphone,
  Store,
  HelpCircle,
  BookOpen,
  Code,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ModernNavbarProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onOpenSearch?: () => void;
}

export function ModernNavbar({
  onGetStarted,
  onSignIn,
  onOpenSearch,
}: ModernNavbarProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-200',
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
          : 'bg-white border-b border-slate-100'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left: Brand Logo + Business Badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="Fieseros Home"
          >
            <BrandMark size={32} className="group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Fieseros
            </span>
          </Link>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            Business
          </span>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium text-slate-600">
          {/* Product Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors outline-none cursor-pointer">
              <span>Product</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2 bg-white rounded-xl shadow-xl border border-slate-100">
              <DropdownMenuItem asChild>
                <Link href="/customer-crm" className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 mt-0.5">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">CRM &amp; Leads</p>
                    <p className="text-[11px] text-slate-500">Capture &amp; manage customer pipeline</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/scheduling-and-dispatch" className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 mt-0.5">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">Scheduling &amp; Dispatch</p>
                    <p className="text-[11px] text-slate-500">Live GPS map &amp; route optimization</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/invoicing-and-payments" className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 mt-0.5">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">Invoicing &amp; Payments</p>
                    <p className="text-[11px] text-slate-500">Digital payments with 0% fee</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ai-employee" className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 mt-0.5">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">AI Voice Receptionist</p>
                    <p className="text-[11px] text-slate-500">24/7 call answering &amp; booking</p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/gptform" className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">GPTForm™ Builder</p>
                    <p className="text-[11px] text-slate-500">Intelligent forms &amp; e-signatures</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Solutions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors outline-none cursor-pointer">
              <span>Solutions</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2 bg-white rounded-xl shadow-xl border border-slate-100">
              <div className="grid grid-cols-2 gap-1">
                {[
                  { name: 'Plumbing', href: '/plumbing-software' },
                  { name: 'HVAC', href: '/hvac-software' },
                  { name: 'Electrical', href: '/electrical-contractor-software' },
                  { name: 'Cleaning', href: '/cleaning-software' },
                  { name: 'Landscaping', href: '/landscaping-software' },
                  { name: 'Handyman', href: '/handyman-software' },
                  { name: 'Roofing', href: '/roofing-software' },
                  { name: 'Pet Care', href: '/pet-services-software' },
                ].map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className="text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/50 p-2 rounded-md cursor-pointer block"
                    >
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 px-2 pb-1">
                <Link
                  href="/solutions/home_services"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-between"
                >
                  <span>View All 25+ Industries</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Direct Marketplace Link */}
          <Link
            href="/marketplace"
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            Marketplace
          </Link>

          {/* Direct Pricing Link */}
          <a
            href="#pricing"
            onClick={(e) => scrollToSection('pricing', e)}
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Pricing
          </a>

          {/* Resources Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors outline-none cursor-pointer">
              <span>Resources</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 bg-white rounded-xl shadow-xl border border-slate-100">
              <DropdownMenuItem asChild>
                <Link href="/blog" className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <span>Blog &amp; Guides</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/invoice-generator" className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>Free Invoice Generator</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/tools" className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <HelpCircle className="h-4 w-4 text-emerald-600" />
                  <span>Free Trade Calculators</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/why-fieseros" className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Why Fieseros</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right: Search, Login, and CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Login
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Login
            </Link>
          )}

          <Button
            onClick={onGetStarted}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-10 px-4 sm:px-5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-xl">
          <div className="space-y-1">
            <Link
              href="/customer-crm"
              onClick={() => setMobileOpen(false)}
              className="block p-2 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              CRM &amp; Leads
            </Link>
            <Link
              href="/scheduling-and-dispatch"
              onClick={() => setMobileOpen(false)}
              className="block p-2 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Scheduling &amp; Dispatch
            </Link>
            <Link
              href="/invoicing-and-payments"
              onClick={() => setMobileOpen(false)}
              className="block p-2 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Invoicing &amp; Payments
            </Link>
            <Link
              href="/ai-employee"
              onClick={() => setMobileOpen(false)}
              className="block p-2 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              AI Voice Receptionist (24/7)
            </Link>
            <Link
              href="/marketplace"
              onClick={() => setMobileOpen(false)}
              className="block p-2 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
            >
              Verified Pro Marketplace
            </Link>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection('pricing', e)}
              className="block p-2 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Pricing
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Button
              onClick={() => {
                setMobileOpen(false);
                onGetStarted?.();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 rounded-lg"
            >
              Start Free Trial →
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
