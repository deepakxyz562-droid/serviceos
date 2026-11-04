import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather, FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { BosMark } from '@/components/brand/bos-mark';
import { BUSINESS_TYPE_LABELS } from '@/lib/blueprint/presets';
import { COUNTRY_PACKS } from '@/lib/blueprint/country-packs';
import type { BusinessType, CountryCode } from '@/lib/blueprint/types';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');

  // Phone Sign In State
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  // Email Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedType, setSelectedType] = useState<BusinessType>('retail');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const {
    login,
    register,
    loginWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    isLoading,
    error,
    clearError,
  } = useAuthStore();
  const saveBlueprintToServer = useBlueprintStore((s) => s.saveBlueprintToServer);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSendPhoneOtp = async () => {
    const raw = phoneNumber.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert('Phone Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    await hapticFeedback.light();
    clearError();
    const result = await sendPhoneOtp(raw);
    if (result.success) {
      setPhoneStep('otp');
      setResendCountdown(30);
      if (result.devOtp) {
        setDevOtpNotice(result.devOtp);
      }
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (otpCode.trim().length !== 6) {
      Alert.alert('Code Required', 'Please enter the 6-digit verification code.');
      return;
    }
    await hapticFeedback.medium();
    clearError();
    await verifyPhoneOtp(phoneNumber.trim(), otpCode.trim());
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    await hapticFeedback.light();
    const result = await sendPhoneOtp(phoneNumber.trim());
    if (result.success) {
      setResendCountdown(30);
      if (result.devOtp) {
        setDevOtpNotice(result.devOtp);
      }
      Alert.alert('Code Sent', 'A fresh verification code has been dispatched.');
    }
  };

  const handleUseTestAccount = () => {
    setPhoneNumber('+91 99999 99999');
    setOtpCode('123456');
    setDevOtpNotice('123456');
    hapticFeedback.light();
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    await hapticFeedback.light();
    await login(email.trim(), password);
  };

  const handleRegister = async () => {
    if (!name.trim() || !regEmail.trim() || !regPassword.trim()) {
      Alert.alert('Required', 'Please fill in all required fields.');
      return;
    }
    await hapticFeedback.light();
    const result = await register(
      name.trim(),
      regEmail.trim(),
      regPassword.trim(),
      companyName.trim() || `${name.trim()}'s Business`,
      selectedType,
      selectedCountry,
    );
    if (result === 'authenticated') {
      // Sync initial business blueprint
      await saveBlueprintToServer({
        businessType: selectedType,
        country: selectedCountry,
      });
    } else if (result === 'verification_required') {
      Alert.alert(
        'Check your email',
        'Your account was created. Open the verification link in your email, then sign in.',
        [{ text: 'Sign in', onPress: () => setMode('signin') }],
      );
    }
  };

  const handleGoogleAuth = async () => {
    await hapticFeedback.medium();
    await loginWithGoogle();
  };

  // Real password reset: POST /api/auth/request-reset with the email typed in
  // the sign-in form. The server always answers 200 (no email enumeration) and
  // only errors on invalid input / transport failures, which we surface as-is.
  const handleForgotPassword = async () => {
    if (resetting) return;
    const targetEmail = email.trim();
    if (!targetEmail) {
      Alert.alert(
        'Email required',
        'Type your work email above first, then tap Forgot password to send a reset link.'
      );
      return;
    }
    setResetting(true);
    try {
      await hapticFeedback.light();
      await apiRequest('/api/auth/request-reset', {
        method: 'POST',
        body: { email: targetEmail },
        skipAuth: true,
      });
      Alert.alert(
        'Reset link sent',
        'If an account exists for that email, a reset link has been sent.'
      );
    } catch (err: any) {
      Alert.alert(
        'Could not send reset link',
        err?.message || 'Something went wrong while requesting the reset link. Please try again.'
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* BOS Brand Header */}
        <View style={styles.header}>
          <BosMark size={84} showText subtitle="Business Operating System" variant="dark" />
          <View style={styles.taglineChip}>
            <Text style={styles.taglineChipText}>
              🛍️ Retail · 🍽️ Restaurant · 🔧 Services · 💇 Salon
            </Text>
          </View>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Segmented Mode Switcher */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
              onPress={() => {
                clearError();
                setMode('signin');
              }}
            >
              <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
              onPress={() => {
                clearError();
                setMode('register');
              }}
            >
              <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleAuth}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.googleIconWrapper}>
              <FontAwesome name="google" size={18} color="#EA4335" />
            </View>
            <Text style={styles.googleBtnText}>
              {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN DIRECTLY</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#F87171" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* SIGN IN VIEW */}
          {mode === 'signin' ? (
            <View>
              {/* Method Switcher: Phone OTP vs Email */}
              <View style={styles.methodTabs}>
                <TouchableOpacity
                  style={[styles.methodTab, authMethod === 'phone' && styles.methodTabActive]}
                  onPress={() => {
                    clearError();
                    setAuthMethod('phone');
                  }}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="phone"
                    size={14}
                    color={authMethod === 'phone' ? '#10B981' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      authMethod === 'phone' && styles.methodTabTextActive,
                    ]}
                  >
                    Mobile OTP
                  </Text>
                  <View style={styles.fastBadge}>
                    <Text style={styles.fastBadgeText}>FAST</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTab, authMethod === 'email' && styles.methodTabActive]}
                  onPress={() => {
                    clearError();
                    setAuthMethod('email');
                  }}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="mail"
                    size={14}
                    color={authMethod === 'email' ? '#818CF8' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.methodTabText,
                      authMethod === 'email' && styles.methodTabTextActive,
                    ]}
                  >
                    Password
                  </Text>
                </TouchableOpacity>
              </View>

              {authMethod === 'phone' ? (
                phoneStep === 'input' ? (
                  <View>
                    {/* Mobile Number Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mobile Phone Number</Text>
                      <View style={styles.inputRow}>
                        <View style={styles.countryPrefix}>
                          <Text style={styles.countryFlag}>🇮🇳</Text>
                          <Text style={styles.countryCodeText}>+91</Text>
                        </View>
                        <TextInput
                          value={phoneNumber}
                          onChangeText={(t) => {
                            clearError();
                            setPhoneNumber(t);
                          }}
                          placeholder="98765 43210"
                          placeholderTextColor="#475569"
                          keyboardType="phone-pad"
                          maxLength={15}
                          style={styles.textInput}
                        />
                      </View>
                    </View>

                    {/* Quick Test Account Fill */}
                    <TouchableOpacity
                      style={styles.testAccountPill}
                      onPress={handleUseTestAccount}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="lightning-bolt" size={14} color="#10B981" />
                      <Text style={styles.testAccountPillText}>
                        Test Account: +91 99999 99999 (Code: 123456)
                      </Text>
                    </TouchableOpacity>

                    {/* Send Code Button */}
                    <TouchableOpacity
                      onPress={handleSendPhoneOtp}
                      disabled={isLoading || !phoneNumber.trim()}
                      activeOpacity={0.8}
                      style={[
                        styles.submitBtn,
                        styles.submitBtnEmerald,
                        (isLoading || !phoneNumber.trim()) && styles.submitBtnDisabled,
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.submitBtnText}>Get Verification Code</Text>
                          <Feather name="arrow-right" size={16} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {/* Phone Header with Edit */}
                    <View style={styles.phoneHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.phoneHeaderLabel}>Verification code sent to</Text>
                        <Text style={styles.phoneHeaderNumber}>
                          {phoneNumber.startsWith('+') ? phoneNumber : `+91 ${phoneNumber}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          clearError();
                          setPhoneStep('input');
                        }}
                        style={styles.editPhoneBtn}
                        activeOpacity={0.7}
                      >
                        <Feather name="edit-2" size={12} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={styles.editPhoneBtnText}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Dev OTP Helper Pill */}
                    {devOtpNotice && (
                      <View style={styles.devOtpBox}>
                        <Feather name="key" size={14} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={styles.devOtpText}>
                          Active Verification Code: <Text style={{ fontWeight: '800' }}>{devOtpNotice}</Text>
                        </Text>
                      </View>
                    )}

                    {/* 6-digit OTP code */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                      <View style={styles.inputRow}>
                        <Feather name="shield" size={18} color="#10B981" />
                        <TextInput
                          value={otpCode}
                          onChangeText={(t) => {
                            clearError();
                            setOtpCode(t);
                          }}
                          placeholder="••••••"
                          placeholderTextColor="#475569"
                          keyboardType="number-pad"
                          maxLength={6}
                          style={[styles.textInput, styles.otpTextInput]}
                        />
                      </View>
                    </View>

                    {/* Resend Row */}
                    <View style={styles.resendRow}>
                      {resendCountdown > 0 ? (
                        <Text style={styles.resendTimerText}>
                          Resend code in <Text style={{ fontWeight: '700' }}>{resendCountdown}s</Text>
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                          <Text style={styles.resendActionText}>Resend verification code</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                      onPress={handleVerifyPhoneOtp}
                      disabled={isLoading || otpCode.trim().length !== 6}
                      activeOpacity={0.8}
                      style={[
                        styles.submitBtn,
                        styles.submitBtnEmerald,
                        (isLoading || otpCode.trim().length !== 6) && styles.submitBtnDisabled,
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.submitBtnText}>Verify & Sign In</Text>
                          <Feather name="check-circle" size={16} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <View>
                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Work Email</Text>
                    <View style={styles.inputRow}>
                      <Feather name="mail" size={18} color="#64748B" />
                      <TextInput
                        value={email}
                        onChangeText={(t) => {
                          clearError();
                          setEmail(t);
                        }}
                        placeholder="alex@yourcompany.com"
                        placeholderTextColor="#475569"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.textInput}
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <TouchableOpacity
                        onPress={() => void handleForgotPassword()}
                        disabled={resetting || isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Forgot password — email a reset link"
                      >
                        <Text style={styles.forgotText}>{resetting ? 'Sending…' : 'Forgot password?'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputRow}>
                      <Feather name="lock" size={18} color="#64748B" />
                      <TextInput
                        value={password}
                        onChangeText={(t) => {
                          clearError();
                          setPassword(t);
                        }}
                        placeholder="••••••••"
                        placeholderTextColor="#475569"
                        secureTextEntry={!showPassword}
                        style={styles.textInput}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                      >
                        <Feather
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={18}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    onPress={handleSignIn}
                    disabled={isLoading || !email || !password}
                    activeOpacity={0.8}
                    style={[
                      styles.submitBtn,
                      (isLoading || !email || !password) && styles.submitBtnDisabled,
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>Sign In to BOS</Text>
                        <Feather name="arrow-right" size={16} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* REGISTER VIEW */
            <View>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputRow}>
                  <Feather name="user" size={18} color="#64748B" />
                  <TextInput
                    value={name}
                    onChangeText={(t) => {
                      clearError();
                      setName(t);
                    }}
                    placeholder="e.g. Alex Morgan"
                    placeholderTextColor="#475569"
                    autoCapitalize="words"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Company / Business Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <View style={styles.inputRow}>
                  <Feather name="briefcase" size={18} color="#64748B" />
                  <TextInput
                    value={companyName}
                    onChangeText={(t) => {
                      clearError();
                      setCompanyName(t);
                    }}
                    placeholder="e.g. Blue Olive Bistro"
                    placeholderTextColor="#475569"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Business Sector / Type Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>What type of business do you run?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectorChipsRow}>
                  {(['retail', 'restaurant', 'services', 'grocery', 'salon', 'freelancer'] as BusinessType[]).map((type) => {
                    const meta = BUSINESS_TYPE_LABELS[type];
                    const isSelected = selectedType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.sectorChip, isSelected && styles.sectorChipActive]}
                        onPress={async () => {
                          await hapticFeedback.light();
                          setSelectedType(type);
                        }}
                      >
                        <Text style={{ fontSize: 14, marginRight: 6 }}>{meta?.icon}</Text>
                        <Text style={[styles.sectorChipText, isSelected && styles.sectorChipTextActive]}>
                          {meta?.label.split(' / ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Country & Currency Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Region & Country Pack</Text>
                <View style={styles.countryRow}>
                  {(['US', 'IN', 'CA', 'AU', 'GB'] as CountryCode[]).map((c) => {
                    const pack = COUNTRY_PACKS[c];
                    const isSelected = selectedCountry === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.countryChip, isSelected && styles.countryChipActive]}
                        onPress={async () => {
                          await hapticFeedback.light();
                          setSelectedCountry(c);
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{pack.flag}</Text>
                        <Text style={[styles.countryChipText, isSelected && styles.countryChipTextActive]}>
                          {pack.currency.code}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Work Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Work Email</Text>
                <View style={styles.inputRow}>
                  <Feather name="mail" size={18} color="#64748B" />
                  <TextInput
                    value={regEmail}
                    onChangeText={(t) => {
                      clearError();
                      setRegEmail(t);
                    }}
                    placeholder="alex@business.com"
                    placeholderTextColor="#475569"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Create Password</Text>
                <View style={styles.inputRow}>
                  <Feather name="lock" size={18} color="#64748B" />
                  <TextInput
                    value={regPassword}
                    onChangeText={(t) => {
                      clearError();
                      setRegPassword(t);
                    }}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#475569"
                    secureTextEntry={!showRegPassword}
                    style={styles.textInput}
                  />
                  <TouchableOpacity
                    onPress={() => setShowRegPassword(!showRegPassword)}
                    style={styles.eyeBtn}
                  >
                    <Feather
                      name={showRegPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading || !name || !regEmail || !regPassword}
                activeOpacity={0.8}
                style={[
                  styles.submitBtn,
                  (isLoading || !name || !regEmail || !regPassword) && styles.submitBtnDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Start Free with BOS</Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security badge & Legal Footer */}
        <View style={styles.footerWrap}>
          <View style={styles.securityRow}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" />
            <Text style={styles.securityText}>
              256-bit bank-grade encryption · GDPR & SOC2 Ready
            </Text>
          </View>
          <Text style={styles.legalNotice}>
            By continuing, you agree to BOS's Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C14',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  taglineChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taglineChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#0B0F19',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#1E293B',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 48,
    marginBottom: 16,
  },
  googleIconWrapper: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E293B',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#F87171',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 11,
    color: '#818CF8',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  sectorChipsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  sectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 8,
  },
  sectorChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  sectorChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sectorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countryRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  countryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  countryChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#6366F1',
  },
  countryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  countryChipTextActive: {
    color: '#818CF8',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#4F46E5',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(79, 70, 229, 0.4)',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  methodTabActive: {
    backgroundColor: '#1E293B',
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  methodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fastBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  fastBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
  },
  countryPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    marginRight: 8,
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  testAccountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 6,
  },
  testAccountPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  submitBtnEmerald: {
    backgroundColor: '#059669',
  },
  phoneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B0F19',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  phoneHeaderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneHeaderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editPhoneBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  devOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  devOtpText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  otpTextInput: {
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: -4,
  },
  resendTimerText: {
    fontSize: 12,
    color: '#64748B',
  },
  resendActionText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 24,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  legalNotice: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
    maxWidth: 280,
  },
});
