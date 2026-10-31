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

type TemplateKey = '5star' | 'experience' | 'thankyou';

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
  const [template, setTemplate] = useState<TemplateKey>('5star');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const cleanBusinessName = businessName || 'Our Business';
  const rawFirstName = customerName.trim().split(/\s+/)[0];
  const firstName = rawFirstName ? rawFirstName : lang === 'hi' ? 'प्रिय ग्राहक' : 'there';

  const inviteText = useMemo(() => {
    if (lang === 'hi') {
      if (template === '5star') {
        return [
          `👋 नमस्ते ${firstName}!`,
          '',
          `⭐⭐⭐⭐⭐`,
          `${cleanBusinessName} पर आपके अनुभव के लिए धन्यवाद!`,
          '',
          `यदि आपको हमारी सेवा पसंद आई हो, तो कृपया Google Maps पर अपनी 5-स्टार रेटिंग और छोटा सा रिव्यू शेयर करें। इससे हमारे स्थानीय व्यापार को बहुत मदद मिलती है:`,
          '',
          `👉 रिव्यू लिंक: ${reviewUrl}`,
          '',
          `धन्यवाद! 🙏`,
        ].join('\n');
      }
      if (template === 'experience') {
        return [
          `नमस्ते ${firstName} जी!`,
          '',
          `${cleanBusinessName} को चुनने के लिए आपका बहुत-बहुत धन्यवाद।`,
          `हम हमेशा अपने ग्राहकों को सर्वोत्तम सेवा प्रदान करने का प्रयास करते हैं।`,
          '',
          `कृपया 30 सेकंड का समय निकालकर Google पर अपना अनुभव हमारे साथ साझा करें:`,
          `👉 ${reviewUrl}`,
          '',
          `आपका फीडबैक हमारे लिए बेहद मूल्यवान है!`,
        ].join('\n');
      }
      // thankyou
      return [
        `🙏 ${cleanBusinessName} में आपका स्वागत और धन्यवाद!`,
        '',
        `नमस्ते ${firstName}, आशा है कि आपको हमारी सर्विस अच्छी लगी होगी।`,
        `कृपया Google पर हमारे काम को रेट करें:`,
        `⭐⭐⭐⭐⭐`,
        `👉 ${reviewUrl}`,
        '',
        `आपका दिन शुभ हो!`,
      ].join('\n');
    }

    // English templates
    if (template === '5star') {
      return [
        `👋 Hi ${firstName}!`,
        '',
        `⭐⭐⭐⭐⭐`,
        `Thank you for choosing ${cleanBusinessName}!`,
        '',
        `If you loved our service today, could you take 30 seconds to drop us a 5-star review on Google? It means the world to our local business:`,
        '',
        `👉 Leave a Review: ${reviewUrl}`,
        '',
        `Thank you for your support! 🙏`,
      ].join('\n');
    }
    if (template === 'experience') {
      return [
        `Hello ${firstName},`,
        '',
        `Thank you for trusting ${cleanBusinessName}! How was your service experience today?`,
        '',
        `We strive to deliver top quality every day. Please let us know how we did on Google Maps:`,
        `👉 ${reviewUrl}`,
        '',
        `Your honest review helps other customers find us!`,
      ].join('\n');
    }
    // thankyou
    return [
      `Thank you for your visit, ${firstName}!`,
      '',
      `We truly appreciate having you as our customer at ${cleanBusinessName}.`,
      `Would you mind sharing a quick review on Google?`,
      `⭐⭐⭐⭐⭐`,
      `👉 ${reviewUrl}`,
      '',
      `Have a wonderful day ahead!`,
    ].join('\n');
  }, [lang, template, firstName, cleanBusinessName, reviewUrl]);

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
        body: JSON.stringify({ reviewLink: reviewUrl, businessName: cleanBusinessName, includeDirectLink: true }),
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
                onPress={() => setTemplate('5star')}
                style={[styles.templateChip, template === '5star' && styles.templateChipActive]}
              >
                <MaterialIcons
                  name="star"
                  size={15}
                  color={template === '5star' ? colors.brand : colors.muted}
                />
                <Text style={[styles.templateChipText, template === '5star' && styles.templateChipTextActive]}>
                  5-Star Express
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setTemplate('experience')}
                style={[styles.templateChip, template === 'experience' && styles.templateChipActive]}
              >
                <MaterialIcons
                  name="handshake"
                  size={15}
                  color={template === 'experience' ? colors.brand : colors.muted}
                />
                <Text style={[styles.templateChipText, template === 'experience' && styles.templateChipTextActive]}>
                  Service Feedback
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setTemplate('thankyou')}
                style={[styles.templateChip, template === 'thankyou' && styles.templateChipActive]}
              >
                <MaterialIcons
                  name="card-giftcard"
                  size={15}
                  color={template === 'thankyou' ? colors.brand : colors.muted}
                />
                <Text style={[styles.templateChipText, template === 'thankyou' && styles.templateChipTextActive]}>
                  Thank You Visit
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
