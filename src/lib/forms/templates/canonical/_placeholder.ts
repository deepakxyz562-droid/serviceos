/**
 * Placeholder canonical template file.
 *
 * This file exists so `index.ts` has something to import before T1.2
 * populates the real canonical/*.ts files. It registers a single
 * "Contact Form" template so the registry is non-empty and the search
 * engine has something to return during development.
 *
 * T1.2 will delete this file and replace it with 50 real templates
 * across 3 subagent groups.
 */
import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

const CONTACT_FORM_TEMPLATE: FormTemplate = {
  id: 'contact-form',
  name: 'Contact Form',
  shortDescription: 'A simple contact form for general inquiries and messages.',
  description:
    'Capture customer inquiries, support requests, and general messages. This is the foundational contact form that works for any business website.',
  schema: {
    version: 1,
    steps: [{ id: 'step-1', title: 'Contact Us' }],
    fields: [
      {
        id: 'name',
        type: 'short_answer',
        label: 'Full Name',
        placeholder: 'Jane Doe',
        required: true,
        width: 'half',
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'jane@example.com',
        required: true,
        width: 'half',
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        placeholder: '+1 (555) 000-0000',
        width: 'half',
      },
      {
        id: 'subject',
        type: 'short_answer',
        label: 'Subject',
        placeholder: 'How can we help?',
        required: true,
        width: 'half',
      },
      {
        id: 'message',
        type: 'long_answer',
        label: 'Message',
        placeholder: 'Tell us more about your inquiry...',
        required: true,
        width: 'full',
      },
    ],
    rules: [],
    theme: {
      primaryColor: '#059669',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      borderRadius: '0.75rem',
      layout: 'card',
    },
    settings: {
      submitButtonText: 'Send Message',
      successTitle: 'Thank you!',
      successMessage: 'We have received your message and will get back to you within 24 hours.',
      actions: {},
    },
  },
  categories: ['contact', 'lead_generation'],
  industries: ['general'],
  useCases: ['lead_generation'],
  audiences: ['b2c', 'b2b'],
  tags: ['mobile-friendly', 'embeddable', 'english'],
  source: 'curated',
  status: 'published',
  isFeatured: true,
  isPublic: true,
  usageCount: 0,
  viewCount: 0,
  cloneCount: 0,
  seo: {
    seoTitle: 'Contact Form Template — Free & Mobile-Friendly',
    seoDescription:
      'A clean, responsive contact form template that works for any business. Capture inquiries, support requests, and messages. Free to use.',
    seoKeywords: ['contact form', 'inquiry form', 'message form', 'website contact'],
    faq: [
      {
        question: 'What is a contact form?',
        answer:
          'A contact form is a web form that lets visitors send messages directly to the business without exposing the business email address. It typically collects name, email, and message.',
      },
      {
        question: 'Can I customize this form?',
        answer:
          'Yes. Once you use this template, you can add, remove, or edit any field in the form builder. You can also change colors, add your logo, and configure submission actions.',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

registerTemplate(CONTACT_FORM_TEMPLATE);
