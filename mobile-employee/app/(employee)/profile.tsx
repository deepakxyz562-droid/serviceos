/**
 * Profile (Employee) — full profile screen with real edit flows.
 *
 * Mirrors the PWA employee portal's "profile" view:
 *  - User card: avatar (initials fallback), name, email, phone, role, tenant.
 *  - Edit Profile → Modal (name, phone, location) → PUT /api/employee/profile.
 *  - Change Password → Modal (current + new + confirm) → POST /api/employee/change-password.
 *  - Emergency Contact → Modal (name + phone) → PUT /api/employee/profile.
 *  - Push Notifications toggle → calls registerForPushNotifications().
 *  - Dark Mode toggle → persists choice via SecureStore/localStorage.
 *  - Menu items navigate to REAL screens (no "coming soon" alerts):
 *      Schedule, Inbox, Notifications, Performance, Inventory,
 *      Help & Support (browser), Privacy Policy (browser), Terms of Service (browser).
 *  - Logout (destructive) → useAuthStore().logout().
 *
 * APIs:
 *   GET  /api/employee/profile                  → EmployeeProfile
 *   PUT  /api/employee/profile                  → update name, phone, location, emergencyContact
 *   POST /api/employee/change-password          → { currentPassword, newPassword }
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User as UserIcon,
  Mail,
  Bell,
  CircleHelp,
  FileText,
  Lock,
  LogOut,
  ChevronRight,
  ChartBar,
  X,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  CalendarDays,
  MessageCircle,
  Package,
  Sun,
  Moon,
  Siren,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { COLORS, BRAND, STORAGE_KEYS } from '@/lib/constants';
import { registerForPushNotifications } from '@/lib/notifications';
import { cn } from '@/lib/cn';

const APP_VERSION = '1.0.0';

// ── Inline theme persistence (SecureStore on native, localStorage on web) ──
function getSecureStore() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store');
  } catch {
    return null;
  }
}

async function readTheme(): Promise<'light' | 'dark'> {
  try {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      const v = await SecureStore.getItemAsync(STORAGE_KEYS.THEME);
      return v === 'dark' ? 'dark' : 'light';
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.THEME) === 'dark' ? 'dark' : 'light';
    }
  } catch {
    /* ignore */
  }
  return 'light';
}

async function writeTheme(theme: 'light' | 'dark'): Promise<void> {
  try {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      await SecureStore.setItemAsync(STORAGE_KEYS.THEME, theme);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }
  } catch {
    /* ignore */
  }
}

// ── Employee profile shape returned by GET /api/employee/profile ──
interface EmployeeProfile {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

const getInitials = (name: string | null | undefined, email: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
};

/**
 * Format a user role for display (e.g. "FIELD_TECHNICIAN" → "Field Technician").
 * Defense-in-depth: never throws even if `role` is undefined/null — returns a
 * sane fallback ("Employee"). The auth-store now unwraps the /api/auth/me
 * envelope so `user.role` should always be populated, but this guard means a
 * malformed response can never crash the entire Profile tab.
 */
const formatRole = (role?: string | null): string => {
  if (!role || typeof role !== 'string') return 'Employee';
  return role
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function ProfileScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, logout, updateUser } = useAuthStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [darkMode, setDarkMode] = useState<'light' | 'dark'>('light');

  // Fetch the full employee profile (with emergency contact + location).
  const profileQuery = useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: async () => {
      const res = await api.get<EmployeeProfile | { data: EmployeeProfile }>(
        '/api/employee/profile'
      );
      if (res && typeof res === 'object' && 'data' in res) return res.data;
      return res as EmployeeProfile;
    },
    staleTime: 60 * 1000,
  });

  // Load persisted theme + push state on mount.
  useEffect(() => {
    (async () => {
      const theme = await readTheme();
      setDarkMode(theme);
      try {
        const token = await registerForPushNotifications();
        setPushEnabled(!!token);
      } catch {
        setPushEnabled(false);
      }
    })().catch(() => {
      /* swallow */
    });
  }, []);

  const handleToggleDarkMode = async (value: boolean) => {
    const next = value ? 'dark' : 'light';
    setDarkMode(next);
    await writeTheme(next);
    toast.show(
      next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled',
      'info'
    );
  };

  const handleTogglePush = async (value: boolean) => {
    if (value) {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          setPushEnabled(true);
          toast.show('Push notifications enabled', 'success');
        } else {
          setPushEnabled(false);
          toast.show(
            'Permission denied — enable notifications in Settings.',
            'warning'
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Please try again.';
        toast.show(`Couldn't enable push: ${msg}`, 'error');
        setPushEnabled(false);
      }
    } else {
      // Note: we cannot programmatically revoke OS-level permission, but we
      // surface a clear message and let the user manage it in Settings.
      setPushEnabled(false);
      toast.show(
        'Disable notifications from Settings → Notifications.',
        'info'
      );
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Please try again.';
            toast.show(`Sign out failed: ${msg}`, 'error');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const openExternal = async (url: string, fallbackTitle: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      /* fall through to alert */
    }
    Alert.alert(fallbackTitle, url);
  };

  const profile = profileQuery.data;
  const displayName =
    profile?.name ?? user?.name ?? 'Employee';
  const displayEmail = profile?.email ?? user?.email ?? '';
  const displayPhone = profile?.phone ?? user?.phone ?? null;
  const location = profile?.location ?? null;
  const emergencyName = profile?.emergencyContactName ?? null;
  const emergencyPhone = profile?.emergencyContactPhone ?? null;

  if (!user) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-base text-muted-foreground">
            You are not signed in.
          </Text>
          <View className="mt-4 w-full max-w-xs">
            <Button onPress={() => router.replace('/(auth)/login')} fullWidth>
              Go to Login
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-3 mt-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">My Account</Text>
          <Pressable
            onPress={() => profileQuery.refetch()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Refresh profile"
          >
            <Text className="text-xs font-semibold text-primary-700">Refresh</Text>
          </Pressable>
        </View>

        {profileQuery.isLoading && !profile ? (
          <View className="mb-4">
            <SkeletonList count={1} />
          </View>
        ) : null}

        {/* Profile header */}
        <Card className="mb-4">
          <View className="flex-row items-center">
            <View
              className="h-16 w-16 items-center justify-center rounded-full bg-primary-500"
              accessibilityRole="image"
              accessibilityLabel={`${displayName} avatar`}
            >
              <Text className="text-2xl font-bold text-white">
                {getInitials(displayName, displayEmail)}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-bold text-foreground">
                {displayName}
              </Text>
              {displayEmail ? (
                <View className="mt-1 flex-row items-center">
                  <Mail size={12} color={COLORS.mutedForeground} />
                  <Text
                    className="ml-1 text-sm text-muted-foreground"
                    numberOfLines={1}
                  >
                    {displayEmail}
                  </Text>
                </View>
              ) : null}
              {displayPhone ? (
                <View className="mt-1 flex-row items-center">
                  <Phone size={12} color={COLORS.mutedForeground} />
                  <Text className="ml-1 text-sm text-muted-foreground">
                    {displayPhone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <Badge variant="primary">{formatRole(user.role)}</Badge>
            {user.tenant?.name ? (
              <Badge variant="default">{user.tenant.name}</Badge>
            ) : null}
            {location ? (
              <Badge variant="info">
                <View className="flex-row items-center">
                  <MapPin size={10} color="#1D4ED8" />
                  <Text className="ml-1 text-xs font-semibold">{location}</Text>
                </View>
              </Badge>
            ) : null}
          </View>

          <View className="mt-4">
            <Button
              variant="outline"
              onPress={() => setShowEditModal(true)}
              fullWidth
            >
              <View className="flex-row items-center justify-center">
                <UserIcon size={16} color={COLORS.primary} />
                <Text className="ml-2 font-semibold text-primary-700">
                  Edit Profile
                </Text>
              </View>
            </Button>
          </View>
        </Card>

        {/* Emergency contact card */}
        <Card className="mb-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Siren size={18} color={COLORS.destructive} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                Emergency Contact
              </Text>
              {emergencyName || emergencyPhone ? (
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {emergencyName || 'Unnamed'}{emergencyPhone ? ` · ${emergencyPhone}` : ''}
                </Text>
              ) : (
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Not set — add one for safety.
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setShowEmergencyModal(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit emergency contact"
            >
              <Text className="text-xs font-semibold text-primary-700">Edit</Text>
            </Pressable>
          </View>
        </Card>

        {/* Preferences */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Preferences
        </Text>
        <Card padded={false} className="mb-4 overflow-hidden">
          {/* Push notifications */}
          <View className="flex-row items-center px-4 py-3.5">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <Bell size={18} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground">
                Push Notifications
              </Text>
              <Text className="text-xs text-muted-foreground">
                {pushEnabled === null
                  ? 'Checking status…'
                  : pushEnabled
                    ? 'Enabled'
                    : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={pushEnabled === true}
              onValueChange={handleTogglePush}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ height: 1, backgroundColor: COLORS.border, marginLeft: 60 }} />
          {/* Dark mode */}
          <View className="flex-row items-center px-4 py-3.5">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              {darkMode === 'dark' ? (
                <Moon size={18} color={COLORS.accent} />
              ) : (
                <Sun size={18} color={COLORS.accent} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground">
                Dark Mode
              </Text>
              <Text className="text-xs text-muted-foreground">
                {darkMode === 'dark' ? 'On' : 'Off'} — saved for next launch
              </Text>
            </View>
            <Switch
              value={darkMode === 'dark'}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* Quick links */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Links
        </Text>
        <Card padded={false} className="mb-4 overflow-hidden">
          <MenuItem
            icon={<CalendarDays size={18} color={COLORS.primary} />}
            label="My Schedule"
            onPress={() => router.push('/(employee)/schedule')}
          />
          <Divider />
          <MenuItem
            icon={<MessageCircle size={18} color={COLORS.primary} />}
            label="Inbox"
            onPress={() => router.push('/(employee)/inbox')}
          />
          <Divider />
          <MenuItem
            icon={<Bell size={18} color={COLORS.primary} />}
            label="Notifications"
            onPress={() => router.push('/(employee)/notifications')}
          />
          <Divider />
          <MenuItem
            icon={<ChartBar size={18} color={COLORS.primary} />}
            label="My Performance"
            onPress={() => router.push('/(employee)/performance')}
          />
          <Divider />
          <MenuItem
            icon={<Package size={18} color={COLORS.primary} />}
            label="Inventory"
            onPress={() => router.push('/(employee)/inventory')}
          />
        </Card>

        {/* Account */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Account
        </Text>
        <Card padded={false} className="mb-4 overflow-hidden">
          <MenuItem
            icon={<Lock size={18} color={COLORS.primary} />}
            label="Change Password"
            onPress={() => setShowPasswordModal(true)}
          />
          <Divider />
          <MenuItem
            icon={<CircleHelp size={18} color={COLORS.primary} />}
            label="Help & Support"
            onPress={() =>
              openExternal(
                `https://${BRAND.domain}/contact-us`,
                'Help & Support'
              )
            }
          />
        </Card>

        {/* Legal */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Legal
        </Text>
        <Card padded={false} className="mb-4 overflow-hidden">
          <MenuItem
            icon={<FileText size={18} color={COLORS.mutedForeground} />}
            label="Privacy Policy"
            onPress={() =>
              openExternal(
                `https://${BRAND.domain}/privacy-policy`,
                'Privacy Policy'
              )
            }
          />
          <Divider />
          <MenuItem
            icon={<FileText size={18} color={COLORS.mutedForeground} />}
            label="Terms of Service"
            onPress={() =>
              openExternal(
                `https://${BRAND.domain}/terms-of-service`,
                'Terms of Service'
              )
            }
          />
        </Card>

        {/* Sign out */}
        <Button
          variant="destructive"
          onPress={handleLogout}
          loading={isLoggingOut}
          fullWidth
        >
          <View className="flex-row items-center justify-center">
            <LogOut size={16} color="#fff" />
            <Text className="ml-2 font-semibold text-white">Sign Out</Text>
          </View>
        </Button>

        {/* Version */}
        <Text className="mt-6 text-center text-xs text-muted-foreground">
          {BRAND.name} v{APP_VERSION}
        </Text>
        <Text className="mt-1 text-center text-[10px] text-muted-foreground">
          {BRAND.tagline}
        </Text>
      </ScrollView>

      {/* Edit Profile modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialName={displayName}
        initialPhone={displayPhone ?? ''}
        initialLocation={location ?? ''}
        onSaved={(patch) => {
          updateUser({
            name: patch.name,
            phone: patch.phone,
          });
          queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });
        }}
      />

      {/* Change Password modal */}
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        email={displayEmail}
      />

      {/* Emergency contact modal */}
      <EmergencyContactModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        initialName={emergencyName ?? ''}
        initialPhone={emergencyPhone ?? ''}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });
        }}
      />
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 active:bg-muted"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
        {icon}
      </View>
      <Text className="flex-1 text-base font-medium text-foreground">{label}</Text>
      <ChevronRight size={18} color={COLORS.mutedForeground} />
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: COLORS.border, marginLeft: 60 }} />;
}

function EditProfileModal({
  visible,
  onClose,
  initialName,
  initialPhone,
  initialLocation,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialPhone: string;
  initialLocation: string;
  onSaved: (patch: { name: string; phone: string; location: string }) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [locationVal, setLocationVal] = useState(initialLocation);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields whenever the modal opens.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPhone(initialPhone);
      setLocationVal(initialLocation);
      setError(null);
    }
  }, [visible, initialName, initialPhone, initialLocation]);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/api/employee/profile', {
        name: name.trim(),
        phone: phone.trim() || null,
        location: locationVal.trim() || null,
      });
      toast.show('Profile updated', 'success');
      onSaved({ name: name.trim(), phone: phone.trim(), location: locationVal.trim() });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <View className="px-5 pb-4 pt-2">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Edit Profile</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={COLORS.mutedForeground} />
          </Pressable>
        </View>

        <Input
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 000 0000"
          keyboardType="phone-pad"
        />
        <Input
          label="Location"
          value={locationVal}
          onChangeText={setLocationVal}
          placeholder="City, State"
        />

        {error ? (
          <View className="mb-3 rounded-lg bg-red-50 px-3 py-2">
            <Text className="text-sm text-destructive">{error}</Text>
          </View>
        ) : null}

        <View className="mt-2 flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" onPress={onClose} disabled={isSaving}>
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button onPress={handleSubmit} loading={isSaving}>
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ChangePasswordModal({
  visible,
  onClose,
  email,
}: {
  visible: boolean;
  onClose: () => void;
  email: string;
}) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (visible) reset();
     
  }, [visible]);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/api/employee/change-password', {
        currentPassword,
        newPassword,
      });
      toast.show('Password changed successfully', 'success');
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={handleClose}>
      <View className="px-5 pb-4 pt-2">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Change Password</Text>
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={COLORS.mutedForeground} />
          </Pressable>
        </View>

        <Text className="mb-3 text-sm text-muted-foreground">
          Updating password for {email}
        </Text>

        <View className="relative">
          <Input
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => setShowCurrent((v) => !v)}
            style={{ position: 'absolute', right: 12, top: 38 }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showCurrent ? 'Hide password' : 'Show password'}
          >
            {showCurrent ? (
              <EyeOff size={18} color={COLORS.mutedForeground} />
            ) : (
              <Eye size={18} color={COLORS.mutedForeground} />
            )}
          </Pressable>
        </View>

        <View className="relative">
          <Input
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            secureTextEntry={!showNew}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => setShowNew((v) => !v)}
            style={{ position: 'absolute', right: 12, top: 38 }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showNew ? 'Hide password' : 'Show password'}
          >
            {showNew ? (
              <EyeOff size={18} color={COLORS.mutedForeground} />
            ) : (
              <Eye size={18} color={COLORS.mutedForeground} />
            )}
          </Pressable>
        </View>

        <Input
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? (
          <View className="mb-3 rounded-lg bg-red-50 px-3 py-2">
            <Text className="text-sm text-destructive">{error}</Text>
          </View>
        ) : null}

        <View className="mt-2 flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" onPress={handleClose} disabled={isSaving}>
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button onPress={handleSubmit} loading={isSaving}>
              Update
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EmergencyContactModal({
  visible,
  onClose,
  initialName,
  initialPhone,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialPhone: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPhone(initialPhone);
      setError(null);
    }
  }, [visible, initialName, initialPhone]);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Contact name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Contact phone is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/api/employee/profile', {
        emergencyContactName: name.trim(),
        emergencyContactPhone: phone.trim(),
      });
      toast.show('Emergency contact saved', 'success');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <View className="px-5 pb-4 pt-2">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">
            Emergency Contact
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={COLORS.mutedForeground} />
          </Pressable>
        </View>

        <Text className="mb-3 text-sm text-muted-foreground">
          This contact will be reached in case of an emergency on the job.
        </Text>

        <Input
          label="Contact Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Jane Doe"
        />
        <Input
          label="Contact Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 000 0000"
          keyboardType="phone-pad"
        />

        {error ? (
          <View className="mb-3 rounded-lg bg-red-50 px-3 py-2">
            <Text className="text-sm text-destructive">{error}</Text>
          </View>
        ) : null}

        <View className="mt-2 flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" onPress={onClose} disabled={isSaving}>
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button onPress={handleSubmit} loading={isSaving}>
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
