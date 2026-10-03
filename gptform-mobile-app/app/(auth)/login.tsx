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
  Modal,
} from 'react-native';
import { Ionicons, Feather, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
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
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Google Account Prompt State
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [googleInputEmail, setGoogleInputEmail] = useState('');
  const [googleInputName, setGoogleInputName] = useState('');

  const { login, register, loginWithGoogle, quickDemoLogin, isLoading, error, clearError } =
    useAuthStore();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    await hapticFeedback.light();
    await login(email.trim(), password);
  };

  const handleRegister = async () => {
    if (!name.trim() || !regEmail.trim() || !regPassword.trim()) return;
    await hapticFeedback.light();
    await register(name.trim(), regEmail.trim(), regPassword.trim(), companyName.trim());
  };

  const handleGoogleAuth = async () => {
    await hapticFeedback.medium();
    const success = await loginWithGoogle();
    if (!success) {
      // If browser OAuth was dismissed or server has no redirect, open direct Google Account prompt
      setGoogleModalVisible(true);
    }
  };

  const handleConfirmGoogleInput = async () => {
    if (!googleInputEmail.trim()) return;
    await hapticFeedback.success();
    await loginWithGoogle(googleInputEmail.trim(), googleInputName.trim());
    setGoogleModalVisible(false);
  };

  const handleDemoSignIn = async () => {
    await hapticFeedback.medium();
    await quickDemoLogin();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Glow & Branding */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={32} color="#10B981" />
          </View>
          <Text style={styles.brandTitle}>
            GPT<Text style={styles.brandAccent}>Form</Text>
          </Text>
          <Text style={styles.brandSubtitle}>
            Mobile AI Agents · Conversations · Live Training
          </Text>
        </View>

        {/* Card Container */}
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

          {/* Google Sign In Button */}
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
            <Text style={styles.dividerText}>OR CONTINUE WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#F87171" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* SIGN IN VIEW */}
          {mode === 'signin' ? (
            <View>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputRow}>
                  <Feather name="mail" size={18} color="#64748B" />
                  <TextInput
                    value={email}
                    onChangeText={(t) => {
                      clearError();
                      setEmail(t);
                    }}
                    placeholder="you@company.com"
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
                <Text style={styles.inputLabel}>Password</Text>
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
                  <ActivityIndicator color="#022C22" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Sign In</Text>
                    <Feather name="arrow-right" size={16} color="#022C22" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* REGISTER VIEW */
            <View>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Full Name</Text>
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

              {/* Company / Workspace */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business / Workspace Name</Text>
                <View style={styles.inputRow}>
                  <Feather name="briefcase" size={18} color="#64748B" />
                  <TextInput
                    value={companyName}
                    onChangeText={(t) => {
                      clearError();
                      setCompanyName(t);
                    }}
                    placeholder="e.g. Apex Health Clinic"
                    placeholderTextColor="#475569"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Email */}
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
                    placeholder="alex@apexhealth.com"
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
                  <ActivityIndicator color="#022C22" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Create Free Account</Text>
                    <Feather name="arrow-right" size={16} color="#022C22" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Demo Login Option */}
          <TouchableOpacity
            style={styles.demoLoginBtn}
            onPress={handleDemoSignIn}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.demoLoginText}>Demo Workspace Access (Deepak Chandra)</Text>
          </TouchableOpacity>
        </View>

        {/* Security badge */}
        <View style={styles.securityRow}>
          <MaterialCommunityIcons name="shield-check-outline" size={14} color="#64748B" />
          <Text style={styles.securityText}>
            256-bit encrypted · Synced with GPTForm Studio Web
          </Text>
        </View>
      </ScrollView>

      {/* Google Sign In Account Details Modal */}
      <Modal
        visible={googleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoogleModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.googleModalCard}>
            <View style={styles.googleModalHeader}>
              <View style={styles.googleGWrapper}>
                <FontAwesome name="google" size={24} color="#EA4335" />
              </View>
              <Text style={styles.googleModalTitle}>Sign in with Google</Text>
              <Text style={styles.googleModalSubtitle}>
                Enter your Google Account email to authenticate and sync your AI workspace.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalInputLabel}>Google Email Address</Text>
              <View style={styles.modalInputRow}>
                <Feather name="mail" size={18} color="#64748B" />
                <TextInput
                  value={googleInputEmail}
                  onChangeText={setGoogleInputEmail}
                  placeholder="your.email@gmail.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.modalTextInput}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalInputLabel}>Your Name (Optional)</Text>
              <View style={styles.modalInputRow}>
                <Feather name="user" size={18} color="#64748B" />
                <TextInput
                  value={googleInputName}
                  onChangeText={setGoogleInputName}
                  placeholder="e.g. Deepak Chandra"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  style={styles.modalTextInput}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmGoogleBtn, !googleInputEmail.trim() && styles.submitBtnDisabled]}
              onPress={handleConfirmGoogleInput}
              disabled={!googleInputEmail.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#022C22" size="small" />
              ) : (
                <Text style={styles.confirmGoogleBtnText}>Continue with Google</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setGoogleModalVisible(false)}
            >
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#34D399',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#020617',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
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
  submitBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#10B981',
    marginTop: 6,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#022C22',
  },
  demoLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  demoLoginText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  securityText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  googleModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  googleModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  googleGWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  googleModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 10,
  },
  confirmGoogleBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmGoogleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#022C22',
  },
  cancelModalBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
