import React, { useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';

/**
 * WhatsApp-style Google review request (design spec §WhatsApp Review Request).
 *
 * Real behaviour only:
 *  - "Send via WhatsApp" opens wa.me deep link with the personalized invite
 *    (works without any backend provider — the customer's chat opens on device).
 *  - "Send invite (BGOS)" POSTs /api/reviews/request so the invite also goes
 *    out through the workspace's connected WhatsApp provider when available.
 *  - "Share link" uses the native share sheet with the review link.
 *  - No fabricated stats or fake previews — the preview mirrors the exact
 *    message that will be sent.
 */

const WA_GREEN = '#25D366';
const WA_HEADER = '#075E54';

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
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const firstName = customerName.trim().split(/\s+/)[0] || 'there';

  const inviteText = useMemo(() => {
    return [
      `👋 Hope you had a great experience with us!`,
      '',
      '⭐⭐⭐⭐⭐',
      '',
      `Hi ${firstName},`,
      '',
      `Thank you for choosing ${businessName}. How was our service?`,
      'Please give us a review on Google — it takes 30 seconds and helps our small business a lot.',
      '',
      `Write Review ↗️ ${reviewUrl}`,
    ].join('\n');
  }, [firstName, businessName, reviewUrl]);

  const waHref = useMemo(() => {
    const digits = phone.replace(/[^\d]/g, '');
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
        body: JSON.stringify({ reviewLink: reviewUrl, businessName, includeDirectLink: true }),
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
          ? `Invite sent to ${sent} customer${sent === 1 ? '' : 's'} via your connected WhatsApp.`
          : queued > 0
            ? `Invite queued for ${queued} customer${queued === 1 ? '' : 's'} — will send when your WhatsApp provider is live.`
            : 'No completed-job customers with phone numbers found yet. Use "Send via WhatsApp" to invite directly.',
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not send invite.');
    } finally {
      setSending(false);
    }
  }

  async function shareLink() {
    try {
      await Share.share({ message: `${inviteText}` });
    } catch {
      // user cancelled — ignore
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} accessibilityLabel="Close review request" onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Request a Google Review</Text>
              <Text style={styles.headerSub}>
                Personal invite · WhatsApp style · {businessName}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {/* WhatsApp-style preview */}
          <View style={styles.waCard}>
            <View style={styles.waHeader}>
              <View style={styles.waAvatar}>
                <Text style={styles.waAvatarText}>{(businessName || 'B').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.waName}>{businessName || 'Business'} ✅</Text>
                <Text style={styles.waStatus}>Business account</Text>
              </View>
              <MaterialIcons name="more-vert" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.waBody}>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>👋 Hope you had a great experience with us!</Text>
                <Text style={styles.bubbleStars}>⭐⭐⭐⭐⭐</Text>
                <Text style={styles.bubbleText}>
                  {`Hi ${firstName},\n\nThank you for choosing ${businessName}. How was our service?\nPlease give us a review on Google — it takes 30 seconds and helps our small business a lot.`}
                </Text>
                <Text style={styles.bubbleCta}>Write Review ↗️</Text>
              </View>
            </View>
          </View>

          {/* Inputs */}
          <View style={{ gap: 8 }}>
            <TextInput
              style={styles.input}
              placeholder="Customer name (optional)"
              placeholderTextColor={colors.muted}
              value={customerName}
              onChangeText={setCustomerName}
              accessibilityLabel="Customer name"
            />
            <TextInput
              style={styles.input}
              placeholder="Customer WhatsApp number with country code (optional)"
              placeholderTextColor={colors.muted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Customer WhatsApp number"
            />
          </View>

          {note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={{ gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send via WhatsApp"
              onPress={openWhatsApp}
              style={[styles.primaryBtn, { backgroundColor: WA_GREEN }]}
            >
              <MaterialIcons name="chat" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Send via WhatsApp</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share review link"
                onPress={shareLink}
                style={[styles.secondaryBtn, { flex: 1 }]}
              >
                <MaterialIcons name="share" size={16} color={colors.brand} />
                <Text style={styles.secondaryBtnText}>Share link</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send invite through connected WhatsApp provider"
                onPress={sendViaProvider}
                disabled={sending}
                style={[styles.secondaryBtn, { flex: 1, opacity: sending ? 0.6 : 1 }]}
              >
                <MaterialIcons name="send" size={16} color={colors.brand} />
                <Text style={styles.secondaryBtnText}>{sending ? 'Sending…' : 'Send invite'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(7, 11, 45, 0.55)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  headerSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  waCard: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#ECE5DD' },
  waHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WA_HEADER,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  waAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WA_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waAvatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  waName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  waStatus: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  waBody: { padding: 12, gap: 8 },
  bubble: {
    alignSelf: 'flex-end',
    maxWidth: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  bubbleText: { color: '#111B21', fontSize: 13.5, lineHeight: 19 },
  bubbleStars: { fontSize: 14, letterSpacing: 2 },
  bubbleCta: { color: WA_GREEN, fontSize: 13.5, fontWeight: '800' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    color: colors.ink,
    fontSize: 14,
  },
  noteBox: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteText: { color: colors.ink, fontSize: 12.5, lineHeight: 18 },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' },
});
