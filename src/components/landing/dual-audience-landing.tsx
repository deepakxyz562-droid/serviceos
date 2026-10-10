'use client';

import * as React from 'react';
import { ModernLanding } from './modern/modern-landing';

export interface DualAudienceLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

export type Audience = 'crm' | 'forms' | 'marketplace';

/**
 * Main Public Homepage Component.
 *
 * Implements the redesigned Fieseros 2026 homepage layout with:
 * - Clean Modern Navbar (dropdowns, search, auth triggers)
 * - Impactful Hero Section (value propositions, technician background, live dashboard & AI receptionist widgets)
 * - 5-Pillar Service Features Grid (CRM, Dispatch, Invoicing, AI Voice, Websites & SEO)
 * - Live Dispatch Board Showcase (Map pins, route visualizer, job queue)
 * - 24/7 AI Employee Voice Receptionist (Active call visualizer, live conversation transcript, CRM sync)
 * - GPTForm & Automation Studio (Field palette, interactive form canvas, mobile preview)
 * - Popular Trade Industries Grid (8 photo cards linking to dedicated software solutions)
 * - 4-Step "How It Works" Workflow
 * - Verified Pro Marketplace matching section
 * - 4-Tier Transparent Pricing (Free 100 jobs, Starter, Pro, Enterprise with monthly/yearly toggle)
 * - Interactive FAQ Accordions
 * - Ready to Grow Emerald CTA Banner
 * - Streamlined Modern Footer
 */
export function DualAudienceLanding({
  onGetStarted,
  onSignIn,
  onTryDemo,
}: DualAudienceLandingProps) {
  return (
    <ModernLanding
      onGetStarted={onGetStarted}
      onSignIn={onSignIn}
      onTryDemo={onTryDemo}
    />
  );
}
