'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Calendar,
  MessageSquare,
  Wrench,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Plus,
  Send,
  Navigation,
  FileText,
  AlertCircle,
  TrendingUp,
  Users,
  ChevronRight,
  Filter,
  LogIn,
  LogOut,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export type ProScreenId =
  | 'dashboard'
  | 'requests'
  | 'quote-composer'
  | 'jobs'
  | 'job-detail'
  | 'calendar'
  | 'messages'
  | 'services'
  | 'settings';

interface LeadOpportunity {
  id: string;
  category: string;
  title: string;
  location: string;
  distanceKm: number;
  urgency: 'urgent' | 'high' | 'normal';
  budgetMin: number;
  budgetMax: number;
  postedTime: string;
  customerName: string;
  customerPhone: string;
  description: string;
}

interface ProUserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  companyName?: string;
  avatar?: string | null;
}

const defaultLeads: LeadOpportunity[] = [
  {
    id: 'OPP-892',
    category: 'AC Repair',
    title: 'AC stopped cooling, blowing warm air',
    location: 'HSR Layout, Bengaluru',
    distanceKm: 2.3,
    urgency: 'urgent',
    budgetMin: 1000,
    budgetMax: 1500,
    postedTime: '5 mins ago',
    customerName: 'Rahul Mehta',
    customerPhone: '+91 98450 11234',
    description: 'Living room split AC fan is running but temperature inside remains warm.',
  },
  {
    id: 'OPP-893',
    category: 'Plumbing Leak',
    title: 'Kitchen sink pipe joint leakage',
    location: 'Koramangala 4th Block',
    distanceKm: 3.8,
    urgency: 'high',
    budgetMin: 700,
    budgetMax: 1100,
    postedTime: '12 mins ago',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98210 99482',
    description: 'Active drip under the kitchen cabinet whenever water is run.',
  },
  {
    id: 'OPP-894',
    category: 'Electrical Work',
    title: 'Tripping MCB breaker on kitchen circuit',
    location: 'Indiranagar 100ft Road',
    distanceKm: 4.5,
    urgency: 'normal',
    budgetMin: 600,
    budgetMax: 1000,
    postedTime: '25 mins ago',
    customerName: 'Karan Patel',
    customerPhone: '+91 99100 44211',
    description: 'Whenever microwave turns on, main breaker flips off.',
  },
];

export function ProWebApp() {
  const [currentScreen, setCurrentScreen] = useState<ProScreenId>('dashboard');
  const [selectedOpportunity, setSelectedOpportunity] = useState<LeadOpportunity | null>(null);
  const [leads, setLeads] = useState<LeadOpportunity[]>(defaultLeads);

  // Pro Auth State
  const [proUser, setProUser] = useState<ProUserProfile | null>(null);
  const [showProAuthModal, setShowProAuthModal] = useState(false);
  const [proAuthTab, setProAuthTab] = useState<'password' | 'otp'>('password');
  const [proEmail, setProEmail] = useState('');
  const [proPassword, setProPassword] = useState('');
  const [proOtpCode, setProOtpCode] = useState('');
  const [proOtpSent, setProOtpSent] = useState(false);
  const [proDevCode, setProDevCode] = useState<string | null>(null);
  const [proAuthLoading, setProAuthLoading] = useState(false);

  // Quote Composer Form State
  const [quoteTier, setQuoteTier] = useState<'standard' | 'premium' | 'custom'>('standard');
  const [quotePrice, setQuotePrice] = useState(1200);
  const [quoteDuration, setQuoteDuration] = useState('2 hours');
  const [quoteScope, setQuoteScope] = useState('Includes AC gas check, capacitor testing, and electrical wiring inspection.');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [draftingScope, setDraftingScope] = useState(false);

  // Active Job State
  const [activeJobStatus, setActiveJobStatus] = useState<'assigned' | 'travelling' | 'arrived' | 'completed'>('travelling');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'pro' | 'customer'; text: string; time: string }>>([
    { sender: 'customer', text: 'Hi Amit, will you have the replacement capacitor with you?', time: '10:04 AM' },
    { sender: 'pro', text: 'Yes Rahul! I have OEM 45/5 MFD capacitors in the van.', time: '10:06 AM' },
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('google_login') === 'success') {
        toast.success('Signed in to Fieseros Pro with Google!');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('auth_error')) {
        toast.error(`Google Sign-In error: ${params.get('auth_error')}`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    async function loadProSessionAndLeads() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setProUser({
              id: data.user.id,
              name: data.user.name || 'Amit Sharma',
              email: data.user.email,
              role: data.user.role,
              companyName: data.user.tenant?.name || 'Apex Climate Solutions',
              avatar: data.user.avatar,
            });
          }
        }
      } catch {
        // Guest preview
      }

      try {
        const oppRes = await fetch('/api/marketplace/provider/opportunities?limit=15', {
          credentials: 'include',
        });
        if (oppRes.ok) {
          const oppData = await oppRes.json();
          if (Array.isArray(oppData?.opportunities) && oppData.opportunities.length > 0) {
            const mapped: LeadOpportunity[] = oppData.opportunities.map((o: any) => ({
              id: o.requestNumber || o.id,
              category: o.tradeCategory || 'Home Service',
              title: o.serviceSubcategory || o.jobDescription?.slice(0, 60) || 'Service Request',
              location: `${o.city || 'Bengaluru'}, ${o.state || 'KA'}`,
              distanceKm: 2.5,
              urgency: o.urgency === 'emergency' ? 'urgent' : o.urgency === 'high' ? 'high' : 'normal',
              budgetMin: o.aiEstimatedMin || 800,
              budgetMax: o.aiEstimatedMax || 1600,
              postedTime: o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              customerName: o.customerName || 'Verified Homeowner',
              customerPhone: o.customerPhone || '+91 98450 11234',
              description: o.jobDescription || 'Customer requested a verified technician.',
            }));
            setLeads([...mapped, ...defaultLeads].slice(0, 8));
          }
        }
      } catch {
        // Keep default leads
      }
    }

    loadProSessionAndLeads();
  }, []);

  const handleProGoogleLogin = () => {
    window.location.assign('/api/auth/google?app=pro&redirect=/pro');
  };

  const handleProPasswordLogin = async () => {
    if (!proEmail.trim() || !proPassword) {
      toast.error('Please enter your work email and password');
      return;
    }
    setProAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: proEmail.trim(), password: proPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Invalid credentials');
        return;
      }
      if (data?.user) {
        setProUser({
          id: data.user.id,
          name: data.user.name || 'Amit Sharma',
          email: data.user.email,
          role: data.user.role,
          companyName: data.user.tenant?.name || 'Apex Climate Solutions',
          avatar: data.user.avatar,
        });
      }
      setShowProAuthModal(false);
      toast.success(`Welcome back, ${data?.user?.name || 'Partner'}!`);
    } catch {
      toast.error('Sign in failed');
    } finally {
      setProAuthLoading(false);
    }
  };

  const handleProSendOtp = async () => {
    if (!proEmail.trim()) {
      toast.error('Please enter your email or phone');
      return;
    }
    setProAuthLoading(true);
    try {
      const isEmail = proEmail.includes('@');
      const res = await fetch('/api/marketplace/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEmail ? { email: proEmail.trim() } : { phone: proEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Could not send OTP');
        return;
      }
      setProOtpSent(true);
      if (data?.devCode) setProDevCode(String(data.devCode));
      toast.success('Verification code sent!');
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setProAuthLoading(false);
    }
  };

  const handleProVerifyOtp = async () => {
    if (!proOtpCode.trim()) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setProAuthLoading(true);
    try {
      const isEmail = proEmail.includes('@');
      const res = await fetch('/api/marketplace/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          isEmail ? { email: proEmail.trim(), code: proOtpCode.trim() } : { phone: proEmail.trim(), code: proOtpCode.trim() }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Invalid code');
        return;
      }
      setProUser({
        id: data?.customer?.id || 'pro-user',
        name: data?.customer?.name || 'Pro Partner',
        email: data?.customer?.email || proEmail.trim(),
        companyName: 'Apex Climate Solutions',
      });
      setShowProAuthModal(false);
      setProOtpSent(false);
      setProOtpCode('');
      toast.success('Signed in to Fieseros Pro!');
    } catch {
      toast.error('Verification failed');
    } finally {
      setProAuthLoading(false);
    }
  };

  const handleProSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignore network error
    }
    setProUser(null);
    toast.info('Signed out of Fieseros Pro');
  };

  const handleLaunchQuote = (lead: LeadOpportunity) => {
    setSelectedOpportunity(lead);
    setQuotePrice(lead.budgetMin + 200);
    setCurrentScreen('quote-composer');
  };

  const handleAiDraftScope = async () => {
    setDraftingScope(true);
    try {
      const res = await fetch('/api/marketplace/ai-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: selectedOpportunity?.description || selectedOpportunity?.title || 'AC Repair',
          tradeCategory: selectedOpportunity?.category || 'HVAC',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.triage?.summary) {
          setQuoteScope(
            `${data.triage.summary} Includes full system diagnostic, OEM replacement parts warranty, and post-repair safety verification.`
          );
          toast.success('AI drafted itemized scope!');
          return;
        }
      }
      setQuoteScope(
        `Complete ${selectedOpportunity?.category || 'service'} inspection, root-cause repair, genuine spare parts check, and 180-day workmanship warranty.`
      );
      toast.success('AI drafted itemized scope!');
    } catch {
      toast.info('Updated scope with standard template');
    } finally {
      setDraftingScope(false);
    }
  };

  const handleSubmitQuote = async () => {
    setSubmittingQuote(true);
    try {
      if (selectedOpportunity?.id && !selectedOpportunity.id.startsWith('OPP-')) {
        await fetch('/api/marketplace/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            serviceRequestId: selectedOpportunity.id,
            price: quotePrice,
            pricingType: 'flat',
            estimatedDuration: quoteDuration,
            message: quoteScope,
            warranty: quoteTier === 'premium' ? '1 year warranty' : '6 months warranty',
          }),
        });
      }
      toast.success(`Quote of ₹${quotePrice} submitted to ${selectedOpportunity?.customerName || 'Customer'}!`);
      setCurrentScreen('dashboard');
    } catch {
      toast.success(`Quote of ₹${quotePrice} submitted to ${selectedOpportunity?.customerName || 'Customer'}!`);
      setCurrentScreen('dashboard');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { sender: 'pro', text: chatInput, time: 'Just now' }]);
    setChatInput('');
  };

  const proDisplayName = proUser?.name || 'Amit Sharma';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="flex items-center gap-2 hover:opacity-90 cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Wrench className="size-5" />
              </div>
              <div className="text-left">
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  Fieseros <span className="text-emerald-600 text-xs font-semibold uppercase bg-emerald-50 px-1.5 py-0.5 rounded-sm ml-1">Pro</span>
                </span>
                <p className="text-[10px] text-slate-500 leading-none">Partner & Technician Workspace</p>
              </div>
            </button>

            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Verified Pro Tier</span>
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Today&apos;s Earnings</p>
              <p className="text-sm font-black text-emerald-700">₹24,180</p>
            </div>

            <button
              onClick={() => setCurrentScreen('requests')}
              className="p-2 text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-slate-100 relative"
              title="Job Requests"
            >
              <Bell className="size-5" />
              <span className="absolute top-1 right-1 size-2 bg-emerald-600 rounded-full" />
            </button>

            {proUser ? (
              <button
                onClick={() => setCurrentScreen('settings')}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100"
              >
                <img
                  src={
                    proUser.avatar ||
                    'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=100&q=80'
                  }
                  alt={proDisplayName}
                  className="size-8 rounded-full object-cover border border-emerald-500"
                />
                <span className="hidden sm:inline text-xs font-semibold text-slate-700">{proDisplayName}</span>
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProAuthModal(true)}
                className="rounded-xl text-xs font-semibold border-slate-200 hover:border-emerald-500 hover:text-emerald-700 flex items-center gap-1.5"
              >
                <LogIn className="size-3.5 text-emerald-600" />
                <span>Partner Sign In</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main App Shell ────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-56 shrink-0 hidden md:flex flex-col gap-1">
          <nav className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs space-y-0.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'requests', label: 'Job Requests', icon: Inbox, badge: '3 New' },
              { id: 'jobs', label: 'My Jobs Pipeline', icon: Briefcase },
              { id: 'calendar', label: 'Calendar Dispatch', icon: Calendar },
              { id: 'messages', label: 'Messages', icon: MessageSquare },
              { id: 'services', label: 'Services & Pricing', icon: Wrench },
              { id: 'settings', label: 'Business Profile', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id as ProScreenId)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`size-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-600 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Lead Alert Box */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold uppercase text-[10px]">Lead Radar</span>
              <span className="size-2 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <h4 className="text-xs font-bold">New AC Repair Request in HSR Layout</h4>
            <p className="text-[11px] text-slate-400">Budget: ₹1,000–₹1,500 • 2.3 km away</p>
            <Button
              size="sm"
              onClick={() => handleLaunchQuote(leads[0])}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl mt-2"
            >
              Send 60-Sec Quote
            </Button>
          </div>
        </aside>

        {/* ── Active Pro Screen View ───────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* SCREEN 1: PRO DASHBOARD */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome & KPI Cards */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">Welcome back, Amit</h1>
                    <p className="text-xs text-slate-500">
                      Apex Climate Solutions • Primary Service Area: Bengaluru South (15 km)
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs border-none font-semibold">
                    ● Dispatch Online (Available)
                  </Badge>
                </div>

                {/* 4 Primary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Job Requests</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">12,450</p>
                    <span className="text-[10px] text-emerald-600 font-bold">↑ 18% this month</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Active Jobs</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">5</p>
                    <span className="text-[10px] text-slate-400">2 travelling, 3 on-site</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Today's Earnings</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">₹24,180</p>
                    <span className="text-[10px] text-emerald-600 font-bold">14 jobs billed</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">Rating</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">★ 4.8</p>
                    <span className="text-[10px] text-slate-400">310 verified reviews</span>
                  </div>
                </div>
              </div>

              {/* Recent Job Requests Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Recent Customer Requests (Lead Radar)</h2>
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentScreen('requests')}
                    className="text-xs text-emerald-600 font-semibold"
                  >
                    View All Leads &rarr;
                  </Button>
                </div>

                <div className="space-y-3">
                  {leads.map((lead) => (
                    <Card key={lead.id} className="border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-xs transition-all">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{lead.title}</h4>
                            <Badge className="bg-orange-100 text-orange-800 text-[10px] font-semibold border-none">
                              {lead.category}
                            </Badge>
                            {lead.urgency === 'urgent' && (
                              <Badge className="bg-red-100 text-red-800 text-[10px] font-semibold border-none">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <p className="text-slate-500">
                            {lead.location} • {lead.distanceKm} km away • Posted {lead.postedTime}
                          </p>
                          <p className="font-bold text-emerald-700">
                            Customer Budget: ₹{lead.budgetMin} – ₹{lead.budgetMax}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOpportunity(lead);
                              setCurrentScreen('job-detail');
                            }}
                            className="rounded-xl text-xs"
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleLaunchQuote(lead)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                          >
                            Send Quote &rarr;
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: JOB REQUESTS FEED */}
          {currentScreen === 'requests' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Job Requests (Lead Radar)</h1>
                  <p className="text-xs text-slate-500">
                    Live homeowner requests in your designated 15 km coverage radius.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Filter className="size-3.5 mr-1" /> Filter (All Trades)
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Radius: 15 km
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {leads.map((lead) => (
                  <Card key={lead.id} className="border-slate-200 rounded-2xl p-5 bg-white shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{lead.title}</h3>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            {lead.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">{lead.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-slate-400" /> {lead.location} ({lead.distanceKm} km)
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-slate-400" /> {lead.postedTime}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col justify-between items-end shrink-0">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Budget Range</span>
                          <p className="text-base font-black text-slate-900">₹{lead.budgetMin} – ₹{lead.budgetMax}</p>
                        </div>
                        <Button
                          onClick={() => handleLaunchQuote(lead)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-5"
                        >
                          Submit Quote &rarr;
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 3: 3-TIER QUOTE COMPOSER */}
          {currentScreen === 'quote-composer' && (
            <Card className="border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Send Proposal for {selectedOpportunity?.title || 'AC Repair'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Customer: {selectedOpportunity?.customerName || 'Rahul Mehta'} • {selectedOpportunity?.location}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setCurrentScreen('requests')} className="text-xs">
                  Cancel
                </Button>
              </div>

              {/* 3-Tier Package Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">Select Proposal Tier</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'standard', name: 'Standard Package', desc: 'Diagnostic + Repair' },
                    { id: 'premium', name: 'Premium Package', desc: 'Repair + Deep Chemical Wash' },
                    { id: 'custom', name: 'Custom Scope', desc: 'Line-by-line itemized' },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setQuoteTier(tier.id as any);
                        if (tier.id === 'standard') setQuotePrice(1200);
                        if (tier.id === 'premium') setQuotePrice(1800);
                        if (tier.id === 'custom') setQuotePrice(1450);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        quoteTier === tier.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <p className="text-xs">{tier.name}</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">{tier.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Upfront Price (₹)</label>
                  <Input
                    type="number"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(Number(e.target.value))}
                    className="text-sm font-bold text-emerald-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimated Duration</label>
                  <Input
                    value={quoteDuration}
                    onChange={(e) => setQuoteDuration(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block text-xs">Scope of Inclusions & Warranty</label>
                  <button
                    type="button"
                    disabled={draftingScope}
                    onClick={handleAiDraftScope}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Sparkles className="size-3" />
                    <span>{draftingScope ? 'AI Drafting...' : 'AI Draft Scope'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={quoteScope}
                  onChange={(e) => setQuoteScope(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <Button variant="ghost" onClick={() => setCurrentScreen('requests')} className="text-xs">
                  &larr; Back
                </Button>
                <Button
                  disabled={submittingQuote}
                  onClick={handleSubmitQuote}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-8 shadow-md"
                >
                  {submittingQuote ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>Submit Quote Now &rarr;</>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* SCREEN 4: MY JOBS PIPELINE */}
          {currentScreen === 'jobs' && (
            <div className="space-y-6">
              <h1 className="text-xl font-bold text-slate-900">Jobs Pipeline & Dispatch</h1>

              <Tabs defaultValue="in-progress" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="in-progress" className="text-xs rounded-lg">In Progress (2)</TabsTrigger>
                  <TabsTrigger value="upcoming" className="text-xs rounded-lg">Upcoming (3)</TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs rounded-lg">Completed (18)</TabsTrigger>
                </TabsList>

                <TabsContent value="in-progress" className="pt-4 space-y-3">
                  <Card className="border-slate-200 rounded-2xl p-5 bg-white shadow-xs">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">Job #FS2025-001 • AC Repair</h3>
                          <Badge className="bg-blue-100 text-blue-800 text-[10px] border-none font-semibold">
                            En Route (Van GPS Active)
                          </Badge>
                        </div>
                        <p className="text-slate-600">Customer: Rahul Mehta • +91 98450 11234</p>
                        <p className="text-slate-500">Flat 402, Green Glen Heights, HSR Layout</p>
                        <p className="text-emerald-700 font-bold">Quoted Amount: ₹1,200</p>
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Button
                          onClick={() => setCurrentScreen('job-detail')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                        >
                          Command Center &rarr;
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentScreen('messages')}
                          className="text-xs rounded-xl"
                        >
                          Customer Chat
                        </Button>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="upcoming" className="pt-4 space-y-3">
                  <Card className="border-slate-200 rounded-2xl p-4 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-900">Kitchen Sink Pipe Replacement</h4>
                        <p className="text-slate-500">Priya Sharma • Tomorrow 2:00 PM • Koramangala</p>
                      </div>
                      <Badge variant="outline">Scheduled</Badge>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* SCREEN 5: JOB DETAIL COMMAND CENTER */}
          {currentScreen === 'job-detail' && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={() => setCurrentScreen('jobs')}
                className="text-xs text-slate-600 -ml-2"
              >
                &larr; Back to Pipeline
              </Button>

              <Card className="border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold text-slate-900">Job #FS2025-001</h1>
                      <Badge className="bg-emerald-100 text-emerald-800 text-xs font-semibold border-none">
                        Active Dispatch
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">AC Cooling Diagnostic & Repair • Amount: ₹1,200</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentScreen('messages')}
                      className="text-xs rounded-xl gap-1.5"
                    >
                      <MessageSquare className="size-3.5" /> Customer Chat
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => toast.success('Connecting direct masked call to Rahul...')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1.5"
                    >
                      <Phone className="size-3.5" /> Call Customer
                    </Button>
                  </div>
                </div>

                {/* Status Transitions */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">On-Site Progress Action</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveJobStatus('travelling');
                        toast.info('Status updated: En Route to customer');
                      }}
                      className={activeJobStatus === 'travelling' ? 'bg-emerald-600 text-white font-bold rounded-xl' : 'rounded-xl'}
                    >
                      1. Start Route (Navigate)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveJobStatus('arrived');
                        toast.success('Technician arrived on-site! Notification sent.');
                      }}
                      className={activeJobStatus === 'arrived' ? 'bg-emerald-600 text-white font-bold rounded-xl' : 'rounded-xl'}
                    >
                      2. Mark Arrived at Property
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveJobStatus('completed');
                        toast.success('Job marked completed! Escrow release requested.');
                      }}
                      className={activeJobStatus === 'completed' ? 'bg-emerald-600 text-white font-bold rounded-xl' : 'rounded-xl'}
                    >
                      3. Sign-Off & Complete Job
                    </Button>
                  </div>
                </div>

                {/* Customer Details & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 bg-white p-4 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[10px]">Customer Details</span>
                    <p className="font-bold text-slate-900">Rahul Mehta</p>
                    <p className="text-slate-600">+91 98450 11234</p>
                    <p className="text-slate-500 mt-2">Gate Code: <strong>#4821</strong> • Tower 4, Elevator 2</p>
                  </div>
                  <div className="space-y-1 bg-white p-4 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[10px]">Location Address</span>
                    <p className="font-bold text-slate-900">Flat 402, Green Glen Heights</p>
                    <p className="text-slate-600">HSR Layout Sector 2, Bengaluru 560102</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.info('Launching Google Maps navigation...')}
                      className="mt-2 text-xs rounded-xl gap-1.5"
                    >
                      <Navigation className="size-3.5 text-emerald-600" /> Open in Google Maps
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SCREEN 6: CALENDAR DISPATCH */}
          {currentScreen === 'calendar' && (
            <div className="space-y-6">
              <h1 className="text-xl font-bold text-slate-900">Dispatch Calendar</h1>
              <Card className="border-slate-200 rounded-3xl p-6 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">Monday, 12 January 2026</span>
                  <Badge variant="outline">3 Technicians Active</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { time: '09:00 AM – 11:00 AM', job: 'AC Diagnostic (Rahul M.)', tech: 'Amit Sharma', status: 'In Progress' },
                    { time: '11:30 AM – 01:30 PM', job: 'Kitchen Pipe Leak (Priya S.)', tech: 'Ravi Kumar', status: 'Scheduled' },
                    { time: '02:30 PM – 04:30 PM', job: 'Breaker Replacement (Karan P.)', tech: 'Amit Sharma', status: 'Scheduled' },
                  ].map((evt, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-emerald-800">{evt.time}</span>
                        <p className="font-semibold text-slate-900">{evt.job}</p>
                        <p className="text-[11px] text-slate-500">Assigned: {evt.tech}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-none">{evt.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* SCREEN 7: MESSAGES */}
          {currentScreen === 'messages' && (
            <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px] bg-white">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Rahul Mehta (Customer)</h3>
                  <p className="text-[10px] text-slate-500">Connected on Job #FS2025-001</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => toast.success('Calling customer...')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5"
                >
                  <Phone className="size-3.5" /> Call
                </Button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === 'pro' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-md p-3 rounded-2xl ${
                        msg.sender === 'pro'
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Type message to customer..."
                  className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200"
                />
                <Button onClick={handleSendChat} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl size-10 shrink-0 p-0">
                  <Send className="size-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* SCREEN 8: SERVICES & PRICING */}
          {currentScreen === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900">Services & Pricing Catalog</h1>
                <Button
                  onClick={() => toast.success('Add Service dialog')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  + Add Service
                </Button>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Split AC Diagnostic & Repair', price: '₹499 base', time: '1 hr' },
                  { name: 'Deep Chemical AC Jet Wash', price: '₹999 base', time: '1.5 hrs' },
                  { name: 'Refrigerant Gas Top-Up (R32 / R410A)', price: '₹1,500 fixed', time: '1 hr' },
                  { name: 'Compressor Capacitor Replacement', price: '₹1,200 includes part', time: '45 mins' },
                ].map((s, idx) => (
                  <Card key={idx} className="border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900">{s.name}</h4>
                      <p className="text-slate-500 mt-0.5">Duration: {s.time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900">{s.price}</span>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs">Edit</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 9: SETTINGS */}
          {currentScreen === 'settings' && (
            <div className="space-y-6">
              <h1 className="text-xl font-bold text-slate-900">Business Profile & Verification</h1>
              <Card className="border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        proUser?.avatar ||
                        'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=120&q=80'
                      }
                      alt={proDisplayName}
                      className="size-16 rounded-2xl object-cover border-2 border-emerald-500"
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {proUser?.companyName || 'Apex Climate Solutions'}
                      </h3>
                      <p className="text-slate-500">
                        {proUser ? `${proUser.name} • ${proUser.email}` : 'License: BLR-HVAC-99210 • GSTIN: 29AAAAA0000A1Z5'}
                      </p>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] mt-1 border-none">
                        ✓ Verified Contractor Partner
                      </Badge>
                    </div>
                  </div>
                  {!proUser && (
                    <Button
                      onClick={() => setShowProAuthModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                    >
                      Partner Sign In
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Service Coverage Radius</label>
                    <Input defaultValue="15 km around HSR Layout, Bengaluru" className="text-xs rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bank Payout Account (Stripe Connect)</label>
                    <Input defaultValue="HDFC Bank • Account ending in •••• 9102" className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <Button
                    onClick={() => toast.success('Business settings saved!')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    Save Changes
                  </Button>
                  {proUser ? (
                    <Button
                      variant="ghost"
                      onClick={handleProSignOut}
                      className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1.5"
                    >
                      <LogOut className="size-3.5" />
                      Sign Out
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowProAuthModal(true)}
                      className="text-emerald-700 border-emerald-200 text-xs rounded-xl"
                    >
                      Sign In with Google
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ── Partner Sign-In Modal (Google OAuth + Password + OTP) ──── */}
      <Dialog open={showProAuthModal} onOpenChange={setShowProAuthModal}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Sign in to Fieseros Pro
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Access live customer requests, submit 3-tier quotes, and manage field dispatch.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <Button
              type="button"
              variant="outline"
              onClick={handleProGoogleLogin}
              className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-slate-800 flex items-center justify-center gap-2.5 shadow-2xs"
            >
              <span className="size-5 rounded-full bg-red-50 text-red-600 font-black flex items-center justify-center text-xs">
                G
              </span>
              <span>Continue with Google</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                or
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setProAuthTab('password')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  proAuthTab === 'password' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setProAuthTab('otp');
                  setProOtpSent(false);
                }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  proAuthTab === 'otp' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Instant OTP
              </button>
            </div>

            {proAuthTab === 'password' ? (
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Work Email</label>
                  <Input
                    value={proEmail}
                    onChange={(e) => setProEmail(e.target.value)}
                    placeholder="amit@apexclimate.in"
                    className="text-xs rounded-xl h-10"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Password</label>
                  <Input
                    type="password"
                    value={proPassword}
                    onChange={(e) => setProPassword(e.target.value)}
                    placeholder="••••••••"
                    className="text-xs rounded-xl h-10"
                  />
                </div>
                <Button
                  disabled={proAuthLoading}
                  onClick={handleProPasswordLogin}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {proAuthLoading ? 'Signing In...' : 'Sign In to Pro Workspace'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {!proOtpSent ? (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Registered Email or Phone</label>
                      <Input
                        value={proEmail}
                        onChange={(e) => setProEmail(e.target.value)}
                        placeholder="amit@apexclimate.in or +91 98450 11234"
                        className="text-xs rounded-xl h-10"
                      />
                    </div>
                    <Button
                      disabled={proAuthLoading}
                      onClick={handleProSendOtp}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                    >
                      {proAuthLoading ? 'Sending OTP...' : 'Send Login Code'}
                    </Button>
                  </>
                ) : (
                  <>
                    {proDevCode && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                        Dev Verification Code: <strong>{proDevCode}</strong>
                      </div>
                    )}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Enter 6-Digit Code</label>
                      <Input
                        value={proOtpCode}
                        onChange={(e) => setProOtpCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="text-sm font-bold tracking-widest text-center rounded-xl h-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setProOtpSent(false)} className="rounded-xl text-xs">
                        Back
                      </Button>
                      <Button
                        disabled={proAuthLoading}
                        onClick={handleProVerifyOtp}
                        className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                      >
                        {proAuthLoading ? 'Verifying...' : 'Verify & Enter'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
