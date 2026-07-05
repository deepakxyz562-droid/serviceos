'use client';

import { useState } from 'react';
import {
  Crown, Zap, Building2, Rocket, CheckCircle2, X, ArrowRight,
  Users, MessageSquare, BarChart3, Bot, Palette, Headphones,
  Shield, Globe, TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ─── Plan Data ──────────────────────────────────────────────────────
interface PlanFeature {
  name: string;
  included: boolean;
  detail?: string;
}

interface Plan {
  id: string;
  name: string;
  icon: React.ElementType;
  price: number;
  annualPrice: number;
  features: PlanFeature[];
  recommended: boolean;
  current: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Rocket,
    price: 2999,
    annualPrice: 2399,
    recommended: false,
    current: true,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    features: [
      { name: '3 Employees', included: true },
      { name: '500 Customers', included: true },
      { name: '1,000 WhatsApp Messages/mo', included: true },
      { name: 'Basic Reports', included: true },
      { name: 'AI Assistant', included: false },
      { name: 'White Label', included: false },
      { name: 'Priority Support', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: Zap,
    price: 6999,
    annualPrice: 5599,
    recommended: true,
    current: false,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500',
    features: [
      { name: '10 Employees', included: true },
      { name: '2,000 Customers', included: true },
      { name: '5,000 WhatsApp Messages/mo', included: true },
      { name: 'AI Assistant', included: true },
      { name: 'Advanced Reports', included: true },
      { name: 'White Label', included: false },
      { name: 'Priority Support', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Crown,
    price: 14999,
    annualPrice: 11999,
    recommended: false,
    current: false,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    features: [
      { name: '50 Employees', included: true },
      { name: 'Unlimited Customers', included: true },
      { name: '25,000 WhatsApp Messages/mo', included: true },
      { name: 'AI Receptionist', included: true },
      { name: 'White Label', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Custom Domain', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    price: 0,
    annualPrice: 0,
    recommended: false,
    current: false,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    features: [
      { name: 'Unlimited Employees', included: true },
      { name: 'Unlimited Customers', included: true },
      { name: 'Unlimited WhatsApp Messages', included: true },
      { name: 'Dedicated Support', included: true },
      { name: 'Custom Integrations', included: true },
      { name: 'SLA Guarantee', included: true },
      { name: 'On-premise Deployment', included: true },
    ],
  },
];

// ─── Comparison Table Rows ──────────────────────────────────────────
const comparisonFeatures = [
  { category: 'Scale', items: [
    { name: 'Employees', starter: '3', growth: '10', pro: '50', enterprise: 'Unlimited' },
    { name: 'Customers', starter: '500', growth: '2,000', pro: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'WhatsApp Messages', starter: '1,000/mo', growth: '5,000/mo', pro: '25,000/mo', enterprise: 'Unlimited' },
    { name: 'Team Members', starter: '3', growth: '10', pro: '50', enterprise: 'Unlimited' },
  ]},
  { category: 'AI & Automation', items: [
    { name: 'AI Assistant', starter: false, growth: true, pro: true, enterprise: true },
    { name: 'AI Receptionist', starter: false, growth: false, pro: true, enterprise: true },
    { name: 'Journey Automation', starter: 'Basic', growth: 'Advanced', pro: 'Advanced', enterprise: 'Custom' },
    { name: 'Chatbot Builder', starter: false, growth: true, pro: true, enterprise: true },
  ]},
  { category: 'Reporting & Analytics', items: [
    { name: 'Reports', starter: 'Basic', growth: 'Advanced', pro: 'Advanced', enterprise: 'Custom' },
    { name: 'Real-time Dashboard', starter: false, growth: true, pro: true, enterprise: true },
    { name: 'Custom Dashboards', starter: false, growth: false, pro: true, enterprise: true },
    { name: 'Data Export', starter: 'CSV', growth: 'CSV/PDF', pro: 'All Formats', enterprise: 'All Formats' },
  ]},
  { category: 'Branding & Support', items: [
    { name: 'White Label', starter: false, growth: false, pro: true, enterprise: true },
    { name: 'Custom Domain', starter: false, growth: false, pro: true, enterprise: true },
    { name: 'Support', starter: 'Email', growth: 'Email + Chat', pro: 'Priority', enterprise: 'Dedicated' },
    { name: 'SLA', starter: false, growth: false, pro: '99.5%', enterprise: '99.9%' },
  ]},
];

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value
      ? <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
      : <X className="size-4 text-slate-300 mx-auto" />;
  }
  return <span className="text-sm">{value}</span>;
}

// ─── Main Component ─────────────────────────────────────────────────
export function SubscriptionsView() {
  const [isAnnual, setIsAnnual] = useState(false);
  const currentPlan = plans.find(p => p.current);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50"><Crown className="size-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-xl font-bold">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground">Choose the plan that fits your business</p>
        </div>
      </div>

      {/* Current Plan Banner */}
      {currentPlan && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <currentPlan.icon className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{currentPlan.name} Plan</h3>
                    <Badge className="bg-emerald-500 text-white text-[10px]">Current</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ₹{currentPlan.price.toLocaleString('en-IN')}/mo &middot; Next billing: <span className="font-semibold text-emerald-600">Apr 1, 2024</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1 text-xs h-8">Manage Plan</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs h-8">
                  <TrendingUp className="size-3" />Upgrade
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn('text-sm font-medium', !isAnnual && 'text-emerald-600 font-semibold')}>Monthly</span>
        <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
        <span className={cn('text-sm font-medium', isAnnual && 'text-emerald-600 font-semibold')}>Annual</span>
        {isAnnual && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Save 20%</Badge>}
      </div>

      {/* Plan Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map(plan => {
          const displayPrice = isAnnual ? plan.annualPrice : plan.price;
          return (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden transition-shadow hover:shadow-lg',
                plan.recommended && 'ring-2 ring-emerald-500 border-emerald-500',
                plan.current && 'ring-1 ring-emerald-400',
              )}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-white rounded-bl-lg flex items-center gap-1">
                  <Zap className="size-3" />Recommended
                </div>
              )}
              {plan.current && !plan.recommended && (
                <div className="absolute top-0 right-0 bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-700 rounded-bl-lg">
                  Current Plan
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className={cn('p-2 rounded-lg', plan.bgColor)}>
                    <plan.icon className={cn('size-5', plan.color)} />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  {plan.price === 0 ? (
                    <div>
                      <p className="text-3xl font-bold">Custom</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Contact sales for pricing</p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">₹{displayPrice.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  )}
                  {isAnnual && plan.price > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ₹{plan.price.toLocaleString('en-IN')}/mo billed monthly
                    </p>
                  )}
                </div>

                <Separator className="mb-4" />

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f.name} className="flex items-start gap-2">
                      {f.included
                        ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        : <X className="size-4 text-slate-300 shrink-0 mt-0.5" />
                      }
                      <span className={cn('text-sm', !f.included && 'text-muted-foreground')}>{f.name}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn('w-full gap-1', plan.recommended && 'bg-emerald-600 hover:bg-emerald-700')}
                  variant={plan.current ? 'outline' : plan.recommended ? 'default' : 'outline'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : plan.price === 0 ? 'Contact Sales' : (
                    <>Upgrade<ArrowRight className="size-4" /></>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Feature Comparison</CardTitle>
          <CardDescription>See what&apos;s included in each plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Feature</TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Rocket className="size-4 text-slate-500" />
                      <span className="text-xs font-semibold">Starter</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Zap className="size-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600">Growth</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Crown className="size-4 text-amber-500" />
                      <span className="text-xs font-semibold">Pro</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Building2 className="size-4 text-violet-500" />
                      <span className="text-xs font-semibold">Enterprise</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonFeatures.map(category => (
                  <>
                    <TableRow key={category.category} className="bg-slate-50/50">
                      <TableCell colSpan={5} className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-2">
                        {category.category}
                      </TableCell>
                    </TableRow>
                    {category.items.map(item => (
                      <TableRow key={item.name}>
                        <TableCell className="text-sm font-medium">{item.name}</TableCell>
                        <TableCell className="text-center"><CellValue value={item.starter} /></TableCell>
                        <TableCell className="text-center bg-emerald-50/30"><CellValue value={item.growth} /></TableCell>
                        <TableCell className="text-center"><CellValue value={item.pro} /></TableCell>
                        <TableCell className="text-center"><CellValue value={item.enterprise} /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ / CTA */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Need help choosing the right plan?</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
            Our team can help you find the perfect plan for your service business. Get a personalized demo and see how ServiceOS can transform your operations.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" className="gap-1">
              <MessageSquare className="size-4" />Talk to Sales
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1">
              <Globe className="size-4" />Book a Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
