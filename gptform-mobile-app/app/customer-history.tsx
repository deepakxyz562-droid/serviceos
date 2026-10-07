import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useBlueprintStore } from '@/stores/blueprint-store';

type RecordRow = { id: string; createdAt: string; kind?: string; total?: number; paidAmount?: number; status?: string; debit?: number; credit?: number; account?: string };
type History = { records: RecordRow[]; balance: number | null; reviewRequired: boolean; ordersCount: number; currency: string; nextCursor: string | null };
export default function CustomerHistory() {
  const params = useLocalSearchParams<{ phone: string; name?: string }>();
  const phone = typeof params.phone === 'string' ? params.phone : '';
  const name = typeof params.name === 'string' ? params.name : phone;
  const language = useBlueprintStore(s => s.blueprint.language) === 'hi' ? 'hi' : 'en';
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [section, setSection] = useState<'orders'|'ledger'>('orders');
  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const money = (amount: number) => new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { style: 'currency', currency: data?.currency || 'INR' }).format(amount);
  useFocusEffect(useCallback(() => {
    const version = ++generation.current; busy.current = true;
    setData(null); setLoading(true); setError(false);
    apiRequest<History>('/api/commerce/customer-history', { params: { phone, section } }).then(result => { if (version === generation.current) setData(result); }).catch(() => { if (version === generation.current) setError(true); }).finally(() => { if (version === generation.current) { busy.current = false; setLoading(false); } });
    return () => { generation.current++; };
  }, [phone, section, revision]));
  const more = async () => {
    if (busy.current || !data?.nextCursor) return;
    busy.current = true; setLoading(true); setError(false); const version = generation.current;
    try {
      const page = await apiRequest<History>('/api/commerce/customer-history', { params: { phone, section, cursor: data.nextCursor } });
      if (version === generation.current) setData(previous => previous ? { ...page, records: [...previous.records, ...page.records.filter(row => !previous.records.some(old => old.id === row.id))] } : page);
    } catch { if (version === generation.current) setError(true); } finally { if (version === generation.current) { busy.current = false; setLoading(false); } }
  };
  const status = (value: string) => ({ PENDING: t('Received','प्राप्त'), CONFIRMED: t('Confirmed','पुष्टि हुई'), PREPARING: t('Preparing','तैयार हो रहा है'), READY: t('Ready','तैयार'), DELIVERED: t('Delivered','पहुँचाया गया'), COMPLETED: t('Completed','पूरा हुआ'), CANCELLED: t('Cancelled','रद्द'), PAID: t('Paid','भुगतान हुआ') }[value] || value);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text>{t('Back to customers','ग्राहकों पर वापस जाएँ')}</Text></TouchableOpacity>
    <Text style={styles.title}>{name}</Text><Text style={styles.muted}>{phone}</Text>
    <View style={styles.card}><Text>{t('Outstanding balance','बकाया रकम')}</Text><Text style={styles.amount}>{data?.balance == null ? '—' : money(data.balance)}</Text><Text style={styles.muted}>{data?.reviewRequired ? t('Previous payments need review before this balance can be confirmed.','इस रकम की पुष्टि से पहले पुराने भुगतान की जाँच ज़रूरी है।') : !data ? t('Balance unavailable until records load.','जानकारी लोड होने पर बकाया रकम दिखेगी।') : t('Order and Khata balance','ऑर्डर और खाते का बकाया')}</Text></View>
    <View style={styles.tabs}>{(['orders','ledger'] as const).map(key => <TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{ selected: key === section }} style={[styles.button, { flex: 1 }, key === section && styles.selected]} onPress={() => setSection(key)}><Text>{key === 'orders' ? t('Order history','ऑर्डर का इतिहास') : t('Ledger','खाता विवरण')}</Text></TouchableOpacity>)}</View>
    {section === 'ledger' && <Text style={styles.muted}>{t('Sales and recorded receipts. Older payments without a ledger entry are not reconstructed.','बिक्री और दर्ज भुगतान। बिना खाता प्रविष्टि के पुराने भुगतान यहाँ नहीं बनाए जाते।')}</Text>}
    {data?.records.map(row => <View style={styles.card} key={row.id}><View style={styles.row}><Text style={styles.label}>{section === 'orders' ? `#${row.id.slice(-6).toUpperCase()}` : row.kind === 'SALE' ? t('Sale / credit bill','बिक्री / उधार बिल') : t('Payment received','भुगतान मिला')}</Text><Text style={styles.label}>{money(section === 'orders' ? row.total || 0 : row.debit || row.credit || 0)}</Text></View><View style={styles.row}><Text style={styles.muted}>{new Date(row.createdAt).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</Text><Text style={styles.muted}>{section === 'orders' ? status(row.status || '') : row.debit ? t('Debit','देय') : t('Credit','जमा')}</Text></View></View>)}
    {data && !data.records.length && <Text style={styles.muted}>{t('No records yet.','अभी कोई प्रविष्टि नहीं है।')}</Text>}
    {loading && <ActivityIndicator color="#047857" />}
    {error && <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => data ? void more() : setRevision(v => v + 1)}><Text>{t('Could not load records. Tap to retry.','जानकारी लोड नहीं हुई। फिर कोशिश करने के लिए टैप करें।')}</Text></TouchableOpacity>}
    {data?.nextCursor && !loading && !error && <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => void more()}><Text>{t('Load more','और देखें')}</Text></TouchableOpacity>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f6f8f7' }, content: { padding: 16, gap: 14, paddingBottom: 40 }, title: { fontSize: 24, fontWeight: '700', color: '#173d2d' }, amount: { fontSize: 30, fontWeight: '700', color: '#173d2d' }, card: { padding: 16, backgroundColor: 'white', borderRadius: 14, gap: 10 }, muted: { fontSize: 12, color: '#64748b', flexShrink: 1, lineHeight: 20 }, label: { fontSize: 14, fontWeight: '600', color: '#173d2d' }, button: { minHeight: 48, borderWidth: 1, borderColor: '#c6dfd0', borderRadius: 12, padding: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }, selected: { backgroundColor: '#dff0e5' }, tabs: { flexDirection: 'row', gap: 10 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 } });
