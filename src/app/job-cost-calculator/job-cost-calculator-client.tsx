"use client";

import { useState, useId } from "react";
import Link from "next/link";
import {
  Calculator,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Clock,
  Layers,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  SERVICE_COST_DATA,
  getRegionalMultiplier,
  calculateJobCost,
  formatCurrency,
  type ProjectScope,
  type MaterialQuality,
  type ServiceCostItem,
} from "@/lib/tools/job-cost-data";

export function JobCostCalculatorClient() {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    SERVICE_COST_DATA[0].id
  );
  const [scope, setScope] = useState<ProjectScope>("standard");
  const [quality, setQuality] = useState<MaterialQuality>("standard");
  const [zipCode, setZipCode] = useState<string>("75001");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const service =
    SERVICE_COST_DATA.find((s) => s.id === selectedServiceId) ||
    SERVICE_COST_DATA[0];

  const regionalInfo = getRegionalMultiplier(zipCode);
  const estimate = calculateJobCost(service, scope, quality, zipCode);

  const categories = [
    { id: "all", name: "All Trades" },
    { id: "hvac", name: "HVAC" },
    { id: "plumbing", name: "Plumbing" },
    { id: "electrical", name: "Electrical" },
    { id: "roofing", name: "Roofing" },
    { id: "remodeling", name: "Remodeling" },
    { id: "painting", name: "Painting" },
    { id: "flooring", name: "Flooring" },
    { id: "landscaping", name: "Landscaping" },
    { id: "cleaning", name: "Cleaning" },
    { id: "drywall", name: "Drywall & Handyman" },
  ];

  const filteredServices =
    filterCategory === "all"
      ? SERVICE_COST_DATA
      : SERVICE_COST_DATA.filter((s) => s.category === filterCategory);

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-10">
        {/* Step 1: Select Category & Trade */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            Step 1: Choose Trade or Service
          </label>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                  filterCategory === cat.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3.5 pr-10 text-base font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
            >
              {filteredServices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — Typical Baseline: {formatCurrency(item.baseTypicalCost)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {service.description}
          </p>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Project Size / Scope */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Project Scope / Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "minor", label: "Minor / Partial", desc: "0.5x base" },
                { id: "standard", label: "Standard / Average", desc: "1.0x base" },
                { id: "major", label: "Major / Complex", desc: "2.0x base" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScope(item.id as ProjectScope)}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    scope === item.id
                      ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary font-semibold shadow-sm ring-2 ring-primary/20"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xs">{item.label}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Material Quality */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Materials Grade
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "economy", label: "Economy", desc: "Budget" },
                { id: "standard", label: "Standard", desc: "Mid-Tier" },
                { id: "premium", label: "Premium", desc: "High-End" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setQuality(item.id as MaterialQuality)}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    quality === item.id
                      ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary font-semibold shadow-sm ring-2 ring-primary/20"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xs">{item.label}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ZIP Code Location Multiplier */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              ZIP Code (Regional Cost Index)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 90210"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {regionalInfo.region}:
              </span>{" "}
              {regionalInfo.multiplier}x multiplier ({regionalInfo.tier.toUpperCase()} tier)
            </p>
          </div>
        </div>

        {/* Live Estimate Results Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-emerald-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Live Market Estimate for {service.name}
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
                {formatCurrency(estimate.typicalCost)}
              </h2>
              <p className="text-sm text-slate-300">
                Estimated range for this scope:{" "}
                <span className="font-bold text-white">
                  {formatCurrency(estimate.lowCost)}
                </span>{" "}
                to{" "}
                <span className="font-bold text-white">
                  {formatCurrency(estimate.highCost)}
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/contractors"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                Hire Verified Pro
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/estimate-generator"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/20"
              >
                Generate Contractor Estimate
              </Link>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Estimated Labor</div>
              <div className="text-base font-bold text-white mt-0.5">
                {formatCurrency(estimate.laborCost)}
              </div>
              <div className="text-[10px] text-slate-400">
                ~{service.typicalLaborHours} hrs average
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Materials & Supplies</div>
              <div className="text-base font-bold text-white mt-0.5">
                {formatCurrency(estimate.materialsCost)}
              </div>
              <div className="text-[10px] text-slate-400">
                {quality.toUpperCase()} grade
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Project Timeline</div>
              <div className="text-base font-bold text-white mt-0.5">
                {service.completionTimeframe}
              </div>
              <div className="text-[10px] text-slate-400">Standard lead time</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Local Multiplier</div>
              <div className="text-base font-bold text-white mt-0.5">
                {regionalInfo.multiplier}x
              </div>
              <div className="text-[10px] text-slate-400">{regionalInfo.region}</div>
            </div>
          </div>
        </div>

        {/* Cost Factors & Pro Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              What Drives This Cost
            </h3>
            <ul className="space-y-2">
              {service.factors.map((factor, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Smart Contractor Checklist
            </h3>
            <ul className="space-y-2">
              <li className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Verify state licensing, active general liability & worker's comp.</span>
              </li>
              <li className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Request written itemized estimates before work begins.</span>
              </li>
              <li className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Never pay more than 10-20% deposit upfront before materials arrive.</span>
              </li>
              <li className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Ensure local building permits and manufacturer warranty registration are included.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
