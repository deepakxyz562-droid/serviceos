import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { NimoLogo } from '../../src/components/NimoLogo';

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || fullName.trim().length < 2) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        router.replace('/(tabs)');
      }, 600);
    } catch {
      setIsLoading(false);
      Alert.alert('Error', 'Unable to create account. Please try again.');
    }
  };

  const handleSocialAuth = (provider: 'Google' | 'Apple') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/(tabs)');
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo Badge */}
          <View style={styles.logoRow}>
            <NimoLogo size="medium" showText />
          </View>

          {/* Heading */}
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our creative community</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={THEME.colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={THEME.colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={styles.signUpBtn}
              onPress={handleSignUp}
              activeOpacity={0.88}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.signUpBtnText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Auth Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialAuth('Google')}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => handleSocialAuth('Apple')}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Switch to Sign In */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 6,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    height: 54,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  signUpBtn: {
    height: 52,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  signUpBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 28,
  },
  socialBtn: {
    width: 60,
    height: 60,
    borderRadius: THEME.radii.lg,
    backgroundColor: THEME.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: THEME.colors.accentViolet,
    fontSize: 14,
    fontWeight: '700',
  },
});
