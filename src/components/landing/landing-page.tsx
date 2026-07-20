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
  ChevronDown,
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
  Briefcase,
  HardHat,
  UserCheck,
  Clock,
  TrendingUp,
  Send,
  Smartphone,
  MessageSquareText,
  FileText,
  CalendarClock,
  MapPin,
  Wallet,
  Inbox,
  Megaphone,
  Headphones,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
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

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onTryDemo?: () => void;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const stats = [
  { value: '2,500+', label: 'Businesses' },
  { value: '500K+', label: 'Jobs Completed' },
  { value: '4.9/5', label: 'Rating' },
  { value: '99.9%', label: 'Uptime' },
];

const channelPills = [
  { icon: Mail, label: 'Email' },
  { icon: MessageSquareText, label: 'SMS' },
  { icon: MessageCircle, label: 'WhatsApp', optional: true },
];

const targetIndustries: { icon: LucideIcon; label: string; tint: string }[] = [
  { icon: Wrench, label: 'Plumbing', tint: 'bg-sky-50 text-sky-600 border-sky-100' },
  { icon: Sparkles, label: 'Cleaning', tint: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  { icon: Truck, label: 'Packers & Movers', tint: 'bg-amber-50 text-amber-600 border-amber-100' },
  { icon: Droplets, label: 'Window Cleaning', tint: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: Bug, label: 'Pest Control', tint: 'bg-orange-50 text-orange-600 border-orange-100' },
  { icon: Flame, label: 'HVAC', tint: 'bg-red-50 text-red-600 border-red-100' },
  { icon: Bolt, label: 'Electrical', tint: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  { icon: Leaf, label: 'Landscaping', tint: 'bg-green-50 text-green-600 border-green-100' },
  { icon: Package, label: 'Courier', tint: 'bg-purple-50 text-purple-600 border-purple-100' },
  { icon: Home, label: 'Home Repair', tint: 'bg-rose-50 text-rose-600 border-rose-100' },
  { icon: Palette, label: 'Salon & Beauty', tint: 'bg-pink-50 text-pink-600 border-pink-100' },
];

const problemCards = [
  {
    icon: Inbox,
    title: 'Scattered leads everywhere',
    description: 'Inquiries land in WhatsApp groups, missed calls, web forms, and walk-ins — with no single source of truth. Leads slip through the cracks daily.',
    image: '/images/landing/problem-leads.png',
  },
  {
    icon: ClipboardList,
    title: 'Paper & Excel chaos',
    description: 'Job sheets on clipboards, schedules on whiteboards, customer data in spreadsheets. Nothing connects. Dispatching is guesswork.',
    image: '/images/landing/problem-paperwork.png',
  },
  {
    icon: Wallet,
    title: 'Slow, manual invoicing',
    description: 'Writing invoices by hand, chasing payments for weeks, no visibility into cash flow. You finish the job but wait weeks to get paid.',
    image: '/images/landing/problem-invoices.png',
  },
];

const howItWorksSteps = [
  {
    step: 1,
    title: 'Capture Every Lead',
    subtitle: 'Email · SMS · Web Forms · Calls',
    description: 'Every inquiry — from email, SMS, web form, or phone call — auto-lands in one unified inbox. Nothing is missed, nothing is duplicated.',
    icon: Target,
    image: '/images/landing/step-capture.png',
  },
  {
    step: 2,
    title: 'Dispatch & Track Jobs',
    subtitle: 'Smart Routing · Real-time',
    description: 'Assign jobs to the nearest available technician with route optimization, live status tracking, and automated customer notifications.',
    icon: Route,
    image: '/images/landing/step-dispatch.png',
  },
  {
    step: 3,
    title: 'Get Paid Faster',
    subtitle: 'Invoicing · Payments · Reminders',
    description: 'Auto-generate invoices the moment a job completes. Send reminders via Email & SMS, collect payments online, and reconcile instantly.',
    icon: DollarSign,
    image: '/images/landing/step-invoice.png',
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

const featurePillars = [
  {
    icon: Target,
    title: 'CRM & Leads',
    tagline: 'Never lose a lead again',
    image: '/images/landing/pillar-crm.png',
    features: ['Leads pipeline & qualification', 'Customer 360° view', 'Sales pipeline kanban', 'Smart segments & tags', 'Lead discovery & scoring', 'Drag-and-drop form builder'],
  },
  {
    icon: Calendar,
    title: 'Operations & Dispatch',
    tagline: 'Run jobs like clockwork',
    image: '/images/landing/pillar-operations.png',
    features: ['Bookings & calendar', 'Smart dispatch center', 'Route optimization', 'Employee timesheets', 'Service catalog & checklists', 'Job status tracking'],
  },
  {
    icon: Inbox,
    title: 'Omnichannel Communication',
    tagline: 'Reach customers where they are',
    image: '/images/landing/pillar-communication.png',
    features: ['Unified inbox (Email + SMS)', 'Email campaigns', 'SMS broadcasts', 'Marketing templates', 'Omnichannel journeys', 'WhatsApp (optional add-on)'],
  },
  {
    icon: Wallet,
    title: 'Finance & Automation',
    tagline: 'Get paid faster, work less',
    image: '/images/landing/pillar-finance.png',
    features: ['Quotes & estimates', 'Invoices & payments', 'Expenses tracking', 'n8n workflow builder', 'AI Assistant & automations', 'Custom workflow triggers'],
  },
];

const aiHighlights = [
  { icon: Bot, title: 'AI Assistant', description: 'Drafts replies, summarizes threads, suggests next-best-actions across your inbox.' },
  { icon: Megaphone, title: 'AI Campaign Generator', description: 'Generates email & SMS campaign copy, audience segments, and send-time suggestions.' },
  { icon: MessageSquare, title: 'Chatbot Builder', description: 'Build custom chatbots for your website and inbox to qualify leads and answer FAQs 24/7.' },
  { icon: Route, title: 'Smart Routing', description: 'Auto-assigns jobs to the best technician by location, skills, and availability.' },
];

const primaryChannels = [
  {
    icon: Mail,
    title: 'Email',
    setup: 'Instant',
    approval: 'None required',
    bestFor: 'Quotes, invoices, receipts, newsletters',
    description: 'Send branded emails from day one. Built-in templates for quotes, invoices, receipts, and campaigns.',
    image: '/images/landing/channel-email.png',
    primary: true,
  },
  {
    icon: MessageSquareText,
    title: 'SMS',
    setup: 'Instant',
    approval: 'None required',
    bestFor: 'Reminders, confirmations, urgent updates',
    description: 'Reach customers instantly with SMS reminders, booking confirmations, and payment links.',
    image: '/images/landing/channel-sms.png',
    primary: true,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    setup: '1–4 weeks',
    approval: 'Meta Business Verification',
    bestFor: 'High-engagement markets (IN, BR, ID)',
    description: 'Add WhatsApp Business API when ready. We guide you through Meta approval step-by-step.',
    image: '/images/landing/channel-whatsapp.png',
    primary: false,
  },
];

const personas = [
  {
    icon: Briefcase,
    title: 'Business Owner',
    image: '/images/landing/persona-owner.png',
    points: ['Real-time revenue & KPI dashboards', 'Full visibility into operations', 'Automated reports in your inbox'],
  },
  {
    icon: Headphones,
    title: 'Dispatcher',
    image: '/images/landing/persona-dispatcher.png',
    points: ['Smart dispatch board with map view', 'Drag-and-drop job assignment', 'Real-time technician tracking'],
  },
  {
    icon: HardHat,
    title: 'Field Technician',
    image: '/images/landing/persona-technician.png',
    points: ['Mobile app with job details & checklists', 'Photo capture & customer signatures', 'Turn-by-turn navigation'],
  },
  {
    icon: UserCheck,
    title: 'Customer',
    image: '/images/landing/persona-customer.png',
    points: ['Self-service booking portal', 'Email & SMS reminders', 'One-tap invoice payment'],
  },
];

const roiStats = [
  { value: 8, suffix: ' hrs', label: 'Saved per week', icon: Clock },
  { value: 2, suffix: '×', label: 'Faster payment collection', icon: Wallet },
  { value: 35, suffix: '%', label: 'Fewer no-shows', icon: CalendarClock },
  { value: 27, suffix: '%', label: 'More repeat business', icon: TrendingUp },
];

const testimonials = [
  {
    name: 'Rajesh Kumar',
    business: 'Kumar Plumbing Co.',
    industry: 'Plumbing · Chennai',
    quote: 'Before ServiceOS, I was losing leads in WhatsApp groups every week. Now every inquiry lands in one inbox, and I get paid the same day the job finishes. Email and SMS work right away — no approvals needed.',
    avatar: '/images/landing/testimonial-1.png',
    metric: '+42% revenue in 3 months',
  },
  {
    name: 'Sarah Mitchell',
    business: 'Sparkle Clean Services',
    industry: 'Cleaning · Manchester',
    quote: 'Every lead from my website and SMS lands in one inbox now — no more missed inquiries. My customers love getting SMS reminders before appointments. I added WhatsApp last month and the team walked me through Meta approval in days.',
    avatar: '/images/landing/testimonial-2.png',
    metric: '−35% no-show rate',
  },
  {
    name: 'Daniel Okafor',
    business: 'Okafor HVAC Solutions',
    industry: 'HVAC · Lagos',
    quote: 'Dispatching used to be a whiteboard and phone calls. Now my techs get jobs on their phones with route maps and checklists. Invoices go out automatically and payments hit my account in days, not weeks.',
    avatar: '/images/landing/testimonial-3.png',
    metric: '2× faster payments',
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
    features: ['1 user', '100 jobs/month', 'Email & SMS notifications', 'Basic CRM & leads', 'Invoice generation', 'Email support'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Growth',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'For growing teams',
    icon: Building2,
    features: ['5 users', '1,000 jobs/month', 'Email + SMS included', 'Smart dispatch & routing', 'Advanced CRM & pipeline', 'AI Assistant', 'Priority support', 'WhatsApp add-on available'],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Pro',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    description: 'For scaling businesses',
    icon: Shield,
    features: ['Unlimited users', 'Unlimited jobs', 'Email + SMS included', 'n8n automation builder', 'Custom workflows', 'API access', 'Dedicated support', 'WhatsApp add-on available'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'For large organizations',
    icon: Globe,
    features: ['Everything in Pro', 'White-label branding', 'Custom integrations', 'SLA guarantee', 'Dedicated account manager', 'Onboarding & training'],
    cta: 'Contact Sales',
  },
];

const faqs = [
  {
    question: 'Do I need WhatsApp to use ServiceOS?',
    answer: 'No. ServiceOS works out of the box with Email and SMS — no approvals, no waiting. You can capture leads, send quotes, dispatch jobs, invoice customers, and collect payments entirely over Email and SMS. WhatsApp Business API is available as an optional add-on on Growth and Pro plans if you operate in high-engagement markets like India, Brazil, or Indonesia.',
  },
  {
    question: 'How long does it take to get set up?',
    answer: 'Most businesses are up and running in under an hour. Sign up with your email, import your customer list (CSV upload), set up your services and pricing, and start capturing leads immediately. Email and SMS work from minute one. WhatsApp, if you choose to add it, takes 1–4 weeks for Meta Business Verification — we guide you through every step.',
  },
  {
    question: 'Can I import my existing customers?',
    answer: 'Absolutely. Use our CSV import tool to bring in customers, contacts, and job history from spreadsheets, your old CRM, or accounting software. We also support direct integrations with popular tools via our n8n automation builder.',
  },
  {
    question: 'What can I automate with the n8n builder?',
    answer: 'Our built-in n8n automation builder connects ServiceOS to 400+ apps and services. Automate tasks like syncing invoices to your accounting software, sending SMS reminders before appointments, updating spreadsheets when jobs complete, and triggering follow-up campaigns after payments — all without writing code. Pro and Enterprise plans include full n8n access with custom workflow triggers.',
  },
  {
    question: 'Do you charge per message or per call?',
    answer: 'Email and SMS are included in every plan with generous monthly limits (1,000 emails + 1,000 SMS on Growth, unlimited on Pro). WhatsApp messages are billed at cost (Meta\'s rates) and only on plans where the add-on is enabled. No hidden fees, no per-seat charges, no surprises.'
  },
  {
    question: 'Is my data secure and backed up?',
    answer: 'Yes. We use enterprise-grade AES-256 encryption for all data at rest and in transit. Daily automated backups, 99.9% uptime SLA, and SOC 2 Type II compliance. Your business data is safer with us than on spreadsheets or paper. You can export or delete your data anytime — see our Data Deletion policy.',
  },
  {
    question: 'Can I try ServiceOS before committing?',
    answer: 'Of course. We offer a 14-day free trial with full access to all Growth plan features. No credit card required. You can also explore our Live Demo — a real plumbing business with 2,000 customers, 300 bookings, and 500 invoices — no signup needed.',
  },
  {
    question: 'What happens after my free trial ends?',
    answer: 'If you don\'t subscribe, your account is paused (not deleted) for 30 days so you can pick up where you left off. After 30 days of inactivity, your data is permanently deleted per our Data Deletion policy. Subscribe at any time during the pause to resume instantly.',
  },
];

// SEO cornerstone industry pages — linked from navbar dropdown + footer.
const seoIndustries = [
  { label: 'Plumbing Software', href: '/plumbing-software' },
  { label: 'HVAC Software', href: '/hvac-software' },
  { label: 'Cleaning Business Software', href: '/cleaning-business-software' },
  { label: 'Electrical Contractor Software', href: '/electrical-contractor-software' },
  { label: 'Landscaping Software', href: '/landscaping-software' },
  { label: 'Lawn Care Software', href: '/lawn-care-software' },
  { label: 'Painting Software', href: '/painting-software' },
  { label: 'Handyman Software', href: '/handyman-software' },
  { label: 'Tree Care Software', href: '/tree-care-software' },
  { label: 'Snow Removal Software', href: '/snow-removal-software' },
  { label: 'Pest Control Software', href: '/pest-control-software' },
  { label: 'Roofing Software', href: '/roofing-software' },
  { label: 'Pool Service Software', href: '/pool-service-software' },
  { label: 'Window Cleaning Software', href: '/window-cleaning-software' },
  { label: 'Concrete Software', href: '/concrete-software' },
  { label: 'Garage Door Software', href: '/garage-door-software' },
  { label: 'Solar Software', href: '/solar-software' },
  { label: 'Pet Services Software', href: '/pet-services-software' },
];

const seoCompare = [
  { label: 'ServiceOS vs Jobber', href: '/serviceos-vs-jobber' },
  { label: 'Jobber Alternatives', href: '/jobber-alternatives' },
  { label: 'Housecall Pro Alternatives', href: '/housecall-pro-alternatives' },
  { label: 'ServiceTitan Alternatives', href: '/servicetitan-alternatives' },
  { label: 'Best Field Service Software', href: '/best-field-service-software' },
];

const seoFeatures = [
  { label: 'Field Service Software', href: '/field-service-software' },
  { label: 'Scheduling & Dispatch', href: '/scheduling-and-dispatch' },
  { label: 'Invoicing & Payments', href: '/invoicing-and-payments' },
  { label: 'Customer CRM', href: '/customer-crm' },
  { label: 'Technician App', href: '/technician-app' },
  { label: 'Automations', href: '/automations' },
];

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Channels', href: '#channels' },
    { label: 'Live Demo', href: '#' },
  ],
  industries: seoIndustries,
  compare: seoCompare,
  resources: [
    { label: 'Free Invoice Generator', href: '/invoice-generator' },
    { label: 'Contact Us', href: '/contact-us' },
    ...seoFeatures,
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Data Deletion', href: '/data-deletion' },
  ],
};

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  );
}

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top,0px)] ${
        scrolled ? 'bg-white/85 backdrop-blur-xl border-b border-border shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-sm bg-emerald-600 shadow-emerald-500/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">ServiceOS</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Features</a>
            <div className="relative group">
              <button type="button" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Industries <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div className="absolute left-0 top-full pt-3 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 z-50">
                <div className="w-72 rounded-xl border border-border bg-white shadow-lg p-2 grid grid-cols-1 gap-0.5 max-h-[70vh] overflow-y-auto">
                  {seoIndustries.map((i) => (
                    <a key={i.href} href={i.href} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">{i.label}</a>
                  ))}
                  <a href="/field-service-software" className="px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-accent rounded-md transition-colors mt-1 border-t border-border pt-2">All field service software →</a>
                </div>
              </div>
            </div>
            <div className="relative group">
              <button type="button" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Compare <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div className="absolute left-0 top-full pt-3 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 z-50">
                <div className="w-60 rounded-xl border border-border bg-white shadow-lg p-2 grid grid-cols-1 gap-0.5">
                  {seoCompare.map((i) => (
                    <a key={i.href} href={i.href} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">{i.label}</a>
                  ))}
                </div>
              </div>
            </div>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onSignIn} className="text-muted-foreground hover:text-foreground hover:bg-muted">Sign In</Button>
            <Button size="sm" onClick={onGetStarted} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
              Get Started<ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-foreground p-2" aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#faq" className="block text-sm text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">Industries</p>
                <a href="/plumbing-software" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>Plumbing</a>
                <a href="/hvac-software" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>HVAC</a>
                <a href="/cleaning-business-software" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>Cleaning</a>
                <a href="/electrical-contractor-software" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>Electrical</a>
                <a href="/landscaping-software" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>Landscaping</a>
                <a href="/pest-control-software" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>Pest Control</a>
                <a href="/field-service-software" className="block text-sm text-emerald-700 hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>All industries →</a>
              </div>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">Compare</p>
                <a href="/jobber-alternatives" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>Jobber Alternatives</a>
                <a href="/serviceos-vs-jobber" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>ServiceOS vs Jobber</a>
                <a href="/best-field-service-software" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileMenuOpen(false)}>Best Field Service Software</a>
              </div>
              <Separator className="bg-border" />
              <Button variant="ghost" size="sm" onClick={onSignIn} className="w-full text-muted-foreground hover:text-foreground justify-start">Sign In</Button>
              <Button size="sm" onClick={onGetStarted} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                Get Started<ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function HeroSection({ onGetStarted, onTryDemo }: { onGetStarted: () => void; onTryDemo?: () => void }) {
  return (
    <section className="relative overflow-hidden bg-background pt-[calc(7rem+env(safe-area-inset-top,0px))] pb-16 lg:pt-[calc(8rem+env(safe-area-inset-top,0px))] lg:pb-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: 'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-1.5 text-sm font-medium">
                <Bolt className="w-3.5 h-3.5 mr-1.5" />
                From leads to invoices — in one place
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] mb-6"
            >
              Run your field service business <span className="text-primary">from lead to invoice</span>
            </motion.h1>

            <motion.p variants={staggerItem} className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
              ServiceOS replaces WhatsApp groups, Excel trackers, and paper forms. Capture leads, dispatch jobs, invoice clients, and get paid — over Email & SMS by default, with WhatsApp as an optional channel.
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <Button size="lg" onClick={onGetStarted} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 text-base shadow-sm w-full sm:w-auto">
                Start Free Trial<ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              {onTryDemo && (
                <Button size="lg" onClick={onTryDemo} className="bg-foreground text-background font-semibold px-8 h-12 text-base shadow-sm hover:bg-foreground/90 w-full sm:w-auto">
                  <Sparkles className="w-4 h-4 mr-2" />Try Live Demo
                </Button>
              )}
              <Button variant="outline" size="lg" className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground px-6 h-12 text-base w-full sm:w-auto">
                <Play className="w-4 h-4 mr-2" />Watch tour
              </Button>
            </motion.div>

            <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" />No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" />14-day free trial</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" />Email & SMS work out of the box</span>
            </motion.div>

            <motion.div variants={staggerItem} className="mt-8">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Works on every channel</p>
              <div className="flex flex-wrap gap-2">
                {channelPills.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <span
                      key={ch.label}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
                        ch.optional
                          ? 'bg-muted/50 text-muted-foreground border-border border-dashed'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {ch.label}
                      {ch.optional && <span className="text-[10px] uppercase tracking-wide">optional</span>}
                    </span>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative rounded-2xl border border-border bg-white shadow-2xl shadow-slate-300/40 overflow-hidden">
              <div className="aspect-[1344/768] relative">
                <Image
                  src="/images/landing/hero-dashboard.png"
                  alt="ServiceOS dashboard showing unified inbox with Email and SMS channels"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-top"
                />
              </div>
            </div>
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-200/40 via-teal-200/30 to-emerald-200/40 rounded-3xl blur-3xl -z-10" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute -bottom-6 -left-6 hidden sm:block"
            >
              <div className="rounded-xl border border-border bg-white shadow-lg p-3 w-44">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 overflow-hidden relative">
                    <Image src="/images/landing/persona-technician.png" alt="Technician" fill sizes="28px" className="object-cover" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground leading-tight">Tech en route</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">ETA 12 min</div>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1.5, delay: 0.8 }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -top-4 -right-4 hidden sm:block"
            >
              <div className="rounded-xl border border-border bg-white shadow-lg p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground leading-tight">Paid today</div>
                  <div className="text-sm font-bold text-foreground leading-tight">$4,280</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="bg-muted/30 border-y border-border py-10">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.p variants={staggerItem} className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6 font-medium">
            Trusted by service businesses across 11 industries
          </motion.p>
          <motion.div variants={staggerItem}>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {targetIndustries.map((industry) => {
                const Icon = industry.icon;
                return (
                  <span
                    key={industry.label}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border ${industry.tint} bg-opacity-50`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {industry.label}
                  </span>
                );
              })}
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="relative py-24 bg-background">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 mb-4 font-medium">The Problem</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Running a service business is <span className="text-primary">chaos</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              You didn&apos;t start a plumbing or cleaning business to chase paperwork. Yet most owners spend hours every day fighting these three fires.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {problemCards.map((p) => {
              const Icon = p.icon;
              return (
                <motion.div key={p.title} variants={staggerItem}>
                  <Card className="group bg-white border-border hover:border-primary/30 transition-all duration-300 h-full overflow-hidden hover:shadow-lg">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <CardHeader>
                      <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center mb-2">
                        <Icon className="w-5 h-5 text-amber-600" />
                      </div>
                      <CardTitle className="text-foreground text-lg">{p.title}</CardTitle>
                      <CardDescription className="text-muted-foreground leading-relaxed">{p.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={staggerItem} className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-50 border border-emerald-200">
              <Bolt className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-emerald-700">ServiceOS fixes all three — day one, no Meta approvals required.</span>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="relative py-24 bg-muted/30 border-y border-border">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">The Solution</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Three steps to <span className="text-primary">operational excellence</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Get up and running in minutes. Our streamlined process replaces messy WhatsApp groups and spreadsheets.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.step} variants={staggerItem}>
                  <Card className="bg-white border-border h-full overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="relative aspect-[1344/768] overflow-hidden bg-muted border-b border-border">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover object-top"
                      />
                      <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                        {step.step}
                      </div>
                    </div>
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs text-primary font-medium">{step.subtitle}</span>
                      </div>
                      <CardTitle className="text-foreground text-lg mt-2">{step.title}</CardTitle>
                      <CardDescription className="text-muted-foreground leading-relaxed">{step.description}</CardDescription>
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

function CoreFlowSection() {
  return (
    <section className="relative py-24 bg-background">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">Core Flow</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Your business, <span className="text-primary">one pipeline</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
              Every job flows through the same optimized pipeline — from first contact to analytics.
            </p>
          </motion.div>

          <motion.div variants={staggerItem}>
            <div className="hidden lg:flex items-center justify-center gap-2">
              {coreFlowSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center">
                    <div className="group flex flex-col items-center">
                      <div className="w-16 h-16 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-2 group-hover:border-primary/40 group-hover:shadow-md transition-all duration-300">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{step.label}</span>
                    </div>
                    {i < coreFlowSteps.length - 1 && <ArrowRight className="w-4 h-4 text-primary/40 mx-1 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div className="lg:hidden flex gap-3 overflow-x-auto pb-4 px-2 snap-x" style={{ scrollbarWidth: 'none' }}>
              {coreFlowSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center flex-shrink-0 snap-start">
                    <div className="group flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-2">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{step.label}</span>
                    </div>
                    {i < coreFlowSteps.length - 1 && <ArrowRight className="w-3 h-3 text-primary/40 ml-2 flex-shrink-0" />}
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

function FeaturesPillarSection() {
  return (
    <section className="relative py-24 bg-muted/30 border-y border-border" id="features">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Everything you need to <span className="text-primary">run your business</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Four powerful pillars covering 60+ features. Built specifically for field service businesses — no bloat, just what matters.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {featurePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <motion.div key={pillar.title} variants={staggerItem}>
                  <Card className="group bg-white border-border hover:border-primary/30 transition-all duration-300 h-full overflow-hidden hover:shadow-lg">
                    <div className="grid sm:grid-cols-2 gap-0">
                      <div className="relative aspect-[4/3] sm:aspect-auto overflow-hidden bg-muted border-b sm:border-b-0 sm:border-r border-border">
                        <Image
                          src={pillar.image}
                          alt={pillar.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <CardHeader className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-foreground text-lg leading-tight">{pillar.title}</CardTitle>
                            <p className="text-xs text-primary font-medium">{pillar.tagline}</p>
                          </div>
                        </div>
                        <ul className="space-y-2 mt-2">
                          {pillar.features.map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </CardHeader>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={staggerItem} className="mt-10">
            <div className="rounded-2xl bg-white border border-border p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">AI-powered, built in</h3>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">New</Badge>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {aiHighlights.map((ai) => {
                  const Icon = ai.icon;
                  return (
                    <div key={ai.title} className="rounded-xl bg-muted/40 border border-border p-4 hover:border-primary/30 hover:bg-muted/60 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-2">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-sm font-semibold text-foreground mb-1">{ai.title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ai.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

function ChannelsSection() {
  return (
    <section className="relative py-24 bg-background" id="channels">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">Channels</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Reach customers <span className="text-primary">where they are</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Email and SMS work out of the box — no approvals, no waiting. Connect WhatsApp when you&apos;re ready for high-engagement markets.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {primaryChannels.map((ch) => {
              const Icon = ch.icon;
              return (
                <motion.div key={ch.title} variants={staggerItem}>
                  <Card className={`bg-white h-full overflow-hidden transition-all duration-300 hover:shadow-lg ${
                    ch.primary ? 'border-emerald-200 hover:border-primary/40' : 'border-dashed border-border hover:border-amber-300'
                  }`}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <Image
                        src={ch.image}
                        alt={`${ch.title} channel`}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                      {!ch.primary && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Optional</Badge>
                        </div>
                      )}
                      {ch.primary && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Included</Badge>
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          ch.primary ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${ch.primary ? 'text-primary' : 'text-amber-600'}`} />
                        </div>
                        <CardTitle className="text-foreground text-base">{ch.title}</CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{ch.description}</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Setup:</span>
                          <span className="font-medium text-foreground">{ch.setup}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Approval:</span>
                          <span className="font-medium text-foreground text-right">{ch.approval}</span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={staggerItem}>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900 mb-1">About WhatsApp Business API</h4>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    WhatsApp is a powerful channel — but it requires <strong>Meta Business Verification</strong> (1–4 weeks), template message approval, and per-message fees billed at Meta&apos;s rates. If you operate in India, Brazil, Indonesia, or other high-WhatsApp markets, it&apos;s worth the setup. If not, Email + SMS cover 95% of customer communication needs from day one. We guide every customer through Meta approval when you&apos;re ready — no stress, no surprises.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

function PersonasSection() {
  return (
    <section className="relative py-24 bg-muted/30 border-y border-border">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">Who It&apos;s For</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Built for <span className="text-primary">every role</span> in your business
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              From the owner tracking revenue to the technician on the road — everyone gets exactly what they need.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {personas.map((persona) => {
              const Icon = persona.icon;
              return (
                <motion.div key={persona.title} variants={staggerItem}>
                  <Card className="group bg-white border-border hover:border-primary/30 transition-all duration-300 h-full overflow-hidden hover:shadow-lg">
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      <Image
                        src={persona.image}
                        alt={persona.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/90 backdrop-blur flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <span className="text-base font-semibold text-white drop-shadow">{persona.title}</span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <ul className="space-y-2">
                        {persona.points.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-sm text-foreground/80">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
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

function RoiSection() {
  return (
    <section className="relative py-24 bg-background">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">Outcomes</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Real results, <span className="text-primary">measurable impact</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Based on aggregated data from 2,500+ service businesses running on ServiceOS.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {roiStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={staggerItem}>
                  <Card className="bg-white border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 h-full">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                        <CountUp target={stat.value} suffix={stat.suffix} />
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <motion.p variants={staggerItem} className="text-center text-xs text-muted-foreground mt-6">
            * Aggregated averages from ServiceOS customers in their first 90 days. Individual results vary by industry and adoption.
          </motion.p>
        </div>
      </AnimatedSection>
    </section>
  );
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, target]);

  return <span ref={ref}>{value}{suffix}</span>;
}

function TestimonialsSection() {
  return (
    <section className="relative py-24 bg-muted/30 border-y border-border">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Loved by <span className="text-primary">service businesses</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Real stories from owners who replaced chaos with clarity.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={staggerItem}>
                <Card className="bg-white border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">{t.metric}</Badge>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                  </CardHeader>
                  <CardContent className="mt-auto pt-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-border bg-muted flex-shrink-0">
                        <Image src={t.avatar} alt={t.name} fill sizes="44px" className="object-cover" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.business}</div>
                        <div className="text-xs text-primary font-medium">{t.industry}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.p variants={staggerItem} className="text-center text-xs text-muted-foreground mt-6">
            * Testimonials are illustrative and represent typical customer outcomes, not specific endorsements.
          </motion.p>
        </div>
      </AnimatedSection>
    </section>
  );
}

function PricingSection({ onGetStarted }: { onGetStarted: () => void }) {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="relative py-24 bg-background" id="pricing">
      <AnimatedSection>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={staggerItem} className="text-center mb-12">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Simple, <span className="text-primary">Transparent Pricing</span>
            </h2>
            <p className="text-muted-foreground mt-4">Start free for 14 days. No credit card required. Email & SMS included on every plan.</p>

            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm font-medium ${!yearly ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
              <button onClick={() => setYearly(!yearly)} className="relative w-14 h-7 rounded-full bg-muted border border-border transition-colors duration-300 focus:outline-none" aria-label="Toggle yearly pricing">
                <motion.div className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-primary shadow-sm" animate={{ x: yearly ? 28 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </button>
              <span className={`text-sm font-medium ${yearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yearly<Badge className="ml-2 bg-emerald-100 text-emerald-700 border-0 text-xs">Save 17%</Badge>
              </span>
            </div>
          </motion.div>

          {/* Limited-time launch promo */}
          <motion.div
            variants={staggerItem}
            className="relative mb-8 rounded-2xl overflow-hidden border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-lg shadow-emerald-100"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-200/30 rounded-full blur-3xl" />
            <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <div className="flex-shrink-0 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 mb-3">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Limited Time Offer</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                  Get started for <span className="text-primary">$5</span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Starter plan · 1-year subscription</p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="flex items-baseline gap-2 justify-center">
                    <span className="text-2xl text-muted-foreground line-through font-medium">$290</span>
                  </div>
                  <div className="flex items-baseline gap-1 justify-center">
                    <span className="text-5xl sm:text-6xl font-extrabold text-primary tracking-tight">$5</span>
                    <span className="text-sm font-medium text-muted-foreground">/year</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center sm:items-end gap-2 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span>Full Starter features for 12 months</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span>Email + SMS · 100 jobs/month · 1 user</span>
                </div>
                <Button
                  size="sm"
                  onClick={onGetStarted}
                  className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-emerald-200"
                >
                  Claim this offer<ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <motion.div key={plan.name} variants={staggerItem}>
                  <Card className={`relative bg-white border h-full flex flex-col transition-all duration-300 ${plan.popular ? 'border-primary shadow-lg shadow-emerald-100 ring-1 ring-primary/20' : 'border-border hover:border-primary/30 hover:shadow-md'}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground font-semibold border-0 px-3 shadow-md">Popular</Badge>
                      </div>
                    )}
                    {plan.name === 'Starter' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-amber-500 text-white font-semibold border-0 px-3 shadow-md whitespace-nowrap">$5 first year</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${plan.popular ? 'bg-emerald-50 border border-emerald-100' : 'bg-muted border border-border'}`}>
                        <Icon className={`w-5 h-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <CardTitle className="text-foreground text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="mb-6">
                        {plan.name === 'Starter' ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-extrabold text-primary">$5</span>
                              <span className="text-muted-foreground text-sm">/year</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground line-through">${yearly ? plan.yearlyPrice : plan.monthlyPrice}{yearly ? '/year' : '/mo'}</span>
                              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs font-semibold">98% off</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">First year only · then ${plan.monthlyPrice}/mo</p>
                          </>
                        ) : plan.monthlyPrice !== null ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-foreground">${yearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice}</span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </div>
                        ) : (
                          <div className="text-4xl font-bold text-foreground">Custom</div>
                        )}
                        {plan.name !== 'Starter' && yearly && plan.yearlyPrice !== null && <p className="text-xs text-muted-foreground mt-1">${plan.yearlyPrice}/year billed annually</p>}
                      </div>
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span className="text-foreground/80">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button onClick={onGetStarted} className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm' : 'bg-white hover:bg-muted text-foreground border border-border'}`}>
                        {plan.cta}<ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={staggerItem} className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">All plans include</strong> Email & SMS notifications, lead capture, invoicing, and the Live Demo. WhatsApp Business API is available as an optional add-on on Growth and Pro plans.
            </p>
          </motion.div>
        </div>
      </AnimatedSection>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="relative py-24 bg-muted/30 border-y border-border" id="faq">
      <AnimatedSection>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={staggerItem} className="text-center mb-12">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-4 font-medium">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-4">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="bg-white border-border">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border-border px-6">
                      <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
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

function FinalCTASection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative py-24 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.10),transparent_60%)]" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl" />

      <AnimatedSection>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div variants={staggerItem}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
              Ready to transform <span className="text-primary">your business?</span>
            </h2>
          </motion.div>
          <motion.p variants={staggerItem} className="text-muted-foreground text-lg mb-8">
            Join 2,500+ service businesses already running on ServiceOS. Email & SMS work from day one — no Meta approvals, no waiting.
          </motion.p>
          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={onGetStarted} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-14 text-lg shadow-lg shadow-emerald-200">
              Start Free Trial<ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="bg-white border-border text-foreground hover:bg-muted px-8 h-14 text-lg">
              <Play className="w-4 h-4 mr-2" />Watch 2-min tour
            </Button>
          </motion.div>
          <motion.p variants={staggerItem} className="text-muted-foreground text-sm mt-4">
            No credit card required &bull; 14-day free trial &bull; Cancel anytime
          </motion.p>
        </div>
      </AnimatedSection>
    </section>
  );
}

function Footer() {
  // Split industries into two columns for the footer grid.
  const half = Math.ceil(seoIndustries.length / 2);
  const industriesColA = seoIndustries.slice(0, half);
  const industriesColB = seoIndustries.slice(half);

  return (
    <footer className="bg-foreground text-background mt-auto pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-sm bg-emerald-600 shadow-emerald-500/20">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-background tracking-tight">ServiceOS</span>
            </div>
            <p className="text-background/70 text-sm max-w-xs leading-relaxed">
              The operating system for service businesses. From leads to invoices, manage everything in one place — over Email, SMS, and optional WhatsApp.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-9 h-9 rounded-lg bg-background/10 border border-background/10 flex items-center justify-center hover:bg-emerald-600/30 hover:border-emerald-500/40 transition-colors" aria-label="Twitter">
                <Globe className="w-4 h-4 text-background/80" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-background/10 border border-background/10 flex items-center justify-center hover:bg-emerald-600/30 hover:border-emerald-500/40 transition-colors" aria-label="LinkedIn">
                <Building2 className="w-4 h-4 text-background/80" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-background/10 border border-background/10 flex items-center justify-center hover:bg-emerald-600/30 hover:border-emerald-500/40 transition-colors" aria-label="Email">
                <Mail className="w-4 h-4 text-background/80" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-background/10 border border-background/10 flex items-center justify-center hover:bg-emerald-600/30 hover:border-emerald-500/40 transition-colors" aria-label="Phone">
                <Phone className="w-4 h-4 text-background/80" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-background font-semibold text-sm mb-4">Industries</h4>
            <div className="grid grid-cols-2 gap-x-4">
              <ul className="space-y-2.5">
                {industriesColA.map((link) => (
                  <li key={link.href}><a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a></li>
                ))}
              </ul>
              <ul className="space-y-2.5">
                {industriesColB.map((link) => (
                  <li key={link.href}><a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-background font-semibold text-sm mb-4">Compare</h4>
            <ul className="space-y-2.5">
              {footerLinks.compare.map((link) => (
                <li key={link.href}><a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-background font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}><a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a></li>
              ))}
            </ul>
            <h4 className="text-background font-semibold text-sm mb-4 mt-6">Resources</h4>
            <ul className="space-y-2.5">
              {footerLinks.resources.slice(0, 4).map((link) => (
                <li key={link.href}><a href={link.href} className="text-background/60 text-sm hover:text-background transition-colors">{link.label}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="bg-background/10 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-background/50 text-xs">&copy; {new Date().getFullYear()} ServiceOS. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {footerLinks.legal.map((link) => (
              <a key={link.href} href={link.href} className="text-background/50 text-xs hover:text-background transition-colors">{link.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ onGetStarted, onSignIn, onTryDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} />
      <HeroSection onGetStarted={onGetStarted} onTryDemo={onTryDemo} />
      <TrustBar />
      <ProblemSection />
      <HowItWorksSection />
      <CoreFlowSection />
      <FeaturesPillarSection />
      <ChannelsSection />
      <PersonasSection />
      <RoiSection />
      <TestimonialsSection />
      <PricingSection onGetStarted={onGetStarted} />
      <FAQSection />
      <FinalCTASection onGetStarted={onGetStarted} />
      <Footer />
    </div>
  );
}
