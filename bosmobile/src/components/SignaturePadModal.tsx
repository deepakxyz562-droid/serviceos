import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';

interface SignaturePadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureDataUri: string) => void;
  businessName?: string;
}

export function SignaturePadModal({
  visible,
  onClose,
  onSave,
  businessName,
}: SignaturePadModalProps) {
  // Use refs as single source of truth for smooth high-frequency touches
  const pathsRef = useRef<string[]>([]);
  const currentPathRef = useRef<string>('');
  const canvasRef = useRef<View>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [penColor, setPenColor] = useState<string>('#1E3A8A'); // Classic Ink Blue
  const [penWidth, setPenWidth] = useState<number>(3);
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: 330,
    height: 190,
  });
  const [, setTick] = useState<number>(0);
  const triggerRender = () => setTick((t) => t + 1);

  // Measure canvas absolute position on screen
  const measureCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        if (pageX !== undefined && pageY !== undefined && (pageX > 0 || pageY > 0)) {
          originRef.current = { x: pageX, y: pageY };
        }
        if (width && height) {
          setCanvasLayout({ width: Math.round(width), height: Math.round(height) });
        }
      });
    }
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(measureCanvas, 60);
      return () => clearTimeout(timer);
    } else {
      pathsRef.current = [];
      currentPathRef.current = '';
    }
  }, [visible]);

  const getCoords = (evt: any) => {
    const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
    if (originRef.current.x > 0 || originRef.current.y > 0) {
      const x = Math.round(pageX - originRef.current.x);
      const y = Math.round(pageY - originRef.current.y);
      return {
        x: Math.max(0, Math.min(canvasLayout.width, x)),
        y: Math.max(0, Math.min(canvasLayout.height, y)),
      };
    }
    return {
      x: Math.round(locationX),
      y: Math.round(locationY),
    };
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false, // Prevent parent ScrollView from canceling drawing
        onPanResponderGrant: (evt) => {
          measureCanvas();
          const { x, y } = getCoords(evt);
          currentPathRef.current = `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
          triggerRender();
        },
        onPanResponderMove: (evt) => {
          const { x, y } = getCoords(evt);
          if (currentPathRef.current) {
            currentPathRef.current += ` L ${x} ${y}`;
            triggerRender();
          }
        },
        onPanResponderRelease: () => {
          if (currentPathRef.current) {
            pathsRef.current.push(currentPathRef.current);
            currentPathRef.current = '';
            triggerRender();
          }
        },
        onPanResponderTerminate: () => {
          if (currentPathRef.current) {
            pathsRef.current.push(currentPathRef.current);
            currentPathRef.current = '';
            triggerRender();
          }
        },
      }),
    [canvasLayout.width, canvasLayout.height]
  );

  const handleUndo = () => {
    if (pathsRef.current.length > 0) {
      pathsRef.current.pop();
      triggerRender();
    }
  };

  const handleClear = () => {
    pathsRef.current = [];
    currentPathRef.current = '';
    triggerRender();
  };

  const handleSave = () => {
    const allPaths = [...pathsRef.current];
    if (currentPathRef.current) {
      allPaths.push(currentPathRef.current);
    }

    if (allPaths.length === 0) {
      Alert.alert('Empty Signature', 'Please draw your signature inside the box before saving.');
      return;
    }

    const w = canvasLayout.width || 330;
    const h = canvasLayout.height || 190;

    // Vector SVG with scalable responsive viewBox
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  ${allPaths
    .map(
      (d) =>
        `<path d="${d}" stroke="${penColor}" stroke-width="${penWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('\n  ')}
</svg>`;

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;
    onSave(dataUri);
    handleClear();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="draw" size={20} color="#059669" />
            </View>
            <View>
              <Text style={styles.title}>Draw Authorized Signature</Text>
              <Text style={styles.subtitle}>Sign inside the box using your finger or stylus</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Drawing Canvas Area */}
        <View style={styles.canvasContainer}>
          <View
            ref={canvasRef}
            style={styles.canvasBox}
            onLayout={measureCanvas}
            {...panResponder.panHandlers}
          >
            {/* SVG Layer for Drawing Strokes - pointerEvents none ensures children never intercept touches */}
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              {pathsRef.current.map((d, index) => (
                <Path
                  key={index}
                  d={d}
                  stroke={penColor}
                  strokeWidth={penWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPathRef.current ? (
                <Path
                  d={currentPathRef.current}
                  stroke={penColor}
                  strokeWidth={penWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>

            {/* Signatory Baseline Guide */}
            <View style={styles.guidelineRow} pointerEvents="none">
              <Text style={styles.guidelineX}>✕</Text>
              <Text style={styles.guidelineText}>
                Sign above this line {businessName ? `• ${businessName}` : ''}
              </Text>
            </View>

            {pathsRef.current.length === 0 && !currentPathRef.current && (
              <View style={styles.placeholderBox} pointerEvents="none">
                <Text style={styles.placeholderText}>Draw your signature here...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pen Color & Tool Controls */}
        <View style={styles.toolbar}>
          <View style={styles.colorRow}>
            <Text style={styles.toolbarLabel}>Ink:</Text>
            {[
              { color: '#1E3A8A', label: 'Ink Blue' },
              { color: '#111827', label: 'Jet Black' },
              { color: '#059669', label: 'Emerald' },
            ].map((c) => (
              <TouchableOpacity
                key={c.color}
                onPress={() => setPenColor(c.color)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.color },
                  penColor === c.color && styles.colorDotActive,
                ]}
              >
                {penColor === c.color && <MaterialIcons name="check" size={12} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toolRow}>
            <TouchableOpacity
              onPress={handleUndo}
              disabled={pathsRef.current.length === 0}
              style={[styles.toolBtn, pathsRef.current.length === 0 && { opacity: 0.4 }]}
            >
              <MaterialIcons name="undo" size={16} color="#475569" />
              <Text style={styles.toolBtnText}>Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClear} style={[styles.toolBtn, styles.clearBtn]}>
              <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
              <Text style={[styles.toolBtnText, { color: '#dc2626' }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Save Signature</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * Universal Signature Preview component for mobile
 * Renders SVG data URIs via SvgXml and bitmap images (PNG/JPG) via Image
 */
export function SignaturePreview({
  uri,
  style,
}: {
  uri: string;
  style?: any;
}) {
  if (!uri) return null;

  if (uri.startsWith('data:image/svg+xml') || uri.startsWith('<svg')) {
    let xml = uri;
    if (uri.startsWith('data:image/svg+xml;utf8,')) {
      xml = decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
    } else if (uri.startsWith('data:image/svg+xml;base64,')) {
      try {
        if (typeof atob === 'function') {
          xml = atob(uri.replace('data:image/svg+xml;base64,', ''));
        }
      } catch {
        xml = '';
      }
    }

    if (xml) {
      const flatStyle = StyleSheet.flatten(style) || {};
      const width = flatStyle.width || '100%';
      const height = flatStyle.height || '100%';
      return <SvgXml xml={xml} width={width} height={height} />;
    }
  }

  return <Image source={{ uri }} style={style} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    elevation: 99,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f3f1',
    backgroundColor: '#f8faf9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  canvasContainer: {
    padding: 16,
  },
  canvasBox: {
    height: 190,
    width: '100%',
    backgroundColor: '#fafcfb',
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#a7f3d0',
    position: 'relative',
    overflow: 'hidden',
  },
  guidelineRow: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.5)',
    borderStyle: 'dashed',
    paddingBottom: 2,
  },
  guidelineX: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  guidelineText: {
    fontSize: 9.5,
    textTransform: 'uppercase',
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  placeholderBox: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8faf9',
    borderTopWidth: 1,
    borderTopColor: '#f0f3f1',
  },
  toolbarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 4,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clearBtn: {
    borderColor: '#fecaca',
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f3f1',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  saveBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#fff',
  },
});
