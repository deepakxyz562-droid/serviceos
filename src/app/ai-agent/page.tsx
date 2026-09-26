import type { Metadata } from 'next';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { AiAgentLandingClient } from './ai-agent-landing-client';

export const metadata: Metadata = {
  title: "AI Agent — Your Website's 24/7 AI Employee | Fieseros",
  description:
    'Hire an autonomous AI Employee for your website. Ingests your business knowledge in 60s, answers questions, checks technician schedules, generates quotes, and takes credit card payments with enterprise guardrails.',
  keywords: [
    'AI employee',
    'AI agent for business',
    'autonomous AI workforce',
    'AI receptionist',
    'AI dispatch agent',
    'website AI worker',
    'multimodal AI agent',
    'enterprise AI guardrails',
    'Fieseros AI Studio',
  ],
  alternates: {
    canonical: 'https://fieseros.com/ai-agent',
  },
  openGraph: {
    title: "AI Agent — Your Website's 24/7 AI Employee | Fieseros",
    description:
      'Train an autonomous AI Employee in 60 seconds. Books appointments, quotes prices, and manages customer CRM 24/7 across web and phone.',
    url: 'https://fieseros.com/ai-agent',
    siteName: 'Fieseros AI Studio',
    images: [
      {
        url: 'https://fieseros.com/og-ai-agent.png',
        width: 1200,
        height: 630,
        alt: "Fieseros 24/7 AI Employee",
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Your Website's 24/7 AI Employee | Fieseros",
    description:
      'Train in 60s. Books appointments, calculates quotes, and collects payments 24/7 with zero human delay.',
    images: ['https://fieseros.com/og-ai-agent.png'],
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

export default function AiAgentPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://fieseros.com/ai-agent#software',
        name: 'Fieseros AI Employee & Autonomous Agent',
        url: 'https://fieseros.com/ai-agent',
        operatingSystem: 'All (Web, iOS, Android)',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Autonomous AI Employee & Booking Receptionist',
        description:
          'Autonomous multimodal AI business employee that handles customer intake, live quote calculation, calendar dispatch, and payment processing 24/7.',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.95',
          reviewCount: '1420',
          bestRating: '5',
          worstRating: '1',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is the difference between a chatbot and an AI Employee?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A chatbot replies with conversational text. An AI Employee performs real operational actions: scheduling jobs into your calendar, calculating price quotes from formulas, writing records into your CRM, and taking credit card payments.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can our human staff step in during a conversation?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. At any point, the AI Employee can notify your team via SMS, email, or Slack. You can take over live with the full conversation history preserved.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does the AI Employee handle phone calls?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Every AI Employee can be assigned a dedicated phone number. When customers call, the agent speaks with human-grade natural voice synthesis and books appointments directly into your system.',
            },
          },
        ],
      },
    ],
  };

  return (
    <AiMarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AiAgentLandingClient />
    </AiMarketingLayout>
  );
}
