/**
 * Login — Unified authentication screen.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  CUSTOMER PORTAL                                                     │
 * │  ─────────────                                                       │
 * │  Auth method toggle (2 tabs only):                                   │
 * │    • OTP       — Email → send code → verify                          │
 * │      (if 409 multi-company → CompanyPickerModal → re-verify)         │
 * │    • Password  — email/phone + password → /api/auth/customer/login   │
 * │      (if 409 multi-company → CompanyPickerModal)                     │
 * │                                                                      │
 * │  Deep-link auto-login (no visible tab):                              │
 * │    • Magic link — fieseros://?mgl=TOKEN → auto-exchange              │
 * │    • Activate   — fieseros://?activate=TOKEN → show activation form  │
 * │                                                                      │
 * │  EMPLOYEE PORTAL                                                     │
 * │  ─────────────                                                       │
 * │  Direct login — no company selection required.                       │
 * │    • Enter work email + password                                      │
 * │    • POST /api/auth/login { email, password }                        │
 * │    • Backend resolves tenant from User.tenantId automatically.        │
 * │    • Deep-link: fieseros://company/[slug]/employee (auto-fills       │
 * │      company context, but NOT required for login)                     │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * On success, an in-screen useEffect watcher on { isAuthenticated, role }
 * redirects to the appropriate dashboard. (The root index.tsx redirect only
 * fires on app boot, not after an in-screen login, so we handle it here.)
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoLinking from 'expo-linking';
import { ShieldCheck, Building2, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { BRAND, COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { CompanyPickerModal } from '@/components/auth/CompanyPickerModal';
import type { Company } from '@/types';

type Mode = 'customer' | 'staff';
type CustomerMethod = 'otp' | 'password' | 'activate';

export default function LoginScreen() {
  const {
    loginStaff,
    requestCustomerEmailOtp,
    loginCustomerEmailOtp,
    loginCustomerPassword,
    exchangeMagicLink,
    activateCustomer,
    resolveCompany,
    setLastCompany,
    loadLastCompany,
    clearMultiCompanyConflict,
    multiCompanyConflict,
    lastCompany,
    isLoading,
    error,
    clearError,
    isAuthenticated,
    role,
  } = useAuthStore();
  const { show } = useToast();
  const router = useRouter();

  // ── Auth-state redirect watcher ──────────────────────────────────
  // Centralized redirect for ALL login paths (staff, customer OTP,
  // customer password, magic link, activate). Whenever the auth store
  // flips to authenticated with a known role, navigate to the matching
  // dashboard. Without this, the login screen stays mounted after a
  // successful login because the root index.tsx redirect only fires
  // on app boot.
  useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(role === 'customer' ? '/(customer)/marketplace' : '/(employee)/today');
    }
  }, [isAuthenticated, role, router]);

  const [mode, setMode] = useState<Mode>('customer');
  const [method, setMethod] = useState<CustomerMethod>('otp');

  // ── Customer state ────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState(''); // email OR phone
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [activationToken, setActivationToken] = useState('');
  const [activationPassword, setActivationPassword] = useState('');

  // Email address for the OTP login method. Kept separate from the
  // password method's `identifier` (which can be email or phone) so the
  // two methods don't tangle each other's input.
  const [emailForOtp, setEmailForOtp] = useState('');

  // ── Staff state ───────────────────────────────────────────────────
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // ── Bootstrap: preload last-used company on mount ─────────────────
  useEffect(() => {
    loadLastCompany()
      .then((company) => {
        if (company) setSelectedCompany(company);
      })
      .catch(() => {});
  }, [loadLastCompany]);

  // ── Deep-link handling ────────────────────────────────────────────
  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url) return;
      try {
        const parsed = ExpoLinking.parse(url);
        const qp = parsed.queryParams ?? {};

        // fieseros://?mgl=TOKEN — customer magic link
        const mgl = typeof qp.mgl === 'string' ? qp.mgl : undefined;
        // fieseros://?activate=TOKEN — customer activation
        const activate = typeof qp.activate === 'string' ? qp.activate : undefined;
        // fieseros://company/[slug]/employee — staff deep-link
        const pathParts = (parsed.path || '').split('/').filter(Boolean);

        if (mgl) {
          setMode('customer');
          exchangeMagicLink(mgl)
            .then(() => show('Signed in via magic link', 'success'))
            .catch((err) => {
              show(err instanceof Error ? err.message : 'Magic link failed', 'error');
            });
          return;
        }

        if (activate) {
          setMode('customer');
          setMethod('activate');
          setActivationToken(activate);
          show('Enter a new password to activate your account', 'info');
          return;
        }

        // Company deep-link: fieseros://company/{slug}/employee
        if (pathParts[0] === 'company' && pathParts[1]) {
          const slug = pathParts[1];
          setMode(pathParts[2] === 'employee' ? 'staff' : 'customer');
          resolveCompany(slug)
            .then((company) => {
              if (company) {
                setSelectedCompany(company);
                show(`Signed in to ${company.name}`, 'info');
              } else {
                show(`Company "${slug}" not found`, 'error');
              }
            })
            .catch(() => show('Failed to resolve company link', 'error'));
        }
      } catch (err) {
        console.warn('[login] Failed to parse deep link:', err);
      }
    },
    [exchangeMagicLink, resolveCompany, show]
  );

  useEffect(() => {
    ExpoLinking.getInitialURL().then(handleDeepLink).catch(() => {});
    const sub = ExpoLinking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  // ── Helpers ───────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setOtpSent(false);
    setOtp('');
    setPassword('');
    setActivationToken('');
    setActivationPassword('');
    setEmailForOtp('');
    clearError();
    clearMultiCompanyConflict();
  }, [clearError, clearMultiCompanyConflict]);

  const handleModeSwitch = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetForm();
  };

  const handleMethodSwitch = (next: CustomerMethod) => {
    if (next === method) return;
    setMethod(next);
    setOtpSent(false);
    setOtp('');
    setPassword('');
    setEmailForOtp('');
    clearError();
    clearMultiCompanyConflict();
  };

  /**
   * Keyboard detection for the dual-purpose "email OR phone" field.
   *
   * Previous logic used `isEmail` (whole string must be a valid email) which
   * created a catch-22: empty field → phone-pad (numbers only) → user can't
   * type `@` → never becomes a valid email → keyboard never switches.
   *
   * New logic: default to the EMAIL keyboard (has letters, `@`, `.`, space),
   * and only switch to phone-pad once the input actually looks like a phone
   * (starts with `+` or a digit and contains only phone characters).
   */
  const looksLikePhone = useMemo(
    () => identifier.trim().length > 0 && /^[+\d][\d\s-]*$/.test(identifier.trim()),
    [identifier]
  );

  // ── Customer: OTP via Email ───────────────────────────────────────
  const handleSendEmailOtp = async () => {
    const email = emailForOtp.trim().toLowerCase();
    if (!email) {
      show('Please enter your email address', 'warning');
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      show('Please enter a valid email address', 'warning');
      return;
    }
    try {
      await requestCustomerEmailOtp(email);
      setOtpSent(true);
      show(`Verification code sent to ${email}`, 'success');
    } catch {
      // error surfaced via store
    }
  };

  const handleVerifyEmailOtp = async (tenantIdOverride?: string | null) => {
    if (!otp.trim()) {
      show('Please enter the verification code', 'warning');
      return;
    }
    const email = emailForOtp.trim().toLowerCase();
    if (!email) {
      show('Please enter your email address', 'warning');
      return;
    }
    try {
      await loginCustomerEmailOtp(email, otp.trim(), tenantIdOverride ?? null);
      show('Signed in', 'success');
    } catch {
      // error surfaced via store; if 409, multiCompanyConflict is set
    }
  };

  // ── Customer: Password login ──────────────────────────────────────
  const handlePasswordLogin = async (tenantIdOverride?: string | null) => {
    if (!identifier.trim() || !password) {
      show('Please enter your email/phone and password', 'warning');
      return;
    }
    try {
      const tenantId = tenantIdOverride !== undefined ? tenantIdOverride : null;
      await loginCustomerPassword(identifier.trim(), password, tenantId);
      show('Signed in', 'success');
    } catch {
      // error surfaced via store; if 409, multiCompanyConflict is set
    }
  };

  // ── Customer: Handle 409 multi-company selection ──────────────────
  const handleMultiCompanySelect = async (tenantId: string, tenantName: string) => {
    show(`Selected: ${tenantName}`, 'info');
    clearMultiCompanyConflict();
    // Re-submit with the chosen tenantId, based on which method triggered the 409
    if (method === 'otp') {
      await handleVerifyEmailOtp(tenantId);
    } else {
      await handlePasswordLogin(tenantId);
    }
  };

  // ── Customer: Activation ──────────────────────────────────────────
  const handleActivate = async () => {
    if (!activationToken.trim() || !activationPassword) {
      show('Token and password are required', 'warning');
      return;
    }
    if (activationPassword.length < 8) {
      show('Password must be at least 8 characters', 'warning');
      return;
    }
    try {
      await activateCustomer(activationToken.trim(), activationPassword);
      show('Account activated', 'success');
    } catch {
      // error surfaced via store
    }
  };

  // ── Staff: Direct login (no company selection required) ──────────
  const handleStaffLogin = async () => {
    if (!staffEmail.trim() || !staffPassword) {
      show('Please enter your email and password', 'warning');
      return;
    }
    try {
      await loginStaff(staffEmail.trim(), staffPassword);
      show('Signed in', 'success');
    } catch {
      // error surfaced via store
    }
  };

  const handleForgotPassword = () => {
    const url = `https://${BRAND.domain}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to open browser', `Visit ${url} in your browser to reset your password.`);
    });
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand header */}
          <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 28 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: COLORS.customerAccent,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>F</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: 'bold', color: COLORS.foreground }}>
              {BRAND.name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.mutedForeground,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {BRAND.tagline}
            </Text>
          </View>

          {/* Customer / Staff toggle */}
          <SegmentedControl<Mode>
            options={[
              { value: 'customer', label: 'Customer' },
              { value: 'staff', label: 'Staff' },
            ]}
            value={mode}
            onChange={handleModeSwitch}
            activeColor={mode === 'customer' ? COLORS.customerAccent : COLORS.primary}
            className="mb-5"
          />

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  CUSTOMER PORTAL                                            */}
          {/* ════════════════════════════════════════════════════════════ */}
          {mode === 'customer' && (
            <>
              {/* Auth method toggle */}
              <SegmentedControl<CustomerMethod>
                options={[
                  { value: 'otp', label: 'OTP' },
                  { value: 'password', label: 'Password' },
                ]}
                value={method}
                onChange={handleMethodSwitch}
                activeColor={COLORS.customerAccent}
                className="mb-5"
              />

              {/* OTP method — Email only */}
              {method === 'otp' && (
                <>
                  <Input
                    label="Email address"
                    value={emailForOtp}
                    onChangeText={setEmailForOtp}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {otpSent && (
                    <Input
                      label="Verification code"
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="Enter 6-digit code"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  )}
                  {otpSent ? (
                    <Button
                      onPress={() => handleVerifyEmailOtp()}
                      loading={isLoading}
                      fullWidth
                      size="lg"
                    >
                      Verify &amp; Sign In
                    </Button>
                  ) : (
                    <Button
                      onPress={handleSendEmailOtp}
                      loading={isLoading}
                      fullWidth
                      size="lg"
                    >
                      Send Email Code
                    </Button>
                  )}
                  {otpSent && (
                    <Pressable
                      onPress={handleSendEmailOtp}
                      style={{ marginTop: 14, alignItems: 'center' }}
                    >
                      <Text
                        style={{
                          color: COLORS.customerAccent,
                          fontSize: 14,
                          fontWeight: '600',
                        }}
                      >
                        Resend code
                      </Text>
                    </Pressable>
                  )}
                </>
              )}

              {/* Password method */}
              {method === 'password' && (
                <>
                  <Input
                    label="Email or phone"
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="you@example.com or +91 98765 43210"
                    keyboardType={looksLikePhone ? 'phone-pad' : 'email-address'}
                    autoCapitalize="none"
                  />
                  <Input
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                  />
                  <Button
                    onPress={() => handlePasswordLogin()}
                    loading={isLoading}
                    fullWidth
                    size="lg"
                  >
                    Sign In
                  </Button>
                  <Pressable
                    onPress={handleForgotPassword}
                    style={{ marginTop: 14, alignItems: 'center' }}
                  >
                    <Text
                      style={{
                        color: COLORS.customerAccent,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      Forgot password?
                    </Text>
                  </Pressable>
                </>
              )}

              {/* Activation method (deep-link only) */}
              {method === 'activate' && (
                <>
                  <View
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <ShieldCheck size={16} color={COLORS.customerAccent} />
                    <Text
                      style={{
                        marginLeft: 8,
                        flex: 1,
                        fontSize: 12,
                        color: COLORS.foreground,
                        lineHeight: 18,
                      }}
                    >
                      Activate your account by setting a password. Use the token from your
                      invitation email.
                    </Text>
                  </View>
                  <Input
                    label="Activation token"
                    value={activationToken}
                    onChangeText={setActivationToken}
                    placeholder="Paste activation token"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Input
                    label="New password"
                    value={activationPassword}
                    onChangeText={setActivationPassword}
                    placeholder="At least 8 characters"
                    secureTextEntry
                  />
                  <Button
                    onPress={handleActivate}
                    loading={isLoading}
                    fullWidth
                    size="lg"
                  >
                    Activate &amp; Sign In
                  </Button>
                </>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  EMPLOYEE PORTAL — Direct login (no company selection)      */}
          {/* ════════════════════════════════════════════════════════════ */}
          {mode === 'staff' && (
            <>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: COLORS.foreground,
                  marginBottom: 6,
                }}
              >
                Staff Login
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.mutedForeground,
                  marginBottom: 12,
                  lineHeight: 18,
                }}
              >
                Enter your work email and password to sign in.
              </Text>
              <Input
                label="Work email"
                value={staffEmail}
                onChangeText={setStaffEmail}
                placeholder="you@business.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                value={staffPassword}
                onChangeText={setStaffPassword}
                placeholder="Enter your password"
                secureTextEntry
              />
              <Button onPress={handleStaffLogin} loading={isLoading} fullWidth size="lg">
                Sign In
              </Button>
              <Pressable
                onPress={handleForgotPassword}
                style={{ marginTop: 14, alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  Forgot password?
                </Text>
              </Pressable>
            </>
          )}

          {/* Error box */}
          {error && (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: '#FEE2E2',
                borderRadius: 10,
                borderLeftWidth: 4,
                borderLeftColor: COLORS.destructive,
              }}
            >
              <Text style={{ color: COLORS.destructive, fontSize: 14, lineHeight: 18 }}>
                {error}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* Footer */}
          <Pressable
            onPress={() => Linking.openURL(`https://${BRAND.domain}`).catch(() => {})}
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12 }}>
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Multi-company conflict picker (409 from customer password login) */}
      <CompanyPickerModal
        visible={!!multiCompanyConflict}
        conflict={multiCompanyConflict}
        onSelect={handleMultiCompanySelect}
        onClose={() => clearMultiCompanyConflict()}
      />
    </SafeAreaView>
  );
}
