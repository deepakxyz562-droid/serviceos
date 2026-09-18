"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Calculator,
  Percent,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign,
  CheckCircle2,
  Package,
} from "lucide-react";
import {
  TRADE_MATERIAL_DATA,
  formatCurrency,
  type TradeMaterial,
} from "@/lib/tools/job-cost-data";

export function MaterialCostClient() {
  const [selectedTradeId, setSelectedTradeId] = useState<string>("drywall");
  const [areaSqFt, setAreaSqFt] = useState<number>(500);
  const [wastePercent, setWastePercent] = useState<number>(10);
  const [contractorMarkupPercent, setContractorMarkupPercent] = useState<number>(20);

  const trade =
    TRADE_MATERIAL_DATA.find((t) => t.id === selectedTradeId) ||
    TRADE_MATERIAL_DATA[0];

  const grossSqFt = areaSqFt * (1 + wastePercent / 100);
  const unitsNeeded = Math.ceil(grossSqFt / trade.unitCoverageSqFt);
  const rawMaterialCost = unitsNeeded * trade.costPerUnit;
  const markupAmount = rawMaterialCost * (contractorMarkupPercent / 100);
  const totalBilledCost = rawMaterialCost + markupAmount;

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-10">
        {/* Trade Selector Tabs */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-3">
            Select Trade & Material Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TRADE_MATERIAL_DATA.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedTradeId(item.id);
                  setWastePercent(item.recommendedWastePercent);
                }}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                  selectedTradeId === item.id
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-2 ring-primary/20"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <span className="text-xs">{item.name}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {formatCurrency(item.costPerUnit)}/{item.unitLabel.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {trade.description}
          </p>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Surface Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Total Surface Area ({trade.unitCoverageSqFt > 100 ? "Sq Ft or Cu Yd" : "Sq Ft"})
            </label>
            <div className="relative">
              <input
                type="number"
                min="10"
                max="50000"
                step="10"
                value={areaSqFt}
                onChange={(e) => setAreaSqFt(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                sq ft
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Each unit covers ~{trade.unitCoverageSqFt} sq ft.
            </p>
          </div>

          {/* Waste Factor */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Waste & Cut Factor
              </label>
              <span className="text-xs font-bold text-primary">{wastePercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={wastePercent}
              onChange={(e) => setWastePercent(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer mt-2"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Recommended: {trade.recommendedWastePercent}% for {trade.name.toLowerCase()}.
            </p>
          </div>

          {/* Contractor Markup */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Contractor Markup
              </label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                +{contractorMarkupPercent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={contractorMarkupPercent}
              onChange={(e) => setContractorMarkupPercent(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer mt-2"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Standard contractor procurement markup is 15–25%.
            </p>
          </div>
        </div>

        {/* Results Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            <div>
              <div className="text-xs font-semibold text-slate-400">
                Units Needed to Order
              </div>
              <div className="text-3xl font-black text-white mt-1">
                {unitsNeeded}{" "}
                <span className="text-sm font-normal text-slate-300">
                  {trade.unitLabel.split("(")[0]}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Includes {Math.round(grossSqFt)} gross sq ft
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400">
                Raw Material Supply Cost
              </div>
              <div className="text-3xl font-black text-white mt-1">
                {formatCurrency(rawMaterialCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {formatCurrency(trade.costPerUnit)} per unit
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-emerald-400">
                Contractor Markup ({contractorMarkupPercent}%)
              </div>
              <div className="text-3xl font-black text-emerald-400 mt-1">
                +{formatCurrency(markupAmount)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Handling, procurement & delivery
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-amber-400">
                Total Billed Material Cost
              </div>
              <div className="text-3xl font-black text-amber-400 mt-1">
                {formatCurrency(totalBilledCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Ready for estimate line item
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Ready to plug this into your client bid?
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Export these material numbers into our Free Estimate Generator.
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link
              href="/estimate-generator"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              Generate Estimate PDF
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/job-cost-calculator"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 transition-all"
            >
              Labor & Job Cost
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
