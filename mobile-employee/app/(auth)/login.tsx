/**
 * Fieseros Staff App — Dedicated Field Technician & Staff Login Screen
 *
 * Authentication methods for Field Technicians:
 *   1. Work Email & Password — Direct staff login (`/api/auth/login`)
 *   2. Instant Email / Phone OTP — Passwordless verification for field crew
 *   3. Continue with Google — OAuth 2.0 round-trip with `app=employee`
 *
 * All successful login paths navigate directly to `/(employee)/today`.
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
import { ShieldCheck, HardHat, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL, API_PATHS, BRAND, COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';

type StaffAuthMethod = 'password' | 'otp';

export default function EmployeeLoginScreen() {
  const {
    loginStaff,
    requestCustomerEmailOtp,
    loginCustomerEmailOtp,
    requestCustomerOtp,
    loginCustomerOtp,
    completeOAuthLogin,
    isLoading,
    error,
    clearError,
    isAuthenticated,
  } = useAuthStore();
  const { show } = useToast();
  const router = useRouter();

  // Redirect to Employee Today Dashboard (`/(employee)/today`) when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(employee)/today');
    }
  }, [isAuthenticated, router]);

  const [method, setMethod] = useState<StaffAuthMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactForOtp, setContactForOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Google OAuth deep-link callback: fieserosemployee://auth-callback?token=...
  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url) return;
      try {
        const parsed = ExpoLinking.parse(url);
        const qp = parsed.queryParams ?? {};

        if (typeof qp.token === 'string' && qp.token) {
          completeOAuthLogin({
            token: qp.token,
            refreshToken: typeof qp.refreshToken === 'string' ? qp.refreshToken : undefined,
            email: typeof qp.email === 'string' ? qp.email : undefined,
            name: typeof qp.name === 'string' ? qp.name : undefined,
            userId: typeof qp.userId === 'string' ? qp.userId : undefined,
            tenantId: typeof qp.tenantId === 'string' ? qp.tenantId : null,
            tenantName: typeof qp.tenantName === 'string' ? qp.tenantName : null,
            role: 'employee',
          })
            .then(() => {
              show('Signed in to Fieseros Staff', 'success');
              router.replace('/(employee)/today');
            })
            .catch((err) => {
              show(err instanceof Error ? err.message : 'Google sign-in failed', 'error');
            });
          return;
        }

        if (typeof qp.error === 'string' && qp.error) {
          show(decodeURIComponent(qp.error), 'error');
        }
      } catch (err) {
        console.warn('[employee-login] Failed to parse deep link:', err);
      }
    },
    [completeOAuthLogin, router, show]
  );

  useEffect(() => {
    ExpoLinking.getInitialURL().then(handleDeepLink).catch(() => {});
    const sub = ExpoLinking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  const handleMethodSwitch = (next: StaffAuthMethod) => {
    if (next === method) return;
    setMethod(next);
    setOtpSent(false);
    setOtp('');
    setPassword('');
    clearError();
  };

  const otpLooksLikePhone = useMemo(
    () => contactForOtp.trim().length > 0 && /^[+\d][\d\s-]*$/.test(contactForOtp.trim()),
    [contactForOtp]
  );

  // ── Google OAuth Sign-In for Employees ────────────────────────────
  const handleGoogleSignIn = async () => {
    if (isSubmitting || isLoading) return;
    setIsSubmitting(true);
    try {
      clearError();
      const callbackUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth-callback`
          : ExpoLinking.createURL('auth-callback');
      const oauthUrl = `${API_BASE_URL}${API_PATHS.googleAuth}?mode=mobile&app=employee&redirect=${encodeURIComponent(
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
        'Unable to launch Google Sign-In browser. Please sign in with your work email and password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Staff Email + Password Sign-In ────────────────────────────────
  const handlePasswordLogin = async () => {
    if (isSubmitting || isLoading) return;
    if (!email.trim() || !password) {
      show('Please enter your work email and password', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await loginStaff(email.trim(), password);
      show('Welcome back!', 'success');
      router.replace('/(employee)/today');
    } catch {
      // error surfaced via store
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Staff Instant OTP Sign-In ─────────────────────────────────────
  const handleSendOtp = async () => {
    if (isSubmitting || isLoading) return;
    const trimmed = contactForOtp.trim();
    if (!trimmed) {
      show('Please enter your work email or phone number', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      if (otpLooksLikePhone) {
        await requestCustomerOtp(trimmed);
        setOtpSent(true);
        show(`Verification code sent to ${trimmed}`, 'success');
      } else {
        const mail = trimmed.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
          show('Please enter a valid email address or phone number', 'warning');
          return;
        }
        await requestCustomerEmailOtp(mail);
        setOtpSent(true);
        show(`Verification code sent to ${mail}`, 'success');
      }
    } catch {
      // error surfaced via store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isSubmitting || isLoading) return;
    if (!otp.trim()) {
      show('Please enter the 6-digit verification code', 'warning');
      return;
    }
    const trimmed = contactForOtp.trim();
    setIsSubmitting(true);
    try {
      if (otpLooksLikePhone) {
        await loginCustomerOtp(trimmed, otp.trim());
      } else {
        await loginCustomerEmailOtp(trimmed.toLowerCase(), otp.trim(), null);
      }
      show('Signed in to Fieseros Staff!', 'success');
      router.replace('/(employee)/today');
    } catch {
      // error surfaced via store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    const url = `https://${BRAND.domain}`;
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
                backgroundColor: '#059669',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <HardHat size={28} color="#fff" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.foreground }}>
                Fieseros Staff
              </Text>
              <View
                style={{
                  backgroundColor: '#ECFDF5',
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#059669', fontSize: 11, fontWeight: '800' }}>
                  FIELD TECH
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.mutedForeground,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Field technician dispatch, job checklists, and live route navigation
            </Text>
          </View>

          {/* Google Sign-in */}
          <Button
            variant="outline"
            size="lg"
            onPress={handleGoogleSignIn}
            style={{
              marginBottom: 16,
              borderColor: '#E2E8F0',
              backgroundColor: '#FAFAFA',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>🌐</Text>
              <Text style={{ color: COLORS.foreground, fontSize: 15, fontWeight: '600' }}>
                Continue with Google
              </Text>
            </View>
          </Button>

          {/* Divider */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 16,
              gap: 12,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            <Text style={{ fontSize: 12, color: COLORS.mutedForeground, fontWeight: '500' }}>
              OR WORK CREDENTIALS
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
          </View>

          {/* Method selector */}
          <View style={{ marginBottom: 20 }}>
            <SegmentedControl
              options={[
                { label: 'Work Password', value: 'password' },
                { label: 'Instant OTP', value: 'otp' },
              ]}
              value={method}
              onChange={handleMethodSwitch}
            />
          </View>

          {/* Work Password Form */}
          {method === 'password' && (
            <>
              <Input
                label="Work Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tech@yourcompany.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
              />
              <Button onPress={handlePasswordLogin} loading={isLoading} fullWidth size="lg">
                Sign In to Field Portal
              </Button>
              <Pressable
                onPress={handleForgotPassword}
                style={{ marginTop: 14, alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: '#059669',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  Forgot password?
                </Text>
              </Pressable>
            </>
          )}

          {/* Instant OTP for Field Crew */}
          {method === 'otp' && (
            <>
              <Input
                label="Registered Work Email or Phone"
                value={contactForOtp}
                onChangeText={setContactForOtp}
                placeholder="tech@company.com or +91 98765 43210"
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
                <Button onPress={handleVerifyOtp} loading={isLoading} fullWidth size="lg">
                  Verify &amp; Open Field Portal
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
                      color: '#059669',
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
              Fieseros Field Operations Network • Terms &amp; Privacy Policy
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
