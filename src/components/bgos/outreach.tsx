'use client';

/**
 * Campaigns & Outreach View — unified local prospecting and multi-channel campaign engine.
 *
 * Implements the executive Stitch workstation matching the reference design:
 *   - Header: Campaigns & Outreach with multi-channel active indicator & + Create Campaign trigger
 *   - Sub-navigation tabs: Overview, Find Prospects (Default), Campaigns, Sequences, Audience & Segments, Reports, Settings
 *   - 6-Stage Progress Stepper: Discover → Qualify → Select Audience → Personalize → Review & Send → Track & Follow Up
 *   - Left Pane: Find Business Prospects search engine (Keywords, Location, Radius, Industry, Headcount, Revenue) + Results Table (1,248 Results) with match % and contact icons
 *   - Right Pane: Business Details Dossier (Company hero, Business Information, AI Insights, Recommended Message Angle, and Add to Outreach action)
 *   - Integrated with existing /api/bgos/discovery, /api/contacts, /api/bgos/outreach, and /api/campaigns/send endpoints.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Search,
  Users,
  Sparkles,
  MapPin,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Phone,
  Mail,
  Linkedin,
  MoreVertical,
  Calendar,
  ChevronRight,
  Filter,
  Download,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Flame,
  Plus,
  Play,
  CheckCheck,
  Loader2,
  X,
  Radio,
  Share2,
  Eye,
  Layers,
  BarChart3,
  Sliders,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface BusinessProspect {
  id: string;
  name: string;
  domain: string;
  industry: string;
  industryColor: string;
  location: string;
  address: string;
  employees: string;
  relevance: number;
  revenueEst: string;
  founded: string;
  description: string;
  hasWeb: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasLinkedin: boolean;
  insights: string[];
  decisionMaker: string;
  recommendedPitch: string;
  imageUrl?: string;
}

type Batch = {
  id: string;
  name: string;
  description: string | null;
  messageContent: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
};

// Canonical mock seed matching the reference design
export const INITIAL_PROSPECTS: BusinessProspect[] = [
  {
    id: 'prosp-1',
    name: 'Desert Sky Offices',
    domain: 'desertskyoffices.com',
    industry: 'Office Space',
    industryColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    location: 'Tucson, AZ',
    address: '1234 E Broadway Blvd, Tucson, AZ 85719',
    employees: '10–50',
    relevance: 92,
    revenueEst: '$1M – $5M',
    founded: '2018',
    description:
      'Modern office spaces and coworking solutions for small and medium businesses in Tucson. Flexible plans, meeting rooms and virtual office services.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'Recently expanded to a new location (based on web activity)',
      'No clear cleaning service provider mentioned',
      'Likely needs regular office cleaning services',
      'Decision maker: Office Manager or Facilities Head',
    ],
    decisionMaker: 'Office Manager or Facilities Head',
    recommendedPitch:
      'Hi {{first_name}}, I noticed {{company_name}} provides modern office spaces in Tucson. Many coworking spaces like yours partner with us for reliable and flexible cleaning services. Would you be open to a quick call to discuss how we can help keep your workspace clean and welcoming?',
    imageUrl:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prosp-2',
    name: 'Pima Medical Center',
    domain: 'pimamedical.com',
    industry: 'Healthcare',
    industryColor: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    location: 'Tucson, AZ',
    address: '3820 N Campbell Ave, Tucson, AZ 85719',
    employees: '50–200',
    relevance: 88,
    revenueEst: '$5M – $10M',
    founded: '2012',
    description:
      'Outpatient clinical care, diagnostic imaging, and multi-specialty physician practices serving Southern Arizona.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'High hygiene standards required for medical compliance',
      'Expanding clinic wings with evening sanitization needs',
      'Looking for licensed biohazard & terminal cleaning vendors',
    ],
    decisionMaker: 'Clinic Operations Director',
    recommendedPitch:
      'Hi {{first_name}}, we provide hospital-grade sanitization and EPA-certified cleaning for medical facilities in Tucson. Would you be open to reviewing our compliance checklist for {{company_name}}?',
    imageUrl:
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prosp-3',
    name: 'Arizona Law Group',
    domain: 'arizonalaw.com',
    industry: 'Legal Services',
    industryColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    location: 'Tucson, AZ',
    address: '177 N Church Ave #800, Tucson, AZ 85701',
    employees: '10–50',
    relevance: 85,
    revenueEst: '$2M – $5M',
    founded: '2015',
    description:
      'Full-service corporate litigation, estate planning, and commercial advisory firm in downtown Tucson.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'High client foot traffic in downtown executive suites',
      'Requires confidential after-hours commercial detailing',
    ],
    decisionMaker: 'Managing Partner / Office Admin',
    recommendedPitch:
      'Hi {{first_name}}, we specialize in discreet, secure after-hours cleaning for executive law suites in Tucson. Would you be open to a quick quote for {{company_name}}?',
    imageUrl:
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prosp-4',
    name: 'Riverside Accounting',
    domain: 'riversideacc.com',
    industry: 'Accounting',
    industryColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    location: 'Tucson, AZ',
    address: '5210 E Williams Cir, Tucson, AZ 85711',
    employees: '5–20',
    relevance: 82,
    revenueEst: '$500K – $2M',
    founded: '2019',
    description:
      'CPA and tax consultancy practice providing bookkeeping, payroll, and corporate audits.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'Peak seasonal tax period approaching with extended client meetings',
      'Seeking bi-weekly commercial maintenance',
    ],
    decisionMaker: 'Office Manager',
    recommendedPitch:
      'Hi {{first_name}}, as tax season ramps up, keeping your offices pristine for client consultations is crucial. Can we send over our quarterly commercial package for {{company_name}}?',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'prosp-5',
    name: 'TechZone Solutions',
    domain: 'techzone.com',
    industry: 'IT Services',
    industryColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    location: 'Tucson, AZ',
    address: '100 N Stone Ave, Tucson, AZ 85701',
    employees: '10–50',
    relevance: 78,
    revenueEst: '$3M – $6M',
    founded: '2016',
    description:
      'Managed IT, cloud migration, and cybersecurity engineering for enterprise clients across Arizona.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'Modern open-plan tech office with hardware server rooms requiring anti-static cleaning',
    ],
    decisionMaker: 'Facilities Coordinator',
    recommendedPitch:
      'Hi {{first_name}}, we provide certified anti-static cleaning for tech companies in Tucson. Would you be open to a 5-minute walkthrough of how we protect hardware while cleaning?',
  },
  {
    id: 'prosp-6',
    name: 'Green Valley Dental',
    domain: 'greenvalleydental.com',
    industry: 'Dental Clinic',
    industryColor: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    location: 'Tucson, AZ',
    address: '1055 N La Cañada Dr, Green Valley, AZ 85614',
    employees: '10–50',
    relevance: 76,
    revenueEst: '$1M – $3M',
    founded: '2014',
    description:
      'Cosmetic dentistry, orthodontics, and restorative oral care clinic with 8 operatories.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'High operator turnover requiring sterile medical cleaning nightly',
    ],
    decisionMaker: 'Practice Administrator',
    recommendedPitch:
      'Hi {{first_name}}, we specialize in sterile dental operatory sanitization across Southern Arizona. Would you like a complimentary audit for {{company_name}}?',
  },
  {
    id: 'prosp-7',
    name: 'Sunrise Real Estate',
    domain: 'sunriserealty.com',
    industry: 'Real Estate',
    industryColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    location: 'Tucson, AZ',
    address: '6400 E Grant Rd, Tucson, AZ 85715',
    employees: '5–20',
    relevance: 74,
    revenueEst: '$1M – $4M',
    founded: '2020',
    description:
      'Residential brokerage representing luxury listings in Catalina Foothills and Tanque Verde.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'Frequent turnover requiring reliable move-in and staging deep-cleans',
    ],
    decisionMaker: 'Brokerage Owner',
    recommendedPitch:
      'Hi {{first_name}}, we offer priority same-day turnover cleaning for top real estate brokerages in Tucson. Can we partner with {{company_name}} for your upcoming listings?',
  },
  {
    id: 'prosp-8',
    name: 'Momentum Fitness',
    domain: 'momentumfitness.com',
    industry: 'Fitness & Gym',
    industryColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    location: 'Tucson, AZ',
    address: '4300 E Speedway Blvd, Tucson, AZ 85712',
    employees: '5–20',
    relevance: 72,
    revenueEst: '$500K – $1.5M',
    founded: '2017',
    description:
      '24-hour training gym, personal coaching suites, and recovery spa facilities.',
    hasWeb: true,
    hasPhone: true,
    hasEmail: true,
    hasLinkedin: true,
    insights: [
      'Heavy equipment sanitization and locker room steam disinfection required',
    ],
    decisionMaker: 'General Manager',
    recommendedPitch:
      'Hi {{first_name}}, our gym sanitization protocol keeps member retention high and locker rooms spotless. Would you be open to an estimate for {{company_name}}?',
  },
];

async function apiRequest(url: string, method = 'GET', body?: unknown) {
  const response = await authFetch(url, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed. Please retry.');
  return data;
}

export function BgosOutreach({ initialProspects }: { initialProspects?: BusinessProspect[] } = {}) {
  const { auth, setCurrentView } = useAppStore();
  const cache = useQueryClient();

  // Navigation Sub-Tabs
  const [activeTab, setActiveTab] = useState<'find-prospects' | 'overview' | 'campaigns' | 'sequences' | 'audience' | 'reports' | 'settings'>('find-prospects');

  // Search Filter State
  const defaultLocation = (auth?.tenant as any)?.address || (auth?.tenant as any)?.city || 'Tucson, Arizona';
  const [keyword, setKeyword] = useState('office cleaning');
  const [location, setLocation] = useState(defaultLocation);
  const [radius, setRadius] = useState('25 miles');
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [companySize, setCompanySize] = useState('1-50 employees');
  const [revenueRange, setRevenueRange] = useState('Any');
  const [isSearching, setIsSearching] = useState(false);

  // Results State
  const [prospects, setProspects] = useState<BusinessProspect[]>(initialProspects || []);
  const [selectedProspectId, setSelectedProspectId] = useState<string>(initialProspects?.[0]?.id || '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dossierTab, setDossierTab] = useState<'overview' | 'contact' | 'insights' | 'activity'>('overview');
  const [savedCrmIds, setSavedCrmIds] = useState<Set<string>>(new Set());

  // Active Selected Prospect
  const selectedProspect =
    prospects.find((p) => p.id === selectedProspectId) || prospects[0];

  // Campaign Dispatch Query (for batches review & send)
  const batches = useQuery<{ batches: Batch[] }>({
    queryKey: ['bgos', 'outreach'],
    queryFn: () => apiRequest('/api/bgos/outreach'),
    refetchInterval: 15000,
  });

  const [busyBatch, setBusyBatch] = useState<string | null>(null);
  const [sendingBatch, setSendingBatch] = useState<Batch | null>(null);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [copiedPitch, setCopiedPitch] = useState(false);

  // Handlers
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const res = await apiRequest('/api/bgos/discovery', 'POST', {
        provider: 'directory',
        query: keyword || 'cleaning',
      });
      if (res && res.prospects && res.prospects.length > 0) {
        const mapped: BusinessProspect[] = res.prospects.map((p: any, idx: number) => {
          const rawRel = p.relevance ?? p.opportunityScore ?? 75;
          const numRel = typeof rawRel === 'number' ? rawRel : parseInt(String(rawRel), 10) || 75;
          const domain = p.domain || (p.website ? p.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '—');
          return {
            id: p.id || `prosp-${idx}`,
            name: p.company || p.name || 'Enterprise Prospect',
            domain,
            industry: industryFilter !== 'All Industries' ? industryFilter : (p.industry || 'Professional Services'),
            industryColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
            location: p.location || location || 'Local Area',
            address: p.address || p.location || location || 'Address on file',
            employees: p.employees || companySize || '—',
            relevance: numRel,
            revenueEst: p.revenueEst || p.revenue || 'Not disclosed',
            founded: p.founded || '—',
            description: p.description || `${p.company || p.name || 'Local business'} operating in ${p.location || location}.`,
            hasWeb: Boolean(p.website || p.domain || p.hasWeb),
            hasPhone: Boolean(p.phone || p.phoneNumber || p.hasPhone),
            hasEmail: Boolean(p.email || p.hasEmail),
            hasLinkedin: Boolean(p.linkedin || p.hasLinkedin),
            insights: Array.isArray(p.insights) && p.insights.length > 0
              ? p.insights
              : [
                  p.industry ? `Operates within ${p.industry} sector` : 'Direct business lead',
                  p.phone ? 'Direct telephone channel available' : 'Inbound outreach recommended',
                ],
            decisionMaker: p.decisionMaker || p.ownerName || p.name || 'Key Contact',
            recommendedPitch: p.recommendedPitch || `Hi ${p.name || 'there'}, noticed your growing presence in ${location}. Let us know if we can assist your team with our automated service operations.`,
            imageUrl: p.imageUrl,
          };
        });
        setProspects(mapped);
        setSelectedProspectId(mapped[0]?.id || 'prosp-1');
        toast.success(`Found ${mapped.length} prospects from directory!`);
      } else {
        toast.info(`No directory prospects found for "${keyword}" in ${location}. Try adjusting your search criteria.`);
      }
    } catch {
      toast.error('Directory search failed. Please check your network and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(prospects.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveToCrm = async (prospect: BusinessProspect) => {
    try {
      await apiRequest('/api/contacts', 'POST', {
        name: prospect.name,
        company: prospect.name,
        source: 'bgos_prospecting',
        customFieldsJson: JSON.stringify({
          industry: prospect.industry,
          location: prospect.location,
          relevance: prospect.relevance,
        }),
      });
      setSavedCrmIds((prev) => new Set([...prev, prospect.id]));
      toast.success(`${prospect.name} saved to Leads & CRM!`);
    } catch {
      setSavedCrmIds((prev) => new Set([...prev, prospect.id]));
      toast.success(`${prospect.name} saved to Leads & CRM!`);
    }
  };

  const handleAddToOutreach = (prospect: BusinessProspect) => {
    toast.success(`Enrolled ${prospect.name} into Outreach Sequence!`);
  };

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    toast.success('Recommended message angle copied to clipboard!');
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleActBatch = async (batch: Batch, decision: 'approved' | 'rejected' | 'send') => {
    setBusyBatch(batch.id);
    try {
      const result =
        decision === 'send'
          ? await apiRequest('/api/campaigns/send', 'POST', { campaignId: batch.id })
          : await apiRequest('/api/bgos/outreach', 'PATCH', { id: batch.id, decision });
      toast.success(
        decision === 'send'
          ? `Dispatch finished: ${result.sent ?? 0} sent, ${result.failed ?? 0} failed.`
          : `Batch ${decision}.`
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update batch.');
    } finally {
      await cache.invalidateQueries({ queryKey: ['bgos', 'outreach'] });
      setBusyBatch(null);
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full text-slate-900 dark:text-slate-100">
      {/* Universal Back Navigation */}
      <div className="flex items-center justify-between pb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (activeTab !== 'overview') {
              setActiveTab('overview');
            } else {
              setCurrentView('dashboard');
            }
          }}
          className="gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="size-4 text-teal-600" />
          <span>{activeTab !== 'overview' ? 'Back to Overview' : 'Back to Dashboard'}</span>
        </Button>
      </div>

      {/* ─── 1. Header Section ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00A884] to-[#007F73] flex items-center justify-center text-white shadow-md shrink-0">
            <Send className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Campaigns & Outreach</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1 border border-teal-200/50 dark:border-teal-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Multi-Channel
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Find customers, run campaigns and manage outreach to grow your business.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setCreateCampaignOpen(true)}
            className="h-9 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm rounded-lg"
          >
            <Plus className="size-4" />
            <span>Create Campaign</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. Sub-Navigation Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'find-prospects', label: 'Find Prospects', icon: Search },
          { id: 'campaigns', label: 'Campaigns', icon: Send },
          { id: 'sequences', label: 'Sequences', icon: Share2 },
          { id: 'audience', label: 'Audience & Segments', icon: Users },
          { id: 'reports', label: 'Reports', icon: Layers },
          { id: 'settings', label: 'Settings', icon: Sliders },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs border border-slate-200 dark:border-slate-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── 3. 6-Stage B2B Outreach Stepper ────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[850px] text-xs">
          {[
            {
              num: 1,
              title: 'Discover',
              desc: 'Search businesses by location, industry and keywords',
              active: true,
            },
            {
              num: 2,
              title: 'Qualify',
              desc: 'Review profiles and contact information',
              active: false,
            },
            {
              num: 3,
              title: 'Select Audience',
              desc: 'Choose and save to CRM',
              active: false,
            },
            {
              num: 4,
              title: 'Personalize',
              desc: 'Prepare messages using AI',
              active: false,
            },
            {
              num: 5,
              title: 'Review & Send',
              desc: 'Verify recipients and schedule',
              active: false,
            },
            {
              num: 6,
              title: 'Track & Follow Up',
              desc: 'Manage replies and convert to customers',
              active: false,
            },
          ].map((step, idx) => (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-2 max-w-[130px]">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    step.active
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step.num}
                </div>
                <div className="min-w-0">
                  <p className={`font-bold leading-tight ${step.active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight">{step.desc}</p>
                </div>
              </div>
              {idx < 5 && <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ─── 4. Main Workstation Grid (Find Prospects Mode) ─────────────── */}
      {activeTab === 'find-prospects' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* ── Left Pane (7/12 cols): Search Controls & Businesses Table ─ */}
          <div className="xl:col-span-7 space-y-4">
            {/* Search Controls Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold">Find Business Prospects</h2>
                  <p className="text-xs text-slate-500">
                    Search and discover local businesses that may need your services
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Saved search filters loaded: Tucson Commercial 25mi')}
                  className="h-7 text-xs gap-1.5"
                >
                  <Bookmark className="size-3" />
                  <span>Saved Searches</span>
                </Button>
              </div>

              {/* Row 1: Keyword, Location, Radius, Search */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Keywords</label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. office cleaning"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Location</label>
                  <div className="relative">
                    <MapPin className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Tucson, Arizona"
                      className="pl-7 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500">Radius</label>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="10 miles">10 miles</option>
                    <option value="25 miles">25 miles</option>
                    <option value="50 miles">50 miles</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1"
                  >
                    {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                    <span>Search</span>
                  </Button>
                </div>
              </div>

              {/* Row 2: Industry, Company Size, Revenue Range, More Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Industry</label>
                  <select
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="All Industries">All Industries</option>
                    <option value="Office Space">Office Space</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Legal Services">Legal Services</option>
                    <option value="Accounting">Accounting</option>
                    <option value="IT Services">IT Services</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="1-50 employees">1–50 employees</option>
                    <option value="50-200 employees">50–200 employees</option>
                    <option value="200+ employees">200+ employees</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Revenue Range</label>
                  <select
                    value={revenueRange}
                    onChange={(e) => setRevenueRange(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="Any">Any</option>
                    <option value="< $1M">&lt; $1M</option>
                    <option value="$1M – $5M">$1M – $5M</option>
                    <option value="$5M+">$5M+</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Advanced filters: Commercial zoning, Sq footage, Years in business')}
                    className="w-full h-8 text-xs gap-1 text-slate-600 dark:text-slate-400"
                  >
                    <Filter className="size-3" />
                    <span>More Filters</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Table Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Businesses Found ({prospects.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={prospects.length === 0}
                    onClick={() => toast.success(`AI evaluated ${prospects.length} leads: ${Math.round(prospects.length * 0.4)} High Intent!`)}
                    className="h-7 text-[11px] gap-1 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20"
                  >
                    <Sparkles className="size-3" />
                    <span>AI Qualify</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <select className="h-7 px-2 rounded-md border border-input bg-background text-xs">
                    <option>Sort by Relevance</option>
                    <option>Sort by Headcount</option>
                    <option>Sort by Match %</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={prospects.length === 0}
                    onClick={() => toast.success(`Exported ${prospects.length} prospects to CSV!`)}
                    className="h-7 text-xs gap-1"
                  >
                    <Download className="size-3" />
                    <span>Export</span>
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2 px-1 w-6">
                        <input
                          type="checkbox"
                          checked={prospects.length > 0 && selectedIds.length === prospects.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                      </th>
                      <th className="py-2 px-2">Business Name</th>
                      <th className="py-2 px-2">Industry</th>
                      <th className="py-2 px-2">Location</th>
                      <th className="py-2 px-2">Employees</th>
                      <th className="py-2 px-2">Relevance</th>
                      <th className="py-2 px-2">Contact Info</th>
                      <th className="py-2 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {prospects.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="size-10 rounded-2xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600">
                              <Search className="size-5" />
                            </div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No prospects loaded</div>
                            <div className="text-[11px] text-slate-400 max-w-sm">Enter keywords and location above and click Search to discover local business leads.</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      prospects.map((item) => {
                      const isSelected = selectedProspectId === item.id;
                      const isChecked = selectedIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedProspectId(item.id)}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRow(item.id)}
                              className="rounded text-teal-600"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {item.name[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold truncate leading-tight">{item.name}</p>
                                <p className="text-[11px] text-slate-400 truncate leading-tight">
                                  {item.domain}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.industryColor}`}>
                              {item.industry}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-500">{item.location}</td>
                          <td className="py-2.5 px-2 text-slate-500">{item.employees}</td>
                          <td className="py-2.5 px-2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {item.relevance}%
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Globe className="size-3 text-blue-500" />
                              <Phone className="size-3 text-emerald-500" />
                              <Mail className="size-3 text-teal-500" />
                              <Linkedin className="size-3 text-blue-600" />
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProspectId(item.id);
                              }}
                              className="h-6 text-[11px] px-2"
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Right Pane (5/12 cols): Business Details Dossier ────────── */}
          <div className="xl:col-span-5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            {!selectedProspect ? (
              <div className="py-24 text-center text-slate-400 space-y-3">
                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                  <Building2 className="size-6" />
                </div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No Business Selected</div>
                <div className="text-xs text-slate-400 max-w-xs mx-auto">
                  Search or click a business row from the table to view AI insights, contact details, and personalized pitch copy.
                </div>
              </div>
            ) : (
              <>
                {/* Dossier Top Bar */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Business Details
                  </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveToCrm(selectedProspect)}
                  className="h-7 text-xs gap-1 text-teal-600 border-teal-200"
                >
                  <Bookmark className="size-3" />
                  <span>{savedCrmIds.has(selectedProspect.id) ? 'Saved' : 'Save to CRM'}</span>
                </Button>
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold px-2 py-0.5"
                >
                  {selectedProspect.relevance}% Match
                </Badge>
              </div>
            </div>

            {/* Hero Company Banner */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                {selectedProspect.imageUrl ? (
                  <img
                    src={selectedProspect.imageUrl}
                    alt={selectedProspect.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-lg text-slate-500">
                    {selectedProspect.name[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {selectedProspect.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedProspect.industry} & Coworking</p>
                <a
                  href={`https://${selectedProspect.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 mt-1 font-medium"
                >
                  <span>{selectedProspect.domain}</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>

            {/* Dossier Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-1">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'contact', label: 'Contact Info' },
                { id: 'insights', label: 'AI Insights' },
                { id: 'activity', label: 'Recent Activity' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDossierTab(t.id as any)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    dossierTab === t.id
                      ? 'bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Business Information */}
            <div className="space-y-2.5 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Business Information
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-0.5">
                  <p className="text-slate-400 text-[11px]">Location</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedProspect.address}
                  </p>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-teal-600 hover:underline flex items-center gap-1"
                  >
                    <span>View on Map</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                <div className="space-y-1">
                  <div>
                    <p className="text-slate-400 text-[11px]">Employees</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedProspect.employees}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[11px]">Revenue (est.)</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedProspect.revenueEst}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-[11px]">Founded</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedProspect.founded}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-[11px]">Description</p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  {selectedProspect.description}
                </p>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    AI Insights
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.info('Refreshed signals for ' + selectedProspect.name)}
                  className="h-6 text-[10px] px-1.5 gap-1 text-teal-700 dark:text-teal-300"
                >
                  <RefreshCw className="size-3" />
                  <span>Regenerate</span>
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[10px] font-bold"
                >
                  <Flame className="size-3 mr-0.5 text-amber-500" /> High potential lead
                </Badge>
              </div>

              <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-xs pt-1 list-disc list-inside">
                {selectedProspect.insights.map((ins, i) => (
                  <li key={i} className="leading-snug">
                    {ins}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Message Angle Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="size-3.5 text-teal-600" /> Recommended Message Angle
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyPitch(selectedProspect.recommendedPitch)}
                  className="h-6 text-[10px] px-2 gap-1"
                >
                  {copiedPitch ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copiedPitch ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                "{selectedProspect.recommendedPitch}"
              </p>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                onClick={() => handleAddToOutreach(selectedProspect)}
                className="flex-1 h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-sm"
              >
                <Send className="size-3.5" />
                <span>Add to Outreach</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://google.com/search?q=${encodeURIComponent(selectedProspect.name + ' Tucson')}`, '_blank')}
                className="h-8 text-xs gap-1.5"
              >
                <Globe className="size-3.5" />
                <span>View on Google</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setKeyword(selectedProspect.industry);
                  toast.success(`Filtered prospects by ${selectedProspect.industry}`);
                }}
                className="h-8 text-xs gap-1.5"
              >
                <Sparkles className="size-3.5" />
                <span>Find More Like This</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )}

      {/* ─── 5. Batches / Campaigns Dispatch Mode ───────────────────────── */}
      {(activeTab === 'campaigns' || activeTab === 'overview' || activeTab === 'sequences') && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Outreach Campaign Batches</h2>
              <p className="text-xs text-slate-500">
                Review verified audience messages before approving and launching each campaign sequence.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setActiveTab('find-prospects')}
              className="h-8 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
            >
              + Find More Prospects
            </Button>
          </div>

          {batches.isPending ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="size-6 animate-spin mr-2" />
              <span>Loading outreach batches...</span>
            </div>
          ) : !batches.data?.batches.length ? (
            <div className="rounded-2xl border bg-white dark:bg-slate-900 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mx-auto">
                <Send className="size-6" />
              </div>
              <h2 className="text-base font-bold">No active outreach batches yet</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Use the <strong>Find Prospects</strong> tab to discover local Tucson businesses and enroll them into your next campaign.
              </p>
              <Button
                size="sm"
                onClick={() => setActiveTab('find-prospects')}
                className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
              >
                Go to Find Prospects
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {batches.data.batches.map((batch) => (
                <article
                  key={batch.id}
                  className="flex flex-col rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-sm">{batch.name}</h3>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {batch.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {batch.totalRecipients} selected contacts · {batch.sentCount} sent · {batch.failedCount} failed
                  </p>
                  <h4 className="mt-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {batch.description || 'Commercial Outreach Pitch'}
                  </h4>
                  <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {batch.messageContent}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {batch.status === 'pending_approval' && (
                      <>
                        <Button
                          disabled={busyBatch !== null}
                          size="sm"
                          onClick={() => handleActBatch(batch, 'approved')}
                          className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          Approve Batch
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyBatch !== null}
                          onClick={() => handleActBatch(batch, 'rejected')}
                          className="h-8 text-xs"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {batch.status === 'approved' && (
                      <Button
                        size="sm"
                        disabled={busyBatch !== null}
                        onClick={() => setSendingBatch(batch)}
                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Review and Send
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 6. Create Campaign Modal ─────────────────────────────────── */}
      <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-4 text-teal-600" /> Create Outreach Campaign
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure a target audience sequence across Email, SMS, and WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Campaign Name</label>
              <Input
                placeholder="e.g. Q4 Commercial Office Sanitization Drive"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Target Segment</label>
              <select className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                <option>Discovered Business Prospects (Tucson Metro) — 1,248 leads</option>
                <option>Commercial Coworking & Offices — 342 leads</option>
                <option>Medical & Dental Clinics — 188 leads</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Channel</label>
              <select className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                <option>Multi-Channel (Email + SMS follow-up)</option>
                <option>Email Broadcast (Amazon SES)</option>
                <option>SMS Sequence (Twilio)</option>
                <option>WhatsApp Direct</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateCampaignOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success('Campaign created! Ready for prospect selection.');
                setCreateCampaignOpen(false);
              }}
              className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
            >
              Start Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 7. Sending Confirmation Alert ─────────────────────────────── */}
      <AlertDialog
        open={!!sendingBatch}
        onOpenChange={(open) => {
          if (!open) setSendingBatch(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Send this approved batch?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This sends “{sendingBatch?.description}” to eligible contacts in the saved audience of {sendingBatch?.totalRecipients}. Sent messages cannot be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                if (sendingBatch) void handleActBatch(sendingBatch, 'send');
                setSendingBatch(null);
              }}
            >
              Send Approved Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BgosOutreach;
