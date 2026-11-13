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
import * as DocumentPicker from 'expo-document-picker';
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
  const [embedFormat, setEmbedFormat] = useState<'script' | 'iframe'>('script');
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Knowledge Hub: Documents & Website Crawling
  const [knowledgeDocs, setKnowledgeDocs] = useState<
    Array<{
      id: string;
      title: string;
      sourceType: string;
      mimeType?: string | null;
      charCount?: number;
      chunkCount?: number;
      status: string;
      error?: string | null;
      createdAt: string;
    }>
  >([]);
  const [loadingKnowledgeDocs, setLoadingKnowledgeDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [crawlingWeb, setCrawlingWeb] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Document Upload Form
  const [docUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  } | null>(null);
  const [docTitleInput, setDocTitleInput] = useState('');

  // Website Crawl Form
  const [crawlModalOpen, setCrawlModalOpen] = useState(false);
  const [crawlUrlInput, setCrawlUrlInput] = useState('');
  const [crawlMode, setCrawlMode] = useState<'single' | 'sitemap'>('single');

  // Knowledge Hub Sub-Tab ('documents' | 'websites' | 'faqs')
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'documents' | 'websites' | 'faqs'>('documents');

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

  const mainScrollRef = useRef<ScrollViewInstance | null>(null);

  const changeTab = useCallback((nextTab: Tab) => {
    triggerHaptic();
    setTab(nextTab);
    mainScrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, []);

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

  // ── Knowledge Hub Actions (Documents & Website Crawling) ───────────────────
  const loadKnowledgeDocs = useCallback(async () => {
    setLoadingKnowledgeDocs(true);
    try {
      const res = await apiRequest<{
        documents?: Array<{
          id: string;
          title: string;
          sourceType: string;
          mimeType?: string | null;
          charCount?: number;
          chunkCount?: number;
          status: string;
          error?: string | null;
          createdAt: string;
        }>;
      }>('/api/ai/knowledge');
      setKnowledgeDocs(res?.documents || []);
    } catch (err) {
      console.warn('[agents] Failed to load knowledge documents:', err);
    } finally {
      setLoadingKnowledgeDocs(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'knowledge' || tab === 'test') {
      void loadKnowledgeDocs();
    }
  }, [tab, loadKnowledgeDocs]);

  async function handlePickDocument() {
    triggerHaptic();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          'text/markdown',
          'text/csv',
          'application/json',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const picked = res.assets[0];
      setSelectedDocFile({
        uri: picked.uri,
        name: picked.name,
        size: picked.size,
        mimeType: picked.mimeType,
      });
      const cleanTitle = picked.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDocTitleInput(cleanTitle);
      setDocUploadModalOpen(true);
    } catch (err) {
      console.warn('[agents] Document pick error:', err);
      Alert.alert('File Selection Failed', 'Could not open the file picker. Please try again.');
    }
  }

  async function handleUploadDocument() {
    if (!selectedDocFile || uploadingDoc) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedDocFile.uri,
        name: selectedDocFile.name,
        type: selectedDocFile.mimeType || 'application/pdf',
      } as any);
      if (docTitleInput.trim()) {
        formData.append('title', docTitleInput.trim());
      }

      const res = await apiRequest<{ success?: boolean; document?: any; error?: string }>('/api/ai/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      setDocUploadModalOpen(false);
      setSelectedDocFile(null);
      setDocTitleInput('');
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        'Document Added! 🎉',
        `"${res.document?.title || selectedDocFile.name}" has been uploaded and indexed (${res.document?.chunkCount || 1} knowledge chunks). Your AI Assistant can now answer customer questions from this source.`
      );
      await loadKnowledgeDocs();
    } catch (err: any) {
      console.error('[agents] Document upload failed:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not upload and index document. Make sure it contains readable text.');
    } finally {
      setUploadingDoc(false);
    }
  }

  function handleOpenCrawlModal() {
    triggerHaptic();
    if (!crawlUrlInput.trim()) {
      const suggested =
        workspace.data?.bookingPageConfig?.website ||
        (workspace.data?.publicSlug ? `${WEB_URL}/b/${workspace.data.publicSlug}` : '');
      if (suggested) {
        setCrawlUrlInput(suggested);
      }
    }
    setCrawlModalOpen(true);
  }

  async function handleCrawlWebsite() {
    const rawTarget = crawlUrlInput.trim();
    if (!rawTarget || crawlingWeb) {
      Alert.alert('Missing URL', 'Please enter a valid website URL to crawl.');
      return;
    }
    let target = rawTarget;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setCrawlingWeb(true);
    try {
      const res = await apiRequest<{
        success?: boolean;
        pagesDiscovered?: number;
        ingestedCount?: number;
        error?: string;
      }>('/api/ai/knowledge/crawl', {
        method: 'POST',
        body: {
          url: target,
          mode: crawlMode,
          autoIngest: true,
          maxPages: crawlMode === 'sitemap' ? 10 : 1,
        },
      });

      if (res.error) {
        throw new Error(res.error);
      }

      setCrawlModalOpen(false);
      setCrawlUrlInput('');
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      const count = res.ingestedCount ?? res.pagesDiscovered ?? 1;
      Alert.alert(
        'Website Crawled Successfully! 🌐',
        `AI Assistant crawled and indexed ${count} page${count === 1 ? '' : 's'} from ${target}. It is now trained to answer questions directly from your website.`
      );
      await loadKnowledgeDocs();
    } catch (err: any) {
      console.error('[agents] Web crawl failed:', err);
      Alert.alert('Crawl Failed', err?.message || 'Could not crawl website. Check that the website is online, public and accessible.');
    } finally {
      setCrawlingWeb(false);
    }
  }

  function handleDeleteKnowledgeDoc(docId: string, title: string) {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Knowledge Source?',
      `Are you sure you want to remove "${title}"? Your AI Assistant will no longer use this document or web page to answer questions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingDocId(docId);
            try {
              await apiRequest(`/api/ai/knowledge/${encodeURIComponent(docId)}`, {
                method: 'DELETE',
              });
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              await loadKnowledgeDocs();
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete knowledge document.');
            } finally {
              setDeletingDocId(null);
            }
          },
        },
      ]
    );
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

  const websiteDocs = useMemo(() => {
    return knowledgeDocs.filter(
      (doc) =>
        doc.sourceType === 'file' &&
        (doc.title.startsWith('http') ||
          doc.title.includes('bgos.site') ||
          doc.title.includes('www.') ||
          doc.title.includes('.com') ||
          doc.title.includes('.in') ||
          doc.title.includes('.org') ||
          doc.title.includes('Source URL'))
    );
  }, [knowledgeDocs]);

  const fileDocs = useMemo(() => {
    return knowledgeDocs.filter(
      (doc) =>
        !(
          doc.sourceType === 'file' &&
          (doc.title.startsWith('http') ||
            doc.title.includes('bgos.site') ||
            doc.title.includes('www.') ||
            doc.title.includes('.com') ||
            doc.title.includes('.in') ||
            doc.title.includes('.org') ||
            doc.title.includes('Source URL'))
        )
    );
  }, [knowledgeDocs]);
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
    if (faqs.length >= 1 || knowledgeDocs.length >= 1) score += 15;
    if (faqs.length >= 3 || knowledgeDocs.length >= 2) score += 15;
    if (draft.avatarUrl) score += 10;
    return Math.min(100, score);
  }, [draft, faqs, knowledgeDocs]);

  const readinessChecklist = useMemo(() => {
    if (!draft) return [];
    const totalKnowledge = faqs.length + knowledgeDocs.length;
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
        detail:
          knowledgeDocs.length > 0
            ? `${knowledgeDocs.length} source${knowledgeDocs.length === 1 ? '' : 's'} & ${faqs.length} FAQs active`
            : `${faqs.length} FAQs active (3 recommended)`,
        done: totalKnowledge >= 3 || knowledgeDocs.length >= 1,
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
  }, [draft, faqs, knowledgeDocs, channelStatus]);

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

  const agentSlugOrId = draft?.slug || draft?.id || '';
  const widgetScriptCode = `<!-- BGOS 24/7 AI Business Assistant Widget -->\n<script src="${WEB_URL}/api/public/agents/${agentSlugOrId}/embed.js" async></script>`;
  const widgetIframeCode = `<!-- BGOS 24/7 AI Assistant Inline Booking Frame -->\n<iframe src="${WEB_URL}/agent/${agentSlugOrId}?embed=1" width="100%" height="650" frameborder="0"></iframe>`;
  const activeEmbedCode = embedFormat === 'script' ? widgetScriptCode : widgetIframeCode;

  async function handleCopyEmbedCode() {
    try {
      await Share.share({
        title: `${draft?.name || 'Business'} AI Chatbot Embed Code`,
        message: activeEmbedCode,
      });
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 3000);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert('Notice', 'Could not open share dialogue.');
    }
  }

  async function handleSendToDeveloper() {
    const devMessage = `Hi! Here is the code to add our 24/7 AI Business Assistant (${draft?.name || 'Business Assistant'}) to our website:\n\n${activeEmbedCode}\n\nInstallation Instructions:\n1. Paste the script tag right before the closing </body> tag on any page (or within your website builder's Custom Code / Footer settings).\n2. Works on WordPress, Shopify, Webflow, Wix, Squarespace, and custom HTML.\n3. The floating AI chat bubble will appear automatically to answer customer questions and book appointments 24/7.`;
    try {
      await Share.share({
        title: 'Add AI Assistant to Website - Instructions for Web Developer',
        message: devMessage,
      });
    } catch {
      Alert.alert('Notice', 'Could not open share dialogue.');
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
      scrollViewRef={mainScrollRef as any}
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

      {/* ── 1. Compact Assistant Header Bar (Sleek & Space-Efficient) ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          gap: 10,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change avatar"
          onPress={() => setAvatarModalOpen(true)}
          style={{ position: 'relative' }}
        >
          <Image
            source={{
              uri:
                draft.avatarUrl ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
            }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0' }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              backgroundColor: colors.brand,
              width: 17,
              height: 17,
              borderRadius: 8.5,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: '#FFFFFF',
            }}
          >
            <MaterialIcons name="edit" size={10} color="#FFFFFF" />
          </View>
        </Pressable>

        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }} numberOfLines={1}>
              {draft.name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#ECFDF5',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#065F46' }}>Ready</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11.5, color: colors.muted }} numberOfLines={1}>
            {draft.roleTitle || 'AI Business Assistant'} • {(draft.voiceTone || 'friendly').toUpperCase()}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Setup readiness"
          onPress={() => changeTab('overview')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: readinessScore >= 80 ? '#ECFDF5' : '#FFFBEB',
            borderWidth: 1,
            borderColor: readinessScore >= 80 ? '#A7F3D0' : '#FDE68A',
          }}
        >
          <MaterialIcons
            name={readinessScore >= 80 ? 'check-circle' : 'pending'}
            size={13}
            color={readinessScore >= 80 ? '#059669' : '#D97706'}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: readinessScore >= 80 ? '#047857' : '#B45309',
            }}
          >
            {readinessScore}%
          </Text>
        </Pressable>
      </View>

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

      {/* ── 2. Segmented Navigation Tabs (Scrollable Pill Bar — Zero Overlap Guarantee) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 8,
          paddingVertical: 2,
          paddingHorizontal: 2,
        }}
        style={{ flexGrow: 0 }}
      >
        {(
          [
            ['overview', 'Profile', 'person-outline', null],
            ['knowledge', 'Knowledge', 'auto-stories', faqs.length],
            ['channels', 'Widget & Code', 'code', null],
            ['test', 'Live Test', 'chat', null],
          ] as const
        ).map(([tabKey, label, iconName, badgeCount]) => {
          const isSelected = tab === tabKey;
          return (
            <Pressable
              key={tabKey}
              accessibilityRole="button"
              onPress={() => changeTab(tabKey)}
              style={({ pressed }) => ({
                paddingVertical: 9,
                paddingHorizontal: 15,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                backgroundColor: isSelected ? '#FFFFFF' : '#F1F5F9',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.brand : '#E2E8F0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: isSelected ? 2 : 0 },
                shadowOpacity: isSelected ? 0.08 : 0,
                shadowRadius: isSelected ? 4 : 0,
                elevation: isSelected ? 2 : 0,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <MaterialIcons
                name={iconName}
                size={16}
                color={isSelected ? colors.brand : colors.muted}
              />
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: isSelected ? '800' : '600',
                  color: isSelected ? colors.ink : colors.muted,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
              {badgeCount !== null && badgeCount > 0 ? (
                <View
                  style={{
                    backgroundColor: isSelected ? colors.brandSoft : '#E2E8F0',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isSelected ? '#A7F3D0' : '#CBD5E1',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: isSelected ? '#047857' : '#475569',
                    }}
                  >
                    {badgeCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── 3. Tab: Overview (Profile & Persona) ── */}
      {tab === 'overview' && (
        <View style={{ gap: 14 }}>
          {/* Setup Readiness & Checklist Card */}
          <Card style={{ gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowReadinessList((prev) => !prev)}
              style={{ gap: 8 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                    Assistant Readiness & Setup
                  </Text>
                  <MaterialIcons
                    name={showReadinessList ? 'expand-less' : 'expand-more'}
                    size={18}
                    color={colors.muted}
                  />
                </View>
                <View
                  style={{
                    backgroundColor: readinessScore >= 80 ? '#ECFDF5' : '#FFFBEB',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '800',
                      color: readinessScore >= 80 ? '#047857' : '#B45309',
                    }}
                  >
                    {readinessScore}% Complete
                  </Text>
                </View>
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
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, gap: 8 }}>
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
                        onPress={() => changeTab(item.tab)}
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

          {/* Auto-Trained Business Knowledge Sync Card (Executive Layout) */}
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
                  { label: `${syncSummary.servicesCount} Services`, ok: syncSummary.servicesCount > 0, icon: 'business-center' as const },
                  { label: syncSummary.hoursConfigured ? 'Hours Synced' : 'Hours Missing', ok: syncSummary.hoursConfigured, icon: 'schedule' as const },
                  { label: syncSummary.hasLocation ? 'Location Synced' : 'No Address', ok: syncSummary.hasLocation, icon: 'place' as const },
                  { label: syncSummary.hasBrandBrain ? 'Brand Voice' : 'Default Voice', ok: syncSummary.hasBrandBrain, icon: 'record-voice-over' as const },
                  { label: `${syncSummary.faqCount} FAQs`, ok: syncSummary.faqCount > 0, icon: 'quiz' as const },
                ].map((pill) => (
                  <View
                    key={pill.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: pill.ok ? '#ECFDF5' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: pill.ok ? '#A7F3D0' : '#E2E8F0',
                    }}
                  >
                    <MaterialIcons
                      name={pill.icon}
                      size={12}
                      color={pill.ok ? '#047857' : '#64748B'}
                    />
                    <Text
                      style={{
                        fontSize: 11,
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

            {/* Structured 2-Tier Actions (Full-width Primary + Balanced Secondary) */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Action
                label={syncingBusiness ? 'Syncing Business Data...' : 'Sync Business Knowledge'}
                icon="sync"
                disabled={syncingBusiness}
                onPress={() => void handleManualSyncBusiness()}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Action
                    secondary
                    label="Embed Widget"
                    icon="code"
                    onPress={() => changeTab('channels')}
                  />
                </View>
                {syncSummary?.publicCardSlug ? (
                  <View style={{ flex: 1 }}>
                    <Action
                      secondary
                      label="Live Preview ↗"
                      icon="open-in-new"
                      onPress={() => {
                        triggerHaptic();
                        const url = getBgosWebUrl(`/b/${syncSummary.publicCardSlug}#assistant`);
                        void Linking.openURL(url);
                      }}
                    />
                  </View>
                ) : null}
              </View>
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
          {/* Identity Fields with Avatar Trigger */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={ui.heading}>Assistant Identity</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAvatarModalOpen(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Change Avatar</Text>
                <MaterialIcons name="chevron-right" size={16} color={colors.brand} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAvatarModalOpen(true)}
                style={{ position: 'relative' }}
              >
                <Image
                  source={{
                    uri:
                      draft.avatarUrl ||
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                  }}
                  style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E2E8F0' }}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    backgroundColor: colors.brand,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <MaterialIcons name="photo-camera" size={11} color="#FFFFFF" />
                </View>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Field
                  label="Assistant Display Name"
                  value={draft.name}
                  editable={!busy}
                  onChangeText={(name) => edit({ name })}
                  placeholder="e.g. Elena"
                />
              </View>
            </View>

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
          {/* ── Hero Card: AI Brain Status & Metrics ── */}
          <Card style={{ backgroundColor: '#0F172A', borderColor: '#1E293B', padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#10B981',
                  }}
                />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
                  AI Knowledge Brain
                </Text>
                <View
                  style={{
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#34D399' }}>
                    24/7 Live RAG
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  triggerHaptic();
                  void loadKnowledgeDocs();
                }}
                disabled={loadingKnowledgeDocs}
                hitSlop={10}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {loadingKnowledgeDocs ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="refresh" size={18} color="#94A3B8" />
                )}
              </Pressable>
            </View>

            {/* Metrics Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>
                  {fileDocs.length}
                </Text>
                <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '600' }}>Documents</Text>
              </View>
              <View style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>
                  {websiteDocs.length}
                </Text>
                <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '600' }}>Web Pages</Text>
              </View>
              <View style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>
                  {faqs.length}
                </Text>
                <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '600' }}>Trained FAQs</Text>
              </View>
              <View style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#38BDF8' }}>
                  {knowledgeDocs.reduce((acc, d) => acc + (d.chunkCount || 1), 0)}
                </Text>
                <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '600' }}>Chunks</Text>
              </View>
            </View>
          </Card>

          {/* ── Segmented Sub-Tab Switcher ── */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F1F5F9',
              borderRadius: 12,
              padding: 3,
              gap: 4,
            }}
          >
            {[
              { key: 'documents' as const, label: 'Documents', count: fileDocs.length, icon: 'picture-as-pdf' as const },
              { key: 'websites' as const, label: 'Websites', count: websiteDocs.length, icon: 'language' as const },
              { key: 'faqs' as const, label: 'FAQs', count: faqs.length, icon: 'question-answer' as const },
            ].map((s) => {
              const active = knowledgeSubTab === s.key;
              return (
                <Pressable
                  key={s.key}
                  accessibilityRole="button"
                  onPress={() => {
                    triggerHaptic();
                    setKnowledgeSubTab(s.key);
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    paddingVertical: 9,
                    borderRadius: 9,
                    backgroundColor: active ? '#FFFFFF' : 'transparent',
                    shadowColor: active ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: active ? 0.08 : 0,
                    shadowRadius: 2,
                    elevation: active ? 2 : 0,
                  }}
                >
                  <MaterialIcons
                    name={s.icon}
                    size={15}
                    color={active ? colors.brand : colors.muted}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: active ? '800' : '600',
                      color: active ? colors.ink : colors.muted,
                    }}
                  >
                    {s.label}
                  </Text>
                  {s.count > 0 && (
                    <View
                      style={{
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 10,
                        backgroundColor: active ? colors.brandSoft : '#E2E8F0',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: active ? colors.brand : colors.muted,
                        }}
                      >
                        {s.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── Sub-Tab 1: Documents & PDFs ── */}
          {knowledgeSubTab === 'documents' && (
            <View style={{ gap: 12 }}>
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.heading}>Documents & Price Sheets</Text>
                    <Text style={ui.caption}>
                      {fileDocs.length} document{fileDocs.length === 1 ? '' : 's'} indexed in AI Brain
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={uploadingDoc}
                    onPress={() => void handlePickDocument()}
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
                    <MaterialIcons name="upload-file" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ Upload Doc</Text>
                  </Pressable>
                </View>

                {/* Helper notice */}
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 10,
                    padding: 10,
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <MaterialIcons name="info-outline" size={16} color={colors.brand} />
                  <Text style={{ fontSize: 11, color: colors.muted, flex: 1, lineHeight: 15 }}>
                    Accepts PDF, DOCX, TXT, CSV, JSON (max 10 MB). The AI automatically parses and cites these materials during customer chats.
                  </Text>
                </View>

                {loadingKnowledgeDocs && fileDocs.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.brand} />
                    <Text style={{ fontSize: 12, color: colors.muted }}>Loading documents…</Text>
                  </View>
                ) : fileDocs.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 20,
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#FEF2F2',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons name="picture-as-pdf" size={24} color="#DC2626" />
                    </View>
                    <View style={{ alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                        No documents uploaded yet
                      </Text>
                      <Text style={{ fontSize: 11.5, color: colors.muted, textAlign: 'center', maxWidth: 280 }}>
                        Upload your price list, service catalog, brochures or policies so your AI assistant can answer customer inquiries accurately.
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={uploadingDoc}
                      onPress={() => void handlePickDocument()}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        backgroundColor: colors.brand,
                        marginTop: 4,
                      }}
                    >
                      <MaterialIcons name="file-upload" size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                        Upload First Document
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {fileDocs.map((doc) => {
                      const isPdf =
                        doc.mimeType?.includes('pdf') || doc.title.toLowerCase().endsWith('.pdf');
                      const isDeleting = deletingDocId === doc.id;

                      return (
                        <View
                          key={doc.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            padding: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              backgroundColor: isPdf ? '#FEF2F2' : '#ECFDF5',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MaterialIcons
                              name={isPdf ? 'picture-as-pdf' : 'description'}
                              size={20}
                              color={isPdf ? '#DC2626' : '#059669'}
                            />
                          </View>

                          <View style={{ flex: 1, gap: 2 }}>
                            <Text
                              style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}
                              numberOfLines={1}
                            >
                              {doc.title}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                  backgroundColor:
                                    doc.status === 'ready'
                                      ? '#DCFCE7'
                                      : doc.status === 'error'
                                      ? '#FEE2E2'
                                      : '#FEF3C7',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: '700',
                                    color:
                                      doc.status === 'ready'
                                        ? '#15803D'
                                        : doc.status === 'error'
                                        ? '#B91C1C'
                                        : '#B45309',
                                  }}
                                >
                                  {doc.status === 'ready' ? 'Indexed' : doc.status}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: colors.muted }}>
                                {doc.chunkCount || 1} chunks
                              </Text>
                              {doc.charCount ? (
                                <>
                                  <Text style={{ fontSize: 10, color: '#CBD5E1' }}>•</Text>
                                  <Text style={{ fontSize: 11, color: colors.muted }}>
                                    {(doc.charCount / 1000).toFixed(1)}k chars
                                  </Text>
                                </>
                              ) : null}
                            </View>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            disabled={isDeleting}
                            onPress={() => handleDeleteKnowledgeDoc(doc.id, doc.title)}
                            style={({ pressed }) => ({
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#FEE2E2',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: pressed ? 0.75 : 1,
                            })}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* ── Sub-Tab 2: Crawled Websites ── */}
          {knowledgeSubTab === 'websites' && (
            <View style={{ gap: 12 }}>
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.heading}>Crawled Websites & Pages</Text>
                    <Text style={ui.caption}>
                      {websiteDocs.length} web page{websiteDocs.length === 1 ? '' : 's'} indexed in AI Brain
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={crawlingWeb}
                    onPress={handleOpenCrawlModal}
                    style={({ pressed }) => ({
                      backgroundColor: '#2563EB',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <MaterialIcons name="language" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ Crawl Site</Text>
                  </Pressable>
                </View>

                {/* Helper notice */}
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 10,
                    padding: 10,
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                  }}
                >
                  <MaterialIcons name="verified" size={16} color="#2563EB" />
                  <Text style={{ fontSize: 11, color: '#1E40AF', flex: 1, lineHeight: 15 }}>
                    Dual-Brain AI scans your public website, extracting verified service offerings, business hours, and pricing for 100% chatbot accuracy.
                  </Text>
                </View>

                {loadingKnowledgeDocs && websiteDocs.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={{ fontSize: 12, color: colors.muted }}>Loading websites…</Text>
                  </View>
                ) : websiteDocs.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      padding: 20,
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#EFF6FF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialIcons name="language" size={24} color="#2563EB" />
                    </View>
                    <View style={{ alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }}>
                        No websites crawled yet
                      </Text>
                      <Text style={{ fontSize: 11.5, color: colors.muted, textAlign: 'center', maxWidth: 280 }}>
                        Crawl your business website or BGOS page to automatically train your 24/7 AI assistant with your real online content.
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={crawlingWeb}
                      onPress={handleOpenCrawlModal}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        backgroundColor: '#2563EB',
                        marginTop: 4,
                      }}
                    >
                      <MaterialIcons name="public" size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                        Crawl Business Website
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {websiteDocs.map((doc) => {
                      const isDeleting = deletingDocId === doc.id;
                      return (
                        <View
                          key={doc.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            padding: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              backgroundColor: '#EFF6FF',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MaterialIcons name="language" size={20} color="#2563EB" />
                          </View>

                          <View style={{ flex: 1, gap: 2 }}>
                            <Text
                              style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}
                              numberOfLines={1}
                            >
                              {doc.title}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                  backgroundColor:
                                    doc.status === 'ready'
                                      ? '#DCFCE7'
                                      : doc.status === 'error'
                                      ? '#FEE2E2'
                                      : '#FEF3C7',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: '700',
                                    color:
                                      doc.status === 'ready'
                                        ? '#15803D'
                                        : doc.status === 'error'
                                        ? '#B91C1C'
                                        : '#B45309',
                                  }}
                                >
                                  {doc.status === 'ready' ? 'Indexed' : doc.status}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: colors.muted }}>
                                {doc.chunkCount || 1} chunks
                              </Text>
                              {doc.charCount ? (
                                <>
                                  <Text style={{ fontSize: 10, color: '#CBD5E1' }}>•</Text>
                                  <Text style={{ fontSize: 11, color: colors.muted }}>
                                    {(doc.charCount / 1000).toFixed(1)}k chars
                                  </Text>
                                </>
                              ) : null}
                            </View>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            disabled={isDeleting}
                            onPress={() => handleDeleteKnowledgeDoc(doc.id, doc.title)}
                            style={({ pressed }) => ({
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#FEE2E2',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: pressed ? 0.75 : 1,
                            })}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* ── Sub-Tab 3: Custom FAQs ── */}
          {knowledgeSubTab === 'faqs' && (
            <View style={{ gap: 12 }}>
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.heading}>Custom Q&A FAQs</Text>
                    <Text style={ui.caption}>{faqs.length} question pairs trained</Text>
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
            </View>
          )}

          {/* Web Studio Advanced Training Link */}
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="auto-awesome" size={18} color={colors.brand} />
              <Text style={ui.heading}>Dual-Brain Vector RAG</Text>
            </View>
            <Text style={ui.body}>
              All documents, PDFs and crawled website pages are automatically parsed into semantic vector embeddings. For deep chunk-level inspection or manual embeddings, open the Web Knowledge Studio.
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
          {/* ── Website Widget Embed Card (Universal Website Integration) ── */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#ECFDF5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#A7F3D0',
                  }}
                >
                  <MaterialIcons name="code" size={20} color="#059669" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Website Chatbot Widget</Text>
                  <Text style={{ fontSize: 11.5, color: colors.muted }}>Embed 24/7 AI chat on your website or page</Text>
                </View>
              </View>
              <Badge success label="Ready to Embed" />
            </View>

            {/* Live Widget Mini Preview Mockup */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                padding: 12,
                gap: 10,
              }}
            >
              {/* Fake Browser Top Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 10, color: '#64748B' }} numberOfLines={1}>
                    https://your-website.com
                  </Text>
                </View>
              </View>

              {/* Floating Widget Corner Simulation */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8, minHeight: 64 }}>
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    borderBottomRightRadius: 2,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    maxWidth: '75%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>
                    {draft.name} ({draft.roleTitle || 'AI Assistant'})
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#475569', marginTop: 1 }} numberOfLines={2}>
                    {draft.welcomeGreeting || '👋 Hi! Have questions or want to book an appointment? Ask me 24/7!'}
                  </Text>
                </View>

                {/* Floating Bubble Icon */}
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{
                      uri:
                        draft.avatarUrl ||
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: colors.brand,
                      backgroundColor: '#E2E8F0',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: '#10B981',
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Embed Format Switcher Pills */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, gap: 2 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEmbedFormat('script')}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: embedFormat === 'script' ? '#FFFFFF' : 'transparent',
                  shadowColor: embedFormat === 'script' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: embedFormat === 'script' ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: embedFormat === 'script' ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: embedFormat === 'script' ? '800' : '600', color: embedFormat === 'script' ? colors.brand : colors.muted }}>
                  1-Line Script (Floating Bubble)
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEmbedFormat('iframe')}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: embedFormat === 'iframe' ? '#FFFFFF' : 'transparent',
                  shadowColor: embedFormat === 'iframe' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: embedFormat === 'iframe' ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: embedFormat === 'iframe' ? 1 : 0,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: embedFormat === 'iframe' ? '800' : '600', color: embedFormat === 'iframe' ? colors.brand : colors.muted }}>
                  Inline iFrame (Contact Page)
                </Text>
              </Pressable>
            </View>

            {/* Code Snippet Box */}
            <View
              style={{
                backgroundColor: '#0F172A',
                borderRadius: 12,
                padding: 12,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 }}>
                  {embedFormat === 'script' ? 'HTML SCRIPT TAG (PASTE BEFORE </BODY>)' : 'EMBED IFRAME CODE'}
                </Text>
                <Text style={{ fontSize: 10.5, color: '#38BDF8', fontWeight: '700' }}>
                  {embedFormat === 'script' ? 'Universal' : 'Responsive'}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 11,
                  color: '#34D399',
                  lineHeight: 16,
                }}
                selectable
              >
                {activeEmbedCode}
              </Text>
            </View>

            {/* Action Buttons: Copy Snippet & WhatsApp to Developer */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy widget embed code"
                onPress={() => void handleCopyEmbedCode()}
                style={{
                  flex: 1,
                  backgroundColor: colors.brand,
                  borderRadius: 12,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MaterialIcons name={copiedEmbed ? 'check' : 'content-copy'} size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  {copiedEmbed ? 'Code Shared!' : 'Copy Widget Code'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send to web developer via WhatsApp"
                onPress={() => void handleSendToDeveloper()}
                style={{
                  flex: 1,
                  backgroundColor: '#25D366',
                  borderRadius: 12,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MaterialIcons name="send" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                  Send to Developer
                </Text>
              </Pressable>
            </View>

            {/* Compatible CMS Platforms */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4 }}>
              <Text style={{ fontSize: 10.5, color: colors.muted, textAlign: 'center' }}>
                Works on WordPress • Shopify • Wix • Webflow • Squarespace • Custom HTML
              </Text>
            </View>
          </Card>

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

      {/* ── Modal: Upload Knowledge Document (PDF / DOC / Text) ── */}
      <Modal visible={docUploadModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#FEE2E2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="picture-as-pdf" size={18} color="#DC2626" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                  Upload Document
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!uploadingDoc) {
                    setDocUploadModalOpen(false);
                    setSelectedDocFile(null);
                  }
                }}
                hitSlop={10}
              >
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, color: colors.muted, marginTop: -4 }}>
              Train your AI on price lists, menus, service catalogs, or policy documents.
            </Text>

            {/* Selected File Box */}
            {selectedDocFile && (
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <MaterialIcons
                    name={selectedDocFile.name.toLowerCase().endsWith('.pdf') ? 'picture-as-pdf' : 'description'}
                    size={22}
                    color={selectedDocFile.name.toLowerCase().endsWith('.pdf') ? '#DC2626' : colors.brand}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
                      {selectedDocFile.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {selectedDocFile.size ? `${(selectedDocFile.size / 1024).toFixed(0)} KB` : 'Document selected'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={uploadingDoc}
                  onPress={() => void handlePickDocument()}
                  style={{
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.ink }}>Change</Text>
                </Pressable>
              </View>
            )}

            <Field
              label="Knowledge Source Title"
              value={docTitleInput}
              onChangeText={setDocTitleInput}
              placeholder="e.g. 2026 Price List & Packages"
            />

            <View
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: 10,
                padding: 10,
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="auto-awesome" size={16} color="#2563EB" />
              <Text style={{ fontSize: 11.5, color: '#1E40AF', flex: 1, lineHeight: 16 }}>
                AI will split this document into semantic vector chunks so it can answer customer inquiries accurately.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Action
                  label="Cancel"
                  secondary
                  disabled={uploadingDoc}
                  onPress={() => {
                    setDocUploadModalOpen(false);
                    setSelectedDocFile(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label={uploadingDoc ? 'Indexing...' : 'Upload & Train'}
                  disabled={!selectedDocFile || uploadingDoc}
                  onPress={() => void handleUploadDocument()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Crawl Website into AI Knowledge ── */}
      <Modal visible={crawlModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="language" size={18} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                  Crawl Website
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!crawlingWeb) setCrawlModalOpen(false);
                }}
                hitSlop={10}
              >
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, color: colors.muted, marginTop: -4 }}>
              AI will index your public website pages, services, business hours, and rates.
            </Text>

            {/* Quick URL Suggestions */}
            {(Boolean(workspace.data?.bookingPageConfig?.website) || Boolean(workspace.data?.publicSlug)) && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>
                  Quick Fill Business Link
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {workspace.data?.publicSlug ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        triggerHaptic();
                        setCrawlUrlInput(`${WEB_URL}/b/${workspace.data?.publicSlug}`);
                      }}
                      style={{
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MaterialIcons name="bolt" size={13} color="#F59E0B" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>
                        BGOS Site ({workspace.data.publicSlug})
                      </Text>
                    </Pressable>
                  ) : null}
                  {workspace.data?.bookingPageConfig?.website ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        triggerHaptic();
                        setCrawlUrlInput(workspace.data?.bookingPageConfig?.website || '');
                      }}
                      style={{
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MaterialIcons name="link" size={13} color={colors.brand} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>
                        {workspace.data.bookingPageConfig.website}
                      </Text>
                    </Pressable>
                  ) : null}
                </ScrollView>
              </View>
            )}

            <Field
              label="Website or Webpage URL"
              value={crawlUrlInput}
              onChangeText={setCrawlUrlInput}
              placeholder="https://yourbusiness.com"
            />

            {/* Crawl Scope Selection */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
                Crawl Scope
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    triggerHaptic();
                    setCrawlMode('single');
                  }}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: crawlMode === 'single' ? '#ECFDF5' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: crawlMode === 'single' ? colors.brand : '#E2E8F0',
                    gap: 2,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: crawlMode === 'single' ? colors.brand : colors.ink }}>
                    Single Page
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.muted }}>
                    Fast · indexes this exact page
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    triggerHaptic();
                    setCrawlMode('sitemap');
                  }}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: crawlMode === 'sitemap' ? '#ECFDF5' : '#F8FAFC',
                    borderWidth: 1,
                    borderColor: crawlMode === 'sitemap' ? colors.brand : '#E2E8F0',
                    gap: 2,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: crawlMode === 'sitemap' ? colors.brand : colors.ink }}>
                    Full Website
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.muted }}>
                    Sitemap · up to 10 pages
                  </Text>
                </Pressable>
              </View>
            </View>

            <View
              style={{
                backgroundColor: '#ECFDF5',
                borderRadius: 10,
                padding: 10,
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <MaterialIcons name="verified" size={16} color="#059669" />
              <Text style={{ fontSize: 11.5, color: '#065F46', flex: 1, lineHeight: 16 }}>
                Dual-Brain AI extracts verified business facts, service rates, and hours to make your chatbot answer inquiries with 100% accuracy.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Action
                  label="Cancel"
                  secondary
                  disabled={crawlingWeb}
                  onPress={() => setCrawlModalOpen(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label={crawlingWeb ? 'Crawling...' : 'Crawl & Index'}
                  disabled={!crawlUrlInput.trim() || crawlingWeb}
                  onPress={() => void handleCrawlWebsite()}
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
