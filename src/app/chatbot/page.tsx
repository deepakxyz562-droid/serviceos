import type { Metadata } from 'next';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { ChatbotLandingClient } from './chatbot-landing-client';

export const metadata: Metadata = {
  title: 'AI Chatbot Builder — Build an AI Chatbot That Actually Does Something | Fieseros',
  description:
    'Most chatbots just regurgitate canned FAQs. Fieseros AI Chatbots qualify leads, book appointments into your live calendar, calculate exact price quotes, and collect payments directly in conversation with 0% platform fees.',
  keywords: [
    'AI Chatbot Builder',
    'autonomous AI chatbot',
    'conversational AI bot',
    'chatbot that books appointments',
    'AI lead generation chatbot',
    'website chatbot widget',
    'WhatsApp AI bot',
    'Jotform chatbot alternative',
    'ChatBot.com alternative',
    'AI chatbot with payments',
    'Fieseros AI Studio',
  ],
  alternates: {
    canonical: 'https://fieseros.com/chatbot',
  },
  openGraph: {
    title: 'AI Chatbot Builder — Build an AI Chatbot That Actually Does Something | Fieseros',
    description:
      'Qualify leads, book appointments, calculate live quotes, and process credit cards directly in chat. 16 channels, 60-second knowledge training, and 0% platform fees.',
    url: 'https://fieseros.com/chatbot',
    siteName: 'Fieseros AI Studio',
    images: [
      {
        url: 'https://fieseros.com/og-chatbot.png',
        width: 1200,
        height: 630,
        alt: 'Fieseros AI Chatbot Builder',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Build an AI Chatbot That Actually Does Something | Fieseros',
    description:
      'Qualify leads, book calendar slots, generate binding quotes, and collect payments in chat. 0% platform transaction fees.',
    images: ['https://fieseros.com/og-chatbot.png'],
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

export default function ChatbotPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://fieseros.com/chatbot#software',
        name: 'Fieseros AI Chatbot Builder',
        url: 'https://fieseros.com/chatbot',
        operatingSystem: 'All (Web, iOS, Android)',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Autonomous Conversational AI Chatbot',
        description:
          'Next-generation autonomous AI chatbot builder that connects directly to live CRM dispatch, calendar scheduling, quote formulas, and payment processing with 0% platform fees.',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '1840',
          bestRating: '5',
          worstRating: '1',
        },
        offers: {
          '@type': 'Offer',
          name: 'Free AI Chatbot Tier',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free chatbot with 1-line website embed, 60s document training, and 0% transaction fees.',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How is Fieseros different from ChatBot.com or ordinary chatbots?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Traditional chatbots only answer canned questions with generic text snippets. Fieseros AI Chatbots are autonomous agents connected directly to your business logic: they qualify leads, check live calendars, schedule technicians, generate binding quotes, and process credit card payments with 0% platform transaction fees.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I turn my existing Fieseros GPTForm into a chatbot?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! In 1 click, any form you build in GPTForm can be paired with an AI Chatbot. The chatbot uses your form fields to guide customers through a conversational slot-filling intake flow.',
            },
          },
          {
            '@type': 'Question',
            name: 'How long does it take to train the chatbot on my business?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Under 60 seconds. Simply paste your website URL, upload your service pricing PDF or customer FAQ document, and our indexing engine will ingest your materials and prepare your agent.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Fieseros take a percentage of payments collected through the chatbot?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. Fieseros charges 0% platform transaction fees. You only pay standard Stripe or PayPal merchant processing fees.',
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
      <ChatbotLandingClient />
    </AiMarketingLayout>
  );
}
