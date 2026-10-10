'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  CalendarCheck,
  Wallet,
  Headphones,
  Globe,
  ArrowRight,
} from 'lucide-react';

const pillars = [
  {
    icon: Users,
    title: 'CRM & Leads',
    description:
      'Capture leads from phone, website, social media and marketplace. Track pipeline and convert more jobs.',
    href: '/customer-crm',
  },
  {
    icon: CalendarCheck,
    title: 'Scheduling & Dispatch',
    description:
      'Calendar, recurring jobs, smart dispatch, live map and route optimization for your team.',
    href: '/scheduling-and-dispatch',
  },
  {
    icon: Wallet,
    title: 'Invoicing & Payments',
    description:
      'Create invoices, send reminders and get paid online via Stripe, Square, Razorpay and more.',
    href: '/invoicing-and-payments',
  },
  {
    icon: Headphones,
    title: 'AI Voice Receptionist',
    description:
      'Answer calls 24/7, qualify leads, book appointments and sync to your CRM automatically.',
    href: '/ai-employee',
  },
  {
    icon: Globe,
    title: 'Websites & SEO',
    description:
      'Get a professional website, service pages and SEO tools to attract more local customers.',
    href: '/services/website-development',
  },
];

export function ModernPillars() {
  return (
    <section className="py-16 sm:py-20 bg-white border-y border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header: Eyebrow + Split Heading & Description */}
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            EVERYTHING YOUR TEAM NEEDS IN ONE PLACE
          </p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Built for service businesses of any size
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed">
              From solo operators to growing teams, Fieseros gives you the tools to manage leads, jobs, customers, payments and your online presence.
            </p>
          </div>
        </div>

        {/* 5-Column Responsive Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1 text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Learn more</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}
