import type React from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import type { FaqPair } from '../../../../src/features/forms/types/agent-types';

export type AgentStudioTab = 'overview' | 'knowledge' | 'channels' | 'test';

export const VOICE_TONES = [
  { key: 'friendly', label: 'Friendly', emoji: '😊', desc: 'Warm, helpful & conversational', quote: '“Hello! I would love to help you find the perfect time today!”' },
  { key: 'professional', label: 'Professional', emoji: '💼', desc: 'Direct, polished & courteous', quote: '“Good day. How may I assist you with your project inquiry?”' },
  { key: 'sales', label: 'Sales Focus', emoji: '🚀', desc: 'Proactive & value-driven', quote: '“Welcome! Ask me for today’s exclusive offers & rates!”' },
  { key: 'empathetic', label: 'Empathetic', emoji: '🤝', desc: 'Compassionate & reassuring', quote: '“We understand your needs and are here for you every step.”' },
] as const;

export const GREETING_STARTERS = [
  { title: 'Friendly Welcome', text: 'Hello and welcome! How can I assist you with our services today?' },
  { title: 'Booking Focus', text: 'Hi there! Ready to schedule an appointment or get an upfront quote? Ask me anything!' },
  { title: 'VIP Concierge', text: 'Welcome to our premium client desk. I can answer questions, check rates, and reserve your slot.' },
];

export const FAQ_CATEGORIES = ['All', 'Hours & Location', 'Pricing & Rates', 'Booking', 'Services', 'Policies'] as const;

export const FAQ_SUGGESTIONS: Array<{ question: string; defaultAnswer: string; category: string }> = [
  {
    question: 'What are your operating hours and open days?',
    defaultAnswer: 'We are open Monday to Saturday from 9:00 AM to 7:00 PM. Closed on Sundays.',
    category: 'Hours & Location',
  },
  {
    question: 'Where is your business located and do you offer on-site visits?',
    defaultAnswer: 'We are located at our main studio and also provide doorstep service across the local metro area.',
    category: 'Hours & Location',
  },
  {
    question: 'How do I book an appointment or consultation?',
    defaultAnswer: 'You can book instantly through our online booking link or by asking me right here to reserve a slot.',
    category: 'Booking',
  },
  {
    question: 'What payment methods do you accept?',
    defaultAnswer: 'We accept all major credit/debit cards, UPI, cash, and digital bank transfers.',
    category: 'Pricing & Rates',
  },
  {
    question: 'What is your rescheduling or cancellation policy?',
    defaultAnswer: 'You can reschedule or cancel free of charge up to 24 hours before your scheduled appointment.',
    category: 'Policies',
  },
  {
    question: 'Do you offer emergency or weekend services?',
    defaultAnswer: 'Yes, emergency requests are handled on priority. Please contact our support line directly for immediate dispatch.',
    category: 'Services',
  },
];

export interface IndustryTemplate {
  id: string;
  name: string;
  roleTitle: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  badge: string;
  tone: 'friendly' | 'professional' | 'sales' | 'empathetic';
  avatarUrl: string;
  welcomeGreeting: string;
  faqs: FaqPair[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'salon',
    name: 'Salon Concierge',
    roleTitle: 'Beauty & Hair Specialist',
    icon: 'content-cut',
    badge: 'Salon & Spa',
    tone: 'friendly',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Welcome to our salon! I can help you check services, view pricing, and reserve your appointment.',
    faqs: [
      { id: 'f1', question: 'What haircut and styling services do you provide?', answer: 'We offer precision hair cutting, blowouts, coloring, balayage, keratin treatments, and bridal styling.' },
      { id: 'f2', question: 'How can I book an appointment?', answer: 'You can book directly via our online booking link or message us here with your preferred time.' },
      { id: 'f3', question: 'Do you accept walk-ins?', answer: 'Walk-ins are welcome based on stylist availability, though we recommend booking in advance.' },
    ],
  },
  {
    id: 'contractor',
    name: 'Home Services Dispatch',
    roleTitle: 'Field Estimator & Dispatcher',
    icon: 'handyman',
    badge: 'Home Repair & HVAC',
    tone: 'professional',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Hello! Looking for repair, installation, or inspection? I can get you a quick quote or schedule a field visit.',
    faqs: [
      { id: 'f1', question: 'Do you offer free estimates?', answer: 'Yes, we provide free upfront estimates for all standard repair and installation jobs.' },
      { id: 'f2', question: 'What areas do you serve?', answer: 'We serve the entire metropolitan area and surrounding suburbs within a 25-mile radius.' },
      { id: 'f3', question: 'Are you licensed and insured?', answer: 'Yes, our team is fully licensed, bonded, and insured with a 100% satisfaction guarantee.' },
    ],
  },
  {
    id: 'healthcare',
    name: 'Clinic Patient Concierge',
    roleTitle: 'Patient Care Coordinator',
    icon: 'medical-services',
    badge: 'Healthcare & Dental',
    tone: 'empathetic',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813576-905c149eb569?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Hello and welcome. I am here to help you schedule appointments, review accepted insurance, and answer care inquiries.',
    faqs: [
      { id: 'f1', question: 'What insurance plans do you accept?', answer: 'We accept most major PPO and health insurance plans. Please contact our reception to verify your specific coverage.' },
      { id: 'f2', question: 'What should I bring for my first consultation?', answer: 'Please bring a valid photo ID, your insurance card, and any recent medical or dental records.' },
      { id: 'f3', question: 'What is your appointment cancellation policy?', answer: 'We kindly request at least 24 hours notice for any cancellations or rescheduling.' },
    ],
  },
  {
    id: 'sales',
    name: 'Client Advisor',
    roleTitle: 'Senior Account Executive',
    icon: 'trending-up',
    badge: 'Sales & Professional',
    tone: 'sales',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Hi there! Glad you stopped by. Tell me what service you need and I will guide you to the best package and pricing.',
    faqs: [
      { id: 'f1', question: 'What packages or pricing do you offer?', answer: 'We offer tailored plans suited for individuals and businesses. Let us know your requirements and we will send a customized proposal.' },
      { id: 'f2', question: 'How quickly can we get started?', answer: 'We can onboard and begin your project within 24 to 48 hours of agreement.' },
      { id: 'f3', question: 'How can I speak directly with a representative?', answer: 'Leave your phone number or email and our senior advisor will call you back within 15 minutes.' },
    ],
  },
];

export interface ChannelStatusData {
  whatsapp?: { connected: boolean; phoneNumber?: string; providerName?: string; reason?: string };
  phone?: { addonActive: boolean; phoneNumber?: string; status?: string };
  sms?: { connected: boolean };
}
