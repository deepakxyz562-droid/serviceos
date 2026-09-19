/**
 * AI Universal Business Application Generator
 * Converts any natural language prompt into a complete working hierarchy of
 * UniversalComponentNodes (Forms + AI Agent + Calculations + Business Tiles).
 */

import { UniversalComponentNode, UniversalProject } from '../universal-component-types';

export function generateUniversalProjectFromPrompt(prompt: string, industry = 'general'): UniversalProject {
  const normalized = prompt.toLowerCase();
  const timestamp = Date.now();
  const slug = `app-${timestamp.toString(36)}`;

  // Determine Title & Brand
  let appName = 'Business Service Hub';
  let roleTitle = 'AI Service Concierge';
  let primaryColor = '#059669';

  if (normalized.includes('hvac') || normalized.includes('ac') || normalized.includes('heat')) {
    appName = 'Apex HVAC Emergency & Quote Hub';
    roleTitle = 'HVAC Climate & Dispatch Specialist';
    primaryColor = '#0284c7';
  } else if (normalized.includes('dental') || normalized.includes('doctor') || normalized.includes('patient')) {
    appName = 'Clara Dental Patient Intake Hub';
    roleTitle = 'Dental Triage & Care Concierge';
    primaryColor = '#0d9488';
  } else if (normalized.includes('roof') || normalized.includes('construct') || normalized.includes('build')) {
    appName = 'Precision Roofing & Quote Estimator';
    roleTitle = 'Structural Scoping Specialist';
    primaryColor = '#d97706';
  } else if (normalized.includes('auto') || normalized.includes('car') || normalized.includes('tow')) {
    appName = 'Apex Auto Repair & Towing Portal';
    roleTitle = 'Fleet Dispatch & Estimate AI';
    primaryColor = '#e11d48';
  }

  // Root Container Node
  const rootNode: UniversalComponentNode = {
    id: `root_${timestamp}`,
    type: 'container',
    name: appName,
    category: 'layout',
    style: {
      layout: 'column',
      padding: '24px',
      backgroundColor: '#ffffff',
      border: { radius: '24px' },
    },
    props: {
      label: appName,
    },
    children: [
      // 1. Heading & Hero
      {
        id: `head_${timestamp}`,
        type: 'heading',
        name: 'App Headline',
        category: 'content',
        style: {
          colSpan: 12,
          typography: { fontSize: '24px', fontWeight: 'bold' },
        },
        props: {
          label: appName,
        },
      },
      {
        id: `sub_${timestamp}`,
        type: 'paragraph',
        name: 'App Subtitle',
        category: 'content',
        style: { colSpan: 12 },
        props: {
          placeholder: 'Instant AI quotes, 24/7 service concierge, and fast online booking.',
        },
      },

      // 2. Embedded 24/7 AI Concierge
      {
        id: `agent_${timestamp}`,
        type: 'ai_chat_concierge',
        name: '24/7 AI Assistant',
        category: 'ai',
        style: { colSpan: 12, backgroundColor: '#0f172a', border: { radius: '20px' } },
        props: {
          label: roleTitle,
          voiceTone: 'friendly',
          greetingText: `Hi there! I am your 24/7 ${roleTitle}. How can I assist you with your estimate, booking, or questions today?`,
        },
      },

      // 3. Form Input Section: Customer Details
      {
        id: `name_${timestamp}`,
        type: 'text_input',
        name: 'Full Name',
        category: 'form',
        style: { colSpan: 6 },
        props: {
          label: 'Full Name',
          placeholder: 'e.g. John Doe',
          required: true,
        },
      },
      {
        id: `phone_${timestamp}`,
        type: 'phone_input',
        name: 'Phone Number',
        category: 'form',
        style: { colSpan: 6 },
        props: {
          label: 'Phone Number',
          placeholder: '(555) 000-0000',
          required: true,
        },
      },

      // 4. Cognito-Style Math Calculation Field
      {
        id: `sqft_${timestamp}`,
        type: 'number_input',
        name: 'Property Sq Ft / Scope',
        category: 'form',
        style: { colSpan: 6 },
        props: {
          label: 'Estimated Scope / Size (Sq Ft)',
          placeholder: '1500',
          defaultValue: 1500,
        },
      },
      {
        id: `calc_${timestamp}`,
        type: 'calculation_field',
        name: 'Instant Estimate Calculator',
        category: 'business',
        style: { colSpan: 6 },
        props: {
          label: 'Estimated Initial Quote',
          calculationFormula: '= sqft * 4.50',
          currencySymbol: '$',
          decimalPlaces: 2,
        },
      },

      // 5. Submit CTA Action Button
      {
        id: `btn_${timestamp}`,
        type: 'button',
        name: 'Submit Request CTA',
        category: 'business',
        style: { colSpan: 12, border: { radius: '14px' } },
        props: {
          label: 'Confirm & Schedule Dispatch ⚡',
        },
        behavior: {
          onClickAction: {
            type: 'submit_form',
          },
        },
      },
    ],
  };

  return {
    id: `proj_${timestamp}`,
    slug,
    name: appName,
    description: prompt,
    industry,
    brandColor: primaryColor,
    rootNode,
    forms: [{ id: `f_${timestamp}`, name: `${appName} Form`, slug: `${slug}-form`, fieldCount: 6 }],
    agents: [{ id: `a_${timestamp}`, name: roleTitle, slug: `${slug}-agent`, roleTitle }],
    apps: [{ id: `app_${timestamp}`, name: appName, slug, icon: '📱' }],
    pwa: {
      enabled: true,
      appName,
      shortName: appName.slice(0, 12),
      themeColor: primaryColor,
      backgroundColor: '#0f172a',
      display: 'standalone',
      startUrl: `/app/${slug}`,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
