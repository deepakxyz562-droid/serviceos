/**
 * Line-items feature — barrel export.
 *
 * This module is the single import point for line-item types, utilities,
 * constants, and form-building components (ImageUploader, CreateServiceDialog,
 * CreateCustomerDialog, CustomerPicker, LineItemRow, LineItemsSection).
 *
 * TYPES + UTILS + CONSTANTS are fully extracted to this feature folder.
 * COMPONENTS are currently re-exported from leads-view.tsx (Phase 1 bridge)
 * and will be moved here in Phase 4 (leads-view extraction).
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

// ── Components (bridge — will be moved here in Phase 4) ─────────────────────
// These are re-exported from leads-view.tsx for now. Once Phase 4 moves them
// into src/features/line-items/components/, these re-exports will point there.
export {
  ImageUploader,
  CreateServiceDialog,
  CreateCustomerDialog,
  CustomerPicker,
  LineItemRow,
  LineItemsSection,
} from '@/components/views/leads-view';
