import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';
import type {
  Review,
  ReviewFlagReport,
  ReviewFlagStatus,
  ReviewReportReason,
} from './types';

const GOOGLE_REMOVAL_TOOL_URL = 'https://support.google.com/business/workflow/9945796';

const REASON_OPTIONS: Array<{ key: ReviewReportReason; label: string }> = [
  { key: 'fake_never_visited', label: 'Fake / Never visited' },
  { key: 'conflict_of_interest', label: 'Competitor / Jealousy' },
  { key: 'spam_off_topic', label: 'Spam / Off-topic' },
  { key: 'harassment_profanity', label: 'Harassment / Abuse' },
  { key: 'other', label: 'Other policy issue' },
];

const STATUS_OPTIONS: Array<{ key: ReviewFlagStatus; label: string }> = [
  { key: 'flagged', label: 'Flagged' },
  { key: 'appealed_on_google', label: 'Appealed on Google' },
  { key: 'resolved', label: 'Resolved' },
];

export function parseClientFlagReport(review: Review | null | undefined): ReviewFlagReport | null {
  if (!review) return null;
  if (review.flagReport && typeof review.flagReport === 'object') {
    return review.flagReport;
  }
  if (typeof review.responseJson === 'string' && review.responseJson) {
    try {
      const parsed = JSON.parse(review.responseJson);
      if (parsed?.flagReport && typeof parsed.flagReport === 'object') {
        return parsed.flagReport as ReviewFlagReport;
      }
    } catch {
      return null;
    }
  }
  return null;
}

interface ReviewReportSheetProps {
  visible: boolean;
  review: Review | null;
  businessName: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onUseDisputeReply: (review: Review, replyText: string) => void;
}

export function ReviewReportSheet({
  visible,
  review,
  businessName,
  onClose,
  onSaved,
  onUseDisputeReply,
}: ReviewReportSheetProps) {
  const existingFlag = parseClientFlagReport(review);

  const [reason, setReason] = useState<ReviewReportReason>('fake_never_visited');
  const [flagStatus, setFlagStatus] = useState<ReviewFlagStatus>('flagged');
  const [details, setDetails] = useState('');
  const [hideOnPublicPage, setHideOnPublicPage] = useState(true);
  const [appealText, setAppealText] = useState('');
  const [disputeReplyDraft, setDisputeReplyDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !review) return;
    const flag = parseClientFlagReport(review);
    setReason(flag?.reason || (review.rating <= 2 ? 'fake_never_visited' : 'spam_off_topic'));
    setFlagStatus(flag?.flagStatus || 'flagged');
    setDetails(flag?.details || '');
    setHideOnPublicPage(flag ? flag.hideOnPublicPage : true);
    setAppealText(flag?.appealText || '');
    setDisputeReplyDraft(flag?.disputeReplyDraft || '');
  }, [visible, review]);

  async function handleSaveReport(regenerateAppeal = false) {
    if (!review) return;
    setBusy(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        flagReport: ReviewFlagReport;
        googleRemovalToolUrl?: string;
      }>(`/api/reviews/${encodeURIComponent(review.id)}/report`, {
        method: 'POST',
        body: {
          reason,
          flagStatus,
          details,
          hideOnPublicPage,
          regenerateAppeal: regenerateAppeal || !appealText.trim(),
        },
      });
      if (res?.flagReport) {
        setAppealText(res.flagReport.appealText || '');
        setDisputeReplyDraft(res.flagReport.disputeReplyDraft || '');
      }
      await onSaved();
      Alert.alert(
        'Review Flagged & Appeal Ready',
        hideOnPublicPage
          ? 'This review is now hidden from your public BGOS Business Page. Use the generated Google appeal below or open Google’s Review Removal Tool.'
          : 'Your report and Google policy appeal draft have been saved.',
      );
    } catch (err: unknown) {
      Alert.alert('Report Failed', (err as Error).message || 'Could not save review report');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearFlag() {
    if (!review) return;
    setBusy(true);
    try {
      await apiRequest(`/api/reviews/${encodeURIComponent(review.id)}/report`, {
        method: 'DELETE',
      });
      await onSaved();
      onClose();
    } catch (err: unknown) {
      Alert.alert('Clear Failed', (err as Error).message || 'Could not clear review report');
    } finally {
      setBusy(false);
    }
  }

  async function handleShareAppeal() {
    if (!appealText.trim()) return;
    try {
      await Share.share({
        message: appealText.trim(),
        title: `Google Review Removal Appeal — ${businessName}`,
      });
    } catch {}
  }

  async function handleOpenGoogleRemovalTool() {
    const url = existingFlag?.googleRemovalToolUrl || GOOGLE_REMOVAL_TOOL_URL;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Google Removal Tool', url);
      }
    } catch {
      Alert.alert('Google Removal Tool', url);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.55)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
            paddingTop: 18,
            paddingBottom: 26,
          }}
        >
          {/* Sheet Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: '#FEF2F2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="flag" size={18} color="#DC2626" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                  Report Suspicious / Fake Review
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                  {review?.authorName || 'Reviewer'} · {review?.rating || 1}★
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {/* Honest Policy Explainer */}
            <View
              style={{
                backgroundColor: '#FFFBEB',
                borderWidth: 1,
                borderColor: '#FDE68A',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <MaterialIcons name="shield" size={18} color="#D97706" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: '#92400E' }}>
                Google does not permit apps to delete reviews directly via API. Flagging hides this
                review from your BGOS Business Page, drafts a Google Policy appeal, and opens
                Google&apos;s official Removal Workflow.
              </Text>
            </View>

            {/* Reason Selector */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                Google Policy Violation Reason
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REASON_OPTIONS.map((opt) => {
                  const selected = reason === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setReason(opt.key)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: selected ? '#DC2626' : '#E2E8F0',
                        backgroundColor: selected ? '#FEF2F2' : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: selected ? '#B91C1C' : '#475569',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Status Selector */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                Report Tracking Status
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {STATUS_OPTIONS.map((st) => {
                  const selected = flagStatus === st.key;
                  return (
                    <Pressable
                      key={st.key}
                      onPress={() => setFlagStatus(st.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: selected ? '#0F172A' : '#E2E8F0',
                        backgroundColor: selected ? '#0F172A' : '#F8FAFC',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: selected ? '#FFFFFF' : '#475569',
                        }}
                      >
                        {st.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Owner Evidence Note */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                Evidence / Notes for Google Appeal
              </Text>
              <TextInput
                multiline
                value={details}
                onChangeText={setDetails}
                placeholder="e.g. No booking or invoice exists under this name; suspected competitor account."
                placeholderTextColor="#94A3B8"
                style={{
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 74,
                  fontSize: 13,
                  color: '#0F172A',
                  textAlignVertical: 'top',
                  backgroundColor: '#F8FAFC',
                }}
              />
            </View>

            {/* Hide on BGOS Public Page Switch */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                  Hide from BGOS Business Page
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  Exclude this suspicious review from your public `/b/` testimonials section.
                </Text>
              </View>
              <Switch
                value={hideOnPublicPage}
                onValueChange={setHideOnPublicPage}
                trackColor={{ false: '#CBD5E1', true: '#DC2626' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Primary Save & Generate Appeal Button */}
            <Pressable
              disabled={busy}
              onPress={() => void handleSaveReport(!appealText.trim())}
              style={{
                backgroundColor: '#DC2626',
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: busy ? 0.65 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="gavel" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    {existingFlag ? 'Update Report & Appeal' : 'Flag Review & Generate Appeal'}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Appeal Statement + Google Workflow + Dispute Reply CTA */}
            {appealText.trim() ? (
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>
                    Google Policy Appeal Statement
                  </Text>
                  <Pressable onPress={() => void handleSaveReport(true)} disabled={busy}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563EB' }}>
                      Regenerate
                    </Text>
                  </Pressable>
                </View>

                <Text selectable style={{ fontSize: 12.5, lineHeight: 19, color: '#334155' }}>
                  {appealText}
                </Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => void handleShareAppeal()}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                    }}
                  >
                    <MaterialIcons name="ios-share" size={16} color="#0F172A" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                      Copy / Share Appeal
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleOpenGoogleRemovalTool()}
                    style={{
                      flex: 1.2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: '#1D4ED8',
                    }}
                  >
                    <MaterialIcons name="open-in-new" size={15} color="#FFFFFF" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                      Open Google Tool
                    </Text>
                  </Pressable>
                </View>

                {disputeReplyDraft.trim() && review ? (
                  <Pressable
                    onPress={() => {
                      onUseDisputeReply(review, disputeReplyDraft.trim());
                      onClose();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 11,
                      borderRadius: 10,
                      backgroundColor: '#0F172A',
                    }}
                  >
                    <MaterialIcons name="chat-bubble-outline" size={15} color="#FFFFFF" />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                      Draft Diplomatic &quot;No-Record&quot; Reply
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {existingFlag ? (
              <Pressable
                disabled={busy}
                onPress={() => void handleClearFlag()}
                style={{
                  alignItems: 'center',
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748B' }}>
                  Remove Flag & Restore to Public Page
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
