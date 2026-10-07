import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { getBusinessHome, homeText, homeMetricAction, HOME_DESTINATIONS, formatHomeMetric, type BusinessHomeSnapshot } from '@/lib/business-home';

export function BusinessHomeScreen() {
  const blueprint = useBlueprintStore((s) => s.blueprint);
  const hydrated = useBlueprintStore((s) => s.isHydrated);
  const saveBlueprint = useBlueprintStore((s) => s.saveBlueprintToServer);
  const user = useAuthStore((s) => s.user);
  const home = getBusinessHome(blueprint);
  const [snapshot, setSnapshot] = useState<BusinessHomeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setSnapshot(null); setLoading(true); setError(false); setSetupRequired(false);
    apiRequest<BusinessHomeSnapshot>('/api/commerce/home')
      .then((data) => { if (active) setSnapshot(data); })
      .catch((error) => { if (active) { setError(true); setSetupRequired(error instanceof ApiError && error.statusCode === 404); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?.tenantId, blueprint.version, revision]));
  const language = home.language;
  const changeLanguage = async () => {
    setSaving(true);
    const success = await saveBlueprint({ language: language === 'en' ? 'hi' : 'en' });
    if (!success) setError(true);
    setSaving(false);
  };
  if (!hydrated) return <SafeAreaView style={styles.safe}><ActivityIndicator accessibilityLabel={homeText('loading', language)} /></SafeAreaView>;
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision((v) => v + 1)} />}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}><Text style={styles.subtitle}>{homeText(home.type, language)}</Text><Text style={styles.title}>{blueprint.businessName || homeText('home', language)}</Text></View>
        <TouchableOpacity disabled={saving} onPress={changeLanguage} accessibilityRole="button" accessibilityLabel={homeText('language', language)} style={styles.headerButton}><Text>{saving ? '…' : language === 'en' ? 'हिन्दी' : 'English'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/blueprint-setup')} accessibilityRole="button" accessibilityLabel={homeText('setup', language)} style={styles.headerButton}><MaterialIcons name="settings" size={22} /></TouchableOpacity>
      </View>
      {error ? <View style={styles.card}><Text>{homeText(setupRequired ? 'setupRequired' : 'error', language)}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setupRequired ? router.push('/blueprint-setup') : setRevision((v) => v + 1)} style={styles.headerButton}><Text>{homeText(setupRequired ? 'setup' : 'retry', language)}</Text></TouchableOpacity></View> : loading ? <ActivityIndicator accessibilityLabel={homeText('loading', language)} /> :
        <View style={styles.grid}>{home.metrics.map((metric, index) => {
          const value = snapshot?.metrics[metric];
          const hero = index === 0;
          const action = homeMetricAction(metric, snapshot?.salesSource);
          const destination = action && HOME_DESTINATIONS[action].native;
          return <TouchableOpacity accessibilityRole="button" disabled={value == null || !destination} onPress={() => { if (destination) router.push(destination as any); }} key={metric} style={[styles.card, hero ? styles.hero : styles.half]}>
            <Text style={[styles.metricLabel, hero && styles.heroText]}>{homeText(metric, language)}</Text>
            <Text style={[styles.value, hero && styles.heroValue]}>{formatHomeMetric(metric, value, snapshot?.currency || 'INR', language)}</Text>
            {value == null ? <Text style={[styles.note, hero && styles.heroText]}>{homeText('unavailable', language)}</Text> : metric === 'sales' ? <Text style={[styles.note, hero && styles.heroText]}>{homeText(snapshot?.salesSource === 'invoices' ? 'invoiceScope' : 'orderScope', language)}</Text> : metric === 'lowStock' ? <Text style={styles.note}>{homeText('stockScope', language)}</Text> : null}
          </TouchableOpacity>;
        })}</View>}
      <View style={styles.grid}>{home.actions.filter((action) => HOME_DESTINATIONS[action].native).map((action) => <TouchableOpacity key={action} accessibilityRole="button" style={[styles.card, styles.half, styles.action]} onPress={() => router.push(HOME_DESTINATIONS[action].native as any)}><Text style={styles.actionText}>{homeText(action, language)}</Text><MaterialIcons name="arrow-forward" size={18} color="#059669" /></TouchableOpacity>)}</View>
      {home.actions.some((action) => !HOME_DESTINATIONS[action].native) && <Text style={styles.note}>{homeText('workflowPending', language)}</Text>}
      {snapshot && <Text style={styles.note}>{snapshot.date} · {snapshot.timezone}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f8fa' }, content: { padding: 16, gap: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 4 }, headerButton: { minHeight: 48, minWidth: 48, padding: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 18 },
  half: { width: '48%', flexGrow: 1 }, hero: { width: '100%', backgroundColor: '#064e3b', borderColor: '#064e3b', padding: 24 },
  metricLabel: { color: '#64748b', fontSize: 14 }, value: { fontSize: 25, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  heroText: { color: '#d1fae5' }, heroValue: { color: '#fff', fontSize: 38 }, note: { fontSize: 12, color: '#64748b', marginTop: 8 },
  action: { minHeight: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0f172a' },
});
