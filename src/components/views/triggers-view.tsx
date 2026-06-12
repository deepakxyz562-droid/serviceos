'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import {
  Zap, Plus, Play, Pause, Trash2, Settings2, Clock,
  Bell, MessageCircle, UserPlus, Briefcase, FileText, Globe,
  ArrowRightLeft, CheckCircle, XCircle, AlertTriangle, Search,
  Webhook, Tag, Send, Mail, Save, Users, UserCheck, CalendarPlus,
  CalendarCheck, CalendarX, CalendarClock, PlayCircle, WifiOff,
  MessageSquarePlus, FileInput, Inbox, CircleCheck, Clock3,
  RefreshCw, Activity, Copy, Sparkles, Filter, X, PlusCircle,
  ArrowRight, Receipt, Banknote, ChevronDown, ChevronUp, ZapOff,
  ShoppingCart, Store, ToggleLeft, ToggleRight, Rocket, Target,
  PhoneCall, MailCheck, CreditCard, Calendar, Bot, Hash,
  MousePointerClick, ExternalLink, Edit3, LogIn, ShieldCheck,
  Timer, AlertCircle, TimerReset, UserCog, DollarSign, FileCheck2,
  FileX2, PhoneOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Automation {
  id: string;
  name: string;
  description?: string | null;
  triggerType: string;
  triggerConfigJson: string;
  conditionsJson: string;
  actionsJson: string;
  active: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  lastExecutionStatus: string | null;
  tagsJson: string;
  createdAt: string;
  updatedAt: string;
}

interface Execution {
  id: string;
  automationId: string;
  triggerEvent: string;
  conditionsMet: boolean;
  status: string;
  error?: string | null;
  durationMs?: number | null;
  createdAt: string;
  automation?: { name: string; triggerType: string };
}

// ─── Prebuilt Trigger Catalog (33 Triggers) ──────────────────────────────────

interface PrebuiltTrigger {
  id: string;
  name: string;
  description: string;
  eventSource: string;
  eventLabel: string;
  category: string;
  categoryColor: string;
  icon: React.ElementType;
  defaultActions: { label: string; icon: React.ElementType; type: string; config: Record<string, any> }[];
  triggerType: string;
  triggerConfigJson: string;
  conditionsJson: string;
  popular?: boolean;
}

const PREBUILT_TRIGGERS: PrebuiltTrigger[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // CRM — 6 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'lead_created_assign',
    name: 'Lead Created → Assign Owner',
    description: 'Automatically assign new leads to available sales reps using round-robin distribution',
    eventSource: 'lead.created',
    eventLabel: 'Lead Created',
    category: 'CRM',
    categoryColor: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    icon: UserPlus,
    defaultActions: [
      { label: 'Assign Round Robin', icon: UserCheck, type: 'assign_user', config: { assignTo: 'round_robin' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Thank you for reaching out! A team member will contact you shortly.' } },
    ],
    triggerType: 'lead.created',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'lead_stuck_notify',
    name: 'Lead Stuck 2 Days → Notify Manager',
    description: 'When a lead hasn\'t been updated in 2 days, alert the manager for quick follow-up',
    eventSource: 'time.1h_after_lead',
    eventLabel: 'Time-Based',
    category: 'CRM',
    categoryColor: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    icon: Clock3,
    defaultActions: [
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Lead needs attention', message: 'Lead has not been updated in 2 days' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Hi! Just checking in — do you still need help?' } },
    ],
    triggerType: 'time.1h_after_lead',
    triggerConfigJson: JSON.stringify({ delayMinutes: 2880 }),
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'lead_status_changed',
    name: 'Lead Status Changed → Notify Team',
    description: 'Keep your team in the loop when a lead moves through the pipeline',
    eventSource: 'lead.status_changed',
    eventLabel: 'Lead Status Changed',
    category: 'CRM',
    categoryColor: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    icon: ArrowRightLeft,
    defaultActions: [
      { label: 'Send Notification', icon: Bell, type: 'send_notification', config: { title: 'Lead status updated', message: 'A lead has moved to a new stage' } },
      { label: 'Move Pipeline', icon: ArrowRight, type: 'move_pipeline', config: { stage: 'contacted' } },
    ],
    triggerType: 'lead.status_changed',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'lead_converted_celebrate',
    name: 'Lead Converted → Celebrate & Create Job',
    description: 'When a lead is won, notify the team and automatically create a job',
    eventSource: 'lead.converted',
    eventLabel: 'Lead Converted',
    category: 'CRM',
    categoryColor: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    icon: CheckCircle,
    defaultActions: [
      { label: 'Create Job', icon: Briefcase, type: 'create_job', config: { title: 'New Job from converted lead' } },
      { label: 'Notify Team', icon: Bell, type: 'send_notification', config: { title: 'Lead converted!', message: 'A lead has been converted to a customer' } },
      { label: 'Add Tag', icon: Tag, type: 'add_tag', config: { tag: 'converted' } },
    ],
    triggerType: 'lead.converted',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'lead_updated_log',
    name: 'Lead Updated → Log Activity',
    description: 'Automatically log a follow-up activity whenever a lead record is updated',
    eventSource: 'lead.updated',
    eventLabel: 'Lead Updated',
    category: 'CRM',
    categoryColor: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    icon: Edit3,
    defaultActions: [
      { label: 'Send Notification', icon: Bell, type: 'send_notification', config: { title: 'Lead updated', message: 'A lead record has been modified' } },
    ],
    triggerType: 'lead.updated',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'customer_created_welcome',
    name: 'Customer Created → Send Welcome',
    description: 'Send a warm welcome message via WhatsApp when a new customer is added to the system',
    eventSource: 'customer.created',
    eventLabel: 'Customer Created',
    category: 'CRM',
    categoryColor: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    icon: Users,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Welcome! We\'re excited to have you. Let us know how we can help.' } },
      { label: 'Add Tag', icon: Tag, type: 'add_tag', config: { tag: 'new-customer' } },
    ],
    triggerType: 'customer.created',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Booking — 5 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'booking_confirmed_job',
    name: 'Booking Confirmed → Create Job',
    description: 'Automatically create a job when a booking is confirmed, ready for dispatch',
    eventSource: 'booking.confirmed',
    eventLabel: 'Booking Confirmed',
    category: 'Booking',
    categoryColor: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
    icon: CalendarCheck,
    defaultActions: [
      { label: 'Create Job', icon: Briefcase, type: 'create_job', config: { title: 'Job from booking confirmation' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Your booking is confirmed! We\'ll send you updates.' } },
    ],
    triggerType: 'booking.confirmed',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'booking_cancelled_alert',
    name: 'Booking Cancelled → Alert Manager',
    description: 'Get notified when a customer cancels so you can follow up and save the relationship',
    eventSource: 'booking.cancelled',
    eventLabel: 'Booking Cancelled',
    category: 'Booking',
    categoryColor: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
    icon: CalendarX,
    defaultActions: [
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Booking cancelled', message: 'A customer has cancelled their booking' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'We\'re sorry to see you go. Is there anything we can do?' } },
    ],
    triggerType: 'booking.cancelled',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'booking_rescheduled_notify',
    name: 'Booking Rescheduled → Update Team',
    description: 'Keep your field team updated when customers reschedule their bookings',
    eventSource: 'booking.rescheduled',
    eventLabel: 'Booking Rescheduled',
    category: 'Booking',
    categoryColor: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
    icon: CalendarClock,
    defaultActions: [
      { label: 'Send Notification', icon: Bell, type: 'send_notification', config: { title: 'Booking rescheduled', message: 'A customer has rescheduled their booking' } },
    ],
    triggerType: 'booking.rescheduled',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'booking_created_confirm',
    name: 'Booking Created → Send Confirmation',
    description: 'Automatically send a booking confirmation to the customer when a new booking is created',
    eventSource: 'booking.created',
    eventLabel: 'Booking Created',
    category: 'Booking',
    categoryColor: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
    icon: CalendarPlus,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Your booking has been received! We\'ll confirm it shortly.' } },
      { label: 'Notify Team', icon: Bell, type: 'send_notification', config: { title: 'New booking', message: 'A new booking has been created' } },
    ],
    triggerType: 'booking.created',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'booking_noshow_alert',
    name: 'Booking No-Show → Alert & Reschedule',
    description: 'When a customer doesn\'t show up for their booking, alert the team and offer to reschedule',
    eventSource: 'booking.cancelled',
    eventLabel: 'Booking No-Show',
    category: 'Booking',
    categoryColor: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
    icon: AlertCircle,
    defaultActions: [
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Customer no-show', message: 'A customer did not show up for their booking' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'We missed you today! Would you like to reschedule?' } },
    ],
    triggerType: 'booking.cancelled',
    triggerConfigJson: JSON.stringify({ reason: 'no_show' }),
    conditionsJson: '[]',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Job — 5 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'job_completed_review',
    name: 'Job Completed → Request Review',
    description: 'After completing a job, send a WhatsApp message requesting a Google review and tag for retention',
    eventSource: 'job.completed',
    eventLabel: 'Job Completed',
    category: 'Job',
    categoryColor: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
    icon: CircleCheck,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Thanks for choosing us! Would you like to leave a review? https://g.page/review' } },
      { label: 'Add Tag', icon: Tag, type: 'add_tag', config: { tag: 'retention-campaign' } },
    ],
    triggerType: 'job.completed',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'job_assigned_notify',
    name: 'Job Assigned → Notify Employee',
    description: 'Send a WhatsApp notification to the employee when they are assigned a new job',
    eventSource: 'job.assigned',
    eventLabel: 'Job Assigned',
    category: 'Job',
    categoryColor: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
    icon: UserCheck,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'employee', template: 'You have a new job assigned. Check your schedule.' } },
      { label: 'Send Notification', icon: Bell, type: 'send_notification', config: { title: 'New job assigned', message: 'Check your schedule for new assignment' } },
    ],
    triggerType: 'job.assigned',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'job_cancelled_alert',
    name: 'Job Cancelled → Alert & Reschedule',
    description: 'Notify the manager and customer when a job is cancelled, offer rescheduling',
    eventSource: 'job.cancelled',
    eventLabel: 'Job Cancelled',
    category: 'Job',
    categoryColor: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
    icon: XCircle,
    defaultActions: [
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Job cancelled', message: 'A job has been cancelled' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Your job was cancelled. Would you like to reschedule?' } },
    ],
    triggerType: 'job.cancelled',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'job_created_auto_assign',
    name: 'Job Created → Auto Assign',
    description: 'When a new job is created, automatically assign it to the nearest available employee',
    eventSource: 'job.created',
    eventLabel: 'Job Created',
    category: 'Job',
    categoryColor: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
    icon: Briefcase,
    defaultActions: [
      { label: 'Assign User', icon: UserPlus, type: 'assign_user', config: { assignTo: 'round_robin' } },
      { label: 'Send Notification', icon: Bell, type: 'send_notification', config: { title: 'New job created', message: 'Auto-assignment in progress' } },
    ],
    triggerType: 'job.created',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'job_overdue_alert',
    name: 'Job Overdue → Alert Manager',
    description: 'When a job passes its scheduled time without completion, alert the manager to take action',
    eventSource: 'job.started',
    eventLabel: 'Job Overdue',
    category: 'Job',
    categoryColor: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
    icon: AlertTriangle,
    defaultActions: [
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Job overdue', message: 'A job has passed its scheduled time without completion' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'We\'re running a bit behind schedule. We\'ll update you shortly!' } },
    ],
    triggerType: 'job.started',
    triggerConfigJson: JSON.stringify({ delayMinutes: 120 }),
    conditionsJson: '[]',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WhatsApp — 4 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'whatsapp_msg_lead',
    name: 'WhatsApp Message → Create Lead',
    description: 'When a new WhatsApp message comes in, automatically create a lead so nothing slips through',
    eventSource: 'whatsapp.message_received',
    eventLabel: 'WhatsApp Message',
    category: 'WhatsApp',
    categoryColor: 'bg-green-500/15 text-green-600 border-green-500/20',
    icon: MessageCircle,
    defaultActions: [
      { label: 'Create Task', icon: PlusCircle, type: 'create_task', config: { title: 'Follow up with WhatsApp contact', assignTo: 'round_robin' } },
      { label: 'Auto Reply', icon: Bot, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Thanks for reaching out! We\'ll get back to you shortly.' } },
    ],
    triggerType: 'whatsapp.message_received',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'whatsapp_conversation_started',
    name: 'Conversation Started → Auto Welcome',
    description: 'Send an automatic welcome message when a new WhatsApp conversation begins',
    eventSource: 'whatsapp.conversation_started',
    eventLabel: 'Conversation Started',
    category: 'WhatsApp',
    categoryColor: 'bg-green-500/15 text-green-600 border-green-500/20',
    icon: MessageSquarePlus,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Welcome! How can we help you today?' } },
    ],
    triggerType: 'whatsapp.conversation_started',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'whatsapp_template_delivered',
    name: 'Template Delivered → Log Status',
    description: 'When a WhatsApp template message is delivered, log the delivery status for tracking',
    eventSource: 'whatsapp.template_delivered',
    eventLabel: 'Template Delivered',
    category: 'WhatsApp',
    categoryColor: 'bg-green-500/15 text-green-600 border-green-500/20',
    icon: MailCheck,
    defaultActions: [
      { label: 'Update Record', icon: Save, type: 'update_record', config: { recordType: 'lead', field: 'whatsappStatus', value: 'delivered' } },
    ],
    triggerType: 'whatsapp.template_delivered',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'whatsapp_template_failed',
    name: 'Template Failed → Retry & Alert',
    description: 'When a WhatsApp template fails to send, alert the team and attempt a retry',
    eventSource: 'whatsapp.template_failed',
    eventLabel: 'Template Failed',
    category: 'WhatsApp',
    categoryColor: 'bg-green-500/15 text-green-600 border-green-500/20',
    icon: AlertCircle,
    defaultActions: [
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'WhatsApp template failed', message: 'A template message failed to send' } },
    ],
    triggerType: 'whatsapp.template_failed',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Finance — 5 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'invoice_overdue_reminder',
    name: 'Payment Failed → Send Reminder',
    description: 'When an invoice is overdue, automatically send a payment reminder via WhatsApp',
    eventSource: 'invoice.overdue',
    eventLabel: 'Invoice Overdue',
    category: 'Finance',
    categoryColor: 'bg-rose-500/15 text-rose-600 border-rose-500/20',
    icon: CreditCard,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Your invoice is overdue. Please complete payment at your earliest convenience.' } },
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Invoice overdue', message: 'An invoice is overdue — reminder sent' } },
    ],
    triggerType: 'invoice.overdue',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'invoice_paid_thanks',
    name: 'Invoice Paid → Send Thank You',
    description: 'When a customer pays, send a thank you message and add to retention campaign',
    eventSource: 'invoice.paid',
    eventLabel: 'Invoice Paid',
    category: 'Finance',
    categoryColor: 'bg-rose-500/15 text-rose-600 border-rose-500/20',
    icon: Banknote,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Payment received! Thank you for your business.' } },
      { label: 'Add Tag', icon: Tag, type: 'add_tag', config: { tag: 'paid-customer' } },
    ],
    triggerType: 'invoice.paid',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'quote_sent_followup',
    name: 'Quote Sent → 3-Day Follow Up',
    description: 'If a quote hasn\'t been accepted in 3 days, automatically follow up via WhatsApp',
    eventSource: 'time.1d_after_quote',
    eventLabel: 'Time-Based',
    category: 'Finance',
    categoryColor: 'bg-rose-500/15 text-rose-600 border-rose-500/20',
    icon: Clock3,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Hi! Just following up on the quote we sent. Any questions?' } },
    ],
    triggerType: 'time.1d_after_quote',
    triggerConfigJson: JSON.stringify({ delayMinutes: 4320 }),
    conditionsJson: JSON.stringify([{ field: 'status', operator: 'not_equals', value: 'accepted' }]),
  },
  {
    id: 'quote_accepted_create',
    name: 'Quote Accepted → Create Job & Invoice',
    description: 'When a quote is accepted, automatically create a job and send the invoice to the customer',
    eventSource: 'quote.accepted',
    eventLabel: 'Quote Accepted',
    category: 'Finance',
    categoryColor: 'bg-rose-500/15 text-rose-600 border-rose-500/20',
    icon: FileCheck2,
    defaultActions: [
      { label: 'Create Job', icon: Briefcase, type: 'create_job', config: { title: 'Job from accepted quote' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Great choice! We\'re preparing your job and invoice.' } },
      { label: 'Add Tag', icon: Tag, type: 'add_tag', config: { tag: 'quote-accepted' } },
    ],
    triggerType: 'quote.accepted',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'invoice_created_send',
    name: 'Invoice Created → Send to Customer',
    description: 'Automatically send the invoice to the customer via WhatsApp as soon as it is created',
    eventSource: 'invoice.created',
    eventLabel: 'Invoice Created',
    category: 'Finance',
    categoryColor: 'bg-rose-500/15 text-rose-600 border-rose-500/20',
    icon: Receipt,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Your invoice is ready! Please review and complete payment at your convenience.' } },
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Invoice sent', message: 'Invoice has been sent to the customer' } },
    ],
    triggerType: 'invoice.created',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Employee — 3 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'employee_available_dispatch',
    name: 'Employee Available → Auto Dispatch',
    description: 'When an employee becomes available, automatically assign pending jobs nearby',
    eventSource: 'employee.available',
    eventLabel: 'Employee Available',
    category: 'Employee',
    categoryColor: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/20',
    icon: CircleCheck,
    defaultActions: [
      { label: 'Send Notification', icon: Bell, type: 'send_notification', config: { title: 'Employee available', message: 'An employee is now available for dispatch' } },
    ],
    triggerType: 'employee.available',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'employee_assigned_details',
    name: 'Employee Assigned → Send Job Details',
    description: 'When an employee is assigned to a job, send them full job details via WhatsApp',
    eventSource: 'employee.assigned',
    eventLabel: 'Employee Assigned',
    category: 'Employee',
    categoryColor: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/20',
    icon: UserCheck,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'employee', template: 'You\'ve been assigned a new job. Check your dashboard for full details.' } },
    ],
    triggerType: 'employee.assigned',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'employee_offline_alert',
    name: 'Employee Offline → Alert Manager',
    description: 'When an employee goes offline during working hours, notify the manager immediately',
    eventSource: 'employee.offline',
    eventLabel: 'Employee Offline',
    category: 'Employee',
    categoryColor: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/20',
    icon: WifiOff,
    defaultActions: [
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Employee offline', message: 'An employee has gone offline during working hours' } },
    ],
    triggerType: 'employee.offline',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Website — 3 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'form_submitted_notify',
    name: 'Form Submitted → Notify & Create Lead',
    description: 'When a form is submitted on your website, create a lead and notify the sales team',
    eventSource: 'form.submitted',
    eventLabel: 'Form Submitted',
    category: 'Website',
    categoryColor: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
    icon: MousePointerClick,
    defaultActions: [
      { label: 'Create Task', icon: PlusCircle, type: 'create_task', config: { title: 'Follow up with form submission', assignTo: 'round_robin' } },
      { label: 'Notify Team', icon: Bell, type: 'send_notification', config: { title: 'New form submission', message: 'A new form has been submitted on the website' } },
    ],
    triggerType: 'form.submitted',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },
  {
    id: 'website_contact_lead',
    name: 'Contact Form → Create Lead',
    description: 'Automatically create a lead when someone submits the contact form on your website',
    eventSource: 'website.contact_form',
    eventLabel: 'Contact Form',
    category: 'Website',
    categoryColor: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
    icon: Globe,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Thanks for contacting us! We\'ll be in touch soon.' } },
      { label: 'Assign Owner', icon: UserPlus, type: 'assign_user', config: { assignTo: 'round_robin' } },
    ],
    triggerType: 'website.contact_form',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
    popular: true,
  },
  {
    id: 'website_booking_form',
    name: 'Booking Form → Create Booking',
    description: 'When a booking form is submitted from your website, create a booking and notify the team',
    eventSource: 'website.booking_form',
    eventLabel: 'Booking Form',
    category: 'Website',
    categoryColor: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
    icon: CalendarPlus,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Your booking request has been received! We\'ll confirm shortly.' } },
      { label: 'Notify Team', icon: Bell, type: 'send_notification', config: { title: 'New booking request', message: 'A booking form was submitted from the website' } },
    ],
    triggerType: 'website.booking_form',
    triggerConfigJson: '{}',
    conditionsJson: '[]',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Time-Based — 2 triggers
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'time_3d_after_job',
    name: '3 Days After Job → Retention Campaign',
    description: '3 days after a job is completed, add the customer to a retention campaign',
    eventSource: 'time.3d_after_job',
    eventLabel: 'Time-Based',
    category: 'Time-Based',
    categoryColor: 'bg-slate-500/15 text-slate-600 border-slate-500/20',
    icon: TimerReset,
    defaultActions: [
      { label: 'Add Tag', icon: Tag, type: 'add_tag', config: { tag: 'retention-campaign' } },
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'Hope everything is going well! Here\'s a special offer for you.' } },
    ],
    triggerType: 'time.3d_after_job',
    triggerConfigJson: JSON.stringify({ delayMinutes: 4320 }),
    conditionsJson: '[]',
  },
  {
    id: 'time_7d_after_invoice',
    name: '7 Days After Invoice → Second Reminder',
    description: '7 days after an invoice becomes overdue, send a second reminder with urgency',
    eventSource: 'time.7d_after_invoice',
    eventLabel: 'Time-Based',
    category: 'Time-Based',
    categoryColor: 'bg-slate-500/15 text-slate-600 border-slate-500/20',
    icon: Timer,
    defaultActions: [
      { label: 'Send WhatsApp', icon: MessageCircle, type: 'send_whatsapp', config: { recipient: 'customer', template: 'This is a reminder that your payment is overdue. Please pay at your earliest convenience to avoid late fees.' } },
      { label: 'Notify Manager', icon: Bell, type: 'send_notification', config: { title: 'Second overdue reminder sent', message: '7-day overdue reminder sent to customer' } },
    ],
    triggerType: 'time.7d_after_invoice',
    triggerConfigJson: JSON.stringify({ delayMinutes: 10080 }),
    conditionsJson: '[]',
  },
];

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Zap, color: 'text-emerald-500' },
  { id: 'CRM', label: 'CRM', icon: Users, color: 'text-blue-500' },
  { id: 'Booking', label: 'Booking', icon: CalendarPlus, color: 'text-purple-500' },
  { id: 'Job', label: 'Job', icon: Briefcase, color: 'text-amber-500' },
  { id: 'Employee', label: 'Employee', icon: UserCheck, color: 'text-cyan-500' },
  { id: 'WhatsApp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
  { id: 'Finance', label: 'Finance', icon: CreditCard, color: 'text-rose-500' },
  { id: 'Website', label: 'Website', icon: Globe, color: 'text-orange-500' },
  { id: 'Time-Based', label: 'Time-Based', icon: Clock, color: 'text-slate-500' },
];

// ─── Trigger catalog for custom builder ──────────────────────────────────────

const TRIGGER_EVENTS = [
  { value: 'lead.created', label: 'Lead Created', category: 'CRM' },
  { value: 'lead.updated', label: 'Lead Updated', category: 'CRM' },
  { value: 'lead.status_changed', label: 'Lead Status Changed', category: 'CRM' },
  { value: 'lead.converted', label: 'Lead Converted', category: 'CRM' },
  { value: 'customer.created', label: 'Customer Created', category: 'CRM' },
  { value: 'booking.created', label: 'Booking Created', category: 'Booking' },
  { value: 'booking.confirmed', label: 'Booking Confirmed', category: 'Booking' },
  { value: 'booking.cancelled', label: 'Booking Cancelled', category: 'Booking' },
  { value: 'booking.rescheduled', label: 'Booking Rescheduled', category: 'Booking' },
  { value: 'job.created', label: 'Job Created', category: 'Job' },
  { value: 'job.assigned', label: 'Job Assigned', category: 'Job' },
  { value: 'job.started', label: 'Job Started', category: 'Job' },
  { value: 'job.completed', label: 'Job Completed', category: 'Job' },
  { value: 'job.cancelled', label: 'Job Cancelled', category: 'Job' },
  { value: 'employee.assigned', label: 'Employee Assigned', category: 'Employee' },
  { value: 'employee.available', label: 'Employee Available', category: 'Employee' },
  { value: 'employee.offline', label: 'Employee Offline', category: 'Employee' },
  { value: 'whatsapp.message_received', label: 'WhatsApp Message', category: 'WhatsApp' },
  { value: 'whatsapp.conversation_started', label: 'Conversation Started', category: 'WhatsApp' },
  { value: 'form.submitted', label: 'Form Submitted', category: 'Website' },
  { value: 'website.contact_form', label: 'Contact Form', category: 'Website' },
  { value: 'website.booking_form', label: 'Booking Form', category: 'Website' },
  { value: 'invoice.created', label: 'Invoice Created', category: 'Finance' },
  { value: 'invoice.paid', label: 'Invoice Paid', category: 'Finance' },
  { value: 'invoice.overdue', label: 'Invoice Overdue', category: 'Finance' },
  { value: 'quote.accepted', label: 'Quote Accepted', category: 'Finance' },
  { value: 'time.1h_after_lead', label: '1H After Lead', category: 'Time-Based' },
  { value: 'time.3d_after_job', label: '3D After Job', category: 'Time-Based' },
  { value: 'time.7d_after_invoice', label: '7D After Invoice', category: 'Time-Based' },
];

const ACTION_TYPES = [
  { value: 'send_whatsapp', label: 'Send WhatsApp', icon: MessageCircle },
  { value: 'send_notification', label: 'Send Notification', icon: Bell },
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'create_task', label: 'Create Task', icon: PlusCircle },
  { value: 'create_job', label: 'Create Job', icon: Briefcase },
  { value: 'assign_user', label: 'Assign User', icon: UserPlus },
  { value: 'add_tag', label: 'Add Tag', icon: Tag },
  { value: 'update_record', label: 'Update Record', icon: Save },
  { value: 'move_pipeline', label: 'Move Pipeline', icon: ArrowRight },
  { value: 'call_webhook', label: 'Call Webhook', icon: Webhook },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TriggersView() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('catalog');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [selectedPrebuilt, setSelectedPrebuilt] = useState<PrebuiltTrigger | null>(null);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Custom trigger form
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customTriggerType, setCustomTriggerType] = useState('');
  const [customActions, setCustomActions] = useState<{ type: string; config: Record<string, any> }[]>([]);

  // ─── Fetch data ────────────────────────────────────────────────────────

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await authFetch('/api/triggers');
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
      }
    } catch (err) {
      console.error('Failed to fetch triggers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async () => {
    try {
      const res = await authFetch('/api/triggers/executions?limit=30');
      if (res.ok) {
        const data = await res.json();
        setExecutions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
    fetchExecutions();
  }, [fetchAutomations, fetchExecutions]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleToggleActive = async (automation: Automation) => {
    try {
      const res = await authFetch(`/api/triggers/${automation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !automation.active }),
      });
      if (res.ok) {
        setAutomations(prev =>
          prev.map(a => a.id === automation.id ? { ...a, active: !a.active } : a)
        );
        toast.success(automation.active ? 'Trigger paused' : 'Trigger activated');
      }
    } catch {
      toast.error('Failed to update trigger');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;
    try {
      const res = await authFetch(`/api/triggers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAutomations(prev => prev.filter(a => a.id !== id));
        toast.success('Trigger deleted');
      }
    } catch {
      toast.error('Failed to delete trigger');
    }
  };

  const handleEnablePrebuilt = async (prebuilt: PrebuiltTrigger, customActions?: any[]) => {
    try {
      const actionsToSave = customActions || prebuilt.defaultActions.map(a => ({ type: a.type, config: a.config }));
      const res = await authFetch('/api/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prebuilt.name,
          description: prebuilt.description,
          triggerType: prebuilt.triggerType,
          triggerConfigJson: prebuilt.triggerConfigJson,
          conditionsJson: prebuilt.conditionsJson,
          actionsJson: JSON.stringify(actionsToSave),
          active: true,
        }),
      });
      if (res.ok) {
        const automation = await res.json();
        setAutomations(prev => [automation, ...prev]);
        toast.success(`"${prebuilt.name}" activated!`);
        setSettingsDialogOpen(false);
        setSelectedPrebuilt(null);
        fetchAutomations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to activate trigger');
      }
    } catch {
      toast.error('Failed to activate trigger');
    }
  };

  const handleCreateCustom = async () => {
    if (!customName || !customTriggerType || customActions.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const res = await authFetch('/api/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          description: customDescription || `Custom trigger: ${customName}`,
          triggerType: customTriggerType,
          triggerConfigJson: '{}',
          conditionsJson: '[]',
          actionsJson: JSON.stringify(customActions),
          active: true,
        }),
      });
      if (res.ok) {
        const automation = await res.json();
        setAutomations(prev => [automation, ...prev]);
        toast.success(`Custom trigger "${customName}" created!`);
        setCustomDialogOpen(false);
        resetCustomForm();
        fetchAutomations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create custom trigger');
      }
    } catch {
      toast.error('Failed to create custom trigger');
    }
  };

  const resetCustomForm = () => {
    setCustomName('');
    setCustomDescription('');
    setCustomTriggerType('');
    setCustomActions([]);
  };

  const addCustomAction = (type: string) => {
    const defaultConfigs: Record<string, Record<string, any>> = {
      send_whatsapp: { recipient: 'customer', template: '' },
      send_notification: { title: '', message: '' },
      send_email: { to: '', subject: '', body: '' },
      create_task: { title: '', assignTo: 'round_robin' },
      create_job: { title: '' },
      assign_user: { assignTo: 'round_robin' },
      add_tag: { tag: '' },
      update_record: { recordType: 'lead', field: '', value: '' },
      move_pipeline: { stage: 'contacted' },
      call_webhook: { url: '', method: 'POST' },
    };
    setCustomActions(prev => [...prev, { type, config: defaultConfigs[type] || {} }]);
  };

  const removeCustomAction = (index: number) => {
    setCustomActions(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Filtering ─────────────────────────────────────────────────────────

  const isPrebuiltEnabled = (prebuiltId: string) => {
    return automations.some(a => a.name === PREBUILT_TRIGGERS.find(p => p.id === prebuiltId)?.name);
  };

  const getEnabledAutomation = (prebuiltId: string) => {
    const prebuilt = PREBUILT_TRIGGERS.find(p => p.id === prebuiltId);
    return automations.find(a => a.name === prebuilt?.name);
  };

  const filteredPrebuilts = PREBUILT_TRIGGERS.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.eventLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const myAutomations = automations.filter(a => {
    const matchesCategory = activeCategory === 'all' ||
      PREBUILT_TRIGGERS.find(p => p.name === a.name)?.category === activeCategory;
    const matchesSearch = !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCount = automations.filter(a => a.active).length;
  const popularTriggers = PREBUILT_TRIGGERS.filter(t => t.popular);
  const enabledCount = PREBUILT_TRIGGERS.filter(t => isPrebuiltEnabled(t.id)).length;

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-500" />
          <span className="text-muted-foreground text-sm">Loading triggers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Zap className="size-5 text-emerald-500" />
            </div>
            CRM Triggers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {PREBUILT_TRIGGERS.length} pre-built automations — toggle to enable, or build your own
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search triggers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Badge variant="outline" className="h-9 px-3 gap-1.5 text-xs border-emerald-500/30 text-emerald-600">
            <CircleCheck className="size-3.5" />
            {activeCount} Active
          </Badge>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setCustomDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Custom
          </Button>
        </div>
      </div>

      {/* ─── Stats Bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Zap className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{PREBUILT_TRIGGERS.length}</p>
                <p className="text-[10px] text-muted-foreground">Available Triggers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CircleCheck className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Store className="size-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{enabledCount}</p>
                <p className="text-[10px] text-muted-foreground">From Library</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Activity className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{automations.reduce((s, a) => s + a.executionCount, 0)}</p>
                <p className="text-[10px] text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Popular Quick-Enable Row ────────────────────────────────────── */}
      {activeCategory === 'all' && !searchQuery && activeTab === 'catalog' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold">Most Popular</span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{popularTriggers.length}</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {popularTriggers.map((trigger) => {
              const isEnabled = isPrebuiltEnabled(trigger.id);
              const automation = getEnabledAutomation(trigger.id);
              const Icon = trigger.icon;
              return (
                <Card
                  key={trigger.id}
                  className={cn(
                    'shrink-0 w-64 transition-all hover:shadow-md border',
                    isEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:border-emerald-500/20'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        'size-8 rounded-lg flex items-center justify-center shrink-0',
                        isEnabled ? 'bg-emerald-500/15' : 'bg-muted'
                      )}>
                        <Icon className={cn('size-4', isEnabled ? 'text-emerald-500' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold truncate">{trigger.name}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{trigger.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled ? (automation?.active ?? true) : false}
                        onCheckedChange={() => {
                          if (isEnabled && automation) {
                            handleToggleActive(automation);
                          } else {
                            handleEnablePrebuilt(trigger);
                          }
                        }}
                        className="scale-75 origin-right"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Category Pills ──────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = cat.id === 'all'
            ? PREBUILT_TRIGGERS.length
            : PREBUILT_TRIGGERS.filter(p => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                activeCategory === cat.id
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
              )}
            >
              <Icon className="size-3" />
              {cat.label}
              <span className={cn(
                'text-[9px] font-semibold',
                activeCategory === cat.id ? 'text-emerald-500' : 'text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Main Tabs ───────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog" className="gap-1.5">
            <Store className="size-3.5" />
            Trigger Library
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{PREBUILT_TRIGGERS.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-1.5">
            <Zap className="size-3.5" />
            My Triggers
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{automations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Activity className="size-3.5" />
            Execution Log
          </TabsTrigger>
        </TabsList>

        {/* ─── Catalog Tab ──────────────────────────────────────────────── */}
        <TabsContent value="catalog" className="mt-4">
          {filteredPrebuilts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No triggers found</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Try adjusting your search or category filter
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrebuilts.map((trigger) => {
                const isEnabled = isPrebuiltEnabled(trigger.id);
                const automation = getEnabledAutomation(trigger.id);
                const isActive = automation?.active ?? false;
                const isExpanded = expandedCard === trigger.id;
                const Icon = trigger.icon;
                const CategoryIcon = CATEGORIES.find(c => c.id === trigger.category)?.icon || Zap;

                return (
                  <Card
                    key={trigger.id}
                    className={cn(
                      'group transition-all hover:shadow-md border',
                      isEnabled && isActive
                        ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                        : isEnabled
                        ? 'border-amber-500/20 bg-amber-500/[0.02]'
                        : 'border-border hover:border-emerald-500/20'
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Top row: icon + name + toggle */}
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                          isEnabled && isActive
                            ? 'bg-emerald-500/15'
                            : isEnabled
                            ? 'bg-amber-500/15'
                            : 'bg-muted group-hover:bg-emerald-500/10'
                        )}>
                          <Icon className={cn(
                            'size-5 transition-colors',
                            isEnabled && isActive ? 'text-emerald-500' : isEnabled ? 'text-amber-500' : 'text-muted-foreground group-hover:text-emerald-500'
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold truncate">{trigger.name}</h3>
                            {trigger.popular && !isEnabled && (
                              <Badge className="text-[8px] h-3.5 px-1 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {trigger.description}
                          </p>
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={isEnabled ? isActive : false}
                                onCheckedChange={() => {
                                  if (isEnabled && automation) {
                                    handleToggleActive(automation);
                                  } else {
                                    handleEnablePrebuilt(trigger);
                                  }
                                }}
                                className="scale-90 origin-top-right"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {isEnabled ? (isActive ? 'Click to pause' : 'Click to activate') : 'Click to enable'}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Event source badge */}
                      <div className="mt-3 flex items-center gap-1.5">
                        <div className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                          trigger.categoryColor
                        )}>
                          <CategoryIcon className="size-2.5" />
                          {trigger.category}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Zap className="size-2.5" />
                          {trigger.eventLabel}
                        </div>
                      </div>

                      {/* Actions preview */}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {trigger.defaultActions.map((action, idx) => {
                          const ActionIcon = action.icon;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5"
                            >
                              <ActionIcon className="size-2.5" />
                              {action.label}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded: status + settings */}
                      {isExpanded && isEnabled && automation && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Activity className="size-3" />
                              {automation.executionCount} runs
                            </span>
                            {automation.lastExecutedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {new Date(automation.lastExecutedAt).toLocaleDateString()}
                              </span>
                            )}
                            {automation.lastExecutionStatus && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[8px] h-3.5 px-1',
                                  automation.lastExecutionStatus === 'success' && 'text-emerald-600 border-emerald-500/30',
                                  automation.lastExecutionStatus === 'failed' && 'text-red-600 border-red-500/30',
                                  automation.lastExecutionStatus === 'partial' && 'text-amber-600 border-amber-500/30',
                                )}
                              >
                                {automation.lastExecutionStatus}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom row */}
                      <div className="mt-3 pt-2.5 border-t flex items-center justify-between">
                        <button
                          onClick={() => setExpandedCard(isExpanded ? null : trigger.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          {isExpanded ? 'Less' : 'Details'}
                        </button>
                        <div className="flex items-center gap-1">
                          {isEnabled && automation ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setSelectedAutomation(automation);
                                      setSelectedPrebuilt(trigger);
                                      setSettingsDialogOpen(true);
                                    }}
                                  >
                                    <Settings2 className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Settings</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0 text-muted-foreground hover:text-red-500"
                                    onClick={() => handleDelete(automation.id)}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-medium">Toggle to enable →</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* ─── Custom Trigger Card ──────────────────────────────────── */}
              <Card
                className="group transition-all hover:shadow-md border-dashed border-2 border-muted-foreground/20 hover:border-emerald-500/30 cursor-pointer"
                onClick={() => setCustomDialogOpen(true)}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[200px] gap-3">
                  <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Plus className="size-6 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold">Build Custom Trigger</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Can&apos;t find what you need? Create a custom automation from scratch
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600">
                    <Sparkles className="size-2.5 mr-1" />
                    Custom
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── My Triggers Tab ───────────────────────────────────────────── */}
        <TabsContent value="my" className="mt-4">
          {myAutomations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <ZapOff className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No active triggers yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Browse the Trigger Library and toggle to enable automations
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setActiveTab('catalog')}
                >
                  <Store className="size-3.5" />
                  Browse Library
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {myAutomations.map((automation) => {
                const matchingPrebuilt = PREBUILT_TRIGGERS.find(p => p.name === automation.name);
                const Icon = matchingPrebuilt?.icon || Zap;
                const category = matchingPrebuilt?.category;
                const CategoryIcon = category ? CATEGORIES.find(c => c.id === category)?.icon : null;
                const categoryColor = matchingPrebuilt?.categoryColor || 'bg-muted text-muted-foreground border-border';

                return (
                  <Card key={automation.id} className={cn(
                    'transition-all border',
                    automation.active ? 'border-emerald-500/20' : 'border-border opacity-60'
                  )}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn(
                        'size-9 rounded-lg flex items-center justify-center shrink-0',
                        automation.active ? 'bg-emerald-500/15' : 'bg-muted'
                      )}>
                        <Icon className={cn('size-4', automation.active ? 'text-emerald-500' : 'text-muted-foreground')} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold truncate">{automation.name}</h4>
                          {category && CategoryIcon && (
                            <div className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border', categoryColor)}>
                              <CategoryIcon className="size-2" />
                              {category}
                            </div>
                          )}
                          {!matchingPrebuilt && (
                            <Badge variant="outline" className="text-[9px] h-4 border-amber-500/30 text-amber-600">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {automation.description || `Trigger: ${automation.triggerType}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="size-3" />
                            {automation.executionCount}
                          </span>
                          {automation.lastExecutedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(automation.lastExecutedAt).toLocaleDateString()}
                            </span>
                          )}
                          {automation.lastExecutionStatus && (
                            <Badge variant="outline" className={cn(
                              'text-[8px] h-3.5 px-1',
                              automation.lastExecutionStatus === 'success' && 'text-emerald-600 border-emerald-500/30',
                              automation.lastExecutionStatus === 'failed' && 'text-red-600 border-red-500/30',
                            )}>
                              {automation.lastExecutionStatus}
                            </Badge>
                          )}
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={automation.active}
                                onCheckedChange={() => handleToggleActive(automation)}
                                className="scale-90"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{automation.active ? 'Pause' : 'Activate'}</TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-7 p-0">
                              <Settings2 className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedAutomation(automation);
                              setSettingsDialogOpen(true);
                            }}>
                              <Settings2 className="size-3.5 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(automation.id)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="size-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Execution Log Tab ──────────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-4">
          {executions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <Activity className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No executions yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Enable some triggers and they will start logging executions here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {executions.map((exec) => (
                <Card key={exec.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn(
                      'size-8 rounded-lg flex items-center justify-center shrink-0',
                      exec.status === 'success' ? 'bg-emerald-500/15' :
                      exec.status === 'failed' ? 'bg-red-500/15' :
                      'bg-amber-500/15'
                    )}>
                      {exec.status === 'success' ? <CheckCircle className="size-4 text-emerald-500" /> :
                       exec.status === 'failed' ? <XCircle className="size-4 text-red-500" /> :
                       <Clock className="size-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {exec.automation?.name || exec.triggerEvent}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {exec.triggerEvent} • {new Date(exec.createdAt).toLocaleString()}
                        {exec.durationMs && ` • ${exec.durationMs}ms`}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn(
                      'text-[9px] h-5 px-1.5',
                      exec.status === 'success' && 'text-emerald-600 border-emerald-500/30',
                      exec.status === 'failed' && 'text-red-600 border-red-500/30',
                      exec.status === 'partial' && 'text-amber-600 border-amber-500/30',
                    )}>
                      {exec.status}
                    </Badge>
                    {exec.conditionsMet === false && (
                      <Badge variant="outline" className="text-[9px] h-5 px-1.5 text-muted-foreground">
                        Skipped
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Settings Dialog ──────────────────────────────────────────────── */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4" />
              Trigger Settings
            </DialogTitle>
            <DialogDescription>
              {selectedPrebuilt?.name || selectedAutomation?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPrebuilt && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">DEFAULT ACTIONS</h4>
                <div className="space-y-2">
                  {selectedPrebuilt.defaultActions.map((action, idx) => {
                    const ActionIcon = action.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <div className="size-7 rounded-md bg-background flex items-center justify-center">
                          <ActionIcon className="size-3.5 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground">{action.type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">EVENT SOURCE</h4>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Zap className="size-3.5 text-emerald-500" />
                  <span className="text-xs">{selectedPrebuilt.eventLabel}</span>
                  <span className="text-[10px] text-muted-foreground">({selectedPrebuilt.eventSource})</span>
                </div>
              </div>
            </div>
          )}

          {selectedAutomation && !selectedPrebuilt && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">TRIGGER TYPE</h4>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Zap className="size-3.5 text-emerald-500" />
                  <span className="text-xs">{selectedAutomation.triggerType}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">STATUS</h4>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedAutomation.active}
                    onCheckedChange={() => {
                      handleToggleActive(selectedAutomation);
                      setSelectedAutomation({ ...selectedAutomation, active: !selectedAutomation.active });
                    }}
                  />
                  <span className="text-xs">{selectedAutomation.active ? 'Active' : 'Paused'}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Close
            </Button>
            {selectedPrebuilt && !isPrebuiltEnabled(selectedPrebuilt.id) && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleEnablePrebuilt(selectedPrebuilt)}
              >
                Enable Trigger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Custom Trigger Builder Dialog ────────────────────────────────── */}
      <Dialog open={customDialogOpen} onOpenChange={(open) => {
        setCustomDialogOpen(open);
        if (!open) resetCustomForm();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              Build Custom Trigger
            </DialogTitle>
            <DialogDescription>
              Create a custom automation by selecting an event trigger and actions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Trigger Name *</label>
              <Input
                placeholder="e.g., High Value Lead → Priority Alert"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <Textarea
                placeholder="What does this trigger do?"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Event Trigger */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">When this happens... *</label>
              <Select value={customTriggerType} onValueChange={setCustomTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event trigger" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(
                    TRIGGER_EVENTS.reduce((groups, event) => {
                      const key = event.category;
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(event);
                      return groups;
                    }, {} as Record<string, typeof TRIGGER_EVENTS>)
                  ).map(([category, events]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {category}
                      </div>
                      {events.map(event => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Then do this... *</label>

              {customActions.length > 0 && (
                <div className="space-y-2">
                  {customActions.map((action, idx) => {
                    const actionDef = ACTION_TYPES.find(a => a.value === action.type);
                    return (
                      <div key={idx} className="p-2.5 rounded-lg border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {actionDef && <actionDef.icon className="size-3.5 text-emerald-500" />}
                            <span className="text-xs font-medium">{actionDef?.label || action.type}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-6 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => removeCustomAction(idx)}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>

                        {/* Action-specific config fields */}
                        {action.type === 'send_whatsapp' && (
                          <div className="space-y-1.5">
                            <Select value={action.config.recipient || 'customer'} onValueChange={(v) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, recipient: v } };
                              setCustomActions(updated);
                            }}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Recipient" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="employee">Employee</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Message template"
                              value={action.config.template || ''}
                              onChange={(e) => {
                                const updated = [...customActions];
                                updated[idx] = { ...updated[idx], config: { ...updated[idx].config, template: e.target.value } };
                                setCustomActions(updated);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        )}

                        {action.type === 'send_notification' && (
                          <div className="space-y-1.5">
                            <Input
                              placeholder="Title"
                              value={action.config.title || ''}
                              onChange={(e) => {
                                const updated = [...customActions];
                                updated[idx] = { ...updated[idx], config: { ...updated[idx].config, title: e.target.value } };
                                setCustomActions(updated);
                              }}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder="Message"
                              value={action.config.message || ''}
                              onChange={(e) => {
                                const updated = [...customActions];
                                updated[idx] = { ...updated[idx], config: { ...updated[idx].config, message: e.target.value } };
                                setCustomActions(updated);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        )}

                        {action.type === 'create_task' && (
                          <Input
                            placeholder="Task title"
                            value={action.config.title || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, title: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'create_job' && (
                          <Input
                            placeholder="Job title"
                            value={action.config.title || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, title: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'add_tag' && (
                          <Input
                            placeholder="Tag name"
                            value={action.config.tag || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, tag: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'assign_user' && (
                          <Select value={action.config.assignTo || 'round_robin'} onValueChange={(v) => {
                            const updated = [...customActions];
                            updated[idx] = { ...updated[idx], config: { ...updated[idx].config, assignTo: v } };
                            setCustomActions(updated);
                          }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Assign to" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="round_robin">Round Robin</SelectItem>
                              <SelectItem value="lead_owner">Lead Owner</SelectItem>
                              <SelectItem value="specific">Specific User</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {action.type === 'call_webhook' && (
                          <Input
                            placeholder="Webhook URL"
                            value={action.config.url || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, url: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'move_pipeline' && (
                          <Select value={action.config.stage || 'contacted'} onValueChange={(v) => {
                            const updated = [...customActions];
                            updated[idx] = { ...updated[idx], config: { ...updated[idx].config, stage: v } };
                            setCustomActions(updated);
                          }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Target stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="proposal">Proposal</SelectItem>
                              <SelectItem value="won">Won</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Select onValueChange={addCustomAction}>
                <SelectTrigger className="h-8 text-xs border-dashed">
                  <SelectValue placeholder="+ Add an action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(actionType => {
                    const ActionIcon = actionType.icon;
                    return (
                      <SelectItem key={actionType.value} value={actionType.value}>
                        <div className="flex items-center gap-2">
                          <ActionIcon className="size-3.5" />
                          {actionType.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCustomDialogOpen(false);
              resetCustomForm();
            }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleCreateCustom}
              disabled={!customName || !customTriggerType || customActions.length === 0}
            >
              <Zap className="size-3.5" />
              Create Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
