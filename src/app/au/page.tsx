import type { Metadata } from 'next';
import AustralianLandingPage from '@/components/au/au-landing-page';

export const metadata: Metadata = {
  title: 'Field Service Software for Australia | Fieseros Tradie CRM, Scheduling & AI Receptionist',
  description:
    'The all-in-one operating system for Australian tradies. Smart dispatch, quotes, ATO-compliant tax invoices (10% GST), Xero & MYOB sync, and 24/7 Australian AI phone receptionist.',
  keywords: [
    'tradie software australia',
    'field service management software au',
    'plumber software melbourne',
    'electrician quoting app sydney',
    'ai receptionist for tradies',
    'australian tradie job management',
    'servicem8 alternative',
    'jobber alternative australia',
    'xero tradie software',
    'hvac software brisbane',
    'field service software australia',
  ],
  alternates: {
    canonical: 'https://fieseros.com/au',
  },
  openGraph: {
    title: 'Fieseros Australia | Less Admin. More Jobs. One Connected Business.',
    description:
      'Manage customers, quotes, schedules and invoices in the office or on the tools. Built for Australian tradies with 24/7 AI call answering and ATO-compliant invoices.',
    url: 'https://fieseros.com/au',
    siteName: 'Fieseros Australia',
    locale: 'en_AU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fieseros Australia | Field Service & Tradie Software',
    description:
      'Quotes, scheduling, offline mobile app, and 24/7 AI voice receptionist for Australian trade businesses.',
  },
};

export default function AustralianPage() {
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Fieseros Australia',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'AUD',
        description: '14-Day Free Trial for Australian Trade Businesses',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '420',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Australia',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Does Fieseros comply with Australian tax and GST requirements?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, 100%. Fieseros is fully localized for Australia. It automatically calculates the 10% Goods and Services Tax (GST) on quotes and invoices, generates ATO-compliant Tax Invoices with your Australian Business Number (ABN), and syncs directly into Xero, MYOB, and QuickBooks.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can my tradies use the mobile app offline in low-reception areas?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Our mobile Progressive Web App (PWA) operates with full offline capability. Technicians can view job sheets, update job statuses, fill safety SWMS checklists, snap site photos, and collect signatures with zero cellular signal. All data synchronizes the moment they return to coverage.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the AI voice receptionist handle Australian accents and trade slang?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Our AI receptionist uses specialized Australian acoustic models trained specifically on local accents and trade terminology. It understands terms like "hot water system", "switchboard", "rough-in", "sparky", "dunny", and "call-out fee". It answers incoming calls 24/7, qualifies the emergency, gathers job details, and books appointments onto your schedule.',
          },
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AustralianLandingPage />
    </>
  );
}
