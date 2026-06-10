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
  Users,
  Clock,
  TrendingUp,
  Award,
  HeadphonesIcon,
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
import { cn } from '@/lib/utils';

// ─── Props ──────────────────────────────────────────────────────────────────

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ─── Data Constants ─────────────────────────────────────────────────────────

const stats = [
  { value: '2,500+', label: 'Businesses', icon: Building2 },
  { value: '500K+', label: 'Jobs Completed', icon: ClipboardList },
  { value: '4.9/5', label: 'Rating', icon: Star },
  { value: '99.9%', label: 'Uptime', icon: Shield },
];

const targetIndustries: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Wrench, label: 'Plumbing', color: 'bg-blue-500/10 border-blue-400/20 text-blue-400' },
  { icon: Sparkles, label: 'Cleaning', color: 'bg-cyan-500/10 border-cyan-400/20 text-cyan-400' },
  { icon: Truck, label: 'Packers & Movers', color: 'bg-amber-500/10 border-amber-400/20 text-amber-400' },
  { icon: Droplets, label: 'Window Cleaning', color: 'bg-sky-500/10 border-sky-400/20 text-sky-400' },
  { icon: Bug, label: 'Pest Control', color: 'bg-orange-500/10 border-orange-400/20 text-orange-400' },
  { icon: Flame, label: 'HVAC', color: 'bg-red-500/10 border-red-400/20 text-red-400' },
  { icon: Bolt, label: 'Electrical', color: 'bg-yellow-500/10 border-yellow-400/20 text-yellow-400' },
  { icon: Leaf, label: 'Landscaping', color: 'bg-green-500/10 border-green-400/20 text-green-400' },
  { icon: Package, label: 'Courier', color: 'bg-purple-500/10 border-purple-400/20 text-purple-400' },
  { icon: Home, label: 'Home Repair', color: 'bg-rose-500/10 border-rose-400/20 text-rose-400' },
  { icon: Palette, label: 'Salon & Beauty', color: 'bg-pink-500/10 border-pink-400/20 text-pink-400' },
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
    title: 'WhatsApp-First CRM & Messaging',
    description: 'Run your entire business through WhatsApp. Capture leads, send quotes, dispatch jobs, collect payments — all on the channel your customers already use.',
    highlight: 'Most Popular',
  },
  {
    icon: Monitor,
    title: 'Job Management & Dispatch',
    description: 'AI-powered job assignment based on location, skills, and availability. Real-time tracking with route optimization for maximum efficiency.',
  },
  {
    icon: Bot,
    title: 'AI-Powered Automation',
    description: 'Never miss a lead again. Our AI receptionist answers calls and WhatsApp messages 24/7, books appointments, and qualifies leads automatically.',
    highlight: 'New',
  },
  {
    icon: Target,
    title: 'Lead Tracking & Sales Pipeline',
    description: 'Visual pipeline from first contact to won deal. Automated follow-ups, lead scoring, and conversion analytics to close more deals.',
  },
  {
    icon: Receipt,
    title: 'Invoicing & Billing',
    description: 'Generate and send invoices the moment a job is done. Automated payment reminders via WhatsApp, partial payments, and instant reconciliation.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Assign roles, track performance, manage schedules, and communicate with your field team in real-time. Built for teams of any size.',
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
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'AES-256 encryption, SOC 2 Type II compliance, 99.9% uptime SLA, and daily automated backups. Your business data is always safe.',
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
  { country: 'India', users: '535M+', flag: '\u{1F1EE}\u{1F1F3}' },
  { country: 'Brazil', users: '147M+', flag: '\u{1F1E7}\u{1F1F7}' },
  { country: 'UK', users: '30M+', flag: '\u{1F1EC}\u{1F1E7}' },
  { country: 'Australia', users: '12M+', flag: '\u{1F1E6}\u{1F1FA}' },
  { country: 'Germany', users: '48M+', flag: '\u{1F1E9}\u{1F1EA}' },
  { country: 'Indonesia', users: '112M+', flag: '\u{1F1EE}\u{1F1E9}' },
];

const faqs = [
  {
    question: 'What is ServiceOS and who is it for?',
    answer: 'ServiceOS is an all-in-one operating system for field service businesses \u2014 plumbers, cleaners, HVAC technicians, pest control, movers, and more. It replaces the chaos of WhatsApp groups, Excel sheets, and paper forms with a single, streamlined platform.',
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
    answer: 'Our AI receptionist answers incoming WhatsApp messages and phone calls 24/7. It can qualify leads, book appointments based on your availability, answer common questions about your services, and even send quotes \u2014 all without human intervention.',
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

const trustedCompanies = [
  'AquaFix Plumbing',
  'CleanPro Services',
  'CoolBreeze HVAC',
  'SwiftMove Co.',
  'GreenEdge Landscaping',
  'BrightSpark Electric',
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
    { label: 'Contact', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

// ─── Animated Section Wrapper ───────────────────────────────────────────────

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

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

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ badge, title, accentTitle, description }: {
  badge: string;
  title: string;
  accentTitle: string;
  description?: string;
}) {
  return (
    <motion.div variants={staggerItem} className="text-center mb-12 md:mb-16">
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3.5 py-1 text-xs font-medium tracking-wide uppercase mb-4"
      >
        {badge}
      </Badge>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-3 leading-tight">
        {title}{' '}
        <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          {accentTitle}
        </span>
      </h2>
      {description && (
        <p className="text-slate-400 mt-4 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
          {description}
        </p>
      )}
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
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/30'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Bolt className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">ServiceOS</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200">
              Features
            </a>
            <a href="#pricing" className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200">
              Pricing
            </a>
            <a href="#faq" className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors duration-200">
              FAQ
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignIn}
              className="text-slate-400 hover:text-white hover:bg-white/5 text-[13px] font-medium"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={onGetStarted}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold shadow-lg shadow-emerald-500/25 text-[13px] px-4 h-9 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors"
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-white/[0.06] overflow-hidden"
          >
            <div className="px-4 py-5 space-y-1">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-slate-300 hover:text-white py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Separator className="bg-white/[0.06] my-3" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignIn}
                className="w-full text-slate-400 hover:text-white justify-start text-sm"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={onGetStarted}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold text-sm mt-1"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Hero Section ───────────────────────────────────────────────────────────

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Multi-layer background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(20,184,166,0.08),transparent)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/[0.04] rounded-full blur-3xl"
      />
      <motion.div
        animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-teal-500/[0.04] rounded-full blur-3xl"
      />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <Badge
              variant="outline"
              className="mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 text-xs font-medium tracking-wide"
            >
              <Bolt className="w-3 h-3 mr-1.5" />
              The Operating System for Service Businesses
            </Badge>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold text-white tracking-tight leading-[1.1] mb-6"
          >
            Run your service
            <br className="hidden sm:block" />{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              business on autopilot
            </span>
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            From WhatsApp leads to paid invoices — manage your entire field service operation
            in one platform. Replace scattered tools with one powerful system.
          </motion.p>

          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-7 h-12 text-[15px] shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/10 text-white hover:bg-white/5 hover:text-white hover:border-white/20 px-7 h-12 text-[15px] backdrop-blur-sm transition-all duration-300"
            >
              <Play className="w-4 h-4 mr-2" />
              Watch Demo
            </Button>
          </motion.div>

          <motion.p variants={staggerItem} className="text-slate-500 text-xs mb-14 sm:mb-16">
            No credit card required &bull; 14-day free trial &bull; Cancel anytime
          </motion.p>

          {/* Dashboard Preview */}
          <motion.div
            variants={staggerItem}
            className="relative mx-auto max-w-4xl"
          >
            <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-slate-900/90 to-slate-950/95 backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white/[0.03] text-[11px] text-slate-500 border border-white/[0.04] font-mono">
                    app.serviceos.io/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Active Jobs', value: '24', change: '+12%', up: true },
                    { label: 'Revenue Today', value: '$4,280', change: '+8%', up: true },
                    { label: 'Pending Leads', value: '18', change: '-3%', up: false },
                    { label: 'Completion Rate', value: '96%', change: '+2%', up: true },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-left hover:border-white/[0.08] transition-colors duration-300">
                      <div className="text-[10px] sm:text-[11px] text-slate-500 mb-1 font-medium">{stat.label}</div>
                      <div className="text-base sm:text-xl font-bold text-white tracking-tight">{stat.value}</div>
                      <div className={cn('text-[10px] sm:text-[11px] font-medium', stat.up ? 'text-emerald-400' : 'text-red-400')}>
                        {stat.change}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500 mb-2 font-semibold uppercase tracking-widest">Recent Jobs</div>
                  {[
                    { id: '#1042', client: 'Rajesh K.', service: 'Plumbing \u2014 Pipe Repair', status: 'In Progress', statusColor: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
                    { id: '#1041', client: 'Sarah J.', service: 'Cleaning \u2014 Deep Clean', status: 'Dispatched', statusColor: 'bg-teal-500/15 text-teal-400 border border-teal-500/20' },
                    { id: '#1040', client: 'Amit S.', service: 'HVAC \u2014 AC Service', status: 'Completed', statusColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
                  ].map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.03] px-3 sm:px-4 py-3 hover:border-white/[0.06] transition-colors duration-300">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono">{job.id}</span>
                        <div>
                          <div className="text-xs sm:text-sm text-white font-medium">{job.client}</div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500">{job.service}</div>
                        </div>
                      </div>
                      <span className={cn('text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-medium', job.statusColor)}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/8 via-teal-500/8 to-emerald-500/8 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}

// ─── Social Proof / Stats Bar ───────────────────────────────────────────────

function SocialProofBar() {
  return (
    <section className="relative py-12 sm:py-16 bg-black border-y border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          {/* Trusted by */}
          <motion.div variants={staggerItem} className="text-center mb-8">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-6">
              Trusted by service businesses worldwide
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {trustedCompanies.map((company) => (
                <span key={company} className="text-sm text-slate-600 font-medium tracking-wide hover:text-slate-400 transition-colors duration-300 cursor-default">
                  {company}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={staggerItem}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mt-8 pt-8 border-t border-white/[0.04]">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center group">
                    <div className="inline-flex w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mb-3 group-hover:bg-emerald-500/15 transition-colors duration-300">
                      <Icon className="w-4.5 h-4.5 text-emerald-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── Target Industries Section ──────────────────────────────────────────────

function TargetIndustriesSection() {
  return (
    <section className="relative py-16 sm:py-20 bg-slate-950 overflow-hidden">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Industries"
            title="One platform,"
            accentTitle="every service"
            description="From plumbing to pest control \u2014 ServiceOS adapts to how your business works."
          />

          <motion.div variants={staggerItem}>
            <div className="flex flex-wrap justify-center gap-3">
              {targetIndustries.map((industry) => {
                const Icon = industry.icon;
                return (
                  <div
                    key={industry.label}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-xl border px-4 py-2.5 hover:scale-[1.03] transition-all duration-300 cursor-default',
                      industry.color
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-white/90">{industry.label}</span>
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

// ─── How It Works Section ───────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section className="relative py-20 sm:py-24 bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.04),transparent_70%)]" />

      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionHeader
            badge="How It Works"
            title="Three steps to"
            accentTitle="operational excellence"
            description="Get up and running in minutes. Our streamlined process replaces your messy WhatsApp groups and spreadsheets."
          />

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-emerald-500/30 via-teal-500/15 to-emerald-500/30" />

            {howItWorksSteps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.step} variants={staggerItem} className="relative">
                  <Card className="group relative bg-slate-900/40 border-white/[0.06] hover:border-emerald-500/20 transition-all duration-500 h-full text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="relative z-10 pt-8 pb-4">
                      <div className="relative inline-flex mb-5 mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-600/15 border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-400/30 transition-colors duration-300">
                          <Icon className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          {step.step}
                        </div>
                      </div>
                      <CardTitle className="text-white text-lg mb-1">{step.title}</CardTitle>
                      <p className="text-emerald-400 text-xs font-semibold tracking-wide uppercase">{step.subtitle}</p>
                    </CardHeader>
                    <CardContent className="relative z-10 pb-8">
                      <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                    </CardContent>
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

// ─── Core Flow Section ──────────────────────────────────────────────────────

function CoreFlowSection() {
  return (
    <section className="relative py-20 sm:py-24 bg-slate-950">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="Core Flow"
            title="Your business,"
            accentTitle="one pipeline"
            description="Every job flows through the same optimized pipeline \u2014 from first contact to analytics."
          />

          <motion.div variants={staggerItem}>
            {/* Desktop pipeline */}
            <div className="hidden lg:flex items-center justify-center gap-1.5">
              {coreFlowSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center">
                    <div className="group flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center mb-2.5 group-hover:border-emerald-400/30 group-hover:bg-emerald-500/[0.12] transition-all duration-300">
                        <Icon className="w-5.5 h-5.5 text-emerald-400" />
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">{step.label}</span>
                    </div>
                    {i < coreFlowSteps.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-500/25 mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile pipeline */}
            <div className="lg:hidden flex gap-3 overflow-x-auto pb-4 px-2 snap-x" style={{ scrollbarWidth: 'none' }}>
              {coreFlowSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center flex-shrink-0 snap-start">
                    <div className="group flex flex-col items-center">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center mb-2">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">{step.label}</span>
                    </div>
                    {i < coreFlowSteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-emerald-500/25 ml-2 flex-shrink-0" />
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
    <section className="relative py-20 sm:py-24 bg-black" id="features">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_50%)]" />

      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <SectionHeader
            badge="Features"
            title="Everything you need to"
            accentTitle="run your business"
            description="Powerful tools designed specifically for field service businesses. No bloat, just what matters."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              const isHero = idx === 0;
              return (
                <motion.div
                  key={feature.title}
                  variants={staggerItem}
                  className={cn(
                    isHero && 'sm:col-span-2 lg:col-span-1'
                  )}
                >
                  <Card className="group relative bg-slate-900/30 border-white/[0.06] hover:border-emerald-500/20 transition-all duration-500 h-full overflow-hidden hover:shadow-lg hover:shadow-emerald-500/[0.03]">
                    {/* Hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <CardHeader className="relative z-10 p-5 sm:p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/[0.12] group-hover:border-emerald-500/25 transition-all duration-300">
                          <Icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        {feature.highlight && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] font-semibold tracking-wide uppercase px-2.5">
                            {feature.highlight}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-white text-[15px] sm:text-base font-semibold mb-2">{feature.title}</CardTitle>
                      <CardDescription className="text-slate-400 text-sm leading-relaxed">{feature.description}</CardDescription>
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
    <section className="relative py-20 sm:py-24 bg-slate-950" id="pricing">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_60%)]" />

      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={staggerItem} className="text-center mb-10 md:mb-14">
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3.5 py-1 text-xs font-medium tracking-wide uppercase mb-4"
            >
              Pricing
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-3">
              Simple,{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Transparent Pricing
              </span>
            </h2>
            <p className="text-slate-400 mt-4 text-sm sm:text-base">
              Start free for 14 days. No credit card required.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={cn('text-sm font-medium transition-colors', !yearly ? 'text-white' : 'text-slate-500')}>
                Monthly
              </span>
              <button
                onClick={() => setYearly(!yearly)}
                className="relative w-12 h-6 rounded-full bg-slate-800 border border-white/10 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                aria-label="Toggle yearly pricing"
              >
                <motion.div
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  animate={{ x: yearly ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={cn('text-sm font-medium transition-colors', yearly ? 'text-white' : 'text-slate-500')}>
                Yearly
                <Badge className="ml-2 bg-emerald-500/15 text-emerald-400 border-0 text-[10px] font-semibold">Save 17%</Badge>
              </span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {pricingPlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <motion.div key={plan.name} variants={staggerItem}>
                  <Card
                    className={cn(
                      'relative bg-slate-900/40 border h-full flex flex-col transition-all duration-300',
                      plan.popular
                        ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/[0.05]'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold border-0 px-3 text-[10px] shadow-lg shadow-emerald-500/30">
                          Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-2 pt-6 px-5">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center mb-3',
                        plan.popular
                          ? 'bg-emerald-500/15 border border-emerald-500/25'
                          : 'bg-white/[0.04] border border-white/[0.08]'
                      )}>
                        <Icon className={cn('w-4.5 h-4.5', plan.popular ? 'text-emerald-400' : 'text-slate-400')} />
                      </div>
                      <CardTitle className="text-white text-base font-semibold">{plan.name}</CardTitle>
                      <CardDescription className="text-slate-500 text-xs">{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 px-5">
                      <div className="mb-5">
                        {plan.monthlyPrice !== null ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-white tracking-tight">
                              ${yearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice}
                            </span>
                            <span className="text-slate-500 text-sm">/mo</span>
                          </div>
                        ) : (
                          <div className="text-3xl font-extrabold text-white tracking-tight">Custom</div>
                        )}
                        {yearly && plan.yearlyPrice !== null && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            ${plan.yearlyPrice}/year billed annually
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2.5">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-slate-300 text-[13px]">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="px-5 pb-5">
                      <Button
                        onClick={onGetStarted}
                        className={cn(
                          'w-full h-10 text-[13px] font-semibold transition-all duration-300',
                          plan.popular
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-white/[0.15]'
                        )}
                      >
                        {plan.cta}
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
    <section className="relative py-20 sm:py-24 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_60%)]" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/[0.04] rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/[0.03] rounded-full blur-3xl" />

      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Content */}
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3.5 py-1 text-xs font-medium tracking-wide uppercase mb-6">
                <MessageCircle className="w-3 h-3 mr-1.5" />
                WhatsApp-First
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
                Your customers are on WhatsApp.
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Your business should be too.
                </span>
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
                WhatsApp isn&apos;t just a messaging app &mdash; it&apos;s the primary communication channel for billions of people worldwide. ServiceOS is built WhatsApp-first because that&apos;s where your customers already are. No app downloads, no learning curve.
              </p>

              <div className="space-y-3.5">
                {[
                  { label: 'Capture leads directly from WhatsApp messages', icon: Target },
                  { label: 'Send quotes and get instant approvals', icon: Receipt },
                  { label: 'Automated job status updates and reminders', icon: Calendar },
                  { label: 'Collect payments via WhatsApp Pay links', icon: CreditCard },
                  { label: 'AI chatbot handles inquiries 24/7', icon: Bot },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3 group">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500/[0.12] transition-colors duration-300">
                        <ItemIcon className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-slate-300 text-sm leading-relaxed">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Market Stats */}
            <motion.div variants={staggerItem}>
              <div className="rounded-2xl bg-slate-900/50 border border-white/[0.06] p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-white mb-1">WhatsApp Users Worldwide</h3>
                <p className="text-slate-500 text-sm mb-6">2B+ monthly active users &mdash; your next customer is already there.</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {whatsappMarkets.map((market) => (
                    <div
                      key={market.country}
                      className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3.5 text-center hover:border-emerald-500/20 transition-colors duration-300"
                    >
                      <div className="text-xl mb-1">{market.flag}</div>
                      <div className="text-white font-bold text-base tracking-tight">{market.users}</div>
                      <div className="text-slate-500 text-[11px] font-medium">{market.country}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold text-xs tracking-wide uppercase">WhatsApp-First Advantage</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
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
    <section className="relative py-20 sm:py-24 bg-slate-950" id="faq">
      <AnimatedSection>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="FAQ"
            title="Frequently Asked"
            accentTitle="Questions"
          />

          <motion.div variants={staggerItem}>
            <Card className="bg-slate-900/30 border-white/[0.06] overflow-hidden">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border-white/[0.06] px-5 sm:px-6">
                      <AccordionTrigger className="text-white hover:text-emerald-400 hover:no-underline text-left text-sm sm:text-base font-medium py-4 transition-colors duration-200">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-400 text-sm leading-relaxed pb-4">
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
    <section className="relative py-20 sm:py-28 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1),transparent_60%)]" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-emerald-500/[0.06] rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 bg-teal-600/[0.04] rounded-full blur-3xl" />

      <AnimatedSection>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div variants={staggerItem}>
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3.5 py-1 text-xs font-medium tracking-wide uppercase mb-6"
            >
              Get Started Today
            </Badge>
          </motion.div>

          <motion.h2
            variants={staggerItem}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight"
          >
            Ready to Transform{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Your Business?
            </span>
          </motion.h2>

          <motion.p variants={staggerItem} className="text-slate-400 text-base sm:text-lg mb-8 leading-relaxed">
            Join 2,500+ service businesses already running on ServiceOS
          </motion.p>

          <motion.div variants={staggerItem}>
            <Button
              size="lg"
              onClick={onGetStarted}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-10 h-14 text-base shadow-xl shadow-emerald-500/25 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/35 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          <motion.p variants={staggerItem} className="text-slate-500 text-xs mt-4">
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
    <footer className="bg-slate-950 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo + Tagline */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bolt className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">ServiceOS</span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              The Operating System for service businesses. From leads to invoices, manage everything in one place.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-2 mt-5">
              {[
                { icon: Globe, label: 'Website' },
                { icon: Building2, label: 'LinkedIn' },
                { icon: Mail, label: 'Email' },
                { icon: Phone, label: 'Phone' },
              ].map(({ icon: SocialIcon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-colors duration-200"
                  aria-label={label}
                >
                  <SocialIcon className="w-3.5 h-3.5 text-slate-400" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase mb-4">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-slate-500 text-sm hover:text-slate-300 transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase mb-4">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-slate-500 text-sm hover:text-slate-300 transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-slate-500 text-sm hover:text-slate-300 transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="bg-white/[0.04] my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-xs">
            &copy; {new Date().getFullYear()} ServiceOS. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs">
            Built for service businesses worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} />
      <main className="flex-1">
        <HeroSection onGetStarted={onGetStarted} />
        <SocialProofBar />
        <TargetIndustriesSection />
        <HowItWorksSection />
        <CoreFlowSection />
        <FeaturesGridSection />
        <WhatsAppDifferentiatorSection />
        <PricingSection onGetStarted={onGetStarted} />
        <FAQSection />
        <FinalCTASection onGetStarted={onGetStarted} />
      </main>
      <Footer />
    </div>
  );
}
