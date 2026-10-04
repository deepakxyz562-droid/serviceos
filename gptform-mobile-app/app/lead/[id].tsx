import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface ApiLead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  status?: string | null;
  priority?: string | null;
  value?: number | null;
  description?: string | null;
  address?: string | null;
  serviceType?: string | null;
  notesJson?: string | null;
  tagsJson?: string | null;
  createdAt?: string | null;
  followUpAt?: string | null;
  convertedAt?: string | null;
}

interface LeadRow {
  label: string;
  value: string;
}

const formatCurrency = (n?: number | null): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
};

const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
};

// Try to extract a structured qualification note from notesJson.
// The web app stores AI qualification as JSON: { type: 'ai_qualification', summary: '...' }
// or as plain-text notes. We tolerate both shapes.
const extractQualificationSummary = (lead: ApiLead): string => {
  const fallback = lead.description?.trim();
  if (!lead.notesJson) return fallback || '';
  try {
    const parsed = JSON.parse(lead.notesJson);
    if (Array.isArray(parsed)) {
      const ai = parsed.find(
        (n) =>
          n &&
          (n.type === 'ai_qualification' ||
            n.type === 'qualification' ||
            n.kind === 'ai_qualification'),
      );
      if (ai?.summary) return ai.summary;
      if (ai?.text) return ai.text;
      if (ai?.body) return ai.body;
      if (typeof ai === 'string') return ai;
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0];
      }
    } else if (parsed && typeof parsed === 'object') {
      if (parsed.summary) return parsed.summary;
      if (parsed.text) return parsed.text;
    }
  } catch {
    // notesJson was a plain string — use it directly.
    if (typeof lead.notesJson === 'string' && lead.notesJson.trim()) {
      return lead.notesJson.trim();
    }
  }
  return fallback || '';
};

// Strip everything except digits for tel: and whatsapp:// URIs.
const sanitizePhone = (phone?: string | null): string =>
  (phone || '').replace(/[^\d]/g, '');

export default function LeadDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Array.isArray(id) ? id[0] : id;

  const [lead, setLead] = useState<ApiLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ lead: ApiLead }>(API_PATHS.leadDetail(leadId));
      setLead(res.lead);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || `Failed to load lead (${err.statusCode})`
          : 'Failed to load lead';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const phoneDigits = sanitizePhone(lead?.phone);
  const phoneDisplay = lead?.phone || '—';

  const handleCall = () => {
    hapticFeedback.medium();
    if (!phoneDigits) {
      Alert.alert('No phone', 'This lead has no phone number on file.');
      return;
    }
    Linking.openURL(`tel:${phoneDigits}`);
  };

  const handleWhatsApp = () => {
    hapticFeedback.medium();
    if (!phoneDigits) {
      Alert.alert('No phone', 'This lead has no phone number on file.');
      return;
    }
    const firstName = (lead?.name || '').split(' ')[0] || 'there';
    Linking.openURL(
      `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(`Hi ${firstName}`)}`,
    );
  };

  const handleMarkWon = async () => {
    if (!leadId || updating) return;
    setUpdating(true);
    try {
      await apiRequest(API_PATHS.leadDetail(leadId), {
        method: 'PUT',
        body: { status: 'won' },
      });
      await hapticFeedback.success();
      Alert.alert('Success', 'Lead marked as Contacted & Won.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || 'Failed to update lead'
          : 'Failed to update lead';
      Alert.alert('Update failed', message);
    } finally {
      setUpdating(false);
    }
  };

  const qualificationSummary = lead ? extractQualificationSummary(lead) : '';
  const dataRows: LeadRow[] = lead
    ? [
        { label: 'Service Type:', value: lead.serviceType || '—' },
        { label: 'Location:', value: lead.address || '—' },
        { label: 'Source:', value: lead.source || '—' },
        { label: 'Status:', value: lead.status || '—' },
        { label: 'Created:', value: formatDate(lead.createdAt) },
      ]
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.inner}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Lead Dossier</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {loading ? 'Loading…' : error ? 'Lead not found' : lead?.name || 'Lead'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              router.back();
            }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color="#34D399" />
              <Text style={styles.stateText}>Loading lead…</Text>
            </View>
          ) : error ? (
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchLead}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Quick Actions Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleCall} style={styles.callBtn}>
                  <Ionicons name="call" size={15} color="#022C22" style={{ marginRight: 6 }} />
                  <Text style={styles.callBtnText}>Call Now</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleWhatsApp} style={styles.whatsAppBtn}>
                  <FontAwesome5 name="whatsapp" size={15} color="#14B8A6" style={{ marginRight: 6 }} />
                  <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {/* AI Qualification Card */}
              <View style={styles.aiCard}>
                <View style={styles.aiCardHeader}>
                  <Ionicons name="sparkles" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.aiCardTitle}>AI Qualification Summary</Text>
                </View>
                <Text style={styles.aiCardBody}>
                  {qualificationSummary ||
                    'No AI qualification summary recorded for this lead yet.'}
                </Text>
              </View>

              {/* Form Answers Grid */}
              <View style={styles.dataCard}>
                <Text style={styles.dataCardTitle}>Intake Form Data</Text>

                {dataRows.map((row, idx) => (
                  <View
                    key={row.label}
                    style={[styles.dataRow, idx === dataRows.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <Text style={styles.dataLabel}>{row.label}</Text>
                    <Text style={styles.dataValue} numberOfLines={2}>
                      {row.value}
                    </Text>
                  </View>
                ))}

                <View style={[styles.dataRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.dataLabel}>Phone:</Text>
                  <Text style={styles.dataValue}>{phoneDisplay}</Text>
                </View>

                <View style={[styles.dataRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.dataLabel}>Email:</Text>
                  <Text style={styles.dataValue} numberOfLines={1}>
                    {lead?.email || '—'}
                  </Text>
                </View>

                <View style={[styles.dataRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.dataLabel}>Estimated Value:</Text>
                  <Text style={styles.valueHighlight}>
                    {formatCurrency(lead?.value)}
                  </Text>
                </View>
              </View>

              {/* Stage Progression Action */}
              <View style={styles.footerAction}>
                <TouchableOpacity
                  onPress={handleMarkWon}
                  disabled={updating}
                  style={[styles.wonBtn, updating && { opacity: 0.6 }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.wonBtnText}>
                    {updating ? 'Updating…' : 'Mark as Contacted & Won'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  stateText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  callBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#022C22',
  },
  whatsAppBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsAppBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5EEAD4',
  },
  aiCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiCardBody: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    fontWeight: '500',
  },
  dataCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  dataCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    alignItems: 'flex-start',
  },
  dataLabel: {
    fontSize: 12,
    color: '#94A3B8',
    flexShrink: 0,
  },
  dataValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  valueHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#34D399',
  },
  footerAction: {
    paddingBottom: 30,
  },
  wonBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wonBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
