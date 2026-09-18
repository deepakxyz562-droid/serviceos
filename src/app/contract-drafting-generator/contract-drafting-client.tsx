"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building,
  Scale,
} from "lucide-react";
import { formatCurrency } from "@/lib/tools/job-cost-data";

export function ContractDraftingClient() {
  const [contractorName, setContractorName] = useState("Vanguard Construction & Remodeling LLC");
  const [contractorLicense, setContractorLicense] = useState("CRC-058192-State");
  const [contractorAddress, setContractorAddress] = useState("742 Evergreen Terrace, Springfield, OR 97477");
  const [contractorPhone, setContractorPhone] = useState("(555) 349-2041");

  const [clientName, setClientName] = useState("Thomas & Emily Campbell");
  const [propertyAddress, setPropertyAddress] = useState("1024 Timberline Way, Springfield, OR 97477");
  const [clientPhone, setClientPhone] = useState("(555) 781-9023");

  const [contractDate, setContractDate] = useState("2026-09-18");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [completionDate, setCompletionDate] = useState("2026-11-15");

  const [totalPrice, setTotalPrice] = useState(24500);
  const [depositAmount, setDepositAmount] = useState(4900);

  const [scopeDetails, setScopeDetails] = useState(
    "Contractor agrees to furnish all labor, materials, equipment, and permits necessary to complete the whole-kitchen renovation: including cabinetry tear-out, installation of 42-inch shaker cabinets, quartz countertops with undermount sink, under-cabinet LED task lighting, and plumbing hookup."
  );

  const [stateJurisdiction, setStateJurisdiction] = useState("Oregon");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 shadow-sm transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Export Contract PDF
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-12 print:border-none print:shadow-none print:p-0 font-serif leading-relaxed">
        {/* Document Title */}
        <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
          <div className="font-sans inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] mb-2">
            <Scale className="w-3.5 h-3.5 text-primary" />
            STANDARD RESIDENTIAL CONSTRUCTION AGREEMENT
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-sans">
            Independent Contractor Agreement
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Executed on this {contractDate} between Contractor and Property Owner.
          </p>
        </div>

        {/* 1. Parties */}
        <div className="space-y-4 mb-6">
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-200 dark:border-slate-800 pb-1">
            1. Parties & Jurisdiction
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            This Agreement is made by and between:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                CONTRACTOR:
              </span>
              <input
                type="text"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="w-full font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none mb-1 text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                value={contractorAddress}
                onChange={(e) => setContractorAddress(e.target.value)}
                className="w-full text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none mb-1"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contractorPhone}
                  onChange={(e) => setContractorPhone(e.target.value)}
                  className="w-1/2 text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none"
                />
                <input
                  type="text"
                  value={contractorLicense}
                  onChange={(e) => setContractorLicense(e.target.value)}
                  className="w-1/2 text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                PROPERTY OWNER / CLIENT:
              </span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none mb-1 text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                className="w-full text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none mb-1"
              />
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Scope of Work */}
        <div className="space-y-2 mb-6">
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-200 dark:border-slate-800 pb-1">
            2. Scope of Work
          </h3>
          <textarea
            rows={4}
            value={scopeDetails}
            onChange={(e) => setScopeDetails(e.target.value)}
            className="w-full text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700 font-sans focus:outline-none"
          />
        </div>

        {/* 3. Timeline & Dates */}
        <div className="space-y-2 mb-6 font-sans text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-200 dark:border-slate-800 pb-1">
            3. Project Schedule
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Estimated Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-slate-300 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Substantial Completion:</span>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. Payment Terms & Change Orders */}
        <div className="space-y-3 mb-6 font-sans text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-slate-200 dark:border-slate-800 pb-1">
            4. Contract Sum & Payment Terms
          </h3>
          <p className="text-slate-700 dark:text-slate-300">
            Owner agrees to pay Contractor the total fixed sum of{" "}
            <strong>{formatCurrency(totalPrice)}</strong>, subject to additions and
            deductions pursuant to authorized written change orders.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-500 block">Total Fixed Contract Price:</span>
              <div className="flex items-center gap-1 font-bold text-base text-slate-900 dark:text-white">
                <span>$</span>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Number(e.target.value) || 0)}
                  className="bg-transparent border-b border-slate-300 w-32 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <span className="text-slate-500 block">Upfront Mobilization Deposit:</span>
              <div className="flex items-center gap-1 font-bold text-base text-emerald-600 dark:text-emerald-400">
                <span>$</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                  className="bg-transparent border-b border-slate-300 w-32 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. Standard Legal Clauses */}
        <div className="space-y-3 mb-8 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-primary">
            5. Standard Legal Terms
          </h3>
          <p>
            <strong>A. Change Orders:</strong> Any deviation, addition, or deletion from the scope of work described herein shall be executed only upon written Change Order signed by both parties, specifying the adjusted cost and revised schedule.
          </p>
          <p>
            <strong>B. One-Year Warranty:</strong> Contractor guarantees all craftsmanship against material defects for a period of one (1) full year from substantial completion. Manufacturer warranties for equipment pass directly to Owner.
          </p>
          <p>
            <strong>C. Permits & Code:</strong> Contractor shall procure all required municipal building permits. Work shall comply with applicable local building codes.
          </p>
          <p>
            <strong>D. Governing Law:</strong> This Agreement shall be construed and enforced under the laws of the State of {stateJurisdiction}.
          </p>
        </div>

        {/* 6. Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 dark:border-slate-700 font-sans">
          <div>
            <div className="border-b border-slate-400 dark:border-slate-600 pb-10 mb-2"></div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {contractorName}
            </div>
            <div className="text-[10px] text-slate-500">Authorized Signature • Date</div>
          </div>
          <div>
            <div className="border-b border-slate-400 dark:border-slate-600 pb-10 mb-2"></div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {clientName}
            </div>
            <div className="text-[10px] text-slate-500">Property Owner Signature • Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}
