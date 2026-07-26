'use client';

import { Users } from 'lucide-react';
import { SectionPlaceholder } from './_section-placeholder';

export function CrmSettings() {
  return (
    <SectionPlaceholder
      title="CRM Settings"
      description="Lead pipeline, opportunity stages, customer types, tags, segments, custom fields"
      icon={Users}
      accent="emerald"
      configuredItems={[
        { label: 'Lead Pipeline Stages', hint: 'Define the stages a lead moves through from new → won' },
        { label: 'Opportunity Stages', hint: 'Configure stages for deals/opportunities' },
        { label: 'Customer Types', hint: 'Residential, Commercial, VIP, Repeat, etc.' },
        { label: 'Tags & Segments', hint: 'Create reusable tags and dynamic customer segments' },
        { label: 'Custom Fields', hint: 'Add custom fields to leads, customers, and jobs' },
        { label: 'Lead Sources', hint: 'Track where leads come from (website, phone, referral)' },
        { label: 'Lead Assignment Rules', hint: 'Round-robin, territory, or skill-based assignment' },
        { label: 'Lost Reason Codes', hint: 'Standardize why leads are marked lost' },
      ]}
    />
  );
}
