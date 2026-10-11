'use client';

import React, { useState } from 'react';
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

export function ProWebApp() {
  const [currentScreen, setCurrentScreen] = useState<ProScreenId>('dashboard');
  const [selectedOpportunity, setSelectedOpportunity] = useState<LeadOpportunity | null>(null);

  // Quote Composer Form State
  const [quoteTier, setQuoteTier] = useState<'standard' | 'premium' | 'custom'>('standard');
  const [quotePrice, setQuotePrice] = useState(1200);
  const [quoteDuration, setQuoteDuration] = useState('2 hours');
  const [quoteScope, setQuoteScope] = useState('Includes AC gas check, capacitor testing, and electrical wiring inspection.');

  // Active Job State
  const [activeJobStatus, setActiveJobStatus] = useState<'assigned' | 'travelling' | 'arrived' | 'completed'>('travelling');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'pro' | 'customer'; text: string; time: string }>>([
    { sender: 'customer', text: 'Hi Amit, will you have the replacement capacitor with you?', time: '10:04 AM' },
    { sender: 'pro', text: 'Yes Rahul! I have OEM 45/5 MFD capacitors in the van.', time: '10:06 AM' },
  ]);

  const leads: LeadOpportunity[] = [
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

  const handleLaunchQuote = (lead: LeadOpportunity) => {
    setSelectedOpportunity(lead);
    setQuotePrice(lead.budgetMin + 200);
    setCurrentScreen('quote-composer');
  };

  const handleSubmitQuote = () => {
    toast.success(`Quote of ₹${quotePrice} submitted to ${selectedOpportunity?.customerName || 'Customer'}!`);
    setCurrentScreen('dashboard');
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { sender: 'pro', text: chatInput, time: 'Just now' }]);
    setChatInput('');
  };

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
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Today's Earnings</p>
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

            <button
              onClick={() => setCurrentScreen('settings')}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100"
            >
              <img
                src="https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=100&q=80"
                alt="Amit"
                className="size-8 rounded-full object-cover border border-emerald-500"
              />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">Amit Sharma</span>
            </button>
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
                <label className="font-bold text-slate-700 block mb-1 text-xs">Scope of Inclusions & Warranty</label>
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
                  onClick={handleSubmitQuote}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-8 shadow-md"
                >
                  Submit Quote Now &rarr;
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
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=120&q=80"
                    alt="Pro"
                    className="size-16 rounded-2xl object-cover border-2 border-emerald-500"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Apex Climate Solutions</h3>
                    <p className="text-slate-500">License: BLR-HVAC-99210 • GSTIN: 29AAAAA0000A1Z5</p>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] mt-1 border-none">
                      ✓ Verified Contractor Partner
                    </Badge>
                  </div>
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
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
