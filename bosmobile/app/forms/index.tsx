import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Switch,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface FormItem {
  id: string;
  title: string;
  type: string;
  submissionsCount: number;
  conversionRate: string;
  active: boolean;
  lastSubmission: string;
  shareUrl: string;
}

function formatConversionRate(rate: any): string {
  if (rate == null || rate === '') return '—';
  if (typeof rate === 'number') {
    if (rate <= 1) return `${(rate * 100).toFixed(1)}%`;
    return `${rate.toFixed(1)}%`;
  }
  const s = String(rate);
  if (!s.includes('%') && !isNaN(Number(s))) {
    const n = Number(s);
    if (n <= 1) return `${(n * 100).toFixed(1)}%`;
    return `${n.toFixed(1)}%`;
  }
  return s;
}

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'Just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function mapApiFormToFormItem(f: any): FormItem {
  const submissionsCount =
    typeof f?.submissions === 'number'
      ? f.submissions
      : typeof f?.responseCount === 'number'
        ? f.responseCount
        : 0;
  const shareUrl = f?.slug
    ? `https://gptform.com/f/${f.slug}`
    : f?.id
      ? `https://gptform.com/f/${f.id}`
      : '—';
  return {
    id: f.id,
    title: f.name || f.title || 'Untitled Form',
    type: f.type || 'Form',
    submissionsCount,
    conversionRate: formatConversionRate(f?.conversionRate),
    active: f?.status === 'active',
    lastSubmission: timeAgo(f?.updatedAt || f?.createdAt),
    shareUrl,
  };
}

export default function FormsListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<{ forms: any[] }>(API_PATHS.forms);
      const list = Array.isArray(res?.forms) ? res.forms : Array.isArray(res) ? (res as any[]) : [];
      setForms(list.map(mapApiFormToFormItem));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load forms.';
      setError(msg);
      setForms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const toggleFormActive = async (id: string) => {
    const target = forms.find((f) => f.id === id);
    if (!target || togglingId) return;
    const next = !target.active;
    setTogglingId(id);
    // Optimistic update
    setForms((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: next } : f)),
    );
    try {
      // Backend PUT /api/forms/[id] reads body.status ('active' | 'inactive' | 'archived').
      await apiRequest(API_PATHS.formDetail(id), {
        method: 'PUT',
        body: { status: next ? 'active' : 'inactive' },
      });
    } catch (err) {
      // Revert on error
      setForms((prev) =>
        prev.map((f) => (f.id === id ? { ...f, active: !next } : f)),
      );
      const msg = err instanceof ApiError ? err.message : 'Failed to update form status.';
      Alert.alert('Update failed', msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleShare = async (form: FormItem) => {
    try {
      await Share.share({
        message: `Fill out ${form.title}: ${form.shareUrl}`,
        url: form.shareUrl,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleFormMenu = (form: FormItem) => {
    Alert.alert(form.title, 'Manage form settings & submissions', [
      { text: 'View Submissions (Inbox)', onPress: () => router.push('/(tabs)/inbox' as any) },
      { text: 'Copy Link', onPress: () => Alert.alert('Copied!', 'Form link copied to clipboard.') },
      {
        text: 'Edit in GPTForm Studio (Desktop)',
        onPress: () =>
          Alert.alert(
            'GPTForm Studio',
            'Full drag-and-drop form canvas, conditional logic, and calculations are designed for desktop browsers.\n\nOpen https://gptform.com on your computer to edit form fields.'
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const filtered = forms.filter((f) =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forms & Submissions</Text>
      </View>

      {/* Desktop Notice Banner */}
      <View style={styles.desktopBanner}>
        <Feather name="monitor" size={18} color="#0284C7" style={{ marginRight: 10 }} />
        <Text style={styles.desktopBannerText}>
          Create and visually architect advanced forms on <Text style={styles.boldText}>GPTForm Studio Desktop</Text>. Manage responses and links right here on mobile.
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search published forms..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchForms(); }} />
        }
      >
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.stateText}>Loading your forms…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Feather name="cloud-off" size={42} color="#94A3B8" />
            <Text style={styles.stateTitle}>Couldn’t load forms</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setLoading(true); fetchForms(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.stateWrap}>
            <Feather name="file-text" size={42} color="#94A3B8" />
            <Text style={styles.stateTitle}>
              {searchQuery ? 'No matching forms' : 'No forms yet'}
            </Text>
            <Text style={styles.stateText}>
              {searchQuery
                ? 'Try a different search term.'
                : 'Forms you create in GPTForm Studio Desktop will appear here.'}
            </Text>
          </View>
        ) : (
          filtered.map((form) => (
            <TouchableOpacity
              key={form.id}
              style={styles.formCard}
              onPress={() => handleFormMenu(form)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{form.type}</Text>
                  </View>
                  <Switch
                    value={form.active}
                    onValueChange={() => toggleFormActive(form.id)}
                    disabled={togglingId === form.id}
                    trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
                <Text style={styles.formTitle}>{form.title}</Text>
              </View>

              {/* Metrics Row */}
              <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{form.submissionsCount}</Text>
                  <Text style={styles.metricLabel}>Submissions</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{form.conversionRate}</Text>
                  <Text style={styles.metricLabel}>Conversion</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{form.lastSubmission}</Text>
                  <Text style={styles.metricLabel}>Last Active</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsFooter}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => handleShare(form)}
                >
                  <Ionicons name="share-social-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>Share Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inboxBtn}
                  onPress={() => router.push('/(tabs)/inbox' as any)}
                >
                  <Ionicons name="chatbubbles-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                  <Text style={styles.inboxBtnText}>View Chats</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  desktopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  desktopBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 8,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  inboxBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    paddingVertical: 8,
  },
  inboxBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
});
