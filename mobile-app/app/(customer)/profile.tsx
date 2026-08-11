/**
 * Customer Profile Screen
 *
 * PWA-matching customer profile:
 *   - User card (avatar initials, name, email, phone, company badge)
 *   - Edit Profile (Modal → PUT /api/customers/[id])
 *   - Change Password (Modal → POST /api/auth/customer/change-password OR browser link)
 *   - Menu: My Bookings, My Orders, Quotes, Payment Methods, Messages, My Reviews,
 *           Help & Support, Privacy Policy, Terms of Service — ALL navigate to real screens
 *   - Sign Out
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  CreditCard,
  Bell,
  HelpCircle,
  Shield,
  FileText,
  ChevronRight,
  Mail,
  Phone,
  ShoppingBag,
  MessageSquare,
  Star,
  FileSignature,
  Edit3,
  Lock,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { BRAND, COLORS } from '@/lib/constants';

const APP_VERSION = '1.0.0';

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { show } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAddress, setEditAddress] = useState('');
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  // Fetch customer record for address + customerId
  const { data: customer } = useQuery({
    queryKey: ['customer', user?.customerId],
    queryFn: async () => {
      if (!user?.customerId) return null;
      const res = await api.get<{ id: string; name: string; phone?: string; address?: string }>(
        `/api/customers/${user.customerId}`
      );
      return res;
    },
    enabled: !!user?.customerId,
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!user?.customerId) throw new Error('Customer profile not found');
      return api.put(`/api/customers/${user.customerId}`, {
        name: editName,
        phone: editPhone,
        address: editAddress,
      });
    },
    onSuccess: () => {
      updateUser({ name: editName, phone: editPhone });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      setEditOpen(false);
      show('Profile updated', 'success');
    },
    onError: (err: unknown) => {
      show(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    },
  });

  const pwMutation = useMutation({
    mutationFn: async () => {
      // The PWA customer portal uses a password-change flow; call the backend endpoint.
      return api.post('/api/auth/customer/change-password', {
        currentPassword: curPw,
        newPassword: newPw,
      });
    },
    onSuccess: () => {
      setPwOpen(false);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      show('Password changed successfully', 'success');
    },
    onError: (err: unknown) => {
      show(err instanceof Error ? err.message : 'Failed to change password', 'error');
    },
  });

  const openEdit = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || customer?.phone || '');
    setEditAddress(customer?.address || '');
    setEditOpen(true);
  };

  const handleSavePw = () => {
    if (!curPw || !newPw || !confirmPw) {
      show('Please fill all password fields', 'warning');
      return;
    }
    if (newPw !== confirmPw) {
      show('New passwords do not match', 'error');
      return;
    }
    if (newPw.length < 6) {
      show('Password must be at least 6 characters', 'warning');
      return;
    }
    pwMutation.mutate();
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {
            // ignore
          }
        },
      },
    ]);
  };

  const menuItems: {
    key: string;
    label: string;
    icon: typeof CalendarCheck;
    onPress: () => void;
  }[] = [
    {
      key: 'bookings',
      label: 'My Bookings',
      icon: CalendarCheck,
      onPress: () => router.push('/(customer)/bookings'),
    },
    {
      key: 'orders',
      label: 'My Orders',
      icon: ShoppingBag,
      onPress: () => router.push('/(customer)/orders'),
    },
    {
      key: 'quotes',
      label: 'Quotes',
      icon: FileSignature,
      onPress: () => router.push('/(customer)/quotes'),
    },
    {
      key: 'payments',
      label: 'Payment Methods',
      icon: CreditCard,
      onPress: () => router.push('/(customer)/payments'),
    },
    {
      key: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      onPress: () => router.push('/(customer)/messages'),
    },
    {
      key: 'reviews',
      label: 'My Reviews',
      icon: Star,
      onPress: () => router.push('/(customer)/reviews'),
    },
    {
      key: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      onPress: () => Linking.openURL('https://fieseros.com/contact-us').catch(() => {}),
    },
    {
      key: 'privacy',
      label: 'Privacy Policy',
      icon: Shield,
      onPress: () => Linking.openURL('https://fieseros.com/privacy-policy').catch(() => {}),
    },
    {
      key: 'terms',
      label: 'Terms of Service',
      icon: FileText,
      onPress: () => Linking.openURL('https://fieseros.com/terms-of-service').catch(() => {}),
    },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-3 mt-2 text-xl font-bold text-foreground">My Account</Text>

        {/* User card */}
        <Card>
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-500">
              <Text className="text-2xl font-bold text-white">{initials}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-bold text-foreground">
                {user?.name ?? 'Fieseros Customer'}
              </Text>
              {user?.email ? (
                <View className="mt-1 flex-row items-center">
                  <Mail size={12} color={COLORS.mutedForeground} />
                  <Text className="ml-1 text-sm text-muted-foreground" numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              ) : null}
              {user?.phone ? (
                <View className="mt-1 flex-row items-center">
                  <Phone size={12} color={COLORS.mutedForeground} />
                  <Text className="ml-1 text-sm text-muted-foreground">{user.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="mt-3 flex-row">
            <Badge variant="primary">Customer</Badge>
            {user?.tenant?.name ? (
              <View className="ml-2">
                <Badge variant="default">{user.tenant.name}</Badge>
              </View>
            ) : null}
          </View>

          <View className="mt-3 flex-row gap-2">
            <Button size="sm" variant="outline" onPress={openEdit}>
              <Edit3 size={14} color={COLORS.primary} />  Edit Profile
            </Button>
            <Button size="sm" variant="outline" onPress={() => setPwOpen(true)}>
              <Lock size={14} color={COLORS.primary} />  Password
            </Button>
          </View>
        </Card>

        {/* Menu */}
        <Card padded={false} className="mt-4">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                className={`flex-row items-center px-4 py-4 active:bg-muted ${
                  idx < menuItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                  <Icon size={18} color={COLORS.primary} />
                </View>
                <Text className="ml-3 flex-1 text-base font-medium text-foreground">
                  {item.label}
                </Text>
                <ChevronRight size={18} color={COLORS.mutedForeground} />
              </Pressable>
            );
          })}
        </Card>

        {/* Sign out */}
        <View className="mt-6">
          <Button variant="destructive" onPress={handleSignOut} fullWidth>
            <LogOut size={16} color="#fff" />  Sign Out
          </Button>
        </View>

        {/* Version */}
        <View className="mt-6 items-center">
          <Text className="text-xs text-muted-foreground">
            {BRAND.name} · Version {APP_VERSION}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">{BRAND.tagline}</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editOpen} onClose={() => setEditOpen(false)}>
        <View className="px-5 pb-4">
          <Text className="mb-4 text-lg font-bold text-foreground">Edit Profile</Text>
          <Input label="Full Name" value={editName} onChangeText={setEditName} placeholder="Your name" />
          <Input
            label="Phone"
            value={editPhone}
            onChangeText={setEditPhone}
            placeholder="+1 555 000 0000"
            keyboardType="phone-pad"
          />
          <Input
            label="Address"
            value={editAddress}
            onChangeText={setEditAddress}
            placeholder="123 Main St, City"
            multiline
          />
          <View className="mt-2 flex-row gap-2">
            <Button variant="ghost" onPress={() => setEditOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onPress={() => editMutation.mutate()}
              loading={editMutation.isPending}
              className="flex-1"
            >
              Save
            </Button>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={pwOpen} onClose={() => setPwOpen(false)}>
        <View className="px-5 pb-4">
          <Text className="mb-4 text-lg font-bold text-foreground">Change Password</Text>
          <Input
            label="Current Password"
            value={curPw}
            onChangeText={setCurPw}
            placeholder="Enter current password"
            secureTextEntry
          />
          <Input
            label="New Password"
            value={newPw}
            onChangeText={setNewPw}
            placeholder="At least 6 characters"
            secureTextEntry
          />
          <Input
            label="Confirm New Password"
            value={confirmPw}
            onChangeText={setConfirmPw}
            placeholder="Re-enter new password"
            secureTextEntry
          />
          <View className="mt-2 flex-row gap-2">
            <Button variant="ghost" onPress={() => setPwOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onPress={handleSavePw} loading={pwMutation.isPending} className="flex-1">
              Update
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
