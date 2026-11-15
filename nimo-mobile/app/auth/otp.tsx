import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../../src/theme/tokens';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destination?: string; mode?: string }>();
  const destination = params.destination || '+91 98765 43210';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<any[]>([]);

  // 60-second countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleDigitChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (secondsLeft > 0) return;
    setSecondsLeft(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    Alert.alert('Code Resent', `A new verification code was sent to ${destination}`);
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter all 6 digits of the OTP.');
      return;
    }

    try {
      setIsVerifying(true);
      // Simulate/Trigger OTP verification
      setTimeout(() => {
        setIsVerifying(false);
        // Direct new user to profile completion
        router.replace('/auth/profile-completion');
      }, 800);
    } catch (e: any) {
      setIsVerifying(false);
      Alert.alert('Verification Failed', 'Invalid or expired OTP code.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.titleGroup}>
              <Text style={styles.title}>Verification Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{' '}
                <Text style={styles.destinationHighlight}>{destination}</Text>
              </Text>
              <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start' }}>
                <Text style={styles.changeDestinationText}>Change number</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6 Digit Input Boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[styles.otpBox, digit.length > 0 && styles.otpBoxFilled]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Resend Countdown */}
          <View style={styles.resendRow}>
            {secondsLeft > 0 ? (
              <Text style={styles.timerText}>
                Resend code in <Text style={{ color: THEME.colors.accentViolet, fontWeight: '700' }}>{secondsLeft}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} activeOpacity={0.8}>
                <Text style={styles.resendActiveText}>Resend Code</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                otp.join('').length < 6 && styles.verifyBtnDisabled,
              ]}
              onPress={handleVerify}
              disabled={isVerifying || otp.join('').length < 6}
              activeOpacity={0.88}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  header: {
    gap: 20,
    marginTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  destinationHighlight: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  changeDestinationText: {
    color: THEME.colors.accentViolet,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 40,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: THEME.radii.lg,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    color: THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: THEME.colors.accentViolet,
    backgroundColor: THEME.colors.bgCardLighter,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: -10,
  },
  timerText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  resendActiveText: {
    color: THEME.colors.accentViolet,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    marginBottom: 20,
  },
  verifyBtn: {
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 16,
    borderRadius: THEME.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
