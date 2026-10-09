import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../src/lib/api';
import { API_PATHS } from '../../src/lib/constants';

interface LeadItem {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'booked' | 'converted';
  source: string;
  createdAt: string;
}

const MOCK_LEADS: LeadItem[] = [
  {
    id: 'lead-1',
    name: 'Amitabh Verma',
    company: 'Apex Logistics',
    email: 'amitabh@apex.in',
    phone: '+919876543210',
    status: 'new',
    source: 'Website Form',
    createdAt: '10 mins ago',
  },
  {
    id: 'lead-2',
    name: 'Pooja Kashyap',
    company: 'Glow Wellness Studio',
    email: 'pooja@glow.com',
    phone: '+919811223344',
    status: 'booked',
    source: 'WhatsApp',
    createdAt: '2 hours ago',
  },
  {
    id: 'lead-3',
    name: 'Vikram Malhotra',
    company: 'Malhotra Traders',
    email: 'vikram@traders.com',
    phone: '+919833445566',
    status: 'contacted',
    source: 'AI Chatbot',
    createdAt: 'Yesterday',
  },
  {
    id: 'lead-4',
    name: 'Neha Singhal',
    company: 'Studio Neha',
    email: 'neha@studioneha.com',
    phone: '+919899001122',
    status: 'converted',
    source: 'Digital Card QR',
    createdAt: '3 days ago',
  },
];

export default function LeadsScreen() {
  const [leads, setLeads] = useState<LeadItem[]>(MOCK_LEADS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);

  // New Lead Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newSource, setNewSource] = useState('Manual');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest(API_PATHS.leads);
      if (res && Array.isArray(res.leads) && res.leads.length > 0) {
        const formatted: LeadItem[] = res.leads.map((l: any) => ({
          id: l.id,
          name: l.name || l.fullName || 'Lead',
          company: l.company || '',
          email: l.email || '',
          phone: l.phone || '',
          status: l.status === 'won' ? 'converted' : l.status || 'new',
          source: l.source || 'Website',
          createdAt: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Recent',
        }));
        setLeads(formatted);
      }
    } catch {
      // Keep existing leads on fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'This lead does not have a phone number.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'This lead does not have a phone number.');
      return;
    }
    const clean = phone.replace(/[^\d]/g, '');
    Linking.openURL(`https://wa.me/${clean}?text=Hi!%20Connecting%20regarding%20your%20inquiry.`);
  };

  const handleCreateLead = async () => {
    if (!newName.trim()) {
      Alert.alert('Validation', 'Please enter a name for the lead.');
      return;
    }

    const item: LeadItem = {
      id: `lead-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim(),
      company: newCompany.trim(),
      status: 'new',
      source: newSource,
      createdAt: 'Just now',
    };

    setLeads((prev) => [item, ...prev]);
    setModalVisible(false);

    // Save to backend API asynchronously
    try {
      await apiRequest(API_PATHS.leads, {
        method: 'POST',
        body: {
          name: item.name,
          phone: item.phone,
          email: item.email,
          company: item.company,
          source: item.source,
          status: 'new',
        },
      });
    } catch {
      // Local optimistic update stays visible
    }

    // Reset Form
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewCompany('');
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company && l.company.toLowerCase().includes(search.toLowerCase())) ||
      (l.phone && l.phone.includes(search));
    const matchesFilter = activeFilter === 'all' || l.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return { bg: '#0284c725', text: '#38bdf8' };
      case 'contacted':
        return { bg: '#eab30825', text: '#facc15' };
      case 'booked':
        return { bg: '#8b5cf625', text: '#c084fc' };
      case 'converted':
        return { bg: '#10b98125', text: '#34d399' };
      default:
        return { bg: '#64748b25', text: '#94a3b8' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Leads & Pipeline</Text>
          <Text style={styles.subtitle}>{leads.length} Active Growth Prospects</Text>
        </View>
        <TouchableOpacity style={styles.addLeadButton} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add" size={20} color="#ffffff" />
          <Text style={styles.addLeadText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, phone, company..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['all', 'new', 'contacted', 'booked', 'converted'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLeads} tintColor="#38bdf8" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No leads found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or add a new prospect.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusColor(item.status);
          return (
            <View style={styles.leadCard}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{item.name}</Text>
                  {item.company ? <Text style={styles.leadCompany}>{item.company}</Text> : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.sourceTag}>
                  <MaterialIcons name="label-outline" size={13} color="#94a3b8" />
                  <Text style={styles.sourceText}>{item.source}</Text>
                </View>
                <Text style={styles.timeText}>{item.createdAt}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                {item.phone && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.callBtn]}
                      onPress={() => handleCall(item.phone)}
                    >
                      <MaterialIcons name="phone" size={15} color="#38bdf8" />
                      <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.waBtn]}
                      onPress={() => handleWhatsApp(item.phone)}
                    >
                      <MaterialIcons name="chat" size={15} color="#22c55e" />
                      <Text style={[styles.actionBtnText, { color: '#22c55e' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.stageBtn]}
                  onPress={() => {
                    const next =
                      item.status === 'new'
                        ? 'contacted'
                        : item.status === 'contacted'
                        ? 'booked'
                        : item.status === 'booked'
                        ? 'converted'
                        : 'new';
                    setLeads((prev) =>
                      prev.map((l) => (l.id === item.id ? { ...l, status: next } : l))
                    );
                  }}
                >
                  <MaterialIcons name="update" size={15} color="#94a3b8" />
                  <Text style={styles.actionBtnText}>Update Stage</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Add Lead Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Prospect</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Ramesh Patel"
                placeholderTextColor="#64748b"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. ramesh@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={styles.inputLabel}>Company / Business</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Patel Enterprises"
                placeholderTextColor="#64748b"
                value={newCompany}
                onChangeText={setNewCompany}
              />
            </ScrollView>

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateLead}>
              <Text style={styles.submitButtonText}>Save Lead to BGOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  addLeadButton: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  addLeadText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#0f172a',
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: '#0284c7',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  leadCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  leadCompany: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  timeText: {
    fontSize: 11,
    color: '#64748b',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  callBtn: {
    borderWidth: 1,
    borderColor: '#0284c750',
  },
  waBtn: {
    borderWidth: 1,
    borderColor: '#22c55e50',
  },
  stageBtn: {
    flex: 1,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    color: '#ffffff',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
