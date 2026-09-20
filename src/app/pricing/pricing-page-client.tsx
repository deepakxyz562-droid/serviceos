'use client';

import Link from 'next/link';
import { Check, Sparkles, ArrowRight, Zap, Calendar, FileText, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FORMS_PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['3 forms', '100 submissions/month', 'Lead capture', 'Basic templates', 'Form embed', '100MB storage'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Bronze',
    price: '$10',
    period: '/mo',
    features: ['10 forms', '1,000 submissions/month', 'Payment collection', 'Custom branding', '1GB storage'],
    cta: 'Start Trial',
    highlight: false,
  },
  {
    name: 'Silver',
    price: '$19',
    period: '/mo',
    features: ['30 forms', '3,000 submissions/month', 'Advanced workflows', 'Conditional logic', '5GB storage'],
    cta: 'Start Trial',
    highlight: true,
  },
  {
    name: 'Gold',
    price: '$24',
    period: '/mo',
    features: ['Unlimited forms', '10,000 submissions/month', 'AI form generator', 'Remove branding', '25GB storage'],
    cta: 'Start Trial',
    highlight: false,
  },
];

const CRM_PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Run your first 100 jobs free',
    features: ['Leads + Customers', '100 lifetime jobs', 'Quotes & estimates', 'Basic calendar', 'Invoices & payments', 'Before/after photos', 'Digital signatures', 'Customer portal'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    tagline: 'For solo pros & new businesses',
    features: ['Unlimited jobs', 'Up to 5 users', 'Customer 360', 'Online booking', 'Employee portal', 'Time tracking', 'Reviews management', '5GB storage'],
    cta: 'Start 14-Day Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/mo',
    tagline: 'For growing teams — most popular',
    features: ['Everything in Starter', 'Up to 10 users', 'AI Assistant + AI Quote Generator', 'WhatsApp + Omnichannel Inbox', 'Workflow builder + Forms builder', 'Marketing campaigns', 'API access + webhooks', '50GB storage'],
    cta: 'Start 14-Day Trial',
    highlight: true,
  },
  {
    name: 'Business',
    price: '$149',
    period: '/mo',
    tagline: 'For multi-branch operators',
    features: ['Everything in Professional', 'Up to 25 users', 'AI Receptionist (voice)', 'AI Dispatcher', 'GPS + live technician map', 'Inventory + purchase orders', 'Recurring jobs', 'Role permissions', '200GB storage'],
    cta: 'Start 14-Day Trial',
    highlight: false,
  },
];

export function PricingPageClient() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <header className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 text-center">
          <Badge className="bg-white/15 text-white border-0 mb-4">
            <Sparkles className="size-3 mr-1" /> 100 Jobs Free · No credit card required
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Run Your First 100 Jobs Free
          </h1>
          <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl mx-auto">
            Capture leads, manage customers, schedule jobs, and send quotes. Free forever for your first 100 jobs. Upgrade when you grow.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/request" className="inline-flex items-center gap-2 bg-white text-emerald-700 text-sm font-bold px-6 py-3 rounded-xl hover:bg-emerald-50 transition">
              <FileText className="size-4" /> Start Free <ArrowRight className="size-4" />
            </Link>
            <Link href="/ai-forms" className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition border border-white/20">
              <Zap className="size-4" /> Explore AI Forms
            </Link>
          </div>
        </div>
      </header>

      {/* The dual-product pitch */}
      <section className="py-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 rounded-2xl bg-emerald-50 border border-emerald-200">
              <FileText className="size-8 text-emerald-600 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-slate-900">Fieseros Forms</h2>
              <p className="text-sm text-slate-500 mt-1">AI-powered forms + lead capture</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">$0<span className="text-sm text-slate-400"> → $10/$19/$24</span></p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-blue-50 border border-blue-200">
              <Briefcase className="size-8 text-blue-600 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-slate-900">Fieseros CRM</h2>
              <p className="text-sm text-slate-500 mt-1">Complete service business OS</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">$0<span className="text-sm text-slate-400"> → $29/$79/$149</span></p>
            </div>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">
            Free ecosystem: Forms + Leads + Customers + 100 Jobs. Use independently or together.
          </p>
        </div>
      </section>

      {/* Forms Pricing */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Fieseros Forms Pricing</h2>
            <p className="text-sm text-slate-500 mt-1">Start free. Upgrade when you need more forms or submissions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {FORMS_PLANS.map((plan) => (
              <Card key={plan.name} className={plan.highlight ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}>
                <CardContent className="p-5">
                  {plan.highlight && (
                    <Badge className="bg-emerald-600 text-white text-[9px] mb-2">Popular</Badge>
                  )}
                  <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{plan.price}<span className="text-sm font-normal text-slate-500">{plan.period}</span></p>
                  <div className="mt-4 space-y-1.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/auth/signup">
                    <Button className={`w-full mt-4 text-xs ${plan.highlight ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} variant={plan.highlight ? 'default' : 'outline'} size="sm">
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CRM Pricing */}
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Fieseros CRM Pricing</h2>
            <p className="text-sm text-slate-500 mt-1">Free for your first 100 jobs. Upgrade for unlimited jobs + advanced features.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {CRM_PLANS.map((plan) => (
              <Card key={plan.name} className={plan.highlight ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}>
                <CardContent className="p-5">
                  {plan.highlight && (
                    <Badge className="bg-blue-600 text-white text-[9px] mb-2">Most Popular</Badge>
                  )}
                  <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{plan.tagline}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{plan.price}<span className="text-sm font-normal text-slate-500">{plan.period}</span></p>
                  <div className="mt-4 space-y-1.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                        <Check className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/auth/signup">
                    <Button className={`w-full mt-4 text-xs ${plan.highlight ? 'bg-blue-600 hover:bg-blue-700' : ''}`} variant={plan.highlight ? 'default' : 'outline'} size="sm">
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Calendar className="size-8 text-slate-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-slate-900">Enterprise</h2>
          <p className="text-sm text-slate-500 mt-1">For large organizations</p>
          <p className="text-xs text-slate-400 mt-1">Unlimited users · White-label · Advanced security · HIPAA · SSO · Data retention · Custom onboarding</p>
          <Link href="/contact" className="mt-3 inline-block">
            <Button variant="outline" size="sm" className="text-xs">Contact Sales</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
