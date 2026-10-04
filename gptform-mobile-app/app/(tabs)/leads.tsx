import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { API_PATHS } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';

interface DemoLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  source: 'ai_agent' | 'form' | 'chat';
  status: 'new' | 'contacted' | 'won';
  estimatedValue: number;
  time: string;
  summary: string;
}

export default function LeadsScreen() {
  const [selectedStatus, setSelectedStatus] = useState<'new' | 'contacted' | 'won'>('new');
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setError(null);
      const res = await apiRequest<any>(API_PATHS.leads);
      const list = Array.isArray(res) ? res : res?.leads || [];
      const mapped: DemoLead[] = list.map((it: any, idx: number) => ({
        id: it.id || `lead-${idx}`,
        name: it.name || it.customerName || 'Lead',
        phone: it.phone || it.customerPhone || '',
        email: it.email || it.customerEmail || '',
        service: it.service || it.title || 'General Inquiry',
        source: it.source || 'ai_agent',
        status: (it.status === 'won' || it.status === 'contacted') ? it.status : 'new',
        estimatedValue: Number(it.estimatedValue || it.value || 0),
        time: it.createdAt ? new Date(it.createdAt).toLocaleDateString() : 'Recent',
        summary: it.summary || it.notes || 'Inquiry captured by AI Assistant.',
      }));
      setLeads(mapped);
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || 'We couldn\'t load your leads right now.';
      setError(msg);
      setLeads([]);
    }
  };

  useEffect(() => {
    fetchLeads().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    await fetchLeads();
    setRefreshing(false);
  };

  const filteredLeads = leads.filter((l) => l.status === selectedStatus);

  const handleCall = async (phone: string) => {
    await hapticFeedback.medium();
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = async (phone: string, name: string) => {
    await hapticFeedback.medium();
    const clean = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hi ${name}, following up on your inquiry with our AI Assistant.`);
    Linking.openURL(`whatsapp://send?phone=${clean}&text=${msg}`);
  };

  const handleOpenLead = async (id: string) => {
    await hapticFeedback.light();
    router.push(`/lead/${id}` as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            hapticFeedback.light();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leads Pipeline</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.container}>
        {/* Pipeline Tabs */}
        <View style={styles.tabsRow}>
          {[
            { id: 'new', label: '🔥 New', count: leads.filter((l) => l.status === 'new').length },
            { id: 'contacted', label: 'Contacted', count: leads.filter((l) => l.status === 'contacted').length },
            { id: 'won', label: 'Won', count: leads.filter((l) => l.status === 'won').length },
          ].map((tab) => {
            const active = selectedStatus === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={async () => {
                  await hapticFeedback.light();
                  setSelectedStatus(tab.id as any);
                }}
                style={[styles.tabItem, active && styles.tabItemActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Leads List */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
          showsVerticalScrollIndicator={false}
        >
        {/* Loading state */}
        {loading && (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.stateText}>Loading leads…</Text>
          </View>
        )}

        {/* Error state */}
        {!loading && error && (
          <View style={styles.errorWrap}>
            <MaterialIcons name="cloud-off" size={40} color="#ef4444" style={{ marginBottom: 10 }} />
            <Text style={styles.errorTitle}>Couldn't load leads</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                hapticFeedback.light();
                setLoading(true);
                fetchLeads().finally(() => setLoading(false));
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty (no leads at all) state */}
        {!loading && !error && leads.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No leads yet</Text>
            <Text style={styles.emptySubtitle}>AI will automatically capture and qualify incoming inquiries.</Text>
          </View>
        )}

        {/* Loaded list / per-stage empty state */}
        {!loading && !error && leads.length > 0 && (
          <>
          {filteredLeads.map((lead) => (
            <View key={lead.id} style={styles.leadCard}>
              <TouchableOpacity
                onPress={() => handleOpenLead(lead.id)}
                activeOpacity={0.8}
                style={styles.leadCardHeader}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{lead.name}</Text>
                  <Text style={styles.leadService}>{lead.service}</Text>
                </View>
                <View style={styles.leadPriceCol}>
                  <Text style={styles.leadValue}>${lead.estimatedValue}</Text>
                  <Text style={styles.leadTime}>{lead.time}</Text>
                </View>
              </TouchableOpacity>

              {/* AI Summary Card */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryTag}>
                  <MaterialIcons name="auto-awesome" size={13} color="#10b981" style={{ marginRight: 4 }} />
                  <Text style={styles.summaryTagText}>AI Qualified</Text>
                </View>
                <Text style={styles.summaryText}>{lead.summary}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleCall(lead.phone)}
                  style={styles.callBtn}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="phone" size={15} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleWhatsApp(lead.phone, lead.name)}
                  style={styles.waBtn}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="chat" size={15} color="#0d9488" style={{ marginRight: 6 }} />
                  <Text style={styles.waBtnText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleOpenLead(lead.id)}
                  style={styles.detailsBtn}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="chevron-right" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredLeads.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No leads in this stage</Text>
              <Text style={styles.emptySubtitle}>Try switching tabs above.</Text>
            </View>
          )}
          </>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRight: {
    width: 36,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#10b981',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBadgeTextActive: {
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 12,
  },
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  leadCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  leadService: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  leadPriceCol: {
    alignItems: 'flex-end',
  },
  leadValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  leadTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  summaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  callBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  waBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d9488',
  },
  detailsBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
