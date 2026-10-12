/**
 * Fieseros Customer App — Dedicated Customer Login Screen
 *
 * Authentication methods for homeowners & customers:
 *   1. Continue with Google — OAuth 2.0 round-trip with `app=customer` & `fieseros://auth-callback`
 *   2. Email or Phone OTP   — 6-digit verification code via `/api/auth/customer/send-otp` & `verify-otp`
 *   3. Password             — email/phone + password via `/api/auth/customer/login`
 *   4. Deep-link Magic Link / Account Activation (`fieseros://?mgl=...` / `fieseros://?activate=...`)
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
import { ShieldCheck, Sparkles, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL, API_PATHS, BRAND, COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { CompanyPickerModal } from '@/components/auth/CompanyPickerModal';

type CustomerMethod = 'otp' | 'password' | 'activate';

export default function CustomerLoginScreen() {
  const {
    requestCustomerEmailOtp,
    loginCustomerEmailOtp,
    requestCustomerOtp,
    loginCustomerOtp,
    loginCustomerPassword,
    exchangeMagicLink,
    activateCustomer,
    completeOAuthLogin,
    clearMultiCompanyConflict,
    multiCompanyConflict,
    isLoading,
    error,
    clearError,
    isAuthenticated,
  } = useAuthStore();
  const { show } = useToast();
  const router = useRouter();

  // Redirect to Customer Home tab as soon as authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(customer)/home');
    }
  }, [isAuthenticated, router]);

  const [method, setMethod] = useState<CustomerMethod>('otp');
  const [contactForOtp, setContactForOtp] = useState(''); // email OR phone
  const [identifier, setIdentifier] = useState(''); // email OR phone for password login
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [activationToken, setActivationToken] = useState('');
  const [activationPassword, setActivationPassword] = useState('');

  // Deep-link handling (Google OAuth callback, magic link, activation)
  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url) return;
      try {
        const parsed = ExpoLinking.parse(url);
        const qp = parsed.queryParams ?? {};

        // Google OAuth callback: fieseros://auth-callback?token=...
        if (typeof qp.token === 'string' && qp.token) {
          completeOAuthLogin({
            token: qp.token,
            refreshToken: typeof qp.refreshToken === 'string' ? qp.refreshToken : undefined,
            email: typeof qp.email === 'string' ? qp.email : undefined,
            name: typeof qp.name === 'string' ? qp.name : undefined,
            userId: typeof qp.userId === 'string' ? qp.userId : undefined,
            tenantId: typeof qp.tenantId === 'string' ? qp.tenantId : null,
            tenantName: typeof qp.tenantName === 'string' ? qp.tenantName : null,
            role: 'customer',
          })
            .then(() => {
              show('Signed in with Google', 'success');
              router.replace('/(customer)/home');
            })
            .catch((err) => {
              show(err instanceof Error ? err.message : 'Google sign-in failed', 'error');
            });
          return;
        }

        if (typeof qp.error === 'string' && qp.error) {
          show(decodeURIComponent(qp.error), 'error');
          return;
        }

        const mgl = typeof qp.mgl === 'string' ? qp.mgl : undefined;
        const activate = typeof qp.activate === 'string' ? qp.activate : undefined;

        if (mgl) {
          exchangeMagicLink(mgl)
            .then(() => show('Signed in via magic link', 'success'))
            .catch((err) => {
              show(err instanceof Error ? err.message : 'Magic link failed', 'error');
            });
          return;
        }

        if (activate) {
          setMethod('activate');
          setActivationToken(activate);
          show('Enter a new password to activate your account', 'info');
        }
      } catch (err) {
        console.warn('[customer-login] Failed to parse deep link:', err);
      }
    },
    [completeOAuthLogin, exchangeMagicLink, router, show]
  );

  useEffect(() => {
    ExpoLinking.getInitialURL().then(handleDeepLink).catch(() => {});
    const sub = ExpoLinking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  const handleMethodSwitch = (next: CustomerMethod) => {
    if (next === method) return;
    setMethod(next);
    setOtpSent(false);
    setOtp('');
    setPassword('');
    clearError();
    clearMultiCompanyConflict();
  };

  const otpLooksLikePhone = useMemo(
    () => contactForOtp.trim().length > 0 && /^[+\d][\d\s-]*$/.test(contactForOtp.trim()),
    [contactForOtp]
  );

  const looksLikePhone = useMemo(
    () => identifier.trim().length > 0 && /^[+\d][\d\s-]*$/.test(identifier.trim()),
    [identifier]
  );

  // ── Google OAuth Sign-In ──────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      clearError();
      const callbackUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth-callback`
          : ExpoLinking.createURL('auth-callback');
      const oauthUrl = `${API_BASE_URL}${API_PATHS.googleAuth}?mode=mobile&app=customer&redirect=${encodeURIComponent(
        callbackUrl
      )}`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = oauthUrl;
        return;
      }
      await Linking.openURL(oauthUrl);
    } catch {
      Alert.alert(
        'Google Sign-In',
        'Unable to launch Google Sign-In browser. Please sign in with Email/Phone OTP.'
      );
    }
  };

  // ── Customer: Send OTP (Email or Phone) ───────────────────────────
  const handleSendOtp = async () => {
    const trimmed = contactForOtp.trim();
    if (!trimmed) {
      show('Please enter your email or phone number', 'warning');
      return;
    }
    try {
      if (otpLooksLikePhone) {
        await requestCustomerOtp(trimmed);
        setOtpSent(true);
        show(`Verification code sent to ${trimmed}`, 'success');
      } else {
        const email = trimmed.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          show('Please enter a valid email address or phone number', 'warning');
          return;
        }
        await requestCustomerEmailOtp(email);
        setOtpSent(true);
        show(`Verification code sent to ${email}`, 'success');
      }
    } catch {
      // error surfaced via store
    }
  };

  const handleVerifyOtp = async (tenantIdOverride?: string | null) => {
    if (!otp.trim()) {
      show('Please enter the 6-digit verification code', 'warning');
      return;
    }
    const trimmed = contactForOtp.trim();
    if (!trimmed) {
      show('Please enter your email or phone number', 'warning');
      return;
    }
    try {
      if (otpLooksLikePhone) {
        await loginCustomerOtp(trimmed, otp.trim());
      } else {
        await loginCustomerEmailOtp(trimmed.toLowerCase(), otp.trim(), tenantIdOverride ?? null);
      }
      show('Welcome to Fieseros!', 'success');
      router.replace('/(customer)/home');
    } catch {
      // error surfaced via store; if 409, multiCompanyConflict is set
    }
  };

  // ── Customer: Password Login ──────────────────────────────────────
  const handlePasswordLogin = async (tenantIdOverride?: string | null) => {
    if (!identifier.trim() || !password) {
      show('Please enter your email/phone and password', 'warning');
      return;
    }
    try {
      const tenantId = tenantIdOverride !== undefined ? tenantIdOverride : null;
      await loginCustomerPassword(identifier.trim(), password, tenantId);
      show('Signed in', 'success');
      router.replace('/(customer)/home');
    } catch {
      // error surfaced via store
    }
  };

  const handleMultiCompanySelect = async (tenantId: string, tenantName: string) => {
    show(`Selected: ${tenantName}`, 'info');
    clearMultiCompanyConflict();
    if (method === 'otp') {
      await handleVerifyOtp(tenantId);
    } else {
      await handlePasswordLogin(tenantId);
    }
  };

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
      router.replace('/(customer)/home');
    } catch {
      // error surfaced via store
    }
  };

  const handleForgotPassword = () => {
    const url = `https://app.${BRAND.domain}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Reset Password', `Visit ${url} in your browser to reset your password.`);
    });
  };

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
          <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>F</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.foreground }}>
              Fieseros
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.mutedForeground,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              AI-Powered Home Services, Instant Quotes &amp; Live Tracking
            </Text>
          </View>

          {/* Google Sign-In Button */}
          <Pressable
            onPress={handleGoogleSignIn}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: '#D1D5DB',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
              marginBottom: 18,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: '#EA4335',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>G</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
              Continue with Google
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            <Text
              style={{
                marginHorizontal: 12,
                fontSize: 12,
                fontWeight: '600',
                color: '#9CA3AF',
                textTransform: 'uppercase',
              }}
            >
              Or sign in with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          </View>

          {/* Auth method toggle */}
          <SegmentedControl<CustomerMethod>
            options={[
              { value: 'otp', label: 'Instant OTP' },
              { value: 'password', label: 'Password' },
            ]}
            value={method}
            onChange={handleMethodSwitch}
            activeColor={COLORS.primary}
            className="mb-5"
          />

          {/* OTP method — Email or Phone */}
          {method === 'otp' && (
            <>
              <Input
                label="Email or Phone Number"
                value={contactForOtp}
                onChangeText={setContactForOtp}
                placeholder="you@example.com or +91 98765 43210"
                keyboardType={otpLooksLikePhone ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {otpSent && (
                <Input
                  label="6-Digit Verification Code"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit code"
                  keyboardType="numeric"
                  maxLength={6}
                />
              )}
              {otpSent ? (
                <Button
                  onPress={() => handleVerifyOtp()}
                  loading={isLoading}
                  fullWidth
                  size="lg"
                >
                  Verify &amp; Continue
                </Button>
              ) : (
                <Button onPress={handleSendOtp} loading={isLoading} fullWidth size="lg">
                  Send Verification Code
                </Button>
              )}
              {otpSent && (
                <Pressable
                  onPress={handleSendOtp}
                  style={{ marginTop: 14, alignItems: 'center' }}
                >
                  <Text
                    style={{
                      color: COLORS.primaryDark,
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
                    color: COLORS.primaryDark,
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
                <ShieldCheck size={16} color={COLORS.primaryDark} />
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

          {/* Browse as Guest CTA */}
          <Pressable
            onPress={() => router.replace('/(customer)/home')}
            style={{
              marginTop: 20,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: '#ECFDF5',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={16} color="#059669" />
            <Text style={{ color: '#059669', fontSize: 14, fontWeight: '700' }}>
              Explore Pros &amp; AI Triage as Guest
            </Text>
            <ArrowRight size={16} color="#059669" />
          </Pressable>

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
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12, textAlign: 'center' }}>
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <CompanyPickerModal
        visible={!!multiCompanyConflict}
        conflict={multiCompanyConflict}
        onSelect={handleMultiCompanySelect}
        onClose={() => clearMultiCompanyConflict()}
      />
    </SafeAreaView>
  );
}
