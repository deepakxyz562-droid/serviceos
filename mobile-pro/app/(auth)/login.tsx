/**
 * Fieseros Pro App — Dedicated Provider & Field Technician Login Screen
 *
 * Authentication methods for Service Providers & Field Technicians:
 *   1. Continue with Google — OAuth 2.0 round-trip with `app=pro` & `fieserospro://auth-callback`
 *   2. Pro Email & Password — Direct provider/technician login (`/api/auth/login`)
 *   3. Instant Email / Phone OTP — Passwordless verification for contractors & field crew
 *
 * All successful login paths navigate to `/(pro)/home`.
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
import { ShieldCheck, Briefcase, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL, API_PATHS, BRAND, COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';

type ProAuthMethod = 'password' | 'otp';

export default function ProLoginScreen() {
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

  // Redirect to Pro Dashboard (`/(pro)/home`) when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(pro)/home');
    }
  }, [isAuthenticated, router]);

  const [method, setMethod] = useState<ProAuthMethod>('password');
  const [proEmail, setProEmail] = useState('');
  const [proPassword, setProPassword] = useState('');
  const [contactForOtp, setContactForOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Handle Google OAuth deep-link callback: fieserospro://auth-callback?token=...
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
            role: typeof qp.role === 'string' ? qp.role : 'owner',
          })
            .then(() => {
              show('Signed in to Fieseros Pro', 'success');
              router.replace('/(pro)/home');
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
        console.warn('[pro-login] Failed to parse deep link:', err);
      }
    },
    [completeOAuthLogin, router, show]
  );

  useEffect(() => {
    ExpoLinking.getInitialURL().then(handleDeepLink).catch(() => {});
    const sub = ExpoLinking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  const handleMethodSwitch = (next: ProAuthMethod) => {
    if (next === method) return;
    setMethod(next);
    setOtpSent(false);
    setOtp('');
    setProPassword('');
    clearError();
  };

  const otpLooksLikePhone = useMemo(
    () => contactForOtp.trim().length > 0 && /^[+\d][\d\s-]*$/.test(contactForOtp.trim()),
    [contactForOtp]
  );

  // ── Google OAuth Sign-In for Providers ────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      clearError();
      const callbackUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/auth-callback`
          : ExpoLinking.createURL('auth-callback');
      const oauthUrl = `${API_BASE_URL}${API_PATHS.googleAuth}?mode=mobile&app=pro&redirect=${encodeURIComponent(
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
    }
  };

  // ── Provider Email + Password Sign-In ─────────────────────────────
  const handleProPasswordLogin = async () => {
    if (!proEmail.trim() || !proPassword) {
      show('Please enter your work email and password', 'warning');
      return;
    }
    try {
      await loginStaff(proEmail.trim(), proPassword);
      show('Welcome back to Fieseros Pro!', 'success');
      router.replace('/(pro)/home');
    } catch {
      // error surfaced via store
    }
  };

  // ── Provider Instant OTP Sign-In ──────────────────────────────────
  const handleSendOtp = async () => {
    const trimmed = contactForOtp.trim();
    if (!trimmed) {
      show('Please enter your work email or phone number', 'warning');
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

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      show('Please enter the 6-digit verification code', 'warning');
      return;
    }
    const trimmed = contactForOtp.trim();
    try {
      if (otpLooksLikePhone) {
        await loginCustomerOtp(trimmed, otp.trim());
      } else {
        await loginCustomerEmailOtp(trimmed.toLowerCase(), otp.trim(), null);
      }
      show('Signed in to Fieseros Pro!', 'success');
      router.replace('/(pro)/home');
    } catch {
      // error surfaced via store
    }
  };

  const handleForgotPassword = () => {
    const url = `https://pro.${BRAND.domain}`;
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
                backgroundColor: '#047857',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Briefcase size={28} color="#fff" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.foreground }}>
                Fieseros Pro
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
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>PARTNER</Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.mutedForeground,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              Win High-Intent Leads, Send Quotes &amp; Complete Jobs
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
          <SegmentedControl<ProAuthMethod>
            options={[
              { value: 'password', label: 'Work Email & Password' },
              { value: 'otp', label: 'Instant OTP' },
            ]}
            value={method}
            onChange={handleMethodSwitch}
            activeColor="#047857"
            className="mb-5"
          />

          {/* Work Email + Password */}
          {method === 'password' && (
            <>
              <Input
                label="Work Email"
                value={proEmail}
                onChangeText={setProEmail}
                placeholder="pro@yourbusiness.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                value={proPassword}
                onChangeText={setProPassword}
                placeholder="Enter your password"
                secureTextEntry
              />
              <Button onPress={handleProPasswordLogin} loading={isLoading} fullWidth size="lg">
                Sign In to Pro Portal
              </Button>
              <Pressable
                onPress={handleForgotPassword}
                style={{ marginTop: 14, alignItems: 'center' }}
              >
                <Text
                  style={{
                    color: '#047857',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  Forgot password?
                </Text>
              </Pressable>
            </>
          )}

          {/* Instant OTP for Contractors / Field Crew */}
          {method === 'otp' && (
            <>
              <Input
                label="Registered Business Email or Phone"
                value={contactForOtp}
                onChangeText={setContactForOtp}
                placeholder="pro@business.com or +91 98765 43210"
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
                  Verify &amp; Open Pro Dashboard
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
                      color: '#047857',
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

          {/* Preview Pro Dashboard CTA */}
          <Pressable
            onPress={() => router.replace('/(pro)/home')}
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
            <ShieldCheck size={16} color="#047857" />
            <Text style={{ color: '#047857', fontSize: 14, fontWeight: '700' }}>
              Explore Live Leads &amp; Pro Dashboard
            </Text>
            <ArrowRight size={16} color="#047857" />
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => Linking.openURL(`https://pro.${BRAND.domain}`).catch(() => {})}
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            <Text style={{ color: COLORS.mutedForeground, fontSize: 12, textAlign: 'center' }}>
              Verified Fieseros Partner Network • Terms &amp; Privacy Policy
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
