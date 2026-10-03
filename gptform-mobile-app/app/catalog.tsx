import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';

interface ProductItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  isActive: boolean;
}

export default function MobileCatalogScreen() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New item modal/form
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Main');

  useEffect(() => {
    // Load config
    fetch('http://localhost:3000/api/commerce/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.config?.catalogJson) {
          try {
            setCatalog(JSON.parse(data.config.catalogJson));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        // Fallback default sample items if local
        setCatalog((prev) =>
          prev.length > 0
            ? prev
            : [
                { id: '1', name: 'Chocolate Truffle Cake 1kg', price: 750, category: 'Cakes', isActive: true },
                { id: '2', name: 'Artisan Sourdough Loaf', price: 180, category: 'Breads', isActive: true },
                { id: '3', name: 'Signature Cappuccino', price: 140, category: 'Beverages', isActive: true },
              ]
        );
      });
  }, []);

  const handleAddProduct = () => {
    if (!newName.trim() || !newPrice.trim()) {
      Alert.alert('Required', 'Please enter both item name and price.');
      return;
    }

    hapticFeedback.medium();
    const item: ProductItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      price: parseFloat(newPrice) || 0,
      category: newCategory.trim() || 'General',
      isActive: true,
    };

    setCatalog((prev) => [...prev, item]);
    setNewName('');
    setNewPrice('');
    setAddingNew(false);
    saveCatalog([...catalog, item]);
  };

  const handleDeleteProduct = (id: string) => {
    hapticFeedback.light();
    Alert.alert('Delete Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = catalog.filter((p) => p.id !== id);
          setCatalog(updated);
          saveCatalog(updated);
        },
      },
    ]);
  };

  const saveCatalog = async (updated: ProductItem[]) => {
    setSaving(true);
    try {
      await fetch('http://localhost:3000/api/commerce/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogJson: updated }),
      });
    } catch {
      // offline
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products & Menu</Text>
        <TouchableOpacity
          onPress={() => setAddingNew(true)}
          style={styles.addBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Add New Item Sheet/Card */}
      {addingNew && (
        <View style={styles.addCard}>
          <Text style={styles.addCardTitle}>Add New Item</Text>
          <TextInput
            placeholder="Item Name (e.g. Sourdough Loaf)"
            value={newName}
            onChangeText={setNewName}
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              placeholder="Price (₹)"
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              placeholder="Category"
              value={newCategory}
              onChangeText={setNewCategory}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <TouchableOpacity onPress={() => setAddingNew(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddProduct} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Catalog List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {catalog.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCat}>{item.category || 'General'}</Text>
                <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteProduct(item.id)}
                style={styles.deleteBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
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
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  addCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  itemCat: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
