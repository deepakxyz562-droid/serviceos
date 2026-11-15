import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

export default function PhotoUploadScreen() {
  const router = useRouter();
  const { selectedTemplate, coinsAvailable, startGeneration } = useAppStore();
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Camera permission is required to take a selfie.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Photo gallery access is required to choose a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Selection Error', e.message);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImageUri) {
      Alert.alert('Photo Required', 'Please choose or snap a portrait photo first.');
      return;
    }

    const cost = selectedTemplate?.coin_cost || 5;
    if (coinsAvailable < cost) {
      Alert.alert(
        'Insufficient Coins',
        `You need ${cost} coins to generate this portrait. You currently have ${coinsAvailable} coins.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Coins', onPress: () => router.push('/coins') },
        ]
      );
      return;
    }

    try {
      setIsSubmitting(true);
      // Initiate generation job
      await startGeneration([selectedImageUri], selectedTemplate?.aspect_ratio);
      router.replace('/generate/progress');
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Your Photo</Text>
        <View style={styles.coinPill}>
          <Text style={styles.coinText}>🪙 {coinsAvailable}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Box */}
        {selectedImageUri ? (
          <View style={styles.previewBox}>
            <Image source={{ uri: selectedImageUri }} style={styles.selectedImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.replaceBtn}
              onPress={() => pickImage(false)}
            >
              <Ionicons name="camera-reverse" size={16} color="#FFF" />
              <Text style={styles.replaceBtnText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadCard}>
            <Ionicons name="cloud-upload" size={48} color={THEME.colors.accentViolet} />
            <Text style={styles.uploadTitle}>Upload Your Portrait</Text>
            <Text style={styles.uploadSubtitle}>Choose a clear selfie or portrait for best AI likeness</Text>

            <View style={styles.pickerActionsRow}>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => pickImage(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={styles.pickerBtnText}>Take Selfie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerBtn, styles.galleryBtn]}
                onPress={() => pickImage(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="images" size={20} color="#FFF" />
                <Text style={styles.pickerBtnText}>From Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quality Guidelines Card */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>For Best Results:</Text>
          <View style={styles.guideItem}>
            <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
            <Text style={styles.guideText}>Single person, front-facing portrait</Text>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
            <Text style={styles.guideText}>Natural lighting, clear details without blur</Text>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="close-circle" size={18} color={THEME.colors.error} />
            <Text style={styles.guideText}>Avoid sunglasses, masks, or extreme angles</Text>
          </View>
        </View>

        {/* Cost summary note */}
        <View style={styles.costNote}>
          <Text style={styles.costNoteText}>
            Generation cost: <Text style={{ color: THEME.colors.coinGold, fontWeight: '700' }}>🪙 {selectedTemplate?.coin_cost || 5} coins</Text>. Coins are only captured if generation succeeds.
          </Text>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.generateBtn, !selectedImageUri && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={!selectedImageUri || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#FFF" />
              <Text style={styles.generateBtnText}>
                Generate AI Portrait (🪙 {selectedTemplate?.coin_cost || 5})
              </Text>
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  coinPill: {
    backgroundColor: THEME.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  coinText: {
    color: THEME.colors.coinGold,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 16,
  },
  uploadCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    gap: 10,
    marginTop: 8,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 12,
    borderRadius: THEME.radii.lg,
    gap: 8,
  },
  galleryBtn: {
    backgroundColor: THEME.colors.bgCardLighter,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  pickerBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewBox: {
    width: '100%',
    height: 340,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: THEME.colors.accentViolet,
    marginTop: 8,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  replaceBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 1, 44, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radii.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  replaceBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  guideCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  guideTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
  },
  costNote: {
    paddingHorizontal: 8,
  },
  costNoteText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.bgSecondary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 15,
    borderRadius: THEME.radii.lg,
    gap: 8,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
