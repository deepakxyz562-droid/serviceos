'use client';
import React, { useState } from 'react';
import { ArrowRight, BadgeAlert, CheckCircle, CheckCircle2, Loader2, Play } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/consent';
import { AuReferencePage } from './au-reference-page';
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18483108780';
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || '';
// Helper to push conversion to Google Ads and GA4
function triggerConversionEvents(trade: string) {
    // 1. GA4 custom lead event
    trackEvent('generate_lead', {
        currency: 'AUD',
        value: 150.0,
        page_location: '/au',
        lead_source: 'au_demo_form',
        trade_type: trade,
    });
    // 2. Google Ads conversion if gtag is loaded
    if (typeof window !== 'undefined') {
        const w = window as unknown as {
            gtag?: (...args: unknown[]) => void;
            dataLayer?: unknown[];
        };
        if (typeof w.gtag === 'function') {
            const sendTo = GOOGLE_ADS_CONVERSION_LABEL
                ? `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`
                : GOOGLE_ADS_ID;
            w.gtag('event', 'conversion', {
                send_to: sendTo,
                value: 150.0,
                currency: 'AUD',
            });
        }
    }
}
export default function AustralianLandingPage({ activeCategory }: {
    activeCategory?: string;
} = {}) {
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        businessName: '',
        trade: 'Plumbing',
        teamSize: '2-5 crew',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [leadRef, setLeadRef] = useState('');
    // Instant demo launching state
    const [isLaunchingDemo, setIsLaunchingDemo] = useState(false);
    // Active step in 5-step flow
    // FAQ Accordion open states
    React.useEffect(() => {
        if (!activeCategory)
            return;
        if (activeCategory === 'ai-receptionist' || activeCategory === 'tradie-ai') {
            const el = document.getElementById('ai-section');
            if (el)
                el.scrollIntoView({ behavior: 'smooth' });
        }
        else if (activeCategory === 'repeat-jobs' ||
            activeCategory === 'recurring-jobs' ||
            activeCategory === 'field-service' ||
            activeCategory === 'tradie-software') {
            const el = document.getElementById('features');
            if (el)
                el.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeCategory]);
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/au/demo-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit demo request.');
            }
            setIsSubmitted(true);
            setLeadRef(data.leadRef || 'AU-DEMO');
            triggerConversionEvents(formData.trade);
        }
        catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setErrorMessage(msg);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleLaunchInstantDemo = async () => {
        setIsLaunchingDemo(true);
        trackEvent('demo_login_click', {
            currency: 'AUD',
            location: 'au_landing_hero',
        });
        try {
            const res = await fetch('/api/demo-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok && data.user) {
                window.location.href = '/dashboard';
            }
            else {
                window.location.href = '/login?demo=1';
            }
        }
        catch {
            window.location.href = '/login?demo=1';
        }
        finally {
            setIsLaunchingDemo(false);
        }
    };
    return <AuReferencePage onLaunchDemo={handleLaunchInstantDemo} launchingDemo={isLaunchingDemo}>
      <section id="book-demo" className="py-20 lg:py-28 bg-gradient-to-b from-emerald-50/70 via-teal-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950 border-t border-emerald-200/60 dark:border-slate-800 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 border border-emerald-200 dark:border-emerald-900/60 shadow-2xl relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400"/>

            <div className="max-w-2xl mx-auto text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                YOUR BUSINESS. YOUR WALKTHROUGH.
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3 mb-2">
                Book your Fieseros demo
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                See how your enquiries, jobs and payments can work together. Get a personalised walkthrough for your trade and team.
              </p>
            </div>

            {isSubmitted ? (<div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="w-8 h-8"/>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">You&rsquo;re all set!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Thanks for booking with Fieseros Australia. Your demo request ref is{' '}
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{leadRef}</span>.
                  Our team will contact you shortly.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button onClick={handleLaunchInstantDemo} disabled={isLaunchingDemo} className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all">
                    {isLaunchingDemo ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4 fill-current"/>}
                    Launch Instant Demo Sandbox Now
                  </button>
                  <button onClick={() => setIsSubmitted(false)} className="text-xs text-slate-500 hover:text-slate-700 underline">
                    Submit another request
                  </button>
                </div>
              </div>) : (<form onSubmit={handleFormSubmit} className="space-y-5">
                {errorMessage && (<div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <BadgeAlert className="w-4 h-4 shrink-0"/>
                    <span>{errorMessage}</span>
                  </div>)}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="au-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input type="text" required placeholder="e.g. Dave Miller" id="au-name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label htmlFor="au-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Work Email *
                    </label>
                    <input type="email" required placeholder="dave@millerplumbing.com.au" id="au-email" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                  </div>

                  {/* Mobile Phone */}
                  <div>
                    <label htmlFor="au-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Mobile Number
                    </label>
                    <input type="tel" placeholder="0412 345 678" id="au-phone" name="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label htmlFor="au-businessName" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Business Name
                    </label>
                    <input type="text" placeholder="Miller Plumbing & Gas" id="au-businessName" name="businessName" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                  </div>

                  {/* Primary Trade */}
                  <div>
                    <label htmlFor="au-trade" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Primary Trade
                    </label>
                    <select id="au-trade" name="trade" value={formData.trade} onChange={(e) => setFormData({ ...formData, trade: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="Plumbing">Plumbing & Gas</option>
                      <option value="Electrical">Electrical & Sparky</option>
                      <option value="HVAC">HVAC & Air Conditioning</option>
                      <option value="Landscaping">Landscaping & Gardening</option>
                      <option value="Cleaning">Cleaning & Facilities</option>
                      <option value="Roofing">Roofing & Guttering</option>
                      <option value="Handyman">Handyman & Carpentry</option>
                      <option value="Other">Other Trade</option>
                    </select>
                  </div>

                  {/* Team Size */}
                  <div>
                    <label htmlFor="au-teamSize" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Team Size
                    </label>
                    <select id="au-teamSize" name="teamSize" value={formData.teamSize} onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="Solo (1)">Solo (Just me on the tools)</option>
                      <option value="2-5 crew">2 to 5 crew members</option>
                      <option value="6-15 crew">6 to 15 crew members</option>
                      <option value="16+ crew">16+ crew (Commercial / Enterprise)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 text-base font-bold px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70">
                    {isSubmitting ? (<>
                        <Loader2 className="w-5 h-5 animate-spin"/>
                        Booking your demo...
                      </>) : (<>
                        Book my demo
                        <ArrowRight className="w-5 h-5"/>
                      </>)}
                  </button>
                </div>

                {/* Trust bar under form */}
                <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600"/>
                    No credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600"/>
                    Instant sandbox demo access
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600"/>
                    A walkthrough for your business
                  </span>
                </div>
              </form>)}
          </div>
        </div>
      </section>


    </AuReferencePage>;
}
