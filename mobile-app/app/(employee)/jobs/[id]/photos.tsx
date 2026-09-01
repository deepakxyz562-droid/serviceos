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
  RefreshCw,
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
  enqueuePhotoUpload,
  getPendingPhotosForJob,
  processPhotoQueue,
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
  // True while the user-initiated "Retry Upload" drain is in flight. Used
  // to disable the button + show a spinner. The auto-drain on focus doesn't
  // toggle this (it's best-effort and silent).
  const [retrying, setRetrying] = useState(false);

  // Keep a ref to the latest toast so the focus-effect drain closure always
  // calls the freshest show(). We update the ref in a useEffect (NOT during
  // render — React 19+ forbids that and the lint rule `react-hooks/refs`
  // enforces it).
  const toastRef = useRef(show);
  useEffect(() => {
    toastRef.current = show;
  }, [show]);

  // Refresh the per-job pending badge count from AsyncStorage. Called on
  // focus, after each retry, and after a new photo is enqueued.
  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingPhotosForJob(id);
      setPendingCount(pending.length);
    } catch {
      /* non-fatal */
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refetchPhotos();
      // Auto-drain the photo queue on focus: re-attempt any photos that
      // failed to upload while the device was offline. Best-effort —
      // failures stay queued and get bumped attempts so we don't loop.
      //
      // V1.6: Switched to the dedicated `processPhotoQueue()` which uses
      // a separate AsyncStorage key (`fieseros_photo_queue`) and persists
      // photo URIs in documentDirectory so the OS can't clean them up.
      // The drain is GLOBAL (across all jobs) — that's intentional: the
      // user might have queued photos for job A, navigated to job B, and
      // regained connectivity. Draining all pending uploads avoids
      // orphaned photos stuck in the queue for a job they're no longer
      // viewing.
      (async () => {
        try {
          const before = await getPendingPhotosForJob(id);
          if (before.length === 0) {
            // Still set the badge — there might be pending for OTHER jobs
            // (we don't show those in the per-job badge, but the user can
            // trigger Retry which drains globally).
            return;
          }
          setPendingCount(before.length);
          const synced = await processPhotoQueue();
          await refreshPendingCount();
          if (synced > 0) {
            toastRef.current(`${synced} photo${synced === 1 ? '' : 's'} synced.`, 'success');
            // Refresh the photos list so newly-uploaded photos appear.
            refetchPhotos();
          }
        } catch {
          /* swallow — draining is best-effort */
        }
      })();
      // Refresh the pending count badge when leaving the screen.
      return () => {
        refreshPendingCount();
      };
    }, [id, refetchPhotos, refreshPendingCount])
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
    // Best-effort GPS capture BEFORE building the FormData. Declared
    // outside the try block so the catch block can reuse it when queuing
    // the photo offline (otherwise the GPS coords would be lost on retry).
    let gps: GpsCoords | null = null;
    try {
      // Don't block the upload if the user denied location permission or
      // the fix times out — captureGps() returns null in those cases and
      // we proceed.
      gps = await captureGps();
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
      // Network error or 5xx → enqueue to the photo queue so the photo
      // isn't lost. The user gets a clear "saved offline" toast and the
      // queue auto-drains next time the screen is focused (or when they
      // tap "Retry Upload").
      //
      // V1.6: Switched to `enqueuePhotoUpload` which:
      //   1. Copies the photo to documentDirectory (so Android's cleanup
      //      of the camera cache can't lose it).
      //   2. Stores metadata under a dedicated `fieseros_photo_queue`
      //      AsyncStorage key (separate from checklist items).
      //   3. Captures GPS at queue time so it isn't lost on replay.
      const isNetwork =
        err instanceof ApiRequestError &&
        (err.statusCode === 0 || err.statusCode >= 500);
      if (isNetwork) {
        try {
          await enqueuePhotoUpload({
            jobId: id,
            photoUri: previewAsset.uri,
            photoName: previewAsset.fileName || `photo_${Date.now()}.jpg`,
            photoType,
            mimeType: previewAsset.mimeType || 'image/jpeg',
            caption: caption.trim() || undefined,
            // Reuse the GPS captured above so the queued photo retains
            // the same location provenance as the live upload would have.
            gps,
          });
          await refreshPendingCount();
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
  }, [previewAsset, id, photoType, caption, uploadPhoto, show, refreshPendingCount]);

  // V1.6 — Manual "Retry Upload" button. Drains the GLOBAL photo queue
  // (across all jobs). Useful when the user knows connectivity is back
  // but the auto-drain hasn't fired yet (e.g. they're already on the
  // screen and don't want to leave-and-return to trigger the focus
  // effect). Shows a spinner on the button + a toast with the result.
  const handleRetryUpload = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const synced = await processPhotoQueue();
      await refreshPendingCount();
      if (synced > 0) {
        show(`${synced} photo${synced === 1 ? '' : 's'} synced.`, 'success');
        // Refresh the photos list so newly-uploaded photos appear.
        refetchPhotos();
      } else {
        // Either the queue was empty, or every upload failed (still
        // offline). Distinguish via the updated pending count.
        if (pendingCount === 0) {
          show('No photos pending upload.', 'info');
        } else {
          show('Upload still failing — check your connection.', 'error');
        }
      }
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Retry failed.',
        'error'
      );
    } finally {
      setRetrying(false);
    }
  }, [retrying, refreshPendingCount, show, refetchPhotos, pendingCount]);

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
                  {pendingCount} {pendingCount === 1 ? 'photo' : 'photos'} pending upload
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-3">
            {/* V1.6 — Retry Upload button. Only shown when there are
                pending uploads. Drains the GLOBAL photo queue (across
                all jobs) so it also catches photos queued on other
                screens. */}
            {pendingCount > 0 ? (
              <Pressable
                onPress={handleRetryUpload}
                disabled={retrying}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Retry pending photo uploads"
              >
                <View className="flex-row items-center">
                  <RefreshCw
                    size={12}
                    color={retrying ? COLORS.mutedForeground : COLORS.primary}
                  />
                  <Text
                    className={`ml-1 text-xs font-semibold ${
                      retrying ? 'text-muted-foreground' : 'text-primary-700'
                    }`}
                  >
                    {retrying ? 'Syncing…' : 'Retry Upload'}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable onPress={() => photosQuery.refetch()} hitSlop={8}>
              <Text className="text-xs font-semibold text-primary-700">Refresh</Text>
            </Pressable>
          </View>
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
                      accessibilityLabel={`Photo: ${p.photoType}`}
                      alt={`Photo: ${p.photoType}`}
                    />
                  </Pressable>
                  <View className="p-2">
                    <View className="flex-row items-center justify-between">
                      <Badge variant={photoTypeVariant(p.photoType)}>
                        {p.photoType}
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
                <Badge variant={photoTypeVariant(viewerPhoto.photoType)}>
                  {viewerPhoto.photoType}
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
