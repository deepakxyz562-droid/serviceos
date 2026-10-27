import type { Metadata } from 'next';
import AustralianLandingPage from '@/components/au/au-landing-page';
import { auFaqs } from '@/components/au/au-faqs';

export const metadata: Metadata = {
  title: 'Field Service Software for Australia | Fieseros Tradie CRM, Scheduling & AI Receptionist',
  description:
    'The all-in-one operating system for Australian tradies. Smart dispatch, quotes, invoices, a mobile workspace, and AI phone reception. Book a free demo for your trade business.',
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
      'Manage customers, quotes, schedules and invoices in the office or on the tools. Built for Australian tradies with AI call answering and connected job management.',
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
        description: 'Free demo for Australian trade businesses',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Australia',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: auFaqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
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
