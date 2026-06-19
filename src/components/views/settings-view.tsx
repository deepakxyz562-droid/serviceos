'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users as UsersIcon,
  Shield,
  Plug,
  CreditCard,
  Globe,
  KeyRound,
  Bell,
  Zap,
  Plus,
  Trash2,
  TestTube2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
  Copy,
  Download,
  Link2,
  Eye,
  EyeOff,
  FileCode,
  Phone,
  MessageCircle,
  Save,
  Mail,
  MapPin,
  UserPlus,
  MoreHorizontal,
  ExternalLink,
  Check,
  Crown,

  Sparkles,
  Pencil,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { CURRENCIES as SHARED_CURRENCIES } from '@/lib/currency';
import { invalidateCurrencyCache } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/api';

// ─── Event Webhook Types ──────────────────────────────────────────────────

interface EventWebhook {
  id: string;
  name: string;
  event: string;
  url: string;
  method: string;
  headersJson: string;
  active: boolean;
  retryOnFail: boolean;
  maxRetries: number;
  timeoutMs: number;
  lastTriggered: string | null;
  lastStatus: string | null;
  lastError: string | null;
  failCount: number;
  workspaceId: string | null;
  createdAt: string;
}

interface EventType {
  value: string;
  label: string;
  description: string;
  icon: string;
}

// ─── WordPress Integration Types ──────────────────────────────────────────

interface WpEndpointConfig {
  id: string;
  name: string;
  endpointId: string;
  apiKeyPrefix: string;
  source: string;
  active: boolean;
  totalReceived: number;
  lastReceived: string | null;
  lastError: string | null;
  sendWhatsApp: boolean;
  webhookUrl: string;
  apiUrl: string;
  createdAt: string;
  _count?: { logs: number };
}

const EVENT_COLORS: Record<string, string> = {
  'job.created': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'job.assigned': 'bg-teal-100 text-teal-700 border-teal-200',
  'job.accepted': 'bg-sky-100 text-sky-700 border-sky-200',
  'job.started': 'bg-amber-100 text-amber-700 border-amber-200',
  'job.completed': 'bg-green-100 text-green-700 border-green-200',
  'job.cancelled': 'bg-red-100 text-red-700 border-red-200',
  'job.rejected': 'bg-orange-100 text-orange-700 border-orange-200',
};

const WP_FORM_PLUGINS = [
  { name: 'Contact Form 7', slug: 'cf7' },
  { name: 'WPForms', slug: 'wpforms' },
  { name: 'Gravity Forms', slug: 'gravity' },
  { name: 'Fluent Forms', slug: 'fluent' },
  { name: 'Elementor Forms', slug: 'elementor' },
];

const INDUSTRIES = [
  'Home Services',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Cleaning',
  'Landscaping',
  'Pest Control',
  'Roofing',
  'Painting',
  'Moving',
  'Real Estate',
  'Healthcare',
  'Legal',
  'Education',
  'Technology',
  'Other',
];

/**
 * Build the list of industry options to render in the dropdown.
 * Always includes the tenant's current industry value even if it
 * doesn't match one of the canonical INDUSTRIES (e.g. legacy
 * kebab-case values like 'home-services' or 'packers-movers'),
 * so the <Select> doesn't silently render an empty value.
 */
function getIndustryOptions(currentIndustry: string): string[] {
  if (!currentIndustry) return INDUSTRIES;
  const lower = currentIndustry.toLowerCase();
  const exists = INDUSTRIES.some((i) => i.toLowerCase() === lower);
  return exists ? INDUSTRIES : [...INDUSTRIES, currentIndustry];
}

/**
 * Normalize legacy kebab-case industry values to the canonical
 * display form so the dropdown shows a clean value instead of an
 * unknown slug. Falls back to the original value if no mapping exists.
 */
function normalizeIndustry(value: string): string {
  if (!value) return '';
  const map: Record<string, string> = {
    'home-services': 'Home Services',
    'packers-movers': 'Moving',
  };
  return map[value.toLowerCase()] || value;
}

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹) — Indian Rupee' },
  { value: 'USD', label: 'USD ($) — US Dollar' },
  { value: 'EUR', label: 'EUR (€) — Euro' },
  { value: 'GBP', label: 'GBP (£) — British Pound' },
  { value: 'AUD', label: 'AUD (A$) — Australian Dollar' },
  { value: 'CAD', label: 'CAD (C$) — Canadian Dollar' },
  { value: 'SGD', label: 'SGD (S$) — Singapore Dollar' },
  { value: 'AED', label: 'AED (د.إ) — UAE Dirham' },
  { value: 'SAR', label: 'SAR (﷼) — Saudi Riyal' },
  { value: 'ZAR', label: 'ZAR (R) — South African Rand' },
  { value: 'JPY', label: 'JPY (¥) — Japanese Yen' },
  { value: 'CNY', label: 'CNY (¥) — Chinese Yuan' },
  { value: 'MYR', label: 'MYR (RM) — Malaysian Ringgit' },
  { value: 'THB', label: 'THB (฿) — Thai Baht' },
  { value: 'NGN', label: 'NGN (₦) — Nigerian Naira' },
  { value: 'BRL', label: 'BRL (R$) — Brazilian Real' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsView() {
  const { darkMode, toggleDarkMode } = useAppStore();

  // ─── Company Profile State ─────────────────────────────────────────────
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState<string>('');
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    currency: 'INR',
    phone: '',
    email: '',
    whatsappPhone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  });
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [executionAlerts, setExecutionAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(true);

  // Event webhooks state
  const [webhooks, setWebhooks] = useState<EventWebhook[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    event: 'job.created',
    url: '',
    method: 'POST',
    active: true,
  });

  // ─── WordPress Integration State ─────────────────────────────────────────
  const [wpEndpoints, setWpEndpoints] = useState<WpEndpointConfig[]>([]);
  const [wpLoading, setWpLoading] = useState(true);
  const [wpGenerating, setWpGenerating] = useState(false);
  const [wpNewConfig, setWpNewConfig] = useState<{
    api_url: string;
    api_key: string;
    webhook_url: string;
    endpoint_id: string;
  } | null>(null);
  const [wpTesting, setWpTesting] = useState(false);
  const [wpShowApiKey, setWpShowApiKey] = useState(false);

  // ─── WhatsApp Business Phone State ─────────────────────────────────────
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappPhoneSaving, setWhatsappPhoneSaving] = useState(false);
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [ownerTemplate, setOwnerTemplate] = useState('🎯 New Lead from Website!\n\nName: {{name}}\nPhone: {{phone}}\nEmail: {{email}}\nService: {{serviceType}}\nMessage: {{description}}\n\nFollow up promptly!');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [customerTemplate, setCustomerTemplate] = useState('Thank you for contacting us, {{name}}! 🙏\n\nWe have received your inquiry about {{serviceType}}. Our team will contact you shortly.\n\n— {{companyName}}');
  const [whatsappSettingsSaving, setWhatsappSettingsSaving] = useState(false);
  const [editingFieldMapping, setEditingFieldMapping] = useState(false);

  // ─── Users State ──────────────────────────────────────────────────────
  const [users, setUsers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  }>>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'agent' });
  const [inviting, setInviting] = useState(false);

  // ─── Roles State ──────────────────────────────────────────────────────
  const [roles] = useState([
    { id: 'owner', name: 'Owner', description: 'Full access to all features and settings', users: 1, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 'admin', name: 'Admin', description: 'Manage users, settings, and all operations', users: 0, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { id: 'manager', name: 'Manager', description: 'Manage jobs, leads, and team operations', users: 0, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'agent', name: 'Agent', description: 'Handle assigned jobs and leads', users: 0, color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { id: 'viewer', name: 'Viewer', description: 'Read-only access to dashboards and reports', users: 0, color: 'bg-slate-100 text-slate-600 border-slate-200' },
  ]);



  // ─── Billing State ────────────────────────────────────────────────────
  const [billingPlan, setBillingPlan] = useState('starter');
  const [planStatus, setPlanStatus] = useState('trial');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);



  // ─── Fetch tenant data ──────────────────────────────────────────────────
  const fetchTenantData = useCallback(async () => {
    setTenantLoading(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (authRes.ok) {
        const authData = await authRes.json();
        const tenant = authData.tenant;
        if (tenant) {
          setTenantId(tenant.id);
          setBillingPlan(tenant.plan || 'starter');
          setPlanStatus(tenant.planStatus || 'trial');
          setTrialEndsAt(tenant.trialEndsAt || null);
          setWorkspaceSlug(tenant.slug || '');

          // Parse address if it's a JSON string or a simple string
          let street = '';
          let city = '';
          let state = '';
          let pincode = '';
          let country = tenant.country || '';

          if (tenant.address) {
            try {
              const addr = JSON.parse(tenant.address);
              street = addr.street || '';
              city = addr.city || '';
              state = addr.state || '';
              pincode = addr.pincode || '';
              country = addr.country || country;
            } catch {
              street = tenant.address;
            }
          }

          setCompanyForm({
            name: tenant.name || '',
            industry: normalizeIndustry(tenant.industry || ''),
            currency: tenant.currency || 'INR',
            phone: tenant.phone || '',
            email: tenant.email || '',
            whatsappPhone: tenant.whatsappPhone || '',
            street,
            city,
            state,
            pincode,
            country,
          });

          setWhatsappPhone(tenant.whatsappPhone || '');

          // Load WhatsApp notification settings from settingsJson
          try {
            const settings = tenant.settingsJson ? JSON.parse(tenant.settingsJson) : {};
            if (settings.notifyOwner !== undefined) setNotifyOwner(settings.notifyOwner);
            if (settings.ownerTemplate) setOwnerTemplate(settings.ownerTemplate);
            if (settings.notifyCustomer !== undefined) setNotifyCustomer(settings.notifyCustomer);
            if (settings.customerTemplate) setCustomerTemplate(settings.customerTemplate);
          } catch {}
        }
      }
    } catch {
      // silently fail
    } finally {
      setTenantLoading(false);
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/event-webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
        setEventTypes(data.eventTypes || []);
      }
    } catch {
      // silently fail
    } finally {
      setWebhookLoading(false);
    }
  }, []);

  const fetchWpEndpoints = useCallback(async () => {
    setWpLoading(true);
    try {
      const res = await fetch('/api/wordpress/config');
      if (res.ok) {
        const data = await res.json();
        setWpEndpoints(data.endpoints || []);
      }
    } catch {
      // silently fail
    } finally {
      setWpLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // silently fail
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenantData();
    fetchWebhooks();
    fetchWpEndpoints();
    fetchUsers();
  }, [fetchTenantData, fetchWebhooks, fetchWpEndpoints, fetchUsers]);

  // ─── Save Company Profile ─────────────────────────────────────────────
  const handleSaveCompany = async () => {
    if (!tenantId) {
      toast.error('No tenant found. Complete onboarding first.');
      return;
    }
    setSaving(true);
    try {
      const addressObj = {
        street: companyForm.street,
        city: companyForm.city,
        state: companyForm.state,
        pincode: companyForm.pincode,
        country: companyForm.country,
      };

      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyForm.name,
          industry: companyForm.industry,
          currency: companyForm.currency,
          phone: companyForm.phone,
          email: companyForm.email,
          whatsappPhone: companyForm.whatsappPhone,
          address: JSON.stringify(addressObj),
          country: companyForm.country,
          settingsJson: JSON.stringify({
            emailNotifications,
            executionAlerts,
          }),
        }),
      });
      if (res.ok) {
        invalidateCurrencyCache(); // Currency may have changed – invalidate cache so other views pick up the change
        toast.success('Company profile saved successfully');
        // Re-fetch tenant data so the form reflects the persisted state
        // (also normalizes industry for the dropdown).
        await fetchTenantData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save company profile');
      }
    } catch {
      toast.error('Network error saving company profile');
    } finally {
      setSaving(false);
    }
  };

  // Save WhatsApp phone number
  const handleSaveWhatsappPhone = async () => {
    setWhatsappPhoneSaving(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (!authRes.ok) {
        toast.error('Not authenticated');
        return;
      }
      const authData = await authRes.json();
      const tid = authData.tenant?.id;
      if (!tid) {
        toast.error('No tenant found. Complete onboarding first.');
        return;
      }
      const res = await fetch(`/api/tenants/${tid}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappPhone }),
      });
      if (res.ok) {
        toast.success('WhatsApp business number saved successfully');
      } else {
        toast.error('Failed to save WhatsApp number');
      }
    } catch {
      toast.error('Network error saving WhatsApp number');
    } finally {
      setWhatsappPhoneSaving(false);
    }
  };

  // ─── Save WhatsApp Settings ────────────────────────────────────────────
  const handleSaveWhatsappSettings = async () => {
    setWhatsappSettingsSaving(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (!authRes.ok) { toast.error('Not authenticated'); return; }
      const authData = await authRes.json();
      const tid = authData.tenant?.id;
      if (!tid) { toast.error('No tenant found'); return; }
      const res = await fetch(`/api/tenants/${tid}?XTransformPort=3000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhone,
          settingsJson: JSON.stringify({
            emailNotifications,
            executionAlerts,
            notifyOwner,
            ownerTemplate,
            notifyCustomer,
            customerTemplate,
          }),
        }),
      });
      if (res.ok) { toast.success('WhatsApp notification settings saved'); }
      else { toast.error('Failed to save settings'); }
    } catch { toast.error('Network error'); }
    finally { setWhatsappSettingsSaving(false); }
  };

  // ─── AI Generate Template ──────────────────────────────────────────────
  const handleAiGenerate = async (type: 'owner' | 'customer') => {
    try {
      const res = await fetch('/api/whatsapp/generate-template?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        if (type === 'owner') setOwnerTemplate(data.template);
        else setCustomerTemplate(data.template);
        toast.success('Template generated with AI');
      } else {
        toast.error('Failed to generate template');
      }
    } catch {
      toast.error('AI generation failed');
    }
  };

  // ─── WordPress: Generate & Configure ─────────────────────────────────────
  const handleGenerateWpConfig = async () => {
    setWpGenerating(true);
    try {
      const res = await fetch('/api/wordpress/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'WordPress Lead Capture',
          sendWhatsApp: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWpNewConfig(data.config);
        setWpShowApiKey(true);
        toast.success('WordPress integration configured! Copy your credentials below.');
        fetchWpEndpoints();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to generate config');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setWpGenerating(false);
    }
  };

  // ─── WordPress: Test Connection ──────────────────────────────────────────
  const handleTestWpConnection = async () => {
    if (!wpNewConfig?.api_key) {
      toast.error('Generate a config first');
      return;
    }
    setWpTesting(true);
    try {
      const res = await fetch('/api/wordpress/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: wpNewConfig.api_key }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Connection successful! ServiceOS is ready to receive leads.');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setWpTesting(false);
    }
  };

  // ─── WordPress: Delete Endpoint ──────────────────────────────────────────
  const handleDeleteWpEndpoint = async (id: string) => {
    try {
      const res = await fetch(`/api/wordpress/config?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('WordPress endpoint deleted');
        fetchWpEndpoints();
        if (wpNewConfig && wpEndpoints.find(e => e.id === id)) {
          setWpNewConfig(null);
        }
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ─── Copy helper ─────────────────────────────────────────────────────────
  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label || 'Value'} copied to clipboard`);
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast.error('Name and URL are required');
      return;
    }
    try {
      const res = await fetch('/api/event-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookForm),
      });
      if (res.ok) {
        toast.success('Event webhook created');
        setShowAddWebhook(false);
        setWebhookForm({ name: '', event: 'job.created', url: '', method: 'POST', active: true });
        fetchWebhooks();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create webhook');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/event-webhooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Webhook deleted');
        fetchWebhooks();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleWebhook = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/event-webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        toast.success(active ? 'Webhook enabled' : 'Webhook disabled');
        fetchWebhooks();
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleTestWebhook = async (event: string) => {
    setTestingWebhook(event);
    try {
      const res = await fetch('/api/event-webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      if (data.successCount > 0) {
        toast.success(`Test sent: ${data.successCount} webhook(s) triggered`);
      } else if (data.totalWebhooks === 0) {
        toast.info('No active webhooks configured for this event');
      } else {
        toast.error('All webhooks failed — check the URLs');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setTestingWebhook(null);
    }
  };

  // ─── Invite User ──────────────────────────────────────────────────────
  const handleInviteUser = async () => {
    if (!inviteForm.name || !inviteForm.email) {
      toast.error('Name and email are required');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/users?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        toast.success('User invited successfully');
        setShowInviteUser(false);
        setInviteForm({ name: '', email: '', role: 'agent' });
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to invite user');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setInviting(false);
    }
  };



  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'admin': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'agent': return 'bg-sky-100 text-sky-700 border-sky-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };



  return (
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
          <TabsTrigger value="company" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2">
            <Building2 className="size-4" />
            <span className="hidden sm:inline">Company Profile</span>
            <span className="sm:hidden">Company</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2">
            <UsersIcon className="size-4" />
            <span className="hidden sm:inline">Users</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2">
            <Shield className="size-4" />
            <span className="hidden sm:inline">Roles</span>
            <span className="sm:hidden">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2">
            <Plug className="size-4" />
            <span className="hidden sm:inline">Integrations</span>
            <span className="sm:hidden">Apps</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2">
            <CreditCard className="size-4" />
            <span className="hidden sm:inline">Billing</span>
            <span className="sm:hidden">Bill</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            Company Profile Tab
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="company" className="space-y-6">
          {tenantLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading company profile...
            </div>
          ) : (
            <>
              {/* Company Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Building2 className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Company Information</CardTitle>
                      <CardDescription>Update your company details and contact information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Company Name</Label>
                    <Input
                      placeholder="Your Company Name"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Industry</Label>
                      <Select value={companyForm.industry} onValueChange={(v) => setCompanyForm({ ...companyForm, industry: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {getIndustryOptions(companyForm.industry).map((ind) => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Currency</Label>
                      <Select value={companyForm.currency} onValueChange={(v) => setCompanyForm({ ...companyForm, currency: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Your company currency is used across CRM, dashboard, invoices, quotes, and reports.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Phone className="size-3.5" /> Phone
                      </Label>
                      <Input
                        placeholder="+91 98765 43210"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Mail className="size-3.5" /> Email
                      </Label>
                      <Input
                        type="email"
                        placeholder="company@example.com"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <MessageCircle className="size-3.5" /> WhatsApp Number
                    </Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={companyForm.whatsappPhone}
                      onChange={(e) => setCompanyForm({ ...companyForm, whatsappPhone: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for lead notifications and customer communications
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Business Address */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                      <MapPin className="size-4 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Business Address</CardTitle>
                      <CardDescription>Your company&apos;s physical address</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Street Address</Label>
                    <Input
                      placeholder="123 Main Street, Suite 100"
                      value={companyForm.street}
                      onChange={(e) => setCompanyForm({ ...companyForm, street: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">City</Label>
                      <Input
                        placeholder="Mumbai"
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">State</Label>
                      <Input
                        placeholder="Maharashtra"
                        value={companyForm.state}
                        onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Pincode</Label>
                      <Input
                        placeholder="400001"
                        value={companyForm.pincode}
                        onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preferences */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                      <Bell className="size-4 text-emerald-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Preferences</CardTitle>
                      <CardDescription>Customize your application experience</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Dark Mode</Label>
                      <p className="text-xs text-muted-foreground">Toggle dark mode theme</p>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Get notified about workflow failures and updates</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Execution Alerts</Label>
                      <p className="text-xs text-muted-foreground">Notify when workflow executions finish</p>
                    </div>
                    <Switch checked={executionAlerts} onCheckedChange={setExecutionAlerts} />
                  </div>
                </CardContent>
              </Card>

              {/* Save Changes Button */}
              <div className="flex justify-end">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
                  onClick={handleSaveCompany}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Users Tab
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <UsersIcon className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Team Members</CardTitle>
                    <CardDescription>Manage your team and invite new members</CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={() => setShowInviteUser(true)}
                >
                  <UserPlus className="size-3.5" /> Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2" /> Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UsersIcon className="size-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No team members found</p>
                  <p className="text-xs">Invite users to your workspace</p>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px] max-h-[600px]">
                  <div className="space-y-2 pr-3">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-center size-9 rounded-full bg-muted shrink-0">
                          <span className="text-sm font-medium text-muted-foreground">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm truncate">{user.name}</span>
                            <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} text-[10px] shrink-0 capitalize`}>
                              {user.role}
                            </Badge>
                            {!user.isActive && (
                              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 shrink-0">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          {user.lastLoginAt && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Invite User Dialog */}
          <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Send an invitation to join your workspace</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteUser(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleInviteUser}
                  disabled={!inviteForm.name || !inviteForm.email || inviting}
                >
                  {inviting ? <Loader2 className="size-4 animate-spin mr-1" /> : <UserPlus className="size-4 mr-1" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Roles Tab
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Roles &amp; Permissions</CardTitle>
                  <CardDescription>Define access levels for team members</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0">
                    {role.id === 'owner' ? (
                      <Crown className="size-4 text-amber-600" />
                    ) : (
                      <Shield className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{role.name}</span>
                      <Badge variant="outline" className={`${role.color} text-[10px] shrink-0`}>
                        {role.users} member{role.users !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 text-xs gap-1">
                    Edit Permissions
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                  <Shield className="size-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Permission Matrix</CardTitle>
                  <CardDescription>Overview of permissions by role</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-420px)] min-h-[250px] max-h-[500px]">
                <div className="overflow-x-auto pr-3">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground bg-background">Permission</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Owner</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Admin</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Manager</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Agent</th>
                        <th className="text-center py-2 px-3 font-medium text-muted-foreground bg-background">Viewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Manage Users', perms: [true, true, false, false, false] },
                        { name: 'Manage Roles', perms: [true, true, false, false, false] },
                        { name: 'Company Settings', perms: [true, true, false, false, false] },
                        { name: 'Billing & Plans', perms: [true, true, false, false, false] },
                        { name: 'Create Leads', perms: [true, true, true, true, false] },
                        { name: 'Assign Leads', perms: [true, true, true, false, false] },
                        { name: 'Create Jobs', perms: [true, true, true, true, false] },
                        { name: 'Dispatch Jobs', perms: [true, true, true, false, false] },
                        { name: 'View Reports', perms: [true, true, true, true, true] },
                        { name: 'Export Data', perms: [true, true, true, false, false] },
                        { name: 'Manage Invoices', perms: [true, true, true, false, false] },
                        { name: 'Manage Workflows', perms: [true, true, true, false, false] },
                        { name: 'API Access', perms: [true, true, false, false, false] },
                      ].map((row) => (
                        <tr key={row.name} className="border-b last:border-0">
                          <td className="py-2 px-3 font-medium">{row.name}</td>
                          {row.perms.map((has, i) => (
                            <td key={i} className="text-center py-2 px-3">
                              {has ? (
                                <Check className="size-3.5 text-emerald-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                  <KeyRound className="size-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Security</CardTitle>
                  <CardDescription>Security and access control settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">Require 2FA for account access</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Session Timeout</Label>
                <Input placeholder="30 minutes" defaultValue="30" className="max-w-xs" type="number" />
                <p className="text-xs text-muted-foreground">Minutes of inactivity before session expires</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Integrations Tab
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="integrations" className="space-y-6">
          {/* ─── Card 1: WordPress / CRM Integration ─────────────────────────── */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Plug className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">WordPress / CRM Integration</CardTitle>
                    <CardDescription>Connect WordPress forms to capture leads directly</CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={handleGenerateWpConfig}
                  disabled={wpGenerating}
                >
                  {wpGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                  Generate
                </Button>
              </div>

              {/* Lead Capture Flow diagram */}
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1.5">
                  <ArrowRight className="size-3" /> Lead Capture Flow
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">WordPress Form</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">ServiceOS API</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">Lead Created</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">WhatsApp Sent</span>
                </div>
              </div>

              {/* Supported form plugins */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WP_FORM_PLUGINS.map((fp) => (
                  <Badge key={fp.slug} variant="outline" className="text-[10px] bg-background">
                    {fp.name}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Newly generated config display */}
              {wpNewConfig && (
                <div className="p-4 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">Integration Configured!</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]" variant="outline">New</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Copy these values into your WordPress plugin settings. The API Key is shown only once.</p>

                  {/* API URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Globe className="size-3" /> API URL
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                        {wpNewConfig.api_url}
                      </code>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wpNewConfig.api_url, 'API URL')}>
                        <Copy className="size-3" /> Copy
                      </Button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <KeyRound className="size-3" /> API Key
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">Show once</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                        {wpShowApiKey ? wpNewConfig.api_key : wpNewConfig.api_key.slice(0, 12) + '••••••••••••••••'}
                      </code>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setWpShowApiKey(!wpShowApiKey)}>
                        {wpShowApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </Button>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wpNewConfig.api_key, 'API Key')}>
                        <Copy className="size-3" /> Copy
                      </Button>
                    </div>
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Link2 className="size-3" /> Webhook URL
                      <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 border-sky-200">Universal</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                        {wpNewConfig.webhook_url}
                      </code>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(wpNewConfig.webhook_url, 'Webhook URL')}>
                        <Copy className="size-3" /> Copy
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleTestWpConnection}
                      disabled={wpTesting}
                    >
                      {wpTesting ? <Loader2 className="size-3 animate-spin" /> : <TestTube2 className="size-3" />}
                      Test Connection
                    </Button>
                    <a
                      href="/downloads/serviceos-crm-lead-capture.php"
                      download="serviceos-crm-lead-capture.php"
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Download className="size-3" /> Download Plugin
                    </a>
                  </div>
                </div>
              )}

              {/* WordPress Plugin download row */}
              {!wpNewConfig && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
                  <FileCode className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">WordPress Plugin</p>
                  </div>
                  <a
                    href="/downloads/serviceos-crm-lead-capture.php"
                    download="serviceos-crm-lead-capture.php"
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
                  >
                    <Download className="size-3" /> Download
                  </a>
                </div>
              )}

              {/* Active Endpoints */}
              {wpLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin mr-2" /> Loading endpoints...
                </div>
              ) : wpEndpoints.length > 0 ? (
                <div className="space-y-2">
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">Active Endpoints</p>
                  {wpEndpoints.map((ep) => (
                    <div key={ep.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{ep.name}</span>
                          <Badge className={ep.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'} variant="outline">
                            <span className="text-[10px]">{ep.active ? 'Active' : 'Inactive'}</span>
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono truncate block">{ep.apiUrl}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0"
                        onClick={() => handleDeleteWpEndpoint(ep.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Auto-Mapped Form Fields */}
              <div>
                <Separator className="mb-3" />
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Auto-Mapped Form Fields</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-xs"
                    onClick={() => setEditingFieldMapping(!editingFieldMapping)}
                  >
                    <Pencil className="size-3" />
                    {editingFieldMapping ? 'Done' : 'Edit'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    { field: 'name', source: 'your-name' },
                    { field: 'phone', source: 'your-phone' },
                    { field: 'email', source: 'your-email' },
                    { field: 'serviceType', source: 'your-subject' },
                    { field: 'description', source: 'your-message' },
                    { field: 'address', source: 'your-address' },
                  ].map((fm) => (
                    <div key={fm.field} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                        {fm.field}
                      </Badge>
                      <span className="text-muted-foreground">←</span>
                      <span className="text-muted-foreground truncate">{fm.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── Card 2: WhatsApp Notifications ──────────────────────────────── */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <MessageSquare className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">WhatsApp Notifications</CardTitle>
                  <CardDescription>Configure WhatsApp messages for WordPress form submissions</CardDescription>
                </div>
              </div>

              {/* Notification Flow diagram */}
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1.5">
                  <ArrowRight className="size-3" /> Notification Flow
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Form Submit</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Lead Created</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">Owner WhatsApp</span>
                  <span className="text-[10px] text-muted-foreground mx-1">+</span>
                  <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[10px] font-medium">Customer WhatsApp</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Section 1: Notify Business Owner */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-emerald-600" />
                    <div>
                      <Label className="text-sm font-medium">Notify Business Owner</Label>
                      <p className="text-xs text-muted-foreground">Send a WhatsApp notification to the business owner when a new lead arrives</p>
                    </div>
                  </div>
                  <Switch checked={notifyOwner} onCheckedChange={setNotifyOwner} />
                </div>

                {notifyOwner && (
                  <div className="ml-6 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Phone className="size-3" /> Owner WhatsApp Number
                      </Label>
                      <Input
                        placeholder="+91 98765 43210"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Owner Message Template</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleAiGenerate('owner')}
                        >
                          <Sparkles className="size-3" /> AI Generate
                        </Button>
                      </div>
                      <Textarea
                        rows={8}
                        value={ownerTemplate}
                        onChange={(e) => setOwnerTemplate(e.target.value)}
                        className="text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Available variables: {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}, {'{{serviceType}}'}, {'{{description}}'}, {'{{address}}'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Section 2: Auto-Reply to Customer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-sky-600" />
                    <div>
                      <Label className="text-sm font-medium">Auto-Reply to Customer</Label>
                      <p className="text-xs text-muted-foreground">Automatically send a WhatsApp reply to the customer who submitted the form</p>
                    </div>
                  </div>
                  <Switch checked={notifyCustomer} onCheckedChange={setNotifyCustomer} />
                </div>

                {notifyCustomer && (
                  <div className="ml-6 pl-4 border-l-2 border-sky-200 dark:border-sky-800 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Customer Message Template</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-xs text-sky-600 hover:text-sky-700"
                          onClick={() => handleAiGenerate('customer')}
                        >
                          <Sparkles className="size-3" /> AI Generate
                        </Button>
                      </div>
                      <Textarea
                        rows={6}
                        value={customerTemplate}
                        onChange={(e) => setCustomerTemplate(e.target.value)}
                        className="text-xs font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Available variables: {'{{name}}'}, {'{{phone}}'}, {'{{serviceType}}'}, {'{{description}}'}, {'{{companyName}}'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 min-w-[160px]"
                  onClick={handleSaveWhatsappSettings}
                  disabled={whatsappSettingsSaving}
                >
                  {whatsappSettingsSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save WhatsApp Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ─── Card 3: Event Webhooks ───────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Zap className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Event Webhooks</CardTitle>
                    <CardDescription>Configure n8n / Zapier webhooks on job events</CardDescription>
                  </div>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setShowAddWebhook(true)}>
                  <Plus className="size-3.5" /> Add Webhook
                </Button>
              </div>

              {/* Flow diagram */}
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                  <Zap className="size-3" /> How it works
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Job Event</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">Save to DB</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">POST to n8n</span>
                  <ArrowRight className="size-3" />
                  <span className="px-1.5 py-0.5 bg-background rounded border text-[10px] font-medium">WhatsApp</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {webhookLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2" /> Loading webhooks...
                </div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="size-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No event webhooks configured</p>
                  <p className="text-xs">Add a webhook URL to trigger n8n workflows when job events occur</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{wh.name}</span>
                            <Badge variant="outline" className={`${EVENT_COLORS[wh.event] || 'bg-gray-100 text-gray-600'} text-[10px] shrink-0`}>
                              {wh.event.replace('job.', '')}
                            </Badge>
                            {wh.active ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] shrink-0" variant="outline">
                                <CheckCircle2 className="size-2.5 mr-0.5" /> Active
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] shrink-0" variant="outline">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
                          {wh.lastTriggered && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <Clock className="size-2.5" />
                              Last: {new Date(wh.lastTriggered).toLocaleString()}
                              {wh.lastStatus === 'success' && <CheckCircle2 className="size-2.5 text-emerald-500" />}
                              {wh.lastStatus === 'failed' && <XCircle className="size-2.5 text-red-500" />}
                              {wh.failCount > 0 && <span className="text-red-500">({wh.failCount} failures)</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleTestWebhook(wh.event)}
                            disabled={testingWebhook === wh.event}
                            title="Test this webhook"
                          >
                            {testingWebhook === wh.event ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <TestTube2 className="size-3.5" />
                            )}
                          </Button>
                          <Switch
                            checked={wh.active}
                            onCheckedChange={(checked) => handleToggleWebhook(wh.id, checked)}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600"
                            onClick={() => handleDeleteWebhook(wh.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Available Events */}
              {eventTypes.length > 0 && (
                <div className="mt-4">
                  <Separator className="mb-3" />
                  <p className="text-xs font-medium text-muted-foreground mb-2">Available Events</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {eventTypes.map((et) => (
                      <button
                        key={et.value}
                        className="flex items-center gap-2 p-2 rounded-md border text-xs hover:bg-muted/50 transition-colors text-left"
                        onClick={() => {
                          setWebhookForm({ ...webhookForm, event: et.value, name: `n8n - ${et.label}` });
                          setShowAddWebhook(true);
                        }}
                      >
                        <Badge variant="outline" className={`${EVENT_COLORS[et.value] || ''} text-[9px] shrink-0`}>
                          {et.value.replace('job.', '')}
                        </Badge>
                        <span className="truncate">{et.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Webhook Dialog */}
          <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Event Webhook</DialogTitle>
                <DialogDescription>Configure a webhook URL (e.g., n8n workflow) that fires when a job event occurs</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Webhook Name</Label>
                  <Input
                    placeholder="e.g., n8n - Job Created → WhatsApp Employee"
                    value={webhookForm.name}
                    onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Trigger</Label>
                  <Select value={webhookForm.event} onValueChange={(v) => setWebhookForm({ ...webhookForm, event: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((et) => (
                        <SelectItem key={et.value} value={et.value}>
                          {et.label} — {et.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    placeholder="https://n8n.yourdomain.com/webhook/abc123"
                    value={webhookForm.url}
                    onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    The URL from your n8n workflow webhook trigger. ServiceOS will POST job data here when the event fires.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Active</Label>
                    <p className="text-[10px] text-muted-foreground">Enable this webhook immediately</p>
                  </div>
                  <Switch
                    checked={webhookForm.active}
                    onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleAddWebhook}
                  disabled={!webhookForm.name || !webhookForm.url}
                >
                  Create Webhook
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Billing Tab
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CreditCard className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Subscription Plan</CardTitle>
                  <CardDescription>Manage your subscription and billing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Plan Banner */}
              <div className="p-4 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="size-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {billingPlan === 'pro' ? 'Pro' : billingPlan === 'growth' ? 'Growth' : billingPlan === 'enterprise' ? 'Enterprise' : 'Starter'} Plan
                    </span>
                  </div>
                  <Badge className={`${planStatus === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : planStatus === 'trial' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'} text-[10px]`} variant="outline">
                    {planStatus === 'active' ? 'Active' : planStatus === 'trial' ? 'Trial' : planStatus === 'past_due' ? 'Past Due' : planStatus}
                  </Badge>
                </div>
                {trialEndsAt && planStatus === 'trial' && (
                  <p className="text-xs text-muted-foreground">
                    Trial ends on {new Date(trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Plan Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: 'starter', name: 'Starter', price: 'Free', features: ['Up to 3 users', '50 leads/month', 'Basic reporting', 'Email support'], current: billingPlan === 'starter' },
                  { id: 'growth', name: 'Growth', price: '$29/mo', features: ['Up to 15 users', '500 leads/month', 'Advanced reporting', 'Priority support', 'WhatsApp integration'], current: billingPlan === 'growth' },
                  { id: 'pro', name: 'Pro', price: '$79/mo', features: ['Unlimited users', 'Unlimited leads', 'Custom workflows', 'API access', 'White-label', 'Dedicated support'], current: billingPlan === 'pro' },
                  { id: 'enterprise', name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Custom integrations', 'SLA guarantee', 'On-premise option', 'Training sessions'], current: billingPlan === 'enterprise' },
                ].map((plan) => (
                  <div key={plan.id} className={`p-4 rounded-lg border-2 transition-colors ${plan.current ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border hover:border-emerald-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{plan.name}</span>
                      {plan.current && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px]" variant="outline">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-bold text-emerald-600 mb-3">{plan.price}</p>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Check className="size-3 text-emerald-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.current ? 'outline' : 'default'}
                      size="sm"
                      className={`w-full ${plan.current ? '' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      disabled={plan.current}
                    >
                      {plan.current ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                  <CreditCard className="size-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Billing History</CardTitle>
                  <CardDescription>Your recent transactions and invoices</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { date: '2025-03-01', description: 'Starter Plan — Monthly', amount: '$0.00', status: 'Paid' },
                  { date: '2025-02-01', description: 'Starter Plan — Monthly', amount: '$0.00', status: 'Paid' },
                  { date: '2025-01-01', description: 'Starter Plan — Monthly', amount: '$0.00', status: 'Paid' },
                ].map((invoice, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
                        <CreditCard className="size-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{invoice.amount}</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        {invoice.status}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        <Download className="size-3" /> PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
