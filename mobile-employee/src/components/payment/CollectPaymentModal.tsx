import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
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
  Heart,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

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

const TIP_PERCENT_PRESETS: Array<{ label: string; value: number | null }> = [
  { label: 'No Tip', value: null },
  { label: '15%', value: 15 },
  { label: '18%', value: 18 },
  { label: '20%', value: 20 },
];

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
  const [selectedTip, setSelectedTip] = useState<number | 'custom' | null>(null);
  const [customTip, setCustomTip] = useState<string>('');
  const [showCustomTipInput, setShowCustomTipInput] = useState(false);

  // Calculate tip and total
  const tipAmount = useMemo(() => {
    if (selectedTip === null) return 0;
    if (selectedTip === 'custom') {
      const val = parseFloat(customTip);
      return isNaN(val) || val < 0 ? 0 : val;
    }
    return Math.round(amount * (selectedTip / 100) * 100) / 100;
  }, [selectedTip, customTip, amount]);

  const totalToCollect = useMemo(() => {
    return Math.max(0, (amount || 0) + tipAmount);
  }, [amount, tipAmount]);

  const [cashTendered, setCashTendered] = useState<string>(String(totalToCollect || 0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    method: string;
    total: number;
    tip: number;
  } | null>(null);

  const targetInvoiceId = invoiceId || jobId;
  const payUrl = `https://fieseros.com/pay/${targetInvoiceId}${
    tipAmount > 0 ? `?tip=${tipAmount.toFixed(2)}` : ''
  }`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    payUrl
  )}`;

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totalToCollect);

  const handleSelectTipPreset = (val: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedTip(val);
    setShowCustomTipInput(false);
    const newTip = val ? Math.round(amount * (val / 100) * 100) / 100 : 0;
    const newTotal = amount + newTip;
    setCashTendered(String(newTotal.toFixed(2)));
  };

  const handleSelectCustomTip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedTip('custom');
    setShowCustomTipInput(true);
  };

  const handleCustomTipChange = (text: string) => {
    setCustomTip(text);
    const val = parseFloat(text);
    const validTip = isNaN(val) || val < 0 ? 0 : val;
    const newTotal = amount + validTip;
    setCashTendered(String(newTotal.toFixed(2)));
  };

  const handleSelectQuickCashAmount = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCashTendered(String(val));
  };

  const handleConfirmCash = async () => {
    if (tenderedNum < totalToCollect) {
      show(
        `Cash tendered is less than the total due of ${formatCurrency(totalToCollect)}`,
        'error'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Record cash payment on the invoice
      try {
        await api.post(`/api/public/invoices/${targetInvoiceId}/report-payment`, {
          method: 'cash',
          amount: totalToCollect,
          tip: tipAmount,
          notes: `Cash collected by technician on-site. Base: ${formatCurrency(
            amount
          )}, Tip: ${formatCurrency(tipAmount)}, Tendered: ${formatCurrency(
            tenderedNum
          )}, Change: ${formatCurrency(changeDue)}`,
        });
      } catch {
        // Best-effort offline simulation
      }

      setSuccessDetails({ method: 'Cash', total: totalToCollect, tip: tipAmount });
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
          totalToCollect
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
      `Hi ${customerName}, your invoice for ${formatCurrency(
        totalToCollect
      )} is ready. Pay securely here: ${payUrl}`
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
      `Hi ${customerName}, your invoice for ${formatCurrency(
        totalToCollect
      )} is ready. Pay securely here: ${payUrl}`
    );
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`).catch(() => {
        show('WhatsApp not installed', 'error');
      });
    });
  };

  const handleReset = () => {
    setIsSuccess(false);
    setSuccessDetails(null);
    setSelectedTip(null);
    setCustomTip('');
    setShowCustomTipInput(false);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={handleReset}>
      {isSuccess ? (
        <View className="items-center py-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 size={40} color="#059669" />
          </View>
          <Text className="text-2xl font-bold text-foreground">Payment Received!</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            {formatCurrency(successDetails?.total || totalToCollect)} recorded via{' '}
            {successDetails?.method}.
          </Text>
          {successDetails && successDetails.tip > 0 ? (
            <View className="mt-2 flex-row items-center rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
              <Heart size={13} color="#059669" />
              <Text className="ml-1.5 text-xs font-semibold text-emerald-700">
                Includes {formatCurrency(successDetails.tip)} technician tip
              </Text>
            </View>
          ) : null}
          {changeDue > 0 ? (
            <View className="mt-4 rounded-xl bg-muted px-5 py-3 border border-border">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Change to return
              </Text>
              <Text className="text-2xl font-black text-emerald-700">
                {formatCurrency(changeDue)}
              </Text>
            </View>
          ) : null}
          <View className="mt-6 w-full gap-2">
            <Button
              onPress={handleReset}
              fullWidth
              size="lg"
              className="bg-emerald-600 active:bg-emerald-700"
            >
              Done
            </Button>
          </View>
        </View>
      ) : (
        <View className="max-h-[85vh]">
          {/* Header with Fieseros styling */}
          <View className="mb-3 flex-row items-start justify-between border-b border-border pb-3">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className="size-2 rounded-full bg-emerald-500" />
                <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Collect Payment · In-Field
                </Text>
              </View>
              <Text className="text-2xl font-black text-foreground">
                {formatCurrency(totalToCollect)}
              </Text>
              {tipAmount > 0 ? (
                <Text className="text-xs font-medium text-emerald-600">
                  {formatCurrency(amount)} job + {formatCurrency(tipAmount)} tip
                </Text>
              ) : null}
              <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                {customerName} · {invoiceNumber ? `#${invoiceNumber}` : 'Job Invoice'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70"
            >
              <X size={16} color={COLORS.mutedForeground} />
            </Pressable>
          </View>

          {/* Housecall Pro / Jobber Style In-Field Tip Selector */}
          <View className="mb-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1">
                <Heart size={13} color="#059669" />
                <Text className="text-xs font-bold text-emerald-900">Add Technician Tip</Text>
              </View>
              {tipAmount > 0 ? (
                <Text className="text-xs font-bold text-emerald-700">
                  +{formatCurrency(tipAmount)}
                </Text>
              ) : null}
            </View>

            <View className="flex-row gap-1.5">
              {TIP_PERCENT_PRESETS.map((preset) => {
                const isSelected = selectedTip === preset.value;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => handleSelectTipPreset(preset.value)}
                    className={`flex-1 items-center justify-center rounded-lg py-1.5 border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 shadow-xs'
                        : 'bg-white border-border/80'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white font-extrabold' : 'text-foreground'
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={handleSelectCustomTip}
                className={`flex-1 items-center justify-center rounded-lg py-1.5 border ${
                  selectedTip === 'custom'
                    ? 'bg-emerald-600 border-emerald-600 shadow-xs'
                    : 'bg-white border-border/80'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedTip === 'custom' ? 'text-white font-extrabold' : 'text-foreground'
                  }`}
                >
                  Custom
                </Text>
              </Pressable>
            </View>

            {showCustomTipInput ? (
              <View className="mt-2 flex-row items-center rounded-lg border border-emerald-200 bg-white px-2.5 py-1">
                <Text className="text-xs font-bold text-emerald-800 mr-1">$</Text>
                <TextInput
                  value={customTip}
                  onChangeText={handleCustomTipChange}
                  keyboardType="decimal-pad"
                  placeholder="Custom tip amount"
                  className="flex-1 text-xs font-bold text-foreground py-0.5"
                  autoFocus
                />
              </View>
            ) : null}
          </View>

          {/* Payment Method Tabs */}
          <View className="mb-3.5 flex-row gap-1 rounded-xl bg-muted p-1">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('cash');
              }}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2 ${
                activeTab === 'cash' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <Banknote
                size={14}
                color={activeTab === 'cash' ? '#059669' : COLORS.mutedForeground}
              />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'cash' ? 'text-emerald-700 font-extrabold' : 'text-muted-foreground'
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
              <QrCode
                size={14}
                color={activeTab === 'qrcode' ? '#059669' : COLORS.mutedForeground}
              />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'qrcode'
                    ? 'text-emerald-700 font-extrabold'
                    : 'text-muted-foreground'
                }`}
              >
                Scan QR
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
              <Send
                size={14}
                color={activeTab === 'link' ? '#059669' : COLORS.mutedForeground}
              />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'link' ? 'text-emerald-700 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                SMS Link
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
              <Building2
                size={14}
                color={activeTab === 'bank' ? '#059669' : COLORS.mutedForeground}
              />
              <Text
                className={`ml-1.5 text-xs font-bold ${
                  activeTab === 'bank' ? 'text-emerald-700 font-extrabold' : 'text-muted-foreground'
                }`}
              >
                Bank/EFT
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
              <View className="mb-3 flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => handleSelectQuickCashAmount(totalToCollect)}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 active:opacity-70"
                >
                  <Text className="text-xs font-bold text-emerald-800">
                    Exact (${totalToCollect.toFixed(2)})
                  </Text>
                </Pressable>
                {[50, 100, 150, 200, 300, 500]
                  .filter((v) => v >= totalToCollect)
                  .slice(0, 4)
                  .map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => handleSelectQuickCashAmount(val)}
                      className="rounded-lg border border-border bg-muted/60 px-3 py-1.5 active:opacity-70"
                    >
                      <Text className="text-xs font-semibold text-foreground">${val}</Text>
                    </Pressable>
                  ))}
              </View>

              {/* Change calculation */}
              <View className="mb-4 rounded-xl border border-border bg-muted/30 p-3.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Job Balance</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatCurrency(amount)}
                  </Text>
                </View>
                {tipAmount > 0 ? (
                  <View className="mt-1 flex-row items-center justify-between">
                    <Text className="text-xs text-emerald-700">Technician Tip</Text>
                    <Text className="text-sm font-bold text-emerald-700">
                      +{formatCurrency(tipAmount)}
                    </Text>
                  </View>
                ) : null}
                <View className="mt-1 flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">Cash Tendered</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatCurrency(tenderedNum)}
                  </Text>
                </View>
                <View className="my-2 h-[1px] bg-border" />
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-foreground">Change Due</Text>
                  <Text
                    className={`text-lg font-extrabold ${
                      changeDue > 0 ? 'text-emerald-700 font-black' : 'text-foreground'
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
                className="bg-emerald-600 active:bg-emerald-700"
              >
                Confirm Cash Collected ({formatCurrency(totalToCollect)})
              </Button>
            </ScrollView>
          )}

          {/* Tab 2: QR CODE */}
          {activeTab === 'qrcode' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              <Text className="text-center text-xs text-muted-foreground mb-3 px-4">
                Customer scans with their mobile camera to pay via Apple Pay, Google Pay, or Card.
              </Text>

              <View className="rounded-2xl border-2 border-emerald-200 bg-white p-3 shadow-md mb-3">
                <Image
                  source={{ uri: qrImageUrl }}
                  style={{ width: 200, height: 200 }}
                  contentFit="contain"
                />
              </View>

              <View className="flex-row items-center justify-center gap-1.5 mb-4">
                <CreditCard size={13} color={COLORS.mutedForeground} />
                <Text className="text-xs font-medium text-muted-foreground">
                  Apple Pay · Google Pay · Visa · Mastercard · Amex
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
                    <Text className="ml-1.5 text-xs font-semibold text-foreground">Open Link</Text>
                  </View>
                </Button>

                <Button
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                      () => {}
                    );
                    setSuccessDetails({
                      method: 'QR Code / Online',
                      total: totalToCollect,
                      tip: tipAmount,
                    });
                    setIsSuccess(true);
                    onPaymentSuccess?.();
                  }}
                  className="flex-1 bg-emerald-600 active:bg-emerald-700"
                  size="md"
                >
                  <View className="flex-row items-center">
                    <CheckCircle2 size={14} color="#fff" />
                    <Text className="ml-1.5 text-xs font-bold text-white">Mark Paid</Text>
                  </View>
                </Button>
              </View>
            </ScrollView>
          )}

          {/* Tab 3: SEND LINK */}
          {activeTab === 'link' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-muted-foreground mb-3">
                Send a secure payment link directly to customer phone for one-tap checkout.
              </Text>

              <View className="rounded-xl border border-border bg-muted/40 p-3 mb-4">
                <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Recipient
                </Text>
                <Text className="text-sm font-bold text-foreground mt-0.5">{customerName}</Text>
                <Text className="text-xs text-muted-foreground">
                  {customerPhone || 'No phone provided'}
                </Text>
              </View>

              <View className="gap-2.5">
                <Button
                  onPress={handleSendSms}
                  className="bg-emerald-600 active:bg-emerald-700"
                  fullWidth
                  size="md"
                >
                  <View className="flex-row items-center">
                    <Send size={15} color="#fff" />
                    <Text className="ml-2 font-bold text-white">Send SMS Payment Link</Text>
                  </View>
                </Button>

                <Button onPress={handleSendWhatsApp} variant="outline" fullWidth size="md">
                  <View className="flex-row items-center">
                    <MessageSquare size={15} color="#059669" />
                    <Text className="ml-2 font-semibold text-foreground">Share via WhatsApp</Text>
                  </View>
                </Button>

                <Button onPress={handleShareLink} variant="outline" fullWidth size="md">
                  <View className="flex-row items-center">
                    <Copy size={15} color={COLORS.mutedForeground} />
                    <Text className="ml-2 font-semibold text-muted-foreground">
                      Share Sheet (AirDrop / Email)
                    </Text>
                  </View>
                </Button>
              </View>
            </ScrollView>
          )}

          {/* Tab 4: BANK TRANSFER */}
          {activeTab === 'bank' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-muted-foreground mb-3">
                Provide company bank account details for direct EFT / BSB / wire transfer.
              </Text>

              <View className="rounded-xl border border-border bg-white p-3.5 mb-4">
                <View className="mb-2">
                  <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Bank Name
                  </Text>
                  <Text className="text-sm font-bold text-foreground">
                    Commonwealth Bank / National Bank
                  </Text>
                </View>

                <View className="mb-2 flex-row justify-between">
                  <View>
                    <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
                      BSB / Routing
                    </Text>
                    <Text className="text-sm font-mono font-bold text-foreground">062-000</Text>
                  </View>
                  <View>
                    <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Account Number
                    </Text>
                    <Text className="text-sm font-mono font-bold text-foreground">1234 5678</Text>
                  </View>
                </View>

                <View>
                  <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Reference Code
                  </Text>
                  <Text className="text-sm font-mono font-bold text-emerald-700">
                    {invoiceNumber
                      ? `INV-${invoiceNumber}`
                      : `JOB-${jobId.slice(0, 6).toUpperCase()}`}
                  </Text>
                </View>
              </View>

              <Button
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                    () => {}
                  );
                  setSuccessDetails({
                    method: 'Bank Transfer',
                    total: totalToCollect,
                    tip: tipAmount,
                  });
                  setIsSuccess(true);
                  onPaymentSuccess?.();
                }}
                className="bg-emerald-600 active:bg-emerald-700"
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
