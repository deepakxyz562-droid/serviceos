import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types (mirror of GET /api/commerce/cheques and PATCH /api/commerce/cheques/[id])
// ---------------------------------------------------------------------------

type ChequeStatus = 'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED';
type ChequeDirection = 'INCOMING' | 'OUTGOING';
type StatusFilter = 'ALL' | ChequeStatus;
type DirectionFilter = 'ALL' | ChequeDirection;

interface Cheque {
  id: string;
  direction: ChequeDirection;
  partyName: string;
  amount: number;
  chequeNumber: string;
  bankName: string;
  issueDate: string | null;
  dueDate: string | null;
  status: ChequeStatus;
  notes: string;
  createdAt: string;
}

interface ChequesSummary {
  total: number;
  byStatus: Record<ChequeStatus, number>;
  incomingPendingAmount: number;
  outgoingPendingAmount: number;
}

interface ChequesResponse {
  cheques: Cheque[];
  summary: ChequesSummary;
}

interface ChequeStatusUpdateResponse {
  success: boolean;
  cheque: Cheque | null;
  accountAdjusted: { id: string; name: string; delta: number } | null;
}

const CHEQUES_PATH = '/api/commerce/cheques';

/**
 * Mirrors the TRANSITIONS map in src/app/api/commerce/cheques/[id]/route.ts —
 * the action sheet only ever offers transitions the backend accepts.
 * (CLEARED → BOUNCED reverses the credit; PENDING reverts it; CANCELLED
 * cheques can only be reopened.)
 */
const STATUS_TRANSITIONS: Record<ChequeStatus, readonly ChequeStatus[]> = {
  PENDING: ['CLEARED', 'BOUNCED', 'CANCELLED'],
  CLEARED: ['BOUNCED', 'PENDING'],
  BOUNCED: ['CLEARED', 'PENDING', 'CANCELLED'],
  CANCELLED: ['PENDING'],
};

const TRANSITION_OPTIONS: Record<
  ChequeStatus,
  { label: string; icon: keyof typeof MaterialIcons.glyphMap; destructive: boolean }
> = {
  PENDING: { label: 'Mark Pending', icon: 'schedule', destructive: false },
  CLEARED: { label: 'Mark Cleared', icon: 'check-circle', destructive: false },
  BOUNCED: { label: 'Mark Bounced', icon: 'error-outline', destructive: true },
  CANCELLED: { label: 'Cancel Cheque', icon: 'block', destructive: true },
};

const PAST_TENSE: Record<ChequeStatus, string> = {
  PENDING: 'marked pending',
  CLEARED: 'marked cleared',
  BOUNCED: 'marked bounced',
  CANCELLED: 'cancelled',
};

const STATUS_META: Record<
  ChequeStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: { label: 'Pending', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  CLEARED: { label: 'Cleared', color: '#047857', bg: '#d1fae5', border: '#a7f3d0' },
  BOUNCED: { label: 'Bounced', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  CANCELLED: { label: 'Cancelled', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
};

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'BOUNCED', label: 'Bounced' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const DIRECTION_FILTERS: Array<{ value: DirectionFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'INCOMING', label: 'Incoming' },
  { value: 'OUTGOING', label: 'Outgoing' },
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** en-IN grouped rupee format: '₹ 1,23,456.78' (negatives render as '-₹ 1,234.00'). */
function formatMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  const grouped = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  return `${sign}₹ ${grouped}`;
}

/** 'DD MMM YYYY' from an ISO date string; '—' when missing/invalid. */
function formatDateDMY(value: string | null | undefined): string {
  if (!value) return '—';
  // Server stores date-only inputs as UTC-midnight timestamps — read the
  // calendar parts straight off the string to avoid timezone day-shifts.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    const monthIndex = Number(iso[2]);
    if (monthIndex >= 1 && monthIndex <= 12) {
      return `${iso[3]} ${MONTHS_SHORT[monthIndex - 1]} ${iso[1]}`;
    }
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Strict YYYY-MM-DD calendar validation (no native date picker dependency). */
function isValidYmd(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function statusCount(summary: ChequesSummary, status: ChequeStatus): number {
  return Number(summary?.byStatus?.[status] ?? 0);
}

export default function ChequesScreen() {
  const router = useRouter();

  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [summary, setSummary] = useState<ChequesSummary>({
    total: 0,
    byStatus: { PENDING: 0, CLEARED: 0, BOUNCED: 0, CANCELLED: 0 },
    incomingPendingAmount: 0,
    outgoingPendingAmount: 0,
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionCheque, setActionCheque] = useState<Cheque | null>(null);

  // Add-cheque modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState<ChequeDirection>('INCOMING');
  const [partyName, setPartyName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  /**
   * Status chips refetch with ?status= (backend-side filtering). When a status
   * filter is active the GET response's summary is computed over the filtered
   * set only, so the unfiltered register is fetched in parallel to keep chip
   * counts and the To Receive / To Pay tiles showing true totals.
   */
  const fetchCheques = useCallback(async (status: StatusFilter) => {
    try {
      if (status === 'ALL') {
        const data = await apiRequest<ChequesResponse>(CHEQUES_PATH);
        setCheques(data.cheques || []);
        if (data.summary) setSummary(data.summary);
      } else {
        const [filtered, unfiltered] = await Promise.all([
          apiRequest<ChequesResponse>(CHEQUES_PATH, { params: { status } }),
          apiRequest<ChequesResponse>(CHEQUES_PATH),
        ]);
        setCheques(filtered.cheques || []);
        if (unfiltered.summary) setSummary(unfiltered.summary);
      }
      setError(null);
    } catch (err: any) {
      // ApiError.message carries the server's error text (401/403/503 included).
      setError(err?.message || 'Unable to load cheques.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCheques(statusFilter);
  }, [fetchCheques, statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchCheques(statusFilter);
  }, [fetchCheques, statusFilter]);

  const visibleCheques = useMemo(
    () => cheques.filter((c) => directionFilter === 'ALL' || c.direction === directionFilter),
    [cheques, directionFilter],
  );

  const hasActiveFilters = statusFilter !== 'ALL' || directionFilter !== 'ALL';

  const closeSheet = () => {
    if (!updatingId) setActionCheque(null);
  };

  const handleUpdateStatus = async (cheque: Cheque, next: ChequeStatus) => {
    if (updatingId) return;
    setActionCheque(null);
    setUpdatingId(cheque.id);
    await hapticFeedback.light();
    try {
      const res = await apiRequest<ChequeStatusUpdateResponse>(
        `${CHEQUES_PATH}/${cheque.id}`,
        { method: 'PATCH', body: { status: next } },
      );
      await hapticFeedback.success();
      let message = `Cheque ${cheque.chequeNumber} ${PAST_TENSE[next]}.`;
      if (res?.accountAdjusted) {
        const delta = Number(res.accountAdjusted.delta) || 0;
        message += ` ${res.accountAdjusted.name}: ${delta > 0 ? '+' : ''}${formatMoney(delta)}.`;
      }
      Alert.alert('Cheque updated', message);
      void fetchCheques(statusFilter);
    } catch (err: any) {
      await hapticFeedback.error();
      Alert.alert('Unable to update', err?.message || 'Could not update the cheque. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openAddModal = () => {
    setDirection('INCOMING');
    setPartyName('');
    setChequeNumber('');
    setAmount('');
    setBankName('');
    setIssueDate('');
    setDueDate('');
    setNotes('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!submitting) setModalOpen(false);
  };

  const handleAddCheque = async () => {
    const party = partyName.trim();
    const number = chequeNumber.trim();
    const parsedAmount = Number(amount.trim());
    if (!party || !number) {
      Alert.alert('Missing details', 'Party name and cheque number are required.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a cheque amount greater than zero.');
      return;
    }
    const issue = issueDate.trim();
    const due = dueDate.trim();
    if (issue && !isValidYmd(issue)) {
      Alert.alert('Invalid date', 'Issue date must be a valid date in YYYY-MM-DD format.');
      return;
    }
    if (due && !isValidYmd(due)) {
      Alert.alert('Invalid date', 'Due date must be a valid date in YYYY-MM-DD format.');
      return;
    }

    setSubmitting(true);
    await hapticFeedback.medium();
    try {
      await apiRequest(CHEQUES_PATH, {
        method: 'POST',
        body: {
          direction,
          partyName: party,
          chequeNumber: number,
          amount: parsedAmount,
          bankName: bankName.trim(),
          issueDate: issue,
          dueDate: due,
          notes: notes.trim(),
        },
      });
      await hapticFeedback.success();
      setModalOpen(false);
      setDirection('INCOMING');
      setPartyName('');
      setChequeNumber('');
      setAmount('');
      setBankName('');
      setIssueDate('');
      setDueDate('');
      setNotes('');
      Alert.alert('Cheque added', `Cheque ${number} recorded as pending.`);
      void fetchCheques(statusFilter);
    } catch (err: any) {
      await hapticFeedback.error();
      Alert.alert('Unable to save', err?.message || 'Could not save the cheque. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = ({ item }: { item: Cheque }) => {
    const incoming = item.direction === 'INCOMING';
    const meta = STATUS_META[item.status] || STATUS_META.PENDING;
    const updating = updatingId === item.id;
    return (
      <View style={styles.chequeCard}>
        <TouchableOpacity
          style={styles.chequeRow}
          activeOpacity={0.75}
          onLongPress={() => {
            void hapticFeedback.light();
            setActionCheque(item);
          }}
          delayLongPress={350}
          accessibilityLabel={`Cheque ${item.chequeNumber}, ${item.partyName}, ${formatMoney(item.amount)}, ${meta.label}`}
        >
          <View style={[styles.dirIconWrap, incoming ? styles.dirIncoming : styles.dirOutgoing]}>
            <MaterialIcons
              name={incoming ? 'arrow-downward' : 'arrow-upward'}
              size={16}
              color={incoming ? '#059669' : '#dc2626'}
            />
          </View>
          <View style={styles.chequeMain}>
            <Text style={styles.partyName} numberOfLines={1}>
              {item.partyName}
            </Text>
            <Text style={styles.chequeSub} numberOfLines={1}>
              #{item.chequeNumber} • {item.bankName || '—'}
            </Text>
            <Text style={styles.chequeSub} numberOfLines={1}>
              Due {formatDateDMY(item.dueDate)}
            </Text>
            {item.notes ? (
              <Text style={styles.chequeNotes} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>
          <View style={styles.chequeRight}>
            <Text
              style={styles.amountText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {formatMoney(item.amount)}
            </Text>
            <View style={[styles.statusChip, { backgroundColor: meta.bg, borderColor: meta.border }]}>
              <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.moreWrap}>
          {updating ? (
            <View style={styles.moreBtn}>
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => {
                void hapticFeedback.light();
                setActionCheque(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={`More options for cheque ${item.chequeNumber}`}
            >
              <MaterialIcons name="more-horiz" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const listHeader = (
    <View>
      {/* Summary tiles */}
      <View style={styles.tileRow}>
        <View style={[styles.tile, styles.tileReceive]}>
          <View style={styles.tileLabelRow}>
            <MaterialIcons name="call-received" size={13} color="#059669" />
            <Text style={styles.tileLabelReceive}>To Receive</Text>
          </View>
          <Text
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {loading || error ? '—' : formatMoney(summary.incomingPendingAmount)}
          </Text>
          <Text style={styles.tileSub}>Pending incoming cheques</Text>
        </View>
        <View style={[styles.tile, styles.tilePay]}>
          <View style={styles.tileLabelRow}>
            <MaterialIcons name="call-made" size={13} color="#dc2626" />
            <Text style={styles.tileLabelPay}>To Pay</Text>
          </View>
          <Text
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {loading || error ? '—' : formatMoney(summary.outgoingPendingAmount)}
          </Text>
          <Text style={styles.tileSub}>Pending issued cheques</Text>
        </View>
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          const count = f.value === 'ALL' ? summary.total : statusCount(summary, f.value as ChequeStatus);
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => {
                void hapticFeedback.light();
                setStatusFilter(f.value);
              }}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              <View style={[styles.chipCount, active && styles.chipCountActive]}>
                <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Direction toggle (client-side filter) */}
      <View style={styles.segmentRow}>
        {DIRECTION_FILTERS.map((f) => {
          const active = directionFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => {
                void hapticFeedback.light();
                setDirectionFilter(f.value);
              }}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const errorBlock = (
    <View style={styles.stateBox}>
      <MaterialIcons name="error-outline" size={44} color="#f87171" />
      <Text style={[styles.stateTitle, { color: '#f87171' }]}>{error}</Text>
      <Text style={styles.stateSub}>Please check your connection and try again.</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={onRefresh}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const emptyBlock = (
    <View style={styles.stateBox}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="receipt-long" size={28} color="#94a3b8" />
      </View>
      <Text style={styles.stateTitle}>{hasActiveFilters ? 'No cheques in this view' : 'No cheques to show'}</Text>
      <Text style={styles.stateSub}>
        {hasActiveFilters
          ? 'Try a different status or direction filter.'
          : "You haven't added any cheque transactions yet."}
      </Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={openAddModal}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add cheque"
      >
        <MaterialIcons name="add" size={18} color="#ffffff" />
        <Text style={styles.emptyCtaText}>Add Cheque</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActionSheet = () => {
    if (!actionCheque) return null;
    const cheque = actionCheque;
    const meta = STATUS_META[cheque.status] || STATUS_META.PENDING;
    const transitions = STATUS_TRANSITIONS[cheque.status] || [];
    return (
      <View style={styles.sheetCard}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.sheetCardInner}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Update cheque</Text>
              <View
                style={[styles.statusChip, { backgroundColor: meta.bg, borderColor: meta.border }]}
              >
                <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <Text style={styles.sheetSubtitle} numberOfLines={1}>
              #{cheque.chequeNumber} • {cheque.partyName} • {formatMoney(cheque.amount)}
            </Text>
          </View>
          {transitions.map((next) => {
            const opt = TRANSITION_OPTIONS[next];
            return (
              <TouchableOpacity
                key={next}
                style={styles.sheetOption}
                onPress={() => void handleUpdateStatus(cheque, next)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={18}
                  color={opt.destructive ? '#dc2626' : '#059669'}
                />
                <Text style={[styles.sheetOptionText, opt.destructive && styles.sheetOptionTextDanger]}>
                  {opt.label}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.sheetCancel}
            onPress={closeSheet}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Cheque Details</Text>
            <Text style={styles.subtitle}>Track received & issued cheques</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.iconBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <MaterialIcons name="refresh" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading cheques...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleCheques}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={error ? errorBlock : emptyBlock}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
        />
      )}

      {/* Floating primary CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.fab}
          onPress={openAddModal}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add cheque"
        >
          <MaterialIcons name="add" size={18} color="#ffffff" />
          <Text style={styles.fabText}>Add Cheque</Text>
        </TouchableOpacity>
      </View>

      {/* Status-change action sheet */}
      <Modal visible={actionCheque !== null} transparent animationType="slide" onRequestClose={closeSheet}>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.sheetOverlay}>{renderActionSheet()}</View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add Cheque modal (bottom sheet) */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Cheque</Text>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <Text style={styles.inputLabel}>Direction *</Text>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  onPress={() => setDirection('INCOMING')}
                  style={[
                    styles.segmentBtn,
                    styles.segmentBtnModal,
                    direction === 'INCOMING' && styles.segmentBtnActive,
                  ]}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ selected: direction === 'INCOMING' }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      direction === 'INCOMING' && styles.segmentTextActive,
                    ]}
                  >
                    Received
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDirection('OUTGOING')}
                  style={[
                    styles.segmentBtn,
                    styles.segmentBtnModal,
                    direction === 'OUTGOING' && styles.segmentBtnActive,
                  ]}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ selected: direction === 'OUTGOING' }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      direction === 'OUTGOING' && styles.segmentTextActive,
                    ]}
                  >
                    Issued
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Party Name *</Text>
              <TextInput
                value={partyName}
                onChangeText={setPartyName}
                style={styles.modalInput}
                placeholder="e.g. Sharma Traders"
                placeholderTextColor="#94a3b8"
                maxLength={160}
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Cheque Number *</Text>
              <TextInput
                value={chequeNumber}
                onChangeText={(v) => setChequeNumber(v.replace(/\s+/g, ''))}
                style={styles.modalInput}
                placeholder="e.g. 100234"
                placeholderTextColor="#94a3b8"
                maxLength={40}
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Amount *</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                style={styles.modalInput}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                style={styles.modalInput}
                placeholder="e.g. HDFC Bank"
                placeholderTextColor="#94a3b8"
                maxLength={120}
                editable={!submitting}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.inputLabel}>Issue Date</Text>
                  <TextInput
                    value={issueDate}
                    onChangeText={(v) => setIssueDate(v.trim())}
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.inputLabel}>Due Date</Text>
                  <TextInput
                    value={dueDate}
                    onChangeText={(v) => setDueDate(v.trim())}
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    editable={!submitting}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                style={[styles.modalInput, styles.notesInput]}
                placeholder="Optional note"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
                editable={!submitting}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddCheque}
                disabled={submitting}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Save cheque"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Add Cheque</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
    flexGrow: 1,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    minWidth: 0,
  },
  tileReceive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  tilePay: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  tileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileLabelReceive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tileLabelPay: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b91c1c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  tileSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  chipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCountActive: {
    backgroundColor: '#059669',
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  chipCountTextActive: {
    color: '#ffffff',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  segmentBtnModal: {
    minHeight: 44,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#059669',
  },
  chequeCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chequeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    padding: 14,
  },
  dirIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirIncoming: {
    backgroundColor: '#d1fae5',
  },
  dirOutgoing: {
    backgroundColor: '#fee2e2',
  },
  chequeMain: {
    flex: 1,
    minWidth: 0,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  chequeSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  chequeNotes: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 14,
  },
  chequeRight: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 110,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  moreWrap: {
    justifyContent: 'center',
    paddingRight: 6,
  },
  moreBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  emptyCta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  emptyCtaText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  sheetCardInner: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 8,
    paddingBottom: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginTop: 6,
    marginBottom: 8,
  },
  sheetHeader: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  sheetSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sheetOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetOptionTextDanger: {
    color: '#dc2626',
  },
  sheetCancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 4,
  },
  sheetCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 14,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 44,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateField: {
    flex: 1,
  },
  notesInput: {
    minHeight: 76,
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
