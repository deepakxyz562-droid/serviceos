import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Image,
  Dimensions,
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
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [penColor, setPenColor] = useState<string>('#1E3A8A'); // Classic Ink Blue
  const [canvasLayout, setCanvasLayout] = useState({ width: 320, height: 180 });

  // Keep a ref of current path to avoid stale state in panResponder
  const currentPathRef = useRef<string>('');
  currentPathRef.current = currentPath;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const x = Math.round(locationX);
          const y = Math.round(locationY);
          const start = `M ${x} ${y} L ${x + 0.5} ${y + 0.5}`;
          setCurrentPath(start);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const x = Math.round(locationX);
          const y = Math.round(locationY);
          setCurrentPath((prev) => `${prev} L ${x} ${y}`);
        },
        onPanResponderRelease: () => {
          if (currentPathRef.current) {
            setPaths((prev) => [...prev, currentPathRef.current]);
            setCurrentPath('');
          }
        },
      }),
    []
  );

  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleSave = () => {
    if (paths.length === 0 && !currentPath) {
      alert('Please draw your signature before saving.');
      return;
    }

    const allPaths = currentPath ? [...paths, currentPath] : paths;
    const w = canvasLayout.width || 320;
    const h = canvasLayout.height || 180;

    // Generate crisp vector SVG markup
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${allPaths
    .map(
      (d) =>
        `<path d="${d}" stroke="${penColor}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('\n  ')}
</svg>`;

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;
    onSave(dataUri);
    handleClear();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Drawing Canvas Area */}
          <View style={styles.canvasContainer}>
            <View
              style={styles.canvasBox}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setCanvasLayout({ width: Math.round(width), height: Math.round(height) });
              }}
              {...panResponder.panHandlers}
            >
              {/* SVG Layer for Drawing Strokes */}
              <Svg style={StyleSheet.absoluteFill}>
                {paths.map((d, index) => (
                  <Path
                    key={index}
                    d={d}
                    stroke={penColor}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentPath ? (
                  <Path
                    d={currentPath}
                    stroke={penColor}
                    strokeWidth={3}
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

              {paths.length === 0 && !currentPath && (
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
                disabled={paths.length === 0}
                style={[styles.toolBtn, paths.length === 0 && { opacity: 0.4 }]}
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
    </Modal>
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
      return (
        <SvgXml
          xml={xml}
          width={style?.width || '100%'}
          height={style?.height || '100%'}
        />
      );
    }
  }

  return <Image source={{ uri }} style={style} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
    padding: 4,
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
