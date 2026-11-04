import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../src/stores/auth-store';
import { isAppleAuthAvailable } from '../src/lib/apple-auth';
import { sendFirebaseOtp, verifyFirebaseOtp, formatPhoneNumber } from '../src/lib/firebase-auth';
import { WEB_URL } from '../src/lib/constants';
import { Action, Brand, Card, Chip, ErrorNotice, Field, Screen, colors, ui } from '../src/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login, loginPhone, loginGoogle, loginApple, logout, checkAuth, error, isAuthenticated, isLoading, onboardingRequired } = useAuthStore();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    let active = true;
    if (Platform.OS === 'ios') {
      isAppleAuthAvailable()
        .then((available) => {
          if (active) setAppleAvailable(available);
        })
        .catch(() => {
          if (active) setAppleAvailable(false);
        });
    }
    return () => {
      active = false;
    };
  }, []);

  if (!isLoading && isAuthenticated) {
    return <Redirect href={onboardingRequired ? '/setup' : '/(tabs)'} />;
  }

  async function signInEmail() {
    setBusy(true);
    setLocalError(null);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOtp() {
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) {
      setLocalError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const res = await sendFirebaseOtp(phone);
      if (!res.success || !res.sessionInfo) {
        setLocalError(res.error || 'Failed to send verification code.');
        return;
      }
      setSessionInfo(res.sessionInfo);
      setOtpSent(true);
      setCountdown(30);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Error sending verification code');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!sessionInfo) {
      setLocalError('Please request a verification code first.');
      return;
    }
    const cleanCode = otp.trim().replace(/\D/g, '');
    if (cleanCode.length < 4) {
      setLocalError('Enter the 6-digit verification code.');
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const res = await verifyFirebaseOtp(sessionInfo, cleanCode);
      if (!res.success || !res.idToken) {
        setLocalError(res.error || 'Verification failed. Please check the code.');
        return;
      }
      const success = await loginPhone(res.idToken, res.phoneNumber || phone);
      if (!success) {
        // useAuthStore sets error
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setLocalError(null);
    try {
      await loginGoogle();
    } finally {
      setBusy(false);
    }
  }

  async function apple() {
    setBusy(true);
    setLocalError(null);
    try {
      await loginApple();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Welcome to BGOS" subtitle="One platform for all your business growth.">
      <View style={{ alignItems: 'center', paddingVertical: 18 }}>
        <Brand large />
      </View>

      <View style={[ui.row, { justifyContent: 'center', marginBottom: 12 }]}>
        <Chip label="Email & Password" selected={method === 'email'} onPress={() => setMethod('email')} />
        <Chip label="Mobile OTP" selected={method === 'phone'} onPress={() => setMethod('phone')} />
      </View>

      <Card>
        <ErrorNotice message={localError || error} />

        {method === 'phone' ? (
          <>
            <Field
              label="Mobile Number"
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                if (otpSent) {
                  setOtpSent(false);
                  setSessionInfo(null);
                  setOtp('');
                }
              }}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              maxLength={16}
            />

            {otpSent ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[ui.caption, { color: colors.muted }]}>
                    Code sent to {phone}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    disabled={busy}
                    onPress={() => {
                      setOtpSent(false);
                      setSessionInfo(null);
                      setOtp('');
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>
                      Change number
                    </Text>
                  </Pressable>
                </View>

                <Field
                  label="Enter 6-digit Code"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  placeholder="123456"
                  maxLength={6}
                  onSubmitEditing={() => {
                    if (otp.trim().length >= 4 && !busy) handleVerifyOtp();
                  }}
                />

                <Action
                  label={busy ? 'Verifying…' : 'Verify & Continue'}
                  disabled={busy || otp.trim().length < 4}
                  onPress={handleVerifyOtp}
                />

                <Action
                  secondary
                  label={countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                  disabled={busy || countdown > 0}
                  onPress={handleSendOtp}
                />
              </>
            ) : (
              <>
                <View style={{ paddingVertical: 4, marginBottom: 8 }}>
                  <Text style={[ui.caption, { color: colors.muted, lineHeight: 17 }]}>
                    🔒 We send a secure 6-digit SMS verification code to log you into your BGOS workspace.
                  </Text>
                </View>

                <Action
                  label={busy ? 'Sending OTP…' : 'Send OTP'}
                  disabled={busy || phone.replace(/\D/g, '').length < 10}
                  onPress={handleSendOtp}
                />

                <View style={{ marginTop: 8, padding: 10, backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 1, borderColor: '#DCFCE7' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', textAlign: 'center' }}>
                    💡 Test login available: +91 99999 99999 (Code: 123456)
                  </Text>
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@company.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoComplete="current-password"
              rightElement={
                <Pressable
                  hitSlop={8}
                  onPress={() => setVisible(!visible)}
                  accessibilityRole="button"
                  accessibilityLabel={visible ? 'Hide password' : 'Show password'}
                >
                  <MaterialIcons
                    name={visible ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              }
              onSubmitEditing={() => {
                if (email.trim() && password && !busy) signInEmail();
              }}
            />
            <Action
              label={busy ? 'Signing in…' : 'Sign In'}
              disabled={busy || !email.trim() || !password}
              onPress={signInEmail}
            />
          </>
        )}

        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Text style={ui.caption}>── or continue with ──</Text>
        </View>

        <Action secondary label="Continue with Google" icon="login" disabled={busy} onPress={google} />

        {appleAvailable && Platform.OS === 'ios' && (
          <View style={{ marginTop: 4 }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={{ width: '100%', height: 48 }}
              onPress={apple}
            />
          </View>
        )}

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Pressable
            hitSlop={8}
            disabled={busy}
            onPress={() => router.push('/recover')}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.brand,
                textDecorationLine: 'underline',
              }}
            >
              Forgot password? Recover account
            </Text>
          </Pressable>
        </View>
      </Card>

      <Text style={[ui.body, { textAlign: 'center', marginTop: 12 }]}>
        Find customers. Engage. Convert. Grow.
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14, gap: 12 }}>
        <Text
          style={[ui.caption, { textDecorationLine: 'underline', color: colors.brand }]}
          onPress={() => Linking.openURL(`${WEB_URL}/privacy-policy`).catch(() => {})}
        >
          Privacy Policy
        </Text>
        <Text style={ui.caption}>•</Text>
        <Text
          style={[ui.caption, { textDecorationLine: 'underline', color: colors.brand }]}
          onPress={() => Linking.openURL(`${WEB_URL}/terms-of-service`).catch(() => {})}
        >
          Terms of Service
        </Text>
      </View>
    </Screen>
  );
}
