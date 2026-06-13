'use client';

import { useState } from 'react';
import {
  Palette, Upload, Eye, RotateCcw, ExternalLink, Plus, Trash2,
  Globe, Mail, MessageSquare, CheckCircle2, XCircle, Clock, Save,
  Monitor, Smartphone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────
interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  body: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  status: 'active' | 'draft';
  lastModified: string;
}

interface DNSRecord {
  type: string;
  host: string;
  value: string;
  verified: boolean;
}

// ─── Mock Data ──────────────────────────────────────────────────────
const initialWhatsAppTemplates: WhatsAppTemplate[] = [
  { id: 'wt1', name: 'appointment_confirmation', language: 'en', status: 'approved', body: 'Hi {{1}}, your appointment is confirmed for {{2}}.' },
  { id: 'wt2', name: 'service_reminder', language: 'en', status: 'approved', body: 'Reminder: Your service with {{1}} is scheduled for {{2}}.' },
  { id: 'wt3', name: 'payment_receipt', language: 'en', status: 'pending', body: 'Payment of ₹{{1}} received. Thank you, {{2}}!' },
  { id: 'wt4', name: 'feedback_request', language: 'hi', status: 'approved', body: 'Hi {{1}}, how was your experience? Rate us here: {{2}}' },
];

const initialEmailTemplates: EmailTemplate[] = [
  { id: 'et1', name: 'Welcome Email', subject: 'Welcome to {{company_name}}!', status: 'active', lastModified: 'Mar 10, 2024' },
  { id: 'et2', name: 'Appointment Reminder', subject: 'Your upcoming appointment on {{date}}', status: 'active', lastModified: 'Mar 8, 2024' },
  { id: 'et3', name: 'Invoice Generated', subject: 'Invoice #{{invoice_number}} from {{company_name}}', status: 'active', lastModified: 'Feb 28, 2024' },
  { id: 'et4', name: 'Service Completion', subject: 'Thank you for choosing {{company_name}}', status: 'draft', lastModified: 'Feb 15, 2024' },
];

const dnsRecords: DNSRecord[] = [
  { type: 'CNAME', host: 'app', value: 'cname.serviceos.io', verified: true },
  { type: 'TXT', host: '@', value: 'serviceos-verification=abc123def456', verified: true },
  { type: 'CNAME', host: 'portal', value: 'cname.serviceos.io', verified: false },
];

// ─── Main Component ─────────────────────────────────────────────────
export function WhiteLabelView() {
  const [companyName, setCompanyName] = useState('Acme Services');
  const [tagline, setTagline] = useState('Premium Home Services');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [whatsappTemplates, setWhatsappTemplates] = useState(initialWhatsAppTemplates);
  const [emailTemplates] = useState(initialEmailTemplates);
  const [domain, setDomain] = useState('app.acmeservices.com');

  const handleResetDefaults = () => {
    setCompanyName('Acme Services');
    setTagline('Premium Home Services');
    setPrimaryColor('#10b981');
    setAccentColor('#f59e0b');
    setBgColor('#ffffff');
    setDomain('app.acmeservices.com');
  };

  const addWhatsAppTemplate = () => {
    const newTemplate: WhatsAppTemplate = {
      id: `wt${whatsappTemplates.length + 1}`,
      name: `custom_template_${whatsappTemplates.length + 1}`,
      language: 'en',
      status: 'pending',
      body: 'Hello {{1}}, this is a custom message from {{2}}.',
    };
    setWhatsappTemplates([...whatsappTemplates, newTemplate]);
  };

  const removeWhatsAppTemplate = (id: string) => {
    setWhatsappTemplates(whatsappTemplates.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-50"><Palette className="size-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-xl font-bold">White Label Settings</h1>
          <p className="text-sm text-muted-foreground">Customize your branded portal experience</p>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="branding" className="text-xs gap-1"><Palette className="size-3" />Branding</TabsTrigger>
          <TabsTrigger value="colors" className="text-xs gap-1"><Palette className="size-3" />Colors</TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs gap-1"><MessageSquare className="size-3" />WhatsApp</TabsTrigger>
          <TabsTrigger value="email" className="text-xs gap-1"><Mail className="size-3" />Email</TabsTrigger>
          <TabsTrigger value="domain" className="text-xs gap-1"><Globe className="size-3" />Domain</TabsTrigger>
        </TabsList>

        {/* ── Branding Tab ──────────────────────────────────────────── */}
        <TabsContent value="branding" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branding Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Brand Identity</CardTitle>
                <CardDescription>Configure your company&apos;s visual identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company Logo</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer">
                    <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG up to 2MB · Recommended 200×60px</p>
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium" htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Your Company Name"
                    className="h-9"
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium" htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="Your tagline"
                    className="h-9"
                  />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1 flex-1" size="sm">
                    <Save className="size-4" />Save Changes
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleResetDefaults}>
                    <RotateCcw className="size-4" />Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Live Preview</CardTitle>
                    <CardDescription>See how your portal will look</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                    <ExternalLink className="size-3" />Preview in New Tab
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  {/* Browser Chrome */}
                  <div className="bg-slate-100 px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-red-400" />
                      <div className="size-2.5 rounded-full bg-amber-400" />
                      <div className="size-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 flex items-center gap-1 ml-2">
                      <Monitor className="size-3 text-muted-foreground" />
                      <div className="bg-white rounded px-2 py-0.5 text-[10px] text-muted-foreground flex-1 truncate">
                        https://{domain}
                      </div>
                    </div>
                  </div>

                  {/* Preview Content - Desktop */}
                  <div className="bg-white" style={{ backgroundColor: bgColor }}>
                    {/* Nav */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">{companyName.charAt(0)}</span>
                        </div>
                        <span className="text-white text-sm font-semibold">{companyName}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-white/80 text-[10px]">Dashboard</span>
                        <span className="text-white/80 text-[10px]">Bookings</span>
                        <span className="text-white/80 text-[10px]">Support</span>
                      </div>
                    </div>

                    {/* Hero */}
                    <div className="p-6 text-center">
                      <h2 className="text-lg font-bold" style={{ color: primaryColor }}>Welcome to {companyName}</h2>
                      <p className="text-xs text-muted-foreground mt-1">{tagline}</p>
                      <div className="flex justify-center gap-2 mt-4">
                        <button
                          className="px-4 py-1.5 rounded-md text-white text-[10px] font-medium"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Book Service
                        </button>
                        <button
                          className="px-4 py-1.5 rounded-md text-[10px] font-medium border"
                          style={{ borderColor: accentColor, color: accentColor }}
                        >
                          Track Order
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                      {['Schedule', 'Pay Bill', 'Contact'].map(label => (
                        <div key={label} className="border rounded-md p-2 text-center">
                          <div className="size-5 rounded-full mx-auto mb-1" style={{ backgroundColor: `${accentColor}20` }}>
                            <Smartphone className="size-3 mx-auto mt-1" style={{ color: accentColor }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Colors Tab ────────────────────────────────────────────── */}
        <TabsContent value="colors" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Color Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Color Customization</CardTitle>
                <CardDescription>Define your brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 rounded-md border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="h-9 font-mono text-sm flex-1"
                    />
                    <div className="h-10 w-10 rounded-lg border" style={{ backgroundColor: primaryColor }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      className="h-10 w-14 rounded-md border cursor-pointer"
                    />
                    <Input
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      className="h-9 font-mono text-sm flex-1"
                    />
                    <div className="h-10 w-10 rounded-lg border" style={{ backgroundColor: accentColor }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Background Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="h-10 w-14 rounded-md border cursor-pointer"
                    />
                    <Input
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                      className="h-9 font-mono text-sm flex-1"
                    />
                    <div className="h-10 w-10 rounded-lg border" style={{ backgroundColor: bgColor }} />
                  </div>
                </div>

                {/* Color Palette Presets */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Presets</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: 'Emerald', primary: '#10b981', accent: '#f59e0b', bg: '#ffffff' },
                      { name: 'Ocean', primary: '#0ea5e9', accent: '#8b5cf6', bg: '#f8fafc' },
                      { name: 'Sunset', primary: '#f97316', accent: '#ec4899', bg: '#fffbeb' },
                      { name: 'Forest', primary: '#16a34a', accent: '#ca8a04', bg: '#f0fdf4' },
                    ].map(preset => (
                      <button
                        key={preset.name}
                        className="border rounded-lg p-2 hover:shadow-md transition-shadow text-center"
                        onClick={() => {
                          setPrimaryColor(preset.primary);
                          setAccentColor(preset.accent);
                          setBgColor(preset.bg);
                        }}
                      >
                        <div className="flex gap-0.5 mb-1 justify-center">
                          <div className="size-4 rounded-sm" style={{ backgroundColor: preset.primary }} />
                          <div className="size-4 rounded-sm" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1 flex-1" size="sm">
                    <Save className="size-4" />Save Colors
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleResetDefaults}>
                    <RotateCcw className="size-4" />Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Color Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Color Preview</CardTitle>
                <CardDescription>Live preview of your color scheme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Buttons Preview */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Buttons</p>
                    <div className="flex gap-2 flex-wrap">
                      <button className="px-4 py-2 rounded-md text-white text-sm font-medium" style={{ backgroundColor: primaryColor }}>
                        Primary Action
                      </button>
                      <button className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: primaryColor, color: primaryColor }}>
                        Secondary
                      </button>
                      <button className="px-4 py-2 rounded-md text-white text-sm font-medium" style={{ backgroundColor: accentColor }}>
                        Accent Action
                      </button>
                    </div>
                  </div>

                  {/* Card Preview */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Cards</p>
                    <div className="border rounded-lg p-4" style={{ backgroundColor: bgColor }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-16 rounded-full" style={{ backgroundColor: primaryColor }} />
                        <div className="h-2 w-8 rounded-full bg-slate-200" />
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 mb-1" />
                      <div className="h-2 w-3/4 rounded-full bg-slate-100" />
                    </div>
                  </div>

                  {/* Text Preview */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Typography</p>
                    <div className="space-y-1">
                      <p className="text-lg font-bold" style={{ color: primaryColor }}>Heading in Primary Color</p>
                      <p className="text-sm text-muted-foreground">Regular body text color</p>
                      <p className="text-sm font-medium" style={{ color: accentColor }}>Accent highlighted text</p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Status Indicators</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="text-[10px]" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>Active</Badge>
                      <Badge className="text-[10px]" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>Pending</Badge>
                      <Badge className="text-[10px] bg-red-100 text-red-700">Error</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── WhatsApp Templates Tab ────────────────────────────────── */}
        <TabsContent value="whatsapp" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">WhatsApp Message Templates</CardTitle>
                  <CardDescription>Manage your custom WhatsApp templates</CardDescription>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={addWhatsAppTemplate}>
                  <Plus className="size-4" />Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {whatsappTemplates.map(template => (
                  <div key={template.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <MessageSquare className="size-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{template.name}</p>
                          <Badge variant="outline" className="text-[9px]">{template.language.toUpperCase()}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{template.body}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cn(
                        'text-[10px]',
                        template.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        template.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700',
                      )}>
                        {template.status === 'approved' ? <CheckCircle2 className="size-3 mr-0.5" /> :
                         template.status === 'pending' ? <Clock className="size-3 mr-0.5" /> :
                         <XCircle className="size-3 mr-0.5" />}
                        {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="size-3.5" onClick={() => removeWhatsAppTemplate(template.id)} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Templates Tab ───────────────────────────────────── */}
        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Email Templates</CardTitle>
                  <CardDescription>Customize your transactional and marketing emails</CardDescription>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                  <Plus className="size-4" />Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {emailTemplates.map(template => (
                  <div key={template.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Mail className="size-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{template.name}</p>
                          <Badge className={cn(
                            'text-[10px]',
                            template.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
                          )}>
                            {template.status === 'active' ? <CheckCircle2 className="size-3 mr-0.5" /> : <Clock className="size-3 mr-0.5" />}
                            {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{template.subject}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Last modified: {template.lastModified}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Eye className="size-3" />Preview
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Domain Tab ────────────────────────────────────────────── */}
        <TabsContent value="domain" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Domain</CardTitle>
                <CardDescription>Connect your own domain for the customer portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium" htmlFor="domain">Domain Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="domain"
                      value={domain}
                      onChange={e => setDomain(e.target.value)}
                      placeholder="app.yourcompany.com"
                      className="h-9 flex-1"
                    />
                    <Button size="sm" variant="outline" className="gap-1 h-9">
                      <Globe className="size-4" />Verify
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">DNS Records</Label>
                  <p className="text-xs text-muted-foreground mb-3">Add these DNS records to your domain provider</p>
                  <div className="space-y-2">
                    {dnsRecords.map((record, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] w-14 justify-center shrink-0">{record.type}</Badge>
                          <div>
                            <p className="text-sm font-medium">{record.host}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{record.value}</p>
                          </div>
                        </div>
                        <Badge className={cn(
                          'text-[10px] shrink-0',
                          record.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                        )}>
                          {record.verified ? <CheckCircle2 className="size-3 mr-0.5" /> : <Clock className="size-3 mr-0.5" />}
                          {record.verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1 flex-1" size="sm">
                    <Save className="size-4" />Save Domain
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <RotateCcw className="size-4" />Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Domain Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Domain Status</CardTitle>
                <CardDescription>Current domain configuration overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-emerald-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">SSL Certificate</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Active &middot; Auto-renewed &middot; Expires Dec 2024</p>
                </div>

                <div className="p-4 rounded-lg border bg-emerald-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Primary Domain</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{domain} &middot; Active</p>
                </div>

                <div className="p-4 rounded-lg border bg-amber-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="size-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">Subdomain</span>
                  </div>
                  <p className="text-xs text-muted-foreground">portal.{domain.split('.').slice(1).join('.')} &middot; DNS verification pending</p>
                </div>

                <Separator />

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Default ServiceOS domain is also active:</p>
                  <code className="text-xs bg-slate-100 px-3 py-1.5 rounded-md font-mono">acme-services.serviceos.app</code>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
