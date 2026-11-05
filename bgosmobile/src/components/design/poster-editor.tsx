import { addedPhotoFrame, photoFit, verticalAnchor } from '../../../../shared/photo-framing';
import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  PanResponder,
  ScrollView,
  Linking,
  Keyboard,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { apiRequest } from '../../lib/api';
import { layersAtPoint, toolForLayer } from '../../../../shared/design-selection';
import { PROFESSIONAL_ASSETS } from './professional-assets';
import { PosterPreview } from './poster-preview';
import { gestureLayer } from '../../../../shared/design-gestures';
import {
  patchDesignLayer,
  resizeDesign,
  groupLayers,
  ungroupLayers,
  collageImages,
} from '../../../../shared/design-editor';
import type { MarketingDesign, DesignLayer } from '../../../../shared/marketing-design';
import { friendlyLayerName } from '../../lib/calendar-utils';
export { friendlyLayerName };

const COLOR_PALETTE = [
  { hex: '#0F172A', name: 'Dark Slate' },
  { hex: '#009F50', name: 'Emerald Brand' },
  { hex: '#2563EB', name: 'Royal Blue' },
  { hex: '#D97706', name: 'Amber Gold' },
  { hex: '#DC2626', name: 'Crimson' },
  { hex: '#9333EA', name: 'Purple' },
  { hex: '#0D9488', name: 'Teal' },
  { hex: '#FFFFFF', name: 'White', darkBorder: true },
];

export function getFriendlyName(id: string): string {
  if (id === 'headline') return 'Main Headline';
  if (id === 'brand') return 'Brand Name';
  if (id === 'badge') return 'Offer / Category Badge';
  if (id === 'cta') return 'Call To Action (CTA)';
  if (id === 'footer') return 'Contact & Website Footer';
  if (id === 'bg_photo') return 'Background Photo';
  if (id === 'logo') return 'Brand Logo';
  if (id.startsWith('service_')) return `Service Line ${id.replace('service_', '')}`;
  if (id === 'copy_scrim') return 'Readability Scrim';
  if (id.startsWith('copy_fade_')) return 'Fade Gradient';
  if (id.startsWith('service_mark_')) return 'Service Bullet Mark';
  if (id === 'cta_background') return 'CTA Button Background';
  if (id === 'services_panel') return 'Services Container';
  return friendlyLayerName(id);
}

export function PosterEditor({
  doc,
  onChange,
  selectedLayerId,
  onSelectLayer,
  onOpenTemplates,
  onOpenRatio,
  onGestureActive,
}: {
  selectedLayerId?: string;
  onSelectLayer?: (id: string) => void;
  doc: MarketingDesign;
  onChange: (doc: MarketingDesign) => void;
  onOpenTemplates?: () => void;
  onOpenRatio?: () => void;
  onGestureActive?: (active: boolean) => void;
}) {
  const [localSelected, setLocalSelected] = useState('');
  const selected = selectedLayerId ?? localSelected;

  function setSelected(id: string) {
    setLocalSelected(id);
    onSelectLayer?.(id);
  }

  const [layersOpen, setLayersOpen] = useState(false);
  const [decorationsOpen, setDecorationsOpen] = useState(false);
  const [overlapIds, setOverlapIds] = useState<string[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(1);
  const [activeTool, setActiveTool] = useState<'text' | 'color' | 'photo'>('text');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [removingBgLayerId, setRemovingBgLayerId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MarketingDesign | null>(null);

  useEffect(() => {
    setPreview(null);
  }, [doc]);

  const visibleDoc = preview || doc;
  const layer = visibleDoc.layers.find((l) => l.id === selected);
  const isBackdrop = Boolean(
    layer &&
      layer.id === 'bg_photo' &&
      layer.x === 0 &&
      layer.y === 0 &&
      layer.width >= doc.width &&
      layer.height >= doc.height
  );

  function selectLayer(id: string) {
    setSelected(id);
    const targetLayer = doc.layers.find((l) => l.id === id);
    if (targetLayer) {
      setActiveTool(toolForLayer(targetLayer));
    }
    setLayersOpen(false);
  }

  function done() {
    Keyboard.dismiss();
    setSelected('');
    setOverlapIds([]);
  }

  const current = useRef({ doc, onChange, width: canvasWidth, selected, onGestureActive });
  current.current = { doc, onChange, width: canvasWidth, selected, onGestureActive };

  const pendingGesture = useRef<Partial<DesignLayer> | null>(null);
  const drag = useRef<{ layer: DesignLayer; doc: MarketingDesign; distance: number; angle: number } | null>(
    null
  );

  function patch(values: Partial<DesignLayer>) {
    try {
      onChange(patchDesignLayer(doc, selected, values));
      setError('');
    } catch {
      setError('This adjustment does not fit the canvas.');
    }
  }

  // ── TOUCH GESTURE RESPONDERS (MOVE, RESIZE, ROTATE) ──────────────────────
  const dragStart = useRef<{
    layer: DesignLayer;
    doc: MarketingDesign;
    touchDistance: number;
    touchAngle: number;
  } | null>(null);

  const resizeStart = useRef<{
    layer: DesignLayer;
    doc: MarketingDesign;
    aspectRatio: number;
    isAspectLocked: boolean;
  } | null>(null);

  const rotateStart = useRef<{
    layer: DesignLayer;
    doc: MarketingDesign;
    initialRotation: number;
    centerX: number;
    centerY: number;
    startTouchAngle: number;
  } | null>(null);

  // 1. Direct Touch Drag on Layer Body (Single-finger Move & Two-finger Pinch/Twist)
  const bodyResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        current.current.onGestureActive?.(true);
        pendingGesture.current = null;
        dragStart.current = null;
        const c = current.current;
        const l = c.doc.layers.find((lyr) => lyr.id === c.selected);
        if (!l || l.locked) return;
        const [a, b] = e.nativeEvent.touches;
        dragStart.current = {
          layer: l,
          doc: c.doc,
          touchDistance: b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0,
          touchAngle: b ? Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) : 0,
        };
      },
      onPanResponderMove: (e, g) => {
        const start = dragStart.current;
        if (!start || start.layer.locked) return;
        const c = current.current;
        const scale = c.doc.width / c.width;
        const touches = e.nativeEvent.touches;

        let p: Partial<DesignLayer>;
        if (touches.length >= 2 && !start.touchDistance) {
          const [a, b] = touches;
          start.touchDistance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          start.touchAngle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
        }

        if (touches.length >= 2 && start.touchDistance) {
          // Multi-touch: simultaneous pinch-zoom and twist-rotate
          const [a, b] = touches;
          const currentDist = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          const factor = Math.max(0.15, Math.min(6, currentDist / start.touchDistance));
          const currentAngle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          const deltaAngle = ((currentAngle - start.touchAngle) * 180) / Math.PI;

          let newRot = ((start.layer.rotation || 0) + deltaAngle) % 360;
          if (newRot > 180) newRot -= 360;
          if (newRot < -180) newRot += 360;

          p = {
            width: Math.max(24, Math.min(start.doc.width, Math.round(start.layer.width * factor))),
            height: Math.max(24, Math.min(start.doc.height, Math.round(start.layer.height * factor))),
            rotation: Math.round(newRot),
          };
        } else {
          // Single-touch: smooth move with boundary clamping & snap
          const dx = g.dx * scale;
          const dy = g.dy * scale;
          let x = Math.round(start.layer.x + dx);
          let y = Math.round(start.layer.y + dy);

          const minX = -Math.round(start.layer.width * 0.4);
          const maxX = start.doc.width - Math.round(start.layer.width * 0.6);
          const minY = -Math.round(start.layer.height * 0.4);
          const maxY = start.doc.height - Math.round(start.layer.height * 0.6);

          x = Math.max(minX, Math.min(maxX, x));
          y = Math.max(minY, Math.min(maxY, y));

          // Center snap when near center
          if (Math.abs(x + start.layer.width / 2 - start.doc.width / 2) < 16) {
            x = Math.round((start.doc.width - start.layer.width) / 2);
          }
          if (Math.abs(y + start.layer.height / 2 - start.doc.height / 2) < 16) {
            y = Math.round((start.doc.height - start.layer.height) / 2);
          }

          p = { x, y };
        }

        pendingGesture.current = p;
        setPreview(patchDesignLayer(start.doc, start.layer.id, p));
      },
      onPanResponderRelease: () => {
        current.current.onGestureActive?.(false);
        setPreview(null);
        const start = dragStart.current;
        dragStart.current = null;
        if (start && pendingGesture.current) {
          current.current.onChange(patchDesignLayer(start.doc, start.layer.id, pendingGesture.current));
        }
        pendingGesture.current = null;
      },
      onPanResponderTerminate: () => {
        current.current.onGestureActive?.(false);
        setPreview(null);
        dragStart.current = null;
        pendingGesture.current = null;
      },
    })
  ).current;

  // 2. Corner Grip Handle (Bottom-Right Drag to Resize)
  const resizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        current.current.onGestureActive?.(true);
        pendingGesture.current = null;
        resizeStart.current = null;
        const c = current.current;
        const l = c.doc.layers.find((lyr) => lyr.id === c.selected);
        if (!l || l.locked) return;
        resizeStart.current = {
          layer: l,
          doc: c.doc,
          aspectRatio: l.width / Math.max(1, l.height),
          isAspectLocked:
            l.type === 'image' ||
            l.id.includes('photo') ||
            l.id.includes('logo') ||
            l.id.includes('emblem') ||
            l.id.includes('cutout'),
        };
      },
      onPanResponderMove: (_e, g) => {
        const start = resizeStart.current;
        if (!start || start.layer.locked) return;
        const c = current.current;
        const scale = c.doc.width / c.width;
        const dxCanvas = g.dx * scale;
        const dyCanvas = g.dy * scale;

        // Transform displacement into layer's local rotated coordinate space
        const rotRad = (-(start.layer.rotation || 0) * Math.PI) / 180;
        const localDx = dxCanvas * Math.cos(rotRad) - dyCanvas * Math.sin(rotRad);
        const localDy = dxCanvas * Math.sin(rotRad) + dyCanvas * Math.cos(rotRad);

        let newWidth: number;
        let newHeight: number;

        if (start.isAspectLocked) {
          const change = (localDx + localDy * start.aspectRatio) / 2;
          newWidth = Math.max(32, Math.min(Math.round(start.doc.width * 1.5), Math.round(start.layer.width + change)));
          newHeight = Math.max(24, Math.min(Math.round(start.doc.height * 1.5), Math.round(newWidth / start.aspectRatio)));
        } else {
          newWidth = Math.max(32, Math.min(Math.round(start.doc.width * 1.5), Math.round(start.layer.width + localDx)));
          newHeight = Math.max(24, Math.min(Math.round(start.doc.height * 1.5), Math.round(start.layer.height + localDy)));
        }

        const p: Partial<DesignLayer> = { width: newWidth, height: newHeight };
        pendingGesture.current = p;
        setPreview(patchDesignLayer(start.doc, start.layer.id, p));
      },
      onPanResponderRelease: () => {
        current.current.onGestureActive?.(false);
        setPreview(null);
        const start = resizeStart.current;
        resizeStart.current = null;
        if (start && pendingGesture.current) {
          current.current.onChange(patchDesignLayer(start.doc, start.layer.id, pendingGesture.current));
        }
        pendingGesture.current = null;
      },
      onPanResponderTerminate: () => {
        current.current.onGestureActive?.(false);
        setPreview(null);
        resizeStart.current = null;
        pendingGesture.current = null;
      },
    })
  ).current;

  // 3. Stem Knob (Touch & Swing to Rotate fluidly 0° - 360°)
  const rotateResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        current.current.onGestureActive?.(true);
        pendingGesture.current = null;
        rotateStart.current = null;
        const c = current.current;
        const l = c.doc.layers.find((lyr) => lyr.id === c.selected);
        if (!l || l.locked) return;
        const scale = c.width / c.doc.width;
        const isNearTop = (l.y / c.doc.width) * c.width < 45;
        const armLength = (l.height * scale) / 2 + 24;
        const initRot = l.rotation || 0;
        const rotRad = (initRot * Math.PI) / 180;

        const sign = isNearTop ? 1 : -1;
        const vScreenX = -sign * armLength * Math.sin(rotRad);
        const vScreenY = sign * armLength * Math.cos(rotRad);

        const touchX = e.nativeEvent.pageX;
        const touchY = e.nativeEvent.pageY;

        const centerX = touchX - vScreenX;
        const centerY = touchY - vScreenY;

        const startTouchAngle = (Math.atan2(touchY - centerY, touchX - centerX) * 180) / Math.PI;

        rotateStart.current = {
          layer: l,
          doc: c.doc,
          initialRotation: initRot,
          centerX,
          centerY,
          startTouchAngle,
        };
      },
      onPanResponderMove: (e) => {
        const start = rotateStart.current;
        if (!start || start.layer.locked) return;
        const currentTouchX = e.nativeEvent.pageX;
        const currentTouchY = e.nativeEvent.pageY;

        const currentAngle = (Math.atan2(currentTouchY - start.centerY, currentTouchX - start.centerX) * 180) / Math.PI;
        let deltaDeg = currentAngle - start.startTouchAngle;

        let newRot = (start.initialRotation + deltaDeg) % 360;
        if (newRot > 180) newRot -= 360;
        if (newRot < -180) newRot += 360;

        // Magnetic snap to cardinal angles within 4 degrees
        for (const snap of [0, 90, -90, 180, -180, 45, -45]) {
          if (Math.abs(newRot - snap) < 4) {
            newRot = snap;
            break;
          }
        }

        const p: Partial<DesignLayer> = { rotation: Math.round(newRot) };
        pendingGesture.current = p;
        setPreview(patchDesignLayer(start.doc, start.layer.id, p));
      },
      onPanResponderRelease: () => {
        current.current.onGestureActive?.(false);
        setPreview(null);
        const start = rotateStart.current;
        rotateStart.current = null;
        if (start && pendingGesture.current) {
          current.current.onChange(patchDesignLayer(start.doc, start.layer.id, pendingGesture.current));
        }
        pendingGesture.current = null;
      },
      onPanResponderTerminate: () => {
        current.current.onGestureActive?.(false);
        setPreview(null);
        rotateStart.current = null;
        pendingGesture.current = null;
      },
    })
  ).current;

  // ── LAYER MANIPULATION HELPERS (SCALE, DELETE, NUDGE, ROTATE, ORDER) ──
  function handleScaleStep(deltaPercent: number) {
    const l = doc.layers.find((lyr) => lyr.id === selected);
    if (!l || l.locked) return;
    const factor = 1 + deltaPercent / 100;
    const newWidth = Math.max(32, Math.min(Math.round(doc.width * 1.5), Math.round(l.width * factor)));
    const aspectRatio = l.width / Math.max(1, l.height);
    const isAspectLocked =
      l.type === 'image' ||
      l.id.includes('photo') ||
      l.id.includes('logo') ||
      l.id.includes('emblem') ||
      l.id.includes('cutout');
    const newHeight = isAspectLocked
      ? Math.max(24, Math.min(Math.round(doc.height * 1.5), Math.round(newWidth / aspectRatio)))
      : Math.max(24, Math.min(Math.round(doc.height * 1.5), Math.round(l.height * factor)));

    patch({ width: newWidth, height: newHeight });
  }

  function handleDeleteLayer(id: string) {
    if (isBackdrop && id === 'bg_photo') {
      Alert.alert(
        'Background Photo',
        'The template background photo cannot be deleted. You can replace it with any photo from your library.',
        [
          { text: 'Replace Photo', onPress: () => void replacePhoto(false) },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
    if (doc.layers.length <= 1) {
      Alert.alert('Cannot Delete', 'The design must keep at least one layer.');
      return;
    }
    Alert.alert(
      'Delete Layer',
      `Are you sure you want to delete "${getFriendlyName(id)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const remaining = doc.layers.filter((l) => l.id !== id);
            onChange({ ...doc, layers: remaining });
            setSelected('');
          },
        },
      ]
    );
  }

  function handleNudge(dx: number, dy: number) {
    const l = doc.layers.find((lyr) => lyr.id === selected);
    if (!l || l.locked) return;
    const newX = Math.max(0, Math.min(doc.width - l.width, l.x + dx));
    const newY = Math.max(0, Math.min(doc.height - l.height, l.y + dy));
    patch({ x: newX, y: newY });
  }

  function handleCenterHorizontally() {
    const l = doc.layers.find((lyr) => lyr.id === selected);
    if (!l || l.locked) return;
    patch({ x: Math.max(0, Math.round((doc.width - l.width) / 2)) });
  }

  function handleCenterVertically() {
    const l = doc.layers.find((lyr) => lyr.id === selected);
    if (!l || l.locked) return;
    patch({ y: Math.max(0, Math.round((doc.height - l.height) / 2)) });
  }

  function handleRotateStep(delta: number) {
    const l = doc.layers.find((lyr) => lyr.id === selected);
    if (!l || l.locked) return;
    let next = ((l.rotation || 0) + delta) % 360;
    if (next > 180) next -= 360;
    if (next < -180) next += 360;
    patch({ rotation: Math.round(next) });
  }

  function handleResetRotation() {
    const l = doc.layers.find((lyr) => lyr.id === selected);
    if (!l || l.locked) return;
    patch({ rotation: 0 });
  }

  function handleMoveLayerOrder(id: string, direction: 'forward' | 'backward' | 'front' | 'back') {
    const idx = doc.layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const currentLayer = doc.layers[idx];
    const otherLayers = doc.layers.filter((l) => l.id !== id);

    let newLayers: DesignLayer[];
    if (direction === 'front') {
      newLayers = [...otherLayers, currentLayer];
    } else if (direction === 'back') {
      newLayers = [currentLayer, ...otherLayers];
    } else if (direction === 'forward') {
      if (idx >= doc.layers.length - 1) return;
      const copy = [...doc.layers];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      newLayers = copy;
    } else {
      if (idx <= 0) return;
      const copy = [...doc.layers];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      newLayers = copy;
    }
    onChange({ ...doc, layers: newLayers });
  }

  async function replacePhoto(add = false) {
    const targetId = selected;
    const originalDoc = doc;
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.85,
      });
      if (picked.canceled || !picked.assets[0]?.base64) return;
      const asset = picked.assets[0];
      if ((asset.fileSize || 0) > 4_000_000) {
        setError('Choose an image smaller than 4 MB.');
        return;
      }
      const result = await apiRequest<{ url: string; assetId: string }>(
        '/api/social/designs/assets',
        {
          method: 'POST',
          body: { data: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` },
        }
      );
      const latest = current.current;
      if (latest.doc !== originalDoc) {
        setError('Design updated. Please retry image replacement.');
        return;
      }
      if (add) {
        if (latest.doc.layers.length >= 40) throw new Error('Maximum 40 layers supported.');
        const id = Crypto.randomUUID();
        const newLayer: DesignLayer = {
          id,
          type: 'image',
          ...addedPhotoFrame(latest.doc, asset),
          photoFit: 'contain',
          borderRadius: 16,
          src: result.url,
          assetId: result.assetId,
          color: '#ffffff',
          background: 'transparent',
          fontSize: 16,
          opacity: 1,
          cropX: 50,
          cropY: 0,
        };
        // Insert behind text layers so title, badge, and logo are never hidden
        const firstTextIdx = latest.doc.layers.findIndex((l) => l.type === 'text');
        const insertIdx = firstTextIdx >= 0 ? firstTextIdx : latest.doc.layers.length;
        const nextLayers = [...latest.doc.layers];
        nextLayers.splice(insertIdx, 0, newLayer);

        latest.onChange({
          ...latest.doc,
          layers: nextLayers,
        });
        selectLayer(id);
      } else {
        const replaceId = targetId || 'bg_photo';
        const targetLayer = latest.doc.layers.find((l) => l.id === replaceId);
        const isBackgroundPhoto =
          !targetLayer ||
          targetLayer.id === 'bg_photo' ||
          (targetLayer.x === 0 && targetLayer.y === 0 && targetLayer.width >= latest.doc.width && targetLayer.height >= latest.doc.height);

        const nextLayers = latest.doc.layers.map((l) => {
          if (l.id === replaceId) {
            return {
              ...l,
              src: result.url,
              assetId: result.assetId,
              cropX: l.cropX ?? 50,
              cropY: verticalAnchor(l),
              photoFit: l.photoFit ?? (isBackgroundPhoto ? 'cover' as const : photoFit(l)),
            };
          }
          // When replacing the background photo, automatically suppress top_scrim so the custom photo is completely unobscured
          if (isBackgroundPhoto && l.id === 'top_scrim') {
            return { ...l, opacity: 0, hidden: true };
          }
          return l;
        });

        latest.onChange({
          ...latest.doc,
          layers: nextLayers,
        });
        selectLayer(replaceId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed.');
    }
  }

  async function exportImage(format: 'png' | 'jpeg') {
    setExporting(true);
    setError('');
    try {
      const result = await apiRequest<{ imageUrl: string }>('/api/social/designs/render', {
        method: 'POST',
        body: { design: doc, format },
      });
      await Linking.openURL(result.imageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  async function handleRemoveBackground(layerId: string, currentUrl?: string) {
    if (!currentUrl) return;
    setRemovingBgLayerId(layerId);
    setError('');
    try {
      const res = await apiRequest<{
        success: boolean;
        cutoutDataUri?: string;
        notice?: string;
        error?: string;
        bounds?: {
          left: number;
          top: number;
          width: number;
          height: number;
          origWidth: number;
          origHeight: number;
        };
      }>('/api/media/remove-bg', {
        method: 'POST',
        body: { imageUrl: currentUrl },
      });
      if (res.success && res.cutoutDataUri) {
        const bounds = res.bounds;
        const currentLayer = doc.layers.find((l) => l.id === layerId);
        if (
          currentLayer &&
          bounds &&
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.origWidth > 0 &&
          bounds.origHeight > 0
        ) {
          const isCurrentlyBackdrop =
            currentLayer.id === 'bg_photo' &&
            currentLayer.x === 0 &&
            currentLayer.y === 0 &&
            currentLayer.width >= doc.width &&
            currentLayer.height >= doc.height;

          if (isCurrentlyBackdrop) {
            // Auto-detach backdrop to floating cutout layer with natural aspect ratio
            const scaleX = doc.width / bounds.origWidth;
            const scaleY = doc.height / bounds.origHeight;
            const newW = Math.max(160, Math.min(Math.round(doc.width * 0.85), Math.round(bounds.width * scaleX)));
            const newH = Math.max(160, Math.min(Math.round(doc.height * 0.7), Math.round(bounds.height * scaleY)));
            const newX = Math.round((doc.width - newW) / 2);
            const newY = Math.round(doc.height * 0.40);

            patch({
              src: res.cutoutDataUri, assetId:undefined, photoFit:'contain',
              x: newX,
              y: newY,
              width: newW,
              height: newH,
              borderRadius: 0,
            });
          } else {
            // Floating image: preserve subject center / visual spot and collapse bounds
            const scaleX = currentLayer.width / bounds.origWidth;
            const scaleY = currentLayer.height / bounds.origHeight;
            const newW = Math.max(40, Math.round(bounds.width * scaleX));
            const newH = Math.max(40, Math.round(bounds.height * scaleY));
            const newX = Math.round(currentLayer.x + bounds.left * scaleX);
            const newY = Math.round(currentLayer.y + bounds.top * scaleY);

            patch({
              src: res.cutoutDataUri, assetId:undefined, photoFit:'contain',
              x: newX,
              y: newY,
              width: newW,
              height: newH,
            });
          }
        } else {
          patch({ src: res.cutoutDataUri, assetId:undefined, photoFit:'contain' });
        }
      } else {
        const msg = res.error || res.notice || 'Background removal could not be completed';
        setError(msg);
        Alert.alert('Background Removal', msg);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Background removal failed');
    } finally {
      setRemovingBgLayerId(null);
    }
  }

  function handleAddText() {
    const id = Crypto.randomUUID();
    onChange({
      ...doc,
      layers: [
        ...doc.layers,
        {
          id,
          type: 'text',
          x: 60,
          y: doc.height * 0.4,
          width: doc.width - 120,
          height: 110,
          text: 'New Headline',
          color: '#0F172A',
          background: 'transparent',
          fontSize: 44,
          fontFamily: 'sans',
          fontWeight: 700,
          textAlign: 'left',
          opacity: 1,
        },
      ],
    });
    selectLayer(id);
  }

  // Filter content layers vs background shapes for clean list in Layers Sheet
  const contentLayers = [...doc.layers].reverse().filter((l) => l.type !== 'shape' || l.id === 'cta_background');
  const decorativeLayers = [...doc.layers].reverse().filter((l) => l.type === 'shape' && l.id !== 'cta_background');

  return (
    <View style={styles.container}>
      {/* ── Visual Canvas Stage with Direct Touch Selection ── */}
      <View
        onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
        style={styles.canvasContainer}
      >
        <PosterPreview doc={visibleDoc} />

        {/* Canvas Touch Overlay - Direct Tap to Select / Tap Outside to Deselect */}
        <Pressable
          accessibilityLabel="Select an object on the design"
          style={StyleSheet.absoluteFill}
          onPress={(e) => {
            const x = (e.nativeEvent.locationX * doc.width) / canvasWidth;
            const y = (e.nativeEvent.locationY * doc.width) / canvasWidth;
            const contentHits = layersAtPoint(doc, x, y, { excludeBackdrop: true });
            if (contentHits[0]) {
              // Tapped a specific foreground element (text, logo, card, emblem)
              selectLayer(contentHits[0].id);
              setOverlapIds(contentHits.map((l) => l.id));
            } else {
              // Tapped on empty canvas / outside content elements
              if (selected) {
                // If any layer (or backdrop) was selected, tap outside immediately DESELECTS!
                done();
              } else {
                // Nothing was selected: tap on background photo selects backdrop
                const bg = doc.layers.find((l) => l.id === 'bg_photo' && !l.hidden);
                if (bg) {
                  selectLayer(bg.id);
                  setOverlapIds([bg.id]);
                } else {
                  done();
                }
              }
            }
          }}
        />

        {/* Selected Layer Interactive Touch Box with Move, Resize & Rotate Handles */}
        {layer && !layer.hidden && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: (layer.x / doc.width) * canvasWidth,
              top: (layer.y / doc.width) * canvasWidth,
              width: (layer.width / doc.width) * canvasWidth,
              height: (layer.height / doc.width) * canvasWidth,
              zIndex: 30,
              transform: [{ rotate: `${layer.rotation || 0}deg` }],
            }}
          >
            {/* Direct Touch Drag Surface on Layer Body */}
            <View
              {...(!layer.locked && !isBackdrop ? bodyResponder.panHandlers : {})}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Selected ${getFriendlyName(layer.id)}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderWidth: 1.5,
                borderColor: '#009F50',
                borderStyle: 'dashed',
                borderRadius: ((layer.borderRadius || 0) / doc.width) * canvasWidth,
                backgroundColor: 'transparent',
              }}
            />

            {!layer.locked && (() => {
              const layerYOnCanvas = (layer.y / doc.width) * canvasWidth;
              const layerHeightOnCanvas = (layer.height / doc.width) * canvasWidth;
              const canvasHeight = (doc.height / doc.width) * canvasWidth;
              const isNearBottom = (layerYOnCanvas + layerHeightOnCanvas) > (canvasHeight - 45);
              const layerWidthOnCanvas = (layer.width / doc.width) * canvasWidth;

              return (
                <>
                  {/* ── Stem & Rotate Knob (Bottom placement prevents headline occlusion; flips up only if near canvas bottom) ── */}
                  {!isBackdrop && (
                    <>
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          ...(isNearBottom ? { top: -20 } : { bottom: -20 }),
                          left: layerWidthOnCanvas / 2 - 1,
                          width: 2,
                          height: 20,
                          backgroundColor: '#009F50',
                        }}
                      />
                      <View
                        {...rotateResponder.panHandlers}
                        accessible
                        accessibilityRole="adjustable"
                        accessibilityLabel="Rotate layer handle"
                        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                        style={{
                          position: 'absolute',
                          ...(isNearBottom ? { top: -40 } : { bottom: -40 }),
                          left: layerWidthOnCanvas / 2 - 16,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#FFFFFF',
                          borderWidth: 2,
                          borderColor: '#009F50',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.22,
                          shadowRadius: 3,
                          elevation: 5,
                          zIndex: 40,
                        }}
                      >
                        <MaterialIcons name="refresh" size={18} color="#009F50" />
                      </View>
                    </>
                  )}

                  {/* ── Bottom-Right Corner Resize Grip Handle ── */}
                  <View
                    {...resizeResponder.panHandlers}
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel="Resize layer handle"
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    style={{
                      position: 'absolute',
                      bottom: -16,
                      right: -16,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#009F50',
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3,
                      elevation: 5,
                      zIndex: 40,
                    }}
                  >
                    <MaterialIcons name="open-in-full" size={15} color="#FFFFFF" />
                  </View>

                  {/* Corner Anchor Dots for Visual Precision Cue */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: -5,
                      left: -5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 2,
                      borderColor: '#009F50',
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 2,
                      borderColor: '#009F50',
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      bottom: -5,
                      left: -5,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#FFFFFF',
                      borderWidth: 2,
                      borderColor: '#009F50',
                    }}
                  />
                </>
              );
            })()}
          </View>
        )}
      </View>

      {/* ──────────────────────────────────────────────────────────────────
          STATE A: NO OBJECT SELECTED (CANVAS OVERVIEW DOCK)
          ────────────────────────────────────────────────────────────────── */}
      {!selected && (
        <View style={styles.overviewDock}>
          <View style={styles.overviewActionsRow}>
            <Pressable
              onPress={() =>
                Alert.alert('Add to design', 'Choose what to add to the canvas:', [
                  { text: 'Text', onPress: handleAddText },
                  { text: 'Photo', onPress: () => void replacePhoto(true) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
              style={styles.overviewBtn}
              accessibilityRole="button"
              accessibilityLabel="Add text or photo"
            >
              <MaterialIcons name="add" size={19} color="#009F50" />
              <Text style={[styles.overviewBtnText, { color: '#009F50', fontWeight: '800' }]}>Add</Text>
            </Pressable>

            {onOpenRatio && (
              <Pressable
                onPress={onOpenRatio}
                style={styles.overviewBtn}
                accessibilityRole="button"
                accessibilityLabel="Change design size"
              >
                <MaterialIcons name="aspect-ratio" size={18} color="#475569" />
                <Text style={styles.overviewBtnText}>Size</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => setLayersOpen(true)}
              style={styles.overviewBtn}
              accessibilityRole="button"
              accessibilityLabel="View All Layers"
            >
              <MaterialIcons name="layers" size={18} color="#475569" />
              <Text style={styles.overviewBtnText}>Layers</Text>
            </Pressable>
          </View>

          <View style={styles.overviewFooterRow}>
            <Text style={styles.helperTipText}>
              Tap text or a photo to edit.
            </Text>
            <Pressable
              onPress={() => void exportImage('png')}
              disabled={exporting}
              style={styles.exportPill}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#009F50" />
              ) : (
                <>
                  <MaterialIcons name="download" size={13} color="#009F50" />
                  <Text style={styles.exportPillText}>Download</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          STATE B: OBJECT SELECTED (CONTEXTUAL TOOL DOCK)
          ────────────────────────────────────────────────────────────────── */}
      {selected && layer && (
        <View style={styles.contextualDock}>
          {/* Active Layer Header Bar */}
          <View style={styles.contextualHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <MaterialIcons
                name={isBackdrop ? 'wallpaper' : layer.type === 'image' ? 'image' : layer.type === 'text' ? 'title' : 'category'}
                size={16}
                color="#009F50"
              />
              <Text numberOfLines={1} style={styles.contextualTitle}>
                {isBackdrop ? 'Background Photo' : getFriendlyName(layer.id)}
              </Text>
              {isBackdrop ? (
                <View style={[styles.lockBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.lockBadgeText, { color: '#0369A1' }]}>Background Photo</Text>
                </View>
              ) : layer.locked ? (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockBadgeText}>Locked</Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {overlapIds.length > 1 && (
                <Pressable
                  accessibilityLabel="Choose overlapping layer"
                  onPress={() => setLayersOpen(true)}
                  style={styles.iconActionBtn}
                >
                  <MaterialIcons name="filter-none" size={16} color="#475569" />
                </Pressable>
              )}

              <Pressable
                accessibilityLabel={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                onPress={() =>
                  onChange({
                    ...doc,
                    layers: doc.layers.map((l) => (l.id === selected ? { ...l, locked: !l.locked } : l)),
                  })
                }
                style={styles.iconActionBtn}
              >
                <MaterialIcons
                  name={layer.locked ? 'lock' : 'lock-open'}
                  size={16}
                  color={layer.locked ? '#DC2626' : '#64748B'}
                />
              </Pressable>

              <Pressable
                accessibilityLabel={layer.hidden ? 'Show Layer' : 'Hide Layer'}
                onPress={() =>
                  onChange({
                    ...doc,
                    layers: doc.layers.map((l) => (l.id === selected ? { ...l, hidden: !l.hidden } : l)),
                  })
                }
                style={styles.iconActionBtn}
              >
                <MaterialIcons
                  name={layer.hidden ? 'visibility-off' : 'visibility'}
                  size={16}
                  color="#64748B"
                />
              </Pressable>

              {/* Delete Layer Button */}
              <Pressable
                accessibilityLabel="Delete Layer"
                onPress={() => handleDeleteLayer(layer.id)}
                style={[styles.iconActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
              >
                <MaterialIcons name="delete-outline" size={17} color="#DC2626" />
              </Pressable>

              {/* Done Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done Editing"
                onPress={done}
                style={styles.doneBtn}
              >
                <MaterialIcons name="check" size={14} color="#FFFFFF" />
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>

          {/* Contextual Body: TEXT TOOLS */}
          {layer.type === 'text' && (
            <View style={styles.toolBody}>
              {/* Multiline text input for instant copy adjustment */}
              <TextInput
                value={layer.text}
                onChangeText={(text) => patch({ text: text.slice(0, 1000) })}
                editable={!layer.locked}
                multiline
                style={styles.textInput}
                placeholder="Enter text..."
                placeholderTextColor="#94A3B8"
              />

              {/* Font Family Switcher */}
              <View style={styles.fontFamilyRow}>
                {([['sans', 'Modern'], ['editorial', 'Editorial'], ['display', 'Bold Display']] as const).map(
                  ([font, label]) => {
                    const isSelected = (layer.fontFamily || 'sans') === font;
                    return (
                      <Pressable
                        key={font}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        disabled={layer.locked}
                        onPress={() => patch({ fontFamily: font })}
                        style={[styles.fontBtn, isSelected && styles.fontBtnActive]}
                      >
                        <Text style={[styles.fontBtnText, isSelected && styles.fontBtnTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              {/* Size Steppers & Alignment Row */}
              <View style={styles.typoControlsRow}>
                <View style={styles.stepperGroup}>
                  <Text style={styles.controlLabel}>Size</Text>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => patch({ fontSize: Math.max(10, layer.fontSize - 4) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="remove" size={15} color="#0F172A" />
                  </Pressable>
                  <Text style={styles.stepperVal}>{Math.round(layer.fontSize)}</Text>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => patch({ fontSize: Math.min(180, layer.fontSize + 4) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="add" size={15} color="#0F172A" />
                  </Pressable>
                </View>

                {/* Alignment */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <Pressable
                      key={align}
                      disabled={layer.locked}
                      onPress={() => patch({ textAlign: align })}
                      style={[styles.formatBtn, layer.textAlign === align && styles.formatBtnActive]}
                    >
                      <MaterialIcons
                        name={`format-align-${align}` as any}
                        size={15}
                        color={layer.textAlign === align ? '#009F50' : '#64748B'}
                      />
                    </Pressable>
                  ))}

                  <Pressable
                    disabled={layer.locked}
                    onPress={() => patch({ fontWeight: layer.fontWeight === 700 ? 400 : 700 })}
                    style={[styles.formatBtn, layer.fontWeight === 700 && styles.formatBtnActive]}
                  >
                    <MaterialIcons
                      name="format-bold"
                      size={15}
                      color={layer.fontWeight === 700 ? '#009F50' : '#64748B'}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Text Color Swatches */}
              <View style={styles.colorPaletteSection}>
                <Text style={styles.controlLabel}>Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = layer.color?.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <Pressable
                        key={c.hex}
                        disabled={layer.locked}
                        onPress={() => patch({ color: c.hex })}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c.hex },
                          c.darkBorder && { borderWidth: 1.5, borderColor: '#CBD5E1' },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                      >
                        {isSelected && (
                          <MaterialIcons
                            name="check"
                            size={14}
                            color={c.hex === '#FFFFFF' ? '#0F172A' : '#FFFFFF'}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Contextual Body: PHOTO TOOLS */}
          {layer.type === 'image' && (
            <View style={styles.toolBody}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => void replacePhoto(false)}
                  style={[styles.photoActionBtn, { flex: 1, minWidth: 95 }]}
                >
                  <MaterialIcons name="image" size={16} color="#009F50" />
                  <Text style={styles.photoActionBtnText}>
                    {isBackdrop ? 'Replace Photo' : 'Replace'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => void replacePhoto(true)}
                  style={[styles.photoActionBtn, { flex: 1, minWidth: 95, backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
                >
                  <MaterialIcons name="add-photo-alternate" size={16} color="#0284C7" />
                  <Text style={[styles.photoActionBtnText, { color: '#0284C7' }]}>Add Photo</Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleRemoveBackground(layer.id, layer.src)}
                  disabled={removingBgLayerId === layer.id}
                  style={[styles.photoActionBtn, { flex: 1.2, minWidth: 115, backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}
                >
                  {removingBgLayerId === layer.id ? (
                    <ActivityIndicator size="small" color="#9333EA" />
                  ) : (
                    <MaterialIcons name="auto-fix-high" size={16} color="#9333EA" />
                  )}
                  <Text style={[styles.photoActionBtnText, { color: '#7E22CE' }]}>
                    {removingBgLayerId === layer.id ? 'Removing…' : 'Cutout (No BG)'}
                  </Text>
                </Pressable>
              </View>

              <View style={{flexDirection:'row',gap:8}}>
                {(['contain','cover'] as const).map(mode => <Pressable key={mode}
                  accessibilityRole="radio" accessibilityState={{selected:photoFit(layer)===mode}}
                  onPress={()=>patch({photoFit:mode})} style={[styles.photoActionBtn,{minHeight:44,
                    backgroundColor:photoFit(layer)===mode?'#DCFCE7':'#fff'}]}>
                  <Text style={styles.photoActionBtnText}>{mode==='contain'?'Fit whole photo':'Fill frame'}</Text>
                </Pressable>)}
              </View>
              {photoFit(layer)==='cover' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <Text style={styles.controlLabel}>
                  Reposition
                </Text>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  <Pressable
                    onPress={() => patch({ cropX: Math.max(0, (layer.cropX ?? 50) - 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-back" size={15} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    onPress={() => patch({ cropX: Math.min(100, (layer.cropX ?? 50) + 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-forward" size={15} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    onPress={() => patch({ cropY: Math.max(0, verticalAnchor(layer) - 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-upward" size={15} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    onPress={() => patch({ cropY: Math.min(100, verticalAnchor(layer) + 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-downward" size={15} color="#0F172A" />
                  </Pressable>
                </View>
              </View>)}
            </View>
          )}

          {/* Contextual Body: SHAPE TOOLS */}
          {layer.type === 'shape' && (
            <View style={styles.toolBody}>
              <Text style={styles.controlLabel}>Shape Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {COLOR_PALETTE.map((c) => {
                  const isSelected = layer.background?.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <Pressable
                      key={c.hex}
                      disabled={layer.locked}
                      onPress={() => patch({ background: c.hex })}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c.hex },
                        c.darkBorder && { borderWidth: 1.5, borderColor: '#CBD5E1' },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                    >
                      {isSelected && (
                        <MaterialIcons
                          name="check"
                          size={14}
                          color={c.hex === '#FFFFFF' ? '#0F172A' : '#FFFFFF'}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Universal Transform, Order & Position Tools (Available for all floating layers) */}
          {!isBackdrop && (
            <View style={styles.universalTransformSection}>
              {/* Header: Transform & Position with Live Angle Display */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.controlLabel}>Position & Transform</Text>
                <Pressable
                  disabled={layer.locked}
                  onPress={handleResetRotation}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2.5,
                    borderRadius: 6,
                    backgroundColor: layer.rotation ? '#FEF3C7' : '#F1F5F9',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: layer.rotation ? '#B45309' : '#64748B' }}>
                    Angle: {Math.round(layer.rotation || 0)}° {layer.rotation ? '(Reset 0°)' : ''}
                  </Text>
                </Pressable>
              </View>

              {/* Row 1: Scale Stepper [-] [+] & Z-Order Depth */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
                <View style={styles.stepperGroup}>
                  <Text style={styles.controlLabel}>Scale</Text>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleScaleStep(-5)}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="remove" size={15} color="#0F172A" />
                  </Pressable>
                  <Text style={[styles.stepperVal, { minWidth: 64 }]}>
                    {Math.round(layer.width)}×{Math.round(layer.height)}
                  </Text>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleScaleStep(5)}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="add" size={15} color="#0F172A" />
                  </Pressable>
                </View>

                {/* Z-Order Layer Stacking */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleMoveLayerOrder(layer.id, 'forward')}
                    style={styles.transformActionBtn}
                  >
                    <MaterialIcons name="arrow-upward" size={14} color="#0F172A" />
                    <Text style={styles.transformActionBtnText}>Up</Text>
                  </Pressable>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleMoveLayerOrder(layer.id, 'backward')}
                    style={styles.transformActionBtn}
                  >
                    <MaterialIcons name="arrow-downward" size={14} color="#0F172A" />
                    <Text style={styles.transformActionBtnText}>Down</Text>
                  </Pressable>
                </View>
              </View>

              {/* Row 2: Rotation Steppers & 90° Turn */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
                {/* Rotation Stepper Group */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleRotateStep(-15)}
                    style={styles.transformActionBtn}
                  >
                    <MaterialIcons name="rotate-left" size={15} color="#0F172A" />
                    <Text style={styles.transformActionBtnText}>-15°</Text>
                  </Pressable>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleRotateStep(15)}
                    style={styles.transformActionBtn}
                  >
                    <MaterialIcons name="rotate-right" size={15} color="#0F172A" />
                    <Text style={styles.transformActionBtnText}>+15°</Text>
                  </Pressable>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleRotateStep(90)}
                    style={[styles.transformActionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                  >
                    <MaterialIcons name="refresh" size={14} color="#009F50" />
                    <Text style={[styles.transformActionBtnText, { color: '#009F50' }]}>90°</Text>
                  </Pressable>
                </View>

                {/* Center Alignment Presets */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Pressable
                    disabled={layer.locked}
                    onPress={handleCenterHorizontally}
                    style={styles.alignPresetBtn}
                  >
                    <MaterialIcons name="align-horizontal-center" size={14} color="#009F50" />
                    <Text style={styles.alignPresetBtnText}>Center H</Text>
                  </Pressable>
                  <Pressable
                    disabled={layer.locked}
                    onPress={handleCenterVertically}
                    style={styles.alignPresetBtn}
                  >
                    <MaterialIcons name="align-vertical-center" size={14} color="#009F50" />
                    <Text style={styles.alignPresetBtnText}>Center V</Text>
                  </Pressable>
                </View>
              </View>

              {/* Row 3: Precision Nudge Pad */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <Text style={styles.controlLabel}>Nudge (12px)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleNudge(-12, 0)}
                    style={styles.nudgeBtn}
                  >
                    <MaterialIcons name="arrow-back" size={15} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleNudge(12, 0)}
                    style={styles.nudgeBtn}
                  >
                    <MaterialIcons name="arrow-forward" size={15} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleNudge(0, -12)}
                    style={styles.nudgeBtn}
                  >
                    <MaterialIcons name="arrow-upward" size={15} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    disabled={layer.locked}
                    onPress={() => handleNudge(0, 12)}
                    style={styles.nudgeBtn}
                  >
                    <MaterialIcons name="arrow-downward" size={15} color="#0F172A" />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          VERTICAL LAYERS SHEET MODAL
          ────────────────────────────────────────────────────────────────── */}
      <Modal visible={layersOpen} transparent animationType="slide" onRequestClose={() => setLayersOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="Close layers" style={{ flex: 1 }} onPress={() => setLayersOpen(false)} />
          <View style={styles.modalSheetContent}>
            <View style={styles.modalSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="layers" size={20} color="#009F50" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Canvas Layers</Text>
              </View>
              <Pressable
                onPress={() => setLayersOpen(false)}
                style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Done</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Content Layers Section */}
              <Text style={styles.layerSectionTitle}>CONTENT LAYERS</Text>
              {contentLayers.map((l) => {
                const isSelected = l.id === selected;
                return (
                  <Pressable
                    key={l.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => selectLayer(l.id)}
                    style={[styles.layerRowCard, isSelected && styles.layerRowCardActive]}
                  >
                    {l.type === 'image' && !l.src?.startsWith('data:image/svg+xml') && !l.id.includes('divider') ? (
                      <Image
                        source={PROFESSIONAL_ASSETS[l.src || ''] || { uri: l.src }}
                        style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#E2E8F0' }}
                      />
                    ) : (
                      <View style={[styles.layerIconBox, isSelected && { backgroundColor: '#DCFCE7' }]}>
                        <MaterialIcons
                          name={
                            l.id === 'graphic_divider' || l.id.includes('divider')
                              ? 'remove'
                              : l.src?.startsWith('data:image/svg+xml') || l.id.includes('emblem')
                              ? 'auto-awesome'
                              : l.type === 'text'
                              ? 'title'
                              : 'category'
                          }
                          size={18}
                          color={isSelected ? '#009F50' : '#475569'}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                        {l.type === 'text' ? l.text || 'Empty text' : getFriendlyName(l.id)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {getFriendlyName(l.id)}
                        {l.locked ? ' · Locked' : ''}
                        {l.hidden ? ' · Hidden' : ''}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {/* Move Layer Up in Stack */}
                      <Pressable
                        accessibilityLabel="Move layer up"
                        onPress={() => handleMoveLayerOrder(l.id, 'forward')}
                        style={styles.modalLayerActionBtn}
                      >
                        <MaterialIcons name="arrow-upward" size={14} color="#475569" />
                      </Pressable>

                      {/* Move Layer Down in Stack */}
                      <Pressable
                        accessibilityLabel="Move layer down"
                        onPress={() => handleMoveLayerOrder(l.id, 'backward')}
                        style={styles.modalLayerActionBtn}
                      >
                        <MaterialIcons name="arrow-downward" size={14} color="#475569" />
                      </Pressable>

                      {/* Delete Layer */}
                      <Pressable
                        accessibilityLabel="Delete layer"
                        onPress={() => handleDeleteLayer(l.id)}
                        style={[styles.modalLayerActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                      >
                        <MaterialIcons name="delete-outline" size={14} color="#DC2626" />
                      </Pressable>

                      {isSelected && <MaterialIcons name="check-circle" size={18} color="#009F50" />}
                    </View>
                  </Pressable>
                );
              })}

              {/* Collapsible Background & Decorations Section */}
              <Pressable
                onPress={() => setDecorationsOpen(!decorationsOpen)}
                style={styles.decorationsToggleBtn}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                  {decorationsOpen ? '▲ Hide' : '▼ Show'} Background Accents & Decorations ({decorativeLayers.length})
                </Text>
              </Pressable>

              {decorationsOpen &&
                decorativeLayers.map((l) => {
                  const isSelected = l.id === selected;
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => selectLayer(l.id)}
                      style={[styles.layerRowCard, { opacity: 0.8 }, isSelected && styles.layerRowCardActive]}
                    >
                      <View style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: l.background || '#E2E8F0' }} />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>
                          {getFriendlyName(l.id)}
                        </Text>
                      </View>
                      {isSelected && <MaterialIcons name="check-circle" size={18} color="#009F50" />}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  canvasContainer: {
    borderRadius: 16,
    overflow: 'visible',
    backgroundColor: '#070A13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewDock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  overviewActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  overviewBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  overviewBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  overviewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  helperTipText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  contextualDock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    gap: 10,
    shadowColor: '#009F50',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  contextualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contextualTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  lockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  lockBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#009F50',
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toolBody: {
    gap: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 48,
  },
  fontFamilyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  fontBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fontBtnActive: {
    backgroundColor: '#009F50',
    borderColor: '#009F50',
  },
  fontBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  fontBtnTextActive: {
    color: '#FFFFFF',
  },
  typoControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 26,
    textAlign: 'center',
  },
  formatBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formatBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#009F50',
  },
  colorPaletteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: '#009F50',
    transform: [{ scale: 1.1 }],
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009F50',
  },
  exportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  exportPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009F50',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  layerSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  layerRowCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    marginVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  layerRowCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#009F50',
  },
  layerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorationsToggleBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  universalTransformSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transformActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  transformActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  alignPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  alignPresetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009F50',
  },
  nudgeBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLayerActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
