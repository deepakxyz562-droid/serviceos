import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../src/stores/auth-store';
import { isAppleAuthAvailable } from '../src/lib/apple-auth';
import { WEB_URL } from '../src/lib/constants';
import { Action, Brand, Card, ErrorNotice, Field, Screen, ui } from '../src/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');
  const { login, loginGoogle, loginApple, checkAuth, error } = useAuthStore();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      isAppleAuthAvailable().then(setAppleAvailable);
    }
  }, []);

  async function signIn() {
    setBusy(true);
    try {
      await login(email.trim(), password);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      await loginGoogle();
    } finally {
      setBusy(false);
    }
  }

  async function apple() {
    setBusy(true);
    try {
      await loginApple();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Welcome back" subtitle="Your conversations, customers and next opportunity.">
      <View style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Brand large />
        <Text style={[ui.caption, { marginTop: 10 }]}>BUSINESS GROWTH OS</Text>
      </View>

      <Card>
        <Text style={ui.heading}>Sign in to BGOS</Text>
        <ErrorNotice message={error} />

        {appleAvailable && (
          <View style={{ marginBottom: 10 }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={{ width: '100%', height: 48 }}
              onPress={apple}
            />
          </View>
        )}

        <Action secondary label="Continue with Google" disabled={busy} onPress={google} />

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
          onSubmitEditing={() => {
            if (email.trim() && password && !busy) signIn();
          }}
        />

        <Action secondary label={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} />
        <Action label={busy ? 'Signing in…' : 'Sign in'} disabled={busy || !email.trim() || !password} onPress={signIn} />
        <Action secondary label="Recover password" disabled={busy} onPress={() => router.push('/recover')} />
        <Action secondary label="Retry saved session" disabled={busy} onPress={checkAuth} />
      </Card>

      <Text style={[ui.body, { textAlign: 'center', marginTop: 16 }]}>Find customers. Engage. Convert. Grow.</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 12 }}>
        <Text
          style={[ui.caption, { textDecorationLine: 'underline' }]}
          onPress={() => Linking.openURL(`${WEB_URL}/privacy-policy`).catch(() => {})}
        >
          Privacy Policy
        </Text>
        <Text style={ui.caption}>•</Text>
        <Text
          style={[ui.caption, { textDecorationLine: 'underline' }]}
          onPress={() => Linking.openURL(`${WEB_URL}/terms-of-service`).catch(() => {})}
        >
          Terms of Service
        </Text>
      </View>
    </Screen>
  );
}

