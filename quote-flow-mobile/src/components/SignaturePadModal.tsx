import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Dimensions,
  Alert,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface Point {
  x: number;
  y: number;
}

interface SignaturePadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
}

export function SignaturePadModal({
  visible,
  onClose,
  onSave,
  title = "Draw Signature",
}: SignaturePadModalProps) {
  const [paths, setPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);

  // Fixed canvas dimensions for standard signature aspect ratio
  const padWidth = Math.min(Dimensions.get("window").width - 32, 400);
  const padHeight = 200;

  // PanResponder to track touch movements
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setCurrentPath((latest) => {
          if (latest.length > 0) {
            setPaths((all) => [...all, latest]);
          }
          return [];
        });
      },
    }),
    [],
  );

  // Convert array of points to SVG path string 'd'
  const pathToSvgD = (pts: Point[]): string => {
    if (!pts || pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    return d;
  };

  const completedPathsSvg = useMemo(() => {
    return paths.map((pts) => pathToSvgD(pts)).join(" ");
  }, [paths]);

  const currentPathSvg = useMemo(() => {
    return pathToSvgD(currentPath);
  }, [currentPath]);

  function handleClear() {
    setPaths([]);
    setCurrentPath([]);
  }

  function handleUndo() {
    setPaths((prev) => prev.slice(0, -1));
  }

  function handleSave() {
    if (paths.length === 0 && currentPath.length === 0) {
      Alert.alert("Empty Signature", "Please draw your signature before saving.");
      return;
    }

    const allD = [completedPathsSvg, currentPathSvg].filter(Boolean).join(" ");
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${padWidth} ${padHeight}" width="${padWidth}" height="${padHeight}"><path d="${allD}" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
    
    onSave(dataUrl);
    handleClear();
    onClose();
  }

  async function handlePickImage(fromCamera = false) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera/gallery access is required to attach signature.");
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [3, 1],
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [3, 1],
          quality: 0.8,
          base64: true,
        });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      onSave(dataUrl);
      handleClear();
      onClose();
    }
  }

  // Render stroke path as native line segments
  const renderStroke = (pts: Point[], keyPrefix: string) => {
    if (!pts || pts.length === 0) return null;
    if (pts.length === 1) {
      return (
        <View
          key={`${keyPrefix}-dot`}
          style={{
            position: "absolute",
            left: pts[0].x - 2,
            top: pts[0].y - 2,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#1e293b",
          }}
        />
      );
    }
    const segments: React.ReactNode[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) continue;
      const angle = Math.atan2(dy, dx);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      segments.push(
        <View
          key={`${keyPrefix}-seg-${i}`}
          style={{
            position: "absolute",
            left: cx - dist / 2,
            top: cy - 1.5,
            width: dist,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: "#1e293b",
            transform: [{ rotate: `${angle}rad` }],
          }}
        />
      );
    }
    return segments;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: padWidth + 24 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Sign with your finger on the pad below</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Interactive Pad Canvas */}
          <View style={[styles.canvasWrapper, { width: padWidth, height: padHeight }]} {...panResponder.panHandlers}>
            {paths.map((pts, idx) => renderStroke(pts, `p-${idx}`))}
            {currentPath.length > 0 && renderStroke(currentPath, "curr")}

            {paths.length === 0 && currentPath.length === 0 && (
              <View style={styles.placeholderOverlay} pointerEvents="none">
                <MaterialIcons name="gesture" size={32} color="#cbd5e1" />
                <Text style={styles.placeholderText}>Sign here</Text>
                <View style={styles.signLine} />
              </View>
            )}
          </View>

          {/* Controls: Clear, Undo, Photo, Save */}
          <View style={styles.actionsRow}>
            <View style={styles.leftTools}>
              <TouchableOpacity
                style={[styles.toolBtn, paths.length === 0 && styles.disabledTool]}
                onPress={handleUndo}
                disabled={paths.length === 0}
              >
                <MaterialIcons name="undo" size={18} color={paths.length > 0 ? "#475569" : "#cbd5e1"} />
                <Text style={[styles.toolText, paths.length === 0 && styles.disabledText]}>Undo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolBtn, paths.length === 0 && styles.disabledTool]}
                onPress={handleClear}
                disabled={paths.length === 0}
              >
                <MaterialIcons name="clear" size={18} color={paths.length > 0 ? "#ef4444" : "#cbd5e1"} />
                <Text style={[styles.toolText, paths.length > 0 && { color: "#ef4444" }, paths.length === 0 && styles.disabledText]}>
                  Clear
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toolBtn} onPress={() => handlePickImage(false)}>
                <Feather name="image" size={16} color="#2563eb" />
                <Text style={[styles.toolText, { color: "#2563eb" }]}>Upload</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <MaterialIcons name="check" size={18} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  canvasWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    position: "relative",
  },
  svg: {
    backgroundColor: "transparent",
  },
  placeholderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  signLine: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  leftTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  disabledTool: {
    opacity: 0.5,
  },
  toolText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  disabledText: {
    color: "#cbd5e1",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
