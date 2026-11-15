import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../../src/theme/tokens';
import { useAppStore, INITIAL_STYLES, StyleItem } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function PhotoStudioScreen() {
  const router = useRouter();
  const {
    selectedStyle,
    selectStyle,
    uploadedPhotoUri,
    setUploadedPhotoUri,
    startGeneration,
    coinsAvailable,
  } = useAppStore();

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(uploadedPhotoUri);

  const handlePickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setSelectedPhoto(uri);
      setUploadedPhotoUri(uri);
    }
  };

  const handlePickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setSelectedPhoto(uri);
      setUploadedPhotoUri(uri);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPhoto) {
      // If user hasn't uploaded yet, provide an instant demo model selfie or prompt
      setSelectedPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80');
      setUploadedPhotoUri('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80');
    }

    if (coinsAvailable < 5) {
      Alert.alert('Insufficient Credits', 'You need at least 5 credits to generate an AI portrait.', [
        { text: 'Get Credits', onPress: () => router.push('/coins') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    try {
      const photoToUse = selectedPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
      await startGeneration([photoToUse], '9:16');
      router.push('/generate/progress');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Starting generation...');
      router.push('/generate/progress');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>AI Photo Studio</Text>

        <TouchableOpacity onPress={() => router.push('/paywall')} style={styles.crownBtn}>
          <Ionicons name="sparkles" size={18} color="#FBBF24" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Upload Box */}
        <View style={styles.uploadBox}>
          {selectedPhoto ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedPhoto }} style={styles.uploadedImg} />
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={() => setSelectedPhoto(null)}
              >
                <Ionicons name="close-circle" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="image-outline" size={32} color={THEME.colors.accentViolet} />
              </View>
              <Text style={styles.uploadTitle}>Upload Your Photo</Text>
              <Text style={styles.uploadSubtitle}>or choose from gallery</Text>

              {/* Split Camera and Gallery Buttons */}
              <View style={styles.splitBtnsRow}>
                <TouchableOpacity
                  style={styles.splitBtn}
                  onPress={handlePickCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.splitBtnText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.splitBtn}
                  onPress={handlePickGallery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.splitBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Popular Styles Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Popular Styles</Text>
          <TouchableOpacity onPress={() => router.push('/photo-studio/choose-style')}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Strip of Popular Styles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stylesRail}
        >
          {INITIAL_STYLES.slice(0, 4).map((style) => {
            const isSelected = selectedStyle?.id === style.id;
            return (
              <TouchableOpacity
                key={style.id}
                style={[styles.styleCard, isSelected && styles.styleCardActive]}
                onPress={() => selectStyle(style)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: style.thumbnailUrl }} style={styles.styleImg} />
                <View style={styles.styleNameTag}>
                  <Text style={styles.styleNameText} numberOfLines={1}>
                    {style.name}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={THEME.colors.accentViolet} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScrollView>

      {/* Sticky Bottom Generate Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerate}
          activeOpacity={0.88}
        >
          <Text style={styles.generateBtnText}>Generate Image</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  crownBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  uploadBox: {
    width: '100%',
    height: 250,
    borderRadius: THEME.radii.xl,
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 24,
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  uploadedImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  splitBtnsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  splitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCardLighter,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.radii.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  splitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    fontWeight: '700',
  },
  stylesRail: {
    gap: 12,
  },
  styleCard: {
    width: 82,
    height: 105,
    borderRadius: THEME.radii.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    position: 'relative',
  },
  styleCardActive: {
    borderColor: THEME.colors.accentViolet,
    borderWidth: 2,
  },
  styleImg: {
    width: '100%',
    height: '100%',
  },
  styleNameTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8,0,20,0.75)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  styleNameText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFF',
    borderRadius: 9,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  generateBtn: {
    height: 52,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
