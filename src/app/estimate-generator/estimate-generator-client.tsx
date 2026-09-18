"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Printer,
  Download,
  Share2,
  Building2,
  CheckCircle,
  Sparkles,
  ArrowRight,
  FileCheck,
  Percent,
  Calendar,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/tools/job-cost-data";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export function EstimateGeneratorClient() {
  const [contractorName, setContractorName] = useState("Apex Home Services LLC");
  const [contractorEmail, setContractorEmail] = useState("contact@apexservices.com");
  const [contractorPhone, setContractorPhone] = useState("(555) 234-5678");
  const [contractorAddress, setContractorAddress] = useState("100 Main St, Suite 200, Austin, TX 78701");
  const [licenseNumber, setLicenseNumber] = useState("TX-HVAC-94821");

  const [clientName, setClientName] = useState("Robert & Sarah Miller");
  const [clientEmail, setClientEmail] = useState("robert.miller@gmail.com");
  const [clientAddress, setClientAddress] = useState("452 Oak Ridge Lane, Austin, TX 78704");

  const [estimateNumber, setEstimateNumber] = useState("EST-2026-0042");
  const [estimateDate, setEstimateDate] = useState("2026-09-18");
  const [expiryDays, setExpiryDays] = useState(30);

  const [tierMode, setTierMode] = useState<"single" | "good_better_best">("single");

  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      description: "Replace high-efficiency split AC heat pump system (16 SEER2, 3-Ton)",
      quantity: 1,
      rate: 5800,
    },
    {
      id: "2",
      description: "Certified technician installation labor, duct transition & electrical hookup",
      quantity: 12,
      rate: 110,
    },
    {
      id: "3",
      description: "Smart digital programmable thermostat with WiFi controls",
      quantity: 1,
      rate: 280,
    },
  ]);

  const [taxRate, setTaxRate] = useState(8.25);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState(
    "Estimate includes 1-year contractor craftsmanship warranty and 10-year factory compressor warranty. Valid for 30 days. 20% deposit required upon contract execution."
  );

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(7),
        description: "",
        quantity: 1,
        rate: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <button
          type="button"
          onClick={() =>
            setTierMode(tierMode === "single" ? "good_better_best" : "single")
          }
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          {tierMode === "single" ? "Enable Good / Better / Best Tiers" : "Standard Single Mode"}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 shadow-sm transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF
        </button>
      </div>

      {/* Main Printable Sheet */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-12 print:border-none print:shadow-none print:p-0">
        {/* Header: Company & Meta */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-2 flex-grow max-w-sm">
            <input
              type="text"
              value={contractorName}
              onChange={(e) => setContractorName(e.target.value)}
              placeholder="Your Business Name"
              className="text-2xl font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
            />
            <input
              type="text"
              value={contractorAddress}
              onChange={(e) => setContractorAddress(e.target.value)}
              placeholder="Business Address"
              className="text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
            />
            <div className="flex gap-4">
              <input
                type="text"
                value={contractorPhone}
                onChange={(e) => setContractorPhone(e.target.value)}
                placeholder="Phone"
                className="text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-1/2"
              />
              <input
                type="text"
                value={contractorEmail}
                onChange={(e) => setContractorEmail(e.target.value)}
                placeholder="Email"
                className="text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-1/2"
              />
            </div>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="License # or Registration"
              className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
            />
          </div>

          <div className="text-left md:text-right space-y-1.5">
            <div className="text-2xl md:text-3xl font-black tracking-tight text-primary">
              JOB ESTIMATE
            </div>
            <div className="flex items-center md:justify-end gap-2 text-xs text-slate-500">
              <span>Estimate #:</span>
              <input
                type="text"
                value={estimateNumber}
                onChange={(e) => setEstimateNumber(e.target.value)}
                className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none text-right w-28"
              />
            </div>
            <div className="flex items-center md:justify-end gap-2 text-xs text-slate-500">
              <span>Date:</span>
              <input
                type="date"
                value={estimateDate}
                onChange={(e) => setEstimateDate(e.target.value)}
                className="font-medium text-slate-700 dark:text-slate-300 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none text-right"
              />
            </div>
            <div className="flex items-center md:justify-end gap-2 text-xs text-slate-500">
              <span>Valid For:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{expiryDays} days</span>
            </div>
          </div>
        </div>

        {/* Client Billing Info */}
        <div className="py-6 border-b border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            PREPARED FOR:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client or Homeowner Name"
                className="text-base font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
              />
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Property Address"
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
              />
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Client Email"
                className="text-xs text-slate-600 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 w-1/2">Description / Scope of Work</th>
                <th className="pb-3 text-right w-20">Qty / Hrs</th>
                <th className="pb-3 text-right w-28">Rate ($)</th>
                <th className="pb-3 text-right w-28">Total ($)</th>
                <th className="pb-3 text-right w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <tr key={item.id} className="group">
                  <td className="py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      placeholder="Scope item description..."
                      className="w-full text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", Number(e.target.value) || 0)
                      }
                      className="w-16 text-right text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(item.id, "rate", Number(e.target.value) || 0)
                      }
                      className="w-24 text-right text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="py-3 text-right text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.quantity * item.rate)}
                  </td>
                  <td className="py-3 text-right print:hidden">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 print:hidden">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Scope Item
            </button>
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="md:w-1/2 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Contractor Terms & Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="md:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                Discount ({discountPercent}%)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                  className="w-12 text-right text-xs bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 border border-slate-200 dark:border-slate-700 print:hidden"
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">Sales Tax ({taxRate}%)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  className="w-12 text-right text-xs bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 border border-slate-200 dark:border-slate-700 print:hidden"
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(taxAmount)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-base font-black text-slate-900 dark:text-white">
              <span>Total Estimated:</span>
              <span className="text-xl text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Tier Options (If Good / Better / Best active) */}
        {tierMode === "good_better_best" && (
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Project Package Options (Good / Better / Best)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-xs font-bold text-slate-500 uppercase">Option A: Standard</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(total * 0.85)}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Basic standard equipment, manufacturer 5-yr parts warranty.
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 dark:bg-primary/10 relative">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-white text-[9px] font-bold uppercase">
                  Recommended
                </div>
                <div className="text-xs font-bold text-primary uppercase">Option B: Enhanced</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(total)}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2">
                  Premium high-efficiency equipment, smart controls, 10-yr parts + 2-yr labor warranty.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                <div className="text-xs font-bold text-slate-500 uppercase">Option C: Ultimate</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(total * 1.3)}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Top-tier inverter equipment, whole-home air purification, lifetime craftsmanship warranty.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signature Line */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8">
          <div>
            <div className="border-b border-slate-300 dark:border-slate-700 pb-8 mb-2"></div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Contractor Authorized Signature
            </div>
            <div className="text-[10px] text-slate-400">Date</div>
          </div>
          <div>
            <div className="border-b border-slate-300 dark:border-slate-700 pb-8 mb-2"></div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Client Acceptance Signature
            </div>
            <div className="text-[10px] text-slate-400">Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}
