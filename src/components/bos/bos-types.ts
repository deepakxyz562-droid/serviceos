export type BosProductItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp?: number;
  costPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  sku: string;
  barcode?: string;
  unit?: string;
  gstRate?: number;
  hsnCode?: string;
  brand?: string;
  location?: string;
  imageUrl?: string;
  description?: string;
  onlineVisible?: boolean;
  duration?: string;
  videoUrl?: string;
  portfolioUrl?: string;
  itemType?: 'product' | 'service';
  priceWithTax?: boolean;
  costPriceWithTax?: boolean;
  wholesalePrice?: number;
  minWholesaleQty?: number;
  sacCode?: string;
  isService?: boolean;
  serviceDuration?: string;
};

export type BosDocumentType =
  | 'tax_invoice'
  | 'quotation'
  | 'proforma'
  | 'delivery_challan'
  | 'credit_note'
  | 'debit_note';

export type BosOrderLineItem = {
  id?: string;
  name: string;
  qty: number;
  price: number;
  gstRate?: number;
  sku?: string;
  unit?: string;
  priceWithTax?: boolean;
  hsnOrSac?: string;
};

export type BosOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerGstin?: string;
  channel: 'pos' | 'online' | 'whatsapp';
  documentType?: BosDocumentType;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentMode: 'cash' | 'upi' | 'card' | 'khata' | 'bank' | 'cheque';
  paymentStatus: 'paid' | 'pending' | 'partial' | 'unpaid' | 'refund_pending' | 'refunded';
  totalAmount: number;
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  roundOff?: number;
  receivedAmount?: number;
  balanceDue?: number;
  items: BosOrderLineItem[];
  notes?: string;
  cancellationReason?: string;
  supportStatus?: 'none' | 'open' | 'resolved' | 'escalated';
  quotationRef?: string;
  deliveryChallanNumber?: string;
  createdAt: string;
  dueDate?: string;
};

export type BosCustomer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  gstin?: string;
  partyType?: 'customer' | 'supplier';
  gstType?: 'unregistered' | 'regular' | 'composition' | 'overseas';
  creditLimit?: number;
  openingBalance?: number;
  openingBalanceType?: 'receivable' | 'payable';
  segment: 'VIP' | 'Regular' | 'Wholesale' | 'New';
  ordersCount: number;
  totalSpent: number;
  khataBalance: number; // positive = receivable ("You'll Get"), negative = advance ("You'll Give")
  loyaltyPoints: number;
  lastVisit: string;
};

export type BosBankAccount = {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  upiId?: string;
  balance: number;
  isDefault?: boolean;
  printOnInvoice?: boolean;
};

export type BosCheque = {
  id: string;
  partyName: string;
  chequeNumber: string;
  bankName: string;
  amount: number;
  date: string;
  type: 'received' | 'issued';
  status: 'pending' | 'deposited' | 'cleared' | 'bounced';
  notes?: string;
};

export type BosExpense = {
  id: string;
  category: 'Rent' | 'Salary' | 'Tea & Snacks' | 'Electricity' | 'Travel' | 'Maintenance' | 'Marketing' | 'Other';
  title: string;
  amount: number;
  paymentMode: 'cash' | 'bank' | 'upi' | 'cheque';
  paymentRef?: string;
  notes?: string;
  date: string;
  receiptUrl?: string;
};

export type BosPurchaseBill = {
  id: string;
  billNumber: string;
  vendorName: string;
  vendorGstin?: string;
  date: string;
  dueDate?: string;
  totalAmount: number;
  taxAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  items: BosOrderLineItem[];
};

export type BosKhataTransaction = {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'customer' | 'supplier';
  type: 'gave' | 'got'; // gave = credit/udhaar given, got = payment received
  amount: number;
  mode: 'cash' | 'upi' | 'bank' | 'credit';
  note: string;
  billRef?: string;
  createdAt: string;
};

export type BosAppointment = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  categoryName?: string;
  staffName: string;
  scheduledAt: string; // e.g. '10:30 AM' or ISO
  durationMinutes: number;
  amount: number;
  paymentStatus: 'paid' | 'pending';
  status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'pending';
  notes?: string;
};

export type BosDaybookEntry = {
  id: string;
  time: string;
  partyName: string;
  particulars?: string;
  subtitle: string;
  category: 'POS Sale' | 'Invoice' | 'Khata In' | 'Supplier' | 'Expense' | 'Online Sale' | 'Adjustment';
  refNumber: string;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank' | 'cheque';
  moneyIn: number;
  moneyOut: number;
  createdAt: string;
};

export type BosCoupon = {
  id: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrder: number;
  active: boolean;
  usageCount?: number;
  description?: string;
};

export type BosStoreSettings = {
  businessName: string;
  ownerName?: string;
  businessSlug: string;
  businessType: string;
  blueprintType?: import('../../../shared/blueprint/types').BusinessType;
  salesChannels?: import('../../../shared/blueprint/types').SalesChannel[];
  countryCode?: import('../../../shared/blueprint/types').CountryCode;
  language?: 'en' | 'hi' | 'both';
  capabilities?: Partial<import('../../../shared/blueprint/types').BusinessCapabilities>;
  cancellationPolicy?:
    | 'before_confirmation'
    | 'before_preparation'
    | '30m_before_appointment'
    | '24h_before_appointment';
  refundPolicy?: 'full' | 'partial' | 'merchant_review';
  tagline: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName?: string;
  invoicePaymentDisplay?: 'both' | 'upi_qr' | 'bank_details' | 'none';
  currencySymbol: string;
  openingBalance?: number;
  storeLive: boolean;
  isStoreOpen?: boolean;
  lastActiveDate?: string;
  autoCloseIfInactive?: boolean;
  manualCloseReason?: string;
  minOrderAmount: number;
  deliveryCharge: number;
  freeDeliveryAbove: number;
  deliveryRadiusKm: number;
  enableLocalDelivery: boolean;
  enableStorePickup: boolean;
  themeColor: string;
  announcementBanner: string;
  logoUrl?: string;
  signatureUrl?: string;
  billFooter?: string;
  businessHours?: Record<string, { open: boolean; start: string; end: string }>;
  estimatedDeliveryTime?: string;
  eInvoiceStatus?: boolean;
  registrationType?: string;
  paymentQrUrl?: string;
  enableOnlinePayment?: boolean;
  enableGst?: boolean;
  taxRate?: number;
  taxType?: 'inclusive' | 'exclusive';
  bankAccounts?: BosBankAccount[];
  stopSaleOnNegativeStock?: boolean;
  blockNewItemsFromTxn?: boolean;
  blockNewPartiesFromTxn?: boolean;
  enableAuditTrail?: boolean;
  zoomScale?: number;
  enablePasscode?: boolean;
  serviceReminders?: boolean;
};

export function formatBosCurrency(amount: number, symbol = '₹'): string {
  const num = Number.isFinite(amount) ? amount : 0;
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: abs % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function getInitials(name: string): string {
  const parts = String(name || 'B')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'BS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
