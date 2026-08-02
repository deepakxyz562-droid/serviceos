'use client';

import { Calendar } from 'lucide-react';
import { SectionPlaceholder } from './_section-placeholder';

export function JobsSchedulingSettings() {
  return (
    <SectionPlaceholder
      title="Jobs & Scheduling"
      description="Job types, visit types, dispatch rules, SLA, priority levels, checklists"
      icon={Calendar}
      accent="sky"
      configuredItems={[
        { label: 'Job Types', hint: 'Installation, Repair, Maintenance, Inspection, Emergency' },
        { label: 'Visit Types', hint: 'Site visit, Remote, Phone, Follow-up' },
        { label: 'Dispatch Rules', hint: 'Auto-assign jobs based on skills, location, availability' },
        { label: 'SLA Policies', hint: 'Response time and resolution time targets by priority' },
        { label: 'Priority Levels', hint: 'Low, Medium, High, Critical with color coding' },
        { label: 'Job Checklists', hint: 'Per job-type checklists technicians must complete' },
        { label: 'Working Hours', hint: 'Per-employee availability windows for scheduling' },
        { label: 'Buffer Times', hint: 'Travel buffer, setup time between jobs' },
      ]}
    />
  );
}
