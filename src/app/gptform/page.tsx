import type { Metadata } from 'next';
import { GptFormClientView } from './gptform-client';

export const metadata: Metadata = {
  title: 'GPTForm™ — Your Business. One AI-Powered Page. | Forms, Booking & Payments',
  description:
    'One link to talk to customers, capture leads, book appointments, sell services, and get paid. Replace Linktree, Typeform, Calendly, and Topmate with an all-in-one AI page with 0% platform fees.',
  keywords: [
    'GPTForm',
    'AI business page',
    'one link for your business',
    'link in bio with booking',
    'Topmate alternative',
    'Linktree alternative',
    'Calendly alternative',
    'Typeform alternative',
    'AI form builder',
    'AI intake agent',
    'consultation booking page',
    'sell digital products 0 percent fee',
    'creator storefront',
    'Fieseros AI Studio',
  ],
  alternates: {
    canonical: 'https://fieseros.com/gptform',
  },
  openGraph: {
    title: 'GPTForm™ — Your Business. One AI-Powered Page.',
    description:
      'One link to talk to customers, capture leads, book appointments, sell services, and get paid. 0% platform fees.',
    url: 'https://fieseros.com/gptform',
    siteName: 'Fieseros AI Service OS',
    images: [
      {
        url: 'https://fieseros.com/og-gptform.png',
        width: 1200,
        height: 630,
        alt: 'GPTForm — Your Business. One AI-Powered Page.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GPTForm™ — Your Business. One AI-Powered Page.',
    description:
      'One link to talk to customers, capture leads, book appointments, sell services, and get paid with 0% platform transaction fees.',
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

export default function GptFormPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://fieseros.com/gptform#software',
        name: 'GPTForm™ AI Business Page & Smart Forms',
        url: 'https://fieseros.com/gptform',
        operatingSystem: 'All (Web, iOS, Android)',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'AI Business Page, Scheduling & Conversational Intake',
        description:
          'Unified AI-powered business page and smart form platform. One link to talk to customers, capture leads, schedule calendar bookings, sell services & digital products, and process payments with 0% platform fees.',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '2480',
          bestRating: '5',
          worstRating: '1',
        },
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Forever Plan',
            price: '0',
            priceCurrency: 'USD',
            description: '1 AI business page, 3 smart forms, 100 submissions/mo, 1:1 scheduling, 0% platform transaction fees.',
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
            description: 'Custom domain, unlimited services, 1,000 submissions/mo, dynamic math calculations, digital signatures.',
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
            description: 'Unlimited pages & forms, 10,000 submissions/mo, 24/7 AI conversational agent, white-labeling.',
          },
        ],
        featureList: [
          'Unified AI-powered public profile page (fieseros.com/p/yourname)',
          '24/7 conversational AI assistant trained on your knowledge base',
          '1:1 & group calendar booking with Google Calendar / Outlook sync',
          'Direct service monetization (Topmate-style paid calls, priority Q&A, digital downloads)',
          'Natural language AI smart form builder with JotForm-grade calculations',
          '33+ Connected payment gateways (Stripe, Creem MoR, UPI, Apple Pay) with 0% platform fees',
          'Automatic unified CRM lead capture and pipeline tracking',
          '20,000+ free canonical industry templates',
          '1-click embed on WordPress, Webflow, Shopify, Framer, and custom HTML',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://fieseros.com/gptform#breadcrumb',
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
            name: 'GPTForm AI Business Page',
            item: 'https://fieseros.com/gptform',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://fieseros.com/gptform#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is GPTForm and how does the AI Business Page work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'GPTForm is your all-in-one AI-powered business page. Instead of sending visitors to multiple disconnected tools (Linktree, Typeform, Calendly, and Stripe), GPTForm gives you a single link (fieseros.com/p/yourname) where visitors can chat with your 24/7 AI assistant, fill project intake forms, book 1:1 consultations, buy digital products, and pay securely.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I replace Linktree, Calendly, and Typeform with GPTForm?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! GPTForm replaces your entire disconnected tool stack. You get an AI-powered link-in-bio, automated calendar scheduling, multi-step intake forms, digital product checkouts, and CRM lead capture all in one unified platform—saving you over $130 per month.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does the 24/7 AI Assistant work on my page?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Your personal AI assistant is trained on your bio, portfolio, pricing, services, and FAQs. When potential clients visit your page, the AI answers their questions, clarifies requirements, recommends the right service, and guides them straight into booking or submitting a proposal.',
            },
          },
          {
            '@type': 'Question',
            name: 'What are the platform transaction fees?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'GPTForm charges 0% platform transaction fees. Whether you sell a $99 strategy session, a $49 digital guide, or accept a deposit on a $5,000 project, you keep 100% of your earnings minus your processor standard interchange fee (Stripe or Creem MoR).',
            },
          },
          {
            '@type': 'Question',
            name: 'Which payment methods and currencies are supported?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We support 33+ global payment gateways including Stripe, Creem MoR, Apple Pay, Google Pay, credit/debit cards, and UPI (India). Currencies automatically adapt based on visitor location (e.g. USD, EUR, GBP, INR, CAD, AUD).',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I still build standalone embeddable forms?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Absolutely! You can build standalone forms, price quote calculators, customer surveys, and payment forms and embed them in 1 click into WordPress, Webflow, Shopify, Framer, Squarespace, or HTML.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does the 1:1 scheduling sync with my calendar?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'GPTForm synchronizes bidirectionally with Google Calendar and Outlook 365. It respects your existing busy times, sets custom buffer zones between meetings, and automatically generates Google Meet or Zoom video links upon booking.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is there a free forever plan?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! Our Free Forever tier gives you 1 AI-powered business page, 3 smart forms, 100 submissions per month, calendar booking, 0% platform fees, and access to 20,000+ templates with no credit card required.',
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
      <GptFormClientView />
    </>
  );
}
