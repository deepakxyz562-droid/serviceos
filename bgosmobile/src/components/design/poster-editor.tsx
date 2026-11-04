import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';
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

import { friendlyLayerName } from '../../lib/calendar-utils';
export { friendlyLayerName };

export function PosterEditor({
  doc,
  onChange,
}: {
  doc: MarketingDesign;
  onChange: (doc: MarketingDesign) => void;
}) {
  const [selected, setSelected] = useState('headline');
  const [canvasWidth, setCanvasWidth] = useState(1);
  const [activeTool, setActiveTool] = useState<'text' | 'color' | 'photo' | 'layers'>('text');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<MarketingDesign | null>(null);

  useEffect(() => {
    setPreview(null);
  }, [doc]);

  const visibleDoc = preview || doc;
  const current = useRef({ doc, onChange, width: canvasWidth, selected });
  current.current = { doc, onChange, width: canvasWidth, selected };

  const pendingGesture = useRef<Partial<DesignLayer> | null>(null);
  const drag = useRef<{ layer: DesignLayer; doc: MarketingDesign; distance: number; angle: number } | null>(
    null
  );
  const layer = visibleDoc.layers.find((l) => l.id === selected);

  function patch(values: Partial<DesignLayer>) {
    try {
      onChange(patchDesignLayer(doc, selected, values));
      setError('');
    } catch {
      setError('This adjustment does not fit the canvas.');
    }
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        pendingGesture.current = null;
        drag.current = null;
        const c = current.current;
        const l = c.doc.layers.find((lyr) => lyr.id === c.selected);
        if (!l || l.locked) return;
        const [a, b] = e.nativeEvent.touches;
        drag.current = {
          layer: l,
          doc: c.doc,
          distance: b ? Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) : 0,
          angle: b ? Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) : 0,
        };
      },
      onPanResponderMove: (e, g) => {
        const start = drag.current;
        if (!start) return;
        const c = current.current;
        const scale = c.doc.width / c.width;
        const touches = e.nativeEvent.touches;
        let p: Partial<DesignLayer> = gestureLayer(
          start.layer,
          start.doc,
          g.dx * scale,
          g.dy * scale,
          'move'
        );
        if (touches.length >= 2 && !start.distance) {
          const [a, b] = touches;
          start.distance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          start.angle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
        }
        if (touches.length >= 2 && start.distance) {
          const [a, b] = touches;
          const factor = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) / start.distance;
          p = {
            width: start.layer.width * factor,
            height: start.layer.height * factor,
            rotation: Math.max(
              -180,
              Math.min(
                180,
                (start.layer.rotation || 0) +
                  ((Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX) - start.angle) * 180) / Math.PI
              )
            ),
          };
        }
        pendingGesture.current = p;
        setPreview(patchDesignLayer(start.doc, start.layer.id, p));
      },
      onPanResponderRelease: () => {
        setPreview(null);
        const start = drag.current;
        drag.current = null;
        if (start && pendingGesture.current) {
          current.current.onChange(patchDesignLayer(start.doc, start.layer.id, pendingGesture.current));
        }
        pendingGesture.current = null;
      },
      onPanResponderTerminate: () => {
        setPreview(null);
        drag.current = null;
        pendingGesture.current = null;
      },
    })
  ).current;

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
        latest.onChange({
          ...latest.doc,
          layers: [
            ...latest.doc.layers,
            {
              id,
              type: 'image',
              x: 40,
              y: 40,
              width: latest.doc.width - 80,
              height: latest.doc.height * 0.45,
              src: result.url,
              assetId: result.assetId,
              color: '#ffffff',
              background: 'transparent',
              fontSize: 16,
              opacity: 1,
            },
          ],
        });
        setSelected(id);
      } else {
        latest.onChange(patchDesignLayer(latest.doc, targetId, { src: result.url, assetId: result.assetId }));
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

  return (
    <View style={styles.container}>
      {/* ── Visual Canvas Preview with Direct Touch Drag ── */}
      <View
        onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
        style={styles.canvasContainer}
      >
        <PosterPreview doc={visibleDoc} />

        {/* Unselected layer touch targets */}
        {visibleDoc.layers
          .filter((l) => !l.hidden && l.id !== selected)
          .map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityLabel={`Select ${l.id}`}
              onPress={() => setSelected(l.id)}
              style={{
                position: 'absolute',
                left: (l.x / doc.width) * canvasWidth,
                top: (l.y / doc.width) * canvasWidth,
                width: (l.width / doc.width) * canvasWidth,
                height: (l.height / doc.width) * canvasWidth,
                transform: [{ rotate: `${l.rotation || 0}deg` }],
              }}
            />
          ))}

        {/* Selected Layer Boundary Ring */}
        {layer && !layer.hidden && (
          <View
            {...responder.panHandlers}
            accessibilityLabel={`Move ${layer.id}`}
            style={{
              position: 'absolute',
              left: (layer.x / doc.width) * canvasWidth,
              top: (layer.y / doc.width) * canvasWidth,
              width: (layer.width / doc.width) * canvasWidth,
              height: (layer.height / doc.width) * canvasWidth,
              zIndex: 10,
              borderWidth: 2,
              borderColor: '#009F50',
              borderStyle: 'dashed',
              backgroundColor: 'transparent',
              transform: [{ rotate: `${layer.rotation || 0}deg` }],
            }}
          />
        )}
      </View>

      {/* ── Active Layer Quick Pill ── */}
      <View style={styles.layerStatusBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <MaterialIcons
            name={layer?.type === 'image' ? 'image' : layer?.type === 'text' ? 'title' : 'category'}
            size={16}
            color="#009F50"
          />
          <Text numberOfLines={1} style={styles.layerStatusText}>
            Editing: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{friendlyLayerName(selected)}</Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {layer && (
            <>
              <Pressable
                onPress={() =>
                  onChange({
                    ...doc,
                    layers: doc.layers.map((l) => (l.id === selected ? { ...l, locked: !l.locked } : l)),
                  })
                }
                style={styles.layerActionPill}
              >
                <MaterialIcons
                  name={layer.locked ? 'lock' : 'lock-open'}
                  size={14}
                  color={layer.locked ? '#DC2626' : '#64748B'}
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  onChange({
                    ...doc,
                    layers: doc.layers.map((l) => (l.id === selected ? { ...l, hidden: !l.hidden } : l)),
                  })
                }
                style={styles.layerActionPill}
              >
                <MaterialIcons
                  name={layer.hidden ? 'visibility-off' : 'visibility'}
                  size={14}
                  color="#64748B"
                />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* ── Tool Category Switcher Tabs ── */}
      <View style={styles.toolTabsRow}>
        <Pressable
          onPress={() => setActiveTool('text')}
          style={[styles.toolTab, activeTool === 'text' && styles.toolTabActive]}
        >
          <MaterialIcons name="title" size={16} color={activeTool === 'text' ? '#009F50' : '#64748B'} />
          <Text style={[styles.toolTabText, activeTool === 'text' && styles.toolTabTextActive]}>
            Text & Font
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTool('color')}
          style={[styles.toolTab, activeTool === 'color' && styles.toolTabActive]}
        >
          <MaterialIcons
            name="palette"
            size={16}
            color={activeTool === 'color' ? '#009F50' : '#64748B'}
          />
          <Text style={[styles.toolTabText, activeTool === 'color' && styles.toolTabTextActive]}>
            Colors
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTool('photo')}
          style={[styles.toolTab, activeTool === 'photo' && styles.toolTabActive]}
        >
          <MaterialIcons name="image" size={16} color={activeTool === 'photo' ? '#009F50' : '#64748B'} />
          <Text style={[styles.toolTabText, activeTool === 'photo' && styles.toolTabTextActive]}>
            Photo & Frame
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTool('layers')}
          style={[styles.toolTab, activeTool === 'layers' && styles.toolTabActive]}
        >
          <MaterialIcons
            name="layers"
            size={16}
            color={activeTool === 'layers' ? '#009F50' : '#64748B'}
          />
          <Text style={[styles.toolTabText, activeTool === 'layers' && styles.toolTabTextActive]}>
            Layers
          </Text>
        </Pressable>
      </View>

      {/* ── Dynamic Tool Panel ── */}
      <View style={styles.toolPanel}>
        {/* TAB 1: TEXT & FONT */}
        {activeTool === 'text' && (
          <View style={{ gap: 12 }}>
            {layer && layer.type === 'text' ? (
              <>
                <TextInput
                  value={layer.text}
                  onChangeText={(text) => patch({ text: text.slice(0, 1000) })}
                  editable={!layer.locked}
                  multiline
                  style={styles.textInput}
                  placeholder="Enter text..."
                  placeholderTextColor="#94A3B8"
                />

                {/* Font Size & Alignment Steppers */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Text style={styles.controlLabel}>Size</Text>
                    <Pressable
                      disabled={layer.locked}
                      onPress={() => patch({ fontSize: Math.max(10, layer.fontSize - 4) })}
                      style={styles.stepperBtn}
                    >
                      <MaterialIcons name="remove" size={16} color="#0F172A" />
                    </Pressable>
                    <Text style={styles.stepperVal}>{Math.round(layer.fontSize)}</Text>
                    <Pressable
                      disabled={layer.locked}
                      onPress={() => patch({ fontSize: Math.min(180, layer.fontSize + 4) })}
                      style={styles.stepperBtn}
                    >
                      <MaterialIcons name="add" size={16} color="#0F172A" />
                    </Pressable>
                  </View>

                  {/* Alignment & Bold */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <Pressable
                        key={align}
                        disabled={layer.locked}
                        onPress={() => patch({ textAlign: align })}
                        style={[
                          styles.formatBtn,
                          layer.textAlign === align && styles.formatBtnActive,
                        ]}
                      >
                        <MaterialIcons
                          name={`format-align-${align}` as any}
                          size={16}
                          color={layer.textAlign === align ? '#009F50' : '#64748B'}
                        />
                      </Pressable>
                    ))}

                    <Pressable
                      disabled={layer.locked}
                      onPress={() => patch({ fontWeight: layer.fontWeight === 700 ? 400 : 700 })}
                      style={[
                        styles.formatBtn,
                        layer.fontWeight === 700 && styles.formatBtnActive,
                      ]}
                    >
                      <MaterialIcons
                        name="format-bold"
                        size={16}
                        color={layer.fontWeight === 700 ? '#009F50' : '#64748B'}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>Select a text layer on the canvas or from the Layers tab to customize typography.</Text>
                <Pressable
                  onPress={() => {
                    const id = Crypto.randomUUID();
                    onChange({
                      ...doc,
                      layers: [
                        ...doc.layers,
                        {
                          id,
                          type: 'text',
                          x: 40,
                          y: 40,
                          width: doc.width - 80,
                          height: 100,
                          text: 'New Headline',
                          color: '#0F172A',
                          background: 'transparent',
                          fontSize: 42,
                          opacity: 1,
                        },
                      ],
                    });
                    setSelected(id);
                  }}
                  style={styles.addLayerBtn}
                >
                  <MaterialIcons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addLayerBtnText}>Add New Text</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: COLOR PALETTE */}
        {activeTool === 'color' && (
          <View style={{ gap: 10 }}>
            <Text style={styles.controlLabel}>Select Brand Color Palette</Text>
            <View style={styles.swatchesRow}>
              {COLOR_PALETTE.map((c) => {
                const currentColor = layer?.type === 'shape' ? layer.background : layer?.color;
                const isSelected = currentColor?.toLowerCase() === c.hex.toLowerCase();

                return (
                  <Pressable
                    key={c.hex}
                    disabled={layer?.locked}
                    onPress={() =>
                      patch(layer?.type === 'shape' ? { background: c.hex } : { color: c.hex })
                    }
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
                        size={16}
                        color={c.hex === '#FFFFFF' ? '#0F172A' : '#FFFFFF'}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 3: PHOTO & FRAME */}
        {activeTool === 'photo' && (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => void replacePhoto(false)}
                style={styles.photoActionBtn}
              >
                <MaterialIcons name="image" size={18} color="#009F50" />
                <Text style={styles.photoActionBtnText}>Replace Photo</Text>
              </Pressable>

              <Pressable
                onPress={() => void replacePhoto(true)}
                style={styles.photoActionBtn}
              >
                <MaterialIcons name="add-photo-alternate" size={18} color="#2563EB" />
                <Text style={styles.photoActionBtnText}>Add New Photo</Text>
              </Pressable>
            </View>

            {layer && layer.type === 'image' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
                <Text style={styles.controlLabel}>Adjust Photo Position</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() => patch({ cropX: Math.max(0, (layer.cropX ?? 50) - 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-back" size={16} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    onPress={() => patch({ cropX: Math.min(100, (layer.cropX ?? 50) + 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-forward" size={16} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    onPress={() => patch({ cropY: Math.max(0, (layer.cropY ?? 50) - 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-upward" size={16} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    onPress={() => patch({ cropY: Math.min(100, (layer.cropY ?? 50) + 10) })}
                    style={styles.stepperBtn}
                  >
                    <MaterialIcons name="arrow-downward" size={16} color="#0F172A" />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 4: LAYERS */}
        {activeTool === 'layers' && (
          <View style={{ gap: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {doc.layers.map((l) => {
                const isSelected = l.id === selected;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => setSelected(l.id)}
                    style={[styles.layerChip, isSelected && styles.layerChipActive]}
                  >
                    <MaterialIcons
                      name={l.locked ? 'lock' : l.type === 'image' ? 'image' : 'title'}
                      size={14}
                      color={isSelected ? '#009F50' : '#64748B'}
                    />
                    <Text style={[styles.layerChipText, isSelected && styles.layerChipTextActive]}>
                      {friendlyLayerName(l.id)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {layer && (
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
                <Pressable
                  disabled={layer.locked}
                  onPress={() =>
                    onChange({
                      ...doc,
                      layers: [...doc.layers.filter((l) => l.id !== selected), layer],
                    })
                  }
                  style={styles.layerOrderBtn}
                >
                  <Text style={styles.layerOrderBtnText}>Bring Forward</Text>
                </Pressable>

                <Pressable
                  disabled={layer.locked}
                  onPress={() =>
                    onChange({
                      ...doc,
                      layers: [layer, ...doc.layers.filter((l) => l.id !== selected)],
                    })
                  }
                  style={styles.layerOrderBtn}
                >
                  <Text style={styles.layerOrderBtnText}>Send Back</Text>
                </Pressable>

                <Pressable
                  disabled={layer.locked}
                  onPress={() =>
                    onChange({
                      ...doc,
                      layers: doc.layers.filter((l) => l.id !== selected),
                    })
                  }
                  style={[styles.layerOrderBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                >
                  <Text style={[styles.layerOrderBtnText, { color: '#DC2626' }]}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Export Quick Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 4 }}>
        <Pressable
          onPress={() => void exportImage('png')}
          disabled={exporting}
          style={styles.exportPill}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#009F50" />
          ) : (
            <>
              <MaterialIcons name="download" size={14} color="#009F50" />
              <Text style={styles.exportPillText}>Download Image</Text>
            </>
          )}
        </Pressable>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  canvasContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#070A13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  layerStatusText: {
    fontSize: 12,
    color: '#64748B',
  },
  layerActionPill: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  toolTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  toolTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 4,
  },
  toolTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toolTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  toolTabTextActive: {
    color: '#009F50',
    fontWeight: '800',
  },
  toolPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 44,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  stepperBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 26,
    textAlign: 'center',
  },
  formatBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formatBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  swatchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  layerChipActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  layerChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  layerChipTextActive: {
    color: '#009F50',
    fontWeight: '800',
  },
  layerOrderBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  layerOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  hintBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  addLayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#009F50',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addLayerBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
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
    color: '#DC2626',
    fontSize: 11.5,
    textAlign: 'center',
  },
});
