/**
 * PDF templates for QuoteFlow quotes & invoices.
 * Two templates ship in V1: Modern + Simple.
 * (Professional + Elegant arrive in Phase 7 as Pro-tier features.)
 *
 * IMPORTANT: the LLM never computes money. We always pass server-computed
 * totals (subtotal, discount, tax, total) into these templates.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

export type PdfTemplateName = "modern" | "simple" | "professional" | "elegant";

export interface QuotePdfData {
  business: {
    name: string;
    ownerName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    currencySymbol: string;
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
}

function formatMoney(n: number, symbol: string) {
  return `${symbol}${n.toFixed(2)}`;
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
  return (
    <Document>
      <Page size="A4" style={modernStyles.page}>
        <View style={modernStyles.header}>
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
          <View key={i} style={modernStyles.itemRow}>
            <Text style={modernStyles.itemDesc}>{it.description}</Text>
            <Text style={modernStyles.itemQty}>{it.qty}</Text>
            <Text style={modernStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol)}</Text>
            <Text style={modernStyles.itemAmount}>
              {formatMoney(it.qty * it.unitPrice, business.currencySymbol)}
            </Text>
          </View>
        ))}

        <View style={modernStyles.totals}>
          <View style={modernStyles.totalsCol}>
            <View style={modernStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={modernStyles.totalsRow}>
                <Text>Discount{doc.discountType === "PERCENT" ? ` (${doc.discountValue}%)` : ""}</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={modernStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol)}</Text>
              </View>
            ) : null}
            <View style={modernStyles.totalRow}>
              <Text>TOTAL</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[modernStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text style={{ color: "#10b981" }}>{formatMoney(doc.paidAmount, business.currencySymbol)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={modernStyles.totalsRow}>
                    <Text style={modernStyles.totalsRowBold}>Balance due</Text>
                    <Text style={modernStyles.totalsRowBold}>
                      {formatMoney(doc.balance, business.currencySymbol)}
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

        <Text style={modernStyles.footer}>
          {business.name} · {business.email || business.phone || ""}
        </Text>
      </Page>
    </Document>
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
  return (
    <Document>
      <Page size="A4" style={simpleStyles.page}>
        <View style={simpleStyles.header}>
          <View>
            <Text style={simpleStyles.brand}>{business.name}</Text>
            <Text style={simpleStyles.brandSub}>
              {business.address || ""}
              {business.phone ? `  ·  ${business.phone}` : ""}
              {business.email ? `  ·  ${business.email}` : ""}
            </Text>
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
          <View key={i} style={simpleStyles.itemRow}>
            <Text style={simpleStyles.itemDesc}>{it.description}</Text>
            <Text style={simpleStyles.itemQty}>{it.qty}</Text>
            <Text style={simpleStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol)}</Text>
            <Text style={simpleStyles.itemAmount}>{formatMoney(it.qty * it.unitPrice, business.currencySymbol)}</Text>
          </View>
        ))}

        <View style={simpleStyles.totals}>
          <View style={simpleStyles.totalsCol}>
            <View style={simpleStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={simpleStyles.totalsRow}>
                <Text>Discount</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={simpleStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol)}</Text>
              </View>
            ) : null}
            <View style={simpleStyles.totalRow}>
              <Text>TOTAL</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[simpleStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text>{formatMoney(doc.paidAmount, business.currencySymbol)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={simpleStyles.totalsRow}>
                    <Text style={{ fontWeight: "bold" }}>Balance due</Text>
                    <Text style={{ fontWeight: "bold" }}>{formatMoney(doc.balance, business.currencySymbol)}</Text>
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
  switch (template) {
    case "simple":
      return <SimpleTemplate data={data} />;
    case "professional":
      return <ProfessionalTemplate data={data} />;
    case "elegant":
      return <ElegantTemplate data={data} />;
    case "modern":
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
  return (
    <Document>
      <Page size="A4" style={profStyles.page}>
        <View style={profStyles.header}>
          <View>
            <Text style={profStyles.brand}>{business.name.toUpperCase()}</Text>
            <Text style={profStyles.brandSub}>
              {business.address || ""} {business.phone ? `· ${business.phone}` : ""}
              {business.email ? `  ·  ${business.email}` : ""}
            </Text>
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
          <View key={i} style={profStyles.itemRow}>
            <Text style={profStyles.itemDesc}>{it.description}</Text>
            <Text style={profStyles.itemQty}>{it.qty}</Text>
            <Text style={profStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol)}</Text>
            <Text style={profStyles.itemAmount}>{formatMoney(it.qty * it.unitPrice, business.currencySymbol)}</Text>
          </View>
        ))}

        <View style={profStyles.totals}>
          <View style={profStyles.totalsCol}>
            <View style={profStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={profStyles.totalsRow}>
                <Text>Discount{doc.discountType === "PERCENT" ? ` (${doc.discountValue}%)` : ""}</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={profStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol)}</Text>
              </View>
            ) : null}
            <View style={profStyles.totalRow}>
              <Text>TOTAL</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[profStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text style={{ color: "#10b981" }}>{formatMoney(doc.paidAmount, business.currencySymbol)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={profStyles.totalsRow}>
                    <Text style={{ fontWeight: "bold" }}>Balance due</Text>
                    <Text style={{ fontWeight: "bold" }}>{formatMoney(doc.balance, business.currencySymbol)}</Text>
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
  return (
    <Document>
      <Page size="A4" style={elegantStyles.page}>
        <View style={elegantStyles.header}>
          <View style={elegantStyles.brandWrap}>
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
          <View key={i} style={elegantStyles.itemRow}>
            <Text style={elegantStyles.itemDesc}>{it.description}</Text>
            <Text style={elegantStyles.itemQty}>{it.qty}</Text>
            <Text style={elegantStyles.itemPrice}>{formatMoney(it.unitPrice, business.currencySymbol)}</Text>
            <Text style={elegantStyles.itemAmount}>{formatMoney(it.qty * it.unitPrice, business.currencySymbol)}</Text>
          </View>
        ))}

        <View style={elegantStyles.totals}>
          <View style={elegantStyles.totalsCol}>
            <View style={elegantStyles.totalsRow}>
              <Text>Subtotal</Text>
              <Text>{formatMoney(doc.subtotal, business.currencySymbol)}</Text>
            </View>
            {doc.discount > 0 ? (
              <View style={elegantStyles.totalsRow}>
                <Text>Discount{doc.discountType === "PERCENT" ? ` (${doc.discountValue}%)` : ""}</Text>
                <Text>- {formatMoney(doc.discount, business.currencySymbol)}</Text>
              </View>
            ) : null}
            {doc.tax > 0 ? (
              <View style={elegantStyles.totalsRow}>
                <Text>Tax ({doc.taxRate}%)</Text>
                <Text>{formatMoney(doc.tax, business.currencySymbol)}</Text>
              </View>
            ) : null}
            <View style={elegantStyles.totalRow}>
              <Text>Total</Text>
              <Text>{formatMoney(doc.total, business.currencySymbol)}</Text>
            </View>
            {doc.kind === "INVOICE" && doc.paidAmount !== undefined && doc.balance !== undefined ? (
              <>
                <View style={[elegantStyles.totalsRow, { marginTop: 8 }]}>
                  <Text>Paid</Text>
                  <Text style={{ color: "#10b981" }}>{formatMoney(doc.paidAmount, business.currencySymbol)}</Text>
                </View>
                {doc.balance > 0 ? (
                  <View style={elegantStyles.totalsRow}>
                    <Text style={{ fontWeight: "bold" }}>Balance due</Text>
                    <Text style={{ fontWeight: "bold" }}>{formatMoney(doc.balance, business.currencySymbol)}</Text>
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
