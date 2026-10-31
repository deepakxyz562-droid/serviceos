import React, { useMemo, useState } from 'react';
import {
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
import { colors } from '../ui';

/**
 * WhatsApp-style Google Review Request Engine
 *
 * Real behaviour:
 *  - "Send via WhatsApp" opens the authentic wa.me link directly with customer chat.
 *  - +91 auto-formatting for Indian merchant numbers.
 *  - 3 customizable template chips (5-Star Express, Service Experience, Thank You).
 *  - "Share Invite" uses the native share sheet.
 *  - "Send Invite (Cloud API)" triggers POST /api/reviews/request for automated WhatsApp delivery.
 */

const WA_GREEN = '#25D366';
const WA_GREEN_DARK = '#128C7E';
const WA_HEADER = '#075E54';
const WA_BG = '#ECE5DD';
const WA_BLUE_TICKS = '#53BDEB';

type TemplateKey = 'executive' | 'excellence' | 'gratitude' | '5star' | 'experience' | 'thankyou';

export function ReviewRequestSheet({
  visible,
  onClose,
  businessName,
  reviewUrl,
  apiRequest,
}: {
  visible: boolean;
  onClose: () => void;
  businessName: string;
  reviewUrl: string;
  apiRequest: (
    path: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      headers?: Record<string, string>;
    },
  ) => Promise<unknown>;
}) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [template, setTemplate] = useState<TemplateKey>('executive');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const cleanBusinessName = businessName?.trim() || 'Our Business';
  const trimmedName = customerName.trim();
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : '';

  const effectiveReviewUrl = useMemo(() => {
    const trimmed = (reviewUrl || '').trim();
    if (trimmed.length > 0 && trimmed !== 'https://search.google.com/local/writereview') {
      return trimmed;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanBusinessName)}`;
  }, [reviewUrl, cleanBusinessName]);

  const inviteText = useMemo(() => {
    // ─── Hindi Templates (Formal, Respectful & Professional) ─────────────
    if (lang === 'hi') {
      const formalGreetingHi = firstName ? `सादर नमस्ते ${firstName} जी,` : 'सादर नमस्ते,';
      const warmGreetingHi = firstName ? `नमस्ते ${firstName} जी,` : 'नमस्ते प्रिय ग्राहक जी,';

      if (template === 'executive' || template === '5star') {
        return [
          formalGreetingHi,
          '',
          `${cleanBusinessName} को सेवा का अवसर देने के लिए आपका हार्दिक धन्यवाद। हमारे लिए आपकी संतुष्टि और विश्वास सर्वोपरि है।`,
          '',
          `यदि आप हमारे कार्य और सेवा से संतुष्ट हैं, तो कृपया Google Maps पर 1 मिनट का समय निकालकर अपना बहुमूल्य रिव्यू अवश्य साझा करें। आपकी प्रतिक्रिया हमारे लिए अत्यंत मूल्यवान है:`,
          '',
          `👉 Google रिव्यू लिंक: ${effectiveReviewUrl}`,
          '',
          `पुनः धन्यवाद और आपका दिन शुभ हो।`,
          '',
          `सादर,`,
          cleanBusinessName,
        ].join('\n');
      }

      if (template === 'excellence' || template === 'experience') {
        return [
          warmGreetingHi,
          '',
          `${cleanBusinessName} से जुड़ने के लिए आपका बहुत-बहुत धन्यवाद।`,
          '',
          `आशा है कि आपको हमारी सेवा पसंद आई होगी। कृपया Google Maps पर अपना अनुभव रेट करें:`,
          '',
          `⭐ Google रिव्यू: ${effectiveReviewUrl}`,
          '',
          `किसी भी अन्य सेवा या सहायता के लिए हम सदैव तत्पर हैं।`,
          '',
          `धन्यवाद,`,
          `${cleanBusinessName} टीम`,
        ].join('\n');
      }

      // Gratitude / Thank You
      return [
        formalGreetingHi,
        '',
        `${cleanBusinessName} पर आपके विश्वास के लिए हम आपके आभारी हैं।`,
        '',
        `यदि आपको हमारा कार्य और अनुभव अच्छा लगा, तो कृपया Google पर अपना फीडबैक शेयर करें:`,
        '',
        `👉 रिव्यू लिंक: ${effectiveReviewUrl}`,
        '',
        `आपका दिन मंगलमय हो!`,
        '',
        `सादर,`,
        cleanBusinessName,
      ].join('\n');
    }

    // ─── English Templates (Polished, Corporate & Professional) ───────────
    const formalGreetingEn = firstName ? `Dear ${firstName},` : 'Dear Valued Client,';
    const warmGreetingEn = firstName ? `Hello ${firstName},` : 'Hello,';

    if (template === 'executive' || template === '5star') {
      return [
        formalGreetingEn,
        '',
        `Thank you for choosing ${cleanBusinessName}. We truly appreciate your trust and hope you had an exceptional experience with our team.`,
        '',
        `If you have a brief moment, we would be deeply grateful if you could share your feedback on our official Google Business Profile. Your review helps us uphold our quality standards and guides other clients in our community:`,
        '',
        `🔗 Share Your Feedback: ${effectiveReviewUrl}`,
        '',
        `Thank you for your continued partnership and support.`,
        '',
        `Warm regards,`,
        cleanBusinessName,
      ].join('\n');
    }

    if (template === 'excellence' || template === 'experience') {
      return [
        warmGreetingEn,
        '',
        `Thank you for trusting ${cleanBusinessName} with your recent service. Delivering high-quality results and complete customer satisfaction is our highest priority.`,
        '',
        `Could you please take 30 seconds to rate your experience on Google Maps?`,
        '',
        `⭐ Rate Us on Google: ${effectiveReviewUrl}`,
        '',
        `We appreciate your feedback and look forward to serving you again.`,
        '',
        `Best regards,`,
        `The ${cleanBusinessName} Team`,
      ].join('\n');
    }

    // Gratitude / Thank You
    return [
      warmGreetingEn,
      '',
      `Thank you for visiting ${cleanBusinessName}! It was a pleasure serving you.`,
      '',
      `We are constantly working to deliver the best possible experience for our clients. If you were pleased with our service today, we would be honored if you could leave us a review on Google:`,
      '',
      `👉 Google Review Link: ${effectiveReviewUrl}`,
      '',
      `Wishing you a wonderful day ahead!`,
      '',
      `Sincerely,`,
      cleanBusinessName,
    ].join('\n');
  }, [lang, template, firstName, cleanBusinessName, effectiveReviewUrl]);

  const waHref = useMemo(() => {
    let digits = phone.replace(/[^\d]/g, '');
    // If Indian 10-digit number without country code, prepend 91
    if (digits.length === 10) {
      digits = `91${digits}`;
    }
    const target = digits.length > 0 ? `/${digits}` : '';
    return `https://wa.me${target}?text=${encodeURIComponent(inviteText)}`;
  }, [phone, inviteText]);

  async function openWhatsApp() {
    try {
      const ok = await Linking.canOpenURL(waHref);
      await Linking.openURL(ok ? waHref : `https://wa.me/?text=${encodeURIComponent(inviteText)}`);
    } catch {
      setNote('Could not open WhatsApp on this device.');
    }
  }

  async function sendViaProvider() {
    setSending(true);
    setNote(null);
    try {
      const data = (await apiRequest('/api/reviews/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewLink: effectiveReviewUrl, businessName: cleanBusinessName, includeDirectLink: true }),
      })) as {
        success?: boolean;
        sentCount?: number;
        queuedCount?: number;
        error?: string;
        message?: string;
      };
      if (data && data.error) {
        throw new Error(data.error);
      }
      const sent = data?.sentCount ?? 0;
      const queued = data?.queuedCount ?? 0;
      setNote(
        sent > 0
          ? `✓ Invite sent to ${sent} customer${sent === 1 ? '' : 's'} via connected WhatsApp Cloud API.`
          : queued > 0
            ? `✓ Invite queued for ${queued} customer${queued === 1 ? '' : 's'} — will dispatch automatically.`
            : 'No past customers found in CRM. Use "Send on WhatsApp (Direct)" above for 1-tap messaging.',
      );
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
    } catch {
      // ignore dismiss
    }
  }

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
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.waIconPill}>
                <MaterialIcons name="chat" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>1-Tap WhatsApp Review Request</Text>
                <Text style={styles.headerSub}>
                  Send personalized Google review links directly to customers
                </Text>
              </View>
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

            {/* Language & Template Selection */}
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
                    🇮🇳 हिन्दी (नमस्ते)
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Template Selector Chips */}
            <View style={styles.templateGroup}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTemplate('executive')}
                style={[
                  styles.templateChip,
                  (template === 'executive' || template === '5star') && styles.templateChipActive,
                ]}
              >
                <MaterialIcons
                  name="verified"
                  size={15}
                  color={template === 'executive' || template === '5star' ? colors.brand : colors.muted}
                />
                <Text
                  style={[
                    styles.templateChipText,
                    (template === 'executive' || template === '5star') && styles.templateChipTextActive,
                  ]}
                >
                  Executive
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setTemplate('excellence')}
                style={[
                  styles.templateChip,
                  (template === 'excellence' || template === 'experience') && styles.templateChipActive,
                ]}
              >
                <MaterialIcons
                  name="workspace-premium"
                  size={15}
                  color={template === 'excellence' || template === 'experience' ? colors.brand : colors.muted}
                />
                <Text
                  style={[
                    styles.templateChipText,
                    (template === 'excellence' || template === 'experience') && styles.templateChipTextActive,
                  ]}
                >
                  Excellence
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setTemplate('gratitude')}
                style={[
                  styles.templateChip,
                  (template === 'gratitude' || template === 'thankyou') && styles.templateChipActive,
                ]}
              >
                <MaterialIcons
                  name="thumb-up"
                  size={15}
                  color={template === 'gratitude' || template === 'thankyou' ? colors.brand : colors.muted}
                />
                <Text
                  style={[
                    styles.templateChipText,
                    (template === 'gratitude' || template === 'thankyou') && styles.templateChipTextActive,
                  ]}
                >
                  Gratitude
                </Text>
              </Pressable>
            </View>

            {/* Realistic WhatsApp Chat Preview Card */}
            <View style={styles.waCard}>
              {/* WhatsApp App Bar Header */}
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
                  <Text style={styles.waStatus}>Online · Business Account</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  <MaterialIcons name="videocam" size={18} color="#FFFFFF" />
                  <MaterialIcons name="call" size={16} color="#FFFFFF" />
                  <MaterialIcons name="more-vert" size={18} color="#FFFFFF" />
                </View>
              </View>

              {/* Chat Canvas with Wallpaper Tint */}
              <View style={styles.waCanvas}>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleMessageText}>{inviteText}</Text>
                  
                  {/* WhatsApp Message Metadata: Time + Blue Double Ticks */}
                  <View style={styles.bubbleFooter}>
                    <Text style={styles.bubbleTime}>Just now</Text>
                    <MaterialIcons name="done-all" size={15} color={WA_BLUE_TICKS} />
                  </View>
                </View>
              </View>
            </View>

            {/* Inputs: Customer Name + Phone Number with +91 Indian Prefix */}
            <View style={styles.inputContainer}>
              <View style={styles.inputRow}>
                <MaterialIcons name="person" size={18} color={colors.muted} style={{ marginLeft: 10 }} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Customer name (e.g. Ramesh Kumar)"
                  placeholderTextColor={colors.muted}
                  value={customerName}
                  onChangeText={setCustomerName}
                  accessibilityLabel="Customer name"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.phoneCountryBadge}>
                  <Text style={styles.phoneCountryText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="10-digit mobile number"
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

            {/* Action Buttons */}
            <View style={styles.actionBlock}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send on WhatsApp"
                onPress={openWhatsApp}
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
                    {sending ? 'Sending…' : 'Send via Cloud API'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 45, 0.6)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WA_GREEN,
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
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.line,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 6,
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
    color: colors.brand,
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
    color: colors.brand,
    fontWeight: '700',
  },
  waCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D4DDD6',
    backgroundColor: WA_BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  waHeader: {
    backgroundColor: WA_HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  waAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WA_GREEN_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  waAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleMessageText: {
    color: '#111B21',
    fontSize: 13,
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
    paddingHorizontal: 12,
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
    fontSize: 11,
    color: colors.brandDark,
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
    shadowColor: WA_GREEN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
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
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
});
