import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { API_PATHS, WEB_URL } from '@/lib/constants';
import { useBlueprintStore } from '@/stores/blueprint-store';

type Channel = { type: string; connected: boolean; connectionStatus?: string; platformEnabled?: boolean; comingSoon?: boolean };
export default function ChannelsScreen() {
  const hindi = useBlueprintStore(s => s.blueprint.language) === 'hi';
  const t = (en: string, hi: string) => hindi ? hi : en;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let current = true;
    setLoading(true); setFailed(false);
    apiRequest<Channel[]>(API_PATHS.channels).then(result => {
      if (!Array.isArray(result)) throw new Error('Invalid channel response');
      if (current) setChannels(result);
    }).catch(() => { if (current) { setChannels([]); setFailed(true); } }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [revision]));
  const web = (view: string) => void Linking.openURL(`${WEB_URL}/?view=${view}`).catch(() => Alert.alert(t('Browser unavailable', 'ब्राउज़र नहीं खुला'), t('Please try again.', 'फिर कोशिश करें।')));
  const items = [
    { id: 'whatsapp', name: 'WhatsApp', description: t('Order updates and customer replies', 'ऑर्डर की जानकारी और ग्राहकों को जवाब'), route: '/channels/whatsapp' },
    { id: 'instagram', name: 'Instagram', description: t('Messages and supported automatic replies', 'मैसेज और उपलब्ध ऑटोमैटिक जवाब'), route: '/channels/instagram' },
    { id: 'messenger', name: 'Messenger', description: t('Facebook Page messages', 'Facebook पेज के मैसेज'), route: '/channels/messenger' },
    { id: 'live_chat', name: t('Website chat', 'वेबसाइट चैट'), description: t('Live chat and website assistant setup', 'लाइव चैट और वेबसाइट सहायक की सेटिंग'), route: '/channels/website' },
    { id: 'ai', name: t('AI chatbot', 'AI चैटबॉट'), description: t('Business information, FAQs and assistant behavior', 'व्यवसाय की जानकारी, सवाल-जवाब और सहायक की सेटिंग'), view: 'agentStudio' },
    { id: 'voice', name: t('AI receptionist', 'AI रिसेप्शनिस्ट'), description: t('Phone service, greetings and call transfers', 'फ़ोन सेवा, स्वागत संदेश और कॉल ट्रांसफ़र'), view: 'aiReceptionist' },
  ];
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more')}><Text>{t('Back to Settings', 'सेटिंग पर वापस जाएँ')}</Text></TouchableOpacity>
    <Text style={styles.title}>{t('Automations & channels', 'ऑटोमेशन और चैनल')}</Text>
    <Text style={styles.description}>{t('Choose the tools your business needs. Connect an account, configure replies, then test before enabling.', 'अपने व्यवसाय के लिए टूल चुनें। खाता जोड़ें, जवाब सेट करें और चालू करने से पहले जाँचें।')}</Text>
    {loading && <ActivityIndicator color="#047857" />}
    {failed && <TouchableOpacity accessibilityRole="button" style={styles.card} onPress={() => setRevision(v => v + 1)}><Text>{t('Could not check connections. Tap to retry.', 'कनेक्शन की जानकारी नहीं मिली। फिर कोशिश करने के लिए टैप करें।')}</Text></TouchableOpacity>}
    {items.map(item => {
      const channel = channels.find(c => c.type === item.id || (item.id === 'live_chat' && ['website','livechat','webwidget'].includes(c.type)));
      const unavailable = channel?.comingSoon || channel?.platformEnabled === false;
      const status = loading || failed ? t('Status unavailable', 'स्थिति उपलब्ध नहीं') : unavailable ? t('Currently unavailable', 'अभी उपलब्ध नहीं') : channel?.connected ? t('Connected', 'जुड़ा हुआ') : item.view ? t('Review setup in dashboard', 'डैशबोर्ड में सेटिंग जाँचें') : t('Setup required', 'सेटिंग ज़रूरी है');
      return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !!unavailable }} disabled={!!unavailable} key={item.id} style={[styles.card, unavailable && { opacity: 0.6 }]} onPress={() => item.view ? web(item.view) : router.push(item.route as '/channels/whatsapp')}>
        <Text style={styles.name}>{item.name}</Text><Text style={styles.description}>{item.description}</Text><Text style={styles.status}>{status}</Text>
      </TouchableOpacity>;
    })}
    <Text style={styles.description}>{t('Account authorization opens the web dashboard. Sign in with the same business account. Availability and usage depend on your plan and provider setup.', 'खाता जोड़ने के लिए वेब डैशबोर्ड खुलेगा। उसी व्यवसाय के खाते से साइन इन करें। उपलब्धता और इस्तेमाल आपके प्लान और सेवा की सेटिंग पर निर्भर हैं।')}</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f6f8f7' }, content: { padding: 16, gap: 16, paddingBottom: 40 }, title: { fontSize: 26, fontWeight: '700', color: '#173d2d' }, name: { fontSize: 18, fontWeight: '600', color: '#173d2d' }, description: { fontSize: 14, lineHeight: 21, color: '#64748b' }, card: { padding: 16, gap: 8, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#e6ebe8' }, status: { fontSize: 13, fontWeight: '600', color: '#36634f' }, back: { minHeight: 48, justifyContent: 'center' } });
