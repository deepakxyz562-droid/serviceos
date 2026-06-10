'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Users,
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
  Link2,
  Eye,
  EyeOff,
  FileCode,
  Download,
  Save,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  UserPlus,
  Search,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Pencil,
  RotateCcw,
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────

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
}

interface TenantUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  avatar: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface RolePermission {
  role: string;
  label: string;
  description: string;
  permissions: string[];
  color: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

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

const ROLES: RolePermission[] = [
  {
    role: 'owner',
    label: 'Owner',
    description: 'Full access to all features and settings. Can manage billing, users, and workspace configuration.',
    permissions: ['All Features', 'Billing & Payments', 'User Management', 'Role Management', 'Workspace Settings', 'Data Export', 'Integrations', 'API Keys'],
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    role: 'admin',
    label: 'Admin',
    description: 'Can manage most features including users and operations, but cannot modify billing or workspace URL.',
    permissions: ['Most Features', 'User Management', 'Operations', 'CRM', 'Workflows', 'Integrations', 'Reports'],
    color: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  {
    role: 'manager',
    label: 'Manager',
    description: 'Can manage day-to-day operations, jobs, and team members within their scope.',
    permissions: ['Jobs & Dispatch', 'CRM & Leads', 'Customer Communication', 'Calendar', 'Reports (Read)'],
    color: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  {
    role: 'employee',
    label: 'Employee',
    description: 'Can view and complete assigned jobs, update status, and access the employee portal.',
    permissions: ['My Jobs', 'Job Status Updates', 'Clock In/Out', 'Customer Details (Assigned)', 'Knowledge Base'],
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    role: 'technician',
    label: 'Technician',
    description: 'Field worker role with mobile-optimized access for job completion and proof collection.',
    permissions: ['My Jobs', 'Completion Proof', 'Photo Upload', 'Signature Capture', 'Customer Info (Assigned)'],
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
];

const INDUSTRIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'packers-movers', label: 'Packers & Movers' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'pest-control', label: 'Pest Control' },
  { value: 'courier', label: 'Courier' },
  { value: 'home-repair', label: 'Home Repair' },
  { value: 'salon-beauty', label: 'Salon & Beauty' },
  { value: 'other', label: 'Other' },
];

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL
  ? (() => { try { return new URL(process.env.NEXT_PUBLIC_APP_URL).host; } catch { return 'serviceosapp.netlify.app'; } })()
  : 'serviceosapp.netlify.app';

// ─── Slug helper ───────────────────────────────────────────────────────────

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SettingsView() {
  const { darkMode, toggleDarkMode, auth, setAuth } = useAppStore();
  const [activeTab, setActiveTab] = useState('company');

  // ─── Tenant / Company Profile State ─────────────────────────────────────
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantSaving, setTenantSaving] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'US',
    currency: 'USD',
    whatsappPhone: '',
  });

  // ─── Workspace URL State ────────────────────────────────────────────────
  const [subdomain, setSubdomain] = useState('');
  const [subdomainVerified, setSubdomainVerified] = useState(false);
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [editingSubdomain, setEditingSubdomain] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    available: boolean;
    reason?: string;
    subdomain?: string;
  } | null>(null);
  const [savingSubdomain, setSavingSubdomain] = useState(false);

  // ─── Users State ────────────────────────────────────────────────────────
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'employee' });
  const [inviting, setInviting] = useState(false);

  // ─── Integrations State ─────────────────────────────────────────────────
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

  // ─── WordPress State ────────────────────────────────────────────────────
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

  // ─── Notifications State ────────────────────────────────────────────────
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    executionComplete: true,
    slackNotifications: false,
  });

  // ─── Field Mapping State ─────────────────────────────────────────────────
  const [editingFieldMapping, setEditingFieldMapping] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({
    'your-name': 'name',
    'your-phone': 'phone',
    'your-email': 'email',
    'your-subject': 'serviceType',
    'your-message': 'description',
    'your-address': 'address',
  });
  const [newMapSource, setNewMapSource] = useState('');
  const [newMapTarget, setNewMapTarget] = useState('');
  const [savingFieldMapping, setSavingFieldMapping] = useState(false);

  // ─── WhatsApp Notification Settings State ─────────────────────────────────
  const [whatsappSettings, setWhatsappSettings] = useState({
    notifyOwner: true,
    ownerPhone: '',
    ownerTemplate: '🎯 New Lead from Website!\n\nName: {{name}}\nPhone: {{phone}}\nEmail: {{email}}\nService: {{serviceType}}\nMessage: {{description}}\n\nFollow up promptly!',
    notifyCustomer: true,
    customerTemplate: 'Thank you for contacting us, {{name}}! 🙏\n\nWe have received your inquiry about {{serviceType}}. Our team will contact you shortly.\n\n— {{companyName}}',
  });
  const [savingWhatsappSettings, setSavingWhatsappSettings] = useState(false);
  const [generatingAiTemplate, setGeneratingAiTemplate] = useState<'owner' | 'customer' | null>(null);

  const tenantId = auth.tenant?.id;

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchTenantData = useCallback(async () => {
    if (!tenantId) return;
    setTenantLoading(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant;
        setCompanyForm({
          name: t.name || '',
          industry: t.industry || '',
          phone: t.phone || '',
          email: t.email || '',
          address: t.address || '',
          city: t.city || '',
          state: t.state || '',
          pincode: t.pincode || '',
          country: t.country || 'US',
          currency: t.currency || 'USD',
          whatsappPhone: t.whatsappPhone || '',
        });
        setSubdomain(t.subdomain || t.slug || '');
        setSubdomainVerified(t.subdomainVerified || false);
        setCustomDomain(t.customDomain || null);
      }
    } catch {
      // silently fail
    } finally {
      setTenantLoading(false);
    }
  }, [tenantId]);

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return;
    setUsersLoading(true);
    try {
      const res = await authFetch(`/api/admin/users?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedUsers = data.users || [];
        if (fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
        } else if (auth.user) {
          // Fallback: show at least the current user
          setUsers([{
            id: auth.user.id,
            name: auth.user.name,
            email: auth.user.email,
            role: auth.user.role,
            isActive: auth.user.isActive ?? true,
            avatar: auth.user.avatar,
            lastLoginAt: auth.user.lastLoginAt,
            createdAt: auth.user.createdAt || new Date().toISOString(),
          }]);
        }
      } else if (auth.user) {
        setUsers([{
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          role: auth.user.role,
          isActive: auth.user.isActive ?? true,
          avatar: auth.user.avatar,
          lastLoginAt: auth.user.lastLoginAt,
          createdAt: auth.user.createdAt || new Date().toISOString(),
        }]);
      }
    } catch {
      if (auth.user) {
        setUsers([{
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          role: auth.user.role,
          isActive: auth.user.isActive ?? true,
          avatar: auth.user.avatar,
          lastLoginAt: auth.user.lastLoginAt,
          createdAt: auth.user.createdAt || new Date().toISOString(),
        }]);
      }
    } finally {
      setUsersLoading(false);
    }
  }, [tenantId, auth.user]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await authFetch('/api/event-webhooks');
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
      const res = await authFetch('/api/wordpress/config');
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

  useEffect(() => {
    fetchTenantData();
    fetchUsers();
    fetchWebhooks();
    fetchWpEndpoints();
  }, [fetchTenantData, fetchUsers, fetchWebhooks, fetchWpEndpoints]);

  // ─── Company Profile Handlers ───────────────────────────────────────────

  const handleSaveCompany = async () => {
    if (!tenantId) return;
    setTenantSaving(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });
      if (res.ok) {
        const data = await res.json();
        // Update auth state
        const updatedTenant = { ...auth.tenant, ...data.tenant };
        setAuth({ isAuthenticated: true, user: auth.user, tenant: updatedTenant });
        if (typeof window !== 'undefined') {
          localStorage.setItem('serviceos_auth', JSON.stringify({
            isAuthenticated: true,
            user: auth.user,
            tenant: updatedTenant,
          }));
        }
        toast.success('Company profile updated successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update company profile');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTenantSaving(false);
    }
  };

  // ─── Subdomain Handlers ─────────────────────────────────────────────────

  const checkSubdomainAvailability = async (sub: string) => {
    if (!sub || sub.length < 3) {
      setAvailabilityResult({ available: false, reason: 'Minimum 3 characters required' });
      return;
    }
    setCheckingAvailability(true);
    setAvailabilityResult(null);
    try {
      const res = await authFetch(`/api/tenant/subdomain-check?subdomain=${encodeURIComponent(sub)}`);
      if (res.ok) {
        const data = await res.json();
        setAvailabilityResult(data);
      }
    } catch {
      setAvailabilityResult({ available: false, reason: 'Failed to check availability' });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubdomainSave = async () => {
    if (!tenantId || !availabilityResult?.available) return;
    setSavingSubdomain(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: newSubdomain }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubdomain(newSubdomain);
        setEditingSubdomain(false);
        setAvailabilityResult(null);
        // Update auth state
        const updatedTenant = { ...auth.tenant, ...data.tenant, subdomain: newSubdomain };
        setAuth({ isAuthenticated: true, user: auth.user, tenant: updatedTenant });
        if (typeof window !== 'undefined') {
          localStorage.setItem('serviceos_auth', JSON.stringify({
            isAuthenticated: true,
            user: auth.user,
            tenant: updatedTenant,
          }));
        }
        toast.success('Workspace URL updated successfully!');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update workspace URL');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingSubdomain(false);
    }
  };

  const startEditSubdomain = () => {
    setNewSubdomain(subdomain);
    setEditingSubdomain(true);
    setAvailabilityResult(null);
  };

  // ─── User Invite Handler ────────────────────────────────────────────────

  const handleInviteUser = async () => {
    if (!inviteForm.email) {
      toast.error('Email is required');
      return;
    }
    setInviting(true);
    try {
      const res = await authFetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteForm.name || inviteForm.email.split('@')[0],
          email: inviteForm.email,
          phone: '',
          role: inviteForm.role,
        }),
      });
      if (res.ok) {
        toast.success('Invitation sent successfully!');
        setInviteDialogOpen(false);
        setInviteForm({ email: '', name: '', role: 'employee' });
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send invitation');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setInviting(false);
    }
  };

  // ─── Integration Handlers ───────────────────────────────────────────────

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label || 'Value'} copied to clipboard`);
  };

  const handleGenerateWpConfig = async () => {
    setWpGenerating(true);
    try {
      const res = await authFetch('/api/wordpress/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'WordPress Lead Capture', sendWhatsApp: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setWpNewConfig(data.config);
        setWpShowApiKey(true);
        toast.success('WordPress integration configured!');
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

  const handleTestWpConnection = async () => {
    if (!wpNewConfig?.api_key) return;
    setWpTesting(true);
    try {
      const res = await authFetch('/api/wordpress/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: wpNewConfig.api_key }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setWpTesting(false);
    }
  };

  const handleDeleteWpEndpoint = async (id: string) => {
    try {
      const res = await authFetch(`/api/wordpress/config?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('WordPress endpoint deleted');
        fetchWpEndpoints();
        if (wpNewConfig) setWpNewConfig(null);
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast.error('Name and URL are required');
      return;
    }
    try {
      const res = await authFetch('/api/event-webhooks', {
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
      const res = await authFetch(`/api/event-webhooks/${id}`, { method: 'DELETE' });
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
      const res = await authFetch(`/api/event-webhooks/${id}`, {
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
      const res = await authFetch('/api/event-webhooks/test', {
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

  // ─── Field Mapping Handlers ──────────────────────────────────────────────

  const handleSaveFieldMapping = async () => {
    setSavingFieldMapping(true);
    try {
      const endpointId = wpEndpoints[0]?.endpointId;
      if (endpointId) {
        const res = await authFetch(`/api/wordpress/config?XTransformPort=3000`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpointId, fieldMapping: fieldMappings }),
        });
        if (res.ok) {
          toast.success('Field mapping saved successfully!');
          setEditingFieldMapping(false);
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to save field mapping');
        }
      } else {
        toast.success('Field mapping saved!');
        setEditingFieldMapping(false);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingFieldMapping(false);
    }
  };

  const handleAddFieldMapping = () => {
    if (!newMapSource || !newMapTarget) {
      toast.error('Both source and target fields are required');
      return;
    }
    setFieldMappings({ ...fieldMappings, [newMapSource]: newMapTarget });
    setNewMapSource('');
    setNewMapTarget('');
    toast.success('Field mapping added');
  };

  const handleRemoveFieldMapping = (source: string) => {
    const updated = { ...fieldMappings };
    delete updated[source];
    setFieldMappings(updated);
  };

  // ─── WhatsApp Settings Handlers ──────────────────────────────────────────

  const handleSaveWhatsappSettings = async () => {
    setSavingWhatsappSettings(true);
    try {
      const endpointId = wpEndpoints[0]?.endpointId;
      if (endpointId) {
        const res = await authFetch(`/api/wordpress/config?XTransformPort=3000`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpointId,
            whatsappSettings: {
              notifyOwner: whatsappSettings.notifyOwner,
              ownerPhone: whatsappSettings.ownerPhone,
              ownerTemplate: whatsappSettings.ownerTemplate,
              notifyCustomer: whatsappSettings.notifyCustomer,
              customerTemplate: whatsappSettings.customerTemplate,
            },
          }),
        });
        if (res.ok) {
          toast.success('WhatsApp notification settings saved!');
        } else {
          const err = await res.json();
          toast.error(err.error || 'Failed to save WhatsApp settings');
        }
      } else {
        toast.success('WhatsApp notification settings saved!');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingWhatsappSettings(false);
    }
  };

  const handleGenerateAiTemplate = async (type: 'owner' | 'customer') => {
    setGeneratingAiTemplate(type);
    try {
      const companyName = companyForm.name || 'ServiceOS';
      const industry = companyForm.industry || 'service';
      const res = await authFetch('/api/ai/generate-whatsapp-template?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          companyName,
          industry,
          currentTemplate: type === 'owner' ? whatsappSettings.ownerTemplate : whatsappSettings.customerTemplate,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (type === 'owner') {
          setWhatsappSettings({ ...whatsappSettings, ownerTemplate: data.template });
        } else {
          setWhatsappSettings({ ...whatsappSettings, customerTemplate: data.template });
        }
        toast.success('AI-generated template ready!');
      } else {
        toast.error('Failed to generate template');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setGeneratingAiTemplate(null);
    }
  };

  // ─── Helper Functions ───────────────────────────────────────────────────

  const getUserInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
      admin: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400',
      manager: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400',
      employee: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
      technician: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[role] || colors.employee;
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (tenantLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <SettingsIcon className="size-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your workspace, team, and integrations</p>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="company" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Building2 className="size-4" />
            <span className="hidden sm:inline">Company Profile</span>
            <span className="sm:hidden">Company</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Users className="size-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Shield className="size-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Plug className="size-4" />
            <span className="hidden sm:inline">Integrations</span>
            <span className="sm:hidden">Apps</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <CreditCard className="size-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="workspace-url" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Globe className="size-4" />
            <span className="hidden sm:inline">Workspace URL</span>
            <span className="sm:hidden">URL</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Company Profile
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Building2 className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Company Information</CardTitle>
                  <CardDescription>Your business details visible across the platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-medium">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11"
                      placeholder="Enter company name"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Industry</Label>
                  <Select value={companyForm.industry} onValueChange={(v) => setCompanyForm({ ...companyForm, industry: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Currency</Label>
                  <Select value={companyForm.currency} onValueChange={(v) => setCompanyForm({ ...companyForm, currency: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (&euro;)</SelectItem>
                      <SelectItem value="GBP">GBP (&pound;)</SelectItem>
                      <SelectItem value="INR">INR (&#8377;)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11"
                      placeholder="+1 (555) 123-4567"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11"
                      type="email"
                      placeholder="contact@company.com"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">WhatsApp Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-10 h-11"
                      placeholder="+1 (555) 123-4567"
                      value={companyForm.whatsappPhone}
                      onChange={(e) => setCompanyForm({ ...companyForm, whatsappPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="size-4" /> Business Address
                </Label>
                <Input
                  placeholder="Street address"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="h-11"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="City" value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} className="h-11" />
                  <Input placeholder="State" value={companyForm.state} onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} className="h-11" />
                  <Input placeholder="Pincode" value={companyForm.pincode} onChange={(e) => setCompanyForm({ ...companyForm, pincode: e.target.value })} className="h-11" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance & Notifications (moved from old General) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Bell className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Preferences</CardTitle>
                  <CardDescription>Appearance and notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium">Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">Toggle dark mode theme</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get notified about workflow failures</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(v) => setNotifications({ ...notifications, emailNotifications: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium">Execution Alerts</Label>
                  <p className="text-xs text-muted-foreground">Notify when workflow executions finish</p>
                </div>
                <Switch
                  checked={notifications.executionComplete}
                  onCheckedChange={(v) => setNotifications({ ...notifications, executionComplete: v })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 min-w-[140px]"
              onClick={handleSaveCompany}
              disabled={tenantSaving}
            >
              {tenantSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Users
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Users className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Team Members</CardTitle>
                    <CardDescription>Manage who has access to your workspace</CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  <UserPlus className="size-3.5" /> Invite
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
                  <Users className="size-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No users found</p>
                  <p className="text-xs">Invite team members to your workspace</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-xs">
                          {getUserInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{user.name || user.email.split('@')[0]}</span>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </Badge>
                          {user.id === auth.user?.id && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]" variant="outline">You</Badge>
                          )}
                          {!user.isActive && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]" variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {user.lastLoginAt && (
                        <div className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                          Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Invite Dialog ──────────────────────────────────────────────── */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="size-5 text-emerald-600" /> Invite Team Member
                </DialogTitle>
                <DialogDescription>Send an invitation to join your workspace</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      type="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Name (optional)</Label>
                  <Input
                    placeholder="John Doe"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
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
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ROLES.find((r) => r.role === inviteForm.role)?.description}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleInviteUser}
                  disabled={inviting || !inviteForm.email}
                >
                  {inviting ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserPlus className="size-4 mr-2" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Roles
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Roles & Permissions</CardTitle>
                  <CardDescription>Define what each role can access in your workspace</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ROLES.map((role) => {
                const usersWithRole = users.filter((u) => u.role === role.role).length;
                return (
                  <div key={role.role} className="rounded-lg border p-4 space-y-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${role.color}`}>{role.label}</Badge>
                        <span className="text-xs text-muted-foreground">{usersWithRole} member{usersWithRole !== 1 ? 's' : ''}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{role.permissions.length} permissions</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-[10px] bg-background">
                          <Check className="size-2.5 mr-0.5 text-emerald-500" /> {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="p-4 rounded-lg border border-dashed bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">
                  Role permissions are managed by the platform. Contact support for custom role configurations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Integrations
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="integrations" className="space-y-6">
          {/* WordPress Integration */}
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
                  {wpGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                  Generate
                </Button>
              </div>
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
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WP_FORM_PLUGINS.map((fp) => (
                  <Badge key={fp.slug} variant="outline" className="text-[10px] bg-background">{fp.name}</Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {wpNewConfig && (
                <div className="p-4 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">Integration Configured!</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]" variant="outline">New</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Copy these values into your WordPress plugin settings.</p>
                  {[
                    { label: 'API URL', icon: Globe, value: wpNewConfig.api_url, name: 'API URL' },
                    { label: 'API Key', icon: KeyRound, value: wpNewConfig.api_key, name: 'API Key', sensitive: true },
                    { label: 'Webhook URL', icon: Link2, value: wpNewConfig.webhook_url, name: 'Webhook URL' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <item.icon className="size-3" /> {item.label}
                        {item.sensitive && <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">Show once</Badge>}
                      </Label>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-white dark:bg-gray-900 px-3 py-1.5 rounded border flex-1 truncate">
                          {item.sensitive && !wpShowApiKey ? item.value.slice(0, 12) + '••••••••' : item.value}
                        </code>
                        {item.sensitive && (
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setWpShowApiKey(!wpShowApiKey)}>
                            {wpShowApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => copyToClipboard(item.value, item.name)}>
                          <Copy className="size-3" /> Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleTestWpConnection} disabled={wpTesting}>
                      {wpTesting ? <Loader2 className="size-3 animate-spin" /> : <TestTube2 className="size-3" />} Test Connection
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

              {!wpNewConfig && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
                  <FileCode className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">WordPress Plugin</p>
                    <p className="text-xs text-muted-foreground">Download the ServiceOS CRM Lead Capture plugin</p>
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
                          {ep.totalReceived > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                              {ep.totalReceived} lead{ep.totalReceived !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{ep.apiUrl}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 shrink-0" onClick={() => handleDeleteWpEndpoint(ep.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : !wpNewConfig ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Plug className="size-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No WordPress endpoints configured</p>
                  <p className="text-xs">Click &quot;Generate&quot; to create one instantly</p>
                </div>
              ) : null}

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
                    {editingFieldMapping ? <X className="size-3" /> : <Pencil className="size-3" />}
                    {editingFieldMapping ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
                {!editingFieldMapping ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {Object.entries(fieldMappings).map(([source, target]) => (
                      <div key={source} className="flex items-center gap-2 p-2 rounded-md border text-xs">
                        <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">{target}</Badge>
                        <span className="text-muted-foreground truncate">&larr; {source}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-muted-foreground">
                      Map WordPress form field names to CRM lead fields. When a form is submitted, these mappings tell the system which form field value goes into which lead field.
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(fieldMappings).map(([source, target]) => (
                        <div key={source} className="flex items-center gap-2 p-2 rounded-md border bg-background text-xs">
                          <Input
                            className="h-7 text-xs flex-1 min-w-0"
                            value={source}
                            onChange={(e) => {
                              const updated = { ...fieldMappings };
                              delete updated[source];
                              updated[e.target.value] = target;
                              setFieldMappings(updated);
                            }}
                            placeholder="Form field name"
                          />
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <Select
                            value={target}
                            onValueChange={(v) => setFieldMappings({ ...fieldMappings, [source]: v })}
                          >
                            <SelectTrigger className="h-7 text-xs w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="address">Address</SelectItem>
                              <SelectItem value="serviceType">Service Type</SelectItem>
                              <SelectItem value="description">Description</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="city">City</SelectItem>
                              <SelectItem value="state">State</SelectItem>
                              <SelectItem value="zipCode">Zip Code</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-red-400 hover:text-red-600"
                            onClick={() => handleRemoveFieldMapping(source)}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-7 text-xs flex-1"
                        value={newMapSource}
                        onChange={(e) => setNewMapSource(e.target.value)}
                        placeholder="New form field name (e.g. your-company)"
                      />
                      <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                      <Select value={newMapTarget} onValueChange={(v) => setNewMapTarget(v)}>
                        <SelectTrigger className="h-7 text-xs w-[130px]">
                          <SelectValue placeholder="Lead field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="address">Address</SelectItem>
                          <SelectItem value="serviceType">Service Type</SelectItem>
                          <SelectItem value="description">Description</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="city">City</SelectItem>
                          <SelectItem value="state">State</SelectItem>
                          <SelectItem value="zipCode">Zip Code</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs shrink-0"
                        onClick={handleAddFieldMapping}
                        disabled={!newMapSource || !newMapTarget}
                      >
                        <Plus className="size-3" /> Add
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-8"
                        onClick={handleSaveFieldMapping}
                        disabled={savingFieldMapping}
                      >
                        {savingFieldMapping ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                        Save Mapping
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Notification Settings */}
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
                  <span className="text-[10px] mx-1">+</span>
                  <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[10px] font-medium">Customer WhatsApp</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Owner Notification */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="size-4 text-emerald-600" />
                      Notify Business Owner
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Send a WhatsApp alert to the owner when a new lead arrives</p>
                  </div>
                  <Switch
                    checked={whatsappSettings.notifyOwner}
                    onCheckedChange={(v) => setWhatsappSettings({ ...whatsappSettings, notifyOwner: v })}
                  />
                </div>
                {whatsappSettings.notifyOwner && (
                  <div className="space-y-3 pl-6 border-l-2 border-emerald-200 dark:border-emerald-800">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Owner WhatsApp Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          className="pl-10 h-10 text-sm"
                          placeholder="+1 (555) 123-4567"
                          value={whatsappSettings.ownerPhone}
                          onChange={(e) => setWhatsappSettings({ ...whatsappSettings, ownerPhone: e.target.value })}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">This number will receive lead details via WhatsApp</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Owner Message Template</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-[11px] text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleGenerateAiTemplate('owner')}
                          disabled={generatingAiTemplate === 'owner'}
                        >
                          {generatingAiTemplate === 'owner' ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Sparkles className="size-3" />
                          )}
                          AI Generate
                        </Button>
                      </div>
                      <Textarea
                        className="min-h-[120px] text-sm font-mono"
                        value={whatsappSettings.ownerTemplate}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, ownerTemplate: e.target.value })}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Available variables: {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}, {'{{serviceType}}'}, {'{{description}}'}, {'{{address}}'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Customer Notification */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="size-4 text-sky-600" />
                      Auto-Reply to Customer
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Send a WhatsApp confirmation to the customer who submitted the form</p>
                  </div>
                  <Switch
                    checked={whatsappSettings.notifyCustomer}
                    onCheckedChange={(v) => setWhatsappSettings({ ...whatsappSettings, notifyCustomer: v })}
                  />
                </div>
                {whatsappSettings.notifyCustomer && (
                  <div className="space-y-3 pl-6 border-l-2 border-sky-200 dark:border-sky-800">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Customer Message Template</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-[11px] text-sky-600 hover:text-sky-700"
                          onClick={() => handleGenerateAiTemplate('customer')}
                          disabled={generatingAiTemplate === 'customer'}
                        >
                          {generatingAiTemplate === 'customer' ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Sparkles className="size-3" />
                          )}
                          AI Generate
                        </Button>
                      </div>
                      <Textarea
                        className="min-h-[120px] text-sm font-mono"
                        value={whatsappSettings.customerTemplate}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, customerTemplate: e.target.value })}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Available variables: {'{{name}}'}, {'{{phone}}'}, {'{{serviceType}}'}, {'{{description}}'}, {'{{companyName}}'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2 min-w-[160px]"
                  onClick={handleSaveWhatsappSettings}
                  disabled={savingWhatsappSettings}
                >
                  {savingWhatsappSettings ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save WhatsApp Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Event Webhooks */}
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
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAddWebhook(true)}>
                  <Plus className="size-3.5 mr-1" /> Add Webhook
                </Button>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
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
                              <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] shrink-0" variant="outline">Disabled</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
                          {wh.lastTriggered && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <Clock className="size-2.5" /> Last: {new Date(wh.lastTriggered).toLocaleString()}
                              {wh.lastStatus === 'success' && <CheckCircle2 className="size-2.5 text-emerald-500" />}
                              {wh.lastStatus === 'failed' && <XCircle className="size-2.5 text-red-500" />}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTestWebhook(wh.event)} disabled={testingWebhook === wh.event}>
                            {testingWebhook === wh.event ? <Loader2 className="size-3.5 animate-spin" /> : <TestTube2 className="size-3.5" />}
                          </Button>
                          <Switch checked={wh.active} onCheckedChange={(checked) => handleToggleWebhook(wh.id, checked)} className="scale-75" />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteWebhook(wh.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

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
                        <Badge variant="outline" className={`${EVENT_COLORS[et.value] || ''} text-[9px] shrink-0`}>{et.value.replace('job.', '')}</Badge>
                        <span className="truncate">{et.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <KeyRound className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">API Keys</CardTitle>
                  <CardDescription>Manage API keys for external integrations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Production API Key</p>
                    <p className="text-xs text-muted-foreground font-mono">sos_prod_••••••••••••k8m2</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                  <Button variant="ghost" size="sm" className="min-h-[36px]">Revoke</Button>
                </div>
              </div>
              <Button variant="outline" className="gap-2 min-h-[44px]">
                <KeyRound className="size-3.5" /> Generate New Key
              </Button>
            </CardContent>
          </Card>

          {/* ─── Add Webhook Dialog ──────────────────────────────────────────── */}
          <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Event Webhook</DialogTitle>
                <DialogDescription>Configure a webhook URL that fires when a job event occurs</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Webhook Name</Label>
                  <Input
                    placeholder="e.g., n8n - Job Created → WhatsApp"
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
                        <SelectItem key={et.value} value={et.value}>{et.label} — {et.description}</SelectItem>
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
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddWebhook}>Create Webhook</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Billing
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CreditCard className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Subscription & Billing</CardTitle>
                  <CardDescription>Manage your plan, payment method, and billing history</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Zap className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {(auth.tenant?.plan || 'starter').charAt(0).toUpperCase() + (auth.tenant?.plan || 'starter').slice(1)} Plan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {auth.tenant?.planStatus === 'trial' ? 'Free trial active' : 'Active subscription'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="hover:border-emerald-400 hover:text-emerald-700 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                  onClick={() => {
                    const { setCurrentView } = useAppStore.getState();
                    setCurrentView('billing');
                  }}
                >
                  <CreditCard className="size-4 mr-2" /> Manage Billing
                </Button>
              </div>

              {/* Quick plan info */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Plan', value: (auth.tenant?.plan || 'starter').charAt(0).toUpperCase() + (auth.tenant?.plan || 'starter').slice(1) },
                  { label: 'Status', value: auth.tenant?.planStatus === 'trial' ? 'Trial' : 'Active' },
                  { label: 'Users', value: String(users.length) },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-semibold text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: Workspace URL
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="workspace-url" className="space-y-6">
          {/* Workspace URL Card */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Globe className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Workspace URL</CardTitle>
                  <CardDescription>Your unique workspace address on the platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Name (read-only reference) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Name</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                  <Building2 className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm">{auth.tenant?.name || companyForm.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">This is the name entered during registration</p>
              </div>

              <Separator />

              {/* Workspace URL Display / Edit */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Workspace URL</Label>

                {!editingSubdomain ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                      <Globe className="size-5 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <code className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                            {subdomain}
                          </code>
                          <span className="text-lg text-muted-foreground">.{APP_DOMAIN}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={startEditSubdomain}>
                        <RefreshCw className="size-3.5" /> Change
                      </Button>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Status:</Label>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                        <CheckCircle2 className="size-2.5 mr-0.5" /> Active
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="size-4" />
                      <span className="text-sm font-medium">Changing your workspace URL</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your workspace URL will change from <code className="font-mono text-foreground">{subdomain}.{APP_DOMAIN}</code> to the new URL below. This affects how your team and customers access your workspace.
                    </p>

                    {/* New subdomain input */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">New Subdomain</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          className="flex-1 h-11 font-mono"
                          value={newSubdomain}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
                            setNewSubdomain(val);
                            setAvailabilityResult(null);
                          }}
                          placeholder="my-workspace"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">.{APP_DOMAIN}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lowercase letters, numbers, and hyphens only. Minimum 3 characters.
                      </p>
                    </div>

                    {/* Preview */}
                    {newSubdomain && (
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <p className="text-xs text-muted-foreground mb-1">Preview</p>
                        <div className="flex items-center gap-1">
                          <Globe className="size-4 text-emerald-600 shrink-0" />
                          <code className="text-sm font-bold text-foreground">
                            {newSubdomain}.{APP_DOMAIN}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Availability check */}
                    {newSubdomain && newSubdomain !== subdomain && newSubdomain.length >= 3 && (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => checkSubdomainAvailability(newSubdomain)}
                          disabled={checkingAvailability}
                        >
                          {checkingAvailability ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Search className="size-3.5" />
                          )}
                          Check Availability
                        </Button>

                        {availabilityResult && (
                          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                            availabilityResult.available
                              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
                              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                          }`}>
                            {availabilityResult.available ? (
                              <>
                                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    {availabilityResult.subdomain}.{APP_DOMAIN} is available!
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <XCircle className="size-4 text-red-600 shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                    Not available: {availabilityResult.reason}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                        disabled={!availabilityResult?.available || savingSubdomain}
                        onClick={handleSubdomainSave}
                      >
                        {savingSubdomain ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Save New URL
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingSubdomain(false);
                          setAvailabilityResult(null);
                        }}
                      >
                        <X className="size-4 mr-1.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Slug generation explanation */}
              <div className="space-y-3">
                <Separator />
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <ArrowRight className="size-4 text-emerald-600" /> How it works
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <p className="font-medium text-foreground">During Registration</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Company Name:</span>
                          <span className="font-medium">ABC Plumbing</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="size-3 text-emerald-500" />
                          <span className="text-muted-foreground">Auto-generated Slug:</span>
                          <code className="font-mono bg-background px-1.5 py-0.5 rounded border">abc-plumbing</code>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="size-3 text-emerald-500" />
                          <span className="text-muted-foreground">Result:</span>
                          <code className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">abc-plumbing.{APP_DOMAIN}</code>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-medium text-foreground">Can I Change It?</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">From:</span>
                          <code className="font-mono bg-background px-1.5 py-0.5 rounded border">abc-plumbing.{APP_DOMAIN}</code>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="size-3 text-emerald-500" />
                          <span className="text-muted-foreground">To:</span>
                          <code className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">abcplumbing.{APP_DOMAIN}</code>
                        </div>
                        <p className="text-muted-foreground mt-1">You can remove hyphens or simplify your subdomain, subject to availability.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Domain (info only) */}
              {customDomain && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Custom Domain</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                      <ExternalLink className="size-4 text-muted-foreground shrink-0" />
                      <code className="text-sm font-mono">{customDomain}</code>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 ml-auto">
                        Custom
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
