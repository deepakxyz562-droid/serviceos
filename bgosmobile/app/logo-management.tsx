import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Screen, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';

const PRESET_COLORS = [
  { label: 'Teal Blue', hex: '#1B8380' },
  { label: 'Amber Gold', hex: '#F4B41A' },
  { label: 'Emerald Green', hex: '#009F50' },
  { label: 'Royal Blue', hex: '#1E6FFB' },
  { label: 'Coral Orange', hex: '#F97316' },
  { label: 'Berry Purple', hex: '#8B5CF6' },
  { label: 'Rose Red', hex: '#EF4444' },
  { label: 'Slate Navy', hex: '#0F172A' },
];

const DEFAULT_SAMPLE_PHOTO =
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&auto=format&fit=crop&q=80';

export default function LogoManagementScreen() {
  const router = useRouter();
  const brandRes = useResource<any>('/api/brand-profile');
  const gbpPlace = useResource<any>('/api/gbp/place');

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string>('No logo uploaded yet');
  const [brandColor, setBrandColor] = useState<string>('#1B8380');
  const [secondaryColor, setSecondaryColor] = useState<string>('#F4B41A');
  const [logoUsage, setLogoUsage] = useState<'original' | 'black_background'>('original');

  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<'brand' | 'secondary' | null>(null);
  const [customHex, setCustomHex] = useState('');

  useEffect(() => {
    if (brandRes.data) {
      const d = brandRes.data;
      const details = d.brandDetails || {};
      if (details.logoUrl) {
        setLogoUri(details.logoUrl);
        setLogoFileName(details.logoFileName || 'brand-logo.png');
      } else {
        setLogoFileName('No logo uploaded yet');
      }
      if (details.brandColor) setBrandColor(details.brandColor);
      if (details.secondaryColor) setSecondaryColor(details.secondaryColor);
      if (details.logoUsage) setLogoUsage(details.logoUsage);
    }
  }, [brandRes.data]);

  const handlePickFile = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        setLogoUri(asset.uri);
        const name = asset.fileName || `logo_${Date.now().toString(36).slice(-6)}.png`;
        setLogoFileName(name);
        Alert.alert('Logo Selected', 'Logo image loaded. Remember to tap Save Changes.');
      }
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleGenerateWithAi = async () => {
    setGeneratingAi(true);
    try {
      const bizName = brandRes.data?.profile?.businessName || 'Business';
      const industry = brandRes.data?.profile?.industry || 'Services';
      const res = await apiRequest<{ success?: boolean; logoUrl?: string; data?: { url?: string } }>(
        '/api/social/designs/image',
        {
          method: 'POST',
          body: {
            requestId: `logo_gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            topic: `Minimalist modern vector icon logo for ${bizName} (${industry}), crisp clean lines, transparent white or soft background, flat aesthetic, commercial branding`,
            aspectRatio: '1:1',
            provider: 'gemini',
          },
        }
      );

      const generatedUrl = res.logoUrl || res.data?.url;
      if (generatedUrl) {
        setLogoUri(generatedUrl);
        setLogoFileName(`ai_logo_${Date.now().toString(36)}.png`);
        Alert.alert('AI Logo Ready', 'Fresh logo concept generated with Google Gemini!');
      } else {
        // Fallback placeholder with business initial badge
        setLogoFileName(`${bizName.toLowerCase().replace(/\s+/g, '-')}-logo.png`);
        Alert.alert('Notice', 'AI logo requested. Please review and tap Save Changes.');
      }
    } catch (err: unknown) {
      Alert.alert('AI Logo', err instanceof Error ? err.message : 'Could not generate logo right now.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleDownload = async () => {
    if (!logoUri) {
      Alert.alert('Notice', 'No logo file to download.');
      return;
    }
    try {
      await Share.share({
        title: 'Brand Logo',
        url: logoUri,
        message: `Brand logo file: ${logoFileName}`,
      });
    } catch {
      Alert.alert('Notice', 'Could not share logo.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = brandRes.data || {};
      const existingDetails = existing.brandDetails || {};
      await apiRequest('/api/brand-profile', {
        method: 'PUT',
        body: {
          businessName: existing.profile?.businessName || 'My Business',
          industry: existing.profile?.industry || 'Services',
          brandDetails: {
            ...existingDetails,
            logoUrl: logoUri,
            logoFileName,
            brandColor,
            secondaryColor,
            logoUsage,
          },
        },
      });
      await brandRes.refresh();
      Alert.alert('Saved', 'Logo and brand styling updated successfully!');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save logo settings.');
    } finally {
      setSaving(false);
    }
  };

  const effectiveBusinessName =
    gbpPlace.data?.place?.title || brandRes.data?.profile?.businessName || 'My Business';

  return (
    <Screen scrollable={false}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* ── App Bar Header ── */}
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Logo Management</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 22 }}
      >
        {/* ── SECTION 1: LOGO ── */}
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>Logo</Text>
          <Text style={styles.sectionSubtitle}>All files format supported</Text>

          {/* Logo File Pill */}
          <View style={styles.filePill}>
            <View style={styles.filePillLeft}>
              <View style={styles.fileThumbWrap}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.fileThumbImg} resizeMode="contain" />
                ) : (
                  <View style={styles.fileThumbGradient}>
                    <MaterialIcons name="image" size={18} color="#6366F1" />
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={styles.fileNameText}>
                {logoFileName}
              </Text>
            </View>

            <View style={styles.filePillActions}>
              <Pressable
                hitSlop={8}
                onPress={() => setPreviewModalVisible(true)}
                style={styles.pillIconBtn}
                accessibilityLabel="Preview logo"
              >
                <MaterialIcons name="remove-red-eye" size={20} color="#0F172A" />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={handleDownload}
                style={styles.pillIconBtn}
                accessibilityLabel="Download logo"
              >
                <MaterialIcons name="file-download" size={20} color="#0F172A" />
              </Pressable>
            </View>
          </View>

          {/* Action Buttons: Upload & Generate with AI */}
          <View style={styles.btnRow}>
            <Pressable onPress={handlePickFile} style={styles.uploadBtn}>
              <MaterialIcons name="arrow-upward" size={18} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Upload file</Text>
            </Pressable>

            <Pressable
              onPress={handleGenerateWithAi}
              disabled={generatingAi}
              style={[styles.aiBtn, generatingAi && { opacity: 0.6 }]}
            >
              {generatingAi ? (
                <ActivityIndicator size="small" color="#1E6FFB" />
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={18} color="#1E6FFB" />
                  <Text style={styles.aiBtnText}>Generate with AI</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── SECTION 2: BRAND COLORS ── */}
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>Brand Colors</Text>
          <View style={styles.colorsRow}>
            {/* Primary Brand Color Card */}
            <Pressable
              onPress={() => {
                setColorPickerTarget('brand');
                setCustomHex(brandColor);
              }}
              style={styles.colorCard}
            >
              <View style={[styles.colorSwatch, { backgroundColor: brandColor }]} />
              <Text style={styles.colorCardLabel}>Brand Color</Text>
            </Pressable>

            {/* Secondary Color Card */}
            <Pressable
              onPress={() => {
                setColorPickerTarget('secondary');
                setCustomHex(secondaryColor);
              }}
              style={styles.colorCard}
            >
              <View style={[styles.colorSwatch, { backgroundColor: secondaryColor }]} />
              <Text style={styles.colorCardLabel}>Secondary Color</Text>
            </Pressable>
          </View>
        </View>

        {/* ── SECTION 3: SELECT LOGO USAGE ── */}
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>Select Logo Usage</Text>
          <View style={styles.usageRow}>
            {/* Original Card */}
            <Pressable
              onPress={() => setLogoUsage('original')}
              style={[
                styles.usageCard,
                styles.usageCardLight,
                logoUsage === 'original' && styles.usageCardActive,
              ]}
            >
              <View style={styles.usageLogoCenter}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.usageLogoImg} resizeMode="contain" />
                ) : (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="wb-sunny" size={28} color={brandColor} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: brandColor }}>
                      {effectiveBusinessName}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.usageLabel,
                  logoUsage === 'original' && styles.usageLabelActive,
                ]}
              >
                Original
              </Text>
            </Pressable>

            {/* Black Background Card */}
            <Pressable
              onPress={() => setLogoUsage('black_background')}
              style={[
                styles.usageCard,
                styles.usageCardDark,
                logoUsage === 'black_background' && styles.usageCardActive,
              ]}
            >
              <View style={styles.usageLogoCenter}>
                {logoUri ? (
                  <Image
                    source={{ uri: logoUri }}
                    style={[styles.usageLogoImg, { tintColor: '#FFFFFF' }]}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="wb-sunny" size={28} color={secondaryColor} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                      {effectiveBusinessName}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.usageLabel,
                  logoUsage === 'black_background' && styles.usageLabelActive,
                ]}
              >
                Black Background
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── SECTION 4: PREVIEW ── */}
        <View style={{ gap: 6 }}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <Text style={styles.previewSubtext}>*Image is for representational purposes</Text>

          <View style={styles.mockupContainer}>
            <Image
              source={{ uri: DEFAULT_SAMPLE_PHOTO }}
              style={styles.mockupImage}
              resizeMode="cover"
            />
            {/* Watermark in bottom right corner */}
            <View
              style={[
                styles.watermarkPill,
                logoUsage === 'black_background'
                  ? { backgroundColor: 'rgba(0,0,0,0.85)' }
                  : { backgroundColor: 'rgba(255,255,255,0.92)' },
              ]}
            >
              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={[
                    styles.watermarkImg,
                    logoUsage === 'black_background' && { tintColor: '#FFFFFF' },
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons
                    name="wb-sunny"
                    size={16}
                    color={logoUsage === 'black_background' ? secondaryColor : brandColor}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: logoUsage === 'black_background' ? '#FFFFFF' : brandColor,
                    }}
                  >
                    {effectiveBusinessName}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── SAVE ACTION ── */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* ── FULL PREVIEW MODAL ── */}
      <Modal visible={previewModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.previewModalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Logo Preview</Text>
              <Pressable hitSlop={10} onPress={() => setPreviewModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <View style={styles.previewModalBody}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={{ width: 180, height: 180 }} resizeMode="contain" />
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="wb-sunny" size={56} color={brandColor} />
                  <Text style={{ fontSize: 18, fontWeight: '900', color: brandColor }}>
                    {effectiveBusinessName}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── COLOR PICKER MODAL ── */}
      <Modal visible={colorPickerTarget !== null} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.colorPickerBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                Select {colorPickerTarget === 'brand' ? 'Brand Color' : 'Secondary Color'}
              </Text>
              <Pressable hitSlop={10} onPress={() => setColorPickerTarget(null)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.paletteGrid}>
              {PRESET_COLORS.map((item) => (
                <Pressable
                  key={item.hex}
                  onPress={() => {
                    if (colorPickerTarget === 'brand') setBrandColor(item.hex);
                    else setSecondaryColor(item.hex);
                    setColorPickerTarget(null);
                  }}
                  style={{ alignItems: 'center', gap: 4, width: '22%', marginBottom: 12 }}
                >
                  <View style={[styles.paletteCircle, { backgroundColor: item.hex }]} />
                  <Text numberOfLines={1} style={{ fontSize: 11, color: '#475569' }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>Custom Hex Code</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={customHex}
                  onChangeText={setCustomHex}
                  placeholder="#1E6FFB"
                  placeholderTextColor="#94A3B8"
                  style={styles.hexInput}
                />
                <Pressable
                  onPress={() => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(customHex.trim())) {
                      if (colorPickerTarget === 'brand') setBrandColor(customHex.trim());
                      else setSecondaryColor(customHex.trim());
                      setColorPickerTarget(null);
                    } else {
                      Alert.alert('Invalid Hex', 'Please enter a valid 6-digit hex code like #1E6FFB');
                    }
                  }}
                  style={styles.applyHexBtn}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Apply</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  filePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  fileThumbWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileThumbImg: {
    width: 36,
    height: 36,
  },
  fileThumbGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  filePillActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillIconBtn: {
    padding: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  uploadBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1E6FFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  aiBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E6FFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aiBtnText: {
    color: '#1E6FFB',
    fontWeight: '700',
    fontSize: 14,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  colorCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  usageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  usageCard: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  usageCardLight: {
    backgroundColor: '#F8FAFC',
  },
  usageCardDark: {
    backgroundColor: '#000000',
  },
  usageCardActive: {
    borderColor: '#1E6FFB',
  },
  usageLogoCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  usageLogoImg: {
    width: 70,
    height: 70,
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  usageLabelActive: {
    color: '#1E6FFB',
  },
  previewSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  mockupContainer: {
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    marginTop: 4,
  },
  mockupImage: {
    width: '100%',
    height: '100%',
  },
  watermarkPill: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  watermarkImg: {
    width: 34,
    height: 34,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#009F50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewModalBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewModalBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  colorPickerBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  paletteCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  hexInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  applyHexBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1E6FFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
