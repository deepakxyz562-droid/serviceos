import type { Metadata } from 'next';
import { ChatbotLandingClient } from './chatbot-landing-client';

export const metadata: Metadata = {
  title: 'AI Chatbot Builder for Business — No-Code 24/7 AI Employee | GPTForm',
  description:
    'Build, train, and deploy a custom AI chatbot in 30 seconds. Ingest your website and docs to answer FAQs, qualify leads, and book appointments across Web, WhatsApp & Instagram.',
  keywords: [
    'AI Chatbot builder',
    'business AI assistant',
    'Jotform AI chatbot alternative',
    'WhatsApp AI chatbot',
    'website chatbot generator',
    'lead qualification bot',
    'appointment booking chatbot',
  ],
  openGraph: {
    title: 'AI Chatbot Builder — Build Your AI Employee in Seconds',
    description:
      'Train an AI chatbot on your website URL or PDFs. Handles customer questions, qualifies leads, and books appointments 24/7.',
    type: 'website',
  },
};

export default function AiChatbotPage() {
  return <ChatbotLandingClient />;
}
