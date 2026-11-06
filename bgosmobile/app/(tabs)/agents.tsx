import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
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
} from '../../src/components/ui';
import { useUnsavedWarning } from '../../src/hooks/use-unsaved-warning';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { getBgosWebUrl } from '../../src/lib/bgos-urls';
import { WEB_URL } from '../../src/lib/constants';
import {
  AVATAR_CATALOG,
  type FormAgentData,
  type FaqPair,
} from '../../../src/features/forms/types/agent-types';

type Tab = 'overview' | 'knowledge' | 'channels' | 'test';

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
    category: 'Pricing & Payment',
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

export default function AgentsScreen() {
  const router = useRouter();
  const resource = useResource<{ agents: FormAgentData[] }>('/api/forms/agents');

  const [tab, setTab] = useState<Tab>('overview');
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<FormAgentData | null>(null);
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty);
  const dirtyRef = useRef(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modals & Pickers
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('General');
  const [faqSearch, setFaqSearch] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);

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
  const chatScrollRef = useRef<ScrollView>(null);

  // Synchronize draft when resource loads or selection changes
  useEffect(() => {
    if (dirtyRef.current) return;
    const list = resource.data?.agents || [];
    const selected = list.find((a) => a.id === selectedId) || list[0];
    if (selected) {
      setDraft(selected);
      setSelectedId(selected.id);
    }
  }, [resource.data, selectedId]);

  function edit(update: Partial<FormAgentData>) {
    if (!draft) return;
    dirtyRef.current = true;
    setDirty(true);
    setNotice(null);
    setDraft({ ...draft, ...update });
  }

  async function save() {
    if (!draft?.name.trim()) {
      setError('Please provide a name for your business assistant.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const latest = await apiRequest<{ agents: FormAgentData[] }>('/api/forms/agents');
      const current = latest.agents.find((a) => a.id === draft.id);
      if (current && current.updatedAt !== draft.updatedAt) {
        throw new Error('This assistant was updated on another device. Please reload the saved version.');
      }
      const result = await apiRequest<{ agent: FormAgentData }>('/api/forms/agents', {
        method: 'POST',
        body: draft,
      });
      if (!result.agent?.id) throw new Error('Server did not confirm save.');
      dirtyRef.current = false;
      setDirty(false);
      setDraft(result.agent);
      setNotice('✓ Assistant settings saved successfully.');
      setTimeout(() => setNotice(null), 4000);
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createFromTemplate(template: IndustryTemplate) {
    setBusy(true);
    setError(null);
    try {
      const payload: Partial<FormAgentData> = {
        name: template.name,
        roleTitle: template.roleTitle,
        avatarUrl: template.avatarUrl,
        voiceTone: template.tone,
        welcomeGreeting: template.welcomeGreeting,
        knowledge: {
          crawledUrls: [],
          documents: [],
          faqPairs: template.faqs,
          systemPrompt: '',
          guardrails: [],
        },
      };
      const result = await apiRequest<{ agent: FormAgentData }>('/api/forms/agents', {
        method: 'POST',
        body: payload,
      });
      if (!result.agent?.id) throw new Error('Creation failed. Please retry.');
      setSelectedId(result.agent.id);
      await resource.refresh();
      setNotice(`✓ ${template.name} created! Test its responses or customize further.`);
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createCustom() {
    if (!customName.trim()) {
      setError('Please enter a name for your assistant.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{ agent: FormAgentData }>('/api/forms/agents', {
        method: 'POST',
        body: {
          name: customName.trim(),
          roleTitle: 'Customer Care & Booking',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
          voiceTone: 'friendly',
          welcomeGreeting: 'Hello! Welcome to our business. How can I help you today?',
          knowledge: { documents: [], faqPairs: [], crawledUrls: [], guardrails: [] },
        },
      });
      if (!result.agent?.id) throw new Error('Creation failed.');
      setSelectedId(result.agent.id);
      setCustomName('');
      await resource.refresh();
      setNotice('✓ Assistant created! Add business knowledge and test responses.');
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleSaveFaq() {
    if (!draft || !faqQuestion.trim() || !faqAnswer.trim()) {
      setError('Please provide both a question and an answer.');
      return;
    }
    const faqId = editingFaqId || `faq_${Date.now()}`;
    const newFaq: FaqPair = {
      id: faqId,
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
    };
    const existing = draft.knowledge?.faqPairs || [];
    const updated = editingFaqId
      ? existing.map((f) => (f.id === editingFaqId ? newFaq : f))
      : [...existing, newFaq];

    edit({
      knowledge: {
        ...draft.knowledge,
        faqPairs: updated,
      },
    });
    setFaqModalOpen(false);
    setEditingFaqId(null);
    setFaqQuestion('');
    setFaqAnswer('');
    setError(null);
  }

  function handleOpenAddFaq(prefillQuestion?: string, prefillAnswer?: string) {
    setEditingFaqId(null);
    setFaqQuestion(prefillQuestion || '');
    setFaqAnswer(prefillAnswer || '');
    setFaqModalOpen(true);
  }

  function handleOpenEditFaq(faq: FaqPair) {
    setEditingFaqId(faq.id);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqModalOpen(true);
  }

  function handleRemoveFaq(faqId: string) {
    if (!draft) return;
    Alert.alert('Remove Answer?', 'This answer will be removed once you save changes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const existing = draft.knowledge?.faqPairs || [];
          edit({
            knowledge: {
              ...draft.knowledge,
              faqPairs: existing.filter((f) => f.id !== faqId),
            },
          });
        },
      },
    ]);
  }

  async function testChat(queryText?: string) {
    const textToSend = (queryText || testInput).trim();
    if (!draft?.id || testing || !textToSend) return;

    if (dirty) {
      Alert.alert(
        'Save Changes First',
        'Save your latest business edits so the assistant can answer using your newest information.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save & Test', onPress: async () => { await save(); void executeChat(textToSend); } },
        ]
      );
      return;
    }

    await executeChat(textToSend);
  }

  async function executeChat(textToSend: string) {
    if (!draft?.id) return;
    setTesting(true);
    setError(null);
    const history = [...messages];
    const newMessages = [...messages, { role: 'user' as const, content: textToSend }];
    setMessages(newMessages);
    setTestInput('');

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

  async function openWebStudio() {
    try {
      await Linking.openURL(getBgosWebUrl('chatbotBuilder'));
    } catch {
      setError('Could not open web studio in browser.');
    }
  }

  // Derived setup readiness calculations
  const faqs = draft?.knowledge?.faqPairs || [];
  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return faqs;
    const q = faqSearch.toLowerCase();
    return faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [faqs, faqSearch]);

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

  const publicChatUrl = draft ? `${WEB_URL}/agent/${draft.slug || draft.id}` : '';

  async function handleSharePublicLink() {
    if (!publicChatUrl) return;
    try {
      await Share.share({
        title: `${draft?.name || 'Business'} AI Assistant`,
        message: `Chat with our 24/7 AI Business Assistant here: ${publicChatUrl}`,
        url: publicChatUrl,
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
                width: 48,
                height: 48,
                borderRadius: 24,
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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

  // ─── Render: Main Assistant Workspace ────────────────────────────────────
  return (
    <Screen
      title="Business Assistant"
      subtitle="AI Chat, Booking & Customer Intake"
      showBack
      onRefresh={() => {
        if (dirty) reload();
        else void resource.refresh();
      }}
      floatingAction={
        dirty ? (
          <View
            style={{
              backgroundColor: '#0F172A',
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
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={reload}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.12)',
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

      {/* ── 1. Assistant Profile Banner ── */}
      <Card style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Avatar with Edit Badge */}
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
              style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#E2E8F0' }}
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
              <MaterialIcons name="edit" size={12} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Info & Status */}
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: colors.ink }} numberOfLines={1}>
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

        {/* Readiness Score Bar */}
        <View style={{ gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.muted }}>
              Setup Readiness
            </Text>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.brand }}>
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
        </View>
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
          backgroundColor: '#E2E8F0',
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
              onPress={() => setTab(tabKey)}
              style={{
                flex: 1,
                paddingVertical: 9,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 5,
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

      {/* ── 3. Tab: Overview ── */}
      {tab === 'overview' && (
        <View style={{ gap: 14 }}>
          {/* Identity Fields */}
          <Card style={{ gap: 12 }}>
            <Text style={ui.heading}>Assistant Identity</Text>
            <Field
              label="Assistant Display Name"
              value={draft.name}
              editable={!busy}
              onChangeText={(name) => edit({ name })}
              placeholder="e.g. Clara"
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
              {(
                [
                  ['friendly', 'Friendly 😊', 'Warm, helpful and conversational'],
                  ['professional', 'Professional 💼', 'Polished, direct and corporate'],
                  ['sales', 'Sales Focus 🚀', 'Proactive, high-energy & conversion-led'],
                  ['empathetic', 'Empathetic 🤝', 'Compassionate, reassuring and caring'],
                ] as const
              ).map(([toneKey, label, desc]) => {
                const isSelected = (draft.voiceTone || 'friendly') === toneKey;
                return (
                  <Pressable
                    key={toneKey}
                    accessibilityRole="button"
                    onPress={() => edit({ voiceTone: toneKey })}
                    style={{
                      flex: 1,
                      minWidth: '45%',
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
                      {label}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.muted }}>{desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Welcome Greeting */}
          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Welcome Greeting</Text>
            <Text style={ui.caption}>First message visitors see when initiating a chat or scanning your QR.</Text>
            <TextInput
              multiline
              numberOfLines={3}
              value={draft.welcomeGreeting || ''}
              onChangeText={(welcomeGreeting) => edit({ welcomeGreeting })}
              placeholder="e.g. Hello! Welcome to our store. How can I help you today?"
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 12,
                padding: 12,
                fontSize: 13.5,
                color: colors.ink,
                minHeight: 75,
                textAlignVertical: 'top',
              }}
            />

            {/* Bubble Preview */}
            <View
              style={{
                backgroundColor: '#F1F5F9',
                borderRadius: 12,
                padding: 12,
                marginTop: 2,
                flexDirection: 'row',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <Image
                source={{
                  uri:
                    draft.avatarUrl ||
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
                }}
                style={{ width: 28, height: 28, borderRadius: 14 }}
              />
              <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12, gap: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>Visitor Preview</Text>
                <Text style={{ fontSize: 12.5, color: colors.ink }}>
                  {draft.welcomeGreeting || 'Hello! How can I assist you today?'}
                </Text>
              </View>
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

      {/* ── 4. Tab: Knowledge ── */}
      {tab === 'knowledge' && (
        <View style={{ gap: 14 }}>
          {/* Header & Add FAQ Button */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
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

            {/* Search Input */}
            {faqs.length > 2 && (
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
                  <Pressable onPress={() => setFaqSearch('')}>
                    <MaterialIcons name="close" size={16} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            )}
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

          {/* FAQ Accordion List */}
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
              {filteredFaqs.map((faq) => (
                <View
                  key={faq.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink, flex: 1 }}>
                      {faq.question}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleOpenEditFaq(faq)}
                        style={{ padding: 4 }}
                      >
                        <MaterialIcons name="edit" size={17} color={colors.muted} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleRemoveFaq(faq.id)}
                        style={{ padding: 4 }}
                      >
                        <MaterialIcons name="delete-outline" size={17} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12.5, color: colors.muted, lineHeight: 18 }}>
                    {faq.answer}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Advanced Web Crawl Banner */}
          <Card style={{ gap: 8 }}>
            <Text style={ui.heading}>Website & Document Indexing</Text>
            <Text style={ui.body}>
              Upload PDF brochures, price sheets, and crawl your website domain inside the BGOS Web Studio.
            </Text>
            <Action
              secondary
              label="Open Knowledge Studio · Web"
              icon="open-in-new"
              onPress={() => void openWebStudio()}
            />
          </Card>
        </View>
      )}

      {/* ── 5. Tab: Channels ── */}
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
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>Public Chat URL</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand }} numberOfLines={1}>
                {publicChatUrl}
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

          {/* WhatsApp Channel Card */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="chat" size={20} color="#16A34A" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>WhatsApp Business</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Instant 24/7 inquiry auto-reply</Text>
                </View>
              </View>
              <Badge accent label="Configure" />
            </View>
            <Text style={ui.body}>
              Connect your WhatsApp Business API number to let this assistant answer customer messages directly on WhatsApp.
            </Text>
            <Action
              secondary
              label="Review Integrations"
              onPress={() => router.push('/(tabs)/integrations')}
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

      {/* ── 6. Tab: Live Test Arena ── */}
      {tab === 'test' && (
        <View style={{ gap: 10 }}>
          {/* Header Action Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>
              Live Conversation Sandbox
            </Text>
            {messages.length > 0 && (
              <Pressable
                accessibilityRole="button"
                disabled={testing}
                onPress={() => setMessages([])}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <MaterialIcons name="refresh" size={14} color={colors.muted} />
                <Text style={{ fontSize: 11.5, color: colors.muted, fontWeight: '700' }}>Clear Chat</Text>
              </Pressable>
            )}
          </View>

          {/* Chat Container */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              overflow: 'hidden',
              minHeight: 320,
              maxHeight: 460,
            }}
          >
            <ScrollView
              ref={chatScrollRef}
              style={{ flex: 1, padding: 14 }}
              contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
            >
              {/* Welcome Bubble from Assistant */}
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
                        maxWidth: '80%',
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

              {/* Typing indicator */}
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
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.muted, fontStyle: 'italic' }}>
                      {draft.name} is thinking…
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick Test Chips */}
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
                  width: 38,
                  height: 38,
                  borderRadius: 19,
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
              <Pressable onPress={() => setAvatarModalOpen(false)}>
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
              <Pressable onPress={() => setFaqModalOpen(false)}>
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
              <Pressable onPress={() => setQrModalOpen(false)}>
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
                  uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(publicChatUrl)}&size=200x200&margin=4`,
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
