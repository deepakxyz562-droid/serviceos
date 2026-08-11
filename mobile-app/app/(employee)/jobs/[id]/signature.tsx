/**
 * Job Signature (Employee) — rewrite.
 *
 * PWA-parity features:
 *   - Real signature capture on native using react-native-svg + Gesture.Pan().
 *   - Strokes are rendered as SVG <Path> (smooth lines, not 1×1 dots).
 *   - Save converts the rendered SVG to a PNG:
 *       • Native: react-native-view-shot captureRef → base64 PNG.
 *       • Web: HTML5 canvas → toDataURL.
 *   - Uploads PNG via FormData to POST /api/jobs/[id]/signatures
 *     with `type` (customer/employee) + `signerName` + (best-effort)
 *     latitude / longitude. The backend JobSignature schema has these GPS
 *     columns; attaching them brings mobile to parity with the PWA's
 *     SignaturePad (which captures GPS at save time).
 *   - Signer name input + signature type SegmentedControl.
 *   - Existing signatures list (fetched via JWT-authed api client — no more
 *     raw fetch() bug).
 *   - Clear / Save buttons with toast feedback.
 *
 * FIXES the old bug where native saved a 1×1 transparent PNG. The new code
 * always captures the actual drawn strokes.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Svg, { Path, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import {
  ArrowLeft,
  PenLine,
  Trash2,
  Check,
  ImageOff,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useJob, useJobSignatures, useUploadSignature } from '@/hooks/use-jobs';
import { assetUrl } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { captureGps } from '@/lib/gps';
import {
  strokeToPath,
  strokesToPngDataUrlWeb,
  dataUrlToBlob,
  SIGNATURE_STROKE_COLOR,
  SIGNATURE_STROKE_WIDTH,
  type Stroke,
} from '@/lib/job-proof-helpers';
import type { JobSignature } from '@/types';

type SignerType = 'customer' | 'employee';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 40, 480);
const CANVAS_HEIGHT = 220;

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function JobSignatureScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const { show } = useToast();

  const { data: job, isLoading, error } = useJob(id);
  const signaturesQuery = useJobSignatures(id);
  const uploadSignature = useUploadSignature();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [signerName, setSignerName] = useState('');
  const [signerType, setSignerType] = useState<SignerType>('customer');

  const svgContainerRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      signaturesQuery.refetch();
       
    }, [id])
  );

  const existingSignatures: JobSignature[] =
    signaturesQuery.data ?? job?.signatures ?? [];

  const hasInk = strokes.length > 0 || currentStroke.length > 0;

  // Pan gesture: native + web compatible via runOnJS.
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
    if (!id) return;

    const allStrokes =
      currentStroke.length > 0 ? [...strokes, currentStroke] : strokes;

    try {
      let formData: FormData;

      if (Platform.OS === 'web') {
        const dataUrl = strokesToPngDataUrlWeb(allStrokes, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (!dataUrl) throw new Error('Failed to render signature.');
        const blob = dataUrlToBlob(dataUrl);
        formData = new FormData();
        formData.append('file', blob, 'signature.png');
      } else {
        // Native: capture the rendered SVG container as a PNG file.
        if (!svgContainerRef.current) {
          throw new Error('Signature pad not ready.');
        }
        const fileUri = await captureRef(svgContainerRef, {
          format: 'png',
          quality: 1,
          // default result is 'tmpfile' which returns a file:// URI suitable
          // for FormData upload on iOS + Android.
        });
        formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          name: 'signature.png',
          type: 'image/png',
        } as unknown as Blob);
      }

      formData.append('type', signerType);
      formData.append('signerName', signerName.trim());

      // Best-effort GPS capture at save time (matches PWA's SignaturePad).
      // If the user denied location permission or the fix times out, we
      // still upload the signature — just without coordinates. captureGps
      // swallows errors and returns null.
      const gps = await captureGps();
      if (gps) {
        formData.append('latitude', String(gps.latitude));
        formData.append('longitude', String(gps.longitude));
        if (gps.accuracy !== null && gps.accuracy !== undefined) {
          formData.append('accuracy', String(gps.accuracy));
        }
      }

      await uploadSignature.mutateAsync({ id, formData });
      show('Signature saved.', 'success');
      handleClear();
      signaturesQuery.refetch();
      router.back();
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
    id,
    strokes,
    currentStroke,
    uploadSignature,
    show,
    handleClear,
    signaturesQuery,
  ]);

  if (isLoading && !job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Signature" />
        <View className="mt-4 px-4">
          <Card className="h-64"><View /></Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Signature" />
        <EmptyState
          icon={<PenLine size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={error instanceof Error ? error.message : 'Please go back and try again.'}
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Signature" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-3 mt-2 text-base font-bold text-foreground">
          Collect Signature
        </Text>

        {/* Signer type */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Signer Type
        </Text>
        <SegmentedControl
          options={[
            { value: 'customer', label: 'Customer' },
            { value: 'employee', label: 'Employee' },
          ]}
          value={signerType}
          onChange={(v) => setSignerType(v as SignerType)}
          className="mb-4"
        />

        {/* Signer name */}
        <Input
          label="Signer Name"
          value={signerName}
          onChangeText={setSignerName}
          placeholder={signerType === 'customer' ? "Customer's full name" : 'Your name'}
        />

        {/* Signature canvas */}
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Signature
        </Text>
        <GestureDetector gesture={panGesture}>
          <View
            ref={svgContainerRef}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              borderWidth: 2,
              borderColor: COLORS.border,
              borderRadius: 12,
              backgroundColor: '#fff',
              overflow: 'hidden',
              alignSelf: 'center',
            }}
          >
            <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
              <Rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="#fff"
              />
              {/* Baseline */}
              <Rect
                x={16}
                y={CANVAS_HEIGHT - 32}
                width={CANVAS_WIDTH - 32}
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

        {/* Canvas controls */}
        <View className="mt-3 flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" onPress={handleClear} disabled={!hasInk}>
              <View className="flex-row items-center justify-center">
                <Trash2 size={16} color={COLORS.primary} />
                <Text className="ml-2 font-semibold text-primary-700">Clear</Text>
              </View>
            </Button>
          </View>
          <View className="flex-1">
            <Button
              onPress={handleSave}
              loading={uploadSignature.isPending}
              disabled={!hasInk}
            >
              <View className="flex-row items-center justify-center">
                <Check size={16} color="#fff" />
                <Text className="ml-2 font-semibold text-white">Save</Text>
              </View>
            </Button>
          </View>
        </View>

        <Text className="mt-3 text-xs text-muted-foreground">
          Draw inside the box above using your finger or mouse. The signature is
          uploaded as a PNG image.
        </Text>

        {/* Existing signatures */}
        <Text className="mb-2 mt-5 text-base font-bold text-foreground">
          Existing Signatures ({existingSignatures.length})
        </Text>
        {signaturesQuery.isLoading && existingSignatures.length === 0 ? (
          <Card>
            <Text className="text-sm text-muted-foreground">Loading…</Text>
          </Card>
        ) : existingSignatures.length === 0 ? (
          <EmptyState
            icon={<ImageOff size={36} color={COLORS.mutedForeground} />}
            title="No signatures yet"
            description="Signatures collected for this job will appear here."
          />
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {existingSignatures.map((s) => {
              const url = assetUrl(s.url) || s.url;
              return (
                <View
                  key={s.id}
                  className="mb-3 overflow-hidden rounded-xl border border-border bg-white"
                  style={{ width: '48%' }}
                >
                  <Image
                    source={{ uri: url }}
                    className="h-24 w-full bg-white"
                    resizeMode="contain"
                    accessibilityLabel={`Signature by ${s.signerName || 'unknown'}`}
                    alt={`Signature by ${s.signerName || 'unknown'}`}
                  />
                  <View className="p-2">
                    <View className="flex-row items-center justify-between">
                      <Badge variant={s.type === 'customer' ? 'primary' : 'info'}>
                        {s.type}
                      </Badge>
                      <Text className="text-[10px] text-muted-foreground">
                        {formatDate(s.createdAt)}
                      </Text>
                    </View>
                    {s.signerName ? (
                      <Text className="mt-1 text-xs font-semibold text-foreground">
                        {s.signerName}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <LoadingOverlay
        visible={uploadSignature.isPending}
        message="Saving signature…"
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
