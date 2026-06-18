// ─── Backward compatibility ─────────────────────────────────────────────
// All currency logic is now in use-company-currency.ts
// This file re-exports for any remaining imports

export {
  useCompanyCurrency as useBaseCurrency,
  invalidateCompanyCurrencyCache as invalidateCurrencyCache,
} from '@/hooks/use-company-currency';
