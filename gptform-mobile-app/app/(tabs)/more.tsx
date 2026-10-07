import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { homeText } from '@/lib/business-home';
type Icon = React.ComponentProps<typeof MaterialIcons>['name'];
type Row = {
    label: string;
    icon: Icon;
    path?: string;
    onPress?: () => void;
    detail?: string;
};
export default function MoreScreen() {
    const { user, logout } = useAuthStore();
    const { blueprint, saveBlueprintToServer } = useBlueprintStore();
    const c = blueprint.capabilities;
    const language = blueprint.language === 'hi' ? 'hi' : 'en';
    const t = (en: string, hi: string) => language === 'hi' ? hi : en;
    const [saving, setSaving] = useState(false);
    const changeLanguage = async () => { if (saving)
        return; setSaving(true); try {
        const ok = await saveBlueprintToServer({ language: language === 'hi' ? 'en' : 'hi' });
        if (!ok)
            Alert.alert(t('Language not saved', 'भाषा सेव नहीं हुई'), t('Check your connection and try again.', 'इंटरनेट जाँचें और फिर कोशिश करें।'));
    }
    finally {
        setSaving(false);
    } };
    const business: Row[] = [
        { label: t('Business details', 'व्यवसाय की जानकारी'), icon: 'storefront', path: '/blueprint-setup', detail: homeText(blueprint.businessType, language) },
        ...(c.catalog ? [{ label: t('Products', 'सामान'), icon: 'inventory-2' as Icon, path: '/catalog' }] : []),
        ...(c.orders ? [{ label: t('Orders', 'ऑर्डर'), icon: 'shopping-bag' as Icon, path: '/(tabs)/orders' }] : []),
        ...(c.calendarBooking ? [{ label: t('Bookings', 'बुकिंग'), icon: 'event' as Icon, path: '/(tabs)/bookings' }] : []),
        ...(c.customers ? [{ label: t('Customers', 'ग्राहक'), icon: 'people-outline' as Icon, path: '/customers' }] : []),
        ...(c.customerCredit ? [{ label: t('Khata', 'खाता'), icon: 'account-balance-wallet' as Icon, path: '/khata' }] : []),
        ...(c.expenses ? [{ label: t('Expenses', 'खर्च'), icon: 'receipt-long' as Icon, path: '/expenses' }] : []),
        ...(c.invoicing ? [{ label: t('Invoices & estimates', 'बिल और अनुमान'), icon: 'description' as Icon, path: '/billing' }] : []),
        ...(c.tables ? [{ label: t('Tables & QR menu', 'टेबल और QR मेन्यू'), icon: 'table-restaurant' as Icon, path: '/dine-in-qr' }] : []),
        ...(c.onlineStore ? [{ label: t('Online store', 'ऑनलाइन दुकान'), icon: 'language' as Icon, path: '/custom-domain' }] : []),
    ];
    const tools: Row[] = [
        ...(c.forms ? [{ label: t('Forms', 'फ़ॉर्म'), icon: 'dynamic-form' as Icon, path: '/forms' }] : []),
        ...(c.whatsapp ? [{ label: t('Connected channels', 'जुड़े हुए चैनल'), icon: 'chat-bubble-outline' as Icon, path: '/channels' }] : []),
        ...(c.aiAgent ? [{ label: t('AI agents', 'AI एजेंट'), icon: 'smart-toy' as Icon, path: '/team' }] : []),
        ...(c.aiReceptionist ? [{ label: t('Voice receptionist', 'वॉइस रिसेप्शनिस्ट'), icon: 'phone-in-talk' as Icon, path: '/receptionist' }] : []),
    ];
    const preferences: Row[] = [{ label: t('Language', 'भाषा'), icon: 'translate', detail: saving ? '…' : language === 'hi' ? 'हिन्दी' : 'English', onPress: () => void changeLanguage() }, { label: t('Notifications', 'सूचनाएँ'), icon: 'notifications-none', path: '/notifications' }, { label: t('Appearance', 'दिखावट'), icon: 'palette', path: '/appearance' }];
    const section = (title: string, rows: Row[]) => rows.length > 0 && <View><Text style={styles.section}>{title}</Text><View style={styles.group}>{rows.map((row, index) => <TouchableOpacity key={row.label} accessibilityRole="button" onPress={() => row.onPress ? row.onPress() : router.push(row.path as any)} style={[styles.row, index > 0 && styles.border]}><View style={styles.icon}><MaterialIcons name={row.icon} size={22} color="#36634f"/></View><Text style={styles.label}>{row.label}</Text>{row.detail && <Text style={styles.detail}>{row.detail}</Text>}<MaterialIcons name="chevron-right" size={21} color="#94a3b8"/></TouchableOpacity>)}</View></View>;
    return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.title}>{t('More', 'और')}</Text><View style={styles.profile}><View style={styles.avatar}><Text style={styles.initial}>{(user?.name || user?.email || '?')[0].toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{user?.name || t('Your account', 'आपका खाता')}</Text><Text style={styles.email}>{user?.email}</Text></View></View>
  {section(t('Your business', 'आपका व्यवसाय'), business)}{section(t('Enabled tools', 'चालू टूल'), tools)}{section(t('Preferences', 'पसंद'), preferences)}
  {section(t('Help & account', 'सहायता और खाता'), [{ label: t('Support requests', 'सहायता अनुरोध'), icon: 'support-agent', path: '/tickets' }])}
  <TouchableOpacity accessibilityRole="button" style={styles.logout} onPress={() => Alert.alert(t('Log out?', 'लॉग आउट करें?'), '', [{ text: t('Cancel', 'रद्द करें'), style: 'cancel' }, { text: t('Log out', 'लॉग आउट'), style: 'destructive', onPress: () => void logout() }])}><MaterialIcons name="logout" size={20} color="#b91c1c"/><Text style={{ color: '#b91c1c', fontWeight: '600' }}>{t('Log out', 'लॉग आउट')}</Text></TouchableOpacity>
 </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f6f8f7' }, content: { padding: 20, gap: 24, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '700', color: '#142d25' }, profile: { flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#dff0e5', alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 23, fontWeight: '700', color: '#166534' }, name: { fontSize: 18, fontWeight: '700', color: '#142d25' }, email: { fontSize: 13, color: '#64748b', marginTop: 4 }, section: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 10 }, group: { borderRadius: 18, backgroundColor: 'white', paddingHorizontal: 14, borderWidth: 1, borderColor: '#e6ebe8' }, row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }, border: { borderTopWidth: 1, borderTopColor: '#f0f3f1' }, icon: { width: 28, alignItems: 'center' }, label: { flex: 1, fontSize: 15, color: '#203d31', fontWeight: '500' }, detail: { fontSize: 12, color: '#64748b', maxWidth: 110 }, logout: { minHeight: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 } });
