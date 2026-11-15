import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

export default function ProfileCompletionScreen() {
  const router = useRouter();
  const { fetchBalance } = useAppStore();
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to personalize your studio.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Refresh wallet to register signup bonus
      await fetchBalance();
      setIsSubmitting(false);
      // Navigate to Home
      router.replace('/(tabs)');
    } catch (e: any) {
      setIsSubmitting(false);
      router.replace('/(tabs)');
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
            <View style={styles.avatarCircle}>
              <Ionicons name="sparkles" size={36} color={THEME.colors.accentViolet} />
            </View>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>
              Your name will appear on your generated studio portraits and tax receipts.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={20} color={THEME.colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Deepak Chandra"
                placeholderTextColor={THEME.colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoFocus
              />
            </View>

            {/* Trial Bonus Callout */}
            <View style={styles.bonusBox}>
              <Text style={styles.bonusEmoji}>🎁</Text>
              <View style={styles.bonusTextCol}>
                <Text style={styles.bonusTitle}>15 Free Welcome Coins Added!</Text>
                <Text style={styles.bonusSubtitle}>
                  You have 15 free coins to generate your first 3 viral AI portraits right away.
                </Text>
              </View>
            </View>
          </View>

          {/* Footer CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueBtn, !fullName.trim() && styles.continueBtnDisabled]}
              onPress={handleComplete}
              disabled={isSubmitting || !fullName.trim()}
              activeOpacity={0.88}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.continueBtnText}>Start Creating</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
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
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 36,
    gap: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 2,
    borderColor: THEME.colors.accentViolet,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  form: {
    gap: 12,
    marginVertical: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginLeft: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  bonusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: THEME.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    gap: 12,
    marginTop: 12,
  },
  bonusEmoji: {
    fontSize: 28,
  },
  bonusTextCol: {
    flex: 1,
    gap: 4,
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.coinGold,
  },
  bonusSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  footer: {
    marginBottom: 16,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 16,
    borderRadius: THEME.radii.lg,
    gap: 8,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
