import type { Metadata } from 'next';
import { GptFormClientView } from './gptform-client';

export const metadata: Metadata = {
  title: 'GPTForm™ — Free AI Form Builder, Online Forms & Conversational Booking',
  description:
    'Build high-converting smart forms in seconds with AI. JotForm-grade visual form builder with live formula calculations, 33+ payment gateways, conversational AI agents, and 20,000+ templates with 0% platform fees.',
  keywords: [
    'AI form builder',
    'free online form builder',
    'Jotform alternative',
    'Typeform alternative',
    'conversational form builder',
    'form calculation widget',
    'online form creator',
    'payment forms 0 percent fee',
    'Stripe payment forms',
    'quote calculator form',
    'booking form scheduler',
    'multi step form builder',
    'AI intake agent',
    'Fieseros GPTForm',
  ],
  alternates: {
    canonical: 'https://fieseros.com/gptform',
  },
  openGraph: {
    title: 'GPTForm™ — Free AI Form Builder, Online Forms & Conversational Booking',
    description:
      'Build smart online forms, live price calculators, and conversational AI booking agents in seconds. Connect 33+ payment gateways with 0% platform transaction fees.',
    url: 'https://fieseros.com/gptform',
    siteName: 'Fieseros AI Service OS',
    images: [
      {
        url: 'https://fieseros.com/og-gptform.png',
        width: 1200,
        height: 630,
        alt: 'GPTForm AI Form Builder & Conversational Intake Engine',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GPTForm™ — Free AI Form Builder & Conversational Intake Engine',
    description:
      'Turn online forms and website conversations into booked jobs and direct payments. 33+ gateways, 0% fees, JotForm-grade calculations.',
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
        name: 'GPTForm™ AI Form Builder',
        url: 'https://fieseros.com/gptform',
        operatingSystem: 'All (Web, iOS, Android)',
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Online Form Builder & Conversational Intake',
        description:
          'AI-powered online form builder, live pricing formula calculator, and conversational intake engine with 33+ payment gateways and 0% platform fees.',
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
          'Natural language AI form generator',
          'JotForm-grade visual formula calculation pad',
          'Date difference calculation (checkout - checkin)',
          '33+ Connected payment gateways with 0% platform fees',
          '4 runtime modes: Classic Grid, Focus Card Stepper, Chatbot, Voice AI Agent',
          '20,000+ free canonical industry form templates',
          'HTML5 smooth canvas digital e-signatures',
          'Direct appointment scheduling with calendar availability sync',
          'Elementor-style 2-column live estimate breakdown',
          '1-click embed on WordPress, Webflow, Shopify, Wix, Squarespace & HTML',
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
            name: 'How is GPTForm different from Jotform and Typeform?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Unlike traditional form builders that lock forms into a single layout, GPTForm provides 4 runtime modes in one schema (Classic Paper, Focus Card Stepper, Interactive Chat, and Voice AI Agent). Furthermore, GPTForm supports 33+ payment gateways with 0% platform transaction fees, JotForm-grade visual formula calculations, and 20,000+ free canonical templates.',
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
