'use client';

import { useState } from 'react';
import {
  Sparkles, Wand2, Send, Eye, Copy, Megaphone,
  Users, MessageSquare, ArrowRight, CheckCircle2, Loader2,
  Clock, BarChart3, Target, Lightbulb, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeneratedCampaign {
  name: string;
  type: string;
  audience: string;
  templates: string[];
  cta: string;
  followUpSequence: string[];
  estimatedReach: number;
  tips: string[];
}

// ─── Campaign Templates ─────────────────────────────────────────────────────

const CAMPAIGN_TEMPLATES: Record<string, { label: string; description: string; icon: React.ElementType }> = {
  promotional: { label: 'Promotional', description: 'Discounts, offers, and special deals', icon: Megaphone },
  transactional: { label: 'Transactional', description: 'Order updates, confirmations, receipts', icon: CheckCircle2 },
  reminder: { label: 'Reminder', description: 'Appointments, renewals, follow-ups', icon: Clock },
  reactivation: { label: 'Win-Back', description: 'Re-engage inactive customers', icon: RefreshCw },
  announcement: { label: 'Announcement', description: 'New services, features, or updates', icon: Target },
};

const EXAMPLE_PROMPTS = [
  'Create a spring cleaning promotion for past customers',
  'Plumbing seasonal health check offer',
  'Win-back customers inactive for 30+ days',
  'New deep cleaning service launch announcement',
  'Appointment reminder with reschedule option',
  'Thank you message after service completion',
];

// ─── Mock AI Generation ────────────────────────────────────────────────────

function generateMockCampaign(prompt: string, type: string): GeneratedCampaign {
  const keyword = prompt.toLowerCase();
  const typeLabel = CAMPAIGN_TEMPLATES[type]?.label || 'Promotional';

  if (keyword.includes('clean')) {
    return {
      name: 'Spring Deep Cleaning Special', type, audience: 'All customers who booked cleaning in the last 6 months',
      templates: [
        '🧹 Spring is here! Get 20% off our Deep Cleaning service this month. Book now and let us make your home sparkle! ✨',
        'Don\'t miss our Spring Cleaning Special! 🌸 20% off all deep cleaning services. Limited spots available!',
        'Your home deserves a fresh start this spring! 🏡 Book our Deep Cleaning service and save 20%. Reply YES to schedule.',
      ],
      cta: 'Book Now - 20% Off', followUpSequence: [
        'Day 2: Reminder - "Still thinking about spring cleaning? Your 20% discount expires in 5 days!"',
        'Day 5: Urgency - "Last chance! Only 2 days left for your 20% spring cleaning discount"',
        'Day 7: Final - "Your spring cleaning offer has expired, but we still have availability. Book at regular price."',
      ],
      estimatedReach: 450, tips: ['Best send time: 9-11 AM on weekdays', 'Include before/after photos for 3x engagement', 'Add a satisfaction guarantee badge'],
    };
  } else if (keyword.includes('plumb')) {
    return {
      name: 'Plumbing Health Check Campaign', type, audience: 'Homeowners who haven\'t had a plumbing check in 12+ months',
      templates: [
        '🔧 Is your plumbing ready for the season? Book a comprehensive health check for just $79 (reg. $120)!',
        'Don\'t wait for a plumbing emergency! 🔧 Get a full health check and prevent costly repairs. 35% off this week!',
        'Protect your home! 🏠 Our plumbing health check catches issues before they become expensive problems. Save 35% today.',
      ],
      cta: 'Schedule Check-up - Save 35%', followUpSequence: [
        'Day 3: Value prop - "A $79 check-up can save you $1000s in emergency repairs"',
        'Day 7: Social proof - "Over 500 homeowners trust our plumbing health checks"',
        'Day 10: Final nudge - "Last week for the 35% discount on plumbing health checks"',
      ],
      estimatedReach: 280, tips: ['Emphasize prevention over repair', 'Include customer testimonial', 'Offer free estimate as alternative CTA'],
    };
  } else if (keyword.includes('win-back') || keyword.includes('inactive') || keyword.includes('reactivat')) {
    return {
      name: 'We Miss You! Come Back Campaign', type, audience: 'Customers inactive for 30+ days',
      templates: [
        'We miss you! 😊 Here\'s 25% off your next booking - because you\'re our valued customer. Use code: COMEBACK25',
        'It\'s been a while! 🌟 We\'d love to serve you again. Enjoy 25% off your next service. Code: COMEBACK25',
        'Your home misses our touch! 💫 Come back and save 25% on any service. Reply BOOK to schedule. Code: COMEBACK25',
      ],
      cta: 'Claim 25% Off', followUpSequence: [
        'Day 3: "Still thinking? Your COMEBACK25 code is waiting!"',
        'Day 7: "Last chance - 25% off expires in 48 hours"',
        'Day 10: "We\'ve reserved a special spot for you this week"',
      ],
      estimatedReach: 180, tips: ['Personalize with last service type', 'Mention their preferred time slot if known', 'Keep tone warm and non-pushy'],
    };
  } else if (keyword.includes('remind') || keyword.includes('appointment')) {
    return {
      name: 'Smart Appointment Reminder', type, audience: 'Customers with upcoming appointments',
      templates: [
        'Hi {{name}}! 👋 Your {{service}} appointment is tomorrow at {{time}}. Reply CONFIRM to confirm or RESCHEDULE to pick a new time.',
        'Reminder: Your {{service}} booking is in 24 hours! ⏰ Address: {{address}}. Need to change? Reply RESCHEDULE.',
        'Your {{service}} appointment is confirmed for tomorrow! ✅ Our team will arrive at {{time}}. Reply HELP for assistance.',
      ],
      cta: 'Confirm Appointment', followUpSequence: [
        '2h before: "Your technician {{agent}} is on the way! ETA: {{eta}}"',
        'After service: "How was your experience? Rate us 1-5 ⭐"',
        'Day 3: "Book your next {{service}} and save 10% with code: NEXT10"',
      ],
      estimatedReach: 45, tips: ['Always include reschedule option', 'Send 24h and 2h before reminders', 'Include technician name for trust'],
    };
  }

  return {
    name: `${typeLabel} Campaign - ${prompt.slice(0, 30)}`, type, audience: 'Targeted audience based on your description',
    templates: [
      '🎉 We have a special offer just for you! Get 15% off your next service booking. Use code: SPECIAL15',
      'Don\'t miss out! 🎉 15% off all services this month. Your loyalty deserves a reward!',
      'As a valued customer, enjoy 15% off your next booking! 🌟 Code: SPECIAL15. Valid till end of month.',
    ],
    cta: 'Claim 15% Discount', followUpSequence: [
      'Day 2: Reminder about the offer',
      'Day 5: Last chance reminder',
      'Day 7: Offer expired, regular pricing message',
    ],
    estimatedReach: 650, tips: ['A/B test different message versions', 'Include clear call-to-action', 'Keep messages under 160 characters when possible'],
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AiCampaignGeneratorView() {
  const [prompt, setPrompt] = useState('');
  const [campaignType, setCampaignType] = useState('promotional');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCampaign | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Please describe your campaign'); return; }
    setLoading(true);
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 1800));
    const campaign = generateMockCampaign(prompt, campaignType);
    setGenerated(campaign);
    setLoading(false);
    toast.success('Campaign generated!');
  };

  const handleCreateCampaign = () => {
    toast.success('Campaign created from AI output! Redirecting to campaigns...');
  };

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleRegenerate = () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const campaign = generateMockCampaign(prompt + ' ' + Date.now(), campaignType);
      setGenerated(campaign);
      setLoading(false);
      toast.success('Campaign regenerated!');
    }, 1200);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Wand2 className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Campaign Generator</h2>
            <p className="text-sm text-muted-foreground">Generate WhatsApp campaigns with AI in seconds</p>
          </div>
        </div>
        {generated && (
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateCampaign}>
            <Megaphone className="size-4 mr-1.5" /> Use This Campaign
          </Button>
        )}
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium mb-1">Describe your campaign</h3>
                <p className="text-sm text-muted-foreground">Tell AI what kind of campaign you want to create</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    placeholder="e.g., Create a cleaning promotion for spring season targeting past customers..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 h-auto px-6"
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                >
                  {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="size-4 mr-2" /> Generate</>}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Campaign Type</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_TEMPLATES).map(([key, tmpl]) => {
                    const Icon = tmpl.icon;
                    return <SelectItem key={key} value={key}><span className="flex items-center gap-2"><Icon className="size-3.5" />{tmpl.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
              {CAMPAIGN_TEMPLATES[campaignType] && (
                <p className="text-[10px] text-muted-foreground">{CAMPAIGN_TEMPLATES[campaignType].description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map(example => (
              <button
                key={example}
                className="text-xs px-3 py-1.5 rounded-full border hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                onClick={() => setPrompt(example)}
              >
                {example.length > 45 ? example.slice(0, 45) + '...' : example}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="size-8 mx-auto text-emerald-600 animate-spin mb-3" />
            <p className="font-medium">AI is crafting your campaign...</p>
            <p className="text-sm text-muted-foreground mt-1">Analyzing audience, writing templates, and building follow-up sequences</p>
          </CardContent>
        </Card>
      )}

      {/* Generated Campaign */}
      {generated && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-600" />
              <h3 className="font-semibold">Generated Campaign</h3>
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">AI Generated</Badge>
              <Badge variant="outline" className="text-[10px]">{CAMPAIGN_TEMPLATES[generated.type]?.label || generated.type}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleRegenerate}>
                <RefreshCw className="size-3 mr-1" /> Regenerate
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={handleCreateCampaign}>
                <Megaphone className="size-3 mr-1" /> Use This Campaign
              </Button>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Campaign Details */}
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Campaign Details</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Campaign Name</Label>
                  <p className="font-medium text-sm">{generated.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Target Audience</Label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users className="size-3.5 text-emerald-600" />
                    <p className="text-sm">{generated.audience}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CTA Button</Label>
                  <div className="mt-0.5">
                    <Badge className="bg-emerald-600 text-white text-xs">{generated.cta}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estimated Reach</Label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <BarChart3 className="size-3.5 text-blue-600" />
                    <p className="font-medium text-sm">{generated.estimatedReach.toLocaleString()} contacts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Templates */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Message Templates</CardTitle>
                  <Badge variant="secondary" className="text-[9px]">{generated.templates.length} variants</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {generated.templates.map((template, i) => (
                  <div
                    key={i}
                    className={cn(
                      'relative p-3 rounded-lg border cursor-pointer transition-all',
                      selectedTemplateIdx === i ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200' : 'bg-muted/30 hover:bg-muted/50'
                    )}
                    onClick={() => setSelectedTemplateIdx(i)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-[9px]">Template {i + 1}</Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleCopyTemplate(template); }}>
                        <Copy className="size-3" />
                      </Button>
                    </div>
                    <p className="text-sm pr-8">{template}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Follow-up Sequence */}
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Follow-up Sequence</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {generated.followUpSequence.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="size-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                        {i < generated.followUpSequence.length - 1 && <div className="w-px h-6 bg-emerald-200 my-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-amber-500" />
                  <CardTitle className="text-sm">AI Tips</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {generated.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                      <CheckCircle2 className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* WhatsApp Preview */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="size-4 text-emerald-600" />
                  WhatsApp Message Preview
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="size-3 mr-1" /> {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
            </CardHeader>
            {showPreview && (
              <CardContent className="p-4 pt-0">
                <div className="max-w-sm mx-auto">
                  {/* Phone frame */}
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-3">
                    {/* Chat header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="size-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">SF</div>
                      <div>
                        <p className="text-xs font-medium">ServiceOS</p>
                        <p className="text-[10px] text-muted-foreground">Business Account</p>
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="space-y-2 min-h-[120px]">
                      {/* Incoming business message */}
                      <div className="max-w-[90%]">
                        <div className="bg-white dark:bg-slate-700 rounded-lg rounded-tl-none p-3 border text-sm shadow-sm">
                          <p>{generated.templates[selectedTemplateIdx]}</p>
                          {generated.cta && (
                            <div className="mt-2 pt-2 border-t">
                              <button className="w-full py-1.5 bg-emerald-600 text-white rounded text-xs font-medium">{generated.cta}</button>
                            </div>
                          )}
                          <p className="text-[9px] text-muted-foreground text-right mt-1">10:30 AM ✓✓</p>
                        </div>
                      </div>
                      {/* User reply simulation */}
                      <div className="max-w-[70%] ml-auto">
                        <div className="bg-emerald-600 text-white rounded-lg rounded-tr-none p-2.5 text-sm shadow-sm">
                          <p>Yes, I'd like to book!</p>
                          <p className="text-[9px] text-emerald-100 text-right mt-1">10:31 AM ✓✓</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
