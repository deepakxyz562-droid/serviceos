import { db } from '@/lib/db';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getSupabaseAdmin } from '@/lib/supabase';

const functions = {
  customerHistory: { name: 'nuvora_customer_history', sql: 'SELECT nuvora_customer_history($1::text,$2::text,$3::text,$4::text,$5::text) AS result', keys: ['p_business_id','p_phone','p_section','p_before_time','p_before_id'] },
  finance: { name: 'nuvora_finance_command', sql: 'SELECT nuvora_finance_command($1::text,$2::text,$3::jsonb) AS result', keys: ['p_business_id', 'p_key', 'p_command'] },
  snapshot: { name: 'nuvora_finance_snapshot', sql: 'SELECT nuvora_finance_snapshot($1::text,$2::timestamptz,$3::timestamptz) AS result', keys: ['p_business_id', 'p_start', 'p_end'] },
  order: { name: 'nuvora_create_order', sql: 'SELECT nuvora_create_order($1::text,$2::text,$3::jsonb) AS result', keys: ['p_business_id', 'p_key', 'p_payload'] },
  editInvoice:{name:'nuvora_edit_invoice',sql:'SELECT nuvora_edit_invoice($1::text,$2::text,$3::jsonb) AS result',keys:['p_business_id','p_id','p_body']},
  updateOrder: {name:'nuvora_update_order',sql:'SELECT nuvora_update_order($1::text,$2::text,$3::jsonb) AS result',keys:['p_business_id','p_id','p_body']},
  stock: {name:'nuvora_adjust_stock',sql:'SELECT nuvora_adjust_stock($1::text,$2::text,$3::jsonb) AS result',keys:['p_business_id','p_key','p_payload']},
  claim: {name:'nuvora_claim_outbox',sql:'SELECT nuvora_claim_outbox($1::integer) AS result',keys:['p_limit']},
  acknowledge: {name:'nuvora_ack_outbox',sql:'SELECT nuvora_ack_outbox($1::text,$2::text,$3::text,$4::text) AS result',keys:['p_id','p_success','p_error','p_lease_token']},
} as const;

/** These RPCs execute in PostgreSQL, not the REST adapter's non-atomic callback. */
export async function atomicCommerce<T>(operation: keyof typeof functions, values: Array<string|number|object>): Promise<T> {
  const fn = functions[operation];
  if (shouldUseSupabaseDB()) {
    const client = getSupabaseAdmin();
    if (!client) throw new Error('COMMERCE_UNAVAILABLE');
    const { data, error } = await client.rpc(fn.name, Object.fromEntries(fn.keys.map((key, i) => [key, values[i]])));
    if (error) throw new Error(error.code === 'PGRST202' || error.code === '42883' ? 'COMMERCE_MIGRATION_REQUIRED' : error.message);
    return data as T;
  }
  const parameters = values.map((value) => typeof value === 'object' ? JSON.stringify(value) : value);
  const rows = await db.$queryRawUnsafe<Array<{ result: T }>>(fn.sql, ...parameters);
  return rows[0].result;
}

export function commerceError(error: unknown): { message: string; status: number } {
  const text = error instanceof Error ? error.message : '';
  const known: Record<string, [number, string]> = {
    DUPLICATE_SUPPLIER_BILL:[409,'This supplier bill reference has already been recorded.'],
    REQUEST_KEY_CONFLICT: [409, 'This request was already used for a different entry.'],
    PAYMENT_EXCEEDS_DUES: [409, 'Payment exceeds the outstanding amount.'],
    RECONCILIATION_REQUIRED: [409, 'Review the previous partial payments before collecting more.'],
    OPENING_REQUIRED:[409,'Record the opening balance first.'],
    OPENING_ALREADY_SET: [409, 'The opening balance has already been recorded.'],
    STOCK_UNAVAILABLE: [409, 'Some items are no longer available in this quantity.'],
    CATALOG_CHANGED: [409, 'Product prices changed. Refresh your cart before checking out.'],
    PROMOTION_UNAVAILABLE: [409, 'This offer is no longer available.'],
    ORDER_NOT_FOUND:[404,'Order not found.'], INVALID_ORDER_STATUS:[400,'Choose a valid order status.'], INVALID_ORDER_TRANSITION:[409,'This order cannot move to that status. Refresh the order.'], INVALID_PAYMENT_STATUS:[400,'Use a verified payment or refund entry.'], PAYMENT_REFUND_REQUIRED:[409,'Record and verify the refund before cancelling a paid order.'], CANCELLATION_REVIEW_REQUIRED:[409,'Review the stock for this older order before cancelling.'],
    RECEIPT_CORRECTION_REQUIRED:[409,'Recorded payments cannot be changed or deleted. Record an audited correction.'],
    INVALID_AMOUNT: [400, 'Enter a valid amount.'], INVALID_RECONCILIATION: [400, 'Enter the amount already paid, up to the bill total.'],
    ORDER_NOT_PAYABLE: [409, 'This order cannot receive a payment.'],
    INVOICE_NOT_PAYABLE: [409, 'This invoice cannot receive a payment.'],
    SUPPLIER_NOT_FOUND: [404, 'Supplier not found.'], BUSINESS_NOT_FOUND: [404, 'Business not found.'],
    INVALID_REQUEST_KEY: [400, 'A valid request key is required.'],
    INVALID_ITEMS: [400, 'Choose at least one valid product.'], INVALID_QUANTITY: [400, 'Enter a positive whole quantity.'],
    CUSTOMER_NOT_FOUND:[404,'Customer not found.'],
    CUSTOMER_REQUIRED: [400, 'Enter a customer phone number.'], 'Invalid customer phone': [400, 'Enter a valid phone number.'],
    PRODUCT_UNAVAILABLE: [409, 'Some products are no longer available. Refresh your cart.'], INVALID_BILLING: [409, 'Please contact the store about its billing settings.'],
    COMMERCE_MIGRATION_REQUIRED: [503, 'Payments and stock are temporarily unavailable. Please try again later.'],
    COMMERCE_UNAVAILABLE: [503, 'Payments and stock are temporarily unavailable. Please try again later.'],
  };
  for (const [code, [status, message]] of Object.entries(known)) if (text.includes(code)) return { status, message };
  return { status: 500, message: 'The transaction was not completed. Please retry the same request.' };
}
