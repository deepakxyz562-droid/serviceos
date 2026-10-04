import React, { useState } from 'react';
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
import { NuvoraMark } from '@/components/brand/nuvora-mark';
import { BUSINESS_TYPE_LABELS } from '@/lib/blueprint/presets';
import { COUNTRY_PACKS } from '@/lib/blueprint/country-packs';
import type { BusinessType, CountryCode } from '@/lib/blueprint/types';
import { hapticFeedback } from '@/lib/haptics';

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In State
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

  const { login, register, loginWithGoogle, isLoading, error, clearError } = useAuthStore();
  const saveBlueprintToServer = useBlueprintStore((s) => s.saveBlueprintToServer);

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
    const success = await register(
      name.trim(),
      regEmail.trim(),
      regPassword.trim(),
      companyName.trim() || `${name.trim()}'s Business`
    );
    if (success) {
      // Sync initial business blueprint
      await saveBlueprintToServer({
        businessType: selectedType,
        country: selectedCountry,
      });
    }
  };

  const handleDemoSignIn = async () => {
    await hapticFeedback.medium();
    clearError();
    setEmail('demo@fieseros.com');
    setPassword('Demo1234!');
    await login('demo@fieseros.com', 'Demo1234!');
  };

  const handleGoogleAuth = async () => {
    await hapticFeedback.medium();
    await loginWithGoogle();
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
        {/* Nuvora Brand Header */}
        <View style={styles.header}>
          <NuvoraMark size={84} showText subtitle="Business Management OS" variant="dark" />
          <View style={styles.taglineChip}>
            <Text style={styles.taglineChipText}>
              🛍️ Retail · 🍽️ Restaurant · 🔧 Services · 💇 Salon
            </Text>
          </View>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Fast-Track Demo Preview Button */}
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={handleDemoSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.demoIconWrap}>
              <Ionicons name="flash" size={16} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.demoBtnTitle}>1-Tap Demo Business Preview</Text>
              <Text style={styles.demoBtnSubtitle}>Explore active POS, Orders & Khata instantly</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#10B981" />
          </TouchableOpacity>

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
            <Text style={styles.dividerText}>OR WITH WORK EMAIL</Text>
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
                    onPress={() => Alert.alert('Reset Password', 'Please check your email to reset your Nuvora password.')}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
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
                disabled={isLoading}
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
                    <Text style={styles.submitBtnText}>Sign In to Nuvora</Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
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
                    <Text style={styles.submitBtnText}>Start Free with Nuvora</Text>
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
            By continuing, you agree to Nuvora's Terms of Service and Privacy Policy.
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
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  demoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#022C22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  demoBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  demoBtnSubtitle: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 1,
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
