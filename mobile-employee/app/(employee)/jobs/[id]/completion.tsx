/**
 * Job Completion Proof (Employee) — all-in-one rewrite (Q1-Phase-3).
 *
 * Mirrors the PWA's JobCompletionScreen: a single screen that captures every
 * piece of proof inline — before/after photos, customer + employee signatures,
 * checklist items, completion notes, customer-name confirmation — plus a sticky
 * validation chip row at the top and a sticky "Complete Job" footer at the
 * bottom.
 *
 * The dedicated sub-routes (/photos, /signature, /checklist, /expenses, /visits,
 * /time-entries, /notes) STILL EXIST and are still reachable from the job
 * detail screen's QuickAction grid. This inline screen is an ADDITIONAL capture
 * path — the most efficient one for the common "finish the job" flow.
 *
 * Layout (top → bottom):
 *   ┌──────────────────────────────────────────────┐
 *   │ Header                                       │
 *   ├──────────────────────────────────────────────┤
 *   │ Sticky chip row (5 chips, horizontal scroll) │
 *   │  · Before Photos  · After Photos             │
 *   │  · Checklist  · Customer Sig  · Employee Sig │
 *   ├──────────────────────────────────────────────┤
 *   │ ScrollView (flex-1)                          │
 *   │  ─ Before Photos section (InlinePhotoCapture)│
 *   │  ─ After Photos section  (InlinePhotoCapture)│
 *   │  ─ Checklist section     (InlineChecklist)   │
 *   │  ─ Customer Signature    (InlineSignaturePad)│
 *   │  ─ Employee Signature    (InlineSignaturePad)│
 *   │  ─ Completion Notes      (multiline Input)   │
 *   │  ─ Customer Name Confirmation (Input)        │
 *   ├──────────────────────────────────────────────┤
 *   │ Sticky footer (Complete Job button)          │
 *   └──────────────────────────────────────────────┘
 *
 * Submit flow:
 *   1. Photos + signatures are already uploaded inline (each capture fires its
 *      own mutation immediately). No batch upload needed at submit time.
 *   2. POST /api/jobs/[id]/complete-proof { photos, signature, notes, customerName }
 *      — records the denormalized completion snapshot on the Job row.
 *   3. POST /api/employee/jobs/[id]/lifecycle { action: 'complete' }
 *      — flips status to 'completed', auto-creates invoice, emits events.
 *   4. router.back() to the job detail screen.
 *
 * Validation chips (matches the PWA's pass/warn/fail semantics):
 *   - Before Photos: pass if ≥1 before photo, else fail
 *   - After Photos:  pass if ≥1 after photo,  else fail
 *   - Checklist:     pass if 100% complete OR no items (vacuous);
 *                    warn if 1-99% complete; fail if 0% with items
 *   - Customer Sig:  pass if customer signature exists, else fail
 *   - Employee Sig:  pass if employee signature exists, else fail
 *   - allPass = before pass && after pass && checklist !== fail && cust sig pass && emp sig pass
 *     (checklist 'warn' is non-blocking — matches PWA)
 */
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
  CircleX,
  Trash2,
  Check,
  FileText,
  X,
  Wrench,
  Mic,
  Plus,
  Sparkles,
} from 'lucide-react-native';
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
  useJobPhotos,
  useJobSignatures,
  useUploadJobPhoto,
  useDeleteJobPhoto,
  useToggleChecklistItem,
  useUploadSignature,
  useCompleteProof,
  useJobLifecycle,
} from '@/hooks/use-jobs';
import * as Haptics from 'expo-haptics';
import { api, assetUrl, ApiRequestError } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { captureGps } from '@/lib/gps';
import { trackingManager } from '@/lib/tracking-manager';
import { enqueueSignature, enqueueLifecycleAction } from '@/lib/offline-queue';
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

type ChipState = 'pass' | 'warn' | 'fail';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIG_CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 48, 460);
const SIG_CANVAS_HEIGHT = 200;
const PHOTO_THUMB_SIZE = 88;

const CHIP_STYLES: Record<
  ChipState,
  { bg: string; border: string; text: string; icon: string }
> = {
  pass: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', icon: '#059669' },
  warn: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '#D97706' },
  fail: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: '#DC2626' },
};

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
                    fontSize: 10,
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
                fontSize: 10,
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

      <Text className="mt-2 text-[11px] text-muted-foreground">
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
        // Offline / Basement fallback
        console.warn('[completion] signature upload failed, queuing offline:', uploadErr);
        await enqueueSignature(jobId, savedUri, signerType, signerName, gps);
        show(`${defaultRole} signature saved offline (Basement Mode) ✓`, 'info');
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
                    fontSize: 10,
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
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
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
          No checklist linked to this job — proof of completion is not required.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Mini progress bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
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

function ValidationChip({
  label,
  state,
}: {
  label: string;
  state: ChipState;
}) {
  const s = CHIP_STYLES[state];
  const Icon =
    state === 'pass' ? CircleCheck : state === 'warn' ? CircleAlert : CircleX;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: s.bg,
        borderWidth: 1,
        borderColor: s.border,
        marginRight: 8,
      }}
      accessibilityLabel={`${label}: ${state}`}
    >
      <Icon size={14} color={s.icon} />
      <Text
        style={{
          marginLeft: 5,
          fontSize: 12,
          fontWeight: '600',
          color: s.text,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

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
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
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
              fontSize: 10,
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
            fontSize: 11,
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
  const completeProof = useCompleteProof();
  const lifecycle = useJobLifecycle();

  const user = useAuthStore((s) => s.user);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<JobLineItem[]>([]);
  const [showWrapUpModal, setShowWrapUpModal] = useState(false);
  const [wrapUpTranscript, setWrapUpTranscript] = useState('');
  const [wrapUpLoading, setWrapUpLoading] = useState(false);

  const job = jobQuery.data;

  // Sync initial lineItems and notes from job query
  useEffect(() => {
    if (job) {
      if (Array.isArray(job.lineItems) && job.lineItems.length > 0) {
        setLineItems(job.lineItems);
      } else if (job.lineItemsJson) {
        try {
          const parsed = typeof job.lineItemsJson === 'string' ? JSON.parse(job.lineItemsJson) : job.lineItemsJson;
          if (Array.isArray(parsed)) setLineItems(parsed);
        } catch {}
      }
      if (job.notes && !notes) {
        setNotes(job.notes);
      }
    }
  }, [job]);

  const handleVoiceWrapUp = async () => {
    const text = wrapUpTranscript.trim();
    if (!text) {
      show('Please speak or type extra parts / work first.', 'warning');
      return;
    }

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
      name: 'New Part / Material',
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

  const handleUpdateItem = (index: number, updates: Partial<JobLineItem>) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };
      const qty = Number(current.quantity) || 1;
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
  const checklistPercent =
    checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;

  const beforePhotosChip: ChipState =
    beforePhotos.length >= 1 ? 'pass' : 'fail';
  const afterPhotosChip: ChipState = afterPhotos.length >= 1 ? 'pass' : 'fail';
  const checklistChip: ChipState =
    checklistTotal === 0
      ? 'pass' // vacuously true — no checklist required
      : checklistPercent === 100
        ? 'pass'
        : checklistPercent > 0
          ? 'warn'
          : 'fail';
  const customerSigChip: ChipState =
    customerSigs.length >= 1 ? 'pass' : 'fail';
  const employeeSigChip: ChipState =
    employeeSigs.length >= 1 ? 'pass' : 'fail';

  // Checklist 'warn' is non-blocking (matches PWA); 'fail' blocks.
  const allPass =
    beforePhotosChip === 'pass' &&
    afterPhotosChip === 'pass' &&
    (checklistChip === 'pass' || checklistChip === 'warn') &&
    customerSigChip === 'pass' &&
    employeeSigChip === 'pass';

  const customerSignature = customerSigs[customerSigs.length - 1];

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!allPass || !id) return;
    const resolvedCustomerName = (
      customerSignature?.signatoryName ||
      job?.customer?.name ||
      'Customer'
    ).trim();

    try {
      // 0. Sync any added/updated line items to the job so invoice has the updated items
      if (lineItems.length > 0) {
        const subtotal = lineItems.reduce((acc, it) => acc + (Number(it.amount ?? it.total ?? 0)), 0);
        await api.put(`/api/jobs/${id}`, {
          lineItemsJson: JSON.stringify(lineItems),
          quotedAmount: subtotal > 0 ? subtotal : undefined,
        }).catch(() => null);
      }

      // 1. Submit denormalized completion proof snapshot (photos + sig + notes
      //    + customerName). Photos and signatures are already persisted as
      //    proper JobPhoto / JobSignature rows from the inline captures — the
      //    server's validateJobCompletionProof reads those rows, not this
      //    payload. This call records the legacy snapshot fields on the Job
      //    row for backward compatibility.
      await completeProof.mutateAsync({
        jobId: id,
        payload: {
          photos: allPhotos.map((p) => p.id),
          signature: customerSignature?.id,
          notes: notes.trim() || undefined,
          customerName: resolvedCustomerName,
        },
      });

      // 2. Advance the lifecycle — flips status to 'completed', runs the
      //    server-side validateJobCompletionProof (before/after photos +
      //    customer signature required), auto-creates the invoice, emits
      //    job.completed event, sends WhatsApp notifications.
      try {
        await lifecycle.mutateAsync({ id, action: 'complete' });
        // Deterministically stop background travel tracking if this was the active travelling job
        if (trackingManager.getState()?.jobId === id) {
          trackingManager.stopTravelling();
        }
      } catch (lcErr) {
        // Proof was saved; lifecycle call may have failed because the job was
        // already completed or the validation rejected it. Surface but don't
        // fail the whole flow.
        if (trackingManager.getState()?.jobId === id) {
          trackingManager.stopTravelling();
        }
        await enqueueLifecycleAction(id, 'complete').catch(() => {});
        show(
          'Proof saved! Completion queued offline — will sync once reconnected ✓',
          'info'
        );
        router.back();
        return;
      }

      show('Job completion submitted.', 'success');
      router.back();
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Submission failed. Please try again.',
        'error'
      );
    }
  }, [
    allPass,
    id,
    job,
    completeProof,
    lifecycle,
    allPhotos,
    customerSignature,
    notes,
    lineItems,
    show,
  ]);

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

  if (jobQuery.error || !job) {
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

  const submitting = completeProof.isPending || lifecycle.isPending;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Complete Job" />

      {/* Sticky validation chip row — sits between the header and the
          scrollable body so it's always visible while the user scrolls. */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          paddingVertical: 10,
          paddingLeft: 16,
          paddingRight: 8,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8, alignItems: 'center' }}
        >
          <ValidationChip label="Before Photos" state={beforePhotosChip} />
          <ValidationChip label="After Photos" state={afterPhotosChip} />
          <ValidationChip label="Checklist" state={checklistChip} />
          <ValidationChip label="Customer Sig" state={customerSigChip} />
          <ValidationChip label="Employee Sig" state={employeeSigChip} />
        </ScrollView>
      </View>

      {/* Scrollable body */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-4 text-sm text-muted-foreground">
          Capture all proof of work before completing this job. Each chip at
          the top turns green as you satisfy its requirement.
        </Text>

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
        </Card>

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
            required
            badge={
              employeeSigs.length > 0
                ? `(${employeeSigs.length} collected)`
                : undefined
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

        {/* Materials, Hardware & Extra Work (Voice AI) */}
        <Card className="mb-4 bg-emerald-50/40 border-emerald-500/20">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SectionHeader
                icon={Wrench}
                iconColor="#059669"
                title="Materials & Extra Work"
              />
              <View className="bg-emerald-100 px-1.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-emerald-800">Voice AI</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  setShowWrapUpModal(true);
                }}
                className="h-8 px-2.5 rounded-lg bg-emerald-600 flex-row items-center gap-1 active:bg-emerald-700 shadow-xs"
              >
                <Mic size={13} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Voice Log</Text>
              </Pressable>

              <Pressable
                onPress={handleAddManualItem}
                className="h-8 px-2 rounded-lg bg-white border border-border flex-row items-center gap-1 active:bg-muted"
              >
                <Plus size={13} color={COLORS.foreground} />
                <Text className="text-xs font-medium text-foreground">Add</Text>
              </Pressable>
            </View>
          </View>

          <Text className="text-xs text-muted-foreground mb-2.5">
            Log extra hardware, parts, or labor to automatically invoice the customer.
          </Text>

          {lineItems.length > 0 ? (
            <View className="space-y-2">
              <View className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border/60">
                {lineItems.map((item, idx) => (
                  <View key={item.id || idx} className="p-2.5 flex-row items-center justify-between gap-2">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <View
                          className={`px-1.5 py-0.2 rounded ${
                            item.type === 'labor' ? 'bg-blue-100' : 'bg-amber-100'
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-bold uppercase ${
                              item.type === 'labor' ? 'text-blue-800' : 'text-amber-800'
                            }`}
                          >
                            {item.type === 'labor' ? 'Labor' : 'Part'}
                          </Text>
                        </View>
                        <TextInput
                          value={item.name || item.description}
                          onChangeText={(text) => handleUpdateItem(idx, { name: text, description: text })}
                          className="flex-1 text-xs font-bold text-foreground py-0"
                          placeholder="Item name"
                        />
                      </View>

                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Text className="text-[11px] text-muted-foreground">Qty:</Text>
                          <TextInput
                            keyboardType="numeric"
                            value={String(item.quantity || 1)}
                            onChangeText={(text) => handleUpdateItem(idx, { quantity: Number(text) || 1 })}
                            className="h-6 px-1.5 text-xs font-semibold bg-muted/40 rounded border border-border/60 text-center min-w-[32px]"
                          />
                        </View>

                        <View className="flex-row items-center gap-1">
                          <Text className="text-[11px] text-muted-foreground">Rate: $</Text>
                          <TextInput
                            keyboardType="numeric"
                            value={String(item.rate ?? item.unitPrice ?? 0)}
                            onChangeText={(text) => handleUpdateItem(idx, { rate: Number(text) || 0, unitPrice: Number(text) || 0 })}
                            className="h-6 px-1.5 text-xs font-semibold bg-muted/40 rounded border border-border/60 text-right min-w-[48px]"
                          />
                        </View>
                      </View>
                    </View>

                    <View className="items-end gap-1.5">
                      <Text className="text-xs font-extrabold text-emerald-600 font-mono">
                        ${((item.quantity || 1) * (item.rate ?? item.unitPrice ?? 0)).toFixed(2)}
                      </Text>
                      <Pressable
                        onPress={() => handleRemoveItem(idx)}
                        hitSlop={6}
                        className="p-1 rounded active:bg-red-50"
                      >
                        <Trash2 size={13} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>

              {/* Total Banner */}
              <View className="flex-row items-center justify-between p-2.5 rounded-xl bg-emerald-100/60 border border-emerald-300">
                <Text className="text-xs font-bold text-emerald-900">
                  Total Added to Invoice ({lineItems.length} items):
                </Text>
                <Text className="text-sm font-black font-mono text-emerald-800">
                  ${lineItems.reduce((acc, it) => acc + (Number(it.amount ?? it.total ?? 0)), 0).toFixed(2)}
                </Text>
              </View>
            </View>
          ) : (
            <View className="p-3 rounded-xl border border-dashed border-border items-center justify-center bg-white/60">
              <Text className="text-xs text-muted-foreground text-center">
                No parts or extra labor logged yet. Tap <Text className="font-bold text-emerald-700">Voice Log</Text> or speak parts used.
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
          <Text style={{ marginTop: 4, fontSize: 11, color: COLORS.mutedForeground }}>
            {notes.length}/2000 characters
          </Text>
        </Card>

        {!allPass ? (
          <Text
            style={{
              fontSize: 12,
              color: COLORS.mutedForeground,
              textAlign: 'center',
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            Resolve the red chips above to enable submission.
          </Text>
        ) : null}
      </ScrollView>

      {/* Sticky footer — Complete Job button */}
      <View style={footerStyle}>
        <Pressable
          onPress={handleSubmit}
          disabled={!allPass || submitting}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: '#059669',
            opacity: !allPass || submitting ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Complete job"
          accessibilityState={{ disabled: !allPass || submitting }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <CircleCheck size={18} color="#FFFFFF" />
          )}
          <Text
            style={{
              marginLeft: 8,
              fontSize: 16,
              fontWeight: '700',
              color: '#FFFFFF',
            }}
          >
            {submitting ? 'Submitting…' : 'Complete Job'}
          </Text>
        </Pressable>
      </View>

      {/* Submit overlay — blocks the whole screen while the lifecycle + proof
          calls are in flight. Per-section upload spinners are inline. */}
      <LoadingOverlay
        visible={submitting}
        message={completeProof.isPending ? 'Submitting proof…' : 'Completing job…'}
      />

      {/* Voice Wrap-Up Modal */}
      <Modal visible={showWrapUpModal} onClose={() => setShowWrapUpModal(false)} position="bottom">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="size-8 rounded-lg bg-emerald-600 items-center justify-center">
                <Mic size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-base font-black text-foreground">Voice Wrap-Up</Text>
                <Text className="text-xs text-muted-foreground">Log hardware, parts & extra labor</Text>
              </View>
            </View>
            <Pressable onPress={() => setShowWrapUpModal(false)} hitSlop={8}>
              <X size={16} color={COLORS.mutedForeground} />
            </Pressable>
          </View>

          <TextInput
            value={wrapUpTranscript}
            onChangeText={setWrapUpTranscript}
            placeholder='e.g. "Used 45uF capacitor $45 and 30m extra pipe flushing labor $50"'
            placeholderTextColor={COLORS.mutedForeground}
            multiline
            numberOfLines={3}
            className="w-full min-h-[85px] p-3 text-sm text-foreground bg-muted/40 rounded-xl border border-border/80 mb-3"
            style={{ textAlignVertical: 'top' }}
          />

          <Pressable
            onPress={handleVoiceWrapUp}
            disabled={wrapUpLoading || !wrapUpTranscript.trim()}
            className={`h-11 rounded-xl flex-row items-center justify-center gap-2 ${
              !wrapUpTranscript.trim() || wrapUpLoading ? 'bg-emerald-600/50' : 'bg-emerald-600 active:bg-emerald-700'
            }`}
          >
            {wrapUpLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Mic size={15} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Log Parts & Notes with AI</Text>
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
