/**
 * Job Photos (Employee) — rewrite.
 *
 * PWA-parity features:
 *   - Real native photo capture via expo-image-picker (launchCameraAsync).
 *   - Gallery picker via launchImageLibraryAsync.
 *   - Camera permission requested on first capture.
 *   - Photo type selector: before / progress / after / issue / other
 *     (CANONICAL taxonomy — aligned with the PWA's PhotoCapture component.
 *      The server previously normalized mobile's legacy 'during'→'progress'
 *      and 'evidence'→'issue' on read; we now send the canonical types
 *      directly so future server-side strict validation won't reject them
 *      and the PWA's tab filter shows our photos correctly.)
 *   - Optional caption.
 *   - Best-effort GPS capture: attaches latitude / longitude / accuracy to
 *     every upload (matches the PWA's PhotoCapture). Falls back silently if
 *     the user denied location permission or the fix times out — the photo
 *     is still uploaded, just without coordinates.
 *   - Offline support: if an upload fails (network / 5xx), the photo payload
 *     is queued to AsyncStorage and auto-replayed the next time the screen
 *     is focused. Toast: "Saved offline — will sync when online".
 *   - Upload via FormData (api.post with `formData: true`).
 *   - Photo grid: type badge + caption. Tap to view full (Modal preview).
 *   - Long-press to delete (DELETE /api/jobs/[id]/photos/[photoId]).
 *   - LoadingOverlay during upload + toast on success/failure.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  X,
  Trash2,
  Upload,
  ImageOff,
  Eye,
  CloudOff,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  useJob,
  useJobPhotos,
  useUploadJobPhoto,
  useDeleteJobPhoto,
} from '@/hooks/use-jobs';
import { assetUrl } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { captureGps, type GpsCoords } from '@/lib/gps';
import {
  enqueue as enqueueOffline,
  getForJob as getOfflineForJob,
  remove as removeOffline,
  bumpAttempts as bumpOfflineAttempts,
  type OfflineQueueItem,
} from '@/lib/offline-queue';
import { ApiRequestError } from '@/lib/api';
import { buildPhotoFormData } from '@/lib/job-proof-helpers';
import type { JobPhoto } from '@/types';

// Canonical photo taxonomy — matches the PWA's PhotoCapture and the backend's
// JobPhoto enum. The server previously mapped our legacy 'during'→'progress'
// and 'evidence'→'issue' on read; sending canonical types directly avoids any
// future server-side strict validation rejects and makes the PWA's tab filter
// show our photos correctly.
type PhotoType = 'before' | 'progress' | 'after' | 'issue' | 'other';

const PHOTO_TYPES: { value: PhotoType; label: string }[] = [
  { value: 'before', label: 'Before' },
  { value: 'progress', label: 'Progress' },
  { value: 'after', label: 'After' },
  { value: 'issue', label: 'Issue' },
  { value: 'other', label: 'Other' },
];

// Variant lookup for the type badge. Mirrors the PWA's color mapping:
//   before=amber, progress=blue(info), after=emerald(success),
//   issue=red(destructive), other=muted(default).
function photoTypeVariant(type: string): 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info' {
  switch (type) {
    case 'before':
      return 'warning';
    case 'progress':
      return 'info';
    case 'after':
      return 'success';
    case 'issue':
      return 'destructive';
    default:
      return 'default';
  }
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const COL_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px horizontal padding + 16px gap

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/**
 * Rebuild a FormData from a queued offline photo item.
 * The queue stores the raw asset (uri/name/type) + type + caption because
 * FormData isn't serializable. On replay we reconstruct it and re-append the
 * metadata so the server sees the same shape as a fresh upload.
 */
async function rebuildPhotoFormDataFromOffline(
  item: OfflineQueueItem
): Promise<FormData> {
  const p = item.payload as {
    photoType: string;
    caption?: string;
    asset: { uri: string; name?: string; type?: string; fileName?: string; mimeType?: string };
    gps?: GpsCoords | null;
  };
  const fakeAsset: ImagePicker.ImagePickerAsset = {
    uri: p.asset.uri,
    fileName: p.asset.fileName || p.asset.name,
    mimeType: p.asset.mimeType || p.asset.type,
  } as ImagePicker.ImagePickerAsset;
  const fd = await buildPhotoFormData(fakeAsset, p.gps ?? null);
  fd.append('type', p.photoType);
  if (p.caption) fd.append('caption', p.caption);
  return fd;
}

export default function JobPhotosScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const { show } = useToast();

  const { data: job, isLoading: jobLoading, error: jobError } = useJob(id);
  const photosQuery = useJobPhotos(id);
  const { refetch: refetchPhotos } = photosQuery;
  const uploadPhoto = useUploadJobPhoto();
  const deletePhoto = useDeleteJobPhoto();

  const [photoType, setPhotoType] = useState<PhotoType>('before');
  const [caption, setCaption] = useState('');
  const [previewAsset, setPreviewAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<JobPhoto | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Keep a ref to the latest upload hook + toast so the focus-effect drain
  // closure always calls the freshest mutation. We update the refs in a
  // useEffect (NOT during render — React 19+ forbids that and the lint rule
  // `react-hooks/refs` enforces it).
  const uploadPhotoRef = useRef(uploadPhoto);
  const toastRef = useRef(show);
  useEffect(() => {
    uploadPhotoRef.current = uploadPhoto;
    toastRef.current = show;
  }, [uploadPhoto, show]);

  useFocusEffect(
    useCallback(() => {
      refetchPhotos();
      // Drain the offline queue: re-attempt any photos that failed to upload
      // while the device was offline. Best-effort — failures stay queued and
      // get bumped attempts so we don't loop forever.
      (async () => {
        try {
          const pending = await getOfflineForJob(id, 'photo');
          if (pending.length === 0) return;
          setPendingCount(pending.length);
          for (const item of pending) {
            try {
              const fd = await rebuildPhotoFormDataFromOffline(item);
              await uploadPhotoRef.current.mutateAsync({ id, formData: fd });
              await removeOffline(item.id);
              setPendingCount((n) => Math.max(0, n - 1));
            } catch (err) {
              await bumpOfflineAttempts(item.id);
              // Stop on first failure — the device is likely still offline.
              if (err instanceof ApiRequestError && err.statusCode >= 500) {
                break;
              }
              if (err instanceof ApiRequestError && err.statusCode === 0) {
                // Network error — stop trying, will retry on next focus.
                break;
              }
            }
          }
          const remaining = await getOfflineForJob(id, 'photo');
          setPendingCount(remaining.length);
          if (remaining.length === 0) {
            toastRef.current('Offline photos synced.', 'success');
          }
        } catch {
          /* swallow — draining is best-effort */
        }
      })();
      // Refresh the pending count badge when leaving the screen.
      return () => {
        getOfflineForJob(id, 'photo').then((p) => setPendingCount(p.length));
      };
    }, [id, refetchPhotos])
  );

  const photos: JobPhoto[] = photosQuery.data ?? job?.photos ?? [];

  const pickFromCamera = useCallback(async () => {
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
      setPreviewAsset(asset);
      setPreviewUri(asset.uri);
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Failed to capture photo.',
        'error'
      );
    }
  }, [show]);

  const pickFromGallery = useCallback(async () => {
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
      setPreviewAsset(asset);
      setPreviewUri(asset.uri);
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Failed to pick photo.',
        'error'
      );
    }
  }, [show]);

  const handleUpload = useCallback(async () => {
    if (!previewAsset || !id) return;
    try {
      // Best-effort GPS capture BEFORE building the FormData. Don't block
      // the upload if the user denied location permission or the fix times
      // out — captureGps() returns null in those cases and we proceed.
      const gps = await captureGps();
      const fd = await buildPhotoFormData(previewAsset, gps);
      fd.append('type', photoType);
      if (caption.trim()) fd.append('caption', caption.trim());

      await uploadPhoto.mutateAsync({ id, formData: fd });
      show('Photo uploaded.', 'success');
      if (gps) {
        console.debug('[photos] uploaded with GPS:', gps.latitude, gps.longitude);
      } else {
        console.debug('[photos] uploaded without GPS (permission denied or timed out)');
      }
      setPreviewAsset(null);
      setPreviewUri(null);
      setCaption('');
    } catch (err) {
      // Network error or 5xx → enqueue to the offline queue so the photo
      // isn't lost. The user gets a clear "saved offline" toast and the
      // queue auto-drains next time the screen is focused.
      const isNetwork =
        err instanceof ApiRequestError &&
        (err.statusCode === 0 || err.statusCode >= 500);
      if (isNetwork) {
        try {
          await enqueueOffline('photo', id, {
            photoType,
            caption: caption.trim() || undefined,
            asset: {
              uri: previewAsset.uri,
              name: previewAsset.fileName,
              type: previewAsset.mimeType,
              fileName: previewAsset.fileName,
              mimeType: previewAsset.mimeType,
            },
          });
          setPendingCount((n) => n + 1);
          show('Saved offline — will sync when online.', 'info');
          setPreviewAsset(null);
          setPreviewUri(null);
          setCaption('');
          return;
        } catch (queueErr) {
          console.warn('[photos] failed to enqueue offline photo:', queueErr);
        }
      }
      show(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
        'error'
      );
    }
  }, [previewAsset, id, photoType, caption, uploadPhoto, show]);

  const handleClearPreview = useCallback(() => {
    setPreviewAsset(null);
    setPreviewUri(null);
    setCaption('');
  }, []);

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
                await deletePhoto.mutateAsync({ jobId: id, photoId: photo.id });
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
    [id, deletePhoto, show]
  );

  if (jobLoading && !job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Job Photos" />
        <View className="mt-4 px-4">
          <Card className="h-64"><View /></Card>
        </View>
      </SafeAreaView>
    );
  }

  if (jobError || !job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Job Photos" />
        <EmptyState
          icon={<ImageOff size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={
            jobError instanceof Error ? jobError.message : 'Please go back and try again.'
          }
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Job Photos" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Existing photos */}
        <View className="mb-3 mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-base font-bold text-foreground">
              Photos ({photos.length})
            </Text>
            {pendingCount > 0 ? (
              <View className="ml-2 flex-row items-center rounded-full bg-amber-100 px-2 py-0.5">
                <CloudOff size={11} color={COLORS.warning} />
                <Text className="ml-1 text-[10px] font-semibold text-amber-700">
                  {pendingCount} pending
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => photosQuery.refetch()} hitSlop={8}>
            <Text className="text-xs font-semibold text-primary-700">Refresh</Text>
          </Pressable>
        </View>

        {photosQuery.isLoading && !photos.length ? (
          <View className="mb-3 flex-row flex-wrap justify-between">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className="mb-3 overflow-hidden rounded-xl border border-border bg-muted"
                style={{ width: COL_WIDTH, height: 180 }}
              />
            ))}
          </View>
        ) : photos.length === 0 ? (
          <View className="mb-3">
            <EmptyState
              icon={<Camera size={48} color={COLORS.mutedForeground} />}
              title="No photos yet"
              description="Take your first photo to document this job's progress."
            />
          </View>
        ) : (
          <View className="mb-4 flex-row flex-wrap justify-between">
            {photos.map((p) => {
              const url = assetUrl(p.url) || p.url;
              return (
                <View
                  key={p.id}
                  className="mb-3 overflow-hidden rounded-xl border border-border bg-white"
                  style={{ width: COL_WIDTH }}
                >
                  <Pressable
                    onPress={() => setViewerPhoto(p)}
                    onLongPress={() => handleDelete(p)}
                  >
                    <Image
                      source={{ uri: url }}
                      className="h-32 w-full"
                      resizeMode="cover"
                      accessibilityLabel={`Photo: ${p.type}`}
                      alt={`Photo: ${p.type}`}
                    />
                  </Pressable>
                  <View className="p-2">
                    <View className="flex-row items-center justify-between">
                      <Badge variant={photoTypeVariant(p.type)}>
                        {p.type}
                      </Badge>
                      <Text className="text-[10px] text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </Text>
                    </View>
                    {p.caption ? (
                      <Text
                        className="mt-1 text-xs text-foreground"
                        numberOfLines={2}
                      >
                        {p.caption}
                      </Text>
                    ) : null}
                    <View className="mt-2 flex-row gap-2">
                      <Pressable
                        onPress={() => setViewerPhoto(p)}
                        className="flex-row items-center rounded-md bg-muted px-2 py-1"
                      >
                        <Eye size={11} color={COLORS.mutedForeground} />
                        <Text className="ml-1 text-[10px] font-semibold text-muted-foreground">
                          View
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(p)}
                        className="flex-row items-center rounded-md bg-red-50 px-2 py-1"
                      >
                        <Trash2 size={11} color={COLORS.destructive} />
                        <Text className="ml-1 text-[10px] font-semibold text-destructive">
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Upload section */}
        <Card>
          <Text className="mb-3 text-base font-bold text-foreground">
            Add a Photo
          </Text>

          {/* Photo type selector */}
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photo Type
          </Text>
          <SegmentedControl
            options={PHOTO_TYPES}
            value={photoType}
            onChange={(v) => setPhotoType(v as PhotoType)}
            className="mb-3"
          />

          {/* Preview */}
          {previewUri ? (
            <View className="mb-3">
              <View className="relative overflow-hidden rounded-xl border border-border">
                <Image
                  source={{ uri: previewUri }}
                  className="h-48 w-full"
                  resizeMode="cover"
                  accessibilityLabel="Selected photo preview"
                  alt="Selected photo preview"
                />
                <Pressable
                  onPress={handleClearPreview}
                  className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/60"
                  accessibilityRole="button"
                  accessibilityLabel="Remove selected photo"
                >
                  <X size={16} color="#fff" />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Caption input */}
          {previewUri ? (
            <Input
              label="Caption (optional)"
              value={caption}
              onChangeText={setCaption}
              placeholder="e.g. Main valve before repair"
              maxLength={200}
            />
          ) : null}

          {/* Action buttons */}
          {!previewUri ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  variant="outline"
                  onPress={pickFromCamera}
                  disabled={uploadPhoto.isPending}
                >
                  <View className="flex-row items-center justify-center">
                    <Camera size={16} color={COLORS.primary} />
                    <Text className="ml-2 font-semibold text-primary-700">
                      Camera
                    </Text>
                  </View>
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  variant="secondary"
                  onPress={pickFromGallery}
                  disabled={uploadPhoto.isPending}
                >
                  <View className="flex-row items-center justify-center">
                    <ImagePlus size={16} color={COLORS.foreground} />
                    <Text className="ml-2 font-semibold text-foreground">
                      Gallery
                    </Text>
                  </View>
                </Button>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  variant="outline"
                  onPress={handleClearPreview}
                  disabled={uploadPhoto.isPending}
                >
                  Replace
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onPress={handleUpload}
                  loading={uploadPhoto.isPending}
                >
                  <View className="flex-row items-center justify-center">
                    <Upload size={16} color="#fff" />
                    <Text className="ml-2 font-semibold text-white">Upload</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          <Text className="mt-3 text-xs text-muted-foreground">
            Tap a saved photo to view full. Long-press to delete.
          </Text>
        </Card>
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal
        visible={!!viewerPhoto}
        onClose={() => setViewerPhoto(null)}
        position="center"
        showHandle={false}
      >
        {viewerPhoto ? (
          <View className="p-2">
            <Image
              source={{ uri: assetUrl(viewerPhoto.url) || viewerPhoto.url }}
              className="h-72 w-full"
              resizeMode="contain"
              accessibilityLabel="Photo preview"
              alt="Photo preview"
            />
            <View className="mt-2 flex-row items-center justify-between px-2 pb-2">
              <View>
                <Badge variant={photoTypeVariant(viewerPhoto.type)}>
                  {viewerPhoto.type}
                </Badge>
                {viewerPhoto.caption ? (
                  <Text className="mt-1 text-sm text-foreground">
                    {viewerPhoto.caption}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => setViewerPhoto(null)}
                className="rounded-full bg-muted px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-foreground">Close</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>

      <LoadingOverlay
        visible={uploadPhoto.isPending}
        message="Uploading photo…"
      />
    </SafeAreaView>
  );
}

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
