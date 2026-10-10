import React, { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Action, Card, ErrorNotice, Field, Screen, ui } from '../src/components/ui';
import { apiRequest } from '../src/lib/api';
export default function RecoveryScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function recover() {
    setBusy(true); setError(null);
    try { await apiRequest('/api/auth/request-reset', { method: 'POST', body: { email: email.trim().toLowerCase() }, skipAuth: true }); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not request recovery.'); }
    finally { setBusy(false); }
  }
  return <Screen title="Recover your account" subtitle="Reset your password securely through your email."><Card><ErrorNotice message={error} />{sent ? <Text style={ui.body}>If an account exists for that email, you’ll receive a reset link. Check your inbox and spam folder, then return here to sign in.</Text> : <><Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><Action label={busy ? 'Requesting…' : 'Send reset link'} disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} onPress={recover} /></>}<Action secondary label="Back to sign in" disabled={busy} onPress={() => router.replace('/login')} /></Card></Screen>;
}
