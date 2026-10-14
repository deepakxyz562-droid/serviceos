import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { getStoreBySlug, SAMPLE_STORES } from '../../src/lib/api';
import { Store } from '../../src/types';
import { COLORS } from '../../src/lib/constants';
import { haptic } from '../../src/lib/haptics';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.72;

export default function ScanQrScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { setScannedStore } = useAffinityStore();

  const [scanned, setScanned] = useState(false);
  const [detectedStore, setDetectedStore] = useState<Store | null>(SAMPLE_STORES[0]); // Default to Sharma Kirana Store for instant preview

  useEffect(() => {
    if (!permission?.granted) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // Handle scanned QR code data
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    await haptic.success();

    try {
      let slug = 'sharma-kirana';
      if (data.includes('/store/')) {
        const parts = data.split('/store/');
        const queryClean = parts[1].split('?')[0];
        slug = queryClean.split('/')[0] || 'sharma-kirana';
      } else if (data.startsWith('bos://store/')) {
        slug = data.replace('bos://store/', '').split('?')[0];
      }

      const { store } = await getStoreBySlug(slug);
      setDetectedStore(store);
    } catch {
      setDetectedStore(SAMPLE_STORES[0]);
    }
  };

  const handleOpenStore = async () => {
    if (!detectedStore) return;
    await haptic.medium();
    await setScannedStore(detectedStore);

    router.push({
      pathname: '/store/[slug]',
      params: { slug: detectedStore.slug },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Subtitle Prompt ─────────────────────────────────────────── */}
      <Text style={styles.subtitle}>Scan store QR code to quickly open the store</Text>

      {/* ── Camera Viewfinder Area ──────────────────────────────────── */}
      <View style={styles.cameraContainer}>
        {permission?.granted && Platform.OS !== 'web' ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
        ) : (
          <View style={styles.webFallbackContainer}>
            <View style={styles.qrMock}>
              <MaterialIcons name="qr-code-2" size={120} color="#059669" />
            </View>
            <Text style={styles.scanSimulateText}>Aim camera at store standee QR code</Text>
          </View>
        )}

        {/* Viewfinder Overlay with Green Corner Guides */}
        <View style={styles.viewfinderBox}>
          {/* Top-Left Corner */}
          <View style={[styles.corner, styles.cornerTL]} />
          {/* Top-Right Corner */}
          <View style={[styles.corner, styles.cornerTR]} />
          {/* Bottom-Left Corner */}
          <View style={[styles.corner, styles.cornerBL]} />
          {/* Bottom-Right Corner */}
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* ── Scanned Store Preview Card & Action ──────────────────────── */}
      {detectedStore && (
        <View style={styles.bottomCardContainer}>
          <View style={styles.storeCard}>
            <View style={styles.storeAvatar}>
              {detectedStore.bannerUrl ? (
                <Image
                  source={{ uri: detectedStore.bannerUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="storefront" size={24} color="#059669" />
              )}
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{detectedStore.name}</Text>
              <Text style={styles.storePrompt}>Open store and start shopping</Text>
            </View>
          </View>

          {/* Big Green CTA Button (Matching Mockup) */}
          <TouchableOpacity
            style={styles.openButton}
            onPress={handleOpenStore}
            activeOpacity={0.85}
          >
            <Text style={styles.openButtonText}>Open Store</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  cameraContainer: {
    alignSelf: 'center',
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  qrMock: {
    opacity: 0.9,
  },
  scanSimulateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '600',
  },
  viewfinderBox: {
    width: '85%',
    height: '85%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  bottomCardContainer: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  storeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  storePrompt: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  openButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
