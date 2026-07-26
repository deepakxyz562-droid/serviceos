'use client';

import { Zap } from 'lucide-react';
import { SectionPlaceholder } from './_section-placeholder';

export function AutomationsSettings() {
  return (
    <SectionPlaceholder
      title="Automations"
      description="Workflow builder, triggers, conditions, actions, templates, approvals, scheduled jobs"
      icon={Zap}
      accent="violet"
      configuredItems={[
        { label: 'Workflow Builder', hint: 'Visual builder for multi-step automations' },
        { label: 'Triggers', hint: 'Events that start a workflow (new lead, job done, etc.)' },
        { label: 'Conditions', hint: 'If/then branching logic with AND/OR groups' },
        { label: 'Actions', hint: 'Send email, create task, update field, call webhook' },
        { label: 'Workflow Templates', hint: 'Pre-built workflows for common scenarios' },
        { label: 'Approval Steps', hint: 'Require manager sign-off before continuing' },
        { label: 'Scheduled Jobs', hint: 'Cron-style recurring automations' },
        { label: 'Execution History', hint: 'Audit log of every run with input/output' },
      ]}
    />
  );
}
