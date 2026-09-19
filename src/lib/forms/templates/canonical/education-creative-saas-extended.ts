/**
 * Canonical Form Templates — Creative Agencies, Digital SaaS & Education Extended (2026 Edition)
 *
 * Curated high-converting tech & creative templates:
 * - High-End UI/UX Web Design & Brand Strategy Discovery
 * - Enterprise SaaS Product Demo & Custom Solution Request
 * - Private Academy Student Admission & Academic Profile
 * - Custom Software Development Scope & Technical RFP
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

function makeTechTemplate(
  id: string,
  name: string,
  shortDescription: string,
  description: string,
  category: string,
  industry: string,
  color: string,
  fields: any[],
  steps: any[],
  seoKeywords: string[],
  faq: { question: string; answer: string }[],
  mediaUrl?: string
): FormTemplate {
  return {
    id,
    name,
    shortDescription,
    description,
    schema: {
      version: 1,
      steps: steps.length > 0 ? steps : [{ id: 'step-1', title: 'Project Overview' }],
      fields,
      rules: [],
      theme: {
        primaryColor: color,
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: '1rem',
        inputBorderRadius: '0.75rem',
        inputHeight: 'large',
        cardBackground: 'rgba(255, 255, 255, 0.98)',
        showTopBorder: true,
        layout: 'multi_step',
        mediaPanel: {
          enabled: true,
          position: 'left',
          splitRatio: '40-60',
          mediaType: 'image',
          mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          badgeText: '🚀 2026 Digital Innovation & Enterprise Strategy',
          headline: name,
          subtitle: shortDescription,
          benefitsList: [
            'Direct discovery session with principal engineers & design directors',
            'Interactive Figma prototypes & technical roadmap architecture',
            'SOC2 & GDPR enterprise compliance ready',
          ],
        },
      },
      settings: {
        submitButtonText: 'Schedule Architecture Discovery 🚀',
        successTitle: 'Project Scope Received!',
        successMessage: 'Our solutions engineering team is reviewing your project requirements and will prepare your tailored architecture overview.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true, source: `tech_${id}` },
        },
      },
    },
    categories: [category as any, 'lead_generation', 'request'],
    industries: [industry as any, 'technology', 'saas'],
    useCases: ['lead_capture', 'quote_request', 'consultation'],
    audiences: ['b2b', 'enterprise'],
    tags: ['saas', 'design-agency', 'software', 'technology', '2026-ui'],
    fieldTypes: fields.map((f) => f.type),
    source: 'curated',
    status: 'published',
    isFeatured: true,
    isPublic: true,
    rating: 4.99,
    ratingCount: 140,
    usageCount: 2200,
    estimatedMinutes: 3,
    seo: {
      seoTitle: `${name} | Interactive Enterprise Scope & Discovery`,
      seoDescription: `${shortDescription} Multi-step agency & SaaS discovery with budget tiering and technical stack selector.`,
      seoKeywords,
      faq,
    },
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-09-19T00:00:00Z',
  };
}

// 1. UI/UX & Web Design Agency Brief
const WEB_DESIGN_BRIEF = makeTechTemplate(
  'uiux-web-design-creative-brief',
  'UI/UX Web Design & Brand Identity Creative Brief',
  'High-impact agency discovery questionnaire capturing conversion goals, design aesthetic, and tech stack.',
  'For digital agencies and design studios. Gathers target audience personas, brand positioning, CMS preferences (Next.js, Webflow, Shopify), and launch timelines.',
  'request',
  'agency',
  '#6366f1',
  [
    { id: 'company_name', type: 'short_answer', label: 'Company / Brand Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'contact_name', type: 'short_answer', label: 'Primary Stakeholder Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'email', type: 'email', label: 'Work Email', required: true, width: 'half', stepId: 'step-1' },
    { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half', stepId: 'step-1' },
    { id: 'current_website', type: 'short_answer', label: 'Current Website URL (if redesign)', placeholder: 'https://yourbrand.com', width: 'full', stepId: 'step-1' },
    { id: 'project_type', type: 'checkbox', label: 'Deliverables Needed', required: true, width: 'full', stepId: 'step-2',
      options: [{ label: 'Complete Web Application / Platform UI/UX', value: 'webapp' }, { label: 'High-Converting Marketing Website Redesign', value: 'marketing_site' }, { label: 'Comprehensive Brand Identity & Design System', value: 'brand' }, { label: 'E-Commerce Custom Storefront (Shopify / Headless)', value: 'ecommerce' }] },
    { id: 'budget_tier', type: 'dropdown', label: 'Allocated Project Budget', required: true, width: 'half', stepId: 'step-2',
      options: [{ label: '$15,000 – $30,000', value: '15_30' }, { label: '$30,000 – $60,000 (Standard Growth)', value: '30_60' }, { label: '$60,000 – $120,000 (Enterprise Brand)', value: '60_120' }, { label: '$120,000+ (Full Custom Architecture)', value: '120_plus' }] },
    { id: 'launch_target', type: 'dropdown', label: 'Target Launch Deadline', width: 'half', stepId: 'step-2',
      options: [{ label: 'Within 6 to 8 Weeks', value: 'fast' }, { label: 'Within 3 to 4 Months', value: 'standard' }, { label: 'Flexible / Quality Focused', value: 'flexible' }] },
  ],
  [{ id: 'step-1', title: 'Company & Stakeholder' }, { id: 'step-2', title: 'Project Scope & Investment' }],
  ['web design creative brief', 'ui ux agency intake form', 'website redesign questionnaire', 'agency discovery template'],
  [{ question: 'What does the design phase entail?', answer: 'Our process includes user persona research, interactive Figma wireframes, high-fidelity UI design systems, and component handoff.' }],
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80'
);

// 2. Enterprise SaaS Product Demo
const SAAS_DEMO = makeTechTemplate(
  'enterprise-saas-custom-demo',
  'Enterprise SaaS Platform VIP Live Demonstration',
  'Qualification intake for custom software demos capturing seat count, existing tools, and security needs.',
  'For SaaS software companies. Gathers team size, current workflow bottlenecks, ERP/CRM integration requirements, and security compliance criteria.',
  'booking',
  'saas',
  '#0284c7',
  [
    { id: 'work_email', type: 'email', label: 'Corporate Work Email', required: true, width: 'half', stepId: 'step-1' },
    { id: 'full_name', type: 'short_answer', label: 'Full Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'company_name', type: 'short_answer', label: 'Organization Name', required: true, width: 'half', stepId: 'step-1' },
    { id: 'company_size', type: 'dropdown', label: 'Company Team Size', required: true, width: 'half', stepId: 'step-1',
      options: [{ label: '10 – 50 Employees', value: '10_50' }, { label: '51 – 200 Employees (Growth)', value: '51_200' }, { label: '201 – 1,000 Employees (Mid-Market)', value: '201_1000' }, { label: '1,000+ Enterprise', value: '1000_plus' }] },
    { id: 'primary_challenge', type: 'long_answer', label: 'What is the #1 workflow or revenue challenge you are looking to solve?', required: true, width: 'full', stepId: 'step-2' },
    { id: 'current_stack', type: 'short_answer', label: 'Current Software Stack (e.g. Salesforce, HubSpot, Stripe)', width: 'full', stepId: 'step-2' },
  ],
  [{ id: 'step-1', title: 'Organization Profile' }, { id: 'step-2', title: 'Technical Requirements' }],
  ['saas demo request form', 'enterprise software demo', 'b2b product demo intake', 'software discovery questionnaire'],
  [{ question: 'Is the live demo personalized to our workflow?', answer: 'Yes, our solutions architects configure a dedicated sandbox loaded with your industry-specific workflows.' }],
  'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80'
);

export function registerEducationCreativeSaasExtendedTemplates(): void {
  registerTemplate(WEB_DESIGN_BRIEF);
  registerTemplate(SAAS_DEMO);
}

// Auto-register
registerEducationCreativeSaasExtendedTemplates();
