import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../src/stores/auth-store';
import { isAppleAuthAvailable } from '../src/lib/apple-auth';
import { sendFirebaseOtp, verifyFirebaseOtp, clearPendingNativeOtpSession } from '../src/lib/firebase-auth';
import {
  FirebaseRecaptchaModal,
  type FirebaseRecaptchaModalHandle,
} from '../src/components/auth/firebase-recaptcha-modal';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  detectDeviceCountryAndTimezone,
  type CountryItem,
  formatNationalDisplay,
  buildE164,
} from '../src/lib/country-codes';
import { WEB_URL } from '../src/lib/constants';
import { Action, Card, Chip, ErrorNotice, Field, Screen, colors, ui } from '../src/components/ui';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const brandMark = require('../assets/brand-mark.png');

export default function LoginScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(
    () => detectDeviceCountryAndTimezone().country || DEFAULT_COUNTRY,
  );
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
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
  const recaptchaModalRef = useRef<FirebaseRecaptchaModalHandle>(null);

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
    const clean = phoneDigits.replace(/\D/g, '');
    if (clean.length !== selectedCountry.digits) {
      setLocalError(`Please enter a valid ${selectedCountry.digits}-digit mobile number for ${selectedCountry.name}.`);
      return;
    }
    const fullE164 = buildE164(clean, selectedCountry);
    setBusy(true);
    setLocalError(null);
    try {
      const res = await sendFirebaseOtp(fullE164, {
        requestRecaptchaToken: (formatted) => {
          if (!recaptchaModalRef.current) {
            return Promise.reject(new Error('Security verification modal is not ready. Please try again.'));
          }
          return recaptchaModalRef.current.verify(formatted);
        },
      });
      if (!res.success || !res.sessionInfo) {
        setLocalError(res.error || 'Failed to send verification code.');
        return;
      }
      setSessionInfo(res.sessionInfo);
      setOtpSent(true);
      setOtp('');
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
    if (cleanCode.length !== 6) {
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
      const fullE164 = buildE164(phoneDigits, selectedCountry);
      const success = await loginPhone(res.idToken, res.phoneNumber || fullE164);
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

  const loginHeader = (
    <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Image
          source={brandMark}
          style={{ width: 32, height: 32, resizeMode: 'contain' }}
          accessibilityIgnoresInvertColors
          alt="BGOS mark"
        />
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: '#0B9042',
            letterSpacing: -0.9,
          }}
        >
          bgos
        </Text>
      </View>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 26,
          fontWeight: '800',
          color: colors.ink,
          letterSpacing: -0.6,
          textAlign: 'center',
          marginTop: 18,
        }}
      >
        Welcome back
      </Text>
      <Text
        style={{
          fontSize: 13.5,
          lineHeight: 19,
          color: colors.muted,
          textAlign: 'center',
          marginTop: 5,
        }}
      >
        Sign in to your BGOS account
      </Text>
    </View>
  );

  return (
    <Screen customHeader={loginHeader}>
      <View style={[ui.row, { justifyContent: 'center', marginBottom: 12 }]}>
        <Chip
          label="Email & Password"
          selected={method === 'email'}
          onPress={() => {
            setMethod('email');
            setLocalError(null);
          }}
        />
        <Chip
          label="Mobile OTP"
          selected={method === 'phone'}
          onPress={() => {
            setMethod('phone');
            setLocalError(null);
          }}
        />
      </View>

      <Card>
        <ErrorNotice message={localError || error} />

        {method === 'phone' ? (
          <>
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={ui.label}>Mobile Number</Text>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '700',
                    color: phoneDigits.length === selectedCountry.digits ? '#16A34A' : colors.muted,
                  }}
                >
                  {phoneDigits.length}/{selectedCountry.digits} digits
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Country Selector Pill */}
                <Pressable
                  onPress={() => setCountryModalVisible(true)}
                  disabled={busy || otpSent}
                  accessibilityRole="button"
                  accessibilityLabel="Select Country Code"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    height: 48,
                    paddingHorizontal: 12,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: colors.line,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{selectedCountry.flag}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                    +{selectedCountry.callingCode}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={colors.muted} />
                </Pressable>

                {/* Strict Digit Input */}
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={formatNationalDisplay(phoneDigits, selectedCountry)}
                    onChangeText={(val) => {
                      const rawDigits = val.replace(/\D/g, '').slice(0, selectedCountry.digits);
                      setPhoneDigits(rawDigits);
                      if (otpSent) {
                        clearPendingNativeOtpSession(sessionInfo);
                        setOtpSent(false);
                        setSessionInfo(null);
                        setOtp('');
                      }
                    }}
                    keyboardType="number-pad"
                    placeholder={selectedCountry.placeholder}
                    placeholderTextColor="#94A3B8"
                    maxLength={selectedCountry.digits + 2}
                    editable={!busy && !otpSent}
                    style={{
                      height: 48,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: phoneDigits.length === selectedCountry.digits ? colors.brand : colors.line,
                      paddingHorizontal: 14,
                      fontSize: 16,
                      fontWeight: '700',
                      color: colors.ink,
                      letterSpacing: 0.5,
                    }}
                  />
                </View>
              </View>
            </View>

            {otpSent ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[ui.caption, { color: colors.muted }]}>
                    Code sent to +{selectedCountry.callingCode} {formatNationalDisplay(phoneDigits, selectedCountry)}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    disabled={busy}
                    onPress={() => {
                      clearPendingNativeOtpSession(sessionInfo);
                      setOtpSent(false);
                      setSessionInfo(null);
                      setOtp('');
                      setCountdown(0);
                      setLocalError(null);
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
                  onChangeText={(val) => setOtp(val.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  placeholder="123456"
                  maxLength={6}
                  onSubmitEditing={() => {
                    if (otp.replace(/\D/g, '').length === 6 && !busy) handleVerifyOtp();
                  }}
                />

                <Action
                  label={busy ? 'Verifying…' : 'Verify & Continue'}
                  disabled={busy || otp.replace(/\D/g, '').length !== 6}
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
                  disabled={busy || phoneDigits.length !== selectedCountry.digits}
                  onPress={handleSendOtp}
                />
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

      {/* Country Selection Modal */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(7, 11, 45, 0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '72%', paddingBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Select Country</Text>
              <Pressable hitSlop={8} onPress={() => setCountryModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              {COUNTRIES.map((c) => {
                const isSelected = c.code === selectedCountry.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setSelectedCountry(c);
                      setPhoneDigits((prev) => prev.slice(0, c.digits));
                      setCountryModalVisible(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: isSelected ? '#F0FDF4' : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{c.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? colors.brand : '#0F172A' }}>
                        {c.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>
                        {c.digits} digits • {c.format}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>
                      +{c.callingCode}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={18} color={colors.brand} style={{ marginLeft: 8 }} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FirebaseRecaptchaModal ref={recaptchaModalRef} />
    </Screen>
  );
}
