/**
 * Line-items feature — barrel export.
 *
 * This module is the single import point for line-item types, utilities,
 * constants, and form-building components (ImageUploader, CreateServiceDialog,
 * CreateCustomerDialog, CustomerPicker, LineItemRow, LineItemsSection).
 *
 * USAGE:
 *   import { LineItem, emptyLineItem, LineItemsSection, ImageUploader } from '@/features/line-items';
 */

// ── Types ───────────────────────────────────────────────────────────────────
export type { LineItem, CatalogService } from './types';

// ── Utils ───────────────────────────────────────────────────────────────────
export {
  newLineItemId,
  emptyLineItem,
  lineItemTotal,
  lineItemCost,
  lineItemsSubtotal,
  lineItemsTotalCost,
  parseLineItems,
} from './utils';

// ── Constants ────────────────────────────────────────────────────────────────
export { SERVICE_TYPES, getServiceTypeLabel } from './constants';

// ── Components ───────────────────────────────────────────────────────────────
export {
  ImageUploader,
  CreateServiceDialog,
  CreateCustomerDialog,
  CustomerPicker,
  LineItemRow,
  LineItemsSection,
} from './components';

export type {
  ImageUploaderProps,
  CreateServiceDialogProps,
  CreateCustomerDialogProps,
  CustomerPickerProps,
  CustomerPickerCustomer,
  LineItemRowProps,
  LineItemsSectionProps,
} from './components';
