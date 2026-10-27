import type { Metadata } from 'next';
import AustralianLandingPage from '@/components/au/au-landing-page';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [
    { slug: 'field-service' },
    { slug: 'repeat-jobs' },
    { slug: 'recurring-jobs' },
    { slug: 'ai-receptionist' },
    { slug: 'tradie-software' },
    { slug: 'tradie-ai' },
    { slug: 'plumbing' },
    { slug: 'electrical' },
    { slug: 'hvac' },
    { slug: 'cleaning' },
    { slug: 'landscaping' },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  let title = 'Field Service Software for Australia | Fieseros Tradie CRM, Scheduling & AI Receptionist';
  let description =
    'The all-in-one operating system for Australian tradies. Smart dispatch, quotes, invoices, a mobile workspace, and AI phone reception.';

  if (slug === 'field-service' || slug === 'tradie-software') {
    title = 'Field Service Software Australia | Fieseros Tradie Job Management & Invoicing';
    description =
      'Manage jobs, customers, scheduling and invoices in one Australian field service platform. Built for plumbers, electricians, HVAC & cleaners.';
  } else if (slug === 'repeat-jobs' || slug === 'recurring-jobs') {
    title = 'Recurring Job Scheduling Software Australia | Fieseros Tradie Operating System';
    description =
      'Schedule recurring jobs weekly, fortnightly, or monthly with Fieseros. Manage repeat cleaning, lawn care, gardening, and maintenance contracts in one place.';
  } else if (slug === 'ai-receptionist' || slug === 'tradie-ai') {
    title = '24/7 AI Receptionist for Australian Tradies | Fieseros Call Answering & Quoting';
    description =
      'Answer incoming calls, qualify emergencies, and quote jobs while you are on the tools. Explore AI call answering for Australian service businesses.';
  }

  return {
    title,
    description,
    keywords: [
      'tradie software australia',
      'field service management software au',
      'plumber software melbourne',
      'electrician quoting app sydney',
      'ai receptionist for tradies',
      'australian tradie job management',
      'recurring job scheduling tradies',
      'servicem8 alternative',
      'jobber alternative australia',
      'xero tradie software',
      'field service software australia',
    ],
    alternates: {
      canonical: 'https://fieseros.com/au',
    },
    openGraph: {
      title,
      description,
      url: `https://fieseros.com/au/${slug}`,
      siteName: 'Fieseros Australia',
      locale: 'en_AU',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function AustralianSlugPage({ params }: Props) {
  const { slug } = await params;

  return <AustralianLandingPage activeCategory={slug} />;
}
