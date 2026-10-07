export const MONEY_KINDS = ['OPENING', 'SUPPLIER_REVIEW', 'COLLECTION', 'CREDIT_SALE', 'INVOICE_PAYMENT', 'SUPPLIER_BILL', 'SUPPLIER_PAYMENT', 'EXPENSE', 'MONEY_IN', 'ORDER_PAYMENT', 'RECONCILE_ORDER'] as const;
export type MoneyKind = typeof MONEY_KINDS[number];
const kindLabels: Record<MoneyKind,[string,string]> = {
  SUPPLIER_REVIEW:['Confirm supplier dues','सप्लायर की बाकी रकम जाँचें'],
  OPENING:['Opening balance','शुरुआती बाकी रकम'], COLLECTION:['Customer payment','ग्राहक से पैसे लेना'],
  CREDIT_SALE:['Credit bill (without product stock)','उधार बिल (स्टॉक के बिना)'],
  INVOICE_PAYMENT:['Invoice payment','बिल का भुगतान'],
  SUPPLIER_BILL:['Supplier bill','सप्लायर का बिल'], SUPPLIER_PAYMENT:['Pay supplier','सप्लायर को पैसे देना'],
  EXPENSE:['Shop expense','दुकान का खर्च'], MONEY_IN:['Other money received','अन्य आए पैसे'],
  ORDER_PAYMENT:['Order payment','ऑर्डर का भुगतान'], RECONCILE_ORDER:['Review old payment','पुराना भुगतान जाँचें'],
};
export function moneyKindText(kind: MoneyKind, language: 'en'|'hi') { return kindLabels[kind][language==='hi'?1:0]; }
export interface MoneySnapshot {
  initialized: boolean; moneyIn: number; moneyOut: number; balance: number | null;
  toCollect: number | null; toPay: number | null;
  customers: Array<{ phone: string; name: string; balance: number; needsReconciliation: boolean }>;
  suppliers: Array<{ id: string; name: string; balance: number }>;
  reviewOrders: Array<{ id: string; name: string; total: number }>;
  invoices: Array<{ id: string; number: string; balance: number }>;
}
export function moneyMinor(value: unknown, allowZero = false): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) throw new Error('INVALID_AMOUNT');
  const minor = Math.round(amount * 100);
  if (!Number.isSafeInteger(minor) || minor > 9000000000000 || Math.abs(amount * 100 - minor) > 0.00001) throw new Error('INVALID_AMOUNT');
  return minor;
}
export function newRequestKey() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
export class RequestTracker {
  private pending: { body: string; key: string } | null = null;
  for(body: unknown) {
    const serialized = JSON.stringify(body);
    if (!this.pending || this.pending.body !== serialized) this.pending = { body: serialized, key: newRequestKey() };
    return this.pending.key;
  }
  clear() { this.pending = null; }
}
