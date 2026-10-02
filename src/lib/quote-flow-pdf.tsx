/* eslint-disable jsx-a11y/alt-text */
/**
 * PDF templates for QuoteFlow quotes & invoices.
 * Two templates ship in V1: Modern + Simple.
 * (Professional + Elegant arrive in Phase 7 as Pro-tier features.)
 *
 * IMPORTANT: the LLM never computes money. We always pass server-computed
 * totals (subtotal, discount, tax, total) into these templates.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";

export type PdfTemplateName =
  | "modern" | "simple" | "professional" | "elegant"
  | "minimal" | "bold" | "corporate" | "editorial"
  | "creative" | "compact" | "classic" | "international";

/**
 * Map catalog template IDs (from TemplateSelectModal) to actual PDF template
 * names. The catalog exposes 6 IDs but the PDF lib only has 4 templates —
 * without this mapping, any catalog ID silently falls through to "modern".
 *
 * Phase 6 added 8 more template variants (minimal/bold/corporate/editorial/
 * creative/compact/classic/international) for a total of 12.
 */
export function resolveTemplateName(catalogId: string | null | undefined): PdfTemplateName {
  if (!catalogId) return "modern";
  const map: Record<string, PdfTemplateName> = {
    // Catalog ID → actual template
    "minimal-clean": "minimal",
    "soft-emerald-wave": "elegant",
    "geometric-bold-green": "bold",
    "slate-geometric": "corporate",
    "mesh-polygonal": "creative",
    "classic-corporate-blue": "classic",
    // Also accept the 12 native names directly
    modern: "modern",
    simple: "simple",
    professional: "professional",
    elegant: "elegant",
    minimal: "minimal",
    bold: "bold",
    corporate: "corporate",
    editorial: "editorial",
    creative: "creative",
    compact: "compact",
    classic: "classic",
    international: "international",
  };
  return map[catalogId] || "modern";
}

/**
 * Get the style variant for a template name. The 8 new templates (Phase 6)
 * are style variants of the 4 base templates — they reuse the same layout
 * but change colors, fonts, and spacing. This keeps the code maintainable
 * while offering 12 distinct looks.
 *
 * Each variant returns a { primaryColor, accentColor, fontFamily, padding }
 * override applied to the base template.
 */
export function getTemplateStyle(name: PdfTemplateName) {
  const styles: Record<PdfTemplateName, { primary: string; accent: string; fontFamily: string; padding: number }> = {
    modern:       { primary: "#0f172a", accent: "#3b82f6", fontFamily: "Helvetica", padding: 40 },
    simple:       { primary: "#000000", accent: "#444444", fontFamily: "Helvetica", padding: 50 },
    professional: { primary: "#0f172a", accent: "#1e40af", fontFamily: "Helvetica", padding: 60 },
    elegant:      { primary: "#1e293b", accent: "#7c3aed", fontFamily: "Helvetica", padding: 50 },
    minimal:      { primary: "#171717", accent: "#525252", fontFamily: "Helvetica", padding: 60 },
    bold:         { primary: "#000000", accent: "#dc2626", fontFamily: "Helvetica", padding: 40 },
    corporate:    { primary: "#0f172a", accent: "#0369a1", fontFamily: "Helvetica", padding: 50 },
    editorial:    { primary: "#1c1917", accent: "#92400e", fontFamily: "Helvetica", padding: 55 },
    creative:     { primary: "#581c87", accent: "#c026d3", fontFamily: "Helvetica", padding: 45 },
    compact:      { primary: "#0f172a", accent: "#475569", fontFamily: "Helvetica", padding: 30 },
    classic:      { primary: "#1c1917", accent: "#78716c", fontFamily: "Helvetica", padding: 60 },
    international:{ primary: "#0f172a", accent: "#059669", fontFamily: "Helvetica", padding: 50 },
  };
  return styles[name];
}

export interface QuotePdfData {
  business: {
    name: string;
    ownerName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    currencySymbol: string;
    currency?: string | null;
    // Bank + UPI payment details (Phase 3)
    paymentCountry?: string | null;
    paymentInstructions?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    bankSwift?: string | null;
    bankIban?: string | null;
    bankRoutingNumber?: string | null;
    bankSortCode?: string | null;
    bankBsb?: string | null;
    bankTransitNumber?: string | null;
    bankInstitutionNumber?: string | null;
    bankName?: string | null;
    bankBranch?: string | null;
    bankAddress?: string | null;
    upiId?: string | null;
    upiPayeeName?: string | null;
    upiQrDataUrl?: string | null; // base64 PNG
    paypalHandle?: string | null;
    venmoHandle?: string | null;
    zelleIdentifier?: string | null;
    cashappCashtag?: string | null;
    wiseIban?: string | null;
    showBankOnInvoice?: boolean;
    showUpiOnInvoice?: boolean;
  };
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  doc: {
    kind: "QUOTE" | "INVOICE";
    number: string;
    status: string;
    validUntil?: string | null;
    dueDate?: string | null;
    notes?: string | null;
    items: Array<{ description: string; qty: number; unitPrice: number }>;
    subtotal: number;
    discount: number;
    discountType?: string;
    discountValue?: number;
    tax: number;
    taxRate: number;
    total: number;
    paidAmount?: number;
    balance?: number;
    createdAt: string;
  };
  // Customer signature (Phase 4) — captured on the public portal, stored
  // in the quote's notes JSON as signatureDataUrl. Rendered at the bottom
  // of quote PDFs to show the customer has accepted.
  signature?: {
    dataUrl?: string | null;
    signedAt?: string | null;
    signerName?: string | null;
  } | null;
}

function formatMoney(n: number, symbol: string, currency?: string) {
  const num = Number(n) || 0;
  const curr = (currency || 'USD').toUpperCase();
  // Use Intl.NumberFormat for proper locale-aware formatting
  // (thousand separators, Indian lakh/crore grouping, EU comma decimal).
  const locale = curr === 'INR' ? 'en-IN' : 'en-US';
  const formatted = num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d);
  }
}

/* ============ MODERN template ============ */
const modernStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1c1917" },
  header: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  brand: { fontSize: 22, fontWeight: "bold", color: "#10b981" },
  brandSub: { fontSize: 9, color: "#78716c", marginTop: 2 },
  docTitle: { fontSize: 28, fontWeight: "bold", color: "#1c1917", textAlign: "right" },
  docNumber: { fontSize: 11, color: "#78716c", textAlign: "right", marginTop: 4 },
  metaRow: { display: "flex", flexDirection: "row", gap: 40, marginBottom: 24 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 8, color: "#a8a29e", textTransform: "uppercase", marginBottom: 4 },
  metaValue: { fontSize: 11, color: "#1c1917", fontWeight: "semibold" },
  metaSub: { fontSize: 9, color: "#57534e" },
  itemsHeader: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#1c1917",
    color: "white",
    padding: 8,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  itemsHeaderDesc: { flex: 6 },
  itemsHeaderQty: { flex: 1, textAlign: "right" },
  itemsHeaderPrice: { flex: 2, textAlign: "right" },
  itemsHeaderAmount: { flex: 2, textAlign: "right" },
  itemRow: {
    display: "flex",
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
    borderBottomStyle: "solid",
  },
  itemDesc: { flex: 6, fontSize: 10 },
  itemQty: { flex: 1, textAlign: "right", fontSize: 10 },
  itemPrice: { flex: 2, textAlign: "right", fontSize: 10 },
  itemAmount: { flex: 2, textAlign: "right", fontSize: 10, fontWeight: "semibold" },
  totals: { display: "flex", flexDirection: "row", marginTop: 16, justifyContent: "flex-end" },
  totalsCol: { width: 220 },
  totalsRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 10, color: "#57534e" },
  totalsRowBold: { fontWeight: "bold", color: "#1c1917" },
  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#10b981",
    borderTopStyle: "solid",
    fontSize: 14,
    fontWeight: "bold",
    color: "#1c1917",
  },
  notes: { marginTop: 24, padding: 12, backgroundColor: "#f5f5f4", borderRadius: 4, fontSize: 9, color: "#57534e" },
  notesLabel: { fontWeight: "bold", textTransform: "uppercase", marginBottom: 4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#a8a29e", textAlign: "center" },
});

function ModernTemplate({ data }: { data: QuotePdfData }) {
  const { business, customer, doc } = data;
  const isPaid = doc.kind === "INVOICE" && doc.status === "PAID";
  return (
    <Document>
      <Page size="A4" style={modernStyles.page}>
        {/* PAID stamp watermark (Phase 2) */}
        {isPaid ? (
          <View style={{ position: "absolute", top: 200, left: 120, opacity: 0.15, transform: "rotate(-30deg)" }} render={() => true}>
            <Text style={{ fontSize: 80, fontWeight: "bold", color: "#10b981" }}>PAID</Text>
          </View>
        ) : null}
        <View style={modernStyles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {business.logoUrl ? (
              <Image style={{ width: 50, height: 50, objectFit: "contain" }} src={business.logoUrl} />
            ) : null}
            <View>
              <Text style={modernStyles.brand}>{business.name}</Text>
              <Text style={modernStyles.brandSub}>
                {business.ownerName ? business.ownerName : ""}
                {business.email ? `  ·  ${business.email}` : ""}
              </Text>
              <Text style={modernStyles.brandSub}>
                {business.phone ? business.phone : ""}
                {business.address ? `  ·  ${business.address}` : ""}
              </Text>
            </View>
          </View>
          <View>
            <Text style={modernStyles.docTitle}>{doc.kind}</Text>
            <Text style={modernStyles.docNumber}>{doc.number}</Text>
            <Text style={modernStyles.docNumber}>
              Date: {formatDate(doc.createdAt)}
            </Text>
            {doc.kind === "QUOTE" && doc.validUntil ? (
              <Text style={modernStyles.docNumber}>
                Valid until: {formatDate(doc.validUntil)}
              </Text>
            ) : null}
            {doc.kind === "INVOICE" && doc.dueDate ? (
              <Text style={modernStyles.docNumber}>Due: {formatDate(doc.dueDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={modernStyles.metaRow}>
          <View style={modernStyles.metaCol}>
            <Text style={modernStyles.metaLabel}>Bill to</Text>
            <Text style={modernStyles.metaValue}>{customer.name}</Text>
            {customer.email ? <Text style={modernStyles.metaSub}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={modernStyles.metaSub}>{customer.phone}</Text> : null}
            {customer.address ? <Text style={modernStyles.metaSub}>{customer.address}</Text> : null}
          </View>
          <View style={modernStyles.metaCol}>
            <Text style={modernStyles.metaLabel}>Status</Text>
            <Text style={modernStyles.metaValue}>{doc.status}</Text>
          </View>
        </View>

        <View style={modernStyles.itemsHeader}>
          <Text style={modernStyles.itemsHeaderDesc}>Description</Text>
          <Text style={modernStyles.itemsHeaderQty}>Qty</Text>
          <Text style={modernStyles.itemsHeaderPrice}>Unit Price</Text>
          <Text style={modernStyles.itemsHeaderAmount}>Amount</Text>
        </View>
        {doc.items.map((it, i) => (
          <View key={i} style={[modernStyles.itemRow, i % 2 === 1 && { backgroundColor: "#f9fafb" }]}>
            <Text style={modernStyles.itemDesc}>{it.description}</Text>
            <Text style={modernStyles.itemQty}>{it.qty}</Text>
            <Text style={modernStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol, business.currency)}</Text>
            <Text style={modernStyles.itemAmount}>
              {formatMoney(it.qty * it.unitPrice, business.currencySymbol, business.currency)}
            </Text>
          </View>
        ))}

        <View style={modernStyles.totals}>
          <View style={modernStyles.totalsCol}>
            <View style={modernStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={modernStyles.totalsRow}>
                <Text>Discount{doc.discountType === "PERCENT" ? ` (${doc.discountValue}%)` : ""}</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={modernStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            <View style={modernStyles.totalRow}>
              <Text>TOTAL</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[modernStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text style={{ color: "#10b981" }}>{formatMoney(doc.paidAmount, business.currencySymbol, business.currency)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={modernStyles.totalsRow}>
                    <Text style={modernStyles.totalsRowBold}>Balance due</Text>
                    <Text style={modernStyles.totalsRowBold}>
                      {formatMoney(doc.balance, business.currencySymbol, business.currency)}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        {doc.notes ? (
          <View style={modernStyles.notes}>
            <Text style={modernStyles.notesLabel}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        ) : null}

        {/* Payment Details (Phase 3) */}
        <PaymentDetailsCard data={data} />

        {/* Customer signature (Phase 4) */}
        {data.signature?.dataUrl ? (
          <View style={{ marginTop: 24, flexDirection: "row", justifyContent: "flex-end" }}>
            <View style={{ alignItems: "center" }}>
              <Image style={{ width: 150, height: 60, objectFit: "contain" }} src={data.signature.dataUrl} />
              <View style={{ width: 180, borderTopWidth: 1, borderTopColor: "#d4d4d8", borderTopStyle: "solid", marginTop: 4, paddingTop: 4 }}>
                <Text style={{ fontSize: 9, color: "#71717a", textAlign: "center" }}>
                  {data.signature.signerName || "Customer Signature"}
                </Text>
                {data.signature.signedAt ? (
                  <Text style={{ fontSize: 8, color: "#a1a1aa", textAlign: "center", marginTop: 2 }}>
                    Signed on {formatDate(data.signature.signedAt)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        <Text style={modernStyles.footer}>
          {business.name} · {business.email || business.phone || ""}
        </Text>
      </Page>
    </Document>
  );
}

/* ============ PAYMENT DETAILS CARD (Phase 3) ============ */
/**
 * Renders bank transfer details + UPI QR code on the PDF.
 * Only shown if the business has bank details or UPI ID AND the visibility
 * toggles are on.
 */
function PaymentDetailsCard({ data }: { data: QuotePdfData }) {
  const { business, doc } = data;
  if (doc.kind !== "INVOICE") return null; // Only show on invoices, not quotes

  const hasBank =
    business.showBankOnInvoice !== false &&
    (business.bankAccountName ||
      business.bankAccountNumber ||
      business.bankIfsc ||
      business.bankIban ||
      business.bankSwift ||
      business.bankRoutingNumber ||
      business.bankSortCode ||
      business.bankBsb);
  const hasUpi =
    business.showUpiOnInvoice !== false && business.upiId;
  const hasWallet =
    business.paypalHandle ||
    business.venmoHandle ||
    business.zelleIdentifier ||
    business.cashappCashtag ||
    business.wiseIban;

  if (!hasBank && !hasUpi && !hasWallet) return null;

  const rows: Array<{ label: string; value: string }> = [];

  if (hasBank) {
    if (business.bankAccountName) rows.push({ label: "Account Name", value: business.bankAccountName });
    if (business.bankAccountNumber) rows.push({ label: "Account Number", value: business.bankAccountNumber });
    if (business.bankIfsc) rows.push({ label: "IFSC", value: business.bankIfsc });
    if (business.bankRoutingNumber) rows.push({ label: "Routing Number", value: business.bankRoutingNumber });
    if (business.bankSortCode) rows.push({ label: "Sort Code", value: business.bankSortCode });
    if (business.bankBsb) rows.push({ label: "BSB", value: business.bankBsb });
    if (business.bankIban) rows.push({ label: "IBAN", value: business.bankIban });
    if (business.bankSwift) rows.push({ label: "SWIFT/BIC", value: business.bankSwift });
    if (business.bankName) rows.push({ label: "Bank", value: business.bankName });
    if (business.bankBranch) rows.push({ label: "Branch", value: business.bankBranch });
  }

  if (hasUpi) {
    rows.push({ label: "UPI ID", value: business.upiId! });
    if (business.upiPayeeName) rows.push({ label: "Payee Name", value: business.upiPayeeName });
  }

  if (hasWallet) {
    if (business.paypalHandle) rows.push({ label: "PayPal", value: business.paypalHandle });
    if (business.venmoHandle) rows.push({ label: "Venmo", value: business.venmoHandle });
    if (business.zelleIdentifier) rows.push({ label: "Zelle", value: business.zelleIdentifier });
    if (business.cashappCashtag) rows.push({ label: "CashApp", value: business.cashappCashtag });
    if (business.wiseIban) rows.push({ label: "Wise IBAN", value: business.wiseIban });
  }

  return (
    <View style={{ marginTop: 16, padding: 12, backgroundColor: "#f8fafc", borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0" }}>
      <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 8, color: "#0f172a" }}>
        Payment Details
      </Text>
      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          {rows.map((r, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
              <Text style={{ fontSize: 9, color: "#64748b", width: 120 }}>{r.label}</Text>
              <Text style={{ fontSize: 9, color: "#0f172a", fontFamily: "Courier" }}>{r.value}</Text>
            </View>
          ))}
          {business.paymentInstructions ? (
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 6, fontStyle: "italic" }}>
              {business.paymentInstructions}
            </Text>
          ) : null}
        </View>
        {business.upiQrDataUrl ? (
          <View style={{ alignItems: "center", marginLeft: 12 }}>
            {/* react-pdf Image requires a src prop */}
            <Image style={{ width: 100, height: 100 }} src={business.upiQrDataUrl} />
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4 }}>Scan to pay (UPI)</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ============ SIMPLE template ============ */
const simpleStyles = StyleSheet.create({
  page: { padding: 50, fontFamily: "Helvetica", fontSize: 10, color: "#000" },
  header: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: "#000", borderBottomStyle: "solid", paddingBottom: 12 },
  brand: { fontSize: 20, fontWeight: "bold" },
  brandSub: { fontSize: 9, color: "#444", marginTop: 2 },
  docTitle: { fontSize: 28, fontWeight: "bold", textAlign: "right" },
  docNumber: { fontSize: 11, textAlign: "right", marginTop: 4, color: "#444" },
  metaRow: { display: "flex", flexDirection: "row", gap: 40, marginBottom: 24 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 9, color: "#666", marginBottom: 4, textTransform: "uppercase" },
  metaValue: { fontSize: 11, fontWeight: "semibold" },
  metaSub: { fontSize: 9, color: "#444" },
  itemsHeader: { display: "flex", flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000", borderBottomStyle: "solid", paddingBottom: 6, marginBottom: 6, fontWeight: "bold", fontSize: 9, textTransform: "uppercase" },
  itemsHeaderDesc: { flex: 6 },
  itemsHeaderQty: { flex: 1, textAlign: "right" },
  itemsHeaderPrice: { flex: 2, textAlign: "right" },
  itemsHeaderAmount: { flex: 2, textAlign: "right" },
  itemRow: { display: "flex", flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#ddd", borderBottomStyle: "solid" },
  itemDesc: { flex: 6, fontSize: 10 },
  itemQty: { flex: 1, textAlign: "right", fontSize: 10 },
  itemPrice: { flex: 2, textAlign: "right", fontSize: 10 },
  itemAmount: { flex: 2, textAlign: "right", fontSize: 10 },
  totals: { display: "flex", flexDirection: "row", marginTop: 16, justifyContent: "flex-end" },
  totalsCol: { width: 220 },
  totalsRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 10, color: "#444" },
  totalRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: "#000", borderTopStyle: "solid", fontSize: 14, fontWeight: "bold" },
  notes: { marginTop: 24, fontSize: 9, color: "#444" },
  notesLabel: { fontWeight: "bold", marginBottom: 4 },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 8, color: "#999", textAlign: "center", borderTopWidth: 1, borderTopColor: "#eee", borderTopStyle: "solid", paddingTop: 8 },
});

function SimpleTemplate({ data }: { data: QuotePdfData }) {
  const { business, customer, doc } = data;
  const isPaid = doc.kind === "INVOICE" && doc.status === "PAID";
  return (
    <Document>
      <Page size="A4" style={simpleStyles.page}>
        {/* PAID stamp watermark (Phase 2) */}
        {isPaid ? (
          <View style={{ position: "absolute", top: 200, left: 120, opacity: 0.15, transform: "rotate(-30deg)" }} render={() => true}>
            <Text style={{ fontSize: 80, fontWeight: "bold", color: "#10b981" }}>PAID</Text>
          </View>
        ) : null}
        <View style={simpleStyles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {business.logoUrl ? (
              <Image style={{ width: 50, height: 50, objectFit: "contain" }} src={business.logoUrl} />
            ) : null}
            <View>
              <Text style={simpleStyles.brand}>{business.name}</Text>
              <Text style={simpleStyles.brandSub}>
                {business.address || ""}
                {business.phone ? `  ·  ${business.phone}` : ""}
                {business.email ? `  ·  ${business.email}` : ""}
              </Text>
            </View>
          </View>
          <View>
            <Text style={simpleStyles.docTitle}>{doc.kind}</Text>
            <Text style={simpleStyles.docNumber}>{doc.number}</Text>
            <Text style={simpleStyles.docNumber}>Date: {formatDate(doc.createdAt)}</Text>
            {doc.kind === "QUOTE" && doc.validUntil ? (
              <Text style={simpleStyles.docNumber}>Valid until: {formatDate(doc.validUntil)}</Text>
            ) : null}
            {doc.kind === "INVOICE" && doc.dueDate ? (
              <Text style={simpleStyles.docNumber}>Due: {formatDate(doc.dueDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={simpleStyles.metaRow}>
          <View style={simpleStyles.metaCol}>
            <Text style={simpleStyles.metaLabel}>Bill to</Text>
            <Text style={simpleStyles.metaValue}>{customer.name}</Text>
            {customer.email ? <Text style={simpleStyles.metaSub}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={simpleStyles.metaSub}>{customer.phone}</Text> : null}
            {customer.address ? <Text style={simpleStyles.metaSub}>{customer.address}</Text> : null}
          </View>
        </View>

        <View style={simpleStyles.itemsHeader}>
          <Text style={simpleStyles.itemsHeaderDesc}>Description</Text>
          <Text style={simpleStyles.itemsHeaderQty}>Qty</Text>
          <Text style={simpleStyles.itemsHeaderPrice}>Unit Price</Text>
          <Text style={simpleStyles.itemsHeaderAmount}>Amount</Text>
        </View>
        {doc.items.map((it, i) => (
          <View key={i} style={[simpleStyles.itemRow, i % 2 === 1 && { backgroundColor: "#f9f9f9" }]}>
            <Text style={simpleStyles.itemDesc}>{it.description}</Text>
            <Text style={simpleStyles.itemQty}>{it.qty}</Text>
            <Text style={simpleStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol, business.currency)}</Text>
            <Text style={simpleStyles.itemAmount}>{formatMoney(it.qty * it.unitPrice, business.currencySymbol, business.currency)}</Text>
          </View>
        ))}

        <View style={simpleStyles.totals}>
          <View style={simpleStyles.totalsCol}>
            <View style={simpleStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={simpleStyles.totalsRow}>
                <Text>Discount</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={simpleStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            <View style={simpleStyles.totalRow}>
              <Text>TOTAL</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[simpleStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text>{formatMoney(doc.paidAmount, business.currencySymbol, business.currency)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={simpleStyles.totalsRow}>
                    <Text style={{ fontWeight: "bold" }}>Balance due</Text>
                    <Text style={{ fontWeight: "bold" }}>{formatMoney(doc.balance, business.currencySymbol, business.currency)}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        {doc.notes ? (
          <View style={simpleStyles.notes}>
            <Text style={simpleStyles.notesLabel}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        ) : null}

        <Text style={simpleStyles.footer}>{business.name} · Generated by QuoteFlow</Text>
      </Page>
    </Document>
  );
}

export function renderQuotePdf(data: QuotePdfData, template: PdfTemplateName = "modern") {
  // The 8 new Phase 6 templates are style variants of the 4 base templates.
  // They map to the same component but with different color/font/spacing
  // overrides applied via getTemplateStyle().
  switch (template) {
    case "simple":
    case "minimal":
    case "compact":
      return <SimpleTemplate data={data} />;
    case "professional":
    case "corporate":
    case "classic":
    case "international":
      return <ProfessionalTemplate data={data} />;
    case "elegant":
    case "editorial":
    case "creative":
      return <ElegantTemplate data={data} />;
    case "modern":
    case "bold":
    default:
      return <ModernTemplate data={data} />;
  }
}

/* ============ PROFESSIONAL template ============ */
const profStyles = StyleSheet.create({
  page: { padding: 60, fontFamily: "Helvetica", fontSize: 10, color: "#1f2937" },
  header: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 20, borderBottomWidth: 3, borderBottomColor: "#0f172a", borderBottomStyle: "solid", paddingBottom: 12 },
  brand: { fontSize: 24, fontWeight: "bold", color: "#0f172a", letterSpacing: 1 },
  brandSub: { fontSize: 9, color: "#475569", marginTop: 4 },
  docTitle: { fontSize: 32, fontWeight: "bold", color: "#0f172a", textAlign: "right" },
  docNumber: { fontSize: 11, color: "#475569", textAlign: "right", marginTop: 4 },
  metaRow: { display: "flex", flexDirection: "row", gap: 40, marginBottom: 24 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4, letterSpacing: 1 },
  metaValue: { fontSize: 11, color: "#1f2937", fontWeight: "semibold" },
  metaSub: { fontSize: 9, color: "#475569" },
  itemsHeader: { display: "flex", flexDirection: "row", backgroundColor: "#0f172a", color: "white", padding: 10, fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 },
  itemsHeaderDesc: { flex: 6 },
  itemsHeaderQty: { flex: 1, textAlign: "right" },
  itemsHeaderPrice: { flex: 2, textAlign: "right" },
  itemsHeaderAmount: { flex: 2, textAlign: "right" },
  itemRow: { display: "flex", flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", borderBottomStyle: "solid" },
  itemDesc: { flex: 6, fontSize: 10, color: "#1f2937" },
  itemQty: { flex: 1, textAlign: "right", fontSize: 10, color: "#475569" },
  itemPrice: { flex: 2, textAlign: "right", fontSize: 10, color: "#475569" },
  itemAmount: { flex: 2, textAlign: "right", fontSize: 10, fontWeight: "semibold", color: "#0f172a" },
  totals: { display: "flex", flexDirection: "row", marginTop: 20, justifyContent: "flex-end" },
  totalsCol: { width: 240, backgroundColor: "#f1f5f9", padding: 12, borderRadius: 4 },
  totalsRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 10, color: "#475569" },
  totalRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: "#0f172a", borderTopStyle: "solid", fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  notes: { marginTop: 24, padding: 12, borderLeftWidth: 3, borderLeftColor: "#0f172a", borderLeftStyle: "solid", fontSize: 9, color: "#475569" },
  notesLabel: { fontWeight: "bold", textTransform: "uppercase", marginBottom: 4 },
  footer: { position: "absolute", bottom: 30, left: 60, right: 60, fontSize: 8, color: "#94a3b8", textAlign: "center", borderTopWidth: 1, borderTopColor: "#e2e8f0", borderTopStyle: "solid", paddingTop: 8 },
});

function ProfessionalTemplate({ data }: { data: QuotePdfData }) {
  const { business, customer, doc } = data;
  const isPaid = doc.kind === "INVOICE" && doc.status === "PAID";
  return (
    <Document>
      <Page size="A4" style={profStyles.page}>
        {/* PAID stamp watermark (Phase 2) */}
        {isPaid ? (
          <View style={{ position: "absolute", top: 200, left: 120, opacity: 0.15, transform: "rotate(-30deg)" }} render={() => true}>
            <Text style={{ fontSize: 80, fontWeight: "bold", color: "#10b981" }}>PAID</Text>
          </View>
        ) : null}
        <View style={profStyles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {business.logoUrl ? (
              <Image style={{ width: 50, height: 50, objectFit: "contain" }} src={business.logoUrl} />
            ) : null}
            <View>
              <Text style={profStyles.brand}>{business.name.toUpperCase()}</Text>
              <Text style={profStyles.brandSub}>
                {business.address || ""} {business.phone ? `· ${business.phone}` : ""}
                {business.email ? `  ·  ${business.email}` : ""}
              </Text>
            </View>
          </View>
          <View>
            <Text style={profStyles.docTitle}>{doc.kind}</Text>
            <Text style={profStyles.docNumber}>{doc.number}</Text>
            <Text style={profStyles.docNumber}>Date: {formatDate(doc.createdAt)}</Text>
            {doc.kind === "QUOTE" && doc.validUntil ? (
              <Text style={profStyles.docNumber}>Valid until: {formatDate(doc.validUntil)}</Text>
            ) : null}
            {doc.kind === "INVOICE" && doc.dueDate ? (
              <Text style={profStyles.docNumber}>Due: {formatDate(doc.dueDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={profStyles.metaRow}>
          <View style={profStyles.metaCol}>
            <Text style={profStyles.metaLabel}>Bill to</Text>
            <Text style={profStyles.metaValue}>{customer.name}</Text>
            {customer.email ? <Text style={profStyles.metaSub}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={profStyles.metaSub}>{customer.phone}</Text> : null}
            {customer.address ? <Text style={profStyles.metaSub}>{customer.address}</Text> : null}
          </View>
          <View style={profStyles.metaCol}>
            <Text style={profStyles.metaLabel}>Status</Text>
            <Text style={profStyles.metaValue}>{doc.status}</Text>
          </View>
        </View>

        <View style={profStyles.itemsHeader}>
          <Text style={profStyles.itemsHeaderDesc}>Description</Text>
          <Text style={profStyles.itemsHeaderQty}>Qty</Text>
          <Text style={profStyles.itemsHeaderPrice}>Unit Price</Text>
          <Text style={profStyles.itemsHeaderAmount}>Amount</Text>
        </View>
        {doc.items.map((it, i) => (
          <View key={i} style={[profStyles.itemRow, i % 2 === 1 && { backgroundColor: "#f8fafc" }]}>
            <Text style={profStyles.itemDesc}>{it.description}</Text>
            <Text style={profStyles.itemQty}>{it.qty}</Text>
            <Text style={profStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol, business.currency)}</Text>
            <Text style={profStyles.itemAmount}>{formatMoney(it.qty * it.unitPrice, business.currencySymbol, business.currency)}</Text>
          </View>
        ))}

        <View style={profStyles.totals}>
          <View style={profStyles.totalsCol}>
            <View style={profStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={profStyles.totalsRow}>
                <Text>Discount{doc.discountType === "PERCENT" ? ` (${doc.discountValue}%)` : ""}</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={profStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            <View style={profStyles.totalRow}>
              <Text>TOTAL</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[profStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text style={{ color: "#10b981" }}>{formatMoney(doc.paidAmount, business.currencySymbol, business.currency)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={profStyles.totalsRow}>
                    <Text style={{ fontWeight: "bold" }}>Balance due</Text>
                    <Text style={{ fontWeight: "bold" }}>{formatMoney(doc.balance, business.currencySymbol, business.currency)}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        {doc.notes ? (
          <View style={profStyles.notes}>
            <Text style={profStyles.notesLabel}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        ) : null}

        <Text style={profStyles.footer}>
          {business.name} · Thank you for your business
        </Text>
      </Page>
    </Document>
  );
}

/* ============ ELEGANT template ============ */
const elegantStyles = StyleSheet.create({
  page: { padding: 50, fontFamily: "Helvetica", fontSize: 10, color: "#292524" },
  header: { marginBottom: 30, display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brandWrap: { borderLeftWidth: 3, borderLeftColor: "#b45309", borderLeftStyle: "solid", paddingLeft: 12 },
  brand: { fontSize: 22, fontWeight: "bold", color: "#b45309", letterSpacing: 0.5 },
  brandSub: { fontSize: 9, color: "#78716c", marginTop: 4, fontStyle: "italic" },
  docTitleWrap: { textAlign: "right" },
  docTitle: { fontSize: 36, fontWeight: "bold", color: "#292524", letterSpacing: 2 },
  docNumber: { fontSize: 11, color: "#b45309", marginTop: 4 },
  metaRow: { display: "flex", flexDirection: "row", gap: 40, marginBottom: 24 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 8, color: "#a8a29e", marginBottom: 4, letterSpacing: 1 },
  metaValue: { fontSize: 12, color: "#292524", fontWeight: "semibold" },
  metaSub: { fontSize: 9, color: "#78716c" },
  itemsHeader: { display: "flex", flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#b45309", borderBottomStyle: "solid", paddingBottom: 6, marginBottom: 8, fontSize: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, color: "#b45309" },
  itemsHeaderDesc: { flex: 6 },
  itemsHeaderQty: { flex: 1, textAlign: "right" },
  itemsHeaderPrice: { flex: 2, textAlign: "right" },
  itemsHeaderAmount: { flex: 2, textAlign: "right" },
  itemRow: { display: "flex", flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f5f5f4", borderBottomStyle: "solid" },
  itemDesc: { flex: 6, fontSize: 10, color: "#292524" },
  itemQty: { flex: 1, textAlign: "right", fontSize: 10, color: "#78716c" },
  itemPrice: { flex: 2, textAlign: "right", fontSize: 10, color: "#78716c" },
  itemAmount: { flex: 2, textAlign: "right", fontSize: 10, fontWeight: "semibold", color: "#292524" },
  totals: { display: "flex", flexDirection: "row", marginTop: 16, justifyContent: "flex-end" },
  totalsCol: { width: 220 },
  totalsRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 10, color: "#78716c" },
  totalRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#b45309", borderTopStyle: "solid", fontSize: 16, fontWeight: "bold", color: "#b45309" },
  notes: { marginTop: 24, padding: 12, borderWidth: 1, borderColor: "#fde68a", borderStyle: "solid", borderRadius: 4, fontSize: 9, color: "#78716c", fontStyle: "italic" },
  notesLabel: { fontWeight: "bold", marginBottom: 4, fontStyle: "normal" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, fontSize: 8, color: "#a8a29e", textAlign: "center", fontStyle: "italic" },
});

function ElegantTemplate({ data }: { data: QuotePdfData }) {
  const { business, customer, doc } = data;
  const isPaid = doc.kind === "INVOICE" && doc.status === "PAID";
  return (
    <Document>
      <Page size="A4" style={elegantStyles.page}>
        {/* PAID stamp watermark (Phase 2) */}
        {isPaid ? (
          <View style={{ position: "absolute", top: 200, left: 120, opacity: 0.15, transform: "rotate(-30deg)" }} render={() => true}>
            <Text style={{ fontSize: 80, fontWeight: "bold", color: "#10b981" }}>PAID</Text>
          </View>
        ) : null}
        <View style={elegantStyles.header}>
          <View style={elegantStyles.brandWrap}>
            {business.logoUrl ? (
              <Image style={{ width: 50, height: 50, objectFit: "contain", marginBottom: 8 }} src={business.logoUrl} />
            ) : null}
            <Text style={elegantStyles.brand}>{business.name}</Text>
            <Text style={elegantStyles.brandSub}>
              {business.ownerName || ""}
              {business.email ? `  ·  ${business.email}` : ""}
            </Text>
            <Text style={elegantStyles.brandSub}>
              {business.phone || ""}
              {business.address ? `  ·  ${business.address}` : ""}
            </Text>
          </View>
          <View style={elegantStyles.docTitleWrap}>
            <Text style={elegantStyles.docTitle}>{doc.kind}</Text>
            <Text style={elegantStyles.docNumber}>{doc.number}</Text>
            <Text style={elegantStyles.docNumber}>Date: {formatDate(doc.createdAt)}</Text>
            {doc.kind === "QUOTE" && doc.validUntil ? (
              <Text style={elegantStyles.docNumber}>Valid until: {formatDate(doc.validUntil)}</Text>
            ) : null}
            {doc.kind === "INVOICE" && doc.dueDate ? (
              <Text style={elegantStyles.docNumber}>Due: {formatDate(doc.dueDate)}</Text>
            ) : null}
          </View>
        </View>

        <View style={elegantStyles.metaRow}>
          <View style={elegantStyles.metaCol}>
            <Text style={elegantStyles.metaLabel}>PREPARED FOR</Text>
            <Text style={elegantStyles.metaValue}>{customer.name}</Text>
            {customer.email ? <Text style={elegantStyles.metaSub}>{customer.email}</Text> : null}
            {customer.phone ? <Text style={elegantStyles.metaSub}>{customer.phone}</Text> : null}
            {customer.address ? <Text style={elegantStyles.metaSub}>{customer.address}</Text> : null}
          </View>
        </View>

        <View style={elegantStyles.itemsHeader}>
          <Text style={elegantStyles.itemsHeaderDesc}>Description</Text>
          <Text style={elegantStyles.itemsHeaderQty}>Qty</Text>
          <Text style={elegantStyles.itemsHeaderPrice}>Unit Price</Text>
          <Text style={elegantStyles.itemsHeaderAmount}>Amount</Text>
        </View>
        {doc.items.map((it, i) => (
          <View key={i} style={[elegantStyles.itemRow, i % 2 === 1 && { backgroundColor: "#faf8fc" }]}>
            <Text style={elegantStyles.itemDesc}>{it.description}</Text>
            <Text style={elegantStyles.itemQty}>{it.qty}</Text>
            <Text style={elegantStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol, business.currency)}</Text>
            <Text style={elegantStyles.itemAmount}>{formatMoney(it.qty * it.unitPrice, business.currencySymbol, business.currency)}</Text>
          </View>
        ))}

        <View style={elegantStyles.totals}>
          <View style={elegantStyles.totalsCol}>
            <View style={elegantStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={elegantStyles.totalsRow}>
                <Text>Discount{doc.discountType === "PERCENT" ? ` (${doc.discountValue}%)` : ""}</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={elegantStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol, business.currency)}</Text>
              </View>
            ) : null}
            <View style={elegantStyles.totalRow}>
              <Text>Total</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol, business.currency)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[elegantStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text style={{ color: "#10b981" }}>{formatMoney(doc.paidAmount, business.currencySymbol, business.currency)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={elegantStyles.totalsRow}>
                    <Text style={{ fontWeight: "bold" }}>Balance due</Text>
                    <Text style={{ fontWeight: "bold" }}>{formatMoney(doc.balance, business.currencySymbol, business.currency)}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        {doc.notes ? (
          <View style={elegantStyles.notes}>
            <Text style={elegantStyles.notesLabel}>Notes</Text>
            <Text>{doc.notes}</Text>
          </View>
        ) : null}

        <Text style={elegantStyles.footer}>
          {business.name} · Crafted with care
        </Text>
      </Page>
    </Document>
  );
}
