import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { COLORS } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

export default function ProAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    token?: string;
    refreshToken?: string;
    email?: string;
    name?: string;
    userId?: string;
    tenantId?: string;
    tenantName?: string;
    role?: string;
    error?: string;
  }>();
  const router = useRouter();
  const { show } = useToast();
  const completeOAuthLogin = useAuthStore((s) => s.completeOAuthLogin);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (params.error) {
      const msg =
        params.error === 'google_not_configured'
          ? 'Google OAuth is not configured on this server yet. Please sign in with Email/Password or OTP.'
          : decodeURIComponent(params.error);
      setErrorMsg(msg);
      show(msg, 'error');
      return;
    }

    if (params.token) {
      completeOAuthLogin({
        token: params.token,
        refreshToken: params.refreshToken,
        email: params.email,
        name: params.name,
        userId: params.userId,
        tenantId: params.tenantId || null,
        tenantName: params.tenantName || null,
        role: params.role || 'owner',
      })
        .then(() => {
          show('Signed in to Fieseros Pro', 'success');
          router.replace('/(pro)/home');
        })
        .catch((err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed');
        });
    } else {
      const timer = setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [params, completeOAuthLogin, router, show]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      {errorMsg ? (
        <View style={{ alignItems: 'center', maxWidth: 320 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
            Unable to Complete Google Sign-In
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
            {errorMsg}
          </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={{
              backgroundColor: COLORS.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Back to Pro Sign In</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 14, fontSize: 15, fontWeight: '600', color: '#374151' }}>
            Signing in to Fieseros Pro...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
