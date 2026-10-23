import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { useAuthStore } from '@/stores/auth-store';

type StaffRole = 'owner' | 'admin' | 'biller' | 'cashier' | 'stock_manager' | 'accountant';

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: StaffRole;
  isActive: boolean;
  permissions: {
    canCreateInvoices: boolean;
    canPosBilling: boolean;
    canManageProducts: boolean;
    canViewReports: boolean;
    canManageKhata: boolean;
    canManageSettings: boolean;
    canManageStaff: boolean;
  };
}

export default function MobileStaffScreen() {
  const { blueprint } = useBlueprintStore();
  const { user } = useAuthStore();
  const language = blueprint.language === 'hi' ? 'hi' : 'en';
  const t = (en: string, hi: string) => (language === 'hi' ? hi : en);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffRole>('biller');
  const [permissions, setPermissions] = useState({
    canCreateInvoices: true,
    canPosBilling: true,
    canManageProducts: false,
    canViewReports: false,
    canManageKhata: true,
    canManageSettings: false,
    canManageStaff: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ staff: StaffMember[] }>('/api/commerce/staff');
      if (Array.isArray(res.staff)) {
        setStaff(res.staff);
      }
    } catch {
      // Offline fallback mock data
      setStaff([
        {
          id: 'owner-main',
          name: user?.name || blueprint.businessName || 'Store Owner',
          phone: user?.phone || '+91 98765 43210',
          role: 'owner',
          isActive: true,
          permissions: {
            canCreateInvoices: true,
            canPosBilling: true,
            canManageProducts: true,
            canViewReports: true,
            canManageKhata: true,
            canManageSettings: true,
            canManageStaff: true,
          },
        },
        {
          id: 'staff-demo-admin',
          name: 'Sunil Verma',
          phone: '+91 98111 22334',
          email: 'sunil@store.in',
          role: 'admin',
          isActive: true,
          permissions: {
            canCreateInvoices: true,
            canPosBilling: true,
            canManageProducts: true,
            canViewReports: true,
            canManageKhata: true,
            canManageSettings: true,
            canManageStaff: true,
          },
        },
        {
          id: 'staff-demo-biller',
          name: 'Kavita Sharma',
          phone: '+91 98222 33445',
          email: 'kavita@store.in',
          role: 'biller',
          isActive: true,
          permissions: {
            canCreateInvoices: true,
            canPosBilling: true,
            canManageProducts: false,
            canViewReports: false,
            canManageKhata: true,
            canManageSettings: false,
            canManageStaff: false,
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user?.name, user?.phone, blueprint.businessName]);


  useFocusEffect(
    useCallback(() => {
      void fetchStaff();
    }, [fetchStaff])
  );

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setPhone('');
    setEmail('');
    setSelectedRole('biller');
    setPermissions({
      canCreateInvoices: true,
      canPosBilling: true,
      canManageProducts: false,
      canViewReports: false,
      canManageKhata: true,
      canManageSettings: false,
      canManageStaff: false,
    });
    setModalVisible(true);
  };

  const openEditModal = (m: StaffMember) => {
    setEditingMember(m);
    setName(m.name);
    setPhone(m.phone);
    setEmail(m.email || '');
    setSelectedRole(m.role);
    setPermissions({
      canCreateInvoices: Boolean(m.permissions?.canCreateInvoices),
      canPosBilling: Boolean(m.permissions?.canPosBilling),
      canManageProducts: Boolean(m.permissions?.canManageProducts),
      canViewReports: Boolean(m.permissions?.canViewReports),
      canManageKhata: Boolean(m.permissions?.canManageKhata),
      canManageSettings: Boolean(m.permissions?.canManageSettings),
      canManageStaff: Boolean(m.permissions?.canManageStaff),
    });
    setModalVisible(true);
  };

  const handleRoleChange = (r: StaffRole) => {
    setSelectedRole(r);
    if (r === 'admin') {
      setPermissions({
        canCreateInvoices: true,
        canPosBilling: true,
        canManageProducts: true,
        canViewReports: true,
        canManageKhata: true,
        canManageSettings: true,
        canManageStaff: true,
      });
    } else if (r === 'biller') {
      setPermissions({
        canCreateInvoices: true,
        canPosBilling: true,
        canManageProducts: false,
        canViewReports: false,
        canManageKhata: true,
        canManageSettings: false,
        canManageStaff: false,
      });
    } else if (r === 'cashier') {
      setPermissions({
        canCreateInvoices: false,
        canPosBilling: true,
        canManageProducts: false,
        canViewReports: false,
        canManageKhata: false,
        canManageSettings: false,
        canManageStaff: false,
      });
    } else if (r === 'stock_manager') {
      setPermissions({
        canCreateInvoices: false,
        canPosBilling: false,
        canManageProducts: true,
        canViewReports: false,
        canManageKhata: false,
        canManageSettings: false,
        canManageStaff: false,
      });
    } else if (r === 'accountant') {
      setPermissions({
        canCreateInvoices: false,
        canPosBilling: false,
        canManageProducts: false,
        canViewReports: true,
        canManageKhata: true,
        canManageSettings: false,
        canManageStaff: false,
      });
    }
  };

  const saveStaffMember = async () => {
    if (!name.trim()) {
      Alert.alert(t('Name required', 'नाम आवश्यक है'), t('Please enter the staff member name.', 'कृपया कर्मचारी का नाम लिखें।'));
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t('Phone required', 'फोन नंबर आवश्यक है'), t('Please enter mobile phone number.', 'कृपया मोबाइल नंबर लिखें।'));
      return;
    }

    try {
      setSaving(true);
      if (editingMember) {
        await apiRequest('/api/commerce/staff', {
          method: 'PATCH',
          body: {
            id: editingMember.id,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            role: selectedRole,
            permissions,
          },
        });
        Alert.alert(t('Staff updated', 'स्टाफ़ अपडेट हुआ'));
      } else {
        await apiRequest('/api/commerce/staff', {
          method: 'POST',
          body: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            role: selectedRole,
            permissions,
          },
        });
        Alert.alert(t('Staff added', 'नया स्टाफ़ जुड़ गया'));
      }
      setModalVisible(false);
      void fetchStaff();
    } catch (err: any) {
      Alert.alert(t('Failed to save', 'सेव नहीं हो सका'), err?.message || t('Check network connection', 'इंटरनेट जाँचें'));
    } finally {
      setSaving(false);
    }
  };

  const deleteStaffMember = (id: string, memberName: string) => {
    Alert.alert(
      t('Remove staff member?', 'स्टाफ़ सदस्य हटाएं?'),
      `${t('Are you sure you want to remove', 'क्या आप सचमुच हटाना चाहते हैं')} ${memberName}?`,
      [
        { text: t('Cancel', 'रद्द करें'), style: 'cancel' },
        {
          text: t('Remove', 'हटाएं'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/api/commerce/staff?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
              });
              void fetchStaff();
            } catch {
              Alert.alert(t('Failed to remove', 'हटाया नहीं जा सका'));
            }
          },
        },
      ]
    );
  };

  const getRoleBadge = (r: StaffRole) => {
    switch (r) {
      case 'owner':
        return { label: t('Owner', 'मालिक'), bg: '#f3e8ff', text: '#7e22ce' };
      case 'admin':
        return { label: t('Admin / Manager', 'एडमिन / मैनेजर'), bg: '#e6f6f0', text: '#0A6847' };
      case 'biller':
        return { label: t('Biller', 'बिलर'), bg: '#dbeafe', text: '#2563eb' };
      case 'cashier':
        return { label: t('Cashier', 'कैशियर'), bg: '#fef3c7', text: '#d97706' };
      case 'stock_manager':
        return { label: t('Stock Manager', 'स्टॉक मैनेजर'), bg: '#ffedd5', text: '#ea580c' };
      case 'accountant':
        return { label: t('Accountant / CA', 'मुनीम / सीए'), bg: '#e0e7ff', text: '#4338ca' };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="#142d25" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {t('Store Team & Roles', 'स्टाफ़ और भूमिकाएँ')}
          </Text>
          <Text style={styles.headerSub}>
            {t('Manage operators, billing staff & cashiers', 'बिलर, कैशियर और मैनेजर जोड़ें')}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={openAddModal}
          style={styles.addBtn}
        >
          <MaterialIcons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0A6847" />
          <Text style={styles.loadingText}>
            {t('Loading staff directory...', 'स्टाफ़ लोड हो रहा है...')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Summary Banner */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryVal}>{staff.length}</Text>
              <Text style={styles.summaryLabel}>{t('Total Team', 'कुल स्टाफ़')}</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryValGreen}>
                {staff.filter((s) => s.isActive).length}
              </Text>
              <Text style={styles.summaryLabel}>{t('Active Operators', 'सक्रिय ऑपरेटर')}</Text>
            </View>
          </View>

          {/* Members List */}
          <View style={styles.listCard}>
            <Text style={styles.listTitle}>{t('Team Members', 'कर्मचारी सूची')}</Text>

            {staff.map((member) => {
              const badge = getRoleBadge(member.role);
              const isOwner = member.role === 'owner';

              return (
                <View key={member.id} style={styles.memberItem}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(member.name || 'S').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.memberPhone}>{member.phone}</Text>

                    {/* Permissions summary */}
                    <View style={styles.permRow}>
                      {isOwner ? (
                        <Text style={styles.permTag}>{t('All access', 'सभी अधिकार')}</Text>
                      ) : (
                        <>
                          {member.permissions?.canCreateInvoices && (
                            <Text style={styles.permTag}>{t('Invoicing', 'बिलिंग')}</Text>
                          )}
                          {member.permissions?.canPosBilling && (
                            <Text style={styles.permTag}>{t('POS', 'काउंटर')}</Text>
                          )}
                          {member.permissions?.canManageProducts && (
                            <Text style={styles.permTag}>{t('Stock', 'स्टॉक')}</Text>
                          )}
                          {member.permissions?.canViewReports && (
                            <Text style={styles.permTag}>{t('Reports', 'रिपोर्ट')}</Text>
                          )}
                        </>
                      )}
                    </View>
                  </View>

                  {!isOwner && (
                    <View style={styles.actionCol}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => openEditModal(member)}
                        style={styles.iconBtn}
                      >
                        <MaterialIcons name="edit" size={18} color="#0A6847" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => deleteStaffMember(member.id, member.name)}
                        style={styles.iconBtn}
                      >
                        <MaterialIcons name="delete-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMember
                  ? t('Edit Team Member', 'स्टाफ़ एडिट करें')
                  : t('Add Team Member', 'नया स्टाफ़ सदस्य')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
              <View>
                <Text style={styles.inputLabel}>{t('Full Name *', 'पूरा नाम *')}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('e.g. Ramesh Kumar', 'उदा. रमेश कुमार')}
                  style={styles.textInput}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>{t('Mobile Number *', 'मोबाइल नंबर *')}</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="9876543210"
                  style={styles.textInput}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>{t('Email (Optional)', 'ईमेल (वैकल्पिक)')}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="ramesh@store.in"
                  style={styles.textInput}
                />
              </View>

              <Text style={styles.inputLabel}>{t('Select Role Preset', 'भूमिका चुनें')}</Text>
              <View style={styles.roleGrid}>
                {(
                  [
                    { id: 'admin', label: '🛡️ Admin / Manager', sub: 'Full control' },
                    { id: 'biller', label: '🧾 Biller', sub: 'Invoices & Khata' },
                    { id: 'cashier', label: '🛒 Cashier', sub: 'POS selling' },
                    { id: 'stock_manager', label: '📦 Stock Manager', sub: 'Products & stock' },
                    { id: 'accountant', label: '📊 Accountant', sub: 'Tax & reports' },
                  ] as const
                ).map((r) => {
                  const sel = selectedRole === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => handleRoleChange(r.id)}
                      style={[styles.roleCard, sel && styles.roleCardActive]}
                    >
                      <Text style={[styles.roleCardTitle, sel && styles.roleCardTitleActive]}>
                        {r.label}
                      </Text>
                      <Text style={styles.roleCardSub}>{r.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Permission toggles */}
              <Text style={styles.inputLabel}>{t('Permissions Granted', 'दिए गए अधिकार')}</Text>
              <View style={styles.permBox}>
                {[
                  { key: 'canCreateInvoices', label: t('Create Invoices & Bills', 'बिल और इनवॉइस बनाना') },
                  { key: 'canPosBilling', label: t('POS Counter Billing', 'पीओएस काउंटर बिक्री') },
                  { key: 'canManageProducts', label: t('Add/Edit Products & Stock', 'सामान और स्टॉक बदलना') },
                  { key: 'canViewReports', label: t('View Business & Tax Reports', 'बिक्री व टैक्स रिपोर्ट देखना') },
                  { key: 'canManageKhata', label: t('Customer Khata Credit', 'ग्राहक उधार खाता संभालना') },
                ].map((p) => {
                  const on = Boolean((permissions as any)[p.key]);
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() =>
                        setPermissions({
                          ...permissions,
                          [p.key]: !on,
                        })
                      }
                      style={styles.checkRow}
                    >
                      <MaterialIcons
                        name={on ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color={on ? '#0A6847' : '#94a3b8'}
                      />
                      <Text style={styles.checkLabel}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={saving}
                onPress={saveStaffMember}
                style={styles.saveBtn}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingMember
                      ? t('Update Team Member', 'अपडेट करें')
                      : t('Save & Add Member', 'सेव करें व जोड़ें')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8f7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6ebe8',
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f3',
  },
  addBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#0A6847',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#142d25' },
  headerSub: { fontSize: 11.5, color: '#64748b', marginTop: 1 },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 13, color: '#64748b' },
  scroll: { padding: 14, gap: 14, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e6ebe8',
  },
  summaryMetric: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 22, fontWeight: '800', color: '#111827' },
  summaryValGreen: { fontSize: 22, fontWeight: '800', color: '#0A6847' },
  summaryLabel: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6ebe8',
    gap: 14,
  },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f3',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#e6f6f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#0A6847' },
  memberName: { fontSize: 14.5, fontWeight: '700', color: '#111827' },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: { fontSize: 10.5, fontWeight: '700' },
  memberPhone: { fontSize: 12, color: '#64748b' },
  permRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  permTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0A6847',
    backgroundColor: '#e6f6f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionCol: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  iconBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f8fafc' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  textInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fafdfb',
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleCard: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  roleCardActive: {
    borderColor: '#0A6847',
    backgroundColor: '#e6f6f0',
  },
  roleCardTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  roleCardTitleActive: { color: '#0A6847' },
  roleCardSub: { fontSize: 10, color: '#64748b', marginTop: 2 },
  permBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { fontSize: 13, color: '#334155' },
  saveBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0A6847',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
