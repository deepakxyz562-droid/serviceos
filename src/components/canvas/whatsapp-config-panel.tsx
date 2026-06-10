'use client';
import { authFetch } from '@/lib/client-auth';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflowStore } from '@/store/workflow-store';
import { getNodeTypeDefinition } from '@/lib/node-registry';
import type { WorkflowNode } from '@/types/workflow';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  X, Trash2, Settings, StickyNote, MessageCircle, Plus, Wrench, Eye,
  Copy, List, MousePointerClick, Flame, ChevronDown, ChevronUp, Phone,
  Zap, Shield, Users, Pencil, RefreshCw, ChevronRight, AlertCircle,
  Key, Lock, Globe, EyeOff, CheckCircle2, UserCheck, Link, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WhatsAppButton {
  id: string;
  label: string;
  quickSetup?: string;
  onClickAction?: {
    contactList: string;
    webhookUrl: string;
  };
}

interface WhatsAppListRow {
  id: string;
  title: string;
  description: string;
}

interface WhatsAppListSection {
  id: string;
  title: string;
  rows: WhatsAppListRow[];
}

interface ContactListEntry {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role?: string | null;
  employeeId?: string | null;
  customerId?: string | null;
  whatsappId?: string | null;
  avatar?: string | null;
  isLive?: boolean;
}

interface ContactList {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  roleFilter?: string | null;
  entryCount: number;
  createdAt: string;
}

interface CredentialItem {
  id: string;
  name: string;
  type: string;
  data: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface CredentialFormData {
  name: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
}

interface DynamicListSource {
  enabled: boolean;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  arrayPath: string;
  idField: string;
  titleField: string;
  descField: string;
  sectionTitle?: string;
}

interface DataEndpointConfig {
  enabled: boolean;
  path: string;           // Auto-generated UUID path
  sourceType: 'drivers' | 'employees' | 'resources' | 'custom';
  filters: {
    status?: string;
    role?: string;
  };
  fields: {
    idField: string;
    titleField: string;
    descField: string;
  };
  sectionTitle: string;
}

interface OnSelectAction {
  enabled: boolean;
  actionType: 'webhook' | 'workflow' | 'updateJobAssignee';
  webhookUrl: string;
  method: string;
  workflowId?: string;
  contextData?: Record<string, string>;  // Resolved context data passed to triggered workflow (e.g., jobId)
}

interface WhatsAppConfigPanelProps {
  node: WorkflowNode;
}

// ─── Quick Setup Presets ─────────────────────────────────────────────────────

const QUICK_SETUP_PRESETS: Record<string, { label: string; buttons: WhatsAppButton[] }> = {
  jobAssign: {
    label: 'Job + Assign Button',
    buttons: [
      { id: 'btn-assign', label: 'Assign to Me', quickSetup: 'jobAssign', onClickAction: { contactList: '', webhookUrl: '' } },
      { id: 'btn-reject', label: 'Reject', quickSetup: 'jobAssign', onClickAction: { contactList: '', webhookUrl: '' } },
    ],
  },
  acceptReject: {
    label: 'Accept / Reject',
    buttons: [
      { id: 'btn-accept', label: 'Accept', quickSetup: 'acceptReject', onClickAction: { contactList: '', webhookUrl: '' } },
      { id: 'btn-reject', label: 'Reject', quickSetup: 'acceptReject', onClickAction: { contactList: '', webhookUrl: '' } },
    ],
  },
  trackJob: {
    label: 'Track Job',
    buttons: [
      { id: 'btn-track', label: 'Track Job', quickSetup: 'trackJob', onClickAction: { contactList: '', webhookUrl: '' } },
      { id: 'btn-details', label: 'View Details', quickSetup: 'trackJob', onClickAction: { contactList: '', webhookUrl: '' } },
      { id: 'btn-complete', label: 'Mark Complete', quickSetup: 'trackJob', onClickAction: { contactList: '', webhookUrl: '' } },
    ],
  },
};

const LIST_QUICK_SETUP_PRESETS: Record<string, { label: string; buttonText: string; sections: WhatsAppListSection[] }> = {
  driverList: {
    label: 'Driver List',
    buttonText: 'Select Driver',
    sections: [
      {
        id: `sec-${Date.now()}-drivers`,
        title: 'Available Drivers',
        rows: [
          { id: 'driver_1', title: 'Driver 1', description: 'Available · 5 min away' },
          { id: 'driver_2', title: 'Driver 2', description: 'Available · 10 min away' },
          { id: 'driver_3', title: 'Driver 3', description: 'Available · 15 min away' },
        ],
      },
    ],
  },
  jobActions: {
    label: 'Job Actions',
    buttonText: 'Actions',
    sections: [
      {
        id: `sec-${Date.now()}-status`,
        title: 'Update Status',
        rows: [
          { id: 'action_accept', title: 'Accept Job', description: 'Accept this job assignment' },
          { id: 'action_reject', title: 'Reject Job', description: 'Decline this job assignment' },
        ],
      },
      {
        id: `sec-${Date.now()}-info`,
        title: 'Get Info',
        rows: [
          { id: 'info_details', title: 'View Details', description: 'See full job details' },
          { id: 'info_track', title: 'Track Job', description: 'Track job progress' },
        ],
      },
    ],
  },
  deliveryOptions: {
    label: 'Delivery Options',
    buttonText: 'Choose Option',
    sections: [
      {
        id: `sec-${Date.now()}-priority`,
        title: 'Priority',
        rows: [
          { id: 'priority_high', title: 'Urgent', description: 'Deliver within 1 hour' },
          { id: 'priority_normal', title: 'Standard', description: 'Deliver within 4 hours' },
          { id: 'priority_scheduled', title: 'Scheduled', description: 'Pick a delivery time' },
        ],
      },
      {
        id: `sec-${Date.now()}-vehicle`,
        title: 'Vehicle Type',
        rows: [
          { id: 'vehicle_bike', title: 'Bike', description: 'Two-wheeler delivery' },
          { id: 'vehicle_car', title: 'Car', description: 'Four-wheeler delivery' },
          { id: 'vehicle_truck', title: 'Truck', description: 'Heavy delivery' },
        ],
      },
    ],
  },
};

const EMPTY_CREDENTIAL_FORM: CredentialFormData = {
  name: '',
  accessToken: '',
  phoneNumberId: '',
  businessAccountId: '',
  webhookVerifyToken: '',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function WhatsAppConfigPanel({ node }: WhatsAppConfigPanelProps) {
  const { updateNode, removeNodes, setSelectedNodes } = useWorkflowStore();
  const nodeDef = getNodeTypeDefinition(node.data.nodeType);
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[nodeDef?.icon || 'MessageCircle'] || LucideIcons.MessageCircle;

  // ─── Local state from node config ─────────────────────────────────────────
  const [localName, setLocalName] = useState(node.name);
  const [operation, setOperation] = useState<string>(node.data.config?.operation || 'sendInteractive');
  const [phoneNumber, setPhoneNumber] = useState<string>(node.data.config?.phoneNumber || '');
  const [bodyText, setBodyText] = useState<string>(node.data.config?.bodyText || '');
  const [templateName, setTemplateName] = useState<string>(node.data.config?.templateName || '');
  const [templateLanguage, setTemplateLanguage] = useState<string>(node.data.config?.templateLanguage || 'en_US');
  const [templateParameters, setTemplateParameters] = useState<{id: string; value: string}[]>(node.data.config?.templateParameters || []);
  const [interactiveType, setInteractiveType] = useState<string>(node.data.config?.interactiveType || 'button');
  const [buttons, setButtons] = useState<WhatsAppButton[]>(node.data.config?.buttons || []);
  const [headerText, setHeaderText] = useState<string>(node.data.config?.headerText || '');
  const [footerText, setFooterText] = useState<string>(node.data.config?.footerText || '');
  const [listButtonText, setListButtonText] = useState<string>(node.data.config?.listButtonText || 'Options');
  const [listSections, setListSections] = useState<WhatsAppListSection[]>(node.data.config?.listSections || []);
  const [listDynamicSource, setListDynamicSource] = useState<DynamicListSource>(node.data.config?.listDynamicSource || {
    enabled: false,
    url: '',
    method: 'GET',
    arrayPath: '',
    idField: 'id',
    titleField: 'name',
    descField: '',
    sectionTitle: 'Options',
  });
  const [onSelectAction, setOnSelectAction] = useState<OnSelectAction>(node.data.config?.onSelectAction || {
    enabled: false,
    actionType: 'webhook',
    webhookUrl: '',
    method: 'POST',
    workflowId: '',
  });
  const [ctaButtonText, setCtaButtonText] = useState<string>(node.data.config?.ctaButtonText || 'Click Here');
  const [ctaUrl, setCtaUrl] = useState<string>(node.data.config?.ctaUrl || '');
  const [localNotes, setLocalNotes] = useState(node.data.notes || '');
  const [credentialId, setCredentialId] = useState<string>(node.data.config?.credentialId || '');
  const [language, setLanguage] = useState<string>(node.data.config?.language || 'en');

  // ─── Contact lists state ──────────────────────────────────────────────────
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [contactListsLoading, setContactListsLoading] = useState(false);

  // ─── Credentials state ────────────────────────────────────────────────────
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialItem | null>(null);
  const [credentialForm, setCredentialForm] = useState<CredentialFormData>(EMPTY_CREDENTIAL_FORM);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testingTemplate, setTestingTemplate] = useState(false);

  // ─── Expanded buttons state ───────────────────────────────────────────────
  const [expandedButtons, setExpandedButtons] = useState<Set<string>>(new Set());

  // ─── Expanded list sections state ─────────────────────────────────────────
  const [expandedListSections, setExpandedListSections] = useState<Set<string>>(new Set());

  // ─── Dynamic list & on-select collapsible sections ─────────────────────────
  const [dynamicListExpanded, setDynamicListExpanded] = useState(false);
  const [onSelectActionExpanded, setOnSelectActionExpanded] = useState(false);

  // ─── Data endpoint state ───────────────────────────────────────────────────
  const [dataEndpointExpanded, setDataEndpointExpanded] = useState(false);
  const [dataEndpointConfig, setDataEndpointConfig] = useState<DataEndpointConfig>(node.data.config?.dataEndpointConfig || {
    enabled: false,
    path: '',
    sourceType: 'drivers',
    filters: { status: 'available', role: 'driver' },
    fields: { idField: 'id', titleField: 'name', descField: 'status' },
    sectionTitle: 'Available Drivers',
  });

  // ─── Workflows state ───────────────────────────────────────────────────────
  const [workflows, setWorkflows] = useState<{id: string; name: string; active: boolean}[]>([]);

  // ─── Test fetch state ──────────────────────────────────────────────────────
  const [testFetchResult, setTestFetchResult] = useState<{success: boolean; rows: any[]; error?: string} | null>(null);
  const [testFetching, setTestFetching] = useState(false);

  // ─── Preview toggle ───────────────────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(false);

  // ─── Active tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('parameters');

  // ─── Sync config to store (debounced, skip first mount) ──────────────────
  const isInitialMount = useRef(true);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncConfig = useCallback(() => {
    const config: Record<string, unknown> = {
      operation,
      phoneNumber,
      bodyText,
      interactiveType,
      buttons,
      headerText,
      footerText,
      templateName,
      templateLanguage,
      templateParameters,
      credentialId,
      language,
      listButtonText,
      listSections,
      listDynamicSource,
      onSelectAction,
      dataEndpointConfig,
      ctaButtonText,
      ctaUrl,
    };
    updateNode(node.id, { config });
  }, [node.id, operation, phoneNumber, bodyText, interactiveType, buttons, headerText, footerText, templateName, templateLanguage, templateParameters, credentialId, language, listButtonText, listSections, listDynamicSource, onSelectAction, dataEndpointConfig, ctaButtonText, ctaUrl, updateNode]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncConfig();
    }, 300);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [syncConfig]);

  // ─── Fetch contact lists on mount ─────────────────────────────────────────
  useEffect(() => {
    const fetchContactLists = async () => {
      setContactListsLoading(true);
      try {
        const res = await authFetch('/api/contact-lists');
        if (res.ok) {
          const data = await res.json();
          setContactLists(data);
        }
      } catch (err) {
        console.error('Failed to fetch contact lists:', err);
      } finally {
        setContactListsLoading(false);
      }
    };
    fetchContactLists();
  }, []);

  // ─── Fetch credentials on mount ───────────────────────────────────────────
  const fetchCredentials = useCallback(async () => {
    setCredentialsLoading(true);
    try {
      const res = await authFetch('/api/credentials?type=whatsapp');
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // ─── Fetch workflows on mount ─────────────────────────────────────────────
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await authFetch('/api/workflows');
        if (res.ok) {
          const data = await res.json();
          const workflowList = Array.isArray(data) ? data : (data.workflows || []);
          setWorkflows(workflowList.map((w: any) => ({ id: w.id, name: w.name, active: w.active })));
        }
      } catch (err) {
        console.error('Failed to fetch workflows:', err);
      }
    };
    fetchWorkflows();
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNameChange = useCallback((name: string) => {
    setLocalName(name);
    const storeNodes = useWorkflowStore.getState().nodes;
    const updatedNodes = storeNodes.map((n) =>
      n.id === node.id ? { ...n, name } : n,
    );
    useWorkflowStore.setState({ nodes: updatedNodes });
  }, [node.id]);

  const handleNotesChange = useCallback((notes: string) => {
    setLocalNotes(notes);
    updateNode(node.id, { notes });
  }, [node.id, updateNode]);

  const handleDelete = useCallback(() => {
    removeNodes([node.id]);
    setSelectedNodes([]);
  }, [node.id, removeNodes, setSelectedNodes]);

  const handleDisableToggle = useCallback(() => {
    updateNode(node.id, { disabled: !node.data.disabled });
  }, [node.id, node.data.disabled, updateNode]);

  // ─── Credential handlers ──────────────────────────────────────────────────
  const handleOpenCredentialDialog = useCallback((credential?: CredentialItem) => {
    if (credential) {
      setEditingCredential(credential);
      setCredentialForm({
        name: credential.name,
        accessToken: credential.data?.accessToken || '',
        phoneNumberId: credential.data?.phoneNumberId || '',
        businessAccountId: credential.data?.businessAccountId || '',
        webhookVerifyToken: credential.data?.webhookVerifyToken || '',
      });
    } else {
      setEditingCredential(null);
      setCredentialForm(EMPTY_CREDENTIAL_FORM);
    }
    setTestResult(null);
    setCredentialDialogOpen(true);
  }, []);

  const handleSaveCredential = useCallback(async () => {
    if (!credentialForm.name.trim()) {
      toast.error('Credential name is required');
      return;
    }

    try {
      if (editingCredential) {
        // Update existing credential
        const res = await authFetch(`/api/credentials/${editingCredential.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: credentialForm.name,
            type: 'whatsapp',
            data: {
              accessToken: credentialForm.accessToken,
              phoneNumberId: credentialForm.phoneNumberId,
              businessAccountId: credentialForm.businessAccountId,
              webhookVerifyToken: credentialForm.webhookVerifyToken,
            },
          }),
        });
        if (res.ok) {
          toast.success('Credential updated');
        } else {
          toast.error('Failed to update credential');
          return;
        }
      } else {
        // Create new credential
        const res = await authFetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: credentialForm.name,
            type: 'whatsapp',
            data: {
              accessToken: credentialForm.accessToken,
              phoneNumberId: credentialForm.phoneNumberId,
              businessAccountId: credentialForm.businessAccountId,
              webhookVerifyToken: credentialForm.webhookVerifyToken,
            },
          }),
        });
        if (res.ok) {
          toast.success('Credential created');
        } else {
          toast.error('Failed to create credential');
          return;
        }
      }

      setCredentialDialogOpen(false);
      setEditingCredential(null);
      setCredentialForm(EMPTY_CREDENTIAL_FORM);
      await fetchCredentials();
    } catch (err) {
      console.error('Failed to save credential:', err);
      toast.error('Failed to save credential');
    }
  }, [editingCredential, credentialForm, fetchCredentials]);

  const handleDeleteCredential = useCallback(async (credId: string) => {
    try {
      const res = await authFetch(`/api/credentials/${credId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Credential deleted');
        if (credentialId === credId) {
          setCredentialId('');
        }
        await fetchCredentials();
      } else {
        toast.error('Failed to delete credential');
      }
    } catch (err) {
      console.error('Failed to delete credential:', err);
      toast.error('Failed to delete credential');
    }
  }, [credentialId, fetchCredentials]);

  const handleTestConnection = useCallback(async () => {
    setTestingConnection(true);
    setTestResult(null);

    if (!credentialForm.accessToken || !credentialForm.phoneNumberId) {
      setTestResult('error');
      toast.error('Access Token and Phone Number ID are required');
      setTestingConnection(false);
      return;
    }

    try {
      // Real API validation: call the WhatsApp Business Account endpoint to verify credentials
      const url = `https://graph.facebook.com/v25.0/${credentialForm.phoneNumberId}?access_token=${credentialForm.accessToken}`;
      const response = await authFetch(url);
      const data = await response.json();

      if (response.ok && data.id) {
        setTestResult('success');
        toast.success(`Connection successful! Phone: ${data.verified_name || data.display_phone_number || data.id}`);
      } else {
        const errorCode = data?.error?.code;
        const errorSubcode = data?.error?.error_subcode;
        let errorMsg = data?.error?.message || `API returned status ${response.status}`;

        // Provide specific guidance for expired tokens
        if (errorCode === 190 || String(errorSubcode) === '463') {
          errorMsg = 'Access token has EXPIRED. Generate a new token in Meta Business Suite → System Users → Generate New Token, then update it here.';
        } else if (errorCode === 190) {
          errorMsg = 'Access token is invalid. Please generate a new token in Meta Business Suite and paste it here.';
        }

        setTestResult('error');
        toast.error(`Connection failed: ${errorMsg}`, { duration: 6000 });
      }
    } catch (error: any) {
      setTestResult('error');
      toast.error(`Connection failed: ${error.message || 'Network error'}`);
    }

    setTestingConnection(false);
  }, [credentialForm]);

  // ─── Button management ────────────────────────────────────────────────────
  const addButton = useCallback(() => {
    if (buttons.length >= 3) {
      toast.error('Maximum 3 buttons allowed');
      return;
    }
    const newBtn: WhatsAppButton = {
      id: `btn-${Date.now()}`,
      label: '',
      quickSetup: undefined,
      onClickAction: { contactList: '', webhookUrl: '' },
    };
    setButtons((prev) => [...prev, newBtn]);
  }, [buttons.length]);

  const removeButton = useCallback((btnId: string) => {
    setButtons((prev) => prev.filter((b) => b.id !== btnId));
    setExpandedButtons((prev) => {
      const next = new Set(prev);
      next.delete(btnId);
      return next;
    });
  }, []);

  const updateButton = useCallback((btnId: string, updates: Partial<WhatsAppButton>) => {
    setButtons((prev) =>
      prev.map((b) => (b.id === btnId ? { ...b, ...updates } : b)),
    );
  }, []);

  const toggleButtonExpand = useCallback((btnId: string) => {
    setExpandedButtons((prev) => {
      const next = new Set(prev);
      if (next.has(btnId)) {
        next.delete(btnId);
      } else {
        next.add(btnId);
      }
      return next;
    });
  }, []);

  const applyQuickSetup = useCallback((presetKey: string) => {
    const preset = QUICK_SETUP_PRESETS[presetKey];
    if (!preset) return;

    // Find the "Drivers" role_based list for dynamic assignment
    const driversList = contactLists.find((cl) => cl.type === 'role_based' && cl.roleFilter === 'driver');
    const driversListId = driversList?.id || '';

    const newButtons: WhatsAppButton[] = preset.buttons.map((btn, idx) => ({
      ...btn,
      id: `btn-${Date.now()}-${idx}`,
      onClickAction: {
        contactList: presetKey === 'jobAssign' ? driversListId : '',
        webhookUrl: '',
      },
    }));

    setButtons(newButtons);
    // Expand all new buttons
    setExpandedButtons(new Set(newButtons.map((b) => b.id)));
    toast.success(`Applied "${preset.label}" preset`);
  }, [contactLists]);

  // ─── List section/row management ───────────────────────────────────────────
  const totalListRows = listSections.reduce((sum, sec) => sum + sec.rows.length, 0);

  const addListSection = useCallback(() => {
    if (listSections.length >= 10) {
      toast.error('Maximum 10 sections allowed');
      return;
    }
    const newSection: WhatsAppListSection = {
      id: `sec-${Date.now()}`,
      title: '',
      rows: [],
    };
    setListSections((prev) => [...prev, newSection]);
    // Auto-expand the new section
    setExpandedListSections((prev) => new Set([...prev, newSection.id]));
  }, [listSections.length]);

  const removeListSection = useCallback((sectionId: string) => {
    setListSections((prev) => prev.filter((s) => s.id !== sectionId));
    setExpandedListSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  }, []);

  const updateListSection = useCallback((sectionId: string, updates: Partial<WhatsAppListSection>) => {
    setListSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
    );
  }, []);

  const toggleListSectionExpand = useCallback((sectionId: string) => {
    setExpandedListSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const addListRow = useCallback((sectionId: string) => {
    const currentRows = listSections.find((s) => s.id === sectionId)?.rows.length || 0;
    if (currentRows >= 10) {
      toast.error('Maximum 10 rows per section');
      return;
    }
    if (totalListRows >= 10) {
      toast.error('Maximum 10 total rows across all sections');
      return;
    }
    const newRow: WhatsAppListRow = {
      id: `row-${Date.now()}`,
      title: '',
      description: '',
    };
    setListSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, rows: [...s.rows, newRow] } : s,
      ),
    );
  }, [listSections, totalListRows]);

  const removeListRow = useCallback((sectionId: string, rowId: string) => {
    setListSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, rows: s.rows.filter((r) => r.id !== rowId) } : s,
      ),
    );
  }, []);

  const updateListRow = useCallback((sectionId: string, rowId: string, updates: Partial<WhatsAppListRow>) => {
    setListSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...updates } : r)) }
          : s,
      ),
    );
  }, []);

  const applyListQuickSetup = useCallback((presetKey: string) => {
    const preset = LIST_QUICK_SETUP_PRESETS[presetKey];
    if (!preset) return;

    // Re-generate IDs to avoid collisions
    const newSections: WhatsAppListSection[] = preset.sections.map((sec, si) => ({
      ...sec,
      id: `sec-${Date.now()}-${si}`,
      rows: sec.rows.map((row, ri) => ({
        ...row,
        id: row.id || `row-${Date.now()}-${si}-${ri}`,
      })),
    }));

    setListButtonText(preset.buttonText);
    setListSections(newSections);
    setExpandedListSections(new Set(newSections.map((s) => s.id)));
    toast.success(`Applied "${preset.label}" list preset`);
  }, []);

  // ─── Test Fetch for dynamic list ──────────────────────────────────────────
  const handleTestFetch = useCallback(async () => {
    if (!listDynamicSource.url) {
      toast.error('API URL is required');
      return;
    }
    setTestFetching(true);
    setTestFetchResult(null);
    try {
      const fetchOptions: RequestInit = {
        method: listDynamicSource.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      };
      if (listDynamicSource.method === 'POST' && listDynamicSource.body) {
        fetchOptions.body = listDynamicSource.body;
      }
      const response = await authFetch(listDynamicSource.url, fetchOptions);
      if (!response.ok) {
        setTestFetchResult({ success: false, rows: [], error: `API returned ${response.status}` });
        return;
      }
      const data = await response.json();
      // Navigate to array
      let arrayData = data;
      if (listDynamicSource.arrayPath) {
        const parts = listDynamicSource.arrayPath.split('.');
        for (const part of parts) {
          arrayData = arrayData?.[part];
        }
      }
      if (!Array.isArray(arrayData)) {
        setTestFetchResult({ success: false, rows: [], error: `Path "${listDynamicSource.arrayPath}" did not resolve to an array` });
        return;
      }
      const rows = arrayData.slice(0, 5).map((item: any, idx: number) => ({
        id: String(item[listDynamicSource.idField || 'id'] ?? idx + 1),
        title: String(item[listDynamicSource.titleField || 'name'] ?? `Item ${idx + 1}`),
        description: listDynamicSource.descField ? String(item[listDynamicSource.descField] || '') : '',
      }));
      setTestFetchResult({ success: true, rows });
    } catch (error: any) {
      setTestFetchResult({ success: false, rows: [], error: error.message });
    } finally {
      setTestFetching(false);
    }
  }, [listDynamicSource]);

  // ─── WhatsApp Preview ─────────────────────────────────────────────────────
  const getPreviewText = useCallback(() => {
    let text = bodyText || 'Your message here...';
    // Replace template variables with sample values for preview
    text = text.replace(/\{\{\s*\$json\.body\.new\.title\s*\}\}/g, 'New Delivery Job');
    text = text.replace(/\{\{\s*\$json\.body\.new\.description\s*\}\}/g, 'Urgent delivery needed');
    text = text.replace(/\{\{\s*job\.title\s*\}\}/g, 'Delivery Job #1001');
    text = text.replace(/\{\{\s*job\.location\s*\}\}/g, 'Delhi NCR');
    text = text.replace(/\{\{\s*[\w.$]+\s*\}\}/g, '[value]');
    return text;
  }, [bodyText]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="w-96 border-l bg-white flex flex-col shrink-0 h-full overflow-hidden"
      data-config-panel="true"
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Prevent React Flow keyboard shortcuts (delete, backspace) from firing while typing
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.stopPropagation();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center justify-center size-7 rounded', nodeDef?.color || 'bg-emerald-600')}>
            <IconComponent className="size-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">WhatsApp Business Cloud</h3>
            <p className="text-[10px] text-gray-400">communication</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setSelectedNodes([])}
        >
          <X className="size-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 mx-3 mt-2 shrink-0">
          <TabsTrigger value="parameters" className="text-xs">Parameters</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
        </TabsList>

        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          {/* ─── Parameters Tab Content ──────────────────────────────────────── */}
          {activeTab === 'parameters' && (
            <div className="p-3 space-y-3">
              {/* Node Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  value={localName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <Separator className="my-2" />

              {/* Operation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Operation</Label>
                <Select value={operation} onValueChange={setOperation}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sendText" className="text-xs">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3" />
                        Send Text
                      </div>
                    </SelectItem>
                    <SelectItem value="sendTemplate" className="text-xs">
                      <div className="flex items-center gap-2">
                        <List className="size-3" />
                        Send Template
                      </div>
                    </SelectItem>
                    <SelectItem value="sendInteractive" className="text-xs">
                      <div className="flex items-center gap-2">
                        <MousePointerClick className="size-3" />
                        Send Interactive
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Info note for text/interactive — only relevant for cold outreach */}
              {(operation === 'sendText' || operation === 'sendInteractive') && (
                <p className="text-[10px] text-gray-400">
                  For cold outreach to new customers who haven&apos;t messaged you yet, use <strong>Send Template</strong>.
                </p>
              )}

              {/* Template parameter warning */}
              {operation === 'sendTemplate' && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-blue-50 border border-blue-200">
                  <AlertCircle className="size-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-[10px] text-blue-700 space-y-0.5">
                    <p className="font-medium">Template Parameters</p>
                    <p>Add parameters below only if your template has defined body variables. <code className="bg-blue-100 px-0.5 rounded">hello_world</code> has <strong>0 parameters</strong> — leave empty. The number of parameters must match your template definition exactly, otherwise WhatsApp returns error #132000.</p>
                  </div>
                </div>
              )}

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone Number</Label>
                <div className="relative">
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 9876543210"
                    className="h-8 text-sm pr-10"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 font-mono">
                    {'{{ }}'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Supports expressions like {'{{ $json.phone }}'}
                </p>
              </div>

              {/* Template fields (when sendTemplate) */}
              {operation === 'sendTemplate' && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Template Name</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. job_assignment"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Template Language</Label>
                    <Select value={templateLanguage} onValueChange={setTemplateLanguage}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_US" className="text-xs">English (US)</SelectItem>
                        <SelectItem value="en_GB" className="text-xs">English (UK)</SelectItem>
                        <SelectItem value="en" className="text-xs">English</SelectItem>
                        <SelectItem value="hi" className="text-xs">Hindi</SelectItem>
                        <SelectItem value="es" className="text-xs">Spanish</SelectItem>
                        <SelectItem value="pt_br" className="text-xs">Portuguese (BR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Message Body — for text/interactive operations */}
              {operation !== 'sendTemplate' && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Message Body</Label>
                    <Textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      placeholder="Type your message... Use {{ $json.body.new.title }} for variables"
                      className="min-h-[100px] text-xs font-mono"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                        setBodyText((prev) => prev + '{{ $json.body.new.title }}');
                      }}>
                        {'{{ $json.body.new.title }}'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                        setBodyText((prev) => prev + '{{ $json.body.new.description }}');
                      }}>
                        {'{{ $json.body.new.description }}'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                        setBodyText((prev) => prev + '{{ $json.body.phone }}');
                      }}>
                        {'{{ $json.body.phone }}'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                        setBodyText((prev) => prev + '{{ $trigger.body.new.title }}');
                      }}>
                        {'{{ $trigger.body.new.title }}'}
                      </Badge>
                    </div>
                  </div>
                </>
              )}

              {/* Template Parameters — for template operation */}
              {operation === 'sendTemplate' && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Template Body Parameters</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => {
                          setTemplateParameters((prev) => [...prev, { id: `param-${Date.now()}`, value: '' }]);
                        }}
                      >
                        <Plus className="size-3" />
                        Add Param
                      </Button>
                    </div>
                    {templateParameters.length === 0 && (
                      <div className="text-center py-3 text-xs text-gray-400 border border-dashed rounded-md">
                        No parameters — template will be sent without body components.
                        <br />
                        <span className="text-[10px]">This is correct for templates like <code className="bg-gray-100 px-0.5 rounded">hello_world</code> that have 0 parameters.</span>
                      </div>
                    )}
                    {templateParameters.map((param, idx) => (
                      <div key={param.id} className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px] h-5 shrink-0">
                          {idx + 1}
                        </Badge>
                        <Input
                          value={param.value}
                          onChange={(e) => {
                            setTemplateParameters((prev) =>
                              prev.map((p) => p.id === param.id ? { ...p, value: e.target.value } : p),
                            );
                          }}
                          placeholder={`Parameter {{${idx + 1}}} value... e.g. {{ $json.body.new.title }}`}
                          className="h-7 text-xs font-mono flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-red-400 hover:text-red-600 shrink-0"
                          onClick={() => {
                            setTemplateParameters((prev) => prev.filter((p) => p.id !== param.id));
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ))}
                    {templateParameters.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-gray-400">Quick add:</span>
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                          setTemplateParameters((prev) => [...prev, { id: `param-${Date.now()}`, value: '{{ $json.body.new.title }}' }]);
                        }}>
                          {'{{ $json.body.new.title }}'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                          setTemplateParameters((prev) => [...prev, { id: `param-${Date.now()}`, value: '{{ $json.body.new.description }}' }]);
                        }}>
                          {'{{ $json.body.new.description }}'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-gray-50" onClick={() => {
                          setTemplateParameters((prev) => [...prev, { id: `param-${Date.now()}`, value: '{{ $trigger.body.new.title }}' }]);
                        }}>
                          {'{{ $trigger.body.new.title }}'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Interactive Type (when sendInteractive) */}
              {operation === 'sendInteractive' && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Interactive Type</Label>
                    <Select value={interactiveType} onValueChange={setInteractiveType}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="button" className="text-xs">
                          <div className="flex items-center gap-2">
                            <MousePointerClick className="size-3" />
                            Button
                          </div>
                        </SelectItem>
                        <SelectItem value="list" className="text-xs">
                          <div className="flex items-center gap-2">
                            <List className="size-3" />
                            List
                          </div>
                        </SelectItem>
                        <SelectItem value="cta_url" className="text-xs">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="size-3" />
                            CTA URL
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Button Configuration (when type=button) */}
                  {interactiveType === 'button' && (
                    <div className="space-y-3">
                      {/* Quick Setup Presets */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Zap className="size-3" />
                          Quick Setup
                        </Label>
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(QUICK_SETUP_PRESETS).map(([key, preset]) => (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => applyQuickSetup(key)}
                            >
                              <Flame className="size-3" />
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Buttons list */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <MousePointerClick className="size-3" />
                            Buttons ({buttons.length}/3)
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1"
                            onClick={addButton}
                            disabled={buttons.length >= 3}
                          >
                            <Plus className="size-3" />
                            Add
                          </Button>
                        </div>

                        {buttons.length === 0 && (
                          <div className="text-center py-4 text-xs text-gray-400 border border-dashed rounded-md">
                            No buttons configured. Use Quick Setup or Add manually.
                          </div>
                        )}

                        {buttons.map((btn, idx) => (
                          <Card key={btn.id} className="border">
                            <CardContent className="p-2.5 space-y-2">
                              {/* Button header */}
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {idx + 1}
                                </Badge>
                                <Input
                                  value={btn.label}
                                  onChange={(e) => updateButton(btn.id, { label: e.target.value })}
                                  placeholder="Button label"
                                  className="h-7 text-xs flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => toggleButtonExpand(btn.id)}
                                >
                                  {expandedButtons.has(btn.id) ? (
                                    <ChevronUp className="size-3" />
                                  ) : (
                                    <ChevronDown className="size-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-red-400 hover:text-red-600"
                                  onClick={() => removeButton(btn.id)}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>

                              {/* Button ID hint */}
                              <div className="text-[10px] text-gray-400 pl-6">
                                ID: {btn.id}
                                {btn.quickSetup && (
                                  <Badge variant="outline" className="ml-1.5 text-[9px] h-4">
                                    {QUICK_SETUP_PRESETS[btn.quickSetup]?.label || btn.quickSetup}
                                  </Badge>
                                )}
                              </div>

                              {/* Expanded: On Button Click Action */}
                              {expandedButtons.has(btn.id) && (
                                <div className="ml-6 mt-1 space-y-2">
                                  <div className="rounded-md border border-violet-200 bg-violet-50 p-2.5 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                                      <MousePointerClick className="size-3" />
                                      On Button Click Action
                                    </div>

                                    {/* Contact List Dropdown */}
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-violet-600">Contact List</Label>
                                      <Select
                                        value={btn.onClickAction?.contactList || 'none'}
                                        onValueChange={(val) =>
                                          updateButton(btn.id, {
                                            onClickAction: {
                                              ...btn.onClickAction,
                                              contactList: val === 'none' ? '' : val,
                                              webhookUrl: btn.onClickAction?.webhookUrl || '',
                                            },
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-7 text-xs border-violet-200">
                                          <SelectValue placeholder="Select list..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none" className="text-xs">
                                            <em>None</em>
                                          </SelectItem>
                                          {contactLists.map((cl) => (
                                            <SelectItem key={cl.id} value={cl.id} className="text-xs">
                                              <div className="flex items-center gap-1.5">
                                                <span>{cl.name}</span>
                                                <Badge variant="outline" className="text-[9px] h-4">
                                                  {cl.type}
                                                </Badge>
                                                <span className="text-gray-400">({cl.entryCount})</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Manage Lists Button */}
                                    <ContactListManagerDialog
                                      contactLists={contactLists}
                                      setContactLists={setContactLists}
                                      contactListsLoading={contactListsLoading}
                                      setContactListsLoading={setContactListsLoading}
                                    />

                                    {/* Webhook URL */}
                                    <div className="space-y-1">
                                      <Label className="text-[10px] text-violet-600">Webhook URL</Label>
                                      <Input
                                        value={btn.onClickAction?.webhookUrl || ''}
                                        onChange={(e) =>
                                          updateButton(btn.id, {
                                            onClickAction: {
                                              contactList: btn.onClickAction?.contactList || '',
                                              webhookUrl: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="https://your-api.com/callback"
                                        className="h-7 text-xs border-violet-200"
                                      />
                                    </div>

                                    {/* Info text */}
                                    <div className="flex items-start gap-1.5 text-[10px] text-violet-500">
                                      <AlertCircle className="size-3 mt-0.5 shrink-0" />
                                      <span>
                                        When no contact list is selected, the button click will be logged only.
                                        With a contact list, the next recipient will be selected from the list.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* On-Select Action for BUTTON type (also supports workflow trigger) */}
                  {interactiveType === 'button' && buttons.length > 0 && (
                    <div className="rounded-md border border-violet-200 bg-violet-50/50 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-2.5 hover:bg-violet-50 transition-colors"
                        onClick={() => setOnSelectActionExpanded(!onSelectActionExpanded)}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                          <Zap className="size-3.5" />
                          On Button Click
                          {onSelectAction.enabled && (
                            <Badge variant="secondary" className="text-[9px] h-4 bg-violet-100 text-violet-700 border-violet-200 ml-1">
                              Enabled
                            </Badge>
                          )}
                        </div>
                        {onSelectActionExpanded ? (
                          <ChevronUp className="size-3.5 text-violet-500" />
                        ) : (
                          <ChevronDown className="size-3.5 text-violet-500" />
                        )}
                      </button>

                      {onSelectActionExpanded && (
                        <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-violet-200">
                          <div className="flex items-center justify-between pt-2">
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-violet-700 font-medium">Enabled</Label>
                              <p className="text-[9px] text-violet-500">Trigger an action when a button is clicked</p>
                            </div>
                            <Switch
                              checked={onSelectAction.enabled}
                              onCheckedChange={(checked) => setOnSelectAction((prev) => ({ ...prev, enabled: checked }))}
                            />
                          </div>

                          {onSelectAction.enabled && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-violet-600">Action Type</Label>
                                <Select
                                  value={onSelectAction.actionType || 'workflow'}
                                  onValueChange={(val) => {
                                    setOnSelectAction((prev) => ({
                                      ...prev,
                                      actionType: val as 'webhook' | 'workflow' | 'updateJobAssignee',
                                      method: val === 'workflow' ? 'workflow' : 'POST',
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs border-violet-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="workflow" className="text-xs">Trigger Workflow</SelectItem>
                                    <SelectItem value="webhook" className="text-xs">Call Webhook</SelectItem>
                                    <SelectItem value="updateJobAssignee" className="text-xs">Update Job Assignee</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {onSelectAction.actionType === 'workflow' && (
                                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 space-y-1">
                                  <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                                    <Zap className="size-3" />
                                    Two-Step Workflow
                                  </div>
                                  <p className="text-[9px] text-emerald-600">
                                    When Admin clicks a button (e.g., &quot;Assign Job&quot;), it triggers another workflow.
                                    That workflow can fetch employees and send a List message back.
                                  </p>
                                </div>
                              )}

                              {onSelectAction.actionType !== 'workflow' && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-violet-600">Webhook URL</Label>
                                  <Input
                                    value={onSelectAction.webhookUrl}
                                    onChange={(e) => setOnSelectAction((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                                    placeholder="https://your-api.com/on-button-click"
                                    className="h-7 text-xs font-mono border-violet-200"
                                  />
                                </div>
                              )}

                              {(onSelectAction.actionType === 'workflow' || onSelectAction.actionType === 'updateJobAssignee') && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-violet-600">Target Workflow</Label>
                                  <Select
                                    value={onSelectAction.workflowId || 'none'}
                                    onValueChange={(val) => setOnSelectAction((prev) => ({ ...prev, workflowId: val === 'none' ? '' : val }))}
                                  >
                                    <SelectTrigger className="h-7 text-xs border-violet-200">
                                      <SelectValue placeholder="Select workflow..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-xs">
                                        <em>Select workflow...</em>
                                      </SelectItem>
                                      {workflows.filter(w => w.active).map((w) => (
                                        <SelectItem key={w.id} value={w.id} className="text-xs">
                                          {w.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-[9px] text-violet-500">
                                    The clicked button data will be passed to this workflow
                                  </p>
                                </div>
                              )}

                              {/* Context Data for button actions */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-violet-600 flex items-center gap-1">
                                  <Link className="size-3" />
                                  Context Data
                                  <span className="text-violet-400 font-normal">(passed to triggered workflow)</span>
                                </Label>
                                {(onSelectAction.contextData && Object.keys(onSelectAction.contextData).length > 0) ? (
                                  <div className="space-y-1">
                                    {Object.entries(onSelectAction.contextData || {}).map(([key, value]) => (
                                      <div key={key} className="flex items-center gap-1.5">
                                        <Input
                                          value={key}
                                          readOnly
                                          className="h-6 text-[10px] font-mono bg-violet-50/50 border-violet-200 w-24"
                                        />
                                        <Input
                                          value={value}
                                          onChange={(e) => {
                                            setOnSelectAction((prev) => ({
                                              ...prev,
                                              contextData: { ...prev.contextData, [key]: e.target.value },
                                            }));
                                          }}
                                          placeholder="{{ $json.jobId }}"
                                          className="h-6 text-[10px] font-mono border-violet-200 flex-1"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                          onClick={() => {
                                            const newContext = { ...onSelectAction.contextData };
                                            delete newContext[key];
                                            setOnSelectAction((prev) => ({ ...prev, contextData: newContext }));
                                          }}
                                        >
                                          <Trash2 className="size-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] gap-1 border-violet-200 text-violet-600"
                                      onClick={() => {
                                        const key = prompt('Enter context key name (e.g., jobId):');
                                        if (key && key.trim()) {
                                          setOnSelectAction((prev) => ({
                                            ...prev,
                                            contextData: { ...prev.contextData, [key.trim()]: '' },
                                          }));
                                        }
                                      }}
                                    >
                                      <Plus className="size-3" /> Add Field
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p className="text-[9px] text-violet-400">No context data</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] gap-1 border-violet-200 text-violet-600"
                                      onClick={() => {
                                        setOnSelectAction((prev) => ({
                                          ...prev,
                                          contextData: { jobId: '' },
                                        }));
                                      }}
                                    >
                                      <Plus className="size-3" /> Add jobId
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* List Configuration (when type=list) */}
                  {interactiveType === 'list' && (
                    <div className="space-y-3">
                      {/* Quick Setup Presets for Lists */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Zap className="size-3" />
                          Quick Setup
                        </Label>
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(LIST_QUICK_SETUP_PRESETS).map(([key, preset]) => (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => applyListQuickSetup(key)}
                            >
                              <Flame className="size-3" />
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* List Button Text */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">List Button Text</Label>
                        <Input
                          value={listButtonText}
                          onChange={(e) => setListButtonText(e.target.value)}
                          placeholder="e.g. Select Driver, View Options"
                          className="h-8 text-sm"
                          maxLength={20}
                        />
                        <p className="text-[10px] text-gray-400">
                          Text shown on the button to open the list (max 20 chars)
                        </p>
                      </div>

                      {/* Sections */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <List className="size-3" />
                            Sections ({listSections.length})
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1"
                            onClick={addListSection}
                          >
                            <Plus className="size-3" />
                            Add Section
                          </Button>
                        </div>

                        {listSections.length === 0 && (
                          <div className="text-center py-4 text-xs text-gray-400 border border-dashed rounded-md">
                            <List className="size-5 mx-auto mb-1.5 text-gray-300" />
                            <p>No list sections configured</p>
                            <p className="text-[10px]">Use Quick Setup or add sections manually.</p>
                            <p className="text-[10px] text-amber-600 mt-1">
                              Max 10 rows total across all sections
                            </p>
                          </div>
                        )}

                        {listSections.map((section, secIdx) => (
                          <Card key={section.id} className="border">
                            <CardContent className="p-2.5 space-y-2">
                              {/* Section header */}
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[9px] h-5 shrink-0">
                                  S{secIdx + 1}
                                </Badge>
                                <Input
                                  value={section.title}
                                  onChange={(e) => updateListSection(section.id, { title: e.target.value })}
                                  placeholder="Section title (e.g. Available Drivers)"
                                  className="h-7 text-xs flex-1"
                                  maxLength={24}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => toggleListSectionExpand(section.id)}
                                >
                                  {expandedListSections.has(section.id) ? (
                                    <ChevronUp className="size-3" />
                                  ) : (
                                    <ChevronDown className="size-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-red-400 hover:text-red-600"
                                  onClick={() => removeListSection(section.id)}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>

                              {/* Rows count */}
                              <div className="text-[10px] text-gray-400 pl-6">
                                {section.rows.length} row{section.rows.length !== 1 ? 's' : ''} · Total: {totalListRows}/10
                              </div>

                              {/* Expanded: Rows */}
                              {expandedListSections.has(section.id) && (
                                <div className="ml-6 mt-1 space-y-2">
                                  {section.rows.length === 0 && (
                                    <div className="text-center py-2 text-[10px] text-gray-400 border border-dashed rounded-md">
                                      No rows — add items to this section
                                    </div>
                                  )}

                                  {section.rows.map((row, rowIdx) => (
                                    <div key={row.id} className="rounded-md border bg-gray-50 p-2 space-y-1.5">
                                      {/* Row header */}
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="text-[8px] h-4 px-1 shrink-0">
                                          {secIdx + 1}.{rowIdx + 1}
                                        </Badge>
                                        <span className="text-[10px] text-gray-500 flex-1 truncate font-mono">
                                          ID: {row.id}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-5 text-red-400 hover:text-red-600 shrink-0"
                                          onClick={() => removeListRow(section.id, row.id)}
                                        >
                                          <X className="size-2.5" />
                                        </Button>
                                      </div>
                                      {/* Row ID */}
                                      <div className="space-y-0.5">
                                        <Label className="text-[9px] text-gray-500">Row ID</Label>
                                        <Input
                                          value={row.id}
                                          onChange={(e) => updateListRow(section.id, row.id, { id: e.target.value })}
                                          placeholder="Unique row identifier"
                                          className="h-6 text-[10px] font-mono"
                                          maxLength={200}
                                        />
                                      </div>
                                      {/* Row Title */}
                                      <div className="space-y-0.5">
                                        <Label className="text-[9px] text-gray-500">Title</Label>
                                        <Input
                                          value={row.title}
                                          onChange={(e) => updateListRow(section.id, row.id, { title: e.target.value })}
                                          placeholder="Row title (e.g. Driver Name)"
                                          className="h-6 text-[10px]"
                                          maxLength={24}
                                        />
                                      </div>
                                      {/* Row Description */}
                                      <div className="space-y-0.5">
                                        <Label className="text-[9px] text-gray-500">Description (optional)</Label>
                                        <Input
                                          value={row.description}
                                          onChange={(e) => updateListRow(section.id, row.id, { description: e.target.value })}
                                          placeholder="e.g. Available · 5 min away"
                                          className="h-6 text-[10px]"
                                          maxLength={72}
                                        />
                                      </div>
                                    </div>
                                  ))}

                                  {/* Add Row button */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-6 text-[10px] gap-1 border-dashed"
                                    onClick={() => addListRow(section.id)}
                                    disabled={section.rows.length >= 10 || totalListRows >= 10}
                                  >
                                    <Plus className="size-3" />
                                    Add Row to Section
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* ─── Data Endpoint URL ──────────────────────────────────── */}
                      <div className="rounded-md border border-orange-200 bg-orange-50/50 overflow-hidden">
                        {/* Collapsible header */}
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-2.5 hover:bg-orange-50 transition-colors"
                          onClick={() => setDataEndpointExpanded(!dataEndpointExpanded)}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
                            <Link className="size-3.5" />
                            Data Endpoint URL
                            {dataEndpointConfig.enabled && (
                              <Badge variant="secondary" className="text-[9px] h-4 bg-orange-100 text-orange-700 border-orange-200 ml-1">
                                Active
                              </Badge>
                            )}
                          </div>
                          {dataEndpointExpanded ? (
                            <ChevronUp className="size-3.5 text-orange-500" />
                          ) : (
                            <ChevronDown className="size-3.5 text-orange-500" />
                          )}
                        </button>

                        {dataEndpointExpanded && (
                          <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-orange-200">
                            {/* Enabled toggle */}
                            <div className="flex items-center justify-between pt-2">
                              <div className="space-y-0.5">
                                <Label className="text-[10px] text-orange-700 font-medium">Enabled</Label>
                                <p className="text-[9px] text-orange-500">Generate a URL to query data for list items</p>
                              </div>
                              <Switch
                                checked={dataEndpointConfig.enabled}
                                onCheckedChange={(checked) => {
                                  if (checked && !dataEndpointConfig.path) {
                                    // Auto-generate UUID path on first enable
                                    const uuid = crypto.randomUUID();
                                    setDataEndpointConfig((prev) => ({ ...prev, enabled: true, path: uuid }));
                                  } else {
                                    setDataEndpointConfig((prev) => ({ ...prev, enabled: checked }));
                                  }
                                }}
                              />
                            </div>

                            {dataEndpointConfig.enabled && (
                              <>
                                {/* Data Endpoint URL display */}
                                {dataEndpointConfig.path && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-orange-600 flex items-center gap-1">
                                      <Link className="size-3" />
                                      Endpoint URL
                                    </Label>
                                    <div className="flex items-center gap-1">
                                      <div className="flex-1 rounded-md bg-white border border-orange-200 px-2 py-1.5 text-[10px] font-mono text-orange-800 truncate">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/data/${dataEndpointConfig.path}` : `/api/whatsapp/data/${dataEndpointConfig.path}`}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 border-orange-200"
                                        onClick={() => {
                                          const url = `${window.location.origin}/api/whatsapp/data/${dataEndpointConfig.path}`;
                                          navigator.clipboard.writeText(url);
                                          toast.success('URL copied to clipboard');
                                        }}
                                      >
                                        <Copy className="size-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 border-orange-200"
                                        onClick={() => {
                                          const url = `${window.location.origin}/api/whatsapp/data/${dataEndpointConfig.path}`;
                                          window.open(url, '_blank');
                                        }}
                                      >
                                        <ExternalLink className="size-3" />
                                      </Button>
                                    </div>
                                    <p className="text-[9px] text-orange-500">
                                      Call this URL to get data. Works with GET and POST requests.
                                    </p>
                                  </div>
                                )}

                                {/* Sample response */}
                                <div className="rounded-md border border-orange-200 bg-white p-2 space-y-1">
                                  <div className="text-[10px] font-semibold text-orange-700 flex items-center gap-1">
                                    <Eye className="size-3" />
                                    Sample Response
                                  </div>
                                  <pre className="text-[9px] font-mono text-orange-600 bg-orange-50/50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify({
  data: [
    { id: "uuid-or-int", full_name: "John Doe", user_id: "uuid", phone: "+15551234567", status: "active", created_at: "2026-06-02T10:00:00Z" }
  ],
  meta: { source: dataEndpointConfig.sourceType, count: 5, filters: dataEndpointConfig.filters }
}, null, 2)}
                                  </pre>
                                </div>

                                {/* Data Source Type */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-orange-600">Data Source</Label>
                                  <Select
                                    value={dataEndpointConfig.sourceType}
                                    onValueChange={(val: any) => {
                                      const defaults: Record<string, Partial<DataEndpointConfig>> = {
                                        drivers: { filters: { status: 'available', role: 'driver' }, fields: { idField: 'id', titleField: 'name', descField: 'status' }, sectionTitle: 'Available Drivers' },
                                        employees: { filters: { status: 'available' }, fields: { idField: 'id', titleField: 'name', descField: 'status' }, sectionTitle: 'Employees' },
                                        resources: { filters: { status: 'available' }, fields: { idField: 'id', titleField: 'name', descField: 'status' }, sectionTitle: 'Resources' },
                                        custom: { filters: {}, fields: { idField: 'id', titleField: 'name', descField: '' }, sectionTitle: 'Options' },
                                      };
                                      const preset = defaults[val] || {};
                                      setDataEndpointConfig((prev) => ({
                                        ...prev,
                                        sourceType: val,
                                        ...preset,
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs border-orange-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="drivers" className="text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <Users className="size-3" />
                                          Drivers (Employee table)
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="employees" className="text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <Users className="size-3" />
                                          All Employees
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="resources" className="text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <Phone className="size-3" />
                                          Resources
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="custom" className="text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <Wrench className="size-3" />
                                          Custom
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Filters */}
                                <div className="rounded-md border border-orange-200 bg-white p-2 space-y-1.5">
                                  <div className="text-[10px] font-semibold text-orange-700 flex items-center gap-1">
                                    <Pencil className="size-3" />
                                    Filters
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-orange-600">Status Filter</Label>
                                      <Select
                                        value={dataEndpointConfig.filters.status || 'all'}
                                        onValueChange={(val) => setDataEndpointConfig((prev) => ({
                                          ...prev,
                                          filters: { ...prev.filters, status: val === 'all' ? undefined : val },
                                        }))}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] border-orange-200">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="all" className="text-xs">All</SelectItem>
                                          <SelectItem value="available" className="text-xs">Available</SelectItem>
                                          <SelectItem value="busy" className="text-xs">Busy</SelectItem>
                                          <SelectItem value="offline" className="text-xs">Offline</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-orange-600">Role Filter</Label>
                                      <Input
                                        value={dataEndpointConfig.filters.role || ''}
                                        onChange={(e) => setDataEndpointConfig((prev) => ({
                                          ...prev,
                                          filters: { ...prev.filters, role: e.target.value || undefined },
                                        }))}
                                        placeholder="driver"
                                        className="h-6 text-[10px] font-mono border-orange-200"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Field Mapping */}
                                <div className="rounded-md border border-orange-200 bg-white p-2 space-y-1.5">
                                  <div className="text-[10px] font-semibold text-orange-700 flex items-center gap-1">
                                    <Pencil className="size-3" />
                                    Field Mapping
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-orange-600">ID Field</Label>
                                      <Input
                                        value={dataEndpointConfig.fields.idField}
                                        onChange={(e) => setDataEndpointConfig((prev) => ({
                                          ...prev,
                                          fields: { ...prev.fields, idField: e.target.value },
                                        }))}
                                        placeholder="id"
                                        className="h-6 text-[10px] font-mono border-orange-200"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-orange-600">Title Field</Label>
                                      <Input
                                        value={dataEndpointConfig.fields.titleField}
                                        onChange={(e) => setDataEndpointConfig((prev) => ({
                                          ...prev,
                                          fields: { ...prev.fields, titleField: e.target.value },
                                        }))}
                                        placeholder="name"
                                        className="h-6 text-[10px] font-mono border-orange-200"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-orange-600">Desc Field</Label>
                                      <Input
                                        value={dataEndpointConfig.fields.descField}
                                        onChange={(e) => setDataEndpointConfig((prev) => ({
                                          ...prev,
                                          fields: { ...prev.fields, descField: e.target.value },
                                        }))}
                                        placeholder="status"
                                        className="h-6 text-[10px] font-mono border-orange-200"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Section Title */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-orange-600">Section Title</Label>
                                  <Input
                                    value={dataEndpointConfig.sectionTitle}
                                    onChange={(e) => setDataEndpointConfig((prev) => ({ ...prev, sectionTitle: e.target.value }))}
                                    placeholder="Available Drivers"
                                    className="h-7 text-xs border-orange-200"
                                    maxLength={24}
                                  />
                                </div>

                                {/* Auto-link to Dynamic List Source */}
                                <div className="flex items-start gap-1.5 p-2 rounded-md bg-orange-100/60 border border-orange-200">
                                  <Zap className="size-3 text-orange-600 mt-0.5 shrink-0" />
                                  <span className="text-[10px] text-orange-700">
                                    When enabled, this endpoint URL is automatically used as the <strong>Dynamic List Source</strong> URL. The data will be fetched at message send time and mapped to WhatsApp list items.
                                  </span>
                                </div>

                                {/* Quick setup: Apply to Dynamic List Source */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-7 text-[10px] gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                                  onClick={() => {
                                    if (!dataEndpointConfig.path) return;
                                    // Use localhost:3000 for server-side fetch compatibility.
                                    // The workflow executor runs server-side and can't resolve
                                    // the preview domain URL, so we store the localhost URL.
                                    const url = `http://localhost:3000/api/whatsapp/data/${dataEndpointConfig.path}`;
                                    setListDynamicSource((prev) => ({
                                      ...prev,
                                      enabled: true,
                                      url,
                                      method: 'GET',
                                      arrayPath: 'data',
                                      idField: dataEndpointConfig.fields.idField || 'id',
                                      titleField: dataEndpointConfig.fields.titleField || 'full_name',
                                      descField: dataEndpointConfig.fields.descField || 'status',
                                      sectionTitle: dataEndpointConfig.sectionTitle || 'Options',
                                    }));
                                    setDynamicListExpanded(true);
                                    toast.success('Data endpoint linked to Dynamic List Source');
                                  }}
                                >
                                  <Link className="size-3" />
                                  Link to Dynamic List Source
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ─── Dynamic List Data Source ───────────────────────────── */}
                      <div className="rounded-md border border-teal-200 bg-teal-50/50 overflow-hidden">
                        {/* Collapsible header */}
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-2.5 hover:bg-teal-50 transition-colors"
                          onClick={() => setDynamicListExpanded(!dynamicListExpanded)}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                            <Globe className="size-3.5" />
                            Dynamic List Data
                            {listDynamicSource.enabled && (
                              <Badge variant="secondary" className="text-[9px] h-4 bg-teal-100 text-teal-700 border-teal-200 ml-1">
                                Enabled
                              </Badge>
                            )}
                          </div>
                          {dynamicListExpanded ? (
                            <ChevronUp className="size-3.5 text-teal-500" />
                          ) : (
                            <ChevronDown className="size-3.5 text-teal-500" />
                          )}
                        </button>

                        {dynamicListExpanded && (
                          <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-teal-200">
                            {/* Enabled toggle */}
                            <div className="flex items-center justify-between pt-2">
                              <div className="space-y-0.5">
                                <Label className="text-[10px] text-teal-700 font-medium">Enabled</Label>
                                <p className="text-[9px] text-teal-500">Fetch list items from an API at runtime</p>
                              </div>
                              <Switch
                                checked={listDynamicSource.enabled}
                                onCheckedChange={(checked) => setListDynamicSource((prev) => ({ ...prev, enabled: checked }))}
                              />
                            </div>

                            {listDynamicSource.enabled && (
                              <>
                                {/* Preview hint */}
                                <div className="flex items-start gap-1.5 p-2 rounded-md bg-teal-100/60 border border-teal-200">
                                  <Globe className="size-3 text-teal-600 mt-0.5 shrink-0" />
                                  <span className="text-[10px] text-teal-700">
                                    List items will be fetched from the API at runtime. Dynamic list items appear first, followed by any static items you configure below.
                                  </span>
                                </div>

                                {/* API URL */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-teal-600">API URL</Label>
                                  <Input
                                    value={listDynamicSource.url}
                                    onChange={(e) => setListDynamicSource((prev) => ({ ...prev, url: e.target.value }))}
                                    placeholder="https://api.example.com/drivers or {{ $json.api.url }}"
                                    className="h-7 text-xs font-mono border-teal-200"
                                  />
                                  <p className="text-[9px] text-teal-500">Supports expressions like {'{{ $json.api.url }}'}</p>
                                </div>

                                {/* HTTP Method */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-teal-600">HTTP Method</Label>
                                  <Select
                                    value={listDynamicSource.method || 'GET'}
                                    onValueChange={(val) => setListDynamicSource((prev) => ({ ...prev, method: val }))}
                                  >
                                    <SelectTrigger className="h-7 text-xs border-teal-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="GET" className="text-xs">GET</SelectItem>
                                      <SelectItem value="POST" className="text-xs">POST</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Request Body (only for POST) */}
                                {listDynamicSource.method === 'POST' && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-teal-600">Request Body</Label>
                                    <Textarea
                                      value={listDynamicSource.body || ''}
                                      onChange={(e) => setListDynamicSource((prev) => ({ ...prev, body: e.target.value }))}
                                      placeholder='{"filter": "active"} or {{ $json.requestBody }}'
                                      className="min-h-[60px] text-xs font-mono border-teal-200"
                                    />
                                    <p className="text-[9px] text-teal-500">JSON body for POST requests. Supports expressions.</p>
                                  </div>
                                )}

                                {/* Array Path */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-teal-600">Array Path</Label>
                                  <Input
                                    value={listDynamicSource.arrayPath}
                                    onChange={(e) => setListDynamicSource((prev) => ({ ...prev, arrayPath: e.target.value }))}
                                    placeholder="data.drivers, items, or leave empty for root array"
                                    className="h-7 text-xs font-mono border-teal-200"
                                  />
                                  <p className="text-[9px] text-teal-500">JSON path to the array in the API response</p>
                                </div>

                                {/* Field Mapping */}
                                <div className="rounded-md border border-teal-200 bg-white p-2 space-y-1.5">
                                  <div className="text-[10px] font-semibold text-teal-700 flex items-center gap-1">
                                    <Pencil className="size-3" />
                                    Field Mapping
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-teal-600">ID Field</Label>
                                      <Input
                                        value={listDynamicSource.idField}
                                        onChange={(e) => setListDynamicSource((prev) => ({ ...prev, idField: e.target.value }))}
                                        placeholder="id"
                                        className="h-6 text-[10px] font-mono border-teal-200"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-teal-600">Title Field</Label>
                                      <Input
                                        value={listDynamicSource.titleField}
                                        onChange={(e) => setListDynamicSource((prev) => ({ ...prev, titleField: e.target.value }))}
                                        placeholder="name"
                                        className="h-6 text-[10px] font-mono border-teal-200"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-teal-600">Description Field</Label>
                                      <Input
                                        value={listDynamicSource.descField}
                                        onChange={(e) => setListDynamicSource((prev) => ({ ...prev, descField: e.target.value }))}
                                        placeholder="status (optional)"
                                        className="h-6 text-[10px] font-mono border-teal-200"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[9px] text-teal-600">Section Title</Label>
                                      <Input
                                        value={listDynamicSource.sectionTitle || ''}
                                        onChange={(e) => setListDynamicSource((prev) => ({ ...prev, sectionTitle: e.target.value }))}
                                        placeholder="Available Drivers"
                                        className="h-6 text-[10px] border-teal-200"
                                      />
                                    </div>
                                  </div>
                                  <p className="text-[9px] text-teal-500">
                                    Map API response fields to WhatsApp list row properties
                                  </p>
                                </div>

                                {/* Test Fetch */}
                                <div className="space-y-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-7 text-[10px] gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50"
                                    onClick={handleTestFetch}
                                    disabled={testFetching || !listDynamicSource.url}
                                  >
                                    {testFetching ? (
                                      <>
                                        <RefreshCw className="size-3 animate-spin" />
                                        Fetching...
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="size-3" />
                                        Test Fetch
                                      </>
                                    )}
                                  </Button>

                                  {/* Test Results */}
                                  {testFetchResult && (
                                    <div className={cn(
                                      'rounded-md border p-2 space-y-1.5',
                                      testFetchResult.success
                                        ? 'border-emerald-200 bg-emerald-50/50'
                                        : 'border-red-200 bg-red-50/50'
                                    )}>
                                      {testFetchResult.success ? (
                                        <>
                                          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                            <CheckCircle2 className="size-3" />
                                            Fetched {testFetchResult.rows.length} item{testFetchResult.rows.length !== 1 ? 's' : ''} (showing max 5)
                                          </div>
                                          <div className="space-y-1 max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                            {testFetchResult.rows.map((row: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-1.5 text-[9px] bg-white rounded border border-gray-100 px-1.5 py-1">
                                                <Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0">
                                                  {row.id}
                                                </Badge>
                                                <span className="font-medium text-gray-700 truncate">{row.title}</span>
                                                {row.description && (
                                                  <span className="text-gray-400 truncate">· {row.description}</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex items-start gap-1 text-[10px] text-red-700">
                                          <AlertCircle className="size-3 mt-0.5 shrink-0" />
                                          <span>{testFetchResult.error}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ─── On Item Select Action ──────────────────────────────── */}
                      <div className="rounded-md border border-violet-200 bg-violet-50/50 overflow-hidden">
                        {/* Collapsible header */}
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-2.5 hover:bg-violet-50 transition-colors"
                          onClick={() => setOnSelectActionExpanded(!onSelectActionExpanded)}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                            <Zap className="size-3.5" />
                            On Item Select
                            {onSelectAction.enabled && (
                              <Badge variant="secondary" className="text-[9px] h-4 bg-violet-100 text-violet-700 border-violet-200 ml-1">
                                Enabled
                              </Badge>
                            )}
                          </div>
                          {onSelectActionExpanded ? (
                            <ChevronUp className="size-3.5 text-violet-500" />
                          ) : (
                            <ChevronDown className="size-3.5 text-violet-500" />
                          )}
                        </button>

                        {onSelectActionExpanded && (
                          <div className="px-2.5 pb-2.5 space-y-2.5 border-t border-violet-200">
                            {/* Enabled toggle */}
                            <div className="flex items-center justify-between pt-2">
                              <div className="space-y-0.5">
                                <Label className="text-[10px] text-violet-700 font-medium">Enabled</Label>
                                <p className="text-[9px] text-violet-500">Trigger an action when a list item is selected</p>
                              </div>
                              <Switch
                                checked={onSelectAction.enabled}
                                onCheckedChange={(checked) => setOnSelectAction((prev) => ({ ...prev, enabled: checked }))}
                              />
                            </div>

                            {onSelectAction.enabled && (
                              <>
                                {/* Action Type */}
                                <div className="space-y-1">
                                  <Label className="text-[10px] text-violet-600">Action Type</Label>
                                  <Select
                                    value={onSelectAction.actionType || (onSelectAction.method === 'workflow' ? 'workflow' : 'webhook')}
                                    onValueChange={(val) => {
                                      setOnSelectAction((prev) => ({
                                        ...prev,
                                        actionType: val as 'webhook' | 'workflow' | 'updateJobAssignee',
                                        method: val === 'workflow' ? 'workflow' : 'POST',
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs border-violet-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="webhook" className="text-xs">Call Webhook</SelectItem>
                                      <SelectItem value="workflow" className="text-xs">Trigger Workflow</SelectItem>
                                      <SelectItem value="updateJobAssignee" className="text-xs">Update Job Assignee</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Info for updateJobAssignee */}
                                {onSelectAction.actionType === 'updateJobAssignee' && (
                                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 space-y-1">
                                    <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                                      <UserCheck className="size-3" />
                                      Job Assignment
                                    </div>
                                    <p className="text-[9px] text-emerald-600">
                                      When a user selects a list item, the selected employee will be assigned to the most recent job sent to that phone number. The employee status will be set to &quot;busy&quot;.
                                    </p>
                                    <p className="text-[9px] text-emerald-500">
                                      The selected item ID should be an Employee ID (or driver_ prefixed ID).
                                    </p>
                                  </div>
                                )}

                                {/* Webhook URL (for webhook or combined actions) */}
                                {onSelectAction.actionType !== 'workflow' && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-violet-600">
                                      Webhook URL
                                      {onSelectAction.actionType === 'updateJobAssignee' && (
                                        <span className="text-violet-400 font-normal"> (optional, combined action)</span>
                                      )}
                                    </Label>
                                    <Input
                                      value={onSelectAction.webhookUrl}
                                      onChange={(e) => setOnSelectAction((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                                      placeholder={onSelectAction.actionType === 'updateJobAssignee' ? 'https://your-api.com/on-driver-selected (optional)' : 'https://your-api.com/on-select'}
                                      className="h-7 text-xs font-mono border-violet-200"
                                    />
                                    <p className="text-[9px] text-violet-500">
                                      {onSelectAction.actionType === 'updateJobAssignee'
                                        ? 'Also POST selection data to this URL after updating job'
                                        : 'Selected item data will be POSTed to this URL'}
                                    </p>
                                  </div>
                                )}

                                {/* Workflow select (for workflow or combined actions) */}
                                {(onSelectAction.actionType === 'workflow' || onSelectAction.actionType === 'updateJobAssignee') && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-violet-600">
                                      Workflow
                                      {onSelectAction.actionType === 'updateJobAssignee' && (
                                        <span className="text-violet-400 font-normal"> (optional, combined action)</span>
                                      )}
                                    </Label>
                                    <Select
                                      value={onSelectAction.workflowId || 'none'}
                                      onValueChange={(val) => setOnSelectAction((prev) => ({ ...prev, workflowId: val === 'none' ? '' : val }))}
                                    >
                                      <SelectTrigger className="h-7 text-xs border-violet-200">
                                        <SelectValue placeholder="Select workflow..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none" className="text-xs">
                                          <em>Select workflow...</em>
                                        </SelectItem>
                                        {workflows.filter(w => w.active).map((w) => (
                                          <SelectItem key={w.id} value={w.id} className="text-xs">
                                            {w.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[9px] text-violet-500">
                                      {onSelectAction.actionType === 'updateJobAssignee'
                                        ? 'Also trigger this workflow after updating job'
                                        : 'Selected item data will be passed to the workflow'}
                                    </p>
                                  </div>
                                )}

                                {/* Context Data (key-value pairs passed to triggered workflow) */}
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] text-violet-600 flex items-center gap-1">
                                    <Link className="size-3" />
                                    Context Data
                                    <span className="text-violet-400 font-normal">(passed to triggered workflow)</span>
                                  </Label>
                                  {(onSelectAction.contextData && Object.keys(onSelectAction.contextData).length > 0) ? (
                                    <div className="space-y-1">
                                      {Object.entries(onSelectAction.contextData || {}).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-1.5">
                                          <Input
                                            value={key}
                                            readOnly
                                            className="h-6 text-[10px] font-mono bg-violet-50/50 border-violet-200 w-24"
                                          />
                                          <Input
                                            value={value}
                                            onChange={(e) => {
                                              setOnSelectAction((prev) => ({
                                                ...prev,
                                                contextData: { ...prev.contextData, [key]: e.target.value },
                                              }));
                                            }}
                                            placeholder="{{ $json.jobId }}"
                                            className="h-6 text-[10px] font-mono border-violet-200 flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                            onClick={() => {
                                              const newContext = { ...onSelectAction.contextData };
                                              delete newContext[key];
                                              setOnSelectAction((prev) => ({ ...prev, contextData: newContext }));
                                            }}
                                          >
                                            <Trash2 className="size-3" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] gap-1 border-violet-200 text-violet-600"
                                        onClick={() => {
                                          const key = prompt('Enter context key name (e.g., jobId):');
                                          if (key && key.trim()) {
                                            setOnSelectAction((prev) => ({
                                              ...prev,
                                              contextData: { ...prev.contextData, [key.trim()]: '' },
                                            }));
                                          }
                                        }}
                                      >
                                        <Plus className="size-3" /> Add Field
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <p className="text-[9px] text-violet-400">No context data configured</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] gap-1 border-violet-200 text-violet-600"
                                        onClick={() => {
                                          setOnSelectAction((prev) => ({
                                            ...prev,
                                            contextData: { jobId: '' },
                                          }));
                                        }}
                                      >
                                        <Plus className="size-3" /> Add jobId
                                      </Button>
                                    </div>
                                  )}
                                  <p className="text-[9px] text-violet-500">
                                    Expressions like {'{{ $json.jobId }}'} are resolved at send time and passed to the triggered workflow.
                                  </p>
                                </div>

                                {/* Webhook payload info */}
                                <div className="rounded-md border border-violet-200 bg-white p-2 space-y-1">
                                  <div className="text-[10px] font-semibold text-violet-700 flex items-center gap-1">
                                    <MousePointerClick className="size-3" />
                                    Webhook Payload Preview
                                  </div>
                                  <pre className="text-[9px] font-mono text-violet-600 bg-violet-50/50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify({
  event: 'whatsapp_interactive_response',
  selection: { id: 'driver_1', title: 'Driver 1' },
  sender: { phone: '+91XXXXXXXXXX' },
  contextData: onSelectAction.contextData || {},
  timestamp: new Date().toISOString(),
}, null, 2)}
                                  </pre>
                                  <p className="text-[9px] text-violet-500">
                                    This is a sample payload. Actual data will match the selected list item.
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CTA URL Configuration */}
                  {operation === 'sendInteractive' && interactiveType === 'cta_url' && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Button Text</Label>
                        <Input
                          value={ctaButtonText}
                          onChange={(e) => setCtaButtonText(e.target.value)}
                          placeholder="e.g. Assign Job"
                          className="h-8 text-sm"
                          maxLength={20}
                        />
                        <p className="text-[10px] text-gray-400">Max 20 characters</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">CTA URL</Label>
                        <div className="relative">
                          <Input
                            value={ctaUrl}
                            onChange={(e) => setCtaUrl(e.target.value)}
                            placeholder="https://your-domain.com/webhook/assign-job?jobId=123"
                            className="h-8 text-sm pr-10"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 font-mono">
                            {'{{ }}'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Supports expressions like {'{{ $json.body.jobId }}'} — This URL opens when user clicks the button
                        </p>
                      </div>
                      <div className="flex items-start gap-2 p-2.5 rounded-md bg-emerald-50 border border-emerald-200">
                        <Link className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="text-[10px] text-emerald-700 space-y-0.5">
                          <p className="font-medium">CTA URL Button</p>
                          <p>When the user taps this button, it opens the URL in their browser. Use this to trigger another webhook workflow (e.g., clicking "Assign Job" opens your webhook URL which runs the assignment workflow and sends back a list of employees).</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <Separator className="my-2" />

              {/* WhatsApp Message Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Eye className="size-3" />
                    Message Preview
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? 'Hide' : 'Show'}
                    {showPreview ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                </div>

                {showPreview && (
                  <div className="bg-[#e5ddd5] rounded-lg p-3 space-y-2">
                    {/* Header */}
                    {(headerText || operation === 'sendInteractive') && (
                      <div className="bg-emerald-100 rounded-t-lg rounded-bl-lg rounded-br-lg p-2.5 max-w-[280px] ml-auto">
                        {headerText && (
                          <p className="text-xs font-bold text-gray-800 mb-1">{headerText}</p>
                        )}
                        {/* Message body */}
                        <p className="text-xs text-gray-800 whitespace-pre-wrap">
                          {getPreviewText()}
                        </p>

                        {/* Interactive buttons preview */}
                        {operation === 'sendInteractive' && interactiveType === 'button' && buttons.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {buttons.map((btn, idx) => (
                              <div
                                key={btn.id}
                                className="bg-white rounded-md py-1.5 px-3 text-center text-xs font-medium text-teal-700 border border-teal-200 cursor-pointer hover:bg-teal-50 transition-colors"
                              >
                                {btn.label || `Button ${idx + 1}`}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactive list preview */}
                        {operation === 'sendInteractive' && interactiveType === 'list' && (
                          <div className="mt-2">
                            <div className="bg-white rounded-md py-1.5 px-3 text-center text-xs font-medium text-teal-700 border border-teal-200 cursor-pointer hover:bg-teal-50 transition-colors">
                              {listButtonText || 'Options'}
                            </div>
                            {listSections.length > 0 && listSections.some(s => s.rows.length > 0) && (
                              <div className="mt-1.5 bg-white rounded-md border border-gray-200 overflow-hidden text-xs">
                                {listSections.map((section, si) => (
                                  <div key={section.id}>
                                    {section.title && (
                                      <div className="px-2.5 py-1 bg-gray-50 text-gray-500 font-medium text-[10px] border-b">
                                        {section.title}
                                      </div>
                                    )}
                                    {section.rows.map((row, ri) => (
                                      <div key={row.id} className={`px-2.5 py-1.5 ${ri > 0 ? 'border-t border-gray-100' : ''} ${si > 0 && ri === 0 ? 'border-t border-gray-200' : ''}`}>
                                        <p className="text-gray-800 font-medium text-[11px]">{row.title || `Row ${ri + 1}`}</p>
                                        {row.description && (
                                          <p className="text-gray-400 text-[9px] truncate">{row.description}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interactive CTA URL preview */}
                        {operation === 'sendInteractive' && interactiveType === 'cta_url' && (
                          <div className="mt-2">
                            <div className="bg-white rounded-md py-1.5 px-3 text-center text-xs font-medium text-teal-700 border border-teal-200 cursor-pointer hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5">
                              <ExternalLink className="size-3" />
                              {ctaButtonText || 'Click Here'}
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        {footerText && (
                          <p className="text-[10px] text-gray-500 mt-1.5">{footerText}</p>
                        )}

                        {/* Timestamp */}
                        <p className="text-[9px] text-gray-400 text-right mt-0.5">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}

                    {/* Simple text message preview */}
                    {operation === 'sendText' && (
                      <div className="bg-emerald-100 rounded-t-lg rounded-bl-lg rounded-br-lg p-2.5 max-w-[280px] ml-auto">
                        <p className="text-xs text-gray-800 whitespace-pre-wrap">
                          {getPreviewText()}
                        </p>
                        {footerText && (
                          <p className="text-[10px] text-gray-500 mt-1.5">{footerText}</p>
                        )}
                        <p className="text-[9px] text-gray-400 text-right mt-0.5">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}

                    {/* Template preview */}
                    {operation === 'sendTemplate' && (
                      <div className="bg-emerald-100 rounded-t-lg rounded-bl-lg rounded-br-lg p-2.5 max-w-[280px] ml-auto">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge variant="outline" className="text-[9px] h-4 bg-white">
                            Template
                          </Badge>
                          <span className="text-[10px] text-gray-500">
                            {templateName || 'template_name'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 whitespace-pre-wrap">
                          {getPreviewText()}
                        </p>
                        <p className="text-[9px] text-gray-400 text-right mt-0.5">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="my-2" />

              {/* Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <StickyNote className="size-3.5 text-gray-400" />
                  <Label className="text-xs font-medium">Notes</Label>
                </div>
                <Textarea
                  value={localNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add notes about this node..."
                  className="min-h-[60px] text-xs"
                />
              </div>

              <Separator className="my-2" />

              {/* Delete Node */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-1.5"
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
                Delete Node
              </Button>
            </div>
          )}

          {/* ─── Settings Tab Content ──────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <Settings className="size-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-600">Node Settings</span>
              </div>

              {/* Header Text */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Header Text</Label>
                <Input
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Optional header for interactive messages"
                  className="h-8 text-sm"
                />
              </div>

              {/* Footer Text */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Footer Text</Label>
                <Input
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Optional footer text"
                  className="h-8 text-sm"
                />
              </div>

              <Separator className="my-2" />

              {/* Disabled toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Disabled</Label>
                  <p className="text-[10px] text-gray-400">Skip this node during execution</p>
                </div>
                <Switch
                  checked={node.data.disabled || false}
                  onCheckedChange={handleDisableToggle}
                />
              </div>

              <Separator className="my-2" />

              {/* Error Handling */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">Error Handling</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Retry Count</Label>
                    <Input
                      type="number"
                      value={node.data.retryCount ?? 0}
                      onChange={(e) =>
                        updateNode(node.id, { retryCount: parseInt(e.target.value) || 0 })
                      }
                      className="h-7 text-xs"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Retry Delay (ms)</Label>
                    <Input
                      type="number"
                      value={node.data.retryDelay ?? 1000}
                      onChange={(e) =>
                        updateNode(node.id, { retryDelay: parseInt(e.target.value) || 1000 })
                      }
                      className="h-7 text-xs"
                      min={0}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={node.data.timeout ?? ''}
                    onChange={(e) =>
                      updateNode(node.id, { timeout: parseInt(e.target.value) || undefined })
                    }
                    className="h-7 text-xs"
                    placeholder="No timeout"
                    min={0}
                  />
                </div>
              </div>

              <Separator className="my-2" />

              {/* Setup Credentials Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Key className="size-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">Setup Credentials</span>
                </div>

                {/* Credential selector */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">Select Credential</Label>
                  <div className="flex gap-1.5">
                    <Select value={credentialId || 'none'} onValueChange={(val) => setCredentialId(val === 'none' ? '' : val)}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select credential..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">
                          <em>No credential</em>
                        </SelectItem>
                        {credentialsLoading ? (
                          <SelectItem value="_loading" disabled className="text-xs">
                            Loading...
                          </SelectItem>
                        ) : (
                          credentials.map((cred) => (
                            <SelectItem key={cred.id} value={cred.id} className="text-xs">
                              <div className="flex items-center gap-1.5">
                                <Lock className="size-3 text-gray-400" />
                                <span>{cred.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] gap-1 shrink-0"
                      onClick={() => handleOpenCredentialDialog()}
                    >
                      <Wrench className="size-3" />
                      Setup
                    </Button>
                  </div>
                </div>

                {/* Selected credential info */}
                {credentialId && (() => {
                  const selectedCred = credentials.find((c) => c.id === credentialId);
                  if (!selectedCred) return null;
                  return (
                    <Card className="border-emerald-200 bg-emerald-50/50">
                      <CardContent className="p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700">{selectedCred.name}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-5"
                              title="Edit credential"
                              onClick={() => handleOpenCredentialDialog(selectedCred)}
                            >
                              <Pencil className="size-2.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5 text-red-400 hover:text-red-600"
                                  title="Delete credential"
                                >
                                  <Trash2 className="size-2.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &quot;{selectedCred.name}&quot;? This action cannot be undone.
                                    Any nodes using this credential will need to be reconfigured.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteCredential(selectedCred.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-gray-500">
                          {selectedCred.data?.accessToken && (
                            <div className="flex items-center gap-1.5">
                              <Key className="size-3" />
                              <span>Token: ••••••••{selectedCred.data.accessToken.slice(-4)}</span>
                            </div>
                          )}
                          {selectedCred.data?.phoneNumberId && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="size-3" />
                              <span>Phone ID: {selectedCred.data.phoneNumberId}</span>
                            </div>
                          )}
                          {selectedCred.data?.businessAccountId && (
                            <div className="flex items-center gap-1.5">
                              <Globe className="size-3" />
                              <span>Business ID: {selectedCred.data.businessAccountId}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* No credentials message */}
                {!credentialsLoading && credentials.length === 0 && (
                  <div className="text-center py-3 text-xs text-gray-400 border border-dashed rounded-md">
                    <Key className="size-4 mx-auto mb-1 text-gray-300" />
                    <p>No WhatsApp credentials configured.</p>
                    <p className="text-[10px]">Click &quot;Setup&quot; to add one.</p>
                  </div>
                )}

                {/* Test Connection button */}
                {credentialId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-[10px] gap-1.5"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="size-3 animate-spin" />
                        Testing Connection...
                      </>
                    ) : testResult === 'success' ? (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span className="text-emerald-600">Connection OK</span>
                      </>
                    ) : testResult === 'error' ? (
                      <>
                        <AlertCircle className="size-3 text-red-500" />
                        <span className="text-red-500">Connection Failed</span>
                      </>
                    ) : (
                      <>
                        <Zap className="size-3" />
                        Test Connection
                      </>
                    )}
                  </Button>
                )}

                {/* Quick Test Send buttons */}
                {credentialId && phoneNumber && (
                  <div className="space-y-1.5">
                    {/* Test with Template - ALWAYS works, even outside 24h window */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-[10px] gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={async () => {
                        const testPhone = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
                        try {
                          setTestingTemplate(true);
                          toast.loading('Sending template message to verify delivery...', { id: 'whatsapp-template-test' });
                          const res = await authFetch('/api/whatsapp/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              to: testPhone,
                              message: 'hello_world',
                              type: 'template',
                              credentialId,
                              templateName: templateName || 'hello_world',
                              templateLanguage: templateLanguage || 'en_US',
                            }),
                          });
                          const data = await res.json();
                          toast.dismiss('whatsapp-template-test');

                          if (res.ok && data.messages?.[0]?.id) {
                            toast.success('✅ Template message sent! Check your WhatsApp — template messages always deliver. If you received it, your connection works. Interactive/text messages require the recipient to have messaged your business within 24h.', { duration: 8000 });
                          } else if (data.error) {
                            const errorStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                            // Check for expired token in error message
                            if (errorStr.includes('EXPIRED') || errorStr.includes('expired') || data.errorCode === '190') {
                              toast.error('🔑 WhatsApp access token has EXPIRED. Generate a new token in Meta Business Suite → System Users → Generate New Token, then update your credential here.', { duration: 8000 });
                            } else {
                              toast.error(`Failed: ${errorStr}`, { duration: 6000 });
                            }
                          } else {
                            toast.error('Failed to send template. Check your credential and template name.');
                          }
                        } catch (err: any) {
                          toast.dismiss('whatsapp-template-test');
                          toast.error(`Error: ${err.message}`);
                        } finally {
                          setTestingTemplate(false);
                        }
                      }}
                      disabled={testingTemplate}
                    >
                      {testingTemplate ? (
                        <>
                          <RefreshCw className="size-3 animate-spin" />
                          Testing Template...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3" />
                          Verify Delivery (Template)
                        </>
                      )}
                    </Button>

                    {/* Test with current operation */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[10px] gap-1.5"
                      onClick={async () => {
                        const testPhone = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
                        const testBody = bodyText || 'Test message from ServiceOS';
                        try {
                          toast.loading('Sending test message...', { id: 'whatsapp-test' });
                          
                          // Build the request body matching the current operation type
                          const sendBody: Record<string, any> = {
                            to: testPhone,
                            message: testBody,
                            credentialId,
                          };
                          
                          if (operation === 'sendTemplate') {
                            sendBody.type = 'template';
                            sendBody.templateName = templateName || 'hello_world';
                            sendBody.templateLanguage = templateLanguage || 'en_US';
                          } else if (operation === 'sendInteractive') {
                            sendBody.type = 'interactive';
                            // Build the interactive payload for testing
                            const testInteractiveType = interactiveType || 'button';
                            if (testInteractiveType === 'button' && buttons.length > 0) {
                              const validBtns = buttons.filter((b: WhatsAppButton) => b.label?.trim()).slice(0, 3);
                              if (validBtns.length > 0) {
                                sendBody.interactive = {
                                  type: 'button',
                                  body: { text: testBody || 'Please select an option' },
                                  action: {
                                    buttons: validBtns.map((btn: WhatsAppButton, idx: number) => ({
                                      type: 'reply',
                                      reply: { id: btn.id || `btn_${idx}`, title: btn.label.substring(0, 20) },
                                    })),
                                  },
                                };
                                if (headerText) sendBody.interactive.header = { type: 'text', text: headerText };
                                if (footerText) sendBody.interactive.footer = { text: footerText };
                              } else {
                                // Fallback to text if no buttons configured
                                sendBody.type = 'text';
                              }
                            } else if (testInteractiveType === 'cta_url' && ctaUrl) {
                              sendBody.interactive = {
                                type: 'cta_url',
                                body: { text: testBody || 'Please click the button below' },
                                action: {
                                  name: 'cta_url',
                                  parameters: {
                                    display_text: (ctaButtonText || 'Click Here').substring(0, 20),
                                    url: ctaUrl,
                                  },
                                },
                              };
                            } else {
                              // Fallback to text for list type (too complex for quick test)
                              sendBody.type = 'text';
                              sendBody.message = testBody || 'Test interactive message from ServiceOS (list type - use workflow execution for full test)';
                            }
                          } else {
                            sendBody.type = 'text';
                          }
                          
                          const res = await authFetch('/api/whatsapp/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(sendBody),
                          });
                          const data = await res.json();
                          toast.dismiss('whatsapp-test');
                          if (res.ok && data.messages?.[0]?.id) {
                            const msgType = sendBody.type || 'message';
                            toast.success(`✅ ${msgType} message sent to ${testPhone}! Check your WhatsApp.`, { duration: 5000 });
                          } else if (data.error) {
                            const errorStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                            if (errorStr.includes('EXPIRED') || errorStr.includes('expired') || data.errorCode === '190') {
                              toast.error('🔑 WhatsApp access token has EXPIRED. Update your credential with a new token from Meta Business Suite.', { duration: 8000 });
                            } else {
                              toast.error(`Failed: ${errorStr}`, { duration: 6000 });
                            }
                          } else {
                            toast.error('Failed to send message. Check your configuration.');
                          }
                        } catch (err: any) {
                          toast.dismiss('whatsapp-test');
                          toast.error(`Error: ${err.message}`);
                        }
                      }}
                    >
                      <MessageCircle className="size-3" />
                      Quick Test Send
                    </Button>

                    {/* 24h Window guidance — informational, only shown for text/interactive */}
                    {(operation === 'sendInteractive' || operation === 'sendText') && (
                      <div className="rounded-md bg-gray-50 border border-gray-200 p-2.5 space-y-1">
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          <strong>Note:</strong> Text &amp; interactive messages only deliver if the recipient has messaged your business number within the last 24 hours. If a message isn&apos;t received, try &quot;Verify Delivery (Template)&quot; — template messages always deliver.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-gray-400">
                  Credential for WhatsApp Business API authentication
                </p>
              </div>

              <Separator className="my-2" />

              {/* Language */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Phone className="size-3" />
                  Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en" className="text-xs">English</SelectItem>
                    <SelectItem value="hi" className="text-xs">Hindi</SelectItem>
                    <SelectItem value="es" className="text-xs">Spanish</SelectItem>
                    <SelectItem value="pt_br" className="text-xs">Portuguese (BR)</SelectItem>
                    <SelectItem value="ar" className="text-xs">Arabic</SelectItem>
                    <SelectItem value="zh" className="text-xs">Chinese</SelectItem>
                    <SelectItem value="fr" className="text-xs">French</SelectItem>
                    <SelectItem value="de" className="text-xs">German</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-400">
                  Default language for message templates and formatting
                </p>
              </div>
            </div>
          )}
        </div>
      </Tabs>

      {/* Credential Setup Dialog */}
      <CredentialSetupDialog
        open={credentialDialogOpen}
        onOpenChange={setCredentialDialogOpen}
        credentials={credentials}
        credentialsLoading={credentialsLoading}
        editingCredential={editingCredential}
        setEditingCredential={setEditingCredential}
        credentialForm={credentialForm}
        setCredentialForm={setCredentialForm}
        onSave={handleSaveCredential}
        onDelete={handleDeleteCredential}
        onEdit={handleOpenCredentialDialog}
        onRefresh={fetchCredentials}
        testingConnection={testingConnection}
        testResult={testResult}
        onTestConnection={handleTestConnection}
      />
    </div>
  );
}

// ─── Credential Setup Dialog ─────────────────────────────────────────────────

function CredentialSetupDialog({
  open,
  onOpenChange,
  credentials,
  credentialsLoading,
  editingCredential,
  setEditingCredential,
  credentialForm,
  setCredentialForm,
  onSave,
  onDelete,
  onEdit,
  onRefresh,
  testingConnection,
  testResult,
  onTestConnection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: CredentialItem[];
  credentialsLoading: boolean;
  editingCredential: CredentialItem | null;
  setEditingCredential: (cred: CredentialItem | null) => void;
  credentialForm: CredentialFormData;
  setCredentialForm: React.Dispatch<React.SetStateAction<CredentialFormData>>;
  onSave: () => void;
  onDelete: (id: string) => void;
  onEdit: (cred: CredentialItem) => void;
  onRefresh: () => void;
  testingConnection: boolean;
  testResult: 'success' | 'error' | null;
  onTestConnection: () => void;
}) {
  const isEditing = editingCredential !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Key className="size-4" />
            Credential Setup
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Manage WhatsApp Business API credentials
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="p-4 pt-0 space-y-4">
            {/* Add New / Edit Form */}
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  {isEditing ? <Pencil className="size-3" /> : <Plus className="size-3" />}
                  {isEditing ? 'Edit Credential' : 'Add New Credential'}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">Name</Label>
                  <Input
                    value={credentialForm.name}
                    onChange={(e) => setCredentialForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Production WhatsApp API"
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Key className="size-3" />
                    Access Token
                  </Label>
                  <Input
                    value={credentialForm.accessToken}
                    onChange={(e) => setCredentialForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                    placeholder="EAAxxxxxxxxxxxxx"
                    className="h-7 text-xs font-mono"
                    type="password"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Phone className="size-3" />
                      Phone Number ID
                    </Label>
                    <Input
                      value={credentialForm.phoneNumberId}
                      onChange={(e) => setCredentialForm((prev) => ({ ...prev, phoneNumberId: e.target.value }))}
                      placeholder="1234567890"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Globe className="size-3" />
                      Business Account ID
                    </Label>
                    <Input
                      value={credentialForm.businessAccountId}
                      onChange={(e) => setCredentialForm((prev) => ({ ...prev, businessAccountId: e.target.value }))}
                      placeholder="9876543210"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                    <EyeOff className="size-3" />
                    Webhook Verify Token
                  </Label>
                  <Input
                    value={credentialForm.webhookVerifyToken}
                    onChange={(e) => setCredentialForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))}
                    placeholder="your_verify_token"
                    className="h-7 text-xs"
                    type="password"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={onSave}
                  >
                    {isEditing ? (
                      <>
                        <Pencil className="size-3" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="size-3" />
                        Create
                      </>
                    )}
                  </Button>
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => {
                        setEditingCredential(null);
                        setCredentialForm(EMPTY_CREDENTIAL_FORM);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1 ml-auto"
                    onClick={onTestConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="size-3 animate-spin" />
                        Testing...
                      </>
                    ) : testResult === 'success' ? (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span className="text-emerald-600">OK</span>
                      </>
                    ) : testResult === 'error' ? (
                      <>
                        <AlertCircle className="size-3 text-red-500" />
                        <span className="text-red-500">Failed</span>
                      </>
                    ) : (
                      <>
                        <Zap className="size-3" />
                        Test
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Credentials List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Lock className="size-3" />
                  Saved Credentials
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5"
                  onClick={onRefresh}
                >
                  <RefreshCw className={cn('size-3', credentialsLoading && 'animate-spin')} />
                </Button>
              </div>

              {credentials.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center">
                  <Key className="size-5 mx-auto mb-1.5 text-gray-300" />
                  <p className="text-xs text-gray-400">No WhatsApp credentials yet</p>
                  <p className="text-[10px] text-gray-300">Use the form above to add one</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between p-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Lock className="size-3 text-gray-400" />
                          <span className="text-xs font-medium truncate">{cred.name}</span>
                          <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                            {cred.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 pl-5">
                          {cred.data?.accessToken && (
                            <span className="flex items-center gap-0.5">
                              <Key className="size-2.5" />
                              •••••{cred.data.accessToken.slice(-4)}
                            </span>
                          )}
                          {cred.data?.phoneNumberId && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="size-2.5" />
                              {cred.data.phoneNumberId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => onEdit(cred)}
                        >
                          <Pencil className="size-2.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="size-2.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{cred.name}&quot;? This action cannot be undone.
                                Any nodes using this credential will need to be reconfigured.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(cred.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contact List Manager Dialog ─────────────────────────────────────────────

function ContactListManagerDialog({
  contactLists,
  setContactLists,
  contactListsLoading,
  setContactListsLoading,
}: {
  contactLists: ContactList[];
  setContactLists: React.Dispatch<React.SetStateAction<ContactList[]>>;
  contactListsLoading: boolean;
  setContactListsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [open, setOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ContactListEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Create/edit form
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('custom');
  const [formDescription, setFormDescription] = useState('');
  const [formRoleFilter, setFormRoleFilter] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);

  // New entry form
  const [newEntryName, setNewEntryName] = useState('');
  const [newEntryPhone, setNewEntryPhone] = useState('');

  const fetchContactLists = useCallback(async () => {
    setContactListsLoading(true);
    try {
      const res = await authFetch('/api/contact-lists');
      if (res.ok) {
        const data = await res.json();
        setContactLists(data);
      }
    } catch (err) {
      console.error('Failed to fetch contact lists:', err);
    } finally {
      setContactListsLoading(false);
    }
  }, [setContactLists, setContactListsLoading]);

  const fetchEntries = useCallback(async (listId: string) => {
    setEntriesLoading(true);
    try {
      const res = await authFetch(`/api/contact-lists/${listId}/entries`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  // Fetch entries when selected list changes
  useEffect(() => {
    if (selectedListId && open) {
      fetchEntries(selectedListId);
    } else {
      setEntries([]);
    }
  }, [selectedListId, open, fetchEntries]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchContactLists();
      resetForm();
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormType('custom');
    setFormDescription('');
    setFormRoleFilter('');
    setEditingListId(null);
  };

  const handleCreateOrEdit = async () => {
    if (!formName.trim()) {
      toast.error('List name is required');
      return;
    }

    try {
      if (editingListId) {
        // Update existing list
        const res = await authFetch('/api/contact-lists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingListId,
            name: formName,
            description: formDescription,
            type: formType,
            roleFilter: formType === 'role_based' ? formRoleFilter : undefined,
          }),
        });
        if (res.ok) {
          toast.success('Contact list updated');
        }
      } else {
        // Create new list
        const res = await authFetch('/api/contact-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            type: formType,
            roleFilter: formType === 'role_based' ? formRoleFilter : undefined,
            syncFromDb: true,
          }),
        });
        if (res.ok) {
          toast.success('Contact list created');
        }
      }

      resetForm();
      await fetchContactLists();
    } catch (err) {
      console.error('Failed to save contact list:', err);
      toast.error('Failed to save contact list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const res = await authFetch(`/api/contact-lists?id=${listId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Contact list deleted');
        if (selectedListId === listId) {
          setSelectedListId(null);
          setEntries([]);
        }
        await fetchContactLists();
      }
    } catch (err) {
      console.error('Failed to delete contact list:', err);
      toast.error('Failed to delete contact list');
    }
  };

  const handleEditList = (list: ContactList) => {
    setEditingListId(list.id);
    setFormName(list.name);
    setFormType(list.type);
    setFormDescription(list.description || '');
    setFormRoleFilter(list.roleFilter || '');
  };

  const handleAddEntry = async () => {
    if (!selectedListId || !newEntryName.trim() || !newEntryPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      const res = await authFetch(`/api/contact-lists/${selectedListId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEntryName, phone: newEntryPhone }),
      });
      if (res.ok) {
        toast.success('Entry added');
        setNewEntryName('');
        setNewEntryPhone('');
        await fetchEntries(selectedListId);
        await fetchContactLists();
      }
    } catch (err) {
      console.error('Failed to add entry:', err);
      toast.error('Failed to add entry');
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    if (!selectedListId) return;

    try {
      const res = await authFetch(`/api/contact-lists/${selectedListId}/entries?entryId=${entryId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Entry removed');
        await fetchEntries(selectedListId);
        await fetchContactLists();
      }
    } catch (err) {
      console.error('Failed to remove entry:', err);
      toast.error('Failed to remove entry');
    }
  };

  const selectedList = contactLists.find((cl) => cl.id === selectedListId);
  const isAutoSynced = selectedList && ['role_based', 'all_employees', 'customers'].includes(selectedList.type);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] gap-1 w-full border-violet-200 text-violet-600 hover:bg-violet-50"
        >
          <Users className="size-3" />
          Manage Lists
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Users className="size-4" />
            Contact List Manager
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="p-4 pt-0 space-y-4">
            {/* Create/Edit Form */}
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  {editingListId ? <Pencil className="size-3" /> : <Plus className="size-3" />}
                  {editingListId ? 'Edit List' : 'Create New List'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Name</Label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="List name"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Type</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom" className="text-xs">Custom</SelectItem>
                        <SelectItem value="role_based" className="text-xs">Role Based</SelectItem>
                        <SelectItem value="all_employees" className="text-xs">All Employees</SelectItem>
                        <SelectItem value="customers" className="text-xs">Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">Description</Label>
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Optional description"
                    className="h-7 text-xs"
                  />
                </div>
                {formType === 'role_based' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Role Filter</Label>
                    <Select value={formRoleFilter} onValueChange={setFormRoleFilter}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="driver" className="text-xs">Driver</SelectItem>
                        <SelectItem value="technician" className="text-xs">Technician</SelectItem>
                        <SelectItem value="beautician" className="text-xs">Beautician</SelectItem>
                        <SelectItem value="doctor" className="text-xs">Doctor</SelectItem>
                        <SelectItem value="cleaner" className="text-xs">Cleaner</SelectItem>
                        <SelectItem value="packer" className="text-xs">Packer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={handleCreateOrEdit}
                  >
                    {editingListId ? (
                      <>
                        <Pencil className="size-3" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="size-3" />
                        Create
                      </>
                    )}
                  </Button>
                  {editingListId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => resetForm()}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Two-column layout: Lists | Entries */}
            <div className="grid grid-cols-2 gap-3 min-h-[300px]">
              {/* Left: Contact Lists */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <List className="size-3" />
                    Lists
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5"
                    onClick={fetchContactLists}
                  >
                    <RefreshCw className={cn('size-3', contactListsLoading && 'animate-spin')} />
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  {contactLists.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400 text-center">
                      No contact lists found
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[250px]">
                      {contactLists.map((cl) => (
                        <div
                          key={cl.id}
                          className={cn(
                            'flex items-center justify-between p-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors',
                            selectedListId === cl.id && 'bg-violet-50 border-l-2 border-l-violet-400',
                          )}
                          onClick={() => setSelectedListId(cl.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium truncate">{cl.name}</span>
                              <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                                {cl.type === 'role_based' ? 'role' : cl.type === 'all_employees' ? 'all' : cl.type === 'customers' ? 'cust' : 'custom'}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {cl.entryCount} {cl.entryCount === 1 ? 'entry' : 'entries'}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-5"
                              onClick={(e) => { e.stopPropagation(); handleEditList(cl); }}
                            >
                              <Pencil className="size-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-5 text-red-400 hover:text-red-600"
                              onClick={(e) => { e.stopPropagation(); handleDeleteList(cl.id); }}
                            >
                              <Trash2 className="size-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              </div>

              {/* Right: Entries */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Users className="size-3" />
                  Entries
                  {selectedList && (
                    <span className="text-gray-400 font-normal">({selectedList.name})</span>
                  )}
                </Label>

                {!selectedListId ? (
                  <div className="border rounded-md p-3 text-xs text-gray-400 text-center flex items-center justify-center h-[250px]">
                    <div className="flex flex-col items-center gap-2">
                      <ChevronRight className="size-5 text-gray-300" />
                      <span>Select a list to view entries</span>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    {/* Add entry form for custom lists */}
                    {isAutoSynced ? (
                      <div className="p-2 bg-blue-50 border-b text-[10px] text-blue-600 flex items-center gap-1.5">
                        <RefreshCw className="size-3" />
                        Auto-synced from {selectedList.type === 'role_based' ? `"${selectedList.roleFilter}" role` : selectedList.type === 'all_employees' ? 'employees' : 'customers'}
                      </div>
                    ) : (
                      <div className="p-2 border-b bg-gray-50 space-y-1.5">
                        <div className="text-[10px] text-gray-500">Add entry:</div>
                        <div className="flex gap-1">
                          <Input
                            value={newEntryName}
                            onChange={(e) => setNewEntryName(e.target.value)}
                            placeholder="Name"
                            className="h-6 text-[10px] flex-1"
                          />
                          <Input
                            value={newEntryPhone}
                            onChange={(e) => setNewEntryPhone(e.target.value)}
                            placeholder="Phone"
                            className="h-6 text-[10px] flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6 shrink-0"
                            onClick={handleAddEntry}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="max-h-[200px]">
                      {entriesLoading ? (
                        <div className="p-3 text-xs text-gray-400 text-center">
                          Loading...
                        </div>
                      ) : entries.length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 text-center">
                          No entries
                        </div>
                      ) : (
                        entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-1.5 border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs truncate">{entry.name}</span>
                                {entry.isLive && (
                                  <Badge variant="outline" className="text-[8px] h-3.5 bg-green-50 text-green-600">
                                    live
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400">{entry.phone}</div>
                            </div>
                            {!isAutoSynced && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-5 text-red-400 hover:text-red-600 shrink-0"
                                onClick={() => handleRemoveEntry(entry.id)}
                              >
                                <X className="size-2.5" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
