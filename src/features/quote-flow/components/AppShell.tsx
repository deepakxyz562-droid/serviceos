"use client";
import { useAppStore } from "@/features/quote-flow/store/app";
import { HomeScreen } from "./HomeScreen";
import { QuotesScreen } from "./QuotesScreen";
import { InvoicesScreen } from "./InvoicesScreen";
import { CustomersScreen } from "./CustomersScreen";
import { SettingsScreen } from "./SettingsScreen";
import { BottomNav } from "./BottomNav";
import { LoginModal } from "./LoginModal";
import { OnboardingModal } from "./OnboardingModal";
import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerDetailModal } from "./CustomerDetailModal";
import { QuoteDetailModal } from "./QuoteDetailModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { QuoteCreateModal } from "./QuoteCreateModal";
import { InvoiceCreateModal } from "./InvoiceCreateModal";
import { QuoteEditModal } from "./QuoteEditModal";
import { InvoiceEditModal } from "./InvoiceEditModal";
import { ItemsScreen } from "./ItemsScreen";
import { ItemFormModal } from "./ItemFormModal";
import { ReportsScreen } from "./ReportsScreen";
import { SendQuoteModal } from "./SendQuoteModal";
import { SendInvoiceModal } from "./SendInvoiceModal";

import { ProUpgradeModal } from "./ProUpgradeModal";
import { AiOmniInputModal } from "./AiOmniInputModal";
import { CustomizeModal } from "./CustomizeModal";

export function AppShell() {
  const activeTab = useAppStore((s) => s.activeTab);
  const modal = useAppStore((s) => s.modal);
  const user = useAppStore((s) => s.user);
  const business = useAppStore((s) => s.business);
  const authChecked = useAppStore((s) => s.authChecked);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  // Not authenticated → show login overlay above an empty home
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="mx-auto max-w-md px-5 pt-20 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            <Sparkle />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            QuoteFlow
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Describe it. We create it.
          </p>
        </div>
        <LoginModal />
      </div>
    );
  }

  // Authenticated but no business → onboarding overlay
  if (!business && modal.type !== "onboarding") {
    return (
      <div className="min-h-screen bg-stone-50">
        <OnboardingModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <main>
        {(activeTab === "invoices" || activeTab === "home") && <InvoicesScreen />}
        {(activeTab === "quotes" || activeTab === "estimates") && <QuotesScreen />}
        {(activeTab === "customers" || activeTab === "clients") && <CustomersScreen />}
        {activeTab === "items" && <ItemsScreen />}
        {(activeTab === "settings" || activeTab === "more") && <SettingsScreen />}
      </main>
      <BottomNav />

      {/* Modals */}
      {modal.type === "login" && <LoginModal />}
      {modal.type === "onboarding" && <OnboardingModal />}
      {modal.type === "customer-form" && (
        <CustomerFormModal customerId={modal.customerId} />
      )}
      {modal.type === "customer-detail" && (
        <CustomerDetailModal customerId={modal.customerId} />
      )}
      {modal.type === "item-form" && <ItemFormModal itemId={modal.itemId} />}
      {modal.type === "quote-create" && <QuoteCreateModal />}
      {modal.type === "quote-detail" && <QuoteDetailModal quoteId={modal.quoteId} />}
      {modal.type === "quote-edit" && <QuoteEditModal quoteId={modal.quoteId} />}
      {modal.type === "invoice-create" && <InvoiceCreateModal />}
      {modal.type === "invoice-detail" && (
        <InvoiceDetailModal invoiceId={modal.invoiceId} />
      )}
      {modal.type === "invoice-edit" && <InvoiceEditModal invoiceId={modal.invoiceId} />}
      {modal.type === "send-quote" && <SendQuoteModal quoteId={modal.quoteId} />}
      {modal.type === "send-invoice" && (
        <SendInvoiceModal invoiceId={modal.invoiceId} />
      )}
      {modal.type === "pro-upgrade" && <ProUpgradeModal />}
      {modal.type === "customize" && (
        <CustomizeModal
          documentId={modal.documentId}
          documentType={modal.documentType}
        />
      )}
      {modal.type === "template-select" && <CustomizeModal />}
      {modal.type === "reports" && <ReportsScreen />}
      {modal.type === "ai-omni-input" && (
        <AiOmniInputModal
          isOpen
          defaultDocType={modal.defaultDocType || "QUOTE"}
          onClose={() => useAppStore.getState().closeModal()}
          onParsed={(draft) => {
            if (draft.docType === "INVOICE") {
              useAppStore.getState().openModal({ type: "invoice-create", initialDraft: draft });
            } else {
              useAppStore.getState().openModal({ type: "quote-create", initialDraft: draft });
            }
          }}
        />
      )}
    </div>
  );
}

function Sparkle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
    >
      <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" />
    </svg>
  );
}
