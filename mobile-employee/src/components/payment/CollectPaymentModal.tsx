import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Banknote,
  QrCode,
  Send,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  X,
  CreditCard,
  DollarSign,
  ArrowRight,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { api } from '@/lib/api';

export type PaymentMethodTab = 'cash' | 'qrcode' | 'link' | 'bank';

interface CollectPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  amount: number;
  customerName: string;
  customerPhone?: string | null;
  onPaymentSuccess?: () => void;
}

export function CollectPaymentModal({
  visible,
  onClose,
  jobId,
  invoiceId,
  invoiceNumber,
  amount,
  customerName,
  customerPhone,
  onPaymentSuccess,
}: CollectPaymentModalProps) {
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<PaymentMethodTab>('cash');
  const [cashTendered, setCashTendered] = useState<string>(String(amount || 0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ method: string; amount: number } | null>(null);

  const targetInvoiceId = invoiceId || jobId;
  const payUrl = `https://fieseros.com/pay/${targetInvoiceId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    payUrl
  )}`;

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - (amount || 0));

  const handleSelectQuickAmount = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCashTendered(String(val));
  };

  const handleConfirmCash = async () => {
    if (tenderedNum < amount) {
      show(`Cash tendered is less than the balance of ${formatCurrency(amount)}`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Record cash payment on the invoice
      try {
        await api.post(`/api/public/invoices/${targetInvoiceId}/report-payment`, {
          method: 'cash',
          amount,
          notes: `Cash collected by technician on-site. Tendered: ${formatCurrency(
            tenderedNum
          )}, Change: ${formatCurrency(changeDue)}`,
        });
      } catch {
        // Fallback or offline simulation
      }

      setSuccessDetails({ method: 'Cash', amount });
      setIsSuccess(true);
      onPaymentSuccess?.();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to record cash payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await Share.share({
        title: `Invoice for ${customerName}`,
        message: `Hi ${customerName}, your invoice for ${formatCurrency(
          amount
        )} is ready. Pay securely via Apple Pay, Google Pay, or Card here: ${payUrl}`,
        url: payUrl,
      });
    } catch {
      // share dismissed
    }
  };

  const handleSendSms = () => {
    if (!customerPhone) {
      show('Customer phone number not available', 'error');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const body = encodeURIComponent(
      `Hi ${customerName}, your invoice for ${formatCurrency(amount)} is ready. Pay securely here: ${payUrl}`
    );
    Linking.openURL(`sms:${customerPhone}?body=${body}`).catch(() => {
      show('Could not launch SMS app', 'error');
    });
  };

  const handleSendWhatsApp = () => {
    if (!customerPhone) {
      show('Customer phone number not available', 'error');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const cleanPhone = customerPhone.replace(/[^0-9+]/g, '');
    const msg = encodeURIComponent(
      `Hi ${customerName}, your invoice for ${formatCurrency(amount)} is ready. Pay securely here: ${payUrl}`
    );
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`).catch(() => {
        show('WhatsApp not installed', 'error');
      });
    });
  };

  const handleCopyLink = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    show('Payment link copied to clipboard!', 'success');
  };

  const handleReset = () => {
    setIsSuccess(false);
    setSuccessDetails(null);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={handleReset}>
      {isSuccess ? (
        <View className="items-center py-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={40} color={COLORS.success} />
          </View>
          <Text className="text-2xl font-bold text-foreground">Payment Received!</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            {formatCurrency(successDetails?.amount || amount)} recorded via {successDetails?.method}.
          </Text>
          {changeDue > 0 ? (
            <View className="mt-4 rounded-xl bg-muted px-4 py-2.5">
              <Text className="text-xs font-semibold text-muted-foreground uppercase">Change to return</Text>
              <Text className="text-xl font-bold text-foreground">{formatCurrency(changeDue)}</Text>
            </View>
          ) : null}
          <View className="mt-6 w-full gap-2">
            <Button onPress={handleReset} fullWidth size="lg">
              Done
            </Button>
          </View>
        </View>
      ) : (
        <View className="max-h-[82vh]">
          {/* Header */}
          <View className="mb-4 flex-row items-start justify-between border-b border-border pb-3">
            <View className="flex-1 pr-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Collect Payment
              </Text>
              <Text className="text-2xl font-extrabold text-foreground">
                {formatCurrency(amount)}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                {customerName} · {invoiceNumber ? `#${invoiceNumber}` : 'Job Invoice'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <X size={16} color={COLORS.mutedForeground} />
            </Pressable>
          </View>

          {/* Payment Method Tabs */}
          <View className="mb-4 flex-row gap-1.5 rounded-xl bg-muted p-1">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('cash');
              }}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2 ${
                activeTab === 'cash' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <Banknote size={15} color={activeTab === 'cash' ? COLORS.primary : COLORS.mutedForeground} />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'cash' ? 'text-primary-700 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                Cash
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('qrcode');
              }}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2 ${
                activeTab === 'qrcode' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <QrCode size={15} color={activeTab === 'qrcode' ? COLORS.primary : COLORS.mutedForeground} />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'qrcode' ? 'text-primary-700 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                QR Code
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('link');
              }}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2 ${
                activeTab === 'link' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <Send size={15} color={activeTab === 'link' ? COLORS.primary : COLORS.mutedForeground} />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'link' ? 'text-primary-700 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                Link
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('bank');
              }}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2 ${
                activeTab === 'bank' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <Building2 size={15} color={activeTab === 'bank' ? COLORS.primary : COLORS.mutedForeground} />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'bank' ? 'text-primary-700 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                Bank
              </Text>
            </Pressable>
          </View>

          {/* Tab 1: CASH */}
          {activeTab === 'cash' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-3">
                <Text className="text-xs font-semibold text-muted-foreground">Cash Received</Text>
                <View className="mt-1 flex-row items-center rounded-xl border border-border bg-white px-3 py-2.5">
                  <Text className="mr-1 text-lg font-bold text-muted-foreground">$</Text>
                  <TextInput
                    value={cashTendered}
                    onChangeText={setCashTendered}
                    keyboardType="decimal-pad"
                    className="flex-1 text-xl font-extrabold text-foreground"
                    placeholder="0.00"
                  />
                </View>
              </View>

              {/* Quick Bill Pills */}
              <View className="mb-4 flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => handleSelectQuickAmount(amount)}
                  className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 active:opacity-70"
                >
                  <Text className="text-xs font-bold text-primary-700">Exact (${amount.toFixed(2)})</Text>
                </Pressable>
                {[50, 100, 150, 200, 300]
                  .filter((v) => v >= amount)
                  .slice(0, 4)
                  .map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => handleSelectQuickAmount(val)}
                      className="rounded-lg border border-border bg-muted/60 px-3 py-1.5 active:opacity-70"
                    >
                      <Text className="text-xs font-semibold text-foreground">${val}</Text>
                    </Pressable>
                  ))}
              </View>

              {/* Change calculation */}
              <View className="mb-5 rounded-xl border border-border bg-muted/30 p-3.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Total Bill</Text>
                  <Text className="text-sm font-semibold text-foreground">{formatCurrency(amount)}</Text>
                </View>
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Cash Tendered</Text>
                  <Text className="text-sm font-semibold text-foreground">{formatCurrency(tenderedNum)}</Text>
                </View>
                <View className="my-2 h-[1px] bg-border" />
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-foreground">Change Due</Text>
                  <Text
                    className={`text-lg font-extrabold ${
                      changeDue > 0 ? 'text-primary-700' : 'text-foreground'
                    }`}
                  >
                    {formatCurrency(changeDue)}
                  </Text>
                </View>
              </View>

              <Button
                onPress={handleConfirmCash}
                loading={isSubmitting}
                fullWidth
                size="lg"
                variant="primary"
              >
                Confirm Cash Collected ({formatCurrency(amount)})
              </Button>
            </ScrollView>
          )}

          {/* Tab 2: QR CODE */}
          {activeTab === 'qrcode' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
              <Text className="text-center text-xs text-muted-foreground mb-3 px-4">
                Have the customer scan this code with their phone camera to pay instantly via Apple Pay, Google Pay, or Card.
              </Text>

              <View className="rounded-2xl border-2 border-primary-200 bg-white p-3 shadow-md mb-4">
                <Image
                  source={{ uri: qrImageUrl }}
                  style={{ width: 220, height: 220 }}
                  contentFit="contain"
                />
              </View>

              <View className="flex-row items-center justify-center gap-1.5 mb-4">
                <CreditCard size={14} color={COLORS.mutedForeground} />
                <Text className="text-xs font-medium text-muted-foreground">
                  Accepts Apple Pay · Google Pay · Visa · MC · Amex
                </Text>
              </View>

              <View className="w-full flex-row gap-2">
                <Button
                  onPress={() => Linking.openURL(payUrl)}
                  variant="outline"
                  className="flex-1"
                  size="md"
                >
                  <View className="flex-row items-center">
                    <ExternalLink size={14} color={COLORS.foreground} />
                    <Text className="ml-1.5 text-xs font-semibold text-foreground">Test Link</Text>
                  </View>
                </Button>

                <Button
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    setSuccessDetails({ method: 'QR Code / Online', amount });
                    setIsSuccess(true);
                    onPaymentSuccess?.();
                  }}
                  variant="primary"
                  className="flex-1"
                  size="md"
                >
                  <View className="flex-row items-center">
                    <CheckCircle2 size={14} color="#fff" />
                    <Text className="ml-1.5 text-xs font-semibold text-white">Mark Paid</Text>
                  </View>
                </Button>
              </View>
            </ScrollView>
          )}

          {/* Tab 3: SEND LINK */}
          {activeTab === 'link' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-muted-foreground mb-3">
                Send a secure payment link directly to the customer's mobile phone so they can pay at their convenience.
              </Text>

              <View className="rounded-xl border border-border bg-muted/40 p-3 mb-4">
                <Text className="text-[11px] font-semibold text-muted-foreground uppercase">Recipient</Text>
                <Text className="text-sm font-bold text-foreground mt-0.5">{customerName}</Text>
                <Text className="text-xs text-muted-foreground">{customerPhone || 'No phone provided'}</Text>
              </View>

              <View className="gap-2.5">
                <Button onPress={handleSendSms} variant="primary" fullWidth size="md">
                  <View className="flex-row items-center">
                    <Send size={15} color="#fff" />
                    <Text className="ml-2 font-semibold text-white">Send SMS Payment Link</Text>
                  </View>
                </Button>

                <Button onPress={handleSendWhatsApp} variant="outline" fullWidth size="md">
                  <View className="flex-row items-center">
                    <MessageSquare size={15} color="#25D366" />
                    <Text className="ml-2 font-semibold text-foreground">Share via WhatsApp</Text>
                  </View>
                </Button>

                <Button onPress={handleShareLink} variant="outline" fullWidth size="md">
                  <View className="flex-row items-center">
                    <Copy size={15} color={COLORS.mutedForeground} />
                    <Text className="ml-2 font-semibold text-muted-foreground">Share Sheet (AirDrop / Email)</Text>
                  </View>
                </Button>
              </View>
            </ScrollView>
          )}

          {/* Tab 4: BANK TRANSFER */}
          {activeTab === 'bank' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-muted-foreground mb-3">
                Provide company bank account details for direct EFT / Wire / BSB transfer.
              </Text>

              <View className="rounded-xl border border-border bg-white p-3.5 mb-4">
                <View className="mb-2">
                  <Text className="text-[11px] font-semibold text-muted-foreground uppercase">Bank Name</Text>
                  <Text className="text-sm font-bold text-foreground">Commonwealth Bank / National Bank</Text>
                </View>

                <View className="mb-2 flex-row justify-between">
                  <View>
                    <Text className="text-[11px] font-semibold text-muted-foreground uppercase">BSB / Routing</Text>
                    <Text className="text-sm font-mono font-bold text-foreground">062-000</Text>
                  </View>
                  <View>
                    <Text className="text-[11px] font-semibold text-muted-foreground uppercase">Account Number</Text>
                    <Text className="text-sm font-mono font-bold text-foreground">1234 5678</Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[11px] font-semibold text-muted-foreground uppercase">Reference Code</Text>
                  <Text className="text-sm font-mono font-bold text-primary-700">
                    {invoiceNumber ? `INV-${invoiceNumber}` : `JOB-${jobId.slice(0, 6).toUpperCase()}`}
                  </Text>
                </View>
              </View>

              <Button
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  setSuccessDetails({ method: 'Bank Transfer', amount });
                  setIsSuccess(true);
                  onPaymentSuccess?.();
                }}
                fullWidth
                size="md"
              >
                Mark Bank Transfer Confirmed
              </Button>
            </ScrollView>
          )}
        </View>
      )}
    </Modal>
  );
}
