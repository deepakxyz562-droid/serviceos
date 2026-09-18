"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Building,
  DollarSign,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/tools/job-cost-data";

interface Milestone {
  id: string;
  name: string;
  deliverables: string;
  percentage: number;
}

export function ProposalGeneratorClient() {
  const [contractorName, setContractorName] = useState("Summit Build & Renovation Co.");
  const [contractorContact, setContractorContact] = useState("Marcus Vance | (555) 890-1234 | mvance@summitbuild.com");
  const [clientName, setClientName] = useState("David & Jennifer Henderson");
  const [projectTitle, setProjectTitle] = useState("Master Suite & Bathroom Architectural Renovation");
  const [proposalDate, setProposalDate] = useState("2026-09-18");
  const [projectScopeOverview, setProjectScopeOverview] = useState(
    "Complete demolition and rebuild of the second-floor master suite. Includes structural load-bearing reinforcement, zero-threshold double walk-in shower with frameless glass, custom double vanity, radiant in-floor heating, and premium Sherwin-Williams low-VOC paint."
  );

  const [totalCost, setTotalCost] = useState(38500);

  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: "1",
      name: "Phase 1: Mobilization & Demolition",
      deliverables: "Permit pulled, containment plastic installed, fixture demo and subfloor prep",
      percentage: 25,
    },
    {
      id: "2",
      name: "Phase 2: Rough-In Mechanicals",
      deliverables: "Plumbing lines, electrical circuits, rough-in inspection passed",
      percentage: 35,
    },
    {
      id: "3",
      name: "Phase 3: Drywall, Tile & Finishes",
      deliverables: "Moisture board, waterproofing membrane, porcelain tile set and grouted",
      percentage: 25,
    },
    {
      id: "4",
      name: "Phase 4: Trim, Punch List & Handover",
      deliverables: "Vanity installation, faucets, glass door, deep clean and final walk-through signoff",
      percentage: 15,
    },
  ]);

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    setMilestones(
      milestones.map((m) => {
        if (m.id === id) {
          return { ...m, [field]: value };
        }
        return m;
      })
    );
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: Math.random().toString(36).substring(7),
        name: `Phase ${milestones.length + 1}: Final Milestone`,
        deliverables: "Milestone scope and completion checklist",
        percentage: 0,
      },
    ]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((m) => m.id !== id));
    }
  };

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
          Print / Export Proposal PDF
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-12 print:border-none print:shadow-none print:p-0">
        {/* Document Cover/Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs mb-4">
            <FileCheck2 className="w-4 h-4 text-primary" />
            FORMAL PROJECT PROPOSAL
          </div>

          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full mb-3"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400 mt-4">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                SUBMITTED BY:
              </span>
              <input
                type="text"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
              />
              <input
                type="text"
                value={contractorContact}
                onChange={(e) => setContractorContact(e.target.value)}
                className="text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full mt-0.5"
              />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                PREPARED FOR:
              </span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-full"
              />
              <div className="text-slate-500 mt-0.5">Date: {proposalDate}</div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="py-8 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            1. Executive Summary & Scope
          </h3>
          <textarea
            rows={4}
            value={projectScopeOverview}
            onChange={(e) => setProjectScopeOverview(e.target.value)}
            className="w-full text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          />
        </div>

        {/* Phased Milestones & Payment Schedule */}
        <div className="py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Phased Milestones & Payment Schedule
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Contract Total:</span>
              <div className="relative w-32">
                <input
                  type="number"
                  value={totalCost}
                  onChange={(e) => setTotalCost(Number(e.target.value) || 0)}
                  className="w-full font-bold text-sm text-right px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {milestones.map((m) => {
              const amount = totalCost * (m.percentage / 100);
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => updateMilestone(m.id, "name", e.target.value)}
                      className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none"
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs">
                        <input
                          type="number"
                          value={m.percentage}
                          onChange={(e) =>
                            updateMilestone(m.id, "percentage", Number(e.target.value) || 0)
                          }
                          className="w-12 text-right px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                      <span className="text-xs font-black text-primary min-w-[80px] text-right">
                        {formatCurrency(amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMilestone(m.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 print:hidden"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={m.deliverables}
                    onChange={(e) =>
                      updateMilestone(m.id, "deliverables", e.target.value)
                    }
                    placeholder="Milestone deliverables and sign-off criteria..."
                    className="w-full text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-200 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-4 print:hidden">
            <button
              type="button"
              onClick={addMilestone}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Milestone Phase
            </button>
          </div>
        </div>

        {/* Guarantees & Acceptance */}
        <div className="pt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            3. Project Commitments & Signatures
          </h3>

          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 mb-8">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Contractor maintains full General Liability Insurance and Active State Licensing.
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              All work guaranteed under a 12-month structural and craftsmanship warranty.
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Written change orders required before executing any out-of-scope alterations.
            </li>
          </ul>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="border-b border-slate-300 dark:border-slate-700 pb-8 mb-2"></div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Authorized Contractor Representative
              </div>
              <div className="text-[10px] text-slate-400">Date</div>
            </div>
            <div>
              <div className="border-b border-slate-300 dark:border-slate-700 pb-8 mb-2"></div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Client Acceptance & Authorization
              </div>
              <div className="text-[10px] text-slate-400">Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
