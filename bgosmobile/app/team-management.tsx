import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Badge, colors, ui, Avatar } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface TeamResponse {
  users: TeamUser[];
  invitations?: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
  }>;
  currentUserId: string;
  currentUserRole: string;
  businessName: string;
}

const ROLE_DEFINITIONS = [
  {
    key: 'admin',
    label: 'Admin',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    icon: 'verified-user',
    desc: 'Full access to Google Business connection, posts, reviews, and team invites.',
  },
  {
    key: 'manager',
    label: 'Manager',
    color: '#059669',
    bgColor: '#ECFDF5',
    icon: 'manage-accounts',
    desc: 'Can create & schedule posts, reply to customer reviews, and view rank heatmaps.',
  },
  {
    key: 'staff',
    label: 'Staff / Counter',
    color: '#D97706',
    bgColor: '#FFFBEB',
    icon: 'badge',
    desc: 'Can send WhatsApp/SMS review requests to customers and present QR standee at counter.',
  },
];

export default function TeamManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const teamRes = useResource<TeamResponse>('/api/users');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'staff'>('staff');
  const [inviting, setInviting] = useState(false);

  // Success modal for sharing credentials
  const [invitedResult, setInvitedResult] = useState<{
    user: TeamUser;
    tempPassword: string;
    whatsappShareText: string;
    loginUrl: string;
  } | null>(null);

  // Edit role modal
  const [editingMember, setEditingMember] = useState<TeamUser | null>(null);
  const [editRole, setEditRole] = useState<string>('staff');
  const [savingEdit, setSavingEdit] = useState(false);

  const users = teamRes.data?.users || [];
  const currentUserRole = teamRes.data?.currentUserRole || 'staff';
  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';
  const businessName = teamRes.data?.businessName || 'Our Business';

  const handleOpenInvite = () => {
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteRole('staff');
    setInviteModalOpen(true);
  };

  const handleSendInvite = async () => {
    const nameTrimmed = inviteName.trim();
    const phoneTrimmed = invitePhone.trim();
    const emailTrimmed = inviteEmail.trim();

    if (!nameTrimmed) {
      Alert.alert('Required Field', 'Please enter the team member’s full name.');
      return;
    }

    if (!phoneTrimmed && !emailTrimmed) {
      Alert.alert(
        'Contact Required',
        'Please enter a mobile phone number (for instant SMS OTP login) or an email address.',
      );
      return;
    }

    setInviting(true);
    try {
      const res = await apiRequest<{
        user: TeamUser;
        emailSent?: boolean;
        emailError?: string | null;
        tempPassword?: string;
        loginUrl: string;
        whatsappShareText: string;
      }>('/api/users', {
        method: 'POST',
        body: {
          name: nameTrimmed,
          email: emailTrimmed,
          phone: phoneTrimmed,
          role: inviteRole,
        },
      });

      await teamRes.refresh();
      setInviteModalOpen(false);
      setInvitedResult(res as any);

      if (res.emailSent) {
        Alert.alert(
          'Invitation Sent!',
          `Invitation email dispatched to ${emailTrimmed}. Your member can also log in instantly on the BGOS app with their phone number via SMS OTP.`,
        );
      } else if (phoneTrimmed) {
        Alert.alert(
          'Member Added!',
          'Your team member can now log in immediately on the BGOS app using their mobile number and SMS OTP.',
        );
      }
    } catch (e: unknown) {
      Alert.alert('Invite Error', e instanceof Error ? e.message : 'Could not create member.');
    } finally {
      setInviting(false);
    }
  };

  const handleShareWhatsApp = (text: string, phone?: string | null) => {
    const cleanPhone = (phone || '').replace(/[^\d]/g, '');
    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    void Linking.openURL(url);
  };

  const handleCopyCredentials = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch {
      Alert.alert('Notice', 'Could not open share dialogue.');
    }
  };

  const handleSaveRole = async () => {
    if (!editingMember) return;
    setSavingEdit(true);
    try {
      await apiRequest(`/api/users/${editingMember.id}`, {
        method: 'PATCH',
        body: { role: editRole },
      });
      await teamRes.refresh();
      setEditingMember(null);
      Alert.alert('Role Updated', `${editingMember.name || editingMember.email}'s role is now ${editRole.toUpperCase()}.`);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update role.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRemoveMember = (member: TeamUser) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.name || member.email} from ${businessName}? They will immediately lose access to this workspace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/api/users/${member.id}`, { method: 'DELETE' });
              await teamRes.refresh();
              Alert.alert('Member Removed', `${member.name || member.email} has been removed.`);
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not remove member.');
            }
          },
        },
      ]
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return { label: 'Owner', color: '#7C3AED', bgColor: '#F5F3FF' };
      case 'admin':
        return { label: 'Admin', color: '#2563EB', bgColor: '#EFF6FF' };
      case 'manager':
        return { label: 'Manager', color: '#059669', bgColor: '#ECFDF5' };
      default:
        return { label: 'Staff', color: '#D97706', bgColor: '#FFFBEB' };
    }
  };

  return (
    <Screen
      title="Team & Staff Management"
      subtitle="Invite managers & staff with multi-user permissions (like Grexa)."
      onRefresh={teamRes.refresh}
    >
      {/* ── Summary Counts Row ── */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{users.length}</Text>
          <Text style={styles.metricLabel}>Total Team</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#2563EB' }]}>
            {users.filter((u) => u.role === 'admin' || u.role === 'owner').length}
          </Text>
          <Text style={styles.metricLabel}>Admins</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#059669' }]}>
            {users.filter((u) => u.role === 'manager').length}
          </Text>
          <Text style={styles.metricLabel}>Managers</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#D97706' }]}>
            {users.filter((u) => u.role !== 'admin' && u.role !== 'owner' && u.role !== 'manager').length}
          </Text>
          <Text style={styles.metricLabel}>Staff</Text>
        </View>
      </View>

      {/* ── Role Permissions Explainer Card ── */}
      <Card style={{ gap: 10, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialIcons name="security" size={18} color="#2563EB" />
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
            Multi-User Role Levels
          </Text>
        </View>

        <View style={{ gap: 6 }}>
          {ROLE_DEFINITIONS.map((r) => (
            <View key={r.key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: r.bgColor,
                  marginTop: 2,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: r.color }}>{r.label}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 11.5, color: '#475569', lineHeight: 17 }}>
                {r.desc}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ── Invite Button ── */}
      {isOwnerOrAdmin && (
        <Pressable
          onPress={handleOpenInvite}
          style={({ pressed }) => [
            styles.invitePrimaryBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.invitePrimaryBtnText}>Invite Team Member</Text>
        </Pressable>
      )}

      {/* ── Team Members Roster ── */}
      <View style={{ gap: 10, marginTop: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginLeft: 4 }}>
          Members Roster ({users.length})
        </Text>

        {teamRes.loading && users.length === 0 ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.muted }}>Loading roster...</Text>
          </View>
        ) : (
          users.map((member) => {
            const roleBadge = getRoleBadge(member.role);
            const isSelf = member.id === teamRes.data?.currentUserId;
            const isOwner = member.role.toLowerCase() === 'owner';

            return (
              <Card key={member.id} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Avatar name={member.name || member.email} size={42} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                          {member.name || member.email.split('@')[0]}
                        </Text>
                        {isSelf && (
                          <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>YOU</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                        {member.email}
                      </Text>
                      {member.phone && (
                        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                          📱 {member.phone}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Role Badge */}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: roleBadge.bgColor,
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: roleBadge.color }}>
                      {roleBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Actions Row (Owner/Admin only, cannot manage self or workspace owner) */}
                {isOwnerOrAdmin && !isSelf && !isOwner && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      borderTopWidth: 1,
                      borderTopColor: '#F1F5F9',
                      paddingTop: 10,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        setEditingMember(member);
                        setEditRole(member.role);
                      }}
                      style={styles.actionPill}
                    >
                      <MaterialIcons name="edit" size={14} color="#334155" />
                      <Text style={styles.actionPillText}>Change Role</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const msg = `Hello ${member.name || ''}, your login to ${businessName} BGOS:\nPortal: https://bgos.fieseros.com/login\nEmail: ${member.email}`;
                        handleShareWhatsApp(msg, member.phone);
                      }}
                      style={[styles.actionPill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                    >
                      <MaterialIcons name="chat" size={14} color="#16A34A" />
                      <Text style={[styles.actionPillText, { color: '#16A34A' }]}>WhatsApp Invite</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleRemoveMember(member)}
                      style={[styles.actionPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                    >
                      <MaterialIcons name="person-remove" size={14} color="#DC2626" />
                      <Text style={[styles.actionPillText, { color: '#DC2626' }]}>Remove</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </View>

      {/* ── Invite Member Modal ── */}
      <Modal visible={inviteModalOpen} transparent animationType="fade" onRequestClose={() => setInviteModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="group-add" size={22} color="#2563EB" />
                <Text style={styles.modalTitle}>Invite Team Member</Text>
              </View>
              <Pressable hitSlop={12} onPress={() => setInviteModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 14 }}>
              {/* Instant Sign-in Banner */}
              <View
                style={{
                  backgroundColor: '#F0FDF4',
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: '#BBF7D0',
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="bolt" size={20} color="#16A34A" />
                <Text style={{ fontSize: 11.5, color: '#15803D', flex: 1, lineHeight: 16, fontWeight: '600' }}>
                  Instant Sign-in: Enter your staff’s mobile number. They can log in immediately using SMS OTP on the BGOS app!
                </Text>
              </View>

              <View>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  value={inviteName}
                  onChangeText={setInviteName}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
                <TextInput
                  value={invitePhone}
                  onChangeText={setInvitePhone}
                  placeholder="e.g. +91 98765 43210 or 9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={styles.textInput}
                />
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                  Staff will use this number to log in via SMS OTP without needing a password.
                </Text>
              </View>

              <View>
                <Text style={styles.inputLabel}>Email Address (Optional)</Text>
                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="e.g. ramesh@gmail.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                />
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
                  Optional. If entered, an invitation email with access links will also be sent.
                </Text>
              </View>

              <View>
                <Text style={styles.inputLabel}>Select Access Role *</Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {ROLE_DEFINITIONS.map((r) => {
                    const isSelected = inviteRole === r.key;
                    return (
                      <Pressable
                        key={r.key}
                        onPress={() => setInviteRole(r.key as any)}
                        style={[
                          styles.roleOptionCard,
                          isSelected && { borderColor: r.color, backgroundColor: r.bgColor },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialIcons name={r.icon as any} size={18} color={r.color} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                              {r.label}
                            </Text>
                          </View>
                          <MaterialIcons
                            name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                            size={18}
                            color={isSelected ? r.color : '#CBD5E1'}
                          />
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 16 }}>
                          {r.desc}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <Pressable
                onPress={() => setInviteModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: '#F1F5F9' }]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSendInvite}
                disabled={inviting}
                style={[styles.modalBtn, { backgroundColor: '#2563EB', flex: 2 }]}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="person-add" size={16} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Add Team Member</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Invite Result / Share Dialog ── */}
      <Modal visible={Boolean(invitedResult)} transparent animationType="fade" onRequestClose={() => setInvitedResult(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="check-circle" size={32} color="#16A34A" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                Team Member Added!
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>
                {invitedResult?.user.name} ({invitedResult?.user.email}) is now enrolled. Share their temporary credentials below:
              </Text>
            </View>

            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Email:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{invitedResult?.user.email}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Temp Password:</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', fontFamily: 'monospace', color: '#2563EB' }}>
                  {invitedResult?.tempPassword}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Role:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>
                  {invitedResult?.user.role}
                </Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 14 }}>
              <Pressable
                onPress={() => {
                  if (invitedResult) {
                    handleShareWhatsApp(invitedResult.whatsappShareText, invitedResult.user.phone);
                  }
                }}
                style={{
                  backgroundColor: '#25D366',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <MaterialIcons name="chat" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                  Share Login on WhatsApp
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (invitedResult) {
                    void handleCopyCredentials(invitedResult.whatsappShareText);
                  }
                }}
                style={{
                  backgroundColor: '#F1F5F9',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  paddingVertical: 11,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <MaterialIcons name="content-copy" size={16} color="#334155" />
                <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>
                  Copy Credentials
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setInvitedResult(null)}
                style={{ paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Role Modal ── */}
      <Modal visible={Boolean(editingMember)} transparent animationType="fade" onRequestClose={() => setEditingMember(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Member Role</Text>
              <Pressable hitSlop={12} onPress={() => setEditingMember(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginVertical: 8 }}>
              Update permissions for <Text style={{ fontWeight: '700', color: '#0F172A' }}>{editingMember?.name || editingMember?.email}</Text>:
            </Text>

            <View style={{ gap: 8, marginVertical: 10 }}>
              {ROLE_DEFINITIONS.map((r) => {
                const isSelected = editRole === r.key;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => setEditRole(r.key)}
                    style={[
                      styles.roleOptionCard,
                      isSelected && { borderColor: r.color, backgroundColor: r.bgColor },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{r.label}</Text>
                      <MaterialIcons
                        name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={18}
                        color={isSelected ? r.color : '#CBD5E1'}
                      />
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{r.desc}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10 }}>
              <Pressable
                onPress={() => setEditingMember(null)}
                style={[styles.modalBtn, { backgroundColor: '#F1F5F9' }]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveRole}
                disabled={savingEdit}
                style={[styles.modalBtn, { backgroundColor: '#2563EB', flex: 2 }]}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Save Role</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  invitePrimaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  invitePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  roleOptionCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
});
