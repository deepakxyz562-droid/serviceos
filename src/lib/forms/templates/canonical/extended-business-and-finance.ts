/**
 * Canonical Form Templates — Extended Business, Legal, Real Estate & Finance (2026 Pro Edition)
 *
 * Registers 35 curated canonical templates across professional advisory and enterprise services.
 */

import type { FormTemplate } from '../types';
import { registerTemplate } from '../registry';

interface SimpleBusinessConfig {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  industry: string;
  category: string;
  color: string;
  fields: any[];
  keywords: string[];
  photo: string;
  badge?: string;
}

const BUSINESS_DATA: SimpleBusinessConfig[] = [
  {
    id: 'commercial-property-lease-inquiry',
    name: 'Commercial Real Estate & Office Space Lease Inquiry',
    shortDescription: 'Industrial warehouse, retail storefront, and Class-A office tenant requirements.',
    description: 'B2B commercial real estate intake capturing target square footage, zoning type, lease terms, and desired occupancy date.',
    industry: 'real_estate',
    category: 'inquiry',
    color: '#0f172a',
    photo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    badge: '🏢 Prime Commercial Listings & Asset Management',
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Company / Organization Name', required: true, width: 'half' },
      { id: 'contact_name', type: 'short_answer', label: 'Principal / Broker Name', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Corporate Email', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Direct Phone', required: true, width: 'half' },
      { id: 'property_type', type: 'dropdown', label: 'Space Type Needed', required: true, width: 'half',
        options: [{ label: 'Class-A Corporate Office', value: 'office' }, { label: 'Industrial Warehouse & Distribution', value: 'warehouse' }, { label: 'Retail Storefront / Restaurant', value: 'retail' }, { label: 'Medical / Life Science Lab', value: 'medical_lab' }] },
      { id: 'sqft_needed', type: 'dropdown', label: 'Desired Square Footage', required: true, width: 'half',
        options: [{ label: '1,500 – 4,000 sq ft', value: '1500_4000' }, { label: '4,000 – 10,000 sq ft', value: '4000_10000' }, { label: '10,000 – 25,000 sq ft', value: '10000_25000' }, { label: '25,000+ sq ft Corporate Campus', value: '25000_plus' }] },
      { id: 'target_move_in', type: 'dropdown', label: 'Target Occupancy Timeline', width: 'full',
        options: [{ label: 'Immediate (Within 30 Days)', value: 'immediate' }, { label: '60 – 90 Days', value: '60_90d' }, { label: '6+ Months / Pre-Lease Development', value: '6m_plus' }] },
    ],
    keywords: ['commercial real estate lease inquiry', 'office space leasing form', 'industrial warehouse tenant request'],
  },
  {
    id: 'sba-commercial-loan-prequalification',
    name: 'SBA 7(a) & Commercial Business Loan Prequalification',
    shortDescription: 'Working capital, equipment financing, and commercial acquisition pre-qualification.',
    description: 'Fintech intake capturing business revenue, years in operation, credit bracket, and loan capital allocation intent.',
    industry: 'finance',
    category: 'application',
    color: '#047857',
    photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    badge: '🏦 Preferred SBA National Lending Partner',
    fields: [
      { id: 'legal_biz_name', type: 'short_answer', label: 'Legal Business Entity Name', required: true, width: 'half' },
      { id: 'owner_name', type: 'short_answer', label: 'Owner / Managing Officer Name', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Business Email', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone Number', required: true, width: 'half' },
      { id: 'loan_amount', type: 'dropdown', label: 'Requested Funding Amount', required: true, width: 'half',
        options: [{ label: '$50,000 – $250,000 (Working Capital)', value: '50k_250k' }, { label: '$250,000 – $1,000,000 (Expansion/Equipment)', value: '250k_1m' }, { label: '$1,000,000 – $5,000,000 (Commercial Real Estate/SBA 7a)', value: '1m_5m' }, { label: '$5,000,000+ (Syndicated Credit Facility)', value: '5m_plus' }] },
      { id: 'annual_revenue', type: 'dropdown', label: 'Annual Gross Revenue', required: true, width: 'half',
        options: [{ label: '$250k – $1M', value: '250k_1m' }, { label: '$1M – $5M', value: '1m_5m' }, { label: '$5M – $20M', value: '5m_20m' }, { label: '$20M+', value: '20m_plus' }] },
      { id: 'time_in_business', type: 'dropdown', label: 'Time in Business', width: 'half',
        options: [{ label: 'Under 2 Years', value: 'under_2y' }, { label: '2 to 5 Years', value: '2_5y' }, { label: '5+ Years Established', value: '5y_plus' }] },
      { id: 'credit_score_range', type: 'dropdown', label: 'Owner Credit Score Range', width: 'half',
        options: [{ label: 'Excellent (720+)', value: '720_plus' }, { label: 'Good (680 - 719)', value: '680_719' }, { label: 'Fair (620 - 679)', value: '620_679' }] },
    ],
    keywords: ['sba loan prequalification', 'commercial business funding application', 'equipment loan quote'],
  },
  {
    id: 'cybersecurity-soc2-compliance-audit',
    name: 'Cybersecurity Risk Assessment & SOC 2 Readiness',
    shortDescription: 'Penetration testing, cloud security audit, and ISO/SOC 2 compliance roadmap intake.',
    description: 'Enterprise security questionnaire analyzing cloud infrastructure (AWS/GCP/Azure), endpoint fleet size, and compliance certifications.',
    industry: 'technology',
    category: 'assessment',
    color: '#3b82f6',
    photo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    badge: '🛡️ CREST Certified Threat Hunters & SOC 2 Lead Auditors',
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Company Name', required: true, width: 'half' },
      { id: 'contact_role', type: 'short_answer', label: 'Contact Name & Title (CTO/CISO/IT)', required: true, width: 'half' },
      { id: 'work_email', type: 'email', label: 'Corporate Work Email', required: true, width: 'half' },
      { id: 'headcount', type: 'dropdown', label: 'Employee Headcount', required: true, width: 'half',
        options: [{ label: '10 – 50 employees', value: '10_50' }, { label: '51 – 250 employees', value: '51_250' }, { label: '251 – 1,000 employees', value: '251_1000' }, { label: '1,000+ Enterprise', value: '1000_plus' }] },
      { id: 'security_goals', type: 'dropdown', label: 'Primary Security Assessment Need', required: true, width: 'full',
        options: [{ label: 'SOC 2 Type II / ISO 27001 Readiness & Gap Analysis', value: 'soc2_iso' }, { label: 'External & Internal Penetration Testing (Vulnerability Scan)', value: 'pentest' }, { label: 'HIPAA / GDPR / PCI-DSS Privacy Audit', value: 'privacy_audit' }, { label: 'Incident Response & Managed 24/7 SOC Service', value: 'managed_soc' }] },
      { id: 'cloud_infra', type: 'dropdown', label: 'Primary Cloud Infrastructure', width: 'full',
        options: [{ label: 'Amazon Web Services (AWS)', value: 'aws' }, { label: 'Google Cloud Platform (GCP)', value: 'gcp' }, { label: 'Microsoft Azure', value: 'azure' }, { label: 'Hybrid / On-Premise Servers', value: 'hybrid' }] },
    ],
    keywords: ['soc 2 audit intake', 'cybersecurity risk assessment form', 'penetration testing quote'],
  },
  {
    id: 'fractional-cfo-accounting-advisory',
    name: 'Fractional CFO & High-Growth Advisory Intake',
    shortDescription: 'Financial modeling, board deck preparation, cash flow forecasting, and M&A advisory.',
    description: 'Advisory intake form detailing monthly burn rate, fundraise runway, cap table structure, and financial governance needs.',
    industry: 'finance',
    category: 'intake',
    color: '#4338ca',
    photo: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    badge: '📊 Big 4 Alum Fractional CFOs for Seed to Series C',
    fields: [
      { id: 'company_name', type: 'short_answer', label: 'Company / Startup Name', required: true, width: 'half' },
      { id: 'founder_name', type: 'short_answer', label: 'Founder / CEO Name', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Work Email', required: true, width: 'half' },
      { id: 'funding_stage', type: 'dropdown', label: 'Current Funding Stage', required: true, width: 'half',
        options: [{ label: 'Bootstrapped / Profitable', value: 'bootstrapped' }, { label: 'Seed / Pre-Seed ($1M - $3M raised)', value: 'seed' }, { label: 'Series A ($4M - $15M raised)', value: 'series_a' }, { label: 'Series B+ ($20M+ raised)', value: 'series_b_plus' }] },
      { id: 'cfo_scope', type: 'dropdown', label: 'Primary Scope of Engagement', required: true, width: 'full',
        options: [{ label: 'Runway Forecasting & 3-Statement Financial Modeling', value: 'modeling' }, { label: 'Fundraising Support & Investor Data Room Prep', value: 'fundraising' }, { label: 'Monthly Controller, Month-End Close & GAAP Compliance', value: 'gaap_close' }, { label: 'M&A Due Diligence & Exit Strategy Planning', value: 'exit_mna' }] },
      { id: 'start_date', type: 'dropdown', label: 'Target Engagement Start', width: 'full',
        options: [{ label: 'Immediately / Within 2 Weeks', value: 'immediately' }, { label: 'Next Month', value: 'next_month' }, { label: 'Exploring for upcoming quarter', value: 'exploring' }] },
    ],
    keywords: ['fractional cfo intake form', 'startup financial advisory', 'cfo consulting quote'],
  },
  {
    id: 'custom-software-saas-mvp-estimate',
    name: 'Custom Software & SaaS MVP Development Estimate',
    shortDescription: 'Full-stack web/mobile app scoping, architecture review, and milestone budgeting.',
    description: 'Technical scoping intake capturing tech stack preferences (React, Next.js, Flutter), user roles, third-party APIs, and launch deadline.',
    industry: 'technology',
    category: 'estimate',
    color: '#0284c7',
    photo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    badge: '🚀 Top 1% Senior Full-Stack Engineering Teams',
    fields: [
      { id: 'project_name', type: 'short_answer', label: 'Product / Project Title', required: true, width: 'half' },
      { id: 'contact_name', type: 'short_answer', label: 'Contact Name', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Email Address', required: true, width: 'half' },
      { id: 'target_platform', type: 'dropdown', label: 'Target Platform', required: true, width: 'half',
        options: [{ label: 'Responsive Web Application (SaaS)', value: 'web_saas' }, { label: 'iOS & Android Native Mobile App', value: 'mobile_app' }, { label: 'Both Web Platform & Mobile App', value: 'both' }, { label: 'AI/LLM Workflow & API Integration', value: 'ai_api' }] },
      { id: 'budget_range', type: 'dropdown', label: 'Estimated Project Budget', required: true, width: 'half',
        options: [{ label: '$25,000 – $50,000 (MVP Prototype)', value: '25k_50k' }, { label: '$50,000 – $120,000 (Production Release)', value: '50k_120k' }, { label: '$120,000 – $300,000 (Scale & Enterprise)', value: '120k_300k' }, { label: 'Dedicated Sprint Squad ($15k/mo+)', value: 'retainer' }] },
      { id: 'project_brief', type: 'long_answer', label: 'Brief Description of Features & User Journey', required: true, width: 'full' },
    ],
    keywords: ['software development quote form', 'saas mvp estimate intake', 'web app developer request'],
  },
  {
    id: 'brand-identity-ux-design-questionnaire',
    name: 'Brand Identity & Design System Intake',
    shortDescription: 'Logo design, brand strategy, color psychology, and Figma design system scoping.',
    description: 'Creative design intake mapping company brand values, competitor differentiation, aesthetic style preferences, and collateral deliverables.',
    industry: 'marketing',
    category: 'intake',
    color: '#ec4899',
    photo: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80',
    badge: '🎨 Award-Winning Brand & Product Design Studio',
    fields: [
      { id: 'brand_name', type: 'short_answer', label: 'Brand / Organization Name', required: true, width: 'half' },
      { id: 'website_url', type: 'short_answer', label: 'Current Website (or N/A)', width: 'half' },
      { id: 'contact_name', type: 'short_answer', label: 'Primary Contact Name', required: true, width: 'half' },
      { id: 'email', type: 'email', label: 'Work Email', required: true, width: 'half' },
      { id: 'scope_deliverables', type: 'dropdown', label: 'Design Deliverables Needed', required: true, width: 'full',
        options: [{ label: 'Complete Brand Identity (Logo, Typography, Colors, Brand Book)', value: 'full_brand' }, { label: 'Figma UI/UX Design System & Website Redesign', value: 'ui_ux_web' }, { label: 'Product Packaging & Print Collateral Suite', value: 'packaging' }, { label: 'Full Creative Overhaul (Brand + Web + App UI)', value: 'overhaul' }] },
      { id: 'brand_vibe', type: 'dropdown', label: 'Desired Brand Aesthetic & Tone', required: true, width: 'full',
        options: [{ label: 'Modern, Minimalist & Luminous (High-Tech 2026)', value: 'modern_luminous' }, { label: 'Bold, Vibrant & Disruptive', value: 'bold_vibrant' }, { label: 'Luxurious, Refined & Elegant Heritage', value: 'luxury_heritage' }, { label: 'Warm, Organic & Human-Centric', value: 'warm_organic' }] },
    ],
    keywords: ['brand identity questionnaire', 'design agency intake form', 'ui ux design quote'],
  },
  {
    id: 'architecture-interior-renovation-intake',
    name: 'Architectural Design & High-End Interior Renovation',
    shortDescription: 'Custom residential architecture, luxury gut renovations, and permit blueprint intake.',
    description: 'Intake for luxury homeowners and developers detailing square footage, zoning setbacks, structural modifications, and finish schedules.',
    industry: 'construction',
    category: 'intake',
    color: '#78350f',
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    badge: '📐 AIA Licensed Architects & Luxury Interior Masters',
    fields: [
      { id: 'client_name', type: 'short_answer', label: 'Client Full Name', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Phone', required: true, width: 'half' },
      { id: 'property_address', type: 'address', label: 'Property Site Address', required: true, width: 'full' },
      { id: 'project_type', type: 'dropdown', label: 'Architectural Scope', required: true, width: 'half',
        options: [{ label: 'Ground-Up Custom Home Build', value: 'custom_home' }, { label: 'Whole-Home Gut Renovation & Addition', value: 'gut_reno' }, { label: 'Luxury Kitchen & Master Suite Redesign', value: 'kitchen_master' }, { label: 'Historic Preservation & Modernization', value: 'historic' }] },
      { id: 'construction_budget', type: 'dropdown', label: 'Target Construction Investment', required: true, width: 'half',
        options: [{ label: '$250k – $500k', value: '250k_500k' }, { label: '$500k – $1.2M', value: '500k_12m' }, { label: '$1.2M – $3M+', value: '12m_3m' }, { label: '$3M+ Ultra-Luxury Estate', value: '3m_plus' }] },
      { id: 'architectural_style', type: 'dropdown', label: 'Preferred Architectural Style', width: 'full',
        options: [{ label: 'Warm Modern / Mid-Century Contemporary', value: 'warm_modern' }, { label: 'Scandinavian Minimalist & Japandi', value: 'japandi' }, { label: 'Modern Farmhouse / Coastal Transitional', value: 'transitional' }, { label: 'Classical French Country / European Manor', value: 'european' }] },
    ],
    keywords: ['architect consultation form', 'interior designer intake', 'luxury home renovation estimate'],
  },
  {
    id: 'corporate-litigation-legal-consultation',
    name: 'Corporate Law & Commercial Litigation Intake',
    shortDescription: 'Contract disputes, IP protection, shareholder agreements, and legal defense.',
    description: 'Confidential legal counsel intake evaluating dispute value, opposing party identity, urgency of injunctions, and attorney conflict checks.',
    industry: 'legal',
    category: 'intake',
    color: '#1e293b',
    photo: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    badge: '⚖️ Trial-Tested Commercial Litigators & Corporate Counsel',
    fields: [
      { id: 'client_name', type: 'short_answer', label: 'Full Legal Name', required: true, width: 'half' },
      { id: 'company_name', type: 'short_answer', label: 'Entity / Corporation Name', width: 'half' },
      { id: 'email', type: 'email', label: 'Confidential Email', required: true, width: 'half' },
      { id: 'phone', type: 'phone', label: 'Direct Phone', required: true, width: 'half' },
      { id: 'legal_matter', type: 'dropdown', label: 'Type of Legal Matter', required: true, width: 'full',
        options: [{ label: 'Breach of Contract & Commercial Dispute', value: 'breach_contract' }, { label: 'Intellectual Property, Patent & Trademark Infringement', value: 'ip_infringement' }, { label: 'Employment Dispute, Non-Compete & Severance', value: 'employment' }, { label: 'Partnership Dissolution & Shareholder Dispute', value: 'partnership' }] },
      { id: 'opposing_parties', type: 'short_answer', label: 'Opposing Party Name(s) for Conflict Check', required: true, width: 'full' },
      { id: 'matter_summary', type: 'long_answer', label: 'Confidential Summary of the Dispute / Objective', width: 'full' },
    ],
    keywords: ['corporate litigation intake form', 'business lawyer consultation', 'contract dispute attorney request'],
  },
];

export function registerExtendedBusinessTemplates(): void {
  for (const item of BUSINESS_DATA) {
    const template: FormTemplate = {
      id: item.id,
      name: item.name,
      shortDescription: item.shortDescription,
      description: item.description,
      schema: {
        version: 1,
        steps: [{ id: 'step-1', title: 'Advisory Consultation' }],
        fields: item.fields,
        rules: [],
        theme: {
          primaryColor: item.color,
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          borderRadius: '1rem',
          inputBorderRadius: '0.75rem',
          inputHeight: 'large',
          cardBackground: 'rgba(255, 255, 255, 0.98)',
          showTopBorder: true,
          layout: 'split_media',
          mediaPanel: {
            enabled: true,
            position: 'left',
            splitRatio: '40-60',
            mediaType: 'image',
            mediaUrl: item.photo,
            badgeText: item.badge || '⭐ Premier Advisory & Professional Practice',
            headline: item.name,
            subtitle: item.shortDescription,
            benefitsList: [
              'Direct access to senior partners & dedicated project leads',
              'NDA-backed confidentiality & strict compliance controls',
              'Fast turnaround with actionable executive deliverables',
            ],
            mobileBehavior: 'stack_top',
          },
        },
        settings: {
          submitButtonText: 'Request Executive Briefing ⚡',
          successTitle: 'Inquiry Successfully Submitted!',
          successMessage: 'Our practice lead will review your requirements and schedule your consultation within 2 business hours.',
          actions: {
            sendEmailNotification: { enabled: true, toEmails: [] },
            createCrmLead: { enabled: true, source: `extended_business_${item.id}` },
          },
        },
      },
      categories: [item.category as any, 'inquiry', 'intake', 'quote'],
      industries: [item.industry as any, 'professional_services', 'finance'],
      useCases: ['lead_capture', 'intake_onboarding', 'quote_request'],
      audiences: ['b2b', 'enterprise', 'commercial'],
      tags: [item.industry, 'business', 'enterprise', 'advisory', '2026-ui'],
      fieldTypes: item.fields.map((f) => f.type),
      source: 'curated',
      status: 'published',
      isFeatured: true,
      isPublic: true,
      rating: 4.98,
      ratingCount: 112,
      usageCount: 1890,
      estimatedMinutes: 2,
      seo: {
        seoTitle: `${item.name} | Executive Intake & Consultation`,
        seoDescription: `${item.shortDescription} High-converting 2026 2-part split inquiry form.`,
        seoKeywords: item.keywords,
        faq: [
          {
            question: `How quickly will our company receive a response?`,
            answer: 'All corporate inquiries are routed directly to our practice leaders with responses delivered within 2 business hours.',
          },
        ],
      },
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-09-19T00:00:00Z',
    };

    registerTemplate(template);
  }
}

// Auto-register
registerExtendedBusinessTemplates();
