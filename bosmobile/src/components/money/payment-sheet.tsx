import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiRequest, ApiError } from '@/lib/api';

/**
 * Record-partial-payment bottom sheet (Vyapar "Received" flow).
 * Posts to `/api/commerce/invoices/:id/payments` and surfaces the server's
 * error message inline (no Alert crash). Pure local state otherwise.
 */
export interface PaymentSheetInvoice {
  id: string;
  number: string;
  balance: number;
  currencySymbol: string;
}

export interface PaymentSheetProps {
  visible: boolean;
  onClose(): void;
  invoice: PaymentSheetInvoice | null;
  onRecorded(summary: { paid: number; balance: number; status: string }): void;
}

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CHEQUE'
  | 'OTHER';

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

interface PaymentResponse {
  summary: {
    paid: number;
    balance: number;
    status: string;
  };
}

/** Group thousands (western grouping), keep at most 2 decimals: 1234567.5 -> "1,234,567.5". */
function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
  const dot = fixed.indexOf('.');
  const intPart = dot === -1 ? fixed : fixed.slice(0, dot);
  const decPart = dot === -1 ? '' : fixed.slice(dot);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}${decPart}`;
}

function formatMoney(balance: number, symbol: string): string {
  return `${symbol}${formatNumber(balance)}`;
}

export function PaymentSheet(props: PaymentSheetProps) {
  const { visible, onClose, invoice, onRecorded } = props;

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setMethod('CASH');
    setReference('');
    setNotes('');
    setError(null);
    setPending(false);
  }, [visible, invoice]);

  if (!invoice) return null;

  const parsedAmount = Number.parseFloat(amount);
  const hasAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const withinBalance = hasAmount && parsedAmount <= invoice.balance + 0.01;
  const canSubmit = hasAmount && withinBalance && !pending;

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setAmount(normalized);
    setError(null);
  };

  const handleFull = () => {
    setAmount(String(invoice.balance));
    setError(null);
  };

  const submit = async () => {
    if (!invoice || pending) return;
    if (!hasAmount) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!withinBalance) {
      setError(`Amount exceeds the balance due (${formatMoney(invoice.balance, invoice.currencySymbol)}).`);
      return;
    }

    setPending(true);
    setError(null);
    const body: Record<string, unknown> = {
      amount: parsedAmount,
      method,
    };
    if (reference.trim()) body.reference = reference.trim();
    if (notes.trim()) body.notes = notes.trim();

    try {
      const res = await apiRequest<PaymentResponse>(`/api/commerce/invoices/${invoice.id}/payments`, {
        method: 'POST',
        body,
      });
      onRecorded(res.summary);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Could not record the payment. Please try again.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!pending) onClose(); }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              Record Payment — Invoice #{invoice.number}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text style={styles.balanceDue}>
              Balance due {formatMoney(invoice.balance, invoice.currencySymbol)}
            </Text>

            <Text style={styles.inputLabel}>Amount Received</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#94a3b8"
                accessibilityLabel="Amount received"
              />
              <TouchableOpacity
                onPress={handleFull}
                style={styles.fullBtn}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Fill full balance"
              >
                <Text style={styles.fullBtnText}>Full</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((option) => {
                const selected = option.value === method;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setMethod(option.value)}
                    style={[styles.methodBtn, selected && styles.methodBtnActive]}
                    hitSlop={{ top: 2, bottom: 2 }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.methodText, selected && styles.methodTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Reference</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="UTR / cheque no. (optional)"
              placeholderTextColor="#94a3b8"
              maxLength={200}
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional note"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              style={[styles.submitBtn, (!canSubmit || pending) && styles.submitBtnDisabled]}
            >
              {pending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                  Record {invoice.currencySymbol}
                  {hasAmount ? formatNumber(parsedAmount) : '0'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginRight: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  body: {
    paddingTop: 12,
  },
  balanceDue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    minHeight: 48,
  },
  fullBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  methodBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  methodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  methodTextActive: {
    color: '#059669',
  },
  input: {
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
  notesInput: {
    height: 64,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
    lineHeight: 17,
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  submitBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  submitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  submitTextDisabled: {
    color: '#94a3b8',
  },
});
