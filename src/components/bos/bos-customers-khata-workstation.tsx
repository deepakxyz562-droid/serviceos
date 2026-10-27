'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Store,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  type BosCustomer,
  type BosKhataTransaction,
} from '@/components/bos/bos-types';
import { authFetch } from '@/lib/client-auth';
import { useBosTranslation } from '@/components/bos/i18n/bos-i18n-context';

type CustomerSubTab = 'all' | 'credit' | 'regular' | 'new';
type CustomerInspectorTab = 'overview' | 'transactions' | 'orders' | 'notes' | 'settings';

type BosCustomersKhataWorkstationProps = {
  mode: 'customers' | 'khata';
  businessName: string;
  currencySymbol: string;
  customers: BosCustomer[];
  khataTransactions: BosKhataTransaction[];
  initialOpenAddCustomer?: boolean;
  demoMode?: boolean;
  onAddCustomer: (customer: Omit<BosCustomer, 'id'>) => Promise<unknown> | void;
  onUpdateCustomer?: (customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    gstin?: string;
  }) => Promise<unknown> | void;
  onRecordKhataEntry: (entry: {
    customerId: string;
    customerName: string;
    type: 'gave' | 'got';
    amount: number;
    mode: 'cash' | 'upi' | 'credit';
    note: string;
  }) => Promise<void>;
};

type ShowcaseCustomerRow = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  groupTag: string;
  segmentBadge: 'Regular' | 'VIP' | 'Wholesale' | 'New';
  avatarStyle: 'photo-m1' | 'badge-ak' | 'photo-m2' | 'photo-f1' | 'photo-m3' | 'badge-kg' | 'photo-f2' | 'badge-mj';
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  status: 'Due' | 'Paid' | 'Overdue';
  transactions: Array<{
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    direction: 'in' | 'out';
  }>;
};

const SHOWCASE_CUSTOMERS: ShowcaseCustomerRow[] = [
  {
    id: 'cust-1',
    code: 'CUST-001',
    name: 'Amit Kumar',
    phone: '9876543210',
    email: 'amit.kumar@gmail.com',
    address: '123 Green Park, Delhi - 110016',
    groupTag: 'Retail Customer',
    segmentBadge: 'Regular',
    avatarStyle: 'photo-m1',
    totalPurchases: 28450,
    totalPaid: 20000,
    balance: 8450,
    status: 'Due',
    transactions: [
      {
        id: 'tx-1',
        title: 'Payment Received',
        subtitle: 'UPI • 12 Oct 2024, 10:32 AM',
        amount: 2000,
        direction: 'in',
      },
      {
        id: 'tx-2',
        title: 'Sale #ORD-1005',
        subtitle: 'POS • 10 Oct 2024, 04:21 PM',
        amount: 1250,
        direction: 'out',
      },
      {
        id: 'tx-3',
        title: 'Payment Received',
        subtitle: 'Cash • 08 Oct 2024, 11:15 AM',
        amount: 5000,
        direction: 'in',
      },
      {
        id: 'tx-4',
        title: 'Sale #ORD-0998',
        subtitle: 'Online Store • 05 Oct 2024, 02:10 PM',
        amount: 450,
        direction: 'out',
      },
    ],
  },
  {
    id: 'cust-2',
    code: 'CUST-002',
    name: 'Priya Sharma',
    phone: '9812345678',
    email: 'priya.sharma@gmail.com',
    address: '45 Hauz Khas Enclave, Delhi - 110016',
    groupTag: 'Retail Customer',
    segmentBadge: 'Regular',
    avatarStyle: 'badge-ak',
    totalPurchases: 12320,
    totalPaid: 12320,
    balance: 0,
    status: 'Paid',
    transactions: [
      {
        id: 'tx-21',
        title: 'Payment Received',
        subtitle: 'UPI • 11 Oct 2024, 06:15 PM',
        amount: 1320,
        direction: 'in',
      },
      {
        id: 'tx-22',
        title: 'Sale #ORD-1002',
        subtitle: 'Online Store • 10 Oct 2024, 01:20 PM',
        amount: 1320,
        direction: 'out',
      },
    ],
  },
  {
    id: 'cust-3',
    code: 'CUST-003',
    name: 'Rahul Mehta',
    phone: '9898765432',
    email: 'rahul.mehta@gmail.com',
    address: '78 Lajpat Nagar III, Delhi - 110024',
    groupTag: 'Wholesale Buyer',
    segmentBadge: 'VIP',
    avatarStyle: 'photo-m2',
    totalPurchases: 45680,
    totalPaid: 40000,
    balance: 5680,
    status: 'Due',
    transactions: [
      {
        id: 'tx-31',
        title: 'Payment Received',
        subtitle: 'UPI • 11 Oct 2024, 04:00 PM',
        amount: 10000,
        direction: 'in',
      },
      {
        id: 'tx-32',
        title: 'Sale #ORD-1001',
        subtitle: 'POS • 09 Oct 2024, 05:30 PM',
        amount: 5680,
        direction: 'out',
      },
    ],
  },
  {
    id: 'cust-4',
    code: 'CUST-004',
    name: 'Sneha Patel',
    phone: '9871234560',
    email: 'sneha.patel@gmail.com',
    address: 'B-14 Vasant Vihar, Delhi - 110057',
    groupTag: 'Retail Customer',
    segmentBadge: 'Regular',
    avatarStyle: 'photo-f1',
    totalPurchases: 18900,
    totalPaid: 18900,
    balance: 0,
    status: 'Paid',
    transactions: [
      {
        id: 'tx-41',
        title: 'Payment Received',
        subtitle: 'Card • 10 Oct 2024, 02:45 PM',
        amount: 1900,
        direction: 'in',
      },
    ],
  },
  {
    id: 'cust-5',
    code: 'CUST-005',
    name: 'Vikram Singh',
    phone: '9876543211',
    email: 'vikram.singh@gmail.com',
    address: '19 DLF Phase 3, Gurugram - 122002',
    groupTag: 'Wholesale Buyer',
    segmentBadge: 'Wholesale',
    avatarStyle: 'photo-m3',
    totalPurchases: 32450,
    totalPaid: 15000,
    balance: 17450,
    status: 'Overdue',
    transactions: [
      {
        id: 'tx-51',
        title: 'Sale #ORD-0995',
        subtitle: 'POS • 02 Oct 2024, 03:10 PM',
        amount: 17450,
        direction: 'out',
      },
    ],
  },
  {
    id: 'cust-6',
    code: 'CUST-006',
    name: 'Karan Gupta',
    phone: '9811002233',
    email: 'karan.gupta@gmail.com',
    address: 'Plot 88, Kalkaji, Delhi - 110019',
    groupTag: 'Retail Customer',
    segmentBadge: 'Regular',
    avatarStyle: 'badge-kg',
    totalPurchases: 8960,
    totalPaid: 8960,
    balance: 0,
    status: 'Paid',
    transactions: [
      {
        id: 'tx-61',
        title: 'Payment Received',
        subtitle: 'UPI • 09 Oct 2024, 11:40 AM',
        amount: 960,
        direction: 'in',
      },
    ],
  },
  {
    id: 'cust-7',
    code: 'CUST-007',
    name: 'Anita Verma',
    phone: '9899001122',
    email: 'anita.verma@gmail.com',
    address: '14 Saket Block J, Delhi - 110017',
    groupTag: 'Retail Customer',
    segmentBadge: 'Regular',
    avatarStyle: 'photo-f2',
    totalPurchases: 21340,
    totalPaid: 10000,
    balance: 11340,
    status: 'Due',
    transactions: [
      {
        id: 'tx-71',
        title: 'Sale #ORD-0998',
        subtitle: 'POS • 11 Oct 2024, 03:10 PM',
        amount: 560,
        direction: 'out',
      },
    ],
  },
  {
    id: 'cust-8',
    code: 'CUST-008',
    name: 'Sandeep Yadav',
    phone: '9877889900',
    email: 'sandeep.yadav@gmail.com',
    address: 'Sector 62, Noida - 201309',
    groupTag: 'Retail Customer',
    segmentBadge: 'New',
    avatarStyle: 'photo-m1',
    totalPurchases: 6780,
    totalPaid: 6780,
    balance: 0,
    status: 'Paid',
    transactions: [
      {
        id: 'tx-81',
        title: 'Payment Received',
        subtitle: 'UPI • 11 Oct 2024, 02:30 PM',
        amount: 890,
        direction: 'in',
      },
    ],
  },
  {
    id: 'cust-9',
    code: 'CUST-009',
    name: 'Neha Joshi',
    phone: '9871112233',
    email: 'neha.joshi@gmail.com',
    address: 'A-44 Malviya Nagar, Delhi - 110017',
    groupTag: 'Retail Customer',
    segmentBadge: 'Regular',
    avatarStyle: 'photo-f1',
    totalPurchases: 15600,
    totalPaid: 5000,
    balance: 10600,
    status: 'Overdue',
    transactions: [
      {
        id: 'tx-91',
        title: 'Sale #ORD-0996',
        subtitle: 'POS • 11 Oct 2024, 01:15 PM',
        amount: 340,
        direction: 'out',
      },
    ],
  },
  {
    id: 'cust-10',
    code: 'CUST-010',
    name: 'Meera Iyer',
    phone: '9870012345',
    email: 'meera.iyer@gmail.com',
    address: 'Flat 402, Defence Colony, Delhi - 110024',
    groupTag: 'Retail Customer',
    segmentBadge: 'Regular',
    avatarStyle: 'badge-mj',
    totalPurchases: 9450,
    totalPaid: 9450,
    balance: 0,
    status: 'Paid',
    transactions: [
      {
        id: 'tx-101',
        title: 'Payment Received',
        subtitle: 'UPI • 11 Oct 2024, 05:45 PM',
        amount: 980,
        direction: 'in',
      },
    ],
  },
];

function formatCustAmount(amount: number, symbol = '₹'): string {
  const rounded = Math.round(Number(amount) || 0);
  return `${symbol} ${rounded.toLocaleString('en-IN')}`;
}

function CustomerRowAvatar({
  styleType,
  name,
  size = 'md',
}: {
  styleType: ShowcaseCustomerRow['avatarStyle'];
  name: string;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-14 w-14 text-[16px]' : 'h-9 w-9 text-[12px]';

  if (styleType === 'badge-ak') {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[#38BDF8] font-bold text-white ${dim}`}
      >
        AK
      </div>
    );
  }
  if (styleType === 'badge-kg') {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[#A855F7] font-bold text-white ${dim}`}
      >
        KG
      </div>
    );
  }
  if (styleType === 'badge-mj') {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[#A855F7] font-bold text-white ${dim}`}
      >
        MJ
      </div>
    );
  }

  const palette = {
    'photo-m1': 'bg-gradient-to-br from-[#FDE68A] to-[#D97706] text-[#78350F]',
    'photo-m2': 'bg-gradient-to-br from-[#BFDBFE] to-[#2563EB] text-[#1E3A8A]',
    'photo-f1': 'bg-gradient-to-br from-[#FBCFE8] to-[#DB2777] text-[#831843]',
    'photo-m3': 'bg-gradient-to-br from-[#A7F3D0] to-[#059669] text-[#064E3B]',
    'photo-f2': 'bg-gradient-to-br from-[#FED7AA] to-[#EA580C] text-[#7C2D12]',
  }[styleType];

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative shrink-0">
      <div
        className={`flex items-center justify-center rounded-full font-extrabold shadow-2xs ${palette} ${dim}`}
      >
        {initials}
      </div>
      {size === 'lg' && (
        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#10B981]" />
      )}
    </div>
  );
}

export function BosCustomersKhataWorkstation({
  businessName,
  currencySymbol = '₹',
  customers,
  khataTransactions = [],
  initialOpenAddCustomer = false,
  demoMode = false,
  onAddCustomer,
  onUpdateCustomer,
  onRecordKhataEntry,
}: BosCustomersKhataWorkstationProps) {
  const { t, language } = useBosTranslation();
  const [subTab, setSubTab] = useState<CustomerSubTab>('all');
  const [inspectorTab, setInspectorTab] = useState<CustomerInspectorTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() =>
    demoMode ? 'cust-1' : (customers[0]?.id || '')
  );
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Interactive Balance & Payment overrides
  const [paidOverrides, setPaidOverrides] = useState<Record<string, number>>({});
  const [balanceOverrides, setBalanceOverrides] = useState<Record<string, number>>({});
  const [extraTxByCustomer, setExtraTxByCustomer] = useState<
    Record<string, ShowcaseCustomerRow['transactions']>
  >({});
  const [customTagsByCustomer, setCustomTagsByCustomer] = useState<
    Record<string, string[]>
  >({});

  // Modals / Inline Forms
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModeChoice, setPaymentModeChoice] = useState<'upi' | 'cash'>('upi');
  const [paymentAmountInput, setPaymentAmountInput] = useState('2000');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmountInput, setAdjustAmountInput] = useState('500');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(initialOpenAddCustomer);
  const [partyModalTab, setPartyModalTab] = useState<'general' | 'address' | 'credit'>('general');
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustomerSaving, setEditCustomerSaving] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
  });
  const [newCustomerForm, setNewCustomerForm] = useState({
    partyType: 'customer' as 'customer' | 'supplier',
    name: '',
    phone: '',
    email: '',
    gstin: '',
    gstType: 'unregistered' as 'unregistered' | 'regular' | 'composition' | 'overseas',
    state: 'Delhi (07)',
    billingAddress: '',
    shippingAddress: '',
    sameAsBilling: true,
    creditLimit: '',
    openingKhata: 0,
    openingBalanceType: 'receive' as 'receive' | 'pay',
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Build rows from showcase in demoMode or real database records in production
  const allRows = useMemo<ShowcaseCustomerRow[]>(() => {
    if (demoMode) {
      const runtimeAdded = customers
        .filter((c) => {
          const num = Number(c.id.replace(/\D/g, ''));
          return num > 10 && !SHOWCASE_CUSTOMERS.some((s) => s.name === c.name);
        })
        .map((c, idx) => ({
          id: c.id,
          code: `CUST-0${11 + idx}`,
          name: c.name,
          phone: c.phone.replace(/\+91\s*/, ''),
          email: c.email || `${c.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
          address: c.address || '123 Green Park, Delhi - 110016',
          groupTag: 'Retail Customer',
          segmentBadge: c.segment,
          avatarStyle: 'photo-m1' as const,
          totalPurchases: c.totalSpent || c.khataBalance,
          totalPaid: Math.max(0, (c.totalSpent || 0) - c.khataBalance),
          balance: Math.max(0, c.khataBalance),
          status: (c.khataBalance > 0 ? 'Due' : 'Paid') as 'Due' | 'Paid',
          transactions: [],
        }));

      return [...runtimeAdded, ...SHOWCASE_CUSTOMERS].map((row) => {
        const totalPaid =
          paidOverrides[row.id] !== undefined ? paidOverrides[row.id] : row.totalPaid;
        const balance =
          balanceOverrides[row.id] !== undefined
            ? balanceOverrides[row.id]
            : row.balance;
        const status: ShowcaseCustomerRow['status'] =
          balance <= 0 ? 'Paid' : row.status === 'Overdue' ? 'Overdue' : 'Due';
        const extraTx = extraTxByCustomer[row.id] || [];

        return {
          ...row,
          totalPaid,
          balance,
          status,
          transactions: [...extraTx, ...row.transactions],
        };
      });
    }

    // Production mode: purely map real customers and transactions
    return customers.map((c, idx) => {
      const basePaid = Math.max(0, (c.totalSpent || 0) - (c.khataBalance || 0));
      const totalPaid = paidOverrides[c.id] !== undefined ? paidOverrides[c.id] : basePaid;
      const balance =
        balanceOverrides[c.id] !== undefined
          ? balanceOverrides[c.id]
          : Math.max(0, c.khataBalance || 0);
      const status: ShowcaseCustomerRow['status'] = balance <= 0 ? 'Paid' : 'Due';
      const extraTx = extraTxByCustomer[c.id] || [];
      const realTx = khataTransactions
        .filter(
          (tx) =>
            tx.partyId === c.id ||
            tx.partyName.toLowerCase() === c.name.toLowerCase()
        )
        .map((tx) => ({
          id: tx.id,
          title: tx.note || (tx.type === 'got' ? 'Payment Received' : 'Udhar / Credit Given'),
          subtitle: `${(tx.mode || 'cash').toUpperCase()} • ${tx.createdAt}`,
          amount: tx.amount,
          direction: (tx.type === 'got' ? 'in' : 'out') as 'in' | 'out',
        }));

      return {
        id: c.id,
        code: `CUST-${String(idx + 1).padStart(3, '0')}`,
        name: c.name,
        phone: c.phone.replace(/\+91\s*/, ''),
        email: c.email || '',
        address: c.address || '',
        groupTag: 'Retail Customer',
        segmentBadge: c.segment || 'Regular',
        avatarStyle: 'photo-m1' as const,
        totalPurchases: c.totalSpent || balance,
        totalPaid,
        balance,
        status,
        transactions: [...extraTx, ...realTx],
      };
    });
  }, [customers, demoMode, khataTransactions, paidOverrides, balanceOverrides, extraTxByCustomer]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((row) => {
      if (subTab === 'credit' && row.balance <= 0) return false;
      if (subTab === 'regular' && row.segmentBadge !== 'Regular') return false;
      if (subTab === 'new' && row.segmentBadge !== 'New') return false;

      if (groupFilter !== 'all' && row.groupTag !== groupFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (
        locationFilter !== 'all' &&
        !row.address.toLowerCase().includes(locationFilter.toLowerCase())
      ) {
        return false;
      }

      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q)
      );
    });
  }, [allRows, subTab, groupFilter, statusFilter, locationFilter, searchQuery]);

  const visibleRows = useMemo(() => {
    return filteredRows.slice(0, pageSize);
  }, [filteredRows, pageSize]);

  const selectedCustomer = useMemo(() => {
    return (
      allRows.find((r) => r.id === selectedCustomerId) ||
      filteredRows[0] ||
      allRows[0]
    );
  }, [allRows, filteredRows, selectedCustomerId]);

  const kpiStats = useMemo(() => {
    if (demoMode) {
      return {
        totalCustomers: '248',
        totalReceivable: `${currencySymbol} 48,320`,
        totalReceived: `${currencySymbol} 1,24,580`,
        overdueAmount: `${currencySymbol} 12,450`,
        custTrend: '↑ 12%',
        recTrend: '↑ 8%',
        receivedTrend: '↑ 24%',
        overdueTrend: '↑ 18%',
      };
    }
    const totalCustomers = allRows.length;
    const totalReceivable = allRows.reduce((sum, r) => sum + Math.max(0, r.balance), 0);
    const totalReceived = allRows.reduce((sum, r) => sum + Math.max(0, r.totalPaid), 0);
    const overdueAmount = allRows
      .filter((r) => r.status === 'Overdue')
      .reduce((sum, r) => sum + Math.max(0, r.balance), 0);
    return {
      totalCustomers: String(totalCustomers),
      totalReceivable: formatCustAmount(totalReceivable, currencySymbol),
      totalReceived: formatCustAmount(totalReceived, currencySymbol),
      overdueAmount: formatCustAmount(overdueAmount, currencySymbol),
      custTrend: totalCustomers > 0 ? 'Active' : '—',
      recTrend: totalReceivable > 0 ? 'Pending' : 'Settled',
      receivedTrend: totalReceived > 0 ? 'Received' : '—',
      overdueTrend: overdueAmount > 0 ? 'Overdue' : 'Clear',
    };
  }, [allRows, currencySymbol, demoMode]);

  const tabCounts = useMemo(() => {
    if (demoMode) {
      return { all: 248, credit: 62, regular: 156, new: 30 };
    }
    return {
      all: allRows.length,
      credit: allRows.filter((r) => r.balance > 0).length,
      regular: allRows.filter((r) => r.segmentBadge === 'Regular').length,
      new: allRows.filter((r) => r.segmentBadge === 'New').length,
    };
  }, [allRows, demoMode]);

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

  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const handleSendWhatsAppReminder = async (row: ShowcaseCustomerRow) => {
    const cleanPhone = row.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      showToastMsg('No valid customer phone number for WhatsApp');
      return;
    }
    const dueText = formatCustAmount(Math.max(0, row.balance), currencySymbol);
    const msg = `Namaste ${row.name} 🙏,\nThis is a friendly reminder from *${businessName}* regarding your pending Khata balance of *${dueText}*.\nYou can pay conveniently via UPI or at the store. Thank you!`;

    setSendingReminderId(row.id);
    try {
      const res = await authFetch('/api/commerce/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message: msg }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToastMsg(`Khata reminder sent to ${row.name} via Meta Cloud API!`);
      } else {
        showToastMsg('Meta Cloud: Opening WhatsApp Web chat...');
        window.open(
          `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } catch {
      window.open(
        `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`,
        '_blank',
        'noopener,noreferrer',
      );
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleRecordPaymentSubmit = async () => {
    if (!selectedCustomer) return;
    const amt = Number(paymentAmountInput) || 0;
    if (amt <= 0) return;

    const prevPaid = paidOverrides[selectedCustomer.id];
    const prevBalance = balanceOverrides[selectedCustomer.id];
    const prevExtraTx = extraTxByCustomer[selectedCustomer.id];
    const nextPaid = selectedCustomer.totalPaid + amt;
    const nextBalance = Math.max(0, selectedCustomer.balance - amt);
    setPaidOverrides((prev) => ({ ...prev, [selectedCustomer.id]: nextPaid }));
    setBalanceOverrides((prev) => ({ ...prev, [selectedCustomer.id]: nextBalance }));
    setExtraTxByCustomer((prev) => ({
      ...prev,
      [selectedCustomer.id]: [
        {
          id: `tx-now-${Date.now()}`,
          title: 'Payment Received',
          subtitle: `${paymentModeChoice.toUpperCase()} • Just now`,
          amount: amt,
          direction: 'in',
        },
        ...(prev[selectedCustomer.id] || []),
      ],
    }));

    try {
      await onRecordKhataEntry({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        type: 'got',
        amount: amt,
        mode: paymentModeChoice,
        note: 'Payment Received',
      });
      setShowPaymentModal(false);
      showToastMsg(
        `Recorded ${formatCustAmount(amt, currencySymbol)} payment from ${selectedCustomer.name}`,
      );
    } catch {
      // Rollback optimistic state on failure.
      setPaidOverrides((prev) => { const n = { ...prev }; if (prevPaid === undefined) delete n[selectedCustomer.id]; else n[selectedCustomer.id] = prevPaid; return n; });
      setBalanceOverrides((prev) => { const n = { ...prev }; if (prevBalance === undefined) delete n[selectedCustomer.id]; else n[selectedCustomer.id] = prevBalance; return n; });
      setExtraTxByCustomer((prev) => { const n = { ...prev }; if (!prevExtraTx) delete n[selectedCustomer.id]; else n[selectedCustomer.id] = prevExtraTx; return n; });
      showToastMsg('Failed to record payment. Please try again.');
    }
  };

  const handleAdjustBalanceSubmit = async () => {
    if (!selectedCustomer) return;
    const amt = Number(adjustAmountInput) || 0;
    if (amt <= 0) return;

    const prevBalance = balanceOverrides[selectedCustomer.id];
    const prevExtraTx = extraTxByCustomer[selectedCustomer.id];
    const nextBalance = selectedCustomer.balance + amt;
    setBalanceOverrides((prev) => ({ ...prev, [selectedCustomer.id]: nextBalance }));
    setExtraTxByCustomer((prev) => ({
      ...prev,
      [selectedCustomer.id]: [
        {
          id: `tx-adj-${Date.now()}`,
          title: 'Credit / Udhar Added',
          subtitle: 'Manual Adjustment • Just now',
          amount: amt,
          direction: 'out',
        },
        ...(prev[selectedCustomer.id] || []),
      ],
    }));

    try {
      await onRecordKhataEntry({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        type: 'gave',
        amount: amt,
        mode: 'credit',
        note: 'Balance Adjustment',
      });

      setShowAdjustModal(false);
      showToastMsg(
        `Adjusted balance for ${selectedCustomer.name} by ${formatCustAmount(amt, currencySymbol)}`,
      );
    } catch {
      // Rollback optimistic state on failure
      setBalanceOverrides((prev) => { const n = { ...prev }; if (prevBalance === undefined) delete n[selectedCustomer.id]; else n[selectedCustomer.id] = prevBalance; return n; });
      setExtraTxByCustomer((prev) => { const n = { ...prev }; if (!prevExtraTx) delete n[selectedCustomer.id]; else n[selectedCustomer.id] = prevExtraTx; return n; });
      showToastMsg('Failed to adjust balance. Please try again.');
    }
  };

  const handleCreateCustomerSubmit = async (e?: React.FormEvent, saveAndNew: boolean = false) => {
    if (e) e.preventDefault();
    if (!newCustomerForm.name.trim()) return;
    const customerName = newCustomerForm.name.trim();
    await onAddCustomer({
      name: customerName,
      phone: newCustomerForm.phone.trim(),
      email: newCustomerForm.email.trim() || undefined,
      address: newCustomerForm.billingAddress.trim() || undefined,
      billingAddress: newCustomerForm.billingAddress.trim() || undefined,
      shippingAddress: (newCustomerForm.sameAsBilling ? newCustomerForm.billingAddress.trim() : newCustomerForm.shippingAddress.trim()) || undefined,
      gstin: newCustomerForm.gstin.trim() || undefined,
      gstType: newCustomerForm.gstType,
      state: newCustomerForm.state,
      partyType: newCustomerForm.partyType,
      creditLimit: newCustomerForm.creditLimit ? Number(newCustomerForm.creditLimit) : undefined,
      openingBalance: Number(newCustomerForm.openingKhata) || 0,
      openingBalanceType: newCustomerForm.openingBalanceType === 'pay' ? 'payable' : 'receivable',
      segment: 'Regular',
      ordersCount: 0,
      totalSpent: Number(newCustomerForm.openingKhata) || 0,
      khataBalance: Number(newCustomerForm.openingKhata) || 0,
      loyaltyPoints: 0,
      lastVisit: 'New',
    });

    showToastMsg(`Saved party "${customerName}" (${newCustomerForm.partyType === 'supplier' ? 'Supplier' : 'Customer'})`);

    if (saveAndNew) {
      setNewCustomerForm({
        partyType: newCustomerForm.partyType,
        name: '',
        phone: '',
        email: '',
        gstin: '',
        gstType: 'unregistered',
        state: 'Delhi (07)',
        billingAddress: '',
        shippingAddress: '',
        sameAsBilling: true,
        creditLimit: '',
        openingKhata: 0,
        openingBalanceType: 'receive',
      });
      setPartyModalTab('general');
    } else {
      setShowAddCustomerModal(false);
      setNewCustomerForm({
        partyType: 'customer',
        name: '',
        phone: '',
        email: '',
        gstin: '',
        gstType: 'unregistered',
        state: 'Delhi (07)',
        billingAddress: '',
        shippingAddress: '',
        sameAsBilling: true,
        creditLimit: '',
        openingKhata: 0,
        openingBalanceType: 'receive',
      });
    }
  };

  const handleOpenEditCustomer = () => {
    if (!selectedCustomer) return;
    const realCustomer = customers.find((c) => c.id === selectedCustomer.id);
    const existingGstin = realCustomer?.gstin || (selectedCustomer as any).gstin || '';
    setEditCustomerForm({
      name: selectedCustomer.name || '',
      phone: selectedCustomer.phone || '',
      email: selectedCustomer.email || '',
      address: selectedCustomer.address || '',
      gstin: existingGstin,
    });
    setShowEditCustomerModal(true);
  };

  const handleSaveEditCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCustomer || !editCustomerForm.name.trim()) return;
    setEditCustomerSaving(true);
    try {
      if (onUpdateCustomer) {
        await onUpdateCustomer({
          id: selectedCustomer.id,
          name: editCustomerForm.name.trim(),
          phone: editCustomerForm.phone.trim(),
          email: editCustomerForm.email.trim() || undefined,
          address: editCustomerForm.address.trim() || undefined,
          gstin: editCustomerForm.gstin.trim() || undefined,
        });
      } else {
        const res = await authFetch(`/api/commerce/customers/${encodeURIComponent(selectedCustomer.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editCustomerForm),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || 'Failed to update customer');
        }
      }
      showToastMsg(`Customer "${editCustomerForm.name.trim()}" updated successfully.`);
      setShowEditCustomerModal(false);
    } catch (err: any) {
      showToastMsg(err?.message || 'Failed to update customer.');
    } finally {
      setEditCustomerSaving(false);
    }
  };

  const handleDownloadPartyStatement = (customer: ShowcaseCustomerRow) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Party Ledger - ${customer.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 24px; }
            .brand { font-size: 22px; font-weight: 800; color: #059669; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; }
            .grid { display: flex; gap: 16px; margin-bottom: 24px; }
            .card { flex: 1; padding: 14px 18px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
            .card-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .card-val { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; color: #334155; }
            .in { color: #059669; font-weight: 700; }
            .out { color: #dc2626; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${businessName}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Party Account Statement (Khata Ledger)</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 15px; font-weight: 800;">${customer.name}</div>
              <div style="font-size: 12px; color: #64748b;">Phone: +91 ${customer.phone}</div>
              <div style="font-size: 12px; color: #64748b;">Address: ${customer.address || 'Local'}</div>
              <div class="badge" style="margin-top: 6px;">${customer.status === 'Paid' ? 'Account Settled' : 'Balance Pending'}</div>
            </div>
          </div>
          <div class="grid">
            <div class="card"><div class="card-title">Total Purchases</div><div class="card-val">${currencySymbol} ${customer.totalPurchases.toLocaleString('en-IN')}</div></div>
            <div class="card"><div class="card-title">Total Paid</div><div class="card-val" style="color: #059669;">${currencySymbol} ${customer.totalPaid.toLocaleString('en-IN')}</div></div>
            <div class="card"><div class="card-title">Net Balance Due</div><div class="card-val" style="color: ${customer.balance > 0 ? '#dc2626' : '#059669'};">${currencySymbol} ${customer.balance.toLocaleString('en-IN')}</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Date / Time</th><th>Voucher / Description</th><th>Type</th><th style="text-align:right;">Debit (+)</th><th style="text-align:right;">Credit (-)</th></tr>
            </thead>
            <tbody>
              ${customer.transactions.map(t => `
                <tr>
                  <td>${t.subtitle}</td>
                  <td style="font-weight: 600;">${t.title}</td>
                  <td>${t.direction === 'in' ? 'Payment Received' : 'Invoice / Debit'}</td>
                  <td style="text-align: right;" class="${t.direction === 'out' ? 'out' : ''}">${t.direction === 'out' ? `${currencySymbol} ${t.amount.toLocaleString('en-IN')}` : '—'}</td>
                  <td style="text-align: right;" class="${t.direction === 'in' ? 'in' : ''}">${t.direction === 'in' ? `${currencySymbol} ${t.amount.toLocaleString('en-IN')}` : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center;">Computer generated ledger statement • Generated via ServiceOS BOS</div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Customer Code',
      'Name',
      'Phone',
      'Total Purchases',
      'Total Paid',
      'Balance',
      'Status',
    ];
    const rows = allRows.map((r) => [
      r.code,
      `"${r.name}"`,
      r.phone,
      r.totalPurchases,
      r.totalPaid,
      r.balance,
      r.status,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bos-customers-khata-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToastMsg('Exported Customers & Khata CSV');
  };

  return (
    <div className="w-full space-y-3.5 pb-6">
      {/* Page Title & Top Right Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827] leading-tight">
            {language === 'hi' ? 'ग्राहक और उधारी खाता' : language === 'both' ? 'Customers & Khata / खाता' : 'Customers & Khata'}
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            {language === 'hi'
              ? 'ग्राहक, उधारी (क्रेडिट), भुगतान और लेन-देन का विवरण प्रबंधित करें।'
              : 'Manage your customers, credit/udhar, payments and transaction history.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              showToastMsg('Customer CSV & Contacts Import ready')
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Upload className="h-4 w-4 text-[#475569]" />
            <span>{language === 'hi' ? 'इम्पोर्ट' : language === 'both' ? 'Import / इम्पोर्ट' : 'Import'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-4 py-2 text-[13px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#475569]" />
            <span>{language === 'hi' ? 'एक्सपोर्ट' : language === 'both' ? 'Export / एक्सपोर्ट' : 'Export'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A6847] px-4 py-2 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{language === 'hi' ? '+ नया ग्राहक' : language === 'both' ? '+ Customer / नया ग्राहक' : 'Add Customer'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2 text-[12.5px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {toast}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Top KPI Summary Cards with Area Sparklines */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total Customers */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#64748B]">
                {language === 'hi' ? 'कुल ग्राहक' : language === 'both' ? 'Total Customers / कुल ग्राहक' : 'Total Customers'}
              </p>
              <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
                {kpiStats.totalCustomers}
              </p>
              <p className="mt-0.5 text-[11.5px] font-bold text-[#0A7B56]">{kpiStats.custTrend}</p>
            </div>
          </div>
          <svg viewBox="0 0 84 36" className="h-9 w-20 shrink-0 overflow-visible" fill="none">
            <defs>
              <linearGradient id="custGreen1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M2 30 L 18 24 L 34 26 L 52 16 L 68 18 L 82 6 L 82 34 L 2 34 Z"
              fill="url(#custGreen1)"
            />
            <path
              d="M2 30 L 18 24 L 34 26 L 52 16 L 68 18 L 82 6"
              stroke="#0A7B56"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 2: Total Receivable */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#EF4444]">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#64748B]">
                {language === 'hi' ? 'कुल बाकी (उधारी)' : language === 'both' ? 'Total Udhaar / कुल बाकी' : 'Total Receivable'}
              </p>
              <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
                {kpiStats.totalReceivable}
              </p>
              <p className="mt-0.5 text-[11.5px] font-bold text-[#EF4444]">{kpiStats.recTrend}</p>
            </div>
          </div>
          <svg viewBox="0 0 84 36" className="h-9 w-20 shrink-0 overflow-visible" fill="none">
            <defs>
              <linearGradient id="custRed1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M2 30 L 18 25 L 34 27 L 52 16 L 68 19 L 82 7 L 82 34 L 2 34 Z"
              fill="url(#custRed1)"
            />
            <path
              d="M2 30 L 18 25 L 34 27 L 52 16 L 68 19 L 82 7"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 3: Total Received */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#64748B]">
                {language === 'hi' ? 'कुल जमा राशि' : language === 'both' ? 'Total Received / कुल जमा' : 'Total Received'}
              </p>
              <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
                {kpiStats.totalReceived}
              </p>
              <p className="mt-0.5 text-[11.5px] font-bold text-[#0A7B56]">{kpiStats.receivedTrend}</p>
            </div>
          </div>
          <svg viewBox="0 0 84 36" className="h-9 w-20 shrink-0 overflow-visible" fill="none">
            <defs>
              <linearGradient id="custGreen2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M2 30 L 18 24 L 34 26 L 52 16 L 68 18 L 82 6 L 82 34 L 2 34 Z"
              fill="url(#custGreen2)"
            />
            <path
              d="M2 30 L 18 24 L 34 26 L 52 16 L 68 18 L 82 6"
              stroke="#0A7B56"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card 4: Overdue Amount */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#EF4444]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#64748B]">
                Overdue Amount
              </p>
              <p className="mt-0.5 text-[22px] font-extrabold text-[#111827] leading-tight">
                {kpiStats.overdueAmount}
              </p>
              <p className="mt-0.5 text-[11.5px] font-bold text-[#EF4444]">{kpiStats.overdueTrend}</p>
            </div>
          </div>
          <svg viewBox="0 0 84 36" className="h-9 w-20 shrink-0 overflow-visible" fill="none">
            <defs>
              <linearGradient id="custRed2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M2 30 L 18 25 L 34 27 L 52 16 L 68 19 L 82 7 L 82 34 L 2 34 Z"
              fill="url(#custRed2)"
            />
            <path
              d="M2 30 L 18 25 L 34 27 L 52 16 L 68 19 L 82 7"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Main Split Workspace: Left Customers Table (8 cols) + Right Customer Inspector (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Panel: Sub-Tabs, Filter Toolbar, Table & Pagination */}
        <div className="lg:col-span-8 rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
          {/* Underline Sub-Tabs with Counts + More Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EBF2EE] px-4 pt-2">
            <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'All Customers', count: tabCounts.all },
                  { id: 'credit', label: 'Credit Customers', count: tabCounts.credit },
                  { id: 'regular', label: 'Regular Customers', count: tabCounts.regular },
                  { id: 'new', label: 'New Customers', count: tabCounts.new },
                ] as const
              ).map((tab) => {
                const active = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubTab(tab.id)}
                    className={`relative inline-flex shrink-0 items-center gap-2 pb-3 pt-1 text-[13px] transition cursor-pointer ${
                      active
                        ? 'font-bold text-[#0A6847]'
                        : 'font-medium text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                        active
                          ? 'bg-[#0A6847] text-white'
                          : 'bg-[#EEF2F6] text-[#475569]'
                      }`}
                    >
                      {tab.count}
                    </span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setSubTab('all');
                setGroupFilter('all');
                setStatusFilter('all');
                setLocationFilter('all');
                setSearchQuery('');
              }}
              className="mb-1.5 inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#64748B]" />
              <span>More Filters</span>
            </button>
          </div>

          {/* Search & Dropdown Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EBF2EE] px-4 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or customer code..."
                className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] pl-9 pr-3 text-[12.5px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
              />
            </div>

            <select
              aria-label="Customer group filter"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Groups</option>
              <option value="Retail Customer">Retail Customer</option>
              <option value="Wholesale Buyer">Wholesale Buyer</option>
            </select>

            <select
              aria-label="Customer status filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Due">Due</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>

            <select
              aria-label="Location filter"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-9 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-medium text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Locations</option>
              <option value="Delhi">Delhi</option>
              <option value="Gurugram">Gurugram</option>
              <option value="Noida">Noida</option>
            </select>

            <button
              type="button"
              onClick={() => {}}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A6847] text-white shadow-2xs hover:bg-[#085238] cursor-pointer"
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Customers & Khata Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11.5px] font-semibold text-[#475569]">
                  <th className="w-10 py-3 pl-4 pr-2">
                    <input
                      type="checkbox"
                      aria-label="Select all customers"
                      checked={
                        visibleRows.length > 0 &&
                        selectedRowIds.length === visibleRows.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-2.5">Customer</th>
                  <th className="py-3 px-2.5">Phone</th>
                  <th className="py-3 px-2.5">Total Purchases</th>
                  <th className="py-3 px-2.5">Total Paid</th>
                  <th className="py-3 px-2.5">Balance ({currencySymbol})</th>
                  <th className="py-3 px-2.5">Status</th>
                  <th className="py-3 pl-2 pr-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[13px] text-[#64748B]">
                      No customers found. Click &quot;Add Customer&quot; to register your first customer.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const isSelected = selectedCustomer?.id === row.id;
                    const isChecked = selectedRowIds.includes(row.id);

                    const statusPillCls =
                      row.status === 'Paid'
                        ? 'bg-[#E6F6F0] text-[#0A7B56]'
                        : 'bg-[#FEE2E2] text-[#DC2626]';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedCustomerId(row.id)}
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
                            aria-label={`Select ${row.name}`}
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-[#CBD5E1] accent-[#0A6847] cursor-pointer"
                          />
                        </td>

                        {/* Customer Avatar + Name + Code */}
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <CustomerRowAvatar
                              styleType={row.avatarStyle}
                              name={row.name}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-[#111827] truncate">
                                {row.name}
                              </p>
                              <p className="text-[11px] font-medium text-[#64748B]">
                                {row.code}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-2.5 px-2.5 font-medium text-[#334155]">
                          {row.phone}
                        </td>

                        {/* Total Purchases */}
                        <td className="py-2.5 px-2.5 font-semibold text-[#111827]">
                          {formatCustAmount(row.totalPurchases, currencySymbol)}
                        </td>

                        {/* Total Paid */}
                        <td className="py-2.5 px-2.5 font-semibold text-[#111827]">
                          {formatCustAmount(row.totalPaid, currencySymbol)}
                        </td>

                        {/* Balance */}
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`font-extrabold ${
                              row.balance === 0 ? 'text-[#0A7B56]' : 'text-[#111827]'
                            }`}
                          >
                            {formatCustAmount(row.balance, currencySymbol)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillCls}`}
                          >
                            {row.status}
                          </span>
                        </td>

                        {/* Actions Kebab */}
                        <td className="py-2.5 pl-2 pr-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerId(row.id);
                            }}
                            aria-label={`Actions for ${row.name}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EBF2EE] hover:text-[#111827]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-2.5 border-t border-[#EBF2EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] font-medium text-[#64748B]">
              Showing {filteredRows.length === 0 ? 0 : 1}–{Math.min(pageSize, filteredRows.length)} of {allRows.length} customers
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-[12px] font-semibold text-[#334155]">
                  Page {currentPage} of {Math.max(1, Math.ceil(filteredRows.length / pageSize))}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.max(1, Math.ceil(filteredRows.length / pageSize)), p + 1)
                    )
                  }
                  disabled={currentPage >= Math.max(1, Math.ceil(filteredRows.length / pageSize))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6] disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <select
                aria-label="Customers per page"
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

        {/* Right Panel: Customer Profile & Khata Inspector */}
        {!selectedCustomer ? (
          <div className="lg:col-span-4 rounded-2xl border border-[#DCE9E3] bg-white p-8 shadow-2xs text-center text-[#64748B]">
            <Users className="mx-auto h-10 w-10 text-[#94A3B8] mb-3 stroke-1" />
            <h3 className="text-[15px] font-bold text-[#1E293B]">No Customer Selected</h3>
            <p className="text-[12.5px] mt-1 text-[#64748B]">
              Add your first customer using the &quot;Add Customer&quot; button to inspect their profile, Khata balance and history.
            </p>
          </div>
        ) : (
          <div className="lg:col-span-4 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
            {/* Profile Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <CustomerRowAvatar
                  styleType={selectedCustomer.avatarStyle}
                  name={selectedCustomer.name}
                  size="lg"
                />
                <div>
                  <h2 className="text-[17px] font-extrabold text-[#111827] leading-snug">
                    {selectedCustomer.name}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#64748B]">
                      {selectedCustomer.code}
                    </span>
                    <span className="rounded-full bg-[#E6F6F0] px-2 py-0.2 text-[11px] font-bold text-[#0A7B56]">
                      {selectedCustomer.segmentBadge}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenEditCustomer}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-[#0A7B56]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                  aria-label="More customer options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Underline Inspector Tabs: Overview | Transactions | Orders | Notes | Settings */}
            <div className="flex items-center gap-4 border-b border-[#EBF2EE] overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'transactions', label: 'Transactions' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'notes', label: 'Notes' },
                  { id: 'settings', label: 'Settings' },
                ] as const
              ).map((t) => {
                const active = inspectorTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInspectorTab(t.id)}
                    className={`relative shrink-0 pb-2 text-[12.5px] transition cursor-pointer ${
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

            {/* Contact Info & Tag Pills */}
            <div className="space-y-2 text-[12.5px]">
              <div className="flex items-center gap-2 text-[#1E293B]">
                <Phone className="h-3.5 w-3.5 text-[#64748B]" />
                <span className="font-semibold">{selectedCustomer.phone}</span>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReminder(selectedCustomer)}
                  className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#10B981] text-white"
                  title="WhatsApp Customer"
                >
                  <MessageCircle className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[#475569]">
                <Mail className="h-3.5 w-3.5 text-[#64748B]" />
                <span>{selectedCustomer.email}</span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[#475569]">
                <span className="flex items-center gap-2 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                  <span className="truncate">{selectedCustomer.address}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://maps.google.com/?q=${encodeURIComponent(selectedCustomer.address)}`,
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                  className="text-[11.5px] font-semibold text-[#2563EB] hover:underline shrink-0 cursor-pointer"
                >
                  View on Map
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2ECE7] bg-[#F8FCFA] px-2.5 py-1 text-[11.5px] font-medium text-[#334155]">
                  <Store className="h-3 w-3 text-[#64748B]" />
                  <span>{selectedCustomer.groupTag}</span>
                </span>
                {(customTagsByCustomer[selectedCustomer.id] || []).map((tg) => (
                  <span
                    key={tg}
                    className="inline-flex items-center rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-semibold text-[#0A6847]"
                  >
                    {tg}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCustomTagsByCustomer((prev) => ({
                      ...prev,
                      [selectedCustomer.id]: [
                        ...(prev[selectedCustomer.id] || []),
                        'Monthly Khata',
                      ],
                    }));
                    showToastMsg(`Added tag to ${selectedCustomer.name}`);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E2ECE7] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#475569] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Tag</span>
                </button>
              </div>
            </div>

            {/* 3-Column Financial Summary Box */}
            <div className="grid grid-cols-3 divide-x divide-[#EBF2EE] rounded-xl border border-[#EBF2EE] bg-[#F9FCFA] p-3">
              <div className="pr-2">
                <p className="text-[11px] font-medium text-[#64748B]">
                  Total Purchases
                </p>
                <p className="mt-0.5 text-[16px] font-extrabold text-[#111827]">
                  {formatCustAmount(selectedCustomer.totalPurchases, currencySymbol)}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[11px] font-medium text-[#64748B]">Total Paid</p>
                <p className="mt-0.5 text-[16px] font-extrabold text-[#111827]">
                  {formatCustAmount(selectedCustomer.totalPaid, currencySymbol)}
                </p>
              </div>
              <div className="pl-2">
                <p className="text-[11px] font-medium text-[#64748B]">Balance</p>
                <p
                  className={`mt-0.5 text-[16px] font-extrabold ${
                    selectedCustomer.balance > 0
                      ? 'text-[#EF4444]'
                      : 'text-[#0A7B56]'
                  }`}
                >
                  {formatCustAmount(selectedCustomer.balance, currencySymbol)}
                </p>
              </div>
            </div>

            {/* Inline Record Payment Drawer */}
            {showPaymentModal && (
              <div className="rounded-xl border border-[#BCE3D4] bg-[#F2FAF6] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#0A6847]">
                    Record Payment ({selectedCustomer.name})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="text-[11px] font-semibold text-[#64748B]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-28 rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12.5px] font-bold"
                  />
                  <select
                    value={paymentModeChoice}
                    onChange={(e) =>
                      setPaymentModeChoice(e.target.value as 'upi' | 'cash')
                    }
                    className="rounded-lg border border-[#DCE9E3] bg-white px-2 py-1.5 text-[12px] font-semibold"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleRecordPaymentSubmit()}
                    className="rounded-lg bg-[#0A6847] px-3 py-1.5 text-[12px] font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Inline Adjust Balance Drawer */}
            {showAdjustModal && (
              <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#1E293B]">
                    Add Credit / Adjust Balance ({currencySymbol})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="text-[11px] font-semibold text-[#64748B]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={adjustAmountInput}
                    onChange={(e) => setAdjustAmountInput(e.target.value)}
                    className="w-28 rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12.5px] font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAdjustBalanceSubmit()}
                    className="rounded-lg bg-[#0A6847] px-3 py-1.5 text-[12px] font-semibold text-white"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* 2x2 Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal((prev) => !prev);
                  setShowAdjustModal(false);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A6847] px-3 py-2.5 text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Record Payment</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  showToastMsg(`Invoice draft opened for ${selectedCustomer.name}`)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#BCE3D4] bg-[#F2FAF6] px-3 py-2.5 text-[12.5px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] transition cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Create Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAdjustModal((prev) => !prev);
                  setShowPaymentModal(false);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12.5px] font-semibold text-[#334155] hover:bg-[#F1F5F9] transition cursor-pointer"
              >
                <span className="font-bold text-[#475569]">{currencySymbol}</span>
                <span>Adjust Balance</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsAppReminder(selectedCustomer)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12.5px] font-semibold text-[#334155] hover:bg-[#F1F5F9] transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-[#475569]" />
                <span>Send Reminder</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPartyStatement(selectedCustomer)}
                className="col-span-2 mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] px-3 py-2 text-[12px] font-bold text-[#1E293B] hover:bg-[#F1FAF5] transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#0A6847]" />
                <span>Download Party Statement / Ledger</span>
              </button>
            </div>

            {/* Recent Transactions List */}
            <div className="pt-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13.5px] font-extrabold text-[#111827]">
                  Recent Transactions
                </h3>
                <button
                  type="button"
                  onClick={() => setInspectorTab('transactions')}
                  className="text-[12px] font-bold text-[#0A7B56] hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>

              <div className="divide-y divide-[#EEF5F1]">
                {selectedCustomer.transactions.map((tx) => {
                  const isIn = tx.direction === 'in';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            isIn
                              ? 'bg-[#E6F6F0] text-[#0A7B56]'
                              : 'bg-[#FEE2E2] text-[#EF4444]'
                          }`}
                        >
                          {isIn ? (
                            <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-[#111827] truncate">
                            {tx.title}
                          </p>
                          <p className="text-[11px] text-[#64748B] truncate">
                            {tx.subtitle}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[13px] font-extrabold shrink-0 ${
                          isIn ? 'text-[#0A7B56]' : 'text-[#EF4444]'
                        }`}
                      >
                        {isIn ? '+' : '-'} {formatCustAmount(tx.amount, currencySymbol)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Add Party Dialog (Screenshot 5 matching) */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-[16px] font-extrabold text-[#111827]">
                  Add Party
                </h3>
                {/* Party Type Toggle: Customer vs Supplier */}
                <div className="inline-flex rounded-lg border border-[#DCE9E3] bg-[#F8FAFC] p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setNewCustomerForm((s) => ({ ...s, partyType: 'customer' }))
                    }
                    className={`rounded-md px-3 py-1 text-[11.5px] font-bold transition cursor-pointer ${
                      newCustomerForm.partyType === 'customer'
                        ? 'bg-[#0A6847] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewCustomerForm((s) => ({ ...s, partyType: 'supplier' }))
                    }
                    className={`rounded-md px-3 py-1 text-[11.5px] font-bold transition cursor-pointer ${
                      newCustomerForm.partyType === 'supplier'
                        ? 'bg-[#0A6847] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    Supplier
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sub-tabs inside Party Dialog */}
            <div className="flex items-center gap-4 border-b border-[#EBF2EE] pt-2 px-1 text-[12px]">
              {(
                [
                  { id: 'general', label: 'General & GST' },
                  { id: 'address', label: 'Address Details' },
                  { id: 'credit', label: 'Credit & Balances' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPartyModalTab(tab.id)}
                  className={`pb-2 font-bold transition border-b-2 cursor-pointer ${
                    partyModalTab === tab.id
                      ? 'border-[#0A6847] text-[#0A6847]'
                      : 'border-transparent text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => void handleCreateCustomerSubmit(e, false)}
              className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1 text-[12px]"
            >
              {partyModalTab === 'general' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        Party Name <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newCustomerForm.name}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({ ...s, name: e.target.value }))
                        }
                        placeholder="e.g. Ramesh Traders"
                        className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px] font-medium"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        Contact Phone <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={newCustomerForm.phone}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({ ...s, phone: e.target.value }))
                        }
                        placeholder="9876543210"
                        className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        value={newCustomerForm.gstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setNewCustomerForm((s) => ({
                            ...s,
                            gstin: val,
                            gstType: val.length >= 15 ? 'regular' : s.gstType,
                          }));
                        }}
                        placeholder="07AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12px] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        GST Type
                      </label>
                      <select
                        value={newCustomerForm.gstType}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({
                            ...s,
                            gstType: e.target.value as any,
                          }))
                        }
                        className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2 text-[12px]"
                      >
                        <option value="unregistered">Unregistered / Consumer</option>
                        <option value="regular">Registered Regular</option>
                        <option value="composition">Composition</option>
                        <option value="overseas">Overseas / SEZ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        State
                      </label>
                      <select
                        value={newCustomerForm.state}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({ ...s, state: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2 text-[12px]"
                      >
                        <option value="Delhi (07)">Delhi (07)</option>
                        <option value="Maharashtra (27)">Maharashtra (27)</option>
                        <option value="Uttar Pradesh (09)">Uttar Pradesh (09)</option>
                        <option value="Haryana (06)">Haryana (06)</option>
                        <option value="Karnataka (29)">Karnataka (29)</option>
                        <option value="Gujarat (24)">Gujarat (24)</option>
                        <option value="Tamil Nadu (33)">Tamil Nadu (33)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={newCustomerForm.email}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({ ...s, email: e.target.value }))
                        }
                        placeholder="party@example.com"
                        className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12px]"
                      />
                    </div>
                  </div>
                </>
              )}

              {partyModalTab === 'address' && (
                <>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                      Billing Address
                    </label>
                    <textarea
                      rows={3}
                      value={newCustomerForm.billingAddress}
                      onChange={(e) =>
                        setNewCustomerForm((s) => ({
                          ...s,
                          billingAddress: e.target.value,
                        }))
                      }
                      placeholder="Shop/Building No, Street, City, Pincode"
                      className="w-full rounded-xl border border-[#DCE9E3] p-2.5 text-[12px]"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-[12px] font-medium text-[#334155]">
                      <input
                        type="checkbox"
                        checked={newCustomerForm.sameAsBilling}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({
                            ...s,
                            sameAsBilling: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#0A6847]"
                      />
                      <span>Shipping address is same as billing address</span>
                    </label>
                  </div>

                  {!newCustomerForm.sameAsBilling && (
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        Shipping Address
                      </label>
                      <textarea
                        rows={3}
                        value={newCustomerForm.shippingAddress}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({
                            ...s,
                            shippingAddress: e.target.value,
                          }))
                        }
                        placeholder="Warehouse/Delivery Destination Address"
                        className="w-full rounded-xl border border-[#DCE9E3] p-2.5 text-[12px]"
                      />
                    </div>
                  )}
                </>
              )}

              {partyModalTab === 'credit' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        Opening Balance ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        value={newCustomerForm.openingKhata || ''}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({
                            ...s,
                            openingKhata: Number(e.target.value),
                          }))
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                        Balance Type
                      </label>
                      <select
                        value={newCustomerForm.openingBalanceType}
                        onChange={(e) =>
                          setNewCustomerForm((s) => ({
                            ...s,
                            openingBalanceType: e.target.value as any,
                          }))
                        }
                        className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2 text-[12px] font-semibold"
                      >
                        <option value="receive">To Receive (Receivable)</option>
                        <option value="pay">To Pay (Payable)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                      Credit Limit ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={newCustomerForm.creditLimit}
                      onChange={(e) =>
                        setNewCustomerForm((s) => ({
                          ...s,
                          creditLimit: e.target.value,
                        }))
                      }
                      placeholder="e.g. 50000 (Warn or block sales above limit)"
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12px]"
                    />
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      POS register warns cashier when client credit limit is breached.
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12px] font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateCustomerSubmit(undefined, true)}
                  className="rounded-xl border border-[#0A6847]/30 bg-[#F4FAF7] px-4 py-2 text-[12px] font-bold text-[#0A6847] hover:bg-[#E6F6F0]"
                >
                  Save &amp; New
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A6847] px-5 py-2 text-[12px] font-bold text-white hover:bg-[#085238] shadow-2xs"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Dialog */}
      {showEditCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <div>
                <h3 className="text-[16px] font-extrabold text-[#111827]">
                  Edit Customer Profile
                </h3>
                <p className="text-[12px] text-[#64748B]">
                  Update contact information, GSTIN, and address.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditCustomerModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={editCustomerForm.name}
                  onChange={(e) =>
                    setEditCustomerForm((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="e.g. Ramesh Enterprises"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editCustomerForm.phone}
                    onChange={(e) =>
                      setEditCustomerForm((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="10-digit mobile"
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editCustomerForm.email}
                    onChange={(e) =>
                      setEditCustomerForm((s) => ({ ...s, email: e.target.value }))
                    }
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={editCustomerForm.gstin}
                  onChange={(e) =>
                    setEditCustomerForm((s) => ({ ...s, gstin: e.target.value.toUpperCase() }))
                  }
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px] font-mono tracking-wider uppercase"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={editCustomerForm.address}
                  onChange={(e) =>
                    setEditCustomerForm((s) => ({ ...s, address: e.target.value }))
                  }
                  placeholder="Street, City, Pincode"
                  className="w-full rounded-xl border border-[#DCE9E3] p-2.5 text-[12.5px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  disabled={editCustomerSaving}
                  onClick={() => setShowEditCustomerModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12px] font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editCustomerSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-5 py-2 text-[12px] font-bold text-white hover:bg-[#085238] shadow-2xs disabled:opacity-50"
                >
                  {editCustomerSaving ? 'Saving...' : 'Update Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
