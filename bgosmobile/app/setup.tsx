import React, { useState } from 'react';
import { Text } from 'react-native';
import { Action, Card, ErrorNotice, Field, Screen, ui } from '../src/components/ui';
import { useAuthStore } from '../src/stores/auth-store';
import { apiRequest } from '../src/lib/api';
export default function SetupScreen() {
  const { user, checkAuth, logout } = useAuthStore();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('IN');
  const [currency, setCurrency] = useState('INR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true); setError(null);
    try {
      await apiRequest('/api/product-workspaces/bgos', { method: 'PATCH', params: { workspaceId: user?.workspaceId }, body: { name: name.trim(), country, currency } });
      await checkAuth();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your business.'); }
    finally { setBusy(false); }
  }
  return <Screen title="Set up your business" subtitle="Your BGOS workspace is ready. Add the details your team will use."><Card><ErrorNotice message={error} /><Field label="Business name" value={name} onChangeText={setName} maxLength={120} /><Field label="Country code" value={country} onChangeText={value => setCountry(value.toUpperCase())} maxLength={2} placeholder="IN" /><Field label="Currency code" value={currency} onChangeText={value => setCurrency(value.toUpperCase())} maxLength={3} placeholder="INR" /><Text style={ui.caption}>Connect your channels from More → Integrations after setup.</Text><Action label={busy ? 'Saving…' : 'Continue to BGOS'} disabled={busy || !name.trim() || !/^[A-Z]{2}$/.test(country) || !/^[A-Z]{3}$/.test(currency)} onPress={save} /><Action secondary label="Sign out" disabled={busy} onPress={() => logout().catch(e => setError(e.message))} /></Card></Screen>;
}
