import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IMAGE_PROVIDER_CHOICES,
  IMAGE_PROVIDER_LABELS,
  IMAGE_QUICK_FIX_OPTIONS,
  buildRefinedImagePrompt,
  type ImageCandidate,
  type ImageProviderChoice,
} from '../../../../shared/image-review';

export interface FullscreenImageModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  /** Optional custom visual node instead of raw image URL (e.g. composite poster preview) */
  renderCustomContent?: () => React.ReactNode;
  /** Render as absolute fill overlay inside an already-open RN Modal to avoid iOS nested Modal conflicts */
  asOverlay?: boolean;
  /** In-session generated variations (v1, v2, v3...) */
  candidates?: ImageCandidate[];
  selectedUrl?: string | null;
  onSelectCandidate?: (candidate: ImageCandidate) => void;
  /** Enable AI quality review actions ("Looks Good — Use Image" / "Not Good — Fix & Retry") */
  reviewMode?: boolean;
  isApproved?: boolean;
  onApprove?: (url: string) => void;
  basePrompt?: string;
  activeProvider?: ImageProviderChoice;
  allowProviderSwitch?: boolean;
  regenerating?: boolean;
  errorMessage?: string | null;
  onRegenerate?: (params: {
    prompt: string;
    fixIds: string[];
    customNote: string;
    provider?: ImageProviderChoice;
  }) => void | Promise<void>;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function FullscreenImageModal({
  visible,
  onClose,
  imageUrl,
  title = 'Image Inspection',
  subtitle,
  renderCustomContent,
  asOverlay = false,
  candidates,
  selectedUrl,
  onSelectCandidate,
  reviewMode = false,
  isApproved = false,
  onApprove,
  basePrompt = '',
  activeProvider = 'cloudflare',
  allowProviderSwitch = false,
  regenerating = false,
  errorMessage = null,
  onRegenerate,
}: FullscreenImageModalProps) {
  const insets = useSafeAreaInsets();
  const { width: viewportW, height: viewportH } = useWindowDimensions();

  const resolvedCandidates = useMemo<ImageCandidate[]>(() => {
    if (Array.isArray(candidates) && candidates.length > 0) {
      return candidates;
    }
    if (imageUrl && imageUrl.trim()) {
      return [{ id: 'single-current', url: imageUrl.trim(), provider: activeProvider }];
    }
    return [];
  }, [candidates, imageUrl, activeProvider]);

  const activeUrl = useMemo(() => {
    if (selectedUrl && resolvedCandidates.some((c) => c.url === selectedUrl)) {
      return selectedUrl;
    }
    if (imageUrl && imageUrl.trim()) return imageUrl.trim();
    return resolvedCandidates[resolvedCandidates.length - 1]?.url || '';
  }, [selectedUrl, imageUrl, resolvedCandidates]);

  const activeCandidateIdx = useMemo(() => {
    const idx = resolvedCandidates.findIndex((c) => c.url === activeUrl);
    return idx >= 0 ? idx : resolvedCandidates.length - 1;
  }, [resolvedCandidates, activeUrl]);

  const activeCandidate =
    activeCandidateIdx >= 0 ? resolvedCandidates[activeCandidateIdx] : undefined;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [chromeHidden, setChromeHidden] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [selectedFixIds, setSelectedFixIds] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [providerOverride, setProviderOverride] = useState<ImageProviderChoice>(activeProvider);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCandCountRef = useRef(resolvedCandidates.length);
  const gestureRef = useRef<{
    mode: 'idle' | 'pan' | 'pinch';
    startZoom: number;
    startDistance: number;
    startPan: { x: number; y: number };
    downAt: number;
  }>({
    mode: 'idle',
    startZoom: 1,
    startDistance: 0,
    startPan: { x: 0, y: 0 },
    downAt: 0,
  });

  useEffect(() => {
    setProviderOverride(activeCandidate?.provider || activeProvider);
  }, [activeProvider, activeCandidate?.provider]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageError(false);
  }, [activeUrl, visible]);

  useEffect(() => {
    if (!visible) {
      setChromeHidden(false);
      setRefineOpen(false);
      setSelectedFixIds([]);
      setCustomNote('');
    }
  }, [visible]);

  // Collapse refine panel automatically once a newly generated image arrives
  useEffect(() => {
    if (resolvedCandidates.length > prevCandCountRef.current) {
      setRefineOpen(false);
      setSelectedFixIds([]);
      setCustomNote('');
    }
    prevCandCountRef.current = resolvedCandidates.length;
  }, [resolvedCandidates.length]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
    };
  }, []);

  const applyZoom = (nextZoom: number) => {
    const clamped = Math.round(clamp(nextZoom, 1, 4) * 100) / 100;
    setZoom(clamped);
    if (clamped <= 1) {
      setPan({ x: 0, y: 0 });
    } else {
      const maxX = Math.max(40, (viewportW * (clamped - 1)) / 2);
      const maxY = Math.max(40, (viewportH * (clamped - 1)) / 2);
      setPan((p) => ({
        x: clamp(p.x, -maxX, maxX),
        y: clamp(p.y, -maxY, maxY),
      }));
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches || [];
        gestureRef.current.downAt = Date.now();
        gestureRef.current.startZoom = zoomRef.current;
        gestureRef.current.startPan = { ...panRef.current };
        if (touches.length >= 2) {
          const [a, b] = touches;
          gestureRef.current.mode = 'pinch';
          gestureRef.current.startDistance = Math.hypot(
            b.pageX - a.pageX,
            b.pageY - a.pageY,
          );
        } else {
          gestureRef.current.mode = zoomRef.current > 1 ? 'pan' : 'idle';
          gestureRef.current.startDistance = 0;
        }
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches || [];
        if (touches.length >= 2) {
          const [a, b] = touches;
          const dist = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          if (!gestureRef.current.startDistance) {
            gestureRef.current.mode = 'pinch';
            gestureRef.current.startDistance = dist || 1;
            gestureRef.current.startZoom = zoomRef.current;
            return;
          }
          const factor = dist / Math.max(1, gestureRef.current.startDistance);
          const nextZ = clamp(gestureRef.current.startZoom * factor, 1, 4);
          setZoom(Math.round(nextZ * 100) / 100);
          if (nextZ <= 1.02) {
            setPan({ x: 0, y: 0 });
          }
          return;
        }

        if (zoomRef.current > 1.01 && gestureRef.current.mode !== 'pinch') {
          gestureRef.current.mode = 'pan';
          const curZ = zoomRef.current;
          const maxX = Math.max(40, (viewportW * (curZ - 1)) / 2);
          const maxY = Math.max(40, (viewportH * (curZ - 1)) / 2);
          setPan({
            x: clamp(gestureRef.current.startPan.x + g.dx, -maxX, maxX),
            y: clamp(gestureRef.current.startPan.y + g.dy, -maxY, maxY),
          });
        }
      },
      onPanResponderRelease: (_, g) => {
        const moved = Math.hypot(g.dx, g.dy);
        const duration = Date.now() - gestureRef.current.downAt;
        const wasTap = gestureRef.current.mode !== 'pinch' && moved < 6 && duration < 280;
        gestureRef.current.mode = 'idle';
        gestureRef.current.startDistance = 0;

        if (!wasTap) return;

        const now = Date.now();
        if (now - lastTapRef.current < 280) {
          lastTapRef.current = 0;
          if (singleTapTimerRef.current) {
            clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }
          applyZoom(zoomRef.current > 1.25 ? 1 : 2.5);
        } else {
          lastTapRef.current = now;
          if (singleTapTimerRef.current) {
            clearTimeout(singleTapTimerRef.current);
          }
          singleTapTimerRef.current = setTimeout(() => {
            setChromeHidden((prev) => !prev);
            singleTapTimerRef.current = null;
          }, 260);
        }
      },
      onPanResponderTerminate: () => {
        gestureRef.current.mode = 'idle';
      },
    }),
  ).current;

  if (!visible) return null;

  const topPad = Math.max(insets.top, Platform.OS === 'ios' ? 16 : 12);
  const bottomPad = Math.max(insets.bottom, 12);

  const toggleFixChip = (id: string) => {
    setSelectedFixIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleTriggerRegenerate = async () => {
    if (!onRegenerate || regenerating) return;
    const seedPrompt = activeCandidate?.prompt || basePrompt;
    const refined = buildRefinedImagePrompt(seedPrompt, selectedFixIds, customNote);
    await onRegenerate({
      prompt: refined,
      fixIds: selectedFixIds,
      customNote: customNote.trim(),
      provider: providerOverride,
    });
  };

  const versionMeta =
    resolvedCandidates.length > 1 && activeCandidateIdx >= 0
      ? `Version ${activeCandidateIdx + 1} of ${resolvedCandidates.length}`
      : subtitle;

  const viewerBody = (
    <View style={styles.backdrop}>
      {/* Interactive Zoom / Pan Canvas */}
      <View style={styles.canvasWrap} {...panResponder.panHandlers}>
        {renderCustomContent ? (
          <View
            style={[
              styles.zoomLayer,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: zoom },
                ],
              },
            ]}
          >
            {renderCustomContent()}
          </View>
        ) : activeUrl ? (
          <View
            style={[
              styles.zoomLayer,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: zoom },
                ],
              },
            ]}
          >
            <Image
              source={{ uri: activeUrl }}
              style={{
                width: viewportW,
                height: Math.max(240, viewportH - (chromeHidden ? 40 : 210)),
              }}
              resizeMode="contain"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              alt={title}
            />
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="broken-image" size={44} color="#64748B" />
            <Text style={styles.emptyText}>No image available to inspect.</Text>
          </View>
        )}

        {imageLoading && !renderCustomContent ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : null}

        {imageError && !renderCustomContent ? (
          <View style={styles.errorCenterCard}>
            <MaterialIcons name="broken-image" size={32} color="#FCA5A5" />
            <Text style={styles.errorCenterText}>Could not load full image preview.</Text>
          </View>
        ) : null}
      </View>

      {/* Top HUD */}
      {chromeHidden ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show controls"
          onPress={() => setChromeHidden(false)}
          style={[styles.restoreHudBtn, { top: topPad + 8 }]}
        >
          <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
          <Text style={styles.restoreHudText}>Show controls</Text>
        </Pressable>
      ) : (
        <View style={[styles.topHud, { paddingTop: topPad + 6 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close full screen preview"
            onPress={onClose}
            hitSlop={10}
            style={styles.hudIconBtn}
          >
            <MaterialIcons name="close" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.hudTitle} numberOfLines={1}>
              {title}
            </Text>
            {versionMeta ? (
              <Text style={styles.hudSub} numberOfLines={1}>
                {versionMeta}
              </Text>
            ) : (
              <Text style={styles.hudSub} numberOfLines={1}>
                Pinch or double-tap to zoom · Tap once for clean view
              </Text>
            )}
          </View>

          <View style={styles.zoomToolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out image"
              onPress={() => applyZoom(zoom - 0.5)}
              disabled={zoom <= 1}
              hitSlop={6}
              style={[styles.zoomChipBtn, zoom <= 1 && { opacity: 0.4 }]}
            >
              <MaterialIcons name="remove" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset zoom"
              onPress={() => applyZoom(zoom > 1.05 ? 1 : 2)}
              style={styles.zoomPctBtn}
            >
              <Text style={styles.zoomPctText}>{zoom.toFixed(1).replace(/\.0$/, '')}×</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in image"
              onPress={() => applyZoom(zoom + 0.5)}
              disabled={zoom >= 4}
              hitSlop={6}
              style={[styles.zoomChipBtn, zoom >= 4 && { opacity: 0.4 }]}
            >
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hide controls"
              onPress={() => setChromeHidden(true)}
              hitSlop={6}
              style={[styles.zoomChipBtn, { marginLeft: 4 }]}
            >
              <MaterialIcons name="fullscreen" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom HUD: Variation Strip + Quality Review Controls */}
      {!chromeHidden ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.bottomHudAvoid}
        >
        <View style={[styles.bottomHud, { paddingBottom: bottomPad }]}>
          {resolvedCandidates.length > 1 ? (
            <View style={styles.candidateBar}>
              <Text style={styles.candidateHeaderText}>
                Compare versions ({resolvedCandidates.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {resolvedCandidates.map((cand, idx) => {
                  const isActive = cand.url === activeUrl;
                  return (
                    <Pressable
                      key={cand.id || cand.url}
                      accessibilityRole="button"
                      accessibilityLabel={`Select version ${idx + 1}`}
                      onPress={() => onSelectCandidate?.(cand)}
                      style={[
                        styles.candThumbWrap,
                        isActive && styles.candThumbWrapActive,
                      ]}
                    >
                      <Image
                        source={{ uri: cand.url }}
                        style={styles.candThumbImg}
                        resizeMode="cover"
                        alt={`Generated version ${idx + 1}`}
                      />
                      <View
                        style={[
                          styles.candVersionBadge,
                          isActive && styles.candVersionBadgeActive,
                        ]}
                      >
                        <Text style={styles.candVersionText}>v{idx + 1}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={15} color="#FCA5A5" />
              <Text style={styles.errorBannerText} numberOfLines={2}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {regenerating ? (
            <View style={styles.regenBanner}>
              <ActivityIndicator size="small" color="#C4B5FD" />
              <Text style={styles.regenBannerText}>
                Generating fresh variation… Previous versions remain saved above.
              </Text>
            </View>
          ) : null}

          {reviewMode ? (
            <View style={{ gap: 10 }}>
              {refineOpen ? (
                <View style={styles.refineBox}>
                  <View style={styles.refineHeader}>
                    <Text style={styles.refineTitle}>What wasn&apos;t right?</Text>
                    <Pressable
                      onPress={() => setRefineOpen(false)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Close refine options"
                    >
                      <Text style={styles.refineDismissText}>Hide</Text>
                    </Pressable>
                  </View>

                  <View style={styles.fixChipGrid}>
                    {IMAGE_QUICK_FIX_OPTIONS.map((opt) => {
                      const active = selectedFixIds.includes(opt.id);
                      return (
                        <Pressable
                          key={opt.id}
                          accessibilityRole="button"
                          onPress={() => toggleFixChip(opt.id)}
                          style={[styles.fixChip, active && styles.fixChipActive]}
                        >
                          {active ? (
                            <MaterialIcons name="check" size={12} color="#ECFDF5" />
                          ) : null}
                          <Text
                            style={[
                              styles.fixChipText,
                              active && styles.fixChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <TextInput
                    value={customNote}
                    onChangeText={setCustomNote}
                    placeholder="Add optional fix note (e.g. brighter lighting, no text overlay)"
                    placeholderTextColor="#94A3B8"
                    style={styles.refineInput}
                  />

                  {allowProviderSwitch ? (
                    <View style={styles.providerRow}>
                      <Text style={styles.providerLabel}>Model:</Text>
                      {IMAGE_PROVIDER_CHOICES.map((prov) => {
                        const selected = providerOverride === prov;
                        return (
                          <Pressable
                            key={prov}
                            accessibilityRole="button"
                            onPress={() => setProviderOverride(prov)}
                            style={[
                              styles.providerPill,
                              selected && styles.providerPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.providerPillText,
                                selected && styles.providerPillTextActive,
                              ]}
                            >
                              {IMAGE_PROVIDER_LABELS[prov]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={regenerating}
                    onPress={() => void handleTriggerRegenerate()}
                    style={[
                      styles.regenConfirmBtn,
                      regenerating && { opacity: 0.65 },
                    ]}
                  >
                    {regenerating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <MaterialIcons name="auto-fix-high" size={17} color="#FFFFFF" />
                    )}
                    <Text style={styles.regenConfirmText}>
                      {regenerating ? 'Generating Variation…' : 'Regenerate Variation'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.decisionRow}>
                {onRegenerate ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Not good, fix and regenerate image"
                    disabled={regenerating}
                    onPress={() => setRefineOpen((prev) => !prev)}
                    style={[
                      styles.rejectBtn,
                      refineOpen && styles.rejectBtnActive,
                      regenerating && { opacity: 0.6 },
                    ]}
                  >
                    <MaterialIcons name="thumb-down-off-alt" size={17} color="#F8FAFC" />
                    <Text style={styles.rejectBtnText}>
                      {refineOpen ? 'Fix & Retry Open' : 'Not Good · Fix'}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Looks good, use this image"
                  disabled={!activeUrl}
                  onPress={() => {
                    if (activeUrl) onApprove?.(activeUrl);
                    onClose();
                  }}
                  style={[styles.approveBtn, !activeUrl && { opacity: 0.5 }]}
                >
                  <MaterialIcons name="thumb-up-off-alt" size={17} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>
                    {isApproved ? 'Selected · Close' : 'Looks Good · Use Image'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.readonlyBar}>
              <Text style={styles.readonlyHint} numberOfLines={1}>
                Pinch or tap 2× to inspect fine details
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={styles.readonlyCloseBtn}
              >
                <Text style={styles.readonlyCloseText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );

  if (asOverlay) {
    return <View style={styles.overlayRoot}>{viewerBody}</View>;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {viewerBody}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#000000',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  canvasWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoomLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCenterCard: {
    position: 'absolute',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  errorCenterText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13.5,
    fontWeight: '600',
  },
  topHud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  hudIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  hudTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  hudSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 1,
  },
  zoomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomChipBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPctBtn: {
    paddingHorizontal: 8,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPctText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  restoreHudBtn: {
    position: 'absolute',
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  restoreHudText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  bottomHudAvoid: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomHud: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.86)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  candidateBar: {
    gap: 6,
  },
  candidateHeaderText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  candThumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: '#0F172A',
  },
  candThumbWrapActive: {
    borderColor: '#10B981',
  },
  candThumbImg: {
    width: '100%',
    height: '100%',
  },
  candVersionBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  candVersionBadgeActive: {
    backgroundColor: '#059669',
  },
  candVersionText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(127, 29, 29, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  errorBannerText: {
    flex: 1,
    color: '#FECACA',
    fontSize: 11.5,
    fontWeight: '600',
  },
  regenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(91, 33, 182, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  regenBannerText: {
    flex: 1,
    color: '#EDE9FE',
    fontSize: 11.5,
    fontWeight: '600',
  },
  refineBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  refineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refineTitle: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: '800',
  },
  refineDismissText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  fixChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fixChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  fixChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#A78BFA',
  },
  fixChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  fixChipTextActive: {
    color: '#FFFFFF',
  },
  refineInput: {
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  providerLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  providerPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  providerPillActive: {
    backgroundColor: '#059669',
    borderColor: '#34D399',
  },
  providerPillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  providerPillTextActive: {
    color: '#FFFFFF',
  },
  regenConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#7C3AED',
  },
  regenConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rejectBtnActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
    borderColor: '#A78BFA',
  },
  rejectBtnText: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: '800',
  },
  approveBtn: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#009F50',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  readonlyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  readonlyHint: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '600',
  },
  readonlyCloseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  readonlyCloseText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
