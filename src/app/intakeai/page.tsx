import type { Metadata } from 'next';
import { IntakeAiClientView } from './intake-ai-client';

export const metadata: Metadata = {
  title: 'IntakeAI — Autonomous AI Customer Intake, Scheduling & Lead Qualification',
  description:
    'IntakeAI is a 24/7 autonomous AI employee for Web Chat, Voice Calls, SMS, and WhatsApp. It interviews inbound leads, qualifies budgets, schedules calendar appointments, and takes payments in real time.',
  keywords: [
    'IntakeAI',
    'AI customer intake',
    'AI intake employee',
    'AI receptionist',
    'AI lead qualification',
    'autonomous AI appointment booking',
    'conversational intake agent',
    'AI voice intake',
    'Chatley alternative',
    'SiteGPT alternative',
    'Fieseros IntakeAI',
  ],
  alternates: {
    canonical: 'https://fieseros.com/intakeai',
  },
  openGraph: {
    title: 'IntakeAI — Autonomous AI Customer Intake, Scheduling & Lead Qualification',
    description:
      'Turn every inbound caller and visitor into a confirmed customer. Autonomous 24/7 intake agent across Voice, Web, SMS & WhatsApp.',
    url: 'https://fieseros.com/intakeai',
    siteName: 'IntakeAI',
    images: [
      {
        url: 'https://fieseros.com/og-gptform.png',
        width: 1200,
        height: 630,
        alt: 'IntakeAI — Autonomous AI Customer Intake & Lead Qualification',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IntakeAI — Autonomous AI Customer Intake & Scheduling',
    description:
      'Turn every website visitor into a confirmed appointment with 24/7 AI Voice, Chat, and SMS intake.',
    images: ['https://fieseros.com/og-gptform.png'],
    creator: '@fieseros',
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

export default function IntakeAiPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://fieseros.com/intakeai#software',
        name: 'IntakeAI Autonomous Customer Intake Agent',
        url: 'https://fieseros.com/intakeai',
        operatingSystem: 'All (Web, iOS, Android, Telephony)',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'AI Customer Intake & Autonomous Action Platform',
        description:
          'IntakeAI is an autonomous AI employee that turns inbound inquiries into booked appointments and qualified sales leads across Voice, Web Chat, SMS, and WhatsApp.',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '1920',
          bestRating: '5',
          worstRating: '1',
        },
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Forever Plan',
            price: '0',
            priceCurrency: 'USD',
            description: '1 active intake agent, 100 inbound conversations/mo, live Google/Outlook booking, 0% fees.',
          },
          {
            '@type': 'Offer',
            name: 'Starter Plan',
            price: '10.00',
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '10.00',
              priceCurrency: 'USD',
              unitCode: 'MON',
            },
            description: '5 active agents, 1,000 conversations/mo, lead qualification scoring, SMS follow-up recovery.',
          },
          {
            '@type': 'Offer',
            name: 'Business Plan',
            price: '19.00',
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '19.00',
              priceCurrency: 'USD',
              unitCode: 'MON',
            },
            description: 'Unlimited agents, 10,000 conversations/mo, dedicated AI voice phone number, two-way WhatsApp routing.',
          },
        ],
        featureList: [
          '24/7 Autonomous Voice & Chat Intake Receptionist',
          'Intelligent Lead Qualification & Hot/Warm/Cold Scoring',
          'Live Calendar Scheduling with Google Calendar & Outlook 365',
          'Multimodal Vision & Diagnostic Photo/Document Collection',
          'Automated 15-Minute Abandoned Lead SMS Follow-up Nudges',
          'Direct Stripe & Square Payments with 0% Platform Fees',
          'Hosted Intake URLs (/intake/your-company) for Social Bio & Google Business',
          '1-Click Embed Widget for WordPress, Webflow, Shopify, Wix, Squarespace',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://fieseros.com/intakeai#breadcrumb',
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
            name: 'IntakeAI',
            item: 'https://fieseros.com/intakeai',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://fieseros.com/intakeai#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What makes IntakeAI different from a traditional chatbot?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Traditional chatbots follow rigid rule trees. IntakeAI is an autonomous agent trained on your business knowledge that actively extracts structured lead data, verifies calendar availability, scores lead urgency (Hot/Warm/Cold), and takes real actions like scheduling and sending SMS follow-ups.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can IntakeAI answer phone calls as an AI Voice Receptionist?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! On the Business plan, you can connect a dedicated phone number (via Twilio/Vapi). IntakeAI answers inbound calls with natural voice audio, speaks with callers, and books slots directly into your calendar.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does live calendar booking prevent double-bookings?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'IntakeAI syncs directly with Google Calendar and Outlook 365 schedules in real time, verifying busy slots and travel buffers before offering times to customers.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does Lead Scoring (Hot/Warm/Cold) work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'IntakeAI analyzes the customer budget, timeline urgency, and problem severity, tagging high-urgency requests as HOT LEADS and immediately sending priority alerts to your phone.',
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <IntakeAiClientView />
    </>
  );
}
