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
    const blueprint = useBlueprintStore(s => s.blueprint);
    const hydrated = useBlueprintStore(s => s.isHydrated);
    const user = useAuthStore(s => s.user);
    const home = getBusinessHome(blueprint);
    const t = (en: string, hi: string) => home.language === 'hi' ? hi : en;
    const [snapshot, setSnapshot] = useState<BusinessHomeSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<'connection' | 'setup' | 'account' | null>(null);
    const [revision, setRevision] = useState(0);
    useFocusEffect(useCallback(() => {
        if (!hydrated || !user?.id)
            return;
        let active = true;
        setLoading(true);
        setError(null);
        apiRequest('/api/gptform/bootstrap', { method: 'POST' })
            .then(() => apiRequest<BusinessHomeSnapshot>('/api/commerce/home'))
            .then(data => { if (active)
            setSnapshot(data); })
            .catch(e => { if (active) {
            setSnapshot(null);
            setError(e instanceof ApiError && e.statusCode === 409 ? 'account' : e instanceof ApiError && e.statusCode === 404 ? 'setup' : 'connection');
        } })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [hydrated, user?.id, user?.tenantId, blueprint.version, revision]));
    const metrics = home.metrics.filter(m => snapshot?.metrics[m] != null).slice(0, 4);
    const actions = home.actions.filter(a => HOME_DESTINATIONS[a].native).slice(0, 4);
    return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading && hydrated} onRefresh={() => setRevision(v => v + 1)} tintColor="#047857"/>}>
  <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{t('YOUR BUSINESS', 'आपका व्यवसाय')}</Text><Text style={styles.title}>{blueprint.businessName || t('Welcome back', 'स्वागत है')}</Text><Text style={styles.subtitle}>{homeText(home.type, home.language)}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Business settings', 'व्यवसाय की सेटिंग')} onPress={() => router.push('/blueprint-setup')} style={styles.settings}><MaterialIcons name="tune" size={23} color="#334155"/></TouchableOpacity></View>
  {!hydrated || loading ? <View style={styles.state}><ActivityIndicator color="#047857"/><Text style={styles.subtitle}>{t('Getting your business ready…', 'आपका व्यवसाय लोड हो रहा है…')}</Text></View> : error ? <View style={styles.state}><View style={styles.stateIcon}><MaterialIcons name={error === 'account' ? 'manage-accounts' : error === 'setup' ? 'storefront' : 'wifi-off'} size={30} color="#475569"/></View><Text style={styles.stateTitle}>{error === 'account' ? t('Check your workspace', 'अपना वर्कस्पेस जाँचें') : error === 'setup' ? t('Let’s set up your business', 'अपना व्यवसाय सेट करें') : t('Unable to connect', 'कनेक्शन नहीं हो पाया')}</Text><Text style={styles.stateText}>{error === 'account' ? t('This account is currently registered for Fieseros CRM. Contact support to review its GPTForm workspace.', 'यह खाता Fieseros CRM में दर्ज है। GPTForm वर्कस्पेस की जाँच के लिए सहायता से संपर्क करें।') : error === 'setup' ? t('Add your business details to get started.', 'शुरू करने के लिए व्यवसाय की जानकारी जोड़ें।') : t('Check your connection, then try again. Your saved data is safe.', 'इंटरनेट जाँचें और फिर कोशिश करें। आपका सेव किया डेटा सुरक्षित है।')}</Text><TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => error === 'account' ? router.push('/(tabs)/more') : error === 'setup' ? router.push('/blueprint-setup') : setRevision(v => v + 1)}><Text style={styles.primaryText}>{error === 'account' ? t('Help & account', 'सहायता और खाता') : error === 'setup' ? t('Set up business', 'व्यवसाय सेट करें') : t('Try again', 'फिर कोशिश करें')}</Text></TouchableOpacity></View> : <>
   <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t('Today at a glance', 'आज की जानकारी')}</Text><Text style={styles.subtitle}>{new Date().toLocaleDateString(home.language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })}</Text></View>
   {metrics.length === 0 ? <View style={styles.state}><Text style={styles.stateText}>{t('Today’s summary is temporarily unavailable. You can still use your business tools below.', 'आज की जानकारी अभी उपलब्ध नहीं है। नीचे दिए टूल का उपयोग कर सकते हैं।')}</Text></View> : <View style={styles.grid}>{metrics.map((metric, index) => { const action = homeMetricAction(metric, snapshot?.salesSource); const destination = action && HOME_DESTINATIONS[action].native; return <TouchableOpacity key={metric} disabled={!destination} accessibilityRole="button" onPress={() => destination && router.push(destination as any)} style={[styles.metric, index === 0 ? styles.hero : styles.half]}><View style={styles.metricTop}><Text style={[styles.metricLabel, index === 0 && styles.heroLabel]}>{homeText(metric, home.language)}</Text>{destination && <MaterialIcons name="north-east" size={18} color={index === 0 ? '#a7f3d0' : '#64748b'}/>}</View><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={[styles.value, index === 0 && styles.heroValue]}>{formatHomeMetric(metric, snapshot?.metrics[metric], snapshot?.currency || 'INR', home.language)}</Text></TouchableOpacity>; })}</View>}
   <Text style={styles.sectionTitle}>{t('What would you like to do?', 'आप क्या करना चाहते हैं?')}</Text><View style={styles.grid}>{actions.map((action, index) => <TouchableOpacity key={action} accessibilityRole="button" style={[styles.action, index === 0 && styles.primaryAction]} onPress={() => router.push(HOME_DESTINATIONS[action].native as any)}><View style={styles.actionIcon}><MaterialIcons name={action === 'sale' ? 'point-of-sale' : action === 'products' ? 'add-box' : action === 'bookings' ? 'event' : 'arrow-forward'} size={24} color="#047857"/></View><Text style={styles.actionText}>{homeText(action, home.language)}</Text><MaterialIcons name="chevron-right" size={20} color="#64748b"/></TouchableOpacity>)}</View>
  </>}
 </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f6f8f7' }, content: { padding: 20, paddingBottom: 36, gap: 20 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 4 }, eyebrow: { fontSize: 10, letterSpacing: 1.7, fontWeight: '700', color: '#64748b', marginBottom: 7 }, title: { fontSize: 26, fontWeight: '700', color: '#142d25' }, subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 }, settings: { height: 48, width: 48, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 17, fontWeight: '700', color: '#142d25' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { padding: 20, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebe8' }, half: { flexGrow: 1, width: '46%' }, hero: { width: '100%', backgroundColor: '#064e3b', borderColor: '#064e3b', padding: 24 }, metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, metricLabel: { fontSize: 13, color: '#52645d', flex: 1 }, heroLabel: { color: '#d1fae5' }, value: { fontSize: 24, fontWeight: '700', color: '#142d25', marginTop: 14 }, heroValue: { fontSize: 40, color: '#fff' }, action: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8e4', minHeight: 76 }, primaryAction: { borderColor: '#a7d7bf', backgroundColor: '#eef8f2' }, actionIcon: { padding: 10, backgroundColor: '#dff0e5', borderRadius: 13 }, actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#173d2d' }, state: { padding: 26, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', gap: 16 }, stateIcon: { padding: 18, backgroundColor: '#f1f5f4', borderRadius: 24 }, stateTitle: { fontSize: 21, fontWeight: '700', textAlign: 'center', color: '#142d25' }, stateText: { fontSize: 14, lineHeight: 22, color: '#64748b', textAlign: 'center' }, primary: { minHeight: 50, paddingHorizontal: 24, borderRadius: 14, backgroundColor: '#047857', justifyContent: 'center' }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' } });
