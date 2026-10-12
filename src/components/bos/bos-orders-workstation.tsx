'use client';

import React, { useMemo, useState } from 'react';
import {
  BadgePercent,
  Box,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
   MapPin,
  MessageCircle,
  MoreVertical,
  Plus,
  Printer,
  RotateCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Store,
  Truck,
  X,
} from 'lucide-react';
import {
  type BosOrder,
  formatBosCurrency,
} from '@/components/bos/bos-types';
import { BosProductThumbnail } from '@/components/bos/bos-product-image-resolver';

type OrdersFilterTab =
  | 'all'
  | 'pos'
  | 'online'
  | 'whatsapp'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled';

type OrderInspectorTab = 'details' | 'items' | 'customer' | 'history';

type BosOrdersWorkstationProps = {
  businessName: string;
  currencySymbol: string;
  orders: BosOrder[];
  initialSelectedOrderId?: string;
  onUpdateOrderStatus: (orderId: string, status: BosOrder['status']) => Promise<void>;
  onPrintOrderBill: (order: BosOrder) => void;
  onNavigateToPos: () => void;
};

type ShowcaseOrderRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  avatarType: 'photo-f1' | 'photo-m1' | 'photo-f2' | 'photo-m2' | 'photo-m3' | 'letter-m' | 'letter-k';
  thumbs: Array<{ name: string; category: string; imageUrl: string }>;
  itemsCountLabel: string;
  amount: number;
  paymentLabel: 'UPI' | 'Cash' | 'Card';
  statusLabel: 'Completed' | 'Processing' | 'Pending' | 'Cancelled';
  channelLabel: 'Online Store' | 'POS' | 'WhatsApp';
  dateTime: string;
  inspectorDateTime: string;
  inspectorItems: Array<{
    name: string;
    category: string;
    price: number;
    qty: number;
    imageUrl: string;
  }>;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  inspectorTotal: number;
  paymentMethodDetail: string;
  transactionId: string;
};

const SHOWCASE_ORDERS: ShowcaseOrderRow[] = [
  {
    id: '#ORD-1005',
    customerName: 'Priya Sharma',
    customerPhone: '9876543210',
    customerAddress: '123 Green Park, Near Metro Station, Delhi - 110016',
    avatarType: 'photo-f1',
    thumbs: [
      { name: 'Maggi Noodles', category: 'Noodles', imageUrl: '/bos/products/maggi-noodles.png' },
      { name: 'Coca Cola', category: 'Beverages', imageUrl: '/bos/products/coca-cola.png' },
    ],
    itemsCountLabel: '3 items',
    amount: 450,
    paymentLabel: 'UPI',
    statusLabel: 'Completed',
    channelLabel: 'Online Store',
    dateTime: '12 Oct, 10:32 AM',
    inspectorDateTime: '12 Oct 2024, 10:32 AM',
    inspectorItems: [
      {
        name: 'Maggi Noodles (70g)',
        category: 'Noodles',
        price: 14,
        qty: 2,
        imageUrl: '/bos/products/maggi-noodles.png',
      },
      {
        name: 'Coca Cola (500ml)',
        category: 'Beverages',
        price: 40,
        qty: 1,
        imageUrl: '/bos/products/coca-cola.png',
      },
      {
        name: 'Parle-G Biscuits (100g)',
        category: 'Biscuits',
        price: 10,
        qty: 1,
        imageUrl: '/bos/products/parle-g.png',
      },
    ],
    subtotal: 78,
    discount: 5,
    deliveryCharge: 0,
    inspectorTotal: 73,
    paymentMethodDetail: 'UPI (GPay)',
    transactionId: 'T241012103252',
  },
  {
    id: '#ORD-1004',
    customerName: 'Amit Kumar',
    customerPhone: '9812345678',
    customerAddress: '45 Sector 18 Market, Noida - 201301',
    avatarType: 'photo-m1',
    thumbs: [
      { name: 'Dove Soap', category: 'Personal Care', imageUrl: '/bos/products/dove-soap.png' },
      { name: 'Coca Cola', category: 'Beverages', imageUrl: '/bos/products/coca-cola.png' },
    ],
    itemsCountLabel: '5 items',
    amount: 780,
    paymentLabel: 'Cash',
    statusLabel: 'Processing',
    channelLabel: 'POS',
    dateTime: '12 Oct, 09:15 AM',
    inspectorDateTime: '12 Oct 2024, 09:15 AM',
    inspectorItems: [
      {
        name: 'Dove Soap (100g)',
        category: 'Personal Care',
        price: 38,
        qty: 3,
        imageUrl: '/bos/products/dove-soap.png',
      },
      {
        name: 'Coca Cola (500ml)',
        category: 'Beverages',
        price: 40,
        qty: 2,
        imageUrl: '/bos/products/coca-cola.png',
      },
    ],
    subtotal: 194,
    discount: 10,
    deliveryCharge: 0,
    inspectorTotal: 184,
    paymentMethodDetail: 'Cash at Counter',
    transactionId: 'CSH-2410120915',
  },
  {
    id: '#ORD-1003',
    customerName: 'Sneha Patel',
    customerPhone: '9871234560',
    customerAddress: 'B-12 Vasant Kunj, New Delhi - 110070',
    avatarType: 'photo-f2',
    thumbs: [
      { name: 'Maggi Noodles', category: 'Noodles', imageUrl: '/bos/products/maggi-noodles.png' },
      { name: 'Aashirvaad Atta', category: 'Grocery', imageUrl: '/bos/products/aashirvaad-atta.png' },
    ],
    itemsCountLabel: '2 items',
    amount: 320,
    paymentLabel: 'Card',
    statusLabel: 'Pending',
    channelLabel: 'WhatsApp',
    dateTime: '12 Oct, 08:40 AM',
    inspectorDateTime: '12 Oct 2024, 08:40 AM',
    inspectorItems: [
      {
        name: 'Aashirvaad Atta (5kg)',
        category: 'Grocery',
        price: 245,
        qty: 1,
        imageUrl: '/bos/products/aashirvaad-atta.png',
      },
      {
        name: 'Maggi Noodles (70g)',
        category: 'Noodles',
        price: 14,
        qty: 5,
        imageUrl: '/bos/products/maggi-noodles.png',
      },
    ],
    subtotal: 315,
    discount: 0,
    deliveryCharge: 5,
    inspectorTotal: 320,
    paymentMethodDetail: 'Debit / Credit Card',
    transactionId: 'CRD-2410120840',
  },
  {
    id: '#ORD-1002',
    customerName: 'Rahul Mehta',
    customerPhone: '9898765432',
    customerAddress: '78 Indiranagar 100ft Road, Bengaluru - 560038',
    avatarType: 'photo-m2',
    thumbs: [
      { name: 'Dettol', category: 'Personal Care', imageUrl: '/bos/products/dettol.png' },
      { name: 'Maggi Noodles', category: 'Noodles', imageUrl: '/bos/products/maggi-noodles.png' },
    ],
    itemsCountLabel: '4 items',
    amount: 1250,
    paymentLabel: 'UPI',
    statusLabel: 'Completed',
    channelLabel: 'Online Store',
    dateTime: '11 Oct, 07:20 PM',
    inspectorDateTime: '11 Oct 2024, 07:20 PM',
    inspectorItems: [
      {
        name: 'Dettol (500ml)',
        category: 'Personal Care',
        price: 95,
        qty: 2,
        imageUrl: '/bos/products/dettol.png',
      },
      {
        name: 'Aashirvaad Atta (5kg)',
        category: 'Grocery',
        price: 245,
        qty: 2,
        imageUrl: '/bos/products/aashirvaad-atta.png',
      },
    ],
    subtotal: 680,
    discount: 20,
    deliveryCharge: 0,
    inspectorTotal: 660,
    paymentMethodDetail: 'UPI (PhonePe)',
    transactionId: 'T241011192014',
  },
  {
    id: '#ORD-1001',
    customerName: 'Vikram Singh',
    customerPhone: '9876543211',
    customerAddress: '19 DLF Phase 3, Gurugram - 122002',
    avatarType: 'photo-m3',
    thumbs: [
      { name: 'Sunflower Oil', category: 'Oil & Ghee', imageUrl: '/bos/products/sunflower-oil.png' },
      { name: 'Parle-G Biscuits', category: 'Biscuits', imageUrl: '/bos/products/parle-g.png' },
    ],
    itemsCountLabel: '1 item',
    amount: 150,
    paymentLabel: 'Cash',
    statusLabel: 'Cancelled',
    channelLabel: 'POS',
    dateTime: '11 Oct, 06:10 PM',
    inspectorDateTime: '11 Oct 2024, 06:10 PM',
    inspectorItems: [
      {
        name: 'Sunflower Oil (1L)',
        category: 'Oil & Ghee',
        price: 140,
        qty: 1,
        imageUrl: '/bos/products/sunflower-oil.png',
      },
    ],
    subtotal: 140,
    discount: 0,
    deliveryCharge: 10,
    inspectorTotal: 150,
    paymentMethodDetail: 'Cash',
    transactionId: 'CSH-2410111810',
  },
  {
    id: '#ORD-1000',
    customerName: 'Meera Iyer',
    customerPhone: '9870012345',
    customerAddress: 'Flat 402, Palm Grove Apartments, Mumbai - 400050',
    avatarType: 'letter-m',
    thumbs: [
      { name: 'Amul Milk', category: 'Dairy', imageUrl: '/bos/products/amul-milk.png' },
      { name: 'Sunflower Oil', category: 'Oil & Ghee', imageUrl: '/bos/products/sunflower-oil.png' },
    ],
    itemsCountLabel: '6 items',
    amount: 980,
    paymentLabel: 'UPI',
    statusLabel: 'Completed',
    channelLabel: 'Online Store',
    dateTime: '11 Oct, 05:45 PM',
    inspectorDateTime: '11 Oct 2024, 05:45 PM',
    inspectorItems: [
      {
        name: 'Amul Milk (1L)',
        category: 'Dairy',
        price: 68,
        qty: 4,
        imageUrl: '/bos/products/amul-milk.png',
      },
      {
        name: 'Sunflower Oil (1L)',
        category: 'Oil & Ghee',
        price: 140,
        qty: 2,
        imageUrl: '/bos/products/sunflower-oil.png',
      },
    ],
    subtotal: 552,
    discount: 12,
    deliveryCharge: 0,
    inspectorTotal: 540,
    paymentMethodDetail: 'UPI (GPay)',
    transactionId: 'T241011174509',
  },
  {
    id: '#ORD-0999',
    customerName: 'Karan Gupta',
    customerPhone: '9811002233',
    customerAddress: 'Plot 88, Lajpat Nagar II, New Delhi - 110024',
    avatarType: 'letter-k',
    thumbs: [
      { name: 'Dettol', category: 'Personal Care', imageUrl: '/bos/products/dettol.png' },
      { name: 'Dove Soap', category: 'Personal Care', imageUrl: '/bos/products/dove-soap.png' },
    ],
    itemsCountLabel: '2 items',
    amount: 220,
    paymentLabel: 'UPI',
    statusLabel: 'Processing',
    channelLabel: 'WhatsApp',
    dateTime: '11 Oct, 04:20 PM',
    inspectorDateTime: '11 Oct 2024, 04:20 PM',
    inspectorItems: [
      {
        name: 'Dettol (500ml)',
        category: 'Personal Care',
        price: 95,
        qty: 2,
        imageUrl: '/bos/products/dettol.png',
      },
    ],
    subtotal: 190,
    discount: 0,
    deliveryCharge: 30,
    inspectorTotal: 220,
    paymentMethodDetail: 'UPI (Paytm)',
    transactionId: 'T241011162044',
  },
  {
    id: '#ORD-0998',
    customerName: 'Anita Verma',
    customerPhone: '9899001122',
    customerAddress: '14 Saket Block J, New Delhi - 110017',
    avatarType: 'photo-f2',
    thumbs: [
      { name: 'Dettol', category: 'Personal Care', imageUrl: '/bos/products/dettol.png' },
      { name: 'Maggi Noodles', category: 'Noodles', imageUrl: '/bos/products/maggi-noodles.png' },
    ],
    itemsCountLabel: '3 items',
    amount: 560,
    paymentLabel: 'Card',
    statusLabel: 'Completed',
    channelLabel: 'POS',
    dateTime: '11 Oct, 03:10 PM',
    inspectorDateTime: '11 Oct 2024, 03:10 PM',
    inspectorItems: [
      {
        name: 'Dettol (500ml)',
        category: 'Personal Care',
        price: 95,
        qty: 2,
        imageUrl: '/bos/products/dettol.png',
      },
      {
        name: 'Maggi Noodles (70g)',
        category: 'Noodles',
        price: 14,
        qty: 1,
        imageUrl: '/bos/products/maggi-noodles.png',
      },
    ],
    subtotal: 204,
    discount: 4,
    deliveryCharge: 0,
    inspectorTotal: 200,
    paymentMethodDetail: 'Card (HDFC POS)',
    transactionId: 'CRD-2410111510',
  },
  {
    id: '#ORD-0997',
    customerName: 'Sandeep Yadav',
    customerPhone: '9877889900',
    customerAddress: 'Sector 62, Noida - 201309',
    avatarType: 'photo-m1',
    thumbs: [
      { name: 'Dove Soap', category: 'Personal Care', imageUrl: '/bos/products/dove-soap.png' },
      { name: 'Bread', category: 'Dairy', imageUrl: '/bos/products/bread.png' },
    ],
    itemsCountLabel: '5 items',
    amount: 890,
    paymentLabel: 'UPI',
    statusLabel: 'Pending',
    channelLabel: 'Online Store',
    dateTime: '11 Oct, 02:30 PM',
    inspectorDateTime: '11 Oct 2024, 02:30 PM',
    inspectorItems: [
      {
        name: 'Dove Soap (100g)',
        category: 'Personal Care',
        price: 38,
        qty: 3,
        imageUrl: '/bos/products/dove-soap.png',
      },
      {
        name: 'Bread (400g)',
        category: 'Dairy',
        price: 35,
        qty: 2,
        imageUrl: '/bos/products/bread.png',
      },
    ],
    subtotal: 184,
    discount: 0,
    deliveryCharge: 0,
    inspectorTotal: 184,
    paymentMethodDetail: 'UPI (GPay)',
    transactionId: 'T241011143011',
  },
  {
    id: '#ORD-0996',
    customerName: 'Neha Joshi',
    customerPhone: '9871112233',
    customerAddress: 'A-44 Hauz Khas, New Delhi - 110016',
    avatarType: 'photo-f1',
    thumbs: [
      { name: 'Aashirvaad Atta', category: 'Grocery', imageUrl: '/bos/products/aashirvaad-atta.png' },
      { name: 'Amul Milk', category: 'Dairy', imageUrl: '/bos/products/amul-milk.png' },
    ],
    itemsCountLabel: '2 items',
    amount: 340,
    paymentLabel: 'Cash',
    statusLabel: 'Completed',
    channelLabel: 'POS',
    dateTime: '11 Oct, 01:15 PM',
    inspectorDateTime: '11 Oct 2024, 01:15 PM',
    inspectorItems: [
      {
        name: 'Aashirvaad Atta (5kg)',
        category: 'Grocery',
        price: 245,
        qty: 1,
        imageUrl: '/bos/products/aashirvaad-atta.png',
      },
      {
        name: 'Amul Milk (1L)',
        category: 'Dairy',
        price: 68,
        qty: 1,
        imageUrl: '/bos/products/amul-milk.png',
      },
    ],
    subtotal: 313,
    discount: 3,
    deliveryCharge: 0,
    inspectorTotal: 310,
    paymentMethodDetail: 'Cash',
    transactionId: 'CSH-2410111315',
  },
];

function formatOrdAmount(amount: number, symbol = '₹'): string {
  const rounded = Math.round(Number(amount) || 0);
  return `${symbol} ${rounded.toLocaleString('en-IN')}`;
}

function CustomerAvatar({
  type,
  name,
  size = 'md',
}: {
  type: ShowcaseOrderRow['avatarType'];
  name: string;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-10 w-10 text-[14px]' : 'h-8 w-8 text-[12px]';
  if (type === 'letter-m') {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] font-bold text-white ${dim}`}
      >
        M
      </div>
    );
  }
  if (type === 'letter-k') {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[#EC4899] font-bold text-white ${dim}`}
      >
        K
      </div>
    );
  }

  const palette = {
    'photo-f1': 'bg-gradient-to-br from-[#FDE68A] to-[#F59E0B] text-[#78350F]',
    'photo-m1': 'bg-gradient-to-br from-[#BFDBFE] to-[#3B82F6] text-[#1E3A8A]',
    'photo-f2': 'bg-gradient-to-br from-[#FBCFE8] to-[#EC4899] text-[#831843]',
    'photo-m2': 'bg-gradient-to-br from-[#A7F3D0] to-[#10B981] text-[#064E3B]',
    'photo-m3': 'bg-gradient-to-br from-[#DDD6FE] to-[#8B5CF6] text-[#4C1D95]',
  }[type];

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold shadow-2xs ${palette} ${dim}`}
    >
      {initials}
    </div>
  );
}

export function BosOrdersWorkstation({
  businessName,
  currencySymbol = '₹',
  orders,
  initialSelectedOrderId,
  onUpdateOrderStatus,
  onPrintOrderBill,
  onNavigateToPos,
}: BosOrdersWorkstationProps) {
  const [activeTab, setActiveTab] = useState<OrdersFilterTab>('all');
  const [inspectorTab, setInspectorTab] = useState<OrderInspectorTab>('details');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateRangeLabel, setDateRangeLabel] = useState('01 Oct 2024 - 12 Oct 2024');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showNewOrderDropdown, setShowNewOrderDropdown] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialSelectedOrderId || '#ORD-1005',
  );
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, ShowcaseOrderRow['statusLabel']>
  >({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => {
      setBannerMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Merge any newly created runtime POS orders at the top of the 10 showcase rows
  const allRows = useMemo<ShowcaseOrderRow[]>(() => {
    const newRuntimeOrders: ShowcaseOrderRow[] = orders
      .filter((o) => {
        const num = Number(o.id.replace(/\D/g, ''));
        return num >= 1049 && !SHOWCASE_ORDERS.some((s) => s.id === o.id);
      })
      .map((o) => ({
        id: o.id,
        customerName: o.customerName,
        customerPhone: o.customerPhone.replace(/\+91\s*/, ''),
        customerAddress: o.customerAddress || 'Main Counter Pickup, Store #1',
        avatarType: 'photo-m1',
        thumbs: o.items.slice(0, 2).map((it) => ({
          name: it.name,
          category: 'Grocery',
          imageUrl: '',
        })),
        itemsCountLabel: `${o.items.reduce((s, i) => s + i.qty, 0)} items`,
        amount: o.totalAmount,
        paymentLabel:
          o.paymentMode === 'cash'
            ? 'Cash'
            : o.paymentMode === 'card'
              ? 'Card'
              : 'UPI',
        statusLabel:
          o.status === 'completed'
            ? 'Completed'
            : o.status === 'cancelled'
              ? 'Cancelled'
              : o.status === 'new'
                ? 'Pending'
                : 'Processing',
        channelLabel:
          o.channel === 'online'
            ? 'Online Store'
            : o.channel === 'whatsapp'
              ? 'WhatsApp'
              : 'POS',
        dateTime: o.createdAt,
        inspectorDateTime: o.createdAt,
        inspectorItems: o.items.map((it) => ({
          name: it.name,
          category: 'Grocery',
          price: it.price,
          qty: it.qty,
          imageUrl: '',
        })),
        subtotal: o.subtotalAmount || o.totalAmount,
        discount: o.discountAmount || 0,
        deliveryCharge: 0,
        inspectorTotal: o.totalAmount,
        paymentMethodDetail: o.paymentMode.toUpperCase(),
        transactionId: `TXN-${o.id.replace(/\D/g, '')}`,
      }));

    return [...newRuntimeOrders, ...SHOWCASE_ORDERS].map((row) => ({
      ...row,
      statusLabel: statusOverrides[row.id] || row.statusLabel,
    }));
  }, [orders, statusOverrides]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((row) => {
      if (activeTab === 'pos' && row.channelLabel !== 'POS') return false;
      if (activeTab === 'online' && row.channelLabel !== 'Online Store') return false;
      if (activeTab === 'whatsapp' && row.channelLabel !== 'WhatsApp') return false;
      if (activeTab === 'pending' && row.statusLabel !== 'Pending') return false;
      if (activeTab === 'processing' && row.statusLabel !== 'Processing') return false;
      if (activeTab === 'completed' && row.statusLabel !== 'Completed') return false;
      if (activeTab === 'cancelled' && row.statusLabel !== 'Cancelled') return false;

      if (channelFilter !== 'all' && row.channelLabel !== channelFilter) return false;
      if (statusFilter !== 'all' && row.statusLabel !== statusFilter) return false;
      if (paymentFilter !== 'all' && row.paymentLabel !== paymentFilter) return false;

      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q) ||
        row.customerPhone.toLowerCase().includes(q) ||
        row.inspectorItems.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [allRows, activeTab, channelFilter, statusFilter, paymentFilter, searchQuery]);

  const visibleRows = useMemo(() => {
    return filteredRows.slice(0, pageSize);
  }, [filteredRows, pageSize]);

  const selectedOrder = useMemo(() => {
    return (
      allRows.find((r) => r.id === selectedOrderId) ||
      filteredRows[0] ||
      allRows[0]
    );
  }, [allRows, filteredRows, selectedOrderId]);

  const toggleSelectAll = () => {
    if (selectedRowIds.length === visibleRows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(visibleRows.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleExportCsv = () => {
    const header = [
      'Order ID',
      'Customer',
      'Phone',
      'Items',
      'Amount',
      'Payment',
      'Status',
      'Channel',
      'Date & Time',
    ];
    const rows = allRows.map((r) => [
      r.id,
      `"${r.customerName}"`,
      r.customerPhone,
      r.itemsCountLabel,
      r.amount,
      r.paymentLabel,
      r.statusLabel,
      r.channelLabel,
      `"${r.dateTime}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bos-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported orders CSV');
  };

  const handleShareWhatsApp = (row: ShowcaseOrderRow) => {
    const cleanPhone = row.customerPhone.replace(/\D/g, '');
    const itemsText = row.inspectorItems
      .map(
        (i) =>
          `• ${i.name} (${formatOrdAmount(i.price, currencySymbol)} × ${i.qty}) = ${formatOrdAmount(i.price * i.qty, currencySymbol)}`,
      )
      .join('\n');
    const message = `Hello ${row.customerName},\nThank you for your order at *${businessName}*!\n\n*Order:* ${row.id}\n${itemsText}\n\n*Total Amount:* ${formatOrdAmount(row.inspectorTotal, currencySymbol)}\n*Status:* ${row.statusLabel}`;
    window.open(
      `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handlePrintSelected = (row: ShowcaseOrderRow) => {
    onPrintOrderBill({
      id: row.id,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      channel:
        row.channelLabel === 'Online Store'
          ? 'online'
          : row.channelLabel === 'WhatsApp'
            ? 'whatsapp'
            : 'pos',
      status: 'completed',
      paymentMode:
        row.paymentLabel === 'Cash'
          ? 'cash'
          : row.paymentLabel === 'Card'
            ? 'card'
            : 'upi',
      paymentStatus: 'paid',
      totalAmount: row.inspectorTotal,
      items: row.inspectorItems.map((it) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
      })),
      createdAt: row.inspectorDateTime,
    });
    showToast(`Sent bill for ${row.id} to printer`);
  };

  const handleCreateReturn = async (row: ShowcaseOrderRow) => {
    setStatusOverrides((prev) => ({ ...prev, [row.id]: 'Cancelled' }));
    await onUpdateOrderStatus(row.id, 'cancelled');
    showToast(`Return initiated for Order ${row.id}`);
  };

  return (
    <div className="w-full space-y-3.5 pb-6">
      {/* Page Title & Top Right Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827] leading-tight">
            Orders
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Manage all your orders from POS, online store, WhatsApp and manual entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateDropdown((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-[#475569]" />
              <span>{dateRangeLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-[#DCE9E3] bg-white p-1.5 shadow-xl text-[12.5px]">
                {[
                  '01 Oct 2024 - 12 Oct 2024',
                  'Today (12 Oct 2024)',
                  'Last 7 Days',
                  'Last 30 Days',
                  'This Month',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDateRangeLabel(preset);
                      setShowDateDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-medium ${
                      dateRangeLabel === preset
                        ? 'bg-[#E6F6F0] font-bold text-[#0A6847]'
                        : 'text-[#334155] hover:bg-[#F4F8F6]'
                    }`}
                  >
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#475569]" />
            <span>Export</span>
          </button>

          {/* + New Order Button with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNewOrderDropdown((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A6847] px-4 py-2 text-[12.5px] font-semibold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>New Order</span>
              <ChevronDown className="h-3.5 w-3.5 text-white/90" />
            </button>

            {showNewOrderDropdown && (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-[#DCE9E3] bg-white p-1.5 shadow-xl text-[12.5px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewOrderDropdown(false);
                    onNavigateToPos();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#1E293B] hover:bg-[#F1FAF5]"
                >
                  <ShoppingCart className="h-4 w-4 text-[#0A6847]" />
                  <span>New POS Counter Sale</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewOrderDropdown(false);
                    onNavigateToPos();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-[#334155] hover:bg-[#F4F8F6]"
                >
                  <Store className="h-4 w-4 text-blue-600" />
                  <span>Manual Online Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewOrderDropdown(false);
                    onNavigateToPos();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium text-[#334155] hover:bg-[#F4F8F6]"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span>Record WhatsApp Order</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8 Filter Pill Tabs with Counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        {(
          [
            { id: 'all', label: 'All Orders', count: 125 },
            { id: 'pos', label: 'POS Orders', count: 48 },
            { id: 'online', label: 'Online Store', count: 32 },
            { id: 'whatsapp', label: 'WhatsApp Orders', count: 18 },
            { id: 'pending', label: 'Pending', count: 12 },
            { id: 'processing', label: 'Processing', count: 8 },
            { id: 'completed', label: 'Completed', count: 96 },
            { id: 'cancelled', label: 'Cancelled', count: 9 },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition cursor-pointer ${
                active
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'border border-[#E2ECE7] bg-white text-[#334155] hover:bg-[#F4F8F6]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  active
                    ? 'bg-white text-[#0A6847]'
                    : 'bg-[#EEF2F6] text-[#475569]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toast Notification Banner */}
      {bannerMessage && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2 text-[12.5px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {bannerMessage}
          </span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 6 Top KPI Summary Cards with Sparklines */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Total Orders */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11.5px] font-medium text-[#64748B]">Total Orders</p>
              <p className="text-[21px] font-extrabold text-[#111827] leading-tight">
                125
              </p>
              <p className="text-[11px] font-bold text-[#0A7B56]">↑ 18%</p>
            </div>
          </div>
          <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0 overflow-visible" fill="none">
            <path
              d="M2 24 L 16 19 L 28 21 L 42 13 L 52 15 L 62 5"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
              <span className="text-[19px] font-bold leading-none">
                {currencySymbol}
              </span>
            </div>
            <div>
              <p className="text-[11.5px] font-medium text-[#64748B]">Total Revenue</p>
              <p className="text-[20px] font-extrabold text-[#111827] leading-tight">
                {currencySymbol} 48,320
              </p>
              <p className="text-[11px] font-bold text-[#0A7B56]">↑ 24%</p>
            </div>
          </div>
          <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0 overflow-visible" fill="none">
            <path
              d="M2 24 L 18 20 L 30 22 L 44 12 L 54 14 L 62 4"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 3: Avg. Order Value */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
              <BadgePercent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11.5px] font-medium text-[#64748B]">
                Avg. Order Value
              </p>
              <p className="text-[21px] font-extrabold text-[#111827] leading-tight">
                {currencySymbol} 386
              </p>
              <p className="text-[11px] font-bold text-[#0A7B56]">↑ 12%</p>
            </div>
          </div>
          <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0 overflow-visible" fill="none">
            <path
              d="M2 24 L 16 20 L 28 22 L 42 14 L 52 16 L 62 6"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 4: Pending Orders */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11.5px] font-medium text-[#64748B]">
                Pending Orders
              </p>
              <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
                12
              </p>
            </div>
          </div>
          <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0 overflow-visible" fill="none">
            <path
              d="M2 25 L 18 21 L 32 23 L 46 14 L 54 16 L 62 8"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 5: Processing */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11.5px] font-medium text-[#64748B]">Processing</p>
              <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
                8
              </p>
            </div>
          </div>
          <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0 overflow-visible" fill="none">
            <path
              d="M2 25 L 18 21 L 32 23 L 46 14 L 54 16 L 62 8"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 6: Completed */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11.5px] font-medium text-[#64748B]">Completed</p>
              <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
                96
              </p>
            </div>
          </div>
          <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0 overflow-visible" fill="none">
            <path
              d="M2 25 L 18 21 L 32 23 L 46 14 L 54 16 L 62 8"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Main Split Workspace: Left Orders Table (8 cols) + Right Order Detail Inspector (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Panel: Filter Bar, Table & Pagination */}
        <div className="lg:col-span-8 rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EBF2EE] px-4 py-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order ID, customer, phone, product..."
                className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] pl-9 pr-3 text-[12.5px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* All Channels Select */}
            <select
              aria-label="Channel filter"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="Online Store">Online Store</option>
              <option value="POS">POS</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>

            {/* All Status Select */}
            <select
              aria-label="Status filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Processing">Processing</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* All Payment Methods Select */}
            <select
              aria-label="Payment method filter"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>

            {/* Scan Receipt / Order Barcode Button */}
            <button
              type="button"
              onClick={() =>
                showToast('Receipt barcode scanner ready — scan order receipt QR/barcode')
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DCE9E3] bg-[#F4F8F6] text-[#0A6847] hover:bg-[#E6F6F0] cursor-pointer"
              title="Scan Order Receipt"
            >
              <ScanLine className="h-4 w-4" />
            </button>

            {/* Latest First Button */}
            <button
              type="button"
              onClick={() => {
                setChannelFilter('all');
                setStatusFilter('all');
                setPaymentFilter('all');
                setSearchQuery('');
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
              <span>Latest First</span>
            </button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11.5px] font-semibold text-[#475569]">
                  <th className="w-10 py-3 pl-4 pr-2">
                    <input
                      type="checkbox"
                      aria-label="Select all orders"
                      checked={
                        visibleRows.length > 0 &&
                        selectedRowIds.length === visibleRows.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-2.5">Order ID</th>
                  <th className="py-3 px-2.5">Customer</th>
                  <th className="py-3 px-2.5">Items</th>
                  <th className="py-3 px-2.5">Amount</th>
                  <th className="py-3 px-2.5">Payment</th>
                  <th className="py-3 px-2.5">Status</th>
                  <th className="py-3 px-2.5">Channel</th>
                  <th className="py-3 px-2.5">Date &amp; Time</th>
                  <th className="py-3 pl-2 pr-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                {visibleRows.map((row) => {
                  const isSelected = selectedOrder?.id === row.id;
                  const isChecked = selectedRowIds.includes(row.id);

                  const paymentBadgeCls =
                    row.paymentLabel === 'UPI'
                      ? 'bg-[#E6F6F0] text-[#0A7B56]'
                      : 'bg-[#F1F5F9] text-[#334155]';

                  const statusBadgeCls =
                    row.statusLabel === 'Completed'
                      ? 'bg-[#E6F6F0] text-[#0A7B56]'
                      : row.statusLabel === 'Processing'
                        ? 'bg-[#DBEAFE] text-[#2563EB]'
                        : row.statusLabel === 'Pending'
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : 'bg-[#FEE2E2] text-[#DC2626]';

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedOrderId(row.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-[#F1FAF5]' : 'hover:bg-[#F9FCFA]'
                      }`}
                    >
                      <td
                        className="py-2.5 pl-4 pr-2"
                        onClick={(e) => toggleSelectRow(row.id, e)}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.id}`}
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                        />
                      </td>

                      {/* Order ID */}
                      <td className="py-2.5 px-2.5 font-extrabold text-[#111827] whitespace-nowrap">
                        {row.id}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2.5">
                          <CustomerAvatar type={row.avatarType} name={row.customerName} />
                          <div className="min-w-0">
                            <p className="font-bold text-[#111827] truncate">
                              {row.customerName}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              {row.customerPhone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Items (Mini Packshot Thumbnails + Count) */}
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center -space-x-1">
                            {row.thumbs.slice(0, 2).map((th, idx) => (
                              <BosProductThumbnail
                                key={`${row.id}-th-${idx}`}
                                product={{
                                  name: th.name,
                                  category: th.category,
                                  imageUrl: th.imageUrl,
                                }}
                                size="sm"
                                className="h-7 w-7 rounded-md bg-white shadow-2xs"
                              />
                            ))}
                          </div>
                          <span className="text-[12px] font-medium text-[#475569] whitespace-nowrap">
                            {row.itemsCountLabel}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-2.5 font-extrabold text-[#111827] whitespace-nowrap">
                        {formatOrdAmount(row.amount, currencySymbol)}
                      </td>

                      {/* Payment */}
                      <td className="py-2.5 px-2.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${paymentBadgeCls}`}
                        >
                          {row.paymentLabel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeCls}`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#334155]">
                          {row.channelLabel === 'Online Store' ? (
                            <Store className="h-3.5 w-3.5 text-[#334155]" />
                          ) : row.channelLabel === 'WhatsApp' ? (
                            <MessageCircle className="h-3.5 w-3.5 text-[#10B981]" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-[#334155]" />
                          )}
                          <span>{row.channelLabel}</span>
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-2.5 text-[12px] text-[#64748B] whitespace-nowrap">
                        {row.dateTime}
                      </td>

                      {/* Actions Kebab */}
                      <td className="py-2.5 pl-2 pr-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(row.id);
                          }}
                          aria-label={`Actions for ${row.id}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EBF2EE] hover:text-[#111827]"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-2.5 border-t border-[#EBF2EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] font-medium text-[#64748B]">
              Showing 1–{Math.min(pageSize, visibleRows.length)} of 125 orders
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {[1, 2, 3, 4, 5].map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold transition ${
                      currentPage === pg
                        ? 'bg-[#0A6847] text-white'
                        : 'border border-[#DCE9E3] bg-white text-[#334155] hover:bg-[#F4F8F6]'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <span className="px-1 text-[12px] text-[#64748B]">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(13)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[12px] font-bold text-[#334155] hover:bg-[#F4F8F6]"
                >
                  13
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(13, p + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <select
                aria-label="Orders per page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded-lg border border-[#DCE9E3] bg-white px-2 text-[12px] font-medium text-[#334155]"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Panel: Order Detail Inspector */}
        {selectedOrder && (
          <div className="lg:col-span-4 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
            {/* Top Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[17px] font-extrabold text-[#111827]">
                    Order {selectedOrder.id}
                  </h2>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      selectedOrder.statusLabel === 'Completed'
                        ? 'bg-[#E6F6F0] text-[#0A7B56]'
                        : selectedOrder.statusLabel === 'Processing'
                          ? 'bg-[#DBEAFE] text-[#2563EB]'
                          : selectedOrder.statusLabel === 'Pending'
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#FEE2E2] text-[#DC2626]'
                    }`}
                  >
                    {selectedOrder.statusLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[#64748B]">
                  {selectedOrder.inspectorDateTime} • {selectedOrder.channelLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectorTab('details')}
                aria-label="Close order details"
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Underline Tabs: Details | Items (3) | Customer | History */}
            <div className="flex items-center gap-5 border-b border-[#EBF2EE]">
              {(
                [
                  { id: 'details', label: 'Details' },
                  {
                    id: 'items',
                    label: `Items (${selectedOrder.inspectorItems.length})`,
                  },
                  { id: 'customer', label: 'Customer' },
                  { id: 'history', label: 'History' },
                ] as const
              ).map((t) => {
                const active = inspectorTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInspectorTab(t.id)}
                    className={`relative pb-2 text-[12.5px] transition cursor-pointer ${
                      active
                        ? 'font-bold text-[#0A6847]'
                        : 'font-medium text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    <span>{t.label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#0A6847]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Customer Info & Delivery Address */}
            <div className="rounded-xl border border-[#EBF2EE] bg-[#FBFDFC] p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CustomerAvatar
                    type={selectedOrder.avatarType}
                    name={selectedOrder.customerName}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-[#111827] truncate">
                      {selectedOrder.customerName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#475569]">
                        {selectedOrder.customerPhone}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(selectedOrder)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-white"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectorTab('customer')}
                  className="rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] hover:bg-[#F4F8F6] shrink-0 cursor-pointer"
                >
                  View Profile
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#EBF2EE] pt-2 text-[11.5px]">
                <span className="flex items-center gap-1.5 text-[#475569] truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0A6847]" />
                  <span className="truncate">{selectedOrder.customerAddress}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    showToast(`Address updated for ${selectedOrder.customerName}`)
                  }
                  className="font-bold text-[#0A7B56] hover:underline shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Order Line Items with Packshot Thumbnails */}
            <div className="divide-y divide-[#EEF5F1]">
              {selectedOrder.inspectorItems.map((item, idx) => (
                <div
                  key={`${selectedOrder.id}-item-${idx}`}
                  className="flex items-center justify-between gap-2 py-2.5 text-[12.5px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <BosProductThumbnail
                      product={{
                        name: item.name,
                        category: item.category,
                        imageUrl: item.imageUrl,
                      }}
                      size="sm"
                    />
                    <span className="font-bold text-[#1E293B] truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] font-medium text-[#64748B]">
                      {formatOrdAmount(item.price, currencySymbol)} × {item.qty}
                    </span>
                    <span className="w-12 text-right font-extrabold text-[#111827]">
                      {formatOrdAmount(item.price * item.qty, currencySymbol)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Breakdown Totals */}
            <div className="border-t border-[#EBF2EE] pt-2.5 space-y-1.5 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Subtotal</span>
                <span className="font-bold text-[#111827]">
                  {formatOrdAmount(selectedOrder.subtotal, currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Discount</span>
                <span className="font-bold text-[#0A7B56]">
                  - {formatOrdAmount(selectedOrder.discount, currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Delivery Charge</span>
                <span className="font-semibold text-[#111827]">
                  {formatOrdAmount(selectedOrder.deliveryCharge, currencySymbol)}
                </span>
              </div>

              <div className="border-t border-[#EBF2EE] pt-2 flex items-baseline justify-between">
                <span className="text-[15.5px] font-extrabold text-[#111827]">
                  Total Amount
                </span>
                <span className="text-[20px] font-extrabold text-[#111827]">
                  {formatOrdAmount(selectedOrder.inspectorTotal, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Payment Method Metadata */}
            <div className="border-t border-[#EBF2EE] pt-2.5 space-y-1.5 text-[12px]">
              <p className="text-[11.5px] font-semibold text-[#64748B]">
                Payment Method
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[#DCE9E3] bg-[#F8FCFA] px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-[#0A6847]">
                    UPI
                  </span>
                  <span className="font-bold text-[#111827]">
                    {selectedOrder.paymentMethodDetail}
                  </span>
                </div>
                <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[11px] font-bold text-[#0A7B56]">
                  Paid
                </span>
              </div>

              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#64748B]">Transaction ID</span>
                <span className="font-semibold text-[#111827]">
                  {selectedOrder.transactionId}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[#64748B]">Payment Time</span>
                <span className="font-semibold text-[#111827]">
                  {selectedOrder.inspectorDateTime}
                </span>
              </div>
            </div>

            {/* Bottom 3 Action Buttons: Print Bill | Share | Create Return */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePrintSelected(selectedOrder)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2.5 text-[12px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-[#334155]" />
                <span>Print Bill</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp(selectedOrder)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#BCE3D4] bg-[#F2FAF6] px-2.5 py-2.5 text-[12px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] transition cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#0A7B56]" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => void handleCreateReturn(selectedOrder)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A6847] px-2.5 py-2.5 text-[12px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Create Return</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
