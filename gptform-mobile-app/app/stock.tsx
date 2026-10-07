import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { RequestTracker } from '../../shared/money';
import { apiRequest } from '@/lib/api';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { homeText } from '@/lib/business-home';

interface StockItem { id: string; name: string; stock: number; minStock: number; isLowStock: boolean }
export default function StockScreen() {
  const tracker=useRef(new RequestTracker());
  const language = useBlueprintStore((s) => s.blueprint.language || 'en');
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(false);
    apiRequest<{ items: StockItem[] }>('/api/commerce/inventory')
      .then((data) => { if (active) setItems(data.items || []); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]));
  const save = async () => {
    const delta = Number(quantity);
    if (!Number.isSafeInteger(delta) || delta <= 0 || !selected || saving) return;
    setSaving(true);
    try {
      const payload={productId:selected.id,deltaStock:delta};
      await apiRequest('/api/commerce/inventory', { method: 'PATCH', body: payload, headers: {'Idempotency-Key':tracker.current.for(payload)} });
      tracker.current.clear();
      setSelected(null); setQuantity(''); setRevision((v) => v + 1);
    } catch { Alert.alert(homeText('error', language)); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRevision((v) => v + 1)} />}>
    <View style={styles.row}><Text style={styles.title}>{homeText('stock', language)}</Text><TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => router.push('/catalog?create=1')}><Text>{homeText('products', language)}</Text></TouchableOpacity></View>
    <TextInput accessibilityLabel={t('Search products', 'सामान खोजें')} placeholder={t('Search products', 'सामान खोजें')} value={search} onChangeText={setSearch} style={styles.input} />
    {loading ? <ActivityIndicator /> : error ? <View><Text>{homeText('error', language)}</Text><TouchableOpacity style={styles.button} onPress={() => setRevision((v) => v + 1)}><Text>{homeText('retry', language)}</Text></TouchableOpacity></View> : items.length === 0 ? <Text>{t('Add your first product to start tracking stock.', 'स्टॉक देखने के लिए पहला सामान जोड़ें।')}</Text> : items.filter((i) => i.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((item) => <View key={item.id} style={styles.card}>
      <Text style={styles.name}>{item.name}</Text><Text>{t('Available', 'उपलब्ध')}: {item.stock}</Text>{item.isLowStock && <Text style={{ color: '#b45309' }}>{homeText('lowStock', language)}</Text>}
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { setSelected(item); setQuantity(''); }}><Text>{t('Add Stock', 'स्टॉक जोड़ें')}</Text></TouchableOpacity>
    </View>)}
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => { if (!saving) setSelected(null); }}><View style={styles.overlay}><View style={styles.sheet}>
      <Text style={styles.title}>{selected?.name}</Text><Text>{t('How many units are you adding?', 'कितना स्टॉक जोड़ रहे हैं?')}</Text>
      <TextInput accessibilityLabel={t('Quantity', 'मात्रा')} autoFocus keyboardType="number-pad" value={quantity} onChangeText={setQuantity} style={styles.input} />
      <TouchableOpacity accessibilityRole="button" disabled={saving || !Number.isSafeInteger(Number(quantity)) || Number(quantity) <= 0} onPress={save} style={styles.button}><Text>{saving ? '…' : t('Save', 'सेव करें')}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => setSelected(null)} style={styles.button}><Text>{t('Cancel', 'रद्द करें')}</Text></TouchableOpacity>
    </View></View></Modal>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f7f8fa' }, content: { padding: 16, gap: 16, paddingBottom: 40 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 24, fontWeight: '700' }, name: { fontSize: 18, fontWeight: '600' }, card: { padding: 18, gap: 8, backgroundColor: '#fff', borderRadius: 16 }, input: { borderWidth: 1, borderColor: '#cbd5e1', padding: 14, borderRadius: 12, backgroundColor: '#fff', minHeight: 48 }, button: { minHeight: 48, padding: 12, justifyContent: 'center', backgroundColor: '#ecfdf5', borderRadius: 10 }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }, sheet: { backgroundColor: '#fff', padding: 24, gap: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 } });
