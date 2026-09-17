'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Check,
  Eye,
  Sparkles,
  Layers,
  Calendar,
  PenTool,
  MapPin,
  Camera,
  HeartPulse,
  Wrench,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  Building2,
  ShoppingCart,
  Smile,
  ShieldCheck,
  Clock,
  Car,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FormField } from '@/features/forms/types';
import { FormRuntimeRenderer } from '../runtime/form-runtime-renderer';
import type { FormSchema } from '@/lib/forms/form-schema-types';

export interface FormTemplateItem {
  id: string;
  name: string;
  category: 'healthcare' | 'field_service' | 'hvac' | 'ecommerce' | 'survey' | 'real_estate' | 'legal' | 'general';
  categoryLabel: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  featured?: boolean;
  fields: FormField[];
  highlightWidgets: string[];
}

export const FORM_TEMPLATES: FormTemplateItem[] = [
  // ─── 1. DENTAL CLINIC PATIENT INTAKE & APPOINTMENT (Featured) ─────────────────
  {
    id: 'dental_clinic_intake',
    name: 'Dental Clinic Patient Intake & Appointment',
    category: 'healthcare',
    categoryLabel: 'Healthcare & Dental',
    description: 'Comprehensive dental patient registration with reason for visit, medical history, insurance card photo, appointment scheduling, and consent signature.',
    icon: HeartPulse,
    badge: 'FEATURED TEMPLATE',
    featured: true,
    highlightWidgets: ['📅 Appointment Booking', '📸 Insurance Card Upload', '✍️ Patient Signature Pad', '🦷 Treatment Selector'],
    fields: [
      {
        id: 'patient_name',
        label: 'Patient Full Name',
        type: 'short_answer',
        required: true,
        placeholder: 'e.g. Jane Doe',
        description: 'Legal first and last name as shown on insurance card.',
        width: 'half',
      },
      {
        id: 'patient_dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        placeholder: 'YYYY-MM-DD',
        width: 'half',
      },
      {
        id: 'patient_phone',
        label: 'Mobile Phone (for SMS Reminders)',
        type: 'phone',
        required: true,
        placeholder: '+1 (555) 000-0000',
        width: 'half',
      },
      {
        id: 'patient_email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'jane@example.com',
        width: 'half',
      },
      {
        id: 'dental_service_reason',
        label: 'Reason for Dental Visit',
        type: 'dropdown',
        required: true,
        placeholder: 'Select treatment or concern',
        options: [
          'Routine Cleaning & Comprehensive Exam',
          'Emergency Toothache / Swelling',
          'Teeth Whitening & Cosmetic Consultation',
          'Dental Crowns & Bridges',
          'Root Canal Evaluation',
          'Wisdom Teeth & Extractions',
          'Orthodontics / Clear Aligners Consultation',
          'Dental Implants',
        ],
      },
      {
        id: 'preferred_appointment_time',
        label: 'Preferred Appointment Date & Time',
        type: 'date',
        required: true,
        widgetType: 'appointment',
        widgetConfig: {
          duration: 45,
          interval: 30,
          leadTime: 24,
        },
        description: 'Choose your preferred date and slot for the visit.',
      },
      {
        id: 'medical_history_notes',
        label: 'Medical Conditions & Allergies',
        type: 'long_answer',
        required: false,
        placeholder: 'List any allergies (latex, penicillin), medications, or medical conditions (diabetes, heart conditions, pregnancy)...',
      },
      {
        id: 'insurance_provider_info',
        label: 'Dental Insurance Carrier & Policy ID',
        type: 'short_answer',
        required: false,
        placeholder: 'e.g. Delta Dental - Policy #98234710',
        description: 'Leave blank if paying out-of-pocket / self-pay.',
      },
      {
        id: 'insurance_card_upload',
        label: 'Insurance Card Photo (Front & Back)',
        type: 'photo',
        required: false,
        widgetType: 'image_upload',
        widgetConfig: {
          maxFiles: 2,
          maxFileSizeMb: 10,
        },
        description: 'Upload clear photos of your dental insurance card.',
      },
      {
        id: 'patient_consent_signature',
        label: 'Patient Consent & Financial Agreement Signature',
        type: 'signature',
        required: true,
        widgetType: 'signature',
        widgetConfig: {
          legalText: 'By signing below, I certify that the information provided is accurate and authorize the dental clinic to process treatment and insurance billing.',
        },
      },
    ],
  },

  // ─── 2. PLUMBER EMERGENCY & SERVICE JOB CARD (Featured) ──────────────────────
  {
    id: 'plumber_service_job_card',
    name: 'Plumbing Emergency & Service Job Card',
    category: 'field_service',
    categoryLabel: 'Field Service & Plumbing',
    description: 'Dispatch-ready plumbing service order with automated Route Planner Map, issue categorization, leak photo upload, arrival alerts, and customer sign-off.',
    icon: Wrench,
    badge: 'FEATURED TEMPLATE',
    featured: true,
    highlightWidgets: ['🗺️ Route Planner Map', '📸 Photo with Notes', '🚨 Emergency Selector', '✍️ Work Auth Signature'],
    fields: [
      {
        id: 'client_name',
        label: 'Customer Full Name',
        type: 'short_answer',
        required: true,
        placeholder: 'e.g. Robert Smith',
        width: 'half',
      },
      {
        id: 'client_phone',
        label: 'Contact Phone (for Tech Arrival ETA)',
        type: 'phone',
        required: true,
        placeholder: '+1 (555) 234-5678',
        width: 'half',
      },
      {
        id: 'client_service_address',
        label: 'Service Address (Street, City, ZIP)',
        type: 'short_answer',
        required: true,
        placeholder: '123 Elm Street, Chicago, IL 60601',
      },
      {
        id: 'plumbing_route_planner',
        label: 'Service Route & Technician Dispatch Route',
        type: 'short_answer',
        required: false,
        widgetType: 'route_planner_map',
        widgetConfig: {
          startLocationLabel: 'Plumbing Dispatch Hub',
          endLocationLabel: 'Customer Service Location',
          addressPlaceholder: 'Street address, city or ZIP',
          allowAdditionalStops: true,
          showRouteSummary: true,
          defaultTravelMode: 'driving',
        },
        description: 'Live interactive route between the plumbing dispatch center and the job site.',
      },
      {
        id: 'plumbing_issue_type',
        label: 'Plumbing Issue / Service Requested',
        type: 'dropdown',
        required: true,
        placeholder: 'Select primary issue',
        options: [
          '🚨 Active Burst Pipe / Flooding (Emergency)',
          'Clogged Drain / Main Sewer Line Backup',
          'Water Heater Repair or Replacement',
          'Leaking Faucet / Running Toilet',
          'Garbage Disposal Repair',
          'Sump Pump Failure / Inspection',
          'Gas Line Leak / Inspection',
          'General Plumbing Maintenance & Inspection',
        ],
      },
      {
        id: 'urgency_priority',
        label: 'Service Priority Level',
        type: 'radio',
        required: true,
        options: [
          '🚨 Emergency (Immediate Dispatch within 60-90 min)',
          'Same Day Service (Standard business hours)',
          'Schedule for Later this Week',
        ],
      },
      {
        id: 'leak_photo_upload',
        label: 'Photo of the Leak / Fixture Issue',
        type: 'photo',
        required: false,
        widgetType: 'photo',
        description: 'Take or upload a photo of the plumbing leak, valve, or fixture.',
      },
      {
        id: 'property_access_notes',
        label: 'Property Access & Gate Code Instructions',
        type: 'long_answer',
        required: false,
        placeholder: 'e.g. Gate code #4521, dog is in the backyard, key is in lockbox...',
      },
      {
        id: 'work_authorization_signature',
        label: 'Work Authorization & Diagnostic Fee Signature',
        type: 'signature',
        required: true,
        widgetType: 'signature',
        widgetConfig: {
          legalText: 'I authorize the technician to perform diagnostic inspection and understand that estimates will be provided before major repairs begin.',
        },
      },
    ],
  },

  // ─── 3. HVAC MAINTENANCE & TUNE-UP INSPECTION ───────────────────────────────
  {
    id: 'hvac_inspection_tuneup',
    name: 'HVAC Seasonal Tune-Up & Maintenance',
    category: 'hvac',
    categoryLabel: 'HVAC & Climate',
    description: 'AC and heating inspection checklist with system type selection, filter status, thermostat checks, and service dispatch.',
    icon: SlidersHorizontal,
    badge: 'POPULAR',
    highlightWidgets: ['❄️ System Diagnostics', '📅 Booking Calendar', '✍️ Service Sign-off'],
    fields: [
      { id: 'homeowner_name', label: 'Homeowner Name', type: 'short_answer', required: true, width: 'half' },
      { id: 'homeowner_phone', label: 'Contact Phone', type: 'phone', required: true, width: 'half' },
      { id: 'service_location', label: 'Service Address', type: 'short_answer', required: true },
      {
        id: 'hvac_system_type',
        label: 'HVAC System Type',
        type: 'dropdown',
        required: true,
        options: ['Central AC & Gas Furnace', 'Heat Pump System', 'Ductless Mini-Split', 'Boiler / Radiator', 'Commercial Rooftop Unit'],
      },
      {
        id: 'system_age',
        label: 'Approximate System Age',
        type: 'dropdown',
        required: false,
        options: ['Less than 3 years', '3 - 7 years', '8 - 12 years', '13+ years (Upgrade candidate)'],
      },
      {
        id: 'preferred_service_slot',
        label: 'Preferred Service Window',
        type: 'date',
        required: true,
        widgetType: 'appointment',
      },
      {
        id: 'customer_signature',
        label: 'Service Authorization Signature',
        type: 'signature',
        required: true,
        widgetType: 'signature',
      },
    ],
  },

  // ─── 4. E-COMMERCE PRODUCT ORDER WITH STRIPE PAYMENT ───────────────────────
  {
    id: 'ecommerce_product_order',
    name: 'Product Order & 1-Click Stripe Checkout',
    category: 'ecommerce',
    categoryLabel: 'E-Commerce & Orders',
    description: 'Product catalog ordering with quantity selection, shipping address, and secure inline credit card payment.',
    icon: ShoppingCart,
    badge: 'PAYMENT READY',
    highlightWidgets: ['💳 Stripe Elements', '📦 Inventory Options', '📍 Shipping Address'],
    fields: [
      { id: 'buyer_name', label: 'Customer Full Name', type: 'short_answer', required: true, width: 'half' },
      { id: 'buyer_email', label: 'Email Address for Receipt', type: 'email', required: true, width: 'half' },
      {
        id: 'product_item',
        label: 'Select Product Package',
        type: 'dropdown',
        required: true,
        options: ['Starter Kit ($49.00)', 'Professional Bundle ($99.00)', 'Enterprise Suite ($249.00)'],
      },
      { id: 'order_quantity', label: 'Quantity', type: 'numerical', required: true, defaultValue: 1 },
      { id: 'shipping_address', label: 'Shipping Address', type: 'short_answer', required: true },
      {
        id: 'stripe_payment_card',
        label: 'Secure Credit or Debit Card Payment',
        type: 'short_answer',
        required: true,
        widgetType: 'payment_stripe_elements',
        widgetConfig: {
          gatewayId: 'stripe_elements',
          currency: 'USD',
          showCard: true,
          chargeImmediately: true,
        },
      },
    ],
  },

  // ─── 5. NET PROMOTER SCORE (NPS) & CUSTOMER FEEDBACK ───────────────────────
  {
    id: 'nps_customer_survey',
    name: 'Customer Satisfaction & NPS Survey',
    category: 'survey',
    categoryLabel: 'Surveys & Feedback',
    description: '0-10 Net Promoter Score survey with 5-star rating, conditional feedback comments, and social share prompts.',
    icon: Smile,
    badge: 'ANALYTICS READY',
    highlightWidgets: ['⭐ 5-Star Rating', '📊 NPS 0-10 Slider', '💬 Conditional Comments'],
    fields: [
      { id: 'customer_name', label: 'Your Name (Optional)', type: 'short_answer', required: false, width: 'half' },
      { id: 'customer_email', label: 'Your Email (Optional)', type: 'email', required: false, width: 'half' },
      {
        id: 'service_rating',
        label: 'How would you rate your overall experience with us?',
        type: 'rating',
        required: true,
        widgetType: 'star_rating_comments',
        widgetConfig: { maxStars: 5, requireCommentOnLowRating: true },
      },
      {
        id: 'nps_score',
        label: 'How likely are you to recommend our company to a friend or colleague?',
        type: 'short_answer',
        required: true,
        widgetType: 'nps_slider',
        widgetConfig: { min: 0, max: 10, minLabel: 'Not likely', maxLabel: 'Extremely likely' },
      },
      { id: 'feedback_improvements', label: 'What could we do to improve in the future?', type: 'long_answer', required: false },
    ],
  },

  // ─── 6. REAL ESTATE PROPERTY INQUIRY & TOUR BOOKING ────────────────────────
  {
    id: 'real_estate_tour_booking',
    name: 'Real Estate Property Tour & Schedule',
    category: 'real_estate',
    categoryLabel: 'Real Estate',
    description: 'Lead capture form for buyers and renters to schedule in-person or virtual property showings with pre-approval info.',
    icon: Building2,
    badge: 'LEAD CAPTURE',
    highlightWidgets: ['🏠 Tour Scheduler', '💰 Budget Slider', '📍 Property Locator'],
    fields: [
      { id: 'buyer_name', label: 'Full Name', type: 'short_answer', required: true, width: 'half' },
      { id: 'buyer_phone', label: 'Phone Number', type: 'phone', required: true, width: 'half' },
      { id: 'buyer_email', label: 'Email Address', type: 'email', required: true },
      {
        id: 'tour_type',
        label: 'Tour Preference',
        type: 'radio',
        required: true,
        options: ['In-Person Guided Showing', 'Live Video Virtual Tour (Zoom / FaceTime)'],
      },
      {
        id: 'tour_date_time',
        label: 'Preferred Tour Date & Time Slot',
        type: 'date',
        required: true,
        widgetType: 'appointment',
      },
      {
        id: 'financing_status',
        label: 'Financing Pre-Approval Status',
        type: 'dropdown',
        required: false,
        options: ['Pre-Approved with Mortgage Lender', 'Cash Buyer', 'Need Lender Recommendations', 'Just Browsing'],
      },
    ],
  },
];

export interface TemplateExplorerProps {
  onBackToBuild: () => void;
  onApplyTemplate: (template: FormTemplateItem, customTitle: string, mode: 'replace' | 'append') => void;
  currentFieldCount: number;
}

export function TemplateExplorer({
  onBackToBuild,
  onApplyTemplate,
  currentFieldCount,
}: TemplateExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Preview State
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplateItem | null>(null);
  const [customFormTitle, setCustomFormTitle] = useState('');
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return FORM_TEMPLATES.filter((tpl) => {
      const matchesCat = selectedCategory === 'all' || tpl.category === selectedCategory || (selectedCategory === 'featured' && tpl.featured);
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.categoryLabel.toLowerCase().includes(q) ||
        tpl.highlightWidgets.some((w) => w.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  // Categories list
  const categories = [
    { id: 'all', label: 'All Templates', count: FORM_TEMPLATES.length },
    { id: 'featured', label: '⭐ Featured', count: FORM_TEMPLATES.filter((t) => t.featured).length },
    { id: 'healthcare', label: '🦷 Dental & Healthcare', count: FORM_TEMPLATES.filter((t) => t.category === 'healthcare').length },
    { id: 'field_service', label: '🔧 Plumbing & Field Service', count: FORM_TEMPLATES.filter((t) => t.category === 'field_service').length },
    { id: 'hvac', label: '❄️ HVAC & Climate', count: FORM_TEMPLATES.filter((t) => t.category === 'hvac').length },
    { id: 'ecommerce', label: '🛒 E-Commerce & Payment', count: FORM_TEMPLATES.filter((t) => t.category === 'ecommerce').length },
    { id: 'survey', label: '📊 Surveys & NPS', count: FORM_TEMPLATES.filter((t) => t.category === 'survey').length },
    { id: 'real_estate', label: '🏠 Real Estate', count: FORM_TEMPLATES.filter((t) => t.category === 'real_estate').length },
  ];

  // Handle opening preview modal
  const handleOpenPreview = (tpl: FormTemplateItem) => {
    setPreviewTemplate(tpl);
    setCustomFormTitle(tpl.name);
    setApplyMode(currentFieldCount > 0 ? 'replace' : 'replace');
  };

  // Convert template fields to FormSchema for preview render
  const previewSchema: FormSchema | null = useMemo(() => {
    if (!previewTemplate) return null;
    return {
      version: 1,
      steps: [{ id: 'step_1', title: customFormTitle || previewTemplate.name }],
      fields: previewTemplate.fields.map((f) => ({
        id: f.id,
        type: f.widgetType ? 'control_widget' : (f.type as any),
        label: f.label,
        placeholder: f.placeholder,
        helpText: f.description || f.helpText,
        required: f.required,
        stepId: 'step_1',
        width: f.width || 'full',
        widgetType: f.widgetType,
        widgetConfig: f.widgetConfig,
        options: f.options?.map((opt) =>
          typeof opt === 'string'
            ? { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }
            : opt
        ),
      })),
      theme: {
        primaryColor: '#059669',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: '12px',
        layout: 'classic',
      },
      rules: [],
      settings: {
        submitButtonText: 'Submit Form',
        successTitle: 'Thank You!',
        successMessage: 'Your submission has been recorded.',
        actions: {},
      },
    };
  }, [previewTemplate, customFormTitle]);

  const handleConfirmApply = () => {
    if (!previewTemplate) return;
    onApplyTemplate(previewTemplate, customFormTitle || previewTemplate.name, applyMode);
    setPreviewTemplate(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* ════ TOP STICKY HEADER & BACK BUTTON ════ */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToBuild}
            className="h-9 gap-2 font-semibold text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Build</span>
          </Button>

          <div className="h-5 w-[1px] bg-border hidden sm:block" />

          <div>
            <h1 className="text-base font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="size-4 text-emerald-600" />
              <span>Form Template Library</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Choose a pre-built industry template with pre-configured widgets, maps, and signatures.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates, widgets, industries..."
            className="pl-9 h-9 text-xs bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ════ CATEGORY FILTER CHIPS ════ */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-border/40 bg-background/40">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <span>{cat.label}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-background/80 text-muted-foreground'
              )}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* ════ TEMPLATE CARDS GRID ════ */}
      <div className="p-6 max-w-7xl mx-auto w-full">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Search className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No matching templates found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search terms or category filter to discover available industry templates.
            </p>
            <Button variant="outline" size="sm" onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => {
              const IconComp = tpl.icon || Layers;
              return (
                <Card
                  key={tpl.id}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-emerald-500/50 bg-card',
                    tpl.featured && 'ring-1 ring-emerald-500/30 border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.03] to-transparent'
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <IconComp className="size-5" />
                        </div>
                        <div>
                          <Badge variant="outline" className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground bg-muted/40">
                            {tpl.categoryLabel}
                          </Badge>
                        </div>
                      </div>

                      {tpl.badge && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-2xs">
                          {tpl.badge}
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors leading-snug">
                      {tpl.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 leading-relaxed text-muted-foreground">
                      {tpl.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Highlighted Widgets Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.highlightWidgets.map((w, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/70 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-border/50"
                        >
                          {w}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <FileText className="size-3.5 text-emerald-600" />
                        {tpl.fields.length} Configured Fields
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPreview(tpl)}
                        className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted/80"
                      >
                        <Eye className="size-3.5" />
                        <span>Preview</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenPreview(tpl)}
                        className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <span>Select</span>
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ════ TEMPLATE PREVIEW & CONFIRMATION MODAL ════ */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          {/* Modal Header */}
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="size-4" />
              <span>Template Preview & Load</span>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {previewTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {/* Modal Body: Split view of Settings & Live Form Preview */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Column: Form Name & Loading Mode */}
            <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-border bg-card/60 space-y-5 overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Form Title</Label>
                <Input
                  type="text"
                  value={customFormTitle}
                  onChange={(e) => setCustomFormTitle(e.target.value)}
                  placeholder="Enter form title..."
                  className="h-9 text-xs bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  You can change this anytime in the form builder.
                </p>
              </div>

              {currentFieldCount > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs font-semibold text-foreground">Loading Mode</Label>
                  <RadioGroup
                    value={applyMode}
                    onValueChange={(val) => setApplyMode(val as 'replace' | 'append')}
                    className="space-y-2 text-xs"
                  >
                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:border-emerald-500/60 transition-colors">
                      <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                      <div className="space-y-0.5">
                        <label htmlFor="mode-replace" className="font-semibold text-foreground cursor-pointer">
                          Replace existing form
                        </label>
                        <p className="text-[10px] text-muted-foreground">
                          Overwrites the current {currentFieldCount} field(s) on your canvas with this template.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background cursor-pointer hover:border-emerald-500/60 transition-colors">
                      <RadioGroupItem value="append" id="mode-append" className="mt-0.5" />
                      <div className="space-y-0.5">
                        <label htmlFor="mode-append" className="font-semibold text-foreground cursor-pointer">
                          Append to existing form
                        </label>
                        <p className="text-[10px] text-muted-foreground">
                          Keeps existing {currentFieldCount} field(s) and appends this template's {previewTemplate?.fields.length} fields at the end.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Template Specs */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-semibold text-foreground">Template Specs</Label>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs text-muted-foreground border border-border/60">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="font-semibold text-foreground">{previewTemplate?.categoryLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Fields:</span>
                    <span className="font-semibold text-foreground">{previewTemplate?.fields.length} Questions</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Widgets Included:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {previewTemplate?.fields.filter((f) => !!f.widgetType).length} Widgets
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Preview of Form */}
            <div className="lg:col-span-8 p-5 bg-slate-100/70 dark:bg-slate-900/60 overflow-y-auto max-h-[55vh] lg:max-h-[60vh]">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Eye className="size-3.5" />
                <span>Live Interactive Canvas Preview</span>
              </div>

              {previewSchema ? (
                <div className="bg-background rounded-xl p-5 border border-border shadow-xs">
                  <FormRuntimeRenderer
                    schema={previewSchema}
                    isPreview={true}
                    onAnswerChange={() => {}}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Modal Footer with Actions */}
          <DialogFooter className="p-4 border-t border-border bg-background flex flex-row items-center justify-between sm:justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewTemplate(null)}
              className="h-9 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleConfirmApply}
              className="h-9 px-5 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <Check className="size-4" />
              <span>Use This Template & Start Building</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TemplateExplorer;
