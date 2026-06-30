'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Bolt,
  Sparkles,
  Truck,
  Bug,
  Flame,
  Target,
  Calendar,
  MessageCircle,
  Receipt,
  Workflow,
  Check,
  ChevronRight,
  Play,
  ArrowRight,
  Zap,
  Shield,
  Star,
  Phone,
  Mail,
  Globe,
  Menu,
  X,
  Building2,
  Droplets,
  Leaf,
  Package,
  Home,
  Palette,
  Monitor,
  BarChart3,
  Bot,
  CreditCard,
  MessageSquare,
  ClipboardList,
  Route,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

// ─── Props ──────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onTryDemo?: () => void;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// ─── Data Constants ─────────────────────────────────────────────────────────

const stats = [
  { value: '2,500+', label: 'Businesses' },
  { value: '500K+', label: 'Jobs Completed' },
  { value: '4.9/5', label: 'Rating' },
  { value: '99.9%', label: 'Uptime' },
];

const targetIndustries: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Wrench, label: 'Plumbing', color: 'from-blue-400/20 to-blue-600/20 border-blue-400/30 text-blue-400' },
  { icon: Sparkles, label: 'Cleaning', color: 'from-cyan-400/20 to-cyan-600/20 border-cyan-400/30 text-cyan-400' },
  { icon: Truck, label: 'Packers & Movers', color: 'from-amber-400/20 to-amber-600/20 border-amber-400/30 text-amber-400' },
  { icon: Droplets, label: 'Window Cleaning', color: 'from-sky-400/20 to-sky-600/20 border-sky-400/30 text-sky-400' },
  { icon: Bug, label: 'Pest Control', color: 'from-orange-400/20 to-orange-600/20 border-orange-400/30 text-orange-400' },
  { icon: Flame, label: 'HVAC', color: 'from-red-400/20 to-red-600/20 border-red-400/30 text-red-400' },
  { icon: Bolt, label: 'Electrical', color: 'from-yellow-400/20 to-yellow-600/20 border-yellow-400/30 text-yellow-400' },
  { icon: Leaf, label: 'Landscaping', color: 'from-green-400/20 to-green-600/20 border-green-400/30 text-green-400' },
  { icon: Package, label: 'Courier', color: 'from-purple-400/20 to-purple-600/20 border-purple-400/30 text-purple-400' },
  { icon: Home, label: 'Home Repair', color: 'from-rose-400/20 to-rose-600/20 border-rose-400/30 text-rose-400' },
  { icon: Palette, label: 'Salon & Beauty', color: 'from-pink-400/20 to-pink-600/20 border-pink-400/30 text-pink-400' },
];

const howItWorksSteps = [
  {
    step: 1,
    title: 'Capture Leads',
    subtitle: 'WhatsApp + Web',
    description: 'Every lead from WhatsApp, web forms, phone calls, and walk-ins is auto-captured and organized in your pipeline instantly.',
    icon: Target,
  },
  {
    step: 2,
    title: 'Assign & Dispatch',
    subtitle: 'Smart Routing',
    description: 'Smart job assignment to the nearest available technician with real-time tracking, route optimization, and automated notifications.',
    icon: Route,
  },
  {
    step: 3,
    title: 'Get Paid Faster',
    subtitle: 'Invoicing + Payments',
    description: 'Auto-generate invoices, send WhatsApp payment reminders, and collect payments seamlessly — all in one flow.',
    icon: DollarSign,
  },
];

const coreFlowSteps = [
  { label: 'Lead', icon: Target },
  { label: 'Booking', icon: Calendar },
  { label: 'Dispatch', icon: Route },
  { label: 'Assignment', icon: ClipboardList },
  { label: 'Communication', icon: MessageSquare },
  { label: 'Invoice', icon: Receipt },
  { label: 'Payment', icon: CreditCard },
  { label: 'Review', icon: Star },
  { label: 'Analytics', icon: BarChart3 },
];

const features: { icon: LucideIcon; title: string; description: string; highlight?: string }[] = [
  {
    icon: MessageCircle,
    title: 'WhatsApp-First Operations',
    description: 'Run your entire business through WhatsApp. Capture leads, send quotes, dispatch jobs, collect payments — all on the channel your customers already use.',
    highlight: 'Most Popular',
  },
  {
    icon: Monitor,
    title: 'Smart Dispatch Center',
    description: 'AI-powered job assignment based on location, skills, and availability. Real-time tracking with route optimization for maximum efficiency.',
  },
  {
    icon: Bot,
    title: 'AI-Powered Receptionist',
    description: 'Never miss a lead again. Our AI receptionist answers calls and WhatsApp messages 24/7, books appointments, and qualifies leads automatically.',
    highlight: 'New',
  },
  {
    icon: Receipt,
    title: 'Automated Invoicing',
    description: 'Generate and send invoices the moment a job is done. Automated payment reminders via WhatsApp, partial payments, and instant reconciliation.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Live dashboards for revenue, job completion rates, team performance, and customer satisfaction. Make data-driven decisions in real time.',
  },
  {
    icon: Workflow,
    title: 'n8n Automation Builder',
    description: 'Build custom automations with our built-in n8n integration. Connect 400+ apps, create custom workflows, and eliminate repetitive tasks.',
    highlight: 'Powerful',
  },
];

interface PricingPlan {
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  description: string;
  icon: LucideIcon;
  features: string[];
  popular?: boolean;
  cta: string;
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: 'For solo entrepreneurs',
    icon: Zap,
    features: [
      '1 user',
      '100 jobs/month',
      'WhatsApp notifications',
      'Basic CRM',
      'Invoice generation',
      'Email support',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Growth',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'For growing teams',
    icon: Building2,
    features: [
      '5 users',
      '1,000 jobs/month',
      'Smart dispatch',
      'Advanced CRM & pipeline',
      'AI receptionist',
      'Priority support',
    ],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Pro',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    description: 'For scaling businesses',
    icon: Shield,
    features: [
      'Unlimited users',
      'Unlimited jobs',
      'n8n automation builder',
      'Custom workflows',
      'API access',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'For large organizations',
    icon: Globe,
    features: [
      'Everything in Pro',
      'White-label branding',
      'Custom integrations',
      'SLA guarantee',
      'Priority support',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
  },
];

const whatsappMarkets = [
  { country: 'India', users: '535M+', flag: '🇮🇳' },
  { country: 'Brazil', users: '147M+', flag: '🇧🇷' },
  { country: 'UK', users: '30M+', flag: '🇬🇧' },
  { country: 'Australia', users: '12M+', flag: '🇦🇺' },
  { country: 'Germany', users: '48M+', flag: '🇩🇪' },
  { country: 'Indonesia', users: '112M+', flag: '🇮🇩' },
];

const faqs = [
  {
    question: 'What is ServiceOS and who is it for?',
    answer: 'ServiceOS is an all-in-one operating system for field service businesses — plumbers, cleaners, HVAC technicians, pest control, movers, and more. It replaces the chaos of WhatsApp groups, Excel sheets, and paper forms with a single, streamlined platform.',
  },
  {
    question: 'How does the WhatsApp-first approach work?',
    answer: 'Your customers already use WhatsApp, so we meet them there. Leads come in via WhatsApp, quotes are sent on WhatsApp, job updates are pushed on WhatsApp, invoices are shared on WhatsApp, and payments are collected through WhatsApp. No app downloads required for your customers.',
  },
  {
    question: 'Can I try ServiceOS before committing?',
    answer: 'Absolutely! We offer a 14-day free trial with full access to all Growth plan features. No credit card required. Sign up with just your email and start managing your business smarter from day one.',
  },
  {
    question: 'How does the AI-Powered Receptionist work?',
    answer: 'Our AI receptionist answers incoming WhatsApp messages and phone calls 24/7. It can qualify leads, book appointments based on your availability, answer common questions about your services, and even send quotes — all without human intervention.',
  },
  {
    question: 'What is the n8n Automation Builder?',
    answer: 'n8n is a powerful workflow automation tool built right into ServiceOS. It lets you connect 400+ apps and services, create custom automations (like syncing to your accounting software, sending SMS reminders, or updating spreadsheets), and eliminate repetitive manual tasks.',
  },
  {
    question: 'Is my data secure and backed up?',
    answer: 'Yes. We use enterprise-grade encryption (AES-256) for all data at rest and in transit. Daily automated backups, 99.9% uptime SLA, and SOC 2 Type II compliance. Your business data is safer with us than on spreadsheets or paper.',
  },
];

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Integrations', href: '#' },
    { label: 'API Docs', href: '#' },
  ],
  company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '/contact-us' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Data Deletion', href: '/data-deletion' },
  ],
};

// ─── Animated Section Wrapper ───────────────────────────────────────────────

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar({ onGetStarted, onSignIn }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bolt className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">ServiceOS</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-zinc-400 hover:text-white transition-colors">
              FAQ
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignIn}
              className="text-zinc-400 hover:text-white hover:bg-white/10"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={onGetStarted}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold shadow-lg shadow-emerald-500/25"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-zinc-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="block text-sm text-zinc-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </a>
              <a href="#faq" className="block text-sm text-zinc-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </a>
              <Separator className="bg-white/10" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignIn}
                className="w-full text-zinc-400 hover:text-white justify-start"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={onGetStarted}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Hero Section ───────────────────────────────────────────────────────────

function HeroSection({ onGetStarted, onTryDemo }: { onGetStarted: () => void; onTryDemo?: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.1),transparent_50%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-28 pb-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <Badge
              variant="outline"
              className="mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 text-sm"
            >
              <Bolt className="w-3.5 h-3.5 mr-1.5" />
              The Operating System for Service Businesses
            </Badge>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.08] mb-6"
          >
            The Operating System
            <br />
            for{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
              Service Businesses
            </span>
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Replace WhatsApp chaos, Excel trackers, and paper forms with one powerful platform.
            From leads to invoices — run your entire field service business on ServiceOS.
          </motion.p>

          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold px-8 h-12 text-base shadow-lg shadow-emerald-500/25"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {onTryDemo && (
              <Button
                size="lg"
                onClick={onTryDemo}
                className="bg-white text-black font-semibold px-8 h-12 text-base shadow-lg shadow-white/20 hover:bg-zinc-100"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Try Live Demo
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white hover:border-white/40 px-8 h-12 text-base"
            >
              <Play className="w-4 h-4 mr-2" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Demo hint */}
          {onTryDemo && (
            <motion.div variants={staggerItem} className="mb-16">
              <p className="text-zinc-500 text-sm">
                🚀 Try the live demo — explore a real plumbing business with 2,000 customers, 300 bookings, and 500 invoices. No signup needed.
              </p>
            </motion.div>
          )}

          {/* Mock Dashboard Preview */}
          <motion.div
            variants={staggerItem}
            className="relative mx-auto max-w-4xl"
          >
            <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 backdrop-blur-sm shadow-2xl shadow-black/50 overflow-hidden">
              {/* Dashboard top bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-zinc-500 border border-white/5">
                    app.serviceos.cc/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 sm:p-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Active Jobs', value: '24', change: '+12%', up: true },
                    { label: 'Revenue Today', value: '$4,280', change: '+8%', up: true },
                    { label: 'Pending Leads', value: '18', change: '-3%', up: false },
                    { label: 'Completion Rate', value: '96%', change: '+2%', up: true },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg bg-white/5 border border-white/5 p-3 text-left">
                      <div className="text-xs text-zinc-500 mb-1">{stat.label}</div>
                      <div className="text-lg font-bold text-white">{stat.value}</div>
                      <div className={`text-xs ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>{stat.change}</div>
                    </div>
                  ))}
                </div>

                {/* Job list preview */}
                <div className="space-y-2">
                  <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Recent Jobs</div>
                  {[
                    { id: '#1042', client: 'Rajesh K.', service: 'Plumbing — Pipe Repair', status: 'In Progress', statusColor: 'bg-amber-500/20 text-amber-400' },
                    { id: '#1041', client: 'Sarah J.', service: 'Cleaning — Deep Clean', status: 'Dispatched', statusColor: 'bg-blue-500/20 text-blue-400' },
                    { id: '#1040', client: 'Amit S.', service: 'HVAC — AC Service', status: 'Completed', statusColor: 'bg-emerald-500/20 text-emerald-400' },
                  ].map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 font-mono">{job.id}</span>
                        <div>
                          <div className="text-sm text-white font-medium">{job.client}</div>
                          <div className="text-xs text-zinc-500">{job.service}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${job.statusColor}`}>{job.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glow effect behind dashboard */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl blur-xl -z-10" />
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

// ─── Target Industries Section ──────────────────────────────────────────────

function TargetIndustriesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="relative py-20 bg-black overflow-hidden">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <motion.div variants={staggerItem} className="text-center">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
              Built For Your Industry
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4">
              One platform,{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                every service
              </span>
            </h2>
            <p className="text-zinc-400 mt-4 max-w-lg mx-auto">
              From plumbing to pest control — ServiceOS adapts to how your business works.
            </p>
          </motion.div>
        </div>

        {/* Horizontal scroll of industry cards */}
        <motion.div variants={staggerItem}>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            style={{ scrollbarWidth: 'thin' }}
          >
            {/* Duplicate for seamless feel on larger screens */}
            <div className="flex gap-4 mx-auto flex-wrap justify-center">
              {targetIndustries.map((industry) => {
                const Icon = industry.icon;
                return (
                  <div
                    key={industry.label}
                    className={`group flex-shrink-0 snap-start w-36 sm:w-40 rounded-xl bg-gradient-to-br ${industry.color} border p-4 text-center hover:scale-105 transition-all duration-300 cursor-default`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${industry.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-white">{industry.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatedSection>
    </section>
  );
}

// ─── How It Works Section ───────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section className="relative py-24 bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_70%)]" />

      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4">
              Three steps to{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                operational excellence
              </span>
            </h2>
            <p className="text-zinc-400 mt-4 max-w-lg mx-auto">
              Get up and running in minutes. Our streamlined process replaces your messy WhatsApp groups and spreadsheets.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-px bg-gradient-to-r from-emerald-500/50 via-teal-500/20 to-emerald-500/50" />

            {howItWorksSteps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.step} variants={staggerItem} className="relative text-center">
                  {/* Numbered icon */}
                  <div className="relative inline-flex mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <Icon className="w-9 h-9 text-emerald-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      {step.step}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-emerald-400 text-sm font-medium mb-3">{step.subtitle}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}

// ─── Core Flow Section ──────────────────────────────────────────────────────

function CoreFlowSection() {
  return (
    <section className="relative py-24 bg-black">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
              Core Flow
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4">
              Your business,{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                one pipeline
              </span>
            </h2>
            <p className="text-zinc-400 mt-4 max-w-lg mx-auto">
              Every job flows through the same optimized pipeline — from first contact to analytics.
            </p>
          </motion.div>

          <motion.div variants={staggerItem}>
            {/* Desktop pipeline */}
            <div className="hidden lg:flex items-center justify-center gap-2">
              {coreFlowSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center">
                    <div className="group flex flex-col items-center">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/25 flex items-center justify-center mb-2 group-hover:border-emerald-400/50 group-hover:from-emerald-500/25 group-hover:to-teal-500/25 transition-all duration-300">
                        <Icon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">{step.label}</span>
                    </div>
                    {i < coreFlowSteps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-emerald-500/40 mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile pipeline - scrollable */}
            <div className="lg:hidden flex gap-3 overflow-x-auto pb-4 px-2 snap-x" style={{ scrollbarWidth: 'none' }}>
              {coreFlowSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center flex-shrink-0 snap-start">
                    <div className="group flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/25 flex items-center justify-center mb-2">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-xs text-zinc-400 font-medium">{step.label}</span>
                    </div>
                    {i < coreFlowSteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-emerald-500/40 ml-2 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

// ─── Features Grid Section ──────────────────────────────────────────────────

function FeaturesGridSection() {
  return (
    <section className="relative py-24 bg-zinc-950" id="features">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                run your business
              </span>
            </h2>
            <p className="text-zinc-400 mt-4 max-w-lg mx-auto">
              Powerful tools designed specifically for field service businesses. No bloat, just what matters.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={staggerItem}>
                  <Card className="group relative bg-zinc-900/50 border-white/5 hover:border-emerald-500/30 transition-all duration-500 h-full hover:shadow-lg hover:shadow-emerald-500/5 overflow-hidden">
                    {/* Hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <CardHeader className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors duration-300">
                          <Icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        {feature.highlight && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                            {feature.highlight}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                      <CardDescription className="text-zinc-400">{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}

// ─── Pricing Section ────────────────────────────────────────────────────────

function PricingSection({ onGetStarted }: { onGetStarted: () => void }) {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="relative py-24 bg-black" id="pricing">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_60%)]" />

      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={staggerItem} className="text-center mb-12">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4">
              Simple,{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Transparent Pricing
              </span>
            </h2>
            <p className="text-zinc-400 mt-4">
              Start free for 14 days. No credit card required.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm ${!yearly ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
              <button
                onClick={() => setYearly(!yearly)}
                className="relative w-14 h-7 rounded-full bg-zinc-800 border border-white/10 transition-colors duration-300 focus:outline-none"
                aria-label="Toggle yearly pricing"
              >
                <motion.div
                  className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  animate={{ x: yearly ? 28 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={`text-sm ${yearly ? 'text-white' : 'text-zinc-500'}`}>
                Yearly
                <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-0 text-xs">Save 17%</Badge>
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <motion.div key={plan.name} variants={staggerItem}>
                  <Card
                    className={`relative bg-zinc-900/50 border h-full flex flex-col transition-all duration-300 ${
                      plan.popular
                        ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-semibold border-0 px-3 shadow-lg shadow-emerald-500/30">
                          Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                        plan.popular
                          ? 'bg-emerald-500/20 border border-emerald-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}>
                        <Icon className={`w-5 h-5 ${plan.popular ? 'text-emerald-400' : 'text-zinc-400'}`} />
                      </div>
                      <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-zinc-500">{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="mb-6">
                        {plan.monthlyPrice !== null ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white">
                              ${yearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice}
                            </span>
                            <span className="text-zinc-500 text-sm">/mo</span>
                          </div>
                        ) : (
                          <div className="text-4xl font-bold text-white">Custom</div>
                        )}
                        {yearly && plan.yearlyPrice !== null && (
                          <p className="text-xs text-zinc-500 mt-1">
                            ${plan.yearlyPrice}/year billed annually
                          </p>
                        )}
                      </div>

                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-zinc-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Button
                        onClick={onGetStarted}
                        className={`w-full ${
                          plan.popular
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold shadow-lg shadow-emerald-500/20'
                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                        }`}
                      >
                        {plan.cta}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}

// ─── WhatsApp Differentiator Section ────────────────────────────────────────

function WhatsAppDifferentiatorSection() {
  return (
    <section className="relative py-24 bg-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_60%)]" />

      {/* Decorative WhatsApp-themed glow */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl" />

      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-6">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                WhatsApp-First
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                Your customers are on WhatsApp.
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Your business should be too.
                </span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                WhatsApp isn&apos;t just a messaging app — it&apos;s the primary communication channel for billions of people worldwide. ServiceOS is built WhatsApp-first because that&apos;s where your customers already are. No app downloads, no learning curve.
              </p>

              <div className="space-y-4">
                {[
                  { label: 'Capture leads directly from WhatsApp messages', icon: Target },
                  { label: 'Send quotes and get instant approvals', icon: Receipt },
                  { label: 'Automated job status updates and reminders', icon: Calendar },
                  { label: 'Collect payments via WhatsApp Pay links', icon: CreditCard },
                  { label: 'AI chatbot handles inquiries 24/7', icon: Bot },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ItemIcon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-zinc-300 text-sm leading-relaxed">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Right - Market Stats */}
            <motion.div variants={staggerItem}>
              <div className="rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 border border-white/5 p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-white mb-2">WhatsApp Users Worldwide</h3>
                <p className="text-zinc-500 text-sm mb-6">2B+ monthly active users — your next customer is already there.</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {whatsappMarkets.map((market) => (
                    <div
                      key={market.country}
                      className="rounded-xl bg-white/5 border border-white/5 p-4 text-center hover:border-emerald-500/30 transition-colors duration-300"
                    >
                      <div className="text-2xl mb-1">{market.flag}</div>
                      <div className="text-white font-semibold text-lg">{market.users}</div>
                      <div className="text-zinc-500 text-xs">{market.country}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium text-sm">WhatsApp-First Advantage</span>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Businesses using WhatsApp for customer communication see 2x higher engagement rates and 40% faster payment collection compared to email or SMS.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}

// ─── FAQ Section ────────────────────────────────────────────────────────────

function FAQSection() {
  return (
    <section className="relative py-24 bg-black" id="faq">
      <AnimatedSection>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-12">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4">
              Frequently Asked{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="bg-zinc-900/50 border-white/5">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border-white/5 px-6">
                      <AccordionTrigger className="text-white hover:text-emerald-400 hover:no-underline text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-zinc-400 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

// ─── Final CTA Section ──────────────────────────────────────────────────────

function FinalCTASection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative py-24 bg-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_60%)]" />

      {/* Decorative blurs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-teal-600/5 rounded-full blur-3xl" />

      <AnimatedSection>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div variants={staggerItem}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Your Business?
              </span>
            </h2>
          </motion.div>

          <motion.p variants={staggerItem} className="text-zinc-400 text-lg mb-8">
            Join 2,500+ service businesses already running on ServiceOS
          </motion.p>

          <motion.div variants={staggerItem}>
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold px-10 h-14 text-lg shadow-xl shadow-emerald-500/25"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          <motion.p variants={staggerItem} className="text-zinc-500 text-sm mt-4">
            No credit card required &bull; 14-day free trial &bull; Cancel anytime
          </motion.p>
        </div>
      </AnimatedSection>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo + Tagline */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                <Bolt className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ServiceOS</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
              The Operating System for service businesses. From leads to invoices, manage everything in one place.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors" aria-label="Twitter">
                <Globe className="w-4 h-4 text-zinc-400" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors" aria-label="LinkedIn">
                <Building2 className="w-4 h-4 text-zinc-400" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors" aria-label="Email">
                <Mail className="w-4 h-4 text-zinc-400" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors" aria-label="Phone">
                <Phone className="w-4 h-4 text-zinc-400" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="bg-white/5 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-600 text-xs">
            &copy; {new Date().getFullYear()} ServiceOS. All rights reserved.
          </p>
          <p className="text-zinc-600 text-xs">
            Built with ❤️ for service businesses worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function LandingPage({ onGetStarted, onSignIn, onTryDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-black">
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} />
      <HeroSection onGetStarted={onGetStarted} onTryDemo={onTryDemo} />
      <TargetIndustriesSection />
      <HowItWorksSection />
      <CoreFlowSection />
      <FeaturesGridSection />
      <PricingSection onGetStarted={onGetStarted} />
      <WhatsAppDifferentiatorSection />
      <FAQSection />
      <FinalCTASection onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}
