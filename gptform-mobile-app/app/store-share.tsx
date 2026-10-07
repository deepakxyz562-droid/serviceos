import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WEB_URL } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';
import { useBlueprintStore } from '@/stores/blueprint-store';

type StoreShare = { name: string; storeUrl: string; qrDataUrl: string; html: string };
export default function StoreShareScreen() {
  const language = useBlueprintStore(s => s.blueprint.language) === 'hi' ? 'hi' : 'en';
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [data, setData] = useState<StoreShare | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setData(null);
    apiRequest<StoreShare>('/api/commerce/store-share', { params: { language } }).then(value => { if (active) setData(value); }).catch(e => { if (active) setError(e instanceof ApiError ? e.statusCode : 0); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [language, revision]);
  const perform = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch { Alert.alert(t('Unable to complete', 'काम पूरा नहीं हुआ'), t('Please try again.', 'कृपया फिर कोशिश करें।')); } finally { setBusy(false); }
  };
  const print = async () => {
    if (!data) return;
    if (Platform.OS === 'web') {
      const preview = window.open('', '_blank');
      if (!preview) throw new Error('POPUP_BLOCKED');
      preview.document.write(data.html); preview.document.close();
      const img = preview.document.querySelector('img');
      if (img) await img.decode();
      preview.focus(); preview.print();
    } else await Print.printAsync({ html: data.html });
  };
  const button = (label: string, fn: () => Promise<unknown>, primary = false) => <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void perform(fn)} style={[styles.button, primary && styles.primary, busy && { opacity: 0.5 }]}><Text style={[styles.buttonText, primary && { color: 'white' }]}>{label}</Text></TouchableOpacity>;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel={t('Back', 'वापस')} accessibilityRole="button" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={24} color="#173d2d" /></TouchableOpacity><Text style={styles.title}>{t('Share your store', 'अपनी दुकान शेयर करें')}</Text></View>
    {loading ? <ActivityIndicator color="#047857" /> : error !== null ? <View style={styles.card}><Text>{error === 409 ? t('Finish setup and publish your store before sharing.', 'शेयर करने से पहले दुकान की सेटिंग पूरी करें और प्रकाशित करें।') : t('Could not load your store. Please try again.', 'दुकान लोड नहीं हुई। फिर कोशिश करें।')}</Text>{error === 409 && button(t('Open store setup on web', 'वेब पर दुकान की सेटिंग खोलें'), () => Linking.openURL(`${WEB_URL}/?view=commerce`))}{button(t('Try again', 'फिर कोशिश करें'), async () => setRevision(v => v + 1))}</View> : data && <>
      <View style={styles.card}><Text style={styles.title}>{data.name}</Text><Image accessibilityLabel={t('Store QR code', 'दुकान का QR कोड')} source={{ uri: data.qrDataUrl }} style={styles.qr} /><Text style={styles.subtitle}>{t('Scan with your phone camera to order', 'ऑर्डर करने के लिए फ़ोन के कैमरे से स्कैन करें')}</Text><Text selectable style={styles.link}>{data.storeUrl}</Text></View>
      {button(t('Copy store link', 'दुकान का लिंक कॉपी करें'), async () => { const copied = await Clipboard.setStringAsync(data.storeUrl); if (!copied) throw new Error('COPY_FAILED'); Alert.alert(t('Link copied', 'लिंक कॉपी हुआ')); })}
      {button(t('Share on WhatsApp', 'WhatsApp पर शेयर करें'), () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${data.name}\n${data.storeUrl}`)}`), true)}
      {button(t('Share link', 'लिंक शेयर करें'), () => Share.share({ message: `${data.name}\n${data.storeUrl}` }))}
      {button(t('Print QR standee', 'QR स्टैंडी प्रिंट करें'), print)}
      {Platform.OS !== 'web' && button(t('Share QR as PDF', 'QR की PDF शेयर करें'), async () => { if (!await Sharing.isAvailableAsync()) throw new Error('SHARING_UNAVAILABLE'); const file = await Print.printToFileAsync({ html: data.html }); await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }); })}
    </>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f6f8f7' }, content: { padding: 16, gap: 12 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { padding: 12 }, title: { fontSize: 22, fontWeight: '700', color: '#173d2d', flexShrink: 1 }, card: { backgroundColor: 'white', borderRadius: 18, padding: 16, gap: 16, alignItems: 'center' }, qr: { width: 260, height: 260, maxWidth: '100%' }, subtitle: { color: '#52645d', textAlign: 'center', lineHeight: 22 }, link: { color: '#047857', textAlign: 'center' }, button: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#c6dfd0', backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 12 }, primary: { backgroundColor: '#047857' }, buttonText: { fontSize: 15, fontWeight: '600', color: '#173d2d' } });
