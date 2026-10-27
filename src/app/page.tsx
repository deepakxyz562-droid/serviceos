import type { Metadata } from 'next';
import HomePageClient from '@/components/home/home-page-client';

const homeFaqs = [
  {
    question: 'How does Fieseros create a job from plain language?',
    answer:
      'You type or speak an instruction like “Book Sarah in for an emergency boiler repair tomorrow.” Fieseros finds the customer in your CRM, creates the job, checks availability, assigns a technician, drafts the quote and sends the confirmation — all in one run you can review before it goes out.',
  },
  {
    question: 'How are technicians assigned?',
    answer:
      'The AI dispatcher matches required certifications, parts on the van, live GPS position, traffic and existing schedule. You can always drag and drop to override, and the board re-optimises the rest of the day automatically.',
  },
  {
    question: 'Is there a mobile app for my crew?',
    answer:
      'Yes — a mobile PWA that installs on iOS and Android without an app store. It works offline on site and syncs checklists, photos, signatures and payments as soon as signal returns.',
  },
  {
    question: 'What is GPTForm™?',
    answer:
      'GPTForm™ is the built-in form and chatbot builder. Create booking forms, quote requests and lead qualifiers from 20,000+ templates, embed them on your site, and have an AI chat with visitors and book them straight into your calendar.',
  },
  {
    question: 'How is Fieseros different from Jobber?',
    answer:
      'Jobber is a strong scheduling and invoicing tool that still expects you to do the clicking. Fieseros adds an autonomous AI layer — voice reception, dispatch, quoting and follow-up run themselves — and includes forms, chatbots and marketing that Jobber sells separately or not at all.',
  },
  {
    question: 'How is Fieseros different from Housecall Pro?',
    answer:
      'Housecall Pro charges per-transaction payment fees and prices AI add-ons on top. Fieseros charges 0% platform commission, includes the AI receptionist and dispatcher in the plan, and gives you one prompt-driven interface instead of a dozen screens.',
  },
  {
    question: 'Will it work with QuickBooks and my accountant?',
    answer:
      'Yes. Invoices, payments and payouts export cleanly to QuickBooks and Xero, and your accountant can be given a read-only seat at no extra cost.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'Most businesses are live in under an hour. Import customers from a CSV or your current tool, connect your number and calendar, and the AI receptionist can take its first call tonight.',
  },
  {
    question: 'What does 0% platform commission actually mean?',
    answer:
      'Fieseros never takes a cut of the money you collect. You pay your card processor’s standard rate and nothing to us on top — tap-to-pay in the field included.',
  },
];

/**
 * Homepage — server component shell.
 *
 * This is a server component that:
 *   1. Exports full `metadata` (title, description, OG, Twitter, canonical)
 *      — server components can export metadata, client components cannot.
 *   2. Generates JSON-LD structured data (SoftwareApplication, Organization, FAQPage)
 *      in the initial response so crawlers receive rich structured data.
 *   3. Renders `<HomePageClient />` — the auth-routing logic + interactive
 *      DualAudienceLanding page (loaded with ssr:false to optimize hydration and build performance).
 */
export const metadata: Metadata = {
  // Google AI Overview & G2 Ranked Authority Title:
  title: 'Fieseros | AI Operating System & Field Service Management Platform',
  // Trimmed from 260 → 156 chars so the CTR-critical tail isn't truncated in SERPs.
  description:
    'Fieseros is the all-in-one AI operating system for field service businesses — CRM, scheduling, dispatch, invoicing, payments, and a 24/7 AI Voice Receptionist.',
  keywords: [
    'field service management platform',
    'field service software',
    'service business operating system',
    'trade business CRM',
    'scheduling and dispatch',
    'invoicing and payments',
    'AI voice receptionist',
    'plumbing software',
    'HVAC software',
    'landscaping software',
    'handyman software',
    'electrical contractor software',
    'GoHighLevel alternative for contractors',
    'Jobber alternative',
    'ServiceTitan alternative',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Fieseros | AI Operating System & Field Service Management Platform',
    description:
      'Fieseros is the all-in-one AI operating system for field service businesses — CRM, scheduling, dispatch, invoicing, payments, and a 24/7 AI Voice Receptionist.',
    url: '/',
    siteName: 'Fieseros',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fieseros | AI Operating System & Field Service Management Platform',
    description:
      'Fieseros is the all-in-one AI operating system for field service businesses — CRM, scheduling, dispatch, invoicing, payments, and 24/7 AI Voice Receptionist.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default async function HomePage() {
  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://fieseros.com/#software',
        name: 'Fieseros',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All (Web, iOS PWA, Android PWA)',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free tier includes first 100 jobs with zero platform fee',
        },
        description:
          'Fieseros is an all-in-one, AI-powered operating system and field service management platform built for trade and service-based businesses.',
        sameAs: [
          'https://www.g2.com/products/fieseros/reviews',
        ],
      },
      {
        '@type': 'Organization',
        '@id': 'https://fieseros.com/#organization',
        name: 'Fieseros',
        url: 'https://fieseros.com',
        logo: 'https://fieseros.com/icon-512.png',
        sameAs: [
          'https://www.g2.com/products/fieseros/reviews',
          'https://twitter.com/fieseros',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://fieseros.com/#faq',
        mainEntity: homeFaqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      {/* Interactive client app — auth routing + landing page */}
      <HomePageClient />
    </>
  );
}
