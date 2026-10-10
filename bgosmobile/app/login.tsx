import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '../src/stores/auth-store';
import { Action, Brand, Card, ErrorNotice, Field, Screen, ui } from '../src/components/ui';
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login, loginGoogle, checkAuth, error } = useAuthStore();
  async function signIn() { setBusy(true); try { await login(email.trim(), password); } finally { setBusy(false); } }
  async function google() { setBusy(true); try { await loginGoogle(); } finally { setBusy(false); } }
  return <Screen title="Welcome back" subtitle="Your conversations, customers and next opportunity."><View style={{ alignItems: 'center', paddingVertical: 28 }}><Brand large /><Text style={[ui.caption, { marginTop: 10 }]}>BUSINESS GROWTH OS</Text></View><Card><Text style={ui.heading}>Sign in to BGOS</Text><ErrorNotice message={error} /><Action secondary label="Continue with Google" disabled={busy} onPress={google} /><Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@company.com" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="current-password" onSubmitEditing={() => { if (email.trim() && password && !busy) signIn(); }} /><Action secondary label={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} /><Action label={busy ? 'Signing in…' : 'Sign in'} disabled={busy || !email.trim() || !password} onPress={signIn} /><Action secondary label="Recover password" disabled={busy} onPress={() => router.push('/recover')} /><Action secondary label="Retry saved session" disabled={busy} onPress={checkAuth} /></Card><Text style={[ui.body, { textAlign: 'center' }]}>Find customers. Engage. Convert. Grow.</Text></Screen>;
}
