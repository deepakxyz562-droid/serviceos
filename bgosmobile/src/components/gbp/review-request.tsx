import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../ui';
import {
  COUNTRIES,
  detectDeviceCountryAndTimezone,
  formatLocalDateTime,
  getCountryByCode,
  getTimeZoneShortLabel,
  type CountryItem,
} from '../../lib/country-codes';

const WA_GREEN = '#25D366';
const WA_GREEN_DARK = '#128C7E';
const WA_HEADER = '#075E54';
const WA_BG = '#ECE5DD';
const WA_BLUE_TICKS = '#53BDEB';

type TemplateKey = 'executive' | 'excellence' | 'gratitude' | '5star' | 'experience' | 'thankyou';
type SheetTab = 'single' | 'bulk';
type BulkSourceTab = 'paste' | 'csv' | 'crm';
type QueueFilterTab = 'all' | 'pending' | 'sent' | 'failed';

export interface ParsedBulkRecipient {
  name?: string;
  phone: string;
}

interface ReviewQueueItem {
  id: string;
  channel: string;
  phone: string;
  customerName: string;
  source: string;
  batchDay?: number;
  message: string;
  dueAt: string;
  sentAt: string | null;
  status: string;
  lastError: string | null;
}

interface CrmCandidate {
  name: string;
  phone: string;
  source: 'booking' | 'crm';
  alreadyQueued: boolean;
}

interface QueueGetResponse {
  hasWhatsAppProvider?: boolean;
  smsAvailable?: boolean;
  businessName?: string;
  reviewLink?: string;
  locale?: {
    country: string;
    countryName: string;
    callingCode: string;
    timeZone: string;
    locale: string;
  };
  queue?: {
    pending: number;
    sent: number;
    failed: number;
    total: number;
    dailyLimit: number;
    nextBatchAt: string | null;
    items: ReviewQueueItem[];
  };
  candidates?: CrmCandidate[];
}

function normalizePhoneDigits(raw: string, callingCode = '91', nationalDigits = 10): string | null {
  const trimmed = (raw || '').trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (trimmed.startsWith('+')) return `+${digits}`;
  const cleanCode = callingCode.replace(/[^\d]/g, '') || '91';
  if (cleanCode === '1' && digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length === nationalDigits || digits.length === 10) {
    return `+${cleanCode}${digits}`;
  }
  if (digits.startsWith(cleanCode) && digits.length >= cleanCode.length + 7) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function parseBulkRecipientText(
  rawText: string,
  callingCode = '91',
  nationalDigits = 10,
): ParsedBulkRecipient[] {
  const seen = new Set<string>();
  const results: ParsedBulkRecipient[] = [];
  const lines = rawText.split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = line
      .split(/[,\t|]/)
      .map((p) => p.replace(/^["']|["']$/g, '').trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const phoneCandidates = parts.map((p) => normalizePhoneDigits(p, callingCode, nationalDigits));
      const allPhones = phoneCandidates.filter(Boolean);
      if (allPhones.length === parts.length) {
        for (const p of allPhones) {
          if (p && !seen.has(p)) {
            seen.add(p);
            results.push({ phone: p });
          }
        }
        continue;
      }

      const firstIsPhone = Boolean(phoneCandidates[0]);
      const secondIsPhone = Boolean(phoneCandidates[1]);
      if (secondIsPhone && !firstIsPhone) {
        const p = phoneCandidates[1]!;
        if (!seen.has(p)) {
          seen.add(p);
          results.push({ name: parts[0], phone: p });
        }
        continue;
      }
      if (firstIsPhone) {
        const p = phoneCandidates[0]!;
        if (!seen.has(p)) {
          seen.add(p);
          results.push({ name: !secondIsPhone ? parts[1] : undefined, phone: p });
        }
        continue;
      }
      continue;
    }

    const single = normalizePhoneDigits(line, callingCode, nationalDigits);
    if (single && !seen.has(single)) {
      seen.add(single);
      results.push({ phone: single });
    }
  }

  return results;
}

async function readPickedTextFile(uri: string): Promise<string> {
  try {
    const res = await fetch(uri);
    if (res.ok) {
      const text = await res.text();
      if (text) return text;
    }
  } catch {
    // Fall back to XMLHttpRequest for Android content:// URIs
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri, true);
    xhr.responseType = 'text';
    xhr.onload = () => resolve(xhr.responseText || '');
    xhr.onerror = () => reject(new Error('Could not read the selected file on this device.'));
    xhr.send();
  });
}

const SEND_TIMES: { value: string; label: string }[] = [
  { value: '10:00', label: '10:00 AM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '18:00', label: '6:00 PM' },
];

const BATCH_SIZES = [3, 5, 10] as const;

/**
 * WhatsApp-style Google Review Request + Scheduled Bulk Review Invites Sheet.
 */
export function ReviewRequestSheet({
  visible,
  onClose,
  businessName,
  reviewUrl,
  apiRequest,
  initialTab = 'single',
  onQueueUpdated,
}: {
  visible: boolean;
  onClose: () => void;
  businessName: string;
  reviewUrl: string;
  initialTab?: SheetTab;
  onQueueUpdated?: () => void | Promise<void>;
  apiRequest: <T = unknown>(
    path: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      headers?: Record<string, string>;
    },
  ) => Promise<T>;
}) {
  const detected = detectDeviceCountryAndTimezone();

  const [sheetTab, setSheetTab] = useState<SheetTab>(initialTab);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [template, setTemplate] = useState<TemplateKey>('executive');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Locale & country selector
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(detected.country);
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(detected.timeZone);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  // Bulk invites state
  const [bulkSource, setBulkSource] = useState<BulkSourceTab>('paste');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [dailyLimit, setDailyLimit] = useState<3 | 5 | 10>(5);
  const [preferredTime, setPreferredTime] = useState<string>('10:00');
  const [customBulkMessage, setCustomBulkMessage] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvRecipients, setCsvRecipients] = useState<ParsedBulkRecipient[]>([]);
  const [selectedCrmPhones, setSelectedCrmPhones] = useState<Record<string, boolean>>({});
  const [crmSearch, setCrmSearch] = useState('');
  const [crmShowAll, setCrmShowAll] = useState(false);

  const [queueData, setQueueData] = useState<QueueGetResponse | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilterTab>('all');
  const [showAllQueue, setShowAllQueue] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [queueActionBusy, setQueueActionBusy] = useState(false);
  const [bulkNote, setBulkNote] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const cleanBusinessName = businessName?.trim() || 'Our Business';
  const trimmedName = customerName.trim();
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : '';

  const effectiveReviewUrl = useMemo(() => {
    const trimmed = (reviewUrl || '').trim();
    if (trimmed.length > 0 && trimmed !== 'https://search.google.com/local/writereview') {
      return trimmed;
    }
    return (
      queueData?.reviewLink ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanBusinessName)}`
    );
  }, [reviewUrl, queueData?.reviewLink, cleanBusinessName]);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await apiRequest<QueueGetResponse>('/api/reviews/request', {
        method: 'GET',
      });
      setQueueData(res);
      if (res?.locale?.country) {
        setSelectedCountry(getCountryByCode(res.locale.country));
      }
      if (res?.locale?.timeZone) {
        setSelectedTimeZone(res.locale.timeZone);
      }
    } catch {
      // Keep UI interactive offline
    } finally {
      setQueueLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (visible) {
      setSheetTab(initialTab);
      setNote(null);
      setBulkError(null);
      setBulkNote(null);
      void loadQueue();
    }
  }, [visible, initialTab, loadQueue]);

  useEffect(() => {
    const defaultTpl =
      lang === 'hi'
        ? `नमस्ते {firstName}, ${cleanBusinessName} को सेवा का अवसर देने के लिए धन्यवाद! कृपया Google पर अपना अनुभव शेयर करें: ${effectiveReviewUrl}`
        : `Hi {firstName}, thank you for choosing ${cleanBusinessName}! Could you take 30 seconds to share your Google review? ${effectiveReviewUrl}`;
    setCustomBulkMessage(defaultTpl);
  }, [lang, cleanBusinessName, effectiveReviewUrl]);

  const inviteText = useMemo(() => {
    if (lang === 'hi') {
      const formalGreetingHi = firstName ? `सादर नमस्ते ${firstName} जी,` : 'सादर नमस्ते,';
      const warmGreetingHi = firstName ? `नमस्ते ${firstName} जी,` : 'नमस्ते प्रिय ग्राहक जी,';

      if (template === 'executive' || template === '5star') {
        return [
          formalGreetingHi,
          '',
          `${cleanBusinessName} को सेवा का अवसर देने के लिए आपका हार्दिक धन्यवाद। हमारे लिए आपकी संतुष्टि और विश्वास सर्वोपरि है।`,
          '',
          `यदि आप हमारे कार्य और सेवा से संतुष्ट हैं, तो कृपया Google Maps पर 1 मिनट का समय निकालकर अपना बहुमूल्य रिव्यू अवश्य साझा करें:`,
          '',
          `👉 Google रिव्यू लिंक: ${effectiveReviewUrl}`,
          '',
          `सादर,`,
          cleanBusinessName,
        ].join('\n');
      }

      if (template === 'excellence' || template === 'experience') {
        return [
          warmGreetingHi,
          '',
          `${cleanBusinessName} से जुड़ने के लिए आपका बहुत-बहुत धन्यवाद। कृपया Google Maps पर अपना अनुभव रेट करें:`,
          '',
          `⭐ Google रिव्यू: ${effectiveReviewUrl}`,
          '',
          `धन्यवाद,`,
          `${cleanBusinessName} टीम`,
        ].join('\n');
      }

      return [
        formalGreetingHi,
        '',
        `${cleanBusinessName} पर आपके विश्वास के लिए हम आपके आभारी हैं। कृपया Google पर अपना फीडबैक शेयर करें:`,
        '',
        `👉 रिव्यू लिंक: ${effectiveReviewUrl}`,
        '',
        `सादर,`,
        cleanBusinessName,
      ].join('\n');
    }

    const formalGreetingEn = firstName ? `Dear ${firstName},` : 'Dear Valued Client,';
    const warmGreetingEn = firstName ? `Hello ${firstName},` : 'Hello,';

    if (template === 'executive' || template === '5star') {
      return [
        formalGreetingEn,
        '',
        `Thank you for choosing ${cleanBusinessName}. We truly appreciate your trust and hope you had an exceptional experience with our team.`,
        '',
        `If you have a brief moment, we would be deeply grateful if you could share your feedback on our official Google Business Profile:`,
        '',
        `🔗 Share Your Feedback: ${effectiveReviewUrl}`,
        '',
        `Warm regards,`,
        cleanBusinessName,
      ].join('\n');
    }

    if (template === 'excellence' || template === 'experience') {
      return [
        warmGreetingEn,
        '',
        `Thank you for trusting ${cleanBusinessName}. Could you please take 30 seconds to rate your experience on Google Maps?`,
        '',
        `⭐ Rate Us on Google: ${effectiveReviewUrl}`,
        '',
        `Best regards,`,
        `The ${cleanBusinessName} Team`,
      ].join('\n');
    }

    return [
      warmGreetingEn,
      '',
      `Thank you for visiting ${cleanBusinessName}! If you were pleased with our service today, please leave us a quick review on Google:`,
      '',
      `👉 Google Review Link: ${effectiveReviewUrl}`,
      '',
      `Sincerely,`,
      cleanBusinessName,
    ].join('\n');
  }, [lang, template, firstName, cleanBusinessName, effectiveReviewUrl]);

  const parsedPasted = useMemo(
    () => parseBulkRecipientText(pasteText, selectedCountry.callingCode, selectedCountry.digits),
    [pasteText, selectedCountry.callingCode, selectedCountry.digits],
  );

  const selectedCrmRecipients = useMemo<ParsedBulkRecipient[]>(() => {
    const candidates = queueData?.candidates || [];
    return candidates
      .filter((c) => selectedCrmPhones[c.phone])
      .map((c) => ({ name: c.name, phone: c.phone }));
  }, [queueData?.candidates, selectedCrmPhones]);

  const filteredCrmCandidates = useMemo(() => {
    const list = queueData?.candidates || [];
    const q = crmSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q),
    );
  }, [queueData?.candidates, crmSearch]);

  const activeBulkRecipients = useMemo(() => {
    if (bulkSource === 'csv') return csvRecipients;
    if (bulkSource === 'crm') return selectedCrmRecipients;
    return parsedPasted;
  }, [bulkSource, csvRecipients, selectedCrmRecipients, parsedPasted]);

  const scheduleDays =
    activeBulkRecipients.length > 0 ? Math.ceil(activeBulkRecipients.length / dailyLimit) : 0;

  const waHref = useMemo(() => {
    const norm = normalizePhoneDigits(phone, selectedCountry.callingCode, selectedCountry.digits);
    const digits = norm ? norm.replace(/[^\d]/g, '') : phone.replace(/[^\d]/g, '');
    const target = digits.length > 0 ? `/${digits}` : '';
    return `https://wa.me${target}?text=${encodeURIComponent(inviteText)}`;
  }, [phone, inviteText, selectedCountry]);

  async function openWhatsAppDirect(targetPhone?: string, customBody?: string, markId?: string) {
    try {
      const msg = customBody || inviteText;
      if (targetPhone) {
        const norm = normalizePhoneDigits(targetPhone, selectedCountry.callingCode, selectedCountry.digits);
        const digits = (norm || targetPhone).replace(/[^\d]/g, '');
        await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`);
      } else {
        const ok = await Linking.canOpenURL(waHref);
        await Linking.openURL(ok ? waHref : `https://wa.me/?text=${encodeURIComponent(msg)}`);
      }
      if (markId) {
        // Optimistically offer mark-sent after launching WhatsApp
        await markQueueItem(markId, 'mark_sent');
      }
    } catch {
      setNote('Could not open WhatsApp on this device.');
    }
  }

  async function sendViaProvider() {
    setSending(true);
    setNote(null);
    try {
      const typedNorm = normalizePhoneDigits(phone, selectedCountry.callingCode, selectedCountry.digits);
      if (!typedNorm) {
        throw new Error(`Enter a valid ${selectedCountry.name} phone number (${selectedCountry.placeholder}).`);
      }
      const data = await apiRequest<{
        success?: boolean;
        sentCount?: number;
        queuedCount?: number;
        error?: string;
        message?: string;
      }>('/api/reviews/request', {
        method: 'POST',
        body: {
          mode: 'instant',
          channel: 'whatsapp',
          country: selectedCountry.code,
          timeZone: selectedTimeZone,
          reviewLink: effectiveReviewUrl,
          businessName: cleanBusinessName,
          includeDirectLink: true,
          messageTemplate: inviteText,
          recipients: [{ name: customerName.trim() || undefined, phone: typedNorm }],
        },
      });
      if (data && data.error) throw new Error(data.error);
      const sent = data?.sentCount ?? 0;
      const queued = data?.queuedCount ?? 0;
      setNote(
        sent > 0
          ? `Sent invite to ${typedNorm} via WhatsApp Cloud API.`
          : queued > 0
            ? `Saved invite to queue for ${typedNorm}. Tap "Send on WhatsApp (Direct)" below or view it in Bulk Queue.`
            : data?.message || 'Invite processed.',
      );
      await loadQueue();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not send automated invite.');
    } finally {
      setSending(false);
    }
  }

  async function shareLink() {
    try {
      await Share.share({
        message: inviteText,
        title: `Google Review Request · ${cleanBusinessName}`,
      });
    } catch {}
  }

  async function pickCsvFile() {
    setBulkError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      let text = '';
      if ((asset as any).file && typeof (asset as any).file.text === 'function') {
        text = await (asset as any).file.text();
      } else if (asset.uri) {
        text = await readPickedTextFile(asset.uri);
      }
      const parsed = parseBulkRecipientText(text, selectedCountry.callingCode, selectedCountry.digits);
      if (parsed.length === 0) {
        setBulkError(
          `No valid mobile numbers found inside "${asset.name}". Put one number per line or use Name,Phone columns.`,
        );
        return;
      }
      setCsvName(asset.name);
      setCsvRecipients(parsed);
      setBulkSource('csv');
      setBulkNote(`Loaded ${parsed.length} unique customer number${parsed.length === 1 ? '' : 's'} from ${asset.name}.`);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Could not read the selected file.');
    }
  }

  async function scheduleBulkInvites() {
    setBulkError(null);
    setBulkNote(null);
    if (!activeBulkRecipients.length) {
      setBulkError('Add customer numbers first (paste numbers, upload CSV, or select CRM contacts).');
      return;
    }

    setBulkBusy(true);
    try {
      const res = await apiRequest<{
        success?: boolean;
        scheduledCount?: number;
        skippedDuplicates?: number;
        totalDays?: number;
        message?: string;
        error?: string;
      }>('/api/reviews/request', {
        method: 'POST',
        body: {
          mode: 'scheduled',
          channel,
          dailyLimit,
          preferredTime,
          country: selectedCountry.code,
          timeZone: selectedTimeZone,
          source: bulkSource,
          reviewLink: effectiveReviewUrl,
          businessName: cleanBusinessName,
          includeDirectLink: true,
          messageTemplate: customBulkMessage.trim() || undefined,
          recipients: activeBulkRecipients,
        },
      });

      if (res?.error) throw new Error(res.error);
      setBulkNote(
        res?.message ||
          `Scheduled ${res?.scheduledCount ?? activeBulkRecipients.length} review invite(s) (${dailyLimit}/day).`,
      );
      if (bulkSource === 'paste') setPasteText('');
      if (bulkSource === 'csv') {
        setCsvName(null);
        setCsvRecipients([]);
      }
      if (bulkSource === 'crm') setSelectedCrmPhones({});
      await loadQueue();
      await onQueueUpdated?.();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Could not schedule bulk review invites.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function markQueueItem(id: string, action: 'mark_sent' | 'retry') {
    try {
      await apiRequest('/api/reviews/request', {
        method: 'PATCH',
        body: { id, action },
      });
      await loadQueue();
      await onQueueUpdated?.();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Could not update queue item.');
    }
  }

  async function runQueueAction(action: 'dispatch_now' | 'retry_failed') {
    setQueueActionBusy(true);
    setBulkError(null);
    try {
      const res = await apiRequest<{ message?: string; sentCount?: number; retriedCount?: number }>(
        '/api/reviews/request',
        {
          method: 'POST',
          body: { action },
        },
      );
      if (res?.message) setBulkNote(res.message);
      await loadQueue();
      await onQueueUpdated?.();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Queue action failed.');
    } finally {
      setQueueActionBusy(false);
    }
  }

  async function deleteQueueItem(id: string) {
    try {
      await apiRequest(`/api/reviews/request?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadQueue();
      await onQueueUpdated?.();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Could not remove queue item.');
    }
  }

  async function clearPendingQueue() {
    Alert.alert('Clear Pending Queue?', 'Removes all unsent scheduled review invites.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest('/api/reviews/request?clearPending=true', { method: 'DELETE' });
            await loadQueue();
            await onQueueUpdated?.();
          } catch {}
        },
      },
    ]);
  }

  const allQueueItems = queueData?.queue?.items || [];
  const pendingCount = queueData?.queue?.pending ?? allQueueItems.filter((i) => i.status === 'pending').length;
  const sentCount = queueData?.queue?.sent ?? allQueueItems.filter((i) => i.status === 'sent').length;
  const failedCount = queueData?.queue?.failed ?? allQueueItems.filter((i) => i.status === 'failed').length;
  const waConnected = Boolean(queueData?.hasWhatsAppProvider);
  const smsReady = queueData?.smsAvailable !== false;

  const filteredQueueItems = useMemo(() => {
    if (queueFilter === 'all') return allQueueItems;
    return allQueueItems.filter((i) => i.status === queueFilter);
  }, [allQueueItems, queueFilter]);

  const visibleQueueItems = showAllQueue ? filteredQueueItems : filteredQueueItems.slice(0, 10);
  const visibleCrmList = crmShowAll ? filteredCrmCandidates : filteredCrmCandidates.slice(0, 15);
  const tzShort = getTimeZoneShortLabel(selectedTimeZone);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropTouch} accessibilityLabel="Close review request sheet" onPress={onClose} />

        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerIconPill}>
                <MaterialIcons name={sheetTab === 'bulk' ? 'groups' : 'star-rate'} size={19} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>
                  {sheetTab === 'bulk' ? 'Bulk Review Invites' : '1-Tap Review Request'}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {selectedCountry.flag} {selectedCountry.name} · {tzShort}
                </Text>
              </View>
              <Pressable
                onPress={() => setCountryPickerOpen(true)}
                style={styles.tzHeaderPill}
                accessibilityLabel="Change country and timezone"
              >
                <Text style={styles.tzHeaderPillText}>
                  {selectedCountry.flag} +{selectedCountry.callingCode}
                </Text>
                <MaterialIcons name="expand-more" size={14} color={colors.brandDark} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <MaterialIcons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            {/* Top Mode Switcher */}
            <View style={styles.topTabBar} accessibilityRole="tablist">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: sheetTab === 'single' }}
                onPress={() => setSheetTab('single')}
                style={[styles.topTabBtn, sheetTab === 'single' && styles.topTabBtnActive]}
              >
                <MaterialIcons
                  name="chat"
                  size={15}
                  color={sheetTab === 'single' ? '#FFFFFF' : colors.muted}
                />
                <Text style={[styles.topTabText, sheetTab === 'single' && styles.topTabTextActive]}>
                  Single Customer
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: sheetTab === 'bulk' }}
                onPress={() => setSheetTab('bulk')}
                style={[styles.topTabBtn, sheetTab === 'bulk' && styles.topTabBtnActive]}
              >
                <MaterialIcons
                  name="schedule-send"
                  size={15}
                  color={sheetTab === 'bulk' ? '#FFFFFF' : colors.muted}
                />
                <Text style={[styles.topTabText, sheetTab === 'bulk' && styles.topTabTextActive]}>
                  Bulk Schedule ({dailyLimit}/Day)
                </Text>
              </Pressable>
            </View>

            {/* Language Switch */}
            <View style={styles.sectionRow}>
              <View style={styles.pillGroup}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setLang('en')}
                  style={[styles.smallChip, lang === 'en' && styles.smallChipActive]}
                >
                  <Text style={[styles.smallChipText, lang === 'en' && styles.smallChipTextActive]}>
                    English
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setLang('hi')}
                  style={[styles.smallChip, lang === 'hi' && styles.smallChipActive]}
                >
                  <Text style={[styles.smallChipText, lang === 'hi' && styles.smallChipTextActive]}>
                    🇮🇳 हिन्दी (Hindi)
                  </Text>
                </Pressable>
              </View>
            </View>

            {sheetTab === 'single' ? (
              <>
                {/* Template Selector Chips */}
                <View style={styles.templateGroup}>
                  {([
                    { key: 'executive', icon: 'verified', label: 'Executive' },
                    { key: 'excellence', icon: 'workspace-premium', label: 'Excellence' },
                    { key: 'gratitude', icon: 'thumb-up', label: 'Gratitude' },
                  ] as const).map((tpl) => {
                    const active =
                      template === tpl.key ||
                      (tpl.key === 'executive' && template === '5star') ||
                      (tpl.key === 'excellence' && template === 'experience') ||
                      (tpl.key === 'gratitude' && template === 'thankyou');
                    return (
                      <Pressable
                        key={tpl.key}
                        accessibilityRole="button"
                        onPress={() => setTemplate(tpl.key)}
                        style={[styles.templateChip, active && styles.templateChipActive]}
                      >
                        <MaterialIcons
                          name={tpl.icon}
                          size={15}
                          color={active ? colors.brand : colors.muted}
                        />
                        <Text style={[styles.templateChipText, active && styles.templateChipTextActive]}>
                          {tpl.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Realistic WhatsApp Preview */}
                <View style={styles.waCard}>
                  <View style={styles.waHeader}>
                    <View style={styles.waAvatar}>
                      <Text style={styles.waAvatarText}>
                        {cleanBusinessName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.waName} numberOfLines={1}>
                          {cleanBusinessName}
                        </Text>
                        <MaterialIcons name="verified" size={14} color="#25D366" />
                      </View>
                      <Text style={styles.waStatus}>Business Account · Review Invite Preview</Text>
                    </View>
                  </View>

                  <View style={styles.waCanvas}>
                    <View style={styles.bubble}>
                      <Text style={styles.bubbleMessageText}>{inviteText}</Text>
                      <View style={styles.bubbleFooter}>
                        <Text style={styles.bubbleTime}>Just now</Text>
                        <MaterialIcons name="done-all" size={15} color={WA_BLUE_TICKS} />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputRow}>
                    <MaterialIcons name="person" size={18} color={colors.muted} style={{ marginLeft: 12 }} />
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="Customer name (optional)"
                      placeholderTextColor={colors.muted}
                      value={customerName}
                      onChangeText={setCustomerName}
                      accessibilityLabel="Customer name"
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <Pressable
                      onPress={() => setCountryPickerOpen(true)}
                      style={styles.phoneCountryBadge}
                    >
                      <Text style={styles.phoneCountryText}>
                        {selectedCountry.flag} +{selectedCountry.callingCode}
                      </Text>
                      <MaterialIcons name="expand-more" size={14} color={colors.muted} />
                    </Pressable>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder={selectedCountry.placeholder}
                      placeholderTextColor={colors.muted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      accessibilityLabel="Customer mobile number"
                    />
                  </View>
                </View>

                {note ? (
                  <View style={styles.noteCard}>
                    <MaterialIcons name="info-outline" size={16} color={colors.brand} />
                    <Text style={styles.noteText}>{note}</Text>
                  </View>
                ) : null}

                <View style={styles.actionBlock}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Send on WhatsApp"
                    onPress={() => void openWhatsAppDirect()}
                    style={({ pressed }) => [
                      styles.primaryWaBtn,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <MaterialIcons name="chat" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryWaBtnText}>Send on WhatsApp (Direct)</Text>
                  </Pressable>

                  <View style={styles.secondaryActionsRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Share invite link"
                      onPress={shareLink}
                      style={styles.secondaryActionBtn}
                    >
                      <MaterialIcons name="share" size={16} color={colors.brand} />
                      <Text style={styles.secondaryActionText}>Share Invite</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Send invite through connected WhatsApp provider"
                      onPress={sendViaProvider}
                      disabled={sending}
                      style={[styles.secondaryActionBtn, sending && { opacity: 0.6 }]}
                    >
                      <MaterialIcons name="send" size={16} color={colors.brand} />
                      <Text style={styles.secondaryActionText}>
                        {sending ? 'Sending…' : waConnected ? 'Send via Cloud API' : 'Save to Queue'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* ── Card 1: Channel & Country Schedule Settings ── */}
                <View style={styles.channelCard}>
                  <View style={styles.cardHeaderLine}>
                    <Text style={styles.bulkLabel}>1. Channel &amp; Send Schedule</Text>
                    <Pressable onPress={() => setCountryPickerOpen(true)} style={styles.inlineChangeBtn}>
                      <Text style={styles.inlineChangeText}>
                        {selectedCountry.flag} {tzShort} ✎
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.pillGroup}>
                    <Pressable
                      onPress={() => setChannel('whatsapp')}
                      style={[styles.channelBtn, channel === 'whatsapp' && styles.channelBtnActive]}
                    >
                      <MaterialIcons
                        name="chat"
                        size={15}
                        color={channel === 'whatsapp' ? colors.brandDark : colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.channelBtnText,
                            channel === 'whatsapp' && styles.channelBtnTextActive,
                          ]}
                        >
                          WhatsApp
                        </Text>
                        <Text style={styles.channelStatusSub}>
                          {waConnected ? 'Cloud API Active' : 'Queue + 1-Tap Send'}
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setChannel('sms')}
                      style={[styles.channelBtn, channel === 'sms' && styles.channelBtnActive]}
                    >
                      <MaterialIcons
                        name="sms"
                        size={15}
                        color={channel === 'sms' ? colors.brandDark : colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.channelBtnText,
                            channel === 'sms' && styles.channelBtnTextActive,
                          ]}
                        >
                          SMS
                        </Text>
                        <Text style={styles.channelStatusSub}>
                          {smsReady ? 'Auto Scheduled' : 'Gateway Needed'}
                        </Text>
                      </View>
                    </Pressable>
                  </View>

                  {channel === 'whatsapp' && !waConnected ? (
                    <View style={styles.infoBannerSoft}>
                      <MaterialIcons name="info-outline" size={14} color={colors.noteText} />
                      <Text style={styles.infoBannerSoftText}>
                        WhatsApp Cloud API isn&apos;t connected yet — invites queue cleanly with 1-tap &ldquo;Send WA&rdquo; buttons below.
                      </Text>
                    </View>
                  ) : null}

                  {channel === 'sms' && !smsReady ? (
                    <View style={styles.infoBannerSoft}>
                      <MaterialIcons name="warning-amber" size={14} color={colors.noteText} />
                      <Text style={styles.infoBannerSoftText}>
                        SMS gateway is not configured in Integrations — switch to WhatsApp for 1-tap sending or connect SMS/Twilio first.
                      </Text>
                    </View>
                  ) : null}

                  {/* Batch Size + Local Time Selector */}
                  <View style={styles.cadenceRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.microLabel}>Daily Limit</Text>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        {BATCH_SIZES.map((sz) => {
                          const active = dailyLimit === sz;
                          return (
                            <Pressable
                              key={sz}
                              onPress={() => setDailyLimit(sz)}
                              style={[styles.miniPill, active && styles.miniPillActive]}
                            >
                              <Text style={[styles.miniPillText, active && styles.miniPillTextActive]}>
                                {sz}/day
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flex: 1.2, gap: 4 }}>
                      <Text style={styles.microLabel}>Local Send Time ({tzShort})</Text>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        {SEND_TIMES.map((slot) => {
                          const active = preferredTime === slot.value;
                          return (
                            <Pressable
                              key={slot.value}
                              onPress={() => setPreferredTime(slot.value)}
                              style={[styles.miniPill, active && styles.miniPillActive]}
                            >
                              <Text style={[styles.miniPillText, active && styles.miniPillTextActive]}>
                                {slot.label.replace(':00 ', '')}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>

                {/* ── Card 2: Recipient Input Sources ── */}
                <View style={styles.bulkInputCard}>
                  <Text style={styles.bulkLabel}>2. Select Recipients</Text>
                  <View style={styles.sourceSwitchRow}>
                    {([
                      { key: 'paste', label: 'Paste', icon: 'content-paste' },
                      { key: 'csv', label: 'CSV Upload', icon: 'upload-file' },
                      { key: 'crm', label: `CRM (${queueData?.candidates?.length ?? 0})`, icon: 'contacts' },
                    ] as const).map((src) => {
                      const active = bulkSource === src.key;
                      return (
                        <Pressable
                          key={src.key}
                          onPress={() => setBulkSource(src.key)}
                          style={[styles.sourceBtn, active && styles.sourceBtnActive]}
                        >
                          <MaterialIcons
                            name={src.icon}
                            size={14}
                            color={active ? colors.brandDark : colors.muted}
                          />
                          <Text style={[styles.sourceBtnText, active && styles.sourceBtnTextActive]}>
                            {src.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {bulkSource === 'paste' ? (
                    <View style={{ gap: 6 }}>
                      <TextInput
                        value={pasteText}
                        onChangeText={setPasteText}
                        multiline
                        placeholder={`Alex Carter, ${selectedCountry.placeholder}\nPriya Sharma, +${selectedCountry.callingCode}9811122233\n${selectedCountry.placeholder}`}
                        placeholderTextColor={colors.muted}
                        style={styles.bulkTextarea}
                      />
                      <Text style={styles.channelHint}>
                        One customer per line. Numbers without a country code default to +{selectedCountry.callingCode} ({selectedCountry.name}).
                      </Text>
                    </View>
                  ) : bulkSource === 'csv' ? (
                    <View style={{ gap: 6 }}>
                      <Pressable onPress={() => void pickCsvFile()} style={styles.csvPickerBtn}>
                        <MaterialIcons name="upload-file" size={20} color={colors.brandDark} />
                        <Text style={styles.csvPickerText}>
                          {csvName
                            ? `${csvName} (${csvRecipients.length} ready)`
                            : 'Choose CSV / TXT Customer List'}
                        </Text>
                      </Pressable>
                      <Text style={styles.channelHint}>
                        Supports Name,Phone CSV exports from spreadsheets, billing, or CRM tools.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <View style={styles.crmToolbar}>
                        <View style={styles.crmSearchBox}>
                          <MaterialIcons name="search" size={15} color={colors.muted} />
                          <TextInput
                            value={crmSearch}
                            onChangeText={setCrmSearch}
                            placeholder="Search name or phone…"
                            placeholderTextColor={colors.muted}
                            style={styles.crmSearchInput}
                          />
                        </View>
                        <Pressable
                          onPress={() => {
                            const next: Record<string, boolean> = {};
                            for (const c of queueData?.candidates || []) {
                              if (!c.alreadyQueued) next[c.phone] = true;
                            }
                            setSelectedCrmPhones(next);
                          }}
                          style={styles.crmMiniAction}
                        >
                          <Text style={styles.crmMiniActionText}>Select New</Text>
                        </Pressable>
                        {Object.keys(selectedCrmPhones).length > 0 ? (
                          <Pressable
                            onPress={() => setSelectedCrmPhones({})}
                            style={styles.crmMiniAction}
                          >
                            <Text style={[styles.crmMiniActionText, { color: colors.muted }]}>Clear</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      {queueLoading ? (
                        <ActivityIndicator size="small" color={colors.brand} style={{ paddingVertical: 12 }} />
                      ) : !filteredCrmCandidates.length ? (
                        <Text style={styles.channelHint}>
                          No CRM contacts match right now — paste numbers or upload a CSV above.
                        </Text>
                      ) : (
                        <View style={{ gap: 6 }}>
                          {visibleCrmList.map((cand) => {
                            const checked = Boolean(selectedCrmPhones[cand.phone]);
                            return (
                              <Pressable
                                key={cand.phone}
                                disabled={cand.alreadyQueued}
                                onPress={() =>
                                  setSelectedCrmPhones((prev) => ({
                                    ...prev,
                                    [cand.phone]: !prev[cand.phone],
                                  }))
                                }
                                style={[
                                  styles.crmRow,
                                  checked && styles.crmRowSelected,
                                  cand.alreadyQueued && { opacity: 0.55 },
                                ]}
                              >
                                <MaterialIcons
                                  name={
                                    cand.alreadyQueued
                                      ? 'schedule'
                                      : checked
                                        ? 'check-box'
                                        : 'check-box-outline-blank'
                                  }
                                  size={18}
                                  color={checked ? colors.brand : colors.muted}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.crmName} numberOfLines={1}>
                                    {cand.name}
                                  </Text>
                                  <Text style={styles.crmPhone}>{cand.phone}</Text>
                                </View>
                                <Text style={styles.crmSourcePill}>
                                  {cand.alreadyQueued ? 'Queued' : cand.source === 'booking' ? 'Booking' : 'CRM'}
                                </Text>
                              </Pressable>
                            );
                          })}
                          {filteredCrmCandidates.length > 15 ? (
                            <Pressable
                              onPress={() => setCrmShowAll((v) => !v)}
                              style={{ alignItems: 'center', paddingVertical: 6 }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>
                                {crmShowAll
                                  ? 'Show Fewer Contacts'
                                  : `Show All ${filteredCrmCandidates.length} Contacts`}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* ── Card 3: Editable Bulk Message Preview ── */}
                <View style={styles.bulkInputCard}>
                  <Text style={styles.bulkLabel}>3. Invite Message Preview</Text>
                  <TextInput
                    value={customBulkMessage}
                    onChangeText={setCustomBulkMessage}
                    multiline
                    style={styles.bulkMsgInput}
                  />
                  <Text style={styles.channelHint}>
                    Use {'{firstName}'} to personalize each customer automatically.
                  </Text>
                </View>

                {/* Live Schedule Breakdown Banner */}
                {activeBulkRecipients.length > 0 ? (
                  <View style={styles.schedulePreviewCard}>
                    <MaterialIcons name="event-available" size={16} color={colors.brandDark} />
                    <Text style={styles.schedulePreviewText}>
                      <Text style={{ fontWeight: '800' }}>{activeBulkRecipients.length}</Text>{' '}
                      customer{activeBulkRecipients.length === 1 ? '' : 's'} →{' '}
                      <Text style={{ fontWeight: '800' }}>
                        {scheduleDays} day{scheduleDays === 1 ? '' : 's'} ({dailyLimit}/day)
                      </Text>{' '}
                      around {SEND_TIMES.find((s) => s.value === preferredTime)?.label || preferredTime} {tzShort}
                    </Text>
                  </View>
                ) : null}

                {bulkError ? (
                  <View style={styles.errorBox}>
                    <MaterialIcons name="error-outline" size={16} color={colors.danger} />
                    <Text style={styles.errorBoxText}>{bulkError}</Text>
                  </View>
                ) : null}

                {bulkNote ? (
                  <View style={styles.noteCard}>
                    <MaterialIcons name="check-circle" size={16} color={colors.brand} />
                    <Text style={styles.noteText}>{bulkNote}</Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => void scheduleBulkInvites()}
                  disabled={bulkBusy || activeBulkRecipients.length === 0 || (channel === 'sms' && !smsReady)}
                  style={[
                    styles.scheduleBtn,
                    (bulkBusy || activeBulkRecipients.length === 0 || (channel === 'sms' && !smsReady)) && {
                      opacity: 0.55,
                    },
                  ]}
                >
                  {bulkBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="schedule-send" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.scheduleBtnText}>
                    {bulkBusy
                      ? 'Scheduling Invites…'
                      : `Schedule ${activeBulkRecipients.length || ''} Invites (${dailyLimit}/Day)`}
                  </Text>
                </Pressable>

                {/* ── Active Queue Tracker ── */}
                <View style={styles.queueSection}>
                  <View style={styles.cardHeaderLine}>
                    <Text style={styles.bulkLabel}>Review Invite Queue</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {pendingCount > 0 ? (
                        <Pressable
                          onPress={() => void runQueueAction('dispatch_now')}
                          disabled={queueActionBusy}
                          style={styles.dispatchNowBtn}
                        >
                          <Text style={styles.dispatchNowText}>
                            {queueActionBusy ? 'Running…' : 'Run Due Batch'}
                          </Text>
                        </Pressable>
                      ) : null}
                      {failedCount > 0 ? (
                        <Pressable
                          onPress={() => void runQueueAction('retry_failed')}
                          disabled={queueActionBusy}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.brandDark }}>
                            Retry Failed
                          </Text>
                        </Pressable>
                      ) : null}
                      {pendingCount > 0 ? (
                        <Pressable onPress={clearPendingQueue}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.danger }}>
                            Clear
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {/* Queue Filter Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {([
                      { key: 'all', label: `All (${allQueueItems.length})` },
                      { key: 'pending', label: `Pending (${pendingCount})` },
                      { key: 'sent', label: `Sent (${sentCount})` },
                      { key: 'failed', label: `Failed (${failedCount})` },
                    ] as const).map((tab) => {
                      const active = queueFilter === tab.key;
                      return (
                        <Pressable
                          key={tab.key}
                          onPress={() => setQueueFilter(tab.key)}
                          style={[styles.filterPill, active && styles.filterPillActive]}
                        >
                          <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                            {tab.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {queueLoading && !queueData ? (
                    <ActivityIndicator size="small" color={colors.brand} style={{ paddingVertical: 12 }} />
                  ) : !filteredQueueItems.length ? (
                    <Text style={styles.channelHint}>
                      {allQueueItems.length === 0
                        ? 'No review invites queued yet. Add customers above to schedule your daily outreach.'
                        : `No ${queueFilter} invites in your queue.`}
                    </Text>
                  ) : (
                    <View style={{ gap: 6 }}>
                      {visibleQueueItems.map((item) => {
                        const whenStr = formatLocalDateTime(item.dueAt, {
                          timeZone: selectedTimeZone,
                          locale: selectedCountry.locale,
                          includeTime: true,
                        });
                        return (
                          <View key={item.id} style={styles.queueRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.queueName} numberOfLines={1}>
                                {item.customerName || item.phone}
                              </Text>
                              <Text style={styles.queueSub} numberOfLines={1}>
                                {item.phone} · {item.channel.toUpperCase()} · {whenStr || 'Soon'}
                                {item.batchDay ? ` · Day ${item.batchDay}` : ''}
                              </Text>
                              {item.lastError ? (
                                <Text style={{ fontSize: 10.5, color: colors.danger }} numberOfLines={2}>
                                  {item.lastError}
                                </Text>
                              ) : null}
                            </View>
                            <View
                              style={[
                                styles.queueStatusPill,
                                item.status === 'sent'
                                  ? { backgroundColor: colors.successSoft }
                                  : item.status === 'failed'
                                    ? { backgroundColor: colors.dangerSoft }
                                    : { backgroundColor: colors.note },
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '800',
                                  color:
                                    item.status === 'sent'
                                      ? colors.success
                                      : item.status === 'failed'
                                        ? colors.danger
                                        : colors.noteText,
                                }}
                              >
                                {item.status}
                              </Text>
                            </View>
                            {item.status === 'pending' && item.channel === 'whatsapp' ? (
                              <Pressable
                                onPress={() => void openWhatsAppDirect(item.phone, item.message, item.id)}
                                style={styles.sendWaMiniBtn}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
                                  Send WA
                                </Text>
                              </Pressable>
                            ) : item.status === 'failed' ? (
                              <Pressable
                                onPress={() => void markQueueItem(item.id, 'retry')}
                                style={[styles.sendWaMiniBtn, { backgroundColor: colors.brand }]}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
                                  Retry
                                </Text>
                              </Pressable>
                            ) : null}
                            <Pressable onPress={() => void deleteQueueItem(item.id)} hitSlop={8}>
                              <MaterialIcons name="close" size={16} color={colors.muted} />
                            </Pressable>
                          </View>
                        );
                      })}
                      {filteredQueueItems.length > 10 ? (
                        <Pressable
                          onPress={() => setShowAllQueue((v) => !v)}
                          style={{ alignItems: 'center', paddingTop: 6 }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>
                            {showAllQueue
                              ? 'Collapse Queue'
                              : `Show All ${filteredQueueItems.length} Invites`}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Country & Timezone Modal */}
      <Modal
        visible={countryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <View style={styles.countryOverlay}>
          <View style={styles.countryCard}>
            <View style={styles.cardHeaderLine}>
              <Text style={styles.headerTitle}>Country &amp; Schedule Timezone</Text>
              <Pressable onPress={() => setCountryPickerOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {COUNTRIES.map((c) => {
                const active = c.code === selectedCountry.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setSelectedCountry(c);
                      setSelectedTimeZone(c.timeZone);
                      setCountryPickerOpen(false);
                    }}
                    style={[styles.countryRow, active && styles.countryRowActive]}
                  >
                    <Text style={{ fontSize: 18 }}>{c.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.crmName}>
                        {c.name} (+{c.callingCode})
                      </Text>
                      <Text style={styles.crmPhone}>{c.timeZone}</Text>
                    </View>
                    {active ? <MaterialIcons name="check" size={18} color={colors.brand} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 45, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 1,
  },
  tzHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tzHeaderPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brandDark,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.soft,
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
  },
  topTabBtnActive: {
    backgroundColor: colors.brand,
  },
  topTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.muted,
  },
  topTabTextActive: {
    color: '#FFFFFF',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  smallChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  smallChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  smallChipTextActive: {
    color: colors.brandDark,
    fontWeight: '700',
  },
  templateGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  templateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  templateChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  templateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  templateChipTextActive: {
    color: colors.brandDark,
    fontWeight: '700',
  },
  waCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D4DDD6',
    backgroundColor: WA_BG,
  },
  waHeader: {
    backgroundColor: WA_HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  waAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WA_GREEN_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  waAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  waName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  waStatus: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
  },
  waCanvas: {
    padding: 12,
    backgroundColor: WA_BG,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    padding: 12,
  },
  bubbleMessageText: {
    color: '#111B21',
    fontSize: 12.5,
    lineHeight: 18,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  bubbleTime: {
    fontSize: 10,
    color: '#667781',
  },
  inputContainer: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  phoneCountryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    backgroundColor: colors.background,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  phoneCountryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  fieldInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.ink,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: colors.brandSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  noteText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.brandDark,
    fontWeight: '600',
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  errorBoxText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.danger,
    fontWeight: '600',
  },
  actionBlock: {
    gap: 8,
    marginTop: 2,
  },
  primaryWaBtn: {
    backgroundColor: WA_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryWaBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryActionText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  inlineChangeBtn: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inlineChangeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
  },
  channelCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    gap: 10,
  },
  bulkLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  channelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
  channelBtnActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  channelBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.ink,
  },
  channelBtnTextActive: {
    color: colors.brandDark,
  },
  channelStatusSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  infoBannerSoft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.note,
    borderWidth: 1,
    borderColor: colors.noteBorder,
    borderRadius: 10,
    padding: 9,
  },
  infoBannerSoftText: {
    flex: 1,
    fontSize: 11,
    color: colors.noteText,
    lineHeight: 15.5,
    fontWeight: '600',
  },
  cadenceRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  miniPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.background,
  },
  miniPillActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  miniPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  miniPillTextActive: {
    color: colors.brandDark,
    fontWeight: '800',
  },
  channelHint: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15.5,
  },
  sourceSwitchRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sourceBtnActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  sourceBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.muted,
  },
  sourceBtnTextActive: {
    color: colors.brandDark,
  },
  bulkInputCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    gap: 9,
  },
  bulkTextarea: {
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    fontSize: 12.5,
    color: colors.ink,
  },
  bulkMsgInput: {
    minHeight: 74,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 17,
  },
  csvPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 11,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  csvPickerText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brandDark,
  },
  crmToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crmSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
  },
  crmSearchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.ink,
    paddingVertical: 0,
  },
  crmMiniAction: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.brandSoft,
  },
  crmMiniActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
  },
  crmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
  crmRowSelected: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  crmName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
  },
  crmPhone: {
    fontSize: 11,
    color: colors.muted,
  },
  crmSourcePill: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  schedulePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  schedulePreviewText: {
    flex: 1,
    fontSize: 12,
    color: colors.brandDark,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: 14,
  },
  scheduleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  queueSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    gap: 10,
  },
  dispatchNowBtn: {
    backgroundColor: colors.brandSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dispatchNowText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterPillActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  filterPillTextActive: {
    color: colors.brandDark,
    fontWeight: '800',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  queueName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.ink,
  },
  queueSub: {
    fontSize: 11,
    color: colors.muted,
  },
  queueStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sendWaMiniBtn: {
    backgroundColor: WA_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  countryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.52)',
    justifyContent: 'center',
    padding: 20,
  },
  countryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  countryRowActive: {
    backgroundColor: colors.brandSoft,
  },
});
