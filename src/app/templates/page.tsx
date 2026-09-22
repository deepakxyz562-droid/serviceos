import type { Metadata } from 'next';
import { TemplatesGalleryClient } from './templates-gallery-client';
import {
  searchTemplatesPaginated,
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
} from '@/lib/forms/templates';
import { Sparkles, Zap, ShieldCheck, Layers } from 'lucide-react';

/**
 * /templates — Form Template Library & Customer Journey Hub.
 *
 * Fully Server-Rendered for Google SEO and crawlers.
 * Features Schema.org CollectionPage, ItemList, BreadcrumbList, and FAQPage JSON-LD.
 */
export const metadata: Metadata = {
  title: '20,000+ Free Form Templates & Workflows | GPTForm by Fieseros',
  description:
    'Explore 20,000+ free online form templates, workflows, and AI customer journeys. Contact forms, patient intake, inspection checklists, HVAC quotes, waivers, and order forms. Customize in Classic, Card, Conversational, or AI Agent mode with 0% payment processing fees.',
  alternates: { canonical: '/templates' },
  keywords: [
    'free form templates',
    'online form builder templates',
    'jotform alternatives',
    'patient intake form template',
    'hvac service quote template',
    'emergency inspection checklist',
    'liability waiver template',
    'event registration form',
    'conversational form templates',
    'ai form templates',
  ],
  openGraph: {
    title: '20,000+ Free Form Templates & AI Workflows | Fieseros',
    description:
      'Browse 20,000+ free templates across 25+ industries. Live interactive preview in Classic, Card, Conversational, and AI Agent modes.',
    url: 'https://fieseros.com/templates',
    siteName: 'Fieseros GPTForm',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '20,000+ Free Online Form Templates | Fieseros',
    description:
      'Browse 20,000+ free form templates for every business need. Free to customize, embed, and deploy with AI.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const FAQ_ITEMS = [
  {
    question: 'Are all form templates on Fieseros free to use?',
    answer:
      'Yes! All 20,000+ form templates across all categories and industries are 100% free to preview, customize, and deploy. There are no limits on the number of fields, question types, or basic submissions on our free tier.',
  },
  {
    question: 'Can I render these templates as conversational chat forms or AI agents?',
    answer:
      'Absolutely. Every template on Fieseros can be delivered in 4 distinct runtime experiences: Classic Multi-Field Form, 1-Question-at-a-Time Card Stepper, Conversational Chatbot (WhatsApp/iMessage style), or Generative AI Form Agent.',
  },
  {
    question: 'How do I embed a template on my website?',
    answer:
      'After selecting and customizing a template in our AI form builder, you can embed it anywhere with a simple script tag, iframe snippet, or WordPress/Webflow/Shopify plugin. Full responsive mobile support is built-in.',
  },
  {
    question: 'Do you charge transaction fees on order and payment forms?',
    answer:
      'No. Fieseros charges 0% platform transaction fees. You keep 100% of your customer revenue. Direct Stripe, PayPal, Square, and 30+ regional payment gateways connect directly to your merchant account.',
  },
  {
    question: 'Can I use AI to customize these templates or generate new fields?',
    answer:
      'Yes. Our built-in GPTForm AI Copilot allows you to describe modifications in natural language (e.g. "Add a Spanish translation", "Calculate dynamic pricing for HVAC square footage", or "Add digital signature and ID upload").',
  },
  {
    question: 'Are form submissions secure and HIPAA / GDPR compliant?',
    answer:
      'Yes. All form data is encrypted in transit (TLS 1.3) and at rest (AES-256). We offer enterprise-grade compliance including GDPR, SOC 2 Type II, and optional HIPAA-compliant BAA agreements for healthcare intake forms.',
  },
];

export default function TemplatesGalleryPage() {
  const initialData = searchTemplatesPaginated({ page: 1, pageSize: 24, sort: 'featured' });
  const categories = TEMPLATE_CATEGORIES;
  const industries = TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general');

  const categoryCounts: Record<string, number> = {};
  for (const c of categories) {
    categoryCounts[c.id] = c.count || 580;
  }

  const industryCounts: Record<string, number> = {};
  for (const ind of industries) {
    industryCounts[ind.id] = ind.count || 420;
  }

  // Schema.org Structured Data
  const jsonLdData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://fieseros.com/templates#webpage',
        url: 'https://fieseros.com/templates',
        name: '20,000+ Free Form Templates & AI Workflows',
        description:
          'Browse 20,000+ ready-to-use form templates with Jotform parity. Contact forms, patient intake, inspections, bookings, quotes, and waivers.',
        publisher: {
          '@type': 'Organization',
          name: 'Fieseros',
          url: 'https://fieseros.com',
          logo: 'https://fieseros.com/logo.png',
        },
      },
      {
        '@type': 'ItemList',
        '@id': 'https://fieseros.com/templates#itemlist',
        name: 'Featured Form Templates',
        numberOfItems: initialData.total,
        itemListElement: initialData.templates.slice(0, 30).map((t, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: t.name,
          url: `https://fieseros.com/templates/${t.categories[0] || 'general'}/${t.id}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://fieseros.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Form Templates',
            item: 'https://fieseros.com/templates',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* Main Interactive Template Discovery & Gallery Client */}
      <TemplatesGalleryClient
        initialTemplates={initialData.templates}
        initialTotalCount={initialData.total}
        categoryCounts={categoryCounts}
        industryCounts={industryCounts}
      />

      {/* Structured SEO & FAQ Section for Search Engines */}
      <section className="border-t border-border bg-slate-50/60 dark:bg-slate-950/40 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          {/* Why Choose Section */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Zap className="size-3.5" /> High Conversion Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Why Businesses Choose Fieseros Form Templates
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Every template is engineered for maximum completion rates, mobile speed, zero-fee payment collection, and instant AI customization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center font-bold">
                <Layers className="size-5" />
              </div>
              <h3 className="font-bold text-base">4 Multi-Mode Runtimes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Render any template as a classic multi-field form, 1-question card flow, conversational chat, or natural-language AI agent.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center font-bold">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-bold text-base">0% Payment Processing Fees</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect Stripe, PayPal, Square, or Authorize.Net with 0% extra commission fees. Keep 100% of every order and booking.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center font-bold">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-bold text-base">Instant AI Customization</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Describe custom pricing formulas, validation rules, or conditional branch logic in plain English. AI updates your form in seconds.
              </p>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="pt-8 border-t border-border">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Frequently Asked Questions About Form Templates
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5">
                Everything you need to know about customizing, embedding, and automating with Fieseros templates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FAQ_ITEMS.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <h3 className="text-sm font-bold text-foreground flex items-start gap-2">
                    <span className="text-emerald-600 font-extrabold shrink-0">Q.</span>
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
