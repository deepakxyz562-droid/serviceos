"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Home,
  Sparkles,
  ArrowRight,
  Check,
  Shield,
  HelpCircle,
  BarChart3,
  Percent,
  CheckCircle2,
} from "lucide-react";
import {
  RENOVATION_PROJECTS,
  formatCurrency,
  type RenovationProject,
} from "@/lib/tools/job-cost-data";

export function RenovationRoiClient() {
  const [homeValue, setHomeValue] = useState<number>(450000);
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "garage_door",
    "minor_kitchen",
    "entry_door",
  ]);

  const toggleProject = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedProjects = RENOVATION_PROJECTS.filter((p) =>
    selectedIds.includes(p.id)
  );

  const totalCost = selectedProjects.reduce((sum, p) => sum + p.typicalCost, 0);
  const totalValueAdded = selectedProjects.reduce(
    (sum, p) => sum + p.typicalCost * (p.roiPercentage / 100),
    0
  );
  const netRoiPercent =
    totalCost > 0 ? Math.round((totalValueAdded / totalCost) * 100) : 0;
  const newEstimatedHomeValue = homeValue + totalValueAdded;

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-10">
        {/* Top Control: Home Value Input */}
        <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Your Current Home Market Value
              </label>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Adjust to match your current property appraisal or Zillow Zestimate.
              </p>
            </div>
            <div className="relative min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                min={50000}
                max={5000000}
                step={10000}
                value={homeValue}
                onChange={(e) => setHomeValue(Number(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl pl-8 pr-4 py-2.5 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Selected Project Summary Dashboard */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl mb-8 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            <div>
              <div className="text-xs font-medium text-slate-400">
                Total Renovation Investment
              </div>
              <div className="text-2xl md:text-3xl font-black text-white mt-1">
                {formatCurrency(totalCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {selectedProjects.length} selected project(s)
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-emerald-400">
                Estimated Value Added at Resale
              </div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">
                +{formatCurrency(totalValueAdded)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Immediate equity enhancement
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-blue-400">
                Cost Recouped (ROI)
              </div>
              <div className="text-2xl md:text-3xl font-black text-blue-400 mt-1">
                {netRoiPercent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Cost vs Value national index
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-amber-400">
                New Estimated Home Value
              </div>
              <div className="text-2xl md:text-3xl font-black text-amber-400 mt-1">
                {formatCurrency(newEstimatedHomeValue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                After completed improvements
              </div>
            </div>
          </div>
        </div>

        {/* Project Selector Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select Renovation Projects
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranked by Remodeling Magazine's National Cost vs. Value Data.
              </p>
            </div>
            <div className="text-xs font-semibold text-primary">
              {selectedIds.length} Selected
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RENOVATION_PROJECTS.map((proj) => {
              const isSelected = selectedIds.includes(proj.id);
              const valueAdded = proj.typicalCost * (proj.roiPercentage / 100);

              return (
                <div
                  key={proj.id}
                  onClick={() => toggleProject(proj.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-2 ring-primary/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? "bg-primary border-primary text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {proj.name}
                        </h4>
                        <span className="inline-block text-[11px] font-semibold text-primary uppercase tracking-wide">
                          {proj.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          proj.roiPercentage >= 90
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                            : proj.roiPercentage >= 70
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {proj.roiPercentage}% ROI
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {proj.description}
                  </p>

                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">
                      Cost:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(proj.typicalCost)}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      Value Recouped:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(valueAdded)}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Ready to start your home renovation?
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Get written bids from vetted general contractors in your area.
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link
              href="/contractors"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              Find Contractors
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/job-cost-calculator"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
            >
              Cost Calculator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
