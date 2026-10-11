/**
 * My Home & Asset Vault Screen (Customer Mobile App)
 * Covers:
 *   - Screen 19: My Home Properties & Appliance Memory Vault
 *   - Screen 20: Preventative Care & Scheduled Maintenance Timeline
 *
 * Uses Fieseros Emerald Brand tokens (#059669)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Home,
  Tv,
  Wrench,
  Calendar,
  Plus,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Camera,
  Trash2,
  CheckCircle2,
  Building,
  ArrowRight,
  Droplet,
  Zap,
  Wind,
} from 'lucide-react-native';
import { COLORS } from '@/lib/constants';

interface Appliance {
  id: string;
  name: string;
  brand: string;
  model: string;
  location: string;
  installDate: string;
  warrantyStatus: 'active' | 'expiring_soon' | 'expired';
  lastService: string;
  nextServiceDue: string;
  serviceCategory: string;
}

interface MaintenanceTask {
  id: string;
  title: string;
  appliance: string;
  dueInDays: number;
  urgency: 'high' | 'medium' | 'low';
  estimatedCost: number;
  category: string;
  description: string;
}

const INITIAL_PROPERTIES = [
  {
    id: 'prop-1',
    name: 'Primary Residence',
    type: '3 BHK Apartment',
    address: '42 Orchid Park, 100ft Road, Indiranagar, Bengaluru',
    appliancesCount: 4,
    activeTasks: 2,
  },
  {
    id: 'prop-2',
    name: 'Weekend Villa',
    type: '4 BHK Independent Villa',
    address: '18 Green Meadows, Whitefield, Bengaluru',
    appliancesCount: 2,
    activeTasks: 1,
  },
];

const INITIAL_APPLIANCES: Appliance[] = [
  {
    id: 'app-1',
    name: 'Living Room AC',
    brand: 'Daikin',
    model: 'FTKF50 1.5 Ton 5-Star Inverter',
    location: 'Living Room',
    installDate: 'Mar 2024',
    warrantyStatus: 'active',
    lastService: 'May 2024 (Deep Clean)',
    nextServiceDue: 'In 20 days',
    serviceCategory: 'AC & HVAC',
  },
  {
    id: 'app-2',
    name: 'Kitchen Water Purifier',
    brand: 'Kent',
    model: 'Grand Plus RO+UV+UF',
    location: 'Kitchen',
    installDate: 'Nov 2023',
    warrantyStatus: 'active',
    lastService: 'Aug 2024 (Filter changed)',
    nextServiceDue: 'In 45 days',
    serviceCategory: 'Plumbing & Water',
  },
  {
    id: 'app-3',
    name: 'Master Bath Geyser',
    brand: 'Havells',
    model: 'Monza EC 25L Vertical Storage',
    location: 'Master Bathroom',
    installDate: 'Jan 2023',
    warrantyStatus: 'expiring_soon',
    lastService: 'Nov 2023 (Anode Rod check)',
    nextServiceDue: 'In 60 days',
    serviceCategory: 'Plumbing & Water',
  },
  {
    id: 'app-4',
    name: 'Main Refrigerator',
    brand: 'Samsung',
    model: 'Convertible 345L Twin Cooling',
    location: 'Kitchen',
    installDate: 'Jun 2022',
    warrantyStatus: 'expired',
    lastService: 'Jun 2024 (Coil cleaning)',
    nextServiceDue: 'In 90 days',
    serviceCategory: 'Appliance Repair',
  },
];

const MAINTENANCE_SCHEDULE: MaintenanceTask[] = [
  {
    id: 'task-1',
    title: 'Pre-Summer AC Deep Coil & Gas Check',
    appliance: 'Daikin 1.5T Inverter AC (Living Room)',
    dueInDays: 20,
    urgency: 'high',
    estimatedCost: 499,
    category: 'AC & HVAC',
    description: 'Jet-pump indoor filter wash, outdoor unit fin clean, and freon pressure check to maximize cooling efficiency.',
  },
  {
    id: 'task-2',
    title: 'RO Membrane & Carbon Sediment Filter Service',
    appliance: 'Kent Grand Plus RO (Kitchen)',
    dueInDays: 45,
    urgency: 'medium',
    estimatedCost: 850,
    category: 'Plumbing & Water',
    description: 'Pre-filter candle replacement and TDS calibration to keep water pure and safe.',
  },
  {
    id: 'task-3',
    title: 'Whole-Home Preventive Pest Protection',
    appliance: 'Indiranagar Residence',
    dueInDays: 60,
    urgency: 'low',
    estimatedCost: 1200,
    category: 'Pest Control',
    description: 'Odourless gel baiting for kitchen cabinets and drain mesh treatment.',
  },
  {
    id: 'task-4',
    title: 'Overhead Water Tank Sanitization',
    appliance: 'Water Storage System',
    dueInDays: 90,
    urgency: 'low',
    estimatedCost: 950,
    category: 'Cleaning',
    description: 'High-pressure mechanized de-sludging and UV radiator purification.',
  },
];

export default function MyHomeScreen() {
  const [activeTab, setActiveTab] = useState<'vault' | 'schedule'>('vault');
  const [selectedPropertyId, setSelectedPropertyId] = useState('prop-1');
  const [appliances, setAppliances] = useState<Appliance[]>(INITIAL_APPLIANCES);
  const [showAddModal, setShowAddModal] = useState(false);

  // New appliance form
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newLocation, setNewLocation] = useState('Living Room');
  const [newCategory, setNewCategory] = useState('AC & HVAC');

  const handleAddAppliance = () => {
    if (!newBrand.trim() || !newModel.trim()) {
      Alert.alert('Required Fields', 'Please enter brand and model name.');
      return;
    }
    const newApp: Appliance = {
      id: `app-${Date.now()}`,
      name: `${newBrand} ${newCategory}`,
      brand: newBrand,
      model: newModel,
      location: newLocation,
      installDate: 'Oct 2026',
      warrantyStatus: 'active',
      lastService: 'Added today',
      nextServiceDue: 'In 90 days',
      serviceCategory: newCategory,
    };
    setAppliances((prev) => [newApp, ...prev]);
    setNewBrand('');
    setNewModel('');
    setShowAddModal(false);
    Alert.alert('Appliance Saved', 'AI will automatically remind you when maintenance is due.');
  };

  const handleBookMaintenance = (task: MaintenanceTask) => {
    // Navigate straight to quotes or AI intake with pre-filled context
    router.push({
      pathname: '/(customer)/quotes',
      params: {
        category: task.category,
        description: `Scheduled maintenance: ${task.title} for ${task.appliance}`,
        budget: String(task.estimatedCost),
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      {/* Top Header */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>My Home Vault</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Asset memory & preventative maintenance</Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
          >
            <Plus size={16} color="#059669" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669', marginLeft: 4 }}>Add Asset</Text>
          </Pressable>
        </View>

        {/* Property Selector Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {INITIAL_PROPERTIES.map((prop) => {
            const isSelected = prop.id === selectedPropertyId;
            return (
              <Pressable
                key={prop.id}
                onPress={() => setSelectedPropertyId(prop.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#059669' : '#F1F5F9',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  marginRight: 8,
                }}
              >
                <Building size={14} color={isSelected ? '#fff' : '#64748B'} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? '#fff' : '#334155', marginLeft: 6 }}>
                  {prop.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab Switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, marginTop: 12 }}>
          <Pressable
            onPress={() => setActiveTab('vault')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: activeTab === 'vault' ? '#fff' : 'transparent',
              shadowColor: activeTab === 'vault' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'vault' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: activeTab === 'vault' ? '700' : '500', color: activeTab === 'vault' ? '#059669' : '#64748B' }}>
              Appliance Memory ({appliances.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('schedule')}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: activeTab === 'schedule' ? '#fff' : 'transparent',
              shadowColor: activeTab === 'schedule' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'schedule' ? 0.05 : 0,
              shadowRadius: 2,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: activeTab === 'schedule' ? '700' : '500', color: activeTab === 'schedule' ? '#059669' : '#64748B' }}>
              Preventive Care ({MAINTENANCE_SCHEDULE.length})
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'vault' ? (
          <>
            {/* AI Memory Banner */}
            <View style={{ backgroundColor: '#064E3B', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#059669', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="#fff" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Never search for a receipt again</Text>
                  <Text style={{ fontSize: 12, color: '#A7F3D0', marginTop: 2 }}>
                    Fieseros AI stores your serial numbers, installation dates, and reminds you before warranties lapse.
                  </Text>
                </View>
              </View>
            </View>

            {/* Appliances List */}
            {appliances.map((app) => (
              <View
                key={app.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{app.name}</Text>
                      {app.warrantyStatus === 'active' && (
                        <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>WARRANTY ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                      {app.brand} · {app.model}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      📍 {app.location} · Installed {app.installDate}
                    </Text>
                  </View>
                </View>

                {/* Service History snippet */}
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Last Serviced</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 1 }}>{app.lastService}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Next Check</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 1 }}>{app.nextServiceDue}</Text>
                  </View>
                </View>

                {/* Quick Action Button */}
                <Pressable
                  onPress={() => {
                    router.push({
                      pathname: '/(customer)/quotes',
                      params: {
                        category: app.serviceCategory,
                        description: `Inspection & Service for ${app.brand} ${app.model} in ${app.location}`,
                      },
                    });
                  }}
                  style={{
                    marginTop: 12,
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingVertical: 9,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Wrench size={14} color="#059669" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669', marginLeft: 6 }}>Request Service for this Appliance</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : (
          <>
            {/* Screen 20: Preventative Care */}
            <View style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={20} color="#D97706" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>Avoid Breakdowns Before They Happen</Text>
                  <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                    Timely servicing saves up to 40% on emergency repair costs and power bills.
                  </Text>
                </View>
              </View>
            </View>

            {MAINTENANCE_SCHEDULE.map((task) => (
              <View
                key={task.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: task.urgency === 'high' ? '#FED7AA' : '#E2E8F0',
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{task.title}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{task.appliance}</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: task.dueInDays <= 30 ? '#FEE2E2' : '#EFF6FF',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: task.dueInDays <= 30 ? '#DC2626' : '#2563EB',
                      }}
                    >
                      Due in {task.dueInDays} days
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 18 }}>
                  {task.description}
                </Text>

                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Estimated Cost</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#059669', marginTop: 1 }}>₹{task.estimatedCost}</Text>
                  </View>

                  <Pressable
                    onPress={() => handleBookMaintenance(task)}
                    style={{
                      backgroundColor: '#059669',
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', marginRight: 4 }}>Book Now</Text>
                    <ArrowRight size={14} color="#fff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Appliance Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>Add Appliance to Vault</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Store details so technicians arrive with the correct parts.</Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {['AC & HVAC', 'Plumbing & Water', 'Appliance Repair', 'Electrical'].map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  style={{
                    backgroundColor: newCategory === cat ? '#059669' : '#F1F5F9',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: newCategory === cat ? '#fff' : '#475569' }}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>Brand (e.g. Daikin, LG, Kent)</Text>
            <TextInput
              value={newBrand}
              onChangeText={setNewBrand}
              placeholder="Enter brand name"
              placeholderTextColor="#94A3B8"
              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A', marginBottom: 12 }}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>Model / Capacity</Text>
            <TextInput
              value={newModel}
              onChangeText={setNewModel}
              placeholder="e.g. 1.5 Ton 5-Star Inverter"
              placeholderTextColor="#94A3B8"
              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A', marginBottom: 12 }}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}>Room Location</Text>
            <TextInput
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="e.g. Living Room, Master Bed"
              placeholderTextColor="#94A3B8"
              style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A', marginBottom: 20 }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddAppliance}
                style={{ flex: 2, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Save to Vault</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
