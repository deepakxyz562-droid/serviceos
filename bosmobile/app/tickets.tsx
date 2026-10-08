import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

/**
 * Tickets screen
 * ─────────────────────────────────────────────────────────────────────────
 * There is NO /api/tickets backend. Instead, this screen surfaces recent
 * LEADS as support tickets — the same lead pipeline that drives the
 * Leads screen, but rendered in this Zendesk-style board layout.
 *
 * Each "ticket" row count is computed from the fetched leads list:
 *   - All            → total leads
 *   - Unassigned     → leads with no assignedToId
 *   - My open        → leads assigned to the current user with an open status
 *   - Open/Pending/On hold/Solved/Closed → grouped by lead.status
 *   - Spam/Archive/Trash → lead deletedAt / soft-delete states (kept at 0
 *     for now since the backend doesn't expose a "spam" flag on leads).
 *
 * The "New Ticket" button was an iOS-only Alert.prompt that did nothing
 * useful — it has been removed. There is no mobile lead-creation flow
 * (the AI Copilot / web form builder cover creation).
 */

interface Lead {
  id: string;
  name: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  source?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id?: string; name?: string | null } | null;
  deletedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const OPEN_STATUSES = ['new', 'open', 'contacted', 'qualified', 'in_progress'];
const PENDING_STATUSES = ['pending', 'follow_up'];
const ON_HOLD_STATUSES = ['on_hold', 'paused'];
const SOLVED_STATUSES = ['won', 'solved', 'converted'];
const CLOSED_STATUSES = ['lost', 'closed', 'archived', 'cancelled'];

function statusIn(status: string | null | undefined, list: string[]): boolean {
  if (!status) return false;
  return list.includes(status.toLowerCase());
}

export default function TicketsScreen() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<{ leads: Lead[] }>(API_PATHS.leads, {
        params: { limit: 100 },
      });
      const list = Array.isArray(res?.leads) ? res.leads : Array.isArray(res) ? (res as any) : [];
      setLeads(list);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load tickets.';
      setError(msg);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filtered = leads.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.name || '').toLowerCase().includes(q) ||
      (l.title || '').toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q)
    );
  });

  const counts = {
    myRecent: filtered.filter((l) => l.assignedToId === user?.id || l.assignedTo?.id === user?.id).length,
    all: filtered.length,
    unassigned: filtered.filter((l) => !l.assignedToId && !l.assignedTo?.id).length,
    myOpen: filtered.filter(
      (l) =>
        (l.assignedToId === user?.id || l.assignedTo?.id === user?.id) &&
        !statusIn(l.status, [...SOLVED_STATUSES, ...CLOSED_STATUSES]),
    ).length,
    open: filtered.filter((l) => statusIn(l.status, OPEN_STATUSES)).length,
    pending: filtered.filter((l) => statusIn(l.status, PENDING_STATUSES)).length,
    onHold: filtered.filter((l) => statusIn(l.status, ON_HOLD_STATUSES)).length,
    solved: filtered.filter((l) => statusIn(l.status, SOLVED_STATUSES)).length,
    closed: filtered.filter((l) => statusIn(l.status, CLOSED_STATUSES) || l.deletedAt).length,
    spam: 0,
    archive: filtered.filter((l) => !!l.deletedAt).length,
    trash: 0,
  };

  const goToLeads = () => {
    hapticFeedback.light();
    router.push('/(tabs)/leads' as any);
  };

  const renderRow = (
    label: string,
    count: number,
    iconName: string,
    iconColor: string = '#1e293b',
    onPress: () => void,
    showPill: boolean = true,
  ) => (
    <TouchableOpacity style={styles.rowItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <MaterialIcons name={iconName as any} size={20} color={iconColor} style={{ marginRight: 12 }} />
        <Text style={styles.rowTitle}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {showPill && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{count}</Text>
          </View>
        )}
        <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tickets</Text>
        {/* "New Ticket" button was removed — there is no mobile lead-creation flow. */}
        <View style={{ width: 28 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, source, or title"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeads(); }} />
        }
      >
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#0f172a" />
            <Text style={styles.stateText}>Loading tickets…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <MaterialIcons name="cloud-off" size={42} color="#94a3b8" />
            <Text style={styles.stateTitle}>Couldn’t load tickets</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setLoading(true); fetchLeads(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.disclaimerNote}>
              Tickets mirror your leads pipeline. Tap a status group to view matching leads.
            </Text>

            {/* VIEWS Section */}
            <Text style={styles.sectionHeader}>VIEWS</Text>
            <View style={styles.cardGroup}>
              {renderRow('My recent tickets', counts.myRecent, 'person-outline', '#1e293b', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('All tickets', counts.all, 'confirmation-number', '#1e293b', goToLeads)}
            </View>

            {/* STATUSES Section */}
            <Text style={styles.sectionHeader}>STATUSES</Text>
            <View style={styles.cardGroup}>
              {renderRow('Unassigned', counts.unassigned, 'account-circle', '#1e293b', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('My open', counts.myOpen, 'person-outline', '#1e293b', goToLeads)}
            </View>

            {/* Status Lifecycle Group */}
            <View style={[styles.cardGroup, { marginTop: 12 }]}>
              {renderRow('Open', counts.open, 'play-arrow', '#1e293b', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('Pending', counts.pending, 'hourglass-empty', '#1e293b', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('On hold', counts.onHold, 'pause', '#1e293b', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('Solved', counts.solved, 'check', '#059669', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('Closed', counts.closed, 'done-all', '#64748b', goToLeads)}
            </View>

            {/* Spam, Archive, Trash Group */}
            <View style={[styles.cardGroup, { marginTop: 12 }]}>
              {renderRow('Spam', counts.spam, 'error-outline', '#94a3b8', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('Archive', counts.archive, 'archive', '#94a3b8', goToLeads)}
              <View style={styles.rowDivider} />
              {renderRow('Trash', counts.trash, 'delete-outline', '#94a3b8', goToLeads)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  disclaimerNote: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  cardGroup: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  countPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 48,
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
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
