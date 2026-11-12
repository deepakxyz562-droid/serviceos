import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Card,
  Action,
  ErrorNotice,
  Loading,
  Chip,
  Field,
  Badge,
  ui,
  colors,
} from '../src/components/ui';
import { useUnsavedWarning } from '../src/hooks/use-unsaved-warning';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { getBgosWebUrl } from '../src/lib/bgos-urls';
import { WEB_URL } from '../src/lib/constants';
import {
  AVATAR_CATALOG,
  type FormAgentData,
  type FaqPair,
} from '../../src/features/forms/types/agent-types';
import { withProtectedRoute } from '../src/components/navigation/protected-route';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

type Tab = 'overview' | 'knowledge' | 'channels' | 'test';

// ─── Voice Tone Presets ───────────────────────────────────────────────────────
const VOICE_TONES = [
  { key: 'friendly', label: 'Friendly', emoji: '😊', desc: 'Warm, helpful & conversational', quote: '“Hello! I would love to help you find the perfect time today!”' },
  { key: 'professional', label: 'Professional', emoji: '💼', desc: 'Direct, polished & courteous', quote: '“Good day. How may I assist you with your project inquiry?”' },
  { key: 'sales', label: 'Sales Focus', emoji: '🚀', desc: 'Proactive & value-driven', quote: '“Welcome! Ask me for today’s exclusive offers & rates!”' },
  { key: 'empathetic', label: 'Empathetic', emoji: '🤝', desc: 'Compassionate & reassuring', quote: '“We understand your needs and are here for you every step.”' },
] as const;

// ─── Greeting Quick Starters ─────────────────────────────────────────────────
const GREETING_STARTERS = [
  { title: 'Friendly Welcome', text: 'Hello and welcome! How can I assist you with our services today?' },
  { title: 'Booking Focus', text: 'Hi there! Ready to schedule an appointment or get an upfront quote? Ask me anything!' },
  { title: 'VIP Concierge', text: 'Welcome to our premium client desk. I can answer questions, check rates, and reserve your slot.' },
];

// ─── FAQ Categories ──────────────────────────────────────────────────────────
const FAQ_CATEGORIES = ['All', 'Hours & Location', 'Pricing & Rates', 'Booking', 'Services', 'Policies'] as const;

// ─── Pre-built Local Business FAQ Suggestions ──────────────────────────────
const FAQ_SUGGESTIONS: Array<{ question: string; defaultAnswer: string; category: string }> = [
  {
    question: 'What are your operating hours and open days?',
    defaultAnswer: 'We are open Monday to Saturday from 9:00 AM to 7:00 PM. Closed on Sundays.',
    category: 'Hours & Location',
  },
  {
    question: 'Where is your business located and do you offer on-site visits?',
    defaultAnswer: 'We are located at our main studio and also provide doorstep service across the local metro area.',
    category: 'Hours & Location',
  },
  {
    question: 'How do I book an appointment or consultation?',
    defaultAnswer: 'You can book instantly through our online booking link or by asking me right here to reserve a slot.',
    category: 'Booking',
  },
  {
    question: 'What payment methods do you accept?',
    defaultAnswer: 'We accept all major credit/debit cards, UPI, cash, and digital bank transfers.',
    category: 'Pricing & Rates',
  },
  {
    question: 'What is your rescheduling or cancellation policy?',
    defaultAnswer: 'You can reschedule or cancel free of charge up to 24 hours before your scheduled appointment.',
    category: 'Policies',
  },
  {
    question: 'Do you offer emergency or weekend services?',
    defaultAnswer: 'Yes, emergency requests are handled on priority. Please contact our support line directly for immediate dispatch.',
    category: 'Services',
  },
];

// ─── Industry Quick-Start Templates ─────────────────────────────────────────
interface IndustryTemplate {
  id: string;
  name: string;
  roleTitle: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  badge: string;
  tone: 'friendly' | 'professional' | 'sales' | 'empathetic';
  avatarUrl: string;
  welcomeGreeting: string;
  faqs: FaqPair[];
}

const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'salon',
    name: 'Salon Concierge',
    roleTitle: 'Beauty & Hair Specialist',
    icon: 'content-cut',
    badge: 'Salon & Spa',
    tone: 'friendly',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Welcome to our salon! I can help you check services, view pricing, and reserve your appointment.',
    faqs: [
      { id: 'f1', question: 'What haircut and styling services do you provide?', answer: 'We offer precision hair cutting, blowouts, coloring, balayage, keratin treatments, and bridal styling.' },
      { id: 'f2', question: 'How can I book an appointment?', answer: 'You can book directly via our online booking link or message us here with your preferred time.' },
      { id: 'f3', question: 'Do you accept walk-ins?', answer: 'Walk-ins are welcome based on stylist availability, though we recommend booking in advance.' },
    ],
  },
  {
    id: 'contractor',
    name: 'Home Services Dispatch',
    roleTitle: 'Field Estimator & Dispatcher',
    icon: 'handyman',
    badge: 'Home Repair & HVAC',
    tone: 'professional',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Hello! Looking for repair, installation, or inspection? I can get you a quick quote or schedule a field visit.',
    faqs: [
      { id: 'f1', question: 'Do you offer free estimates?', answer: 'Yes, we provide free upfront estimates for all standard repair and installation jobs.' },
      { id: 'f2', question: 'What areas do you serve?', answer: 'We serve the entire metropolitan area and surrounding suburbs within a 25-mile radius.' },
      { id: 'f3', question: 'Are you licensed and insured?', answer: 'Yes, our team is fully licensed, bonded, and insured with a 100% satisfaction guarantee.' },
    ],
  },
  {
    id: 'healthcare',
    name: 'Clinic Patient Concierge',
    roleTitle: 'Patient Care Coordinator',
    icon: 'medical-services',
    badge: 'Healthcare & Dental',
    tone: 'empathetic',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813576-905c149eb569?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Hello and welcome. I am here to help you schedule appointments, review accepted insurance, and answer care inquiries.',
    faqs: [
      { id: 'f1', question: 'What insurance plans do you accept?', answer: 'We accept most major PPO and health insurance plans. Please contact our reception to verify your specific coverage.' },
      { id: 'f2', question: 'What should I bring for my first consultation?', answer: 'Please bring a valid photo ID, your insurance card, and any recent medical or dental records.' },
      { id: 'f3', question: 'What is your appointment cancellation policy?', answer: 'We kindly request at least 24 hours notice for any cancellations or rescheduling.' },
    ],
  },
  {
    id: 'sales',
    name: 'Client Advisor',
    roleTitle: 'Senior Account Executive',
    icon: 'trending-up',
    badge: 'Sales & Professional',
    tone: 'sales',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    welcomeGreeting: 'Hi there! Glad you stopped by. Tell me what service you need and I will guide you to the best package and pricing.',
    faqs: [
      { id: 'f1', question: 'What packages or pricing do you offer?', answer: 'We offer tailored plans suited for individuals and businesses. Let us know your requirements and we will send a customized proposal.' },
      { id: 'f2', question: 'How quickly can we get started?', answer: 'We can onboard and begin your project within 24 to 48 hours of agreement.' },
      { id: 'f3', question: 'How can I speak directly with a representative?', answer: 'Leave your phone number or email and our senior advisor will call you back within 15 minutes.' },
    ],
  },
];

interface ChannelStatusData {
  whatsapp?: { connected: boolean; phoneNumber?: string; providerName?: string; reason?: string };
  phone?: { addonActive: boolean; phoneNumber?: string; status?: string };
  sms?: { connected: boolean };
}

function AgentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resource = useResource<{ agents: FormAgentData[] }>('/api/forms/agents');
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');

  const [tab, setTab] = useState<Tab>('overview');
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<FormAgentData | null>(null);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty);
  const dirtyRef = useRef(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showReadinessList, setShowReadinessList] = useState(false);

  // Channels status
  const [channelStatus, setChannelStatus] = useState<ChannelStatusData | null>(null);

  // Modals & Pickers
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState<string>('General');
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqIds, setExpandedFaqIds] = useState<Set<string>>(new Set());
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [generatingFaqs, setGeneratingFaqs] = useState(false);

  // Fast Creation Form
  const [customName, setCustomName] = useState('');

  // Interactive Test State
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [testInput, setTestInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testChips, setTestChips] = useState<string[]>([
    'What services do you offer?',
    'What are your business hours?',
    'How do I book an appointment?',
    'What are your prices?',
  ]);
  const chatScrollRef = useRef<ScrollViewInstance>(null);

  // Synchronize draft when resource loads or selection changes
  useEffect(() => {
    if (dirtyRef.current) return;
    const list = resource.data?.agents || [];
    const selected = list.find((a) => a.id === selectedId) || list[0];
    if (selected) {
      setDraft(selected);
      setSelectedId(selected.id);
      // Fetch channel status for this agent
      void (async () => {
        try {
          const res = await apiRequest<ChannelStatusData>(`/api/forms/agents/${selected.id}/channel-status`);
          setChannelStatus(res);
        } catch {
          setChannelStatus(null);
        }
      })();
    } else {
      setDraft(null);
      setSelectedId('');
      setChannelStatus(null);
    }
  }, [resource.data, selectedId]);

  function triggerHaptic(style = Haptics.ImpactFeedbackStyle.Light) {
    try {
      void Haptics.impactAsync(style);
    } catch {}
  }

  function edit(patch: Partial<FormAgentData>) {
    if (!draft) return;
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
    dirtyRef.current = true;
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{ agent: FormAgentData }>('/api/forms/agents', {
        method: 'POST',
        body: {
          id: draft.id,
          name: draft.name.trim(),
          roleTitle: draft.roleTitle?.trim() || null,
          voiceTone: draft.voiceTone || 'friendly',
          avatarUrl: draft.avatarUrl || null,
          welcomeGreeting: draft.welcomeGreeting?.trim() || null,
          knowledge: draft.knowledge || { faqPairs: [] },
          statusText: draft.statusText || 'Online',
        },
      });

      dirtyRef.current = false;
      setDirty(false);
      setNotice('Assistant saved successfully!');
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setTimeout(() => setNotice(null), 3000);
      setDraft(result.agent);
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message || 'Failed to save assistant changes.');
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    } finally {
      setBusy(false);
    }
  }

  async function createFromTemplate(template: IndustryTemplate) {
    setBusy(true);
    setError(null);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await apiRequest<{ agent: FormAgentData }>('/api/forms/agents', {
        method: 'POST',
        body: {
          name: template.name,
          roleTitle: template.roleTitle,
          voiceTone: template.tone,
          avatarUrl: template.avatarUrl,
          welcomeGreeting: template.welcomeGreeting,
          knowledge: { faqPairs: template.faqs },
          statusText: 'Online',
        },
      });
      dirtyRef.current = false;
      setDirty(false);
      setNotice(`Created ${template.name}!`);
      setTimeout(() => setNotice(null), 3000);
      await resource.refresh();
      setSelectedId(result.agent.id);
      setDraft(result.agent);
    } catch (e) {
      setError((e as Error).message || 'Failed to create assistant from template.');
    } finally {
      setBusy(false);
    }
  }

  async function createCustom() {
    if (!customName.trim()) return;
    setBusy(true);
    setError(null);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await apiRequest<{ agent: FormAgentData }>('/api/forms/agents', {
        method: 'POST',
        body: {
          name: customName.trim(),
          roleTitle: 'Concierge & Intake Specialist',
          voiceTone: 'friendly',
          welcomeGreeting: `Hello! I am ${customName.trim()}. How can I help you today?`,
          knowledge: { faqPairs: [] },
          statusText: 'Online',
        },
      });
      setCustomName('');
      dirtyRef.current = false;
      setDirty(false);
      setNotice('Custom assistant ready!');
      setTimeout(() => setNotice(null), 3000);
      await resource.refresh();
      setSelectedId(result.agent.id);
      setDraft(result.agent);
    } catch (e) {
      setError((e as Error).message || 'Failed to create assistant.');
    } finally {
      setBusy(false);
    }
  }

  function toggleFaqAccordion(id: string) {
    triggerHaptic();
    setExpandedFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOpenAddFaq(prefillQuestion?: string, prefillAnswer?: string) {
    setEditingFaqId(null);
    setFaqQuestion(prefillQuestion || '');
    setFaqAnswer(prefillAnswer || '');
    setFaqCategory('General');
    setFaqModalOpen(true);
  }

  function handleOpenEditFaq(faq: FaqPair) {
    setEditingFaqId(faq.id);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqCategory('General');
    setFaqModalOpen(true);
  }

  function handleSaveFaq() {
    if (!faqQuestion.trim() || !faqAnswer.trim() || !draft) return;
    const currentFaqs = draft.knowledge?.faqPairs || [];

    let updated: FaqPair[];
    if (editingFaqId) {
      updated = currentFaqs.map((f) =>
        f.id === editingFaqId ? { ...f, question: faqQuestion.trim(), answer: faqAnswer.trim() } : f
      );
    } else {
      const newFaq: FaqPair = {
        id: `faq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
      };
      updated = [newFaq, ...currentFaqs];
      // Auto-expand newly added FAQ
      setExpandedFaqIds((prev) => new Set(prev).add(newFaq.id));
    }

    edit({
      knowledge: {
        ...(draft.knowledge || {}),
        faqPairs: updated,
      },
    });

    setFaqModalOpen(false);
    setFaqQuestion('');
    setFaqAnswer('');
    setEditingFaqId(null);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleRemoveFaq(id: string) {
    Alert.alert('Delete Knowledge Answer?', 'This question will no longer be used by your assistant to answer customers.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (!draft) return;
          const currentFaqs = draft.knowledge?.faqPairs || [];
          edit({
            knowledge: {
              ...(draft.knowledge || {}),
              faqPairs: currentFaqs.filter((f) => f.id !== id),
            },
          });
          setExpandedFaqIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }

  async function generateAiFaqs() {
    if (!draft) return;
    setGeneratingFaqs(true);
    setError(null);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const bizName = workspace.data?.bookingPageConfig?.businessName || workspace.data?.name || draft.name;
      const prompt = `Generate 5 realistic customer FAQ questions and concise answers for a business named "${bizName}". Include questions about operating hours, pricing estimates, booking appointments, services offered, and satisfaction guarantee.`;

      const res = await apiRequest<{ success?: boolean; agent?: FormAgentData }>('/api/forms/agents/generate', {
        method: 'POST',
        body: { prompt },
      });

      const newFaqs = res.agent?.knowledge?.faqPairs || [];
      if (!newFaqs.length) throw new Error('AI was unable to generate FAQs at this moment. Please try again.');

      const currentFaqs = draft.knowledge?.faqPairs || [];
      const merged = [...currentFaqs];
      let addedCount = 0;

      for (const f of newFaqs) {
        if (!merged.some((m) => m.question.toLowerCase() === f.question.toLowerCase())) {
          merged.push({
            id: f.id || `faq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            question: f.question,
            answer: f.answer,
          });
          addedCount++;
        }
      }

      edit({
        knowledge: {
          ...(draft.knowledge || {}),
          faqPairs: merged,
        },
      });

      setNotice(`✨ Added ${addedCount} AI-generated FAQs! Review & tap Save.`);
      setTimeout(() => setNotice(null), 4000);
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (e) {
      setError((e as Error).message || 'Failed to auto-generate FAQs.');
    } finally {
      setGeneratingFaqs(false);
    }
  }

  async function testChat(overrideMessage?: string) {
    const textToSend = (overrideMessage || testInput).trim();
    if (!textToSend || !draft || testing) return;

    setTestInput('');
    const userMsg = { role: 'user' as const, content: textToSend };
    const history = [...messages, userMsg];
    setMessages(history);
    setTesting(true);
    setError(null);
    triggerHaptic();

    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const result = await apiRequest<{
        reply?: string;
        response?: string;
        text?: string;
        contextualSuggestions?: string[];
      }>(`/api/forms/agents/${draft.id}/chat`, {
        method: 'POST',
        body: { message: textToSend, history },
      });
      const reply = result.reply || result.response || result.text;
      if (!reply) throw new Error('No reply received from assistant.');

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

      if (Array.isArray(result.contextualSuggestions) && result.contextualSuggestions.length > 0) {
        setTestChips(result.contextualSuggestions.slice(0, 4));
      }
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e) {
      setMessages(history);
      setTestInput(textToSend);
      setError((e as Error).message || 'Failed to get answer. Please try again.');
    } finally {
      setTesting(false);
    }
  }

  function reload() {
    Alert.alert('Discard Unsaved Changes?', 'All recent edits will be reverted to the last saved state.', [
      { text: 'Keep Editing', style: 'cancel' },
      {
        text: 'Discard & Reload',
        style: 'destructive',
        onPress: () => {
          dirtyRef.current = false;
          setDirty(false);
          setError(null);
          void resource.refresh();
        },
      },
    ]);
  }

  // Derived setup readiness calculations
  const faqs = draft?.knowledge?.faqPairs || [];
  const filteredFaqs = useMemo(() => {
    let result = faqs;
    if (selectedCategory !== 'All') {
      result = result.filter((f) => {
        const catMatch = FAQ_SUGGESTIONS.find(
          (s) => s.question.toLowerCase() === f.question.toLowerCase()
        )?.category;
        return catMatch === selectedCategory;
      });
    }
    if (faqSearch.trim()) {
      const q = faqSearch.toLowerCase();
      result = result.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    }
    return result;
  }, [faqs, selectedCategory, faqSearch]);

  const readinessScore = useMemo(() => {
    if (!draft) return 0;
    let score = 20; // base created
    if (draft.name && draft.roleTitle) score += 20;
    if (draft.welcomeGreeting && draft.welcomeGreeting.length > 15) score += 20;
    if (faqs.length >= 1) score += 15;
    if (faqs.length >= 3) score += 15;
    if (draft.avatarUrl) score += 10;
    return Math.min(100, score);
  }, [draft, faqs]);

  const readinessChecklist = useMemo(() => {
    if (!draft) return [];
    return [
      {
        title: 'Assistant Identity',
        detail: 'Name and professional job title configured',
        done: Boolean(draft.name && draft.roleTitle),
        tab: 'overview' as const,
      },
      {
        title: 'Welcome Message',
        detail: 'Custom greeting for new visitors',
        done: Boolean(draft.welcomeGreeting && draft.welcomeGreeting.length > 15),
        tab: 'overview' as const,
      },
      {
        title: 'Trained Knowledge Base',
        detail: `${faqs.length} FAQs active (3 recommended)`,
        done: faqs.length >= 3,
        tab: 'knowledge' as const,
      },
      {
        title: 'Avatar Portrait',
        detail: 'Representative brand persona photo',
        done: Boolean(draft.avatarUrl),
        tab: 'overview' as const,
      },
      {
        title: 'WhatsApp Channel',
        detail: channelStatus?.whatsapp?.connected ? 'Connected to business number' : 'Connect Meta Cloud API',
        done: Boolean(channelStatus?.whatsapp?.connected),
        tab: 'channels' as const,
      },
    ];
  }, [draft, faqs, channelStatus]);

  const [syncSummary, setSyncSummary] = useState<{
    syncedAt: string;
    triggerSource: string;
    servicesCount: number;
    hoursConfigured: boolean;
    hasLocation: boolean;
    hasBrandBrain: boolean;
    hasPhone: boolean;
    faqCount: number;
    unansweredPendingCount: number;
    publicCardSlug: string;
  } | null>(null);
  const [allowOwnerHandoff, setAllowOwnerHandoff] = useState(true);
  const [syncingBusiness, setSyncingBusiness] = useState(false);
  const [unansweredList, setUnansweredList] = useState<
    Array<{ id: string; question: string; sessionId?: string; askedAt: string }>
  >([]);
  const [teachItem, setTeachItem] = useState<{ id: string; question: string } | null>(null);
  const [teachAnswerText, setTeachAnswerText] = useState('');
  const [teachingSaving, setTeachingSaving] = useState(false);
  const autoProvisionTriggeredRef = useRef(false);

  const refreshSyncAndUnanswered = useCallback(async () => {
    try {
      const [syncRes, unansweredRes] = await Promise.all([
        apiRequest<{
          chatbot?: {
            allowOwnerHandoff?: boolean;
            autoSyncSummary?: typeof syncSummary;
          } | null;
        }>('/api/bgos/chatbot/sync').catch(() => null),
        apiRequest<{
          questions?: Array<{ id: string; question: string; sessionId?: string; askedAt: string }>;
        }>('/api/ai/knowledge/unanswered?status=pending').catch(() => null),
      ]);
      if (syncRes?.chatbot) {
        if (typeof syncRes.chatbot.allowOwnerHandoff === 'boolean') {
          setAllowOwnerHandoff(syncRes.chatbot.allowOwnerHandoff);
        }
        if (syncRes.chatbot.autoSyncSummary) {
          setSyncSummary(syncRes.chatbot.autoSyncSummary);
        }
      }
      if (unansweredRes?.questions) {
        setUnansweredList(unansweredRes.questions);
      }
    } catch {
      // Non-fatal background refresh
    }
  }, []);

  useEffect(() => {
    void refreshSyncAndUnanswered();
  }, [refreshSyncAndUnanswered]);

  // Auto-provision & auto-train primary chatbot when business opens screen with 0 agents
  useEffect(() => {
    if (resource.loading || !resource.data || draft || autoProvisionTriggeredRef.current) return;
    autoProvisionTriggeredRef.current = true;
    setSyncingBusiness(true);
    apiRequest<{
      autoSyncSummary?: typeof syncSummary;
    }>('/api/bgos/chatbot/sync', {
      method: 'POST',
      body: JSON.stringify({ triggerSource: 'mobile_auto_provision' }),
    })
      .then((res) => {
        if (res?.autoSyncSummary) setSyncSummary(res.autoSyncSummary);
        void resource.refresh();
        void refreshSyncAndUnanswered();
      })
      .catch(() => {
        // Allow manual creation/retry if auto-provision fails
      })
      .finally(() => {
        setSyncingBusiness(false);
      });
  }, [draft, refreshSyncAndUnanswered, resource]);

  async function handleManualSyncBusiness() {
    if (syncingBusiness) return;
    setSyncingBusiness(true);
    try {
      const res = await apiRequest<{
        autoSyncSummary?: typeof syncSummary;
      }>('/api/bgos/chatbot/sync', {
        method: 'POST',
        body: JSON.stringify({ triggerSource: 'mobile_manual_sync', allowOwnerHandoff }),
      });
      if (res?.autoSyncSummary) setSyncSummary(res.autoSyncSummary);
      await Promise.all([resource.refresh(), refreshSyncAndUnanswered()]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Chatbot Synced', 'Your AI assistant is up to date with your latest services, hours, location, and brand voice.');
    } catch (e) {
      Alert.alert('Sync Failed', e instanceof Error ? e.message : 'Could not sync business data right now.');
    } finally {
      setSyncingBusiness(false);
    }
  }

  async function handleToggleOwnerHandoff(nextValue: boolean) {
    setAllowOwnerHandoff(nextValue);
    try {
      await apiRequest('/api/bgos/chatbot/sync', {
        method: 'POST',
        body: JSON.stringify({ allowOwnerHandoff: nextValue, triggerSource: 'handoff_toggle' }),
      });
    } catch {
      setAllowOwnerHandoff(!nextValue);
      Alert.alert('Error', 'Could not update live chat handoff preference.');
    }
  }

  async function handleTeachSubmit() {
    if (!teachItem || !teachAnswerText.trim() || teachingSaving) return;
    setTeachingSaving(true);
    try {
      await apiRequest('/api/ai/knowledge/unanswered', {
        method: 'POST',
        body: JSON.stringify({
          id: teachItem.id,
          action: 'resolve',
          question: teachItem.question,
          answer: teachAnswerText.trim(),
        }),
      });
      setTeachItem(null);
      setTeachAnswerText('');
      await Promise.all([refreshSyncAndUnanswered(), resource.refresh()]);
      Alert.alert('Answer Saved', 'Your AI assistant learned this answer and will use it automatically.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save answer.');
    } finally {
      setTeachingSaving(false);
    }
  }

  async function handleDismissUnanswered(id: string) {
    try {
      await apiRequest('/api/ai/knowledge/unanswered', {
        method: 'POST',
        body: JSON.stringify({ id, action: 'dismiss' }),
      });
      setUnansweredList((prev) => prev.filter((item) => item.id !== id));
    } catch {
      Alert.alert('Error', 'Could not dismiss question.');
    }
  }

  const publicChatUrl = draft ? `${WEB_URL}/agent/${draft.slug || draft.id}` : '';
  const publicBusinessPageUrl = syncSummary?.publicCardSlug
    ? `${WEB_URL}/b/${syncSummary.publicCardSlug}`
    : publicChatUrl;

  async function handleSharePublicLink() {
    const shareTarget = publicBusinessPageUrl || publicChatUrl;
    if (!shareTarget) return;
    try {
      await Share.share({
        title: `${draft?.name || 'Business'} AI Assistant`,
        message: `Visit our business page & chat with our assistant anytime: ${shareTarget}`,
        url: shareTarget,
      });
    } catch {
      Alert.alert('Error', 'Could not open share menu.');
    }
  }

  // ─── Render: Loading State ────────────────────────────────────────────────
  if (resource.loading && !resource.data) {
    return (
      <Screen title="Business Assistant" subtitle="AI Chat & Booking Concierge" showBack>
        <Loading />
      </Screen>
    );
  }

  // ─── Render: Empty State / Fast Creator ───────────────────────────────────
  if (!draft) {
    return (
      <Screen
        title="Business Assistant"
        subtitle="24/7 AI Chatbot & Customer Intake"
        showBack
        onRefresh={() => resource.refresh()}
      >
        <ErrorNotice message={error || resource.error} retry={() => resource.refresh()} />

        {/* Hero Card */}
        <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="smart-toy" size={28} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
                Launch Your AI Assistant
              </Text>
              <Text style={{ fontSize: 12.5, color: colors.accent, fontWeight: '600', marginTop: 2 }}>
                Answers customer questions & books jobs 24/7
              </Text>
            </View>
          </View>
          <Text style={{ color: '#E8F8EF', fontSize: 13, lineHeight: 18, marginTop: 12 }}>
            Choose an industry template below to launch in 1 tap with pre-loaded business FAQs, or build a custom assistant.
          </Text>
        </Card>

        {/* Industry Starter Templates */}
        <Text style={[ui.heading, { marginTop: 8 }]}>Quick-Start Industry Templates</Text>

        <View style={{ gap: 10 }}>
          {INDUSTRY_TEMPLATES.map((tmpl) => (
            <Pressable
              key={tmpl.id}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void createFromTemplate(tmpl)}
              style={({ pressed }) => ({
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                opacity: busy ? 0.6 : pressed ? 0.9 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              })}
            >
              <Image
                source={{ uri: tmpl.avatarUrl }}
                style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E2E8F0' }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>{tmpl.name}</Text>
                  <View style={{ backgroundColor: colors.brandSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brand }}>{tmpl.badge}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.muted }}>{tmpl.roleTitle}</Text>
                <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 2 }}>
                  ⚡ Includes 3 pre-written FAQs & greetings
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={18} color={colors.brand} />
            </Pressable>
          ))}
        </View>

        {/* Custom Assistant Fallback */}
        <Card style={{ marginTop: 6, gap: 10 }}>
          <Text style={ui.heading}>Or Create a Custom Assistant</Text>
          <Field
            label="Assistant Name"
            value={customName}
            onChangeText={setCustomName}
            placeholder="e.g. Metro Pro Assistant"
          />
          <Action
            label={busy ? 'Creating Assistant…' : 'Create Custom Assistant'}
            disabled={busy || !customName.trim()}
            onPress={() => void createCustom()}
          />
        </Card>
      </Screen>
    );
  }

  // ─── Render: Main Assistant Studio ───────────────────────────────────────
  return (
    <Screen
      title="Business Assistant"
      subtitle="AI Chat, Booking & Customer Intake"
      showBack
      scrollable={tab !== 'test'}
      onRefresh={() => {
        if (dirty) reload();
        else void resource.refresh();
      }}
      floatingAction={
        dirty ? (
          <View
            style={{
              backgroundColor: '#070B2D',
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <MaterialIcons name="edit-note" size={20} color="#F59E0B" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                Unsaved edits pending
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={reload}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                }}
              >
                <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }}>Discard</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void save()}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  backgroundColor: colors.brand,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  {busy ? 'Saving…' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : undefined
      }
    >
      <ErrorNotice message={error || resource.error} retry={dirty ? reload : resource.refresh} />

      {notice ? (
        <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12, marginBottom: 4 }}>
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>{notice}</Text>
        </View>
      ) : null}

      {/* ── 1. Hero Profile & Readiness Banner ── */}
      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Avatar with Accessible 36x36 Edit Trigger */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change assistant avatar"
            onPress={() => setAvatarModalOpen(true)}
            style={{ position: 'relative' }}
          >
            <Image
              source={{
                uri:
                  draft.avatarUrl ||
                  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
              }}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E2E8F0' }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                backgroundColor: colors.brand,
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <MaterialIcons name="photo-camera" size={13} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Info & Status */}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
                {draft.name}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: '#ECFDF5',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#065F46' }}>Ready</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12.5, color: colors.muted }} numberOfLines={1}>
              {draft.roleTitle || 'AI Business Assistant'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.brand, fontWeight: '700' }}>
              Tone: {draft.voiceTone ? draft.voiceTone.toUpperCase() : 'FRIENDLY'} • {faqs.length} FAQs Trained
            </Text>
          </View>
        </View>

        {/* Interactive Readiness Score Bar */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowReadinessList((prev) => !prev)}
          style={{ paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.muted }}>
                Setup Readiness
              </Text>
              <MaterialIcons
                name={showReadinessList ? 'expand-less' : 'expand-more'}
                size={16}
                color={colors.muted}
              />
            </View>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: readinessScore >= 80 ? '#10B981' : '#F59E0B' }}>
              {readinessScore}% Complete
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
            <View
              style={{
                width: `${readinessScore}%`,
                height: '100%',
                backgroundColor: readinessScore >= 80 ? '#10B981' : '#F59E0B',
                borderRadius: 3,
              }}
            />
          </View>
        </Pressable>

        {/* Expandable Readiness Checklist */}
        {showReadinessList && (
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, gap: 8, marginTop: 2 }}>
            {readinessChecklist.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <MaterialIcons
                    name={item.done ? 'check-circle' : 'radio-button-unchecked'}
                    size={16}
                    color={item.done ? '#10B981' : colors.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: item.done ? colors.muted : colors.ink }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.muted }} numberOfLines={1}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
                {!item.done && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      triggerHaptic();
                      setTab(item.tab);
                    }}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: colors.brandSoft,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.brand }}>Complete</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Multi-Agent Switcher (if tenant has >1 assistant) */}
      {(resource.data?.agents.length || 0) > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {resource.data?.agents.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              selected={selectedId === a.id}
              onPress={() => {
                if (dirty || testing || busy) {
                  setError('Please save or discard pending edits before switching assistants.');
                  return;
                }
                triggerHaptic();
                setSelectedId(a.id);
                setMessages([]);
              }}
            />
          ))}
        </ScrollView>
      )}

      {/* ── 2. Segmented Navigation Tabs ── */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#F1F5F9',
          borderRadius: 14,
          padding: 3,
          gap: 2,
        }}
      >
        {(
          [
            ['overview', 'Profile', 'person-outline'],
            ['knowledge', `Knowledge (${faqs.length})`, 'auto-stories'],
            ['channels', 'Channels', 'share'],
            ['test', 'Live Test', 'chat'],
          ] as const
        ).map(([tabKey, label, iconName]) => {
          const isSelected = tab === tabKey;
          return (
            <Pressable
              key={tabKey}
              accessibilityRole="button"
              onPress={() => {
                triggerHaptic();
                setTab(tabKey);
              }}
              style={{
                flex: 1,
                paddingVertical: 9,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 4,
                backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                borderRadius: 11,
                shadowColor: isSelected ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isSelected ? 0.08 : 0,
                shadowRadius: 2,
                elevation: isSelected ? 1 : 0,
              }}
            >
              <MaterialIcons
                name={iconName}
                size={15}
                color={isSelected ? colors.brand : colors.muted}
              />
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: isSelected ? '800' : '600',
                  color: isSelected ? colors.ink : colors.muted,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── 3. Tab: Overview (Profile & Persona) ── */}
      {tab === 'overview' && (
        <View style={{ gap: 14 }}>
          {/* Auto-Trained Business Knowledge Sync Card */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>Auto-Trained From Your Business</Text>
                <Text style={ui.caption}>
                  {syncSummary?.syncedAt
                    ? `Synced ${new Date(syncSummary.syncedAt).toLocaleDateString()} · Services, hours & profile`
                    : 'Automatically synced with your Google Business & BGOS data'}
                </Text>
              </View>
              <Badge label={syncingBusiness ? 'Syncing...' : 'Auto-Synced'} success={!syncingBusiness} />
            </View>

            {syncSummary && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: `${syncSummary.servicesCount} Services`, ok: syncSummary.servicesCount > 0 },
                  { label: syncSummary.hoursConfigured ? 'Hours Synced' : 'Hours Missing', ok: syncSummary.hoursConfigured },
                  { label: syncSummary.hasLocation ? 'Location Synced' : 'No Address', ok: syncSummary.hasLocation },
                  { label: syncSummary.hasBrandBrain ? 'Brand Voice' : 'Default Voice', ok: syncSummary.hasBrandBrain },
                  { label: `${syncSummary.faqCount} FAQs`, ok: syncSummary.faqCount > 0 },
                ].map((pill) => (
                  <View
                    key={pill.label}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: pill.ok ? '#ECFDF5' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: pill.ok ? '#A7F3D0' : '#E2E8F0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '700',
                        color: pill.ok ? '#047857' : '#64748B',
                      }}
                    >
                      {pill.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Action
                  label={syncingBusiness ? 'Syncing...' : 'Sync Business Data'}
                  icon="sync"
                  disabled={syncingBusiness}
                  onPress={() => void handleManualSyncBusiness()}
                />
              </View>
              {syncSummary?.publicCardSlug ? (
                <View style={{ flex: 1 }}>
                  <Action
                    secondary
                    label="Preview Page"
                    icon="open-in-new"
                    onPress={() => void Linking.openURL(`${WEB_URL}/b/${syncSummary.publicCardSlug}`)}
                  />
                </View>
              ) : null}
            </View>
          </Card>

          {/* Live Owner Chat Handoff & Custom Guardrails */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                  Allow Visitors to Chat Live with Me
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  Customers on your public page can switch from AI to live Inbox chat with you
                </Text>
              </View>
              <Switch
                value={allowOwnerHandoff}
                onValueChange={(val) => void handleToggleOwnerHandoff(val)}
                trackColor={{ false: '#CBD5E1', true: colors.brand }}
              />
            </View>

            <Field
              label="Custom Business Rules & Do/Don'ts"
              multiline
              value={(draft.knowledge as any)?.systemPrompt || ''}
              onChangeText={(text) =>
                edit({
                  knowledge: {
                    ...(draft.knowledge || { websiteUrls: [], faqPairs: [] }),
                    systemPrompt: text,
                  } as FormAgentData['knowledge'],
                })
              }
              placeholder="e.g. Always mention free site inspection, quote in INR, never commit to Sunday bookings without owner confirmation."
            />
          </Card>
          {/* Identity Fields */}
          <Card style={{ gap: 12 }}>
            <Text style={ui.heading}>Assistant Identity</Text>
            <Field
              label="Assistant Display Name"
              value={draft.name}
              editable={!busy}
              onChangeText={(name) => edit({ name })}
              placeholder="e.g. Elena"
            />
            <Field
              label="Role or Job Title"
              value={draft.roleTitle || ''}
              editable={!busy}
              onChangeText={(roleTitle) => edit({ roleTitle })}
              placeholder="e.g. Concierge & Intake Specialist"
            />
          </Card>

          {/* Voice & Tone Selector */}
          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Voice & Personality Tone</Text>
            <Text style={ui.caption}>Controls the phrasing, warmth, and greeting style of customer replies.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {VOICE_TONES.map((tone) => {
                const isSelected = (draft.voiceTone || 'friendly') === tone.key;
                return (
                  <Pressable
                    key={tone.key}
                    accessibilityRole="button"
                    onPress={() => {
                      triggerHaptic();
                      edit({ voiceTone: tone.key });
                    }}
                    style={{
                      flex: 1,
                      minWidth: '46%',
                      backgroundColor: isSelected ? colors.brandSoft : '#F8FAFC',
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.brand : '#E2E8F0',
                      borderRadius: 12,
                      padding: 10,
                      gap: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: isSelected ? colors.brand : colors.ink,
                      }}
                    >
                      {tone.label} {tone.emoji}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.muted }}>{tone.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Direct Editable Welcome Greeting Bubble */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={ui.heading}>Welcome Greeting</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>Shown to first-time visitors</Text>
            </View>

            {/* Quick Starters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {GREETING_STARTERS.map((s, idx) => (
                <Pressable
                  key={idx}
                  accessibilityRole="button"
                  onPress={() => {
                    triggerHaptic();
                    edit({ welcomeGreeting: s.text });
                  }}
                  style={{
                    backgroundColor: '#F1F5F9',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>{s.title}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 14,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image
                  source={{
                    uri:
                      draft.avatarUrl ||
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                  }}
                  style={{ width: 28, height: 28, borderRadius: 14 }}
                />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                  {draft.name} · Live Preview
                </Text>
              </View>
              <TextInput
                multiline
                numberOfLines={3}
                value={draft.welcomeGreeting || ''}
                onChangeText={(welcomeGreeting) => edit({ welcomeGreeting })}
                placeholder="e.g. Hello! Welcome to our store. How can I help you today?"
                placeholderTextColor={colors.muted}
                style={{
                  fontSize: 13.5,
                  color: colors.ink,
                  minHeight: 65,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          </Card>

          {/* Connected Actions */}
          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Online Booking Integration</Text>
            <Text style={ui.caption}>
              When customers ask to book or schedule, your assistant automatically links your booking services.
            </Text>
            <Action
              secondary
              label="Configure Booking Services"
              icon="calendar-today"
              onPress={() => router.push('/booking-page')}
            />
          </Card>
        </View>
      )}

      {/* ── 4. Tab: Knowledge Base ── */}
      {tab === 'knowledge' && (
        <View style={{ gap: 12 }}>
          {/* Action Header Card with ✨ AI Generate Button */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>Business Knowledge</Text>
                <Text style={ui.caption}>{faqs.length} questions trained</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleOpenAddFaq()}
                style={({ pressed }) => ({
                  backgroundColor: colors.brand,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ Add FAQ</Text>
              </Pressable>
            </View>

            {/* ✨ 1-Tap AI FAQ Generator Banner */}
            <Pressable
              accessibilityRole="button"
              disabled={generatingFaqs}
              onPress={() => void generateAiFaqs()}
              style={({ pressed }) => ({
                backgroundColor: colors.brandSoft,
                borderWidth: 1,
                borderColor: '#A7F3D0',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                opacity: generatingFaqs ? 0.7 : pressed ? 0.9 : 1,
              })}
            >
              {generatingFaqs ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <MaterialIcons name="auto-awesome" size={22} color={colors.brand} />
              )}
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>
                  {generatingFaqs ? 'Crafting FAQs with AI…' : '✨ Auto-Generate FAQs from Business'}
                </Text>
                <Text style={{ fontSize: 11, color: '#047857' }}>
                  Reads your services & generates 5 realistic customer questions
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={16} color={colors.brand} />
            </Pressable>

            {/* Search Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: 10,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                gap: 8,
              }}
            >
              <MaterialIcons name="search" size={18} color={colors.muted} />
              <TextInput
                value={faqSearch}
                onChangeText={setFaqSearch}
                placeholder="Search questions or keywords…"
                placeholderTextColor={colors.muted}
                style={{ flex: 1, paddingVertical: 8, fontSize: 13, color: colors.ink }}
              />
              {faqSearch ? (
                <Pressable onPress={() => setFaqSearch('')} hitSlop={10}>
                  <MaterialIcons name="close" size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {FAQ_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    onPress={() => {
                      triggerHaptic();
                      setSelectedCategory(cat);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isSelected ? colors.brand : '#F1F5F9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? '#FFFFFF' : colors.ink,
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Card>

          {/* 1-Tap FAQ Suggestions Tray */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink, paddingHorizontal: 4 }}>
              💡 Popular Questions to Add (1-Tap Prefill)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
              {FAQ_SUGGESTIONS.map((sug, idx) => {
                const alreadyExists = faqs.some((f) => f.question.toLowerCase().includes(sug.category.toLowerCase()));
                if (alreadyExists) return null;
                return (
                  <Pressable
                    key={idx}
                    accessibilityRole="button"
                    onPress={() => handleOpenAddFaq(sug.question, sug.defaultAnswer)}
                    style={({ pressed }) => ({
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      gap: 2,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="add-circle-outline" size={13} color={colors.brand} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>
                        {sug.category}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11.5, color: colors.ink, maxWidth: 200 }} numberOfLines={1}>
                      {sug.question}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Unanswered Visitor Questions (Train from Real Chats) */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>Unanswered Visitor Questions</Text>
                <Text style={ui.caption}>Questions visitors asked that need your answer</Text>
              </View>
              <Badge
                label={unansweredList.length > 0 ? `${unansweredList.length} pending` : 'All caught up'}
                success={unansweredList.length === 0}
              />
            </View>

            {unansweredList.length === 0 ? (
              <Text style={{ fontSize: 12.5, color: colors.muted }}>
                No pending questions right now. When your bot cannot answer a visitor confidently, it saves the question here so you can teach it in one tap.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {unansweredList.slice(0, 6).map((item) => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: '#FFFBEB',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                      “{item.question}”
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setTeachItem({ id: item.id, question: item.question });
                          setTeachAnswerText('');
                        }}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 8,
                          borderRadius: 9,
                          backgroundColor: colors.brand,
                        }}
                      >
                        <MaterialIcons name="school" size={15} color="#FFFFFF" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                          Teach Answer
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleDismissUnanswered(item.id)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 9,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>
                          Dismiss
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Accordion FAQ Cards */}
          {filteredFaqs.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 24, gap: 8 }}>
              <MaterialIcons name="help-outline" size={32} color={colors.muted} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                {faqSearch ? 'No matching questions found' : 'No custom FAQs added yet'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                {faqSearch
                  ? 'Try clearing your search query.'
                  : 'Add questions about your hours, location, rates, and policies.'}
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqIds.has(faq.id);
                return (
                  <View
                    key={faq.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => toggleFaqAccordion(faq.id)}
                      style={{
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink, flex: 1 }}>
                        {faq.question}
                      </Text>
                      <MaterialIcons
                        name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={20}
                        color={colors.muted}
                      />
                    </Pressable>

                    {isExpanded && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2, gap: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
                        <Text style={{ fontSize: 12.5, color: colors.muted, lineHeight: 19 }}>
                          {faq.answer}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => handleOpenEditFaq(faq)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                              backgroundColor: '#F1F5F9',
                            }}
                          >
                            <MaterialIcons name="edit" size={14} color={colors.ink} />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.ink }}>Edit</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => handleRemoveFaq(faq.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                              backgroundColor: '#FEE2E2',
                            }}
                          >
                            <MaterialIcons name="delete-outline" size={14} color="#DC2626" />
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#DC2626' }}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Web Studio Advanced Training Link */}
          <Card style={{ gap: 8 }}>
            <Text style={ui.heading}>Website & Document Indexing</Text>
            <Text style={ui.body}>
              Upload PDF price sheets, brochures, or crawl your website in the BGOS Knowledge Studio.
            </Text>
            <Action
              secondary
              label="Open Knowledge Studio · Web"
              icon="open-in-new"
              onPress={() => void Linking.openURL(getBgosWebUrl('chatbotBuilder'))}
            />
          </Card>
        </View>
      )}

      {/* ── 5. Tab: Channels (Distribution) ── */}
      {tab === 'channels' && (
        <View style={{ gap: 14 }}>
          {/* Public Web Link Card */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={ui.heading}>Shareable Web Chat</Text>
                <Text style={ui.caption}>Direct chat page hosted for your business</Text>
              </View>
              <Badge success label="Live & Active" />
            </View>

            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                Business Page URL (with Live AI Chatbot)
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: '600', color: colors.brand }}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {publicBusinessPageUrl}
              </Text>
              <Text style={{ fontSize: 10.5, color: colors.muted }}>
                Standalone Chat Link: {publicChatUrl}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Action
                  label="Share Link"
                  icon="share"
                  onPress={() => void handleSharePublicLink()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  secondary
                  label="View QR"
                  icon="qr-code"
                  onPress={() => setQrModalOpen(true)}
                />
              </View>
            </View>
          </Card>

          {/* WhatsApp Channel Card with Real Status */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: channelStatus?.whatsapp?.connected ? '#DCFCE7' : '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons
                    name="chat"
                    size={20}
                    color={channelStatus?.whatsapp?.connected ? '#16A34A' : colors.muted}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>WhatsApp Business</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {channelStatus?.whatsapp?.connected
                      ? `Connected: ${channelStatus.whatsapp.phoneNumber || 'Ready'}`
                      : 'Instant 24/7 inquiry auto-reply'}
                  </Text>
                </View>
              </View>
              {channelStatus?.whatsapp?.connected ? (
                <Badge success label="Connected" />
              ) : (
                <Badge accent label="Configure" />
              )}
            </View>
            <Text style={ui.body}>
              Connect your WhatsApp Business API number to let this assistant answer customer messages directly on WhatsApp.
            </Text>
            <Action
              secondary
              label="Review WhatsApp Integrations"
              onPress={() => router.push('/integrations')}
            />
          </Card>

          {/* Digital Card Assistant Toggle */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="contact-page" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>Digital Business Card</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Show on your digital profile</Text>
                </View>
              </View>
              <Badge success label="Connected" />
            </View>
            <Text style={ui.body}>
              Customers viewing your digital card or Google review standee can open this chat assistant with 1 tap.
            </Text>
            <Action
              secondary
              label="View Digital Card Tools"
              onPress={() => router.push('/(tabs)/tools')}
            />
          </Card>
        </View>
      )}

      {/* ── 6. Tab: Live Test Arena (Full Height, Zero Nested Scroll) ── */}
      {tab === 'test' && (
        <View style={{ flex: 1, gap: 8, marginTop: 4 }}>
          {/* Header Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>
                Live Sandbox · {draft.name}
              </Text>
            </View>
            {messages.length > 0 && (
              <Pressable
                accessibilityRole="button"
                disabled={testing}
                onPress={() => {
                  triggerHaptic();
                  setMessages([]);
                }}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <MaterialIcons name="refresh" size={14} color={colors.muted} />
                <Text style={{ fontSize: 11.5, color: colors.muted, fontWeight: '700' }}>Clear</Text>
              </Pressable>
            )}
          </View>

          {/* Full Height Conversation Window */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              overflow: 'hidden',
            }}
          >
            <ScrollView
              ref={chatScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Initial Assistant Greeting Bubble */}
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', maxWidth: '85%' }}>
                <Image
                  source={{
                    uri:
                      draft.avatarUrl ||
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                  }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0' }}
                />
                <View
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: 16,
                    borderTopLeftRadius: 4,
                    padding: 12,
                    gap: 3,
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.muted }}>
                    {draft.name} • {draft.roleTitle || 'AI Assistant'}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 18 }}>
                    {draft.welcomeGreeting || 'Hello! How can I assist you with our services today?'}
                  </Text>
                </View>
              </View>

              {/* Message History */}
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      gap: 8,
                    }}
                  >
                    {!isUser && (
                      <Image
                        source={{
                          uri:
                            draft.avatarUrl ||
                            'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                        }}
                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0' }}
                      />
                    )}
                    <View
                      style={{
                        maxWidth: '82%',
                        backgroundColor: isUser ? colors.brand : '#F1F5F9',
                        borderRadius: 16,
                        borderTopRightRadius: isUser ? 4 : 16,
                        borderTopLeftRadius: isUser ? 16 : 4,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          fontSize: 13,
                          color: isUser ? '#FFFFFF' : colors.ink,
                          lineHeight: 18,
                        }}
                      >
                        {m.content}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Animated Typing Indicator */}
              {testing && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Image
                    source={{
                      uri:
                        draft.avatarUrl ||
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                    }}
                    style={{ width: 26, height: 26, borderRadius: 13 }}
                  />
                  <View
                    style={{
                      backgroundColor: '#F1F5F9',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ActivityIndicator size="small" color={colors.brand} />
                    <Text style={{ fontSize: 12, color: colors.muted, fontStyle: 'italic', marginLeft: 4 }}>
                      {draft.name} is thinking…
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick Prompt Chips */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#F8FAFC', padding: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {testChips.map((chip, idx) => (
                  <Pressable
                    key={idx}
                    accessibilityRole="button"
                    disabled={testing}
                    onPress={() => void testChat(chip)}
                    style={({ pressed }) => ({
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      opacity: testing ? 0.5 : pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 11.5, color: colors.ink, fontWeight: '600' }}>{chip}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Sticky Chat Input Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 10,
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                backgroundColor: '#FFFFFF',
                gap: 8,
              }}
            >
              <TextInput
                value={testInput}
                onChangeText={setTestInput}
                placeholder="Ask a customer question…"
                placeholderTextColor={colors.muted}
                editable={!testing}
                onSubmitEditing={() => void testChat()}
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: colors.ink,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send question"
                disabled={testing || !testInput.trim()}
                onPress={() => void testChat()}
                style={({ pressed }) => ({
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: testInput.trim() ? colors.brand : '#E2E8F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <MaterialIcons
                  name="arrow-upward"
                  size={20}
                  color={testInput.trim() ? '#FFFFFF' : colors.muted}
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ── Modal: Avatar Selection Catalog ── */}
      <Modal visible={avatarModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Choose an Assistant Avatar</Text>
              <Pressable onPress={() => setAvatarModalOpen(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 10 }}>
              {AVATAR_CATALOG.map((item) => {
                const isSelected = draft.avatarUrl === item.url;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => {
                      triggerHaptic();
                      edit({ avatarUrl: item.url });
                      setAvatarModalOpen(false);
                    }}
                    style={{
                      width: '30%',
                      alignItems: 'center',
                      gap: 4,
                      padding: 6,
                      borderRadius: 12,
                      backgroundColor: isSelected ? colors.brandSoft : '#F8FAFC',
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? colors.brand : '#E2E8F0',
                    }}
                  >
                    <Image source={{ uri: item.url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, textAlign: 'center' }} numberOfLines={1}>
                      {item.name.split(' ')[0]}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.muted, textAlign: 'center' }} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Add / Edit FAQ ── */}
      <Modal visible={faqModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                {editingFaqId ? 'Edit Knowledge Answer' : 'Add Question & Answer'}
              </Text>
              <Pressable onPress={() => setFaqModalOpen(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              <Field
                label="Customer Question"
                value={faqQuestion}
                onChangeText={setFaqQuestion}
                placeholder="e.g. Do you offer emergency service on weekends?"
              />
              <Field
                label="Your Answer"
                multiline
                value={faqAnswer}
                onChangeText={setFaqAnswer}
                placeholder="e.g. Yes! Our technicians are on call 24/7 for urgent requests."
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Action label="Cancel" secondary onPress={() => setFaqModalOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label={editingFaqId ? 'Update FAQ' : 'Add to Assistant'}
                  disabled={!faqQuestion.trim() || !faqAnswer.trim()}
                  onPress={handleSaveFaq}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: QR Code Preview ── */}
      <Modal visible={qrModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Assistant QR Code</Text>
              <Pressable onPress={() => setQrModalOpen(false)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: -4 }}>
              Scan to chat with {draft.name} directly on mobile
            </Text>

            <View
              style={{
                padding: 16,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginVertical: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(publicBusinessPageUrl || publicChatUrl)}&size=200x200&margin=4`,
                }}
                style={{ width: 180, height: 180 }}
              />
            </View>

            <View style={{ width: '100%', gap: 8 }}>
              <Action label="Share Chat Link" icon="share" onPress={() => void handleSharePublicLink()} />
              <Action secondary label="Close" onPress={() => setQrModalOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
      {/* ── Modal: Teach Answer to Unanswered Visitor Question ── */}
      <Modal visible={Boolean(teachItem)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                Teach AI Assistant
              </Text>
              <Pressable onPress={() => setTeachItem(null)} hitSlop={10}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                Visitor Asked
              </Text>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink, marginTop: 4 }}>
                {teachItem?.question}
              </Text>
            </View>

            <Field
              label="Your Answer"
              multiline
              value={teachAnswerText}
              onChangeText={setTeachAnswerText}
              placeholder="Write the exact answer your chatbot should give next time..."
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Action label="Cancel" secondary onPress={() => setTeachItem(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label={teachingSaving ? 'Saving...' : 'Save & Train'}
                  disabled={!teachAnswerText.trim() || teachingSaving}
                  onPress={() => void handleTeachSubmit()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default withProtectedRoute(AgentsScreen);
