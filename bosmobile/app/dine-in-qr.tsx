import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface DiningTable {
  id: string;
  name: string;
  capacity?: number;
  section?: string;
}

export default function MobileDineInQrScreen() {
  const router = useRouter();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [storeSlug, setStoreSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableSection, setNewTableSection] = useState('Main Floor');

  const fetchTables = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ config: any }>(API_PATHS.commerceConfig);
      const cfg = data.config;
      if (cfg) {
        if (cfg.businessId) setStoreSlug(cfg.businessId);
        else if (cfg.storeSlug) setStoreSlug(cfg.storeSlug);

        let tbls: DiningTable[] = [];
        const parseTables = (raw: any): DiningTable[] => {
          if (!raw) return [];
          if (Array.isArray(raw)) return raw;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        };
        tbls = parseTables(cfg.dineInTablesJson) || parseTables(cfg.tablesJson) || (Array.isArray(cfg.tables) ? cfg.tables : []);
        if (tbls.length > 0) {
          setTables(tbls);
          setSelectedTable(tbls[0].name);
        } else {
          setTables([]);
          setSelectedTable('');
        }
      }
      setError(null);
    } catch (err: any) {
      setTables([]);
      setSelectedTable('');
      setError(err?.message || 'Unable to load your dine-in tables. Tap retry to try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      Alert.alert('Required', 'Please enter a table name');
      return;
    }
    const newTbl: DiningTable = {
      id: `tbl_${Date.now()}`,
      name: newTableName.trim(),
      capacity: parseInt(newTableCapacity, 10) || 4,
      section: newTableSection.trim() || 'Main Floor',
    };
    const updated = [...tables, newTbl];
    setTables(updated);
    setSelectedTable(newTbl.name);
    setAddModalOpen(false);
    setNewTableName('');

    // Persist to backend
    try {
      await apiRequest(API_PATHS.commerceConfig, {
        method: 'PATCH',
        body: { tables: updated },
      });
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save the new table to the server.');
    }
  };

  const qrUrl = `https://fieseros.com/store/${storeSlug}?table=${encodeURIComponent(selectedTable)}`;
  const qrImageUri = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    qrUrl
  )}`;

  const handleShare = async () => {
    hapticFeedback.light();
    try {
      await Share.share({
        message: `Order directly at ${selectedTable}: ${qrUrl}`,
        url: qrUrl,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dine-In Table QR</Text>
        <TouchableOpacity onPress={handleShare} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="share" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Error / Loading Banner */}
        {loading ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#059669" />
          </View>
        ) : error ? (
          <View
            style={{
              width: '100%',
              marginBottom: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: '#fef2f2',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#fecaca',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MaterialIcons name="error-outline" size={16} color="#dc2626" />
            <Text style={{ flex: 1, fontSize: 12, color: '#b91c1c', fontWeight: '600' }} numberOfLines={3}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={fetchTables}
              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#dc2626', borderRadius: 6 }}
            >
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Table Selector Pills */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Select Table ({tables.length} Tables)</Text>
          <TouchableOpacity
            onPress={() => {
              setNewTableName(`Table ${tables.length + 1}`);
              setAddModalOpen(true);
            }}
            style={styles.addTableBtn}
          >
            <MaterialIcons name="add" size={14} color="#059669" />
            <Text style={styles.addTableBtnText}>Add Table</Text>
          </TouchableOpacity>
        </View>

        {tables.length === 0 && !loading && !error ? (
          <View
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <MaterialIcons name="restaurant" size={40} color="#cbd5e1" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 10 }}>
              No dine-in tables yet
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: '#64748b',
                textAlign: 'center',
                marginTop: 4,
                marginBottom: 14,
                lineHeight: 18,
              }}
            >
              Add your first table to generate a scan-to-order QR code for your guests.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setNewTableName('Table 1');
                setAddModalOpen(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#059669',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <MaterialIcons name="add" size={16} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>Add Table</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {tables.map((tbl) => {
                const active = selectedTable === tbl.name;
                return (
                  <TouchableOpacity
                    key={tbl.id}
                    onPress={() => {
                      hapticFeedback.light();
                      setSelectedTable(tbl.name);
                    }}
                    style={[styles.pill, active && styles.pillActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {tbl.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* QR Code Card Display */}
            <View style={styles.card}>
              <View style={styles.tableBadge}>
                <MaterialIcons name="restaurant" size={16} color="#059669" />
                <Text style={styles.tableBadgeText}>{selectedTable.toUpperCase()}</Text>
              </View>

              <Text style={styles.cardTitle}>Scan to Order</Text>
              <Text style={styles.cardSub}>
                Guests scan with their phone camera to browse the menu and order directly to your kitchen.
              </Text>

              <View style={styles.qrBox}>
                <Image source={{ uri: qrImageUri }} style={styles.qrImage} resizeMode="contain" />
              </View>

              <Text style={styles.urlText} numberOfLines={1}>
                {qrUrl}
              </Text>

              <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
                <MaterialIcons name="share" size={18} color="#ffffff" />
                <Text style={styles.shareBtnText}>Share Table Link</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Table Modal */}
      <Modal visible={addModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Dining Table</Text>
            <Text style={styles.modalSubtitle}>Configure table name, capacity, and seating area</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Table Name *</Text>
              <TextInput
                value={newTableName}
                onChangeText={setNewTableName}
                placeholder="e.g. Table 6, Patio B, VIP 2"
                style={styles.input}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Seats</Text>
                <TextInput
                  value={newTableCapacity}
                  onChangeText={setNewTableCapacity}
                  keyboardType="numeric"
                  placeholder="4"
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Section</Text>
                <TextInput
                  value={newTableSection}
                  onChangeText={setNewTableSection}
                  placeholder="Main Floor"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setAddModalOpen(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddTable}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>Create Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  addTableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addTableBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  pillsRow: {
    gap: 8,
    paddingBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tableBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  qrBox: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  urlText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 12,
    marginBottom: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#f8fafc',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  saveBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
