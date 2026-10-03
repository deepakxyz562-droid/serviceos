import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';

export default function MobileDineInQrScreen() {
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState(1);
  const totalTables = 12;

  const storeSlug = 'demo-store';
  const qrUrl = `https://yourdomain.com/store/${storeSlug}?table=${selectedTable}`;
  const qrImageUri = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    qrUrl
  )}`;

  const handleShare = async () => {
    hapticFeedback.light();
    try {
      await Share.share({
        message: `Order directly at Table #${selectedTable}: ${qrUrl}`,
        url: qrUrl,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dine-In Table QR</Text>
        <TouchableOpacity onPress={handleShare} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="share" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Table Selector Pills */}
        <Text style={styles.sectionLabel}>Select Table Number</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {Array.from({ length: totalTables }, (_, i) => i + 1).map((num) => {
            const active = selectedTable === num;
            return (
              <TouchableOpacity
                key={num}
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedTable(num);
                }}
                style={[styles.pill, active && styles.pillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  Table {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* QR Code Card Display */}
        <View style={styles.card}>
          <View style={styles.tableBadge}>
            <MaterialIcons name="restaurant" size={16} color="#059669" />
            <Text style={styles.tableBadgeText}>TABLE #{selectedTable}</Text>
          </View>

          <Text style={styles.cardTitle}>Scan to Order</Text>
          <Text style={styles.cardSub}>
            Guests scan with their phone camera to browse the menu and order directly to your kitchen.
          </Text>

          <View style={styles.qrBox}>
            <Image source={{ uri: qrImageUri }} style={styles.qrImage} resizeMode="contain" />
          </View>

          <Text style={styles.urlText} numberOfLines={1}>
            {qrUrl}
          </Text>

          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
            <MaterialIcons name="share" size={18} color="#ffffff" />
            <Text style={styles.shareBtnText}>Share Table Link</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
  },
  pillsRow: {
    gap: 8,
    paddingBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tableBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  qrBox: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  urlText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 12,
    marginBottom: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
