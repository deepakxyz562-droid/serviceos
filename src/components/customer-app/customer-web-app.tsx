'use client';

import React, { useState } from 'react';
import {
  Home,
  Sparkles,
  CalendarCheck,
  Building,
  Heart,
  HelpCircle,
  Settings,
  Search,
  Mic,
  Camera,
  MapPin,
  Bell,
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Wrench,
  Flame,
  Zap,
  Sparkle,
  Paintbrush,
  Hammer,
  Bug,
  Plus,
  Trash2,
  Upload,
  CreditCard,
  Wallet,
  DollarSign,
  AlertCircle,
  Share2,
  ChevronDown,
  Navigation,
  Send,
  Sliders,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export type CustomerScreenId =
  | 'home'
  | 'ai-assistant'
  | 'quotes'
  | 'provider-detail'
  | 'checkout'
  | 'bookings'
  | 'tracking'
  | 'chat'
  | 'my-home'
  | 'maintenance'
  | 'saved'
  | 'support'
  | 'settings';

interface QuoteItem {
  id: string;
  providerName: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  arrivalWindow: string;
  warranty: string;
  includesParts: boolean;
  price: number;
  badge?: string;
  description: string;
}

export function CustomerWebApp() {
  const [currentScreen, setCurrentScreen] = useState<CustomerScreenId>('home');
  const [selectedLocation, setSelectedLocation] = useState('Bengaluru, KA');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Intake State
  const [problemDescription, setProblemDescription] = useState('My AC is blowing warm air and humming');
  const [intakeStep, setIntakeStep] = useState<1 | 2 | 3>(1);
  const [acType, setAcType] = useState('Split AC');
  const [urgencyChoice, setUrgencyChoice] = useState('Tomorrow morning');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
  );

  // Selected Quote & Booking State
  const [selectedQuote, setSelectedQuote] = useState<QuoteItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet' | 'cash'>('upi');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('Great service! Arrived on time and solved the issue quickly.');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'pro' | 'user'; text: string; time: string }>>([
    { sender: 'pro', text: "Hi Rahul! I'm on the way to your location. Will reach in 10 minutes.", time: '9:40 AM' },
    { sender: 'user', text: 'Great, thanks! Please check the copper line joint as well.', time: '9:42 AM' },
    { sender: 'pro', text: 'Sure thing, I have the full diagnostic kit with me.', time: '9:45 AM' },
  ]);

  const quotes: QuoteItem[] = [
    {
      id: 'q1',
      providerName: 'CoolAir Solutions',
      avatar: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=120&q=80',
      rating: 4.8,
      reviewCount: 310,
      verified: true,
      arrivalWindow: 'Tomorrow, 10 AM - 12 PM',
      warranty: '1 year warranty',
      includesParts: true,
      price: 1200,
      badge: 'Recommended',
      description: 'Standard AC capacitor diagnostic & refrigerant leak test.',
    },
    {
      id: 'q2',
      providerName: 'Prime AC Service',
      avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=120&q=80',
      rating: 4.6,
      reviewCount: 145,
      verified: true,
      arrivalWindow: 'Today, 4 PM - 6 PM',
      warranty: '6 months warranty',
      includesParts: true,
      price: 1350,
      badge: 'Earliest',
      description: 'Full AC deep chemical wash + electrical inspection.',
    },
    {
      id: 'q3',
      providerName: 'Bright Tech Services',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      rating: 4.7,
      reviewCount: 92,
      verified: true,
      arrivalWindow: 'Tomorrow, 2 PM - 4 PM',
      warranty: '3 months warranty',
      includesParts: false,
      price: 1600,
      badge: 'Lowest Price',
      description: 'Comprehensive electrical triage & compressor safety switch test.',
    },
  ];

  const handleStartAiRequest = () => {
    setCurrentScreen('ai-assistant');
    setIntakeStep(1);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: chatInput, time: 'Just now' },
    ]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'pro', text: 'Got it, looking forward to fixing this for you!', time: 'Just now' },
      ]);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & City Selector */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentScreen('home')}
              className="flex items-center gap-2 hover:opacity-90 cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <Building className="size-5" />
              </div>
              <div className="text-left">
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  Fieseros <span className="text-emerald-600 text-xs font-semibold uppercase bg-emerald-50 px-1.5 py-0.5 rounded-sm ml-1">App</span>
                </span>
                <p className="text-[10px] text-slate-500 leading-none">Your Home. One AI Assistant.</p>
              </div>
            </button>

            {/* City Dropdown Pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors">
              <MapPin className="size-3.5 text-emerald-600" />
              <span>{selectedLocation}</span>
              <ChevronDown className="size-3 text-slate-400" />
            </div>
          </div>

          {/* Quick Search */}
          <div className="hidden lg:flex flex-1 max-w-md relative">
            <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What needs fixing today? (e.g. AC cooling, leaky tap)..."
              className="pl-9 pr-20 h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
              <button onClick={handleStartAiRequest} className="hover:text-emerald-600 p-1" title="Voice problem">
                <Mic className="size-3.5" />
              </button>
              <button onClick={handleStartAiRequest} className="hover:text-emerald-600 p-1" title="Photo triage">
                <Camera className="size-3.5" />
              </button>
            </div>
          </div>

          {/* User Profile & Quick Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleStartAiRequest}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <span>Ask AI pro</span>
            </Button>

            <button
              onClick={() => setCurrentScreen('bookings')}
              className="p-2 text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-slate-100 relative"
              title="My Bookings"
            >
              <CalendarCheck className="size-5" />
              <span className="absolute top-1 right-1 size-2 bg-emerald-600 rounded-full" />
            </button>

            <button
              onClick={() => setCurrentScreen('settings')}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                alt="Rahul"
                className="size-8 rounded-full object-cover border border-emerald-500"
              />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">Rahul M.</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main App Shell (Sidebar + Screen Content) ──────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-56 shrink-0 hidden md:flex flex-col gap-1">
          <nav className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs space-y-0.5">
            {[
              { id: 'home', label: 'Home Dashboard', icon: Home },
              { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, badge: 'New' },
              { id: 'quotes', label: '3 Quotes Board', icon: Sliders },
              { id: 'bookings', label: 'My Bookings', icon: CalendarCheck },
              { id: 'tracking', label: 'Live Tracking', icon: Navigation },
              { id: 'chat', label: 'Messages', icon: MessageSquare },
              { id: 'my-home', label: 'My Home Assets', icon: Building },
              { id: 'maintenance', label: 'Maintenance', icon: Clock },
              { id: 'saved', label: 'Saved Pros', icon: Heart },
              { id: 'support', label: 'Help & Support', icon: HelpCircle },
              { id: 'settings', label: 'Profile & Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id as CustomerScreenId)}
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

          {/* Quick Help Card */}
          <div className="bg-emerald-900 text-white p-4 rounded-2xl mt-4 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider">Emergency Help</p>
              <h4 className="text-sm font-bold mt-1">Water leak or no power?</h4>
              <p className="text-xs text-emerald-100/80 mt-1">Direct connect to top on-call verified emergency tech.</p>
              <Button
                size="sm"
                className="mt-3 w-full bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl shadow-xs"
                onClick={() => {
                  toast.success('Routing emergency call to on-call dispatcher...');
                  setCurrentScreen('tracking');
                }}
              >
                Call Emergency Pro
              </Button>
            </div>
          </div>
        </aside>

        {/* ── Active Screen View ─────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* SCREEN 1: HOME DASHBOARD */}
          {currentScreen === 'home' && (
            <div className="space-y-6">
              {/* Welcome & AI Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-2 max-w-lg">
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-none text-[11px] font-medium">
                    ⚡ 100% Free & No Hidden Markups
                  </Badge>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome back, Rahul!
                  </h1>
                  <p className="text-sm text-emerald-100">
                    What service do you need today? Describe in plain words, upload a photo, and get up to 3 competitive bids in minutes.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Button
                      onClick={handleStartAiRequest}
                      className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl shadow-xs"
                    >
                      <Sparkles className="size-3.5 mr-1 text-emerald-600" /> Describe with AI
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentScreen('quotes')}
                      className="border-white/40 text-white hover:bg-white/10 text-xs rounded-xl"
                    >
                      View Active Quotes (3)
                    </Button>
                  </div>
                </div>

                <div className="hidden sm:block shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center">
                  <p className="text-xs font-semibold text-emerald-200">Average Pro Match Time</p>
                  <p className="text-3xl font-black mt-1">4.2 min</p>
                  <p className="text-[11px] text-emerald-100/80 mt-1">Across 48,000+ verified pros</p>
                </div>
              </div>

              {/* Service Categories Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-900">Explore Home Services</h2>
                  <span className="text-xs text-emerald-600 font-medium hover:underline cursor-pointer">
                    View All 15 Categories &rarr;
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'ac', name: 'AC & Cooling', icon: Flame, price: 'From ₹499', color: 'text-orange-600 bg-orange-50' },
                    { id: 'plumbing', name: 'Plumbing Repair', icon: Wrench, price: 'From ₹299', color: 'text-blue-600 bg-blue-50' },
                    { id: 'electrical', name: 'Electrical Work', icon: Zap, price: 'From ₹249', color: 'text-amber-600 bg-amber-50' },
                    { id: 'cleaning', name: 'Deep Cleaning', icon: Sparkle, price: 'From ₹799', color: 'text-emerald-600 bg-emerald-50' },
                    { id: 'painting', name: 'Home Painting', icon: Paintbrush, price: 'Custom Quote', color: 'text-purple-600 bg-purple-50' },
                    { id: 'carpentry', name: 'Carpentry & Wood', icon: Hammer, price: 'From ₹349', color: 'text-indigo-600 bg-indigo-50' },
                    { id: 'pest', name: 'Pest Control', icon: Bug, price: 'From ₹899', color: 'text-rose-600 bg-rose-50' },
                    { id: 'appliance', name: 'Appliance Repair', icon: Sparkles, price: 'From ₹399', color: 'text-teal-600 bg-teal-50' },
                  ].map((service) => {
                    const SIcon = service.icon;
                    return (
                      <Card
                        key={service.id}
                        onClick={handleStartAiRequest}
                        className="border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer rounded-2xl group"
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${service.color} group-hover:scale-105 transition-transform`}>
                            <SIcon className="size-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {service.name}
                            </h3>
                            <p className="text-[11px] text-slate-500">{service.price}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Active Quotes Promo Banner */}
              <Card className="border-emerald-200 bg-emerald-50/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Sliders className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">3 Quotes Received for Your AC Repair</h3>
                    <p className="text-xs text-slate-600">
                      CoolAir Solutions, Prime AC Service, and Bright Tech have submitted estimates.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setCurrentScreen('quotes')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0"
                >
                  Compare & Select Pro &rarr;
                </Button>
              </Card>

              {/* Recent Requests Table / Cards */}
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-3">Recent Requests</h2>
                <div className="space-y-3">
                  {[
                    {
                      id: 'REQ-1042',
                      service: 'AC Cooling Diagnostic',
                      status: '3 Quotes Ready',
                      date: 'Today, 9:15 AM',
                      statusColor: 'bg-emerald-100 text-emerald-800',
                      action: () => setCurrentScreen('quotes'),
                    },
                    {
                      id: 'REQ-0988',
                      service: 'Kitchen Pipe Leak Repair',
                      status: 'Service Scheduled',
                      date: 'Yesterday, 4:20 PM',
                      statusColor: 'bg-blue-100 text-blue-800',
                      action: () => setCurrentScreen('tracking'),
                    },
                  ].map((req) => (
                    <Card key={req.id} className="border-slate-200 rounded-2xl hover:shadow-xs transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <Clock className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">{req.service}</h4>
                              <Badge className={`text-[10px] font-semibold border-none ${req.statusColor}`}>
                                {req.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{req.id} • Posted {req.date}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={req.action}
                          className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                        >
                          View Details &rarr;
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: AI ASSISTANT / CREATE REQUEST */}
          {currentScreen === 'ai-assistant' && (
            <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Fieseros AI Concierge
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Step {intakeStep} of 3 • Problem Diagnosis & Brief
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    Multimodal AI Active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {intakeStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Describe What Happened
                      </label>
                      <div className="relative">
                        <textarea
                          rows={3}
                          value={problemDescription}
                          onChange={(e) => setProblemDescription(e.target.value)}
                          placeholder="e.g. My kitchen pipe under the sink started leaking yesterday afternoon..."
                          className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 focus:outline-emerald-500 bg-slate-50/50"
                        />
                        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 text-slate-400">
                          <button
                            type="button"
                            onClick={() => toast.info('Microphone listening... speaking recorded!')}
                            className="p-1 hover:text-emerald-600"
                            title="Speak"
                          >
                            <Mic className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Photo Upload Zone */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Photo / Evidence (Greatly increases quote accuracy)
                      </label>
                      {attachedPhoto ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-w-sm">
                          <img src={attachedPhoto} alt="Upload" className="w-full h-40 object-cover" />
                          <button
                            onClick={() => setAttachedPhoto(null)}
                            className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          <div className="p-2 bg-white text-[11px] font-medium text-slate-600 flex items-center justify-between">
                            <span>pipe_leak_evidence.jpg</span>
                            <span className="text-emerald-600 font-bold">AI Diagnosed: Joint Rust</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() =>
                            setAttachedPhoto(
                              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
                            )
                          }
                          className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-500 cursor-pointer transition-colors bg-slate-50/50"
                        >
                          <Camera className="size-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">Click to upload photo or drag & drop</p>
                          <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, HEIC up to 10MB</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        onClick={() => setIntakeStep(2)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-6"
                      >
                        Continue to Questions &rarr;
                      </Button>
                    </div>
                  </div>
                )}

                {intakeStep === 2 && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 text-emerald-900 p-3.5 rounded-2xl text-xs flex items-center gap-2 border border-emerald-200">
                      <Sparkles className="size-4 shrink-0 text-emerald-600" />
                      <span>
                        AI identified category: <strong>HVAC & Cooling Repair</strong>. Please answer 3 quick questions:
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">What type of AC unit?</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {['Split AC', 'Window AC', 'Cassette AC', 'Central Plant'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setAcType(type)}
                              className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                                acType === type
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">When do you need the technician?</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {['Emergency (Within 2 hrs)', 'Tomorrow morning', 'This weekend'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setUrgencyChoice(opt)}
                              className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                                urgencyChoice === opt
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Property Type</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Apartment', 'Villa / House', 'Commercial Office'].map((prop) => (
                            <button
                              key={prop}
                              type="button"
                              onClick={() => setPropertyType(prop)}
                              className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                                propertyType === prop
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              {prop}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center">
                      <Button variant="ghost" onClick={() => setIntakeStep(1)} className="text-xs">
                        &larr; Back
                      </Button>
                      <Button
                        onClick={() => setIntakeStep(3)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-6"
                      >
                        Review Brief & Find Pros &rarr;
                      </Button>
                    </div>
                  </div>
                )}

                {intakeStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Request Brief Summary</h3>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-500">Service:</span>
                        <span className="font-bold text-slate-900">AC Repair & Cooling Check ({acType})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-500">Preferred Arrival:</span>
                        <span className="font-bold text-slate-900">{urgencyChoice}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-500">Property:</span>
                        <span className="font-bold text-slate-900">{propertyType} • {selectedLocation}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-500">Description:</span>
                        <span className="font-semibold text-slate-900">{problemDescription}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Estimated Cost Benchmark:</span>
                        <span className="font-bold text-emerald-700">₹900 – ₹1,800 (Fair Price Range)</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center">
                      <Button variant="ghost" onClick={() => setIntakeStep(2)} className="text-xs">
                        &larr; Edit Details
                      </Button>
                      <Button
                        onClick={() => {
                          toast.success('Request dispatched! Matching top 3 local pros...');
                          setCurrentScreen('quotes');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-8 shadow-md"
                      >
                        Dispatch & Compare 3 Quotes &rarr;
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SCREEN 3: 3 QUOTES COMPARISON BOARD */}
          {currentScreen === 'quotes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">3 Verified Quotes for Your Request</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Job #REQ-1042 • AC Repair • HSR Layout, Bengaluru
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                  <span className="text-slate-500 px-2 font-medium">Filter:</span>
                  <button className="px-2.5 py-1 bg-white font-bold text-emerald-800 rounded-lg shadow-2xs">
                    Recommended
                  </button>
                  <button className="px-2.5 py-1 text-slate-600 hover:text-slate-900">Lowest Price</button>
                  <button className="px-2.5 py-1 text-slate-600 hover:text-slate-900">Earliest</button>
                </div>
              </div>

              {/* 3 Proposal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quotes.map((quote) => (
                  <Card
                    key={quote.id}
                    className={`rounded-2xl transition-all relative overflow-hidden flex flex-col ${
                      quote.badge === 'Recommended'
                        ? 'border-2 border-emerald-500 shadow-md bg-white'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {quote.badge && (
                      <div className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 uppercase tracking-wider text-center">
                        {quote.badge}
                      </div>
                    )}

                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Provider Header */}
                      <div className="flex items-start gap-3">
                        <img
                          src={quote.avatar}
                          alt={quote.providerName}
                          className="size-12 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900">{quote.providerName}</h3>
                            {quote.verified && (
                              <ShieldCheck className="size-4 text-emerald-600" title="Verified Pro" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-amber-500 mt-0.5">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-800">{quote.rating}</span>
                            <span className="text-slate-400">({quote.reviewCount} reviews)</span>
                          </div>
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Arrival:</span>
                          <span className="font-medium text-slate-800">{quote.arrivalWindow}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Warranty:</span>
                          <span className="font-medium text-emerald-700">{quote.warranty}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Inclusions:</span>
                          <span className="font-medium text-slate-800">
                            {quote.includesParts ? 'Parts & Labor Included' : 'Diagnostic & Labor'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">{quote.description}</p>

                      {/* Price & CTA */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Price</span>
                          <p className="text-xl font-black text-slate-900">₹{quote.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setCurrentScreen('provider-detail');
                            }}
                            className="rounded-xl text-xs"
                          >
                            Profile
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setCurrentScreen('checkout');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                          >
                            Select & Book
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 4: PROVIDER DETAILED PROFILE */}
          {currentScreen === 'provider-detail' && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={() => setCurrentScreen('quotes')}
                className="text-xs text-slate-600 hover:text-slate-900 -ml-2"
              >
                &larr; Back to Quotes
              </Button>

              <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="h-32 bg-gradient-to-r from-emerald-600 to-teal-800 relative" />
                <CardContent className="px-6 pb-6 pt-0 relative">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
                    <div className="flex items-end gap-4">
                      <img
                        src={selectedQuote?.avatar || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=120&q=80'}
                        alt="Provider"
                        className="size-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                      />
                      <div className="mb-1">
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl font-bold text-slate-900">
                            {selectedQuote?.providerName || 'CoolAir Solutions'}
                          </h1>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                            Verified Partner
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">Licensed HVAC Contractor • HSR Layout, Bengaluru</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setCurrentScreen('checkout')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-6"
                      >
                        Book for ₹{selectedQuote?.price || 1200}
                      </Button>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100 text-center text-xs">
                    <div>
                      <p className="text-slate-400">Rating</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">★ 4.8 (310)</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Jobs Completed</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">1,240+</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Response Time</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">&lt; 15 mins</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Experience</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">8 Years</p>
                    </div>
                  </div>

                  {/* Bio & Details */}
                  <div className="mt-6 space-y-4 text-xs text-slate-700">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 mb-1">About the Business</h3>
                      <p className="text-slate-600 leading-relaxed">
                        CoolAir Solutions specializes in residential split & window AC repair, deep chemical servicing, gas refilling, and capacitor replacements. We use original OEM parts and provide up to 1 year on-site service warranties.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900 mb-2">Verified Credentials</h3>
                      <div className="flex flex-wrap gap-2">
                        {['Government Registered MSME', 'Liability Insured ($100k)', 'Background Checked Technicians', '5-Star Google Rating (400+ reviews)'].map((cred) => (
                          <Badge key={cred} variant="outline" className="text-xs bg-slate-50 border-slate-200">
                            ✓ {cred}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SCREEN 5: BOOKING & CHECKOUT */}
          {currentScreen === 'checkout' && (
            <div className="space-y-6">
              <Button
                variant="ghost"
                onClick={() => setCurrentScreen('quotes')}
                className="text-xs text-slate-600 hover:text-slate-900 -ml-2"
              >
                &larr; Back to Quotes
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Summary */}
                <div className="md:col-span-2 space-y-4">
                  <Card className="border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Confirm Your Booking</h2>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Service:</span>
                        <span className="font-bold text-slate-900">AC Cooling Diagnostic & Repair</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Provider:</span>
                        <span className="font-bold text-emerald-700">{selectedQuote?.providerName || 'CoolAir Solutions'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Arrival Window:</span>
                        <span className="font-bold text-slate-900">{selectedQuote?.arrivalWindow || 'Tomorrow, 10 AM - 12 PM'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Service Address:</span>
                        <span className="font-bold text-slate-900">Flat 402, Green Glen Heights, HSR Layout</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-900 mb-2">Select Payment Method</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { id: 'upi', label: 'UPI (GPay / PhonePe / Paytm)', icon: Zap },
                          { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                          { id: 'wallet', label: 'Fieseros Wallet', icon: Wallet },
                          { id: 'cash', label: 'Pay After Service (Cash / UPI)', icon: CheckCircle2 },
                        ].map((m) => {
                          const MIcon = m.icon;
                          const isSel = paymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setPaymentMethod(m.id as any)}
                              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                                isSel
                                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold'
                                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <MIcon className={`size-4 ${isSel ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right: Bill Breakdown */}
                <div>
                  <Card className="border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm bg-white">
                    <h3 className="text-sm font-bold text-slate-900">Price Itemization</h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Service Proposal:</span>
                        <span>₹{selectedQuote?.price || 1200}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Platform Trust & Safety Fee:</span>
                        <span>₹60</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Fieseros Service Warranty (1 Yr):</span>
                        <span>FREE</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-sm text-slate-900">
                        <span>Total Payable:</span>
                        <span>₹{(selectedQuote?.price || 1200) + 60}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 space-y-1">
                      <p>🔒 100% Escrow Protected: Funds released only after work completion sign-off.</p>
                      <p>⏱️ Free cancellation up to 2 hours before arrival.</p>
                    </div>

                    <Button
                      onClick={() => {
                        setBookingConfirmed(true);
                        toast.success('Booking confirmed! Technician assigned.');
                        setCurrentScreen('tracking');
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold py-3 shadow-md"
                    >
                      Confirm Booking &rarr;
                    </Button>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 6: BOOKINGS LIST */}
          {currentScreen === 'bookings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900">My Bookings</h1>
                <Button
                  onClick={handleStartAiRequest}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  + Book New Service
                </Button>
              </div>

              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="upcoming" className="text-xs rounded-lg">Upcoming (1)</TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs rounded-lg">Completed (4)</TabsTrigger>
                  <TabsTrigger value="cancelled" className="text-xs rounded-lg">Cancelled (0)</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="pt-4 space-y-3">
                  <Card className="border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <img
                          src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=120&q=80"
                          alt="Pro"
                          className="size-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">AC Cooling Diagnostic & Repair</h3>
                            <Badge className="bg-blue-100 text-blue-800 text-[10px] font-semibold border-none">
                              Scheduled
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">Provider: CoolAir Solutions (★ 4.8)</p>
                          <p className="text-xs text-slate-500">Tomorrow, 12 Jan 2026 • 10:00 AM - 12:00 PM</p>
                          <p className="text-xs font-bold text-slate-900">Amount: ₹1,260 (Pay on completion)</p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center gap-2 shrink-0">
                        <Button
                          onClick={() => setCurrentScreen('tracking')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl w-full"
                        >
                          Live Track Tech
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentScreen('chat')}
                          className="text-xs rounded-xl w-full"
                        >
                          Chat with Pro
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="completed" className="pt-4 space-y-3">
                  {[
                    { id: 'B-882', title: 'Plumbing Kitchen Sink Repair', date: '28 Dec 2025', cost: '₹650', pro: 'Ravi Plumbing' },
                    { id: 'B-741', title: 'Deep Bathroom Cleaning', date: '15 Nov 2025', cost: '₹1,200', pro: 'CleanPro Services' },
                  ].map((job) => (
                    <Card key={job.id} className="border-slate-200 rounded-2xl shadow-xs">
                      <CardContent className="p-4 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{job.title}</h4>
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-none">Completed</Badge>
                          </div>
                          <p className="text-slate-500 mt-0.5">{job.pro} • {job.date} • {job.cost}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReviewModal(true)}
                          className="rounded-xl text-xs"
                        >
                          Rate & Review
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* SCREEN 7: LIVE BOOKING TRACKING */}
          {currentScreen === 'tracking' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Live Service Tracking</h1>
                  <p className="text-xs text-slate-500">Booking #FS2026-0041 • CoolAir Solutions</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  En-Route: ETA 12 mins
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stepper Card */}
                <Card className="border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 bg-white">
                  <h3 className="text-sm font-bold text-slate-900">Arrival Timeline</h3>

                  <div className="space-y-4 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                    {[
                      { title: 'Booking Confirmed', time: '8:15 AM', done: true },
                      { title: 'Technician Dispatched', time: '9:30 AM', done: true },
                      { title: 'On the Way (Van GPS Active)', time: 'ETA 9:50 AM', active: true },
                      { title: 'Arrived at Property', time: 'Pending arrival', done: false },
                      { title: 'Job Completed & Sign-Off', time: 'Pending sign-off', done: false },
                    ].map((step, idx) => (
                      <div key={idx} className="relative">
                        <div
                          className={`absolute -left-6 top-0.5 size-4 rounded-full border-2 ${
                            step.done
                              ? 'bg-emerald-600 border-emerald-600'
                              : step.active
                              ? 'bg-white border-emerald-600 animate-pulse'
                              : 'bg-white border-slate-300'
                          }`}
                        />
                        <p className={`font-bold ${step.active ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {step.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{step.time}</p>
                      </div>
                    ))}
                  </div>

                  {/* Technician Contact Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=100&q=80"
                        alt="Tech"
                        className="size-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Ravi Sharma (Tech)</p>
                        <p className="text-[11px] text-slate-500">Van: KA-01-EQ-9122</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentScreen('chat')}
                        className="rounded-xl p-2"
                        title="Chat"
                      >
                        <MessageSquare className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => toast.success('Calling masked pro line...')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-2"
                        title="Call"
                      >
                        <Phone className="size-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Map Simulation */}
                <Card className="md:col-span-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[360px] bg-slate-100 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />

                  {/* Map Mock Graphic */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="size-16 rounded-full bg-emerald-600/10 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 animate-bounce">
                      <Navigation className="size-8 rotate-45" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Technician is 2.4 km away</h4>
                      <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                        Moving north along 27th Main Road, HSR Layout. Safe arrival PIN: <strong className="text-emerald-700">4821</strong>
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white text-xs border-slate-300">
                      Live Telemetry Connected (10s refresh)
                    </Badge>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* SCREEN 8: IN-APP CHAT */}
          {currentScreen === 'chat' && (
            <Card className="border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px] bg-white">
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=100&q=80"
                    alt="Pro"
                    className="size-10 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">CoolAir Solutions (Ravi)</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold">● Online • Connected on Job #REQ-1042</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success('Calling pro line via masked number')}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Phone className="size-3.5" /> Call Pro
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md p-3 rounded-2xl ${
                        msg.sender === 'user'
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

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.info('Photo attachment dialog opened')}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <Camera className="size-4" />
                </button>
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Type a message or share location details..."
                  className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                />
                <Button
                  onClick={handleSendChat}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl size-10 shrink-0 p-0"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* SCREEN 9: MY HOME ASSET VAULT */}
          {currentScreen === 'my-home' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">My Home & Asset Memory</h1>
                  <p className="text-xs text-slate-500">
                    Track equipment models, warranties, and maintenance records for repeat service without re-explaining.
                  </p>
                </div>
                <Button
                  onClick={() => toast.success('Add Property dialog opened')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                >
                  + Add New Property
                </Button>
              </div>

              {/* Properties Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 rounded-2xl p-5 bg-white shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] mb-1.5 border-none">
                        Primary Residence
                      </Badge>
                      <h3 className="text-sm font-bold text-slate-900">Apartment • HSR Layout</h3>
                      <p className="text-xs text-slate-500">Flat 402, Green Glen Heights, Bengaluru</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">Edit</Button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Registered Appliances</span>
                      <strong className="text-slate-800">4 Units</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Active Service Plans</span>
                      <strong className="text-emerald-700">1 Active (HVAC)</strong>
                    </div>
                  </div>
                </Card>

                <Card className="border-slate-200 rounded-2xl p-5 bg-white shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-slate-100 text-slate-700 text-[10px] mb-1.5 border-none">
                        Rental Property
                      </Badge>
                      <h3 className="text-sm font-bold text-slate-900">Villa • Whitefield</h3>
                      <p className="text-xs text-slate-500">Villa 12, Palm Meadows, Bengaluru</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">Edit</Button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Registered Appliances</span>
                      <strong className="text-slate-800">2 Units</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Active Service Plans</span>
                      <strong className="text-slate-500">None</strong>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Appliances Memory Vault */}
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-3">Saved Appliances (Asset Vault)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      name: 'Daikin 1.5 Ton Split AC',
                      loc: 'Living Room (HSR Layout)',
                      serial: 'DKN-2022-8192X',
                      warranty: 'Warranty expires Oct 2027',
                      nextService: 'Due in 20 days',
                    },
                    {
                      name: 'AO Smith 25L Geyser',
                      loc: 'Master Bathroom',
                      serial: 'AOS-GS-99120',
                      warranty: 'Warranty active (5 yrs)',
                      nextService: 'Cleaned Nov 2025',
                    },
                    {
                      name: 'Kent Grand Plus RO Purifier',
                      loc: 'Kitchen Counter',
                      serial: 'KNT-RO-4421',
                      warranty: 'Standard plan',
                      nextService: 'Filter change due in 45 days',
                    },
                  ].map((app, idx) => (
                    <Card key={idx} className="border-slate-200 rounded-2xl p-4 bg-white shadow-2xs">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900">{app.name}</h4>
                          <Wrench className="size-3.5 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-[11px]">{app.loc}</p>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                          <p className="text-[10px] text-slate-400">SN: {app.serial}</p>
                          <p className="text-[11px] font-medium text-emerald-700">✓ {app.warranty}</p>
                          <p className="text-[11px] font-medium text-amber-700">⏱️ {app.nextService}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleStartAiRequest}
                          className="w-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs rounded-xl font-medium"
                        >
                          Book 1-Tap Service
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 10: SCHEDULED MAINTENANCE */}
          {currentScreen === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Preventative Home Maintenance</h1>
                  <p className="text-xs text-slate-500">
                    Never let broken systems ruin your day. Automated reminders tuned to your appliance usage.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: 'Pre-Summer AC Deep Clean & Gas Check',
                    target: 'Living Room AC',
                    due: 'Due in 20 days',
                    urgent: true,
                    cost: '₹499 fixed price',
                  },
                  {
                    title: 'RO Membrane & Carbon Filter Replacement',
                    target: 'Kitchen Water Purifier',
                    due: 'Due in 45 days',
                    urgent: false,
                    cost: '₹750 includes filter',
                  },
                  {
                    title: 'Pre-Monsoon Pest Control Treatment',
                    target: 'Full Home (HSR Layout)',
                    due: 'Due in 2 months',
                    urgent: false,
                    cost: '₹899 organic spray',
                  },
                ].map((item, i) => (
                  <Card key={i} className="border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <Clock className="size-5" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{item.title}</h4>
                          {item.urgent && (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px] border-none">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-500">{item.target} • {item.due}</p>
                        <p className="text-emerald-700 font-semibold">{item.cost}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleStartAiRequest}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4"
                    >
                      Book Now &rarr;
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 11: SAVED PROFESSIONALS */}
          {currentScreen === 'saved' && (
            <div className="space-y-6">
              <h1 className="text-xl font-bold text-slate-900">Saved Professionals</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quotes.map((pro) => (
                  <Card key={pro.id} className="border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={pro.avatar} alt={pro.providerName} className="size-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{pro.providerName}</h4>
                        <p className="text-[11px] text-amber-600 font-medium">★ {pro.rating} ({pro.reviewCount} reviews)</p>
                        <p className="text-[11px] text-slate-500">{pro.warranty}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedQuote(pro);
                        setCurrentScreen('checkout');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
                    >
                      Hire Again
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 12: SUPPORT */}
          {currentScreen === 'support' && (
            <div className="space-y-6">
              <h1 className="text-xl font-bold text-slate-900">Help & Support Center</h1>
              <Card className="border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Frequently Asked Questions</h3>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <h4 className="font-bold text-slate-900 mb-1">How does the 100% Escrow Guarantee work?</h4>
                    <p>Your payment is safely held until you approve the technician's completed job on-site.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <h4 className="font-bold text-slate-900 mb-1">What if the pro does not show up on time?</h4>
                    <p>You can cancel with 100% immediate refund, and we will rematch you with a priority emergency technician.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <h4 className="font-bold text-slate-900 mb-1">Are all professionals background verified?</h4>
                    <p>Yes. Every partner must upload government IDs, business registration, and trade liability insurance.</p>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    onClick={() => toast.success('Support live chat opened')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Start Live Support Chat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.info('Support hotline: +91 800-FIESEROS')}
                    className="text-xs rounded-xl"
                  >
                    Call Support
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* SCREEN 13: SETTINGS */}
          {currentScreen === 'settings' && (
            <div className="space-y-6">
              <h1 className="text-xl font-bold text-slate-900">Profile & Settings</h1>
              <Card className="border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="Rahul"
                    className="size-16 rounded-2xl object-cover border-2 border-emerald-500"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Rahul Mehta</h3>
                    <p className="text-slate-500">rahul.mehta@example.com • +91 98450 11234</p>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] mt-1 border-none">
                      Verified Member
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Primary Delivery Address</label>
                    <Input defaultValue="Flat 402, Green Glen Heights, HSR Layout, Bengaluru 560102" className="text-xs rounded-xl" />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Notification Preferences</label>
                    <p className="text-slate-500 text-[11px]">Receive quote alerts via SMS and WhatsApp.</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <Button
                    onClick={() => toast.success('Profile changes saved successfully!')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => toast.info('Logged out')}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    Sign Out
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ── Review Modal ───────────────────────────────────────────── */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Rate Your Service Experience
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="text-center space-y-1">
              <p className="text-slate-600 font-medium">How would you rate your technician?</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`size-6 ${
                        star <= reviewRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Review Comments</label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-emerald-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReviewModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowReviewModal(false);
                toast.success('Thank you! Your verified review has been submitted.');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
