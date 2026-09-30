import type { Metadata } from 'next';
import { GptFormClientView } from './gptform-client';

export const metadata: Metadata = {
  title: 'GPTForm — AI Intake Employee: Turn Website Visitors Into Qualified Customers',
  description:
    'GPTForm is an AI intake employee that talks to your website visitors, collects the right information, qualifies requests, books appointments, and takes payments. Not just a form builder — a 24/7 AI employee.',
  keywords: [
    'AI intake employee',
    'AI intake agent',
    'AI customer intake',
    'AI employee for website',
    'AI receptionist',
    'AI lead qualification',
    'conversational AI intake',
    'AI booking agent',
    'AI form builder',
    'Jotform alternative',
    'Typeform alternative',
    'Fieseros GPTForm',
  ],
  alternates: {
    canonical: 'https://fieseros.com/gptform',
  },
  openGraph: {
    title: 'GPTForm — AI Intake Employee: Turn Website Visitors Into Qualified Customers',
    description:
      'An AI employee that talks to your website visitors, collects the right information, qualifies requests, books appointments, and takes payments. 24/7, in any industry.',
    url: 'https://fieseros.com/gptform',
    siteName: 'GPTForm',
    images: [
      {
        url: 'https://fieseros.com/og-gptform.png',
        width: 1200,
        height: 630,
        alt: 'GPTForm AI Intake Employee — Turn Website Visitors Into Qualified Customers',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GPTForm — AI Intake Employee',
    description:
      'Turn your website into a 24/7 AI employee that interviews customers, qualifies requests, books appointments, and takes payments.',
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
        name: 'GPTForm AI Intake Employee',
        url: 'https://fieseros.com/gptform',
        operatingSystem: 'All (Web, iOS, Android)',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'AI Customer Intake & Autonomous Action Platform',
        description:
          'GPTForm is an AI intake employee that turns website visitors into qualified customers. It interviews customers conversationally, collects photos and documents, qualifies requests, books appointments, and takes payments — 24/7, in any industry.',
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
            description: '3 active forms, 100 submissions/mo, 33+ payment gateways, 0% platform fees.',
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
            description: '10 active forms, 1,000 submissions/mo, dynamic math calculations, digital e-signatures.',
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
            description: 'Unlimited forms, 10,000 submissions/mo, conversational AI form agents, white-labeling.',
          },
        ],
        featureList: [
          'AI employee that interviews customers conversationally',
          'Collects photos, documents, and project scope in chat',
          'Qualifies leads with urgency scoring (Hot / Warm / Cold)',
          'Books confirmed appointments with live calendar availability',
          'Accepts payments via 33+ gateways with 0% platform fees',
          'AI form generator with natural language',
          '20,000+ industry-specific templates',
          '1-click embed on WordPress, Webflow, Shopify, Wix, Squarespace & HTML',
          'Webhooks and integrations to HubSpot, Salesforce, Zapier, Slack',
          'Hosted intake pages for SMS, Instagram bio, and Google Business',
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
            name: 'GPTForm AI Form Builder',
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
            name: 'How does the AI Form Generator work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You describe your form in plain English (e.g., "Build an emergency plumbing intake form with an address picker, quote calculation, and Stripe checkout"). GPTForm generates fields, formulas, validation logic, and design themes in under 10 seconds.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is an AI Intake Employee?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'An AI Intake Employee is a 24/7 AI agent that lives on your website. It greets visitors, interviews them conversationally to understand their needs, collects photos and documents, qualifies the request (Hot / Warm / Cold), books appointments with live calendar availability, and takes payments — all without human intervention. The form builder is underneath; the AI employee is the product.',
            },
          },
          {
            '@type': 'Question',
            name: 'How is GPTForm different from Jotform and Typeform?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Jotform and Typeform are form builders — they collect text responses that sit in an inbox. GPTForm is an AI employee that has a real conversation with your customer, understands their intent, asks only the necessary questions, collects photos of the problem, qualifies the lead, books a confirmed appointment, and sends the structured submission to your CRM or webhook. The form is just the interface; the autonomous intake-to-action workflow is the product.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I calculate complex math formulas and date differences?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. GPTForm includes a visual Formula Pad supporting arithmetic (+, -, *, /), date math differences ((checkout - checkin) * daily_rate), multi-select checkbox summation, conditional booleans, and standard Math functions (round, floor, ceil, max, min).',
            },
          },
          {
            '@type': 'Question',
            name: 'What is an AI Form Agent?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'An AI Form Agent transforms static form questions into a natural, conversational customer dialogue. Visitors can chat or speak, upload damage photos, and schedule appointments while the AI validates input and fills structured CRM fields automatically.',
            },
          },
          {
            '@type': 'Question',
            name: 'Which payment gateways are supported and what are the fees?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'GPTForm connects to 33+ gateways including Stripe, Square, PayPal, Razorpay, Apple Pay, Google Pay, Afterpay, Klarna, GoCardless, and Mollie. Fieseros charges 0% platform transaction fees—you only pay your payment processor standard interchange rate.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I embed GPTForm on my website?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'GPTForm embeds in 1 click using a single line of JavaScript, responsive iframe, or popover modal. It works seamlessly on WordPress, Webflow, Shopify, Wix, Squarespace, Framer, and custom HTML websites.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does live calendar booking prevent double-bookings?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'GPTForm integrates directly with Google Calendar, Outlook 365, and ServiceOS CRM schedules. It verifies technician availability in real time and offers next best slots with travel buffer calculations.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I capture legally binding digital signatures?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. GPTForm includes an HTML5 smooth canvas E-Signature widget with timestamping, IP logging, and integration with Adobe Sign and DocuSign for compliance.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is GPTForm secure and GDPR/CCPA compliant?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. All submissions are encrypted in transit via TLS 1.3 and at rest with 256-bit AES encryption. GPTForm supports Cloudflare Turnstile bot protection, reCAPTCHA v3, and strict data privacy compliance.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is there a free plan?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. The Free Forever tier gives you 3 active smart forms, 100 monthly submissions, 33+ payment gateways with 0% fees, and full access to our 20,000+ template library without requiring a credit card.',
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
