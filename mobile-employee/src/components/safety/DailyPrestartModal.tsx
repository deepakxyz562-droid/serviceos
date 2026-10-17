/**
 * Daily Pre-Start Safety & SWMS Checklist Modal (Fieseros Pro)
 * -------------------------------------------------------------
 * Prompts field technicians once per day on app startup to verify:
 *   1. Required PPE (Steel-cap boots, eye protection, high-vis, safety gloves)
 *   2. Vehicle & Tool Roadworthiness (Fluids, tires, ladders secured, tagged power tools)
 *   3. Site Risk & Emergency Readiness (First aid kit, emergency contact, fit for duty)
 *
 * Dynamically synchronizes with workspace custom safety checklist from
 * GET /api/checklists (category: "Safety" or title matching "Safety/Pre-start").
 *
 * Persists completion in AsyncStorage under `fieseros_prestart_${todayDateKey}`
 * so it only prompts ONCE per day on app start.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  X,
  Truck,
  HardHat,
  AlertTriangle,
  ClipboardCheck,
  Check,
  Zap,
  Sparkles,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';

export interface PrestartItem {
  id: string;
  label: string;
  required: boolean;
}

export interface PrestartSection {
  id: string;
  title: string;
  icon: 'ppe' | 'vehicle' | 'site';
  items: PrestartItem[];
}

export const DAILY_PRESTART_SECTIONS: PrestartSection[] = [
  {
    id: 'sec-ppe',
    title: '1. Personal Protective Equipment (PPE)',
    icon: 'ppe',
    items: [
      {
        id: 'ppe_boots',
        label: 'Steel-cap safety work boots inspected and worn',
        required: true,
      },
      {
        id: 'ppe_eye_gloves',
        label: 'Eye protection and trade-specific safety gloves equipped',
        required: true,
      },
      {
        id: 'ppe_highvis',
        label: 'High-visibility vest or compliant branded uniform worn',
        required: true,
      },
    ],
  },
  {
    id: 'sec-vehicle',
    title: '2. Vehicle & Tool Roadworthiness',
    icon: 'vehicle',
    items: [
      {
        id: 'veh_inspection',
        label: 'Vehicle safety check complete (Tires, mirrors, fluids & lights)',
        required: true,
      },
      {
        id: 'veh_cargo',
        label: 'Ladders & heavy cargo securely strapped and locked down',
        required: true,
      },
      {
        id: 'veh_tools',
        label: 'Power tools, test instruments & leads inspected (Undamaged & tagged)',
        required: true,
      },
    ],
  },
  {
    id: 'sec-emergency',
    title: '3. Site Safety & Emergency Readiness',
    icon: 'site',
    items: [
      {
        id: 'site_firstaid',
        label: 'First aid kit stocked and easily accessible in vehicle',
        required: true,
      },
      {
        id: 'site_contacts',
        label: 'Supervisor contact & local emergency numbers confirmed',
        required: true,
      },
      {
        id: 'site_fit_duty',
        label: 'Fit for work (Well-rested, alert, zero impairment/medication risks)',
        required: true,
      },
    ],
  },
];

interface DailyPrestartModalProps {
  visible: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  technicianName?: string;
  dateKey: string; // e.g. "2026-10-17"
}

export function DailyPrestartModal({
  visible,
  onClose,
  onCompleted,
  technicianName,
  dateKey,
}: DailyPrestartModalProps) {
  const { show } = useToast();
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAlreadyDone, setIsAlreadyDone] = useState(false);

  // Dynamic customization from CRM settings
  const [customSections, setCustomSections] = useState<PrestartSection[] | null>(null);
  const [isCustomFromOwner, setIsCustomFromOwner] = useState(false);
  const activeSections = customSections || DAILY_PRESTART_SECTIONS;
  const allItemIds = useMemo(() => activeSections.flatMap((s) => s.items.map((i) => i.id)), [activeSections]);

  // Section Tab Navigation: 'all' | sectionId
  const [activeSectionId, setActiveSectionId] = useState<string>('all');

  // Fetch dynamic safety checklist created by the business owner in CRM
  useEffect(() => {
    let isMounted = true;
    api.get<Array<{ id: string; title: string; category?: string; sectionsJson?: string }>>('/api/checklists')
      .then((res) => {
        if (!isMounted || !Array.isArray(res)) return;
        const safetyTpl = res.find((c) =>
          c.category?.toLowerCase() === 'safety' ||
          c.title?.toLowerCase().includes('safety') ||
          c.title?.toLowerCase().includes('pre-start') ||
          c.title?.toLowerCase().includes('prestart')
        );
        if (safetyTpl?.sectionsJson) {
          try {
            const parsed = JSON.parse(safetyTpl.sectionsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped: PrestartSection[] = parsed.map((sec: any, idx: number) => ({
                id: sec.id || `sec-${idx}`,
                title: sec.title || `Section ${idx + 1}`,
                icon: idx === 0 ? 'ppe' : idx === 1 ? 'vehicle' : 'site',
                items: (sec.questions || []).map((q: any) => ({
                  id: q.id,
                  label: q.label || 'Safety Check',
                  required: q.required ?? true,
                })),
              }));
              if (mapped.some((s) => s.items.length > 0)) {
                setCustomSections(mapped);
                setIsCustomFromOwner(true);
              }
            }
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Load existing status from AsyncStorage when modal opens
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    (async () => {
      try {
        const storedStatus = await AsyncStorage.getItem(`fieseros_prestart_${dateKey}`);
        const storedRecord = await AsyncStorage.getItem(`fieseros_prestart_record_${dateKey}`);

        if (!isMounted) return;

        if (storedStatus === 'completed' && storedRecord) {
          setIsAlreadyDone(true);
          try {
            const parsed = JSON.parse(storedRecord);
            if (parsed?.answers) {
              setCheckedMap(parsed.answers);
            }
            if (parsed?.notes) {
              setNotes(parsed.notes);
            }
          } catch {}
        } else {
          setIsAlreadyDone(false);
          const initial: Record<string, boolean> = {};
          allItemIds.forEach((id) => {
            initial[id] = false;
          });
          setCheckedMap(initial);
        }
      } catch (err) {
        console.warn('Error reading prestart checklist status:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, dateKey, allItemIds]);

  const completedCount = useMemo(() => {
    return allItemIds.filter((id) => !!checkedMap[id]).length;
  }, [allItemIds, checkedMap]);

  const totalCount = allItemIds.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllChecked = totalCount > 0 && completedCount === totalCount;

  const displayedSections = useMemo(() => {
    if (activeSectionId === 'all') return activeSections;
    return activeSections.filter((s) => s.id === activeSectionId);
  }, [activeSections, activeSectionId]);

  const handleToggleItem = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCheckedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleCheckAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const nextMap: Record<string, boolean> = {};
    allItemIds.forEach((id) => {
      nextMap[id] = true;
    });
    setCheckedMap(nextMap);
  }, [allItemIds]);

  const handleSaveAndConfirm = useCallback(async () => {
    if (!isAllChecked) {
      show('Please complete all safety checks before proceeding.', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    setSubmitting(true);
    try {
      const record = {
        dateKey,
        completedAt: new Date().toISOString(),
        technician: technicianName || 'Technician',
        answers: checkedMap,
        notes: notes.trim() || undefined,
        status: 'completed',
        customTemplate: isCustomFromOwner,
      };

      await AsyncStorage.setItem(`fieseros_prestart_${dateKey}`, 'completed');
      await AsyncStorage.setItem(`fieseros_prestart_record_${dateKey}`, JSON.stringify(record));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      show('Pre-start safety checklist confirmed. Have a safe day!', 'success');

      onCompleted?.();
      onClose();
    } catch (err) {
      console.warn('Failed to save prestart checklist:', err);
      show('Could not save checklist. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [isAllChecked, dateKey, technicianName, checkedMap, notes, show, onCompleted, onClose, isCustomFromOwner]);

  const handleSkipForNow = useCallback(async () => {
    try {
      await AsyncStorage.setItem(`fieseros_prestart_dismissed_${dateKey}`, 'true');
    } catch {}
    Haptics.selectionAsync().catch(() => {});
    onClose();
  }, [dateKey, onClose]);

  return (
    <Modal visible={visible} onClose={onClose} position="bottom">
      <ScrollView
        style={{ maxHeight: 580 }}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 4 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Top Header */}
        <View className="mb-3 flex-row items-center justify-between px-1 pt-1">
          <View className="flex-row items-center gap-2.5">
            <View className="size-9 items-center justify-center rounded-xl bg-emerald-600 shadow-xs">
              <ShieldCheck size={20} color="#ffffff" />
            </View>
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-base font-extrabold text-slate-900">
                  Pre-Start Safety Checklist
                </Text>
                <View className="rounded bg-emerald-100 px-1.5 py-0.5">
                  <Text className="text-[10px] font-black uppercase text-emerald-800">
                    {isCustomFromOwner ? 'COMPANY SWMS' : 'DAILY SWMS'}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground">
                Mandatory hazard & roadworthiness inspection
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={12} className="p-1">
            <X size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* Status / Progress Summary Box */}
        <View className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-bold text-emerald-950">
                {isAlreadyDone
                  ? 'Completed for Today ✓'
                  : `${completedCount} of ${totalCount} checks passed (${progressPercent}%)`}
              </Text>
              <Text className="mt-0.5 text-[11px] text-emerald-700">
                {technicianName ? `${technicianName} · ` : ''}
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {!isAlreadyDone && !isAllChecked && (
              <Pressable
                onPress={handleCheckAll}
                className="flex-row items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 border border-emerald-300 shadow-xs active:bg-emerald-100"
              >
                <Zap size={13} color="#059669" />
                <Text className="text-xs font-bold text-emerald-800">Pass All</Text>
              </Pressable>
            )}
          </View>

          {/* Progress Bar */}
          <View className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-emerald-200/70">
            <View
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>

        {/* Section Navigation Tabs (All 9 / PPE / Vehicle / Site) */}
        <View className="mb-3 flex-row items-center gap-1.5 px-0.5">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setActiveSectionId('all');
            }}
            className={`rounded-full px-3 py-1.5 border ${
              activeSectionId === 'all'
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeSectionId === 'all' ? 'text-white' : 'text-slate-700'
              }`}
            >
              All ({totalCount})
            </Text>
          </Pressable>

          {activeSections.map((sec, idx) => {
            const isSecActive = activeSectionId === sec.id;
            const doneInSec = sec.items.filter((it) => !!checkedMap[it.id]).length;
            const shortLabel =
              idx === 0 ? '🦺 PPE' : idx === 1 ? '🚚 Vehicle' : '⚠️ Site';

            return (
              <Pressable
                key={sec.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveSectionId(sec.id);
                }}
                className={`flex-row items-center gap-1 rounded-full px-2.5 py-1.5 border ${
                  isSecActive
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSecActive ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {shortLabel} ({doneInSec}/{sec.items.length})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Checklist Sections */}
        {displayedSections.map((section) => {
          const sectionDone = section.items.every((it) => !!checkedMap[it.id]);

          return (
            <View
              key={section.id}
              className="mb-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs"
            >
              <View className="mb-2.5 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  {section.icon === 'ppe' ? (
                    <HardHat size={16} color="#059669" />
                  ) : section.icon === 'vehicle' ? (
                    <Truck size={16} color="#059669" />
                  ) : (
                    <AlertTriangle size={16} color="#059669" />
                  )}
                  <Text className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                    {section.title}
                  </Text>
                </View>
                {sectionDone && (
                  <View className="flex-row items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    <Check size={11} color="#059669" />
                    <Text className="text-[10px] font-bold text-emerald-700">Passed</Text>
                  </View>
                )}
              </View>

              <View className="gap-2">
                {section.items.map((item) => {
                  const isChecked = !!checkedMap[item.id];

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleToggleItem(item.id)}
                      className={`flex-row items-start gap-2.5 rounded-xl p-2.5 border transition-all ${
                        isChecked
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-100 bg-slate-50/70'
                      }`}
                    >
                      <View className="mt-0.5">
                        {isChecked ? (
                          <CheckCircle2 size={19} color="#059669" />
                        ) : (
                          <Circle size={19} color="#94A3B8" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-xs leading-4 font-medium ${
                            isChecked
                              ? 'text-slate-900 font-semibold'
                              : 'text-slate-600'
                          }`}
                        >
                          {item.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Scroll helper indicator when in 'all' view */}
        {activeSectionId === 'all' && (
          <View className="mb-2 items-center py-1">
            <Text className="text-[11px] text-slate-400">
              Showing all {totalCount} checks across {activeSections.length} sections · Scroll to review all
            </Text>
          </View>
        )}

        {/* Optional Notes & Observations */}
        <View className="mb-3.5 rounded-2xl border border-slate-200 bg-white p-3.5">
          <Text className="text-xs font-bold text-slate-800 mb-1.5">
            Hazard Notes or Vehicle Observations (Optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Oil level good, ladder strap replaced, clear weather..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={2}
            className="min-h-[56px] rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900"
          />
        </View>

        {/* Action Buttons */}
        <View className="gap-2">
          <Button
            onPress={handleSaveAndConfirm}
            loading={submitting}
            fullWidth
            className="bg-emerald-600 active:bg-emerald-700 h-12"
          >
            <View className="flex-row items-center justify-center gap-2">
              <ClipboardCheck size={18} color="#ffffff" />
              <Text className="text-sm font-bold text-white">
                {isAlreadyDone
                  ? 'Update Pre-Start Record'
                  : 'Confirm & Begin Workday'}
              </Text>
            </View>
          </Button>

          {!isAlreadyDone && (
            <Pressable
              onPress={handleSkipForNow}
              hitSlop={8}
              className="py-2.5 items-center justify-center active:opacity-60"
            >
              <Text className="text-xs font-semibold text-slate-400">
                Remind Me on Site / Skip for Now
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}
