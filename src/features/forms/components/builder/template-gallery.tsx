'use client';

/**
 * Template Gallery
 * ----------------
 * UI showing 20 starter form templates across industries. Each template returns
 * a `FormField[]` when applied.
 *
 * Uses shadcn/ui + lucide-react + Tailwind only.
 */
import { useState } from 'react';
import { LayoutGrid, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FormField } from '@/lib/forms/form-schema-types';

export interface FormTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  fields: FormField[];
}

function f(id: string, label: string, type: FormField['type'], extra: Partial<FormField> = {}): FormField {
  return { id, label, type, ...extra };
}

export const TEMPLATES: FormTemplate[] = [
  { id: 'contact', name: 'Contact Form', industry: 'General', description: 'Basic contact request form.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Email', 'email', { required: true, width: 'half' }),
    f('subject', 'Subject', 'short_answer', { required: true }),
    f('message', 'Message', 'long_answer', { required: true }),
  ]},
  { id: 'registration', name: 'Event Registration', industry: 'Events', description: 'Register attendees for an event.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Email', 'email', { required: true, width: 'half' }),
    f('ticket', 'Ticket Type', 'dropdown', { required: true, options: [{ label: 'General', value: 'general' }, { label: 'VIP', value: 'vip' }] }),
    f('guests', 'Number of Guests', 'numerical', { defaultValue: 1 }),
  ]},
  { id: 'survey', name: 'Customer Survey', industry: 'Feedback', description: 'Collect customer feedback.', fields: [
    f('satisfaction', 'Overall Satisfaction', 'rating', { required: true }),
    f('recommend', 'Would you recommend us?', 'dropdown', { options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] }),
    f('comments', 'Comments', 'long_answer'),
  ]},
  { id: 'order', name: 'Product Order', industry: 'E-commerce', description: 'Take product orders.', fields: [
    f('product', 'Product', 'dropdown', { required: true, options: [{ label: 'Widget A', value: 'a' }, { label: 'Widget B', value: 'b' }] }),
    f('qty', 'Quantity', 'numerical', { required: true, defaultValue: 1 }),
    f('payment', 'Payment', 'payment_gateway', { required: true, widgetType: 'payment_stripe' }),
    f('shipping', 'Shipping Address', 'address', { required: true }),
  ]},
  { id: 'appointment', name: 'Appointment Booking', industry: 'Services', description: 'Book an appointment.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Email', 'email', { required: true, width: 'half' }),
    f('phone', 'Phone', 'phone', { required: true }),
    f('appt', 'Preferred Time', 'date', { required: true, widgetType: 'appointment' }),
  ]},
  { id: 'job_application', name: 'Job Application', industry: 'HR', description: 'Collect job applications.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Email', 'email', { required: true, width: 'half' }),
    f('position', 'Position Applied For', 'short_answer', { required: true }),
    f('resume', 'Resume', 'file', { required: true }),
    f('cover', 'Cover Letter', 'long_answer'),
  ]},
  { id: 'rsvp', name: 'Event RSVP', industry: 'Events', description: 'Track event attendance.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true }),
    f('attending', 'Will you attend?', 'radio', { required: true, options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Maybe', value: 'maybe' }] }),
    f('guests', 'Number of Guests', 'numerical', { defaultValue: 0 }),
  ]},
  { id: 'feedback', name: 'Product Feedback', industry: 'Feedback', description: 'Gather product feedback.', fields: [
    f('product', 'Product', 'short_answer', { required: true }),
    f('rating', 'Rating', 'rating', { required: true }),
    f('improvements', 'Improvement Suggestions', 'long_answer'),
  ]},
  { id: 'quiz', name: 'Quiz', industry: 'Education', description: 'Take a quick quiz.', fields: [
    f('q1', 'What is 2+2?', 'radio', { required: true, options: [{ label: '3', value: '3' }, { label: '4', value: '4' }, { label: '5', value: '5' }] }),
    f('q2', 'Capital of France?', 'short_answer', { required: true }),
  ]},
  { id: 'newsletter', name: 'Newsletter Signup', industry: 'Marketing', description: 'Email newsletter opt-in.', fields: [
    f('email', 'Email', 'email', { required: true }),
    f('consent', 'I agree to receive emails', 'checkbox', { required: true }),
  ]},
  { id: 'lead_gen', name: 'Lead Generation', industry: 'Sales', description: 'Capture qualified leads.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Work Email', 'email', { required: true, width: 'half' }),
    f('company', 'Company', 'short_answer'),
    f('employees', 'Company Size', 'dropdown', { options: [{ label: '1-10', value: 's' }, { label: '11-100', value: 'm' }, { label: '100+', value: 'l' }] }),
  ]},
  { id: 'insurance_quote', name: 'Insurance Quote', industry: 'Insurance', description: 'Request an insurance quote.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('dob', 'Date of Birth', 'date', { required: true, width: 'half' }),
    f('type', 'Insurance Type', 'dropdown', { required: true, options: [{ label: 'Auto', value: 'auto' }, { label: 'Home', value: 'home' }, { label: 'Life', value: 'life' }] }),
    f('coverage', 'Desired Coverage', 'currency'),
  ]},
  { id: 'service_request', name: 'Service Request', industry: 'Field Service', description: 'Request a service call.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true }),
    f('address', 'Service Address', 'address', { required: true }),
    f('issue', 'Describe the Issue', 'long_answer', { required: true }),
    f('photo', 'Photo of Issue', 'image_upload_with_notes', { widgetType: 'image_upload_with_notes' }),
  ]},
  { id: 'patient_intake', name: 'Patient Intake', industry: 'Healthcare', description: 'Patient intake form.', fields: [
    f('name', 'Patient Name', 'short_answer', { required: true, width: 'half' }),
    f('dob', 'Date of Birth', 'date', { required: true, width: 'half' }),
    f('phone', 'Phone', 'phone', { required: true }),
    f('history', 'Medical History', 'long_answer'),
    f('consent', 'HIPAA Consent', 'signature', { required: true, widgetType: 'signature_pad' }),
  ]},
  { id: 'volunteer', name: 'Volunteer Sign-up', industry: 'Non-profit', description: 'Recruit volunteers.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Email', 'email', { required: true, width: 'half' }),
    f('role', 'Preferred Role', 'dropdown', { options: [{ label: 'Greeter', value: 'greeter' }, { label: 'Setup', value: 'setup' }, { label: 'Cleanup', value: 'cleanup' }] }),
    f('availability', 'Availability', 'long_answer'),
  ]},
  { id: 'reservation', name: 'Reservation', industry: 'Hospitality', description: 'Restaurant/hotel reservation.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('phone', 'Phone', 'phone', { required: true, width: 'half' }),
    f('date', 'Date', 'date', { required: true, width: 'half' }),
    f('time', 'Time', 'time', { required: true, width: 'half' }),
    f('party', 'Party Size', 'numerical', { required: true, defaultValue: 2 }),
  ]},
  { id: 'application', name: 'Application Form', industry: 'Government', description: 'Generic application form.', fields: [
    f('name', 'Applicant Name', 'short_answer', { required: true }),
    f('email', 'Email', 'email', { required: true }),
    f('purpose', 'Purpose of Application', 'long_answer', { required: true }),
    f('docs', 'Supporting Documents', 'file'),
  ]},
  { id: 'poll', name: 'Poll', industry: 'Engagement', description: 'Quick single-question poll.', fields: [
    f('choice', 'Your Choice', 'radio', { required: true, options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }, { label: 'Option C', value: 'c' }] }),
  ]},
  { id: 'contest', name: 'Contest Entry', industry: 'Marketing', description: 'Contest / sweepstakes entry.', fields: [
    f('name', 'Full Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Email', 'email', { required: true, width: 'half' }),
    f('entry', 'Your Entry', 'long_answer', { required: true }),
    f('rules', 'I agree to the contest rules', 'checkbox', { required: true }),
  ]},
  { id: 'warranty', name: 'Warranty Registration', industry: 'Manufacturing', description: 'Register a product warranty.', fields: [
    f('name', 'Owner Name', 'short_answer', { required: true, width: 'half' }),
    f('email', 'Email', 'email', { required: true, width: 'half' }),
    f('product', 'Product Model', 'short_answer', { required: true }),
    f('serial', 'Serial Number', 'short_answer', { required: true }),
    f('purchase_date', 'Purchase Date', 'date', { required: true }),
  ]},
];

export interface TemplateGalleryProps {
  onApply?: (template: FormTemplate) => void;
  className?: string;
}

export function TemplateGallery({ onApply, className }: TemplateGalleryProps) {
  const [query, setQuery] = useState('');

  const filtered = TEMPLATES.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.industry.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-4 w-4" />
          Template Gallery
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-lg border p-3 transition hover:shadow-sm">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold">{t.name}</h4>
                <Badge variant="secondary" className="text-[10px]">{t.industry}</Badge>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">{t.description}</p>
              <div className="text-[10px] text-muted-foreground">{t.fields.length} fields</div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => onApply?.(t)}
                disabled={!onApply}
              >
                Use Template
              </Button>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No templates match your search.</div>
        )}
      </CardContent>
    </Card>
  );
}

export default TemplateGallery;
