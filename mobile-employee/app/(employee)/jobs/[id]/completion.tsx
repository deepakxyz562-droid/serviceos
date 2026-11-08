/** Guided completion: work, evidence, sign-off, then review. Proof is saved
 * independently; a single lifecycle request completes the job after validation. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  type ViewStyle,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Svg, { Path, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  PenLine,
  ClipboardList,
  ClipboardCheck,
  CircleCheck,
  Circle,
  CircleAlert,
  Trash2,
  Check,
  FileText,
  X,
  Wrench,
  Mic,
  MicOff,
  Plus,
  Minus,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { Button } from '@/components/ui/Button';
import { formatCurrency, currencyCode } from '@/lib/currency';
import { hasLinkedChecklist, lineItemTotal } from '@/lib/job-presentation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { NotesPolishButton } from '@/components/ai/NotesPolishButton';
import { useAuthStore } from '@/stores/auth-store';
import {
  useJob,
  useJobChecklist,
  useJobChecklistRecord,
  useJobPhotos,
  useJobSignatures,
  useUploadJobPhoto,
  useDeleteJobPhoto,
  useToggleChecklistItem,
  useUploadSignature,
  useJobLifecycle,
} from '@/hooks/use-jobs';
import * as Haptics from 'expo-haptics';
import { api, assetUrl, ApiRequestError } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { captureGps } from '@/lib/gps';
import { trackingManager } from '@/lib/tracking-manager';
import { enqueueSignature } from '@/lib/offline-queue';
import {
  buildPhotoFormData,
  strokeToPath,
  strokesToPngDataUrlWeb,
  dataUrlToBlob,
  SIGNATURE_STROKE_COLOR,
  SIGNATURE_STROKE_WIDTH,
  type Stroke,
} from '@/lib/job-proof-helpers';
import type { JobPhoto, JobSignature, ChecklistItem, JobLineItem } from '@/types';

// ── Constants ───────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIG_CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 48, 460);
const SIG_CANVAS_HEIGHT = 200;
const PHOTO_THUMB_SIZE = 88;

const TRADE_PRESETS: Array<{ name: string; rate: number; type: 'material' | 'labor' }> = [
  { name: '45uF Capacitor', rate: 45, type: 'material' },
  { name: 'Extra Labor 30m', rate: 50, type: 'labor' },
  { name: 'Pipe Fitting 3/4"', rate: 25, type: 'material' },
  { name: 'Refrigerant 2 lbs', rate: 85, type: 'material' },
  { name: 'Flush Drain Line', rate: 40, type: 'labor' },
  { name: 'Service Call Fee', rate: 75, type: 'labor' },
];

const VOICE_PRESET_PROMPTS = [
  'Used 45uF capacitor $45 and 30m extra pipe flushing labor $50',
  'Replaced blower fan motor $140, all work completed and tested',
  'Installed 2 copper fittings $30, topped up refrigerant $85',
  'Completed annual service, replaced air filters $35, ready to close',
];

// ── InlinePhotoCapture ──────────────────────────────────────────────

/**
 * Inline photo capture section — renders a camera button + thumbnail grid for
 * a single photoType ('before' | 'after' | 'progress' | 'issue').
 *
 * Reuses useUploadJobPhoto (which invalidates ['job', id, 'photos']) so the
 * thumbnail grid refreshes automatically. Best-effort GPS attach + offline
 * queue fallback are inherited from the shared buildPhotoFormData helper.
 *
 * The parent passes `onPhotosChange` so it can re-derive its chip state — but
 * because both layers share the TanStack Query cache, the parent's own
 * useJobPhotos subscription also re-fires. The callback is a convenience for
 * parents that don't subscribe.
 */
function InlinePhotoCapture({
  jobId,
  photoType,
  description,
  accentColor,
  onPhotosChange,
}: {
  jobId: string;
  photoType: 'before' | 'after';
  description: string;
  accentColor: string;
  onPhotosChange?: (photos: JobPhoto[]) => void;
}) {
  const { show } = useToast();
  const photosQuery = useJobPhotos(jobId);
  const uploadPhoto = useUploadJobPhoto();
  const deletePhoto = useDeleteJobPhoto();

  const photos = useMemo(
    () =>
      (photosQuery.data ?? []).filter((p) => p.photoType === photoType),
    [photosQuery.data, photoType]
  );

  // Notify parent whenever the filtered photo list changes.
  useEffect(() => {
    onPhotosChange?.(photos);
  }, [photos, onPhotosChange]);

  const handleCapture = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera permission required',
          'Please grant camera access in your settings to take photos.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      // Best-effort GPS — non-blocking.
      const gps = await captureGps();
      const fd = await buildPhotoFormData(asset, gps);
      fd.append('photoType', photoType);

      await uploadPhoto.mutateAsync({ id: jobId, formData: fd });
      show(`${photoType === 'before' ? 'Before' : 'After'} photo saved.`, 'success');
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Photo upload failed.',
        'error'
      );
    }
  }, [jobId, photoType, uploadPhoto, show]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo library permission required',
          'Please grant photo library access in your settings.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      const gps = await captureGps();
      const fd = await buildPhotoFormData(asset, gps);
      fd.append('photoType', photoType);

      await uploadPhoto.mutateAsync({ id: jobId, formData: fd });
      show(`${photoType === 'before' ? 'Before' : 'After'} photo saved.`, 'success');
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Photo upload failed.',
        'error'
      );
    }
  }, [jobId, photoType, uploadPhoto, show]);

  const handleDelete = useCallback(
    (photo: JobPhoto) => {
      Alert.alert(
        'Delete photo?',
        'This will permanently remove the photo from the job.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePhoto.mutateAsync({ jobId, photoId: photo.id });
                show('Photo deleted.', 'success');
              } catch (err) {
                show(
                  err instanceof Error ? err.message : 'Delete failed.',
                  'error'
                );
              }
            },
          },
        ]
      );
    },
    [jobId, deletePhoto, show]
  );

  const isUploading = uploadPhoto.isPending;

  return (
    <View>
      <Text className="text-xs text-muted-foreground mb-2">{description}</Text>

      {/* Thumbnail grid + capture button row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8, paddingVertical: 2 }}
      >
        {/* Capture button */}
        <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
          <Pressable
            onPress={handleCapture}
            disabled={isUploading}
            style={{
              width: PHOTO_THUMB_SIZE,
              height: PHOTO_THUMB_SIZE,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: accentColor,
              borderStyle: 'dashed',
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isUploading ? 0.5 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Capture ${photoType} photo with camera`}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <>
                <Camera size={22} color={accentColor} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: accentColor,
                    marginTop: 2,
                  }}
                >
                  Camera
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handlePickFromGallery}
            disabled={isUploading}
            style={{
              width: PHOTO_THUMB_SIZE,
              height: PHOTO_THUMB_SIZE,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: COLORS.border,
              backgroundColor: '#F9FAFB',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isUploading ? 0.5 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Pick ${photoType} photo from gallery`}
          >
            <ImagePlus size={22} color={COLORS.mutedForeground} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: COLORS.mutedForeground,
                marginTop: 2,
              }}
            >
              Gallery
            </Text>
          </Pressable>
        </View>

        {/* Thumbnails */}
        {photos.map((p) => {
          const url = assetUrl(p.url) || p.url;
          return (
            <Pressable
              key={p.id}
              onLongPress={() => handleDelete(p)}
              style={{ marginRight: 8, position: 'relative' }}
              accessibilityLabel={`${photoType} photo — long-press to delete`}
            >
              <Image
                source={{ uri: url }}
                style={{
                  width: PHOTO_THUMB_SIZE,
                  height: PHOTO_THUMB_SIZE,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
                resizeMode="cover"
                accessibilityLabel={`${photoType} photo`}
                alt={`${photoType} photo`}
              />
              <Pressable
                onPress={() => handleDelete(p)}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#DC2626',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${photoType} photo`}
              >
                <X size={12} color="#FFFFFF" />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mt-2 text-xs text-muted-foreground">
        {photos.length === 0
          ? `No ${photoType} photos yet — tap Camera to capture.`
          : `${photos.length} ${photoType} photo${photos.length > 1 ? 's' : ''} captured. Long-press a thumbnail to delete.`}
      </Text>
    </View>
  );
}

// ── InlineSignaturePad ──────────────────────────────────────────────

/**
 * Inline signature pad — renders an SVG canvas + signer-name input + Save/Clear
 * buttons. On Save, renders the strokes to a PNG (native: react-native-view-shot
 * captureRef; web: HTML5 canvas) and uploads via useUploadSignature.
 *
 * Existing signatures of the matching signerType are shown as thumbnails above
 * the pad (read-only — deletion is supported in the dedicated /signature route).
 */
function InlineSignaturePad({
  jobId,
  signerType,
  defaultSignerName,
  defaultRole,
  accentColor,
  onSignatureChange,
}: {
  jobId: string;
  signerType: 'customer' | 'employee';
  defaultSignerName?: string;
  defaultRole: string;
  accentColor: string;
  onSignatureChange?: (hasSignature: boolean, latest?: JobSignature) => void;
}) {
  const { show } = useToast();
  const signaturesQuery = useJobSignatures(jobId);
  const uploadSignature = useUploadSignature();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [signerName, setSignerName] = useState(defaultSignerName ?? '');

  useEffect(() => {
    if (defaultSignerName && !signerName) {
      setSignerName(defaultSignerName);
    }
  }, [defaultSignerName]);

  const svgContainerRef = useRef<View>(null);

  const signatures = useMemo(
    () =>
      (signaturesQuery.data ?? []).filter((s) => s.signatoryType === signerType),
    [signaturesQuery.data, signerType]
  );

  // Notify parent whenever signature presence changes.
  useEffect(() => {
    onSignatureChange?.(signatures.length > 0, signatures[signatures.length - 1]);
  }, [signatures, onSignatureChange]);

  const hasInk = strokes.length > 0 || currentStroke.length > 0;

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((e) => {
          setCurrentStroke([{ x: e.x, y: e.y }]);
        })
        .onUpdate((e) => {
          setCurrentStroke((prev) =>
            prev.length === 0 ? [{ x: e.x, y: e.y }] : [...prev, { x: e.x, y: e.y }]
          );
        })
        .onEnd(() => {
          setCurrentStroke((prev) => {
            if (prev.length > 0) {
              setStrokes((s) => [...s, prev]);
            }
            return [];
          });
        }),
    []
  );

  const handleClear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasInk) {
      show('Please draw a signature first.', 'warning');
      return;
    }
    if (!signerName.trim()) {
      show('Please enter the signer name.', 'warning');
      return;
    }
    if (!jobId) return;

    const allStrokes =
      currentStroke.length > 0 ? [...strokes, currentStroke] : strokes;

    try {
      let formData: FormData;

      let savedUri = '';
      if (Platform.OS === 'web') {
        const dataUrl = strokesToPngDataUrlWeb(allStrokes, SIG_CANVAS_WIDTH, SIG_CANVAS_HEIGHT);
        if (!dataUrl) throw new Error('Failed to render signature.');
        savedUri = dataUrl;
        const blob = dataUrlToBlob(dataUrl);
        formData = new FormData();
        formData.append('file', blob, 'signature.png');
      } else {
        if (!svgContainerRef.current) {
          throw new Error('Signature pad not ready.');
        }
        const fileUri = await captureRef(svgContainerRef, {
          format: 'png',
          quality: 1,
        });
        savedUri = fileUri;
        formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          name: 'signature.png',
          type: 'image/png',
        } as unknown as Blob);
      }

      formData.append('type', signerType);
      formData.append('signerName', signerName.trim());

      const gps = await captureGps();
      if (gps) {
        formData.append('latitude', String(gps.latitude));
        formData.append('longitude', String(gps.longitude));
        if (gps.accuracy !== null && gps.accuracy !== undefined) {
          formData.append('accuracy', String(gps.accuracy));
        }
      }

      try {
        await uploadSignature.mutateAsync({ id: jobId, formData });
        show(`${defaultRole} signature saved.`, 'success');
        handleClear();
      } catch (uploadErr) {
        if (!(uploadErr instanceof ApiRequestError) || uploadErr.statusCode !== 0) throw uploadErr;
        // Only a connectivity failure may be queued; rejected uploads stay visible.
        console.warn('[completion] signature upload failed, queuing offline:', uploadErr);
        await enqueueSignature(jobId, savedUri, signerType, signerName, gps);
        show(`${defaultRole} signature saved on this device; upload pending`, 'info');
        handleClear();
      }
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Save failed. Please try again.',
        'error'
      );
    }
  }, [
    hasInk,
    signerName,
    signerType,
    defaultRole,
    jobId,
    strokes,
    currentStroke,
    uploadSignature,
    show,
    handleClear,
  ]);

  return (
    <View>
      {/* Existing signatures thumbnails */}
      {signatures.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 8,
          }}
        >
          {signatures.map((s) => {
            const url = assetUrl(s.signatureUrl) || s.signatureUrl;
            return (
              <View
                key={s.id}
                style={{
                  width: '48%',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={{ uri: url }}
                  style={{ width: '100%', height: 56, backgroundColor: '#FFFFFF' }}
                  resizeMode="contain"
                  accessibilityLabel={`${defaultRole} signature by ${s.signatoryName || 'unknown'}`}
                  alt={`${defaultRole} signature by ${s.signatoryName || 'unknown'}`}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.mutedForeground,
                    padding: 4,
                  }}
                  numberOfLines={1}
                >
                  {s.signatoryName || defaultRole}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Signer name */}
      <TextInput
        value={signerName}
        onChangeText={setSignerName}
        placeholder={
          signerType === 'customer'
            ? "Customer's full name"
            : 'Your name'
        }
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: COLORS.foreground,
          marginBottom: 8,
        }}
      />

      {/* Signature canvas */}
      <GestureDetector gesture={panGesture}>
        <View
          ref={svgContainerRef}
          style={{
            width: SIG_CANVAS_WIDTH,
            height: SIG_CANVAS_HEIGHT,
            borderWidth: 2,
            borderColor: COLORS.border,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            alignSelf: 'center',
          }}
        >
          <Svg width={SIG_CANVAS_WIDTH} height={SIG_CANVAS_HEIGHT}>
            <Rect x={0} y={0} width={SIG_CANVAS_WIDTH} height={SIG_CANVAS_HEIGHT} fill="#FFFFFF" />
            {/* Baseline */}
            <Rect
              x={16}
              y={SIG_CANVAS_HEIGHT - 32}
              width={SIG_CANVAS_WIDTH - 32}
              height={1}
              fill="#D1D5DB"
            />
            {strokes.map((stroke, i) => (
              <Path
                key={`s-${i}`}
                d={strokeToPath(stroke)}
                stroke={SIGNATURE_STROKE_COLOR}
                strokeWidth={SIGNATURE_STROKE_WIDTH}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {currentStroke.length > 0 && (
              <Path
                d={strokeToPath(currentStroke)}
                stroke={SIGNATURE_STROKE_COLOR}
                strokeWidth={SIGNATURE_STROKE_WIDTH}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </Svg>
          {!hasInk ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 8,
                alignItems: 'center',
              }}
              pointerEvents="none"
            >
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                Sign here
              </Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      {/* Controls */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Pressable
          onPress={handleClear}
          disabled={!hasInk || uploadSignature.isPending}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: accentColor,
            backgroundColor: 'transparent',
            opacity: !hasInk || uploadSignature.isPending ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Clear signature"
        >
          <Trash2 size={16} color={accentColor} />
          <Text style={{ marginLeft: 6, fontSize: 14, fontWeight: '600', color: accentColor }}>
            Clear
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={!hasInk || uploadSignature.isPending}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: accentColor,
            opacity: !hasInk || uploadSignature.isPending ? 0.6 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Save ${defaultRole} signature`}
        >
          {uploadSignature.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Check size={16} color="#FFFFFF" />
          )}
          <Text style={{ marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
            Save
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── InlineChecklist ─────────────────────────────────────────────────

/**
 * Inline checklist — renders each item as a tappable row (icon + label).
 * Toggling fires useToggleChecklistItem (PATCH /api/jobs/[id]/checklist/item/[itemId]).
 * Reports completion % upward via onCompletionChange.
 */
function InlineChecklist({
  jobId,
  onCompletionChange,
}: {
  jobId: string;
  onCompletionChange?: (percentComplete: number, total: number, done: number) => void;
}) {
  const { show } = useToast();
  const checklistQuery = useJobChecklist(jobId);
  const toggleItem = useToggleChecklistItem();

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const items: ChecklistItem[] = checklistQuery.data ?? [];

  const total = items.length;
  const done = useMemo(() => items.filter((i) => i.checked).length, [items]);
  const percent = total > 0 ? (done / total) * 100 : 0;

  // Notify parent of completion changes.
  useEffect(() => {
    onCompletionChange?.(percent, total, done);
  }, [percent, total, done, onCompletionChange]);

  const handleToggle = useCallback(
    async (item: ChecklistItem) => {
      if (togglingId) return;
      setTogglingId(item.id);
      try {
        await toggleItem.mutateAsync({
          jobId,
          itemId: item.id,
          checked: !item.checked,
        });
      } catch (err) {
        // Surface error but keep the local cache authoritative — the next
        // refetch will correct any optimistic drift.
        const isNetwork =
          err instanceof ApiRequestError &&
          (err.statusCode === 0 || err.statusCode >= 500);
        show(
          isNetwork
            ? 'Network error — try again when online.'
            : err instanceof Error
              ? err.message
              : 'Update failed.',
          'error'
        );
      } finally {
        setTogglingId(null);
      }
    },
    [jobId, togglingId, toggleItem, show]
  );

  if (checklistQuery.isLoading && items.length === 0) {
    return (
      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={{ marginTop: 6, fontSize: 12, color: COLORS.mutedForeground }}>
          Loading checklist…
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: '#F9FAFB',
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text style={{ fontSize: 13, color: COLORS.mutedForeground, fontStyle: 'italic' }}>
          No checklist items available. Photos and customer sign-off are checked separately.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Mini progress bar */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: COLORS.mutedForeground, flex: 1 }}>
          {done} of {total} completed
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>
          {Math.round(percent)}%
        </Text>
      </View>
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: '#E5E7EB',
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: percent === 100 ? COLORS.success : COLORS.primary,
          }}
        />
      </View>

      {/* Items */}
      <View style={{ gap: 6 }}>
        {items.map((item) => {
          const isToggling = togglingId === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleToggle(item)}
              disabled={!!togglingId}
              accessibilityRole="button"
              accessibilityLabel={
                item.checked
                  ? `Mark "${item.label}" as incomplete`
                  : `Mark "${item.label}" as complete`
              }
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: COLORS.border,
                opacity: togglingId && !isToggling ? 0.6 : 1,
              }}
            >
              <View style={{ marginRight: 10, marginTop: 1 }}>
                {isToggling ? (
                  <ActivityIndicator size={18} color={COLORS.primary} />
                ) : item.checked ? (
                  <CircleCheck size={20} color={COLORS.success} />
                ) : (
                  <Circle size={20} color={COLORS.mutedForeground} />
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: item.checked ? COLORS.mutedForeground : COLORS.foreground,
                  textDecorationLine: item.checked ? 'line-through' : 'none',
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── ValidationChip ──────────────────────────────────────────────────

// ── SectionHeader ───────────────────────────────────────────────────

function SectionHeader({
  icon,
  iconColor,
  title,
  required,
  badge,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  required?: boolean;
  badge?: string;
}) {
  const Icon = icon;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
      <Icon size={16} color={iconColor} />
      <Text
        style={{
          marginLeft: 6,
          fontSize: 14,
          fontWeight: '700',
          color: COLORS.foreground,
        }}
      >
        {title}
      </Text>
      {required ? (
        <View
          style={{
            marginLeft: 8,
            paddingVertical: 2,
            paddingHorizontal: 6,
            borderRadius: 4,
            backgroundColor: '#FEE2E2',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#B91C1C',
              textTransform: 'uppercase',
            }}
          >
            Required
          </Text>
        </View>
      ) : null}
      {badge ? (
        <Text
          style={{
            marginLeft: 8,
            fontSize: 12,
            color: COLORS.mutedForeground,
          }}
        >
          {badge}
        </Text>
      ) : null}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────

export default function JobCompletionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const jobQuery = useJob(id);
  const photosQuery = useJobPhotos(id);
  const signaturesQuery = useJobSignatures(id);
  const checklistQuery = useJobChecklist(id);
  const checklistRecord = useJobChecklistRecord(id);
  const lifecycle = useJobLifecycle();

  const user = useAuthStore((s) => s.user);
  const tenantCurrency = useAuthStore((s) => s.tenant?.currency);
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const initializedJob = useRef<string | null>(null);
  const initialItems = useRef('[]');
  const savedQuotedTotal = useRef<number | null>(null);
  const goToStep = (next: number) => { setStep(next); scrollRef.current?.scrollTo({ y: 0, animated: false }); };
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<JobLineItem[]>([]);
  const [showWrapUpModal, setShowWrapUpModal] = useState(false);
  const [wrapUpTranscript, setWrapUpTranscript] = useState('');
  const [wrapUpLoading, setWrapUpLoading] = useState(false);

  const {
    isListening: isWrapUpListening,
    setTranscript: setSpeechTranscript,
    startListening: startWrapUpListening,
    stopListening: stopWrapUpListening,
    resetTranscript: resetWrapUpTranscript,
  } = useSpeechRecognition({
    onResult: (text) => {
      setWrapUpTranscript(text);
    },
  });

  // Automatically start listening when voice wrap up modal opens
  useEffect(() => {
    if (showWrapUpModal) {
      const timer = setTimeout(() => {
        startWrapUpListening();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopWrapUpListening();
    }
  }, [showWrapUpModal, startWrapUpListening, stopWrapUpListening]);

  const job = jobQuery.data;

  // Refetches after photo/checklist uploads must not overwrite unsaved edits.
  useEffect(() => {
    if (!job || initializedJob.current === job.id) return;
    initializedJob.current = job.id;
    const items = job.lineItems ?? [];
    initialItems.current = JSON.stringify(items);
    savedQuotedTotal.current = job.quotedAmount ?? null;
    setLineItems(items);
    setNotes(job.completionNotes || '');
  }, [job]);

  const handleVoiceWrapUp = async () => {
    const text = wrapUpTranscript.trim();
    if (!text) {
      show('Please speak or type extra parts / work first.', 'warning');
      return;
    }

    stopWrapUpListening();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setWrapUpLoading(true);

    try {
      const res = await api.post<{
        success: boolean;
        spokenFeedback?: string;
        data?: {
          newItems?: any[];
          additionalTotal?: number;
          completionNotes?: string;
        };
        error?: string;
      }>('/api/ai/voice-command', {
        transcript: text,
        jobId: id,
      });

      if (!res || !res.success) {
        show(res?.spokenFeedback || res?.error || 'Could not understand command.', 'error');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      show(res.spokenFeedback || 'Materials & extra work logged!', 'success');
      setWrapUpTranscript('');
      resetWrapUpTranscript();
      setShowWrapUpModal(false);

      if (res?.data?.newItems && Array.isArray(res.data.newItems)) {
        const items = res.data.newItems;
        setLineItems((prev) => [...prev, ...items]);
      }
      if (res?.data?.completionNotes) {
        const compNotes = res.data.completionNotes;
        setNotes((prev) => (prev ? `${prev}\n${compNotes}` : compNotes));
      }
    } catch (err: any) {
      show(err?.message || 'Failed to process voice command.', 'error');
    } finally {
      setWrapUpLoading(false);
    }
  };

  const handleAddManualItem = () => {
    const newItem: JobLineItem = {
      id: `mat_${Date.now()}`,
      name: '',
      description: 'Field material',
      quantity: 1,
      rate: 0,
      amount: 0,
      unitPrice: 0,
      total: 0,
      type: 'material',
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleAddPresetItem = (name: string, rate: number, type: 'material' | 'labor') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newItem: JobLineItem = {
      id: `${type === 'labor' ? 'lab' : 'mat'}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name,
      description: type === 'labor' ? 'Field labor' : 'Field part/material',
      quantity: 1,
      rate,
      unitPrice: rate,
      amount: rate,
      total: rate,
      type,
    };
    setLineItems((prev) => [...prev, newItem]);
    show(`Added ${name} ($${rate})`, 'success');
  };

  const handleIncrementQty = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const current = lineItems[index];
    const qty = (Number(current?.quantity) || 1) + 1;
    handleUpdateItem(index, { quantity: qty });
  };

  const handleDecrementQty = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const current = lineItems[index];
    const currentQty = Number(current?.quantity) || 1;
    if (currentQty > 1) {
      handleUpdateItem(index, { quantity: currentQty - 1 });
    }
  };

  const handleToggleItemType = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const current = lineItems[index];
    const newType = current?.type === 'labor' ? 'material' : 'labor';
    handleUpdateItem(index, { type: newType });
  };

  const handleUpdateItem = (index: number, updates: Partial<JobLineItem>) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };
      const qty = Number(current.quantity);
      const rate = Number(current.rate ?? current.unitPrice ?? 0);
      const amt = qty * rate;
      current.quantity = qty;
      current.rate = rate;
      current.unitPrice = rate;
      current.amount = amt;
      current.total = amt;
      copy[index] = current;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };
  const allPhotos: JobPhoto[] = photosQuery.data ?? job?.photos ?? [];
  const allSignatures: JobSignature[] =
    signaturesQuery.data ?? job?.signatures ?? [];
  const checklistItems: ChecklistItem[] =
    checklistQuery.data ?? job?.checklist ?? [];

  // ── Derive chip states ──────────────────────────────────────────
  const beforePhotos = useMemo(
    () => allPhotos.filter((p) => p.photoType === 'before'),
    [allPhotos]
  );
  const afterPhotos = useMemo(
    () => allPhotos.filter((p) => p.photoType === 'after'),
    [allPhotos]
  );
  const customerSigs = useMemo(
    () => allSignatures.filter((s) => s.signatoryType === 'customer'),
    [allSignatures]
  );
  const employeeSigs = useMemo(
    () => allSignatures.filter((s) => s.signatoryType === 'employee'),
    [allSignatures]
  );

  const checklistTotal = checklistItems.length;
  const checklistDone = checklistItems.filter((c) => c.checked).length;
  const checklistRequired = !!checklistRecord.data || hasLinkedChecklist(job?.linkedChecklistsJson);
  const checklistReady = !checklistRequired || checklistRecord.data?.status === 'completed';
  const proofLoading = photosQuery.isLoading || signaturesQuery.isLoading || checklistRecord.isLoading;
  const proofError = photosQuery.isError || signaturesQuery.isError || checklistRecord.isError;
  const requirements = [
    { label: checklistRequired ? 'Complete the linked checklist' : 'Checklist not required', ready: checklistReady, step: 0 },
    { label: 'Upload at least one before photo', ready: beforePhotos.length > 0, step: 1 },
    { label: 'Upload at least one after photo', ready: afterPhotos.length > 0, step: 1 },
    { label: 'Save the customer signature', ready: customerSigs.length > 0, step: 2 },
  ];
  const missing = requirements.filter((requirement) => !requirement.ready);
  const allPass = !proofLoading && !proofError && missing.length === 0;
  const total = lineItems.reduce((sum, item) => sum + lineItemTotal(item), 0);
  const invalidItems = lineItems.some((item) => !(item.name || item.description)?.trim() ||
    !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 ||
    !Number.isFinite(lineItemTotal(item)) || lineItemTotal(item) < 0);

  const saveChecklist = async () => {
    if (savingChecklist) return;
    setSavingChecklist(true);
    try {
      await api.patch(`/api/jobs/${id}/checklist`, { status: 'completed' });
      await checklistRecord.refetch();
      show('Checklist completed.', 'success');
    } catch (error) { show(error instanceof Error ? error.message : 'Could not complete checklist.', 'error'); }
    finally { setSavingChecklist(false); }
  };

  const handleSubmit = async () => {
    if (!allPass || !id || savingRef.current || invalidItems) return;
    savingRef.current = true;
    setSaving(true);
    setSubmissionError(null);
    try {
      if (JSON.stringify(lineItems) !== initialItems.current) {
        await api.put(`/api/jobs/${id}`, { lineItemsJson: JSON.stringify(lineItems), quotedAmount: total });
        initialItems.current = JSON.stringify(lineItems);
        savedQuotedTotal.current = total;
      }
      // The lifecycle endpoint validates persisted proof, closes time entries,
      // stores notes and creates the invoice. Do not also call complete-proof.
      await lifecycle.mutateAsync({ id, action: 'complete', completionNotes: notes.trim() });
      if (trackingManager.getState()?.jobId === id) trackingManager.stopTravelling();
      setCompleted(true);
    } catch (error) {
      if (error instanceof ApiRequestError && [0, 408].includes(error.statusCode)) {
        // A lost response does not establish whether the server completed it.
        const refreshed = await jobQuery.refetch();
        if (['completed', 'invoice_generated', 'paid'].includes(refreshed.data?.status || '')) {
          if (trackingManager.getState()?.jobId === id) trackingManager.stopTravelling();
          setCompleted(true);
        } else {
          setSubmissionError('Completion could not be confirmed. Check your connection and retry. Your entries are still here; the job is not marked complete in this screen.');
        }
      } else {
        setSubmissionError(error instanceof Error ? error.message : 'Could not complete the job. Please try again.');
      }
    } finally { savingRef.current = false; setSaving(false); }
  };

  // ── Loading + error states ──────────────────────────────────────
  if (jobQuery.isLoading && !job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Completion Proof" />
        <View className="mt-4 px-4">
          <Card className="h-40"><View /></Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Completion Proof" />
        <EmptyState
          icon={<ClipboardCheck size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={
            jobQuery.error instanceof Error
              ? jobQuery.error.message
              : 'Please go back and try again.'
          }
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // Footer style — sticky at bottom, padded for safe-area.
  const footerStyle: ViewStyle = {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    // The footer handles its own bottom safe-area inset (SafeAreaView uses
    // edges=['top'] only). max(12, bottomInset) ensures devices without a
    // home indicator still get sensible breathing room.
    paddingBottom: Math.max(12, insets.bottom),
  };

  const submitting = saving;

  if (completed) return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background px-6">
      <View className="flex-1 items-center justify-center">
        <CircleCheck size={56} color={COLORS.primary} />
        <Text className="mt-5 text-2xl font-bold text-foreground">Job completed</Text>
        <Text className="mt-3 text-center text-base text-muted-foreground">{job.title || 'Your job'} is complete. Your evidence and completion notes have been saved.</Text>
        <View className="mt-8 w-full"><Button fullWidth onPress={() => router.replace(`/(employee)/jobs/${id}`)}>Back to job details</Button></View>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => step > 0 ? goToStep(step - 1) : router.back()} title="Complete job" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <View className="border-b border-border bg-white px-4 pb-4">
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>{job.jobNumber ? `#${job.jobNumber} · ` : ''}{job.title || job.customer?.name}</Text>
        <View className="mt-4 flex-row gap-2">
          {['Work', 'Photos', 'Sign-off', 'Review'].map((label, index) => (
            <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: step === index }} onPress={() => goToStep(index)} className={`min-h-[48px] flex-1 items-center justify-center rounded-xl ${step === index ? 'bg-primary-700' : 'bg-muted'}`}>
              <Text className={`text-xs font-semibold ${step === index ? 'text-white' : 'text-muted-foreground'}`}>{index + 1}. {label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Scrollable body */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-2 text-xl font-bold text-foreground">{['Review the work', 'Document the result', 'Customer sign-off', 'Ready to complete?'][step]}</Text>
        <Text className="mb-5 text-sm leading-5 text-muted-foreground">{['Finish your checklist, review materials, and add a work summary.', 'Before and after photos must finish uploading before you can complete the job.', 'Collect customer approval. Employee signature is optional.', 'Review the saved evidence and charges before submitting.'][step]}</Text>
        {(proofError || proofLoading) && <Card className="mb-4">
          <Text className="text-sm text-muted-foreground">{proofLoading ? 'Checking saved evidence…' : 'Could not verify saved evidence. Completion is unavailable until this loads.'}</Text>
          {proofError && <Button variant="outline" onPress={() => { photosQuery.refetch(); signaturesQuery.refetch(); checklistRecord.refetch(); }}>Retry evidence</Button>}
        </Card>}

        <View style={{ display: step === 1 ? 'flex' : 'none' }}>
        {/* Before Photos */}
        <Card className="mb-4">
          <SectionHeader
            icon={Camera}
            iconColor="#D97706"
            title="Before Photos"
            required
          />
          <InlinePhotoCapture
            jobId={id}
            photoType="before"
            description="Capture the state of the site before work begins."
            accentColor="#D97706"
          />
        </Card>

        {/* After Photos */}
        <Card className="mb-4">
          <SectionHeader
            icon={Camera}
            iconColor="#059669"
            title="After Photos"
            required
          />
          <InlinePhotoCapture
            jobId={id}
            photoType="after"
            description="Capture the finished work to verify completion."
            accentColor="#059669"
          />
        </Card>

        </View>
        <View style={{ display: step === 0 ? 'flex' : 'none' }}>
        {/* AI Voice Wrap-Up Hero Card */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setShowWrapUpModal(true);
          }}
          className="mb-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-600 active:opacity-95 shadow-sm"
          style={{ backgroundColor: '#059669' }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Sparkles size={13} color="#D1FAE5" />
                <Text className="text-[11px] font-black text-emerald-100 uppercase tracking-wider">
                  AI Field Copilot
                </Text>
              </View>
              <Text className="text-base font-bold text-white">
                Speak to log parts, extra work & wrap up
              </Text>
              <Text className="text-xs text-emerald-100/90 mt-0.5" numberOfLines={1}>
                Tap to speak: "Used 45uF capacitor $45 and 30m extra labor $50"
              </Text>
            </View>
            <View className="size-11 rounded-full bg-white/20 items-center justify-center border border-white/30">
              <Mic size={20} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>

        {/* Checklist */}
        <Card className="mb-4">
          <SectionHeader
            icon={ClipboardList}
            iconColor="#3B82F6"
            title="Job Checklist"
            badge={
              checklistTotal > 0
                ? `(${checklistDone}/${checklistTotal})`
                : '(none linked)'
            }
          />
          <InlineChecklist jobId={id} />
          {checklistRequired && <View className="mt-4">
            <Text className="mb-3 text-sm text-muted-foreground">{checklistReady ? 'Checklist saved as completed.' : checklistTotal ? 'Check every item, then save the checklist as complete.' : 'A checklist is required but its items are unavailable. Contact dispatch to resolve it.'}</Text>
            {!checklistReady && <Button disabled={checklistTotal === 0 || checklistDone !== checklistTotal} loading={savingChecklist} onPress={saveChecklist}>Save completed checklist</Button>}
          </View>}
        </Card>

        </View>
        <View style={{ display: step === 2 ? 'flex' : 'none' }}>
        {/* Customer Signature */}
        <Card className="mb-4">
          <SectionHeader
            icon={PenLine}
            iconColor="#059669"
            title="Customer Signature"
            required
            badge={
              customerSigs.length > 0
                ? `(${customerSigs.length} collected)`
                : undefined
            }
          />
          <InlineSignaturePad
            jobId={id}
            signerType="customer"
            defaultSignerName={job?.customer?.name || ''}
            defaultRole="Customer"
            accentColor="#059669"
          />
        </Card>

        {/* Employee Signature */}
        <Card className="mb-4">
          <SectionHeader
            icon={PenLine}
            iconColor="#3B82F6"
            title="Employee Signature"
            badge={
              employeeSigs.length > 0
                ? `Optional · ${employeeSigs.length} saved`
                : 'Optional'
            }
          />
          <InlineSignaturePad
            jobId={id}
            signerType="employee"
            defaultSignerName={user?.name || job?.employee?.name || ''}
            defaultRole="Employee"
            accentColor="#3B82F6"
          />
        </Card>

        </View>
        <View style={{ display: step === 0 ? 'flex' : 'none' }}>
        {/* Materials, Hardware & Extra Work (Voice AI) */}
        <Card className="mb-4 bg-white border border-border shadow-xs">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border/60">
            <View className="flex-row items-center gap-2">
              <View className="size-8 rounded-lg bg-emerald-600 items-center justify-center">
                <Wrench size={16} color="#FFFFFF" />
              </View>
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-bold text-foreground">Materials & Extra Work</Text>
                  <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-black text-emerald-800">VOICE AI</Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">Parts used and extra labor on site</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  setShowWrapUpModal(true);
                }}
                className="h-9 px-3 rounded-xl bg-emerald-600 flex-row items-center gap-1.5 active:bg-emerald-700 shadow-xs"
              >
                <Mic size={14} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Voice</Text>
              </Pressable>

              <Pressable
                onPress={handleAddManualItem}
                className="h-9 px-3 rounded-xl bg-muted/60 border border-border flex-row items-center gap-1 active:bg-muted"
              >
                <Plus size={14} color={COLORS.foreground} />
                <Text className="text-xs font-semibold text-foreground">Custom</Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Trade Presets Ribbon */}
          <View className="py-2.5">
            <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Quick Add Presets (1-Tap):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {TRADE_PRESETS.map((preset) => (
                <Pressable
                  key={preset.name}
                  onPress={() => handleAddPresetItem(preset.name, preset.rate, preset.type)}
                  className="px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/80 flex-row items-center gap-1.5 active:bg-emerald-50 active:border-emerald-300"
                >
                  <Plus size={11} color={COLORS.mutedForeground} />
                  <Text className="text-xs font-medium text-foreground">{preset.name}</Text>
                  <Text className="text-xs font-bold text-emerald-700">${preset.rate}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Items List */}
          {lineItems.length > 0 ? (
            <View className="space-y-3 pt-1">
              {lineItems.map((item, idx) => {
                const isLabor = item.type === 'labor';
                const itemTotal = (Number(item.quantity) || 1) * (Number(item.rate ?? item.unitPrice ?? 0));
                return (
                  <View
                    key={item.id || idx}
                    className="p-3 rounded-xl border border-border/80 bg-muted/10 space-y-2.5"
                  >
                    {/* Row 1: Type badge + Name + Trash */}
                    <View className="flex-row items-center justify-between gap-2">
                      <Pressable
                        onPress={() => handleToggleItemType(idx)}
                        className={`px-2 py-1 rounded-md flex-row items-center gap-1 ${
                          isLabor ? 'bg-blue-100 border border-blue-200' : 'bg-amber-100 border border-amber-200'
                        }`}
                      >
                        {isLabor ? <Clock size={11} color="#1D4ED8" /> : <Wrench size={11} color="#B45309" />}
                        <Text className={`text-[10px] font-bold uppercase ${isLabor ? 'text-blue-800' : 'text-amber-800'}`}>
                          {isLabor ? 'Labor' : 'Part'}
                        </Text>
                      </Pressable>

                      <TextInput
                        value={item.name || item.description}
                        onChangeText={(text) => handleUpdateItem(idx, { name: text, description: text })}
                        className="flex-1 text-sm font-bold text-foreground py-1 px-1 bg-transparent"
                        placeholder="Item name (e.g. 45uF capacitor)"
                        placeholderTextColor="#9CA3AF"
                      />

                      <Pressable
                        onPress={() => handleRemoveItem(idx)}
                        hitSlop={8}
                        className="p-1 rounded-md active:bg-red-50"
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </Pressable>
                    </View>

                    {/* Row 2: Quantity Stepper + Unit Rate + Total */}
                    <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
                      {/* Quantity Stepper */}
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-xs text-muted-foreground font-medium">Qty:</Text>
                        <View className="flex-row items-center rounded-lg border border-border bg-white overflow-hidden">
                          <Pressable
                            onPress={() => handleDecrementQty(idx)}
                            className="size-7 items-center justify-center active:bg-muted"
                          >
                            <Minus size={12} color={COLORS.foreground} />
                          </Pressable>
                          <Text className="min-w-[28px] text-center text-xs font-bold text-foreground">
                            {item.quantity ?? 1}
                          </Text>
                          <Pressable
                            onPress={() => handleIncrementQty(idx)}
                            className="size-7 items-center justify-center active:bg-muted"
                          >
                            <Plus size={12} color={COLORS.foreground} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Unit Rate */}
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-xs text-muted-foreground font-medium">Rate:</Text>
                        <View className="flex-row items-center px-2 h-7 rounded-lg border border-border bg-white">
                          <Text className="text-xs text-muted-foreground font-medium mr-0.5">$</Text>
                          <TextInput
                            keyboardType="numeric"
                            value={String(item.rate ?? item.unitPrice ?? 0)}
                            onChangeText={(text) => handleUpdateItem(idx, { rate: Number(text) || 0, unitPrice: Number(text) || 0 })}
                            className="text-xs font-bold text-foreground min-w-[42px] text-right py-0"
                          />
                        </View>
                      </View>

                      {/* Line Item Total */}
                      <Text className="text-sm font-black font-mono text-emerald-600">
                        ${itemTotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Total Banner */}
              <View className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold text-emerald-950">
                    Added to Invoice ({lineItems.length} items):
                  </Text>
                  <Text className="text-[11px] text-emerald-700">
                    Includes parts & extra labor logged on site
                  </Text>
                </View>
                <Text className="text-base font-black font-mono text-emerald-800">
                  {formatCurrency(total, tenantCurrency)}
                </Text>
              </View>
            </View>
          ) : (
            <View className="p-4 rounded-xl border border-dashed border-border/80 items-center justify-center bg-muted/20 my-1">
              <View className="size-10 rounded-full bg-emerald-100 items-center justify-center mb-1.5">
                <Sparkles size={18} color="#059669" />
              </View>
              <Text className="text-xs font-bold text-foreground text-center">
                No extra materials or labor logged
              </Text>
              <Text className="text-xs text-muted-foreground text-center mt-0.5 max-w-[260px]">
                Tap <Text className="font-bold text-emerald-700">Voice</Text> to speak parts, or tap any quick-add preset chip above.
              </Text>
            </View>
          )}
        </Card>

        {/* Completion Notes */}
        <Card className="mb-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionHeader
              icon={FileText}
              iconColor={COLORS.mutedForeground}
              title="Completion Notes"
              badge="(optional)"
            />
            {job?.id ? (
              <NotesPolishButton
                jobId={job.id}
                rawNotes={notes}
                onPolished={(polished) => setNotes(polished)}
              />
            ) : null}
          </View>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Summary of work performed, materials used, follow-up needed…"
            placeholderTextColor="#9CA3AF"
            multiline
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 10,
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: COLORS.foreground,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            maxLength={2000}
          />
          <Text style={{ marginTop: 4, fontSize: 12, color: COLORS.mutedForeground }}>
            {notes.length}/2000 characters
          </Text>
        </Card>

        </View>
        {step === 3 && <View className="gap-4">
          <Card>
            <Text className="mb-3 text-base font-bold text-foreground">Completion requirements</Text>
            {requirements.map((requirement) => <Pressable key={requirement.label} accessibilityRole="button" onPress={() => goToStep(requirement.step)} className="min-h-[52px] flex-row items-center gap-3 border-b border-border py-3">
              {requirement.ready ? <CircleCheck size={20} color={COLORS.primary} /> : <CircleAlert size={20} color="#B45309" />}
              <Text className="flex-1 text-sm text-foreground">{requirement.label}</Text>
              <Text className="text-xs font-semibold text-primary-700">{requirement.ready ? 'View' : 'Add'}</Text>
            </Pressable>)}
          </Card>
          <Card>
            <Text className="text-base font-bold text-foreground">Work summary</Text>
            <Text className="mt-2 text-sm leading-6 text-muted-foreground">{notes.trim() || 'No completion notes added.'}</Text>
            <Text className="mt-4 text-base font-semibold text-foreground">Charges</Text>
            {lineItems.map((item, index) => <View key={item.id || index} className="mt-3 flex-row items-start gap-3">
              <Text className="flex-1 text-sm text-muted-foreground">{item.quantity ?? 1} × {item.name || item.description}</Text>
              <Text className="text-sm text-foreground">{formatCurrency(lineItemTotal(item), tenantCurrency)}</Text>
            </View>)}
            <Text className="mt-4 text-sm font-semibold text-foreground">Quoted total: {formatCurrency(JSON.stringify(lineItems) !== initialItems.current ? total : (savedQuotedTotal.current ?? job.quotedAmount ?? total), tenantCurrency)}</Text>
            <Text className="mt-2 text-sm text-muted-foreground">{beforePhotos.length} before photos · {afterPhotos.length} after photos</Text>
            <Text className="mt-2 text-sm text-muted-foreground">Customer: {customerSigs.at(-1)?.signatoryName || job.customer?.name || 'Not provided'}</Text>
            <Button variant="ghost" onPress={() => goToStep(0)}>Edit work summary</Button>
          </Card>
          {invalidItems && <Text className="text-sm text-destructive">Check material names, quantities, and rates before completing.</Text>}
          {submissionError && <Card className="border-red-200 bg-red-50"><Text accessibilityRole="alert" className="text-sm text-red-800">{submissionError}</Text></Card>}
        </View>}
      </ScrollView>

      <View style={footerStyle}>
        <Text className="mb-3 text-sm text-muted-foreground">Step {step + 1} of 4 · {missing.length === 0 ? 'Evidence ready' : `${missing.length} requirements remaining`}</Text>
        {step < 3 ? <Button fullWidth onPress={() => goToStep(step + 1)}>Continue to {['', 'photos', 'sign-off', 'review'][step + 1]}</Button> :
          <Button fullWidth loading={submitting} disabled={!allPass || invalidItems} onPress={handleSubmit}>Confirm & complete job</Button>}
      </View>
      </KeyboardAvoidingView>

      {/* Submit overlay — blocks the whole screen while the lifecycle + proof
          calls are in flight. Per-section upload spinners are inline. */}
      <LoadingOverlay
        visible={submitting}
        message="Saving work and completing job…"
      />

      {/* Voice Wrap-Up Modal */}
      <Modal visible={showWrapUpModal} onClose={() => { stopWrapUpListening(); setShowWrapUpModal(false); }} position="bottom">
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="size-10 rounded-xl bg-emerald-600 items-center justify-center shadow-xs">
                <Sparkles size={20} color="#FFFFFF" />
              </View>
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-black text-foreground">AI Voice Wrap-Up</Text>
                  <View className="bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      HANDS-FREE
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">Speak into mic — auto-types words live</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                stopWrapUpListening();
                setShowWrapUpModal(false);
              }}
              hitSlop={10}
              className="p-1 rounded-full bg-muted"
            >
              <X size={16} color={COLORS.foreground} />
            </Pressable>
          </View>

          {/* Central Pulsating Microphone Button */}
          <View className="items-center justify-center py-3">
            <View className="relative items-center justify-center">
              {isWrapUpListening && (
                <View className="absolute size-24 rounded-full bg-red-500/20" />
              )}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  if (isWrapUpListening) {
                    stopWrapUpListening();
                  } else {
                    startWrapUpListening();
                  }
                }}
                disabled={wrapUpLoading}
                className={`size-20 rounded-full items-center justify-center shadow-lg active:scale-95 ${
                  isWrapUpListening
                    ? 'bg-red-500 border-4 border-red-300'
                    : 'bg-emerald-600 border-4 border-emerald-400/30'
                }`}
              >
                {isWrapUpListening ? (
                  <Mic size={32} color="#FFFFFF" />
                ) : (
                  <MicOff size={28} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            <View className="flex-row items-center gap-1.5 mt-2.5">
              {isWrapUpListening ? (
                <>
                  <View className="size-2 rounded-full bg-red-500" />
                  <Text className="text-xs font-bold text-red-600 dark:text-red-400">
                    Listening... Speak parts & extra work (auto-typing)
                  </Text>
                </>
              ) : (
                <Text className="text-xs font-medium text-muted-foreground">
                  Tap mic to start auto-typing spoken work
                </Text>
              )}
            </View>
          </View>

          {/* Auto-typed Dictation Input */}
          <View className="relative mb-3">
            <View className="flex-row items-center justify-between mb-1 px-1">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Auto-Typed Work & Materials
              </Text>
              {wrapUpTranscript.length > 0 && !wrapUpLoading && (
                <Pressable
                  onPress={() => {
                    setWrapUpTranscript('');
                    resetWrapUpTranscript();
                  }}
                  hitSlop={6}
                  className="flex-row items-center gap-1"
                >
                  <X size={12} color={COLORS.mutedForeground} />
                  <Text className="text-[11px] text-muted-foreground">Clear</Text>
                </Pressable>
              )}
            </View>
            <TextInput
              value={wrapUpTranscript}
              onChangeText={(txt) => {
                setWrapUpTranscript(txt);
                setSpeechTranscript(txt);
              }}
              placeholder='Speak now — e.g. "Used 45uF capacitor $45 and 30m extra pipe flushing labor $50"'
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className={`w-full min-h-[85px] p-3 text-sm text-foreground rounded-2xl border text-left ${
                isWrapUpListening
                  ? 'bg-red-500/5 border-red-400'
                  : 'bg-muted/30 border-border'
              }`}
              style={{ textAlignVertical: 'top' }}
            />
          </View>

          {/* Preset Prompts Carousel */}
          <Text className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Or Tap An Example Prompt:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} className="mb-3">
            {VOICE_PRESET_PROMPTS.map((prompt, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setWrapUpTranscript(prompt);
                  setSpeechTranscript(prompt);
                }}
                className="max-w-[260px] p-2.5 rounded-xl bg-muted/60 border border-border/80 active:bg-emerald-50 active:border-emerald-300"
              >
                <Text className="text-xs text-foreground font-medium" numberOfLines={2}>
                  &quot;{prompt}&quot;
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Submit Action */}
          <Pressable
            onPress={handleVoiceWrapUp}
            disabled={wrapUpLoading || !wrapUpTranscript.trim()}
            className={`h-12 rounded-xl flex-row items-center justify-center gap-2 shadow-xs ${
              !wrapUpTranscript.trim() || wrapUpLoading ? 'bg-emerald-600/50' : 'bg-emerald-600 active:bg-emerald-700'
            }`}
          >
            {wrapUpLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">AI analyzing work & updating invoice...</Text>
              </View>
            ) : (
              <>
                <Sparkles size={16} color="#FFFFFF" />
                <Text className="text-sm font-bold text-white">Log Parts, Labor & Notes with AI</Text>
              </>
            )}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Header ──────────────────────────────────────────────────────────

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center border-b border-border bg-white px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={22} color={COLORS.foreground} />
      </Pressable>
      <Text className="ml-3 text-lg font-bold text-foreground">{title}</Text>
    </View>
  );
}
