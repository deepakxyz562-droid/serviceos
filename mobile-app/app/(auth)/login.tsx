/**
 * Login — Unified authentication screen.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  CUSTOMER PORTAL                                                     │
 * │  ─────────────                                                       │
 * │  Step 1: Enter email OR phone → /api/auth/customer/discover          │
 * │    • 0 companies → "No account found"                                │
 * │    • 1 company → proceed to Step 2 (tenantId auto-remembered)        │
 * │    • 2+ companies → show picker → user selects → proceed             │
 * │                                                                      │
 * │  Step 2: Choose auth method                                          │
 * │    • OTP       — phone → send-otp → verify-otp (WhatsApp OTP)        │
 * │    • Password  — identifier + password → /api/auth/customer/login    │
 * │      (if 409 multi-company → show CompanyPickerModal)                │
 * │    • Magic link — token → /api/auth/customer/exchange-magic-link     │
 * │      (deep-link: fieseros://?mgl=TOKEN)                              │
 * │    • Activate  — activation token + new password                     │
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
import { Sparkles, ShieldCheck, Building2, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { BRAND, COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { CompanyCard, CompanyRow } from '@/components/auth/CompanyCard';
import { CompanyFinder } from '@/components/auth/CompanyFinder';
import { CompanyPickerModal } from '@/components/auth/CompanyPickerModal';
import type { Company, DiscoveredCompany } from '@/types';

type Mode = 'customer' | 'staff';
type CustomerMethod = 'otp' | 'password' | 'magic' | 'activate';
type OtpChannel = 'whatsapp' | 'email';

export default function LoginScreen() {
  const {
    loginStaff,
    requestCustomerOtp,
    loginCustomerOtp,
    requestCustomerEmailOtp,
    loginCustomerEmailOtp,
    loginCustomerPassword,
    exchangeMagicLink,
    activateCustomer,
    discoverCustomerCompanies,
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
  const [magicToken, setMagicToken] = useState('');
  const [activationToken, setActivationToken] = useState('');
  const [activationPassword, setActivationPassword] = useState('');

  // OTP channel sub-toggle (within method === 'otp'):
  // 'whatsapp' uses the identifier field as a phone number;
  // 'email' uses the dedicated emailForOtp field so the two channels
  // don't tangle each other's input.
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('whatsapp');
  const [emailForOtp, setEmailForOtp] = useState('');

  // Customer discovery state
  const [discovering, setDiscovering] = useState(false);
  const [discoveredCompanies, setDiscoveredCompanies] = useState<DiscoveredCompany[] | null>(null);
  const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredCompany | null>(null);

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
          setMethod('magic');
          setMagicToken(mgl);
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
    setMagicToken('');
    setActivationToken('');
    setActivationPassword('');
    setOtpChannel('whatsapp');
    setEmailForOtp('');
    setDiscoveredCompanies(null);
    setSelectedDiscovered(null);
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
    setOtpChannel('whatsapp');
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

  // ── Customer: Discover companies by email or phone ────────────────
  const handleDiscover = async () => {
    if (!identifier.trim()) {
      show('Please enter your email or phone', 'warning');
      return;
    }
    setDiscovering(true);
    clearError();
    try {
      const result = await discoverCustomerCompanies(identifier.trim());
      setDiscoveredCompanies(result.companies);
      if (!result.found || result.companies.length === 0) {
        show('No account found for this email/phone', 'error');
      } else if (result.companies.length === 1) {
        // Auto-select the single company
        setSelectedDiscovered(result.companies[0]);
        show(`Found: ${result.companies[0].tenantName}`, 'success');
      } else {
        show(`${result.companies.length} companies found — pick one`, 'info');
      }
    } catch (err) {
      show(err instanceof Error ? err.message : 'Lookup failed', 'error');
    } finally {
      setDiscovering(false);
    }
  };

  const handlePickDiscovered = (c: DiscoveredCompany) => {
    setSelectedDiscovered(c);
    setIdentifier(c.customerName || identifier);
    show(`Selected: ${c.tenantName}`, 'info');
  };

  // ── Customer: OTP via WhatsApp ────────────────────────────────────
  const handleSendOtp = async () => {
    // OTP requires a phone number (WhatsApp OTP, not email).
    // If the user entered email in the identifier field, we need them to
    // provide a phone for OTP. We use the identifier if it's a phone.
    const phone = identifier.trim();
    if (!phone) {
      show('Please enter your phone number', 'warning');
      return;
    }
    // Basic phone validation — at least 10 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      show('Please enter a valid phone number', 'warning');
      return;
    }
    try {
      await requestCustomerOtp(phone);
      setOtpSent(true);
      show(`Verification code sent to ${phone}`, 'success');
    } catch {
      // error surfaced via store
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      show('Please enter the verification code', 'warning');
      return;
    }
    try {
      await loginCustomerOtp(identifier.trim(), otp.trim());
      show('Signed in', 'success');
    } catch {
      // error surfaced via store
    }
  };

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
      const tenantId =
        tenantIdOverride !== undefined
          ? tenantIdOverride
          : selectedDiscovered?.tenantId || null;
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
    if (method === 'otp' && otpChannel === 'email') {
      await handleVerifyEmailOtp(tenantId);
    } else {
      await handlePasswordLogin(tenantId);
    }
  };

  // ── Customer: Magic link ──────────────────────────────────────────
  const handleExchangeMagic = async () => {
    if (!magicToken.trim()) {
      show('Paste a magic-link token first', 'warning');
      return;
    }
    try {
      await exchangeMagicLink(magicToken.trim());
      show('Signed in via magic link', 'success');
    } catch {
      // error surfaced via store
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
              {/* Step 1: Discover companies by email or phone */}
              {!selectedDiscovered && method !== 'magic' && method !== 'activate' && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: COLORS.foreground,
                      marginBottom: 6,
                    }}
                  >
                    Find your account
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.mutedForeground,
                      marginBottom: 12,
                      lineHeight: 18,
                    }}
                  >
                    Enter the email or phone number your service provider used to invite you. We'll
                    find which companies you're linked to.
                  </Text>
                  <Input
                    label="Email or phone"
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="you@example.com or +91 98765 43210"
                    keyboardType={looksLikePhone ? 'phone-pad' : 'email-address'}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    onPress={handleDiscover}
                    loading={discovering}
                    fullWidth
                    size="lg"
                    variant="secondary"
                  >
                    Find my companies
                  </Button>

                  {/* Discovered companies list */}
                  {discoveredCompanies && discoveredCompanies.length > 1 && (
                    <View style={{ marginTop: 16 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: COLORS.foreground,
                          marginBottom: 8,
                        }}
                      >
                        Select a company ({discoveredCompanies.length} found)
                      </Text>
                      {discoveredCompanies.map((c, idx) => (
                        <View key={`${c.customerId}-${idx}`} style={{ marginBottom: 8 }}>
                          <CompanyRow
                            company={{
                              // Smart fallback: tenantName → workspaceName → generic label.
                              // The discover API returns tenantName=null when the
                              // customer's workspace chain is incomplete; workspaceName
                              // is usually still populated in those cases.
                              name: c.tenantName || c.workspaceName || 'Your service provider',
                              logo: c.logo,
                              industry: c.industry,
                              slug: c.tenantSlug || '',
                              tenantName: c.tenantName,
                              tenantSlug: c.tenantSlug,
                            }}
                            accent={COLORS.customerAccent}
                            onPress={() => handlePickDiscovered(c)}
                          />
                        </View>
                      ))}
                    </View>
                  )}

                  {discoveredCompanies && discoveredCompanies.length === 0 && (
                    <View
                      style={{
                        marginTop: 16,
                        padding: 14,
                        backgroundColor: '#FEF3C7',
                        borderRadius: 10,
                        borderLeftWidth: 4,
                        borderLeftColor: COLORS.warning,
                      }}
                    >
                      <Text style={{ fontSize: 13, color: COLORS.foreground, lineHeight: 18 }}>
                        No portal account found for this email/phone. Please ask your service
                        provider to send you a portal invitation.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Selected company badge (after discovery) */}
              {selectedDiscovered && method !== 'magic' && method !== 'activate' && (
                <View style={{ marginBottom: 16 }}>
                  <CompanyCard
                    company={{
                      id: selectedDiscovered.tenantId || '',
                      // Smart fallback: tenantName → workspaceName → generic label.
                      name: selectedDiscovered.tenantName || selectedDiscovered.workspaceName || 'Your service provider',
                      slug: selectedDiscovered.tenantSlug || '',
                      logo: selectedDiscovered.logo,
                      industry: selectedDiscovered.industry,
                    }}
                    accent={COLORS.customerAccent}
                    onSwitch={() => {
                      setSelectedDiscovered(null);
                      setDiscoveredCompanies(null);
                    }}
                  />
                </View>
              )}

              {/* Step 2: Auth method toggle */}
              <SegmentedControl<CustomerMethod>
                options={[
                  { value: 'otp', label: 'OTP' },
                  { value: 'password', label: 'Password' },
                  { value: 'magic', label: 'Magic Link' },
                  { value: 'activate', label: 'Activate' },
                ]}
                value={method}
                onChange={handleMethodSwitch}
                activeColor={COLORS.customerAccent}
                className="mb-5"
              />

              {/* OTP method */}
              {method === 'otp' && (
                <>
                  {/* Sub-toggle: WhatsApp vs Email channel within the OTP method */}
                  <SegmentedControl<OtpChannel>
                    options={[
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'email', label: 'Email' },
                    ]}
                    value={otpChannel}
                    onChange={(ch) => {
                      setOtpChannel(ch);
                      setOtpSent(false);
                      setOtp('');
                      clearError();
                      clearMultiCompanyConflict();
                    }}
                    activeColor={COLORS.customerAccent}
                    className="mb-4"
                  />

                  {/* WhatsApp channel — phone-based OTP (existing behavior) */}
                  {otpChannel === 'whatsapp' && (
                    <>
                      <Input
                        label="Phone number (WhatsApp)"
                        value={identifier}
                        onChangeText={setIdentifier}
                        placeholder="+91 98765 43210"
                        keyboardType="phone-pad"
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
                          onPress={handleVerifyOtp}
                          loading={isLoading}
                          fullWidth
                          size="lg"
                        >
                          Verify &amp; Sign In
                        </Button>
                      ) : (
                        <Button
                          onPress={handleSendOtp}
                          loading={isLoading}
                          fullWidth
                          size="lg"
                        >
                          Send WhatsApp Code
                        </Button>
                      )}
                      {otpSent && (
                        <Pressable
                          onPress={handleSendOtp}
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

                  {/* Email channel — email-based OTP (new) */}
                  {otpChannel === 'email' && (
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

              {/* Magic link method */}
              {method === 'magic' && (
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
                    <Sparkles size={16} color={COLORS.customerAccent} />
                    <Text
                      style={{
                        marginLeft: 8,
                        flex: 1,
                        fontSize: 12,
                        color: COLORS.foreground,
                        lineHeight: 18,
                      }}
                    >
                      Sign-in links are sent by Fieseros staff via email or SMS. Open the link on
                      this device and we'll sign you in automatically, or paste the token below.
                    </Text>
                  </View>
                  <Input
                    label="Magic link token"
                    value={magicToken}
                    onChangeText={setMagicToken}
                    placeholder="Paste token from your email"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    onPress={handleExchangeMagic}
                    loading={isLoading}
                    fullWidth
                    size="lg"
                  >
                    Sign In with Magic Link
                  </Button>
                </>
              )}

              {/* Activation method */}
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
