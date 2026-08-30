/**
 * Inventory feature types.
 *
 * Extracted from src/components/views/inventory-view.tsx (Phase 6B1).
 * Shared across the main view, the 6 tab sections, and the 4 form dialogs.
 */

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currency: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  reorderQty: number;
  supplierId: string | null;
  supplierSku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  branchId: string | null;
  isActive: boolean;
  supplier?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  paymentTerms: string | null;
  currency: string;
  isActive: boolean;
  _count?: { items: number };
  createdAt: string;
}

export type StockTransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';

export interface StockTransfer {
  id: string;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  fromEmployeeId: string | null;
  toEmployeeId: string | null;
  status: StockTransferStatus;
  transferDate: string;
  receivedDate: string | null;
  itemsJson: string;
  notes: string | null;
  createdAt: string;
}

// Serialized equipment asset (distinct from quantity-level InventoryItem).
// Each row = one physical tracked item that can be assigned to an employee.
export interface InventoryAssetRow {
  id: string;
  name: string;
  serialNumber: string | null;
  assetTag: string | null;
  status: string; // available, assigned, in_repair, retired
  assignmentStatus: string; // available, assigned
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  assignedAt: string | null;
  condition: string | null;
  location: string | null;
  notes: string | null;
  inventoryItem?: { id: string; name: string; sku: string | null } | null;
}

export type StockTransactionType =
  | 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'consumption' | 'return';
export type StockTransactionDirection = 'in' | 'out';

export interface StockTransaction {
  id: string;
  inventoryItemId: string;
  type: StockTransactionType;
  direction: StockTransactionDirection;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: string | null;
  referenceId: string | null;
  notes: string | null;
  performedByName: string | null;
  createdAt: string;
  item?: { id: string; name: string; sku: string | null; unit: string } | null;
}

export type LowStockAlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface LowStockAlert {
  id: string;
  inventoryItemId: string;
  currentStock: number;
  reorderLevel: number;
  status: LowStockAlertStatus;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  item?: {
    id: string;
    name: string;
    sku: string | null;
    totalStock: number;
    reorderLevel: number;
    reorderQty: number;
    supplierId: string | null;
    supplier?: { id: string; name: string } | null;
  } | null;
}

// ─── Parsed transfer items (from itemsJson) ──────────────────────────────────

export interface ParsedTransferItem {
  inventoryItemId: string | null;
  name: string;
  quantity: number;
}

// ─── Form state types (used by the dialogs) ──────────────────────────────────

export interface ItemFormState {
  name: string;
  sku: string;
  category: string;
  unit: string;
  costPrice: string;
  salePrice: string;
  totalStock: string;
  reorderLevel: string;
  reorderQty: string;
  supplierId: string;
  barcode: string;
  description: string;
  isActive: boolean;
  createTrackableAsset: boolean;
}

export interface SupplierFormState {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  paymentTerms: string;
  currency: string;
  notes: string;
}

export interface TransferItem {
  inventoryItemId: string;
  name: string;
  sku: string | null;
  quantity: string;
}

// ─── Active tab + sub-tab types ──────────────────────────────────────────────

export type InventoryTab =
  | 'items' | 'assets' | 'transfers' | 'suppliers' | 'transactions' | 'alerts';
export type AssetSubTab = 'available' | 'assigned';

// ─── Currency formatter signature (from useCompanyCurrency) ──────────────────

export type CurrencyFormatFn = (amount: number, sourceCurrency?: string) => string;
